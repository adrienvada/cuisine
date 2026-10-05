/* Les transitions de vue et la barre d'onglets vivante. Ce module n'est pas sur le
   chemin de l'accueil : le routeur l'importe (import()) une fois la première vue
   dessinée, avec css/navigation.css qui porte tout ce qui bouge ici. Tant qu'il n'est
   pas là, ou si le navigateur ne connaît pas les View Transitions, la navigation est
   l'échange direct d'avant, et l'onglet actif garde son fond de base.css. */

import { recetteDe, typeDe } from "../core/sens.js";
import { mouvementReduit } from "./theme.js";
import { prechauffer } from "./toast.js";

const NOM_PHOTO = "photo-vt";

/* ---------- Feuille de style ---------- */

/* La feuille se pose juste après base.css, donc avant celles des vues : elles gardent
   la dernière main. `pret` se résout quand elle est appliquée (ou en erreur : on s'en
   passe, le carnet marche pareil). */
export const pret = new Promise(fin => {
  if (typeof document === "undefined") return fin();
  const lien = document.createElement("link");
  lien.rel = "stylesheet";
  lien.href = "css/navigation.css";
  lien.addEventListener("load", () => fin(), { once: true });
  lien.addEventListener("error", () => fin(), { once: true });
  const base = document.querySelector('link[rel="stylesheet"][href="css/base.css"]');
  if (base) base.after(lien);
  else document.head.append(lien);
  setTimeout(fin, 3000);
});

/* ---------- D'où vient le geste ---------- */

/* Le centre du dernier élément activé (clic, tap ou clavier), pour le cercle du mode
   cuisine. Un grand élément (une carte) donne plutôt l'endroit du doigt. */
let derniere = null;
if (typeof document !== "undefined") {
  document.addEventListener("click", e => {
    const el = e.target instanceof Element ? e.target.closest("a, button, [role=button], [tabindex]") || e.target : null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const grand = r.width > 200 || r.height > 200;
    const pointe = e.detail > 0 && e.clientX > 0 && e.clientY > 0;
    derniere = {
      x: Math.round(grand && pointe ? e.clientX : r.left + r.width / 2),
      y: Math.round(grand && pointe ? e.clientY : r.top + r.height / 2),
      cible: el,
      quand: performance.now()
    };
  }, true);
}

/* Le geste qui vient d'avoir lieu, ou null s'il est ancien (un retour du navigateur n'a pas d'origine). */
export function origineRecente() {
  return derniere && performance.now() - derniere.quand < 1500 ? derniere : null;
}

/* ---------- Quelle transition ---------- */

/* planifier({ de, vers, nouvelle, demandee }) — ce que le routeur jouera pour passer de la vue
   `de` à la vue `vers` (adresses sans requête) : { type, origine, photo }, ou null s'il n'y a
   rien à jouer. `demandee` ({ type, origine }) vient de preparerTransition et l'emporte.
   La photo d'une carte devient la grande photo de la fiche qu'on ouvre, et y retourne. */
export function planifier({ de, vers, nouvelle, demandee }) {
  const type = demandee?.type || typeDe(de, vers, nouvelle);
  if (!type) return null;
  const geste = origineRecente();
  const origine = demandee?.origine || (geste && { x: geste.x, y: geste.y });
  const cible = geste?.cible;
  const versFiche = recetteDe(vers), deFiche = recetteDe(de);
  const photo = type !== "avant" && type !== "arriere" ? null
    : versFiche || deFiche ? { id: versFiche || deFiche, cible } : null;
  return { type, origine, photo };
}

/* ---------- Photo partagée ---------- */

const dansLEcran = el => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
};

/* La photo de cette recette qui se voit, en préférant celle que le doigt a touchée
   (une recette présente deux fois au menu a deux vignettes). */
function photoDe(racine, id, touchee) {
  const toutes = [...racine.querySelectorAll("[data-vt-photo]")].filter(e => e.dataset.vtPhoto === id && dansLEcran(e));
  return toutes.find(e => touchee && (e === touchee || e.contains(touchee) || touchee.contains(e))) || toutes[0] || null;
}

/* ---------- La transition ---------- */

let courante = null;
/* Les éléments qui portent le nom de la photo partagée : un seul à la fois, effacés à la fin de la transition (ou à la suivante, si elle la saute). */
let nommees = [];
const effacerNoms = () => { nommees.forEach(e => { e.style.viewTransitionName = ""; }); nommees = []; };
let jeton = 0;

