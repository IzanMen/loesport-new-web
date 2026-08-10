import crypto from "node:crypto";

import { google } from "googleapis";
import { summarizeError } from "./error-summary.js";

export const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
export const DEFAULT_INSCRIPCION_SHEET_NAME = "Inscripciones";
export const DEFAULT_INSCRIPCION_SYSTEM_SHEET_NAME = "_Inscripciones sistema";
export const INSCRIPCION_SHEET_SCHEMA_VERSION = "2";
export const MAX_UNMAPPED_ANSWERS_CHARS = 45_000;
export const MAX_DRIVE_MANIFEST_CHARS = 45_000;

const METADATA_COLUMNS = [
  ["submission_id", "ID de envío"],
  ["payload_fingerprint", "Huella del contenido"],
  ["schema_version", "Versión de esquema · v2"],
  ["server_received_at", "Recibido por el servidor"],
  ["client_submitted_at", "Enviado desde el navegador"],
  ["form_type", "Tipo de formulario"],
  ["form_title", "Título del formulario"],
  ["page_url", "Página de origen"],
  ["email_status", "Estado del correo"],
  ["gmail_message_id", "ID de Gmail"],
  ["email_error", "Error de correo"],
  ["attachment_names", "Archivos adjuntos (nombres)"],
  ["unmapped_answers", "Respuestas no mapeadas"],
];

const ANSWER_COLUMNS = [
  ["training_location", "Sede"],
  ["training_group_id", "ID del grupo"],
  ["training_group_name", "Grupo"],
  ["training_day_count", "Días por semana"],
  ["training_selected_days", "Días elegidos"],
  ["participant_residence_city", "Población de residencia"],
  ["participant_full_name", "Nombre y apellidos"],
  ["participant_birth_date", "Fecha de nacimiento"],
  ["participant_sex", "Sexo"],
  ["participant_document_number", "Documento de identidad"],
  ["participant_document_front", "Documento de identidad · parte delantera"],
  ["participant_document_back", "Documento de identidad · parte trasera"],
  ["club_membership_status", "Alta o renovación"],
  ["participant_address", "Dirección"],
  ["participant_postal_code", "Código postal"],
  ["participant_nationality", "Nacionalidad"],
  ["contact_phone", "Teléfono de contacto"],
  ["guardian_full_name", "Nombre y apellidos del tutor legal"],
  ["guardian_document_number", "Documento de identidad del tutor legal"],
  ["guardian_document_front", "Documento del tutor legal · parte delantera"],
  ["guardian_document_back", "Documento del tutor legal · parte trasera"],
  ["guardian_birth_date", "Fecha de nacimiento del tutor legal"],
  ["payment_method", "Modalidad y forma de pago"],
  ["direct_debit_authorization", "Autorización de domiciliación"],
  ["bank_details", "Datos bancarios"],
  ["image_use_authorization", "Autorización de uso de imagen"],
  ["offsite_activity_authorization", "Autorización para actividades fuera"],
  ["accident_protocol_acknowledgement", "Conformidad con el protocolo de accidentes"],
  ["participant_health_information", "Información médica, alergias y observaciones de salud"],
  ["comments", "Observaciones o sugerencias"],
  ["privacy_consent", "Consentimiento de privacidad"],
  ["terms_consent", "Aceptación de condiciones"],
];

const PUBLIC_ANSWER_COLUMNS = ANSWER_COLUMNS.filter(
  ([key]) => key !== "training_group_id",
);

const DRIVE_COLUMNS = [
  ["drive_status", "Estado de Drive"],
  ["drive_error", "Error de Drive"],
  ["drive_folder_id", "ID de carpeta en Drive"],
  ["drive_folder_url", "Carpeta de Drive"],
  ["snapshot_drive_file_id", "ID de captura en Drive"],
  ["snapshot_drive_url", "Captura en Drive"],
  ["participant_document_front_drive_url", "Documento delantero en Drive"],
  ["participant_document_back_drive_url", "Documento trasero en Drive"],
  ["guardian_document_front_drive_url", "Documento delantero del tutor en Drive"],
  ["guardian_document_back_drive_url", "Documento trasero del tutor en Drive"],
  ["drive_files_manifest", "Archivos guardados en Drive"],
];

function freezeColumns(columns) {
  return Object.freeze(
    columns.map(([key, header]) => Object.freeze({ key, header })),
  );
}

export const INSCRIPCION_SHEET_V1_COLUMNS = freezeColumns([
  ...METADATA_COLUMNS,
  ...ANSWER_COLUMNS,
]);

export const INSCRIPCION_SHEET_COLUMNS = freezeColumns([
  ...METADATA_COLUMNS,
  ...ANSWER_COLUMNS,
  ...DRIVE_COLUMNS,
]);

export const INSCRIPCION_SHEET_V1_HEADERS = Object.freeze(
  INSCRIPCION_SHEET_V1_COLUMNS.map(({ key, header }) =>
    key === "schema_version" ? "Versión de esquema" : header,
  ),
);

export const INSCRIPCION_SHEET_HEADERS = Object.freeze(
  INSCRIPCION_SHEET_COLUMNS.map(({ header }) => header),
);

export const INSCRIPCION_PUBLIC_COLUMNS = freezeColumns([
  ["received_at", "Fecha y hora de recepción"],
  ...PUBLIC_ANSWER_COLUMNS,
]);

export const INSCRIPCION_PUBLIC_HEADERS = Object.freeze(
  INSCRIPCION_PUBLIC_COLUMNS.map(({ header }) => header),
);

