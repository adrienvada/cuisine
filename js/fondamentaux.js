/* Les fondamentaux — Carnet de cuisine d'Evadri

   Un « fondamental » est un mécanisme de cuisine qui revient d'une recette à
   l'autre : l'émulsion, la réaction de Maillard, l'osmose du sel. Il s'oppose à
   l'« astuce du chef », qui ne vaut que pour un plat — la pulpe des trois doigts
   sur la focaccia, le massage du kale.

   Un fondamental se consulte de trois façons : depuis la pastille posée sous
   l'astuce d'une étape, depuis l'onglet « Fondamentaux », et par lien partagé.
   Il n'a pas besoin d'être rattaché à une recette pour exister : le carnet sert
   aussi de boîte de réception aux astuces croisées dans la vie.

   FORME D'UNE ENTRÉE
   - id ......... minuscules, sans accent, tirets. Il devient une adresse
                  partagée : ne jamais le changer sans passer par
                  FONDAMENTAL_RENAMES, en bas de ce fichier.
   - t .......... le titre avec son article : « L'émulsion ».
   - emoji ...... un seul, sobre.
   - famille .... l'une des FAMILLES listées en bas. Elle classe l'onglet.
   - accroche ... une phrase : ce qu'on fait et ce que ça donne. Jamais le pourquoi.
   - pourquoi ... le mécanisme. Paragraphes séparés par une ligne vide.
   - certitude .. « etabli », « partiel » ou « empirique ». Voir plus bas.
   - cas ........ les situations distinctes, sous forme de questions-réponses.
                  C'est la partie la plus utile : elle doit DISCRIMINER, sinon
                  elle ne sert à rien. Les épices selon leur nature, l'émulsifiant
                  selon le liquide.
   - reperes .... les chiffres qu'on veut retrouver les mains dans la pâte.
   - piege ...... l'erreur classique et ce qu'elle coûte.
   - source ..... facultatif, une référence courte.

   HONNÊTETÉ SCIENTIFIQUE — la règle du carnet
   `certitude` dit ce qu'on sait vraiment, et l'application l'affiche :
     « etabli »    le mécanisme est compris et documenté ;
     « partiel »   on en connaît une partie, le reste est discuté ;
     « empirique » le geste marche, personne ne sait bien pourquoi — et on le dit.
   Une explication inventée est pire que pas d'explication. La cuisine est pleine
   de mécanismes faux mais séduisants (saisir « emprisonne les jus », l'acide
   « réveille les arômes endormis ») : dans le doute, baisser la certitude.

   Pas d'accolades dans les textes : elles sont réservées aux quantités mises à
   l'échelle par l'application, et seraient interprétées.  */

