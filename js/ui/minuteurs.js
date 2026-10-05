/* Les minuteurs : plusieurs à la fois, persistés dans l'état, affichés dans le plateau, avec sonnerie répétée et verrou d'écran. */

import { depuisQuand, secondesRestantes } from "../core/cuisine.js";
import { save, state } from "../core/etat.js";
import { fmtClock } from "../core/format.js";
import { esc } from "../core/html.js";
import { ICON } from "../core/icones.js";
import { entreeCourante } from "../core/menu.js";
import { byId } from "../core/recettes.js";
import { annoncer } from "./annonces.js";
import { REDUCE_MOTION } from "./theme.js";
import { toast } from "./toast.js";

/* ---------- Minuteurs multiples ----------
   Chaque minuteur est persisté dans l'état ({rid, step, label, emoji, end}) et
   affiché partout via le plateau #timer-tray ; plusieurs peuvent tourner en
   parallèle pendant qu'on avance sur d'autres étapes. Un minuteur en pause
   n'a plus de fin : il garde `reste`, les millisecondes qu'il lui reste. */

let tickInt = null, refreshZone = null, etapeAffichee = null;

/* Le mode cuisine y dépose de quoi redessiner sa zone de minuteur quand un
   compte à rebours s'arrête ailleurs (une bulle du plateau). */
export const setRefreshZone = fn => { refreshZone = fn; };

/* L'étape que le mode cuisine affiche en grand : son compte à rebours est déjà
   sous les yeux, sa bulle ne ferait que le doubler (et le recouvrir). */
export function setEtapeAffichee(cle, step) {
  etapeAffichee = cle == null ? null : { cle, step };
  drawTray();
}

/* Une étape peut faire tourner plusieurs minuteurs : celui de l'étape elle-même
   (slot null) et celui de chaque supplément minuté (slot = son identifiant).
   Les minuteurs enregistrés avant cette notion n'ont pas de `slot` : lus comme
   null, ils restent ceux de leur étape. La clé est celle de la séance — l'entrée
   de menu s'il y en a une — sinon deux cakes au four partageraient leur compte
   à rebours. */
export const findTimer = (cle, step, slot = null) =>
  state.timers.find(t => (t.mk || t.rid) === cle && t.step === step && (t.slot || null) === slot);

/* Fini, c'est « plus rien à attendre » : un minuteur en pause n'est jamais fini. */
export const estFini = t => t.reste == null && secondesRestantes(t) === 0;

export function startTimer(r, stepIdx, { timer, label, emoji, repos }, slot = null) {
  // Le toucher qui lance le minuteur est le seul moment où le son est permis.
  debloquerAudio();
  state.timers.push({
    id: Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
    rid: r.id, mk: entreeCourante() || null, step: stepIdx, slot,
    label, emoji: emoji || r.emoji,
    end: Date.now() + timer * 60000, total: timer, fired: false,
    // Un repos se reconnaît dans le plateau (icône, respiration) sans relire la recette.
    ...(repos ? { repos: true } : {})
  });
  save(); drawTray(); ensureTick(); majVerrou();
}

const trouver = id => state.timers.find(t => t.id === id);

/* Un minuteur arrêté par erreur se rétablit tel quel, à sa place dans le plateau :
   la croix est juste sous le pouce, et un compte à rebours de 2 h ne se refait pas. */
export function cancelTimer(id) {
  const i = state.timers.findIndex(t => t.id === id);
  if (i === -1) return;
  const [t] = state.timers.splice(i, 1);
  const fini = estFini(t);
  arreterSonnerie(id);
  save(); drawTray(); majVerrou();
  if (refreshZone) refreshZone();
  if (!state.timers.length && tickInt) { clearInterval(tickInt); tickInt = null; }
  // Éteindre un minuteur qui sonne, c'est le « OK » : rien à rattraper.
  if (fini) return;
  toast("Minuteur arrêté", {
    action: "Annuler",
    surAction: () => {
      state.timers.splice(Math.min(i, state.timers.length), 0, t);
      save(); drawTray(); ensureTick(); majVerrou();
      if (refreshZone) refreshZone();
    }
  });
}

