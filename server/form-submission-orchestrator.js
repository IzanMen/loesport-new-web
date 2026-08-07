import {
  createPayloadFingerprint,
  createInscripcionSheetStore,
  isDuplicateSubmissionRecord,
  normalizeSubmissionId,
  parseDriveManifest,
} from "./inscripcion-sheet.js";
import { createInscripcionDriveStore } from "./inscripcion-drive.js";
import { summarizeError } from "./error-summary.js";

export class SubmissionFingerprintConflictError extends Error {
  constructor(submissionId) {
    super("El identificador del envío ya existe con datos diferentes.");
    this.name = "SubmissionFingerprintConflictError";
    this.code = "SUBMISSION_FINGERPRINT_CONFLICT";
    this.status = 409;
    this.expose = true;
    this.submissionId = submissionId;
  }
}

export class SubmissionInProgressError extends Error {
  constructor(submissionId, retryAfterMs = 120_000) {
    super("Este envío todavía se está procesando. Inténtalo de nuevo en unos instantes.");
    this.name = "SubmissionInProgressError";
    this.code = "SUBMISSION_IN_PROGRESS";
    this.status = 409;
    this.expose = true;
    this.submissionId = submissionId;
    this.retryAfterMs = retryAfterMs;
  }
}

export class SubmissionStateError extends Error {
  constructor(submissionId, status) {
    super("El estado del envío en Google Sheets no es válido.");
    this.name = "SubmissionStateError";
    this.code = "SUBMISSION_STATE_INVALID";
    this.status = 503;
    this.expose = true;
    this.submissionId = submissionId;
    this.submissionStatus = status;
  }
}

const MAX_STATE_UPDATE_ATTEMPTS = 3;
export const DEFAULT_STATE_UPDATE_RETRY_DELAYS_MS = Object.freeze([100, 300]);

function defaultWait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function sheetErrorStatus(error) {
  const candidates = [error?.response?.status, error?.status, error?.code];
  for (const candidate of candidates) {
    const status = Number(candidate);
    if (Number.isInteger(status) && status >= 100 && status <= 599) return status;
  }
  return null;
}

export function isRetryableSheetStateError(error) {
  if (error?.code === "SUBMISSION_FINGERPRINT_CONFLICT") return false;
  const status = sheetErrorStatus(error);
  if (status === null) return true;
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function normalizeRetryDelays(delays) {
  if (!Array.isArray(delays)) {
    throw new TypeError("stateUpdateRetryDelaysMs debe ser un array válido.");
  }
  return delays.slice(0, MAX_STATE_UPDATE_ATTEMPTS - 1).map((delay) => {
    const milliseconds = Number(delay);
    if (!Number.isFinite(milliseconds) || milliseconds < 0) {
      throw new TypeError("Los tiempos de reintento deben ser números no negativos.");
    }
    return milliseconds;
  });
}

export async function retrySheetStateUpdate(
  operation,
  {
    wait = defaultWait,
    retryDelaysMs = DEFAULT_STATE_UPDATE_RETRY_DELAYS_MS,
    shouldRetry = isRetryableSheetStateError,
  } = {},
) {
  if (typeof operation !== "function" || typeof wait !== "function" || typeof shouldRetry !== "function") {
    throw new TypeError("La configuración de reintentos de Google Sheets no es válida.");
  }
  const delays = normalizeRetryDelays(retryDelaysMs);
  let lastError;
  const attempts = Math.min(MAX_STATE_UPDATE_ATTEMPTS, delays.length + 1);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !shouldRetry(error)) throw error;
      try {
        await wait(delays[attempt - 1]);
      } catch {
        throw lastError;
      }
    }
  }
  throw lastError;
}

export function createKeyedSerialExecutor() {
  const tails = new Map();

  return async function runSerially(key, operation) {
    const previous = tails.get(key) || Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    tails.set(key, current);

    try {
      return await current;
    } finally {
      if (tails.get(key) === current) tails.delete(key);
    }
  };
}

function gmailMessageId(emailResult) {
  return String(emailResult?.gmailMessageId ?? emailResult?.id ?? "");
}

