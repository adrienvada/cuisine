/* Synchronisation du menu, des cases cochées et des articles libres entre appareils.
   Un « foyer » = un code secret partagé par lien ; les données tiennent en une ligne
   Supabase. Sans dépendance : deux appels REST. La dernière modification l'emporte. */

const carnetSync = (function () {
  const CLE = "carnet-sync-v1";
  const CHAMPS = ["menu", "checked", "extras"];
  const cfg = typeof SYNC_CONFIG !== "undefined" ? SYNC_CONFIG : { url: "", anonKey: "" };
  const dispo = !!(cfg.url && cfg.anonKey);

  const lire = () => { try { return JSON.parse(localStorage.getItem(CLE)) || {}; } catch { return {}; } };
  const ecrire = o => { try { localStorage.setItem(CLE, JSON.stringify(o)); } catch {} };
  let local = lire();               // { code, vu } — vu : dernière version serveur connue
  let sale = false;                 // modifications locales pas encore envoyées
  let envoiH = null, enCours = false;

  const nouveauCode = () => {
    const a = new Uint8Array(18);
    crypto.getRandomValues(a);
    return Array.from(a, b => b.toString(36).padStart(2, "0")).join("").slice(0, 28);
  };

  async function rpc(nom, corps) {
    /* Ancienne clé « anon » = un JWT (eyJ…), à doubler en Bearer ; nouvelle clé
       « publishable » (sb_publishable_…) : en-tête apikey seul. */
    const headers = { apikey: cfg.anonKey, "Content-Type": "application/json" };
    if (cfg.anonKey.startsWith("eyJ")) headers.Authorization = `Bearer ${cfg.anonKey}`;
    const res = await fetch(`${cfg.url}/rest/v1/rpc/${nom}`, {
      method: "POST",
      headers,
      body: JSON.stringify(corps)
    });
    if (!res.ok) throw new Error(nom + " " + res.status);
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

  async function tirer() {
    if (!dispo || !local.code || sale || enCours) return;
    try {
      const lignes = await rpc("carnet_lire", { p_code: local.code });
      if (sale) return;                               // une modif locale est partie entre-temps
      if (!lignes.length) { if (local.vu == null) pousser(); return; }   // foyer neuf : on amorce
      const { data, updated_at } = lignes[0];
      if (updated_at === local.vu) return;
      local.vu = updated_at; ecrire(local);
      appliquer(data);
    } catch {}
  }

  async function pousser() {
    if (!dispo || !local.code) return;
    clearTimeout(envoiH);
    enCours = true;
    try {
      sale = false;
      local.vu = await rpc("carnet_ecrire", { p_code: local.code, p_data: instantane() });
      ecrire(local);
    } catch { sale = true; envoiH = setTimeout(pousser, 15000); }   // hors ligne : on réessaie
    enCours = false;
  }

  function changed() {
    if (!dispo || !local.code) return;
    sale = true;
    clearTimeout(envoiH);
    envoiH = setTimeout(pousser, 800);
  }

  function rejoindre(code, amorcer) {
    local = { code, vu: null }; ecrire(local);
    if (amorcer) { sale = true; pousser(); } else tirer();
    majBouton();
  }

  const lien = () => `${location.origin}${location.pathname}?foyer=${local.code}`;

  async function menu() {
    if (!dispo) return toast("Synchronisation non configurée");
    if (!local.code) {
      if (confirm("Synchroniser ce carnet avec un autre appareil ?\n\nOK : créer un foyer à partir de ce carnet et obtenir le lien à envoyer.\nAnnuler : rien ne change.\n\n(Pour rejoindre un foyer existant, ouvre le lien qu'on t'a envoyé.)")) {
        rejoindre(nouveauCode(), true);
        await partager();
      }
      return;
    }
    if (confirm("Ce carnet est synchronisé.\n\nOK : envoyer à nouveau le lien du foyer.\nAnnuler : fermer.")) return partager();
  }

  async function partager() {
    const url = lien();
    try { if (navigator.share) return await navigator.share({ title: "Carnet de cuisine", text: "Rejoins notre carnet de cuisine :", url }); } catch { return; }
    try { await navigator.clipboard.writeText(url); toast("Lien copié"); } catch { prompt("Lien du foyer :", url); }
  }

  function majBouton() {
    const b = document.getElementById("sync-btn");
    if (!b) return;
    b.hidden = !dispo;
    b.classList.toggle("actif", !!local.code);
    b.setAttribute("aria-label", local.code ? "Synchronisation active" : "Synchroniser entre appareils");
  }

  /* Lien d'invitation : on retient le code puis on efface l'URL. */
  (function invitation() {
    const p = new URLSearchParams(location.search);
    const code = p.get("foyer");
    if (!code) return;
    p.delete("foyer");
    history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : "") + location.hash);
    if (!dispo || code === local.code || code.length < 20) return;
    if (confirm("Rejoindre ce foyer ?\n\nTon menu et ta liste de courses actuels seront remplacés par ceux du foyer.")) {
      local = { code, vu: null }; ecrire(local);
    }
  })();

  document.getElementById("sync-btn")?.addEventListener("click", menu);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tirer(); });
  window.addEventListener("online", () => { if (sale) pousser(); else tirer(); });
  setInterval(() => { if (!document.hidden) tirer(); }, 10000);
  majBouton();
  if (dispo && local.code) (sale ? pousser : tirer)();

  return { changed };
})();
