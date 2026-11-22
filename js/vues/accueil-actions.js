/* Le menu d'une recette, ouvert par un appui long sur sa vignette (ou un clic droit) :
   ajouter au menu ou l'en retirer, cuisiner tout de suite, coup de cœur, partager,
   supprimer du carnet. Chargé au premier appui : l'accueil n'en a pas besoin pour
   se dessiner.

   Chaque action agit tout de suite et se défait par le « Annuler » de son message,
   plutôt que par une question préalable : supprimer une recette n'efface que sa
   présence dans le carnet (voir estMasquee, core/recettes.js), les réglages la
   remettent aussi. */

import { save, state } from "../core/etat.js";
import { esc } from "../core/html.js";
import { ICON } from "../core/icones.js";
import { ajouterAuMenu, entreesDe, remettreAuMenu, retirerDuMenu } from "../core/menu.js";
import { nomCourt } from "../core/planning.js";
import { FAV_FILTER, byCategoryOrder, byId, demasquer, estMasquee, isFav, masquer, recettesDuCarnet, totalTimeText } from "../core/recettes.js";
import { fermerFeuille, ouvrirFeuille } from "../ui/feuilles.js";
import { vibrer } from "../ui/geste.js";
import { shareRecipe } from "../ui/partage.js";
import { FEUILLE_REGLAGES, stylesDejaPrets, stylesPrets } from "../ui/styles.js";
import { toast, updateBadge } from "../ui/toast.js";
import { visuel } from "../ui/visuel.js";
import { refiltrer, tagrowHtml } from "./accueil.js";

const SVG = corps => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${corps}</svg>`;
const ICONES = {
  ajouter: SVG('<path d="M12 5v14M5 12h14"/>'),
  retirer: SVG('<path d="M5 12h14"/>'),
  coeur: SVG('<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'),
  coeurPlein: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
  corbeille: SVG('<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>'),
  remettre: SVG('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>')
};

/* Les actions, selon l'état de la recette. `id` sert au clic, `danger` les met à part. */
function actionsDe(r) {
  const auMenu = entreesDe(r.id).length;
  const liste = [];
  if (estMasquee(r)) {
    liste.push({ id: "remettre", icone: ICONES.remettre, label: "Remettre dans le carnet" });
    return liste;
  }
  liste.push(auMenu
    ? { id: "ajouter", icone: ICONES.ajouter, label: "Ajouter une autre version au menu", note: auMenu > 1 ? `${auMenu} versions déjà au menu` : "Déjà au menu" }
    : { id: "ajouter", icone: ICONES.ajouter, label: "Ajouter au menu" });
  if (auMenu) liste.push({ id: "retirer", icone: ICONES.retirer, label: auMenu > 1 ? "Retirer toutes ses versions du menu" : "Retirer du menu" });
  liste.push({ id: "cuisiner", icone: ICON.chef, label: "Cuisiner maintenant", note: "Ouvre le mode cuisine pas à pas" });
  liste.push(isFav(r)
    ? { id: "coeur", icone: ICONES.coeurPlein, label: "Retirer des coups de cœur", coeur: true }
    : { id: "coeur", icone: ICONES.coeur, label: "Ajouter aux coups de cœur" });
  liste.push({ id: "partager", icone: ICON.share, label: "Partager" });
  liste.push({ id: "supprimer", icone: ICONES.corbeille, label: "Supprimer du carnet", note: "Tu pourras la remettre depuis les réglages", danger: true });
  return liste;
}

/* Après une action (ou son « Annuler »), et quand les réglages remettent une recette :
   l'accueil suit. Les puces de catégorie ne se redessinent que si leur liste change
   (une catégorie vidée, le premier coup de cœur), la vignette reprend son cœur et
   son compteur, la grille se recompose avec son mouvement. */
export function rafraichirAccueil() {
  const grid = document.getElementById("grid");
  if (!grid) return;
  const carnet = recettesDuCarnet();
  const voulues = ["Toutes", ...(carnet.some(isFav) ? [FAV_FILTER] : []), ...[...new Set(carnet.map(r => r.category))].sort(byCategoryOrder)];
  if (!voulues.includes(state.filter)) { state.filter = "Toutes"; save(); }
  const chips = document.getElementById("chips");
  if (voulues.join("|") !== [...chips.querySelectorAll(".chip")].map(b => b.dataset.cat).join("|")) {
    chips.innerHTML = voulues.map(c => `<button class="chip ${state.filter === c ? "on" : ""}" data-cat="${esc(c)}" aria-pressed="${state.filter === c}">${c === FAV_FILTER ? "♥ Coups de cœur" : esc(c)}</button>`).join("");
  }
  for (const carte of grid.querySelectorAll(".card")) {
    const r = byId(carte.dataset.id);
    if (!r) continue;
    carte.querySelector(".tagrow")?.remove();
    carte.querySelector(".body h3").insertAdjacentHTML("afterend", tagrowHtml(r));
  }
  refiltrer();
}

/* Le doigt qui se lève après un appui long ne doit pas ouvrir la recette : le clic qui
   suit (sur la carte, ou sur ce qui est passé dessous) est avalé. */
function avalerProchainClic() {
  const avaler = e => { e.stopPropagation(); e.preventDefault(); };
  document.addEventListener("click", avaler, { capture: true, once: true });
  setTimeout(() => document.removeEventListener("click", avaler, { capture: true }), 700);
}

/* ouvrirActions(id, appuiLong) — appelé par l'accueil (js/vues/accueil.js) : après un
   appui long au doigt (`appuiLong`), ou sur l'événement contextmenu (clic droit, touche
   « menu », appui long d'Android, qui suit le nôtre et ne doit pas rouvrir la feuille). */
let derniere = 0;
export async function ouvrirActions(id, appuiLong = false, surChangement = rafraichirAccueil) {
  const r = byId(id);
  if (!r || Date.now() - derniere < 800) return;
  derniere = Date.now();
  if (appuiLong) avalerProchainClic();
  vibrer("tic");
  // Son habillage est celui des réglages (css/reglages-feuille.css), absent de la page de l'accueil.
  if (!stylesDejaPrets([FEUILLE_REGLAGES])) await stylesPrets([FEUILLE_REGLAGES]);
  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop";
  backdrop.innerHTML = `
    <div class="sheet actions-sheet" role="dialog" aria-modal="true" aria-labelledby="act-titre">
      <div class="sheet-grip"></div>
      <div class="act-tete">
        <div class="act-photo" style="--c:${r.color}22" aria-hidden="true">${visuel(r, { genre: "carre" })}</div>
        <div class="act-txt">
          <h3 id="act-titre">${esc(r.title)}</h3>
          <p class="sheet-sub">${esc(r.category)} · ${esc(totalTimeText(r))}</p>
        </div>
      </div>
      <ul class="act-liste" role="list">
        ${actionsDe(r).map(a => `
          <li${a.danger ? ` class="act-sep"` : ""}><button type="button" class="act-btn${a.danger ? " act-danger" : ""}${a.coeur ? " act-coeur" : ""}" data-action="${a.id}">
            <span class="act-ico">${a.icone}</span>
            <span class="act-lib">${esc(a.label)}${a.note ? `<span class="act-note">${esc(a.note)}</span>` : ""}</span>
          </button></li>`).join("")}
      </ul>
    </div>`;

  /* Certaines actions vont ailleurs (le mode cuisine) : elles partent une fois la
     feuille refermée, sans quoi le retour qui la ferme annulerait la navigation. */
  let ensuite = null;
  backdrop.addEventListener("click", e => {
    if (e.target === backdrop) return fermerFeuille();
    const b = e.target.closest("[data-action]");
    if (!b) return;
    const action = b.dataset.action;
    if (action === "partager") {
      // navigator.share veut le geste lui-même : pas après la fermeture.
      shareRecipe(r.id);
    } else if (action === "cuisiner") {
      ensuite = () => { location.hash = `#/recette/${r.id}/cuisine`; };
    } else {
      ensuite = () => FAIRE[action]?.(r, surChangement);
    }
    fermerFeuille();
  });
  ouvrirFeuille(backdrop, () => {
    const suite = ensuite;
    ensuite = null;
    if (suite) suite();
  });
}

