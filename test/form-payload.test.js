import assert from "node:assert/strict";
import test, { mock } from "node:test";

import { parsePayload } from "../server/form-payload.js";

const VALID_UUID = "123e4567-e89b-42d3-a456-426614174000";

function payload(overrides = {}) {
  return JSON.stringify({
    submissionId: VALID_UUID,
    type: "inscripcion",
    title: "Inscripción",
    answers: [
      {
        key: "participant_full_name",
        section: "Datos del participante",
        label: "Nombre y apellidos",
        value: "Ada Lovelace",
      },
    ],
    attachments: [],
    pageUrl: "https://loesport.es/inscripcion",
    replyTo: "familia@example.com",
    submittedAt: "2026-08-07T10:20:30.000Z",
    ...overrides,
  });
}

function assertBadRequest(callback, expectedMessage) {
  assert.throws(callback, (error) => {
    assert.equal(error?.status, 400);
    if (expectedMessage) assert.equal(error.message, expectedMessage);
    return true;
  });
}

test("rechaza JSON inválido y estructuras raíz que no sean objetos", async (t) => {
  await t.test("JSON inválido", () => {
    assertBadRequest(
      () => parsePayload("{sin cerrar"),
      "Los datos del formulario no son válidos.",
    );
  });

  for (const value of [null, [], "texto", 42, true]) {
    await t.test(`estructura ${JSON.stringify(value)}`, () => {
      assertBadRequest(
        () => parsePayload(JSON.stringify(value)),
        "Los datos del formulario no son válidos.",
      );
    });
  }
});

test("normaliza un tipo permitido y rechaza tipos ausentes o desconocidos", async (t) => {
  const parsed = parsePayload(payload({ type: "  INSCRIPCION  " }));
  assert.equal(parsed.type, "inscripcion");

  for (const type of [undefined, "", "registro", "inscripcion-falsa"]) {
    await t.test(`tipo ${String(type)}`, () => {
      assertBadRequest(
        () => parsePayload(payload({ type })),
        "El tipo de formulario no es válido.",
      );
    });
  }
});

test("valida que answers sea un array no vacío de hasta 140 objetos", async (t) => {
  for (const answers of [undefined, null, "respuesta", {}, []]) {
    await t.test(`answers inválido: ${String(answers)}`, () => {
      assertBadRequest(
        () => parsePayload(payload({ answers })),
        "Las respuestas del formulario no son válidas.",
      );
    });
  }

  await t.test("más de 140 respuestas", () => {
    const answers = Array.from({ length: 141 }, (_, index) => ({
      key: `field_${index}`,
      value: String(index),
    }));
    assertBadRequest(
      () => parsePayload(payload({ answers })),
      "Las respuestas del formulario no son válidas.",
    );
  });

  for (const answer of [null, [], "texto", 1, false]) {
    await t.test(`elemento inválido: ${JSON.stringify(answer)}`, () => {
      assertBadRequest(
        () => parsePayload(payload({ answers: [answer] })),
        "Las respuestas del formulario no son válidas.",
      );
    });
  }

  const answers = Array.from({ length: 140 }, (_, index) => ({
    key: `field_${index}`,
    value: String(index),
  }));
  assert.equal(parsePayload(payload({ answers })).answers.length, 140);
});

