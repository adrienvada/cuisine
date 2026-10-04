/* L'unique région live du carnet : ce que l'écran change sans qu'on le touche (un minuteur prêt, une étape, un nombre de résultats) y est dit à haute voix. */

let attente = null;

/* Un lecteur d'écran n'annonce que ce qui change : redire la même phrase (« Étape 2 / 5 »
   deux fois de suite) exige de vider la région, puis de l'écrire un instant plus
   tard. Une annonce qui en recouvre une autre la remplace : la dernière est la vraie. */
export function annoncer(texte) {
  const region = document.getElementById("annonces");
  if (!region) return;
  clearTimeout(attente);
  region.textContent = "";
  if (!texte) return;
  attente = setTimeout(() => { region.textContent = texte; }, 60);
}
