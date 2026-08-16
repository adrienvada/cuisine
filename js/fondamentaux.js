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
    id: "emulsion",
    t: "L'émulsion",
    emoji: "🌀",
    famille: "Textures & liaisons",
    accroche: "Faire tenir ensemble deux liquides qui se repoussent, pour obtenir une sauce nappante plutôt qu'une flaque d'huile sur une flaque de vinaigre.",
    pourquoi: "Une émulsion est une dispersion : de minuscules gouttelettes d'un liquide en suspension dans un autre avec lequel il ne se mélange pas. L'huile et l'eau se repoussent, et laissées à elles-mêmes les gouttelettes se retrouvent et se rassemblent — c'est la vinaigrette qui retombe en deux couches.\n\nIl faut donc deux choses. De l'énergie, d'abord, pour déchirer l'huile en gouttelettes : le fouet, le mixeur, le bocal qu'on secoue. Un émulsifiant, ensuite, pour les empêcher de se rejoindre. Une molécule d'émulsifiant a une extrémité qui aime l'eau et une autre qui aime le gras ; elle se plante à la surface de chaque gouttelette et forme une pellicule que les gouttelettes voisines ne traversent pas.\n\nLa moutarde apporte des mucilages, le jaune d'œuf de la lécithine, le tahini les protéines et les fibres du sésame. Sans eux, l'émulsion tient quelques minutes par la seule viscosité du mélange, puis se défait.",
    certitude: "etabli",
    cas: [
      { q: "Une vinaigrette", r: "La moutarde est l'émulsifiant, et elle travaille mieux dans le vinaigre que dans l'huile : délayez-la d'abord avec l'acide et le sel, puis versez l'huile en filet en fouettant. Le sel se dissout dans l'acide, jamais dans l'huile." },
      { q: "Une sauce au yaourt ou au tahini", r: "Le tahini se comporte à l'envers de l'intuition : ajouté à l'eau, il épaissit brutalement avant de se détendre. Versez l'eau très froide petit à petit et continuez de fouetter au-delà du moment où le mélange paraît perdu." },
      { q: "Un beurre monté", r: "Hors du feu, toujours. Le beurre est déjà une émulsion, et la chaleur la casse : au-delà d'une soixantaine de degrés, elle rend son gras et la sauce devient grasse au lieu d'être onctueuse." },
      { q: "Une émulsion qui a tranché", r: "Repartez d'une base neuve — une cuillerée de moutarde, un jaune, un peu d'eau — et versez le mélange tranché dedans en filet, comme s'il était l'huile. On ne rattrape pas une émulsion en fouettant plus fort." }
    ],
    reperes: [
      "L'huile en filet, jamais d'un coup : c'est le débit qui fait la finesse des gouttelettes.",
      "Une vinaigrette classique tient autour de trois parts d'huile pour une part d'acide.",
      "Un beurre monté se travaille entre 50 et 60 °C ; au-delà, il tranche."
    ],
    piege: "Verser l'huile trop vite. Les gouttelettes sont alors trop grosses pour que l'émulsifiant les couvre, et la sauce se sépare dans l'assiette même si elle paraissait liée dans le bol.",
    source: ""
  },
  {
    id: "epices-gras",
    t: "Les épices dans le gras",
    emoji: "🌶️",
    famille: "Arômes & épices",
    accroche: "Faire chauffer les épices dans un corps gras avant le reste du plat, pour que leur parfum se répande partout au lieu de rester enfermé.",
    pourquoi: "La plupart des molécules qui font l'odeur d'une épice sont liposolubles : elles se dissolvent dans le gras et très mal dans l'eau. Jetées dans un plat déjà mouillé, elles restent en grande partie prisonnières de la poudre.\n\nLa chaleur du corps gras les extrait et les met en solution. Le gras devient alors le véhicule qui les porte dans l'ensemble du plat — c'est le tempérage de la cuisine indienne, le tadka.\n\nMais la même chaleur les détruit. Les composés aromatiques sont volatils, et au-delà d'un certain point ils partent en fumée en laissant derrière eux des produits de pyrolyse amers. La fenêtre est étroite, et sa largeur dépend entièrement de la nature de l'épice.",
    certitude: "etabli",
    cas: [
      { q: "Épices entières", r: "Cumin, coriandre, moutarde, fenouil, cardamome. Elles encaissent le mieux : leurs huiles sont protégées par l'enveloppe de la graine. Comptez trente à soixante secondes sur feu moyen, jusqu'à ce qu'elles chantent ou éclatent." },
      { q: "Épices moulues résistantes", r: "Cumin moulu, coriandre moulue, garam masala. Quinze à trente secondes, pas davantage. On les ajoute en général après les aromates, juste avant le liquide qui viendra arrêter la cuisson." },
      { q: "Épices moulues fragiles", r: "Paprika, piment en poudre, curcuma. Elles brûlent en quelques secondes parce que leurs pigments sont eux-mêmes thermosensibles. Jetez-les hors du feu, dans le gras encore chaud, ou juste avant le liquide." },
      { q: "Le safran", r: "Il fait exception : ses pigments et son arôme sont hydrosolubles. On l'infuse dans un liquide chaud — eau, lait, bouillon — pendant une dizaine de minutes, jamais dans l'huile." }
    ],
    reperes: [
      "Feu moyen, jamais vif : c'est le temps qui extrait, pas la violence.",
      "Une épice qui fume est perdue : l'amertume ne se rattrape pas.",
      "Les graines entières se réveillent mieux si on les torréfie à sec avant de les moudre."
    ],
    piege: "Traiter le paprika comme le cumin. Il noircit en trois secondes dans une poêle vive et rend tout le plat amer, sans qu'on comprenne d'où vient le goût.",
    source: ""
  },
  {
    id: "maillard",
    t: "La réaction de Maillard",
    emoji: "🔥",
    famille: "Chaleur & coloration",
    accroche: "La couleur brune et l'odeur de grillé ne sont pas un effet secondaire de la cuisson : ce sont des centaines d'arômes fabriqués sur place.",
    pourquoi: "La réaction de Maillard associe un sucre réducteur et un acide aminé. De cette rencontre naît une cascade de réactions qui produit des centaines de composés nouveaux — c'est elle qui distingue le pain de la pâte, le rôti du bouilli, le café torréfié de la cerise verte.\n\nElle demande de la chaleur et peu d'eau. Tant que la surface d'un aliment reste mouillée, sa température ne dépasse pas cent degrés et la réaction n'avance qu'à peine ; il faut sécher cette surface pour la laisser monter.\n\nOn la confond souvent avec la caramélisation, qui est une autre réaction : celle-là ne concerne que les sucres, sans acide aminé, et démarre plus haut. Un plat peut faire les deux à la fois.",
    certitude: "etabli",
    cas: [
      { q: "À quelle température", r: "La réaction s'accélère nettement à partir de 140 à 150 °C. En dessous elle existe, mais si lentement qu'un aliment cuira avant d'avoir bruni — c'est pourquoi rien ne dore dans l'eau bouillante." },
      { q: "Pourquoi le sucré brunit plus vite", r: "Parce que le sucre réducteur est l'un des deux réactifs. Un oignon, une carotte, un lait sucré brunissent plus tôt et plus fort qu'un aliment pauvre en sucres." },
      { q: "Le rôle du pH", r: "Le milieu alcalin accélère la réaction : c'est pourquoi les bretzels passent dans la soude et pourquoi une pointe de bicarbonate fait dorer des oignons bien plus vite. Le milieu acide la ralentit." },
      { q: "Maillard ou caramélisation", r: "La caramélisation ne met en jeu que les sucres et démarre plus haut, autour de 160 °C pour le saccharose. Une croûte de pain fait surtout du Maillard ; un caramel de sucre blanc, uniquement de la caramélisation." }
    ],
    reperes: [
      "Surface sèche, sinon rien : épongez avant de saisir.",
      "140 °C est le seuil pratique ; l'eau bouillante plafonne à 100 °C.",
      "Une pincée de bicarbonate accélère spectaculairement le brunissement des oignons."
    ],
    piege: "Croire que saisir « emprisonne les jus ». C'est faux et démenti depuis longtemps : saisir fabrique des arômes, rien de plus. Une viande saisie perd autant d'eau qu'une autre.",
    source: ""
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
