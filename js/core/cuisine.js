/* Le calcul du mode cuisine : ingrédients d'une étape, préchauffage, taille du texte, balayage, durées — sans toucher au DOM. */

import { fmtQty, fmtTime, fmtUnit, scaleQty } from "./format.js";
import { dureePrechauffage } from "./planning.js";

/* ---------- Taille du texte ----------
   Trois tailles, gardées dans state.reglages.tailleCuisine. Le lot réglages lit
   la même clé : on tolère donc un nombre (0 à 2) autant qu'un mot, et tout ce
   qui est inconnu retombe sur la taille moyenne plutôt que de casser l'écran. */
export const TAILLES = ["petite", "moyenne", "grande"];

export function indexTaille(valeur) {
  if (Number.isInteger(valeur) && valeur >= 0 && valeur < TAILLES.length) return valeur;
  const i = TAILLES.indexOf(valeur);
  return i === -1 ? 1 : i;
}

/* ---------- Ingrédients ---------- */

/* La quantité écrite comme sur la fiche : mise à l'échelle des portions, ou le
   texte libre (« quelques brins ») quand l'ingrédient n'a pas de quantité chiffrée. */
export function libelleQuantite(ing, f) {
  const q = scaleQty(ing.qty, ing.unit, f, ing.entier);
  return q != null ? `${fmtQty(q)} ${fmtUnit(ing.unit, q)}`.trim() : (ing.qtyText || "");
}

/* Les ingrédients qu'une étape met en œuvre : `ing` les désigne par cid, ou par
   nom exact faute de cid, et se résout dans les ingrédients de la version
   choisie (un ingrédient d'une option non retenue n'y figure tout simplement pas).
   Les suppléments n'ont pas de `ing` : les leurs vont d'office à l'étape qu'ils
   enrichissent, dont l'index est écrêté comme le fait effectiveSteps. */
export function ingredientsDeLEtape(etape, idx, nbEtapes, ingredients, supplements = []) {
  const cites = new Set(etape.ing || []);
  const base = ingredients.filter(i => !i.addon && (cites.has(i.cid) || cites.has(i.name)));
  const ajouts = supplements
    .filter(a => a.step && Math.min(a.step.i, nbEtapes - 1) === idx)
    .flatMap(a => a.ingredients.map(i => ({ ...i, addon: a.label })));
  return [...base, ...ajouts];
}

/* ---------- Préchauffage ---------- */

/* À quelle étape lancer le four, pour qu'il soit chaud à l'étape qui l'utilise
   (`four`) ? On remonte depuis celle-ci en additionnant les minuteurs des étapes
   qui la précèdent : la dernière étape d'où il reste le temps de préchauffage
   (10 à 20 min selon la température, cf. dureePrechauffage) est la bonne. Si
   tout ce qui précède dure moins, on prévient dès la première étape.
   Rien du tout quand une étape qui précède l'étape du four parle déjà de
   préchauffer : le texte fait alors le travail. */
export function planPrechauffage(etapes) {
  const k = etapes.findIndex(s => s.four);
  if (k === -1) return null;
  if (etapes.slice(0, k).some(s => /préchauff/i.test(s.txt || ""))) return null;
  /* Une recette qui préchauffe plus fort qu'elle ne cuit le dit par `prechauffe`. */
  const chaleur = Math.max(etapes[k].four, etapes[k].prechauffe || 0);
  const duree = dureePrechauffage(chaleur);
  let attente = 0, debut = 0;
  for (let i = k - 1; i >= 0; i--) {
    attente += etapes[i].timer || 0;
    if (attente >= duree) { debut = i; break; }
  }
  return { etape: debut, four: k, temperature: chaleur, duree };
}

/* ---------- Balayage ---------- */

const SEUIL_BALAYAGE = 56;

/* Un balayage compte quand il est franchement horizontal : assez long, et deux
   fois plus large que haut — sans quoi un défilement vertical un peu de travers
   changerait d'étape. Renvoie 1 (étape suivante), -1 (précédente) ou 0. */
export function sensBalayage(dx, dy) {
  if (Math.abs(dx) < SEUIL_BALAYAGE || Math.abs(dx) < 2 * Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}

/* ---------- Minuteurs ---------- */

/* Secondes restantes : le reste figé d'un minuteur en pause, sinon l'écart à la fin. */
export function secondesRestantes(t, maintenant = Date.now()) {
  if (t.reste != null) return Math.max(0, Math.round(t.reste / 1000));
  return Math.max(0, Math.round((t.end - maintenant) / 1000));
}

/* « 3 min » : le temps écoulé depuis qu'un minuteur a fini en arrière-plan. */
export function depuisQuand(ms) {
  const min = Math.floor(ms / 60000);
  if (min < 1) return "quelques secondes";
  return fmtTime(min);
}

/* Texte lu à voix haute pour une étape : titre et consigne, sans balisage. */
export function texteALire(titre, txt) {
  const net = String(txt || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return `${titre}. ${net}`;
}
