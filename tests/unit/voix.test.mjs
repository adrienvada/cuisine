/* js/ui/voix.js : la compréhension des énoncés et le choix de la voix, sans navigateur. */

import test from "node:test";
import assert from "node:assert/strict";
import { commandeDepuis, choisirVoix, voixDisponible, lire } from "../../js/ui/voix.js";

test("commandeDepuis : accents, casse et ponctuation n'y changent rien", () => {
  assert.equal(commandeDepuis("  SUIVANT !  "), "suivant");
  assert.equal(commandeDepuis("Précédent."), "precedent");
  assert.equal(commandeDepuis("répète"), "repeter");
  assert.equal(commandeDepuis("Qu’est-ce qu’il faut ?"), "ingredients");
  assert.equal(commandeDepuis("Terminé"), "terminer");
  assert.equal(commandeDepuis("lance le minuteur"), "minuteur");
});

test("commandeDepuis : un mot caché dans un autre ne compte pas", () => {
  assert.equal(commandeDepuis("la pâte est affinée"), null);
  assert.equal(commandeDepuis("pokémon"), null);
  assert.equal(commandeDepuis(""), null);
  assert.equal(commandeDepuis(undefined), null);
});

test("commandeDepuis : le plus précis l'emporte sur le banal « ok »", () => {
  assert.equal(commandeDepuis("ok lance le minuteur"), "minuteur");
  assert.equal(commandeDepuis("ok répète"), "repeter");
});

test("choisirVoix : fr-FR avant les autres français, installée avant en ligne, jamais d'anglais", () => {
  const ca = { name: "ca", lang: "fr-CA", localService: true };
  const enLigne = { name: "ligne", lang: "fr-FR", localService: false };
  const locale = { name: "locale", lang: "fr_FR", localService: true };
  const en = { name: "en", lang: "en-US", localService: true };
  assert.equal(choisirVoix([en, ca, enLigne, locale]).name, "locale");
  assert.equal(choisirVoix([en, ca, enLigne]).name, "ligne");
  assert.equal(choisirVoix([en, ca]).name, "ca");
  assert.equal(choisirVoix([en]), null);
  assert.equal(choisirVoix([]), null);
});

test("sous Node, rien n'est disponible et lire() se résout sans rien faire", async () => {
  assert.deepEqual(voixDisponible(), { ecoute: false, lecture: false });
  await lire("Bonjour");
});
