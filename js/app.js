/* Carnet de cuisine — logique de l'application (vanilla JS, sans dépendance) */

/* ---------- État persistant ---------- */

const STORE_KEY = "carnet-cuisine-v1";

const state = Object.assign(
  { portions: {}, menu: [], checked: {}, extras: [], filter: "Toutes", query: "", notes: {}, cooked: {}, timers: [], choices: {}, addons: {}, cooking: {} },
  JSON.parse(localStorage.getItem(STORE_KEY) || "{}")
);

function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

/* Le menu est la source : la liste de courses en découle.
   Avant, les recettes vivaient dans `added` ({id: true}), accroché aux courses —
   on récupère ce qui s'y trouvait pour ne rien perdre. */
if (!Array.isArray(state.menu)) state.menu = [];
if (state.added) {
  for (const id of Object.keys(state.added)) if (!state.menu.includes(id)) state.menu.push(id);
  delete state.added;
  save();
}

/* ---------- Utilitaires ---------- */

const app = document.getElementById("app");

const byId = id => RECIPES.find(r => r.id === id);

const ICON = {
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3 2.5.5 5 2.5 5 6a4 4 0 0 1-8 0c0-1 .5-2 1.5-2.5z"/><path d="M12 2s4 3.5 4 8c2-1 3-2.5 3-2.5.7 2 1 3.6 1 5.5a8 8 0 1 1-16 0C4 8 12 2 12 2z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98m-.01-10.98-6.82 3.98"/></svg>',
  timer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2h4"/><path d="M12 14l3-3"/><circle cx="12" cy="14" r="8"/></svg>',
  chef: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><path d="M6 17h12"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.99-5.1 9.9-7.34 11.86a1 1 0 0 1-1.32 0C9.1 19.9 4 14.99 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>'
};

/* Pastille « Découverte à… » — facultative, cf. l'en-tête de recipes.js */
function discoveredHtml(r) {
  if (!r.discovered) return "";
  return `<p class="disc-row"><span class="discovered">${ICON.pin}Découverte ${r.discovered}</span></p>`;
}

/* ---------- Verdicts & recettes déjà cuisinées ---------- */

const VERDICTS = [
  { id: "bof", label: "Bof" },
  { id: "bien", label: "Bien" },
  { id: "encore", label: "Encore !", tag: "♥ Encore !" }
];

const FAV_FILTER = "coup-de-coeur";

const verdictOf = r => state.notes[r.id] || null;

const isFav = r => state.notes[r.id] === "encore";

const cookedOf = r => state.cooked[r.id] || { count: 0, last: null };

function markCooked(id) {
  const c = state.cooked[id] || { count: 0, last: null };
  c.count += 1;
  c.last = Date.now();
  state.cooked[id] = c;
  save();
}

function fmtDate(ts) {
  const d = new Date(ts);
  const opts = { day: "numeric", month: "long" };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString("fr-FR", opts);
}

function cookedText(id) {
  const c = state.cooked[id];
  if (!c || !c.count) return "Pas encore cuisinée depuis le carnet.";
  if (c.count === 1) return `Cuisinée une fois, le ${fmtDate(c.last)}.`;
  return `Cuisinée ${c.count} fois · la dernière le ${fmtDate(c.last)}.`;
}

/* Visuel d'une recette : photo si dispo, sinon illustration dessinée, sinon emoji */
function visualOf(r) {
  if (r.image) return `<img src="${r.image}" alt="">`;
  return ILLO.FOOD[r.id] || r.emoji;
}

/* Encadré d'astuce, façon livre de cuisine (toque ou plume selon le titre) */
function tipHtml(tip) {
  const astuce = /astuce|onctuosité/i.test(tip.t);
  return `<div class="tip ${astuce ? "" : "beige"}">
    <span class="tip-ico">${astuce ? ILLO.D.toque : ILLO.D.plume}</span>
    <div class="tip-body"><b>${tip.t}</b>${tip.txt}</div>
  </div>`;
}

function fmtTime(min) {
  if (min == null) return "";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

function totalTime(r) {
  return (r.times.prep || 0) + (r.times.repos || 0) + (r.times.cuisson || 0);
}

function fmtQty(q) {
  if (q == null) return "";
  const rounded = Math.round(q * 4) / 4;
  const whole = Math.floor(rounded);
  const frac = { 0.25: "¼", 0.5: "½", 0.75: "¾" }[rounded - whole];
  if (frac) return (whole || "") + frac;
  return String(Math.round(rounded * 10) / 10).replace(".", ",");
}

const WEIGHT_UNITS = ["g", "kg", "ml", "cl", "l", "c. à s.", "c. à c."];
const PLURALS = { rouleau: "rouleaux", bocal: "bocaux", pot: "pots", "petit pot": "petits pots", sachet: "sachets", botte: "bottes", bouquet: "bouquets", gousse: "gousses", "petite gousse": "petites gousses" };

function fmtUnit(unit, qty) {
  if (!unit) return "";
  if (qty > 1 && PLURALS[unit]) return PLURALS[unit];
  return unit;
}

function scaleQty(q, unit, factor) {
  if (q == null) return null;
  let s = q * factor;
  if (unit === "g" || unit === "ml") s = Math.round(s);
  return s;
}

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._h);
  toast._h = setTimeout(() => { t.hidden = true; }, 2200);
}