const FAIRE = {
  ajouter(r, surChangement) {
    const e = ajouterAuMenu(r.id);
    // Comme depuis la fiche : le brouillon est désormais dans l'entrée, il repart à neuf.
    const brouillon = { choices: state.choices[r.id], addons: state.addons[r.id], portions: state.portions[r.id] };
    delete state.choices[r.id]; delete state.addons[r.id]; delete state.portions[r.id];
    save();
    updateBadge();
    vibrer("tic");
    toast(`Au menu : ${nomCourt(r.title)}`, { action: "Annuler", surAction: () => {
      if (!retirerDuMenu(e.k)) return;
      for (const [champ, v] of Object.entries(brouillon)) if (v !== undefined && state[champ][r.id] === undefined) state[champ][r.id] = v;
      save();
      updateBadge();
      surChangement();
    } });
    surChangement();
  },

  /* Les versions partent de la dernière à la première : chacune retient ainsi sa
     place d'origine, et « Annuler » les remet dans l'ordre inverse. */
  retirer(r, surChangement) {
    const retirees = entreesDe(r.id)
      .map(e => ({ k: e.k, i: state.menu.indexOf(e) }))
      .sort((a, b) => b.i - a.i)
      .map(({ k }) => retirerDuMenu(k))
      .filter(Boolean);
    if (!retirees.length) return;
    updateBadge();
    vibrer("tic");
    toast(retirees.length > 1 ? "Ses versions sont retirées du menu" : "Retiré du menu", { action: "Annuler", surAction: () => {
      for (const x of [...retirees].reverse()) remettreAuMenu(x);
      updateBadge();
      surChangement();
    } });
    surChangement();
  },

  coeur(r, surChangement) {
    const activer = !isFav(r);
    if (activer) state.notes[r.id] = "encore";
    else delete state.notes[r.id];
    save();
    vibrer("tic");
    toast(activer ? "Un coup de cœur de plus ♥" : "Coup de cœur retiré");
    surChangement();
  },

  supprimer(r, surChangement) {
    masquer(r.id);
    vibrer("tic");
    toast("Recette supprimée du carnet", { action: "Annuler", surAction: () => {
      demasquer(r.id);
      surChangement();
    } });
    surChangement();
  },

  remettre(r, surChangement) {
    demasquer(r.id);
    vibrer("tic");
    toast("Recette remise dans le carnet");
    surChangement();
  }
};