function duplicateResult(submissionId, existing) {
  return {
    submissionId,
    gmailMessageId: existing?.record?.gmail_message_id || "",
    emailStatus: existing?.record?.email_status || "pending",
    sheetStored: true,
    driveStored: String(existing?.record?.drive_status ?? "").trim().toLowerCase() === "stored",
    deduplicated: true,
  };
}

function assertMatchingFingerprint(submissionId, existing, expectedFingerprint) {
  const storedFingerprint = String(existing?.record?.payload_fingerprint || "");
  if (storedFingerprint && storedFingerprint !== expectedFingerprint) {
    throw new SubmissionFingerprintConflictError(submissionId);
  }
}

function normalizedEmailStatus(existing) {
  return String(existing?.record?.email_status ?? "").trim().toLowerCase();
}

function normalizedDriveStatus(existing) {
  return String(existing?.record?.drive_status ?? "").trim().toLowerCase();
}

function pendingRetryDelay(existing, now, pendingRetryAfterMs) {
  const receivedAt = Date.parse(String(existing?.record?.server_received_at ?? ""));
  const currentTime = Number(now());
  if (!Number.isFinite(receivedAt) || !Number.isFinite(currentTime)) return null;
  return receivedAt + pendingRetryAfterMs - currentTime;
}

export function createFormSubmissionOrchestrator({
  sendEmail,
  sheetStore = createInscripcionSheetStore(),
  driveStore = createInscripcionDriveStore(),
  logger = console,
  now = () => Date.now(),
  pendingRetryAfterMs = 120_000,
  wait = defaultWait,
  stateUpdateRetryDelaysMs = DEFAULT_STATE_UPDATE_RETRY_DELAYS_MS,
  retryDelaysMs,
} = {}) {
  if (typeof sendEmail !== "function") {
    throw new TypeError("createFormSubmissionOrchestrator necesita la función sendEmail.");
  }
  if (typeof now !== "function") {
    throw new TypeError("createFormSubmissionOrchestrator necesita una función now válida.");
  }
  if (!Number.isFinite(pendingRetryAfterMs) || pendingRetryAfterMs < 0) {
    throw new TypeError("pendingRetryAfterMs debe ser un número no negativo.");
  }
  if (typeof wait !== "function") {
    throw new TypeError("createFormSubmissionOrchestrator necesita una función wait válida.");
  }
  if (
    !driveStore ||
    typeof driveStore.ensureReady !== "function" ||
    typeof driveStore.planArchive !== "function" ||
    typeof driveStore.reconcileArchive !== "function"
  ) {
    throw new TypeError("createFormSubmissionOrchestrator necesita un almacén de Google Drive válido.");
  }
  const retryDelays = normalizeRetryDelays(
    retryDelaysMs ?? stateUpdateRetryDelaysMs,
  );
  const runSerially = createKeyedSerialExecutor();

  function updateSheetState(operation) {
    return retrySheetStateUpdate(operation, {
      wait,
      retryDelaysMs: retryDelays,
    });
  }

  async function canonicalForStateUpdate(payload, payloadFingerprint) {
    const canonical = await sheetStore.findBySubmissionId(payload.submissionId);
    if (!canonical) throw new SubmissionStateError(payload.submissionId, "missing");
    assertMatchingFingerprint(payload.submissionId, canonical, payloadFingerprint);
    return canonical;
  }

  async function markCanonicalSent(payload, payloadFingerprint, messageId) {
    const canonical = await canonicalForStateUpdate(payload, payloadFingerprint);
    const status = normalizedEmailStatus(canonical);
    if (status === "sent") return;
    if (isDuplicateSubmissionRecord(canonical.record)) {
      throw new SubmissionStateError(payload.submissionId, "duplicate");
    }
    if (status !== "pending" && status !== "error") {
      throw new SubmissionStateError(payload.submissionId, status);
    }
    await sheetStore.markSent(canonical.rowNumber, messageId, payload.submissionId);
  }

  async function markCanonicalError(payload, payloadFingerprint, emailError) {
    const canonical = await canonicalForStateUpdate(payload, payloadFingerprint);
    const status = normalizedEmailStatus(canonical);
    if (status === "sent") return;
    if (isDuplicateSubmissionRecord(canonical.record)) {
      throw new SubmissionStateError(payload.submissionId, "duplicate");
    }
    if (status !== "pending" && status !== "error") {
      throw new SubmissionStateError(payload.submissionId, status);
    }
    await sheetStore.markError(canonical.rowNumber, emailError, payload.submissionId);
  }

  async function markCanonicalDriveStored(payload, payloadFingerprint, archive) {
    const canonical = await canonicalForStateUpdate(payload, payloadFingerprint);
    if (normalizedEmailStatus(canonical) === "sent") return;
    if (isDuplicateSubmissionRecord(canonical.record)) {
      throw new SubmissionStateError(payload.submissionId, "duplicate");
    }
    const status = normalizedDriveStatus(canonical);
    if (status === "stored") return;
    if (status && !["pending", "planned", "error"].includes(status)) {
      throw new SubmissionStateError(payload.submissionId, `drive_${status}`);
    }
    await sheetStore.markDriveStored(canonical.rowNumber, archive, payload.submissionId);
  }

  async function markCanonicalDriveError(payload, payloadFingerprint, driveError) {
    const canonical = await canonicalForStateUpdate(payload, payloadFingerprint);
    if (normalizedEmailStatus(canonical) === "sent") return;
    if (isDuplicateSubmissionRecord(canonical.record)) {
      throw new SubmissionStateError(payload.submissionId, "duplicate");
    }
    const status = normalizedDriveStatus(canonical);
    if (status === "stored") return;
    if (status && !["pending", "planned", "error"].includes(status)) {
      throw new SubmissionStateError(payload.submissionId, `drive_${status}`);
    }
    await sheetStore.markDriveError(canonical.rowNumber, driveError, payload.submissionId);
  }

  async function markCanonicalDrivePlanned(payload, payloadFingerprint, plan) {
    const canonical = await canonicalForStateUpdate(payload, payloadFingerprint);
    if (normalizedEmailStatus(canonical) === "sent") return;
    if (isDuplicateSubmissionRecord(canonical.record)) {
      throw new SubmissionStateError(payload.submissionId, "duplicate");
    }
    const status = normalizedDriveStatus(canonical);
    if (status === "stored") return;
    if (status && !["pending", "planned", "error"].includes(status)) {
      throw new SubmissionStateError(payload.submissionId, `drive_${status}`);
    }
    await sheetStore.markDrivePlanned(canonical.rowNumber, plan, payload.submissionId);
  }

  function driveReferencesComplete(existing) {
    const record = existing?.record || {};
    const baseReferencesComplete = [
      record.drive_folder_id,
      record.drive_folder_url,
      record.drive_files_manifest,
    ].every((value) => String(value ?? "").trim());
    if (!baseReferencesComplete) return false;
    const manifest = parseDriveManifest(record.drive_files_manifest);
    if (!manifest) return false;
    if (!manifest.snapshot) return true;
    return [record.snapshot_drive_file_id, record.snapshot_drive_url].every((value) =>
      String(value ?? "").trim(),
    );
  }

  async function ensureDriveArchived({
    existing,
    payload,
    payloadFingerprint,
    snapshot,
    uploadedFiles,
  }) {
    const currentStatus = normalizedDriveStatus(existing);
    if (currentStatus === "stored") {
      if (!driveReferencesComplete(existing)) {
        throw new SubmissionStateError(payload.submissionId, "drive_stored_incomplete");
      }
      const storedPlan = parseDriveManifest(existing?.record?.drive_files_manifest);
      if (!storedPlan) {
        throw new SubmissionStateError(payload.submissionId, "drive_manifest_invalid");
      }
      const archive = await driveStore.reconcileArchive({
        plan: storedPlan,
        payload,
        snapshot,
        uploadedFiles,
      });
      return { recovered: true, archive };
    }
    if (currentStatus && !["pending", "planned", "error"].includes(currentStatus)) {
      throw new SubmissionStateError(payload.submissionId, `drive_${currentStatus}`);
    }

    let plan = parseDriveManifest(existing?.record?.drive_files_manifest);
    if (!plan) {
      try {
        plan = await driveStore.planArchive({ payload, snapshot, uploadedFiles });
        await updateSheetState(() =>
          markCanonicalDrivePlanned(payload, payloadFingerprint, plan),
        );
      } catch (planningError) {
        try {
          await updateSheetState(() =>
            markCanonicalDriveError(payload, payloadFingerprint, planningError),
          );
        } catch (sheetError) {
          logger.error?.("No se ha podido registrar el error al preparar Google Drive.", {
            submissionId: payload.submissionId,
            error: summarizeError(sheetError),
          });
        }
        throw planningError;
      }
    }

    const plannedCanonical = await canonicalForStateUpdate(payload, payloadFingerprint);
    if (
      normalizedDriveStatus(plannedCanonical) === "stored" &&
      driveReferencesComplete(plannedCanonical)
    ) {
      return { recovered: false };
    }
    const persistedPlan = parseDriveManifest(plannedCanonical?.record?.drive_files_manifest);
    if (persistedPlan) plan = persistedPlan;

    let archive;
    try {
      archive = await driveStore.reconcileArchive({
        plan,
        payload,
        snapshot,
        uploadedFiles,
      });
    } catch (driveError) {
      try {
        await updateSheetState(() =>
          markCanonicalDriveError(payload, payloadFingerprint, driveError),
        );
      } catch (sheetError) {
        logger.error?.("No se ha podido registrar el error de Google Drive en Google Sheets.", {
          submissionId: payload.submissionId,
          error: summarizeError(sheetError),
        });
      }
      throw driveError;
    }

    try {
      await updateSheetState(() =>
        markCanonicalDriveStored(payload, payloadFingerprint, archive),
      );
    } catch (sheetError) {
      const recovered = await canonicalForStateUpdate(payload, payloadFingerprint).catch(() => null);
      if (normalizedDriveStatus(recovered) === "stored" && driveReferencesComplete(recovered)) {
        return { recovered: true, archive };
      }
      const persistenceError = Object.assign(
        new Error("Las referencias de Google Drive no se han guardado en la hoja."),
        { code: "DRIVE_REFERENCES_NOT_STORED" },
      );
      try {
        await updateSheetState(() =>
          markCanonicalDriveError(payload, payloadFingerprint, persistenceError),
        );
      } catch (stateError) {
        logger.error?.("No se ha podido registrar el fallo al guardar los enlaces de Drive.", {
          submissionId: payload.submissionId,
          error: summarizeError(stateError),
        });
      }
      throw sheetError;
    }
    return { recovered: true, archive };
  }

  async function sendAndRecordEmail({
    payload,
    payloadFingerprint,
    snapshot,
    uploadedFiles,
  }) {
    let emailResult;
    try {
      emailResult = await sendEmail(payload, snapshot, uploadedFiles);
    } catch (emailError) {
      try {
        await updateSheetState(() =>
          markCanonicalError(payload, payloadFingerprint, emailError),
        );
      } catch (sheetError) {
        logger.error?.("No se ha podido marcar el error de Gmail en Google Sheets.", {
          submissionId: payload.submissionId,
          error: summarizeError(sheetError),
        });
      }
      throw emailError;
    }

    const messageId = gmailMessageId(emailResult);
    let sheetStatusUpdateFailed = false;
    try {
      await updateSheetState(() =>
        markCanonicalSent(payload, payloadFingerprint, messageId),
      );
    } catch (sheetError) {
      // El correo ya salió. Devolver un error induciría un reintento y podría duplicarlo.
      sheetStatusUpdateFailed = true;
      logger.error?.("El correo se ha enviado, pero no se ha podido marcar como enviado en Google Sheets.", {
        submissionId: payload.submissionId,
        error: summarizeError(sheetError),
      });
    }

    return {
      ...emailResult,
      submissionId: payload.submissionId,
      gmailMessageId: messageId,
      emailStatus: sheetStatusUpdateFailed ? "pending" : "sent",
      sheetStored: true,
      driveStored: true,
      deduplicated: false,
      sheetStatusUpdateFailed,
    };
  }

  async function processExistingSubmission({
    existing,
    payload,
    payloadFingerprint,
    snapshot,
    uploadedFiles,
    fresh = false,
  }) {
    const status = normalizedEmailStatus(existing);
    if (status === "sent") return duplicateResult(payload.submissionId, existing);
    if (isDuplicateSubmissionRecord(existing.record)) {
      throw new SubmissionStateError(payload.submissionId, "duplicate");
    }

    if (status !== "pending" && status !== "error") {
      throw new SubmissionStateError(payload.submissionId, status);
    }

    const driveStatus = normalizedDriveStatus(existing);
    if (status === "pending" && !fresh && driveStatus !== "error") {
      const retryDelay = pendingRetryDelay(existing, now, pendingRetryAfterMs);
      if (retryDelay === null) {
        throw new SubmissionStateError(payload.submissionId, status);
      }
      if (retryDelay > 0) {
        throw new SubmissionInProgressError(
          payload.submissionId,
          retryDelay,
        );
      }
    }

    await ensureDriveArchived({
      existing,
      payload,
      payloadFingerprint,
      snapshot,
      uploadedFiles,
    });
    return sendAndRecordEmail({
      payload,
      payloadFingerprint,
      snapshot,
      uploadedFiles,
    });
  }

  async function submitInscripcion(payload, snapshot, uploadedFiles) {
    const submissionId = normalizeSubmissionId(payload?.submissionId);
    const normalizedPayload = { ...payload, submissionId };
    const payloadFingerprint = createPayloadFingerprint(normalizedPayload);

    return runSerially(submissionId, async () => {
      const existing = await sheetStore.findBySubmissionId(submissionId);
      assertMatchingFingerprint(submissionId, existing, payloadFingerprint);
      if (existing) {
        return processExistingSubmission({
          existing,
          payload: normalizedPayload,
          payloadFingerprint,
          snapshot,
          uploadedFiles,
        });
      }

      await driveStore.ensureReady();

      const appended = await sheetStore.appendPending({
        payload: normalizedPayload,
        submissionId,
        payloadFingerprint,
      });

      // Un segundo lookup reduce la carrera entre instancias de Cloud Run: solo la
      // primera fila encontrada se considera propietaria del envío de Gmail.
      const owner = await sheetStore.findBySubmissionId(submissionId);
      if (!owner) {
        throw new SubmissionStateError(submissionId, "missing_after_append");
      }
      if (owner && owner.rowNumber !== appended.rowNumber) {
        const duplicateError = Object.assign(
          new Error("Fila duplicada; no se ha reenviado el correo."),
          { code: "DUPLICATE_SUBMISSION" },
        );
        try {
          if (typeof sheetStore.findAllBySubmissionId !== "function") {
            throw new SubmissionStateError(submissionId, "duplicate_row_unverified");
          }
          await updateSheetState(async () => {
            const matchingRows = await sheetStore.findAllBySubmissionId(submissionId);
            const appendedRow = matchingRows.find(
              (row) => row.rowNumber === appended.rowNumber,
            );
            const appendedFingerprint = String(
              appendedRow?.record?.payload_fingerprint ?? "",
            );
            if (!appendedRow || appendedFingerprint !== payloadFingerprint) {
              throw new SubmissionStateError(submissionId, "duplicate_row_unverified");
            }
            const appendedStatus = normalizedEmailStatus(appendedRow);
            if (appendedStatus === "sent" || isDuplicateSubmissionRecord(appendedRow.record)) {
              return;
            }
            if (appendedStatus !== "pending") {
              throw new SubmissionStateError(submissionId, "duplicate_row_not_pending");
            }
            await sheetStore.markError(
              appendedRow.rowNumber,
              duplicateError,
              submissionId,
            );
          });
        } catch (sheetError) {
          logger.error?.("No se ha podido marcar una fila duplicada en Google Sheets.", {
            submissionId,
            error: summarizeError(sheetError),
          });
        }
        assertMatchingFingerprint(submissionId, owner, payloadFingerprint);
        return processExistingSubmission({
          existing: owner,
          payload: normalizedPayload,
          payloadFingerprint,
          snapshot,
          uploadedFiles,
        });
      }

      return processExistingSubmission({
        existing: owner,
        payload: normalizedPayload,
        payloadFingerprint,
        snapshot,
        uploadedFiles,
        fresh: true,
      });
    });
  }

  async function submit(payload, snapshot, uploadedFiles = []) {
    if (payload?.type !== "inscripcion") {
      return sendEmail(payload, snapshot, uploadedFiles);
    }
    return submitInscripcion(payload, snapshot, uploadedFiles);
  }

  return Object.freeze({ submit });
}
