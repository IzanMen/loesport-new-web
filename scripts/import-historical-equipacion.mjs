import crypto from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { google } from "googleapis";

import { summarizeError } from "../server/error-summary.js";
import { parsePayload } from "../server/form-payload.js";
import { createFormSubmissionOrchestrator } from "../server/form-submission-orchestrator.js";
import { createEquipacionDriveStore } from "../server/inscripcion-drive.js";
import {
  EQUIPACION_PUBLIC_COLUMNS,
  EQUIPACION_SHEET_COLUMNS,
  createEquipacionSheetStore,
} from "../server/equipacion-sheet.js";
import { parseDriveManifest } from "../server/inscripcion-sheet.js";

const ANSWER_DEFINITIONS = [
  ["contact_full_name", "Datos de contacto", "Nombre y apellidos"],
  ["contact_email", "Datos de contacto", "Correo electrónico"],
  ["contact_phone", "Datos de contacto", "Teléfono"],
  ["order_items", "Artículos solicitados", "Artículos solicitados"],
  ["order_total", "Resumen", "Total orientativo"],
  ["comments", "Resumen", "Observaciones"],
  ["privacy_consent", "Privacidad", "Consentimiento"],
];

const PYTHON_EXTRACTOR = String.raw`
import base64
import email
import html
import json
import re
import sys
from email import policy
from email.utils import parsedate_to_datetime

source_path = sys.argv[1]
with open(source_path, "rb") as source:
    message = email.message_from_binary_file(source, policy=policy.default)

html_part = message.get_body(preferencelist=("html",))
if html_part is None:
    raise ValueError("El correo no contiene una versión HTML del formulario.")
html_body = html_part.get_content()

def clean_html(value):
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.IGNORECASE)
    value = re.sub(r"<[^>]+>", "", value)
    return re.sub(r"[ \t\r\f\v]+", " ", html.unescape(value)).strip()

sections = [
    (match.start(), clean_html(match.group(1)))
    for match in re.finditer(r"<h2[^>]*>(.*?)</h2>", html_body, flags=re.IGNORECASE | re.DOTALL)
]
row_pattern = re.compile(
    r"<tr>\s*<td[^>]*width:36%[^>]*>(.*?)</td>\s*<td[^>]*>(.*?)</td>\s*</tr>",
    flags=re.IGNORECASE | re.DOTALL,
)
answers = []
for match in row_pattern.finditer(html_body):
    previous_sections = [name for position, name in sections if position < match.start()]
    answers.append({
        "section": previous_sections[-1] if previous_sections else "Datos enviados",
        "label": clean_html(match.group(1)),
        "value": clean_html(match.group(2)),
    })

plain_part = message.get_body(preferencelist=("plain",))
plain_body = plain_part.get_content() if plain_part is not None else ""
page_match = re.search(r"^Página:\s*(.+)$", plain_body, flags=re.MULTILINE)

attachments = []
for part in message.walk():
    filename = part.get_filename()
    if not filename:
        continue
    content = part.get_payload(decode=True) or b""
    attachments.append({
        "filename": filename,
        "contentType": part.get_content_type(),
        "disposition": part.get_content_disposition() or "",
        "contentId": str(part.get("Content-ID", "")),
        "base64": base64.b64encode(content).decode("ascii"),
    })

print(json.dumps({
    "subject": str(message.get("Subject", "Solicitud de equipación")),
    "messageId": str(message.get("Message-ID", "")),
    "submissionId": str(message.get("X-Loesport-Submission-ID", "")),
    "receivedAt": parsedate_to_datetime(str(message["Date"])).isoformat(),
    "pageUrl": page_match.group(1).strip() if page_match else "",
    "answers": answers,
    "attachments": attachments,
}, ensure_ascii=False))
`;

