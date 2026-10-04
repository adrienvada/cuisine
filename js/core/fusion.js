/* Fusion à trois voies de l'état synchronisé : pure, sans navigateur ni réseau, donc testable sous Node. */

/* Les champs qui voyagent entre appareils. Tout le reste de l'état (recherche,
   minuteurs, étape de cuisine, réglages…) reste propre à l'appareil. */
export const CHAMPS_SYNCHRO = ["menu", "checked", "extras", "notes", "cooked", "notesPerso", "repas", "historique", "journal", "ordreRayons"];

/* Les listes dont chaque entrée porte sa clé. */
const CLES_LISTES = { menu: "k", extras: "id", historique: "id", journal: "id" };

/* Égalité profonde : deux appareils n'écrivent pas leurs clés dans le même ordre,
   et comparer des chaînes JSON y verrait une différence. */
export function egal(a, b) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a).filter(k => a[k] !== undefined);
  const kb = Object.keys(b).filter(k => b[k] !== undefined);
  return ka.length === kb.length && ka.every(k => egal(a[k], b[k]));
}

const estDico = v => !!v && typeof v === "object" && !Array.isArray(v);

/* « Celui qui a changé l'emporte » : la règle d'une valeur prise en bloc. */
function celuiQuiAChange(base, local, serveur) {
  if (egal(local, serveur)) return local;
  if (egal(local, base)) return serveur;
  return local;                               // changé des deux côtés : le local
}

/* Liste à clé : un ajout ou un retrait fait d'un côté se retrouve dans le
   résultat. Une entrée retirée d'un côté et modifiée de l'autre est retirée : un
   retrait est un geste net, la modification peut se refaire. L'ordre est celui
   d'ici, les ajouts de l'autre appareil viennent à la suite. */
export function fusionnerListe(base, local, serveur, cle) {
  const cleDe = e => (e && typeof e === "object" && e[cle] != null) ? String(e[cle]) : JSON.stringify(e);
  const indexer = liste => new Map((Array.isArray(liste) ? liste : []).map(e => [cleDe(e), e]));
  const b = indexer(base), l = indexer(local), s = indexer(serveur);
  const sortie = [];
  for (const [k, el] of l) {
    if (s.has(k)) {
      const es = s.get(k);
      if (egal(el, es)) sortie.push(el);
      else if (b.has(k) && egal(el, b.get(k))) sortie.push(es);   // seul le serveur l'a modifiée
      else sortie.push(el);                                       // modifiée ici, ou des deux côtés
    } else if (!b.has(k)) sortie.push(el);                        // ajout local ; sinon retirée côté serveur
  }
  for (const [k, es] of s) if (!l.has(k) && !b.has(k)) sortie.push(es);   // ajout du serveur ; sinon retirée ici
  return sortie;
}

/* Dictionnaire : clé par clé. Une clé changée d'un côté seulement suit ce côté
   (y compris sa disparition) ; changée des deux côtés, `departager` choisit, et
   à défaut le local. */
export function fusionnerDico(base, local, serveur, departager) {
  const b = estDico(base) ? base : {}, l = estDico(local) ? local : {}, s = estDico(serveur) ? serveur : {};
  const sortie = {};
  for (const k of new Set([...Object.keys(l), ...Object.keys(s)])) {
    const vb = b[k], vl = l[k], vs = s[k];
    let v;
    if (egal(vl, vs)) v = vl;
    else if (egal(vl, vb)) v = vs;
    else if (egal(vs, vb)) v = vl;
    else v = departager && vl !== undefined && vs !== undefined ? departager(vl, vs) : vl;
    if (v !== undefined) sortie[k] = v;
  }
  return sortie;
}

/* Deux appareils ont cuisiné la même recette chacun de leur côté : on garde le
   plus grand compte et la date la plus récente, sans quoi l'un effacerait l'autre. */
const departagerCuisine = (a, b) => {
  const derniere = Math.max(a?.last ?? 0, b?.last ?? 0);
  return { ...a, ...b, count: Math.max(a?.count ?? 0, b?.count ?? 0), last: derniere || (a?.last ?? b?.last ?? null) };
};

/* Une note perso écrite des deux côtés : la plus récente. À égalité, le local. */
const departagerNote = (a, b) => ((b?.at ?? 0) > (a?.at ?? 0) ? b : a);

function fusionnerChamp(nom, base, local, serveur) {
  // Un côté qui n'a jamais eu le champ n'a rien à dire.
  if (local === undefined) return serveur;
  if (serveur === undefined) return local;
  if (nom in CLES_LISTES) {
    if (!Array.isArray(local) || !Array.isArray(serveur)) return celuiQuiAChange(base, local, serveur);
    return fusionnerListe(base, local, serveur, CLES_LISTES[nom]);
  }
  if (nom === "ordreRayons" || !estDico(local) || !estDico(serveur)) return celuiQuiAChange(base, local, serveur);
  if (nom === "cooked") return fusionnerDico(base, local, serveur, departagerCuisine);
  if (nom === "notesPerso") return fusionnerDico(base, local, serveur, departagerNote);
  return fusionnerDico(base, local, serveur);       // checked, notes, repas (champ par champ)
}

/* base : la dernière version serveur connue de cet appareil ; local : l'état
   d'ici ; serveur : la version qui vient d'être relue. Un champ absent des trois
   reste absent. Ce que le serveur porte hors des champs connus (une version plus
   récente de l'appli) traverse sans être touché. */
export function fusionner(base, local, serveur) {
  const b = base || {}, l = local || {}, s = serveur || {};
  const sortie = {};
  for (const [k, v] of Object.entries(s)) if (!CHAMPS_SYNCHRO.includes(k)) sortie[k] = v;
  for (const nom of CHAMPS_SYNCHRO) {
    const v = fusionnerChamp(nom, b[nom], l[nom], s[nom]);
    if (v !== undefined) sortie[nom] = v;
  }
  return sortie;
}

/* Un champ vide vaut un champ absent : l'état par défaut porte `notes: {}` là où
   une base plus ancienne n'a rien, et ce n'est pas une modification. */
const vide = v => v == null || (Array.isArray(v) ? !v.length : estDico(v) && !Object.keys(v).length);

export function memesDonnees(a, b) {
  const x = a || {}, y = b || {};
  return CHAMPS_SYNCHRO.every(nom => (vide(x[nom]) && vide(y[nom])) || egal(x[nom], y[nom]));
}
