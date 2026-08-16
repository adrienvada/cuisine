# Carnet de cuisine 🌿

Le carnet de recettes d'Evadri — un site pensé pour smartphone : recettes illustrées, mode cuisine pas-à-pas et liste de courses automatique.

**Site : https://adrienvada.fr/cuisine/**

## Fonctionnalités

- **Recettes** — grille de cartes avec recherche instantanée (par nom, ingrédient, tag) et filtres par catégorie.
- **Portions ajustables** — les quantités se recalculent automatiquement.
- **Au menu** — les recettes retenues pour le prochain repas, réunies dans leur onglet : photo, portions réglables, accès direct à la recette et au mode cuisine. C'est le menu qui alimente la liste de courses, pas l'inverse.
- **Mode cuisine** — étapes plein écran, gros texte lisible les mains dans la farine, l'écran reste allumé. Les minuteurs (sonnerie + vibration) continuent de tourner où qu'on aille dans le carnet : leurs bulles restent affichées en bas et un appui ramène à l'étape concernée, la croix les arrête.
- **Reprise** — l'étape en cours est retenue : en rouvrant la recette, le bouton propose « Reprendre — étape 3 / 5 » (ou « Repartir du début »). Si un minuteur de cette recette tourne, le mode cuisine se rouvre directement. Oubliée à la fin de la recette, ou d'elle-même au bout de 12 h.
- **Liste de courses** — calculée à partir du menu : les ingrédients fusionnent par rayon (épicerie, frais, fruits & légumes…), quantités additionnées. Cochable au magasin, partageable par message, articles libres en plus.
- **Savoirs** — les *fondamentaux* : les mécanismes qui reviennent d'une recette à l'autre (l'émulsion, Maillard, l'osmose du sel), expliqués une fois pour toutes. Une pastille dorée sous l'astuce d'une étape les ouvre sans quitter la recette, même en mode cuisine. L'onglet les réunit, la recherche les fouille, et chacun se partage par lien.
- **Partage** — depuis la vignette, la fiche recette ou le mode cuisine : un résumé (temps, ingrédients aux portions affichées) et le lien vers la recette illustrée, envoyés via la feuille de partage du téléphone. « Partager le repas » envoie le menu entier d'un coup. Un fondamental se partage de la même façon.
- **PWA** — installable sur l'écran d'accueil (Safari : Partager → « Sur l'écran d'accueil »), fonctionne hors ligne.

## Ajouter une recette

Les recettes vivent dans [`js/recipes.js`](js/recipes.js) : un objet par recette (titre, temps, ingrédients avec rayon de courses, étapes avec astuces et minuteurs).

Champ facultatif `discovered` — où la recette a été découverte, affiché en pastille dorée sur la fiche et repris dans le partage. La phrase commence par sa préposition, elle complète « Découverte … » :

```js
discovered: "au Murmure du Son, festival à Eu",   // → « Découverte au Murmure du Son, festival à Eu »
discovered: "à l'hôtel Park Plaza Victoria, à Amsterdam",
```

Le plus simple : **donner la recette à Claude** (photo, texte, lien…) et lui demander de l'ajouter au carnet — il la structurera et la publiera.

**Après toute modification des recettes, lancer le vérificateur :**

```bash
node tools/verifier-recettes.mjs
```

Il attrape les erreurs qui ne font pas planter l'application mais lui font afficher quelque chose de faux : un supplément accroché à la mauvaise étape (insérer une étape décale tous les index qui suivent), une durée annoncée sans minuteur ou l'inverse, un rayon inconnu ou un `cid` manquant qui casse la liste de courses.

**Renommer l'identifiant d'une recette** demande une entrée dans `RECIPE_RENAMES` (fin de `js/recipes.js`), sans quoi on perd ce qui y est accroché : les données du navigateur (menu, portions, verdicts, compteurs, minuteurs en cours) et les liens de partage déjà envoyés. Avec l'entrée, tout suit automatiquement et une page d'aperçu reste à l'ancienne adresse. Ne jamais retirer une entrée — un lien peut resurgir des années plus tard. Penser aussi à renommer `img/<id>.jpg` et la clé dans `js/illos.js`.

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

## Illustrations & photos

Chaque recette a une **illustration dessinée** (SVG « gouache ») définie dans [`js/illos.js`](js/illos.js) — clé = identifiant de la recette. Si une recette n'a pas d'illustration, son emoji prend le relais ; si elle a une **photo** (`image: "img/….jpg"`), la photo gagne.

**Une vraie photo du plat prime sur une image générée** : recadrer en 4:3 sur l'assiette, redimensionner en 800 px de large et enregistrer en JPEG qualité 80 (~70 Ko), sous `img/<id-recette>.jpg`.

**Le cadrage se décide sur la bande centrale — et les vignettes sont volontairement très serrées** : on doit y voir l'aliment de près, pas forcément le bol ou l'assiette qui le porte.

| | Boîte | Ce qui reste visible d'une image 4:3 |
|---|---|---|
| Vignette de la grille | 168 × 110 px | 33 % de la largeur, **29 % de la hauteur** (le `cover` recadre, puis `transform: scale(3)` rapproche) |
| Carte « Au menu » | 88 × 88 px | **25 % de la largeur**, 33 % de la hauteur (même mécanisme, `scale(3)`) |
| Héro de la fiche | 352 × 170 px | toute la largeur, 64 % de la hauteur (pas de zoom ici : contexte plus généreux) |

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

## Développement

Site 100 % statique, sans build ni dépendance : HTML + CSS + JavaScript vanilla.

```
index.html            Coquille de l'application
css/styles.css        Styles (palette carnet : crème, vert, doré)
js/recipes.js         Les données des recettes
js/fondamentaux.js    Le catalogue des mécanismes (onglet Savoirs)
js/app.js             Logique (navigation, menu, courses, partage, mode cuisine)
r/                    Pages d'aperçu des recettes (générées)
f/                    Pages d'aperçu des fondamentaux (générées)
sw.js                 Service worker (hors ligne)
manifest.webmanifest  Manifeste PWA
```

**Après toute modification, dans cet ordre :**

```bash
node tools/verifier-recettes.mjs      # cohérence des données, code 1 si erreur
node tools/generer-pages-partage.mjs  # aperçus de partage r/ et f/
```

Pour tester en local :

```bash
python3 -m http.server 4173
```

Déployé automatiquement via GitHub Pages à chaque push sur `main`.
