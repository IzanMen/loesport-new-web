import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import { google } from "googleapis";
import multer from "multer";
import MailComposer from "nodemailer/lib/mail-composer/index.js";
import { summarizeError } from "./error-summary.js";
import {
  STORED_FORM_TYPES,
  cleanText,
  parsePayload,
  safeFilename,
  validEmail,
} from "./form-payload.js";
import { createFormSubmissionOrchestrator } from "./form-submission-orchestrator.js";
import {
  createInscripcionDriveStore,
  createPreinscripcionDriveStore,
} from "./inscripcion-drive.js";
import { createInscripcionSheetStore } from "./inscripcion-sheet.js";
import { createPreinscripcionSheetStore } from "./preinscripcion-sheet.js";
import { normalizeUploadedFile } from "./upload-validation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDirectory = path.resolve(__dirname, "../dist");
const port = Number(process.env.PORT) || 8080;
const blockedRecipients = new Set(["sanchezginesizan@gmail.com"]);
const recipients = (process.env.FORM_RECIPIENT || "loesport@gmail.com")
  .split(",")
  .map((email) => validEmail(email))
  .filter((email) => email && !blockedRecipients.has(email.toLowerCase()));
const sender = process.env.GMAIL_SENDER || "sanchezginesizan@gmail.com";
const maxUploadBytes = 17 * 1024 * 1024;
const maxRequestBytes = 20 * 1024 * 1024;
const rateWindowMs = 15 * 60 * 1000;
const maxRequestsPerWindow = 10;
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean),
);
const rateBuckets = new Map();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fieldSize: 2 * 1024 * 1024,
    fields: 4,
    fileSize: maxUploadBytes,
    files: 13,
    parts: 18,
  },
});

export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function requestOrigin(request) {
  return cleanText(request.get("origin"), 300).replace(/\/$/, "");
}

function requestOriginAllowed(request) {
  const origin = requestOrigin(request);
  if (!origin) return false;
  if (allowedOrigins.has(origin)) return true;
  const forwardedHost = request.get("x-forwarded-host") || request.get("host");
  const forwardedProtocol = request.get("x-forwarded-proto") || request.protocol;
  return origin === `${forwardedProtocol}://${forwardedHost}`;
}

function withinRateLimit(request) {
  const now = Date.now();
  const key = request.ip || "unknown";
  const recent = (rateBuckets.get(key) || []).filter((timestamp) => now - timestamp < rateWindowMs);
  if (recent.length >= maxRequestsPerWindow) return false;
  recent.push(now);
  rateBuckets.set(key, recent);

  if (rateBuckets.size > 2_000) {
    rateBuckets.forEach((timestamps, bucketKey) => {
      if (!timestamps.some((timestamp) => now - timestamp < rateWindowMs)) rateBuckets.delete(bucketKey);
    });
  }
  return true;
}

function formattedDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  }).format(date);
}

function answerSections(answers) {
  const sections = new Map();
  answers.forEach((answer) => {
    if (!sections.has(answer.section)) sections.set(answer.section, []);
    sections.get(answer.section).push(answer);
  });
  return sections;
}

