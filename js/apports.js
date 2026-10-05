/* Ce qu'une recette apporte à un repas : c'est ce que lit le menu pour dire ce
   qui manque encore (js/core/completude.js) — pas de légumes, rien qui cale, rien
   de frais face à une quiche — et proposer les recettes du carnet qui le comblent.

   Clé : l'id de la recette (js/recipes.js). Valeur : la liste de ses apports, ou
   { base, supplements } quand un supplément en ajoute un (des croûtons calent un
   velouté, une botte de radis met des légumes sur la table de l'apéro). Chaque
   recette a son entrée, même vide : `npm run verifier` y veille.

   · legumes   : une vraie part de légumes (une centaine de grammes par personne),
                 pas une garniture d'herbes ni trois tomates cerises ;
   · proteines : viande, poisson, œufs, fromage ou légumineuses en quantité de plat ;
   · feculents : pain, pâte, pâtes, pommes de terre, céréales, légumineuses : ce qui cale ;
   · frais     : cru, croquant ou acidulé, ce qui allège un repas riche ;
   · riche     : crème, beurre, fromage fondu, friture, feuilletage : ce qui pèse.

   Une portion d'apéro ne compte que si elle nourrit vraiment : un peu de feta sur
   une focaccia ne fait pas des protéines. Les boissons et les sauces sont notées pour
   que chaque recette ait son entrée, mais le menu ne les compte pas : elles
   accompagnent un repas sans en former un plat.

   Un module, pas un script classique comme les autres fichiers de données : seule la
   vue du menu le lit (par js/core/completude.js), il arrive donc avec elle et ne pèse
   rien sur le chemin de l'accueil. */

export const APPORTS = {
  "focaccia-romarin": ["feculents"],
  "torsades-pesto": ["feculents", "riche"],
  "dip-chevre-herbes": { base: [], supplements: { radis: ["legumes", "frais"] } },
  "houmous-petits-pois-menthe": { base: ["legumes", "frais"], supplements: { pita: ["feculents"] } },
  "salade-kale-pomme-oeuf": ["legumes", "proteines", "frais"],
  "veloute-butternut-shiitakes": { base: ["legumes"], supplements: { croutons: ["feculents"], chataignes: ["feculents"] } },
  "gravlax-saumon-yaourt-bulgare": { base: ["proteines", "frais"], supplements: { blinis: ["feculents"] } },
  "beignets-brebis-menthe": ["feculents", "riche"],
  "scoopable-cookies": ["riche"],
  "cocktail-concombre-menthe": ["frais"],
  "salade-mediterraneenne": ["legumes", "proteines", "feculents", "frais"],
  "salade-champetre": ["legumes", "feculents", "frais"],
  "salade-lentilles-feta": ["legumes", "proteines", "feculents", "frais"],
  "mayonnaise-maison": ["riche"],
  "pesto-basilic-maison": ["riche"],
  "quiche-lorraine": ["proteines", "feculents", "riche"],
  "tagliatelles-carotte-carbonara": ["legumes", "proteines", "riche"],
  "cake-sale": ["feculents", "riche"],
  "mi-cuit-chocolat-suzy-palatin": ["riche"],
  "tartines-figues-chevre-miel": ["feculents"]
};
