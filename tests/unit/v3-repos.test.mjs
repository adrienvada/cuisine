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
    // Le vérificateur lit aussi la feuille des figures des savoirs (classes écrites par les données).
    cpSync(path.join(racine, "css/figures.css"), path.join(dossier, "css/figures.css"));
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
  // L'oignon qui trempe court pendant le reste : seul l'assemblage retient la salade (repos-2).
  assert.deepEqual(reposDe(recette("salade-mediterraneenne")), [15]);
  assert.deepEqual(reposDe(recette("mi-cuit-chocolat-suzy-palatin")), [10]);
  // Les verres givrent pendant la préparation : aucun repos qui bloque (repos-2).
  assert.deepEqual(reposDe(recette("cocktail-concombre-menthe")), []);
  // Les beignets : seul le fromage au frais retient le plat ; la sauce attend en parallèle, avec son minuteur (repos-2).
  assert.deepEqual(reposDe(recette("beignets-brebis-menthe")), [30]);
  // Le feu, la friture et le four ne reposent pas.
  for (const id of ["salade-lentilles-feta", "salade-champetre", "scoopable-cookies", "cake-sale", "veloute-butternut-shiitakes"]) {
    const r = recette(id);
    for (const s of r.steps) if (s.four || (s.timer && /cuire|cuisson|bouillante|mijoter/.test(s.txt || ""))) assert.ok(!s.repos, `${id} : ${s.t}`);
  }
  for (const r of RECIPES) for (const s of r.steps) if (s.four) assert.ok(!s.repos, `${r.id} : ${s.t}`);
});

/* ---------- Le calcul : des repos qui ont leur place dans la frise ---------- */

const JOUR = "2030-06-15";
const TABLE = minutesMurales(JOUR, 20 * 60);
const vide = () => {
  Object.assign(state, { menu: [], checked: {}, extras: [], portions: {}, choices: {}, addons: {}, hintCoursesOff: false });
  delete state.repas;
  delete state.historique;
};
const ajouter = (rid, { k = rid, choices = {}, addons = [] } = {}) => state.menu.push({ k, rid, choices, addons, portions: null });
const plan = (table = TABLE) => planifier({ table, taches: menu.tachesDuMenu() });
const reposDeLaFrise = p => p.evenements.filter(e => e.type === "repos");
const heure = n => planning.heureFr(n);

test("tachesDuMenu : chaque étape dit son genre, options et suppléments compris", () => {
  vide();
  ajouter("focaccia-romarin");
  assert.deepEqual(menu.tachesDuMenu()[0].etapes.map(e => e.genre), ["repos", "repos", "repos", "travail", "four"]);
  assert.equal(menu.tachesDuMenu()[0].etapes[0].libelle, "Levée");
  assert.equal(menu.tachesDuMenu()[0].etapes[4].libelle, "");

  // L'option « pâte maison » dit adds: "repos" et un libellé qui est le sien.
  vide();
  ajouter("quiche-lorraine", { choices: { pate: "maison" } });
  const quiche = menu.tachesDuMenu()[0].etapes;
  assert.equal(quiche[0].genre, "repos");
  assert.equal(quiche[0].libelle, "Pâte au frais");
  assert.deepEqual(quiche.slice(1).map(e => e.genre), ["four", "travail", "travail", "four"]);
  // Sans l'option, la pâte du commerce ne repose pas.
  vide();
  ajouter("quiche-lorraine");
  assert.ok(menu.tachesDuMenu()[0].etapes.every(e => e.genre !== "repos"));
});

test("tachesDuMenu : un supplément minuté a sa propre étape, repos (l'oignon qui trempe) ou travail (les graines qu'on dore)", () => {
  vide();
  ajouter("salade-lentilles-feta", { addons: ["oignon-rouge"] });
  const etapes = menu.tachesDuMenu()[0].etapes;
  // L'oignon trempe pendant que les lentilles cuisent : une attente « pendant »
  // portée par l'étape qu'il enrichit, pas une étape de plus (repos-2).
  assert.equal(etapes.find(e => e.titre === "Oignon rouge"), undefined);
  assert.deepEqual(etapes[1].attentes, [{ duree: 10, libelle: "Oignon dans l'eau glacée" }]);
  assert.equal(etapes[1].duree, 0);

  vide();
  ajouter("houmous-petits-pois-menthe", { addons: ["sesame"] });
  const sesame = menu.tachesDuMenu()[0].etapes.find(e => e.duree === 2);
  assert.equal(sesame.genre, "travail");
  assert.equal(sesame.libelle, "");
  // Le temps de la recette ne change pas : seule la répartition par étape.
  assert.equal(menu.tachesDuMenu()[0].etapes.reduce((n, e) => n + e.duree, 0), 3 + 2);
});

