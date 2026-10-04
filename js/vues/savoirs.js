/* L'onglet Savoirs : le catalogue des fondamentaux, leur page, leur feuille et l'astuce qui y renvoie. */

import { state } from "../core/etat.js";
import { CERTITUDES, fondById, fondsDe, fondsTous, recettesDuFond } from "../core/fonds.js";
import { ICON } from "../core/icones.js";
import { fermerFeuille, ouvrirFeuille } from "../ui/feuilles.js";
import { shareFond } from "../ui/partage.js";
import { app } from "../ui/routeur.js";

/* Encadré d'astuce, façon livre de cuisine (toque ou plume selon le titre) */
/* Deux registres : l'astuce du chef (toque verte) et le repère à savoir (plume
   dorée). Le champ `k` le dit explicitement — auparavant on le devinait du titre
   à l'expression régulière, si bien que renommer une astuce changeait son
   apparence en silence. */
export function tipHtml(tip, savoirs = "") {
  const savoir = tip.k === "savoir";
  return `<div class="tip ${savoir ? "beige" : ""}${savoirs ? " a-savoirs" : ""}">
    <span class="tip-ico">${savoir ? ILLO.D.plume : ILLO.D.toque}</span>
    <div class="tip-body"><b>${tip.t}</b>${tip.txt}${savoirs}</div>
  </div>`;
}

/* Le savoir se découvre en touchant l'astuce, il ne s'impose pas. Une pastille
   permanente sous chaque astuce prenait autant de place que l'astuce elle-même
   et alourdissait la lecture d'une étape. L'appel est donc une simple ligne,
   dans l'encre du titre de l'astuce, et l'appui ne fait que RÉVÉLER le lien —
   il n'ouvre rien. Un doigt posé par mégarde en cuisinant ne coûte donc pas
   une lecture qu'on n'a pas demandée, seulement une ligne à replier. */
export const savoirsHtml = o => {
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
export const astuceHtml = s => {
  const sav = savoirsHtml(s);
  if (s.tip) return tipHtml(s.tip, sav);
  return sav ? `<div class="savoirs-seuls a-savoirs">${sav}</div>` : "";
};

/* Corps d'un fondamental — le même dans la feuille et dans la page partagée :
   deux contenants, une seule vérité. */
export function fondBodyHtml(f) {
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
export function openFondSheet(id) {
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

export const fondMatches = (f, q) => {
  if (!q) return true;
  const foin = [f.t, f.accroche, f.pourquoi, f.famille, f.piege,
    ...(f.cas || []).flatMap(c => [c.q, c.r]), ...(f.reperes || [])].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every(w => foin.includes(w));
};

export function renderFondamentaux() {
  const q = state.fondQuery || "";
  const trouves = fondsTous().filter(f => fondMatches(f, q));
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
    <p class="f-compte">${fondsTous().length} fondamental${fondsTous().length > 1 ? "aux" : ""} dans le carnet.</p>
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

export function renderFondamental(f) {
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
