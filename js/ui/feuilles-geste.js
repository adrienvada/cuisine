/* Glisser une feuille vers le bas pour la fermer. Chargé à l'ouverture d'une feuille par
   feuilles.js, jamais sur le chemin de l'accueil.

   Seule la poignée porte le geste (sa zone de toucher déborde, voir base.css) : le contenu de
   la feuille garde son défilement. La feuille suit le doigt, élastique vers le haut ; le fond
   s'éclaircit avec elle (--glisse, de 0 à 1). Au-delà d'un seuil de distance ou de vitesse
   elle part : fermer, c'est comme toujours demander le retour (`fermer`), et la sortie reprend
   la feuille là où le doigt l'a laissée. Sinon elle revient à ressort, avec la vitesse du doigt. */

import { glisser, relacher } from "./geste.js";

export function brancher(fond, feuille, fermer) {
  const poignee = feuille.querySelector(".sheet-grip");
  if (!poignee || !fond.isConnected || fond.classList.contains("sort")) return;
  let hauteur = 1;
  glisser(poignee, {
    axe: "y",
    limites: { y: [0, Infinity] },
    appliquer: false,
    surDebut: () => { hauteur = feuille.offsetHeight || 1; fond.classList.add("en-main"); },
    surDeplacement: ({ y }) => {
      feuille.style.translate = `0 ${y}px`;
      fond.style.setProperty("--glisse", Math.min(1, Math.max(0, y / hauteur)).toFixed(3));
    },
    surFin: ({ y, vy, annule }) => {
      fond.classList.remove("en-main");
      if (!annule && !fond._ferme && (y > Math.min(140, hauteur * 0.3) || (vy > 600 && y > 24))) {
        fermer();
        return;
      }
      fond.style.removeProperty("--glisse");
      relacher(feuille, { x: 0, y: 0 }, { x: 0, y: vy });
    }
  });
}
