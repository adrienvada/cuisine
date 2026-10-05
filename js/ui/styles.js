/* Les feuilles de style des vues hors accueil. Elles ne sont plus dans index.html :
   l'accueil n'en télécharge aucune pour s'afficher. Le routeur les demande avec le
   module de la vue (feuillesDes), et le carnet les tire au repos après le premier
   affichage (preparerFeuilles) pour que les navigations suivantes les trouvent déjà
   là. Leur repli sans JavaScript reste le <noscript> d'index.html.
   Dessiner une vue avant que ses feuilles soient appliquées montrerait une page sans
   mise en forme, le temps d'un éclair : le routeur attend donc ici. */

const DELAI_MAX = 3000;

/* L'ordre des <link> d'origine : la cascade ne doit pas dépendre de celle qui arrive
   la première. Chaque feuille ajoutée se range à sa place dans cet ordre. */
const ORDRE = ["polices", "base", "accueil", "fiche", "cuisine", "menu", "courses", "minuteurs", "savoirs", "figures", "journal", "reglages", "reglages-feuille"];
export const FEUILLES_DES_VUES = ["cuisine", "menu", "courses", "savoirs", "figures", "journal"];

/* Les feuilles qui ne sont pas celles d'une vue mais que l'accueil ne dessine pas non plus :
   la feuille des réglages (aussi celle de la question à deux issues, confirmer()) et la
   bascule de thème. Posée au repos comme les autres, attendue avant d'être ouverte. */
export const FEUILLE_REGLAGES = "reglages-feuille";

/* Ce qu'une vue dessine avec chaque module : la fiche écrit le journal du plat, le
   mode cuisine aussi (fin de recette), un savoir montre ses schémas (figures) partout où
   il s'ouvre, et la vue Menu emprunte les boutons d'action de la liste de courses. tests/e2e/v3-chemin-critique.spec.js vérifie dans le DOM qu'aucune
   feuille non demandée n'aurait servi. */
const PAR_MODULE = {
  fiche: ["savoirs", "figures", "journal"],
  cuisine: ["cuisine", "savoirs", "figures", "journal"],
  menu: ["menu", "courses"],
  courses: ["courses"],
  savoirs: ["savoirs", "figures"]
};

/* Les feuilles qu'il faut avoir pour dessiner ces modules, sans doublon. */
export const feuillesDes = noms => [...new Set(noms.flatMap(n => PAR_MODULE[n] || []))];

const liens = () => [...document.querySelectorAll("link[rel=stylesheet][data-vue]")];

const rang = href => ORDRE.indexOf((href.match(/([a-z-]+)\.css(?:\?.*)?$/) || [])[1]);

/* Le <link> de cette feuille, créé à sa place s'il n'existe pas encore. */
function lienDe(nom) {
  const href = `css/${nom}.css`;
  const existant = liens().find(l => l.getAttribute("href") === href);
  if (existant) return existant;
  const lien = document.createElement("link");
  lien.rel = "stylesheet";
  lien.href = href;
  lien.setAttribute("data-vue", "");
  const suivant = [...document.querySelectorAll("link[rel=stylesheet]")].find(l => rang(l.getAttribute("href") || "") > rang(href));
  if (suivant) suivant.before(lien);
  else document.head.append(lien);
  return lien;
}

/* Appliquée = chargée (`sheet`) et plus réservée à l'impression. Un lien sans
   `media` (feuille bloquante, ou ajoutée ici) compte aussi. */
const appliquee = lien => !!lien.sheet && (lien.media === "" || lien.media === "all");

/* Une feuille dont l'erreur est connue ne viendra jamais : on ne l'attend plus,
   ni cette fois ni aux navigations suivantes. */
const enErreur = new WeakSet();
const reglee = lien => appliquee(lien) || enErreur.has(lien);

/* Toutes les feuilles demandées sont-elles réglées ? Sans argument : toutes celles
   que la page porte déjà. */
const attendues = noms => (noms ? noms.map(lienDe) : liens());

let faites = false;

/* Vrai quand rien ne reste à attendre : le routeur dessine alors sans passer
   par une promesse, donc sans attendre un tour de plus. Une feuille encore absente de
   la page compte comme attendue (la demander est le rôle de stylesPrets). */
export function stylesDejaPrets(noms) {
  if (noms) {
    return noms.every(n => {
      const l = liens().find(x => x.getAttribute("href") === `css/${n}.css`);
      return l && reglee(l);
    });
  }
  if (!faites && liens().every(reglee)) faites = true;
  return faites;
}

/* Résolue quand toutes les feuilles sont appliquées, ou au bout de 3 s : une
   feuille qui n'arrive pas (hors ligne, serveur lent) ne doit pas garder la
   page blanche, mal mise en forme vaut mieux que rien. */
export function stylesPrets(noms) {
  if (!noms && stylesDejaPrets()) return Promise.resolve();
  const a_attendre = attendues(noms).filter(l => !reglee(l));
  if (!a_attendre.length) return Promise.resolve();
  return new Promise(resoudre => {
    let minuteur = null;
    const verifier = () => {
      if (!a_attendre.every(reglee)) return;
      clearTimeout(minuteur);
      if (!noms) faites = true;
      resoudre();
    };
    /* Le `onload` de la page, posé dans le HTML, passe avant cet écouteur : à
       son tour `media` vaut déjà « all ». */
    for (const l of a_attendre) {
      l.addEventListener("load", verifier);
      l.addEventListener("error", () => { enErreur.add(l); verifier(); });
    }
    /* Le délai épuisé ne se repaie pas à chaque navigation : une erreur passée
       avant que ce module écoute (le lien échoue pendant le chargement de la
       page) ferait sinon attendre 3 s devant chaque vue. */
    minuteur = setTimeout(() => {
      for (const l of a_attendre) enErreur.add(l);
      if (!noms) faites = true;
      resoudre();
    }, DELAI_MAX);
  });
}

/* Au repos, après le premier affichage : toutes les feuilles des vues se posent, sans
   que personne les attende, pour que la première visite de chaque vue ne paie plus
   leur téléchargement. Elles ne changent rien à l'accueil (aucune de leurs règles ne
   s'applique à lui). */
export function preparerFeuilles() {
  for (const nom of [...FEUILLES_DES_VUES, FEUILLE_REGLAGES]) lienDe(nom);
}