function setBadge(id, n) {
  const b = document.getElementById(id);
  b.hidden = n === 0;
  b.textContent = n;
}

function updateBadge() {
  setBadge("menu-badge", state.menu.length);
  setBadge("cart-badge", courseTodo());
}

/* ---------- Le menu (source des courses) ---------- */

const inMenu = id => state.menu.includes(id);

const menuRecipes = () => state.menu.map(byId).filter(Boolean);

function toggleMenu(id) {
  if (inMenu(id)) state.menu = state.menu.filter(x => x !== id);
  else state.menu.push(id);
  save(); updateBadge();
  return inMenu(id);
}

function portionsOf(r) { return state.portions[r.id] || r.portions.base; }

/* ---------- Composer sa version : choix (vinaigrette…) et suppléments ----------
   La version choisie vit dans state.choices / state.addons ; ingrédients et
   étapes « effectifs » en découlent partout (recette, cuisine, partage, courses). */

const choiceList = r => r.choices || [];
const addonList = r => r.addons || [];
const customizable = r => choiceList(r).length || addonList(r).length;

function optionOf(r, choice) {
  const sel = (state.choices[r.id] || {})[choice.id];
  return choice.options.find(o => o.id === sel) || choice.options[0];
}

function selectedAddons(r) {
  const sel = state.addons[r.id] || [];
  return addonList(r).filter(a => sel.includes(a.id));
}

function setChoice(rid, cid, oid) {
  (state.choices[rid] = state.choices[rid] || {})[cid] = oid;
  save();
}

function toggleAddon(rid, aid) {
  const sel = state.addons[rid] = state.addons[rid] || [];
  const i = sel.indexOf(aid);
  if (i >= 0) sel.splice(i, 1); else sel.push(aid);
  save();
}

/* Ingrédients réellement nécessaires : base + option choisie de chaque groupe + suppléments. */
function effectiveIngredients(r) {
  const list = [...r.ingredients];
  for (const c of choiceList(r)) list.push(...optionOf(r, c).ingredients);
  for (const a of selectedAddons(r)) list.push(...a.ingredients.map(i => ({ ...i, addon: a.label })));
  return list;
}

/* Étapes réellement suivies : les emplacements `{choice}` prennent l'étape de
   l'option choisie, et chaque supplément vient enrichir la sienne (`extras`). */
function effectiveSteps(r) {
  const steps = r.steps.map(s => {
    if (!s.choice) return { ...s };
    const c = choiceList(r).find(x => x.id === s.choice);
    return c ? { ...optionOf(r, c).step } : { ...s };
  });
  for (const a of selectedAddons(r)) {
    if (!a.step) continue;
    const s = steps[Math.min(a.step.i, steps.length - 1)];
    (s.extras = s.extras || []).push({ emoji: a.emoji, label: a.label, txt: a.step.txt });
  }
  return steps;
}

/* Résumé lisible de la version : « Citron & menthe · + tomates cerises, avocat » */
function versionSummary(r) {
  const parts = choiceList(r).map(c => optionOf(r, c).label);
  const adds = selectedAddons(r).map(a => a.label.toLowerCase());
  if (adds.length) parts.push("+ " + adds.join(", "));
  return parts.join(" · ");
}

/* Le geste d'un supplément, affiché dans l'étape concernée. */
const extrasHtml = s => (s.extras || []).map(x => `<div class="addon-note">
  <span class="a-emoji">${x.emoji || "✚"}</span>
  <div class="a-body"><b>${x.label}</b>${x.txt}</div>
</div>`).join("");

/* Chips de sélection, partagées entre la page recette et la sheet d'ajout. */
const pickChipsHtml = r => `
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
function onPickClick(e, r) {
  const oc = e.target.closest("[data-choice]");
  if (oc) { setChoice(r.id, oc.dataset.choice, oc.dataset.option); return true; }
  const oa = e.target.closest("[data-addon]");
  if (oa) { toggleAddon(r.id, oa.dataset.addon); return true; }
  return false;
}

/* La sheet « façon fast-food » à l'ajout au menu : composer, ou ajouter tel quel. */
function openAddSheet(r, done) {
  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop";
  const draw = () => {
    const n = selectedAddons(r).length;
    backdrop.innerHTML = `
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Composer ${r.title}">
        <div class="sheet-grip"></div>
        <h3>${r.emoji} Des envies en plus ?</h3>
        <p class="sheet-sub">Compose ta version — ou ajoute la recette telle quelle.</p>
        ${pickChipsHtml(r)}
        <button class="btn primary sheet-add" id="sheet-add">
          ${ICON.cart} ${n ? `Ajouter avec ${n} supplément${n > 1 ? "s" : ""}` : "Ajouter tel quel"}
        </button>
      </div>`;
  };
  const close = added => { backdrop.remove(); done(added); };
  backdrop.addEventListener("click", e => {
    if (e.target === backdrop) return close(false);
    if (e.target.closest("#sheet-add")) return close(true);
    if (onPickClick(e, r)) draw();
  });
  draw();
  document.body.appendChild(backdrop);
}

/* Nombre d'articles qu'il reste à prendre — le badge de l'onglet Courses. */
function courseTodo() {
  return buildCourseList().filter(i => !state.checked[i.key]).length
    + state.extras.filter(x => !state.checked["x-" + x.id]).length;
}

/* ---------- Cuisine en cours ----------
   Où l'on en est dans chaque recette entamée, pour pouvoir reprendre après
   être allé voir ailleurs. Oubliée à « Terminer », à « Repartir du début »,
   ou d'elle-même au bout de 12 h — inutile de proposer de reprendre un repas
   d'avant-hier. */

const COOKING_TTL = 12 * 3600 * 1000;

function cookingStep(r) {
  const c = state.cooking[r.id];
  if (!c) return null;
  if (Date.now() - c.at > COOKING_TTL) { forgetCooking(r.id); return null; }
  return Math.min(c.step, r.steps.length - 1);
}

function setCooking(id, step) {
  state.cooking[id] = { step, at: Date.now() };
  save();
}

function forgetCooking(id) { delete state.cooking[id]; save(); }

/* Adresse du mode cuisine : sur l'étape en cours s'il y en a une. */
function cookHref(r) {
  const step = cookingStep(r);
  return `#/recette/${r.id}/cuisine${step ? "/" + step : ""}`;
}

