/* Mesurer une page immobile. Une boîte lue en plein mouvement (entrée de page, feuille qui
   monte, toast qui glisse) sort à 43,99997 px au lieu de 44, et une couleur lue pendant la
   transition du thème donne un contraste intermédiaire : on attend la fin des animations et
   des transitions en cours (les animations infinies, s'il y en a, ne finissent jamais). */
export const animationsFinies = page => page.evaluate(() => Promise.all(document.getAnimations()
  .filter(a => a.effect?.getComputedTiming().endTime !== Infinity)
  .map(a => a.finished.catch(() => {}))));
