/* Le message qui apparaît quelques secondes en bas de l'écran, et les pastilles de nombre sur les onglets. */

import { courseTodo } from "../core/courses.js";
import { state } from "../core/etat.js";

/* `action` ajoute un bouton au message (« Annuler »…) : un appui appelle
   `surAction`, puis ferme le message. Sans option, le rendu est celui d'un simple
   message de 2,2 s. Un message qui propose un geste reste plus longtemps affiché :
   le temps de le lire et d'y viser. */
export function toast(msg, { action, surAction, duree } = {}) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  if (action) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "toast-action";
    b.textContent = action;
    b.addEventListener("click", () => {
      if (surAction) surAction();
      clearTimeout(toast._h);
      t.hidden = true;
    });
    t.appendChild(b);
  }
  t.hidden = false;
  clearTimeout(toast._h);
  toast._h = setTimeout(() => { t.hidden = true; }, duree ?? (action ? 5000 : 2200));
}

export function setBadge(id, n) {
  const b = document.getElementById(id);
  b.hidden = n === 0;
  b.textContent = n;
}

export function updateBadge() {
  setBadge("menu-badge", state.menu.length);
  setBadge("cart-badge", courseTodo());
}