function normalizedLabel(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function answerKey(label) {
  const normalized = normalizedLabel(label);
  if (normalized.startsWith("nombre y apellidos")) return "contact_full_name";
  if (normalized.startsWith("correo electronico")) return "contact_email";
  if (normalized.startsWith("telefono")) return "contact_phone";
  if (normalized.startsWith("total orientativo")) return "order_total";
  if (normalized.startsWith("observaciones")) return "comments";
  if (normalized.startsWith("consentimiento")) return "privacy_consent";
  return "";
}

function extractEmail(emailPath) {
  const extraction = spawnSync("python3", ["-c", PYTHON_EXTRACTOR, emailPath], {
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  if (extraction.status !== 0) {
    throw new Error(`No se ha podido leer ${path.basename(emailPath)} como correo EML.`);
  }
  return JSON.parse(extraction.stdout);
}

function deterministicSubmissionId(extracted) {
  if (extracted.submissionId) return extracted.submissionId;
  const digest = crypto.createHash("sha256")
    .update([extracted.messageId, extracted.subject, extracted.receivedAt].join("\n"))
    .digest();
  digest[6] = (digest[6] & 0x0f) | 0x50;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = digest.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function binaryFile(attachment) {
  if (!attachment) return null;
  return {
    originalname: attachment.filename,
    mimetype: attachment.contentType,
    buffer: Buffer.from(attachment.base64, "base64"),
  };
}

function prepareAnswers(emailPath, extracted) {
  const fixedAnswers = new Map();
  const itemAnswers = [];
  const unknownAnswers = [];
  for (const answer of extracted.answers) {
    if (normalizedLabel(answer.section) === "articulos solicitados") {
      itemAnswers.push(answer);
      continue;
    }
    const key = answerKey(answer.label);
    if (!key) {
      unknownAnswers.push(answer.label);
      continue;
    }
    if (fixedAnswers.has(key)) {
      throw new Error(`El campo ${answer.label} está repetido en ${path.basename(emailPath)}.`);
    }
    fixedAnswers.set(key, answer.value);
  }

  const expectedFixedKeys = ANSWER_DEFINITIONS
    .map(([key]) => key)
    .filter((key) => key !== "order_items");
  const missingKeys = expectedFixedKeys.filter((key) => !fixedAnswers.has(key));
  if (!itemAnswers.length || missingKeys.length || unknownAnswers.length) {
    throw new Error(`Los campos de ${path.basename(emailPath)} no coinciden con el formulario de equipación.`);
  }

  const orderItems = itemAnswers
    .map((answer) => `${answer.label}: ${answer.value}`)
    .join("\n");
  return ANSWER_DEFINITIONS.map(([key, section, label]) => ({
    key,
    section,
    label,
    value: key === "order_items" ? orderItems : fixedAnswers.get(key),
  }));
}

function prepareImport(emailPath) {
  const extracted = extractEmail(emailPath);
  const answers = prepareAnswers(emailPath, extracted);
  const snapshotAttachment = extracted.attachments.find((attachment) =>
    attachment.filename.toLowerCase().startsWith("captura-") ||
    (attachment.disposition === "inline" && attachment.contentId),
  );
  const otherAttachments = extracted.attachments.filter(
    (attachment) => attachment !== snapshotAttachment,
  );
  if (otherAttachments.length) {
    throw new Error(`Los adjuntos de ${path.basename(emailPath)} no coinciden con una solicitud histórica.`);
  }

  const payload = parsePayload(JSON.stringify({
    submissionId: deterministicSubmissionId(extracted),
    type: "equipacion",
    title: "Solicitud de equipación",
    answers,
    attachments: [],
    pageUrl: extracted.pageUrl,
    submittedAt: new Date(extracted.receivedAt).toISOString(),
  }));
  const messageIdDigest = crypto.createHash("sha256")
    .update(extracted.messageId || payload.submissionId)
    .digest("hex");

  return {
    source: path.basename(emailPath),
    receivedAt: new Date(extracted.receivedAt),
    messageIdDigest,
    payload,
    snapshot: binaryFile(snapshotAttachment),
    uploadedFiles: [],
    summary: {
      receivedAt: new Date(extracted.receivedAt).toISOString(),
      items: answers.find((answer) => answer.key === "order_items").value.split("\n").length,
      snapshot: Boolean(snapshotAttachment),
      submissionId: payload.submissionId,
      generatedSubmissionId: !extracted.submissionId,
    },
  };
}

function assertUniqueInput(entries) {
  const submissionIds = new Set();
  for (const entry of entries) {
    if (submissionIds.has(entry.payload.submissionId)) {
      throw new Error("La selección de correos contiene una solicitud de equipación repetida.");
    }
    submissionIds.add(entry.payload.submissionId);
  }
}

async function assertNotAlreadyImported(entries, sheetsClient) {
  const spreadsheetId = String(
    process.env.GOOGLE_SHEETS_EQUIPACION_SPREADSHEET_ID || "",
  ).trim();
  const sheetName = String(
    process.env.GOOGLE_SHEETS_EQUIPACION_SYSTEM_TAB || "_Equipament sistema",
  ).trim();
  const quotedSheetName = `'${sheetName.replaceAll("'", "''")}'`;
  const response = await sheetsClient.spreadsheets.values.get({
    spreadsheetId,
    range: `${quotedSheetName}!A:A`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const existingIds = new Set((response.data.values || [])
    .slice(1)
    .map((row) => String(row[0] || "").trim().toLowerCase())
    .filter(Boolean));
  const duplicate = entries.find((entry) => existingIds.has(entry.payload.submissionId));
  if (duplicate) {
    throw new Error(`${duplicate.source} ya está registrado en la hoja.`);
  }
}

async function applyImport(entry, { sheetStore, driveStore }) {
  const orchestrator = createFormSubmissionOrchestrator({
    sheetStore,
    driveStore,
    persistedFormType: "equipacion",
    now: () => Date.now(),
    sendEmail: async () => ({
      gmailMessageId: `historical-${entry.messageIdDigest.slice(0, 24)}`,
    }),
  });
  return orchestrator.submit(entry.payload, entry.snapshot, entry.uploadedFiles);
}

function loadSecretFiles() {
  [
    "GMAIL_CLIENT_ID",
    "GMAIL_CLIENT_SECRET",
    "GOOGLE_DRIVE_REFRESH_TOKEN",
  ].forEach((name) => {
    const secretPath = process.env[`${name}_FILE`];
    if (secretPath) process.env[name] = readFileSync(secretPath, "utf8").trim();
  });
}

async function verifyStoredImport(entry, { sheetStore, sheetsClient, driveClient }) {
  const stored = await sheetStore.findBySubmissionId(entry.payload.submissionId);
  const manifest = parseDriveManifest(stored?.record?.drive_files_manifest);
  if (!stored || stored.record.email_status !== "sent" || stored.record.drive_status !== "stored" || !manifest) {
    throw new Error(`La importación de ${entry.source} no tiene un estado final válido.`);
  }

  if (Boolean(manifest.snapshot) !== Boolean(entry.snapshot)) {
    throw new Error(`La captura archivada de ${entry.source} no coincide con el correo original.`);
  }
  const plannedFiles = [manifest.folder, ...(manifest.snapshot ? [manifest.snapshot] : [])];
  const expectedFileCount = entry.snapshot ? 2 : 1;
  if (plannedFiles.length !== expectedFileCount) {
    throw new Error(`El archivo de ${entry.source} no contiene los elementos esperados.`);
  }
  const verifiedFiles = await Promise.all(plannedFiles.map(async (planned, index) => {
    const response = await driveClient.files.get({
      fileId: planned.id,
      supportsAllDrives: true,
      fields: "id,trashed,sha256Checksum",
    });
    const actual = response.data || {};
    if (actual.trashed || actual.id !== planned.id) return false;
    if (index > 0 && planned.sha256 && actual.sha256Checksum !== planned.sha256) return false;
    return true;
  }));
  if (verifiedFiles.some((verified) => !verified)) {
    throw new Error(`Los archivos de Drive de ${entry.source} no coinciden con el correo original.`);
  }

  const publicSheetName = String(process.env.GOOGLE_SHEETS_EQUIPACION_TAB || "Equipament")
    .trim()
    .replaceAll("'", "''");
  const publicResponse = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_EQUIPACION_SPREADSHEET_ID,
    range: `'${publicSheetName}'!A2:N`,
  });
  const matches = (publicResponse.data.values || []).flatMap((row, index) =>
    String(row[EQUIPACION_PUBLIC_COLUMNS.length] || "").toLowerCase() ===
      entry.payload.submissionId.toLowerCase()
      ? [{ row, rowNumber: index + 2 }]
      : []);
  if (matches.length !== 1) throw new Error("El envío no tiene una única fila visible por UUID.");
  const { row: publicRow, rowNumber } = matches[0];
  const snapshotIndex = EQUIPACION_PUBLIC_COLUMNS.findIndex(({ key }) => key === "snapshot_drive_url");
  const folderIndex = EQUIPACION_PUBLIC_COLUMNS.findIndex(({ key }) => key === "drive_folder_url");
  const hasDriveLink = (value) => /^https:\/\/drive\.google\.com\//.test(String(value || ""));
  const missingLinkUpdates = [
    ...(entry.snapshot && !hasDriveLink(publicRow[snapshotIndex])
      ? [{ index: snapshotIndex, value: manifest.snapshot.url }]
      : []),
    ...(!hasDriveLink(publicRow[folderIndex])
      ? [{ index: folderIndex, value: manifest.folder.url }]
      : []),
  ];
  if (missingLinkUpdates.length) {
    await sheetsClient.spreadsheets.values.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEETS_EQUIPACION_SPREADSHEET_ID,
      requestBody: {
        valueInputOption: "RAW",
        data: missingLinkUpdates.map(({ index, value }) => ({
          range: `'${publicSheetName}'!${String.fromCharCode(65 + index)}${rowNumber}`,
          values: [[value]],
        })),
      },
    });
    missingLinkUpdates.forEach(({ index, value }) => {
      publicRow[index] = value;
    });
  }
  if (
    !publicRow[0] ||
    !hasDriveLink(publicRow[folderIndex]) ||
    (entry.snapshot && !hasDriveLink(publicRow[snapshotIndex])) ||
    (!entry.snapshot && publicRow[snapshotIndex])
  ) {
    throw new Error(`La fila visible de ${entry.source} no contiene la fecha o los enlaces de Drive correctos.`);
  }

  return {
    filesVerified: plannedFiles.length,
    sheetStatus: stored.record.email_status,
    driveStatus: stored.record.drive_status,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const emailPaths = process.argv.slice(2).filter((argument) => argument !== "--apply");
  if (!emailPaths.length) {
    throw new Error("Indica al menos un archivo EML para importar.");
  }

  const entries = emailPaths.map(prepareImport);
  assertUniqueInput(entries);
  if (!apply) {
    console.log(JSON.stringify({ mode: "dry-run", entries: entries.map(({ summary }) => summary) }, null, 2));
    return;
  }

  loadSecretFiles();
  const storageAuth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
  );
  storageAuth.setCredentials({ refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN });
  const sheetsClient = google.sheets({ version: "v4", auth: storageAuth });
  const driveClient = google.drive({ version: "v3", auth: storageAuth });
  const driveStore = createEquipacionDriveStore();
  await assertNotAlreadyImported(entries, sheetsClient);

  const results = [];
  const delayMs = 20_000;
  for (const [index, entry] of entries.entries()) {
    const sheetStore = createEquipacionSheetStore({
      sheetsClient,
      clock: () => new Date(entry.receivedAt),
    });
    const result = await applyImport(entry, { sheetStore, driveStore });
    const verification = await verifyStoredImport(entry, {
      sheetStore,
      sheetsClient,
      driveClient,
    });
    results.push({
      submissionId: entry.payload.submissionId,
      stored: Boolean(result.sheetStored && result.driveStored),
      deduplicated: Boolean(result.deduplicated),
      ...verification,
    });
    if (index < entries.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  console.log(JSON.stringify({ mode: "apply", results }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, ...summarizeError(error) }));
  process.exitCode = 1;
});
