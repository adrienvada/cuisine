/* Écrit dans sw.js la liste des fichiers de l'appli (CORE) et sa VERSION.

   La version est une empreinte du contenu de ces fichiers (et de la logique du
   service worker lui-même) : elle change toute seule dès qu'un fichier change, et
   ne change pas sinon. Plus de « Bump cache version » à faire à la main — il suffit
   de relancer cet outil, et la CI échoue si on l'a oublié.

   Dans CORE : l'appli entière (index.html, manifeste, css/, js/ avec données,
   modules et vendor, fonts/, icônes) et les vignettes img/v et img/c, petites
   et affichées dès l'accueil. Ni les photos entières ni img/h (héros) : elles
   viennent au premier usage, et le service worker les garde ensuite.
   Ni r/ ni f/ : des pages d'aperçu de partage, pas de l'appli.

   Usage :  node tools/version-sw.mjs   (ou npm run sw) */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

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
  FIN
].join("\n");

const neuf = sw.slice(0, i) + bloc + sw.slice(j + FIN.length);
if (neuf !== sw) writeFileSync(join(RACINE, "sw.js"), neuf);
console.log(`sw.js : version ${version}, ${fichiers.length + 1} fichiers dans CORE${neuf === sw ? " (inchangé)" : ""}.`);
