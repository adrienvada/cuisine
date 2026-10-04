/* Aides des tests de la feuille Réglages : un carnetSync simulé et un QR de substitution.
   Comme pour Supabase (outils.js), on ne touche pas aux modules de js/ : on
   remplace, à la livraison, les fichiers que la feuille importe à la demande.

   - js/sync.js : on garde le vrai module (relu sous une autre adresse) et on lui
     ajoute, ou on lui substitue, l'export `carnetSync` — un objet qui vit dans la
     page (window.__carnetSyncSimule) et que le test pilote.
   - js/ui/qr.js : un qrSvg qui ne dessine rien d'utile mais garde le texte reçu. */

const CORPS_SYNC = `export * from "/js/sync.js?reel";
export const carnetSync = window.__carnetSyncSimule;`;

const CORPS_QR = `export const qrSvg = texte => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" data-texte="' + encodeURIComponent(texte) + '"><rect width="10" height="10"/></svg>';`;

/* options : { disponible, etat, mdp, carnetExistant, lien } */
export async function simulerCarnetSync(context, options = {}) {
  const reglage = { disponible: true, etat: "off", mdp: "secret", carnetExistant: false, lien: "https://exemple.test/cuisine/#/connexion/secret", ...options };
  await context.addInitScript(r => {
    const abonnes = new Set();
    const emettre = () => abonnes.forEach(fn => fn());
    const o = {
      disponible: r.disponible,
      appels: [],
      etat: () => o._etat,
      _etat: r.etat,
      surEtat(fn) { abonnes.add(fn); return () => abonnes.delete(fn); },
      async connecter(mdp, opts = {}) {
        o.appels.push(["connecter", mdp, opts]);
        if (mdp !== r.mdp) return { ok: false, message: "Mot de passe incorrect." };
        if (r.carnetExistant && !opts.remplacer) return { ok: false, carnetExistant: true, message: "Un carnet partagé existe déjà." };
        o._etat = "ok";
        emettre();
        return { ok: true, message: "Synchronisation activée" };
      },
      deconnecter() { o.appels.push(["deconnecter"]); o._etat = "off"; emettre(); },
      lienConnexion: () => (o._etat === "off" ? null : r.lien),
      relever() {},
      /* Du côté du test : le réseau tombe, revient… */
      changer(e) { o._etat = e; emettre(); }
    };
    window.__carnetSyncSimule = o;
  }, reglage);
  await context.route(/\/js\/sync\.js$/, route => route.fulfill({ contentType: "text/javascript; charset=utf-8", body: CORPS_SYNC }));
  await context.route(/\/js\/ui\/qr\.js$/, route => route.fulfill({ contentType: "text/javascript; charset=utf-8", body: CORPS_QR }));
  return reglage;
}

/* Compte les appels à navigator.storage.persist(). */
export async function espionnerPersistance(context) {
  await context.addInitScript(() => {
    window.__persist = 0;
    try {
      Object.defineProperty(navigator, "storage", {
        configurable: true,
        value: { persist: () => { window.__persist++; return Promise.resolve(true); }, persisted: () => Promise.resolve(false) }
      });
    } catch {}
  });
}

/* Le thème tel qu'il est posé sur la page. */
export const themeAffiche = page =>
  page.evaluate(() => document.documentElement.getAttribute("data-theme") === "dark" ? "sombre" : "clair");
