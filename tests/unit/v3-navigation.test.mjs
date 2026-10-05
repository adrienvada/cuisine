/* Lot « navigation » de la vague 3 : le sens d'une navigation (pur), la feuille de style des mouvements (jetons, durées, mouvement réduit) et ce qui reste hors du chemin de l'accueil. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { genreDe, recetteDe, typeDe } from "../../js/core/sens.js";
import { grapheStatique } from "../../tools/graphe-modules.mjs";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const lire = f => readFileSync(path.join(racine, f), "utf8");
const sansCommentaires = s => s.replace(/\/\*[\s\S]*?\*\//g, "");

/* ---------- Le sens ---------- */

test("sens : une adresse est un onglet, un détail ou le mode cuisine", () => {
  for (const h of ["", "#/", "#/menu", "#/courses", "#/fondamentaux"]) assert.equal(genreDe(h), "onglet", h);
  for (const h of ["#/recette/quiche-lorraine", "#/recette/quiche-lorraine/m/k1", "#/fondamental/pate"]) assert.equal(genreDe(h), "detail", h);
  for (const h of ["#/recette/quiche-lorraine/cuisine/2", "#/recette/quiche-lorraine/m/k1/cuisine/0"]) assert.equal(genreDe(h), "cuisine", h);
});

test("sens : la recette d'une fiche, avec ou sans entrée de menu ; rien pour le reste", () => {
  assert.equal(recetteDe("#/recette/quiche-lorraine"), "quiche-lorraine");
  assert.equal(recetteDe("#/recette/quiche-lorraine/m/k1"), "quiche-lorraine");
  assert.equal(recetteDe("#/recette/quiche-lorraine/cuisine/1"), null);
  assert.equal(recetteDe("#/fondamental/pate"), null);
  assert.equal(recetteDe("#/menu"), null);
  assert.equal(recetteDe(null), null);
});

test("sens : descendre est « avant », remonter « arriere », changer d'onglet « onglet »", () => {
  assert.equal(typeDe("#/", "#/recette/x", true), "avant");
  assert.equal(typeDe("#/menu", "#/recette/x/m/k", true), "avant");
  assert.equal(typeDe("#/fondamentaux", "#/fondamental/pate", true), "avant");
  assert.equal(typeDe("#/recette/x", "#/", false), "arriere");
  assert.equal(typeDe("#/fondamental/pate", "#/fondamentaux", false), "arriere");
  assert.equal(typeDe("#/", "#/menu", true), "onglet");
  assert.equal(typeDe("#/courses", "#/", false), "onglet");
});

test("sens : d'un détail à un autre, une entrée neuve descend et une entrée déjà vue revient", () => {
  assert.equal(typeDe("#/recette/x", "#/fondamental/pate", true), "avant");
  assert.equal(typeDe("#/recette/x", "#/fondamental/pate", false), "arriere");
});

test("sens : le mode cuisine a son cercle à l'entrée et à la sortie, jamais d'une étape à l'autre", () => {
  assert.equal(typeDe("#/recette/x", "#/recette/x/cuisine/0", true), "cuisine");
  assert.equal(typeDe("#/", "#/recette/x/cuisine/0", true), "cuisine");
  assert.equal(typeDe("#/recette/x/cuisine/3", "#/recette/x", false), "cuisine-sortie");
  assert.equal(typeDe("#/recette/x/cuisine/3", "#/menu", true), "cuisine-sortie");
  assert.equal(typeDe("#/recette/x/cuisine/1", "#/recette/x/cuisine/2", true), null);
});

test("sens : ni première vue ni même adresse n'ont de transition", () => {
  assert.equal(typeDe(null, "#/", true), null);
  assert.equal(typeDe("", "#/", true), null);
  assert.equal(typeDe("#/menu", "#/menu", false), null);
});

/* ---------- La feuille de style ---------- */

const css = sansCommentaires(lire("css/navigation.css"));
const base = sansCommentaires(lire("css/base.css"));

