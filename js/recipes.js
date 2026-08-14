/* Données des recettes — Carnet de cuisine d'Adrien
   Chaque ingrédient : qty/unit pour la recette, rayon + éventuel `shop`
   (quantité/libellé côté courses), `cid` = identifiant commun pour fusionner
   les quantités entre recettes, `course:false` = exclu de la liste. */

const RECIPES = [
  {
    id: "focaccia-romarin",
    title: "Focaccia maison au romarin",
    subtitle: "Moelleuse, alvéolée, sans pétrissage difficile",
    category: "Apéro",
    tags: ["four", "pain", "végétarien"],
    emoji: "🫓",
    color: "#E8B85C",
    times: { prep: 20, repos: 150, cuisson: 20 },
    reposLabel: "Levée",
    portions: { base: 8, label: "personnes" },
    note: "À déguster tiède… ou froide le lendemain, elle est encore meilleure !",
    ingredients: [
      { name: "Farine T55 ou T65", qty: 500, unit: "g", rayon: "Épicerie", cid: "farine",
        shop: { label: "Farine de blé T55 ou T65", note: "de préférence riche en gluten / italienne" } },
      { name: "Levure boulangère déshydratée", qty: 7, unit: "g", note: "1 sachet", rayon: "Épicerie", cid: "levure",
        shop: { label: "Levure boulangère déshydratée", qty: 1, unit: "sachet", note: "ou 20 g de levure fraîche" } },
      { name: "Eau tiède", qty: 380, unit: "ml", course: false },
      { name: "Sel fin", qty: 10, unit: "g", rayon: "Assaisonnements", cid: "sel-fin",
        shop: { label: "Sel fin de cuisine", qtyText: "" } },
      { name: "Huile d'olive vierge extra", qty: 8, unit: "cl", note: "5 cl pour la pâte + 3 cl pour la surface", rayon: "Épicerie", cid: "huile-olive",
        shop: { label: "Huile d'olive vierge extra", qty: null, note: "de très bonne qualité, quantité généreuse" } },
      { name: "Fleur de sel", qty: null, qtyText: "quelques pincées", rayon: "Assaisonnements", cid: "fleur-de-sel",
        shop: { label: "Fleur de sel" } },
      { name: "Romarin frais", qty: null, qtyText: "quelques brins", rayon: "Fruits, légumes & herbes", cid: "romarin",
        shop: { label: "Romarin frais", qtyText: "quelques brins" } }
    ],
    steps: [
      {
        t: "La pâte (sans pétrissage difficile)",
        txt: "Dans un grand saladier, diluez la levure dans l'eau tiède. Ajoutez la farine et le sel fin. Mélangez grossièrement à la spatule jusqu'à obtenir une pâte très humide et collante. Versez 2 c. à s. d'huile sur le dessus, couvrez d'un linge humide et laissez lever 2 h à température ambiante (la pâte doit doubler de volume).",
        timer: 120,
        tip: { t: "L'astuce du chef", txt: "Pour une pâte ultra-alvéolée sans effort, réalisez des « rabats » : toutes les 30 min environ, attrapez un bord de la pâte avec les mains mouillées, étirez-le vers le haut et repliez-le vers le centre. Faites cela aux 4 points cardinaux. Cela structure le réseau de gluten !" }
      },
      {
        t: "Le transfert",
        txt: "Huilez généreusement un moule rectangulaire à bords hauts ou une plaque. Dégazez délicatement la pâte et déposez-la au centre. Laissez-la se détendre 20 min, puis étirez-la doucement du bout des doigts pour qu'elle épouse la forme du moule. Laissez lever à nouveau 30 min.",
        timer: 30
      },
      {
        t: "La création des trous",
        txt: "Préchauffez votre four à 220 °C (th. 7-8). Arrosez la focaccia avec le reste d'huile d'olive mélangé à 1 c. à s. d'eau. Enfoncez franchement vos doigts verticaux jusqu'au fond du moule pour créer les fameux cratères caractéristiques.",
        tip: { t: "Geste technique", txt: "Utilisez la pulpe de vos trois doigts du milieu (index, majeur, annulaire) bien écartés. N'ayez pas peur de toucher le fond du moule ! C'est ce geste qui emprisonne les bulles d'air sur les côtés sans déchirer la pâte." }
      },
      {
        t: "Finitions et cuisson",
        txt: "Parsemez de brins de romarin frais enfoncés légèrement dans les trous et de fleur de sel. Enfournez pour 20 à 25 min jusqu'à ce que la croûte soit intensément dorée et croustillante. Laissez tiédir sur une grille avant de découper.",
        timer: 20
      }
    ]
  },

  {
    id: "torsades-pesto",
    title: "Torsades feuilletées au pesto",
    subtitle: "Croustillantes, dorées, prêtes en 30 minutes",
    category: "Apéro",
    tags: ["four", "rapide"],
    emoji: "🥨",
    color: "#9BAA6B",
    times: { prep: 15, cuisson: 15 },
    portions: { base: 6, label: "personnes" },
    ingredients: [
      { name: "Pâte feuilletée pure beurre", qty: 1, unit: "rouleau", note: "rectangulaire idéalement", rayon: "Produits frais", cid: "pate-feuilletee",
        shop: { label: "Pâte feuilletée pure beurre", note: "rectangulaire de préférence" } },
      { name: "Pesto de basilic de qualité", qty: 1, unit: "petit pot", rayon: "Épicerie", cid: "pesto",
        shop: { label: "Pesto de basilic de qualité", qty: 1, unit: "pot", note: "ou pignons, parmesan et basilic s'il est fait maison" } },
      { name: "Pignons de pin ou parmesan râpé", qty: 20, unit: "g", note: "pour parsemer", optional: true, rayon: "Épicerie", cid: "pignons" },
      { name: "Jaune d'œuf", qty: 1, unit: "", note: "pour la dorure", rayon: "Produits frais", cid: "oeufs",
        shop: { label: "Œuf (jaune pour la dorure)" } }
    ],
    steps: [
      {
        t: "Le montage",
        txt: "Déroulez la pâte feuilletée. Tartinez uniformément une moitié de la pâte avec le pesto en laissant une petite bordure propre. Parsemez de pignons de pin concassés si vous le souhaitez."
      },
      {
        t: "Le pliage",
        txt: "Rabattez la moitié de pâte nature sur la moitié garnie. Appuyez légèrement avec la paume de la main pour sceller les deux épaisseurs et chasser l'air.",
        timer: 10,
        tip: { t: "L'astuce du chef", txt: "Placez la pâte ainsi pliée pendant 10 minutes au congélateur avant de la découper. Le beurre va durcir, ce qui permettra une découpe nette sans que le pesto ne s'échappe partout." }
      },
      {
        t: "Le façonnage",
        txt: "À l'aide d'un couteau bien aiguisé ou d'une roulette à pizza, découpez des bandes d'environ 1,5 cm de largeur. Prenez chaque bande par les extrémités et tournez-les en sens inverse pour former une jolie torsade hélicoïdale.",
        tip: { t: "Comment couper net", txt: "Ne faites pas glisser la lame d'avant en arrière (cela écrase le feuilletage). Pressez fermement la lame de haut en bas d'un coup sec, ou utilisez une roulette à pizza bien aiguisée." }
      },
      {
        t: "Cuisson",
        txt: "Déposez les torsades sur une plaque recouverte de papier cuisson. Badigeonnez de jaune d'œuf dilué d'une goutte d'eau. Enfournez à 200 °C pendant 12 à 15 min. Elles doivent être bien gonflées et dorées.",
        timer: 13
      }
    ]
  },

  {
    id: "dip-chevre-herbes",
    title: "Dip de chèvre frais « double herbes »",
    subtitle: "Frais, onctueux, sans cuisson",
    category: "Apéro",
    tags: ["sans cuisson", "rapide", "végétarien"],
    emoji: "🥣",
    color: "#8FBF9F",
    times: { prep: 10 },
    portions: { base: 6, label: "personnes" },
    ingredients: [
      { name: "Chèvre frais", qty: 300, unit: "g", note: "type Petit Billy, Chavroux ou de producteur", rayon: "Produits frais", cid: "chevre-frais" },
      { name: "Crème liquide entière", qty: 5, unit: "cl", rayon: "Produits frais", cid: "creme-liquide" },
      { name: "Ciboulette fraîche", qty: 0.5, unit: "botte", rayon: "Fruits, légumes & herbes", cid: "ciboulette",
        shop: { label: "Ciboulette fraîche", qty: 1, unit: "botte" } },
      { name: "Basilic frais", qty: 0.5, unit: "botte", rayon: "Fruits, légumes & herbes", cid: "basilic",
        shop: { label: "Basilic frais", qty: 1, unit: "bouquet" } },
      { name: "Citron jaune non traité", qty: 0.5, unit: "", note: "les zestes", rayon: "Fruits, légumes & herbes", cid: "citron",
        shop: { label: "Citron jaune non traité" } },
      { name: "Sel fin et poivre du moulin", qty: null, rayon: "Assaisonnements", cid: "sel-poivre",
        shop: { label: "Sel fin, poivre noir du moulin" } }
    ],
    steps: [
      {
        t: "Le lissage",
        txt: "Travaillez le chèvre frais à la fourchette en incorporant progressivement la crème pour obtenir une crème épaisse et onctueuse."
      },
      {
        t: "La découpe des herbes",
        txt: "Ciselez finement la ciboulette et le basilic.",
        tip: { t: "L'astuce du chef", txt: "Pour le basilic, roulez les feuilles serrées comme un cigare et émincez de fines lanières avec un couteau très tranchant. Ne hachez jamais d'avant en arrière : cela l'oxyde et lui donne un goût d'herbe tondue." }
      },
      {
        t: "L'assemblage",
        txt: "Incorporez les herbes, ajoutez les zestes de citron, salez légèrement et poivrez généreusement. Réservez au frais. Servez avec la focaccia ou des radis croquants."
      }
    ]
  },

  {
    id: "houmous-petits-pois-menthe",
    title: "Houmous de petits pois frais & menthe",
    subtitle: "Vert vif, crémeux, incroyablement frais",
    category: "Apéro",
    tags: ["mixeur", "rapide", "végétarien"],
    emoji: "🫛",
    color: "#7FA65A",
    times: { prep: 15, cuisson: 3 },
    portions: { base: 6, label: "personnes" },
    ingredients: [
      { name: "Petits pois frais écossés", qty: 300, unit: "g", note: "ou surgelés de bonne qualité", rayon: "Produits frais", cid: "petits-pois" },
      { name: "Pois chiches cuits égouttés", qty: 200, unit: "g", rayon: "Épicerie", cid: "pois-chiches",
        shop: { label: "Pois chiches au naturel", qty: 1, unit: "bocal", note: "environ 400 g" } },
      { name: "Tahini (crème de sésame)", qty: 2, unit: "c. à s.", rayon: "Épicerie", cid: "tahini",
        shop: { label: "Tahini (crème de sésame)", qty: 1, unit: "pot" } },
      { name: "Citron jaune", qty: 1, unit: "", note: "le jus", rayon: "Fruits, légumes & herbes", cid: "citron",
        shop: { label: "Citron jaune non traité" } },
      { name: "Ail", qty: 1, unit: "petite gousse", note: "dégermée", rayon: "Fruits, légumes & herbes", cid: "ail",
        shop: { label: "Ail", qty: 2, unit: "gousses" } },
      { name: "Menthe fraîche", qty: null, qtyText: "10 à 12 feuilles", rayon: "Fruits, légumes & herbes", cid: "menthe",
        shop: { label: "Menthe fraîche", qty: 1, unit: "bouquet" } },
      { name: "Huile d'olive", qty: null, qtyText: "un filet", rayon: "Épicerie", cid: "huile-olive",
        shop: { label: "Huile d'olive vierge extra", qty: null } },
      { name: "Sel et une pincée de cumin", qty: null, rayon: "Assaisonnements", cid: "cumin",
        shop: { label: "Cumin moulu" } }
    ],
    steps: [
      {
        t: "La cuisson flash",
        txt: "Plongez les petits pois 3 min dans l'eau bouillante salée. Égouttez et plongez-les immédiatement dans de l'eau glacée avec des glaçons.",
        timer: 3,
        tip: { t: "L'astuce du chef", txt: "Ce choc thermique fixe la chlorophylle et garde une couleur vert vif éclatante." }
      },
      {
        t: "Le mixage",
        txt: "Dans le bol du mixeur, mettez les petits pois, les pois chiches, le tahini, le jus de citron, l'ail, la menthe et le cumin."
      },
      {
        t: "L'émulsion",
        txt: "Mixez. Versez un filet d'huile d'olive puis, si besoin, 1 à 2 c. à s. d'eau glacée jusqu'à obtenir une texture lisse et aérienne. Goûtez et ajustez en sel.",
        tip: { t: "Astuce onctuosité", txt: "L'ajout d'eau très froide pendant le mixage crée une émulsion magique avec le sésame du tahini, pour un houmous incroyablement crémeux." }
      },
      {
        t: "Dressage",
        txt: "Servez dans un joli bol, creusez un sillon, ajoutez un filet d'huile d'olive et décorez de quelques petits pois entiers et de feuilles de menthe."
      }
    ]
  }
];

const RAYONS = ["Épicerie", "Produits frais", "Fruits, légumes & herbes", "Assaisonnements", "Autre"];
