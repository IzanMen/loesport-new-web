import crypto from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { google } from "googleapis";

import { summarizeError } from "../server/error-summary.js";
import { parsePayload } from "../server/form-payload.js";
import { createFormSubmissionOrchestrator } from "../server/form-submission-orchestrator.js";
import {
  createInscripcionDriveStore,
  legacyAttachmentKey,
} from "../server/inscripcion-drive.js";
import {
  INSCRIPCION_PUBLIC_COLUMNS,
  INSCRIPCION_SHEET_COLUMNS,
  createInscripcionSheetStore,
  legacyAnswerKey,
  parseDriveManifest,
} from "../server/inscripcion-sheet.js";

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

received_at = parsedate_to_datetime(str(message["Date"])).isoformat()
print(json.dumps({
    "subject": str(message.get("Subject", "Inscripción")),
    "messageId": str(message.get("Message-ID", "")),
    "receivedAt": received_at,
    "pageUrl": page_match.group(1).strip() if page_match else "",
    "answers": answers,
    "attachments": attachments,
}, ensure_ascii=False))
`;

function deterministicUuid(value) {
  const bytes = crypto.createHash("sha256").update(String(value)).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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

function binaryFile(attachment) {
  return {
    originalname: attachment.filename,
    mimetype: attachment.contentType,
    buffer: Buffer.from(attachment.base64, "base64"),
  };
}

function prepareImport(emailPath) {
  const extracted = extractEmail(emailPath);
  const submissionId = deterministicUuid(extracted.messageId || crypto.createHash("sha256")
    .update(extracted.subject + extracted.receivedAt)
    .digest("hex"));
  const answers = extracted.answers.map((answer) => {
    const key = legacyAnswerKey(answer.label);
    return { ...(key ? { key } : {}), ...answer };
  });
  const answerKeys = answers.map((answer) => answer.key).filter(Boolean);
  if (new Set(answerKeys).size !== answerKeys.length) {
    throw new Error(`Hay campos duplicados en ${path.basename(emailPath)}.`);
  }

  const snapshotAttachment = extracted.attachments.find((attachment) =>
    attachment.filename.toLowerCase().startsWith("captura-") ||
    (attachment.disposition === "inline" && attachment.contentId),
  );
  const documentAttachments = extracted.attachments.filter(
    (attachment) => attachment !== snapshotAttachment,
  );
  const attachmentMetadata = documentAttachments.map((attachment, index) => {
    const answer = answers.find((candidate) =>
      candidate.value === attachment.filename && legacyAttachmentKey(candidate.label),
    );
    const key = answer ? legacyAttachmentKey(answer.label) : "";
    if (!key) {
      throw new Error(
        `No se ha podido identificar el campo del archivo ${index + 1} en ${path.basename(emailPath)}.`,
      );
    }
    return {
      index,
      key,
      label: answer.label,
      name: attachment.filename,
    };
  });

  const payload = parsePayload(JSON.stringify({
    submissionId,
    type: "inscripcion",
    title: "Inscripción",
    answers,
    attachments: attachmentMetadata,
    pageUrl: extracted.pageUrl,
    submittedAt: new Date(extracted.receivedAt).toISOString(),
  }));
  const unmappedLabels = answers.filter((answer) => !answer.key).map((answer) => answer.label);

  return {
    source: path.basename(emailPath),
    receivedAt: new Date(extracted.receivedAt),
    messageIdDigest: crypto.createHash("sha256").update(extracted.messageId).digest("hex"),
    payload,
    snapshot: snapshotAttachment ? binaryFile(snapshotAttachment) : null,
    uploadedFiles: documentAttachments.map(binaryFile),
    summary: {
      source: path.basename(emailPath),
      receivedAt: new Date(extracted.receivedAt).toISOString(),
      answers: answers.length,
      mappedAnswers: answerKeys.length,
      unmappedLabels,
      snapshot: Boolean(snapshotAttachment),
      documents: documentAttachments.length,
      documentFields: attachmentMetadata.map(({ key }) => key),
    },
  };
}

async function applyImport(entry, { sheetStore, driveStore }) {
  const orchestrator = createFormSubmissionOrchestrator({
    sheetStore,
    driveStore,
    now: () => new Date(entry.receivedAt),
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

async function assertNotAlreadyImported(entries, sheets) {
  const spreadsheetId = String(process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "").trim();
  const sheetName = String(
    process.env.GOOGLE_SHEETS_INSCRIPCION_SYSTEM_TAB || "_Inscripciones sistema",
  ).trim();
  const quotedSheetName = `'${sheetName.replaceAll("'", "''")}'`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quotedSheetName}!A:BD`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const rows = response.data.values || [];
  const submissionIndex = INSCRIPCION_SHEET_COLUMNS.findIndex(
    ({ key }) => key === "submission_id",
  );
  const documentIndex = INSCRIPCION_SHEET_COLUMNS.findIndex(
    ({ key }) => key === "participant_document_number",
  );
  for (const entry of entries) {
    const documentNumber = entry.payload.answers.find(
      ({ key }) => key === "participant_document_number",
    )?.value;
    const existing = rows.slice(1).find(
      (row) => String(row[documentIndex] || "").trim() === String(documentNumber || "").trim(),
    );
    if (existing && String(existing[submissionIndex] || "").trim() !== entry.payload.submissionId) {
      throw new Error(`La inscripción de ${entry.source} ya parece existir en la hoja.`);
    }
  }
}

