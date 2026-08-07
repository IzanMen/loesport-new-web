import { createInscripcionDriveStore } from "./inscripcion-drive.js";
import { createInscripcionSheetStore } from "./inscripcion-sheet.js";

const sheetStore = createInscripcionSheetStore();
const driveStore = createInscripcionDriveStore();

try {
  await sheetStore.verifyWritable();
  await driveStore.ensureReady();
  console.log(
    JSON.stringify({
      ok: true,
      sheetName: sheetStore.sheetName,
      driveAuthMode: driveStore.authMode,
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
