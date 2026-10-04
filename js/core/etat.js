/* État persistant : ce que le carnet retient d'une visite à l'autre, sa sauvegarde et les migrations des anciens formats. */

import { cleMenu } from "./menu.js";
import { normaliserEtat } from "./sauvegarde.js";

export const STORE_KEY = "carnet-cuisine-v1";

/* Où la copie brute d'un stockage illisible est mise de côté, pour qu'on puisse la récupérer à la main. */
export const CLE_ILLISIBLE = STORE_KEY + "-illisible";

/* Hors navigateur (les tests tournent sous Node) il n'y a pas de localStorage, et
   dans un navigateur qui refuse le stockage (Safari, cookies bloqués) c'est
   l'accès à la propriété elle-même qui lève : dans les deux cas, pas de
   stockage, et l'appli tourne quand même, en mémoire. */
function stockage() {
  try { return typeof localStorage !== "undefined" ? localStorage : null; } catch { return null; }
}

let secours = false;   // vrai si le stockage n'a pas pu être lu : l'état de départ n'est pas celui de l'utilisateur

/* Ce que le stockage garde, nettoyé. Un stockage illisible (JSON cassé, accès
   refusé) ne doit jamais empêcher le démarrage : l'appli repart d'un carnet
   vide, et la copie brute passe sous une autre clé plutôt que d'être écrasée
   par la première sauvegarde. */
export function lireEtat(s = stockage()) {
  if (!s) return {};
  let brut;
  try { brut = s.getItem(STORE_KEY); } catch { secours = true; return {}; }
  if (brut == null || brut === "") return {};
  try {
    const o = JSON.parse(brut);
    if (o === null || typeof o !== "object" || Array.isArray(o)) throw new Error("pas un objet");
    return normaliserEtat(o);
  } catch {
    secours = true;
    try { s.setItem(CLE_ILLISIBLE, brut); } catch { /* rien de plus à tenter */ }
    return {};
  }
}

/* Vrai quand l'état n'est sans doute pas ce que l'utilisateur a rangé (stockage
   illisible, ou copie illisible encore à sa place) : ce qui se déduit de « il
   n'y a rien dans le carnet », comme la purge des photos, doit alors s'abstenir. */
export function etatDeSecours() {
  if (secours) return true;
  try { return !!stockage()?.getItem(CLE_ILLISIBLE); } catch { return true; }
}

export const state = Object.assign(
  { portions: {}, menu: [], checked: {}, extras: [], filter: "Toutes", notes: {}, cooked: {}, timers: [], choices: {}, addons: {}, cooking: {}, fondQuery: "", hintCoursesOff: false },
  lireEtat()
);

/* Qui veut savoir qu'on vient de sauvegarder (la synchro, aujourd'hui) s'abonne
   ici plutôt que d'être appelé par son nom : l'état n'a ainsi à connaître aucun
   de ses lecteurs. */
const abonnes = [];
export const surSauvegarde = fn => { abonnes.push(fn); };

/* Même principe pour l'échec d'écriture (stockage plein ou refusé) : l'état est
   sans DOM, c'est main.js qui relie l'abonné au toast. Appelé à chaque échec ; c'est
   à l'abonné de ne pas répéter son message. */
const abonnesEchec = [];
export const surEchecSauvegarde = fn => { abonnesEchec.push(fn); };

/* L'écriture peut échouer sans que l'action en cours n'y soit pour rien : elle
   continue, en mémoire. Les abonnés sont appelés quand même — la synchro peut,
   elle, conserver les données ailleurs. */
export function save() {
  const s = stockage();
  if (s) {
    try { s.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) {
      for (const fn of abonnesEchec) { try { fn(e); } catch (err) { console.error(err); } }
    }
  }
  for (const fn of abonnes) { try { fn(); } catch (e) { console.error(e); } }
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
