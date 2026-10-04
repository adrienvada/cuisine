/* Les fondamentaux vus des recettes : identifiants, liens dans les deux sens, niveau de certitude. */

/* js/fondamentaux.js (le plus gros fichier du carnet) n'est plus lu au
   démarrage : le script est injecté à la demande, une seule fois. D'ici là ses
   globales n'existent pas, et tout accès d'ici les lit à travers `typeof` —
   une référence nue lèverait une ReferenceError. */
export const fondamentauxCharges = () => typeof FONDAMENTAUX !== "undefined";

/* Tous les fondamentaux, ou rien tant qu'ils ne sont pas arrivés. */
export const fondsTous = () => (fondamentauxCharges() ? FONDAMENTAUX : []);

export const fondRenames = () => (typeof FONDAMENTAL_RENAMES !== "undefined" ? FONDAMENTAL_RENAMES : {});

/* La promesse est gardée : deux appels (le routeur qui en a besoin, le
   préchargement du démarrage) n'injectent qu'un script. Un échec — hors ligne,
   fichier absent du cache — l'oublie, pour qu'un nouvel essai reparte de zéro. */
let chargement = null;
export function chargerFondamentaux() {
  if (fondamentauxCharges()) return Promise.resolve();
  if (!chargement) {
    chargement = new Promise((ok, ko) => {
      const script = document.createElement("script");
      script.src = "js/fondamentaux.js";
      script.onload = () => { document.dispatchEvent(new Event("fondamentaux-charges")); ok(); };
      script.onerror = () => { script.remove(); chargement = null; ko(new Error("fondamentaux.js introuvable")); };
      document.head.appendChild(script);
    });
  }
  return chargement;
}

/* `fond` s'écrit au singulier ou au pluriel : "emulsion" ou ["emulsion", "maillard"]. */
export const fondIds = o => (!o || !o.fond) ? [] : (Array.isArray(o.fond) ? o.fond : [o.fond]);

export const fondById = id => fondsTous().find(f => f.id === (fondRenames()[id] || id)) || null;

/* Les fondamentaux d'une étape, dédoublonnés : une étape peut hériter du même
   mécanisme par son emplacement de choix et par son option. */
export const fondsDe = o => [...new Set(fondIds(o).map(id => (fondById(id) || {}).id).filter(Boolean))].map(fondById);

/* Liste inverse — calculée, jamais écrite, exactement comme la liste de courses
   se calcule depuis le menu. Un fondamental ne tient donc aucun registre. */
export function recettesDuFond(id) {
  const vise = f => (fondRenames()[f] || f) === id;
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
