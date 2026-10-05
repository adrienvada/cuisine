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
import { estDeSaison } from "./recherche.js";
import { effectiveIngredients, effectiveSteps, totalTime } from "./recettes.js";

/* Ce qui accompagne un repas sans en être un plat : jamais compté, jamais proposé. */
const ACCOMPAGNE = ["Boissons", "Sauces"];

/* Ce que dit l'étiquette d'une recette proposée : le mot de la cantine, plus court que
   celui de la phrase (« de quoi caler »). */
export const ETIQUETTES = { legumes: "légumes", proteines: "protéines", feculents: "féculents", frais: "fraîcheur" };

/* Un apéro qui fait dîner : quatre plats salés au moins. À trois, c'est encore un
   apéro, et le carnet ne le sermonne pas. */
const APERO_DINATOIRE = 4;

/* Le poids d'un manque comblé : un repas sans légumes ni protéines est plus incomplet
   qu'un repas sans pain (« du pain suffit »). */
const POIDS = { legumes: 3, proteines: 3, feculents: 2, frais: 2 };

/* En dessous, une recette comble trop peu, ou dérange trop (un plat carné dans un menu
   végétarien), pour valoir une carte : le carnet préfère montrer moins, mais mieux. */
const SCORE_MIN = 1.5;

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

/* Le four, dans cette version de la recette : des tartines au chèvre frais n'y passent
   pas, celles au chèvre chaud oui. */
const auFour = (r, e) => effectiveSteps(r, e).some(s => s.four);

/* analyser(entrees) — `entrees` : celles du menu, { e, r } (menuEntrees()).
   Rend { actif, manques } : `actif` dit si le menu forme un repas ; `manques`, ce qui
   n'y est pas encore, dans l'ordre où la phrase le dit (legumes, proteines, feculents,
   frais).
   Un apéro dînatoire ne réclame pas de légumes : aucun apéro du carnet n'en porte une
   vraie part, et le lui reprocher à chaque fois serait un sermon. La fraîcheur ne se
   réclame que face à un plat salé riche : un mi-cuit au chocolat après un velouté ne
   rend pas le repas lourd. */
export function analyser(entrees) {
  const mets = entrees.filter(({ r }) => !ACCOMPAGNE.includes(r.category));
  const sales = mets.filter(({ r }) => sale(r));
  const aTable = mets.some(({ r }) => MOMENT_TABLE.includes(r.category));
  if (!aTable && sales.length < APERO_DINATOIRE) return { actif: false, manques: [] };
  const apporte = (liste, id) => liste.some(({ r, e }) => apportsDe(r, e).includes(id));
  const manques = ["legumes", "proteines", "feculents"].filter(id => (aTable || id !== "legumes") && !apporte(sales, id));
  if (apporte(sales, "riche") && !apporte(mets, "frais")) manques.push("frais");
  return { actif: true, manques };
}

/* Ce que la recette comblerait : un dessert n'apporte pas de légumes à un repas, il
   peut seulement l'alléger. */
const comble = (r, apports, manques) => manques.filter(m => apports.includes(m) && (sale(r) || m === "frais"));

/* suggerer(entrees, manques, options) — les recettes du carnet qui comblent le mieux
   ces manques, de la plus utile à la moins utile : celles qui en comblent plusieurs
   d'abord ; un plat qui se mange à table plutôt qu'un apéro quand il apporte des
   légumes ou des protéines ; rien de riche tant que le menu n'a rien de frais (il
   faudrait ensuite l'alléger) ; rien de carné dans un menu végétarien ; pas un four de
   plus quand il chauffe déjà ; la saison en plus. À égalité : les recettes qu'on aime,
   puis celles qu'on n'a pas faites depuis longtemps, puis la plus rapide.
   Jamais une recette déjà au menu, ni une qui contient un allergène que les invités
   évitent. Le four, les allergènes et le reste se lisent sur la version qu'on
   ajouterait. Options : `exclus` (ids d'allergènes), `compo` (rid → { choices, addons }
   de la version qu'on ajouterait), `mois` (1 à 12), `favori` (r → vrai si on l'aime),
   `derniere` (r → l'instant où on l'a cuisinée pour la dernière fois, 0 si jamais),
   `max`. */
export function suggerer(entrees, manques, { exclus = [], compo = () => ({}), mois = null, favori = () => false, derniere = () => 0, max = 3 } = {}) {
  if (!manques.length) return [];
  const presents = new Set(entrees.map(({ r }) => r.id));
  const mets = entrees.filter(({ r }) => !ACCOMPAGNE.includes(r.category));
  const toutVegetarien = mets.length > 0 && mets.every(({ r, e }) => vegetarienne(r, e));
  const aFrais = mets.some(({ r, e }) => apportsDe(r, e).includes("frais"));
  const fourOccupe = mets.some(({ r, e }) => auFour(r, e));
  return RECIPES
    .filter(r => !presents.has(r.id) && !ACCOMPAGNE.includes(r.category))
    .map(r => {
      const conf = compo(r.id) || {};
      const apports = apportsDe(r, conf);
      const utiles = comble(r, apports, manques);
      if (!utiles.length) return null;
      if (exclus.length && allergenesDeEntree(r, conf, exclus).length) return null;
      let score = utiles.reduce((s, m) => s + POIDS[m], 0);
      if (MOMENT_TABLE.includes(r.category) && utiles.some(m => m === "legumes" || m === "proteines")) score += 1;
      if (!aFrais && apports.includes("riche")) score -= 2;
      if (toutVegetarien && !vegetarienne(r, conf)) score -= 3;
      if (fourOccupe && auFour(r, conf)) score -= 0.5;
      if (mois && estDeSaison(r, mois)) score += 0.5;
      return { r, comble: utiles, score, aime: favori(r) ? 1 : 0, derniere: derniere(r) || 0, temps: totalTime(r, conf) };
    })
    .filter(x => x && x.score >= SCORE_MIN)
    .sort((a, b) => b.score - a.score || b.aime - a.aime || a.derniere - b.derniere || a.temps - b.temps || a.r.title.localeCompare(b.r.title, "fr"))
    .slice(0, max)
    .map(({ r, comble, score }) => ({ r, comble, score }));
}

/* « des légumes, des protéines et de quoi caler » : une liste à la française. */
const enumerer = parts => (parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} et ${parts[parts.length - 1]}`);

/* phrase(manques) — « Il manque encore des légumes et un peu de fraîcheur pour alléger
   le repas. » Le pain suffit à caler un repas : la phrase le dit tant que les manques
   sont deux au plus ; au-delà, il se lirait comme « le pain règle tout ». */
export function phrase(manques) {
  const parts = manques.map(m => ({
    legumes: "des légumes",
    proteines: "des protéines",
    feculents: manques.length <= 2 ? "de quoi caler (du pain suffit)" : "de quoi caler",
    frais: "un peu de fraîcheur pour alléger le repas"
  })[m]);
  return `Il manque encore ${enumerer(parts)}.`;
}
