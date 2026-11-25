import {
  buildFormPublicRow,
  buildFormSheetRecord,
  createFormSheetSchema,
  createFormSheetStore,
  formRecordToSheetRow,
  formSheetRowToRecord,
} from "./form-sheet-store.js";

export const DEFAULT_LICENCIAS_SHEET_NAME = "Llicències";
export const DEFAULT_LICENCIAS_SYSTEM_SHEET_NAME = "_Llicències sistema";
export const LICENCIAS_SHEET_SCHEMA_VERSION = "1";

const ANSWER_COLUMNS = [
  ["license_request_type", "Trámite solicitado"],
  ["license_scope", "Ámbito de la licencia"],
  ["license_category", "Categoría federativa 2027"],
  ["participant_full_name", "Nombre y apellidos"],
  ["participant_birth_date", "Fecha de nacimiento"],
  ["participant_document_number", "DNI o NIE"],
  ["license_signed_form", "Impreso de licencia firmado"],
  ["participant_document_front", "DNI/NIE · parte delantera"],
  ["participant_document_back", "DNI/NIE · parte trasera"],
  ["participant_census_certificate", "Certificado de empadronamiento"],
  ["participant_address", "Domicilio"],
  ["participant_postal_code", "Código postal"],
  ["participant_city_province", "Ciudad y provincia"],
  ["participant_nationality", "Nacionalidad"],
  ["contact_phone", "Teléfono de contacto"],
  ["payment_method", "Forma de pago"],
  ["bank_details", "Número de cuenta"],
  ["direct_debit_authorization", "Autorización de domiciliación"],
  ["comments", "Observaciones"],
  ["privacy_consent", "Consentimiento de privacidad"],
  ["terms_consent", "Aceptación de condiciones"],
];

const PUBLIC_COLUMNS = [
  ["received_at", "Fecha y hora de recepción"],
  ...ANSWER_COLUMNS,
  ["snapshot_drive_url", "Captura en Drive"],
  ["drive_folder_url", "Carpeta en Drive"],
];

export const LICENCIAS_SHEET_SCHEMA = createFormSheetSchema({
  formType: "licencias",
  schemaVersion: LICENCIAS_SHEET_SCHEMA_VERSION,
  answerColumns: ANSWER_COLUMNS,
  publicColumns: PUBLIC_COLUMNS,
});

export const LICENCIAS_SHEET_COLUMNS = LICENCIAS_SHEET_SCHEMA.systemColumns;
export const LICENCIAS_SHEET_HEADERS = Object.freeze(
  LICENCIAS_SHEET_COLUMNS.map(({ header }) => header),
);
export const LICENCIAS_PUBLIC_COLUMNS = LICENCIAS_SHEET_SCHEMA.publicColumns;
export const LICENCIAS_PUBLIC_HEADERS = Object.freeze(
  LICENCIAS_PUBLIC_COLUMNS.map(({ header }) => header),
);

export function buildLicenciasRecord(options) {
  return buildFormSheetRecord(LICENCIAS_SHEET_SCHEMA, options);
}

export function buildLicenciasPublicRow(record, options) {
  return buildFormPublicRow(LICENCIAS_SHEET_SCHEMA, record, options);
}

export function licenciasRecordToSheetRow(record) {
  return formRecordToSheetRow(LICENCIAS_SHEET_SCHEMA, record);
}

export function licenciasSheetRowToRecord(row) {
  return formSheetRowToRecord(LICENCIAS_SHEET_SCHEMA, row);
}

export function createLicenciasSheetStore({
  spreadsheetId = process.env.GOOGLE_SHEETS_LICENCIAS_SPREADSHEET_ID,
  sheetName =
    process.env.GOOGLE_SHEETS_LICENCIAS_TAB || DEFAULT_LICENCIAS_SHEET_NAME,
  systemSheetName =
    process.env.GOOGLE_SHEETS_LICENCIAS_SYSTEM_TAB ||
    DEFAULT_LICENCIAS_SYSTEM_SHEET_NAME,
  ...options
} = {}) {
  return createFormSheetStore({
    schema: LICENCIAS_SHEET_SCHEMA,
    spreadsheetId,
    spreadsheetEnvironmentName: "GOOGLE_SHEETS_LICENCIAS_SPREADSHEET_ID",
    sheetName,
    systemSheetName,
    ...options,
  });
}
