/* Un nombre qui change sous les yeux (portions, convives) : le chiffre roule, le mot qui le suit (« personnes », « convive ») ne bouge pas. Partagé par la fiche et le menu. */

import { typo } from "../core/format.js";
import { esc } from "../core/html.js";
import { rouler } from "./mouvement.js";

/* « 6 personnes » → le nombre est enveloppé dans <span class="nb">. Le texte de
   l'élément reste « 6 personnes », une seule fois : c'est lui que lit un lecteur d'écran. */
export const nombreHtml = texte => esc(String(texte)).replace(/^(\d+)/, '<span class="nb">$1</span>');

const decouper = texte => {
  // La typographie du DOM (js/ui/typo.js) a déjà passé : on compare ce qu'elle a écrit.
  const m = /^(\d+)([\s\S]*)$/.exec(typo(String(texte)));
  return m ? { nb: m[1], suite: m[2] } : null;
};

/* Écrit `texte` dans `el` (un élément dont le contenu vient de nombreHtml). Le chiffre
   roule dans le sens du changement quand il change ; si la forme change (plus de
   chiffre, élément neuf), le texte est simplement remplacé. */
export function changerNombre(el, texte) {
  const d = decouper(texte);
  const nb = el.querySelector(":scope > .nb");
  if (!d || !nb) {
    el.innerHTML = nombreHtml(texte);
    return Promise.resolve(true);
  }
  const suite = nb.nextSibling;
  if (suite?.nodeType === Node.TEXT_NODE) {
    if (suite.data !== d.suite) suite.data = d.suite;
  } else {
    nb.after(document.createTextNode(d.suite));
  }
  return rouler(nb, d.nb);
}

/* Après un redessin complet de la vue, l'élément neuf porte déjà la nouvelle valeur :
   on le remet sur l'ancienne le temps d'un instant (aucun affichage entre les deux, tout
   se passe dans la même tâche), puis le chiffre roule jusqu'à la nouvelle. */
export function rejouerNombre(el, ancien) {
  const d = decouper(ancien);
  const nb = el?.querySelector(":scope > .nb");
  if (!d || !nb || nb.textContent === d.nb) return Promise.resolve(true);
  const nouveau = nb.textContent;
  nb.textContent = d.nb;
  return rouler(nb, nouveau);
}
