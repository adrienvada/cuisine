/* Le partage : liens vers les pages d'aperçu, texte des résumés, feuille de partage du téléphone ou copie. */

import { CERTITUDES, fondById } from "../core/fonds.js";
import { fmtQty, fmtTime, fmtUnit, scaleQty } from "../core/format.js";
import { requeteDeVersion } from "../core/liens.js";
import { compo, entreeDe, menuEntrees, portionsOf } from "../core/menu.js";
import { byId, effectiveIngredients, effectiveSteps, tempsDe, versionSummary } from "../core/recettes.js";
import { toast } from "./toast.js";

const SITE_FALLBACK = "https://adrienvada.fr/cuisine/";

/* Racine du site, telle qu'on y accède réellement (domaine, sous-dossier…). */
export function siteUrl() {
  if (!/^https?:$/.test(location.protocol)) return SITE_FALLBACK;
  return location.origin + location.pathname.replace(/[^/]*$/, "");
}

/* Chaque recette a une page `r/<id>.html` : elle porte la photo et le titre
   pour l'aperçu dans les messageries, puis renvoie vers l'application.
   (Générée par `node tools/generer-pages-partage.mjs`.)
   Le lien porte la version partagée (portions, choix, suppléments) : celui qui
   l'ouvre retrouve le plat tel qu'on le lui a envoyé, pas la recette nue. */
export function recipeUrl(r, conf = compo(r.id)) {
  const q = requeteDeVersion(r, conf);
  return siteUrl() + "r/" + r.id + ".html" + (q ? "?" + q : "");
}

export function copyText(text, msg) {
  if (!navigator.clipboard) return toast("Copie impossible sur cet appareil");
  navigator.clipboard.writeText(text).then(() => toast(msg)).catch(() => toast("Copie impossible"));
}

export async function shareOrCopy(data, copied) {
  if (navigator.share) {
    try { await navigator.share(data); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  copyText([data.text, data.url].filter(Boolean).join("\n"), copied);
}

/* Résumé d'une recette : de quoi lire l'essentiel dans la conversation,
   aux portions de la version `conf` (par défaut la composition courante), et le
   lien pour le pas-à-pas illustré. */
export function recipeShareText(r, conf = compo(r.id)) {
  const p = portionsOf(r, conf), f = p / r.portions.base, t = tempsDe(r, conf);
  const times = [];
  if (t.prep) times.push(`Préparation ${fmtTime(t.prep)}`);
  if (t.repos) times.push(`${r.reposLabel || "Repos"} ${fmtTime(t.repos)}`);
  times.push(t.cuisson != null ? `Cuisson ${fmtTime(t.cuisson)}` : "Sans cuisson");

  const lines = [`${r.emoji} ${r.title}`, r.subtitle];
  if (r.discovered) lines.push(`📍 Découverte ${r.discovered}`);
  lines.push("", times.join(" · "));
  const vs = versionSummary(r, conf);
  if (vs) lines.push(`Version : ${vs}`);
  lines.push("", `Pour ${p} ${r.portions.label} :`);
  for (const ing of effectiveIngredients(r, conf)) {
    const q = scaleQty(ing.qty, ing.unit, f, ing.entier);
    const qty = q != null ? `${fmtQty(q)} ${fmtUnit(ing.unit, q)}`.trim() : (ing.qtyText || "");
    lines.push(`• ${ing.name}${qty ? ` — ${qty}` : ""}${ing.addon ? " (supplément)" : ing.optional ? " (optionnel)" : ""}`);
  }
  lines.push("", `Les ${effectiveSteps(r, conf).length} étapes en pas-à-pas, avec les minuteurs :`);
  return lines.join("\n");
}

/* `k` : la clé d'une entrée du menu. Une carte du menu partage sa version à elle
   (garniture, suppléments, portions), pas le brouillon de la fiche — deux cakes
   au même repas n'envoient pas le même lien. Sans `k`, la composition courante. */
export function shareRecipe(id, k = null) {
  const r = byId(id);
  if (!r) return;
  const conf = (k && entreeDe(k)) || compo(r.id);
  shareOrCopy({ title: r.title, text: recipeShareText(r, conf), url: recipeUrl(r, conf) }, "Recette copiée !");
}

export function shareMenu() {
  const list = menuEntrees();
  if (!list.length) return toast("Le menu est vide");
  const lines = ["🌿 Au menu du carnet de cuisine", ""];
  for (const { e, r } of list) {
    const vs = versionSummary(r, e);
    lines.push(`${r.emoji} ${r.title} — ${portionsOf(r, e)} ${r.portions.label}${vs ? ` (${vs})` : ""}`, recipeUrl(r, e), "");
  }
  shareOrCopy({ title: "Au menu", text: lines.join("\n").trim() }, "Menu copié !");
}

/* Un fondamental se partage comme une recette : par sa page d'aperçu de `f/`,
   qui porte ses balises Open Graph puis renvoie dans l'application. */
export function fondUrl(f) { return siteUrl() + "f/" + f.id + ".html"; }

export function fondShareText(f) {
  const c = CERTITUDES[f.certitude] || CERTITUDES.partiel;
  const lines = [`${f.emoji} ${f.t}`, f.accroche, "", "Pourquoi ça marche :", f.pourquoi.split("\n\n")[0]];
  if (f.certitude !== "etabli") lines.push(`(${c.l} — ${c.d})`);
  if (f.reperes && f.reperes.length) lines.push("", "À retenir :", ...f.reperes.map(x => `• ${x}`));
  lines.push("", "Le détail et les cas particuliers :");
  return lines.join("\n");
}

export function shareFond(id) {
  const f = fondById(id);
  if (!f) return;
  shareOrCopy({ title: f.t, text: fondShareText(f), url: fondUrl(f) }, "Fondamental copié !");
}

/* Posé sur une vignette ou une carte du menu, le bouton ne doit pas ouvrir la recette. */
export function onShareClick(e) {
  const b = e.target.closest("[data-share]");
  if (!b) return;
  e.preventDefault();
  e.stopPropagation();
  shareRecipe(b.dataset.share, b.dataset.shareK);
}
