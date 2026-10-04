/* Robustesse : un état, un fichier ou une version d'un autre appareil mal formés ne cassent jamais le carnet. */

import test from "node:test";
import assert from "node:assert/strict";
import "./donnees.mjs";
import { lireSauvegarde, normaliserEtat } from "../../js/core/sauvegarde.js";
import { CLE_ILLISIBLE, STORE_KEY, lireEtat, save, state, surEchecSauvegarde, surSauvegarde } from "../../js/core/etat.js";
import { cookingStep, setCooking, COOKING_TTL } from "../../js/core/seance.js";
import { refaireRepas, viderLeMenu } from "../../js/core/menu.js";
import { entreesDe } from "../../js/core/journal.js";

const cle = () => "kneuve" + Math.random().toString(36).slice(2, 6);

/* Un stockage de poche, qui peut refuser de lire ou d'écrire. */
function faux({ lecture = null, getItem, setItem } = {}) {
  const t = new Map(lecture == null ? [] : [[STORE_KEY, lecture]]);
  return {
    t,
    getItem: getItem || (k => (t.has(k) ? t.get(k) : null)),
    setItem: setItem || ((k, v) => { t.set(k, String(v)); })
  };
}

/* ---------- normaliserEtat ---------- */

test("normaliserEtat : ce qui n'est pas un objet donne un état vide", () => {
  for (const v of [null, undefined, 3, "x", [], [{}]]) assert.deepEqual(normaliserEtat(v), {});
});

test("normaliserEtat : null à la place de chaque champ connu, aucun plantage et aucun champ gardé", () => {
  const champs = ["menu", "extras", "timers", "journal", "historique", "repas", "notes", "notesPerso", "checked", "cooked",
    "ordreRayons", "portions", "choices", "addons", "cooking", "reglages", "filter", "query", "fondQuery", "hintCoursesOff"];
  const hostile = Object.fromEntries(champs.map(c => [c, null]));
  assert.deepEqual(normaliserEtat(hostile), {});
  const tableaux = Object.fromEntries(champs.map(c => [c, []]));
  const propre = normaliserEtat(tableaux);
  for (const c of ["menu", "extras", "timers", "journal", "historique", "ordreRayons"]) assert.deepEqual(propre[c], []);
  assert.equal("repas" in propre, false);
  assert.equal("checked" in propre, false);
});

test("normaliserEtat : les entrées imbriquées mal formées sont écartées une à une", () => {
  const propre = normaliserEtat({
    menu: [null, 3, { rid: 4 }, { rid: "quiche-lorraine", k: "a" }, "focaccia-romarin"],
    extras: [null, { id: "e1" }, { id: "e2", name: "Éponges" }],
    timers: [null, { id: "t" }, { id: "t1", rid: "r", step: 0, end: 5 }],
    journal: [null, { id: "j", rid: "r" }, { id: "j2", rid: "r", date: "2026-01-02", convives: "beaucoup" }],
    historique: [null, { id: "h", date: "x" }, { id: "h1", date: "2026-01-01" },
      { id: "h2", date: "2026-01-01", entrees: [null, 2, { rid: "quiche-lorraine" }] }],
    notes: { a: "encore", b: 3, c: null },
    notesPerso: { a: { txt: "bien" }, b: "x", c: { txt: 4 } },
    checked: { a: true, b: false, c: null },
    cooked: { a: { count: 2, last: 5 }, b: { count: "x" }, c: 1 },
    ordreRayons: ["Crèmerie & œufs", 4, null],
    portions: { a: 4, b: "4", c: 0, d: -2 },
    choices: { a: { garniture: "olives", x: 3 }, b: "x" },
    addons: { a: ["lardons", 2], b: "x" },
    cooking: { a: { step: 2, at: 10 }, b: { step: "x" }, c: null }
  }, { genererCle: cle });
  assert.deepEqual(propre.menu.map(e => e.rid ?? e), ["quiche-lorraine", "focaccia-romarin"]);
  assert.deepEqual(propre.extras, [{ id: "e2", name: "Éponges" }]);
  assert.deepEqual(propre.timers.map(t => t.id), ["t1"]);
  assert.deepEqual(propre.journal.map(e => e.id), ["j2"]);
  assert.equal(propre.journal[0].convives, 1);
  assert.deepEqual(propre.historique.map(h => h.id), ["h2"]);   // h1 n'a pas d'entrees : inutilisable
  assert.deepEqual(propre.historique[0].entrees, [{ rid: "quiche-lorraine", choices: {}, addons: [], portions: null }]);
  assert.deepEqual(propre.notes, { a: "encore" });
  assert.deepEqual(Object.keys(propre.notesPerso), ["a"]);
  assert.deepEqual(propre.checked, { a: true });
  assert.deepEqual(propre.cooked, { a: { count: 2, last: 5 } });
  assert.deepEqual(propre.ordreRayons, ["Crèmerie & œufs"]);
  assert.deepEqual(propre.portions, { a: 4 });
  assert.deepEqual(propre.choices, { a: { garniture: "olives" } });
  assert.deepEqual(propre.addons, { a: ["lardons"] });
  assert.deepEqual(Object.keys(propre.cooking), ["a"]);
});

