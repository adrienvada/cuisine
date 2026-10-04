/* Le journal des recettes cuisinées : date, convives, note et photo du résultat, sur la fiche et à la fin du mode cuisine. */

import { CONVIVES_JOURNAL_MAX } from "../core/adaptation.js";
import { etatDeSecours, save, state } from "../core/etat.js";
import { aujourdhui, dateEnClair, entreesDe } from "../core/journal.js";
import { html, raw } from "../core/html.js";
import { ICON } from "../core/icones.js";
import { byId } from "../core/recettes.js";
import { fermerFeuille, ouvrirFeuille } from "../ui/feuilles.js";
import { toast } from "../ui/toast.js";

/* ---------- Photos : IndexedDB, sur l'appareil seulement ---------- */

/* Les photos pèsent trop lourd pour le carnet synchronisé : elles restent dans
   la base de l'appareil, la clé est l'identifiant de l'entrée. Sur un autre
   téléphone l'entrée arrive donc avec `photo: true` mais sans image locale. */
const BASE = "carnet-photos";
const MAGASIN = "photos";
const GRAND_COTE = 1200;
const QUALITE = 0.8;

let baseOuverte = null;

function ouvrirBase() {
  if (!baseOuverte) {
    baseOuverte = new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(BASE, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(MAGASIN);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (e) { reject(e); }
    });
    /* Un échec d'ouverture (navigation privée…) ne doit pas condamner les appels suivants. */
    baseOuverte.catch(() => { baseOuverte = null; });
  }
  return baseOuverte;
}

async function transaction(mode, faire) {
  const base = await ouvrirBase();
  return new Promise((resolve, reject) => {
    const tx = base.transaction(MAGASIN, mode);
    const req = faire(tx.objectStore(MAGASIN));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}

const photoEnregistrer = (id, blob) => transaction("readwrite", m => m.put(blob, id));
const photoLire = id => transaction("readonly", m => m.get(id)).catch(() => undefined);
const photoSupprimer = id => transaction("readwrite", m => m.delete(id)).catch(() => {});

/* ---------- Photos orphelines ----------
   Une entrée retirée ailleurs (synchro) ou remplacée (import) laisse sa photo
   dans la base de l'appareil, et le stockage d'un navigateur est compté. Ici, les
   photos qu'aucune entrée ne réclame sont supprimées. */

/* Des photos que le journal ne cite pas encore, ou plus pour un instant : celle
   qu'on est en train de ranger (l'entrée n'existe qu'après), celle d'une entrée
   supprimée dont « Annuler » est encore possible. Une purge qui passerait là les
   perdrait pour de bon. */
const protegees = new Set();

export async function purgerOrphelines() {
  /* Un état de secours (stockage illisible) a un journal vide qui ne dit rien
     des photos : les effacer détruirait ce qu'on pourrait encore récupérer. */
  if (etatDeSecours() || !Array.isArray(state.journal)) return;
  try {
    const cles = await transaction("readonly", m => m.getAllKeys());
    /* Relu après l'attente : l'état a pu changer pendant que la base s'ouvrait. */
    const citees = new Set(state.journal.map(e => e.id));
    for (const cle of cles) if (!citees.has(cle) && !protegees.has(cle)) await photoSupprimer(cle);
  } catch (e) {
    console.error("Purge des photos orphelines impossible :", e);
  }
}

/* Une version venue d'un autre appareil a pu retirer des entrées du journal. */
if (typeof document !== "undefined") document.addEventListener("carnet-synchro", () => { purgerOrphelines(); });

/* Réduit la photo avant de la ranger : 1 200 px de grand côté, JPEG. Un cliché de
   téléphone fait plusieurs mégaoctets, et le stockage d'un navigateur est compté. */
async function reduirePhoto(fichier) {
  let source;
  try {
    source = await createImageBitmap(fichier, { imageOrientation: "from-image" });
  } catch {
    source = await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(fichier);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image illisible")); };
      img.src = url;
    });
  }
  const l = source.width || source.naturalWidth, h = source.height || source.naturalHeight;
  const echelle = Math.min(1, GRAND_COTE / Math.max(l, h));
  const toile = document.createElement("canvas");
  toile.width = Math.max(1, Math.round(l * echelle));
  toile.height = Math.max(1, Math.round(h * echelle));
  const ctx = toile.getContext("2d");
  ctx.fillStyle = "#fff";   // un PNG transparent deviendrait noir en JPEG
  ctx.fillRect(0, 0, toile.width, toile.height);
  ctx.drawImage(source, 0, 0, toile.width, toile.height);
  if (source.close) source.close();
  return new Promise((resolve, reject) =>
    toile.toBlob(b => b ? resolve(b) : reject(new Error("réduction impossible")), "image/jpeg", QUALITE));
}

