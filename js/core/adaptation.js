/* Adapter une fiche à ce qu'on a : allergènes d'une version, portions permises par un ingrédient qui manque, portions d'un autre moule. */

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
   l'ingrédient n'a pas de quantité chiffrée. */
export function portionsPermises(ing, portionsBase, possede) {
  if (ing.qty == null || !(ing.qty > 0) || !(possede >= 0)) return null;
  return Math.floor(possede / (ing.qty / portionsBase) + 1e-9);
}

/* Ce que l'utilisateur a tapé : « 3 », « 1,5 », « 250 g » (l'unité est ignorée,
   la feuille la montre déjà à côté du champ). */
export function lireQuantite(texte) {
  const m = String(texte ?? "").trim().replace(",", ".").match(/^(\d+(?:\.\d+)?|\.\d+)/);
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

export function libelleMoule(moule, taille) {
  if (moule.forme === "rectangle") {
    const largeur = Math.round(moule.largeur * taille / moule.longueur);
    return `${largeur} × ${taille} cm`;
  }
  return `${taille} cm`;
}
