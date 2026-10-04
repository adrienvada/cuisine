/* Le menu : ses entrées, la composition en cours d'édition, la forme d'un repas et les basiques qu'on peut oublier. */

import { buildCourseList } from "./courses.js";
import { save, state } from "./etat.js";
import { byId, effectiveIngredients, effectiveSteps, selectedAddons, totalTime } from "./recettes.js";

/* Clé unique d'un appareil à l'autre : deux téléphones qui ajoutent chacun une
   entrée ne doivent jamais produire la même adresse une fois synchronisés. */
export const cleMenu = () => "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

/* Une même recette peut revenir deux fois au menu, composée différemment : deux
   cakes, l'un aux olives, l'autre aux lardons. Le menu n'est donc plus une liste
   d'identifiants mais une liste d'ENTRÉES, chacune portant sa composition.
   La fiche, elle, garde un brouillon — ce qu'on compose avant d'ajouter. */

export const entreeDe = k => state.menu.find(e => e.k === k) || null;
export const entreesDe = rid => state.menu.filter(e => e.rid === rid);

/* Rangées dans l'ordre où il faut s'y mettre : la plus longue d'abord, pour que
   tout arrive à table en même temps. À durée égale, l'ordre d'ajout tranche. */
export const menuEntrees = () => state.menu
  .map(e => ({ e, r: byId(e.rid) })).filter(x => x.r)
  .sort((a, b) => totalTime(b.r) - totalTime(a.r));

/* Ajouter, c'est figer la composition du brouillon dans une entrée neuve : une
   seconde version de la même recette ne vient donc pas écraser la première. */
export function ajouterAuMenu(rid) {
  const e = {
    k: cleMenu(), rid,
    choices: { ...(state.choices[rid] || {}) },
    addons: [...(state.addons[rid] || [])],
    portions: state.portions[rid] ?? portionsConvives(rid)
  };
  state.menu.push(e);
  save();
  return e;
}

/* Rend ce qu'il faut pour revenir en arrière (toast « Annuler ») : l'entrée, sa
   place, et l'état du rappel de courses que la disparition du dernier plat efface. */
export function retirerDuMenu(k) {
  const i = state.menu.findIndex(e => e.k === k);
  if (i < 0) return null;
  const retire = { e: state.menu[i], i, hint: state.hintCoursesOff };
  state.menu = state.menu.filter(e => e.k !== k);
  if (!state.menu.length) resetHints();
  save();
  return retire;
}

/* Défaire un retrait : l'entrée reprend sa place telle quelle, avec sa clé — les
   séances de cuisine et les minuteurs qui l'attendent la retrouvent. */
export function remettreAuMenu({ e, i, hint }) {
  if (entreeDe(e.k)) return;
  state.menu.splice(Math.min(i, state.menu.length), 0, e);
  state.hintCoursesOff = hint;
  save();
}

/* La composition courante : celle de l'entrée que l'on édite si l'on en édite
   une, sinon le brouillon de la fiche, rangé sous l'identifiant de la recette.
   La clé de l'entrée éditée se lit par entreeCourante() et s'écrit par
   setEntreeCourante(k) : aucun autre module ne touche la variable elle-même. */
let entreeEnEdition = null;

export const entreeCourante = () => entreeEnEdition;
export const setEntreeCourante = k => { entreeEnEdition = k; };

export function compo(rid) {
  const k = entreeEnEdition;
  const e = k ? entreeDe(k) : null;
  if (e && e.rid === rid) return e;
  return {
    rid,
    get choices() { return state.choices[rid] || (state.choices[rid] = {}); },
    set choices(v) { state.choices[rid] = v; },
    get addons() { return state.addons[rid] || (state.addons[rid] = []); },
    set addons(v) { state.addons[rid] = v; },
    get portions() { return state.portions[rid] ?? null; },
    set portions(v) { state.portions[rid] = v; }
  };
}

export function portionsOf(r, c) { return (c || compo(r.id)).portions ?? r.portions.base; }

export function setChoice(rid, cid, oid) {
  const c = compo(rid);
  c.choices = { ...(c.choices || {}), [cid]: oid };
  save();
}

