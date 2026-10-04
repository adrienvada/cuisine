/* Les minuteurs : plusieurs à la fois, persistés dans l'état, affichés dans le plateau, avec sonnerie et verrou d'écran. */

import { save, state } from "../core/etat.js";
import { fmtClock } from "../core/format.js";
import { ICON } from "../core/icones.js";
import { entreeCourante } from "../core/menu.js";
import { byId } from "../core/recettes.js";

/* ---------- Minuteurs multiples ----------
   Chaque minuteur est persisté dans l'état ({rid, step, label, emoji, end})
   et affiché partout via le plateau #timer-tray ; plusieurs peuvent tourner
   en parallèle pendant qu'on avance sur d'autres étapes. */

let tickInt = null, refreshZone = null;

/* Le mode cuisine y dépose de quoi redessiner sa zone de minuteur quand un
   compte à rebours s'arrête ailleurs (une bulle du plateau). */
export const setRefreshZone = fn => { refreshZone = fn; };

/* Une étape peut faire tourner plusieurs minuteurs : celui de l'étape elle-même
   (slot null) et celui de chaque supplément minuté (slot = son identifiant).
   Les minuteurs enregistrés avant cette notion n'ont pas de `slot` : lus comme
   null, ils restent ceux de leur étape. La clé est celle de la séance — l'entrée
   de menu s'il y en a une — sinon deux cakes au four partageraient leur compte
   à rebours. */
export const findTimer = (cle, step, slot = null) =>
  state.timers.find(t => (t.mk || t.rid) === cle && t.step === step && (t.slot || null) === slot);

export function startTimer(r, stepIdx, { timer, label, emoji }, slot = null) {
  state.timers.push({
    id: Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
    rid: r.id, mk: entreeCourante() || null, step: stepIdx, slot,
    label, emoji: emoji || r.emoji,
    end: Date.now() + timer * 60000, total: timer, fired: false
  });
  save(); drawTray(); ensureTick();
}

export function cancelTimer(id) {
  state.timers = state.timers.filter(t => t.id !== id);
  save(); drawTray();
  if (refreshZone) refreshZone();
  if (!state.timers.length && tickInt) { clearInterval(tickInt); tickInt = null; }
}

export function ensureTick() {
  if (!tickInt && state.timers.length) tickInt = setInterval(tick, 500);
}

export function tick() {
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

export function drawTray() {
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

let wakeLock = null;

export async function acquireWakeLock() {
  try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); } catch (e) {}
}

export function libererVerrou() {
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}

export function beep() {
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
