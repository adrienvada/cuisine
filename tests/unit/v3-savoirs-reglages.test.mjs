/* Vague 3, lot « savoirs-reglages » : les illustrations traçables, le volet « Pourquoi ça marche » et la
   bascule de thème, vérifiés sans navigateur (le reste est dans tests/e2e/v3-savoirs-reglages.spec.js). */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lire = chemin => readFileSync(new URL(`../../${chemin}`, import.meta.url), "utf8");

/* js/illos.js est un script classique (il déclare ILLO en global) : on l'évalue tel quel. */
const ILLO = new Function(`${lire("js/illos.js")}\nreturn ILLO;`)();

test("illustrations : chaque <path> au trait des décors porte pathLength=\"1\"", () => {
  for (const [nom, svg] of Object.entries(ILLO.D)) {
    for (const [balise] of svg.matchAll(/<path\b[^>]*>/g)) {
      // un remplissage translucide (la coupe, la lueur) ne se trace pas
      if (/fill-opacity/.test(balise)) continue;
      assert.match(balise, /pathLength="1"/, `ILLO.D.${nom} : ${balise}`);
    }
  }
});

test("illustrations : les décors tracés par les autres lots ont des formes traçables", () => {
  for (const nom of ["sprig", "sprigR", "olive", "flourish", "heart", "leaf", "cheers", "plume", "toque", "corner"]) {
    assert.ok((ILLO.D[nom].match(/pathLength="1"/g) || []).length > 0, `ILLO.D.${nom}`);
  }
});

test("illustrations : pathLength ne s'ajoute qu'une fois par chemin, le reste du dessin est intact", () => {
  for (const [nom, svg] of Object.entries(ILLO.D)) {
    assert.doesNotMatch(svg, /pathLength="1"[^>]*pathLength="1"/, `ILLO.D.${nom}`);
    assert.ok(svg.startsWith("<svg") && svg.endsWith("</svg>"), `ILLO.D.${nom}`);
  }
  // la branche d'olivier garde ses feuilles et ses olives pleines
  assert.equal((ILLO.D.olive.match(/<ellipse\b/g) || []).length, 5);
  assert.equal((ILLO.D.olive.match(/<circle\b/g) || []).length, 3);
  assert.match(ILLO.D.sprig, /d="M3 10 Q28 4 53 9"/);
});

test("illustrations : le poids ajouté reste modeste (les décors sont sur le chemin de l'accueil)", () => {
  const poids = Object.values(ILLO.D).join("").length;
  const nombre = Object.values(ILLO.D).join("").match(/pathLength="1" /g).length;
  assert.ok(nombre * 14 < 1200, `${nombre} attributs`);
  assert.ok(poids < 9000, `${poids} octets de décors`);
});

test("savoirs.css porte seul l'ouverture en hauteur fluide du volet, fiche.css ne la double plus", () => {
  const savoirs = lire("css/savoirs.css");
  const fiche = lire("css/fiche.css");
  assert.match(savoirs, /\.a-savoirs \{ interpolate-size: allow-keywords; \}/);
  assert.match(savoirs, /\.a-savoirs \.s-liste \{[^}]*height: 0;/);
  assert.match(savoirs, /\.a-savoirs\.ouvert \.s-liste \{[^}]*height: auto;/);
  assert.doesNotMatch(fiche, /\.steps li \.a-savoirs/);
  assert.doesNotMatch(fiche, /interpolate-size/);
});

test("savoirs.css : barre de lecture et cartes pilotées par le défilement sous @supports, jamais !important", () => {
  const css = lire("css/savoirs.css");
  assert.match(css, /@supports \(animation-timeline: scroll\(\)\)[\s\S]*animation-timeline: scroll\(root block\)/);
  assert.match(css, /@supports \(animation-timeline: view\(\)\)[\s\S]*animation-timeline: view\(\)/);
  assert.doesNotMatch(css, /!important/);
});

test("reglages.css : le cercle de thème est réservé au mouvement normal et laisse la page cliquable", () => {
  const css = lire("css/reglages.css");
  const bloc = css.slice(css.indexOf("Bascule clair / sombre"));
  assert.match(bloc, /@media not \(prefers-reduced-motion: reduce\)/);
  assert.match(bloc, /html\[data-vt="theme"\]::view-transition-new\(root\)/);
  assert.match(bloc, /clip-path: circle\(0 at var\(--vt-x/);
  assert.match(bloc, /pointer-events: none/);
  assert.doesNotMatch(css, /!important/);
});

test("reglages.css : l'interrupteur fait au moins 44 px et le point ne respire qu'en mouvement normal", () => {
  const css = lire("css/reglages.css");
  assert.match(css, /\.reg-switch \{[^}]*width: 56px;[^}]*height: 44px;/);
  const respire = css.slice(css.indexOf("Pendant la connexion"), css.indexOf("@keyframes reglages-respire"));
  assert.match(respire, /@media not \(prefers-reduced-motion: reduce\)/);
  assert.match(respire, /infinite/);
});

test("la bascule en cercle vit dans reglages.js, hors du chemin de l'accueil, et respecte mouvement réduit et routeur", () => {
  const theme = lire("js/ui/theme.js");
  const reglages = lire("js/vues/reglages.js");
  assert.doesNotMatch(theme, /startViewTransition/);                          // theme.js est sur le chemin de l'accueil
  assert.match(theme, /export function choisirTheme\(mode, englober\)/);
  assert.match(theme, /export const mouvementReduit/);                         // le contrat de mouvementReduit() est gardé
  assert.match(theme, /"#15180F" : "#42603A"/);
  assert.match(reglages, /typeof document\.startViewTransition !== "function" \|\| mouvementReduit\(\) \|\| racine\.dataset\.vt/);
  assert.match(reglages, /racine\.dataset\.vt = "theme"/);
});
