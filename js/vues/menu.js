/* L'onglet Au menu : le repas (convives, heure, allergies), son rétroplanning, les recettes retenues avec leurs portions, la structure d'un repas à compléter et les repas passés. */

import { CONVIVES_MAX, PORTIONS_MAX, PORTIONS_MIN } from "../core/adaptation.js";
import { courseTodo } from "../core/courses.js";
import { save, state } from "../core/etat.js";
import { libellePortions } from "../core/format.js";
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
  detailPendant,
  detailRepos,
  heureFr,
  icsRepas,
  instantTable,
  jourRelatif,
  minutesMurales,
  nomCourt,
  phraseConflit,
  phraseRetard,
  planifier,
  texteEvenement
} from "../core/planning.js";
import { VERDICTS, byId, cookedOf, totalTimeText, verdictOf, versionSummary } from "../core/recettes.js";
import { cookHref, cookingStep } from "../core/seance.js";
import { annoncer } from "../ui/annonces.js";
import { garderFocus } from "../ui/focus.js";
import { vibrer } from "../ui/geste.js";
import { animer, flip, mouvementReduit, secouer, sortir } from "../ui/mouvement.js";
import { nombreHtml, rejouerNombre } from "../ui/nombre.js";
import { onShareClick, shareMenu } from "../ui/partage.js";
import { app } from "../ui/routeur.js";
import { toast, updateBadge } from "../ui/toast.js";
import { visuel } from "../ui/visuel.js";

/* Les volets repliables gardent leur état d'un dessin à l'autre : cocher un
   allergène redessine la page, et le panneau ne doit pas se refermer sous le doigt. */
const ouvert = { allergies: false, passes: false };

/* Ce que le dernier dessin a calculé, pour le bouton « Ajouter au calendrier ». */
let planCourant = null;

/* Un redessin sur place (un convive de plus, une allergie cochée) n'est pas une
   arrivée : les cartes n'y rejouent pas leur fondu d'entrée et la frise n'y repart pas
   de zéro. Posé par redessiner(), le temps du rendu. */
let enRedessin = false;
const entree = () => (enRedessin ? "" : " fade-in");

/* Les notes de conflit ou de retard que le dernier dessin montrait : elles ne secouent
   qu'à leur arrivée, pas à chaque redessin qui les redit. */
let signatureNotes = "";

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/* Une coche qui se trace d'un trait (.trace de base.css sur le conteneur). */
const COCHE_TRACEE = ICON.check.replace("<path ", '<path pathLength="1" ');

/* La structure d'un repas, présente en permanence sur la page — vide ou pas.
   Chaque ligne compte les recettes de la page où elle mène : annoncer un
   total plus large que ce qu'on y montre ferait chercher le reste. */
