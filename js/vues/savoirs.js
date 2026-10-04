/* L'onglet Savoirs : le catalogue des fondamentaux, leur page, leur feuille et l'astuce qui y renvoie. */

import { state } from "../core/etat.js";
import { CERTITUDES, figuresDe, fondById, fondMatches, fondsDe, fondsTous, recettesDuFond } from "../core/fonds.js";
import { html, raw } from "../core/html.js";
import { ICON } from "../core/icones.js";
import { fermerFeuille, ouvrirFeuille } from "../ui/feuilles.js";
import { figureHtml, figuresA, nombreFr, observerFigures, thermometreHtml, thermometreMise } from "../ui/figures.js";
import { shareFond } from "../ui/partage.js";
import { app } from "../ui/routeur.js";

/* Encadré d'astuce, façon livre de cuisine (toque ou plume selon le titre) */
/* Deux registres : l'astuce du chef (toque verte) et le repère à savoir (plume
   dorée). Le champ `k` le dit explicitement — auparavant on le devinait du titre
   à l'expression régulière, si bien que renommer une astuce changeait son
   apparence en silence. */
function tipHtml(tip, savoirs = "") {
  const savoir = tip.k === "savoir";
  return `<div class="tip ${savoir ? "beige" : ""}${savoirs ? " a-savoirs" : ""}">
    <span class="tip-ico">${savoir ? ILLO.D.plume : ILLO.D.toque}</span>
    <div class="tip-body"><b>${tip.t}</b>${tip.txt}${savoirs}</div>
  </div>`;
}

/* Le savoir se découvre en touchant l'astuce, il ne s'impose pas. Une pastille
   permanente sous chaque astuce prenait autant de place que l'astuce elle-même
   et alourdissait la lecture d'une étape. L'appel est donc une simple ligne,
   dans l'encre du titre de l'astuce, et l'appui ne fait que RÉVÉLER le lien —
   il n'ouvre rien. Un doigt posé par mégarde en cuisinant ne coûte donc pas
   une lecture qu'on n'a pas demandée, seulement une ligne à replier.
   L'appel et les liens sont de vrais boutons : le clavier et les lecteurs
   d'écran les atteignent (Tab), les déplient et les ouvrent (Entrée, Espace)
   sans rien de plus que ce que le navigateur fournit déjà. */
let compteurAppels = 0;
export const savoirsHtml = o => {
  const list = fondsDe(o);
  if (!list.length) return "";
  /* Un identifiant par appel : aria-controls doit viser la liste de CET appel,
     et plusieurs étapes d'une même page portent chacune le leur. */
  const id = "s-liste-" + (++compteurAppels);
  return html`<div class="savoirs">
    <button type="button" class="s-cue" aria-expanded="false" aria-controls="${id}">Pourquoi ça marche${raw(ICON.chev)}</button>
    <div class="s-liste" id="${id}">${list.map(f =>
      raw(html`<button type="button" class="s-lien" data-fond="${f.id}"><span class="s-emoji">${f.emoji}</span>${f.t}${raw(ICON.chev)}</button>`))}</div>
  </div>`;
};

/* Déplie ou replie l'appel d'un encadré, et garde aria-expanded d'accord avec
   la classe qui, elle, commande l'affichage. Appelée par l'écouteur délégué de
   main.js, que le geste vienne du bouton ou de l'astuce entière. */
export function basculerSavoirs(porteur) {
  const ouvert = porteur.classList.toggle("ouvert");
  porteur.querySelectorAll(".s-cue").forEach(b => b.setAttribute("aria-expanded", String(ouvert)));
}

/* L'astuce reste ce qu'elle est ; l'appel au savoir se glisse à sa suite, dans
   le même encadré. Une étape qui met un mécanisme en jeu sans avoir d'astuce —
   il y en a treize — porte la ligne seule. */
export const astuceHtml = s => {
  const sav = savoirsHtml(s);
  if (s.tip) return tipHtml(s.tip, sav);
  return sav ? `<div class="savoirs-seuls a-savoirs">${sav}</div>` : "";
};

