/* La fiche d'une recette : ingrédients à l'échelle, composition de la version, allergènes, notes, étapes, ajout au menu. */

import {
  PORTIONS_MAX,
  PORTIONS_MIN,
  allergenesDe,
  libelleMoule,
  portionsPourMoule,
  remarqueCuissonMoule,
  tailleDeReference,
  tailleEquivalente
} from "../core/adaptation.js";
import { libelleQuantite } from "../core/cuisine.js";
import { save, state } from "../core/etat.js";
import { libellePortions, scaleText, timeText, typo } from "../core/format.js";
import { esc, html, raw } from "../core/html.js";
import { ICON } from "../core/icones.js";
import {
  ajouterAuMenu,
  compo,
  entreeCourante,
  entreeDe,
  entreesDe,
  portionsOf,
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
  tempsDe,
  verdictOf
} from "../core/recettes.js";
import { cleCuisine, cookHref, cookingStep, forgetCooking } from "../core/seance.js";
import { fermerFeuille, ouvrirFeuille } from "../ui/feuilles.js";
import { vibrer } from "../ui/geste.js";
import { animer, flip, mouvementReduit, rebondir, rouler, secouer, sortir } from "../ui/mouvement.js";
import { changerNombre, nombreHtml } from "../ui/nombre.js";
import { shareRecipe } from "../ui/partage.js";
import { allerEnRemplacant, app, hashPrecedent } from "../ui/routeur.js";
import { toast, updateBadge } from "../ui/toast.js";
import { visuel } from "../ui/visuel.js";
import { burstHeart, discoveredHtml } from "./accueil.js";
import { ouvrirIngredient } from "./ingredient.js";
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
const pickChipsHtml = r => `
  ${choiceList(r).map(c => `
    <p class="pick-label">${c.label}</p>
    <div class="pick-row" role="group" aria-label="${esc(c.label)}">${c.options.map(o => `
      <button class="chip pick ${optionOf(r, c).id === o.id ? "on" : ""}" data-choice="${c.id}" data-option="${o.id}" aria-pressed="${optionOf(r, c).id === o.id}">${o.emoji ? o.emoji + " " : ""}${o.label}</button>`).join("")}
    </div>`).join("")}
  ${addonList(r).length ? `
    <p class="pick-label">Les petits plus</p>
    <div class="pick-row" role="group" aria-label="Les petits plus">${addonList(r).map(a => {
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
    if (onPickClick(e, r)) { majPuces(picks, r); rafraichir(); vibrer("tic"); }
  });
  rafraichir();
  ouvrirFeuille(backdrop, () => done(resultat));
}

/* Où mène la flèche de retour : là d'où l'on vient, nommée comme telle. Une
   fiche ouverte directement, ou depuis l'accueil, retombe sur « Recettes ». */
function retourDe() {
  const p = hashPrecedent() || "";
  if (p === "#/menu") return { href: p, texte: "Au menu" };
  if (p === "#/courses") return { href: p, texte: "Courses" };
  if (p === "#/fondamentaux" || p.startsWith("#/fondamental/")) return { href: p, texte: "Savoirs" };
  return { href: "#/", texte: "Recettes" };
}

const ICON_IMPRIMER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>';

/* Les notes perso s'enregistrent d'elles-mêmes, mais un rechargement, un
   changement d'onglet ou l'impression peuvent arriver avant la fin du délai :
   la fiche affichée dépose ici de quoi tout enregistrer tout de suite. */
let enregistrerMaintenant = null;
let ecouteursPoses = false;
function poserEcouteurs() {
  if (ecouteursPoses) return;
  ecouteursPoses = true;
  window.addEventListener("pagehide", () => enregistrerMaintenant?.());
  document.addEventListener("visibilitychange", () => { if (document.hidden) enregistrerMaintenant?.(); });
  window.addEventListener("beforeprint", () => enregistrerMaintenant?.({ afficher: true }));
}

const DELAI_NOTE = 600;

/* Les trois temps de la version composée : la recette, ce que ses options
   ajoutent (pâte maison), et en fourchette ce que les suppléments peuvent y
   ajouter. Redessinés à chaque choix, pour que la fiche, la carte du menu et la
   frise du rétroplanning disent la même durée. */
const tempsHtml = r => {
  const t = tempsDe(r);
  return `
        ${t.prep || addonTime(r, "prep") ? `<span class="timechip" data-t="prep">${ICON.knife} Préparation : <span class="tc-v">${timeText(t.prep, addonTime(r, "prep"))}</span></span>` : ""}
        ${t.repos || addonTime(r, "repos") ? `<span class="timechip" data-t="repos">${ICON.zzz} ${r.reposLabel || "Repos"} : <span class="tc-v">${timeText(t.repos, addonTime(r, "repos"))}</span></span>` : ""}
        ${t.cuisson != null || addonTime(r, "cuisson") ? `<span class="timechip" data-t="cuisson">${ICON.flame} Cuisson : <span class="tc-v">${timeText(t.cuisson || 0, addonTime(r, "cuisson"))}</span></span>` : `<span class="timechip" data-t="sans">${ICON.flame} Sans cuisson</span>`}
      `;
};

