/* La fiche d'une recette : ingrédients à l'échelle, composition de la version, étapes, ajout au menu. */

import { save, state } from "../core/etat.js";
import { fmtQty, fmtUnit, scaleQty, scaleText, timeText } from "../core/format.js";
import { ICON } from "../core/icones.js";
import {
  ajouterAuMenu,
  entreeCourante,
  entreesDe,
  retirerDuMenu,
  setChoice,
  toggleAddon
} from "../core/menu.js";
import {
  VERDICTS,
  addonList,
  addonTime,
  choiceList,
  cookedText,
  customizable,
  effectiveIngredients,
  effectiveSteps,
  optionOf,
  selectedAddons,
  verdictOf
} from "../core/recettes.js";
import { cleCuisine, cookHref, cookingStep, forgetCooking } from "../core/seance.js";
import { fermerFeuille, ouvrirFeuille } from "../ui/feuilles.js";
import { shareRecipe } from "../ui/partage.js";
import { allerEnRemplacant, app } from "../ui/routeur.js";
import { toast, updateBadge } from "../ui/toast.js";
import { visuel } from "../ui/visuel.js";
import { burstHeart, discoveredHtml } from "./accueil.js";
import { astuceHtml, savoirsHtml } from "./savoirs.js";

/* Le geste d'un supplément, affiché dans l'étape concernée.
   En mode cuisine (`cuisine`), un supplément minuté reçoit sa propre zone de
   compte à rebours ; la fiche recette, elle, ne propose jamais de minuteur. */
export const extrasHtml = (s, cuisine) => (s.extras || []).map(x => {
  const sav = savoirsHtml(x);
  return `<div class="addon-note${sav ? " a-savoirs" : ""}">
    <span class="a-emoji">${x.emoji || "✚"}</span>
    <div class="a-body"><b>${x.label}</b>${x.txt}
      ${sav}
      ${cuisine && x.timer ? `<div class="addon-timer" data-slot="${x.id}"></div>` : ""}
    </div>
  </div>`;
}).join("");

/* Chips de sélection, partagées entre la page recette et la sheet d'ajout. */
export const pickChipsHtml = r => `
  ${choiceList(r).map(c => `
    <p class="pick-label">${c.label}</p>
    <div class="pick-row">${c.options.map(o => `
      <button class="chip pick ${optionOf(r, c).id === o.id ? "on" : ""}" data-choice="${c.id}" data-option="${o.id}" aria-pressed="${optionOf(r, c).id === o.id}">${o.emoji ? o.emoji + " " : ""}${o.label}</button>`).join("")}
    </div>`).join("")}
  ${addonList(r).length ? `
    <p class="pick-label">Les petits plus</p>
    <div class="pick-row">${addonList(r).map(a => {
      const on = selectedAddons(r).some(x => x.id === a.id);
      return `<button class="chip pick ${on ? "on" : ""}" data-addon="${a.id}" aria-pressed="${on}">${a.emoji ? a.emoji + " " : ""}${a.label}</button>`;
    }).join("")}
    </div>` : ""}`;

/* Applique un tap sur une chip (choix ou supplément). Renvoie true si l'état a changé. */
export function onPickClick(e, r) {
  const oc = e.target.closest("[data-choice]");
  if (oc) { setChoice(r.id, oc.dataset.choice, oc.dataset.option); return true; }
  const oa = e.target.closest("[data-addon]");
  if (oa) { toggleAddon(r.id, oa.dataset.addon); return true; }
  return false;
}

