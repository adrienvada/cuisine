/* Synchronisation du carnet entre appareils.
   Une seule base partagée, protégée par un mot de passe vérifié côté serveur : on le
   saisit une fois par appareil. Sans dépendance : des appels REST, et un canal
   Realtime (WebSocket, protocole Phoenix minimal) qui avertit les autres appareils
   qu'il y a quelque chose à relever.

   Chaque appareil garde la dernière version serveur qu'il connaît (la « base »).
   Rien ne part tant que l'état synchronisé ne diffère pas d'elle ; à l'envoi, on
   relit le serveur, on fusionne base / local / serveur champ par champ
   (js/core/fusion.js), puis on écrit en précisant la version qu'on a vue : si
   quelqu'un a écrit entre-temps, le serveur refuse et on recommence. */

import { CHAMPS_SYNCHRO as CHAMPS, fusionner, memesDonnees } from "./core/fusion.js";
import { STORE_KEY, state, surSauvegarde } from "./core/etat.js";
import { normaliserEtat } from "./core/sauvegarde.js";
import { feuilleOuverte, fermerFeuille, ouvrirFeuille } from "./ui/feuilles.js";
import { allerEnRemplacant, route } from "./ui/routeur.js";
import { toast, updateBadge } from "./ui/toast.js";

const CLE = "carnet-sync-v2";
/* Au-delà, une requête (ou l'ouverture du canal) est tenue pour perdue : réseau
   captif, lie-fi… Sans cette limite, une promesse suspendue garderait `enCours`
   ou `releve` vrais, et plus rien ne partirait. */
const DELAI_RESEAU = 15000;
const cfg = typeof SYNC_CONFIG !== "undefined" ? SYNC_CONFIG : { url: "", anonKey: "" };
const dispo = !!(cfg.url && cfg.anonKey);

const lire = () => { try { return JSON.parse(localStorage.getItem(CLE)) || {}; } catch { return {}; } };
const ecrire = o => { try { localStorage.setItem(CLE, JSON.stringify(o)); } catch {} };
const copie = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

/* local : { mdp, vu, base } — vu : horodatage de la dernière version serveur
   connue, base : son contenu. Une base absente (appareil connecté avant cette
   version) se rattrape à la première relève. */
let local = lire();
let sale = false;                 // modifications locales pas encore envoyées
let envoiH = null, enCours = false, releve = false, releverEncore = false;
let ecritures = 0;                // compte nos écritures : une relève démarrée avant l'une d'elles est périmée
let derniereReleve = 0;
let dernierInstantane = null;     // évite de recomparer un état qui n'a pas bougé
let demarre = false;
let ancienneFonction = false;     // le serveur n'a pas encore carnet_ecrire à trois arguments
let etat = local.mdp ? "attente" : "off";   // off | attente | ok | hors
const abonnes = new Set();

class MdpRefuse extends Error {}
class FonctionAbsente extends Error {}

function etatVers(e) {
  if (etat === e) return;
  etat = e;
  if (typeof document !== "undefined") document.documentElement.dataset.synchro = e;
  for (const fn of abonnes) { try { fn(e); } catch {} }
}

/* Demande au navigateur de ne pas effacer le mot de passe mémorisé quand il fait
   du ménage : on ne se connecte qu'une fois par appareil. */
const garder = () => { try { navigator.storage?.persist?.(); } catch {} };

async function rpc(nom, corps, mdp = local.mdp) {
  /* Ancienne clé « anon » = un JWT (eyJ…), à doubler en Bearer ; nouvelle clé
     « publishable » (sb_publishable_…) : en-tête apikey seul. */
  const headers = { apikey: cfg.anonKey, "Content-Type": "application/json" };
  if (cfg.anonKey.startsWith("eyJ")) headers.Authorization = `Bearer ${cfg.anonKey}`;
  const ctl = new AbortController();
  const limite = setTimeout(() => ctl.abort(), DELAI_RESEAU);   // l'abandon tombe dans les catch comme une panne : hors ligne, nouvel essai
  try {
    const res = await fetch(`${cfg.url}/rest/v1/rpc/${nom}`, { method: "POST", headers, body: JSON.stringify({ p_mdp: mdp, ...corps }), signal: ctl.signal });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (txt.includes("mot de passe incorrect")) throw new MdpRefuse();
      // PostgREST répond 404 quand aucune fonction ne porte ce nom et ces arguments.
      throw res.status === 404 ? new FonctionAbsente(nom) : new Error(nom + " " + res.status);
    }
    return await res.json();                                    // la limite couvre aussi la lecture du corps
  } finally {
    clearTimeout(limite);
  }
}