test("focaccia : une seule levée de 2 h 50, du départ au quart d'heure de l'étape suivante", () => {
  vide();
  ajouter("focaccia-romarin");
  const p = plan();
  const [levee, ...autres] = reposDeLaFrise(p);
  assert.equal(autres.length, 0, "les trois attentes qui se suivent ne font qu'un repos");
  assert.equal(levee.t, TABLE - 210);
  assert.equal(levee.duree, 170);
  assert.equal(levee.fin, TABLE - 40);
  assert.equal(levee.libelle, "Levée");
  assert.equal(texteEvenement(levee), "Repos : Focaccia");
  assert.deepEqual(detailRepos(levee), ["Levée : 2 h 50, jusqu'à 19 h 20", "Temps libre : tu peux t'absenter."]);
  // Les étapes du plan portent leur genre, et les mains sont libres pendant la levée comme au four.
  const etapes = p.recettes[0].etapes;
  assert.deepEqual(etapes.map(e => e.genre), ["repos", "repos", "repos", "travail", "four"]);
  assert.deepEqual(etapes.map(e => e.libre), [true, true, true, false, true]);
});

test("quiche à la pâte maison : le repos de la pâte ouvre la recette ; au commerce, aucun", () => {
  vide();
  ajouter("quiche-lorraine", { choices: { pate: "maison" } });
  const p = plan();
  const [pate] = reposDeLaFrise(p);
  assert.equal(reposDeLaFrise(p).length, 1);
  assert.equal(pate.t, p.recettes[0].debut);
  assert.equal(pate.duree, 30);
  assert.equal(pate.libelle, "Pâte au frais");
  assert.equal(p.recettes[0].duree, 15 + 52 + 30);
  vide();
  ajouter("quiche-lorraine");
  assert.equal(reposDeLaFrise(plan()).length, 0);
});

test("gravlax : la marinade de 12 h commence la veille, et la frise le sait", () => {
  vide();
  ajouter("gravlax-saumon-yaourt-bulgare");
  const midi = minutesMurales(JOUR, 12 * 60);
  const p = plan(midi);
  const [marinade, congelo] = reposDeLaFrise(p);
  assert.equal(p.recettes[0].duree, 30 + 735 + 2);
  assert.equal(marinade.duree, 720);
  assert.equal(marinade.jour, -1);
  assert.equal(marinade.jourFin, 0);
  assert.equal(heure(marinade.t), "23 h 20");
  assert.equal(heure(marinade.fin), "11 h 20");
  assert.deepEqual(detailRepos(marinade), ["Marinade : 12 h, jusqu'à 11 h 20, le lendemain", "Temps libre : tu peux t'absenter."]);
  assert.equal(congelo.libelle, "Au congélateur");
  assert.equal(congelo.duree, 15);
  assert.equal(congelo.jour, 0);
  // Tout ce qui précède le jour J le dit : le départ aussi.
  assert.deepEqual(p.evenements.map(e => e.jour), [-1, -1, 0, 0]);
  assert.equal(planning.jourRelatif(-1), "la veille");
  assert.equal(planning.jourRelatif(-2), "l'avant-veille");
  assert.equal(planning.jourRelatif(-4), "4 jours avant");
  assert.equal(planning.jourRelatif(0), "");
});

test("salade méditerranéenne : le repos de l'assemblage bloque, le trempage de l'oignon court pendant (repos-2)", () => {
  vide();
  ajouter("salade-mediterraneenne");
  const p = plan();
  const [assemblage] = reposDeLaFrise(p);
  assert.equal(reposDeLaFrise(p).length, 1);
  assert.deepEqual([assemblage.duree, assemblage.libelle], [15, "Repos"]);
  assert.equal(assemblage.fin, TABLE);
  // Un libellé qui ne dit que « Repos » ne se répète pas dans le détail.
  assert.equal(detailRepos(assemblage)[0], "15 min, jusqu'à 20 h");
  // Un quart d'heure : on peut s'absenter.
  assert.equal(detailRepos(assemblage)[1], "Temps libre : tu peux t'absenter.");
  // Le trempage est une ligne à part, qui ne libère rien.
  const [trempage] = p.evenements.filter(e => e.type === "pendant");
  assert.deepEqual([trempage.duree, trempage.libelle], [10, "Oignon dans l'eau glacée"]);
});

