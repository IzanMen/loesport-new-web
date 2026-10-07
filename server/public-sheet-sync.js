import {
  columnName,
  normalizeSubmissionId,
  quoteSheetName,
  selectCanonicalSubmissionRow,
} from "./inscripcion-sheet.js";

export const PUBLIC_MANAGEMENT_HEADERS = Object.freeze([
  "ID de envío", "Estado gestión", "Estado de Drive", "Estado del correo",
]);

function populated(row) {
  return row?.some((value) => value !== "" && value != null);
}

function normalizedDate(value) {
  if (typeof value === "number") {
    return new Date(Math.round((value - 25569) * 86400) * 1000)
      .toISOString().slice(0, 19);
  }
  const match = String(value ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2}:\d{2})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}T${match[4]}` : String(value ?? "");
}

function normalizedText(value) {
  return String(value ?? "").trim().normalize("NFC").toLowerCase();
}

export function planPublicSheetSync({ records, publicRows, columns, buildRow }) {
  const width = columns.length;
  const byId = new Map();
  const issues = [];
  records.forEach((record, index) => {
    if (!record.submission_id) {
      issues.push({ rowNumber: index + 2, reason: "missing_system_id" });
      return;
    }
    const id = normalizeSubmissionId(record.submission_id);
    byId.set(id, [...(byId.get(id) || []), { record, rowNumber: index + 2 }]);
  });
  const canonical = new Map([...byId].map(([id, matches]) => [
    id, selectCanonicalSubmissionRow(matches).record,
  ]));
  for (const matches of byId.values()) {
    if (new Set(matches.map(({ record }) => record.payload_fingerprint).filter(Boolean)).size > 1) {
      issues.push({ rowNumber: matches[0].rowNumber, reason: "conflicting_system_id" });
    }
  }
  const projected = new Map([...canonical].map(([id, record]) => [id, buildRow(record)]));
  const nameIndex = columns.findIndex(({ key }) => key === "participant_full_name");
  const seen = new Set();
  const rows = [];
  let linked = 0;
  let added = 0;
  for (const [index, row] of publicRows.entries()) {
    if (!populated(row)) continue;
    let id = normalizedText(row[width]);
    if (!id) {
      // Legacy views may be sorted and contain native Sheets dates or manual edits.
      let candidates = [...projected].filter(([, values]) =>
        normalizedDate(values[0]) === normalizedDate(row[0]));
      if (candidates.length > 1) {
        candidates = candidates.filter(([, values]) =>
          normalizedText(values[nameIndex]) === normalizedText(row[nameIndex]));
      }
      if (candidates.length !== 1) {
        issues.push({ rowNumber: index + 2, reason: "legacy_identity_ambiguous" });
        continue;
      }
      id = candidates[0][0];
      linked += 1;
    }
    if (!canonical.has(id) || seen.has(id)) {
      issues.push({ rowNumber: index + 2, reason: seen.has(id) ? "duplicate_public_id" : "unknown_public_id" });
      continue;
    }
    seen.add(id);
    const record = canonical.get(id);
    rows.push([
      ...Array.from({ length: width }, (_, i) => row[i] ?? ""),
      id, row[width + 1] || "pendiente", record.drive_status || "pending",
      record.email_status || "pending",
    ]);
  }
  for (const [id, record] of canonical) {
    if (seen.has(id)) continue;
    rows.push([...projected.get(id), id, "pendiente", record.drive_status || "pending", record.email_status || "pending"]);
    added += 1;
  }
  return { rows, issues, linked, added, total: canonical.size };
}

export function createPublicSheetSync({
  client, spreadsheetId, sheetName, systemSheetName, columns, systemColumns,
  buildRow, parseRow,
}) {
  const publicName = quoteSheetName(sheetName);
  const systemName = quoteSheetName(systemSheetName);
  const width = columns.length;
  const firstMetadata = columnName(width + 1);
  const lastColumn = columnName(width + PUBLIC_MANAGEMENT_HEADERS.length);
  let queue = Promise.resolve();

  function serial(operation) {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
  }

  async function tabs() {
    const response = await client.spreadsheets.get({
      spreadsheetId, fields: "sheets(properties,basicFilter,filterViews)",
    });
    const sheets = response.data.sheets || [];
    const publicSheet = sheets.find(({ properties }) => properties.title === sheetName);
    const publicTab = publicSheet?.properties;
    const systemTab = sheets.find(({ properties }) => properties.title === systemSheetName)?.properties;
    if (!publicTab || !systemTab) throw new Error("Faltan las pestañas del formulario.");
    return { publicTab, systemTab, publicSheet };
  }

  async function read(range) {
    const response = await client.spreadsheets.values.get({
      spreadsheetId, range, majorDimension: "ROWS", valueRenderOption: "UNFORMATTED_VALUE",
    });
    return response.data.values || [];
  }

  async function plan() {
    const { publicTab, systemTab, publicSheet } = await tabs();
    const publicEnd = columnName(publicTab.gridProperties.columnCount);
    const [publicData, systemData] = await Promise.all([
      read(`${publicName}!A1:${publicEnd}${publicTab.gridProperties.rowCount}`),
      read(`${systemName}!A1:${columnName(systemColumns.length)}${systemTab.gridProperties.rowCount}`),
    ]);
    for (const [actual, expected] of [[publicData[0], columns], [systemData[0], systemColumns]]) {
      if (!expected.every(({ header }, i) => actual?.[i] === header)) {
        throw new Error("La cabecera no coincide con el esquema esperado.");
      }
    }
    const extraHeaders = publicData[0].slice(width);
    if (extraHeaders.some((value, i) => value && value !== PUBLIC_MANAGEMENT_HEADERS[i])) {
      throw new Error("Las columnas de gestión contienen una cabecera incompatible.");
    }
    if (publicData.some((row) => populated(row.slice(width + 4)))) {
      throw new Error("Hay columnas adicionales con datos; hay que conservar su correspondencia antes de compactar.");
    }
    const result = planPublicSheetSync({
      records: systemData.slice(1).filter(populated).map((row) => parseRow(row)),
      publicRows: publicData.slice(1), columns, buildRow,
    });
    return { ...result, publicTab, publicSheet, previousRows: publicData.length };
  }

  async function reconcile({ apply = false } = {}) {
    return serial(async () => {
      const result = await plan();
      if (!apply) return result;
      if (result.issues.length) {
        const error = new Error("Hay filas sin correspondencia inequívoca; no se ha modificado la vista.");
        error.code = "PUBLIC_SHEET_RECONCILIATION_REQUIRED";
        error.issues = result.issues;
        throw error;
      }
      const { publicTab } = result;
      const backupName = `_Copia ${sheetName} ${Date.now()}`;
      const values = [
        [...columns.map(({ header }) => header), ...PUBLIC_MANAGEMENT_HEADERS],
        ...result.rows,
      ];
      const rowCount = Math.max(publicTab.gridProperties.rowCount, values.length);
      const requests = [];
      if (result.previousRows > 1) {
        requests.push({ duplicateSheet: {
          sourceSheetId: publicTab.sheetId, newSheetName: backupName,
        } });
      }
      requests.push({ updateSheetProperties: {
        properties: { sheetId: publicTab.sheetId, gridProperties: {
          rowCount, columnCount: Math.max(publicTab.gridProperties.columnCount, width + 4),
        } }, fields: "gridProperties.rowCount,gridProperties.columnCount",
      } });
      requests.push({ updateCells: {
        range: { sheetId: publicTab.sheetId, startRowIndex: 0,
          endRowIndex: Math.max(result.previousRows, values.length), startColumnIndex: 0, endColumnIndex: width + 4 },
        rows: values.map((row) => ({ values: row.map((value) => ({ userEnteredValue:
          typeof value === "number" ? { numberValue: value } : { stringValue: String(value ?? "") },
        })) })),
        fields: "userEnteredValue",
      } });
      requests.push({ setDataValidation: {
        range: { sheetId: publicTab.sheetId, startRowIndex: 1, endRowIndex: rowCount,
          startColumnIndex: width + 1, endColumnIndex: width + 2 },
        rule: { condition: { type: "ONE_OF_LIST", values: ["sí", "duplicado", "prueba", "error", "pendiente"]
          .map((userEnteredValue) => ({ userEnteredValue })) }, strict: true, showCustomUi: true },
      } });
      const expandedRange = (range) => ({ ...range, endColumnIndex: width + 4,
        endRowIndex: Math.max(range.endRowIndex || 0, values.length) });
      if (result.publicSheet.basicFilter) {
        requests.push({ setBasicFilter: { filter: { ...result.publicSheet.basicFilter,
          range: expandedRange(result.publicSheet.basicFilter.range) } } });
      }
      for (const filter of result.publicSheet.filterViews || []) {
        if (filter.range) requests.push({ updateFilterView: {
          filter: { filterViewId: filter.filterViewId, range: expandedRange(filter.range) }, fields: "range",
        } });
      }
      await client.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
      const actual = values.length > 1
        ? await read(`${publicName}!A2:${lastColumn}${values.length}`) : [];
      // An existing filter may reorder the complete rows when its range expands.
      const expected = new Map(result.rows.map((row) => [row[width], row]));
      const verified = new Set();
      const matches = actual.length === result.rows.length && actual.every((row) => {
        const id = row[width];
        const planned = expected.get(id);
        if (!planned || verified.has(id)) return false;
        verified.add(id);
        return planned.every((value, index) => (row[index] ?? "") === value);
      });
      if (!matches) {
        throw new Error("No se ha podido verificar la reconciliación de la vista.");
      }
      return { ...result, backupName: result.previousRows > 1 ? backupName : null };
    });
  }

  async function ensureReady() {
    const { publicTab } = await tabs();
    if (publicTab.gridProperties.columnCount >= width + 4) {
      const headers = (await read(`${publicName}!${firstMetadata}1:${lastColumn}1`))[0] || [];
      if (PUBLIC_MANAGEMENT_HEADERS.every((header, i) => headers[i] === header)) return;
    }
    await reconcile({ apply: true });
  }

  async function upsert(record) {
    return serial(async () => {
      const id = normalizeSubmissionId(record.submission_id);
      const rows = await read(`${publicName}!${firstMetadata}2:${lastColumn}`);
      const matches = rows.flatMap((row, index) => normalizedText(row[0]) === id ? [index + 2] : []);
      if (matches.length > 1) throw new Error("El ID de envío está repetido en la vista de gestión.");
      if (!matches.length) {
        await client.spreadsheets.values.append({
          spreadsheetId, range: `${publicName}!A:${lastColumn}`,
          valueInputOption: "RAW", insertDataOption: "INSERT_ROWS",
          requestBody: { majorDimension: "ROWS", values: [[
            ...buildRow(record), id, "pendiente", record.drive_status || "pending", record.email_status || "pending",
          ]] },
        });
        return;
      }
      const rowNumber = matches[0];
      // Only generated links and delivery states change; manual answers and decisions stay intact.
      const values = buildRow(record);
      const data = columns.flatMap(({ key }, index) => {
        const isLink = key.endsWith("_drive_url") || /^(participant|guardian)_document_(front|back)$/.test(key);
        return isLink && record.drive_status === "stored" ? [{
          range: `${publicName}!${columnName(index + 1)}${rowNumber}`,
          values: [[values[index]]],
        }] : [];
      });
      data.push({ range: `${publicName}!${columnName(width + 3)}${rowNumber}:${lastColumn}${rowNumber}`,
        values: [[record.drive_status || "pending", record.email_status || "pending"]] });
      await client.spreadsheets.values.batchUpdate({
        spreadsheetId, requestBody: { valueInputOption: "RAW", data },
      });
    });
  }

  return { ensureReady, reconcile, upsert };
}
