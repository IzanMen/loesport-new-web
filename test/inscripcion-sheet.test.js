import assert from "node:assert/strict";
import test, { mock } from "node:test";

import {
  DriveManifestTooLargeError,
  GoogleSheetsRowMismatchError,
  GoogleSheetsConfigurationError,
  GoogleSheetsSchemaError,
  DEFAULT_INSCRIPCION_SYSTEM_SHEET_NAME,
  INSCRIPCION_PUBLIC_COLUMNS,
  INSCRIPCION_PUBLIC_HEADERS,
  INSCRIPCION_SHEET_COLUMNS,
  INSCRIPCION_SHEET_HEADERS,
  INSCRIPCION_SHEET_V1_COLUMNS,
  INSCRIPCION_SHEET_V1_HEADERS,
  MAX_DRIVE_MANIFEST_CHARS,
  MAX_UNMAPPED_ANSWERS_CHARS,
  UnmappedAnswersTooLargeError,
  buildInscripcionRecord,
  buildInscripcionPublicRow,
  columnName,
  createInscripcionSheetStore,
  createPayloadFingerprint,
  driveArchiveToRecord,
  ensureInscripcionSheet,
  ensureInscripcionPublicSheet,
  escapeSpreadsheetValue,
  formatInscripcionReceivedAt,
  legacyAnswerKey,
  mapAnswersByKey,
  normalizeAnswerKey,
  normalizeAnswersForSheet,
  normalizeLegacyLabel,
  parseDriveManifest,
  parseUpdatedRowNumber,
  quoteSheetName,
  recordToSheetRow,
  selectCanonicalSubmissionRow,
  serializeDriveManifest,
  serializeUnmappedAnswers,
  sheetRowToRecord,
  stableStringify,
} from "../server/inscripcion-sheet.js";

const SUBMISSION_ID = "123e4567-e89b-42d3-a456-426614174000";
const SPREADSHEET_ID = "spreadsheet-test";

const EXPECTED_COLUMNS = [
  ["submission_id", "ID de envío"],
  ["payload_fingerprint", "Huella del contenido"],
  ["schema_version", "Versión de esquema · v2"],
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
  ["training_location", "Sede"],
  ["training_group_id", "ID del grupo"],
  ["training_group_name", "Grupo"],
  ["training_day_count", "Días por semana"],
  ["training_selected_days", "Días elegidos"],
  ["participant_residence_city", "Población de residencia"],
  ["participant_full_name", "Nombre y apellidos"],
  ["participant_birth_date", "Fecha de nacimiento"],
  ["participant_sex", "Sexo"],
  ["participant_document_number", "Documento de identidad"],
  ["participant_document_front", "Documento de identidad · parte delantera"],
  ["participant_document_back", "Documento de identidad · parte trasera"],
  ["club_membership_status", "Alta o renovación"],
  ["participant_address", "Dirección"],
  ["participant_postal_code", "Código postal"],
  ["participant_nationality", "Nacionalidad"],
  ["contact_phone", "Teléfono de contacto"],
  ["guardian_full_name", "Nombre y apellidos del tutor legal"],
  ["guardian_document_number", "Documento de identidad del tutor legal"],
  ["guardian_document_front", "Documento del tutor legal · parte delantera"],
  ["guardian_document_back", "Documento del tutor legal · parte trasera"],
  ["guardian_birth_date", "Fecha de nacimiento del tutor legal"],
  ["payment_method", "Modalidad y forma de pago"],
  ["direct_debit_authorization", "Autorización de domiciliación"],
  ["bank_details", "Datos bancarios"],
  ["image_use_authorization", "Autorización de uso de imagen"],
  ["offsite_activity_authorization", "Autorización para actividades fuera"],
  ["accident_protocol_acknowledgement", "Conformidad con el protocolo de accidentes"],
  ["participant_health_information", "Información médica, alergias y observaciones de salud"],
  ["comments", "Observaciones o sugerencias"],
  ["privacy_consent", "Consentimiento de privacidad"],
  ["terms_consent", "Aceptación de condiciones"],
  ["drive_status", "Estado de Drive"],
  ["drive_error", "Error de Drive"],
  ["drive_folder_id", "ID de carpeta en Drive"],
  ["drive_folder_url", "Carpeta de Drive"],
  ["snapshot_drive_file_id", "ID de captura en Drive"],
  ["snapshot_drive_url", "Captura en Drive"],
  ["participant_document_front_drive_url", "Documento delantero en Drive"],
  ["participant_document_back_drive_url", "Documento trasero en Drive"],
  ["guardian_document_front_drive_url", "Documento delantero del tutor en Drive"],
  ["guardian_document_back_drive_url", "Documento trasero del tutor en Drive"],
  ["drive_files_manifest", "Archivos guardados en Drive"],
];

function registrationPayload(overrides = {}) {
  return {
    submissionId: SUBMISSION_ID,
    type: "inscripcion",
    title: "Inscripción",
    answers: [
      {
        key: "participant_full_name",
        section: "Datos del participante",
        label: "Nombre y apellidos",
        value: "Ada Lovelace",
      },
    ],
    attachments: [],
    pageUrl: "https://loesport.es/inscripcion",
    submittedAt: "2026-08-07T10:20:30.000Z",
    ...overrides,
  };
}

