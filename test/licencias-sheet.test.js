import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_LICENCIAS_SHEET_NAME,
  DEFAULT_LICENCIAS_SYSTEM_SHEET_NAME,
  LICENCIAS_PUBLIC_COLUMNS,
  LICENCIAS_PUBLIC_HEADERS,
  LICENCIAS_SHEET_COLUMNS,
  LICENCIAS_SHEET_HEADERS,
  buildLicenciasPublicRow,
  buildLicenciasRecord,
  createLicenciasSheetStore,
  licenciasRecordToSheetRow,
} from "../server/licencias-sheet.js";

const SUBMISSION_ID = "123e4567-e89b-42d3-a456-426614174000";

function licenciasPayload(overrides = {}) {
  return {
    submissionId: SUBMISSION_ID,
    type: "licencias",
    title: "Licencias de atletismo",
    answers: [
      { key: "license_request_type", value: "Renovación · Estándar" },
      { key: "license_scope", value: "Autonómica" },
      { key: "license_category", value: "Sub-16" },
      { key: "participant_full_name", value: "Ada Lovelace" },
      { key: "participant_birth_date", value: "10/12/2012" },
      { key: "participant_document_number", value: "12345678Z" },
      { key: "license_signed_form", value: "impreso.pdf" },
      { key: "participant_document_front", value: "dni-delante.jpg" },
      { key: "participant_document_back", value: "dni-detras.jpg" },
      { key: "participant_census_certificate", value: "Sin archivo" },
      { key: "participant_address", value: "Carrer Major 1" },
      { key: "participant_postal_code", value: "07730" },
      { key: "participant_city_province", value: "Alaior, Illes Balears" },
      { key: "participant_nationality", value: "Española" },
      { key: "contact_phone", value: "600000000" },
      { key: "payment_method", value: "EFECTIVO" },
      { key: "comments", value: "Sin observaciones" },
      { key: "privacy_consent", value: "ACEPTO" },
      { key: "terms_consent", value: "ACEPTO" },
    ],
    attachments: [
      { index: 0, key: "license_signed_form", label: "Impreso", name: "impreso.pdf" },
      { index: 1, key: "participant_document_front", label: "DNI", name: "dni-delante.jpg" },
      { index: 2, key: "participant_document_back", label: "DNI", name: "dni-detras.jpg" },
    ],
    pageUrl: "https://loesport.es/licencias",
    submittedAt: "2026-11-25T15:30:00.000Z",
    ...overrides,
  };
}

function driveArchive() {
  return {
    version: 1,
    submissionId: SUBMISSION_ID,
    parentFolderId: "parentFolder12345",
    folder: {
      id: "licenciasFolder12345",
      name: `licencias-${SUBMISSION_ID}`,
      url: "https://drive.google.test/folders/licenciasFolder12345",
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
      id: "licenciasSnapshot12345",
      url: "https://drive.google.test/files/licenciasSnapshot12345",
    },
    attachments: [],
  };
}

test("define una vista de licencias y una pestaña técnica separada", () => {
  assert.equal(DEFAULT_LICENCIAS_SHEET_NAME, "Llicències");
  assert.equal(DEFAULT_LICENCIAS_SYSTEM_SHEET_NAME, "_Llicències sistema");
  assert.equal(LICENCIAS_SHEET_COLUMNS.length, 41);
  assert.equal(LICENCIAS_PUBLIC_COLUMNS.length, 24);
  assert.equal(LICENCIAS_SHEET_HEADERS[0], "ID de envío");
  assert.equal(LICENCIAS_PUBLIC_HEADERS[0], "Fecha y hora de recepción");
  assert.equal(LICENCIAS_PUBLIC_HEADERS[1], "Trámite solicitado");
  assert.equal(LICENCIAS_PUBLIC_HEADERS.at(-2), "Captura en Drive");
  assert.equal(LICENCIAS_PUBLIC_HEADERS.at(-1), "Carpeta en Drive");
});

test("mapea la licencia, guarda los adjuntos y publica los enlaces privados", () => {
  const payload = licenciasPayload({
    answers: [...licenciasPayload().answers, { key: "future_field", value: "Dato futuro" }],
  });
  const archive = driveArchive();
  const record = buildLicenciasRecord({
    payload,
    receivedAt: "2026-11-25T15:31:00.000Z",
    driveArchive: archive,
  });

  assert.equal(record.participant_full_name, "Ada Lovelace");
  assert.equal(record.license_category, "Sub-16");
  assert.equal(record.license_scope, "Autonómica");
  assert.equal(record.attachment_names, "impreso.pdf | dni-delante.jpg | dni-detras.jpg");
  assert.equal(record.drive_status, "stored");
  assert.match(record.unmapped_answers, /future_field/);
  assert.equal(licenciasRecordToSheetRow(record).length, LICENCIAS_SHEET_COLUMNS.length);

  const publicRow = buildLicenciasPublicRow(record);
  assert.equal(publicRow[0], "25/11/2026 16:31:00");
  assert.equal(publicRow[1], "Renovación · Estándar");
  assert.equal(publicRow.at(-2), archive.snapshot.url);
  assert.equal(publicRow.at(-1), archive.folder.url);
});

test("rechaza otros tipos de formulario", () => {
  assert.throws(
    () => buildLicenciasRecord({ payload: licenciasPayload({ type: "baja" }) }),
    /El almacén de licencias ha recibido otro formulario/,
  );
});

test("exige el spreadsheet independiente configurado para las licencias", async () => {
  const missing = createLicenciasSheetStore({ spreadsheetId: "", sheetsClient: {} });
  assert.equal(missing.configured, false);
  await assert.rejects(
    missing.ensureReady(),
    /Falta la variable GOOGLE_SHEETS_LICENCIAS_SPREADSHEET_ID/,
  );

  const configured = createLicenciasSheetStore({
    spreadsheetId: "licencias-spreadsheet-test",
    sheetName: "  Llicències 2027  ",
    systemSheetName: "  _Sistema llicències  ",
    sheetsClient: {},
  });
  assert.equal(configured.configured, true);
  assert.equal(configured.spreadsheetId, "licencias-spreadsheet-test");
  assert.equal(configured.sheetName, "Llicències 2027");
  assert.equal(configured.systemSheetName, "_Sistema llicències");
});
