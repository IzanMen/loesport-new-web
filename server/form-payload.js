import crypto from "node:crypto";
import path from "node:path";

export const ALLOWED_FORM_TYPES = new Set([
  "inscripcion",
  "preinscripcion",
  "baja",
  "licencias",
  "newsletter",
  "contacto",
  "socio",
  "patrocinio",
  "equipacion",
]);

const submissionIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const answerKeyPattern = /^[a-z][a-z0-9_]{0,79}$/;

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400, expose: true });
}

export function cleanText(value, maxLength = 8_000) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function safeFilename(value, fallback = "archivo") {
  const filename = path.basename(cleanText(value, 180)).replace(/[^\p{L}\p{N}._() -]+/gu, "-");
  return filename || fallback;
}

export function validEmail(value) {
  const email = cleanText(value, 254);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

export function parsePayload(rawPayload, { randomUUID = crypto.randomUUID } = {}) {
  let input;
  try {
    input = JSON.parse(rawPayload);
  } catch {
    throw badRequest("Los datos del formulario no son válidos.");
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw badRequest("Los datos del formulario no son válidos.");
  }

  const type = cleanText(input.type, 50).toLowerCase();
  if (!ALLOWED_FORM_TYPES.has(type)) {
    throw badRequest("El tipo de formulario no es válido.");
  }
  if (!Array.isArray(input.answers) || !input.answers.length || input.answers.length > 140) {
    throw badRequest("Las respuestas del formulario no son válidas.");
  }

  const requestedSubmissionId = cleanText(input.submissionId, 64).toLowerCase();
  if (requestedSubmissionId && !submissionIdPattern.test(requestedSubmissionId)) {
    throw badRequest("Los datos del formulario no son válidos.");
  }

  const answers = input.answers.map((answer) => {
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
      throw badRequest("Las respuestas del formulario no son válidas.");
    }
    const rawKey = cleanText(answer.key, 200).toLowerCase();
    if (rawKey.length > 80 || (rawKey && !answerKeyPattern.test(rawKey))) {
      throw badRequest("Los datos del formulario no son válidos.");
    }
    const key = rawKey;
    return {
      ...(key ? { key } : {}),
      section: cleanText(answer.section, 140) || "Datos enviados",
      label: cleanText(answer.label, 1_500) || "Campo",
      value: cleanText(answer.value, 8_000) || "Sin respuesta",
    };
  });

  if (type === "inscripcion") {
    const answerKeys = answers.map((answer) => answer.key).filter(Boolean);
    if (new Set(answerKeys).size !== answerKeys.length) {
      throw badRequest("Las respuestas del formulario no son válidas.");
    }
  }

  if (input.attachments != null && !Array.isArray(input.attachments)) {
    throw badRequest("Los datos del formulario no son válidos.");
  }
  if (input.attachments?.length > 12) {
    throw badRequest("Los datos del formulario no son válidos.");
  }
  const attachments = (input.attachments || []).map((file, index) => {
    if (!file || typeof file !== "object" || Array.isArray(file)) {
      throw badRequest("Los datos del formulario no son válidos.");
    }
    const rawKey = cleanText(file.key, 200).toLowerCase();
    if (rawKey.length > 80 || (rawKey && !answerKeyPattern.test(rawKey))) {
      throw badRequest("Los datos del formulario no son válidos.");
    }
    return {
      index,
      ...(rawKey ? { key: rawKey } : {}),
      label: cleanText(file.label, 300) || "Archivo adjunto",
      name: safeFilename(file.name, `archivo-${index + 1}`),
    };
  });

  if (type === "inscripcion") {
    const attachmentKeys = attachments.map((attachment) => attachment.key).filter(Boolean);
    if (new Set(attachmentKeys).size !== attachmentKeys.length) {
      throw badRequest("Los datos del formulario no son válidos.");
    }
  }

  return {
    submissionId: requestedSubmissionId || randomUUID(),
    type,
    title: cleanText(input.title, 140) || "Formulario web",
    answers,
    attachments,
    pageUrl: cleanText(input.pageUrl, 1_000),
    replyTo: validEmail(input.replyTo),
    submittedAt: cleanText(input.submittedAt, 40),
  };
}
