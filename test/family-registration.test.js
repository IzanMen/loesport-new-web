import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  TRAINING_GROUPS,
  getFamilyAdultGroup,
  getFamilySchoolGroups,
} from "../src/data/training-groups.js";

const EXPECTED_ROW_KEYS = [
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
];

test("la inscripción familiar conserva exactamente el contrato de 32 columnas", async () => {
  const source = await readFile(
    new URL("../src/ui/family-registration.js", import.meta.url),
    "utf8",
  );
  const start = source.indexOf("export const FAMILY_ROW_KEYS");
  const end = source.indexOf("\n]);", start);
  assert.ok(start >= 0 && end > start);
  const keys = [...source.slice(start, end).matchAll(/"([a-z][a-z0-9_]+)"/g)].map(
    (match) => match[1],
  );

  assert.deepEqual(keys, EXPECTED_ROW_KEYS);
  assert.equal(new Set(keys).size, 32);
  assert.match(source, /type: "inscripcion"/);
  assert.match(source, /INSCRIPCIÓN FAMILIAR · Ref\./);
  assert.match(source, /TARIFA MADRES\/PADRES CON HIJO\/A EN LA ESCUELA: SÍ/);
  assert.match(source, /if \(completed\.has\(index\)\) continue;/);
  assert.match(source, /memberSubmissionIds = memberSubmissionIds\.map\(\(id\) => id \|\| createSubmissionId\(\)\);/);
  assert.match(source, /completed\.add\(index\);/);
  assert.match(source, /personas ya están guardadas y no se duplicarán/);
});

test("cada escuela familiar enlaza con un grupo simultáneo de madres y padres", () => {
  for (const locationId of ["mao", "alaior"]) {
    const schoolGroups = getFamilySchoolGroups(locationId);
    const adultGroup = getFamilyAdultGroup(locationId);

    assert.ok(schoolGroups.length >= 3);
    assert.ok(adultGroup);
    assert.equal(adultGroup.location, locationId);
    assert.equal(adultGroup.familyRole, "parent");
    assert.deepEqual(
      adultGroup.dayCounts.slice(0, 2).map(({ count, familyPrice }) => ({ count, familyPrice })),
      [
        { count: 1, familyPrice: "Suplemento de 10 €/mes" },
        { count: 2, familyPrice: "Suplemento de 15 €/mes" },
      ],
    );
    schoolGroups.forEach((group) => {
      assert.equal(group.simultaneousAdultGroupId, adultGroup.id);
      assert.ok(TRAINING_GROUPS.includes(group));
    });
  }
});

test("la página familiar está publicada y se descubre desde grupos y gestiones", async () => {
  const [page, vite, groupActions, home, alaior, mao] = await Promise.all([
    readFile(new URL("../inscripcion-familiar.html", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.js", import.meta.url), "utf8"),
    readFile(new URL("../src/ui/group-actions.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../grupos-alaior.html", import.meta.url), "utf8"),
    readFile(new URL("../grupos-mao.html", import.meta.url), "utf8"),
  ]);

  assert.match(page, /data-family-registration-form/);
  assert.match(vite, /inscripcionFamiliar: "inscripcion-familiar\.html"/);
  assert.match(groupActions, /\/inscripcion-familiar\.html\?/);
  for (const source of [home, alaior, mao]) {
    assert.match(source, /\/inscripcion-familiar\.html/);
  }
});
