/* Service worker — cache l'application pour un usage hors ligne */

const VERSION = "v23";
const CACHE = `carnet-cuisine-${VERSION}`;

const CORE = [
  "./",
  "index.html",
  "css/polices.css",
  "css/styles.css",
  "fonts/caveat.woff2",
  "fonts/cormorant.woff2",
  "fonts/cormorant-italique.woff2",
  "js/sync-config.js",
  "js/app.js",
  "js/sync.js",
  "js/recipes.js",
  "js/fondamentaux.js",
  "js/illos.js",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  if (url.origin !== location.origin) return;

  /* Fichiers du site : réseau d'abord (pour recevoir les mises à jour), cache en secours */
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match("index.html")))
  );
});
