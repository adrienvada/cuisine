/* Les figures des savoirs : le moteur de rendu (js/ui/figures.js, pur), le chargement tolérant
   (core/fonds.js), la palette (css/figures.css, css/base.css) et les données de js/figures.js. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  assert.equal((trois.match(/<svg x=/g) || []).length, 3);
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
