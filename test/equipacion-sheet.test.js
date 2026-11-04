import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_EQUIPACION_SHEET_NAME,
  DEFAULT_EQUIPACION_SYSTEM_SHEET_NAME,
  EQUIPACION_PUBLIC_COLUMNS,
  EQUIPACION_PUBLIC_HEADERS,
  EQUIPACION_SHEET_COLUMNS,
  EQUIPACION_SHEET_HEADERS,
  buildEquipacionPublicRow,
  buildEquipacionRecord,
  createEquipacionSheetStore,
  equipacionRecordToSheetRow,
} from "../server/equipacion-sheet.js";

const SUBMISSION_ID = "123e4567-e89b-42d3-a456-426614174000";

function equipacionPayload(overrides = {}) {
  return {
    submissionId: SUBMISSION_ID,
    type: "equipacion",
    title: "Solicitud de equipación",
    answers: [
      { key: "contact_full_name", value: "Ada Lovelace" },
      { key: "contact_email", value: "ada@example.com" },
      { key: "contact_phone", value: "600000000" },
      { key: "order_items", value: "1. Camiseta: Talla M · 2 ud. · 30,00 €" },
      { key: "order_total", value: "30,00 €" },
      { key: "comments", value: "Sin respuesta" },
      { key: "privacy_consent", value: "Aceptado" },
    ],
    attachments: [],
    pageUrl: "https://loesport.es/equipamiento",
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
      id: "equipmentFolder12345",
      name: `equipacion-${SUBMISSION_ID}`,
      url: "https://drive.google.test/folders/equipmentFolder12345",
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
      id: "equipmentSnapshot12345",
      url: "https://drive.google.test/files/equipmentSnapshot12345",
    },
    attachments: [],
  };
}

test("define una vista de equipación y una pestaña técnica separada", () => {
  assert.equal(DEFAULT_EQUIPACION_SHEET_NAME, "Equipament");
  assert.equal(DEFAULT_EQUIPACION_SYSTEM_SHEET_NAME, "_Equipament sistema");
  assert.equal(EQUIPACION_SHEET_COLUMNS.length, 27);
  assert.equal(EQUIPACION_PUBLIC_COLUMNS.length, 10);
  assert.equal(EQUIPACION_SHEET_HEADERS[0], "ID de envío");
  assert.equal(EQUIPACION_PUBLIC_HEADERS[0], "Fecha y hora de recepción");
  assert.equal(EQUIPACION_PUBLIC_HEADERS.at(-2), "Captura en Drive");
  assert.equal(EQUIPACION_PUBLIC_HEADERS.at(-1), "Carpeta en Drive");
});

test("mapea el pedido completo y publica los enlaces privados", () => {
  const archive = driveArchive();
  const record = buildEquipacionRecord({
    payload: equipacionPayload({
      answers: [
        ...equipacionPayload().answers,
        { key: "future_field", value: "Dato futuro" },
      ],
    }),
    receivedAt: "2026-11-04T15:31:00.000Z",
    driveArchive: archive,
  });

  assert.equal(record.contact_full_name, "Ada Lovelace");
  assert.match(record.order_items, /Camiseta/);
  assert.equal(record.order_total, "30,00 €");
  assert.match(record.unmapped_answers, /future_field/);
  assert.equal(equipacionRecordToSheetRow(record).length, EQUIPACION_SHEET_COLUMNS.length);

  const publicRow = buildEquipacionPublicRow(record);
  assert.equal(publicRow[0], "04/11/2026 16:31:00");
  assert.equal(publicRow.at(-2), archive.snapshot.url);
  assert.equal(publicRow.at(-1), archive.folder.url);
});

test("exige el spreadsheet independiente configurado para equipación", async () => {
  const missing = createEquipacionSheetStore({ spreadsheetId: "", sheetsClient: {} });
  assert.equal(missing.configured, false);
  await assert.rejects(
    missing.ensureReady(),
    /Falta la variable GOOGLE_SHEETS_EQUIPACION_SPREADSHEET_ID/,
  );

  const configured = createEquipacionSheetStore({
    spreadsheetId: "equipacion-spreadsheet-test",
    sheetName: "  Equipament 26-27  ",
    systemSheetName: "  _Sistema equipament  ",
    sheetsClient: {},
  });
  assert.equal(configured.configured, true);
  assert.equal(configured.spreadsheetId, "equipacion-spreadsheet-test");
  assert.equal(configured.sheetName, "Equipament 26-27");
  assert.equal(configured.systemSheetName, "_Sistema equipament");
});
