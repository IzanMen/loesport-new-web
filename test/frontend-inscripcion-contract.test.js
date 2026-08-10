import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const REGULAR_ANSWER_KEYS = [
  "participant_residence_city",
  "participant_full_name",
  "participant_birth_date",
  "participant_sex",
  "participant_document_number",
  "participant_document_front",
  "participant_document_back",
  "club_membership_status",
  "participant_address",
  "participant_postal_code",
  "participant_nationality",
  "contact_phone",
  "guardian_full_name",
  "guardian_document_number",
  "guardian_document_front",
  "guardian_document_back",
  "guardian_birth_date",
  "payment_method",
  "direct_debit_authorization",
  "bank_details",
  "image_use_authorization",
  "offsite_activity_authorization",
  "accident_protocol_acknowledgement",
  "participant_health_information",
  "comments",
  "privacy_consent",
  "terms_consent",
];

const GROUP_ANSWER_KEYS = [
  "training_location",
  "training_group_id",
  "training_group_name",
  "training_day_count",
  "training_selected_days",
];

const PREINSCRIPCION_ANSWER_KEYS = [
  "participant_full_name",
  "participant_residence_city",
  "participant_birth_date",
  "participant_sex",
  "contact_phone",
  "comments",
  "trial_commitment",
  "privacy_consent",
  "terms_consent",
];

async function frontendSources() {
  const [registrationForms, formSubmission] = await Promise.all([
    readFile(new URL("../src/ui/registration-forms.js", import.meta.url), "utf8"),
    readFile(new URL("../src/ui/form-submission.js", import.meta.url), "utf8"),
  ]);
  return { registrationForms, formSubmission };
}

