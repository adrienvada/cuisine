/* Les recettes : temps, verdicts, séances déjà cuisinées, et la version composée (choix, suppléments) d'une fiche. */

import { save, state } from "./etat.js";
import { fondIds } from "./fonds.js";
import { fmtDate, rangeTime } from "./format.js";
import { compo } from "./menu.js";

export const byId = id => RECIPES.find(r => r.id === id);

/* Temps qu'ajoutent les options de choix retenues (pâte maison : 30 min au frais ;
   chèvre gratiné : 6 min de four). Le temps de recette, `times`, décrit la version
   par défaut ; une option plus longue le dit par `step.timer` + `step.adds` (le
   poste où ce temps s'ajoute), exactement comme un supplément. Sans `adds`, le
   minuteur de l'option est déjà compris dans `times`. `conf` : la composition à
   lire, la courante si on l'omet. */
const choiceTime = (r, poste, conf) => choiceList(r).reduce((n, c) => {
  const s = optionOf(r, c, conf).step;
  return n + (s && s.timer && s.adds === poste ? s.timer : 0);
}, 0);

/* Les trois temps de la version composée : la recette, plus ce que ses options
   y ajoutent. `cuisson` reste nul quand rien ne cuit, ni dans la recette ni dans
   les options choisies : « sans cuisson » est une information. */
export function tempsDe(r, conf) {
  const cuisson = choiceTime(r, "cuisson", conf);
  return {
    prep: (r.times.prep || 0) + choiceTime(r, "prep", conf),
    repos: (r.times.repos || 0) + choiceTime(r, "repos", conf),
    cuisson: r.times.cuisson == null && !cuisson ? null : (r.times.cuisson || 0) + cuisson
  };
}

export function totalTime(r, conf) {
  const t = tempsDe(r, conf);
  return t.prep + t.repos + (t.cuisson || 0);
}

/* Temps qu'ajouteraient tous les suppléments minutés (torréfier des graines,
   faire tremper un oignon…). Un supplément « pendant » (`repos: "pendant"`, l'oignon
   qui trempe pendant que les lentilles cuisent) n'allonge rien : il n'est pas compté.
   `poste` restreint à « prep », « repos » ou
   « cuisson » ; sans lui, on additionne tout. */
export const addonTime = (r, poste) => (r.addons || []).reduce(
  (n, a) => n + (a.step && a.step.timer && a.step.repos !== "pendant" && (!poste || a.step.adds === poste) ? a.step.timer : 0), 0);

/* Le total : la version composée (choix par défaut tant qu'on n'en a pas fait
   d'autre), et jusqu'où elle monte avec tous les petits plus. */
export const totalTimeText = (r, conf) => rangeTime(totalTime(r, conf), totalTime(r, conf) + addonTime(r));

export const VERDICTS = [
  { id: "encore", label: "♥ Coup de cœur", tag: "♥ Coup de cœur" }
];

export const FAV_FILTER = "coup-de-coeur";

/* Ordre des catégories dans les filtres : celui d'un repas, boissons en dernier. */
const CATEGORY_ORDER = ["Apéro", "Entrées", "Soupes", "Salades", "Plats", "Sauces", "Desserts", "Boissons"];
export const byCategoryOrder = (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b);

export const verdictOf = r => state.notes[r.id] || null;

export const isFav = r => state.notes[r.id] === "encore";

export const cookedOf = r => state.cooked[r.id] || { count: 0, last: null };

export function markCooked(id) {
  const c = state.cooked[id] || { count: 0, last: null };
  c.count += 1;
  c.last = Date.now();
  state.cooked[id] = c;
  save();
}

export function cookedText(id) {
  const c = state.cooked[id];
  if (!c || !c.count) return "Pas encore cuisinée depuis le carnet.";
  if (c.count === 1) return `Cuisinée une fois, le ${fmtDate(c.last)}.`;
  return `Cuisinée ${c.count} fois · la dernière le ${fmtDate(c.last)}.`;
}

