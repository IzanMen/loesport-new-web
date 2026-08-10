import assert from "node:assert/strict";
import test, { mock } from "node:test";

import {
  SubmissionFingerprintConflictError,
  SubmissionInProgressError,
  SubmissionStateError,
  createFormSubmissionOrchestrator as createProductionOrchestrator,
} from "../server/form-submission-orchestrator.js";
import { DrivePayloadConflictError } from "../server/inscripcion-drive.js";
import { createPayloadFingerprint, serializeDriveManifest } from "../server/inscripcion-sheet.js";

const SUBMISSION_ID = "123e4567-e89b-42d3-a456-426614174000";
const SNAPSHOT = { originalname: "captura.jpg" };
const UPLOADED_FILES = [{ originalname: "dni.pdf" }];
const NOW = Date.parse("2026-08-07T12:00:00.000Z");
const RECENT_PENDING_AT = new Date(NOW - 30_000).toISOString();
const STALE_PENDING_AT = new Date(NOW - 120_000).toISOString();

function archiveFor(payload, overrides = {}) {
  const submissionId = payload.submissionId.toLowerCase();
  return {
    version: 1,
    submissionId,
    parentFolderId: "parentFolder12345",
    folder: {
      id: "submissionFolder12345",
      name: `inscripcion-${submissionId}`,
      url: "https://drive.google.test/folders/submissionFolder12345",
    },
    snapshot: {
      kind: "snapshot",
      slot: "snapshot",
      key: "snapshot",
      label: "Captura",
      name: "00-captura.jpg",
      mimeType: "image/jpeg",
      size: 4,
      sha256: "a".repeat(64),
      id: "snapshotFile12345",
      url: "https://drive.google.test/files/snapshotFile12345",
    },
    attachments: (payload.attachments || []).map((attachment, index) => ({
      kind: "attachment",
      slot: `attachment_${index}`,
      index,
      key: attachment.key || `attachment_${index}`,
      label: attachment.label,
      name: `${String(index + 1).padStart(2, "0")}-${attachment.name}`,
      mimeType: "application/pdf",
      size: 4,
      sha256: "b".repeat(64),
      id: `attachmentFile${String(index).padStart(5, "0")}`,
      url: `https://drive.google.test/files/attachmentFile${String(index).padStart(5, "0")}`,
    })),
    ...overrides,
  };
}

function archiveRecord(archive, status = "stored") {
  return {
    drive_status: status,
    drive_error: "",
    drive_folder_id: archive.folder.id,
    drive_folder_url: archive.folder.url,
    snapshot_drive_file_id: archive.snapshot?.id || "",
    snapshot_drive_url: archive.snapshot?.url || "",
    drive_files_manifest: serializeDriveManifest(archive),
  };
}

function statefulDriveStore({
  events = [],
  ensureError,
  planError,
  reconcileError,
  reconcileFailures,
  archive,
} = {}) {
  let currentPlan = archive || null;
  let reconcileAttempt = 0;
  const ensureReady = mock.fn(async () => {
    events.push("drive-ready");
    if (ensureError) throw ensureError;
    return { id: "parentFolder12345" };
  });
  const planArchive = mock.fn(async ({ payload, snapshot }) => {
    events.push("drive-plan");
    if (planError) throw planError;
    currentPlan ||= archiveFor(payload, snapshot ? {} : { snapshot: null });
    return currentPlan;
  });
  const reconcileArchive = mock.fn(async ({ plan }) => {
    events.push("drive-upload");
    reconcileAttempt += 1;
    const failures = reconcileFailures ?? (reconcileError ? Infinity : 0);
    if (reconcileAttempt <= failures) throw reconcileError;
    currentPlan = plan;
    return plan;
  });
  return {
    store: { ensureReady, planArchive, reconcileArchive },
    ensureReady,
    planArchive,
    reconcileArchive,
    plan: () => currentPlan,
  };
}

function createFormSubmissionOrchestrator(options = {}) {
  const drive = statefulDriveStore();
  return createProductionOrchestrator({
    driveStore: drive.store,
    ...options,
  });
}

function registrationPayload(overrides = {}) {
  return {
    submissionId: SUBMISSION_ID,
    type: "inscripcion",
    title: "Inscripción",
    answers: [
      {
        key: "participant_full_name",
        section: "Datos del participante",
        label: "Nombre y apellidos",
        value: "Ada Lovelace",
      },
    ],
    attachments: [{ index: 0, label: "DNI", name: "dni.pdf" }],
    pageUrl: "https://loesport.es/inscripcion",
    submittedAt: "2026-08-07T10:20:30.000Z",
    ...overrides,
  };
}

function existingSubmission(
  payload,
  {
    rowNumber = 42,
    status = "pending",
    gmailMessageId = "",
    serverReceivedAt = RECENT_PENDING_AT,
    driveStatus = "stored",
    driveArchive = archiveFor(payload),
  } = {},
) {
  return {
    rowNumber,
    record: {
      submission_id: payload.submissionId.toLowerCase(),
      payload_fingerprint: createPayloadFingerprint(payload),
      email_status: status,
      gmail_message_id: gmailMessageId,
      email_error: "",
      server_received_at: serverReceivedAt,
      ...archiveRecord(driveArchive, driveStatus),
    },
  };
}

