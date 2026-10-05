/* Les fondamentaux vus des recettes : identifiants, chargement à la demande, niveau de
   certitude. Ce module est sur le chemin de l'accueil (le routeur, la recherche par
   mécanisme) : ce que seules les pages des Savoirs lisent — les figures d'une fiche, les
   recettes d'un savoir, la recherche des Savoirs — est dans core/savoirs.js. */

/* js/fondamentaux.js (le plus gros fichier du carnet) n'est plus lu au
   démarrage : le script est injecté à la demande, une seule fois. D'ici là ses
   globales n'existent pas, et tout accès d'ici les lit à travers `typeof` —
   une référence nue lèverait une ReferenceError. */
export const fondamentauxCharges = () => typeof FONDAMENTAUX !== "undefined";

/* Tous les fondamentaux, ou rien tant qu'ils ne sont pas arrivés. */
export const fondsTous = () => (fondamentauxCharges() ? FONDAMENTAUX : []);

export const fondRenames = () => (typeof FONDAMENTAL_RENAMES !== "undefined" ? FONDAMENTAL_RENAMES : {});

/* js/figures.js — les schémas des fiches — suit le même chemin, mais n'est qu'un
   bonus : sans lui (hors ligne, fichier absent du cache, erreur), les fiches
   s'affichent exactement comme avant. */
export const figuresChargees = () => typeof FIGURES !== "undefined";

/* Les figures n'attendent qu'un instant derrière les fondamentaux : au-delà, la
   fiche se dessine sans elles plutôt que de patienter pour un bonus. Si elles arrivent
   ensuite, l'évènement « figures-chargees » le dit : la fiche ouverte se complète
   (js/vues/savoirs.js, completerFigures). */
const DELAI_FIGURES = 1200;

/* Un script classique injecté : la promesse échoue si le fichier ne vient pas (absent, hors ligne). */
function injecter(src) {
  return new Promise((ok, ko) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => ok();
    script.onerror = () => { script.remove(); ko(new Error(src + " introuvable")); };
    document.head.appendChild(script);
  });
}

/* La promesse est gardée : deux appels (le routeur qui en a besoin, le
   préchargement du démarrage) n'injectent qu'un script. Un échec — hors ligne,
   fichier absent du cache — l'oublie, pour qu'un nouvel essai reparte de zéro.
   Les deux scripts partent en parallèle ; seuls les fondamentaux comptent : un
   échec ou une lenteur des figures est absorbé (elles seront là à la fois
   suivante, ou jamais, sans que rien ne casse). */
let chargement = null;
export function chargerFondamentaux() {
  if (fondamentauxCharges()) return Promise.resolve();
  if (!chargement) {
    let delaiPasse = false;
    const figures = figuresChargees() ? Promise.resolve()
      : injecter("js/figures.js").catch(() => {});
    const fonds = injecter("js/fondamentaux.js");
    chargement = fonds.then(
      () => Promise.race([figures, new Promise(fin => setTimeout(() => { delaiPasse = true; fin(); }, DELAI_FIGURES))]),
      err => { chargement = null; throw err; }
    ).then(() => {
      document.dispatchEvent(new Event("fondamentaux-charges"));
      /* Arrivées après le délai : la page déjà dessinée sans elles se complète. */
      if (delaiPasse) figures.then(() => { if (figuresChargees()) document.dispatchEvent(new Event("figures-chargees")); });
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

/* Ce que le carnet sait vraiment. Affiché tel quel : une explication inventée
   coûte plus cher qu'un aveu d'ignorance. */
export const CERTITUDES = {
  etabli: { l: "Mécanisme établi", d: "Compris et documenté." },
  partiel: { l: "Partiellement expliqué", d: "On en connaît une partie, le reste est discuté." },
  empirique: { l: "Empirique", d: "Le geste marche, le mécanisme n'est pas élucidé." }
};
