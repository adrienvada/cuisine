/* Le calendrier des saisons — ce que lit l'onglet Saison (js/vues/saison.js).

   PRODUITS : les fruits, légumes et herbes fraîches de France métropolitaine,
   avec les mois (1 = janvier … 12 = décembre) où le produit français se trouve
   frais, cultivé en pleine saison sans serre chauffée. Pour les produits de garde
   (courges, poires), la saison court jusqu'à la fin de leur conservation, comme
   dans les calendriers publiés.

   Critère et prudence : les calendriers de saison des interprofessions et des
   agences publiques (Interfel, ADEME). Ils divergent de un ou deux mois selon
   les régions et les variétés : les bornes ci-dessous sont celles du cœur de la
   saison, pas de ses marges.

   FORME D'UNE ENTRÉE
   - id ....... minuscules, sans accent, tirets.
   - nom ...... au singulier, comme on le dit au marché.
   - emoji .... un seul.
   - famille .. "legumes", "fruits" ou "herbes".
   - mois ..... les mois de saison, dans l'ordre du calendrier, au moins deux ;
                ou "annee" pour ce qu'on trouve frais toute l'année (légumes de
                garde, cultures en cave, herbes vivaces).
   - cids ..... facultatif, les `cid` des recettes (js/recipes.js) qui désignent
                ce produit : la fiche du produit en tire « Dans le carnet ».
   - note ..... facultatif, une phrase : comment le choisir, le garder, ou ce que
                sa saison a de particulier. Rien qu'on ne sache vraiment.

   Une seule vérité par produit : pour un `cid` que js/saisons.js connaît (le
   filtre « De saison » de l'accueil), `mois` dit exactement les mêmes mois ; un
   `cid` absent de js/saisons.js ne dépend pas de la saison, il est donc ici
   "annee" ou dans IMPORTES. `npm run verifier` y veille.

   Un module, pas un script classique : seul l'onglet Saison le lit, il n'arrive
   qu'avec lui et ne pèse rien sur le chemin de l'accueil.

   Pas d'accolades dans les textes. */

