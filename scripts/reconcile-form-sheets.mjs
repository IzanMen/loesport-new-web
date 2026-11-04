import {
  buildInscripcionPublicRow, createGoogleSheetsClient, INSCRIPCION_PUBLIC_COLUMNS,
  INSCRIPCION_SHEET_COLUMNS, sheetRowToRecord,
} from "../server/inscripcion-sheet.js";
import {
  buildPreinscripcionPublicRow, PREINSCRIPCION_PUBLIC_COLUMNS,
  PREINSCRIPCION_SHEET_COLUMNS, preinscripcionSheetRowToRecord,
} from "../server/preinscripcion-sheet.js";
import {
  BAJA_PUBLIC_COLUMNS, BAJA_SHEET_COLUMNS, bajaSheetRowToRecord,
  buildBajaPublicRow,
} from "../server/baja-sheet.js";
import {
  EQUIPACION_PUBLIC_COLUMNS, EQUIPACION_SHEET_COLUMNS,
  buildEquipacionPublicRow, equipacionSheetRowToRecord,
} from "../server/equipacion-sheet.js";
import { createPublicSheetSync } from "../server/public-sheet-sync.js";

const apply = process.argv.includes("--apply");
const spreadsheetId = String(process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "").trim();
if (!spreadsheetId) throw new Error("Falta GOOGLE_SHEETS_SPREADSHEET_ID.");
const bajaSpreadsheetId = String(process.env.GOOGLE_SHEETS_BAJA_SPREADSHEET_ID || "").trim();
if (!bajaSpreadsheetId) throw new Error("Falta GOOGLE_SHEETS_BAJA_SPREADSHEET_ID.");
const equipacionSpreadsheetId = String(
  process.env.GOOGLE_SHEETS_EQUIPACION_SPREADSHEET_ID || "",
).trim();
if (!equipacionSpreadsheetId) {
  throw new Error("Falta GOOGLE_SHEETS_EQUIPACION_SPREADSHEET_ID.");
}
const client = createGoogleSheetsClient();
const configurations = [
  {
    spreadsheetId,
    sheetName: process.env.GOOGLE_SHEETS_INSCRIPCION_TAB || "Inscripciones",
    systemSheetName: process.env.GOOGLE_SHEETS_INSCRIPCION_SYSTEM_TAB || "_Inscripciones sistema",
    columns: INSCRIPCION_PUBLIC_COLUMNS, systemColumns: INSCRIPCION_SHEET_COLUMNS,
    buildRow: buildInscripcionPublicRow, parseRow: sheetRowToRecord,
  },
  {
    spreadsheetId,
    sheetName: process.env.GOOGLE_SHEETS_PREINSCRIPCION_TAB || "Periodos de prueba",
    systemSheetName: process.env.GOOGLE_SHEETS_PREINSCRIPCION_SYSTEM_TAB || "_Pruebas sistema",
    columns: PREINSCRIPCION_PUBLIC_COLUMNS, systemColumns: PREINSCRIPCION_SHEET_COLUMNS,
    buildRow: buildPreinscripcionPublicRow, parseRow: preinscripcionSheetRowToRecord,
  },
  {
    spreadsheetId: bajaSpreadsheetId,
    sheetName: process.env.GOOGLE_SHEETS_BAJA_TAB || "Baixes",
    systemSheetName: process.env.GOOGLE_SHEETS_BAJA_SYSTEM_TAB || "_Baixes sistema",
    columns: BAJA_PUBLIC_COLUMNS, systemColumns: BAJA_SHEET_COLUMNS,
    buildRow: buildBajaPublicRow, parseRow: bajaSheetRowToRecord,
  },
  {
    spreadsheetId: equipacionSpreadsheetId,
    sheetName: process.env.GOOGLE_SHEETS_EQUIPACION_TAB || "Equipament",
    systemSheetName:
      process.env.GOOGLE_SHEETS_EQUIPACION_SYSTEM_TAB || "_Equipament sistema",
    columns: EQUIPACION_PUBLIC_COLUMNS, systemColumns: EQUIPACION_SHEET_COLUMNS,
    buildRow: buildEquipacionPublicRow, parseRow: equipacionSheetRowToRecord,
  },
];

const stores = configurations.map((config) => ({
  name: config.sheetName, sync: createPublicSheetSync({ client, ...config }),
}));
// Validate every view before applying migrations. No emails or Drive writes occur.
const plans = await Promise.all(stores.map(({ sync }) => sync.reconcile()));
if (apply && plans.some(({ issues }) => issues.length)) {
  throw new Error("Hay correspondencias pendientes de revisión. No se ha modificado ninguna vista.");
}
for (const [index, { name, sync }] of stores.entries()) {
  const result = apply ? await sync.reconcile({ apply: true }) : plans[index];
  console.log(JSON.stringify({
    sheet: name, applied: apply, total: result.total, added: result.added,
    linked: result.linked, issues: result.issues, backup: result.backupName || null,
  }));
  if (result.issues.length) process.exitCode = 1;
}