const hasRunningTimer = id => state.timers.some(t => t.rid === id);

/* Fermer avec la croix, c'est vouloir sortir : sans ce garde-fou, la reprise
   automatique renverrait aussitôt dans le mode cuisine qu'on vient de quitter.
   Levé dès qu'on y retourne de soi-même. */
const noAutoResume = new Set();

/* Un minuteur qui tourne signe une vraie séance de cuisine : on y retourne
   directement. Sinon, la fiche s'ouvre normalement avec un bouton Reprendre. */
function autoResumeStep(r) {
  if (noAutoResume.has(r.id) || !hasRunningTimer(r.id)) return null;
  return cookingStep(r);
}

/* ---------- Partage ---------- */

const SITE_FALLBACK = "https://adrienvada.fr/cuisine/";

/* Racine du site, telle qu'on y accède réellement (domaine, sous-dossier…). */
function siteUrl() {
  if (!/^https?:$/.test(location.protocol)) return SITE_FALLBACK;
  return location.origin + location.pathname.replace(/[^/]*$/, "");
}

/* Chaque recette a une page `r/<id>.html` : elle porte la photo et le titre
   pour l'aperçu dans les messageries, puis renvoie vers l'application.
   (Générée par `node tools/generer-pages-partage.mjs`.) */
function recipeUrl(r) { return siteUrl() + "r/" + r.id + ".html"; }

function copyText(text, msg) {
  if (!navigator.clipboard) return toast("Copie impossible sur cet appareil");
  navigator.clipboard.writeText(text).then(() => toast(msg)).catch(() => toast("Copie impossible"));
}

