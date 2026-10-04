/* L'onglet Au menu : le repas (convives, heure, allergies), son rétroplanning, les recettes retenues avec leurs portions, la structure d'un repas à compléter et les repas passés. */

import { courseTodo } from "../core/courses.js";
import { save, state } from "../core/etat.js";
import { html, raw } from "../core/html.js";
import { ICON } from "../core/icones.js";
import {
  MOMENTS,
  allergenesDeEntree,
  basculerExclu,
  catDuMoment,
  cibleDuMoment,
  defaireRefaire,
  entreeDe,
  lireRepas,
  maintenantLocal,
  menuEntrees,
  nbRecettes,
  portionsOf,
  refaireRepas,
  remettreAuMenu,
  restaurerMenu,
  retirerDuMenu,
  setConvives,
  setDateRepas,
  setHeureRepas,
  tachesDuMenu,
  viderLeMenu
} from "../core/menu.js";
import {
  decomposer,
  heureFr,
  icsRepas,
  instantTable,
  minutesMurales,
  nomCourt,
  phraseConflit,
  phraseRetard,
  planifier,
  texteEvenement
} from "../core/planning.js";
import { VERDICTS, byId, cookedOf, totalTimeText, verdictOf, versionSummary } from "../core/recettes.js";
import { cookHref, cookingStep } from "../core/seance.js";
import { onShareClick, shareMenu } from "../ui/partage.js";
import { app } from "../ui/routeur.js";
import { toast, updateBadge } from "../ui/toast.js";
import { visuel } from "../ui/visuel.js";

/* Les volets repliables gardent leur état d'un dessin à l'autre : cocher un
   allergène redessine la page, et le panneau ne doit pas se refermer sous le doigt. */
const ouvert = { allergies: false, passes: false };

/* Ce que le dernier dessin a calculé, pour le bouton « Ajouter au calendrier ». */
let planCourant = null;

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/* La structure d'un repas, présente en permanence sur la page — vide ou pas.
   Chaque ligne compte les recettes de la page où elle mène : annoncer un
   total plus large que ce qu'on y montre ferait chercher le reste. */
export function squeletteHtml() {
  const moments = MOMENTS.filter(m => catDuMoment(m));
  return `<div class="squelette">
    ${moments.map(m => {
      const n = nbRecettes(m.cats);
      return `<button class="sq-row" data-moment="${cibleDuMoment(m)}">
        <span class="sq-nom">${m.nom}</span>
        <span class="sq-n">${n} recette${n > 1 ? "s" : ""}</span>
        ${ICON.chev}
      </button>`;
    }).join("")}
  </div>
  <p class="sq-libre">Rien d'obligatoire là-dedans : un apéro seul fait très bien l'affaire.</p>`;
}

