/* Le routeur : l'adresse (#) dit quelle vue dessiner, et d'où l'on vient pour que les flèches de retour ne mentent pas. */

import { save, state } from "../core/etat.js";
import { chargerFondamentaux, fondById, fondRenames, fondamentauxCharges } from "../core/fonds.js";
import { ICON } from "../core/icones.js";
import { versionDeRequete } from "../core/liens.js";
import { entreeCourante, entreeDe, setEntreeCourante } from "../core/menu.js";
import { byId } from "../core/recettes.js";
import { autoResumeStep } from "../core/seance.js";
import { rafraichirFoins, renderHome } from "../vues/accueil.js";
import { closeSheets } from "./feuilles.js";
import { stylesDejaPrets, stylesPrets } from "./styles.js";
import { updateBadge } from "./toast.js";

/* La zone où les vues se dessinent. */
export const app = document.getElementById("app");

/* Seul l'accueil est importé d'emblée : les autres vues ne se chargent qu'à la
   première visite de leur route, pour que le premier affichage ne paie pas ce
   qu'il n'utilise pas. Hors ligne, les modules viennent du cache du service
   worker. `modules` garde ceux qui sont arrivés : une vue déjà vue se dessine
   sans attendre un tour de plus, donc un redessin sur place reste immédiat. */
const chargeurs = {
  fiche: q => import("../vues/fiche.js" + q),
  cuisine: q => import("../vues/cuisine.js" + q),
  menu: q => import("../vues/menu.js" + q),
  courses: q => import("../vues/courses.js" + q),
  savoirs: q => import("../vues/savoirs.js" + q)
};
const modules = {};
/* Un import() échoué reste échoué pour la même adresse (le navigateur retient
   l'échec) : « Réessayer » doit donc demander une adresse neuve. Le service
   worker, lui, ignore la requête pour retrouver le module en cache. */
const echecs = {};
const charger = nom => (modules[nom]
  ? Promise.resolve(modules[nom])
  : chargeurs[nom](echecs[nom] ? `?essai=${echecs[nom]}` : "")
    .then(m => (modules[nom] = m), erreur => { echecs[nom] = (echecs[nom] || 0) + 1; throw erreur; }));

/* La place retrouvée. Le navigateur ne sait pas toujours rendre sa position à
   une page que l'on redessine (Safari, les PWA installées) : on coupe sa
   restauration et on la tient nous-mêmes.
   Chaque entrée de l'historique reçoit une clé dans son `state` ; revenir sur
   une entrée déjà vue (retour, avance, flèche) retrouve sa position. Les quatre
   onglets, eux, se retrouvent aussi par leur adresse : changer d'onglet puis
   revenir ramène là où l'on était. Une page où l'on arrive par un lien
   (entrée neuve, hors onglets) commence en haut.
   La mémoire survit à un rechargement via sessionStorage, sans quoi recharger
   renverrait en haut. */
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

const CLE_POSITIONS = "carnet-positions";
const ONGLETS = ["#/", "#/menu", "#/courses", "#/fondamentaux"];
const MAX_POSITIONS = 80;

let posEntrees = new Map(), posOnglets = new Map();
try {
  const lu = JSON.parse(sessionStorage.getItem(CLE_POSITIONS) || "{}");
  posEntrees = new Map(lu.entrees || []);
  posOnglets = new Map(lu.onglets || []);
} catch { /* sessionStorage absent ou illisible : on repart sans mémoire. */ }

function ecrirePositions() {
  try {
    // Une Map garde l'ordre d'insertion : on oublie les plus anciennes.
    while (posEntrees.size > MAX_POSITIONS) posEntrees.delete(posEntrees.keys().next().value);
    sessionStorage.setItem(CLE_POSITIONS, JSON.stringify({ entrees: [...posEntrees], onglets: [...posOnglets] }));
  } catch { /* quota ou mode privé : la mémoire reste celle de la page. */ }
}

let cleCourante = null;

/* La clé de l'entrée d'historique où l'on se trouve, posée au premier passage.
   `replaceState` sans adresse ne déclenche rien et ne touche pas à l'historique. */
function cleDeLEntree() {
  let cle = history.state && history.state.cle;
  if (!cle) {
    cle = Math.random().toString(36).slice(2, 9);
    try { history.replaceState({ ...history.state, cle }, ""); } catch { /* cette entrée commencera en haut. */ }
  }
  return cle;
}

const sansRequete = hash => hash.split("?")[0] || "#/";

/* D'où l'on vient. Sert aux flèches de retour : une flèche « ← Recettes » ne
   doit pas mentir. Elle revient vraiment en arrière quand c'est de là qu'on
   vient ; sinon elle remplace l'adresse courante — ce qui évite d'empiler un
   doublon et, sur un lien partagé ouvert directement, de faire sortir du site
   alors qu'il n'y a rien derrière. */