function driveArchive(overrides = {}) {
  return {
    version: 1,
    submissionId: SUBMISSION_ID,
    parentFolderId: "parentFolder12345",
    folder: {
      id: "submissionFolder12345",
      name: `inscripcion-${SUBMISSION_ID}`,
      url: "https://drive.google.com/drive/folders/submissionFolder12345",
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
      id: "snapshotFile12345",
      url: "https://drive.google.com/file/d/snapshotFile12345/view",
    },
    attachments: [
      {
        kind: "attachment",
        slot: "attachment_0",
        index: 0,
        key: "participant_document_front",
        label: "DNI delantero",
        name: "01-dni.pdf",
        mimeType: "application/pdf",
        size: 5,
        sha256: "b".repeat(64),
        id: "attachmentFile12345",
        url: "https://drive.google.com/file/d/attachmentFile12345/view",
      },
    ],
    ...overrides,
  };
}

function fakeSheetsClient({
  headers = INSCRIPCION_SHEET_HEADERS,
  publicHeaders = INSCRIPCION_PUBLIC_HEADERS,
  rows = [],
  sheet = {
    properties: {
      sheetId: 7,
      title: DEFAULT_INSCRIPCION_SYSTEM_SHEET_NAME,
      hidden: true,
      gridProperties: { columnCount: INSCRIPCION_SHEET_COLUMNS.length },
    },
  },
  publicSheet = {
    properties: {
      sheetId: 8,
      title: "Inscripciones",
      hidden: false,
      gridProperties: {
        columnCount: INSCRIPCION_PUBLIC_COLUMNS.length,
        frozenRowCount: 1,
      },
    },
  },
  updatedRange = "'_Inscripciones sistema'!A42:BD42",
} = {}) {
  const spreadsheetGet = mock.fn(async () => ({
    data: { sheets: [sheet, publicSheet].filter(Boolean) },
  }));
  const batchUpdate = mock.fn(async ({ requestBody } = {}) => ({
    data: {
      replies: (requestBody?.requests || []).map((request, index) =>
        request.addSheet
          ? {
              addSheet: {
                properties: {
                  sheetId: 100 + index,
                  ...request.addSheet.properties,
                },
              },
            }
          : {},
      ),
    },
  }));
  const valuesGet = mock.fn(async ({ range }) => {
    if (range.startsWith(`'${DEFAULT_INSCRIPCION_SYSTEM_SHEET_NAME}'!A1:`)) {
      const currentHeaders = typeof headers === "function" ? headers() : headers;
      return { data: { values: currentHeaders == null ? [] : [[...currentHeaders]] } };
    }
    if (range.startsWith("'Inscripciones'!A1:")) {
      const currentHeaders =
        typeof publicHeaders === "function" ? publicHeaders() : publicHeaders;
      return { data: { values: currentHeaders == null ? [] : [[...currentHeaders]] } };
    }
    const currentRows = typeof rows === "function"
      ? rows({ range })
      : range.includes("!A2:K")
        ? rows
        : [];
    return { data: { values: currentRows } };
  });
  const valuesBatchGet = mock.fn(async ({ ranges }) => ({
    data: {
      valueRanges: ranges.map((range) => {
        const currentRows = typeof rows === "function"
          ? rows({ range })
          : range.includes("!A2:K")
            ? rows
            : [];
        return { range, values: currentRows };
      }),
    },
  }));
  const valuesUpdate = mock.fn(async () => ({ data: {} }));
  const valuesAppend = mock.fn(async () => ({
    data: { updates: { updatedRange } },
  }));

  return {
    client: {
      spreadsheets: {
        get: spreadsheetGet,
        batchUpdate,
        values: {
          get: valuesGet,
          batchGet: valuesBatchGet,
          update: valuesUpdate,
          append: valuesAppend,
        },
      },
    },
    spreadsheetGet,
    batchUpdate,
    valuesGet,
    valuesBatchGet,
    valuesUpdate,
    valuesAppend,
  };
}

function columnIndex(key) {
  return INSCRIPCION_SHEET_COLUMNS.findIndex((column) => column.key === key);
}

test("mantiene el contrato completo y ordenado de columnas y cabeceras", () => {
  assert.deepEqual(
    INSCRIPCION_SHEET_COLUMNS.map(({ key, header }) => [key, header]),
    EXPECTED_COLUMNS,
  );
  assert.deepEqual(
    INSCRIPCION_SHEET_HEADERS,
    EXPECTED_COLUMNS.map(([, header]) => header),
  );

  const keys = INSCRIPCION_SHEET_COLUMNS.map(({ key }) => key);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(keys.length, 56);
  assert.equal(columnName(keys.length), "BD");
  assert.equal(INSCRIPCION_SHEET_V1_COLUMNS.length, 45);
  assert.deepEqual(INSCRIPCION_SHEET_V1_HEADERS, [
    ...INSCRIPCION_SHEET_HEADERS.slice(0, 2),
    "Versión de esquema",
    ...INSCRIPCION_SHEET_HEADERS.slice(3, 45),
  ]);
  assert.equal(Object.isFrozen(INSCRIPCION_SHEET_COLUMNS), true);
  assert.equal(Object.isFrozen(INSCRIPCION_SHEET_HEADERS), true);
});