/* ---------- Le mouvement de la fiche ---------- */

/* Les observateurs de la fiche affichée (barre compacte, entrées au défilement) : une
   fiche redessinée ou remplacée lâche ceux de la précédente. */
let observateurs = [];
function observer(options, quand, elements) {
  if (typeof IntersectionObserver === "undefined") return null;
  const o = new IntersectionObserver(quand, options);
  elements.forEach(e => o.observe(e));
  observateurs.push(o);
  return o;
}

/* Une coche qui se trace d'un trait (la classe .trace de base.css, sur le conteneur). */
const COCHE_TRACEE = ICON.check.replace("<path ", '<path pathLength="1" ');

/* Un retrait du menu depuis la fiche recharge la fiche : le nouveau bouton le sait et
   se pose en douceur (l'inverse, plus sobre, de l'ajout). */
let retraitRecent = null;

/* La vignette s'envole de la photo de la fiche (ou, si celle-ci a défilé hors de
   l'écran, du bouton d'ajout) vers l'onglet « Au menu ». effets.js est chargé à la
   demande, ici seulement : il n'est jamais sur le chemin de l'accueil. */
async function envolerVersLeMenu(r, bouton) {
  const cible = document.querySelector('.tabbar [data-tab="menu"] svg');
  const photo = document.querySelector(".hero .visual");
  if (!cible || mouvementReduit()) return;
  const source = photo && photo.getBoundingClientRect().bottom > 80 ? photo : bouton;
  const image = photo?.querySelector("img")?.currentSrc || "";
  let amorce = null;
  if (!image) {
    // Sans photo : une pastille de l'emoji, posée là le temps d'en prendre la copie.
    amorce = document.createElement("span");
    const b = source.getBoundingClientRect();
    amorce.textContent = r.emoji || "🍽";
    amorce.style.cssText = `position:fixed;left:${b.left + b.width / 2 - 20}px;top:${b.top + b.height / 2 - 20}px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:26px;border-radius:50%;background:var(--card);border:2px solid var(--card);box-shadow:var(--ombre-2);pointer-events:none;z-index:300`;
    document.body.append(amorce);
  }
  try {
    const { envoler } = await import("../ui/effets.js");
    const vol = envoler(amorce || source, cible, image ? { image } : {});
    amorce?.remove();   // envoler en a déjà pris la copie
    await vol;
  } catch (e) {
    amorce?.remove();
    console.error("Envol indisponible :", e);
  }
}

/* Les entrées au défilement : ingrédients et étapes qui ne sont pas à l'écran au premier
   dessin arrivent, l'une après l'autre, la première fois qu'ils y entrent. Ce qui est
   déjà visible n'est jamais touché (le premier écran ne part pas d'une opacité nulle).
   Ils sont cachés par [data-attend] ; sans IntersectionObserver rien n'est caché. */
function arrivesAuDefilement(elements) {
  if (mouvementReduit() || typeof IntersectionObserver === "undefined") return;
  const bas = window.innerHeight;
  const attendus = elements.filter(e => e.getBoundingClientRect().top > bas - 24);
  attendus.forEach(e => e.setAttribute("data-attend", ""));
  observer({ rootMargin: "0px 0px -6% 0px" }, (entrees, o) => {
    entrees.filter(x => x.isIntersecting).forEach((x, rang) => {
      const e = x.target;
      o.unobserve(e);
      e.style.setProperty("--i", Math.min(rang, 7));
      e.removeAttribute("data-attend");
      e.classList.add("arrive");
      e.addEventListener("animationend", () => e.classList.remove("arrive"), { once: true });
    });
  }, attendus);
}

/* Les puces de choix et de suppléments se mettent à jour sur place (jamais redessinées) :
   la couleur glisse, la puce choisie fait un petit saut, le focus clavier reste où il est. */
function majPuces(zone, r) {
  const choix = choiceList(r);
  const retenus = selectedAddons(r);
  const regler = (b, on) => {
    const avant = b.classList.contains("on");
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
    if (on && !avant) animer(b, [{ scale: 0.9 }, { scale: 1 }], { easing: "ressort-rebond", cle: "puce", reprise: false });
  };
  zone.querySelectorAll("[data-choice]").forEach(b => {
    const c = choix.find(x => x.id === b.dataset.choice);
    regler(b, !!c && optionOf(r, c).id === b.dataset.option);
  });
  zone.querySelectorAll("[data-addon]").forEach(b => regler(b, retenus.some(x => x.id === b.dataset.addon)));
}