async function shareOrCopy(data, copied) {
  if (navigator.share) {
    try { await navigator.share(data); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  copyText([data.text, data.url].filter(Boolean).join("\n"), copied);
}

/* Résumé d'une recette : de quoi lire l'essentiel dans la conversation,
   aux portions actuellement affichées, et le lien pour le pas-à-pas illustré. */
function recipeShareText(r) {
  const p = portionsOf(r), f = p / r.portions.base, t = r.times;
  const times = [];
  if (t.prep) times.push(`Préparation ${fmtTime(t.prep)}`);
  if (t.repos) times.push(`${r.reposLabel || "Repos"} ${fmtTime(t.repos)}`);
  times.push(t.cuisson != null ? `Cuisson ${fmtTime(t.cuisson)}` : "Sans cuisson");

  const lines = [`${r.emoji} ${r.title}`, r.subtitle];
  if (r.discovered) lines.push(`📍 Découverte ${r.discovered}`);
  lines.push("", times.join(" · "));
  const vs = versionSummary(r);
  if (vs) lines.push(`Version : ${vs}`);
  lines.push("", `Pour ${p} ${r.portions.label} :`);
  for (const ing of effectiveIngredients(r)) {
    const q = scaleQty(ing.qty, ing.unit, f);
    const qty = q != null ? `${fmtQty(q)} ${fmtUnit(ing.unit, q)}`.trim() : (ing.qtyText || "");
    lines.push(`• ${ing.name}${qty ? ` — ${qty}` : ""}${ing.addon ? " (supplément)" : ing.optional ? " (optionnel)" : ""}`);
  }
  lines.push("", `Les ${effectiveSteps(r).length} étapes en pas-à-pas, avec les minuteurs :`);
  return lines.join("\n");
}

function shareRecipe(id) {
  const r = byId(id);
  if (!r) return;
  shareOrCopy({ title: r.title, text: recipeShareText(r), url: recipeUrl(r) }, "Recette copiée !");
}

function shareMenu() {
  const list = menuRecipes();
  if (!list.length) return toast("Le menu est vide");
  const lines = ["🌿 Au menu du carnet de cuisine", ""];
  for (const r of list) {
    const vs = versionSummary(r);
    lines.push(`${r.emoji} ${r.title} — ${portionsOf(r)} ${r.portions.label}${vs ? ` (${vs})` : ""}`, recipeUrl(r), "");
  }
  shareOrCopy({ title: "Au menu", text: lines.join("\n").trim() }, "Menu copié !");
}

/* Posé sur une vignette ou une carte du menu, le bouton ne doit pas ouvrir la recette. */
function onShareClick(e) {
  const b = e.target.closest("[data-share]");
  if (!b) return;
  e.preventDefault();
  e.stopPropagation();
  shareRecipe(b.dataset.share);
}

/* ---------- Routage ---------- */

window.addEventListener("hashchange", route);

function route() {
  stopCookMode();
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  document.querySelectorAll(".tabbar a").forEach(a => a.classList.remove("active"));
  if (parts[0] === "courses") {
    document.querySelector('[data-tab="courses"]').classList.add("active");
    renderCourses();
  } else if (parts[0] === "menu") {
    document.querySelector('[data-tab="menu"]').classList.add("active");
    renderMenu();
  } else if (parts[0] === "recette" && byId(parts[1])) {
    document.querySelector('[data-tab="home"]').classList.add("active");
    const r = byId(parts[1]);
    if (parts[2] === "cuisine") renderCook(r, parts[3]);
    else {
      const step = autoResumeStep(r);
      // `replace` : la fiche ne reste pas dans l'historique, la croix ramènera
      // d'où l'on vient au lieu de retomber ici et de repartir en boucle.
      if (step != null) return location.replace(`#/recette/${r.id}/cuisine/${step}`);
      renderRecipe(r);
    }
  } else {
    document.querySelector('[data-tab="home"]').classList.add("active");
    renderHome();
  }
  window.scrollTo(0, 0);
  updateBadge();
}

/* ---------- Accueil ---------- */

function matches(r, q) {
  if (!q) return true;
  const hay = [r.title, r.subtitle, r.category, ...(r.tags || []), ...r.ingredients.map(i => i.name),
    ...addonList(r).map(a => a.label),
    ...choiceList(r).flatMap(c => c.options.map(o => o.label))].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every(w => hay.includes(w));
}

function renderHome() {
  const anyFav = RECIPES.some(isFav);
  if (state.filter === FAV_FILTER && !anyFav) { state.filter = "Toutes"; save(); }
  const cats = ["Toutes", ...(anyFav ? [FAV_FILTER] : []), ...new Set(RECIPES.map(r => r.category))];
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
    <div class="grid" id="grid"></div>
  `;
  document.getElementById("search").addEventListener("input", e => {
    state.query = e.target.value; save(); drawGrid();
  });
  document.getElementById("chips").addEventListener("click", e => {
    const b = e.target.closest(".chip");
    if (!b) return;
    state.filter = b.dataset.cat; save();
    document.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c === b));
    drawGrid();
  });
  document.getElementById("grid").addEventListener("click", onShareClick);
  drawGrid();
}

function inFilter(r) {
  if (state.filter === "Toutes") return true;
  if (state.filter === FAV_FILTER) return isFav(r);
  return r.category === state.filter;
}

function drawGrid() {
  const list = RECIPES.filter(r => inFilter(r) && matches(r, state.query));
  // Dans les coups de cœur, les plus cuisinées passent devant.
  if (state.filter === FAV_FILTER) {
    list.sort((a, b) => cookedOf(b).count - cookedOf(a).count || (cookedOf(b).last || 0) - (cookedOf(a).last || 0));
  }
  const grid = document.getElementById("grid");
  if (!list.length) {
    grid.innerHTML = `<p class="empty" style="grid-column:1/-1">Aucune recette ne correspond…<br>La prochaine fournée arrive bientôt !</p>`;
    return;
  }
  grid.innerHTML = list.map(r => {
    const v = VERDICTS.find(x => x.id === verdictOf(r));
    const c = cookedOf(r);
    return `
    <a class="card fade-in" href="#/recette/${r.id}">
      <div class="visual" style="background:${r.color}22">${visualOf(r)}
        <button class="card-share" data-share="${r.id}" aria-label="Partager ${r.title}">${ICON.share}</button>
      </div>
      <div class="body">
        <h3>${r.title}</h3>
        <div class="meta">${ICON.clock} ${fmtTime(totalTime(r))}${r.times.cuisson == null ? " · sans cuisson" : ""}</div>
        ${v || c.count ? `<div class="tagrow">
          ${v ? `<span class="verdict-tag v-${v.id}">${v.tag || v.label}</span>` : ""}
          ${c.count ? `<span class="cook-count">cuisinée ${c.count}×</span>` : ""}
        </div>` : ""}
      </div>
    </a>`;
  }).join("");
}

/* ---------- Page recette ---------- */

function renderRecipe(r) {
  const inList = inMenu(r.id);
  // Étape 1 : rien à reprendre, « Mode cuisine » y mène déjà.
  const resume = cookingStep(r) || null;
  const t = r.times;
  app.innerHTML = `
    <div class="topbar fade-in">
      <a class="btn-icon" href="#/">${ICON.back} Recettes</a>
      <button class="btn-icon" id="share-recipe">${ICON.share} Partager</button>
    </div>
    <div class="hero"><div class="visual" style="background:${r.color}33">
      ${r.image ? "" : `<span class="corner tl">${ILLO.D.corner}</span><span class="corner tr">${ILLO.D.corner}</span><span class="corner bl">${ILLO.D.corner}</span><span class="corner br">${ILLO.D.corner}</span>`}
      ${visualOf(r)}
    </div></div>
    <div class="r-head">
      <h1>${r.title}</h1>
      <p class="subtitle">${r.subtitle}</p>
      ${discoveredHtml(r)}
      <div class="timerow">
        ${t.prep ? `<span class="timechip">${ICON.clock} Préparation : ${fmtTime(t.prep)}</span>` : ""}
        ${t.repos ? `<span class="timechip">${ICON.clock} ${r.reposLabel || "Repos"} : ${fmtTime(t.repos)}</span>` : ""}
        ${t.cuisson != null ? `<span class="timechip">${ICON.flame} Cuisson : ${fmtTime(t.cuisson)}</span>` : `<span class="timechip">${ICON.flame} Sans cuisson</span>`}
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
      <h2>Alors, verdict ?</h2>
      <div class="verdict-row" id="verdict-row"></div>
      <p class="cooked-line" id="cooked-line"></p>
    </section>

    <div class="actions">
      <button class="btn ${inList ? "added" : "secondary"}" id="add-list">
        ${inList ? ICON.check + " Au menu" : ICON.cart + " Ajouter au menu"}
      </button>
      <a class="btn primary ${resume ? "resume" : ""}" href="${cookHref(r)}">${ICON.chef}
        ${resume ? `<span>Reprendre<small>étape ${resume + 1} / ${r.steps.length}</small></span>` : "Mode cuisine"}
      </a>
    </div>
    ${resume ? `<button class="link-restart" id="restart-cook">Repartir du début</button>` : ""}
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
        <span>${ing.name}${ing.addon ? `<span class="opt sup">supplément</span>` : ""}${ing.optional ? `<span class="opt">optionnel</span>` : ""}${ing.note ? `<span class="note"> — ${ing.note}</span>` : ""}</span>
      </li>`;
    }).join("");
  };

  const drawSteps = () => {
    document.getElementById("steps-list").innerHTML = effectiveSteps(r).map((s, i) => `
      <li>
        <span class="num">${i + 1}</span>
        <div>
          <h3>${s.t}</h3>
          <p>${s.txt}</p>
          ${extrasHtml(s)}
          ${s.tip ? tipHtml(s.tip) : ""}
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

  document.getElementById("p-minus").addEventListener("click", () => {
    const p = state.portions[r.id] || r.portions.base;
    if (p > 1) { state.portions[r.id] = p - 1; save(); drawIngredients(); }
  });
  document.getElementById("p-plus").addEventListener("click", () => {
    const p = state.portions[r.id] || r.portions.base;
    if (p < 24) { state.portions[r.id] = p + 1; save(); drawIngredients(); }
  });
  const addBtn = document.getElementById("add-list");
  const drawAddBtn = () => {
    addBtn.className = inMenu(r.id) ? "btn added" : "btn secondary";
    addBtn.innerHTML = inMenu(r.id) ? ICON.check + " Au menu" : ICON.cart + " Ajouter au menu";
  };
  addBtn.addEventListener("click", () => {
    if (inMenu(r.id)) {
      toggleMenu(r.id); drawAddBtn();
      toast("Retirée du menu");
    } else if (customizable(r)) {
      /* Façon fast-food : composer sa version, ou ajouter tel quel d'un tap. */
      openAddSheet(r, added => {
        drawVersion(); updateBadge();
        if (!added) return;
        toggleMenu(r.id); drawAddBtn();
        const n = selectedAddons(r).length;
        toast(n ? `Au menu avec ${n} supplément${n > 1 ? "s" : ""} — courses à jour` : "Au menu — ingrédients ajoutés aux courses");
      });
    } else {
      toggleMenu(r.id); drawAddBtn();
      toast("Au menu — ingrédients ajoutés aux courses");
    }
  });

  document.getElementById("share-recipe").addEventListener("click", () => shareRecipe(r.id));

  if (resume) document.getElementById("restart-cook").addEventListener("click", () => {
    forgetCooking(r.id);
    location.hash = `#/recette/${r.id}/cuisine`;
  });

  const drawVerdict = () => {
    const cur = verdictOf(r);
    document.getElementById("verdict-row").innerHTML = VERDICTS.map(v => `
      <button class="verdict-btn ${cur === v.id ? "on v-" + v.id : ""}" data-verdict="${v.id}" aria-pressed="${cur === v.id}">${v.label}</button>
    `).join("");
    document.getElementById("cooked-line").textContent = cookedText(r.id);
  };

  document.getElementById("verdict-row").addEventListener("click", e => {
    const b = e.target.closest("[data-verdict]");
    if (!b) return;
    const v = b.dataset.verdict;
    if (state.notes[r.id] === v) {
      delete state.notes[r.id];
      toast("Verdict effacé");
    } else {
      state.notes[r.id] = v;
      toast(v === "encore" ? "Un coup de cœur de plus ♥" : `Notée « ${VERDICTS.find(x => x.id === v).label} »`);
    }
    save(); drawVerdict();
  });

  drawVersion();
  drawVerdict();
}

/* ---------- Minuteurs multiples ----------
   Chaque minuteur est persisté dans l'état ({rid, step, label, emoji, end})
   et affiché partout via le plateau #timer-tray ; plusieurs peuvent tourner
   en parallèle pendant qu'on avance sur d'autres étapes. */

let tickInt = null, refreshZone = null;

function startTimer(r, stepIdx, s) {
  state.timers.push({
    id: Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
    rid: r.id, step: stepIdx, label: s.t, emoji: r.emoji,
    end: Date.now() + s.timer * 60000, total: s.timer, fired: false
  });
  save(); drawTray(); ensureTick();
}

function cancelTimer(id) {
  state.timers = state.timers.filter(t => t.id !== id);
  save(); drawTray();
  if (refreshZone) refreshZone();
  if (!state.timers.length && tickInt) { clearInterval(tickInt); tickInt = null; }
}

function ensureTick() {
  if (!tickInt && state.timers.length) tickInt = setInterval(tick, 500);
}

function tick() {
  for (const t of state.timers) {
    const left = Math.max(0, Math.round((t.end - Date.now()) / 1000));
    document.querySelectorAll(`[data-clock="${t.id}"]`).forEach(el => {
      el.textContent = left === 0 && el.classList.contains("t-clock") ? "Prêt !" : fmtClock(left);
      if (left === 0) {
        el.classList.add("flash");
        const pill = el.closest(".timer-pill");
        if (pill) pill.classList.add("done");
        const btn = el.nextElementSibling;
        if (btn && btn.id === "timer-stop") btn.textContent = "OK";
      }
    });
    if (left === 0 && !t.fired) {
      t.fired = true; save();
      beep();
      document.title = "⏰ C'est prêt !";
      setTimeout(() => { document.title = "Carnet de cuisine"; }, 5000);
    }
  }
}

function drawTray() {
  const tray = document.getElementById("timer-tray");
  tray.hidden = !state.timers.length;
  tray.innerHTML = state.timers.map(t => {
    const left = Math.max(0, Math.round((t.end - Date.now()) / 1000));
    const done = left === 0;
    const r = byId(t.rid);
    return `<button class="timer-pill ${done ? "done" : ""}" data-timer="${t.id}"
      aria-label="Minuteur « ${t.label} »${r ? ` — revenir à l'étape de ${r.title}` : ""}">
      ${ICON.timer}
      <span class="t-label">${t.emoji} ${t.label}</span>
      <span class="t-clock" data-clock="${t.id}">${done ? "Prêt !" : fmtClock(left)}</span>
      <span class="t-x" aria-hidden="true">✕</span>
    </button>`;
  }).join("");
}

/* ---------- Mode cuisine ---------- */

let cookIdx = 0, wakeLock = null;

async function acquireWakeLock() {
  try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); } catch (e) {}
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && document.querySelector(".cook")) acquireWakeLock();
});

function stopCookMode() {
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  refreshZone = null;
  document.body.classList.remove("cooking");
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach(t => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = 880;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.4, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.3);
    });
  } catch (e) {}
  if (navigator.vibrate) navigator.vibrate([300, 120, 300, 120, 500]);
}

/* `step` (facultatif, depuis l'adresse) ouvre directement l'étape voulue —
   c'est par là qu'une bulle de minuteur ramène à ce qui est en train de cuire. */
function renderCook(r, step) {
  // La version composée (vinaigrette choisie, suppléments) dicte les étapes.
  const steps = effectiveSteps(r);
  const at = parseInt(step, 10);
  cookIdx = Number.isInteger(at) ? Math.min(Math.max(at, 0), steps.length - 1) : 0;
  // On y revient de soi-même : la reprise automatique redevient légitime.
  noAutoResume.delete(r.id);
  // Le changement de page est asynchrone : sans ce verrou, un double-tap sur
  // « Terminer » compterait la recette deux fois.
  let finished = false;
  acquireWakeLock();
  document.body.classList.add("cooking");
  const draw = () => {
    const s = steps[cookIdx];
    const last = cookIdx === steps.length - 1;
    if (!finished) {
      setCooking(r.id, cookIdx);
      // L'adresse suit l'étape sans encombrer l'historique : un rechargement,
      // ou une PWA fermée par iOS, retrouve ainsi la bonne étape.
      history.replaceState(null, "", `#/recette/${r.id}/cuisine/${cookIdx}`);
    }
    app.innerHTML = `
      <div class="cook">
        <div class="cook-top">
          <span class="title">${r.title}</span>
          <span class="cook-tools">
            <button class="cook-close" id="cook-share" aria-label="Partager la recette">${ICON.share}</button>
            <button class="cook-close" id="cook-close" aria-label="Fermer">✕</button>
          </span>
        </div>
        <div class="cook-progress">${steps.map((_, i) => `<i class="${i <= cookIdx ? "done" : ""}"></i>`).join("")}</div>
        <div class="cook-body">
          <div>
            <p class="cook-step-label">Étape ${cookIdx + 1} / ${steps.length}</p>
            <h2>${s.t}</h2>
            <span class="cook-flourish">${ILLO.D.flourish}</span>
            <p class="txt">${s.txt}</p>
            ${extrasHtml(s)}
            ${s.tip ? tipHtml(s.tip) : ""}
            <div class="cook-timer" id="timer-zone"></div>
          </div>
        </div>
        <div class="cook-nav">
          <button id="prev" ${cookIdx === 0 ? "disabled" : ""}>Précédent</button>
          <button id="next" class="main">${last ? "Terminer  ✓" : "Suivant"}</button>
        </div>
      </div>
    `;
    document.getElementById("cook-close").addEventListener("click", () => {
      noAutoResume.add(r.id);
      history.back();
    });
    document.getElementById("cook-share").addEventListener("click", () => shareRecipe(r.id));
    document.getElementById("prev").addEventListener("click", () => { if (cookIdx > 0) { cookIdx--; draw(); } });
    document.getElementById("next").addEventListener("click", () => {
      if (last) {
        if (finished) return;
        finished = true;
        const first = !verdictOf(r);
        markCooked(r.id);
        forgetCooking(r.id);
        location.hash = `#/recette/${r.id}`;
        toast(first ? "Bon appétit ! Alors, verdict ?" : "Bon appétit !");
      }
      else { cookIdx++; draw(); }
    });
    drawTimerZone(s);
    refreshZone = () => drawTimerZone(steps[cookIdx]);
  };

  const drawTimerZone = s => {
    const zone = document.getElementById("timer-zone");
    if (!zone) return;
    const t = state.timers.find(x => x.rid === r.id && x.step === cookIdx);
    if (t) {
      const left = Math.max(0, Math.round((t.end - Date.now()) / 1000));
      const done = left === 0;
      zone.innerHTML = `
        <span class="clock ${done ? "flash" : ""}" data-clock="${t.id}">${fmtClock(left)}</span>
        <button id="timer-stop">${done ? "OK" : "Annuler"}</button>`;
      document.getElementById("timer-stop").addEventListener("click", () => cancelTimer(t.id));
    } else if (s.timer) {
      zone.innerHTML = `<button id="timer-start">${ICON.timer} Minuteur ${fmtTime(s.timer)}</button>`;
      document.getElementById("timer-start").addEventListener("click", () => {
        startTimer(r, cookIdx, s);
        drawTimerZone(s);
      });
    } else {
      zone.innerHTML = "";
    }
  };

  draw();
}

function fmtClock(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  const h = Math.floor(m / 60);
  if (h) return `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ---------- Au menu ---------- */

function renderMenu() {
  const list = menuRecipes();

  if (!list.length) {
    app.innerHTML = `
      <header class="page-head courses-head fade-in">
        <div class="head-branch">${ILLO.D.olive}</div>
        <h1>Au menu</h1>
      </header>
      <div class="empty-illo cheers">${ILLO.D.cheers}</div>
      <p class="empty">Aucune recette au menu.<br>Ouvre une recette et touche <span class="nowrap">« Ajouter au menu »</span> : tu la retrouveras ici d'un geste, et ses ingrédients rejoindront la liste de courses.</p>
      <div style="text-align:center"><a class="btn-icon" href="#/">${ICON.back} Voir les recettes</a></div>
    `;
    return;
  }

  const todo = courseTodo();
  app.innerHTML = `
    <div id="menu-root">
    <header class="page-head courses-head fade-in">
      <div class="head-branch">${ILLO.D.olive}</div>
      <h1>Au menu</h1>
      <p>${list.length} recette${list.length > 1 ? "s" : ""} · ${todo ? `${todo} article${todo > 1 ? "s" : ""} à prendre` : "courses terminées"}</p>
    </header>
    <div class="menu-list">
      ${list.map(r => {
        const c = cookedOf(r);
        const v = VERDICTS.find(x => x.id === verdictOf(r));
        return `
        <article class="menu-card fade-in">
          <a class="mc-visual" style="background:${r.color}22" href="#/recette/${r.id}" aria-label="${r.title}">${visualOf(r)}</a>
          <div class="mc-body">
            <a class="mc-title" href="#/recette/${r.id}"><h3>${r.title}</h3></a>
            <div class="meta">${ICON.clock} ${fmtTime(totalTime(r))}
              ${v ? `<span class="verdict-tag v-${v.id}">${v.tag || v.label}</span>` : ""}
              ${c.count ? `<span class="cook-count">cuisinée ${c.count}×</span>` : ""}
            </div>
            ${versionSummary(r) ? `<p class="mc-version">${versionSummary(r)}</p>` : ""}
            <span class="portions mc-portions">
              <button data-minus="${r.id}" aria-label="Moins de portions">−</button>
              <span class="val">${portionsOf(r)} ${r.portions.label}</span>
              <button data-plus="${r.id}" aria-label="Plus de portions">+</button>
            </span>
            <div class="mc-actions">
              <a class="mc-btn" href="${cookHref(r)}">${ICON.chef} ${cookingStep(r) ? "Reprendre" : "Cuisiner"}</a>
              <button class="mc-btn" data-share="${r.id}">${ICON.share} Partager</button>
            </div>
          </div>
          <button class="mc-x" data-remove="${r.id}" aria-label="Retirer du menu">✕</button>
        </article>`;
      }).join("")}
    </div>
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
    if (rm) { toggleMenu(rm.dataset.remove); renderMenu(); return; }
    const step = e.target.closest("[data-minus], [data-plus]");
    if (!step) return;
    const id = step.dataset.minus || step.dataset.plus;
    const r = byId(id);
    const p = portionsOf(r) + (step.dataset.plus ? 1 : -1);
    if (p < 1 || p > 24) return;
    state.portions[id] = p;
    save(); updateBadge(); renderMenu();
  });

  document.getElementById("share-menu").addEventListener("click", shareMenu);

  document.getElementById("clear-menu").addEventListener("click", () => {
    if (!confirm("Retirer toutes les recettes du menu ?\nLes articles ajoutés à la main resteront dans la liste de courses.")) return;
    state.menu = [];
    save(); updateBadge(); renderMenu();
  });
}

