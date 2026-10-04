/* Le graphe des imports STATIQUES des modules de l'appli, et le bloc de
   préchargement qu'on en tire pour index.html.

   Un module que le navigateur ne découvre qu'en lisant celui qui l'importe se
   télécharge un aller-retour plus tard : sans préchargement, la chaîne d'imports
   fait autant d'allers-retours qu'elle a de niveaux. Les import() dynamiques n'y
   figurent pas exprès : ce sont des vues chargées à la demande, que le premier
   affichage n'attend pas.

   Utilisé par tools/version-sw.mjs (qui écrit le bloc) et par les tests (qui
   vérifient que index.html le contient). */

import { readFileSync } from "node:fs";
import { dirname, join, normalize, relative, sep } from "node:path";

/* « import … from "./x.js" », « import "./x.js" » et « export … from "./x.js" »,
   en début de ligne. Un import() dynamique, une chaîne ou un commentaire ne
   correspondent pas. */
const IMPORT_AVEC_NOMS = /^(?:import|export)\b[^;"'`()]*?\bfrom\s*["'](\.{1,2}\/[^"']+)["']/gm;
const IMPORT_SEUL = /^import\s*["'](\.{1,2}\/[^"']+)["']/gm;

export function importsStatiques(source) {
  const sansCommentaires = source.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...sansCommentaires.matchAll(IMPORT_AVEC_NOMS), ...sansCommentaires.matchAll(IMPORT_SEUL)].map(m => m[1]);
}

/* Les modules atteints depuis `entree` (chemin relatif à `racine`, entrée comprise),
   triés. `lire` permet aux tests de fournir de faux fichiers. */
export function grapheStatique(racine, entree, lire = chemin => readFileSync(join(racine, chemin), "utf8")) {
  const vus = new Set();
  const pile = [entree];
  while (pile.length) {
    const fichier = pile.pop();
    if (vus.has(fichier)) continue;
    vus.add(fichier);
    for (const cible of importsStatiques(lire(fichier))) {
      pile.push(relative(".", normalize(join(dirname(fichier), cible))).split(sep).join("/"));
    }
  }
  return [...vus].sort();
}

export const DEBUT_PRELOAD = "<!-- >>> modulepreload généré par tools/version-sw.mjs — ne pas modifier à la main -->";
export const FIN_PRELOAD = "<!-- <<< fin du bloc généré -->";

export function blocPreload(modules) {
  return [DEBUT_PRELOAD, ...modules.map(m => `  <link rel="modulepreload" href="${m}">`), `  ${FIN_PRELOAD}`].join("\n");
}

/* Les modules préchargés par un index.html. */
export function modulesPrecharges(html) {
  const i = html.indexOf(DEBUT_PRELOAD);
  const j = html.indexOf(FIN_PRELOAD);
  if (i < 0 || j < i) return null;
  return [...html.slice(i, j).matchAll(/rel="modulepreload" href="([^"]+)"/g)].map(m => m[1]);
}