function squeletteHtml() {
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

/* « samedi 10 octobre ». */
const dateLongue = date => new Date(date + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/* « samedi 10 octobre », ou « aujourd'hui » / « demain » quand c'est le cas. */
function jourFr(date, aujourdhui) {
  if (date === aujourdhui) return "aujourd'hui";
  if (date === decomposer(minutesMurales(aujourdhui, 0) + 1440).date) return "demain";
  return dateLongue(date);
}

/* ---------- Le repas : convives, heure, allergies ---------- */

function repasHtml(repas) {
  const nbExclus = repas.exclus.length;
  return html`<section class="repas${entree()}" aria-label="Le repas">
    <div class="rp-ligne">
      <span class="rp-lib" id="rp-conv">Pour combien&nbsp;?</span>
      <span class="portions" role="group" aria-labelledby="rp-conv">
        <button data-conv="-1" aria-label="Un convive de moins">−</button>
        <span class="val" id="rp-conv-val">${raw(nombreHtml(pluriel(repas.convives, "convive")))}</span>
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

const ICONE_EVT = { prechauffage: ICON.flame, regler: ICON.flame, enfourner: ICON.flame, sortir: ICON.flame, repos: ICON.zzz, pendant: ICON.timer };

/* Quatre plats à quatre températures font six paires : au-delà de deux phrases,
   le reste se replie, pour que la frise ne soit pas repoussée hors de l'écran. */
const CONFLITS_VISIBLES = 2;
const noteConflit = c => raw(html`<p class="retro-note conflit">${raw(ICON.flame)}<span>${phraseConflit(c)}</span></p>`);

/* Le balisage de la frise, stable (un lot d'animation s'y appuiera) :
     <ol class="frise">
       <li class="fr-jour"> : seulement quand la frise passe par un autre jour que
         celui de la table (« La veille ») ; ouvre chaque jour ;
       <li class="fr fr-<type>"> : une ligne = l'heure (.fr-h), le fil et son point
         ou son icône (.fr-pt), le geste (.fr-txt : un <b>, puis des .fr-sub).
     Un repos est une ligne `fr-repos` : icône de repos, durée et fin en .fr-sub.
     Une attente qui court pendant qu'on travaille à autre chose est une ligne
     `fr-pendant` : icône de minuteur, « Pendant ce temps : … » en gras, recette,
     durée et fin dessous, le tout dans une bulle posée à côté du fil. Elle ne
     libère pas les mains : jamais de « Temps libre » ni de « Reprends » pour elle.
     `fr-haut-libre` / `fr-bas-libre` : le fil au-dessus / au-dessous de la ligne
     est un temps libre (un repos, et rien d'autre qui occupe les mains) ; il se
     dessine en pointillés, de sorte que le repos se voie à la forme du fil et
     non à la seule couleur. */
function retroHtml(plan, inst, versions) {
  const aujourdhui = maintenantLocal().date;
  const ligne = (e, precedent) => {
    const version = e.k && ["debut", "enfourner", "sortir"].includes(e.type) ? versions.get(e.k) : "";
    const parallele = e.parallele && e.parallele.length
      ? `Pendant que ${e.parallele.map(nomCourt).join(" et ")} ${e.parallele.length > 1 ? "patientent" : "patiente"}.` : "";
    const details = e.type === "repos" ? detailRepos(e) : e.type === "pendant" ? detailPendant(e) : [];
    const fil = `${precedent?.tempsLibre ? " fr-haut-libre" : ""}${e.tempsLibre ? " fr-bas-libre" : ""}`;
    return html`<li class="fr fr-${e.type}${fil}">
      <time class="fr-h">${heureFr(e.t)}</time>
      <span class="fr-pt" aria-hidden="true">${raw(ICONE_EVT[e.type] || "")}</span>
      <div class="fr-txt"><b>${texteEvenement(e)}</b>${details.map(d => raw(html`<span class="fr-sub">${d}</span>`))}${version ? raw(html`<span class="fr-sub">${version}</span>`) : ""}${parallele ? raw(html`<span class="fr-sub">${parallele}</span>`) : ""}</div>
    </li>`;
  };
  /* Les jours : une marinade de 12 h fait commencer la veille, et l'heure seule
     ne le dirait pas. Aucun séparateur tant que tout tient le jour du repas. */
  const plusieursJours = plan.evenements.some(e => e.jour !== 0);
  const lignes = plan.evenements.map((e, i, tous) => {
    const jour = plusieursJours && (i === 0 || e.jour !== tous[i - 1].jour)
      ? html`<li class="fr-jour"><b>${e.jour < 0 ? jourRelatif(e.jour) : "Le jour du repas"}</b> <span>${dateLongue(decomposer(e.t).date)}</span></li>` : "";
    return raw(jour + ligne(e, tous[i - 1]));
  });
  return html`<section class="retro${entree()}" aria-label="Rétroplanning">
    <h2 class="retro-titre">À table à ${heureFr(plan.table)} <small>${jourFr(inst.date, aujourdhui)}</small></h2>
    ${plan.conflits.slice(0, CONFLITS_VISIBLES).map(noteConflit)}
    ${plan.conflits.length > CONFLITS_VISIBLES ? raw(html`<details class="retro-plus"><summary>${plan.conflits.length - CONFLITS_VISIBLES} autre${plan.conflits.length - CONFLITS_VISIBLES > 1 ? "s" : ""} conflit${plan.conflits.length - CONFLITS_VISIBLES > 1 ? "s" : ""} de four</summary>${plan.conflits.slice(CONFLITS_VISIBLES).map(noteConflit)}</details>`) : ""}
    ${plan.retard ? raw(html`<p class="retro-note retard">${raw(ICON.clock)}<span>${phraseRetard(plan)}</span></p>`) : ""}
    <ol class="frise">${lignes}</ol>
    ${plan.evenements.some(e => e.tempsLibre) ? raw(html`<p class="retro-legende">Fil en pointillés : tes mains sont libres.</p>`) : ""}
    <button class="btn secondary retro-cal" id="ajout-calendrier">${raw(ICON.clock)} Ajouter au calendrier</button>
  </section>`;
}

/* Le fichier .ics part par la feuille de partage du téléphone quand elle sait
   porter un fichier (l'appli Calendrier s'ouvre alors d'un geste), sinon il se
   télécharge. */
async function ajouterAuCalendrier() {
  if (!planCourant) return false;
  const { plan, convives } = planCourant;
  const horodatage = new Date().toISOString().replace(/[-:]|\.\d{3}/g, "");
  const contenu = icsRepas(plan, { horodatage, convives });
  const nom = `repas-${decomposer(plan.tableReelle).date}.ics`;
  const fichier = new File([contenu], nom, { type: "text/calendar" });
  if (navigator.canShare && navigator.canShare({ files: [fichier] })) {
    try { await navigator.share({ files: [fichier], title: "Repas" }); return true; }
    catch (e) { if (e && e.name === "AbortError") return false; }
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
  return true;
}

/* ---------- Les repas passés ---------- */

function passesHtml() {
  const liste = (state.historique || []).filter(Boolean).slice(0, 6);
  if (!liste.length) return "";
  const aujourdhui = maintenantLocal().date;
  return html`<details class="passes" id="passes" ${ouvert.passes ? raw("open") : ""}>
    <summary>Repas passés <span class="alg-n">${liste.length}</span></summary>
    <ul class="passes-liste">
      ${liste.map(h => raw(html`<li class="passe">
        <div class="passe-tete"><b>${jourFr(h.date, aujourdhui)}</b><span>${pluriel(h.convives, "convive")}</span></div>
        <p class="passe-liste">${(h.entrees || []).map(x => byId(x?.rid)).filter(Boolean).map(r => nomCourt(r.title)).join(" · ")}</p>
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
  return html`<article class="menu-card${entree()}" data-open="${e.k}">
    <a class="mc-visual" data-vt-photo="${r.id}" style="background:${r.color}22" href="${lien}" aria-label="${r.title}">${raw(visuel(r, { genre: "carre" }))}</a>
    <div class="mc-body">
      <a class="mc-title" href="${lien}"><h3>${r.title}</h3></a>
      <div class="meta">${raw(ICON.clock)} ${totalTimeText(r, e)}
        ${v ? raw(html`<span class="verdict-tag v-${v.id}">${v.tag || v.label}</span>`) : ""}
        ${c.count ? raw(html`<span class="cook-count">cuisinée ${c.count}×</span>`) : ""}
      </div>
      ${version ? raw(html`<p class="mc-version">${version}</p>`) : ""}
      ${alertes.map(a => raw(html`<p class="mc-alerte" role="note"><span aria-hidden="true">⚠️</span><span>Contient ${a.phrase} : ${a.ingredients.join(", ")}</span></p>`))}
      <span class="portions mc-portions">
        <button data-minus="${e.k}" aria-label="Moins de portions">−</button>
        <span class="val">${raw(nombreHtml(libellePortions(portionsOf(r, e), r.portions.label)))}</span>
        <button data-plus="${e.k}" aria-label="Plus de portions">+</button>
      </span>
      <div class="mc-actions">
        <a class="mc-btn" href="${cookHref(r, e.k)}">${raw(ICON.chef)} ${cookingStep(r, e.k) ? "Reprendre" : "Cuisiner"}</a>
        <button class="mc-btn" data-share="${r.id}" data-share-k="${e.k}">${raw(ICON.share)} Partager</button>
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
      <header class="page-head courses-head${entree()}">
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
    decorerVide();
    return;
  }

  const todo = courseTodo();
  const repas = lireRepas();

  app.innerHTML = `
    <div id="menu-root">
    <header class="page-head courses-head${entree()}">
      <div class="head-branch">${ILLO.D.olive}</div>
      <h1>Au menu</h1>
      <p id="menu-entete">${enteteMenu(list, todo)}</p>
      <p class="menu-order" id="menu-ordre"${list.length > 1 ? "" : " hidden"}>Dans l'ordre où s'y mettre : la plus longue en premier.</p>
    </header>
    ${repasHtml(repas)}
    <div id="retro-zone">${retroZone(list, repas)}</div>
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
  if (!enRedessin) signatureNotes = "";   // une arrivée : les notes ont le droit de secouer
  activerRetro(document.getElementById("retro-zone"), enRedessin ? "fixe" : "trace");
}

const enteteMenu = (list, todo) => `${list.length} recette${list.length > 1 ? "s" : ""} · ${todo ? `${todo} article${todo > 1 ? "s" : ""} à prendre` : "courses terminées"}`;

/* L'état vide : l'illustration se trace au trait, le reste arrive en douceur. */
function decorerVide() {
  if (enRedessin || mouvementReduit()) return;
  const illo = document.querySelector("#menu-root .empty-illo");
  if (illo) {
    illo.querySelectorAll("svg path:not([fill-opacity])").forEach(p => p.setAttribute("pathLength", "1"));
    illo.classList.add("trace");
  }
  arriveeDouce(document.getElementById("menu-root"), ".empty, .sq-row, .sq-libre, .passes");
}

/* Arrivée douce, échelonnée ; la classe est retirée une fois jouée (elle garderait sinon
   l'état final et la propriété scale, qui gêne le retour d'appui). */
function arriveeDouce(racine, selecteur) {
  racine.querySelectorAll(selecteur).forEach((e, i) => {
    e.style.setProperty("--i", Math.min(i + 1, 7));
    e.classList.add("arrive");
    e.addEventListener("animationend", () => e.classList.remove("arrive"), { once: true });
  });
}

/* La frise, une fois posée dans sa zone. `mode` :
   - "trace" : le dessin de la vue (le fil se trace de haut en bas puis les points, quand la
     frise entre dans l'écran — une seule fois) ;
   - "fondu" : un changement (l'heure du repas, un menu qui perd une carte) ; un fondu court,
     pas un nouveau tracé ;
   - "fixe" : un redessin sur place ; rien ne bouge.
   Les notes de conflit ou de retard secouent une fois quand elles arrivent ou changent.
   Tout est neutre en mouvement réduit : la frise est directement dans son état final. */
function activerRetro(zone, mode) {
  if (!zone) return;
  const notes = [...zone.querySelectorAll(".retro-note.conflit, .retro-note.retard")];
  const signature = notes.map(n => n.textContent).join("|");
  const change = signature !== signatureNotes;
  signatureNotes = signature;
  if (mouvementReduit()) return;
  if (change) notes.forEach(secouer);
  const frise = zone.querySelector(".frise");
  if (!frise) return;
  if (mode === "fondu") { animer(zone, [{ opacity: 0.35 }], { duree: "courte", cle: "fondu", reprise: false }); return; }
  if (mode !== "trace") return;
  /* Tout tient en 900 ms, quel que soit le nombre de lignes : le pas d'une ligne à l'autre
     se resserre quand la frise s'allonge. */
  const lignes = [...frise.querySelectorAll(".fr")];
  lignes.forEach((l, i) => l.style.setProperty("--r", i));
  frise.style.setProperty("--pas", `${Math.max(14, Math.min(70, Math.floor(480 / Math.max(1, lignes.length))))}ms`);
  frise.dataset.trace = "attend";
  const jouer = () => { frise.dataset.trace = "joue"; };
  if (typeof IntersectionObserver === "undefined") return jouer();
  const o = new IntersectionObserver(([x]) => { if (x.isIntersecting) { o.disconnect(); jouer(); } }, { threshold: 0.05 });
  o.observe(frise);
}

/* La frise (ou l'invitation à donner l'heure), seule : elle se redessine sans
   toucher au champ de l'heure, que le clavier est peut-être en train de régler. */
function retroZone(list, repas) {
  const inst = instantTable(repas, maintenantLocal());
  const plan = inst ? planifier({ table: inst.table, maintenant: inst.maintenant, taches: tachesDuMenu() }) : null;
  if (plan) planCourant = { plan, convives: repas.convives };
  const versions = new Map(list.map(({ e, r }) => [e.k, versionSummary(r, e)]));
  return plan ? retroHtml(plan, inst, versions) : `<p class="retro-note">Indique l'heure du repas pour voir quand t'y mettre.</p>`;
}

/* Redessiner sur place, sans revenir en haut de page ni perdre le focus clavier. */
function redessiner({ rejouer = [], arrivee = false } = {}) {
  const y = window.scrollY;
  // Les nombres que le redessin va changer : leur texte d'avant, pour que le chiffre roule.
  const avant = rejouer.map(sel => [sel, document.querySelector(sel)?.textContent]);
  enRedessin = !arrivee;   // une arrivée (l'état vide après un menu vidé) rejoue ses entrées
  try { garderFocus(app, renderMenu); } finally { enRedessin = false; }
  window.scrollTo(0, y);
  avant.forEach(([sel, texte]) => { if (texte) rejouerNombre(document.querySelector(sel), texte); });
}

const carteDe = k => document.querySelector(`#menu-root .menu-card[data-open="${CSS.escape(k)}"]`);
const nombresDesCartes = () => menuEntrees().map(({ e }) => `.menu-card[data-open="${CSS.escape(e.k)}"] .mc-portions .val`);

/* La frise, les phrases d'en-tête, bref ce que le menu dit de ses cartes, mis à jour sans
   redessiner la page : une carte qui part ou qui revient ne doit pas faire sauter les autres. */
function majPartiel() {
  const racine = document.getElementById("menu-root");
  const list = menuEntrees();
  if (!racine || !list.length) return;
  racine.querySelector("#menu-entete").textContent = enteteMenu(list, courseTodo());
  racine.querySelector("#menu-ordre").hidden = list.length < 2;
  const zone = racine.querySelector("#retro-zone");
  zone.innerHTML = retroZone(list, lireRepas());
  activerRetro(zone, "fondu");
}

function brancher() {
  const racine = document.getElementById("menu-root");
  racine.querySelector("#alg")?.addEventListener("toggle", e => { ouvert.allergies = e.target.open; });
  racine.querySelector("#passes")?.addEventListener("toggle", e => { ouvert.passes = e.target.open; });

  racine.addEventListener("click", e => {
    onShareClick(e);
    // Les repas passés qu'on déplie arrivent l'un après l'autre (jamais à un redessin qui les rend ouverts).
    const resume = e.target.closest("#passes > summary");
    if (resume && !resume.parentElement.open) resume.parentElement.classList.add("vient");
    const rm = e.target.closest("[data-remove]");
    if (rm) return retirer(rm.dataset.remove);
    const mom = e.target.closest("[data-moment]");
    if (mom) { state.filter = mom.dataset.moment; save(); location.hash = "#/"; return; }
    const conv = e.target.closest("[data-conv]");
    if (conv) {
      const n = lireRepas().convives + Number(conv.dataset.conv);
      if (n < 1 || n > CONVIVES_MAX) { secouer(conv.closest(".portions")); return; }
      // Les convives changent peut-être les portions des cartes : leurs chiffres roulent aussi.
      setConvives(n); updateBadge(); redessiner({ rejouer: ["#rp-conv-val", ...nombresDesCartes()] });
      // La vue est redessinée : une région live posée dedans ne dirait rien.
      annoncer(pluriel(n, "convive"));
      return;
    }
    const exclu = e.target.closest("[data-exclu]");
    if (exclu) { basculerExclu(exclu.dataset.exclu); redessiner(); return; }
    if (e.target.closest("[data-date-clear]")) { setDateRepas(""); redessiner(); return; }
    const cal = e.target.closest("#ajout-calendrier");
    if (cal) { ajouterAuCalendrier().then(ok => { if (ok) confirmerCalendrier(cal); }); return; }
    const refaire = e.target.closest("[data-refaire]");
    if (refaire) return remettreLeRepas(refaire.dataset.refaire);
    const step = e.target.closest("[data-minus], [data-plus]");
    if (step) {
      const ent = entreeDe(step.dataset.minus || step.dataset.plus);
      const r = ent && byId(ent.rid);
      if (!r) return;
      const p = portionsOf(r, ent) + (step.dataset.plus ? 1 : -1);
      if (p < PORTIONS_MIN || p > PORTIONS_MAX) { secouer(step.closest(".portions")); return; }
      ent.portions = p;
      save(); updateBadge(); redessiner({ rejouer: [`.menu-card[data-open="${CSS.escape(ent.k)}"] .mc-portions .val`] });
      annoncer(`${r.title} : ${libellePortions(p, r.portions.label)}`);
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
      /* Redessiner la vue entière referait le champ : au clavier, le curseur
         repartirait sur le segment des heures à chaque minute changée. */
      setHeureRepas(e.target.value);
      const zone = document.getElementById("retro-zone");
      if (zone) {
        zone.innerHTML = retroZone(menuEntrees(), lireRepas());
        activerRetro(zone, "fondu");   // un fondu court, pas un nouveau tracé à chaque minute changée
      } else redessiner();
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

/* Les cartes retirées se replient (glisser, puis hauteur) : les autres, et tout ce qui
   suit, remontent avec elles. La frise et les phrases d'en-tête sont mises à jour sur
   place. Menu vidé, la page de l'état vide arrive une fois le repli fini. En mouvement
   réduit, on redessine comme avant. */
function sortirCartes(cartes) {
  const racine = document.getElementById("menu-root");
  const sortantes = cartes.filter(Boolean);
  if (!racine || !sortantes.length || mouvementReduit()) return redessiner();
  // Le focus qu'une carte portait revient à sa voisine (sortir() le laisse à l'appelant).
  if (sortantes.some(c => c.contains(document.activeElement))) {
    const voisine = [...racine.querySelectorAll(".menu-card")].find(c => !sortantes.includes(c) && !c.inert);
    const cible = voisine?.querySelector(".mc-x") ?? racine.querySelector("h1");
    if (cible && !cible.matches("button, a, input")) cible.setAttribute("tabindex", "-1");
    cible?.focus({ preventScroll: true });
  }
  const finies = sortantes.map(c => sortir(c));
  if (menuEntrees().length) majPartiel();
  else Promise.all(finies).then(() => { if (document.getElementById("menu-root") && !menuEntrees().length) redessiner({ arrivee: true }); });
}

/* Annuler : la carte revient à sa place avec un ressort, les autres s'écartent (flip). */
function revenirCarte(k) {
  updateBadge();
  const racine = document.getElementById("menu-root");
  if (!racine) return;
  const liste = menuEntrees();
  const rang = liste.findIndex(x => x.e.k === k);
  const cont = racine.querySelector(".menu-list");
  const retour = carte => animer(carte, [{ opacity: 0, scale: "0.9", translate: "0 -12px" }], { easing: "ressort", cle: "retour", reprise: false });
  if (rang < 0 || !cont || mouvementReduit() || carteDe(k)) {
    redessiner();
    const c = carteDe(k);
    if (c) retour(c);
    return;
  }
  const gabarit = document.createElement("template");
  enRedessin = true;
  try { gabarit.innerHTML = carteHtml(liste[rang], lireRepas()); } finally { enRedessin = false; }
  const carte = gabarit.content.firstElementChild;
  const vivantes = [...cont.children].filter(c => !c.inert);
  flip(cont, () => cont.insertBefore(carte, vivantes[rang] ?? null), { arrivees: false });
  retour(carte);
  majPartiel();
}

/* Annuler un menu vidé : toutes les cartes reviennent, l'une après l'autre. */
function revenirTout() {
  updateBadge();
  if (!document.getElementById("menu-root")) return;
  redessiner();
  document.querySelectorAll("#menu-root .menu-card").forEach((c, i) => {
    animer(c, [{ opacity: 0, scale: "0.94", translate: "0 10px" }], { easing: "ressort", delai: Math.min(i, 7) * 35, cle: "retour", reprise: false });
  });
}

function retirer(k) {
  const retire = retirerDuMenu(k);
  if (!retire) return;
  updateBadge();
  vibrer("tic");
  sortirCartes([carteDe(k)]);
  toast("Retiré du menu", { action: "Annuler", surAction: () => { remettreAuMenu(retire); revenirCarte(retire.e.k); } });
}

function vider() {
  const avant = viderLeMenu();
  updateBadge();
  sortirCartes([...document.querySelectorAll("#menu-root .menu-card")]);
  toast("Menu vidé", { action: "Annuler", surAction: () => { restaurerMenu(avant); revenirTout(); } });
}

/* « Ajouter au calendrier » a réussi : la coche se trace dans le bouton, puis il se remet. */
function confirmerCalendrier(bouton) {
  const avant = bouton.innerHTML;
  bouton.classList.add("trace", "fait");
  bouton.innerHTML = `${COCHE_TRACEE} Ajouté au calendrier`;
  vibrer("tic");
  annoncer("Ajouté au calendrier");
  setTimeout(() => {
    if (!bouton.isConnected) return;
    bouton.classList.remove("trace", "fait");
    bouton.innerHTML = avant;
    animer(bouton, [{ opacity: 0.35 }], { duree: "courte", cle: "libelle", reprise: false });
  }, 2200);
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
