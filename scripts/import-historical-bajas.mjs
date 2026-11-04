import crypto from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { google } from "googleapis";

import { summarizeError } from "../server/error-summary.js";
import { parsePayload } from "../server/form-payload.js";
import { createFormSubmissionOrchestrator } from "../server/form-submission-orchestrator.js";
import { createBajaDriveStore } from "../server/inscripcion-drive.js";
import {
  BAJA_PUBLIC_COLUMNS,
  BAJA_SHEET_COLUMNS,
  createBajaSheetStore,
} from "../server/baja-sheet.js";
import { parseDriveManifest } from "../server/inscripcion-sheet.js";

const EXPECTED_ANSWER_KEYS = new Set([
  "participant_residence_city",
  "participant_full_name",
  "participant_birth_date",
  "withdrawal_reason",
  "privacy_consent",
  "terms_consent",
]);

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
    "subject": str(message.get("Subject", "Solicitud de baja")),
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
  if (normalized.startsWith("poblacion de residencia")) return "participant_residence_city";
  if (normalized.startsWith("nombre y apellidos")) return "participant_full_name";
  if (normalized.startsWith("fecha de nacimiento")) return "participant_birth_date";
  if (normalized.startsWith("si lo desea, indique aqui el motivo")) return "withdrawal_reason";
  if (normalized.startsWith("de conformidad con lo previsto")) return "privacy_consent";
  if (normalized.startsWith("condiciones de uso")) return "terms_consent";
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

function binaryFile(attachment) {
  return {
    originalname: attachment.filename,
    mimetype: attachment.contentType,
    buffer: Buffer.from(attachment.base64, "base64"),
  };
}

function prepareImport(emailPath) {
  const extracted = extractEmail(emailPath);
  const answers = extracted.answers.map((answer) => ({
    key: answerKey(answer.label),
    ...answer,
  }));
  const answerKeys = answers.map(({ key }) => key).filter(Boolean);
  const unexpectedKeys = answerKeys.filter((key) => !EXPECTED_ANSWER_KEYS.has(key));
  const missingKeys = [...EXPECTED_ANSWER_KEYS].filter((key) => !answerKeys.includes(key));
  if (
    answers.length !== EXPECTED_ANSWER_KEYS.size ||
    new Set(answerKeys).size !== answerKeys.length ||
    unexpectedKeys.length ||
    missingKeys.length
  ) {
    throw new Error(`Los campos de ${path.basename(emailPath)} no coinciden con el formulario de baja.`);
  }

  const snapshotAttachment = extracted.attachments.find((attachment) =>
    attachment.filename.toLowerCase().startsWith("captura-") ||
    (attachment.disposition === "inline" && attachment.contentId),
  );
  const otherAttachments = extracted.attachments.filter(
    (attachment) => attachment !== snapshotAttachment,
  );
  if (!snapshotAttachment || otherAttachments.length) {
    throw new Error(`Los adjuntos de ${path.basename(emailPath)} no coinciden con una baja histórica.`);
  }

  const payload = parsePayload(JSON.stringify({
    submissionId: extracted.submissionId,
    type: "baja",
    title: "Solicitud de baja",
    answers,
    attachments: [],
    pageUrl: extracted.pageUrl,
    submittedAt: new Date(extracted.receivedAt).toISOString(),
  }));
  const messageIdDigest = crypto.createHash("sha256")
    .update(extracted.messageId || extracted.submissionId)
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
      answers: answers.length,
      mappedAnswers: answerKeys.length,
      snapshot: true,
      submissionId: payload.submissionId,
    },
  };
}

function normalizedIdentity(value) {
  return normalizedLabel(value).replace(/[^a-z0-9]/g, "");
}

function answerValue(entry, key) {
  return entry.payload.answers.find((answer) => answer.key === key)?.value || "";
}

function assertUniqueInput(entries) {
  const submissionIds = new Set();
  const identities = new Set();
  for (const entry of entries) {
    const identity = [
      normalizedIdentity(answerValue(entry, "participant_full_name")),
      answerValue(entry, "participant_birth_date"),
    ].join("|");
    if (submissionIds.has(entry.payload.submissionId) || identities.has(identity)) {
      throw new Error("La selección de correos contiene una solicitud de baja repetida.");
    }
    submissionIds.add(entry.payload.submissionId);
    identities.add(identity);
  }
}

