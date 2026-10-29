/* L'onglet Saison, côté pur : les phases d'un produit (js/core/saison.js) et le calendrier
   (js/calendrier.js). L'accord avec js/saisons.js, lui, est gardé par npm run verifier. */

import test from "node:test";
import assert from "node:assert/strict";
import { RECIPES } from "./donnees.mjs";
import { FAMILLES_SAISON, PRODUITS } from "../../js/calendrier.js";
import { moisDecale, periodeEnClair, periodes, phaseDe, produitsDeLAnnee, produitsDuMois, recettesDu } from "../../js/core/saison.js";

const produit = id => {
  const p = PRODUITS.find(x => x.id === id);
  assert.ok(p, id);
  return p;
};

test("moisDecale tourne sur l'année dans les deux sens", () => {
  assert.equal(moisDecale(12, 1), 1);
  assert.equal(moisDecale(1, -1), 12);
  assert.equal(moisDecale(6, 0), 6);
  assert.equal(moisDecale(3, -14), 1);
});

test("une période peut passer d'une année à l'autre, et un produit en avoir deux", () => {
  assert.deepEqual(periodes([9, 10, 11, 12, 1, 2]), [{ debut: 9, fin: 2, duree: 6 }]);
  assert.deepEqual(periodes([3, 4, 5, 10, 11]), [{ debut: 3, fin: 5, duree: 3 }, { debut: 10, fin: 11, duree: 2 }]);
  assert.deepEqual(periodes([]), []);
});

test("les phases : le premier mois arrive, le dernier finit, ceux du milieu sont pleins", () => {
  const butternut = { mois: [9, 10, 11, 12, 1, 2] };
  assert.equal(phaseDe(butternut, 9), "arrive");
  assert.equal(phaseDe(butternut, 12), "pleine");
  assert.equal(phaseDe(butternut, 1), "pleine");
  assert.equal(phaseDe(butternut, 2), "fin");
  assert.equal(phaseDe(butternut, 5), null);
  const epinard = { mois: [3, 4, 5, 10, 11] };
  assert.equal(phaseDe(epinard, 10), "arrive");
  assert.equal(phaseDe(epinard, 11), "fin");
  assert.equal(phaseDe({ mois: "annee" }, 6), null);
});

test("la période dite en français, élisions comprises", () => {
  assert.equal(periodeEnClair({ mois: [6, 7, 8, 9] }), "de juin à septembre");
  assert.equal(periodeEnClair({ mois: [8, 9, 10] }), "d'août à octobre");
  assert.equal(periodeEnClair({ mois: [10, 11, 12, 1, 2, 3, 4] }), "d'octobre à avril");
  assert.equal(periodeEnClair({ mois: [5, 6] }), "en mai et juin");
  assert.equal(periodeEnClair({ mois: [3, 4, 5, 10, 11] }), "de mars à mai, puis en octobre et novembre");
  assert.equal(periodeEnClair({ mois: "annee" }), "toute l'année");
});

test("au mois m, chaque produit de saison tombe dans une phase et une seule", () => {
  for (let m = 1; m <= 12; m++) {
    const { arrive, pleine, fin } = produitsDuMois(PRODUITS, m);
    const vus = [...arrive, ...pleine, ...fin].map(p => p.id);
    assert.equal(new Set(vus).size, vus.length, `mois ${m} : un produit dans deux phases`);
    const attendus = PRODUITS.filter(p => Array.isArray(p.mois) && p.mois.includes(m)).map(p => p.id).sort();
    assert.deepEqual([...vus].sort(), attendus, `mois ${m}`);
    assert.ok(vus.length > 0, `mois ${m} : rien de saison`);
  }
});

test("en octobre : les figues finissent, la butternut est pleine, le chou kale arrive ; la famille filtre", () => {
  const oct = produitsDuMois(PRODUITS, 10);
  assert.ok(oct.fin.some(p => p.id === "figue"));
  assert.ok(oct.pleine.some(p => p.id === "courge-butternut"));
  assert.ok(oct.arrive.some(p => p.id === "kale"));
  const fruits = produitsDuMois(PRODUITS, 10, "fruits");
  assert.ok([...fruits.arrive, ...fruits.pleine, ...fruits.fin].every(p => p.famille === "fruits"));
  assert.ok(produitsDeLAnnee(PRODUITS).some(p => p.id === "pomme"));
  assert.ok(produitsDeLAnnee(PRODUITS, "herbes").every(p => p.famille === "herbes"));
});

test("les recettes d'un produit : la version de la carte d'abord, puis un choix, puis un supplément", () => {
  const figues = recettesDu(produit("figue"), RECIPES);
  assert.deepEqual(figues.map(x => [x.r.id, x.ou]), [
    ["tartines-figues-chevre-miel", "base"],
    ["salade-tiede-courge-roquette-chevre", "option"]
  ]);
  // La roquette est dans la salade tiède, et en supplément du pesto.
  const roquette = recettesDu(produit("roquette"), RECIPES);
  assert.equal(roquette.at(-1).r.id, "pesto-basilic-maison");
  assert.equal(roquette.at(-1).ou, "supplement");
  assert.deepEqual(recettesDu({ cids: [] }, RECIPES), []);
});

test("le calendrier est bien formé : ids uniques, familles connues, au moins deux mois", () => {
  const familles = FAMILLES_SAISON.map(f => f.id);
  assert.equal(new Set(PRODUITS.map(p => p.id)).size, PRODUITS.length);
  for (const p of PRODUITS) {
    assert.ok(familles.includes(p.famille), p.id);
    assert.ok(p.mois === "annee" || (Array.isArray(p.mois) && p.mois.length >= 2), p.id);
  }
  for (const f of familles) assert.ok(PRODUITS.some(p => p.famille === f), f);
});
