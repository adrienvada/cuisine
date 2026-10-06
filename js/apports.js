/* Ce qu'une recette apporte à un repas : c'est ce que lit le menu pour dire ce
   qui manque encore (js/core/completude.js) — pas de légumes, rien qui cale, rien
   de frais face à une quiche — et proposer les recettes du carnet qui le comblent.

   Clé : l'id de la recette (js/recipes.js). Valeur : la liste de ses apports, ou
   { base, supplements } quand un supplément en ajoute un (des croûtons calent un
   velouté, des pitas calent un houmous). Chaque recette a son entrée, même vide :
   `npm run verifier` y veille.

   · legumes   : une vraie part de légumes, environ 100 g par personne de légumes cuits
                 ou denses, 50 g de feuilles crues (un grand bol) ; pas une garniture
                 d'herbes, ni trois radis ou une cuillerée de houmous ;
   · proteines : viande, poisson, œufs, fromage ou légumineuses en quantité de plat ;
   · feculents : pain, pâte, pâtes, pommes de terre, céréales, légumineuses : ce qui cale ;
   · frais     : cru, croquant ou acidulé, ce qui allège un repas riche ;
   · riche     : crème, beurre, fromage fondu, friture, feuilletage : ce qui pèse.

   On juge sur les quantités par personne de la version par défaut, pas sur le titre :
   une portion d'apéro ne compte que si elle nourrit vraiment (un peu de feta sur une
   focaccia ne fait pas des protéines), une garniture non plus (trois châtaignes sur un
   velouté ne calent pas). Le pain qui fait partie du plat compte (le pain suédois du
   gravlax). Les boissons et les sauces sont notées pour que chaque recette ait son
   entrée, mais le menu ne les compte pas : elles accompagnent un repas sans en former
   un plat.

   Un module, pas un script classique comme les autres fichiers de données : seule la
   vue du menu le lit (par js/core/completude.js), il arrive donc avec elle et ne pèse
   rien sur le chemin de l'accueil. */

export const APPORTS = {
  "focaccia-romarin": ["feculents"],
  "torsades-pesto": ["feculents", "riche"],
  "dip-chevre-herbes": { base: [], supplements: { radis: ["frais"] } },
  "houmous-petits-pois-menthe": { base: ["frais"], supplements: { pita: ["feculents"] } },
  "salade-kale-pomme-oeuf": ["legumes", "proteines", "frais"],
  "veloute-butternut-shiitakes": { base: ["legumes"], supplements: { croutons: ["feculents"] } },
  "gravlax-saumon-yaourt-bulgare": ["proteines", "feculents", "frais"],
  "beignets-brebis-menthe": ["proteines", "feculents", "riche"],
  "scoopable-cookies": ["riche"],
  "cocktail-concombre-menthe": ["frais"],
  "salade-mediterraneenne": ["legumes", "proteines", "feculents", "frais"],
  "salade-champetre": ["legumes", "feculents", "frais"],
  "salade-lentilles-feta": ["legumes", "proteines", "feculents", "frais"],
  "mayonnaise-maison": ["riche"],
  "pesto-basilic-maison": ["riche"],
  "quiche-lorraine": ["proteines", "feculents", "riche"],
  "tagliatelles-carotte-carbonara": ["legumes", "proteines", "riche"],
  "cake-sale": ["proteines", "feculents", "riche"],
  "mi-cuit-chocolat-suzy-palatin": ["riche"],
  "tartines-figues-chevre-miel": ["feculents"]
};