async function verifyStoredImport(entry, { sheetStore, sheetsClient, driveClient }) {
  const stored = await sheetStore.findBySubmissionId(entry.payload.submissionId);
  const manifest = parseDriveManifest(stored?.record?.drive_files_manifest);
  if (!stored || stored.record.email_status !== "sent" || stored.record.drive_status !== "stored" || !manifest) {
    throw new Error(`La importación de ${entry.source} no tiene un estado final válido.`);
  }
  const plannedFiles = [
    manifest.folder,
    ...(manifest.snapshot ? [manifest.snapshot] : []),
    ...(manifest.attachments || []),
  ];
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
    throw new Error(`Los archivos de ${entry.source} no coinciden con el correo original.`);
  }

  const publicSheetName = String(process.env.GOOGLE_SHEETS_INSCRIPCION_TAB || "Inscripciones")
    .trim()
    .replaceAll("'", "''");
  const publicResponse = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    range: `'${publicSheetName}'!A${stored.rowNumber}:AF${stored.rowNumber}`,
  });
  const publicRow = publicResponse.data.values?.[0] || [];
  const documentKeys = entry.payload.attachments.map(({ key }) => key);
  const publicDocumentLinks = documentKeys.filter((key) => {
    const index = INSCRIPCION_PUBLIC_COLUMNS.findIndex((column) => column.key === key);
    return index >= 0 && /^https:\/\/drive\.google\.com\//.test(String(publicRow[index] || ""));
  });
  if (!publicRow[0] || publicDocumentLinks.length !== documentKeys.length) {
    throw new Error(`La fila visible de ${entry.source} no contiene todos los enlaces.`);
  }

  return {
    filesVerified: plannedFiles.length,
    publicDocumentLinks: publicDocumentLinks.length,
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
  const sheetStore = createInscripcionSheetStore({ sheetsClient });
  const driveStore = createInscripcionDriveStore();
  await assertNotAlreadyImported(entries, sheetsClient);
  const results = [];
  for (const entry of entries) {
    const result = await applyImport(entry, { sheetStore, driveStore });
    const verification = await verifyStoredImport(entry, {
      sheetStore,
      sheetsClient,
      driveClient,
    });
    results.push({
      source: entry.source,
      stored: Boolean(result.sheetStored && result.driveStored),
      deduplicated: Boolean(result.deduplicated),
      ...verification,
    });
  }
  console.log(JSON.stringify({ mode: "apply", results }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, ...summarizeError(error) }));
  process.exitCode = 1;
});
