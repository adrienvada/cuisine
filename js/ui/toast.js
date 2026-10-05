/* Le message qui apparaît quelques secondes en bas de l'écran, et les pastilles de nombre sur les onglets. Seul l'aiguillage du message et les pastilles sont ici, sur le chemin de l'accueil : le message lui-même (js/ui/toast-corps.js) et son mouvement (js/ui/toast-mouvement.js) se chargent après le premier affichage, ou au premier message. */

import { courseTodo } from "../core/courses.js";
import { state } from "../core/etat.js";

/* Un message qui propose un geste (« Annuler »…) détruit souvent des données, et
   il est le dernier élément de la page : au clavier, il serait à 30 tabulations,
   et il aurait disparu avant. On regarde donc comment le geste a été fait. */
let dernierClavier = 0;
// Sous Node (tests de partage.js, qui importe ce module), il n'y a pas de document.
if (typeof document !== "undefined") {
  document.addEventListener("keydown", () => { dernierClavier = Date.now(); }, true);
  document.addEventListener("pointerdown", () => { dernierClavier = 0; }, true);
}
const auClavier = () => !!dernierClavier && Date.now() - dernierClavier < 1500;

let corps = null, chargement = null;
const charger = () => (chargement ||= import("./toast-corps.js").then(m => { corps = m; }, () => {}));

/* toast(msg, { action, surAction, duree }) — voir toast-corps.js. Les messages arrivent dans
   l'ordre même si le module n'est pas encore là (le premier appel l'attend). */
export function toast(msg, options) {
  if (typeof document === "undefined") return;
  const clavier = auClavier();
  if (corps) corps.toast(msg, options, clavier);
  else charger().then(() => corps && corps.toast(msg, options, clavier));
}

/* Charge au repos le message et son mouvement ; rend une promesse (transitions.js l'attend). */
export const prechauffer = () => typeof document === "undefined" ? Promise.resolve() : charger().then(() => corps && corps.chargerMouvement());

function setBadge(id, n) {
  const b = document.getElementById(id);
  const M = corps && corps.mouvement();
  // Le premier affichage, et tout ce qui précède le chargement du mouvement : sans animation.
  if (M && b.dataset.pret) return M.badge(b, n);
  b.dataset.pret = "1";
  b.hidden = n === 0;
  b.textContent = n;
}

export function updateBadge() {
  setBadge("menu-badge", state.menu.length);
  setBadge("cart-badge", courseTodo());
}
