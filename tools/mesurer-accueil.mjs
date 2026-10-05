/* Mesure le chemin vers l'accueil : combien de temps, et combien d'octets, avant
   que la première carte soit peinte, sur un téléphone moyen en 4G lente.

   Le profil est celui de la maison, toujours le même pour que les chiffres se
   comparent d'un commit à l'autre : serveur local HTTP/2 + gzip (comme GitHub
   Pages, cache-control max-age=600), Chromium mobile 390×844 @2x, cache vide,
   service worker bloqué, 150 ms de latence, 1,6 Mbit/s descendant, 750 kbit/s
   montant, processeur ×4. Toute requête hors de localhost est refusée par la
   résolution de noms du navigateur : le serveur de synchro réel n'est jamais appelé.

   Le certificat est autosigné, fabriqué à l'exécution par openssl dans un
   dossier temporaire effacé à la sortie ; il n'est jamais committé, et
   ignoreHTTPSErrors ne vaut que pour ce contexte local.

   Mesuré à chaque passage (puis médiane et étendue sur N passages) :
     fcp       premier rendu (la barre d'onglets, statique)
     cartes    titre de la première carte peint (Element Timing, attribut
               elementtiming="carte-titre" posé par js/vues/accueil.js)
     lcp       plus grand élément (temps et nature)
     cls       décalages de mise en page
     vignettes arrivée de la dernière vignette visible sans défiler (les autres
               téléchargements du démarrage ne doivent pas la retarder)
     octets    octets transférés (gzip, en-têtes compris) avant les cartes
     script    durée des longues tâches (> 50 ms) avant les cartes
   Options :
     --racine <dossier>   l'appli à mesurer (défaut : ce dépôt)
     --passages <n>       nombre de passages (défaut 7)
     --retour             retour à l'accueil depuis une fiche, tout en cache
     --sw                 seconde visite, service worker actif
     --detail             liste des requêtes du dernier passage
     --json               sortie lisible par une machine
     --port <n>           de 4561 à 4569, ou 4551 (défaut 4561)
   Usage :  npm run mesurer   (ou node tools/mesurer-accueil.mjs --retour) */

import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import http2 from "node:http2";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const RACINE_DEPOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Budget : ce que l'accueil a le droit de télécharger avant ses cartes (gzip, en
   Ko). Un lot qui le dépasse doit dire ce qu'il a fait entrer et pourquoi. */
export const BUDGET_OCTETS_KO = 180;

const PROFIL = {
  viewport: { width: 390, height: 844 },
  latence: 150,
  descendant: 1.6 * 1024 * 1024 / 8,
  montant: 750 * 1024 / 8,
  processeur: 4
};

function lireOptions(argv) {
  const o = { racine: RACINE_DEPOT, passages: 7, retour: false, sw: false, detail: false, json: false, port: 4561 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--racine") o.racine = resolve(argv[++i]);
    else if (a === "--passages") o.passages = Math.max(1, Number(argv[++i]) || 7);
    else if (a === "--port") o.port = Number(argv[++i]);
    else if (a === "--retour") o.retour = true;
    else if (a === "--sw") o.sw = true;
    else if (a === "--detail") o.detail = true;
    else if (a === "--json") o.json = true;
    else { console.error(`Option inconnue : ${a}`); process.exit(2); }
  }
  if (!(o.port >= 4561 && o.port <= 4569) && o.port !== 4551) { console.error("Le port doit être entre 4561 et 4569 (ou 4551, celui du lot d'harmonisation)."); process.exit(2); }
  return o;
}

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2",
  ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon"
};
const COMPRESSIBLES = new Set([".html", ".js", ".css", ".json", ".webmanifest", ".svg"]);

/* Le serveur garde en mémoire du processus les fichiers déjà lus (comme un CDN) :
   on mesure le réseau simulé, pas le disque. */
