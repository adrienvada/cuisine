/* Lot « css » de la deuxième vague : ce qui se vérifie sans navigateur. */

import test from "node:test";
import assert from "node:assert/strict";
import "./donnees.mjs";
import { abbrevDiscovered } from "../../js/core/recettes.js";

test("n° 9 : la pastille « Découverte » ne coupe plus les mots en « Pla. Vic. »", () => {
  assert.equal(abbrevDiscovered("à l'hôtel Park Plaza Victoria, à Amsterdam"), "Plaza Victoria, Amsterdam");
  assert.equal(abbrevDiscovered("au marché d'Aligre, à Paris"), "Marché d'Aligre, Paris");
});

test("n° 9 : aucun mot de la pastille n'est tronqué par un point d'abréviation", () => {
  for (const r of globalThis.RECIPES.filter(x => x.discovered)) {
    assert.doesNotMatch(abbrevDiscovered(r.discovered), /\w\./, `${r.id} : « ${abbrevDiscovered(r.discovered)} »`);
  }
});
