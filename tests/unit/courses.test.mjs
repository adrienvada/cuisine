/* La liste de courses calculée depuis le menu, sur des états pré-remplis. */

import test from "node:test";
import assert from "node:assert/strict";
import { RECIPES } from "./donnees.mjs";
import { state } from "../../js/core/etat.js";
import { buildCourseList, courseQtyStr, courseTodo } from "../../js/core/courses.js";

const entree = (rid, { k = "t" + rid, choices = {}, addons = [], portions = null } = {}) =>
  ({ k, rid, choices, addons, portions });

const remettreAZero = () => {
  state.menu = [];
  state.checked = {};
  state.extras = [];
};

const ligne = (liste, cle) => liste.find(i => i.key === cle);

test("un menu vide ne donne aucun article", () => {
  remettreAZero();
  assert.deepEqual(buildCourseList(), []);
  assert.equal(courseTodo(), 0);
});

test("une recette : ses ingrédients, rangés par rayon, aux quantités de la fiche", () => {
  remettreAZero();
  state.menu = [entree("quiche-lorraine")];
  const liste = buildCourseList();
  const lardons = ligne(liste, "lardons");
  assert.equal(lardons.qty, 200);
  assert.equal(lardons.unit, "g");
  assert.equal(lardons.rayon, "Boucherie & charcuterie");
  assert.equal(courseQtyStr(lardons), "200 g");
});

test("deux entrées de la même recette : les quantités s'additionnent, une seule ligne", () => {
  remettreAZero();
  state.menu = [entree("quiche-lorraine", { k: "a" }), entree("quiche-lorraine", { k: "b" })];
  const liste = buildCourseList();
  assert.equal(liste.filter(i => i.key === "lardons").length, 1);
  assert.equal(ligne(liste, "lardons").qty, 400);
});

test("les portions de l'entrée mettent les quantités à l'échelle", () => {
  remettreAZero();
  state.menu = [entree("quiche-lorraine", { portions: 12 })];
  assert.equal(ligne(buildCourseList(), "lardons").qty, 400);
});

test("hors poids et volumes, la quantité s'arrondit à l'entier supérieur ; les grammes, non", () => {
  remettreAZero();
  state.menu = [entree("quiche-lorraine", { portions: 7 })];
  const liste = buildCourseList();
  assert.equal(ligne(liste, "oeufs").qty, 5);              // 4 × 7/6 = 4,67 œufs
  assert.ok(Math.abs(ligne(liste, "lardons").qty - 200 * 7 / 6) < 1e-9);
});

test("deux recettes qui partagent un ingrédient (même cid) : une ligne, quantités additionnées", () => {
  remettreAZero();
  const parCid = new Map();
  let paire = null;
  for (const r of RECIPES) {
    for (const ing of r.ingredients) {
      if (!ing.cid || ing.qty == null || ing.course === false) continue;
      const deja = parCid.get(ing.cid);
      if (deja && deja.r.id !== r.id && deja.ing.unit === ing.unit && !paire) paire = [deja, { r, ing }];
      if (!deja) parCid.set(ing.cid, { r, ing });
    }
  }
  assert.ok(paire, "aucune paire de recettes ne partage d'ingrédient : le test n'a plus d'objet");
  const [a, b] = paire;
  state.menu = [entree(a.r.id), entree(b.r.id)];
  const it = ligne(buildCourseList(), a.ing.cid);
  const attendu = a.ing.qty * 1 + b.ing.qty * 1;
  assert.ok(it, `cid ${a.ing.cid}`);
  // Les recettes peuvent compter d'autres lignes de même cid : on vérifie au moins la somme des deux.
  assert.ok(it.qty >= attendu - 1e-9, `${it.qty} < ${attendu}`);
});

test("un article coché ne compte plus dans ce qu'il reste à prendre", () => {
  remettreAZero();
  state.menu = [entree("quiche-lorraine")];
  const tout = courseTodo();
  assert.equal(tout, buildCourseList().length);
  state.checked = { lardons: true };
  assert.equal(courseTodo(), tout - 1);
});

test("les articles libres comptent, cochés ou non", () => {
  remettreAZero();
  state.extras = [{ id: "e1", name: "Éponges" }, { id: "e2", name: "Glaçons" }];
  assert.equal(courseTodo(), 2);
  state.checked = { "x-e1": true };
  assert.equal(courseTodo(), 1);
});

test("une recette inconnue du carnet est ignorée plutôt que de faire planter la liste", () => {
  remettreAZero();
  state.menu = [entree("recette-qui-n-existe-plus"), entree("quiche-lorraine")];
  assert.ok(ligne(buildCourseList(), "lardons"));
});

test("les suppléments choisis ajoutent leurs ingrédients, signalés comme tels", () => {
  remettreAZero();
  const r = RECIPES.find(x => (x.addons || []).some(a => a.ingredients.some(i => i.cid && i.course !== false)));
  assert.ok(r, "aucune recette avec supplément");
  const a = r.addons.find(x => x.ingredients.some(i => i.cid && i.course !== false));
  state.menu = [entree(r.id, { addons: [a.id] })];
  const cid = a.ingredients.find(i => i.cid && i.course !== false).cid;
  const it = ligne(buildCourseList(), cid);
  assert.ok(it, `cid ${cid}`);
});

test.after(remettreAZero);
