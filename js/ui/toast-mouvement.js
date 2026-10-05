/* Le mouvement des messages et des pastilles de nombre. Chargé au repos par toast.js (jamais
   sur le chemin de l'accueil) : il apporte au message le trait du temps qui reste, la pause au
   toucher et le geste d'écarter, et aux pastilles le chiffre qui roule, le saut, l'apparition
   et la disparition. Tout est décor : le délai, le focus, Échap et la voix (annonces.js)
   restent ceux de toast.js. */

import { COURBES, DUREES } from "../core/ressort.js";
import { glisser, relacher } from "./geste.js";
import { mouvementReduit, rebondir, rouler } from "./mouvement.js";

let api = null;
let trait = null;
let sorties = new WeakMap();   // pastille → minuterie de sa sortie

const toast = () => document.getElementById("toast");

/* ---------- Le trait du temps qui reste ---------- */

/* Un message à action montre en un trait fin le temps qui lui reste : il se vide en ligne
   droite jusqu'à la fermeture, se fige quand on touche, survole ou focalise le message, et
   repart de là où il en était quand on le lâche. En mouvement réduit le trait ne bouge pas
   (il n'y en a pas) : le décompte seul reste. */
function vider(ms, depart = 1) {
  trait?.cancel();
  trait = null;
  const el = toast()?.querySelector(".toast-temps");
  if (!el || mouvementReduit()) return;
  trait = el.animate([{ scale: `${depart} 1` }, { scale: "0 1" }], { duration: ms, easing: "linear", fill: "both" });
}

/* toast.js vient d'afficher un message. */
export function surMessage(t, avecAction, delai) {
  trait?.cancel();
  trait = null;
  if (!avecAction) return;
  const el = document.createElement("span");
  el.className = "toast-temps";
  el.setAttribute("aria-hidden", "true");   // décor : ni lu, ni touché
  t.appendChild(el);
  vider(delai);
}

/* ---------- Le geste d'écarter ---------- */

/* Vers la droite, la gauche ou le bas, avec la vitesse du doigt : au-delà d'un seuil de
   distance ou de vitesse le message part et se ferme ; sinon il revient à ressort. */
function ecarter(t) {
  glisser(t, {
    axe: "xy",
    limites: { y: [0, Infinity] },
    surDebut: () => { t.classList.add("en-main"); api.suspendre(); trait?.pause(); },
    surFin: ({ x, y, vx, vy, annule }) => {
      const part = !annule && (Math.abs(x) > 90 || y > 50 || (Math.abs(vx) > 500 && Math.abs(x) > 24) || (vy > 500 && y > 16));
      if (!part) {
        relacher(t, { x: 0, y: 0 }, { x: vx, y: vy }).then(() => { t.classList.remove("en-main"); relancer(); });
        return;
      }
      const horizontal = Math.abs(x) >= y;
      const vers = horizontal ? `${(x < 0 ? -1 : 1) * innerWidth}px ${y}px` : `${x}px 160px`;
      const fin = () => { t.classList.remove("en-main"); t.style.translate = ""; };
      if (mouvementReduit()) fin();
      else {
        const a = t.animate([{ translate: `${x}px ${y}px`, opacity: 1 }, { translate: vers, opacity: 0 }], { duration: DUREES.courte, easing: COURBES.entree });
        a.finished.then(fin, fin);
      }
      api.fermer();
    }
  });
}

/* Le décompte et le trait repartent ensemble. */
function relancer() {
  const t = toast();
  if (!t.classList.contains("visible")) return;
  api.reprendre();
  if (t.querySelector(".toast-temps")) vider(Math.min(api.delai(), 3000), Math.min(1, 3000 / api.delai()));
}

/* toast.js se donne : suspendre / reprendre le décompte, fermer, délai du message courant. */
export function brancher(toastJs) {
  api = toastJs;
  const t = toast();
  if (!t || t._mouvement) return;
  t._mouvement = true;
  ecarter(t);
  t.addEventListener("focusin", () => trait?.pause());
  t.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") trait?.pause(); });
  for (const nom of ["focusout", "pointerleave"]) {
    t.addEventListener(nom, e => { if (nom === "focusout" ? !t.contains(e.relatedTarget) : e.pointerType === "mouse") setTimeout(relancer, 0); });
  }
  // Au doigt, le toucher retient le message comme le survol à la souris.
  t.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") { api.suspendre(); trait?.pause(); } });
  for (const nom of ["pointerup", "pointercancel"]) {
    t.addEventListener(nom, e => { if (e.pointerType !== "mouse" && !t.classList.contains("en-main")) relancer(); });
  }
}

/* ---------- Pastilles de nombre ---------- */

function rejouer(b, classe) {
  b.classList.remove("entre", "sort");
  void b.offsetWidth;
  b.classList.add(classe);
}

/* Le nombre de la pastille change : le chiffre roule et la pastille saute ; de 0 à n elle
   apparaît, de n à 0 elle s'en va (retirée de l'arbre d'accessibilité dès le début de sa
   sortie). Le texte est toujours la valeur entière, une seule fois (rouler le garantit). */
export function badge(b, n) {
  const avant = b.hidden ? 0 : Number(b.textContent) || 0;
  clearTimeout(sorties.get(b));
  b.removeAttribute("aria-hidden");
  if (n === avant && (n === 0) === b.hidden) { b.classList.remove("sort"); return; }
  if (n === 0) {
    if (mouvementReduit() || b.hidden) { b.hidden = true; b.classList.remove("entre", "sort"); return; }
    b.setAttribute("aria-hidden", "true");
    rejouer(b, "sort");
    sorties.set(b, setTimeout(() => { b.hidden = true; b.classList.remove("sort"); }, 220));
    return;
  }
  if (avant === 0) {
    b.textContent = n;
    b.hidden = false;
    if (!mouvementReduit()) rejouer(b, "entre");
    return;
  }
  b.classList.remove("sort");
  rouler(b, String(n));
  rebondir(b);
}