function statefulSheetStore({
  existing = null,
  rowNumber = 42,
  findError,
  appendError,
  markSentError,
  markSentFailures,
  markErrorError,
  markErrorFailures,
  markDrivePlannedError,
  markDrivePlannedFailures,
  markDriveStoredError,
  markDriveStoredFailures,
  markDriveErrorError,
  markDriveErrorFailures,
  events = [],
} = {}) {
  let current = existing;
  let markSentAttempt = 0;
  let markErrorAttempt = 0;
  let markDrivePlannedAttempt = 0;
  let markDriveStoredAttempt = 0;
  let markDriveErrorAttempt = 0;
  const sentFailures = markSentFailures ?? (markSentError ? Infinity : 0);
  const errorFailures = markErrorFailures ?? (markErrorError ? Infinity : 0);

  const findBySubmissionId = mock.fn(async () => {
    events.push("find");
    if (findError) throw findError;
    return current;
  });
  const appendPending = mock.fn(async ({ payload, submissionId, payloadFingerprint }) => {
    events.push("append");
    if (appendError) throw appendError;
    current = {
      rowNumber,
      record: {
        submission_id: submissionId,
        payload_fingerprint: payloadFingerprint,
        email_status: "pending",
        gmail_message_id: "",
        email_error: "",
        server_received_at: new Date(NOW).toISOString(),
        drive_status: "pending",
        drive_error: "",
        drive_folder_id: "",
        drive_folder_url: "",
        snapshot_drive_file_id: "",
        snapshot_drive_url: "",
        drive_files_manifest: "",
      },
    };
    return { rowNumber, record: current.record, payload };
  });
  const markSent = mock.fn(async (targetRow, gmailMessageId) => {
    events.push("sent");
    markSentAttempt += 1;
    if (markSentAttempt <= sentFailures) throw markSentError;
    assert.equal(targetRow, current.rowNumber);
    current.record.email_status = "sent";
    current.record.gmail_message_id = gmailMessageId;
    current.record.email_error = "";
  });
  const markError = mock.fn(async (targetRow, error) => {
    events.push("error");
    markErrorAttempt += 1;
    if (markErrorAttempt <= errorFailures) throw markErrorError;
    assert.equal(targetRow, current.rowNumber);
    current.record.email_status = "error";
    current.record.gmail_message_id = "";
    current.record.email_error = String(error?.message || error);
  });
  const markDrivePlanned = mock.fn(async (targetRow, archive, expectedSubmissionId) => {
    events.push("drive-planned");
    markDrivePlannedAttempt += 1;
    const failures = markDrivePlannedFailures ?? (markDrivePlannedError ? Infinity : 0);
    if (markDrivePlannedAttempt <= failures) throw markDrivePlannedError;
    assert.equal(targetRow, current.rowNumber);
    assert.equal(expectedSubmissionId, current.record.submission_id);
    Object.assign(current.record, archiveRecord(archive, "planned"));
  });
  const markDriveStored = mock.fn(async (targetRow, archive, expectedSubmissionId) => {
    events.push("drive-stored");
    markDriveStoredAttempt += 1;
    const failures = markDriveStoredFailures ?? (markDriveStoredError ? Infinity : 0);
    if (markDriveStoredAttempt <= failures) throw markDriveStoredError;
    assert.equal(targetRow, current.rowNumber);
    assert.equal(expectedSubmissionId, current.record.submission_id);
    Object.assign(current.record, archiveRecord(archive, "stored"));
  });
  const markDriveError = mock.fn(async (targetRow, error, expectedSubmissionId) => {
    events.push("drive-error");
    markDriveErrorAttempt += 1;
    const failures = markDriveErrorFailures ?? (markDriveErrorError ? Infinity : 0);
    if (markDriveErrorAttempt <= failures) throw markDriveErrorError;
    assert.equal(targetRow, current.rowNumber);
    assert.equal(expectedSubmissionId, current.record.submission_id);
    current.record.drive_status = "error";
    current.record.drive_error = String(error?.message || error);
  });

  return {
    store: {
      findBySubmissionId,
      appendPending,
      markDrivePlanned,
      markDriveStored,
      markDriveError,
      markSent,
      markError,
    },
    findBySubmissionId,
    appendPending,
    markSent,
    markError,
    markDrivePlanned,
    markDriveStored,
    markDriveError,
    current: () => current,
  };
}

test("una inscripción nueva sigue find → append pending → find owner → Gmail → sent", async () => {
  const events = [];
  const sheets = statefulSheetStore({ events });
  const drive = statefulDriveStore({ events });
  const sendEmail = mock.fn(async (payload, snapshot, uploadedFiles) => {
    events.push("email");
    assert.equal(payload.submissionId, SUBMISSION_ID);
    assert.equal(snapshot, SNAPSHOT);
    assert.equal(uploadedFiles, UPLOADED_FILES);
    return { gmailMessageId: "gmail-new" };
  });
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    driveStore: drive.store,
  });

  const result = await orchestrator.submit(
    registrationPayload({ submissionId: SUBMISSION_ID.toUpperCase() }),
    SNAPSHOT,
    UPLOADED_FILES,
  );

  assert.deepEqual(events, [
    "find",
    "drive-ready",
    "append",
    "find",
    "drive-plan",
    "find",
    "drive-planned",
    "find",
    "drive-upload",
    "find",
    "drive-stored",
    "email",
    "find",
    "sent",
  ]);
  assert.equal(sheets.appendPending.mock.callCount(), 1);
  assert.equal(drive.planArchive.mock.calls[0].arguments[0].snapshot, SNAPSHOT);
  assert.equal(drive.planArchive.mock.calls[0].arguments[0].uploadedFiles, UPLOADED_FILES);
  assert.equal(drive.reconcileArchive.mock.calls[0].arguments[0].snapshot, SNAPSHOT);
  assert.equal(drive.reconcileArchive.mock.calls[0].arguments[0].uploadedFiles, UPLOADED_FILES);
  assert.equal(sendEmail.mock.callCount(), 1);
  assert.equal(sheets.markSent.mock.callCount(), 1);
  assert.equal(sheets.current().record.email_status, "sent");
  assert.deepEqual(result, {
    gmailMessageId: "gmail-new",
    submissionId: SUBMISSION_ID,
    emailStatus: "sent",
    sheetStored: true,
    driveStored: true,
    deduplicated: false,
    sheetStatusUpdateFailed: false,
  });
});

