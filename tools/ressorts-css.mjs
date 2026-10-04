/* Écrit dans css/base.css les ressorts du carnet : les jetons --ressort,
   --ressort-vif et --ressort-rebond (des linear() calculés par js/core/ressort.js)
   et leur durée, avec un repli cubic-bezier pour un navigateur qui ne connaît pas
   linear().

   Le bloc vit entre deux repères dans css/base.css ; un test unitaire échoue s'il
   n'est plus ce que cet outil écrirait (changer un préréglage de ressort.js, c'est
   relancer l'outil).

   Usage :  node tools/ressorts-css.mjs   (ou npm run ressorts) */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PRESETS, REPLIS_RESSORT, ressort } from "../js/core/ressort.js";

export const DEBUT = "/* >>> ressorts générés par tools/ressorts-css.mjs — ne pas modifier à la main */";
export const FIN = "/* <<< fin du bloc généré */";

const NOMS = { doux: "--ressort", vif: "--ressort-vif", rebond: "--ressort-rebond" };

/* Le bloc complet, repères compris. Le repli d'abord (déclaré sans condition), puis
   la vraie courbe sous @supports : une var() invalide ne retomberait pas sur la
   déclaration précédente, d'où ce partage plutôt qu'une double déclaration. */
export function blocRessorts() {
  const calculs = Object.keys(PRESETS).map(nom => ({ nom, ...ressort(nom) }));
  const repli = calculs.map(({ nom, duree }) =>
    `  ${NOMS[nom]}: ${REPLIS_RESSORT[nom]};\n  ${NOMS[nom]}-duree: ${duree}ms;`).join("\n");
  const vrai = calculs.map(({ nom, lineaire }) => `    ${NOMS[nom]}: ${lineaire};`).join("\n");
  return [
    DEBUT,
    ":root {",
    repli,
    "}",
    "",
    "@supports (transition-timing-function: linear(0, 1)) {",
    "  :root {",
    vrai,
    "  }",
    "}",
    FIN
  ].join("\n");
}

export function appliquer(css) {
  const a = css.indexOf(DEBUT);
  const b = css.indexOf(FIN);
  if (a < 0 || b < a) throw new Error("css/base.css : repères du bloc généré introuvables");
  return css.slice(0, a) + blocRessorts() + css.slice(b + FIN.length);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const chemin = join(dirname(fileURLToPath(import.meta.url)), "..", "css", "base.css");
  const avant = readFileSync(chemin, "utf8");
  const apres = appliquer(avant);
  if (apres !== avant) writeFileSync(chemin, apres);
  console.log(apres === avant ? "css/base.css : ressorts déjà à jour" : "css/base.css : ressorts réécrits");
}
