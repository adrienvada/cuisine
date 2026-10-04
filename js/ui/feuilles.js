/* Les feuilles (fenêtres qui montent du bas) : chacune est une entrée d'historique, le geste de retour la referme. */

import { esc } from "../core/html.js";

/* Une feuille est un état, et sur téléphone le geste de retour est la façon de
   refermer un état. Chaque feuille empile donc une entrée d'historique — à la
   même adresse, donc sans réveiller le routeur : le mode cuisine y garde son
   étape, son réveil d'écran et sa position de lecture.

   La feuille se reconnaît à sa présence dans la page, jamais à un marqueur
   posé dans l'état d'historique : le mode cuisine réécrit l'adresse à chaque
   redessin, et effacerait ce marqueur dès qu'on toucherait une bulle de
   minuteur — elles passent au-dessus des feuilles. */

/* La dernière ouverte est celle du dessus : quand une confirmation s'empile sur
   les réglages, c'est elle que le retour, Échap et Tab doivent atteindre. */
export const feuilleOuverte = () => [...document.querySelectorAll(".sheet-backdrop")].pop() || null;

const FOCALISABLES = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const focalisables = feuille =>
  [...feuille.querySelectorAll(FOCALISABLES)].filter(el => el.getClientRects().length > 0);

export function ouvrirFeuille(backdrop, auRetrait) {
  backdrop._auRetrait = auRetrait || null;
  /* Où était le doigt (ou le clavier) avant : c'est là que le focus retourne à la fermeture. */
  backdrop._avant = document.activeElement;
  document.body.appendChild(backdrop);
  history.pushState(history.state, "", location.hash);
  /* Le focus entre dans la feuille — sur le champ qui le demande, sinon sur la
     feuille elle-même, d'où Tab part vers le premier bouton. */
  const feuille = backdrop.querySelector(".sheet") || backdrop;
  if (!feuille.hasAttribute("role")) feuille.setAttribute("role", "dialog");
  feuille.setAttribute("aria-modal", "true");
  feuille.tabIndex = -1;
  (backdrop.querySelector("[autofocus]") || feuille).focus({ preventScroll: true });
}

/* Toute fermeture passe par le retour — croix, fond, Échap, bouton : un seul
   chemin, donc jamais d'entrée orpheline dans la pile. `toutes` referme aussi
   les feuilles du dessous (une confirmation et les réglages qu'elle recouvre).
   Une feuille déjà en train de se fermer ne redemande pas le retour : deux
   appuis rapprochés sur Échap, ou sur la croix puis le fond, ne dépilent qu'une
   entrée. Échap et le piège à focus sont ici, et nulle part ailleurs : une vue
   qui ouvre une feuille n'écoute pas le clavier pour elle. */
export function fermerFeuille({ toutes = false } = {}) {
  const f = feuilleOuverte();
  if (!f || f._ferme) return;
  f._ferme = true;
  if (toutes) f._toutes = true;
  history.back();
}

function retirer(f) {
  f.remove();
  if (f._auRetrait) f._auRetrait();
  const avant = f._avant;
  if (avant && avant.isConnected && typeof avant.focus === "function") avant.focus({ preventScroll: true });
}

window.addEventListener("popstate", () => {
  const f = feuilleOuverte();
  if (!f) return;
  const encore = f._toutes;
  retirer(f);
  if (encore && feuilleOuverte()) fermerFeuille({ toutes: true });
});

/* Échap ferme la feuille du dessus ; Tab tourne dans la feuille au lieu de
   s'échapper vers la page cachée derrière le fond. */
document.addEventListener("keydown", e => {
  const f = feuilleOuverte();
  if (!f) return;
  if (e.key === "Escape") { fermerFeuille(); return; }
  if (e.key !== "Tab") return;
  const feuille = f.querySelector(".sheet") || f;
  const liste = focalisables(feuille);
  if (!liste.length) { e.preventDefault(); feuille.focus(); return; }
  const premier = liste[0], dernier = liste[liste.length - 1];
  const actif = document.activeElement;
  if (!feuille.contains(actif) || actif === feuille) {
    e.preventDefault();
    (e.shiftKey ? dernier : premier).focus();
  } else if (e.shiftKey && actif === premier) {
    e.preventDefault(); dernier.focus();
  } else if (!e.shiftKey && actif === dernier) {
    e.preventDefault(); premier.focus();
  }
});

/* Les feuilles vivent sur <body>, hors de #app : un changement de vue ne les
   emporte pas. On les referme donc à la main à chaque rendu — sans quoi celle
   de l'ajout au menu survivait à la navigation et bloquait la vue suivante. */
export function closeSheets() {
  document.querySelectorAll(".sheet-backdrop").forEach(retirer);
}

/* La question à deux issues, sans confirm() : une feuille avec deux boutons.
   `detail` est du balisage déjà sûr (le résultat d'un html`…`) ; le titre et le
   texte sont échappés ici. La réponse arrive une fois la feuille réellement retirée, par
   quelque chemin qu'elle se soit fermée — le geste de retour vaut « non ». */
export function confirmer({ titre, texte, detail = "", oui = "Confirmer", non = "Annuler", danger = false }) {
  return new Promise(resolve => {
    const backdrop = document.createElement("div");
    backdrop.className = "sheet-backdrop confirmation";
    backdrop.innerHTML = `
      <div class="sheet" role="alertdialog" aria-modal="true" aria-label="${esc(titre)}">
        <div class="sheet-grip"></div>
        <h3>${esc(titre)}</h3>
        ${texte ? `<p class="sheet-sub conf-texte">${esc(texte)}</p>` : ""}
        ${detail}
        <div class="conf-boutons">
          <button type="button" class="btn secondary" data-non autofocus>${esc(non)}</button>
          <button type="button" class="btn primary${danger ? " danger" : ""}" data-oui>${esc(oui)}</button>
        </div>
      </div>`;
    let reponse = false;
    backdrop.addEventListener("click", e => {
      if (e.target.closest("[data-oui]")) reponse = true;
      else if (e.target !== backdrop && !e.target.closest("[data-non]")) return;
      fermerFeuille();
    });
    ouvrirFeuille(backdrop, () => resolve(reponse));
  });
}
