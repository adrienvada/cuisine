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
const typoFig = s => typo(String(s ?? "")).replace(/(\S)[   ]+%/g, "$1 %");
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
   poignée d'étiquettes, et déterministe. */
function repartir(items, { min = 4, max = LARGEUR - 4, ecart = 6, occupe = [], depart = () => 0 } = {}) {
  const rangs = occupe.map(r => r.slice());
  const sortie = items.map(() => null);
  const ordre = items.map((_, i) => i).sort((a, b) => items[a].x - items[b].x);
  for (const i of ordre) {
    const it = items[i];
    const x0 = Math.min(Math.max(it.x - it.w / 2, min), Math.max(min, max - it.w));
    const x1 = x0 + it.w;
    let r = depart(i);
    for (;; r++) {
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

/* Les pointes de flèche, une par ton. Dans un SVG libre : marker-end="url(#fg-fl-vert)". */
const marqueurs = uid => TONS.map(t =>
  `<marker id="fg-${uid}-fl-${t}" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path class="fg-mk fg-mk-${t}" d="M1 1.5L9 5L1 8.5Z"/></marker>`).join("");

/* Le balisage SVG libre d'un auteur : les références aux marqueurs du cadre
   (#fg-fl-vert) et aux identifiants qu'il pose lui-même (fg-@-halo) reçoivent
   l'identifiant de CETTE figure ; la typographie française passe sur les textes. */
function habiller(corps, uid) {
  return String(corps || "")
    .replace(/#fg-fl-/g, `#fg-${uid}-fl-`)
    .replace(/fg-@/g, `fg-${uid}`)
    .replace(/>([^<>]+)</g, (m, s) => ">" + typoFig(s) + "<");
}

const flecheDe = (uid, t) => `url(#fg-${uid}-fl-${t})`;

/* Un trait ou une flèche, en une ligne. */
const ligne = (x1, y1, x2, y2, cls, extra = "") =>
  `<line class="${cls}" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"${extra}/>`;

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

  const etiqZ = bandes.filter(b => b.z.label).map(b => {
    const lignes = enrouler(b.z.label, Math.max(b.x1 - b.x0 - 4, 40), { taille: T_PETIT });
    return { b, lignes, w: largeurMax(lignes, T_PETIT) + 2, x: (b.x0 + b.x1) / 2 };
  });
  const etiqR = repV.filter(r => r.label).map(r => {
    const lignes = enrouler(r.label, 96, { taille: T_PETIT });
    return { r, lignes, w: largeurMax(lignes, T_PETIT) + 2, x: px(r.x) };
  });
  /* Les zones d'abord, toutes au rang 0 (au ras du tracé) ; les repères prennent le rang libre. */
  const posZ = etiqZ.map(it => ({ x0: it.x - it.w / 2, rang: 0 }));
  const posR = repartir(etiqR, { min: gauche - 8, max: LARGEUR - 6, occupe: [posZ.map((p, i) => [p.x0, p.x0 + etiqZ[i].w])] });
  const nbRangs = Math.max(etiqZ.length ? 1 : 0, ...posR.map(p => p.rang + 1), 0);
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
    if (r.label) corps += texte(gauche + pw - 2, py(r.y) - 5, enrouler(r.label, 150, { taille: T_PETIT }).slice(0, 1), { cls: `fg-txt fg-txt-s fg-halo${classeTexteTon(t)}`, ancre: "end" });
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
  etiqZ.forEach(it => {
    const t = ton(it.b.z.ton, "or");
    corps += texte(it.x, basRang(0) - 3 - (it.lignes.length - 1) * INTERLIGNE_PETIT, it.lignes, { cls: `fg-txt fg-txt-s fg-txt-b${classeTexteTon(t)}`, inter: INTERLIGNE_PETIT });
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
    corps += texte(gauche, py1 + 17, [xs.extremites[0] || ""], { cls: "fg-txt fg-txt-s", ancre: "start" });
    corps += texte(gauche + pw, py1 + 17, [xs.extremites[1] || ""], { cls: "fg-txt fg-txt-s", ancre: "end" });
    yBas = py1 + 17;
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
  const px = v => g0 + (Math.min(Math.max(v, min), max) - min) / (max - min) * lw;
  const unite = f.unite || "";
  const zones = (f.zones || []).filter(z => nombres(z.de, z.a) && z.a > z.de);
  const marqs = (f.marqueurs || []).filter(m => nombres(m.v) && m.label);

  /* Zones : l'étiquette entre dans la bande si elle y tient (sur une ou deux
     lignes), sinon elle monte (ou descend) avec les marqueurs. */
  let lignesBarre = 1;
  const zInfo = zones.map(z => {
    const x0 = px(z.de), x1 = px(z.a), larg = x1 - x0 - 8;
    let dedans = null;
    if (z.label) {
      const lignes = enrouler(z.label, larg, { taille: T_PETIT, gras: true });
      if (lignes.length <= 2 && largeurMax(lignes, T_PETIT, { gras: true }) <= larg) dedans = lignes;
    }
    if (dedans) lignesBarre = Math.max(lignesBarre, dedans.length);
    return { z, x0, x1, dedans };
  });
  const hBarre = 14 + lignesBarre * INTERLIGNE_PETIT;

  const items = [];
  for (const zi of zInfo) {
    if (zi.z.label && !zi.dedans) {
      const lignes = enrouler(zi.z.label, 96, { taille: T_PETIT, gras: true });
      items.push({ lignes, w: largeurMax(lignes, T_PETIT, { gras: true }) + 2, x: (zi.x0 + zi.x1) / 2, xc: (zi.x0 + zi.x1) / 2, ton: ton(zi.z.ton, "or"), gras: true, zone: true });
    }
  }
  for (const m of marqs) {
    const lignes = enrouler(m.label, 112, { taille: T_PETIT });
    items.push({ lignes, w: largeurMax(lignes, T_PETIT) + 2, x: px(m.v), xc: px(m.v), ton: ton(m.ton, "terra"), marq: true });
  }
  /* Haut, bas, haut… : le rang k = 2r est au-dessus (rang r), k = 2r+1 en dessous. */
  const pos = repartir(items, { min: 4, max: LARGEUR - 4, ecart: 8 });
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
  const yFin = yBarre + hBarre;
  let corps = "";
  corps += `<rect class="fg-f-doux fg-t-doux" x="${g0}" y="${n(yBarre)}" width="${lw}" height="${n(hBarre)}" rx="4"/>`;
  for (const zi of zInfo) {
    const t = ton(zi.z.ton, "or");
    corps += `<rect class="${fondClair(t)} fg-t-${t} fg-t-fin" x="${n(zi.x0)}" y="${n(yBarre)}" width="${n(zi.x1 - zi.x0)}" height="${n(hBarre)}" rx="2"/>`;
    if (zi.dedans) {
      const yb = yBarre + hBarre / 2 - (zi.dedans.length - 1) * INTERLIGNE_PETIT / 2 + 4;
      corps += texte((zi.x0 + zi.x1) / 2, yb, zi.dedans, { cls: `fg-txt fg-txt-s fg-txt-b${classeTexteTon(t)}`, inter: INTERLIGNE_PETIT });
    }
  }

  /* Graduations (ou extrémités, pour une échelle qualitative). */
  let basTexte = yFin + 4;
  let unitePerdue = false;
  let textesGrad = "";   // posés après les tiges des étiquettes : leur liseré les laisse lisibles
  const grad = qual ? [] : (f.graduations || graduationsAuto(min, max, 5));
  if (grad.length) {
    const avec = grad.map(g => valeurUnite(g, unite));
    const tient = libs => grad.every((g, i) => i === 0 || Math.abs(px(g) - px(grad[i - 1])) >= (largeurTexte(libs[i], T_PETIT) + largeurTexte(libs[i - 1], T_PETIT)) / 2 + 6);
    let libs = avec;
    if (unite && !tient(avec)) { libs = grad.map(g => nombreFr(g)); unitePerdue = true; }
    grad.forEach((g, i) => {
      corps += ligne(px(g), yFin, px(g), yFin + 5, "fg-t-axe");
      const w = largeurTexte(libs[i], T_PETIT);
      const x = Math.min(Math.max(px(g), 2 + w / 2), LARGEUR - 2 - w / 2);
      textesGrad += texte(x, yFin + 18, [libs[i]], { cls: "fg-txt fg-txt-s fg-halo", ancre: "middle" });
    });
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
  const bs = (f.barres || []).filter(b => nombres(b.valeur) && b.label);
  if (!bs.length) throw new Error("barres : aucune barre");
  const unite = f.unite || "";
  const max = f.max ?? Math.max(...bs.map(b => b.valeur));
  const g0 = 16, g1 = LARGEUR - 16;
  const valTexte = b => (b.texte ?? (f.qualitative ? "" : valeurUnite(b.valeur, unite)));
  const reserve = Math.max(0, ...bs.map(b => largeurTexte(valTexte(b), T_NORMAL, { gras: true }))) + 10;
  const piste = g1 - g0 - reserve;
  let y = 6, corps = "";
  bs.forEach((b, i) => {
    const t = ton(b.ton, ["vert", "or", "terra", "bleu"][i % 4]);
    const lignes = enrouler(b.label, g1 - g0, { taille: T_NORMAL });
    corps += texte(g0, y + 12, lignes, { cls: "fg-txt", ancre: "start", inter: INTERLIGNE });
    y += lignes.length * INTERLIGNE + 4;
    const w = Math.max(3, Math.min(1, b.valeur / max) * piste);
    corps += `<rect class="fg-f-doux" x="${g0}" y="${n(y)}" width="${n(piste)}" height="14" rx="4"/>`;
    corps += `<rect class="fg-f-${t} fg-barre" x="${g0}" y="${n(y)}" width="${n(w)}" height="14" rx="4"/>`;
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

function rendreComparaison(f, uid) {
  const ps = (f.panneaux || []).filter(p => p.corps || p.label);
  if (ps.length < 2 || ps.length > 3) throw new Error("comparaison : deux ou trois panneaux");
  const nb = ps.length;
  const marge = 8, ecart = f.fleche ? (nb === 2 ? 24 : 18) : (nb === 2 ? 12 : 8);
  const pw = (LARGEUR - 2 * marge - (nb - 1) * ecart) / nb;
  const vbs = ps.map(p => (p.vb || "0 0 100 100").trim().split(/[\s,]+/).map(Number));
  if (vbs.some(v => v.length !== 4 || v.some(x => !Number.isFinite(x)))) throw new Error("comparaison : vb de panneau invalide");
  const zone = pw - 12;
  const hMini = Math.round(Math.max(...vbs.map(v => zone * v[3] / v[2])));
  const ls = ps.map(p => ({ l: enrouler(p.label || "", pw - 12, { taille: T_NORMAL, gras: true }), s: p.sous ? enrouler(p.sous, pw - 12, { taille: T_PETIT }) : [] }));
  const hTxt = Math.max(...ls.map(m => m.l.length * INTERLIGNE + (m.s.length ? 3 + m.s.length * INTERLIGNE_PETIT : 0)));
  const hBox = 6 + hMini + 8 + hTxt + 8;
  let corps = "";
  ps.forEach((p, i) => {
    const t = ton(p.ton, "vert");
    const x = marge + i * (pw + ecart);
    corps += `<rect class="fg-f-carte fg-t-${t}" x="${n(x)}" y="10" width="${n(pw)}" height="${n(hBox)}" rx="10"/>`;
    corps += `<svg x="${n(x + 6)}" y="${16}" width="${n(zone)}" height="${hMini}" viewBox="${vbs[i].join(" ")}" preserveAspectRatio="xMidYMid meet">${habiller(p.corps, uid)}</svg>`;
    const yt = 10 + 6 + hMini + 8 + 11;
    corps += `<rect class="${fondClair(t)}" x="${n(x + 1)}" y="${n(10 + 6 + hMini + 5)}" width="${n(pw - 2)}" height="${n(hBox - 6 - hMini - 5 - 1)}" rx="9"/>`;
    corps += texte(x + pw / 2, yt + 3, ls[i].l, { cls: `fg-txt fg-txt-b${classeTexteTon(t)}` });
    if (ls[i].s.length) corps += texte(x + pw / 2, yt + 3 + ls[i].l.length * INTERLIGNE + 2, ls[i].s, { cls: "fg-txt fg-txt-s", inter: INTERLIGNE_PETIT });
    if (f.fleche && i < nb - 1) {
      corps += ligne(x + pw + 3, 10 + (6 + hMini) / 2, x + pw + ecart - 3, 10 + (6 + hMini) / 2, "fg-t-axe", ` marker-end="${flecheDe(uid, "encre")}"`);
    }
  });
  return { h: Math.ceil(10 + hBox + 10), corps };
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
    `<defs>${marqueurs(uid)}</defs>${rendu.corps}</svg>`;
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
    return `<figure class="fg fg-${esc(fig.type)}${zoom ? " fg-zoomee" : ""}">` +
      `<div class="fg-cadre">${svg}${bouton}</div>` +
      `<figcaption>${fig.titre ? `<span class="fg-titre">${e(fig.titre)}</span>` : ""}${fig.legende ? `<span class="fg-legende">${e(fig.legende)}</span>` : ""}</figcaption>` +
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
