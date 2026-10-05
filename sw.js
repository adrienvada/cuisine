/* Service worker — l'appli s'ouvre depuis le cache, sans attendre le réseau.

   · Les fichiers de l'appli (CORE) sont servis depuis le cache et renouvelés à
     l'installation d'une nouvelle version du service worker.
   · Les images : « stale-while-revalidate » — le cache répond tout de suite, le réseau
     rafraîchit la copie pour la fois suivante.
   · Les héros WebP des fiches (HEROS) sont récupérés au repos, à la demande de la
     page (message « heros »), une fois l'appli affichée : ils pèsent 1,3 Mo, trop
     pour l'installation, mais une fiche jamais ouverte doit s'afficher hors ligne.
   · Les pages d'aperçu r/ et f/ : réseau d'abord, mais 3 s au plus, puis le cache.

   VERSION et CORE sont écrits par tools/version-sw.mjs (npm run sw) : ne pas les
   modifier à la main. La version dérive du contenu des fichiers, elle change donc
   toute seule quand l'un d'eux change. */

/* >>> bloc généré par tools/version-sw.mjs — ne pas modifier à la main */
const VERSION = "5cede6617e";

const CORE = [
  "./",
  "css/accueil-anime.css",
  "css/accueil.css",
  "css/base.css",
  "css/courses.css",
  "css/cuisine.css",
  "css/fiche.css",
  "css/journal.css",
  "css/menu.css",
  "css/minuteurs.css",
  "css/polices.css",
  "css/reglages.css",
  "css/savoirs.css",
  "favicon.ico",
  "fonts/LICENCE.txt",
  "fonts/caveat-etendu.woff2",
  "fonts/caveat-titre.woff2",
  "fonts/caveat.woff2",
  "fonts/cormorant-etendu.woff2",
  "fonts/cormorant-italique-etendu.woff2",
  "fonts/cormorant-italique.woff2",
  "fonts/cormorant.woff2",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon.svg",
  "icons/raccourci-courses.png",
  "icons/raccourci-menu.png",
  "img/c/beignets-brebis-menthe.webp",
  "img/c/cake-sale.webp",
  "img/c/cocktail-concombre-menthe.webp",
  "img/c/dip-chevre-herbes.webp",
  "img/c/focaccia-romarin.webp",
  "img/c/gravlax-saumon-yaourt-bulgare.webp",
  "img/c/houmous-petits-pois-menthe.webp",
  "img/c/mayonnaise-maison.webp",
  "img/c/mi-cuit-chocolat-suzy-palatin.webp",
  "img/c/pesto-basilic-maison.webp",
  "img/c/quiche-lorraine.webp",
  "img/c/salade-champetre.webp",
  "img/c/salade-kale-pomme-oeuf.webp",
  "img/c/salade-lentilles-feta.webp",
  "img/c/salade-mediterraneenne.webp",
  "img/c/scoopable-cookies.webp",
  "img/c/tagliatelles-carotte-carbonara.webp",
  "img/c/tartines-figues-chevre-miel.webp",
  "img/c/torsades-pesto.webp",
  "img/c/veloute-butternut-shiitakes.webp",
  "img/v/beignets-brebis-menthe.webp",
  "img/v/cake-sale.webp",
  "img/v/cocktail-concombre-menthe.webp",
  "img/v/dip-chevre-herbes.webp",
  "img/v/focaccia-romarin.webp",
  "img/v/gravlax-saumon-yaourt-bulgare.webp",
  "img/v/houmous-petits-pois-menthe.webp",
  "img/v/mayonnaise-maison.webp",
  "img/v/mi-cuit-chocolat-suzy-palatin.webp",
  "img/v/pesto-basilic-maison.webp",
  "img/v/quiche-lorraine.webp",
  "img/v/salade-champetre.webp",
  "img/v/salade-kale-pomme-oeuf.webp",
  "img/v/salade-lentilles-feta.webp",
  "img/v/salade-mediterraneenne.webp",
  "img/v/scoopable-cookies.webp",
  "img/v/tagliatelles-carotte-carbonara.webp",
  "img/v/tartines-figues-chevre-miel.webp",
  "img/v/torsades-pesto.webp",
  "img/v/veloute-butternut-shiitakes.webp",
  "index.html",
  "js/allergenes.js",
  "js/core/adaptation.js",
  "js/core/courses.js",
  "js/core/cuisine.js",
  "js/core/etat.js",
  "js/core/fonds.js",
  "js/core/format.js",
  "js/core/fusion.js",
  "js/core/html.js",
  "js/core/icones.js",
  "js/core/journal.js",
  "js/core/liens.js",
  "js/core/menu.js",
  "js/core/planning.js",
  "js/core/recettes.js",
  "js/core/recherche.js",
  "js/core/ressort.js",
  "js/core/sauvegarde.js",
  "js/core/seance.js",
  "js/fondamentaux.js",
  "js/illos.js",
  "js/main.js",
  "js/placard.js",
  "js/recipes.js",
  "js/saisons.js",
  "js/substitutions.js",
  "js/sync-config.js",
  "js/sync.js",
  "js/ui/annonces.js",
  "js/ui/effets.js",
  "js/ui/feuilles.js",
  "js/ui/focus.js",
  "js/ui/geste.js",
  "js/ui/minuteurs.js",
  "js/ui/miseajour.js",
  "js/ui/mouvement.js",
  "js/ui/nombre.js",
  "js/ui/partage.js",
  "js/ui/qr.js",
  "js/ui/routeur.js",
  "js/ui/scripts.js",
  "js/ui/styles.js",
  "js/ui/theme.js",
  "js/ui/toast.js",
  "js/ui/typo.js",
  "js/ui/visuel.js",
  "js/ui/voix.js",
  "js/vendor/qrcode-generator.js",
  "js/vues/accueil-anime.js",
  "js/vues/accueil.js",
  "js/vues/courses-gestes.js",
  "js/vues/courses.js",
  "js/vues/cuisine-gestes.js",
  "js/vues/cuisine.js",
  "js/vues/fiche.js",
  "js/vues/ingredient.js",
  "js/vues/journal.js",
  "js/vues/menu.js",
  "js/vues/reglages-entree.js",
  "js/vues/reglages.js",
  "js/vues/savoirs.js",
  "manifest.webmanifest"
];

