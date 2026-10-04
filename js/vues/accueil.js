/* L'accueil : grille des recettes, recherche, filtres par catégorie et par critère, « J'ai… », et leurs animations. */

import { save, state } from "../core/etat.js";
import { fmtTime } from "../core/format.js";
import { esc } from "../core/html.js";
import { ICON } from "../core/icones.js";
import { MOMENT_TABLE } from "../core/menu.js";
import {
  FAV_FILTER,
  VERDICTS,
  abbrevDiscovered,
  byCategoryOrder,
  cookedOf,
  isFav,
  tempsDe,
  verdictOf
} from "../core/recettes.js";
import { FILTRES, catalogueJai, estDeSaison, foinDe, motsDe, scoreJai, trouve } from "../core/recherche.js";
import { annoncer } from "../ui/annonces.js";
import { fermerFeuille, ouvrirFeuille } from "../ui/feuilles.js";
import { app } from "../ui/routeur.js";
import { REDUCE_MOTION } from "../ui/theme.js";
import { toast } from "../ui/toast.js";
import { visuel } from "../ui/visuel.js";
import { boutonReglages } from "./reglages-entree.js";

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
function timeChipsHtml(r) {
  const t = tempsDe(r);
  const part = (icone, min) => `<span class="t-part">${icone} ${fmtTime(min)}</span>`;
  return [
    t.prep ? part(ICON.knife, t.prep) : "",
    t.repos ? part(ICON.zzz, t.repos) : "",
    t.cuisson != null ? part(ICON.flame, t.cuisson) : `<span class="t-part">${ICON.flame} sans cuisson</span>`
  ].join("");
}

/* Ce que l'accueil retient pendant la visite — et seulement elle : rouvrir
   l'appli montre toutes les recettes. Ni la recherche, ni les critères, ni les
   ingrédients du « J'ai… » ne passent par `state`, donc jamais par localStorage. */
let requete = "";
const criteres = new Set();
const jai = new Set();
let foins = new Map();

/* Le foin de chaque recette, normalisé une fois pour toute la visite. Les
   fondamentaux, eux, arrivent après le premier affichage (core/fonds.js) : leur
   titre n'entre dans le foin qu'à ce moment-là, d'où rafraichirFoins(). */
const calculerFoins = () => { foins = new Map(RECIPES.map(r => [r.id, foinDe(r)])); };

/* Appelée par le routeur quand les fondamentaux sont arrivés : chercher
   « émulsion » ramène alors les recettes où l'on en fait une, même si la
   recherche était tapée avant. */
export function rafraichirFoins() {
  calculerFoins();
  if (document.getElementById("grid")) applyFilter(false);
}

