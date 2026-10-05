/* Lot « courses » de la vague 3 : les décisions pures de la liste (signature, seuil du balayage, géométrie du glisser-déposer des rayons) et ce que les fichiers du lot s'interdisent. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { balayageSupprime, creneauDeposer, decalagesDeposer, ordreApres, signature, vitesseDefilement } from "../../js/vues/courses-gestes.js";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const lire = f => readFileSync(path.join(racine, f), "utf8");

test("signature : stable pour un même contenu, différente dès qu'il change", () => {
  const a = signature(["lardons", "Lardons fumés", false, "200 g"]);
  assert.equal(a, signature(["lardons", "Lardons fumés", false, "200 g"]));
  assert.notEqual(a, signature(["lardons", "Lardons fumés", false, "250 g"]));
  assert.notEqual(signature("a"), signature("b"));
  assert.match(a, /^[0-9a-z]+$/);
});

test("balayage : il faut aller assez loin, ou être jeté vite après un vrai début de geste", () => {
  assert.equal(balayageSupprime({ x: -10, vx: 0, largeur: 360 }), false);
  assert.equal(balayageSupprime({ x: -111, vx: 0, largeur: 360 }), false);
  assert.equal(balayageSupprime({ x: -112, vx: 0, largeur: 360 }), true);
  // Sur une ligne étroite, le tiers de sa largeur suffit.
  assert.equal(balayageSupprime({ x: -90, vx: 0, largeur: 240 }), true);
  assert.equal(balayageSupprime({ x: -60, vx: 0, largeur: 240 }), false);
  // Un jet rapide, mais seulement après 24 px de geste.
  assert.equal(balayageSupprime({ x: -40, vx: -900, largeur: 360 }), true);
  assert.equal(balayageSupprime({ x: -12, vx: -900, largeur: 360 }), false);
  // Vers la droite (ou lentement), jamais.
  assert.equal(balayageSupprime({ x: 0, vx: 1200, largeur: 360 }), false);
  assert.equal(balayageSupprime({ x: -40, vx: -200, largeur: 360 }), false);
});

const tops = [100, 160, 220, 280];
const hauteurs = [56, 56, 56, 56];

test("glisser-déposer : le créneau suit le centre de la ligne traînée", () => {
  assert.equal(creneauDeposer(tops, hauteurs, 0, 0), 0);
  assert.equal(creneauDeposer(tops, hauteurs, 0, 25), 0);
  assert.equal(creneauDeposer(tops, hauteurs, 0, 35), 1);
  assert.equal(creneauDeposer(tops, hauteurs, 0, 125), 2);
  assert.equal(creneauDeposer(tops, hauteurs, 3, -125), 1);
  assert.equal(creneauDeposer(tops, hauteurs, 3, -1000), 0);
  assert.equal(creneauDeposer(tops, hauteurs, 1, 1000), 3);
});

test("glisser-déposer : l'ordre et les décalages d'une ligne posée plus bas, plus haut, au même endroit", () => {
  assert.deepEqual(ordreApres(4, 0, 2), [1, 2, 0, 3]);
  assert.deepEqual(ordreApres(4, 3, 1), [0, 3, 1, 2]);
  assert.deepEqual(ordreApres(4, 2, 2), [0, 1, 2, 3]);
  // 0 → 2 : la ligne descend de deux pas, les deux suivantes remontent d'un.
  assert.deepEqual(decalagesDeposer(tops, hauteurs, 0, 2), [120, -60, -60, 0]);
  assert.deepEqual(decalagesDeposer(tops, hauteurs, 3, 1), [0, 60, 60, -120]);
  assert.deepEqual(decalagesDeposer(tops, hauteurs, 1, 1), [0, 0, 0, 0]);
  assert.deepEqual(decalagesDeposer([100], [56], 0, 0), [0]);
});

test("glisser-déposer : des hauteurs inégales se rempilent sans trou ni recouvrement", () => {
  const t = [0, 50, 120];
  const h = [40, 60, 40];   // l'espace entre deux lignes est de 10 px
  const d = decalagesDeposer(t, h, 0, 2);
  const nouveaux = t.map((top, i) => top + d[i]);
  // Ordre d'arrivée : 1, 2, 0 — chaque ligne commence 10 px après la fin de la précédente.
  assert.equal(nouveaux[1], 0);
  assert.equal(nouveaux[2], 70);
  assert.equal(nouveaux[0], 120);
});

test("défilement automatique : nul au milieu, de plus en plus vite vers le bord, dans les deux sens", () => {
  assert.equal(vitesseDefilement(400, 0, 800), 0);
  assert.ok(vitesseDefilement(60, 0, 800) < 0);
  assert.ok(vitesseDefilement(20, 0, 800) < vitesseDefilement(60, 0, 800));
  assert.ok(vitesseDefilement(760, 0, 800) > 0);
  assert.ok(vitesseDefilement(795, 0, 800) > vitesseDefilement(760, 0, 800));
  assert.ok(Math.abs(vitesseDefilement(-50, 0, 800)) <= 14);
});

test("la liste de courses s'en tient aux règles du mouvement", () => {
  const js = lire("js/vues/courses.js");
  const css = lire("css/courses.css");
  // Les effets lourds se chargent à la demande, jamais en import statique.
  assert.doesNotMatch(js, /^import[^\n]*effets\.js/m);
  assert.match(js, /import\("\.\.\/ui\/effets\.js"\)/);
  // Aucune bibliothèque, aucune boucle permanente, aucune attente fixe de durée d'animation.
  assert.doesNotMatch(js, /from "https?:/);
  assert.doesNotMatch(js, /setInterval/);
  // Aucune animation de mise en page dans la feuille : pas de transition ni d'animation sur width/height/top/left.
  for (const [, valeur] of css.matchAll(/transition(?:-property)?\s*:([^;]+);/g)) assert.doesNotMatch(valeur, /\b(width|height|top|left)\b/, valeur);
  // Les durées viennent des jetons : pas de milliseconde écrite à la main dans une transition ou une animation.
  for (const [, valeur] of css.matchAll(/(?:transition|animation(?:-delay)?)\s*:([^;]+);/g)) assert.doesNotMatch(valeur, /(^|[^-\w.])[1-9]\d*(\.\d+)?ms\b/, valeur);
  assert.doesNotMatch(css, /!important/);
  // Le mouvement réduit a sa règle.
  assert.match(css, /prefers-reduced-motion: reduce/);
  // La coche et le trait de crayon sont des tracés.
  assert.match(js, /pathLength="1"/);
});