test("navigation.css : toute animation citée a ses images clés, et toute image clé sert", () => {
  const definies = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]);
  const lues = new Set([...css.matchAll(/animation(?:-name)?:\s*([a-z][\w-]*)/g)].map(m => m[1]));
  const baseDefinies = [...base.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]);
  for (const nom of lues) if (nom !== "none") assert.ok(definies.includes(nom) || baseDefinies.includes(nom), `${nom} : images clés absentes`);
  for (const nom of definies) assert.ok(lues.has(nom), `@keyframes ${nom} : jamais utilisée`);
});

test("navigation.css : les transitions de vue durent moins de 300 ms (onglet : 200 ms), par jetons", () => {
  const jetons = { "--d-appui": 90, "--d-courte": 160, "--d-moyenne": 260, "--d-longue": 420 };
  // Les animations des types « avant », « arriere » et « onglet » et celle de la photo partagée.
  const blocs = [...css.matchAll(/html\[data-vt="(avant|arriere|onglet)"\]::view-transition-(?:old|new)\(root\)\s*\{([^}]*)\}/g)];
  assert.ok(blocs.length >= 3);
  for (const [, type, corps] of blocs) {
    const duree = /animation(?:-duration)?:\s*(?:[\w-]+\s+)?(calc\(var\((--d-[a-z]+)\)\s*\*\s*([\d.]+)\)|var\((--d-[a-z]+)\)|(\d+)ms)/.exec(corps);
    assert.ok(duree, `${type} : durée introuvable dans ${corps}`);
    const ms = duree[2] ? jetons[duree[2]] * parseFloat(duree[3]) : duree[4] ? jetons[duree[4]] : parseInt(duree[5], 10);
    assert.ok(ms <= (type === "onglet" ? 200 : 300), `${type} : ${ms} ms`);
  }
  assert.match(css, /::view-transition-group\(photo-vt\)\s*\{[^}]*animation-duration:\s*var\(--d-moyenne\)/);
});