/* Une liste qui change d'éléments (un supplément coché ajoute un ingrédient, une étape) :
   ceux qui restent glissent à leur nouvelle place (flip), les nouveaux arrivent, ceux qui
   partent se replient (sortir). `elements` : [{ cle, ... }] ; `creer(item)` rend un <li> ;
   `patcher(li, item)` met à jour celui qui reste. Au premier dessin, ou en mouvement
   réduit, tout est simplement écrit. */
function majListe(ul, elements, { creer, patcher, anime }) {
  const existants = new Map([...ul.children].filter(li => !li.inert && li.dataset.cle).map(li => [li.dataset.cle, li]));
  if (!anime || !existants.size || mouvementReduit()) {
    ul.replaceChildren(...elements.map(creer));
    return Promise.resolve(true);
  }
  const voulues = new Set(elements.map(x => x.cle));
  return flip(ul, () => {
    existants.forEach((li, cle) => { if (!voulues.has(cle)) sortir(li); });
    let pos = ul.firstElementChild;
    for (const item of elements) {
      while (pos && pos.inert) pos = pos.nextElementSibling;
      const li = existants.get(item.cle) ?? creer(item);
      if (li === pos) pos = pos.nextElementSibling;
      else ul.insertBefore(li, pos);
      if (existants.has(item.cle)) patcher(li, item);
    }
  });
}

/* Des clés stables : le même texte revenu deux fois reçoit un rang. */
function cles(textes) {
  const vus = new Map();
  return textes.map(t => { const n = vus.get(t) || 0; vus.set(t, n + 1); return `${t}#${n}`; });
}

const gabaritLi = markup => {
  const t = document.createElement("template");
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
};

/* La quantité d'une ligne suit les portions : les chiffres roulent quand le reste du
   texte (l'unité) ne change pas, sinon un fondu court. La largeur ne saute pas
   (chiffres tabulaires, largeur minimale de la colonne). */
const unite = t => t.replace(/^[\d\s,./½¼¾⅓⅔]*/, "");
function changerQuantite(el, brut) {
  const texte = typo(brut);
  if (el.textContent === texte) return;
  if (unite(el.textContent) === unite(texte) && /\d/.test(texte) && /\d/.test(el.textContent)) { rouler(el, texte); return; }
  el.textContent = texte;
  animer(el, [{ opacity: 0.2 }], { duree: "courte", cle: "qte", reprise: false });
}

/* Ce qui fait l'identité d'un bloc de texte, sans les identifiants que savoirsHtml
   numérote à chaque appel. */
const signature = markup => markup.replace(/s-liste-\d+/g, "s-liste");

