/* Ce que lisent les pages des Savoirs (et la feuille d'un savoir, depuis une fiche ou le mode
   cuisine) : les figures d'un fondamental, les recettes qui l'emploient, la recherche. À part
   de core/fonds.js pour rester hors du chemin de l'accueil : seul js/vues/savoirs.js l'importe. */

import { figuresChargees, fondIds, fondRenames } from "./fonds.js";
import { normaliser } from "./format.js";

/* Les figures d'un fondamental : un tableau, vide si le fichier n'est pas là ou
   si la fiche n'en a pas. Jamais d'exception. */
const AUCUNE = Object.freeze([]);
export function figuresDe(id) {
  if (!figuresChargees() || !FIGURES) return AUCUNE;
  const liste = FIGURES[fondRenames()[id] || id];
  return Array.isArray(liste) ? liste : AUCUNE;
}

/* Liste inverse — calculée, jamais écrite, exactement comme la liste de courses
   se calcule depuis le menu. Un fondamental ne tient donc aucun registre. */
export function recettesDuFond(id) {
  const vise = f => (fondRenames()[f] || f) === id;
  return RECIPES.filter(r =>
    r.steps.some(s => fondIds(s).some(vise)) ||
    (r.choices || []).some(c => c.options.some(o => fondIds(o.step).some(vise))) ||
    (r.addons || []).some(a => fondIds(a.step).some(vise)));
}

/* La recherche des Savoirs, pure : elle vit ici plutôt que dans la vue pour se
   tester sous Node. Le texte où l'on cherche est normalisé une fois pour
   toutes — le refaire à chaque lettre tapée, pour une quarantaine de
   fondamentaux, serait du travail perdu — et rempli à la première recherche,
   les données n'arrivant qu'à la demande. Il couvre aussi les titres et les
   légendes des figures de la fiche ; comme js/figures.js peut arriver après les
   fondamentaux, le cache retient la LISTE de figures qu'il a lue, et se refait
   quand elle change (arrivée tardive, ou nouveau fichier). */
const foins = new Map();
const foinDe = f => {
  const figures = figuresDe(f.id);
  const vu = foins.get(f.id);
  if (!vu || vu.liste !== figures) {
    foins.set(f.id, { liste: figures, texte: normaliser([f.t, f.accroche, f.pourquoi, f.famille, f.piege,
      ...(f.cas || []).flatMap(c => [c.q, c.r]), ...(f.reperes || []),
      ...figures.flatMap(g => [g && g.titre, g && g.legende])].filter(Boolean).join(" ")) });
  }
  return foins.get(f.id).texte;
};

export const fondMatches = (f, q) => {
  if (!q) return true;
  const foin = foinDe(f);
  return normaliser(q).split(/\s+/).filter(Boolean).every(w => foin.includes(w));
};