/* +1 min : sur un minuteur en cours elle s'ajoute à la fin ; sur un minuteur qui
   sonne, elle le relance pour une minute — le geste du « encore un peu ». */
export function ajouterMinute(id) {
  const t = trouver(id);
  if (!t) return;
  debloquerAudio();
  // Le temps roule : on garde ce qui était affiché, pour le rendre aux compteurs redessinés.
  const avant = relever(id);
  if (t.reste != null) t.reste += 60000;
  else if (estFini(t)) { t.end = Date.now() + 60000; t.fired = false; arreterSonnerie(id); }
  else t.end += 60000;
  t.total = (t.total || 0) + 1;
  save(); drawTray(); ensureTick(); majVerrou();
  if (refreshZone) refreshZone();
  sauter(id, avant);
}

/* « +1 » saute et le temps roule. Les compteurs sont redessinés par le geste : on
   leur remet l'ancien texte, puis on le fait rouler vers le nouveau. Les aides du
   mouvement se chargent à la demande (ce module est sur le chemin de l'accueil). */
const relever = id => [...document.querySelectorAll(`[data-clock="${id}"]`)].map(el => el.textContent);

function sauter(id, avant) {
  if (REDUCE_MOTION.matches) return;
  const horloges = [...document.querySelectorAll(`[data-clock="${id}"]`)];
  const boutons = [...document.querySelectorAll(`[data-plus="${id}"], .timer-pill[data-timer="${id}"] [data-act="plus"]`)];
  const apres = horloges.map(el => el.textContent);
  horloges.forEach((el, i) => { if (avant[i] != null) el.textContent = avant[i]; });
  import("./mouvement.js").then(m => {
    boutons.forEach(b => m.rebondir(b));
    horloges.forEach((el, i) => m.rouler(el, apres[i]));
  }).catch(() => horloges.forEach((el, i) => { el.textContent = apres[i]; }));
}

export function basculerPause(id) {
  const t = trouver(id);
  if (!t || estFini(t)) return;
  debloquerAudio();
  if (t.reste != null) { t.end = Date.now() + t.reste; delete t.reste; }
  else t.reste = Math.max(0, t.end - Date.now());
  save(); drawTray(); majVerrou();
  if (refreshZone) refreshZone();
}

export function ensureTick() {
  if (!tickInt && state.timers.length) tickInt = setInterval(tick, 500);
}

/* Prêts en arrière-plan : on ne les a ni vus ni entendus, on les annonce au retour. */
const aSignaler = new Set();

export function tick() {
  // Deux minuteurs qui finissent au même battement : une annonce en recouvre l'autre,
  // on n'en dit donc qu'une, qui les nomme tous.
  const prets = [];
  for (const t of state.timers) {
    const left = secondesRestantes(t);
    const fini = t.reste == null && left === 0;
    document.querySelectorAll(`[data-clock="${t.id}"]`).forEach(el => {
      // Un chiffre en train de rouler (+1 min) garde la main jusqu'au bout.
      if (el.querySelector(".rouler")) return;
      el.textContent = fini && (el.classList.contains("t-clock") || el.classList.contains("clock")) ? "Prêt !" : fmtClock(left);
    });
    majEtat(t, left, fini);
    if (fini && !t.fired) {
      t.fired = true; save();
      const retard = Date.now() - t.end;
      if (document.visibilityState === "hidden") aSignaler.add(t.id);
      else if (retard > 5000) annoncerPrets([t]);
      // Seule la voix prévient qui ne regarde pas l'écran (la bulle passe, elle, en « Prêt ! »).
      else prets.push(t);
      drawTray();
      if (refreshZone) refreshZone();
      // Après le redessin : la secousse porte sur la bulle et l'anneau tels qu'ils restent.
      sonner(t);
      if (!document.title.startsWith("⏰")) {
        const titreAvant = document.title;
        document.title = "⏰ C'est prêt !";
        // Le titre de la vue (posé par le routeur) revient, sauf si l'on a navigué entre-temps.
        setTimeout(() => { if (document.title.startsWith("⏰")) document.title = titreAvant; }, 5000);
      }
    }
  }
  if (prets.length === 1) annoncer(`Minuteur « ${prets[0].label} » prêt`);
  else if (prets.length) annoncer(`${prets.length} minuteurs prêts : ${prets.map(t => `« ${t.label} »`).join(", ")}`);
}

