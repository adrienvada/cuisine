/* Fonctions pures des recettes : la pastille « Découverte » abrégée, les recettes supprimées du carnet. */

import test from "node:test";
import assert from "node:assert/strict";
import "./donnees.mjs";
import { state } from "../../js/core/etat.js";
import { fusionner } from "../../js/core/fusion.js";
import { abbrevDiscovered, demasquer, estMasquee, masquer, recettesDuCarnet } from "../../js/core/recettes.js";
import { suggerer } from "../../js/core/completude.js";
import { normaliserEtat } from "../../js/core/sauvegarde.js";

test("abbrevDiscovered : sans la préposition d'intro, lieu raccourci puis ville", () => {
  assert.equal(abbrevDiscovered("à l'hôtel Park Plaza Victoria, à Amsterdam"), "Plaza Victoria, Amsterdam");
});

test("abbrevDiscovered : le détail après la virgule se réduit à la dernière ville", () => {
  assert.equal(abbrevDiscovered("au Murmure du Son, festival à Eu"), "Murmure du Son, Eu");
});

test("abbrevDiscovered : sans virgule, le lieu seul", () => {
  assert.equal(abbrevDiscovered("chez Marcel"), "Marcel");
});

test("abbrevDiscovered : une contraction reste entière", () => {
  assert.equal(abbrevDiscovered("au marché d'Aligre, à Paris"), "Marché d'Aligre, Paris");
});

test("abbrevDiscovered : toutes les recettes du carnet donnent un texte court", () => {
  for (const r of globalThis.RECIPES.filter(x => x.discovered)) {
    const court = abbrevDiscovered(r.discovered);
    assert.ok(court.length > 0 && court.length <= r.discovered.length, `${r.id} : « ${court} »`);
  }
});

/* ---------- Recettes supprimées du carnet ---------- */

test("masquer / demasquer : la recette quitte le carnet, puis y revient", () => {
  const r = globalThis.RECIPES[0];
  const avant = recettesDuCarnet().length;
  masquer(r.id);
  assert.ok(estMasquee(r));
  assert.equal(recettesDuCarnet().length, avant - 1);
  assert.ok(!recettesDuCarnet().includes(r));
  demasquer(r.id);
  assert.ok(!estMasquee(r));
  assert.equal(recettesDuCarnet().length, avant);
  delete state.masquees;
});

test("une recette supprimée n'est jamais suggérée pour compléter le repas", () => {
  const sugg = () => suggerer([], ["legumes", "proteines", "feculents"], { max: 50 }).map(s => s.r.id);
  const visee = sugg()[0];
  assert.ok(visee, "au moins une suggestion sans suppression");
  masquer(visee);
  assert.ok(!sugg().includes(visee));
  delete state.masquees;
});

test("masquees : normalisé (horodatages seuls) et fusionné clé par clé entre appareils", () => {
  assert.deepEqual(normaliserEtat({ masquees: { a: 1, b: "x", __proto__: 2 } }).masquees, { a: 1 });
  // Supprimée ici, une autre supprimée là-bas, une troisième remise là-bas : les trois gestes tiennent.
  const base = { masquees: { c: 1 } };
  const m = fusionner(base, { masquees: { c: 1, a: 2 } }, { masquees: { b: 3 } });
  assert.deepEqual(m.masquees, { a: 2, b: 3 });
});
