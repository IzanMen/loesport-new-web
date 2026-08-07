import assert from "node:assert/strict";
import test from "node:test";

import { summarizeError } from "../server/error-summary.js";

const SUBMISSION_ID = "123e4567-e89b-42d3-a456-426614174000";
const SENSITIVE_VALUES = [
  "12345678Z",
  "ES9121000418450200051332",
  "Content-Type: multipart/mixed; boundary=raw-secret",
  "mensaje externo con datos personales",
  "Bearer token-super-secreto",
];

test("resume errores externos sin filtrar DNI, IBAN, MIME ni detalles de petición", () => {
  const error = Object.assign(
    new Error(`mensaje externo con datos personales · DNI 12345678Z · IBAN ES9121000418450200051332`),
    {
      name: "GaxiosError",
      code: "E_EXTERNAL_API",
      config: {
        headers: { authorization: "Bearer token-super-secreto" },
        data: "Content-Type: multipart/mixed; boundary=raw-secret",
      },
      request: { rawMime: "Content-Type: multipart/mixed; boundary=raw-secret" },
      requestBody: { dni: "12345678Z", iban: "ES9121000418450200051332" },
      response: {
        status: 503,
        config: { requestBody: "12345678Z" },
        data: { error: "ES9121000418450200051332" },
      },
    },
  );

  const summary = summarizeError(error, { submissionId: SUBMISSION_ID });

  assert.deepEqual(summary, {
    name: "GaxiosError",
    code: "E_EXTERNAL_API",
    status: 503,
    message: "External API request failed.",
    submissionId: SUBMISSION_ID,
  });
  assert.equal(Object.hasOwn(summary, "config"), false);
  assert.equal(Object.hasOwn(summary, "request"), false);
  assert.equal(Object.hasOwn(summary, "requestBody"), false);
  assert.equal(Object.hasOwn(summary, "response"), false);

  const serialized = JSON.stringify(summary);
  for (const sensitiveValue of SENSITIVE_VALUES) {
    assert.equal(serialized.includes(sensitiveValue), false);
  }
  assert.doesNotMatch(serialized, /rawMime|requestBody|authorization|config/i);
});

test("limpia controles, compacta espacios y limita mensajes internos", () => {
  const error = Object.assign(
    new Error(`  Primera línea\n\u0000Segunda línea  ${"x".repeat(500)}  `),
    {
      name: "  Internal\nError  ",
      code: "  INTERNAL\u0000CODE  ",
      status: 500,
    },
  );

  const summary = summarizeError(error);

  assert.equal(summary.name, "Internal Error");
  assert.equal(summary.code, "INTERNAL CODE");
  assert.equal(summary.status, 500);
  assert.equal(summary.message.includes("\n"), false);
  assert.equal(summary.message.includes("\u0000"), false);
  assert.equal(summary.message.length, 300);
});
