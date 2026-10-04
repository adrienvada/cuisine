/* L'onglet Au menu : les recettes retenues, leurs portions, la structure d'un repas à compléter. */

import { courseTodo } from "../core/courses.js";
import { save, state } from "../core/etat.js";
import { ICON } from "../core/icones.js";
import {
  MOMENTS,
  catDuMoment,
  cibleDuMoment,
  entreeDe,
  menuEntrees,
  nbRecettes,
  portionsOf,
  resetHints,
  retirerDuMenu
} from "../core/menu.js";
import { VERDICTS, byId, cookedOf, totalTimeText, verdictOf, versionSummary } from "../core/recettes.js";
import { cookHref, cookingStep } from "../core/seance.js";
import { onShareClick, shareMenu } from "../ui/partage.js";
import { app } from "../ui/routeur.js";
import { updateBadge } from "../ui/toast.js";
import { visuel } from "../ui/visuel.js";

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

export function renderMenu() {
  const list = menuEntrees();

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
      <div style="text-align:center"><a class="btn-icon" href="#/">${ICON.back} Voir toutes les recettes</a></div>
      </div>
    `;
    document.getElementById("menu-root").addEventListener("click", e => {
      const mom = e.target.closest("[data-moment]");
      if (mom) { state.filter = mom.dataset.moment; save(); location.hash = "#/"; }
    });
    return;
  }

  const todo = courseTodo();
  app.innerHTML = `
    <div id="menu-root">
    <header class="page-head courses-head fade-in">
      <div class="head-branch">${ILLO.D.olive}</div>
      <h1>Au menu</h1>
      <p>${list.length} recette${list.length > 1 ? "s" : ""} · ${todo ? `${todo} article${todo > 1 ? "s" : ""} à prendre` : "courses terminées"}</p>
      ${list.length > 1 ? `<p class="menu-order">Dans l'ordre où s'y mettre : la plus longue en premier.</p>` : ""}
    </header>
    <div class="menu-list">
      ${list.map(({ e, r }) => {
        const c = cookedOf(r);
        const v = VERDICTS.find(x => x.id === verdictOf(r));
        const lien = `#/recette/${r.id}/m/${e.k}`;
        return `
        <article class="menu-card fade-in" data-open="${e.k}">
          <a class="mc-visual" style="background:${r.color}22" href="${lien}" aria-label="${r.title}">${visuel(r, { genre: "carre" })}</a>
          <div class="mc-body">
            <a class="mc-title" href="${lien}"><h3>${r.title}</h3></a>
            <div class="meta">${ICON.clock} ${totalTimeText(r)}
              ${v ? `<span class="verdict-tag v-${v.id}">${v.tag || v.label}</span>` : ""}
              ${c.count ? `<span class="cook-count">cuisinée ${c.count}×</span>` : ""}
            </div>
            ${versionSummary(r, e) ? `<p class="mc-version">${versionSummary(r, e)}</p>` : ""}
            <span class="portions mc-portions">
              <button data-minus="${e.k}" aria-label="Moins de portions">−</button>
              <span class="val">${portionsOf(r, e)} ${r.portions.label}</span>
              <button data-plus="${e.k}" aria-label="Plus de portions">+</button>
            </span>
            <div class="mc-actions">
              <a class="mc-btn" href="${cookHref(r, e.k)}">${ICON.chef} ${cookingStep(r, e.k) ? "Reprendre" : "Cuisiner"}</a>
              <button class="mc-btn" data-share="${r.id}">${ICON.share} Partager</button>
            </div>
          </div>
          <button class="mc-x" data-remove="${e.k}" aria-label="Retirer du menu">✕</button>
        </article>`;
      }).join("")}
    </div>
    <p class="sq-label">Compléter le repas</p>
    ${squeletteHtml()}
    <div class="course-actions">
      <button class="btn secondary" id="share-menu">${ICON.share} Partager le repas</button>
      <a class="btn primary" href="#/courses">${ICON.cart} Liste de courses</a>
    </div>
    <button class="link-danger" id="clear-menu">Vider le menu</button>
    </div>
  `;

  document.getElementById("menu-root").addEventListener("click", e => {
    onShareClick(e);
    const rm = e.target.closest("[data-remove]");
    if (rm) { retirerDuMenu(rm.dataset.remove); updateBadge(); renderMenu(); return; }
    const mom = e.target.closest("[data-moment]");
    if (mom) { state.filter = mom.dataset.moment; save(); location.hash = "#/"; return; }
    const step = e.target.closest("[data-minus], [data-plus]");
    if (step) {
      const ent = entreeDe(step.dataset.minus || step.dataset.plus);
      const r = ent && byId(ent.rid);
      if (!r) return;
      const p = portionsOf(r, ent) + (step.dataset.plus ? 1 : -1);
      if (p < 1 || p > 24) return;
      ent.portions = p;
      save(); updateBadge(); renderMenu();
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

  document.getElementById("share-menu").addEventListener("click", shareMenu);

  document.getElementById("clear-menu").addEventListener("click", () => {
    if (!confirm("Retirer toutes les recettes du menu ?\nLes articles ajoutés à la main resteront dans la liste de courses.")) return;
    state.menu = [];
    resetHints();
    save(); updateBadge(); renderMenu();
  });
}
