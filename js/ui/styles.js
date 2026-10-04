/* Les feuilles de style des vues hors accueil : index.html les charge sans
   bloquer le premier rendu (<link data-vue media="print" onload="this.media='all'">).
   Dessiner une vue avant qu'elles soient appliquées montrerait une page sans
   mise en forme, le temps d'un éclair : le routeur attend donc ici. */

const DELAI_MAX = 3000;

const liens = () => [...document.querySelectorAll("link[rel=stylesheet][data-vue]")];

/* Appliquée = chargée (`sheet`) et plus réservée à l'impression. Un lien sans
   `media` (feuille bloquante) compte aussi. */
const appliquee = lien => !!lien.sheet && (lien.media === "" || lien.media === "all");

let faites = false;

/* Vrai quand rien ne reste à attendre : le routeur dessine alors sans passer
   par une promesse, donc sans attendre un tour de plus. */
export function stylesDejaPrets() {
  if (!faites && liens().every(appliquee)) faites = true;
  return faites;
}

/* Résolue quand toutes les feuilles sont appliquées, ou au bout de 3 s : une
   feuille qui n'arrive pas (hors ligne, serveur lent) ne doit pas garder la
   page blanche, mal mise en forme vaut mieux que rien. */
export function stylesPrets() {
  if (stylesDejaPrets()) return Promise.resolve();
  return new Promise(resoudre => {
    const attendues = liens().filter(l => !appliquee(l));
    const enErreur = new Set();
    let minuteur = null;
    const verifier = () => {
      // Une feuille en erreur ne viendra jamais : inutile de l'attendre.
      if (!attendues.every(l => appliquee(l) || enErreur.has(l))) return;
      clearTimeout(minuteur);
      resoudre();
    };
    /* Le `onload` de la page, posé dans le HTML, passe avant cet écouteur : à
       son tour `media` vaut déjà « all ». */
    for (const l of attendues) {
      l.addEventListener("load", verifier);
      l.addEventListener("error", () => { enErreur.add(l); verifier(); });
    }
    minuteur = setTimeout(resoudre, DELAI_MAX);
  });
}
