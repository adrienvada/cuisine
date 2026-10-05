/* La complétude d'un repas : ce que les plats du menu apportent (js/apports.js), ce
   qui manque encore pour faire un repas complet, et les recettes du carnet qui le
   combleraient. C'est une autre façon de compléter le menu que ses moments (apéro, à
   table, dessert) : celle-ci regarde ce qu'il y a dans les assiettes.

   Calculs seuls, sans DOM : les tests unitaires les importent tels quels. Ce module,
   et js/apports.js qu'il importe, ne sont pas sur le chemin de l'accueil : seule la vue
   du menu les charge.

   Le doute profite au silence, comme pour les moments du repas : un apéro, un dessert,
   une sauce seule ne manquent de rien. Le carnet ne parle que quand le menu contient
   un plat qui se mange à table, ou un apéro assez fourni pour faire un dîner. */

import { APPORTS } from "../apports.js";
import { allergenesDeEntree, MOMENT_TABLE } from "./menu.js";
import { nomCourt } from "./planning.js";
import { estDeSaison, sansFour } from "./recherche.js";
import { effectiveIngredients, totalTime } from "./recettes.js";

/* Ce qui accompagne un repas sans en être un plat : jamais compté, jamais proposé. */
const ACCOMPAGNE = ["Boissons", "Sauces"];

/* Les manques, dans l'ordre où la phrase les dit, et ce qu'en dit l'étiquette d'une
   recette proposée. */
export const MANQUES = ["legumes", "proteines", "feculents", "frais"];

export const ETIQUETTES = { legumes: "légumes", proteines: "protéines", feculents: "de quoi caler", frais: "fraîcheur" };

/* Un apéro qui fait dîner : trois plats salés au moins. */
const APERO_DINATOIRE = 3;

/* Le poids d'un manque comblé : un repas sans légumes ni protéines est plus incomplet
   qu'un repas sans pain (« du pain suffit »). */
const POIDS = { legumes: 3, proteines: 3, feculents: 2, frais: 2 };

/* Les apports d'une recette, version composée comprise : un supplément peut en
   ajouter (des croûtons calent un velouté). `e` : une entrée du menu, ou rien pour
   la version de base. */
export function apportsDe(r, e = null) {
  const a = APPORTS[r.id];
  if (!a) return [];
  const base = Array.isArray(a) ? a : a.base || [];
  const supplements = Array.isArray(a) ? {} : a.supplements || {};
  return [...new Set([...base, ...(e?.addons || []).flatMap(id => supplements[id] || [])])];
}

const sale = r => r.category !== "Desserts";

/* De la chair animale dans cette version de la recette (une garniture aux lardons
   compte, même si la base n'en a pas). */
const vegetarienne = (r, e) => !effectiveIngredients(r, e).some(i => NON_VEGETARIEN.includes(i.cid));

/* analyser(entrees) — `entrees` : celles du menu, { e, r } (menuEntrees()).
   Rend { actif, manques, riches } : `actif` dit si le menu forme un repas ; `manques`,
   les ids de MANQUES qui ne sont couverts par aucun plat ; `riches`, les recettes qui
   pèsent quand il manque de la fraîcheur (pour le dire). */
export function analyser(entrees) {
  const mets = entrees.filter(({ r }) => !ACCOMPAGNE.includes(r.category));
  const sales = mets.filter(({ r }) => sale(r));
  const actif = mets.some(({ r }) => MOMENT_TABLE.includes(r.category)) || sales.length >= APERO_DINATOIRE;
  if (!actif) return { actif: false, manques: [], riches: [] };
  const apporte = (liste, id) => liste.some(({ r, e }) => apportsDe(r, e).includes(id));
  const manques = ["legumes", "proteines", "feculents"].filter(id => !apporte(sales, id));
  const riches = mets.filter(({ r, e }) => apportsDe(r, e).includes("riche")).map(({ r }) => r);
  if (riches.length && !apporte(mets, "frais")) manques.push("frais");
  return { actif: true, manques, riches: [...new Map(riches.map(r => [r.id, r])).values()] };
}

/* Ce que la recette comblerait : un dessert n'apporte pas de légumes à un repas, il
   peut seulement l'alléger. */
const comble = (r, apports, manques) => manques.filter(m => apports.includes(m) && (sale(r) || m === "frais"));

/* suggerer(entrees, manques, options) — les recettes du carnet qui comblent le mieux
   ces manques, de la plus utile à la moins utile : celles qui en comblent plusieurs
   d'abord, un plat qui se mange à table plutôt qu'un apéro, rien qui alourdisse un repas
   qui manque de fraîcheur, rien de carné dans un menu végétarien, pas un four de plus
   quand il chauffe déjà, la saison à égalité. Jamais une recette déjà au menu, ni une
   qui contient un allergène que les invités évitent (version par défaut, celle qu'on
   ajouterait). Options : `exclus` (ids d'allergènes), `compo` (rid → { choices, addons }
   de la version qu'on ajouterait), `mois` (1 à 12), `max`. */
export function suggerer(entrees, manques, { exclus = [], compo = () => ({}), mois = null, max = 3 } = {}) {
  if (!manques.length) return [];
  const presents = new Set(entrees.map(({ r }) => r.id));
  const mets = entrees.filter(({ r }) => !ACCOMPAGNE.includes(r.category));
  const toutVegetarien = mets.length > 0 && mets.every(({ r, e }) => vegetarienne(r, e));
  const fourOccupe = mets.some(({ r }) => !sansFour(r));
  return RECIPES
    .filter(r => !presents.has(r.id) && !ACCOMPAGNE.includes(r.category))
    .map(r => {
      const conf = compo(r.id) || {};
      const apports = apportsDe(r, conf);
      const utiles = comble(r, apports, manques);
      if (!utiles.length) return null;
      if (exclus.length && allergenesDeEntree(r, conf, exclus).length) return null;
      let score = utiles.reduce((s, m) => s + POIDS[m], 0);
      if (MOMENT_TABLE.includes(r.category)) score += 1;
      if (manques.includes("frais") && apports.includes("riche")) score -= 2;
      if (toutVegetarien && !vegetarienne(r, conf)) score -= 3;
      if (fourOccupe && !sansFour(r)) score -= 0.5;
      if (mois && estDeSaison(r, mois)) score += 0.5;
      return { r, comble: utiles, score };
    })
    .filter(x => x && x.score > 0)
    .sort((a, b) => b.score - a.score || totalTime(a.r) - totalTime(b.r) || a.r.title.localeCompare(b.r.title, "fr"))
    .slice(0, max);
}

/* « des légumes, des protéines et de quoi caler » : une liste à la française. */
const enumerer = parts => (parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} et ${parts[parts.length - 1]}`);

/* phrase({ manques, riches }) — « Il manque des légumes et quelque chose de frais
   pour alléger Quiche lorraine. » Le pain suffit à caler un repas : la phrase le dit
   quand c'est le seul manque. Les plats riches sont nommés comme dans la frise (deux
   au plus, sinon « le repas »). */
export function phrase({ manques, riches }) {
  const nommes = riches.length && riches.length <= 2 ? riches.map(r => nomCourt(r.title)).join(" et ") : "le repas";
  const parts = manques.map(m => ({
    legumes: "des légumes",
    proteines: "des protéines",
    feculents: manques.length === 1 ? "de quoi caler (du pain suffit)" : "de quoi caler",
    frais: `quelque chose de frais pour alléger ${nommes}`
  })[m]);
  return `Il manque ${enumerer(parts)}.`;
}
