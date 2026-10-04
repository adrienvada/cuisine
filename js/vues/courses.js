/* L'onglet Courses : la liste par rayon, son panier, le placard, l'ordre des rayons, la provenance des quantités, les articles libres et le partage. */

import { buildCourseList, courseQtyStr, deplacerRayon, elaguerCoches, quantiteTexte, rayonsOrdonnes, reinitialiserOrdreRayons } from "../core/courses.js";
import { save, state, surSauvegarde } from "../core/etat.js";
import { html, raw } from "../core/html.js";
import { ICON } from "../core/icones.js";
import { basiquesManquants, menuEntrees, resetHints } from "../core/menu.js";
import { garderFocus } from "../ui/focus.js";
import { shareOrCopy } from "../ui/partage.js";
import { app } from "../ui/routeur.js";
import { REDUCE_MOTION } from "../ui/theme.js";
import { toast, updateBadge } from "../ui/toast.js";

/* L'élagage des coches doit tourner même quand l'onglet n'est pas affiché
   (on vide le menu depuis l'onglet Au menu) : il s'abonne donc au chargement de
   la vue, qui n'est jamais en cycle avec l'état au moment où elle s'évalue — ce
   que serait le module core/courses.js, importé par celui du menu. */
surSauvegarde(elaguerCoches);

/* Ce que la vue retient d'un dessin à l'autre : le mode de rangement, le panier
   ouvert ou fermé, les articles dont la provenance est dépliée. */
let modeRanger = false;
let panierOuvert = false;
const depliees = new Set();
let delaiPanier = null;

const CHEV_HAUT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>';
const CHEV_BAS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

const articleLibre = nom => state.extras.push({ id: Date.now().toString(36), name: nom });

/* Redessine sans perdre la place où l'on en était : cocher un article le fait
   changer de bloc, la page ne doit pas pour autant remonter, et le clavier doit
   garder sa place (la case cochée, le bouton de rayon déplacé). */
function redessiner() {
  const y = window.scrollY;
  garderFocus(app, renderCourses);
  window.scrollTo(0, y);
}

/* La liste telle qu'elle s'affiche : les articles en rayons à acheter, ceux du
   placard à part, ceux déjà cochés dans le panier. Les articles libres vont
   dans « Autre ». */
function composerListe() {
  const items = buildCourseList();
  const libres = state.extras.map(x => ({ key: "x-" + x.id, label: x.name, rayon: "Autre", extra: true, parts: [], textes: [], sources: [], notes: [] }));
  const aAcheter = [...items.filter(i => !i.placard), ...libres];
  const coche = i => !!state.checked[i.key];
  const rayons = rayonsOrdonnes().map(rayon => ({
    rayon,
    items: aAcheter.filter(i => i.rayon === rayon && !coche(i))
  })).filter(g => g.items.length);
  const ordre = rayonsOrdonnes();
  const parRayon = (a, b) => ordre.indexOf(a.rayon) - ordre.indexOf(b.rayon);
  return {
    rayons,
    placard: items.filter(i => i.placard).sort(parRayon),
    panier: aAcheter.filter(coche).sort(parRayon),
    total: aAcheter.length,
    // Les rayons qu'on peut ranger : ceux qui portent au moins un article, cochés ou non.
    rayonsPresents: ordre.filter(r => aAcheter.some(i => i.rayon === r))
  };
}

function ligne(it) {
  const coche = !!state.checked[it.key];
  const ouvert = depliees.has(it.key);
  const nom = it.extra
    ? html`<span class="nom">${it.label}</span>`
    : html`<button type="button" class="nom" data-origine="${it.key}" aria-expanded="${String(ouvert)}">${it.label}</button>`;
  return html`
    <li class="art${coche ? " cochee" : ""}" data-art="${it.key}">
      <label>
        <input type="checkbox" data-key="${it.key}" ${coche ? raw("checked") : ""}>
        <span class="tick">${raw(ICON.check)}</span>
        <span class="lbl">${raw(nom)}${it.addon ? raw(` <span class="sup-tag">supplément</span>`) : ""}${it.optional ? raw(` <span class="opt">optionnel</span>`) : ""}${it.notes && it.notes.length ? raw(html`<span class="cnote">${it.notes.join(" · ")}</span>`) : ""}</span>
        <span class="cqty">${it.extra ? "" : courseQtyStr(it)}</span>
        ${it.extra ? raw(html`<button class="x" data-remove-extra="${it.key.slice(2)}" aria-label="Supprimer ${it.label}">✕</button>`) : ""}
      </label>
      ${it.extra ? "" : raw(html`<ul class="origine" ${ouvert ? "" : raw("hidden")}>${it.sources.map(s => raw(html`<li>${s.titre}${quantiteTexte(s) ? ` — ${quantiteTexte(s)}` : ""}</li>`))}</ul>`)}
    </li>`;
}