const COLUMN_INDEX = new Map(
  INSCRIPCION_SHEET_COLUMNS.map(({ key }, index) => [key, index]),
);
const ANSWER_KEYS = new Set(ANSWER_COLUMNS.map(([key]) => key));
const LOOKUP_COLUMNS = INSCRIPCION_SHEET_COLUMNS.slice(
  0,
  Math.max(
    COLUMN_INDEX.get("email_status"),
    COLUMN_INDEX.get("gmail_message_id"),
    COLUMN_INDEX.get("email_error"),
  ) + 1,
);
const DRIVE_SHEET_COLUMNS = INSCRIPCION_SHEET_COLUMNS.slice(
  INSCRIPCION_SHEET_V1_COLUMNS.length,
);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const LEGACY_LABEL_ALIASES = [
  ["Sede", "training_location"],
  ["ID del grupo", "training_group_id"],
  ["Grupo", "training_group_name"],
  ["Días por semana", "training_day_count"],
  ["Días elegidos", "training_selected_days"],
  ["Población de residencia", "participant_residence_city"],
  ["Nombre y Apellidos", "participant_full_name"],
  ["Fecha de nacimiento", "participant_birth_date"],
  ["SEXO", "participant_sex"],
  ["Documento de identidad (DNI, NIE o pasaporte)", "participant_document_number"],
  ["Documento de identidad · parte delantera", "participant_document_front"],
  ["Documento de identidad · parte trasera", "participant_document_back"],
  ["Eres nuevo en el club?", "club_membership_status"],
  ["Dirección", "participant_address"],
  ["Código Postal", "participant_postal_code"],
  ["Nacionalidad", "participant_nationality"],
  ["Teléfono de contacto", "contact_phone"],
  [
    "Menores de 18 años indicar: Nombre y Apellidos de la madre/padre ó tutor legal",
    "guardian_full_name",
  ],
  [
    "Menores de 18 años indicar: DNI de la madre/padre ó tutor legal",
    "guardian_document_number",
  ],
  ["DNI/NIE del tutor legal · parte delantera", "guardian_document_front"],
  ["DNI/NIE del tutor legal · parte trasera", "guardian_document_back"],
  [
    "Menores de 18 años indicar fecha de nacimiento de la madre/padre ó tutor legal",
    "guardian_birth_date",
  ],
  ["Elige la modalidad y forma de pago", "payment_method"],
  ["Datos bancarios para domiciliación", "bank_details"],
  [
    "Informaciones a tener en cuenta sobre el participante (Enfermadades, alergias ...)",
    "participant_health_information",
  ],
  ["Observaciones o sugerencias:", "comments"],
];

export function normalizeLegacyLabel(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const LEGACY_LABEL_TO_KEY = new Map(
  LEGACY_LABEL_ALIASES.map(([label, key]) => [normalizeLegacyLabel(label), key]),
);

export class GoogleSheetsConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "GoogleSheetsConfigurationError";
    this.code = "GOOGLE_SHEETS_NOT_CONFIGURED";
    this.status = 503;
    this.expose = true;
  }
}

export class GoogleSheetsSchemaError extends Error {
  constructor(message) {
    super(message);
    this.name = "GoogleSheetsSchemaError";
    this.code = "GOOGLE_SHEETS_SCHEMA_MISMATCH";
    this.status = 503;
    this.expose = true;
  }
}

export class InvalidSubmissionIdError extends Error {
  constructor(message = "El identificador del envío no es válido.") {
    super(message);
    this.name = "InvalidSubmissionIdError";
    this.code = "INVALID_SUBMISSION_ID";
    this.status = 400;
    this.expose = true;
  }
}

export class UnmappedAnswersTooLargeError extends Error {
  constructor(length) {
    super("Las respuestas del formulario no son válidas.");
    this.name = "UnmappedAnswersTooLargeError";
    this.code = "UNMAPPED_ANSWERS_TOO_LARGE";
    this.status = 400;
    this.expose = true;
    this.length = length;
    this.maxLength = MAX_UNMAPPED_ANSWERS_CHARS;
  }
}

export class DriveManifestTooLargeError extends Error {
  constructor(length) {
    super("Las referencias de Google Drive no son válidas.");
    this.name = "DriveManifestTooLargeError";
    this.code = "DRIVE_MANIFEST_TOO_LARGE";
    this.status = 503;
    this.expose = true;
    this.length = length;
    this.maxLength = MAX_DRIVE_MANIFEST_CHARS;
  }
}

export class GoogleSheetsRowMismatchError extends Error {
  constructor(rowNumber) {
    super("La fila de Google Sheets ya no pertenece al envío esperado.");
    this.name = "GoogleSheetsRowMismatchError";
    this.code = "GOOGLE_SHEETS_ROW_MISMATCH";
    this.status = 409;
    this.expose = false;
    this.rowNumber = rowNumber;
  }
}

export function normalizeAnswerKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeSubmissionId(value) {
  const submissionId = String(value ?? "").trim().toLowerCase();
  if (!UUID_PATTERN.test(submissionId)) throw new InvalidSubmissionIdError();
  return submissionId;
}

export function legacyAnswerKey(label) {
  const normalizedLabel = normalizeLegacyLabel(label);
  const exactKey = LEGACY_LABEL_TO_KEY.get(normalizedLabel);
  if (exactKey) return exactKey;

  if (normalizedLabel.startsWith("para pagos por domiciliacion los recibos")) {
    return "direct_debit_authorization";
  }
  if (normalizedLabel.startsWith("autorizo a que la imagen")) {
    return "image_use_authorization";
  }
  if (normalizedLabel.startsWith("categorias escolares autorizo")) {
    return "offsite_activity_authorization";
  }
  if (normalizedLabel.startsWith("para atletas con licencia de atletismo")) {
    return "accident_protocol_acknowledgement";
  }
  if (normalizedLabel.startsWith("de conformidad con la lo 3 2018")) {
    return "privacy_consent";
  }
  if (normalizedLabel.startsWith("condiciones de uso quien cumplimenta")) {
    return "terms_consent";
  }
  return "";
}

