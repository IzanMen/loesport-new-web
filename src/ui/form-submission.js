const CLOUD_FORM_API_ENDPOINT = "https://loesport-web-473754422972.europe-southwest1.run.app/api/forms";
const localHostname = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const FORM_API_ENDPOINT =
  import.meta.env.VITE_FORM_API_ENDPOINT || (localHostname ? "/api/forms" : CLOUD_FORM_API_ENDPOINT);
const MAX_UPLOAD_BYTES = 17 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 90_000;

function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
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
  answers,
  attachments = [],
  replyTo = "",
  captureTarget = form,
  onCaptured,
}) {
  const selectedFilesSize = totalAttachmentBytes(attachments);
  if (selectedFilesSize > MAX_UPLOAD_BYTES) {
    throw new Error("Los archivos superan el límite total de 17 MB.");
  }

  const snapshot = await captureElement(captureTarget);
  if (selectedFilesSize + snapshot.size > MAX_UPLOAD_BYTES) {
    throw new Error("La captura y los archivos superan el límite total de 17 MB.");
  }
  onCaptured?.();

  const submittedAt = new Date().toISOString();
  const submissionFiles = attachments.map((attachment, index) => ({
    index,
    label: cleanText(attachment.label) || "Archivo adjunto",
    name: attachment.file.name,
  }));
  const payload = {
    type: cleanText(type),
    title: cleanText(title),
    answers: answers.map((answer) => ({
      section: cleanText(answer.section) || "Datos enviados",
      label: cleanText(answer.label) || "Campo",
      value: cleanText(answer.value) || "Sin respuesta",
    })),
    attachments: submissionFiles,
    pageUrl: window.location.href,
    replyTo: cleanText(replyTo),
    submittedAt,
  };

  const data = new FormData();
  data.append("payload", JSON.stringify(payload));
  data.append("website", "");
  data.append(
    "snapshot",
    new File([snapshot], `captura-${safeFilePart(title) || "formulario"}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    }),
  );
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
      throw new Error(result.message || "No se ha podido enviar el formulario.");
    }
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
