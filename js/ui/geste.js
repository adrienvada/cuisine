/* Les gestes : glisser au doigt, relâcher avec un ressort, vibrer. Séparés de
   js/ui/mouvement.js pour que celui-ci reste léger (les vues qui n'ont pas de geste
   n'ont pas à charger ceci) : les feuilles, les toasts, le mode cuisine et les courses
   importent les deux. Mêmes règles : rien ne bouge en mouvement réduit, rien ne lève. */

import { PRESETS, REPLIS_RESSORT, ressort, resistance, vitesseDeGeste } from "../core/ressort.js";
import { animer, annuler, mouvementReduit } from "./mouvement.js";

const LINEAR_OK = typeof CSS !== "undefined" && !!CSS.supports?.("transition-timing-function", "linear(0, 1)");

/* ---------- glisser, relacher ---------- */

const traduction = el => {
  const [x, y] = (getComputedStyle(el).translate || "").split(" ");
  return { x: parseFloat(x) || 0, y: parseFloat(y) || 0 };
};

const ecrire = (el, { x, y }) => { el.style.translate = x || y ? `${x}px ${y}px` : ""; };

/* glisser(el, options) — un geste au doigt ou à la souris (Pointer Events) qui déplace
   `el` par sa propriété `translate`. L'appelant règle touch-action (pan-y pour un geste
   horizontal, pan-x pour un vertical, none pour libre) : le défilement du navigateur
   garde la main tant que le geste n'est pas verrouillé.
   Options :
   - axe : "x", "y" ou "xy" (défaut). Le geste démarre après `seuil` px (6) et se
     verrouille sur l'axe dominant : un mouvement plutôt vertical sur un axe "x" est
     rendu au défilement ;
   - limites : { x: [min, max], y: [min, max] } (ou [min, max] pour un axe unique, ou
     une fonction qui les renvoie, lue au début du geste), en px de translation ;
   - elastique (défaut true) : au-delà d'une limite le doigt ne suit plus qu'en
     partie, de moins en moins (portee : 300 px) ; false : le mouvement s'arrête net ;
   - appliquer (défaut true) : glisser écrit lui-même `translate` ; false : l'appelant
     le fait dans surDeplacement ;
   - surDebut({ x, y }), surDeplacement({ x, y, dx, dy }), surFin({ x, y, vx, vy,
     annule }) : x, y sont la translation (élastique comprise), dx, dy le déplacement
     brut du doigt depuis le verrouillage, vx, vy la vitesse du doigt au lâcher en px/s,
     estimée sur les 80 dernières ms (0 si le doigt s'est arrêté avant de lâcher).
   Au lâcher, l'élément reste où il est : l'appelant décide de la suite, en général
   relacher(el, cible, { x: vx, y: vy }). Un geste annulé (pointercancel, capture
   perdue) ramène l'élément à son point de départ avec un ressort, puis appelle surFin
   avec annule: true (pour que l'appelant défasse le reste : fond, classe).
   Rend { detruire() }. */
