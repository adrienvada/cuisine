/* Le focus clavier à travers un redessin : les vues réécrivent leur innerHTML, et
   l'élément qu'on vient d'actionner disparaît avec — le focus tombait alors sur le
   body, et il fallait retraverser la page depuis le haut. */

/* Ce qui identifie un élément d'un dessin à l'autre : son id, sinon son nom de
   balise et tous ses data-* (data-deplacer + data-sens, data-share + data-share-k…). */
function cleDe(el) {
  if (el.id) return { selecteur: "#" + CSS.escape(el.id), famille: null };
  const attrs = [...el.attributes].filter(a => a.name.startsWith("data-"));
  if (!attrs.length) return null;
  const tag = el.localName;
  return {
    selecteur: tag + attrs.map(a => `[${a.name}="${CSS.escape(a.value)}"]`).join(""),
    // Les éléments de la même sorte (toutes les cases, tous les ✕) : le repli si celui-ci a disparu.
    famille: `${tag}[${attrs[0].name}]`
  };
}

/* Exécute `rendre` (qui réécrit `racine`) puis rend le focus à l'élément qui
   l'avait, retrouvé par sa clé. S'il a disparu (article parti au panier, carte
   retirée), le focus passe au voisin logique : celui qui a pris sa place dans la
   même famille, le dernier sinon. Un élément que le redessin désactive (le premier
   rayon qu'on vient de monter) laisse le focus à son frère actif. Si le focus était
   ailleurs que dans la vue (le bouton « Annuler » d'un toast), on n'y touche pas. */
export function garderFocus(racine, rendre) {
  const actif = document.activeElement;
  const concerne = actif && actif !== document.body && racine.contains(actif);
  const cle = concerne ? cleDe(actif) : null;
  let rang = -1;
  if (cle && cle.famille) rang = [...racine.querySelectorAll(cle.famille)].indexOf(actif);

  rendre();

  if (!concerne) return;
  /* Un volet <details> fermé garde des rectangles : checkVisibility sait qu'il ne se voit pas. */
  const pret = el => el && !el.disabled && (el.checkVisibility ? el.checkVisibility() : el.getClientRects().length > 0);
  let cible = cle ? racine.querySelector(cle.selecteur) : null;
  if (cible && !pret(cible)) {
    cible = [...cible.parentElement.querySelectorAll("button:not(:disabled), input:not(:disabled), a[href]")].find(pret) || null;
  }
  if (!cible && cle && cle.famille && rang >= 0) {
    const famille = [...racine.querySelectorAll(cle.famille)].filter(pret);
    cible = famille[Math.min(rang, famille.length - 1)] || null;
  }
  if (!cible) {
    // Plus rien de comparable : le titre de la vue, qui accepte le focus programmatique.
    cible = racine.querySelector("h1");
    if (cible && !cible.hasAttribute("tabindex")) cible.setAttribute("tabindex", "-1");
  }
  if (cible) cible.focus({ preventScroll: true });
}
