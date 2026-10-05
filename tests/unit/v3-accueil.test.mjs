/* Lot « accueil » de la vague 3 : ce que le mouvement de l'accueil garantit sans navigateur
   (balisage des cartes, bloc des couleurs dominantes, règles CSS). */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { blocCouleurs, couleursEcrites, DEBUT_COULEURS, FIN_COULEURS } from "../../tools/generer-vignettes.mjs";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const lire = f => readFileSync(path.join(racine, f), "utf8");
const accueil = lire("js/vues/accueil.js");
const css = lire("css/accueil.css");
const sansCommentaires = c => c.replace(/\/\*[\s\S]*?\*\//g, "");

test("chaque carte porte data-vt-photo sur sa photo (contrat du routeur) et sa couleur de repli", () => {
  assert.match(accueil, /class="visual" data-vt-photo="\$\{r\.id\}" style="--c:\$\{r\.color\}22"/);
});

test("le bloc des couleurs se relit tel qu'il s'écrit", () => {
  const couleurs = new Map([["a-b", ["#010203", "#a0b0c0"]], ["9zut", ["#ffffff", "#000000"]]]);
  const bloc = blocCouleurs(couleurs);
  assert.ok(bloc.startsWith(DEBUT_COULEURS) && bloc.endsWith(FIN_COULEURS));
  assert.match(bloc, /\.card\[data-id=a-b\]\{--p:#010203,#a0b0c0\}/);
  assert.match(bloc, /\.card\[data-id="9zut"\]\{--p:#ffffff,#000000\}/);
  assert.deepEqual([...couleursEcrites(bloc)], [...couleurs].sort(([a], [b]) => (a < b ? -1 : 1)));
});

test("css/accueil.css porte la couleur de chaque photo, au format hexadécimal", () => {
  const ecrites = couleursEcrites(css);
  const photos = readdirSync(path.join(racine, "img")).filter(f => f.endsWith(".jpg")).map(f => f.slice(0, -4));
  assert.ok(photos.length > 0);
  for (const id of photos) {
    assert.ok(ecrites.has(id), `couleur de ${id}`);
    assert.ok(existsSync(path.join(racine, "img", "v", `${id}.webp`)));
  }
});

test("l'arrivée au défilement est sous @supports et coupée en mouvement réduit", () => {
  assert.match(css, /@supports \(animation-timeline: view\(\)\)\s*\{\s*\.card\s*\{[^}]*animation-timeline: view\(\)/);
  const reduit = /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.card \{ animation: none; \}/;
  assert.match(css, reduit);
});

test("l'ancienne mécanique de filtrage (FLIP maison, rebond maison) a disparu", () => {
  const js = sansCommentaires(accueil), feuille = sansCommentaires(css);
  for (const mort of ["card-move", "card-enter", "no-anim", "requestAnimationFrame", "_lv", "_mv"]) assert.ok(!js.includes(mort) && !feuille.includes(mort), mort);
  assert.ok(!feuille.includes("chip-bounce") && !feuille.includes("leaf-jump") && !feuille.includes(".pop"));
  assert.match(js, /mouvement\.flip\(/);
});

test("aucune durée ni courbe en dur dans les animations de l'accueil", () => {
  const feuille = sansCommentaires(css);
  assert.doesNotMatch(feuille, /animation:[^;]*\d(\.\d+)?m?s\s+(ease|linear|cubic)/);
  assert.doesNotMatch(feuille, /cubic-bezier/);
});

test("l'ancre des brins : seuls les traits du bandeau gagnent pathLength, une fois par session", () => {
  assert.match(accueil, /sessionStorage\.getItem\("accueil-encre"\)/);
  assert.match(accueil, /REDUCE_MOTION\.matches\) return false/);
});

test("l'accueil n'importe pas le socle du mouvement de façon statique (chemin critique)", () => {
  assert.doesNotMatch(accueil, /^import .*mouvement\.js/m);
  assert.match(accueil, /import\("\.\.\/ui\/mouvement\.js"\)/);
});
