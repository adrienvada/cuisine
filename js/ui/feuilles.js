/* Les feuilles (fenêtres qui montent du bas) : chacune est une entrée d'historique, le geste de retour la referme. */

/* Une feuille est un état, et sur téléphone le geste de retour est la façon de
   refermer un état. Chaque feuille empile donc une entrée d'historique — à la
   même adresse, donc sans réveiller le routeur : le mode cuisine y garde son
   étape, son réveil d'écran et sa position de lecture.

   La feuille se reconnaît à sa présence dans la page, jamais à un marqueur
   posé dans l'état d'historique : le mode cuisine réécrit l'adresse à chaque
   redessin, et effacerait ce marqueur dès qu'on toucherait une bulle de
   minuteur — elles passent au-dessus des feuilles. */
export const feuilleOuverte = () => document.querySelector(".sheet-backdrop");

export function ouvrirFeuille(backdrop, auRetrait) {
  backdrop._auRetrait = auRetrait || null;
  document.body.appendChild(backdrop);
  history.pushState(history.state, "", location.hash);
}

/* Toute fermeture passe par le retour — croix, fond, Échap, bouton : un seul
   chemin, donc jamais d'entrée orpheline dans la pile. */
export function fermerFeuille() { if (feuilleOuverte()) history.back(); }

window.addEventListener("popstate", () => {
  const f = feuilleOuverte();
  if (!f) return;
  f.remove();
  if (f._auRetrait) f._auRetrait();
});

/* Les feuilles vivent sur <body>, hors de #app : un changement de vue ne les
   emporte pas. On les referme donc à la main à chaque rendu — sans quoi celle
   de l'ajout au menu survivait à la navigation et bloquait la vue suivante. */
export function closeSheets() {
  document.querySelectorAll(".sheet-backdrop").forEach(el => {
    el.remove();
    if (el._auRetrait) el._auRetrait();
  });
}