test("la vista visible contiene solo fecha, respuestas y enlaces de los documentos", () => {
  const keys = INSCRIPCION_PUBLIC_COLUMNS.map(({ key }) => key);
  assert.equal(keys[0], "received_at");
  assert.equal(keys.length, 32);
  assert.equal(columnName(keys.length), "AF");
  assert.equal(keys.includes("training_group_id"), false);
  [
    "submission_id",
    "payload_fingerprint",
    "schema_version",
    "email_status",
    "gmail_message_id",
    "drive_status",
    "drive_files_manifest",
  ].forEach((technicalKey) => assert.equal(keys.includes(technicalKey), false));
  assert.equal(INSCRIPCION_PUBLIC_HEADERS[0], "Fecha y hora de recepción");

  const record = {
    server_received_at: "2026-08-07T17:12:09.000Z",
    participant_full_name: "Ada Lovelace",
    participant_document_front: "dni-delantero.pdf",
    participant_document_back: "dni-trasero.pdf",
    participant_document_front_drive_url: "https://drive.google.com/file/d/front/view",
    participant_document_back_drive_url: "https://drive.google.com/file/d/back/view",
  };
  const row = buildInscripcionPublicRow(record);
  const publicIndex = (key) =>
    INSCRIPCION_PUBLIC_COLUMNS.findIndex((column) => column.key === key);
  assert.equal(row.length, INSCRIPCION_PUBLIC_COLUMNS.length);
  assert.equal(row[0], "07/08/2026 19:12:09");
  assert.equal(row[publicIndex("participant_full_name")], "Ada Lovelace");
  assert.equal(
    row[publicIndex("participant_document_front")],
    record.participant_document_front_drive_url,
  );
  assert.equal(
    row[publicIndex("participant_document_back")],
    record.participant_document_back_drive_url,
  );
  assert.equal(formatInscripcionReceivedAt("fecha no válida"), "fecha no válida");
});

test("mapea por key estable, admite etiquetas legacy y conserva respuestas no mapeadas", () => {
  const answers = [
    {
      key: "COMMENTS",
      section: "Autorizaciones",
      label: "Etiqueta traducida que puede cambiar",
      value: "Comentario estable",
    },
    {
      section: "Datos del participante",
      label: "  NÓMBRE Y APELLIDOS  ",
      value: "Grace Hopper",
    },
    {
      section: "Nueva sección",
      label: "Campo futuro",
      value: "Dato aún sin columna",
    },
    {
      key: "future-field",
      section: "Nueva sección",
      label: "Otro campo futuro",
      value: "Otro dato",
    },
  ];

  const { answerMap, unmapped } = normalizeAnswersForSheet(answers);
  assert.equal(answerMap.get("comments"), "Comentario estable");
  assert.equal(answerMap.get("participant_full_name"), "Grace Hopper");
  assert.deepEqual(unmapped, [
    {
      key: "",
      section: "Nueva sección",
      label: "Campo futuro",
      value: "Dato aún sin columna",
    },
    {
      key: "future_field",
      section: "Nueva sección",
      label: "Otro campo futuro",
      value: "Otro dato",
    },
  ]);

  assert.deepEqual([...mapAnswersByKey(answers)], [...answerMap]);
  assert.equal(normalizeAnswerKey(" Future-field "), "future_field");
  assert.equal(normalizeLegacyLabel("  Código Póstal: "), "codigo postal");
  assert.equal(legacyAnswerKey("Código Póstal"), "participant_postal_code");
  assert.equal(legacyAnswerKey("Etiqueta que no existe"), "");
});

test("elige una fila canónica estable al reordenar duplicados y da prioridad a sent", () => {
  const duplicate = {
    rowNumber: 2,
    record: {
      email_status: "error",
      email_error: "DUPLICATE_SUBMISSION: fila duplicada",
      server_received_at: "2026-08-07T10:00:00.000Z",
    },
  };
  const pending = {
    rowNumber: 8,
    record: {
      email_status: "pending",
      email_error: "",
      server_received_at: "2026-08-07T10:01:00.000Z",
    },
  };
  const error = {
    rowNumber: 9,
    record: {
      email_status: "error",
      email_error: "GMAIL_DOWN: error temporal",
      server_received_at: "2026-08-07T10:02:00.000Z",
    },
  };

  assert.equal(selectCanonicalSubmissionRow([duplicate, error, pending]), pending);
  assert.equal(selectCanonicalSubmissionRow([pending, duplicate, error]), pending);

  const sent = {
    rowNumber: 20,
    record: {
      email_status: " SENT ",
      email_error: "",
      server_received_at: "2026-08-07T12:00:00.000Z",
    },
  };
  assert.equal(selectCanonicalSubmissionRow([pending, sent, error]), sent);
  assert.equal(selectCanonicalSubmissionRow([sent, error, pending].reverse()), sent);
  assert.equal(selectCanonicalSubmissionRow([]), null);
});

test("crea una huella estable que ignora UUID y fecha cliente pero detecta contenido distinto", () => {
  const first = registrationPayload();
  const equivalent = {
    submittedAt: "2026-08-08T09:00:00.000Z",
    pageUrl: first.pageUrl,
    answers: first.answers.map(({ value, label, section, key }) => ({ value, label, section, key })),
    title: first.title,
    type: first.type,
    attachments: [],
    submissionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  };
  const changed = registrationPayload({
    answers: [{ ...first.answers[0], value: "Alan Turing" }],
  });

  assert.equal(createPayloadFingerprint(first), createPayloadFingerprint(equivalent));
  assert.notEqual(createPayloadFingerprint(first), createPayloadFingerprint(changed));
  assert.equal(stableStringify({ b: 2, a: 1 }), stableStringify({ a: 1, b: 2 }));
  assert.match(createPayloadFingerprint(first), /^[0-9a-f]{64}$/);
});

