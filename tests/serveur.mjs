/* Serveur statique des tests : sert la racine du dépôt, sans dépendance.
   En plus, une route de contrôle simule un mauvais réseau, PROPRE À UN TEST :
     GET /__reseau?id=<id>&latence=<ms>   ajoute ce délai aux réponses des requêtes qui portent le cookie reseau=<id>
     GET /__reseau?id=<id>&bloque=1       laisse ces requêtes sans réponse
     GET /__reseau?id=<id>                remet à zéro l'état de ce test seulement
   Chaque test a son identifiant (cookie posé par outils.js) : un test qui ralentit
   ou bloque le réseau ne touche jamais aux requêtes d'un autre, même en parallèle. */

import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 4173;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".woff2": "font/woff2",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const reglages = new Map();   // identifiant de test -> { latence, bloque, enAttente }

function etatDe(id) {
  if (!reglages.has(id)) reglages.set(id, { latence: 0, bloque: false, enAttente: new Set() });
  return reglages.get(id);
}

function reseau(url, res) {
  const p = url.searchParams;
  const id = p.get("id") || "";
  const etat = etatDe(id);
  etat.latence = Math.max(0, Number(p.get("latence")) || 0);
  etat.bloque = p.get("bloque") === "1";
  if (!etat.bloque) {
    // Seules les requêtes en attente de CE test sont fermées.
    for (const r of etat.enAttente) r.destroy();
    etat.enAttente.clear();
    if (!etat.latence) reglages.delete(id);
  }
  res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify({ latence: etat.latence, bloque: etat.bloque }));
}

/* Identifiant du test qui émet la requête, lu dans son cookie « reseau ». */
function identifiant(req) {
  const m = /(?:^|;\s*)reseau=([\w-]+)/.exec(req.headers.cookie || "");
  return m ? m[1] : "";
}

async function servir(url, res) {
  let chemin = decodeURIComponent(url.pathname);
  if (chemin.endsWith("/")) chemin += "index.html";
  const fichier = path.join(RACINE, chemin);
  // Rien en dehors de la racine du dépôt.
  if (fichier !== RACINE && !fichier.startsWith(RACINE + path.sep)) {
    res.writeHead(403); return res.end("Interdit");
  }
  try {
    const s = await stat(fichier);
    if (!s.isFile()) throw new Error("pas un fichier");
    const corps = await readFile(fichier);
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(fichier).toLowerCase()] || "application/octet-stream",
      "Content-Length": corps.length
    });
    res.end(corps);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Introuvable");
  }
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/__reseau") return reseau(url, res);
  const etat = reglages.get(identifiant(req));
  if (etat?.bloque) { etat.enAttente.add(res.socket); return; }
  if (etat?.latence) setTimeout(() => servir(url, res), etat.latence);
  else servir(url, res);
}).listen(PORT, () => console.log(`Carnet servi sur http://localhost:${PORT}/`));