/* Dates et tri des entrées : purs, dans core/journal.js (testables sous Node). */
const entrees = () => (state.journal ??= []);

const nouvelId = () => "j" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const CORBEILLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v5m4-5v5"/></svg>';
const APPAREIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L8 6H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3.5"/></svg>';

const libelleConvives = n => `${n} ${n > 1 ? "convives" : "convive"}`;

/* ---------- La section de la fiche ---------- */

/* La zone dessinée en dernier : une entrée ajoutée depuis une feuille (ou depuis le
   mode cuisine, où il n'y a pas de zone) met à jour la fiche si elle est à l'écran. */
let zoneCourante = null;
let urlsVignettes = [];

const libererUrls = () => { urlsVignettes.forEach(u => URL.revokeObjectURL(u)); urlsVignettes = []; };

function ligneHtml(e) {
  return html`<li class="jr-entree" data-id="${e.id}">
    ${e.photo ? raw(html`<button type="button" class="jr-photo" data-photo="${e.id}" aria-label="Voir la photo en grand"><span class="jr-attente">${raw(APPAREIL)}</span></button>`) : ""}
    <div class="jr-corps">
      <p class="jr-date">${dateEnClair(e.date)}<span class="jr-convives">${libelleConvives(e.convives)}</span></p>
      ${e.note ? raw(html`<p class="jr-note">${e.note}</p>`) : ""}
    </div>
    <button type="button" class="jr-suppr" data-suppr="${e.id}" aria-label="Supprimer cette entrée">${raw(CORBEILLE)}</button>
  </li>`;
}

