# Carnet de cuisine 🌿

Le carnet de recettes d'Evadri — un site pensé pour smartphone : recettes illustrées, mode cuisine pas-à-pas et liste de courses automatique.

**Site : https://adrienvada.fr/cuisine/**

## Fonctionnalités

- **Recettes** — grille de cartes avec recherche instantanée (par nom, ingrédient, tag) et filtres par catégorie.
- **Portions ajustables** — les quantités se recalculent automatiquement.
- **Au menu** — les recettes retenues pour le prochain repas, réunies dans leur onglet : photo, portions réglables, accès direct à la recette et au mode cuisine. C'est le menu qui alimente la liste de courses, pas l'inverse.
- **Plusieurs versions d'une même recette** — deux cakes au même repas, l'un aux olives et à la feta, l'autre aux lardons et au comté : chacun est une entrée distincte du menu, avec sa garniture, ses suppléments, ses portions, sa séance de cuisine et ses minuteurs. Les courses additionnent les deux et mutualisent ce qu'ils partagent (la farine une seule fois, les garnitures séparément).
- **Mode cuisine** — étapes plein écran, gros texte lisible les mains dans la farine, l'écran reste allumé. Les minuteurs (sonnerie + vibration) continuent de tourner où qu'on aille dans le carnet : leurs bulles restent affichées en bas et un appui ramène à l'étape concernée, la croix les arrête.
- **Reprise** — l'étape en cours est retenue : en rouvrant la recette, le bouton propose « Reprendre — étape 3 / 5 » (ou « Repartir du début »). Si un minuteur de cette recette tourne, le mode cuisine se rouvre directement. Oubliée à la fin de la recette, ou d'elle-même au bout de 12 h.
- **Liste de courses** — calculée à partir du menu : les ingrédients fusionnent par rayon, dans l'ordre d'un parcours de supermarché (fruits & légumes, crèmerie, épicerie…), quantités additionnées. Le fond de placard (sel, huiles, épices…) est présenté à part, « à vérifier ». Cochable au magasin, partageable par message, articles libres en plus.
- **Savoirs** — les *fondamentaux* : les mécanismes qui reviennent d'une recette à l'autre (l'émulsion, Maillard, l'osmose du sel), expliqués une fois pour toutes, et illustrés de schémas, courbes et échelles (voir « Figures des savoirs »). Une pastille dorée sous l'astuce d'une étape les ouvre sans quitter la recette, même en mode cuisine. L'onglet les réunit, la recherche les fouille, et chacun se partage par lien.
- **Partage** — depuis la vignette, la fiche recette ou le mode cuisine : un résumé (temps, ingrédients aux portions affichées) et le lien vers la recette illustrée, envoyés via la feuille de partage du téléphone. « Partager le repas » envoie le menu entier d'un coup. Un fondamental se partage de la même façon.
- **PWA** — installable sur l'écran d'accueil (Safari : Partager → « Sur l'écran d'accueil »), fonctionne hors ligne.

## Ajouter une recette

Les recettes vivent dans [`js/recipes.js`](js/recipes.js) : un objet par recette (titre, temps, ingrédients avec rayon de courses, étapes avec astuces et minuteurs).

Champ facultatif `discovered` — où la recette a été découverte, affiché en pastille dorée sur la fiche et repris dans le partage. La phrase commence par sa préposition, elle complète « Découverte … » :

```js
discovered: "au Murmure du Son, festival à Eu",   // → « Découverte au Murmure du Son, festival à Eu »
discovered: "à l'hôtel Park Plaza Victoria, à Amsterdam",
```

### Annoter les étapes : `ing`, `four`, `moule`

Trois champs alimentent le mode cuisine, le préchauffage et l'adaptation au moule (le détail est aussi en tête de `js/recipes.js`) :

- **`ing`** — sur chaque étape de `steps` (sauf l'emplacement `{ choice: … }`) et sur le `step` de chaque option de `choices` : les ingrédients que l'étape met en œuvre, désignés par leur `cid` (ou, faute de `cid`, par leur `name` exact). Un ingrédient figure à l'étape où on le mesure, l'ajoute, le verse, le parsème — pas à celle où il n'est qu'évoqué — et aux deux étapes s'il sert en deux fois. L'eau, le sel ou l'huile du moule comptent quand le texte les fait utiliser. `ing: []` signifie « vérifié, rien à citer » ; sans le champ, l'étape n'est pas annotée. Les suppléments n'en ont pas besoin : leurs ingrédients vont à l'étape qu'ils enrichissent.
- **`four`** — sur l'étape où le plat entre au four (ou y précuit) : la température en °C. Jamais pour la friture, la poêle ou un réchauffage facultatif. Si la température baisse en cours de cuisson, c'est la première ; le texte dit la suite.
- **`moule`** — au niveau de la recette, seulement quand le texte donne la taille du moule ou du plat : `{ forme: "rond", diametre: 26 }`, `{ forme: "rectangle", largeur: 20, longueur: 30 }` ou `{ forme: "cake", longueur: 26 }`. Aucune taille inventée : sans indication dans le texte, pas de champ.

Un quatrième champ, **`step.adds`**, porte le temps des options de choix. Sur le `step` d'une option de `choices` (ou d'un supplément) qui a un `timer`, il donne le poste où ce temps s'ajoute, `"prep"`, `"repos"` ou `"cuisson"`. Le `times` d'une recette décrit sa version par défaut (première option de chaque choix) ; une option plus longue (pâte maison : `timer: 30, adds: "repos"`, chèvre gratiné : `timer: 6, adds: "cuisson"`) allonge ce poste, et la vignette, la fiche, la carte du menu et le rétroplanning annoncent tous la même durée. Une option sans `adds` a son minuteur déjà compris dans `times`. Le vérificateur refuse une option dont les minuteurs dépassent le temps qu'annonce la carte.

Le tag « végétarien » est présent si et seulement si la version par défaut (première option de chaque choix, aucun supplément) ne contient ni viande ni poisson. Le vérificateur contrôle les références de `ing`, la plage de `four` (50 à 300 °C, sur une étape qui parle de four) et la forme de `moule` ; il signale seulement, sans erreur, les étapes sans `ing`.

### Ingrédients et liste de courses

Chaque ingrédient porte un `rayon` et un `cid` (identifiant commun qui fusionne les quantités d'une recette à l'autre). Cinq règles, que le vérificateur contrôle pour les trois premières :

