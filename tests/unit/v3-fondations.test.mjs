/* Lot « fondations » de la vague 3 : le ressort (pur), les jetons de mouvement partagés par le CSS et le JS, la source des ressorts de base.css. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COURBES, DUREES, PRESETS, REPLIS_RESSORT, ressort, resistance, vitesseDeGeste } from "../../js/core/ressort.js";
import { appliquer, blocRessorts } from "../../tools/ressorts-css.mjs";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const lire = f => readFileSync(path.join(racine, f), "utf8");
const depassement = pts => Math.max(0, Math.max(...pts) - 1);

test("ressort : chaque préréglage converge vers 1, part de 0 et finit exactement à 1", () => {
  for (const nom of Object.keys(PRESETS)) {
    const { points, duree } = ressort(nom);
    assert.equal(points[0], 0, nom);
    assert.equal(points.at(-1), 1, nom);
    assert.ok(Math.abs(points.at(-2) - 1) < 0.01, `${nom} : l'avant-dernier point est au repos`);
    assert.ok(duree >= 16 && duree <= 4000, `${nom} : durée ${duree}`);
  }
});

test("ressort : le dépassement est borné (doux ≤ 2 %, vif ≤ 5 %, rebond léger de 5 à 8 %)", () => {
  assert.ok(depassement(ressort("doux").points) <= 0.02);
  assert.ok(depassement(ressort("vif").points) <= 0.05);
  const rebond = depassement(ressort("rebond").points);
  assert.ok(rebond >= 0.05 && rebond <= 0.08, `rebond : ${rebond}`);
});

test("ressort : critique et sur-amorti ne dépassent jamais, sous-amorti oui", () => {
  assert.ok(depassement(ressort({ raideur: 100, amortissement: 20 }).points) < 0.0015, "critique (ζ = 1)");
  assert.ok(depassement(ressort({ raideur: 100, amortissement: 40 }).points) < 0.0015, "sur-amorti");
  assert.ok(depassement(ressort({ raideur: 100, amortissement: 3 }).points) > 0.3, "très sous-amorti");
});

test("ressort : la durée est bornée, même pour un ressort presque sans frottement", () => {
  assert.equal(ressort({ raideur: 100, amortissement: 0.1 }).duree, 4000);
  assert.ok(ressort({ raideur: 100, amortissement: 400 }).duree <= 4000);
});

test("ressort : une chaîne linear() valide, de 30 à 60 points, à 3 décimales, sans -0", () => {
  for (const nom of Object.keys(PRESETS)) {
    const { lineaire, points } = ressort(nom);
    assert.match(lineaire, /^linear\(-?\d+(\.\d{1,3})?(, -?\d+(\.\d{1,3})?)*\)$/);
    assert.ok(points.length >= 30 && points.length <= 60, `${nom} : ${points.length} points`);
    assert.equal(lineaire, `linear(${points.join(", ")})`);
    assert.doesNotMatch(lineaire, /-0[,)]/);
  }
});

test("ressort : la vitesse initiale compte (un lâcher rapide part plus vite, à contre-sens part en arrière)", () => {
  const lent = ressort("vif");
  const rapide = ressort({ ...PRESETS.vif, vitesse: 4 });
  const contre = ressort({ ...PRESETS.vif, vitesse: -3 });
  assert.ok(rapide.points[1] > lent.points[1] * 1.5);
  assert.ok(contre.points[1] < lent.points[1]);
  assert.ok(contre.points.some(p => p < 0), "part d'abord en sens inverse");
});

test("ressort : une masse plus grande ralentit ; des paramètres absurdes sont refusés", () => {
  assert.ok(ressort({ ...PRESETS.vif, masse: 4 }).points[2] < ressort("vif").points[2]);
  assert.throws(() => ressort({ raideur: 0, amortissement: 1 }), RangeError);
  assert.throws(() => ressort({ raideur: 10, amortissement: -1 }), RangeError);
});

test("resistance : nulle en 0, croissante, plafonnée par la portée", () => {
  assert.equal(resistance(0), 0);
  assert.equal(resistance(-20), 0);
  let avant = 0;
  for (const e of [10, 50, 100, 400, 2000, 100000]) {
    const r = resistance(e, 300);
    assert.ok(r > avant && r < 300 && r < e, `${e} → ${r}`);
    avant = r;
  }
});

test("vitesseDeGeste : estimée sur les 80 dernières ms, nulle si le doigt s'est arrêté", () => {
  const echantillons = [{ t: 0, x: 0, y: 0 }, { t: 100, x: 100, y: 0 }, { t: 140, x: 200, y: 4 }, { t: 180, x: 300, y: 8 }];
  const v = vitesseDeGeste(echantillons, 185);
  assert.ok(Math.abs(v.x - 2500) < 1, `vx ${v.x}`);       // 200 px sur 80 ms
  assert.ok(Math.abs(v.y - 100) < 1);
  assert.deepEqual(vitesseDeGeste(echantillons, 400), { x: 0, y: 0 });   // immobile depuis 220 ms
  assert.deepEqual(vitesseDeGeste([{ t: 0, x: 0, y: 0 }], 5), { x: 0, y: 0 });
  assert.deepEqual(vitesseDeGeste([], 5), { x: 0, y: 0 });
});

test("jetons : base.css dit la même chose que DUREES et COURBES de ressort.js", () => {
  const css = lire("css/base.css");
  for (const [nom, ms] of Object.entries(DUREES)) assert.match(css, new RegExp(`--d-${nom}: ${ms}ms;`), nom);
  for (const [nom, courbe] of Object.entries(COURBES)) assert.ok(css.includes(`--e-${nom}: ${courbe};`), nom);
});

test("ressorts : le bloc généré de base.css est celui que tools/ressorts-css.mjs écrirait (npm run ressorts)", () => {
  const css = lire("css/base.css");
  assert.equal(appliquer(css), css);
  assert.ok(css.includes(blocRessorts()));
});

test("ressorts : chaque jeton a son repli cubic-bezier, déclaré sans condition, avant la vraie courbe sous @supports", () => {
  const bloc = blocRessorts();
  for (const [nom, repli] of Object.entries(REPLIS_RESSORT)) assert.ok(bloc.includes(repli), nom);
  assert.ok(bloc.indexOf("cubic-bezier") < bloc.indexOf("@supports (transition-timing-function: linear(0, 1))"));
  assert.ok(bloc.indexOf("@supports") < bloc.indexOf("linear(0, "));
  assert.ok(bloc.includes(`--ressort-vif-duree: ${ressort("vif").duree}ms`));
});

test("mouvement réduit : un seul mécanisme (REDUCE_MOTION n'existe plus, mouvementReduit() sert partout)", () => {
  for (const f of ["js/main.js", "js/vues/accueil.js", "js/vues/cuisine.js", "js/vues/courses.js", "js/ui/theme.js"]) {
    assert.doesNotMatch(lire(f), /REDUCE_MOTION/, f);
  }
  assert.match(lire("js/ui/mouvement.js"), /export const mouvementReduit/);
});

test("css : le filet de mouvement réduit couvre les transitions de vue (une règle par pseudo-élément) et les utilitaires", () => {
  const css = lire("css/base.css");
  const filet = css.slice(css.indexOf("/* ---------- Mouvement réduit"));
  for (const p of ["group", "old", "new"]) assert.match(filet, new RegExp(`::view-transition-${p}\\(\\*\\) \\{ animation: none !important; \\}`));
  assert.doesNotMatch(filet, /::view-transition-\w+\(\*\),/, "pas de liste de sélecteurs : un navigateur sans ces pseudo-éléments la jetterait");
  assert.match(filet, /\.arrive \{ animation: none; \}/);
  assert.match(filet, /\.trace \[pathLength="1"\] \{ animation: none/);
});

test("css : les ombres d'élévation de 0 à 3 existent en clair et en sombre, sans noir pur", () => {
  const css = lire("css/base.css");
  for (let i = 0; i <= 3; i++) assert.equal([...css.matchAll(new RegExp(`--ombre-${i}:`, "g"))].length, 2, `--ombre-${i}`);
  assert.doesNotMatch(css.slice(0, css.indexOf("/* >>> ressorts")), /--ombre-\d: [^;]*rgb\(0 0 0/);
});

test("les modules du mouvement n'ont ni boucle requestAnimationFrame ni dépendance externe", () => {
  for (const f of ["js/ui/mouvement.js", "js/ui/geste.js", "js/ui/effets.js"]) {
    const src = lire(f);
    assert.doesNotMatch(src, /requestAnimationFrame\(/, f);
    assert.doesNotMatch(src, /from "(?!\.)/, f);
  }
});

test("README : la section « Mouvement » existe et la carte cite les modules du mouvement", () => {
  const readme = lire("README.md");
  assert.match(readme, /^## Mouvement$/m);
  for (const f of ["js/core/ressort.js", "js/ui/mouvement.js", "js/ui/geste.js", "js/ui/effets.js", "tools/ressorts-css.mjs"]) assert.ok(readme.includes(f), f);
});
