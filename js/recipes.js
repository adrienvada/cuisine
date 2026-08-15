/* Données des recettes — Carnet de cuisine d'Evadri
   Chaque ingrédient : qty/unit pour la recette, rayon + éventuel `shop`
   (quantité/libellé côté courses), `cid` = identifiant commun pour fusionner
   les quantités entre recettes, `course:false` = exclu de la liste.

   Composer sa version, façon fast-food :
   - `choices` : groupes à choix unique (ex. la vinaigrette). Chaque option
     porte ses ingrédients et son étape ; dans `steps`, l'emplacement est
     marqué `{ choice: "<id du groupe>" }` et prend l'étape de l'option choisie.
   - `addons` : suppléments cochables. Chaque supplément porte ses ingrédients
     et `step: { i, txt }` — le geste qui vient enrichir l'étape d'index `i`.
     `step.timer` (minutes) lui donne son propre compte à rebours en mode
     cuisine, indépendant de celui de l'étape : dès qu'un texte annonce une
     durée, il lui faut son minuteur.

   `discovered` (facultatif) : où la recette a été découverte. La phrase
   commence par sa préposition, elle complète « Découverte … » —
   « à l'hôtel … », « au Murmure du Son », « chez Mamie »… */

const RECIPES = [
  {
    id: "focaccia-romarin",
    image: "img/focaccia-romarin.jpg",
    title: "Focaccia maison au romarin",
    subtitle: "Moelleuse, alvéolée, sans pétrissage difficile",
    category: "Apéro",
    tags: ["four", "pain", "végétarien"],
    emoji: "🫓",
    color: "#E8B85C",
    times: { prep: 20, repos: 170, cuisson: 20 },
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
      { name: "Huile d'olive vierge extra", qty: 8, unit: "cl", note: "3 cl pour la pâte + 5 cl pour le moule et la surface", rayon: "Épicerie", cid: "huile-olive",
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
        txt: "Huilez généreusement un moule rectangulaire à bords hauts ou une plaque. Dégazez délicatement la pâte et déposez-la au centre. Laissez-la se détendre 20 min : elle est trop rétractile pour être étirée tout de suite.",
        timer: 20
      },
      {
        t: "L'étirement et la seconde levée",
        txt: "Étirez la pâte doucement du bout des doigts pour qu'elle épouse la forme du moule, puis laissez-la lever à nouveau 30 min. Lancez le préchauffage du four à 220 °C (th. 7-8) maintenant : il sera à température pile quand la pâte sera prête.",
        timer: 30,
        tip: { t: "Geste technique", txt: "Si la pâte résiste et revient sur elle-même, ne forcez pas : laissez-la se détendre cinq minutes de plus et reprenez. Une pâte étirée de force se déchire et perd ses bulles." }
      },
      {
        t: "La création des trous",
        txt: "Arrosez la focaccia avec le reste d'huile d'olive mélangé à 1 c. à s. d'eau. Enfoncez franchement vos doigts verticaux jusqu'au fond du moule pour créer les fameux cratères caractéristiques.",
        tip: { t: "Geste technique", txt: "Utilisez la pulpe de vos trois doigts du milieu (index, majeur, annulaire) bien écartés. N'ayez pas peur de toucher le fond du moule ! C'est ce geste qui emprisonne les bulles d'air sur les côtés sans déchirer la pâte." }
      },
      {
        t: "Finitions et cuisson",
        txt: "Parsemez de brins de romarin frais enfoncés légèrement dans les trous et de fleur de sel. Enfournez pour 20 à 25 min jusqu'à ce que la croûte soit intensément dorée et croustillante. Laissez tiédir sur une grille avant de découper.",
        timer: 20
      }
    ],
    addons: [
      { id: "olives", label: "Olives noires", emoji: "🫒",
        ingredients: [{ name: "Olives noires", qty: 100, unit: "g", note: "dénoyautées", rayon: "Épicerie", cid: "olives",
          shop: { label: "Olives noires (type Kalamata)" } }],
        step: { i: 4, txt: "Enfoncez les olives dans les cratères en même temps que le romarin." } },
      { id: "feta", label: "Feta", emoji: "🧀",
        ingredients: [{ name: "Feta", qty: 100, unit: "g", rayon: "Produits frais", cid: "feta" }],
        step: { i: 4, txt: "Parsemez la focaccia de feta émiettée avant d'enfourner : elle va dorer et confire dans les cratères." } },
      { id: "tomates-cerises", label: "Tomates cerises", emoji: "🍅",
        ingredients: [{ name: "Tomates cerises", qty: 150, unit: "g", rayon: "Fruits, légumes & herbes", cid: "tomates-cerises" }],
        step: { i: 4, txt: "Coupez les tomates cerises en deux et enfoncez-les dans la pâte, face coupée vers le haut, avant d'enfourner." } },
      { id: "oignon-rouge", label: "Oignon rouge", emoji: "🧅",
        ingredients: [{ name: "Oignon rouge", qty: 0.5, unit: "", rayon: "Fruits, légumes & herbes", cid: "oignon-rouge",
          shop: { label: "Oignon rouge", qty: 1, unit: "" } }],
        step: { i: 4, txt: "Répartissez l'oignon rouge émincé en très fines lamelles sur la surface, avec un filet d'huile pour qu'il confise." } }
    ]
  },

  {
    id: "torsades-pesto",
    image: "img/torsades-pesto.jpg",
    title: "Torsades feuilletées au pesto",
    subtitle: "Croustillantes, dorées, prêtes en 40 minutes",
    category: "Apéro",
    tags: ["four", "rapide"],
    emoji: "🥨",
    color: "#9BAA6B",
    times: { prep: 15, repos: 10, cuisson: 15 },
    reposLabel: "Repos au froid",
    portions: { base: 6, label: "personnes" },
    ingredients: [
      { name: "Pâte feuilletée pure beurre", qty: 1, unit: "rouleau", note: "rectangulaire idéalement", rayon: "Produits frais", cid: "pate-feuilletee",
        shop: { label: "Pâte feuilletée pure beurre", note: "rectangulaire de préférence" } },
      { name: "Pesto de basilic de qualité", qty: 1, unit: "petit pot", rayon: "Épicerie", cid: "pesto",
        shop: { label: "Pesto de basilic de qualité", qty: 1, unit: "pot", note: "ou pignons, parmesan et basilic s'il est fait maison" } },
      { name: "Pignons de pin ou parmesan râpé", qty: 20, unit: "g", note: "pour parsemer", optional: true, rayon: "Épicerie", cid: "pignons" },
      { name: "Jaune d'œuf", qty: 1, unit: "", note: "pour la dorure", rayon: "Produits frais", cid: "oeufs",
        shop: { label: "Œufs frais", note: "1 jaune pour la dorure des torsades" } }
    ],
    steps: [
      {
        t: "Le montage",
        txt: "Déroulez la pâte feuilletée. Tartinez uniformément une moitié de la pâte avec le pesto en laissant une petite bordure propre. Parsemez de pignons de pin concassés si vous le souhaitez."
      },
      {
        t: "Le pliage",
        txt: "Rabattez la moitié de pâte nature sur la moitié garnie. Appuyez légèrement avec la paume de la main pour sceller les deux épaisseurs et chasser l'air, puis placez la pâte 10 minutes au congélateur.",
        timer: 10,
        tip: { t: "L'astuce du chef", txt: "Ce passage au froid fait durcir le beurre : la découpe sera nette et le pesto ne s'échappera pas de partout. Une pâte molle, elle, s'écrase sous la lame." }
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
    ],
    addons: [
      { id: "chorizo", label: "Chorizo", emoji: "🌶️",
        ingredients: [{ name: "Chorizo en fines tranches", qty: 50, unit: "g", rayon: "Produits frais", cid: "chorizo" }],
        step: { i: 0, txt: "Disposez les tranches de chorizo sur le pesto avant de replier la pâte." } },
      { id: "sesame", label: "Graines de sésame", emoji: "✨",
        ingredients: [{ name: "Graines de sésame", qty: 1, unit: "c. à s.", rayon: "Épicerie", cid: "sesame",
          shop: { label: "Graines de sésame", qty: 1, unit: "sachet" } }],
        step: { i: 3, txt: "Parsemez les torsades de graines de sésame juste après la dorure au jaune d'œuf." } }
    ]
  },

  {
    id: "dip-chevre-herbes",
    image: "img/dip-chevre-herbes.jpg",
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
      { name: "Citron jaune non traité", qty: 0.5, unit: "", note: "les zestes et un trait de jus", rayon: "Fruits, légumes & herbes", cid: "citron",
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
        txt: "Incorporez les herbes, ajoutez les zestes de citron et un trait de jus, salez légèrement et poivrez généreusement. Réservez au frais. Servez avec la focaccia ou des radis croquants.",
        tip: { t: "Astuce du chef", txt: "Les zestes parfument, le jus réveille : sans cette pointe d'acidité, un dip de chèvre reste plat en bouche. Ajoutez-le goutte à goutte, la crème ne doit pas se liquéfier." }
      }
    ],
    addons: [
      { id: "noix", label: "Noix concassées", emoji: "🌰",
        ingredients: [{ name: "Cerneaux de noix", qty: 1, unit: "poignée", rayon: "Épicerie", cid: "noix" }],
        step: { i: 2, txt: "Parsemez le dip de noix grossièrement concassées au moment de servir." } },
      { id: "miel", label: "Filet de miel", emoji: "🍯",
        ingredients: [{ name: "Miel", qty: null, qtyText: "1 filet", rayon: "Épicerie", cid: "miel",
          shop: { label: "Miel", qty: 1, unit: "pot" } }],
        step: { i: 2, txt: "Terminez par un filet de miel : le sucré-salé fait merveille avec le chèvre." } },
      { id: "radis", label: "Radis à tremper", emoji: "🌱",
        ingredients: [{ name: "Radis", qty: 1, unit: "botte", rayon: "Fruits, légumes & herbes", cid: "radis" }],
        step: { i: 2, txt: "Servez avec les radis équeutés, à tremper directement dans le dip." } }
    ]
  },

  {
    id: "houmous-petits-pois-menthe",
    image: "img/houmous-petits-pois-menthe.jpg",
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
        txt: "Dans le bol du mixeur, mettez les petits pois, les pois chiches, le tahini, le jus de citron, l'ail et le cumin. Gardez la menthe de côté."
      },
      {
        t: "L'émulsion",
        txt: "Mixez. Versez un filet d'huile d'olive puis, si besoin, 1 à 2 c. à s. d'eau glacée jusqu'à obtenir une texture lisse et aérienne. Ajoutez enfin la menthe et donnez trois ou quatre impulsions seulement. Goûtez et ajustez en sel.",
        tip: { t: "Astuce onctuosité", txt: "L'eau très froide crée avec le sésame du tahini une émulsion qui rend le houmous incroyablement crémeux. Et la menthe arrive en dernier : mixée longuement, elle noircit et tourne au goût d'herbe mâchée." }
      },
      {
        t: "Dressage",
        txt: "Servez dans un joli bol, creusez un sillon, ajoutez un filet d'huile d'olive et décorez de quelques petits pois entiers et de feuilles de menthe."
      }
    ],
    addons: [
      { id: "feta", label: "Feta émiettée", emoji: "🧀",
        ingredients: [{ name: "Feta", qty: 50, unit: "g", rayon: "Produits frais", cid: "feta" }],
        step: { i: 3, txt: "Émiettez la feta sur le houmous au moment du dressage." } },
      { id: "sesame", label: "Sésame torréfié", emoji: "✨",
        ingredients: [{ name: "Graines de sésame", qty: 1, unit: "c. à s.", rayon: "Épicerie", cid: "sesame",
          shop: { label: "Graines de sésame", qty: 1, unit: "sachet" } }],
        step: { i: 3, timer: 2, txt: "Faites dorer les graines de sésame 2 min à la poêle à sec et parsemez-en le houmous." } },
      { id: "pita", label: "Pains pita", emoji: "🫓",
        ingredients: [{ name: "Pains pita", qty: 4, unit: "", rayon: "Épicerie", cid: "pita",
          shop: { label: "Pains pita", qty: 1, unit: "paquet" } }],
        step: { i: 3, txt: "Faites tiédir les pitas au grille-pain et coupez-les en quartiers, pour saucer généreusement." } }
    ]
  },

  {
    id: "salade-kale-pomme-oeuf",
    image: "img/salade-kale-pomme-oeuf.jpg",
    title: "Salade croquante de kale, pomme & œuf mollet",
    subtitle: "Kale massé, fruits secs torréfiés, œuf coulant",
    category: "Salades",
    tags: ["frais", "végétarien", "œufs"],
    emoji: "🥬",
    color: "#6FA287",
    times: { prep: 25, cuisson: 10 },
    portions: { base: 4, label: "personnes" },
    ingredients: [
      { name: "Chou kale", qty: 1, unit: "bouquet", rayon: "Fruits, légumes & herbes", cid: "kale" },
      { name: "Pomme croquante", qty: 1, unit: "", note: "type Granny Smith ou Gala", rayon: "Fruits, légumes & herbes", cid: "pomme",
        shop: { label: "Pommes croquantes (Granny Smith ou Gala)" } },
      { name: "Cerneaux de noix", qty: 1, unit: "poignée", rayon: "Épicerie", cid: "noix" },
      { name: "Graines de courge", qty: 2, unit: "c. à s.", rayon: "Épicerie", cid: "graines-courge",
        shop: { label: "Graines de courge", qty: 1, unit: "sachet" } },
      { name: "Œufs frais", qty: 4, unit: "", note: "2 à 4 selon les appétits", rayon: "Produits frais", cid: "oeufs",
        shop: { label: "Œufs frais" } },
      { name: "Persil plat", qty: 0.5, unit: "bouquet", rayon: "Fruits, légumes & herbes", cid: "persil",
        shop: { label: "Persil plat", qty: 1, unit: "bouquet" } },
      { name: "Huile d'olive", qty: 1, unit: "c. à s.", note: "pour masser le kale", rayon: "Épicerie", cid: "huile-olive",
        shop: { label: "Huile d'olive vierge extra", qty: null } },
      { name: "Sel et poivre", qty: null, rayon: "Assaisonnements", cid: "sel-poivre",
        shop: { label: "Sel fin, poivre noir du moulin" } }
    ],
    choices: [{
      id: "vinaigrette", label: "La vinaigrette",
      options: [
        { id: "moutarde-cidre", label: "Moutarde & cidre", emoji: "🥄",
          ingredients: [
            { name: "Huile d'olive", qty: 3, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "huile-olive",
              shop: { label: "Huile d'olive vierge extra", qty: null } },
            { name: "Vinaigre de cidre", qty: 1, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "vinaigre-cidre" },
            { name: "Moutarde", qty: 1, unit: "c. à c.", note: "vinaigrette", rayon: "Épicerie", cid: "moutarde",
              shop: { label: "Moutarde de Dijon", qty: 1, unit: "pot" } }
          ],
          step: { t: "Vinaigrette moutarde & cidre",
            txt: "Fouettez la moutarde avec le vinaigre de cidre, du sel et du poivre, puis montez en émulsion avec l'huile d'olive.",
            tip: { t: "Astuce du chef", txt: "Versez l'huile en filet sans cesser de fouetter : l'émulsion tiendra jusqu'au service sans retomber." } } },
        { id: "tahini-citron", label: "Tahini & citron", emoji: "🥣",
          ingredients: [
            { name: "Tahini (crème de sésame)", qty: 1.5, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "tahini",
              shop: { label: "Tahini (crème de sésame)", qty: 1, unit: "pot" } },
            { name: "Citron jaune", qty: 0.5, unit: "", note: "le jus — vinaigrette", rayon: "Fruits, légumes & herbes", cid: "citron",
              shop: { label: "Citron jaune non traité" } },
            { name: "Huile d'olive", qty: 1, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "huile-olive",
              shop: { label: "Huile d'olive vierge extra", qty: null } }
          ],
          step: { t: "Sauce crémeuse tahini-citron",
            txt: "Délayez le tahini avec le jus de citron et 2 à 3 c. à s. d'eau froide jusqu'à obtenir une crème nappante, puis ajoutez l'huile d'olive, du sel et du poivre.",
            tip: { t: "Astuce du chef", txt: "Le tahini épaissit d'abord au contact du citron avant de se détendre : ajoutez l'eau cuillère par cuillère, la texture soyeuse arrive d'un coup." } } },
        { id: "miel-moutarde", label: "Miel & moutarde", emoji: "🍯",
          ingredients: [
            { name: "Miel", qty: 1, unit: "c. à c.", note: "vinaigrette", rayon: "Épicerie", cid: "miel",
              shop: { label: "Miel", qty: 1, unit: "pot" } },
            { name: "Moutarde", qty: 1, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "moutarde",
              shop: { label: "Moutarde de Dijon", qty: 1, unit: "pot" } },
            { name: "Vinaigre de cidre", qty: 1, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "vinaigre-cidre" },
            { name: "Huile d'olive", qty: 3, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "huile-olive",
              shop: { label: "Huile d'olive vierge extra", qty: null } }
          ],
          step: { t: "Vinaigrette miel-moutarde",
            txt: "Mélangez le miel, la moutarde et le vinaigre de cidre, salez, poivrez, puis émulsionnez avec l'huile d'olive.",
            tip: { t: "Astuce du chef", txt: "Le miel adoucit l'amertume résiduelle du kale : goûtez et ajustez la balance sucré-acide en fin d'émulsion." } } }
      ]
    }],
    addons: [
      { id: "avocat", label: "Avocat", emoji: "🥑",
        ingredients: [{ name: "Avocat mûr", qty: 1, unit: "", rayon: "Fruits, légumes & herbes", cid: "avocat",
          shop: { label: "Avocats mûrs" } }],
        step: { i: 5, txt: "Coupez l'avocat en lamelles au dernier moment et citronnez-les légèrement pour qu'elles restent vertes." } },
      { id: "parmesan", label: "Copeaux de parmesan", emoji: "🧀",
        ingredients: [{ name: "Parmesan en bloc", qty: 40, unit: "g", rayon: "Produits frais", cid: "parmesan" }],
        step: { i: 5, txt: "Prélevez des copeaux de parmesan à l'économe et répartissez-les sur la salade." } },
      { id: "cranberries", label: "Cranberries séchées", emoji: "🍒",
        ingredients: [{ name: "Cranberries séchées", qty: 40, unit: "g", rayon: "Épicerie", cid: "cranberries",
          shop: { label: "Cranberries séchées", qty: 1, unit: "sachet" } }],
        step: { i: 5, txt: "Parsemez les cranberries avec les fruits secs torréfiés, pour une note sucrée qui répond au kale." } }
    ],
    steps: [
      {
        t: "Préparer et masser le kale",
        txt: "Lavez le kale, retirez les tiges centrales rigides et hachez finement les feuilles. Placez-les dans un saladier avec une pincée de sel et un filet d'huile d'olive, puis massez fermement les feuilles à la main pendant 3 minutes.",
        timer: 3,
        tip: { t: "Astuce du chef", txt: "Le massage casse la fibre coriace du kale brut, le rendant infiniment plus tendre et agréable en bouche tout en atténuant son amertume. Les feuilles doivent visiblement foncer et réduire de volume." }
      },
      {
        t: "Torréfier les graines et noix",
        txt: "Faites chauffer une poêle à sec à feu moyen. Faites-y torréfier les graines de courge et les cerneaux de noix pendant 3 à 4 minutes en remuant régulièrement jusqu'à ce qu'ils soient légèrement dorés.",
        timer: 4,
        tip: { t: "Astuce du chef", txt: "Laissez refroidir les fruits secs sur un papier absorbant plutôt que dans la poêle chaude pour stopper la cuisson et préserver tout leur croustillant." }
      },
      {
        t: "Découpe de la pomme",
        txt: "Lavez la pomme et taillez-la en fins bâtonnets (julienne) ou en tranches très fines. Hachez le persil plat.",
        tip: { t: "Astuce du chef", txt: "Plongez immédiatement les morceaux de pomme dans un bol d'eau froide citronnée pour éviter qu'ils ne s'oxydent et noircissent." }
      },
      {
        t: "Cuire les œufs mollets",
        txt: "Portez une casserole d'eau à ébullition. Plongez-y délicatement les œufs et comptez exactement 6 minutes de cuisson.",
        timer: 6,
        tip: { t: "Astuce du chef", txt: "Plongez immédiatement les œufs dans un grand bol d'eau glacée dès la fin du chrono pour stopper la cuisson et faciliter l'écalage." }
      },
      { choice: "vinaigrette" },
      {
        t: "Assemblage et assaisonnement",
        txt: "Dans les assiettes, dressez le kale massé, la pomme, le persil, les graines torréfiées et les noix. Nappez de vinaigrette, déposez l'œuf mollet délicatement écalé au centre et ouvrez-le au dernier moment.",
        tip: { t: "Astuce du chef", txt: "Écalez l'œuf mollet directement sous un filet d'eau tiède pour que la coquille glisse toute seule sans abîmer le blanc." }
      }
    ]
  },

  {
    id: "veloute-butternut-shiitakes",
    image: "img/veloute-butternut-shiitakes.jpg",
    title: "Velouté onctueux de butternut, shiitakés & artichauts poêlés",
    subtitle: "Réconfortant, caramélisé, garni de champignons dorés",
    category: "Soupes",
    tags: ["réconfortant", "automne", "végétarien"],
    emoji: "🎃",
    color: "#E0973F",
    times: { prep: 20, cuisson: 30 },
    portions: { base: 4, label: "personnes" },
    ingredients: [
      { name: "Courge butternut", qty: 1, unit: "", rayon: "Fruits, légumes & herbes", cid: "butternut" },
      { name: "Champignons shiitakés frais", qty: 200, unit: "g", rayon: "Fruits, légumes & herbes", cid: "shiitakes" },
      { name: "Cœurs d'artichauts marinés", qty: 1, unit: "bocal", rayon: "Épicerie", cid: "artichauts" },
      { name: "Oignon", qty: 1, unit: "", rayon: "Fruits, légumes & herbes", cid: "oignon" },
      { name: "Ail", qty: 1, unit: "gousse", rayon: "Fruits, légumes & herbes", cid: "ail",
        shop: { label: "Ail", qty: 2, unit: "gousses" } },
      { name: "Bouillon de légumes", qty: 50, unit: "cl", rayon: "Épicerie", cid: "bouillon",
        shop: { label: "Bouillon de légumes", qty: 1, unit: "", note: "cubes ou brique, 50 cl" } },
      { name: "Crème fraîche ou crème de coco", qty: 2, unit: "c. à s.", rayon: "Produits frais", cid: "creme-fraiche" },
      { name: "Beurre", qty: null, qtyText: "un peu", rayon: "Produits frais", cid: "beurre",
        shop: { label: "Beurre doux" } },
      { name: "Huile d'olive", qty: null, qtyText: "un filet", rayon: "Épicerie", cid: "huile-olive",
        shop: { label: "Huile d'olive vierge extra", qty: null } },
      { name: "Sel, poivre, muscade", qty: null, rayon: "Assaisonnements", cid: "muscade",
        shop: { label: "Noix de muscade" } }
    ],
    steps: [
      {
        t: "Cuisson du butternut",
        txt: "Épluchez et coupez le butternut en cubes. Dans une cocotte, faites fondre l'oignon haché dans le beurre, ajoutez les cubes de courge et laissez-les colorer quelques minutes. Versez le bouillon en en réservant 10 cl pour le mixage, puis laissez mijoter 20 minutes.",
        timer: 20,
        tip: { t: "Astuce du chef", txt: "Attendez que le beurre soit mousseux et légèrement noisette avant d'ajouter la courge : c'est cette coloration au départ qui donne au velouté son goût caramélisé." }
      },
      {
        t: "Mixage du velouté",
        txt: "Mixez le butternut cuit avec la crème, une pincée de noix de muscade, du sel et du poivre. Détendez avec le bouillon réservé, versé petit à petit, jusqu'à la densité qui vous plaît. Gardez au chaud pendant que vous préparez la garniture.",
        tip: { t: "Astuce du chef", txt: "Un velouté réussi nappe le dos d'une cuillère sans être pâteux. Mieux vaut le détendre par petites touches : on peut toujours en rajouter, jamais en retirer." }
      },
      {
        t: "Poêlée de shiitakés",
        txt: "Nettoyez les shiitakés avec un linge humide (ne les immergez pas) et coupez-les en lamelles. Faites-les poêler à feu vif avec une gousse d'ail écrasée et un filet d'huile d'olive pendant 5 à 7 minutes.",
        timer: 6,
        tip: { t: "Astuce du chef", txt: "Assaisonnez les champignons en sel uniquement en fin de cuisson pour éviter qu'ils ne rendent leur eau et restent bien dorés." }
      },
      {
        t: "Dorure des artichauts",
        txt: "Égouttez les cœurs d'artichauts, épongez-les bien, coupez-les en deux ou en quatre, puis poêlez-les à feu vif dans un peu d'huile 2 à 3 minutes, jusqu'à belle coloration dorée.",
        timer: 3,
        tip: { t: "Astuce du chef", txt: "L'épongeage n'est pas facultatif : des artichauts encore humides cuisent à la vapeur dans la poêle au lieu de griller, et ressortent mous et ternes." }
      },
      {
        t: "Dressage",
        txt: "Versez le velouté chaud dans des assiettes creuses, puis disposez harmonieusement les shiitakés et les artichauts dorés par-dessus.",
        tip: { t: "Astuce du chef", txt: "Terminez par un filet de l'huile de marinade des artichauts sur le dessus pour ajouter une touche aromatique instantanée." }
      }
    ],
    addons: [
      { id: "graines-courge", label: "Graines de courge torréfiées", emoji: "🎃",
        ingredients: [{ name: "Graines de courge", qty: 2, unit: "c. à s.", rayon: "Épicerie", cid: "graines-courge",
          shop: { label: "Graines de courge", qty: 1, unit: "sachet" } }],
        step: { i: 4, timer: 3, txt: "Torréfiez les graines de courge 3 min à la poêle à sec et parsemez-en le velouté." } },
      { id: "croutons", label: "Croûtons dorés", emoji: "🍞",
        ingredients: [{ name: "Pain de campagne", qty: 2, unit: "tranches", rayon: "Épicerie", cid: "pain",
          shop: { label: "Pain de campagne" } }],
        step: { i: 4, txt: "Taillez le pain en petits dés et faites-les dorer dans un peu de beurre pour des croûtons croustillants." } },
      { id: "chataignes", label: "Châtaignes poêlées", emoji: "🌰",
        ingredients: [{ name: "Châtaignes cuites", qty: 100, unit: "g", note: "sous vide ou en bocal", rayon: "Épicerie", cid: "chataignes" }],
        step: { i: 2, txt: "Faites dorer les châtaignes grossièrement émiettées avec les shiitakés." } }
    ]
  },

  {
    id: "gravlax-saumon-yaourt-bulgare",
    image: "img/gravlax-saumon-yaourt-bulgare.jpg",
    title: "Gravlax de saumon, sauce au yaourt bulgare & agrumes",
    subtitle: "Fines herbes, pain suédois grillé et tomates anciennes",
    discovered: "au Bercail, restaurant au bord de l'eau à Avignon",
    category: "Entrées",
    tags: ["poisson", "marinade", "chic"],
    emoji: "🐟",
    color: "#E38E7A",
    times: { prep: 30, repos: 720, cuisson: 2 },
    reposLabel: "Marinade",
    portions: { base: 6, label: "personnes" },
    ingredients: [
      { name: "Filet de saumon ultra-frais", qty: 500, unit: "g", note: "avec la peau, désarêté", rayon: "Produits frais", cid: "saumon" },
      { name: "Gros sel", qty: 60, unit: "g", note: "mélange gravlax", rayon: "Assaisonnements", cid: "gros-sel" },
      { name: "Sucre de canne", qty: 60, unit: "g", note: "mélange gravlax", rayon: "Épicerie", cid: "sucre-canne" },
      { name: "Baies roses concassées", qty: 1, unit: "c. à s.", note: "mélange gravlax", rayon: "Assaisonnements", cid: "baies-roses" },
      { name: "Yaourt bulgare", qty: 200, unit: "g", note: "sauce — ou yaourt grec bien épais", rayon: "Produits frais", cid: "yaourt-bulgare",
        shop: { label: "Yaourt bulgare", qty: 1, unit: "pot", note: "ou yaourt grec bien épais" } },
      { name: "Citron jaune non traité", qty: 1, unit: "", note: "zeste et jus — sauce", rayon: "Fruits, légumes & herbes", cid: "citron",
        shop: { label: "Citron jaune non traité" } },
      { name: "Orange non traitée", qty: 0.5, unit: "", note: "zeste et jus — sauce", rayon: "Fruits, légumes & herbes", cid: "orange",
        shop: { label: "Orange non traitée", qty: 1, unit: "" } },
      { name: "Huile d'olive vierge extra", qty: 1, unit: "c. à s.", note: "sauce, plus quelques gouttes au dressage", rayon: "Épicerie", cid: "huile-olive",
        shop: { label: "Huile d'olive vierge extra", qty: null } },
      { name: "Pain suédois", qty: 4, unit: "", note: "type polar bread, ou un pain plat fin", rayon: "Épicerie", cid: "pain-suedois",
        shop: { label: "Pain suédois (polar bread)", qty: 1, unit: "paquet", note: "ou pain plat fin type naan" } },
      { name: "Tomates anciennes", qty: 2, unit: "", note: "colorées et bien fermes", rayon: "Fruits, légumes & herbes", cid: "tomates" },
      { name: "Tomates cerises multicolores", qty: 100, unit: "g", rayon: "Fruits, légumes & herbes", cid: "tomates-cerises" },
      { name: "Cerfeuil frais", qty: 0.5, unit: "bouquet", note: "fines herbes", rayon: "Fruits, légumes & herbes", cid: "cerfeuil",
        shop: { label: "Cerfeuil frais", qty: 1, unit: "bouquet" } },
      { name: "Ciboulette fraîche", qty: 0.5, unit: "botte", note: "fines herbes", rayon: "Fruits, légumes & herbes", cid: "ciboulette",
        shop: { label: "Ciboulette fraîche", qty: 1, unit: "botte" } },
      { name: "Aneth frais", qty: 0.5, unit: "bouquet", note: "fines herbes", optional: true, rayon: "Fruits, légumes & herbes", cid: "aneth",
        shop: { label: "Aneth frais", qty: 1, unit: "bouquet" } },
      { name: "Sel et poivre", qty: null, rayon: "Assaisonnements", cid: "sel-poivre",
        shop: { label: "Sel fin, poivre noir du moulin" } }
    ],
    steps: [
      {
        t: "Préparation du gravlax",
        txt: "Mélangez le gros sel, le sucre et les baies roses — quelques zestes de citron ou d'orange y sont les bienvenus. Dans un plat, déposez un lit de ce mélange, posez le saumon côté peau vers le bas, puis recouvrez entièrement la chair avec le reste du mélange.",
        tip: { t: "À savoir avant de commencer", txt: "La salaison ne détruit pas les parasites (anisakis) : elle sale et raffermit, rien de plus. Pour du saumon consommé cru, prenez un poisson déjà surgelé, ou congelez-le vous-même 24 h à −20 °C — 48 à 72 h dans un congélateur domestique — puis décongelez-le au réfrigérateur avant de le mettre au sel." }
      },
      {
        t: "Temps de marinade",
        txt: "Filmez le plat au contact et placez au réfrigérateur pendant 12 à 24 heures.",
        timer: 720,
        tip: { t: "Astuce du chef", txt: "Posez une petite planche sur le poisson surmontée d'un poids (ex. une boîte de conserve) pour bien tasser la chair et expulser l'humidité." }
      },
      {
        t: "Rinçage et séchage",
        txt: "Retirez le saumon de sa marinade, rincez-le abondamment sous l'eau froide pour enlever tout le sel, puis épongez-le parfaitement avec du papier absorbant.",
        tip: { t: "Astuce du chef", txt: "Ne faites pas l'impasse sur le séchage : une chair bien sèche permet une découpe nette et évite une texture spongieuse." }
      },
      {
        t: "La sauce au yaourt bulgare et agrumes",
        txt: "Zestez le citron et la demi-orange, puis pressez-les. Fouettez le yaourt bulgare avec les zestes, 2 c. à s. de jus de citron, 1 c. à s. de jus d'orange, l'huile d'olive, du sel et du poivre. Réservez au frais.",
        tip: { t: "Astuce du chef", txt: "Zestez toujours avant de presser — l'inverse est impossible. Et gardez la sauce bien épaisse : elle doit s'étaler d'un coup de cuillère dans l'assiette sans couler. Trop de jus et elle file." }
      },
      {
        t: "Raffermir et trancher",
        txt: "Placez le filet 15 minutes au congélateur pour raffermir la chair, puis tranchez-le en fines lamelles dans le sens opposé aux fibres, en inclinant bien la lame.",
        timer: 15,
        tip: { t: "Astuce du chef", txt: "Un couteau long et fin, une seule passe par tranche, sans scier : c'est ce qui donne ces lamelles presque translucides. Une chair molle, elle, s'écrase sous la lame quelle que soit votre technique." }
      },
      {
        t: "Pain grillé et dressage",
        txt: "Passez les pains suédois 1 à 2 minutes sur un gril ou une poêle très chaude, juste pour les marquer. Étalez une large virgule de sauce dans chaque assiette, posez le pain à côté et drapez les lamelles de saumon dessus. Ajoutez les quartiers de tomate ancienne et quelques tomates cerises, parsemez de fines herbes ciselées et terminez par quelques gouttes d'huile d'olive.",
        timer: 2,
        tip: { t: "Astuce du chef", txt: "Dressez au tout dernier moment : le pain grillé ramollit vite sous le saumon froid, et c'est ce contraste tiède-croustillant contre froid-fondant qui fait tout le plat." }
      }
    ],
    addons: [
      { id: "capres", label: "Câpres", emoji: "🌿",
        ingredients: [{ name: "Câpres", qty: 2, unit: "c. à s.", rayon: "Épicerie", cid: "capres",
          shop: { label: "Câpres", qty: 1, unit: "bocal" } }],
        step: { i: 5, txt: "Parsemez le saumon de câpres bien égouttées en même temps que les fines herbes." } },
      { id: "fleurs", label: "Fleurs comestibles", emoji: "🌸",
        ingredients: [{ name: "Fleurs comestibles", qty: null, qtyText: "une pincée", note: "bleuet, souci, pétales de rose", rayon: "Fruits, légumes & herbes", cid: "fleurs-comestibles",
          shop: { label: "Fleurs comestibles", note: "fraîches ou séchées, au rayon herbes" } }],
        step: { i: 5, txt: "Éparpillez les pétales sur la sauce et le saumon au dernier moment : c'est ce qui donne à l'assiette son air de plat de chef." } },
      { id: "blinis", label: "Blinis tièdes", emoji: "🥞",
        ingredients: [{ name: "Blinis", qty: 1, unit: "paquet", rayon: "Produits frais", cid: "blinis" }],
        step: { i: 5, txt: "Faites tiédir les blinis à la poêle sans matière grasse et servez-les à la place du pain suédois, ou en plus." } }
    ]
  },

  {
    id: "beignets-brebis-menthe",
    image: "img/beignets-brebis-menthe.jpg",
    title: "Beignets de brebis à la menthe & sauce fraîche",
    subtitle: "Croustillants dehors, fondants dedans, sauce au yaourt mentholée",
    category: "Apéro",
    tags: ["friture", "fromage", "convivial"],
    emoji: "🧀",
    color: "#D9B65C",
    times: { prep: 25, repos: 60, cuisson: 10 },
    reposLabel: "Repos au frais",
    portions: { base: 4, label: "personnes" },
    ingredients: [
      { name: "Fromage de brebis frais", qty: 200, unit: "g", note: "type feta de brebis ou brocciu", rayon: "Produits frais", cid: "brebis-frais" },
      { name: "Menthe fraîche", qty: 0.5, unit: "bouquet", rayon: "Fruits, légumes & herbes", cid: "menthe",
        shop: { label: "Menthe fraîche", qty: 1, unit: "bouquet" } },
      { name: "Farine", qty: 150, unit: "g", note: "pâte à beignet", rayon: "Épicerie", cid: "farine",
        shop: { label: "Farine de blé T55 ou T65" } },
      { name: "Œuf", qty: 1, unit: "", note: "pâte à beignet", rayon: "Produits frais", cid: "oeufs",
        shop: { label: "Œufs frais" } },
      { name: "Eau gazeuse très froide", qty: 15, unit: "cl", note: "pâte à beignet", rayon: "Épicerie", cid: "eau-gazeuse",
        shop: { label: "Eau gazeuse", qty: 1, unit: "bouteille" } },
      { name: "Levure chimique", qty: 0.5, unit: "sachet", note: "pâte à beignet", rayon: "Épicerie", cid: "levure-chimique",
        shop: { label: "Levure chimique", qty: 1, unit: "sachet" } },
      { name: "Huile de friture", qty: null, qtyText: "1 bain", rayon: "Épicerie", cid: "huile-friture",
        shop: { label: "Huile de friture", qty: 1, unit: "bouteille" } },
      { name: "Yaourt grec", qty: 150, unit: "g", note: "sauce menthe", rayon: "Produits frais", cid: "yaourt-grec" },
      { name: "Jus de citron", qty: null, qtyText: "1 filet", note: "sauce menthe", rayon: "Fruits, légumes & herbes", cid: "citron",
        shop: { label: "Citron jaune non traité", qty: 1, unit: "" } },
      { name: "Sel et poivre", qty: null, rayon: "Assaisonnements", cid: "sel-poivre",
        shop: { label: "Sel fin, poivre noir du moulin" } }
    ],
    steps: [
      {
        t: "Sauce fraîche",
        txt: "Mélangez le yaourt grec, la menthe ciselée, le jus de citron, le sel et le poivre dans un bol. Réservez au frais 1 heure — vous préparerez le reste pendant ce temps.",
        timer: 60,
        tip: { t: "Astuce du chef", txt: "Cette heure n'est pas du confort : c'est le temps qu'il faut à la menthe pour infuser le yaourt. Sauce préparée à la dernière minute, on ne sent que le yaourt." }
      },
      {
        t: "Façonnage du fromage",
        txt: "Écrasez le fromage de brebis avec la menthe hachée à la fourchette, puis façonnez de petites boules ou quenelles, les mains mouillées ou légèrement huilées pour que ça n'accroche pas. Placez-les 30 minutes au réfrigérateur.",
        timer: 30,
        tip: { t: "Astuce du chef", txt: "Ce passage au froid est ce qui tient les beignets : un fromage frais à température ambiante fond dans l'huile chaude et perce la pâte. Dix minutes au congélateur font l'affaire si vous êtes pressé. Un brocciu, très fragile, demande d'être bien égoutté au préalable." }
      },
      {
        t: "Pâte à beignet express",
        txt: "Fouettez la farine, la levure, l'œuf et incorporez l'eau gazeuse glacée progressivement jusqu'à consistance d'une pâte à crêpe épaisse.",
        tip: { t: "Astuce du chef", txt: "L'eau gazeuse très froide provoque un choc thermique avec l'huile chaude, garantissant une croûte ultra-croustillante et peu grasse." }
      },
      {
        t: "Friture",
        txt: "Faites chauffer l'huile de friture à 170-180 °C. Trempez les boules de fromage bien froides dans la pâte, puis plongez-les dans l'huile environ 2 minutes, juste le temps qu'elles soient bien dorées.",
        timer: 2,
        tip: { t: "Astuce du chef", txt: "Ne cuisez pas trop de beignets à la fois pour éviter de faire chuter brutalement la température de l'huile." }
      },
      {
        t: "Égouttage et service",
        txt: "Sortez les beignets avec une écumoire et déposez-les immédiatement sur du papier absorbant. Servez bien chaud avec la sauce fraîche.",
        tip: { t: "Astuce du chef", txt: "Saupoudrez une pincée de fleur de sel et un zeste de citron juste au moment où les beignets sortent de la friture." }
      }
    ],
    addons: [
      { id: "miel", label: "Filet de miel", emoji: "🍯",
        ingredients: [{ name: "Miel", qty: null, qtyText: "1 filet", rayon: "Épicerie", cid: "miel",
          shop: { label: "Miel", qty: 1, unit: "pot" } }],
        step: { i: 4, txt: "Nappez les beignets chauds d'un filet de miel juste avant de servir, façon sucré-salé." } },
      { id: "harissa", label: "Sauce relevée à la harissa", emoji: "🌶️",
        ingredients: [{ name: "Harissa", qty: 1, unit: "c. à c.", rayon: "Épicerie", cid: "harissa",
          shop: { label: "Harissa", qty: 1, unit: "tube" } }],
        step: { i: 0, txt: "Incorporez la harissa à la sauce yaourt pour une version qui pique gentiment." } }
    ]
  },

  {
    id: "scoopable-cookies",
    image: "img/scoopable-cookies.jpg",
    title: "Scoopable cookies (cookies à la cuillère)",
    subtitle: "Mi-cuits, fondants, à servir à la cuillère à glace",
    category: "Desserts",
    tags: ["chocolat", "four", "gourmand"],
    emoji: "🍪",
    color: "#C08A4F",
    times: { prep: 15, cuisson: 12 },
    portions: { base: 6, label: "personnes" },
    ingredients: [
      { name: "Beurre doux ramolli", qty: 100, unit: "g", rayon: "Produits frais", cid: "beurre",
        shop: { label: "Beurre doux" } },
      { name: "Sucre cassonade", qty: 80, unit: "g", rayon: "Épicerie", cid: "cassonade" },
      { name: "Sucre blanc", qty: 40, unit: "g", rayon: "Épicerie", cid: "sucre" },
      { name: "Œuf", qty: 1, unit: "", rayon: "Produits frais", cid: "oeufs",
        shop: { label: "Œufs frais" } },
      { name: "Extrait de vanille", qty: 1, unit: "c. à c.", rayon: "Épicerie", cid: "vanille",
        shop: { label: "Extrait de vanille", qty: 1, unit: "flacon" } },
      { name: "Farine", qty: 160, unit: "g", rayon: "Épicerie", cid: "farine",
        shop: { label: "Farine de blé T55 ou T65" } },
      { name: "Bicarbonate de soude", qty: 0.5, unit: "c. à c.", rayon: "Épicerie", cid: "bicarbonate",
        shop: { label: "Bicarbonate de soude", qty: 1, unit: "sachet" } },
      { name: "Sel fin", qty: 3, unit: "g", note: "1/2 c. à c. — indispensable", rayon: "Assaisonnements", cid: "sel-fin",
        shop: { label: "Sel fin de cuisine", qtyText: "" } },
      { name: "Fleur de sel", qty: null, qtyText: "quelques pincées", note: "sur le dessus", optional: true, rayon: "Assaisonnements", cid: "fleur-de-sel",
        shop: { label: "Fleur de sel" } },
      { name: "Pépites de chocolat noir ou au lait", qty: 150, unit: "g", rayon: "Épicerie", cid: "pepites-chocolat" }
    ],
    steps: [
      {
        t: "Crémer le beurre et les sucres",
        txt: "Dans un cul-de-poule, battez le beurre ramolli avec la cassonade et le sucre blanc jusqu'à obtenir un mélange crémeux et homogène.",
        tip: { t: "Astuce du chef", txt: "L'association de sucre blanc (pour le croustillant) et de cassonade (pour le moelleux et les notes de caramel) donne la texture idéale pour le côté « scoopable »." }
      },
      {
        t: "Incorporer les liquides",
        txt: "Ajoutez l'œuf et l'extrait de vanille, puis mélangez vigoureusement.",
        tip: { t: "Astuce du chef", txt: "Veillez à ce que l'œuf soit à température ambiante pour éviter que le beurre ne tranche lors de l'incorporation." }
      },
      {
        t: "Ajout des poudres",
        txt: "Tamisez la farine, le bicarbonate de soude et le sel fin au-dessus du mélange, puis incorporez à la spatule sans trop travailler la pâte.",
        tip: { t: "Astuce du chef", txt: "Ne sautez pas le sel : avec du beurre doux et 120 g de sucre, une pâte à cookie sans sel reste plate en bouche. C'est lui qui fait ressortir le caramel de la cassonade et le chocolat." }
      },
      {
        t: "Incrustation des pépites",
        txt: "Ajoutez les pépites de chocolat et mélangez délicatement pour les répartir. Gardez-en une poignée de côté pour le dessus.",
        tip: { t: "Astuce du chef", txt: "Moins vous travaillez la farine, moins le gluten se développe : mélangez juste ce qu'il faut pour répartir le chocolat, la pâte n'en sera que plus tendre." }
      },
      {
        t: "Cuisson mi-cuite et service",
        txt: "Étalez la pâte dans un plat à four ou une poêle en fonte sur 2 à 3 cm d'épaisseur. Parsemez les pépites réservées et quelques pincées de fleur de sel. Enfournez à 180 °C pendant seulement 10 à 12 minutes : le centre doit rester presque cru et fondant.",
        timer: 11,
        tip: { t: "Astuce du chef", txt: "Servez chaud à la cuillère à glace directement dans le plat, idéalement surmonté d'une boule de glace vanille pour un contraste chaud-froid irrésistible." }
      }
    ],
    addons: [
      { id: "pecan", label: "Noix de pécan", emoji: "🌰",
        ingredients: [{ name: "Noix de pécan", qty: 80, unit: "g", rayon: "Épicerie", cid: "pecan",
          shop: { label: "Noix de pécan", qty: 1, unit: "sachet" } }],
        step: { i: 3, txt: "Concassez grossièrement les noix de pécan et incorporez-les en même temps que les pépites." } },
      { id: "glace-vanille", label: "Glace vanille", emoji: "🍨",
        ingredients: [{ name: "Glace vanille", qty: 1, unit: "pot", rayon: "Produits frais", cid: "glace-vanille" }],
        step: { i: 4, txt: "Déposez une boule de glace vanille sur chaque portion brûlante au moment de servir." } }
    ]
  },

  {
    id: "cocktail-concombre-menthe",
    image: "img/cocktail-concombre-menthe.jpg",
    title: "Cocktail concombre, citron vert & menthe",
    subtitle: "Sans alcool, glacé, terriblement rafraîchissant",
    discovered: "à l'hôtel Park Plaza Victoria, à Amsterdam",
    category: "Boissons",
    tags: ["sans alcool", "frais", "été"],
    emoji: "🥒",
    color: "#7CB8A4",
    // 10 min de préparation, mais les verres givrent 15 min en parallèle :
    // c'est ce délai-là qui commande le service.
    times: { prep: 15 },
    portions: { base: 4, label: "verres" },
    ingredients: [
      { name: "Concombre bio", qty: 0.5, unit: "", rayon: "Fruits, légumes & herbes", cid: "concombre",
        shop: { label: "Concombre bio", qty: 1, unit: "" } },
      { name: "Citrons verts", qty: 2, unit: "", rayon: "Fruits, légumes & herbes", cid: "citron-vert",
        shop: { label: "Citrons verts" } },
      { name: "Sirop de sucre de canne", qty: 2, unit: "c. à s.", note: "2 à 3, ou sucre complet", rayon: "Épicerie", cid: "sirop-canne",
        shop: { label: "Sirop de sucre de canne", qty: 1, unit: "bouteille" } },
      { name: "Eau très fraîche ou gazeuse", qty: 50, unit: "cl", rayon: "Épicerie", cid: "eau-gazeuse",
        shop: { label: "Eau gazeuse", qty: 1, unit: "bouteille", note: "pour la version pétillante" } },
      { name: "Glaçons", qty: null, qtyText: "à volonté", course: false },
      { name: "Menthe fraîche", qty: null, qtyText: "quelques feuilles", rayon: "Fruits, légumes & herbes", cid: "menthe",
        shop: { label: "Menthe fraîche", qty: 1, unit: "bouquet" } }
    ],
    steps: [
      {
        t: "Les verres au froid, le concombre en tranches",
        txt: "Placez les verres de service au congélateur : 15 minutes suffisent à les givrer, et ils y resteront pendant toute la préparation. Lavez le concombre et coupez-le en fines tranches sans le peler.",
        timer: 15,
        tip: { t: "Astuce du chef", txt: "Conservez la peau du concombre bio : c'est elle qui apporte la couleur vert vif et l'arôme caractéristique à la boisson." }
      },
      {
        t: "Pressage des agrumes",
        txt: "Pressez le jus des citrons verts et prélevez quelques zestes.",
        tip: { t: "Astuce du chef", txt: "Roulez fermement les citrons verts sur votre plan de travail avec la paume de la main avant de les couper pour en extraire un maximum de jus." }
      },
      {
        t: "Macération et infusion",
        txt: "Froissez les feuilles de menthe entre vos mains et jetez-les dans un grand pichet. Ajoutez les tranches de concombre, le jus de citron vert et le sirop de sucre, puis pilez légèrement l'ensemble.",
        tip: { t: "Astuce du chef", txt: "Froissez la menthe, ne la pilez pas : les huiles essentielles se libèrent à la simple pression des doigts, alors que des feuilles déchirées par le pilon donnent de l'amertume." }
      },
      {
        t: "Allongement au liquide",
        txt: "Versez l'eau glacée (plate ou gazeuse) et mélangez vivement.",
        tip: { t: "Astuce du chef", txt: "Si vous utilisez de l'eau gazeuse, ajoutez-la au tout dernier moment pour conserver toute la pétillance au service." }
      },
      {
        t: "Service glacé",
        txt: "Sortez les verres givrés, remplissez-les de glaçons, versez la préparation à travers une passoire ou avec les morceaux de concombre, puis décorez d'une rondelle de citron vert et d'une feuille de menthe.",
        tip: { t: "Astuce du chef", txt: "Servez sans attendre : passé une demi-heure, le concombre pilé perd son parfum et la menthe commence à brunir dans le pichet." }
      }
    ],
    addons: [
      { id: "gingembre", label: "Gingembre frais", emoji: "🫚",
        ingredients: [{ name: "Gingembre frais", qty: null, qtyText: "2 cm", rayon: "Fruits, légumes & herbes", cid: "gingembre",
          shop: { label: "Gingembre frais", qtyText: "un petit morceau" } }],
        step: { i: 2, txt: "Râpez finement le gingembre dans le pichet pendant la macération, pour une pointe de piquant." } },
      { id: "fruits-rouges", label: "Fruits rouges", emoji: "🍓",
        ingredients: [{ name: "Fruits rouges", qty: 125, unit: "g", note: "framboises ou fraises", rayon: "Fruits, légumes & herbes", cid: "fruits-rouges" }],
        step: { i: 4, txt: "Déposez quelques fruits rouges dans chaque verre avant de verser la boisson." } },
      { id: "gin", label: "Version cocktail (gin)", emoji: "🍸",
        ingredients: [{ name: "Gin", qty: 8, unit: "cl", note: "2 cl par verre — pour les adultes", rayon: "Épicerie", cid: "gin" }],
        step: { i: 3, txt: "Pour la version adulte, ajoutez le gin (2 cl par verre) en même temps que l'eau glacée et mélangez." } }
    ]
  },

  {
    id: "salade-mediterraneenne",
    image: "img/salade-mediterraneenne.jpg",
    title: "Salade méditerranéenne : pois chiches, feta & olives",
    subtitle: "Généreuse, ensoleillée, prête en un quart d'heure",
    category: "Salades",
    tags: ["frais", "végétarien", "sans cuisson"],
    emoji: "🫒",
    color: "#8C9B5F",
    times: { prep: 15, repos: 15 },
    reposLabel: "Repos",
    portions: { base: 4, label: "personnes" },
    ingredients: [
      { name: "Pois chiches cuits", qty: 400, unit: "g", note: "en bocal ou boîte", rayon: "Épicerie", cid: "pois-chiches",
        shop: { label: "Pois chiches au naturel", qty: 1, unit: "bocal", note: "environ 400 g" } },
      { name: "Feta", qty: 150, unit: "g", rayon: "Produits frais", cid: "feta" },
      { name: "Olives noires", qty: 80, unit: "g", note: "type Kalamata", rayon: "Épicerie", cid: "olives" },
      { name: "Oignon rouge", qty: 0.25, unit: "", rayon: "Fruits, légumes & herbes", cid: "oignon-rouge" },
      { name: "Tomates cerises", qty: 400, unit: "g", rayon: "Fruits, légumes & herbes", cid: "tomates-cerises" }
    ],
    choices: [{
      id: "vinaigrette", label: "La vinaigrette",
      options: [
        { id: "balsamique-origan", label: "Balsamique & origan", emoji: "🫒",
          ingredients: [
            { name: "Huile d'olive extra-vierge", qty: 3, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "huile-olive",
              shop: { label: "Huile d'olive vierge extra", qty: null } },
            { name: "Vinaigre balsamique", qty: 1.5, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "vinaigre-balsamique" },
            { name: "Sel, poivre noir, origan séché", qty: null, note: "vinaigrette", rayon: "Assaisonnements", cid: "origan",
              shop: { label: "Origan séché" } }
          ],
          step: { t: "Émulsion de la vinaigrette",
            txt: "Dans un bol, fouettez le vinaigre balsamique avec le sel et l'origan séché, puis incorporez l'huile d'olive.",
            tip: { t: "Astuce du chef", txt: "Ajoutez une cuillère à café de miel dans la vinaigrette balsamique pour adoucir l'acidité naturelle du vinaigre." } } },
        { id: "citron-menthe", label: "Citron & menthe", emoji: "🍋",
          ingredients: [
            { name: "Citron jaune", qty: 1, unit: "", note: "le jus — vinaigrette", rayon: "Fruits, légumes & herbes", cid: "citron",
              shop: { label: "Citron jaune non traité" } },
            { name: "Huile d'olive extra-vierge", qty: 3, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "huile-olive",
              shop: { label: "Huile d'olive vierge extra", qty: null } },
            { name: "Menthe fraîche", qty: null, qtyText: "8 feuilles", note: "vinaigrette", rayon: "Fruits, légumes & herbes", cid: "menthe",
              shop: { label: "Menthe fraîche", qty: 1, unit: "bouquet" } },
            { name: "Sel et poivre", qty: null, rayon: "Assaisonnements", cid: "sel-poivre",
              shop: { label: "Sel fin, poivre noir du moulin" } }
          ],
          step: { t: "Vinaigrette citron & menthe",
            txt: "Fouettez le jus de citron avec le sel, incorporez l'huile d'olive en filet, puis ajoutez la menthe finement ciselée et un tour de moulin à poivre.",
            tip: { t: "Astuce du chef", txt: "Ajoutez aussi quelques zestes de citron : ce sont eux qui portent les huiles essentielles, bien plus parfumées que le jus." } } },
        { id: "yaourt-citron", label: "Crémeuse au yaourt", emoji: "🥣",
          ingredients: [
            { name: "Yaourt grec", qty: 100, unit: "g", note: "vinaigrette", rayon: "Produits frais", cid: "yaourt-grec" },
            { name: "Citron jaune", qty: 0.5, unit: "", note: "le jus — vinaigrette", rayon: "Fruits, légumes & herbes", cid: "citron",
              shop: { label: "Citron jaune non traité" } },
            { name: "Ail", qty: 0.5, unit: "gousse", note: "vinaigrette", rayon: "Fruits, légumes & herbes", cid: "ail",
              shop: { label: "Ail", qty: 2, unit: "gousses" } },
            { name: "Huile d'olive extra-vierge", qty: 1, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "huile-olive",
              shop: { label: "Huile d'olive vierge extra", qty: null } },
            { name: "Sel et poivre", qty: null, rayon: "Assaisonnements", cid: "sel-poivre",
              shop: { label: "Sel fin, poivre noir du moulin" } }
          ],
          step: { t: "Sauce crémeuse au yaourt",
            txt: "Mélangez le yaourt grec, le jus de citron, l'ail finement râpé et l'huile d'olive. Salez, poivrez.",
            tip: { t: "Astuce du chef", txt: "Râpez l'ail à la microplane plutôt que de le hacher : il se fond dans la sauce sans laisser de morceaux piquants." } } }
      ]
    }],
    addons: [
      { id: "concombre", label: "Concombre", emoji: "🥒",
        ingredients: [{ name: "Concombre", qty: 0.5, unit: "", rayon: "Fruits, légumes & herbes", cid: "concombre",
          shop: { label: "Concombre bio", qty: 1, unit: "" } }],
        step: { i: 5, txt: "Taillez le concombre en demi-rondelles et incorporez-le à la salade." } },
      { id: "avocat", label: "Avocat", emoji: "🥑",
        ingredients: [{ name: "Avocat mûr", qty: 1, unit: "", rayon: "Fruits, légumes & herbes", cid: "avocat",
          shop: { label: "Avocats mûrs" } }],
        step: { i: 5, txt: "Ajoutez l'avocat en dés au tout dernier moment, avec un trait de jus de citron pour qu'il reste vert." } }
    ],
    steps: [
      {
        t: "Préparation des pois chiches",
        txt: "Rincez abondamment les pois chiches sous l'eau froide et égouttez-les soigneusement.",
        tip: { t: "Astuce du chef", txt: "Séchez les pois chiches dans un torchon propre en frottant délicatement pour détacher une partie des petites peaux indigestes." }
      },
      {
        t: "Découpe de l'oignon",
        txt: "Épluchez l'oignon rouge, émincez-le en très fines lamelles et faites-les tremper 10 minutes dans un bol d'eau glacée.",
        timer: 10,
        tip: { t: "Astuce du chef", txt: "L'eau glacée ôte à l'oignon son mordant tout en préservant son croustillant. Égouttez-le soigneusement avant de l'ajouter, sous peine de diluer la vinaigrette." }
      },
      {
        t: "Préparation des olives et de la feta",
        txt: "Dénoyautez les olives si nécessaire et émiettez la feta à la main en gros morceaux.",
        tip: { t: "Astuce du chef", txt: "Émiettez la feta à la main plutôt que de la couper en dés au couteau pour obtenir des bords irréguliers qui accrochent mieux la vinaigrette." }
      },
      {
        t: "Préparation des tomates",
        txt: "Coupez les tomates cerises en deux."
      },
      { choice: "vinaigrette" },
      {
        t: "Assemblage",
        txt: "Égouttez l'oignon. Mélangez les pois chiches, l'oignon et les olives avec la vinaigrette, et laissez reposer 15 minutes. Ajoutez la feta émiettée juste avant de servir.",
        timer: 15,
        tip: { t: "Astuce du chef", txt: "Ce quart d'heure est pour les pois chiches, qui n'ont aucun goût propre et vivent de ce qu'ils absorbent. La feta, elle, arrive en dernier : trop tôt dans la vinaigrette, elle se délite en bouillie salée." }
      }
    ]
  },

  {
    id: "salade-champetre",
    image: "img/salade-champetre.jpg",
    title: "Salade champêtre : feuille de chêne, haricots verts, petits pois & patates",
    subtitle: "Tiède, moutardée, comme un déjeuner à la campagne",
    discovered: "au Murmure du Son, festival à Eu",
    category: "Salades",
    tags: ["tiède", "végétarien", "complet"],
    emoji: "🥗",
    color: "#9BC088",
    times: { prep: 20, cuisson: 25 },
    portions: { base: 4, label: "personnes" },
    ingredients: [
      { name: "Salade feuille de chêne", qty: 1, unit: "", rayon: "Fruits, légumes & herbes", cid: "feuille-chene" },
      { name: "Haricots verts frais", qty: 200, unit: "g", rayon: "Fruits, légumes & herbes", cid: "haricots-verts" },
      { name: "Petits pois frais ou surgelés", qty: 150, unit: "g", rayon: "Produits frais", cid: "petits-pois" },
      { name: "Petites pommes de terre nouvelles", qty: 300, unit: "g", note: "type Charlotte ou Grenaille", rayon: "Fruits, légumes & herbes", cid: "pommes-terre" },
      { name: "Sel et poivre", qty: null, rayon: "Assaisonnements", cid: "sel-poivre",
        shop: { label: "Sel fin, poivre noir du moulin" } }
    ],
    choices: [{
      id: "vinaigrette", label: "La vinaigrette",
      options: [
        { id: "moutardee", label: "Moutardée à l'ancienne", emoji: "🥄",
          ingredients: [
            { name: "Moutarde de Dijon", qty: 1, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "moutarde",
              shop: { label: "Moutarde de Dijon", qty: 1, unit: "pot" } },
            { name: "Moutarde à l'ancienne", qty: 1, unit: "c. à c.", note: "vinaigrette", rayon: "Épicerie", cid: "moutarde-ancienne",
              shop: { label: "Moutarde à l'ancienne", qty: 1, unit: "pot" } },
            { name: "Vinaigre de vin", qty: 1, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "vinaigre-vin" },
            { name: "Huile neutre ou de tournesol", qty: 3, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "huile-neutre",
              shop: { label: "Huile neutre (tournesol, pépins de raisin)", qty: null } }
          ],
          step: { t: "Vinaigrette moutardée",
            txt: "Mélangez les deux moutardes, le vinaigre, le sel et le poivre, puis montez en émulsion avec l'huile.",
            tip: { t: "Astuce du chef", txt: "Utilisez la moutarde à l'ancienne en complément de la moutarde fine pour apporter du relief et une texture agréable grâce aux grains." } } },
        { id: "miel-cidre", label: "Douceur miel & cidre", emoji: "🍯",
          ingredients: [
            { name: "Miel", qty: 1, unit: "c. à c.", note: "vinaigrette", rayon: "Épicerie", cid: "miel",
              shop: { label: "Miel", qty: 1, unit: "pot" } },
            { name: "Vinaigre de cidre", qty: 1.5, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "vinaigre-cidre" },
            { name: "Moutarde de Dijon", qty: 1, unit: "c. à c.", note: "vinaigrette", rayon: "Épicerie", cid: "moutarde",
              shop: { label: "Moutarde de Dijon", qty: 1, unit: "pot" } },
            { name: "Huile d'olive", qty: 3, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "huile-olive",
              shop: { label: "Huile d'olive vierge extra", qty: null } }
          ],
          step: { t: "Vinaigrette douce miel-cidre",
            txt: "Délayez le miel et la moutarde dans le vinaigre de cidre avec le sel et le poivre, puis émulsionnez avec l'huile d'olive.",
            tip: { t: "Astuce du chef", txt: "Cette version douce met en valeur les légumes verts tièdes : nappez-les quand ils sont encore chauds pour qu'ils s'en imprègnent." } } }
      ]
    }],
    addons: [
      { id: "radis", label: "Radis croquants", emoji: "🌱",
        ingredients: [{ name: "Radis", qty: 0.5, unit: "botte", rayon: "Fruits, légumes & herbes", cid: "radis",
          shop: { label: "Radis", qty: 1, unit: "botte" } }],
        step: { i: 5, txt: "Émincez les radis en fines rondelles et ajoutez-les pour le croquant." } },
      { id: "tomates-cerises", label: "Tomates cerises", emoji: "🍅",
        ingredients: [{ name: "Tomates cerises", qty: 150, unit: "g", rayon: "Fruits, légumes & herbes", cid: "tomates-cerises" }],
        step: { i: 5, txt: "Coupez les tomates cerises en deux et répartissez-les dans la salade." } },
      { id: "croutons", label: "Croûtons à l'ail", emoji: "🍞",
        ingredients: [{ name: "Pain de campagne", qty: 2, unit: "tranches", rayon: "Épicerie", cid: "pain",
          shop: { label: "Pain de campagne" } }],
        step: { i: 5, txt: "Faites dorer des dés de pain à la poêle avec un filet d'huile et une gousse d'ail écrasée, puis parsemez-en la salade." } }
    ],
    steps: [
      {
        t: "Cuisson des pommes de terre",
        txt: "Lavez les pommes de terre et faites-les cuire avec leur peau dans une casserole d'eau froide salée pendant 15 à 20 minutes à partir de l'ébullition.",
        timer: 18,
        tip: { t: "Astuce du chef", txt: "Démarrez toujours la cuisson des tubercules à l'eau froide pour garantir une cuisson homogène du cœur jusqu'à la peau." }
      },
      {
        t: "Cuisson des haricots verts",
        txt: "Équeutez les haricots verts et plongez-les dans une grande casserole d'eau bouillante bien salée. Comptez 3 minutes.",
        timer: 3,
        tip: { t: "Astuce du chef", txt: "Beaucoup d'eau et beaucoup de sel : un petit volume refroidit dès qu'on y jette les légumes, et ils blanchissent au lieu de cuire vif." }
      },
      {
        t: "Ajout des petits pois",
        txt: "Ajoutez les petits pois aux haricots et poursuivez la cuisson 3 minutes seulement. Égouttez le tout et plongez-le aussitôt dans un saladier d'eau glacée.",
        timer: 3,
        tip: { t: "Astuce du chef", txt: "Les petits pois cuisent deux fois plus vite que les haricots : partis ensemble, ils seraient farineux quand les haricots sont juste prêts. Et le bain glacé fixe la chlorophylle — c'est lui qui garde ce vert éclatant." }
      },
      {
        t: "Lavage de la salade",
        txt: "Lavez et essorez délicatement les feuilles de salade feuille de chêne.",
        tip: { t: "Astuce du chef", txt: "Essorez parfaitement la salade : l'excès d'eau empêche la vinaigrette d'adhérer aux feuilles." }
      },
      { choice: "vinaigrette" },
      {
        t: "Assemblage tiède",
        txt: "Coupez les pommes de terre encore tièdes en rondelles, mélangez-les avec les haricots et les petits pois, puis nappez généreusement de vinaigrette. Ajoutez les feuilles de chêne au tout dernier moment et mélangez délicatement.",
        tip: { t: "Astuce du chef", txt: "Les pommes de terre tièdes boivent la vinaigrette bien mieux qu'une fois froides. La salade, elle, retombe au contact du tiède : elle n'entre dans le saladier qu'au moment de passer à table." }
      }
    ]
  },

  {
    id: "salade-lentilles-feta",
    image: "img/salade-lentilles-feta.jpg",
    title: "Salade de lentilles, feta, pomme verte & tomates",
    subtitle: "Terreuse et croquante, relevée d'une vinaigrette persil-échalote",
    discovered: "au Murmure du Son, festival à Eu",
    category: "Salades",
    tags: ["légumineuses", "végétarien", "complet"],
    emoji: "🍏",
    color: "#A3B75C",
    times: { prep: 20, cuisson: 25 },
    portions: { base: 4, label: "personnes" },
    ingredients: [
      { name: "Lentilles vertes", qty: 200, unit: "g", note: "type lentilles vertes du Puy", rayon: "Épicerie", cid: "lentilles" },
      { name: "Feta", qty: 100, unit: "g", rayon: "Produits frais", cid: "feta" },
      { name: "Pomme verte (Granny Smith)", qty: 1, unit: "", rayon: "Fruits, légumes & herbes", cid: "pomme",
        shop: { label: "Pommes croquantes (Granny Smith ou Gala)" } },
      { name: "Tomates fermes", qty: 2, unit: "", note: "ou 150 g de tomates cerises", rayon: "Fruits, légumes & herbes", cid: "tomates" },
      { name: "Citron jaune", qty: 0.5, unit: "", note: "pour citronner la pomme", rayon: "Fruits, légumes & herbes", cid: "citron",
        shop: { label: "Citron jaune non traité" } },
      { name: "Oignon", qty: 0.5, unit: "", note: "aromate, cuisson des lentilles", rayon: "Fruits, légumes & herbes", cid: "oignon",
        shop: { label: "Oignon", qty: 1, unit: "" } },
      { name: "Feuille de laurier", qty: 1, unit: "", note: "aromate, cuisson des lentilles", rayon: "Assaisonnements", cid: "laurier",
        shop: { label: "Laurier séché", qty: 1, unit: "sachet" } },
      { name: "Clou de girofle", qty: 1, unit: "", note: "piqué dans l'oignon", optional: true, rayon: "Assaisonnements", cid: "girofle",
        shop: { label: "Clous de girofle", qty: 1, unit: "sachet" } },
      { name: "Sel et poivre", qty: null, rayon: "Assaisonnements", cid: "sel-poivre",
        shop: { label: "Sel fin, poivre noir du moulin" } }
    ],
    choices: [{
      id: "vinaigrette", label: "La vinaigrette",
      options: [
        { id: "persil-echalote", label: "Persil & échalote au cidre", emoji: "🌿",
          ingredients: [
            { name: "Échalote", qty: 1, unit: "", note: "vinaigrette", rayon: "Fruits, légumes & herbes", cid: "echalote" },
            { name: "Persil plat", qty: 0.5, unit: "bouquet", note: "vinaigrette", rayon: "Fruits, légumes & herbes", cid: "persil",
              shop: { label: "Persil plat", qty: 1, unit: "bouquet" } },
            { name: "Huile d'olive", qty: 3, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "huile-olive",
              shop: { label: "Huile d'olive vierge extra", qty: null } },
            { name: "Vinaigre de cidre", qty: 1, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "vinaigre-cidre" }
          ],
          step: { t: "Vinaigrette persil-échalote",
            txt: "Hachez finement l'échalote et ciselez le persil plat. Mélangez-les dans un bol avec le vinaigre de cidre, du sel et du poivre, laissez macérer 5 minutes, puis incorporez l'huile d'olive.",
            timer: 5,
            tip: { t: "Astuce du chef", txt: "Ces cinq minutes dans le vinaigre suffisent à ôter à l'échalote son mordant cru, sans rien lui retirer de son parfum." } } },
        { id: "moutardee", label: "Moutardée", emoji: "🥄",
          ingredients: [
            { name: "Moutarde de Dijon", qty: 1, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "moutarde",
              shop: { label: "Moutarde de Dijon", qty: 1, unit: "pot" } },
            { name: "Vinaigre de vin", qty: 1, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "vinaigre-vin" },
            { name: "Huile neutre ou de tournesol", qty: 3, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "huile-neutre",
              shop: { label: "Huile neutre (tournesol, pépins de raisin)", qty: null } }
          ],
          step: { t: "Vinaigrette moutardée",
            txt: "Fouettez la moutarde avec le vinaigre de vin, le sel et le poivre, puis montez en émulsion avec l'huile.",
            tip: { t: "Astuce du chef", txt: "Une vinaigrette bien moutardée réveille le côté terreux des lentilles : n'hésitez pas à forcer légèrement la dose." } } },
        { id: "huile-noix", label: "À l'huile de noix", emoji: "🌰",
          ingredients: [
            { name: "Huile de noix", qty: 3, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "huile-noix",
              shop: { label: "Huile de noix", qty: 1, unit: "bouteille" } },
            { name: "Vinaigre de cidre", qty: 1, unit: "c. à s.", note: "vinaigrette", rayon: "Épicerie", cid: "vinaigre-cidre" },
            { name: "Moutarde", qty: 1, unit: "c. à c.", note: "vinaigrette", rayon: "Épicerie", cid: "moutarde",
              shop: { label: "Moutarde de Dijon", qty: 1, unit: "pot" } }
          ],
          step: { t: "Vinaigrette à l'huile de noix",
            txt: "Mélangez la moutarde et le vinaigre de cidre avec le sel et le poivre, puis émulsionnez avec l'huile de noix.",
            tip: { t: "Astuce du chef", txt: "L'huile de noix ne supporte pas la chaleur et rancit vite : conservez-la au réfrigérateur et réservez-la aux assaisonnements." } } }
      ]
    }],
    addons: [
      { id: "concombre", label: "Concombre", emoji: "🥒",
        ingredients: [{ name: "Concombre", qty: 0.5, unit: "", rayon: "Fruits, légumes & herbes", cid: "concombre",
          shop: { label: "Concombre bio", qty: 1, unit: "" } }],
        step: { i: 1, txt: "Taillez le concombre en petits dés, comme la pomme, pour la fraîcheur." } },
      { id: "oignon-rouge", label: "Oignon rouge", emoji: "🧅",
        ingredients: [{ name: "Oignon rouge", qty: 0.5, unit: "", rayon: "Fruits, légumes & herbes", cid: "oignon-rouge",
          shop: { label: "Oignon rouge", qty: 1, unit: "" } }],
        step: { i: 1, timer: 10, txt: "Émincez l'oignon rouge en fines lamelles et faites-les tremper 10 min dans l'eau glacée pour ôter le piquant." } },
      { id: "noix", label: "Noix concassées", emoji: "🌰",
        ingredients: [{ name: "Cerneaux de noix", qty: 1, unit: "poignée", rayon: "Épicerie", cid: "noix" }],
        step: { i: 3, txt: "Parsemez la salade de noix grossièrement concassées juste avant de servir." } },
      { id: "avocat", label: "Avocat", emoji: "🥑",
        ingredients: [{ name: "Avocat mûr", qty: 1, unit: "", rayon: "Fruits, légumes & herbes", cid: "avocat",
          shop: { label: "Avocats mûrs" } }],
        step: { i: 3, txt: "Ajoutez l'avocat en dés au dernier moment, avec un trait de jus de citron pour qu'il reste vert." } }
    ],
    steps: [
      {
        t: "Cuisson des lentilles",
        txt: "Rincez les lentilles et faites-les cuire dans 3 fois leur volume d'eau froide non salée, avec la feuille de laurier et le demi-oignon piqué du clou de girofle, pendant 20 à 25 minutes. Retirez les aromates, puis salez.",
        timer: 22,
        tip: { t: "Astuce du chef", txt: "Ne salez jamais l'eau de cuisson des lentilles dès le départ, car le sel durcit la peau de la légumineuse. Salez uniquement en fin de cuisson — mais aromatisez dès le début : une lentille cuite à l'eau nue reste fade quoi qu'on mette dessus ensuite." }
      },
      {
        t: "Découpe des légumes et fruits",
        txt: "Taillez la pomme verte en petits dés réguliers et citronnez-les aussitôt. Coupez les tomates en quartiers, ou en deux pour les tomates cerises.",
        tip: { t: "Astuce du chef", txt: "Épépinez les tomates avant de les couper afin d'éviter qu'elles ne détrempent la salade. Et citronnez la pomme dès la découpe : coupée en petits dés, elle brunit en quelques minutes." }
      },
      { choice: "vinaigrette" },
      {
        t: "Mélange et finition",
        txt: "Associez les lentilles tièdes ou refroidies, la pomme, les tomates et la feta émiettée, puis incorporez la vinaigrette.",
        tip: { t: "Astuce du chef", txt: "Incorporez la pomme verte au tout dernier moment pour qu'elle conserve tout son croquant et sa fraîcheur au contraste des lentilles." }
      }
    ]
  }
];

const RAYONS = ["Épicerie", "Produits frais", "Fruits, légumes & herbes", "Assaisonnements", "Autre"];

/* Identifiants renommés : ancien → actuel. Un identifiant sert de clé à trois
   choses qui survivent au renommage — les données du navigateur (menu,
   portions, verdicts, compteurs), les liens de partage déjà envoyés, et la
   page d'aperçu correspondante. Cette table permet de les faire suivre.
   Ne jamais retirer une entrée : un lien peut resurgir des années après. */
const RECIPE_RENAMES = {
  "gravlax-saumon-yuzu": "gravlax-saumon-yaourt-bulgare"
};
