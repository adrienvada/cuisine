/* La typographie française sur tout ce qui s'affiche : une passe sur les nœuds texte
   du DOM plutôt qu'un correctif chaîne par chaîne, qui en oublierait toujours une.
   Un MutationObserver corrige ce qui est ajouté ou modifié (rendu d'une vue, tic d'un
   minuteur) avant la peinture ; typo() étant idempotente, réécrire un nœud déjà
   correct ne change rien et ne relance pas l'observateur. */

import { typo } from "../core/format.js";

/* Là où le texte n'est pas du texte lu : code, saisie en cours. */
const IGNORES = "script, style, textarea, input, [contenteditable]:not([contenteditable=false])";

function corrigerNoeud(noeud) {
  const parent = noeud.parentElement;
  if (!parent || parent.closest(IGNORES)) return;
  const avant = noeud.nodeValue;
  if (!avant) return;
  /* Un nœud qui commence par une espace prolonge peut-être « 15 » ou « Pour »
     écrit juste avant, dans une autre balise : on lui prête ce dernier caractère. */
  let contexte = "";
  if (/^[   ]/.test(avant)) {
    const prec = noeud.previousSibling;
    contexte = prec ? (prec.textContent || "").slice(-1) : "";
    if (/\s/.test(contexte)) contexte = "";
  }
  const apres = contexte ? typo(contexte + avant).slice(contexte.length) : typo(avant);
  if (apres !== avant) noeud.nodeValue = apres;
}

function corrigerArbre(racine) {
  if (racine.nodeType === Node.TEXT_NODE) return corrigerNoeud(racine);
  if (racine.nodeType !== Node.ELEMENT_NODE) return;
  const marcheur = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT);
  for (let n = marcheur.nextNode(); n; n = marcheur.nextNode()) corrigerNoeud(n);
}

const ATTRIBUTS = ["placeholder", "title"];

function corrigerAttributs(el) {
  for (const a of ATTRIBUTS) {
    const v = el.getAttribute?.(a);
    if (v) {
      const t = typo(v);
      if (t !== v) el.setAttribute(a, t);
    }
  }
}

export function installerTypo(racine = document.body) {
  corrigerArbre(racine);
  racine.querySelectorAll("[placeholder], [title]").forEach(corrigerAttributs);
  const observateur = new MutationObserver(lot => {
    for (const m of lot) {
      if (m.type === "characterData") corrigerNoeud(m.target);
      else if (m.type === "attributes") corrigerAttributs(m.target);
      else {
        m.addedNodes.forEach(n => {
          corrigerArbre(n);
          if (n.nodeType === Node.ELEMENT_NODE) {
            corrigerAttributs(n);
            n.querySelectorAll("[placeholder], [title]").forEach(corrigerAttributs);
          }
        });
      }
    }
  });
  observateur.observe(racine, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTS });
  return observateur;
}
