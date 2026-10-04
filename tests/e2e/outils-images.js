/* Aides des tests du service worker et des images. */

import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".webmanifest": "application/manifest+json", ".woff2": "font/woff2", ".webp": "image/webp",
  ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon"
};

/* Un serveur du dépôt dont on choisit le sw.js servi : de quoi publier « une
   nouvelle version du service worker » en plein test, sans toucher au dépôt.
   `serveur.version` ajoute un commentaire au sw.js, donc une autre version du
   cache (la VERSION dérive du contenu, mais pas dans ce serveur : on la change
   ici à la main). */
export async function serveurDeuxVersions() {
  const serveur = { version: "v1", url: "" };
  const http_ = http.createServer(async (req, res) => {
    const chemin = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const fichier = path.join(RACINE, chemin.endsWith("/") ? chemin + "index.html" : chemin);
    if (!fichier.startsWith(RACINE)) { res.writeHead(403); return res.end(); }
    try {
      let corps = await readFile(fichier);
      if (chemin === "/sw.js") {
        corps = Buffer.from(corps.toString("utf8").replace(/const VERSION = "[^"]*";/, `const VERSION = "test-${serveur.version}";`));
      }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(fichier)] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(corps);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Introuvable");
    }
  });
  await new Promise(ok => http_.listen(0, "127.0.0.1", ok));
  serveur.url = `http://127.0.0.1:${http_.address().port}`;
  serveur.fermer = () => new Promise(ok => http_.close(ok) && http_.closeAllConnections());
  return serveur;
}

/* Les images de img/ que la page demande, avec leur poids (octets reçus). */
export function espionnerImages(page) {
  const vues = [];
  page.on("response", async res => {
    const url = new URL(res.url());
    const m = /\/(img\/.+)$/.exec(url.pathname);
    if (!m) return;
    const corps = await res.body().catch(() => null);
    vues.push({ chemin: m[1], status: res.status(), octets: corps ? corps.length : 0 });
  });
  return vues;
}
