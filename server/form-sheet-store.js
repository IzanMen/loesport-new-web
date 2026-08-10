import {
  GoogleSheetsConfigurationError,
  GoogleSheetsRowMismatchError,
  GoogleSheetsSchemaError,
  columnName,
  createGoogleSheetsClient,
  createPayloadFingerprint,
  driveArchiveToRecord,
  escapeSpreadsheetValue,
  formatInscripcionReceivedAt,
  normalizeAnswerKey,
  normalizeSubmissionId,
  parseUpdatedRowNumber,
  quoteSheetName,
  selectCanonicalSubmissionRow,
  serializeUnmappedAnswers,
} from "./inscripcion-sheet.js";
import { summarizeError } from "./error-summary.js";

const METADATA_COLUMNS = [
  ["submission_id", "ID de envío"],
  ["payload_fingerprint", "Huella del contenido"],
  ["schema_version", "Versión de esquema"],
  ["server_received_at", "Recibido por el servidor"],
  ["client_submitted_at", "Enviado desde el navegador"],
  ["form_type", "Tipo de formulario"],
  ["form_title", "Título del formulario"],
  ["page_url", "Página de origen"],
  ["email_status", "Estado del correo"],
  ["gmail_message_id", "ID de Gmail"],
  ["email_error", "Error de correo"],
  ["attachment_names", "Archivos adjuntos (nombres)"],
  ["unmapped_answers", "Respuestas no mapeadas"],
];

const DRIVE_COLUMNS = [
  ["drive_status", "Estado de Drive"],
  ["drive_error", "Error de Drive"],
  ["drive_folder_id", "ID de carpeta en Drive"],
  ["drive_folder_url", "Carpeta de Drive"],
  ["snapshot_drive_file_id", "ID de captura en Drive"],
  ["snapshot_drive_url", "Captura en Drive"],
  ["drive_files_manifest", "Archivos guardados en Drive"],
];

function freezeColumns(columns) {
  return Object.freeze(
    columns.map(([key, header]) => Object.freeze({ key, header })),
  );
}

function normalizedColumnPairs(columns, label) {
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new TypeError(`${label} debe contener al menos una columna.`);
  }
  return columns.map((column) => {
    if (!Array.isArray(column) || column.length !== 2) {
      throw new TypeError(`${label} contiene una columna no válida.`);
    }
    const key = normalizeAnswerKey(column[0]);
    const header = String(column[1] ?? "").trim();
    if (!key || !header) throw new TypeError(`${label} contiene una columna no válida.`);
    return [key, header];
  });
}

function assertUniqueKeys(columns, label) {
  const keys = columns.map(([key]) => key);
  if (new Set(keys).size !== keys.length) {
    throw new TypeError(`${label} contiene claves duplicadas.`);
  }
}

export function createFormSheetSchema({
  formType,
  schemaVersion = "1",
  answerColumns,
  publicColumns,
  answerKeyAliases = {},
} = {}) {
  const normalizedFormType = normalizeAnswerKey(formType);
  if (!normalizedFormType || normalizedFormType !== formType) {
    throw new TypeError("El tipo del formulario persistente no es válido.");
  }
  const normalizedAnswers = normalizedColumnPairs(answerColumns, "answerColumns");
  const normalizedPublic = normalizedColumnPairs(publicColumns, "publicColumns");
  const systemPairs = [
    ...METADATA_COLUMNS.map(([key, header]) => [
      key,
      key === "schema_version" ? `${header} · v${schemaVersion}` : header,
    ]),
    ...normalizedAnswers,
    ...DRIVE_COLUMNS,
  ];
  assertUniqueKeys(systemPairs, "El esquema técnico");
  const systemKeys = new Set(systemPairs.map(([key]) => key));
  normalizedPublic.forEach(([key]) => {
    if (key !== "received_at" && !systemKeys.has(key)) {
      throw new TypeError(`La columna pública ${key} no existe en el esquema técnico.`);
    }
  });
  assertUniqueKeys(normalizedPublic, "El esquema público");

  const aliases = new Map(
    Object.entries(answerKeyAliases).map(([alias, key]) => [
      normalizeAnswerKey(alias),
      normalizeAnswerKey(key),
    ]),
  );
  const answerKeys = new Set(normalizedAnswers.map(([key]) => key));
  aliases.forEach((key) => {
    if (!answerKeys.has(key)) {
      throw new TypeError(`El alias apunta a una respuesta desconocida: ${key}.`);
    }
  });

  return Object.freeze({
    formType: normalizedFormType,
    schemaVersion: String(schemaVersion),
    answerColumns: freezeColumns(normalizedAnswers),
    answerKeys,
    answerKeyAliases: aliases,
    systemColumns: freezeColumns(systemPairs),
    publicColumns: freezeColumns(normalizedPublic),
    driveColumns: freezeColumns(DRIVE_COLUMNS),
  });
}

