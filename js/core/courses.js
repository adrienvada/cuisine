/* La liste de courses calculée depuis le menu : fusion des quantités par rayon, provenance de chaque quantité, placard, ordre des rayons et nombre d'articles restants. */

import { save, state } from "./etat.js";
import { WEIGHT_UNITS, fmtQty, fmtUnit, scaleQty } from "./format.js";
import { byId, effectiveIngredients } from "./recettes.js";

/* Le fond de placard est une donnée globale (js/placard.js) : on la lit à
   l'appel, et un cid hors de la liste — ou une page sans le fichier — n'y est
   simplement pas. */
const dansPlacard = cle => typeof PLACARD !== "undefined" && PLACARD.includes(cle);

/* Une quantité de plus pour une unité : deux unités différentes ne s'écrasent
   jamais, elles s'alignent (« 1 bouquet + 1 botte »). */
function ajouterPart(parts, unit, qty) {
  if (qty == null) return;
  const p = parts.find(x => x.unit === unit);
  if (p) p.qty += qty; else parts.push({ unit, qty });
}

function ajouterTexte(textes, texte) {
  if (texte && !textes.includes(texte)) textes.push(texte);
}

/* Chaque article porte :
   - parts   les quantités chiffrées, une par unité (qty et unit en reprennent la première) ;
   - textes  les quantités écrites (« 1 pincée »), qu'on ne sait pas additionner ;
   - sources d'où vient chaque quantité, recette par recette — « Pour quoi ? ». */
export function buildCourseList() {
  const map = new Map();
  for (const e of state.menu) {
    const r = byId(e.rid);
    if (!r) continue;
    const f = (e.portions ?? r.portions.base) / r.portions.base;
    for (const ing of effectiveIngredients(r, e)) {
      if (ing.course === false) continue;
      const shop = ing.shop || {};
      const key = ing.cid || ing.name.toLowerCase();
      const label = shop.label || ing.name;
      const qty = "qty" in shop ? shop.qty : ing.qty;
      const unit = "unit" in shop ? shop.unit : (ing.unit || "");
      const qtyText = shop.qtyText != null ? shop.qtyText : (qty == null ? ing.qtyText : null);
      const note = shop.note || null;
      /* Une quantité donnée par `shop` est déjà celle du magasin (« 1 boîte ») :
         elle suit les portions telle quelle. Sinon c'est celle de la recette,
         arrondie comme sur la fiche — grammes entiers, œufs entiers — pour que la
         liste n'annonce pas 66¾ g ni 2 œufs là où la fiche en met 1. */
      const scaled = qty == null ? null : ("qty" in shop ? qty * f : scaleQty(qty, unit, f, ing.entier));
      let it = map.get(key);
      if (!it) {
        it = { key, label, rayon: ing.rayon, notes: [], parts: [], textes: [], sources: [], optional: !!ing.optional, addon: !!ing.addon, placard: dansPlacard(key) };
        map.set(key, it);
      } else {
        it.optional = it.optional && !!ing.optional;
        it.addon = it.addon && !!ing.addon;
      }
      if (note && !it.notes.includes(note)) it.notes.push(note);
      ajouterPart(it.parts, unit, scaled);
      ajouterTexte(it.textes, qtyText);
      let src = it.sources.find(s => s.rid === r.id);
      if (!src) { src = { rid: r.id, titre: r.title, parts: [], textes: [] }; it.sources.push(src); }
      ajouterPart(src.parts, unit, scaled);
      ajouterTexte(src.textes, qtyText);
    }
  }
  for (const it of map.values()) {
    for (const p of it.parts) if (!WEIGHT_UNITS.includes(p.unit)) p.qty = Math.ceil(p.qty);
    it.qty = it.parts.length ? it.parts[0].qty : null;
    it.unit = it.parts.length ? it.parts[0].unit : "";
    it.qtyText = it.textes[0] || null;
  }
  return [...map.values()];
}

