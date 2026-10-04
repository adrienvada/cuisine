/* Aides des tests de synchro : un Supabase simulé qui contrôle les versions
   (carnet_ecrire à trois arguments), et un canal Realtime simulé.
   Rien ici n'appelle le vrai serveur : tout passe par page.route / routeWebSocket. */

import { createHash } from "node:crypto";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "POST, OPTIONS"
};

/* Le nom de canal que le client dérive du mot de passe (SHA-256 de « carnet: » collé au mot de passe). */
export const sujetDuCanal = mdp => "realtime:" + createHash("sha256").update("carnet:" + mdp).digest("hex");

/* Le serveur de test. Options :
     ancienne  — la migration SQL n'est pas passée : carnet_ecrire à trois arguments est introuvable (404).
   Propriétés : data, updated_at, ecritures (corps reçus), appels (nom + corps de chaque appel),
   lectures. `avantEcriture(fn)` : fn s'exécute une fois, juste avant le traitement de la prochaine
   écriture — c'est là qu'un test fait écrire « quelqu'un d'autre » en concurrence. */
export async function simulerServeur(context, donnees = null, { ancienne = false, mdp = null } = {}) {
  let n = 1;
  const horodatage = () => new Date(Date.UTC(2026, 0, 1, 0, 0, n)).toISOString();
  let avant = null;
  const serveur = {
    data: donnees,
    updated_at: donnees ? horodatage() : null,
    ancienne,
    ecritures: [],
    appels: [],
    lectures: 0,
    refus: 0,
    modifier(data) { n++; serveur.data = data; serveur.updated_at = horodatage(); },
    avantEcriture(fn) { avant = fn; }
  };
  await context.route("**/rest/v1/rpc/**", async route => {
    const requete = route.request();
    if (requete.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const nom = new URL(requete.url()).pathname.split("/").pop();
    const corps = JSON.parse(requete.postData() || "{}");
    serveur.appels.push({ nom, corps });
    const json = (status, valeur) => route.fulfill({ status, headers: CORS, contentType: "application/json", body: JSON.stringify(valeur) });
    if (mdp && corps.p_mdp !== mdp) return json(400, { message: "mot de passe incorrect" });
    if (nom === "carnet_lire") {
      serveur.lectures++;
      return json(200, serveur.data ? [{ data: serveur.data, updated_at: serveur.updated_at }] : []);
    }
    if (nom === "carnet_ecrire") {
      const nouvelle = "p_vu" in corps;
      if (nouvelle && serveur.ancienne) return json(404, { code: "PGRST202", message: "Could not find the function public.carnet_ecrire(p_data, p_mdp, p_vu) in the schema cache" });
      if (avant) { const fn = avant; avant = null; fn(serveur); }
      if (nouvelle && (corps.p_vu ?? null) !== (serveur.updated_at ?? null)) {
        serveur.refus++;
        return json(200, { ok: false, updated_at: serveur.updated_at });
      }
      n++;
      serveur.data = corps.p_data;
      serveur.updated_at = horodatage();
      serveur.ecritures.push(corps.p_data);
      return json(200, nouvelle ? { ok: true, updated_at: serveur.updated_at } : serveur.updated_at);
    }
    return json(404, {});
  });
  return serveur;
}

/* Le canal Realtime : intercepte le WebSocket, répond aux « phx_join » et aux
   « heartbeat » comme Supabase, note ce que le client envoie. `diffuser()` fait
   passer un « changé » venu d'un autre appareil ; `couper()` ferme la connexion ;
   `refuser = true` fait échouer les « phx_join » suivants. */
export async function simulerCanal(context) {
  const canal = {
    connexions: 0,
    joints: [],          // sujets rejoints
    recus: [],           // tout ce que le client a envoyé (objets décodés)
    battements: 0,
    refuser: false,
    sockets: [],
    diffuser() {
      for (const ws of canal.sockets.slice(-1)) {
        const sujet = canal.joints.at(-1);
        ws.send(JSON.stringify({ topic: sujet, event: "broadcast", payload: { type: "broadcast", event: "change", payload: {} }, ref: null }));
      }
    },
    couper() { for (const ws of canal.sockets.splice(0)) ws.close(); }
  };
  await context.routeWebSocket(/\/realtime\/v1\/websocket/, ws => {
    canal.connexions++;
    canal.sockets.push(ws);
    ws.onMessage(brut => {
      const m = JSON.parse(String(brut));
      canal.recus.push(m);
      if (m.event === "phx_join") {
        canal.joints.push(m.topic);
        const status = canal.refuser ? "error" : "ok";
        ws.send(JSON.stringify({ topic: m.topic, event: "phx_reply", payload: { status, response: {} }, ref: m.ref }));
      } else if (m.event === "heartbeat") {
        canal.battements++;
        ws.send(JSON.stringify({ topic: "phoenix", event: "phx_reply", payload: { status: "ok", response: {} }, ref: m.ref }));
      }
    });
  });
  return canal;
}

/* Un navigateur déjà connecté (mot de passe mémorisé), à jour du serveur. */
export const MDP = "secret";
