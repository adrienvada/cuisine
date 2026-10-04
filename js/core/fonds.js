/* Les fondamentaux vus des recettes : identifiants, liens dans les deux sens, niveau de certitude. */

import { normaliser } from "./format.js";

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

/* Les figures d'un fondamental : un tableau, vide si le fichier n'est pas là ou
   si la fiche n'en a pas. Jamais d'exception. */
export function figuresDe(id) {
  if (!figuresChargees() || !FIGURES) return [];
  const liste = FIGURES[fondRenames()[id] || id];
  return Array.isArray(liste) ? liste : [];
}

/* Les figures n'attendent qu'un instant derrière les fondamentaux : au-delà, la
   fiche se dessine sans elles plutôt que de patienter pour un bonus. */
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
    const figures = figuresChargees() ? Promise.resolve()
      : injecter("js/figures.js").catch(() => {});
    const fonds = injecter("js/fondamentaux.js");
    chargement = fonds.then(
      () => Promise.race([figures, new Promise(fin => setTimeout(fin, DELAI_FIGURES))]),
      err => { chargement = null; throw err; }
    ).then(() => { document.dispatchEvent(new Event("fondamentaux-charges")); });
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

/* La recherche des Savoirs, pure : elle vit ici plutôt que dans la vue pour se
   tester sous Node. Le texte où l'on cherche est normalisé une fois pour
   toutes — le refaire à chaque lettre tapée, pour une quarantaine de
   fondamentaux, serait du travail perdu — et rempli à la première recherche,
   les données n'arrivant qu'à la demande. */
const foins = new Map();
const foinDe = f => {
  if (!foins.has(f.id)) {
    foins.set(f.id, normaliser([f.t, f.accroche, f.pourquoi, f.famille, f.piege,
      ...(f.cas || []).flatMap(c => [c.q, c.r]), ...(f.reperes || [])].join(" ")));
  }
  return foins.get(f.id);
};

export const fondMatches = (f, q) => {
  if (!q) return true;
  const foin = foinDe(f);
  return normaliser(q).split(/\s+/).filter(Boolean).every(w => foin.includes(w));
};