export function renderHome() {
  const anyFav = RECIPES.some(isFav);
  if (state.filter === FAV_FILTER && !anyFav) { state.filter = "Toutes"; save(); }
  const cats = ["Toutes", ...(anyFav ? [FAV_FILTER] : []), ...[...new Set(RECIPES.map(r => r.category))].sort(byCategoryOrder)];
  const chipLabel = c => (c === FAV_FILTER ? "♥ Coups de cœur" : c);
  calculerFoins();
  app.innerHTML = `
    <header class="masthead fade-in">
      ${boutonReglages()}
      <div class="mast-row">${ILLO.D.sprig}<p class="eyebrow">Le carnet de</p>${ILLO.D.sprigR}</div>
      <h1>Cuisine</h1>
      <p class="byline"><span>d'<span class="u">Evadri</span></span> ${ILLO.D.heart}</p>
    </header>
    <div class="search-row">
      <div class="searchbar">
        ${ICON.search}
        <input id="search" type="search" placeholder="Plat, ingrédient" value="${esc(requete)}" autocomplete="off" aria-label="Chercher une recette">
      </div>
      <button type="button" class="jai-btn" id="jai-ouvrir" aria-haspopup="dialog"></button>
    </div>
    <div class="chips" id="chips" role="group" aria-label="Catégories">
      ${cats.map(c => `<button class="chip ${state.filter === c ? "on" : ""}" data-cat="${esc(c)}" aria-pressed="${state.filter === c}">${chipLabel(c)}</button>`).join("")}
    </div>
    <div class="chips chips-criteres" id="criteres" role="group" aria-label="Filtres">
      ${FILTRES.map(f => `<button class="chip ${criteres.has(f.id) ? "on" : ""}" data-critere="${f.id}" aria-pressed="${criteres.has(f.id)}">${f.label}</button>`).join("")}
    </div>
    <p class="jai-etat" id="jai-etat" hidden>
      <span id="jai-resume"></span>
      <button type="button" class="jai-efface" id="jai-efface">Effacer</button>
    </p>
    <div class="grid fade-in" id="grid">
      ${RECIPES.map(cardHtml).join("")}
      <p class="empty grid-empty" style="grid-column:1/-1" hidden>Aucune recette ne correspond…<br>Essaie d'enlever un filtre — la prochaine fournée arrive bientôt !</p>
    </div>
  `;
  majJai();
  document.getElementById("search").addEventListener("input", e => {
    requete = e.target.value; applyFilter(true);
  });
  document.getElementById("chips").addEventListener("click", e => {
    const b = e.target.closest(".chip");
    if (!b) return;
    state.filter = b.dataset.cat; save();
    document.querySelectorAll("#chips .chip").forEach(c => {
      c.classList.toggle("on", c === b);
      c.setAttribute("aria-pressed", String(c === b));
    });
    rebondir(b);
    applyFilter(true);
  });
  /* Les critères se cumulent : chacun resserre la grille un peu plus. */
  document.getElementById("criteres").addEventListener("click", e => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const id = b.dataset.critere;
    if (!criteres.delete(id)) criteres.add(id);
    b.classList.toggle("on", criteres.has(id));
    b.setAttribute("aria-pressed", String(criteres.has(id)));
    if (criteres.has(id)) rebondir(b);
    applyFilter(true);
  });
  document.getElementById("jai-ouvrir").addEventListener("click", ouvrirJai);
  document.getElementById("jai-efface").addEventListener("click", () => { jai.clear(); majJai(); applyFilter(true); });
  document.getElementById("grid").addEventListener("click", partagerDepuisCarte);
  applyFilter(false);
}

/* Le module de partage (avec le calcul qu'il emporte) ne vient pas avec l'accueil :
   main.js le tire dès le premier affichage passé, et le premier appui qui le trouve
   déjà là partage dans le même tour (navigator.share exige le geste de l'utilisateur,
   que les navigateurs ne gardent pas toujours à travers un import). */
let partage = null;
export const preparerPartage = () => import("../ui/partage.js").then(m => (partage = m));

/* Posé sur une vignette, le bouton partager ne doit pas ouvrir la recette. */
function partagerDepuisCarte(e) {
  const b = e.target.closest("[data-share]");
  if (!b) return;
  e.preventDefault();
  e.stopPropagation();
  const partager = m => m.shareRecipe(b.dataset.share, b.dataset.shareK);
  if (partage) partager(partage);
  else preparerPartage().then(partager, () => toast("Le partage ne s'est pas chargé"));
}

function rebondir(b) {
  if (REDUCE_MOTION.matches) return;
  b.classList.remove("pop");
  void b.offsetWidth;
  b.classList.add("pop");
}

/* Le bouton « J'ai… » et la ligne qui rappelle la sélection : ils disent
   pourquoi la grille est réduite, et la défont d'un geste sans rouvrir la feuille. */
function majJai() {
  const bouton = document.getElementById("jai-ouvrir");
  if (!bouton) return;
  const n = jai.size, s = n > 1 ? "s" : "";
  bouton.classList.toggle("on", n > 0);
  bouton.innerHTML = `J'ai…${n ? ` <span class="jai-n">${n}</span>` : ""}`;
  bouton.setAttribute("aria-label", n ? `J'ai… (${n} ingrédient${s} choisi${s})` : "J'ai… : choisir les ingrédients que tu as");
  document.getElementById("jai-etat").hidden = n === 0;
  document.getElementById("jai-resume").textContent = `Recettes avec ${n} ingrédient${s} de ta sélection`;
}