const instantane = () => {
  const o = {};
  for (const c of CHAMPS) if (state[c] !== undefined) o[c] = state[c];
  return o;
};

/* ---------- appliquer ce qui vient d'ailleurs ---------- */

function saisieEnCours() {
  const a = document.activeElement;
  return !!a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable);
}

/* La vue se redessine sur place, sans revenir en haut ; mais jamais sous les
   doigts de quelqu'un qui tape, ni derrière une feuille ouverte (route() la
   fermerait) : on réessaie un peu plus tard. */
let redessinH = null;
function redessiner() {
  clearTimeout(redessinH);
  updateBadge();
  const h = location.hash || "#/";
  if (h !== "#/menu" && h !== "#/courses") return;
  if (saisieEnCours() || feuilleOuverte()) { redessinH = setTimeout(redessiner, 600); return; }
  route({ garderDefilement: true });
}

/* Les champs que l'état porte toujours (des listes et des dictionnaires que les
   vues lisent sans précaution) : retirés par l'autre appareil, ils reviennent
   vides plutôt qu'absents. Les autres (repas, historique, journal…) sont
   facultatifs et se retirent pour de bon. */
const VIDE_DE = { menu: [], extras: [], checked: {}, notes: {}, cooked: {} };

/* Remplace dans l'état les champs synchronisés par `donnees` ; rend vrai si
   quelque chose a changé. Pas de save() : ce n'est pas une modification locale. */
function appliquer(donnees, { retirer = true } = {}) {
  /* Ce qui vient d'un autre appareil peut être d'une autre version, ou abîmé :
     comme pour un fichier importé, on écarte entrée par entrée ce qui est mal
     formé. Un champ inutilisable est absent du résultat normalisé, donc laissé
     tel quel ici. */
  const propre = normaliserEtat(donnees, { appareil: false });
  let change = false;
  for (const c of CHAMPS) {
    if (propre[c] === undefined) {
      /* Absent des données brutes (et non seulement écarté par la normalisation) :
         la fusion ne l'omet que si un appareil l'a supprimé — « Vider le menu »
         puis « Annuler » retire l'historique. Le garder ici le renverrait au serveur.
         `retirer: false` pour des données qui ne sont pas une fusion (rejoindre un
         carnet : il n'a pas de journal, l'appareil garde le sien). */
      if (!retirer || c in donnees || state[c] === undefined) continue;
      const vide = structuredClone(VIDE_DE[c]);
      if (memesDonnees({ [c]: state[c] }, { [c]: vide })) continue;
      if (vide === undefined) delete state[c]; else state[c] = vide;
      change = true;
      continue;
    }
    if (memesDonnees({ [c]: state[c] }, { [c]: propre[c] })) continue;
    state[c] = propre[c];
    change = true;
  }
  if (!change) return false;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
  dernierInstantane = null;
  redessiner();
  document.dispatchEvent(new CustomEvent("carnet-synchro"));
  return true;
}

function retenir(data, vu) {
  local.base = copie(data) ?? {};
  local.vu = vu;
  ecrire(local);
  dernierInstantane = null;
}

function refuse() {
  deconnecterLocal();
  toast("Mot de passe refusé : synchronisation arrêtée");
}

/* ---------- relever ---------- */

async function tirer() {
  if (!dispo || !local.mdp) return;
  if (enCours || releve) { releverEncore = true; return; }   // une relève ou un envoi tourne : on repassera
  releve = true;
  const avant = ecritures, mdp = local.mdp;
  try {
    const lignes = await rpc("carnet_lire", {}, mdp);
    /* Déconnecté, reconnecté à un autre carnet (la réponse ne vient pas du bon),
       ou un envoi est passé entre-temps. */
    if (local.mdp !== mdp || avant !== ecritures) return;
    derniereReleve = Date.now();
    etatVers("ok");
    const serveur = lignes[0];
    if (!serveur) { if (local.vu == null || local.base === undefined) { local.base = {}; ecrire(local); } }   // base vide : le local l'amorcera
    else if (serveur.updated_at !== local.vu || local.base === undefined) {
      appliquer(fusionner(local.base, instantane(), serveur.data));
      retenir(serveur.data, serveur.updated_at);
    }
    verifierEnvoi();
  } catch (e) {
    if (e instanceof MdpRefuse) refuse(); else etatVers("hors");
  } finally {
    releve = false;
    if (releverEncore) { releverEncore = false; tirer(); }
  }
}

/* ---------- envoyer ---------- */

const MAX_ESSAIS = 3;

