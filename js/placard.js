/* Le fond de placard — les produits qu'on a presque toujours chez soi.
   La liste de courses les présente à part, « à vérifier » : on jette un œil
   au placard au lieu de les racheter à chaque fois, ou de les oublier le jour
   où le pot est vide.

   Critère : un produit sec ou de longue conservation (des mois, pas des
   jours), servi dans plusieurs recettes sans être l'ingrédient qui fait le
   plat. Une épice, une huile, un vinaigre, le sel, le sucre, la farine.
   N'y entre jamais un produit frais ni un ingrédient propre à une recette
   (le tahini, les pignons, la vanille) : mieux vaut l'acheter une fois de
   trop que le croire en réserve. Les épices de caractère (paprika fumé,
   piment d'Espelette) n'y sont donc pas : tout le monde n'en a pas.
   « farine » est la farine de blé ordinaire (T55), pas celle du pain
   (« farine-pain », T65, qu'on n'a pas toujours).

   Chaque entrée est le `cid` d'un ingrédient de js/recipes.js ; le
   vérificateur (tools/verifier-recettes.mjs) refuse un `cid` inconnu. */

const PLACARD = [
  // Sel et poivre
  "sel-fin", "gros-sel", "fleur-de-sel", "sel-poivre", "poivre-grains",
  // Huiles et vinaigres
  "huile-olive", "huile-neutre",
  "vinaigre-vin", "vinaigre-cidre", "vinaigre-blanc", "vinaigre-balsamique",
  // Épices et aromates secs
  "muscade", "cumin", "origan", "herbes-provence", "girofle", "laurier",
  // Condiment de base
  "moutarde",
  // Sucre et farine
  "sucre", "farine"
];
