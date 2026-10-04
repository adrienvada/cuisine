/* Le routeur : l'adresse (#) dit quelle vue dessiner, et d'où l'on vient pour que les flèches de retour ne mentent pas. */

import { save, state } from "../core/etat.js";
import { chargerFondamentaux, fondById, fondRenames, fondamentauxCharges } from "../core/fonds.js";
import { ICON } from "../core/icones.js";
import { versionDeRequete } from "../core/liens.js";
import { entreeCourante, entreeDe, setEntreeCourante } from "../core/menu.js";
import { byId } from "../core/recettes.js";
import { autoResumeStep } from "../core/seance.js";
import { rafraichirFoins, renderHome } from "../vues/accueil.js";
import { renderCourses } from "../vues/courses.js";
import { renderCook, stopCookMode } from "../vues/cuisine.js";
import { renderRecipe } from "../vues/fiche.js";
import { renderMenu } from "../vues/menu.js";
import { renderFondamental, renderFondamentaux } from "../vues/savoirs.js";
import { closeSheets } from "./feuilles.js";
import { updateBadge } from "./toast.js";

/* La zone où les vues se dessinent. */
export const app = document.getElementById("app");

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

/* Les deux adresses se lisent par fonctions : une variable exportée ne peut pas
   être réaffectée depuis un autre module, et seul le routeur doit la modifier. */
export const hashCourant = () => courant;
export const hashPrecedent = () => precedent;

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

/* Un numéro par appel : si l'adresse change pendant que les fondamentaux
   arrivent, le dessin devenu inutile s'abandonne. */
let dessin = 0;
let premierAffichage = true;

/* Le fichier des fondamentaux est le plus lourd du carnet : il ne se charge
   qu'après le premier affichage, donc sans retarder l'accueil. Dès qu'il est
   arrivé, la recherche par mécanisme se remet à jour. */
function demarrerChargementFonds() {
  const lancer = () => chargerFondamentaux().then(rafraichirFoins, () => {});
  requestAnimationFrame(() => setTimeout(lancer, 0));
}

/* Hors ligne sans le fichier en cache : une page honnête plutôt qu'un écran vide. */
function afficherFondsIndisponibles() {
  app.innerHTML = `
    <div class="topbar fade-in">
      <a class="btn-icon" href="#/" data-retour="#/">${ICON.back} Recettes</a>
    </div>
    <p class="empty">Les fondamentaux ne se sont pas chargés.<br>Vérifie ta connexion, puis réessaie.</p>
    <p class="empty"><button class="btn primary" id="fonds-reessayer">Réessayer</button></p>`;
  document.getElementById("fonds-reessayer").addEventListener("click", () => route({ garderDefilement: true }));
}

/* `garderDefilement` redessine la vue courante sans revenir en haut : une
   action sur place (retirer un article, changer des portions) ne doit pas faire
   perdre sa position. Ce n'est pas une navigation, l'historique n'en est pas
   touché. */
export function route({ garderDefilement = false } = {}) {
  const defilement = window.scrollY;
  stopCookMode();
  closeSheets();
  setEntreeCourante(null);
  const numero = ++dessin;
  let retrouve = 0;
  if (!garderDefilement) {
    if (remplacement) remplacement = false;
    else precedent = courant;
    // La position de la page que l'on quitte, avant que rien ne change.
    if (cleCourante) posEntrees.set(cleCourante, defilement);
    if (courant) posOnglets.set(sansRequete(courant), defilement);
    courant = location.hash || "#/";
    cleCourante = cleDeLEntree();
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
    if (parts[0] === "fondamental" && fondRenames()[parts[1]]) {
      return allerEnRemplacant(`#/fondamental/${fondRenames()[parts[1]]}`);
    }
    if (parts[0] === "fondamentaux" || (parts[0] === "fondamental" && (!fondsOk || fondById(parts[1])))) {
      marquerOnglet("fond");
      if (!fondsOk) afficherFondsIndisponibles();
      else if (parts[0] === "fondamentaux") renderFondamentaux();
      else renderFondamental(fondById(parts[1]));
    } else if (parts[0] === "courses") {
      marquerOnglet("courses");
      renderCourses();
    } else if (parts[0] === "menu") {
      marquerOnglet("menu");
      renderMenu();
    } else if (parts[0] === "recette" && byId(parts[1])) {
      marquerOnglet("home");
      const r = byId(parts[1]);
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
      if (reste[0] === "cuisine") renderCook(r, reste[1]);
      else {
        const step = autoResumeStep(r);
        // `replace` : la fiche ne reste pas dans l'historique, la croix ramènera
        // d'où l'on vient au lieu de retomber ici et de repartir en boucle.
        if (step != null) return allerEnRemplacant(`${prefixe}/cuisine/${step}`);
        renderRecipe(r);
      }
    } else {
      marquerOnglet("home");
      renderHome();
    }
    window.scrollTo(0, garderDefilement ? defilement : retrouve);
    updateBadge();
    if (premierAffichage) {
      premierAffichage = false;
      demarrerChargementFonds();
    }
  };

  /* La fiche, le mode cuisine et les Savoirs en ont besoin pour s'écrire ;
     l'accueil, le menu et les courses s'en passent et s'affichent tout de suite. */
  const besoinFonds = parts[0] === "fondamentaux" || parts[0] === "fondamental"
    || (parts[0] === "recette" && byId(parts[1]));
  if (!besoinFonds || fondamentauxCharges()) return dessiner(true);
  chargerFondamentaux().then(() => true, () => false).then(ok => {
    // Sans le fichier, une fiche s'affiche quand même (sans « Pourquoi ça marche »).
    if (numero === dessin) dessiner(ok || parts[0] === "recette");
  });
}