export function demarrerServeur(racine, port, dossierCert) {
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=localhost",
    "-addext", "subjectAltName=DNS:localhost", "-keyout", join(dossierCert, "cle.pem"), "-out", join(dossierCert, "cert.pem")], { stdio: "ignore" });
  const cache = new Map();
  const serveur = http2.createSecureServer({
    key: readFileSync(join(dossierCert, "cle.pem")),
    cert: readFileSync(join(dossierCert, "cert.pem")),
    allowHTTP1: true
  }, (req, res) => {
    try {
      let chemin = decodeURIComponent(new URL(req.url, "https://x").pathname);
      if (chemin.endsWith("/")) chemin += "index.html";
      const fichier = join(racine, chemin);
      if (!fichier.startsWith(racine)) { res.writeHead(403); return res.end(); }
      const gzip = /gzip/.test(req.headers["accept-encoding"] || "");
      const cle = fichier + (gzip ? "#gz" : "");
      let entree = cache.get(cle);
      if (!entree) {
        if (!statSync(fichier).isFile()) throw new Error("pas un fichier");
        const ext = extname(fichier).toLowerCase();
        let corps = readFileSync(fichier);
        const entetes = { "content-type": TYPES[ext] || "application/octet-stream", "cache-control": "max-age=600" };
        if (gzip && COMPRESSIBLES.has(ext)) { corps = gzipSync(corps); entetes["content-encoding"] = "gzip"; }
        entree = { corps, entetes };
        cache.set(cle, entree);
      }
      res.writeHead(200, entree.entetes);
      res.end(entree.corps);
    } catch {
      res.writeHead(404);
      res.end("introuvable");
    }
  });
  return new Promise((ok, ko) => { serveur.once("error", ko); serveur.listen(port, "127.0.0.1", () => ok(serveur)); });
}

/* Les observateurs sont posés avant tout script de la page. */
function observateurs() {
  window.__mesure = { fcp: null, cartes: null, lcp: null, lcpEl: null, cls: 0, longues: [] };
  const m = window.__mesure;
  const voir = (type, rappel) => { try { new PerformanceObserver(l => l.getEntries().forEach(rappel)).observe({ type, buffered: true }); } catch {} };
  voir("paint", e => { if (e.name === "first-contentful-paint") m.fcp = e.startTime; });
  voir("element", e => { if (e.identifier === "carte-titre" && m.cartes === null) m.cartes = e.renderTime || e.loadTime; });
  voir("largest-contentful-paint", e => {
    m.lcp = e.renderTime || e.loadTime;
    m.lcpEl = e.url ? "image " + e.url.split("/").slice(-2).join("/") : e.element ? e.element.tagName.toLowerCase() + (e.element.className ? "." + String(e.element.className).split(" ")[0] : "") : "?";
  });
  voir("layout-shift", e => { if (!e.hadRecentInput) m.cls += e.value; });
  voir("longtask", e => m.longues.push([e.startTime, e.duration]));
}

async function profiler(page, contexte) {
  const cdp = await contexte.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: PROFIL.latence, downloadThroughput: PROFIL.descendant, uploadThroughput: PROFIL.montant });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: PROFIL.processeur });
  return cdp;
}