test("construye y serializa una fila fija con legacy, adjuntos y unmapped", () => {
  const payload = registrationPayload({
    answers: [
      { key: "training_group_id", label: "irrelevante", value: "mao-sub14" },
      { label: "Nombre y Apellidos", value: "Ada Lovelace" },
      { key: "comments", label: "Observaciones", value: "=HYPERLINK(\"https://invalid\")" },
      { key: "future_field", section: "Futuro", label: "Campo futuro", value: "+SUM(1,1)" },
    ],
    attachments: [{ name: "dni-frontal.pdf" }, { name: "dni-trasero.jpg" }],
  });
  const record = buildInscripcionRecord({
    payload,
    receivedAt: "2026-08-07T10:21:00.000Z",
    payloadFingerprint: "fingerprint-test",
  });

  assert.equal(record.submission_id, SUBMISSION_ID);
  assert.equal(record.payload_fingerprint, "fingerprint-test");
  assert.equal(record.schema_version, "2");
  assert.equal(record.email_status, "pending");
  assert.equal(record.drive_status, "pending");
  assert.equal(record.training_group_id, "mao-sub14");
  assert.equal(record.participant_full_name, "Ada Lovelace");
  assert.equal(record.comments, '=HYPERLINK("https://invalid")');
  assert.equal(record.guardian_full_name, "");
  assert.equal(record.attachment_names, "dni-frontal.pdf | dni-trasero.jpg");
  assert.deepEqual(JSON.parse(record.unmapped_answers), [
    {
      key: "future_field",
      section: "Futuro",
      label: "Campo futuro",
      value: "+SUM(1,1)",
    },
  ]);

  const row = recordToSheetRow(record);
  assert.equal(row.length, INSCRIPCION_SHEET_COLUMNS.length);
  assert.equal(row[columnIndex("comments")], '=HYPERLINK("https://invalid")');
  assert.deepEqual(sheetRowToRecord(row), record);
});

test("rechaza unmapped_answers serializado por encima de 45.000 caracteres", () => {
  const oversizedUnmapped = [
    {
      key: "future_field",
      section: "Futuro",
      label: "Campo futuro",
      value: "x".repeat(MAX_UNMAPPED_ANSWERS_CHARS),
    },
  ];

  assert.throws(
    () => serializeUnmappedAnswers(oversizedUnmapped),
    (error) => {
      assert.equal(error instanceof UnmappedAnswersTooLargeError, true);
      assert.equal(error.code, "UNMAPPED_ANSWERS_TOO_LARGE");
      assert.equal(error.status, 400);
      assert.equal(error.maxLength, 45_000);
      assert.ok(error.length > error.maxLength);
      return true;
    },
  );

  const answers = Array.from({ length: 6 }, (_, index) => ({
    key: `future_field_${index}`,
    section: "Futuro",
    label: `Campo ${index}`,
    value: "x".repeat(8_000),
  }));
  assert.throws(
    () => buildInscripcionRecord({ payload: registrationPayload({ answers }) }),
    UnmappedAnswersTooLargeError,
  );
});

test("serializa el plan/archivo Drive de forma estable y proyecta IDs y enlaces", () => {
  const archive = driveArchive();
  const serialized = serializeDriveManifest(archive);
  assert.deepEqual(parseDriveManifest(serialized), JSON.parse(serialized));
  assert.equal(parseDriveManifest("json inválido"), null);

  const driveRecord = driveArchiveToRecord(archive);
  assert.equal(driveRecord.drive_status, "stored");
  assert.equal(driveRecord.drive_folder_id, archive.folder.id);
  assert.equal(driveRecord.snapshot_drive_file_id, archive.snapshot.id);
  assert.equal(
    driveRecord.participant_document_front_drive_url,
    archive.attachments[0].url,
  );
  assert.equal(driveRecord.participant_document_back_drive_url, "");
  assert.equal(driveRecord.drive_files_manifest, serialized);

  const record = buildInscripcionRecord({
    payload: registrationPayload(),
    driveArchive: archive,
  });
  assert.equal(record.drive_status, "stored");
  assert.equal(record.schema_version, "2");
  assert.equal(record.drive_files_manifest, serialized);
});

test("rechaza un manifest Drive que supera el límite de celda", () => {
  const archive = driveArchive({
    folder: { ...driveArchive().folder, name: "x".repeat(MAX_DRIVE_MANIFEST_CHARS) },
  });
  assert.throws(
    () => serializeDriveManifest(archive),
    (error) => {
      assert.equal(error instanceof DriveManifestTooLargeError, true);
      assert.equal(error.code, "DRIVE_MANIFEST_TOO_LARGE");
      assert.equal(error.maxLength, 45_000);
      assert.ok(error.length > error.maxLength);
      return true;
    },
  );
});

test("mantiene literales de fórmula intactos para escritura RAW", () => {
  const dangerousValues = [
    '=HYPERLINK("https://invalid")',
    "+SUM(1,1)",
    "-1+1",
    "@SUM(A1:A2)",
  ];

  assert.deepEqual(dangerousValues.map(escapeSpreadsheetValue), dangerousValues);
});

test("convierte columnas, nombres de pestaña y rangos actualizados", () => {
  assert.equal(columnName(1), "A");
  assert.equal(columnName(26), "Z");
  assert.equal(columnName(27), "AA");
  assert.equal(columnName(52), "AZ");
  assert.throws(() => columnName(0), TypeError);

  assert.equal(quoteSheetName("Inscripciones 2026"), "'Inscripciones 2026'");
  assert.equal(quoteSheetName("Dades d'inscripció"), "'Dades d''inscripció'");
  assert.throws(() => quoteSheetName("Pestaña/Invalida"), GoogleSheetsConfigurationError);

  assert.equal(parseUpdatedRowNumber("'Inscripciones'!A42:AS42"), 42);
  assert.equal(parseUpdatedRowNumber("'Inscripciones'!$A$42:$AS$42"), 42);
  assert.equal(parseUpdatedRowNumber("'Inscripciones'!A42:AS43"), null);
  assert.equal(parseUpdatedRowNumber("sin-rango"), null);
});