test("normaliserEtat : une entrée de menu reçoit une clé, ses addons, ses choix et ses portions ; une clé en double est refaite", () => {
  const { menu } = normaliserEtat({
    menu: [{ rid: "quiche-lorraine" }, { rid: "cake", k: "a", addons: "x", choices: [], portions: "6" }, { rid: "cake", k: "a" }]
  }, { genererCle: (() => { let n = 0; return () => "neuve" + ++n; })() });
  assert.equal(menu[0].k, "neuve1");
  assert.deepEqual([menu[0].addons, menu[0].choices, menu[0].portions], [[], {}, null]);
  assert.deepEqual([menu[1].k, menu[1].addons, menu[1].choices, menu[1].portions], ["a", [], {}, null]);
  assert.equal(menu[2].k, "neuve2");
});

test("normaliserEtat : le repas est validé réglage par réglage", () => {
  assert.deepEqual(normaliserEtat({ repas: { exclus: "gluten", convives: "abc", heure: "25:99", date: "demain" } }).repas, {});
  assert.deepEqual(normaliserEtat({ repas: { exclus: ["gluten", 3], convives: 6.4, heure: "19:30", date: "2026-05-02" } }).repas,
    { exclus: ["gluten"], convives: 6, heure: "19:30", date: "2026-05-02" });
  assert.deepEqual(normaliserEtat({ repas: { convives: 99 } }).repas, {});
  assert.deepEqual(normaliserEtat({ repas: { date: "", heure: "" } }).repas, { date: "", heure: "" });   // effacées à la main : légitimes
});

test("normaliserEtat : champs inconnus gardés, clés dangereuses retirées, copie indépendante", () => {
  const source = JSON.parse('{"avenir": {"a": [1]}, "__proto__": {"pollue": true}, "menu": []}');
  const propre = normaliserEtat(source);
  assert.deepEqual(propre.avenir, { a: [1] });
  assert.equal(Object.keys(propre).includes("__proto__"), false);
  assert.equal({}.pollue, undefined);
  propre.avenir.a.push(2);
  assert.deepEqual(source.avenir.a, [1]);
});