/* jouer({ type, origine, photo: { id, cible } }, rendre) — échange le DOM par `rendre()` à
   l'intérieur d'une transition de vue (si `rendre()` rend false, rien n'a changé : on la
   saute). `type` va sur <html data-vt>, `origine` ({ x, y }) dans --vt-x / --vt-y, avant
   tout. `photo.id` est la recette dont la photo voyage : on
   nomme sa photo visible dans la vue qu'on quitte (celle que `cible`, l'élément touché, désigne
   s'il y en a deux) et, une fois la nouvelle dessinée, la sienne. Rend la promesse de
   l'échange, ou null si aucune transition n'a lieu (alors rien n'a été appelé : le routeur
   échange lui-même). */
export function jouer({ type, origine, photo }, rendre) {
  if (typeof document.startViewTransition !== "function" || mouvementReduit() || document.visibilityState !== "visible") return null;
  const moi = ++jeton;
  courante?.skipTransition();
  const racine = document.documentElement;
  racine.dataset.vt = type;
  if (origine) {
    racine.style.setProperty("--vt-x", origine.x + "px");
    racine.style.setProperty("--vt-y", origine.y + "px");
  }
  effacerNoms();
  const nommer = el => { if (el) { el.style.viewTransitionName = NOM_PHOTO; nommees.push(el); } };
  if (photo) nommer(photoDe(document, photo.id, photo.cible));
  let t;
  try {
    t = document.startViewTransition(() => {
      // Une vue qui n'a rien changé (une redirection) : la transition n'a rien à montrer.
      if (rendre() === false) return t.skipTransition();
      if (photo) nommer(photoDe(document, photo.id, null));
    });
  } catch {
    effacerNoms();
    racine.removeAttribute("data-vt");
    return null;
  }
  courante = t;
  const fin = () => {
    if (jeton !== moi) return;   // une autre a pris la suite : elle a déjà tout remis à zéro
    effacerNoms();
    courante = null;
    racine.removeAttribute("data-vt");
    racine.style.removeProperty("--vt-x");
    racine.style.removeProperty("--vt-y");
  };
  t.finished.then(fin, fin);
  t.ready.catch(() => {});
  return t.updateCallbackDone.then(() => true, erreur => { console.error("Transition de vue : le dessin a échoué", erreur); return false; });
}

/* ---------- La barre d'onglets ---------- */

const barre = typeof document !== "undefined" ? document.querySelector(".tabbar") : null;
let pastille = null, actif = null;

/* La pastille (décor, cachée des lecteurs d'écran) est créée une fois la feuille de style
   là : avant, elle serait un enfant de plus de la barre et la ferait bouger. */
pret.then(() => {
  if (!barre) return;
  pastille = document.createElement("span");
  pastille.className = "tab-pill";
  pastille.setAttribute("aria-hidden", "true");
  barre.prepend(pastille);
  if (typeof ResizeObserver === "function") new ResizeObserver(() => placer(true)).observe(barre);
});

/* La pastille est placée sur l'onglet actif en pixels (translate) et glisse d'un onglet
   à l'autre par une transition CSS à ressort : interruptible, sans module de mouvement. */
function placer(sansGlisse) {
  if (!pastille) return;
  const lien = barre.querySelector("a.active");
  if (!lien || !lien.offsetWidth) return;
  if (sansGlisse) pastille.classList.add("sans-glisse");
  pastille.style.width = lien.offsetWidth + "px";
  pastille.style.height = lien.offsetHeight + "px";
  pastille.style.translate = `${lien.offsetLeft}px ${lien.offsetTop}px`;
  barre.classList.add("avec-pastille");
  if (sansGlisse) {
    void pastille.offsetWidth;
    pastille.classList.remove("sans-glisse");
  }
}

/* Le routeur a marqué l'onglet `nom` : la pastille le rejoint, et son icône joue son
   petit geste quand l'onglet vient de changer. */
export function onglet(nom, { anime = true } = {}) {
  if (!pastille) return;
  const premier = !barre.classList.contains("avec-pastille");
  placer(premier || !anime);
  if (!premier && anime && actif !== nom && !mouvementReduit()) {
    const lien = barre.querySelector(`a[data-tab="${nom}"]`);
    if (lien) {
      lien.classList.remove("joue");
      void lien.offsetWidth;
      lien.classList.add("joue");
      lien.addEventListener("animationend", () => lien.classList.remove("joue"), { once: true });
    }
  }
  actif = nom;
}

/* Le mouvement des messages et des pastilles (gestes, chiffres qui roulent) arrive au repos,
   après la feuille de style, jamais sur le chemin de l'accueil. <html data-nav-pret> dit que
   tout est là : les transitions, la pastille d'onglet, les badges et les messages animés. */
if (typeof document !== "undefined") {
  pret.then(() => new Promise(fin => setTimeout(fin, 600))).then(prechauffer)
    .then(() => document.documentElement.setAttribute("data-nav-pret", ""));
}
