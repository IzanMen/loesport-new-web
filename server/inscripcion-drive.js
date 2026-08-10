import crypto from "node:crypto";
import path from "node:path";
import { Readable } from "node:stream";

import { google } from "googleapis";

export const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
export const GOOGLE_DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
export const DRIVE_ARCHIVE_VERSION = 1;
export const RESUMABLE_UPLOAD_THRESHOLD_BYTES = 5 * 1024 * 1024;

const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{10,200}$/;
const FILE_FIELDS = [
  "id",
  "name",
  "mimeType",
  "createdTime",
  "webViewLink",
  "appProperties",
  "parents",
  "size",
  "sha256Checksum",
  "trashed",
].join(",");
const SUBMISSION_PROPERTY = "loesport_submission_id";
const KIND_PROPERTY = "loesport_kind";
const SLOT_PROPERTY = "loesport_file_slot";
const FORM_TYPE_PROPERTY = "loesport_form_type";
const DEFAULT_RETRY_DELAYS_MS = Object.freeze([150, 500]);

export class GoogleDriveConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "GoogleDriveConfigurationError";
    this.code = "GOOGLE_DRIVE_NOT_CONFIGURED";
    this.status = 503;
    this.expose = true;
  }
}

export class GoogleDriveSecurityError extends Error {
  constructor(message) {
    super(message);
    this.name = "GoogleDriveSecurityError";
    this.code = "GOOGLE_DRIVE_FOLDER_NOT_PRIVATE";
    this.status = 503;
    this.expose = true;
  }
}

export class DrivePayloadConflictError extends Error {
  constructor(submissionId) {
    super("Los archivos del envío han cambiado durante el reintento.");
    this.name = "DrivePayloadConflictError";
    this.code = "DRIVE_PAYLOAD_CONFLICT";
    this.status = 409;
    this.expose = true;
    this.submissionId = submissionId;
  }
}

function defaultWait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function cleanDriveText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g, "")
    .trim();
}

export function safeDriveFilename(value, fallback = "archivo") {
  const normalizedPath = cleanDriveText(value).replaceAll("\\", "/");
  const basename = path.posix.basename(normalizedPath)
    .replace(/[\/]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  const safeFallback = cleanDriveText(fallback).replace(/[\\/]+/g, "-") || "archivo";
  return (basename || safeFallback).slice(0, 180);
}

const LEGACY_ATTACHMENT_KEYS = new Map([
  ["documento de identidad parte delantera", "participant_document_front"],
  ["documento de identidad parte trasera", "participant_document_back"],
  ["dni nie del tutor legal parte delantera", "guardian_document_front"],
  ["dni nie del tutor legal parte trasera", "guardian_document_back"],
]);

export function legacyAttachmentKey(value) {
  const normalizedLabel = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return LEGACY_ATTACHMENT_KEYS.get(normalizedLabel) || "";
}

export function normalizeDriveFolderId(value) {
  const folderId = cleanDriveText(value);
  if (!DRIVE_ID_PATTERN.test(folderId)) {
    throw new GoogleDriveConfigurationError(
      "El identificador de la carpeta de Google Drive no es válido.",
    );
  }
  return folderId;
}

function driveFileUrl(fileId) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
}