function normalizeAnswers(schema, answers) {
  const answerMap = new Map();
  const unmapped = [];
  for (const answer of Array.isArray(answers) ? answers : []) {
    const explicitKey = normalizeAnswerKey(answer?.key);
    const key = schema.answerKeyAliases.get(explicitKey) || explicitKey;
    if (!key || !schema.answerKeys.has(key)) {
      unmapped.push({
        key: explicitKey,
        section: String(answer?.section ?? ""),
        label: String(answer?.label ?? ""),
        value: String(answer?.value ?? ""),
      });
      continue;
    }
    answerMap.set(key, String(answer?.value ?? ""));
  }
  return { answerMap, unmapped };
}

export function buildFormSheetRecord(
  schema,
  {
    payload,
    submissionId = payload?.submissionId,
    receivedAt = "",
    emailStatus = "pending",
    payloadFingerprint = createPayloadFingerprint(payload),
    driveArchive,
    driveStatus = driveArchive ? "stored" : "pending",
    driveError = "",
  } = {},
) {
  if (payload?.type !== schema.formType) {
    throw new TypeError(`El almacén de ${schema.formType} ha recibido otro formulario.`);
  }
  const normalizedSubmissionId = normalizeSubmissionId(submissionId);
  const { answerMap, unmapped } = normalizeAnswers(schema, payload?.answers);
  const attachmentNames = Array.isArray(payload?.attachments)
    ? payload.attachments
        .map((attachment) => String(attachment?.name ?? "").trim())
        .filter(Boolean)
        .join(" | ")
    : "";
  const record = {
    submission_id: normalizedSubmissionId,
    payload_fingerprint: String(payloadFingerprint ?? ""),
    schema_version: schema.schemaVersion,
    server_received_at: String(receivedAt ?? ""),
    client_submitted_at: String(payload?.submittedAt ?? ""),
    form_type: String(payload?.type ?? ""),
    form_title: String(payload?.title ?? ""),
    page_url: String(payload?.pageUrl ?? ""),
    email_status: String(emailStatus ?? "pending"),
    gmail_message_id: "",
    email_error: "",
    attachment_names: attachmentNames,
    unmapped_answers: serializeUnmappedAnswers(unmapped),
  };
  schema.answerKeys.forEach((key) => {
    record[key] = answerMap.get(key) ?? "";
  });
  Object.assign(
    record,
    driveArchiveToRecord(driveArchive, { status: driveStatus, error: driveError }),
  );
  return record;
}

export function formRecordToSheetRow(schema, record) {
  return schema.systemColumns.map(({ key }) => escapeSpreadsheetValue(record?.[key]));
}

export function formSheetRowToRecord(schema, row) {
  return Object.fromEntries(
    schema.systemColumns.map(({ key }, index) => [key, String(row?.[index] ?? "")]),
  );
}