function emailHtml(payload, files, snapshotCid) {
  const submissionReference = STORED_FORM_TYPES.has(payload.type)
    ? `ID de envío: ${escapeHtml(payload.submissionId)}<br />`
    : "";
  const sections = [...answerSections(payload.answers)].map(([section, answers]) => {
    const rows = answers
      .map(
        (answer) => `
          <tr>
            <td style="width:36%;padding:12px 14px;border-top:1px solid #d7d7d2;vertical-align:top;font:700 12px Arial,sans-serif;color:#4e504b;text-transform:uppercase;">${escapeHtml(answer.label)}</td>
            <td style="padding:12px 14px;border-top:1px solid #d7d7d2;vertical-align:top;font:14px/1.45 Arial,sans-serif;color:#0b0c0d;white-space:pre-wrap;">${escapeHtml(answer.value)}</td>
          </tr>`,
      )
      .join("");
    return `
      <tr><td style="padding:26px 24px 8px;"><h2 style="margin:0;font:800 20px Arial,sans-serif;color:#0b0c0d;">${escapeHtml(section)}</h2></td></tr>
      <tr><td style="padding:0 24px 8px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #d7d7d2;border-collapse:collapse;background:#f5f5f1;">${rows}</table></td></tr>`;
  });

  const fileList = files.length
    ? `<tr><td style="padding:24px;"><h2 style="margin:0 0 12px;font:800 20px Arial,sans-serif;color:#0b0c0d;">Archivos adjuntos</h2><ul style="margin:0;padding-left:20px;font:14px/1.6 Arial,sans-serif;color:#0b0c0d;">${files
        .map((file) => `<li><strong>${escapeHtml(file.label)}:</strong> ${escapeHtml(file.name)}</li>`)
        .join("")}</ul></td></tr>`
    : "";

  const snapshotBlock = snapshotCid
    ? `<tr><td style="padding:24px 24px 8px;">
              <p style="margin:0 0 14px;font:700 13px Arial,sans-serif;color:#4e504b;text-transform:uppercase;">Captura exacta del formulario enviado</p>
              <img src="cid:${escapeHtml(snapshotCid)}" alt="Captura del formulario rellenado" width="930" style="display:block;width:100%;height:auto;border:1px solid #d7d7d2;" />
            </td></tr>`
    : "";
  const includedFilesText = snapshotCid
    ? "La captura y los archivos originales se incluyen en este correo."
    : files.length
      ? "Los archivos originales se incluyen en este correo."
      : "La información se incluye campo por campo en este correo.";

  return `<!doctype html>
  <html lang="es">
    <body style="margin:0;padding:0;background:#efeee8;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#efeee8;">
        <tr><td align="center" style="padding:28px 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:980px;background:#ffffff;border:1px solid #cdcec9;border-collapse:collapse;">
            <tr><td style="padding:22px 24px;background:#0b0c0d;border-bottom:6px solid #d9ff00;">
              <p style="margin:0 0 7px;font:800 12px Arial,sans-serif;letter-spacing:1.2px;color:#d9ff00;text-transform:uppercase;">Lô Esport Menorca · Formulario web</p>
              <h1 style="margin:0;font:800 30px Arial,sans-serif;color:#ffffff;">${escapeHtml(payload.title)}</h1>
              <p style="margin:9px 0 0;font:13px Arial,sans-serif;color:#c7c9c5;">Recibido el ${escapeHtml(formattedDate(payload.submittedAt))}</p>
            </td></tr>
            ${snapshotBlock}
            ${sections.join("")}
            ${fileList}
            <tr><td style="padding:18px 24px;background:#f5f5f1;border-top:1px solid #d7d7d2;font:12px/1.5 Arial,sans-serif;color:#62645f;">
              ${submissionReference}
              Enviado desde ${escapeHtml(payload.pageUrl || "la web de Lô Esport Menorca")}. ${includedFilesText}
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
  </html>`;
}

function emailText(payload, files) {
  const lines = [
    `LÔ ESPORT MENORCA · ${payload.title}`,
    `Recibido el ${formattedDate(payload.submittedAt)}`,
    "",
  ];
  let currentSection = "";
  payload.answers.forEach((answer) => {
    if (answer.section !== currentSection) {
      currentSection = answer.section;
      lines.push(currentSection.toUpperCase());
    }
    lines.push(`${answer.label}: ${answer.value}`);
  });
  if (files.length) {
    lines.push("", "ARCHIVOS ADJUNTOS");
    files.forEach((file) => lines.push(`${file.label}: ${file.name}`));
  }
  lines.push("");
  if (STORED_FORM_TYPES.has(payload.type)) lines.push(`ID de envío: ${payload.submissionId}`);
  lines.push(`Página: ${payload.pageUrl || "No disponible"}`);
  return lines.join("\n");
}

