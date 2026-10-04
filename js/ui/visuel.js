/* Le visuel d'une recette : photo, illustration dessinée ou emoji. */

/* Variante WebP de chaque genre (produites par tools/generer-vignettes.mjs) et
   dimensions réelles du fichier, que le navigateur utilise pour réserver la place
   avant l'arrivée de l'image. Le CSS fixe la boîte ; ces valeurs n'en donnent que
   les proportions. */
const VARIANTES = {
  vignette: { dossier: "v", width: 336, height: 220 },
  carre: { dossier: "c", width: 176, height: 176 },
  hero: { dossier: "h", width: 800, height: 597 }
};

/* Visuel d'une recette : photo si dispo, sinon illustration dessinée, sinon emoji.
   Les vignettes chargent en différé ; `eager` pour l'image principale d'une page
   (elle doit arriver tout de suite).
   `genre` dit où le visuel va : "vignette" (grille d'accueil), "carre" (carte du
   menu) ou "hero" (tête de fiche). Chacun a sa variante WebP déjà recadrée : la
   vignette ne télécharge plus la photo entière pour en montrer le tiers central.
   Si la variante manque (photo ajoutée sans `npm run vignettes`), l'image retombe
   sur le JPEG, zoomé par le CSS comme avant (voir le gestionnaire plus bas). */
export function visuel(r, { genre = "vignette", eager = false } = {}) {
  if (!r.image) return ILLO.FOOD[r.id] || r.emoji;
  const chargement = eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"';
  const v = VARIANTES[genre] || VARIANTES.vignette;
  const id = /^img\/([^/]+)\.jpg$/.exec(r.image)?.[1];
  if (!id) return `<img src="${r.image}" alt=""${chargement} class="zoom">`;
  const webp = `img/${v.dossier}/${id}.webp`;
  if (genre === "hero") {
    // Le JPEG reste la source de secours des navigateurs sans WebP.
    return `<picture><source srcset="${webp}" type="image/webp"><img src="${r.image}" width="${v.width}" height="${v.height}" alt=""${chargement}></picture>`;
  }
  return `<img src="${webp}" width="${v.width}" height="${v.height}" alt=""${chargement} data-secours="${r.image}">`;
}

/* Une variante introuvable (ou illisible) ne doit pas laisser un trou : l'image
   repasse sur le JPEG. Les événements « error » ne remontent pas, d'où la
   capture au niveau du document, une fois pour toutes. */
if (typeof document !== "undefined") {
  document.addEventListener("error", e => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement)) return;
    const picture = img.parentElement?.tagName === "PICTURE" ? img.parentElement : null;
    if (picture) {
      // Le <source> WebP a échoué : sans lui, l'<img> reprend son JPEG. Une seule fois,
      // sinon un JPEG lui aussi introuvable bouclerait.
      if (img.dataset.repli) return;
      img.dataset.repli = "1";
      const jpeg = img.getAttribute("src");
      picture.querySelectorAll("source").forEach(s => s.remove());
      img.src = jpeg;
    } else if (img.dataset.secours) {
      const jpeg = img.dataset.secours;
      delete img.dataset.secours;
      // Le JPEG est la photo entière : le zoom du CSS refait le cadrage de la variante.
      img.classList.add("zoom");
      img.removeAttribute("width");
      img.removeAttribute("height");
      img.src = jpeg;
    }
  }, true);
}