function suivreRequetes(cdp) {
  const requetes = new Map();
  let decalage = null; // époque (ms) − horloge du protocole (s)
  cdp.on("Network.requestWillBeSent", e => {
    if (decalage === null) decalage = e.wallTime * 1000 - e.timestamp * 1000;
    requetes.set(e.requestId, { url: e.request.url.replace(/^https:\/\/localhost:\d+\//, ""), debut: e.timestamp * 1000 });
  });
  cdp.on("Network.loadingFinished", e => {
    const r = requetes.get(e.requestId);
    if (r) { r.fin = e.timestamp * 1000; r.octets = e.encodedDataLength; }
  });
  return { requetes, epoque: ms => ms + decalage };
}

const attendre = ms => new Promise(r => setTimeout(r, ms));

/* Seule la résolution de noms interdit le réseau extérieur : tout ce qui n'est pas
   localhost est introuvable. Avec --sw, le certificat autosigné du serveur local est
   accepté par le navigateur lui-même (--ignore-certificate-errors) : Chromium refuse
   d'enregistrer un service worker sur une page dont le certificat est en erreur,
   même quand le contexte ignore les erreurs HTTPS. Aucun autre hôte n'est joignable. */
async function lancerNavigateur({ sw }) {
  const args = ["--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE localhost"];
  if (sw) args.push("--ignore-certificate-errors");
  return chromium.launch({ args });
}

function contexte(navigateur, { sw }) {
  return navigateur.newContext({
    viewport: PROFIL.viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    locale: "fr-FR", timezoneId: "Europe/Paris",
    serviceWorkers: sw ? "allow" : "block", ignoreHTTPSErrors: true
  });
}

/* Un passage à froid : cache vide, aucun service worker (ou, avec --sw, la
   seconde visite d'un navigateur où il est déjà installé). */
async function passageAccueil(navigateur, url, { sw, detail }) {
  const ctx = await contexte(navigateur, { sw });
  try {
    if (sw) {
      // Première visite hors mesure : le service worker s'installe et précache.
      const p0 = await ctx.newPage();
      await p0.goto(url, { waitUntil: "load" });
      await p0.evaluate(() => navigator.serviceWorker.ready);
      await p0.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 30000 }).catch(() => p0.reload());
      await p0.waitForFunction(async () => (await caches.keys()).length > 0 && (await (await caches.open((await caches.keys())[0])).keys()).length > 40, null, { timeout: 60000 });
      await p0.close();
    }
    const page = await ctx.newPage();
    await page.addInitScript(observateurs);
    const cdp = await profiler(page, ctx);
    const suivi = suivreRequetes(cdp);
    await page.goto(url, { waitUntil: "load" });
    await page.waitForFunction(() => window.__mesure.cartes !== null, null, { timeout: 60000 });
    await attendre(3000); // laisse le LCP se fixer
    const m = await page.evaluate(() => ({
      ...window.__mesure,
      origine: performance.timeOrigin,
      vignettes: Math.max(0, ...[...document.querySelectorAll("img")]
        .filter(i => i.getBoundingClientRect().top < innerHeight)
        .map(i => performance.getEntriesByType("resource").find(r => r.name === i.currentSrc)?.responseEnd ?? 0))
    }));
    const limite = m.origine + m.cartes;
    const liste = [...suivi.requetes.values()];
    const avant = liste.filter(r => r.fin && suivi.epoque(r.fin) <= limite);
    return {
      fcp: m.fcp, cartes: m.cartes, lcp: m.lcp, lcpEl: m.lcpEl, cls: m.cls, vignettes: m.vignettes,
      octets: avant.reduce((s, r) => s + (r.octets || 0), 0),
      requetes: avant.length,
      script: m.longues.filter(([debut]) => debut < m.cartes).reduce((s, [, d]) => s + d, 0),
      detail: detail ? liste.sort((a, b) => a.debut - b.debut).map(r => ({
        url: r.url, octets: r.octets ?? null, avant: !!r.fin && suivi.epoque(r.fin) <= limite,
        debut: Math.round(suivi.epoque(r.debut) - m.origine), fin: r.fin ? Math.round(suivi.epoque(r.fin) - m.origine) : null
      })) : undefined
    };
  } finally {
    await ctx.close();
  }
}

/* Un retour à l'accueil depuis une fiche, tout en cache : le réseau n'est plus
   limité (il ne doit plus servir), le processeur reste ralenti ×4. La vue est
   « dessinée et stable » quand ses cartes existent et que deux images ont passé. */
async function passageRetour(navigateur, url) {
  const ctx = await contexte(navigateur, { sw: false });
  try {
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "load" });
    await page.waitForSelector(".card");
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.evaluate(() => { location.hash = "#/recette/focaccia-romarin"; });
    await page.waitForSelector(".hero");
    await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity));
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: PROFIL.processeur });
    const r = await page.evaluate(() => new Promise(fin => {
      const t0 = performance.now();
      const y0 = window.scrollY;
      history.back();
      const verifier = () => {
        if (document.querySelector(".card") && !document.querySelector(".hero")) {
          requestAnimationFrame(() => requestAnimationFrame(() => fin({ ms: performance.now() - t0, defilement: window.scrollY })));
        } else requestAnimationFrame(verifier);
      };
      requestAnimationFrame(verifier);
      void y0;
    }));
    return { retour: r.ms, defilement: r.defilement };
  } finally {
    await ctx.close();
  }
}

