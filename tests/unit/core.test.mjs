/* La règle des modules core/ : aucun ne touche au DOM au chargement, tous
   s'importent donc sous Node. Un module qui y déroge casse ce test. */

import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dossier = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../js/core");

for (const fichier of readdirSync(dossier).filter(f => f.endsWith(".js"))) {
  test(`core/${fichier} s'importe sans navigateur`, async () => {
    assert.equal(typeof document, "undefined");
    assert.equal(typeof window, "undefined");
    const mod = await import(path.join(dossier, fichier));
    assert.ok(Object.keys(mod).length > 0);
  });
}

test("l'état part vide hors navigateur, et save() ne plante pas", async () => {
  const { state, save, surSauvegarde } = await import(path.join(dossier, "etat.js"));
  assert.deepEqual(state.menu, []);
  let appels = 0;
  surSauvegarde(() => { appels++; });
  save();
  assert.equal(appels, 1);
});
