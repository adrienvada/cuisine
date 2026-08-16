/* Carnet de cuisine — logique de l'application (vanilla JS, sans dépendance) */

/* ---------- État persistant ---------- */

const STORE_KEY = "carnet-cuisine-v1";

const state = Object.assign(
  { portions: {}, menu: [], checked: {}, extras: [], filter: "Toutes", query: "", notes: {}, cooked: {}, timers: [], choices: {}, addons: {}, cooking: {}, fondQuery: "", hintMenuOff: false, hintCoursesOff: false },
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

/* Recettes renommées : tout ce qui était rangé sous l'ancien identifiant suit,
   sans quoi un renommage effacerait verdicts, compteurs et menu en cours. */
(function migrerRenommages() {
  let bouge = false;
  for (const [ancien, actuel] of Object.entries(RECIPE_RENAMES)) {
    for (const table of ["portions", "notes", "cooked", "cooking", "choices", "addons"]) {
      const t = state[table];
      if (!t || !(ancien in t)) continue;
      if (!(actuel in t)) t[actuel] = t[ancien];   // l'existant l'emporte
      delete t[ancien];
      bouge = true;
    }
    for (const t of state.timers) if (t.rid === ancien) { t.rid = actuel; bouge = true; }
  }
  const menu = [...new Set(state.menu.map(id => RECIPE_RENAMES[id] || id))];
  if (menu.join("|") !== state.menu.join("|")) { state.menu = menu; bouge = true; }
  if (bouge) save();
})();

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
  /* Préparation : un couteau de chef — le temps qu'on passe les mains dedans. */
  knife: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 3.5 14.5 14.5C9 16.5 4.5 13 3.5 3.5z"/><path d="M15.6 13.4 20.6 18.4a1.6 1.6 0 0 1-2.2 2.2L13.4 15.6z"/></svg>',
  /* Repos : deux Z — le temps où la recette travaille sans nous. */
  zzz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13.5h5l-5 6h5"/><path d="M12 4h8l-8 9h8"/></svg>',
  chef: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><path d="M6 17h12"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.99-5.1 9.9-7.34 11.86a1 1 0 0 1-1.32 0C9.1 19.9 4 14.99 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  /* Fiole : ce qui s'explique et se transmet d'une recette à l'autre. */
  fiole: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2h5"/><path d="M10.5 2v6.2L5.3 18.4A2 2 0 0 0 7.1 21h9.8a2 2 0 0 0 1.8-2.6L13.5 8.2V2"/><path d="M7.7 14h8.6"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>'
};

/* Pastille « Découverte à… » — facultative, cf. l'en-tête de recipes.js */
function discoveredHtml(r) {
  if (!r.discovered) return "";
  return `<p class="disc-row"><span class="discovered">${ICON.pin}Découverte ${r.discovered}</span></p>`;
}

/* Version abrégée de `discovered` pour la pastille des vignettes :
   sans article/préposition d'intro, et sans détail superflu — juste
   « Lieu, Ville ». Ex. « à l'hôtel Park Plaza Victoria, à Amsterdam »
   → « Hôtel Pla. Vic., Amsterdam ». */
