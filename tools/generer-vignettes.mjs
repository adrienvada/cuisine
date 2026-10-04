/* Génère, pour chaque photo img/<id>.jpg, les trois variantes WebP que l'appli
   charge à la place de la photo entière :

     img/v/<id>.webp   la vignette de la grille d'accueil (168 × 110 px au format téléphone)
     img/c/<id>.webp   le carré de la carte « Au menu » (88 × 88 px)
     img/h/<id>.webp   la photo entière, pour le héro de la fiche

   Avant, chaque vignette téléchargeait la photo de 800 px (70 à 160 Ko) pour n'en
   montrer que le tiers central, zoomé ×3 par le CSS. Ici le recadrage est fait une
   fois pour toutes, avec la même règle que le CSS d'alors (voir le README, « Le
   cadrage se décide sur la bande centrale ») : une boîte `cover` agrandie ×3 et
   centrée. Une variante est produite à 2× la taille d'affichage (écrans denses), ou
   à la résolution de la source si elle est moindre : agrandir ne ferait que
   alourdir le fichier.

   Source : img/originaux/<id>.jpg s'il existe (un original plus grand, 1 600 px, donne
   des vignettes plus nettes), sinon img/<id>.jpg.

   Usage :  node tools/generer-vignettes.mjs             (régénère tout)
            node tools/generer-vignettes.mjs --verifier  (CI : code 1 si une photo n'a pas
                                                           ses variantes)

   À relancer après avoir ajouté ou remplacé une photo, puis committer img/v, img/c, img/h
   et sw.js (npm run sw : le contenu des vignettes entre dans la version du cache). */

import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const QUALITE = 78;
const LARGEUR_HERO_MAX = 960;

/* Boîtes d'affichage (px CSS) au format téléphone. Si elles changent dans le CSS
   (css/accueil.css, css/menu.css), les changer ici et relancer l'outil. */
export const GENRES = {
  v: { nom: "vignette", largeur: 168, hauteur: 110, zoom: 3 },
  c: { nom: "carre", largeur: 88, hauteur: 88, zoom: 3 },
  h: { nom: "hero" }
};

/* Zone de la source que montre une boîte `cover` agrandie ×zoom et centrée, puis
   taille de la variante : 2× la boîte, ou la zone telle quelle si elle est moindre. */
export function cadrage(source, { largeur, hauteur, zoom }) {
  const echelle = Math.max(largeur / source.largeur, hauteur / source.hauteur);
  const zoneL = Math.min(source.largeur, largeur / (zoom * echelle));
  const zoneH = Math.min(source.hauteur, hauteur / (zoom * echelle));
  const gauche = Math.round((source.largeur - zoneL) / 2);
  const haut = Math.round((source.hauteur - zoneH) / 2);
  const facteur = Math.min(1, zoneL / (2 * largeur));
  return {
    extraire: {
      left: gauche,
      top: haut,
      width: Math.min(Math.round(zoneL), source.largeur - gauche),
      height: Math.min(Math.round(zoneH), source.hauteur - haut)
    },
    sortie: { width: Math.round(2 * largeur * facteur), height: Math.round(2 * hauteur * facteur) }
  };
}

function photos() {
  return readdirSync(join(RACINE, "img"))
    .filter(f => f.endsWith(".jpg"))
    .map(f => f.slice(0, -4))
    .sort();
}

const chemin = (genre, id) => join(RACINE, "img", genre, `${id}.webp`);

function manquantes() {
  const trous = [];
  for (const id of photos()) {
    for (const genre of Object.keys(GENRES)) if (!existsSync(chemin(genre, id))) trous.push(`img/${genre}/${id}.webp`);
  }
  return trous;
}

async function generer() {
  const sharp = (await import("sharp")).default;
  for (const g of Object.keys(GENRES)) mkdirSync(join(RACINE, "img", g), { recursive: true });
  for (const id of photos()) {
    const original = join(RACINE, "img", "originaux", `${id}.jpg`);
    const fichier = existsSync(original) ? original : join(RACINE, "img", `${id}.jpg`);
    // rotate() applique l'orientation EXIF : sans elle, une photo de téléphone serait couchée.
    const { data, info } = await sharp(fichier).rotate().toBuffer({ resolveWithObject: true });
    const source = { largeur: info.width, hauteur: info.height };
    const sortis = [];
    for (const [genre, boite] of Object.entries(GENRES)) {
      let image = sharp(data);
      if (genre === "h") {
        image = image.resize({ width: LARGEUR_HERO_MAX, withoutEnlargement: true });
      } else {
        const { extraire, sortie } = cadrage(source, boite);
        image = image.extract(extraire).resize(sortie);
      }
      const { size } = await image.webp({ quality: QUALITE }).toFile(chemin(genre, id));
      sortis.push(`${genre} ${Math.round(size / 1024)} Ko`);
    }
    console.log(`${id}  (${source.largeur}×${source.hauteur})  ${sortis.join(" · ")}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes("--verifier")) {
    const trous = manquantes();
    if (trous.length) {
      console.error(`Variantes manquantes (npm run vignettes) :\n  ${trous.join("\n  ")}`);
      process.exit(1);
    }
    console.log(`Vignettes : ${photos().length} photos, toutes ont leurs variantes.`);
  } else {
    await generer();
  }
}