test("una inscripción sin captura guarda los adjuntos y envía el correo", async () => {
  const sheets = statefulSheetStore();
  const drive = statefulDriveStore();
  const sendEmail = mock.fn(async (_payload, snapshot, uploadedFiles) => {
    assert.equal(snapshot, null);
    assert.equal(uploadedFiles, UPLOADED_FILES);
    return { gmailMessageId: "gmail-without-snapshot" };
  });
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    driveStore: drive.store,
  });

  const result = await orchestrator.submit(registrationPayload(), null, UPLOADED_FILES);

  assert.equal(result.emailStatus, "sent");
  assert.equal(result.driveStored, true);
  assert.equal(drive.plan().snapshot, null);
  assert.equal(drive.plan().attachments.length, 1);
  assert.equal(sheets.current().record.snapshot_drive_file_id, "");
  assert.equal(sheets.current().record.snapshot_drive_url, "");
  assert.equal(sendEmail.mock.callCount(), 1);
});

test("un retry con el mismo UUID y fingerprint no añade fila ni reenvía si ya está sent", async () => {
  const payload = registrationPayload();
  const sheets = statefulSheetStore();
  const drive = statefulDriveStore();
  const sendEmail = mock.fn(async () => ({ gmailMessageId: "gmail-first" }));
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    driveStore: drive.store,
  });

  const first = await orchestrator.submit(payload, SNAPSHOT, UPLOADED_FILES);
  const retry = await orchestrator.submit(
    { ...payload, submittedAt: "2026-08-08T09:00:00.000Z" },
    SNAPSHOT,
    UPLOADED_FILES,
  );

  assert.equal(first.deduplicated, false);
  assert.equal(retry.deduplicated, true);
  assert.equal(retry.emailStatus, "sent");
  assert.equal(retry.gmailMessageId, "gmail-first");
  assert.equal(sendEmail.mock.callCount(), 1);
  assert.equal(sheets.appendPending.mock.callCount(), 1);
  assert.equal(sheets.markSent.mock.callCount(), 1);
  assert.equal(drive.planArchive.mock.callCount(), 1);
  assert.equal(drive.reconcileArchive.mock.callCount(), 1);
});

test("dos envíos concurrentes del mismo UUID se serializan dentro de la instancia", async () => {
  const payload = registrationPayload();
  const sheets = statefulSheetStore();
  const sendEmail = mock.fn(async () => {
    await Promise.resolve();
    return { gmailMessageId: "gmail-once" };
  });
  const orchestrator = createFormSubmissionOrchestrator({ sendEmail, sheetStore: sheets.store });

  const [first, second] = await Promise.all([
    orchestrator.submit(payload, SNAPSHOT, UPLOADED_FILES),
    orchestrator.submit(payload, SNAPSHOT, UPLOADED_FILES),
  ]);

  assert.equal(first.deduplicated, false);
  assert.equal(second.deduplicated, true);
  assert.equal(sendEmail.mock.callCount(), 1);
  assert.equal(sheets.appendPending.mock.callCount(), 1);
});

test("una fila sent con fingerprint igual se trata como éxito deduplicado", async () => {
  const payload = registrationPayload();
  const sheets = statefulSheetStore({
    existing: existingSubmission(payload, {
      status: "sent",
      gmailMessageId: "gmail-existing",
    }),
  });
  const drive = statefulDriveStore();
  const sendEmail = mock.fn();
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    driveStore: drive.store,
  });

  const result = await orchestrator.submit(payload, SNAPSHOT, UPLOADED_FILES);

  assert.deepEqual(result, {
    submissionId: SUBMISSION_ID,
    gmailMessageId: "gmail-existing",
    emailStatus: "sent",
    sheetStored: true,
    driveStored: true,
    deduplicated: true,
  });
  assert.equal(sendEmail.mock.callCount(), 0);
  assert.equal(sheets.appendPending.mock.callCount(), 0);
  assert.equal(sheets.markSent.mock.callCount(), 0);
  assert.equal(drive.ensureReady.mock.callCount(), 0);
  assert.equal(drive.planArchive.mock.callCount(), 0);
  assert.equal(drive.reconcileArchive.mock.callCount(), 0);
});

test("el mismo UUID con fingerprint distinto produce conflicto 409 sin correo", async () => {
  const original = registrationPayload();
  const changed = registrationPayload({
    answers: [{ ...original.answers[0], value: "Alan Turing" }],
  });
  const sheets = statefulSheetStore({
    existing: existingSubmission(original, { status: "sent", gmailMessageId: "gmail-existing" }),
  });
  const drive = statefulDriveStore();
  const sendEmail = mock.fn();
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    driveStore: drive.store,
  });

  await assert.rejects(
    () => orchestrator.submit(changed, SNAPSHOT, UPLOADED_FILES),
    (error) => {
      assert.equal(error instanceof SubmissionFingerprintConflictError, true);
      assert.equal(error.status, 409);
      assert.equal(error.code, "SUBMISSION_FINGERPRINT_CONFLICT");
      assert.equal(error.submissionId, SUBMISSION_ID);
      return true;
    },
  );
  assert.equal(sendEmail.mock.callCount(), 0);
  assert.equal(sheets.appendPending.mock.callCount(), 0);
  assert.equal(drive.ensureReady.mock.callCount(), 0);
  assert.equal(drive.planArchive.mock.callCount(), 0);
});