- **Le `rayon` est l'un de ceux de `RAYONS`** (fin de `js/recipes.js`), listés dans l'ordre d'un parcours de supermarché : Fruits & légumes, Herbes fraîches, Boulangerie, Boucherie & charcuterie, Poissonnerie & saumon fumé, Crèmerie & œufs, Fromages, Épicerie salée, Conserves & bocaux, Huiles, vinaigres & condiments, Fruits secs & graines, Pâtisserie & épicerie sucrée, Épices & assaisonnements, Boissons, Surgelés. « Autre » ferme la marche : les articles ajoutés à la main y vont, aucun ingrédient de recette n'y a sa place.
- **Une seule unité de courses par `cid`**, dans toutes les recettes, options et suppléments compris : la liste n'additionne que des unités identiques et jette le reste. Quand deux recettes expriment le même article autrement (le miel en c. à c. ici, en c. à s. là), la recette garde son unité et le côté courses s'harmonise : `shop: { qty: 1, unit: "pot" }`.
- **Les unités de compte sont au singulier** (« gousse », « bouquet », « tranche », « brin ») : le pluriel est l'affaire de l'affichage (`PLURALS` dans `js/core/format.js`).
- **Un `cid` est un produit, et un produit n'a qu'un libellé de courses** (`shop.label`, ou le `name` à défaut). La liste fusionne par `cid` et n'affiche qu'un libellé : si deux recettes se contredisaient, elle afficherait celui de la première du menu, et l'autre y lirait une exigence qui n'est pas la sienne. Même produit : un libellé qui convient à toutes (« Citron jaune »), et ce qui est propre à une recette dans `shop.note` (« non traité, pour le zeste ») ou dans son `name`/`note` côté recette. Produits différents : deux `cid`, donc deux lignes à acheter — la farine de pain (`farine-pain`, T65) n'est pas la farine de blé des gâteaux et des cookies (`farine`, T55), le beurre doux n'est pas le beurre salé, la cassonade n'est pas le sucre blanc.
- **Un pot, un sachet ou un flacon dont une fois suffit** s'écrit `shop: { label, qty: null, qtyText: "1 pot" }` : le texte est dédoublonné, deux salades à la moutarde n'achètent qu'un pot. `shop.qty` chiffré, lui, suit les portions et s'additionne (les boîtes de pois chiches). Une fraction d'oignon ou de bouquet n'a pas de `shop` : les fractions de toutes les recettes s'additionnent, puis la liste arrondit à l'entier supérieur.
- **`entier: true`** sur ce qui se compte à la pièce et ne se coupe pas — œufs (jaunes compris), cornichons, pitas, feuille de laurier, clou de girofle. Mis à l'échelle, sa quantité est arrondie à l'entier le plus proche, la moitié vers le haut, jamais à zéro : « 1½ œuf » n'existe pas. Les tranches et les brins le sont d'office ; un oignon, un citron ou une gousse se coupent et gardent leurs quarts. Dans un texte, `{2-4 œuf}` suit la même règle. Les grammes et les millilitres sont entiers, sur la fiche comme sur la liste.

**Le fond de placard** vit dans [`js/placard.js`](js/placard.js) : la liste des `cid` qu'on a presque toujours chez soi (sel, poivre, huiles, vinaigres, sucre, farine, épices sèches). La liste de courses les présente à part. Le critère est écrit en tête du fichier : sec ou de longue conservation, servi dans plusieurs recettes sans faire le plat. Un nouveau `cid` de ce genre s'y ajoute ; le vérificateur refuse un `cid` qui n'existe dans aucune recette.

Le plus simple : **donner la recette à Claude** (photo, texte, lien…) et lui demander de l'ajouter au carnet — il la structurera et la publiera.

**Après toute modification des recettes, lancer le vérificateur :**

```bash
node tools/verifier-recettes.mjs
```

Il attrape les erreurs qui ne font pas planter l'application mais lui font afficher quelque chose de faux : un supplément accroché à la mauvaise étape (insérer une étape décale tous les index qui suivent), une durée annoncée sans minuteur ou l'inverse, un rayon inconnu, un `cid` manquant, ou deux unités de courses différentes pour un même article, qui cassent la liste de courses.

**Renommer l'identifiant d'une recette** demande une entrée dans `RECIPE_RENAMES` (fin de `js/recipes.js`), sans quoi on perd ce qui y est accroché : les données du navigateur (menu, portions, verdicts, compteurs, minuteurs en cours) et les liens de partage déjà envoyés. Avec l'entrée, tout suit automatiquement et une page d'aperçu reste à l'ancienne adresse. Ne jamais retirer une entrée — un lien peut resurgir des années plus tard. Penser aussi à renommer `img/<id>.jpg` et la clé dans `js/illos.js`.

## Référentiels d'ingrédients

Trois petits fichiers, indexés par le `cid` des ingrédients de `js/recipes.js`, alimentent les allergènes, le filtre végétarien, les recettes de saison et les substitutions :

- [`js/allergenes.js`](js/allergenes.js) — les 14 allergènes réglementaires (`ALLERGENES_LISTE`), ceux de chaque `cid` (`ALLERGENES`) et les `cid` qui ne sont pas végétariens (`NON_VEGETARIEN`). Pour un produit du commerce dont la composition varie, on met l'allergène probable et on le dit en commentaire : l'étiquette fait foi.
- [`js/saisons.js`](js/saisons.js) — `SAISONS` : les mois (1 à 12) où un fruit, un légume ou une herbe fraîche est de saison en France. Un `cid` absent ne dépend pas de la saison.
- [`js/substitutions.js`](js/substitutions.js) — `SUBSTITUTIONS` : pour les ingrédients qu'on peut vraiment remplacer, le remplacement avec sa proportion (`par`) et ce que ça change au plat (`note`). Pas de substitution qui ne marche pas, pas d'accolades dans les textes.

**En ajoutant une recette**, passer ses nouveaux `cid` en revue : allergènes (et viande ou poisson dans `NON_VEGETARIEN`), saison s'il s'agit d'un produit frais, substitution si la question se pose vraiment. Une donnée absente vaut mieux qu'une donnée inventée. Le vérificateur contrôle que chaque clé est un `cid` existant, que les mois et les allergènes sont valides et que chaque substitution a son `par`.

## Astuces et fondamentaux — la procédure, à suivre à la lettre

Le carnet distingue **deux natures d'explication**, et les confondre le dégrade à chaque
recette ajoutée :

| | **Astuce du chef** | **Fondamental** |
|---|---|---|
| Où | `tip: { t, txt }` sur une étape, dans `js/recipes.js` | une entrée de `js/fondamentaux.js` |
| Portée | ce plat, et lui seul | toutes les recettes où le mécanisme joue |
| Contenu | le geste, dans le contexte du plat, avec sa voix | le mécanisme, ses cas, ses repères |
| Exemple | « la pulpe de vos trois doigts du milieu » | « la réaction de Maillard » |
| Rattachement | écrite sur l'étape | `fond: "maillard"` sur l'étape |

**Règle d'or : une astuce ne réexplique jamais un mécanisme que le catalogue tient déjà.**
Elle dit ce qu'on fait ici ; le fondamental dit pourquoi ça marche, partout.

### Avant d'écrire la moindre astuce — obligatoire

