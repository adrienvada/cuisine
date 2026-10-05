/* Ce que l'accueil et le démarrage savent des réglages sans charger la feuille
   elle-même (js/vues/reglages.js, qui vient après le premier affichage ou au
   premier appui) : le bouton de l'en-tête, avec le point de couleur de la synchro,
   et la demande de persistance du stockage. */

import { save, state } from "../core/etat.js";
import { html, raw } from "../core/html.js";

const ICONE_REGLAGES = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h9"/><path d="M17 7h3"/><circle cx="15" cy="7" r="2"/><path d="M4 17h3"/><path d="M11 17h9"/><circle cx="9" cy="17" r="2"/></svg>';

export const ETATS = {
  off: "Pas connecté",
  attente: "Connexion…",
  ok: "Connecté",
  hors: "Hors ligne"
};

let etatSync = "off";

/* Le point de couleur du bouton : vert connecté, doré hors ligne, rien sinon. */
export function majPoints(etat) {
  etatSync = etat in ETATS ? etat : "off";
  document.querySelectorAll("[data-reglages]").forEach(b => {
    b.dataset.sync = etatSync;
    b.setAttribute("aria-label", libelleBouton());
  });
}

const libelleBouton = () =>
  etatSync === "off" ? "Réglages" : `Réglages — carnet partagé : ${ETATS[etatSync].toLowerCase()}`;

/* À glisser dans l'en-tête de l'accueil : il défile avec la page. */
export function boutonReglages() {
  return html`<button type="button" class="reglages-btn" data-reglages data-sync="${etatSync}" aria-label="${libelleBouton()}">${raw(ICONE_REGLAGES)}<span class="reglages-point" aria-hidden="true"></span></button>`;
}


/* Le navigateur peut vider les données d'un site quand l'appareil manque de
   place ; sans cette demande, un carnet non synchronisé serait le premier à
   partir. Une seule fois, pour tout le monde : la synchro n'est plus la seule
   à y tenir. */
export function demanderPersistance() {
  const appareil = (state.reglages ??= {});
  if (appareil.persistanceDemandee) return;
  appareil.persistanceDemandee = true;
  save();
  try { navigator.storage?.persist?.(); } catch {}
}
