import assert from "node:assert/strict";
import test from "node:test";
import { createPublicSheetSync, planPublicSheetSync, PUBLIC_MANAGEMENT_HEADERS } from "../server/public-sheet-sync.js";
import {
  buildInscripcionPublicRow, buildInscripcionRecord, createInscripcionSheetStore,
  INSCRIPCION_PUBLIC_COLUMNS, INSCRIPCION_SHEET_COLUMNS, recordToSheetRow, sheetRowToRecord,
} from "../server/inscripcion-sheet.js";
import {
  buildPreinscripcionPublicRow, buildPreinscripcionRecord, createPreinscripcionSheetStore,
  PREINSCRIPCION_PUBLIC_COLUMNS, PREINSCRIPCION_SHEET_COLUMNS,
  preinscripcionRecordToSheetRow, preinscripcionSheetRowToRecord,
} from "../server/preinscripcion-sheet.js";

const ids = ["5b661911-7d24-4466-82bc-9b9179084a51", "5b661911-7d24-4466-82bc-9b9179084a52"];
const configs = [
  { type: "inscripcion", sheetName: "Inscripciones", systemSheetName: "_Inscripciones sistema",
    columns: INSCRIPCION_PUBLIC_COLUMNS, systemColumns: INSCRIPCION_SHEET_COLUMNS,
    buildRow: buildInscripcionPublicRow, parseRow: sheetRowToRecord, record: buildInscripcionRecord,
    toRow: recordToSheetRow, store: createInscripcionSheetStore },
  { type: "preinscripcion", sheetName: "Periodos de prueba", systemSheetName: "_Pruebas sistema",
    columns: PREINSCRIPCION_PUBLIC_COLUMNS, systemColumns: PREINSCRIPCION_SHEET_COLUMNS,
    buildRow: buildPreinscripcionPublicRow, parseRow: preinscripcionSheetRowToRecord,
    record: buildPreinscripcionRecord, toRow: preinscripcionRecordToSheetRow, store: createPreinscripcionSheetStore },
];

function payload(config, index = 0) {
  return { type: config.type, submissionId: ids[index], answers: [
    { key: "participant_full_name", value: index ? "Segunda persona" : "Primera persona" },
    { key: "participant_document_number", value: "DOCUMENTO-COMPARTIDO" },
    { key: "contact_phone", value: "600000000" },
  ] };
}

function recordsFor(config) {
  return ids.map((id, i) => config.record({ payload: payload(config, i),
    receivedAt: "2026-09-23T10:30:00.000Z", driveStatus: i ? "error" : "stored" }));
}

function fakeSheets(config, records, publicRows, { managed = false } = {}) {
  const data = new Map([
    [config.sheetName, [[...config.columns.map((c) => c.header), ...(managed ? PUBLIC_MANAGEMENT_HEADERS : [])], ...publicRows]],
    [config.systemSheetName, [config.systemColumns.map((c) => c.header), ...records.map(config.toRow)]],
  ]);
  const sheets = [...data].map(([title, rows], i) => ({ properties: {
    sheetId: i + 1, title, hidden: i === 1,
    gridProperties: { rowCount: 1000, columnCount: rows[0].length, frozenRowCount: 1 },
  } }));
  const writes = [];
  function parse(range) {
    const m = range.match(/^'([^']+)'!([A-Z]+)(\d*)?(?::([A-Z]+)(\d*)?)?$/);
    assert.ok(m, range);
    const col = (s) => [...s].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
    return { title: m[1], start: Number(m[3] || 1) - 1, end: Number(m[5] || (m[4] ? 1000 : m[3] || 1)),
      first: col(m[2]), last: col(m[4] || m[2]) + 1 };
  }
  function write(range, values) {
    const p = parse(range), rows = data.get(p.title);
    values.forEach((row, i) => {
      rows[p.start + i] ||= [];
      row.forEach((v, j) => { rows[p.start + i][p.first + j] = v; });
    });
  }
  const client = { spreadsheets: {
    get: async () => ({ data: { sheets: structuredClone(sheets) } }),
    batchUpdate: async ({ requestBody }) => {
      writes.push(requestBody);
      for (const req of requestBody.requests) {
        if (req.duplicateSheet) {
          const source = sheets.find((s) => s.properties.sheetId === req.duplicateSheet.sourceSheetId);
          data.set(req.duplicateSheet.newSheetName, structuredClone(data.get(source.properties.title)));
        }
        if (req.updateSheetProperties) {
          const p = req.updateSheetProperties.properties;
          const target = sheets.find((s) => s.properties.sheetId === p.sheetId).properties;
          Object.assign(target.gridProperties, p.gridProperties);
        }
        if (req.updateCells) {
          const { range, rows } = req.updateCells;
          const title = sheets.find((s) => s.properties.sheetId === range.sheetId).properties.title;
          data.set(title, rows.map((r) => r.values.map(({ userEnteredValue: v }) => v.numberValue ?? v.stringValue)));
        }
      }
      return { data: {} };
    },
    values: {
      get: async ({ range }) => {
        const p = parse(range);
        return { data: { values: data.get(p.title).slice(p.start, p.end).map((r) => r.slice(p.first, p.last)) } };
      },
      update: async ({ range, requestBody }) => { writes.push({ range }); write(range, requestBody.values); return { data: {} }; },
      append: async ({ range, requestBody }) => {
        const p = parse(range), rows = data.get(p.title);
        await Promise.resolve();
        rows.push(...structuredClone(requestBody.values));
        writes.push({ range });
        return { data: { updates: { updatedRange: `'${p.title}'!A${rows.length}:BD${rows.length}` } } };
      },
      batchUpdate: async ({ requestBody }) => {
        writes.push(requestBody);
        requestBody.data.forEach(({ range, values }) => write(range, values));
        return { data: {} };
      },
    },
  } };
  return { client, data, sheets, writes };
}