1. **Ouvrir `js/fondamentaux.js` et lire la liste des `id`.** Sans exception, avant d'écrire.
2. **Pour chaque étape de la recette, se demander : un fondamental existant s'applique-t-il ?**
   Si oui → poser `fond: "<id>"` sur l'étape. Ne pas réécrire le mécanisme dans l'astuce.
3. **Si le mécanisme n'est dans aucun fondamental, se demander s'il reviendra ailleurs.**
   - Il reviendra → **écrire un fondamental**, pas une astuce. Puis le rattacher.
   - Il ne vaut que pour ce plat → astuce, et c'est très bien.
4. **Chercher la redite.** Si une autre recette dit déjà la même chose dans une astuce, c'est le
   signe qu'il fallait un fondamental : le créer, y déplacer l'explication, et alléger les deux
   astuces qui restent locales.
5. **Faire tourner le vérificateur.** Il liste en fin de rapport les recettes sans aucun
   fondamental — ce sont les candidates au rattachement.

### Écrire une entrée de `js/fondamentaux.js`

La forme exacte est documentée en tête du fichier. Trois exigences qui ne se négocient pas :

- **`certitude` dit la vérité.** `etabli`, `partiel` ou `empirique`. L'application affiche cette
  mention. Un mécanisme inventé qui *sonne* juste coûte plus cher qu'un « on ne sait pas
  précisément pourquoi » — le carnet se lit pendant vingt ans. Dans le doute, baisser d'un cran.
  La cuisine est pleine d'explications fausses et séduisantes : saisir n'« emprisonne » aucun jus,
  l'acide ne « réveille » aucune molécule endormie, le sel ne durcit pas la peau des légumineuses.
- **Les `cas` doivent discriminer.** Quatre cas qui disent la même chose ne servent à rien. Les
  épices selon leur nature, l'émulsifiant selon le liquide : c'est là qu'est la valeur.
- **Pas d'accolades dans les textes.** Elles sont réservées aux quantités mises à l'échelle et
  seraient interprétées. Le vérificateur refuse.

`fond` accepte une chaîne ou un tableau : `fond: "emulsion"` ou `fond: ["emulsion", "maillard"]`.
Il se pose sur une étape de `steps`, sur le `step` d'une option de `choices` (le mécanisme vaut
alors pour toutes les options), et sur le `step` d'un supplément.

**Renommer un fondamental** suit exactement la règle des recettes : une entrée dans
`FONDAMENTAL_RENAMES`, jamais retirée — son identifiant est parti dans des liens partagés.

## Figures des savoirs

Chaque fondamental peut s'illustrer de **schémas, courbes, échelles et étapes** : de quoi *voir* le mécanisme que le texte explique. Les données vivent dans [`js/figures.js`](js/figures.js) (`FIGURES["maillard"] = [ … ]`, une section par famille entre des repères `/* ===== Famille ===== */`, pour que plusieurs auteurs y travaillent sans conflit), le dessin dans [`js/ui/figures.js`](js/ui/figures.js) (des fonctions pures : une figure entre, une chaîne SVG sort), la palette dans [`css/figures.css`](css/figures.css). Le fichier de données est chargé avec `fondamentaux.js` mais n'est qu'un bonus : s'il manque, les fiches s'affichent comme avant.

