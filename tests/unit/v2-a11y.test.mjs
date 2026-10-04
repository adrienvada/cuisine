/* Accessibilité : la région live du carnet. */

import test from "node:test";
import assert from "node:assert/strict";

const attendre = ms => new Promise(r => setTimeout(r, ms));

/* Une région factice : on garde tout ce qui y est écrit, dans l'ordre. */
const region = { historique: [], _texte: "" };
Object.defineProperty(region, "textContent", {
  get() { return this._texte; },
  set(v) { this._texte = v; this.historique.push(v); }
});
const faux = { getElementById: id => (id === "annonces" ? region : null) };
globalThis.document = faux;

const { annoncer } = await import("../../js/ui/annonces.js");

test("annoncer : la région est vidée d'abord, puis écrite un instant plus tard", async () => {
  region.historique.length = 0;
  annoncer("Étape 2 / 5");
  assert.equal(region.textContent, "", "vide tout de suite");
  await attendre(150);
  assert.equal(region.textContent, "Étape 2 / 5");
});

test("annoncer : la même phrase deux fois passe par un vide, donc elle est redite", async () => {
  annoncer("2 recettes");
  await attendre(150);
  region.historique.length = 0;
  annoncer("2 recettes");
  await attendre(150);
  assert.deepEqual(region.historique, ["", "2 recettes"]);
});

test("annoncer : une annonce qui en recouvre une autre la remplace", async () => {
  annoncer("première");
  annoncer("seconde");
  await attendre(150);
  assert.equal(region.textContent, "seconde");
});

test("annoncer : sans région dans la page, rien ne plante", () => {
  const avant = globalThis.document;
  globalThis.document = { getElementById: () => null };
  assert.doesNotThrow(() => annoncer("perdu"));
  globalThis.document = avant;
});