test("navigation.css : seul le routeur nomme les photos ; la feuille ne nomme que ce qui est fixe à l'écran, le temps d'une transition", () => {
  assert.doesNotMatch(css, /data-vt-photo[^{]*\{[^}]*view-transition-name/);
  for (const m of css.matchAll(/([^{}]*)\{[^{}]*view-transition-name:\s*([\w-]+)/g)) {
    assert.match(m[1], /data-vt=/, `${m[2]} : nommé hors d'une transition`);
    assert.ok(["barre-onglets", "message-toast", "plateau-minuteurs"].includes(m[2]), m[2]);
  }
  const noms = [...css.matchAll(/view-transition-name:\s*([\w-]+)/g)].map(m => m[1]);
  assert.equal(new Set(noms).size, noms.length, "deux éléments partageraient un nom");
});

test("navigation.css : les types ne touchent pas au cercle du mode cuisine (cuisine.css)", () => {
  assert.doesNotMatch(css, /data-vt="cuisine/);
  assert.match(sansCommentaires(lire("css/cuisine.css")), /html\[data-vt="cuisine"\]::view-transition-new\(root\)/);
});

test("navigation.css : toute variable citée est définie (base.css, ou minuteurs.css pour --plateau-h)", () => {
  const definis = new Set([...(base + sansCommentaires(lire("css/minuteurs.css"))).matchAll(/(--[a-z][\w-]*)\s*:/g)].map(m => m[1]));
  for (const m of css.matchAll(/var\((--[a-z][\w-]*)/g)) assert.ok(definis.has(m[1]), `${m[1]} : variable introuvable`);
});

test("base.css : la barre d'onglets est un papier calque avec repli opaque, sans couleur codée en dur pour le sombre", () => {
  const barre = /\.tabbar\s*\{[^}]*\}/.exec(base)[0];
  assert.match(barre, /background:\s*var\(--card\)/);
  assert.doesNotMatch(base, /html\[data-theme="dark"\] \.tabbar/);
  assert.match(base, /@supports[^{]*backdrop-filter[^{]*color-mix[^{]*\{\s*\.tabbar\s*\{[^}]*color-mix\(in srgb, var\(--card\)/);
});

test("base.css : le fond des feuilles est un calque dont l'opacité suit le doigt, et la poignée se voit", () => {
  assert.match(base, /\.sheet-backdrop::before\s*\{[^}]*opacity:\s*calc\(1 - var\(--glisse, 0\)\)/);
  const poignee = /\.sheet-grip\s*\{[^}]*\}/.exec(base)[0];
  assert.doesNotMatch(poignee, /var\(--line\)/, "la poignée sur --line ne se voit pas");
  assert.match(poignee, /touch-action:\s*none/);
});

test("base.css : le toast arrive à ressort et repart plus vite qu'il n'arrive", () => {
  assert.match(base, /\.toast\.visible\s*\{[^}]*translate var\(--ressort-duree\) var\(--ressort\)/);
  const repart = /\.toast\s*\{[^}]*transition:\s*opacity (\d+)ms/.exec(base);
  assert.ok(repart && Number(repart[1]) <= 160);
});

/* ---------- Hors du chemin de l'accueil ---------- */

test("le chemin de l'accueil n'emporte ni les transitions, ni le mouvement des messages, ni le geste des feuilles", () => {
  const graphe = grapheStatique(racine, "js/main.js");
  for (const m of ["js/ui/transitions.js", "js/ui/toast-mouvement.js", "js/ui/feuilles-geste.js", "js/core/sens.js", "js/ui/mouvement.js", "js/ui/geste.js"]) {
    assert.ok(!graphe.includes(m), `${m} ne doit pas être importé statiquement`);
  }
  assert.doesNotMatch(lire("index.html"), /navigation\.css"[^>]*>(?![\s\S]*<\/noscript>)/, "navigation.css n'est dans la page que pour le repli sans JavaScript");
});

test("le routeur, les messages et les feuilles chargent leur mouvement par import(), jamais en tête de module", () => {
  for (const [f, cible] of [["js/ui/routeur.js", "transitions"], ["js/ui/toast.js", "toast-mouvement"], ["js/ui/feuilles.js", "feuilles-geste"]]) {
    const src = sansCommentaires(lire(f));
    assert.match(src, new RegExp(`import\\("\\./${cible}\\.js"\\)`), f);
    assert.doesNotMatch(src, new RegExp(`^import[^\\n]*${cible}`, "m"), f);
  }
});

test("le routeur garde son contrat : preparerTransition, premier affichage sans transition, redessin sur place sans transition", () => {
  const src = sansCommentaires(lire("js/ui/routeur.js"));
  assert.match(src, /export function preparerTransition\(/);
  assert.match(src, /garderDefilement \|\| premierAffichage \|\| !T \? null/);
  assert.match(src, /classList\.toggle\("premier-affichage"/);
  assert.match(src, /feuillesDes\(noms\)/);
});

test("la barre d'onglets porte sa pastille, décor caché des lecteurs d'écran", () => {
  assert.match(lire("index.html"), /<nav class="tabbar"[^>]*>\s*(?:<!--[\s\S]*?-->\s*)?<span class="tab-pill" aria-hidden="true"><\/span>/);
});

test("les feuilles ouvertes en sortie ne comptent plus comme ouvertes (feuilleOuverte), et quittent l'arbre d'accessibilité dès le début", () => {
  const src = sansCommentaires(lire("js/ui/feuilles.js"));
  assert.match(src, /\.sheet-backdrop:not\(\.sort\)/);
  const retirer = /function retirer\([\s\S]*?\n}\n/.exec(src)[0];
  assert.ok(retirer.indexOf("f.inert = true") < retirer.indexOf("animationend"), "inert avant la sortie");
  assert.ok(retirer.indexOf("_auRetrait") < retirer.indexOf("animationend"), "le retrait n'attend pas la fin du mouvement");
  assert.ok(retirer.indexOf("avant.focus") < retirer.indexOf("animationend"), "le focus n'attend pas la fin du mouvement");
});