/* ---------- Liste de courses ---------- */

function buildCourseList() {
  const map = new Map();
  for (const id of state.menu) {
    const r = byId(id);
    if (!r) continue;
    const f = (state.portions[id] || r.portions.base) / r.portions.base;
    for (const ing of effectiveIngredients(r)) {
      if (ing.course === false) continue;
      const shop = ing.shop || {};
      const key = ing.cid || ing.name.toLowerCase();
      const label = shop.label || ing.name;
      const qty = "qty" in shop ? shop.qty : ing.qty;
      const unit = "unit" in shop ? shop.unit : (ing.unit || "");
      const qtyText = shop.qtyText != null ? shop.qtyText : (qty == null ? ing.qtyText : null);
      const note = shop.note || null;
      const scaled = qty == null ? null : qty * f;
      if (!map.has(key)) {
        map.set(key, { key, label, unit, qty: scaled, qtyText, rayon: ing.rayon, notes: note ? [note] : [], optional: !!ing.optional, addon: !!ing.addon });
      } else {
        const it = map.get(key);
        if (it.qty != null && scaled != null && it.unit === unit) it.qty += scaled;
        else if (it.qty == null && scaled != null) { it.qty = scaled; it.unit = unit; }
        if (note && !it.notes.includes(note)) it.notes.push(note);
        if (!it.qtyText && qtyText) it.qtyText = qtyText;
        it.optional = it.optional && !!ing.optional;
        it.addon = it.addon && !!ing.addon;
      }
    }
  }
  for (const it of map.values()) {
    if (it.qty != null && !WEIGHT_UNITS.includes(it.unit)) it.qty = Math.ceil(it.qty);
  }
  return [...map.values()];
}