const FONDAMENTAUX = [
  {
    id: "maillard",
    t: "La réaction de Maillard",
    emoji: "🔥",
    famille: "Chaleur & coloration",
    accroche: "Vous chauffez une surface sèche jusqu'au brun doré, et vous obtenez des arômes que la cuisson douce ne produira jamais.",
    pourquoi: "Un sucre réducteur — glucose, fructose, lactose, maltose — rencontre une fonction amine. Elle appartient rarement à un acide aminé libre : dans une croûte ou une viande, c'est le plus souvent celle de la lysine, portée par une protéine. Ils se lient, la molécule se réarrange, et s'ouvre une cascade qui produit des centaines de composés volatils : pyrazines pour la note grillée, furanes pour le sucré, composés soufrés pour le rôti. Les pigments bruns qui apparaissent en même temps, les mélanoïdines, ne sont qu'un indicateur : c'est l'odeur qui compte.\n\nCette cascade est lente vers 100 °C — un lait sucré tenu des heures finit par blondir — et devient franche entre 150 et 180 °C. Elle réclame surtout une surface presque sèche. Non que l'eau lui nuise en elle-même : la réaction est la plus rapide à humidité intermédiaire, quand les réactifs sont assez concentrés pour se rencontrer sans être immobilisés, et un aliment desséché à l'excès brunit lui aussi moins bien. Mais tant qu'une pellicule d'eau liquide couvre la surface, celle-ci plafonne à 100 °C, et la coloration attend.\n\nLouis-Camille Maillard décrit la réaction en 1912, et John Hodge en fixe le schéma d'ensemble en 1953 : sur ce point, il n'y a pas de débat. L'inventaire des molécules produites, lui, n'est pas clos : on en identifie encore, et la structure exacte des mélanoïdines reste mal connue.",
    certitude: "etabli",
    cas: [
      { q: "À quelle température démarre-t-elle vraiment ?",
        r: "Il n'y a pas de seuil net. Elle est lente vers 100 °C, visible à partir de 140 °C environ, franche entre 150 et 180 °C. Au-delà de 200 °C en surface, la pyrolyse prend le dessus et l'amertume arrive avant les arômes." },
      { q: "Pourquoi une préparation sucrée brunit-elle plus vite ?",
        r: "Parce que tous les sucres ne réagissent pas. Il faut un sucre réducteur : glucose, fructose, lactose, maltose. Le saccharose, le sucre blanc de table, doit d'abord se scinder en deux. Miel, sirop de glucose et produits laitiers en apportent d'emblée." },
      { q: "Maillard ou caramélisation ?",
        r: "Deux réactions distinctes. La caramélisation, ce sont les sucres seuls qui se décomposent, sans azote. Maillard exige en plus une fonction amine, apportée par un acide aminé, un peptide ou une protéine. On lit partout des seuils — 110 °C pour le fructose, 160 °C pour le saccharose — mais ces chiffres dérivent de points de fusion mal établis : le sucre de table ne perd pas sa structure à la même température selon la vitesse à laquelle on le chauffe, et il se décompose en même temps qu'il fond. Retenez l'ordre de grandeur, jamais le seuil. Les deux réactions coexistent souvent dans une même poêle, sans avoir les mêmes exigences." },
      { q: "Quel rôle joue le pH ?",
        r: "Un milieu alcalin accélère nettement : la fonction amine y est déprotonée, donc plus réactive envers le sucre. Une pointe de bicarbonate fait dorer un cookie ou des oignons bien plus vite. À l'inverse, une marinade acide retarde la coloration." },
      { q: "Faut-il toujours pousser la coloration ?",
        r: "Non. Au-delà de 120 °C et en milieu sec, la même réaction forme aussi de l'acrylamide à partir de l'asparagine, surtout dans les féculents : pommes de terre, pain, biscuits. L'EFSA y voit une préoccupation de santé publique. Visez le doré, jamais le brun sombre." },
      { q: "Saisir emprisonne-t-il les jus ?",
        r: "Non, et c'est le mythe le plus tenace de la cuisine. Une viande saisie perd autant d'eau qu'une autre, parfois davantage : la croûte n'est pas étanche, elle est poreuse. Saisir ne retient rien, saisir fabrique des arômes. C'est déjà la meilleure des raisons." }
    ],
    reperes: [
      "Poêle : le préchauffage dépend de sa masse, une à deux minutes pour une poêle fine, quatre à cinq pour de la fonte. Fiez-vous plutôt à la goutte d'eau, qui doit rouler en bille sur le métal au lieu de s'étaler et grésiller.",
      "Four : 200 à 220 °C pour une croûte franchement colorée ; sous 160 °C, elle reste pâle.",
      "pH : environ 2 g de bicarbonate pour 500 g de pâte accélèrent visiblement la dorure.",
      "Basse température : la coloration existe dès 100 °C, mais elle se compte alors en heures."
    ],
    piege: "Monter le feu pour aller plus vite. La surface passe du doré au brûlé avant que l'intérieur ait chauffé : de l'amertume dehors, du cru dedans, et rien à rattraper.",
    source: "Harold McGee, « On Food and Cooking », chapitre sur les réactions de brunissement."
  },
  {
    id: "eau-coloration",
    t: "L'eau, ennemie de la coloration",
    emoji: "💧",
    famille: "Chaleur & coloration",
    accroche: "Une poêle surchargée ou un aliment mal épongé, et la température s'effondre : au lieu de griller, l'aliment cuit dans sa propre vapeur.",
    pourquoi: "Tant qu'il reste de l'eau liquide en surface, cette surface plafonne autour de 100 °C : la chaleur reçue part en évaporation au lieu de faire monter la température. Or la coloration réclame 140 à 180 °C. Rien ne commencera donc avant que l'eau soit partie.\n\nEt elle part cher. Vaporiser un gramme d'eau consomme environ 2 260 joules, près de sept fois ce qu'il faut pour porter ce même gramme de 20 à 100 °C. Une poêle ne contient qu'une réserve de chaleur limitée, que la plaque recharge lentement : chaque morceau froid et humide y prélève sa part. Au-delà d'une certaine charge, la poêle tombe à 100 °C et y reste.\n\nPendant ce temps, l'aliment cuit quand même, à la vapeur. Quand la poêle remonte enfin en température, il est déjà tendre et détrempé : il grillera sans jamais croustiller.",
    certitude: "etabli",
    cas: [
      { q: "Combien d'espace laisser dans la poêle ?",
        r: "Chaque morceau doit toucher le fond et garder de l'air autour de lui : gardez environ un tiers de la surface libre. Deux fournées dans une poêle brûlante valent toujours mieux qu'une seule bien tassée." },
      { q: "L'épongeage change-t-il vraiment quelque chose ?",
        r: "C'est le geste le plus rentable de la cuisine. L'eau de surface d'un légume mariné, d'un fromage égoutté ou d'un poisson rincé devra de toute façon s'évaporer : autant l'ôter au papier absorbant en dix secondes qu'en deux minutes de poêle." },
      { q: "Et les aliments très aqueux, champignons, courgettes ?",
        r: "Ils sont faits de 90 à 95 % d'eau et la libèrent en cuisant : aucun épongeage n'y suffit. Poêle très chaude, peu à la fois, on remue peu, et on ne sale qu'à la fin. Sur des cellules encore crues, le sel fait bien sortir l'eau par osmose ; mais dès que la poêle a dépassé une soixantaine de degrés, les membranes sont détruites et l'eau sort de toute façon. Ce que le sel ajouté trop tôt change vraiment, c'est qu'il retient à la surface une saumure qui maintient le morceau sous les 100 °C. Le gain à saler tard est réel et constaté par tous ceux qui ont fait l'essai côte à côte ; il est modeste, et il n'a jamais été finement mesuré." },
      { q: "Que faire quand on a trop de quantité ?",
        r: "Trois issues. Plusieurs fournées, une poêle plus large, ou le four : une plaque à 220 °C offre une grande surface et un air sec. Si la poêle a déjà rendu son eau, égouttez-la, remontez le feu et attendez que l'eau soit partie." },
      { q: "Pourquoi la friture obéit-elle à la même règle ?",
        r: "Même arithmétique. Chaque pièce froide et humide prélève de la chaleur au bain, et trop de pièces d'un coup font tomber l'huile sous 160 °C. L'aliment ressort alors plus gras, mais pas pour la raison qu'on croit : l'huile n'entre presque pas pendant la cuisson, elle est aspirée à la sortie du bain, quand la vapeur se condense à l'intérieur et crée une dépression. Une croûte formée trop lentement, restée poreuse, boit d'autant plus à cet instant précis." }
    ],
    reperes: [
      "Gardez environ un tiers de la surface de la poêle libre entre les morceaux.",
      "Vaporiser 1 g d'eau coûte 2 260 J, près de sept fois plus que de la chauffer de 20 à 100 °C.",
      "Surface mouillée : 100 °C au maximum. Coloration : 140 à 180 °C. Les deux ne coexistent pas.",
      "Friture : jamais sous 160 °C ; laissez remonter à 170-180 °C entre deux fournées."
    ],
    piege: "Remuer sans cesse une poêle chargée. La coloration demande qu'une même face reste posée sur le fond assez longtemps pour s'y assécher, puis brunir ; chaque tour de spatule interrompt ce contact avant qu'il ait rien produit, et les morceaux serrés se refroidissent mutuellement. Les champignons finissent gris et flasques dans leur jus.",
    source: ""
  },
  {
    id: "deglacage",
    t: "Le déglaçage",
    emoji: "🥄",
    famille: "Chaleur & coloration",
    accroche: "Vous versez un liquide dans la poêle encore brûlante et vous grattez : les sucs collés au fond repassent dans la sauce.",
    pourquoi: "Pendant la cuisson, les jus qui suintent sur le métal s'évaporent et se concentrent. Ce qui reste — protéines, acides aminés, sucres — brunit sur place et forme une pellicule sèche et collée : les sucs. Le mot est bien « sucs », au sens de jus de cuisson, et non « sucres » : le sucre n'y est qu'un réactif parmi d'autres. Cette pellicule concentre une grande part des arômes de grillé.\n\nUn liquide chaud la réhydrate, les composés solubles repassent en solution, l'ébullition et la spatule font le reste. L'alcool et l'acidité dissolvent certaines familles de molécules que l'eau seule dissout moins bien, mais l'essentiel du travail revient à l'eau chaude et au geste.\n\nLe détail, lui, n'est pas établi. Les mélanoïdines sont de gros polymères dont la structure reste mal caractérisée : dire qu'un liquide extrait mieux qu'un autre relève de l'usage, non de la mesure. La température à laquelle un beurre monté casse ne fait pas davantage consensus, et vous la trouverez donnée autrement d'un livre à l'autre.",
    certitude: "partiel",
    cas: [
      { q: "Quel liquide selon le plat ?",
        r: "Vin blanc ou cidre pour un poisson et une volaille, vin rouge pour les viandes rouges, bouillon quand on ne veut pas d'acidité, vinaigre par petites touches, eau tout simplement. Aucun n'est indispensable : la chaleur et la spatule décollent." },
      { q: "À quel moment déglacer ?",
        r: "Quand les sucs sont bruns et secs, la poêle encore brûlante. Retirez d'abord l'aliment : laissé dedans, il se gorge de liquide et perd sa croûte en quelques secondes. Versez et grattez aussitôt, un fond refroidi se décolle mal." },
      { q: "Pourquoi monter le beurre hors du feu ?",
        r: "Le beurre est une émulsion d'eau dans le gras. Fouetté froid et en dés dans un liquide chaud, il s'inverse en fines gouttelettes de matière grasse tenues par les protéines et les phospholipides du lait. Cette nouvelle émulsion craint la chaleur, et les sources ne s'accordent pas sur sa limite exacte : on lit une soixantaine de degrés comme quatre-vingts. Toutes disent la même chose en pratique — hors du feu, jamais d'ébullition, pas même un frémissement. Au-delà, les gouttelettes fusionnent et la sauce devient grasse au lieu d'être onctueuse." },
      { q: "Et si le fond a brûlé ?",
        r: "Ne déglacez pas. Le noir qui colle au métal, lui, ne se dissout pas — c'est bien pour cela qu'il faut le frotter. Mais les composés amers de la pyrolyse qui l'accompagnent passent, eux, très bien dans le liquide, et cette amertume ne se rattrape plus. Un fond noir à l'odeur âcre, c'est une poêle à laver. Un fond brun foncé qui sent le grillé, lui, se déglace très bien." },
      { q: "L'alcool s'évapore-t-il à la cuisson ?",
        r: "Pas entièrement, contrairement à ce qu'on répète. Un flambage en laisse près des trois quarts, un quart d'heure de mijotage environ 40 %. Il faut plus de deux heures à découvert pour tomber vers 5 %. À savoir si des enfants passent à table." }
    ],
    reperes: [
      "Déglacez dans une poêle encore fumante : le liquide doit siffler et bouillir instantanément.",
      "3 à 10 cl de liquide pour une poêle de 24 à 28 cm : couvrir le fond, pas noyer.",
      "Réduisez de moitié avant de lier : c'est la concentration qui fait la sauce.",
      "Beurre : 10 à 20 g par personne, très froid, hors du feu, sans jamais laisser bouillir."
    ],
    piege: "Déglacer avec l'aliment encore dans la poêle. La croûte obtenue au prix de plusieurs minutes se réhydrate en quelques secondes : on perd d'un côté ce que l'on gagne de l'autre.",
    source: ""
  },
  {
    id: "friture",
    t: "La friture",
    emoji: "🫕",
    famille: "Chaleur & coloration",
    accroche: "Plonger un aliment dans un bain d'huile assez chaud pour que son eau parte en vapeur et laisse derrière elle une croûte sèche.",
    pourquoi: "L'huile n'est qu'un moyen de transport : elle porte la chaleur bien plus vite que l'air du four. Ce qui fait la friture, c'est le sort de l'eau de l'aliment. À l'immersion, elle se vaporise d'un coup — ce sont les bulles — et cette vapeur qui sort maintient une surpression qui tient l'huile à distance. La surface, privée d'eau, dépasse alors cent degrés et brunit.\n\nLe paradoxe est que l'huile entre surtout après. L'aliment sorti du bain refroidit, la vapeur emprisonnée se condense, la pression tombe et l'huile restée en surface est aspirée dans les pores de la croûte. L'égouttage compte autant que la cuisson.\n\nEn dessous de 150 °C, la vaporisation est trop faible pour repousser l'huile : elle imbibe la pâte, qui cuit dans le gras au lieu de sécher. Au-dessus de 190 °C, c'est l'huile qui souffre : elle s'oxyde et se charge en composés polaires d'autant plus vite qu'elle est chaude, et la croûte fonce avant que le cœur soit chaud. L'hydrolyse, elle, vient surtout de l'eau que les aliments libèrent dans le bain : elle travaille à toute température, et c'est pourquoi une huile vieillit même bien conduite.\n\nCe que l'on tient pour acquis, c'est le lieu de l'absorption : l'essentiel de l'huile entre au refroidissement, et les mesures sur chips donnent couramment un cinquième pendant la friture contre quatre cinquièmes après. Le détail l'est moins — la part de la capillarité, celle de la dépression au refroidissement, celle de l'huile simplement collée en surface. La littérature y revient régulièrement et les modèles ne s'accordent pas encore. La conduite à tenir, elle, ne change pas.",
    certitude: "partiel",
    cas: [
      { q: "Pourquoi 170 à 180 °C",
        r: "C'est la fenêtre où la vapeur sort assez fort pour repousser l'huile sans que celle-ci se dégrade trop vite. En dessous de 150 °C le beignet s'imbibe ; au-delà de 190 °C l'huile s'oxyde et la croûte fonce avant que le cœur soit chaud." },
      { q: "Pourquoi ne pas charger le bain",
        r: "Chaque aliment froid pompe de la chaleur à l'huile. Trois beignets de trop et le bain passe sous 150 °C : la vapeur faiblit, l'huile entre, tout ressort gras. Frire en petites fournées, et laisser l'huile remonter entre chaque." },
      { q: "La pâte à l'eau gazeuse glacée",
        r: "Elle croustille mieux, mais pas par choc thermique : la pâte atteint la température du bain en quelques secondes, quelle qu'ait été la sienne au départ. Ce qui joue vraiment, c'est le froid, qui ralentit la formation du réseau de gluten et donne une pâte moins élastique, donc plus friable. Le gaz dissous compte sans doute peu : l'essentiel s'est échappé pendant le fouettage. La part de chacun n'est pas tranchée." },
      { q: "Saler avant ou après",
        r: "Après, dès la sortie du bain. Le sel posé sur une pâte crue en tire l'eau et l'amollit ; posé sur une croûte brûlante et encore grasse, il adhère tout seul et ne ramollit rien." },
      { q: "Où poser les beignets à la sortie",
        r: "Sur une grille, plutôt qu'au fond d'une assiette. Le papier absorbant boit bien l'huile de surface, mais il retient la vapeur qui continue de sortir, et la face posée se détrempe. La grille laisse tomber l'huile et partir la vapeur des deux côtés. Si vous n'avez que du papier, ne les empilez pas et servez sans attendre." }
    ],
    reperes: [
      "170 à 180 °C pour la plupart des beignets ; au thermomètre, l'œil se trompe.",
      "Ne couvrez jamais plus de la moitié de la surface du bain à la fois.",
      "Une à deux minutes entre deux fournées, le temps que l'huile remonte.",
      "Une huile qui fume, mousse ou fonce a fait son temps : elle ne se rattrape pas."
    ],
    piege: "Charger le bain pour aller plus vite. La température s'effondre, la vapeur ne repousse plus l'huile, et les beignets ressortent pâles et gorgés de gras — exactement le contraire du temps qu'on croyait gagner.",
    source: "« Revisiting the mechanisms of oil uptake during deep-frying », Food and Bioproducts Processing, 2020."
  },
  {
    id: "torrefaction",
    t: "La torréfaction à sec",
    emoji: "🌰",
    famille: "Arômes & épices",
    accroche: "Quelques minutes dans une poêle sans matière grasse et les graines, les fruits secs et les épices entières changent de parfum.",
    pourquoi: "La chaleur sèche chasse d'abord l'eau résiduelle, puis, vers 140 à 160 °C, les sucres et les acides aminés de la graine réagissent entre eux. Cette réaction de Maillard produit notamment des pyrazines, les molécules de la note grillée du café, du cacao et du sésame. En parallèle, les huiles essentielles des épices se volatilisent : ce parfum qui monte soudain de la poêle est précisément celui qui ne sera plus dans le plat. Prenez-le pour ce qu'il est, un signal, et coupez le feu.\n\nIl y a aussi une part physique. La chaleur fragilise les parois cellulaires et rend la graine cassante : elle se moud plus finement. Mais le même feu volatilise les arômes, qui partent dans l'air. Un optimum existe donc, et il diffère pour une graine de cumin, fine et volatile, et pour une noix, grasse et dense.\n\nLa chimie du brunissement est établie. Les durées idéales, épice par épice, ne le sont pas : hors du café et du cacao, très étudiés, on avance à l'odeur et à l'œil.",
    certitude: "partiel",
    cas: [
      { q: "À sec ou dans le gras ?",
        r: "À sec pour les graines et les fruits secs entiers : on cherche à assécher et à brunir. Dans le gras pour les épices moulues, dont beaucoup d'arômes sont liposolubles : l'huile chaude les capte puis les diffuse dans tout le plat. À sec, une épice moulue brûle en quelques secondes." },
      { q: "La poêle ou le four ?",
        r: "La poêle pour de petites quantités et un contrôle à la seconde, à feu moyen, en remuant sans arrêt. Le four pour les volumes et les fruits secs entiers, qui chauffent alors à cœur sans brûler dessous : 150 à 160 °C, 8 à 12 minutes, plaque secouée à mi-parcours." },
      { q: "Pourquoi refroidir hors de la poêle ?",
        r: "Parce que le métal garde une réserve de chaleur considérable et continue de cuire plusieurs minutes après l'extinction du feu. Versez aussitôt sur une assiette froide ou du papier : c'est entre le feu coupé et l'assiette que la plupart des graines brûlent." },
      { q: "Les signes qu'on est allé trop loin ?",
        r: "L'odeur change avant la couleur : le grillé agréable tourne à l'âcre et un voile de fumée apparaît. Goûtez une graine, l'amertume ne partira plus et elle contaminera tout le plat. À ce stade, mieux vaut recommencer que rattraper." },
      { q: "Entières ou déjà moulues ?",
        r: "Torréfiez entier, moulez ensuite. La graine entière garde ses huiles jusqu'au dernier instant ; moulue, elle offre une surface immense qui s'évente en quelques semaines et qui noircit en une poignée de secondes sur une poêle chaude." }
    ],
    reperes: [
      "Poêle à feu moyen : 2 à 4 minutes pour des graines, 4 à 6 pour des cerneaux, en remuant.",
      "Four : 150 à 160 °C, 8 à 12 minutes pour des fruits secs entiers.",
      "Épices moulues dans le gras : 30 à 60 secondes à feu moyen, pas davantage.",
      "Coupez le feu au premier parfum net : la chaleur résiduelle finit le travail."
    ],
    piege: "Laisser refroidir dans la poêle. Le métal restitue sa chaleur pendant plusieurs minutes : les graines ressortent amères alors qu'elles étaient parfaites à l'instant où le feu a été coupé.",
    source: "Harold McGee, « On Food and Cooking », sur les graines, les fruits secs et les épices."
  },
  {
    id: "epices-gras",
    t: "Les épices dans le gras",
    emoji: "🌶️",
    famille: "Arômes & épices",
    accroche: "On passe les épices dans un corps gras chaud quelques secondes avant d'ajouter le reste : le plat y gagne en profondeur et en rondeur.",
    pourquoi: "La plupart des molécules qui font le goût d'une épice sont liposolubles : la capsaïcine du piment, la pipérine du poivre, le cuminaldéhyde du cumin. L'eau ne les dissout que très mal ; une matière grasse chaude, si. Elle les extrait, puis les répartit dans tout le plat au lieu de les laisser en poudre au fond de la casserole. Les curcuminoïdes font figure de cas limite : très peu solubles dans l'eau, ils ne le sont que médiocrement dans l'huile — le gras en tire surtout la couleur.\n\nLa chaleur fait le reste : elle rompt les parois cellulaires et libère les huiles essentielles enfermées dans la graine, et elle déclenche sur les sucres et les acides aminés de l'épice des réactions de brunissement, d'où ces notes grillées que la poudre crue n'a pas.\n\nCe qui est établi, c'est la liposolubilité et la volatilité. Ce qui l'est moins : la liste exacte des composés formés en quelques secondes de gras chaud, et le seuil où le grillé bascule dans l'amer. Ce seuil-là se juge au nez, jamais au chronomètre.",
    certitude: "partiel",
    cas: [
      { q: "Épices entières ou moulues ?",
        r: "Entières, les graines gardent leurs huiles enfermées : comptez 30 à 60 secondes dans le gras, jusqu'à ce qu'elles crépitent et embaument. Moulues, la surface exposée est immense — 10 à 20 secondes suffisent, et une minute les brûle." },
      { q: "Paprika, piment en poudre, curcuma : pourquoi ça brûle ?",
        r: "Le paprika est un fruit séché et sucré : environ 10 g de sucres pour 100 g, et jusqu'au double dans certaines variétés. Ce sont des sucres réducteurs, qui brunissent au contact des acides aminés bien avant le seuil de caramélisation, et ses caroténoïdes se dégradent dans la foulée. Retirez la casserole du feu, comptez cinq secondes, puis versez la poudre dans le gras encore chaud : elle infuse sans roussir." },
      { q: "Les graines dures : cumin, coriandre, moutarde, fenugrec",
        r: "Elles supportent le feu vif et demandent à être poussées jusqu'au crépitement — la moutarde saute franchement dans l'huile. Le fenugrec fait exception : dur mais traître, il devient nettement amer si on le laisse foncer au-delà du blond." },
      { q: "Les feuilles sèches : laurier, origan, thym",
        r: "Leurs arômes sortent lentement de glandes robustes : elles entrent tôt, avec le gras ou le liquide, et supportent vingt minutes de mijotage. Frites seules à feu vif, elles noircissent en quelques secondes sans rien avoir donné." },
      { q: "Le safran, lui, ne va pas dans le gras",
        r: "Ses pigments, les crocines, sont glycosylés donc solubles dans l'eau et non dans l'huile. Infusez les pistils une vingtaine de minutes dans un liquide autour de 60 °C, puis versez l'infusion entière. Plus chaud ou plus long ne donne pas davantage : passé ce point, la crocine se dégrade plus vite qu'elle ne passe dans le liquide." }
    ],
    reperes: [
      "Épices moulues : gras à 140-160 °C, feu moyen, 10 à 20 secondes.",
      "Graines entières : 30 à 60 secondes, jusqu'au crépitement et à l'odeur.",
      "Paprika et piment en poudre : hors du feu, sous 150 °C, 10 secondes au plus.",
      "Safran : environ 20 min dans un liquide autour de 60 °C, jamais dans l'huile seule."
    ],
    piege: "Verser les épices moulues dans une huile fumante. À 200 °C elles noircissent avant que vous ayez reposé la cuillère, et cette amertume-là ne se rattrape pas : il faut recommencer le fond.",
    source: "Molecules 29 (2024), infusion du safran en système huile/eau"
  },
  {
    id: "huiles-essentielles",
    t: "Les zestes et les huiles essentielles",
    emoji: "🍋",
    famille: "Arômes & épices",
    accroche: "On prélève la fine couche colorée d'un agrume avant de le presser : c'est elle qui porte le parfum, quand le jus n'apporte que l'acidité.",
    pourquoi: "Sous la couleur d'un citron court une couche de 0,3 à 0,5 mm, le flavédo, criblée de poches microscopiques remplies d'huile essentielle. Cette huile est faite à 70-90 % de limonène, complété de citral, de linalol et d'autres terpènes. Ce sont ces molécules-là que l'on sent. Le jus, lui, est une solution acide — de l'ordre de 5 % d'acide citrique — presque muette au nez.\n\nJuste dessous vient l'albédo, la partie blanche et spongieuse. Elle ne contient pas d'huile essentielle mais des limonoïdes et des flavanones — et toutes ne sont pas amères. L'hespéridine du citron n'a pas de goût ; la naringine, elle, est bien amère mais appartient au pamplemousse et à la bigarade. Sur un citron, c'est la limonine qui installe l'amertume, et elle suffit largement. D'où la règle : râper à peine, s'arrêter dès que le blanc apparaît.\n\nLe limonène s'oxyde à l'air en hydroperoxydes, puis en carvéol et en carvone, qui virent au térébenthine — mais cela se compte en jours d'air et de lumière, pas en minutes. Ce qu'un zeste perd sur une planche en attendant, c'est d'abord par évaporation. Les deux vont dans le même sens : zestez au dernier moment, et directement au-dessus de la préparation grasse ou sucrée qui retiendra les vapeurs.\n\nLe mécanisme est solide : l'huile dans le flavédo, l'amertume dans l'albédo, la liposolubilité des terpènes. Les chiffres le sont moins. L'épaisseur des couches, la part de limonène, la vitesse de perte varient avec l'espèce, la variété et la saison — prenez-les comme des ordres de grandeur, pas comme des constantes.",
    certitude: "partiel",
    cas: [
      { q: "Pourquoi zester avant de presser ?",
        r: "Un fruit entier est ferme : il roule sur la râpe et se laisse zester proprement. Pressé, il devient mou, humide et déchiré ; la lame accroche l'albédo et vous ne récoltez plus que du blanc amer. L'ordre ne se rattrape pas." },
      { q: "Zeste ou jus : lequel pour quoi ?",
        r: "Le zeste parfume sans acidifier : il sert quand on veut du citron sans faire trancher une crème. Le jus acidifie sans parfumer : il tranche le gras et relève par contraste. Les deux ne se remplacent jamais l'un l'autre." },
      { q: "Zeste dans un plat chaud ou dans un plat froid ?",
        r: "Les terpènes partent avec la vapeur. Dans un plat qui mijote, un zeste ajouté au début aura disparu à l'arrivée : mettez-le hors du feu ou dans les deux dernières minutes. Dans une préparation froide, il tient plusieurs heures." },
      { q: "Faut-il vraiment un agrume non traité ?",
        r: "Oui, car les fongicides de conservation se logent dans la cire de l'écorce, précisément la partie que vous prélevez. À défaut, brossez le fruit à l'eau très chaude et séchez-le, sans illusion : le lavage n'ôte pas tout." },
      { q: "Pourquoi zester dans le sucre ou dans l'huile ?",
        r: "Deux gestes, deux mécanismes. Dans l'huile, c'est de la solubilité : les composés du zeste sont liposolubles et s'y dissolvent aussitôt. Dans le sucre, c'est mécanique : les cristaux râpent l'écorce, crèvent les poches et retiennent l'huile libérée. Dans les deux cas le parfum cesse de s'évaporer — ce qu'un zeste laissé nu sur une planche, lui, fait sans arrêt." }
    ],
    reperes: [
      "Le flavédo utile fait 0,3 à 0,5 mm quand l'albédo en fait 2 à 5 : arrêtez-vous à la première trace de blanc.",
      "Limonène : 70 à 90 % de l'huile de zeste, oxydé en quelques jours d'air et de lumière.",
      "Un citron moyen donne environ 1 c. à s. de zeste et 4 à 6 cl de jus.",
      "Zeste dans un plat chaud : les 2 dernières minutes, ou hors du feu."
    ],
    piege: "Appuyer sur la râpe pour aller plus vite. On emporte l'albédo avec le zeste, et la limonine qu'il contient installe une amertume qu'aucun sucre ni aucun sel ne masquera ensuite.",
    source: "Antioxidants 11 (2022), composés des agrumes : caroténoïdes, flavonoïdes, limonoïdes"
  },
  {
    id: "mordant-oignon",
    t: "Le mordant de l'oignon cru",
    emoji: "🧅",
    famille: "Arômes & épices",
    accroche: "Dix minutes d'eau glacée atténuent nettement le piquant des lamelles d'oignon et l'arrière-goût qui s'attarde, sans rien retirer au croquant.",
    pourquoi: "L'oignon intact ne pique pas. Il range à part un dérivé soufré de la cystéine, l'isoalliine, et une enzyme, l'alliinase. Le couteau les met en présence : l'enzyme coupe la molécule et libère des acides sulféniques instables. Une seconde enzyme en tire le propanethial-S-oxyde, celui qui fait pleurer ; le reste se recombine en thiosulfinates puis en disulfures, d'où l'odeur et le goût qui remonte longtemps après.\n\nCes composés sont petits, solubles dans l'eau, concentrés sur la surface de coupe. Un rinçage en emporte une partie ; le froid ralentit l'enzyme qui continuerait d'en produire. L'explication tient debout, mais la part de ce qui est lavé et de ce qui est seulement ralenti n'a jamais été mesurée.\n\nLe croquant ne risque rien : il vient de l'eau qui pousse de l'intérieur contre la paroi des cellules. L'eau claire, moins concentrée que la sève, y entre : l'oignon ressort plus ferme qu'avant.",
    certitude: "partiel",
    cas: [
      { q: "L'eau glacée",
        r: "Dix à quinze minutes pour des lamelles fines, puis un égouttage soigneux. Le piquant part, le croquant gagne même un peu. En revanche un oignon mal essoré dilue la vinaigrette : pressez-le dans un linge avant de l'ajouter." },
      { q: "Le vinaigre ou le citron",
        r: "Un autre effet que l'eau, et pas celui qu'on croit. L'essentiel du piquant se forme dans la minute qui suit la coupe : l'acide versé après n'empêche plus rien. Il extrait une partie des composés soufrés, et son acidité couvre le reste en bouche. Il attaque aussi les cellules : passé un quart d'heure, l'oignon s'assouplit. Un oignon rouge y vire au rose vif, ses pigments suivant le pH." },
      { q: "L'échalote",
        r: "Même chimie en plus discret, et une chair moins ferme. Cinq minutes dans le vinaigre d'une vinaigrette suffisent à l'adoucir. L'eau glacée marcherait aussi, mais elle emporte du parfum en même temps que le mordant — c'est vrai de l'oignon également, et c'est le prix du trempage." },
      { q: "L'ail",
        r: "Même famille d'enzymes, molécule de départ différente : l'alliine donne l'allicine, plus mordante encore. Un ail écrasé développe bien plus de piquant qu'un ail tranché, la rupture des cellules décidant de tout. Quant au germe, on lui prête une amertume que les essais à l'aveugle attribuent plutôt à la gousse germée elle-même. Retirez-le pour le cru, sans en attendre un miracle." },
      { q: "L'oignon cuit",
        r: "La chaleur détruit l'enzyme en quelques dizaines de secondes : plus rien ne se forme, et une part de ce qui existait déjà s'en va avec la vapeur. Restent les sucres et les acides aminés, qui brunissent ensemble, par Maillard bien plus que par caramélisation. C'est pourquoi l'oignon confit n'a plus rien du cru." }
    ],
    reperes: [
      "10 à 15 minutes d'eau glacée pour des lamelles de 2 mm ; au-delà, on ne gagne plus grand-chose.",
      "Une lame très aiguisée tranche les cellules au lieu de les écraser : moins d'enzyme libérée, moins de larmes.",
      "Le sel et l'acide ramollissent l'oignon cru ; l'eau claire le raffermit."
    ],
    piege: "Saler l'oignon cru à l'avance en espérant l'adoucir. Le sel tire l'eau hors des cellules : le mordant reste entier, et les lamelles deviennent molles et translucides au lieu de craquer.",
    source: "Imai et al., Nature, 2002 — identification de la lachrymatory factor synthase"
  },
  {
    id: "emulsion",
    t: "L'émulsion",
    emoji: "🌀",
    famille: "Textures & liaisons",
    accroche: "Disperser un corps gras dans un liquide aqueux, en gouttelettes assez fines et assez bien gardées pour que le mélange nappe au lieu de se séparer.",
    pourquoi: "Huile et vinaigre s'ignorent : les molécules d'eau se tiennent entre elles par liaisons hydrogène, et il leur en coûte de s'ordonner autour des chaînes grasses. Ce n'est pas une répulsion, c'est un arrangement défavorable — les physiciens parlent d'effet hydrophobe. Fouetter déchire l'huile en fines gouttelettes, mais cette surface nouvelle coûte de l'énergie, et le système la rembourse en les laissant fusionner. Une émulsion n'est jamais stable au sens strict : elle est retardée.\n\nL'émulsifiant est une molécule à deux faces, une qui aime l'eau, une qui aime le gras. Elle se plante à l'interface et enveloppe chaque gouttelette d'une pellicule que la voisine ne traverse pas. Le jaune d'œuf en est chargé : on cite volontiers sa lécithine, mais ce sont surtout ses lipoprotéines de basse densité et ses protéines qui tiennent l'interface. La moutarde, elle, joue sur plusieurs tableaux à la fois — des protéines et de fines particules de graine à l'interface, des mucilages, polysaccharides du tégument, qui épaississent la phase aqueuse et ralentissent les rencontres. La part de chacun reste discutée.\n\nTrois leviers, donc : la finesse des gouttelettes, la couverture de l'interface, la viscosité du liquide qui les porte.",
    certitude: "etabli",
    cas: [
      { q: "La moutarde, dans une vinaigrette",
        r: "Elle agit sur deux fronts. Ses protéines et ses fines particules de graine tiennent l'interface ; ses mucilages épaississent la phase aqueuse et ralentissent les rencontres. La part respective des deux est encore débattue. Délayez-la d'abord dans le vinaigre et le sel : c'est là qu'elle travaille, et le sel ne se dissout pas dans l'huile." },
      { q: "Le jaune d'œuf, dans une mayonnaise",
        r: "Ses lipoprotéines de basse densité et ses phospholipides sont de vrais tensioactifs, et ils sont en large excès : un jaune porte de quoi couvrir bien plus d'huile qu'on n'en mettra jamais. Ce qui limite n'est pas là. Un jaune seul plafonne autour de 20 cl parce qu'il fournit aussi la phase aqueuse, et qu'elle sature. Ajoutez de l'eau ou du vinaigre au fur et à mesure, et le même jaune en tient plusieurs fois plus." },
      { q: "Le tahini, qui épaissit avant de se détendre",
        r: "C'est une pâte grasse chargée de particules de sésame. Les premières gouttes d'eau les font s'agglomérer et tout se bloque ; passé un certain volume, l'eau devient la phase continue et la crème arrive d'un coup. Continuez au-delà du moment qui paraît perdu." },
      { q: "L'eau très froide dans un houmous",
        r: "Le froid raidit le gras du sésame et épaissit le milieu : les gouttelettes bougent moins et fusionnent moins, pendant que le mixeur les fait très fines. Le geste marche, mais on l'explique par plausibilité plus que par mesure." },
      { q: "Une émulsion qui a tranché",
        r: "L'huile est venue trop vite, ou il faisait trop chaud : les gouttelettes ont dépassé ce que l'émulsifiant pouvait couvrir. Fouetter plus fort n'y fait rien. Repartez d'une base neuve, un jaune ou une cuillerée de moutarde, et versez le mélange tranché dedans en filet." }
    ],
    reperes: [
      "Trois parts d'huile pour une part d'acide : la proportion classique d'une vinaigrette.",
      "Un jaune seul monte environ 20 cl d'huile : c'est son eau qui limite, pas son pouvoir émulsifiant. Ajoutez de l'eau au fil de l'huile et il en tient bien davantage.",
      "Une sauce montée au beurre se garde au chaud sans jamais bouillir ; les fourchettes conseillées vont de 55 à 85 °C selon les auteurs, ce qui dit bien qu'il n'y a pas de seuil franc.",
      "Une cuillerée à café de moutarde monte sans peine 5 cl d'huile ; les vinaigrettes du carnet montent 3 c. à s. d'huile, avec une cuillerée à café pour les unes et une cuillerée à soupe pour les autres."
    ],
    piege: "Verser l'huile d'un trait. Les gouttelettes naissent trop grosses pour que l'émulsifiant les couvre : la sauce paraît liée dans le bol et se sépare en deux couches dans l'assiette dix minutes plus tard.",
    source: "Harold McGee, On Food and Cooking, chapitre sur les sauces émulsionnées."
  },
  {
    id: "gluten",
    t: "Le gluten",
    emoji: "🌾",
    famille: "Textures & liaisons",
    accroche: "Le réseau élastique que deux protéines de la farine forment au contact de l'eau : on le construit pour un pain, on l'évite pour un cookie.",
    pourquoi: "La farine de blé porte deux familles de protéines de réserve. Les gluténines sont de longues chaînes qui s'assemblent par ponts disulfure : elles donnent l'élasticité. Les gliadines restent isolées, glissent entre elles et donnent l'extensibilité. Sèches, elles ne font rien : c'est l'eau qui les déplie et les rend liantes.\n\nLe travail mécanique — pétrissage, rabats — aligne ces chaînes et multiplie les liaisons. Le réseau retient les gaz de la fermentation : c'est lui qui fait l'alvéole. Mais il joue contre vous : une pâte fraîchement travaillée est sous tension et se rétracte. Le repos la détend, le temps que les liaisons se réorganisent.\n\nD'où les deux usages opposés. Un pain veut du réseau ; un cookie ou une pâte à beignet n'en veulent pas, on y mélange le minimum et on laisse le gras enrober la farine. L'architecture fine du réseau reste discutée ; ses effets, eux, se mesurent.",
    certitude: "etabli",
    cas: [
      { q: "Pétrir, ou ne pas pétrir",
        r: "Un pain veut de la force : pétrissage, ou rabats espacés qui font le même travail sans effort. Une pâte à cookie ou à beignet veut l'inverse : on mélange jusqu'à disparition des traces de farine et on s'arrête là. Un tour de spatule de trop se voit à la cuisson." },
      { q: "À quoi sert le repos d'une pâte",
        r: "À deux choses distinctes. À hydrater complètement la farine, ce qui construit une part du réseau sans aucun travail mécanique. Et à relâcher les tensions : une pâte qui revient sur elle-même n'est pas ratée, elle est pressée. Dix à vingt minutes suffisent le plus souvent." },
      { q: "Le rôle de l'hydratation",
        r: "Plus une pâte est hydratée, plus le réseau est mou et mobile : il se forme lentement mais s'étire beaucoup, d'où les grandes alvéoles d'une focaccia à 75 % d'eau. Une pâte sèche développe vite un réseau court, ferme et régulier." },
      { q: "Quelle farine choisir",
        r: "Le chiffre T mesure le taux de cendres, pas les protéines : une T65 n'est pas forcément plus forte qu'une T55. Cherchez le taux de protéines sur le paquet : 9 à 10 % pour un gâteau tendre, 11 à 13 % pour un pain ou une focaccia." },
      { q: "Ce qui empêche le réseau de se former",
        r: "Le gras, qui enrobe les grains de farine ; le sucre, qui capte l'eau ; une acidité forte, qui affaiblit les liaisons. Une pâte à cookie beurrée et sucrée est donc peu gluténeuse par construction : mélanger peu n'est qu'une précaution de plus." }
    ],
    reperes: [
      "Une focaccia tourne autour de 75 % d'hydratation : 380 ml d'eau pour 500 g de farine.",
      "Trois ou quatre séries de rabats toutes les 30 min remplacent dix minutes de pétrissage.",
      "Cookies et sablés : arrêtez le mélange dès que la farine a disparu, pas un tour de plus.",
      "Le sel resserre le réseau : comptez 2 % du poids de farine, soit 10 g pour 500 g."
    ],
    piege: "Étirer de force une pâte qui se rétracte. Le réseau sous tension cède au lieu de s'allonger : la pâte se déchire, les bulles déjà formées s'échappent, et la focaccia cuit plate.",
    source: "Modernist Cuisine, « Gluten: How Does It Work? »"
  },
  {
    id: "amidon",
    t: "L'amidon",
    emoji: "🥔",
    famille: "Textures & liaisons",
    accroche: "Le grain de farine ou de pomme de terre qui gonfle à la chaleur, épaissit tout ce qui l'entoure, puis se referme lentement en refroidissant.",
    pourquoi: "L'amidon se présente en granules, empilements semi-cristallins de deux polymères de glucose : l'amylose, en chaînes droites, et l'amylopectine, ramifiée. À froid, dans l'eau, ils ne font rien : insolubles, ils sédimentent.\n\nChauffés avec de l'eau, ils passent un seuil : la structure cristalline se défait, le granule absorbe plusieurs fois son poids d'eau, gonfle, et l'amylose s'échappe dans le milieu. C'est la gélatinisation. Elle explique l'épaississement d'une sauce, la mie qui se fixe et le fondant d'une pomme de terre. Le seuil dépend de l'amidon : environ 58 à 66 °C pour la pomme de terre, 52 à 64 °C pour le blé.\n\nEn refroidissant, l'amylose libérée se réassocie en doubles hélices et recristallise : c'est la rétrogradation. Elle raffermit, expulse une part de l'eau et referme la structure. C'est le pain rassis, la sauce qui fige, la pomme de terre froide et cireuse.",
    certitude: "etabli",
    cas: [
      { q: "Pourquoi démarrer les tubercules à l'eau froide",
        r: "Pour que le cœur arrive à cuisson avant que la surface ne se délite : jetée dans l'eau bouillante, une pomme de terre s'effrite dehors quand le centre est encore ferme. La montée lente a un bonus : vers 50 à 60 °C, une enzyme de la paroi, la pectine méthylestérase, raffermit les tissus." },
      { q: "Pourquoi les pommes de terre tièdes boivent mieux",
        r: "Tièdes, leurs granules sont encore gonflés, la chair reste ouverte et la vapeur qui s'échappe laisse la place au liquide. Froides, l'amylose a rétrogradé et la structure s'est refermée. Le mécanisme est solide, mais ce transfert-là n'a jamais été mesuré finement." },
      { q: "L'eau de cuisson des pâtes qui lie une sauce",
        r: "Elle est chargée d'amidon gélatinisé, dissous ou en fragments. Il épaissit la phase aqueuse et se loge à l'interface des gouttelettes de gras : la sauce nappe et se sépare moins. Cuisez dans peu d'eau pour qu'elle soit assez concentrée." },
      { q: "Une sauce liée qui redevient liquide",
        r: "Deux causes distinctes. Trop de cuisson ou trop d'agitation : les granules gonflés éclatent et la viscosité s'effondre. Ou un acide, citron ou vin, qui coupe les chaînes d'amylose — dans ce cas, ajoutez-le après la liaison et non avant." },
      { q: "Le pain rassis qu'on repasse au four",
        r: "Le rassissement n'est pas qu'un dessèchement : c'est la rétrogradation de l'amidon, et elle est partiellement réversible. Repasser le pain au-delà de 60 °C refond ces cristaux et lui rend sa souplesse, pour quelques heures seulement." }
    ],
    reperes: [
      "Gélatinisation : environ 58 à 66 °C pour l'amidon de pomme de terre, 52 à 64 °C pour celui de blé.",
      "La rétrogradation va le plus vite entre 0 et 4 °C : le réfrigérateur rassit le pain plus vite que le placard.",
      "Une liaison à la farine demande une petite ébullition pour donner toute sa viscosité. La fécule de pomme de terre, elle, épaissit avant et se défait si on la fait bouillir : incorporez-la en fin de cuisson.",
      "Assaisonnez les pommes de terre pendant qu'elles fument encore : une fois refroidies, elles absorbent nettement moins."
    ],
    piege: "Mixer longuement une purée ou un velouté chargé d'amidon. Les cellules se déchirent, les granules gonflés éclatent, et l'amidon lâché dans le milieu forme un gel élastique : la texture passe de veloutée à collante, sans retour possible. Le phénomène est franc sur la pomme de terre, beaucoup plus discret sur une courge.",
    source: "Harold McGee, On Food and Cooking, chapitre sur les glucides et l'amidon."
  },
  {
    id: "contraste-textures",
    t: "Le contraste de textures",
    emoji: "🥄",
    famille: "Textures & liaisons",
    accroche: "Poser du croquant sur du fondant, du tiède sur du froid : la dernière bouchée reste aussi intéressante que la première, au lieu de s'éteindre.",
    pourquoi: "Manger plusieurs fois le même stimulus fait baisser le plaisir qu'il procure, et lui seul : c'est la satiété sensorielle spécifique, décrite par Barbara Rolls et ses coauteurs dès 1981. Après quelques bouchées, l'aliment mangé est jugé moins agréable, quand les autres gardent tout leur attrait. L'effet a été retrouvé pour le goût, l'odeur, la couleur — et pour la texture.\n\nLa texture ne se joue pas qu'en bouche : le croustillant dépend en partie du son. Atténuez le bruit de la mastication et le même aliment est jugé moins croustillant, plus rassis. Un plat d'une seule texture n'envoie qu'un signal, et il s'émousse.\n\nLe phénomène est établi : mesuré, répliqué. Son mécanisme l'est moins — habituation centrale, adaptation des récepteurs, effet d'attente. Et le pas que fait la cuisine, supposer qu'un contraste choisi vaut mieux qu'une texture unie, reste un savoir-faire, pas un résultat de laboratoire.",
    certitude: "partiel",
    cas: [
      { q: "Quoi ajouter à une purée ou à un velouté",
        r: "Quelque chose de sec et de dur, pas seulement de ferme : graines torréfiées, croûtons, éclats de noix, châtaignes dorées. Une garniture molle se noie dans la masse. Cherchez ce qui casse sous la dent, et de préférence à une autre température." },
      { q: "Quand ajouter le croquant",
        r: "Le plus tard possible, et jamais sous le liquide. Un croûton posé sur un velouté tient quelques minutes ; noyé dedans, quelques secondes. Quand le croquant doit porter l'élément humide — le gravlax drape le saumon sur le pain grillé —, le seul recours est le calendrier : on dresse à l'arrivée des convives, pas avant." },
      { q: "Contraster dans une salade",
        r: "Une salade est déjà croquante de partout : cherchez plutôt ce qui manque. Du fondant, du crémeux, du coulant — un œuf mollet, de la feta, de l'avocat. C'est le manque de mou, et non le manque de dur, qui rend une salade monotone." },
      { q: "Le contraste chaud-froid",
        r: "Il agit comme celui des textures et s'y ajoute souvent : une boule de glace sur un cookie brûlant, du saumon froid sur un pain tiède. Il se paie cher — chacun vieillit vite au contact de l'autre — donc il se dresse à la dernière seconde." },
      { q: "Comment garder croquant ce qui doit l'être",
        r: "L'eau est l'ennemie. Séchez, et refroidissez à plat sur du papier plutôt que dans la poêle ou dans la graisse chaudes. Posez le croquant sur une barrière grasse plutôt que sur une sauce aqueuse. Et salez à la sortie : salé trop tôt, l'aliment rend son eau par osmose et se ramollit avant d'arriver à table." }
    ],
    reperes: [
      "Deux textures franchement différentes suffisent ; passé trois, l'assiette devient un inventaire.",
      "Croûtons, graines et fruits secs : à parsemer dans la minute qui précède le service.",
      "Fruits secs torréfiés : refroidis à plat sur du papier, jamais laissés dans la poêle chaude.",
      "Un pain grillé sous un élément froid et humide ramollit en quelques minutes : c'est lui qui commande l'heure du dressage."
    ],
    piege: "Mélanger le croquant à la sauce pour qu'il « s'imprègne ». En dix minutes il a bu l'eau, il est mou, et il ne reste qu'une texture uniforme — celle-là même qu'on cherchait à rompre.",
    source: "Rolls et al., « Sensory specific satiety in man », Physiology & Behavior, 1981 ; Zampini & Spence, sur le son du croustillant, Journal of Sensory Studies, 2004."
  },
  {
    id: "pectine-acidite",
    t: "La pectine, l'acide et le calcium",
    emoji: "🫘",
    famille: "Textures & liaisons",
    accroche: "Un légume ou une légumineuse qui refuse de s'attendrir est rarement mal cuit : il cuit dans un milieu acide, ou dans une eau calcaire.",
    pourquoi: "Les cellules d'un végétal sont collées par la lamelle moyenne, riche en pectine. Cuire, c'est dissoudre cette colle : la chaleur casse les chaînes de pectine par bêta-élimination, les cellules se séparent, le légume devient tendre. Cette coupure ne se produit qu'aux endroits méthylestérifiés de la chaîne, et seulement à pH proche de la neutralité.\n\nSous pH 4 environ, elle s'arrête. La pectine tient, et des haricots dans une sauce tomate ou vinaigrée mijotent des heures sans céder. Le calcium fait pire : ses ions à deux charges pontent les chaînes de pectine en un pectate insoluble, d'où les cuissons interminables en eau calcaire.\n\nLe sodium fait l'inverse de ce qu'on lui prête. Il échange sa place avec le calcium accroché à la pectine et desserre l'édifice : une eau salée assouplit la peau au lieu de la durcir. Restent deux zones d'ombre : l'ampleur de l'effet selon la graine, et le cas des légumineuses trop vieilles, mal expliqué.",
    certitude: "partiel",
    cas: [
      { q: "Le sel dans l'eau des lentilles",
        r: "Il ne durcit pas la peau, c'est l'inverse : le sodium déloge le calcium de la pectine et donne des peaux plus souples, qui éclatent moins. Salez dès le départ si vous voulez que le sel entre dans la graine plutôt que de rester autour." },
      { q: "L'acide dans l'eau de cuisson",
        r: "Vinaigre, vin, tomate, citron : tous bloquent l'attendrissement. Ajoutez-les une fois la graine ou le légume déjà tendre, jamais avant. Ce qui cuit en milieu acide reste ferme quelle que soit la durée qu'on y consacre." },
      { q: "Une eau très calcaire",
        r: "Elle allonge nettement la cuisson des légumineuses, et parfois l'empêche d'aboutir. Passez à une eau filtrée ou peu minéralisée. Une pointe de bicarbonate corrige aussi, au prix de la vitamine B1 et d'une texture vite pâteuse." },
      { q: "Quand l'acide devient un allié",
        r: "Quand on veut que les morceaux tiennent. Pommes de terre en salade, pois chiches qui marinent, cornichons au vinaigre : le même mécanisme empêche l'effondrement. Tout dépend de ce qu'on attend du plat." },
      { q: "Des lentilles qui restent dures malgré tout",
        r: "Regardez leur âge. Une graine stockée longtemps, au chaud ou à l'humidité, développe un défaut durable : le calcium migre vers la paroi, la lamelle se rigidifie. Le mécanisme n'est compris qu'en partie, et aucune cuisson ne la rattrape." }
    ],
    reperes: [
      "En dessous de pH 4 environ, l'attendrissement s'arrête : tomate, vin et vinaigre en fin de cuisson seulement.",
      "Sel : 5 à 10 g par litre dès le départ, sans crainte pour la peau.",
      "Bicarbonate : un quart de cuillère à café par litre suffit, et se paie en texture.",
      "Un maintien à 55-60 °C pendant vingt à trente minutes raffermit au contraire une pomme de terre, définitivement."
    ],
    piege: "Ajouter la tomate ou le vinaigre en début de cuisson d'une légumineuse. Le pH tombe, l'attendrissement s'arrête net, et aucune prolongation ne rattrapera des graines restées fermes au cœur.",
    source: ""
  },
  {
    id: "osmose-sel",
    t: "Le sel et l'eau des aliments",
    emoji: "🧂",
    famille: "Sel, acide & goût",
    accroche: "Saler, c'est déplacer de l'eau : selon le moment où l'on sale, on la fait sortir de l'aliment, ou on la lui fait garder.",
    pourquoi: "Le sel dissous en surface forme une solution bien plus concentrée que l'intérieur des cellules. L'eau traverse alors les membranes vers cette solution : c'est l'osmose. Elle perle, elle coule — le champignon rend son jus, le concombre mouille la salade, l'aubergine s'affaisse.\n\nPuis le mouvement s'inverse. Les ions sodium et chlorure diffusent à leur tour vers l'intérieur, lentement, jusqu'à égaliser la salinité. Dans une chair animale, le chlorure se fixe sur les filaments de myosine, augmente leur charge négative et les écarte : le réseau gonfle et retient plus d'eau qu'avant. Une viande salée la veille rend donc moins de jus qu'une viande salée un quart d'heure avant.\n\nToute la pratique tient dans l'écart entre ces deux vitesses : la sortie d'eau est immédiate, le retour du sel demande des heures. Entre les deux s'ouvre une fenêtre où la surface reste mouillée, où rien ne dore. L'osmose et le gonflement du réseau musculaire sont bien documentés ; la durée exacte de cette fenêtre ne l'est pas. Elle dépend de l'épaisseur, de la dose et de la température, et les essais qui prétendent la mesurer sont rares.",
    certitude: "partiel",
    cas: [
      { q: "Les champignons",
        r: "Ils sont à près de 90 % d'eau et la rendent en quelques secondes. Salés dès la poêle froide, ils baignent dans leur jus : tant que la surface est mouillée, elle plafonne à 100 °C et ne brunit pas. La suite est plus discutée qu'on ne le dit — la chaleur seule finit par faire rendre l'eau, et des essais comparatifs ne trouvent pas toujours de différence à l'arrivée. Le sel de fin reste le geste sûr : il n'ajoute pas d'eau à évaporer au moment précis où la coloration se joue." },
      { q: "L'aubergine et le concombre que l'on dégorge",
        r: "L'osmose vide les cellules et tasse la chair : le concombre cesse de détremper la salade, l'aubergine boit un peu moins d'huile. La part de l'amertume, elle, est douteuse — les variétés modernes en ont peu, et le sel la masque plus qu'il ne la retire." },
      { q: "Une viande ou un poisson salés à l'avance",
        r: "Salez à la seconde même, ou plusieurs heures avant. Entre les deux, le sel a fait sortir l'eau sans avoir eu le temps de rentrer : c'est le pire moment pour cuire. Le gravlax n'est que ce geste poussé à son terme." },
      { q: "Les lentilles, les pois chiches, les haricots secs",
        r: "Le sel ne durcit pas leur peau, contrairement à ce que l'on répète. Ce sont les ions calcium et magnésium qui pontent la pectine des parois et la rendent réfractaire ; le sodium, lui, les déplace, et la peau s'attendrit plutôt mieux. L'acide gêne aussi, mais par une autre voie : en abaissant le pH, il freine la dégradation de la pectine à la cuisson. Ce sont donc la tomate, le vinaigre et l'eau calcaire qu'il faut retarder, jamais le sel." },
      { q: "Un kale que l'on masse, une salade de feuilles",
        r: "Sur une feuille coriace, la pression rompt les cellules et le sel les vide par osmose : le kale fonce, réduit et s'attendrit en trois minutes. Le travail des mains fait l'essentiel, le sel accélère. Sur une feuille tendre, la même pincée la fait retomber en flaque — on ne l'assaisonne qu'au moment de passer à table." }
    ],
    reperes: [
      "Un champignon est à près de 90 % d'eau : c'est presque tout ce qu'il a à perdre.",
      "Dans une chair au réfrigérateur, le sel avance d'environ 5 mm par jour et par face : une nuit sale correctement un filet ou un pavé de 2 à 3 cm, pas une grosse pièce.",
      "Dégorger : une bonne cuillère à café de sel fin pour 500 g de légume, 30 min à 1 h, puis rincer et éponger."
    ],
    piege: "Saler un quart d'heure avant de saisir. L'eau est sortie, le sel n'est pas encore rentré : la surface mouillée refuse de dorer et la chair rend son jus dans la poêle. Salez à l'instant même, ou la veille.",
    source: "Offer & Trinick, « On the mechanism of water holding in meat: the swelling and shrinking of myofibrils », Meat Science, 8(4), 1983, p. 245-281."
  },
  {
    id: "assaisonnement-couches",
    t: "L'assaisonnement par couches",
    emoji: "🥄",
    famille: "Sel, acide & goût",
    accroche: "Saler à chaque étape plutôt qu'une seule fois à la fin : le goût s'installe dans l'aliment au lieu de se poser dessus.",
    pourquoi: "Le sel ne se répand pas de lui-même. Il diffuse, du plus concentré vers le moins concentré, et d'autant plus lentement que l'aliment est dense et froid. Vingt minutes d'eau salée ne portent le sel qu'à quelques millimètres sous la peau d'une pomme de terre : le cœur reste peu salé, et la bouche s'en accommode parce qu'elle moyenne l'ensemble. Ce qui boit l'eau, en revanche, boit le sel avec elle — les pâtes, elles, sont salées de part en part. Dans tous les cas, le même sel jeté à la fin ne quitte pas la surface.\n\nLa différence est une différence de répartition, et celle-là se mesure. Un aliment salé à cœur a un goût égal ; salé en surface, il donne des pointes de salinité entre des bouchées fades. Que l'un vaille mieux que l'autre ne se démontre pas : la fleur de sel de fin est justement voulue en pointes.\n\nReste que le sel précoce fait sortir l'eau. Partout où cette eau gêne — les champignons, les surfaces que l'on veut dorer, les feuilles que l'on veut croquantes — la couche du début ne construit rien : elle mouille. Et la pâtisserie ne se sale pas par couches : le sel y part en une fois, avec les poudres.",
    certitude: "partiel",
    cas: [
      { q: "Une eau de cuisson : pâtes, légumes, tubercules",
        r: "C'est la seule couche qui puisse entrer dans l'aliment : tout ce qu'on ajoutera ensuite restera en surface. Salez franchement, autour de 10 g par litre : l'aliment n'en prend qu'une petite part et le reste s'en va à l'évier. Une eau oubliée ne se rattrape pas ensuite." },
      { q: "Un aliment que l'on veut colorer",
        r: "Exception nette, et elle vient de l'osmose. Champignons, artichauts épongés, cubes de courge à saisir : le sel précoce fait perler l'eau, la surface plafonne à 100 °C et le brunissement n'a pas lieu. Salez une fois la couleur prise." },
      { q: "Une marinade, une salade que l'on laisse reposer",
        r: "Ici la couche du début travaille pour vous. Le sel et l'acide entrent pendant le repos dans ce qui n'a pas de goût propre : pois chiches, lentilles, pommes de terre encore tièdes. Un quart d'heure change tout, et rien ne le remplace à la fin." },
      { q: "Le sel de finition",
        r: "Fleur de sel, sel de Maldon : ils ne sont pas là pour saler mais pour craquer et faire une pointe. Ils tiennent tant que les cristaux ne se dissolvent pas, donc sur une surface plutôt sèche. Un passage au four ne les efface pas : sur une focaccia huilée comme sur une pâte à cookie, les gros cristaux traversent la cuisson et donnent encore leurs pointes. C'est l'humidité qui les fond, pas la chaleur." },
      { q: "La pâtisserie",
        r: "Elle échappe à la règle. Le sel part entier dans la pâte, tamisé avec les poudres, et ne pourra plus être ajusté. Seule survit la pincée de fleur de sel posée sur le dessus, qui joue le contraste et non l'assaisonnement." }
    ],
    reperes: [
      "Eau de cuisson : environ 10 g de sel par litre ; l'aliment n'en absorbe qu'une fraction.",
      "On goûte et on ajuste à chaque étape : le sel s'ajoute, il ne se retire pas.",
      "La fleur de sel se pose sur une surface sèche : c'est l'eau de surface qui dissout les cristaux, pas la chaleur du four."
    ],
    piege: "Vouloir rattraper à la fin une eau de cuisson oubliée. Le sel de surface donne des pointes salées sur un aliment resté fade à cœur : on force la dose, et le plat devient salé sans jamais être assaisonné.",
    source: ""
  },
  {
    id: "sel-patisserie",
    t: "Le sel en pâtisserie",
    emoji: "🧁",
    famille: "Sel, acide & goût",
    accroche: "Une pincée de sel dans une pâte sucrée ne la rend pas salée : elle lui rend le relief que le sucre seul lui retire.",
    pourquoi: "Le mécanisme le mieux établi n'est pas une amplification du sucré, mais une levée d'inhibition. Le sodium atténue la perception de l'amertume ; or l'amertume masque le sucré. En retirant l'amer, on libère le sucré, qui paraît plus net. Breslin et Beauchamp l'ont montré en 1997. Où se joue exactement cet effet — sur les récepteurs eux-mêmes ou plus haut, dans la façon dont le mélange est intégré — n'est pas tranché.\n\nDans une pâte, l'amertume ne manque pas : cacao, chocolat noir, bicarbonate, mélasse de la cassonade, beurre poussé jusqu'à la noisette. Sans sel, elle occupe la bouche et le sucré s'aplatit en une douceur uniforme. Avec, le caramel de la cassonade et le chocolat se détachent.\n\nQue le sel rende le sucré plus sucré directement, en agissant sur le récepteur du sucre, est en revanche mal établi et discuté. Ses deux effets mécaniques, eux, sont certains : il resserre le réseau de gluten et il freine la levure — sans importance pour un cookie, décisif pour une brioche.",
    certitude: "partiel",
    cas: [
      { q: "Une pâte à cookie, un sablé, une pâte sucrée",
        r: "Comptez 1 à 2 % du poids de farine, soit 2 à 3 g pour 160 g. Le sel part avec les poudres, tamisé, et ne pourra plus être ajusté ensuite. C'est lui seul qui empêche une pâte portant presque son poids de farine en sucre de n'être qu'une masse douce et plate." },
      { q: "Si l'on cuisine au beurre demi-sel",
        r: "Les mentions sont larges : « demi-sel » couvre tout ce qui titre entre 0,8 et 3 g de sel pour 100 g, « salé » commence au-delà de 3 g. Un demi-sel peut donc en apporter quatre fois plus qu'un autre. Lisez le pourcentage sur l'étiquette, puis retranchez cette part du sel de la recette. Et notez que ce sel-là est réparti dans la pâte, jamais en pointes." },
      { q: "La fleur de sel posée sur le dessus",
        r: "Ce n'est plus le même geste. Elle ne se dissout pas dans la pâte : elle reste en cristaux et donne des pointes salées qui alternent avec le sucré. C'est un contraste, pas un assaisonnement. Elle se pose juste avant le four ou à la sortie." },
      { q: "Une brioche, une pâte levée, une focaccia",
        r: "Le sel y a aussi un rôle mécanique : il resserre le réseau de gluten et ralentit la levure. Comptez environ 2 % du poids de farine, mêlé à la farine. La règle qui interdit de le laisser toucher la levure est en revanche une prudence de tradition : aux doses d'une pâte, et sur les minutes qui séparent le mélange du pétrissage, on ne mesure pas de levure perdue. Évitez seulement de les laisser voisiner une heure dans un fond d'eau." },
      { q: "Un caramel, une ganache, une crème vanille",
        r: "Le sel agit sur l'amertume, donc là où il y en a. Une pincée dans un caramel ou une ganache au chocolat noir, riches en sucres brunis et en tanins, change tout. La même pincée dans une crème vanille n'a presque rien à démasquer." }
    ],
    reperes: [
      "Pâte sucrée : 1 à 2 % du poids de farine, soit environ 2 à 3 g pour 160 g.",
      "Beurre demi-sel : de 0,8 à 3 g de sel pour 100 g selon les marques, au-delà pour un beurre salé — lisez l'étiquette avant de retrancher.",
      "Pâte levée : environ 2 % du poids de farine, mêlé à la farine plutôt que jeté dans l'eau de levure."
    ],
    piege: "Doubler le sel en espérant doubler l'effet. La levée d'inhibition ne suit pas la dose bien longtemps : passé environ 2 % du poids de farine, on goûte le sel lui-même et la pâte bascule dans le salé. Où se situe exactement ce plafond n'est pas documenté — c'est une limite de goût, tenue par l'usage plus que par la mesure.",
    source: "Breslin & Beauchamp, « Salt enhances flavour by suppressing bitterness », Nature, 387, 1997, p. 563."
  },
  {
    id: "acidite-finale",
    t: "L'acidité de fin",
    emoji: "🍋",
    famille: "Sel, acide & goût",
    accroche: "Quelques gouttes d'acide au dernier moment sur un plat qui paraît plat, et tout se remet en place sans que le plat devienne acide.",
    pourquoi: "L'explication courante — l'acide « réveillerait » des arômes endormis — n'a aucun fondement. La chimie va en sens inverse : baisser le pH protone les composés basiques et les rend moins volatils. C'est ainsi que le citron éteint l'odeur de poisson, en protonant la triméthylamine, qui cesse de s'envoler.\n\nCe qui se passe est perceptif. L'acidité est une dimension du goût, et son absence laisse le gras et le sucré occuper seuls la bouche, sans rien contre quoi se détacher. L'acide leur oppose ce contraste, et il déclenche la salivation la plus forte de toutes les saveurs : la bouche se rince au lieu de s'engourdir. Cette part-là est observée, mal modélisée.\n\nSur la matière, en revanche, on est en terrain plus ferme : abaisser le pH sous 4,5 environ freine la β-élimination, la voie par laquelle la pectine des parois se défait à la cuisson, et les légumes tiennent. La protection n'est pas sans fond — vers pH 3,5, l'hydrolyse acide prend le relais et ramollit à son tour. L'acide fait aussi virer la chlorophylle au vert olive et cailler le lait.",
    certitude: "partiel",
    cas: [
      { q: "Quel acide pour quel plat",
        r: "Le citron porte des arômes propres et très volatils : poissons, légumes verts, crèmes fraîches. Le vinaigre de vin ou de cidre est plus rond et supporte la cuisson : légumineuses, mijotés, viandes. Le balsamique apporte autant de sucre que d'acidité." },
      { q: "À quel moment l'ajouter",
        r: "Le jus d'agrume se met hors du feu : ses arômes s'en vont en quelques minutes de chaleur et il ne reste que l'acidité nue. Un vinaigre, lui, peut entrer en cuisson pour se fondre et perdre son mordant — c'est le déglaçage." },
      { q: "Un plat gras ou crémeux qui écœure",
        r: "C'est le cas le plus net. Le gras enrobe la bouche et émousse les sensations ; l'acide déclenche la salivation qui la rince. Un dip au chèvre, une sauce au yaourt, un velouté à la crème n'ont pas à être acides, ils ont besoin d'un trait." },
      { q: "Ce que l'acide fait à la texture",
        r: "En freinant la β-élimination, un milieu acide garde les parois intactes plus longtemps : les légumes restent fermes. Utile pour des pommes de terre en salade, gênant pour des lentilles ou des haricots secs, qu'un acide trop précoce empêche de s'attendrir. Ne poussez pas l'acidité trop loin pour autant : très bas, l'hydrolyse ramollit à son tour." },
      { q: "Le zeste ou le jus",
        r: "Ils ne font pas le même travail. Le zeste ne contient presque pas d'acide : il apporte les huiles essentielles, donc le parfum. Le jus apporte l'acidité, donc le contraste et la salivation. Un plat sans relief manque souvent des deux." }
    ],
    reperes: [
      "Le jus d'agrume s'ajoute hors du feu : ses arômes ne tiennent pas plus de quelques minutes de cuisson.",
      "La pectine des parois se dégrade le plus lentement autour de pH 4 à 4,5 ; plus acide encore, l'hydrolyse prend le relais et le ramollissement repart.",
      "On corrige goutte à goutte : un excès d'acide ne se retire pas, il ne s'adoucit qu'au gras ou au sucré."
    ],
    piege: "Verser le jus de citron dans la casserole encore sur le feu. Ses arômes, très volatils, partent en quelques minutes : il ne reste que l'acidité, et l'on obtient un plat acide qui n'a même pas le goût de citron.",
    source: "Froehlich, Pangborn & Whitaker, « The effect of oral stimulation on human parotid salivary flow rate and alpha-amylase secretion », Physiology & Behavior, 1987."
  },
  {
    id: "salaison",
    t: "La salaison",
    emoji: "🧂",
    famille: "Sel, acide & goût",
    accroche: "Couvrir une chair crue de sel et de sucre pendant quelques heures, pour qu'elle perde son eau, se raffermisse et prenne cette couleur dense et cette tenue qui la font ressembler à une chair cuite.",
    pourquoi: "Le sel posé sur une chair se dissout dans son eau et forme une saumure très concentrée. L'eau des cellules migre vers ce milieu plus salé : c'est l'osmose, et elle vide peu à peu la chair de son eau libre. Le sucre y participe beaucoup moins qu'on ne le croit. Sa molécule pèse près de six fois celle du sel, donc à masse égale il y a six fois moins de molécules ; et le sel, lui, se sépare en deux ions, chacun comptant pour un. À poids identique, il met en jeu une douzaine de fois plus de particules actives. Le tirage d'eau, c'est lui.\n\nEn sens inverse, le sel entre. À faible concentration il gonfle les protéines myofibrillaires et leur fait retenir plus d'eau ; le maximum se situe autour de 5 % de sel dans la phase aqueuse, à peu près une mole par litre. Au-delà, l'effet s'inverse et les protéines s'agrègent. Vers 8 à 10 % dans le muscle, la myosine se dénature franchement — le seuil mesuré sur le cabillaud par Duerr et Dyer, où la prise de sel et la perte d'eau s'emballent d'un coup. Dans un gravlax, seule la zone proche de la surface atteint ces valeurs : d'où le dégradé de texture du bord au cœur.\n\nCette dénaturation ressemble à celle de la cuisson : la chair devient ferme, opaque en surface, elle ne colle plus. Mais elle est purement physico-chimique. Aucune chaleur n'a agi, donc aucun micro-organisme ni aucun parasite n'a été détruit au passage. C'est toute la différence, et elle ne se voit pas dans l'assiette.",
    certitude: "etabli",
    cas: [
      { q: "Combien de temps pour un filet de saumon",
        r: "Douze à vingt-quatre heures au réfrigérateur pour un filet de 500 g, sous un poids léger. En deçà de huit heures le centre reste cru et mou ; au-delà de trente-six, le sel gagne le cœur et la chair devient sèche. Ces durées sont des repères d'usage, calés sur l'épaisseur du filet plus que sur une mesure : un filet mince va plus vite." },
      { q: "Pourquoi mettre du sucre avec le sel",
        r: "Pour la bouche d'abord : à quantité de sel égale, un mélange moitié sel moitié sucre se mange, du sel pur non. Le sucre retient aussi un peu d'eau dans la chair et tempère le durcissement, ce qui donne une texture plus souple." },
      { q: "Le sel sur les champignons, est-ce la même chose",
        r: "En partie seulement. Le sel tire bien un peu d'eau d'un champignon, mais l'essentiel de la sienne sort à la chaleur, quand sa structure spongieuse s'effondre. Des essais répétés montrent qu'un salage précoce ne compromet pas le brunissement. Salez en fin de cuisson si le geste vous plaît, mais sachez que le mécanisme n'est pas celui du gravlax." },
      { q: "Faut-il rincer après la salaison",
        r: "Oui, à l'eau froide et abondamment : le mélange resté en surface continue de saler et rend les premières lamelles immangeables. Épongez ensuite avec soin, une chair humide se tranche mal et se garde moins bien." },
      { q: "La salaison conserve-t-elle le poisson",
        r: "Pas à cette dose. Un gravlax reste bien au-dessus de 0,96 d'activité de l'eau, quand Listeria monocytogenes se développe encore vers 0,92 — et jusqu'à quelques dixièmes de degré au-dessus de zéro, c'est-à-dire partout dans un réfrigérateur. On est très loin du compte. Comptez trois jours, comme du poisson frais." },
      { q: "Salaison et cuisson, quelle différence",
        r: "La texture se ressemble, le résultat sanitaire non. La chaleur dénature les protéines et détruit en même temps micro-organismes et parasites ; le sel ne fait que la première moitié du travail. Un poisson salé reste un poisson cru." }
    ],
    reperes: [
      "Mélange gravlax : autant de sel que de sucre, environ 25 g de mélange pour 100 g de chair.",
      "12 à 24 h au réfrigérateur pour un filet de 500 g, sous un poids léger.",
      "Rétention d'eau maximale vers 5 % de sel dans la phase aqueuse ; au-delà de 8 à 10 % dans la chair, la myosine se dénature — seuil mesuré sur le cabillaud.",
      "Rinçage abondant puis épongeage : le sel de surface ne s'arrête pas tout seul."
    ],
    piege: "Prolonger la salaison en croyant bien faire. Passé trente-six heures, un filet fin est salé à cœur : il ressort sec, dur et compact, et aucun rinçage ne rattrape le sel déjà entré dans la chair.",
    source: "J. D. Duerr et W. J. Dyer, « Proteins in Fish Muscle. IV. Denaturation by Salt », Journal of the Fisheries Research Board of Canada, vol. 8, p. 325-331."
  },
  {
    id: "herbes-coupees",
    t: "Les herbes fraîches et la lame",
    emoji: "🌿",
    famille: "Végétal & couleur",
    accroche: "On tranche les herbes tendres d'un seul coup de lame affûtée, au dernier moment : elles restent vertes et parfumées au lieu de virer au noir.",
    pourquoi: "Une feuille intacte garde ses enzymes et leurs substrats dans des compartiments séparés ; la lame les met en présence. La polyphénol oxydase oxyde alors les phénols — le basilic est très riche en acide rosmarinique — en quinones brunes qui polymérisent : c'est le noircissement. La lipoxygénase, elle, ne coupe rien : elle oxygène l'acide linolénique de la feuille en un hydroperoxyde, qu'une seconde enzyme, l'hydroperoxyde lyase, tranche alors en aldéhydes à six carbones. Le plus connu est le cis-3-hexénal, l'odeur même de l'herbe tondue.\n\nD'où la lame très affûtée et le passage unique : elle sectionne les cellules au lieu de les écraser, et le nombre de cellules ouvertes reste faible. La chiffonnade, feuilles roulées et coupées une seule fois, pousse le principe à son terme.\n\nDeux réserves, toutefois. Les enzymes sont bien documentées, mais le principe pratique — moins de cellules ouvertes, donc moins de brunissement — est un raisonnement plausible que personne n'a mesuré en cuisine. Et l'amertume de la menthe pilée reste sans explication : on lit partout que la chlorophylle libérée serait amère, rien ne l'établit vraiment. Les gestes de cette fiche se jugent au goût, pas sur une courbe.",
    certitude: "partiel",
    cas: [
      { q: "Pourquoi le basilic noircit-il si vite ?",
        r: "Il est exceptionnellement riche en phénols, dont l'acide rosmarinique, et sa polyphénol oxydase est active. Coupé, il brunit en quelques minutes ; sous 12 °C ses membranes commencent à céder et il noircit même entier, franchement dès 4 °C. Le basilic ne va donc pas au réfrigérateur." },
      { q: "Ciseau, couteau ou chiffonnade ?",
        r: "La chiffonnade pour les grandes feuilles tendres, basilic et menthe : une coupe par feuille. Le ciseau pour la ciboulette, dont les tiges creuses s'écrasent sous un couteau. Le couteau pour le persil plat, assez ferme pour le supporter." },
      { q: "Quand ajouter l'herbe : au début ou à la fin ?",
        r: "Les ligneuses — romarin, thym, laurier, sauge — entrent tôt : leurs arômes sont enfermés dans une feuille coriace et mettent du temps à sortir. Les tendres — basilic, cerfeuil, ciboulette, aneth, menthe — arrivent hors du feu, que la chaleur efface." },
      { q: "La menthe au mixeur, jusqu'où ?",
        r: "Le mixeur écrase et chauffe : le pire traitement pour une feuille tendre. Trois ou quatre impulsions brèves suffisent à la répartir. Au-delà, la préparation vire au vert sale et prend un goût d'herbe mâchée qui ne s'en va plus." },
      { q: "La ciboulette est-elle un cas à part ?",
        r: "Oui : son parfum n'existe pas dans la tige intacte. La coupe met une alliinase au contact de précurseurs soufrés et l'arôme naît dans la minute, puis s'affaiblit. Ciselez-la juste avant de servir, jamais une heure à l'avance." }
    ],
    reperes: [
      "Basilic : ne descend pas sous 12 °C ; hors du réfrigérateur, tige dans l'eau.",
      "Herbes tendres : ciselées moins de 10 minutes avant le service.",
      "Herbes ligneuses : 15 à 20 minutes de cuisson pour donner leur parfum.",
      "Menthe au mixeur : 3 à 4 impulsions d'une seconde, pas davantage."
    ],
    piege: "Hacher les herbes d'avant en arrière avec un couteau émoussé. Chaque va-et-vient rouvre les mêmes cellules et écrase les autres : on obtient une pâte verte qui sent la tonte et qui noircit dans l'heure.",
    source: "Postharvest Biology and Technology — brunissement du basilic au froid (PPO et peroxydases)"
  },
  {
    id: "chlorophylle",
    t: "Le vert des légumes",
    emoji: "🥦",
    famille: "Végétal & couleur",
    accroche: "Cuire un légume vert dans beaucoup d'eau, à découvert et peu de temps, puis l'arrêter dans la glace : il ressort plus vert que cru.",
    pourquoi: "Le vert vient de la chlorophylle, une molécule bâtie autour d'un atome de magnésium tenu au centre d'un grand anneau. La chaleur commence par l'aviver : elle chasse l'air logé entre les cellules, qui diffusait la lumière et voilait le pigment.\n\nPuis les cellules cèdent et libèrent leurs acides. Un proton prend la place du magnésium, et la chlorophylle devient de la phéophytine, d'un vert olive terne. En cuisine, la bascule est sans retour : le magnésium ne revient jamais dans l'anneau, et seule l'industrie sait y loger du zinc ou du cuivre pour refaire un vert stable. Tout consiste donc à retarder ce moment — beaucoup d'eau pour diluer les acides, pas de couvercle, et une cuisson courte.\n\nLe bain glacé, lui, ne fixe rien au sens chimique. La formule est un raccourci commode. Il arrête la cuisson, et c'est déjà beaucoup : sans lui, le légume continue de chauffer dans sa propre masse, et c'est là que la phéophytine s'installe.",
    certitude: "etabli",
    cas: [
      { q: "Faut-il vraiment beaucoup d'eau",
        r: "Oui, pour deux raisons distinctes. Un grand volume ne retombe pas sous l'ébullition quand les légumes arrivent, donc la cuisson reste courte. Et il dilue les acides que les légumes relâchent, ce qui maintient le bain près de la neutralité." },
      { q: "Le sel de l'eau de cuisson",
        r: "Il assaisonne, et c'est là sa vraie fonction : un légume salé à cœur pendant la cuisson n'a pas le même goût qu'un légume salé après. On lui prête aussi un effet protecteur sur la couleur : quelques travaux le mesurent, et le trouvent faible. Rien qui justifie de saler pour le vert plutôt que pour le goût." },
      { q: "Le couvercle",
        r: "À laisser de côté pour un légume vert : à découvert, la perte de couleur mesurée est moindre. L'explication reçue veut qu'une partie des acides libérés s'échappe avec la vapeur au lieu de retomber dans l'eau. Elle est plausible, mais les acides majoritaires du légume ne sont pas volatils, et personne n'a isolé la part qui l'est. Le geste est sûr, sa raison l'est moins." },
      { q: "Combien de temps avant que le vert tourne",
        r: "Quelques minutes suffisent. Le virage devient visible autour de cinq à sept minutes d'ébullition, puis il s'emballe. Un haricot vert de trois minutes reste éclatant ; le même à dix minutes ne se rattrape plus, il est cuit mais kaki." },
      { q: "L'acide de la vinaigrette",
        r: "Sur un légume encore brûlant, c'est le pire moment : le vinaigre ou le citron fait virer la surface en quelques minutes. Assaisonnez les verts une fois refroidis, ou juste avant de passer à table." }
    ],
    reperes: [
      "Au moins 3 litres d'eau pour 500 g de légumes verts, à gros bouillons.",
      "3 à 5 minutes pour des haricots verts ou des petits pois ; au-delà de 7, le vert s'en va.",
      "Bain glacé : autant de glaçons que d'eau, et on y laisse le légume jusqu'à ce qu'il soit froid à cœur.",
      "Une pointe de bicarbonate tient le vert mais ramollit : la couleur est gagnée, la texture perdue."
    ],
    piege: "Couvrir la casserole pour gagner du temps. Les essais donnent raison au découvert : à couvert, les haricots ressortent kaki alors qu'ils sont cuits à la seconde près. La raison exacte se discute, le résultat non.",
    source: "Harold McGee, On Food and Cooking, chapitre consacré aux légumes"
  },
  {
    id: "oxydation-enzymatique",
    t: "Le brunissement enzymatique",
    emoji: "🍎",
    famille: "Végétal & couleur",
    accroche: "Un fruit coupé brunit en quelques minutes : ce n'est pas l'air qui le salit, c'est une enzyme que le couteau vient de libérer.",
    pourquoi: "La cellule végétale range séparément deux choses : des composés phénoliques d'un côté, une enzyme à cuivre de l'autre, la polyphénol oxydase. Le couteau abat la cloison, et l'oxygène de l'air complète la rencontre.\n\nL'enzyme oxyde alors les phénols en quinones, très réactives, qui se lient entre elles et aux protéines en longues chaînes brunes : des mélanines, les pigments mêmes du bronzage. La couleur n'est ni de la saleté ni un début de pourriture, c'est un pigment que le fruit fabrique lui-même. Trois choses sont nécessaires, l'enzyme, les phénols, l'oxygène : en retirer une suffit.\n\nLe citron agit deux fois — son acidité fait chuter le pH sous l'optimum de l'enzyme, et sa vitamine C ramène les quinones en arrière tant qu'il en reste. L'eau froide, elle, se contente d'écarter l'air et de ralentir : rien n'est inhibé, tout est différé.",
    certitude: "etabli",
    cas: [
      { q: "La pomme",
        r: "Brunissement rapide et bien visible, surtout sur les variétés riches en phénols comme la Granny Smith. L'eau citronnée la tient une bonne heure. Taillée en petits dés, elle vire beaucoup plus vite : c'est la surface exposée qui décide." },
      { q: "L'avocat",
        r: "Même enzyme, mais une chair grasse qui retient mal l'acide. Le noyau ne protège que ce qu'il touche, rien de plus. Ce qui marche est le contact : citron pressé directement sur la surface, film plaqué dessus, et découpe au dernier moment." },
      { q: "L'artichaut",
        r: "Le champion de la catégorie, noir en moins d'une minute. Il demande un bain d'eau citronnée dès le premier coup de couteau, et une lame inoxydable : l'acier au carbone ajoute des taches grises en réagissant avec ses phénols." },
      { q: "La banane",
        r: "Sa chair brunit vite une fois coupée. Sa peau noircit au réfrigérateur sans que la chair souffre : le froid abîme les membranes de ce fruit tropical et libère l'enzyme dans la peau seule. Ce n'est pas un signe de pourriture." },
      { q: "Le champignon",
        r: "Il brunit à la coupe et à la moindre meurtrissure. Le rincer ne lui fait pas le mal qu'on dit : mesuré, un champignon trempé cinq minutes ne prend qu'environ deux pour cent de son poids en eau, qui s'évapore en quelques secondes dans une poêle chaude. Ce qui l'empêche de dorer, c'est l'eau restée en surface et une poêle trop chargée. Rincez vite, épongez, et donnez-lui de la place." }
    ],
    reperes: [
      "L'enzyme travaille au mieux vers pH 6 et s'arrête presque en dessous de pH 4 : comptez le jus d'un citron entier par litre d'eau, un demi ne fait qu'effleurer le seuil.",
      "Un blanchiment d'une à deux minutes au-dessus de 80 °C fait tomber l'activité à quelques pour cent : le légume ne brunit plus, même si une fraction thermorésistante de l'enzyme survit au bain.",
      "Au réfrigérateur, le brunissement est nettement ralenti mais jamais arrêté : l'enzyme reste active à 4 °C, et une pomme coupée oubliée une nuit ressort brune."
    ],
    piege: "Compter sur l'eau froide seule pour une pomme taillée à l'avance. Elle ressort pâle du bol, puis brunit dans l'assiette en dix minutes : rien n'a été inhibé, tout a seulement été repoussé.",
    source: ""
  },
  {
    id: "infusion-froid",
    t: "L'infusion à froid",
    emoji: "🧊",
    famille: "Froid, gras & sécurité",
    accroche: "On laisse une herbe séjourner une heure dans un liquide froid : le parfum passe entièrement dans la sauce sans qu'aucune chaleur ne l'abîme.",
    pourquoi: "Une infusion est une affaire de diffusion. Les molécules aromatiques quittent la feuille et gagnent le liquide à une vitesse qui dépend de la température, de la viscosité du milieu et de la surface de contact. Entre une eau bouillante et un réfrigérateur, cette vitesse est divisée par cinq ou six — ce qui ne suffit pas à expliquer l'écart entre trois minutes et une heure. Le chaud fait autre chose en plus : il abîme les membranes de la feuille et libère d'un coup ce qu'elles retenaient. Le froid, lui, n'a que le temps pour y parvenir.\n\nUn yaourt n'est pas de l'eau. C'est un gel de caséines où les molécules se faufilent lentement, doublé d'une fraction grasse qui capte au passage les composés liposolubles. Dans la menthe verte, celle des marchés et des recettes de ce carnet, ce sont surtout la carvone et le limonène — le menthol, lui, appartient à la menthe poivrée. D'où l'heure demandée, quand une infusion chaude aurait pris trois minutes.\n\nLe froid a un avantage propre : il n'évapore rien et ne dégrade rien. Les terpènes les plus volatils, ceux qui s'en vont au premier bouillon, sont justement ceux qu'il préserve. En revanche aucun des chiffres de cette fiche ne sort d'une mesure : ni l'heure dans un yaourt, ni les vingt minutes dans un liquide fluide, ni le moment où l'amertume s'installe. Ce sont des ordres de grandeur de cuisine, à ajuster en goûtant.",
    certitude: "partiel",
    cas: [
      { q: "Pourquoi une heure pour une sauce yaourt-menthe ?",
        r: "Parce que le milieu est froid, épais et immobile : trois raisons de lenteur qui s'additionnent. À dix minutes on ne sent que le yaourt ; vers quarante minutes la menthe apparaît ; à une heure elle occupe toute la sauce." },
      { q: "Quand le froid vaut-il mieux que le chaud ?",
        r: "Chaque fois que l'arôme est fragile et volatil : menthe, basilic, aneth, zeste d'agrume, concombre. Le chaud reste supérieur pour ce qui est dur ou sec — safran, laurier, badiane, gousse de vanille — que le froid n'ouvrirait qu'en une nuit." },
      { q: "Peut-on accélérer une infusion à froid ?",
        r: "En augmentant la surface plutôt que la température : ciselez plus fin, froissez les feuilles, remuez une fois en cours de route. Doubler la dose d'herbe ne remplace pas le temps — on obtient un goût plus fort, pas un goût plus fondu." },
      { q: "Une infusion à froid peut-elle attendre trop ?",
        r: "Oui. Passé quelques heures, les feuilles laissées dedans continuent de céder leurs composés amers et commencent à brunir. Retirez l'herbe une fois le parfum installé : la sauce du matin pour le soir, pas celle de la veille." },
      { q: "Et l'infusion qui retire au lieu d'apporter ?",
        r: "Le mécanisme joue aussi à l'envers : l'oignon rouge trempé dix minutes dans l'eau glacée y perd ses composés soufrés piquants, qui migrent vers l'eau. C'est le liquide qu'on infuse, et le légume qu'on garde." }
    ],
    reperes: [
      "Herbe tendre dans un yaourt : 1 heure au réfrigérateur, 40 minutes au minimum.",
      "Dans un liquide clair et fluide : 20 à 30 minutes suffisent.",
      "Passé quelques heures, retirer les feuilles : elles brunissent et donnent de l'amertume. Le seuil exact n'existe pas, il se goûte.",
      "Menthe ou concombre dans une boisson : à boire dans la demi-heure."
    ],
    piege: "Préparer la sauce au moment de servir en comptant sur la quantité pour compenser. On obtient un yaourt parsemé de menthe, où l'on mâche l'herbe sans jamais la retrouver dans la sauce.",
    source: ""
  },
  {
    id: "froid-raffermit",
    t: "Le froid qui raffermit",
    emoji: "❄️",
    famille: "Froid, gras & sécurité",
    accroche: "Passer une pâte, un fromage frais ou un filet de poisson au froid avant de le couper ou de le frire, pour qu'il tienne au lieu de s'écraser.",
    pourquoi: "Le froid n'agit pas sur la même chose selon ce qu'on refroidit. Sur le gras d'abord : la matière grasse du beurre est un mélange de centaines de triglycérides dont les points de fusion s'échelonnent d'environ −40 à 40 °C. Le beurre n'a donc pas une température de fonte mais une plage, et c'est la fraction restée solide qui fait sa fermeté. Sorti du froid il se travaille comme une pâte ; passé une vingtaine de degrés, il file.\n\nSur l'eau ensuite. Refroidir une chair, c'est épaissir ses liquides et raidir les graisses qu'elle contient. La glace, elle, n'arrive pas à zéro : les sels et les protéines dissous abaissent le point de congélation, et un filet de saumon ne commence à cristalliser que vers −1 à −1,5 °C. Un quart d'heure au congélateur ne gèle donc pas la chair ; il raidit une pellicule de surface, et c'est elle qui guide la lame. Le tissu ne se dérobe plus devant le tranchant, et les lamelles sortent régulières.\n\nDeux conséquences en cuisine. Une matière ferme se découpe net. Et une matière froide met plus longtemps à fondre : un fromage glacé tient le temps que la croûte du beignet se forme autour de lui.",
    certitude: "etabli",
    cas: [
      { q: "Une pâte feuilletée avant la découpe",
        r: "Dix minutes au congélateur suffisent. Le beurre des feuillets redevient cassant, la lame le tranche au lieu de l'étaler, et les couches restent distinctes — ce sont elles qui feront gonfler la pâte à la cuisson." },
      { q: "Un fromage frais destiné à la friture",
        r: "Trente minutes au réfrigérateur, ou dix au congélateur. L'enjeu n'est pas la découpe mais le délai : le cœur froid doit tenir les deux minutes que met la pâte à prendre, sinon il coule dans le bain et perce la croûte." },
      { q: "Un filet de poisson avant le tranchage",
        r: "Un quart d'heure au congélateur pour un filet de 500 g. La surface doit être raide au toucher et le cœur encore souple : on cherche un raffermissement, pas un bloc, qu'aucun couteau ne traverserait proprement." },
      { q: "Une crème liquide à fouetter",
        r: "Elle monte mal au-dessus d'une dizaine de degrés, et se travaille le mieux entre 2 et 5 °C, bol et fouet refroidis avec. Ce sont les globules gras encore partiellement cristallisés qui s'agrègent autour des bulles d'air et bâtissent le réseau qui tient la mousse — on parle de coalescence partielle. Trop tiède, la matière grasse est liquide, elle ne forme plus rien, et la crème gonfle un instant puis retombe." },
      { q: "Congélateur ou réfrigérateur",
        r: "Le congélateur pour un coup de froid court et de surface, le réfrigérateur quand on a le temps devant soi. Au congélateur, surveillez : au-delà d'une demi-heure, la surface d'un filet fin prend en glace et la lame dérape au lieu d'entrer. On cherche une croûte raide sur un cœur souple, jamais un bloc." }
    ],
    reperes: [
      "Pâte feuilletée : 10 min au congélateur avant la découpe, pas davantage.",
      "Filet de poisson à trancher : 15 min au congélateur pour 500 g.",
      "Fromage frais à frire : 30 min au réfrigérateur, ou 10 min au congélateur.",
      "Crème à fouetter : sous 10 °C, idéalement entre 2 et 5 °C, récipient et fouet refroidis avec."
    ],
    piege: "Confondre raffermir et prendre en glace au moment de trancher. Un filet oublié plusieurs heures au congélateur ressort en bloc : la lame dérape, et il faut le laisser revenir avant de le travailler. Cela ne condamne pas la congélation en elle-même — celle des sept jours, faite avant la salaison et suivie d'un dégel lent au réfrigérateur, ne gêne en rien la découpe. Ce qu'on évite ici, c'est le coup de froid d'avant le couteau prolongé au-delà de son objet.",
    source: "Harold McGee, On Food and Cooking — sur la plage de fusion des matières grasses laitières."
  },
  {
    id: "poisson-cru",
    t: "Le poisson cru et les parasites",
    emoji: "🐟",
    famille: "Froid, gras & sécurité",
    accroche: "Congeler un poisson avant de le préparer cru, mariné ou salé : c'est le seul geste domestique qui mette les larves de parasites hors d'état.",
    pourquoi: "Les poissons de mer hébergent couramment des larves de nématodes du genre Anisakis, logées dans les viscères et, après la mort du poisson, dans la chair voisine. Ingérées vivantes, elles ne s'installent pas durablement chez l'homme mais peuvent perforer la paroi digestive : c'est l'anisakidose, douloureuse. Il faut y ajouter un risque distinct : leurs allergènes ne disparaissent ni au froid ni à la chaleur, et une personne sensibilisée peut réagir à un poisson traité dans les règles.\n\nElles ne résistent ni à la chaleur ni au grand froid. Une cuisson au-delà de 60 °C à cœur les tue ; la congélation aussi, à condition que le froid atteigne le centre du morceau et s'y maintienne. D'où les durées réglementaires : 24 heures à −20 °C ou 15 heures à −35 °C, mesurées à cœur. Les sept jours conseillés au particulier ne sont pas, eux, une durée létale mesurée : c'est une marge de sécurité, déduite des pratiques professionnelles et des règles nord-américaines, élargie pour couvrir des appareils dont on ignore la température réelle et la vitesse de descente. Le chiffre est plus long qu'ailleurs pour cette raison, et non parce que les larves y résisteraient mieux.\n\nLe sel, le vinaigre, le citron et le fumage à froid ne les tuent pas aux doses de cuisine. Les seuls procédés validés associent le sel et l'acide, sur des semaines et au froid : sur le hareng mariné, environ 9 % de sel dans la phase aqueuse avec 2,6 % d'acide acétique demandent cinq semaines, et il suffit de descendre le sel vers 4 % pour que des larves survivent plus de quatre mois. Un gravlax, un ceviche, des anchois au vinaigre restent donc du poisson cru.",
    certitude: "etabli",
    cas: [
      { q: "Combien de temps dans un congélateur domestique",
        r: "Sept jours. Les 24 heures à −20 °C du règlement européen supposent un froid industriel qui descend vite et ne remonte pas ; un appareil ménager tourne autour de −18 °C, oscille à chaque ouverture de porte et gèle lentement. L'Anses retient donc sept jours pour un congélateur domestique — nettement plus que les deux ou trois jours qu'on lit souvent, et c'est cette durée-là qu'il faut suivre." },
      { q: "Quels poissons sont concernés",
        r: "Les poissons de mer sauvages surtout : saumon, hareng, maquereau, anchois, merlu, lieu. Le saumon d'élevage nourri en aliments secs et suivi présente un risque très faible, et la réglementation européenne prévoit d'ailleurs des exemptions pour ces élevages." },
      { q: "Le sel ou le citron suffisent-ils",
        r: "Non. Les marinades qui viennent à bout des larves associent le sel et l'acide pendant plusieurs semaines au froid — de l'ordre de 9 % de sel dans la phase aqueuse et 2,6 % d'acide acétique pendant cinq semaines, sur le hareng. Un gravlax de vingt-quatre heures, un ceviche, des anchois au vinaigre restent très en deçà. Ils demandent une congélation préalable." },
      { q: "Ce que la congélation coûte à la texture",
        r: "Un peu d'eau. Les cristaux de glace percent les membranes et la chair en rend davantage au dégel. Décongelez lentement au réfrigérateur, jamais sur le plan de travail : c'est ce qui limite la perte et évite la reprise bactérienne." },
      { q: "Ce que la congélation ne règle pas",
        r: "Les bactéries, et l'allergie. Le froid endort les bactéries sans les tuer, et Listeria monocytogenes se multiplie encore jusqu'à quelques dixièmes de degré sous zéro. Quant aux allergènes d'Anisakis, ils traversent la congélation comme la cuisson : une personne sensibilisée peut réagir à un poisson pourtant traité dans les règles. Un poisson cru reste fragile — chaîne du froid tenue, planche et couteau propres, consommation rapide." }
    ],
    reperes: [
      "Congélateur domestique : 7 jours à −18 °C ou moins, recommandation de l'Anses.",
      "Référence réglementaire : 24 h à −20 °C, ou 15 h à −35 °C, mesurées à cœur.",
      "Cuisson : 60 °C à cœur pendant une minute suffisent ; les guides sanitaires retiennent souvent 63 °C par sécurité.",
      "Décongélation au réfrigérateur, jamais à température ambiante."
    ],
    piege: "Croire qu'un poisson très frais, acheté chez un bon poissonnier, dispense de congeler. La fraîcheur joue sur les bactéries et sur le goût, pas sur les larves déjà présentes dans la chair.",
    source: "Règlement (CE) 853/2004, annexe III ; recommandations de l'Anses sur les Anisakidés."
  }
];

/* Les familles, dans l'ordre où l'onglet les présente. */
const FAMILLES = [
  "Chaleur & coloration",
  "Arômes & épices",
  "Textures & liaisons",
  "Sel, acide & goût",
  "Végétal & couleur",
  "Froid, gras & sécurité"
];

/* Comme RECIPE_RENAMES : un identifiant part dans les liens partagés, donc il ne
   disparaît jamais. Ne jamais retirer une entrée. */
const FONDAMENTAL_RENAMES = {};
