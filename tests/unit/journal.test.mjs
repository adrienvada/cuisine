/* Le journal : dates en clair et tri des entrées d'une recette. */

import test from "node:test";
import assert from "node:assert/strict";

const { dateEnClair, entreesDe } = await import("../../js/core/journal.js");

test("dateEnClair : aujourd'hui, hier, puis la date en toutes lettres", () => {
  assert.equal(dateEnClair("2026-10-04", "2026-10-04"), "Aujourd'hui");
  assert.equal(dateEnClair("2026-10-03", "2026-10-04"), "Hier");
  assert.equal(dateEnClair("2026-09-30", "2026-10-04"), "30 septembre" + (new Date().getFullYear() === 2026 ? "" : " 2026"));
});

test("dateEnClair : hier à cheval sur deux mois et sur deux années", () => {
  assert.equal(dateEnClair("2026-09-30", "2026-10-01"), "Hier");
  assert.equal(dateEnClair("2025-12-31", "2026-01-01"), "Hier");
});

test("dateEnClair : une date illisible ne s'écrit pas", () => {
  assert.equal(dateEnClair("hier soir", "2026-10-04"), "");
  assert.equal(dateEnClair(undefined, "2026-10-04"), "");
});

test("entreesDe : la plus récente d'abord, à date égale la dernière ajoutée", () => {
  const liste = [
    { id: "a", rid: "x", date: "2026-03-01" },
    { id: "b", rid: "y", date: "2026-05-01" },
    { id: "c", rid: "x", date: "2026-04-01" },
    { id: "d", rid: "x", date: "2026-03-01" }
  ];
  assert.deepEqual(entreesDe("x", liste).map(e => e.id), ["c", "d", "a"]);
  assert.deepEqual(entreesDe("zzz", liste), []);
});