function subjectFor(payload) {
  const person = payload.answers.find((answer) => /nombre( y apellidos)?/i.test(answer.label));
  const suffix = person && person.value !== "Sin respuesta" ? ` · ${cleanText(person.value, 90)}` : "";
  return `[Web Lô Esport] ${cleanText(payload.title, 110)}${suffix}`;
}

function gmailClient() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw Object.assign(new Error("El servicio de correo todavía no está autorizado."), {
      status: 503,
      expose: true,
    });
  }
  const oauth = new google.auth.OAuth2(clientId, clientSecret);
  oauth.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth: oauth });
}

export async function sendSubmissionEmail(
  payload,
  snapshot,
  uploadedFiles,
  submissionId = payload.submissionId,
) {
  const snapshotCid = snapshot ? `formulario-${submissionId}@loesport.es` : "";
  const files = uploadedFiles.map((file, index) => ({
    label: payload.attachments[index]?.label || "Archivo adjunto",
    name: safeFilename(payload.attachments[index]?.name || file.originalname, `archivo-${index + 1}`),
    content: file.buffer,
    contentType: file.mimetype,
  }));
  const message = new MailComposer({
    messageId: `<formulario-${submissionId}@loesport.es>`,
    from: `"Web Lô Esport Menorca" <${sender}>`,
    to: recipients,
    replyTo: payload.replyTo || undefined,
    subject: subjectFor(payload),
    headers: { "X-Loesport-Submission-Id": submissionId },
    text: emailText(payload, files),
    html: emailHtml(payload, files, snapshotCid),
    attachments: [
      ...(snapshot
        ? [{
            filename: safeFilename(snapshot.originalname, "captura-formulario.jpg"),
            content: snapshot.buffer,
            contentType: snapshot.mimetype,
            contentDisposition: "inline",
            cid: snapshotCid,
          }]
        : []),
      ...files.map((file) => ({
        filename: file.name,
        content: file.content,
        contentType: file.contentType,
        contentDisposition: "attachment",
      })),
    ],
  });
  const rawMessage = await message.compile().build();
  const response = await gmailClient().users.messages.send({
    userId: "me",
    requestBody: { raw: rawMessage.toString("base64url") },
  });
  return { submissionId, gmailMessageId: response.data.id || "" };
}

const inscripcionSheetStore = createInscripcionSheetStore();
const inscripcionDriveStore = createInscripcionDriveStore();
const inscripcionSubmissionOrchestrator = createFormSubmissionOrchestrator({
  sendEmail: sendSubmissionEmail,
  sheetStore: inscripcionSheetStore,
  driveStore: inscripcionDriveStore,
});
const preinscripcionSheetStore = createPreinscripcionSheetStore();
const preinscripcionDriveStore = createPreinscripcionDriveStore();
const preinscripcionSubmissionOrchestrator = createFormSubmissionOrchestrator({
  sendEmail: sendSubmissionEmail,
  sheetStore: preinscripcionSheetStore,
  driveStore: preinscripcionDriveStore,
  persistedFormType: "preinscripcion",
});

function submitForm(payload, snapshot, attachments) {
  if (payload.type === "preinscripcion") {
    return preinscripcionSubmissionOrchestrator.submit(payload, snapshot, attachments);
  }
  return inscripcionSubmissionOrchestrator.submit(payload, snapshot, attachments);
}

app.use("/api", (request, response, next) => {
  const origin = requestOrigin(request);
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Access-Control-Max-Age", "86400");
    response.vary("Origin");
  }

  if (request.method !== "OPTIONS") {
    next();
    return;
  }

  if (!origin || !allowedOrigins.has(origin)) {
    response.status(403).json({ ok: false, message: "El origen del formulario no está autorizado." });
    return;
  }
  response.status(204).end();
});

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    emailConfigured: Boolean(
      process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN,
    ),
    spreadsheetConfigured: inscripcionSheetStore.configured,
    driveConfigured: inscripcionDriveStore.configured,
    formStorage: {
      inscripcion: {
        spreadsheetConfigured: inscripcionSheetStore.configured,
        driveConfigured: inscripcionDriveStore.configured,
      },
      preinscripcion: {
        spreadsheetConfigured: preinscripcionSheetStore.configured,
        driveConfigured: preinscripcionDriveStore.configured,
      },
    },
  });
});