const mediane = v => { const s = [...v].sort((a, b) => a - b); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const resume = v => ({ mediane: mediane(v), min: Math.min(...v), max: Math.max(...v) });

async function main() {
  const o = lireOptions(process.argv.slice(2));
  const dossierCert = mkdtempSync(join(tmpdir(), "mesurer-accueil-"));
  let serveur, navigateur;
  try {
    serveur = await demarrerServeur(o.racine, o.port, dossierCert);
    navigateur = await lancerNavigateur({ sw: o.sw });
    const url = `https://localhost:${o.port}/`;
    const passages = [];
    for (let i = 0; i < o.passages; i++) {
      passages.push(o.retour ? await passageRetour(navigateur, url) : await passageAccueil(navigateur, url, { sw: o.sw, detail: o.detail && i === o.passages - 1 }));
    }
    const sortie = { racine: o.racine, mode: o.retour ? "retour" : o.sw ? "seconde visite (service worker)" : "première visite", passages: o.passages };
    if (o.retour) {
      sortie.retour = resume(passages.map(p => p.retour));
      sortie.defilement = resume(passages.map(p => p.defilement));
    } else {
      for (const k of ["fcp", "cartes", "lcp", "cls", "vignettes", "octets", "script", "requetes"]) sortie[k] = resume(passages.map(p => p[k]));
      sortie.lcpElements = passages.map(p => p.lcpEl);
      sortie.budgetKo = BUDGET_OCTETS_KO;
      if (o.detail) { sortie.detail = passages.at(-1).detail; sortie.dernier = { fcp: passages.at(-1).fcp, cartes: passages.at(-1).cartes }; }
    }
    if (o.json) { console.log(JSON.stringify(sortie, null, 2)); return; }
    const ms = x => `${Math.round(x)} ms`;
    const ligne = (nom, r, f) => console.log(`${nom.padEnd(10)} ${f(r.mediane).padStart(10)}   (de ${f(r.min)} à ${f(r.max)})`);
    console.log(`Accueil — ${sortie.mode}, médiane de ${o.passages} passages (390×844 @2x, 150 ms, 1,6 Mbit/s, processeur ×4)`);
    if (o.retour) {
      ligne("retour", sortie.retour, ms);
      ligne("défilement", sortie.defilement, x => `${Math.round(x)} px`);
    } else {
      ligne("FCP", sortie.fcp, ms);
      ligne("cartes", sortie.cartes, ms);
      ligne("LCP", sortie.lcp, ms);
      ligne("CLS", sortie.cls, x => x.toFixed(4));
      ligne("vignettes", sortie.vignettes, ms);
      ligne("octets", sortie.octets, x => `${(x / 1024).toFixed(1)} Ko`);
      ligne("requêtes", sortie.requetes, x => String(Math.round(x)));
      ligne("script", sortie.script, ms);
      const elements = [...new Set(sortie.lcpElements)].join(", ");
      console.log(`LCP : ${elements}`);
      const ko = sortie.octets.mediane / 1024;
      console.log(`Budget : ${ko.toFixed(1)} Ko sur ${BUDGET_OCTETS_KO} Ko avant les cartes — ${ko <= BUDGET_OCTETS_KO ? "tenu" : "DÉPASSÉ"}`);
      if (o.detail) {
        console.log(`\nRequêtes du dernier passage (FCP ${Math.round(sortie.dernier.fcp)} ms, cartes ${Math.round(sortie.dernier.cartes)} ms ; octets, début → fin en ms, * = avant les cartes) :`);
        for (const r of sortie.detail) console.log(`${r.avant ? "*" : " "} ${String(r.octets ?? "").padStart(7)}  ${String(r.debut).padStart(5)} → ${String(r.fin ?? "?").padStart(5)}  ${r.url}`);
      }
    }
  } finally {
    await navigateur?.close();
    serveur?.close();
    rmSync(dossierCert, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