export function normalizeAnswersForSheet(answers) {
  const answerMap = new Map();
  const unmapped = [];
  if (!Array.isArray(answers)) return { answerMap, unmapped };

  answers.forEach((answer) => {
    const explicitKey = normalizeAnswerKey(answer?.key);
    const key = explicitKey || legacyAnswerKey(answer?.label);
    if (!key || !ANSWER_KEYS.has(key)) {
      unmapped.push({
        key: explicitKey,
        section: String(answer?.section ?? ""),
        label: String(answer?.label ?? ""),
        value: String(answer?.value ?? ""),
      });
      return;
    }
    answerMap.set(key, String(answer?.value ?? ""));
  });
  return { answerMap, unmapped };
}

export function mapAnswersByKey(answers) {
  return normalizeAnswersForSheet(answers).answerMap;
}

export function serializeUnmappedAnswers(
  unmapped,
  maxLength = MAX_UNMAPPED_ANSWERS_CHARS,
) {
  if (!Array.isArray(unmapped) || unmapped.length === 0) return "";
  const serialized = JSON.stringify(unmapped);
  if (serialized.length > maxLength) {
    throw new UnmappedAnswersTooLargeError(serialized.length);
  }
  return serialized;
}

function driveManifestEntry(file, fallbackKind) {
  if (!file || typeof file !== "object") return null;
  return {
    kind: String(file.kind ?? fallbackKind ?? ""),
    slot: String(file.slot ?? ""),
    key: String(file.key ?? ""),
    index: Number.isInteger(file.index) ? file.index : null,
    label: String(file.label ?? ""),
    name: String(file.name ?? ""),
    mimeType: String(file.mimeType ?? ""),
    size: Number.isFinite(Number(file.size)) ? Number(file.size) : null,
    sha256: String(file.sha256 ?? ""),
    id: String(file.id ?? ""),
    url: String(file.url ?? ""),
  };
}

export function serializeDriveManifest(archive, maxLength = MAX_DRIVE_MANIFEST_CHARS) {
  if (!archive || typeof archive !== "object") return "";
  const manifest = {
    version: Number(archive.version) || 1,
    submissionId: String(archive.submissionId ?? ""),
    formType: String(archive.formType ?? ""),
    parentFolderId: String(archive.parentFolderId ?? ""),
    folder: {
      id: String(archive.folder?.id ?? ""),
      name: String(archive.folder?.name ?? ""),
      url: String(archive.folder?.url ?? ""),
    },
    snapshot: driveManifestEntry(archive.snapshot, "snapshot"),
    attachments: Array.isArray(archive.attachments)
      ? archive.attachments.map((file) => driveManifestEntry(file, "attachment")).filter(Boolean)
      : [],
  };
  const serialized = JSON.stringify(manifest);
  if (serialized.length > maxLength) {
    throw new DriveManifestTooLargeError(serialized.length);
  }
  return serialized;
}

export function parseDriveManifest(value) {
  const serialized = String(value ?? "").trim();
  if (!serialized) return null;
  try {
    const manifest = JSON.parse(serialized);
    return manifest && typeof manifest === "object" && !Array.isArray(manifest)
      ? manifest
      : null;
  } catch {
    return null;
  }
}

export function driveArchiveToRecord(archive, { status = "stored", error = "" } = {}) {
  const attachments = Array.isArray(archive?.attachments) ? archive.attachments : [];
  const urlFor = (key) => String(attachments.find((file) => file?.key === key)?.url ?? "");
  return {
    drive_status: String(status ?? ""),
    drive_error: String(error ?? ""),
    drive_folder_id: String(archive?.folder?.id ?? ""),
    drive_folder_url: String(archive?.folder?.url ?? ""),
    snapshot_drive_file_id: String(archive?.snapshot?.id ?? ""),
    snapshot_drive_url: String(archive?.snapshot?.url ?? ""),
    participant_document_front_drive_url: urlFor("participant_document_front"),
    participant_document_back_drive_url: urlFor("participant_document_back"),
    guardian_document_front_drive_url: urlFor("guardian_document_front"),
    guardian_document_back_drive_url: urlFor("guardian_document_back"),
    drive_files_manifest: serializeDriveManifest(archive),
  };
}

const PUBLIC_FILE_URL_KEYS = Object.freeze({
  participant_document_front: "participant_document_front_drive_url",
  participant_document_back: "participant_document_back_drive_url",
  guardian_document_front: "guardian_document_front_drive_url",
  guardian_document_back: "guardian_document_back_drive_url",
});

export function formatInscripcionReceivedAt(value, timeZone = "Europe/Madrid") {
  const date = value instanceof Date ? value : new Date(String(value ?? ""));
  if (!Number.isFinite(date.getTime())) return String(value ?? "");
  const parts = new Intl.DateTimeFormat("es-ES", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type) => parts.find((entry) => entry.type === type)?.value || "";
  return `${part("day")}/${part("month")}/${part("year")} ${part("hour")}:${part("minute")}:${part("second")}`;
}

export function buildInscripcionPublicRow(record, { timeZone = "Europe/Madrid" } = {}) {
  const source = record && typeof record === "object" ? record : {};
  return [
    formatInscripcionReceivedAt(source.server_received_at, timeZone),
    ...PUBLIC_ANSWER_COLUMNS.map(([key]) => {
      const driveUrlKey = PUBLIC_FILE_URL_KEYS[key];
      return String((driveUrlKey && source[driveUrlKey]) || source[key] || "");
    }),
  ].map(escapeSpreadsheetValue);
}

export function escapeSpreadsheetValue(value) {
  // RAW hace que Sheets almacene el contenido literalmente, incluso si empieza
  // por =, +, - o @. No añadimos prefijos para no alterar teléfonos, IBAN o texto.
  return String(value ?? "");
}

