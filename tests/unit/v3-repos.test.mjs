/* Les temps de repos : données (js/recipes.js), règle du vérificateur
   (tools/verifier-recettes.mjs), calcul du rétroplanning (core/planning.js,
   tachesDuMenu de core/menu.js). */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./donnees.mjs";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
Object.assign(globalThis, new Function(readFileSync(path.join(racine, "js/allergenes.js"), "utf8") + ";return { ALLERGENES_LISTE, ALLERGENES };")());

const { state } = await import("../../js/core/etat.js");
const menu = await import("../../js/core/menu.js");
const planning = await import("../../js/core/planning.js");
const { planifier, minutesMurales, texteEvenement, detailRepos, icsRepas } = planning;

const RECIPES = new Function(readFileSync(path.join(racine, "js/recipes.js"), "utf8") + ";return RECIPES;")();
const recette = id => RECIPES.find(r => r.id === id);

/* ---------- La règle du vérificateur ---------- */

/* Le vérificateur lit js/recipes.js à côté de lui : on le fait tourner sur une
   copie du dépôt dont on a abîmé une donnée, sans toucher à la vraie. */
function verifierAvec(abime) {
  const dossier = mkdtempSync(path.join(tmpdir(), "repos-"));
  try {
    cpSync(path.join(racine, "js"), path.join(dossier, "js"), { recursive: true });
    cpSync(path.join(racine, "tools"), path.join(dossier, "tools"), { recursive: true });
    cpSync(path.join(racine, "package.json"), path.join(dossier, "package.json"));
    const fichier = path.join(dossier, "js/recipes.js");
    const avant = readFileSync(fichier, "utf8");
    const apres = abime(avant);
    assert.notEqual(apres, avant, "la donnée n'a pas été abîmée : l'ancre du test a bougé");
    writeFileSync(fichier, apres);
    return spawnSync("node", ["tools/verifier-recettes.mjs"], { cwd: dossier, encoding: "utf8" });
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
}

test("vérificateur : un repos oublié sur la focaccia est attrapé des deux côtés", () => {
  const r = verifierAvec(src => src.replace("        timer: 120,\n        repos: true,\n", "        timer: 120,\n"));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /focaccia-romarin : les repos de la version par défaut durent 50 min, times\.repos en annonce 170/);
  assert.match(r.stderr, /focaccia-romarin\[0\].*parle d'attente/);
});

test("vérificateur : times.repos sans aucune étape de repos est une erreur", () => {
  const r = verifierAvec(src => src.replace("    times: { prep: 15, cuisson: 3 },\n    portions: { base: 6", "    times: { prep: 15, repos: 5, cuisson: 3 },\n    reposLabel: \"Repos\",\n    portions: { base: 6"));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /houmous-petits-pois-menthe : times\.repos annonce 5 min mais aucune étape n'est un repos/);
});

test("vérificateur : un repos qui porte four, ou sans minuteur, est refusé", () => {
  const four = verifierAvec(src => src.replace("        timer: 120,\n        repos: true,\n", "        timer: 120,\n        repos: true,\n        four: 200,\n"));
  assert.match(four.stderr, /focaccia-romarin\[0\] : un repos ne porte pas four/);
  const sans = verifierAvec(src => src.replace("        repos: true,\n        reposLabel: \"Au congélateur\",\n", "        repos: true,\n        reposLabel: \"Au congélateur\",\n        timer: 0,\n"));
  assert.equal(sans.status, 1);
});

test("vérificateur : la durée d'une marinade passée à times.repos doit suivre l'étape", () => {
  const r = verifierAvec(src => src.replace("repos: 735, cuisson: 2", "repos: 720, cuisson: 2"));
  assert.match(r.stderr, /gravlax-saumon-yaourt-bulgare : les repos de la version par défaut durent 735 min, times\.repos en annonce 720/);
});

test("vérificateur : une option qui repose sans adds ne se lit que comme version par défaut", () => {
  const r = verifierAvec(src => src.replace('timer: 30, adds: "repos", reposLabel: "Pâte au frais",', 'timer: 30, repos: true, reposLabel: "Pâte au frais",'));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /quiche-lorraine \/ maison : une option qui repose sans adds/);
});

test("vérificateur : un texte d'attente dont le minuteur n'est pas un repos est soupçonné", () => {
  const r = verifierAvec(src => src.replace("        timer: 10,\n        repos: true,\n        tip: { t: \"Astuce du chef\", txt: \"Chaque four", "        timer: 10,\n        tip: { t: \"Astuce du chef\", txt: \"Chaque four"));
  assert.match(r.stderr, /mi-cuit-chocolat-suzy-palatin\[4\].*parle d'attente \(« refroidir »\)/);
});

/* ---------- Les données : ce qui repose vraiment ---------- */

/* Les minuteurs de repos de la version par défaut, étape par étape. */
const reposDe = r => r.steps
  .map(s => s.choice ? r.choices.find(c => c.id === s.choice).options[0].step : s)
  .filter(s => s.repos === true || s.adds === "repos")
  .map(s => s.timer);

test("données : la somme des repos par défaut est times.repos, recette par recette", () => {
  for (const r of RECIPES) {
    assert.equal(reposDe(r).reduce((n, t) => n + t, 0), r.times.repos || 0, r.id);
  }
});

test("données : ce que le cuisinier tient pour un repos, et ce qu'il refuse d'y mettre", () => {
  assert.deepEqual(reposDe(recette("focaccia-romarin")), [120, 20, 30]);
  assert.deepEqual(reposDe(recette("gravlax-saumon-yaourt-bulgare")), [720, 15]);
  assert.deepEqual(reposDe(recette("salade-mediterraneenne")), [10, 15]);
  assert.deepEqual(reposDe(recette("mi-cuit-chocolat-suzy-palatin")), [10]);
  assert.deepEqual(reposDe(recette("cocktail-concombre-menthe")), [15]);
  // Les beignets : seul le fromage au frais retient le plat ; la sauce attend en parallèle, sans minuteur.
  assert.deepEqual(reposDe(recette("beignets-brebis-menthe")), [30]);
  // Le feu, la friture et le four ne reposent pas.
  for (const id of ["salade-lentilles-feta", "salade-champetre", "scoopable-cookies", "cake-sale", "veloute-butternut-shiitakes"]) {
    const r = recette(id);
    for (const s of r.steps) if (s.four || (s.timer && /cuire|cuisson|bouillante|mijoter/.test(s.txt || ""))) assert.ok(!s.repos, `${id} : ${s.t}`);
  }
  for (const r of RECIPES) for (const s of r.steps) if (s.four) assert.ok(!s.repos, `${r.id} : ${s.t}`);
});