function courseQtyStr(it) {
  if (it.qty != null) return `${fmtQty(it.qty)} ${fmtUnit(it.unit, it.qty)}`.trim();
  return it.qtyText || "";
}

function renderCourses() {
  const ids = state.menu.filter(byId);
  const items = buildCourseList();
  const extras = state.extras;

  if (!ids.length && !extras.length) {
    app.innerHTML = `
      <header class="page-head courses-head fade-in">
        <div class="head-branch">${ILLO.D.olive}</div>
        <h1>Liste de courses</h1>
      </header>
      <div class="empty-illo cheers">${ILLO.D.cheers}</div>
      <p class="empty">Ta liste est vide.<br>Ouvre une recette et touche <span class="nowrap">« Ajouter au menu »</span> : les ingrédients se rangeront tout seuls par rayon, quantités fusionnées.</p>
      <div style="text-align:center"><a class="btn-icon" href="#/">${ICON.back} Voir les recettes</a></div>
    `;
    return;
  }

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
      ${ids.map(id => {
        const r = byId(id);
        const p = state.portions[id] || r.portions.base;
        return `<span class="menu-chip"><a href="#/recette/${id}" style="text-decoration:none;color:inherit">${r.emoji} ${r.title} · ${p} ${r.portions.label}</a><button class="x" data-remove="${id}" aria-label="Retirer du menu">✕</button></span>`;
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
              ${it.extra ? `<button class="x" data-remove-extra="${it.key.slice(2)}" style="border:none;background:none;color:var(--muted);font-size:14px" aria-label="Supprimer">✕</button>` : ""}
            </label></li>`).join("")}
        </ul>
      </section>`).join("")}
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
    const rm = e.target.closest("[data-remove]");
    if (rm) {
      toggleMenu(rm.dataset.remove);
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

function shareList() {
  const items = buildCourseList();
  const lines = ["🛒 Liste de courses — Carnet de cuisine", ""];
  const ids = state.menu.filter(byId);
  if (ids.length) {
    lines.push("Menu : " + ids.map(id => byId(id).title).join(", "), "");
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

/* ---------- Démarrage ---------- */

route();
drawTray();
ensureTick();

/* Une bulle ramène à l'étape qui tourne, même depuis une autre recette ;
   la croix, elle, arrête le minuteur. */
document.getElementById("timer-tray").addEventListener("click", e => {
  const pill = e.target.closest("[data-timer]");
  if (!pill) return;
  const t = state.timers.find(x => x.id === pill.dataset.timer);
  if (!t) return;
  if (e.target.closest(".t-x")) { cancelTimer(t.id); return; }
  const target = `#/recette/${t.rid}/cuisine/${t.step}`;
  // Même adresse (on a avancé d'étape sans changer le hash) : pas d'événement, on redessine.
  if (location.hash === target) route();
  else location.hash = target;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