app.post(
  "/api/forms",
  (request, response, next) => {
    const contentLength = Number(request.get("content-length")) || 0;
    if (contentLength > maxRequestBytes) {
      response.status(413).json({ ok: false, message: "La captura y los archivos superan el límite permitido." });
      return;
    }
    if (!requestOriginAllowed(request)) {
      response.status(403).json({ ok: false, message: "El origen del formulario no está autorizado." });
      return;
    }
    if (!withinRateLimit(request)) {
      response.status(429).json({ ok: false, message: "Se han realizado demasiados envíos. Inténtalo más tarde." });
      return;
    }
    next();
  },
  upload.fields([
    { name: "snapshot", maxCount: 1 },
    { name: "attachments", maxCount: 12 },
  ]),
  async (request, response) => {
    if (request.body.website) {
      response.json({ ok: true });
      return;
    }

    const payload = parsePayload(request.body.payload);
    response.locals.submissionId = payload.submissionId;
    const rawSnapshot = request.files?.snapshot?.[0];
    const rawAttachments = request.files?.attachments || [];
    const snapshot = normalizeUploadedFile(rawSnapshot, { snapshot: true });
    const attachments = rawAttachments.map((file) => normalizeUploadedFile(file));
    if (attachments.length !== payload.attachments.length) {
      response.status(400).json({ ok: false, message: "No se han recibido correctamente todos los archivos." });
      return;
    }
    const invalidFile = (rawSnapshot && !snapshot) || attachments.find((file) => !file);
    const totalBytes = invalidFile
      ? 0
      : [...(snapshot ? [snapshot] : []), ...attachments].reduce(
          (total, file) => total + file.size,
          0,
        );
    if (totalBytes > maxUploadBytes || invalidFile) {
      response.status(400).json({
        ok: false,
        message: invalidFile
          ? "Solo se admiten imágenes y documentos PDF."
          : "La captura y los archivos superan el límite total de 17 MB.",
      });
      return;
    }

    const result = await submitForm(payload, snapshot, attachments);
    response.status(result.deduplicated ? 200 : 201).json({
      ok: true,
      submissionId: result.submissionId,
      deduplicated: Boolean(result.deduplicated),
      spreadsheetStored: Boolean(result.sheetStored),
      driveStored: Boolean(result.driveStored),
    });
  },
);

app.use("/api", (_request, response) => {
  response.status(404).json({ ok: false, message: "Ruta no encontrada." });
});

app.use((error, _request, response, _next) => {
  const status =
    error instanceof multer.MulterError
      ? 413
      : error.expose && Number.isInteger(error.status)
        ? error.status
        : 500;
  if (status >= 500) {
    console.error(
      "Form API error",
      summarizeError(error, { submissionId: response.locals.submissionId }),
    );
  }
  const clientMessage = error instanceof multer.MulterError
    ? "No se han podido procesar los archivos. Revisa su tamaño y vuelve a intentarlo."
    : error.message;
  const body = {
    ok: false,
    message:
      status >= 500
        ? "No se ha podido enviar el formulario. Inténtalo de nuevo en unos minutos."
        : clientMessage,
  };
  if (error.expose && error.code) body.code = error.code;
  if (error.expose && Number.isFinite(error.retryAfterMs)) {
    body.retryAfterMs = Math.max(0, Math.ceil(error.retryAfterMs));
    response.setHeader("Retry-After", String(Math.max(1, Math.ceil(body.retryAfterMs / 1_000))));
  }
  response.status(status).json(body);
});

app.use(
  express.static(distDirectory, {
    extensions: ["html"],
    maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
    setHeaders(response, filePath) {
      if (filePath.endsWith(".html")) response.setHeader("Cache-Control", "no-cache");
    },
  }),
);

export function startServer() {
  return app.listen(port, "0.0.0.0", () => {
    console.log(`Lô Esport web listening on port ${port}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer();
}
