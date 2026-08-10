import assert from "node:assert/strict";
import crypto from "node:crypto";
import test, { mock } from "node:test";

import {
  DRIVE_ARCHIVE_VERSION,
  DrivePayloadConflictError,
  GOOGLE_DRIVE_FOLDER_MIME_TYPE,
  GOOGLE_DRIVE_SCOPE,
  GoogleDriveConfigurationError,
  GoogleDriveSecurityError,
  RESUMABLE_UPLOAD_THRESHOLD_BYTES,
  createArchiveDescriptors,
  createEnvironmentDriveAuth,
  createGoogleDriveClient,
  createInscripcionDriveStore,
  createPreinscripcionDriveStore,
  legacyAttachmentKey,
  normalizeDriveFolderId,
  safeDriveFilename,
  selectCanonicalDriveFile,
} from "../server/inscripcion-drive.js";

const SUBMISSION_ID = "123e4567-e89b-42d3-a456-426614174000";
const PARENT_ID = "parentFolder12345";
const GENERATED_IDS = [
  "plannedFolder0001",
  "plannedSnapshot01",
  "plannedAttachment01",
  "plannedAttachment02",
];

const SNAPSHOT = {
  originalname: "captura-inscripcion.jpg",
  mimetype: "image/jpeg",
  buffer: Buffer.from([0xff, 0xd8, 0xff, 0x01]),
};
const UPLOADED_FILES = [
  {
    originalname: "DNI original.pdf",
    mimetype: "application/pdf",
    buffer: Buffer.from("%PDF-documento"),
  },
];

function payload(overrides = {}) {
  return {
    submissionId: SUBMISSION_ID,
    type: "inscripcion",
    attachments: [
      {
        index: 0,
        key: "participant_document_front",
        label: "Documento delantero",
        name: "../DNI 12345678Z.pdf",
      },
    ],
    ...overrides,
  };
}

function notFound() {
  return Object.assign(new Error("not found"), { response: { status: 404 } });
}

function conflict() {
  return Object.assign(new Error("already exists"), { response: { status: 409 } });
}

function fakeDriveClient({
  driveId = "sharedDrive12345",
  permissions = [],
  permissionPages,
  generatedIds = GENERATED_IDS,
  createHook,
  getHook,
} = {}) {
  const created = new Map();
  const parent = {
    id: PARENT_ID,
    name: "Inscripciones privadas",
    mimeType: GOOGLE_DRIVE_FOLDER_MIME_TYPE,
    trashed: false,
    driveId,
    capabilities: { canAddChildren: true },
  };

  const filesGet = mock.fn(async (request) => {
    if (getHook) {
      const hooked = await getHook(request, created);
      if (hooked !== undefined) return hooked;
    }
    if (request.fileId === PARENT_ID) return { data: parent };
    const file = created.get(request.fileId);
    if (!file) throw notFound();
    return { data: file };
  });
  const permissionsList = mock.fn(async ({ pageToken } = {}) => {
    if (!permissionPages) return { data: { permissions } };
    const pageIndex = pageToken ? Number(pageToken) : 0;
    const page = permissionPages[pageIndex] || [];
    return {
      data: {
        permissions: page,
        ...(pageIndex + 1 < permissionPages.length
          ? { nextPageToken: String(pageIndex + 1) }
          : {}),
      },
    };
  });
  const permissionsCreate = mock.fn(async () => {
    throw new Error("Nunca se deben crear permisos públicos");
  });
  const filesGenerateIds = mock.fn(async ({ count }) => ({
    data: { ids: generatedIds.slice(0, count) },
  }));
  const filesCreate = mock.fn(async (request) => {
    if (createHook) {
      const hooked = await createHook(request, created);
      if (hooked !== undefined) return hooked;
    }
    const id = request.requestBody.id;
    if (created.has(id)) throw conflict();
    const data = {
      id,
      name: request.requestBody.name,
      mimeType: request.requestBody.mimeType || request.media?.mimeType,
      parents: [...request.requestBody.parents],
      appProperties: { ...request.requestBody.appProperties },
      webViewLink: `https://drive.google.test/${id}`,
      createdTime: "2026-08-07T12:00:00.000Z",
    };
    created.set(id, data);
    return { data };
  });

  return {
    client: {
      files: {
        get: filesGet,
        generateIds: filesGenerateIds,
        create: filesCreate,
      },
      permissions: {
        list: permissionsList,
        create: permissionsCreate,
      },
    },
    created,
    filesGet,
    filesGenerateIds,
    filesCreate,
    permissionsList,
    permissionsCreate,
  };
}

