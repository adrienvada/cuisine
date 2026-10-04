/* L'accueil : grille des recettes, recherche, filtres par catégorie et leurs animations. */

import { save, state } from "../core/etat.js";
import { fondsDe } from "../core/fonds.js";
import { fmtTime } from "../core/format.js";
import { ICON } from "../core/icones.js";
import { MOMENT_TABLE } from "../core/menu.js";
import {
  FAV_FILTER,
  VERDICTS,
  abbrevDiscovered,
  addonList,
  byCategoryOrder,
  choiceList,
  cookedOf,
  isFav,
  verdictOf
} from "../core/recettes.js";
import { onShareClick } from "../ui/partage.js";
import { app } from "../ui/routeur.js";
import { REDUCE_MOTION } from "../ui/theme.js";
import { visuel } from "../ui/visuel.js";

/* Pastille « Découverte à… » — facultative, cf. l'en-tête de recipes.js */
export function discoveredHtml(r) {
  if (!r.discovered) return "";
  return `<p class="disc-row"><span class="discovered">${ICON.pin}Découverte ${r.discovered}</span></p>`;
}

/* Les trois temps d'une vignette, chacun sous son icône : couteau pour ce qu'on
   fait, Z pour ce qu'on attend, flamme pour ce qui cuit. La recette nue, sans
   fourchette — sur une vignette on annonce le temps le plus court, la fiche
   détaille ce que les suppléments y ajoutent. Un poste absent ne prend pas de
   place, sauf l'absence de cuisson, qui est une information. */
export function timeChipsHtml(r) {
  const t = r.times;
  const part = (icone, min) => `<span class="t-part">${icone} ${fmtTime(min)}</span>`;
  return [
    t.prep ? part(ICON.knife, t.prep) : "",
    t.repos ? part(ICON.zzz, t.repos) : "",
    t.cuisson != null ? part(ICON.flame, t.cuisson) : `<span class="t-part">${ICON.flame} sans cuisson</span>`
  ].join("");
}

export function matches(r, q) {
  if (!q) return true;
  /* Les fondamentaux entrent dans le foin : chercher « émulsion » doit ramener
     les recettes où l'on en fait une, pas seulement celles qui écrivent le mot. */
  const fonds = [...r.steps, ...(r.choices || []).flatMap(c => c.options.map(o => o.step)),
    ...(r.addons || []).map(a => a.step)].flatMap(s => fondsDe(s).map(f => f.t));
  const hay = [r.title, r.subtitle, r.category, ...(r.tags || []), ...r.ingredients.map(i => i.name),
    ...addonList(r).map(a => a.label),
    ...choiceList(r).flatMap(c => c.options.map(o => o.label)), ...fonds].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every(w => hay.includes(w));
}

export function renderHome() {
  const anyFav = RECIPES.some(isFav);
  if (state.filter === FAV_FILTER && !anyFav) { state.filter = "Toutes"; save(); }
  const cats = ["Toutes", ...(anyFav ? [FAV_FILTER] : []), ...[...new Set(RECIPES.map(r => r.category))].sort(byCategoryOrder)];
  const chipLabel = c => (c === FAV_FILTER ? "♥ Coups de cœur" : c);
  app.innerHTML = `
    <header class="masthead fade-in">
      <div class="mast-row">${ILLO.D.sprig}<p class="eyebrow">Le carnet de</p>${ILLO.D.sprigR}</div>
      <h1>Cuisine</h1>
      <p class="byline"><span>d'<span class="u">Evadri</span></span> ${ILLO.D.heart}</p>
    </header>
    <div class="searchbar">
      ${ICON.search}
      <input id="search" type="search" placeholder="Une recette, un ingrédient…" value="${state.query}" autocomplete="off">
    </div>
    <div class="chips" id="chips">
      ${cats.map(c => `<button class="chip ${state.filter === c ? "on" : ""}" data-cat="${c}">${chipLabel(c)}</button>`).join("")}
    </div>
    <div class="grid fade-in" id="grid">
      ${RECIPES.map(cardHtml).join("")}
      <p class="empty grid-empty" style="grid-column:1/-1" hidden>Aucune recette ne correspond…<br>La prochaine fournée arrive bientôt !</p>
    </div>
  `;
  document.getElementById("search").addEventListener("input", e => {
    state.query = e.target.value; save(); applyFilter(true);
  });
  document.getElementById("chips").addEventListener("click", e => {
    const b = e.target.closest(".chip");
    if (!b) return;
    state.filter = b.dataset.cat; save();
    document.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c === b));
    if (!REDUCE_MOTION.matches) {
      b.classList.remove("pop");
      void b.offsetWidth;
      b.classList.add("pop");
    }
    applyFilter(true);
  });
  document.getElementById("grid").addEventListener("click", onShareClick);
  applyFilter(false);
}