/* Corps d'un fondamental — le même dans la feuille et dans la page partagée :
   deux contenants, une seule vérité. `niveau` est celui des intertitres : 4 sous le
   h3 de la feuille, 2 sous le h1 de la page — la hiérarchie ne saute jamais. */
function fondBodyHtml(f, niveau = 4) {
  const c = CERTITUDES[f.certitude] || CERTITUDES.partiel;
  const recettes = recettesDuFond(f.id);
  /* Les schémas de js/figures.js, s'il est arrivé : chacun dit où il se place
     (tete, cas, reperes, pourquoi + apres). Sans le fichier, `figures` est vide
     et la fiche est exactement celle d'avant. */
  const figures = figuresDe(f.id);
  const ici = (ou, opts) => figuresA(figures, f.id, ou, opts);
  const paragraphes = f.pourquoi.split("\n\n");
  /* L'ordre n'est pas cosmétique : on ouvre cette feuille une casserole sur le
     feu. Ce qu'on fait vient donc avant pourquoi ça marche — la science reste
     entière, une longueur de pouce plus bas. */
  return `
    <p class="f-accroche">${f.accroche}</p>
    ${ici("tete")}
    ${f.cas && f.cas.length ? `<div class="f-bloc">
      <h${niveau}>Selon les cas</h${niveau}>
      <dl class="f-cas">${f.cas.map(x => `<dt>${x.q}</dt><dd>${x.r}</dd>`).join("")}</dl>
    </div>` : ""}
    ${ici("cas")}
    ${f.reperes && f.reperes.length ? `<div class="f-bloc">
      <h${niveau}>À retenir</h${niveau}>
      <ul class="f-rep">${f.reperes.map(x => `<li>${x}</li>`).join("")}</ul>
      ${ici("reperes")}
    </div>` : ici("reperes")}
    <div class="f-bloc">
      <h${niveau}>Pourquoi ça marche</h${niveau}>
      <span class="f-cert f-cert-${f.certitude}">${c.l}</span>
      ${paragraphes.map((p, i) => `<p>${p}</p>${ici("pourquoi", { k: i + 1, nbParagraphes: paragraphes.length })}`).join("")}
      ${f.certitude !== "etabli" ? `<p class="f-cert-note">${c.d}</p>` : ""}
    </div>
    ${f.piege ? `<div class="f-piege"><b>L'erreur classique</b>${f.piege}</div>` : ""}
    ${recettes.length ? `<div class="f-bloc">
      <h${niveau}>Dans le carnet</h${niveau}>
      <div class="f-recettes">${recettes.map(r =>
        `<a class="f-rec" href="#/recette/${r.id}"><span>${r.emoji}</span>${r.title}</a>`).join("")}</div>
    </div>` : `<p class="f-orphelin">Dans aucune recette pour l'instant.</p>`}
    ${f.source ? `<p class="f-source">${f.source}</p>` : ""}`;
}

/* Le zoom d'une figure : la même figure, redessinée depuis les données dans une
   feuille plus haute, où elle défile si l'écran est plus étroit qu'elle. Une
   feuille comme les autres : Échap, le geste de retour et le focus sont ceux de
   js/ui/feuilles.js. */
export function ouvrirFigure(fondId, i) {
  const fig = figuresDe(fondId)[i];
  if (!fig) return;
  const rendu = figureHtml(fig, { fond: fondId, i, zoom: true });
  if (!rendu) return;
  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop fg-zoom";
  backdrop.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${html`${fig.titre || "Schéma"}`}">
      <div class="sheet-grip"></div>
      <div class="fg-zoom-corps">${rendu}</div>
      <button type="button" class="btn secondary f-close" id="fg-close">Fermer</button>
    </div>`;
  backdrop.addEventListener("click", e => {
    if (e.target === backdrop || e.target.closest("#fg-close")) fermerFeuille();
  });
  ouvrirFeuille(backdrop);
}

/* Un appui sur le cadre d'une figure (le dessin ou le bouton d'agrandissement)
   l'ouvre. Un seul écouteur délégué : les figures vivent dans la page et dans la
   feuille d'un savoir, qui se redessinent. */
