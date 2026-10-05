/* Réglages : thème, carnet partagé (synchro), sauvegarde. Une feuille ouverte depuis l'en-tête de l'accueil. */

import { migrer, save, state } from "../core/etat.js";
import { html, raw } from "../core/html.js";
import { ICON } from "../core/icones.js";
import {
  apercu, contenuExport, instantane, lireSauvegarde, nomFichier, remplacerEtat, restaurerEtat
} from "../core/sauvegarde.js";
import { confirmer, fermerFeuille, ouvrirFeuille } from "../ui/feuilles.js";
import { mouvementReduit, tracer } from "../ui/mouvement.js";
import { reglerVibrations, vibrationsActives, vibrer } from "../ui/geste.js";
import { chargerSync } from "../ui/scripts.js";
import { route } from "../ui/routeur.js";
import { choisirTheme, modeTheme } from "../ui/theme.js";
import { toast, updateBadge } from "../ui/toast.js";
import { ETATS, majPoints } from "./reglages-entree.js";

/* ---------- La synchro, vue d'ici ---------- */

/* sync.js (avec sa configuration) est chargé à la demande, et sa présence vérifiée : le carnet doit
   rester utilisable si le module manque ou n'expose pas l'interface attendue. */
let promesseSync = null;
export function synchro() {
  promesseSync ??= chargerSync().then(m => m.carnetSync || null).catch(() => null);
  return promesseSync;
}

const disponible = cs => !!cs && (typeof cs.disponible === "function" ? cs.disponible() : cs.disponible);

/* Appelée une fois par main.js, après le premier affichage : le point de couleur
   du bouton suit l'état de la synchro. L'ouverture de la feuille, elle, est
   branchée par main.js dès le départ (le module n'est peut-être pas encore là). */
export function initialiserReglages() {
  synchro().then(cs => {
    if (!disponible(cs)) return;
    majPoints(cs.etat());
    cs.surEtat(() => majPoints(cs.etat()));
  });
}

/* ---------- La feuille ---------- */

const MODES = [
  ["auto", "Automatique"],
  ["clair", "Clair"],
  ["sombre", "Sombre"]
];

/* La pastille est un seul élément derrière les trois choix : elle glisse de l'un à l'autre
   (translate, ressort vif) au lieu que le fond saute d'un bouton à l'autre. Les boutons
   ne sont dessinés qu'une fois : le focus et la pastille survivent à un choix. */
function themeHtml() {
  const actuel = modeTheme();
  return html`
    <div class="reg-choix" style="--n:${MODES.findIndex(([id]) => id === actuel)}">
      <span class="reg-pastille" aria-hidden="true"></span>
      ${MODES.map(([id, nom]) => raw(html`<button type="button" class="reg-mode" data-mode="${id}" aria-pressed="${String(actuel === id)}">${nom}</button>`))}
    </div>
    <p class="reg-aide">Automatique suit le réglage de ton téléphone, y compris quand il change dans la journée.</p>`;
}

function majChoixTheme(zone) {
  const actuel = modeTheme();
  zone.querySelectorAll("[data-mode]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === actuel)));
  zone.querySelector(".reg-choix").style.setProperty("--n", MODES.findIndex(([id]) => id === actuel));
}

/* Le nouveau thème s'étend en cercle depuis `origine` (le bouton touché). C'est une transition de
   vue, repérée par html[data-vt="theme"] (css/reglages.css en règle le cercle) ; elle grandit
   jusqu'au coin le plus éloigné (--vt-r). Le routeur a ses propres types : on ne démarre pas par-dessus
   l'un des siens. Sans l'API ou en mouvement réduit, on rend false et theme.js pose le thème
   d'un coup (la mise à jour de la page arrive sinon à l'image suivante). */
function enCercle(origine) {
  return appliquer => {
    const racine = document.documentElement;
    if (typeof document.startViewTransition !== "function" || mouvementReduit() || racine.dataset.vt) return false;
    const r = origine.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    racine.dataset.vt = "theme";
    racine.style.setProperty("--vt-x", x + "px");
    racine.style.setProperty("--vt-y", y + "px");
    racine.style.setProperty("--vt-r", Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))) + "px");
    const fin = () => {
      if (racine.dataset.vt !== "theme") return;
      delete racine.dataset.vt;
      ["--vt-x", "--vt-y", "--vt-r"].forEach(k => racine.style.removeProperty(k));
    };
    try {
      document.startViewTransition(appliquer).finished.then(fin, fin);
    } catch {
      appliquer();
      fin();
    }
    return true;
  };
}

