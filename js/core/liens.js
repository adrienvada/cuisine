/* Une version de recette dans une adresse : portions, choix et suppléments, de ou vers une requête (`?p=8&c=garniture:olives-feta&a=tomates-sechees`). */

import { PORTIONS_MAX, PORTIONS_MIN } from "./adaptation.js";

/* Ce qui s'écarte des valeurs par défaut, et seulement cela : un lien sans
   réglage reste le lien nu d'avant. Les choix valent « identifiant:option »,
   un paramètre par choix ; les suppléments se séparent par des virgules.
   Les identifiants des recettes sont en minuscules et tirets : rien à encoder. */
export function requeteDeVersion(r, conf = {}) {
  const q = [];
  const p = conf.portions;
  if (p != null && p !== r.portions.base) q.push(`p=${p}`);
  for (const c of r.choices || []) {
    const o = (conf.choices || {})[c.id];
    if (o && o !== c.options[0].id && c.options.some(x => x.id === o)) q.push(`c=${c.id}:${o}`);
  }
  const a = (r.addons || []).map(x => x.id).filter(id => (conf.addons || []).includes(id));
  if (a.length) q.push(`a=${a.join(",")}`);
  return q.join("&");
}

/* L'autre sens, pour une adresse reçue d'on ne sait où : tout ce qui n'est pas
   reconnu est ignoré, jamais corrigé. Ne renvoie que les réglages valides. */
export function versionDeRequete(r, requete) {
  const q = new URLSearchParams(requete || "");
  const v = {};
  const p = q.get("p");
  if (p && /^\d{1,2}$/.test(p) && +p >= PORTIONS_MIN && +p <= PORTIONS_MAX) v.portions = +p;
  const choices = {};
  for (const brut of q.getAll("c")) {
    const i = brut.indexOf(":");
    if (i < 1) continue;
    const c = (r.choices || []).find(x => x.id === brut.slice(0, i));
    if (c && c.options.some(o => o.id === brut.slice(i + 1))) choices[c.id] = brut.slice(i + 1);
  }
  if (Object.keys(choices).length) v.choices = choices;
  const voulus = q.getAll("a").flatMap(x => x.split(","));
  const addons = (r.addons || []).map(x => x.id).filter(id => voulus.includes(id));
  if (addons.length) v.addons = addons;
  return v;
}