test("el frontend de inscripción mantiene exactamente 32 claves enviadas", async () => {
  const { registrationForms } = await frontendSources();
  const definitionStart = registrationForms.indexOf("  inscripcion: {");
  const definitionEnd = registrationForms.indexOf("\n  preinscripcion: {", definitionStart);
  assert.ok(definitionStart >= 0 && definitionEnd > definitionStart);

  const definition = registrationForms.slice(definitionStart, definitionEnd);
  const definitionKeys = [...definition.matchAll(/\bkey:\s*"([a-z0-9_]+)"/g)].map((match) => match[1]);
  assert.deepEqual(definitionKeys, ["training", ...REGULAR_ANSWER_KEYS]);

  const getAnswersStart = registrationForms.indexOf("    getAnswers() {");
  const getAnswersEnd = registrationForms.indexOf("\n    },", getAnswersStart);
  assert.ok(getAnswersStart >= 0 && getAnswersEnd > getAnswersStart);
  const getAnswers = registrationForms.slice(getAnswersStart, getAnswersEnd);
  assert.match(getAnswers, /const keyPrefix = field\.key \|\| "training";/);
  const groupKeys = [
    ...getAnswers.matchAll(/createSubmissionAnswer\(`\$\{keyPrefix\}_([a-z0-9_]+)`/g),
  ].map((match) => `training_${match[1]}`);
  assert.deepEqual(groupKeys, GROUP_ANSWER_KEYS);

  const submittedKeys = [...REGULAR_ANSWER_KEYS, ...groupKeys];
  assert.equal(submittedKeys.length, 32);
  assert.equal(new Set(submittedKeys).size, 32);
});

test("el periodo de prueba envía todas sus respuestas con claves semánticas", async () => {
  const { registrationForms } = await frontendSources();
  const definitionStart = registrationForms.indexOf("  preinscripcion: {");
  const definitionEnd = registrationForms.indexOf("\n  baja: {", definitionStart);
  assert.ok(definitionStart >= 0 && definitionEnd > definitionStart);

  const definition = registrationForms.slice(definitionStart, definitionEnd);
  const definitionKeys = [...definition.matchAll(/\bkey:\s*"([a-z0-9_]+)"/g)]
    .map((match) => match[1]);
  assert.deepEqual(definitionKeys, ["training", ...PREINSCRIPCION_ANSWER_KEYS]);

  const submittedKeys = [...GROUP_ANSWER_KEYS, ...PREINSCRIPCION_ANSWER_KEYS];
  assert.equal(submittedKeys.length, 14);
  assert.equal(new Set(submittedKeys).size, 14);
});

test("submissionId se reutiliza al reintentar y se reinicia tras éxito, conflicto o edición", async () => {
  const { registrationForms, formSubmission } = await frontendSources();

  assert.match(registrationForms, /let submissionId = "";/);
  assert.match(registrationForms, /submissionId \|\|= createSubmissionId\(\);/);
  assert.match(registrationForms, /sendFormSubmission\(\{[\s\S]*?submissionId,[\s\S]*?answers:/);
  assert.match(registrationForms, /await sendFormSubmission\([\s\S]*?\);\s*submissionId = "";/);
  assert.match(
    registrationForms,
    /const resetSubmissionAfterEdit = \(\) => \{[\s\S]*?submissionId = "";[\s\S]*?resetFormSubmissionId\(form\);/,
  );
  assert.match(
    registrationForms,
    /\["SUBMISSION_FINGERPRINT_CONFLICT", "DRIVE_PAYLOAD_CONFLICT"\]\.includes\(error\.code\)[\s\S]*?submissionId = "";[\s\S]*?resetFormSubmissionId\(form\);/,
  );
  assert.match(
    registrationForms,
    /files\.forEach\(\(file\) => attachments\.push\(\{\s*key: fieldSubmissionKey\(field\),/,
  );

  assert.match(formSubmission, /const pendingSubmissionIds = new WeakMap\(\);/);
  assert.match(formSubmission, /const pendingSubmissionSnapshots = new WeakMap\(\);/);
  assert.match(
    formSubmission,
    /requestedId \|\| pendingSubmissionIds\.get\(form\) \|\| createSubmissionId\(\)/,
  );
  assert.match(formSubmission, /pendingSubmissionIds\.set\(form, resolvedId\);/);
  assert.match(formSubmission, /pendingSubmissionSnapshots\.delete\(form\);/);
  assert.match(
    formSubmission,
    /const cachedSnapshot = pendingSubmissionSnapshots\.get\(form\);[\s\S]*?cachedSnapshot\?\.submissionId === resolvedSubmissionId[\s\S]*?cachedSnapshot\.blob[\s\S]*?: await captureElementSafely\(captureTarget\);/,
  );
  assert.match(
    formSubmission,
    /pendingSubmissionSnapshots\.set\(form, \{\s*submissionId: resolvedSubmissionId,\s*blob: snapshot,/,
  );
  assert.match(
    formSubmission,
    /\.map\(\(attachment, index\) => \(\{[\s\S]*?key: cleanText\(attachment\.key\)/,
  );
  assert.match(formSubmission, /const payload = \{\s*submissionId: resolvedSubmissionId,/);
  assert.match(
    formSubmission,
    /if \(!response\.ok \|\| !result\.ok\)[\s\S]*?throw submissionError;[\s\S]*?resetFormSubmissionId\(form\);\s*return result;/,
  );
});

test("una captura incompatible o demasiado grande no bloquea el envío", async () => {
  const { formSubmission } = await frontendSources();

  assert.match(
    formSubmission,
    /async function captureElementSafely\(target\)[\s\S]*?Promise\.race\([\s\S]*?captureElement\(target\)[\s\S]*?CAPTURE_TIMEOUT_MS[\s\S]*?catch \{\s*return null;/,
  );
  assert.match(
    formSubmission,
    /if \(snapshot && selectedFilesSize \+ snapshot\.size > MAX_UPLOAD_BYTES\) \{\s*snapshot = null;/,
  );
  assert.match(
    formSubmission,
    /if \(snapshot\) \{\s*data\.append\(\s*"snapshot"/,
  );
  assert.doesNotMatch(formSubmission, /Falta la captura del formulario/);
});