let courant = null, precedent = null, remplacement = false;

/* L'adresse précédente se lit par fonction : une variable exportée ne peut pas
   être réaffectée depuis un autre module, et seul le routeur doit la modifier. */
export const hashPrecedent = () => precedent;

/* Une fiche, de menu ou non. */
const RE_FICHE = /^#\/recette\/[^/]+(?:\/m\/[^/]+)?$/;

/* Chaque entrée de fiche retient sa provenance dans son `state`. La croix du
   mode cuisine revient d'un pas dans l'historique : le « précédent » serait
   alors le mode cuisine lui-même, et la fiche oublierait d'où l'on était venu.
   Lire la provenance dans l'entrée (et non dans la dernière adresse quittée)
   la rend aussi juste après un retour arrière ou un rechargement. */
function retrouverOrigine(adresse) {
  if (!RE_FICHE.test(adresse)) return;
  const origine = history.state && history.state.origine;
  if (typeof origine === "string") { precedent = origine; return; }
  try { history.replaceState({ ...history.state, origine: precedent || "" }, ""); } catch { /* la flèche retombera sur « Recettes ». */ }
}

/* Une adresse de connexion porte le mot de passe de synchro : elle ne doit
   laisser aucune trace, même dans la mémoire des positions. */
const estConnexion = hash => /^#\/connexion\//.test(hash);

/* Le mode cuisine réécrit l'adresse à chaque étape sans passer par le routeur
   (history.replaceState ne déclenche rien) : il la lui fait noter ici. */
export const noterAdresseCourante = () => { courant = location.hash; };

/* Remplacer, c'est effacer l'adresse courante sans toucher à celle d'avant :
   `hashPrecedent` ne doit donc pas bouger. */
export const allerEnRemplacant = hash => { remplacement = true; location.replace(hash); };

export function retourVers(hash) {
  if (precedent === hash) history.back();
  else allerEnRemplacant(hash);
}

/* L'onglet actif, pour l'œil (`active`) et pour les lecteurs d'écran
   (`aria-current`). */
