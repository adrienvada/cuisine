/* Lot « finitions » : l'occupation du four dans le rétroplanning. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./donnees.mjs";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
Object.assign(globalThis, new Function(readFileSync(path.join(racine, "js/allergenes.js"), "utf8") + ";return { ALLERGENES_LISTE, ALLERGENES };")());

const { state } = await import("../../js/core/etat.js");
const menu = await import("../../js/core/menu.js");
const { planifier, minutesMurales } = await import("../../js/core/planning.js");

const TABLE = minutesMurales("2030-06-15", 20 * 60);
const plageLongue = plage => plage.sortie - plage.entree;

for (const pate of ["industrielle", "maison"]) {
  test(`quiche (pâte ${pate}) : le four n'est occupé que 20 min, puis 32 min, pas les 67 min entre les deux`, () => {
    Object.assign(state, { menu: [{ k: "q", rid: "quiche-lorraine", choices: { pate }, addons: [], portions: null }], checked: {}, extras: [], portions: {}, choices: {}, addons: {} });
    const plan = planifier({ table: TABLE, taches: menu.tachesDuMenu() });
    const q = plan.recettes[0];
    assert.deepEqual(q.plagesFour.map(plageLongue), [20, 32]);
    assert.equal(q.plagesFour.reduce((n, p) => n + plageLongue(p), 0), 52);
    assert.ok(q.plagesFour[1].entree - q.plagesFour[0].sortie >= 5, "le four est libre pendant la garniture");
    // La frise le dit : on enfourne, on sort, on enfourne de nouveau, on sort.
    assert.deepEqual(plan.evenements.filter(e => ["enfourner", "sortir"].includes(e.type)).map(e => e.type), ["enfourner", "sortir", "enfourner", "sortir"]);
    // Le temps total, lui, ne change pas, et le four ne se rallume pas entre les deux passages.
    assert.equal(plan.evenements.filter(e => e.type === "prechauffage").length, 1);
    assert.ok(q.fin <= TABLE && TABLE - q.fin < 5);
  });
}

test("un plat plus chaud qui tient dans le creux du four d'un autre n'est pas un conflit", () => {
  const taches = [
    { k: "a", titre: "Gratin", temps: { prep: 70 }, etapes: [{ titre: "Cuisson à blanc", duree: 10, four: 180 }, { titre: "Garniture" }, { titre: "Cuisson", duree: 10, four: 180 }] },
    { k: "b", titre: "Pain", temps: { prep: 50 }, etapes: [{ titre: "Enfourne", duree: 10, four: 220 }, { titre: "Finition" }] }
  ];
  const plan = planifier({ table: TABLE, taches });
  assert.equal(plan.conflits.length, 0);
  assert.equal(plan.recettes.find(r => r.k === "a").debut, TABLE - 70);
  assert.equal(plan.recettes.find(r => r.k === "b").debut, TABLE - 50);
});

test("des étapes de four qui s'enchaînent font une seule plage, enveloppe inchangée", () => {
  const taches = [{ k: "a", titre: "Mi-cuit", temps: {}, etapes: [{ titre: "Cuire", duree: 10, four: 150, prechauffe: 200 }, { titre: "Finir", duree: 5, four: 150 }] }];
  const plan = planifier({ table: TABLE, taches });
  const a = plan.recettes[0];
  assert.deepEqual(a.plagesFour, [{ temp: 200, entree: TABLE - 15, sortie: TABLE }]);
  assert.deepEqual(a.four, { temp: 200, entree: TABLE - 15, sortie: TABLE });
});

/* Toutes les paires de recettes du carnet : le calcul s'arrête, et deux plats de chaleurs
   différentes ne se partagent jamais le four sans le dire (conflit signalé) ni se chevauchent. */
test("toute paire de recettes : le planning se termine et les passages au four de chaleurs différentes ne se chevauchent pas", async () => {
  const { RECIPES } = await import("./donnees.mjs");
  const ids = RECIPES.map(r => r.id);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      Object.assign(state, { menu: [ids[i], ids[j]].map((rid, n) => ({ k: "m" + n, rid, choices: {}, addons: [], portions: null })), checked: {}, extras: [], portions: {}, choices: {}, addons: {} });
      const plan = planifier({ table: TABLE, taches: menu.tachesDuMenu() });
      const [a, b] = plan.recettes;
      for (const pa of a.plagesFour) for (const pb of b.plagesFour) {
        if (Math.abs(pa.temp - pb.temp) <= 10) continue;
        const separes = pa.entree >= pb.sortie || pb.entree >= pa.sortie;
        assert.ok(separes, `${ids[i]} / ${ids[j]} : passages au four superposés`);
      }
    }
  }
});
