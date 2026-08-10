import assert from "node:assert/strict";
import test from "node:test";

import { TRAINING_GROUPS } from "../src/data/training-groups.js";

function group(id) {
  return TRAINING_GROUPS.find((entry) => entry.id === id);
}

test("Maó distingue la cuota normal del suplemento para familias de la escuela", () => {
  const maoParents = group("mao-running-iniciacion");

  assert.deepEqual(
    maoParents.dayCounts.map(({ count, price, note }) => ({ count, price, note })),
    [
      {
        count: 1,
        price: "20 €/mes",
        note: "Con hijo/a en la escuela: suplemento de 10 €/mes",
      },
      {
        count: 2,
        price: "27 €/mes",
        note: "Con hijo/a en la escuela: suplemento de 15 €/mes",
      },
    ],
  );
});

test("Adultos 17:15 de Alaior identifica las cuotas para madres y padres", () => {
  const alaiorParents = group("alaior-adultos-running");

  assert.equal(alaiorParents.title, "Adultos 17:15 / Madres y padres");
  assert.deepEqual(
    alaiorParents.dayCounts.slice(0, 2).map(({ count, price, note }) => ({ count, price, note })),
    [
      {
        count: 1,
        price: "15 €/mes",
        note: "Con hijo/a en la escuela: suplemento de 10 €/mes",
      },
      {
        count: 2,
        price: "20 €/mes",
        note: "Con hijo/a en la escuela: suplemento de 15 €/mes",
      },
    ],
  );
});