test("conserva y normaliza un UUID válido sin generar otro", () => {
  const randomUUID = mock.fn(() => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  const parsed = parsePayload(
    payload({ submissionId: VALID_UUID.toUpperCase() }),
    { randomUUID },
  );

  assert.equal(parsed.submissionId, VALID_UUID);
  assert.equal(randomUUID.mock.callCount(), 0);
});

test("rechaza UUID proporcionados con formato o variante inválidos", async (t) => {
  const invalidIds = [
    "no-es-un-uuid",
    "123e4567-e89b-42d3-7456-426614174000",
    "123e4567-e89b-02d3-a456-426614174000",
    `${VALID_UUID}0`,
  ];

  for (const submissionId of invalidIds) {
    await t.test(submissionId, () => {
      assertBadRequest(
        () => parsePayload(payload({ submissionId })),
        "Los datos del formulario no son válidos.",
      );
    });
  }
});

test("genera el UUID mediante la dependencia inyectada cuando está ausente o vacío", async (t) => {
  for (const submissionId of [undefined, "   "]) {
    await t.test(String(submissionId), () => {
      const randomUUID = mock.fn(() => VALID_UUID);
      const parsed = parsePayload(payload({ submissionId }), { randomUUID });

      assert.equal(parsed.submissionId, VALID_UUID);
      assert.equal(randomUUID.mock.callCount(), 1);
    });
  }
});

test("conserva la key semántica y la normaliza a minúsculas", () => {
  const parsed = parsePayload(
    payload({
      answers: [
        {
          key: "Participant_Full_Name",
          section: "Datos",
          label: "Nombre",
          value: "Ada Lovelace",
        },
      ],
    }),
  );

  assert.equal(parsed.answers[0].key, "participant_full_name");
});

test("rechaza claves que no respetan el contrato semántico", async (t) => {
  for (const key of ["_participant", "1participant", "participant-name", "participánt", "with space"]) {
    await t.test(key, () => {
      assertBadRequest(
        () => parsePayload(payload({ answers: [{ key, value: "dato" }] })),
        "Los datos del formulario no son válidos.",
      );
    });
  }
});

test("rechaza una key de más de 80 caracteres en vez de truncarla", () => {
  const overlongKey = `a${"b".repeat(80)}`;
  assert.equal(overlongKey.length, 81);

  assertBadRequest(
    () => parsePayload(payload({ answers: [{ key: overlongKey, value: "dato" }] })),
    "Los datos del formulario no son válidos.",
  );
});

test("rechaza claves duplicadas normalizadas en los formularios persistentes", () => {
  const answers = [
    { key: "participant_full_name", value: "Ada" },
    { key: "PARTICIPANT_FULL_NAME", value: "Grace" },
  ];

  for (const type of ["inscripcion", "preinscripcion"]) {
    assertBadRequest(
      () => parsePayload(payload({ type, answers })),
      "Las respuestas del formulario no son válidas.",
    );
  }

  const parsed = parsePayload(payload({ type: "contacto", answers }));
  assert.deepEqual(
    parsed.answers.map((answer) => answer.key),
    ["participant_full_name", "participant_full_name"],
  );
});

test("los formularios excluidos de Sheets siguen aceptando respuestas sin key", async (t) => {
  const excludedTypes = [
    "baja",
    "licencias",
    "newsletter",
    "contacto",
    "socio",
    "patrocinio",
    "equipacion",
  ];

  for (const type of excludedTypes) {
    await t.test(type, () => {
      const parsed = parsePayload(
        payload({
          type,
          answers: [{ section: "Datos", label: "Campo", value: "Respuesta" }],
        }),
      );

      assert.equal(parsed.type, type);
      assert.equal(Object.hasOwn(parsed.answers[0], "key"), false);
      assert.equal(parsed.answers[0].value, "Respuesta");
    });
  }
});

test("rechaza attachments que no sea array o que contenga más de 12 elementos", async (t) => {
  for (const attachments of ["archivo.pdf", {}, 12]) {
    await t.test(`estructura ${typeof attachments}`, () => {
      assertBadRequest(
        () => parsePayload(payload({ attachments })),
        "Los datos del formulario no son válidos.",
      );
    });
  }

  await t.test("13 adjuntos", () => {
    const attachments = Array.from({ length: 13 }, (_, index) => ({
      label: `Documento ${index + 1}`,
      name: `documento-${index + 1}.pdf`,
    }));
    assertBadRequest(
      () => parsePayload(payload({ attachments })),
      "Los datos del formulario no son válidos.",
    );
  });

  const attachments = Array.from({ length: 12 }, (_, index) => ({
    label: `Documento ${index + 1}`,
    name: `documento-${index + 1}.pdf`,
  }));
  assert.equal(parsePayload(payload({ attachments })).attachments.length, 12);
});

test("rechaza elementos de attachments que no sean objetos", async (t) => {
  for (const attachment of [null, [], "archivo.pdf", 1, false]) {
    await t.test(JSON.stringify(attachment), () => {
      assertBadRequest(
        () => parsePayload(payload({ attachments: [attachment] })),
        "Los datos del formulario no son válidos.",
      );
    });
  }
});

test("sanea textos, correo y nombres de adjuntos sin alterar los datos válidos", () => {
  const parsed = parsePayload(
    payload({
      type: "  INSCRIPCION ",
      title: "  \u0000Alta de temporada\u007f  ",
      answers: [
        {
          key: "PARTICIPANT_FULL_NAME",
          section: "  \u0000Datos del participante  ",
          label: "  \u0007Nombre completo  ",
          value: "  \u0001Ada Lovelace\u007f  ",
        },
      ],
      attachments: [
        {
          label: "  \u0000Documento de identidad  ",
          name: "../../documento?.pdf",
        },
        {},
      ],
      pageUrl: "  https://loesport.es/inscripcion\u0000  ",
      replyTo: "  correo-invalido  ",
      submittedAt: "  2026-08-07T10:20:30.000Z  ",
    }),
  );

  assert.deepEqual(parsed, {
    submissionId: VALID_UUID,
    type: "inscripcion",
    title: "Alta de temporada",
    answers: [
      {
        key: "participant_full_name",
        section: "Datos del participante",
        label: "Nombre completo",
        value: "Ada Lovelace",
      },
    ],
    attachments: [
      {
        index: 0,
        label: "Documento de identidad",
        name: "documento-.pdf",
      },
      {
        index: 1,
        label: "Archivo adjunto",
        name: "archivo-2",
      },
    ],
    pageUrl: "https://loesport.es/inscripcion",
    replyTo: "",
    submittedAt: "2026-08-07T10:20:30.000Z",
  });
});

test("aplica los valores por defecto a campos de respuesta vacíos", () => {
  const parsed = parsePayload(
    payload({
      answers: [{ key: "comments", section: " ", label: " ", value: " " }],
      title: " ",
    }),
  );

  assert.equal(parsed.title, "Formulario web");
  assert.deepEqual(parsed.answers[0], {
    key: "comments",
    section: "Datos enviados",
    label: "Campo",
    value: "Sin respuesta",
  });
});