async function assertNotAlreadyImported(entries, sheetsClient) {
  const spreadsheetId = String(process.env.GOOGLE_SHEETS_BAJA_SPREADSHEET_ID || "").trim();
  const sheetName = String(
    process.env.GOOGLE_SHEETS_BAJA_SYSTEM_TAB || "_Baixes sistema",
  ).trim();
  const quotedSheetName = `'${sheetName.replaceAll("'", "''")}'`;
  const response = await sheetsClient.spreadsheets.values.get({
    spreadsheetId,
    range: `${quotedSheetName}!A:Z`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  const rows = response.data.values || [];
  const submissionIndex = BAJA_SHEET_COLUMNS.findIndex(({ key }) => key === "submission_id");
  const nameIndex = BAJA_SHEET_COLUMNS.findIndex(({ key }) => key === "participant_full_name");
  const birthDateIndex = BAJA_SHEET_COLUMNS.findIndex(({ key }) => key === "participant_birth_date");

  for (const entry of entries) {
    const submissionId = entry.payload.submissionId.toLowerCase();
    const identityName = normalizedIdentity(answerValue(entry, "participant_full_name"));
    const identityBirthDate = answerValue(entry, "participant_birth_date");
    const conflictingRow = rows.slice(1).find((row) => {
      const rowSubmissionId = String(row[submissionIndex] || "").trim().toLowerCase();
      if (rowSubmissionId === submissionId) return false;
      return normalizedIdentity(row[nameIndex]) === identityName &&
        String(row[birthDateIndex] || "").trim() === identityBirthDate;
    });
    if (conflictingRow) {
      throw new Error(`La baja de ${entry.source} ya parece existir con otro identificador.`);
    }
  }
}

async function applyImport(entry, { sheetStore, driveStore }) {
  const orchestrator = createFormSubmissionOrchestrator({
    sheetStore,
    driveStore,
    persistedFormType: "baja",
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
  const plannedFiles = [manifest.folder, ...(manifest.snapshot ? [manifest.snapshot] : [])];
  if (plannedFiles.length !== 2) {
    throw new Error(`La importación de ${entry.source} no contiene exactamente carpeta y captura.`);
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
    throw new Error(`La captura de ${entry.source} no coincide con el correo original.`);
  }

  const publicSheetName = String(process.env.GOOGLE_SHEETS_BAJA_TAB || "Baixes")
    .trim()
    .replaceAll("'", "''");
  const publicResponse = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_BAJA_SPREADSHEET_ID,
    range: `'${publicSheetName}'!A2:M`,
  });
  const matches = (publicResponse.data.values || []).filter((row) =>
    String(row[BAJA_PUBLIC_COLUMNS.length] || "").toLowerCase() ===
      entry.payload.submissionId.toLowerCase());
  if (matches.length !== 1) throw new Error("El envío no tiene una única fila visible por UUID.");
  const publicRow = matches[0];
  const snapshotIndex = BAJA_PUBLIC_COLUMNS.findIndex(({ key }) => key === "snapshot_drive_url");
  const folderIndex = BAJA_PUBLIC_COLUMNS.findIndex(({ key }) => key === "drive_folder_url");
  const hasDriveLink = (value) => /^https:\/\/drive\.google\.com\//.test(String(value || ""));
  if (
    !publicRow[0] ||
    !hasDriveLink(publicRow[snapshotIndex]) ||
    !hasDriveLink(publicRow[folderIndex])
  ) {
    throw new Error(`La fila visible de ${entry.source} no contiene la fecha o los enlaces de Drive.`);
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
  const driveStore = createBajaDriveStore();
  await assertNotAlreadyImported(entries, sheetsClient);

  const results = [];
  const delayMs = 20_000;
  for (const [index, entry] of entries.entries()) {
    const sheetStore = createBajaSheetStore({
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
