/* La recherche de l'accueil : texte normalisé des recettes, filtres de régime, de temps et de saison, ingrédients du « J'ai… ». Calculs seuls, sans DOM — les tests unitaires les importent tels quels. */

import { fondsDe } from "./fonds.js";
import { normaliser } from "./format.js";
import { addonList, choiceList, totalTime } from "./recettes.js";

/* Toutes les étapes qu'une recette peut jouer : la base, chaque option de
   choix, chaque supplément. Un four caché dans une option compte comme un four. */
const etapesDe = r => [...r.steps, ...(r.choices || []).flatMap(c => c.options.map(o => o.step)),
  ...(r.addons || []).map(a => a.step)].filter(Boolean);

/* Le foin d'une recette, déjà normalisé : l'accueil le calcule une fois par
   visite, puis chaque frappe n'a plus qu'à chercher des mots dedans. Les
   fondamentaux y entrent : chercher « émulsion » ramène les recettes où l'on
   en fait une, pas seulement celles qui écrivent le mot. */
export function foinDe(r) {
  const fonds = etapesDe(r).flatMap(s => fondsDe(s).map(f => f.t));
  return normaliser([r.title, r.subtitle, r.category, ...(r.tags || []), ...r.ingredients.map(i => i.name),
    ...addonList(r).map(a => a.label),
    ...choiceList(r).flatMap(c => c.options.map(o => o.label)), ...fonds].join(" "));
}

/* Les mots d'une recherche, normalisés comme le foin : « Crème  OEUF » → ["creme", "oeuf"]. */
export const motsDe = q => normaliser(q).split(/\s+/).filter(Boolean);

export const trouve = (foin, mots) => mots.every(m => foin.includes(m));

/* Les cid de la recette « de base » : sa version par défaut, sans choix ni supplément. */
const cles = r => r.ingredients.map(i => i.cid).filter(Boolean);

export const estVegetarien = r => !cles(r).some(c => NON_VEGETARIEN.includes(c));

export const estRapide = r => totalTime(r) <= 30;

export const sansFour = r => !etapesDe(r).some(s => s.four);

export const sansCuisson = r => r.times.cuisson == null;

/* De saison : au moins un ingrédient dont la saison compte, et tous ceux-là en
   saison. Une recette sans fruit ni légume frais ne dépend pas de la saison —
   elle n'est pas « de saison » pour autant. `mois` va de 1 à 12. */
export function estDeSaison(r, mois) {
  const saisonniers = cles(r).filter(c => SAISONS[c]);
  return saisonniers.length > 0 && saisonniers.every(c => SAISONS[c].includes(mois));
}

/* Les filtres cumulables, dans l'ordre des puces. `mois` n'est lu que par « De saison ». */
export const FILTRES = [
  { id: "vegetarien", label: "Végétarien", test: estVegetarien },
  { id: "rapide", label: "Rapide", test: estRapide },
  { id: "sans-four", label: "Sans four", test: sansFour },
  { id: "sans-cuisson", label: "Sans cuisson", test: sansCuisson },
  { id: "de-saison", label: "De saison", test: estDeSaison }
];

/* ---------- « J'ai… » ---------- */

/* Un ingrédient se reconnaît à son cid, ou à son nom quand il n'en a pas. */
export const cleIngredient = i => i.cid || normaliser(i.name);

/* Le fond de placard (sel, huile, farine…) est chez tout le monde : il ne dirait
   rien du plat. On l'écarte du choix comme du « 3 / 5 ». */
const estPlacard = i => i.cid && PLACARD.includes(i.cid);

export function ingredientsJai(r) {
  const vus = new Set();
  return r.ingredients.filter(i => !estPlacard(i)).map(cleIngredient).filter(c => !vus.has(c) && vus.add(c));
}

/* Le catalogue à choisir : un ingrédient par cid, sous son nom le plus court
   (« Farine » plutôt que « Farine T55 ou T65 »), trié sans égard aux accents. */
export function catalogueJai(recettes) {
  const noms = new Map();
  for (const r of recettes) {
    for (const i of r.ingredients) {
      if (estPlacard(i)) continue;
      const cle = cleIngredient(i);
      if (!noms.has(cle) || i.name.length < noms.get(cle).length) noms.set(cle, i.name);
    }
  }
  return [...noms].map(([cle, label]) => ({ cle, label, norm: normaliser(label) }))
    .sort((a, b) => a.norm.localeCompare(b.norm));
}

/* « 3 / 5 » : combien d'ingrédients de la recette figurent dans la sélection. */
export function scoreJai(r, selection) {
  const tous = ingredientsJai(r);
  return { trouves: tous.filter(c => selection.has(c)).length, total: tous.length };
}
