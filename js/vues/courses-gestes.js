/* Ce que la liste de courses décide sans toucher au DOM : la signature d'une ligne
   (pour ne la redessiner que si son contenu change), le seuil d'un balayage qui
   supprime, et la géométrie du glisser-déposer des rayons. Des fonctions pures, que
   les tests unitaires éprouvent sans navigateur ; js/vues/courses.js les branche
   sur les gestes de js/ui/geste.js. */

/* Une empreinte courte et stable d'un contenu (djb2) : de quoi reconnaître une ligne
   inchangée d'un dessin à l'autre, pas de quoi se protéger de quoi que ce soit. */
export function signature(valeur) {
  const texte = typeof valeur === "string" ? valeur : JSON.stringify(valeur);
  let h = 5381;
  for (let i = 0; i < texte.length; i++) h = ((h << 5) + h + texte.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/* Un balayage vers la gauche supprime s'il va assez loin (le tiers de la ligne, 112 px
   au plus) ou s'il est jeté vite (650 px/s) après un vrai début de geste (24 px) :
   un doigt qui frôle la ligne ne supprime rien. x est négatif vers la gauche. */
export function balayageSupprime({ x, vx = 0, largeur }) {
  const distance = Math.min(112, largeur / 3);
  return x <= -distance || (vx <= -650 && x <= -24);
}

/* Où se range la ligne qu'on traîne : le créneau (l'indice) dont le centre est le plus
   proche du centre de la ligne, qui est à `y` px de sa place. `tops` et `hauteurs` sont
   ceux des lignes au repos, dans l'ordre. */
export function creneauDeposer(tops, hauteurs, depart, y) {
  const centre = tops[depart] + hauteurs[depart] / 2 + y;
  let meilleur = depart;
  let ecart = Infinity;
  tops.forEach((t, i) => {
    const d = Math.abs(t + hauteurs[i] / 2 - centre);
    if (d < ecart) { ecart = d; meilleur = i; }
  });
  return meilleur;
}

/* L'ordre des indices quand la ligne `depart` est posée au créneau `cible`. */
export function ordreApres(n, depart, cible) {
  const ordre = Array.from({ length: n }, (_, i) => i);
  ordre.splice(depart, 1);
  ordre.splice(cible, 0, depart);
  return ordre;
}

/* De combien chaque ligne doit se décaler (en px) pour que la ligne `depart` puisse se
   poser au créneau `cible` : les lignes se rempilent depuis le haut de la première,
   avec l'espace qui les sépare au repos. `decalages[depart]` est aussi la distance que la
   ligne traînée doit parcourir pour se poser. */
export function decalagesDeposer(tops, hauteurs, depart, cible) {
  const n = tops.length;
  if (n < 2) return tops.map(() => 0);
  const espace = (tops[n - 1] - tops[0] - hauteurs.slice(0, -1).reduce((a, b) => a + b, 0)) / (n - 1);
  const ordre = ordreApres(n, depart, cible);
  const decalages = new Array(n).fill(0);
  let haut = tops[0];
  for (const i of ordre) {
    decalages[i] = haut - tops[i];
    haut += hauteurs[i] + espace;
  }
  return decalages;
}

/* La vitesse (px par image de 16 ms) du défilement automatique quand le doigt traîne une
   ligne près d'un bord de la fenêtre visible : 0 au milieu, de plus en plus vite au bord. */
export function vitesseDefilement(y, haut, bas, zone = 72) {
  if (y < haut + zone) return -Math.round(Math.min(1, (haut + zone - y) / zone) * 14);
  if (y > bas - zone) return Math.round(Math.min(1, (y - (bas - zone)) / zone) * 14);
  return 0;
}