const blocRayon = (titre, items, classe = "") => html`
  <section class="rayon ${classe}">
    <h2>${titre}</h2>
    <ul class="course-list">${items.map(it => raw(ligne(it)))}</ul>
  </section>`;

function ecranRanger(liste) {
  const mobiles = liste.rayonsPresents.filter(r => r !== "Autre");
  const nb = r => liste.rayons.find(g => g.rayon === r)?.items.length ?? 0;
  const total = r => [...liste.panier].filter(i => i.rayon === r).length + nb(r);
  return html`
    <section class="ranger">
      <h2>Ranger les rayons</h2>
      <p class="ranger-aide">Mets-les dans l'ordre de ton magasin : la liste suivra ton parcours.</p>
      <ol class="ranger-liste">
        ${mobiles.map((r, i) => raw(html`
          <li>
            <span class="r-nom">${r}<small>${total(r)} article${total(r) > 1 ? "s" : ""}</small></span>
            <button type="button" class="r-btn" data-deplacer="${r}" data-sens="-1" aria-label="Monter ${r}" ${i === 0 ? raw("disabled") : ""}>${raw(CHEV_HAUT)}</button>
            <button type="button" class="r-btn" data-deplacer="${r}" data-sens="1" aria-label="Descendre ${r}" ${i === mobiles.length - 1 ? raw("disabled") : ""}>${raw(CHEV_BAS)}</button>
          </li>`))}
        ${liste.rayonsPresents.includes("Autre") ? raw(html`<li class="r-fixe"><span class="r-nom">Autre<small>toujours en dernier</small></span></li>`) : ""}
      </ol>
      <div class="course-actions">
        <button type="button" class="btn primary" data-fin-ranger>Terminé</button>
      </div>
      <button type="button" class="link-danger" data-reinit-ordre>Remettre l'ordre d'origine</button>
    </section>`;
}

const ENTETE = () => html`
  <header class="page-head courses-head fade-in">
    <div class="head-branch">${raw(ILLO.D.olive)}</div>
    <h1>Liste de courses</h1>
  </header>`;

const FORMULAIRE = () => html`
  <form class="add-extra" id="extra-form">
    <input id="extra-input" type="text" placeholder="Ajouter un article (éponges, glaçons…)" autocomplete="off" aria-label="Ajouter un article">
    <button type="submit" aria-label="Ajouter">+</button>
  </form>`;

