/* Les scripts classiques (js/*.js qui déclarent une globale) que l'accueil n'utilise
   pas ne sont plus dans index.html : ils se chargent ici, au moment du besoin.
   · substitutions.js (SUBSTITUTIONS) : la feuille d'un ingrédient, dans la fiche.
   · sync-config.js (SYNC_CONFIG) : la synchro.
   Les autres (recipes, illos, saisons, placard, allergenes) servent à l'accueil
   lui-même, ou à un geste qu'on peut faire dès son premier affichage : ils restent
   dans index.html. tests/e2e/v3-chemin-critique.spec.js garde cette liste. */

const SCRIPTS_PAR_MODULE = { fiche: ["js/substitutions.js"] };

const charges = new Map();   // chemin → { promesse, pret }

/* Le script est-il déjà exécuté ? Le routeur dessine alors sans attendre un tour de plus. */
export const scriptCharge = chemin => charges.get(chemin)?.pret === true;

/* Les scripts qu'il faut avoir pour dessiner ces modules de vue. */
export const scriptsDes = noms => [...new Set(noms.flatMap(n => SCRIPTS_PAR_MODULE[n] || []))];

/* Un chargement échoué n'est pas retenu : « Réessayer » le redemande. */
export function chargerScript(chemin) {
  const connu = charges.get(chemin);
  if (connu) return connu.promesse;
  const entree = { pret: false, promesse: null };
  entree.promesse = new Promise((resoudre, rejeter) => {
    const s = document.createElement("script");
    s.src = chemin;
    s.onload = () => { entree.pret = true; resoudre(); };
    s.onerror = () => { charges.delete(chemin); s.remove(); rejeter(new Error(`${chemin} ne s'est pas chargé`)); };
    document.head.append(s);
  });
  charges.set(chemin, entree);
  return entree.promesse;
}

/* La synchro : sa configuration d'abord (sync.js la lit à son évaluation), puis le module.
   Sans configuration (hors ligne, fichier absent), sync.js se déclare indisponible. */
export const chargerSync = () => chargerScript("js/sync-config.js").catch(() => {}).then(() => import("../sync.js"));
