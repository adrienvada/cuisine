/* Les attentes qui courent pendant qu'on travaille (`repos: "pendant"`) : données
   (js/recipes.js), règle du vérificateur (tools/verifier-recettes.mjs), calcul du
   rétroplanning (core/planning.js, tachesDuMenu de core/menu.js). */

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
const recettes = await import("../../js/core/recettes.js");
const { estRapide } = await import("../../js/core/recherche.js");
const { planifier, minutesMurales, texteEvenement, detailPendant, detailRepos, icsRepas, heureFr } = planning;

const RECIPES = new Function(readFileSync(path.join(racine, "js/recipes.js"), "utf8") + ";return RECIPES;")();
const recette = id => RECIPES.find(r => r.id === id);

/* ---------- Les données : qui bloque, qui court pendant ---------- */

/* Les attentes de la version par défaut, étape par étape. */
const defaut = r => r.steps.map(s => s.choice ? r.choices.find(c => c.id === s.choice).options[0].step : s);
const pendants = r => [
  ...defaut(r).filter(s => s.repos === "pendant"),
  ...(r.addons || []).filter(a => a.step?.repos === "pendant").map(a => a.step)
];

test("données : les seules attentes « pendant » sont celles où l'on fait la suite pendant ce temps", () => {
  const trouves = RECIPES.filter(r => pendants(r).length).map(r => r.id).sort();
  assert.deepEqual(trouves, [
    "beignets-brebis-menthe", "cocktail-concombre-menthe", "salade-lentilles-feta", "salade-mediterraneenne"
  ]);
  // Chacune garde son minuteur (le mode cuisine en a besoin) et son libellé.
  for (const r of RECIPES) for (const s of pendants(r)) {
    assert.ok(s.timer > 0, r.id);
    assert.ok(s.reposLabel, `${r.id} : une attente « pendant » se nomme dans la frise`);
    assert.ok(!s.four && !s.adds, r.id);
  }
});

test("données : les repos qui bloquent restent des repos (levée, marinade, pâte au frais, refroidissement…)", () => {
  const bloquants = r => defaut(r).filter(menu.estRepos).map(s => s.timer);
  assert.deepEqual(bloquants(recette("focaccia-romarin")), [120, 20, 30]);
  assert.deepEqual(bloquants(recette("gravlax-saumon-yaourt-bulgare")), [720, 15]);
  assert.deepEqual(bloquants(recette("mi-cuit-chocolat-suzy-palatin")), [10]);
  assert.deepEqual(bloquants(recette("torsades-pesto")), [10]);
  assert.deepEqual(bloquants(recette("salade-lentilles-feta")), [5]);
  assert.deepEqual(bloquants(recette("beignets-brebis-menthe")), [30]);
  // Une attente « pendant » n'est pas un repos qui bloque, et inversement.
  assert.ok(menu.estPendant({ repos: "pendant" }) && !menu.estRepos({ repos: "pendant" }));
  assert.ok(menu.estRepos({ repos: true }) && !menu.estPendant({ repos: true }));
  assert.ok(menu.estRepos({ adds: "repos" }) && !menu.estPendant({ adds: "repos" }));
});

test("données : les temps affichés sont ceux de la réalité (salade 30 min et Rapide, cocktail 15 min)", () => {
  const salade = recette("salade-mediterraneenne");
  assert.equal(recettes.totalTime(salade), 30);
  assert.ok(estRapide(salade), "de nouveau « Rapide »");
  assert.deepEqual(recettes.tempsDe(salade), { prep: 15, repos: 15, cuisson: null });

  const cocktail = recette("cocktail-concombre-menthe");
  assert.equal(recettes.totalTime(cocktail), 15, "le délai qui commande : les verres, 15 min");
  assert.equal(cocktail.times.repos, undefined);

  // Gravlax : 12 h de marinade + 15 min de congélateur + 30 min de préparation + 2 min.
  assert.equal(recettes.totalTime(recette("gravlax-saumon-yaourt-bulgare")), 30 + 735 + 2);
  assert.equal(recettes.totalTime(recette("mi-cuit-chocolat-suzy-palatin")), 15 + 10 + 30);
  assert.equal(recettes.totalTime(recette("salade-lentilles-feta")), 15 + 5 + 25);
});