export function toggleAddon(rid, aid) {
  const c = compo(rid);
  const sel = [...(c.addons || [])];
  const i = sel.indexOf(aid);
  if (i >= 0) sel.splice(i, 1); else sel.push(aid);
  c.addons = sel;
  save();
}

/* ---------- La forme d'un repas ----------
   Le menu dessine parfois un repas de lui-même : quelque chose à l'apéro, puis
   à table, puis un dessert. Dans ce cas — et seulement dans ce cas — le carnet
   se permet de souffler ce qui manque. Un apéro, une salade seule, n'importe
   quelle sélection volontairement partielle : il se tait, et rien ne distingue
   la page de ce qu'elle serait sans ce mécanisme.

   Boissons et sauces accompagnent le repas sans en former un moment : trois
   toasts et un cocktail restent un apéro, une salade et sa vinaigrette restent
   une salade. Les compter réveillerait le mécanisme là où on ne lui demande
   rien — c'est exactement ce qu'il ne doit jamais faire. */

export const MOMENT_TABLE = ["Plats", "Entrées", "Soupes", "Salades"];

export function menuMoments() {
  const cats = new Set(state.menu.map(e => byId(e.rid)).filter(Boolean).map(r => r.category));
  return {
    apero: cats.has("Apéro"),
    table: MOMENT_TABLE.some(c => cats.has(c)),
    dessert: cats.has("Desserts"),
    boisson: cats.has("Boissons")
  };
}

/* Deux moments qui se mangent : le menu a pris la forme d'un repas tout seul. */
export function menuLooksLikeMeal() {
  const m = menuMoments();
  return [m.apero, m.table, m.dessert].filter(Boolean).length >= 2;
}

/* Les moments d'un repas, dans l'ordre. `nom` présente la structure à remplir
   sur un menu vide ; `label` sert quand on signale un manque en cours de route. */
export const MOMENTS = [
  { id: "apero", nom: "Apéro", label: "un apéro", cats: ["Apéro"] },
  { id: "table", nom: "À table", label: "de quoi se mettre à table", cats: MOMENT_TABLE },
  { id: "dessert", nom: "Dessert", label: "un dessert", cats: ["Desserts"] },
  { id: "boisson", nom: "Boisson", label: "une boisson", cats: ["Boissons"] }
];

export const nbRecettes = cats => RECIPES.filter(r => cats.includes(r.category)).length;

/* Où envoyer un moment qui n'a qu'une seule catégorie ; pour « à table », qui
   en a plusieurs (Plats, Entrées, Soupes, Salades), c'est son propre id qui
   sert de filtre — cf. inFilter — pour englober les quatre à la fois plutôt
   que d'envoyer systématiquement sur la mieux fournie. */
export function catDuMoment(x) {
  return x.cats
    .filter(c => RECIPES.some(r => r.category === c))
    .sort((a, b) => nbRecettes([b]) - nbRecettes([a]))[0];
}

/* La cible d'un clic sur une ligne de moment : l'id (filtre multi-catégories)
   s'il y en a plusieurs, sinon directement la catégorie. */
export const cibleDuMoment = x => (x.cats.length > 1 ? x.id : catDuMoment(x));

/* Ce qu'un repas suppose sans qu'aucune recette ne le porte. Le doute profite
   au silence : mieux vaut ne rien dire à tort que proposer du pain à qui a
   prévu une focaccia — d'où des familles de mots larges.

   Le pain y est seul, et c'est voulu. Le fromage a été essayé : il se
   déclenchait à tous les repas, donc plus jamais à propos. Un repas sans
   fromage est complet, comme un repas sans apéro ; un repas sans pain se
   remarque. On ne signale que le trou. */
export const BASIQUES = [
  { id: "pain", chip: "Du pain", article: "Pain",
    re: /pain|baguette|focaccia|brioche|tartine|toast|pita|grissin|craquant|blini|crouton/i }
];

