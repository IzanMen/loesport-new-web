import {
  getFamilyAdultGroup,
  getFamilySchoolGroups,
  getTrainingGroup,
  getTrainingLocation,
} from "../data/training-groups.js";
import { translatePhrase } from "../i18n/index.js";
import {
  FORM_DEFINITIONS,
  collectRegistrationSubmission,
  createSection,
  createTextElement,
  updateConditionalFields,
  validateCheckboxGroups,
  validateFileInputs,
  validateGroupSelections,
  validateOtherResponses,
  validateTrainingOptions,
} from "./registration-forms.js";
import {
  createSubmissionId,
  resetFormSubmissionId,
  sendFormSubmission,
} from "./form-submission.js";

export const FAMILY_ROW_KEYS = Object.freeze([
  "training_location",
  "training_group_id",
  "training_group_name",
  "training_day_count",
  "training_selected_days",
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
]);

const FAMILY_ANSWER_LABELS = Object.freeze({
  training_location: "Sede",
  training_group_id: "ID del grupo",
  training_group_name: "Grupo",
  training_day_count: "Días por semana",
  training_selected_days: "Días elegidos",
  participant_residence_city: "Población de residencia",
  participant_full_name: "Nombre y apellidos",
  participant_birth_date: "Fecha de nacimiento",
  participant_sex: "Sexo",
  participant_document_number: "Documento de identidad",
  participant_document_front: "Documento de identidad · parte delantera",
  participant_document_back: "Documento de identidad · parte trasera",
  club_membership_status: "Alta o renovación",
  participant_address: "Dirección",
  participant_postal_code: "Código postal",
  participant_nationality: "Nacionalidad",
  contact_phone: "Teléfono de contacto",
  guardian_full_name: "Nombre y apellidos del tutor legal",
  guardian_document_number: "Documento de identidad del tutor legal",
  guardian_document_front: "Documento del tutor legal · parte delantera",
  guardian_document_back: "Documento del tutor legal · parte trasera",
  guardian_birth_date: "Fecha de nacimiento del tutor legal",
  payment_method: "Modalidad y forma de pago",
  direct_debit_authorization: "Autorización de domiciliación",
  bank_details: "Datos bancarios",
  image_use_authorization: "Autorización de uso de imagen",
  offsite_activity_authorization: "Autorización para actividades fuera",
  accident_protocol_acknowledgement: "Conformidad con el protocolo de accidentes",
  participant_health_information: "Información médica, alergias y observaciones de salud",
  comments: "Observaciones o sugerencias",
  privacy_consent: "Consentimiento de privacidad",
  terms_consent: "Aceptación de condiciones",
});

const baseDefinition = FORM_DEFINITIONS.inscripcion;
const baseFields = new Map(
  baseDefinition.sections.flatMap((section) =>
    section.fields.filter((field) => field.key).map((field) => [field.key, field]),
  ),
);
const licenseNotice = baseDefinition.sections
  .flatMap((section) => section.fields)
  .find((field) => field.entry === "license-information");

function setFamilyTranslation(element, phrase, params = {}) {
  element.dataset.familyTranslation = phrase;
  element.dataset.familyTranslationParams = JSON.stringify(params);
  element.textContent = translatePhrase(phrase, params);
  return element;
}

function createFamilyTextElement(tag, className, phrase, params = {}) {
  return setFamilyTranslation(createTextElement(tag, className, ""), phrase, params);
}

function updateFamilyTranslations(root) {
  root.querySelectorAll("[data-family-translation]").forEach((element) => {
    let params = {};
    try {
      params = JSON.parse(element.dataset.familyTranslationParams || "{}");
    } catch {
      params = {};
    }
    element.textContent = translatePhrase(element.dataset.familyTranslation, params);
  });
}

function suffixedEntry(entry, suffix) {
  return entry ? `${entry}-${suffix}` : entry;
}

function cloneField(field, suffix, overrides = {}) {
  const cloned = {
    ...field,
    entry: suffixedEntry(field.entry, suffix),
    ...(field.dayCountEntry ? { dayCountEntry: suffixedEntry(field.dayCountEntry, suffix) } : {}),
    ...(field.daysEntry ? { daysEntry: suffixedEntry(field.daysEntry, suffix) } : {}),
    ...(field.showWhenEntry ? { showWhenEntry: suffixedEntry(field.showWhenEntry, suffix) } : {}),
    ...(field.requiredWhenNieEntry
      ? { requiredWhenNieEntry: suffixedEntry(field.requiredWhenNieEntry, suffix) }
      : {}),
    ...(field.requiredWhenMinorEntry
      ? { requiredWhenMinorEntry: suffixedEntry(field.requiredWhenMinorEntry, suffix) }
      : {}),
    ...overrides,
  };
  return cloned;
}