function abbrevDiscovered(text) {
  const capFirst = s => s.charAt(0).toUpperCase() + s.slice(1);
  const abbrevWord = w => {
    // Contraction (d'Aligre, l'Écailler…) : n'abrège que la partie après l'apostrophe.
    const m = w.match(/^([a-zàâäéèêëïîôöùûüç]['’])(.+)$/i);
    if (m) return m[1] + (m[2].length <= 3 ? m[2] : m[2].slice(0, 3) + ".");
    return w.length <= 3 ? w : w.slice(0, 3) + ".";
  };
  const abbrevPlace = phrase => {
    const [first, ...rest] = phrase.split(/\s+/);
    const kept = rest.length > 2 ? rest.slice(rest.length - 2) : rest;
    return [capFirst(first), ...kept.map(abbrevWord)].join(" ");
  };
  const stripped = text.replace(/^\s*(à l['’]|au\s|à la\s|aux\s|chez\s|du\s|des\s|de l['’]|en\s|à\s)/i, "").trim();
  const commaIdx = stripped.indexOf(",");
  if (commaIdx === -1) return abbrevPlace(stripped);
  const place = stripped.slice(0, commaIdx).trim();
  const cityWords = stripped.slice(commaIdx + 1).trim().split(/\s+/);
  const city = capFirst(cityWords[cityWords.length - 1].replace(/[.,;:]+$/, ""));
  return `${abbrevPlace(place)}, ${city}`;
}

/* ---------- Verdicts & recettes déjà cuisinées ---------- */

const VERDICTS = [
  { id: "encore", label: "♥ Coup de cœur", tag: "♥ Coup de cœur" }
];

const FAV_FILTER = "coup-de-coeur";

/* Ordre des catégories dans les filtres : celui d'un repas, boissons en dernier. */
const CATEGORY_ORDER = ["Apéro", "Entrées", "Soupes", "Salades", "Sauces", "Desserts", "Boissons"];
const byCategoryOrder = (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b);

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

/* Visuel d'une recette : photo si dispo, sinon illustration dessinée, sinon emoji.
   Les vignettes chargent en différé ; passer eager=true pour l'image principale
   d'une page (elle doit arriver tout de suite). */
function visualOf(r, eager) {
  if (r.image) return `<img src="${r.image}" alt=""${eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"'}>`;
  return ILLO.FOOD[r.id] || r.emoji;
}

/* Encadré d'astuce, façon livre de cuisine (toque ou plume selon le titre) */
/* Deux registres : l'astuce du chef (toque verte) et le repère à savoir (plume
   dorée). Le champ `k` le dit explicitement — auparavant on le devinait du titre
   à l'expression régulière, si bien que renommer une astuce changeait son
   apparence en silence. */
function tipHtml(tip, savoirs = "") {
  const savoir = tip.k === "savoir";
  return `<div class="tip ${savoir ? "beige" : ""}${savoirs ? " a-savoirs" : ""}">
    <span class="tip-ico">${savoir ? ILLO.D.plume : ILLO.D.toque}</span>
    <div class="tip-body"><b>${tip.t}</b>${tip.txt}${savoirs}</div>
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

/* Temps qu'ajouteraient tous les suppléments minutés (torréfier des graines,
   faire tremper un oignon…). `poste` restreint à « prep », « repos » ou
   « cuisson » ; sans lui, on additionne tout. */
const addonTime = (r, poste) => (r.addons || []).reduce(
  (n, a) => n + (a.step && a.step.timer && (!poste || a.step.adds === poste) ? a.step.timer : 0), 0);

function rangeTime(min, max) {
  if (min === max) return fmtTime(min);
  // Même unité de part et d'autre : on ne la répète pas — « 45 – 55 min ».
  if (max < 60) return `${min} – ${max} min`;
  return `${fmtTime(min)} – ${fmtTime(max)}`;
}

/* Un temps affiché, en fourchette dès que des suppléments peuvent l'allonger.
   Quand la recette nue n'a rien à ce poste, la fourchette n'aurait pas de sens :
   on annonce « jusqu'à ». */
function timeText(base, extra) {
  if (!extra) return fmtTime(base);
  if (!base) return `jusqu'à ${fmtTime(extra)}`;
  return rangeTime(base, base + extra);
}

/* Le total : la recette nue, et jusqu'où elle monte avec tous les petits plus. */
const totalTimeText = r => rangeTime(totalTime(r), totalTime(r) + addonTime(r));

/* Les trois temps d'une vignette, chacun sous son icône : couteau pour ce qu'on
   fait, Z pour ce qu'on attend, flamme pour ce qui cuit. La recette nue, sans
   fourchette — sur une vignette on annonce le temps le plus court, la fiche
   détaille ce que les suppléments y ajoutent. Un poste absent ne prend pas de
   place, sauf l'absence de cuisson, qui est une information. */
function timeChipsHtml(r) {
  const t = r.times;
  const part = (icone, min) => `<span class="t-part">${icone} ${fmtTime(min)}</span>`;
  return [
    t.prep ? part(ICON.knife, t.prep) : "",
    t.repos ? part(ICON.zzz, t.repos) : "",
    t.cuisson != null ? part(ICON.flame, t.cuisson) : `<span class="t-part">${ICON.flame} sans cuisson</span>`
  ].join("");
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

/* Les quantités écrites au fil d'un texte — « 3 cl pour la pâte », « réservez
   10 cl pour le mixage » — restaient figées quand on bougeait le curseur de
   portions, et contredisaient alors la colonne des quantités juste à côté.
   On les écrit désormais entre accolades pour qu'elles suivent l'échelle :
   {3 cl}, {1-2 c. à s.}, {2} (sans unité). Une quantité laissée nue reste nue,
   ce qui est voulu pour tout ce qui ne dépend pas des portions : une largeur
   de bande en centimètres, un « 2 cl par verre ». */
const QTE_ECHELLE = /\{(\d+(?:[.,]\d+)?)(?:\s*[–-]\s*(\d+(?:[.,]\d+)?))?\s*([^}]*)\}/g;

function scaleText(txt, f) {
  if (!txt) return txt;
  return txt.replace(QTE_ECHELLE, (_, a, b, unit) => {
    unit = unit.trim();
    const q = n => scaleQty(parseFloat(n.replace(",", ".")), unit, f);
    const min = q(a), max = b ? q(b) : min;
    const nombre = min === max ? fmtQty(min) : `${fmtQty(min)} à ${fmtQty(max)}`;
    return `${nombre} ${fmtUnit(unit, max)}`.trim();
  });
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

/* Rangées dans l'ordre où il faut s'y mettre : la plus longue d'abord, pour que
   tout arrive à table en même temps. À durée égale, l'ordre d'ajout tranche. */
const menuRecipes = () => state.menu.map(byId).filter(Boolean)
  .sort((a, b) => totalTime(b) - totalTime(a));

function toggleMenu(id) {
  if (inMenu(id)) state.menu = state.menu.filter(x => x !== id);
  else state.menu.push(id);
  if (!state.menu.length) resetHints();
  save(); updateBadge();
  return inMenu(id);
}

function portionsOf(r) { return state.portions[r.id] || r.portions.base; }

/* ---------- La forme d'un repas ----------
   Le menu dessine parfois un repas de lui-même : quelque chose à l'apéro, puis
   à table, puis un dessert. Dans ce cas — et seulement dans ce cas — le carnet
   se permet de souffler ce qui manque. Un apéro, une salade seule, n'importe
   quelle sélection volontairement partielle : il se tait, et rien ne distingue
   la page de ce qu'elle serait sans ce mécanisme.

   Boissons et sauces accompagnent le repas sans en former un moment : trois
   toasts et un cocktail restent un apéro, une salade et sa vinaigrette restent
   une salade. Les compter réveillerait le mécanisme là où on ne lui demande
   rien — c'est exactement ce qu'il ne doit jamais faire. */

const MOMENT_TABLE = ["Entrées", "Soupes", "Salades"];

function menuMoments() {
  const cats = new Set(state.menu.map(byId).filter(Boolean).map(r => r.category));
  return {
    apero: cats.has("Apéro"),
    table: MOMENT_TABLE.some(c => cats.has(c)),
    dessert: cats.has("Desserts"),
    boisson: cats.has("Boissons")
  };
}

/* Deux moments qui se mangent : le menu a pris la forme d'un repas tout seul. */
function menuLooksLikeMeal() {
  const m = menuMoments();
  return [m.apero, m.table, m.dessert].filter(Boolean).length >= 2;
}

/* Ce qu'on propose de compléter — jamais l'apéro : un repas sans apéro est
   complet, un repas sans rien à table ne l'est pas. On signale un trou, pas
   une absence de luxe. */
const MOMENTS_A_COMBLER = [
  { id: "table", label: "de quoi se mettre à table", cats: MOMENT_TABLE },
  { id: "dessert", label: "un dessert", cats: ["Desserts"] },
  { id: "boisson", label: "une boisson", cats: ["Boissons"] }
];

/* Où envoyer : la première catégorie du moment qui a effectivement des recettes.
   Sans quoi on proposerait un rayon vide. */
const catDuMoment = x => x.cats.find(c => RECIPES.some(r => r.category === c));

function momentsManquants() {
  if (state.hintMenuOff || !menuLooksLikeMeal()) return [];
  const m = menuMoments();
  return MOMENTS_A_COMBLER.filter(x => !m[x.id] && catDuMoment(x));
}

/* Ce qu'un repas suppose sans qu'aucune recette ne le porte. Le doute profite
   au silence : mieux vaut ne rien dire à tort que proposer du pain à qui a
   prévu une focaccia — d'où des familles de mots larges.

   Le pain y est seul, et c'est voulu. Le fromage a été essayé : il se
   déclenchait à tous les repas, donc plus jamais à propos. Un repas sans
   fromage est complet, comme un repas sans apéro ; un repas sans pain se
   remarque. On ne signale que le trou. */
const BASIQUES = [
  { id: "pain", chip: "Du pain", article: "Pain",
    re: /pain|baguette|focaccia|brioche|tartine|toast|pita|grissin|craquant|blini|crouton/i }
];

function basiquesManquants() {
  if (state.hintCoursesOff || !menuLooksLikeMeal()) return [];
  const foin = [
    ...menuRecipes().flatMap(r => [r.title, r.category, ...(r.tags || [])]),
    ...buildCourseList().map(i => i.label),
    ...state.extras.map(x => x.name)
  ].join(" ");
  return BASIQUES.filter(b => !b.re.test(foin));
}

/* Un menu vidé, c'est un repas qui n'a plus rien à voir avec le précédent :
   les refus qu'on avait opposés aux suggestions n'ont plus lieu d'être. */
function resetHints() { state.hintMenuOff = false; state.hintCoursesOff = false; }

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
    if (!c) return { ...s };
    /* L'emplacement de choix peut porter ses propres fondamentaux — l'émulsion
       vaut pour les trois vinaigrettes. On les réunit à ceux de l'option plutôt
       que de les perdre en écrasant l'étape. */
    const opt = optionOf(r, c).step;
    return { ...opt, fond: [...fondIds(s), ...fondIds(opt)] };
  });
  for (const a of selectedAddons(r)) {
    if (!a.step) continue;
    const s = steps[Math.min(a.step.i, steps.length - 1)];
    (s.extras = s.extras || []).push({ id: a.id, emoji: a.emoji, label: a.label, txt: a.step.txt, timer: a.step.timer, fond: a.step.fond });
  }
  return steps;
}

/* ---------- Fondamentaux ---------- */

/* `fond` s'écrit au singulier ou au pluriel : "emulsion" ou ["emulsion", "maillard"]. */
const fondIds = o => (!o || !o.fond) ? [] : (Array.isArray(o.fond) ? o.fond : [o.fond]);

const fondById = id => FONDAMENTAUX.find(f => f.id === (FONDAMENTAL_RENAMES[id] || id)) || null;

/* Les fondamentaux d'une étape, dédoublonnés : une étape peut hériter du même
   mécanisme par son emplacement de choix et par son option. */
const fondsDe = o => [...new Set(fondIds(o).map(id => (fondById(id) || {}).id).filter(Boolean))].map(fondById);

/* Liste inverse — calculée, jamais écrite, exactement comme la liste de courses
   se calcule depuis le menu. Un fondamental ne tient donc aucun registre. */
function recettesDuFond(id) {
  const vise = f => (FONDAMENTAL_RENAMES[f] || f) === id;
  return RECIPES.filter(r =>
    r.steps.some(s => fondIds(s).some(vise)) ||
    (r.choices || []).some(c => c.options.some(o => fondIds(o.step).some(vise))) ||
    (r.addons || []).some(a => fondIds(a.step).some(vise)));
}

/* Ce que le carnet sait vraiment. Affiché tel quel : une explication inventée
   coûte plus cher qu'un aveu d'ignorance. */
const CERTITUDES = {
  etabli: { l: "Mécanisme établi", d: "Compris et documenté." },
  partiel: { l: "Partiellement expliqué", d: "On en connaît une partie, le reste est discuté." },
  empirique: { l: "Empirique", d: "Le geste marche, le mécanisme n'est pas élucidé." }
};

/* Le savoir se découvre en touchant l'astuce, il ne s'impose pas. Une pastille
   permanente sous chaque astuce prenait autant de place que l'astuce elle-même
   et alourdissait la lecture d'une étape. L'appel est donc une simple ligne,
   dans l'encre du titre de l'astuce, et l'appui ne fait que RÉVÉLER le lien —
   il n'ouvre rien. Un doigt posé par mégarde en cuisinant ne coûte donc pas
   une lecture qu'on n'a pas demandée, seulement une ligne à replier. */
const savoirsHtml = o => {
  const list = fondsDe(o);
  if (!list.length) return "";
  return `<div class="savoirs">
    <span class="s-cue">Pourquoi ça marche${ICON.chev}</span>
    <div class="s-liste">${list.map(f =>
      `<a class="s-lien" role="button" tabindex="0" data-fond="${f.id}"><span class="s-emoji">${f.emoji}</span>${f.t}${ICON.chev}</a>`).join("")}</div>
  </div>`;
};

/* L'astuce reste ce qu'elle est ; l'appel au savoir se glisse à sa suite, dans
   le même encadré. Une étape qui met un mécanisme en jeu sans avoir d'astuce —
   il y en a treize — porte la ligne seule. */
const astuceHtml = s => {
  const sav = savoirsHtml(s);
  if (s.tip) return tipHtml(s.tip, sav);
  return sav ? `<div class="savoirs-seuls a-savoirs">${sav}</div>` : "";
};

/* Corps d'un fondamental — le même dans la feuille et dans la page partagée :
   deux contenants, une seule vérité. */
function fondBodyHtml(f) {
  const c = CERTITUDES[f.certitude] || CERTITUDES.partiel;
  const recettes = recettesDuFond(f.id);
  /* L'ordre n'est pas cosmétique : on ouvre cette feuille une casserole sur le
     feu. Ce qu'on fait vient donc avant pourquoi ça marche — la science reste
     entière, une longueur de pouce plus bas. */
  return `
    <p class="f-accroche">${f.accroche}</p>
    ${f.cas && f.cas.length ? `<div class="f-bloc">
      <h4>Selon les cas</h4>
      <dl class="f-cas">${f.cas.map(x => `<dt>${x.q}</dt><dd>${x.r}</dd>`).join("")}</dl>
    </div>` : ""}
    ${f.reperes && f.reperes.length ? `<div class="f-bloc">
      <h4>À retenir</h4>
      <ul class="f-rep">${f.reperes.map(x => `<li>${x}</li>`).join("")}</ul>
    </div>` : ""}
    <div class="f-bloc">
      <h4>Pourquoi ça marche</h4>
      <span class="f-cert f-cert-${f.certitude}">${c.l}</span>
      ${f.pourquoi.split("\n\n").map(p => `<p>${p}</p>`).join("")}
      ${f.certitude !== "etabli" ? `<p class="f-cert-note">${c.d}</p>` : ""}
    </div>
    ${f.piege ? `<div class="f-piege"><b>L'erreur classique</b>${f.piege}</div>` : ""}
    ${recettes.length ? `<div class="f-bloc">
      <h4>Dans le carnet</h4>
      <div class="f-recettes">${recettes.map(r =>
        `<a class="f-rec" href="#/recette/${r.id}"><span>${r.emoji}</span>${r.title}</a>`).join("")}</div>
    </div>` : `<p class="f-orphelin">Pas encore rattaché à une recette du carnet.</p>`}
    ${f.source ? `<p class="f-source">${f.source}</p>` : ""}`;
}

/* Ouverture par-dessus l'endroit où l'on se trouve : aucune adresse ne change,
   donc `route()` n'est pas rappelée — le mode cuisine garde son étape, son
   réveil d'écran et sa position de lecture. Même parti pris que la feuille
   d'ajout au menu, et pour les mêmes raisons. */
function openFondSheet(id) {
  const f = fondById(id);
  if (!f) return;
  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop fond-sheet";
  backdrop.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${f.t}">
      <div class="sheet-grip"></div>
      <div class="f-top">
        <h3><span class="f-emoji">${f.emoji}</span>${f.t}</h3>
        <button type="button" class="f-share" id="f-share" aria-label="Partager ce fondamental">${ICON.share}</button>
      </div>
      ${fondBodyHtml(f)}
      <button type="button" class="btn secondary f-close" id="f-close">Fermer</button>
    </div>`;
  const surEchap = e => { if (e.key === "Escape") fermerFeuille(); };
  /* Un lien vers une recette ne navigue pas tout de suite : on dépile d'abord
     l'entrée de la feuille, sinon les deux gestes se croisent et l'un annule
     l'autre. La navigation se fait donc une fois la feuille retirée. */
  let ensuite = null;
  backdrop.addEventListener("click", e => {
    if (e.target === backdrop || e.target.closest("#f-close")) return fermerFeuille();
    if (e.target.closest("#f-share")) return shareFond(f.id);
    const lien = e.target.closest("a[href]");
    if (lien) {
      e.preventDefault();
      const cible = lien.getAttribute("href");
      ensuite = () => { location.hash = cible; };
      fermerFeuille();
    }
  });
  document.addEventListener("keydown", surEchap);
  ouvrirFeuille(backdrop, () => {
    document.removeEventListener("keydown", surEchap);
    if (ensuite) { const aller = ensuite; ensuite = null; aller(); }
  });
}

/* ---------- Feuilles ---------- */

/* Une feuille est un état, et sur téléphone le geste de retour est la façon de
   refermer un état. Chaque feuille empile donc une entrée d'historique — à la
   même adresse, donc sans réveiller le routeur : le mode cuisine y garde son
   étape, son réveil d'écran et sa position de lecture.

   La feuille se reconnaît à sa présence dans la page, jamais à un marqueur
   posé dans l'état d'historique : le mode cuisine réécrit l'adresse à chaque
   redessin, et effacerait ce marqueur dès qu'on toucherait une bulle de
   minuteur — elles passent au-dessus des feuilles. */
const feuilleOuverte = () => document.querySelector(".sheet-backdrop");

function ouvrirFeuille(backdrop, auRetrait) {
  backdrop._auRetrait = auRetrait || null;
  document.body.appendChild(backdrop);
  history.pushState(history.state, "", location.hash);
}

/* Toute fermeture passe par le retour — croix, fond, Échap, bouton : un seul
   chemin, donc jamais d'entrée orpheline dans la pile. */
function fermerFeuille() { if (feuilleOuverte()) history.back(); }

window.addEventListener("popstate", () => {
  const f = feuilleOuverte();
  if (!f) return;
  f.remove();
  if (f._auRetrait) f._auRetrait();
});

/* Les feuilles vivent sur <body>, hors de #app : un changement de vue ne les
   emporte pas. On les referme donc à la main à chaque rendu — sans quoi celle
   de l'ajout au menu survivait à la navigation et bloquait la vue suivante. */
function closeSheets() {
  document.querySelectorAll(".sheet-backdrop").forEach(el => {
    el.remove();
    if (el._auRetrait) el._auRetrait();
  });
}

/* Résumé lisible de la version : « Citron & menthe · + tomates cerises, avocat » */
function versionSummary(r) {
  const parts = choiceList(r).map(c => optionOf(r, c).label);
  const adds = selectedAddons(r).map(a => a.label.toLowerCase());
  if (adds.length) parts.push("+ " + adds.join(", "));
  return parts.join(" · ");
}

/* Le geste d'un supplément, affiché dans l'étape concernée.
   En mode cuisine (`cuisine`), un supplément minuté reçoit sa propre zone de
   compte à rebours ; la fiche recette, elle, ne propose jamais de minuteur. */
const extrasHtml = (s, cuisine) => (s.extras || []).map(x => {
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

/* Un fondamental se partage comme une recette : par sa page d'aperçu de `f/`,
   qui porte ses balises Open Graph puis renvoie dans l'application. */
function fondUrl(f) { return siteUrl() + "f/" + f.id + ".html"; }

function fondShareText(f) {
  const c = CERTITUDES[f.certitude] || CERTITUDES.partiel;
  const lines = [`${f.emoji} ${f.t}`, f.accroche, "", "Pourquoi ça marche :", f.pourquoi.split("\n\n")[0]];
  if (f.certitude !== "etabli") lines.push(`(${c.l} — ${c.d})`);
  if (f.reperes && f.reperes.length) lines.push("", "À retenir :", ...f.reperes.map(x => `• ${x}`));
  lines.push("", "Le détail et les cas particuliers :");
  return lines.join("\n");
}

function shareFond(id) {
  const f = fondById(id);
  if (!f) return;
  shareOrCopy({ title: f.t, text: fondShareText(f), url: fondUrl(f) }, "Fondamental copié !");
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

/* D'où l'on vient. Sert aux flèches de retour : une flèche « ← Recettes » ne
   doit pas mentir. Elle revient vraiment en arrière quand c'est de là qu'on
   vient ; sinon elle remplace l'adresse courante — ce qui évite d'empiler un
   doublon et, sur un lien partagé ouvert directement, de faire sortir du site
   alors qu'il n'y a rien derrière. */
let hashCourant = null, hashPrecedent = null, remplacement = false;

/* Remplacer, c'est effacer l'adresse courante sans toucher à celle d'avant :
   `hashPrecedent` ne doit donc pas bouger. */
const allerEnRemplacant = hash => { remplacement = true; location.replace(hash); };

function retourVers(hash) {
  if (hashPrecedent === hash) history.back();
  else allerEnRemplacant(hash);
}

function route() {
  stopCookMode();
  closeSheets();
  if (remplacement) remplacement = false;
  else hashPrecedent = hashCourant;
  hashCourant = location.hash || "#/";
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  // Un lien partagé avant un renommage doit continuer de tomber juste.
  if (parts[0] === "recette" && RECIPE_RENAMES[parts[1]]) {
    parts[1] = RECIPE_RENAMES[parts[1]];
    return allerEnRemplacant("#/" + parts.join("/"));
  }
  if (parts[0] === "fondamental" && FONDAMENTAL_RENAMES[parts[1]]) {
    return allerEnRemplacant(`#/fondamental/${FONDAMENTAL_RENAMES[parts[1]]}`);
  }
  document.querySelectorAll(".tabbar a").forEach(a => a.classList.remove("active"));
  if (parts[0] === "fondamentaux") {
    document.querySelector('[data-tab="fond"]').classList.add("active");
    renderFondamentaux();
  } else if (parts[0] === "fondamental" && fondById(parts[1])) {
    document.querySelector('[data-tab="fond"]').classList.add("active");
    renderFondamental(fondById(parts[1]));
  } else if (parts[0] === "courses") {
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
      if (step != null) return allerEnRemplacant(`#/recette/${r.id}/cuisine/${step}`);
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
  /* Les fondamentaux entrent dans le foin : chercher « émulsion » doit ramener
     les recettes où l'on en fait une, pas seulement celles qui écrivent le mot. */
  const fonds = [...r.steps, ...(r.choices || []).flatMap(c => c.options.map(o => o.step)),
    ...(r.addons || []).map(a => a.step)].flatMap(s => fondsDe(s).map(f => f.t));
  const hay = [r.title, r.subtitle, r.category, ...(r.tags || []), ...r.ingredients.map(i => i.name),
    ...addonList(r).map(a => a.label),
    ...choiceList(r).flatMap(c => c.options.map(o => o.label)), ...fonds].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every(w => hay.includes(w));
}

function renderHome() {
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
    applyFilter(true);
  });
  document.getElementById("grid").addEventListener("click", onShareClick);
  applyFilter(false);
}

function inFilter(r) {
  if (state.filter === "Toutes") return true;
  if (state.filter === FAV_FILTER) return isFav(r);
  return r.category === state.filter;
}

/* Une carte par recette, créée une seule fois par visite de l'accueil.
   Filtrer ne reconstruit plus rien : les cartes restent dans le DOM et
   `applyFilter` ne fait que les montrer, les cacher et les déplacer. */
function cardHtml(r) {
  const v = VERDICTS.find(x => x.id === verdictOf(r));
  const c = cookedOf(r);
  return `
    <a class="card" data-id="${r.id}" href="#/recette/${r.id}">
      <div class="visual" style="background:${r.color}22">${visualOf(r)}
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

const REDUCE_MOTION = matchMedia("(prefers-reduced-motion: reduce)");

/* Une carte en cours de sortie retourne au repos : styles nettoyés, cachée. */
function finishLeave(el) {
  clearTimeout(el._lv);
  if (!el.classList.contains("card-leave")) return;
  el.classList.remove("card-leave");
  el.style.position = el.style.left = el.style.top = el.style.width = el.style.margin = "";
  el.classList.add("gone");
}

/* Filtre la grille façon FLIP : les cartes écartées s'estompent sur place,
   les survivantes glissent vers leur nouvelle position, les entrantes
   apparaissent en fondu. Aucune reconstruction du DOM. */
function applyFilter(animate) {
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
  grid.classList.toggle("no-cat", !(state.filter === "Toutes" || state.filter === FAV_FILTER));
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

/* ---------- Page recette ---------- */

function renderRecipe(r) {
  const inList = inMenu(r.id);
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
      ${visualOf(r, true)}
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
      toast("Coup de cœur retiré");
    } else {
      state.notes[r.id] = v;
      toast("Un coup de cœur de plus ♥");
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

/* Une étape peut faire tourner plusieurs minuteurs : celui de l'étape elle-même
   (slot null) et celui de chaque supplément minuté (slot = son identifiant).
   Les minuteurs enregistrés avant cette notion n'ont pas de `slot` : lus comme
   null, ils restent ceux de leur étape. */
const findTimer = (rid, step, slot = null) =>
  state.timers.find(t => t.rid === rid && t.step === step && (t.slot || null) === slot);

function startTimer(r, stepIdx, { timer, label, emoji }, slot = null) {
  state.timers.push({
    id: Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
    rid: r.id, step: stepIdx, slot,
    label, emoji: emoji || r.emoji,
    end: Date.now() + timer * 60000, total: timer, fired: false
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
        if (btn && btn.hasAttribute("data-stop")) btn.textContent = "OK";
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
  // Les quantités citées dans les étapes suivent les portions réglées sur la fiche.
  const f = portionsOf(r) / r.portions.base;
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
      history.replaceState(history.state, "", `#/recette/${r.id}/cuisine/${cookIdx}`);
      hashCourant = location.hash;
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
            <p class="txt">${scaleText(s.txt, f)}</p>
            ${scaleText(extrasHtml(s, true), f)}
            ${scaleText(astuceHtml(s), f)}
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
      // Arrivé ici par un lien partagé, il n'y a rien derrière : revenir ferait
      // sortir du site. On va alors explicitement à la fiche.
      retourVers(`#/recette/${r.id}`);
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
        toast(first ? "Bon appétit ! Un coup de cœur ?" : "Bon appétit !");
      }
      else { cookIdx++; draw(); }
    });
    drawZones(s);
    // Les zones sont refaites à chaque dessin : on délègue depuis le corps de
    // l'étape, lui aussi recréé, plutôt que d'empiler les écouteurs.
    document.querySelector(".cook-body").addEventListener("click", e => {
      const go = e.target.closest("[data-go]");
      if (go) {
        const x = (s.extras || []).find(y => y.id === go.dataset.go);
        if (x) { startTimer(r, cookIdx, x, x.id); drawZones(s); }
        return;
      }
      const stop = e.target.closest("[data-stop]");
      if (stop) cancelTimer(stop.dataset.stop);
    });
    refreshZone = () => drawZones(steps[cookIdx]);
  };

  const drawZones = s => { drawTimerZone(s); drawAddonZones(s); };

  const drawTimerZone = s => {
    const zone = document.getElementById("timer-zone");
    if (!zone) return;
    const t = findTimer(r.id, cookIdx);
    if (t) {
      const left = Math.max(0, Math.round((t.end - Date.now()) / 1000));
      const done = left === 0;
      zone.innerHTML = `
        <span class="clock ${done ? "flash" : ""}" data-clock="${t.id}">${fmtClock(left)}</span>
        <button id="timer-stop" data-stop="${t.id}">${done ? "OK" : "Annuler"}</button>`;
    } else if (s.timer) {
      zone.innerHTML = `<button id="timer-start">${ICON.timer} Minuteur ${fmtTime(s.timer)}</button>`;
      document.getElementById("timer-start").addEventListener("click", () => {
        startTimer(r, cookIdx, { timer: s.timer, label: s.t });
        drawTimerZone(s);
      });
    } else {
      zone.innerHTML = "";
    }
  };

  /* Chaque supplément minuté mène son propre compte à rebours, en parallèle de
     celui de l'étape : on torréfie des graines pendant que la soupe mijote. */
  const drawAddonZones = s => {
    for (const zone of document.querySelectorAll(".addon-timer")) {
      const x = (s.extras || []).find(y => y.id === zone.dataset.slot);
      if (!x) continue;
      const t = findTimer(r.id, cookIdx, x.id);
      if (t) {
        const left = Math.max(0, Math.round((t.end - Date.now()) / 1000));
        const done = left === 0;
        zone.innerHTML = `
          <span class="clock ${done ? "flash" : ""}" data-clock="${t.id}">${fmtClock(left)}</span>
          <button data-stop="${t.id}">${done ? "OK" : "Annuler"}</button>`;
      } else {
        zone.innerHTML = `<button data-go="${x.id}">${ICON.timer} Minuteur ${fmtTime(x.timer)}</button>`;
      }
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
  /* Un seul manque à la fois, le premier dans l'ordre du repas. Énumérer tout
     ce qui manque ferait une liste de tâches plus lourde que le menu qu'elle
     commente — et transformerait une suggestion en devoir à remplir. */
  const manque = momentsManquants().slice(0, 1);
  app.innerHTML = `
    <div id="menu-root">
    <header class="page-head courses-head fade-in">
      <div class="head-branch">${ILLO.D.olive}</div>
      <h1>Au menu</h1>
      <p>${list.length} recette${list.length > 1 ? "s" : ""} · ${todo ? `${todo} article${todo > 1 ? "s" : ""} à prendre` : "courses terminées"}</p>
      ${list.length > 1 ? `<p class="menu-order">Dans l'ordre où s'y mettre : la plus longue en premier.</p>` : ""}
    </header>
    <div class="menu-list">
      ${list.map(r => {
        const c = cookedOf(r);
        const v = VERDICTS.find(x => x.id === verdictOf(r));
        return `
        <article class="menu-card fade-in" data-open="${r.id}">
          <a class="mc-visual" style="background:${r.color}22" href="#/recette/${r.id}" aria-label="${r.title}">${visualOf(r)}</a>
          <div class="mc-body">
            <a class="mc-title" href="#/recette/${r.id}"><h3>${r.title}</h3></a>
            <div class="meta">${ICON.clock} ${totalTimeText(r)}
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
    ${manque.length ? `
    <p class="menu-hint">
      <span class="mh-txt">Il manque peut-être</span>
      ${manque.map(x => `<button class="mh-chip" data-moment="${catDuMoment(x)}">${x.label}</button>`).join("")}
      <button class="mh-x" data-hint-off aria-label="Ne plus proposer">✕</button>
    </p>` : ""}
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
    const mom = e.target.closest("[data-moment]");
    if (mom) { state.filter = mom.dataset.moment; save(); location.hash = "#/"; return; }
    if (e.target.closest("[data-hint-off]")) { state.hintMenuOff = true; save(); renderMenu(); return; }
    const step = e.target.closest("[data-minus], [data-plus]");
    if (step) {
      const id = step.dataset.minus || step.dataset.plus;
      const r = byId(id);
      const p = portionsOf(r) + (step.dataset.plus ? 1 : -1);
      if (p < 1 || p > 24) return;
      state.portions[id] = p;
      save(); updateBadge(); renderMenu();
      return;
    }
    /* Toute la carte ouvre la recette : les mains dans la farine, on ne vise pas
       la vignette au millimètre. Les commandes qu'elle contient gardent la main. */
    const carte = e.target.closest("[data-open]");
    if (carte && !e.target.closest("a, button")) location.hash = `#/recette/${carte.dataset.open}`;
  });

  document.getElementById("share-menu").addEventListener("click", shareMenu);

  document.getElementById("clear-menu").addEventListener("click", () => {
    if (!confirm("Retirer toutes les recettes du menu ?\nLes articles ajoutés à la main resteront dans la liste de courses.")) return;
    state.menu = [];
    resetHints();
    save(); updateBadge(); renderMenu();
  });
}