export function basiquesManquants() {
  if (state.hintCoursesOff || !menuLooksLikeMeal()) return [];
  const foin = [
    ...menuEntrees().flatMap(({ r }) => [r.title, r.category, ...(r.tags || [])]),
    ...buildCourseList().map(i => i.label),
    ...state.extras.map(x => x.name)
  ].join(" ");
  return BASIQUES.filter(b => !b.re.test(foin));
}

/* Un menu vidé, c'est un repas qui n'a plus rien à voir avec le précédent :
   les refus qu'on avait opposés aux suggestions n'ont plus lieu d'être. */
export function resetHints() { state.hintCoursesOff = false; }

/* ---------- Le repas ----------
   Le prochain repas : pour combien, à quelle heure, quels allergènes éviter.
   Rien n'est écrit dans l'état tant que personne n'y touche — lireRepas() complète
   à la lecture, ecrireRepas() fixe tout ce qui a été choisi. */

const REPAS_DEFAUT = { convives: null, heure: "20:00", date: "", exclus: [] };
const CONVIVES_MAX = 24;

export const enPersonnes = r => r.portions.label === "personnes";

/* Sans choix explicite, les convives sont ceux que le menu suppose déjà : le
   nombre de personnes le plus courant parmi ses entrées, 4 à défaut. */
export function convivesDuMenu() {
  const nb = new Map();
  for (const e of state.menu) {
    const r = byId(e.rid);
    if (r && enPersonnes(r)) nb.set(portionsOf(r, e), (nb.get(portionsOf(r, e)) || 0) + 1);
  }
  return [...nb].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 4;
}

export function lireRepas() {
  const r = { ...REPAS_DEFAUT, ...(state.repas || {}) };
  return { ...r, exclus: [...r.exclus], convives: r.convives ?? convivesDuMenu() };
}

function ecrireRepas(maj) {
  state.repas = { ...lireRepas(), ...maj };
  save();
}

/* Les portions d'une recette qu'on ajoute alors que les convives sont fixés. */
function portionsConvives(rid) {
  const r = byId(rid);
  return r && enPersonnes(r) && state.repas?.convives ? state.repas.convives : null;
}

/* Régler les convives règle d'un coup les portions de toutes les entrées dont
   l'unité est « personnes » : des tartines ou des verres ne se comptent pas par
   tête, ils gardent leur réglage. */
export function setConvives(n) {
  const convives = Math.min(CONVIVES_MAX, Math.max(1, Math.round(n)));
  ecrireRepas({ convives });
  for (const e of state.menu) {
    const r = byId(e.rid);
    if (r && enPersonnes(r)) e.portions = convives;
  }
  save();
  return convives;
}

export function setHeureRepas(heure) { ecrireRepas({ heure }); }
export function setDateRepas(date) { ecrireRepas({ date }); }

export function basculerExclu(id) {
  const exclus = lireRepas().exclus;
  const i = exclus.indexOf(id);
  if (i >= 0) exclus.splice(i, 1); else exclus.push(id);
  ecrireRepas({ exclus });
}

/* Ce qui, dans une entrée, contient un allergène à éviter — version composée
   comprise (choix et suppléments). Un ingrédient sans `cid` n'a pas été examiné
   dans le référentiel : il ne dit rien, et le panneau des allergies rappelle de
   toujours lire l'étiquette. */
const DU_ALLERGENE = {
  gluten: "du gluten", crustaces: "des crustacés", oeufs: "des œufs", poissons: "du poisson",
  arachides: "des arachides", soja: "du soja", lait: "du lait", "fruits-a-coque": "des fruits à coque",
  celeri: "du céleri", moutarde: "de la moutarde", sesame: "du sésame", sulfites: "des sulfites",
  lupin: "du lupin", mollusques: "des mollusques"
};

