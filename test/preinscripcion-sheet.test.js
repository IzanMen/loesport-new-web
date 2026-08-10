import assert from "node:assert/strict";
import test, { mock } from "node:test";

import {
  DEFAULT_PREINSCRIPCION_SHEET_NAME,
  DEFAULT_PREINSCRIPCION_SYSTEM_SHEET_NAME,
  PREINSCRIPCION_PUBLIC_COLUMNS,
  PREINSCRIPCION_PUBLIC_HEADERS,
  PREINSCRIPCION_SHEET_COLUMNS,
  PREINSCRIPCION_SHEET_HEADERS,
  buildPreinscripcionPublicRow,
  buildPreinscripcionRecord,
  createPreinscripcionSheetStore,
  preinscripcionRecordToSheetRow,
} from "../server/preinscripcion-sheet.js";

const SUBMISSION_ID = "123e4567-e89b-42d3-a456-426614174000";
const SPREADSHEET_ID = "spreadsheet-test";

function trialPayload(overrides = {}) {
  return {
    submissionId: SUBMISSION_ID,
    type: "preinscripcion",
    title: "Prueba gratuita",
    answers: [
      { key: "training_location", section: "Grupo", label: "Sede", value: "Maó" },
      { key: "training_group_id", section: "Grupo", label: "ID", value: "mao-sub-10" },
      { key: "training_group_name", section: "Grupo", label: "Grupo", value: "Sub-10" },
      { key: "training_day_count", section: "Grupo", label: "Días", value: "2" },
      {
        key: "training_selected_days",
        section: "Grupo",
        label: "Días elegidos",
        value: "Lunes | Miércoles",
      },
      {
        key: "participant_full_name",
        section: "Participante",
        label: "Nombre",
        value: "Ada Lovelace",
      },
      {
        key: "participant_residence_city",
        section: "Participante",
        label: "Población",
        value: "Maó",
      },
      {
        key: "participant_birth_date",
        section: "Participante",
        label: "Nacimiento",
        value: "10/12/2017",
      },
      { key: "participant_sex", section: "Participante", label: "Sexo", value: "FEMENINO" },
      { key: "contact_phone", section: "Participante", label: "Teléfono", value: "600123123" },
      { key: "comments", section: "Participante", label: "Observaciones", value: "Ninguna" },
      { key: "trial_commitment", section: "Legal", label: "Compromiso", value: "ACEPTO" },
      { key: "privacy_consent", section: "Legal", label: "Privacidad", value: "ACEPTO" },
      { key: "terms_consent", section: "Legal", label: "Condiciones", value: "ACEPTO" },
    ],
    attachments: [],
    pageUrl: "https://loesport.es/preinscripcion",
    submittedAt: "2026-08-10T10:20:30.000Z",
    ...overrides,
  };
}

function driveArchive() {
  return {
    version: 1,
    submissionId: SUBMISSION_ID,
    parentFolderId: "parentFolder12345",
    folder: {
      id: "trialFolder12345",
      name: `preinscripcion-${SUBMISSION_ID}`,
      url: "https://drive.google.test/folders/trialFolder12345",
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
      id: "trialSnapshot12345",
      url: "https://drive.google.test/files/trialSnapshot12345",
    },
    attachments: [],
  };
}

test("define una vista de prueba mínima y una pestaña técnica separada", () => {
  assert.equal(PREINSCRIPCION_SHEET_COLUMNS.length, 34);
  assert.equal(PREINSCRIPCION_PUBLIC_COLUMNS.length, 16);
  assert.equal(PREINSCRIPCION_SHEET_HEADERS[0], "ID de envío");
  assert.equal(PREINSCRIPCION_PUBLIC_HEADERS[0], "Fecha y hora de recepción");
  assert.equal(PREINSCRIPCION_PUBLIC_HEADERS.at(-2), "Captura en Drive");
  assert.equal(PREINSCRIPCION_PUBLIC_HEADERS.at(-1), "Carpeta en Drive");
});

