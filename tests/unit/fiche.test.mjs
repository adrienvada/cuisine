/* Les calculs de la fiche : allergènes d'une version, portions permises par un ingrédient, portions d'un autre moule. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RECIPES } from "./donnees.mjs";
import {
  allergenesDe,
  libelleMoule,
  lireQuantite,
  portionsPermises,
  portionsPourMoule,
  tailleEquivalente
} from "../../js/core/adaptation.js";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { ALLERGENES, ALLERGENES_LISTE, SUBSTITUTIONS } = new Function(
  readFileSync(path.join(racine, "js/allergenes.js"), "utf8") + ";" +
  readFileSync(path.join(racine, "js/substitutions.js"), "utf8") +
  ";return { ALLERGENES, ALLERGENES_LISTE, SUBSTITUTIONS };")();

const recette = id => RECIPES.find(r => r.id === id);

test("allergènes : ceux des ingrédients, dans l'ordre officiel, sans doublon", () => {
  const quiche = recette("quiche-lorraine");
  const ids = liste => allergenesDe(liste, ALLERGENES, ALLERGENES_LISTE).map(a => a.id);
  assert.deepEqual(ids(quiche.ingredients), ["oeufs", "lait"]);
  // La pâte du commerce (première option) apporte le gluten, qui passe devant dans la liste officielle.
  const pate = quiche.choices[0].options[0].ingredients;
  assert.deepEqual(ids([...quiche.ingredients, ...pate]), ["gluten", "oeufs", "lait"]);
});

test("allergènes : un ingrédient sans cid ou sans entrée n'en apporte pas", () => {
  assert.deepEqual(allergenesDe([{ name: "Eau" }, { name: "Sel", cid: "sel-fin" }], ALLERGENES, ALLERGENES_LISTE), []);
});

test("J'en ai moins : 3 œufs pour une recette à 4 œufs / 6 portions → 4 portions (arrondi par défaut)", () => {
  const oeufs = recette("quiche-lorraine").ingredients.find(i => i.cid === "oeufs");
  assert.equal(oeufs.qty, 4);
  assert.equal(portionsPermises(oeufs, 6, 3), 4);
  // Jamais plus que ce qu'on a : 4 portions demandent 2,67 œufs, 5 en demanderaient 3,33.
  assert.equal(portionsPermises(oeufs, 6, 3.2), 4);
  assert.equal(portionsPermises(oeufs, 6, 4), 6);
});

test("J'en ai moins : l'erreur des flottants ne retire pas une portion", () => {
  // 0,3 / (0,1 / 3) vaut 8,999… en flottant : 9 portions, pas 8.
  assert.equal(portionsPermises({ qty: 0.1 }, 3, 0.3), 9);
});

test("J'en ai moins : pas de quantité chiffrée, pas de calcul", () => {
  assert.equal(portionsPermises({ qtyText: "à votre goût" }, 4, 3), null);
  assert.equal(portionsPermises({ qty: 4 }, 4, NaN), null);
  assert.equal(portionsPermises({ qty: 4 }, 4, 0), 0);
});

test("lireQuantite : virgule décimale, unité ignorée, texte vide ou absurde", () => {
  assert.equal(lireQuantite("3"), 3);
  assert.equal(lireQuantite(" 1,5 "), 1.5);
  assert.equal(lireQuantite("250 g"), 250);
  assert.equal(lireQuantite(""), null);
  assert.equal(lireQuantite("beaucoup"), null);
  assert.equal(lireQuantite("-2"), null);
});

test("lireQuantite : fractions « 1/2 », « 1 1/2 », « ½ », « 2½ »", () => {
  assert.equal(lireQuantite("1/2"), 0.5);
  assert.equal(lireQuantite("1 1/2"), 1.5);
  assert.equal(lireQuantite("½"), 0.5);
  assert.equal(lireQuantite("2½"), 2.5);
  assert.equal(lireQuantite("3/0"), null);
});

test("moule rond : les portions suivent le rapport des surfaces, arrondi au plus proche", () => {
  const rond = { forme: "rond", diametre: 26 };
  assert.equal(portionsPourMoule(rond, 6, 26), 6);
  assert.equal(portionsPourMoule(rond, 6, 28), 7);   // 6 × (28/26)² = 6,96
  assert.equal(portionsPourMoule(rond, 6, 22), 4);   // 6 × 0,716 = 4,3
  assert.equal(portionsPourMoule(rond, 6, 36), 12);  // 6 × 1,917 = 11,50
});

test("moule : les portions restent dans les bornes de la fiche", () => {
  const rond = { forme: "rond", diametre: 26 };
  assert.equal(portionsPourMoule(rond, 6, 6), 1);
  assert.equal(portionsPourMoule(rond, 6, 100), 24);
});

test("moule cake : proportionnel à la longueur ; rectangle : proportions gardées", () => {
  assert.equal(portionsPourMoule({ forme: "cake", longueur: 26 }, 8, 13), 4);
  assert.equal(portionsPourMoule({ forme: "rectangle", largeur: 20, longueur: 30 }, 8, 15), 2);
  assert.equal(libelleMoule({ forme: "rectangle", largeur: 20, longueur: 30 }, 36), "24 × 36 cm");
  assert.equal(libelleMoule({ forme: "rond", diametre: 26 }, 28), "28 cm");
});

test("moule : la taille équivalente à des portions retombe sur le moule de la recette", () => {
  const rond = { forme: "rond", diametre: 26 };
  assert.equal(tailleEquivalente(rond, 6, 6), 26);
  assert.equal(tailleEquivalente(rond, 6, 12), 37);   // 26 × √2 = 36,8
  assert.equal(tailleEquivalente({ forme: "cake", longueur: 26 }, 8, 4), 13);
});

test("les recettes à moule le déclarent complet", () => {
  for (const r of RECIPES.filter(x => x.moule)) {
    assert.ok(["rond", "rectangle", "cake"].includes(r.moule.forme), r.id);
    assert.ok(portionsPourMoule(r.moule, r.portions.base, r.moule.forme === "rond" ? r.moule.diametre : r.moule.longueur) === r.portions.base, r.id);
  }
});

test("substitutions : le référentiel porte `par` et `note` pour les lardons", () => {
  assert.ok(SUBSTITUTIONS.lardons.every(s => s.par && s.note));
});