/* ---------- Onglet « Savoirs » ---------- */

const fondMatches = (f, q) => {
  if (!q) return true;
  const foin = [f.t, f.accroche, f.pourquoi, f.famille, f.piege,
    ...(f.cas || []).flatMap(c => [c.q, c.r]), ...(f.reperes || [])].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every(w => foin.includes(w));
};

function renderFondamentaux() {
  const q = state.fondQuery || "";
  const trouves = FONDAMENTAUX.filter(f => fondMatches(f, q));
  const familles = FAMILLES.filter(fam => trouves.some(f => f.famille === fam));
  /* Une famille inconnue ne disparaît pas en silence : elle passe en fin de liste. */
  const autres = [...new Set(trouves.map(f => f.famille))].filter(fam => !FAMILLES.includes(fam));

  app.innerHTML = `
    <header class="masthead fade-in">
      <div class="mast-row">${ILLO.D.sprig}<p class="eyebrow">Ce qui sert</p>${ILLO.D.sprigR}</div>
      <h1>Savoirs</h1>
      <p class="byline"><span>les mécanismes du <span class="u">carnet</span></span></p>
    </header>
    <p class="f-intro">Les gestes qui reviennent d'une recette à l'autre, et ce qui se passe vraiment quand on les fait.</p>
    <div class="searchbar">
      ${ICON.search}
      <input id="f-search" type="search" placeholder="Chercher un mécanisme…" value="${q.replace(/"/g, "&quot;")}" autocomplete="off">
    </div>
    ${trouves.length ? [...familles, ...autres].map(fam => `
      <section class="f-fam">
        <h2>${fam}</h2>
        <div class="f-liste">
          ${trouves.filter(f => f.famille === fam).map(f => {
            const n = recettesDuFond(f.id).length;
            return `<a class="f-item" href="#/fondamental/${f.id}">
              <span class="f-item-emoji">${f.emoji}</span>
              <span class="f-item-txt">
                <b>${f.t}</b>
                <small>${f.accroche}</small>
                <span class="f-item-meta">${n ? `${n} recette${n > 1 ? "s" : ""}` : "Pas encore rattaché"}</span>
              </span>
              ${ICON.chev}
            </a>`;
          }).join("")}
        </div>
      </section>`).join("") : `<p class="empty">Aucun savoir ne correspond à « ${q} ».</p>`}
    <p class="f-compte">${FONDAMENTAUX.length} fondamental${FONDAMENTAUX.length > 1 ? "aux" : ""} dans le carnet.</p>
  `;

  const champ = document.getElementById("f-search");
  champ.addEventListener("input", () => {
    state.fondQuery = champ.value;
    // On ne redessine que la liste : refaire la vue entière perdrait le clavier.
    const pos = champ.selectionStart;
    renderFondamentaux();
    const neuf = document.getElementById("f-search");
    neuf.focus();
    neuf.setSelectionRange(pos, pos);
  });
}