test("données : les beignets ont retrouvé leur « 1 heure » et le minuteur de 60 min de la sauce", () => {
  const sauce = recette("beignets-brebis-menthe").steps[0];
  assert.match(sauce.txt, /Réservez au frais 1 heure — vous préparerez le reste pendant ce temps\./);
  assert.equal(sauce.timer, 60);
  assert.equal(sauce.repos, "pendant");
  // La carte ne change pas : seul le fromage au frais, 30 min, retient le plat.
  assert.equal(recettes.totalTime(recette("beignets-brebis-menthe")), 65);
});

test("données : un supplément « pendant » (l'oignon des lentilles) n'allonge pas la recette", () => {
  const lentilles = recette("salade-lentilles-feta");
  assert.equal(recettes.addonTime(lentilles), 0);
  assert.equal(recettes.totalTimeText(lentilles), recettes.totalTimeText({ ...lentilles, addons: [] }));
});

/* ---------- La règle du vérificateur ---------- */

function verifierAvec(abime) {
  const dossier = mkdtempSync(path.join(tmpdir(), "repos2-"));
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

test("vérificateur : les données du dépôt passent, attentes « pendant » comprises", () => {
  const r = spawnSync("node", ["tools/verifier-recettes.mjs"], { cwd: racine, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
});

test("vérificateur : une attente « pendant » comptée comme repos fausse la somme, et c'est dit", () => {
  const r = verifierAvec(src => src.replace('repos: "pendant",\n        reposLabel: "Oignon dans l\'eau glacée",', 'repos: true,\n        reposLabel: "Oignon dans l\'eau glacée",'));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /salade-mediterraneenne : les repos de la version par défaut durent 25 min, times\.repos en annonce 15/);
});

test("vérificateur : une attente « pendant » sans minuteur, avec four ou avec adds est refusée", () => {
  const sans = verifierAvec(src => src.replace('        timer: 60,\n        repos: "pendant",', '        timer: 0,\n        repos: "pendant",'));
  assert.match(sans.stderr, /beignets-brebis-menthe\[0\].*« pendant » sans minuteur/);
  const four = verifierAvec(src => src.replace('        timer: 60,\n        repos: "pendant",', '        timer: 60,\n        repos: "pendant",\n        four: 180,'));
  assert.match(four.stderr, /beignets-brebis-menthe\[0\].*ne porte pas four/);
  const adds = verifierAvec(src => src.replace('        timer: 60,\n        repos: "pendant",', '        timer: 60,\n        repos: "pendant",\n        adds: "repos",'));
  assert.match(adds.stderr, /beignets-brebis-menthe\[0\].*n'a pas de adds/);
});

test("vérificateur : une attente « pendant » qui dépasse la recette, ou qui n'a rien derrière elle, est refusée", () => {
  const trop = verifierAvec(src => src
    .replace("times: { prep: 15 },\n    portions: { base: 4, label: \"verres\" }", "times: { prep: 10 },\n    portions: { base: 4, label: \"verres\" }"));
  assert.equal(trop.status, 1);
  assert.match(trop.stderr, /cocktail-concombre-menthe\[0\].*dure 15 min, mais il ne reste que 10 min de recette/);

  // Plus tôt, c'est « en dernière étape » : rien à faire pendant ce temps, c'est un repos qui bloque.
  const derniere = verifierAvec(src => src.replace('        timer: 10,\n        repos: true,\n        tip: { t: "Astuce du chef", txt: "Chaque four', '        timer: 10,\n        repos: "pendant",\n        reposLabel: "Refroidissement",\n        tip: { t: "Astuce du chef", txt: "Chaque four'));
  assert.match(derniere.stderr, /mi-cuit-chocolat-suzy-palatin\[4\].*en dernière étape ne recouvre aucun travail/);
});

test("vérificateur : une valeur de repos inconnue est refusée", () => {
  const r = verifierAvec(src => src.replace('repos: "pendant",\n        reposLabel: "Sauce au frais",', 'repos: "parallèle",\n        reposLabel: "Sauce au frais",'));
  assert.match(r.stderr, /repos vaut true, "pendant" ou n'existe pas/);
});

/* ---------- Le calcul ---------- */

const JOUR = "2030-06-15";
const TABLE = minutesMurales(JOUR, 20 * 60);
const vide = () => {
  Object.assign(state, { menu: [], checked: {}, extras: [], portions: {}, choices: {}, addons: {}, hintCoursesOff: false });
  delete state.repas;
  delete state.historique;
};
const ajouter = (rid, { k = rid, choices = {}, addons = [] } = {}) => state.menu.push({ k, rid, choices, addons, portions: null });
const plan = (table = TABLE) => planifier({ table, taches: menu.tachesDuMenu() });
const evenements = (p, type) => p.evenements.filter(e => e.type === type);
const recetteDuPlan = (p, k) => p.recettes.find(r => r.k === k);

test("tachesDuMenu : une attente « pendant » se porte sur son étape, qui reste du travail", () => {
  vide();
  ajouter("salade-mediterraneenne");
  const etapes = menu.tachesDuMenu()[0].etapes;
  const oignon = etapes[1];
  assert.deepEqual([oignon.genre, oignon.duree], ["travail", 0]);
  assert.deepEqual(oignon.attentes, [{ duree: 10, libelle: "Oignon dans l'eau glacée" }]);
  // Le repos de l'assemblage, lui, bloque : une étape à part entière.
  assert.deepEqual([etapes.at(-1).genre, etapes.at(-1).duree, etapes.at(-1).libelle], ["repos", 15, "Repos"]);
  assert.equal(etapes.filter(e => e.attentes?.length).length, 1);
});

test("tachesDuMenu : l'oignon en supplément des lentilles court pendant, sans étape ni temps de plus", () => {
  vide();
  ajouter("salade-lentilles-feta", { addons: ["oignon-rouge"] });
  const [tache] = menu.tachesDuMenu();
  assert.equal(tache.supplement, 0);
  assert.deepEqual(tache.etapes[1].attentes, [{ duree: 10, libelle: "Oignon dans l'eau glacée" }]);
  assert.equal(tache.etapes.find(e => e.titre === "Oignon rouge"), undefined);
});

test("salade : l'oignon trempe 10 min pendant le reste, la recette dure 30 min, comme la carte", () => {
  vide();
  ajouter("salade-mediterraneenne");
  const p = plan();
  const r = recetteDuPlan(p, "salade-mediterraneenne");
  assert.equal(r.duree, 30);
  assert.equal(recettes.totalTime(recette("salade-mediterraneenne")), r.duree);
  assert.equal(r.debut, TABLE - 30);

  const [oignon] = evenements(p, "pendant");
  assert.equal(oignon.libelle, "Oignon dans l'eau glacée");
  assert.equal(oignon.duree, 10);
  assert.ok(oignon.t > r.debut && oignon.t < r.debut + 15, "il démarre à son étape, dans la préparation");
  assert.equal(oignon.fin, oignon.t + 10);
  // Le trempage est plus court que le travail qui le recouvre : rien ne s'allonge, et pas d'étape de plus.
  assert.ok(r.etapes.every(e => !e.queue));
  assert.equal(r.etapes.at(-1).fin, TABLE);

  // Il ne libère pas les mains : les étapes qu'il recouvre sont du travail, et son détail ne parle pas de temps libre.
  const recouvertes = r.etapes.filter(e => e.debut < oignon.fin && e.fin > oignon.t);
  assert.ok(recouvertes.length >= 1 && recouvertes.every(e => !e.libre && e.genre === "travail"));
  assert.equal(oignon.tempsLibre, false);
  assert.deepEqual(detailPendant(oignon), [`Salade méditerranéenne : 10 min, jusqu'à ${heureFr(oignon.fin)}`]);
  assert.doesNotMatch(detailPendant(oignon).join(" "), /Temps libre|Mains libres|Reprends/);
  assert.equal(texteEvenement(oignon), "Pendant ce temps : oignon dans l'eau glacée");

  // Un seul repos qui bloque : l'assemblage, de 15 min jusqu'à la table.
  const repos = evenements(p, "repos");
  assert.equal(repos.length, 1);
  assert.deepEqual([repos[0].duree, repos[0].fin], [15, TABLE]);
});

test("cocktail : les verres givrent pendant les 10 min de préparation, c'est 15 min qui commandent le service", () => {
  vide();
  ajouter("cocktail-concombre-menthe");
  const p = plan();
  const r = recetteDuPlan(p, "cocktail-concombre-menthe");
  assert.equal(r.duree, 15);
  assert.equal(r.debut, TABLE - 15);
  const [verres] = evenements(p, "pendant");
  assert.deepEqual([verres.t, verres.fin, verres.libelle], [r.debut, TABLE, "Verres au congélateur"]);
  // Les gestes de la préparation durent bien tout le délai : les mains travaillent pendant que les verres givrent.
  assert.ok(r.etapes.every(e => e.genre === "travail" && !e.libre));
  assert.equal(r.etapes.reduce((n, e) => n + (e.fin - e.debut), 0), 15);
  assert.equal(evenements(p, "repos").length, 0, "aucun « Repos », ni « Temps libre » pour les verres");
  assert.ok(p.evenements.every(e => !e.tempsLibre));
});

test("beignets : la sauce au frais 1 h court pendant le reste, le fromage 30 min bloque", () => {
  vide();
  ajouter("beignets-brebis-menthe");
  const p = plan();
  const r = recetteDuPlan(p, "beignets-brebis-menthe");
  assert.equal(r.duree, 65);
  const [sauce] = evenements(p, "pendant");
  assert.deepEqual([sauce.t, sauce.duree, sauce.libelle], [r.debut, 60, "Sauce au frais"]);
  assert.ok(sauce.fin <= TABLE, "la sauce est prête avant le service");
  // La recette n'attend la sauce qu'à la fin : le fromage au frais commence avant qu'elle soit prête.
  const [fromage] = evenements(p, "repos");
  assert.equal(fromage.libelle, "Repos au frais");
  assert.equal(fromage.duree, 30);
  assert.ok(fromage.t < sauce.fin && fromage.fin <= sauce.fin);
  // Le minuteur reste dans les données, pour le mode cuisine.
  assert.equal(recette("beignets-brebis-menthe").steps[0].timer, 60);
});

/* Une recette à la main : 20 min de gestes en deux étapes. */
const tache = (k, { attente, etapes, temps = { prep: 20 } } = {}) => ({
  k, titre: k, temps,
  etapes: etapes || [
    { titre: "Mariner", duree: 0, genre: "travail", attentes: attente ? [attente] : [] },
    { titre: "Garnir", duree: 0, genre: "travail" }
  ]
});

test("une attente « pendant » plus longue que le travail qu'elle recouvre allonge la recette du reste, mains libres", () => {
  const p = planifier({ table: TABLE, taches: [tache("plat", { attente: { duree: 60, libelle: "Marinade express" } })] });
  const r = p.recettes[0];
  assert.equal(r.duree, 60, "20 min de gestes, 60 min d'attente : la recette dure l'attente");
  assert.equal(r.debut, TABLE - 60);
  // Le reste de l'attente, une fois le travail fini, est une étape seule, mains libres.
  const queue = r.etapes.at(-1);
  assert.deepEqual([queue.queue, queue.genre, queue.libre, queue.fin - queue.debut], [true, "repos", true, 40]);
  assert.deepEqual(r.etapes.slice(0, -1).map(e => e.libre), [false, false]);
  assert.equal(r.etapes.slice(0, -1).reduce((n, e) => n + e.fin - e.debut, 0), 20);
  // Une seule ligne pour elle à la frise : « Pendant ce temps », pas « Repos » en plus.
  assert.equal(evenements(p, "pendant").length, 1);
  assert.equal(evenements(p, "repos").length, 0);
  assert.equal(evenements(p, "pendant")[0].fin, TABLE);
});

test("une attente « pendant » plus courte que le travail ne change pas la durée", () => {
  const p = planifier({ table: TABLE, taches: [tache("plat", { attente: { duree: 15, libelle: "Trempage" } })] });
  assert.equal(p.recettes[0].duree, 20);
  assert.ok(p.recettes[0].etapes.every(e => !e.queue));
});

test("un menu où une attente « pendant » croise un autre plat : elle ne libère pas les mains", () => {
  // Le premier plat attend 30 min en travaillant ; le second démarre pendant ce temps.
  const a = tache("long", { attente: { duree: 30, libelle: "Sauce au frais" }, temps: { prep: 30 } });
  const b = { k: "court", titre: "Court", temps: { prep: 10 }, etapes: [{ titre: "Faire", duree: 0, genre: "travail" }] };
  const p = planifier({ table: TABLE, taches: [a, b] });
  const debutB = p.evenements.find(e => e.type === "debut" && e.k === "court");
  const pendant = evenements(p, "pendant")[0];
  assert.ok(debutB.t >= pendant.t && debutB.t < pendant.fin, "le second plat démarre pendant l'attente");
  assert.deepEqual(debutB.parallele, [], "le premier plat travaille : il ne « patiente » pas");

  // Avec un vrai repos à la place, le même croisement dit « Pendant que long patiente ».
  const aRepos = { k: "long", titre: "Long", temps: { repos: 30 }, etapes: [{ titre: "Lever", duree: 30, genre: "repos", libelle: "Levée" }] };
  const q = planifier({ table: TABLE, taches: [aRepos, b] });
  assert.deepEqual(q.evenements.find(e => e.type === "debut" && e.k === "court").parallele, ["Long"]);
});

test("une attente « pendant » à côté d'un repos qui bloque : seul le repos libère", () => {
  vide();
  ajouter("salade-mediterraneenne");
  ajouter("cocktail-concombre-menthe");
  const p = plan();
  const salade = recetteDuPlan(p, "salade-mediterraneenne");
  const cocktail = recetteDuPlan(p, "cocktail-concombre-menthe");
  // Le cocktail démarre pendant le repos de la salade : mains libres chez elle, donc elle patiente.
  const debut = p.evenements.find(e => e.type === "debut" && e.k === "cocktail-concombre-menthe");
  assert.deepEqual(debut.parallele, [recette("salade-mediterraneenne").title]);
  // Les verres du cocktail ne libèrent rien : ses étapes sont du travail.
  assert.ok(cocktail.etapes.every(e => !e.libre));
  assert.ok(salade.etapes.at(-1).libre);
  // Le jour relatif des attentes est celui de la table.
  assert.ok(evenements(p, "pendant").every(e => e.jour === 0 && e.jourFin === 0));
});

test("l'ordre de la frise : le départ, puis l'attente qui y commence", () => {
  vide();
  ajouter("cocktail-concombre-menthe");
  const p = plan();
  assert.deepEqual(p.evenements.map(e => e.type), ["debut", "pendant", "table"]);
});

test("calendrier : l'attente « pendant » se lit dans la description, en parallèle, sans événement de plus", () => {
  vide();
  ajouter("cocktail-concombre-menthe");
  const ics = icsRepas(plan(), { horodatage: "20300601T000000Z" }).replace(/\r\n /g, "");
  // Une recette et la table : aucun événement pour les verres.
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, 2);
  assert.match(ics, /Verres au congélateur \(en parallèle\\, jusqu.à 20\sh\)/);
  // Le reste de l'attente d'une recette qui la dépasse n'est pas redit comme un repos.
  const long = planifier({ table: TABLE, taches: [tache("plat", { attente: { duree: 60, libelle: "Marinade express" } })] });
  const texte = icsRepas(long, { horodatage: "20300601T000000Z" }).replace(/\r\n /g, "");
  assert.doesNotMatch(texte, /\(repos\\,/);
});

test("compatibilité : des tâches sans attentes se calculent comme avant, sans événement « pendant »", () => {
  const p = planifier({ table: TABLE, taches: [{ k: "a", titre: "Pain", temps: { prep: 10, cuisson: 30 }, etapes: [{ titre: "Cuire", duree: 30, four: 200 }] }] });
  assert.equal(evenements(p, "pendant").length, 0);
  assert.deepEqual(p.recettes[0].attentes, []);
  assert.equal(p.recettes[0].duree, 40);
});

test("détail d'une attente qui finit un autre jour : on le dit", () => {
  const e = { type: "pendant", titre: "Gravlax", libelle: "Marinade", duree: 600, fin: TABLE + 60, t: TABLE - 540, jour: 0, jourFin: 1 };
  assert.match(detailPendant(e)[0], /10 h, jusqu'à 21 h, le lendemain$/);
  // Un repos garde ses deux lignes, dont « Temps libre » : la différence est dans la frise.
  assert.match(detailRepos({ ...e, type: "repos" })[1], /Temps libre/);
});