test("ensureInscripcionSheet crea una cabecera vacía con RAW", async () => {
  const fake = fakeSheetsClient({ headers: [] });
  const result = await ensureInscripcionSheet({
    sheetsClient: fake.client,
    spreadsheetId: SPREADSHEET_ID,
  });

  assert.equal(result.headerRange, "'_Inscripciones sistema'!A1:BD1");
  assert.equal(fake.valuesUpdate.mock.callCount(), 1);
  assert.deepEqual(fake.valuesUpdate.mock.calls[0].arguments[0], {
    spreadsheetId: SPREADSHEET_ID,
    range: "'_Inscripciones sistema'!A1:BD1",
    valueInputOption: "RAW",
    requestBody: {
      majorDimension: "ROWS",
      values: [[...INSCRIPCION_SHEET_HEADERS]],
    },
  });
});

test("migra la pestaña técnica anterior, la oculta y crea la vista mínima", async () => {
  const legacySheet = {
    properties: {
      sheetId: 7,
      title: "Inscripciones",
      hidden: false,
      gridProperties: { columnCount: INSCRIPCION_SHEET_COLUMNS.length },
    },
  };
  const fake = fakeSheetsClient({
    sheet: legacySheet,
    publicSheet: null,
    publicHeaders: INSCRIPCION_SHEET_HEADERS,
  });

  const result = await ensureInscripcionSheet({
    sheetsClient: fake.client,
    spreadsheetId: SPREADSHEET_ID,
  });

  assert.equal(result.sheetName, DEFAULT_INSCRIPCION_SYSTEM_SHEET_NAME);
  assert.equal(result.migratedFromLegacy, true);
  assert.equal(result.publicCreated, true);
  const requests = fake.batchUpdate.mock.calls[0].arguments[0].requestBody.requests;
  assert.equal(requests[0].updateSheetProperties.properties.title, DEFAULT_INSCRIPCION_SYSTEM_SHEET_NAME);
  assert.equal(requests[1].addSheet.properties.title, "Inscripciones");
  assert.equal(
    requests[1].addSheet.properties.gridProperties.columnCount,
    INSCRIPCION_PUBLIC_COLUMNS.length,
  );
  assert.equal(requests[2].updateSheetProperties.properties.hidden, true);
});

test("crea la pestaña visible con una cabecera mínima y fija", async () => {
  const fake = fakeSheetsClient({ publicSheet: null, publicHeaders: [] });
  const result = await ensureInscripcionPublicSheet({
    sheetsClient: fake.client,
    spreadsheetId: SPREADSHEET_ID,
  });

  assert.equal(result.created, true);
  assert.equal(result.headerRange, "'Inscripciones'!A1:AF1");
  const request = fake.valuesUpdate.mock.calls[0].arguments[0];
  assert.equal(request.range, "'Inscripciones'!A1:AF1");
  assert.deepEqual(request.requestBody.values, [[...INSCRIPCION_PUBLIC_HEADERS]]);
});

test("ensureInscripcionSheet migra una cabecera v1 a la cabecera v2 completa con RAW", async () => {
  const fake = fakeSheetsClient({
    headers: INSCRIPCION_SHEET_V1_HEADERS,
    sheet: {
      properties: {
        sheetId: 7,
        title: DEFAULT_INSCRIPCION_SYSTEM_SHEET_NAME,
        hidden: true,
        gridProperties: { columnCount: INSCRIPCION_SHEET_V1_COLUMNS.length },
      },
    },
  });

  await ensureInscripcionSheet({ sheetsClient: fake.client, spreadsheetId: SPREADSHEET_ID });

  assert.deepEqual(fake.batchUpdate.mock.calls[0].arguments[0].requestBody.requests, [
    {
      updateSheetProperties: {
        properties: { sheetId: 7, gridProperties: { columnCount: 56 } },
        fields: "gridProperties.columnCount",
      },
    },
  ]);
  assert.deepEqual(fake.valuesUpdate.mock.calls[0].arguments[0], {
    spreadsheetId: SPREADSHEET_ID,
    range: "'_Inscripciones sistema'!A1:BD1",
    valueInputOption: "RAW",
    requestBody: {
      majorDimension: "ROWS",
      values: [[...INSCRIPCION_SHEET_HEADERS]],
    },
  });
});

test("ensureInscripcionSheet respeta la cabecera exacta y rechaza una incompatible", async (t) => {
  await t.test("cabecera exacta", async () => {
    const fake = fakeSheetsClient();
    await ensureInscripcionSheet({
      sheetsClient: fake.client,
      spreadsheetId: SPREADSHEET_ID,
    });
    assert.equal(fake.valuesUpdate.mock.callCount(), 0);
  });

  await t.test("cabecera incompatible", async () => {
    const fake = fakeSheetsClient({ headers: ["Cabecera ajena"] });
    await assert.rejects(
      () => ensureInscripcionSheet({ sheetsClient: fake.client, spreadsheetId: SPREADSHEET_ID }),
      (error) => {
        assert.equal(error instanceof GoogleSheetsSchemaError, true);
        assert.equal(error.code, "GOOGLE_SHEETS_SCHEMA_MISMATCH");
        assert.equal(error.status, 503);
        return true;
      },
    );
    assert.equal(fake.valuesUpdate.mock.callCount(), 0);
    assert.equal(fake.valuesAppend.mock.callCount(), 0);
  });

  await t.test("spreadsheet sin configurar", async () => {
    const fake = fakeSheetsClient();
    await assert.rejects(
      () => ensureInscripcionSheet({ sheetsClient: fake.client, spreadsheetId: "" }),
      GoogleSheetsConfigurationError,
    );
    assert.equal(fake.spreadsheetGet.mock.callCount(), 0);
  });
});

