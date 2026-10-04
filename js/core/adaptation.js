/* Adapter une fiche à ce qu'on a : allergènes d'une version, portions permises par un ingrédient qui manque, portions d'un autre moule. */

import { scaleQty } from "./format.js";

/* Bornes des portions de la fiche : celles de ses boutons « − » et « + ». */
export const PORTIONS_MIN = 1;
export const PORTIONS_MAX = 24;

const borner = n => Math.max(PORTIONS_MIN, Math.min(PORTIONS_MAX, n));

/* Les allergènes des ingrédients donnés, dans l'ordre officiel de la liste INCO.
   Les tables se passent en paramètres pour que les tests n'aient pas à poser
   de globales ; l'application, elle, lit celles de js/allergenes.js. */
export function allergenesDe(ingredients, table = ALLERGENES, liste = ALLERGENES_LISTE) {
  const presents = new Set();
  for (const ing of ingredients) for (const id of (ing.cid && table[ing.cid]) || []) presents.add(id);
  return liste.filter(a => presents.has(a.id));
}

/* « J'en ai moins » : combien de portions permet ce qu'on possède d'un ingrédient.
   On arrondit vers le bas — jamais plus que ce qu'on a. Le 1e-9 absorbe l'erreur
   des flottants : un résultat de 5,9999… doit donner 6, pas 5. Renvoie null si
   l'ingrédient n'a pas de quantité chiffrée.
   La fiche écrit des quantités arrondies (œufs entiers, grammes entiers) : on
   ne propose jamais des portions dont la quantité ÉCRITE dépasserait ce qu'on a
   — 2,6 œufs en main, la fiche à 3 œufs ne serait pas cuisinable. */
export function portionsPermises(ing, portionsBase, possede) {
  if (ing.qty == null || !(ing.qty > 0) || !(possede >= 0)) return null;
  let n = Math.floor(possede / (ing.qty / portionsBase) + 1e-9);
  while (n > 0 && scaleQty(ing.qty, ing.unit, n / portionsBase, ing.entier) > possede + 1e-9) n--;
  return n;
}

/* Ce que l'utilisateur a tapé : « 3 », « 1,5 », « 1/2 », « 1 1/2 », « ½ »,
   « 250 g » (l'unité est ignorée, la feuille la montre déjà à côté du champ). */
const FRACTIONS = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };

export function lireQuantite(texte) {
  const t = String(texte ?? "").trim().replace(",", ".");
  let m = t.match(/^(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)/);
  if (m) return m[3] === "0" ? null : (m[1] ? Number(m[1]) : 0) + Number(m[2]) / Number(m[3]);
  m = t.match(/^(?:(\d+)\s*)?([½¼¾⅓⅔])/);
  if (m) return (m[1] ? Number(m[1]) : 0) + FRACTIONS[m[2]];
  m = t.match(/^(\d+(?:\.\d+)?|\.\d+)/);
  return m ? parseFloat(m[1]) : null;
}

/* ---------- Le moule ----------
   La recette est écrite pour son moule : portions de base et surface vont de
   pair. Un autre moule change la surface, donc les portions dans le même
   rapport. Un moule se décrit par sa grande dimension : le diamètre d'un rond,
   la longueur d'un rectangle ou d'un cake. Un rectangle garde ses proportions
   (la largeur suit), un cake garde sa largeur. */

export const tailleDeReference = moule => (moule.forme === "rond" ? moule.diametre : moule.longueur);

/* Le rapport des surfaces entre le moule choisi (de grande dimension `taille`) et celui de la recette. */
function rapportSurfaces(moule, taille) {
  const k = taille / tailleDeReference(moule);
  return moule.forme === "cake" ? k : k * k;
}

export const portionsPourMoule = (moule, portionsBase, taille) =>
  borner(Math.round(portionsBase * rapportSurfaces(moule, taille)));

/* Le moule qui correspond à ces portions : sert à afficher une taille cohérente
   quand les portions ont été réglées autrement que par le moule. */
export function tailleEquivalente(moule, portionsBase, portions) {
  const r = portions / portionsBase;
  return Math.max(1, Math.round(tailleDeReference(moule) * (moule.forme === "cake" ? r : Math.sqrt(r))));
}

/* Un autre moule change-t-il la cuisson ? Ici non, ou très peu : les quantités
   suivent la surface (portionsPourMoule), la pâte garde donc la même épaisseur,
   et c'est l'épaisseur qui règle le temps. Le piège serait de changer de moule
   en gardant les quantités : plus étalée la pâte cuit plus vite, plus épaisse
   plus lentement — la fiche ne le propose pas, mais celui qui verse ses propres
   quantités doit le savoir. Rien à dire quand le moule est celui de la recette. */
export function remarqueCuissonMoule(moule, taille) {
  if (taille === tailleDeReference(moule)) return "";
  return "La pâte garde la même épaisseur : la cuisson ne change guère, surveille quand même les dernières minutes.";
}

export function libelleMoule(moule, taille) {
  if (moule.forme === "rectangle") {
    const largeur = Math.round(moule.largeur * taille / moule.longueur);
    return `${largeur} × ${taille} cm`;
  }
  return `${taille} cm`;
}
