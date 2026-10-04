/* Sauvegarde du carnet : le fichier d'export, la normalisation de tout état reçu (stockage, fichier, autre appareil) et l'aperçu de ce qu'un import remplacerait. */

import { CONVIVES_JOURNAL_MAX, CONVIVES_MAX } from "./adaptation.js";

/* Un fichier importé, le stockage du navigateur et la version d'un autre
   appareil viennent de l'extérieur : on ne leur fait confiance ni pour leur
   forme ni pour leurs clés. Ce module ne touche ni `document` ni `localStorage`,
   il s'importe donc sous Node et se teste sans navigateur. */

/* Ce qui décrit l'appareil et non le carnet : les minuteurs qui tournent ici et
   les réglages de ce téléphone survivent à un import. */
const DE_L_APPAREIL = ["timers", "reglages"];

/* Sans ces champs les vues ne se dessinent pas (un filtre absent masquerait
   toutes les recettes) : un fichier qui les omet reçoit les valeurs de départ
   de l'état. Les minuteurs, eux, restent ceux de l'appareil. */
const VIDES = {
  portions: {}, checked: {}, notes: {}, cooked: {}, choices: {}, addons: {}, cooking: {},
  menu: [], extras: [], filter: "Toutes", query: "", fondQuery: "", hintCoursesOff: false
};

const INTERDITES = new Set(["__proto__", "constructor", "prototype"]);

const estObjet = v => v !== null && typeof v === "object" && !Array.isArray(v);
const estTexte = v => typeof v === "string";
const estNombre = v => typeof v === "number" && Number.isFinite(v);
const jourValide = v => estTexte(v) && /^\d{4}-\d{2}-\d{2}$/.test(v);
const heureValide = v => estTexte(v) && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

/* ---------- Normaliser un état ----------
   Chaque normaliseur rend la valeur propre, ou `undefined` quand le champ entier
   est inutilisable. Une valeur déjà bien formée ressort identique : normaliser
   deux fois ne change rien, ce dont la synchro a besoin pour ne pas croire à une
   modification. Mieux vaut perdre une entrée que tout le carnet (refus en bloc)
   ou, pire, une vue qui ne se dessine plus (acceptation en bloc). */

const liste = (v, f) => Array.isArray(v) ? v.map(f).filter(x => x !== undefined) : undefined;

const dico = (v, f) => {
  if (!estObjet(v)) return undefined;
  const sortie = {};
  for (const [cle, x] of Object.entries(v)) {
    if (INTERDITES.has(cle)) continue;
    const propre = f(x);
    if (propre !== undefined) sortie[cle] = propre;
  }
  return sortie;
};

const textes = v => Array.isArray(v) ? v.filter(estTexte) : [];
const chaine = v => estTexte(v) ? v : undefined;
const convivesJournal = v => estNombre(v) ? Math.min(CONVIVES_JOURNAL_MAX, Math.max(1, Math.round(v))) : 1;

/* La composition d'une recette (menu et repas passés) : ses choix, ses
   suppléments, ses portions. Toujours présents, sans quoi `[...e.addons]` plante. */
const composition = e => ({
  choices: dico(e.choices, chaine) ?? {},
  addons: textes(e.addons),
  portions: estNombre(e.portions) && e.portions > 0 ? e.portions : null
});

/* Une entrée de menu nomme sa recette (les anciens menus, une liste
   d'identifiants, sont convertis par migrer() ensuite) et porte une clé unique :
   sans clé, ou avec une clé déjà prise, on en tire une neuve. */
function entreeMenu(e, ctx) {
  if (estTexte(e)) return e;
  if (!estObjet(e) || !estTexte(e.rid)) return undefined;
  const k = estTexte(e.k) && e.k && !ctx.cles.has(e.k) ? e.k : cleDe(e, ctx);
  ctx.cles.add(k);
  return { ...e, k, ...composition(e) };
}

