/* Vague 2, lot « culinaire-2 » : temps des options de choix, données de recettes à finir,
   allergène de la levure chimique. */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RECIPES } from "./donnees.mjs";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
globalThis.PLACARD = new Function(readFileSync(path.join(racine, "js/placard.js"), "utf8") + ";return PLACARD;")();
const { ALLERGENES } = new Function(readFileSync(path.join(racine, "js/allergenes.js"), "utf8") + ";return { ALLERGENES };")();

const { state } = await import("../../js/core/etat.js");
const { buildCourseList, quantitesDe } = await import("../../js/core/courses.js");
const { scaleQty, scaleText } = await import("../../js/core/format.js");
const { planifier, minutesMurales } = await import("../../js/core/planning.js");
const menu = await import("../../js/core/menu.js");
const { tempsDe, totalTime, totalTimeText, choiceList, effectiveSteps } = await import("../../js/core/recettes.js");

const recette = id => RECIPES.find(r => r.id === id);
const entree = (rid, { k = "t" + rid, choices = {}, addons = [], portions = null } = {}) => ({ k, rid, choices, addons, portions });
const ligne = (liste, cle) => liste.find(i => i.key === cle);
const vide = () => {
  Object.assign(state, { menu: [], checked: {}, extras: [], portions: {}, choices: {}, addons: {}, hintCoursesOff: false });
};

/* ---------- 1. Le temps d'une option de choix ---------- */

test("quiche : la pâte maison ajoute ses 30 min au frais au repos, la pâte du commerce non", () => {
  const q = recette("quiche-lorraine");
  const commerce = { choices: { pate: "industrielle" } }, maison = { choices: { pate: "maison" } };
  assert.deepEqual(tempsDe(q, commerce), { prep: 15, repos: 0, cuisson: 52 });
  assert.deepEqual(tempsDe(q, maison), { prep: 15, repos: 30, cuisson: 52 });
  assert.equal(totalTime(q, commerce), 67);
  assert.equal(totalTime(q, maison), 97);       // et non plus 72 : carte et frise disent 97
  assert.equal(totalTimeText(q, maison), "1 h 37");
});

test("quiche : sans composition, le temps est celui du choix par défaut", () => {
  vide();
  assert.equal(totalTime(recette("quiche-lorraine")), 67);
  state.choices["quiche-lorraine"] = { pate: "maison" };
  assert.equal(totalTime(recette("quiche-lorraine")), 97);
  vide();
});

test("tartines : le chèvre gratiné ajoute ses 6 min de four, le chèvre frais laisse « sans cuisson »", () => {
  const t = recette("tartines-figues-chevre-miel");
  assert.deepEqual(tempsDe(t, { choices: { chevre: "frais" } }), { prep: 15, repos: 0, cuisson: null });
  assert.deepEqual(tempsDe(t, { choices: { chevre: "chaud" } }), { prep: 15, repos: 0, cuisson: 6 });
  assert.equal(totalTime(t, { choices: { chevre: "chaud" } }), 21);
});

test("la frise additionne les mêmes minutes que la carte, pour chaque option de chaque recette", () => {
  vide();
  const TABLE = minutesMurales("2030-06-15", 20 * 60);
  for (const r of RECIPES) for (const c of choiceList(r)) for (const o of c.options) {
    const e = entree(r.id, { k: "x", choices: { [c.id]: o.id } });
    state.menu = [e];
    const frise = planifier({ table: TABLE, taches: menu.tachesDuMenu() }).recettes[0].duree;
    assert.equal(frise, totalTime(r, e), `${r.id} / ${o.id} : frise ${frise} min, carte ${totalTime(r, e)} min`);
  }
  vide();
});

test("le menu range les entrées selon leur durée composée : la quiche à la pâte maison passe avant l'autre", () => {
  vide();
  state.menu = [
    entree("quiche-lorraine", { k: "a", choices: { pate: "industrielle" } }),
    entree("quiche-lorraine", { k: "b", choices: { pate: "maison" } })
  ];
  assert.deepEqual(menu.menuEntrees().map(x => x.e.k), ["b", "a"]);
  vide();
});

test("un minuteur d'option qui s'ajoute au temps le dit par `adds`", () => {
  for (const r of RECIPES) for (const c of choiceList(r)) for (const o of c.options) {
    if (o.step.adds) {
      assert.ok(["prep", "repos", "cuisson"].includes(o.step.adds), `${r.id} / ${o.id}`);
      assert.ok(o.step.timer > 0, `${r.id} / ${o.id} : adds sans minuteur`);
    }
  }
});

