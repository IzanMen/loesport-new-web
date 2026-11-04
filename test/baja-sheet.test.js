import assert from "node:assert/strict";
import test from "node:test";

import {
  BAJA_PUBLIC_COLUMNS,
  BAJA_PUBLIC_HEADERS,
  BAJA_SHEET_COLUMNS,
  BAJA_SHEET_HEADERS,
  DEFAULT_BAJA_SHEET_NAME,
  DEFAULT_BAJA_SYSTEM_SHEET_NAME,
  bajaRecordToSheetRow,
  buildBajaPublicRow,
  buildBajaRecord,
  createBajaSheetStore,
} from "../server/baja-sheet.js";

const SUBMISSION_ID = "123e4567-e89b-42d3-a456-426614174000";

function bajaPayload(overrides = {}) {
  return {
    submissionId: SUBMISSION_ID,
    type: "baja",
    title: "Solicitud de baja",
    answers: [
      { key: "participant_residence_city", value: "Alaior" },
      { key: "participant_full_name", value: "Ada Lovelace" },
      { key: "participant_birth_date", value: "10/12/2010" },
      { key: "withdrawal_reason", value: "Cambio de horarios" },
      { key: "privacy_consent", value: "ACEPTO" },
      { key: "terms_consent", value: "ACEPTO" },
    ],
    attachments: [],
    pageUrl: "https://loesport.es/baja",
    submittedAt: "2026-11-04T15:30:00.000Z",
    ...overrides,
  };
}

function driveArchive() {
  return {
    version: 1,
    submissionId: SUBMISSION_ID,
    parentFolderId: "parentFolder12345",
    folder: {
      id: "bajaFolder12345",
      name: `baja-${SUBMISSION_ID}`,
      url: "https://drive.google.test/folders/bajaFolder12345",
    },
    snapshot: {
      kind: "snapshot",
      slot: "snapshot",
      key: "snapshot",
      label: "Captura del formulario",
      name: "00-captura.jpg",
      mimeType: "image/jpeg",
      size: 4,
      sha256: "a".repeat(64),
      id: "bajaSnapshot12345",
      url: "https://drive.google.test/files/bajaSnapshot12345",
    },
    attachments: [],
  };
}

test("define una vista de bajas y una pestaña técnica separada", () => {
  assert.equal(DEFAULT_BAJA_SHEET_NAME, "Baixes");
  assert.equal(DEFAULT_BAJA_SYSTEM_SHEET_NAME, "_Baixes sistema");
  assert.equal(BAJA_SHEET_COLUMNS.length, 26);
  assert.equal(BAJA_PUBLIC_COLUMNS.length, 9);
  assert.equal(BAJA_SHEET_HEADERS[0], "ID de envío");
  assert.equal(BAJA_PUBLIC_HEADERS[0], "Fecha y hora de recepción");
  assert.equal(BAJA_PUBLIC_HEADERS.at(-2), "Captura en Drive");
  assert.equal(BAJA_PUBLIC_HEADERS.at(-1), "Carpeta en Drive");
});

test("mapea la baja, conserva claves antiguas y publica los enlaces privados", () => {
  const payload = bajaPayload({
    answers: [
      ...bajaPayload().answers.filter(({ key }) => key !== "participant_full_name"),
      { key: "entry_43453506", value: "Grace Hopper" },
      { key: "future_field", value: "Dato futuro" },
    ],
  });
  const archive = driveArchive();
  const record = buildBajaRecord({
    payload,
    receivedAt: "2026-11-04T15:31:00.000Z",
    driveArchive: archive,
  });

  assert.equal(record.participant_full_name, "Grace Hopper");
  assert.equal(record.withdrawal_reason, "Cambio de horarios");
  assert.equal(record.drive_status, "stored");
  assert.match(record.unmapped_answers, /future_field/);
  assert.equal(bajaRecordToSheetRow(record).length, BAJA_SHEET_COLUMNS.length);

  const publicRow = buildBajaPublicRow(record);
  assert.equal(publicRow[0], "04/11/2026 16:31:00");
  assert.equal(publicRow.at(-2), archive.snapshot.url);
  assert.equal(publicRow.at(-1), archive.folder.url);
});

test("exige el spreadsheet independiente configurado para las bajas", async () => {
  const missing = createBajaSheetStore({ spreadsheetId: "", sheetsClient: {} });
  assert.equal(missing.configured, false);
  await assert.rejects(
    missing.ensureReady(),
    /Falta la variable GOOGLE_SHEETS_BAJA_SPREADSHEET_ID/,
  );

  const configured = createBajaSheetStore({
    spreadsheetId: "baja-spreadsheet-test",
    sheetName: "  Baixes 26-27  ",
    systemSheetName: "  _Sistema baixes  ",
    sheetsClient: {},
  });
  assert.equal(configured.configured, true);
  assert.equal(configured.spreadsheetId, "baja-spreadsheet-test");
  assert.equal(configured.sheetName, "Baixes 26-27");
  assert.equal(configured.systemSheetName, "_Sistema baixes");
});