test("el store reutiliza la validación de cabecera para operaciones dentro del TTL", async () => {
  let readinessTime = 1_000;
  const fake = fakeSheetsClient();
  const store = createInscripcionSheetStore({
    sheetsClient: fake.client,
    spreadsheetId: SPREADSHEET_ID,
    readinessClock: () => readinessTime,
    readinessTtlMs: 5_000,
  });

  await store.findBySubmissionId(SUBMISSION_ID);
  readinessTime = 5_999;
  await store.markSent(42, "gmail-within-ttl");

  const headerReads = fake.valuesGet.mock.calls.filter(({ arguments: [request] }) =>
    request.range.includes("!A1:"),
  );
  assert.equal(fake.spreadsheetGet.mock.callCount(), 2);
  assert.equal(headerReads.length, 2);
  assert.equal(fake.valuesUpdate.mock.callCount(), 1);
});

test("verifyWritable confirma permiso de escritura reescribiendo la misma cabecera", async () => {
  const fake = fakeSheetsClient();
  const store = createInscripcionSheetStore({
    sheetsClient: fake.client,
    spreadsheetId: SPREADSHEET_ID,
  });

  const ready = await store.verifyWritable();

  assert.equal(ready.system.headerRange, "'_Inscripciones sistema'!A1:BD1");
  assert.equal(ready.public.headerRange, "'Inscripciones'!A1:AF1");
  assert.deepEqual(fake.valuesUpdate.mock.calls[0].arguments[0], {
    spreadsheetId: SPREADSHEET_ID,
    range: "'_Inscripciones sistema'!A1:BD1",
    valueInputOption: "RAW",
    requestBody: {
      majorDimension: "ROWS",
      values: [[...INSCRIPCION_SHEET_HEADERS]],
    },
  });
  assert.deepEqual(fake.valuesUpdate.mock.calls[1].arguments[0], {
    spreadsheetId: SPREADSHEET_ID,
    range: "'Inscripciones'!A1:AF1",
    valueInputOption: "RAW",
    requestBody: {
      majorDimension: "ROWS",
      values: [[...INSCRIPCION_PUBLIC_HEADERS]],
    },
  });
});

test("al expirar el TTL revalida y detecta una cabecera que pasó a ser incompatible", async () => {
  let readinessTime = 1_000;
  let currentHeaders = INSCRIPCION_SHEET_HEADERS;
  const fake = fakeSheetsClient({ headers: () => currentHeaders });
  const store = createInscripcionSheetStore({
    sheetsClient: fake.client,
    spreadsheetId: SPREADSHEET_ID,
    readinessClock: () => readinessTime,
    readinessTtlMs: 5_000,
  });

  await store.findBySubmissionId(SUBMISSION_ID);
  currentHeaders = ["Cabecera cambiada externamente"];
  readinessTime = 6_000;

  await assert.rejects(
    () => store.markSent(42, "gmail-after-ttl"),
    (error) => {
      assert.equal(error instanceof GoogleSheetsSchemaError, true);
      assert.equal(error.code, "GOOGLE_SHEETS_SCHEMA_MISMATCH");
      return true;
    },
  );

  const headerReads = fake.valuesGet.mock.calls.filter(({ arguments: [request] }) =>
    request.range.includes("!A1:"),
  );
  assert.equal(fake.spreadsheetGet.mock.callCount(), 3);
  assert.equal(headerReads.length, 3);
  assert.equal(fake.valuesUpdate.mock.callCount(), 0);
});

test("rechaza configuración inválida del reloj de readiness y un TTL negativo", () => {
  const fake = fakeSheetsClient();

  assert.throws(
    () =>
      createInscripcionSheetStore({
        sheetsClient: fake.client,
        spreadsheetId: SPREADSHEET_ID,
        readinessClock: 123,
      }),
    (error) => error instanceof TypeError && error.message.includes("readinessClock"),
  );

  const invalidClockStore = createInscripcionSheetStore({
    sheetsClient: fake.client,
    spreadsheetId: SPREADSHEET_ID,
    readinessClock: () => Number.NaN,
  });
  assert.throws(
    () => invalidClockStore.ensureReady(),
    (error) => error instanceof TypeError && error.message.includes("fecha válida"),
  );

  assert.throws(
    () =>
      createInscripcionSheetStore({
        sheetsClient: fake.client,
        spreadsheetId: SPREADSHEET_ID,
        readinessTtlMs: -1,
      }),
    (error) => error instanceof TypeError && error.message.includes("número no negativo"),
  );
});

test("la configuración es lazy y normaliza espacios del spreadsheet y la pestaña", async () => {
  const unconfigured = createInscripcionSheetStore({ spreadsheetId: "   " });
  assert.equal(unconfigured.configured, false);
  assert.equal(unconfigured.spreadsheetId, "");
  await assert.rejects(
    () => unconfigured.ensureReady(),
    (error) => {
      assert.equal(error instanceof GoogleSheetsConfigurationError, true);
      assert.equal(error.code, "GOOGLE_SHEETS_NOT_CONFIGURED");
      return true;
    },
  );

  const sheetName = "Inscripciones 2026";
  const fake = fakeSheetsClient({
    publicSheet: {
      properties: {
        sheetId: 11,
        title: sheetName,
        hidden: false,
        gridProperties: {
          columnCount: INSCRIPCION_PUBLIC_COLUMNS.length,
          frozenRowCount: 1,
        },
      },
    },
  });
  const store = createInscripcionSheetStore({
    sheetsClient: fake.client,
    spreadsheetId: `  ${SPREADSHEET_ID}  `,
    sheetName: `  ${sheetName}  `,
  });

  assert.equal(store.configured, true);
  assert.equal(store.spreadsheetId, SPREADSHEET_ID);
  assert.equal(store.sheetName, sheetName);
  await store.ensureReady();

  assert.equal(fake.spreadsheetGet.mock.calls[0].arguments[0].spreadsheetId, SPREADSHEET_ID);
  const headerRequest = fake.valuesGet.mock.calls.find(
    ({ arguments: [request] }) => request.range === "'Inscripciones 2026'!A1:AF1",
  );
  assert.ok(headerRequest);
});

