/* Carnet de cuisine — démarrage. Tout ce qui s'exécute à l'ouverture part d'ici,
   et d'ici seulement : les autres modules ne font que déclarer. Ils s'importent
   les uns les autres en cercle (le routeur appelle les vues, les vues rappellent
   le routeur), ce qui n'est sans danger que parce qu'aucun n'appelle les autres
   avant que ce fichier ait tout chargé.
   La vue d'accueil est la seule chargée d'emblée : les autres vues, et la synchro, ne
   viennent qu'après le premier affichage. */

import { migrer, state, surEchecSauvegarde } from "./core/etat.js";
import { entreeDe } from "./core/menu.js";
import { drawTray, ensureTick } from "./ui/minuteurs.js";
import { retourVers, route } from "./ui/routeur.js";
import { initialiserTheme, REDUCE_MOTION } from "./ui/theme.js";
import { toast } from "./ui/toast.js";
import { installerTypo } from "./ui/typo.js";
import { initialiserReglages } from "./vues/reglages.js";

/* Une initialisation secondaire qui échoue est journalisée et laissée de côté :
   elle ne doit pas empêcher les suivantes, ni surtout demarrerSync(). */
function tenter(nom, fn) {
  try { fn(); } catch (e) { console.error(`Démarrage : ${nom} a échoué`, e); }
}

/* Le stockage est plein ou refusé : les actions continuent en mémoire, mais rien
   ne survivra à la fermeture. Dit une fois par session, et seulement quand une
   action de l'utilisateur échoue : l'écriture du démarrage (la demande de
   persistance) ne change rien à ses données. Le message part un instant après
   l'écriture fautive pour ne pas être recouvert par le toast de l'action elle-même. */
let demarre = false, prevenu = false;
surEchecSauvegarde(() => {
  if (!demarre || prevenu) return;
  prevenu = true;
  setTimeout(() => toast("Mémoire de l'appareil pleine : tes changements ne sont pas enregistrés", { duree: 6000 }), 400);
});

/* Les anciens formats d'abord : tout ce qui suit lit un état à jour. */
tenter("migrations", migrer);

/* La typographie française se pose sur tout texte qui entre dans la page : à installer
   avant le premier affichage, pour que même lui arrive corrigé. */
tenter("typographie", installerTypo);

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

let premierRendu;
tenter("premier affichage", () => { premierRendu = route(); });
tenter("bulles des minuteurs", drawTray);
tenter("horloge des minuteurs", ensureTick);

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

/* Le service worker s'enregistre au repos, après le premier affichage : dès son
   installation il télécharge toute l'appli (près de 1 Mo), et ce téléchargement
   partagerait la bande passante avec les images et les modules de l'accueil. Le
   délai borne l'attente si le navigateur n'est jamais tout à fait oisif. */
if ("serviceWorker" in navigator) {
  const auRepos = suite => ("requestIdleCallback" in window ? requestIdleCallback(suite, { timeout: 4000 }) : setTimeout(suite, 2000));
  window.addEventListener("load", () => auRepos(() => import("./ui/miseajour.js").then(m => m.surveillerMiseAJour()).catch(() => {})));
}

tenter("thème", initialiserTheme);
tenter("réglages", initialiserReglages);

/* Après le premier affichage, d'un instant à l'autre : la synchro ne retarde
   pas l'accueil, et son premier échange ne trouve rien à moitié construit. La
   vue des courses se charge aussi : elle s'abonne à la sauvegarde pour élaguer
   les coches, ce qui doit marcher sur n'importe quelle page. */
const demarrerPlusTard = () => {
  setTimeout(() => {
    import("./vues/courses.js").catch(e => console.error("Démarrage : la vue des courses ne s'est pas chargée", e));
    import("./sync.js").then(m => m.demarrerSync()).catch(e => console.error("Démarrage : la synchro a échoué", e));
  }, 0);
};
Promise.resolve(premierRendu).then(demarrerPlusTard, demarrerPlusTard);
demarre = true;

/* Les photos du journal que plus aucune entrée ne réclame, une fois le premier
   affichage passé : le ménage n'a rien d'urgent. */
setTimeout(() => import("./vues/journal.js").then(m => m.purgerOrphelines()).catch(e => console.error(e)), 3000);
