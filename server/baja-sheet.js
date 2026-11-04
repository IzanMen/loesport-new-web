import {
  buildFormPublicRow,
  buildFormSheetRecord,
  createFormSheetSchema,
  createFormSheetStore,
  formRecordToSheetRow,
  formSheetRowToRecord,
} from "./form-sheet-store.js";

export const DEFAULT_BAJA_SHEET_NAME = "Baixes";
export const DEFAULT_BAJA_SYSTEM_SHEET_NAME = "_Baixes sistema";
export const BAJA_SHEET_SCHEMA_VERSION = "1";

const ANSWER_COLUMNS = [
  ["participant_residence_city", "Población de residencia"],
  ["participant_full_name", "Nombre y apellidos"],
  ["participant_birth_date", "Fecha de nacimiento"],
  ["withdrawal_reason", "Motivo u observaciones de la baja"],
  ["privacy_consent", "Consentimiento de privacidad"],
  ["terms_consent", "Aceptación de condiciones"],
];

const PUBLIC_COLUMNS = [
  ["received_at", "Fecha y hora de recepción"],
  ...ANSWER_COLUMNS,
  ["snapshot_drive_url", "Captura en Drive"],
  ["drive_folder_url", "Carpeta en Drive"],
];

const LEGACY_ENTRY_KEY_ALIASES = {
  entry_1045781291: "participant_residence_city",
  entry_43453506: "participant_full_name",
  entry_1065046570: "participant_birth_date",
  entry_117660033: "withdrawal_reason",
  entry_577217566: "privacy_consent",
  entry_913392475: "terms_consent",
};

export const BAJA_SHEET_SCHEMA = createFormSheetSchema({
  formType: "baja",
  schemaVersion: BAJA_SHEET_SCHEMA_VERSION,
  answerColumns: ANSWER_COLUMNS,
  publicColumns: PUBLIC_COLUMNS,
  answerKeyAliases: LEGACY_ENTRY_KEY_ALIASES,
});

export const BAJA_SHEET_COLUMNS = BAJA_SHEET_SCHEMA.systemColumns;
export const BAJA_SHEET_HEADERS = Object.freeze(
  BAJA_SHEET_COLUMNS.map(({ header }) => header),
);
export const BAJA_PUBLIC_COLUMNS = BAJA_SHEET_SCHEMA.publicColumns;
export const BAJA_PUBLIC_HEADERS = Object.freeze(
  BAJA_PUBLIC_COLUMNS.map(({ header }) => header),
);

export function buildBajaRecord(options) {
  return buildFormSheetRecord(BAJA_SHEET_SCHEMA, options);
}

export function buildBajaPublicRow(record, options) {
  return buildFormPublicRow(BAJA_SHEET_SCHEMA, record, options);
}

export function bajaRecordToSheetRow(record) {
  return formRecordToSheetRow(BAJA_SHEET_SCHEMA, record);
}

export function bajaSheetRowToRecord(row) {
  return formSheetRowToRecord(BAJA_SHEET_SCHEMA, row);
}

export function createBajaSheetStore({
  spreadsheetId = process.env.GOOGLE_SHEETS_BAJA_SPREADSHEET_ID,
  sheetName = process.env.GOOGLE_SHEETS_BAJA_TAB || DEFAULT_BAJA_SHEET_NAME,
  systemSheetName =
    process.env.GOOGLE_SHEETS_BAJA_SYSTEM_TAB || DEFAULT_BAJA_SYSTEM_SHEET_NAME,
  ...options
} = {}) {
  return createFormSheetStore({
    schema: BAJA_SHEET_SCHEMA,
    spreadsheetId,
    spreadsheetEnvironmentName: "GOOGLE_SHEETS_BAJA_SPREADSHEET_ID",
    sheetName,
    systemSheetName,
    ...options,
  });
}
