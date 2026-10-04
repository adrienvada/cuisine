/* La liste de courses calculée depuis le menu : fusion des quantités par rayon et nombre d'articles restants. */

import { state } from "./etat.js";
import { WEIGHT_UNITS, fmtQty, fmtUnit } from "./format.js";
import { byId, effectiveIngredients } from "./recettes.js";

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
      const scaled = qty == null ? null : qty * f;
      if (!map.has(key)) {
        map.set(key, { key, label, unit, qty: scaled, qtyText, rayon: ing.rayon, notes: note ? [note] : [], optional: !!ing.optional, addon: !!ing.addon });
      } else {
        const it = map.get(key);
        if (it.qty != null && scaled != null && it.unit === unit) it.qty += scaled;
        else if (it.qty == null && scaled != null) { it.qty = scaled; it.unit = unit; }
        if (note && !it.notes.includes(note)) it.notes.push(note);
        if (!it.qtyText && qtyText) it.qtyText = qtyText;
        it.optional = it.optional && !!ing.optional;
        it.addon = it.addon && !!ing.addon;
      }
    }
  }
  for (const it of map.values()) {
    if (it.qty != null && !WEIGHT_UNITS.includes(it.unit)) it.qty = Math.ceil(it.qty);
  }
  return [...map.values()];
}

export function courseQtyStr(it) {
  if (it.qty != null) return `${fmtQty(it.qty)} ${fmtUnit(it.unit, it.qty)}`.trim();
  return it.qtyText || "";
}

/* Nombre d'articles qu'il reste à prendre — le badge de l'onglet Courses. */
export function courseTodo() {
  return buildCourseList().filter(i => !state.checked[i.key]).length
    + state.extras.filter(x => !state.checked["x-" + x.id]).length;
}
