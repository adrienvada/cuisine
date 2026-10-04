/* La liste de courses calculée depuis le menu, sur des états pré-remplis. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RAYONS, RECIPES } from "./donnees.mjs";
import { state } from "../../js/core/etat.js";
import { buildCourseList, courseQtyStr, courseTodo, deplacerRayon, elaguerCoches, quantitesDe, rayonsOrdonnes } from "../../js/core/courses.js";
import { fmtUnit } from "../../js/core/format.js";

/* Le fond de placard est une donnée globale que donnees.mjs ne charge pas. */
globalThis.PLACARD = new Function(readFileSync(new URL("../../js/placard.js", import.meta.url), "utf8") + ";return PLACARD;")();

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

test("hors poids et volumes, la quantité s'arrondit à l'entier supérieur ; les grammes, au gramme", () => {
  remettreAZero();
  state.menu = [entree("quiche-lorraine", { portions: 7 })];
  const liste = buildCourseList();
  assert.equal(ligne(liste, "oeufs").qty, 5);              // 4 × 7/6 = 4,67 œufs
  assert.equal(ligne(liste, "lardons").qty, 233);          // 200 × 7/6 = 233,33 g : pas de « 233¼ g » sur une liste de courses
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
  assert.equal(tout, buildCourseList().filter(i => !i.placard).length);   // le placard est à vérifier, pas à acheter
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

/* ---------- Unités mêlées, provenance, placard, coches, ordre des rayons ---------- */

/* Une recette de fortune, ajoutée aux données le temps d'un test. */
function avecRecettes(recettes, fn) {
  RECIPES.push(...recettes);
  try { fn(); } finally { for (const r of recettes) RECIPES.splice(RECIPES.indexOf(r), 1); }
}

const recetteFictive = (id, titre, ingredients, base = 4) => ({
  id, title: titre, emoji: "🍽️", category: "Plats", portions: { base, label: "personnes" },
  times: {}, ingredients, steps: []
});

const ing = (cid, qty, unit, extra = {}) => ({ name: cid, cid, qty, unit, rayon: "Herbes fraîches", ...extra });

test("deux unités pour un même article : les deux quantités sont gardées", () => {
  remettreAZero();
  const a = recetteFictive("t-a", "Pesto", [ing("basilic-t", 1, "bouquet")]);
  const b = recetteFictive("t-b", "Dip", [ing("basilic-t", 1, "botte")]);
  avecRecettes([a, b], () => {
    state.menu = [entree("t-a"), entree("t-b")];
    const it = ligne(buildCourseList(), "basilic-t");
    assert.equal(courseQtyStr(it), "1 bouquet + 1 botte");
    assert.deepEqual(it.parts, [{ unit: "bouquet", qty: 1 }, { unit: "botte", qty: 1 }]);
  });
});

test("les mêmes unités s'additionnent, les autres s'ajoutent ; une quantité écrite reste à côté du chiffré", () => {
  remettreAZero();
  const a = recetteFictive("t-a", "A", [ing("sel-t", 60, "g"), ing("beurre-t", 125, "g")]);
  const b = recetteFictive("t-b", "B", [ing("sel-t", null, undefined, { qtyText: "1 pincée" }), ing("beurre-t", 2, "c. à s."), ing("beurre-t", 25, "g")]);
  avecRecettes([a, b], () => {
    state.menu = [entree("t-a"), entree("t-b")];
    const liste = buildCourseList();
    assert.equal(courseQtyStr(ligne(liste, "sel-t")), "60 g + 1 pincée");
    assert.equal(courseQtyStr(ligne(liste, "beurre-t")), "150 g + 2 c. à s.");
  });
});

test("un article d'abord sans quantité puis chiffré garde la quantité (et l'ordre de rencontre)", () => {
  remettreAZero();
  const a = recetteFictive("t-a", "A", [ing("herbe-t", null, undefined, { qtyText: "quelques brins" })]);
  const b = recetteFictive("t-b", "B", [ing("herbe-t", 2, "brin")]);
  avecRecettes([a, b], () => {
    state.menu = [entree("t-a"), entree("t-b")];
    const it = ligne(buildCourseList(), "herbe-t");
    assert.equal(courseQtyStr(it), "2 brins + quelques brins");
    assert.equal(it.qty, 2);
    assert.equal(it.unit, "brin");
  });
});

test("l'arrondi à l'entier supérieur se fait unité par unité", () => {
  remettreAZero();
  const a = recetteFictive("t-a", "A", [ing("x-t", 1.5, "bouquet"), ing("x-t", 150, "g")], 4);
  avecRecettes([a], () => {
    state.menu = [entree("t-a", { portions: 4 })];
    assert.equal(courseQtyStr(ligne(buildCourseList(), "x-t")), "2 bouquets + 150 g");
  });
});

test("la provenance garde la quantité de chaque recette, deux entrées d'une même recette s'additionnent", () => {
  remettreAZero();
  const a = recetteFictive("t-a", "Focaccia", [ing("farine-t", 500, "g")]);
  const b = recetteFictive("t-b", "Cake salé", [ing("farine-t", 70, "g")]);
  avecRecettes([a, b], () => {
    state.menu = [entree("t-a", { k: "1" }), entree("t-b", { k: "2" }), entree("t-b", { k: "3" })];
    const it = ligne(buildCourseList(), "farine-t");
    assert.equal(it.qty, 640);
    assert.deepEqual(it.sources.map(s => [s.titre, quantitesDe(s)]), [["Focaccia", "500 g"], ["Cake salé", "140 g"]]);
  });
});

test("la provenance suit les portions de chaque entrée", () => {
  remettreAZero();
  const a = recetteFictive("t-a", "A", [ing("sucre-t", 100, "g")], 4);
  avecRecettes([a], () => {
    state.menu = [entree("t-a", { portions: 8 })];
    assert.equal(quantitesDe(ligne(buildCourseList(), "sucre-t").sources[0]), "200 g");
  });
});

test("le placard : les cid du fond de placard sont marqués, et ne comptent pas dans ce qu'il reste à acheter", () => {
  remettreAZero();
  state.menu = [entree("focaccia-romarin")];
  const liste = buildCourseList();
  assert.equal(ligne(liste, "sel-fin").placard, true);
  assert.equal(ligne(liste, "huile-olive").placard, true);
  assert.equal(ligne(liste, "farine-pain").placard, false);   // la farine du pain n'est pas celle du placard
  assert.equal(ligne(liste, "romarin").placard, false);
  const aAcheter = liste.filter(i => !i.placard).length;
  assert.equal(courseTodo(), aAcheter);
  state.checked = { "sel-fin": true };
  assert.equal(courseTodo(), aAcheter);
  state.checked = { "sel-fin": true, romarin: true };
  assert.equal(courseTodo(), aAcheter - 1);
});

test("les coches d'articles sortis de la liste sont élaguées, celles des articles libres restent", () => {
  remettreAZero();
  state.menu = [entree("quiche-lorraine")];
  state.extras = [{ id: "e1", name: "Éponges" }];
  state.checked = { lardons: true, "farine": true, "x-e1": true, "x-parti": true };
  elaguerCoches();
  assert.deepEqual(state.checked, { lardons: true, "x-e1": true });
  state.menu = [];
  elaguerCoches();
  assert.deepEqual(state.checked, { "x-e1": true });
});

test("l'élagage ne boucle pas, même abonné à la sauvegarde", async () => {
  remettreAZero();
  const { surSauvegarde } = await import("../../js/core/etat.js");
  let appels = 0;
  surSauvegarde(() => { appels++; elaguerCoches(); });
  state.checked = { perime: true };
  elaguerCoches();
  assert.deepEqual(state.checked, {});
  assert.ok(appels >= 1 && appels <= 2, `${appels} sauvegardes`);
});

test("ordre des rayons : celui des données par défaut, « Autre » en dernier", () => {
  delete state.ordreRayons;
  assert.deepEqual(rayonsOrdonnes(), RAYONS);
  state.ordreRayons = ["Autre", "Fromages", "Boissons"];
  const ordre = rayonsOrdonnes();
  assert.equal(ordre.at(-1), "Autre");
  assert.equal(new Set(ordre).size, RAYONS.length);
  assert.ok(ordre.indexOf("Fromages") < ordre.indexOf("Boissons"));
  delete state.ordreRayons;
});

test("ordre des rayons : un rayon absent de l'ordre enregistré suit son prédécesseur d'origine", () => {
  state.ordreRayons = ["Boissons", "Crèmerie & œufs", "Autre"];
  const ordre = rayonsOrdonnes();
  assert.equal(ordre.indexOf("Fromages"), ordre.indexOf("Crèmerie & œufs") + 1);
  assert.equal(ordre.indexOf("Fruits & légumes"), 0);
  assert.equal(ordre.at(-1), "Autre");
  delete state.ordreRayons;
});

test("ordre des rayons : un nom inconnu ou en double dans l'ordre enregistré est ignoré", () => {
  state.ordreRayons = ["Rayon disparu", "Fromages", "Fromages"];
  const ordre = rayonsOrdonnes();
  assert.equal(ordre.filter(r => r === "Fromages").length, 1);
  assert.ok(!ordre.includes("Rayon disparu"));
  delete state.ordreRayons;
});

test("déplacer un rayon : il passe devant son voisin visible, les autres gardent leur place", () => {
  delete state.ordreRayons;
  const visibles = ["Boucherie & charcuterie", "Fromages", "Épices & assaisonnements"];
  assert.equal(deplacerRayon("Fromages", -1, visibles), true);
  const ordre = rayonsOrdonnes();
  assert.ok(ordre.indexOf("Fromages") < ordre.indexOf("Boucherie & charcuterie"));
  assert.equal(deplacerRayon("Fromages", -1, visibles), false);   // déjà en tête des visibles
  assert.equal(deplacerRayon("Boucherie & charcuterie", 1, visibles), true);
  assert.ok(rayonsOrdonnes().indexOf("Boucherie & charcuterie") > rayonsOrdonnes().indexOf("Fromages"));
  assert.equal(rayonsOrdonnes().at(-1), "Autre");
  delete state.ordreRayons;
});

test("les unités de compte prennent leur pluriel", () => {
  for (const [u, p] of [["tranche", "tranches"], ["brin", "brins"], ["poignée", "poignées"], ["bouteille", "bouteilles"], ["paquet", "paquets"], ["tube", "tubes"], ["flacon", "flacons"]]) {
    assert.equal(fmtUnit(u, 8), p);
    assert.equal(fmtUnit(u, 1), u);
  }
});