/* La sheet « façon fast-food » à l'ajout au menu : composer, ou ajouter tel quel. */
export function openAddSheet(r, done) {
  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop";
  backdrop.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Composer ${r.title}">
      <div class="sheet-grip"></div>
      <h3>${r.emoji} Des envies en plus ?</h3>
      <p class="sheet-sub">Compose ta version — ou ajoute la recette telle quelle.</p>
      <div class="sheet-picks">${pickChipsHtml(r)}</div>
      <button class="btn primary sheet-add" id="sheet-add"></button>
    </div>`;
  const picks = backdrop.querySelector(".sheet-picks");
  const valider = backdrop.querySelector("#sheet-add");

  /* On ne réécrit que les chips et le libellé du bouton. Refaire la sheet
     entière rejouerait son animation d'entrée à chaque supplément coché, et
     la ferait remonter en haut alors qu'on vient d'y descendre. */
  const rafraichir = () => {
    const n = selectedAddons(r).length;
    valider.innerHTML = `${ICON.cart} ${n ? `Ajouter avec ${n} supplément${n > 1 ? "s" : ""}` : "Ajouter tel quel"}`;
  };

  /* Le résultat est retenu, puis rendu au moment où la feuille est réellement
     retirée — que ce soit par le bouton, par le fond, ou par le geste de retour. */
  let resultat = false;
  const close = added => { resultat = added; fermerFeuille(); };
  backdrop.addEventListener("click", e => {
    if (e.target === backdrop) return close(false);
    if (e.target.closest("#sheet-add")) return close(true);
    if (onPickClick(e, r)) { picks.innerHTML = pickChipsHtml(r); rafraichir(); }
  });
  rafraichir();
  ouvrirFeuille(backdrop, () => done(resultat));
}

export function renderRecipe(r) {
  // Étape 1 : rien à reprendre, « Mode cuisine » y mène déjà.
  const resume = cookingStep(r) || null;
  const t = r.times;
  app.innerHTML = `
    <div class="topbar fade-in">
      <a class="btn-icon" href="#/" data-retour="#/">${ICON.back} Recettes</a>
      <button class="btn-icon" id="share-recipe">${ICON.share} Partager</button>
    </div>
    <div class="hero"><div class="visual" style="background:${r.color}33">
      ${r.image ? "" : `<span class="corner tl">${ILLO.D.corner}</span><span class="corner tr">${ILLO.D.corner}</span><span class="corner bl">${ILLO.D.corner}</span><span class="corner br">${ILLO.D.corner}</span>`}
      ${visuel(r, { genre: "hero", eager: true })}
    </div></div>
    <div class="r-head">
      <h1>${r.title}</h1>
      <p class="subtitle">${r.subtitle}</p>
      ${discoveredHtml(r)}
      <div class="timerow">
        ${t.prep || addonTime(r, "prep") ? `<span class="timechip">${ICON.knife} Préparation : ${timeText(t.prep || 0, addonTime(r, "prep"))}</span>` : ""}
        ${t.repos || addonTime(r, "repos") ? `<span class="timechip">${ICON.zzz} ${r.reposLabel || "Repos"} : ${timeText(t.repos || 0, addonTime(r, "repos"))}</span>` : ""}
        ${t.cuisson != null || addonTime(r, "cuisson") ? `<span class="timechip">${ICON.flame} Cuisson : ${timeText(t.cuisson || 0, addonTime(r, "cuisson"))}</span>` : `<span class="timechip">${ICON.flame} Sans cuisson</span>`}
      </div>
    </div>

    <section class="section">
      <h2><span class="h-title"><span class="h-deco">${ILLO.D.leaf}</span>Ingrédients</span>
        <span class="portions">
          <button id="p-minus" aria-label="Moins de portions">−</button>
          <span class="val" id="p-val"></span>
          <button id="p-plus" aria-label="Plus de portions">+</button>
        </span>
      </h2>
      <ul class="ing-list" id="ing-list"></ul>
    </section>

    ${customizable(r) ? `
    <section class="section">
      <h2><span class="h-title"><span class="h-deco">${ILLO.D.leaf}</span>Composez votre version</span></h2>
      <div id="pick-zone"></div>
    </section>` : ""}

    <section class="section">
      <h2><span class="h-title"><span class="h-deco">${ILLO.D.toque}</span>Préparation</span></h2>
      <ol class="steps" id="steps-list"></ol>
    </section>

    ${r.note ? `<p class="recipe-note">« ${r.note} »<span class="n-heart">${ILLO.D.heart}</span><span class="n-flourish">${ILLO.D.flourish}</span></p>` : ""}

    <section class="section verdict">
      <h2>Un coup de cœur ?</h2>
      <div class="verdict-row" id="verdict-row"></div>
      <p class="cooked-line" id="cooked-line"></p>
    </section>

    <div class="actions">
      <button class="btn secondary" id="add-list"></button>
      <a class="btn primary ${resume ? "resume" : ""}" href="${cookHref(r)}">${ICON.chef}
        ${resume ? `<span>Reprendre<small>étape ${resume + 1} / ${r.steps.length}</small></span>` : "Mode cuisine"}
      </a>
    </div>
    ${resume ? `<button class="link-restart" id="restart-cook">Repartir du début</button>` : ""}
    <p class="menu-info" id="menu-info"></p>
  `;

  const drawIngredients = () => {
    const p = state.portions[r.id] || r.portions.base;
    const f = p / r.portions.base;
    document.getElementById("p-val").textContent = `${p} ${r.portions.label}`;
    document.getElementById("ing-list").innerHTML = effectiveIngredients(r).map(ing => {
      const q = scaleQty(ing.qty, ing.unit, f);
      const qtyStr = q != null ? `${fmtQty(q)} ${fmtUnit(ing.unit, q)}`.trim() : (ing.qtyText || "—");
      return `<li>
        <span class="qty">${qtyStr}</span>
        <span>${ing.name}${ing.addon ? `<span class="opt sup">supplément</span>` : ""}${ing.optional ? `<span class="opt">optionnel</span>` : ""}${ing.note ? `<span class="note"> — ${scaleText(ing.note, f)}</span>` : ""}</span>
      </li>`;
    }).join("");
  };

  const drawSteps = () => {
    const f = (state.portions[r.id] || r.portions.base) / r.portions.base;
    document.getElementById("steps-list").innerHTML = effectiveSteps(r).map((s, i) => `
      <li>
        <span class="num">${i + 1}</span>
        <div>
          <h3>${s.t}</h3>
          <p>${scaleText(s.txt, f)}</p>
          ${scaleText(extrasHtml(s), f)}
          ${scaleText(astuceHtml(s), f)}
        </div>
      </li>`).join("");
  };

  const drawPicks = () => {
    const zone = document.getElementById("pick-zone");
    if (zone) zone.innerHTML = pickChipsHtml(r);
  };

  const drawVersion = () => { drawIngredients(); drawSteps(); drawPicks(); };

  if (customizable(r)) {
    document.getElementById("pick-zone").addEventListener("click", e => {
      if (onPickClick(e, r)) { drawVersion(); updateBadge(); }
    });
  }

  /* Les étapes citent elles aussi des quantités : elles se redessinent avec la
     liste d'ingrédients, sinon les deux se contrediraient. */
  const setPortions = p => { state.portions[r.id] = p; save(); drawIngredients(); drawSteps(); };
  document.getElementById("p-minus").addEventListener("click", () => {
    const p = state.portions[r.id] || r.portions.base;
    if (p > 1) setPortions(p - 1);
  });
  document.getElementById("p-plus").addEventListener("click", () => {
    const p = state.portions[r.id] || r.portions.base;
    if (p < 24) setPortions(p + 1);
  });
  const addBtn = document.getElementById("add-list");
  const info = document.getElementById("menu-info");

  /* Sur une entrée de menu, le bouton la retire. Sur la fiche nue, il AJOUTE —
     toujours, jamais en bascule : c'est ce qui permet deux cakes au menu, l'un
     aux olives, l'autre aux lardons. On retire depuis le menu ou depuis
     l'entrée elle-même. */
  const drawAddBtn = () => {
    const n = entreesDe(r.id).length;
    if (entreeCourante()) {
      addBtn.className = "btn added";
      addBtn.innerHTML = `${ICON.check} Au menu`;
      info.innerHTML = `Vous composez la version qui est au menu. <button class="lien-nu" id="menu-retirer">La retirer</button>`;
    } else {
      addBtn.className = n ? "btn added" : "btn secondary";
      addBtn.innerHTML = n ? `${ICON.cart} Ajouter une autre version` : `${ICON.cart} Ajouter au menu`;
      info.innerHTML = n
        ? `${n} version${n > 1 ? "s" : ""} de cette recette déjà <a href="#/menu">au menu</a>.`
        : "";
    }
    const x = document.getElementById("menu-retirer");
    if (x) x.addEventListener("click", () => {
      retirerDuMenu(entreeCourante());
      updateBadge();
      toast("Retirée du menu");
      allerEnRemplacant(`#/recette/${r.id}`);
    });
  };

  const ajouter = () => {
    const n = selectedAddons(r).length;
    ajouterAuMenu(r.id);
    updateBadge();
    /* La composition vient d'être mise de côté dans l'entrée : le brouillon
       repart à neuf, sinon « ajouter une autre version » hériterait en silence
       des suppléments de la précédente — deux cakes qui n'en font qu'un. */
    delete state.choices[r.id]; delete state.addons[r.id]; delete state.portions[r.id];
    save();
    drawVersion(); drawAddBtn();
    const combien = entreesDe(r.id).length;
    toast(combien > 1
      ? `Deuxième version au menu — courses à jour`
      : n ? `Au menu avec ${n} supplément${n > 1 ? "s" : ""} — courses à jour`
          : "Au menu — ingrédients ajoutés aux courses");
  };

  drawAddBtn();

  addBtn.addEventListener("click", () => {
    if (entreeCourante()) return;           // déjà au menu : on retire par le lien
    if (!customizable(r)) return ajouter();
    /* Façon fast-food : composer sa version, ou ajouter tel quel d'un tap. */
    openAddSheet(r, added => {
      drawVersion(); updateBadge();
      if (added) ajouter();
    });
  });

  document.getElementById("share-recipe").addEventListener("click", () => shareRecipe(r.id));

  if (resume) document.getElementById("restart-cook").addEventListener("click", () => {
    forgetCooking(cleCuisine(r));
    location.hash = `#/recette/${r.id}/cuisine`;
  });

  const drawVerdict = () => {
    const cur = verdictOf(r);
    document.getElementById("verdict-row").innerHTML = VERDICTS.map(v => `
      <button class="verdict-btn ${cur === v.id ? "on v-" + v.id : ""}" data-verdict="${v.id}" aria-pressed="${cur === v.id}"><span class="vb-heart">♥</span> ${v.label.replace(/^♥\s*/, "")}</button>
    `).join("");
    document.getElementById("cooked-line").textContent = cookedText(r.id);
  };

  document.getElementById("verdict-row").addEventListener("click", e => {
    const b = e.target.closest("[data-verdict]");
    if (!b) return;
    const v = b.dataset.verdict;
    const activating = state.notes[r.id] !== v;
    if (!activating) {
      delete state.notes[r.id];
      toast("Coup de cœur retiré");
    } else {
      state.notes[r.id] = v;
      toast("Un coup de cœur de plus ♥");
    }
    save(); drawVerdict();
    if (activating) {
      const btn = document.querySelector(`#verdict-row [data-verdict="${v}"]`);
      if (btn) burstHeart(btn);
    }
  });

  drawVersion();
  drawVerdict();
}