export const PRODUITS = [
  /* ---------- Légumes ---------- */
  { id: "ail", nom: "Ail", emoji: "🧄", famille: "legumes", mois: "annee", cids: ["ail"],
    note: "Sec, il se garde des mois. L'ail nouveau, encore humide, arrive en mai-juin : plus doux, il se conserve peu." },
  { id: "artichaut", nom: "Artichaut", emoji: "🌱", famille: "legumes", mois: [5, 6, 7, 8, 9],
    note: "Lourd dans la main, feuilles serrées et cassantes : il est frais." },
  { id: "asperge", nom: "Asperge", emoji: "🌱", famille: "legumes", mois: [4, 5, 6],
    note: "Le talon doit être humide et la pointe bien fermée. Elle perd vite son sucre : à cuire dans les deux jours." },
  { id: "aubergine", nom: "Aubergine", emoji: "🍆", famille: "legumes", mois: [7, 8, 9],
    note: "Peau tendue et brillante, pédoncule vert : une peau ridée trahit une aubergine qui attend depuis longtemps." },
  { id: "betterave", nom: "Betterave", emoji: "🟣", famille: "legumes", mois: [9, 10, 11, 12, 1, 2, 3] },
  { id: "blette", nom: "Blette", emoji: "🥬", famille: "legumes", mois: [6, 7, 8, 9, 10],
    note: "Les côtes cuisent plus longtemps que le vert : on les commence avant." },
  { id: "brocoli", nom: "Brocoli", emoji: "🥦", famille: "legumes", mois: [7, 8, 9, 10, 11],
    note: "Bouquets serrés et bien verts ; dès qu'il jaunit, il fleurit et devient amer." },
  { id: "carotte", nom: "Carotte", emoji: "🥕", famille: "legumes", mois: "annee", cids: ["carotte"],
    note: "De garde toute l'année ; les carottes nouvelles, vendues en botte avec leurs fanes, arrivent au printemps." },
  { id: "celeri-rave", nom: "Céleri-rave", emoji: "🥔", famille: "legumes", mois: [10, 11, 12, 1, 2, 3] },
  { id: "champignon-paris", nom: "Champignon de Paris", emoji: "🍄", famille: "legumes", mois: "annee", cids: ["champignons"],
    note: "Cultivé en cave, sans saison. Chapeau bien fermé sur ses lamelles : il est jeune." },
  { id: "shiitake", nom: "Shiitaké", emoji: "🍄", famille: "legumes", mois: "annee", cids: ["shiitakes"],
    note: "Cultivé à l'abri toute l'année." },
  { id: "chou", nom: "Chou (vert, rouge, frisé)", emoji: "🥬", famille: "legumes", mois: [10, 11, 12, 1, 2, 3] },
  { id: "chou-bruxelles", nom: "Chou de Bruxelles", emoji: "🥬", famille: "legumes", mois: [10, 11, 12, 1, 2] },
  { id: "chou-fleur", nom: "Chou-fleur", emoji: "🥦", famille: "legumes", mois: [10, 11, 12, 1, 2, 3],
    note: "Bien blanc, sans taches, entouré de feuilles fraîches qui le protègent." },
  { id: "kale", nom: "Chou kale", emoji: "🥬", famille: "legumes", mois: [10, 11, 12, 1, 2, 3], cids: ["kale"],
    note: "Le froid l'adoucit : c'est un légume d'hiver." },
  { id: "concombre", nom: "Concombre", emoji: "🥒", famille: "legumes", mois: [5, 6, 7, 8, 9], cids: ["concombre"] },
  { id: "courge-butternut", nom: "Courge butternut", emoji: "🎃", famille: "legumes", mois: [9, 10, 11, 12, 1, 2], cids: ["butternut"],
    note: "Récoltée à l'automne, elle se garde entière plusieurs mois dans un endroit frais et sec." },
  { id: "potimarron", nom: "Potimarron", emoji: "🎃", famille: "legumes", mois: [9, 10, 11, 12],
    note: "Sa peau cuit aussi bien que la chair : inutile de l'éplucher." },
  { id: "courgette", nom: "Courgette", emoji: "🥒", famille: "legumes", mois: [6, 7, 8, 9],
    note: "Petite et ferme : les grosses courgettes sont aqueuses et pleines de graines." },
  { id: "endive", nom: "Endive", emoji: "🥬", famille: "legumes", mois: [10, 11, 12, 1, 2, 3, 4],
    note: "Gardée à l'abri de la lumière : elle verdit et devient amère à la lumière du jour." },
  { id: "epinard", nom: "Épinard", emoji: "🥬", famille: "legumes", mois: [3, 4, 5, 10, 11],
    note: "Deux saisons, au printemps et à l'automne : il monte en graines quand il fait chaud." },
  { id: "fenouil", nom: "Fenouil", emoji: "🌱", famille: "legumes", mois: [6, 7, 8, 9, 10] },
  { id: "feve", nom: "Fève", emoji: "🫛", famille: "legumes", mois: [5, 6],
    note: "Comptez environ un kilo de cosses pour trois cents grammes de fèves écossées." },
  { id: "haricot-vert", nom: "Haricot vert", emoji: "🫛", famille: "legumes", mois: [6, 7, 8, 9, 10], cids: ["haricots-verts"],
    note: "Il doit casser net quand on le plie." },
  { id: "salade", nom: "Laitue, feuille de chêne", emoji: "🥬", famille: "legumes", mois: [4, 5, 6, 7, 8, 9, 10], cids: ["feuille-chene"] },
  { id: "mache", nom: "Mâche", emoji: "🌱", famille: "legumes", mois: [10, 11, 12, 1, 2, 3] },
  { id: "navet", nom: "Navet", emoji: "🥔", famille: "legumes", mois: [10, 11, 12, 1, 2, 3] },
  { id: "oignon", nom: "Oignon, échalote", emoji: "🧅", famille: "legumes", mois: "annee", cids: ["oignon", "oignon-rouge", "echalote"],
    note: "Secs, ils se gardent toute l'année. L'oignon nouveau, vendu en botte, arrive au printemps." },
  { id: "panais", nom: "Panais", emoji: "🥕", famille: "legumes", mois: [10, 11, 12, 1, 2, 3] },
  { id: "petit-pois", nom: "Petit pois", emoji: "🫛", famille: "legumes", mois: [5, 6, 7], cids: ["petits-pois"],
    note: "Son sucre tourne en amidon dès la cueillette : écossé et cuit le jour même, ou surgelé." },
  { id: "piment", nom: "Piment", emoji: "🌶️", famille: "legumes", mois: [7, 8, 9, 10], cids: ["piment"] },
  { id: "poireau", nom: "Poireau", emoji: "🥬", famille: "legumes", mois: [9, 10, 11, 12, 1, 2, 3, 4] },
  { id: "poivron", nom: "Poivron", emoji: "🫑", famille: "legumes", mois: [7, 8, 9, 10],
    note: "Le rouge est un vert laissé mûrir : plus sucré, il vient plus tard dans l'été." },
  { id: "pomme-de-terre-nouvelle", nom: "Pomme de terre nouvelle", emoji: "🥔", famille: "legumes", mois: [5, 6, 7], cids: ["pommes-terre"],
    note: "Récoltée avant maturité, peau fine qui s'enlève au doigt. Elle se garde peu : quelques jours au frais." },
  { id: "pomme-de-terre", nom: "Pomme de terre de garde", emoji: "🥔", famille: "legumes", mois: "annee",
    note: "Au frais et dans le noir : à la lumière elle verdit, et la partie verte ne se mange pas." },
  { id: "potiron", nom: "Potiron, citrouille", emoji: "🎃", famille: "legumes", mois: [9, 10, 11, 12] },
  { id: "radis", nom: "Radis", emoji: "🌱", famille: "legumes", mois: [4, 5, 6, 7, 8, 9, 10], cids: ["radis"],
    note: "Fanes bien vertes : elles fanent bien avant le radis, c'est le meilleur signe de fraîcheur." },
  { id: "roquette", nom: "Roquette", emoji: "🌿", famille: "legumes", mois: [4, 5, 6, 7, 8, 9, 10], cids: ["roquette"] },
  { id: "tomate", nom: "Tomate", emoji: "🍅", famille: "legumes", mois: [6, 7, 8, 9], cids: ["tomates", "tomates-cerises"],
    note: "Jamais au réfrigérateur : le froid lui fait perdre son parfum." },
  { id: "topinambour", nom: "Topinambour", emoji: "🥔", famille: "legumes", mois: [11, 12, 1, 2, 3] },

  /* ---------- Fruits ---------- */
  { id: "abricot", nom: "Abricot", emoji: "🍑", famille: "fruits", mois: [6, 7, 8] },
  { id: "cerise", nom: "Cerise", emoji: "🍒", famille: "fruits", mois: [6, 7],
    note: "La queue bien verte et souple : elle sèche et brunit en quelques jours." },
  { id: "chataigne", nom: "Châtaigne", emoji: "🌰", famille: "fruits", mois: [10, 11, 12] },
  { id: "clementine", nom: "Clémentine de Corse", emoji: "🍊", famille: "fruits", mois: [11, 12, 1],
    note: "Vendue avec ses feuilles, preuve qu'elle a été cueillie il y a peu." },
  { id: "coing", nom: "Coing", emoji: "🍐", famille: "fruits", mois: [10, 11],
    note: "Dur et âpre cru ; cuit, il donne gelées et pâtes de fruits." },
  { id: "figue", nom: "Figue", emoji: "🟣", famille: "fruits", mois: [8, 9, 10], cids: ["figues"],
    note: "Elle doit céder un peu sous le doigt. Fragile : deux ou trois jours, pas plus." },
  { id: "fraise", nom: "Fraise", emoji: "🍓", famille: "fruits", mois: [5, 6, 7],
    note: "Rincée avant d'être équeutée, pour que l'eau n'entre pas dans le fruit." },
  { id: "fruits-rouges", nom: "Framboise, groseille, myrtille", emoji: "🫐", famille: "fruits", mois: [6, 7, 8], cids: ["fruits-rouges"] },
  { id: "kiwi", nom: "Kiwi", emoji: "🥝", famille: "fruits", mois: [11, 12, 1, 2, 3],
    note: "Cueilli dur, il mûrit chez soi, plus vite à côté d'une pomme." },
  { id: "melon", nom: "Melon", emoji: "🍈", famille: "fruits", mois: [7, 8, 9],
    note: "Lourd pour sa taille, et le pédoncule qui commence à se détacher." },
  { id: "mirabelle", nom: "Mirabelle", emoji: "🟡", famille: "fruits", mois: [8, 9] },
  { id: "orange", nom: "Orange", emoji: "🍊", famille: "fruits", mois: [12, 1, 2, 3], cids: ["orange"] },
  { id: "peche", nom: "Pêche, nectarine", emoji: "🍑", famille: "fruits", mois: [7, 8] },
  { id: "poire", nom: "Poire", emoji: "🍐", famille: "fruits", mois: [9, 10, 11, 12], cids: ["poire"],
    note: "Elle mûrit de l'intérieur : prête quand la chair cède près de la queue." },
  { id: "pomme", nom: "Pomme", emoji: "🍎", famille: "fruits", mois: "annee", cids: ["pomme"],
    note: "Récoltée de la fin de l'été à l'automne, elle se conserve jusqu'au printemps suivant : on en trouve de françaises toute l'année." },
  { id: "prune", nom: "Prune", emoji: "🟣", famille: "fruits", mois: [7, 8, 9] },
  { id: "raisin", nom: "Raisin", emoji: "🍇", famille: "fruits", mois: [9, 10] },
  { id: "rhubarbe", nom: "Rhubarbe", emoji: "🌱", famille: "fruits", mois: [4, 5, 6],
    note: "On n'en mange que les tiges : les feuilles sont toxiques." },

  /* ---------- Herbes fraîches ---------- */
  { id: "aneth", nom: "Aneth", emoji: "🌿", famille: "herbes", mois: [6, 7, 8, 9], cids: ["aneth"] },
  { id: "basilic", nom: "Basilic", emoji: "🌿", famille: "herbes", mois: [6, 7, 8, 9], cids: ["basilic"],
    note: "Il noircit au froid : dans un verre d'eau sur le plan de travail, pas au réfrigérateur." },
  { id: "cerfeuil", nom: "Cerfeuil", emoji: "🌿", famille: "herbes", mois: [4, 5, 6, 7, 8, 9, 10], cids: ["cerfeuil"] },
  { id: "ciboulette", nom: "Ciboulette", emoji: "🌿", famille: "herbes", mois: [4, 5, 6, 7, 8, 9, 10], cids: ["ciboulette"] },
  { id: "coriandre", nom: "Coriandre", emoji: "🌿", famille: "herbes", mois: [6, 7, 8, 9] },
  { id: "estragon", nom: "Estragon", emoji: "🌿", famille: "herbes", mois: [5, 6, 7, 8, 9], cids: ["estragon"] },
  { id: "menthe", nom: "Menthe", emoji: "🌿", famille: "herbes", mois: [5, 6, 7, 8, 9], cids: ["menthe"] },
  { id: "persil", nom: "Persil", emoji: "🌿", famille: "herbes", mois: [4, 5, 6, 7, 8, 9, 10], cids: ["persil"] },
  { id: "romarin", nom: "Romarin", emoji: "🌿", famille: "herbes", mois: "annee", cids: ["romarin"],
    note: "Feuillage persistant : il se cueille toute l'année." },
  { id: "thym", nom: "Thym", emoji: "🌿", famille: "herbes", mois: "annee", cids: ["thym"],
    note: "Feuillage persistant : il se cueille toute l'année." }
];

/* Ce que les recettes achètent sans que la France en produise vraiment : importé
   toute l'année, sans saison chez nous. L'onglet le dit en une ligne. */
export const IMPORTES = [
  { nom: "Avocat", cids: ["avocat"] },
  { nom: "Citron", cids: ["citron", "citron-vert"] },
  { nom: "Gingembre", cids: ["gingembre"] },
  { nom: "Grenade", cids: ["grenade"] }
];

/* Les mélanges trop variables pour qu'un calendrier ait un sens. */
export const SANS_CALENDRIER = ["herbes-fraiches", "fleurs-comestibles"];

export const FAMILLES_SAISON = [
  { id: "legumes", label: "Légumes" },
  { id: "fruits", label: "Fruits" },
  { id: "herbes", label: "Herbes" }
];
