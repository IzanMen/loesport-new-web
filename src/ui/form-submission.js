const CLOUD_FORM_API_ENDPOINT = "https://loesport-web-473754422972.europe-southwest1.run.app/api/forms";
const localHostname = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const FORM_API_ENDPOINT =
  import.meta.env.VITE_FORM_API_ENDPOINT || (localHostname ? "/api/forms" : CLOUD_FORM_API_ENDPOINT);
const MAX_UPLOAD_BYTES = 17 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 90_000;
const CAPTURE_TIMEOUT_MS = 20_000;
const SUBMISSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const pendingSubmissionIds = new WeakMap();
const pendingSubmissionSnapshots = new WeakMap();

export function resetFormSubmissionId(form) {
  if (form && (typeof form === "object" || typeof form === "function")) {
    pendingSubmissionIds.delete(form);
    pendingSubmissionSnapshots.delete(form);
  }
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function createSubmissionId() {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();
  if (typeof cryptoApi?.getRandomValues !== "function") {
    throw new Error("No se ha podido enviar el formulario.");
  }

  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

function resolveSubmissionId(form, submissionId) {
  const requestedId = cleanText(submissionId);
  if (requestedId && !SUBMISSION_ID_PATTERN.test(requestedId)) {
    throw new Error("Los datos del formulario no son válidos.");
  }

  const resolvedId = requestedId || pendingSubmissionIds.get(form) || createSubmissionId();
  pendingSubmissionIds.set(form, resolvedId);
  return resolvedId;
}

function fieldLabel(form, field) {
  const explicitLabel = field.id
    ? form.querySelector(`label[for="${CSS.escape(field.id)}"]`)
    : null;
  const wrappingLabel = field.closest("label");
  const wrappingText = wrappingLabel?.querySelector(":scope > span")?.textContent;
  return cleanText(
    explicitLabel?.textContent ||
      wrappingText ||
      field.getAttribute("aria-label") ||
      field.name ||
      "Campo",
  );
}

function selectedValue(field) {
  if (field instanceof HTMLSelectElement) {
    return cleanText(field.selectedOptions[0]?.textContent || field.value);
  }
  if (field instanceof HTMLInputElement && field.type === "checkbox") {
    return field.checked ? "Sí" : "No";
  }
  return cleanText(field.value);
}

export function collectFormSubmission(form, { section = "Datos enviados" } = {}) {
  const answers = [];
  const attachments = [];
  const handledNames = new Set();
  const controls = [...form.elements].filter(
    (field) =>
      field instanceof HTMLInputElement ||
      field instanceof HTMLTextAreaElement ||
      field instanceof HTMLSelectElement,
  );

  controls.forEach((field) => {
    if (!field.name || field.disabled || field.type === "hidden") return;
    if (["submit", "button", "reset"].includes(field.type)) return;

    if (field.type === "file") {
      [...(field.files || [])].forEach((file) => {
        attachments.push({ label: fieldLabel(form, field), file });
      });
      answers.push({
        section,
        label: fieldLabel(form, field),
        value: [...(field.files || [])].map((file) => file.name).join(", ") || "Sin archivo",
      });
      return;
    }

    if (handledNames.has(field.name)) return;
    handledNames.add(field.name);

    if (field.type === "radio") {
      const selected = controls.find((candidate) => candidate.name === field.name && candidate.checked);
      answers.push({
        section,
        label: fieldLabel(form, field),
        value: selected ? selectedValue(selected) : "Sin respuesta",
      });
      return;
    }

    if (field.type === "checkbox") {
      const matching = controls.filter((candidate) => candidate.name === field.name);
      const checked = matching.filter((candidate) => candidate.checked);
      answers.push({
        section,
        label: fieldLabel(form, field),
        value:
          matching.length === 1
            ? selectedValue(field)
            : checked.map((candidate) => selectedValue(candidate)).join(", ") || "No",
      });
      return;
    }

    answers.push({
      section,
      label: fieldLabel(form, field),
      value: selectedValue(field) || "Sin respuesta",
    });
  });

  const replyTo = cleanText(
    controls.find((field) => field instanceof HTMLInputElement && field.type === "email")?.value,
  );
  return { answers, attachments, replyTo };
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la captura."))),
      "image/jpeg",
      0.88,
    );
  });
}