test("una fila error con fingerprint igual reintenta Gmail sobre la misma fila", async () => {
  const payload = registrationPayload();
  const sheets = statefulSheetStore({
    existing: existingSubmission(payload, { rowNumber: 55, status: "error" }),
  });
  const sendEmail = mock.fn(async () => ({ id: "gmail-retried" }));
  const orchestrator = createFormSubmissionOrchestrator({ sendEmail, sheetStore: sheets.store });

  const result = await orchestrator.submit(payload, SNAPSHOT, UPLOADED_FILES);

  assert.equal(result.deduplicated, false);
  assert.equal(result.gmailMessageId, "gmail-retried");
  assert.equal(result.emailStatus, "sent");
  assert.equal(sheets.appendPending.mock.callCount(), 0);
  assert.equal(sendEmail.mock.callCount(), 1);
  assert.deepEqual(sheets.markSent.mock.calls[0].arguments, [55, "gmail-retried", SUBMISSION_ID]);
});

test("una fila pending reciente devuelve InProgress 409 y no envía Gmail", async () => {
  const payload = registrationPayload();
  const sheets = statefulSheetStore({
    existing: existingSubmission(payload, {
      rowNumber: 56,
      status: "pending",
      serverReceivedAt: RECENT_PENDING_AT,
    }),
  });
  const sendEmail = mock.fn();
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    now: () => NOW,
  });

  await assert.rejects(
    () => orchestrator.submit(payload, SNAPSHOT, UPLOADED_FILES),
    (error) => {
      assert.equal(error instanceof SubmissionInProgressError, true);
      assert.equal(error.status, 409);
      assert.equal(error.code, "SUBMISSION_IN_PROGRESS");
      assert.equal(error.submissionId, SUBMISSION_ID);
      assert.equal(error.retryAfterMs, 90_000);
      return true;
    },
  );

  assert.equal(sendEmail.mock.callCount(), 0);
  assert.equal(sheets.appendPending.mock.callCount(), 0);
  assert.equal(sheets.markSent.mock.callCount(), 0);
  assert.equal(sheets.markError.mock.callCount(), 0);
});

test("una fila pending de al menos 120 segundos reintenta Gmail en la misma fila", async () => {
  const payload = registrationPayload();
  const sheets = statefulSheetStore({
    existing: existingSubmission(payload, {
      rowNumber: 57,
      status: "pending",
      serverReceivedAt: STALE_PENDING_AT,
    }),
  });
  const sendEmail = mock.fn(async () => ({ gmailMessageId: "gmail-recovered" }));
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    now: () => NOW,
  });

  const result = await orchestrator.submit(payload, SNAPSHOT, UPLOADED_FILES);

  assert.equal(result.deduplicated, false);
  assert.equal(result.emailStatus, "sent");
  assert.equal(result.gmailMessageId, "gmail-recovered");
  assert.equal(sendEmail.mock.callCount(), 1);
  assert.equal(sheets.appendPending.mock.callCount(), 0);
  assert.deepEqual(sheets.markSent.mock.calls[0].arguments, [57, "gmail-recovered", SUBMISSION_ID]);
});

test("una fila pending con timestamp inválido devuelve SubmissionStateError", async () => {
  const payload = registrationPayload();
  const sheets = statefulSheetStore({
    existing: existingSubmission(payload, {
      rowNumber: 58,
      status: "pending",
      serverReceivedAt: "fecha-no-válida",
    }),
  });
  const sendEmail = mock.fn();
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    now: () => NOW,
  });

  await assert.rejects(
    () => orchestrator.submit(payload, SNAPSHOT, UPLOADED_FILES),
    (error) => {
      assert.equal(error instanceof SubmissionStateError, true);
      assert.equal(error.status, 503);
      assert.equal(error.code, "SUBMISSION_STATE_INVALID");
      assert.equal(error.submissionStatus, "pending");
      return true;
    },
  );
  assert.equal(sendEmail.mock.callCount(), 0);
  assert.equal(sheets.markSent.mock.callCount(), 0);
  assert.equal(sheets.markError.mock.callCount(), 0);
});

test("un estado desconocido devuelve SubmissionStateError 503 sin Gmail", async () => {
  const payload = registrationPayload();
  const sheets = statefulSheetStore({
    existing: existingSubmission(payload, { rowNumber: 59, status: " PROCESSING " }),
  });
  const sendEmail = mock.fn();
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    now: () => NOW,
  });

  await assert.rejects(
    () => orchestrator.submit(payload, SNAPSHOT, UPLOADED_FILES),
    (error) => {
      assert.equal(error instanceof SubmissionStateError, true);
      assert.equal(error.status, 503);
      assert.equal(error.code, "SUBMISSION_STATE_INVALID");
      assert.equal(error.submissionId, SUBMISSION_ID);
      assert.equal(error.submissionStatus, "processing");
      return true;
    },
  );
  assert.equal(sendEmail.mock.callCount(), 0);
  assert.equal(sheets.appendPending.mock.callCount(), 0);
  assert.equal(sheets.markSent.mock.callCount(), 0);
  assert.equal(sheets.markError.mock.callCount(), 0);
});

