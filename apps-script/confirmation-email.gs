const EXPECTED_TOKEN = "ASDFLMKÑDASF134KJNÑNÑ413NÑKNÑLK34M56";
const CLUB_REPLY_TO = "loesport@gmail.com";
const ALLOWED_FORM_TYPES = new Set(["inscripcion", "preinscripcion"]);
const MAX_SUMMARY_ROWS = 18;

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength || 500);
}

function validEmail(value) {
  const email = cleanText(value, 254);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function isSensitiveAnswer(answer) {
  const key = cleanText(answer.key, 120).toLowerCase();
  const text = `${cleanText(answer.section, 160)} ${cleanText(answer.label, 200)}`.toLowerCase();
  return [
    "iban",
    "bank",
    "bancari",
    "bancarios",
    "documento",
    "dni",
    "nie",
    "pasaporte",
    "licencia",
    "salud",
    "enfermed",
    "alerg",
    "privacidad",
    "protección",
    "proteccion",
    "autoriz",
    "condiciones",
    "consent",
  ].some((needle) => key.includes(needle) || text.includes(needle));
}

function safeAnswers(answers) {
  return (Array.isArray(answers) ? answers : [])
    .filter((answer) => answer && !isSensitiveAnswer(answer))
    .map((answer) => ({
      label: cleanText(answer.label, 200) || "Campo",
      value: cleanText(answer.value, 700) || "Sin respuesta",
    }))
    .filter((answer) => answer.value !== "Sin respuesta")
    .slice(0, MAX_SUMMARY_ROWS);
}

function formatDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return Utilities.formatDate(new Date(), "Europe/Madrid", "dd/MM/yyyy HH:mm");
  return Utilities.formatDate(date, "Europe/Madrid", "dd/MM/yyyy HH:mm");
}

function htmlEscape(value) {
  return cleanText(value, 1000)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildHtml(payload, rows) {
  const rowHtml = rows.length
    ? rows.map((row) => `
      <tr>
        <td style="width:38%;padding:10px 12px;border-top:1px solid #d7d7d2;font:700 12px Arial,sans-serif;color:#4e504b;text-transform:uppercase;vertical-align:top;">${htmlEscape(row.label)}</td>
        <td style="padding:10px 12px;border-top:1px solid #d7d7d2;font:14px/1.45 Arial,sans-serif;color:#0b0c0d;vertical-align:top;">${htmlEscape(row.value)}</td>
      </tr>`).join("")
    : `<tr><td style="padding:12px;font:14px Arial,sans-serif;color:#0b0c0d;">Hemos recibido correctamente tu formulario.</td></tr>`;

  return `<!doctype html>
    <html lang="es">
      <body style="margin:0;padding:0;background:#efeee8;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#efeee8;">
          <tr><td align="center" style="padding:28px 12px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:720px;background:#ffffff;border:1px solid #cdcec9;border-collapse:collapse;">
              <tr><td style="padding:22px 24px;background:#0b0c0d;border-bottom:6px solid #d9ff00;">
                <p style="margin:0 0 7px;font:800 12px Arial,sans-serif;letter-spacing:1.2px;color:#d9ff00;text-transform:uppercase;">Lô Esport Menorca</p>
                <h1 style="margin:0;font:800 28px Arial,sans-serif;color:#ffffff;">Hemos recibido tu formulario</h1>
                <p style="margin:9px 0 0;font:13px Arial,sans-serif;color:#c7c9c5;">Recibido el ${htmlEscape(formatDate(payload.submittedAt))}</p>
              </td></tr>
              <tr><td style="padding:24px;">
                <p style="margin:0 0 16px;font:15px/1.55 Arial,sans-serif;color:#0b0c0d;">Gracias. El club revisará la solicitud y contactará contigo si necesitamos confirmar algún dato.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #d7d7d2;border-collapse:collapse;background:#f5f5f1;">${rowHtml}</table>
              </td></tr>
              <tr><td style="padding:18px 24px;background:#f5f5f1;border-top:1px solid #d7d7d2;font:12px/1.5 Arial,sans-serif;color:#62645f;">
                ID de envío: ${htmlEscape(payload.submissionId)}<br />
                Este correo es una confirmación automática. No incluye documentos adjuntos ni datos especialmente sensibles.
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
    </html>`;
}

function buildText(payload, rows) {
  const lines = [
    "LÔ ESPORT MENORCA",
    "Hemos recibido tu formulario.",
    `Recibido el ${formatDate(payload.submittedAt)}`,
    "",
    "Resumen:",
  ];
  rows.forEach((row) => lines.push(`${row.label}: ${row.value}`));
  lines.push(
    "",
    `ID de envío: ${cleanText(payload.submissionId, 80)}`,
    "Este correo es una confirmación automática. No incluye documentos adjuntos ni datos especialmente sensibles.",
  );
  return lines.join("\n");
}

function recentlySent(email, submissionId) {
  const cache = CacheService.getScriptCache();
  const key = Utilities.base64EncodeWebSafe(`${email}:${submissionId}`).slice(0, 200);
  if (cache.get(key)) return true;
  cache.put(key, "1", 21600);
  return false;
}

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData && event.postData.contents || "{}");
    if (EXPECTED_TOKEN !== "CAMBIA_ESTE_TEXTO" && payload.token !== EXPECTED_TOKEN) {
      return jsonResponse({ ok: false, error: "unauthorized" });
    }

    const formType = cleanText(payload.type, 60);
    const email = validEmail(payload.replyTo);
    if (!ALLOWED_FORM_TYPES.has(formType) || !email) {
      return jsonResponse({ ok: false, error: "bad_request" });
    }
    if (recentlySent(email, cleanText(payload.submissionId, 80))) {
      return jsonResponse({ ok: true, deduplicated: true });
    }

    const rows = safeAnswers(payload.answers);
    GmailApp.sendEmail(
      email,
      `Confirmación de recepción · ${cleanText(payload.title, 120) || "Formulario"}`,
      buildText(payload, rows),
      {
        name: "Lô Esport Menorca",
        replyTo: CLUB_REPLY_TO,
        htmlBody: buildHtml(payload, rows),
      },
    );
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: "internal_error" });
  }
}