**Le format** (détaillé, avec un exemple copiable de chaque type, en tête de `js/figures.js`) : une figure a un `ou` (`tete` après l'accroche, `cas` après « Selon les cas », `reperes` dans « À retenir », `pourquoi` + `apres: n` dans « Pourquoi ça marche »), un `titre`, une `legende` qui dit quoi lire, un `alt` complet pour les lecteurs d'écran, et un `type` :

| `type` | pour | paramètres |
|---|---|---|
| `courbe` | une grandeur qui varie | `x`, `y` (`label`, `unite`, `min`, `max`, `graduations`, `extremites`), `series`, `zones` (bandes verticales), `zonesY` (bandes horizontales), `reperes` (`{ x }` ou `{ y, ancre }`), `notes`, `qualitative` |
| `echelle` | une règle graduée (température, pH, %…) | `min`, `max`, `unite`, `zones`, `marqueurs` (zones et marqueurs : `cote: "haut" \| "bas"`), `graduations`, `coupures: [{ de, a }]` (axe interrompu, signe //), `rangees: true` (zones qui se chevauchent sur des pistes parallèles) |
| `barres` | des quantités comparées | `barres: [{ label, valeur, texte, note, ton }]` ou une plage `{ label, de, a }` (segment à deux bornes), `unite`, `min`, `max` |
| `etapes` | un processus de 2 à 5 cases | `etapes: [{ libelle, desc, emoji, ton }]` |
| `svg` | un vrai schéma dessiné à la main | `vb` (viewBox, 320 de large), `corps` (le contenu SVG, avec ses symboles partagés) |
| `comparaison` | avant/après, bon/mauvais | `panneaux: [{ label, sous, ton, vb, corps }]` (2 ou 3), `fleche`, `colonnes: 1 \| 2 \| 3` |

**Guide pour dessiner une figure**

1. **Lire la fiche, puis choisir ce que le dessin apporte** : un ordre de grandeur sur une règle, une allure sur une courbe, un mécanisme en `svg`. Une figure qui répète le texte ne sert à rien.
2. **Ne rien inventer.** Tout chiffre dessiné vient du texte de la fiche. Quand on ne connaît que l'allure, la courbe est `qualitative: true` (axes sans graduations chiffrées) et la légende dit « allure qualitative » ; une illustration le dit aussi. Le vérificateur le contrôle.
3. **Aucune couleur dans les données** : des `ton` (`vert`, `or`, `terra`, `bleu`, `encre`, `doux`) pour les types calculés, des classes `fg-t-…` (traits), `fg-f-…` (aplats), `fg-txt-…` (textes) pour un SVG libre. Elles lisent les variables du thème : une figure est lisible en clair comme en sombre. Les flèches : `marker-end="url(#fg-fl-encre)"` à l'arrivée, `marker-start="url(#fg-fd-encre)"` au départ (une cote à double flèche) ; un `<path>` à plusieurs `M` ne porte qu'**une** pointe par bout, et un `<g class="fg-t-…">` propage son trait à ses enfants. Le noir de brûlé (sucs, croûte) est `fg-f-suie` : sombre dans les deux thèmes, liseré clair en sombre — `fg-f-encre` devient crème en sombre. Le sens des tons : `terra` = chaleur, coloration brune, amertume et danger ; `or-l` = chair crue, gras, sucres ; une nuance plus pâle ne veut pas dire « moins » si le texte ne le dit pas ; un pourcentage nomme toujours sa base (« dans la chair », « dans la phase aqueuse »).
3 bis. **Les symboles partagés** : une bibliothèque de petits dessins (poêle, casserole, flamme, vapeur, goutte, bulle, couteau, thermomètre ; cellule, grain de sel, cristal, bactérie, larve, œuf, feuille, émulsifiant, ions…) que le `corps` d'un SVG appelle par `<use href="#fg-sym-flamme" x="10" y="20" width="24" height="30"/>` (ou avec un `transform`) ; la classe de ton du `<use>` (`class="fg-sy-bleu"`) les recolore. Le cadre n'injecte que les `<symbol>` utilisés, avec des identifiants propres à la figure ; le vérificateur n'autorise `<use>` que pour un symbole qui existe. La liste complète est en tête de `js/figures.js` ; `node tools/planche-symboles.mjs [dossier]` en fait une planche (clair et sombre) à regarder.
4. **Largeur de conception : 320.** Textes de 11,5 minimum, marges de 8 à 10 sur les bords, un `<tspan>` par ligne dans un SVG libre ; les types calculés coupent et répartissent leurs étiquettes eux-mêmes.
5. **Regarder le résultat** : `node tools/capturer-savoir.mjs <id> [dossier]` sert l'appli, photographie `#/fondamental/<id>` à 360 px en clair et en sombre (page entière, puis chaque figure), et signale texte trop petit, texte coupé, chevauchements, bouton de zoom sans cible de 44 px ou posé sur le dessin, et (à part, `signalements`) un texte barré par un tracé de courbe ou par une ligne de repère. Ouvrir les PNG, corriger, recommencer. `--strict` : code de sortie 1 au moindre signalement.
6. **Vérifier** : `npm run verifier` (clés, types, titres, `alt`, `ou`, `apres`, aucune couleur en dur, balises SVG fermées, classes connues), `npm test`, puis `npm run sw`. Un appui sur une figure l'ouvre en grand (bouton dans la ligne du titre, à droite, jamais sur le dessin ; cible de 44 px ; Échap) : rien à écrire pour cela. Sur un écran plus étroit que la figure agrandie, elle défile, avec une ombre sur le bord droit et une ligne d'indication.

**Arrivée tardive.** `js/figures.js` n'attend que 1,2 s derrière les fondamentaux. S'il arrive après, la page (ou la feuille) déjà ouverte se complète d'elle-même : les figures sont *insérées* à leurs places (`completerFigures` dans `js/vues/savoirs.js`), sans rien redessiner, le défilement et le focus restent où ils sont. La recherche des Savoirs fouille aussi les titres et les légendes des figures, et son cache se refait quand elles arrivent.

**Le thermomètre du carnet** : une figure transversale, hors des fiches. Sous l'introduction de l'onglet Savoirs (`#/fondamentaux`), un encart replié (`<details>`, dessiné à la première ouverture) déroule une grande échelle verticale de −40 à 220 °C qui rassemble les températures-repères citées dans **toutes** les fiches : congélation anti-Anisakis, réfrigérateur, arrêt de croissance des salmonelles, pasteurisation de l'œuf, prise du blanc, Maillard, friture, pyrolyse… Chaque repère est un lien (focalisable) vers sa fiche, `#/fondamental/<id>`. L'encart se masque pendant une recherche.

- **Les données** : `const THERMOMETRE = [ { de, a?, label, fond, ton, ancre?, ouvert? } ]`, dans la section « Vue d'ensemble » de `js/figures.js` (le format y est documenté). `de` est la température, `a` le haut d'une plage, `fond` l'id de la fiche. Un chiffre n'y figure que s'il est dans le texte de cette fiche : un test relit chaque nombre ; un autre exige un repère pour toute fiche qui cite des °C. `npm run verifier` contrôle que chaque `fond` existe.
- **Une plage est un dégradé**, jamais un bord franc : les fiches répètent qu'il n'y a pas de seuil net. Un point (un plafond, un cap) est un disque sur l'axe. Chaque étiquette est précédée de l'**emoji de sa fiche** ; l'axe est un tube dont le **réservoir**, en bas, a la couleur froide ; les graduations sont légères (les bornes de chaque tronçon et quelques valeurs rondes) ; des repères de même température dans la **même fiche** se rangent sous un seul point.
- **L'échelle n'est pas linéaire, et le dit** : l'axe se rompt (//) là où plus de 12 °C séparent deux repères, et chaque tronçon a sa propre hauteur de degré (les repères serrés, 55 à 70 °C, ont la place qu'il leur faut ; les déserts, presque rien). La légende l'indique.
- **Accessibilité** : le SVG est un groupe de vrais liens `<a>`, du plus chaud au plus froid, chacun nommé « 55 à 85 °C : … Fiche : … » ; au clavier, un anneau de focus entoure l'étiquette. Replié, l'encart ne met aucun lien dans l'ordre de tabulation.
- **Le code** : `thermometreMise()` (mise en page pure : tronçons, rangées de plages, étiquettes sans chevauchement) et `thermometreHtml()` dans `js/ui/figures.js`, testées sous Node ; l'encart dans `js/vues/savoirs.js` ; le style dans `css/figures.css` (le dessin) et `css/savoirs.css` (l'encart). Tests : `tests/unit/figures.test.mjs` et `tests/e2e/thermometre.spec.js`. Sans `js/figures.js`, l'encart n'existe pas.

## Illustrations & photos

Chaque recette a une **illustration dessinée** (SVG « gouache ») définie dans [`js/illos.js`](js/illos.js) — clé = identifiant de la recette. Si une recette n'a pas d'illustration, son emoji prend le relais ; si elle a une **photo** (`image: "img/….jpg"`), la photo gagne.

**Une vraie photo du plat prime sur une image générée** : recadrer en 4:3 sur l'assiette, redimensionner en 800 px de large et enregistrer en JPEG qualité 80 (~70 Ko), sous `img/<id-recette>.jpg`. **Garder si possible un original plus grand** (1 600 px de large) sous `img/originaux/<id-recette>.jpg` : l'outil des vignettes (ci-dessous) le préfère à la photo de 800 px et en tire des vignettes plus nettes.

**Après avoir posé ou remplacé `img/<id>.jpg`, lancer `npm run vignettes`**, puis `npm run sw`, et committer `img/v/`, `img/c/`, `img/h/` et `sw.js` :

```bash
npm run vignettes   # img/v/<id>.webp, img/c/<id>.webp, img/h/<id>.webp
npm run sw          # sw.js : la liste et la version du cache
```

Chaque vignette n'a plus à télécharger la photo de 800 px (70 à 160 Ko) pour n'en montrer que le tiers central : l'outil ([`tools/generer-vignettes.mjs`](tools/generer-vignettes.mjs), qui utilise `sharp`, donc un `npm install` d'abord) fait le recadrage une fois pour toutes, en WebP qualité 78, à 2× la taille d'affichage (ou à la résolution de la source si elle est moindre) : `img/v/` pour la grille d'accueil (~12 Ko), `img/c/` pour la carte du menu (~9 Ko), `img/h/` pour le héro de la fiche (photo entière, ~60 Ko). `visuel()` ([`js/ui/visuel.js`](js/ui/visuel.js)) choisit la bonne image et retombe sur le JPEG, zoomé par le CSS comme avant, si une variante manque. La CI échoue (`npm run vignettes -- --verifier`) si une photo n'a pas ses variantes.

