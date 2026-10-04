/* La recherche de l'accueil : texte sans accents, critères, saison, « J'ai… ». */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RECIPES } from "./donnees.mjs";

/* Les référentiels sont des scripts classiques, comme recipes.js : on les lit
   de la même façon, et on les pose en globales avant d'importer le module. */
const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const charger = (fichier, noms) =>
  new Function(readFileSync(path.join(racine, fichier), "utf8") + `;return { ${noms} };`)();
Object.assign(globalThis,
  charger("js/saisons.js", "SAISONS"),
  charger("js/allergenes.js", "NON_VEGETARIEN"),
  charger("js/placard.js", "PLACARD"));

const {
  FILTRES, catalogueJai, estDeSaison, estRapide, estVegetarien, foinDe, ingredientsJai, motsDe, sansCuisson, sansFour, scoreJai, trouve
} = await import("../../js/core/recherche.js");

const recette = id => RECIPES.find(r => r.id === id);
const foins = new Map(RECIPES.map(r => [r.id, foinDe(r)]));
const cherche = q => RECIPES.filter(r => trouve(foins.get(r.id), motsDe(q))).map(r => r.id);

test("la recherche ignore accents, majuscules et ligatures", () => {
  for (const [sans, avec] of [["creme", "crème"], ["oeuf", "œuf"], ["emulsion", "émulsion"], ["CREME", "Crème"]]) {
    assert.ok(cherche(avec).length > 0, `« ${avec} » trouve quelque chose`);
    assert.deepEqual(cherche(sans), cherche(avec));
  }
});

test("plusieurs mots se cumulent, et une requête vide garde tout", () => {
  assert.equal(cherche("").length, RECIPES.length);
  assert.equal(cherche("   ").length, RECIPES.length);
  assert.ok(cherche("feta olives").length <= cherche("feta").length);
});

test("végétarien : aucun ingrédient de NON_VEGETARIEN dans la version par défaut", () => {
  for (const r of RECIPES) {
    const carnivore = r.ingredients.some(i => NON_VEGETARIEN.includes(i.cid));
    assert.equal(estVegetarien(r), !carnivore, r.id);
  }
  assert.ok(RECIPES.some(estVegetarien) && RECIPES.some(r => !estVegetarien(r)));
});

test("rapide, sans four, sans cuisson suivent les données de la recette", () => {
  for (const r of RECIPES) {
    const total = (r.times.prep || 0) + (r.times.repos || 0) + (r.times.cuisson || 0);
    assert.equal(estRapide(r), total <= 30, r.id);
    assert.equal(sansCuisson(r), r.times.cuisson == null, r.id);
  }
  assert.equal(sansFour(recette("focaccia-romarin")), false);
});

test("de saison : au moins un ingrédient saisonnier, et tous de saison", () => {
  const r = RECIPES.find(x => x.ingredients.some(i => SAISONS[i.cid]));
  const mois = Array.from({ length: 12 }, (_, i) => i + 1);
  const saisonniers = r.ingredients.map(i => i.cid).filter(c => SAISONS[c]);
  for (const m of mois) assert.equal(estDeSaison(r, m), saisonniers.every(c => SAISONS[c].includes(m)));
  // Sans aucun ingrédient saisonnier, la recette n'est de saison à aucun mois.
  const neutre = { ingredients: [{ cid: "farine" }, { name: "Truc" }] };
  assert.ok(mois.every(m => !estDeSaison(neutre, m)));
});

test("les critères ont chacun un identifiant et un libellé", () => {
  assert.deepEqual(FILTRES.map(f => f.label), ["Végétarien", "Rapide", "Sans four", "Sans cuisson", "De saison"]);
  assert.equal(new Set(FILTRES.map(f => f.id)).size, FILTRES.length);
});

test("« J'ai… » : le catalogue regroupe par cid, sans le fond de placard", () => {
  const cat = catalogueJai(RECIPES);
  assert.equal(new Set(cat.map(i => i.cle)).size, cat.length);
  assert.ok(!cat.some(i => PLACARD.includes(i.cle)));
  assert.ok(cat.length > 20);
  const noms = cat.map(i => i.norm);
  assert.deepEqual(noms, [...noms].sort((a, b) => a.localeCompare(b)));
});

test("« J'ai… » : le score compte les ingrédients trouvés sur le total, placard exclu", () => {
  const r = recette("focaccia-romarin");
  const tous = ingredientsJai(r);
  assert.ok(tous.length > 0 && !tous.some(c => PLACARD.includes(c)));
  assert.deepEqual(scoreJai(r, new Set()), { trouves: 0, total: tous.length });
  assert.deepEqual(scoreJai(r, new Set([tous[0], "inconnu"])), { trouves: 1, total: tous.length });
  assert.deepEqual(scoreJai(r, new Set(tous)), { trouves: tous.length, total: tous.length });
});
