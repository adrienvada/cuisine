/* Vague 2, lot « synchro » : fusion d'ensemble, fusion champ par champ d'une
   entrée de menu, champ supprimé d'un côté, remise à zéro de l'ordre des rayons. */

import test from "node:test";
import assert from "node:assert/strict";
import { fusionner, fusionnerEnsemble, fusionnerListe, memesDonnees } from "../../js/core/fusion.js";
import { rayonsOrdonnes, reinitialiserOrdreRayons } from "../../js/core/courses.js";
import "./donnees.mjs";
import { state } from "../../js/core/etat.js";

const menu = (...entrees) => entrees.map(e => ({ rid: "r-" + e.k, portions: 6, choices: {}, addons: [], ...e }));

/* ---------- ensemble de chaînes ---------- */

test("ensemble : deux ajouts concurrents s'additionnent", () => {
  assert.deepEqual(fusionnerEnsemble([], ["gluten"], ["lait"]).sort(), ["gluten", "lait"]);
});

test("ensemble : un retrait fait d'un seul côté est respecté, un ajout de l'autre aussi", () => {
  assert.deepEqual(fusionnerEnsemble(["a", "b"], ["a"], ["a", "b", "c"]), ["a", "c"]);
  assert.deepEqual(fusionnerEnsemble(["a", "b"], ["a", "b", "c"], ["b"]), ["b", "c"]);
});

test("ensemble : retiré des deux côtés, il reste retiré ; sans base, tout se cumule", () => {
  assert.deepEqual(fusionnerEnsemble(["a"], [], []), []);
  assert.deepEqual(fusionnerEnsemble(undefined, ["a"], ["b"]).sort(), ["a", "b"]);
});

/* ---------- constat 17 : exclusions d'allergènes ---------- */

test("repas.exclus : le gluten coché ici et le lait coché ailleurs sont tous deux gardés", () => {
  const base = { repas: { exclus: [] } };
  const sortie = fusionner(base, { repas: { exclus: ["gluten"] } }, { repas: { exclus: ["lait"] } });
  assert.deepEqual(sortie.repas.exclus.sort(), ["gluten", "lait"]);
});

test("repas.exclus : une exclusion décochée d'un côté seulement est retirée", () => {
  const base = { repas: { exclus: ["gluten", "lait"], convives: 4 } };
  const sortie = fusionner(base, { repas: { exclus: ["lait"], convives: 4 } }, { repas: { exclus: ["gluten", "lait", "oeufs"], convives: 4 } });
  assert.deepEqual(sortie.repas.exclus.sort(), ["lait", "oeufs"]);
  assert.equal(sortie.repas.convives, 4);
});

test("repas.exclus : le champ absent de la base se fusionne aussi", () => {
  const sortie = fusionner({}, { repas: { exclus: ["gluten"] } }, { repas: { exclus: ["lait"], convives: 6 } });
  assert.deepEqual(sortie.repas.exclus.sort(), ["gluten", "lait"]);
  assert.equal(sortie.repas.convives, 6);
});

/* ---------- constat 18 : entrée de menu modifiée des deux côtés ---------- */

test("menu : portions d'un côté, supplément de l'autre, les deux restent", () => {
  const base = menu({ k: "c1", portions: 6 }, { k: "q1", portions: 6 });
  const local = menu({ k: "c1", portions: 8 }, { k: "q1", portions: 8 });
  const serveur = menu({ k: "c1", portions: 6, addons: ["tomates-sechees"] }, { k: "q1", portions: 6 });
  const sortie = fusionnerListe(base, local, serveur, "k", true);
  assert.equal(sortie[0].portions, 8);
  assert.deepEqual(sortie[0].addons, ["tomates-sechees"]);
  assert.equal(sortie[1].portions, 8);
});

test("menu : suppléments ajoutés de part et d'autre s'additionnent, un retrait suit", () => {
  const base = menu({ k: "c1", addons: ["a", "b"] });
  const sortie = fusionnerListe(base, menu({ k: "c1", addons: ["a", "x"] }), menu({ k: "c1", addons: ["a", "b", "y"] }), "k", true);
  assert.deepEqual(sortie[0].addons.sort(), ["a", "x", "y"]);
});