export function allergenesDeEntree(r, e, exclus = lireRepas().exclus) {
  if (!exclus.length) return [];
  const trouves = new Map();
  for (const ing of effectiveIngredients(r, e)) {
    for (const id of ALLERGENES[ing.cid] || []) {
      if (!exclus.includes(id)) continue;
      const nom = ing.name.charAt(0).toLowerCase() + ing.name.slice(1) + (ing.optional ? " (facultatif)" : "");
      const liste = trouves.get(id) || trouves.set(id, []).get(id);
      if (!liste.includes(nom)) liste.push(nom);
    }
  }
  return ALLERGENES_LISTE.filter(a => trouves.has(a.id))
    .map(a => ({ id: a.id, label: a.label, phrase: DU_ALLERGENE[a.id] || a.label.toLowerCase(), ingredients: trouves.get(a.id) }));
}

/* ---------- Les repas passés ---------- */

const MAX_HISTORIQUE = 30;

/* L'horloge de l'appareil : la date du jour et les minutes écoulées depuis minuit. */
export function maintenantLocal() {
  const d = new Date();
  const deux = n => String(n).padStart(2, "0");
  return { date: `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`, minutes: d.getHours() * 60 + d.getMinutes() };
}

/* Vider le menu range le repas dans l'historique, avec la composition de chaque
   entrée. Rend l'état d'avant, pour que « Annuler » restaure tel quel — menu,
   coches, historique et repas compris. */
export function viderLeMenu() {
  const avant = JSON.parse(JSON.stringify({
    menu: state.menu, checked: state.checked, hint: state.hintCoursesOff, historique: state.historique, repas: state.repas
  }));
  if (state.menu.length) {
    const repas = lireRepas();
    (state.historique ??= []).unshift({
      id: cleMenu(),
      date: repas.date || maintenantLocal().date,
      convives: repas.convives,
      entrees: state.menu.map(e => ({ rid: e.rid, choices: { ...e.choices }, addons: [...(e.addons || [])], portions: e.portions }))
    });
    state.historique.length = Math.min(state.historique.length, MAX_HISTORIQUE);
    /* La date visée est derrière nous : le prochain repas repart sans. */
    if (state.repas) state.repas.date = "";
  }
  state.menu = [];
  /* Les coches appartenaient à ce repas : remettre la même recette ne doit pas
     la retrouver à moitié cochée. Les articles libres gardent les leurs. */
  for (const cle of Object.keys(state.checked)) if (!cle.startsWith("x-")) delete state.checked[cle];
  resetHints();
  save();
  return avant;
}

export function restaurerMenu(avant) {
  state.menu = avant.menu;
  state.checked = avant.checked;
  state.hintCoursesOff = avant.hint;
  if (avant.historique) state.historique = avant.historique; else delete state.historique;
  if (avant.repas) state.repas = avant.repas; else delete state.repas;
  save();
}

/* « Refaire ce repas » : ses entrées reviennent au menu avec des clés neuves —
   la composition est la même, la séance de cuisine et les minuteurs repartent de
   zéro. Une recette qui n'existe plus est sautée. Rend les clés ajoutées. */
export function refaireRepas(id) {
  const h = (state.historique || []).find(x => x.id === id);
  if (!h) return [];
  const ajoutees = [];
  for (const x of h.entrees) {
    if (!byId(x.rid)) continue;
    const e = { k: cleMenu(), rid: x.rid, choices: { ...x.choices }, addons: [...(x.addons || [])], portions: x.portions };
    state.menu.push(e);
    ajoutees.push(e.k);
  }
  save();
  return ajoutees;
}

export function defaireRefaire(cles) {
  state.menu = state.menu.filter(e => !cles.includes(e.k));
  save();
}

/* ---------- Ce que le rétroplanning reçoit ---------- */

/* Les entrées du menu au format de core/planning.js : leur composition compte,
   un supplément minuté allonge l'étape qu'il enrichit. */
export function tachesDuMenu() {
  return menuEntrees().map(({ e, r }) => ({
    k: e.k,
    titre: r.title,
    temps: r.times,
    supplement: selectedAddons(r, e).reduce((n, a) => n + (a.step?.timer || 0), 0),
    etapes: effectiveSteps(r, e).map(s => ({
      titre: s.t,
      duree: (s.timer || 0) + (s.extras || []).reduce((n, x) => n + (x.timer || 0), 0),
      four: s.four || null,
      prechauffe: s.prechauffe || null
    }))
  }));
}