/* La clé d'une entrée qui n'en a pas (ou en double). Un générateur imposé (les
   tests) passe avant ; sinon elle est DÉRIVÉE de l'entrée et de sa place : la
   même version reçue deux fois donne les mêmes clés, donc la même fusion et pas
   de redessin à chaque relève. Le préfixe « r » la distingue des clés d'appareil
   (« m… »), et un rang de plus écarte les deux entrées strictement identiques. */
function cleDe(e, ctx) {
  if (ctx.genererCle) return ctx.genererCle();
  const empreinte = hacher(JSON.stringify([ctx.rang++, e.rid, e.choices ?? null, e.addons ?? null, e.portions ?? null]));
  let k = "r" + empreinte;
  while (ctx.cles.has(k)) k += "x";
  return k;
}

/* Empreinte FNV-1a de 32 bits en base 36 : de quoi dériver une clé, pas de la sécurité. */
function hacher(texte) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i++) { h ^= texte.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}

function repasPasse(e) {
  if (!estObjet(e) || !estTexte(e.id) || !jourValide(e.date)) return undefined;
  const entrees = liste(e.entrees, x => estObjet(x) && estTexte(x.rid) ? { ...x, ...composition(x) } : undefined);
  return entrees && { ...e, convives: convivesJournal(e.convives), entrees };
}

function entreeJournal(e) {
  if (!estObjet(e) || !estTexte(e.id) || !estTexte(e.rid) || !jourValide(e.date)) return undefined;
  return { ...e, convives: convivesJournal(e.convives), note: estTexte(e.note) ? e.note : "", photo: e.photo === true };
}

/* Le repas : un réglage invalide est retiré, lireRepas() le remplace par sa valeur de départ. */
function repas(v) {
  if (!estObjet(v)) return undefined;
  const sortie = {};
  for (const [cle, x] of Object.entries(v)) {
    if (INTERDITES.has(cle)) continue;
    if (cle === "convives") { if (estNombre(x) && x >= 1 && x <= CONVIVES_MAX) sortie.convives = Math.round(x); }
    else if (cle === "heure") { if (x === "" || heureValide(x)) sortie.heure = x; }   // vide : l'heure effacée, que la frise réclame
    else if (cle === "date") { if (x === "" || jourValide(x)) sortie.date = x; }
    else if (cle === "exclus") { if (Array.isArray(x)) sortie.exclus = textes(x); }
    else sortie[cle] = x;
  }
  return sortie;
}

/* Un minuteur sans identifiant, sans recette ou sans heure de fin ne sonnerait jamais juste. */
function minuteur(t) {
  if (!estObjet(t) || !estTexte(t.id) || !estTexte(t.rid) || !estNombre(t.end) || !estNombre(t.step)) return undefined;
  return { ...t, label: estTexte(t.label) ? t.label : "", emoji: estTexte(t.emoji) ? t.emoji : "" };
}

const NORMALISEURS = {
  menu: (v, ctx) => liste(v, e => entreeMenu(e, ctx)),
  extras: v => liste(v, e => estObjet(e) && estTexte(e.id) && estTexte(e.name) ? { ...e } : undefined),
  timers: v => liste(v, minuteur),
  journal: v => liste(v, entreeJournal),
  historique: v => liste(v, repasPasse),
  repas,
  notes: v => dico(v, chaine),
  notesPerso: v => dico(v, x => estObjet(x) && estTexte(x.txt) ? { ...x } : undefined),
  checked: v => dico(v, x => x ? true : undefined),
  cooked: v => dico(v, x => estObjet(x) && estNombre(x.count) ? { ...x, count: Math.max(0, x.count), last: estNombre(x.last) ? x.last : null } : undefined),
  ordreRayons: v => Array.isArray(v) ? textes(v) : undefined,
  portions: v => dico(v, x => estNombre(x) && x > 0 ? x : undefined),
  choices: v => dico(v, c => dico(c, chaine)),
  addons: v => dico(v, a => Array.isArray(a) ? textes(a) : undefined),
  cooking: v => dico(v, x => estObjet(x) && estNombre(x.step) && estNombre(x.at) ? { ...x } : undefined),
  reglages: v => dico(v, x => x),
  filter: chaine,
  query: chaine,
  fondQuery: chaine,
  hintCoursesOff: v => typeof v === "boolean" ? v : undefined
};

