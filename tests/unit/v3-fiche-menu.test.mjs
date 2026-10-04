/* Lot « fiche-menu » de la vague 3 : ce que le mouvement de la fiche et du menu garantit sans navigateur (balisage, règles CSS, bornes de la frise). */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const lire = f => readFileSync(path.join(racine, f), "utf8");
const fiche = lire("js/vues/fiche.js");
const menu = lire("js/vues/menu.js");
const cssFiche = lire("css/fiche.css");
const cssMenu = lire("css/menu.css");

/* Le texte d'une feuille CSS sans ses commentaires. */
const sansCommentaires = css => css.replace(/\/\*[\s\S]*?\*\//g, "");

test("la grande photo de la fiche et la vignette d'une carte portent data-vt-photo (contrat du routeur)", () => {
  assert.match(fiche, /class="visual" data-vt-photo="\$\{r\.id\}"/);
  assert.match(menu, /class="mc-visual" data-vt-photo="\$\{r\.id\}"/);
});

test("la barre compacte : titre aria-hidden, inert tant qu'elle est cachée, jamais un second h1", () => {
  assert.match(fiche, /<span class="fb-titre" aria-hidden="true">/);
  assert.match(fiche, /class="fiche-barre" id="fiche-barre" inert/);
  const barre = /<div class="fiche-barre"[\s\S]*?<\/div>\s*<\/div>/.exec(fiche)[0];
  assert.doesNotMatch(barre, /<h1/);
});

test("« Au menu » : la vignette s'envole par effets.js, chargé à la demande seulement", () => {
  assert.match(fiche, /import\("\.\.\/ui\/effets\.js"\)/);
  assert.doesNotMatch(fiche, /^import .*effets\.js/m);
  assert.doesNotMatch(menu, /^import .*effets\.js/m);
});

test("aucun module ajouté au chemin de l'accueil : main.js n'importe ni la fiche, ni le menu, ni nombre.js", () => {
  const main = lire("js/main.js");
  assert.doesNotMatch(main, /vues\/(fiche|menu)\.js/);
  assert.doesNotMatch(main, /ui\/nombre\.js/);
});

test("la frise ne s'anime que hors mouvement réduit, et tient en 900 ms par construction", () => {
  const css = sansCommentaires(cssMenu);
  const bloc = /@media not \(prefers-reduced-motion: reduce\) \{\s*\.frise\[data-trace="attend"\][\s\S]*?\n\}\n/.exec(css)[0];
  assert.match(bloc, /data-trace="joue"/);
  assert.match(bloc, /fr-pouls/);
  // Le pas est borné par le JS : (n - 1) × pas ≤ 480 ms, plus un point de 260 ms et 0,4 pas.
  const total = /Math\.floor\((\d+) \/ Math\.max\(1, lignes\.length\)\)/.exec(menu);
  assert.equal(Number(total[1]), 480);
  const max = /Math\.min\((\d+), Math\.floor/.exec(menu)[1];
  assert.ok(480 + 0.4 * Number(max) + 260 <= 900);
});

test("les images clés des nouveaux effets n'animent que des propriétés sûres", () => {
  for (const css of [sansCommentaires(cssFiche), sansCommentaires(cssMenu)]) {
    for (const m of css.matchAll(/@keyframes [\w-]+ \{([\s\S]*?)\n\}/g)) {
      const props = [...m[1].matchAll(/([\w-]+)\s*:/g)].map(x => x[1]);
      for (const p of props) assert.match(p, /^(opacity|translate|scale|rotate|transform|clip-path|box-shadow|stroke-dashoffset)$/, `propriété animée : ${p}`);
    }
  }
});

test("le texte des portions passe par esc() avant d'entrer dans le DOM", () => {
  assert.match(lire("js/ui/nombre.js"), /esc\(String\(texte\)\)/);
});

test("les nouveaux tests e2e n'attendent pas à durée fixe", () => {
  assert.doesNotMatch(lire("tests/e2e/v3-fiche-menu.spec.js"), /waitForTimeout/);
});