export function stableStringify(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? JSON.stringify(value) : "null";
  }
  if (typeof value === "bigint") return JSON.stringify(String(value));
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${entries.join(",")}}`;
  }
  return "null";
}

export function createPayloadFingerprint(payload) {
  const { submissionId: _submissionId, submittedAt: _submittedAt, ...content } = payload || {};
  return crypto.createHash("sha256").update(stableStringify(content), "utf8").digest("hex");
}

export function buildInscripcionRecord({
  payload,
  submissionId = payload?.submissionId,
  receivedAt = "",
  emailStatus = "pending",
  payloadFingerprint = createPayloadFingerprint(payload),
  driveArchive,
  driveStatus = driveArchive ? "stored" : "pending",
  driveError = "",
} = {}) {
  const normalizedSubmissionId = normalizeSubmissionId(submissionId);
  const { answerMap, unmapped } = normalizeAnswersForSheet(payload?.answers);
  const attachmentNames = Array.isArray(payload?.attachments)
    ? payload.attachments
        .map((attachment) => String(attachment?.name ?? "").trim())
        .filter(Boolean)
        .join(" | ")
    : "";

  const record = {
    submission_id: normalizedSubmissionId,
    payload_fingerprint: String(payloadFingerprint ?? ""),
    schema_version: INSCRIPCION_SHEET_SCHEMA_VERSION,
    server_received_at: String(receivedAt ?? ""),
    client_submitted_at: String(payload?.submittedAt ?? ""),
    form_type: String(payload?.type ?? ""),
    form_title: String(payload?.title ?? ""),
    page_url: String(payload?.pageUrl ?? ""),
    email_status: String(emailStatus ?? "pending"),
    gmail_message_id: "",
    email_error: "",
    attachment_names: attachmentNames,
    unmapped_answers: serializeUnmappedAnswers(unmapped),
  };

  ANSWER_KEYS.forEach((key) => {
    record[key] = answerMap.get(key) ?? "";
  });
  Object.assign(
    record,
    driveArchiveToRecord(driveArchive, { status: driveStatus, error: driveError }),
  );
  return record;
}

export function recordToSheetRow(record) {
  return INSCRIPCION_SHEET_COLUMNS.map(({ key }) =>
    escapeSpreadsheetValue(record?.[key]),
  );
}

export function sheetRowToRecord(row, columns = INSCRIPCION_SHEET_COLUMNS) {
  return Object.fromEntries(
    columns.map(({ key }, index) => [key, String(row?.[index] ?? "")]),
  );
}

export function isDuplicateSubmissionRecord(record) {
  return String(record?.email_error ?? "").startsWith("DUPLICATE_SUBMISSION:");
}

function normalizedRecordStatus(record) {
  return String(record?.email_status ?? "").trim().toLowerCase();
}

function canonicalRowTime(row) {
  const timestamp = Date.parse(String(row?.record?.server_received_at ?? ""));
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function compareCanonicalRows(left, right) {
  const leftTime = canonicalRowTime(left);
  const rightTime = canonicalRowTime(right);
  if (leftTime !== rightTime) return leftTime < rightTime ? -1 : 1;
  return Number(left?.rowNumber ?? Number.MAX_SAFE_INTEGER) -
    Number(right?.rowNumber ?? Number.MAX_SAFE_INTEGER);
}

export function selectCanonicalSubmissionRow(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const sentRows = rows.filter(({ record }) => normalizedRecordStatus(record) === "sent");
  if (sentRows.length) return [...sentRows].sort(compareCanonicalRows)[0];

  const nonDuplicateRows = rows.filter(({ record }) => !isDuplicateSubmissionRecord(record));
  const candidates = nonDuplicateRows.length ? nonDuplicateRows : rows;
  return [...candidates].sort(compareCanonicalRows)[0] || null;
}

export function columnName(columnNumber) {
  if (!Number.isInteger(columnNumber) || columnNumber < 1) {
    throw new TypeError("El número de columna debe ser un entero positivo.");
  }

  let value = columnNumber;
  let name = "";
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
}

export function quoteSheetName(sheetName) {
  const name = String(sheetName ?? "").trim();
  if (!name || name.length > 100 || /[\\/?*\[\]:]/.test(name)) {
    throw new GoogleSheetsConfigurationError("El nombre de la pestaña de inscripciones no es válido.");
  }
  return `'${name.replaceAll("'", "''")}'`;
}

export function parseUpdatedRowNumber(updatedRange) {
  const cellRange = String(updatedRange ?? "").split("!").at(-1) || "";
  const match = /^\$?[A-Z]+\$?(\d+)(?::\$?[A-Z]+\$?(\d+))?$/i.exec(cellRange);
  if (!match || (match[2] && match[1] !== match[2])) return null;
  return Number(match[1]);
}

export function createGoogleSheetsClient({ auth, googleApi = google } = {}) {
  const resolvedAuth =
    auth ||
    new googleApi.auth.GoogleAuth({
      scopes: [GOOGLE_SHEETS_SCOPE],
    });
  return googleApi.sheets({ version: "v4", auth: resolvedAuth });
}

function headersMatch(actualHeaders, expectedHeaders) {
  if (actualHeaders.length !== expectedHeaders.length) return false;
  return expectedHeaders.every((header, index) => actualHeaders[index] === header);
}

function isEmptyRow(row) {
  return !row?.some((value) => String(value ?? "").length > 0);
}

async function spreadsheetSheets(sheetsClient, spreadsheetId) {
  const response = await sheetsClient.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(sheetId,title,hidden,gridProperties(rowCount,columnCount,frozenRowCount))",
  });
  return response.data.sheets || [];
}

async function readSheetHeaders(sheetsClient, spreadsheetId, sheetName, columnCount) {
  const range = `${quoteSheetName(sheetName)}!A1:${columnName(columnCount)}1`;
  const response = await sheetsClient.spreadsheets.values.get({
    spreadsheetId,
    range,
    majorDimension: "ROWS",
  });
  return { range, headers: response.data.values?.[0] || [] };
}