function storeFor(fake, overrides = {}) {
  return createInscripcionDriveStore({
    driveClient: fake.client,
    folderId: `  ${PARENT_ID}  `,
    sharedDriveId: "sharedDrive12345",
    environment: {},
    wait: async () => undefined,
    ...overrides,
  });
}

test("normaliza nombres/rutas y crea descriptores con slot, tamaño, MIME y SHA-256", () => {
  const unsafeName = "../carpeta\\\u202eDNI\u0000   persona.pdf";
  const safe = safeDriveFilename(unsafeName);
  assert.equal(safe, "DNI persona.pdf");
  assert.doesNotMatch(safe, /[\\/\u0000\u202e]/);
  assert.equal(safeDriveFilename("", "captura.jpg"), "captura.jpg");
  assert.equal(safeDriveFilename("x".repeat(200)).length, 180);
  assert.equal(normalizeDriveFolderId(` ${PARENT_ID} `), PARENT_ID);
  assert.throws(() => normalizeDriveFolderId("../../corta"), GoogleDriveConfigurationError);

  const descriptors = createArchiveDescriptors(payload(), SNAPSHOT, UPLOADED_FILES);
  assert.equal(descriptors.length, 2);
  assert.deepEqual(
    descriptors.map(({ kind, slot, key, name, mimeType, size }) => ({
      kind,
      slot,
      key,
      name,
      mimeType,
      size,
    })),
    [
      {
        kind: "snapshot",
        slot: "snapshot",
        key: "snapshot",
        name: "00-captura-inscripcion.jpg",
        mimeType: "image/jpeg",
        size: SNAPSHOT.buffer.length,
      },
      {
        kind: "attachment",
        slot: "attachment_0",
        key: "participant_document_front",
        name: "01-DNI 12345678Z.pdf",
        mimeType: "application/pdf",
        size: UPLOADED_FILES[0].buffer.length,
      },
    ],
  );
  assert.equal(
    descriptors[1].sha256,
    crypto.createHash("sha256").update(UPLOADED_FILES[0].buffer).digest("hex"),
  );
  assert.throws(
    () => createArchiveDescriptors(payload(), SNAPSHOT, []),
    /no coinciden/,
  );
  assert.throws(
    () => createArchiveDescriptors(payload(), { buffer: "texto" }, UPLOADED_FILES),
    /binario válido/,
  );
});

test("recupera las claves de los cuatro adjuntos del frontend anterior", () => {
  const labels = [
    ["Documento de identidad · parte delantera", "participant_document_front"],
    ["Documento de identidad · parte trasera", "participant_document_back"],
    ["DNI/NIE del tutor legal · parte delantera", "guardian_document_front"],
    ["DNI/NIE del tutor legal · parte trasera", "guardian_document_back"],
  ];
  labels.forEach(([label, expectedKey]) => {
    assert.equal(legacyAttachmentKey(label), expectedKey);
    const descriptors = createArchiveDescriptors(
      payload({ attachments: [{ index: 0, label, name: "documento.pdf" }] }),
      SNAPSHOT,
      UPLOADED_FILES,
    );
    assert.equal(descriptors[1].key, expectedKey);
  });
  assert.equal(legacyAttachmentKey("Otro documento"), "");
});