function fieldsFor(keys, suffix, overrides = {}) {
  return keys.map((key) => {
    const field = baseFields.get(key);
    if (!field) throw new Error(`No existe el campo de inscripción ${key}.`);
    return cloneField(field, suffix, overrides[key]);
  });
}

function sharedDefinition() {
  const suffix = "familia";
  return {
    sections: [
      {
        title: "Datos comunes de la familia",
        description: "Se aplicarán a todas las personas de esta inscripción.",
        fields: fieldsFor(
          [
            "participant_residence_city",
            "participant_address",
            "participant_postal_code",
            "contact_phone",
          ],
          suffix,
        ),
      },
      {
        title: "Madre, padre o tutor legal",
        description: "Estos datos se guardarán únicamente en las filas de los hijos e hijas.",
        fields: fieldsFor(
          [
            "guardian_full_name",
            "guardian_document_number",
            "guardian_document_front",
            "guardian_document_back",
            "guardian_birth_date",
          ],
          suffix,
          {
            guardian_full_name: { required: true },
            guardian_document_number: { required: true },
            guardian_document_front: { required: true, requiredWhenMinorEntry: undefined },
            guardian_document_back: { required: true, requiredWhenMinorEntry: undefined },
            guardian_birth_date: { required: true },
          },
        ),
      },
      {
        title: "Un único pago para la familia",
        description: "La opción elegida se reflejará en cada fila para facilitar la gestión.",
        fields: fieldsFor(
          ["payment_method", "direct_debit_authorization", "bank_details"],
          suffix,
        ),
      },
      {
        title: "Privacidad y condiciones",
        description: "La persona responsable acepta en nombre de esta inscripción familiar.",
        fields: fieldsFor(["privacy_consent", "terms_consent"], suffix),
      },
    ],
  };
}

function memberDefinition({ role, number, locationId, contextualGroupId }) {
  const suffix = `${role}-${number}`;
  const isChild = role === "child";
  const allowedGroups = isChild
    ? getFamilySchoolGroups(locationId)
    : [getFamilyAdultGroup(locationId)].filter(Boolean);
  const groupField = cloneField(baseFields.get("training"), suffix, {
    fixedLocation: locationId,
    allowedGroupIds: allowedGroups.map((group) => group.id),
    allowContextGroup: Boolean(isChild && number === 1 && contextualGroupId),
    familyPricing: !isChild,
    allowedDayCounts: !isChild ? [1, 2] : undefined,
  });
  const participantFields = fieldsFor(
    [
      "participant_full_name",
      "participant_birth_date",
      "participant_sex",
      "participant_document_number",
      "participant_document_front",
      "participant_document_back",
      "club_membership_status",
      "participant_nationality",
    ],
    suffix,
  );
  const authorizationKeys = [
    "image_use_authorization",
    ...(isChild ? ["offsite_activity_authorization"] : []),
    "accident_protocol_acknowledgement",
    "participant_health_information",
    "comments",
  ];

  return {
    sections: [
      {
        title: translatePhrase(isChild ? "Grupo del hijo/a {number}" : "Grupo del adulto/a {number}", {
          number,
        }),
        description: isChild
          ? "Elige su grupo escolar y los días concretos."
          : "El grupo de madres y padres coincide con el horario de la escuela.",
        fields: [groupField],
      },
      {
        title: translatePhrase(isChild ? "Datos del hijo/a {number}" : "Datos del adulto/a {number}", {
          number,
        }),
        description: "Documentación y datos propios de esta persona.",
        fields: participantFields,
      },
      {
        title: "Salud y autorizaciones",
        fields: [cloneField(licenseNotice, suffix), ...fieldsFor(authorizationKeys, suffix)],
      },
    ],
  };
}

