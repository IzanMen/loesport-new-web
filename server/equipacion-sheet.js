import {
  buildFormPublicRow,
  buildFormSheetRecord,
  createFormSheetSchema,
  createFormSheetStore,
  formRecordToSheetRow,
  formSheetRowToRecord,
} from "./form-sheet-store.js";

export const DEFAULT_EQUIPACION_SHEET_NAME = "Equipament";
export const DEFAULT_EQUIPACION_SYSTEM_SHEET_NAME = "_Equipament sistema";
export const EQUIPACION_SHEET_SCHEMA_VERSION = "1";

const ANSWER_COLUMNS = [
  ["contact_full_name", "Nombre y apellidos"],
  ["contact_email", "Correo electrónico"],
  ["contact_phone", "Teléfono"],
  ["order_items", "Artículos solicitados"],
  ["order_total", "Total orientativo"],
  ["comments", "Observaciones"],
  ["privacy_consent", "Consentimiento"],
];

const PUBLIC_COLUMNS = [
  ["received_at", "Fecha y hora de recepción"],
  ...ANSWER_COLUMNS,
  ["snapshot_drive_url", "Captura en Drive"],
  ["drive_folder_url", "Carpeta en Drive"],
];

export const EQUIPACION_SHEET_SCHEMA = createFormSheetSchema({
  formType: "equipacion",
  schemaVersion: EQUIPACION_SHEET_SCHEMA_VERSION,
  answerColumns: ANSWER_COLUMNS,
  publicColumns: PUBLIC_COLUMNS,
});

export const EQUIPACION_SHEET_COLUMNS = EQUIPACION_SHEET_SCHEMA.systemColumns;
export const EQUIPACION_SHEET_HEADERS = Object.freeze(
  EQUIPACION_SHEET_COLUMNS.map(({ header }) => header),
);
export const EQUIPACION_PUBLIC_COLUMNS = EQUIPACION_SHEET_SCHEMA.publicColumns;
export const EQUIPACION_PUBLIC_HEADERS = Object.freeze(
  EQUIPACION_PUBLIC_COLUMNS.map(({ header }) => header),
);

export function buildEquipacionRecord(options) {
  return buildFormSheetRecord(EQUIPACION_SHEET_SCHEMA, options);
}

export function buildEquipacionPublicRow(record, options) {
  return buildFormPublicRow(EQUIPACION_SHEET_SCHEMA, record, options);
}

export function equipacionRecordToSheetRow(record) {
  return formRecordToSheetRow(EQUIPACION_SHEET_SCHEMA, record);
}

export function equipacionSheetRowToRecord(row) {
  return formSheetRowToRecord(EQUIPACION_SHEET_SCHEMA, row);
}

export function createEquipacionSheetStore({
  spreadsheetId = process.env.GOOGLE_SHEETS_EQUIPACION_SPREADSHEET_ID,
  sheetName =
    process.env.GOOGLE_SHEETS_EQUIPACION_TAB || DEFAULT_EQUIPACION_SHEET_NAME,
  systemSheetName =
    process.env.GOOGLE_SHEETS_EQUIPACION_SYSTEM_TAB ||
    DEFAULT_EQUIPACION_SYSTEM_SHEET_NAME,
  ...options
} = {}) {
  return createFormSheetStore({
    schema: EQUIPACION_SHEET_SCHEMA,
    spreadsheetId,
    spreadsheetEnvironmentName: "GOOGLE_SHEETS_EQUIPACION_SPREADSHEET_ID",
    sheetName,
    systemSheetName,
    ...options,
  });
}
