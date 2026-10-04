/* Fabrique les polices servies (fonts/) et css/polices.css à partir des polices
   d'origine rangées dans tools/sources-polices/ (hors de fonts/ : le service
   worker n'a pas à les précacher).

   Pourquoi : le carnet n'utilise qu'un petit jeu de caractères (le français, la
   typographie des recettes), et l'accueil ne dessine que deux polices — Cormorant
   pour le titre des cartes, Caveat pour le seul bandeau « Cuisine · d'Evadri ». Sur
   un téléphone en 4G lente, 112 Ko de polices préchargées disputaient la bande
   passante aux modules et aux premières photos.

   Ce que l'outil produit :
   · cormorant.woff2, cormorant-italique.woff2 : les glyphes du jeu de caractères,
     avec les fonctionnalités que les navigateurs appliquent d'eux-mêmes (ccmp, liga,
     calt, kern…) — le rendu ne change pas — mais sans les variantes stylistiques
     que le carnet ne demande jamais ; sans le hinting.
   · caveat.woff2 : de même. Chargée à la demande par les vues qui s'en servent,
     jamais préchargée.
   · caveat-titre.woff2 : « Caveat Titre », les seuls glyphes du bandeau de l'accueil
     (famille à part, donc sans effet sur le reste du texte en Caveat : les
     alternances contextuelles de la police ne se coupent pas en deux fichiers).
     Préchargée, en `font-display: block` : le bandeau attend quelques dizaines de
     millisecondes plutôt que de s'écrire en écriture de secours puis de sauter.

   Le jeu de caractères : le français et sa typographie (voir BASE), plus tout
   caractère qui apparaît dans le code, les recettes, les fondamentaux et l'index.html
   et que la police d'origine sait dessiner. tests/unit/v3-chemin-critique.test.mjs
   vérifie que les polices produites les couvrent tous.

   Usage :  node tools/polices.mjs   (devDependency d'outillage : subset-font) */

import subsetFont from "subset-font";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Les fonctionnalités que le navigateur applique sans qu'on les demande, plus les
   chiffres que le CSS du carnet réclame (tabular-nums). */
export const FONCTIONNALITES = ["ccmp", "locl", "mark", "mkmk", "calt", "clig", "liga", "rlig", "kern", "rclt", "curs", "dist", "tnum"];

/* Ce qui peut s'écrire dans ces polices, quel que soit le texte : l'ASCII, les
   lettres du français (accents, cédille, tréma, œ æ, majuscules comprises), l'espace
   insécable, « », °, ±, ¼ ½ ¾, ×, le point médian, les tirets, les guillemets et
   apostrophes typographiques, •, …, €, ™, −. Un autre caractère (ñ, ß, une flèche)
   s'écrit dans la police de secours du système, glyphe par glyphe. */
export const BASE = [...new Set(
  Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) => 0x20 + i)
    .concat([..."\u00a0«»°±¼½¾×·àâäçéèêëîïôöùûüÿÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸœŒæÆ–—‘’“”•…€™−"].map(c => c.codePointAt(0)))
)];

/* Les glyphes du bandeau de l'accueil (« Cuisine », « d'Evadri »), apostrophes droite
   et typographique comprises. */
export const TEXTE_TITRE = "Cuisine d'Evadri’";

export const POLICES = [
  { fichier: "cormorant", source: "cormorant", texte: "base" },
  { fichier: "cormorant-italique", source: "cormorant-italique", texte: "base" },
  { fichier: "caveat", source: "caveat", texte: "base" },
  { fichier: "caveat-titre", source: "caveat", texte: "titre" }
];

function lister(dossier, filtre) {
  const sortie = [];
  (function parcourir(d) {
    for (const nom of readdirSync(d)) {
      const chemin = join(d, nom);
      if (statSync(chemin).isDirectory()) parcourir(chemin);
      else if (filtre(chemin)) sortie.push(chemin);
    }
  })(dossier);
  return sortie;
}

/* Les caractères du code, des recettes, des fondamentaux et de la page d'accueil. */
export function caracteresDuCarnet(racine = RACINE) {
  const fichiers = [join(racine, "index.html"), ...lister(join(racine, "js"), c => c.endsWith(".js")), ...lister(join(racine, "css"), c => c.endsWith(".css"))];
  const vus = new Set();
  for (const f of fichiers) for (const c of readFileSync(f, "utf8")) vus.add(c.codePointAt(0));
  return vus;
}

/* Tous les caractères que sait dessiner une police (woff2 ou sfnt) : on demande à
   l'outil un sous-ensemble de tout le plan de base, puis on lit sa table cmap. */
const TOUT = Array.from({ length: 0xd800 - 0x20 }, (_, i) => String.fromCharCode(0x20 + i)).join("");
export async function caracteresDe(tampon) {
  const sfnt = await subsetFont(tampon, TOUT, { targetFormat: "sfnt", keepFeatures: [], noHinting: true });
  return lireCmap(sfnt);
}

