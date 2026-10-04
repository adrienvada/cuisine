/* Écrit dans sw.js la liste des fichiers de l'appli (CORE) et sa VERSION.

   La version est une empreinte du contenu de ces fichiers (et de la logique du
   service worker lui-même) : elle change toute seule dès qu'un fichier change, et
   ne change pas sinon. Plus de « Bump cache version » à faire à la main — il suffit
   de relancer cet outil, et la CI échoue si on l'a oublié.

   Dans CORE : l'appli entière (index.html, manifeste, css/, js/ avec données,
   modules et vendor, fonts/, icônes) et les vignettes img/v et img/c, petites
   et affichées dès l'accueil. Ni les photos entières ni img/h (héros) : trop
   lourdes pour retarder l'installation. Les héros WebP (liste HEROS) sont
   récupérés au repos, dans un second temps, par le service worker (message
   « heros ») : une fiche jamais ouverte s'affiche donc hors ligne. Les JPEG
   entiers ne servent que de secours aux navigateurs sans WebP.
   Ni r/ ni f/ : des pages d'aperçu de partage, pas de l'appli.

   Il écrit aussi dans index.html deux blocs, entre repères : le modulepreload
   (le graphe d'imports statiques de js/main.js, cf. graphe-modules.mjs) et le
   préchargement des premières vignettes de l'accueil. La CI relance l'outil et
   échoue si l'un de ces fichiers change.

   Usage :  node tools/version-sw.mjs   (ou npm run sw) */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { DEBUT_PRELOAD, FIN_PRELOAD, blocPreload, grapheStatique } from "./graphe-modules.mjs";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEBUT = "/* >>> bloc généré par tools/version-sw.mjs — ne pas modifier à la main */";
const FIN = "/* <<< fin du bloc généré */";

function fichiersDe(dossier) {
  const base = join(RACINE, dossier);
  const sortie = [];
  (function parcourir(d) {
    for (const nom of readdirSync(d).sort()) {
      const chemin = join(d, nom);
      if (statSync(chemin).isDirectory()) parcourir(chemin);
      else sortie.push(relative(RACINE, chemin).split(sep).join("/"));
    }
  })(base);
  return sortie;
}

/* Combien de vignettes l'accueil demande avant même que ses modules s'exécutent :
   les cartes visibles sans défiler sur un téléphone (deux colonnes), pas au-delà. */
const VIGNETTES_PRECHARGEES = 4;
const DEBUT_VIGNETTES = "<!-- >>> vignettes de l'accueil générées par tools/version-sw.mjs — ne pas modifier à la main -->";
const FIN_VIGNETTES = "<!-- <<< fin du bloc généré -->";

/* Les recettes sont une globale de js/recipes.js (script classique) : on l'évalue. */
const RECIPES = new Function(readFileSync(join(RACINE, "js", "recipes.js"), "utf8") + ";return RECIPES;")();

/* Les premières cartes de l'accueil, dans l'ordre de RECIPES (filtre « Toutes »,
   celui d'une première visite). Un filtre mémorisé en change l'ordre : ces
   préchargements sont alors perdus, sans conséquence (les vignettes sont de toute
   façon dans le cache du service worker). */
const premieres = RECIPES.filter(r => /^img\/[^/]+\.jpg$/.test(r.image || "")).slice(0, VIGNETTES_PRECHARGEES)
  .map(r => `img/v/${r.image.slice(4, -4)}.webp`);

function remplacerBloc(texte, debut, fin, bloc, nom) {
  const i = texte.indexOf(debut);
  const j = texte.indexOf(fin, i);
  if (i < 0 || j < i) {
    console.error(`index.html : les repères du bloc « ${nom} » sont introuvables.`);
    process.exit(1);
  }
  return texte.slice(0, i) + bloc + texte.slice(j + fin.length);
}

const html = readFileSync(join(RACINE, "index.html"), "utf8");
const htmlNeuf = remplacerBloc(
  remplacerBloc(html, DEBUT_PRELOAD, FIN_PRELOAD, blocPreload(grapheStatique(RACINE, "js/main.js")), "modulepreload"),
  DEBUT_VIGNETTES, FIN_VIGNETTES,
  [DEBUT_VIGNETTES, ...premieres.map(f => `  <link rel="preload" as="image" href="${f}" type="image/webp">`), `  ${FIN_VIGNETTES}`].join("\n"),
  "vignettes"
);
if (htmlNeuf !== html) writeFileSync(join(RACINE, "index.html"), htmlNeuf);

const heros = fichiersDe("img/h").filter(f => f.endsWith(".webp"));

const fichiers = [
  "index.html",
  "manifest.webmanifest",
  "favicon.ico",
  ...["css", "js", "fonts", "icons", "img/v", "img/c"].flatMap(fichiersDe)
].sort();

const sw = readFileSync(join(RACINE, "sw.js"), "utf8");
const i = sw.indexOf(DEBUT);
const j = sw.indexOf(FIN);
if (i < 0 || j < i) {
  console.error("sw.js : les repères du bloc généré sont introuvables.");
  process.exit(1);
}

// La logique du service worker compte aussi dans l'empreinte, le bloc généré non.
const logique = sw.slice(0, i) + sw.slice(j + FIN.length);
const hash = createHash("sha256");
hash.update(logique);
for (const f of fichiers) hash.update(`\0${f}\0`).update(readFileSync(join(RACINE, f)));
const version = hash.digest("hex").slice(0, 10);

const bloc = [
  DEBUT,
  `const VERSION = "${version}";`,
  "",
  "const CORE = [",
  `  "./",`,
  fichiers.map(f => `  "${f}"`).join(",\n"),
  "];",
  "",
  "/* Au repos, dans un second temps : les héros des fiches. */",
  "const HEROS = [",
  heros.map(f => `  "${f}"`).join(",\n"),
  "];",
  FIN
].join("\n");

const neuf = sw.slice(0, i) + bloc + sw.slice(j + FIN.length);
if (neuf !== sw) writeFileSync(join(RACINE, "sw.js"), neuf);
console.log(`sw.js : version ${version}, ${fichiers.length + 1} fichiers dans CORE${neuf === sw ? " (inchangé)" : ""}.`);
