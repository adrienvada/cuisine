/* Serveur statique des tests : sert la racine du dépôt, sans dépendance.
   En plus, une route de contrôle simule un mauvais réseau :
     GET /__reseau?latence=<ms>   ajoute ce délai à toutes les réponses suivantes
     GET /__reseau?bloque=1       laisse les requêtes suivantes sans réponse
     GET /__reseau                remet tout à zéro
   Un test qui y touche doit toujours remettre à zéro en fin de course. */

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

let latence = 0;
let bloque = false;
const enAttente = new Set();   // réponses laissées sans suite : fermées à la remise à zéro

function reseau(url, res) {
  const p = url.searchParams;
  latence = Math.max(0, Number(p.get("latence")) || 0);
  bloque = p.get("bloque") === "1";
  if (!bloque) {
    for (const r of enAttente) r.destroy();
    enAttente.clear();
  }
  res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify({ latence, bloque }));
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
  if (bloque) { enAttente.add(res.socket); return; }
  if (latence) setTimeout(() => servir(url, res), latence);
  else servir(url, res);
}).listen(PORT, () => console.log(`Carnet servi sur http://localhost:${PORT}/`));