test("mapea todas las respuestas y conserva compatibilidad con las claves entry antiguas", () => {
  const payload = trialPayload({
    answers: [
      ...trialPayload().answers.filter(({ key }) => key !== "participant_full_name"),
      {
        key: "entry_43453506",
        section: "Participante",
        label: "Nombre y Apellidos",
        value: "Grace Hopper",
      },
      { key: "future_field", section: "Futuro", label: "Campo futuro", value: "Dato" },
    ],
  });
  const record = buildPreinscripcionRecord({
    payload,
    receivedAt: "2026-08-10T10:21:00.000Z",
    driveArchive: driveArchive(),
  });

  assert.equal(record.participant_full_name, "Grace Hopper");
  assert.equal(record.training_group_name, "Sub-10");
  assert.equal(record.drive_status, "stored");
  assert.match(record.unmapped_answers, /future_field/);
  assert.equal(preinscripcionRecordToSheetRow(record).length, PREINSCRIPCION_SHEET_COLUMNS.length);

  const publicRow = buildPreinscripcionPublicRow(record);
  assert.equal(publicRow[0], "10/08/2026 12:21:00");
  assert.equal(publicRow.at(-2), driveArchive().snapshot.url);
  assert.equal(publicRow.at(-1), driveArchive().folder.url);
  assert.equal(publicRow.includes("mao-sub-10"), false);
});

test("crea las pestañas si faltan y añade el envío pendiente con RAW", async () => {
  let tabs = [];
  const updates = [];
  const spreadsheetsGet = mock.fn(async () => ({ data: { sheets: tabs } }));
  const batchUpdate = mock.fn(async ({ requestBody }) => {
    const request = requestBody.requests[0];
    if (request.addSheet) {
      const properties = { sheetId: tabs.length + 1, ...request.addSheet.properties };
      tabs = [...tabs, { properties }];
      return { data: { replies: [{ addSheet: { properties } }] } };
    }
    return { data: { replies: [{}] } };
  });
  const valuesGet = mock.fn(async ({ range }) => {
    if (range.includes("!A1:")) return { data: { values: [] } };
    return { data: { values: [] } };
  });
  const valuesUpdate = mock.fn(async (request) => {
    updates.push(request);
    return { data: {} };
  });
  const valuesAppend = mock.fn(async () => ({
    data: {
      updates: {
        updatedRange: `'${DEFAULT_PREINSCRIPCION_SYSTEM_SHEET_NAME}'!A2:AH2`,
      },
    },
  }));
  const client = {
    spreadsheets: {
      get: spreadsheetsGet,
      batchUpdate,
      values: { get: valuesGet, update: valuesUpdate, append: valuesAppend },
    },
  };
  const store = createPreinscripcionSheetStore({
    sheetsClient: client,
    spreadsheetId: SPREADSHEET_ID,
    readinessTtlMs: 60_000,
  });

  const appended = await store.appendPending({
    payload: trialPayload(),
    receivedAt: "2026-08-10T10:21:00.000Z",
  });

  assert.equal(appended.rowNumber, 2);
  assert.equal(appended.record.form_type, "preinscripcion");
  assert.equal(appended.record.participant_full_name, "Ada Lovelace");
  assert.equal(valuesAppend.mock.callCount(), 1);
  assert.equal(valuesAppend.mock.calls[0].arguments[0].valueInputOption, "RAW");
  assert.deepEqual(
    tabs.map(({ properties }) => [properties.title, properties.hidden]),
    [
      [DEFAULT_PREINSCRIPCION_SYSTEM_SHEET_NAME, true],
      [DEFAULT_PREINSCRIPCION_SHEET_NAME, false],
    ],
  );
  assert.equal(updates.length, 2);
  assert.deepEqual(updates[0].requestBody.values[0], PREINSCRIPCION_SHEET_HEADERS);
  assert.deepEqual(updates[1].requestBody.values[0], PREINSCRIPCION_PUBLIC_HEADERS);
});
