/* Génère une page d'aperçu par recette dans `r/`, et une par fondamental dans
   `f/` : quand on partage un lien, WhatsApp, iMessage & Cie lisent ses balises
   Open Graph et affichent la photo du plat avec son titre. La page renvoie
   ensuite vers l'application.
   (Le routage par « # » ne permet pas d'aperçu différent d'une page à l'autre :
   d'où ces petites pages statiques, une par recette et une par fondamental.)

   Usage :  node tools/generer-pages-partage.mjs
            SITE_URL=https://exemple.fr/cuisine/ node tools/generer-pages-partage.mjs

   À relancer après avoir ajouté une recette ou un fondamental, puis committer
   les dossiers `r/` et `f/`. */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "r");
const OUT_F = join(ROOT, "f");
const SITE = (process.env.SITE_URL || process.argv[2] || "https://adrienvada.fr/cuisine/").replace(/\/?$/, "/");

const src = readFileSync(join(ROOT, "js", "recipes.js"), "utf8");
const RECIPES = new Function(`${src}; return RECIPES;`)();
/* Recettes renommées : on garde une page à l'ancienne adresse, sinon les liens
   déjà envoyés tomberaient dans le vide. */
const RENAMES = new Function(`${src}; return typeof RECIPE_RENAMES === "object" ? RECIPE_RENAMES : {};`)();
const alias = Object.entries(RENAMES).filter(([, actuel]) => RECIPES.some(r => r.id === actuel));

const fsrc = readFileSync(join(ROOT, "js", "fondamentaux.js"), "utf8");
const FONDAMENTAUX = new Function(`${fsrc}; return FONDAMENTAUX;`)();
const F_RENAMES = new Function(`${fsrc}; return typeof FONDAMENTAL_RENAMES === "object" ? FONDAMENTAL_RENAMES : {};`)();
const aliasF = Object.entries(F_RENAMES).filter(([, actuel]) => FONDAMENTAUX.some(f => f.id === actuel));

const esc = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function fmtTime(min) {
  if (!min) return "";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

/* Sous-titre + temps + portions : ce que la messagerie affiche sous le titre. */
function description(r) {
  const t = r.times, bits = [];
  if (t.prep) bits.push(`Préparation ${fmtTime(t.prep)}`);
  if (t.repos) bits.push(`${r.reposLabel || "Repos"} ${fmtTime(t.repos)}`);
  bits.push(t.cuisson != null ? `Cuisson ${fmtTime(t.cuisson)}` : "Sans cuisson");
  return `${r.subtitle} · ${bits.join(" · ")} · pour ${r.portions.base} ${r.portions.label}.`;
}

function page(r) {
  const url = `${SITE}r/${r.id}.html`;
  const app = `../#/recette/${r.id}`;
  const image = SITE + (r.image || "icons/icon-512.png");
  const title = `${r.title} — Carnet de cuisine`;
  const desc = description(r);
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#42603A">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Carnet de cuisine">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${esc(r.emoji + " " + r.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:alt" content="${esc(r.title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(r.emoji + " " + r.title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
<link rel="icon" href="../icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="../icons/apple-touch-icon.png">
<script>location.replace(${JSON.stringify(app)});</script>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         background: #F7F3E9; color: #2C3326; font: 16px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         text-align: center; padding: 24px; }
  h1 { font-family: Georgia, serif; font-size: 28px; margin: 0 0 6px; }
  p { color: #8B8874; margin: 0 0 18px; }
  a { display: inline-block; background: #42603A; color: #FDFBF3; text-decoration: none;
      border-radius: 999px; padding: 12px 22px; font-weight: 600; }
</style>
</head>
<body>
  <main>
    <h1>${esc(r.emoji + " " + r.title)}</h1>
    <p>${esc(r.subtitle)}</p>
    <a href="${esc(app)}">Ouvrir la recette</a>
  </main>
</body>
</html>
`;
}

/* Un fondamental n'a pas de photo : son aperçu porte l'icône du carnet et se
   contente d'un résumé. Le titre y gagne son emoji, qui le distingue d'une
   recette dans une conversation. */
const CERT_TXT = {
  etabli: "Mécanisme établi",
  partiel: "Partiellement expliqué",
  empirique: "Empirique : le geste marche, le mécanisme n'est pas élucidé"
};

function pageFond(f) {
  const url = `${SITE}f/${f.id}.html`;
  const app = `../#/fondamental/${f.id}`;
  const image = SITE + "icons/icon-512.png";
  const desc = `${f.accroche} — ${CERT_TXT[f.certitude] || CERT_TXT.partiel}.`;
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(f.t)} — Carnet de cuisine</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#42603A">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Carnet de cuisine">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${esc(f.emoji + " " + f.t)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:alt" content="${esc(f.t)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(f.emoji + " " + f.t)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
<link rel="icon" href="../icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="../icons/apple-touch-icon.png">
<script>location.replace(${JSON.stringify(app)});</script>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         background: #F7F3E9; color: #2C3326; font: 16px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         text-align: center; padding: 24px; }
  h1 { font-family: Georgia, serif; font-size: 28px; margin: 0 0 6px; }
  p { color: #8B8874; margin: 0 0 18px; }
  a { display: inline-block; background: #42603A; color: #FDFBF3; text-decoration: none;
      border-radius: 999px; padding: 12px 22px; font-weight: 600; }
</style>
</head>
<body>
  <main>
    <h1>${esc(f.emoji + " " + f.t)}</h1>
    <p>${esc(f.accroche)}</p>
    <a href="${esc(app)}">Ouvrir dans le carnet</a>
  </main>
</body>
</html>
`;
}

mkdirSync(OUT, { recursive: true });
mkdirSync(OUT_F, { recursive: true });

const keep = new Set([...RECIPES.map(r => `${r.id}.html`), ...alias.map(([ancien]) => `${ancien}.html`)]);
for (const f of readdirSync(OUT)) {
  if (f.endsWith(".html") && !keep.has(f)) { unlinkSync(join(OUT, f)); console.log(`− ${f} (recette disparue)`); }
}

const keepF = new Set([...FONDAMENTAUX.map(f => `${f.id}.html`), ...aliasF.map(([ancien]) => `${ancien}.html`)]);
for (const f of readdirSync(OUT_F)) {
  if (f.endsWith(".html") && !keepF.has(f)) { unlinkSync(join(OUT_F, f)); console.log(`− f/${f} (fondamental disparu)`); }
}

for (const r of RECIPES) writeFileSync(join(OUT, `${r.id}.html`), page(r));
for (const [ancien, actuel] of alias) {
  writeFileSync(join(OUT, `${ancien}.html`), page(RECIPES.find(r => r.id === actuel)));
}

for (const f of FONDAMENTAUX) writeFileSync(join(OUT_F, `${f.id}.html`), pageFond(f));
for (const [ancien, actuel] of aliasF) {
  writeFileSync(join(OUT_F, `${ancien}.html`), pageFond(FONDAMENTAUX.find(f => f.id === actuel)));
}

console.log(`${RECIPES.length} page(s) d'aperçu générée(s) dans r/ — base : ${SITE}`);
console.log(`${FONDAMENTAUX.length} page(s) d'aperçu générée(s) dans f/`);
if (alias.length) console.log(`${alias.length} alias de recette conservé(s) : ${alias.map(([a]) => a).join(", ")}`);
if (aliasF.length) console.log(`${aliasF.length} alias de fondamental conservé(s) : ${aliasF.map(([a]) => a).join(", ")}`);
console.log("Pense à committer les dossiers r/ et f/.");
