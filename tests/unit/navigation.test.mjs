/* Navigation & partage : la version d'une recette dans une adresse, et les fondamentaux absents. */

import test from "node:test";
import assert from "node:assert/strict";
import { fondById, fondsDe, fondamentauxCharges } from "../../js/core/fonds.js";
import { recettesDuFond } from "../../js/core/savoirs.js";
import { requeteDeVersion, versionDeRequete } from "../../js/core/liens.js";

/* Pas de donnees.mjs ici : ce fichier vérifie justement ce que le carnet fait
   tant que les fondamentaux ne sont pas chargés. */
const cake = {
  id: "cake",
  portions: { base: 6, label: "personnes" },
  choices: [{ id: "garniture", options: [{ id: "lardons-comte" }, { id: "olives-feta" }] }],
  addons: [{ id: "herbes" }, { id: "tomates-sechees" }]
};

test("fonds : tant que rien n'est chargé, les accès tolèrent l'absence", () => {
  assert.equal(fondamentauxCharges(), false);
  assert.equal(fondById("maillard"), null);
  assert.deepEqual(fondsDe({ fond: ["maillard"] }), []);
  globalThis.RECIPES = [];
  assert.deepEqual(recettesDuFond("maillard"), []);
});

test("liens : une version par défaut ne produit aucune requête", () => {
  assert.equal(requeteDeVersion(cake, {}), "");
  assert.equal(requeteDeVersion(cake, { portions: 6, choices: { garniture: "lardons-comte" }, addons: [] }), "");
});

test("liens : portions, choix et suppléments s'écrivent dans l'ordre p, c, a", () => {
  const q = requeteDeVersion(cake, { portions: 8, choices: { garniture: "olives-feta" }, addons: ["tomates-sechees", "herbes"] });
  assert.equal(q, "p=8&c=garniture:olives-feta&a=herbes,tomates-sechees");
});

test("liens : un choix ou un supplément inconnu n'entre pas dans le lien", () => {
  assert.equal(requeteDeVersion(cake, { choices: { garniture: "fantome", autre: "x" }, addons: ["fantome"] }), "");
});

test("liens : la requête se relit à l'identique", () => {
  const conf = { portions: 8, choices: { garniture: "olives-feta" }, addons: ["herbes", "tomates-sechees"] };
  assert.deepEqual(versionDeRequete(cake, requeteDeVersion(cake, conf)), conf);
});

test("liens : tout ce qui est inconnu ou invalide est ignoré", () => {
  assert.deepEqual(versionDeRequete(cake, "p=0&c=garniture:nope&c=truc:machin&c=garniture&a=zzz&x=1"), {});
  assert.deepEqual(versionDeRequete(cake, "p=25"), {});
  assert.deepEqual(versionDeRequete(cake, "p=7.5"), {});
  assert.deepEqual(versionDeRequete(cake, "p=-3"), {});
  assert.deepEqual(versionDeRequete(cake, "p=%E0%A4%A"), {});
  assert.deepEqual(versionDeRequete(cake, ""), {});
  assert.deepEqual(versionDeRequete(cake, undefined), {});
});

test("liens : le valide est gardé malgré l'invalide à côté", () => {
  assert.deepEqual(versionDeRequete(cake, "p=24&c=garniture:nope&c=garniture:olives-feta&a=zzz,herbes"),
    { portions: 24, choices: { garniture: "olives-feta" }, addons: ["herbes"] });
});

test("liens : une recette sans choix ni suppléments n'a que ses portions", () => {
  const nue = { id: "x", portions: { base: 4 } };
  assert.equal(requeteDeVersion(nue, { portions: 2 }), "p=2");
  assert.deepEqual(versionDeRequete(nue, "p=2&c=a:b&a=c"), { portions: 2 });
});
