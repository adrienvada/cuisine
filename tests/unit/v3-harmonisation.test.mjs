/* Passe d'harmonisation de la vague 3 : ce que l'ensemble s'interdit une fois les lots réunis (durées en dur, doublons de tracé, feuille des réglages sur le chemin de l'accueil). */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { ICON } from "../../js/core/icones.js";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const lire = f => readFileSync(path.join(racine, f), "utf8");
const feuilles = readdirSync(path.join(racine, "css")).filter(f => f.endsWith(".css"));

/* ---------- Les durées viennent des jetons ---------- */

test("css : une durée en dur n'existe que pour une boucle (infinite), un décalage (delay) ou un zéro", () => {
  const fautes = [];
  for (const f of feuilles) {
    lire(`css/${f}`).split("\n").forEach((ligne, i) => {
      const dec = ligne.trim();
      if (!/^(\.|[a-z:\[#*])?.*\b(transition|animation)(-duration)?\s*:/.test(dec) && !/^\s*(transition|animation)[a-z-]*:/.test(ligne)) return;
      if (/^\/\*|^\*/.test(dec)) return;
      const valeur = dec.slice(dec.indexOf(":") + 1);
      // Les chiffres hors des var(--…) et des calc(var(--…) …).
      const sansVar = valeur.replace(/var\([^)]*\)/g, "");
      if (!/(^|[\s,(])\d*\.?\d+(ms|s)\b/.test(sansVar)) return;
      if (/infinite|delay|\b0s\b|0\.01ms/.test(dec) || /\b\d*\.?\d+(ms|s)\b/.test(sansVar.replace(/\b(0s|0\.01ms)\b/g, "")) === false) return;
      // Un décalage écrit dans le raccourci `animation:` (dernier temps) ou `calc(... * 35ms)`.
      if (/\*\s*\d+ms|\+\s*\d+ms|-\s*\d+ms/.test(sansVar)) return;
      fautes.push(`css/${f}:${i + 1}  ${dec}`);
    });
  }
  assert.deepEqual(fautes, []);
});

test("css : les décalages d'échelonnement tiennent en 35 ou 60 ms, comme l'écrit base.css", () => {
  const base = lire("css/base.css");
  assert.match(base, /\* 35ms/);
  assert.match(base, /\* 60ms/);
});

/* ---------- Les tracés ---------- */

test("la coche traçable est écrite une fois (core/icones.js) et les vues ne réécrivent plus pathLength", () => {
  assert.match(ICON.checkTrace, /<path pathLength="1" d="M20 6 9 17l-5-5"\/>/);
  assert.equal(ICON.checkTrace.replace(' pathLength="1"', ""), ICON.check);
  for (const f of ["js/vues/courses.js", "js/vues/fiche.js", "js/vues/menu.js", "js/vues/cuisine.js"]) {
    assert.doesNotMatch(lire(f), /\.replace\([^)]*pathLength/, `${f} ajoute encore pathLength par remplacement`);
  }
  assert.doesNotMatch(lire("js/vues/menu.js"), /setAttribute\("pathLength"/);
});

/* ---------- Le chemin de l'accueil ---------- */

test("reglages.css (bloquante) ne garde que le bouton de l'accueil ; la feuille est à part, non bloquante, avec son repli noscript", () => {
  const index = lire("index.html");
  const noscript = index.slice(index.indexOf("<noscript>"), index.indexOf("</noscript>"));
  assert.ok(noscript.includes('href="css/reglages-feuille.css"'));
  assert.ok(!index.slice(0, index.indexOf("<noscript>")).includes("reglages-feuille.css"));
  const bouton = lire("css/reglages.css");
  assert.match(bouton, /\.reglages-btn/);
  for (const classe of [".reg-switch", ".reg-pastille", ".confirmation", ".conf-boutons", "theme-cercle"]) {
    assert.ok(!bouton.includes(classe), `${classe} est dans la feuille bloquante`);
    assert.ok(lire("css/reglages-feuille.css").includes(classe), `${classe} manque à la feuille des réglages`);
  }
  assert.ok(gzipSync(bouton).length < 1100, "reglages.css est redevenue lourde");
});

test("ouvrirReglages() et confirmer() attendent la feuille des réglages avant de dessiner", () => {
  for (const f of ["js/vues/reglages.js", "js/ui/confirmation.js"]) {
    assert.match(lire(f), /stylesPrets\(\[FEUILLE_REGLAGES\]\)/, f);
  }
  const styles = lire("js/ui/styles.js");
  assert.match(styles, /FEUILLE_REGLAGES = "reglages-feuille"/);
  assert.match(styles, /const ORDRE = \[[^\]]*"reglages-feuille"\]/);
  assert.ok(existsSync(path.join(racine, "css/reglages-feuille.css")));
});

/* ---------- Les courses ---------- */

test("courses : le tampon n'est plus dans le bandeau, la ligne manuscrite ne le répète pas", () => {
  const js = lire("js/vues/courses.js");
  const entete = js.slice(js.indexOf("const ENTETE"), js.indexOf("const ENTETE") + 400);
  assert.doesNotMatch(entete, /tampon-fini/);
  assert.match(js, /<div class="tampon-fini/);
  assert.doesNotMatch(js, /class="fini">Tout est dans le panier/);
  const css = lire("css/courses.css");
  assert.match(css, /\.tampon-fini \{[^}]*position: absolute;[^}]*right: 64px;/);
});

/* ---------- La fin du mode cuisine ---------- */

test("cuisine : les effets de fin sont préchargés à la dernière étape, la fête attend la fin du cercle de sortie", () => {
  const js = lire("js/vues/cuisine.js");
  assert.match(js, /if \(last && !REDUCE_MOTION\.matches\) effetsPrets\(\)/);
  assert.match(js, /Promise\.all\(\[effetsPrets\(\), finDeTransition\(\)\]\)/);
  assert.match(js, /attributeFilter: \["data-vt"\]/);
});

test("cuisine.css : un minuteur compact sous 360 px", () => {
  const css = lire("css/cuisine.css");
  assert.match(css, /@media \(max-width: 360px\) \{[^}]*#timer-zone\.repos/);
});

test("pas d'attente fixe nouvelle dans les tests de l'harmonisation", () => {
  assert.doesNotMatch(lire("tests/e2e/v3-harmonisation.spec.js"), /waitForTimeout/);
  assert.ok(statSync(path.join(racine, "tests/e2e/v3-harmonisation.spec.js")).size > 0);
});