function renderFondamental(f) {
  app.innerHTML = `
    <div class="topbar fade-in">
      <a class="btn-icon" href="#/fondamentaux" data-retour="#/fondamentaux">${ICON.back} Savoirs</a>
      <button class="btn-icon" id="f-share-page">${ICON.share} Partager</button>
    </div>
    <header class="f-head fade-in">
      <p class="f-fam-tag">${f.famille}</p>
      <h1><span class="f-emoji">${f.emoji}</span>${f.t}</h1>
    </header>
    <div class="f-page">${fondBodyHtml(f)}</div>
  `;
  document.getElementById("f-share-page").addEventListener("click", () => shareFond(f.id));
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

/* Un appel au savoir peut être n'importe où — fiche, mode cuisine, note de
   supplément. Un seul écouteur délégué plutôt qu'un par rendu.
   Deux gestes distincts : toucher l'astuce déplie la ligne, toucher la ligne
   ouvre la fiche. Le premier ne fait jamais le second. */
document.body.addEventListener("click", e => {
  const fleche = e.target.closest("[data-retour]");
  if (fleche) { e.preventDefault(); return retourVers(fleche.dataset.retour); }
  const lien = e.target.closest("[data-fond]");
  if (lien) { e.preventDefault(); return openFondSheet(lien.dataset.fond); }
  // Un bouton dans l'encadré (le minuteur d'un supplément) garde son geste.
  if (e.target.closest("button")) return;
  const porteur = e.target.closest(".a-savoirs");
  if (porteur) porteur.classList.toggle("ouvert");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

/* ---------- Mode sombre ---------- */

(function initThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  const meta = document.querySelector('meta[name="theme-color"]');
  function apply(dark) {
    document.documentElement.toggleAttribute("data-theme", dark);
    if (dark) document.documentElement.setAttribute("data-theme", "dark");
    btn.setAttribute("aria-pressed", String(dark));
    btn.setAttribute("aria-label", dark ? "Activer le mode clair" : "Activer le mode sombre");
    if (meta) meta.setAttribute("content", dark ? "#15180F" : "#42603A");
  }
  apply(document.documentElement.getAttribute("data-theme") === "dark");
  btn.addEventListener("click", () => {
    const dark = document.documentElement.getAttribute("data-theme") !== "dark";
    apply(dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  });
})();
