/* Les figures des savoirs : des données (js/figures.js) vers du SVG.

   Tout ce module est PUR : des fonctions qui reçoivent une figure (un objet) et
   rendent une chaîne de balisage. Il ne touche ni `document` ni `window` au
   chargement, il s'importe donc tel quel sous Node et tests/unit/figures.test.mjs
   le teste sans navigateur. Seuls `observerFigures` et `ouvrirZoom` (en bas)
   lisent le DOM, et seulement quand on les appelle.

   Le format d'une figure est documenté en tête de js/figures.js ; la palette
   (classes fg-…) et les marqueurs de flèche, dans css/figures.css.

   Une figure est toujours dessinée dans une boîte de 320 unités de large (la
   largeur d'un téléphone étroit) : le SVG est mis à 100 % de la largeur de la page
   par le CSS, et le texte garde donc ses proportions. Le texte du SVG n'est jamais
   plus petit que 11,5 unités ; les types calculés (courbe, échelle, barres, étapes,
   comparaison) mesurent leurs textes pour les couper à la bonne largeur et pour
   éviter que deux étiquettes se chevauchent. */

import { typo } from "../core/format.js";
import { esc } from "../core/html.js";

export const TYPES = ["courbe", "echelle", "barres", "etapes", "svg", "comparaison"];
export const EMPLACEMENTS = ["tete", "cas", "reperes", "pourquoi"];
/* Les tons : le nom d'une famille de classes (fg-t-<ton>, fg-f-<ton>, fg-txt-<ton>). */
export const TONS = ["vert", "or", "terra", "bleu", "encre", "doux"];
export const LARGEUR = 320;

/* Taille des textes, en unités du SVG. Le rendu à 360 px de large ne les réduit pas. */
const T_PETIT = 11.5, T_NORMAL = 13, T_SCRIPT = 17;
const INTERLIGNE = 14.5, INTERLIGNE_PETIT = 13.5, INTERLIGNE_SCRIPT = 17;

/* ---------- Petits outils ---------- */

/* Un nombre pour un attribut : une décimale au plus, jamais « -0 ». */
const n = v => { const r = Math.round(v * 10) / 10; return Object.is(r, -0) ? 0 : r; };