export function buildFormPublicRow(schema, record, { timeZone = "Europe/Madrid" } = {}) {
  const source = record && typeof record === "object" ? record : {};
  return schema.publicColumns.map(({ key }) =>
    escapeSpreadsheetValue(
      key === "received_at"
        ? formatInscripcionReceivedAt(source.server_received_at, timeZone)
        : source[key],
    ),
  );
}

function headersMatch(actualHeaders, expectedHeaders) {
  return actualHeaders.length === expectedHeaders.length &&
    expectedHeaders.every((header, index) => actualHeaders[index] === header);
}

function isEmptyRow(row) {
  return !row?.some((value) => String(value ?? "").length > 0);
}

function truncateError(error) {
  const summary = summarizeError(error);
  const code = summary.code || summary.name || "FORM_STORAGE_ERROR";
  const status = summary.status ? ` (${summary.status})` : "";
  return `${code}${status}: ${summary.message}`.slice(0, 500);
}

export function createFormSheetStore({
  schema,
  sheetsClient,
  spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  sheetName,
  systemSheetName,
  clock = () => new Date(),
  readinessClock = () => Date.now(),
  readinessTtlMs = 5_000,
} = {}) {
  if (!schema?.formType || !Array.isArray(schema.systemColumns)) {
    throw new TypeError("createFormSheetStore necesita un esquema válido.");
  }
  if (typeof clock !== "function" || typeof readinessClock !== "function") {
    throw new TypeError("La configuración temporal de Google Sheets no es válida.");
  }
  if (!Number.isFinite(readinessTtlMs) || readinessTtlMs < 0) {
    throw new TypeError("readinessTtlMs debe ser un número no negativo.");
  }

  const normalizedSpreadsheetId = String(spreadsheetId ?? "").trim();
  const normalizedSheetName = String(sheetName ?? "").trim();
  const normalizedSystemSheetName = String(systemSheetName ?? "").trim();
  const quotedSheetName = quoteSheetName(normalizedSheetName);
  const quotedSystemSheetName = quoteSheetName(normalizedSystemSheetName);
  if (normalizedSheetName === normalizedSystemSheetName) {
    throw new GoogleSheetsConfigurationError(
      "Las pestañas pública y técnica deben tener nombres diferentes.",
    );
  }

  const columnIndex = new Map(
    schema.systemColumns.map(({ key }, index) => [key, index]),
  );
  const lastColumn = columnName(schema.systemColumns.length);
  const lastPublicColumn = columnName(schema.publicColumns.length);
  const systemHeaders = schema.systemColumns.map(({ header }) => header);
  const publicHeaders = schema.publicColumns.map(({ header }) => header);
  let client = sheetsClient;
  let readyPromise;
  let readyExpiresAt = 0;

  function readinessTime() {
    const currentTime = Number(readinessClock());
    if (!Number.isFinite(currentTime)) {
      throw new TypeError("readinessClock debe devolver una fecha válida.");
    }
    return currentTime;
  }

  function prepareRuntime() {
    if (!normalizedSpreadsheetId) {
      throw new GoogleSheetsConfigurationError(
        "Falta la variable GOOGLE_SHEETS_SPREADSHEET_ID.",
      );
    }
    if (!client) client = createGoogleSheetsClient();
  }

  async function spreadsheetTabs() {
    const response = await client.spreadsheets.get({
      spreadsheetId: normalizedSpreadsheetId,
      fields: "sheets.properties(sheetId,title,hidden,gridProperties(rowCount,columnCount,frozenRowCount))",
    });
    return response.data.sheets || [];
  }

  async function ensureTab({ name, quotedName, columns, headers, hidden, freezeHeader }) {
    let tab = (await spreadsheetTabs()).find(({ properties }) => properties?.title === name);
    if (!tab) {
      const response = await client.spreadsheets.batchUpdate({
        spreadsheetId: normalizedSpreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: name,
                hidden,
                gridProperties: {
                  rowCount: 1_000,
                  columnCount: columns.length,
                  frozenRowCount: freezeHeader ? 1 : 0,
                },
              },
            },
          }],
        },
      });
      const properties = response.data.replies?.[0]?.addSheet?.properties;
      tab = properties ? { properties } : null;
      if (!tab) {
        tab = (await spreadsheetTabs()).find(({ properties: item }) => item?.title === name);
      }
    }
    if (!tab?.properties || (!tab.properties.sheetId && tab.properties.sheetId !== 0)) {
      throw new GoogleSheetsConfigurationError(`No se ha podido preparar la pestaña ${name}.`);
    }

    const currentGrid = tab.properties.gridProperties || {};
    const needsMoreColumns = Number(currentGrid.columnCount || 0) < columns.length;
    const needsVisibility = Boolean(tab.properties.hidden) !== hidden;
    const needsFrozenHeader = freezeHeader && Number(currentGrid.frozenRowCount || 0) < 1;
    if (needsMoreColumns || needsVisibility || needsFrozenHeader) {
      const properties = { sheetId: tab.properties.sheetId, hidden };
      const fields = ["hidden"];
      if (needsMoreColumns || needsFrozenHeader) {
        properties.gridProperties = {
          ...(needsMoreColumns ? { columnCount: columns.length } : {}),
          ...(needsFrozenHeader ? { frozenRowCount: 1 } : {}),
        };
        if (needsMoreColumns) fields.push("gridProperties.columnCount");
        if (needsFrozenHeader) fields.push("gridProperties.frozenRowCount");
      }
      await client.spreadsheets.batchUpdate({
        spreadsheetId: normalizedSpreadsheetId,
        requestBody: {
          requests: [{
            updateSheetProperties: {
              properties,
              fields: fields.join(","),
            },
          }],
        },
      });
    }

    const headerRange = `${quotedName}!A1:${columnName(columns.length)}1`;
    const headerResponse = await client.spreadsheets.values.get({
      spreadsheetId: normalizedSpreadsheetId,
      range: headerRange,
      majorDimension: "ROWS",
    });
    const actualHeaders = headerResponse.data.values?.[0] || [];
    if (isEmptyRow(actualHeaders)) {
      await client.spreadsheets.values.update({
        spreadsheetId: normalizedSpreadsheetId,
        range: headerRange,
        valueInputOption: "RAW",
        requestBody: { majorDimension: "ROWS", values: [[...headers]] },
      });
    } else if (!headersMatch(actualHeaders, headers)) {
      throw new GoogleSheetsSchemaError(
        `La cabecera de la pestaña ${name} no coincide con el esquema esperado.`,
      );
    }
    return { sheetId: tab.properties.sheetId, headerRange };
  }

  async function prepareSheets() {
    prepareRuntime();
    const system = await ensureTab({
      name: normalizedSystemSheetName,
      quotedName: quotedSystemSheetName,
      columns: schema.systemColumns,
      headers: systemHeaders,
      hidden: true,
      freezeHeader: false,
    });
    const publicTab = await ensureTab({
      name: normalizedSheetName,
      quotedName: quotedSheetName,
      columns: schema.publicColumns,
      headers: publicHeaders,
      hidden: false,
      freezeHeader: true,
    });
    return { system, public: publicTab };
  }

  function ensureReady() {
    const currentTime = readinessTime();
    if (!readyPromise || currentTime >= readyExpiresAt) {
      readyExpiresAt = Number.POSITIVE_INFINITY;
      readyPromise = Promise.resolve()
        .then(prepareSheets)
        .then((result) => {
          readyExpiresAt = readinessTime() + readinessTtlMs;
          return result;
        })
        .catch((error) => {
          readyPromise = undefined;
          readyExpiresAt = 0;
          throw error;
        });
    }
    return readyPromise;
  }

  async function verifyWritable() {
    const ready = await ensureReady();
    await Promise.all([
      client.spreadsheets.values.update({
        spreadsheetId: normalizedSpreadsheetId,
        range: ready.system.headerRange,
        valueInputOption: "RAW",
        requestBody: { majorDimension: "ROWS", values: [[...systemHeaders]] },
      }),
      client.spreadsheets.values.update({
        spreadsheetId: normalizedSpreadsheetId,
        range: ready.public.headerRange,
        valueInputOption: "RAW",
        requestBody: { majorDimension: "ROWS", values: [[...publicHeaders]] },
      }),
    ]);
    return ready;
  }

  async function findAllBySubmissionId(value) {
    const submissionId = normalizeSubmissionId(value);
    await ensureReady();
    const response = await client.spreadsheets.values.get({
      spreadsheetId: normalizedSpreadsheetId,
      range: `${quotedSystemSheetName}!A2:${lastColumn}`,
      majorDimension: "ROWS",
    });
    return (response.data.values || []).flatMap((row, index) => {
      if (String(row?.[0] ?? "").trim().toLowerCase() !== submissionId) return [];
      return [{ rowNumber: index + 2, record: formSheetRowToRecord(schema, row) }];
    });
  }

  async function findBySubmissionId(value) {
    return selectCanonicalSubmissionRow(await findAllBySubmissionId(value));
  }

  async function appendPending({
    payload,
    submissionId = payload?.submissionId,
    receivedAt,
    payloadFingerprint = createPayloadFingerprint(payload),
  } = {}) {
    await ensureReady();
    const timestamp = receivedAt ?? clock();
    const normalizedReceivedAt = timestamp instanceof Date
      ? timestamp.toISOString()
      : String(timestamp ?? "");
    const record = buildFormSheetRecord(schema, {
      payload,
      submissionId,
      receivedAt: normalizedReceivedAt,
      emailStatus: "pending",
      payloadFingerprint,
    });
    const row = formRecordToSheetRow(schema, record);
    const response = await client.spreadsheets.values.append({
      spreadsheetId: normalizedSpreadsheetId,
      range: `${quotedSystemSheetName}!A:${lastColumn}`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      includeValuesInResponse: false,
      requestBody: { majorDimension: "ROWS", values: [row] },
    });
    const rowNumber = parseUpdatedRowNumber(response.data.updates?.updatedRange);
    if (!rowNumber) throw new Error("Google Sheets no ha devuelto la fila añadida.");
    return { rowNumber, record, row };
  }

  async function verifySubmissionRow(rowNumber, expectedSubmissionId) {
    if (!Number.isInteger(rowNumber) || rowNumber < 2) {
      throw new TypeError("El número de fila de Google Sheets no es válido.");
    }
    await ensureReady();
    if (!expectedSubmissionId) return;
    const normalizedExpectedId = normalizeSubmissionId(expectedSubmissionId);
    const response = await client.spreadsheets.values.get({
      spreadsheetId: normalizedSpreadsheetId,
      range: `${quotedSystemSheetName}!A${rowNumber}:A${rowNumber}`,
      majorDimension: "ROWS",
    });
    const actualId = String(response.data.values?.[0]?.[0] ?? "").trim().toLowerCase();
    if (actualId !== normalizedExpectedId) throw new GoogleSheetsRowMismatchError(rowNumber);
  }

  async function updateRecordRange(rowNumber, firstKey, finalKey, values, expectedSubmissionId) {
    await verifySubmissionRow(rowNumber, expectedSubmissionId);
    const firstIndex = columnIndex.get(firstKey);
    const finalIndex = columnIndex.get(finalKey);
    if (!Number.isInteger(firstIndex) || !Number.isInteger(finalIndex)) {
      throw new TypeError("La actualización de Google Sheets no es válida.");
    }
    await client.spreadsheets.values.update({
      spreadsheetId: normalizedSpreadsheetId,
      range: `${quotedSystemSheetName}!${columnName(firstIndex + 1)}${rowNumber}:${columnName(finalIndex + 1)}${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        majorDimension: "ROWS",
        values: [values.map(escapeSpreadsheetValue)],
      },
    });
  }

  async function writePublicRow(rowNumber, record) {
    await client.spreadsheets.values.update({
      spreadsheetId: normalizedSpreadsheetId,
      range: `${quotedSheetName}!A${rowNumber}:${lastPublicColumn}${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        majorDimension: "ROWS",
        values: [buildFormPublicRow(schema, record)],
      },
    });
  }

  async function updateEmailState(
    rowNumber,
    { status, gmailMessageId = "", error = "" },
    verification = {},
  ) {
    const expectedSubmissionId = typeof verification === "string"
      ? verification
      : verification?.expectedSubmissionId;
    await updateRecordRange(
      rowNumber,
      "email_status",
      "email_error",
      [status, gmailMessageId, error],
      expectedSubmissionId,
    );
  }

  async function updateDriveArchive(rowNumber, archive, status, expectedSubmissionId) {
    const driveRecord = driveArchiveToRecord(archive, { status });
    await updateRecordRange(
      rowNumber,
      schema.driveColumns[0].key,
      schema.driveColumns.at(-1).key,
      schema.driveColumns.map(({ key }) => driveRecord[key]),
      typeof expectedSubmissionId === "object"
        ? expectedSubmissionId?.expectedSubmissionId
        : expectedSubmissionId,
    );
  }

  async function markDrivePlanned(rowNumber, archive, expectedSubmissionId) {
    await updateDriveArchive(rowNumber, archive, "planned", expectedSubmissionId);
  }

  async function markDriveStored(rowNumber, archive, expectedSubmissionId) {
    await verifySubmissionRow(rowNumber, expectedSubmissionId);
    const response = await client.spreadsheets.values.get({
      spreadsheetId: normalizedSpreadsheetId,
      range: `${quotedSystemSheetName}!A${rowNumber}:${lastColumn}${rowNumber}`,
      majorDimension: "ROWS",
    });
    const record = {
      ...formSheetRowToRecord(schema, response.data.values?.[0] || []),
      ...driveArchiveToRecord(archive, { status: "stored" }),
    };
    await writePublicRow(rowNumber, record);
    await updateDriveArchive(rowNumber, archive, "stored", expectedSubmissionId);
  }

  async function markDriveError(rowNumber, error, expectedSubmissionId) {
    await updateRecordRange(
      rowNumber,
      "drive_status",
      "drive_error",
      ["error", truncateError(error)],
      typeof expectedSubmissionId === "object"
        ? expectedSubmissionId?.expectedSubmissionId
        : expectedSubmissionId,
    );
  }

  async function markSent(rowNumber, gmailMessageId, expectedSubmissionId) {
    await updateEmailState(rowNumber, {
      status: "sent",
      gmailMessageId,
      error: "",
    }, typeof expectedSubmissionId === "object"
      ? expectedSubmissionId
      : { expectedSubmissionId });
  }

  async function markError(rowNumber, error, expectedSubmissionId) {
    await updateEmailState(rowNumber, {
      status: "error",
      gmailMessageId: "",
      error: truncateError(error),
    }, typeof expectedSubmissionId === "object"
      ? expectedSubmissionId
      : { expectedSubmissionId });
  }

  return Object.freeze({
    configured: Boolean(normalizedSpreadsheetId),
    spreadsheetId: normalizedSpreadsheetId,
    sheetName: normalizedSheetName,
    systemSheetName: normalizedSystemSheetName,
    schema,
    ensureReady,
    verifyWritable,
    findAllBySubmissionId,
    findBySubmissionId,
    appendPending,
    updateEmailState,
    markDrivePlanned,
    markDriveStored,
    markDriveError,
    markSent,
    markError,
  });
}