test("el store encuentra por UUID sin distinguir mayúsculas", async () => {
  const record = buildInscripcionRecord({
    payload: registrationPayload(),
    payloadFingerprint: "stored-fingerprint",
    emailStatus: "sent",
  });
  record.gmail_message_id = "gmail-existing";
  const metadataLength = columnIndex("email_error") + 1;
  const fake = fakeSheetsClient({ rows: [recordToSheetRow(record).slice(0, metadataLength)] });
  const store = createInscripcionSheetStore({
    sheetsClient: fake.client,
    spreadsheetId: SPREADSHEET_ID,
  });

  const found = await store.findBySubmissionId(SUBMISSION_ID.toUpperCase());
  assert.equal(found.rowNumber, 2);
  assert.equal(found.record.submission_id, SUBMISSION_ID);
  assert.equal(found.record.payload_fingerprint, "stored-fingerprint");
  assert.equal(found.record.email_status, "sent");
  assert.equal(found.record.gmail_message_id, "gmail-existing");

  const rowLookup = fake.valuesBatchGet.mock.calls[0].arguments[0];
  assert.deepEqual(rowLookup.ranges, [
    "'_Inscripciones sistema'!A2:K",
    "'_Inscripciones sistema'!AT2:BD",
  ]);
  assert.equal(rowLookup.majorDimension, "ROWS");
});

test("el lookup batch mantiene A:K ligero y alinea Drive desde AT:BD", async () => {
  const archive = driveArchive();
  const record = buildInscripcionRecord({
    payload: registrationPayload(),
    payloadFingerprint: "stored-fingerprint",
    emailStatus: "error",
    driveArchive: archive,
  });
  const metadataRow = recordToSheetRow(record).slice(0, 11);
  const driveRow = recordToSheetRow(record).slice(45);
  const fake = fakeSheetsClient({
    rows: ({ range }) => {
      if (range === "'_Inscripciones sistema'!A2:K") return [metadataRow];
      if (range === "'_Inscripciones sistema'!AT2:BD") return [driveRow];
      return [];
    },
  });
  const store = createInscripcionSheetStore({
    sheetsClient: fake.client,
    spreadsheetId: SPREADSHEET_ID,
  });

  const found = await store.findBySubmissionId(SUBMISSION_ID);
  assert.equal(found.rowNumber, 2);
  assert.equal(found.record.drive_status, "stored");
  assert.equal(found.record.drive_folder_id, archive.folder.id);
  assert.equal(found.record.snapshot_drive_file_id, archive.snapshot.id);
  assert.equal(found.record.drive_files_manifest, serializeDriveManifest(archive));
});

test("appendPending inserta una sola fila literal con RAW e INSERT_ROWS", async () => {
  const fake = fakeSheetsClient();
  const store = createInscripcionSheetStore({
    sheetsClient: fake.client,
    spreadsheetId: SPREADSHEET_ID,
    clock: () => new Date("2026-08-07T11:00:00.000Z"),
  });
  const payload = registrationPayload({
    answers: [
      { key: "comments", label: "Observaciones", value: '=IMPORTXML("https://invalid")' },
      { key: "contact_phone", label: "Teléfono", value: "+34971000000" },
      { key: "bank_details", label: "IBAN", value: "-ES0000000000000000000000" },
      { key: "participant_health_information", label: "Salud", value: "@texto" },
    ],
  });

  const appended = await store.appendPending({ payload, payloadFingerprint: "fingerprint-test" });
  assert.equal(appended.rowNumber, 42);
  assert.equal(appended.record.server_received_at, "2026-08-07T11:00:00.000Z");

  const request = fake.valuesAppend.mock.calls[0].arguments[0];
  assert.equal(request.spreadsheetId, SPREADSHEET_ID);
  assert.equal(request.range, "'_Inscripciones sistema'!A:BD");
  assert.equal(request.valueInputOption, "RAW");
  assert.equal(request.insertDataOption, "INSERT_ROWS");
  assert.equal(request.requestBody.majorDimension, "ROWS");
  assert.equal(request.requestBody.values.length, 1);
  assert.equal(request.requestBody.values[0][columnIndex("comments")], '=IMPORTXML("https://invalid")');
  assert.equal(request.requestBody.values[0][columnIndex("contact_phone")], "+34971000000");
  assert.equal(request.requestBody.values[0][columnIndex("bank_details")], "-ES0000000000000000000000");
  assert.equal(request.requestBody.values[0][columnIndex("participant_health_information")], "@texto");
});

