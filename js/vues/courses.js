/* L'onglet Courses : la liste par rayon, cochable, avec articles libres et partage. */

import { buildCourseList, courseQtyStr } from "../core/courses.js";
import { save, state } from "../core/etat.js";
import { ICON } from "../core/icones.js";
import { basiquesManquants, menuEntrees, portionsOf, resetHints, retirerDuMenu } from "../core/menu.js";
import { versionSummary } from "../core/recettes.js";
import { shareOrCopy } from "../ui/partage.js";
import { app } from "../ui/routeur.js";
import { updateBadge } from "../ui/toast.js";

export function renderCourses() {
  const ids = menuEntrees();
  const items = buildCourseList();
  const extras = state.extras;
  const empty = !ids.length && !extras.length;

  if (empty) {
    app.innerHTML = `
      <div id="courses-root">
      <header class="page-head courses-head fade-in">
        <div class="head-branch">${ILLO.D.olive}</div>
        <h1>Liste de courses</h1>
      </header>
      <div class="empty-illo cheers">${ILLO.D.cheers}</div>
      <p class="empty">Ta liste est vide.<br>Ouvre une recette et touche <span class="nowrap">« Ajouter au menu »</span> : les ingrédients se rangeront tout seuls par rayon, quantités fusionnées.<br>Ou ajoute directement un article ci-dessous.</p>
      <div style="text-align:center;margin-bottom:14px"><a class="btn-icon" href="#/">${ICON.back} Voir les recettes</a></div>
      <form class="add-extra" id="extra-form">
        <input id="extra-input" type="text" placeholder="Ajouter un article (éponges, glaçons…)" autocomplete="off">
        <button type="submit" aria-label="Ajouter">+</button>
      </form>
      </div>
    `;
    document.getElementById("extra-form").addEventListener("submit", e => {
      e.preventDefault();
      const v = document.getElementById("extra-input").value.trim();
      if (!v) return;
      state.extras.push({ id: Date.now().toString(36), name: v });
      save(); updateBadge(); renderCourses();
    });
    return;
  }

  const basiques = basiquesManquants();
  const grouped = RAYONS.map(rayon => ({
    rayon,
    items: [
      ...items.filter(i => i.rayon === rayon),
      ...(rayon === "Autre" ? extras.map(x => ({ key: "x-" + x.id, label: x.name, extra: true })) : [])
    ]
  })).filter(g => g.items.length);

  app.innerHTML = `
    <div id="courses-root">
    <header class="page-head courses-head fade-in">
      <div class="head-branch">${ILLO.D.olive}</div>
      <h1>Liste de courses</h1>
      <p>${ids.length ? `D'après les ${ids.length} recette${ids.length > 1 ? "s" : ""} du menu — quantités fusionnées par rayon` : "Articles ajoutés à la main"}</p>
    </header>
    <div class="menu-chips">
      ${ids.map(({ e, r }) => {
        const vs = versionSummary(r, e);
        return `<span class="menu-chip"><a href="#/recette/${r.id}/m/${e.k}" style="text-decoration:none;color:inherit">${r.emoji} ${r.title}${vs ? ` · ${vs}` : ""} · ${portionsOf(r, e)} ${r.portions.label}</a><button class="x" data-remove="${e.k}" aria-label="Retirer du menu">✕</button></span>`;
      }).join("")}
      ${ids.length ? `<a class="menu-chip menu-chip-link" href="#/menu">${ICON.chef} Au menu</a>` : ""}
    </div>
    ${grouped.map(g => `
      <section class="rayon">
        <h2>${g.rayon}</h2>
        <ul class="course-list">
          ${g.items.map(it => `
            <li><label>
              <input type="checkbox" data-key="${it.key}" ${state.checked[it.key] ? "checked" : ""}>
              <span class="tick">${ICON.check}</span>
              <span class="lbl">${it.label}${it.addon ? ` <span class="sup-tag">supplément</span>` : ""}${it.optional ? ` <span class="opt" style="font-size:11.5px;color:var(--gold)">optionnel</span>` : ""}${it.notes && it.notes.length ? `<span class="cnote">${it.notes.join(" · ")}</span>` : ""}</span>
              <span class="cqty">${it.extra ? "" : courseQtyStr(it)}</span>
              ${it.extra ? `<button class="x" data-remove-extra="${it.key.slice(2)}" aria-label="Supprimer">✕</button>` : ""}
            </label></li>`).join("")}
        </ul>
      </section>`).join("")}
    ${basiques.length ? `
    <p class="menu-hint">
      <span class="mh-txt">Pour la table, pense peut-être à</span>
      ${basiques.map(b => `<button class="mh-chip" data-basique="${b.article}">${b.chip}</button>`).join("")}
      <button class="mh-x" data-hint-off aria-label="Ne plus proposer">✕</button>
    </p>` : ""}
    <form class="add-extra" id="extra-form">
      <input id="extra-input" type="text" placeholder="Ajouter un article (éponges, glaçons…)" autocomplete="off">
      <button type="submit" aria-label="Ajouter">+</button>
    </form>
    <div class="course-actions">
      <button class="btn secondary" id="share">${ICON.share} Partager la liste</button>
    </div>
    <button class="link-danger" id="clear">Vider la liste</button>
    </div>
  `;

  const root = document.getElementById("courses-root");
  root.addEventListener("change", onCheck);
  root.addEventListener("click", onCourseClick);

  document.getElementById("extra-form").addEventListener("submit", e => {
    e.preventDefault();
    const v = document.getElementById("extra-input").value.trim();
    if (!v) return;
    state.extras.push({ id: Date.now().toString(36), name: v });
    save(); updateBadge(); renderCourses();
  });

  document.getElementById("share").addEventListener("click", shareList);

  document.getElementById("clear").addEventListener("click", () => {
    if (!confirm("Vider la liste de courses ?\nLe menu sera vidé lui aussi.")) return;
    state.menu = []; state.checked = {}; state.extras = [];
    resetHints();
    save(); updateBadge(); renderCourses();
  });

  function onCheck(e) {
    const cb = e.target.closest("input[data-key]");
    if (!cb) return;
    if (cb.checked) state.checked[cb.dataset.key] = true;
    else delete state.checked[cb.dataset.key];
    save(); updateBadge();
  }

  function onCourseClick(e) {
    const bas = e.target.closest("[data-basique]");
    if (bas) {
      state.extras.push({ id: Date.now().toString(36), name: bas.dataset.basique });
      save(); updateBadge(); renderCourses();
      return;
    }
    if (e.target.closest("[data-hint-off]")) { state.hintCoursesOff = true; save(); renderCourses(); return; }
    const rm = e.target.closest("[data-remove]");
    if (rm) {
      retirerDuMenu(rm.dataset.remove);
      updateBadge();
      renderCourses();
      return;
    }
    const rx = e.target.closest("[data-remove-extra]");
    if (rx) {
      e.preventDefault();
      state.extras = state.extras.filter(x => x.id !== rx.dataset.removeExtra);
      save(); updateBadge(); renderCourses();
    }
  }
}

export function shareList() {
  const items = buildCourseList();
  const lines = ["🛒 Liste de courses — Carnet de cuisine", ""];
  const ids = menuEntrees();
  if (ids.length) {
    lines.push("Menu : " + ids.map(({ r }) => r.title).join(", "), "");
  }
  for (const rayon of RAYONS) {
    const group = [
      ...items.filter(i => i.rayon === rayon && !state.checked[i.key]),
      ...(rayon === "Autre" ? state.extras.filter(x => !state.checked["x-" + x.id]).map(x => ({ label: x.name })) : [])
    ];
    if (!group.length) continue;
    lines.push(rayon.toUpperCase());
    for (const it of group) {
      const q = it.qty != null || it.qtyText ? ` — ${courseQtyStr(it)}` : "";
      lines.push(`• ${it.label}${q}`);
    }
    lines.push("");
  }
  shareOrCopy({ title: "Liste de courses", text: lines.join("\n").trim() }, "Liste copiée !");
}
