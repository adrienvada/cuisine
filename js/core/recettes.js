/* Les recettes : temps, verdicts, séances déjà cuisinées, et la version composée (choix, suppléments) d'une fiche. */

import { save, state } from "./etat.js";
import { fondIds } from "./fonds.js";
import { fmtDate, rangeTime } from "./format.js";
import { compo } from "./menu.js";

export const byId = id => RECIPES.find(r => r.id === id);

export function totalTime(r) {
  return (r.times.prep || 0) + (r.times.repos || 0) + (r.times.cuisson || 0);
}

/* Temps qu'ajouteraient tous les suppléments minutés (torréfier des graines,
   faire tremper un oignon…). `poste` restreint à « prep », « repos » ou
   « cuisson » ; sans lui, on additionne tout. */
export const addonTime = (r, poste) => (r.addons || []).reduce(
  (n, a) => n + (a.step && a.step.timer && (!poste || a.step.adds === poste) ? a.step.timer : 0), 0);

/* Le total : la recette nue, et jusqu'où elle monte avec tous les petits plus. */
export const totalTimeText = r => rangeTime(totalTime(r), totalTime(r) + addonTime(r));

export const VERDICTS = [
  { id: "encore", label: "♥ Coup de cœur", tag: "♥ Coup de cœur" }
];

export const FAV_FILTER = "coup-de-coeur";

/* Ordre des catégories dans les filtres : celui d'un repas, boissons en dernier. */
export const CATEGORY_ORDER = ["Apéro", "Entrées", "Soupes", "Salades", "Plats", "Sauces", "Desserts", "Boissons"];
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
   → « Hôtel Pla. Vic., Amsterdam ». */
export function abbrevDiscovered(text) {
  const capFirst = s => s.charAt(0).toUpperCase() + s.slice(1);
  const abbrevWord = w => {
    // Contraction (d'Aligre, l'Écailler…) : n'abrège que la partie après l'apostrophe.
    const m = w.match(/^([a-zàâäéèêëïîôöùûüç]['’])(.+)$/i);
    if (m) return m[1] + (m[2].length <= 3 ? m[2] : m[2].slice(0, 3) + ".");
    return w.length <= 3 ? w : w.slice(0, 3) + ".";
  };
  const abbrevPlace = phrase => {
    const [first, ...rest] = phrase.split(/\s+/);
    const kept = rest.length > 2 ? rest.slice(rest.length - 2) : rest;
    return [capFirst(first), ...kept.map(abbrevWord)].join(" ");
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
