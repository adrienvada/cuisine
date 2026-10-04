/* Le mode cuisine : une étape par écran, minuteurs, ingrédients sous la main, reprise là où l'on s'est arrêté. */

import {
  TAILLES, indexTaille, ingredientsDeLEtape, libelleQuantite,
  planPrechauffage, secondesRestantes, sensBalayage, texteALire
} from "../core/cuisine.js";
import { save, state } from "../core/etat.js";
import { fmtClock, fmtTime, libellePortions, scaleText } from "../core/format.js";
import { esc } from "../core/html.js";
import { ICON } from "../core/icones.js";
import { entreeCourante, estRepos, portionsOf } from "../core/menu.js";
import { effectiveIngredients, effectiveSteps, markCooked, selectedAddons, verdictOf } from "../core/recettes.js";
import { cleCuisine, forgetCooking, noAutoResume, setCooking } from "../core/seance.js";
import { annoncer } from "../ui/annonces.js";
import { fermerFeuille, feuilleOuverte, ouvrirFeuille } from "../ui/feuilles.js";
import { glisser, relacher, vibrer } from "../ui/geste.js";
import {
  COCHE_PRET,
  acquireWakeLock,
  ajouterMinute,
  anneauHtml,
  basculerPause,
  cancelTimer,
  estFini,
  findTimer,
  libererPlateau,
  libererVerrou,
  setEtapeAffichee,
  setRefreshZone,
  startTimer
} from "../ui/minuteurs.js";
import { animer, rouler } from "../ui/mouvement.js";
import { shareRecipe } from "../ui/partage.js";
import { app, noterAdresseCourante, retourVers } from "../ui/routeur.js";
import { REDUCE_MOTION } from "../ui/theme.js";
import { toast } from "../ui/toast.js";
import { extrasHtml } from "./fiche.js";
import { decisionPage, limitesPage } from "./cuisine-gestes.js";
import { astuceHtml } from "./savoirs.js";

let cookIdx = 0;

/* Ce que la séance en cours doit défaire en partant (clavier, balayage, micro) :
   le routeur appelle stopCookMode à chaque changement de page. */
let nettoyage = null;

/* Les coches de mise en place sont propres à la séance : rangées sous sa clé,
   oubliées à « Terminer ». Elles survivent à un redessin, pas à la fin. */
const cochesParSeance = new Map();

/* Le mains libres est écrit par un autre module, qui peut manquer : on ne montre
   le micro que s'il se charge et que le navigateur sait écouter. */
let voixPromesse = null;
const chargerVoix = () => voixPromesse || (voixPromesse = import("../ui/voix.js")
  .then(m => (m.voixDisponible().ecoute ? m : null))
  .catch(() => null));

/* Redessiner efface le bouton qu'on vient d'activer, et avec lui le focus : la
   touche Tab suivante repartirait du début de la page. On note donc le contrôle
   (par son id, ou par son attribut data-*, qui porte l'identifiant du minuteur) pour
   rendre le focus à son équivalent dans le dessin neuf. */
const reperer = (racine, el) => {
  // Les bulles du plateau se ressemblent toutes : le plateau retrouve seul son focus.
  if (!el || !racine.contains(el) || el === racine || el.closest("#timer-tray")) return null;
  if (el.id) return `#${el.id}`;
  const attr = [...el.attributes].find(a => a.name.startsWith("data-") && a.value);
  return attr ? `[${attr.name}="${attr.value}"]` : null;
};

/* `secours` reçoit le focus quand l'équivalent n'existe plus ou est désactivé. */
const rendreLeFocus = (racine, repere, secours) => {
  if (!repere) return;
  let cible = racine.querySelector(repere);
  if (!cible || cible.disabled) cible = typeof secours === "function" ? secours() : secours;
  if (cible) cible.focus({ preventScroll: true });
};

const ICONE_MICRO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>';

/* Le soulignement manuscrit du titre d'étape, tracé à l'encre à chaque nouvelle étape :
   la classe .trace (base.css) suffit, l'élément étant recréé avec l'étape. */
const FLOURISH = ILLO.D.flourish.replace(/<path /g, '<path pathLength="1" ');