/* Écrit `data` si le serveur est encore à la version `vu`. Rend { ok, updated_at }. */
async function ecrireVersServeur(data, vu, mdp) {
  if (!ancienneFonction) {
    try {
      const r = await rpc("carnet_ecrire", { p_data: data, p_vu: vu }, mdp);
      return typeof r === "string" ? { ok: true, updated_at: r } : r;
    } catch (e) {
      if (!(e instanceof FonctionAbsente)) throw e;
      ancienneFonction = true;                                // migration SQL pas encore passée
    }
  }
  /* Ancienne fonction : elle écrit sans rien vérifier. On relit juste avant,
     ce qui réduit la fenêtre sans la fermer. */
  const lignes = await rpc("carnet_lire", {}, mdp);
  const actuel = lignes[0]?.updated_at ?? null;
  if (actuel !== (vu ?? null)) return { ok: false, updated_at: actuel };
  return { ok: true, updated_at: await rpc("carnet_ecrire", { p_data: data }, mdp) };
}

async function pousser() {
  if (!dispo || !local.mdp) return;
  clearTimeout(envoiH);
  if (enCours) { sale = true; return; }
  enCours = true;
  let retard = null;
  const mdp = local.mdp;          // l'envoi appartient à ce carnet : si on en change en route, il s'arrête
  try {
    let fait = false;
    for (let essai = 0; essai < MAX_ESSAIS && !fait; essai++) {
      const lignes = await rpc("carnet_lire", {}, mdp);
      if (local.mdp !== mdp) return;
      const serveur = lignes[0] || null;
      const envoye = instantane();
      const fusion = fusionner(local.base, envoye, serveur?.data);
      if (serveur && memesDonnees(fusion, serveur.data)) {    // rien à ajouter à ce que dit le serveur
        appliquer(fusionner(envoye, instantane(), fusion));
        retenir(serveur.data, serveur.updated_at);
        sale = false;
        fait = true;
        etatVers("ok");
        break;
      }
      const r = await ecrireVersServeur(fusion, serveur?.updated_at ?? null, mdp);
      if (local.mdp !== mdp) return;
      if (!r.ok) continue;                                    // quelqu'un a écrit entre-temps : on relit et on refusionne
      ecritures++;
      /* L'état a pu bouger pendant l'aller-retour : ce qui s'est ajouté ici
         depuis l'envoi est conservé, ce qui vient d'ailleurs est repris. */
      appliquer(fusionner(envoye, instantane(), fusion));
      retenir(fusion, r.updated_at);
      sale = false;
      fait = true;
      etatVers("ok");
      diffuser();
    }
    if (!fait) retard = 3000;                                 // conflits à répétition : on laisse souffler
    else etatVers("ok");
  } catch (e) {
    if (e instanceof MdpRefuse) refuse();
    else { sale = true; etatVers("hors"); retard = 15000; }   // hors ligne : on réessaie
  } finally {
    enCours = false;
  }
  if (retard) envoiH = setTimeout(pousser, retard);
  else verifierEnvoi();                                       // une modification est arrivée pendant l'envoi
  if (releverEncore && !retard) { releverEncore = false; tirer(); }
}

function programmer() {
  sale = true;
  clearTimeout(envoiH);
  envoiH = setTimeout(pousser, 800);
}

/* Programme un envoi seulement si l'état synchronisé diffère de la base. */
function verifierEnvoi() {
  if (!dispo || !local.mdp) return;
  if (memesDonnees(instantane(), local.base)) { sale = false; return; }
  programmer();
}

/* Abonné à save() : on l'appelle pour tout (recherche, étape de cuisine,
   minuteurs…) ; seul un champ synchronisé qui a bougé déclenche un envoi. */
function auChangement() {
  if (!dispo || !local.mdp) return;
  const instant = JSON.stringify(instantane());
  if (instant === dernierInstantane) return;
  dernierInstantane = instant;
  if (memesDonnees(instantane(), local.base)) { if (!enCours) { clearTimeout(envoiH); sale = false; } return; }
  programmer();
}

/* ---------- canal temps réel ---------- */

const PHX = { heartbeat: 25000, secours: 2 * 60 * 1000, sondage: 10000 };
let ws = null, tient = false, voulu = false;
let heartbeatH = null, reconnexionH = null, retardWs = 1000, refN = 0, refJoin = null, sujet = null, battementSansReponse = false;

const hexa = octets => [...new Uint8Array(octets)].map(o => o.toString(16).padStart(2, "0")).join("");

/* Le nom du canal dérive du mot de passe : impossible à deviner sans lui, et
   rien d'autre qu'un « changé » n'y circule. */
