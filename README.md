# Carnet de cuisine 🌿

Le carnet de recettes d'Adrien — un site pensé pour smartphone : recettes illustrées, mode cuisine pas-à-pas et liste de courses automatique.

**Site : https://adrienvada.github.io/cuisine/**

## Fonctionnalités

- **Recettes** — grille de cartes avec recherche instantanée (par nom, ingrédient, tag) et filtres par catégorie.
- **Portions ajustables** — les quantités se recalculent automatiquement.
- **Mode cuisine** — étapes plein écran, gros texte lisible les mains dans la farine, minuteurs intégrés (sonnerie + vibration), l'écran reste allumé.
- **Liste de courses** — sélectionne des recettes, les ingrédients fusionnent par rayon (épicerie, frais, fruits & légumes…), quantités additionnées. Cochable au magasin, partageable par message, articles libres en plus.
- **PWA** — installable sur l'écran d'accueil (Safari : Partager → « Sur l'écran d'accueil »), fonctionne hors ligne.

## Ajouter une recette

Les recettes vivent dans [`js/recipes.js`](js/recipes.js) : un objet par recette (titre, temps, ingrédients avec rayon de courses, étapes avec astuces et minuteurs).

Le plus simple : **donner la recette à Claude** (photo, texte, lien…) et lui demander de l'ajouter au carnet — il la structurera et la publiera.

## Développement

Site 100 % statique, sans build ni dépendance : HTML + CSS + JavaScript vanilla.

```
index.html            Coquille de l'application
css/styles.css        Styles (palette carnet : crème, vert, doré)
js/recipes.js         Les données des recettes
js/app.js             Logique (navigation, courses, mode cuisine)
sw.js                 Service worker (hors ligne)
manifest.webmanifest  Manifeste PWA
```

Pour tester en local :

```bash
python3 -m http.server 4173
```

Déployé automatiquement via GitHub Pages à chaque push sur `main`.