export function glisser(el, { axe = "xy", limites, elastique = true, portee = 300, seuil = 6, appliquer = true, surDebut, surDeplacement, surFin } = {}) {
  const ctl = new AbortController();
  const signal = ctl.signal;
  let g = null;
  const bornes = a => {
    const l = g.lim?.[a] ?? (axe === a ? g.lim : null);
    return Array.isArray(l) ? l : null;
  };
  const limiter = (v, a) => {
    if (axe !== "xy" && axe !== a) return 0;
    const l = bornes(a);
    if (!l) return v;
    if (v < l[0]) return elastique ? l[0] - resistance(l[0] - v, portee) : l[0];
    if (v > l[1]) return elastique ? l[1] + resistance(v - l[1], portee) : l[1];
    return v;
  };
  const position = e => ({ x: limiter(g.depart.x + e.clientX - g.x0, "x"), y: limiter(g.depart.y + e.clientY - g.y0, "y") });
  const fin = (e, annule) => {
    const geste = g;
    g = null;
    if (!geste.verrou) return;
    try { el.releasePointerCapture(geste.id); } catch {}
    // Un geste qui a déplacé quelque chose ne doit pas devenir un clic sur ce qu'il portait.
    const avaler = ev => { ev.stopPropagation(); ev.preventDefault(); };
    el.addEventListener("click", avaler, { capture: true, once: true });
    setTimeout(() => el.removeEventListener("click", avaler, { capture: true }), 0);
    const v = annule ? { x: 0, y: 0 } : vitesseDeGeste(geste.echantillons, e.timeStamp);
    if (annule && appliquer) relacher(el, geste.depart, { x: 0, y: 0 });
    surFin?.({ ...geste.dernier, vx: v.x, vy: v.y, annule });
  };
  el.addEventListener("pointerdown", e => {
    if (g || !e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
    g = { id: e.pointerId, x0: e.clientX, y0: e.clientY, verrou: false, echantillons: [], depart: { x: 0, y: 0 }, dernier: { x: 0, y: 0 } };
  }, { signal });
  el.addEventListener("pointermove", e => {
    if (!g || e.pointerId !== g.id) return;
    if (!g.verrou) {
      const dx = Math.abs(e.clientX - g.x0);
      const dy = Math.abs(e.clientY - g.y0);
      if (Math.max(dx, dy) < seuil) return;
      if ((axe === "x" && dy > dx) || (axe === "y" && dx > dy)) { g = null; return; }
      g.verrou = true;
      el.setPointerCapture(e.pointerId);
      // Le geste reprend un élément en plein relâchement là où il est, sans saut.
      g.depart = traduction(el);
      annuler(el, "relache");
      ecrire(el, g.depart);
      g.x0 = e.clientX;
      g.y0 = e.clientY;
      g.lim = typeof limites === "function" ? limites() : limites;
      g.dernier = { ...g.depart };
      surDebut?.({ ...g.depart });
    }
    const p = position(e);
    g.dernier = p;
    g.echantillons.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    if (g.echantillons.length > 12) g.echantillons.shift();
    if (appliquer) ecrire(el, p);
    surDeplacement?.({ ...p, dx: e.clientX - g.x0, dy: e.clientY - g.y0 });
  }, { signal });
  el.addEventListener("pointerup", e => { if (g && e.pointerId === g.id) fin(e, false); }, { signal });
  el.addEventListener("pointercancel", e => { if (g && e.pointerId === g.id) fin(e, true); }, { signal });
  el.addEventListener("lostpointercapture", e => { if (g?.verrou && e.pointerId === g.id) fin(e, true); }, { signal });
  return { detruire: () => ctl.abort() };
}

/* relacher(el, vers, vitesse, options) — termine un mouvement : `el` va de là où il est
   (animation en cours comprise) à `vers` ({ x, y } en px de translation, défaut 0, 0)
   avec un ressort dont la vitesse initiale est celle du doigt ({ x, y } en px/s, celle
   de surFin) : un lâcher rapide part plus vite. Options : ressort (« doux », « vif » par
   défaut, « rebond », ou { raideur, amortissement }), cle. L'état final est écrit dans
   `translate` (vide s'il est nul) ; la promesse se résout quand l'élément est posé. */
export function relacher(el, vers = { x: 0, y: 0 }, vitesse = { x: 0, y: 0 }, { ressort: reglage = "vif", cle = "relache" } = {}) {
  const de = traduction(el);
  const dx = vers.x - de.x;
  const dy = vers.y - de.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.5 || mouvementReduit()) { annuler(el, cle); ecrire(el, vers); return Promise.resolve(true); }
  // La vitesse utile est celle qui va VERS la cible, rapportée à la distance à parcourir.
  const v = (((vitesse.x || 0) * dx) + ((vitesse.y || 0) * dy)) / (dist * dist);
  const nom = typeof reglage === "string" ? reglage : null;
  const r = ressort({ ...(nom ? PRESETS[nom] : reglage), vitesse: v });
  ecrire(el, vers);
  return animer(el, [{ translate: `${de.x}px ${de.y}px` }], {
    cle, reprise: false, duree: r.duree, easing: LINEAR_OK || !nom ? r.lineaire : REPLIS_RESSORT[nom]
  });
}

/* ---------- vibrer ---------- */

const MOTIFS = { tic: [10], succes: [14, 50, 22], alerte: [70, 50, 70, 50, 140] };
const IMPULSIONS = { tic: 1, succes: 2, alerte: 3 };   // l'interrupteur d'iOS ne connaît qu'un tic
const CLE_VIBRATIONS = "vibrations";

/* Les vibrations sont une préférence de l'appareil (comme le thème), pas de l'état
   synchronisé : un téléphone vibre, pas la tablette de la cuisine. Activées par défaut. */
export function vibrationsActives() {
  try { return localStorage.getItem(CLE_VIBRATIONS) !== "0"; } catch { return true; }
}

export function reglerVibrations(oui) {
  try {
    if (oui) localStorage.removeItem(CLE_VIBRATIONS);
    else localStorage.setItem(CLE_VIBRATIONS, "0");
  } catch {}
}

let interrupteur = null;

/* Safari d'iOS 18 n'a pas navigator.vibrate, mais basculer un <input type="checkbox"
   switch"> par son <label> donne un tic haptique. Le couple est créé une fois, hors de
   la page (dans <head>, display: none, aria-hidden : ni vu, ni lu, ni focalisable), et
   ses événements s'arrêtent sur le label : aucun écouteur délégué de l'appli (routeur,
   feuilles, toast, réglages…) ne les voit. */
function ticIOS() {
  if (!interrupteur) {
    const label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    label.style.display = "none";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.tabIndex = -1;
    label.append(input);
    for (const type of ["click", "input", "change"]) label.addEventListener(type, e => e.stopPropagation());
    document.head.append(label);
    interrupteur = label;
  }
  interrupteur.click();
}

/* vibrer(motif) — « tic » (une validation : cocher, ajouter), « succes » (une réussite),
   « alerte » (un minuteur qui sonne). À appeler pendant un geste de l'utilisateur pour
   que le navigateur l'accepte. Ne lève jamais ; rien si les vibrations sont coupées ou
   la page cachée ; rend true si une vibration a été demandée. */
export function vibrer(motif = "tic") {
  try {
    if (!vibrationsActives() || document.visibilityState === "hidden") return false;
    const m = MOTIFS[motif] ? motif : "tic";
    if (typeof navigator.vibrate === "function") { navigator.vibrate(MOTIFS[m]); return true; }
    if (!(navigator.maxTouchPoints > 0)) return false;
    ticIOS();
    for (let i = 1; i < IMPULSIONS[m]; i++) setTimeout(() => { try { if (document.visibilityState !== "hidden") ticIOS(); } catch {} }, i * 120);
    return true;
  } catch {
    return false;
  }
}