export function dessinerJournal(zone, r) {
  if (!zone) return;
  zoneCourante = { zone, r };
  zone.classList.add("section", "jr-zone");
  const liste = entreesDe(r.id);
  zone.innerHTML = html`
    <h2><span class="h-title"><span class="h-deco">${raw(ICON.chef)}</span>Journal</span></h2>
    ${liste.length
      ? raw(html`<ul class="jr-liste">${liste.map(e => raw(ligneHtml(e)))}</ul>`)
      : raw(html`<p class="jr-vide">Rien de noté pour l'instant : garde ici la date, la note et la photo de chaque fois que tu la cuisines.</p>`)}
    <button type="button" class="btn secondary jr-ajout" id="jr-ajout">Ajouter au journal</button>`;
  zone.querySelector("#jr-ajout").addEventListener("click", () => ouvrirJournal(r.id));
  zone.querySelector(".jr-liste")?.addEventListener("click", e => {
    const suppr = e.target.closest("[data-suppr]");
    if (suppr) return supprimerEntree(suppr.dataset.suppr);
    const photo = e.target.closest("[data-photo]");
    if (photo) voirPhoto(photo.dataset.photo);
  });
  chargerVignettes(zone);
}

/* Les photos arrivent après le texte : la fiche s'affiche tout de suite, et une
   photo absente de cet appareil se dit au lieu de rester un trou. */
async function chargerVignettes(zone) {
  libererUrls();
  for (const bouton of zone.querySelectorAll("[data-photo]")) {
    const blob = await photoLire(bouton.dataset.photo);
    if (!bouton.isConnected) continue;
    if (!blob) {
      bouton.classList.add("absente");
      bouton.disabled = true;
      bouton.setAttribute("aria-label", "Photo sur un autre appareil");
      bouton.innerHTML = '<span class="jr-attente">photo sur un autre appareil</span>';
      continue;
    }
    const url = URL.createObjectURL(blob);
    urlsVignettes.push(url);
    bouton.innerHTML = `<img src="${url}" alt="Photo du plat" decoding="async">`;
  }
}

function actualiser() {
  if (zoneCourante && zoneCourante.zone.isConnected) dessinerJournal(zoneCourante.zone, zoneCourante.r);
}

/* Supprimer retire l'entrée tout de suite ; la photo, elle, ne part qu'une fois le
   délai d'« Annuler » écoulé — sinon l'annulation ne pourrait rien rendre. */
const DELAI_ANNULER = 5000;

function supprimerEntree(id) {
  const liste = entrees();
  const i = liste.findIndex(e => e.id === id);
  if (i < 0) return;
  const [entree] = liste.splice(i, 1);
  save();
  actualiser();
  protegees.add(entree.id);
  const purge = setTimeout(() => {
    protegees.delete(entree.id);
    if (entree.photo) photoSupprimer(entree.id);
  }, DELAI_ANNULER + 1000);
  toast("Entrée supprimée", {
    action: "Annuler",
    duree: DELAI_ANNULER,
    surAction: () => {
      clearTimeout(purge);
      protegees.delete(entree.id);
      /* Une synchro a pu changer la liste entre-temps : on remet à la même place, bornée. */
      const courante = entrees();
      if (!courante.some(e => e.id === entree.id)) courante.splice(Math.min(i, courante.length), 0, entree);
      save();
      actualiser();
    }
  });
}

/* ---------- La photo en grand ---------- */

async function voirPhoto(id) {
  const blob = await photoLire(id);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const fond = document.createElement("div");
  fond.className = "sheet-backdrop jr-voir";
  fond.innerHTML = html`<div class="sheet" role="dialog" aria-label="Photo du plat">
    <div class="sheet-grip"></div>
    <img class="jr-grande" src="${url}" alt="Photo du plat">
    <button type="button" class="btn secondary jr-fermer" id="jr-fermer">Fermer</button>
  </div>`;
  fond.addEventListener("click", e => {
    if (e.target === fond || e.target.closest("#jr-fermer")) fermerFeuille();
  });
  ouvrirFeuille(fond, () => URL.revokeObjectURL(url));
}

/* ---------- La feuille d'ajout ---------- */

export function ouvrirJournal(rid) {
  const r = byId(rid);
  if (!r) return;
  let convives = Math.max(1, Math.min(CONVIVES_JOURNAL_MAX, Math.round((state.repas && state.repas.convives) || (state.portions && state.portions[rid]) || (r.portions && r.portions.base) || 2)));
  let photo = null;          // le blob déjà réduit, prêt à ranger
  let preparation = null;    // la réduction en cours : « Enregistrer » l'attend plutôt que de perdre la photo
  let urlApercu = null;

  const fond = document.createElement("div");
  fond.className = "sheet-backdrop jr-fond";
  fond.innerHTML = html`<div class="sheet jr-feuille" role="dialog" aria-label="Ajouter au journal">
    <div class="sheet-grip"></div>
    <h3>Ajouter au journal</h3>
    <p class="sheet-sub">${r.title}</p>

    <label class="jr-champ" for="jr-date">Date</label>
    <input class="jr-saisie" type="date" id="jr-date" value="${aujourdhui()}" max="${aujourdhui()}">

    <span class="jr-champ">Pour combien ?</span>
    <div class="jr-pas">
      <button type="button" id="jr-moins" aria-label="Un convive de moins">−</button>
      <span id="jr-val" aria-live="polite"></span>
      <button type="button" id="jr-plus" aria-label="Un convive de plus">+</button>
    </div>

    <label class="jr-champ" for="jr-note">Note</label>
    <textarea class="jr-saisie" id="jr-note" rows="3" placeholder="Ce qui a marché, ce que tu changerais…"></textarea>

    <span class="jr-champ">Photo</span>
    <div class="jr-photo-zone">
      <label class="btn secondary jr-fichier" for="jr-fichier">${raw(APPAREIL)}<span id="jr-fichier-txt">Prendre ou choisir une photo</span></label>
      <input class="jr-fichier-in" type="file" id="jr-fichier" accept="image/*" capture="environment">
      <img class="jr-apercu" id="jr-apercu" alt="Aperçu de la photo" hidden>
    </div>

    <button type="button" class="btn primary sheet-add" id="jr-ok">Enregistrer</button>
    <button type="button" class="btn secondary jr-annuler" id="jr-non">Annuler</button>
  </div>`;

  const $ = s => fond.querySelector(s);
  const dessinerConvives = () => { $("#jr-val").textContent = libelleConvives(convives); };
  dessinerConvives();

  $("#jr-moins").addEventListener("click", () => { convives = Math.max(1, convives - 1); dessinerConvives(); });
  $("#jr-plus").addEventListener("click", () => { convives = Math.min(CONVIVES_JOURNAL_MAX, convives + 1); dessinerConvives(); });

  $("#jr-fichier").addEventListener("change", async e => {
    const fichier = e.target.files && e.target.files[0];
    if (!fichier) return;
    $("#jr-fichier-txt").textContent = "Préparation de la photo…";
    preparation = reduirePhoto(fichier);
    try {
      photo = await preparation;
      if (urlApercu) URL.revokeObjectURL(urlApercu);
      urlApercu = URL.createObjectURL(photo);
      $("#jr-apercu").src = urlApercu;
      $("#jr-apercu").hidden = false;
      $("#jr-fichier-txt").textContent = "Changer la photo";
    } catch {
      photo = null;
      $("#jr-fichier-txt").textContent = "Prendre ou choisir une photo";
      toast("Cette photo n'a pas pu être lue");
    }
  });

  $("#jr-ok").addEventListener("click", async () => {
    const bouton = $("#jr-ok");
    if (bouton.disabled) return;
    bouton.disabled = true;   // une photo à ranger prend un instant : pas de double entrée
    if (preparation) await preparation.catch(() => {});
    const saisie = $("#jr-date").value;
    const entree = {
      id: nouvelId(),
      rid,
      /* Le champ plafonne à aujourd'hui, mais une saisie au clavier peut le dépasser. */
      date: /^\d{4}-\d{2}-\d{2}$/.test(saisie) && saisie <= aujourdhui() ? saisie : aujourdhui(),
      convives,
      note: $("#jr-note").value.trim(),
      photo: false
    };
    let echecPhoto = false;
    /* La photo existe dans la base avant que l'entrée existe dans l'état : d'ici
       là, une purge des orphelines la prendrait pour une des siennes. */
    protegees.add(entree.id);
    let fini = false;
    try {
      if (photo) {
        try { await photoEnregistrer(entree.id, photo); entree.photo = true; }
        catch { echecPhoto = true; }   // stockage refusé : l'entrée garde sa date et sa note
      }
      entrees().push(entree);
      save();
      fermerFeuille();
      actualiser();
      toast(echecPhoto ? "Ajouté au journal, sans la photo (stockage indisponible)" : "Ajouté au journal");
      fini = true;
    } finally {
      protegees.delete(entree.id);
      if (!fini) bouton.disabled = false;   // une erreur ne laisse pas la feuille figée
    }
  });
  $("#jr-non").addEventListener("click", () => fermerFeuille());
  fond.addEventListener("click", e => { if (e.target === fond) fermerFeuille(); });

  ouvrirFeuille(fond, () => { if (urlApercu) URL.revokeObjectURL(urlApercu); });
}

export { aujourdhui, dateEnClair, entreesDe };