/* ---------- « J'ai… » : la feuille des ingrédients ---------- */

/* Le choix se fait sur place : cocher un ingrédient ne refait pas la feuille
   (elle rejouerait son animation et perdrait son défilement), seuls les boutons
   changent. La grille, derrière, se recompose à la fermeture. */
function ouvrirJai() {
  const catalogue = catalogueJai(RECIPES);
  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop";
  backdrop.innerHTML = `
    <div class="sheet jai-sheet" role="dialog" aria-modal="true" aria-label="J'ai… : tes ingrédients">
      <div class="sheet-grip"></div>
      <h3>J'ai…</h3>
      <p class="sheet-sub">Choisis ce que tu as sous la main : on te montre les recettes qui s'en servent. Sel, huile, farine… on les suppose déjà chez toi.</p>
      <div class="searchbar jai-recherche">
        ${ICON.search}
        <input id="jai-recherche" type="search" placeholder="Un ingrédient…" autocomplete="off" aria-label="Chercher un ingrédient">
      </div>
      <div class="jai-liste" id="jai-liste">
        ${catalogue.map(i => `<button type="button" class="chip jai-chip ${jai.has(i.cle) ? "on" : ""}" data-cle="${esc(i.cle)}" data-norm="${esc(i.norm)}" aria-pressed="${jai.has(i.cle)}">${esc(i.label)}</button>`).join("")}
        <p class="empty jai-vide" role="status" hidden>Aucun ingrédient ne ressemble à ça.</p>
      </div>
      <div class="jai-actions">
        <button type="button" class="btn secondary" id="jai-vider">Tout effacer</button>
        <button type="button" class="btn primary" id="jai-ok"></button>
      </div>
    </div>`;
  const liste = backdrop.querySelector("#jai-liste");
  const vider = backdrop.querySelector("#jai-vider");
  const ok = backdrop.querySelector("#jai-ok");

  const rafraichir = () => {
    const n = visibles().length;
    vider.disabled = jai.size === 0;
    ok.textContent = !jai.size ? "Fermer" : n === 0 ? "Aucune recette" : n === 1 ? "Voir la recette" : `Voir les ${n} recettes`;
  };
  backdrop.addEventListener("click", e => {
    if (e.target === backdrop || e.target.closest("#jai-ok")) return fermerFeuille();
    if (e.target.closest("#jai-vider")) {
      jai.clear();
      liste.querySelectorAll(".jai-chip.on").forEach(b => { b.classList.remove("on"); b.setAttribute("aria-pressed", "false"); });
      return rafraichir();
    }
    const b = e.target.closest(".jai-chip");
    if (!b) return;
    if (!jai.delete(b.dataset.cle)) jai.add(b.dataset.cle);
    b.classList.toggle("on", jai.has(b.dataset.cle));
    b.setAttribute("aria-pressed", String(jai.has(b.dataset.cle)));
    rafraichir();
  });
  backdrop.querySelector("#jai-recherche").addEventListener("input", e => {
    const mots = motsDe(e.target.value);
    let n = 0;
    for (const b of liste.querySelectorAll(".jai-chip")) {
      b.hidden = !trouve(b.dataset.norm, mots);
      if (!b.hidden) n++;
    }
    liste.querySelector(".jai-vide").hidden = n > 0;
  });
  rafraichir();
  ouvrirFeuille(backdrop, () => {
    majJai();
    applyFilter(true);
  });
}

/* Les recettes à montrer, dans l'ordre où elles s'affichent. Avec « J'ai… », la
   grille ne garde que celles qui servent un ingrédient choisi : d'abord les plus
   avancées, puis, à égalité, celles à qui il manque le moins. */