/* → une copie propre de `o` ({} si ce n'est pas un objet). Un champ connu de
   mauvaise forme est écarté, ses entrées invalides aussi ; un champ inconnu —
   ajouté par une version plus récente du carnet — est gardé tel quel.
   `appareil: false` retire en plus ce qui est propre à l'appareil (minuteurs,
   réglages), pour un fichier ou une version venue d'ailleurs. */
export function normaliserEtat(o, { genererCle = null, appareil = true } = {}) {
  if (!estObjet(o)) return {};
  const ctx = { genererCle, cles: new Set(), rang: 0 };
  const sortie = {};
  for (const [cle, valeur] of Object.entries(o)) {
    if (INTERDITES.has(cle) || (!appareil && DE_L_APPAREIL.includes(cle))) continue;
    const normaliseur = NORMALISEURS[cle];
    if (!normaliseur) {
      try { sortie[cle] = structuredClone(valeur); } catch { /* non copiable : écartée */ }
      continue;
    }
    const propre = normaliseur(valeur, ctx);
    if (propre !== undefined) sortie[cle] = propre;
  }
  return sortie;
}

export function nomFichier(date = new Date()) {
  const deux = n => String(n).padStart(2, "0");
  return `carnet-cuisine-${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}.json`;
}

export const contenuExport = etat => JSON.stringify(etat, null, 2);

/* → { donnees } ou { erreur }. */
export function lireSauvegarde(texte, genererCle) {
  let brut;
  try { brut = JSON.parse(texte); } catch { return { erreur: "Ce fichier n'est pas un fichier JSON lisible" }; }
  if (!estObjet(brut)) return { erreur: "Ce fichier ne ressemble pas à un carnet de cuisine" };
  const donnees = normaliserEtat(brut, { genererCle, appareil: false });
  if (!Object.keys(donnees).some(cle => cle in NORMALISEURS)) return { erreur: "Ce fichier ne ressemble pas à un carnet de cuisine" };
  return { donnees: { ...structuredClone(VIDES), ...donnees } };
}

const compte = v => Array.isArray(v) ? v.length : estObjet(v) ? Object.keys(v).length : 0;

/* Les lignes de l'aperçu : ce que le carnet contient, ce que le fichier
   contiendrait. Une ligne vide des deux côtés ne s'affiche pas. */
const LIGNES = [
  ["Recettes au menu", "menu"],
  ["Articles libres", "extras"],
  ["Recettes notées", "notes"],
  ["Notes personnelles", "notesPerso"],
  ["Recettes cuisinées", "cooked"],
  ["Repas passés", "historique"],
  ["Journal", "journal"]
];

export function apercu(actuel, importe) {
  return LIGNES
    .map(([libelle, cle]) => ({ libelle, actuel: compte(actuel[cle]), importe: compte(importe[cle]) }))
    .filter(l => l.actuel || l.importe);
}

/* Remplace le contenu de l'état en place (les vues et la synchro en gardent la
   référence), en conservant ce qui est propre à l'appareil. */
export function remplacerEtat(etat, donnees) {
  const gardes = Object.fromEntries(DE_L_APPAREIL.filter(c => c in etat).map(c => [c, etat[c]]));
  for (const cle of Object.keys(etat)) delete etat[cle];
  Object.assign(etat, structuredClone(donnees), gardes);
}

/* L'état tel qu'il était : pour « Annuler », qui rend tout, minuteurs compris. */
export const instantane = etat => structuredClone(etat);

export function restaurerEtat(etat, photo) {
  for (const cle of Object.keys(etat)) delete etat[cle];
  Object.assign(etat, structuredClone(photo));
}
