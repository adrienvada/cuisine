/* Réglages : thème, carnet partagé (synchro), sauvegarde. Une feuille ouverte depuis l'en-tête de l'accueil. */

import { migrer, save, state } from "../core/etat.js";
import { html, raw } from "../core/html.js";
import { ICON } from "../core/icones.js";
import {
  apercu, contenuExport, instantane, lireSauvegarde, nomFichier, remplacerEtat, restaurerEtat
} from "../core/sauvegarde.js";
import { confirmer, fermerFeuille, ouvrirFeuille } from "../ui/feuilles.js";
import { route } from "../ui/routeur.js";
import { choisirTheme, modeTheme } from "../ui/theme.js";
import { toast, updateBadge } from "../ui/toast.js";

const ICONE_REGLAGES = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h9"/><path d="M17 7h3"/><circle cx="15" cy="7" r="2"/><path d="M4 17h3"/><path d="M11 17h9"/><circle cx="9" cy="17" r="2"/></svg>';

const ETATS = {
  off: "Pas connecté",
  attente: "Connexion…",
  ok: "Connecté",
  hors: "Hors ligne"
};

/* ---------- La synchro, vue d'ici ---------- */

/* sync.js est importé à la demande, et sa présence vérifiée : le carnet doit
   rester utilisable si le module manque ou n'expose pas l'interface attendue. */
let promesseSync = null;
export function synchro() {
  promesseSync ??= import("../sync.js").then(m => m.carnetSync || null).catch(() => null);
  return promesseSync;
}

const disponible = cs => !!cs && (typeof cs.disponible === "function" ? cs.disponible() : cs.disponible);

let etatSync = "off";

/* Le point de couleur du bouton : vert connecté, doré hors ligne, rien sinon. */
function majPoints(etat) {
  etatSync = etat in ETATS ? etat : "off";
  document.querySelectorAll("[data-reglages]").forEach(b => {
    b.dataset.sync = etatSync;
    b.setAttribute("aria-label", libelleBouton());
  });
}

const libelleBouton = () =>
  etatSync === "off" ? "Réglages" : `Réglages — carnet partagé : ${ETATS[etatSync].toLowerCase()}`;

/* À glisser dans l'en-tête de l'accueil : il défile avec la page. */
export function boutonReglages() {
  return html`<button type="button" class="reglages-btn" data-reglages data-sync="${etatSync}" aria-label="${libelleBouton()}">${raw(ICONE_REGLAGES)}<span class="reglages-point" aria-hidden="true"></span></button>`;
}

/* Appelée une fois par main.js. */
export function initialiserReglages() {
  document.addEventListener("click", e => {
    if (e.target.closest("[data-reglages]")) ouvrirReglages();
  });
  demanderPersistance();
  synchro().then(cs => {
    if (!disponible(cs)) return;
    majPoints(cs.etat());
    cs.surEtat(() => majPoints(cs.etat()));
  });
}

/* Le navigateur peut vider les données d'un site quand l'appareil manque de
   place ; sans cette demande, un carnet non synchronisé serait le premier à
   partir. Une seule fois, pour tout le monde : la synchro n'est plus la seule
   à y tenir. */
function demanderPersistance() {
  const appareil = (state.reglages ??= {});
  if (appareil.persistanceDemandee) return;
  appareil.persistanceDemandee = true;
  save();
  try { navigator.storage?.persist?.(); } catch {}
}

/* ---------- La feuille ---------- */

const MODES = [
  ["auto", "Automatique"],
  ["clair", "Clair"],
  ["sombre", "Sombre"]
];

function themeHtml() {
  const actuel = modeTheme();
  return html`
    <div class="reg-choix">
      ${MODES.map(([id, nom]) => raw(html`<button type="button" class="reg-mode" data-mode="${id}" aria-pressed="${String(actuel === id)}">${nom}</button>`))}
    </div>
    <p class="reg-aide">Automatique suit le réglage de ton téléphone, y compris quand il change dans la journée.</p>`;
}

function sauvegardeHtml() {
  return html`
    <p class="reg-aide">Un fichier avec tout ton carnet : menu, courses, notes, recettes cuisinées. Utile pour changer de téléphone ou garder une copie.</p>
    <div class="reg-duo">
      <button type="button" class="btn secondary" data-exporter>Exporter mon carnet</button>
      <button type="button" class="btn secondary" data-importer>Importer…</button>
    </div>
    <input type="file" id="reg-fichier" accept="application/json,.json" hidden>`;
}

