/* Les figures des savoirs : le moteur de rendu (js/ui/figures.js, pur), le chargement tolérant
   (core/fonds.js), la palette (css/figures.css, css/base.css) et les données de js/figures.js. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { FIGURES, FAMILLES, FONDAMENTAUX } from "./donnees.mjs";
import {
  EMPLACEMENTS, TONS, TYPES, balisesEquilibrees, cheminLisse, enrouler, figureHtml, figuresA,
  graduationsAuto, largeurTexte, nombreFr, svgFigure, valeurUnite
} from "../../js/ui/figures.js";

const lire = f => readFileSync(new URL("../../" + f, import.meta.url), "utf8");
const NBSP = " ", FINE = " ";

/* Une figure de chaque type, la plus simple qui soit complète. */
const EXEMPLES = {
  courbe: { type: "courbe", titre: "Courbe", legende: "Allure qualitative.", alt: "Une courbe en cloche, sans valeurs.", qualitative: true,
    x: { label: "Humidité", extremites: ["sec", "humide"] }, y: { label: "Vitesse" },
    series: [{ nom: "A", ton: "terra", aire: true, points: [[0, 0.1], [50, 1], [100, 0.2]] }],
    zones: [{ de: 0, a: 25, label: "trop sec", ton: "or" }], reperes: [{ x: 50, label: "maximum" }, { y: 0.5, label: "moitié" }],
    notes: [{ x: 50, y: 1, texte: "le maximum" }] },
  echelle: { type: "echelle", titre: "Échelle", legende: "l", alt: "Une règle graduée avec deux zones.", min: 90, max: 230, unite: "°C", label: "Température",
    zones: [{ de: 100, a: 140, label: "lente", ton: "bleu" }, { de: 140, a: 150, label: "visible", ton: "or" }],
    marqueurs: [{ v: 100, label: "L'eau plafonne la surface à 100 °C" }, { v: 200, label: "pyrolyse", ton: "terra" }] },
  barres: { type: "barres", titre: "Barres", legende: "l", alt: "Deux barres comparées.", unite: "%",
    barres: [{ label: "Un", valeur: 30, note: "détail" }, { label: "Deux", valeur: 60 }] },
  etapes: { type: "etapes", titre: "Étapes", legende: "l", alt: "Trois étapes reliées.",
    etapes: [{ libelle: "Chauffer", desc: "à sec", emoji: "🔥" }, { libelle: "Colorer" }, { libelle: "Déglacer", ton: "bleu" }] },
  svg: { type: "svg", titre: "Libre", legende: "l", alt: "Un rectangle.", vb: "0 0 320 100",
    corps: `<rect class="fg-f-or-l fg-t-or" x="10" y="10" width="100" height="40"/><path class="fg-t-axe" d="M10 60L100 60" marker-end="url(#fg-fl-vert)"/><text class="fg-txt" x="20" y="35">Voir 50 % ?</text>` },
  comparaison: { type: "comparaison", titre: "Deux", legende: "l", alt: "Deux panneaux.", fleche: true,
    panneaux: [{ label: "Avant", vb: "0 0 100 60", corps: `<circle class="fg-f-or" cx="50" cy="30" r="20"/>` }, { label: "Après", sous: "doré", ton: "terra", vb: "0 0 100 60", corps: `<circle class="fg-f-terra" cx="50" cy="30" r="20"/>` }] }
};

test("chaque type est connu et a son exemple", () => {
  assert.deepEqual(Object.keys(EXEMPLES).sort(), [...TYPES].sort());
});

