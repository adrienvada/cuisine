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
import { save, state } from "../core/etat.js";
import { scaleText, timeText } from "../core/format.js";
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
import { shareRecipe } from "../ui/partage.js";
import { allerEnRemplacant, app, hashPrecedent } from "../ui/routeur.js";
import { toast, updateBadge } from "../ui/toast.js";
import { visuel } from "../ui/visuel.js";
import { burstHeart, discoveredHtml } from "./accueil.js";
import { ouvrirIngredient, quantiteTexte } from "./ingredient.js";
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
        ${t.prep || addonTime(r, "prep") ? `<span class="timechip">${ICON.knife} Préparation : ${timeText(t.prep, addonTime(r, "prep"))}</span>` : ""}
        ${t.repos || addonTime(r, "repos") ? `<span class="timechip">${ICON.zzz} ${r.reposLabel || "Repos"} : ${timeText(t.repos, addonTime(r, "repos"))}</span>` : ""}
        ${t.cuisson != null || addonTime(r, "cuisson") ? `<span class="timechip">${ICON.flame} Cuisson : ${timeText(t.cuisson || 0, addonTime(r, "cuisson"))}</span>` : `<span class="timechip">${ICON.flame} Sans cuisson</span>`}
      `;
};

export function renderRecipe(r) {
  // Étape 1 : rien à reprendre, « Mode cuisine » y mène déjà.
  const resume = cookingStep(r, entreeCourante() || undefined) || null;
  const retour = retourDe();
  poserEcouteurs();
  app.innerHTML = `
    <div class="topbar fade-in">
      <a class="btn-icon" href="${esc(retour.href)}" data-retour="${esc(retour.href)}">${ICON.back} ${retour.texte}</a>
      <div class="topbar-actions">
        <button class="btn-icon" id="print-recipe" aria-label="Imprimer">${ICON_IMPRIMER} <span class="btn-lib">Imprimer</span></button>
        <button class="btn-icon" id="share-recipe">${ICON.share} Partager</button>
      </div>
    </div>
    <div class="hero"><div class="visual" style="background:${r.color}33">
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
          <span class="val" id="p-val" aria-live="polite"></span>
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
  const unite = r.portions.label;

  const drawIngredients = () => {
    const p = portionsCourantes();
    const f = p / r.portions.base;
    document.getElementById("p-val").textContent = `${p} ${unite}`;
    document.getElementById("ing-list").innerHTML = effectiveIngredients(r).map((ing, i) => html`<li>
      <button type="button" class="ing-ligne" data-i="${i}" aria-haspopup="dialog">
        <span class="qty">${quantiteTexte(ing, f)}</span>
        <span class="ing-nom">${ing.name}${ing.addon ? raw(`<span class="opt sup">supplément</span>`) : ""}${ing.optional ? raw(`<span class="opt">optionnel</span>`) : ""}${ing.note ? raw(html`<span class="note"> — ${scaleText(ing.note, f)}</span>`) : ""}</span>
        <span class="ing-chev" aria-hidden="true">${raw(ICON.chev)}</span>
      </button>
    </li>`).join("");
  };

  const drawSteps = () => {
    const f = portionsCourantes() / r.portions.base;
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

  const drawMoule = () => {
    const zone = document.getElementById("moule-zone");
    if (!zone) return;
    const base = r.portions.base, p = portionsCourantes();
    /* La taille retenue ne vaut que si elle donne bien ces portions : réglées
       à la main depuis, elles ont repris la main et le moule affiché suit. */
    const memo = state.moules?.[r.id];
    const taille = memo && portionsPourMoule(r.moule, base, memo) === p ? memo : tailleEquivalente(r.moule, base, p);
    zone.innerHTML = html`
      <div class="moule-ligne">
        <span class="moule-lib">Ton moule : <b>${libelleMoule(r.moule, taille)}</b></span>
        <span class="portions">
          <button id="m-minus" aria-label="Moule plus petit">−</button>
          <button id="m-plus" aria-label="Moule plus grand">+</button>
        </span>
      </div>
      <p class="moule-dit" aria-live="polite">${diteDuMoule || `La recette est écrite pour un moule de ${libelleMoule(r.moule, tailleDeReference(r.moule))}.`}</p>`;
    zone.dataset.taille = taille;
  };

  const drawTemps = () => { document.getElementById("timerow").innerHTML = tempsHtml(r); };

  const drawVersion = () => { drawIngredients(); drawSteps(); drawPicks(); drawAllergenes(); drawMoule(); drawTemps(); };

  if (customizable(r)) {
    document.getElementById("pick-zone").addEventListener("click", e => {
      if (onPickClick(e, r)) { drawVersion(); updateBadge(); }
    });
  }

  /* Les étapes citent elles aussi des quantités : elles se redessinent avec la
     liste d'ingrédients, sinon les deux se contrediraient. */
  const setPortions = (p, dit = "") => {
    compo(r.id).portions = p;
    diteDuMoule = dit;
    save();
    drawIngredients(); drawSteps(); drawMoule();
    updateBadge();   // une entrée du menu change les quantités des courses
  };
  document.getElementById("p-minus").addEventListener("click", () => {
    const p = portionsCourantes();
    if (p > PORTIONS_MIN) setPortions(p - 1);
  });
  document.getElementById("p-plus").addEventListener("click", () => {
    const p = portionsCourantes();
    if (p < PORTIONS_MAX) setPortions(p + 1);
  });

  const moulezone = document.getElementById("moule-zone");
  if (moulezone) moulezone.addEventListener("click", e => {
    const pas = e.target.closest("#m-minus") ? -1 : e.target.closest("#m-plus") ? 1 : 0;
    if (!pas) return;
    const taille = Number(moulezone.dataset.taille) + pas;
    if (taille < 8 || taille > 60) return;
    (state.moules ??= {})[r.id] = taille;
    const p = portionsPourMoule(r.moule, r.portions.base, taille);
    setPortions(p, `moule de ${libelleMoule(r.moule, taille)} → recette pour ${p} ${unite}. ${remarqueCuissonMoule(r.moule, taille)}`.trim());
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
        toast(`Recette réglée pour ${n} ${unite}`, {
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
  const drawAddBtn = () => {
    const n = entreesDe(r.id).length;
    if (entreeCourante()) {
      addBtn.className = "btn added";
      addBtn.innerHTML = `${ICON.check} Au menu`;
      info.innerHTML = `Tu composes la version qui est au menu. <button class="lien-nu" id="menu-retirer">La retirer</button>`;
    } else {
      addBtn.className = n ? "btn added" : "btn secondary";
      addBtn.innerHTML = n
        ? `${ICON.cart} <span>Ajouter<span class="fiche-sr"> une autre version</span></span>`
        : `${ICON.cart} <span>Ajouter<span class="fiche-sr"> au menu</span></span>`;
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
    diteDuMoule = "";
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
    teteNote.hidden = !txt;
    teteNote.innerHTML = txt ? html`<b>Ma note</b><p>${txt}</p>` : "";
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
      etatNote.textContent = "Enregistré";
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

  /* Le journal est l'affaire d'un autre module, facultatif : sans lui la section
     reste cachée, comme si elle n'existait pas. */
  import("./journal.js").then(m => {
    if (!zoneJournal.isConnected || typeof m.dessinerJournal !== "function") return;
    journalDessine = m.dessinerJournal;
    m.dessinerJournal(zoneJournal, r);
    zoneJournal.hidden = false;
  }).catch(e => console.error("Journal indisponible :", e));
}