/* « 1 bouquet + 1 botte » : toutes les quantités d'une ligne de courses, aucune perdue.
   (La quantité d'un seul ingrédient d'une fiche, c'est libelleQuantite de core/cuisine.js.) */
export function quantitesDe({ parts = [], textes = [] }) {
  return [
    ...parts.map(p => `${fmtQty(p.qty)} ${fmtUnit(p.unit, p.qty)}`.trim()),
    ...textes
  ].join(" + ");
}

export const courseQtyStr = it => quantitesDe(it);

/* Ce qu'il reste à acheter — le badge de l'onglet Courses. Le placard n'y entre
   pas : c'est à vérifier, pas à acheter. */
export function courseTodo() {
  return buildCourseList().filter(i => !i.placard && !state.checked[i.key]).length
    + state.extras.filter(x => !state.checked["x-" + x.id]).length;
}

/* ---------- Coches périmées ----------
   Une coche ne vaut que pour la liste où on l'a faite : dès qu'un article en
   sort (recette retirée, menu vidé), elle disparaît, sans quoi elle réapparaîtrait
   toute seule le jour où il revient. Les articles libres gardent la leur tant
   qu'ils existent. L'élagage rappelle save() pour que le résultat soit rangé ; le
   drapeau coupe la boucle que ce rappel déclencherait par l'abonnement. */
let enElagage = false;

export function elaguerCoches() {
  if (enElagage || !state.checked) return;
  const cochees = Object.keys(state.checked);
  if (!cochees.length) return;
  const presentes = new Set(buildCourseList().map(i => i.key));
  for (const x of state.extras) presentes.add("x-" + x.id);
  const perimees = cochees.filter(k => !presentes.has(k));
  if (!perimees.length) return;
  for (const k of perimees) delete state.checked[k];
  enElagage = true;
  try { save(); } finally { enElagage = false; }
}

/* ---------- Ordre des rayons ----------
   Chacun range son magasin à sa façon : l'ordre enregistré (state.ordreRayons)
   suit son parcours. « Autre » reste en dernier, et un rayon que l'ordre ne
   connaît pas encore (un rayon ajouté depuis) se glisse après son prédécesseur
   dans RAYONS plutôt que de sauter en tête ou en queue. */
export function rayonsOrdonnes() {
  const ordre = (state.ordreRayons || []).filter((r, i, t) => r !== "Autre" && RAYONS.includes(r) && t.indexOf(r) === i);
  RAYONS.forEach((r, i) => {
    if (r === "Autre" || ordre.includes(r)) return;
    let apres = -1;
    for (let j = i - 1; j >= 0 && apres < 0; j--) apres = ordre.indexOf(RAYONS[j]);
    ordre.splice(apres + 1, 0, r);
  });
  return [...ordre, "Autre"];
}

/* Monte (-1) ou descend (+1) un rayon parmi ceux qu'on voit ; renvoie faux au
   bout de la course. Les rayons absents de la liste gardent leur place relative. */
export function deplacerRayon(nom, sens, visibles) {
  const ordre = rayonsOrdonnes().filter(r => r !== "Autre");
  const vus = ordre.filter(r => visibles.includes(r));
  const voisin = vus[vus.indexOf(nom) + sens];
  if (!voisin || !vus.includes(nom)) return false;
  ordre.splice(ordre.indexOf(nom), 1);
  ordre.splice(ordre.indexOf(voisin) + (sens > 0 ? 1 : 0), 0, nom);
  state.ordreRayons = [...ordre, "Autre"];
  save();
  return true;
}

/* Un tableau vide plutôt qu'un champ supprimé : « aucune préférence » est une
   valeur comme une autre, qui se synchronise ; un champ absent, la synchro le
   confondrait avec « jamais renseigné » et rendrait l'ancien ordre. */
export function reinitialiserOrdreRayons() {
  state.ordreRayons = [];
  save();
}
