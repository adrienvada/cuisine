/* Lot « navigation » : stylesPrets(), l'attente des feuilles de style non bloquantes, sous Node avec un document factice. */

import test from "node:test";
import assert from "node:assert/strict";

/* Un lien de feuille minimal : `sheet` n'existe qu'une fois chargé, `media` passe à « all » au chargement. */
function faussesFeuilles(...etats) {
  const liens = etats.map(chargee => {
    const ecouteurs = {};
    return {
      media: chargee ? "all" : "print",
      sheet: chargee ? {} : null,
      dataset: {},
      addEventListener(type, f) { (ecouteurs[type] ||= []).push(f); },
      declencher(type) { for (const f of ecouteurs[type] || []) f(); },
      charger() { this.sheet = {}; this.media = "all"; this.declencher("load"); }
    };
  });
  globalThis.document = { querySelectorAll: () => liens };
  return liens;
}

/* Un module neuf à chaque test : l'état « tout est prêt » est mémorisé. */
let n = 0;
const styles = () => import(`../../js/ui/styles.js?essai=${n++}`);

test("stylesPrets : aucune feuille à attendre, la promesse est résolue d'emblée", async () => {
  faussesFeuilles();
  const { stylesPrets, stylesDejaPrets } = await styles();
  assert.equal(stylesDejaPrets(), true);
  await stylesPrets();
});

test("stylesPrets : des feuilles déjà appliquées ne sont pas attendues", async () => {
  faussesFeuilles(true, true);
  const { stylesDejaPrets } = await styles();
  assert.equal(stylesDejaPrets(), true);
});

test("stylesPrets : attend la dernière feuille, puis se résout", async () => {
  const [a, b] = faussesFeuilles(false, false);
  const { stylesPrets, stylesDejaPrets } = await styles();
  assert.equal(stylesDejaPrets(), false);
  let resolue = false;
  const p = stylesPrets().then(() => { resolue = true; });
  a.charger();
  await new Promise(r => setImmediate(r));
  assert.equal(resolue, false, "une feuille manque encore");
  b.charger();
  await p;
  assert.equal(resolue, true);
  assert.equal(stylesDejaPrets(), true);
});

test("stylesPrets : une feuille chargée mais encore réservée à l'impression n'est pas appliquée", async () => {
  const [a] = faussesFeuilles(false);
  a.sheet = {};                                  // chargée, `media` n'a pas encore changé
  const { stylesDejaPrets } = await styles();
  assert.equal(stylesDejaPrets(), false);
});

test("stylesPrets : une feuille en erreur ne bloque pas", async () => {
  const [a] = faussesFeuilles(false);
  const { stylesPrets } = await styles();
  const p = stylesPrets();
  a.declencher("error");
  await p;
});

test("stylesPrets : au plus tard après 3 s", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  faussesFeuilles(false);
  const { stylesPrets } = await styles();
  let resolue = false;
  const p = stylesPrets().then(() => { resolue = true; });
  t.mock.timers.tick(2900);
  await Promise.resolve();
  assert.equal(resolue, false);
  t.mock.timers.tick(200);
  await p;
  assert.equal(resolue, true);
});
