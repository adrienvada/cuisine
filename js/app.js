/* Carnet de cuisine — logique de l'application (vanilla JS, sans dépendance) */

/* ---------- État persistant ---------- */

const STORE_KEY = "carnet-cuisine-v1";

const state = Object.assign(
  { portions: {}, added: {}, checked: {}, extras: [], filter: "Toutes", query: "" },
  JSON.parse(localStorage.getItem(STORE_KEY) || "{}")
);

function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

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
  chef: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><path d="M6 17h12"/></svg>'
};

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

function updateBadge() {
  const n = Object.keys(state.added).length;
  const b = document.getElementById("cart-badge");
  b.hidden = n === 0;
  b.textContent = n;
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
  } else if (parts[0] === "recette" && byId(parts[1])) {
    document.querySelector('[data-tab="home"]').classList.add("active");
    if (parts[2] === "cuisine") renderCook(byId(parts[1]));
    else renderRecipe(byId(parts[1]));
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
  const hay = [r.title, r.subtitle, r.category, ...(r.tags || []), ...r.ingredients.map(i => i.name)].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every(w => hay.includes(w));
}

function renderHome() {
  const cats = ["Toutes", ...new Set(RECIPES.map(r => r.category))];
  app.innerHTML = `
    <header class="masthead fade-in">
      <p class="eyebrow">Le carnet de</p>
      <h1>Cuisine</h1>
      <p class="byline">par Adrien Vada</p>
    </header>
    <div class="searchbar">
      ${ICON.search}
      <input id="search" type="search" placeholder="Une recette, un ingrédient…" value="${state.query}" autocomplete="off">
    </div>
    <div class="chips" id="chips">
      ${cats.map(c => `<button class="chip ${state.filter === c ? "on" : ""}" data-cat="${c}">${c}</button>`).join("")}
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
  drawGrid();
}

function drawGrid() {
  const list = RECIPES.filter(r => (state.filter === "Toutes" || r.category === state.filter) && matches(r, state.query));
  const grid = document.getElementById("grid");
  if (!list.length) {
    grid.innerHTML = `<p class="empty" style="grid-column:1/-1">Aucune recette ne correspond…<br>La prochaine fournée arrive bientôt !</p>`;
    return;
  }
  grid.innerHTML = list.map(r => `
    <a class="card fade-in" href="#/recette/${r.id}">
      <div class="visual" style="background:${r.color}22">${r.image ? `<img src="${r.image}" alt="">` : r.emoji}</div>
      <div class="body">
        <h3>${r.title}</h3>
        <div class="meta">${ICON.clock} ${fmtTime(totalTime(r))}${r.times.cuisson == null ? " · sans cuisson" : ""}</div>
      </div>
    </a>
  `).join("");
}

/* ---------- Page recette ---------- */

function renderRecipe(r) {
  const portions = state.portions[r.id] || r.portions.base;
  const inList = !!state.added[r.id];
  const t = r.times;
  app.innerHTML = `
    <div class="topbar fade-in">
      <a class="btn-icon" href="#/">${ICON.back} Recettes</a>
    </div>
    <div class="hero"><div class="visual" style="background:${r.color}33">${r.image ? `<img src="${r.image}" alt="">` : r.emoji}</div></div>
    <div class="r-head">
      <h1>${r.title}</h1>
      <p class="subtitle">${r.subtitle}</p>
      <div class="timerow">
        ${t.prep ? `<span class="timechip">${ICON.clock} Préparation : ${fmtTime(t.prep)}</span>` : ""}
        ${t.repos ? `<span class="timechip">${ICON.clock} ${r.reposLabel || "Repos"} : ${fmtTime(t.repos)}</span>` : ""}
        ${t.cuisson != null ? `<span class="timechip">${ICON.flame} Cuisson : ${fmtTime(t.cuisson)}</span>` : `<span class="timechip">${ICON.flame} Sans cuisson</span>`}
      </div>
    </div>

    <section class="section">
      <h2>Ingrédients
        <span class="portions">
          <button id="p-minus" aria-label="Moins de portions">−</button>
          <span class="val" id="p-val"></span>
          <button id="p-plus" aria-label="Plus de portions">+</button>
        </span>
      </h2>
      <ul class="ing-list" id="ing-list"></ul>
    </section>

    <section class="section">
      <h2>Préparation</h2>
      <ol class="steps">
        ${r.steps.map((s, i) => `
          <li>
            <span class="num">${i + 1}</span>
            <div>
              <h3>${s.t}</h3>
              <p>${s.txt}</p>
              ${s.tip ? `<div class="tip"><b>${s.tip.t}</b>${s.tip.txt}</div>` : ""}
            </div>
          </li>`).join("")}
      </ol>
    </section>

    ${r.note ? `<p class="recipe-note">« ${r.note} »</p>` : ""}

    <div class="actions">
      <button class="btn ${inList ? "added" : "secondary"}" id="add-list">
        ${inList ? ICON.check + " Dans la liste" : ICON.cart + " Liste de courses"}
      </button>
      <a class="btn primary" href="#/recette/${r.id}/cuisine">${ICON.chef} Mode cuisine</a>
    </div>
  `;

  const drawIngredients = () => {
    const p = state.portions[r.id] || r.portions.base;
    const f = p / r.portions.base;
    document.getElementById("p-val").textContent = `${p} ${r.portions.label}`;
    document.getElementById("ing-list").innerHTML = r.ingredients.map(ing => {
      const q = scaleQty(ing.qty, ing.unit, f);
      const qtyStr = q != null ? `${fmtQty(q)} ${fmtUnit(ing.unit, q)}`.trim() : (ing.qtyText || "—");
      return `<li>
        <span class="qty">${qtyStr}</span>
        <span>${ing.name}${ing.optional ? `<span class="opt">optionnel</span>` : ""}${ing.note ? `<span class="note"> — ${ing.note}</span>` : ""}</span>
      </li>`;
    }).join("");
  };

  document.getElementById("p-minus").addEventListener("click", () => {
    const p = state.portions[r.id] || r.portions.base;
    if (p > 1) { state.portions[r.id] = p - 1; save(); drawIngredients(); }
  });
  document.getElementById("p-plus").addEventListener("click", () => {
    const p = state.portions[r.id] || r.portions.base;
    if (p < 24) { state.portions[r.id] = p + 1; save(); drawIngredients(); }
  });
  document.getElementById("add-list").addEventListener("click", e => {
    if (state.added[r.id]) {
      delete state.added[r.id];
      e.currentTarget.className = "btn secondary";
      e.currentTarget.innerHTML = ICON.cart + " Liste de courses";
      toast("Retirée de la liste de courses");
    } else {
      state.added[r.id] = true;
      e.currentTarget.className = "btn added";
      e.currentTarget.innerHTML = ICON.check + " Dans la liste";
      toast("Ajoutée à la liste de courses");
    }
    save(); updateBadge();
  });
  drawIngredients();
}

/* ---------- Mode cuisine ---------- */

let cookIdx = 0, wakeLock = null, timerInt = null, timerEnd = null;

async function acquireWakeLock() {
  try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); } catch (e) {}
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && document.querySelector(".cook")) acquireWakeLock();
});

function stopCookMode() {
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}

function stopTimer() {
  clearInterval(timerInt); timerInt = null; timerEnd = null;
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

function renderCook(r) {
  cookIdx = 0;
  acquireWakeLock();
  const draw = () => {
    const s = r.steps[cookIdx];
    const last = cookIdx === r.steps.length - 1;
    app.innerHTML = `
      <div class="cook">
        <div class="cook-top">
          <span class="title">${r.title}</span>
          <button class="cook-close" id="cook-close" aria-label="Fermer">✕</button>
        </div>
        <div class="cook-progress">${r.steps.map((_, i) => `<i class="${i <= cookIdx ? "done" : ""}"></i>`).join("")}</div>
        <div class="cook-body">
          <div>
            <p class="cook-step-label">Étape ${cookIdx + 1} / ${r.steps.length}</p>
            <h2>${s.t}</h2>
            <p class="txt">${s.txt}</p>
            ${s.tip ? `<div class="tip"><b>${s.tip.t}</b>${s.tip.txt}</div>` : ""}
            <div class="cook-timer" id="timer-zone"></div>
          </div>
        </div>
        <div class="cook-nav">
          <button id="prev" ${cookIdx === 0 ? "disabled" : ""}>Précédent</button>
          <button id="next" class="main">${last ? "Terminer  ✓" : "Suivant"}</button>
        </div>
      </div>
    `;
    document.getElementById("cook-close").addEventListener("click", () => { history.back(); });
    document.getElementById("prev").addEventListener("click", () => { if (cookIdx > 0) { cookIdx--; draw(); } });
    document.getElementById("next").addEventListener("click", () => {
      if (last) { stopTimer(); location.hash = `#/recette/${r.id}`; toast("Bon appétit !"); }
      else { cookIdx++; draw(); }
    });
    drawTimerZone(s);
  };

  const drawTimerZone = s => {
    const zone = document.getElementById("timer-zone");
    if (!zone) return;
    if (timerEnd) {
      const left = Math.max(0, Math.round((timerEnd - Date.now()) / 1000));
      zone.innerHTML = `
        <span class="clock ${left === 0 ? "flash" : ""}" id="clock">${fmtClock(left)}</span>
        <button id="timer-stop">${left === 0 ? "OK" : "Annuler"}</button>`;
      document.getElementById("timer-stop").addEventListener("click", () => { stopTimer(); drawTimerZone(s); });
    } else if (s.timer) {
      zone.innerHTML = `<button id="timer-start">${ICON.timer} Minuteur ${fmtTime(s.timer)}</button>`;
      document.getElementById("timer-start").addEventListener("click", () => {
        timerEnd = Date.now() + s.timer * 60000;
        timerInt = setInterval(() => {
          const left = Math.max(0, Math.round((timerEnd - Date.now()) / 1000));
          const c = document.getElementById("clock");
          if (c) c.textContent = fmtClock(left);
          if (left === 0) {
            clearInterval(timerInt); timerInt = null;
            beep();
            if (c) c.classList.add("flash");
            document.title = "⏰ C'est prêt !";
            setTimeout(() => { document.title = "Carnet de cuisine"; }, 5000);
          }
        }, 500);
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

/* ---------- Liste de courses ---------- */

function buildCourseList() {
  const map = new Map();
  for (const id of Object.keys(state.added)) {
    const r = byId(id);
    if (!r) continue;
    const f = (state.portions[id] || r.portions.base) / r.portions.base;
    for (const ing of r.ingredients) {
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
        map.set(key, { key, label, unit, qty: scaled, qtyText, rayon: ing.rayon, notes: note ? [note] : [], optional: !!ing.optional });
      } else {
        const it = map.get(key);
        if (it.qty != null && scaled != null && it.unit === unit) it.qty += scaled;
        else if (it.qty == null && scaled != null) { it.qty = scaled; it.unit = unit; }
        if (note && !it.notes.includes(note)) it.notes.push(note);
        if (!it.qtyText && qtyText) it.qtyText = qtyText;
        it.optional = it.optional && !!ing.optional;
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
  const ids = Object.keys(state.added);
  const items = buildCourseList();
  const extras = state.extras;

  if (!ids.length && !extras.length) {
    app.innerHTML = `
      <header class="page-head fade-in"><h1>Liste de courses</h1></header>
      <p class="empty">Ta liste est vide.<br>Ouvre une recette et touche « Liste de courses » : les ingrédients se rangeront tout seuls par rayon, quantités fusionnées.</p>
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
    <header class="page-head fade-in">
      <h1>Liste de courses</h1>
      <p>${ids.length ? `Pour ${ids.length} recette${ids.length > 1 ? "s" : ""} — quantités fusionnées par rayon` : "Articles ajoutés à la main"}</p>
    </header>
    <div class="menu-chips">
      ${ids.map(id => {
        const r = byId(id);
        const p = state.portions[id] || r.portions.base;
        return `<span class="menu-chip"><a href="#/recette/${id}" style="text-decoration:none;color:inherit">${r.emoji} ${r.title} · ${p} pers.</a><button class="x" data-remove="${id}" aria-label="Retirer">✕</button></span>`;
      }).join("")}
    </div>
    ${grouped.map(g => `
      <section class="rayon">
        <h2>${g.rayon}</h2>
        <ul class="course-list">
          ${g.items.map(it => `
            <li><label>
              <input type="checkbox" data-key="${it.key}" ${state.checked[it.key] ? "checked" : ""}>
              <span class="tick">${ICON.check}</span>
              <span class="lbl">${it.label}${it.optional ? ` <span class="opt" style="font-size:11.5px;color:var(--gold)">optionnel</span>` : ""}${it.notes && it.notes.length ? `<span class="cnote">${it.notes.join(" · ")}</span>` : ""}</span>
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
    save(); renderCourses();
  });

  document.getElementById("share").addEventListener("click", shareList);

  document.getElementById("clear").addEventListener("click", () => {
    if (!confirm("Vider toute la liste de courses ?")) return;
    state.added = {}; state.checked = {}; state.extras = [];
    save(); updateBadge(); renderCourses();
  });

  function onCheck(e) {
    const cb = e.target.closest("input[data-key]");
    if (!cb) return;
    if (cb.checked) state.checked[cb.dataset.key] = true;
    else delete state.checked[cb.dataset.key];
    save();
  }

  function onCourseClick(e) {
    const rm = e.target.closest("[data-remove]");
    if (rm) {
      delete state.added[rm.dataset.remove];
      save(); updateBadge(); renderCourses();
      return;
    }
    const rx = e.target.closest("[data-remove-extra]");
    if (rx) {
      e.preventDefault();
      state.extras = state.extras.filter(x => x.id !== rx.dataset.removeExtra);
      save(); renderCourses();
    }
  }
}

function shareList() {
  const items = buildCourseList();
  const lines = ["🛒 Liste de courses — Carnet de cuisine", ""];
  const ids = Object.keys(state.added);
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
  const text = lines.join("\n").trim();
  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => toast("Liste copiée !"));
  }
}

/* ---------- Démarrage ---------- */

route();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