for (const [type, fig] of Object.entries(EXEMPLES)) {
  test(`rendu (${type}) : un <figure> bien formé, avec titre, description et légende`, () => {
    const h = figureHtml(fig, { uid: "t", strict: true });
    assert.match(h, /^<figure class="fg fg-/);
    assert.ok(balisesEquilibrees(h), "balises mal fermées : " + h.slice(0, 200));
    assert.equal((h.match(/"/g) || []).length % 2, 0, "guillemets d'attribut impairs");
    assert.match(h, /<svg class="fg-svg"[^>]*role="img"[^>]*aria-labelledby="fg-t-t fg-t-d"/);
    assert.match(h, /<title id="fg-t-t">/);
    assert.ok(h.includes(`<desc id="fg-t-d">${fig.alt}</desc>`));
    assert.match(h, /<figcaption><span class="fg-titre">/);
    assert.match(h, /viewBox="0 0 320 \d+/);
    assert.doesNotMatch(h, /NaN|undefined|Infinity/);
  });
}

test("rendu : la hauteur du viewBox est un entier, et la largeur de conception est de 320", () => {
  for (const fig of Object.values(EXEMPLES)) {
    const m = svgFigure(fig, "t").match(/viewBox="0 0 (\d+) (\d+)"/);
    assert.equal(m[1], "320");
    assert.ok(Number(m[2]) > 40 && Number(m[2]) < 700);
  }
});

test("échappement : un titre, une légende ou une étiquette ne s'interprètent pas comme du balisage", () => {
  const fig = { ...EXEMPLES.etapes, titre: `<b>"A" & 'B'</b>`, legende: "<img src=x onerror=1>", alt: "<script>alert(1)</script>",
    etapes: [{ libelle: "<i>x</i>", desc: "a & b" }, { libelle: "y" }] };
  const h = figureHtml(fig, { uid: "t", strict: true });
  assert.doesNotMatch(h, /<b>|<i>|<img|<script/);
  assert.match(h, /&lt;b&gt;/);
  assert.match(h, /&amp;/);
  assert.ok(balisesEquilibrees(h));
});

test("typographie française : insécable avant °C, % ? : dans les textes calculés comme dans un SVG libre", () => {
  const h = figureHtml(EXEMPLES.echelle, { uid: "t", strict: true });
  assert.ok(h.includes(`100${NBSP}°C`), "espace avant °C");
  const libre = figureHtml(EXEMPLES.svg, { uid: "t", strict: true });
  assert.ok(libre.includes(`50${FINE}%${FINE}?`) || libre.includes(`50${FINE}% ?`) || libre.includes(`50${FINE}%`), "espace avant %");
  assert.ok(libre.includes(`%${FINE}?`) || libre.includes(`% ?`.replace(" ", FINE)), "espace fine avant ?");
  const barres = figureHtml(EXEMPLES.barres, { uid: "t", strict: true });
  assert.ok(barres.includes(`30${FINE}%`));
  assert.ok(figureHtml({ ...EXEMPLES.etapes, legende: "Quoi : ça ?" }, { uid: "t" }).includes(`Quoi${NBSP}: ça${FINE}?`));
});

test("valeurUnite et nombreFr : virgule décimale, vrai signe moins, unités insécables", () => {
  assert.equal(valeurUnite(12.5, "g"), `12,5${NBSP}g`);
  assert.equal(valeurUnite(40, "%"), `40${FINE}%`);
  assert.equal(valeurUnite(-3, "°C"), `−3${NBSP}°C`);
  assert.equal(valeurUnite("2 à 3", ""), "2 à 3");
  assert.equal(nombreFr(0.5), "0,5");
});

test("identifiants uniques : deux figures d'une page ne partagent aucun id, et les marqueurs du SVG libre suivent", () => {
  const a = figureHtml(EXEMPLES.svg), b = figureHtml(EXEMPLES.svg);
  const ids = h => [...h.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  const tous = [...ids(a), ...ids(b)];
  assert.equal(new Set(tous).size, tous.length);
  const refs = [...a.matchAll(/url\(#([^)]+)\)/g)].map(m => m[1]);
  assert.ok(refs.length > 0);
  for (const r of refs) assert.ok(ids(a).includes(r), `${r} n'est défini nulle part dans la figure`);
  assert.doesNotMatch(a, /#fg-fl-/);
});

test("courbe qualitative : aucune graduation chiffrée sur les axes", () => {
  const h = svgFigure(EXEMPLES.courbe, "t");
  const textes = [...h.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map(m => m[1]);
  assert.ok(textes.length > 0);
  assert.ok(!textes.some(t => /^\d/.test(t)), "un texte commence par un chiffre : " + textes.join(" | "));
  assert.ok(textes.includes("sec") && textes.includes("humide"));
});

test("courbe chiffrée : graduations sur les deux axes, unité dans le titre de l'axe", () => {
  const h = svgFigure({ type: "courbe", titre: "t", alt: "a", x: { label: "Temps", unite: "min", min: 0, max: 60 }, y: { min: 0, max: 100 },
    series: [{ points: [[0, 0], [60, 100]] }] }, "t");
  assert.match(h, />0</); assert.match(h, />60</); assert.match(h, />100</);
  assert.ok(h.includes(`Temps (min)`));
});

test("cheminLisse : la courbe passe par le sommet sans le dépasser, et reste dans la boîte des points", () => {
  const pts = [[0, 100], [50, 10], [100, 100]];
  const d = cheminLisse(pts);
  const ys = [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map(m => Number(m[2]));
  assert.ok(Math.min(...ys) >= 10 - 1e-6, "dépasse le sommet : " + d);
  assert.ok(Math.max(...ys) <= 100 + 1e-6);
  assert.equal(cheminLisse([[0, 0]]), "");
  assert.match(cheminLisse([[0, 0], [10, 5]]), /^M0 0L10 5$/);
});

test("graduationsAuto : des pas ronds, bornes comprises", () => {
  assert.deepEqual(graduationsAuto(0, 100, 5), [0, 20, 40, 60, 80, 100]);
  assert.deepEqual(graduationsAuto(90, 230, 5), [100, 150, 200]);
  assert.deepEqual(graduationsAuto(0, 14, 5), [0, 5, 10]);
});

test("enrouler : aucune ligne plus large que la boîte, les insécables ne coupent jamais, \\n est respecté", () => {
  const lignes = enrouler("Une étiquette assez longue pour passer sur plusieurs lignes", 100, { taille: 11.5 });
  assert.ok(lignes.length > 1);
  for (const l of lignes) assert.ok(largeurTexte(l, 11.5) <= 100, l);
  assert.deepEqual(enrouler("150 °C", 10), [`150${NBSP}°C`]);
  assert.deepEqual(enrouler("a\nb", 200), ["a", "b"]);
});

test("échelle : les étiquettes voisines ne se chevauchent pas (réparties au-dessus et en dessous)", () => {
  const fig = { type: "echelle", titre: "t", alt: "a", min: 0, max: 14, graduations: [0, 7, 14],
    marqueurs: [3, 3.5, 4, 4.5, 5].map(v => ({ v, label: "étiquette " + v })) };
  const h = svgFigure(fig, "t");
  // Chaque étiquette est un <text> : on relève x (centre), y, et la largeur estimée.
  const boites = [...h.matchAll(/<text class="fg-txt fg-txt-s[^"]*" x="([\d.]+)" y="([\d.]+)" text-anchor="middle"><tspan[^>]*>(étiquette[^<]*)<\/tspan>/g)]
    .map(m => ({ x: +m[1], y: +m[2], w: largeurTexte(m[3], 11.5) }));
  assert.equal(boites.length, 5);
  for (let i = 0; i < boites.length; i++) for (let j = i + 1; j < boites.length; j++) {
    const a = boites[i], b = boites[j];
    const memeRang = Math.abs(a.y - b.y) < 12;
    if (memeRang) assert.ok(Math.abs(a.x - b.x) >= (a.w + b.w) / 2, `${i} et ${j} se chevauchent`);
  }
});

test("étapes : en ligne jusqu'à trois cases courtes, en colonne au-delà ou si un mot est trop large", () => {
  const ligne = svgFigure(EXEMPLES.etapes, "t");
  const colonne = svgFigure({ ...EXEMPLES.etapes, etapes: [...EXEMPLES.etapes.etapes, { libelle: "Servir" }] }, "t");
  const longMot = svgFigure({ ...EXEMPLES.etapes, etapes: [{ libelle: "Anticonstitutionnellement" }, { libelle: "b" }] }, "t");
  const hauteur = s => +s.match(/viewBox="0 0 320 (\d+)"/)[1];
  assert.ok(hauteur(colonne) > hauteur(ligne));
  const flecheVerticale = s => /<line class="fg-t-axe" x1="160" y1="[\d.]+" x2="160"/.test(s);
  assert.ok(!flecheVerticale(ligne), "trois cases courtes : côte à côte");
  assert.ok(flecheVerticale(colonne), "quatre cases : en colonne");
  assert.ok(flecheVerticale(longMot), "un mot plus large que la case : en colonne");
  assert.match(colonne, /marker-end="url\(#fg-t-fl-encre\)"/);
});

test("comparaison : deux ou trois panneaux, jamais un ni quatre", () => {
  assert.throws(() => figureHtml({ ...EXEMPLES.comparaison, panneaux: [EXEMPLES.comparaison.panneaux[0]] }, { strict: true }), /deux ou trois/);
  assert.throws(() => figureHtml({ ...EXEMPLES.comparaison, panneaux: Array(4).fill(EXEMPLES.comparaison.panneaux[0]) }, { strict: true }), /deux ou trois/);
  const trois = figureHtml({ ...EXEMPLES.comparaison, fleche: false, panneaux: [...EXEMPLES.comparaison.panneaux, EXEMPLES.comparaison.panneaux[0]] }, { strict: true });
  assert.equal((trois.match(/<svg class="fg-pn" x=/g) || []).length, 3);
});

test("une figure invalide ne casse jamais la fiche : chaîne vide (et exception en mode strict)", () => {
  for (const mauvaise of [{ type: "inconnu" }, { type: "courbe" }, { type: "echelle" }, { type: "barres" }, { type: "svg", vb: "n'importe quoi" }, {}]) {
    assert.equal(figureHtml(mauvaise), "");
    assert.throws(() => figureHtml(mauvaise, { strict: true }));
  }
});

test("zoom : le bouton porte le fondamental et le rang ; la version agrandie n'a pas de bouton", () => {
  const h = figureHtml(EXEMPLES.barres, { uid: "t", fond: "maillard", i: 2 });
  assert.match(h, /<button type="button" class="fg-agrandir" data-fg-zoom data-fg-fond="maillard" data-fg-i="2" aria-label="Agrandir le schéma : Barres"/);
  const z = figureHtml(EXEMPLES.barres, { uid: "t", zoom: true });
  assert.doesNotMatch(z, /<button/);
  assert.match(z, /fg-zoomee/);
});

test("zoom : le bouton vit dans la légende, à côté du titre — jamais dans le cadre du dessin", () => {
  for (const fig of Object.values(EXEMPLES)) {
    const h = figureHtml(fig, { uid: "t", fond: "maillard", i: 0 });
    const cadre = h.slice(h.indexOf('<div class="fg-cadre">'), h.indexOf("</div>") + 6);
    assert.doesNotMatch(cadre, /<button/, "le bouton n'est pas sur le dessin");
    const legende = h.slice(h.indexOf("<figcaption>"));
    assert.match(legende, /^<figcaption><span class="fg-titre">[^<]*<\/span><button type="button" class="fg-agrandir"/);
  }
  const css = lire("css/figures.css");
  assert.match(css, /\.fg-agrandir \{[^}]*width: 44px;[^}]*height: 44px;/s, "une cible de 44 px");
  assert.doesNotMatch(css.slice(css.indexOf(".fg-agrandir {"), css.indexOf("}", css.indexOf(".fg-agrandir {"))), /position: absolute/);
});

test("figuresA : chaque emplacement, et « pourquoi » selon le paragraphe (borné au dernier)", () => {
  const f = (ou, apres) => ({ ...EXEMPLES.barres, ou, apres, titre: `${ou}${apres ?? ""}` });
  const figs = [f("tete"), f("cas"), f("reperes"), f("pourquoi"), f("pourquoi", 2), f("pourquoi", 9)];
  const titres = h => [...h.matchAll(/class="fg-titre">([^<]*)</g)].map(m => m[1]);
  assert.deepEqual(titres(figuresA(figs, "x", "tete")), ["tete"]);
  assert.deepEqual(titres(figuresA(figs, "x", "cas")), ["cas"]);
  assert.deepEqual(titres(figuresA(figs, "x", "reperes")), ["reperes"]);
  assert.deepEqual(titres(figuresA(figs, "x", "pourquoi", { k: 1, nbParagraphes: 3 })), ["pourquoi"]);
  assert.deepEqual(titres(figuresA(figs, "x", "pourquoi", { k: 2, nbParagraphes: 3 })), ["pourquoi2"]);
  assert.deepEqual(titres(figuresA(figs, "x", "pourquoi", { k: 3, nbParagraphes: 3 })), ["pourquoi9"]);
  assert.equal(figuresA(undefined, "x", "tete"), "");
});

test("balisesEquilibrees : repère les balises mal fermées", () => {
  assert.ok(balisesEquilibrees(`<g><rect a="1"/><text>x</text></g>`));
  assert.ok(!balisesEquilibrees(`<g><rect/>`));
  assert.ok(!balisesEquilibrees(`<g><text></g></text>`));
  assert.ok(balisesEquilibrees(`<!-- <g> --><g/>`));
});

/* ---------- Chargement tolérant ---------- */

test("figuresDe : jamais d'exception, vide sans le fichier, le tableau de la fiche avec", async () => {
  const { figuresDe, figuresChargees } = await import("../../js/core/fonds.js");
  const sauve = globalThis.FIGURES;
  try {
    delete globalThis.FIGURES;
    assert.equal(figuresChargees(), false);
    assert.deepEqual(figuresDe("maillard"), []);
    globalThis.FIGURES = null;
    assert.deepEqual(figuresDe("maillard"), []);
    globalThis.FIGURES = { maillard: "pas un tableau" };
    assert.deepEqual(figuresDe("maillard"), []);
    globalThis.FIGURES = sauve;
    assert.ok(figuresDe("maillard").length >= 3);
    assert.deepEqual(figuresDe("n-existe-pas"), []);
  } finally { globalThis.FIGURES = sauve; }
});

/* ---------- Données de js/figures.js ---------- */

test("figures.js : une section par famille, dans l'ordre, séparées d'au moins trois lignes vides", () => {
  const src = lire("js/figures.js");
  let dernier = -1;
  for (const fam of FAMILLES) {
    const d = src.indexOf(`/* ===== ${fam} ===== */`), f = src.indexOf(`/* ===== fin ${fam} ===== */`);
    assert.ok(d > dernier && f > d, `section ${fam}`);
    if (dernier >= 0) assert.match(src.slice(dernier, d), /\n\n\n\n/, `3 lignes vides avant ${fam}`);
    dernier = f;
  }
});

test("figures.js : chaque figure a un type, un titre, une légende, une description et un emplacement valides", () => {
  for (const [cle, liste] of Object.entries(FIGURES)) {
    assert.ok(FONDAMENTAUX.some(f => f.id === cle), cle);
    for (const fig of liste) {
      assert.ok(TYPES.includes(fig.type), `${cle} : ${fig.type}`);
      assert.ok(EMPLACEMENTS.includes(fig.ou));
      for (const k of ["titre", "legende", "alt"]) assert.ok(fig[k] && fig[k].trim(), `${cle} ${fig.titre} : ${k}`);
      const h = figureHtml(fig, { strict: true });
      assert.ok(balisesEquilibrees(h), `${cle} : ${fig.titre}`);
      assert.doesNotMatch(h, /#[0-9a-fA-F]{3,8}\b(?!-)|rgb\(|NaN|undefined/);
    }
  }
});

test("maillard : trois à quatre figures de référence, les chiffres viennent de la fiche", () => {
  const f = FIGURES.maillard;
  assert.ok(f.length >= 3 && f.length <= 4);
  const fond = FONDAMENTAUX.find(x => x.id === "maillard");
  const texte = JSON.stringify(fond);
  // Tout nombre suivi de °C dans les figures figure aussi dans la fiche.
  // (90 et 230 ne sont que les bornes de la règle, pas des affirmations.)
  for (const [, n] of JSON.stringify(f).matchAll(/(\d+)[\u00a0 ]°C/g)) assert.ok(["90", "230"].includes(n) || texte.includes(n), `${n} °C absent de la fiche`);
  assert.ok(f.some(x => x.type === "courbe" && x.qualitative && /qualitative/.test(x.legende)));
});

/* ---------- Palette ---------- */

test("css : toute classe fg-… écrite par le moteur ou par les données existe dans css/figures.css", () => {
  const css = lire("css/figures.css");
  const definies = new Set([...css.matchAll(/\.(fg-[a-z0-9-]+)/g)].map(m => m[1]));
  const sources = [lire("js/ui/figures.js"), lire("js/figures.js")].join("\n");
  const utilisees = new Set();
  for (const m of sources.matchAll(/class="([^"$]*)"/g)) for (const c of m[1].split(/\s+/)) if (c.startsWith("fg-")) utilisees.add(c);
  for (const m of sources.matchAll(/`fg-(?:t|f|txt|mk)-\$\{[^}]*\}[a-z-]*`/g)) void m;
  for (const t of TONS) for (const base of ["fg-t-", "fg-f-", "fg-mk-"]) utilisees.add(base + t);
  for (const t of TONS.filter(x => x !== "encre" && x !== "doux")) { utilisees.add(`fg-f-${t}-l`); utilisees.add(`fg-txt-${t}`); }
  const manquantes = [...utilisees].filter(c => !definies.has(c));
  assert.deepEqual(manquantes, []);
});

test("css : aucune couleur en dur dans css/figures.css (seulement des variables du thème)", () => {
  const css = lire("css/figures.css").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
});

const base = lire("css/base.css");
const variables = sel => {
  const d = base.indexOf(sel + " {");
  return Object.fromEntries([...base.slice(d, base.indexOf("\n}", d)).matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)].map(m => [m[1], m[2].toUpperCase()]));
};
const CLAIR = variables(":root"), SOMBRE = { ...CLAIR, ...variables('html[data-theme="dark"]') };
const lum = hex => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [16, 8, 0].map(s => ((n >> s) & 255) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

for (const [nom, th] of [["clair", CLAIR], ["sombre", SOMBRE]]) {
  test(`contraste (${nom}) : le texte des figures atteint 4,5:1 sur le papier, la carte et la teinte de son ton`, () => {
    const paires = [
      ["ink", ["card", "paper", "paper-deep", "green-tint", "gold-tint", "terra-tint", "bleu-tint"]],
      ["ink-soft", ["card", "paper", "paper-deep", "green-tint", "gold-tint", "terra-tint", "bleu-tint"]],
      ["muted", ["card", "paper", "terra-tint", "bleu-tint"]],
      ["green-deep", ["card", "paper", "green-tint"]],
      ["gold-deep", ["card", "paper", "gold-tint"]],
      ["terra-deep", ["card", "paper", "terra-tint"]],
      ["bleu-deep", ["card", "paper", "bleu-tint"]]
    ];
    for (const [texte, fonds] of paires) for (const fond of fonds) {
      const r = ratio(th[texte], th[fond]);
      assert.ok(r >= 4.5, `--${texte} sur --${fond} : ${r.toFixed(2)}:1`);
    }
  });
  test(`contraste (${nom}) : les traits des figures atteignent 3:1 sur la carte`, () => {
    for (const c of ["green", "terra", "bleu", nom === "sombre" ? "gold-deco" : "gold", "ink-soft"]) {
      const r = ratio(th[c], th.card);
      assert.ok(r >= 3, `--${c} sur --card : ${r.toFixed(2)}:1`);
    }
  });
}

/* ---------- Le thermomètre du carnet (THERMOMETRE, js/ui/figures.js) ---------- */

import { THERMOMETRE } from "./donnees.mjs";
import { thermometreHtml, thermometreMise } from "../../js/ui/figures.js";

const titreDeFiche = id => (FONDAMENTAUX.find(f => f.id === id) || {}).t || null;
const textesDe = f => [f.accroche, f.pourquoi, f.piege || "", ...(f.cas || []).flatMap(c => [c.q, c.r]), ...(f.reperes || [])].join("\n").replace(/[\u00a0\u202f]/g, " ");

test("thermomètre : chaque repère désigne une fiche existante, un ton connu, des bornes cohérentes", () => {
  assert.ok(Array.isArray(THERMOMETRE) && THERMOMETRE.length >= 30, "THERMOMETRE rassemble les repères des fiches");
  for (const [i, r] of THERMOMETRE.entries()) {
    const ref = `THERMOMETRE[${i}] « ${r.label} »`;
    assert.ok(titreDeFiche(r.fond), `${ref} : la fiche « ${r.fond} » n'existe pas`);
    assert.ok(TONS.includes(r.ton), `${ref} : ton inconnu`);
    assert.ok(Number.isFinite(r.de), `${ref} : « de » numérique`);
    if (r.a !== undefined) assert.ok(r.a > r.de, `${ref} : « a » doit dépasser « de »`);
    if (r.ouvert !== undefined) assert.ok(r.ouvert === "haut" && r.a === undefined, `${ref} : « ouvert » vaut « haut », sans « a »`);
    if (r.ancre !== undefined) assert.ok(r.ancre >= r.de && r.ancre <= (r.a ?? r.de), `${ref} : « ancre » dans la zone`);
    assert.doesNotMatch(r.label, /[{}]|#[0-9a-fA-F]{3,8}\b|rgba?\(/, `${ref} : ni accolade ni couleur`);
  }
});

test("thermomètre : aucun chiffre inventé — chaque température et chaque nombre d'une étiquette figure dans la fiche désignée", () => {
  /* Quand la fiche écrit « une soixantaine » ou « quelques dixièmes sous zéro », le chiffre est son équivalent en mots. */
  const EQUIVALENT = { 60: /soixantaine/, 80: /quatre-vingts/, 10: /dizaine/, 0: /zéro/ };
  const present = (texte, v) =>
    new RegExp(`(?<![\\d,.])${nombreFr(Math.abs(v))}(?![\\d,]|\\.\\d)`).test(texte) || (EQUIVALENT[v] || /$^/).test(texte);
  for (const r of THERMOMETRE) {
    const texte = textesDe(FONDAMENTAUX.find(f => f.id === r.fond));
    for (const v of [r.de, r.a].filter(x => x !== undefined)) assert.ok(present(texte, v), `« ${r.label} » (${r.fond}) : ${v} ne figure pas dans la fiche`);
    /* Les nombres écrits dans l'étiquette elle-même. */
    for (const m of r.label.matchAll(/(?<![\d,])\d+(?:,\d+)?(?![\d,])/g)) {
      assert.ok(present(texte, Number(m[0].replace(",", "."))), `« ${r.label} » (${r.fond}) : « ${m[0]} » ne figure pas dans la fiche`);
    }
  }
});

test("thermomètre : toute fiche qui cite une température en °C a son repère", () => {
  const sans = FONDAMENTAUX.filter(f => /°C/.test(textesDe(f)) && !THERMOMETRE.some(r => r.fond === f.id)).map(f => f.id);
  assert.deepEqual(sans, [], "fiches avec des °C mais sans repère dans le thermomètre");
});

test("thermomètre : la mise en page range du chaud au froid, sans étiquettes qui se touchent", () => {
  const m = thermometreMise(THERMOMETRE, { titreDe: titreDeFiche });
  assert.equal(m.items.length, THERMOMETRE.length);
  /* L'ordre visuel : une hauteur croissante, donc une température décroissante. */
  for (let i = 1; i < m.items.length; i++) {
    assert.ok(m.items[i].y >= m.items[i - 1].y - 1e-6, "les repères se suivent du haut vers le bas");
    assert.ok(m.items[i].haut >= m.items[i - 1].haut + m.items[i - 1].hLabel - 1e-6, `les étiquettes « ${m.items[i - 1].label} » et « ${m.items[i].label} » se chevauchent`);
  }
  assert.ok(m.items.every(r => r.haut >= 0 && r.haut + r.hLabel <= m.h), "toutes les étiquettes tiennent dans la hauteur");
  /* L'échelle : plus chaud = plus haut, y compris d'un tronçon à l'autre. */
  const par = [...m.items].sort((a, b) => a.cible - b.cible);
  for (let i = 1; i < par.length; i++) assert.ok(par[i].y <= par[i - 1].y + 1e-6, `${par[i].cible} °C est plus bas que ${par[i - 1].cible} °C`);
  /* Des ruptures là où plus de 12 °C séparent deux repères (les tronçons débordent de 1,5 °C de chaque côté). */
  assert.ok(m.troncons.length >= 3);
  for (let i = 1; i < m.troncons.length; i++) assert.ok(m.troncons[i].v0 - m.troncons[i - 1].v1 > 9 - 1e-6, "plus de 12 °C entre deux repères séparent deux tronçons");
  for (const t of m.troncons) {
    assert.ok(t.h > 0 && t.graduations.length >= 1 && t.graduations.every(g => g >= t.v0 - 1e-6 && g <= t.v1 + 1e-6));
    for (const r of m.items) if (r.ouvert !== "haut" && r.de >= t.v0 && (r.a ?? r.de) <= t.v1) assert.ok(r.yBas <= t.y1 + 4 && r.yHaut >= t.y0 - 4, "une plage reste dans son tronçon");
  }
  /* Les rangées des plages : deux plages d'une même rangée ne se recouvrent pas ; elles laissent la place des étiquettes. */
  const zones = m.items.filter(r => r.zone);
  for (const a of zones) for (const b of zones) {
    if (a !== b && a.rangee === b.rangee) assert.ok(a.yBas <= b.yHaut || b.yBas <= a.yHaut, `les plages « ${a.label} » et « ${b.label} » se recouvrent`);
  }
  assert.ok(m.xSortie < 100, "les rangées de plages laissent la place des étiquettes");
  assert.equal(m.min, -40);
  assert.equal(m.max, 220);
});

test("thermomètre : chaque repère est un lien focalisable vers sa fiche, nommé pour un lecteur d'écran", () => {
  const svg = thermometreHtml(THERMOMETRE, { titreDe: titreDeFiche, uid: "t" });
  assert.ok(balisesEquilibrees(svg), "balises équilibrées");
  const liens = [...svg.matchAll(/<a class="th-lien" href="#\/fondamental\/([a-z-]+)" aria-label="([^"]*)"/g)];
  assert.equal(liens.length, THERMOMETRE.length, "un lien par repère");
  for (const [, id, brut] of liens) {
    const nom = brut.replace(/[\u00a0\u202f]/g, " ").replace(/&#39;/g, "'");
    assert.ok(titreDeFiche(id));
    assert.ok(nom.includes(`Fiche : ${titreDeFiche(id)}`), `le lien vers « ${id} » nomme sa fiche : ${nom}`);
    assert.match(nom, /°C/, "et dit sa température");
  }
  /* Lu du haut vers le bas : le plus chaud d'abord. */
  assert.match(liens[0][2], /^220/);
  assert.match(liens.at(-1)[2], /^de −40 à 40/);
  /* Un groupe (pas une image) : les liens restent atteignables ; nom et description. */
  assert.match(svg, /<svg [^>]*role="group"[^>]*aria-labelledby="fg-t-t fg-t-d"/);
  assert.match(svg, /<title id="fg-t-t">Le thermomètre du carnet<\/title><desc id="fg-t-d">[^<]{80,}<\/desc>/);
  assert.doesNotMatch(svg, /role="img"/);
  /* Aucune couleur en dur : des classes et des dégradés par référence. */
  assert.doesNotMatch(svg, /#[0-9a-fA-F]{3,8}\b|rgba?\(|\bstyle=|<script|\son[a-z]+=/);
  /* Les identifiants sont ceux de CETTE figure : deux thermomètres dans une page ne se marchent pas dessus. */
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, new Set(ids).size);
  assert.ok(ids.every(id => id.startsWith("fg-t-")));
  for (const m of svg.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(m[1]), `url(#${m[1]}) a sa cible`);
});

test("thermomètre : un repère dont la fiche n'existe pas disparaît, une figure vide rend une chaîne vide", () => {
  const donnees = [{ de: 100, label: "Plafond de l'eau", fond: "eau-coloration", ton: "bleu" }, { de: 50, label: "Fiche fantôme", fond: "nulle-part", ton: "or" }];
  const svg = thermometreHtml(donnees, { titreDe: titreDeFiche, uid: "x" });
  assert.equal([...svg.matchAll(/<a class="th-lien"/g)].length, 1);
  assert.doesNotMatch(svg, /nulle-part/);
  assert.equal(thermometreHtml([], { titreDe: titreDeFiche }), "");
  assert.equal(thermometreHtml(undefined), "");
  assert.equal(thermometreHtml([{ de: "chaud", label: "x", fond: "eau-coloration" }, { de: 5, a: 3, label: "inverse", fond: "eau-coloration" }], { titreDe: titreDeFiche }), "");
});

test("thermomètre : un point est un disque sur l'axe, une plage un dégradé, une zone ouverte un chevron", () => {
  const svg = thermometreHtml([
    { de: 100, label: "Un plafond", fond: "eau-coloration", ton: "bleu" },
    { de: 140, a: 180, label: "Une plage", fond: "maillard", ton: "terra" },
    { de: 200, ouvert: "haut", label: "Sans plafond", fond: "maillard", ton: "terra" }
  ], { titreDe: titreDeFiche, uid: "z" });
  assert.equal([...svg.matchAll(/<circle class="fg-f-bleu fg-pt"/g)].length, 1);
  assert.match(svg, /<rect class="th-barre"[^>]*fill="url\(#fg-z-gr-terra\)"/);
  assert.match(svg, /<rect class="th-barre"[^>]*fill="url\(#fg-z-grh-terra\)"/);
  assert.match(svg, /<linearGradient id="fg-z-gr-terra"[^>]*><stop offset="0" class="fg-st-terra" stop-opacity="0"\/>/);
  const clair = svg.replace(/[\u00a0\u202f]/g, " ");
  assert.match(clair, /&gt; 200 °C/);
  assert.match(clair, /aria-label="200 °C et au-delà : Sans plafond\./);
  /* Les nombres négatifs portent le vrai signe moins et se disent « de … à … ». */
  const froid = thermometreHtml([{ de: -1.5, a: -1, label: "Glace", fond: "froid-raffermit", ton: "bleu" }, { de: -18, label: "Congélateur", fond: "poisson-cru", ton: "bleu" }], { titreDe: titreDeFiche, uid: "f" });
  const froidClair = froid.replace(/[\u00a0\u202f]/g, " ");
  assert.match(froidClair, /−1,5 à −1 °C/);
  assert.match(froidClair, /aria-label="de −1,5 à −1 °C : Glace\./);
  assert.match(froidClair, /aria-label="−18 °C : Congélateur\./);
});

test("thermomètre : la feuille de style lit les variables du thème, sans couleur en dur", () => {
  const css = lire("css/figures.css").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const c of ["fg-st-vert", "fg-st-or", "fg-st-terra", "fg-st-bleu", "fg-st-doux", "th-lien", "th-zone", "th-barre", "th-guide", "th-tube"]) assert.match(css, new RegExp(`\\.${c}\\b`), `.${c} manque à css/figures.css`);
  assert.match(css, /\.fg-st-terra \{ stop-color: var\(--terra\); \}/);
  const savoirs = lire("css/savoirs.css").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.match(savoirs, /\.th-encart\[hidden\] \{ display: none; \}/);
  assert.doesNotMatch(savoirs.slice(savoirs.indexOf(".th-encart")), /#[0-9a-fA-F]{3,8}\b|rgba?\(/);
});

test("css : fg-f-suie, le noir de brûlé, reste sombre dans les deux thèmes (fg-f-encre devient crème en sombre), avec un liseré clair en sombre", () => {
  const css = lire("css/figures.css").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.match(css, /\.fg-f-suie \{ fill: var\(--suie\); stroke: var\(--suie-bord\);/);
  assert.ok(lum(CLAIR.suie) < 0.05 && lum(SOMBRE.suie) < 0.05, "sombre en clair comme en sombre");
  assert.ok(lum(SOMBRE.ink) > 0.5, "alors que l'encre est claire en sombre : fg-f-encre ne ferait pas un fond noir");
  assert.ok(ratio(SOMBRE["suie-bord"], SOMBRE.card) >= 3, "le liseré détache le noir de la carte sombre");
  assert.ok(ratio(CLAIR.suie, CLAIR.card) >= 10, "et le noir tranche sur la carte claire");
  /* Documenté en tête de js/figures.js. */
  assert.match(lire("js/figures.js"), /fg-f-suie/);
});

test("figures.js : l'en-tête documente la palette et les options (sens des tons, symboles, flèches, colonnes, coupures…)", () => {
  const entete = lire("js/figures.js").slice(0, lire("js/figures.js").indexOf("const FIGURES = {};"));
  for (const mot of [/terra = la chaleur/, /or-l \(le fond clair doré\)/, /nuance plus PÂLE/, /POURCENTAGE nomme toujours sa base/, /fg-fd-encre/, /UNE pointe par bout/,
    /propage son trait/, /zonesY/, /ancre: "gauche"/, /VERS LE HAUT/, /x\.graduations/, /cote: "haut" \| "bas"/, /coupures/, /rangees: true/, /PLAGE/, /colonnes: 1 \| 2 \| 3/,
    /vb. RECOMMANDÉ/, /SYMBOLES PARTAGÉS/, /fg-sym-NOM/, /planche-symboles/]) assert.match(entete, mot);
  assert.match(lire("js/figures.js"), /EMOJI de sa fiche/, "documenté avec THERMOMETRE");
  for (const nom of Object.keys(SYMBOLES)) assert.ok(entete.includes(nom), `le symbole « ${nom} » est documenté en tête`);
  const readme = lire("README.md");
  for (const mot of [/zonesY/, /coupures/, /colonnes/, /fg-sym-flamme/, /fg-f-suie/, /completerFigures/, /planche-symboles/]) assert.match(readme, mot);
});

/* ---------- Le thermomètre : emoji, graduations légères, réservoir, regroupement ---------- */

const emojiDeFiche = id => (FONDAMENTAUX.find(f => f.id === id) || {}).emoji || "";

test("thermomètre : chaque étiquette est précédée de l'emoji de sa fiche", () => {
  const svg = thermometreHtml(THERMOMETRE, { titreDe: titreDeFiche, emojiDe: emojiDeFiche, uid: "t" });
  const emojis = [...svg.matchAll(/<text class="fg-emoji th-emoji"[^>]*>([^<]+)<\/text>/g)].map(m => m[1]);
  assert.equal(emojis.length, THERMOMETRE.length);
  const liens = [...svg.matchAll(/data-th-fond="([a-z-]+)">[\s\S]*?<\/a>/g)];
  for (const [bloc, id] of liens) assert.ok(bloc.includes(`>${emojiDeFiche(id)}</text>`), `l'emoji de « ${id} » précède son étiquette`);
  /* L'emoji n'entre pas dans le nom lu par un lecteur d'écran, et le texte garde sa place. */
  assert.doesNotMatch(svg.replace(/<text class="fg-emoji[^>]*>[^<]*<\/text>/g, ""), new RegExp(emojiDeFiche("maillard")));
  const sans = thermometreHtml(THERMOMETRE, { titreDe: titreDeFiche, uid: "t" });
  assert.doesNotMatch(sans, /th-emoji/, "sans emojiDe : aucun emoji");
});

test("thermomètre : des graduations légères — les bornes de chaque tronçon et quelques valeurs rondes", () => {
  const m = thermometreMise(THERMOMETRE, { titreDe: titreDeFiche });
  for (const t of m.troncons) {
    const reperes = THERMOMETRE.flatMap(r => [r.de, r.a].filter(v => v !== undefined)).filter(v => v >= t.v0 && v <= t.v1);
    assert.ok(t.graduations.includes(Math.min(...reperes)) && t.graduations.includes(Math.max(...reperes)), "les deux bornes du tronçon");
    assert.ok(t.graduations.length <= 6, `quelques graduations seulement (${t.graduations.length})`);
    for (let i = 1; i < t.graduations.length; i++) assert.ok((t.graduations[i] - t.graduations[i - 1]) * t.pxDeg >= 14.9, "jamais plus serrées que 15 unités");
  }
  const total = m.troncons.reduce((s, t) => s + t.graduations.length, 0);
  assert.ok(total <= 28, `peu de traits au total (${total})`);
  /* Les valeurs extrêmes restent lisibles. */
  const nums = [...thermometreHtml(THERMOMETRE, { titreDe: titreDeFiche, uid: "t" }).matchAll(/class="fg-txt fg-txt-s th-num"[^>]*>([^<]+)</g)].map(x => x[1]);
  assert.ok(nums.includes("−40") && nums.includes("220"));
});

test("thermomètre : un réservoir arrondi, de la couleur froide, au pied de l'axe", () => {
  const m = thermometreMise(THERMOMETRE, { titreDe: titreDeFiche });
  assert.ok(m.bulbe && m.bulbe.r >= 6 && Math.abs(m.bulbe.cy - m.hAxe) < 8);
  assert.ok(m.h >= m.bulbe.cy + m.bulbe.r);
  const svg = thermometreHtml(THERMOMETRE, { titreDe: titreDeFiche, uid: "t" });
  assert.match(svg, /<circle class="th-bulbe fg-f-bleu"/);
});

test("thermomètre : deux repères de même température dans la même fiche se rangent sous un seul point", () => {
  const donnees = [
    { de: 100, label: "Premier constat", fond: "maillard", ton: "terra" },
    { de: 100, label: "Second constat", fond: "maillard", ton: "terra" },
    { de: 100, label: "Autre fiche, même degré", fond: "eau-coloration", ton: "bleu" },
    { de: 60, a: 70, label: "Une plage", fond: "amidon", ton: "vert" },
    { de: 60, a: 70, label: "La même plage", fond: "amidon", ton: "vert" },
    { de: 60, a: 80, label: "Une plage plus longue", fond: "amidon", ton: "vert" }
  ];
  const m = thermometreMise(donnees, { titreDe: titreDeFiche });
  assert.equal(m.items.length, 4, "100 (maillard) ×2 → 1, 100 (autre fiche), 60–70 ×2 → 1, 60–80");
  const point = m.items.find(r => r.fond === "maillard");
  assert.deepEqual(point.autres, ["Second constat"]);
  assert.ok(point.lignes.join(" ").includes("Second constat"));
  const svg = thermometreHtml(donnees, { titreDe: titreDeFiche, uid: "g" });
  assert.equal([...svg.matchAll(/<a class="th-lien"/g)].length, 4);
  assert.equal([...svg.matchAll(/<circle class="fg-f-(?:terra|bleu) fg-pt"/g)].length, 2, "un point par groupe");
  assert.ok(svg.replace(/[  ]/g, " ").includes("100 °C : Premier constat ; Second constat. Fiche"), "le nom parlé rassemble les deux constats");
});

/* ---------- Les symboles partagés ---------- */

import { SYMBOLES, usagesInvalides } from "../../js/ui/figures.js";
import { figuresPlanche } from "../../tools/planche-symboles.mjs";

const NOMS_MINIMUM = ["poele", "casserole", "flamme", "vapeur", "goutte", "bulle", "couteau", "thermometre",
  "cellule", "grain-sel", "cristal", "bacterie", "larve", "oeuf", "feuille", "emulsifiant", "ion-plus", "ion-moins"];
const idsDe = h => [...h.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);

test("symboles : la bibliothèque minimale est là, chaque symbole est un dessin sobre en classes fg-sy-…, sans couleur", () => {
  for (const nom of NOMS_MINIMUM) assert.ok(SYMBOLES[nom], `symbole « ${nom} » manquant`);
  const css = lire("css/figures.css");
  const definies = new Set([...css.matchAll(/\.(fg-[a-z0-9-]+)/g)].map(m => m[1]));
  for (const [nom, s] of Object.entries(SYMBOLES)) {
    assert.match(nom, /^[a-z0-9-]+$/);
    assert.match(s.vb, /^0 0 \d+(\.\d+)? \d+(\.\d+)?$/, `${nom} : vb`);
    assert.ok(TONS.includes(s.ton), `${nom} : ton par défaut`);
    assert.ok(s.desc && s.desc.length > 4, `${nom} : une description`);
    assert.ok(balisesEquilibrees(s.corps), `${nom} : balises`);
    assert.doesNotMatch(s.corps, /#[0-9a-fA-F]{3,8}\b|rgba?\(|\b(?:fill|stroke|style)=/, `${nom} : aucune couleur en dur`);
    for (const m of s.corps.matchAll(/class="([^"]*)"/g)) for (const c of m[1].split(/\s+/)) assert.ok(definies.has(c), `${nom} : la classe ${c} manque à css/figures.css`);
    const l = (s.vb.split(" ")[2] | 0) * 1;
    assert.ok(l > 0);
  }
  for (const t of TONS) assert.ok(definies.has(`fg-sy-${t}`), `classe de ton fg-sy-${t}`);
});

test("symboles : le cadre n'injecte que les <symbol> utilisés, avec des identifiants propres à la figure", () => {
  const fig = { type: "svg", titre: "t", alt: "a", vb: "0 0 320 100",
    corps: `<use href="#fg-sym-flamme" x="10" y="10" width="24" height="30"/><use href="#fg-sym-flamme" x="50" y="10" width="12" height="15"/><use href="#fg-sym-goutte" class="fg-sy-or" transform="rotate(20 100 50)" x="90" y="40" width="16" height="22"/>` };
  const a = svgFigure(fig, "a1"), b = svgFigure(fig, "b2");
  assert.equal([...a.matchAll(/<symbol /g)].length, 2, "flamme (une fois, malgré deux usages) et goutte");
  assert.match(a, /<symbol id="fg-a1-sym-flamme" viewBox="0 0 24 30">/);
  assert.match(a, /<symbol id="fg-a1-sym-goutte"/);
  assert.doesNotMatch(a, /<symbol id="fg-a1-sym-poele"/, "un symbole inutilisé n'est pas injecté");
  assert.doesNotMatch(a, /#fg-sym-/, "les références sont réécrites");
  assert.match(a, /<use href="#fg-a1-sym-flamme" x="10"[^>]* class="fg-sy-terra"\/>/, "ton par défaut du symbole");
  assert.match(a, /<use href="#fg-a1-sym-goutte" class="fg-sy-or" transform=/, "le ton posé par l'auteur reste");
  /* Deux figures dans la page : aucun identifiant en commun, et chaque référence a sa cible. */
  const tous = [...idsDe(a), ...idsDe(b)];
  assert.equal(new Set(tous).size, tous.length);
  for (const m of a.matchAll(/href="#([^"]+)"/g)) assert.ok(idsDe(a).includes(m[1]), `${m[1]} a sa cible`);
  assert.ok(balisesEquilibrees(a));
});

test("symboles : dans un panneau de comparaison, les <symbol> sont définis dans le SVG de la figure", () => {
  const fig = { ...EXEMPLES.comparaison, panneaux: [
    { label: "A", vb: "0 0 100 60", corps: `<use href="#fg-sym-bulle" x="10" y="10" width="18" height="18"/>` },
    { label: "B", vb: "0 0 100 60", corps: `<use href="#fg-sym-bulle" x="40" y="10" width="18" height="18"/><use href="#fg-sym-goutte" x="70" y="10" width="16" height="22"/>` }] };
  const h = svgFigure(fig, "c");
  assert.equal([...h.matchAll(/<symbol /g)].length, 2);
  assert.ok(h.indexOf("<symbol") < h.indexOf("<svg class=\"fg-pn\""), "dans <defs>, avant les panneaux");
  for (const m of h.matchAll(/href="#([^"]+)"/g)) assert.ok(idsDe(h).includes(m[1]));
});

test("symboles : le vérificateur n'autorise <use> qu'avec href=\"#fg-sym-…\" d'un symbole existant", () => {
  assert.deepEqual(usagesInvalides(`<use href="#fg-sym-flamme" x="1" y="2" width="3" height="4"/><use href="#fg-sym-ion-plus" transform="translate(5 6) rotate(30)" class="fg-sy-bleu" opacity=".5" width="9" height="9"/>`), []);
  assert.deepEqual(usagesInvalides(`<rect class="fg-f-or"/>`), []);
  for (const mauvais of [
    `<use href="#autre"/>`, `<use href="#fg-sym-inconnu" width="1" height="1"/>`, `<use href="https://exemple.fr/x.svg#fg-sym-flamme"/>`,
    `<use xlink:href="#fg-sym-flamme"/>`, `<use/>`, `<use href="#fg-sym-flamme" onclick="x()"/>`, `<use href="#fg-sym-flamme" style="fill:red"/>`,
    `<use href="#fg-sym-flamme" transform="url(x)"/>`
  ]) assert.ok(usagesInvalides(mauvais).length > 0, mauvais);
  /* Le vérificateur lui-même : un <use> de symbole passe, tout autre est refusé. */
  const v = lire("tools/verifier-recettes.mjs");
  assert.match(v, /usagesInvalides\(brut\)/);
  assert.match(v, /replace\(\/<use\\b\[\^>\]\*>\/g, ""\)/);
});

test("symboles : la planche de démonstration rend toute la bibliothèque, sans erreur", () => {
  const figs = figuresPlanche();
  assert.ok(figs.length >= 3);
  const html = figs.map(f => figureHtml(f, { strict: true, uid: "p" + figs.indexOf(f), zoom: true })).join("");
  assert.ok(balisesEquilibrees(html));
  for (const nom of Object.keys(SYMBOLES)) assert.match(html, new RegExp(`href="#fg-p\\d-sym-${nom}"`), `${nom} figure sur la planche`);
  assert.doesNotMatch(html, /NaN|undefined/);
});

test("figures.js : les symboles servent vraiment (emulsion, salaison, coagulation, assaisonnement, gluten)", () => {
  const usage = cle => JSON.stringify(FIGURES[cle]).match(/#fg-sym-([a-z-]+)/g) || [];
  assert.ok(usage("emulsion").length >= 40, "les molécules d'émulsifiant");
  assert.ok(usage("salaison").length >= 6, "les rangées de grains");
  assert.ok(usage("coagulation-oeuf").length >= 6);
  assert.ok(usage("assaisonnement-couches").length >= 10);
  assert.ok(usage("gluten").length >= 10);
  /* Le poids qui compte est celui qui voyage : le fichier part compressé, et il
     n'est demandé qu'à l'ouverture des Savoirs. Un plafond en caractères bruts
     poussait à rogner les dessins pour quelques octets que gzip efface. */
  assert.ok(gzipSync(lire("js/figures.js")).length < 90000, "js/figures.js reste léger une fois compressé");
});

/* ---------- Flèches ---------- */

test("flèches : marker-start=\"url(#fg-fd-…)\" pour une cote à double flèche, réécrit et défini par figure", () => {
  const fig = { type: "svg", titre: "t", alt: "a", vb: "0 0 320 60",
    corps: `<path class="fg-t-axe" d="M20 30L300 30" marker-start="url(#fg-fd-encre)" marker-end="url(#fg-fl-encre)"/><path class="fg-t-bleu" d="M20 50L300 50" marker-start="url(#fg-fd-bleu)"/>` };
  const h = svgFigure(fig, "d");
  assert.match(h, /marker-start="url\(#fg-d-fd-encre\)" marker-end="url\(#fg-d-fl-encre\)"/);
  assert.doesNotMatch(h, /#fg-fd-|#fg-fl-/);
  const ids = idsDe(h);
  for (const t of TONS) assert.ok(ids.includes(`fg-d-fd-${t}`) && ids.includes(`fg-d-fl-${t}`), `les deux pointes en ${t}`);
  assert.match(h, /<marker id="fg-d-fd-encre"[^>]*orient="auto"[^>]*><path class="fg-mk fg-mk-encre" d="M9 1\.5L1 5L9 8\.5Z"\/>/, "la pointe de départ regarde vers l'arrière");
  for (const m of h.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(m[1]));
});

/* ---------- Nombres et unités ---------- */

test("enrouler : un nombre n'est jamais séparé de son unité, à aucune largeur", () => {
  const phrase = "Le sel pèse 20 g par kilo, laissez 12 heures, puis 15 min, 3 jours et 40 % d'eau à 150 °C";
  const unites = /^(g|min|heures?|jours?|°C|%)/;
  for (let largeur = 30; largeur <= 200; largeur += 3) {
    const lignes = enrouler(phrase, largeur, { taille: 11.5 });
    for (let i = 0; i < lignes.length - 1; i++) {
      assert.ok(!(/\d$/.test(lignes[i]) && unites.test(lignes[i + 1])), `largeur ${largeur} : « ${lignes[i]} » / « ${lignes[i + 1]} »`);
    }
  }
});

/* ---------- Échelle : cote, coupures, rangées ---------- */

const echelleBase = { type: "echelle", titre: "t", legende: "l", alt: "Une règle pour les tests.", min: 0, max: 100, unite: "°C", label: "T" };
const barreDe = h => +h.match(/<rect class="fg-f-doux fg-t-doux" x="[\d.]+" y="([\d.]+)" width="[\d.]+" height="([\d.]+)"/).slice(1).reduce((a, v, i) => (i ? a + (+v) : +v), 0) - 0;
const rectsDoux = h => [...h.matchAll(/<rect class="fg-f-doux fg-t-doux" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map(m => m.slice(1).map(Number));
const etiquettes = (h, mot) => [...h.matchAll(new RegExp(`<text class="fg-txt fg-txt-s[^"]*" x="([\\d.]+)" y="([\\d.]+)"[^>]*><tspan[^>]*>(${mot}[^<]*)<`, "g"))].map(m => ({ x: +m[1], y: +m[2], t: m[3] }));

test("échelle : cote « haut » ou « bas » force le côté de l'étiquette, d'un marqueur comme d'une zone", () => {
  const fig = { ...echelleBase, zones: [{ de: 10, a: 40, label: "zone", ton: "vert", cote: "bas" }, { de: 60, a: 90, label: "autre zone", ton: "or", cote: "haut" }],
    marqueurs: [{ v: 20, label: "marqueurA", cote: "haut" }, { v: 22, label: "marqueurB", cote: "haut" }, { v: 70, label: "marqueurC", cote: "bas" }, { v: 72, label: "marqueurD" }] };
  const h = svgFigure(fig, "t");
  const [bar] = rectsDoux(h);
  const haut = bar[1], bas = bar[1] + bar[3];
  for (const e of [...etiquettes(h, "marqueurA"), ...etiquettes(h, "marqueurB"), ...etiquettes(h, "autre")]) assert.ok(e.y < haut, `${e.t} au-dessus de la règle`);
  for (const e of [...etiquettes(h, "marqueurC"), ...etiquettes(h, "zone")]) assert.ok(e.y > bas, `${e.t} sous la règle`);
  /* Sans `cote`, le comportement d'avant : deux marqueurs voisins se répartissent haut et bas. */
  const libre = svgFigure({ ...echelleBase, marqueurs: [{ v: 20, label: "marqueurA" }, { v: 22, label: "marqueurB" }] }, "t");
  const [barL] = rectsDoux(libre);
  const [a, b] = [etiquettes(libre, "marqueurA")[0], etiquettes(libre, "marqueurB")[0]];
  assert.ok((a.y < barL[1]) !== (b.y < barL[1]), "l'un en haut, l'autre en bas");
  /* Deux étiquettes forcées du même côté ne se chevauchent pas : la seconde monte d'un étage. */
  const [m1, m2] = [etiquettes(h, "marqueurA")[0], etiquettes(h, "marqueurB")[0]];
  assert.ok(Math.abs(m1.y - m2.y) >= 12 || Math.abs(m1.x - m2.x) >= (largeurTexte(m1.t, 11.5) + largeurTexte(m2.t, 11.5)) / 2, "pas de chevauchement");
});

test("échelle : des coupures interrompent l'axe, avec le signe // et les deux bords étiquetés", () => {
  const fig = { ...echelleBase, min: 0, max: 1000, unite: "g", graduations: [0, 50, 500, 950, 1000], coupures: [{ de: 100, a: 900 }],
    zones: [{ de: 0, a: 60, label: "peu", ton: "bleu" }, { de: 50, a: 1000, label: "beaucoup", ton: "terra" }] };
  const h = svgFigure(fig, "t");
  assert.equal(rectsDoux(h).length, 2, "la règle en deux tronçons");
  const [g, d] = rectsDoux(h);
  assert.ok(Math.abs((d[0] - (g[0] + g[2])) - 16) < 0.2, "un blanc de 16 unités");
  assert.equal([...h.matchAll(/class="fg-t-axe fg-rupture"/g)].length, 2, "le signe // : deux traits penchés");
  assert.match(h, /class="fg-t-axe fg-pointilles"/);
  const nums = [...h.matchAll(/<text class="fg-txt fg-txt-s fg-halo" x="([\d.]+)"[^>]*text-anchor="(\w+)"><tspan[^>]*>([^<]+)</g)].map(m => ({ x: +m[1], ancre: m[2], t: m[3].replace(/[  ]/g, " ") }));
  const textes = nums.map(n => n.t.replace(/ g$/, ""));
  assert.ok(textes.includes("100") && textes.includes("900"), "les deux bords de la coupure");
  assert.ok(!textes.includes("500"), "ce qui tombe dans la coupure disparaît");
  assert.equal(nums.find(n => n.t.startsWith("100")).ancre, "end");
  assert.equal(nums.find(n => n.t.startsWith("900")).ancre, "start");
  /* La zone qui enjambe la coupure se dessine en deux morceaux. */
  assert.ok([...h.matchAll(/<rect class="fg-f-terra-l fg-t-terra fg-t-fin"/g)].length >= 2);
  assert.doesNotMatch(h, /NaN|undefined/);
});

test("échelle : rangees:true met les zones qui se chevauchent sur des pistes parallèles", () => {
  const zones = [{ de: 10, a: 60, label: "une", ton: "bleu" }, { de: 40, a: 90, label: "deux", ton: "or" }, { de: 70, a: 100, label: "trois", ton: "vert" }];
  const sup = svgFigure({ ...echelleBase, zones }, "t");
  const rangs = svgFigure({ ...echelleBase, zones, rangees: true }, "t");
  const ys = h => [...new Set([...h.matchAll(/<rect class="fg-f-(?:bleu|or|vert)-l fg-t-(?:bleu|or|vert) fg-t-fin" x="[\d.]+" y="([\d.]+)"/g)].map(m => m[1]))];
  assert.equal(ys(sup).length, 1, "superposées : une seule piste");
  assert.equal(ys(rangs).length, 2, "« une » et « trois » partagent la première piste, « deux » passe en dessous");
  assert.equal(rectsDoux(rangs).length, 2, "une piste grise par rangée");
  assert.ok(Number(svgFigure({ ...echelleBase, zones, rangees: true }, "t").match(/viewBox="0 0 320 (\d+)"/)[1]) > Number(sup.match(/viewBox="0 0 320 (\d+)"/)[1]));
  /* Des zones qui ne se chevauchent pas restent sur une seule piste, rangées ou non. */
  const net = [{ de: 10, a: 30, label: "a", ton: "bleu" }, { de: 30, a: 50, label: "b", ton: "or" }];
  assert.equal(ys(svgFigure({ ...echelleBase, zones: net, rangees: true }, "t")).length, 1);
});

test("échelle : une tige d'étiquette ne barre pas une graduation (elle se range à côté)", () => {
  const h = svgFigure({ ...echelleBase, min: 90, max: 230, graduations: [100, 150, 200],
    zones: [{ de: 140, a: 150, label: "visible", ton: "or", cote: "bas" }], marqueurs: [{ v: 100, label: "L'eau plafonne la surface à 100 °C" }] }, "t");
  const tige = +h.match(/<line class="fg-t-or fg-t-fin fg-tirets" x1="([\d.]+)"/)[1];
  const grad = [...h.matchAll(/<text class="fg-txt fg-txt-s fg-halo" x="([\d.]+)"[^>]*text-anchor="(\w+)"><tspan[^>]*>150/g)][0];
  assert.ok(grad, "la graduation 150 existe");
  const w = largeurTexte(`150${NBSP}°C`, 11.5);
  const x0 = grad[2] === "end" ? +grad[1] - w : grad[2] === "start" ? +grad[1] : +grad[1] - w / 2;
  assert.ok(tige < x0 || tige > x0 + w, `la tige (${tige}) hors de la graduation [${x0}, ${x0 + w}]`);
});

/* ---------- Courbe : zonesY, ancre, étiquettes étroites ---------- */

const courbeBase = { type: "courbe", titre: "t", legende: "l", alt: "Une courbe pour les tests.", x: { label: "Temps", unite: "min", min: 0, max: 60 }, y: { label: "Température", unite: "°C", min: 0, max: 200 },
  series: [{ nom: "A", points: [[0, 20], [30, 150], [60, 190]] }] };

test("courbe : zonesY dessine des bandes horizontales étiquetées", () => {
  const h = svgFigure({ ...courbeBase, zonesY: [{ de: 100, a: 140, label: "friture", ton: "or" }, { de: 160, a: 200, label: "trop chaud", ton: "terra", ancre: "droite" }] }, "t");
  const bandes = [...h.matchAll(/<rect class="fg-f-(or|terra)-l fg-bande" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map(m => ({ t: m[1], x: +m[2], y: +m[3], w: +m[4], h: +m[5] }));
  assert.equal(bandes.length, 2);
  assert.ok(bandes[0].w > 200 && bandes[0].w === bandes[1].w, "sur toute la largeur du tracé");
  assert.ok(bandes[1].y < bandes[0].y, "la plus chaude est plus haute");
  assert.ok(Math.abs(bandes[0].h - 40 / 200 * 170) < 0.3, "à l'échelle de l'axe y");
  assert.match(h, /text-anchor="start"><tspan[^>]*>friture</);
  assert.match(h, /text-anchor="end"><tspan[^>]*>trop chaud</);
});

test("courbe : l'étiquette d'un repère y se pose à gauche ou à droite", () => {
  const h = svgFigure({ ...courbeBase, reperes: [{ y: 100, label: "à droite", ton: "terra" }, { y: 50, label: "à gauche", ton: "bleu", ancre: "gauche" }] }, "t");
  assert.match(h, /text-anchor="end"><tspan[^>]*>à droite</);
  assert.match(h, /text-anchor="start"><tspan[^>]*>à gauche</);
});

test("courbe : une étiquette de zone trop étroite passe au-dessus du tracé, sur une ligne", () => {
  const fig = { ...courbeBase, zones: [{ de: 20, a: 26, label: "Une zone bien trop étroite pour son étiquette", ton: "or" }, { de: 30, a: 60, label: "large", ton: "vert" }] };
  const h = svgFigure(fig, "t");
  const bloc = h.match(/<text class="fg-txt fg-txt-s fg-txt-b fg-txt-or"[^>]*>((?:<tspan[^>]*>[^<]*<\/tspan>)+)<\/text>/)[1];
  assert.equal((bloc.match(/<tspan/g) || []).length, 1, "une seule ligne, pas quatre");
  assert.ok(Number(h.match(/viewBox="0 0 320 (\d+)"/)[1]) > 0);
  /* Une zone assez large garde son étiquette dans la bande, au ras du tracé. */
  const large = h.match(/<text class="fg-txt fg-txt-s fg-txt-b fg-txt-vert"[^>]*>((?:<tspan[^>]*>[^<]*<\/tspan>)+)<\/text>/)[1];
  assert.equal((large.match(/<tspan/g) || []).length, 1);
  /* Elle ne dépasse pas la figure. */
  const m = h.match(/<text class="fg-txt fg-txt-s fg-txt-b fg-txt-or" x="([\d.]+)"/);
  const w = largeurTexte("Une zone bien trop étroite pour son étiquette", 11.5, { gras: true });
  assert.ok(+m[1] - w / 2 >= 0 && +m[1] + w / 2 <= 320);
});

test("courbe : une courbe qualitative peut porter des graduations explicites en x (les extrémités passent dessous)", () => {
  const fig = { type: "courbe", qualitative: true, titre: "t", legende: "Allure qualitative.", alt: "Une courbe qualitative pour les tests.",
    x: { label: "Temps", extremites: ["tôt", "tard"], graduations: [0, 50, 100], min: 0, max: 100 }, y: { label: "Vitesse" },
    series: [{ points: [[0, 0.1], [50, 1], [100, 0.2]] }] };
  const h = svgFigure(fig, "t");
  const y = mot => +h.match(new RegExp(`<text[^>]* y="([\\d.]+)"[^>]*><tspan[^>]*>${mot}<`))[1];
  assert.ok(h.includes(">50<"));
  assert.ok(y("tôt") > y("50"), "les extrémités sous les graduations");
  assert.ok(y("Temps") > y("tôt"));
});

/* ---------- Barres : une plage ---------- */

test("barres : une barre peut être une plage { de, a }, dessinée comme un segment avec ses deux bornes", () => {
  const fig = { type: "barres", titre: "t", legende: "l", alt: "Une plage et une valeur.", unite: "min", max: 10,
    barres: [{ label: "Plage", de: 2, a: 5, ton: "terra" }, { label: "Valeur", valeur: 8 }, { label: "Texte", de: 1, a: 3, texte: "un peu", ton: "bleu" }] };
  const h = svgFigure(fig, "t");
  assert.equal([...h.matchAll(/<circle class="fg-pt fg-f-terra" /g)].length, 2, "deux bornes");
  assert.match(h, /<path class="fg-t-terra fg-t-tres-epais" d="M[\d.]+ [\d.]+H[\d.]+"/);
  assert.ok(h.replace(/[  ]/g, " ").includes(">2 à 5 min<"));
  assert.ok(h.includes(">un peu<"));
  const [x0, x1] = [...h.matchAll(/<circle class="fg-pt fg-f-terra" cx="([\d.]+)"/g)].map(m => +m[1]);
  const piste = +h.match(/<rect class="fg-f-doux" x="16" y="[\d.]+" width="([\d.]+)"/)[1];
  assert.ok(Math.abs((x0 - 16) / piste - 0.2) < 0.01 && Math.abs((x1 - 16) / piste - 0.5) < 0.01, "à l'échelle de la piste");
  assert.throws(() => figureHtml({ ...fig, barres: [{ label: "x", de: 3, a: 1 }] }, { strict: true }));
});

/* ---------- Comparaison : texte nominal, colonnes ---------- */

const cmp = (nb, extra = {}, vb = "0 0 100 64") => ({ type: "comparaison", titre: "t", legende: "l", alt: "Des panneaux pour les tests.", ...extra,
  panneaux: Array.from({ length: nb }, (_, i) => ({ label: `Panneau ${i + 1}`, sous: "un texte de description assez long pour s'enrouler sur plusieurs lignes", ton: ["vert", "or", "terra"][i], vb,
    corps: `<text class="fg-txt fg-txt-s" x="10" y="20">Un mot</text><circle class="fg-f-or" cx="50" cy="40" r="10"/>` })) });

test("comparaison : le texte d'un panneau garde sa taille nominale, quelle que soit la largeur du panneau", () => {
  const css = lire("css/figures.css");
  for (const [cls, px] of [["fg-txt", 13], ["fg-txt-s", 11.5], ["fg-txt-script", 17], ["fg-txt-xl", 26]]) assert.match(css, new RegExp(`\\.fg-pn \\.${cls}[^{]*\\{ font-size: calc\\(${px}px / var\\(--fg-k, 1\\)\\); \\}`), cls);
  /* Trois panneaux de vb 100 : une zone de 84, donc un facteur de 0,84 — que le cadre pose, et que le CSS annule. */
  const trois = svgFigure(cmp(3), "t");
  assert.equal([...trois.matchAll(/<svg class="fg-pn"[^>]*style="--fg-k:0\.84"/g)].length, 3);
  /* Le vb recommandé (la largeur de la zone) donne l'échelle 1 : rien à corriger. */
  assert.doesNotMatch(svgFigure(cmp(3, {}, "0 0 84 64"), "t"), /--fg-k/);
  assert.doesNotMatch(svgFigure(cmp(2, {}, "0 0 134 64"), "t"), /--fg-k/);
  assert.doesNotMatch(svgFigure(cmp(2, { fleche: true }, "0 0 128 64"), "t"), /--fg-k/);
  assert.match(svgFigure(cmp(2), "t"), /--fg-k:1\.34/);
  assert.match(lire("js/ui/figures.js"), /vb. recommandé|vb` recommandé/);
});

test("comparaison : colonnes 1, 2 ou 3 — une colonne met chaque panneau sur une ligne, dessin à gauche, texte à droite", () => {
  const largeur = h => [...h.matchAll(/<svg class="fg-pn" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)"/g)].map(m => ({ x: +m[1], y: +m[2], w: +m[3] }));
  const haut = h => +h.match(/viewBox="0 0 320 (\d+)"/)[1];
  const trois = svgFigure(cmp(3), "t");
  const une = svgFigure(cmp(3, { colonnes: 1 }), "t");
  const deux = svgFigure(cmp(3, { colonnes: 2 }), "t");
  assert.deepEqual(largeur(trois).map(p => p.y), [16, 16, 16], "par défaut, côte à côte");
  const l1 = largeur(une);
  assert.equal(new Set(l1.map(p => p.x)).size, 1, "une colonne : même abscisse");
  assert.ok(l1[1].y > l1[0].y + 40 && l1[2].y > l1[1].y + 40, "les uns sous les autres");
  const l2 = largeur(deux);
  assert.equal(l2[0].y, l2[1].y);
  assert.ok(l2[2].y > l2[0].y && l2[2].x === l2[0].x, "deux colonnes : le troisième passe sur la rangée suivante");
  assert.ok(haut(une) > haut(trois) && haut(deux) > haut(trois));
  /* Les textes longs ne se coupent plus en quatre : en une colonne, le texte a 160 unités. */
  const lignes = h => Math.max(...[...h.matchAll(/<text class="fg-txt fg-txt-s"[^>]*>((?:<tspan[^>]*>[^<]*<\/tspan>)+)<\/text>/g)].map(m => (m[1].match(/<tspan/g) || []).length));
  assert.ok(lignes(une) < lignes(trois), `${lignes(une)} lignes contre ${lignes(trois)}`);
  /* Les flèches : verticales en une colonne, entre les colonnes sinon. */
  const fl = svgFigure(cmp(3, { colonnes: 1, fleche: true }), "t");
  assert.equal([...fl.matchAll(/<line class="fg-t-axe" x1="160"/g)].length, 2);
  assert.ok(balisesEquilibrees(fl) && !/NaN|undefined/.test(fl));
  /* colonnes plus grand que le nombre de panneaux : on s'en tient au nombre de panneaux. */
  assert.deepEqual(largeur(svgFigure(cmp(2, { colonnes: 3 }), "t")).map(p => p.y), [16, 16]);
});
