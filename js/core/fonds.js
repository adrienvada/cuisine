/* Les fondamentaux vus des recettes : identifiants, liens dans les deux sens, niveau de certitude. */

/* `fond` s'écrit au singulier ou au pluriel : "emulsion" ou ["emulsion", "maillard"]. */
export const fondIds = o => (!o || !o.fond) ? [] : (Array.isArray(o.fond) ? o.fond : [o.fond]);

export const fondById = id => FONDAMENTAUX.find(f => f.id === (FONDAMENTAL_RENAMES[id] || id)) || null;

/* Les fondamentaux d'une étape, dédoublonnés : une étape peut hériter du même
   mécanisme par son emplacement de choix et par son option. */
export const fondsDe = o => [...new Set(fondIds(o).map(id => (fondById(id) || {}).id).filter(Boolean))].map(fondById);

/* Liste inverse — calculée, jamais écrite, exactement comme la liste de courses
   se calcule depuis le menu. Un fondamental ne tient donc aucun registre. */
export function recettesDuFond(id) {
  const vise = f => (FONDAMENTAL_RENAMES[f] || f) === id;
  return RECIPES.filter(r =>
    r.steps.some(s => fondIds(s).some(vise)) ||
    (r.choices || []).some(c => c.options.some(o => fondIds(o.step).some(vise))) ||
    (r.addons || []).some(a => fondIds(a.step).some(vise)));
}

/* Ce que le carnet sait vraiment. Affiché tel quel : une explication inventée
   coûte plus cher qu'un aveu d'ignorance. */
export const CERTITUDES = {
  etabli: { l: "Mécanisme établi", d: "Compris et documenté." },
  partiel: { l: "Partiellement expliqué", d: "On en connaît une partie, le reste est discuté." },
  empirique: { l: "Empirique", d: "Le geste marche, le mécanisme n'est pas élucidé." }
};
