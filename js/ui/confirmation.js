/* La question à deux issues, sans confirm() : une feuille avec deux boutons. Chargé par
   feuilles.js à la première question (confirmer() rend une promesse, donc l'attente ne
   change rien pour l'appelant) : l'accueil n'en a pas besoin pour se dessiner. */

import { esc } from "../core/html.js";
import { fermerFeuille, ouvrirFeuille } from "./feuilles.js";
import { FEUILLE_REGLAGES, stylesDejaPrets, stylesPrets } from "./styles.js";

/* `detail` est du balisage déjà sûr (le résultat d'un html`…`) ; le titre et le
   texte sont échappés ici. La réponse arrive une fois la feuille retirée de la
   navigation, par quelque chemin qu'elle se soit fermée — le geste de retour vaut « non ». */
export async function confirmer({ titre, texte, detail = "", oui = "Confirmer", non = "Annuler", danger = false }) {
  // Son habillage (css/reglages-feuille.css) n'est pas dans la page de l'accueil : on l'attend.
  if (!stylesDejaPrets([FEUILLE_REGLAGES])) await stylesPrets([FEUILLE_REGLAGES]);
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