test("normaliserEtat : un état déjà propre ressort identique, et deux passes valent une", () => {
  const propre = {
    menu: [{ k: "q1", rid: "quiche-lorraine", choices: { a: "b" }, addons: ["x"], portions: 4 }],
    extras: [{ id: "e1", name: "Éponges" }], checked: { "x-e1": true, lardons: true },
    timers: [{ id: "t1", rid: "r", mk: null, step: 1, slot: null, label: "Four", emoji: "🔥", end: 100, total: 5, fired: false }],
    journal: [{ id: "j1", rid: "r", date: "2026-02-01", convives: 4, note: "bon", photo: true }],
    historique: [{ id: "h1", date: "2026-01-01", convives: 4, entrees: [{ rid: "r", choices: {}, addons: [], portions: null }] }],
    repas: { convives: 4, heure: "20:00", date: "", exclus: ["gluten"] },
    notes: { r: "encore" }, notesPerso: { r: { txt: "moins de sel", at: 3 } }, cooked: { r: { count: 2, last: 9 } },
    ordreRayons: ["Autre"], portions: { r: 6 }, choices: { r: { a: "b" } }, addons: { r: ["x"] }, cooking: { r: { step: 1, at: 3 } },
    reglages: { tailleCuisine: 2 }, filter: "Toutes", query: "", fondQuery: "", hintCoursesOff: false
  };
  const une = normaliserEtat(propre);
  assert.deepEqual(une, propre);
  assert.deepEqual(normaliserEtat(une), une);
});

test("normaliserEtat : appareil:false retire minuteurs et réglages", () => {
  const propre = normaliserEtat({ timers: [], reglages: {}, menu: [] }, { appareil: false });
  assert.deepEqual(Object.keys(propre), ["menu"]);
});

/* ---------- lireSauvegarde ---------- */

test("lireSauvegarde : un fichier hostile est accepté entrée par entrée, sans menu à moitié valide", () => {
  const { donnees, erreur } = lireSauvegarde(JSON.stringify({
    menu: [{ rid: "quiche-lorraine" }],
    repas: { exclus: "gluten", convives: "abc" },
    historique: [null, { id: "h", date: "x" }, { id: "h2", date: "2026-01-01", entrees: [null] }],
    journal: [null, { id: "j", rid: "r", date: "2026-01-01" }]
  }), cle);
  assert.equal(erreur, undefined);
  assert.equal(typeof donnees.menu[0].k, "string");
  assert.deepEqual(donnees.menu[0].addons, []);
  assert.deepEqual(donnees.repas, {});
  assert.deepEqual(donnees.historique, [{ id: "h2", date: "2026-01-01", convives: 1, entrees: [] }]);
  assert.equal(donnees.journal.length, 1);
});

test("lireSauvegarde : viderLeMenu et refaireRepas ne plantent pas sur un menu importé sans addons", () => {
  const { donnees } = lireSauvegarde(JSON.stringify({ menu: [{ rid: "quiche-lorraine" }], historique: [{ id: "h", date: "2026-01-01", entrees: [{ rid: "quiche-lorraine" }] }] }));
  const avant = structuredClone(state);
  try {
    Object.assign(state, structuredClone(donnees));
    assert.doesNotThrow(() => refaireRepas("h"));
    assert.doesNotThrow(() => viderLeMenu());
  } finally {
    for (const k of Object.keys(state)) delete state[k];
    Object.assign(state, avant);
  }
});

test("lireSauvegarde : un menu dont les entrées sont inutilisables ne rend pas un fichier « reconnu » à tort", () => {
  assert.ok(lireSauvegarde(JSON.stringify({ menu: "x", notes: 3 })).erreur);
  assert.ok(lireSauvegarde(JSON.stringify({ timers: [] })).erreur);
});

/* Un journal avec des trous ne fait pas taire la section : entreesDe ne lève plus une fois normalisé. */
test("un journal reçu avec des null passe par la normalisation et entreesDe fonctionne", () => {
  const { journal } = normaliserEtat({ journal: [null, { id: "a", rid: "r", date: "2026-01-02" }, { id: "b", rid: "r", date: "2026-01-03" }] });
  assert.deepEqual(entreesDe("r", journal).map(e => e.id), ["b", "a"]);
});

/* ---------- lireEtat : le stockage du navigateur ---------- */