/* Au repos, dans un second temps : les héros des fiches. */
const HEROS = [
  "img/h/beignets-brebis-menthe.webp",
  "img/h/cake-sale.webp",
  "img/h/cocktail-concombre-menthe.webp",
  "img/h/dip-chevre-herbes.webp",
  "img/h/focaccia-romarin.webp",
  "img/h/gravlax-saumon-yaourt-bulgare.webp",
  "img/h/houmous-petits-pois-menthe.webp",
  "img/h/mayonnaise-maison.webp",
  "img/h/mi-cuit-chocolat-suzy-palatin.webp",
  "img/h/pesto-basilic-maison.webp",
  "img/h/quiche-lorraine.webp",
  "img/h/salade-champetre.webp",
  "img/h/salade-kale-pomme-oeuf.webp",
  "img/h/salade-lentilles-feta.webp",
  "img/h/salade-mediterraneenne.webp",
  "img/h/scoopable-cookies.webp",
  "img/h/tagliatelles-carotte-carbonara.webp",
  "img/h/tartines-figues-chevre-miel.webp",
  "img/h/torsades-pesto.webp",
  "img/h/veloute-butternut-shiitakes.webp"
];
/* <<< fin du bloc généré */

const CACHE = `carnet-cuisine-${VERSION}`;
/* Images et pages d'aperçu : un cache qui survit aux changements de version. */
const EXECUTION = "carnet-execution";
const DELAI_RESEAU = 3000;

/* Pas de skipWaiting ici : une nouvelle version attend que l'appli, qui affiche
   « Nouvelle version — Recharger », le demande (message « activer »). Elle ne
   remplace donc jamais en silence le code d'une page ouverte. */
self.addEventListener("install", e => {
  // « reload » contourne le cache HTTP du navigateur (GitHub Pages en garde dix
  // minutes) : sans lui, une version neuve pourrait mettre en cache les fichiers d'hier.
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(f => new Request(f, { cache: "reload" })))));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(k => k.startsWith("carnet-cuisine-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => {
  if (!e.data) return;
  if (e.data.type === "activer") self.skipWaiting();
  if (e.data.type === "heros") e.waitUntil(precacherHeros().catch(() => {}));
});

/* Les héros, deux à la fois, dans le cache d'exécution (là où cachePuisReseau les
   cherche). Un héros déjà en cache n'est pas redemandé ; un échec (réseau perdu en
   route) laisse le reste à la visite suivante. */
async function precacherHeros() {
  const cache = await caches.open(EXECUTION);
  const manquants = [];
  for (const f of HEROS) if (!(await cache.match(f))) manquants.push(f);
  async function enfiler() {
    while (manquants.length) {
      const f = manquants.shift();
      const res = await fetch(f);
      if (res.ok) await cache.put(f, res);
    }
  }
  await Promise.all([enfiler(), enfiler()]);
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Supabase et le reste du monde : le service worker n'y touche pas.
  if (url.origin !== location.origin) return;

  const chemin = url.pathname.slice(new URL("./", location).pathname.length);
  if (/^(r|f)\//.test(chemin)) return e.respondWith(reseauPuisCache(req));
  if (/^img\/.+\.(jpg|webp)$/.test(chemin)) return e.respondWith(cachePuisReseau(e, req));
  e.respondWith(depuisLeCache(req));
});

/* Fichiers de l'appli : le cache de la version, sans regarder la requête d'adresse
   (« ?utm… »). Hors du cache (fichier inconnu, ou navigation hors ligne), le réseau ;
   une navigation sans réseau retombe sur l'appli. */
async function depuisLeCache(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  try {
    return await fetch(req);
  } catch (err) {
    if (req.mode === "navigate") {
      const accueil = await cache.match("index.html");
      if (accueil) return accueil;
    }
    throw err;
  }
}

/* Images : la copie en cache répond tout de suite ; le réseau la rafraîchit en
   coulisse (sauf pour les vignettes de CORE, figées par la version). Seules les réponses
   « ok » entrent en cache : un 404 y serait resservi pour toujours. */
async function cachePuisReseau(e, req) {
  // Une vignette de CORE appartient à la version courante : sa copie est la bonne.
  // La copie d'exécution, plus ancienne après une mise à jour, passerait devant sinon.
  const connue = await (await caches.open(CACHE)).match(req);
  if (connue) return connue;
  const cache = await caches.open(EXECUTION);
  const hit = await cache.match(req);
  const maj = fetch(req)
    .then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  e.waitUntil(maj);
  return hit || (await maj) || Response.error();
}

/* Pages d'aperçu : à jour si le réseau répond vite, sinon la copie en cache. Sans
   copie, on attend le réseau jusqu'au bout. */
async function reseauPuisCache(req) {
  const cache = await caches.open(EXECUTION);
  const reseau = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  reseau.catch(() => {});
  const delai = new Promise(r => setTimeout(() => r(null), DELAI_RESEAU));
  try {
    const res = await Promise.race([reseau, delai]);
    if (res) return res;
  } catch {
    // Réseau en échec franc : la copie en cache, si elle existe.
  }
  return (await cache.match(req)) || reseau;
}
