/* Synchronisation du menu, des cases cochées et des articles libres entre appareils.
   Une seule base partagée, protégée par un mot de passe vérifié côté serveur : on le
   saisit une fois par appareil. Sans dépendance : deux appels REST. La dernière
   modification l'emporte. */

const carnetSync = (function () {
  const CLE = "carnet-sync-v2";
  const CHAMPS = ["menu", "checked", "extras"];
  const cfg = typeof SYNC_CONFIG !== "undefined" ? SYNC_CONFIG : { url: "", anonKey: "" };
  const dispo = !!(cfg.url && cfg.anonKey);

  const lire = () => { try { return JSON.parse(localStorage.getItem(CLE)) || {}; } catch { return {}; } };
  const ecrire = o => { try { localStorage.setItem(CLE, JSON.stringify(o)); } catch {} };
  let local = lire();               // { mdp, vu } — vu : dernière version serveur connue
  let sale = false;                 // modifications locales pas encore envoyées
  let envoiH = null, enCours = false;
  let etat = local.mdp ? "attente" : "off";   // off | attente | ok | hors

  /* Demande au navigateur de ne pas effacer le mot de passe mémorisé quand il fait
     du ménage : on ne se connecte qu'une fois par appareil. */
  const garder = () => { try { navigator.storage?.persist?.(); } catch {} };

  function etatVers(e) { if (etat !== e) { etat = e; majBouton(); } }

  class MdpRefuse extends Error {}

  async function rpc(nom, corps) {
    /* Ancienne clé « anon » = un JWT (eyJ…), à doubler en Bearer ; nouvelle clé
       « publishable » (sb_publishable_…) : en-tête apikey seul. */
    const headers = { apikey: cfg.anonKey, "Content-Type": "application/json" };
    if (cfg.anonKey.startsWith("eyJ")) headers.Authorization = `Bearer ${cfg.anonKey}`;
    const res = await fetch(`${cfg.url}/rest/v1/rpc/${nom}`, { method: "POST", headers, body: JSON.stringify(corps) });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw txt.includes("mot de passe incorrect") ? new MdpRefuse() : new Error(nom + " " + res.status);
    }
    return res.json();
  }

  const instantane = () => Object.fromEntries(CHAMPS.map(c => [c, state[c]]));

  function appliquer(data) {
    for (const c of CHAMPS) if (data[c] !== undefined) state[c] = data[c];
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    const h = location.hash || "#/";
    const saisie = document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
    if ((h === "#/menu" || h === "#/courses") && !saisie) route();
    else updateBadge();
  }

  function refuse() {
    local = {}; ecrire(local); sale = false; etatVers("off");
    toast("Mot de passe refusé : synchronisation arrêtée");
  }

  async function tirer() {
    if (!dispo || !local.mdp || sale || enCours) return;
    try {
      const lignes = await rpc("carnet_lire", { p_mdp: local.mdp });
      if (sale) return;                               // une modif locale est partie entre-temps
      etatVers("ok");
      if (!lignes.length) { if (local.vu == null) pousser(); return; }   // base vide : on amorce
      const { data, updated_at } = lignes[0];
      if (updated_at === local.vu) return;
      local.vu = updated_at; ecrire(local);
      appliquer(data);
    } catch (e) { if (e instanceof MdpRefuse) refuse(); else etatVers("hors"); }
  }

  async function pousser() {
    if (!dispo || !local.mdp) return;
    clearTimeout(envoiH);
    enCours = true;
    try {
      sale = false;
      local.vu = await rpc("carnet_ecrire", { p_mdp: local.mdp, p_data: instantane() });
      ecrire(local);
      etatVers("ok");
    } catch (e) {
      if (e instanceof MdpRefuse) refuse();
      else { sale = true; etatVers("hors"); envoiH = setTimeout(pousser, 15000); }   // hors ligne : on réessaie
    }
    enCours = false;
  }

  function changed() {
    if (!dispo || !local.mdp) return;
    sale = true;
    clearTimeout(envoiH);
    envoiH = setTimeout(pousser, 800);
  }

  /* Connexion : le mot de passe est vérifié tout de suite par une lecture. */
  async function connecter() {
    const mdp = prompt("Mot de passe du carnet partagé :");
    if (!mdp) return;
    try {
      const lignes = await rpc("carnet_lire", { p_mdp: mdp });
      if (lignes.length && !confirm("Un carnet partagé existe déjà.\n\nOK : remplacer le menu et la liste de ce navigateur par ceux du carnet partagé.\nAnnuler : ne pas se connecter.")) return;
      local = { mdp, vu: null }; ecrire(local); garder(); etat = "ok";
      if (lignes.length) { local.vu = lignes[0].updated_at; ecrire(local); appliquer(lignes[0].data); }
      else { sale = true; await pousser(); }           // première connexion : ce carnet devient le carnet partagé
      toast("Synchronisation activée");
    } catch (e) {
      toast(e instanceof MdpRefuse ? "Mot de passe incorrect" : "Impossible de joindre le serveur");
    }
    majBouton();
  }

  function menu() {
    if (!dispo) return toast("Synchronisation non configurée");
    if (!local.mdp) return connecter();
    const txt = etat === "hors" ? "Connecté, mais le serveur est injoignable pour l'instant : les modifications partiront au retour du réseau." : "Connecté : ce navigateur est synchronisé.";
    if (confirm(txt + "\n\nOK : se déconnecter (le carnet reste sur cet appareil).\nAnnuler : rester connecté.")) {
      local = {}; ecrire(local); sale = false; etat = "off"; majBouton();
      toast("Déconnecté");
    }
  }

  function majBouton() {
    const b = document.getElementById("sync-btn");
    if (!b) return;
    b.hidden = !dispo;
    const texte = { off: "Se connecter", attente: "Connexion…", ok: "Connecté", hors: "Hors ligne" }[etat];
    b.dataset.etat = etat;
    b.title = texte;
    b.setAttribute("aria-label", etat === "off" ? "Se connecter au carnet partagé" : texte + " — carnet partagé");
  }

  document.getElementById("sync-btn")?.addEventListener("click", menu);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tirer(); });
  window.addEventListener("online", () => { if (sale) pousser(); else tirer(); });
  setInterval(() => { if (!document.hidden) tirer(); }, 10000);
  majBouton();
  if (dispo && local.mdp) { garder(); (sale ? pousser : tirer)(); }

  return { changed };
})();