test("un fallo de Sheets antes de Gmail impide enviar el correo", async (t) => {
  await t.test("fallo buscando UUID", async () => {
    const sheetError = new Error("Sheets get falló");
    const sheets = statefulSheetStore({ findError: sheetError });
    const sendEmail = mock.fn();
    const orchestrator = createFormSubmissionOrchestrator({ sendEmail, sheetStore: sheets.store });

    await assert.rejects(
      () => orchestrator.submit(registrationPayload(), SNAPSHOT, UPLOADED_FILES),
      (error) => error === sheetError,
    );
    assert.equal(sendEmail.mock.callCount(), 0);
    assert.equal(sheets.appendPending.mock.callCount(), 0);
  });

  await t.test("fallo añadiendo pending", async () => {
    const sheetError = new Error("Sheets append falló");
    const sheets = statefulSheetStore({ appendError: sheetError });
    const sendEmail = mock.fn();
    const orchestrator = createFormSubmissionOrchestrator({ sendEmail, sheetStore: sheets.store });

    await assert.rejects(
      () => orchestrator.submit(registrationPayload(), SNAPSHOT, UPLOADED_FILES),
      (error) => error === sheetError,
    );
    assert.equal(sendEmail.mock.callCount(), 0);
    assert.equal(sheets.appendPending.mock.callCount(), 1);
  });
});

test("un fallo de Gmail marca error y conserva el error original", async () => {
  const emailError = Object.assign(new Error("Gmail no disponible"), { code: "GMAIL_DOWN" });
  const sheets = statefulSheetStore();
  const sendEmail = mock.fn(async () => {
    throw emailError;
  });
  const orchestrator = createFormSubmissionOrchestrator({ sendEmail, sheetStore: sheets.store });

  await assert.rejects(
    () => orchestrator.submit(registrationPayload(), SNAPSHOT, UPLOADED_FILES),
    (error) => error === emailError,
  );

  assert.equal(sheets.appendPending.mock.callCount(), 1);
  assert.equal(sheets.markError.mock.callCount(), 1);
  assert.equal(sheets.current().record.email_status, "error");
  assert.equal(sheets.current().record.email_error, "Gmail no disponible");
});

test("markError reintenta hasta tres veces y conserva el error original de Gmail", async () => {
  const emailError = new Error("Gmail falló");
  const transientSheetError = new Error("Sheets temporal");
  const sheets = statefulSheetStore({
    markErrorError: transientSheetError,
    markErrorFailures: 2,
  });
  const sendEmail = mock.fn(async () => {
    throw emailError;
  });
  const logger = { error: mock.fn() };
  const wait = mock.fn(async () => undefined);
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    logger,
    wait,
  });

  await assert.rejects(
    () => orchestrator.submit(registrationPayload(), SNAPSHOT, UPLOADED_FILES),
    (error) => error === emailError,
  );

  assert.equal(sheets.markError.mock.callCount(), 3);
  assert.equal(sheets.current().record.email_status, "error");
  assert.equal(sheets.current().record.email_error, "Gmail falló");
  assert.equal(logger.error.mock.callCount(), 0);
  assert.deepEqual(wait.mock.calls.map(({ arguments: [delay] }) => delay), [100, 300]);
});

test("si markError falla tres veces se registra ese fallo y se devuelve el de Gmail", async () => {
  const emailError = new Error("Gmail falló");
  const sheetError = new Error("No se pudo marcar error");
  const sheets = statefulSheetStore({ markErrorError: sheetError });
  const sendEmail = mock.fn(async () => {
    throw emailError;
  });
  const logger = { error: mock.fn() };
  const wait = mock.fn(async () => undefined);
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    logger,
    wait,
  });

  await assert.rejects(
    () => orchestrator.submit(registrationPayload(), SNAPSHOT, UPLOADED_FILES),
    (error) => error === emailError,
  );
  assert.equal(sheets.markError.mock.callCount(), 3);
  assert.equal(logger.error.mock.callCount(), 1);
  assert.deepEqual(logger.error.mock.calls[0].arguments[1].error, {
    name: "Error",
    message: "No se pudo marcar error",
  });
  assert.deepEqual(wait.mock.calls.map(({ arguments: [delay] }) => delay), [100, 300]);
});

test("markSent reintenta hasta tres veces y termina en sent si el tercero funciona", async () => {
  const transientSheetError = new Error("Sheets temporal");
  const sheets = statefulSheetStore({
    markSentError: transientSheetError,
    markSentFailures: 2,
  });
  const sendEmail = mock.fn(async () => ({ gmailMessageId: "gmail-delivered" }));
  const logger = { error: mock.fn() };
  const wait = mock.fn(async () => undefined);
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    logger,
    wait,
  });

  const result = await orchestrator.submit(registrationPayload(), SNAPSHOT, UPLOADED_FILES);

  assert.equal(sheets.markSent.mock.callCount(), 3);
  assert.equal(sheets.current().record.email_status, "sent");
  assert.equal(result.emailStatus, "sent");
  assert.equal(result.sheetStatusUpdateFailed, false);
  assert.equal(logger.error.mock.callCount(), 0);
  assert.deepEqual(wait.mock.calls.map(({ arguments: [delay] }) => delay), [100, 300]);
});

test("si Gmail salió pero markSent falla tres veces devuelve éxito no reintentable y lo registra", async () => {
  const sheetError = new Error("No se pudo marcar sent");
  const sheets = statefulSheetStore({ markSentError: sheetError });
  const sendEmail = mock.fn(async () => ({ gmailMessageId: "gmail-delivered" }));
  const logger = { error: mock.fn() };
  const wait = mock.fn(async () => undefined);
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    logger,
    wait,
  });

  const result = await orchestrator.submit(registrationPayload(), SNAPSHOT, UPLOADED_FILES);

  assert.equal(result.gmailMessageId, "gmail-delivered");
  assert.equal(result.emailStatus, "pending");
  assert.equal(result.sheetStored, true);
  assert.equal(result.sheetStatusUpdateFailed, true);
  assert.equal(sheets.markSent.mock.callCount(), 3);
  assert.equal(logger.error.mock.callCount(), 1);
  assert.deepEqual(logger.error.mock.calls[0].arguments[1].error, {
    name: "Error",
    message: "No se pudo marcar sent",
  });
  assert.deepEqual(wait.mock.calls.map(({ arguments: [delay] }) => delay), [100, 300]);
});