test("mi-cuit : le refroidissement avant démoulage vient après le four, pas dedans", () => {
  vide();
  ajouter("mi-cuit-chocolat-suzy-palatin");
  const p = plan();
  const [froid] = reposDeLaFrise(p);
  assert.deepEqual([froid.duree, froid.libelle], [10, "Refroidissement"]);
  assert.equal(froid.t, p.recettes[0].four.sortie, "il commence à la sortie du four");
  assert.equal(froid.fin, TABLE);
  // Le four garde sa plage : le repos ne la rallonge pas.
  assert.equal(p.recettes[0].four.sortie, TABLE - 10);
  assert.ok(p.recettes[0].etapes.at(-1).libre);
});

test("un menu où un repos croise un autre plat : celui qui démarre pendant la marinade le sait", () => {
  vide();
  ajouter("gravlax-saumon-yaourt-bulgare");
  ajouter("salade-mediterraneenne");
  ajouter("mi-cuit-chocolat-suzy-palatin");
  const p = plan();
  const debut = k => p.evenements.find(e => e.type === "debut" && e.k === k);
  assert.ok(debut("mi-cuit-chocolat-suzy-palatin").parallele.some(t => t.startsWith("Gravlax")));
  // Les repos des trois plats se croisent à la frise, chacun avec sa recette.
  const repos = reposDeLaFrise(p);
  assert.deepEqual(repos.map(e => e.k).sort(), [
    "gravlax-saumon-yaourt-bulgare", "gravlax-saumon-yaourt-bulgare",
    "mi-cuit-chocolat-suzy-palatin", "salade-mediterraneenne"
  ]);
  // Dans l'ordre du temps, et un repos qui commence en même temps qu'un départ passe après lui.
  assert.deepEqual(p.evenements.map(e => e.t), [...p.evenements.map(e => e.t)].sort((a, b) => a - b));
  const iDebut = p.evenements.findIndex(e => e.type === "debut" && e.k === "gravlax-saumon-yaourt-bulgare");
  assert.ok(p.evenements.findIndex(e => e.type === "repos" && e.k === "gravlax-saumon-yaourt-bulgare") > iDebut);
});

test("libre : la cuisson sur le feu d'un quart d'heure et plus libère les mains, pas un petit geste minuté", () => {
  vide();
  ajouter("salade-lentilles-feta");
  const [lentilles] = plan().recettes[0].etapes;
  assert.equal(lentilles.genre, "travail", "des lentilles qui mijotent ne sont pas un repos : on reste dans la cuisine");
  assert.equal(lentilles.libre, true);
  vide();
  ajouter("tagliatelles-carotte-carbonara");
  const lardons = plan().recettes[0].etapes.find(e => e.fin - e.debut === 5);
  assert.deepEqual([lardons.genre, lardons.libre], ["travail", false]);
});

test("un menu sans repos : aucun événement de repos, aucun jour de la veille", () => {
  vide();
  ajouter("dip-chevre-herbes");
  ajouter("scoopable-cookies");
  const p = plan();
  assert.equal(reposDeLaFrise(p).length, 0);
  assert.ok(p.evenements.every(e => e.jour === 0));
});

test("des tâches faites à la main, sans genre, ne produisent pas de repos (compatibilité)", () => {
  const p = planifier({ table: TABLE, taches: [{ k: "a", titre: "Pain", temps: { prep: 10, cuisson: 30 }, etapes: [{ titre: "Cuire", duree: 30, four: 200 }] }] });
  assert.equal(reposDeLaFrise(p).length, 0);
  assert.deepEqual(p.recettes[0].etapes.map(e => e.genre), ["four"]);
});

test("calendrier : les repos se lisent dans la description de la recette, sans événement de plus", () => {
  vide();
  ajouter("focaccia-romarin");
  const ics = icsRepas(plan(), { horodatage: "20300601T000000Z" }).replace(/\r\n /g, "");
  // Une recette, le préchauffage, la table : comme avant.
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, 3);
  assert.match(ics, /\(repos\\, jusqu.à 19\sh\s20\)/);
});

test("tempsLibre : la marinade qui passe la nuit est un temps libre ; un repos pendant qu'on travaille ailleurs n'en est pas un", () => {
  vide();
  ajouter("gravlax-saumon-yaourt-bulgare");
  const p = plan(minutesMurales(JOUR, 12 * 60));
  const marinade = reposDeLaFrise(p)[0];
  assert.equal(marinade.tempsLibre, true);
  assert.equal(p.evenements.at(-1).tempsLibre, false, "rien ne suit la table");
  // Le départ n'est pas libre : on prépare le saumon, pas encore de repos.
  assert.equal(p.evenements[0].type, "debut");
  assert.equal(p.evenements[0].tempsLibre, false);

  // Menu sans repos : jamais de temps libre dessiné.
  vide();
  ajouter("dip-chevre-herbes");
  assert.ok(plan().evenements.every(e => !e.tempsLibre));
});
