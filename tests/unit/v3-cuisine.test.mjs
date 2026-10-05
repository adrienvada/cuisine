/* Lot « cuisine » de la vague 3 : la décision d'une page qui tourne (pure), et ce que le CSS et les modules doivent tenir
   pour que le mode cuisine et les minuteurs restent légers sur le chemin de l'accueil. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DISTANCE_MIN, VITESSE_LANCEE, decisionPage, limitesPage } from "../../js/vues/cuisine-gestes.js";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const lire = f => readFileSync(path.join(racine, f), "utf8");

test("decisionPage : un geste court et lent ne tourne pas, un geste long si", () => {
  assert.equal(decisionPage(-30, 0, 390), 0);
  assert.equal(decisionPage(-DISTANCE_MIN + 1, 0, 390), 0);
  assert.equal(decisionPage(-120, 0, 390), 1);
  assert.equal(decisionPage(120, 0, 390), -1);
});

test("decisionPage : sur une grande largeur la distance suit la page (22 %), jamais moins de 64 px", () => {
  assert.equal(decisionPage(-100, 0, 800), 0);
  assert.equal(decisionPage(-180, 0, 800), 1);
  assert.equal(decisionPage(-70, 0, 200), 1);
});

test("decisionPage : un lancer franc suffit, pourvu que la page ait bougé et dans le bon sens", () => {
  assert.equal(decisionPage(-30, -(VITESSE_LANCEE + 50), 390), 1);
  assert.equal(decisionPage(30, VITESSE_LANCEE + 50, 390), -1);
  assert.equal(decisionPage(-10, -2000, 390), 0, "presque pas bougé : un tap vif n'est pas un balayage");
  assert.equal(decisionPage(-30, -(VITESSE_LANCEE - 50), 390), 0, "trop lent");
});

test("decisionPage : un doigt qui revient vite en arrière annule, même loin", () => {
  assert.equal(decisionPage(-150, VITESSE_LANCEE + 100, 390), 0);
  assert.equal(decisionPage(150, -(VITESSE_LANCEE + 100), 390), 0);
});

test("limitesPage : on ne tire ni au-delà de la première étape ni au-delà de la dernière", () => {
  assert.deepEqual(limitesPage(0, 5).x, [-Infinity, 0]);
  assert.deepEqual(limitesPage(2, 5).x, [-Infinity, Infinity]);
  assert.deepEqual(limitesPage(4, 5).x, [0, Infinity]);
  assert.deepEqual(limitesPage(0, 1).x, [0, 0], "une recette d'une étape : rien à tourner");
});

test("minuteurs.js (sur le chemin de l'accueil) n'importe les aides du mouvement qu'à la demande", () => {
  const source = lire("js/ui/minuteurs.js");
  const statiques = [...source.matchAll(/^import .* from "(.+)";/gm)].map(m => m[1]);
  assert.ok(!statiques.some(f => /mouvement|geste|effets/.test(f)), statiques.join(", "));
  assert.match(source, /import\("\.\/mouvement\.js"\)/);
  assert.match(source, /import\("\.\/geste\.js"\)/);
});

test("le mode cuisine ne passe plus par l'ancien clignotement : flash est remplacé par un souffle doux", () => {
  for (const f of ["css/minuteurs.css", "css/cuisine.css"]) {
    const css = lire(f);
    assert.ok(!/animation:\s*flash\b/.test(css), `${f} anime encore @keyframes flash`);
  }
  assert.match(lire("css/minuteurs.css"), /@keyframes souffle/);
  assert.match(lire("css/minuteurs.css"), /@keyframes sonne-halo/);
});

test("l'anneau se vide par une seule animation CSS, coupée en mouvement réduit, suspendue en pause", () => {
  const css = lire("css/minuteurs.css");
  assert.match(css, /@keyframes anneau \{ to \{ stroke-dashoffset: 1; \} \}/);
  assert.match(css, /prefers-reduced-motion: no-preference\) \{\s*\.anneau \.jauge \{ animation: anneau/);
  assert.match(css, /\.anneau\.en-pause \.jauge \{ animation-play-state: paused; \}/);
});

test("l'entrée et la sortie du mode cuisine : un cercle qui s'ouvre et se referme, sauté en mouvement réduit", () => {
  const css = lire("css/cuisine.css");
  assert.match(css, /html\[data-vt="cuisine"\]::view-transition-new\(root\)/);
  assert.match(css, /html\[data-vt="cuisine-sortie"\]::view-transition-old\(root\)/);
  assert.match(css, /@keyframes cuisine-ouvre \{\s*from \{ clip-path: circle\(0 at var\(--vt-x/);
  assert.match(css, /@keyframes cuisine-ferme/);
  // Les deux règles de vue sont sous « pas de mouvement réduit ».
  const bloc = css.slice(css.indexOf("@media not (prefers-reduced-motion: reduce)", css.indexOf("Entrée et sortie")));
  assert.ok(bloc.indexOf("cuisine-ouvre") < bloc.indexOf("@keyframes"), "la règle précède les images clés dans son bloc");
});

test("cuisine.js : aucune attente fixe, aucune boucle d'animation permanente", () => {
  const source = lire("js/vues/cuisine.js") + lire("js/ui/minuteurs.js");
  assert.ok(!/requestAnimationFrame/.test(source));
  assert.ok(!/setInterval\(/.test(lire("js/vues/cuisine.js")));
});