export function ouvrirReglages() {
  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop reglages-sheet";
  backdrop.innerHTML = html`
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="reg-titre">
      <div class="sheet-grip"></div>
      <div class="reg-tete">
        <h3 id="reg-titre">Réglages</h3>
        <button type="button" class="reg-fermer" data-fermer aria-label="Fermer les réglages">${raw(ICON.x)}</button>
      </div>
      <section class="reg-bloc" aria-labelledby="reg-h-theme">
        <h4 id="reg-h-theme">Apparence</h4>
        <div id="reg-theme">${raw(themeHtml())}</div>
      </section>
      <section class="reg-bloc" aria-labelledby="reg-h-sync" id="reg-sync-bloc" hidden>
        <h4 id="reg-h-sync">Carnet partagé</h4>
        <div id="reg-sync"></div>
      </section>
      <section class="reg-bloc" aria-labelledby="reg-h-sauve">
        <h4 id="reg-h-sauve">Sauvegarde</h4>
        <div id="reg-sauve">${raw(sauvegardeHtml())}</div>
      </section>
    </div>`;

  const q = sel => backdrop.querySelector(sel);
  let desabonner = null;

  backdrop.addEventListener("click", e => {
    if (e.target === backdrop || e.target.closest("[data-fermer]")) return fermerFeuille();
    const mode = e.target.closest("[data-mode]");
    if (mode) {
      choisirTheme(mode.dataset.mode);
      q("#reg-theme").innerHTML = themeHtml();
      /* Le bouton vient d'être redessiné : le focus clavier le suit. */
      q(`[data-mode="${mode.dataset.mode}"]`).focus();
      return;
    }
    if (e.target.closest("[data-exporter]")) return exporterCarnet();
    if (e.target.closest("[data-importer]")) return q("#reg-fichier").click();
  });
  q("#reg-fichier").addEventListener("change", async e => {
    const fichier = e.target.files[0];
    e.target.value = "";                   // le même fichier doit pouvoir être rechoisi
    if (fichier) await proposerImport(fichier);
  });

  /* Le bloc synchro n'apparaît que si le site est configuré et que sync.js
     répond : sans quoi il n'y a rien à régler. */
  synchro().then(cs => {
    if (!disponible(cs) || !backdrop.isConnected) return;
    q("#reg-sync-bloc").hidden = false;
    const bloc = blocSynchro(cs, q("#reg-sync"));
    bloc.dessiner();
    const stop = cs.surEtat(() => bloc.majEtat());
    desabonner = typeof stop === "function" ? stop : null;
  });

  ouvrirFeuille(backdrop, () => { if (desabonner) desabonner(); });
}

/* ---------- Carnet partagé ---------- */