document.addEventListener("click", e => {
  const cadre = e.target.closest(".fg:not(.fg-zoomee) .fg-cadre");
  const bouton = cadre && cadre.querySelector("[data-fg-zoom]");
  if (bouton) ouvrirFigure(bouton.dataset.fgFond, Number(bouton.dataset.fgI));
});

/* Ouverture par-dessus l'endroit où l'on se trouve : aucune adresse ne change,
   donc `route()` n'est pas rappelée — le mode cuisine garde son étape, son
   réveil d'écran et sa position de lecture. Même parti pris que la feuille
   d'ajout au menu, et pour les mêmes raisons. */
export function openFondSheet(id) {
  const f = fondById(id);
  if (!f) return;
  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop fond-sheet";
  backdrop.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${f.t}">
      <div class="sheet-grip"></div>
      <div class="f-top">
        <h3><span class="f-emoji">${f.emoji}</span>${f.t}</h3>
        <button type="button" class="f-share" id="f-share" aria-label="Partager ce fondamental">${ICON.share}</button>
      </div>
      ${fondBodyHtml(f)}
      <button type="button" class="btn secondary f-close" id="f-close">Fermer</button>
    </div>`;
  /* Un lien vers une recette ne navigue pas tout de suite : on dépile d'abord
     l'entrée de la feuille, sinon les deux gestes se croisent et l'un annule
     l'autre. La navigation se fait donc une fois la feuille retirée. */
  let ensuite = null;
  backdrop.addEventListener("click", e => {
    if (e.target === backdrop || e.target.closest("#f-close")) return fermerFeuille();
    if (e.target.closest("#f-share")) return shareFond(f.id);
    const lien = e.target.closest("a[href]");
    if (lien) {
      e.preventDefault();
      const cible = lien.getAttribute("href");
      ensuite = () => { location.hash = cible; };
      fermerFeuille();
    }
  });
  /* Échap, Tab et le retour du focus à la fermeture : js/ui/feuilles.js. */
  ouvrirFeuille(backdrop, () => {
    if (ensuite) { const aller = ensuite; ensuite = null; aller(); }
  });
  observerFigures(backdrop);
}

/* La liste seule : c'est tout ce qui change quand on tape. */
function listeFondamentaux(q) {
  const trouves = fondsTous().filter(f => fondMatches(f, q));
  const familles = FAMILLES.filter(fam => trouves.some(f => f.famille === fam));
  /* Une famille inconnue ne disparaît pas en silence : elle passe en fin de liste. */
  const autres = [...new Set(trouves.map(f => f.famille))].filter(fam => !FAMILLES.includes(fam));
  return html`${trouves.length ? [...familles, ...autres].map(fam => raw(html`
      <section class="f-fam">
        <h2>${fam}</h2>
        <div class="f-liste">
          ${trouves.filter(f => f.famille === fam).map(f => {
            const n = recettesDuFond(f.id).length;
            const nf = figuresDe(f.id).length;
            return raw(html`<a class="f-item" href="#/fondamental/${f.id}">
              <span class="f-item-emoji">${f.emoji}</span>
              <span class="f-item-txt">
                <b>${f.t}</b>
                <small>${f.accroche}</small>
                <span class="f-item-bas">
                  <span class="f-item-meta">${n ? `${n} recette${n > 1 ? "s" : ""}` : "Dans aucune recette pour l'instant"}</span>
                  ${nf ? raw(html`<span class="f-item-fig">${nf} schéma${nf > 1 ? "s" : ""}</span>`) : ""}
                </span>
              </span>
              ${raw(ICON.chev)}
            </a>`);
          })}
        </div>
      </section>`)) : raw(html`<p class="empty">Aucun savoir ne correspond à « ${q} ».</p>`)}
    <p class="f-compte">${fondsTous().length} ${fondsTous().length > 1 ? "fondamentaux" : "fondamental"} dans le carnet.</p>`;
}

/* Le thermomètre du carnet : une figure transversale qui rassemble les températures
   des fiches (THERMOMETRE, en fin de js/figures.js — un bonus, comme les autres
   figures : sans le fichier, l'encart n'existe pas). Il se dessine à la première
   ouverture et se souvient, le temps de la session, d'être ouvert ou fermé. */
let thermoOuvert = false;
const donneesThermo = () => (typeof THERMOMETRE !== "undefined" && Array.isArray(THERMOMETRE) ? THERMOMETRE : []);
const titreDeFond = id => (fondById(id) || {}).t || null;

function encartThermometre(masque) {
  const mise = thermometreMise(donneesThermo(), { titreDe: titreDeFond });
  if (!mise) return "";
  const fiches = new Set(mise.items.map(r => r.fond)).size;
  const NBSP = " ";
  return `<details class="th-encart" id="f-thermo"${thermoOuvert ? " open" : ""}${masque ? " hidden" : ""}>
    <summary>
      <span class="th-ico" aria-hidden="true">🌡️</span>
      <span class="th-sum">
        <b>Le thermomètre du carnet</b>
        <small>${mise.items.length} repères de ${nombreFr(mise.min)}${NBSP}à${NBSP}${nombreFr(mise.max)}${NBSP}°C, tirés de ${fiches} fiches</small>
      </span>
      ${ICON.chev}
    </summary>
    <div class="th-corps">${thermoOuvert ? thermometreHtml(donneesThermo(), { titreDe: titreDeFond }) : ""}</div>
  </details>`;
}

export function renderFondamentaux() {
  const q = state.fondQuery || "";

  app.innerHTML = html`
    <header class="masthead fade-in">
      <div class="mast-row">${raw(ILLO.D.sprig)}<p class="eyebrow">Ce qui sert</p>${raw(ILLO.D.sprigR)}</div>
      <h1>Savoirs</h1>
      <p class="byline"><span>les mécanismes du <span class="u">carnet</span></span></p>
    </header>
    <p class="f-intro">Les gestes que tu retrouves d'une recette à l'autre, et ce qui se passe vraiment quand tu les fais.</p>
    ${raw(encartThermometre(q.trim() !== ""))}
    <div class="searchbar">
      ${raw(ICON.search)}
      <input id="f-search" type="search" placeholder="Chercher un mécanisme…" value="${q}" autocomplete="off" aria-label="Chercher un mécanisme">
    </div>
    <div id="f-resultats">${raw(listeFondamentaux(q))}</div>
  `;

  /* Seule la liste est redessinée : le champ n'est jamais recréé, il garde donc
     le clavier, la sélection et la composition en cours, sans rien à rétablir. */
  const champ = document.getElementById("f-search");
  const zone = document.getElementById("f-resultats");
  const thermo = document.getElementById("f-thermo");
  if (thermo) {
    thermo.addEventListener("toggle", () => {
      thermoOuvert = thermo.open;
      const corps = thermo.querySelector(".th-corps");
      if (thermo.open && !corps.firstChild) corps.innerHTML = thermometreHtml(donneesThermo(), { titreDe: titreDeFond });
    });
  }
  champ.addEventListener("input", () => {
    state.fondQuery = champ.value;
    zone.innerHTML = listeFondamentaux(champ.value);
    /* Pendant une recherche, le thermomètre s'efface : la liste des résultats prend toute la place. */
    if (thermo) thermo.hidden = champ.value.trim() !== "";
  });
}

export function renderFondamental(f) {
  app.innerHTML = `
    <div class="topbar fade-in">
      <a class="btn-icon" href="#/fondamentaux" data-retour="#/fondamentaux">${ICON.back} Savoirs</a>
      <button class="btn-icon" id="f-share-page">${ICON.share} Partager</button>
    </div>
    <header class="f-head fade-in">
      <p class="f-fam-tag">${f.famille}</p>
      <h1><span class="f-emoji">${f.emoji}</span>${f.t}</h1>
    </header>
    <div class="f-page">${fondBodyHtml(f, 2)}</div>
  `;
  document.getElementById("f-share-page").addEventListener("click", () => shareFond(f.id));
  observerFigures(app);
}
