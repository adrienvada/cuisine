/* Photographie la page d'un savoir, en clair et en sombre, et mesure ses figures.

   C'est l'outil de l'auteur de figures : on dessine dans js/figures.js, on lance
   ceci, on REGARDE les PNG (outil Read) et on corrige jusqu'à ce que ce soit beau.
   Il sert l'appli lui-même (tests/serveur.mjs, comme les tests de bout en bout),
   ouvre Chromium au format téléphone et enregistre, dans le dossier demandé :

     <id>-clair.png, <id>-sombre.png        la page entière
     <id>-fig1-clair.png, <id>-fig1-sombre.png, …   chaque figure, en 2×

   Les animations sont coupées (mouvement réduit) : la photo montre la figure
   achevée. Puis il relève, figure par figure, ce qu'un œil pressé manquerait :
   texte trop petit (< 11 px rendus), texte qui sort du cadre, deux textes qui se
   chevauchent, figure qui déborde de l'écran. « ✓ » : rien à signaler.

   Usage :  node tools/capturer-savoir.mjs <id> [dossier] [--largeur=360] [--strict]
   - dossier : défaut <tmp>/captures-savoirs
   - --strict : code de sortie 1 s'il y a le moindre signalement
   Variable PORT : port du serveur local (4290 par défaut ; un serveur déjà là sur ce port est réutilisé).

   Ce fichier n'est pas dans le service worker : c'est un outil de développement.
   `mesurerFigures` est exporté pour les tests de bout en bout. */

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Exécutée DANS la page (page.evaluate) : aucune référence à l'extérieur.
   Rend, pour chaque figure, la liste de ses problèmes. */
export function mesurerFigures() {
  const rects = (a, b, marge) =>
    a.left + marge < b.right && a.right - marge > b.left && a.top + marge < b.bottom && a.bottom - marge > b.top;
  return [...document.querySelectorAll(".fg")].map((fig, i) => {
    const probleme = [];
    const svg = fig.querySelector("svg.fg-svg");
    const titre = (fig.querySelector(".fg-titre") || {}).textContent || `figure ${i + 1}`;
    if (!svg) return { i: i + 1, titre, problemes: ["pas de SVG"] };
    const cadre = svg.getBoundingClientRect();
    const fr = fig.getBoundingClientRect();
    if (fr.right > window.innerWidth + 0.5 || fr.left < -0.5) probleme.push("la figure déborde de l'écran");
    const boites = [...svg.querySelectorAll("text")].filter(t => t.textContent.trim()).map(t => {
      const ctm = t.getScreenCTM();
      return { b: t.getBoundingClientRect(), taille: parseFloat(getComputedStyle(t).fontSize) * (ctm ? ctm.a : 1), txt: t.textContent.trim().replace(/\s+/g, " ").slice(0, 34) };
    });
    for (const x of boites) {
      if (x.taille < 10.9) probleme.push(`texte trop petit (${x.taille.toFixed(1)} px) : « ${x.txt} »`);
      if (x.b.left < cadre.left - 0.5 || x.b.right > cadre.right + 0.5 || x.b.top < cadre.top - 0.5 || x.b.bottom > cadre.bottom + 0.5) probleme.push(`texte coupé par le cadre : « ${x.txt} »`);
    }
    for (let a = 0; a < boites.length; a++) {
      for (let b = a + 1; b < boites.length; b++) {
        if (rects(boites[a].b, boites[b].b, 2.5)) probleme.push(`chevauchement : « ${boites[a].txt} » et « ${boites[b].txt} »`);
      }
    }
    return { i: i + 1, titre, problemes: probleme };
  });
}

async function serveurPret(url) {
  try { return (await fetch(url)).ok; } catch { return false; }
}

async function demarrerServeur(port) {
  const url = `http://localhost:${port}/index.html`;
  if (await serveurPret(url)) return { arreter() {} };
  const enfant = spawn(process.execPath, [join(RACINE, "tests", "serveur.mjs")], { env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
  for (let i = 0; i < 100; i++) {
    if (await serveurPret(url)) return { arreter: () => enfant.kill() };
    await new Promise(r => setTimeout(r, 100));
  }
  enfant.kill();
  throw new Error("le serveur local ne démarre pas");
}

async function principal() {
  const args = process.argv.slice(2);
  const options = Object.fromEntries(args.filter(a => a.startsWith("--")).map(a => { const [k, v = "1"] = a.slice(2).split("="); return [k, v]; }));
  const [id, dossierArg] = args.filter(a => !a.startsWith("--"));
  if (!id) {
    console.error("Usage : node tools/capturer-savoir.mjs <id> [dossier] [--largeur=360] [--strict]");
    process.exit(2);
  }
  const dossier = resolve(dossierArg || join(tmpdir(), "captures-savoirs"));
  const largeur = Number(options.largeur) || 360;
  mkdirSync(dossier, { recursive: true });

  const { chromium } = await import("@playwright/test");
  const port = Number(process.env.PORT) || 4290;
  const serveur = await demarrerServeur(port);
  const navigateur = await chromium.launch();
  let total = 0;
  try {
    for (const [nom, theme] of [["clair", "light"], ["sombre", "dark"]]) {
      const contexte = await navigateur.newContext({
        viewport: { width: largeur, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
        locale: "fr-FR", reducedMotion: "reduce", serviceWorkers: "block", colorScheme: theme
      });
      await contexte.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, r => r.abort());
      await contexte.addInitScript(t => { try { localStorage.setItem("theme", t); } catch {} }, theme);
      const page = await contexte.newPage();
      await page.goto(`http://localhost:${port}/#/fondamental/${id}`);
      await page.waitForSelector(".f-page", { timeout: 15000 });
      await page.addStyleTag({ content: ".tabbar { display: none !important; }" });   // la barre d'onglets fixe masquerait le bas des figures
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(400);

      await page.screenshot({ path: join(dossier, `${id}-${nom}.png`), fullPage: true, scale: "css" });
      const figures = page.locator(".fg");
      const nb = await figures.count();
      for (let k = 0; k < nb; k++) {
        await figures.nth(k).screenshot({ path: join(dossier, `${id}-fig${k + 1}-${nom}.png`) });
      }
      const rapport = await page.evaluate(mesurerFigures);
      const debord = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 0.5);
      console.log(`\n[${nom}] ${nb} figure${nb > 1 ? "s" : ""}, page ${largeur} px${debord ? " — ⚠ la page défile horizontalement" : ""}`);
      if (debord) total++;
      for (const r of rapport) {
        if (!r.problemes.length) console.log(`  ✓ ${r.i}. ${r.titre}`);
        else { total += r.problemes.length; console.log(`  ⚠ ${r.i}. ${r.titre}\n${r.problemes.map(p => "      · " + p).join("\n")}`); }
      }
      await contexte.close();
    }
  } finally {
    await navigateur.close();
    serveur.arreter();
  }
  console.log(`\nCaptures dans ${dossier}`);
  if (total && options.strict) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) principal().catch(e => { console.error(e); process.exit(1); });
