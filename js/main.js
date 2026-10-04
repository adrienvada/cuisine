/* Carnet de cuisine — démarrage. Tout ce qui s'exécute à l'ouverture part d'ici,
   et d'ici seulement : les autres modules ne font que déclarer. Ils s'importent
   les uns les autres en cercle (le routeur appelle les vues, les vues rappellent
   le routeur), ce qui n'est sans danger que parce qu'aucun n'appelle les autres
   avant que ce fichier ait tout chargé. */

import { migrer, state } from "./core/etat.js";
import { entreeDe } from "./core/menu.js";
import { basculerSavoirs, openFondSheet } from "./vues/savoirs.js";
import { acquireWakeLock, cancelTimer, drawTray, ensureTick } from "./ui/minuteurs.js";
import { retourVers, route } from "./ui/routeur.js";
import { initialiserTheme, REDUCE_MOTION } from "./ui/theme.js";
import { demarrerSync } from "./sync.js";

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

/* Revenu sur l'onglet pendant une cuisine, l'écran doit rester allumé. */
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && document.querySelector(".cook")) acquireWakeLock();
});

route();
drawTray();
ensureTick();

/* Une bulle ramène à l'étape qui tourne, même depuis une autre recette ;
   la croix, elle, arrête le minuteur. */
document.getElementById("timer-tray").addEventListener("click", e => {
  const pill = e.target.closest("[data-timer]");
  if (!pill) return;
  const t = state.timers.find(x => x.id === pill.dataset.timer);
  if (!t) return;
  if (e.target.closest(".t-x")) { cancelTimer(t.id); return; }
  const base = t.mk && entreeDe(t.mk) ? `#/recette/${t.rid}/m/${t.mk}` : `#/recette/${t.rid}`;
  const target = `${base}/cuisine/${t.step}`;
  // Même adresse (on a avancé d'étape sans changer le hash) : pas d'événement, on redessine.
  if (location.hash === target) route();
  else location.hash = target;
});

/* Un appel au savoir peut être n'importe où — fiche, mode cuisine, note de
   supplément. Un seul écouteur délégué plutôt qu'un par rendu.
   Deux gestes distincts : toucher l'astuce déplie la ligne, toucher la ligne
   ouvre la fiche. Le premier ne fait jamais le second. */
document.body.addEventListener("click", e => {
  const fleche = e.target.closest("[data-retour]");
  if (fleche) { e.preventDefault(); return retourVers(fleche.dataset.retour); }
  const lien = e.target.closest("[data-fond]");
  if (lien) { e.preventDefault(); return openFondSheet(lien.dataset.fond); }
  // L'appel est lui-même un bouton : c'est lui qui déplie, au doigt comme au clavier.
  const appel = e.target.closest(".s-cue");
  if (appel) return basculerSavoirs(appel.closest(".a-savoirs"));
  // Un autre bouton dans l'encadré (le minuteur d'un supplément) garde son geste.
  if (e.target.closest("button")) return;
  const porteur = e.target.closest(".a-savoirs");
  if (porteur) basculerSavoirs(porteur);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => import("./ui/miseajour.js").then(m => m.surveillerMiseAJour()).catch(() => {}));
}

initialiserTheme();

/* La synchro démarre en dernier, comme avant : son premier échange ne doit
   rien trouver à moitié construit. */
demarrerSync();