async function captureElement(target) {
  const [{ default: html2canvas }] = await Promise.all([
    import("html2canvas"),
    document.fonts?.ready || Promise.resolve(),
  ]);
  const height = Math.max(target.scrollHeight, target.getBoundingClientRect().height);
  const scale = height > 9_000 ? 1 : Math.min(window.devicePixelRatio || 1, 1.35);
  const canvas = await html2canvas(target, {
    backgroundColor: "#ffffff",
    imageTimeout: 15_000,
    logging: false,
    scale,
    useCORS: true,
    windowHeight: Math.ceil(height),
    windowWidth: Math.ceil(Math.max(target.scrollWidth, target.getBoundingClientRect().width)),
  });
  return canvasBlob(canvas);
}

async function captureElementSafely(target) {
  let timeoutId;
  try {
    return await Promise.race([
      captureElement(target),
      new Promise((_, reject) => {
        timeoutId = window.setTimeout(
          () => reject(new Error()),
          CAPTURE_TIMEOUT_MS,
        );
      }),
    ]);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function safeFilePart(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 70);
}

function totalAttachmentBytes(attachments) {
  return attachments.reduce((total, attachment) => total + attachment.file.size, 0);
}

export async function sendFormSubmission({
  form,
  type,
  title,
  submissionId,
  answers,
  attachments = [],
  replyTo = "",
  captureTarget = form,
  onCaptured,
}) {
  const resolvedSubmissionId = resolveSubmissionId(form, submissionId);
  const selectedFilesSize = totalAttachmentBytes(attachments);
  if (selectedFilesSize > MAX_UPLOAD_BYTES) {
    throw new Error("Los archivos superan el límite total de 17 MB.");
  }

  const cachedSnapshot = pendingSubmissionSnapshots.get(form);
  let snapshot = cachedSnapshot?.submissionId === resolvedSubmissionId
    ? cachedSnapshot.blob
    : await captureElementSafely(captureTarget);
  if (snapshot && selectedFilesSize + snapshot.size > MAX_UPLOAD_BYTES) {
    snapshot = null;
  }
  if (cachedSnapshot?.submissionId !== resolvedSubmissionId) {
    pendingSubmissionSnapshots.set(form, {
      submissionId: resolvedSubmissionId,
      blob: snapshot,
    });
  }
  onCaptured?.();

  const submittedAt = new Date().toISOString();
  const submissionFiles = attachments.map((attachment, index) => ({
    index,
    ...(cleanText(attachment.key) ? { key: cleanText(attachment.key) } : {}),
    label: cleanText(attachment.label) || "Archivo adjunto",
    name: attachment.file.name,
  }));
  const payload = {
    submissionId: resolvedSubmissionId,
    type: cleanText(type),
    title: cleanText(title),
    answers: answers.map((answer) => {
      const key = cleanText(answer.key);
      return {
        ...(key ? { key } : {}),
        section: cleanText(answer.section) || "Datos enviados",
        label: cleanText(answer.label) || "Campo",
        value: cleanText(answer.value) || "Sin respuesta",
      };
    }),
    attachments: submissionFiles,
    pageUrl: window.location.href,
    replyTo: cleanText(replyTo),
    submittedAt,
  };

  const data = new FormData();
  data.append("payload", JSON.stringify(payload));
  data.append("website", "");
  if (snapshot) {
    data.append(
      "snapshot",
      new File([snapshot], `captura-${safeFilePart(title) || "formulario"}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      }),
    );
  }
  attachments.forEach(({ file }) => data.append("attachments", file, file.name));

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(FORM_API_ENDPOINT, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: data,
      signal: controller.signal,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      const submissionError = new Error(result.message || "No se ha podido enviar el formulario.");
      submissionError.status = response.status;
      submissionError.code = cleanText(result.code);
      submissionError.retryAfterMs = Number(result.retryAfterMs) || 0;
      throw submissionError;
    }
    resetFormSubmissionId(form);
    return result;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("El envío ha tardado demasiado. Revisa la conexión y vuelve a intentarlo.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
