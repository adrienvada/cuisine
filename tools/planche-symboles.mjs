/* La planche des symboles partagés : un aperçu de TOUTE la bibliothèque (SYMBOLES, dans
   js/ui/figures.js), en clair et en sombre, pour la regarder avant d'y toucher ou de s'en servir.

   Trois figures : la planche (chaque symbole à sa taille, avec son nom), les tons (le même
   symbole dans chacune des six classes fg-sy-…) et un exemple d'emploi (une couronne de
   molécules d'émulsifiant autour d'une gouttelette, avec transform et width/height).

   Usage :  node tools/planche-symboles.mjs [dossier]
   Écrit planche-symboles.html, planche-symboles-clair.png et planche-symboles-sombre.png dans
   le dossier (défaut <tmp>/planche-symboles). Aucun serveur : la page est autonome (la
   feuille de style est copiée dedans). `figuresPlanche` est exporté pour les tests. */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SYMBOLES, TONS, figureHtml } from "../js/ui/figures.js";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Les figures de la planche : des figures ordinaires de type svg, dont le corps appelle les symboles. */
export function figuresPlanche() {
  const noms = Object.keys(SYMBOLES);
  const colonnes = 4, cellW = 76, cellH = 66;
  let corps = "";
  noms.forEach((nom, k) => {
    const x0 = 8 + (k % colonnes) * cellW, y0 = 8 + Math.floor(k / colonnes) * cellH;
    const [, , w, h] = SYMBOLES[nom].vb.split(" ").map(Number);
    const s = Math.min(1, 60 / w, 36 / h);
    const lw = w * s, lh = h * s;
    corps += `<use href="#fg-sym-${nom}" x="${(x0 + (cellW - 8 - lw) / 2).toFixed(1)}" y="${(y0 + (40 - lh) / 2).toFixed(1)}" width="${lw.toFixed(1)}" height="${lh.toFixed(1)}"/>`;
    corps += `<text class="fg-txt fg-txt-s" x="${x0 + (cellW - 8) / 2}" y="${y0 + 56}" text-anchor="middle">${nom}</text>`;
  });
  const h1 = 8 + Math.ceil(noms.length / colonnes) * cellH;

  const tons = TONS;
  let corps2 = "";
  ["goutte", "cellule", "cristal", "emulsifiant"].forEach((nom, r) => {
    const [, , w, h] = SYMBOLES[nom].vb.split(" ").map(Number);
    const s = Math.min(1.4, 34 / h, 40 / w);
    corps2 += `<text class="fg-txt fg-txt-s" x="8" y="${24 + r * 56}" text-anchor="start">${nom}</text>`;
    tons.forEach((t, k) => {
      corps2 += `<use class="fg-sy-${t}" href="#fg-sym-${nom}" x="${(92 + k * 36).toFixed(1)}" y="${(8 + r * 56 + (44 - h * s) / 2).toFixed(1)}" width="${(w * s).toFixed(1)}" height="${(h * s).toFixed(1)}"/>`;
    });
  });
  corps2 += tons.map((t, k) => `<text class="fg-txt fg-txt-s fg-txt-doux" x="${92 + k * 36 + 12}" y="${8 + 4 * 56 + 6}" text-anchor="middle">${t.slice(0, 5)}</text>`).join("");

  /* Un emploi : des molécules rangées autour d'une gouttelette (transform + x y width height). */
  let corps3 = `<circle class="fg-f-or-l fg-t-or" cx="160" cy="84" r="46"/><text class="fg-txt fg-txt-b fg-txt-or" x="160" y="89" text-anchor="middle">huile</text><g transform="translate(160 84)">`;
  for (let a = 0; a < 360; a += 20) corps3 += `<use href="#fg-sym-emulsifiant" transform="rotate(${a})" x="-3" y="-60" width="6" height="17"/>`;
  corps3 += `</g><use href="#fg-sym-poele" x="12" y="148" width="56" height="20"/><use href="#fg-sym-flamme" x="30" y="170" width="16" height="20"/>` +
    `<use href="#fg-sym-vapeur" x="84" y="140" width="10" height="24"/><use href="#fg-sym-ion-plus" x="214" y="150" width="16" height="16"/><use href="#fg-sym-ion-moins" x="240" y="150" width="16" height="16"/>`;

  const base = { type: "svg", ou: "tete" };
  return [
    { ...base, titre: "Les symboles partagés", legende: "Chaque symbole à sa taille nominale, avec son nom : <use href=\"#fg-sym-NOM\" x y width height/>.", alt: "Planche de tous les symboles de la bibliothèque, chacun avec son nom, à sa taille d'usage.", vb: `0 0 320 ${h1}`, corps },
    { ...base, titre: "Les six tons", legende: "La classe de ton du <use> (fg-sy-vert, fg-sy-or…) recolore un symbole ; sans classe, il garde le sien.", alt: "Quatre symboles, chacun dessiné dans les six tons : vert, or, terra, bleu, encre et doux.", vb: "0 0 320 246", corps: corps2 },
    { ...base, titre: "Un emploi", legende: "Une couronne d'émulsifiants (rotate), une poêle sur sa flamme, de la vapeur, deux ions.", alt: "Une gouttelette d'huile entourée d'une couronne de molécules d'émulsifiant, la tête vers l'extérieur ; en bas une poêle, une flamme, une volute de vapeur et deux ions.", vb: "0 0 320 200", corps: corps3 }
  ];
}

async function principal() {
  const dossier = resolve(process.argv[2] || join(tmpdir(), "planche-symboles"));
  mkdirSync(dossier, { recursive: true });
  const css = ["base.css", "figures.css"].map(f => readFileSync(join(RACINE, "css", f), "utf8")).join("\n");
  const page = theme => `<!doctype html><html lang="fr"${theme === "dark" ? ' data-theme="dark"' : ""}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Symboles</title><style>${css}\nbody{padding:12px}</style></head><body>${figuresPlanche().map(f => figureHtml(f, { zoom: true, strict: true })).join("")}</body></html>`;
  writeFileSync(join(dossier, "planche-symboles.html"), page("light"));
  const { chromium } = await import("@playwright/test");
  const navigateur = await chromium.launch();
  try {
    for (const [nom, theme] of [["clair", "light"], ["sombre", "dark"]]) {
      const ctx = await navigateur.newContext({ viewport: { width: 600, height: 800 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
      const p = await ctx.newPage();
      await p.setContent(page(theme));
      await p.screenshot({ path: join(dossier, `planche-symboles-${nom}.png`), fullPage: true });
      await ctx.close();
    }
  } finally { await navigateur.close(); }
  console.log(`Planche dans ${dossier}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) principal().catch(e => { console.error(e); process.exit(1); });
