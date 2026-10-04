/* Le mode cuisine : une étape par écran, minuteurs, reprise là où l'on s'est arrêté. */

import { fmtClock, fmtTime, scaleText } from "../core/format.js";
import { ICON } from "../core/icones.js";
import { entreeCourante, portionsOf } from "../core/menu.js";
import { effectiveSteps, markCooked, verdictOf } from "../core/recettes.js";
import { cleCuisine, forgetCooking, noAutoResume, setCooking } from "../core/seance.js";
import {
  acquireWakeLock,
  cancelTimer,
  findTimer,
  libererVerrou,
  setRefreshZone,
  startTimer
} from "../ui/minuteurs.js";
import { shareRecipe } from "../ui/partage.js";
import { app, noterAdresseCourante, retourVers } from "../ui/routeur.js";
import { toast } from "../ui/toast.js";
import { extrasHtml } from "./fiche.js";
import { astuceHtml } from "./savoirs.js";

let cookIdx = 0;

export function stopCookMode() {
  libererVerrou();
  setRefreshZone(null);
  document.body.classList.remove("cooking");
}

/* `step` (facultatif, depuis l'adresse) ouvre directement l'étape voulue —
   c'est par là qu'une bulle de minuteur ramène à ce qui est en train de cuire. */
export function renderCook(r, step) {
  // La version composée (vinaigrette choisie, suppléments) dicte les étapes.
  const steps = effectiveSteps(r);
  // Les quantités citées dans les étapes suivent les portions réglées sur la fiche.
  const f = portionsOf(r) / r.portions.base;
  const at = parseInt(step, 10);
  cookIdx = Number.isInteger(at) ? Math.min(Math.max(at, 0), steps.length - 1) : 0;
  // On y revient de soi-même : la reprise automatique redevient légitime.
  const cleSeance = cleCuisine(r);
  const prefixeCook = entreeCourante() ? `#/recette/${r.id}/m/${entreeCourante()}` : `#/recette/${r.id}`;
  noAutoResume.delete(cleSeance);
  // Le changement de page est asynchrone : sans ce verrou, un double-tap sur
  // « Terminer » compterait la recette deux fois.
  let finished = false;
  acquireWakeLock();
  document.body.classList.add("cooking");
  const draw = () => {
    const s = steps[cookIdx];
    const last = cookIdx === steps.length - 1;
    if (!finished) {
      setCooking(cleSeance, cookIdx);
      // L'adresse suit l'étape sans encombrer l'historique : un rechargement,
      // ou une PWA fermée par iOS, retrouve ainsi la bonne étape.
      history.replaceState(history.state, "", `${prefixeCook}/cuisine/${cookIdx}`);
      noterAdresseCourante();
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
      noAutoResume.add(cleSeance);
      // Arrivé ici par un lien partagé, il n'y a rien derrière : revenir ferait
      // sortir du site. On va alors explicitement à la fiche.
      retourVers(prefixeCook);
    });
    document.getElementById("cook-share").addEventListener("click", () => shareRecipe(r.id));
    document.getElementById("prev").addEventListener("click", () => { if (cookIdx > 0) { cookIdx--; draw(); } });
    document.getElementById("next").addEventListener("click", () => {
      if (last) {
        if (finished) return;
        finished = true;
        const first = !verdictOf(r);
        markCooked(r.id);
        forgetCooking(cleSeance);
        location.hash = prefixeCook;
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
    setRefreshZone(() => drawZones(steps[cookIdx]));
  };

  const drawZones = s => { drawTimerZone(s); drawAddonZones(s); };

  const drawTimerZone = s => {
    const zone = document.getElementById("timer-zone");
    if (!zone) return;
    const t = findTimer(cleSeance, cookIdx);
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
      const t = findTimer(cleSeance, cookIdx, x.id);
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