test("un fallo al validar Drive ocurre antes de crear la fila y bloquea Gmail", async () => {
  const driveError = Object.assign(new Error("Parent Drive inválido"), {
    code: "GOOGLE_DRIVE_FOLDER_NOT_PRIVATE",
  });
  const sheets = statefulSheetStore();
  const drive = statefulDriveStore({ ensureError: driveError });
  const sendEmail = mock.fn();
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    driveStore: drive.store,
  });

  await assert.rejects(
    () => orchestrator.submit(registrationPayload(), SNAPSHOT, UPLOADED_FILES),
    (error) => error === driveError,
  );
  assert.equal(drive.ensureReady.mock.callCount(), 1);
  assert.equal(drive.planArchive.mock.callCount(), 0);
  assert.equal(sheets.appendPending.mock.callCount(), 0);
  assert.equal(sendEmail.mock.callCount(), 0);
});

test("si no se puede persistir el plan, no crea archivos ni envía Gmail", async () => {
  const sheetError = Object.assign(new Error("Sheets plan temporal"), { status: 503 });
  const sheets = statefulSheetStore({ markDrivePlannedError: sheetError });
  const drive = statefulDriveStore();
  const sendEmail = mock.fn();
  const wait = mock.fn(async () => undefined);
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    driveStore: drive.store,
    wait,
  });

  await assert.rejects(
    () => orchestrator.submit(registrationPayload(), SNAPSHOT, UPLOADED_FILES),
    (error) => error === sheetError,
  );
  assert.equal(drive.planArchive.mock.callCount(), 1);
  assert.equal(sheets.markDrivePlanned.mock.callCount(), 3);
  assert.equal(drive.reconcileArchive.mock.callCount(), 0);
  assert.equal(sheets.markDriveError.mock.callCount(), 1);
  assert.equal(sheets.current().record.drive_status, "error");
  assert.equal(sendEmail.mock.callCount(), 0);
  assert.deepEqual(wait.mock.calls.map(({ arguments: [delay] }) => delay), [100, 300]);
});

test("un fallo Drive parcial conserva el plan y el retry reanuda sin generar IDs nuevos", async () => {
  const driveError = Object.assign(new Error("fallo parcial Drive"), { response: { status: 503 } });
  const sheets = statefulSheetStore();
  const drive = statefulDriveStore({ reconcileError: driveError, reconcileFailures: 1 });
  const sendEmail = mock.fn(async () => ({ gmailMessageId: "gmail-after-drive-retry" }));
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    driveStore: drive.store,
  });
  const payload = registrationPayload();

  await assert.rejects(
    () => orchestrator.submit(payload, SNAPSHOT, UPLOADED_FILES),
    (error) => error === driveError,
  );
  assert.equal(sheets.current().record.drive_status, "error");
  assert.notEqual(sheets.current().record.drive_files_manifest, "");
  assert.equal(sendEmail.mock.callCount(), 0);

  const result = await orchestrator.submit(payload, SNAPSHOT, UPLOADED_FILES);
  assert.equal(result.driveStored, true);
  assert.equal(result.emailStatus, "sent");
  assert.equal(drive.planArchive.mock.callCount(), 1);
  assert.equal(drive.reconcileArchive.mock.callCount(), 2);
  assert.equal(sheets.appendPending.mock.callCount(), 1);
  assert.equal(sendEmail.mock.callCount(), 1);
});

test("si falla Sheets después de subir, no manda Gmail y el retry reutiliza el plan", async () => {
  const sheetError = Object.assign(new Error("no se guardaron referencias"), { status: 503 });
  const sheets = statefulSheetStore({
    markDriveStoredError: sheetError,
    markDriveStoredFailures: 3,
  });
  const drive = statefulDriveStore();
  const sendEmail = mock.fn(async () => ({ gmailMessageId: "gmail-after-sheet-retry" }));
  const wait = mock.fn(async () => undefined);
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    driveStore: drive.store,
    wait,
  });
  const payload = registrationPayload();

  await assert.rejects(
    () => orchestrator.submit(payload, SNAPSHOT, UPLOADED_FILES),
    (error) => error === sheetError,
  );
  assert.equal(sendEmail.mock.callCount(), 0);
  assert.equal(sheets.current().record.drive_status, "error");

  const result = await orchestrator.submit(payload, SNAPSHOT, UPLOADED_FILES);
  assert.equal(result.driveStored, true);
  assert.equal(drive.planArchive.mock.callCount(), 1);
  assert.equal(drive.reconcileArchive.mock.callCount(), 2);
  assert.equal(sheets.markDriveStored.mock.callCount(), 4);
  assert.equal(sendEmail.mock.callCount(), 1);
});

test("recupera una respuesta perdida de markDriveStored mediante relectura antes de Gmail", async () => {
  const sheetError = Object.assign(new Error("respuesta perdida"), { status: 503 });
  const sheets = statefulSheetStore();
  const drive = statefulDriveStore();
  const lostResponse = mock.fn(async (rowNumber, archive, expectedSubmissionId) => {
    assert.equal(rowNumber, 42);
    assert.equal(expectedSubmissionId, SUBMISSION_ID);
    Object.assign(sheets.current().record, archiveRecord(archive, "stored"));
    throw sheetError;
  });
  sheets.store.markDriveStored = lostResponse;
  const sendEmail = mock.fn(async () => ({ gmailMessageId: "gmail-recovered" }));
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    driveStore: drive.store,
    stateUpdateRetryDelaysMs: [],
  });

  const result = await orchestrator.submit(registrationPayload(), SNAPSHOT, UPLOADED_FILES);
  assert.equal(result.emailStatus, "sent");
  assert.equal(result.driveStored, true);
  assert.equal(lostResponse.mock.callCount(), 1);
  assert.equal(sendEmail.mock.callCount(), 1);
});