**Le cadrage se décide sur la bande centrale — et les vignettes sont volontairement très serrées** : on doit y voir l'aliment de près, pas forcément le bol ou l'assiette qui le porte.

| | Boîte | Ce qui reste visible d'une image 4:3 |
|---|---|---|
| Vignette de la grille | 168 × 110 px | 33 % de la largeur, **29 % de la hauteur** (recadrage de `img/v/`, qui reproduit un `cover` agrandi ×3) |
| Carte « Au menu » | 88 × 88 px | **25 % de la largeur**, 33 % de la hauteur (`img/c/`, même règle) |
| Héro de la fiche | 352 × 240 px (280 px dès 480 px de large) | toute la largeur, 64 % de la hauteur (`img/h/` : la photo entière, contexte plus généreux) |

Ces boîtes sont des constantes de `tools/generer-vignettes.mjs` (`GENRES`) : si le CSS des vignettes change, les changer là aussi et relancer l'outil.

Autrement dit, pour que le plat remplisse les deux vignettes plutôt que de laisser voir de la table ou du bord d'assiette : **le sujet doit occuper entre 38 % et 62 % de la largeur de l'image, et entre 35 % et 65 % de sa hauteur**, centré. C'est bien plus serré que ce qu'il faut pour l'héro (qui tolère 18–82 % de hauteur) : caler le cadrage sur les vignettes couvre les deux cas. Recadrer en centrant sur le plat — voire sur un détail du plat — et non sur la composition, vaut mieux que de garder un joli décor invisible.

À défaut, **générer la photo** avec Gemini (« nano banana ») — méthode gratuite via l'interface web, sans clé API (l'API `generativelanguage.googleapis.com` facture les images même avec un abonnement Google AI, contrairement au chat web) :