export function renderCourses() {
  elaguerCoches();
  const ids = menuEntrees();
  const empty = !ids.length && !state.extras.length;

  if (empty) {
    modeRanger = false;
    app.innerHTML = html`
      <div id="courses-root">
      ${raw(ENTETE())}
      <div class="empty-illo cheers">${raw(ILLO.D.cheers)}</div>
      <p class="empty">Ta liste est vide.<br>Ouvre une recette et touche <span class="nowrap">« Ajouter »</span> : les ingrédients se rangeront tout seuls par rayon, quantités fusionnées.<br>Ou ajoute directement un article ci-dessous.</p>
      <div style="text-align:center;margin-bottom:14px"><a class="btn-icon" href="#/">${raw(ICON.back)} Voir les recettes</a></div>
      ${raw(FORMULAIRE())}
      </div>`;
    brancher();
    return;
  }

  const liste = composerListe();
  if (modeRanger && liste.rayonsPresents.filter(r => r !== "Autre").length < 2) modeRanger = false;
  const faits = liste.total - liste.rayons.reduce((n, g) => n + g.items.length, 0);
  const pct = liste.total ? Math.round(faits / liste.total * 100) : 0;
  const basiques = basiquesManquants();
  const nbCoches = Object.keys(state.checked).length;
  const rangeable = liste.rayonsPresents.filter(r => r !== "Autre").length >= 2;

  app.innerHTML = html`
    <div id="courses-root">
    ${raw(ENTETE())}
    ${ids.length
      ? raw(html`<p class="menu-ligne"><span>${ids.length} recette${ids.length > 1 ? "s" : ""} au menu</span> · <a href="#/menu">Modifier</a></p>`)
      : raw(`<p class="menu-ligne">Articles ajoutés à la main</p>`)}
    ${modeRanger ? raw(ecranRanger(liste)) : raw(html`
      ${liste.total ? raw(html`
      <div class="avance-bloc">
        <div class="avance" role="progressbar" aria-label="Avancement des courses" aria-valuemin="0" aria-valuemax="${liste.total}" aria-valuenow="${faits}"><span style="width:${pct}%"></span></div>
        <p class="avance-txt"><strong>${faits} / ${liste.total}</strong></p>
      </div>`) : ""}
      ${liste.total || liste.placard.length ? raw(html`
      <div class="outils">
        ${rangeable ? raw(`<button type="button" class="lien-outil" data-ranger>Ranger les rayons</button>`) : ""}
        ${nbCoches ? raw(`<button type="button" class="lien-outil" data-decocher>Tout décocher</button>`) : ""}
      </div>`) : ""}
      ${liste.rayons.map(g => raw(blocRayon(g.rayon, g.items)))}
      ${liste.total && !liste.rayons.length ? raw(`<p class="fini">Tout est dans le panier.</p>`) : ""}
      ${liste.placard.length ? raw(html`
        <section class="rayon placard">
          <h2>À vérifier au placard</h2>
          <p class="placard-aide">Coche ce que tu as déjà : ça ne compte pas dans ce qu'il te reste à acheter.</p>
          <ul class="course-list">${liste.placard.map(it => raw(ligne(it)))}</ul>
        </section>`) : ""}
      ${liste.panier.length ? raw(html`
        <details class="panier" ${panierOuvert ? raw("open") : ""}>
          <summary>Dans le panier (${liste.panier.length})</summary>
          <ul class="course-list">${liste.panier.map(it => raw(ligne(it)))}</ul>
        </details>`) : ""}
      ${basiques.length ? raw(html`
      <p class="menu-hint">
        <span class="mh-txt">Pour la table, pense peut-être à</span>
        ${basiques.map(b => raw(html`<button class="mh-chip" data-basique="${b.article}">${b.chip}</button>`))}
        <button class="mh-x" data-hint-off aria-label="Ne plus proposer">✕</button>
      </p>`) : ""}
      ${raw(FORMULAIRE())}
      <div class="course-actions">
        <button class="btn secondary" id="share">${raw(ICON.share)} Partager la liste</button>
      </div>
      <button class="link-danger" id="clear">Vider la liste</button>`)}
    </div>`;
  brancher();
}

/* Ce qu'on peut défaire d'un geste : un message avec « Annuler » plutôt qu'une
   confirmation qui coupe la course. */
function viderListe() {
  const avant = { menu: structuredClone(state.menu), checked: { ...state.checked }, extras: structuredClone(state.extras), hint: state.hintCoursesOff };
  state.menu = []; state.checked = {}; state.extras = [];
  resetHints();
  save(); updateBadge(); depliees.clear(); redessiner();
  toast("Liste vidée", {
    action: "Annuler",
    surAction: () => {
      state.menu = avant.menu; state.checked = avant.checked; state.extras = avant.extras;
      state.hintCoursesOff = avant.hint;
      save(); updateBadge(); rendreSiAffichee();
    }
  });
}

function supprimerArticleLibre(id) {
  const i = state.extras.findIndex(x => x.id === id);
  if (i < 0) return;
  const [x] = state.extras.splice(i, 1);
  const cle = "x-" + id;
  const etaitCoche = !!state.checked[cle];
  delete state.checked[cle];
  save(); updateBadge(); redessiner();
  toast(`« ${x.name} » retiré`, {
    action: "Annuler",
    surAction: () => {
      state.extras.splice(Math.min(i, state.extras.length), 0, x);
      if (etaitCoche) state.checked[cle] = true;
      save(); updateBadge(); rendreSiAffichee();
    }
  });
}

function toutDecocher() {
  const avant = { ...state.checked };
  state.checked = {};
  save(); updateBadge(); redessiner();
  toast("Tout est décoché", {
    action: "Annuler",
    surAction: () => { state.checked = avant; save(); updateBadge(); rendreSiAffichee(); }
  });
}

/* Un « Annuler » peut tomber après un changement d'onglet : on ne redessine que si la liste est là. */
function rendreSiAffichee() {
  if (document.getElementById("courses-root")) redessiner();
}