test("menu : les choix se fusionnent clé par clé, le local départage une même clé", () => {
  const base = menu({ k: "c1", choices: { fromage: "emmental" } });
  const local = menu({ k: "c1", choices: { fromage: "comte" }, portions: 8 });
  const serveur = menu({ k: "c1", choices: { fromage: "emmental", viande: "lardons" }, portions: 4 });
  const e = fusionnerListe(base, local, serveur, "k", true)[0];
  assert.deepEqual(e.choices, { fromage: "comte", viande: "lardons" });
  assert.equal(e.portions, 8);
});

test("menu : par le champ `menu`, la fusion est champ par champ ; retirée d'un côté, l'entrée reste retirée", () => {
  const base = { menu: menu({ k: "c1" }, { k: "q1" }) };
  const sortie = fusionner(base,
    { menu: menu({ k: "c1", portions: 8 }) },                       // q1 retirée ici
    { menu: menu({ k: "c1", addons: ["t"] }, { k: "q1", portions: 2 }) });
  assert.deepEqual(sortie.menu.map(e => e.k), ["c1"]);
  assert.equal(sortie.menu[0].portions, 8);
  assert.deepEqual(sortie.menu[0].addons, ["t"]);
});

test("liste : sans l'option, une entrée modifiée des deux côtés reste prise en bloc (extras, journal)", () => {
  const base = [{ id: "x", txt: "a", fait: false }];
  const sortie = fusionnerListe(base, [{ id: "x", txt: "b", fait: false }], [{ id: "x", txt: "a", fait: true }], "id");
  assert.deepEqual(sortie[0], { id: "x", txt: "b", fait: false });
});

/* ---------- constat 24 : champ supprimé d'un côté ---------- */

const ORDRE = ["Fruits & légumes", "Fromages", "Autre"];

test("champ supprimé ici, serveur inchangé depuis la base : la suppression tient", () => {
  const sortie = fusionner({ ordreRayons: ORDRE }, {}, { ordreRayons: ORDRE });
  assert.equal("ordreRayons" in sortie, false);
});

test("champ supprimé ici, mais modifié ailleurs depuis : la modification l'emporte", () => {
  const autre = ["Fromages", "Fruits & légumes", "Autre"];
  assert.deepEqual(fusionner({ ordreRayons: ORDRE }, {}, { ordreRayons: autre }).ordreRayons, autre);
});

test("champ supprimé côté serveur, inchangé ici : supprimé ; modifié ici : gardé", () => {
  assert.equal("ordreRayons" in fusionner({ ordreRayons: ORDRE }, { ordreRayons: ORDRE }, {}), false);
  const autre = ["Fromages", "Fruits & légumes", "Autre"];
  assert.deepEqual(fusionner({ ordreRayons: ORDRE }, { ordreRayons: autre }, {}).ordreRayons, autre);
});

test("champ jamais eu ici (base vide) : la valeur du serveur arrive", () => {
  assert.deepEqual(fusionner({}, {}, { ordreRayons: ORDRE }).ordreRayons, ORDRE);
});

test("ordre des rayons : « Remettre l'ordre d'origine » écrit [], qui se propage au serveur", () => {
  state.ordreRayons = ["Fromages", "Autre"];
  const defaut = (() => { state.ordreRayons = []; return rayonsOrdonnes(); })();
  state.ordreRayons = ["Fromages", "Autre"];
  reinitialiserOrdreRayons();
  assert.deepEqual(state.ordreRayons, []);
  assert.deepEqual(rayonsOrdonnes(), defaut);
  // Le serveur et la base portent encore l'ordre personnalisé : le vide local doit gagner.
  const perso = ["Fromages", "Autre"];
  const sortie = fusionner({ ordreRayons: perso }, { ordreRayons: [] }, { ordreRayons: perso });
  assert.deepEqual(sortie.ordreRayons, []);
  assert.equal(memesDonnees(sortie, { ordreRayons: perso }), false);   // il y a bien quelque chose à envoyer
  delete state.ordreRayons;
});
