/* Premier chargement : graphe d'imports, modulepreload généré, feuilles CSS non
   bloquantes, vignettes préchargées, héros du service worker. */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { blocPreload, grapheStatique, importsStatiques, modulesPrecharges } from "../../tools/graphe-modules.mjs";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const lire = f => readFileSync(join(RACINE, f), "utf8");
const index = lire("index.html");

test("importsStatiques : import, export … from, import nu ; ni import() ni commentaire", () => {
  const source = `
/* import { faux } from "./commentaire.js"; */
import { a, b } from "./a.js";
import {
  c,
  d
} from "../core/c.js";
import "./effet.js";
export { e } from "./e.js";
export const note = "from './chaine.js'";
const vue = await import("./dynamique.js");
export function f() { return import("./autre-dynamique.js"); }
`;
  assert.deepEqual(importsStatiques(source).sort(), ["../core/c.js", "./a.js", "./e.js", "./effet.js"]);
});

test("grapheStatique : suit les imports statiques, pas les import() dynamiques", () => {
  const fichiers = {
    "js/main.js": `import { x } from "./ui/routeur.js";\nimport "./sync.js";`,
    "js/ui/routeur.js": `import { y } from "../core/etat.js";\nexport const vue = () => import("../vues/fiche.js");`,
    "js/core/etat.js": `export const y = 1;`,
    "js/sync.js": `import { y } from "./core/etat.js";`,
    "js/vues/fiche.js": `import { z } from "../core/jamais.js";`
  };
  const graphe = grapheStatique("", "js/main.js", f => fichiers[f]);
  assert.deepEqual(graphe, ["js/core/etat.js", "js/main.js", "js/sync.js", "js/ui/routeur.js"]);
});

test("index.html : le modulepreload est exactement le graphe d'imports statiques de js/main.js (npm run sw)", () => {
  const precharges = modulesPrecharges(index);
  assert.ok(precharges, "les repères du bloc modulepreload manquent dans index.html");
  assert.deepEqual(precharges, grapheStatique(RACINE, "js/main.js"));
});

test("un module importé mais absent du bloc est détecté, un module en trop aussi", () => {
  const fichiers = { "js/main.js": `import "./neuf.js";`, "js/neuf.js": `` };
  const graphe = grapheStatique("", "js/main.js", f => fichiers[f]);
  const ancien = `<head>\n  ${blocPreload(["js/main.js"])}\n</head>`;
  assert.notDeepEqual(modulesPrecharges(ancien), graphe);
  const juste = `<head>\n  ${blocPreload(graphe)}\n</head>`;
  assert.deepEqual(modulesPrecharges(juste), graphe);
});

test("la CI relance npm run sw et compare sw.js ET index.html", () => {
  const ci = lire(".github/workflows/ci.yml");
  const etape = ci.slice(ci.indexOf("Service worker à jour"));
  assert.match(etape, /npm run sw/);
  assert.match(etape, /git diff --exit-code[^\n]*\bsw\.js\b[^\n]*\bindex\.html\b/);
});

test("feuilles CSS : seules celles de l'accueil sont dans la page, celles des vues viennent avec leur module, repli noscript", () => {
  const liens = [...index.matchAll(/<link rel="stylesheet" href="(css\/[a-z]+\.css)"([^>]*)>/g)];
  const dansNoscript = index.slice(index.indexOf("<noscript>"), index.indexOf("</noscript>"));
  const bloquantes = [];
  for (const [, href, reste] of liens) {
    if (dansNoscript.includes(`href="${href}"`)) continue; // le repli
    assert.ok(!reste.includes("data-vue"), `${href} : une feuille de vue n'a rien à faire dans la page (js/ui/styles.js)`);
    bloquantes.push(href);
  }
  assert.deepEqual(bloquantes, ["css/polices.css", "css/base.css", "css/accueil.css", "css/fiche.css", "css/minuteurs.css", "css/reglages.css"]);
  // Aucune feuille oubliée : celles des vues sont dans le repli sans JavaScript.
  const tous = readdirSync(join(RACINE, "css")).map(f => `css/${f}`).sort();
  assert.deepEqual([...new Set(liens.map(l => l[1]))].sort(), tous);
  for (const nom of ["cuisine", "menu", "courses", "savoirs", "journal"]) assert.ok(dansNoscript.includes(`css/${nom}.css`), `${nom}.css : repli <noscript> manquant`);
});

test("la première vignette de l'accueil est préchargée (c'est elle qui fait le LCP)", () => {
  const RECIPES = new Function(lire("js/recipes.js") + ";return RECIPES;")();
  const attendues = RECIPES.filter(r => /^img\/[^/]+\.jpg$/.test(r.image || "")).slice(0, 1).map(r => `img/v/${r.id}.webp`);
  const bloc = index.slice(index.indexOf("vignettes de l'accueil générées"), index.indexOf("</head>"));
  const trouvees = [...bloc.matchAll(/<link rel="preload" as="image" href="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(trouvees, attendues);
  for (const f of trouvees) assert.ok(existsSync(join(RACINE, f)), `${f} n'existe pas`);
});

test("sw.js : HEROS liste tous les héros WebP, et le service worker les range au repos", () => {
  const sw = lire("sw.js");
  const bloc = sw.slice(sw.indexOf("const HEROS = ["), sw.indexOf("];", sw.indexOf("const HEROS = [")));
  const heros = [...bloc.matchAll(/"([^"]+)"/g)].map(m => m[1]);
  const presents = readdirSync(join(RACINE, "img", "h")).filter(f => f.endsWith(".webp")).map(f => `img/h/${f}`).sort();
  assert.deepEqual([...heros].sort(), presents);
  assert.match(sw, /type === "heros"/);
  // Ils ne bloquent pas l'installation : CORE n'en contient aucun.
  const core = sw.slice(sw.indexOf("const CORE = ["), sw.indexOf("];", sw.indexOf("const CORE = [")));
  assert.doesNotMatch(core, /img\/h\//);
});