test("le vérificateur refuse une option dont le minuteur dépasse le temps annoncé", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "verif-"));
  try {
    mkdirSync(path.join(tmp, "tools"));
    mkdirSync(path.join(tmp, "js"));
    mkdirSync(path.join(tmp, "js/core"));
    cpSync(path.join(racine, "js/core/format.js"), path.join(tmp, "js/core/format.js"));     // la table des singuliers de portions
    cpSync(path.join(racine, "tools/verifier-recettes.mjs"), path.join(tmp, "tools/verifier-recettes.mjs"));
    // Les figures : le vérificateur les dessine (ui/figures.js, qui lit core/html.js) et lit les classes de leur feuille de style.
    mkdirSync(path.join(tmp, "js/ui"));
    mkdirSync(path.join(tmp, "css"));
    cpSync(path.join(racine, "js/core/html.js"), path.join(tmp, "js/core/html.js"));
    cpSync(path.join(racine, "js/ui/figures.js"), path.join(tmp, "js/ui/figures.js"));
    cpSync(path.join(racine, "css/figures.css"), path.join(tmp, "css/figures.css"));
    for (const f of ["recipes", "placard", "fondamentaux", "figures", "allergenes", "saisons", "substitutions"]) {
      cpSync(path.join(racine, `js/${f}.js`), path.join(tmp, `js/${f}.js`));
    }
    writeFileSync(path.join(tmp, "package.json"), '{"type":"module"}');
    const recettes = path.join(tmp, "js/recipes.js");
    const source = readFileSync(recettes, "utf8");
    assert.ok(source.includes('timer: 30, adds: "repos",'));
    writeFileSync(recettes, source.replace('timer: 30, adds: "repos",', "timer: 30,"));
    const r = spawnSync("node", [path.join(tmp, "tools/verifier-recettes.mjs")], { encoding: "utf8" });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /quiche-lorraine.*maison.*minuteurs durent 87 min.*67 min/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

/* ---------- 2. Pois chiches ---------- */

test("pois chiches : la salade achète une boîte, le houmous une, les deux ensemble deux", () => {
  vide();
  state.menu = [entree("salade-mediterraneenne")];
  assert.equal(quantitesDe(ligne(buildCourseList(), "pois-chiches")), "1 boîte");
  state.menu = [entree("houmous-petits-pois-menthe")];
  assert.equal(quantitesDe(ligne(buildCourseList(), "pois-chiches")), "1 boîte");
  state.menu = [entree("salade-mediterraneenne"), entree("houmous-petits-pois-menthe")];
  assert.equal(quantitesDe(ligne(buildCourseList(), "pois-chiches")), "2 boîtes");
  vide();
});

test("pois chiches : la note de la salade dit « 1 boîte ou 1 bocal de 400 g » et suit les portions", () => {
  const ing = recette("salade-mediterraneenne").ingredients.find(i => i.cid === "pois-chiches");
  assert.equal(scaleText(ing.note, 1), "soit 1 boîte ou 1 bocal de 400 g, à rincer et égoutter");
  assert.equal(scaleText(ing.note, 2), "soit 2 boîtes ou 2 bocaux de 400 g, à rincer et égoutter");
  assert.equal(ing.shop.label, "Pois chiches au naturel");
  assert.equal(ing.shop.note, "boîte de 400 g : environ 240 g égouttés");
});

/* ---------- 3. Temps de four de la quiche et du cake ---------- */

test("quiche et cake : la cuisson annoncée est la durée réelle de four", () => {
  const four = r => r.steps.filter(s => s.four).reduce((n, s) => n + s.timer, 0);
  assert.equal(recette("quiche-lorraine").times.cuisson, 52);     // 20 min à blanc + 32 min (les lardons dorent pendant la précuisson)
  assert.equal(four(recette("quiche-lorraine")), 52);
  assert.equal(recette("cake-sale").times.cuisson, 45);
  assert.equal(four(recette("cake-sale")), 45);
});

/* ---------- 4. Figues ---------- */

test("tartines : une figue par tartine, comptée en entier et mise à l'échelle", () => {
  const f = recette("tartines-figues-chevre-miel").ingredients.find(i => i.cid === "figues");
  assert.equal(f.qty, 8);
  assert.equal(f.entier, true);
  assert.equal(scaleQty(f.qty, f.unit, 5 / 8, f.entier), 5);     // 5 tartines : 5 figues
  assert.equal(scaleQty(f.qty, f.unit, 3 / 8, f.entier), 3);
  vide();
  state.menu = [entree("tartines-figues-chevre-miel", { portions: 4 })];
  assert.equal(quantitesDe(ligne(buildCourseList(), "figues")), "4");
  vide();
});

/* ---------- 5. Beurre du moule du cake ---------- */

test("cake salé : le moule beurré a son beurre, au libellé de courses commun", () => {
  const cake = recette("cake-sale");
  const beurre = cake.ingredients.find(i => i.cid === "beurre");
  assert.ok(beurre, "le beurre du moule manque");
  assert.equal(beurre.shop.label, "Beurre doux");
  assert.ok(cake.steps.find(s => s.t === "Cuisson").ing.includes("beurre"));
  vide();
  state.menu = [entree("cake-sale"), entree("quiche-lorraine", { choices: { pate: "maison" } })];
  const b = ligne(buildCourseList(), "beurre");
  assert.equal(b.label, "Beurre doux");
  assert.equal(quantitesDe(b), "135 g");                         // 125 g de pâte + 10 g de moule
  vide();
});

/* ---------- 6 et 7. Textes ---------- */

test("salade champêtre : l'astuce miel-cidre ne se contredit plus", () => {
  const o = recette("salade-champetre").choices[0].options.find(x => x.id === "miel-cidre");
  assert.doesNotMatch(o.step.tip.txt, /réservez-la aux pommes de terre/);
  assert.match(o.step.tip.txt, /eau glacée/);
});

test("quiche, supplément comté : le texte ne dit plus « remplace » alors que la liste ajoute du comté", () => {
  const a = recette("quiche-lorraine").addons.find(x => x.id === "comte");
  assert.doesNotMatch(a.step.txt, /Remplacez tout ou partie/);
  assert.match(a.step.txt, /gruyère/);
  assert.equal(a.ingredients[0].qty, 50);
});

/* ---------- 8. Allergène ---------- */

test("la levure chimique contient du gluten (amidon de blé, selon la marque)", () => {
  assert.deepEqual(ALLERGENES["levure-chimique"], ["gluten"]);
});

/* ---------- Les étapes d'une version restent cohérentes avec le temps annoncé ---------- */

test("les étapes effectives d'une quiche maison gardent leur minuteur de repos", () => {
  const q = recette("quiche-lorraine");
  const etapes = effectiveSteps(q, { choices: { pate: "maison" }, addons: [] });
  assert.equal(etapes[0].timer, 30);
});