export async function ensureInscripcionSheet({
  sheetsClient,
  spreadsheetId,
  sheetName = DEFAULT_INSCRIPCION_SYSTEM_SHEET_NAME,
  legacySheetName = DEFAULT_INSCRIPCION_SHEET_NAME,
  hidden = true,
}) {
  const normalizedSpreadsheetId = String(spreadsheetId ?? "").trim();
  const normalizedSheetName = String(sheetName ?? "").trim();
  const normalizedLegacySheetName = String(legacySheetName ?? "").trim();
  if (!normalizedSpreadsheetId) {
    throw new GoogleSheetsConfigurationError(
      "Falta la variable GOOGLE_SHEETS_SPREADSHEET_ID.",
    );
  }
  if (!sheetsClient?.spreadsheets?.values) {
    throw new TypeError("Se necesita un cliente válido de Google Sheets.");
  }

  const quotedSheetName = quoteSheetName(normalizedSheetName);
  let sheets = await spreadsheetSheets(sheetsClient, normalizedSpreadsheetId);
  let sheet = sheets.find(({ properties }) => properties?.title === normalizedSheetName);
  let migratedFromLegacy = false;
  let publicCreated = false;

  if (!sheet && normalizedLegacySheetName && normalizedLegacySheetName !== normalizedSheetName) {
    const legacySheet = sheets.find(
      ({ properties }) => properties?.title === normalizedLegacySheetName,
    );
    if (legacySheet) {
      const legacyHeader = await readSheetHeaders(
        sheetsClient,
        normalizedSpreadsheetId,
        normalizedLegacySheetName,
        INSCRIPCION_SHEET_COLUMNS.length,
      );
      const isTechnicalSheet =
        headersMatch(legacyHeader.headers, INSCRIPCION_SHEET_HEADERS) ||
        headersMatch(legacyHeader.headers, INSCRIPCION_SHEET_V1_HEADERS);
      if (isTechnicalSheet) {
        const response = await sheetsClient.spreadsheets.batchUpdate({
          spreadsheetId: normalizedSpreadsheetId,
          requestBody: {
            requests: [
              {
                updateSheetProperties: {
                  properties: {
                    sheetId: legacySheet.properties.sheetId,
                    title: normalizedSheetName,
                  },
                  fields: "title",
                },
              },
              {
                addSheet: {
                  properties: {
                    title: normalizedLegacySheetName,
                    hidden: false,
                    gridProperties: {
                      rowCount: 1_000,
                      columnCount: INSCRIPCION_PUBLIC_COLUMNS.length,
                      frozenRowCount: 1,
                    },
                  },
                },
              },
              {
                updateSheetProperties: {
                  properties: {
                    sheetId: legacySheet.properties.sheetId,
                    hidden: Boolean(hidden),
                  },
                  fields: "hidden",
                },
              },
            ],
          },
        });
        const publicProperties = response.data.replies?.[1]?.addSheet?.properties;
        sheet = {
          properties: {
            ...legacySheet.properties,
            title: normalizedSheetName,
            hidden: Boolean(hidden),
          },
        };
        if (publicProperties) {
          sheets = [
            ...sheets.filter(
              ({ properties }) => properties?.sheetId !== legacySheet.properties.sheetId,
            ),
            sheet,
            { properties: publicProperties },
          ];
        }
        migratedFromLegacy = true;
        publicCreated = true;
      }
    }
  }

  if (!sheet) {
    try {
      const response = await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId: normalizedSpreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: normalizedSheetName,
                  hidden: Boolean(hidden),
                  gridProperties: {
                    rowCount: 1_000,
                    columnCount: INSCRIPCION_SHEET_COLUMNS.length,
                  },
                },
              },
            },
          ],
        },
      });
      const properties = response.data.replies?.[0]?.addSheet?.properties;
      sheet = properties ? { properties } : null;
    } catch (error) {
      // Otra instancia puede haber creado la pestaña entre el GET y el batchUpdate.
      sheets = await spreadsheetSheets(sheetsClient, normalizedSpreadsheetId);
      sheet = sheets.find(({ properties }) => properties?.title === normalizedSheetName);
      if (!sheet) throw error;
    }
  }

  if (!sheet) {
    sheets = await spreadsheetSheets(sheetsClient, normalizedSpreadsheetId);
    sheet = sheets.find(({ properties }) => properties?.title === normalizedSheetName);
  }

  if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) {
    throw new GoogleSheetsConfigurationError("No se ha podido preparar la pestaña de inscripciones.");
  }

  const needsMoreColumns =
    Number(sheet.properties.gridProperties?.columnCount || 0) <
    INSCRIPCION_SHEET_COLUMNS.length;
  const needsHiddenUpdate = Boolean(sheet.properties.hidden) !== Boolean(hidden);
  if (needsMoreColumns || needsHiddenUpdate) {
    const properties = { sheetId: sheet.properties.sheetId };
    const fields = [];
    if (needsMoreColumns) {
      properties.gridProperties = { columnCount: INSCRIPCION_SHEET_COLUMNS.length };
      fields.push("gridProperties.columnCount");
    }
    if (needsHiddenUpdate) {
      properties.hidden = Boolean(hidden);
      fields.push("hidden");
    }
    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId: normalizedSpreadsheetId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties,
              fields: fields.join(","),
            },
          },
        ],
      },
    });
  }

  const lastColumn = columnName(INSCRIPCION_SHEET_COLUMNS.length);
  const headerRange = `${quotedSheetName}!A1:${lastColumn}1`;
  const headerResponse = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: normalizedSpreadsheetId,
    range: headerRange,
    majorDimension: "ROWS",
  });
  const actualHeaders = headerResponse.data.values?.[0] || [];

  if (isEmptyRow(actualHeaders)) {
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: normalizedSpreadsheetId,
      range: headerRange,
      valueInputOption: "RAW",
      requestBody: {
        majorDimension: "ROWS",
        values: [[...INSCRIPCION_SHEET_HEADERS]],
      },
    });
  } else if (headersMatch(actualHeaders, INSCRIPCION_SHEET_V1_HEADERS)) {
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: normalizedSpreadsheetId,
      range: headerRange,
      valueInputOption: "RAW",
      requestBody: {
        majorDimension: "ROWS",
        values: [[...INSCRIPCION_SHEET_HEADERS]],
      },
    });
  } else if (!headersMatch(actualHeaders, INSCRIPCION_SHEET_HEADERS)) {
    throw new GoogleSheetsSchemaError(
      `La cabecera de la pestaña ${normalizedSheetName} no coincide con el esquema esperado.`,
    );
  }

  return {
    sheetId: sheet.properties.sheetId,
    sheetName: normalizedSheetName,
    headerRange,
    columns: INSCRIPCION_SHEET_COLUMNS,
    migratedFromLegacy,
    publicCreated,
  };
}