/* Version abrégée de `discovered` pour la pastille des vignettes :
   sans article/préposition d'intro, et sans détail superflu — juste
   « Lieu, Ville ». Ex. « à l'hôtel Park Plaza Victoria, à Amsterdam »
   → « Plaza Victoria, Amsterdam ». On retire des mots, jamais des lettres :
   « Pla. Vic. » ne se lisait pas, et la pastille tient en deux lignes. */
export function abbrevDiscovered(text) {
  const capFirst = s => s.charAt(0).toUpperCase() + s.slice(1);
  const abbrevPlace = phrase => {
    const mots = phrase.split(/\s+/);
    // Au-delà de trois mots, seuls les deux derniers (le nom propre) disent encore le lieu.
    return capFirst((mots.length > 3 ? mots.slice(-2) : mots).join(" "));
  };
  const stripped = text.replace(/^\s*(à l['’]|au\s|à la\s|aux\s|chez\s|du\s|des\s|de l['’]|en\s|à\s)/i, "").trim();
  const commaIdx = stripped.indexOf(",");
  if (commaIdx === -1) return abbrevPlace(stripped);
  const place = stripped.slice(0, commaIdx).trim();
  const cityWords = stripped.slice(commaIdx + 1).trim().split(/\s+/);
  const city = capFirst(cityWords[cityWords.length - 1].replace(/[.,;:]+$/, ""));
  return `${abbrevPlace(place)}, ${city}`;
}

/* ---------- Composer sa version : choix (vinaigrette…) et suppléments ----------
   La version choisie vit dans state.choices / state.addons ; ingrédients et
   étapes « effectifs » en découlent partout (recette, cuisine, partage, courses). */

export const choiceList = r => r.choices || [];
export const addonList = r => r.addons || [];
export const customizable = r => choiceList(r).length || addonList(r).length;

/* `c` : la composition à lire. Omise, c'est la courante — mais la liste de
   courses parcourt plusieurs entrées d'affilée et doit la passer explicitement. */
export function optionOf(r, choice, c) {
  const sel = ((c || compo(r.id)).choices || {})[choice.id];
  return choice.options.find(o => o.id === sel) || choice.options[0];
}

export function selectedAddons(r, c) {
  const sel = (c || compo(r.id)).addons || [];
  return addonList(r).filter(a => sel.includes(a.id));
}

/* Ingrédients réellement nécessaires : base + option choisie de chaque groupe + suppléments. */
export function effectiveIngredients(r, conf) {
  const list = [...r.ingredients];
  for (const c of choiceList(r)) list.push(...optionOf(r, c, conf).ingredients);
  for (const a of selectedAddons(r, conf)) list.push(...a.ingredients.map(i => ({ ...i, addon: a.label })));
  return list;
}

/* Étapes réellement suivies : les emplacements `{choice}` prennent l'étape de
   l'option choisie, et chaque supplément vient enrichir la sienne (`extras`). */
export function effectiveSteps(r, conf) {
  const steps = r.steps.map(s => {
    if (!s.choice) return { ...s };
    const c = choiceList(r).find(x => x.id === s.choice);
    if (!c) return { ...s };
    /* L'emplacement de choix peut porter ses propres fondamentaux — l'émulsion
       vaut pour les trois vinaigrettes. On les réunit à ceux de l'option plutôt
       que de les perdre en écrasant l'étape. */
    const opt = optionOf(r, c, conf).step;
    return { ...opt, fond: [...fondIds(s), ...fondIds(opt)] };
  });
  for (const a of selectedAddons(r, conf)) {
    if (!a.step) continue;
    const s = steps[Math.min(a.step.i, steps.length - 1)];
    (s.extras = s.extras || []).push({ id: a.id, emoji: a.emoji, label: a.label, txt: a.step.txt, timer: a.step.timer, fond: a.step.fond });
  }
  return steps;
}

/* Résumé lisible de la version : « Citron & menthe · + tomates cerises, avocat » */
export function versionSummary(r, conf) {
  const parts = choiceList(r).map(c => optionOf(r, c, conf).label);
  const adds = selectedAddons(r, conf).map(a => a.label.toLowerCase());
  if (adds.length) parts.push("+ " + adds.join(", "));
  return parts.join(" · ");
}