/* « samedi 10 octobre », ou « aujourd'hui » / « demain » quand c'est le cas. */
function jourFr(date, aujourdhui) {
  if (date === aujourdhui) return "aujourd'hui";
  if (date === decomposer(minutesMurales(aujourdhui, 0) + 1440).date) return "demain";
  return new Date(date + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

/* ---------- Le repas : convives, heure, allergies ---------- */

function repasHtml(repas) {
  const nbExclus = repas.exclus.length;
  return html`<section class="repas fade-in" aria-label="Le repas">
    <div class="rp-ligne">
      <span class="rp-lib" id="rp-conv">Pour combien ?</span>
      <span class="portions" role="group" aria-labelledby="rp-conv">
        <button data-conv="-1" aria-label="Un convive de moins">−</button>
        <span class="val" id="rp-conv-val">${pluriel(repas.convives, "convive")}</span>
        <button data-conv="1" aria-label="Un convive de plus">+</button>
      </span>
    </div>
    <div class="rp-ligne">
      <label class="rp-lib" for="repas-heure">À table à</label>
      <input class="rp-champ" type="time" id="repas-heure" value="${repas.heure}" required>
    </div>
    <div class="rp-ligne">
      <label class="rp-lib" for="repas-date">Le <small>(facultatif)</small></label>
      <span class="rp-date">
        <input class="rp-champ" type="date" id="repas-date" value="${repas.date}">
        ${repas.date ? raw(html`<button class="rp-efface" data-date-clear aria-label="Effacer la date">${raw(ICON.x)}</button>`) : ""}
      </span>
    </div>
    <details class="alg" id="alg" ${ouvert.allergies ? raw("open") : ""}>
      <summary>Invités et allergies ${nbExclus ? raw(html`<span class="alg-n">${nbExclus} à éviter</span>`) : ""}</summary>
      <p class="alg-aide">Touche ce que tes invités ne peuvent pas manger : les recettes concernées te le diront.</p>
      <div class="alg-chips">
        ${ALLERGENES_LISTE.map(a => raw(html`<button class="alg-chip" data-exclu="${a.id}" aria-pressed="${repas.exclus.includes(a.id) ? "true" : "false"}"><span aria-hidden="true">${a.emoji}</span> ${a.label}</button>`))}
      </div>
      <p class="alg-note">La composition d'un produit du commerce varie d'une marque à l'autre : lis toujours l'étiquette.</p>
    </details>
  </section>`;
}

/* ---------- Le rétroplanning ---------- */

const ICONE_EVT = { prechauffage: ICON.flame, regler: ICON.flame, enfourner: ICON.flame, sortir: ICON.flame };

/* Quatre plats à quatre températures font six paires : au-delà de deux phrases,
   le reste se replie, pour que la frise ne soit pas repoussée hors de l'écran. */
const CONFLITS_VISIBLES = 2;
const noteConflit = c => raw(html`<p class="retro-note conflit">${raw(ICON.flame)}<span>${phraseConflit(c)}</span></p>`);

function retroHtml(plan, inst, versions) {
  const aujourdhui = maintenantLocal().date;
  const ligne = e => {
    const version = e.k && ["debut", "enfourner", "sortir"].includes(e.type) ? versions.get(e.k) : "";
    const parallele = e.parallele && e.parallele.length
      ? `Pendant que ${e.parallele.map(nomCourt).join(" et ")} ${e.parallele.length > 1 ? "patientent" : "patiente"}.` : "";
    return html`<li class="fr fr-${e.type}">
      <time class="fr-h">${heureFr(e.t)}</time>
      <span class="fr-pt" aria-hidden="true">${raw(ICONE_EVT[e.type] || "")}</span>
      <div class="fr-txt"><b>${texteEvenement(e)}</b>${version ? raw(html`<span class="fr-sub">${version}</span>`) : ""}${parallele ? raw(html`<span class="fr-sub">${parallele}</span>`) : ""}</div>
    </li>`;
  };
  return html`<section class="retro fade-in" aria-label="Rétroplanning">
    <h2 class="retro-titre">À table à ${heureFr(plan.table)} <small>${jourFr(inst.date, aujourdhui)}</small></h2>
    ${plan.conflits.slice(0, CONFLITS_VISIBLES).map(noteConflit)}
    ${plan.conflits.length > CONFLITS_VISIBLES ? raw(html`<details class="retro-plus"><summary>${plan.conflits.length - CONFLITS_VISIBLES} autre${plan.conflits.length - CONFLITS_VISIBLES > 1 ? "s" : ""} conflit${plan.conflits.length - CONFLITS_VISIBLES > 1 ? "s" : ""} de four</summary>${plan.conflits.slice(CONFLITS_VISIBLES).map(noteConflit)}</details>`) : ""}
    ${plan.retard ? raw(html`<p class="retro-note retard">${raw(ICON.clock)}<span>${phraseRetard(plan)}</span></p>`) : ""}
    <ol class="frise">${plan.evenements.map(e => raw(ligne(e)))}</ol>
    <button class="btn secondary retro-cal" id="ajout-calendrier">${raw(ICON.clock)} Ajouter au calendrier</button>
  </section>`;
}

/* Le fichier .ics part par la feuille de partage du téléphone quand elle sait
   porter un fichier (l'appli Calendrier s'ouvre alors d'un geste), sinon il se
   télécharge. */
async function ajouterAuCalendrier() {
  if (!planCourant) return;
  const { plan, convives } = planCourant;
  const horodatage = new Date().toISOString().replace(/[-:]|\.\d{3}/g, "");
  const contenu = icsRepas(plan, { horodatage, convives });
  const nom = `repas-${decomposer(plan.tableReelle).date}.ics`;
  const fichier = new File([contenu], nom, { type: "text/calendar" });
  if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
    try { await navigator.share({ files: [fichier], title: "Repas" }); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(fichier);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast("Fichier du calendrier téléchargé");
}

/* ---------- Les repas passés ---------- */

function passesHtml() {
  const liste = (state.historique || []).slice(0, 6);
  if (!liste.length) return "";
  const aujourdhui = maintenantLocal().date;
  return html`<details class="passes" id="passes" ${ouvert.passes ? raw("open") : ""}>
    <summary>Repas passés <span class="alg-n">${liste.length}</span></summary>
    <ul class="passes-liste">
      ${liste.map(h => raw(html`<li class="passe">
        <div class="passe-tete"><b>${jourFr(h.date, aujourdhui)}</b><span>${pluriel(h.convives, "convive")}</span></div>
        <p class="passe-liste">${h.entrees.map(x => byId(x.rid)).filter(Boolean).map(r => nomCourt(r.title)).join(" · ")}</p>
        <button class="mc-btn passe-refaire" data-refaire="${h.id}">Refaire ce repas</button>
      </li>`))}
    </ul>
  </details>`;
}

/* ---------- La page ---------- */

function carteHtml({ e, r }, repas) {
  const c = cookedOf(r);
  const v = VERDICTS.find(x => x.id === verdictOf(r));
  const lien = `#/recette/${r.id}/m/${e.k}`;
  const version = versionSummary(r, e);
  const alertes = allergenesDeEntree(r, e, repas.exclus);
  return html`<article class="menu-card fade-in" data-open="${e.k}">
    <a class="mc-visual" style="background:${r.color}22" href="${lien}" aria-label="${r.title}">${raw(visuel(r, { genre: "carre" }))}</a>
    <div class="mc-body">
      <a class="mc-title" href="${lien}"><h3>${r.title}</h3></a>
      <div class="meta">${raw(ICON.clock)} ${totalTimeText(r)}
        ${v ? raw(html`<span class="verdict-tag v-${v.id}">${v.tag || v.label}</span>`) : ""}
        ${c.count ? raw(html`<span class="cook-count">cuisinée ${c.count}×</span>`) : ""}
      </div>
      ${version ? raw(html`<p class="mc-version">${version}</p>`) : ""}
      ${alertes.map(a => raw(html`<p class="mc-alerte" role="note"><span aria-hidden="true">⚠️</span><span>Contient ${a.phrase} : ${a.ingredients.join(", ")}</span></p>`))}
      <span class="portions mc-portions">
        <button data-minus="${e.k}" aria-label="Moins de portions">−</button>
        <span class="val">${portionsOf(r, e)} ${r.portions.label}</span>
        <button data-plus="${e.k}" aria-label="Plus de portions">+</button>
      </span>
      <div class="mc-actions">
        <a class="mc-btn" href="${cookHref(r, e.k)}">${raw(ICON.chef)} ${cookingStep(r, e.k) ? "Reprendre" : "Cuisiner"}</a>
        <button class="mc-btn" data-share="${r.id}">${raw(ICON.share)} Partager</button>
      </div>
    </div>
    <button class="mc-x" data-remove="${e.k}" aria-label="Retirer du menu">✕</button>
  </article>`;
}

export function renderMenu() {
  const list = menuEntrees();
  planCourant = null;

  if (!list.length) {
    app.innerHTML = `
      <div id="menu-root">
      <header class="page-head courses-head fade-in">
        <div class="head-branch">${ILLO.D.olive}</div>
        <h1>Au menu</h1>
      </header>
      <div class="empty-illo cheers">${ILLO.D.cheers}</div>
      <p class="empty">Rien encore au menu.<br>Un repas se compose souvent comme ça — touche un moment pour aller y choisir.</p>
      ${squeletteHtml()}
      ${passesHtml()}
      <div style="text-align:center"><a class="btn-icon" href="#/">${ICON.back} Voir toutes les recettes</a></div>
      </div>
    `;
    brancher();
    return;
  }

  const todo = courseTodo();
  const repas = lireRepas();
  const inst = instantTable(repas, maintenantLocal());
  const plan = inst ? planifier({ table: inst.table, maintenant: inst.maintenant, taches: tachesDuMenu() }) : null;
  if (plan) planCourant = { plan, convives: repas.convives };
  const versions = new Map(list.map(({ e, r }) => [e.k, versionSummary(r, e)]));

  app.innerHTML = `
    <div id="menu-root">
    <header class="page-head courses-head fade-in">
      <div class="head-branch">${ILLO.D.olive}</div>
      <h1>Au menu</h1>
      <p>${list.length} recette${list.length > 1 ? "s" : ""} · ${todo ? `${todo} article${todo > 1 ? "s" : ""} à prendre` : "courses terminées"}</p>
      ${list.length > 1 ? `<p class="menu-order">Dans l'ordre où s'y mettre : la plus longue en premier.</p>` : ""}
    </header>
    ${repasHtml(repas)}
    ${plan ? retroHtml(plan, inst, versions) : `<p class="retro-note">Indique l'heure du repas pour voir quand t'y mettre.</p>`}
    <div class="menu-list">
      ${list.map(x => carteHtml(x, repas)).join("")}
    </div>
    <p class="sq-label">Compléter le repas</p>
    ${squeletteHtml()}
    <div class="course-actions">
      <button class="btn secondary" id="share-menu">${ICON.share} Partager le repas</button>
      <a class="btn primary" href="#/courses">${ICON.cart} Liste de courses</a>
    </div>
    ${passesHtml()}
    <button class="link-danger" id="clear-menu">Vider le menu</button>
    </div>
  `;
  brancher();
}

/* Redessiner sur place, sans revenir en haut de page. */
function redessiner() {
  const y = window.scrollY;
  renderMenu();
  window.scrollTo(0, y);
}

function brancher() {
  const racine = document.getElementById("menu-root");
  racine.querySelector("#alg")?.addEventListener("toggle", e => { ouvert.allergies = e.target.open; });
  racine.querySelector("#passes")?.addEventListener("toggle", e => { ouvert.passes = e.target.open; });

  racine.addEventListener("click", e => {
    onShareClick(e);
    const rm = e.target.closest("[data-remove]");
    if (rm) return retirer(rm.dataset.remove);
    const mom = e.target.closest("[data-moment]");
    if (mom) { state.filter = mom.dataset.moment; save(); location.hash = "#/"; return; }
    const conv = e.target.closest("[data-conv]");
    if (conv) {
      const n = lireRepas().convives + Number(conv.dataset.conv);
      if (n < 1 || n > 24) return;
      setConvives(n); updateBadge(); redessiner();
      return;
    }
    const exclu = e.target.closest("[data-exclu]");
    if (exclu) { basculerExclu(exclu.dataset.exclu); redessiner(); return; }
    if (e.target.closest("[data-date-clear]")) { setDateRepas(""); redessiner(); return; }
    if (e.target.closest("#ajout-calendrier")) { ajouterAuCalendrier(); return; }
    const refaire = e.target.closest("[data-refaire]");
    if (refaire) return remettreLeRepas(refaire.dataset.refaire);
    const step = e.target.closest("[data-minus], [data-plus]");
    if (step) {
      const ent = entreeDe(step.dataset.minus || step.dataset.plus);
      const r = ent && byId(ent.rid);
      if (!r) return;
      const p = portionsOf(r, ent) + (step.dataset.plus ? 1 : -1);
      if (p < 1 || p > 24) return;
      ent.portions = p;
      save(); updateBadge(); redessiner();
      return;
    }
    /* Toute la carte ouvre la recette : les mains dans la farine, on ne vise pas
       la vignette au millimètre. Les commandes qu'elle contient gardent la main. */
    const carte = e.target.closest("[data-open]");
    if (carte && !e.target.closest("a, button")) {
      const ent = entreeDe(carte.dataset.open);
      if (ent) location.hash = `#/recette/${ent.rid}/m/${ent.k}`;
    }
  });

  racine.addEventListener("change", e => {
    if (e.target.id === "repas-heure") {
      if (!e.target.value) return;          // champ vidé : on garde la dernière heure valide
      setHeureRepas(e.target.value); redessiner();
    } else if (e.target.id === "repas-date") {
      setDateRepas(e.target.value); redessiner();
    }
  });

  document.getElementById("share-menu")?.addEventListener("click", shareMenu);
  document.getElementById("clear-menu")?.addEventListener("click", vider);
}

/* Retirer et vider se font tout de suite et se défont par « Annuler » :
   demander confirmation d'avance fait payer à chaque fois un oubli rare. Le
   toast peut survivre à un changement d'onglet, d'où le contrôle avant de
   redessiner. */
const apresAnnulation = () => {
  updateBadge();
  if (document.getElementById("menu-root")) renderMenu();
};

function retirer(k) {
  const retire = retirerDuMenu(k);
  if (!retire) return;
  updateBadge();
  redessiner();
  toast("Retiré du menu", { action: "Annuler", surAction: () => { remettreAuMenu(retire); apresAnnulation(); } });
}

function vider() {
  const avant = viderLeMenu();
  updateBadge();
  redessiner();
  toast("Menu vidé", { action: "Annuler", surAction: () => { restaurerMenu(avant); apresAnnulation(); } });
}

function remettreLeRepas(id) {
  const h = (state.historique || []).find(x => x.id === id);
  if (!h) return;
  /* Un menu vide qu'on remplit par un repas passé retrouve ses convives ; réglés
     avant l'ajout, ils ne touchent pas aux portions qu'il avait. */
  if (!state.menu.length) setConvives(h.convives);
  const cles = refaireRepas(id);
  if (!cles.length) return toast("Ces recettes ne sont plus au carnet");
  updateBadge();
  redessiner();
  toast("Repas remis au menu", { action: "Annuler", surAction: () => { defaireRefaire(cles); apresAnnulation(); } });
}
