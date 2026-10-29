/* L'onglet Saison : ce qui arrive, ce qui bat son plein et ce qui s'en va, mois par mois,
   et pour chaque produit sa saison et les recettes du carnet qui l'emploient. */

import { FAMILLES_SAISON, IMPORTES, PRODUITS } from "../calendrier.js";
import { html, raw } from "../core/html.js";
import { ICON } from "../core/icones.js";
import { estDeSaison } from "../core/recherche.js";
import { INITIALES_MOIS, moisDecale, NOMS_MOIS, periodeEnClair, phaseDe, produitsDeLAnnee, produitsDuMois, recettesDu, toutLAnnee } from "../core/saison.js";
import { fermerFeuille, ouvrirFeuille } from "../ui/feuilles.js";
import { app } from "../ui/routeur.js";
import { montrerDeSaison } from "./accueil.js";

/* Ce que l'onglet retient pendant la visite : le mois regardé (null : celui
   d'aujourd'hui, qui suit l'horloge si l'appli reste ouverte d'un mois à l'autre) et la
   famille choisie. Rouvrir l'appli ramène au mois en cours, toutes familles. */
let moisVu = null;
let famille = null;

const moisCourant = () => new Date().getMonth() + 1;
const moisAffiche = () => moisVu ?? moisCourant();
const majuscule = s => s.charAt(0).toUpperCase() + s.slice(1);
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;

const PHASES = [
  { id: "arrive", titre: "Ça arrive", sous: "premier mois de saison" },
  { id: "pleine", titre: "En pleine saison", sous: "le meilleur moment" },
  { id: "fin", titre: "Dernières semaines", sous: "à ne pas manquer avant l'an prochain" }
];

/* Le nombre de recettes du carnet qui emploient le produit, d'après RECIPES. */
const nbRecettes = p => recettesDu(p, RECIPES).length;

function tuile(p) {
  const n = nbRecettes(p);
  return html`<li><button type="button" class="sa-produit" data-produit="${p.id}">
    <span class="sa-emoji" aria-hidden="true">${p.emoji}</span>
    <span class="sa-nom">${p.nom}</span>
    ${n ? raw(html`<span class="sa-nb">${pluriel(n, "recette")}</span>`) : ""}
  </button></li>`;
}

/* Le bandeau des recettes de saison : seulement pour le mois en cours, celui que lit
   le filtre « De saison » de l'accueil. */
function encartRecettes(m) {
  if (m !== moisCourant()) return "";
  const n = RECIPES.filter(r => estDeSaison(r, m)).length;
  if (!n) return "";
  return html`<div class="sa-recettes">
    <p><b>${n === 1 ? "1 recette du carnet est" : `${n} recettes du carnet sont`}</b> de saison ce mois-ci.</p>
    <button type="button" class="btn primary" id="sa-voir">${n === 1 ? "La voir" : "Les voir"}</button>
  </div>`;
}

