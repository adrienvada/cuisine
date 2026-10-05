/* Le message qui apparaît quelques secondes en bas de l'écran : son contenu, son décompte, son
   focus et sa voix. Chargé par toast.js au repos (après le premier affichage) ou au premier
   message : l'accueil n'en a pas besoin pour se dessiner. */

import { typo } from "../core/format.js";
import { annoncer } from "./annonces.js";

let precedent = null;       // ce qui avait le focus avant que le bouton du message le prenne
let compteur = 0;           // le numéro du message affiché : un message plus ancien ne ferme pas le nouveau
let fermerCourant = null;
let delaiCourant = 0;
let minuterie = null;

function armer(ms) {
  clearTimeout(minuterie);
  minuterie = setTimeout(() => fermerCourant && fermerCourant(), ms);
}

/* Le mouvement des messages (écarter du doigt, trait du temps qui reste) et des pastilles
   (le chiffre qui roule, le saut) vit dans js/ui/toast-mouvement.js, qui se charge ici une
   fois (au repos, ou au premier message). Sans lui, tout marche pareil, sans le geste. */
let M = null, chargementMouvement = null;
export const mouvement = () => M;
export function chargerMouvement() {
  return (chargementMouvement ||= import("./toast-mouvement.js").then(m => {
    M = m;
    m.brancher({ suspendre: () => clearTimeout(minuterie), reprendre, fermer: () => fermerCourant && fermerCourant(), delai: () => delaiCourant });
  }, () => {}));
}

/* `action` ajoute un bouton au message (« Annuler »…) : un appui appelle
   `surAction`, puis ferme le message. Sans option, le rendu est celui d'un simple
   message de 2,2 s. Un message qui propose un geste reste plus longtemps affiché :
   le temps de le lire et d'y viser, et tant qu'on le survole, qu'on le touche ou qu'il a
   le focus. Quand le geste qui l'a fait naître vient du clavier (`auClavier`, relevé par
   toast.js au moment de l'appel), le bouton prend le focus. */
export function toast(msg, { action, surAction, duree } = {}, auClavier = false) {
  /* Une seule règle pour tous les messages : pas de point final (un « ! » ou un « ? » reste). */
  msg = typo(String(msg).replace(/\.\s*$/, ""));
  const t = document.getElementById("toast");
  delaiCourant = duree ?? (action ? 5000 : 2200);
  const id = ++compteur;
  // Un message qui en remplace un autre dont le bouton avait le focus efface ce bouton :
  // le focus retourne d'abord à ce qu'il avait quitté, sinon il tomberait dans le vide.
  if (t.contains(document.activeElement) && precedent && precedent.isConnected) precedent.focus({ preventScroll: true });
  precedent = null;
  const focusAvant = document.activeElement;
  const prendLeFocus = !!action && auClavier;
  t.textContent = "";
  const texte = document.createElement("span");
  texte.className = "toast-msg";
  texte.id = "toast-msg";
  texte.textContent = msg;
  t.appendChild(texte);

  const fermer = () => {
    if (id !== compteur) return;
    clearTimeout(minuterie);
    const avaitLeFocus = t.contains(document.activeElement);
    t.classList.remove("visible");
    // Le bouton part tout de suite (il ne doit plus être atteignable), le message
    // reste le temps du fondu : une pastille vide qui s'éteint serait un éclair.
    t.querySelector(".toast-action")?.remove();
    setTimeout(() => { if (id === compteur && !t.classList.contains("visible")) t.textContent = ""; }, 300);
    // Le bouton disparaît avec le focus dessus : on le rend à ce qu'il avait quitté.
    if (avaitLeFocus && precedent && precedent.isConnected) precedent.focus({ preventScroll: true });
    precedent = null;
  };
  fermerCourant = fermer;

  if (action) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "toast-action";
    b.textContent = action;
    // Le focus sur le bouton lit le message avec lui : pas de seconde annonce.
    b.setAttribute("aria-describedby", "toast-msg");
    b.addEventListener("click", () => {
      if (surAction) surAction();
      fermer();
    });
    t.appendChild(b);
    if (prendLeFocus) precedent = focusAvant && focusAvant !== document.body ? focusAvant : null;
  }
  // Une région qui reçoit son texte en même temps qu'elle apparaît n'est pas annoncée
  // par tous les lecteurs : le toast reste rendu en permanence, et la voix passe par
  // la région du carnet.
  if (!prendLeFocus) annoncer(msg);
  t.hidden = false;
  t.classList.add("visible");
  // Le bouton ne peut recevoir le focus qu'une fois le message rendu visible.
  if (prendLeFocus) t.querySelector(".toast-action").focus({ preventScroll: true });
  armer(delaiCourant);
  if (M) M.surMessage(t, !!action, delaiCourant);
  else chargerMouvement();
}

/* Le message reprend son décompte quand on le lâche (3 s au plus : le temps de relire). */
function reprendre() {
  if (document.getElementById("toast").classList.contains("visible")) armer(Math.min(delaiCourant, 3000));
}

/* Tant qu'on lit le message ou qu'on vise son bouton, il ne s'éteint pas. */
const t = document.getElementById("toast");
if (t) {
  t.addEventListener("focusin", () => clearTimeout(minuterie));
  t.addEventListener("focusout", e => { if (!t.contains(e.relatedTarget)) reprendre(); });
  // Le survol n'existe qu'à la souris : au doigt, il resterait « survolé » pour toujours.
  t.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") clearTimeout(minuterie); });
  t.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") reprendre(); });
  t.addEventListener("keydown", e => { if (e.key === "Escape" && fermerCourant) fermerCourant(); });
}