function driveFolderUrl(folderId) {
  return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`;
}

function normalizeDriveFile(file, { folder = false } = {}) {
  const id = cleanDriveText(file?.id);
  if (!id) {
    throw new GoogleDriveConfigurationError("Google Drive no ha devuelto el archivo creado.");
  }
  return {
    id,
    name: cleanDriveText(file?.name),
    mimeType: cleanDriveText(file?.mimeType),
    url: cleanDriveText(file?.webViewLink) || (folder ? driveFolderUrl(id) : driveFileUrl(id)),
    createdTime: cleanDriveText(file?.createdTime),
    appProperties: file?.appProperties && typeof file.appProperties === "object"
      ? { ...file.appProperties }
      : {},
    parents: Array.isArray(file?.parents) ? file.parents.map(cleanDriveText) : [],
    size: Number(file?.size),
    sha256: cleanDriveText(file?.sha256Checksum).toLowerCase(),
    trashed: file?.trashed === true,
  };
}

function compareDriveFiles(left, right) {
  const leftTime = Date.parse(left?.createdTime || "");
  const rightTime = Date.parse(right?.createdTime || "");
  const safeLeftTime = Number.isFinite(leftTime) ? leftTime : Number.POSITIVE_INFINITY;
  const safeRightTime = Number.isFinite(rightTime) ? rightTime : Number.POSITIVE_INFINITY;
  if (safeLeftTime !== safeRightTime) return safeLeftTime - safeRightTime;
  return String(left?.id ?? "").localeCompare(String(right?.id ?? ""));
}

export function selectCanonicalDriveFile(files) {
  if (!Array.isArray(files) || files.length === 0) return null;
  return [...files].sort(compareDriveFiles)[0] || null;
}

export function createGoogleDriveClient({ auth, googleApi = google } = {}) {
  const resolvedAuth = auth || new googleApi.auth.GoogleAuth({ scopes: [GOOGLE_DRIVE_SCOPE] });
  return googleApi.drive({ version: "v3", auth: resolvedAuth });
}

export function createEnvironmentDriveAuth({
  environment = process.env,
  googleApi = google,
} = {}) {
  const refreshToken = cleanDriveText(environment.GOOGLE_DRIVE_REFRESH_TOKEN);
  if (!refreshToken) {
    return {
      auth: new googleApi.auth.GoogleAuth({ scopes: [GOOGLE_DRIVE_SCOPE] }),
      mode: "adc",
    };
  }

  const clientId = cleanDriveText(
    environment.GOOGLE_DRIVE_CLIENT_ID || environment.GMAIL_CLIENT_ID,
  );
  const clientSecret = cleanDriveText(
    environment.GOOGLE_DRIVE_CLIENT_SECRET || environment.GMAIL_CLIENT_SECRET,
  );
  if (!clientId || !clientSecret) {
    throw new GoogleDriveConfigurationError("Faltan las credenciales OAuth de Google Drive.");
  }
  const oauth = new googleApi.auth.OAuth2(clientId, clientSecret);
  oauth.setCredentials({ refresh_token: refreshToken });
  return { auth: oauth, mode: "oauth" };
}

function validateBinaryFile(file, fallbackName) {
  const buffer = file?.buffer;
  if (!Buffer.isBuffer(buffer) && !(buffer instanceof Uint8Array)) {
    throw new TypeError("Google Drive necesita un archivo binario válido.");
  }
  const normalizedBuffer = Buffer.from(buffer);
  return {
    buffer: normalizedBuffer,
    mimeType: cleanDriveText(file?.mimetype) || "application/octet-stream",
    originalName: safeDriveFilename(file?.originalname, fallbackName),
    size: normalizedBuffer.length,
    sha256: crypto.createHash("sha256").update(normalizedBuffer).digest("hex"),
  };
}

export function createArchiveDescriptors(payload, snapshot, uploadedFiles = []) {
  const safeSnapshot = snapshot ? validateBinaryFile(snapshot, "captura-formulario.jpg") : null;
  const attachments = Array.isArray(payload?.attachments) ? payload.attachments : [];
  if (uploadedFiles.length !== attachments.length) {
    throw new TypeError("Los archivos de la inscripción no coinciden con sus metadatos.");
  }
  return [
    ...(safeSnapshot
      ? [{
          kind: "snapshot",
          slot: "snapshot",
          key: "snapshot",
          label: "Captura del formulario",
          name: `00-${safeSnapshot.originalName}`,
          ...safeSnapshot,
        }]
      : []),
    ...uploadedFiles.map((file, index) => {
      const binary = validateBinaryFile(file, `archivo-${index + 1}`);
      const metadata = attachments[index] || {};
      const key =
        cleanDriveText(metadata.key) ||
        legacyAttachmentKey(metadata.label) ||
        `attachment_${index}`;
      return {
        kind: "attachment",
        slot: `attachment_${index}`,
        index,
        key,
        label: cleanDriveText(metadata.label) || "Archivo adjunto",
        name: `${String(index + 1).padStart(2, "0")}-${safeDriveFilename(
          metadata.name || binary.originalName,
          `archivo-${index + 1}`,
        )}`,
        ...binary,
      };
    }),
  ];
}

function plannedFile(descriptor, id) {
  return {
    kind: descriptor.kind,
    slot: descriptor.slot,
    ...(Number.isInteger(descriptor.index) ? { index: descriptor.index } : {}),
    key: descriptor.key,
    label: descriptor.label,
    name: descriptor.name,
    mimeType: descriptor.mimeType,
    size: descriptor.size,
    sha256: descriptor.sha256,
    id,
    url: driveFileUrl(id),
  };
}

function normalizeFormType(value) {
  const formType = cleanDriveText(value).toLowerCase();
  if (!/^[a-z][a-z0-9_-]{0,49}$/.test(formType)) {
    throw new GoogleDriveConfigurationError("El tipo de formulario de Google Drive no es válido.");
  }
  return formType;
}

function createSubmissionFolderName(submissionId, formType) {
  return `${formType}-${submissionId}`;
}

function normalizeSubmissionId(value) {
  const submissionId = cleanDriveText(value).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(submissionId)) {
    throw new TypeError("La inscripción necesita un identificador válido para Google Drive.");
  }
  return submissionId;
}

function driveErrorStatus(error) {
  const status = Number(error?.response?.status ?? error?.status ?? error?.code);
  return Number.isInteger(status) ? status : null;
}

function isRetryableDriveError(error) {
  const status = driveErrorStatus(error);
  return status === null || status === 408 || status === 425 || status === 429 || status >= 500;
}

function normalizeRetryDelays(delays) {
  if (!Array.isArray(delays) || delays.length > 5) {
    throw new TypeError("Los reintentos de Google Drive no son válidos.");
  }
  return delays.map((delay) => {
    const milliseconds = Number(delay);
    if (!Number.isFinite(milliseconds) || milliseconds < 0) {
      throw new TypeError("Los reintentos de Google Drive no son válidos.");
    }
    return milliseconds;
  });
}

function assertPlanMatches(plan, submissionId, parentFolderId, descriptors, formType) {
  const plannedFiles = [
    ...(plan?.snapshot ? [plan.snapshot] : []),
    ...(Array.isArray(plan?.attachments) ? plan.attachments : []),
  ];
  const matches =
    Number(plan?.version) === DRIVE_ARCHIVE_VERSION &&
    plan?.submissionId === submissionId &&
    plan?.parentFolderId === parentFolderId &&
    (
      plan?.formType === formType ||
      (formType === "inscripcion" && !plan?.formType)
    ) &&
    plan?.folder?.name === createSubmissionFolderName(submissionId, formType) &&
    DRIVE_ID_PATTERN.test(String(plan?.folder?.id ?? "")) &&
    plannedFiles.length === descriptors.length &&
    plannedFiles.every((file, index) => {
      const descriptor = descriptors[index];
      return (
        DRIVE_ID_PATTERN.test(String(file?.id ?? "")) &&
        file?.kind === descriptor.kind &&
        file?.slot === descriptor.slot &&
        file?.key === descriptor.key &&
        Number(file?.size) === descriptor.size &&
        file?.mimeType === descriptor.mimeType &&
        file?.sha256 === descriptor.sha256
      );
    });
  if (!matches) throw new DrivePayloadConflictError(submissionId);
}

export function createInscripcionDriveStore({
  driveClient,
  folderId = process.env.GOOGLE_DRIVE_INSCRIPCION_FOLDER_ID,
  sharedDriveId = process.env.GOOGLE_DRIVE_INSCRIPCION_SHARED_DRIVE_ID,
  formType = "inscripcion",
  environment = process.env,
  authFactory = () => createEnvironmentDriveAuth({ environment }),
  requireSharedDrive,
  readinessClock = () => Date.now(),
  readinessTtlMs = 30_000,
  wait = defaultWait,
  retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
} = {}) {
  if (typeof readinessClock !== "function" || typeof wait !== "function") {
    throw new TypeError("La configuración temporal de Google Drive no es válida.");
  }
  if (!Number.isFinite(readinessTtlMs) || readinessTtlMs < 0) {
    throw new TypeError("readinessTtlMs debe ser un número no negativo.");
  }
  if (typeof authFactory !== "function") {
    throw new TypeError("authFactory debe ser una función válida.");
  }
  const retryDelays = normalizeRetryDelays(retryDelaysMs);
  const normalizedFormType = normalizeFormType(formType);
  const normalizedFolderId = cleanDriveText(folderId);
  const normalizedSharedDriveId = cleanDriveText(sharedDriveId);
  const oauthConfigured = Boolean(cleanDriveText(environment.GOOGLE_DRIVE_REFRESH_TOKEN));
  const sharedDriveRequired = requireSharedDrive ?? !oauthConfigured;
  let client = driveClient;
  let readyPromise;
  let readyExpiresAt = 0;

  function readinessTime() {
    const currentTime = Number(readinessClock());
    if (!Number.isFinite(currentTime)) {
      throw new TypeError("readinessClock debe devolver una fecha válida.");
    }
    return currentTime;
  }

  function prepareRuntime() {
    const parentId = normalizeDriveFolderId(normalizedFolderId);
    if (sharedDriveRequired && !normalizedSharedDriveId) {
      throw new GoogleDriveConfigurationError(
        normalizedFormType === "inscripcion"
          ? "Falta la variable GOOGLE_DRIVE_INSCRIPCION_SHARED_DRIVE_ID."
          : "Falta el identificador de la unidad compartida de Google Drive.",
      );
    }
    if (normalizedSharedDriveId) normalizeDriveFolderId(normalizedSharedDriveId);
    if (!client) {
      const { auth } = authFactory();
      client = createGoogleDriveClient({ auth });
    }
    return parentId;
  }

  async function listAllPermissions(parentId) {
    const permissions = [];
    const seenPageTokens = new Set();
    let pageToken;
    do {
      const response = await client.permissions.list({
        fileId: parentId,
        supportsAllDrives: true,
        pageSize: 100,
        ...(pageToken ? { pageToken } : {}),
        fields: "nextPageToken,permissions(id,type,role,allowFileDiscovery,deleted)",
      });
      permissions.push(...(response.data.permissions || []));
      const nextPageToken = cleanDriveText(response.data.nextPageToken);
      if (!nextPageToken) break;
      if (seenPageTokens.has(nextPageToken)) {
        throw new GoogleDriveConfigurationError(
          "Google Drive ha devuelto una paginación de permisos no válida.",
        );
      }
      seenPageTokens.add(nextPageToken);
      pageToken = nextPageToken;
    } while (pageToken);
    return permissions;
  }

  async function validateParentFolder(parentId) {
    const [folderResponse, permissions] = await Promise.all([
      client.files.get({
        fileId: parentId,
        supportsAllDrives: true,
        fields: "id,name,mimeType,trashed,driveId,capabilities(canAddChildren)",
      }),
      listAllPermissions(parentId),
    ]);
    const folder = folderResponse.data || {};
    if (
      folder.mimeType !== GOOGLE_DRIVE_FOLDER_MIME_TYPE ||
      folder.trashed ||
      folder.capabilities?.canAddChildren !== true
    ) {
      throw new GoogleDriveConfigurationError(
        "La carpeta de Google Drive no permite guardar formularios.",
      );
    }
    if (sharedDriveRequired && !folder.driveId) {
      throw new GoogleDriveConfigurationError(
        "La carpeta de Google Drive debe pertenecer a una unidad compartida.",
      );
    }
    if (
      normalizedSharedDriveId &&
      normalizeDriveFolderId(normalizedSharedDriveId) !== cleanDriveText(folder.driveId)
    ) {
      throw new GoogleDriveConfigurationError(
        "La carpeta de Google Drive no pertenece a la unidad compartida configurada.",
      );
    }
    const broadPermission = permissions.find(
      (permission) =>
        !permission?.deleted && ["anyone", "domain"].includes(permission?.type),
    );
    if (broadPermission) {
      throw new GoogleDriveSecurityError(
        "La carpeta de Google Drive no puede tener acceso público ni para todo un dominio.",
      );
    }
    return {
      id: parentId,
      name: cleanDriveText(folder.name),
      driveId: cleanDriveText(folder.driveId),
    };
  }

  function ensureReady() {
    const currentTime = readinessTime();
    if (!readyPromise || currentTime >= readyExpiresAt) {
      readyExpiresAt = Number.POSITIVE_INFINITY;
      readyPromise = Promise.resolve()
        .then(prepareRuntime)
        .then(validateParentFolder)
        .then((result) => {
          readyExpiresAt = readinessTime() + readinessTtlMs;
          return result;
        })
        .catch((error) => {
          readyPromise = undefined;
          readyExpiresAt = 0;
          throw error;
        });
    }
    return readyPromise;
  }

  async function generateIds(count) {
    const response = await client.files.generateIds({ count, space: "drive", type: "files" });
    const ids = response.data.ids || [];
    if (ids.length !== count || ids.some((id) => !DRIVE_ID_PATTERN.test(String(id)))) {
      throw new GoogleDriveConfigurationError(
        "Google Drive no ha reservado todos los identificadores necesarios.",
      );
    }
    return ids;
  }

  async function planArchive({ payload, snapshot, uploadedFiles = [] } = {}) {
    const submissionId = normalizeSubmissionId(payload?.submissionId);
    const parent = await ensureReady();
    const descriptors = createArchiveDescriptors(payload, snapshot, uploadedFiles);
    const [folderFileId, ...fileIds] = await generateIds(descriptors.length + 1);
    const plannedFiles = descriptors.map((descriptor, index) => plannedFile(descriptor, fileIds[index]));
    return {
      version: DRIVE_ARCHIVE_VERSION,
      submissionId,
      formType: normalizedFormType,
      parentFolderId: parent.id,
      folder: {
        id: folderFileId,
        name: createSubmissionFolderName(submissionId, normalizedFormType),
        url: driveFolderUrl(folderFileId),
      },
      snapshot: plannedFiles.find((file) => file.kind === "snapshot") || null,
      attachments: plannedFiles
        .filter((file) => file.kind === "attachment")
        .sort((left, right) => left.index - right.index),
    };
  }

  async function getFileIfCreated(fileId, { folder = false } = {}) {
    try {
      const response = await client.files.get({
        fileId,
        supportsAllDrives: true,
        fields: FILE_FIELDS,
      });
      return normalizeDriveFile(response.data, { folder });
    } catch (error) {
      if (driveErrorStatus(error) === 404) return null;
      throw error;
    }
  }

  function verifyCreatedFile(actual, planned, parentId, submissionId, { folder = false } = {}) {
    const expectedKind = folder
      ? `${normalizedFormType}_folder`
      : `${normalizedFormType}_file`;
    const matches =
      actual?.id === planned?.id &&
      actual?.trashed !== true &&
      actual?.mimeType === (folder ? GOOGLE_DRIVE_FOLDER_MIME_TYPE : planned?.mimeType) &&
      actual?.parents?.includes(parentId) &&
      actual?.appProperties?.[SUBMISSION_PROPERTY] === submissionId &&
      actual?.appProperties?.[KIND_PROPERTY] === expectedKind &&
      (
        actual?.appProperties?.[FORM_TYPE_PROPERTY] === normalizedFormType ||
        (normalizedFormType === "inscripcion" && !actual?.appProperties?.[FORM_TYPE_PROPERTY])
      ) &&
      (folder || actual?.appProperties?.[SLOT_PROPERTY] === planned?.slot) &&
      (folder || !Number.isFinite(actual?.size) || actual.size === Number(planned?.size)) &&
      (folder || !actual?.sha256 || actual.sha256 === planned?.sha256);
    if (!matches) throw new DrivePayloadConflictError(submissionId);
    return { ...planned, ...actual };
  }

  async function createWithRetry({ planned, parentId, submissionId, descriptor, folder = false }) {
    let lastError;
    for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
      try {
        const response = await client.files.create({
          supportsAllDrives: true,
          ignoreDefaultVisibility: true,
          fields: FILE_FIELDS,
          ...(folder || descriptor.size <= RESUMABLE_UPLOAD_THRESHOLD_BYTES
            ? {}
            : { uploadType: "resumable" }),
          requestBody: {
            id: planned.id,
            name: planned.name,
            mimeType: folder ? GOOGLE_DRIVE_FOLDER_MIME_TYPE : undefined,
            parents: [parentId],
            appProperties: {
              [SUBMISSION_PROPERTY]: submissionId,
              [KIND_PROPERTY]: folder
                ? `${normalizedFormType}_folder`
                : `${normalizedFormType}_file`,
              [FORM_TYPE_PROPERTY]: normalizedFormType,
              ...(!folder
                ? {
                    [SLOT_PROPERTY]: planned.slot,
                    loesport_field_key: planned.key,
                    loesport_sha256: planned.sha256,
                  }
                : {}),
            },
          },
          ...(!folder
            ? {
                media: {
                  mimeType: descriptor.mimeType,
                  body: Readable.from([descriptor.buffer]),
                },
              }
            : {}),
        });
        return verifyCreatedFile(
          normalizeDriveFile(response.data, { folder }),
          planned,
          parentId,
          submissionId,
          { folder },
        );
      } catch (error) {
        lastError = error;
        const existing = await getFileIfCreated(planned.id, { folder }).catch(() => null);
        if (existing) {
          return verifyCreatedFile(existing, planned, parentId, submissionId, { folder });
        }
        if (attempt >= retryDelays.length || !isRetryableDriveError(error)) throw error;
        await wait(retryDelays[attempt]);
      }
    }
    throw lastError;
  }

  async function reconcileArchive({ plan, payload, snapshot, uploadedFiles = [] } = {}) {
    const submissionId = normalizeSubmissionId(payload?.submissionId);
    const parent = await ensureReady();
    const descriptors = createArchiveDescriptors(payload, snapshot, uploadedFiles);
    assertPlanMatches(plan, submissionId, parent.id, descriptors, normalizedFormType);

    const folder = await createWithRetry({
      planned: plan.folder,
      parentId: parent.id,
      submissionId,
      descriptor: {},
      folder: true,
    });
    const plannedFiles = [
      ...(plan.snapshot ? [plan.snapshot] : []),
      ...plan.attachments,
    ];
    const archivedFiles = await Promise.all(
      plannedFiles.map((planned, index) =>
        createWithRetry({
          planned,
          parentId: folder.id,
          submissionId,
          descriptor: descriptors[index],
        }),
      ),
    );
    return {
      ...plan,
      folder: { id: folder.id, name: folder.name || plan.folder.name, url: folder.url },
      snapshot: archivedFiles.find((file) => file.kind === "snapshot") || null,
      attachments: archivedFiles
        .filter((file) => file.kind === "attachment")
        .sort((left, right) => left.index - right.index),
    };
  }

  return Object.freeze({
    configured: Boolean(
      normalizedFolderId && (!sharedDriveRequired || normalizedSharedDriveId),
    ),
    folderId: normalizedFolderId,
    sharedDriveId: normalizedSharedDriveId,
    formType: normalizedFormType,
    authMode: oauthConfigured ? "oauth" : "adc",
    ensureReady,
    planArchive,
    reconcileArchive,
  });
}

export function createPreinscripcionDriveStore({
  environment = process.env,
  folderId =
    environment.GOOGLE_DRIVE_PREINSCRIPCION_FOLDER_ID ||
    environment.GOOGLE_DRIVE_FORMS_FOLDER_ID ||
    environment.GOOGLE_DRIVE_INSCRIPCION_FOLDER_ID,
  sharedDriveId =
    environment.GOOGLE_DRIVE_PREINSCRIPCION_SHARED_DRIVE_ID ||
    environment.GOOGLE_DRIVE_FORMS_SHARED_DRIVE_ID ||
    environment.GOOGLE_DRIVE_INSCRIPCION_SHARED_DRIVE_ID,
  ...options
} = {}) {
  return createInscripcionDriveStore({
    ...options,
    environment,
    folderId,
    sharedDriveId,
    formType: "preinscripcion",
  });
}