export function renderRecipe(r) {
  // Étape 1 : rien à reprendre, « Mode cuisine » y mène déjà.
  const resume = cookingStep(r, entreeCourante() || undefined) || null;
  const retour = retourDe();
  poserEcouteurs();
  observateurs.forEach(o => o.disconnect());
  observateurs = [];
  app.innerHTML = `
    <div class="topbar fade-in">
      <a class="btn-icon" href="${esc(retour.href)}" data-retour="${esc(retour.href)}">${ICON.back} ${retour.texte}</a>
      <div class="topbar-actions">
        <button class="btn-icon" id="print-recipe" aria-label="Imprimer">${ICON_IMPRIMER} <span class="btn-lib">Imprimer</span></button>
        <button class="btn-icon" id="share-recipe">${ICON.share} Partager</button>
      </div>
    </div>
    <div class="fiche-barre" id="fiche-barre" inert>
      <div class="fb-in">
        <a class="btn-icon fb-retour" href="${esc(retour.href)}" data-retour="${esc(retour.href)}" aria-label="Retour : ${esc(retour.texte)}">${ICON.back}</a>
        <span class="fb-titre" aria-hidden="true">${r.title}</span>
        <button class="btn-icon fb-partage" id="fb-share" aria-label="Partager">${ICON.share}</button>
      </div>
    </div>
    <div class="hero"><div class="visual" data-vt-photo="${r.id}" style="background:${r.color}33">
      ${r.image ? "" : `<span class="corner tl">${ILLO.D.corner}</span><span class="corner tr">${ILLO.D.corner}</span><span class="corner bl">${ILLO.D.corner}</span><span class="corner br">${ILLO.D.corner}</span>`}
      ${visuel(r, { genre: "hero", eager: true })}
    </div></div>
    <div class="r-head">
      <h1>${r.title}</h1>
      <p class="subtitle">${r.subtitle}</p>
      ${discoveredHtml(r)}
      <div class="timerow" id="timerow">${tempsHtml(r)}</div>
      <p class="allergenes" id="allergenes" hidden></p>
    </div>

    <aside class="note-perso" id="note-perso-tete" hidden></aside>

    <section class="section">
      <h2><span class="h-title"><span class="h-deco">${ILLO.D.leaf}</span>Ingrédients</span>
        <span class="portions">
          <button id="p-minus" aria-label="Moins de portions">−</button>
          <span class="val" id="p-val" aria-live="polite" aria-atomic="true"></span>
          <button id="p-plus" aria-label="Plus de portions">+</button>
        </span>
      </h2>
      ${r.moule ? `<div class="moule" id="moule-zone"></div>` : ""}
      <ul class="ing-list" id="ing-list"></ul>
    </section>

    ${customizable(r) ? `
    <section class="section">
      <h2><span class="h-title"><span class="h-deco">${ILLO.D.leaf}</span>Compose ta version</span></h2>
      <div id="pick-zone"></div>
    </section>` : ""}

    <section class="section">
      <h2><span class="h-title"><span class="h-deco">${ILLO.D.toque}</span>Préparation</span></h2>
      <ol class="steps" id="steps-list"></ol>
    </section>

    ${r.note ? `<p class="recipe-note">« ${r.note} »<span class="n-heart">${ILLO.D.heart}</span><span class="n-flourish">${ILLO.D.flourish}</span></p>` : ""}

    <section class="section section-notes">
      <h2><span class="h-title">Mes notes</span><span class="note-etat" id="note-etat" role="status"></span></h2>
      <textarea class="note-saisie" id="note-saisie" rows="3" aria-label="Mes notes sur cette recette" placeholder="Ce que tu as changé, ce qu'il faut retenir…"></textarea>
    </section>

    <section class="section verdict">
      <h2>Un coup de cœur ?</h2>
      <div class="verdict-row" id="verdict-row"></div>
      <p class="cooked-line" id="cooked-line"></p>
    </section>

    <section class="section" id="journal-zone" hidden></section>

    <div class="actions">
      <button class="btn secondary" id="add-list"></button>
      <a class="btn primary ${resume ? "resume" : ""}" href="${cookHref(r, entreeCourante() || undefined)}">${ICON.chef}
        ${resume ? `<span>Reprendre<small>étape ${resume + 1} / ${r.steps.length}</small></span>` : `<span>Cuisiner<span class="fiche-sr"> en mode cuisine</span></span>`}
      </a>
    </div>
    ${resume ? `<button class="link-restart" id="restart-cook">Repartir du début</button>` : ""}
    <p class="menu-info" id="menu-info"></p>
  `;

  /* Les portions de CETTE version : celles de l'entrée du menu quand on en édite
     une, celles du brouillon sinon — portionsOf / compo tranchent. */
  const portionsCourantes = () => portionsOf(r);

  /* `anime` : le changement vient d'un geste (portions, choix) et non du premier
     dessin ; les quantités roulent et les lignes qui apparaissent ou partent le font
     en douceur. */
  const valPortions = document.getElementById("p-val");
  const drawIngredients = ({ anime = false } = {}) => {
    const p = portionsCourantes();
    const f = p / r.portions.base;
    const texte = libellePortions(p, r.portions.label);
    if (anime) changerNombre(valPortions, texte); else valPortions.innerHTML = nombreHtml(texte);
    const ings = effectiveIngredients(r);
    const ids = cles(ings.map(ing => `${ing.name}|${ing.addon ? 1 : 0}`));
    /* Le nom et la note ne changent qu'avec la version (ou la note, mise à l'échelle) ;
       la quantité est à part, parce que c'est elle qui roule. */
    const corps = ing => html`${ing.name}${ing.addon ? raw(`<span class="opt sup">supplément</span>`) : ""}${ing.optional ? raw(`<span class="opt">optionnel</span>`) : ""}${ing.note ? raw(html`<span class="note"> — ${scaleText(ing.note, f)}</span>`) : ""}`;
    const items = ings.map((ing, i) => ({ cle: ids[i], ing, i, qte: libelleQuantite(ing, f) || "—", corps: corps(ing) }));
    majListe(document.getElementById("ing-list"), items, {
      anime,
      creer: x => {
        const li = gabaritLi(html`<li data-cle="${x.cle}">
      <button type="button" class="ing-ligne" data-i="${x.i}" aria-haspopup="dialog">
        <span class="qty">${typo(x.qte)}</span>
        <span class="ing-nom">${raw(x.corps)}</span>
        <span class="ing-chev" aria-hidden="true">${raw(ICON.chev)}</span>
      </button>
    </li>`);
        li.dataset.corps = x.corps;
        return li;
      },
      patcher: (li, x) => {
        li.firstElementChild.dataset.i = x.i;
        changerQuantite(li.querySelector(".qty"), x.qte);
        if (li.dataset.corps !== x.corps) { li.querySelector(".ing-nom").innerHTML = x.corps; li.dataset.corps = x.corps; }
      }
    });
  };

  const drawSteps = ({ anime = false } = {}) => {
    const f = portionsCourantes() / r.portions.base;
    const etapes = effectiveSteps(r);
    const ids = cles(etapes.map(s => s.t));
    const corps = s => `
          <h3>${s.t}</h3>
          <p>${scaleText(s.txt, f)}</p>
          ${scaleText(extrasHtml(s), f)}
          ${scaleText(astuceHtml(s), f)}
        `;
    const items = etapes.map((s, i) => ({ cle: ids[i], i, corps: corps(s) }));
    majListe(document.getElementById("steps-list"), items, {
      anime,
      creer: x => {
        const li = gabaritLi(`<li data-cle="${esc(x.cle)}"><span class="num">${x.i + 1}</span><div>${x.corps}</div></li>`);
        li.dataset.sig = signature(x.corps);
        return li;
      },
      patcher: (li, x) => {
        const num = li.querySelector(".num");
        if (num.textContent !== String(x.i + 1)) num.textContent = x.i + 1;
        if (li.dataset.sig === signature(x.corps)) return;
        /* Les quantités citées dans le texte ont changé : le bloc est réécrit, mais le
           volet « Pourquoi ça marche » qu'on avait ouvert reste ouvert. */
        const ouverts = [...li.querySelectorAll(".a-savoirs")].map(e => e.classList.contains("ouvert"));
        li.lastElementChild.innerHTML = x.corps;
        li.querySelectorAll(".a-savoirs").forEach((e, n) => {
          if (!ouverts[n]) return;
          e.classList.add("ouvert");
          e.querySelectorAll(".s-cue").forEach(b => b.setAttribute("aria-expanded", "true"));
        });
        li.dataset.sig = signature(x.corps);
      }
    });
  };

  const drawPicks = () => {
    const zone = document.getElementById("pick-zone");
    if (!zone) return;
    if (zone.firstElementChild) majPuces(zone, r); else zone.innerHTML = pickChipsHtml(r);
  };

  /* Un supplément ou un autre choix change les ingrédients, donc les allergènes. */
  const drawAllergenes = () => {
    const ligne = document.getElementById("allergenes");
    const liste = allergenesDe(effectiveIngredients(r));
    ligne.hidden = !liste.length;
    ligne.innerHTML = liste.length
      ? html`Contient : ${raw(liste.map(a => html`<span class="alg">${a.emoji} ${a.label.toLowerCase()}</span>`).join(" · "))} <small>vérifie les étiquettes</small>`
      : "";
  };

  /* ---------- Le moule ---------- */

  /* Ce que la dernière manœuvre a dit (« moule de 28 cm → recette pour 8 »), tant
     qu'on ne touche pas aux portions autrement. */
  let diteDuMoule = "";

  /* Le moule se dessine une fois ; ensuite on ne touche qu'à sa taille (qui roule) et à la
     phrase, pour que les boutons − / + gardent leur focus et leur retour d'appui. */
  const drawMoule = ({ anime = false } = {}) => {
    const zone = document.getElementById("moule-zone");
    if (!zone) return;
    const base = r.portions.base, p = portionsCourantes();
    /* La taille retenue ne vaut que si elle donne bien ces portions : réglées
       à la main depuis, elles ont repris la main et le moule affiché suit. */
    const memo = state.moules?.[r.id];
    const taille = memo && portionsPourMoule(r.moule, base, memo) === p ? memo : tailleEquivalente(r.moule, base, p);
    const libelle = libelleMoule(r.moule, taille);
    const dit = diteDuMoule || `La recette est écrite pour un moule de ${libelleMoule(r.moule, tailleDeReference(r.moule))}.`;
    if (!zone.firstElementChild) {
      zone.innerHTML = html`
      <div class="moule-ligne">
        <span class="moule-lib">Ton moule : <b>${libelle}</b></span>
        <span class="portions">
          <button id="m-minus" aria-label="Moule plus petit">−</button>
          <button id="m-plus" aria-label="Moule plus grand">+</button>
        </span>
      </div>
      <p class="moule-dit" aria-live="polite">${dit}</p>`;
    } else {
      const b = zone.querySelector(".moule-lib b");
      if (anime) rouler(b, typo(libelle)); else b.textContent = libelle;
      const phrase = zone.querySelector(".moule-dit");
      if (phrase.textContent !== typo(dit)) {
        phrase.textContent = dit;
        if (anime) animer(phrase, [{ opacity: 0 }], { duree: "courte", cle: "dit", reprise: false });
      }
    }
    zone.dataset.taille = taille;
  };

  /* Les trois temps : chaque durée est un texte qui roule quand elle change (le temps
     total d'une version composée), les puces qui apparaissent ou disparaissent se
     remplacent d'un fondu. */
  const drawTemps = ({ anime = false } = {}) => {
    const rangee = document.getElementById("timerow");
    const neuf = gabaritLi(`<div>${tempsHtml(r)}</div>`);
    const anciennes = [...rangee.children];
    const nouvelles = [...neuf.children];
    const memeForme = anciennes.length === nouvelles.length && anciennes.every((c, i) => c.dataset.t === nouvelles[i].dataset.t);
    if (!anime || !memeForme || mouvementReduit()) {
      rangee.replaceChildren(...nouvelles);
      if (anime && !memeForme) animer(rangee, [{ opacity: 0.3 }], { duree: "courte", cle: "temps", reprise: false });
      return;
    }
    nouvelles.forEach((n, i) => {
      const v = anciennes[i].querySelector(".tc-v");
      const nv = n.querySelector(".tc-v").textContent;
      if (v.textContent !== typo(nv)) rouler(v, typo(nv));
    });
  };

  const drawVersion = ({ anime = false } = {}) => { drawIngredients({ anime }); drawSteps({ anime }); drawPicks(); drawAllergenes(); drawMoule({ anime }); drawTemps({ anime }); };

  if (customizable(r)) {
    document.getElementById("pick-zone").addEventListener("click", e => {
      if (onPickClick(e, r)) { drawVersion({ anime: true }); updateBadge(); vibrer("tic"); }
    });
  }

  /* Les étapes citent elles aussi des quantités : elles se redessinent avec la
     liste d'ingrédients, sinon les deux se contrediraient. */
  const setPortions = (p, dit = "") => {
    compo(r.id).portions = p;
    diteDuMoule = dit;
    save();
    drawIngredients({ anime: true }); drawSteps({ anime: true }); drawMoule({ anime: true });
    updateBadge();   // une entrée du menu change les quantités des courses
  };

  /* À la borne, le stepper répond : le chiffre rebondit et la pastille secoue un peu. */
  const butee = () => {
    rebondir(valPortions);
    secouer(valPortions.closest(".portions"));
    vibrer("tic");
  };
  document.getElementById("p-minus").addEventListener("click", () => {
    const p = portionsCourantes();
    if (p > PORTIONS_MIN) setPortions(p - 1); else butee();
  });
  document.getElementById("p-plus").addEventListener("click", () => {
    const p = portionsCourantes();
    if (p < PORTIONS_MAX) setPortions(p + 1); else butee();
  });

  const moulezone = document.getElementById("moule-zone");
  if (moulezone) moulezone.addEventListener("click", e => {
    const pas = e.target.closest("#m-minus") ? -1 : e.target.closest("#m-plus") ? 1 : 0;
    if (!pas) return;
    const taille = Number(moulezone.dataset.taille) + pas;
    if (taille < 8 || taille > 60) { secouer(moulezone.querySelector(".portions")); return; }
    (state.moules ??= {})[r.id] = taille;
    const p = portionsPourMoule(r.moule, r.portions.base, taille);
    setPortions(p, `moule de ${libelleMoule(r.moule, taille)} → recette pour ${libellePortions(p, r.portions.label)}. ${remarqueCuissonMoule(r.moule, taille)}`.trim());
  });

  /* Toucher une ligne : la feuille de l'ingrédient. */
  document.getElementById("ing-list").addEventListener("click", e => {
    const ligne = e.target.closest("[data-i]");
    const ing = ligne && effectiveIngredients(r)[Number(ligne.dataset.i)];
    if (!ing) return;
    const cle = entreeCourante();
    ouvrirIngredient(r, ing, {
      portions: portionsCourantes(),
      regler: n => {
        const avant = portionsCourantes();
        setPortions(n);
        toast(`Recette réglée pour ${libellePortions(n, r.portions.label)}`, {
          action: "Annuler",
          /* Le message survit quelques secondes à un changement de page : on
             défait alors la version d'origine sans redessiner une fiche absente. */
          surAction: () => {
            if (document.getElementById("p-val") && entreeCourante() === cle) return setPortions(avant);
            const cible = cle ? entreeDe(cle) : null;
            if (cle && !cible) return;       // l'entrée a été retirée entre-temps
            if (cible) cible.portions = avant; else state.portions[r.id] = avant;
            save(); updateBadge();
          }
        });
      }
    });
  });

  const addBtn = document.getElementById("add-list");
  const info = document.getElementById("menu-info");

  /* Sur une entrée de menu, le bouton la retire. Sur la fiche nue, il AJOUTE —
     toujours, jamais en bascule : c'est ce qui permet deux cakes au menu, l'un
     aux olives, l'autre aux lardons. On retire depuis le menu ou depuis
     l'entrée elle-même. Les libellés sont courts pour tenir sur une ligne ;
     la suite, muette à l'œil, reste lue par les lecteurs d'écran. */
  let delaiBouton = null;
  const drawAddBtn = ({ confirme = false, fondu = false } = {}) => {
    const n = entreesDe(r.id).length;
    clearTimeout(delaiBouton);
    if (entreeCourante()) {
      addBtn.className = "btn added";
      addBtn.innerHTML = `${ICON.check} Au menu`;
      info.innerHTML = `Tu composes la version qui est au menu. <button class="lien-nu" id="menu-retirer">La retirer</button>`;
    } else if (confirme) {
      /* Le geste est pris en compte : la coche se trace, le libellé change, puis le
         bouton redevient « Ajouter une autre version ». */
      addBtn.className = "btn added trace";
      addBtn.innerHTML = `${COCHE_TRACEE} <span>Ajouté<span class="fiche-sr"> au menu</span></span>`;
      info.innerHTML = `${n} version${n > 1 ? "s" : ""} de cette recette déjà <a href="#/menu">au menu</a>.`;
      delaiBouton = setTimeout(() => { if (addBtn.isConnected) drawAddBtn({ fondu: true }); }, 1600);
    } else {
      addBtn.className = n ? "btn added" : "btn secondary";
      addBtn.innerHTML = n
        ? `${ICON.cart} <span>Ajouter<span class="fiche-sr"> une autre version</span></span>`
        : `${ICON.cart} <span>Ajouter<span class="fiche-sr"> au menu</span></span>`;
      info.innerHTML = n
        ? `${n} version${n > 1 ? "s" : ""} de cette recette déjà <a href="#/menu">au menu</a>.`
        : "";
    }
    if (fondu) animer(addBtn, [{ opacity: 0.35 }], { duree: "courte", cle: "libelle", reprise: false });
    const x = document.getElementById("menu-retirer");
    if (x) x.addEventListener("click", () => {
      retirerDuMenu(entreeCourante());
      updateBadge();
      vibrer("tic");
      retraitRecent = r.id;
      toast("Retiré du menu");
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
    diteDuMoule = "";
    envolerVersLeMenu(r, addBtn);   // la vignette part avant que la fiche ne change
    drawVersion({ anime: true }); drawAddBtn({ confirme: true });
    vibrer("tic");
    const combien = entreesDe(r.id).length;
    toast(combien > 1
      ? `Deuxième version au menu — courses à jour`
      : n ? `Au menu avec ${n} supplément${n > 1 ? "s" : ""} — courses à jour`
          : "Au menu — courses à jour");
  };

  drawAddBtn({ fondu: retraitRecent === r.id });
  retraitRecent = null;

  addBtn.addEventListener("click", () => {
    if (entreeCourante()) return;           // déjà au menu : on retire par le lien
    if (!customizable(r)) return ajouter();
    /* Façon fast-food : composer sa version, ou ajouter tel quel d'un tap. */
    openAddSheet(r, added => {
      drawVersion({ anime: true }); updateBadge();
      if (added) ajouter();
    });
  });

  document.getElementById("share-recipe").addEventListener("click", () => shareRecipe(r.id));
  document.getElementById("fb-share").addEventListener("click", () => shareRecipe(r.id));

  /* L'impression part de la page telle qu'elle est : la note en cours de frappe
     est d'abord enregistrée et remontée en tête, où la feuille de style la garde. */
  document.getElementById("print-recipe").addEventListener("click", () => {
    enregistrerMaintenant?.({ afficher: true });
    window.print();
  });

  if (resume) document.getElementById("restart-cook").addEventListener("click", () => {
    const k = entreeCourante() || undefined;
    forgetCooking(cleCuisine(r, k));
    location.hash = `${k ? `#/recette/${r.id}/m/${k}` : `#/recette/${r.id}`}/cuisine`;
  });

  /* ---------- Mes notes ---------- */

  const saisie = document.getElementById("note-saisie");
  const etatNote = document.getElementById("note-etat");
  const teteNote = document.getElementById("note-perso-tete");
  const noteEnregistree = () => state.notesPerso?.[r.id]?.txt ?? "";

  /* En tête de fiche, la note se lit sans descendre. Elle ne se redessine pas à
     chaque frappe : un bloc qui apparaît au-dessus pousserait la zone de saisie
     sous le doigt qui écrit. */
  const drawNoteTete = () => {
    const txt = noteEnregistree();
    const apparait = !!txt && teteNote.hidden && teteNote.dataset.vu === "1";
    teteNote.hidden = !txt;
    teteNote.innerHTML = txt ? html`<b>Ma note</b><p>${txt}</p>` : "";
    teteNote.dataset.vu = "1";
    // Une note qui apparaît en tête (après un enregistrement) se pose en douceur.
    if (apparait) animer(teteNote, [{ opacity: 0, translate: "0 -8px" }], { cle: "note", easing: "ressort", reprise: false });
  };

  /* « Enregistré » arrive en fondu, puis se pose. */
  const montrerEnregistre = () => {
    etatNote.textContent = "Enregistré";
    animer(etatNote, [{ opacity: 0, translate: "0 4px" }], { cle: "etat", easing: "sortie", reprise: false });
  };

  /* Seule une frappe réelle écrit la note. Le champ peut être resté sur une
     version périmée (une note arrivée d'un autre appareil pendant que la fiche
     était ouverte, ou une fiche quittée dont les écouteurs vivent encore) : le
     comparer à l'état reviendrait à effacer la note de l'autre. */
  const zoneJournal = document.getElementById("journal-zone");
  let journalDessine = null;
  let modifiee = false;
  let delaiNote = null;
  const enregistrerNote = ({ afficher = false } = {}) => {
    clearTimeout(delaiNote);
    const txt = saisie.value.trim();
    if (modifiee && txt !== noteEnregistree()) {
      if (txt) (state.notesPerso ??= {})[r.id] = { txt, at: Date.now() };
      else delete state.notesPerso[r.id];
      save();
      montrerEnregistre();
    }
    modifiee = false;
    if (afficher) drawNoteTete();
  };
  saisie.value = noteEnregistree();
  saisie.addEventListener("input", () => {
    modifiee = true;
    etatNote.textContent = "";
    clearTimeout(delaiNote);
    delaiNote = setTimeout(enregistrerNote, DELAI_NOTE);
  });
  saisie.addEventListener("blur", () => enregistrerNote({ afficher: true }));
  enregistrerMaintenant = enregistrerNote;
  drawNoteTete();

  /* Une version venue d'un autre appareil vient d'être appliquée : la note et le
     journal de la fiche ouverte se rafraîchissent sur place. La zone de saisie
     n'est jamais touchée pendant qu'on y tape ou tant qu'elle porte une frappe
     pas encore enregistrée. */
  const auSynchro = () => {
    if (!saisie.isConnected) { document.removeEventListener("carnet-synchro", auSynchro); return; }
    if (!modifiee && document.activeElement !== saisie) saisie.value = noteEnregistree();
    drawNoteTete();
    if (journalDessine && !zoneJournal.contains(document.activeElement)) journalDessine(zoneJournal, r);
  };
  document.addEventListener("carnet-synchro", auSynchro);

  /* Les boutons se dessinent une fois, ensuite seuls leur état change : la couleur
     glisse (transition), le cœur qui bat et ses petits cœurs ne sont pas coupés. */
  const drawVerdict = () => {
    const cur = verdictOf(r);
    const rangee = document.getElementById("verdict-row");
    if (!rangee.firstElementChild) {
      rangee.innerHTML = VERDICTS.map(v => `
      <button class="verdict-btn" data-verdict="${v.id}" aria-pressed="false"><span class="vb-heart">♥</span> ${v.label.replace(/^♥\s*/, "")}</button>
    `).join("");
    }
    rangee.querySelectorAll("[data-verdict]").forEach(b => {
      const on = cur === b.dataset.verdict;
      b.classList.toggle("on", on);
      b.classList.toggle("v-" + b.dataset.verdict, on);
      b.setAttribute("aria-pressed", String(on));
    });
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
    vibrer("tic");
    if (activating) {
      const btn = document.querySelector(`#verdict-row [data-verdict="${v}"]`);
      if (btn) burstHeart(btn);
    }
  });

  drawVersion();
  drawVerdict();

  /* La barre compacte : dès que le titre est sorti par le haut de l'écran, une barre
     fine (retour, titre court, partage) se pose en haut. Son titre est aria-hidden
     (le h1 reste le seul titre pour un lecteur d'écran) et elle est inert tant qu'elle
     est cachée : ni tabulation ni lecture pour des boutons qu'on ne voit pas. */
  const barre = document.getElementById("fiche-barre");
  const poserBarre = visible => {
    barre.classList.toggle("visible", visible);
    barre.inert = !visible;
  };
  if (!observer({ threshold: 0 }, ([x]) => poserBarre(!x.isIntersecting && x.boundingClientRect.bottom < 0), [document.querySelector(".r-head h1")])) {
    barre.hidden = true;   // sans IntersectionObserver, pas de barre : la fiche reste complète
  }

  /* Les ingrédients et les étapes hors de l'écran arrivent quand on y vient. */
  arrivesAuDefilement([...document.querySelectorAll("#ing-list li, #steps-list > li")]);

  /* Le journal est l'affaire d'un autre module, facultatif : sans lui la section
     reste cachée, comme si elle n'existait pas. */
  import("./journal.js").then(m => {
    if (!zoneJournal.isConnected || typeof m.dessinerJournal !== "function") return;
    journalDessine = m.dessinerJournal;
    m.dessinerJournal(zoneJournal, r);
    zoneJournal.hidden = false;
  }).catch(e => console.error("Journal indisponible :", e));
}