/* Ce que le compte à rebours dit à l'œil : les dix dernières secondes battent
   (classe .derniers) ; en mouvement réduit, où l'anneau ne tourne pas tout seul,
   c'est ici qu'on le fait avancer. */
function majEtat(t, left, fini) {
  const battent = !fini && t.reste == null && left <= 10;
  const reduit = REDUCE_MOTION.matches;
  const reste = t.reste ?? Math.max(0, t.end - Date.now());
  const total = Math.max(1, (t.total || 0) * 60000, reste);
  for (const el of document.querySelectorAll(`[data-sonne="${t.id}"]`)) {
    el.classList.toggle("derniers", battent);
    const anneau = reduit && (el.matches(".anneau") ? el : el.querySelector(".anneau"));
    if (anneau) anneau.style.setProperty("--debut", (1 - Math.min(1, reste / total)).toFixed(4));
  }
}

/* « Prêt depuis 3 min » : le minuteur a fini pendant qu'on regardait ailleurs. */
function annoncerPrets(liste) {
  const t = liste[0];
  const depuis = `Prêt depuis ${depuisQuand(Date.now() - t.end)}`;
  toast(liste.length > 1 ? `${liste.length} minuteurs prêts — ${depuis.toLowerCase()}` : `${depuis} — ${t.label}`, { duree: 6000 });
}

/* Revenu sur l'appli : l'écran se rallume, le son se reprend, et ce qui a fini
   entre-temps sonne tout de suite. */
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  majVerrou();
  reprendreAudio();
  tick();
  const prets = state.timers.filter(t => aSignaler.has(t.id) && estFini(t));
  aSignaler.clear();
  if (!prets.length) return;
  for (const t of prets) { arreterSonnerie(t.id); sonner(t); }
  annoncerPrets(prets);
});

/* ---------- Le plateau ---------- */

const ICONE_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';

/* Le plateau est réécrit à chaque geste : le doigt, lui, est resté sur la bulle. On
   note quel contrôle de quelle bulle avait le focus pour le rendre au même, refait.
   Déplacer le plateau (mode cuisine) lui fait aussi perdre le focus : le repère
   est alors pris avant le déplacement et attend le prochain dessin. */
let repereFocus = null;

function reperer(tray) {
  const el = document.activeElement;
  const pastille = el && tray.contains(el) ? el.closest("[data-timer]") : null;
  return pastille ? { id: pastille.dataset.timer, act: el.dataset.act || null } : null;
}

function rendreLeFocus(tray, repere) {
  if (!repere) return;
  const pastille = tray.querySelector(`[data-timer="${repere.id}"]`);
  if (!pastille) return;
  // Une bulle qui sonne n'a plus de pause : le focus passe au premier contrôle qui reste.
  const cible = (repere.act && pastille.querySelector(`[data-act="${repere.act}"]`)) || pastille.querySelector("button");
  if (cible) cible.focus({ preventScroll: true });
}

/* L'anneau d'un minuteur : un cercle qui se vide, en continu, sur le temps qui reste.
   Aucun redessin par seconde : une seule animation CSS (stroke-dashoffset, linéaire)
   dont la durée est le temps restant ; elle est recalculée à chaque dessin du plateau
   ou de la zone, ce qui la resynchronise. En pause elle est suspendue (.en-pause), en
   mouvement réduit elle ne tourne pas et c'est tick() qui la fait avancer. `fond` : ce
   qui se loge au centre (l'icône du minuteur, la coche de « Prêt ! »). */