/* Un interrupteur : un vrai bouton role="switch" (Espace et Entrée le basculent, les
   lecteurs d'écran disent « activé / désactivé »), dont la poignée glisse avec un ressort.
   La zone tactile fait 44 px de haut, la piste en dessine 32. */
function vibrationsHtml() {
  const actives = vibrationsActives();
  return html`
    <div class="reg-ligne">
      <span class="reg-ligne-txt" id="reg-vib-nom">Vibrations</span>
      <button type="button" class="reg-switch" id="reg-vib" role="switch" aria-checked="${String(actives)}" aria-labelledby="reg-vib-nom" aria-describedby="reg-vib-aide"><span class="reg-poignee" aria-hidden="true"></span></button>
    </div>
    <p class="reg-aide" id="reg-vib-aide">Un petit tic quand tu coches ou ajoutes, et une alerte quand un minuteur sonne. Ce réglage ne concerne que cet appareil.</p>`;
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
      <section class="reg-bloc" aria-labelledby="reg-h-vib">
        <h4 id="reg-h-vib">Au toucher</h4>
        <div id="reg-vibrations">${raw(vibrationsHtml())}</div>
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
      choisirTheme(mode.dataset.mode, enCercle(mode));   // le cercle part du bouton touché
      majChoixTheme(q("#reg-theme"));
      return;
    }
    if (e.target.closest("#reg-vib")) return basculerVibrations(q("#reg-vib"));
    if (e.target.closest("[data-exporter]")) return exporterCarnet(q("[data-exporter]"));
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

/* Les vibrations sont une préférence de l'appareil (geste.js), pas de l'état du carnet. En
   l'activant on sent tout de suite ce que ça donne ; en les coupant, rien ne vibre. */
function basculerVibrations(bouton) {
  const oui = bouton.getAttribute("aria-checked") !== "true";
  reglerVibrations(oui);
  bouton.setAttribute("aria-checked", String(oui));
  if (oui) vibrer("tic");
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
    /* L'état a pu passer par « connexion » le temps de l'essai, et la feuille
       s'est redessinée : le champ est revenu vide. On rend la saisie. */
    const champ = zone.querySelector("#reg-mdp");
    if (champ && !champ.value) champ.value = mdp;
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

/* « C'est fait » : la coche se trace dans le bouton, puis le libellé revient. Le nom
   accessible reste celui du bouton (la coche est décorative, le texte « Exporté » s'y
   ajoute le temps du retour). */
const COCHE = '<svg class="reg-coche" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const retoursCoche = new WeakMap();

function cocher(bouton, texte) {
  if (!bouton?.isConnected) return;
  clearTimeout(retoursCoche.get(bouton));
  if (!bouton.dataset.libelle) bouton.dataset.libelle = bouton.innerHTML;
  bouton.classList.add("fait");
  bouton.innerHTML = `${COCHE}<span class="reg-fait-txt">${texte}</span>`;
  tracer(bouton);
  retoursCoche.set(bouton, setTimeout(() => {
    if (!bouton.isConnected) return;
    bouton.classList.remove("fait", "trace");
    bouton.innerHTML = bouton.dataset.libelle;
    delete bouton.dataset.libelle;
  }, 1800));
}

function exporterCarnet(bouton) {
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
  cocher(bouton, "Exporté");
  vibrer("tic");
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
  /* Les photos de l'ancien journal ne servent plus à rien, mais « Annuler » les
     rendrait utiles : la purge attend la fin du délai (elle relit l'état, donc
     ne touche à rien si le carnet est revenu). */
  setTimeout(() => import("./journal.js").then(m => m.purgerOrphelines()).catch(() => {}), 9000);
}
