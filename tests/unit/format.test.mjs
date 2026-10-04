/* Les formats purs : temps, quantités, textes mis à l'échelle, texte normalisé. */

import test from "node:test";
import assert from "node:assert/strict";
import "./donnees.mjs";
import { fmtQty, fmtTime, fmtUnit, normaliser, scaleText } from "../../js/core/format.js";

test("fmtTime : minutes, heures pleines, heures et minutes", () => {
  assert.equal(fmtTime(null), "");
  assert.equal(fmtTime(5), "5 min");
  assert.equal(fmtTime(45), "45 min");
  assert.equal(fmtTime(60), "1 h");
  assert.equal(fmtTime(90), "1 h 30");
  assert.equal(fmtTime(125), "2 h 05");
});

test("fmtQty : au quart près, fractions écrites, virgule décimale", () => {
  assert.equal(fmtQty(null), "");
  assert.equal(fmtQty(0.25), "¼");
  assert.equal(fmtQty(0.5), "½");
  assert.equal(fmtQty(0.75), "¾");
  assert.equal(fmtQty(1.5), "1½");
  assert.equal(fmtQty(2), "2");
  assert.equal(fmtQty(2.34), "2¼");
  assert.equal(fmtQty(12.5), "12½");
  assert.equal(fmtQty(10.04), "10");
});

test("fmtUnit : le pluriel ne s'applique qu'au-delà de 1, et aux unités qui en ont un", () => {
  assert.equal(fmtUnit("gousse", 1), "gousse");
  assert.equal(fmtUnit("gousse", 2), "gousses");
  assert.equal(fmtUnit("bocal", 3), "bocaux");
  assert.equal(fmtUnit("g", 500), "g");
  assert.equal(fmtUnit("", 2), "");
});

test("scaleText : seules les quantités entre accolades suivent l'échelle", () => {
  assert.equal(scaleText("Versez {3 cl} de rhum.", 2), "Versez 6 cl de rhum.");
  assert.equal(scaleText("{1-2 c. à s.} de miel", 2), "2 à 4 c. à s. de miel");
  assert.equal(scaleText("{2 gousse} d'ail", 2), "4 gousses d'ail");
  assert.equal(scaleText("{1,5 kg} de farine", 2), "3 kg de farine");
  // Une quantité nue ne dépend pas des portions.
  assert.equal(scaleText("Bandes de 2 cm", 3), "Bandes de 2 cm");
  assert.equal(scaleText("", 2), "");
  assert.equal(scaleText(undefined, 2), undefined);
});

test("scaleText : grammes et millilitres sont arrondis à l'unité", () => {
  assert.equal(scaleText("{100 g} de sucre", 1 / 3), "33 g de sucre");
});

test("normaliser : minuscules, sans accents, œ et æ dépliés", () => {
  assert.equal(normaliser("Œuf"), "oeuf");
  assert.equal(normaliser("Æther"), "aether");
  assert.equal(normaliser("Crème brûlée"), "creme brulee");
  assert.equal(normaliser("ÉTÉ"), "ete");
  assert.equal(normaliser("déjà-vu"), "deja-vu");
  assert.equal(normaliser(null), "");
  assert.equal(normaliser(42), "42");
});