function wireDefinitionForm(form) {
  form.querySelectorAll("[data-required-checkboxes]").forEach((group) => {
    group.addEventListener("change", () => validateCheckboxGroups(form));
  });
  form.querySelectorAll(".registration-other-input").forEach((input) => {
    input.addEventListener("input", () => validateOtherResponses(form));
  });
  form.querySelectorAll(".registration-training-field").forEach((field) => {
    field.addEventListener("change", () => validateTrainingOptions(form));
    field.addEventListener("input", () => validateTrainingOptions(form));
  });
  form.querySelectorAll("[data-show-when-entry]").forEach((field) => {
    const controllingEntry = field.dataset.showWhenEntry;
    form.querySelectorAll(`[name="entry.${CSS.escape(controllingEntry)}"]`).forEach((input) => {
      input.addEventListener("change", () => updateConditionalFields(form));
      input.addEventListener("input", () => updateConditionalFields(form));
    });
  });
  form.querySelectorAll("[data-file-input]").forEach((input) => {
    input.addEventListener("change", () => validateFileInputs(form));
  });
  updateConditionalFields(form);
}

function createDefinitionForm(definition, idPrefix) {
  const form = document.createElement("form");
  form.className = "registration-form family-definition-form";
  form.enctype = "multipart/form-data";
  definition.sections.forEach((section, index) => {
    form.append(createSection(section, index, idPrefix));
  });
  form.addEventListener("submit", (event) => event.preventDefault());
  wireDefinitionForm(form);
  return form;
}

function validateDefinitionForm(form, { groups = false } = {}) {
  updateConditionalFields(form);
  validateCheckboxGroups(form);
  validateOtherResponses(form);
  validateTrainingOptions(form);
  validateFileInputs(form);
  if (groups && !validateGroupSelections(form, { focus: true })) return false;
  if (form.reportValidity()) return true;
  form.querySelector(":invalid")?.focus();
  return false;
}

function answerMap(answers) {
  return new Map(answers.map((answer) => [answer.key, answer]));
}

function familyMarker({ reference, role, number, position, total, qualifiesForGeneralDiscount }) {
  const parts = [
    `INSCRIPCIÓN FAMILIAR · Ref. ${reference}`,
    `Miembro ${position}/${total}`,
    role === "child" ? `Hijo/a ${number}` : `Madre/padre ${number}`,
  ];
  if (role === "parent") {
    parts.push("TARIFA MADRES/PADRES CON HIJO/A EN LA ESCUELA: SÍ");
  }
  if (qualifiesForGeneralDiscount) {
    parts.push("DESCUENTO FAMILIAR DE 3 O MÁS MIEMBROS: SÍ");
  }
  return parts.join(" · ");
}