export function anneauHtml(t, fond = ICON.timer, maintenant = Date.now()) {
  const reste = t.reste != null ? t.reste : Math.max(0, t.end - maintenant);
  const total = Math.max(1, (t.total || 0) * 60000, reste);
  const fraction = Math.min(1, reste / total);
  return `<span class="anneau${t.reste != null ? " en-pause" : ""}" aria-hidden="true" style="--debut:${(1 - fraction).toFixed(4)};--duree:${(reste / 1000).toFixed(1)}s"><svg class="cercle" viewBox="0 0 36 36"><circle class="piste" cx="18" cy="18" r="16"/><circle class="jauge" cx="18" cy="18" r="16" pathLength="1"/></svg>${fond}</span>`;
}

/* La coche de « Prêt ! », tracée à l'encre quand la bulle passe à l'état « sonne ». */
export const COCHE_PRET = '<svg class="coche trace" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

const estMasquee = t => !!etapeAffichee && (t.mk || t.rid) === etapeAffichee.cle && t.step === etapeAffichee.step;

/* Ce qui, d'une bulle, change son dessin : une bulle dont la signature ne bouge pas
   n'est pas touchée (son anneau continue, son arrivée n'est pas rejouée). */
const signature = t => JSON.stringify([t.label, t.emoji, t.end, t.reste ?? null, t.total, !!t.repos, estFini(t), estMasquee(t)]);