test("un fallo Gmail posterior a Drive revalida el archivo almacenado antes de reintentar el correo", async () => {
  const gmailError = new Error("Gmail temporal");
  const sheets = statefulSheetStore();
  const drive = statefulDriveStore();
  let emailAttempt = 0;
  const sendEmail = mock.fn(async () => {
    emailAttempt += 1;
    if (emailAttempt === 1) throw gmailError;
    return { gmailMessageId: "gmail-second" };
  });
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    driveStore: drive.store,
  });
  const payload = registrationPayload();

  await assert.rejects(
    () => orchestrator.submit(payload, SNAPSHOT, UPLOADED_FILES),
    (error) => error === gmailError,
  );
  assert.equal(sheets.current().record.drive_status, "stored");
  assert.equal(sheets.current().record.email_status, "error");

  const result = await orchestrator.submit(payload, SNAPSHOT, UPLOADED_FILES);
  assert.equal(result.gmailMessageId, "gmail-second");
  assert.equal(drive.planArchive.mock.callCount(), 1);
  assert.equal(drive.reconcileArchive.mock.callCount(), 2);
  assert.equal(sendEmail.mock.callCount(), 2);
});

test("un reintento con binarios distintos de los ya almacenados no llega a Gmail", async () => {
  const payload = registrationPayload();
  const conflictError = new DrivePayloadConflictError(SUBMISSION_ID);
  const sheets = statefulSheetStore({
    existing: existingSubmission(payload, { status: "error", driveStatus: "stored" }),
  });
  const drive = statefulDriveStore({ reconcileError: conflictError });
  const sendEmail = mock.fn();
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    driveStore: drive.store,
  });

  await assert.rejects(
    () => orchestrator.submit(payload, SNAPSHOT, UPLOADED_FILES),
    (error) => error === conflictError,
  );
  assert.equal(drive.reconcileArchive.mock.callCount(), 1);
  assert.equal(sendEmail.mock.callCount(), 0);
});

test("un plan con binarios diferentes marca error Drive y nunca llega a Gmail", async () => {
  const conflictError = new DrivePayloadConflictError(SUBMISSION_ID);
  const sheets = statefulSheetStore();
  const drive = statefulDriveStore({ reconcileError: conflictError });
  const sendEmail = mock.fn();
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    driveStore: drive.store,
  });

  await assert.rejects(
    () => orchestrator.submit(registrationPayload(), SNAPSHOT, UPLOADED_FILES),
    (error) => error === conflictError,
  );
  assert.equal(sheets.current().record.drive_status, "error");
  assert.equal(sheets.markDriveError.mock.callCount(), 1);
  assert.equal(sendEmail.mock.callCount(), 0);
});

test("los logs de fallos Drive/Sheets excluyen datos personales y detalles HTTP", async () => {
  const driveError = Object.assign(new Error("DNI 12345678Z IBAN ES9121000418450200051332"), {
    name: "GaxiosError",
    code: "E_DRIVE_UPLOAD",
    response: { status: 503, data: "raw MIME secreto" },
    config: { requestBody: "Content-Type: multipart/mixed; DNI 12345678Z" },
    request: { body: Buffer.from("secreto") },
  });
  const sheetError = Object.assign(new Error("requestBody con DNI 12345678Z"), {
    name: "GaxiosError",
    code: "E_SHEETS_STATE",
    response: { status: 503, data: "IBAN ES9121000418450200051332" },
    config: { requestBody: "raw MIME secreto" },
  });
  const sheets = statefulSheetStore({ markDriveErrorError: sheetError });
  const drive = statefulDriveStore({ reconcileError: driveError });
  const logger = { error: mock.fn() };
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail: mock.fn(),
    sheetStore: sheets.store,
    driveStore: drive.store,
    logger,
    wait: async () => undefined,
  });

  await assert.rejects(
    () => orchestrator.submit(registrationPayload(), SNAPSHOT, UPLOADED_FILES),
    (error) => error === driveError,
  );
  assert.equal(sheets.markDriveError.mock.callCount(), 3);
  assert.equal(logger.error.mock.callCount(), 1);
  assert.deepEqual(logger.error.mock.calls[0].arguments[1].error, {
    name: "GaxiosError",
    code: "E_SHEETS_STATE",
    status: 503,
    message: "External API request failed.",
  });
  const logged = JSON.stringify(logger.error.mock.calls);
  assert.doesNotMatch(
    logged,
    /12345678Z|ES9121000418450200051332|raw MIME secreto|multipart\/mixed|requestBody|Content-Type|secreto/,
  );
});

test("un estado Drive stored incompleto es inválido y no toca Drive ni Gmail", async () => {
  const payload = registrationPayload();
  const existing = existingSubmission(payload, { status: "error", driveStatus: "stored" });
  existing.record.snapshot_drive_url = "";
  const sheets = statefulSheetStore({ existing });
  const drive = statefulDriveStore();
  const sendEmail = mock.fn();
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    driveStore: drive.store,
  });

  await assert.rejects(
    () => orchestrator.submit(payload, SNAPSHOT, UPLOADED_FILES),
    (error) => {
      assert.equal(error instanceof SubmissionStateError, true);
      assert.equal(error.submissionStatus, "drive_stored_incomplete");
      return true;
    },
  );
  assert.equal(drive.planArchive.mock.callCount(), 0);
  assert.equal(drive.reconcileArchive.mock.callCount(), 0);
  assert.equal(sendEmail.mock.callCount(), 0);
});