export function inFilter(r) {
  if (state.filter === "Toutes") return true;
  if (state.filter === FAV_FILTER) return isFav(r);
  if (state.filter === "table") return MOMENT_TABLE.includes(r.category);
  return r.category === state.filter;
}

/* Une carte par recette, créée une seule fois par visite de l'accueil.
   Filtrer ne reconstruit plus rien : les cartes restent dans le DOM et
   `applyFilter` ne fait que les montrer, les cacher et les déplacer. */
export function cardHtml(r) {
  const v = VERDICTS.find(x => x.id === verdictOf(r));
  const c = cookedOf(r);
  return `
    <a class="card" data-id="${r.id}" href="#/recette/${r.id}">
      <div class="visual" style="background:${r.color}22">${visuel(r, { genre: "vignette" })}
        <span class="card-cat">${r.category}</span>
        <button class="card-share" data-share="${r.id}" aria-label="Partager ${r.title}">${ICON.share}</button>
      </div>
      <div class="body">
        <h3>${r.title}</h3>
        ${v || c.count ? `<div class="tagrow">
          ${v ? `<span class="verdict-tag v-${v.id}">${v.tag || v.label}</span>` : ""}
          ${c.count ? `<span class="cook-count">cuisinée ${c.count}×</span>` : ""}
        </div>` : ""}
        <div class="card-foot">
          ${r.discovered ? `<div class="card-disc">${ICON.pin}<span>${abbrevDiscovered(r.discovered)}</span></div>` : ""}
          <div class="meta">${timeChipsHtml(r)}</div>
        </div>
      </div>
    </a>`;
}

/* Coup de cœur activé : le cœur du bouton bat, et 2-3 petits cœurs
   s'échappent vers le haut en s'estompant, façon double-tap Instagram. */
export function burstHeart(btn) {
  if (REDUCE_MOTION.matches) return;
  const heart = btn.querySelector(".vb-heart");
  if (heart) {
    heart.classList.remove("pop");
    void heart.offsetWidth;
    heart.classList.add("pop");
  }
  const n = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    const p = document.createElement("span");
    p.className = "heart-particle";
    p.textContent = "♥";
    p.style.left = (38 + Math.random() * 24) + "%";
    p.style.setProperty("--dx", (Math.random() * 44 - 22) + "px");
    p.style.animationDelay = (i * 70) + "ms";
    btn.appendChild(p);
    p.addEventListener("animationend", () => p.remove());
  }
}

/* Une carte en cours de sortie retourne au repos : styles nettoyés, cachée. */
export function finishLeave(el) {
  clearTimeout(el._lv);
  if (!el.classList.contains("card-leave")) return;
  el.classList.remove("card-leave");
  el.style.position = el.style.left = el.style.top = el.style.width = el.style.margin = "";
  el.classList.add("gone");
}

/* Filtre la grille façon FLIP : les cartes écartées s'estompent sur place,
   les survivantes glissent vers leur nouvelle position, les entrantes
   apparaissent en fondu. Aucune reconstruction du DOM. */
