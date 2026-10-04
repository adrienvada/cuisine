/* La recherche des Savoirs : sans accents, sans ligatures, mots dans le désordre. */

import test from "node:test";
import assert from "node:assert/strict";
import { FONDAMENTAUX } from "./donnees.mjs";

/* La vue importe des modules qui s'accrochent au navigateur dès le chargement
   (feuilles, routeur) : un décor minimal suffit, aucun n'est appelé ici. */
globalThis.window ??= { addEventListener() {} };
globalThis.matchMedia ??= () => ({ matches: false, addEventListener() {} });
globalThis.document ??= { getElementById: () => null };
const { fondMatches } = await import("../../js/vues/savoirs.js");

const maillard = FONDAMENTAUX.find(f => f.id === "maillard");

test("fondMatches : une requête vide garde tout", () => {
  assert.ok(FONDAMENTAUX.every(f => fondMatches(f, "")));
});

test("fondMatches : « reaction » trouve la réaction de Maillard, accents ou non", () => {
  assert.ok(fondMatches(maillard, "reaction"));
  assert.ok(fondMatches(maillard, "RÉACTION"));
});

test("fondMatches : plusieurs mots se cumulent, dans n'importe quel ordre", () => {
  assert.ok(fondMatches(maillard, "maillard reaction"));
  assert.ok(!fondMatches(maillard, "maillard zzzxyz"));
});

test("fondMatches : des espaces autour ne changent rien", () => {
  assert.ok(fondMatches(maillard, "  maillard  "));
});
