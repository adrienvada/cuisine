/* Les minuteurs : plusieurs à la fois, persistés dans l'état, affichés dans le plateau, avec sonnerie répétée et verrou d'écran. */

import { depuisQuand, secondesRestantes } from "../core/cuisine.js";
import { save, state } from "../core/etat.js";
import { fmtClock } from "../core/format.js";
import { esc } from "../core/html.js";
import { ICON } from "../core/icones.js";
import { entreeCourante } from "../core/menu.js";
import { byId } from "../core/recettes.js";
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

export function startTimer(r, stepIdx, { timer, label, emoji }, slot = null) {
  // Le toucher qui lance le minuteur est le seul moment où le son est permis.
  debloquerAudio();
  state.timers.push({
    id: Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
    rid: r.id, mk: entreeCourante() || null, step: stepIdx, slot,
    label, emoji: emoji || r.emoji,
    end: Date.now() + timer * 60000, total: timer, fired: false
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
  if (t.reste != null) t.reste += 60000;
  else if (estFini(t)) { t.end = Date.now() + 60000; t.fired = false; arreterSonnerie(id); }
  else t.end += 60000;
  t.total = (t.total || 0) + 1;
  save(); drawTray(); ensureTick(); majVerrou();
  if (refreshZone) refreshZone();
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
  for (const t of state.timers) {
    const left = secondesRestantes(t);
    const fini = t.reste == null && left === 0;
    document.querySelectorAll(`[data-clock="${t.id}"]`).forEach(el => {
      el.textContent = fini && el.classList.contains("t-clock") ? "Prêt !" : fmtClock(left);
    });
    if (fini && !t.fired) {
      t.fired = true; save();
      const retard = Date.now() - t.end;
      if (document.visibilityState === "hidden") aSignaler.add(t.id);
      else if (retard > 5000) annoncerPrets([t]);
      sonner(t);
      drawTray();
      if (refreshZone) refreshZone();
      document.title = "⏰ C'est prêt !";
      setTimeout(() => { document.title = "Carnet de cuisine"; }, 5000);
    }
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

export function drawTray() {
  const tray = document.getElementById("timer-tray");
  if (!tray) return;
  placerPlateau(tray);
  tray.hidden = !state.timers.length;
  tray.innerHTML = state.timers.map(t => {
    const left = secondesRestantes(t);
    const done = estFini(t);
    const pause = t.reste != null;
    const masquee = etapeAffichee && (t.mk || t.rid) === etapeAffichee.cle && t.step === etapeAffichee.step;
    const r = byId(t.rid);
    return `<div class="timer-pill ${done ? "done" : ""} ${pause ? "en-pause" : ""} ${masquee ? "masquee" : ""}" data-timer="${t.id}">
      <button type="button" class="t-go"
        aria-label="Minuteur « ${esc(t.label)} »${r ? ` — revenir à l'étape de ${esc(r.title)}` : ""}">
        ${ICON.timer}
        <span class="t-label">${t.emoji} ${esc(t.label)}</span>
        <span class="t-clock" data-clock="${t.id}">${done ? "Prêt !" : fmtClock(left)}</span>
      </button>
      <button type="button" class="t-act t-plus" data-act="plus" aria-label="Ajouter une minute">+1</button>
      ${done ? "" : `<button type="button" class="t-act t-pause" data-act="pause"
        aria-label="${pause ? "Reprendre le minuteur" : "Mettre le minuteur en pause"}">${pause ? ICON.play : ICONE_PAUSE}</button>`}
      <button type="button" class="t-act t-x" data-act="stop"
        aria-label="${done ? "OK, couper la sonnerie" : "Arrêter le minuteur"}">${done ? "OK" : "✕"}</button>
    </div>`;
  }).join("");
  // Un plateau dont toutes les bulles sont masquées ne réserve aucune place.
  const visibles = state.timers.some(t => !(etapeAffichee && (t.mk || t.rid) === etapeAffichee.cle && t.step === etapeAffichee.step));
  document.body.classList.toggle("avec-minuteurs", visibles);
}

/* En mode cuisine le plateau a sa place dans la mise en page, entre l'étape et
   les boutons ; ailleurs il flotte sur <body>. Il change de maison sans être
   recréé, pour garder ses écouteurs. */
function placerPlateau(tray) {
  const zone = document.getElementById("plateau-cuisine");
  const cible = zone || document.body;
  if (tray.parentNode !== cible) cible.appendChild(tray);
}

/* Avant de redessiner l'écran de cuisine (ou d'en sortir), le plateau retourne
   sur <body> : il serait sinon emporté avec la zone qui le porte. */
export function libererPlateau() {
  const zone = document.getElementById("plateau-cuisine");
  if (zone) zone.removeAttribute("id");
  const tray = document.getElementById("timer-tray");
  if (tray && tray.parentNode !== document.body) document.body.appendChild(tray);
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

export function majVerrou() {
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

function reprendreAudio() {
  if (ctxAudio && ctxAudio.state !== "running") ctxAudio.resume().catch(() => {});
}

export function debloquerAudio() {
  try {
    // Sans cela, iOS fait taire la sonnerie quand le téléphone est en silencieux.
    if (navigator.audioSession) navigator.audioSession.type = "playback";
    const ctx = contexteAudio();
    if (!ctx) return;
    reprendreAudio();
    // Un son muet d'un échantillon, joué pendant le geste : c'est lui qui déverrouille iOS.
    const source = ctx.createBufferSource();
    source.buffer = ctx.createBuffer(1, 1, 22050);
    source.connect(ctx.destination);
    source.start(0);
  } catch (e) {}
}

export function beep() {
  try {
    const ctx = contexteAudio();
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
  if (navigator.vibrate) navigator.vibrate([300, 120, 300, 120, 500]);
}

/* ---------- Sonnerie ----------
   Elle se répète toutes les 2 s jusqu'à ce qu'on l'arrête (« OK » sur la bulle
   ou dans l'étape), et s'éteint d'elle-même au bout de 2 min : une cuisine vide
   ne doit pas sonner indéfiniment. */

const DUREE_SONNERIE = 2 * 60 * 1000;
const sonneries = new Map();

export function sonner(t) {
  if (sonneries.has(t.id)) return;
  beep();
  sonneries.set(t.id, {
    relance: setInterval(beep, 2000),
    fin: setTimeout(() => arreterSonnerie(t.id), DUREE_SONNERIE)
  });
  majVerrou();
}

export function arreterSonnerie(id) {
  const s = sonneries.get(id);
  if (!s) return;
  clearInterval(s.relance);
  clearTimeout(s.fin);
  sonneries.delete(id);
  majVerrou();
}

/* ---------- Au démarrage ----------
   Un minuteur déjà en route (page rouverte) a besoin du verrou dès le départ. */
majVerrou();
