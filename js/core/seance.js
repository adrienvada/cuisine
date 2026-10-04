/* La cuisine en cours : où l'on en est dans chaque recette entamée, et la reprise automatique. */

import { save, state } from "./etat.js";
import { entreeCourante } from "./menu.js";

/* ---------- Cuisine en cours ----------
   Où l'on en est dans chaque recette entamée, pour pouvoir reprendre après
   être allé voir ailleurs. Oubliée à « Terminer », à « Repartir du début »,
   ou d'elle-même au bout de 12 h — inutile de proposer de reprendre un repas
   d'avant-hier. */

export const COOKING_TTL = 12 * 3600 * 1000;

/* Deux cakes au menu, c'est deux séances de cuisine distinctes : ce qui est en
   cours se range sous la clé de l'entrée, et sous l'identifiant de la recette
   seulement quand on cuisine hors menu. */
export const cleCuisine = (r, k) => (k !== undefined ? k : entreeCourante()) || r.id;

export function cookingStep(r, k) {
  const cle = cleCuisine(r, k);
  const c = state.cooking[cle];
  if (!c) return null;
  /* Expirée : lue comme absente, sans rien écrire. Cette fonction sert au
     rendu, et une sauvegarde qui lève au milieu d'un rendu casserait la page ;
     setCooking() balaie les séances périmées à la prochaine action. */
  if (Date.now() - c.at > COOKING_TTL) return null;
  return Math.min(c.step, r.steps.length - 1);
}

export function setCooking(id, step) {
  const maintenant = Date.now();
  for (const [cle, c] of Object.entries(state.cooking)) if (maintenant - c.at > COOKING_TTL) delete state.cooking[cle];
  state.cooking[id] = { step, at: maintenant };
  save();
}

export function forgetCooking(id) { delete state.cooking[id]; save(); }

/* Adresse du mode cuisine : sur l'étape en cours s'il y en a une. */
export function cookHref(r, k) {
  const step = cookingStep(r, k);
  const base = k ? `#/recette/${r.id}/m/${k}` : `#/recette/${r.id}`;
  return `${base}/cuisine${step ? "/" + step : ""}`;
}

/* Un minuteur appartient à une séance : celle d'une entrée de menu, ou celle de
   la recette seule. Sans quoi le cake aux olives rappellerait celui aux lardons. */
export const hasRunningTimer = cle => state.timers.some(t => (t.mk || t.rid) === cle);

/* Fermer avec la croix, c'est vouloir sortir : sans ce garde-fou, la reprise
   automatique renverrait aussitôt dans le mode cuisine qu'on vient de quitter.
   Levé dès qu'on y retourne de soi-même. */
export const noAutoResume = new Set();

/* Un minuteur qui tourne signe une vraie séance de cuisine : on y retourne
   directement. Sinon, la fiche s'ouvre normalement avec un bouton Reprendre. */
export function autoResumeStep(r) {
  const cle = cleCuisine(r);
  if (noAutoResume.has(cle) || !hasRunningTimer(cle)) return null;
  return cookingStep(r);
}