function brancher() {
  const root = document.getElementById("courses-root");
  root.addEventListener("change", surCoche);
  root.addEventListener("click", surClic);
  root.addEventListener("toggle", e => {
    if (e.target.matches("details.panier")) panierOuvert = e.target.open;
  }, true);

  /* Le formulaire manque à l'écran de rangement : on ne branche que ce qui existe. */
  const formulaire = document.getElementById("extra-form");
  if (formulaire) formulaire.addEventListener("submit", e => {
    e.preventDefault();
    const v = document.getElementById("extra-input").value.trim();
    if (!v) return;
    articleLibre(v);
    save(); updateBadge(); redessiner();
  });

  const partage = document.getElementById("share");
  if (partage) partage.addEventListener("click", shareList);
  const vider = document.getElementById("clear");
  if (vider) vider.addEventListener("click", viderListe);
}

/* L'article change de bloc : on laisse la coche se voir un instant avant qu'il
   parte au panier (ou qu'il remonte dans son rayon), sauf pour qui préfère
   moins de mouvement. */
function surCoche(e) {
  const cb = e.target.closest("input[data-key]");
  if (!cb) return;
  if (cb.checked) state.checked[cb.dataset.key] = true;
  else delete state.checked[cb.dataset.key];
  save(); updateBadge();
  clearTimeout(delaiPanier);
  if (REDUCE_MOTION.matches) { redessiner(); return; }
  cb.closest("li.art").classList.add("part");
  delaiPanier = setTimeout(rendreSiAffichee, 260);
}

function surClic(e) {
  const t = e.target;
  const origine = t.closest("[data-origine]");
  if (origine) {
    e.preventDefault();
    const cle = origine.dataset.origine;
    const ouvert = !depliees.has(cle);
    if (ouvert) depliees.add(cle); else depliees.delete(cle);
    origine.setAttribute("aria-expanded", String(ouvert));
    origine.closest("li.art").querySelector(".origine").hidden = !ouvert;
    return;
  }
  const bas = t.closest("[data-basique]");
  if (bas) {
    articleLibre(bas.dataset.basique);
    save(); updateBadge(); redessiner();
    return;
  }
  if (t.closest("[data-hint-off]")) { state.hintCoursesOff = true; save(); redessiner(); return; }
  const rx = t.closest("[data-remove-extra]");
  if (rx) {
    e.preventDefault();
    supprimerArticleLibre(rx.dataset.removeExtra);
    return;
  }
  if (t.closest("[data-decocher]")) { toutDecocher(); return; }
  /* Le bouton qu'on vient de toucher disparaît avec son écran : le focus passe à son pendant. */
  if (t.closest("[data-ranger]")) {
    modeRanger = true; redessiner();
    document.querySelector("[data-fin-ranger]")?.focus({ preventScroll: true });
    return;
  }
  if (t.closest("[data-fin-ranger]")) {
    modeRanger = false; redessiner(); window.scrollTo(0, 0);
    document.querySelector("[data-ranger]")?.focus({ preventScroll: true });
    return;
  }
  if (t.closest("[data-reinit-ordre]")) { reinitialiserOrdreRayons(); redessiner(); return; }
  const dep = t.closest("[data-deplacer]");
  if (dep) {
    const nom = dep.dataset.deplacer, sens = Number(dep.dataset.sens);
    deplacerRayon(nom, sens, composerListe().rayonsPresents);
    // Le doigt reste sur le rayon qu'il déplace : garderFocus lui rend le même bouton (ou son pendant, au bout de la liste).
    redessiner();
  }
}

export function shareList() {
  elaguerCoches();
  const liste = composerListe();
  const lines = ["🛒 Liste de courses — Carnet de cuisine", ""];
  const ids = menuEntrees();
  if (ids.length) {
    lines.push("Menu : " + ids.map(({ r }) => r.title).join(", "), "");
  }
  const bloc = (titre, items) => {
    if (!items.length) return;
    lines.push(titre.toUpperCase());
    for (const it of items) {
      const q = it.parts.length || it.textes.length ? ` — ${courseQtyStr(it)}` : "";
      lines.push(`• ${it.label}${q}`);
    }
    lines.push("");
  };
  for (const g of liste.rayons) bloc(g.rayon, g.items);
  bloc("À vérifier", liste.placard.filter(i => !state.checked[i.key]));
  shareOrCopy({ title: "Liste de courses", text: lines.join("\n").trim() }, "Liste copiée !");
}