export function applyFilter(animate) {
  const grid = document.getElementById("grid");
  if (!grid) return;
  const list = RECIPES.filter(r => inFilter(r) && matches(r, state.query));
  // Dans les coups de cœur, les plus cuisinées passent devant.
  if (state.filter === FAV_FILTER) {
    list.sort((a, b) => cookedOf(b).count - cookedOf(a).count || (cookedOf(b).last || 0) - (cookedOf(a).last || 0));
  }
  /* La pastille de catégorie n'apprend rien quand le filtre l'annonce déjà en
     haut de l'écran : elle ne sert que dans « Toutes » et dans une recherche.
     (« Coups de cœur » n'est pas une catégorie : la pastille y garde son sens.) */
  grid.classList.toggle("no-cat", !(state.filter === "Toutes" || state.filter === FAV_FILTER || state.filter === "table"));
  grid.querySelector(".grid-empty").hidden = list.length > 0;

  const cardOf = new Map([...grid.querySelectorAll(".card")].map(el => [el.dataset.id, el]));
  const wanted = list.map(r => cardOf.get(r.id));
  const wantedSet = new Set(wanted);
  const cards = [...cardOf.values()];

  if (!animate || REDUCE_MOTION.matches) {
    for (const el of cards) { finishLeave(el); el.classList.toggle("gone", !wantedSet.has(el)); }
    for (const el of wanted) grid.appendChild(el);
    grid.appendChild(grid.querySelector(".grid-empty"));
    return;
  }

  /* FIRST — positions actuelles des cartes visibles */
  const visible = cards.filter(el => !el.classList.contains("gone") && !el.classList.contains("card-leave"));
  const gridBox = grid.getBoundingClientRect();
  const first = new Map(visible.map(el => [el, el.getBoundingClientRect()]));

  const leavers = visible.filter(el => !wantedSet.has(el));
  const enterers = wanted.filter(el => !first.has(el));
  const stayers = wanted.filter(el => first.has(el));

  /* Sortantes : figées en absolu à leur place, elles s'estompent sans gêner
     le reflow, puis retournent au repos (display:none). */
  for (const el of leavers) {
    const r0 = first.get(el);
    el.style.position = "absolute";
    el.style.margin = "0";
    el.style.width = r0.width + "px";
    el.style.left = r0.left - gridBox.left + "px";
    el.style.top = r0.top - gridBox.top + "px";
    el.classList.add("card-leave");
    el._lv = setTimeout(() => finishLeave(el), 240);
  }

  /* Entrantes : réaffichées tout de suite mais transparentes */
  for (const el of enterers) {
    finishLeave(el);
    el.classList.remove("gone");
    el.classList.add("card-enter", "no-anim");
  }

  /* Ordre cible (le tri des coups de cœur déplace aussi les survivantes) */
  for (const el of wanted) grid.appendChild(el);
  grid.appendChild(grid.querySelector(".grid-empty"));

  /* LAST + INVERT — chaque survivante repart de son ancienne position… */
  const movers = [];
  for (const el of stayers) {
    const r0 = first.get(el), r1 = el.getBoundingClientRect();
    const dx = r0.left - r1.left, dy = r0.top - r1.top;
    if (!dx && !dy) continue;
    el.classList.add("no-anim");
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    movers.push(el);
  }

  /* PLAY — …et glisse vers la nouvelle au prochain rendu */
  requestAnimationFrame(() => requestAnimationFrame(() => {
    for (const el of movers) {
      el.classList.remove("no-anim");
      el.classList.add("card-move");
      el.style.transform = "";
      clearTimeout(el._mv);
      el._mv = setTimeout(() => el.classList.remove("card-move"), 340);
    }
    for (const el of enterers) {
      el.classList.remove("no-anim", "card-enter");
      el.classList.add("card-move");
      clearTimeout(el._mv);
      el._mv = setTimeout(() => el.classList.remove("card-move"), 340);
    }
  }));
}