for (const config of configs) {
  test(`${config.type}: migra huecos, orden y ediciones sin fusionar familias`, async () => {
    const records = recordsFor(config);
    const row = config.buildRow(records[0]);
    row[0] = 46288 + 12.5 / 24;
    const comments = config.columns.findIndex((c) => c.key === "comments");
    row[comments] = "Anotación manual";
    const fake = fakeSheets(config, records, [[], row, []]);
    fake.sheets[0].basicFilter = { range: { sheetId: 1, endColumnIndex: config.columns.length, endRowIndex: 3 } };
    const sync = createPublicSheetSync({ ...config, client: fake.client, spreadsheetId: "test" });
    const dry = await sync.reconcile();
    assert.equal(fake.writes.length, 0);
    assert.equal(dry.linked, 1);
    assert.equal(dry.added, 1);
    assert.deepEqual(dry.issues, []);
    const result = await sync.reconcile({ apply: true });
    const actual = fake.data.get(config.sheetName);
    assert.equal(actual.length, 3);
    assert.equal(actual[1][comments], "Anotación manual");
    assert.equal(actual[1][0], row[0]);
    assert.equal(actual[2][config.columns.length], ids[1]);
    assert.equal(actual[2][config.columns.length + 2], "error");
    assert.equal(fake.data.get(result.backupName)[2][comments], "Anotación manual");
    const filter = fake.writes[0].requests.find((r) => r.setBasicFilter).setBasicFilter.filter;
    assert.equal(filter.range.endColumnIndex, config.columns.length + 4);
  });

  test(`${config.type}: actualiza por UUID y conserva gestión tras ordenar`, async () => {
    const records = recordsFor(config);
    const rows = records.map((r, i) => [...config.buildRow(r), ids[i], i ? "prueba" : "sí", r.drive_status, "pending"]).reverse();
    const fake = fakeSheets(config, records, rows, { managed: true });
    const store = config.store({ sheetsClient: fake.client, spreadsheetId: "test", readinessTtlMs: 60000 });
    await store.markSent(2, "gmail-test", ids[0]);
    await store.markDriveError(3, new Error("Error controlado"), ids[1]);
    const actual = fake.data.get(config.sheetName);
    assert.equal(actual.length, 3);
    assert.deepEqual(actual[1].slice(config.columns.length), [ids[1], "prueba", "error", "pending"]);
    assert.deepEqual(actual[2].slice(config.columns.length), [ids[0], "sí", "stored", "sent"]);
    assert.equal(fake.data.get(config.systemSheetName)[1][8], "sent");
  });

  test(`${config.type}: envíos pendientes visibles e idempotentes con concurrencia`, async () => {
    const records = recordsFor(config);
    const fake = fakeSheets(config, [], [], { managed: true });
    const sync = createPublicSheetSync({ ...config, client: fake.client, spreadsheetId: "test" });
    await Promise.all([sync.upsert(records[0]), sync.upsert(records[1]), sync.upsert(records[0])]);
    assert.equal(fake.data.get(config.sheetName).length, 3);
    const store = config.store({ sheetsClient: fake.client, spreadsheetId: "test" });
    await store.appendPending({ payload: payload(config), receivedAt: "2026-09-23T10:30:00.000Z" });
    assert.equal(fake.data.get(config.sheetName).length, 3);
    assert.equal(fake.data.get(config.sheetName)[1][config.columns.length + 2], "pending");
  });

  test(`${config.type}: un fallo de la vista no pierde el estado de correo enviado`, async () => {
    const records = recordsFor(config);
    const rows = records.map((r, i) => [...config.buildRow(r), ids[i], "pendiente", r.drive_status, "pending"]);
    const fake = fakeSheets(config, records, rows, { managed: true });
    fake.client.spreadsheets.values.batchUpdate = async () => { throw new Error("Vista no disponible"); };
    const store = config.store({ sheetsClient: fake.client, spreadsheetId: "test" });
    await assert.rejects(store.markSent(2, "gmail-test", ids[0]), /Vista no disponible/);
    assert.equal(fake.data.get(config.systemSheetName)[1][8], "sent");
    assert.equal(fake.data.get(config.systemSheetName)[1][9], "gmail-test");
  });

  test(`${config.type}: publica los enlaces en la fila correcta sin borrar anotaciones`, async () => {
    const records = recordsFor(config);
    const rows = records.map((r, i) => [...config.buildRow(r), ids[i], "prueba", r.drive_status, "pending"]).reverse();
    const comments = config.columns.findIndex((c) => c.key === "comments");
    rows[0][comments] = "Anotación conservada";
    const fake = fakeSheets(config, records, rows, { managed: true });
    const store = config.store({ sheetsClient: fake.client, spreadsheetId: "test" });
    const archive = { version: 1, submissionId: ids[1],
      folder: { id: "folder-test", url: "https://drive.google.test/folder" },
      snapshot: { id: "snapshot-test", url: "https://drive.google.test/snapshot" },
      attachments: [{ key: "participant_document_front", id: "document-test", url: "https://drive.google.test/document" }],
    };
    await store.markDriveStored(3, archive, ids[1]);
    const actual = fake.data.get(config.sheetName)[1];
    const linkKey = config.type === "inscripcion" ? "participant_document_front" : "snapshot_drive_url";
    const link = config.columns.findIndex((c) => c.key === linkKey);
    assert.equal(actual[link], config.type === "inscripcion" ? archive.attachments[0].url : archive.snapshot.url);
    assert.equal(actual[comments], "Anotación conservada");
    assert.equal(actual[config.columns.length + 1], "prueba");
    assert.equal(actual[config.columns.length + 2], "stored");
    assert.equal(fake.data.get(config.sheetName).length, 3);
  });
}