export function stopCookMode() {
  if (nettoyage) { nettoyage(); nettoyage = null; }
  libererPlateau();
  setRefreshZone(null);
  document.body.classList.remove("cooking");
  setEtapeAffichee(null);
  // Le verrou ne se relâche que si aucun minuteur n'en a plus besoin.
  libererVerrou();
}

/* `step` (facultatif, depuis l'adresse) ouvre directement l'étape voulue —
   c'est par là qu'une bulle de minuteur ramène à ce qui est en train de cuire. */
export function renderCook(r, step) {
  if (nettoyage) { nettoyage(); nettoyage = null; }
  // La version composée (vinaigrette choisie, suppléments) dicte les étapes.
  const steps = effectiveSteps(r);
  const ingredients = effectiveIngredients(r);
  const supplements = selectedAddons(r);
  // Les quantités citées dans les étapes suivent les portions réglées sur la fiche.
  const f = portionsOf(r) / r.portions.base;
  const at = parseInt(step, 10);
  cookIdx = Number.isInteger(at) ? Math.min(Math.max(at, 0), steps.length - 1) : 0;
  // On y revient de soi-même : la reprise automatique redevient légitime.
  const cleSeance = cleCuisine(r);
  const prefixeCook = entreeCourante() ? `#/recette/${r.id}/m/${entreeCourante()}` : `#/recette/${r.id}`;
  noAutoResume.delete(cleSeance);
  const prechauffage = planPrechauffage(steps);
  const note = ((state.notesPerso || {})[r.id] || {}).txt;
  // Le changement de page est asynchrone : sans ce verrou, un double-tap sur
  // « Terminer » compterait la recette deux fois.
  let finished = false;
  let voix = null, ecoute = null;
  // L'étape du dernier dessin (d'où l'on vient : les segments et l'étiquette en tirent leur mouvement),
  // le geste qui tient la page, et un jeton qui annule une page en train de partir si l'on navigue autrement.
  let dernierIdx = null, glisseur = null, gesteSuivi = false, jeton = 0;
  acquireWakeLock();
  document.body.classList.add("cooking");

  const taille = () => indexTaille((state.reglages || {}).tailleCuisine);

  const noteHtml = () => `<aside class="note-perso"><b>Ta note</b><p>${esc(note)}</p></aside>`;

  const pastillesHtml = idx => {
    const liste = ingredientsDeLEtape(steps[idx], idx, steps.length, ingredients, supplements);
    if (!liste.length) return "";
    return `<ul class="cook-pastilles" aria-label="Ingrédients de l'étape">${liste.map(ing => {
      const q = libelleQuantite(ing, f);
      return `<li>${q ? `<b>${q}</b> ` : ""}${ing.name}</li>`;
    }).join("")}</ul>`;
  };

  const microHtml = () => `<button type="button" class="cook-outil cook-micro" id="cook-micro"
    aria-pressed="${ecoute ? "true" : "false"}" aria-label="Mains libres">${ICONE_MICRO}</button>`;

  /* `sens` : 1 si l'on avance, -1 si l'on recule, 0 pour un premier dessin —
     l'étape entre alors du côté d'où elle vient (`court` : un bouton ou une flèche, plus vif
     qu'un geste de la main). */
  const draw = (sens = 0, court = false) => {
    const s = steps[cookIdx];
    const last = cookIdx === steps.length - 1;
    const t = taille();
    if (!finished) {
      setCooking(cleSeance, cookIdx);
      // L'adresse suit l'étape sans encombrer l'historique : un rechargement,
      // ou une PWA fermée par iOS, retrouve ainsi la bonne étape.
      history.replaceState(history.state, "", `${prefixeCook}/cuisine/${cookIdx}`);
      noterAdresseCourante();
    }
    const repere = reperer(app, document.activeElement);
    libererPlateau();
    if (glisseur) { glisseur.detruire(); glisseur = null; }
    const depuis = dernierIdx;
    dernierIdx = cookIdx;
    const entree = REDUCE_MOTION.matches || !sens ? "" : `${sens > 0 ? "vers-suivant" : "vers-precedent"}${court ? " court" : ""}`;
    app.innerHTML = `
      <div class="cook taille-${t}">
        <div class="cook-top">
          <h1 class="title">${r.title}</h1>
          <span class="cook-tools">
            <button class="cook-close" id="cook-share" aria-label="Partager la recette">${ICON.share}</button>
            <button class="cook-close" id="cook-close" aria-label="Fermer">✕</button>
          </span>
        </div>
        <div class="cook-outils">
          <button type="button" class="cook-outil cook-outil-texte" id="cook-ing">Ingrédients</button>
          <span class="cook-taille" role="group" aria-label="Taille du texte">
            <button type="button" class="cook-outil" id="cook-moins" aria-label="Texte plus petit" ${t === 0 ? "disabled" : ""}>A−</button>
            <button type="button" class="cook-outil" id="cook-plus" aria-label="Texte plus grand" ${t === TAILLES.length - 1 ? "disabled" : ""}>A+</button>
          </span>
          ${voix ? microHtml() : ""}
        </div>
        <div class="cook-progress" aria-hidden="true">${steps.map((_, i) => `<i class="${i <= cookIdx ? "done" : ""}"></i>`).join("")}</div>
        <div class="cook-body">
          <div class="cook-etape ${entree}">
            <p class="cook-step-label">Étape <span class="cook-num">${cookIdx + 1}</span> / ${steps.length}</p>
            <h2>${s.t}</h2>
            <span class="cook-flourish trace">${FLOURISH}</span>
            ${cookIdx === 0 && note ? noteHtml() : ""}
            <p class="txt">${scaleText(s.txt, f)}</p>
            ${pastillesHtml(cookIdx)}
            ${scaleText(extrasHtml(s, true), f)}
            ${scaleText(astuceHtml(s), f)}
            <div class="cook-timer" id="timer-zone"></div>
            ${prechauffage && prechauffage.etape === cookIdx ? `<div class="cook-chauffe" id="four-zone"></div>` : ""}
          </div>
        </div>
        <div id="plateau-cuisine"></div>
        <div class="cook-nav">
          <button id="prev" ${cookIdx === 0 ? "disabled" : ""}>Précédent</button>
          <button id="next" class="main">${last ? "Terminer  ✓" : "Suivant"}</button>
        </div>
      </div>
    `;
    // Le plateau prend sa place dans la mise en page, et la bulle de l'étape
    // affichée s'efface : son compte à rebours est déjà en grand juste au-dessus.
    setEtapeAffichee(cleSeance, cookIdx);
    drawZones(s);
    setRefreshZone(() => drawZones(steps[cookIdx]));
    // Un bouton devenu inactif (« Précédent » à la première étape) ne peut plus le garder :
    // le focus va alors au titre de l'étape, où la lecture reprend.
    const titre = app.querySelector(".cook-etape h2");
    titre.tabIndex = -1;
    rendreLeFocus(app, repere, titre);
    animerProgression(depuis);
    brancherPage();
  };

  /* Les segments du haut se remplissent de gauche à droite (ressort léger) quand on avance et se
     vident à l'envers quand on recule ; l'étiquette roule. Le dessin a déjà posé l'état final :
     ces mouvements ne font que le rejoindre, sans rien bloquer. */
  const animerProgression = depuis => {
    if (depuis === null || depuis === cookIdx || REDUCE_MOTION.matches) return;
    const segments = [...app.querySelectorAll(".cook-progress i")];
    const avance = cookIdx > depuis;
    const touches = avance ? segments.slice(depuis + 1, cookIdx + 1) : segments.slice(cookIdx + 1, depuis + 1).reverse();
    touches.forEach((segment, i) => animer(segment, avance
      ? [{ scale: "0 1", transformOrigin: "left" }, { scale: "1 1", transformOrigin: "left" }]
      : [{ scale: "1 1", transformOrigin: "right" }, { scale: "0 1", transformOrigin: "right" }],
    { pseudoElement: "::before", cle: "segment", easing: "ressort", delai: Math.min(i, 5) * 40, fill: "both", reprise: false }));
    const num = app.querySelector(".cook-num");
    num.textContent = String(depuis + 1);
    rouler(num, String(cookIdx + 1));
  };

  const aller = (delta, court = false) => {
    const suivant = cookIdx + delta;
    if (finished || suivant < 0 || suivant >= steps.length) return;
    // Une page déjà en train de partir au doigt cède la place : une seule étape à la fois.
    jeton++;
    cookIdx = suivant;
    draw(delta, court);
    annoncer(`Étape ${cookIdx + 1} / ${steps.length}, ${app.querySelector(".cook-etape h2").textContent}`);
    if (ecoute) lireEtape();
  };

  const terminer = async () => {
    if (finished) return;
    finished = true;
    const first = !verdictOf(r);
    // La célébration part du bouton touché : sa place se lit avant que la page change.
    const bouton = document.getElementById("next");
    const rect = bouton && bouton.getBoundingClientRect();
    celebrer(rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null);
    markCooked(r.id);
    forgetCooking(cleSeance);
    cochesParSeance.delete(cleSeance);
    location.hash = prefixeCook;
    const message = first ? "Bon appétit ! Un coup de cœur ?" : "Bon appétit !";
    // Le journal est un module à part : absent, le message reste celui d'avant.
    const journal = await import("./journal.js").catch(() => null);
    if (journal && journal.ouvrirJournal) {
      toast(message, { action: "Ajouter au journal", surAction: () => journal.ouvrirJournal(r.id) });
    } else toast(message);
  };

  /* La dernière page est célébrée, une seule fois (terminer() ne repasse pas) : une vibration de
     réussite, des feuilles qui jaillissent du bouton et un tampon « Bon appétit » encré par-dessus
     la fiche où l'on atterrit. Les effets lourds se chargent à la demande ; en mouvement réduit
     il ne reste que la vibration, que seul le réglage « Vibrations » gouverne. */
  const celebrer = async origine => {
    vibrer("succes");
    if (REDUCE_MOTION.matches) return;
    try {
      const effets = await import("../ui/effets.js");
      effets.feuilles(origine || undefined);
      const marque = document.createElement("div");
      marque.className = "cook-tampon";
      marque.setAttribute("aria-hidden", "true");
      marque.innerHTML = "<span>Bon appétit</span>";
      document.body.append(marque);
      // Même si une animation se perd, le tampon ne reste jamais.
      setTimeout(() => marque.remove(), 3000);
      await effets.tampon(marque);
      await animer(marque, [{ opacity: 1 }, { opacity: 0 }], { duree: 260, delai: 650, fill: "forwards", reprise: false });
      marque.remove();
    } catch {}
  };

  /* ---------- Taille du texte ---------- */

  const changerTaille = delta => {
    const t = Math.min(Math.max(taille() + delta, 0), TAILLES.length - 1);
    state.reglages = state.reglages || {};
    state.reglages.tailleCuisine = TAILLES[t];
    save();
    // Pas de redessin : on garde l'endroit où l'on en est dans l'étape. Le texte grossit sans saut :
    // la page est posée à sa nouvelle taille, puis part de l'ancienne (échelle) et la rejoint ; le
    // bloc qui était en haut de l'écran y reste.
    const cook = document.querySelector(".cook");
    const corps = cook.querySelector(".cook-body");
    const etape = cook.querySelector(".cook-etape");
    const texte = etape.querySelector(".txt");
    const avantTaille = parseFloat(getComputedStyle(texte).fontSize);
    const ancre = ancreDeLecture(corps, etape);
    cook.className = cook.className.replace(/taille-\d/, `taille-${t}`);
    const rapport = avantTaille / parseFloat(getComputedStyle(texte).fontSize);
    rendreAncre(corps, ancre);
    if (Math.abs(rapport - 1) > 0.01) {
      etape.style.transformOrigin = "0 0";
      animer(etape, [{ scale: String(rapport), opacity: 0.6 }, { scale: "1", opacity: 1 }], { duree: "moyenne", easing: "sortie", cle: "taille", reprise: false })
        .then(() => { etape.style.transformOrigin = ""; });
    }
    const moins = document.getElementById("cook-moins"), plus = document.getElementById("cook-plus");
    const avait = document.activeElement;
    moins.disabled = t === 0;
    plus.disabled = t === TAILLES.length - 1;
    // Le bouton qu'on vient d'enfoncer jusqu'au bout se désactive : son vis-à-vis prend le focus.
    if (avait === moins && moins.disabled) plus.focus({ preventScroll: true });
    else if (avait === plus && plus.disabled) moins.focus({ preventScroll: true });
  };

  /* Le bloc d'étape qui est au haut de l'écran, et où l'on y est : à la nouvelle taille on remet
     le même passage au même endroit (un bloc entier encore en dessous du haut garde sa marge). */
  const ancreDeLecture = (corps, etape) => {
    const haut = corps.getBoundingClientRect().top;
    const bloc = [...etape.children].find(e => e.getBoundingClientRect().bottom > haut + 1);
    if (!bloc) return null;
    const b = bloc.getBoundingClientRect();
    return { bloc, marge: b.top >= haut ? b.top - haut : null, part: b.top < haut ? (haut - b.top) / (b.height || 1) : 0 };
  };

  const rendreAncre = (corps, ancre) => {
    if (!ancre || !ancre.bloc.isConnected) return;
    const haut = corps.getBoundingClientRect().top;
    const b = ancre.bloc.getBoundingClientRect();
    const voulu = ancre.marge != null ? haut + ancre.marge : haut - ancre.part * b.height;
    corps.scrollTop += b.top - voulu;
  };

  /* ---------- La feuille des ingrédients ---------- */

  const ouvrirIngredients = () => {
    if (feuilleOuverte()) return;
    const coches = cochesParSeance.get(cleSeance) || new Set();
    cochesParSeance.set(cleSeance, coches);
    const cleDe = ing => `${ing.cid || ing.name}|${ing.addon || ""}`;
    const lignes = ingredients.map(ing => {
      const q = libelleQuantite(ing, f) || "—";
      return `<li><label class="ing-ligne">
        <input type="checkbox" data-cle="${esc(cleDe(ing))}" ${coches.has(cleDe(ing)) ? "checked" : ""}>
        <span class="ing-qty">${q}</span>
        <span class="ing-nom">${ing.name}${ing.addon ? `<span class="opt sup">supplément</span>` : ""}${ing.optional ? `<span class="opt">optionnel</span>` : ""}${ing.note ? `<span class="note"> — ${scaleText(ing.note, f)}</span>` : ""}</span>
      </label></li>`;
    }).join("");
    const backdrop = document.createElement("div");
    backdrop.className = "sheet-backdrop";
    backdrop.innerHTML = `
      <div class="sheet ing-sheet" role="dialog" aria-modal="true" aria-label="Ingrédients de ${esc(r.title)}">
        <div class="sheet-grip"></div>
        <h3>Ingrédients</h3>
        <p class="sheet-sub">Pour ${libellePortions(portionsOf(r), r.portions.label)}. Coche au fil de la mise en place.</p>
        ${note ? noteHtml() : ""}
        <ul class="ing-liste">${lignes}</ul>
        <button type="button" class="btn secondary ing-fermer" id="ing-fermer">Fermer</button>
      </div>`;
    backdrop.addEventListener("click", e => {
      if (e.target === backdrop || e.target.closest("#ing-fermer")) fermerFeuille();
    });
    backdrop.addEventListener("change", e => {
      const c = e.target.closest("input[data-cle]");
      if (!c) return;
      if (c.checked) coches.add(c.dataset.cle); else coches.delete(c.dataset.cle);
    });
    ouvrirFeuille(backdrop);
  };

  /* ---------- Mains libres ---------- */

  const lireEtape = () => {
    if (!voix) return;
    const s = steps[cookIdx];
    voix.arreterLecture();
    Promise.resolve(voix.lire(texteALire(s.t, scaleText(s.txt, f)))).catch(() => {});
  };

  const lancerMinuteurEtape = () => {
    const s = steps[cookIdx];
    if (!s.timer || findTimer(cleSeance, cookIdx)) return;
    const repos = estRepos(s);
    lancer(null, null, () => startTimer(r, cookIdx, { timer: s.timer, label: repos ? nomRepos(s) : s.t, repos }));
  };

  const majMicro = () => {
    const b = document.getElementById("cook-micro");
    if (b) b.setAttribute("aria-pressed", ecoute ? "true" : "false");
  };

  const arreterMicro = () => {
    if (ecoute) { ecoute.arreter(); ecoute = null; }
    if (voix) voix.arreterLecture();
    majMicro();
  };

  const basculerMicro = () => {
    if (!voix) return;
    if (ecoute) return arreterMicro();
    ecoute = voix.ecouter({
      suivant: () => aller(1),
      precedent: () => aller(-1),
      repeter: lireEtape,
      minuteur: lancerMinuteurEtape,
      ingredients: ouvrirIngredients,
      terminer: () => { if (cookIdx === steps.length - 1) terminer(); else toast("Ce n'est pas encore la dernière étape"); }
    }, {
      onErreur: () => { arreterMicro(); toast("Le micro ne répond pas"); }
    });
    majMicro();
    lireEtape();
  };

  chargerVoix().then(v => {
    voix = v;
    // Le dessin a déjà eu lieu : on ajoute le bouton sans refaire l'écran.
    const outils = document.querySelector(".cook-outils");
    if (v && outils && !document.getElementById("cook-micro") && nettoyage) outils.insertAdjacentHTML("beforeend", microHtml());
  });

  /* ---------- Gestes ---------- */

  /* Les pages tournent sous le doigt : glisser() du socle déplace l'étape, verrouille l'axe (le
     défilement vertical reste au navigateur : `touch-action: pan-y`, cuisine.css), et résiste aux
     bouts — première et dernière étape. Au lâcher, decisionPage() juge la distance et la vitesse :
     la page finit sa course et l'étape voisine entre, ou la page revient à ressort. Un simple tap
     ne verrouille jamais rien (6 px). Le corps est refait à chaque étape : on le rebranche. */
  const brancherPage = () => {
    const corps = app.querySelector(".cook-body");
    glisseur = glisser(corps, {
      axe: "x",
      limites: () => limitesPage(cookIdx, steps.length),
      surDebut: () => { gesteSuivi = true; corps.style.willChange = "translate"; },
      surFin: ({ x, vx, annule }) => {
        corps.style.willChange = "";
        if (annule) return;
        const sens = decisionPage(x, vx, corps.clientWidth);
        const cible = cookIdx + sens;
        if (!sens || cible < 0 || cible >= steps.length) { relacher(corps, { x: 0, y: 0 }, { x: vx, y: 0 }); return; }
        const mon = ++jeton;
        // La page poursuit son chemin en s'effaçant (vite : ce qui part est plus rapide que ce qui arrive).
        animer(corps, [{ translate: `${x}px 0`, opacity: 1 }, { translate: `${x - sens * 70}px 0`, opacity: 0 }],
          { duree: 110, easing: "entree", cle: "page-sortie", fill: "forwards", reprise: false })
          .then(() => { if (mon === jeton) aller(sens); });
      }
    });
  };

  /* Le balayage décompté au lever du doigt reste le secours des pointeurs qui ne bougent pas
     (un geste sans déplacement intermédiaire) ; un geste que glisser() a tenu n'est pas recompté. */
  let depart = null;
  const surAppui = e => {
    gesteSuivi = false;
    depart = e.target.closest(".cook-body") && !feuilleOuverte() ? { x: e.clientX, y: e.clientY } : null;
  };
  const surLever = e => {
    if (!depart) return;
    const sens = gesteSuivi ? 0 : sensBalayage(e.clientX - depart.x, e.clientY - depart.y);
    depart = null;
    if (sens) aller(sens);
  };
  const surAnnulation = () => { depart = null; };
  const surClavier = e => {
    if (feuilleOuverte() || e.altKey || e.ctrlKey || e.metaKey || e.target.closest("input, textarea, select")) return;
    if (e.key === "ArrowRight") aller(1, true);
    else if (e.key === "ArrowLeft") aller(-1, true);
  };
  app.addEventListener("pointerdown", surAppui);
  app.addEventListener("pointerup", surLever);
  app.addEventListener("pointercancel", surAnnulation);
  document.addEventListener("keydown", surClavier);

  nettoyage = () => {
    app.removeEventListener("pointerdown", surAppui);
    app.removeEventListener("pointerup", surLever);
    app.removeEventListener("pointercancel", surAnnulation);
    document.removeEventListener("keydown", surClavier);
    app.removeEventListener("click", surClic);
    if (glisseur) { glisseur.detruire(); glisseur = null; }
    jeton++;
    arreterMicro();
  };

  /* Les zones sont refaites à chaque dessin : on délègue depuis l'écran entier,
     lui aussi recréé, plutôt que d'empiler les écouteurs. */
  const surClic = e => {
    const sur = sel => e.target.closest(sel);
    if (sur("#cook-close")) {
      noAutoResume.add(cleSeance);
      // Arrivé ici par un lien partagé, il n'y a rien derrière : revenir ferait
      // sortir du site. On va alors explicitement à la fiche.
      return retourVers(prefixeCook);
    }
    if (sur("#cook-share")) return shareRecipe(r.id);
    if (sur("#prev")) return aller(-1, true);
    if (sur("#next")) return cookIdx === steps.length - 1 ? terminer() : aller(1, true);
    if (sur("#cook-ing")) return ouvrirIngredients();
    if (sur("#cook-moins")) return changerTaille(-1);
    if (sur("#cook-plus")) return changerTaille(1);
    if (sur("#cook-micro")) return basculerMicro();
    if (!sur(".cook-body")) return;
    const s = steps[cookIdx];
    const go = sur("[data-go]");
    if (go) {
      const x = (s.extras || []).find(y => y.id === go.dataset.go);
      if (x) lancer(go, x.id, () => startTimer(r, cookIdx, { ...x, repos: reposDeSupplement(x) }, x.id));
      return;
    }
    if (sur("#four-start")) {
      return lancer(sur("#four-start"), "prechauffage", () =>
        startTimer(r, cookIdx, { timer: prechauffage.duree, label: "Préchauffage du four", emoji: "🔥" }, "prechauffage"));
    }
    const stop = sur("[data-stop]");
    if (stop) return cancelTimer(stop.dataset.stop);
    const plus = sur("[data-plus]");
    if (plus) return ajouterMinute(plus.dataset.plus);
    const pause = sur("[data-pause]");
    if (pause) basculerPause(pause.dataset.pause);
  };
  app.addEventListener("click", surClic);

  /* ---------- Les zones de minuteur ---------- */

  /* Les zones sont réécrites à chaque geste de minuteur (« Pause » devient
     « Reprendre », « Arrêter » laisse place à « Minuteur… ») : le focus suit le
     contrôle équivalent de sa zone, ou à défaut le premier bouton de cette zone. */
  const drawZones = s => {
    const zone = document.activeElement && document.activeElement.closest("#timer-zone, .addon-timer, #four-zone");
    const repere = zone ? reperer(app, document.activeElement) : null;
    const reperZone = zone ? reperer(app, zone) : null;
    drawTimerZone(s); drawAddonZones(s); drawFourZone();
    rendreLeFocus(app, repere, () => {
      const nouvelle = reperZone && app.querySelector(reperZone);
      return nouvelle && nouvelle.querySelector("button");
    });
  };

  /* Le bouton qui lance un minuteur se transforme en anneau : le nouvel anneau part de la place et
     de la taille du bouton (une pastille aplatie) et s'arrondit en place, ressort vif ; le compte
     et les gestes arrivent un instant après. Rien en mouvement réduit. */
  const lancer = (bouton, slot, demarrer) => {
    const de = bouton && bouton.isConnected && !REDUCE_MOTION.matches ? bouton.getBoundingClientRect() : null;
    demarrer();
    drawZones(steps[cookIdx]);
    const t = findTimer(cleSeance, cookIdx, slot);
    const anneau = t && app.querySelector(`.cook-anneau[data-sonne="${t.id}"]`);
    if (!de || !anneau) return;
    const vers = anneau.getBoundingClientRect();
    if (!vers.width || !vers.height) return;
    anneau.style.transformOrigin = "0 0";
    animer(anneau, [
      { translate: `${de.left - vers.left}px ${de.top - vers.top}px`, scale: `${de.width / vers.width} ${de.height / vers.height}` },
      { translate: "0 0", scale: "1 1" }
    ], { easing: "ressort-vif", cle: "morphose", reprise: false }).then(() => { anneau.style.transformOrigin = ""; });
    anneau.parentElement.querySelectorAll(".cook-reste, .t-btn").forEach((e, i) => {
      e.style.setProperty("--i", i + 1);
      e.classList.add("arrive");
    });
  };

  /* Un supplément qui repose (`adds: "repos"`) est un repos comme une étape de repos. */
  const reposDeSupplement = x => estRepos(supplements.find(a => a.id === x.id)?.step);

  /* Ce qu'on attend, dit à l'œil : un repos (levée, marinade) a son icône, son nom — « Repos », ou
     celui de la recette — et dit qu'on peut s'éloigner ; le four a sa flamme. */
  const nomRepos = s => s.reposLabel || r.reposLabel || "Repos";

  /* Le compte à rebours et ses trois gestes : +1 min, pause / reprise, arrêt. Un minuteur qui
     sonne ne propose plus de pause, et son arrêt s'appelle « OK ». L'anneau qui se vide est à sa
     gauche ; le nom du repos et sa phrase sous le compte. */
  const controlesHtml = (t, compact, nom = "") => {
    const left = secondesRestantes(t);
    const done = estFini(t);
    const pause = t.reste != null;
    const four = t.slot === "prechauffage";
    const fond = done ? COCHE_PRET : t.repos ? ICON.zzz : four ? ICON.flame : ICON.timer;
    const genre = t.repos ? " repos" : four ? " four" : "";
    return `
      <span class="cook-anneau${genre}${compact ? " petit" : ""}${done ? " done" : ""}" data-sonne="${t.id}">${anneauHtml(t, fond)}</span>
      <span class="cook-reste">
        <span class="clock ${done ? "flash" : ""} ${pause ? "en-pause" : ""}" data-clock="${t.id}">${fmtClock(left)}</span>
        ${t.repos && nom && !compact ? `<span class="cook-rappel"><b>${esc(nom)}</b> · ${done ? "c'est prêt." : "tu peux t'éloigner, ça sonnera."}</span>` : ""}
      </span>
      <button type="button" class="t-btn" data-plus="${t.id}">+1 min</button>
      ${done ? "" : `<button type="button" class="t-btn" data-pause="${t.id}">${pause ? "Reprendre" : "Pause"}</button>`}
      <button type="button" class="t-btn" ${compact ? "" : 'id="timer-stop"'} data-stop="${t.id}">${done ? "OK" : "Arrêter"}</button>`;
  };

  const drawTimerZone = s => {
    const zone = document.getElementById("timer-zone");
    if (!zone) return;
    const t = findTimer(cleSeance, cookIdx);
    const repos = estRepos(s);
    zone.classList.toggle("repos", repos);
    if (t) {
      zone.innerHTML = controlesHtml(t, false, nomRepos(s));
    } else if (s.timer) {
      zone.innerHTML = `<button id="timer-start">${repos ? ICON.zzz : ICON.timer} Minuteur ${fmtTime(s.timer)}${repos ? ` <span class="cook-bouton-nom">· ${esc(nomRepos(s))}</span>` : ""}</button>`;
      document.getElementById("timer-start").addEventListener("click", e => {
        lancer(e.currentTarget, null, () => startTimer(r, cookIdx, { timer: s.timer, label: repos ? nomRepos(s) : s.t, repos }));
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
      const t = findTimer(cleSeance, cookIdx, x.id);
      const repos = reposDeSupplement(x);
      zone.innerHTML = t ? controlesHtml(t, true) : `<button data-go="${x.id}">${repos ? ICON.zzz : ICON.timer} Minuteur ${fmtTime(x.timer)}</button>`;
    }
  };

  /* Le bandeau du four : à l'étape d'où il faut le lancer pour qu'il soit chaud
     quand le plat y entrera. Son minuteur est un slot à part, comme un supplément ;
     sa flamme ondule tant qu'il chauffe. */
  const drawFourZone = () => {
    const zone = document.getElementById("four-zone");
    if (!zone) return;
    const t = findTimer(cleSeance, cookIdx, "prechauffage");
    zone.classList.toggle("chauffe", !!t && t.reste == null && !estFini(t));
    zone.innerHTML = t
      ? `<p><b>Préchauffage en cours</b> · ${prechauffage.temperature} °C</p><div class="cook-timer">${controlesHtml(t, true)}</div>`
      : `<p><b>Lance le préchauffage : ${prechauffage.temperature} °C</b></p>
         <button type="button" id="four-start">${ICON.flame} Minuteur ${prechauffage.duree} min</button>`;
  };

  draw();
}