export async function ensureInscripcionPublicSheet({
  sheetsClient,
  spreadsheetId,
  sheetName = DEFAULT_INSCRIPCION_SHEET_NAME,
}) {
  const normalizedSpreadsheetId = String(spreadsheetId ?? "").trim();
  const normalizedSheetName = String(sheetName ?? "").trim();
  if (!normalizedSpreadsheetId) {
    throw new GoogleSheetsConfigurationError(
      "Falta la variable GOOGLE_SHEETS_SPREADSHEET_ID.",
    );
  }
  if (!sheetsClient?.spreadsheets?.values) {
    throw new TypeError("Se necesita un cliente válido de Google Sheets.");
  }

  let sheets = await spreadsheetSheets(sheetsClient, normalizedSpreadsheetId);
  let sheet = sheets.find(({ properties }) => properties?.title === normalizedSheetName);
  let created = false;
  if (!sheet) {
    const response = await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId: normalizedSpreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: normalizedSheetName,
                hidden: false,
                gridProperties: {
                  rowCount: 1_000,
                  columnCount: INSCRIPCION_PUBLIC_COLUMNS.length,
                  frozenRowCount: 1,
                },
              },
            },
          },
        ],
      },
    });
    const properties = response.data.replies?.[0]?.addSheet?.properties;
    sheet = properties ? { properties } : null;
    created = true;
  }
  if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) {
    throw new GoogleSheetsConfigurationError(
      "No se ha podido preparar la pestaña visible de inscripciones.",
    );
  }

  const needsMoreColumns =
    Number(sheet.properties.gridProperties?.columnCount || 0) <
    INSCRIPCION_PUBLIC_COLUMNS.length;
  const needsVisibleUpdate = Boolean(sheet.properties.hidden);
  const needsFrozenHeader =
    Number(sheet.properties.gridProperties?.frozenRowCount || 0) < 1;
  if (needsMoreColumns || needsVisibleUpdate || needsFrozenHeader) {
    const properties = { sheetId: sheet.properties.sheetId };
    const fields = [];
    if (needsMoreColumns || needsFrozenHeader) {
      properties.gridProperties = {
        ...(needsMoreColumns
          ? { columnCount: INSCRIPCION_PUBLIC_COLUMNS.length }
          : {}),
        ...(needsFrozenHeader ? { frozenRowCount: 1 } : {}),
      };
      if (needsMoreColumns) fields.push("gridProperties.columnCount");
      if (needsFrozenHeader) fields.push("gridProperties.frozenRowCount");
    }
    if (needsVisibleUpdate) {
      properties.hidden = false;
      fields.push("hidden");
    }
    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId: normalizedSpreadsheetId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties,
              fields: fields.join(","),
            },
          },
        ],
      },
    });
  }

  const header = await readSheetHeaders(
    sheetsClient,
    normalizedSpreadsheetId,
    normalizedSheetName,
    INSCRIPCION_PUBLIC_COLUMNS.length,
  );
  if (isEmptyRow(header.headers)) {
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: normalizedSpreadsheetId,
      range: header.range,
      valueInputOption: "RAW",
      requestBody: {
        majorDimension: "ROWS",
        values: [[...INSCRIPCION_PUBLIC_HEADERS]],
      },
    });
  } else if (!headersMatch(header.headers, INSCRIPCION_PUBLIC_HEADERS)) {
    throw new GoogleSheetsSchemaError(
      `La cabecera de la pestaña ${normalizedSheetName} no coincide con la vista esperada.`,
    );
  }

  return {
    sheetId: sheet.properties.sheetId,
    sheetName: normalizedSheetName,
    headerRange: header.range,
    columns: INSCRIPCION_PUBLIC_COLUMNS,
    created,
  };
}

function truncateError(error) {
  const summary = summarizeError(error);
  const code = summary.code || summary.name || "EMAIL_ERROR";
  const status = summary.status ? ` (${summary.status})` : "";
  return `${code}${status}: ${summary.message}`.slice(0, 500);
}

