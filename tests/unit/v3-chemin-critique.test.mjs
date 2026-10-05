/* Chemin critique de l'accueil : ce que la page charge avant de dessiner ses cartes.
   Ces tests protègent les gains mesurés par tools/mesurer-accueil.mjs (README, « Performance ») :
   le graphe statique de js/main.js, les scripts classiques de index.html, les feuilles et les
   polices. Aucune durée : des listes et des octets. */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { grapheStatique } from "../../tools/graphe-modules.mjs";
import { BASE, POLICES, TEXTE_TITRE, caracteresDe, caracteresDuCarnet, jeuDe, plages } from "../../tools/polices.mjs";
import { BUDGET_OCTETS_KO } from "../../tools/mesurer-accueil.mjs";
import { feuillesDes, FEUILLES_DES_VUES } from "../../js/ui/styles.js";
import { scriptsDes } from "../../js/ui/scripts.js";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const lire = f => readFileSync(join(RACINE, f), "utf8");
const index = lire("index.html");
const graphe = grapheStatique(RACINE, "js/main.js");
const sansCommentaires = source => source.replace(/\/\*[\s\S]*?\*\//g, "");

/* ---------- Le graphe de modules ---------- */

test("le graphe statique de js/main.js n'emporte rien de ce que l'accueil n'utilise pas", () => {
  const horsChemin = [
    "js/ui/minuteurs.js", "js/ui/partage.js", "js/core/planning.js", "js/core/cuisine.js",
    "js/vues/reglages.js", "js/vues/courses.js", "js/vues/fiche.js", "js/vues/cuisine.js", "js/vues/menu.js",
    "js/vues/savoirs.js", "js/vues/journal.js", "js/sync.js", "js/ui/miseajour.js", "js/ui/qr.js", "js/ui/voix.js"
  ];
  const presents = horsChemin.filter(m => graphe.includes(m));
  assert.deepEqual(presents, [], "ces modules reviennent sur le chemin de l'accueil : voir README, « Performance »");
  for (const m of ["js/vues/accueil.js", "js/ui/routeur.js", "js/vues/reglages-entree.js", "js/ui/scripts.js"]) assert.ok(graphe.includes(m), m);
});

test("les modules reportés ne sont importés statiquement que par d'autres modules reportés", () => {
  const reportes = new Set(["js/ui/minuteurs.js", "js/ui/partage.js", "js/vues/reglages.js", "js/sync.js"]);
  for (const m of graphe) {
    const source = lire(m);
    for (const r of reportes) {
      const nom = r.replace(/^js\//, "").replace(/^(ui|vues)\//, "");
      assert.doesNotMatch(source, new RegExp(`^(import|export)\\b[^;]*\\bfrom\\s*["'][^"']*${nom.replace(".", "\\.")}["']`, "m"), `${m} importe ${r}`);
    }
  }
});

/* ---------- Les scripts classiques ---------- */

test("index.html ne charge que les scripts classiques dont l'accueil se sert", () => {
  const scripts = [...index.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => m[1]);
  assert.deepEqual(scripts, ["js/recipes.js", "js/placard.js", "js/allergenes.js", "js/saisons.js", "js/illos.js"]);
});

test("une globale d'un script reporté n'est lue par aucun module du graphe de l'accueil", () => {
  const globales = { "js/substitutions.js": "SUBSTITUTIONS", "js/sync-config.js": "SYNC_CONFIG" };
  for (const [fichier, globale] of Object.entries(globales)) {
    assert.ok(!index.includes(`src="${fichier}"`), `${fichier} est dans index.html`);
    const lecteurs = graphe.filter(m => new RegExp(`\\b${globale}\\b`).test(sansCommentaires(lire(m))));
    assert.deepEqual(lecteurs, [], `${globale} est lue sur le chemin de l'accueil`);
  }
  // Et ceux qui la lisent la font charger : la fiche pour les substitutions, js/ui/scripts.js pour la synchro.
  assert.deepEqual(scriptsDes(["fiche"]), ["js/substitutions.js"]);
  assert.deepEqual(scriptsDes(["menu", "courses", "cuisine", "savoirs"]), []);
  assert.match(lire("js/ui/scripts.js"), /chargerScript\("js\/sync-config\.js"\)/);
  assert.match(lire("js/vues/ingredient.js"), /SUBSTITUTIONS/);
  assert.match(lire("js/vues/fiche.js"), /from "\.\/ingredient\.js"/);
});

/* ---------- Les feuilles ---------- */

test("chaque vue demande les feuilles de ce qu'elle dessine, et toutes sont dans le repli noscript", () => {
  assert.deepEqual(feuillesDes(["menu"]), ["menu", "courses"]);
  assert.deepEqual(feuillesDes(["courses"]), ["courses"]);
  assert.deepEqual(feuillesDes(["cuisine"]), ["cuisine", "savoirs", "figures", "journal"]);
  assert.deepEqual(feuillesDes(["fiche", "cuisine"]), ["savoirs", "figures", "journal", "cuisine"]);
  assert.deepEqual(feuillesDes(["savoirs"]), ["savoirs", "figures"]);
  assert.deepEqual(feuillesDes([]), []);
  const noscript = index.slice(index.indexOf("<noscript>"), index.indexOf("</noscript>"));
  for (const nom of FEUILLES_DES_VUES) {
    assert.ok(existsSync(join(RACINE, "css", `${nom}.css`)), nom);
    assert.ok(noscript.includes(`href="css/${nom}.css"`), `${nom}.css : repli <noscript> manquant`);
  }
});

/* ---------- Les polices ---------- */

test("index.html ne précharge que deux polices : le bandeau et les titres des cartes", () => {
  const polices = [...index.matchAll(/<link rel="preload" as="font"[^>]*href="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(polices, ["fonts/caveat-titre.woff2", "fonts/cormorant.woff2"]);
});

test("css/polices.css est celui que tools/polices.mjs écrit pour le texte actuel du carnet", async () => {
  const css = lire("css/polices.css");
  for (const police of POLICES) {
    const { jeu } = await jeuDe(police);
    assert.ok(css.includes(`unicode-range: ${plages(jeu)};`), `${police.fichier} : relancer node tools/polices.mjs`);
  }
});

test("les polices servies dessinent tous les caractères du carnet que la police d'origine sait dessiner", async () => {
  const voulus = new Set([...BASE, ...caracteresDuCarnet()].filter(c => c >= 0x20 && c < 0x2e80));
  for (const police of POLICES.filter(p => p.texte === "base")) {
    const { jeu } = await jeuDe(police);
    const servis = await caracteresDe(readFileSync(join(RACINE, "fonts", `${police.fichier}.woff2`)));
    const manquants = [...jeu].filter(c => !servis.has(c)).map(c => `U+${c.toString(16).toUpperCase()} ${String.fromCodePoint(c)}`);
    assert.deepEqual(manquants, [], `${police.fichier} : glyphes absents du fichier servi`);
    // Le français et sa typographie sont tous là (la police d'origine les dessine).
    const dessinables = await caracteresDe(readFileSync(join(RACINE, "tools", "sources-polices", `${police.source}.woff2`)));
    for (const c of [..."àâäçéèêëîïôöùûüÿœŒ«»’‘“”–—…°½¼¾×€ "]) {
      if (dessinables.has(c.codePointAt(0))) assert.ok(servis.has(c.codePointAt(0)), `${police.fichier} : ${c}`);
    }
  }
  assert.ok(voulus.size > 100);
});

test("le Caveat du bandeau couvre « Cuisine » et « d'Evadri », et ne sert qu'à l'accueil", async () => {
  const accueil = lire("js/vues/accueil.js");
  const h1 = /<h1>([^<]+)<\/h1>/.exec(accueil)[1];
  assert.equal(h1, "Cuisine");
  const servis = await caracteresDe(readFileSync(join(RACINE, "fonts", "caveat-titre.woff2")));
  for (const c of new Set(`${h1} d'Evadri’`)) assert.ok(servis.has(c.codePointAt(0)), `${c} manque à Caveat Titre`);
  for (const c of new Set(TEXTE_TITRE)) assert.ok(servis.has(c.codePointAt(0)), `${c} manque à Caveat Titre`);
  // Caveat change de glyphes selon les lettres voisines : un autre bandeau (Savoirs) ne doit pas l'employer.
  const css = ["accueil", "base", "savoirs", "fiche", "cuisine", "menu", "courses", "journal", "minuteurs", "reglages"].map(f => sansCommentaires(lire(`css/${f}.css`))).join("\n");
  const usages = [...css.matchAll(/([^{}]*)\{[^{}]*"Caveat Titre"[^{}]*\}/g)].map(m => m[1].trim());
  assert.deepEqual(usages, [".masthead-accueil h1,\n.masthead-accueil .byline"]);
  assert.match(accueil, /class="masthead masthead-accueil/);
});

/* ---------- Le budget ---------- */

const gz = f => gzipSync(readFileSync(join(RACINE, f)), { level: 6 }).length;

test("le budget : ce que l'accueil télécharge avant ses cartes tient dans BUDGET_OCTETS_KO (estimation sur les fichiers)", () => {
  const bloquantes = [...index.matchAll(/<link rel="stylesheet" href="(css\/[a-z]+\.css)"/g)].map(m => m[1])
    .filter(f => !index.slice(index.indexOf("<noscript>"), index.indexOf("</noscript>")).includes(`href="${f}"`));
  const scripts = [...index.matchAll(/<script src="(js\/[^"]+)"/g)].map(m => m[1]);
  const polices = [...index.matchAll(/<link rel="preload" as="font"[^>]*href="([^"]+)"/g)].map(m => m[1]);
  const images = [...index.matchAll(/<link rel="preload" as="image" href="([^"]+)"/g)].map(m => m[1]);
  const octets = gz("index.html")
    + [...bloquantes, ...graphe, ...scripts].reduce((s, f) => s + gz(f), 0)
    + [...polices, ...images].reduce((s, f) => s + statSync(join(RACINE, f)).size, 0);
  const ko = octets / 1024;
  assert.ok(ko <= BUDGET_OCTETS_KO, `${ko.toFixed(1)} Ko avant les cartes, pour un budget de ${BUDGET_OCTETS_KO} Ko : voir README, « Performance »`);
  // Le budget n'est pas un chèque en blanc : il reste proche de ce que l'on mesure.
  assert.ok(ko >= BUDGET_OCTETS_KO * 0.75, `${ko.toFixed(1)} Ko seulement : le budget (${BUDGET_OCTETS_KO} Ko) peut se resserrer`);
});

test("les polices servies sont des sous-ensembles : bien plus légères que les polices d'origine", () => {
  for (const police of POLICES) {
    const servie = statSync(join(RACINE, "fonts", `${police.fichier}.woff2`)).size;
    const source = statSync(join(RACINE, "tools", "sources-polices", `${police.source}.woff2`)).size;
    assert.ok(servie < source * 0.9, `${police.fichier} : ${servie} octets pour ${source}`);
  }
  const total = readdirSync(join(RACINE, "fonts")).reduce((s, f) => s + statSync(join(RACINE, "fonts", f)).size, 0);
  // Les fichiers « étendus » (ñ, ß…) ne sont jamais préchargés : ils ne pèsent que si un de ces caractères s'écrit.
  assert.ok(total < 150 * 1024, `fonts/ pèse ${total} octets`);
});

test("un nom de plat ou une note écrits à la main (jalapeño, più, Ærø, ß) restent dans la police du carnet, sans préchargement", async () => {
  const css = sansCommentaires(lire("css/polices.css"));
  const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(m => m[1]);
  const couvert = (famille, c) => faces.some(f => f.includes(`font-family: "${famille}"`)
    && [...f.match(/unicode-range:([^;]*);/)[1].matchAll(/U\+([0-9A-F]+)(?:-([0-9A-F]+))?/g)]
      .some(([, a, b]) => c >= parseInt(a, 16) && c <= parseInt(b || a, 16)));
  for (const famille of ["Cormorant Garamond", "Caveat"]) {
    for (const lettre of "ñíóúáãõìòßøåÁÑ") {
      assert.ok(couvert(famille, lettre.codePointAt(0)), `${famille} : ${lettre}`);
    }
  }
  // Les fichiers étendus dessinent ces glyphes, et index.html ne les précharge pas.
  for (const f of ["cormorant-etendu", "cormorant-italique-etendu", "caveat-etendu"]) {
    const servis = await caracteresDe(readFileSync(join(RACINE, "fonts", `${f}.woff2`)));
    assert.ok(servis.has("ñ".codePointAt(0)) && servis.has("ß".codePointAt(0)), f);
    assert.ok(!index.includes(`fonts/${f}.woff2`), `${f} ne doit pas être préchargée`);
  }
});