test("si otra fila reciente gana la carrera, marca la propia duplicada y devuelve InProgress", async () => {
  const payload = registrationPayload();
  const fingerprint = createPayloadFingerprint(payload);
  const owner = {
    rowNumber: 42,
    record: {
      submission_id: SUBMISSION_ID,
      payload_fingerprint: fingerprint,
      email_status: "pending",
      gmail_message_id: "",
      server_received_at: RECENT_PENDING_AT,
    },
  };
  const appendedDuplicate = {
    rowNumber: 43,
    record: {
      submission_id: SUBMISSION_ID,
      payload_fingerprint: fingerprint,
      email_status: "pending",
      gmail_message_id: "",
      email_error: "",
      server_received_at: new Date(NOW).toISOString(),
    },
  };
  let lookup = 0;
  const findBySubmissionId = mock.fn(async () => (++lookup === 1 ? null : owner));
  const appendPending = mock.fn(async () => ({ rowNumber: 43 }));
  const findAllBySubmissionId = mock.fn(async () => [appendedDuplicate, owner]);
  const markError = mock.fn(async () => undefined);
  const markSent = mock.fn();
  const sheetStore = {
    findBySubmissionId,
    findAllBySubmissionId,
    appendPending,
    markError,
    markSent,
  };
  const drive = statefulDriveStore();
  const sendEmail = mock.fn();
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore,
    driveStore: drive.store,
    now: () => NOW,
  });

  await assert.rejects(
    () => orchestrator.submit(payload, SNAPSHOT, UPLOADED_FILES),
    SubmissionInProgressError,
  );

  assert.equal(sendEmail.mock.callCount(), 0);
  assert.equal(markError.mock.callCount(), 1);
  assert.equal(markError.mock.calls[0].arguments[0], 43);
  assert.equal(markError.mock.calls[0].arguments[1].code, "DUPLICATE_SUBMISSION");
  assert.equal(markError.mock.calls[0].arguments[2], SUBMISSION_ID);
  assert.equal(findAllBySubmissionId.mock.callCount(), 1);
  assert.equal(drive.ensureReady.mock.callCount(), 1);
  assert.equal(drive.planArchive.mock.callCount(), 0);
  assert.equal(drive.reconcileArchive.mock.callCount(), 0);
});

test("los tipos excluidos llaman solo a Gmail y nunca consultan Sheets", async (t) => {
  const excludedTypes = [
    "preinscripcion",
    "baja",
    "licencias",
    "newsletter",
    "contacto",
    "socio",
    "patrocinio",
    "equipacion",
  ];

  for (const type of excludedTypes) {
    await t.test(type, async () => {
      const touchedSheets = () => {
        throw new Error("No debería tocar Sheets");
      };
      const sheetStore = {
        findBySubmissionId: mock.fn(touchedSheets),
        appendPending: mock.fn(touchedSheets),
        markSent: mock.fn(touchedSheets),
        markError: mock.fn(touchedSheets),
      };
      const touchedDrive = () => {
        throw new Error("No debería tocar Drive");
      };
      const driveStore = {
        ensureReady: mock.fn(touchedDrive),
        planArchive: mock.fn(touchedDrive),
        reconcileArchive: mock.fn(touchedDrive),
      };
      const expected = { submissionId: SUBMISSION_ID, gmailMessageId: `gmail-${type}` };
      const sendEmail = mock.fn(async () => expected);
      const orchestrator = createFormSubmissionOrchestrator({ sendEmail, sheetStore, driveStore });
      const payload = { ...registrationPayload(), type };

      const result = await orchestrator.submit(payload, SNAPSHOT, UPLOADED_FILES);

      assert.equal(result, expected);
      assert.equal(sendEmail.mock.callCount(), 1);
      assert.equal(sheetStore.findBySubmissionId.mock.callCount(), 0);
      assert.equal(sheetStore.appendPending.mock.callCount(), 0);
      assert.equal(sheetStore.markSent.mock.callCount(), 0);
      assert.equal(sheetStore.markError.mock.callCount(), 0);
      assert.equal(driveStore.ensureReady.mock.callCount(), 0);
      assert.equal(driveStore.planArchive.mock.callCount(), 0);
      assert.equal(driveStore.reconcileArchive.mock.callCount(), 0);
    });
  }
});

test("puede persistir preinscripcion reutilizando el mismo orquestador", async () => {
  const sheets = statefulSheetStore();
  const drive = statefulDriveStore();
  const sendEmail = mock.fn(async () => ({ gmailMessageId: "gmail-prueba" }));
  const orchestrator = createFormSubmissionOrchestrator({
    sendEmail,
    sheetStore: sheets.store,
    driveStore: drive.store,
    persistedFormType: "preinscripcion",
  });
  const payload = registrationPayload({
    type: "preinscripcion",
    title: "Prueba gratuita",
    attachments: [],
    pageUrl: "https://loesport.es/preinscripcion",
  });

  const result = await orchestrator.submit(payload, SNAPSHOT, []);

  assert.equal(result.sheetStored, true);
  assert.equal(result.driveStored, true);
  assert.equal(sheets.appendPending.mock.calls[0].arguments[0].payload.type, "preinscripcion");
  assert.equal(drive.planArchive.mock.callCount(), 1);
  assert.equal(drive.reconcileArchive.mock.callCount(), 1);
  assert.equal(sendEmail.mock.callCount(), 1);
});
