/* Substitutions — référentiel indexé par `cid`.

   SUBSTITUTIONS : pour un ingrédient, la liste de ses remplacements possibles.
   Chaque entrée : `par` = le remplacement, proportion comprise, écrite pour
   la quantité de référence indiquée (« pour 20 cl de crème : … ») ; `note` =
   quand ça marche, et ce que ça change au plat.

   Critère : les ingrédients où la question se pose vraiment en cuisine — crèmes,
   beurre, lait, fromages, œufs, levures, agrumes, vinaigres, herbes, fruits à
   coque… Pas d'exhaustivité : un ingrédient sans entrée n'a pas de remplaçant
   honnête, ou la question ne se pose pas.

   Règle d'honnêteté, la même que pour les fondamentaux : aucune substitution
   qui ne marche pas, et on dit toujours ce qu'on y perd. Une proportion dont on
   n'est pas sûr n'est pas écrite ; une substitution qui ne vaut que pour
   certains usages le dit (cuisson, cru, pâtisserie). Quand le remplaçant change
   les allergènes (fruits à coque, lait…), la note le rappelle.

   Pas d'accolades dans les textes : elles sont réservées aux quantités mises à
   l'échelle, et ces textes ne le sont pas. */

const SUBSTITUTIONS = {
  /* Crèmes, lait, beurre, œufs */
  "creme-liquide": [
    { par: "Pour 20 cl de crème : 15 cl de lait entier + 60 g de beurre fondu, mélangés.",
      note: "Marche en cuisson : sauces, gratins, soupes, quiches. Moins onctueux, et ne se monte pas en chantilly." },
    { par: "Pour 20 cl de crème : 20 cl de crème fraîche épaisse délayée avec 5 cl de lait.",
      note: "Cuisson uniquement. Plus acidulée que la crème liquide ; ne la laisser bouillir franchement que si elle est entière (30 % de matière grasse)." },
    { par: "Pour 20 cl de crème : 20 cl de lait de coco entier.",
      note: "Cuisson, plats épicés ou sucrés. Le goût de coco reste, il ne se cache pas." }
  ],
  "creme-fraiche": [
    { par: "Yaourt grec, même quantité.",
      note: "Marche froid ou ajouté hors du feu, en sauces et en finition. À chaud et à ébullition, il tourne plus facilement ; plus acide et moins gras." }
  ],
  beurre: [
    { par: "Pour 100 g de beurre : 80 g d'huile d'olive douce (ou neutre).",
      note: "Cakes, madeleines, gâteaux moelleux et cuissons à la poêle. Plus de croustillant ni de feuilletage : à éviter pour les sablés, la brisée et le feuilleté, où le beurre froid fait la structure. Le goût de beurre disparaît." }
  ],
  "beurre-sale": [
    { par: "Pour 100 g de beurre salé : 100 g de beurre doux + 3 g de sel fin.",
      note: "Goûter avant de saler le reste de la recette : les beurres salés du commerce vont de peu à beaucoup salés." }
  ],
  lait: [
    { par: "Boisson d'avoine ou de soja nature non sucrée, même quantité.",
      note: "Gâteaux, crêpes, béchamel, flans. Goût plus neutre ou céréalier. Le soja caille s'il rencontre un ingrédient acide (citron, vin) à chaud." }
  ],
  oeufs: [
    { par: "Pour 1 œuf : 1 c. à s. de graines de lin moulues + 3 c. à s. d'eau, laissées gonfler 10 minutes.",
      note: "Cakes, muffins, cookies : le gel lie la pâte. Ne remplace pas l'œuf qui monte (blancs, génoise), qui coagule (flan, quiche) ou qui gonfle (pâte à choux). Goût de noisette et pâte plus dense." },
    { par: "Pour 1 œuf : 60 g de compote de pomme sans sucre ajouté.",
      note: "Gâteaux moelleux seulement. Plus humide et un peu plus sucré ; la mie est plus lourde, sans croûte dorée." }
  ],

  /* Levures */
  levure: [
    { par: "Pour 7 g de levure déshydratée (un sachet) : 20 g de levure fraîche.",
      note: "Rapport de 3 pour 1. Émietter dans l'eau tiède avant d'ajouter à la farine. Même résultat ; la fraîche se garde peu de jours au frais." }
  ],
  "levure-chimique": [
    { par: "Pour 1 c. à c. de levure chimique : ¼ de c. à c. de bicarbonate + ½ c. à c. de jus de citron ou de vinaigre.",
      note: "Réaction immédiate : mélanger au dernier moment et enfourner tout de suite. Un léger goût d'acide ou de bicarbonate peut rester si la dose est trop forte." }
  ],

  /* Agrumes et vinaigres */
  citron: [
    { par: "Citron vert, même quantité de jus et de zeste.",
      note: "Marche partout, en cuisson comme en vinaigrette ou en dessert. Parfum plus vert, un peu plus amer." },
    { par: "Pour le jus : moitié moins de vinaigre de cidre ou de vin blanc.",
      note: "Vinaigrettes, marinades, déglaçage : l'acidité est là, pas le parfum. Aucun zeste possible." }
  ],
  "citron-vert": [
    { par: "Citron jaune, même quantité de jus et de zeste.",
      note: "Parfum moins aromatique et moins vif. Marche partout." }
  ],
  "vinaigre-vin": [
    { par: "Vinaigre de cidre, même quantité.",
      note: "Vinaigrettes, déglaçage. Plus fruité et un peu plus doux." },
    { par: "Jus de citron, même quantité.",
      note: "Vinaigrettes et sauces froides. Plus frais, moins rond ; ne se garde pas comme le vinaigre." }
  ],
  "vinaigre-cidre": [
    { par: "Vinaigre de vin blanc, même quantité.",
      note: "Perd le côté pomme. Marche partout." }
  ],
  "vinaigre-blanc": [
    { par: "Vinaigre de cidre, même quantité.",
      note: "Marinades et cuissons où il fait l'acidité. Plus parfumé." }
  ],
  "vinaigre-balsamique": [
    { par: "Pour 1 c. à s. de balsamique : 1 c. à s. de vinaigre de vin rouge + ½ c. à c. de miel.",
      note: "Rend l'acidité et un peu de douceur, pas la profondeur de goût du balsamique vieilli." }
  ],
  "balsamique-reduction": [
    { par: "Du vinaigre balsamique réduit de moitié à feu doux, jusqu'à ce qu'il nappe la cuillère.",
      note: "Environ 10 minutes. Surveiller de près en fin de réduction : il brûle vite et devient amer." }
  ],

  /* Fromages et yaourts */
  parmesan: [
    { par: "Pecorino romano, même poids.",
      note: "Plus piquant et nettement plus salé : réduire le sel de la recette. Marche râpé sur les pâtes ou dans un pesto." }
  ],
  comte: [
    { par: "Gruyère, même poids.",
      note: "Très proche, un peu plus noisette. Emmental en dernier recours : fond bien, mais fait moins de goût." }
  ],
  gruyere: [
    { par: "Comté, même poids.",
      note: "Un peu plus fruité. Emmental en dernier recours : fond bien, mais fait moins de goût." }
  ],
  feta: [
    { par: "Chèvre frais émietté, même poids, avec une pincée de sel fin.",
      note: "Plus crémeux et moins salé, la texture ne s'émiette pas pareil. Marche en salades, sur les tartes salées et dans les garnitures." }
  ],
  "chevre-frais": [
    { par: "Fromage de brebis frais ou ricotta, même poids.",
      note: "Perd l'acidité caractéristique du chèvre. Plus doux, marche en garniture, tartinade ou farce." }
  ],
  "brebis-frais": [
    { par: "Chèvre frais, même poids.",
      note: "Plus acide, goût de chèvre plus marqué." }
  ],
  "yaourt-bulgare": [
    { par: "Yaourt grec, même quantité.",
      note: "Plus épais et plus gras. Pour une sauce, le détendre avec une cuillerée d'eau ou de lait." }
  ],
  "yaourt-grec": [
    { par: "Yaourt nature brassé, égoutté 2 heures dans une passoire au-dessus d'un bol.",
      note: "Retrouve l'épaisseur du grec ; moins gras, plus acidulé. Sans égouttage, la sauce reste liquide." }
  ],

  /* Fruits à coque et graines */
  pignons: [
    { par: "Amandes mondées, noix de cajou ou graines de tournesol, même poids.",
      note: "Pesto, salades, garnitures : toujours les faire dorer à sec dans la poêle d'abord. Goût moins résineux ; les amandes et le cajou sont des fruits à coque, le tournesol non." }
  ],
  noix: [
    { par: "Noix de pécan ou noisettes, même poids.",
      note: "Salades, gâteaux, garnitures. La pécan est plus sucrée et moins amère, la noisette plus ronde ; les trois sont des fruits à coque." }
  ],
  pecan: [
    { par: "Noix, même poids.",
      note: "Un peu plus amer, avec des tanins. Même croquant." }
  ],
  noisettes: [
    { par: "Amandes, même poids.",
      note: "Plus neutres : les torréfier à sec pour retrouver du goût." }
  ],
  amandes: [
    { par: "Noisettes, même poids.",
      note: "Plus parfumées et plus grasses. Mêmes précautions allergènes." }
  ],
  "graines-courge": [
    { par: "Graines de tournesol, même poids.",
      note: "Mêmes usages (salade, topping), plus neutres et moins croquantes. Les griller à sec." }
  ],
  cranberries: [
    { par: "Raisins secs ou cerises séchées, même poids.",
      note: "Plus sucrés, moins acidulés. Les raisins secs rendent l'ensemble plus doux." }
  ],
  tahini: [
    { par: "Purée d'amande blanche, même poids.",
      note: "Hoummous et sauces : goût plus doux, moins amer, légèrement sucré. Passe d'un allergène (sésame) à un autre (fruits à coque)." }
  ],

  /* Assaisonnements, huiles, douceurs */
  moutarde: [
    { par: "Moutarde à l'ancienne, même quantité.",
      note: "Vinaigrettes et sauces : moins vive, avec des graines qui croquent et un liant un peu moins fin." }
  ],
  "moutarde-ancienne": [
    { par: "Moutarde de Dijon, même quantité.",
      note: "Perd les graines et le croquant. Émulsionne mieux." }
  ],
  "huile-noix": [
    { par: "Huile de noisette, même quantité.",
      note: "Assaisonnement à froid uniquement ; elle ne supporte pas la cuisson. Goût voisin, plus doux. Même allergène." }
  ],
  "huile-neutre": [
    { par: "Huile de tournesol, de colza ou de pépins de raisin, même quantité.",
      note: "Cuisson et pâtisserie. L'huile d'olive vierge peut s'y substituer, mais son goût se retrouve." }
  ],
  miel: [
    { par: "Sirop d'érable, même quantité.",
      note: "Vinaigrettes, marinades, gâteaux. Moins parfumé que certains miels, et le sirop est plus fluide." }
  ],
  sucre: [
    { par: "Sucre de canne ou cassonade, même poids.",
      note: "La cassonade apporte un goût de caramel et brunit plus vite ; la pâte reste un peu plus humide." }
  ],
  cassonade: [
    { par: "Sucre blanc, même poids.",
      note: "Perd le goût de caramel et la couleur ; l'humidité de la pâte change légèrement." }
  ],
  "piment-espelette": [
    { par: "Paprika doux, même quantité + une très petite pincée de piment de Cayenne.",
      note: "Retrouve la douceur et un peu de chaleur, pas le fruité de l'espelette." }
  ],
  gingembre: [
    { par: "Pour 1 c. à c. de gingembre frais râpé : ¼ de c. à c. de gingembre moulu.",
      note: "Plats cuits et pâtisserie. Perd la fraîcheur piquante du frais." }
  ],
  "chocolat-patissier": [
    { par: "Chocolat noir à croquer 60 à 70 %, même poids.",
      note: "Le fondant est le même. Éviter plus de 80 % de cacao : sec et amer, la recette devient trop forte." }
  ],
  "pepites-chocolat": [
    { par: "Chocolat en tablette haché au couteau, même poids.",
      note: "Fond davantage à la cuisson, là où la pépite garde sa forme. Aussi bon, moins joli." }
  ],

  /* Herbes fraîches */
  persil: [
    { par: "Cerfeuil, même quantité.",
      note: "Plus délicat, anisé. Ajouter en fin de cuisson : il ne résiste pas à la chaleur." }
  ],
  cerfeuil: [
    { par: "Persil plat, même quantité + 1 brin d'estragon.",
      note: "Retrouve la note anisée. Le goût reste plus franc." }
  ],
  estragon: [
    { par: "Aneth, même quantité.",
      note: "Anisé aussi, mais plus frais et moins puissant." }
  ],
  ciboulette: [
    { par: "Tiges vertes d'oignon nouveau, finement ciselées, même quantité.",
      note: "Plus piquantes. Marche cru, en finition." }
  ],
  romarin: [
    { par: "Pour 1 c. à s. de romarin frais haché : 1 c. à c. de romarin séché.",
      note: "En cuisson et dans les pâtes. Perd les huiles volatiles et le parfum de résine frais ; l'écraser entre les doigts avant de l'utiliser." }
  ],
  "herbes-provence": [
    { par: "Thym et origan séchés à parts égales.",
      note: "Retrouve l'essentiel du mélange, il manque la sarriette et le romarin." }
  ],

  /* Oignons et alliacés */
  echalote: [
    { par: "Pour 1 échalote : ½ petit oignon jaune.",
      note: "Cuit ou cru, goût plus fort et moins fin. Le hacher très finement et le rincer à l'eau froide si servi cru." }
  ],
  "oignon-rouge": [
    { par: "Oignon blanc ou oignon doux (Cévennes, Roscoff), même poids.",
      note: "Cru en salade : plus doux, mais la couleur violette n'est pas là. Cuit, tout oignon convient." }
  ],

  /* Viandes */
  lardons: [
    { par: "Champignons de Paris émincés, même poids, sautés à feu vif jusqu'à dorure avec une pincée de paprika fumé.",
      note: "Version végétarienne qui donne du fumé et du moelleux, pas le gras ni la salaison. Ils rendent de l'eau : les laisser évaporer avant de poursuivre." }
  ]
};