/* La table cmap, sous-tables de format 4 et 12 (les seules que ces polices emploient). */
function lireCmap(octets) {
  const v = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  const n = v.getUint16(4);
  let cmap = null;
  for (let i = 0; i < n; i++) {
    const e = 12 + i * 16;
    if (String.fromCharCode(v.getUint8(e), v.getUint8(e + 1), v.getUint8(e + 2), v.getUint8(e + 3)) === "cmap") cmap = v.getUint32(e + 8);
  }
  if (cmap === null) throw new Error("table cmap introuvable");
  const caracteres = new Set();
  const nb = v.getUint16(cmap + 2);
  for (let i = 0; i < nb; i++) {
    const debut = cmap + v.getUint32(cmap + 4 + i * 8 + 4);
    const format = v.getUint16(debut);
    if (format === 4) {
      const segs = v.getUint16(debut + 6) / 2;
      const fins = debut + 14, debuts = fins + segs * 2 + 2, deltas = debuts + segs * 2, decalages = deltas + segs * 2;
      for (let s = 0; s < segs; s++) {
        const fin = v.getUint16(fins + s * 2), deb = v.getUint16(debuts + s * 2);
        for (let c = deb; c <= fin && c < 0xffff; c++) {
          const d = v.getUint16(decalages + s * 2);
          const glyphe = d === 0 ? (c + v.getInt16(deltas + s * 2)) & 0xffff : v.getUint16(decalages + s * 2 + d + (c - deb) * 2);
          if (glyphe) caracteres.add(c);
        }
      }
    } else if (format === 12) {
      const groupes = v.getUint32(debut + 12);
      for (let g = 0; g < groupes; g++) {
        const deb = v.getUint32(debut + 16 + g * 12), fin = v.getUint32(debut + 20 + g * 12);
        for (let c = deb; c <= fin; c++) caracteres.add(c);
      }
    }
  }
  return caracteres;
}

/* « U+0020-007E, U+00A0 » : les plages d'un ensemble de caractères. */
export function plages(ensemble) {
  const tries = [...ensemble].sort((a, b) => a - b);
  const sortie = [];
  for (let i = 0; i < tries.length;) {
    let j = i;
    while (tries[j + 1] === tries[j] + 1) j++;
    const h = c => c.toString(16).toUpperCase().padStart(4, "0");
    sortie.push(i === j ? `U+${h(tries[i])}` : `U+${h(tries[i])}-${h(tries[j])}`);
    i = j + 1;
  }
  return sortie.join(", ");
}

/* Le jeu de caractères d'une police : ce qu'on y met = ce qu'on veut ∩ ce que la
   source sait dessiner. */
export async function jeuDe(police, racine = RACINE) {
  const source = readFileSync(join(racine, "tools", "sources-polices", `${police.source}.woff2`));
  const dessinables = await caracteresDe(source);
  const voulus = police.texte === "titre"
    ? new Set([...TEXTE_TITRE].map(c => c.codePointAt(0)))
    : new Set([...BASE, ...caracteresDuCarnet(racine)].filter(c => c >= 0x20 && c < 0x2e80));
  return { source, jeu: new Set([...voulus].filter(c => dessinables.has(c))) };
}

const FACES = [
  { famille: "Cormorant Garamond", style: "normal", poids: "500 700", affichage: "swap", police: "cormorant", note: "Les titres des cartes : préchargée (index.html)." },
  { famille: "Cormorant Garamond", style: "italic", poids: "500", affichage: "swap", police: "cormorant-italique", note: "Seul l'italique 500 est utilisé." },
  { famille: "Caveat", style: "normal", poids: "500 700", affichage: "swap", police: "caveat", note: "Les annotations manuscrites des vues : jamais préchargée, la page la demande\n   à l'ouverture d'une vue (main.js la tire au repos après le premier affichage)." },
  { famille: "Caveat Titre", style: "normal", poids: "500 700", affichage: "block", police: "caveat-titre", note: "Le bandeau de l'accueil seulement : préchargée, `block` (voir tools/polices.mjs)." }
];

async function main() {
  const jeux = new Map();
  let total = 0;
  for (const police of POLICES) {
    const { source, jeu } = await jeuDe(police);
    const texte = String.fromCodePoint(...jeu);
    const sortie = await subsetFont(source, texte, { targetFormat: "woff2", noHinting: true, keepFeatures: FONCTIONNALITES });
    writeFileSync(join(RACINE, "fonts", `${police.fichier}.woff2`), sortie);
    jeux.set(police.fichier, jeu);
    total += sortie.length;
    console.log(`fonts/${police.fichier}.woff2 : ${source.length} → ${sortie.length} octets, ${jeu.size} caractères`);
  }
  const css = [
    "/* Polices hébergées : plus aucun appel à Google, et le carnet garde sa typographie hors ligne.",
    "   Fichier écrit par tools/polices.mjs (sous-ensembles des polices d'origine) : ne pas modifier à la main. */",
    ...FACES.map(f => `
/* ${f.note} */
@font-face {
  font-family: "${f.famille}";
  font-style: ${f.style};
  font-weight: ${f.poids};
  font-display: ${f.affichage};
  src: url("../fonts/${f.police}.woff2") format("woff2");
  unicode-range: ${plages(jeux.get(f.police))};
}`)
  ].join("\n") + "\n";
  writeFileSync(join(RACINE, "css", "polices.css"), css);
  console.log(`css/polices.css écrit — ${total} octets de polices au total.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