function visibles() {
  const mots = motsDe(requete), mois = new Date().getMonth() + 1;
  const actifs = FILTRES.filter(f => criteres.has(f.id));
  const liste = RECIPES.filter(r => inFilter(r) && trouve(foins.get(r.id) ?? "", mots) && actifs.every(f => f.test(r, mois)));
  if (jai.size) {
    const score = new Map(liste.map(r => [r, scoreJai(r, jai)]));
    return liste.filter(r => score.get(r).trouves > 0).sort((a, b) => {
      const sa = score.get(a), sb = score.get(b);
      return sb.trouves - sa.trouves || (sa.total - sa.trouves) - (sb.total - sb.trouves);
    });
  }
  // Dans les coups de cœur, les plus cuisinées passent devant.
  if (state.filter === FAV_FILTER) {
    liste.sort((a, b) => cookedOf(b).count - cookedOf(a).count || (cookedOf(b).last || 0) - (cookedOf(a).last || 0));
  }
  return liste;
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
function cardHtml(r) {
  const v = VERDICTS.find(x => x.id === verdictOf(r));
  const c = cookedOf(r);
  /* Un <article>, pas un lien : le bouton partager ne peut pas vivre dans un
     <a>. Le lien porte le titre, et son ::after s'étire sur toute la carte
     (cf. accueil.css) ; le bouton, frère du lien, passe au-dessus. */
  return `
    <article class="card" data-id="${r.id}">
      <div class="visual" style="background:${r.color}22">${visuel(r, { genre: "vignette" })}
        <span class="card-cat">${r.category}</span>
        <button class="card-share" data-share="${r.id}" aria-label="Partager ${r.title}">${ICON.share}</button>
        ${estDeSaison(r, new Date().getMonth() + 1) ? `<span class="card-saison">De saison</span>` : ""}
        <span class="card-jai" hidden></span>
      </div>
      <div class="body">
        <h3 elementtiming="carte-titre"><a class="card-lien" href="#/recette/${r.id}">${r.title}</a></h3>
        ${v || c.count ? `<div class="tagrow">
          ${v ? `<span class="verdict-tag v-${v.id}">${v.tag || v.label}</span>` : ""}
          ${c.count ? `<span class="cook-count">cuisinée ${c.count}×</span>` : ""}
        </div>` : ""}
        <div class="card-foot">
          ${r.discovered ? `<div class="card-disc">${ICON.pin}<span>${abbrevDiscovered(r.discovered)}</span></div>` : ""}
          <div class="meta">${timeChipsHtml(r)}</div>
        </div>
      </div>
    </article>`;
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
  const list = visibles();
  /* La pastille de catégorie n'apprend rien quand le filtre l'annonce déjà en
     haut de l'écran : elle ne sert que dans « Toutes » et dans une recherche.
     (« Coups de cœur » n'est pas une catégorie : la pastille y garde son sens.) */
  grid.classList.toggle("no-cat", !(state.filter === "Toutes" || state.filter === FAV_FILTER || state.filter === "table"));
  grid.querySelector(".grid-empty").hidden = list.length > 0;
  /* Filtrer masque des cartes sans rien déplacer sous le focus : sans cette phrase,
     on ne saurait pas combien de recettes restent. Le premier dessin ne dit rien. */
  if (animate) annoncer(list.length ? `${list.length} recette${list.length > 1 ? "s" : ""}` : "Aucune recette ne correspond");

  /* « 3 / 5 » sur la vignette : seulement tant qu'un ingrédient est choisi. */
  for (const el of grid.querySelectorAll(".card")) {
    const pastille = el.querySelector(".card-jai");
    const r = jai.size ? list.find(x => x.id === el.dataset.id) : null;
    pastille.hidden = !r;
    if (r) {
      const { trouves, total } = scoreJai(r, jai);
      pastille.textContent = `${trouves} / ${total}`;
    }
  }

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
