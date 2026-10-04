/* Le journal, côté pur : dates en clair et tri des entrées d'une recette.
   La vue (js/vues/journal.js) garde les photos, les feuilles et le dessin. */

import { state } from "./etat.js";
import { fmtDate } from "./format.js";

/* ---------- Dates ---------- */

const deuxChiffres = n => String(n).padStart(2, "0");
const formaterJour = d => `${d.getFullYear()}-${deuxChiffres(d.getMonth() + 1)}-${deuxChiffres(d.getDate())}`;
export const aujourdhui = () => formaterJour(new Date());

/* « AAAA-MM-JJ » lu comme un jour local : new Date("2026-03-04") serait minuit UTC,
   donc la veille au soir sous un fuseau à l'ouest. */
function lireJour(date) {
  const [a, m, j] = String(date).split("-").map(Number);
  return new Date(a, (m || 1) - 1, j || 1);
}

export function dateEnClair(date, aujourd = aujourdhui()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return "";
  const ecart = Math.round((lireJour(aujourd) - lireJour(date)) / 864e5);
  if (ecart === 0) return "Aujourd'hui";
  if (ecart === 1) return "Hier";
  return fmtDate(lireJour(date));
}

/* ---------- Entrées ---------- */

const entrees = () => (state.journal ??= []);

/* Du plus récent au plus ancien ; à date égale, la dernière ajoutée d'abord. */
export function entreesDe(rid, liste = entrees()) {
  return liste.map((e, i) => ({ e, i }))
    .filter(({ e }) => e.rid === rid)
    .sort((a, b) => (a.e.date < b.e.date ? 1 : a.e.date > b.e.date ? -1 : b.i - a.i))
    .map(({ e }) => e);
}