test("crea auth/client con scope Drive y distingue ADC de OAuth", () => {
  const googleAuth = mock.fn(function GoogleAuth(options) {
    this.options = options;
  });
  const setCredentials = mock.fn();
  const oauth2 = mock.fn(function OAuth2(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.setCredentials = setCredentials;
  });
  const drive = mock.fn(({ version, auth }) => ({ version, auth }));
  const googleApi = { auth: { GoogleAuth: googleAuth, OAuth2: oauth2 }, drive };

  const adc = createEnvironmentDriveAuth({ environment: {}, googleApi });
  assert.equal(adc.mode, "adc");
  assert.deepEqual(adc.auth.options, { scopes: [GOOGLE_DRIVE_SCOPE] });

  const oauth = createEnvironmentDriveAuth({
    environment: {
      GOOGLE_DRIVE_REFRESH_TOKEN: " refresh ",
      GOOGLE_DRIVE_CLIENT_ID: " client ",
      GOOGLE_DRIVE_CLIENT_SECRET: " secret ",
    },
    googleApi,
  });
  assert.equal(oauth.mode, "oauth");
  assert.equal(oauth.auth.clientId, "client");
  assert.deepEqual(setCredentials.mock.calls.at(-1).arguments[0], { refresh_token: "refresh" });
  assert.throws(
    () => createEnvironmentDriveAuth({
      environment: { GOOGLE_DRIVE_REFRESH_TOKEN: "token" },
      googleApi,
    }),
    GoogleDriveConfigurationError,
  );

  const client = createGoogleDriveClient({ auth: oauth.auth, googleApi });
  assert.equal(client.version, "v3");
  assert.equal(client.auth, oauth.auth);
});

test("valida de forma lazy una carpeta privada; ADC exige Shared Drive y OAuth admite Mi unidad", async (t) => {
  await t.test("config lazy y trim", async () => {
    const fake = fakeDriveClient();
    const store = storeFor(fake);
    assert.equal(store.configured, true);
    assert.equal(store.folderId, PARENT_ID);
    assert.equal(store.authMode, "adc");
    assert.equal(fake.filesGet.mock.callCount(), 0);
    await store.ensureReady();
    assert.equal(fake.filesGet.mock.callCount(), 1);
    assert.equal(fake.permissionsList.mock.callCount(), 1);
    assert.equal(fake.permissionsCreate.mock.callCount(), 0);
  });

  await t.test("rechaza carpeta pública", async () => {
    const fake = fakeDriveClient({ permissions: [{ id: "public", type: "anyone", role: "reader" }] });
    await assert.rejects(() => storeFor(fake).ensureReady(), GoogleDriveSecurityError);
    assert.equal(fake.permissionsCreate.mock.callCount(), 0);
  });

  await t.test("rechaza permisos para todo un dominio", async () => {
    const fake = fakeDriveClient({
      permissions: [{ id: "domain", type: "domain", role: "reader" }],
    });
    await assert.rejects(() => storeFor(fake).ensureReady(), GoogleDriveSecurityError);
  });

  await t.test("revisa todas las páginas de permisos antes de aceptar la carpeta", async () => {
    const fake = fakeDriveClient({
      permissionPages: [
        [{ id: "private", type: "group", role: "writer" }],
        [{ id: "public", type: "anyone", role: "reader" }],
      ],
    });
    await assert.rejects(() => storeFor(fake).ensureReady(), GoogleDriveSecurityError);
    assert.equal(fake.permissionsList.mock.callCount(), 2);
    assert.equal(fake.permissionsList.mock.calls[0].arguments[0].pageSize, 100);
    assert.equal(fake.permissionsList.mock.calls[1].arguments[0].pageToken, "1");
  });

  await t.test("ignora un permiso anyone borrado", async () => {
    const fake = fakeDriveClient({
      permissions: [{ id: "old", type: "anyone", role: "reader", deleted: true }],
    });
    await storeFor(fake).ensureReady();
  });

  await t.test("ADC exige unidad compartida", async () => {
    const fake = fakeDriveClient({ driveId: "" });
    await assert.rejects(() => storeFor(fake).ensureReady(), (error) => {
      assert.equal(error instanceof GoogleDriveConfigurationError, true);
      assert.match(error.message, /unidad compartida/);
      return true;
    });
  });

  await t.test("OAuth permite Mi unidad", async () => {
    const fake = fakeDriveClient({ driveId: "" });
    const store = storeFor(fake, {
      environment: { GOOGLE_DRIVE_REFRESH_TOKEN: "token" },
      sharedDriveId: "",
    });
    assert.equal(store.authMode, "oauth");
    await store.ensureReady();
  });

  const unconfigured = createInscripcionDriveStore({ folderId: "  ", driveClient: {} });
  assert.equal(unconfigured.configured, false);
  await assert.rejects(() => unconfigured.ensureReady(), GoogleDriveConfigurationError);

  const unpinnedSharedDrive = createInscripcionDriveStore({
    folderId: PARENT_ID,
    driveClient: fakeDriveClient().client,
    environment: {},
  });
  assert.equal(unpinnedSharedDrive.configured, false);
  await assert.rejects(
    () => unpinnedSharedDrive.ensureReady(),
    /GOOGLE_DRIVE_INSCRIPCION_SHARED_DRIVE_ID/,
  );
});