export function buildFamilyMemberAnswers({
  sharedAnswers,
  memberAnswers,
  role,
  number,
  position,
  total,
  reference,
}) {
  const shared = answerMap(sharedAnswers);
  const member = answerMap(memberAnswers);
  const values = new Map([...shared, ...member]);
  const originalComments = member.get("comments")?.value;
  values.set("comments", {
    key: "comments",
    value: [
      familyMarker({
        reference,
        role,
        number,
        position,
        total,
        qualifiesForGeneralDiscount: total >= 3,
      }),
      originalComments && originalComments !== "Sin respuesta" ? originalComments : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  if (role === "parent") {
    [
      "guardian_full_name",
      "guardian_document_number",
      "guardian_document_front",
      "guardian_document_back",
      "guardian_birth_date",
      "offsite_activity_authorization",
    ].forEach((key) => values.delete(key));
  }

  return FAMILY_ROW_KEYS.map((key) => ({
    key,
    section: key.startsWith("training_")
      ? "Grupo y horario"
      : key === "comments"
        ? "Identificación familiar"
        : "Datos de inscripción",
    label: FAMILY_ANSWER_LABELS[key],
    value: values.get(key)?.value || "Sin respuesta",
  }));
}

function createSetupChoice(name, value, title, detail, checked = false) {
  const label = document.createElement("label");
  label.className = "family-setup-choice";
  const input = document.createElement("input");
  input.type = "radio";
  input.name = name;
  input.value = value;
  input.required = true;
  input.checked = checked;
  const marker = document.createElement("span");
  marker.className = "registration-choice-marker";
  marker.setAttribute("aria-hidden", "true");
  const text = document.createElement("span");
  text.append(createTextElement("strong", "", title), createTextElement("small", "", detail));
  label.append(input, marker, text);
  return label;
}

function createCountSelect(name, labelText, options, selectedValue) {
  const label = document.createElement("label");
  label.className = "family-count-field";
  label.append(createTextElement("span", "", labelText));
  const select = document.createElement("select");
  select.name = name;
  options.forEach((value) => {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = String(value);
    option.selected = value === selectedValue;
    select.append(option);
  });
  label.append(select);
  return label;
}

function createSetup(root, initialLocationId, onReady) {
  const section = document.createElement("section");
  section.className = "family-setup";
  const heading = document.createElement("header");
  heading.append(
    createTextElement("p", "eyebrow", "Paso 1 de 2"),
    createTextElement("h2", "", "¿Quién se inscribe?"),
    createTextElement(
      "p",
      "",
      "Indica la sede y cuántas personas van a entrenar. La persona adulta que solo actúa como tutor no se cuenta.",
    ),
  );
  const form = document.createElement("form");
  form.className = "family-setup-form";
  const locations = document.createElement("fieldset");
  locations.className = "family-setup-locations";
  locations.append(createTextElement("legend", "", "Sede de la escuela"));
  locations.append(
    createSetupChoice(
      "family-location",
      "mao",
      "Maó",
      "Escuela y madres/padres · 17:30–18:30",
      initialLocationId === "mao",
    ),
    createSetupChoice(
      "family-location",
      "alaior",
      "Alaior",
      "Escuela y madres/padres · 17:15–18:15",
      initialLocationId === "alaior",
    ),
  );
  const counts = document.createElement("div");
  counts.className = "family-counts";
  counts.append(
    createCountSelect("children", "Hijos/as que se inscriben", [1, 2, 3, 4, 5, 6], 1),
    createCountSelect("parents", "Adultos/as que también entrenan", [0, 1, 2], 1),
  );
  const note = createTextElement(
    "p",
    "family-setup-note",
    "Cada participante acabará en una fila independiente de la hoja de inscripciones.",
  );
  const button = document.createElement("button");
  button.type = "submit";
  button.className = "family-setup-submit";
  button.textContent = "Preparar inscripción familiar →";
  form.append(locations, counts, note, button);
  section.append(heading, form);
  root.append(section);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const configuration = {
      locationId: String(data.get("family-location")),
      children: Number(data.get("children")),
      parents: Number(data.get("parents")),
    };
    if (!configuration.locationId || configuration.children < 1) return;
    section.hidden = true;
    onReady(configuration, () => {
      section.hidden = false;
      root.querySelector(".family-workspace")?.remove();
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function createMemberCard(member, configuration, contextualGroupId) {
  const isChild = member.role === "child";
  const definition = memberDefinition({
    role: member.role,
    number: member.number,
    locationId: configuration.locationId,
    contextualGroupId,
  });
  const card = document.createElement("article");
  card.className = `family-member-card is-${member.role}`;
  const heading = document.createElement("header");
  const badge = createTextElement("span", "family-member-badge", isChild ? "Hijo/a" : "Madre/padre");
  heading.append(
    badge,
    createFamilyTextElement(
      "h2",
      "",
      isChild ? "Hijo/a {number}" : "Adulto/a {number}",
      { number: member.number },
    ),
    createTextElement(
      "p",
      "",
      isChild
        ? "Elige su grupo y completa solo sus datos personales."
        : "Se aplicará la tarifa especial por entrenar mientras está la escuela.",
    ),
  );
  const form = createDefinitionForm(definition, `family-${member.role}-${member.number}`);
  card.append(heading, form);
  return { ...member, card, form, definition };
}

function setLocked(forms, locked) {
  forms.forEach((form) => {
    form.querySelectorAll("input, textarea, select").forEach((control) => {
      control.disabled = locked;
    });
  });
}

function createWorkspace(root, configuration, resetSetup) {
  const requestedGroup = getTrainingGroup(new URLSearchParams(window.location.search).get("grupo"));
  const contextualGroupId =
    requestedGroup?.familyRole === "school" && requestedGroup.location === configuration.locationId
      ? requestedGroup.id
      : "";
  const location = getTrainingLocation(configuration.locationId);
  const total = configuration.children + configuration.parents;
  const workspace = document.createElement("div");
  workspace.className = "family-workspace";

  const overview = document.createElement("section");
  overview.className = "family-overview";
  const overviewCopy = document.createElement("div");
  overviewCopy.append(
    createTextElement("p", "eyebrow", "Paso 2 de 2"),
    createFamilyTextElement(
      "h2",
      "",
      total === 1 ? "{total} participante · {location}" : "{total} participantes · {location}",
      { total, location: location.title },
    ),
    createFamilyTextElement(
      "p",
      "",
      "Hijos/as: {children} · Adultos/as: {parents}. Los datos comunes se rellenan una sola vez.",
      { children: configuration.children, parents: configuration.parents },
    ),
  );
  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.textContent = "Cambiar composición";
  resetButton.addEventListener("click", () => {
    if (workspace.querySelector("input:valid, textarea:valid") && !window.confirm(
      translatePhrase("Se perderán los datos que hayas escrito. ¿Quieres volver a empezar?"),
    )) return;
    resetSetup();
  });
  overview.append(overviewCopy, resetButton);
  workspace.append(overview);

  const commonHeading = document.createElement("header");
  commonHeading.className = "family-block-heading";
  commonHeading.append(
    createTextElement("span", "", "01"),
    createTextElement("div", "", ""),
  );
  commonHeading.lastElementChild.append(
    createTextElement("p", "eyebrow", "Una sola vez"),
    createTextElement("h2", "", "Datos comunes"),
    createTextElement("p", "", "Domicilio, tutor legal, pago y consentimientos para toda la familia."),
  );
  workspace.append(commonHeading);
  const common = sharedDefinition();
  const sharedForm = createDefinitionForm(common, "family-common");
  sharedForm.classList.add("family-common-form");
  workspace.append(sharedForm);

  const membersHeading = document.createElement("header");
  membersHeading.className = "family-block-heading";
  membersHeading.append(createTextElement("span", "", "02"), createTextElement("div", "", ""));
  membersHeading.lastElementChild.append(
    createTextElement("p", "eyebrow", "Una ficha por persona"),
    createTextElement("h2", "", "Participantes"),
    createTextElement("p", "", "Cada ficha generará su propia fila en la hoja de inscripciones."),
  );
  workspace.append(membersHeading);

  const membersContainer = document.createElement("div");
  membersContainer.className = "family-members";
  const members = [
    ...Array.from({ length: configuration.children }, (_, index) => ({
      role: "child",
      number: index + 1,
    })),
    ...Array.from({ length: configuration.parents }, (_, index) => ({
      role: "parent",
      number: index + 1,
    })),
  ].map((member) => createMemberCard(member, configuration, contextualGroupId));
  members.forEach((member) => membersContainer.append(member.card));
  workspace.append(membersContainer);

  const submit = document.createElement("section");
  submit.className = "family-submit";
  const submitCopy = document.createElement("div");
  submitCopy.append(
    createFamilyTextElement(
      "strong",
      "",
      total === 1 ? "Enviar {total} inscripción" : "Enviar {total} inscripciones",
      { total },
    ),
    createTextElement(
      "p",
      "family-submit-note",
      "Se guardará una fila por persona con una misma referencia familiar.",
    ),
  );
  const submitButton = document.createElement("button");
  submitButton.type = "button";
  submitButton.append(createTextElement("span", "", "Enviar familia"), createTextElement("span", "", "→"));
  submit.append(submitCopy, submitButton);
  workspace.append(submit);

  const success = document.createElement("section");
  success.className = "registration-success family-success";
  success.hidden = true;
  success.tabIndex = -1;
  workspace.append(success);
  root.append(workspace);
  overview.scrollIntoView({ behavior: "smooth", block: "start" });

  const forms = [sharedForm, ...members.map((member) => member.form)];
  const completed = new Set();
  let memberSubmissionIds = Array(total).fill("");
  let familyReference = "";
  let sending = false;
  let previousAttemptFailed = false;

  workspace.addEventListener("input", () => {
    if (!previousAttemptFailed || completed.size) return;
    memberSubmissionIds = Array(total).fill("");
    members.forEach((member) => resetFormSubmissionId(member.form));
    familyReference = "";
    previousAttemptFailed = false;
  });

  submitButton.addEventListener("click", async () => {
    if (sending) return;
    if (!validateDefinitionForm(sharedForm)) return;
    for (const member of members) {
      if (!validateDefinitionForm(member.form, { groups: true })) {
        member.card.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    sending = true;
    previousAttemptFailed = false;
    submitButton.disabled = true;
    submitButton.classList.add("is-loading");
    const note = submit.querySelector(".family-submit-note");
    note.classList.remove("has-error");
    if (!familyReference) {
      familyReference = `FAM-${createSubmissionId().split("-")[0].toUpperCase()}`;
    }
    memberSubmissionIds = memberSubmissionIds.map((id) => id || createSubmissionId());
    const sharedSubmission = collectRegistrationSubmission(common, sharedForm);

    try {
      for (let index = 0; index < members.length; index += 1) {
        if (completed.has(index)) continue;
        const member = members[index];
        const memberSubmission = collectRegistrationSubmission(member.definition, member.form);
        const answers = buildFamilyMemberAnswers({
          sharedAnswers: sharedSubmission.answers,
          memberAnswers: memberSubmission.answers,
          role: member.role,
          number: member.number,
          position: index + 1,
          total,
          reference: familyReference,
        });
        const sharedAttachments = member.role === "child"
          ? sharedSubmission.attachments.filter((attachment) => attachment.key.startsWith("guardian_"))
          : [];
        const attachments = [...memberSubmission.attachments, ...sharedAttachments];
        const rolePhrase = member.role === "child" ? "hijo/a" : "adulto/a";
        setFamilyTranslation(
          note,
          "Guardando {position} de {total}: {role} {number}...",
          {
            position: index + 1,
            total,
            role: translatePhrase(rolePhrase),
            number: member.number,
          },
        );
        try {
          await sendFormSubmission({
            form: member.form,
            type: "inscripcion",
            title: `Inscripción familiar · ${familyReference}`,
            submissionId: memberSubmissionIds[index],
            answers,
            attachments,
            captureTarget: member.card,
          });
        } catch (error) {
          if (["SUBMISSION_FINGERPRINT_CONFLICT", "DRIVE_PAYLOAD_CONFLICT"].includes(error.code)) {
            memberSubmissionIds[index] = "";
            resetFormSubmissionId(member.form);
          }
          throw error;
        }
        completed.add(index);
        if (completed.size === 1) setLocked(forms, true);
      }

      overview.hidden = true;
      commonHeading.hidden = true;
      sharedForm.hidden = true;
      membersHeading.hidden = true;
      membersContainer.hidden = true;
      submit.hidden = true;
      success.replaceChildren(
        createTextElement("p", "eyebrow", "Familia inscrita"),
        createTextElement("h2", "", "Todo listo."),
        createFamilyTextElement(
          "p",
          "",
          "Hemos guardado {total} filas vinculadas con la referencia {reference}. El club las verá agrupadas como una única familia.",
          { total, reference: familyReference },
        ),
      );
      const homeLink = createTextElement("a", "button button-primary", "Volver a la web");
      homeLink.href = "/#gestiones";
      success.append(homeLink);
      success.hidden = false;
      success.focus({ preventScroll: true });
      success.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      previousAttemptFailed = true;
      note.classList.add("has-error");
      const errorMessage = translatePhrase(
        error.message || "No se ha podido enviar el formulario. Inténtalo de nuevo.",
      );
      if (completed.size) {
        setFamilyTranslation(
          note,
          "{completed} de {total} personas ya están guardadas y no se duplicarán. {message}",
          { completed: completed.size, total, message: errorMessage },
        );
      } else {
        note.removeAttribute("data-family-translation");
        note.removeAttribute("data-family-translation-params");
        note.textContent = errorMessage;
      }
      setFamilyTranslation(
        submitButton.querySelector("span:first-child"),
        completed.size ? "Continuar envío" : "Reintentar",
      );
    } finally {
      sending = false;
      submitButton.disabled = false;
      submitButton.classList.remove("is-loading");
    }
  });
}

export function initFamilyRegistrationForm() {
  const root = document.querySelector("[data-family-registration-form]");
  if (!root) return;
  const requestedGroup = getTrainingGroup(new URLSearchParams(window.location.search).get("grupo"));
  const initialLocationId = requestedGroup?.familyRole === "school" ? requestedGroup.location : "mao";
  createSetup(root, initialLocationId, (configuration, resetSetup) => {
    createWorkspace(root, configuration, resetSetup);
  });
  document.addEventListener("loesport:languagechange", () => updateFamilyTranslations(root));
}
