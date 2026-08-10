import {
  buildFormPublicRow,
  buildFormSheetRecord,
  createFormSheetSchema,
  createFormSheetStore,
  formRecordToSheetRow,
  formSheetRowToRecord,
} from "./form-sheet-store.js";

export const DEFAULT_PREINSCRIPCION_SHEET_NAME = "Periodos de prueba";
export const DEFAULT_PREINSCRIPCION_SYSTEM_SHEET_NAME = "_Pruebas sistema";
export const PREINSCRIPCION_SHEET_SCHEMA_VERSION = "1";

const ANSWER_COLUMNS = [
  ["training_location", "Sede"],
  ["training_group_id", "ID del grupo"],
  ["training_group_name", "Grupo"],
  ["training_day_count", "Días por semana"],
  ["training_selected_days", "Días elegidos"],
  ["participant_full_name", "Nombre y apellidos"],
  ["participant_residence_city", "Población de residencia"],
  ["participant_birth_date", "Fecha de nacimiento"],
  ["participant_sex", "Sexo"],
  ["contact_phone", "Teléfono de contacto"],
  ["comments", "Observaciones o sugerencias"],
  ["trial_commitment", "Compromiso de formalizar la inscripción"],
  ["privacy_consent", "Consentimiento de privacidad"],
  ["terms_consent", "Aceptación de condiciones"],
];

const PUBLIC_COLUMNS = [
  ["received_at", "Fecha y hora de recepción"],
  ["training_location", "Sede"],
  ["training_group_name", "Grupo"],
  ["training_day_count", "Días por semana"],
  ["training_selected_days", "Días elegidos"],
  ["participant_full_name", "Nombre y apellidos"],
  ["participant_residence_city", "Población de residencia"],
  ["participant_birth_date", "Fecha de nacimiento"],
  ["participant_sex", "Sexo"],
  ["contact_phone", "Teléfono de contacto"],
  ["comments", "Observaciones o sugerencias"],
  ["trial_commitment", "Compromiso de formalizar la inscripción"],
  ["privacy_consent", "Consentimiento de privacidad"],
  ["terms_consent", "Aceptación de condiciones"],
  ["snapshot_drive_url", "Captura en Drive"],
  ["drive_folder_url", "Carpeta en Drive"],
];

const LEGACY_ENTRY_KEY_ALIASES = {
  entry_43453506: "participant_full_name",
  entry_1329993054: "participant_residence_city",
  entry_1065046570: "participant_birth_date",
  entry_984531499: "participant_sex",
  entry_97509970: "contact_phone",
  entry_1933709984: "comments",
  entry_1853047302: "trial_commitment",
  entry_577217566: "privacy_consent",
  entry_262712769: "terms_consent",
};

export const PREINSCRIPCION_SHEET_SCHEMA = createFormSheetSchema({
  formType: "preinscripcion",
  schemaVersion: PREINSCRIPCION_SHEET_SCHEMA_VERSION,
  answerColumns: ANSWER_COLUMNS,
  publicColumns: PUBLIC_COLUMNS,
  answerKeyAliases: LEGACY_ENTRY_KEY_ALIASES,
});

export const PREINSCRIPCION_SHEET_COLUMNS = PREINSCRIPCION_SHEET_SCHEMA.systemColumns;
export const PREINSCRIPCION_SHEET_HEADERS = Object.freeze(
  PREINSCRIPCION_SHEET_COLUMNS.map(({ header }) => header),
);
export const PREINSCRIPCION_PUBLIC_COLUMNS = PREINSCRIPCION_SHEET_SCHEMA.publicColumns;
export const PREINSCRIPCION_PUBLIC_HEADERS = Object.freeze(
  PREINSCRIPCION_PUBLIC_COLUMNS.map(({ header }) => header),
);

export function buildPreinscripcionRecord(options) {
  return buildFormSheetRecord(PREINSCRIPCION_SHEET_SCHEMA, options);
}

export function buildPreinscripcionPublicRow(record, options) {
  return buildFormPublicRow(PREINSCRIPCION_SHEET_SCHEMA, record, options);
}

export function preinscripcionRecordToSheetRow(record) {
  return formRecordToSheetRow(PREINSCRIPCION_SHEET_SCHEMA, record);
}

export function preinscripcionSheetRowToRecord(row) {
  return formSheetRowToRecord(PREINSCRIPCION_SHEET_SCHEMA, row);
}

export function createPreinscripcionSheetStore({
  sheetName =
    process.env.GOOGLE_SHEETS_PREINSCRIPCION_TAB ||
    DEFAULT_PREINSCRIPCION_SHEET_NAME,
  systemSheetName =
    process.env.GOOGLE_SHEETS_PREINSCRIPCION_SYSTEM_TAB ||
    DEFAULT_PREINSCRIPCION_SYSTEM_SHEET_NAME,
  ...options
} = {}) {
  return createFormSheetStore({
    schema: PREINSCRIPCION_SHEET_SCHEMA,
    sheetName,
    systemSheetName,
    ...options,
  });
}
