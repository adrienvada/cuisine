/* Mesurer une page immobile. Une boîte lue en plein mouvement (entrée de page, feuille qui
   monte, toast qui glisse) sort à 43,99997 px au lieu de 44, et une couleur lue pendant la
   transition du thème donne un contraste intermédiaire : on attend la fin des animations et
   des transitions en cours. Seulement celles qui se voient (une transition dans un <details>
   fermé n'avance pas forcément) et jamais plus d'1,5 s : la plus longue du carnet dure 0,3 s.
   Les assertions qui en dépendent se relisent de toute façon avec expect.poll. */
export const animationsFinies = page => page.evaluate(() => {
  const enCours = document.getAnimations().filter(a => {
    if (a.effect?.getComputedTiming().endTime === Infinity) return false;
    const cible = a.effect?.target;
    return !cible || !cible.checkVisibility || cible.checkVisibility();
  });
  return Promise.race([
    Promise.all(enCours.map(a => a.finished.catch(() => {}))),
    new Promise(fin => setTimeout(fin, 1500))
  ]);
});
