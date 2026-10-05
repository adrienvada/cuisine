/* Le sens d'une navigation (pur) : de quelle vue à quelle vue, donc quelle transition jouer.
   Les adresses sont celles du routeur (#/, #/menu, #/recette/<id>, #/recette/<id>/cuisine/<n>…),
   sans requête. */

/* Une adresse est un onglet (une racine), un détail (une fiche, un savoir) ou le mode cuisine. */
export function genreDe(hash) {
  const parts = (hash || "").replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "recette") return parts.includes("cuisine") ? "cuisine" : "detail";
  return parts[0] === "fondamental" ? "detail" : "onglet";
}

/* La recette que montre une adresse de fiche (avec ou sans entrée de menu), ou null. */
export function recetteDe(hash) {
  const parts = (hash || "").replace(/^#\/?/, "").split("/");
  return parts[0] === "recette" && genreDe(hash) === "detail" ? parts[1] : null;
}

/* Le type de transition (valeur de <html data-vt>) pour aller de `de` à `vers`, ou null s'il
   n'y en a pas. Descendre (d'une racine vers un détail, ou vers une entrée jamais vue, c'est-à-
   dire `nouvelle`) est « avant » ; remonter ou revenir sur une entrée déjà vue est « arriere » ;
   passer d'une racine à l'autre est « onglet » ; le mode cuisine a ses deux cercles. */
export function typeDe(de, vers, nouvelle) {
  if (!de || de === vers) return null;
  const a = genreDe(de), b = genreDe(vers);
  if (b === "cuisine") return a === "cuisine" ? null : "cuisine";
  if (a === "cuisine") return "cuisine-sortie";
  if (a === "onglet" && b === "onglet") return "onglet";
  if (a === "onglet") return "avant";
  if (b === "onglet") return "arriere";
  return nouvelle ? "avant" : "arriere";
}