test("lireEtat : JSON invalide → état vide et copie brute mise de côté", () => {
  const s = faux({ lecture: "{pas du json" });
  assert.deepEqual(lireEtat(s), {});
  assert.equal(s.t.get(CLE_ILLISIBLE), "{pas du json");
  assert.equal(s.t.get(STORE_KEY), "{pas du json");   // on ne détruit rien : c'est la prochaine sauvegarde qui remplacera
});

test("lireEtat : un JSON qui n'est pas un objet est traité de même", () => {
  for (const brut of ["[1,2]", "null", "42", '"x"']) {
    const s = faux({ lecture: brut });
    assert.deepEqual(lireEtat(s), {});
    assert.equal(s.t.get(CLE_ILLISIBLE), brut);
  }
});

test("lireEtat : getItem qui lève → état vide, sans plantage", () => {
  const s = faux({ getItem() { throw new DOMException("refusé", "SecurityError"); } });
  assert.deepEqual(lireEtat(s), {});
});

test("lireEtat : copie illisible impossible (quota) → toujours un état vide", () => {
  const s = faux({ lecture: "{x", setItem() { throw new DOMException("plein", "QuotaExceededError"); } });
  assert.deepEqual(lireEtat(s), {});
});

test("lireEtat : le JSON valide de mauvaise forme est nettoyé, le reste est gardé", () => {
  const s = faux({ lecture: JSON.stringify({ timers: null, checked: null, menu: [null, { rid: "quiche-lorraine", k: "q" }], extras: [null], notes: { a: "encore" } }) });
  const o = lireEtat(s);
  assert.deepEqual(Object.keys(o).sort(), ["extras", "menu", "notes"]);
  assert.equal(o.menu.length, 1);
  assert.equal(CLE_ILLISIBLE in Object.fromEntries(s.t), false);
});

test("lireEtat : stockage vide ou absent → état vide", () => {
  assert.deepEqual(lireEtat(faux()), {});
  assert.deepEqual(lireEtat(null), {});
});

/* ---------- save : l'écriture qui échoue ---------- */

test("save : un stockage plein ne lève pas, signale chaque échec, et appelle quand même les abonnés", () => {
  const avant = globalThis.localStorage;
  let essais = 0, echecs = 0, appels = 0;
  globalThis.localStorage = { getItem: () => null, setItem() { essais++; throw new DOMException("plein", "QuotaExceededError"); } };
  surEchecSauvegarde(() => { echecs++; });
  surSauvegarde(() => { appels++; });
  try {
    assert.doesNotThrow(() => { save(); save(); save(); });
    assert.equal(essais, 3);
    assert.equal(echecs, 3);   // c'est à l'abonné (main.js) de ne prévenir qu'une fois
    assert.equal(appels, 3);
  } finally {
    if (avant === undefined) delete globalThis.localStorage; else globalThis.localStorage = avant;
  }
});

test("save : un abonné qui lève ne coupe ni les autres ni l'action", () => {
  let vu = 0;
  surSauvegarde(() => { throw new Error("abonné défaillant"); });
  surSauvegarde(() => { vu++; });
  const muet = console.error;
  console.error = () => {};
  try { assert.doesNotThrow(() => save()); } finally { console.error = muet; }
  assert.ok(vu >= 1);
});

/* ---------- seance : le rendu n'écrit plus ---------- */

test("cookingStep : une séance expirée est lue comme absente sans rien écrire ; setCooking balaie les périmées", () => {
  const r = { id: "rec", steps: [1, 2, 3] };
  const avant = state.cooking;
  state.cooking = { vieille: { step: 1, at: Date.now() - COOKING_TTL - 1000 }, rec: { step: 2, at: Date.now() - COOKING_TTL - 1000 } };
  try {
    assert.equal(cookingStep(r, "rec"), null);
    assert.deepEqual(Object.keys(state.cooking).sort(), ["rec", "vieille"]);   // lecture : aucune écriture
    setCooking("autre", 1);
    assert.deepEqual(Object.keys(state.cooking), ["autre"]);
  } finally { state.cooking = avant; }
});
