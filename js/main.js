/* Carnet de cuisine — démarrage. Tout ce qui s'exécute à l'ouverture part d'ici,
   et d'ici seulement : les autres modules ne font que déclarer. Ils s'importent
   les uns les autres en cercle (le routeur appelle les vues, les vues rappellent
   le routeur), ce qui n'est sans danger que parce qu'aucun n'appelle les autres
   avant que ce fichier ait tout chargé.
   La vue d'accueil est la seule chargée d'emblée : les autres vues, et la synchro, ne
   viennent qu'après le premier affichage. */

import { migrer, state } from "./core/etat.js";
import { entreeDe } from "./core/menu.js";
import { drawTray, ensureTick } from "./ui/minuteurs.js";
import { retourVers, route } from "./ui/routeur.js";
import { initialiserTheme, REDUCE_MOTION } from "./ui/theme.js";
import { initialiserReglages } from "./vues/reglages.js";

/* Les anciens formats d'abord : tout ce qui suit lit un état à jour. */
migrer();

/* Icône de partage : un battement avant l'action, sur tous les boutons de
   partage du carnet (vignette, page recette, mode cuisine, menu, savoirs,
   liste de courses). Purement décoratif — l'action suit son cours normal. */
document.addEventListener("pointerdown", e => {
  if (REDUCE_MOTION.matches) return;
  const b = e.target.closest('[data-share], #share-recipe, #cook-share, #share-menu, #f-share, #f-share-page, #share');
  if (!b) return;
  const icon = b.querySelector("svg");
  if (!icon) return;
  icon.classList.remove("share-pulse");
  void icon.offsetWidth;
  icon.classList.add("share-pulse");
});

/* Loupe qui tourne pendant la frappe, dans n'importe quelle barre de recherche. */
document.addEventListener("input", e => {
  const input = e.target;
  if (!(input instanceof HTMLInputElement) || input.type !== "search") return;
  const bar = input.closest(".searchbar");
  if (!bar || REDUCE_MOTION.matches) return;
  bar.classList.add("typing");
  clearTimeout(bar._typingTimer);
  bar._typingTimer = setTimeout(() => bar.classList.remove("typing"), 500);
});

/* Le routeur reçoit l'événement en argument : on l'appelle sans, pour que ses
   options gardent leurs valeurs par défaut. */
window.addEventListener("hashchange", () => route());

const premierRendu = route();
drawTray();
ensureTick();

/* Une bulle ramène à l'étape qui tourne, même depuis une autre recette (sa croix,
   qui arrête le minuteur, est traitée en amont par js/ui/minuteurs.js). */
document.getElementById("timer-tray").addEventListener("click", e => {
  const pill = e.target.closest("[data-timer]");
  if (!pill) return;
  const t = state.timers.find(x => x.id === pill.dataset.timer);
  if (!t) return;
  const base = t.mk && entreeDe(t.mk) ? `#/recette/${t.rid}/m/${t.mk}` : `#/recette/${t.rid}`;
  const target = `${base}/cuisine/${t.step}`;
  // Même adresse (on a avancé d'étape sans changer le hash) : pas d'événement, on redessine.
  if (location.hash === target) route();
  else location.hash = target;
});

/* Le module des savoirs vient à la demande (une fiche l'a déjà chargé si l'appel
   en fait partie) ; l'écouteur ci-dessous le sollicite à chaque geste. */
const savoirs = () => import("./vues/savoirs.js");

/* Un appel au savoir peut être n'importe où — fiche, mode cuisine, note de
   supplément. Un seul écouteur délégué plutôt qu'un par rendu.
   Deux gestes distincts : toucher l'astuce déplie la ligne, toucher la ligne
   ouvre la fiche. Le premier ne fait jamais le second. */
document.body.addEventListener("click", e => {
  const fleche = e.target.closest("[data-retour]");
  if (fleche) { e.preventDefault(); return retourVers(fleche.dataset.retour); }
  const lien = e.target.closest("[data-fond]");
  if (lien) { e.preventDefault(); return savoirs().then(m => m.openFondSheet(lien.dataset.fond)); }
  // L'appel est lui-même un bouton : c'est lui qui déplie, au doigt comme au clavier.
  const appel = e.target.closest(".s-cue");
  if (appel) return savoirs().then(m => m.basculerSavoirs(appel.closest(".a-savoirs")));
  // Un autre bouton dans l'encadré (le minuteur d'un supplément) garde son geste.
  if (e.target.closest("button")) return;
  const porteur = e.target.closest(".a-savoirs");
  if (porteur) savoirs().then(m => m.basculerSavoirs(porteur));
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => import("./ui/miseajour.js").then(m => m.surveillerMiseAJour()).catch(() => {}));
}

initialiserTheme();
initialiserReglages();

/* Après le premier affichage, d'un instant à l'autre : la synchro ne retarde
   pas l'accueil, et son premier échange ne trouve rien à moitié construit. La
   vue des courses se charge aussi : elle s'abonne à la sauvegarde pour élaguer
   les coches, ce qui doit marcher sur n'importe quelle page. */
const demarrerPlusTard = () => {
  setTimeout(() => {
    import("./vues/courses.js").catch(() => {});
    import("./sync.js").then(m => m.demarrerSync()).catch(() => {});
  }, 0);
};
Promise.resolve(premierRendu).then(demarrerPlusTard, demarrerPlusTard);