test("rechaza correspondencias ambiguas y UUID visibles duplicados antes de escribir", async () => {
  const config = configs[0], records = recordsFor(config);
  records[1].participant_full_name = records[0].participant_full_name;
  const fake = fakeSheets(config, records, [config.buildRow(records[0])]);
  const sync = createPublicSheetSync({ ...config, client: fake.client, spreadsheetId: "test" });
  await assert.rejects(sync.reconcile({ apply: true }), { code: "PUBLIC_SHEET_RECONCILIATION_REQUIRED" });
  assert.equal(fake.writes.length, 0);
  const row = [...config.buildRow(records[0]), ids[0], "sí", "stored", "sent"];
  const plan = planPublicSheetSync({ ...config, records, publicRows: [row, row] });
  assert.equal(plan.issues[0].reason, "duplicate_public_id");
});

test("reconciliar de nuevo conserva decisiones y no excluye nombres de prueba", () => {
  const config = configs[0], records = recordsFor(config);
  records[0].participant_full_name = "Prova";
  const first = planPublicSheetSync({ ...config, records, publicRows: [] });
  first.rows[0][config.columns.length + 1] = "prueba";
  const second = planPublicSheetSync({ ...config, records, publicRows: first.rows });
  assert.equal(second.total, 2);
  assert.equal(second.added, 0);
  assert.equal(second.rows[0][config.columns.length + 1], "prueba");
  assert.equal(second.rows[1][config.columns.length + 1], "pendiente");
});

test("la verificación acepta un filtro que reordena filas completas, pero detecta contenido alterado", async () => {
  for (const corrupt of [false, true]) {
    const config = configs[0], records = recordsFor(config);
    const fake = fakeSheets(config, records, records.map(config.buildRow));
    const batchUpdate = fake.client.spreadsheets.batchUpdate;
    fake.client.spreadsheets.batchUpdate = async (request) => {
      const response = await batchUpdate(request);
      const [header, ...rows] = fake.data.get(config.sheetName);
      rows.reverse();
      if (corrupt) rows[0][1] = "Contenido alterado";
      fake.data.set(config.sheetName, [header, ...rows]);
      return response;
    };
    const sync = createPublicSheetSync({ ...config, client: fake.client, spreadsheetId: "test" });
    if (corrupt) await assert.rejects(sync.reconcile({ apply: true }), /verificar/);
    else assert.equal((await sync.reconcile({ apply: true })).total, 2);
  }
});
