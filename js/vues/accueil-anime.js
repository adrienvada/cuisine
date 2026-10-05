/* Le mouvement de l'accueil qui n'est pas sur le chemin du premier écran : la pastille qui glisse sous les
   puces, la rangée qui défile, la grille qui se réordonne (flip), le nombre qui roule, l'état vide qui se
   trace, la photo qui se fond. Chargé par accueil.js au repos, une fois la page chargée, avec sa feuille
   (css/accueil-anime.css) : le module ne se résout qu'une fois la feuille appliquée, pour qu'aucun geste
   n'anime sans ses styles. Avant, ou si rien ne vient, l'accueil fait la même chose d'un coup. */

import { animer, annuler, flip, rebondir, rouler } from "../ui/mouvement.js";
import { REDUCE_MOTION } from "../ui/theme.js";

export { annuler, rebondir, rouler };

await new Promise(fin => {
  const lien = document.createElement("link");
  lien.rel = "stylesheet";
  lien.href = "css/accueil-anime.css";
  lien.onload = lien.onerror = fin;
  document.head.append(lien);
});

/* Le bol fumant de l'état vide : un trait qui se dessine chaque fois que le message apparaît
   (une animation CSS repart quand son élément cesse d'être caché). Décor seulement. */
const VIDE = `<svg class="vide-illo trace" viewBox="0 0 64 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path pathLength="1" d="M9 24h46c0 11-9 19-23 19S9 35 9 24z"/><path pathLength="1" style="--i:2" d="M24 17c-4-4 3-6-1-11M33 17c-4-4 3-6-1-11M42 17c-4-4 3-6-1-11"/></svg>`;

/* La grille vient d'être dessinée : son état vide prend son illustration, et ses photos leur fondu. */
export function equiper(grid) {
  const vide = grid.querySelector(".grid-empty");
  if (vide && !vide.querySelector(".vide-illo")) vide.insertAdjacentHTML("afterbegin", VIDE);
  grid.addEventListener("load", photoArrivee, true);
  equiperRecherche();
}

/* La croix d'effacement de la recherche : celle du navigateur ne se laisse pas animer (Chrome ignore
   `animation` sur ce pseudo-élément), la nôtre se pose en grandissant chaque fois que le champ cesse
   d'être vide. Avant ce module, ou en mouvement réduit, c'est la croix du navigateur qui sert. */
function equiperRecherche() {
  const barre = document.querySelector(".search-row .searchbar");
  const champ = barre?.querySelector("input");
  if (!champ || barre.querySelector(".search-clear")) return;
  const croix = document.createElement("button");
  croix.type = "button";
  croix.className = "search-clear";
  croix.setAttribute("aria-label", "Effacer la recherche");
  croix.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
  const etat = () => barre.classList.toggle("a-texte", champ.value !== "");
  champ.addEventListener("input", etat);
  croix.addEventListener("click", () => {
    champ.value = "";
    champ.dispatchEvent(new Event("input", { bubbles: true }));
    champ.focus();
  });
  barre.append(croix);
  etat();
}

/* Une photo qui arrive en retard, une fois la page défilée, se fond sur sa couleur : jamais
   celles du premier écran (c'est le LCP, il ne se fond pas). */
function photoArrivee(e) {
  const img = e.target;
  if (!(img instanceof HTMLImageElement)) return;
  enAttente.push(img);
  // Vingt photos qui arrivent d'un coup (un retour à l'accueil, tout en cache) : une seule mesure
  // de mise en page pour toutes, au prochain dessin, et non une par photo (44 ms à 4× plus lent).
  if (enAttente.length === 1) requestAnimationFrame(() => {
    const liste = enAttente.splice(0);
    const defile = window.scrollY >= 8;
    const premiers = liste.map(i => !defile && i.getBoundingClientRect().top < innerHeight);
    liste.forEach((i, k) => { if (!premiers[k]) i.classList.add("photo-arrive"); });
  });
}
const enAttente = [];

/* La rangée défile pour montrer la puce choisie, centrée autant que la rangée le permet.
   (Pas scrollIntoView : il ferait aussi défiler la page.) */