test("markSent y markError actualizan únicamente I:K usando RAW", async () => {
  const fake = fakeSheetsClient();
  const store = createInscripcionSheetStore({
    sheetsClient: fake.client,
    spreadsheetId: SPREADSHEET_ID,
  });

  await store.markSent(42, "gmail-42");
  await store.markError(43, Object.assign(new Error("Gmail no disponible"), { code: "GMAIL_DOWN" }));

  assert.equal(fake.valuesUpdate.mock.callCount(), 2);
  assert.deepEqual(fake.valuesUpdate.mock.calls[0].arguments[0], {
    spreadsheetId: SPREADSHEET_ID,
    range: "'_Inscripciones sistema'!I42:K42",
    valueInputOption: "RAW",
    requestBody: {
      majorDimension: "ROWS",
      values: [["sent", "gmail-42", ""]],
    },
  });
  assert.deepEqual(fake.valuesUpdate.mock.calls[1].arguments[0], {
    spreadsheetId: SPREADSHEET_ID,
    range: "'_Inscripciones sistema'!I43:K43",
    valueInputOption: "RAW",
    requestBody: {
      majorDimension: "ROWS",
      values: [["error", "", "GMAIL_DOWN: Gmail no disponible"]],
    },
  });
});

test("markDrivePlanned/Stored escriben AT:BD y markDriveError solo AT:AU con RAW", async () => {
  const archive = driveArchive();
  const externalError = Object.assign(new Error("DNI 12345678Z dentro del mensaje"), {
    name: "GaxiosError",
    code: "E_DRIVE",
    response: { status: 503 },
    config: { requestBody: "raw MIME secreto" },
  });
  const fake = fakeSheetsClient({
    rows: ({ range }) => (range.endsWith("!A42:A42") ? [[SUBMISSION_ID]] : []),
  });
  const store = createInscripcionSheetStore({
    sheetsClient: fake.client,
    spreadsheetId: SPREADSHEET_ID,
  });

  await store.markDrivePlanned(42, archive, SUBMISSION_ID);
  await store.markDriveStored(42, archive, SUBMISSION_ID);
  await store.markDriveError(42, externalError, SUBMISSION_ID);

  const updates = fake.valuesUpdate.mock.calls.map(({ arguments: [request] }) => request);
  assert.equal(updates.length, 4);
  assert.equal(updates[0].range, "'_Inscripciones sistema'!AT42:BD42");
  assert.equal(updates[0].valueInputOption, "RAW");
  assert.equal(updates[0].requestBody.values[0][0], "planned");
  assert.equal(updates[0].requestBody.values[0].length, 11);
  assert.equal(updates[0].requestBody.values[0].at(-1), serializeDriveManifest(archive));
  assert.equal(updates[1].range, "'Inscripciones'!A42:AF42");
  assert.equal(updates[1].requestBody.values[0].length, INSCRIPCION_PUBLIC_COLUMNS.length);
  assert.equal(updates[2].range, "'_Inscripciones sistema'!AT42:BD42");
  assert.equal(updates[2].requestBody.values[0][0], "stored");
  assert.equal(updates[3].range, "'_Inscripciones sistema'!AT42:AU42");
  assert.deepEqual(updates[3].requestBody.values, [[
    "error",
    "E_DRIVE (503): External API request failed.",
  ]]);
  assert.doesNotMatch(updates[3].requestBody.values[0][1], /12345678Z|raw MIME secreto/);
});

test("verifica expectedSubmissionId antes de actualizar una fila", async (t) => {
  await t.test("la fila sigue perteneciendo al envío", async () => {
    const fake = fakeSheetsClient({
      rows: ({ range }) =>
        range === "'_Inscripciones sistema'!A42:A42" ? [[SUBMISSION_ID]] : [],
    });
    const store = createInscripcionSheetStore({
      sheetsClient: fake.client,
      spreadsheetId: SPREADSHEET_ID,
    });

    await store.markSent(42, "gmail-verified", SUBMISSION_ID.toUpperCase());

    const verification = fake.valuesGet.mock.calls.find(
      ({ arguments: [request] }) =>
        request.range === "'_Inscripciones sistema'!A42:A42",
    );
    assert.ok(verification);
    assert.equal(verification.arguments[0].majorDimension, "ROWS");
    assert.equal(fake.valuesUpdate.mock.callCount(), 1);
  });

  await t.test("la fila ya pertenece a otro envío", async () => {
    const otherSubmissionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const fake = fakeSheetsClient({
      rows: ({ range }) =>
        range === "'_Inscripciones sistema'!A42:A42" ? [[otherSubmissionId]] : [],
    });
    const store = createInscripcionSheetStore({
      sheetsClient: fake.client,
      spreadsheetId: SPREADSHEET_ID,
    });

    await assert.rejects(
      () => store.markError(42, new Error("Gmail falló"), SUBMISSION_ID),
      (error) => {
        assert.equal(error instanceof GoogleSheetsRowMismatchError, true);
        assert.equal(error.code, "GOOGLE_SHEETS_ROW_MISMATCH");
        assert.equal(error.status, 409);
        assert.equal(error.rowNumber, 42);
        return true;
      },
    );
    assert.equal(fake.valuesUpdate.mock.callCount(), 0);
  });

  await t.test("Drive tampoco actualiza una fila que cambió de envío", async () => {
    const fake = fakeSheetsClient({
      rows: ({ range }) =>
        range === "'_Inscripciones sistema'!A42:A42"
          ? [["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]]
          : [],
    });
    const store = createInscripcionSheetStore({
      sheetsClient: fake.client,
      spreadsheetId: SPREADSHEET_ID,
    });
    await assert.rejects(
      () => store.markDriveStored(42, driveArchive(), SUBMISSION_ID),
      GoogleSheetsRowMismatchError,
    );
    assert.equal(fake.valuesUpdate.mock.callCount(), 0);
  });
});
