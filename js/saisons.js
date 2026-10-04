/* Saisons — référentiel indexé par `cid`, pour les recettes de saison.

   SAISONS : pour un fruit, un légume ou une herbe fraîche, les mois (1 = janvier
   … 12 = décembre) où le produit frais est de saison en France métropolitaine,
   c'est-à-dire cultivé en pleine saison et sans serre chauffée ni avion.

   Critère : les calendriers de saison publiés par les interprofessions et
   agences publiques (Interfel, ADEME…). Les calendriers divergent de un ou deux
   mois selon les régions et les variétés : les bornes ci-dessous sont
   prudentes, plutôt le cœur de la saison que ses marges.

   Règle d'honnêteté : un `cid` absent veut dire « ne dépend pas de la saison »,
   pas « inconnu ». Rien pour :
   - l'épicerie, la crèmerie, les surgelés, les produits secs ou en conserve ;
   - les légumes de garde disponibles frais toute l'année (carotte, oignon,
     échalote, ail, pomme, champignon de Paris), et le romarin ou le laurier,
     feuillus toute l'année ;
   - les produits importés toute l'année (avocat, gingembre, citron vert) ;
   - le citron jaune : la production française est hivernale, mais le citron
     qu'on achète vient d'Espagne, d'Argentine ou d'Afrique du Sud selon le mois,
     et il n'y a pas de période où il « manque » — donc pas de saison
     plutôt que d'en inventer une ;
   - les produits trop variables pour qu'un calendrier ait un sens (fleurs
     comestibles, mélange d'« herbes fraîches »).

   Pas d'accolades dans les textes. */

const SAISONS = {
  /* Légumes */
  butternut: [1, 2, 9, 10, 11, 12],
  concombre: [5, 6, 7, 8, 9],
  "feuille-chene": [4, 5, 6, 7, 8, 9, 10],
  "haricots-verts": [6, 7, 8, 9, 10],
  kale: [1, 2, 3, 10, 11, 12],
  "petits-pois": [5, 6, 7],
  piment: [7, 8, 9, 10],
  "pommes-terre": [5, 6, 7],   // pommes de terre nouvelles
  radis: [4, 5, 6, 7, 8, 9, 10],
  roquette: [4, 5, 6, 7, 8, 9, 10],
  tomates: [6, 7, 8, 9],
  "tomates-cerises": [6, 7, 8, 9],

  /* Fruits */
  figues: [8, 9, 10],
  "fruits-rouges": [6, 7, 8],
  orange: [1, 2, 3, 12],

  /* Herbes fraîches (pleine terre) */
  aneth: [6, 7, 8, 9],
  basilic: [6, 7, 8, 9],
  cerfeuil: [4, 5, 6, 7, 8, 9, 10],
  ciboulette: [4, 5, 6, 7, 8, 9, 10],
  estragon: [5, 6, 7, 8, 9],
  menthe: [5, 6, 7, 8, 9],
  persil: [4, 5, 6, 7, 8, 9, 10]
};