function marquerOnglet(nom) {
  document.querySelectorAll(".tabbar a").forEach(a => {
    const actif = a.dataset.tab === nom;
    a.classList.toggle("active", actif);
    if (actif) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

/* Un lien partagé porte la version de la recette (`?p=8&c=…&a=…`) : elle
   s'applique au brouillon de la fiche, jamais au menu — ouvrir un lien ne doit
   pas modifier le repas en préparation. */
function appliquerVersion(r, requete) {
  const v = versionDeRequete(r, requete);
  if (!Object.keys(v).length) return;
  /* Le lien ne dit que l'écart aux valeurs par défaut : ce qu'il omet vaut le
     défaut. On repart donc d'un brouillon vierge, sans quoi un réglage resté
     d'une visite précédente fausserait la version reçue. */
  delete state.portions[r.id]; delete state.choices[r.id]; delete state.addons[r.id];
  if (v.portions != null) state.portions[r.id] = v.portions;
  if (v.choices) state.choices[r.id] = v.choices;
  if (v.addons) state.addons[r.id] = v.addons;
  save();
}

/* Un numéro par appel : si l'adresse change pendant qu'un module ou les
   fondamentaux arrivent, le dessin devenu inutile s'abandonne. */
let dessin = 0;
let premierAffichage = true;

/* Une fiche n'attend pas indéfiniment le plus gros fichier du carnet : au bout
   de ce délai elle s'affiche sans « Pourquoi ça marche », et se redessine à
   l'arrivée des fondamentaux si l'on n'y a rien touché entre-temps. */
const DELAI_FONDS = 2500;
let fondsAttendus = 0, touche = false;
for (const nom of ["pointerdown", "keydown", "input"]) document.addEventListener(nom, () => { touche = true; }, true);
document.addEventListener("fondamentaux-charges", () => {
  if (fondsAttendus && fondsAttendus === dessin && !touche) route({ garderDefilement: true });
});

/* Le fichier des fondamentaux est le plus lourd du carnet : il ne se charge
   qu'après le premier affichage, donc sans retarder l'accueil. Dès qu'il est
   arrivé, la recherche par mécanisme se remet à jour. */
function demarrerChargementFonds() {
  const lancer = () => chargerFondamentaux().then(rafraichirFoins, () => {});
  requestAnimationFrame(() => setTimeout(lancer, 0));
}

/* Une page honnête plutôt qu'un écran vide : hors ligne, sans le fichier ou le
   module en cache. */
function afficherIndisponible(message) {
  app.innerHTML = `
    <div class="topbar fade-in">
      <a class="btn-icon" href="#/" data-retour="#/">${ICON.back} Recettes</a>
    </div>
    <p class="empty">${message}<br>Vérifie ta connexion, puis réessaie.</p>
    <p class="empty"><button class="btn primary" id="fonds-reessayer">Réessayer</button></p>`;
  document.getElementById("fonds-reessayer").addEventListener("click", () => route({ garderDefilement: true }));
  // Le titre de la vue d'avant serait un mensonge devant cette page.
  document.title = "Page indisponible" + SUFFIXE_TITRE;
}

/* Les Savoirs attendent leurs données pour s'écrire : en attendant, un mot
   plutôt qu'une page blanche. */
function afficherAttenteSavoirs() {
  app.innerHTML = `
    <div class="topbar fade-in">
      <a class="btn-icon" href="#/" data-retour="#/">${ICON.back} Recettes</a>
    </div>
    <p class="empty" role="status">Les savoirs arrivent…</p>`;
  document.title = "Savoirs" + SUFFIXE_TITRE;
}

/* Le titre du document dit la vue, et le focus passe à son titre principal :
   sans cela le lecteur d'écran ne sait pas que la page a changé (le lien
   touché a disparu avec l'ancienne vue). Le focus ne se déplace que lorsqu'on
   arrive par un lien ; au retour arrière, la restauration de la place suffit. */
const SUFFIXE_TITRE = " – Carnet de cuisine";
function annoncerVue(titre, avecFocus, surPlace) {
  // Le minuteur qui sonne garde la place : son titre revient tout seul au bout de 5 s.
  if (!(surPlace && document.title.startsWith("⏰"))) document.title = titre + SUFFIXE_TITRE;
  const h1 = avecFocus && app.querySelector("h1");
  if (!h1) return;
  h1.setAttribute("tabindex", "-1");
  // Un titre n'est pas une commande : l'anneau de focus autour de lui n'apprend rien à l'œil.
  h1.style.outline = "none";
  h1.focus({ preventScroll: true });
}

/* `garderDefilement` redessine la vue courante sans revenir en haut : une
   action sur place (retirer un article, changer des portions) ne doit pas faire
   perdre sa position. Ce n'est pas une navigation, l'historique n'en est pas
   touché.
   Rend une promesse quand la vue doit attendre son module ou ses données ; une
   vue déjà chargée se dessine tout de suite, sans attendre. */
export function route({ garderDefilement = false } = {}) {
  const defilement = window.scrollY;
  if (modules.cuisine) modules.cuisine.stopCookMode();
  closeSheets();
  setEntreeCourante(null);
  const numero = ++dessin;
  let retrouve = 0, arrivee = false;
  if (!garderDefilement) {
    if (remplacement) remplacement = false;
    else precedent = courant;
    const cleNouvelle = cleDeLEntree();
    // Une entrée jamais vue : on y arrive par un lien (ni retour, ni avance, ni rechargement).
    arrivee = !posEntrees.has(cleNouvelle);
    // La position de la page que l'on quitte, avant que rien ne change.
    if (cleCourante) posEntrees.set(cleCourante, defilement);
    if (courant && !estConnexion(courant)) posOnglets.set(sansRequete(courant), defilement);
    courant = location.hash || "#/";
    cleCourante = cleNouvelle;
    retrouverOrigine(sansRequete(courant));
    const adresse = sansRequete(courant);
    retrouve = posEntrees.get(cleCourante) ?? (ONGLETS.includes(adresse) ? posOnglets.get(adresse) : 0) ?? 0;
    ecrirePositions();
  }
  const hash = location.hash;
  const q = hash.indexOf("?");
  const chemin = q < 0 ? hash : hash.slice(0, q), requete = q < 0 ? "" : hash.slice(q + 1);
  const parts = chemin.replace(/^#\/?/, "").split("/").filter(Boolean);
  // Un lien partagé avant un renommage doit continuer de tomber juste.
  if (parts[0] === "recette" && RECIPE_RENAMES[parts[1]]) {
    parts[1] = RECIPE_RENAMES[parts[1]];
    return allerEnRemplacant("#/" + parts.join("/") + (requete ? "?" + requete : ""));
  }
  // Paramètres inconnus ou invalides : ignorés. Dans tous les cas l'adresse est nettoyée.
  if (parts[0] === "recette" && requete) {
    const r = byId(parts[1]);
    if (r && parts[2] !== "m") appliquerVersion(r, requete);
    return allerEnRemplacant(chemin);
  }

  const dessiner = fondsOk => {
    let titre = "Recettes";
    if (parts[0] === "fondamental" && fondRenames()[parts[1]]) {
      return allerEnRemplacant(`#/fondamental/${fondRenames()[parts[1]]}`);
    }
    if (parts[0] === "fondamentaux" || (parts[0] === "fondamental" && (!fondsOk || fondById(parts[1])))) {
      marquerOnglet("fond");
      titre = parts[0] === "fondamental" && fondById(parts[1]) ? fondById(parts[1]).t : "Savoirs";
      if (!fondsOk) afficherIndisponible("Les fondamentaux ne se sont pas chargés.");
      else if (parts[0] === "fondamentaux") modules.savoirs.renderFondamentaux();
      else modules.savoirs.renderFondamental(fondById(parts[1]));
    } else if (parts[0] === "courses") {
      marquerOnglet("courses");
      titre = "Liste de courses";
      modules.courses.renderCourses();
    } else if (parts[0] === "menu") {
      marquerOnglet("menu");
      titre = "Au menu";
      modules.menu.renderMenu();
    } else if (parts[0] === "recette" && byId(parts[1])) {
      marquerOnglet("home");
      const r = byId(parts[1]);
      titre = r.title;
      /* `#/recette/<id>/m/<clé>` : on édite l'entrée de menu plutôt que le
         brouillon. Une entrée disparue — retirée du menu — retombe sur la fiche
         nue au lieu d'afficher une composition fantôme. */
      let reste = parts.slice(2);
      if (reste[0] === "m") {
        const e = entreeDe(reste[1]);
        if (!e || e.rid !== r.id) return allerEnRemplacant(`#/recette/${r.id}`);
        setEntreeCourante(e.k);
        reste = reste.slice(2);
      }
      const prefixe = entreeCourante() ? `#/recette/${r.id}/m/${entreeCourante()}` : `#/recette/${r.id}`;
      if (reste[0] === "cuisine") {
        titre = `Mode cuisine : ${r.title}`;
        modules.cuisine.renderCook(r, reste[1]);
      } else {
        const step = autoResumeStep(r);
        // `replace` : la fiche ne reste pas dans l'historique, la croix ramènera
        // d'où l'on vient au lieu de retomber ici et de repartir en boucle.
        if (step != null) return allerEnRemplacant(`${prefixe}/cuisine/${step}`);
        modules.fiche.renderRecipe(r);
      }
    } else {
      marquerOnglet("home");
      renderHome();
    }
    window.scrollTo(0, garderDefilement ? defilement : retrouve);
    updateBadge();
    // Un redessin sur place (« Réessayer » après une page indisponible, par exemple) rend aussi son titre à la vue ; `arrivee` n'y vaut jamais vrai : pas de focus déplacé.
    annoncerVue(titre, arrivee && !premierAffichage, garderDefilement);
    // Une fiche dessinée sans les fondamentaux se reprendra quand ils arriveront.
    touche = false;
    fondsAttendus = !fondsOk && parts[0] === "recette" ? numero : 0;
    if (premierAffichage) {
      premierAffichage = false;
      demarrerChargementFonds();
    }
  };

  /* Les modules dont la vue a besoin : le premier affichage de chaque route les
     charge, avec les feuilles de style qui ne bloquent pas l'accueil. */
  const recette = parts[0] === "recette" && byId(parts[1]);
  const noms = parts[0] === "fondamentaux" || parts[0] === "fondamental" ? ["savoirs"]
    : parts[0] === "courses" ? ["courses"]
    : parts[0] === "menu" ? ["menu"]
    : recette ? [parts[2] === "cuisine" || (parts[2] === "m" && parts[4] === "cuisine") ? "cuisine" : "fiche", "savoirs"]
    : [];
  /* « Pourquoi ça marche » et la feuille d'un savoir (fiche, mode cuisine) passent par
     savoirs.js : chargé avec la vue, il répond dès le premier appui, sans laisser filer
     la touche suivante pendant son import. */
  /* La fiche, le mode cuisine et les Savoirs en ont besoin pour s'écrire ;
     l'accueil, le menu et les courses s'en passent et s'affichent tout de suite. */
  const besoinFonds = parts[0] === "fondamentaux" || parts[0] === "fondamental" || recette;
  const fondsLa = !besoinFonds || fondamentauxCharges();
  if (fondsLa && noms.every(n => modules[n]) && (!noms.length || stylesDejaPrets())) return dessiner(true);

  if (besoinFonds && !fondsLa && !recette) afficherAttenteSavoirs();
  const fonds = fondsLa ? Promise.resolve(true) : chargerFondamentaux().then(() => true, () => false);
  const fondsOuDelai = recette && !fondsLa
    ? Promise.race([fonds, new Promise(fin => setTimeout(() => fin(false), DELAI_FONDS))])
    : fonds;
  const vue = Promise.all([...noms.map(charger), noms.length ? stylesPrets() : null]).then(() => true, () => false);
  return Promise.all([vue, fondsOuDelai]).then(([vueOk, fondsOk]) => {
    if (numero !== dessin) return;
    if (!vueOk) return afficherIndisponible("Cette page ne s'est pas chargée.");
    dessiner(fondsOk);
  });
}