function contenu() {
  const m = moisAffiche();
  const parPhase = produitsDuMois(PRODUITS, m, famille);
  const annee = produitsDeLAnnee(PRODUITS, famille);
  const sections = PHASES.filter(ph => parPhase[ph.id].length).map(ph => html`
    <section class="sa-phase sa-${ph.id}" aria-labelledby="sa-h-${ph.id}">
      <h2 id="sa-h-${ph.id}">${ph.titre} <small>${ph.sous}</small></h2>
      <ul class="sa-grille">${raw(parPhase[ph.id].map(tuile).join(""))}</ul>
    </section>`);
  const importes = famille ? [] : IMPORTES;
  return html`
    ${raw(encartRecettes(m))}
    ${sections.length ? raw(sections.join("")) : raw(html`<p class="empty">Rien de cette famille en ${NOMS_MOIS[m - 1]}.</p>`)}
    ${annee.length ? raw(html`
    <details class="sa-annee">
      <summary><span><b>Toute l'année</b><small>de garde, cultivés à l'abri ou toujours verts</small></span>${raw(ICON.chev)}</summary>
      <ul class="sa-grille">${raw(annee.map(tuile).join(""))}</ul>
    </details>`) : ""}
    ${importes.length ? raw(html`<p class="sa-importes">Venus d'ailleurs : ${importes.map(x => x.nom.toLowerCase()).join(", ")} sont importés toute l'année et n'ont pas de saison chez nous.</p>`) : ""}
  `;
}

function navigation() {
  const m = moisAffiche();
  const courant = m === moisCourant();
  return html`
    <div class="sa-mois" role="group" aria-label="Mois">
      <button type="button" class="btn-icon sa-prec" data-decale="-1" aria-label="Mois précédent : ${NOMS_MOIS[moisDecale(m, -1) - 1]}">${raw(ICON.back)}</button>
      <p class="sa-mois-nom" aria-live="polite"><span>${majuscule(NOMS_MOIS[m - 1])}</span>${courant ? raw("<small>ce mois-ci</small>") : ""}</p>
      <button type="button" class="btn-icon sa-suiv" data-decale="1" aria-label="Mois suivant : ${NOMS_MOIS[moisDecale(m, 1) - 1]}">${raw(ICON.back)}</button>
    </div>
    <p class="sa-retour"${courant ? " hidden" : ""}><button type="button" class="sa-lien" id="sa-aujourdhui">Revenir à ${NOMS_MOIS[moisCourant() - 1]}</button></p>`;
}

function familles() {
  const puces = [{ id: null, label: "Tout" }, ...FAMILLES_SAISON];
  return html`<div class="chips sa-familles" role="group" aria-label="Familles">
    ${raw(puces.map(f => html`<button type="button" class="chip${famille === f.id ? " on" : ""}" data-famille="${f.id ?? ""}" aria-pressed="${famille === f.id}">${f.label}</button>`).join(""))}
  </div>`;
}

export function renderSaison() {
  app.innerHTML = html`
    <div id="saison-root">
    <header class="masthead fade-in">
      <div class="mast-row">${raw(ILLO.D.sprig)}<p class="eyebrow">Ce qui pousse</p>${raw(ILLO.D.sprigR)}</div>
      <h1>Saison</h1>
      <p class="byline"><span>fruits, légumes et herbes de <span class="u">France</span></span></p>
    </header>
    <div id="sa-nav">${raw(navigation())}</div>
    ${raw(familles())}
    <div id="sa-contenu">${raw(contenu())}</div>
    </div>
  `;

  /* Seuls le mois et le contenu se redessinent : la barre des familles et les boutons
     gardent leur place, et le focus reste sur la flèche qu'on vient de toucher. */
  const redessiner = focus => {
    document.getElementById("sa-nav").innerHTML = navigation();
    document.getElementById("sa-contenu").innerHTML = contenu();
    if (focus) document.querySelector(focus)?.focus();
  };

  document.getElementById("saison-root").addEventListener("click", e => {
    const decale = e.target.closest("[data-decale]");
    if (decale) {
      const d = Number(decale.dataset.decale);
      const suivant = moisDecale(moisAffiche(), d);
      moisVu = suivant === moisCourant() ? null : suivant;
      return redessiner(d < 0 ? ".sa-prec" : ".sa-suiv");
    }
    if (e.target.closest("#sa-aujourdhui")) { moisVu = null; return redessiner(".sa-suiv"); }
    const puce = e.target.closest("[data-famille]");
    if (puce) {
      famille = puce.dataset.famille || null;
      document.querySelectorAll(".sa-familles .chip").forEach(b => {
        const on = (b.dataset.famille || null) === famille;
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", String(on));
      });
      document.getElementById("sa-contenu").innerHTML = contenu();
      return;
    }
    if (e.target.closest("#sa-voir")) {
      montrerDeSaison();
      location.hash = "#/";
      return;
    }
    const tuileTouchee = e.target.closest("[data-produit]");
    if (tuileTouchee) ouvrirProduit(PRODUITS.find(p => p.id === tuileTouchee.dataset.produit));
  });
}

/* Les douze mois d'un coup d'œil : la saison pleine, le mois regardé cerclé. */
function frise(p, m) {
  const dans = toutLAnnee(p) ? new Set(INITIALES_MOIS.map((_, i) => i + 1)) : new Set(p.mois);
  return html`<div class="sa-frise" role="img" aria-label="De saison ${periodeEnClair(p)}">
    ${raw(INITIALES_MOIS.map((ini, i) => html`<span class="${dans.has(i + 1) ? "on" : ""}${i + 1 === m ? " ici" : ""}" aria-hidden="true">${ini}</span>`).join(""))}
  </div>`;
}

const OU = { base: "", option: "au choix", supplement: "en supplément" };

const PHRASE_PHASE = {
  arrive: m => `${majuscule(NOMS_MOIS[m - 1])} : premier mois de saison.`,
  pleine: m => `${majuscule(NOMS_MOIS[m - 1])} : en pleine saison.`,
  fin: m => `${majuscule(NOMS_MOIS[m - 1])} : dernier mois de saison avant l'an prochain.`
};

export function ouvrirProduit(p) {
  if (!p) return;
  const m = moisAffiche();
  const phase = phaseDe(p, m);
  const recettes = recettesDu(p, RECIPES);
  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop";
  backdrop.innerHTML = html`
    <div class="sheet sheet-produit" role="dialog" aria-modal="true" aria-label="${p.nom}">
      <div class="sheet-grip"></div>
      <h3><span class="sa-emoji" aria-hidden="true">${p.emoji}</span>${p.nom}</h3>
      <p class="sheet-sub">${toutLAnnee(p) ? "Toute l'année" : majuscule(periodeEnClair(p))}</p>
      ${raw(frise(p, m))}
      ${phase ? raw(html`<p class="sa-phrase">${PHRASE_PHASE[phase](m)}</p>`)
        : toutLAnnee(p) ? "" : raw(html`<p class="sa-phrase sa-hors">Pas de saison en ${NOMS_MOIS[m - 1]}.</p>`)}
      ${p.note ? raw(html`<p class="sa-note">${p.note}</p>`) : ""}
      ${recettes.length ? raw(html`
      <div class="sa-carnet">
        <h4>Dans le carnet</h4>
        <ul>${raw(recettes.map(({ r, ou }) => html`<li><a href="#/recette/${r.id}"><span aria-hidden="true">${r.emoji}</span> ${r.title}</a>${OU[ou] ? raw(html` <small>${OU[ou]}</small>`) : ""}</li>`).join(""))}</ul>
      </div>`) : ""}
      <button type="button" class="btn secondary sa-fermer" id="sa-fermer">Fermer</button>
    </div>`;

  /* Comme la feuille d'un savoir : un lien vers une recette attend que la feuille ait
     dépilé son entrée d'historique, sinon les deux gestes s'annulent. */
  let ensuite = null;
  backdrop.addEventListener("click", e => {
    if (e.target === backdrop || e.target.closest("#sa-fermer")) return fermerFeuille();
    const lien = e.target.closest("a[href]");
    if (lien) {
      e.preventDefault();
      const cible = lien.getAttribute("href");
      ensuite = () => { location.hash = cible; };
      fermerFeuille();
    }
  });
  ouvrirFeuille(backdrop, () => {
    if (ensuite) { const aller = ensuite; ensuite = null; aller(); }
  });
}
