/* Les données du carnet pour les tests unitaires : les fichiers js/recipes.js et
   js/fondamentaux.js restent des scripts classiques qui déclarent des globales
   (RECIPES, FONDAMENTAUX…). On les lit comme le font les outils de tools/, avec
   new Function, puis on les pose sur globalThis, où les modules core/ les
   cherchent — à l'appel seulement, jamais au chargement. */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const charger = (fichier, noms) =>
  new Function(readFileSync(path.join(racine, fichier), "utf8") + `;return { ${noms} };`)();

const recettes = charger("js/recipes.js", "RECIPES, RAYONS, RECIPE_RENAMES");
const fondamentaux = charger("js/fondamentaux.js", "FONDAMENTAUX, FAMILLES, FONDAMENTAL_RENAMES");
const figures = charger("js/figures.js", "FIGURES");

Object.assign(globalThis, recettes, fondamentaux, figures);

export const { RECIPES, RAYONS, RECIPE_RENAMES } = recettes;
export const { FONDAMENTAUX, FAMILLES, FONDAMENTAL_RENAMES } = fondamentaux;
export const { FIGURES } = figures;