function bulleHtml(t) {
  const left = secondesRestantes(t);
  const done = estFini(t);
  const pause = t.reste != null;
  const r = byId(t.rid);
  const fond = done ? COCHE_PRET : t.repos ? ICON.zzz : ICON.timer;
  return `
      <button type="button" class="t-go"
        aria-label="Minuteur « ${esc(t.label)} »${r ? ` — revenir à l'étape de ${esc(r.title)}` : ""}">
        ${anneauHtml(t, fond)}
        <span class="t-label">${t.emoji} ${esc(t.label)}</span>
        <span class="t-clock" data-clock="${t.id}">${done ? "Prêt !" : fmtClock(left)}</span>
      </button>
      <button type="button" class="t-act t-plus" data-act="plus" aria-label="Ajouter une minute">+1</button>
      ${done ? "" : `<button type="button" class="t-act t-pause" data-act="pause"
        aria-label="${pause ? "Reprendre le minuteur" : "Mettre le minuteur en pause"}">${pause ? ICON.play : ICONE_PAUSE}</button>`}
      <button type="button" class="t-act t-x" data-act="stop"
        aria-label="${done ? "OK, couper la sonnerie" : "Arrêter le minuteur"}">${done ? "OK" : "✕"}</button>`;
}

const classesBulle = t => {
  const left = secondesRestantes(t);
  return ["timer-pill", estFini(t) && "done", t.reste != null && "en-pause", t.repos && "repos", estMasquee(t) && "masquee",
    t.reste == null && !estFini(t) && left <= 10 && "derniers"].filter(Boolean).join(" ");
};

/* FLIP sans dépendance : les bulles qui restent glissent de leur ancienne place à la
   nouvelle (translate, ressort vif). Écrit ici, avec Element.animate, parce que
   js/ui/mouvement.js n'est pas sur le chemin de l'accueil, où ce module se charge. */
function avecFlip(tray, muter) {
  const lire = () => [...tray.children].filter(e => !e.dataset.sortie && !e.classList.contains("masquee"));
  if (REDUCE_MOTION.matches || tray.hidden) return muter();
  const avant = new Map(lire().map(e => [e, e.getBoundingClientRect()]));
  muter();
  for (const e of lire()) {
    const p = avant.get(e);
    if (!p) continue;
    const d = e.getBoundingClientRect();
    const dx = p.left - d.left, dy = p.top - d.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
    e.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], {
      duration: 320, easing: getComputedStyle(document.documentElement).getPropertyValue("--ressort-vif").trim() || "ease-out"
    });
  }
}

/* Une bulle qui s'en va : elle est inerte et muette pour les lecteurs d'écran dès le
   début, s'efface, puis ses voisines viennent combler la place. */
function retirerBulle(tray, el) {
  if (el.dataset.sortie) return;
  if (REDUCE_MOTION.matches || el.classList.contains("masquee")) { el.remove(); return; }
  el.dataset.sortie = "1";
  el.inert = true;
  el.setAttribute("aria-hidden", "true");
  el.classList.add("sort");
  const fin = () => {
    // Rétablie entre-temps (« Annuler ») : la bulle reste.
    if (!el.isConnected || !el.dataset.sortie) return;
    avecFlip(tray, () => el.remove());
    // Le plateau ne se cache qu'une fois sa dernière bulle partie.
    if (!state.timers.length && !tray.querySelector(".sort")) tray.hidden = true;
  };
  el.addEventListener("animationend", fin, { once: true });
  setTimeout(fin, 400);
}

let dernierEmplacement = null, dejaDessine = false;

export function drawTray() {
  const tray = document.getElementById("timer-tray");
  if (!tray) return;
  const repere = repereFocus || reperer(tray);
  repereFocus = null;
  // Déplacé, le plateau voit ses animations CSS repartir de zéro : on redessine tout,
  // ce qui recale les anneaux sur le temps réellement restant.
  const deplace = placerPlateau(tray) || dernierEmplacement !== tray.parentNode;
  dernierEmplacement = tray.parentNode;
  // Au premier dessin (page ouverte avec des minuteurs en route) rien ne part de rien.
  const premier = !dejaDessine;
  dejaDessine = true;
  tray.hidden = !state.timers.length && !tray.querySelector(".sort");
  // Ce qui sonne passe devant : c'est ce qu'on doit voir et éteindre en premier.
  const ordre = [...state.timers].sort((a, b) => estFini(b) - estFini(a));
  // Un minuteur rétabli pendant que sa bulle s'efface (« Annuler ») la reprend telle quelle :
  // on n'en dessine pas une seconde à côté de celle qui part.
  for (const e of [...tray.children]) {
    if (e.dataset.sortie && state.timers.some(t => t.id === e.dataset.timer)) {
      delete e.dataset.sortie;
      e.inert = false;
      e.removeAttribute("aria-hidden");
      e.classList.remove("sort");
    }
  }
  const presentes = new Map([...tray.children].filter(e => !e.dataset.sortie).map(e => [e.dataset.timer, e]));
  avecFlip(tray, () => {
    let precedent = null;
    const suivant = e => { let n = e ? e.nextElementSibling : tray.firstElementChild; while (n && n.dataset.sortie) n = n.nextElementSibling; return n; };
    for (const t of ordre) {
      let el = presentes.get(t.id);
      presentes.delete(t.id);
      const sig = signature(t);
      if (!el) {
        el = document.createElement("div");
        el.dataset.timer = t.id;
        el.dataset.sonne = t.id;
        if (!premier) {
          el.classList.add("arrive-pill");
          el.addEventListener("animationend", e => { if (e.animationName === "pill-arrive") el.classList.remove("arrive-pill"); });
        }
      }
      if (el.dataset.sig !== sig || deplace) {
        el.dataset.sig = sig;
        const arrive = el.classList.contains("arrive-pill");
        el.className = classesBulle(t) + (arrive ? " arrive-pill" : "");
        el.innerHTML = bulleHtml(t);
      }
      if (el !== suivant(precedent)) tray.insertBefore(el, suivant(precedent));
      precedent = el;
    }
    for (const el of presentes.values()) retirerBulle(tray, el);
  });
  // Un plateau dont toutes les bulles sont masquées ne réserve aucune place.
  const visibles = state.timers.some(t => !estMasquee(t));
  document.body.classList.toggle("avec-minuteurs", visibles);
  rendreLeFocus(tray, repere);
}

/* En mode cuisine le plateau a sa place dans la mise en page, entre l'étape et
   les boutons ; ailleurs il flotte sur <body>. Il change de maison sans être
   recréé, pour garder ses écouteurs. */
function placerPlateau(tray) {
  const zone = document.getElementById("plateau-cuisine");
  const cible = zone || document.body;
  if (tray.parentNode === cible) return false;
  repereFocus = repereFocus || reperer(tray);
  cible.appendChild(tray);
  return true;
}

/* Avant de redessiner l'écran de cuisine (ou d'en sortir), le plateau retourne
   sur <body> : il serait sinon emporté avec la zone qui le porte. */
export function libererPlateau() {
  const zone = document.getElementById("plateau-cuisine");
  if (zone) zone.removeAttribute("id");
  const tray = document.getElementById("timer-tray");
  if (tray && tray.parentNode !== document.body) { repereFocus = repereFocus || reperer(tray); document.body.appendChild(tray); }
}

/* Les trois gestes de la bulle (+1, pause, croix) n'ont pas à ramener à l'étape :
   on les traite avant le gestionnaire de la bulle, qui s'occupe du reste. */
const plateau = document.getElementById("timer-tray");
if (plateau) {
  plateau.addEventListener("click", e => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const id = b.closest("[data-timer]").dataset.timer;
    e.stopPropagation();
    if (b.dataset.act === "plus") ajouterMinute(id);
    else if (b.dataset.act === "pause") basculerPause(id);
    else cancelTimer(id);
  }, true);
}

/* ---------- Verrou d'écran ----------
   L'écran reste allumé tant qu'on cuisine ou qu'un minuteur tourne ou sonne —
   pas seulement dans le mode cuisine : on peut surveiller un four depuis la
   fiche. Le système reprend le verrou dès que la page passe en arrière-plan ;
   `majVerrou` le redemande au retour. */

let wakeLock = null, demandeEnCours = false;

const verrouNecessaire = () => document.body.classList.contains("cooking") ||
  state.timers.some(t => t.reste == null && (!estFini(t) || sonneries.has(t.id)));

export async function acquireWakeLock() {
  if (wakeLock || demandeEnCours || !("wakeLock" in navigator)) return;
  demandeEnCours = true;
  try {
    const verrou = await navigator.wakeLock.request("screen");
    wakeLock = verrou;
    verrou.addEventListener("release", () => { if (wakeLock === verrou) wakeLock = null; });
  } catch (e) {}
  demandeEnCours = false;
}

function majVerrou() {
  if (verrouNecessaire()) acquireWakeLock();
  else if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}

/* Quitter le mode cuisine ne relâche le verrou que si un minuteur n'en a plus besoin. */
export const libererVerrou = majVerrou;

/* ---------- Son ----------
   iOS ne laisse sonner qu'un AudioContext réveillé par un geste de l'utilisateur,
   et un minuteur sonne bien plus tard que le toucher qui l'a lancé : il n'y en
   a donc qu'un seul pour toute l'appli, créé ou repris pendant ce toucher. */

let ctxAudio = null;

function contexteAudio() {
  if (!ctxAudio) {
    const Contexte = window.AudioContext || window.webkitAudioContext;
    if (Contexte) ctxAudio = new Contexte();
  }
  return ctxAudio;
}

/* Le navigateur ne laisse ni sonner ni vibrer avant un premier toucher : une page
   rouverte avec un minuteur échu resterait muette, et chaque tentative écrirait une
   erreur dans la console. Sans API de suivi, on suppose le geste fait. */
const gestePermis = () => !navigator.userActivation || navigator.userActivation.hasBeenActive;

function reprendreAudio(geste = false) {
  if (ctxAudio && ctxAudio.state !== "running" && (geste || gestePermis())) ctxAudio.resume().catch(() => {});
}

function debloquerAudio() {
  try {
    // Sans cela, iOS fait taire la sonnerie quand le téléphone est en silencieux.
    if (navigator.audioSession) navigator.audioSession.type = "playback";
    const ctx = contexteAudio();
    if (!ctx) return;
    reprendreAudio(true);
    // Un son muet d'un échantillon, joué pendant le geste : c'est lui qui déverrouille iOS.
    const source = ctx.createBufferSource();
    source.buffer = ctx.createBuffer(1, 1, 22050);
    source.connect(ctx.destination);
    source.start(0);
  } catch (e) {}
}

function beep(premiere = false) {
  try {
    const ctx = gestePermis() ? contexteAudio() : null;
    if (ctx) {
      reprendreAudio();
      [0, 0.35, 0.7].forEach(t => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.value = 880;
        o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.4, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.3);
      });
    }
  } catch (e) {}
  // Une seule vibration, à l'échéance : la sonnerie répétée ne doit pas devenir un bourdonnement.
  if (premiere && gestePermis()) import("./geste.js").then(g => g.vibrer("alerte")).catch(() => {});
}

/* La sonnerie secoue la bulle (ou, dans l'étape affichée, l'anneau) : une secousse
   brève à chaque reprise du son, jamais une agitation continue. Rien en mouvement
   réduit : l'état « sonne » se lit à la couleur et au texte. */
function secouerBulle(id) {
  if (REDUCE_MOTION.matches) return;
  const cibles = [...document.querySelectorAll(`.timer-pill[data-timer="${id}"], .cook-anneau[data-sonne="${id}"]`)]
    .filter(el => el.getClientRects().length);
  if (!cibles.length) return;
  import("./mouvement.js").then(m => cibles.forEach(el => m.animer(el, [
    { rotate: "0deg" }, { rotate: "-3.5deg", offset: 0.18 }, { rotate: "3deg", offset: 0.38 },
    { rotate: "-2deg", offset: 0.58 }, { rotate: "1deg", offset: 0.78 }, { rotate: "0deg" }
  ], { cle: "sonne", duree: 520, easing: "standard", reprise: false }))).catch(() => {});
}

/* ---------- Sonnerie ----------
   Elle se répète toutes les 2 s jusqu'à ce qu'on l'arrête (« OK » sur la bulle
   ou dans l'étape), et s'éteint d'elle-même au bout de 2 min : une cuisine vide
   ne doit pas sonner indéfiniment. */

const DUREE_SONNERIE = 2 * 60 * 1000;
const sonneries = new Map();

export function sonner(t) {
  if (sonneries.has(t.id)) return;
  beep(true);
  secouerBulle(t.id);
  sonneries.set(t.id, {
    relance: setInterval(() => { beep(); secouerBulle(t.id); }, 2000),
    fin: setTimeout(() => arreterSonnerie(t.id), DUREE_SONNERIE)
  });
  majVerrou();
}

function arreterSonnerie(id) {
  const s = sonneries.get(id);
  if (!s) return;
  clearInterval(s.relance);
  clearTimeout(s.fin);
  sonneries.delete(id);
  majVerrou();
}

/* Page rouverte avec des minuteurs en route (iOS ferme volontiers une PWA) : aucun
   toucher n'a encore réveillé le son. Le premier doigt posé sur l'écran s'en charge,
   sans quoi la sonnerie resterait muette. */
document.addEventListener("pointerdown", () => {
  if (state.timers.length && (!ctxAudio || ctxAudio.state !== "running")) debloquerAudio();
}, { passive: true });

/* ---------- Au démarrage ----------
   Un minuteur déjà en route (page rouverte) a besoin du verrou dès le départ. */
majVerrou();