export function montrerPuce(b) {
  const rangee = b.parentElement;
  const gauche = Math.max(0, b.offsetLeft - (rangee.clientWidth - b.offsetWidth) / 2);
  rangee.scrollTo({ left: gauche, behavior: REDUCE_MOTION.matches ? "auto" : "smooth" });
}

/* La pastille verte d'une puce active qui change : un décor qui glisse de l'ancienne à la nouvelle
   (translate et scale, avec le ressort vif du socle, par transition CSS : un nouveau choix en cours de
   route repart de l'endroit où la pastille est). La puce choisie ne prend son propre fond qu'à
   l'arrivée ; le décor part alors, et la puce rebondit. */
export function glisserPastille(rangee, ancienne, nouvelle) {
  if (REDUCE_MOTION.matches || !ancienne || ancienne === nouvelle) return;
  /* D'abord la classe, avant toute mesure : lire offsetLeft force un calcul de style, et la puce choisie
     changerait alors de couleur sur-le-champ (texte crème sur fond encore vide, le temps du vol). */
  rangee.classList.add("en-vol");
  let p = rangee.querySelector(".pastille");
  /* Où est la pastille en ce moment : celle en vol, sinon l'ancienne puce. */
  let gauche = ancienne.offsetLeft, largeur = ancienne.offsetWidth;
  if (p) {
    const style = getComputedStyle(p);
    gauche = parseFloat(style.translate) || 0;
    largeur = p.offsetWidth * (parseFloat(style.scale) || 1);
  } else {
    p = document.createElement("span");
    p.className = "pastille";
    p.setAttribute("aria-hidden", "true");
    rangee.prepend(p);
  }
  p.style.transition = "none";
  p.style.width = nouvelle.offsetWidth + "px";
  p.style.height = nouvelle.offsetHeight + "px";
  p.style.top = nouvelle.offsetTop + "px";
  p.style.translate = `${gauche}px 0`;
  p.style.scale = `${largeur / nouvelle.offsetWidth} 1`;
  void p.offsetWidth;
  p.style.transition = "";
  p.style.translate = `${nouvelle.offsetLeft}px 0`;
  p.style.scale = "1 1";
  const fin = () => {
    clearTimeout(p._fin);
    if (!p.isConnected) return;
    p.remove();
    rangee.classList.remove("en-vol");
    rebondir(nouvelle);
  };
  p.ontransitionend = e => { if (e.propertyName === "translate") fin(); };
  clearTimeout(p._fin);
  p._fin = setTimeout(fin, 700);
}

/* La grille se réordonne par flip() du socle : les cartes `alEcran()` glissent de leur ancienne place à
   la nouvelle (translate, jamais de transform qui reste), celles qui reviennent entrent échelonnées.
   `muter` fait le changement ; `sortantes` sont les cartes à écarter, `sorties` les rend à leur place
   (cachées) quand leur sortie est finie. Pas sortir() du socle : il retire l'élément du DOM, et une carte
   retirée puis recréée est le « candidat LCP qui disparaît » que ordonner() a supprimé. */
export function filtrer(alEcran, sortantes, grid, muter, cachee) {
  return flip(alEcran, () => {
    /* Mesurer toutes les sortantes avant d'en écrire une : elles quittent le flux, les autres remontent. */
    const boite = grid.getBoundingClientRect();
    const sortants = sortantes();
    const places = sortants.map(el => el.getBoundingClientRect());
    sortants.forEach((el, i) => {
      el.style.position = "absolute";
      el.style.margin = "0";
      el.style.width = places[i].width + "px";
      el.style.left = places[i].left - boite.left + "px";
      el.style.top = places[i].top - boite.top + "px";
      el.classList.add("card-leave");
      /* Plus focalisable ni lue dès le début de sa sortie (cf. sortir() du socle). */
      el.inert = true;
      el.setAttribute("aria-hidden", "true");
      animer(el, [{ opacity: 1, translate: "0 0", scale: "1" }, { opacity: 0, translate: "0 -8px", scale: "0.94" }],
        { cle: "sortie", duree: "courte", easing: "entree", reprise: false }).then(fini => { if (fini) cachee(el); });
    });
    muter();
  });
}