/* La typographie du carnet (core/format.js) plus l'espace fine insécable devant « % », que typo() ne pose pas. */
const typoFig = s => typo(String(s ?? "")).replace(/(\S)[\u00a0\u202f ]+%/g, "$1\u202f%")
  /* Un nombre ne se sépare jamais de son unité, à la ligne non plus : « 20 g », « 12 heures ». */
  .replace(/(\d)[\u00a0\u202f ]+(mg|mm|m|s|j|jours?|heures?|minutes?|secondes?|semaines?|mois|ans?|fois)(?![\p{L}\d'’])/gu, "$1\u00a0$2");
const e = s => esc(typoFig(s));

/* « 12,5 » et le vrai signe moins : la règle d'un nombre affiché. */
export const nombreFr = v => String(v).replace("-", "−").replace(".", ",");

/* Une valeur avec son unité : « 150 °C » (insécable), « 40 % » (fine insécable). */
export const valeurUnite = (v, unite) => {
  const num = typeof v === "number" ? nombreFr(v) : String(v);
  if (!unite) return num;
  return num + (unite === "%" ? " %" : " " + unite);
};

const ton = (t, defaut = "vert") => (TONS.includes(t) ? t : defaut);
/* Le ton d'un aplat clair : « encre » et « doux » n'ont qu'un gris neutre. */
const fondClair = t => (t === "encre" || t === "doux" ? "fg-f-doux" : `fg-f-${t}-l`);
const classeTexteTon = t => (t === "encre" ? "" : ` fg-txt-${t}`);

const nombres = (...xs) => xs.every(x => typeof x === "number" && Number.isFinite(x));

/* ---------- Mesure du texte ---------- */

/* La police est celle du système : on ne peut pas la mesurer sous Node. On
   l'estime caractère par caractère, un peu large (celle d'un Linux sans police
   système est la plus large) : une étiquette qui passe ici passe partout. */
function largeurCar(c) {
  if (c === " " || c === " " || c === " ") return 0.28;
  if ("iIl.,;:'’!|".includes(c)) return 0.29;
  if ("ftjr()[]/-–·".includes(c)) return 0.4;
  if ("mM".includes(c)) return 0.92;
  if ("wW%@".includes(c)) return 0.95;
  if (c >= "A" && c <= "Z") return 0.68;
  if (c >= "0" && c <= "9") return 0.58;
  if (c.codePointAt(0) > 0x2000) return 1;
  return 0.57;
}

export function largeurTexte(s, taille = T_NORMAL, { gras = false, script = false } = {}) {
  let w = 0;
  for (const c of String(s)) w += largeurCar(c);
  return w * taille * (gras ? 1.08 : 1) * (script ? 0.78 : 1);
}

/* Coupe un texte en lignes qui tiennent dans `max` unités. Les espaces insécables
   ne coupent jamais ; un retour à la ligne explicite (\n) est respecté. Un mot
   plus long que la ligne reste entier, il dépassera : c'est à l'auteur d'abréger. */
export function enrouler(texte, max, opts = {}) {
  const taille = opts.taille || T_NORMAL;
  const lignes = [];
  for (const para of typoFig(texte).split("\n")) {
    let ligne = "";
    for (const mot of para.split(" ").filter(Boolean)) {
      const essai = ligne ? ligne + " " + mot : mot;
      if (ligne && largeurTexte(essai, taille, opts) > max) { lignes.push(ligne); ligne = mot; }
      else ligne = essai;
    }
    lignes.push(ligne);
  }
  return lignes;
}

const largeurMax = (lignes, taille, opts) => Math.max(0, ...lignes.map(l => largeurTexte(l, taille, opts)));

/* Un <text> sur plusieurs lignes. `y` est la ligne de base de la PREMIÈRE ligne. */
function texte(x, y, lignes, { cls = "fg-txt", ancre = "middle", inter = INTERLIGNE } = {}) {
  const ls = Array.isArray(lignes) ? lignes : [lignes];
  const corps = ls.map((l, i) => `<tspan x="${n(x)}"${i ? ` dy="${inter}"` : ""}>${esc(l)}</tspan>`).join("");
  return `<text class="${cls}" x="${n(x)}" y="${n(y)}" text-anchor="${ancre}">${corps}</text>`;
}

/* Répartit des étiquettes sur des rangées successives pour qu'aucune ne chevauche
   sa voisine. `items` : { x (centre voulu), w }. Chacun reçoit { x0, rang } : son bord
   gauche (ramené dans [min, max]) et le premier rang où il tient. `occupe[rang]` :
   des intervalles déjà pris. Gloutonne, de gauche à droite : suffisant pour une
   poignée d'étiquettes, et déterministe. `depart(i)` : le premier rang essayé, `pas(i)` : le
   saut d'un rang à l'autre (2 pour rester du même côté d'une règle). */
function repartir(items, { min = 4, max = LARGEUR - 4, ecart = 6, occupe = [], depart = () => 0, pas = () => 1 } = {}) {
  const rangs = occupe.map(r => r.slice());
  const sortie = items.map(() => null);
  const ordre = items.map((_, i) => i).sort((a, b) => items[a].x - items[b].x);
  for (const i of ordre) {
    const it = items[i];
    const x0 = Math.min(Math.max(it.x - it.w / 2, min), Math.max(min, max - it.w));
    const x1 = x0 + it.w;
    let r = depart(i);
    for (;; r += pas(i)) {
      rangs[r] = rangs[r] || [];
      if (!rangs[r].some(([a, b]) => x0 < b + ecart && x1 > a - ecart)) { rangs[r].push([x0, x1]); break; }
    }
    sortie[i] = { x0, rang: r };
  }
  return sortie;
}

/* Des graduations « rondes » entre min et max (1, 2, 2,5, 5 × 10^k). */
export function graduationsAuto(min, max, cible = 5) {
  if (!(max > min)) return [min];
  const brut = (max - min) / cible;
  const p = 10 ** Math.floor(Math.log10(brut));
  const pas = [1, 2, 2.5, 5, 10].map(m => m * p).find(s => s >= brut) || 10 * p;
  const sortie = [];
  for (let v = Math.ceil(min / pas - 1e-9) * pas; v <= max + 1e-9; v += pas) sortie.push(Math.round(v * 1e6) / 1e6 + 0);   // + 0 : jamais « -0 »
  return sortie;
}

/* Courbe lisse par interpolation monotone (Fritsch-Carlson) : elle passe par les
   points sans jamais déborder au-dessus d'un maximum ni sous un minimum — une
   courbe qualitative ne doit pas inventer de bosse. Points en pixels, x croissants. */
export function cheminLisse(pts) {
  if (pts.length < 2) return "";
  const d = `M${n(pts[0][0])} ${n(pts[0][1])}`;
  if (pts.length === 2) return d + `L${n(pts[1][0])} ${n(pts[1][1])}`;
  const m = pts.map(() => 0);
  const pentes = pts.slice(1).map((p, i) => (p[1] - pts[i][1]) / ((p[0] - pts[i][0]) || 1e-9));
  m[0] = pentes[0];
  m[pts.length - 1] = pentes[pentes.length - 1];
  for (let i = 1; i < pts.length - 1; i++) m[i] = pentes[i - 1] * pentes[i] <= 0 ? 0 : (pentes[i - 1] + pentes[i]) / 2;
  for (let i = 0; i < pentes.length; i++) {
    if (pentes[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / pentes[i], b = m[i + 1] / pentes[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * pentes[i]; m[i + 1] = k * b * pentes[i]; }
  }
  let sortie = d;
  for (let i = 0; i < pts.length - 1; i++) {
    const h = pts[i + 1][0] - pts[i][0];
    sortie += `C${n(pts[i][0] + h / 3)} ${n(pts[i][1] + m[i] * h / 3)} ${n(pts[i + 1][0] - h / 3)} ${n(pts[i + 1][1] - m[i + 1] * h / 3)} ${n(pts[i + 1][0])} ${n(pts[i + 1][1])}`;
  }
  return sortie;
}

/* ---------- Le cadre ---------- */

/* Les identifiants (marqueurs, titres) doivent être uniques dans la page : une page
   porte plusieurs figures, et la feuille d'un savoir peut s'ouvrir par-dessus. */
let compteur = 0;
const uidSuivant = () => "f" + (++compteur);

/* Les pointes de flèche, deux jeux par ton. Dans un SVG libre : marker-end="url(#fg-fl-vert)"
   pour la pointe d'arrivée, marker-start="url(#fg-fd-vert)" pour celle de départ (une cote
   à double flèche). Les tons : encre, vert, or, terra, bleu, doux. */
const marqueurs = uid => TONS.map(t =>
  `<marker id="fg-${uid}-fl-${t}" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path class="fg-mk fg-mk-${t}" d="M1 1.5L9 5L1 8.5Z"/></marker>` +
  `<marker id="fg-${uid}-fd-${t}" viewBox="0 0 10 10" refX="2.5" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto"><path class="fg-mk fg-mk-${t}" d="M9 1.5L1 5L9 8.5Z"/></marker>`).join("");

/* Le balisage SVG libre d'un auteur : les références aux marqueurs du cadre
   (#fg-fl-vert, #fg-fd-vert), aux symboles (#fg-sym-flamme) et aux identifiants qu'il
   pose lui-même (fg-@-halo) reçoivent l'identifiant de CETTE figure ; un <use> sans
   classe prend le ton par défaut de son symbole ; la typographie française passe
   sur les textes. */
function habiller(corps, uid) {
  return String(corps || "")
    .replace(/#fg-fl-/g, `#fg-${uid}-fl-`)
    .replace(/#fg-fd-/g, `#fg-${uid}-fd-`)
    .replace(/<use\b([^>]*?)(\/?)>/g, (m, attrs, fin) => {
      const nom = (attrs.match(/href="#fg-sym-([a-z0-9-]+)"/) || [])[1];
      const ton = nom && SYMBOLES[nom] && !/\bclass=/.test(attrs) ? ` class="fg-sy-${SYMBOLES[nom].ton}"` : "";
      return `<use${attrs.replace(/#fg-sym-/g, `#fg-${uid}-sym-`)}${ton}${fin}>`;
    })
    .replace(/fg-@/g, `fg-${uid}`)
    .replace(/>([^<>]+)</g, (m, s) => ">" + typoFig(s) + "<");
}

const flecheDe = (uid, t) => `url(#fg-${uid}-fl-${t})`;

/* Un trait ou une flèche, en une ligne. */
const ligne = (x1, y1, x2, y2, cls, extra = "") =>
  `<line class="${cls}" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"${extra}/>`;

/* ---------- Les symboles partagés ---------- */

/* Une bibliothèque de petits dessins que les `corps` des figures appellent par
   <use href="#fg-sym-NOM" x y width height/> (ou avec un transform). Le cadre
   n'injecte dans chaque figure que les <symbol> utilisés, avec des identifiants
   propres à la figure (comme les marqueurs). Chaque symbole est dessiné dans sa
   boîte `vb` à sa taille d'usage : width et height la mettent à l'échelle, traits
   compris. Aucune couleur en dur : des classes fg-sy-… (css/figures.css) qui lisent
   deux variables, --sy-t (le trait, ou le plein) et --sy-f (la teinte claire), posées
   par la classe de TON de la balise <use> : class="fg-sy-bleu". Sans classe, le
   cadre pose le ton par défaut du symbole (`ton` ci-dessous). */
export const SYMBOLES = {
  /* ----- cuisine ----- */
  poele: { vb: "0 0 72 26", ton: "encre", desc: "poêle, en coupe, avec son manche",
    corps: `<path class="fg-sy-t fg-sy-e" d="M4 4L9 20Q10 23 13 23H47Q50 23 51 20L56 4"/><path class="fg-sy-t fg-sy-e" d="M55 8H70"/>` },
  casserole: { vb: "0 0 58 44", ton: "encre", desc: "casserole, en coupe, avec son manche",
    corps: `<path class="fg-sy-t fg-sy-e" d="M9 4V35Q9 40 14 40H40Q45 40 45 35V4"/><path class="fg-sy-t fg-sy-e" d="M45 10H57"/>` },
  flamme: { vb: "0 0 24 30", ton: "terra", desc: "flamme",
    corps: `<path class="fg-sy-p" d="M12 2C13 9 21 12 21 20A9 9 0 0 1 3 20C3 15 6 13 7 8C9 10 10 9 12 2Z"/><path class="fg-sy-i" d="M12 14C13 18 16 19 16 23A4 4 0 0 1 8 23C8 20 11 19 12 14Z"/>` },
  vapeur: { vb: "0 0 14 32", ton: "bleu", desc: "volute de vapeur",
    corps: `<path class="fg-sy-t" d="M7 30C1 24 13 20 7 15C1 10 13 6 7 2"/>` },
  goutte: { vb: "0 0 16 22", ton: "bleu", desc: "goutte",
    corps: `<path class="fg-sy-p" d="M8 1C8 1 2 9 2 14A6 6 0 0 0 14 14C14 9 8 1 8 1Z"/><path class="fg-sy-s fg-sy-fin" d="M5 14A3 3 0 0 0 8 17"/>` },
  bulle: { vb: "0 0 18 18", ton: "bleu", desc: "bulle",
    corps: `<circle class="fg-sy-f" cx="9" cy="9" r="7.5"/><path class="fg-sy-t fg-sy-fin" d="M5.5 8.5A3.8 3.8 0 0 1 9 5.2"/>` },
  couteau: { vb: "0 0 72 15", ton: "encre", desc: "couteau de cuisine, de profil",
    corps: `<path class="fg-sy-f" d="M44 3H16Q7 4 2 12Q3 13 7 13H44Z"/><rect class="fg-sy-p" x="44" y="3" width="26" height="9" rx="3.5"/><circle class="fg-sy-k" cx="52" cy="7.5" r="1.1"/><circle class="fg-sy-k" cx="62" cy="7.5" r="1.1"/>` },
  thermometre: { vb: "0 0 14 40", ton: "terra", desc: "thermomètre à alcool",
    corps: `<rect class="fg-sy-n" x="4.5" y="1.5" width="5" height="27" rx="2.5"/><circle class="fg-sy-n" cx="7" cy="33" r="5.5"/><path class="fg-sy-t fg-sy-e" d="M7 33V15"/><circle class="fg-sy-p" cx="7" cy="33" r="3.4"/><path class="fg-sy-n fg-sy-fin" d="M11.5 7H13.2M11.5 12H13.2M11.5 17H13.2"/>` },
  /* ----- matière ----- */
  "grains-sel-sucre": { vb: "0 0 184 8", ton: "encre", desc: "une rangée de 11 grains, du sel (le ton) et du sucre (doré) en alternance, sur 184 unités",
    corps: `<rect class="fg-sy-f fg-sy-fin" x="5" y="1" width="6" height="6" rx="1.5"/><rect class="fg-sy-f fg-sy-fin" x="38" y="1" width="6" height="6" rx="1.5"/><rect class="fg-sy-f fg-sy-fin" x="71" y="1" width="6" height="6" rx="1.5"/><rect class="fg-sy-f fg-sy-fin" x="104" y="1" width="6" height="6" rx="1.5"/><rect class="fg-sy-f fg-sy-fin" x="137" y="1" width="6" height="6" rx="1.5"/><rect class="fg-sy-f fg-sy-fin" x="170" y="1" width="6" height="6" rx="1.5"/><rect class="fg-sy-sucre" x="21.5" y="1" width="7" height="6" rx="1.5"/><rect class="fg-sy-sucre" x="54.5" y="1" width="7" height="6" rx="1.5"/><rect class="fg-sy-sucre" x="87.5" y="1" width="7" height="6" rx="1.5"/><rect class="fg-sy-sucre" x="120.5" y="1" width="7" height="6" rx="1.5"/><rect class="fg-sy-sucre" x="153.5" y="1" width="7" height="6" rx="1.5"/>` },
  pelote: { vb: "0 0 20 20", ton: "terra", desc: "protéine repliée sur elle-même : un disque et sa pelote",
    corps: `<circle class="fg-sy-f" cx="10" cy="10" r="8.5"/><path class="fg-sy-t fg-sy-fin" d="M6 12C4 5 14 4 14 9C14 13 9 13 9 9"/>` },
  cellule: { vb: "0 0 56 44", ton: "vert", desc: "cellule végétale : paroi, vacuole, noyau",
    corps: `<rect class="fg-sy-f fg-sy-e" x="2" y="2" width="52" height="40" rx="9"/><path class="fg-sy-v" d="M12 17C12 9 22 8 30 9C38 10 43 15 42 24C41 32 33 36 24 35C15 34 12 26 12 17Z"/><circle class="fg-sy-p" cx="46" cy="12" r="3.8"/><circle class="fg-sy-k" cx="46" cy="12" r="1.2"/><ellipse class="fg-sy-p" cx="47" cy="32" rx="3" ry="1.8"/><ellipse class="fg-sy-p" cx="9" cy="35.5" rx="3" ry="1.8"/>` },
  "grain-sel": { vb: "0 0 8 8", ton: "encre", desc: "grain de sel ou de sucre",
    corps: `<rect class="fg-sy-f fg-sy-fin" x="1" y="1" width="6" height="6" rx="1.5"/>` },
  cristal: { vb: "0 0 24 24", ton: "encre", desc: "cristal à facettes",
    corps: `<path class="fg-sy-f" d="M12 2L21 8V16L12 22L3 16V8Z"/><path class="fg-sy-t fg-sy-fin" d="M3 8L12 12L21 8M12 12V22"/>` },
  bacterie: { vb: "0 0 32 16", ton: "terra", desc: "bactérie en bâtonnet, avec son flagelle",
    corps: `<rect class="fg-sy-f" x="2" y="3" width="22" height="10" rx="5"/><path class="fg-sy-t fg-sy-fin" d="M24 8C26 4 28 12 30 8"/><circle class="fg-sy-p" cx="9" cy="8" r="1.4"/><circle class="fg-sy-p" cx="15" cy="8" r="1.4"/>` },
  larve: { vb: "0 0 24 24", ton: "terra", desc: "larve enroulée en spirale",
    corps: `<path class="fg-sy-t fg-sy-e" d="M11.5 12a1.5 1.5 0 0 1 3 0 3.5 3.5 0 0 1-7 0 5.5 5.5 0 0 1 11 0 7.5 7.5 0 0 1-15 0"/>` },
  oeuf: { vb: "0 0 24 30", ton: "or", desc: "œuf, en contour",
    corps: `<path class="fg-sy-f" d="M12 2C6.5 2 2.5 12 2.5 18.5A9.5 9.5 0 0 0 21.5 18.5C21.5 12 17.5 2 12 2Z"/>` },
  feuille: { vb: "0 0 30 24", ton: "vert", desc: "feuille et sa nervure",
    corps: `<path class="fg-sy-f" d="M3 21C3 9 12 3 27 3C27 15 20 21 3 21Z"/><path class="fg-sy-t fg-sy-fin" d="M3 21C10 14 17 10 24 6"/>` },
  emulsifiant: { vb: "0 0 16 46", ton: "bleu", desc: "molécule d'émulsifiant : tête qui aime l'eau (en haut), queue qui aime le gras",
    corps: `<circle class="fg-sy-p" cx="8" cy="8" r="8"/><path class="fg-sy-q" d="M5 16q-3 8 0 16t0 14M11 16q3 8 0 16t0 14"/>` },
  "ion-plus": { vb: "0 0 16 16", ton: "terra", desc: "ion positif (signe +)",
    corps: `<circle class="fg-sy-p" cx="8" cy="8" r="7.5"/><path class="fg-sy-s" d="M4.5 8H11.5M8 4.5V11.5"/>` },
  "ion-moins": { vb: "0 0 16 16", ton: "bleu", desc: "ion négatif (signe −)",
    corps: `<circle class="fg-sy-p" cx="8" cy="8" r="7.5"/><path class="fg-sy-s" d="M4.5 8H11.5"/>` }
};

/* Les <use> d'un `corps` : seulement href="#fg-sym-NOM" d'un symbole qui existe, avec des attributs
   de placement (x, y, width, height, transform, class, opacity). Rend la liste des problèmes
   (vide : tout va bien) ; le vérificateur s'en sert, et n'autorise aucun autre <use>. */
export function usagesInvalides(corps) {
  const pb = [];
  const OK = new Set(["href", "x", "y", "width", "height", "transform", "class", "opacity"]);
  for (const m of String(corps).matchAll(/<use\b([^>]*)>/g)) {
    const attrs = [...m[1].matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)];
    const reste = m[1].replace(/([\w:-]+)\s*=\s*"([^"]*)"/g, "").replace("/", "").trim();
    if (reste) pb.push(`<use> mal formé : « ${reste} »`);
    const h = attrs.find(a => a[1] === "href");
    if (!h || !/^#fg-sym-[a-z0-9-]+$/.test(h[2])) { pb.push(`<use> : seul href="#fg-sym-NOM" est permis`); continue; }
    if (!SYMBOLES[h[2].slice(8)]) pb.push(`<use> : le symbole « ${h[2].slice(8)} » n'existe pas (${Object.keys(SYMBOLES).join(", ")})`);
    for (const a of attrs) if (!OK.has(a[1])) pb.push(`<use> : attribut « ${a[1]} » non permis`);
    for (const a of attrs) if (a[1] === "transform" && !/^(?:\s*(?:translate|rotate|scale|skewX|skewY)\([\d\s.,-]+\))+\s*$/.test(a[2])) pb.push(`<use> : transform « ${a[2]} » douteux`);
  }
  return pb;
}

/* Les <symbol> d'un balisage déjà habillé : seulement ceux que `corps` appelle. */
function symbolesDe(corps, uid) {
  const vus = new Set();
  for (const m of String(corps).matchAll(new RegExp(`href="#fg-${uid}-sym-([a-z0-9-]+)"`, "g"))) vus.add(m[1]);
  return [...vus].filter(nom => SYMBOLES[nom]).map(nom =>
    `<symbol id="fg-${uid}-sym-${nom}" viewBox="${SYMBOLES[nom].vb}">${SYMBOLES[nom].corps}</symbol>`).join("");
}

/* ---------- Courbe ---------- */

function rendreCourbe(f, uid) {
  const qual = !!f.qualitative;
  const xs = f.x || {}, ys = f.y || {};
  const series = (f.series || []).map(s => ({ ...s, points: (s.points || []).filter(p => nombres(p[0], p[1])).sort((a, b) => a[0] - b[0]) }))
    .filter(s => s.points.length);
  if (!series.length) throw new Error("courbe : aucune série de points");
  const tousX = series.flatMap(s => s.points.map(p => p[0]));
  const tousY = series.flatMap(s => s.points.map(p => p[1]));
  const xmin = xs.min ?? Math.min(...tousX), xmax = xs.max ?? Math.max(...tousX);
  const ymin = ys.min ?? Math.min(0, ...tousY), ymax = ys.max ?? Math.max(...tousY) * 1.1;
  if (!(xmax > xmin) || !(ymax > ymin)) throw new Error("courbe : bornes des axes incohérentes");

  const gradX = xs.graduations || (qual ? [] : graduationsAuto(xmin, xmax));
  const gradY = ys.graduations || (qual ? [] : graduationsAuto(ymin, ymax, 4));
  const gauche = gradY.length ? 40 : 16, droite = 18;
  const pw = LARGEUR - gauche - droite;
  const ph = f.h || 170;
  const px = x => gauche + (x - xmin) / (xmax - xmin) * pw;

  /* En-tête : le titre de l'axe y, puis les étiquettes des zones et des repères verticaux. */
  const zones = (f.zones || []).filter(z => nombres(z.de, z.a));
  const repV = (f.reperes || []).filter(r => nombres(r.x) && r.x >= xmin && r.x <= xmax);
  const repH = (f.reperes || []).filter(r => nombres(r.y));
  const bandes = zones.map(z => ({ z, x0: px(Math.max(z.de, xmin)), x1: px(Math.min(z.a, xmax)) }));

  /* Une étiquette de zone entre dans sa bande (sur une ou deux lignes), sinon elle passe
     au-dessus du tracé, sur UNE ligne, plutôt que de se couper en quatre. */
  const etiqZ = bandes.filter(b => b.z.label).map(b => {
    const dispo = b.x1 - b.x0 - 4;
    let lignes = enrouler(b.z.label, Math.max(dispo, 10), { taille: T_PETIT, gras: true });
    const etroite = lignes.length > 2 || largeurMax(lignes, T_PETIT, { gras: true }) > dispo + 2;
    if (etroite) lignes = enrouler(b.z.label, LARGEUR - 12, { taille: T_PETIT, gras: true });
    return { b, lignes, etroite, w: largeurMax(lignes, T_PETIT, { gras: true }) + 2, x: (b.x0 + b.x1) / 2 };
  });
  const etiqR = repV.filter(r => r.label).map(r => {
    const lignes = enrouler(r.label, 96, { taille: T_PETIT });
    return { r, lignes, w: largeurMax(lignes, T_PETIT) + 2, x: px(r.x) };
  });
  /* Les zones qui tiennent dans leur bande, au rang 0 (au ras du tracé) ; les étroites et les
     repères prennent ensuite le premier rang libre. */
  const rangsPris = [[]];
  const posZ = etiqZ.map(it => it.etroite ? null : { x0: it.x - it.w / 2, rang: 0 });
  posZ.forEach((p, i) => { if (p) rangsPris[0].push([p.x0, p.x0 + etiqZ[i].w]); });
  const etroites = etiqZ.map((it, i) => (it.etroite ? i : -1)).filter(i => i >= 0);
  repartir(etroites.map(i => etiqZ[i]), { min: gauche - 8, max: LARGEUR - 6, occupe: rangsPris }).forEach((p, k) => {
    posZ[etroites[k]] = p;
    (rangsPris[p.rang] = rangsPris[p.rang] || []).push([p.x0, p.x0 + etiqZ[etroites[k]].w]);
  });
  for (let r = 0; r < rangsPris.length; r++) rangsPris[r] = rangsPris[r] || [];
  etiqZ.forEach((it, i) => { it.x = posZ[i].x0 + it.w / 2; });
  const posR = repartir(etiqR, { min: gauche - 8, max: LARGEUR - 6, occupe: rangsPris });
  const nbRangs = Math.max(etiqZ.length ? 1 : 0, ...posZ.map(p => p.rang + 1), ...posR.map(p => p.rang + 1), 0);
  const hRang = Array.from({ length: nbRangs }, (_, r) => {
    const lignes = Math.max(0, ...etiqZ.filter((_, i) => posZ[i].rang === r).map(it => it.lignes.length),
      ...etiqR.filter((_, i) => posR[i].rang === r).map(it => it.lignes.length));
    return lignes * INTERLIGNE_PETIT + 4;
  });
  const hEntete = hRang.reduce((a, b) => a + b, 0);

  const yLabelH = ys.label ? 18 : 6;
  const py0 = yLabelH + hEntete + 6;
  const py1 = py0 + ph;
  const py = y => py1 - (y - ymin) / (ymax - ymin) * ph;

  let corps = "";
  /* Les bandes verticales, sous tout le reste. */
  for (const b of bandes) {
    corps += `<rect class="${fondClair(ton(b.z.ton, "or"))} fg-bande" x="${n(b.x0)}" y="${n(py0)}" width="${n(b.x1 - b.x0)}" height="${ph}"/>`;
  }
  /* Les bandes horizontales (zonesY) : un seuil, une plage de valeurs, étiquetée dans la bande. */
  const zonesY = (f.zonesY || []).filter(z => nombres(z.de, z.a) && z.a > z.de && z.a > ymin && z.de < ymax);
  for (const z of zonesY) {
    const t = ton(z.ton, "or");
    const y0 = py(Math.min(z.a, ymax)), y1 = py(Math.max(z.de, ymin));
    corps += `<rect class="${fondClair(t)} fg-bande" x="${gauche}" y="${n(y0)}" width="${n(pw)}" height="${n(y1 - y0)}"/>`;
    if (z.label) {
      const droite = z.ancre === "droite";
      const yt = y1 - y0 >= 17 ? y0 + 12.5 : (y0 + y1) / 2 + 4;
      corps += texte(droite ? gauche + pw - 5 : gauche + 6, yt, enrouler(z.label, pw - 14, { taille: T_PETIT, gras: true }).slice(0, 1),
        { cls: `fg-txt fg-txt-s fg-txt-b${classeTexteTon(t)}`, ancre: droite ? "end" : "start" });
    }
  }
  /* Grille horizontale très discrète, et graduations. */
  for (const g of gradY) {
    if (g <= ymin || g > ymax) continue;
    corps += ligne(gauche, py(g), gauche + pw, py(g), "fg-t-grille");
  }
  /* Axes, avec flèche au bout. */
  corps += `<line class="fg-t-axe" x1="${gauche}" y1="${n(py1)}" x2="${n(gauche + pw + 4)}" y2="${n(py1)}" marker-end="${flecheDe(uid, "encre")}"/>`;
  corps += `<line class="fg-t-axe" x1="${gauche}" y1="${n(py1)}" x2="${gauche}" y2="${n(py0 - 8)}" marker-end="${flecheDe(uid, "encre")}"/>`;
  if (ys.label) {
    const lib = ys.unite && !ys.label.includes(ys.unite) ? `${ys.label} (${ys.unite})` : ys.label;
    corps += texte(4, 12, enrouler(lib, LARGEUR - 8, { taille: T_PETIT, gras: true }).slice(0, 1), { cls: "fg-txt fg-txt-s fg-txt-b", ancre: "start" });
  }
  for (const g of gradX) {
    if (g < xmin || g > xmax) continue;
    corps += ligne(px(g), py1, px(g), py1 + 4, "fg-t-axe");
    corps += texte(px(g), py1 + 17, [nombreFr(g)], { cls: "fg-txt fg-txt-s", ancre: g === xmin && px(g) - gauche < 10 ? "middle" : "middle" });
  }
  for (const g of gradY) {
    if (g < ymin || g > ymax) continue;
    corps += ligne(gauche - 4, py(g), gauche, py(g), "fg-t-axe");
    corps += texte(gauche - 7, py(g) + 4, [nombreFr(g)], { cls: "fg-txt fg-txt-s", ancre: "end" });
  }

  /* Repères horizontaux. */
  for (const r of repH) {
    if (r.y < ymin || r.y > ymax) continue;
    const t = ton(r.ton, "encre");
    corps += ligne(gauche, py(r.y), gauche + pw, py(r.y), `fg-t-${t} fg-t-fin fg-tirets`);
    if (r.label) {
      const gauchee = r.ancre === "gauche";
      corps += texte(gauchee ? gauche + 6 : gauche + pw - 2, py(r.y) - 5, enrouler(r.label, 150, { taille: T_PETIT }).slice(0, 1), { cls: `fg-txt fg-txt-s fg-halo${classeTexteTon(t)}`, ancre: gauchee ? "start" : "end" });
    }
  }
  /* Repères verticaux et étiquettes d'en-tête : le rang r occupe la bande dont le
     bas est à py0 - 4 - (hauteur des rangs plus proches du tracé). */
  const basRang = r => py0 - 4 - hRang.slice(0, r).reduce((a, b) => a + b, 0);
  etiqR.forEach((it, i) => {
    const t = ton(it.r.ton, "encre");
    const rang = posR[i].rang;
    corps += texte(posR[i].x0 + it.w / 2, basRang(rang) - 3 - (it.lignes.length - 1) * INTERLIGNE_PETIT, it.lignes, { cls: `fg-txt fg-txt-s${classeTexteTon(t)}`, inter: INTERLIGNE_PETIT });
    corps += ligne(it.x, basRang(rang), it.x, py1, `fg-t-${t} fg-t-fin fg-tirets`);
  });
  repV.filter(r => !r.label).forEach(r => {
    corps += ligne(px(r.x), py0, px(r.x), py1, `fg-t-${ton(r.ton, "encre")} fg-t-fin fg-tirets`);
  });
  etiqZ.forEach((it, i) => {
    const t = ton(it.b.z.ton, "or");
    corps += texte(it.x, basRang(posZ[i].rang) - 3 - (it.lignes.length - 1) * INTERLIGNE_PETIT, it.lignes, { cls: `fg-txt fg-txt-s fg-txt-b${classeTexteTon(t)}`, inter: INTERLIGNE_PETIT });
  });

  /* Les séries. */
  series.forEach((s, k) => {
    const t = ton(s.ton, ["terra", "vert", "bleu", "or"][k % 4]);
    const pts = s.points.map(p => [px(p[0]), py(p[1])]);
    const d = s.lisse === false ? "M" + pts.map(p => `${n(p[0])} ${n(p[1])}`).join("L") : cheminLisse(pts);
    if (s.aire) corps += `<path class="${fondClair(t)} fg-aire" d="${d}L${n(pts[pts.length - 1][0])} ${n(py1)}L${n(pts[0][0])} ${n(py1)}Z"/>`;
    corps += `<path class="fg-t-${t} fg-t-epais${s.tirets ? " fg-tirets" : " fg-trace"}" pathLength="1" d="${d}"/>`;
    if (s.marqueurs) for (const p of pts) corps += `<circle class="fg-pt fg-f-${t}" cx="${n(p[0])}" cy="${n(p[1])}" r="3.5"/>`;
  });

  /* Les notes : une annotation « faite main » et sa flèche vers le point. */
  for (const note of f.notes || []) {
    if (!nombres(note.x, note.y) || !note.texte) continue;
    const t = ton(note.ton, "encre");
    const x = px(note.x), y = py(note.y);
    const dx = note.dx ?? (x > gauche + pw * 0.55 ? -16 : 16);
    const dy = note.dy ?? -26;
    const lignes = enrouler(note.texte, note.largeur || 112, { taille: T_SCRIPT, script: true });
    const ancre = note.ancre || (dx < 0 ? "end" : "start");
    const tx = x + dx, ty = y + dy;
    const yBase = dy < 0 ? ty - (lignes.length - 1) * INTERLIGNE_SCRIPT : ty + 12;
    corps += texte(tx, yBase, lignes, { cls: `fg-txt-script fg-halo${classeTexteTon(t)}`, ancre, inter: INTERLIGNE_SCRIPT });
    const sx = ancre === "end" ? tx - 2 : ancre === "start" ? tx + 2 : tx;
    const sy = dy < 0 ? ty + 5 : yBase - 15;
    if (Math.abs(sx - x) < 5) {
      corps += `<path class="fg-t-axe fg-t-fin" d="M${n(sx)} ${n(sy)}L${n(x)} ${n(y + (dy < 0 ? -6 : 6))}" marker-end="${flecheDe(uid, "encre")}"/>`;
    } else {
      const ex = x + Math.sign(sx - x) * 6, ey = y + (dy < 0 ? -5 : 5);
      corps += `<path class="fg-t-axe fg-t-fin" d="M${n(sx)} ${n(sy)}Q${n(sx)} ${n(ey)} ${n(ex)} ${n(ey)}" marker-end="${flecheDe(uid, "encre")}"/>`;
    }
    corps += `<circle class="fg-pt fg-f-${t === "encre" ? "terra" : t}" cx="${n(x)}" cy="${n(y)}" r="3.5"/>`;
  }

  /* Sous l'axe : extrémités qualitatives, titre de l'axe x, légende des séries. */
  let yBas = py1 + (gradX.length ? 17 : 0);
  if (qual && Array.isArray(xs.extremites)) {
    /* Avec des graduations explicites (x.graduations), les extrémités passent une ligne plus bas. */
    const yExt = py1 + (gradX.length ? 31 : 17);
    corps += texte(gauche, yExt, [xs.extremites[0] || ""], { cls: "fg-txt fg-txt-s", ancre: "start" });
    corps += texte(gauche + pw, yExt, [xs.extremites[1] || ""], { cls: "fg-txt fg-txt-s", ancre: "end" });
    yBas = yExt;
  }
  if (xs.label) {
    const lib = xs.unite && !xs.label.includes(xs.unite) ? `${xs.label} (${xs.unite})` : xs.label;
    corps += texte(gauche + pw / 2, yBas + 17, enrouler(lib, pw, { taille: T_PETIT, gras: true }).slice(0, 1), { cls: "fg-txt fg-txt-s fg-txt-b", ancre: "middle" });
    yBas += 17;
  }
  let h = yBas + 10;
  const nommees = series.filter(s => s.nom);
  if (nommees.length > 1) {
    let cx = gauche, cy = h + 6;
    nommees.forEach(s => {
      const k = series.indexOf(s);
      const t = ton(s.ton, ["terra", "vert", "bleu", "or"][k % 4]);
      const w = 22 + largeurTexte(s.nom, T_PETIT) + 14;
      if (cx + w > LARGEUR - 8 && cx > gauche) { cx = gauche; cy += 17; }
      corps += `<line class="fg-t-${t} fg-t-epais${s.tirets ? " fg-tirets" : ""}" x1="${n(cx)}" y1="${n(cy)}" x2="${n(cx + 18)}" y2="${n(cy)}"/>`;
      corps += texte(cx + 24, cy + 4, [s.nom], { cls: "fg-txt fg-txt-s", ancre: "start" });
      cx += w;
    });
    h = cy + 16;
  }
  return { h: Math.ceil(h), corps };
}

/* ---------- Échelle ---------- */

function rendreEchelle(f, uid) {
  const qual = !!f.qualitative;
  const { min, max } = f;
  if (!nombres(min, max) || !(max > min)) throw new Error("échelle : min et max numériques requis");
  const g0 = 16, g1 = LARGEUR - 16, lw = g1 - g0;
  const unite = f.unite || "";

  /* Les coupures : un axe interrompu. Les valeurs de `de` à `a` n'ont plus de place sur la
     règle, remplacée par un blanc de GAP unités barré du signe // (celui du thermomètre). */
  const GAP = 16;
  const coupures = [];
  for (const c of (f.coupures || []).filter(c => c && nombres(c.de, c.a) && c.a > c.de && c.de > min && c.a < max).sort((a, b) => a.de - b.de)) {
    if (!coupures.length || c.de >= coupures[coupures.length - 1].a) coupures.push(c);
  }
  const retire = coupures.reduce((s, c) => s + c.a - c.de, 0);
  const span = (max - min) - retire;
  const utile = lw - coupures.length * GAP;
  if (!(span > 0) || !(utile > 40)) throw new Error("échelle : coupures trop larges");
  /* Une valeur dans une coupure se pose au milieu du blanc, ou à son bord (`dedans`) pour une zone. */
  const px = (v, dedans = "centre") => {
    v = Math.min(Math.max(v, min), max);
    let ret = 0, trous = 0;
    for (const c of coupures) {
      if (v >= c.a) { ret += c.a - c.de; trous++; continue; }
      if (v > c.de) {
        const bord = g0 + (c.de - min - ret) / span * utile + trous * GAP;
        return dedans === "gauche" ? bord : dedans === "droite" ? bord + GAP : bord + GAP / 2;
      }
      break;
    }
    return g0 + (v - min - ret) / span * utile + trous * GAP;
  };
  const trous = coupures.map(c => px(c.de));                   // bord gauche de chaque blanc
  const segments = [];
  let debut = g0;
  for (const t of trous) { segments.push([debut, t]); debut = t + GAP; }
  segments.push([debut, g1]);

  const coteDe = c => (c === "haut" ? 0 : c === "bas" ? 1 : null);
  const marqs = (f.marqueurs || []).filter(m => nombres(m.v) && m.label);

  /* Rangées : avec `rangees: true`, des zones qui se chevauchent passent sur des pistes parallèles. */
  const zonesBrutes = (f.zones || []).filter(z => nombres(z.de, z.a) && z.a > z.de);
  const rangeeDe = new Map();
  let nbRangees = 1;
  if (f.rangees) {
    const fins = [];
    for (const z of [...zonesBrutes].sort((a, b) => a.de - b.de || (b.a - b.de) - (a.a - a.de))) {
      let k = fins.findIndex(fin => fin <= z.de + 1e-9);
      if (k < 0) { k = fins.length; fins.push(0); }
      fins[k] = z.a;
      rangeeDe.set(z, k);
    }
    nbRangees = Math.max(1, fins.length);
  }

  /* Zones : l'étiquette entre dans la bande si elle y tient (sur une ou deux
     lignes), sinon elle monte (ou descend) avec les marqueurs. `cote` la force dehors. */
  let lignesBarre = 1;
  const zInfo = zonesBrutes.map(z => {
    const x0 = px(z.de, "droite"), x1 = px(z.a, "gauche");
    const pieces = segments.map(([a, b]) => [Math.max(a, x0), Math.min(b, x1)]).filter(([a, b]) => b - a > 0.5);
    if (!pieces.length) return null;
    const grande = pieces.reduce((m, p) => (p[1] - p[0] > m[1] - m[0] ? p : m));
    const larg = grande[1] - grande[0] - 8;
    let dedans = null;
    if (z.label && coteDe(z.cote) === null) {
      const lignes = enrouler(z.label, larg, { taille: T_PETIT, gras: true });
      if (lignes.length <= 2 && largeurMax(lignes, T_PETIT, { gras: true }) <= larg) dedans = lignes;
    }
    if (dedans) lignesBarre = Math.max(lignesBarre, dedans.length);
    return { z, x0, x1, pieces, grande, dedans, rangee: rangeeDe.get(z) || 0 };
  }).filter(Boolean);
  const hBarre = 14 + lignesBarre * INTERLIGNE_PETIT;
  const ECART_RANGEES = 5;
  const hRegle = nbRangees * hBarre + (nbRangees - 1) * ECART_RANGEES;

  const items = [];
  for (const zi of zInfo) {
    if (zi.z.label && !zi.dedans) {
      const lignes = enrouler(zi.z.label, 96, { taille: T_PETIT, gras: true });
      items.push({ lignes, w: largeurMax(lignes, T_PETIT, { gras: true }) + 2, x: (zi.x0 + zi.x1) / 2, xc: (zi.x0 + zi.x1) / 2, ton: ton(zi.z.ton, "or"), gras: true, zone: true, cote: coteDe(zi.z.cote) });
    }
  }
  for (const m of marqs) {
    const lignes = enrouler(m.label, 112, { taille: T_PETIT });
    items.push({ lignes, w: largeurMax(lignes, T_PETIT) + 2, x: px(m.v), xc: px(m.v), ton: ton(m.ton, "terra"), marq: true, cote: coteDe(m.cote) });
  }
  /* Haut, bas, haut… : le rang k = 2r est au-dessus (rang r), k = 2r+1 en dessous. Une étiquette
     de `cote` forcé ne saute que de deux rangs : elle reste du même côté. */
  const pos = repartir(items, { min: 4, max: LARGEUR - 4, ecart: 8, depart: i => items[i].cote ?? 0, pas: i => (items[i].cote === null ? 1 : 2) });
  const cote = i => pos[i].rang & 1;            // 0 = au-dessus, 1 = en dessous
  const niveau = i => pos[i].rang >> 1;
  const hRang = (c, r) => {
    const l = Math.max(0, ...items.filter((_, i) => cote(i) === c && niveau(i) === r).map(it => it.lignes.length));
    return l ? l * INTERLIGNE_PETIT + 8 : 0;
  };
  const nbRangs = c => Math.max(0, ...items.map((_, i) => (cote(i) === c ? niveau(i) + 1 : 0)));
  const cumul = (c, r) => { let a = 0; for (let j = 0; j < r; j++) a += hRang(c, j); return a; };
  const hautTotal = cumul(0, nbRangs(0));

  const yBarre = 8 + hautTotal + (hautTotal ? 4 : 0);
  const yFin = yBarre + hRegle;
  let corps = "";
  for (let k = 0; k < nbRangees; k++) {
    for (const [a, b] of segments) corps += `<rect class="fg-f-doux fg-t-doux" x="${n(a)}" y="${n(yBarre + k * (hBarre + ECART_RANGEES))}" width="${n(b - a)}" height="${n(hBarre)}" rx="4"/>`;
  }
  for (const zi of zInfo) {
    const t = ton(zi.z.ton, "or");
    const y = yBarre + zi.rangee * (hBarre + ECART_RANGEES);
    for (const [a, b] of zi.pieces) corps += `<rect class="${fondClair(t)} fg-t-${t} fg-t-fin" x="${n(a)}" y="${n(y)}" width="${n(b - a)}" height="${n(hBarre)}" rx="2"/>`;
    if (zi.dedans) {
      const yb = y + hBarre / 2 - (zi.dedans.length - 1) * INTERLIGNE_PETIT / 2 + 4;
      corps += texte((zi.grande[0] + zi.grande[1]) / 2, yb, zi.dedans, { cls: `fg-txt fg-txt-s fg-txt-b${classeTexteTon(t)}`, inter: INTERLIGNE_PETIT });
    }
  }
  /* Le signe // : deux traits penchés de part et d'autre d'un trait pointillé, sur chaque coupure. */
  for (const t of trous) {
    corps += `<path class="fg-t-axe fg-pointilles" d="M${n(t)} ${n(yBarre + hRegle / 2)}H${n(t + GAP)}"/>`;
    for (const xx of [t + 3, t + GAP - 3]) corps += `<path class="fg-t-axe fg-rupture" d="M${n(xx - 2.6)} ${n(yFin + 5)}L${n(xx + 2.6)} ${n(yBarre - 5)}"/>`;
  }

  /* Graduations (ou extrémités, pour une échelle qualitative). Les bords de chaque coupure
     sont toujours étiquetés, l'un vers la gauche, l'autre vers la droite du blanc. */
  let basTexte = yFin + 4;
  let unitePerdue = false;
  let textesGrad = "";   // posés après les tiges des étiquettes : leur liseré les laisse lisibles
  const brutes = qual ? [] : (f.graduations || graduationsAuto(min, max, 5));
  const bords = coupures.flatMap(c => [{ v: c.de, ancre: "end" }, { v: c.a, ancre: "start" }]);
  const grad = [...bords, ...brutes.filter(g => g >= min && g <= max && !coupures.some(c => g >= c.de && g <= c.a)).map(v => ({ v, ancre: "middle" }))];
  if (grad.length) {
    const boite = (g, lib) => {
      const w = largeurTexte(lib, T_PETIT), x = px(g.v);
      const x0 = g.ancre === "end" ? x - w : g.ancre === "start" ? x : x - w / 2;
      const c = Math.min(Math.max(x0, 2), LARGEUR - 2 - w);
      return [c, c + w];
    };
    const retenir = libs => {
      const gardes = [];
      const ordre = grad.map((g, i) => i).sort((a, b) => (grad[a].ancre === "middle") - (grad[b].ancre === "middle") || px(grad[a].v) - px(grad[b].v));
      for (const i of ordre) {
        const [a, b] = boite(grad[i], libs[i]);
        if (grad[i].ancre !== "middle" || !gardes.some(j => { const [c, d] = boite(grad[j], libs[j]); return a < d + 6 && b > c - 6; })) gardes.push(i);
      }
      return gardes.sort((a, b) => px(grad[a].v) - px(grad[b].v));
    };
    let libs = grad.map(g => valeurUnite(g.v, unite));
    let gardes = retenir(libs);
    if (unite && gardes.length < grad.length) { libs = grad.map(g => nombreFr(g.v)); unitePerdue = true; gardes = retenir(libs); }
    /* La tige d'une étiquette d'en dessous traverse la ligne des graduations : une graduation
       qu'elle toucherait se range à son côté (avant ou après la tige) au lieu d'être barrée. */
    const tiges = items.filter((it, i) => cote(i) === 1).map(it => it.xc);
    for (const i of gardes) {
      const g = grad[i], w = largeurTexte(libs[i], T_PETIT);
      corps += ligne(px(g.v), yFin, px(g.v), yFin + 5, "fg-t-axe");
      let ancre = g.ancre;
      let x = ancre === "end" ? Math.max(px(g.v), 2 + w) : ancre === "start" ? Math.min(px(g.v), LARGEUR - 2 - w) : Math.min(Math.max(px(g.v), 2 + w / 2), LARGEUR - 2 - w / 2);
      const x0 = ancre === "end" ? x - w : ancre === "start" ? x : x - w / 2;
      const tige = tiges.find(t => t > x0 - 2.5 && t < x0 + w + 2.5);
      if (tige !== undefined) {
        if (tige >= px(g.v)) { ancre = "end"; x = Math.min(tige - 4, LARGEUR - 2); }
        else { ancre = "start"; x = Math.max(tige + 4, 2); }
        x = ancre === "end" ? Math.max(x, 2 + w) : Math.min(x, LARGEUR - 2 - w);
      }
      textesGrad += texte(x, yFin + 18, [libs[i]], { cls: "fg-txt fg-txt-s fg-halo", ancre });
    }
    basTexte = yFin + 24;
  } else if (qual && Array.isArray(f.extremites)) {
    corps += texte(g0, yFin + 17, [f.extremites[0] || ""], { cls: "fg-txt fg-txt-s", ancre: "start" });
    corps += texte(g1, yFin + 17, [f.extremites[1] || ""], { cls: "fg-txt fg-txt-s", ancre: "end" });
    basTexte = yFin + 24;
  }

  /* Les étiquettes, au-dessus ou en dessous, avec leur tige. */
  let hFin = basTexte;
  const yBasRangs = basTexte + 2;
  items.forEach((it, i) => {
    const t = it.ton;
    const cls = `fg-txt fg-txt-s${it.gras ? " fg-txt-b" : ""}${classeTexteTon(t)}`;
    const hl = it.lignes.length * INTERLIGNE_PETIT;
    const xTexte = pos[i].x0 + it.w / 2;
    /* Le point se pose sur le bord de la règle, côté étiquette : il ne masque pas les mots des zones. */
    const yPoint = cote(i) === 0 ? yBarre : yFin;
    if (cote(i) === 0) {
      const basBloc = yBarre - 2 - cumul(0, niveau(i));
      corps += texte(xTexte, basBloc - 5 - (it.lignes.length - 1) * INTERLIGNE_PETIT, it.lignes, { cls, inter: INTERLIGNE_PETIT });
      corps += ligne(it.xc, yBarre, it.xc, basBloc, `fg-t-${t} fg-t-fin`);
    } else {
      const hautBloc = yBasRangs + cumul(1, niveau(i));
      corps += texte(xTexte, hautBloc + 11, it.lignes, { cls, inter: INTERLIGNE_PETIT });
      corps += ligne(it.xc, yFin, it.xc, hautBloc + 1, `fg-t-${t} fg-t-fin fg-tirets`);
      hFin = Math.max(hFin, hautBloc + hl + 6);
    }
    if (it.marq) corps += `<circle class="fg-pt fg-f-${t === "encre" ? "terra" : t}" cx="${n(it.xc)}" cy="${n(yPoint)}" r="4.5"/>`;
  });

  corps += textesGrad;

  /* Titre de la règle : la grandeur, et l'unité quand les graduations l'ont perdue. */
  const titre = [f.label, unitePerdue ? `en ${unite}` : ""].filter(Boolean).join(", ");
  if (titre) {
    corps += texte(g1, hFin + 14, enrouler(titre, lw, { taille: T_PETIT }).slice(0, 1), { cls: "fg-txt fg-txt-s fg-txt-b", ancre: "end" });
    hFin += 18;
  }
  return { h: Math.ceil(hFin + 8), corps };
}

/* ---------- Barres ---------- */

function rendreBarres(f, uid) {
  /* Une barre porte une `valeur`, ou une plage `de`…`a` (un segment avec ses deux bornes). */
  const plage = b => nombres(b.de, b.a) && b.a >= b.de;
  const bs = (f.barres || []).filter(b => (nombres(b.valeur) || plage(b)) && b.label);
  if (!bs.length) throw new Error("barres : aucune barre");
  const unite = f.unite || "";
  const bas = f.min ?? 0;
  const max = f.max ?? Math.max(...bs.map(b => (plage(b) ? b.a : b.valeur)));
  if (!(max > bas)) throw new Error("barres : bornes de l'échelle incohérentes");
  const g0 = 16, g1 = LARGEUR - 16;
  const valTexte = b => (b.texte ?? (f.qualitative ? "" : plage(b) ? `${nombreFr(b.de)} à ${valeurUnite(b.a, unite)}` : valeurUnite(b.valeur, unite)));
  const reserve = Math.max(0, ...bs.map(b => largeurTexte(valTexte(b), T_NORMAL, { gras: true }))) + 10;
  const piste = g1 - g0 - reserve;
  const dePiste = v => Math.min(1, Math.max(0, (v - bas) / (max - bas))) * piste;
  let y = 6, corps = "";
  bs.forEach((b, i) => {
    const t = ton(b.ton, ["vert", "or", "terra", "bleu"][i % 4]);
    const lignes = enrouler(b.label, g1 - g0, { taille: T_NORMAL });
    corps += texte(g0, y + 12, lignes, { cls: "fg-txt", ancre: "start", inter: INTERLIGNE });
    y += lignes.length * INTERLIGNE + 4;
    corps += `<rect class="fg-f-doux" x="${g0}" y="${n(y)}" width="${n(piste)}" height="14" rx="4"/>`;
    if (plage(b)) {
      const x0 = g0 + Math.min(dePiste(b.de), piste - 1), x1 = Math.max(g0 + dePiste(b.a), x0 + 1);
      corps += `<path class="fg-t-${t} fg-t-tres-epais" d="M${n(x0)} ${n(y + 7)}H${n(x1)}"/>`;
      for (const x of [x0, x1]) corps += `<circle class="fg-pt fg-f-${t}" cx="${n(x)}" cy="${n(y + 7)}" r="5"/>`;
    } else {
      const w = f.min === undefined ? Math.max(3, Math.min(1, b.valeur / max) * piste) : Math.max(3, dePiste(b.valeur));
      corps += `<rect class="fg-f-${t} fg-barre" x="${g0}" y="${n(y)}" width="${n(w)}" height="14" rx="4"/>`;
    }
    const vt = valTexte(b);
    if (vt) corps += texte(g0 + piste + 8, y + 12, [vt], { cls: `fg-txt fg-txt-b${classeTexteTon(t)}`, ancre: "start" });
    y += 14;
    if (b.note) {
      const nl = enrouler(b.note, g1 - g0, { taille: T_PETIT });
      corps += texte(g0, y + 13, nl, { cls: "fg-txt fg-txt-s", ancre: "start", inter: INTERLIGNE_PETIT });
      y += nl.length * INTERLIGNE_PETIT + 3;
    }
    y += 12;
  });
  return { h: Math.ceil(y - 4), corps };
}

/* ---------- Étapes ---------- */

function rendreEtapes(f, uid) {
  const es = (f.etapes || []).filter(s => s.libelle);
  if (!es.length) throw new Error("étapes : aucune étape");
  const nb = es.length;
  const marge = 8, flecheW = 22;
  const boxW = (LARGEUR - 2 * marge - (nb - 1) * flecheW) / nb;
  /* En ligne : 3 cases au plus, et aucun mot de libellé plus large que la case. */
  const motPlusLarge = Math.max(...es.flatMap(s => typoFig(s.libelle).split(" ").map(m => largeurTexte(m, T_NORMAL, { gras: true }))));
  const enLigne = nb <= 3 && motPlusLarge <= boxW - 14;
  let corps = "", h;
  const badge = (x, y, i, t) => `<circle class="fg-f-${t === "encre" ? "vert" : t} fg-pt" cx="${n(x)}" cy="${n(y)}" r="9"/>` +
    `<text class="fg-txt fg-txt-s fg-txt-b fg-txt-sur" x="${n(x)}" y="${n(y + 4)}" text-anchor="middle">${i + 1}</text>`;

  if (enLigne) {
    const mesures = es.map(s => ({
      l: enrouler(s.libelle, boxW - 14, { taille: T_NORMAL, gras: true }),
      d: s.desc ? enrouler(s.desc, boxW - 14, { taille: T_PETIT }) : []
    }));
    const hEmoji = es.some(s => s.emoji) ? 30 : 0;
    const hBox = Math.max(...mesures.map((m, i) => 18 + hEmoji + m.l.length * INTERLIGNE + (m.d.length ? 4 + m.d.length * INTERLIGNE_PETIT : 0))) + 8;
    es.forEach((s, i) => {
      const t = ton(s.ton, "vert");
      const x = marge + i * (boxW + flecheW);
      corps += `<rect class="${fondClair(t)} fg-t-${t} fg-t-fin" x="${n(x)}" y="12" width="${n(boxW)}" height="${n(hBox)}" rx="10"/>`;
      let y = 12 + 22;
      if (hEmoji) { if (s.emoji) corps += `<text class="fg-emoji" x="${n(x + boxW / 2)}" y="${n(y + 6)}" text-anchor="middle">${esc(s.emoji)}</text>`; y += hEmoji - 4; }
      corps += texte(x + boxW / 2, y, mesures[i].l, { cls: `fg-txt fg-txt-b${classeTexteTon(t)}`, inter: INTERLIGNE });
      y += mesures[i].l.length * INTERLIGNE + 2;
      if (mesures[i].d.length) corps += texte(x + boxW / 2, y, mesures[i].d, { cls: "fg-txt fg-txt-s", inter: INTERLIGNE_PETIT });
      corps += badge(x + 4, 16, i, t);
      if (i < nb - 1) corps += ligne(x + boxW + 3, 12 + hBox / 2, x + boxW + flecheW - 3, 12 + hBox / 2, "fg-t-axe", ` marker-end="${flecheDe(uid, "encre")}"`);
    });
    h = 12 + hBox + 10;
  } else {
    const xt = marge + 14 + (es.some(s => s.emoji) ? 34 : 0);
    const larg = LARGEUR - marge - 14 - xt;
    let y = 12;
    es.forEach((s, i) => {
      const t = ton(s.ton, "vert");
      const l = enrouler(s.libelle, larg, { taille: T_NORMAL, gras: true });
      const d = s.desc ? enrouler(s.desc, larg, { taille: T_PETIT }) : [];
      const hBox = Math.max(s.emoji ? 50 : 40, 16 + l.length * INTERLIGNE + (d.length ? 3 + d.length * INTERLIGNE_PETIT : 0) + 4);
      corps += `<rect class="${fondClair(t)} fg-t-${t} fg-t-fin" x="${marge}" y="${n(y)}" width="${LARGEUR - 2 * marge}" height="${n(hBox)}" rx="10"/>`;
      if (s.emoji) corps += `<text class="fg-emoji" x="${marge + 31}" y="${n(y + hBox / 2 + 8)}" text-anchor="middle">${esc(s.emoji)}</text>`;
      const hTxt = l.length * INTERLIGNE + (d.length ? 3 + d.length * INTERLIGNE_PETIT : 0);
      let yt = y + (hBox - hTxt) / 2 + 11;
      corps += texte(xt, yt, l, { cls: `fg-txt fg-txt-b${classeTexteTon(t)}`, ancre: "start" });
      yt += l.length * INTERLIGNE + 2;
      if (d.length) corps += texte(xt, yt, d, { cls: "fg-txt fg-txt-s", ancre: "start", inter: INTERLIGNE_PETIT });
      corps += badge(marge + 3, y + 3, i, t);
      y += hBox;
      if (i < nb - 1) {
        corps += ligne(LARGEUR / 2, y + 2, LARGEUR / 2, y + 17, "fg-t-axe", ` marker-end="${flecheDe(uid, "encre")}"`);
        y += 20;
      }
    });
    h = y + 12;
  }
  return { h: Math.ceil(h), corps };
}

/* ---------- SVG libre ---------- */

function rendreSvg(f, uid) {
  const vb = (f.vb || "0 0 320 180").trim();
  const p = vb.split(/[\s,]+/).map(Number);
  if (p.length !== 4 || p.some(v => !Number.isFinite(v))) throw new Error("svg : vb invalide");
  return { vb, corps: habiller(f.corps, uid) };
}

/* ---------- Comparaison ---------- */

/* Chaque panneau est un mini-SVG imbriqué : son `vb` est mis à l'échelle de la carte. Le
   TEXTE, lui, garde sa taille nominale (11,5 ou 13 unités de la figure) quelle que soit la
   largeur du panneau : le cadre pose --fg-k, le facteur d'échelle, et la feuille de style
   (css/figures.css, .fg-pn) en divise la taille des textes. Le `vb` recommandé donne
   pourtant l'échelle 1 : sa largeur est celle de la zone de dessin (134 pour deux panneaux,
   84 pour trois ; 128 et 77 avec des flèches ; 116 en une colonne). */
function mini(p, vb, x, y, w, h, uid) {
  const k = Math.min(w / vb[2], h / vb[3]);
  const style = Math.abs(k - 1) > 0.01 ? ` style="--fg-k:${Math.round(k * 1000) / 1000}"` : "";
  return `<svg class="fg-pn" x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" viewBox="${vb.join(" ")}" preserveAspectRatio="xMidYMid meet"${style}>${habiller(p.corps, uid)}</svg>`;
}

function rendreComparaison(f, uid) {
  const ps = (f.panneaux || []).filter(p => p.corps || p.label);
  if (ps.length < 2 || ps.length > 3) throw new Error("comparaison : deux ou trois panneaux");
  const nb = ps.length;
  const cols = [1, 2, 3].includes(f.colonnes) ? Math.min(f.colonnes, nb) : nb;
  const marge = 8;
  const vbs = ps.map(p => (p.vb || "0 0 100 100").trim().split(/[\s,]+/).map(Number));
  if (vbs.some(v => v.length !== 4 || v.some(x => !Number.isFinite(x)))) throw new Error("comparaison : vb de panneau invalide");
  let corps = "";

  /* Une colonne : chaque panneau est une ligne, le dessin à gauche, le texte à droite — la
     disposition des textes longs, qui seraient coupés en quatre dans une colonne étroite. */
  if (cols === 1) {
    const ZD = 116, xt = marge + 6 + ZD + 14, lt = LARGEUR - marge - 10 - xt;
    const entre = f.fleche ? 24 : 10;
    let y = 10;
    ps.forEach((p, i) => {
      const t = ton(p.ton, "vert");
      const hm = Math.min(130, Math.round(ZD * vbs[i][3] / vbs[i][2]));
      const l = enrouler(p.label || "", lt, { taille: T_NORMAL, gras: true });
      const s = p.sous ? enrouler(p.sous, lt, { taille: T_PETIT }) : [];
      const hTxt = l.length * INTERLIGNE + (s.length ? 3 + s.length * INTERLIGNE_PETIT : 0);
      const hCarte = Math.max(hm + 12, hTxt + 18);
      corps += `<rect class="fg-f-carte fg-t-${t}" x="${marge}" y="${n(y)}" width="${LARGEUR - 2 * marge}" height="${n(hCarte)}" rx="10"/>`;
      corps += `<rect class="${fondClair(t)}" x="${xt - 8}" y="${n(y + 1)}" width="${LARGEUR - marge - 1 - (xt - 8)}" height="${n(hCarte - 2)}" rx="9"/>`;
      corps += mini(p, vbs[i], marge + 6, y + (hCarte - hm) / 2, ZD, hm, uid);
      const yt = y + (hCarte - hTxt) / 2 + 11;
      corps += texte(xt, yt, l, { cls: `fg-txt fg-txt-b${classeTexteTon(t)}`, ancre: "start" });
      if (s.length) corps += texte(xt, yt + l.length * INTERLIGNE + 2, s, { cls: "fg-txt fg-txt-s", ancre: "start", inter: INTERLIGNE_PETIT });
      y += hCarte;
      if (f.fleche && i < nb - 1) corps += ligne(LARGEUR / 2, y + 3, LARGEUR / 2, y + entre - 3, "fg-t-axe", ` marker-end="${flecheDe(uid, "encre")}"`);
      if (i < nb - 1) y += entre;
    });
    return { h: Math.ceil(y + 10), corps };
  }

  /* Deux ou trois colonnes : des cartes verticales, le dessin au-dessus du texte. */
  const ecart = f.fleche ? (cols === 2 ? 24 : 18) : (cols === 2 ? 12 : 8);
  const pw = (LARGEUR - 2 * marge - (cols - 1) * ecart) / cols;
  const zone = pw - 12;
  const hMini = Math.round(Math.max(...vbs.map(v => zone * v[3] / v[2])));
  const ls = ps.map(p => ({ l: enrouler(p.label || "", pw - 12, { taille: T_NORMAL, gras: true }), s: p.sous ? enrouler(p.sous, pw - 12, { taille: T_PETIT }) : [] }));
  let y0 = 10;
  for (let r = 0; r < nb; r += cols) {
    const rang = ps.map((_, i) => i).slice(r, r + cols);
    const hTxt = Math.max(...rang.map(i => ls[i].l.length * INTERLIGNE + (ls[i].s.length ? 3 + ls[i].s.length * INTERLIGNE_PETIT : 0)));
    const hBox = 6 + hMini + 8 + hTxt + 8;
    rang.forEach((i, c) => {
      const p = ps[i];
      const t = ton(p.ton, "vert");
      const x = marge + c * (pw + ecart);
      corps += `<rect class="fg-f-carte fg-t-${t}" x="${n(x)}" y="${y0}" width="${n(pw)}" height="${n(hBox)}" rx="10"/>`;
      corps += mini(p, vbs[i], x + 6, y0 + 6, zone, hMini, uid);
      const yt = y0 + 6 + hMini + 8 + 11;
      corps += `<rect class="${fondClair(t)}" x="${n(x + 1)}" y="${n(y0 + 6 + hMini + 5)}" width="${n(pw - 2)}" height="${n(hBox - 6 - hMini - 5 - 1)}" rx="9"/>`;
      corps += texte(x + pw / 2, yt + 3, ls[i].l, { cls: `fg-txt fg-txt-b${classeTexteTon(t)}` });
      if (ls[i].s.length) corps += texte(x + pw / 2, yt + 3 + ls[i].l.length * INTERLIGNE + 2, ls[i].s, { cls: "fg-txt fg-txt-s", inter: INTERLIGNE_PETIT });
      if (f.fleche && c < rang.length - 1) {
        corps += ligne(x + pw + 3, y0 + (6 + hMini) / 2, x + pw + ecart - 3, y0 + (6 + hMini) / 2, "fg-t-axe", ` marker-end="${flecheDe(uid, "encre")}"`);
      }
    });
    y0 += hBox + 10;
  }
  return { h: Math.ceil(y0), corps };
}

const RENDUS = { courbe: rendreCourbe, echelle: rendreEchelle, barres: rendreBarres, etapes: rendreEtapes, svg: rendreSvg, comparaison: rendreComparaison };

/* ---------- Figure complète ---------- */

const ICONE_ZOOM = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';

/* Le SVG seul (sans la légende) : titre, description, marqueurs, puis le dessin. */
export function svgFigure(fig, uid = uidSuivant()) {
  const rendu = (RENDUS[fig.type] || (() => { throw new Error(`figure de type inconnu : ${fig.type}`); }))(fig, uid);
  const vb = rendu.vb || `0 0 ${LARGEUR} ${rendu.h}`;
  return `<svg class="fg-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-labelledby="fg-${uid}-t fg-${uid}-d" focusable="false">` +
    `<title id="fg-${uid}-t">${e(fig.titre || "")}</title><desc id="fg-${uid}-d">${e(fig.alt || "")}</desc>` +
    `<defs>${marqueurs(uid)}${symbolesDe(rendu.corps, uid)}</defs>${rendu.corps}</svg>`;
}

/* Le rendu d'une figure : <figure> avec son SVG et sa légende.
   `fond` et `i` (rang dans FIGURES[fond]) servent au zoom, qui redessine la figure
   depuis les données ; `zoom` rend la version plein écran (sans bouton). Une figure
   qui ne se dessine pas rend une chaîne vide plutôt que de casser la fiche
   (`strict` pour qu'un test voie l'erreur). */
export function figureHtml(fig, { uid = uidSuivant(), fond = "", i = 0, zoom = false, strict = false } = {}) {
  try {
    const svg = svgFigure(fig, uid);
    const bouton = zoom ? "" :
      `<button type="button" class="fg-agrandir" data-fg-zoom data-fg-fond="${esc(fond)}" data-fg-i="${i}" aria-label="Agrandir le schéma : ${e(fig.titre || "")}" aria-haspopup="dialog">${ICONE_ZOOM}</button>`;
    /* Le bouton d'agrandissement vit dans la ligne du titre, À DROITE : jamais sur le dessin. */
    return `<figure class="fg fg-${esc(fig.type)}${zoom ? " fg-zoomee" : ""}">` +
      `<div class="fg-cadre">${svg}</div>` +
      `<figcaption>${fig.titre ? `<span class="fg-titre">${e(fig.titre)}</span>` : ""}${bouton}${fig.legende ? `<span class="fg-legende">${e(fig.legende)}</span>` : ""}</figcaption>` +
      `</figure>`;
  } catch (err) {
    if (strict) throw err;
    return "";
  }
}

/* Les figures d'un emplacement. Pour « pourquoi », `k` est le rang du paragraphe
   (à partir de 1) et `nbParagraphes` leur nombre : une figure qui demande plus
   loin que le dernier paragraphe se pose après lui. */
export function figuresA(figs, fond, ou, { k = 1, nbParagraphes = 1 } = {}) {
  if (!Array.isArray(figs)) return "";
  return figs.map((fig, i) => [fig, i])
    .filter(([fig]) => fig && fig.ou === ou && (ou !== "pourquoi" || Math.min(Math.max(fig.apres || 1, 1), nbParagraphes) === k))
    .map(([fig, i]) => figureHtml(fig, { fond, i }))
    .join("");
}

/* ---------- Le thermomètre du carnet ---------- */

/* Une grande échelle verticale qui rassemble les températures-repères de TOUTES les
   fiches (THERMOMETRE, en fin de js/figures.js). Du plus chaud en haut au plus froid
   en bas, comme un thermomètre.

   Trois choix de dessin, tous pour la lisibilité ET l'honnêteté :
   - l'échelle est RÉGULIÈRE par tronçons, pas d'un bout à l'autre : là où plus de
     12 °C séparent deux repères, l'axe se rompt (//) et le tronçon suivant reprend
     avec sa propre hauteur de degré. Les repères serrés (55 à 70 °C : une douzaine)
     reçoivent ainsi la place qu'il leur faut, les déserts (−18 à −2 °C) presque rien.
     La légende le dit, et la graduation de chaque tronçon se lit sur l'axe ;
   - une plage est un dégradé, pas un bord franc : les fiches répètent qu'il n'y a pas
     de seuil net. Un point (un plafond, un cap) est un disque sur l'axe ;
   - chaque repère est un LIEN (<a> dans le SVG, focalisable) vers sa fiche, nommé pour
     un lecteur d'écran « 55 à 85 °C : … Fiche : … », dans l'ordre visuel, du chaud
     au froid. Le SVG est un groupe (pas une image) : ses liens restent atteignables.

   La mise en page (thermometreMise) est pure et se teste sans navigateur : positions,
   rangées, étiquettes sans chevauchement. Le dessin (thermometreHtml) n'en est que la
   transcription. Tout est dessiné dans la boîte de 320 unités des autres figures. */

const TH = {
  xNum: 30, xAxe: 38, xBarres: 46, pasMax: 5.6, xTexte: 104, droite: 313,
  ligne: INTERLIGNE_PETIT, haut: 10, bas: 10, rupture: 22,
  emoji: 16,        // le retrait des étiquettes devant lesquelles l'emoji de la fiche se pose
  ecart: 12,        // au-delà de cet écart (°C) entre deux repères, l'axe se rompt
  degMin: 2.6,      // hauteur minimale d'un degré dans un tronçon, en unités
  marge: 1.5        // °C de part et d'autre des repères extrêmes d'un tronçon
};

const THERMO_TONS_TXT = { terra: "fg-txt-terra", vert: "fg-txt-vert", or: "fg-txt-or", bleu: "fg-txt-bleu", doux: "fg-txt-doux", encre: "" };

/* La valeur affichée en gras devant l'étiquette, et sa version parlée. */
function valeurRepere(r) {
  if (r.ouvert === "haut") return { vue: `> ${nombreFr(r.de)} °C`, dite: `${valeurUnite(r.de, "°C")} et au-delà` };
  if (!nombres(r.a)) return { vue: `${nombreFr(r.de)} °C`, dite: valeurUnite(r.de, "°C") };
  const neg = r.de < 0 || r.a < 0;
  return {
    vue: neg ? `${nombreFr(r.de)} à ${nombreFr(r.a)} °C` : `${nombreFr(r.de)}–${nombreFr(r.a)} °C`,
    dite: `de ${nombreFr(r.de)} à ${valeurUnite(r.a, "°C")}`
  };
}

/* Un repère est valide s'il a une température, une étiquette et une fiche. */
const repereValide = r => r && typeof r === "object" && nombres(r.de) && String(r.label || "").trim() && r.fond &&
  (r.a === undefined || (nombres(r.a) && r.a > r.de));

/* Regroupe en tronçons : les repères triés, coupés là où l'écart dépasse TH.ecart. */
function tronconsDe(items) {
  const pts = [...new Set(items.flatMap(r => [r.de, r.a].filter(v => nombres(v))))].sort((a, b) => a - b);
  const bornes = [];
  let debut = pts[0], prec = pts[0];
  for (const p of pts.slice(1)) {
    if (p - prec > TH.ecart) { bornes.push([debut, prec]); debut = p; }
    prec = p;
  }
  bornes.push([debut, prec]);
  return bornes.map(([v0, v1]) => ({ v0: v0 - TH.marge, v1: v1 + TH.marge }));
}

/* Les graduations d'un tronçon, légères : ses deux bornes (le repère le plus froid et le plus chaud
   qu'il porte) et quelques valeurs rondes (100, 50, puis 10 si le tronçon n'a presque rien),
   toutes à 15 unités au moins l'une de l'autre. Jamais un trait tous les 5 °C. */
function graduationsTroncon(t, valeurs) {
  const dans = valeurs.filter(v => v >= t.v0 - 1e-9 && v <= t.v1 + 1e-9);
  const gardes = [...new Set([Math.min(...dans), Math.max(...dans)])];
  const loin = (v, d) => gardes.every(g => Math.abs(g - v) * t.pxDeg >= d);
  for (const pas of [100, 50, 10]) {
    if (pas === 10 && gardes.length >= 4) break;
    for (let v = Math.ceil(t.v0 / pas) * pas; v <= t.v1 + 1e-9; v += pas) {
      const r = Math.round(v * 100) / 100;
      if (!gardes.includes(r) && loin(r, pas === 10 ? 24 : 15) && (pas !== 10 || gardes.length < 4)) gardes.push(r);
    }
  }
  return gardes.sort((x, y) => x - y);
}

/* Les étiquettes se posent au plus près de leur repère sans se toucher : des blocs de
   voisines se regroupent et se centrent sur la moyenne de leurs repères (moindres
   carrés, sous contrainte d'ordre). `souhaits` : { haut (position voulue), h } triés
   par `haut` croissant ; rend les `haut` retenus, dans le même ordre. */
function etaler(souhaits, minHaut) {
  const blocs = [];
  souhaits.forEach((s, i) => {
    blocs.push({ ids: [i], decal: [0], somme: s.haut, n: 1, h: s.h, haut: 0 });
    for (;;) {
      const b = blocs[blocs.length - 1];
      b.haut = b.somme / b.n;
      if (blocs.length === 1) { b.haut = Math.max(b.haut, minHaut); break; }
      const p = blocs[blocs.length - 2];
      if (b.haut >= p.haut + p.h - 1e-9) break;
      blocs.pop();
      p.ids.push(...b.ids);
      p.decal.push(...b.decal.map(d => d + p.h));
      p.somme += b.somme - b.n * p.h;
      p.n += b.n;
      p.h += b.h;
    }
  });
  const sortie = souhaits.map(() => 0);
  for (const b of blocs) b.ids.forEach((id, k) => { sortie[id] = b.haut + b.decal[k]; });
  return sortie;
}

/* La mise en page : tout ce qu'il faut pour dessiner, rien de graphique. */
export function thermometreMise(reperes, { titreDe = id => id, emojiDe = () => "" } = {}) {
  const valides = (Array.isArray(reperes) ? reperes : []).filter(repereValide).filter(r => titreDe(r.fond) != null && titreDe(r.fond) !== false);
  /* Des repères de même température dans la MÊME fiche se rangent sous un seul point : la
     première étiquette porte la valeur, les suivantes s'y ajoutent (`autres`). */
  const items = [];
  for (const r of valides) {
    const jumeau = items.find(x => x.fond === r.fond && x.de === r.de && x.a === r.a && x.ouvert === r.ouvert);
    if (jumeau) jumeau.autres.push(r.label);
    else items.push({ ...r, rang: items.length, ton: ton(r.ton, "encre"), autres: [] });
  }
  if (!items.length) return null;

  /* Les étiquettes d'abord : leur hauteur dimensionne les tronçons. L'emoji de la fiche les
     précède, en retrait : on reconnaît la fiche d'un coup d'œil. */
  for (const r of items) {
    const v = valeurRepere(r);
    const vue = typoFig(v.vue).replace(/ /g, "\u00a0");
    r.emoji = emojiDe(r.fond) || "";
    const largTexte = TH.droite - TH.xTexte - 4 - (r.emoji ? TH.emoji : 0);
    r.valeur = v;
    r.vue = vue;
    r.lignes = [...enrouler(`${vue} ${r.label}`, largTexte, { taille: T_PETIT }), ...r.autres.flatMap(a => enrouler(`+ ${a}`, largTexte, { taille: T_PETIT }))];
    r.hLabel = r.lignes.length * TH.ligne + 3;
    r.cible = nombres(r.ancre) ? r.ancre : (nombres(r.a) ? (r.de + r.a) / 2 : r.de);
  }

  /* Les tronçons : hauteur = de quoi poser leurs étiquettes, au moins degMin par degré. */
  const troncons = tronconsDe(items);
  const haute = items.some(r => r.ouvert === "haut");
  if (haute) {
    const t = troncons[troncons.length - 1];
    t.v1 = Math.max(t.v1, Math.max(...items.filter(r => r.ouvert === "haut").map(r => r.de)) + 12);
  }
  const dans = (t, v) => v >= t.v0 - 1e-9 && v <= t.v1 + 1e-9;
  for (const t of troncons) {
    const besoin = items.filter(r => dans(t, r.cible)).reduce((s, r) => s + r.hLabel, 0);
    t.h = Math.max((t.v1 - t.v0) * TH.degMin, besoin * 0.92, 40);
    t.pxDeg = t.h / (t.v1 - t.v0);
  }
  /* De haut en bas : du plus chaud au plus froid. */
  let y = TH.haut;
  for (let i = troncons.length - 1; i >= 0; i--) {
    const t = troncons[i];
    t.y0 = y; t.y1 = y + t.h;
    y = t.y1 + TH.rupture;
  }
  const hAxe = troncons[0].y1;

  /* Le passage d'une température à une hauteur, y compris dans une rupture (interpolé). */
  const yDe = v => {
    for (let i = 0; i < troncons.length; i++) {
      const t = troncons[i];
      if (v <= t.v1) {
        if (v >= t.v0) return t.y1 - (v - t.v0) * t.pxDeg;
        if (i === 0) return t.y1;
        const froid = troncons[i - 1];
        return froid.y0 - TH.rupture * (v - froid.v1) / (t.v0 - froid.v1);
      }
    }
    return troncons[troncons.length - 1].y0;
  };

  for (const r of items) {
    r.y = yDe(r.cible);
    r.yBas = yDe(r.de);
    r.yHaut = r.ouvert === "haut" ? troncons[troncons.length - 1].y0 : (nombres(r.a) ? yDe(r.a) : r.yBas);
    r.zone = r.ouvert === "haut" || nombres(r.a);
    /* Une zone trop basse pour se voir : au moins 8 unités, centrées. */
    if (r.zone && r.yBas - r.yHaut < 8) {
      const c = (r.yBas + r.yHaut) / 2;
      r.yHaut = c - 4; r.yBas = c + 4;
    }
  }

  /* Les rangées des zones : la première libre, de haut en bas. */
  const zones = items.filter(r => r.zone).sort((a, b) => a.yHaut - b.yHaut || (b.yBas - b.yHaut) - (a.yBas - a.yHaut) || a.rang - b.rang);
  const fins = [];
  for (const z of zones) {
    let k = fins.findIndex(f => f <= z.yHaut - 1.5);
    if (k < 0) { k = fins.length; fins.push(0); }
    fins[k] = z.yBas;
    z.rangee = k;
  }
  const nbRangees = Math.max(1, fins.length);
  const pas = Math.min(TH.pasMax, (TH.xTexte - 12 - TH.xBarres) / nbRangees);
  const large = Math.max(2.6, pas - 1.8);
  for (const z of zones) z.x = TH.xBarres + z.rangee * pas;
  const xSortie = TH.xBarres + nbRangees * pas + 2;

  /* Les étiquettes : dans l'ordre visuel (du chaud au froid), au plus près de leur repère. */
  const ordre = [...items].sort((a, b) => a.y - b.y || a.rang - b.rang);
  const hauts = etaler(ordre.map(r => ({ haut: r.y - (r.hLabel - 3) / 2, h: r.hLabel })), TH.haut - 4);
  ordre.forEach((r, i) => { r.haut = hauts[i]; });
  const bas = Math.max(hAxe, ...ordre.map(r => r.haut + r.hLabel));

  /* Les graduations de chaque tronçon. */
  const valeurs = items.flatMap(r => [r.de, r.a].filter(v => nombres(v)));
  for (const t of troncons) t.graduations = graduationsTroncon(t, valeurs);

  /* Le réservoir du thermomètre, en bas de l'axe : un disque de la couleur froide. */
  const bulbe = { cx: TH.xAxe, cy: hAxe + 4, r: 7.5 };
  return { items: ordre, troncons, bulbe, h: Math.ceil(Math.max(bas, bulbe.cy + bulbe.r) + TH.bas), hAxe, nbRangees, pas, large, xSortie, min: Math.min(...items.map(r => r.de)), max: Math.max(...items.map(r => nombres(r.a) ? r.a : r.de)) };
}

/* Les dégradés : un par ton (aux deux bouts qui s'estompent), un par ton pour les
   zones sans plafond, et le tube de l'axe, du bleu froid au terra chaud. */
function degradesThermo(uid, h) {
  const stop = (off, cls, op) => `<stop offset="${off}" class="fg-st-${cls}" stop-opacity="${op}"/>`;
  let s = "";
  for (const t of TONS) {
    s += `<linearGradient id="fg-${uid}-gr-${t}" x1="0" y1="0" x2="0" y2="1">${stop(0, t, 0)}${stop(0.22, t, 1)}${stop(0.78, t, 1)}${stop(1, t, 0)}</linearGradient>`;
    s += `<linearGradient id="fg-${uid}-grh-${t}" x1="0" y1="0" x2="0" y2="1">${stop(0, t, 1)}${stop(0.72, t, 1)}${stop(1, t, 0)}</linearGradient>`;
  }
  s += `<linearGradient id="fg-${uid}-tube" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${n(h)}">${stop(0, "terra", 1)}${stop(0.42, "or", 1)}${stop(0.72, "vert", 1)}${stop(1, "bleu", 1)}</linearGradient>`;
  return s;
}

/* Le texte d'une étiquette : la valeur en gras et teintée, puis le libellé. */
function texteRepere(r, x, y0) {
  const tspans = r.lignes.map((l, i) => {
    const dy = i ? ` dy="${TH.ligne}"` : "";
    if (i === 0 && l.startsWith(r.vue)) {
      const reste = l.slice(r.vue.length);
      return `<tspan x="${n(x)}"${dy} class="fg-txt-b${classeTxtTon(r.ton)}">${esc(r.vue)}</tspan><tspan>${esc(reste)}</tspan>`;
    }
    return `<tspan x="${n(x)}"${dy}>${esc(l)}</tspan>`;
  }).join("");
  return `<text class="fg-txt fg-txt-s th-txt" x="${n(x)}" y="${n(y0)}">${tspans}</text>`;
}
const classeTxtTon = t => (THERMO_TONS_TXT[t] ? " " + THERMO_TONS_TXT[t] : "");

/* Le SVG et la figure complète. `titreDe(id)` rend le titre de la fiche (ou null si elle
   n'existe pas : le repère disparaît plutôt que de mener nulle part). */
export function thermometreHtml(reperes, { titreDe = id => id, emojiDe = () => "", uid = uidSuivant(), titre = "Le thermomètre du carnet", legende = true } = {}) {
  const mise = thermometreMise(reperes, { titreDe, emojiDe });
  if (!mise) return "";
  const { items, troncons, h, hAxe, pas, large, xSortie, bulbe } = mise;
  const xT = TH.xTexte;
  const bas = troncons[0], haut = troncons[troncons.length - 1];

  let fond = "", axe = "", liens = "", guides = "", fuites = "";

  /* Axe : le réservoir (la couleur froide), un tube par tronçon, ses graduations, et la rupture
     entre deux tronçons. */
  axe += `<circle class="th-bulbe fg-f-bleu" cx="${bulbe.cx}" cy="${n(bulbe.cy)}" r="${bulbe.r}"/>` +
    `<circle class="th-reflet fg-f-carte" cx="${n(bulbe.cx - 2.6)}" cy="${n(bulbe.cy - 2.4)}" r="1.9"/>`;
  troncons.forEach((t, i) => {
    axe += `<rect class="th-tube" x="${TH.xAxe - 2.5}" y="${n(t.y0)}" width="5" height="${n(t.h)}" rx="2.5" fill="url(#fg-${uid}-tube)"/>`;
    for (const v of t.graduations) {
      const yy = t.y1 - (v - t.v0) * t.pxDeg;
      guides += ligne(TH.xAxe + 3, yy, xSortie, yy, "fg-t-grille");
      axe += ligne(TH.xAxe - 6, yy, TH.xAxe - 2.5, yy, "fg-t-axe fg-t-fin");
      axe += `<text class="fg-txt fg-txt-s th-num" x="${TH.xNum}" y="${n(yy + 4)}" text-anchor="end">${esc(nombreFr(v))}</text>`;
    }
    if (i < troncons.length - 1) {
      const yHaut = troncons[i + 1].y1, yBas = t.y0;     // le bas du tronçon plus chaud, le haut de celui-ci
      axe += `<path class="fg-t-axe fg-pointilles" d="M${TH.xAxe} ${n(yHaut + 3)}L${TH.xAxe} ${n(yBas - 3)}"/>`;
      for (const yy of [yHaut + 1, yBas - 1]) axe += `<path class="fg-t-axe th-rupture" d="M${TH.xAxe - 7} ${n(yy + 2.2)}L${TH.xAxe + 7} ${n(yy - 2.2)}"/>`;
    }
  });

  /* Les repères : le guide qui mène à l'étiquette (derrière), puis le lien. */
  for (const r of items) {
    const yl = r.haut + 7;
    const x0 = r.zone ? r.x + large : TH.xAxe + 4;
    const yy = r.y;
    const coude = `L${n(xSortie)} ${n(yy)}`;
    fuites += `<path class="th-guide fg-t-${r.ton}" d="M${n(x0)} ${n(yy)}${x0 < xSortie ? coude : ""}L${n(xT - 5)} ${n(yl)}"/>`;
  }
  for (const r of items) {
    const titreFiche = titreDe(r.fond);
    const nom = `${r.valeur.dite} : ${[r.label, ...r.autres].join(" ; ")}. Fiche : ${titreFiche}.`;
    let marque = "";
    if (r.zone) {
      const id = `fg-${uid}-${r.ouvert === "haut" ? "grh" : "gr"}-${r.ton}`;
      marque = `<rect class="th-barre" x="${n(r.x)}" y="${n(r.yHaut)}" width="${n(large)}" height="${n(r.yBas - r.yHaut)}" rx="${n(large / 2)}" fill="url(#${id})"/>`;
      if (r.ouvert === "haut") marque += `<path class="fg-t-${r.ton} fg-t-fin" d="M${n(r.x - 0.5)} ${n(r.yHaut + 4)}L${n(r.x + large / 2)} ${n(r.yHaut)}L${n(r.x + large + 0.5)} ${n(r.yHaut + 4)}"/>`;
    } else {
      marque = `<circle class="fg-f-${r.ton} fg-pt" cx="${TH.xAxe}" cy="${n(r.y)}" r="4"/>`;
    }
    const hit = `<rect class="th-zone" x="${n(xT - 4)}" y="${n(r.haut - 1)}" width="${n(TH.droite + 5 - xT)}" height="${n(r.hLabel - 1)}" rx="5"/>`;
    const emoji = r.emoji ? `<text class="fg-emoji th-emoji" x="${xT}" y="${n(r.haut + 10)}" aria-hidden="true">${esc(r.emoji)}</text>` : "";
    liens += `<a class="th-lien" href="#/fondamental/${esc(r.fond)}" aria-label="${esc(typoFig(nom))}" data-th-fond="${esc(r.fond)}">${hit}${marque}${emoji}${texteRepere(r, xT + (r.emoji ? TH.emoji : 0), r.haut + 10)}</a>`;
  }

  const alt = `Échelle verticale des températures de ${valeurUnite(mise.min, "°C")} à ${valeurUnite(mise.max, "°C")}, du plus chaud en haut au plus froid en bas. ` +
    `Elle rassemble ${items.length} repères cités dans les fiches, chacun étant un lien vers sa fiche. L'axe est rompu ${troncons.length - 1} fois : la hauteur d'un degré change d'un tronçon à l'autre. Les plages sont des dégradés, sans seuil net.`;
  const svg = `<svg class="fg-svg th-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGEUR} ${h}" role="group" aria-labelledby="fg-${uid}-t fg-${uid}-d">` +
    `<title id="fg-${uid}-t">${e(titre)}</title><desc id="fg-${uid}-d">${e(alt)}</desc>` +
    `<defs>${degradesThermo(uid, hAxe)}</defs>${guides}${fuites}${axe}${liens}</svg>`;
  const cles = [["bleu", "froid et eau"], ["vert", "végétal et amidon"], ["or", "gras, œuf et épices"], ["terra", "chaleur et coloration"], ["doux", "seuil mal établi"]]
    .filter(([t]) => items.some(r => r.ton === t))
    .map(([t, l]) => `<span class="th-cle"><i class="th-puce th-puce-${t}" aria-hidden="true"></i>${e(l)}</span>`).join("");
  const note = legende ? `<figcaption><span class="fg-legende">Touchez un repère pour ouvrir sa fiche. Une plage est un dégradé : les fiches le répètent, il n'y a pas de seuil net. ` +
    `L'axe n'est pas régulier : à chaque rupture (//), la hauteur d'un degré change.</span><span class="th-cles">${cles}</span></figcaption>` : "";
  return `<figure class="fg fg-thermo">${note}<div class="fg-cadre">${svg}</div></figure>`;
}

/* Les balises d'un balisage SVG sont-elles bien ouvertes et fermées, dans l'ordre ?
   Un contrôle grossier mais suffisant pour des données écrites à la main (le
   vérificateur et les tests s'en servent) : il ne connaît pas les valeurs
   d'attribut contenant « > », qu'on n'écrit pas. */
export function balisesEquilibrees(svg) {
  const pile = [];
  const re = /<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  for (const m of String(svg).replace(/<!--[\s\S]*?-->/g, "").matchAll(re)) {
    if (m[4]) continue;
    if (m[1]) { if (pile.pop() !== m[2]) return false; }
    else pile.push(m[2]);
  }
  return pile.length === 0;
}

/* ---------- Le DOM : apparition et zoom (appelés par js/vues/savoirs.js) ---------- */

/* Les tracés se dessinent quand la figure entre à l'écran. Sans IntersectionObserver
   (ou sous « mouvement réduit », que le CSS traite), rien ne change : tout est visible. */
export function observerFigures(racine) {
  if (typeof IntersectionObserver === "undefined") return;
  const figures = [...racine.querySelectorAll(".fg:not(.fg-pret)")];
  if (!figures.length) return;
  const obs = new IntersectionObserver(entrees => {
    for (const en of entrees) if (en.isIntersecting) { en.target.classList.add("fg-vu"); obs.unobserve(en.target); }
  }, { threshold: 0.35 });
  for (const f of figures) { f.classList.add("fg-pret"); obs.observe(f); }
}
