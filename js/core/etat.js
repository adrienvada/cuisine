/* État persistant : ce que le carnet retient d'une visite à l'autre, sa sauvegarde et les migrations des anciens formats. */

import { cleMenu } from "./menu.js";

export const STORE_KEY = "carnet-cuisine-v1";

/* Hors navigateur (les tests tournent sous Node), il n'y a pas de localStorage :
   l'état part alors vide au lieu de faire planter le chargement du module. */
const enregistre = typeof localStorage !== "undefined" ? JSON.parse(localStorage.getItem(STORE_KEY) || "{}") : {};

export const state = Object.assign(
  { portions: {}, menu: [], checked: {}, extras: [], filter: "Toutes", query: "", notes: {}, cooked: {}, timers: [], choices: {}, addons: {}, cooking: {}, fondQuery: "", hintCoursesOff: false },
  enregistre
);

/* Qui veut savoir qu'on vient de sauvegarder (la synchro, aujourd'hui) s'abonne
   ici plutôt que d'être appelé par son nom : l'état n'a ainsi à connaître aucun
   de ses lecteurs. */
const abonnes = [];
export const surSauvegarde = fn => { abonnes.push(fn); };

export function save() {
  if (typeof localStorage !== "undefined") localStorage.setItem(STORE_KEY, JSON.stringify(state));
  for (const fn of abonnes) fn();
}

/* Les migrations ne s'exécutent plus au chargement du module : main.js les lance
   une fois, avant le premier rendu. Les données globales qu'elles lisent
   (RECIPE_RENAMES) n'ont ainsi besoin d'exister qu'à cet instant. */
export function migrer() {
  migrerAjouts();
  migrerMenuEnEntrees();
  migrerRenommages();
}

/* Le menu est la source : la liste de courses en découle.
   Avant, les recettes vivaient dans `added` ({id: true}), accroché aux courses —
   on récupère ce qui s'y trouvait pour ne rien perdre. */
function migrerAjouts() {
  if (!Array.isArray(state.menu)) state.menu = [];
  if (state.added) {
    for (const id of Object.keys(state.added)) if (!state.menu.includes(id)) state.menu.push(id);
    delete state.added;
    save();
  }
}

function migrerMenuEnEntrees() {
  if (!state.menu.some(e => typeof e === "string")) return;
  state.menu = state.menu.map(e => typeof e === "object" ? e : ({
    k: cleMenu(), rid: e,
    choices: { ...(state.choices[e] || {}) },
    addons: [...(state.addons[e] || [])],
    portions: state.portions[e] ?? null
  }));
  save();
}

/* Recettes renommées : tout ce qui était rangé sous l'ancien identifiant suit,
   sans quoi un renommage effacerait verdicts, compteurs et menu en cours. */
function migrerRenommages() {
  let bouge = false;
  for (const [ancien, actuel] of Object.entries(RECIPE_RENAMES)) {
    for (const table of ["portions", "notes", "cooked", "cooking", "choices", "addons"]) {
      const t = state[table];
      if (!t || !(ancien in t)) continue;
      if (!(actuel in t)) t[actuel] = t[ancien];   // l'existant l'emporte
      delete t[ancien];
      bouge = true;
    }
    for (const t of state.timers) if (t.rid === ancien) { t.rid = actuel; bouge = true; }
  }
  for (const e of state.menu) {
    if (RECIPE_RENAMES[e.rid]) { e.rid = RECIPE_RENAMES[e.rid]; bouge = true; }
  }
  if (bouge) save();
}
