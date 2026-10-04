/* Aides communes aux tests de bout en bout.
   Règle de la maison : on ne touche jamais aux globales de js/app.js (state, save,
   route…) — elles disparaîtront avec le passage aux modules. On pré-remplit
   localStorage avant le chargement, puis on pilote l'interface comme le ferait
   un doigt. */

import { test as base, expect } from "@playwright/test";

export { expect };

const CLE_CARNET = "carnet-cuisine-v1";
const CLE_SYNC = "carnet-sync-v2";

/* Chaque test part de polices bloquées : le navigateur de test ne joint pas
   Google Fonts, et une requête qui traîne fausse les attentes. */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
    await use(context);
  }
});

/* Une entrée de menu telle que l'application la range. */
export const entree = (rid, { k, choices = {}, addons = [], portions = null } = {}) =>
  ({ k: k || "t" + rid.slice(0, 6).replace(/\W/g, ""), rid, choices, addons, portions });

/* Pré-remplit le stockage AVANT le chargement de la page, une seule fois par
   onglet : sessionStorage sert de garde, sans quoi chaque rechargement
   écraserait ce que le test vient de faire dans l'interface. */
export async function preremplir(context, { carnet, sync } = {}) {
  await context.addInitScript(({ cleCarnet, cleSync, carnet, sync }) => {
    try {
      if (sessionStorage.getItem("__preremplissage")) return;
      sessionStorage.setItem("__preremplissage", "1");
      if (carnet) localStorage.setItem(cleCarnet, JSON.stringify(carnet));
      if (sync) localStorage.setItem(cleSync, JSON.stringify(sync));
    } catch {}
  }, { cleCarnet: CLE_CARNET, cleSync: CLE_SYNC, carnet, sync });
}

/* Ce que l'application a rangé dans localStorage (lecture seule). */
export const lireCarnet = page =>
  page.evaluate(cle => JSON.parse(localStorage.getItem(cle) || "{}"), CLE_CARNET);

/* Supabase simulé : carnet_lire renvoie la version du « serveur », carnet_ecrire
   enregistre le corps reçu et répond par un nouvel horodatage. Le test lit les
   écritures reçues et peut remplacer la version serveur (une autre personne vient
   de modifier le carnet). */
export async function simulerSupabase(context, donneesInitiales = null) {
  let n = 1;
  const horodatage = () => new Date(Date.UTC(2026, 0, 1, 0, 0, n)).toISOString();
  const serveur = {
    data: donneesInitiales,
    updated_at: horodatage(),
    ecritures: [],
    lectures: 0,
    /* Une modification faite ailleurs : nouvelle version, nouvel horodatage. */
    modifier(data) { n++; serveur.data = data; serveur.updated_at = horodatage(); }
  };
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
    "access-control-allow-methods": "POST, OPTIONS"
  };
  await context.route("**/rest/v1/rpc/**", async route => {
    const requete = route.request();
    if (requete.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const nom = new URL(requete.url()).pathname.split("/").pop();
    if (nom === "carnet_lire") {
      serveur.lectures++;
      const corps = serveur.data ? [{ data: serveur.data, updated_at: serveur.updated_at }] : [];
      return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(corps) });
    }
    if (nom === "carnet_ecrire") {
      const recu = JSON.parse(requete.postData() || "{}");
      n++;
      serveur.data = recu.p_data;
      serveur.updated_at = horodatage();
      serveur.ecritures.push(recu.p_data);
      return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(serveur.updated_at) });
    }
    return route.fulfill({ status: 404, headers: cors, body: "" });
  });
  return serveur;
}

/* Mauvais réseau, côté serveur de test (cf. tests/serveur.mjs). À remettre à
   zéro en fin de test : `await reseau(baseURL)` sans réglage. */
export async function reseau(baseURL, { latence, bloque } = {}) {
  const q = new URLSearchParams();
  if (latence) q.set("latence", String(latence));
  if (bloque) q.set("bloque", "1");
  const res = await fetch(`${baseURL}/__reseau${q.size ? "?" + q : ""}`);
  return res.json();
}

/* Les articles cochés de la liste de courses, par clé. */
export const cochesAffichees = page =>
  page.$$eval("input[data-key]", els => els.filter(e => e.checked).map(e => e.dataset.key));
