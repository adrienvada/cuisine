/* Fonctions pures des recettes : la pastille « Découverte » abrégée. */

import test from "node:test";
import assert from "node:assert/strict";
import "./donnees.mjs";
import { abbrevDiscovered } from "../../js/core/recettes.js";

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
