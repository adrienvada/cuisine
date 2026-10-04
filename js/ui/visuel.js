/* Le visuel d'une recette : photo, illustration dessinée ou emoji. */

/* Visuel d'une recette : photo si dispo, sinon illustration dessinée, sinon emoji.
   Les vignettes chargent en différé ; `eager` pour l'image principale d'une page
   (elle doit arriver tout de suite).
   `genre` dit où le visuel va : "vignette" (grille d'accueil), "carre" (carte du
   menu) ou "hero" (tête de fiche). Les trois ont aujourd'hui le même balisage ;
   le paramètre existe pour qu'un cadrage ou une taille propres à un genre se
   règlent ici, sans toucher aux appelants. */
export function visuel(r, { genre = "vignette", eager = false } = {}) {
  if (r.image) return `<img src="${r.image}" alt=""${eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"'}>`;
  return ILLO.FOOD[r.id] || r.emoji;
}
