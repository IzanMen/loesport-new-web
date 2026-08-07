function cleanLogText(value, maxLength) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function externalRequestError(error) {
  return Boolean(
    error?.isAxiosError ||
      error?.config ||
      error?.request ||
      error?.response,
  );
}

export function summarizeError(error, { submissionId = "" } = {}) {
  const status = Number(error?.response?.status ?? error?.status);
  const code = cleanLogText(error?.code, 80);
  const summary = {
    name: cleanLogText(error?.name, 100) || "Error",
    ...(code ? { code } : {}),
    ...(Number.isInteger(status) ? { status } : {}),
    message: externalRequestError(error)
      ? "External API request failed."
      : cleanLogText(error?.message, 300) || "Unexpected error.",
  };
  const normalizedSubmissionId = cleanLogText(submissionId || error?.submissionId, 64);
  if (normalizedSubmissionId) summary.submissionId = normalizedSubmissionId;
  return summary;
}
