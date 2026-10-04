/* Le routeur : l'adresse (#) dit quelle vue dessiner, et d'où l'on vient pour que les flèches de retour ne mentent pas. */

import { fondById } from "../core/fonds.js";
import { entreeCourante, entreeDe, setEntreeCourante } from "../core/menu.js";
import { byId } from "../core/recettes.js";
import { autoResumeStep } from "../core/seance.js";
import { renderHome } from "../vues/accueil.js";
import { renderCourses } from "../vues/courses.js";
import { renderCook, stopCookMode } from "../vues/cuisine.js";
import { renderRecipe } from "../vues/fiche.js";
import { renderMenu } from "../vues/menu.js";
import { renderFondamental, renderFondamentaux } from "../vues/savoirs.js";
import { closeSheets } from "./feuilles.js";
import { updateBadge } from "./toast.js";

/* La zone où les vues se dessinent. */
export const app = document.getElementById("app");

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

/* `garderDefilement` redessine la vue courante sans revenir en haut : une
   action sur place (retirer un article, changer des portions) ne doit pas faire
   perdre sa position. Ce n'est pas une navigation, l'historique n'en est pas
   touché. */
export function route({ garderDefilement = false } = {}) {
  const defilement = window.scrollY;
  stopCookMode();
  closeSheets();
  setEntreeCourante(null);
  if (!garderDefilement) {
    if (remplacement) remplacement = false;
    else precedent = courant;
    courant = location.hash || "#/";
  }
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  // Un lien partagé avant un renommage doit continuer de tomber juste.
  if (parts[0] === "recette" && RECIPE_RENAMES[parts[1]]) {
    parts[1] = RECIPE_RENAMES[parts[1]];
    return allerEnRemplacant("#/" + parts.join("/"));
  }
  if (parts[0] === "fondamental" && FONDAMENTAL_RENAMES[parts[1]]) {
    return allerEnRemplacant(`#/fondamental/${FONDAMENTAL_RENAMES[parts[1]]}`);
  }
  document.querySelectorAll(".tabbar a").forEach(a => a.classList.remove("active"));
  if (parts[0] === "fondamentaux") {
    document.querySelector('[data-tab="fond"]').classList.add("active");
    renderFondamentaux();
  } else if (parts[0] === "fondamental" && fondById(parts[1])) {
    document.querySelector('[data-tab="fond"]').classList.add("active");
    renderFondamental(fondById(parts[1]));
  } else if (parts[0] === "courses") {
    document.querySelector('[data-tab="courses"]').classList.add("active");
    renderCourses();
  } else if (parts[0] === "menu") {
    document.querySelector('[data-tab="menu"]').classList.add("active");
    renderMenu();
  } else if (parts[0] === "recette" && byId(parts[1])) {
    document.querySelector('[data-tab="home"]').classList.add("active");
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
    document.querySelector('[data-tab="home"]').classList.add("active");
    renderHome();
  }
  window.scrollTo(0, garderDefilement ? defilement : 0);
  updateBadge();
}
