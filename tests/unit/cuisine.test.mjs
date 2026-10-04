/* Le calcul du mode cuisine : préchauffage, ingrédients d'une étape, taille du texte, balayage, durées. */

import test from "node:test";
import assert from "node:assert/strict";
import { RECIPES } from "./donnees.mjs";
import {
  depuisQuand, indexTaille, ingredientsDeLEtape, libelleQuantite, planPrechauffage,
  secondesRestantes, sensBalayage, texteALire
} from "../../js/core/cuisine.js";

test("préchauffage : on remonte jusqu'à l'étape d'où il reste 15 min d'attente", () => {
  const etapes = [
    { txt: "Préparez." },
    { txt: "Pétrissez.", timer: 10 },
    { txt: "Laissez pousser.", timer: 30 },
    { txt: "Dressez." },
    { txt: "Enfournez.", four: 200 }
  ];
  // Depuis l'étape 3 : 0 min ; depuis l'étape 2 : 30 min, c'est la bonne.
  assert.deepEqual(planPrechauffage(etapes), { etape: 2, four: 4, temperature: 200 });
});

test("préchauffage : si les minuteurs d'avant sont trop courts, on prévient dès la première étape", () => {
  const etapes = [{ txt: "a" }, { txt: "b", timer: 10 }, { txt: "c", four: 180 }];
  assert.deepEqual(planPrechauffage(etapes), { etape: 0, four: 2, temperature: 180 });
});

test("préchauffage : le minuteur de l'étape qui précède le four compte, celui du four non", () => {
  const etapes = [{ txt: "a", timer: 15 }, { txt: "b", timer: 40, four: 190 }];
  assert.equal(planPrechauffage(etapes).etape, 0);
});

test("préchauffage : rien sans four, rien si une étape précédente en parle déjà", () => {
  assert.equal(planPrechauffage([{ txt: "a" }, { txt: "b" }]), null);
  assert.equal(planPrechauffage([{ txt: "Préchauffez le four." }, { txt: "b", four: 180 }]), null);
  assert.equal(planPrechauffage([{ txt: "Lancez le PRÉCHAUFFAGE." }, { txt: "b" }, { txt: "c", four: 180 }]), null);
});

test("préchauffage : sur les vraies recettes, le plan tombe sur une étape qui précède le four", () => {
  for (const r of RECIPES) {
    const plan = planPrechauffage(r.steps);
    if (!plan) continue;
    assert.ok(plan.etape >= 0 && plan.etape <= plan.four, r.id);
    assert.equal(r.steps[plan.four].four, plan.temperature, r.id);
  }
});

test("ingrédients d'une étape : par cid ou par nom, dans la version choisie seulement", () => {
  const ingredients = [
    { name: "Farine T55", cid: "farine", qty: 250, unit: "g" },
    { name: "Eau tiède", qty: 15, unit: "cl" },
    { name: "Sel", cid: "sel" },
    { name: "Olives", cid: "olives", addon: "Olives noires" }
  ];
  const etape = { ing: ["farine", "Eau tiède", "beurre"] };
  const liste = ingredientsDeLEtape(etape, 0, 3, ingredients);
  assert.deepEqual(liste.map(i => i.name), ["Farine T55", "Eau tiède"]);   // « beurre » n'est pas dans la version
  assert.deepEqual(ingredientsDeLEtape({ ing: [] }, 0, 3, ingredients), []);
  assert.deepEqual(ingredientsDeLEtape({}, 0, 3, ingredients), []);
});

test("ingrédients d'une étape : un supplément arrive d'office à l'étape qu'il enrichit", () => {
  const supplements = [{ label: "Olives noires", step: { i: 1 }, ingredients: [{ name: "Olives", qty: 50, unit: "g" }] }];
  const ingredients = [{ name: "Farine", cid: "farine" }];
  const a1 = ingredientsDeLEtape({ ing: ["farine"] }, 1, 3, ingredients, supplements);
  assert.deepEqual(a1.map(i => i.name), ["Farine", "Olives"]);
  assert.equal(a1[1].addon, "Olives noires");
  assert.deepEqual(ingredientsDeLEtape({ ing: [] }, 0, 3, ingredients, supplements), []);
  // Un index hors des étapes tombe sur la dernière, comme effectiveSteps.
  const hors = [{ label: "X", step: { i: 9 }, ingredients: [{ name: "Y" }] }];
  assert.equal(ingredientsDeLEtape({ ing: [] }, 2, 3, ingredients, hors).length, 1);
});

test("quantité d'une pastille : mise à l'échelle des portions, ou texte libre", () => {
  assert.equal(libelleQuantite({ qty: 200, unit: "g" }, 2), "400 g");
  assert.equal(libelleQuantite({ qty: 1, unit: "rouleau" }, 3), "3 rouleaux");
  assert.equal(libelleQuantite({ qty: null, qtyText: "quelques brins" }, 2), "quelques brins");
  assert.equal(libelleQuantite({ qty: null }, 2), "");
});

test("taille du texte : un index, un mot, ou la taille moyenne faute de mieux", () => {
  assert.equal(indexTaille("petite"), 0);
  assert.equal(indexTaille("grande"), 2);
  assert.equal(indexTaille(0), 0);
  assert.equal(indexTaille(2), 2);
  assert.equal(indexTaille(undefined), 1);
  assert.equal(indexTaille("énorme"), 1);
  assert.equal(indexTaille(7), 1);
});

test("balayage : franchement horizontal, assez long, deux fois plus large que haut", () => {
  assert.equal(sensBalayage(-120, 10), 1);     // vers la gauche : étape suivante
  assert.equal(sensBalayage(120, -10), -1);
  assert.equal(sensBalayage(-30, 0), 0);        // trop court
  assert.equal(sensBalayage(-100, 80), 0);      // trop de vertical
  assert.equal(sensBalayage(-100, 50), 1);      // pile deux fois plus large : accepté
  assert.equal(sensBalayage(0, 200), 0);
});

test("minuteur : secondes restantes, en cours comme en pause", () => {
  assert.equal(secondesRestantes({ end: 10000 }, 4000), 6);
  assert.equal(secondesRestantes({ end: 10000 }, 20000), 0);
  assert.equal(secondesRestantes({ end: 10000, reste: 90000 }, 99999), 90);
  assert.equal(secondesRestantes({ end: 1, reste: 0 }, 5), 0);
});

test("« depuis quand » : quelques secondes, des minutes, des heures", () => {
  assert.equal(depuisQuand(20000), "quelques secondes");
  assert.equal(depuisQuand(3 * 60000 + 5000), "3 min");
  assert.equal(depuisQuand(65 * 60000), "1 h 05");
});

test("texte lu à voix haute : titre et consigne, sans balisage", () => {
  assert.equal(texteALire("Le four", "Chauffez à <b>180 °C</b>.\n  Puis   enfournez."), "Le four. Chauffez à 180 °C . Puis enfournez.");
});
