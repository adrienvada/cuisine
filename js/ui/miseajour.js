/* Enregistre le service worker et propose les mises à jour. */

import { toast } from "./toast.js";

/* Une nouvelle version s'installe en coulisse puis attend (sw.js n'appelle pas
   skipWaiting de lui-même) : on le dit, et c'est le bouton qui l'active. On
   recharge quand elle contrôle la page, jamais avant : recharger sous l'ancien
   service worker referait la même page. */
export async function surveillerMiseAJour() {
  const reg = await navigator.serviceWorker.register("sw.js");
  let demandee = false;

  const proposer = attente => toast("Nouvelle version", {
    action: "Recharger",
    // Assez long pour qu'on le voie en reprenant l'appli en main.
    duree: 30000,
    surAction: () => {
      demandee = true;
      attente.postMessage({ type: "activer" });
    }
  });

  // Au tout premier chargement il n'y a pas d'ancienne version : rien à proposer.
  const aUnControleur = () => !!navigator.serviceWorker.controller;

  if (reg.waiting && aUnControleur()) proposer(reg.waiting);
  reg.addEventListener("updatefound", () => {
    const neuf = reg.installing;
    neuf?.addEventListener("statechange", () => {
      if (neuf.state === "installed" && aUnControleur()) proposer(neuf);
    });
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (demandee) location.reload();
  });

  // Une appli installée reste ouverte des jours : le navigateur ne cherche une
  // version neuve qu'à l'ouverture d'une page, d'où cette vérification au retour.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    reg.update().catch(() => {});
    // Un autre message a pu recouvrir le toast pendant les 30 s : on le remontre.
    if (reg.waiting && aUnControleur()) proposer(reg.waiting);
  });
}