async function nomDuCanal(mdp) {
  const octets = new TextEncoder().encode("carnet:" + mdp);
  return hexa(await crypto.subtle.digest("SHA-256", octets));
}

async function ouvrirCanal() {
  if (!dispo || !local.mdp || ws || typeof WebSocket === "undefined" || !crypto?.subtle) return;
  voulu = true;
  let nom;
  try { nom = await nomDuCanal(local.mdp); } catch { return; }
  if (!voulu || ws || !local.mdp) return;
  sujet = "realtime:" + nom;
  let socket;
  try { socket = new WebSocket(`${cfg.url.replace(/^http/, "ws")}/realtime/v1/websocket?apikey=${encodeURIComponent(cfg.anonKey)}&vsn=1.0.0`); }
  catch { return canalPerdu(null); }
  ws = socket;
  const envoyer = (topic, event, payload) => {
    const ref = String(++refN);
    if (socket.readyState === 1) socket.send(JSON.stringify({ topic, event, payload, ref }));
    return ref;
  };
  /* Une ouverture qui n'aboutit pas ne doit pas laisser `ws` occupé : on ferme,
     et canalPerdu() programme le nouvel essai. */
  const limiteOuverture = setTimeout(() => { try { socket.close(); } catch {} canalPerdu(socket); }, DELAI_RESEAU);
  socket.onopen = () => {
    clearTimeout(limiteOuverture);
    const config = { broadcast: { self: false, ack: false }, presence: { key: "" }, postgres_changes: [], private: false };
    refJoin = envoyer(sujet, "phx_join", cfg.anonKey.startsWith("eyJ") ? { config, access_token: cfg.anonKey } : { config });
    battementSansReponse = false;
    heartbeatH = setInterval(() => {
      if (battementSansReponse) return socket.close();         // le serveur ne répond plus
      battementSansReponse = true;
      envoyer("phoenix", "heartbeat", {});
    }, PHX.heartbeat);
  };
  socket.onmessage = ev => {
    let m;
    try { m = JSON.parse(ev.data); } catch { return; }
    if (m.topic === "phoenix") { battementSansReponse = false; return; }
    if (m.topic !== sujet) return;
    if (m.event === "phx_reply" && m.ref === refJoin) {
      if (m.payload?.status === "ok") { tient = true; retardWs = 1000; tirer(); }   // on a pu rater un message : on relève
      else socket.close();
    } else if (m.event === "broadcast" && m.payload?.event === "change") tirer();
    else if (m.event === "phx_error" || m.event === "phx_close") socket.close();
  };
  socket.onclose = socket.onerror = () => { clearTimeout(limiteOuverture); canalPerdu(socket); };
}

function canalPerdu(socket) {
  if (socket && socket !== ws) return;
  clearInterval(heartbeatH);
  ws = null; tient = false;
  if (!voulu) return;
  clearTimeout(reconnexionH);
  reconnexionH = setTimeout(ouvrirCanal, retardWs);
  retardWs = Math.min(retardWs * 2, 60000);                    // délai croissant
}

function fermerCanal() {
  voulu = false;
  clearTimeout(reconnexionH);
  clearInterval(heartbeatH);
  const s = ws;
  ws = null; tient = false;
  try { s?.close(); } catch {}
}

/* Après une écriture : un simple « changé », aucune donnée. */
function diffuser() {
  if (!ws || !tient || ws.readyState !== 1) return;
  ws.send(JSON.stringify({ topic: sujet, event: "broadcast", payload: { type: "broadcast", event: "change", payload: {} }, ref: String(++refN) }));
}

/* ---------- connexion ---------- */

function deconnecterLocal() {
  clearTimeout(envoiH);
  fermerCanal();
  local = {}; ecrire(local);
  sale = false; dernierInstantane = null;
  etatVers("off");
}

const versBase64url = texte => btoa(String.fromCharCode(...new TextEncoder().encode(texte))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const depuisBase64url = jeton => new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(atob(jeton.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)));

/* Connexion : le mot de passe est vérifié tout de suite par une lecture. Un
   carnet déjà présent sur le serveur n'est jamais écrasé sans `remplacer` : on
   répond alors carnetExistant, à l'interface de demander confirmation. */