export function createInscripcionSheetStore({
  sheetsClient,
  spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  sheetName = process.env.GOOGLE_SHEETS_INSCRIPCION_TAB || DEFAULT_INSCRIPCION_SHEET_NAME,
  systemSheetName =
    process.env.GOOGLE_SHEETS_INSCRIPCION_SYSTEM_TAB ||
    DEFAULT_INSCRIPCION_SYSTEM_SHEET_NAME,
  clock = () => new Date(),
  readinessClock = () => Date.now(),
  readinessTtlMs = 5_000,
} = {}) {
  if (typeof readinessClock !== "function") {
    throw new TypeError("readinessClock debe ser una función válida.");
  }
  if (!Number.isFinite(readinessTtlMs) || readinessTtlMs < 0) {
    throw new TypeError("readinessTtlMs debe ser un número no negativo.");
  }
  const normalizedSpreadsheetId = String(spreadsheetId ?? "").trim();
  const normalizedPublicSheetName = String(sheetName ?? "").trim();
  const normalizedSystemSheetName = String(systemSheetName ?? "").trim();
  if (normalizedPublicSheetName === normalizedSystemSheetName) {
    throw new GoogleSheetsConfigurationError(
      "Las pestañas visible y técnica de inscripciones deben tener nombres diferentes.",
    );
  }
  const lastColumn = columnName(INSCRIPCION_SHEET_COLUMNS.length);
  const lastPublicColumn = columnName(INSCRIPCION_PUBLIC_COLUMNS.length);
  const lastLookupColumn = columnName(LOOKUP_COLUMNS.length);
  const firstDriveColumn = columnName(INSCRIPCION_SHEET_V1_COLUMNS.length + 1);
  let client = sheetsClient;
  let quotedSystemSheetName;
  let quotedPublicSheetName;
  let readyPromise;
  let readyExpiresAt = 0;

  function prepareRuntime() {
    if (!normalizedSpreadsheetId) {
      throw new GoogleSheetsConfigurationError(
        "Falta la variable GOOGLE_SHEETS_SPREADSHEET_ID.",
      );
    }
    quotedSystemSheetName ||= quoteSheetName(normalizedSystemSheetName);
    quotedPublicSheetName ||= quoteSheetName(normalizedPublicSheetName);
    client ||= createGoogleSheetsClient();
  }

  async function writePublicRow(rowNumber, record) {
    await client.spreadsheets.values.update({
      spreadsheetId: normalizedSpreadsheetId,
      range: `${quotedPublicSheetName}!A${rowNumber}:${lastPublicColumn}${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        majorDimension: "ROWS",
        values: [buildInscripcionPublicRow(record)],
      },
    });
  }

  async function syncExistingPublicRows() {
    const response = await client.spreadsheets.values.get({
      spreadsheetId: normalizedSpreadsheetId,
      range: `${quotedSystemSheetName}!A2:${lastColumn}`,
      majorDimension: "ROWS",
    });
    const rows = response.data.values || [];
    if (!rows.length) return;
    const publicRows = rows.map((row) => {
      const record = sheetRowToRecord(row);
      const stored = String(record.drive_status ?? "").trim().toLowerCase() === "stored";
      return stored
        ? buildInscripcionPublicRow(record)
        : Array(INSCRIPCION_PUBLIC_COLUMNS.length).fill("");
    });
    await client.spreadsheets.values.update({
      spreadsheetId: normalizedSpreadsheetId,
      range: `${quotedPublicSheetName}!A2:${lastPublicColumn}${rows.length + 1}`,
      valueInputOption: "RAW",
      requestBody: {
        majorDimension: "ROWS",
        values: publicRows,
      },
    });
  }

  function readinessTime() {
    const currentTime = Number(readinessClock());
    if (!Number.isFinite(currentTime)) {
      throw new TypeError("readinessClock debe devolver una fecha válida.");
    }
    return currentTime;
  }

  function ensureReady() {
    const currentTime = readinessTime();
    if (!readyPromise || currentTime >= readyExpiresAt) {
      readyExpiresAt = Number.POSITIVE_INFINITY;
      readyPromise = Promise.resolve()
        .then(() => {
          prepareRuntime();
          return ensureInscripcionSheet({
            sheetsClient: client,
            spreadsheetId: normalizedSpreadsheetId,
            sheetName: normalizedSystemSheetName,
            legacySheetName: normalizedPublicSheetName,
          });
        })
        .then(async (system) => {
          const publicSheet = await ensureInscripcionPublicSheet({
            sheetsClient: client,
            spreadsheetId: normalizedSpreadsheetId,
            sheetName: normalizedPublicSheetName,
          });
          if (system.migratedFromLegacy || system.publicCreated || publicSheet.created) {
            await syncExistingPublicRows();
          }
          readyExpiresAt = readinessTime() + readinessTtlMs;
          return { system, public: publicSheet };
        })
        .catch((error) => {
          readyPromise = undefined;
          readyExpiresAt = 0;
          throw error;
        });
    }
    return readyPromise;
  }

  async function verifyWritable() {
    const ready = await ensureReady();
    await Promise.all([
      client.spreadsheets.values.update({
        spreadsheetId: normalizedSpreadsheetId,
        range: ready.system.headerRange,
        valueInputOption: "RAW",
        requestBody: {
          majorDimension: "ROWS",
          values: [[...INSCRIPCION_SHEET_HEADERS]],
        },
      }),
      client.spreadsheets.values.update({
        spreadsheetId: normalizedSpreadsheetId,
        range: ready.public.headerRange,
        valueInputOption: "RAW",
        requestBody: {
          majorDimension: "ROWS",
          values: [[...INSCRIPCION_PUBLIC_HEADERS]],
        },
      }),
    ]);
    return ready;
  }

  async function findAllBySubmissionId(value) {
    const submissionId = normalizeSubmissionId(value);
    await ensureReady();
    const response = await client.spreadsheets.values.batchGet({
      spreadsheetId: normalizedSpreadsheetId,
      ranges: [
        `${quotedSystemSheetName}!A2:${lastLookupColumn}`,
        `${quotedSystemSheetName}!${firstDriveColumn}2:${lastColumn}`,
      ],
      majorDimension: "ROWS",
    });
    const rows = response.data.valueRanges?.[0]?.values || [];
    const driveRows = response.data.valueRanges?.[1]?.values || [];
    return rows.flatMap((row, index) => {
      const rowSubmissionId = String(row?.[0] ?? "").trim().toLowerCase();
      if (rowSubmissionId !== submissionId) return [];
      return [{
        rowNumber: index + 2,
        record: {
          ...sheetRowToRecord(row, LOOKUP_COLUMNS),
          ...sheetRowToRecord(driveRows[index] || [], DRIVE_SHEET_COLUMNS),
        },
      }];
    });
  }

  async function findBySubmissionId(value) {
    const rows = await findAllBySubmissionId(value);
    return selectCanonicalSubmissionRow(rows);
  }

  async function appendPending({
    payload,
    submissionId = payload?.submissionId,
    receivedAt,
    payloadFingerprint = createPayloadFingerprint(payload),
  } = {}) {
    await ensureReady();
    const timestamp = receivedAt ?? clock();
    const normalizedReceivedAt =
      timestamp instanceof Date ? timestamp.toISOString() : String(timestamp ?? "");
    const record = buildInscripcionRecord({
      payload,
      submissionId,
      receivedAt: normalizedReceivedAt,
      emailStatus: "pending",
      payloadFingerprint,
    });
    const row = recordToSheetRow(record);
    const response = await client.spreadsheets.values.append({
      spreadsheetId: normalizedSpreadsheetId,
      range: `${quotedSystemSheetName}!A:${lastColumn}`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      includeValuesInResponse: false,
      requestBody: {
        majorDimension: "ROWS",
        values: [row],
      },
    });
    const rowNumber = parseUpdatedRowNumber(response.data.updates?.updatedRange);
    if (!rowNumber) {
      throw new Error("Google Sheets no ha devuelto la fila añadida.");
    }
    return { rowNumber, record, row };
  }

  async function verifySubmissionRow(rowNumber, expectedSubmissionId) {
    if (!Number.isInteger(rowNumber) || rowNumber < 2) {
      throw new TypeError("El número de fila de Google Sheets no es válido.");
    }
    await ensureReady();
    if (!expectedSubmissionId) return;
    const normalizedExpectedId = normalizeSubmissionId(expectedSubmissionId);
    const verification = await client.spreadsheets.values.get({
      spreadsheetId: normalizedSpreadsheetId,
      range: `${quotedSystemSheetName}!A${rowNumber}:A${rowNumber}`,
      majorDimension: "ROWS",
    });
    const actualSubmissionId = String(verification.data.values?.[0]?.[0] ?? "")
      .trim()
      .toLowerCase();
    if (actualSubmissionId !== normalizedExpectedId) {
      throw new GoogleSheetsRowMismatchError(rowNumber);
    }
  }

  async function updateRecordRange(
    rowNumber,
    firstKey,
    finalKey,
    values,
    expectedSubmissionId,
  ) {
    await verifySubmissionRow(rowNumber, expectedSubmissionId);
    const firstColumn = columnName(COLUMN_INDEX.get(firstKey) + 1);
    const finalColumn = columnName(COLUMN_INDEX.get(finalKey) + 1);
    await client.spreadsheets.values.update({
      spreadsheetId: normalizedSpreadsheetId,
      range: `${quotedSystemSheetName}!${firstColumn}${rowNumber}:${finalColumn}${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        majorDimension: "ROWS",
        values: [values.map(escapeSpreadsheetValue)],
      },
    });
  }

  async function updateEmailState(
    rowNumber,
    { status, gmailMessageId = "", error = "" },
    verification = {},
  ) {
    const expectedSubmissionId = typeof verification === "string"
      ? verification
      : verification?.expectedSubmissionId;
    await updateRecordRange(
      rowNumber,
      "email_status",
      "email_error",
      [status, gmailMessageId, error],
      expectedSubmissionId,
    );
  }

  async function updateDriveArchive(rowNumber, archive, status, expectedSubmissionId) {
    const driveRecord = driveArchiveToRecord(archive, { status });
    await updateRecordRange(
      rowNumber,
      DRIVE_COLUMNS[0][0],
      DRIVE_COLUMNS.at(-1)[0],
      DRIVE_COLUMNS.map(([key]) => driveRecord[key]),
      typeof expectedSubmissionId === "object"
        ? expectedSubmissionId?.expectedSubmissionId
        : expectedSubmissionId,
    );
  }

  async function markDrivePlanned(rowNumber, archive, expectedSubmissionId) {
    await updateDriveArchive(rowNumber, archive, "planned", expectedSubmissionId);
  }

  async function markDriveStored(rowNumber, archive, expectedSubmissionId) {
    await verifySubmissionRow(rowNumber, expectedSubmissionId);
    const response = await client.spreadsheets.values.get({
      spreadsheetId: normalizedSpreadsheetId,
      range: `${quotedSystemSheetName}!A${rowNumber}:${lastColumn}${rowNumber}`,
      majorDimension: "ROWS",
    });
    const record = {
      ...sheetRowToRecord(response.data.values?.[0] || []),
      ...driveArchiveToRecord(archive, { status: "stored" }),
    };
    await writePublicRow(rowNumber, record);
    await updateDriveArchive(rowNumber, archive, "stored", expectedSubmissionId);
  }

  async function markDriveError(rowNumber, error, expectedSubmissionId) {
    await updateRecordRange(
      rowNumber,
      "drive_status",
      "drive_error",
      ["error", truncateError(error)],
      typeof expectedSubmissionId === "object"
        ? expectedSubmissionId?.expectedSubmissionId
        : expectedSubmissionId,
    );
  }

  async function markSent(rowNumber, gmailMessageId, expectedSubmissionId) {
    await updateEmailState(rowNumber, {
      status: "sent",
      gmailMessageId,
      error: "",
    }, typeof expectedSubmissionId === "object"
      ? expectedSubmissionId
      : { expectedSubmissionId });
  }

  async function markError(rowNumber, error, expectedSubmissionId) {
    await updateEmailState(rowNumber, {
      status: "error",
      gmailMessageId: "",
      error: truncateError(error),
    }, typeof expectedSubmissionId === "object"
      ? expectedSubmissionId
      : { expectedSubmissionId });
  }

  return Object.freeze({
    configured: Boolean(normalizedSpreadsheetId),
    spreadsheetId: normalizedSpreadsheetId,
    sheetName: normalizedPublicSheetName,
    systemSheetName: normalizedSystemSheetName,
    ensureReady,
    verifyWritable,
    findAllBySubmissionId,
    findBySubmissionId,
    appendPending,
    updateEmailState,
    markDrivePlanned,
    markDriveStored,
    markDriveError,
    markSent,
    markError,
  });
}
