import { readFile } from "node:fs/promises";

import { google } from "googleapis";

import { GOOGLE_DRIVE_FOLDER_MIME_TYPE, GOOGLE_DRIVE_SCOPE } from "./inscripcion-drive.js";

const SPREADSHEET_MIME_TYPE = "application/vnd.google-apps.spreadsheet";
const ID_PATTERN = /^[A-Za-z0-9_-]{10,200}$/;

async function valueFromEnvironment(name, fileName) {
  const direct = String(process.env[name] || "").trim();
  if (direct) return direct;
  const path = String(process.env[fileName] || "").trim();
  return path ? (await readFile(path, "utf8")).trim() : "";
}

function requiredId(name) {
  const value = String(process.env[name] || "").trim();
  if (!ID_PATTERN.test(value)) throw new Error(`Falta una configuración válida para ${name}.`);
  return value;
}

async function listPermissions(drive, fileId) {
  const permissions = [];
  let pageToken;
  do {
    const response = await drive.permissions.list({
      fileId,
      supportsAllDrives: true,
      pageSize: 100,
      ...(pageToken ? { pageToken } : {}),
      fields: "nextPageToken,permissions(id,type,role,emailAddress,deleted)",
    });
    permissions.push(...(response.data.permissions || []));
    pageToken = String(response.data.nextPageToken || "").trim();
  } while (pageToken);
  return permissions;
}

function assertPrivate(permissions, resource) {
  if (permissions.some((permission) =>
    !permission?.deleted && ["anyone", "domain"].includes(permission?.type))) {
    throw new Error(`${resource} tiene un permiso público o para todo un dominio.`);
  }
}

async function ensureSpreadsheetWriter(drive, fileId, serviceAccountEmail, resource) {
  const [spreadsheetResponse, permissions] = await Promise.all([
    drive.files.get({
      fileId,
      supportsAllDrives: true,
      fields: "id,mimeType,trashed,capabilities(canShare)",
    }),
    listPermissions(drive, fileId),
  ]);
  const spreadsheet = spreadsheetResponse.data || {};
  if (
    spreadsheet.mimeType !== SPREADSHEET_MIME_TYPE ||
    spreadsheet.trashed ||
    spreadsheet.capabilities?.canShare !== true
  ) {
    throw new Error(`${resource} no permite configurar el acceso del servidor.`);
  }
  assertPrivate(permissions, resource);

  const existingPermission = permissions.find(
    (permission) =>
      !permission?.deleted &&
      permission?.type === "user" &&
      String(permission?.emailAddress || "").trim().toLowerCase() === serviceAccountEmail,
  );
  if (!existingPermission) {
    await drive.permissions.create({
      fileId,
      supportsAllDrives: true,
      sendNotificationEmail: false,
      fields: "id,role,type",
      requestBody: {
        type: "user",
        role: "writer",
        emailAddress: serviceAccountEmail,
      },
    });
  } else if (![
    "owner", "organizer", "fileOrganizer", "writer",
  ].includes(existingPermission.role)) {
    await drive.permissions.update({
      fileId,
      permissionId: existingPermission.id,
      supportsAllDrives: true,
      fields: "id,role,type",
      requestBody: { role: "writer" },
    });
  }
}

async function main() {
  const clientId = await valueFromEnvironment(
    "GOOGLE_DRIVE_CLIENT_ID",
    "GOOGLE_DRIVE_CLIENT_ID_FILE",
  );
  const clientSecret = await valueFromEnvironment(
    "GOOGLE_DRIVE_CLIENT_SECRET",
    "GOOGLE_DRIVE_CLIENT_SECRET_FILE",
  );
  const refreshToken = await valueFromEnvironment(
    "GOOGLE_DRIVE_REFRESH_TOKEN",
    "GOOGLE_DRIVE_REFRESH_TOKEN_FILE",
  );
  const spreadsheetId = requiredId("GOOGLE_SHEETS_SPREADSHEET_ID");
  const bajaSpreadsheetId = requiredId("GOOGLE_SHEETS_BAJA_SPREADSHEET_ID");
  const equipacionSpreadsheetId = requiredId(
    "GOOGLE_SHEETS_EQUIPACION_SPREADSHEET_ID",
  );
  const folderId = requiredId("GOOGLE_DRIVE_INSCRIPCION_FOLDER_ID");
  const serviceAccountEmail = String(
    process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL || "",
  ).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.iam\.gserviceaccount\.com$/.test(serviceAccountEmail)) {
    throw new Error("Falta GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL.");
  }
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Faltan las credenciales OAuth de Google Drive.");
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  const drive = google.drive({ version: "v3", auth });
  const [folderResponse, folderPermissions] = await Promise.all([
    drive.files.get({
      fileId: folderId,
      supportsAllDrives: true,
      fields: "id,mimeType,trashed,driveId,capabilities(canAddChildren)",
    }),
    listPermissions(drive, folderId),
  ]);

  const folder = folderResponse.data || {};
  if (
    folder.mimeType !== GOOGLE_DRIVE_FOLDER_MIME_TYPE ||
    folder.trashed ||
    folder.driveId ||
    folder.capabilities?.canAddChildren !== true
  ) {
    throw new Error("La carpeta de Mi unidad no permite guardar inscripciones.");
  }
  assertPrivate(folderPermissions, "La carpeta de Google Drive");
  await Promise.all([
    ensureSpreadsheetWriter(
      drive,
      spreadsheetId,
      serviceAccountEmail,
      "La hoja de cálculo de inscripciones",
    ),
    ensureSpreadsheetWriter(
      drive,
      bajaSpreadsheetId,
      serviceAccountEmail,
      "La hoja de cálculo de bajas",
    ),
    ensureSpreadsheetWriter(
      drive,
      equipacionSpreadsheetId,
      serviceAccountEmail,
      "La hoja de cálculo de equipación",
    ),
  ]);

  console.log(JSON.stringify({
    ok: true,
    folderPrivate: true,
    spreadsheetPrivate: true,
    spreadsheetWriterConfigured: true,
    bajaSpreadsheetWriterConfigured: true,
    equipacionSpreadsheetWriterConfigured: true,
    driveScope: GOOGLE_DRIVE_SCOPE,
  }));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    name: String(error?.name || "Error"),
    code: String(error?.code || "FORM_STORAGE_ACCESS_FAILED"),
    status: Number(error?.response?.status ?? error?.status) || 500,
    message: error?.response ? "External API request failed." : String(error?.message || "Error"),
  }));
  process.exitCode = 1;
});