1. Ouvrir [gemini.google.com/app](https://gemini.google.com/app) dans Chrome (connecté au compte d'Adrien), nouvelle discussion.
2. Envoyer le prompt (remplacer `{titre}` et `{sous-titre}`) :
   > Génère une image : Photographie culinaire professionnelle de style éditorial, pour un livre de cuisine méditerranéen. Lumière naturelle latérale douce, ombres délicates, tons chauds. Décor : table en bois patiné ou nappe en lin, vaisselle artisanale, quelques herbes fraîches autour. Cadrage en plongée légère (3/4), mise au point sur le plat, arrière-plan légèrement flou. Format 4:3. Aucun texte, aucune main, aucune personne dans l'image. Le plat : {titre}. {sous-titre}.
3. Cliquer l'icône **Copier l'image** (pas « Télécharger » — ça déclenche une boîte de dialogue Chrome que l'automatisation ne peut pas valider).
4. Récupérer l'image depuis le presse-papiers macOS et la compresser pour le web :
   ```bash
   osascript -e 'the clipboard as «class PNGf»' > /tmp/clip.txt
   python3 -c "
   import re
   content = open('/tmp/clip.txt').read().strip()
   hexdata = re.search(r'«data PNGf([0-9A-Fa-f]+)»', content).group(1)
   open('img/ID-RECETTE-raw.png', 'wb').write(bytes.fromhex(hexdata))
   "
   sips -Z 800 -s format jpeg -s formatOptions 78 img/ID-RECETTE-raw.png --out img/ID-RECETTE.jpg
   # 800 px suffit : les photos s'affichent en vignettes (~190 px) et en héro (~640 px max)
   rm img/ID-RECETTE-raw.png /tmp/clip.txt
   ```
5. Ajouter `image: "img/ID-RECETTE.jpg",` juste après `id:` dans `js/recipes.js`.

`tools/generer-photos.mjs` existe aussi (variante par clé API `GEMINI_API_KEY`) mais nécessite la facturation activée sur le projet Google Cloud — à éviter tant que la méthode web gratuite fonctionne.

## Aperçus de partage

Le routage se fait par `#`, ce qui empêche une messagerie d'afficher un aperçu différent d'une page à l'autre. D'où les dossiers `r/` et `f/` : une petite page par recette et par fondamental, qui porte son titre en balises Open Graph puis renvoie vers l'application. Ce sont ces adresses (`…/cuisine/r/<id>.html` et `…/cuisine/f/<id>.html`) que le bouton « Partager » envoie.

**Après avoir ajouté une recette ou un fondamental, régénère ces pages :**

```bash
node tools/generer-pages-partage.mjs
```

Puis committe les dossiers `r/` et `f/`. Pour un autre domaine : `SITE_URL=https://exemple.fr/cuisine/ node tools/generer-pages-partage.mjs`.

## Service worker et hors ligne

L'appli s'ouvre depuis le cache, sans attendre le réseau ([`sw.js`](sw.js)) :

- les fichiers de l'appli (`CORE` : `index.html`, manifeste, `css/`, `js/` avec les données et les modules, `fonts/`, icônes, vignettes `img/v/` et `img/c/`) sont servis depuis le cache et renouvelés à l'installation d'une nouvelle version ;
- les héros WebP des fiches (`img/h/`, 1,3 Mo) ne bloquent pas l'installation : une fois l'appli affichée, la page demande au service worker de les ranger (message `heros`, liste `HEROS`) dans le cache d'exécution. Une fiche jamais ouverte s'affiche donc avec sa photo hors ligne, après une première visite laissée au repos quelques secondes (sauf si le navigateur demande d'économiser les données : rien n'est alors téléchargé en douce). Les JPEG entiers ne servent que de secours aux navigateurs sans WebP ; si ni l'un ni l'autre ne répond, `js/ui/visuel.js` montre l'illustration (ou l'emoji) plutôt qu'une image cassée ;
- les images : « stale-while-revalidate » — la copie en cache répond tout de suite, le réseau la rafraîchit pour la fois suivante ;
- les pages d'aperçu `r/` et `f/` : réseau d'abord, mais 3 s au plus, puis le cache ;
- seules les réponses « ok » sont mises en cache.

**La version du cache est automatique.** `npm run sw` ([`tools/version-sw.mjs`](tools/version-sw.mjs)) liste tous les fichiers de l'appli et écrit dans `sw.js` la liste `CORE` et une `VERSION` dérivée de leur contenu : plus de « Bump cache version » à faire à la main. À relancer après toute modification d'un fichier de l'appli (page, style, module, donnée, vignette) et à committer avec : la CI lance l'outil puis `git diff --exit-code sw.js index.html`, elle échoue donc si `sw.js` ou `index.html` n'est pas à jour. L'outil écrit aussi dans `index.html`, entre repères, le bloc `modulepreload` (le graphe des imports **statiques** de `js/main.js`, calculé par [`tools/graphe-modules.mjs`](tools/graphe-modules.mjs) : un module ajouté change le bloc, les `import()` dynamiques n'y figurent pas) et le préchargement des quatre premières vignettes de l'accueil. Ne jamais modifier à la main le bloc entre les repères `>>>` et `<<<`.

**Mises à jour.** Une nouvelle version s'installe en coulisse puis attend ; l'appli affiche « Nouvelle version — Recharger » ([`js/ui/miseajour.js`](js/ui/miseajour.js)). Le bouton active la nouvelle version (`skipWaiting`) et recharge dès qu'elle contrôle la page.

## Développement

Site 100 % statique, sans build ni dépendance : HTML + CSS + JavaScript vanilla.

```
index.html              Coquille de l'application : feuilles de style, puis les données, puis js/main.js
manifest.webmanifest    Manifeste PWA
sw.js                   Service worker (hors ligne) — CORE et VERSION y sont écrits par `npm run sw`
r/  f/                  Pages d'aperçu des recettes et des fondamentaux (générées)

css/polices.css         Polices locales (@font-face) : rien n'est demandé à un serveur de polices
css/base.css            Palette (clair/sombre, contrastes mesurés par les tests), mise en page, onglets, boutons, toast, feuilles
css/accueil.css         Accueil : en-tête, recherche, filtres, grille de vignettes
css/fiche.css           Fiche recette : héro, ingrédients, composition, étapes, coups de cœur
css/minuteurs.css       Plateau des bulles de minuteur
css/reglages.css        Réglages : bouton de l'accueil et son point d'état, feuille, confirmations
  (les feuilles qui suivent sont celles des vues chargées à la demande : index.html les charge sans bloquer le premier rendu — <link data-vue media="print" onload="this.media='all'"> — et js/ui/styles.js fait attendre le routeur)
css/cuisine.css         Mode cuisine plein écran
css/menu.css            Onglet Au menu : cartes, rétroplanning et structure d'un repas
css/courses.css         Onglet Courses : liste par rayon, articles libres
css/savoirs.css         Savoirs : astuces, feuille et page des fondamentaux
css/figures.css         Figures des savoirs : cadre, palette des schémas (classes fg-…, clair et sombre), apparition des tracés, zoom
css/journal.css         Journal des recettes cuisinées : feuille d'ajout, photos, liste

js/recipes.js           Données : les recettes
js/placard.js           Données : le fond de placard (cid des produits « à vérifier » en courses)
js/fondamentaux.js      Données : le catalogue des mécanismes
js/figures.js           Données : les schémas, courbes et échelles des fondamentaux (format documenté en tête du fichier)
js/illos.js             Données : les illustrations dessinées
js/allergenes.js        Données : allergènes, produits non végétariens
js/saisons.js           Données : mois de saison des fruits, légumes et herbes
js/substitutions.js     Données : remplacements d'ingrédients et ce qu'ils changent
js/sync-config.js       Données : l'adresse de la base de synchro
  (ces fichiers de données sont des scripts classiques qui déclarent des globales ; les outils de tools/ les lisent avec new Function)

js/main.js              Démarrage : migrations, écouteurs globaux, première vue, minuteurs ; la synchro et le service worker viennent après le premier affichage
js/sync.js              Synchronisation entre appareils (Supabase REST + canal Realtime), chargée après le premier affichage
js/vendor/qrcode-generator.js   Bibliothèque de QR code (MIT), chargée avec les réglages

js/core/etat.js         L'état (lecture du stockage sans plantage), save(), abonnés à la sauvegarde et à son échec, migrations
js/core/format.js       Durées, quantités à l'échelle, dates, horloge, normaliser()
js/core/html.js         esc(), html`…`, raw()
js/core/icones.js       Les icônes SVG
js/core/recettes.js     Temps, verdicts, séances cuisinées, version composée (ingrédients et étapes effectifs)
js/core/fonds.js        Les fondamentaux vus des recettes, et inversement
js/core/recherche.js    Recherche de l'accueil : texte normalisé, filtres de régime, de temps et de saison, ingrédients du « J'ai… »
js/core/adaptation.js   Allergènes d'une version, bornes des portions et des convives (PORTIONS_MIN/MAX, CONVIVES_MAX), portions permises, moule
js/core/liens.js        Une version de recette dans l'adresse (?p=…&c=…&a=…), dans les deux sens
js/core/menu.js         Entrées du menu, composition en cours, repas (convives, heure, allergies), repas passés, basiques oubliés
js/core/planning.js     Rétroplanning d'un repas, préchauffage du four et fichier .ics (pur : des minutes, pas de DOM)
js/core/courses.js      La liste de courses calculée depuis le menu
js/core/cuisine.js      Mode cuisine, côté calcul : taille du texte, ingrédients d'une étape, libelleQuantite(), plan de préchauffage, durées
js/core/seance.js       Cuisine en cours : étape reprise, reprise automatique
js/core/journal.js      Journal, côté pur : dates en clair et tri des entrées d'une recette
js/core/fusion.js       Fusion à trois voies de l'état synchronisé (pur)
js/core/sauvegarde.js   normaliserEtat() (stockage, fichier importé, autre appareil), export du carnet, aperçu du remplacement

js/ui/toast.js          Message passager (avec bouton d'action facultatif), pastilles des onglets
js/ui/annonces.js       L'unique région live : annoncer(texte)
js/ui/focus.js          garderFocus() : le focus clavier à travers un redessin
js/ui/typo.js           Typographie française de tout ce qui s'affiche (espaces insécables), par typo() de core/format.js
js/ui/feuilles.js       Feuilles qui montent du bas, liées au geste de retour ; seul endroit où vivent Échap, le piège à focus et le retour du focus ; confirmer()
js/ui/routeur.js        Le routeur (#), les flèches de retour, le chargement des vues à la demande (import())
js/ui/styles.js         Attente des feuilles de style non bloquantes des vues
js/ui/partage.js        Liens, textes de partage, feuille de partage ou copie
js/ui/minuteurs.js      Minuteurs, plateau, sonnerie, verrou d'écran
js/ui/visuel.js         Photo, illustration ou emoji d'une recette
js/ui/miseajour.js      Enregistrement du service worker (au repos, après le premier affichage), « Nouvelle version — Recharger »
js/ui/theme.js          Thème automatique/clair/sombre, mouvement réduit
js/ui/voix.js           Mains libres : lecture à voix haute et commandes vocales (module autonome, chargé à la demande)
js/ui/qr.js             QR code en SVG (qrSvg), sur js/vendor/qrcode-generator.js
js/ui/figures.js        Figures des savoirs : des données de js/figures.js vers du SVG (module pur, testé sous Node)

js/vues/accueil.js      Accueil : grille, recherche, filtres (la seule vue chargée avec le premier affichage)
js/vues/fiche.js        Fiche recette et feuille « composer / ajouter »
js/vues/ingredient.js   Feuille d'un ingrédient : quantité, « j'en ai moins », substitutions, allergènes
js/vues/cuisine.js      Mode cuisine
js/vues/menu.js         Au menu
js/vues/courses.js      Courses
js/vues/savoirs.js      Savoirs : catalogue, page et feuille d'un fondamental, astuces
js/vues/journal.js      Journal des recettes cuisinées : feuille d'ajout, photos (IndexedDB), liste
js/vues/reglages.js     Réglages : thème, carnet partagé (carnetSync), export et import

tools/                  Vérificateur de recettes, pages de partage, génération de photos, vignettes WebP, version du service worker, captures des savoirs (capturer-savoir.mjs)
tests/                  Tests unitaires (unit/) et de bout en bout (e2e/), serveur de test, page de la voix (fixtures/)
```

**Les modules `core/` ne touchent ni `document` ni `window` au chargement** : ils ne lisent les données globales (`RECIPES`, `FONDAMENTAUX`…) qu'à l'appel. Ils s'importent donc tels quels sous Node, et `tests/unit/` les teste sans navigateur — c'est aussi là qu'on met le code pur (calculs, formats, textes) plutôt que dans les vues.

Les modules `ui/` et `vues/` s'importent en cercle (le routeur appelle les vues, qui rappellent le routeur) : aucun ne doit donc exécuter, au chargement, une fonction d'un autre module du cercle. Tout démarre depuis `js/main.js`.

**Après toute modification, dans cet ordre :**

```bash
node tools/verifier-recettes.mjs      # cohérence des données, code 1 si erreur
node tools/generer-pages-partage.mjs  # aperçus de partage r/ et f/
```

### Tests

L'application reste sans dépendance ; seuls les tests en ont (`npm install`, une fois).

```bash
npm run verifier   # cohérence des données de recettes
npm test           # tests unitaires (tests/unit/, node:test)
npm run test:e2e   # parcours complets dans Chromium au format téléphone (tests/e2e/)
npm run pages      # régénère les pages de partage r/ et f/
```

Les tests de bout en bout démarrent eux-mêmes `tests/serveur.mjs` (port 4173, ou `PORT=…`). Ils pilotent l'interface comme un doigt — jamais par les modules de `js/` — après avoir pré-rempli `localStorage`, et simulent Supabase (`tests/e2e/outils.js`). Chromium doit être installé (`npx playwright install chromium`).

**Les familles de tests.** Chaque thème a ses deux étages, `tests/unit/<thème>.test.mjs` (sous Node) et `tests/e2e/<thème>.spec.js` (dans Chromium) :

- le tronc du carnet : `accueil` (recherche, critères, « J'ai… »), `accueil-fiche`, `fiche`, `recettes`, `format`, `html`, `core` (la règle « core/ sans DOM ») ;
- le mode cuisine : `cuisine`, `voix` (avec `tests/fixtures/voix.html` et `outils-voix.js`), `savoirs`, `figures` (le moteur de rendu des schémas, sa palette et ses données), `thermometre` (la figure transversale des Savoirs), `culinaire` (logique de cuisinier : un `cid` est un produit) ;
- le menu et les courses : `menu`, `menu-courses`, `courses` (`outils-courses.js`) ;
- le carnet lui-même : `journal`, `reglages` (`outils-reglages.js`), `synchro` (`outils-synchro.js` : le faux Supabase), `navigation` ;
- le chargement : `images` (service worker, vignettes ; `outils-images.js`) ;
- `verificateur.test.mjs` et `donnees.mjs` : le vérificateur de recettes et les données chargées pour les tests unitaires ;
- les lots de la deuxième vague, `v2-*` : `a11y`, `chargement`, `courses-menu`, `css`, `culinaire-2`, `navigation`, `robustesse`, `synchro`, `tests` (la fiabilité de la suite) et `code` (un mécanisme par règle, la carte du README) ;
- `bugs-connus.spec.js`, les bugs en attente.

Un test unitaire (`tests/unit/v2-code.test.mjs`) échoue quand un fichier de `js/`, `css/` ou `tools/` n'est pas cité dans ce README : ajouter un module, c'est ajouter sa ligne à la carte ci-dessus.

`tests/e2e/bugs-connus.spec.js` rassemble les **`test.fixme`** : des bugs connus, B1 à B12, en attente de correction. Chacun est écrit pour le comportement *attendu* et reste ignoré par la suite. Celui qui corrige un bug retire le `fixme` de son test : il passe alors de lui-même, et c'est son critère d'acceptation.

La CI (`.github/workflows/ci.yml`) rejoue tout cela, puis vérifie que `r/` et `f/` sont à jour.

### Mains libres (voix)

[`js/ui/voix.js`](js/ui/voix.js) est un module autonome (son seul import est `normaliser()`) que le mode cuisine charge à la demande. L'API est documentée dans son en-tête : `voixDisponible()`, `lire(texte)`, `arreterLecture()`, `ecouter(commandes, { onErreur })`.

- **Navigateurs** : la lecture (`speechSynthesis`) marche partout ou presque, avec une voix française installée de préférence. L'écoute (`SpeechRecognition`) existe dans Chrome et Edge, et dans Safari / iOS (préfixée `webkit`) ; elle manque dans Firefox. Sans elle, le mode cuisine ne propose simplement pas les mains libres.
- **Micro** : le navigateur demande l'accès au premier `ecouter()`, qui doit donc partir d'un geste (un bouton). Refusé, l'écoute s'arrête et `onErreur` reçoit un message à afficher ; il se rétablit dans les réglages du site. Sur iOS, la reconnaissance passe par les serveurs d'Apple : elle exige le réseau et coupe après un silence, d'où la relance automatique.
- **Écho** : l'écoute se met en pause pendant que `lire()` parle, sinon l'appli s'entendrait donner ses propres ordres.
- **Tests** : `tests/e2e/voix.spec.js` joue le module contre une reconnaissance et une synthèse simulées (`tests/e2e/outils-voix.js`), sur la page `tests/fixtures/voix.html`. Le vrai micro ne se teste qu'à la main, sur téléphone.

### Le menu est une liste d'entrées, pas d'identifiants

Une même recette peut revenir deux fois au menu, composée différemment. `state.menu`
contient donc des **entrées**, chacune portant sa propre composition :

```js
{ k: "m3", rid: "cake-sale", choices: { garniture: "olives-feta" },
  addons: ["tomates-sechees"], portions: 8 }
```

- `k` — la clé de l'entrée. Elle sert d'adresse : `#/recette/cake-sale/m/m3` ouvre la
  fiche *sur cette version*, et `…/m/m3/cuisine/2` sa séance de cuisine.
- La fiche sans clé (`#/recette/cake-sale`) est un **brouillon** : ce qu'on compose
  avant d'ajouter. Ajouter fige le brouillon dans une entrée neuve **et le remet à
  zéro**, sans quoi la deuxième version hériterait en silence des suppléments de la
  première.
- On ajoute depuis la fiche, on retire depuis le menu — ou depuis l'entrée elle-même.
  Le bouton d'ajout n'est plus une bascule, c'est ce qui permet deux versions.
- `state.cooking` et les minuteurs sont rangés sous la clé de l'entrée quand il y en a
  une, sous l'identifiant de la recette sinon : deux cakes au four ont deux comptes à
  rebours et deux bulles.

Les anciens menus (`["focaccia-romarin", …]`) sont convertis au chargement, en
reprenant la composition rangée sous l'identifiant de la recette.

### Synchronisation entre appareils (Supabase)

Le menu, les cases cochées, les articles libres, les verdicts, les compteurs de recettes cuisinées, les notes perso, le prochain repas, l'historique, le journal et l'ordre des rayons (`menu`, `checked`, `extras`, `notes`, `cooked`, `notesPerso`, `repas`, `historique`, `journal`, `ordreRayons` — la liste est `CHAMPS_SYNCHRO` dans `js/core/fusion.js`) sont stockés dans **une seule base partagée**. Le reste (thème, recherche, minuteurs, réglages de l'appareil) reste local. Les photos du journal ne voyagent pas.

- **Un mot de passe**, saisi une fois par navigateur depuis les réglages. Il est vérifié côté serveur à chaque lecture et écriture (hash bcrypt dans `carnet_acces`) ; les tables sont fermées à l'API publique. Sans le mot de passe, on ne lit ni n'écrit rien. L'API est `carnetSync` (`js/sync.js`) : `disponible`, `etat()` (`off` | `attente` | `ok` | `hors`, aussi posé sur `<html data-synchro>`), `surEtat(fn)`, `connecter(mdp, { remplacer })`, `deconnecter()`, `lienConnexion()`, `relever()`. `connecter` ne remplace jamais un carnet existant sans `remplacer: true` : il répond `carnetExistant: true` et c'est à l'interface de demander confirmation. Une mise à jour venue d'un autre appareil émet l'évènement `carnet-synchro` sur `document`.
- **Mise en place**, une fois : exécuter [`supabase/carnet.sql`](supabase/carnet.sql) dans le SQL Editor (en remplaçant `MON_MOT_DE_PASSE`), puis renseigner l'URL et la clé publique dans [`js/sync-config.js`](js/sync-config.js). Vide, la synchro est désactivée. Changer le mot de passe : relancer l'`insert … on conflict`.
- **Projet déjà en service : exécuter le bloc 4 de `supabase/carnet.sql`** (« Migration : contrôle de version »), seul, dans le SQL Editor. Il est idempotent et ajoute `carnet_ecrire(p_mdp, p_data, p_vu)` ; l'ancienne fonction reste. Tant qu'il n'est pas passé, l'appli se replie sur l'ancienne fonction (elle relit juste avant d'écrire) — sans contrôle de version côté serveur.
- **Rien ne part sans changement** : `save()` est appelé pour tout, mais l'envoi (0,8 s après) n'a lieu que si un champ synchronisé diffère de la dernière version serveur connue (la « base », gardée dans `localStorage` avec le mot de passe).
- **Fusion à trois voies** (base / local / serveur, `js/core/fusion.js`, fonctions pures) : à l'envoi, l'appareil relit le serveur, fusionne, puis écrit en donnant la version vue (`p_vu`). Si le serveur refuse parce qu'elle a bougé, il relit, refusionne et réessaie (3 fois au plus). Listes à clé (menu par `k` ; extras, historique, journal par `id`) : ajouts et retraits des deux côtés respectés ; une entrée retirée d'un côté et modifiée de l'autre reste retirée ; modifiée des deux côtés, une entrée de menu se fusionne champ par champ (portions, `choices` clé par clé, `addons` en ensemble), les autres listes gardent la version locale. Dictionnaires (`checked`, `notes`, `cooked`, `notesPerso`) : clé par clé, ce qui a changé d'un côté l'emporte, des deux côtés → le local, sauf `notesPerso` (la plus récente selon `at`) et `cooked` (plus grand compte, date la plus récente). `repas` : champ par champ, `exclus` (allergènes) en ensemble à trois voies — les cases cochées chacune de son côté s'additionnent, une case décochée d'un côté seulement est retirée. `ordreRayons` : celui qui a changé ; « Remettre l'ordre d'origine » écrit `[]` (aucune préférence), qui se synchronise comme une valeur. Un champ absent des trois reste absent ; un champ supprimé d'un côté, la base permet de le distinguer d'un champ jamais eu. Chaque requête et l'ouverture du canal ont 15 s pour aboutir, faute de quoi l'appareil se tient pour hors ligne et réessaie.
- **Temps réel** : l'appareil rejoint un canal Supabase Realtime en *broadcast* dont le nom est le SHA-256 hexadécimal de `carnet:` collé au mot de passe (introuvable sans lui). Après chaque écriture il y diffuse un simple « change » — aucune donnée n'y passe — et les autres appareils relèvent aussitôt. Protocole Phoenix minimal, sans dépendance : `phx_join`, heartbeat toutes les 25 s, reconnexion à délai croissant (1 s à 1 min). Canal tenu : relevé de secours toutes les 2 min ; sinon toutes les 10 s, comme avant. Si les canaux publics sont désactivés (Realtime → Settings → « Allow public access »), la synchro continue par relevé.
- **Connexion par QR code** : `lienConnexion()` donne `…/#/connexion/<mot de passe en base64url>`, que les réglages encodent avec `qrSvg` (`js/ui/qr.js`, sur la bibliothèque MIT `js/vendor/qrcode-generator.js`, chargée seulement à l'affichage du code). Ouvrir ce lien se connecte (avec confirmation si l'appareil porte déjà un menu et que le carnet partagé existe), puis l'adresse est remplacée par `#/` pour que le jeton ne reste pas dans l'historique. Le jeton *est* le mot de passe : à ne montrer qu'à l'écran d'un appareil déjà connecté.
- **Ne pas déranger** : une mise à jour redessine Menu ou Courses sur place (`route({ garderDefilement: true })`), mais attend la fin d'une saisie et la fermeture d'une feuille.
- `localStorage` reste la source hors ligne. Les clés d'entrées de menu sont uniques entre appareils (`m<horodatage><aléa>`) ; une entrée reçue sans clé en reçoit une dérivée de son contenu et de sa place (`r…`), la même à chaque relève, pour que relire la même version ne redessine rien.
- **Un champ supprimé l'est partout** : si la fusion n'a plus un champ (le menu vidé puis « Annuler » retire l'historique), l'autre appareil le retire aussi au lieu de le renvoyer au serveur.
- Les tests simulent Supabase (`page.route`) et le canal (`page.routeWebSocket`) — `tests/e2e/outils-synchro.js` — et ne touchent jamais au vrai serveur.

Pour tester en local :

```bash
python3 -m http.server 4173
```

Déployé automatiquement via GitHub Pages à chaque push sur `main`.
