import {
  createInscripcionDriveStore,
  createPreinscripcionDriveStore,
} from "./inscripcion-drive.js";
import { createInscripcionSheetStore } from "./inscripcion-sheet.js";
import { createPreinscripcionSheetStore } from "./preinscripcion-sheet.js";

const stores = [
  {
    type: "inscripcion",
    sheet: createInscripcionSheetStore(),
    drive: createInscripcionDriveStore(),
  },
  {
    type: "preinscripcion",
    sheet: createPreinscripcionSheetStore(),
    drive: createPreinscripcionDriveStore(),
  },
];

try {
  await Promise.all(
    stores.flatMap(({ sheet, drive }) => [sheet.verifyWritable(), drive.ensureReady()]),
  );
  console.log(
    JSON.stringify({
      ok: true,
      forms: Object.fromEntries(
        stores.map(({ type, sheet, drive }) => [
          type,
          { sheetName: sheet.sheetName, driveAuthMode: drive.authMode },
        ]),
      ),
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      ok: false,
      name: String(error?.name || "Error"),
      code: String(error?.code || "STORAGE_PREFLIGHT_FAILED"),
      status: Number(error?.response?.status ?? error?.status) || 500,
    }),
  );
  process.exitCode = 1;
}
