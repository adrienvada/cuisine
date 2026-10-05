/* La recherche des Savoirs : sans accents, sans ligatures, mots dans le désordre. */

import test from "node:test";
import assert from "node:assert/strict";
import { FONDAMENTAUX } from "./donnees.mjs";

const { fondMatches } = await import("../../js/core/savoirs.js");

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

/* ---------- La recherche couvre aussi les figures ---------- */

const avecFigures = (figures, f) => {
  const sauve = globalThis.FIGURES;
  try { globalThis.FIGURES = figures; return f(); } finally { globalThis.FIGURES = sauve; }
};
const fig = (titre, legende) => ({ type: "svg", ou: "tete", titre, legende, alt: "Une figure de test, assez longue pour un alt.", vb: "0 0 320 100", corps: "" });

test("fondMatches : cherche aussi dans le titre et la légende des figures de la fiche", () => {
  assert.ok(!fondMatches(maillard, "zorglub"));
  avecFigures({ maillard: [fig("Le zorglub quantique", "Une légende ordinaire.")] }, () => {
    assert.ok(fondMatches(maillard, "zorglub"), "le titre d'une figure");
    assert.ok(fondMatches(maillard, "ZORGLUB quantique"), "sans accent ni casse, mots cumulés");
  });
  avecFigures({ maillard: [fig("Un titre", "Voyez la sérendipité des gluons.")] }, () => {
    assert.ok(fondMatches(maillard, "serendipite gluons"), "la légende d'une figure");
    assert.ok(!fondMatches(FONDAMENTAUX.find(f => f.id === "amidon"), "serendipite"), "pas les figures d'une autre fiche");
  });
});

test("fondMatches : le cache tient compte de l'arrivée tardive des figures", () => {
  /* Une recherche AVANT l'arrivée des figures, puis une APRÈS : le texte mis en cache sans elles ne doit pas
     rester celui que l'on interroge. Et inversement si elles disparaissent. */
  const sauve = globalThis.FIGURES;
  try {
    delete globalThis.FIGURES;
    assert.ok(!fondMatches(maillard, "tardivefigure"), "sans le fichier des figures");
    globalThis.FIGURES = { maillard: [fig("Une tardivefigure", "Légende.")] };
    assert.ok(fondMatches(maillard, "tardivefigure"), "le fichier arrive : la recherche le voit");
    globalThis.FIGURES = { maillard: [fig("Une tardivefigure", "Légende."), fig("Une autre", "Plus tard encore : lenteurinfinie.")] };
    assert.ok(fondMatches(maillard, "lenteurinfinie"), "une figure de plus : le cache se refait");
    delete globalThis.FIGURES;
    assert.ok(!fondMatches(maillard, "tardivefigure"), "le fichier s'en va : plus de figures");
  } finally { globalThis.FIGURES = sauve; }
  assert.ok(fondMatches(maillard, "reaction"), "la recherche ordinaire est intacte");
});