test("reserva todos los IDs y devuelve un plan completo antes de crear archivos", async () => {
  const fake = fakeDriveClient();
  const store = storeFor(fake);
  const plan = await store.planArchive({
    payload: payload(),
    snapshot: SNAPSHOT,
    uploadedFiles: UPLOADED_FILES,
  });

  assert.equal(plan.version, DRIVE_ARCHIVE_VERSION);
  assert.equal(plan.submissionId, SUBMISSION_ID);
  assert.equal(plan.parentFolderId, PARENT_ID);
  assert.equal(plan.folder.id, GENERATED_IDS[0]);
  assert.equal(plan.snapshot.id, GENERATED_IDS[1]);
  assert.equal(plan.attachments[0].id, GENERATED_IDS[2]);
  assert.match(plan.folder.name, new RegExp(SUBMISSION_ID));
  assert.match(plan.snapshot.sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(fake.filesGenerateIds.mock.calls[0].arguments[0], {
    count: 3,
    space: "drive",
    type: "files",
  });
  assert.equal(fake.filesCreate.mock.callCount(), 0);
  assert.equal(fake.permissionsCreate.mock.callCount(), 0);
});

test("el periodo de prueba usa carpeta y propiedades propias reutilizando el almacén", async () => {
  const fake = fakeDriveClient();
  const store = createPreinscripcionDriveStore({
    driveClient: fake.client,
    folderId: PARENT_ID,
    sharedDriveId: "sharedDrive12345",
    environment: {},
    wait: async () => undefined,
  });
  const trialPayload = payload({ type: "preinscripcion", attachments: [] });

  const plan = await store.planArchive({
    payload: trialPayload,
    snapshot: SNAPSHOT,
    uploadedFiles: [],
  });
  const archive = await store.reconcileArchive({
    plan,
    payload: trialPayload,
    snapshot: SNAPSHOT,
    uploadedFiles: [],
  });

  assert.equal(store.formType, "preinscripcion");
  assert.equal(plan.folder.name, `preinscripcion-${SUBMISSION_ID}`);
  assert.equal(archive.attachments.length, 0);
  assert.equal(
    fake.created.get(plan.folder.id).appProperties.loesport_kind,
    "preinscripcion_folder",
  );
  assert.equal(
    fake.created.get(plan.snapshot.id).appProperties.loesport_form_type,
    "preinscripcion",
  );
});

test("sin captura archiva los adjuntos y deja la referencia de captura vacía", async () => {
  const fake = fakeDriveClient();
  const store = storeFor(fake);
  const args = { payload: payload(), snapshot: null, uploadedFiles: UPLOADED_FILES };

  const descriptors = createArchiveDescriptors(args.payload, null, args.uploadedFiles);
  assert.equal(descriptors.length, 1);
  assert.equal(descriptors[0].kind, "attachment");

  const plan = await store.planArchive(args);
  assert.equal(plan.snapshot, null);
  assert.equal(plan.attachments.length, 1);
  assert.equal(plan.attachments[0].kind, "attachment");
  assert.deepEqual(fake.filesGenerateIds.mock.calls[0].arguments[0], {
    count: 2,
    space: "drive",
    type: "files",
  });

  const archive = await store.reconcileArchive({ plan, ...args });
  assert.equal(archive.snapshot, null);
  assert.equal(archive.attachments.length, 1);
  assert.equal(fake.created.size, 2);

  const second = await store.reconcileArchive({ plan, ...args });
  assert.equal(second.snapshot, null);
  assert.equal(second.attachments[0].id, archive.attachments[0].id);
});

test("sin adjuntos archiva únicamente carpeta y snapshot", async () => {
  const fake = fakeDriveClient();
  const store = storeFor(fake);
  const args = {
    payload: payload({ attachments: [] }),
    snapshot: SNAPSHOT,
    uploadedFiles: [],
  };
  const plan = await store.planArchive(args);
  const archive = await store.reconcileArchive({ plan, ...args });
  assert.deepEqual(archive.attachments, []);
  assert.equal(fake.filesGenerateIds.mock.calls[0].arguments[0].count, 2);
  assert.equal(fake.created.size, 2);
});

test("cachea readiness hasta el TTL y al expirar vuelve a comprobar privacidad", async () => {
  let readinessTime = 1_000;
  const permissions = [];
  const fake = fakeDriveClient({ permissions });
  const store = storeFor(fake, {
    readinessClock: () => readinessTime,
    readinessTtlMs: 5_000,
  });

  await store.ensureReady();
  readinessTime = 5_999;
  await store.ensureReady();
  assert.equal(fake.permissionsList.mock.callCount(), 1);

  permissions.push({ id: "public", type: "anyone", role: "reader" });
  readinessTime = 6_000;
  await assert.rejects(() => store.ensureReady(), GoogleDriveSecurityError);
  assert.equal(fake.filesGet.mock.callCount(), 2);
  assert.equal(fake.permissionsList.mock.callCount(), 2);
});

test("rechaza configuración temporal/reintentos e IDs reservados inválidos", async () => {
  const fake = fakeDriveClient();
  assert.throws(
    () => storeFor(fake, { readinessClock: 1 }),
    /temporal/,
  );
  assert.throws(
    () => storeFor(fake, { readinessTtlMs: -1 }),
    /no negativo/,
  );
  assert.throws(
    () => storeFor(fake, { retryDelaysMs: [0, -1] }),
    /reintentos/,
  );
  const invalidClock = storeFor(fake, { readinessClock: () => Number.NaN });
  assert.throws(() => invalidClock.ensureReady(), /fecha válida/);

  const invalidIds = fakeDriveClient({ generatedIds: ["corto"] });
  const invalidIdStore = storeFor(invalidIds);
  await assert.rejects(
    () => invalidIdStore.planArchive({
      payload: payload(),
      snapshot: SNAPSHOT,
      uploadedFiles: UPLOADED_FILES,
    }),
    GoogleDriveConfigurationError,
  );
  assert.equal(invalidIds.filesCreate.mock.callCount(), 0);
});

test("reconcileArchive crea carpeta/archivos privados con IDs planificados y deduplica por 409/get", async () => {
  const fake = fakeDriveClient();
  const store = storeFor(fake);
  const args = { payload: payload(), snapshot: SNAPSHOT, uploadedFiles: UPLOADED_FILES };
  const plan = await store.planArchive(args);

  const first = await store.reconcileArchive({ plan, ...args });
  const second = await store.reconcileArchive({ plan, ...args });

  assert.equal(first.folder.id, plan.folder.id);
  assert.equal(first.snapshot.id, plan.snapshot.id);
  assert.equal(first.attachments[0].id, plan.attachments[0].id);
  assert.deepEqual(second, first);
  assert.equal(fake.created.size, 3);
  assert.equal(fake.filesCreate.mock.callCount(), 6);
  assert.ok(fake.filesGet.mock.calls.some(({ arguments: [request] }) => request.fileId === plan.folder.id));
  assert.ok(fake.filesGet.mock.calls.some(({ arguments: [request] }) => request.fileId === plan.snapshot.id));
  for (const { arguments: [request] } of fake.filesCreate.mock.calls) {
    assert.equal(request.supportsAllDrives, true);
    assert.equal(request.ignoreDefaultVisibility, true);
    assert.deepEqual(request.requestBody.parents, [
      request.requestBody.mimeType === GOOGLE_DRIVE_FOLDER_MIME_TYPE
        ? PARENT_ID
        : plan.folder.id,
    ]);
    assert.equal("permissions" in request.requestBody, false);
  }
  assert.equal(fake.permissionsCreate.mock.callCount(), 0);
});

test("un fallo parcial se reanuda sin duplicar carpeta ni archivos ya creados", async () => {
  let failAttachment = true;
  const fake = fakeDriveClient({
    createHook: async (request) => {
      if (request.requestBody.id === GENERATED_IDS[2] && failAttachment) {
        throw Object.assign(new Error("Drive attachment failed"), { response: { status: 400 } });
      }
      return undefined;
    },
  });
  const store = storeFor(fake);
  const args = { payload: payload(), snapshot: SNAPSHOT, uploadedFiles: UPLOADED_FILES };
  const plan = await store.planArchive(args);

  await assert.rejects(
    () => store.reconcileArchive({ plan, ...args }),
    /Drive attachment failed/,
  );
  assert.equal(fake.created.has(plan.folder.id), true);
  assert.equal(fake.created.has(plan.snapshot.id), true);
  assert.equal(fake.created.has(plan.attachments[0].id), false);

  failAttachment = false;
  const archive = await store.reconcileArchive({ plan, ...args });
  assert.equal(archive.attachments[0].id, plan.attachments[0].id);
  assert.equal(fake.created.size, 3);
});

test("rechaza un ID existente si sus propiedades no corresponden al plan", async () => {
  const fake = fakeDriveClient();
  const store = storeFor(fake);
  const args = { payload: payload(), snapshot: SNAPSHOT, uploadedFiles: UPLOADED_FILES };
  const plan = await store.planArchive(args);
  await store.reconcileArchive({ plan, ...args });
  fake.created.get(plan.snapshot.id).appProperties.loesport_file_slot = "attachment_9";

  await assert.rejects(
    () => store.reconcileArchive({ plan, ...args }),
    DrivePayloadConflictError,
  );
});

test("rechaza archivos planificados que se han movido a la papelera", async () => {
  const fake = fakeDriveClient();
  const store = storeFor(fake);
  const args = { payload: payload(), snapshot: SNAPSHOT, uploadedFiles: UPLOADED_FILES };
  const plan = await store.planArchive(args);
  await store.reconcileArchive({ plan, ...args });
  fake.created.get(plan.snapshot.id).trashed = true;

  await assert.rejects(
    () => store.reconcileArchive({ plan, ...args }),
    DrivePayloadConflictError,
  );
});

test("reconcilia una respuesta perdida y reintenta errores transitorios con esperas inyectadas", async () => {
  const waits = [];
  let loseFolderResponse = true;
  let transientSnapshot = true;
  const fake = fakeDriveClient({
    createHook: async (request, created) => {
      const id = request.requestBody.id;
      if (id === GENERATED_IDS[0] && loseFolderResponse) {
        loseFolderResponse = false;
        created.set(id, {
          id,
          name: request.requestBody.name,
          mimeType: GOOGLE_DRIVE_FOLDER_MIME_TYPE,
          parents: [...request.requestBody.parents],
          appProperties: { ...request.requestBody.appProperties },
        });
        throw Object.assign(new Error("timeout tras crear"), { response: { status: 503 } });
      }
      if (id === GENERATED_IDS[1] && transientSnapshot) {
        transientSnapshot = false;
        throw Object.assign(new Error("temporal"), { response: { status: 503 } });
      }
      return undefined;
    },
  });
  const store = storeFor(fake, { wait: async (delay) => waits.push(delay) });
  const args = { payload: payload(), snapshot: SNAPSHOT, uploadedFiles: UPLOADED_FILES };
  const plan = await store.planArchive(args);
  const archive = await store.reconcileArchive({ plan, ...args });

  assert.equal(archive.folder.id, plan.folder.id);
  assert.equal(archive.snapshot.id, plan.snapshot.id);
  assert.deepEqual(waits, [150]);
});

test("detecta cambios de bytes/MIME/tamaño/slot contra el plan persistido", async () => {
  const fake = fakeDriveClient();
  const store = storeFor(fake);
  const args = { payload: payload(), snapshot: SNAPSHOT, uploadedFiles: UPLOADED_FILES };
  const plan = await store.planArchive(args);
  const changedFiles = [{ ...UPLOADED_FILES[0], buffer: Buffer.from("%PDF-otro contenido") }];

  await assert.rejects(
    () => store.reconcileArchive({ plan, ...args, uploadedFiles: changedFiles }),
    (error) => {
      assert.equal(error instanceof DrivePayloadConflictError, true);
      assert.equal(error.code, "DRIVE_PAYLOAD_CONFLICT");
      assert.equal(error.status, 409);
      assert.equal(error.submissionId, SUBMISSION_ID);
      return true;
    },
  );
  assert.equal(fake.filesCreate.mock.callCount(), 0);
});

test("activa subida resumible solo por encima del umbral", async () => {
  const large = {
    originalname: "grande.pdf",
    mimetype: "application/pdf",
    buffer: Buffer.alloc(RESUMABLE_UPLOAD_THRESHOLD_BYTES + 1, 1),
  };
  const fake = fakeDriveClient();
  const store = storeFor(fake);
  const largePayload = payload({
    attachments: [{ index: 0, key: "participant_document_front", name: "grande.pdf" }],
  });
  const args = { payload: largePayload, snapshot: SNAPSHOT, uploadedFiles: [large] };
  const plan = await store.planArchive(args);
  await store.reconcileArchive({ plan, ...args });

  const snapshotCreate = fake.filesCreate.mock.calls.find(
    ({ arguments: [request] }) => request.requestBody.id === plan.snapshot.id,
  ).arguments[0];
  const attachmentCreate = fake.filesCreate.mock.calls.find(
    ({ arguments: [request] }) => request.requestBody.id === plan.attachments[0].id,
  ).arguments[0];
  assert.equal(snapshotCreate.uploadType, undefined);
  assert.equal(attachmentCreate.uploadType, "resumable");
});

test("selecciona canónico por fecha y después por ID sin depender del orden", () => {
  const late = { id: "z-file", createdTime: "2026-08-07T12:00:00.000Z" };
  const earlyB = { id: "b-file", createdTime: "2026-08-07T10:00:00.000Z" };
  const earlyA = { id: "a-file", createdTime: "2026-08-07T10:00:00.000Z" };
  assert.equal(selectCanonicalDriveFile([late, earlyB, earlyA]), earlyA);
  assert.equal(selectCanonicalDriveFile([earlyA, late, earlyB]), earlyA);
  assert.equal(selectCanonicalDriveFile([]), null);
});