async function connecter(mdp, { remplacer = false } = {}) {
  if (!dispo) return { ok: false, message: "La synchronisation n'est pas configurée." };
  if (!mdp) return { ok: false, message: "Saisis le mot de passe du carnet." };
  try {
    const lignes = await rpc("carnet_lire", {}, mdp);
    if (lignes.length && !remplacer) {
      return { ok: false, carnetExistant: true, message: "Un carnet partagé existe déjà : le menu et la liste de cet appareil seraient remplacés par les siens." };
    }
    clearTimeout(envoiH);
    fermerCanal();
    local = { mdp }; sale = false;
    garder();
    if (lignes.length) {
      appliquer(lignes[0].data, { retirer: false });           // remplacer : le carnet partagé fait foi
      retenir(lignes[0].data, lignes[0].updated_at);
    } else {
      local.base = {}; local.vu = null; ecrire(local);        // première connexion : ce carnet devient le carnet partagé
    }
    derniereReleve = Date.now();
    etatVers("ok");
    ouvrirCanal();
    verifierEnvoi();
    return { ok: true, message: lignes.length ? "Synchronisation activée : le carnet partagé est chargé." : "Synchronisation activée : cet appareil crée le carnet partagé." };
  } catch (e) {
    return { ok: false, message: e instanceof MdpRefuse ? "Mot de passe incorrect." : "Impossible de joindre le serveur pour l'instant." };
  }
}

/* ---------- connexion par lien (QR code) ---------- */

const RE_LIEN = /^#\/connexion\/([A-Za-z0-9_-]+)\/?$/;

function demanderRemplacement(mdp) {
  const fond = document.createElement("div");
  fond.className = "sheet-backdrop";
  fond.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Rejoindre le carnet partagé">
      <div class="sheet-grip"></div>
      <h3>Rejoindre le carnet partagé</h3>
      <p class="sheet-sub">Un carnet partagé existe déjà. Le menu et la liste de courses de cet appareil seront remplacés par les siens.</p>
      <button class="btn primary sheet-add" type="button" data-oui>Remplacer et rejoindre</button>
      <button class="btn secondary sheet-add" type="button" data-non style="margin-top:10px">Annuler</button>
    </div>`;
  let accepte = false;
  fond.addEventListener("click", e => {
    if (e.target.closest("[data-oui]")) { accepte = true; fermerFeuille(); }
    else if (e.target === fond || e.target.closest("[data-non]")) fermerFeuille();
  });
  ouvrirFeuille(fond, async () => {
    if (!accepte) return toast("Connexion annulée");
    const r = await connecter(mdp, { remplacer: true });
    toast(r.message);
  });
}

async function connexionParLien(jeton) {
  let mdp;
  try { mdp = depuisBase64url(jeton); } catch { return toast("Ce lien de connexion est illisible"); }
  if (!dispo) return toast("La synchronisation n'est pas configurée");
  if (local.mdp === mdp) return toast("Cet appareil est déjà connecté");
  const r = await connecter(mdp);
  if (!r.carnetExistant) return toast(r.message);
  const vide = !state.menu?.length && !state.extras?.length && !Object.keys(state.checked || {}).length;
  if (vide) toast((await connecter(mdp, { remplacer: true })).message);     // rien à perdre ici : pas de question
  else demanderRemplacement(mdp);
}

/* ---------- l'API des réglages ---------- */

export const carnetSync = {
  disponible: dispo,
  etat: () => etat,
  surEtat(fn) { abonnes.add(fn); return () => abonnes.delete(fn); },
  connecter,
  deconnecter() { deconnecterLocal(); },
  /* L'adresse que le QR code encode : le jeton est le mot de passe lui-même,
     donc à ne montrer qu'à l'écran de l'appareil déjà connecté. */
  lienConnexion() {
    if (!local.mdp) return null;
    return `${location.href.split("#")[0]}#/connexion/${versBase64url(local.mdp)}`;
  },
  relever: () => tirer()
};

/* Appelée une fois par main.js, après le premier rendu : rien ne se connecte au
   chargement du module. La synchro s'abonne à la sauvegarde au lieu d'être
   appelée par son nom depuis l'état. */
export function demarrerSync() {
  if (demarre) return;
  demarre = true;
  document.documentElement.dataset.synchro = etat;
  surSauvegarde(auChangement);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    if (local.mdp && !ws) ouvrirCanal();
    tirer();
  });
  window.addEventListener("online", () => { if (!ws) ouvrirCanal(); tirer(); });
  /* Canal vivant : un relevé de secours toutes les 2 min suffit ; sinon, toutes les 10 s. */
  setInterval(() => {
    if (document.hidden || !local.mdp) return;
    if (!tient || Date.now() - derniereReleve >= PHX.secours) tirer();
  }, PHX.sondage);

  const lien = RE_LIEN.exec(location.hash);
  if (lien) {
    // Le jeton est un mot de passe : il ne doit pas rester dans l'historique.
    allerEnRemplacant("#/");
    connexionParLien(lien[1]);
  } else if (dispo && local.mdp) {
    garder();
    ouvrirCanal();
    tirer();
  }
}