function blocSynchro(cs, zone) {
  let miseEnPage = null;       // "off" ou "connecte" : on ne redessine tout que si elle change
  let qr = false;

  const etat = () => cs.etat();
  const layout = () => (etat() === "off" ? "off" : "connecte");

  function dessiner() {
    miseEnPage = layout();
    if (miseEnPage === "off") {
      zone.innerHTML = html`
        <p class="reg-aide">Un mot de passe partagé garde le menu et la liste de courses identiques sur tous tes appareils.</p>
        <form class="reg-form" id="reg-connexion">
          <label for="reg-mdp">Mot de passe du carnet</label>
          <input id="reg-mdp" type="password" autocomplete="current-password" autocapitalize="off" spellcheck="false">
          <button type="submit" class="btn primary" id="reg-connecter">Se connecter</button>
        </form>
        <p class="reg-erreur" id="reg-erreur" role="alert"></p>`;
      zone.querySelector("#reg-connexion").addEventListener("submit", e => { e.preventDefault(); connecter(); });
    } else {
      zone.innerHTML = html`
        <p class="reg-statut" id="reg-statut"><span class="reglages-point en-ligne" id="reg-point" aria-hidden="true"></span><span id="reg-statut-txt"></span></p>
        <p class="reg-aide" id="reg-statut-aide"></p>
        <div id="reg-qr-zone"></div>
        <button type="button" class="btn secondary" id="reg-deconnecter">Se déconnecter</button>`;
      zone.querySelector("#reg-deconnecter").addEventListener("click", deconnecter);
      majEtat();
      dessinerQr();
    }
  }

  function majEtat() {
    if (layout() !== miseEnPage) return dessiner();
    if (miseEnPage === "off") return;
    const e = etat();
    zone.querySelector("#reg-point").dataset.sync = e;
    zone.querySelector("#reg-statut-txt").textContent = ETATS[e] || ETATS.ok;
    zone.querySelector("#reg-statut-aide").textContent = e === "hors"
      ? "Le serveur est injoignable pour l'instant : tes modifications partiront au retour du réseau."
      : "Ce navigateur est synchronisé : le menu et les courses suivent tes autres appareils.";
  }

  const erreur = txt => { const p = zone.querySelector("#reg-erreur"); if (p) p.textContent = txt; };

  async function connecter(mdp = zone.querySelector("#reg-mdp").value, remplacer = false) {
    if (!mdp) { erreur("Saisis le mot de passe du carnet."); zone.querySelector("#reg-mdp").focus(); return; }
    const bouton = zone.querySelector("#reg-connecter");
    bouton.disabled = true;
    bouton.textContent = "Connexion…";
    erreur("");
    let res;
    try { res = await cs.connecter(mdp, remplacer ? { remplacer: true } : {}); }
    catch { res = { ok: false, message: "Impossible de joindre le serveur." }; }
    if (!zone.isConnected) return;
    bouton.disabled = false;
    bouton.textContent = "Se connecter";
    if (res?.ok) { toast(res.message || "Synchronisation activée"); dessiner(); return; }
    if (res?.carnetExistant && !remplacer) {
      const oui = await confirmer({
        titre: "Un carnet partagé existe déjà",
        texte: "Le menu et la liste de ce navigateur seront remplacés par ceux du carnet partagé.",
        oui: "Remplacer et me connecter",
        danger: true
      });
      if (oui && zone.isConnected) await connecter(mdp, true);
      return;
    }
    erreur(res?.message || "Connexion impossible.");
  }

  async function deconnecter() {
    const oui = await confirmer({
      titre: "Se déconnecter du carnet partagé ?",
      texte: "Ce navigateur arrête de se synchroniser. Le carnet reste sur cet appareil.",
      oui: "Se déconnecter"
    });
    if (!oui) return;
    cs.deconnecter();
    qr = false;
    toast("Déconnecté");
    if (zone.isConnected) dessiner();
  }

  /* Le QR code contient le mot de passe : il n'est jamais affiché de lui-même,
     seulement quand on le demande, et l'avertissement est là avant. */
  async function dessinerQr() {
    const lieu = zone.querySelector("#reg-qr-zone");
    if (!lieu) return;
    if (!cs.lienConnexion?.()) { lieu.innerHTML = ""; return; }
    if (!qr) {
      lieu.innerHTML = html`<button type="button" class="btn secondary" id="reg-qr-voir">Connecter un autre téléphone</button>`;
      lieu.querySelector("#reg-qr-voir").addEventListener("click", async () => {
        qr = true;
        await dessinerQr();
      });
      return;
    }
    let svg = "";
    try {
      const { qrSvg } = await import("../ui/qr.js");
      svg = qrSvg(cs.lienConnexion());
    } catch {
      qr = false;
      toast("Le QR code n'est pas disponible pour l'instant");
      return dessinerQr();
    }
    if (!lieu.isConnected) return;
    lieu.innerHTML = html`
      <p class="reg-alerte" role="note">Ce code contient le mot de passe du carnet. Ne le montre qu'à quelqu'un de confiance, et ne le prends pas en photo.</p>
      <div class="reg-qr" role="img" aria-label="QR code de connexion au carnet partagé">${raw(svg)}</div>
      <p class="reg-aide">Sur l'autre téléphone, ouvre l'appareil photo et vise ce code.</p>
      <button type="button" class="btn secondary" id="reg-qr-cacher">Masquer le code</button>`;
    lieu.querySelector("#reg-qr-cacher").addEventListener("click", () => { qr = false; dessinerQr(); });
  }

  return { dessiner, majEtat };
}

/* ---------- Sauvegarde ---------- */

export function exporterCarnet() {
  const blob = new Blob([contenuExport(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier();
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast("Carnet exporté");
}

const MAX_IMPORT = 10 * 1024 * 1024;

async function proposerImport(fichier) {
  if (fichier.size > MAX_IMPORT) return toast("Ce fichier est trop gros pour être un carnet");
  const { donnees, erreur } = lireSauvegarde(await fichier.text());
  if (erreur) return toast(erreur);

  const lignes = apercu(state, donnees);
  const detail = html`
    <ul class="reg-apercu">
      ${lignes.map(l => raw(html`<li><span>${l.libelle}</span><b>${l.actuel} → ${l.importe}</b></li>`))}
      ${lignes.length ? "" : raw("<li><span>Les deux carnets sont vides.</span></li>")}
    </ul>
    <p class="reg-aide">Les minuteurs en cours et les réglages de cet appareil sont conservés.</p>`;
  const oui = await confirmer({
    titre: "Remplacer ton carnet par ce fichier ?",
    texte: `« ${fichier.name} » prend la place de ce qui est dans ce navigateur :`,
    detail,
    oui: "Remplacer mon carnet",
    danger: true
  });
  if (!oui) return;

  const avant = instantane(state);
  remplacerEtat(state, donnees);
  migrer();
  save();
  fermerFeuille({ toutes: true });
  route({ garderDefilement: true });
  updateBadge();
  toast("Carnet importé", {
    action: "Annuler",
    duree: 8000,
    surAction: () => {
      restaurerEtat(state, avant);
      save();
      route({ garderDefilement: true });
      updateBadge();
      toast("Ton ancien carnet est revenu");
    }
  });
}
