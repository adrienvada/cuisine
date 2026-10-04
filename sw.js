/* Service worker — cache l'application pour un usage hors ligne */

const VERSION = "v24";
const CACHE = `carnet-cuisine-${VERSION}`;

const CORE = [
  "./",
  "index.html",
  "css/polices.css",
  "css/base.css",
  "css/accueil.css",
  "css/fiche.css",
  "css/cuisine.css",
  "css/menu.css",
  "css/courses.css",
  "css/minuteurs.css",
  "css/savoirs.css",
  "fonts/caveat.woff2",
  "fonts/cormorant.woff2",
  "fonts/cormorant-italique.woff2",
  "js/sync-config.js",
  "js/main.js",
  "js/core/courses.js",
  "js/core/etat.js",
  "js/core/fonds.js",
  "js/core/format.js",
  "js/core/html.js",
  "js/core/icones.js",
  "js/core/menu.js",
  "js/core/recettes.js",
  "js/core/seance.js",
  "js/ui/feuilles.js",
  "js/ui/minuteurs.js",
  "js/ui/partage.js",
  "js/ui/routeur.js",
  "js/ui/theme.js",
  "js/ui/toast.js",
  "js/ui/visuel.js",
  "js/vues/accueil.js",
  "js/vues/courses.js",
  "js/vues/cuisine.js",
  "js/vues/fiche.js",
  "js/vues/menu.js",
  "js/vues/savoirs.js",
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
