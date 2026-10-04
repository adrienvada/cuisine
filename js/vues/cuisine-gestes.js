/* Les pages qui tournent du mode cuisine : ce que décide le lâcher du doigt. Pur (aucun DOM) pour
   être testé tel quel ; js/vues/cuisine.js y branche glisser() et relacher() du socle. */

/* Une page tourne si le doigt l'a emmenée assez loin (le quart de la largeur, au moins 64 px),
   ou s'il l'a lancée : une vitesse franche dans le sens où elle est déjà partie suffit, pourvu
   qu'elle ait bougé un peu. Un doigt qui revient en arrière à vive allure annule, même loin. */
export const DISTANCE_MIN = 64;
export const PART_DE_LARGEUR = 0.22;
export const VITESSE_LANCEE = 450;   // px/s
export const DISTANCE_LANCEE = 20;   // px

/* x : translation de la page au lâcher (négative quand on la tire vers la gauche), vx : vitesse
   du doigt en px/s, largeur : celle de la page. → 1 (étape suivante), -1 (précédente) ou 0
   (la page revient). */
export function decisionPage(x, vx, largeur) {
  const loin = Math.abs(x) >= Math.max(DISTANCE_MIN, largeur * PART_DE_LARGEUR);
  const rapide = Math.abs(vx) >= VITESSE_LANCEE;
  const memeSens = Math.sign(vx) === Math.sign(x);
  if (rapide && !memeSens) return 0;
  if (!(loin || (rapide && Math.abs(x) >= DISTANCE_LANCEE))) return 0;
  return x < 0 ? 1 : -1;
}

/* Les bornes de la translation d'une page : on ne tire pas au-delà de la première ni de la
   dernière étape (le doigt y rencontre l'élastique). Les extrémités ouvertes sont infinies. */
export const limitesPage = (index, total) => ({
  x: [index >= total - 1 ? 0 : -Infinity, index <= 0 ? 0 : Infinity]
});
