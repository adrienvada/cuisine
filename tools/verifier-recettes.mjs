/* Vérifie la cohérence des données de recettes. Trois familles d'erreurs, toutes
   silencieuses à l'usage — l'application ne plante pas, elle affiche simplement
   quelque chose de faux :

   1. Ancrage des suppléments. Un supplément vise une étape par son index. Insérer
      ou découper une étape décale tout ce qui suit, et `effectiveSteps` borne un
      index hors limites au lieu de le signaler : le geste se retrouve accroché à
      la mauvaise étape, ou à la dernière. Un supplément visant un emplacement de
      choix (la vinaigrette) est presque toujours un décalage de ce genre.
   2. Minuteurs. Une durée annoncée dans un texte doit avoir son minuteur, et
      réciproquement un minuteur sans durée dans le texte laisse l'utilisateur
      deviner de quoi il retourne. Vaut aussi pour les versions alternatives et
      les suppléments.
   3. Ingrédients. Rayon connu (sinon l'article disparaît de la liste de courses)
      et `cid` présent (sinon les quantités ne fusionnent pas entre recettes).
   4. Quantités citées dans un texte. Elles doivent être entre accolades pour
      suivre le curseur de portions — {3 cl} — sinon elles restent figées et
      contredisent la colonne de gauche dès qu'on change le nombre de parts.
      Et quand la note détaille un ingrédient poste par poste (« {3 cl} pour la
      pâte + {7 cl} pour le moule »), la somme doit faire le compte.

   5. Fondamentaux. Une étape qui cite un mécanisme inexistant n'affiche rien du
      tout — la pastille disparaît en silence. Le catalogue lui-même doit être
      complet, et son identifiant part dans les liens partagés.
   6. Unités de courses. Un même article doit s'exprimer dans une seule unité
      côté courses, sinon la fusion jette une quantité.
   7. Placard. Chaque produit du fond de placard doit exister dans les recettes.
   8. Annotations des étapes. `ing` ne cite que des ingrédients de la recette, `four`
      est une température crédible sur une étape qui parle de four, `moule` a une
      forme connue et des dimensions positives.
   9. Logique culinaire. Un même `cid` porte un seul libellé de courses (la liste
      n'en affiche qu'un, celui de la première recette du menu), et se marque
      `entier: true` partout ou nulle part.
  10. Portions. Le label de portions d'une recette (« personnes », « verres »…) a son
      singulier dans SINGULIERS_PORTIONS (js/core/format.js) : sans lui, « 1 personnes ».

  11. Repos. Les étapes marquées `repos: true` (qui bloquent la suite) ont un
      minuteur, ne chauffent pas, et leur somme (version par défaut) est
      `times.repos` : la frise du rétroplanning et la carte annoncent la même
      attente. Une attente `repos: "pendant"` (qui court pendant qu'on fait la
      suite) a un minuteur, ne chauffe pas, n'entre pas dans `times.repos`, tient
      dans le temps de la recette et laisse une étape derrière elle.

   Ce que ce vérificateur ne fera JAMAIS : juger du contenu. Il ne réclame pas
   d'astuce, ne compte pas les rattachements, ne trouve pas qu'un fondamental
   orphelin est un problème — le carnet sert aussi de boîte de réception aux
   savoirs qui n'ont pas encore trouvé leur recette. Il n'attrape que ce qui
   fait afficher quelque chose de faux.

   Usage :  node tools/verifier-recettes.mjs        (code de sortie 1 si erreur) */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SINGULIERS_PORTIONS } from "../js/core/format.js";
import { EMPLACEMENTS, TONS as TONS_FIGURES, TYPES as TYPES_FIGURES, balisesEquilibrees, figureHtml, usagesInvalides } from "../js/ui/figures.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(ROOT, "js", "recipes.js"), "utf8");
const RECIPES = new Function(`${src}; return RECIPES;`)();
const RAYONS = new Function(`${src}; return RAYONS;`)();
const psrc = readFileSync(join(ROOT, "js", "placard.js"), "utf8");
const PLACARD = new Function(`${psrc}; return PLACARD;`)();
const fsrc = readFileSync(join(ROOT, "js", "fondamentaux.js"), "utf8");
const FONDAMENTAUX = new Function(`${fsrc}; return FONDAMENTAUX;`)();
const FAMILLES = new Function(`${fsrc}; return FAMILLES;`)();
const FONDAMENTAL_RENAMES = new Function(`${fsrc}; return FONDAMENTAL_RENAMES;`)();

const figsrc = readFileSync(join(ROOT, "js", "figures.js"), "utf8");
const FIGURES = new Function(`${figsrc}; return FIGURES;`)();
const THERMOMETRE = new Function(`${figsrc}; return THERMOMETRE;`)();
const cssFigures = readFileSync(join(ROOT, "css", "figures.css"), "utf8");

const DUREE = /(\d+(?:\s*à\s*\d+)?)\s*(minutes?|min\b|heures?|h\b)/i;
const POSTES = ["prep", "repos", "cuisson"];
/* Une quantité mise à l'échelle : {3 cl}, {1-2 c. à s.}, {2}. */
const MARQUEE = /\{(\d+(?:[.,]\d+)?)(?:\s*[–-]\s*(\d+(?:[.,]\d+)?))?\s*([^}]*)\}/g;
/* La même, laissée nue — ce que l'on cherche à débusquer. On scanne le texte
   privé de ses accolades, donc pas besoin d'exclure celles-ci ici. Les unités
   de longueur sont absentes de la liste : une bande de 1,5 cm de large reste
   large de 1,5 cm qu'on soit deux ou douze. */
const NUE = /\b(\d+(?:[.,]\d+)?)\s*(g|kg|ml|cl|l|c\. à s\.|c\. à c\.|sachets?|bocaux?|bocal|pots?|bottes?|bouquets?|gousses?)\b/g;
/* « 2 cl par verre » se règle tout seul : c'est une quantité par portion. Et
   « salés à 10 g par litre » est une concentration — la mettre à l'échelle des
   convives la rendrait fausse. Dans les deux cas, la quantité reste nue. */
const PAR_PORTION = /\bpar\s+(verre|personne|part|portion|convive|pièce|sachet|litre|kilo|kg\b|l\b)/i;
/* Ce qu'on achète tout fait : le poids annoncé décrit l'emballage. */
const CONTENANTS = ["bocal", "boîte", "brique", "pot", "petit pot", "sachet", "rouleau", "botte", "bouquet"];
const nombre = n => parseFloat(String(n).replace(",", "."));

/* « une boîte de 400 g », « {1 bocal}) de 400 g » : le poids décrit l'emballage du
   commerce, il ne change pas avec les portions — c'est le nombre de boîtes qui change. */
const POIDS_EMBALLAGE = /(?:boîtes?|bocaux?|bocal|briques?|pots?|sachets?)\}?\)?\s+(?:de|d['’])\s*\d+(?:[.,]\d+)?\s*(?:g|kg|ml|cl|l)\b/gi;

function quantitesNues(txt) {
  if (!txt || PAR_PORTION.test(txt)) return [];
  return [...txt.replace(POIDS_EMBALLAGE, "…").replace(MARQUEE, "…").matchAll(NUE)].map(m => m[0]);
}
const erreurs = [];
const ko = m => erreurs.push(m);

/* 10. Portions. Le label est au pluriel dans les données ; « 1 personnes » se lit
   mal, donc libellePortions() (js/core/format.js) a besoin du singulier de chacun. */
for (const r of RECIPES) {
  if (!SINGULIERS_PORTIONS[r.portions.label]) ko(`${r.id} : le label de portions « ${r.portions.label} » n'a pas de singulier dans SINGULIERS_PORTIONS (js/core/format.js)`);
}

for (const r of RECIPES) {
  /* 1. Ancrage des suppléments */
  for (const a of r.addons || []) {
    if (!a.step) continue;
    const cible = r.steps[a.step.i];
    if (!cible) ko(`${r.id} / +${a.id} vise l'étape ${a.step.i}, la recette n'en a que ${r.steps.length}`);
    else if (cible.choice) ko(`${r.id} / +${a.id} vise l'étape ${a.step.i}, qui est l'emplacement du choix « ${cible.choice} » — index décalé ?`);
  }

  /* 2. Minuteurs — étapes, versions alternatives et suppléments */
  const minutables = [
    ...(r.addons || []).filter(a => a.step).map(a => [`${r.id} / +${a.id}`, a.step]),
    ...r.steps.flatMap((s, i) => s.choice
      ? r.choices.find(c => c.id === s.choice).options.map(o => [`${r.id}[${i}] version ${o.id}`, o.step])
      : [[`${r.id}[${i}] ${s.t}`, s]])
  ];
  for (const [ref, s] of minutables) {
    const m = DUREE.exec(s.txt || "");
    if (m && !s.timer) ko(`${ref} annonce « ${m[0]} » sans minuteur`);
    if (s.timer && !m) ko(`${ref} a un minuteur de ${s.timer} min alors que son texte n'annonce aucune durée`);
  }
  /* Un supplément minuté doit dire à quel poste son temps s'ajoute, sinon il
     gonfle le total sans apparaître dans aucune des fourchettes affichées — sauf
     une attente « pendant », qui court en parallèle et n’ajoute rien. */
  for (const a of r.addons || []) {
    if (a.step && a.step.timer && a.step.repos !== "pendant" && !POSTES.includes(a.step.adds)) {
      ko(`${r.id} / +${a.id} a un minuteur mais pas de \`adds\` valide (${POSTES.join(", ")})`);
    }
  }

  /* Même règle pour les options de choix : une option plus longue que la version
     par défaut dit où son minuteur s'ajoute (`adds`), sinon la carte annonce un
     temps que la frise du rétroplanning, elle, additionne autrement. Et une
     option sans `adds` dont le minuteur dépasse ce que `times` laisse de place
     est une option qui aurait dû en avoir un. */
  const total = (r.times.prep || 0) + (r.times.repos || 0) + (r.times.cuisson || 0);
  for (const c of r.choices || []) {
    const i = r.steps.findIndex(s => s.choice === c.id);
    /* Une attente « pendant » court en parallèle : elle n'ajoute rien au temps. */
    const minuteurs = (o) => r.steps.reduce((n, s, j) => {
      const e = j === i ? o.step : s;
      return n + (e.repos === "pendant" ? 0 : e.timer || 0);
    }, 0);
    for (const o of c.options) {
      const ref = `${r.id}[${i}] version ${o.id}`;
      if (o.step.adds && !POSTES.includes(o.step.adds)) ko(`${ref} : \`adds\` invalide (${POSTES.join(", ")})`);
      if (o.step.adds && !o.step.timer) ko(`${ref} : \`adds\` sans minuteur`);
      const annonce = total + (o.step.adds && o.step.timer ? o.step.timer : 0);
      if (minuteurs(o) > annonce) {
        ko(`${ref} : ses minuteurs durent ${minuteurs(o)} min, plus que les ${annonce} min que la carte annonce — il manque un \`adds\` ?`);
      }
    }
  }

  /* 3. Ingrédients, y compris ceux des versions alternatives et des suppléments */
  const lots = [
    [r.id, r.ingredients],
    ...(r.choices || []).flatMap(c => c.options.map(o => [`${r.id} / ${o.id}`, o.ingredients])),
    ...(r.addons || []).map(a => [`${r.id} / +${a.id}`, a.ingredients])
  ];
  for (const [ref, ings] of lots) for (const i of ings || []) {
    if (i.course === false) continue;
    if (!RAYONS.includes(i.rayon)) ko(`${ref} → « ${i.name} » : rayon inconnu (${i.rayon})`);
    if (!i.cid) ko(`${ref} → « ${i.name} » : cid manquant, les quantités ne fusionneront pas`);
  }

  /* 4. Quantités citées dans les textes */
  const textes = [
    ...lots.flatMap(([ref, ings]) => (ings || []).filter(i => i.note).map(i => [`${ref} → « ${i.name} » (note)`, i.note])),
    ...minutables.flatMap(([ref, s]) => [[ref, s.txt], ...(s.tip ? [[`${ref} astuce`, s.tip.txt]] : [])])
  ];
  for (const [ref, txt] of textes) {
    const nues = quantitesNues(txt);
    if (nues.length) ko(`${ref} cite « ${nues.join(" », « ")} » sans accolades : la quantité ne suivra pas les portions`);
  }

  /* La note qui détaille un ingrédient poste par poste doit tomber juste :
     c'est exactement le décalage qu'on a vu sur l'huile de la focaccia. */
  for (const [ref, ings] of lots) for (const i of ings || []) {
    if (!i.note || i.qty == null) continue;
    const parts = [...i.note.matchAll(MARQUEE)]
      .filter(m => !m[2] && m[3].trim() === (i.unit || "").trim())
      .map(m => nombre(m[1]));
    if (parts.length < 2) continue;
    const somme = parts.reduce((a, b) => a + b, 0);
    if (Math.abs(somme - i.qty) > 0.01) {
      ko(`${ref} → « ${i.name} » : le détail de la note fait ${somme} ${i.unit} alors que la quantité est de ${i.qty} ${i.unit}`);
    }
  }

  /* Les notes de courses se fondent entre recettes sans être mises à l'échelle :
     une quantité y serait fausse dès qu'on change les portions — sauf quand on
     achète un contenant, où « environ 400 g » décrit le bocal, pas la recette. */
  for (const [ref, ings] of lots) for (const i of ings || []) {
    const note = (i.shop || {}).note;
    if (CONTENANTS.includes(((i.shop || {}).unit || "").trim())) continue;
    if (note && quantitesNues(note).length) {
      ko(`${ref} → « ${i.name} » : la note de courses cite « ${quantitesNues(note).join(" », « ")} », qui ne suivra pas les portions`);
    }
  }
}

/* ---------- 5. Fondamentaux ---------- */

const CERTITUDES = ["etabli", "partiel", "empirique"];
const REQUIS = ["id", "t", "emoji", "famille", "accroche", "pourquoi", "certitude"];
const vus = new Set();

for (const f of FONDAMENTAUX) {
  const ref = `fondamental ${f.id || "(sans id)"}`;
  for (const k of REQUIS) if (!f[k] || !String(f[k]).trim()) ko(`${ref} : champ « ${k} » manquant`);
  if (f.id && vus.has(f.id)) ko(`${ref} : identifiant en double`);
  vus.add(f.id);
  if (f.id && !/^[a-z0-9-]+$/.test(f.id)) ko(`${ref} : l'identifiant part dans les liens partagés, il doit rester en minuscules sans accent (a-z, 0-9, tiret)`);
  if (f.certitude && !CERTITUDES.includes(f.certitude)) ko(`${ref} : certitude « ${f.certitude} » inconnue (${CERTITUDES.join(", ")})`);
  if (f.famille && !FAMILLES.includes(f.famille)) ko(`${ref} : famille « ${f.famille} » absente de FAMILLES`);
  /* Les accolades sont réservées aux quantités mises à l'échelle : le titre d'un
     fondamental passe par `scaleText` via sa pastille, il serait réécrit. */
  const tous = [f.t, f.accroche, f.pourquoi, f.piege || "", ...(f.reperes || []),
    ...(f.cas || []).flatMap(c => [c.q, c.r])].join(" ");
  if (/[{}]/.test(tous)) ko(`${ref} : accolade dans un texte — elle serait prise pour une quantité à mettre à l'échelle`);
  for (const c of f.cas || []) if (!c.q || !c.r) ko(`${ref} : un cas est incomplet (il faut « q » et « r »)`);
}

for (const [ancien, actuel] of Object.entries(FONDAMENTAL_RENAMES)) {
  if (!FONDAMENTAUX.some(f => f.id === actuel)) ko(`FONDAMENTAL_RENAMES : « ${ancien} » renvoie vers « ${actuel} », qui n'existe pas`);
}

/* ---------- 5 bis. Figures des savoirs (js/figures.js) ---------- */

/* Les classes que css/figures.css définit : un SVG libre n'en invente pas. */
const CLASSES_FG = new Set([...cssFigures.matchAll(/\.(fg-[a-z0-9-]+)/g)].map(m => m[1]));
const SANS_COULEUR = [
  [/#[0-9a-fA-F]{3,8}\b/, "une couleur #hex"],
  [/\b(?:rgba?|hsla?|hwb|lab|lch|oklch|oklab)\s*\(/i, "une couleur rgb()/hsl()"],
  [/\bstyle\s*=/i, "un attribut style"],
  [/<\s*(?:script|foreignObject|image|use|a)\b|\son[a-z]+\s*=|javascript:|\bhref\s*=/i, "du balisage actif (script, image, lien, évènement)"]   // <use href="#fg-sym-…"> excepté : voir usagesInvalides
];
const COULEUR_OK = /^(?:none|currentColor|inherit|url\(#[\w@-]+\))$/;

/* Toutes les chaînes d'une figure, avec leur chemin : pour y chercher accolades et couleurs. */
function chaines(valeur, chemin = "", sortie = []) {
  if (typeof valeur === "string") sortie.push([chemin, valeur]);
  else if (Array.isArray(valeur)) valeur.forEach((v, i) => chaines(v, `${chemin}[${i}]`, sortie));
  else if (valeur && typeof valeur === "object") for (const [k, v] of Object.entries(valeur)) chaines(v, chemin ? `${chemin}.${k}` : k, sortie);
  return sortie;
}

/* Les sections de js/figures.js : une par famille, dans l'ordre de FAMILLES, avec leurs repères. */
const reperesFigures = FAMILLES.map(fam => ({ fam, debut: figsrc.indexOf(`/* ===== ${fam} ===== */`), fin: figsrc.indexOf(`/* ===== fin ${fam} ===== */`) }));
for (const r of reperesFigures) {
  if (r.debut < 0 || r.fin < r.debut) ko(`js/figures.js : repères « ===== ${r.fam} ===== » / « ===== fin ${r.fam} ===== » absents ou dans le désordre`);
}
reperesFigures.forEach((r, i) => {
  if (i && r.debut >= 0 && reperesFigures[i - 1].fin >= r.debut) ko(`js/figures.js : la section « ${r.fam} » doit suivre « ${reperesFigures[i - 1].fam} »`);
});
const familleDeCle = cle => {
  const pos = figsrc.indexOf(`\nFIGURES["${cle}"] =`);
  const r = reperesFigures.find(x => pos > x.debut && pos < x.fin);
  return r ? r.fam : null;
};

let nbFigures = 0;
for (const [cle, liste] of Object.entries(FIGURES)) {
  const fond = FONDAMENTAUX.find(f => f.id === cle);
  if (!fond) { ko(`FIGURES["${cle}"] : aucun fondamental de cet identifiant`); continue; }
  const section = familleDeCle(cle);
  if (section !== fond.famille) ko(`FIGURES["${cle}"] : doit s'écrire dans la section « ${fond.famille} » de js/figures.js${section ? ` (elle est dans « ${section} »)` : ""}`);
  if (!Array.isArray(liste) || !liste.length) { ko(`FIGURES["${cle}"] : un tableau de figures est attendu`); continue; }
  const paragraphes = fond.pourquoi.split("\n\n").length;
  liste.forEach((fig, i) => {
    nbFigures++;
    const ref = `FIGURES["${cle}"][${i}]${fig && fig.titre ? ` « ${fig.titre} »` : ""}`;
    if (!fig || typeof fig !== "object") return ko(`${ref} : un objet est attendu`);
    if (!TYPES_FIGURES.includes(fig.type)) ko(`${ref} : type « ${fig.type} » inconnu (${TYPES_FIGURES.join(", ")})`);
    for (const k of ["titre", "legende", "alt"]) if (!fig[k] || !String(fig[k]).trim()) ko(`${ref} : champ « ${k} » manquant`);
    if (fig.alt && String(fig.alt).trim().length < 40) ko(`${ref} : l'alt doit décrire la figure en entier (au moins une phrase)`);
    if (!EMPLACEMENTS.includes(fig.ou)) ko(`${ref} : « ou » vaut « ${fig.ou} » (${EMPLACEMENTS.join(", ")})`);
    if (fig.apres !== undefined) {
      if (fig.ou !== "pourquoi") ko(`${ref} : « apres » n'a de sens que pour ou: "pourquoi"`);
      else if (!Number.isInteger(fig.apres) || fig.apres < 1 || fig.apres > paragraphes) ko(`${ref} : « apres » vaut ${fig.apres}, la fiche a ${paragraphes} paragraphe(s) dans « Pourquoi ça marche »`);
    }
    if (fig.qualitative && !/qualitative/i.test(fig.legende || "")) ko(`${ref} : une figure qualitative le dit dans sa légende (« allure qualitative », « illustration qualitative »)`);
    if (fig.type === "etapes" && !(fig.etapes || []).length) ko(`${ref} : aucune étape`);
    else if (fig.type === "etapes" && (fig.etapes.length < 2 || fig.etapes.length > 5)) ko(`${ref} : 2 à 5 étapes (il y en a ${fig.etapes.length})`);
    if (fig.type === "comparaison" && !((fig.panneaux || []).length >= 2 && fig.panneaux.length <= 3)) ko(`${ref} : deux ou trois panneaux`);
    /* Les options des types calculés : des valeurs permises, des bornes qui se tiennent. */
    const cotes = [...(fig.zones || []), ...(fig.marqueurs || [])].map(z => z.cote).filter(c => c !== undefined);
    if (fig.type === "echelle" && cotes.some(c => !["haut", "bas"].includes(c))) ko(`${ref} : « cote » vaut « haut » ou « bas »`);
    if (fig.type === "echelle") for (const c of fig.coupures || []) if (!(Number.isFinite(c.de) && Number.isFinite(c.a) && c.a > c.de && c.de > fig.min && c.a < fig.max)) ko(`${ref} : une coupure { de, a } doit tomber dans la règle, avec a > de`);
    if (fig.colonnes !== undefined && (fig.type !== "comparaison" || ![1, 2, 3].includes(fig.colonnes))) ko(`${ref} : « colonnes » (1, 2 ou 3) n'a de sens que pour une comparaison`);
    if (fig.type === "courbe") {
      for (const z of fig.zonesY || []) if (!(Number.isFinite(z.de) && Number.isFinite(z.a) && z.a > z.de)) ko(`${ref} : une zone y { de, a } a besoin de deux nombres, a > de`);
      for (const r of [...(fig.reperes || []), ...(fig.zonesY || [])]) if (r.ancre !== undefined && !["gauche", "droite"].includes(r.ancre)) ko(`${ref} : « ancre » vaut « gauche » ou « droite »`);
    }
    if (fig.type === "barres") for (const b of fig.barres || []) if ((b.de !== undefined || b.a !== undefined) && !(Number.isFinite(b.de) && Number.isFinite(b.a) && b.a >= b.de)) ko(`${ref} : une plage { de, a } a besoin de deux nombres, a ≥ de`);
    for (const [chemin, brut] of chaines(fig)) {
      if (/[{}]/.test(brut)) ko(`${ref} : accolade dans ${chemin} — réservée aux quantités mises à l'échelle`);
      /* Un <use> n'est permis que pour un symbole partagé : href="#fg-sym-NOM" d'un symbole qui existe. */
      for (const pb of usagesInvalides(brut)) ko(`${ref} : ${pb} (dans ${chemin})`);
      const txt = brut.replace(/<use\b[^>]*>/g, "");
      for (const [re, quoi] of SANS_COULEUR) if (re.test(txt)) ko(`${ref} : ${quoi} dans ${chemin} — aucune couleur en dur, des classes fg-… seulement`);
      if (/(?:^|\.)corps$/.test(chemin)) {
        for (const m of brut.matchAll(/\b(fill|stroke|stop-color|flood-color|color)\s*=\s*"([^"]*)"/g)) {
          if (!COULEUR_OK.test(m[2])) ko(`${ref} : ${m[1]}="${m[2]}" dans ${chemin} — une classe fg-… à la place`);
        }
        if (!balisesEquilibrees(brut)) ko(`${ref} : balises mal fermées dans ${chemin}`);
        for (const m of brut.matchAll(/\bclass\s*=\s*"([^"]*)"/g)) {
          for (const c of m[1].split(/\s+/).filter(Boolean)) if (!CLASSES_FG.has(c)) ko(`${ref} : classe « ${c} » inconnue de css/figures.css (dans ${chemin})`);
        }
      }
    }
    /* Le dessin lui-même : une figure qui ne se calcule pas ne s'affiche pas. */
    if (TYPES_FIGURES.includes(fig.type)) {
      try { figureHtml(fig, { uid: "v", strict: true }); } catch (e) { ko(`${ref} : ne se dessine pas — ${e.message}`); }
    }
  });
}

/* Le thermomètre du carnet (THERMOMETRE, section « Vue d'ensemble ») : chaque repère
   désigne une fiche réelle, une température, un ton connu. */
if (!Array.isArray(THERMOMETRE) || !THERMOMETRE.length) ko("js/figures.js : THERMOMETRE doit être un tableau de repères");
else {
  const posThermo = figsrc.indexOf("\nconst THERMOMETRE =");
  const debutVue = figsrc.indexOf("/* ===== Vue d'ensemble ===== */"), finVue = figsrc.indexOf("/* ===== fin Vue d'ensemble ===== */");
  if (debutVue < 0 || posThermo < debutVue || posThermo > finVue) ko("js/figures.js : THERMOMETRE s'écrit dans la section « Vue d'ensemble »");
  THERMOMETRE.forEach((r, i) => {
    const ref = `THERMOMETRE[${i}]${r && r.label ? ` « ${r.label.slice(0, 40)} »` : ""}`;
    if (!r || typeof r !== "object") return ko(`${ref} : un objet est attendu`);
    if (!Number.isFinite(r.de)) ko(`${ref} : « de » doit être un nombre`);
    if (r.a !== undefined && !(Number.isFinite(r.a) && r.a > r.de)) ko(`${ref} : « a » doit être un nombre supérieur à « de »`);
    if (r.ouvert !== undefined && (r.ouvert !== "haut" || r.a !== undefined)) ko(`${ref} : « ouvert » vaut « haut » et se passe de « a »`);
    if (r.ancre !== undefined && !(Number.isFinite(r.ancre) && r.ancre >= r.de && r.ancre <= (r.a ?? r.de))) ko(`${ref} : « ancre » doit tomber dans la zone`);
    if (!r.label || !String(r.label).trim()) ko(`${ref} : « label » manquant`);
    if (/[{}]/.test(r.label || "")) ko(`${ref} : accolade dans le label`);
    if (!TONS_FIGURES.includes(r.ton)) ko(`${ref} : ton « ${r.ton} » inconnu (${TONS_FIGURES.join(", ")})`);
    if (!FONDAMENTAUX.some(f => f.id === r.fond)) ko(`${ref} : la fiche « ${r.fond} » n'existe pas`);
  });
}

/* Chaque `fond` posé dans une recette doit tomber sur un fondamental réel :
   sinon la pastille disparaît sans un mot. */
const idsFond = o => (!o || !o.fond) ? [] : (Array.isArray(o.fond) ? o.fond : [o.fond]);
const connu = id => FONDAMENTAUX.some(f => f.id === (FONDAMENTAL_RENAMES[id] || id));
const tipsKo = [];

for (const r of RECIPES) {
  const porteurs = [
    ...r.steps.map((s, i) => [`${r.id}[${i}]`, s]),
    ...(r.choices || []).flatMap(c => c.options.map(o => [`${r.id} / ${o.id}`, o.step])),
    ...(r.addons || []).map(a => [`${r.id} / +${a.id}`, a.step])
  ];
  for (const [ref, s] of porteurs) {
    for (const id of idsFond(s)) if (!connu(id)) ko(`${ref} cite le fondamental « ${id} », qui n'existe pas`);
    if (s && s.tip && s.tip.k && !["chef", "savoir"].includes(s.tip.k)) {
      tipsKo.push(`${ref} : astuce de type « ${s.tip.k} » (attendu : chef ou savoir)`);
    }
  }
}
tipsKo.forEach(ko);

/* ---------- 6. Unité de courses unique par article ---------- */

/* La liste de courses n'additionne les quantités d'un même `cid` que si leurs
   unités sont identiques, et jette la seconde sinon : « gousses » + « gousse »
   perdait une gousse d'ail, « bouquet » + « botte » la botte de basilic. Pour
   chaque `cid`, l'unité côté courses (`shop.unit` si présente, sinon `unit`)
   doit donc être la même dans toutes les recettes, options et suppléments
   compris. Une unité vide ne compte pas (« 2 citrons » s'additionne avec tout),
   pas plus qu'une quantité de courses nulle : rien n'y est additionné, la
   quantité généreuse d'huile d'olive n'entre dans aucun total. */
const unitesParCid = new Map();
for (const r of RECIPES) {
  const lotsCourses = [
    [r.id, r.ingredients],
    ...(r.choices || []).flatMap(c => c.options.map(o => [`${r.id} / ${o.id}`, o.ingredients])),
    ...(r.addons || []).map(a => [`${r.id} / +${a.id}`, a.ingredients])
  ];
  for (const [ref, ings] of lotsCourses) for (const i of ings || []) {
    if (i.course === false || !i.cid) continue;
    const shop = i.shop || {};
    const qty = "qty" in shop ? shop.qty : i.qty;
    const unite = ("unit" in shop ? shop.unit : i.unit) || "";
    if (qty == null || !unite) continue;
    if (!unitesParCid.has(i.cid)) unitesParCid.set(i.cid, new Map());
    const parUnite = unitesParCid.get(i.cid);
    if (!parUnite.has(unite)) parUnite.set(unite, []);
    parUnite.get(unite).push(ref);
  }
}
for (const [cid, parUnite] of unitesParCid) {
  if (parUnite.size < 2) continue;
  const detail = [...parUnite].map(([u, refs]) => `« ${u} » (${refs.join(", ")})`).join(" contre ");
  ko(`${cid} : unités de courses différentes, une quantité sera perdue à la fusion — ${detail}. Harmoniser avec shop: { qty, unit }`);
}

/* ---------- 7. Placard ---------- */

/* Chaque produit de fond de placard est un `cid` d'ingrédient : sinon il ne
   matche rien et la liste « à vérifier » reste silencieusement incomplète. */
const cidsConnus = new Set(RECIPES.flatMap(r => [
  ...r.ingredients,
  ...(r.choices || []).flatMap(c => c.options.flatMap(o => o.ingredients || [])),
  ...(r.addons || []).flatMap(a => a.ingredients || [])
]).map(i => i.cid));
for (const cid of PLACARD) if (!cidsConnus.has(cid)) ko(`PLACARD : « ${cid} » n'est le cid d'aucun ingrédient des recettes`);
if (new Set(PLACARD).size !== PLACARD.length) ko("PLACARD : un cid figure deux fois");

/* ---------- 8. Annotations des étapes : ing, four, moule ---------- */

/* Ces champs nourrissent le mode cuisine (les ingrédients de l'étape), le
   préchauffage et les conflits de four au menu, l'adaptation au moule. Une
   référence qui ne tombe sur rien, ou un four qui ne chauffe pas, s'affichent
   sans rien dire : on les attrape ici. */
const FORMES_MOULE = { rond: ["diametre"], rectangle: ["largeur", "longueur"], cake: ["longueur"] };
const LIEN_FOUR = /four|enfourn/i;
let etapesSansIng = 0;
let etapesTotal = 0;

for (const r of RECIPES) {
  const connus = new Set([
    ...r.ingredients,
    ...(r.choices || []).flatMap(c => c.options.flatMap(o => o.ingredients || [])),
    ...(r.addons || []).flatMap(a => a.ingredients || [])
  ].map(i => i.cid || i.name));
  const etapes = [
    ...r.steps.map((s, i) => [`${r.id}[${i}]`, s]).filter(([, s]) => !s.choice),
    ...(r.choices || []).flatMap(c => c.options.map(o => [`${r.id} / ${o.id}`, o.step]))
  ];
  for (const [ref, s] of etapes) {
    etapesTotal++;
    if (!s.ing) etapesSansIng++;
    else if (!Array.isArray(s.ing)) ko(`${ref} : ing doit être une liste`);
    else for (const k of s.ing) if (!connus.has(k)) ko(`${ref} : ing cite « ${k} », qui n'est ni le cid ni le nom d'un ingrédient de la recette`);
    if ("prechauffe" in s) {
      if (typeof s.prechauffe !== "number" || !(s.prechauffe > s.four && s.prechauffe <= 300)) ko(`${ref} : prechauffe doit être une température en °C supérieure à four (reçu ${JSON.stringify(s.prechauffe)})`);
    }
    if ("four" in s) {
      if (typeof s.four !== "number" || !(s.four >= 50 && s.four <= 300)) ko(`${ref} : four doit être un nombre de °C entre 50 et 300 (reçu ${JSON.stringify(s.four)})`);
      if (!LIEN_FOUR.test(s.txt || "")) ko(`${ref} : four est renseigné mais le texte de l'étape ne parle ni de four ni d'enfourner`);
    }
  }
  if (r.moule) {
    const dims = FORMES_MOULE[r.moule.forme];
    if (!dims) ko(`${r.id} : forme de moule « ${r.moule.forme} » inconnue (${Object.keys(FORMES_MOULE).join(", ")})`);
    else for (const d of dims) {
      if (!(typeof r.moule[d] === "number" && r.moule[d] > 0)) ko(`${r.id} : moule.${d} doit être un nombre positif`);
    }
  }
}

/* ---------- 9. Référentiels d'ingrédients (allergènes, saisons, substitutions) ----------
   Indexés par cid : une clé qui ne tombe sur aucun ingrédient des recettes est
   une faute de frappe, et la donnée ne s'afficherait jamais. */

const cids = new Set();
for (const r of RECIPES) {
  const lots = [r.ingredients, ...(r.choices || []).flatMap(c => c.options.map(o => o.ingredients)),
    ...(r.addons || []).map(a => a.ingredients)];
  for (const l of lots) for (const i of l || []) if (i.cid) cids.add(i.cid);
}
const lire = (fichier, ...noms) => {
  const s = readFileSync(join(ROOT, "js", fichier), "utf8");
  return new Function(`${s}; return [${noms.join(", ")}];`)();
};
const [ALLERGENES_LISTE, ALLERGENES, NON_VEGETARIEN] = lire("allergenes.js", "ALLERGENES_LISTE", "ALLERGENES", "NON_VEGETARIEN");
const [SAISONS] = lire("saisons.js", "SAISONS");
const [SUBSTITUTIONS] = lire("substitutions.js", "SUBSTITUTIONS");
const idsAllergenes = ALLERGENES_LISTE.map(a => a.id);

for (const [cid, ids] of Object.entries(ALLERGENES)) {
  if (!cids.has(cid)) ko(`allergenes.js : « ${cid} » n'est le cid d'aucun ingrédient`);
  for (const id of ids) if (!idsAllergenes.includes(id)) ko(`allergenes.js : « ${cid} » cite l'allergène « ${id} », absent de ALLERGENES_LISTE`);
}
for (const cid of NON_VEGETARIEN) if (!cids.has(cid)) ko(`allergenes.js : NON_VEGETARIEN cite « ${cid} », cid inconnu`);
for (const [cid, mois] of Object.entries(SAISONS)) {
  if (!cids.has(cid)) ko(`saisons.js : « ${cid} » n'est le cid d'aucun ingrédient`);
  if (!Array.isArray(mois) || !mois.length || !mois.every(m => Number.isInteger(m) && m >= 1 && m <= 12)) {
    ko(`saisons.js : « ${cid} » doit lister des mois entiers de 1 à 12`);
  }
}
for (const [cid, liste] of Object.entries(SUBSTITUTIONS)) {
  if (!cids.has(cid)) ko(`substitutions.js : « ${cid} » n'est le cid d'aucun ingrédient`);
  for (const s of liste) {
    if (!s.par || !String(s.par).trim()) ko(`substitutions.js : « ${cid} » a une substitution sans « par »`);
    if (/[{}]/.test(`${s.par || ""} ${s.note || ""}`)) ko(`substitutions.js : « ${cid} » contient une accolade — réservée aux quantités mises à l'échelle`);
  }
}

/* ---------- 11. Repos ---------- */

/* Un repos, c'est un minuteur sans les mains et sans chauffer (levée, marinade,
   trempage, refroidissement, congélateur). La frise du rétroplanning le montre à
   part et libère les mains pendant qu'il court ; la carte et la fiche annoncent
   `times.repos`. Les deux doivent dire la même chose, sinon la carte promet un
   repos que la frise ne montre pas, ou l'inverse. Ce que la règle attrape :
   - la somme des minuteurs de repos de la version par défaut (première option de
     chaque choix, aucun supplément) est `times.repos` : une étape oubliée, un
     temps de carte qui ne dit pas la même chose que les étapes ;
   - `times.repos` non nul sans aucune étape de repos, ou l'inverse ;
   - un repos a un minuteur, ne porte jamais `four`, et ne dit pas `adds` d'un
     autre poste ; `reposLabel` n'a de sens que sur un repos ;
   - une option qui repose sans `adds` n'est lisible que si c'est la version par
     défaut : sinon `times` ne compterait son repos nulle part ;
   - un minuteur hors repos dont le texte parle de congélateur, de marinade, de
     trempage, de levée… est presque toujours un repos oublié (un four, lui, ne
     se soupçonne pas : il a sa propre annotation). */
const estRepos = s => !!s && (s.repos === true || s.adds === "repos");
const estPendant = s => !!s && s.repos === "pendant";
const MOTS_DE_REPOS = /réfrigérateur|congélateur|\bau frais\b|\blever\b|reposer|tremper|macérer|refroidir|marinade/i;

for (const r of RECIPES) {
  const porteurs = [
    ...r.steps.map((s, i) => [`${r.id}[${i}]`, s, "etape"]).filter(([, s]) => !s.choice),
    ...(r.choices || []).flatMap(c => c.options.map((o, j) => [`${r.id} / ${o.id}`, o.step, j === 0 ? "defaut" : "option"])),
    ...(r.addons || []).filter(a => a.step).map(a => [`${r.id} / +${a.id}`, a.step, "supplement"])
  ];
  const defaut = r.steps.map(s => s.choice ? r.choices.find(c => c.id === s.choice).options[0].step : s);
  for (const [ref, s, nature] of porteurs) {
    if ("repos" in s && s.repos !== true && s.repos !== "pendant") ko(`${ref} : repos vaut true, "pendant" ou n'existe pas (reçu ${JSON.stringify(s.repos)})`);
    if (estPendant(s)) {
      /* Une attente « pendant » court pendant qu'on travaille à la suite : sans
         minuteur elle n'a ni début ni fin, avec four ou adds elle se confond avec
         une cuisson ou un poste de la carte, sans étape derrière elle il n'y a
         rien à faire pendant ce temps (c'est alors un repos qui bloque) — et elle
         doit tenir dans la recette : au plus tôt, après les minuteurs qui la
         précèdent, il doit rester son minuteur. */
      if (!s.timer) ko(`${ref} : une attente « pendant » sans minuteur n'a ni début ni fin dans la frise`);
      if ("four" in s) ko(`${ref} : une attente « pendant » ne porte pas four — le four a sa propre annotation`);
      if (s.adds) ko(`${ref} : une attente « pendant » n'a pas de adds : times compte déjà le travail qu'elle recouvre`);
      /* Le rang de l'étape où elle démarre : l'étape elle-même, l'emplacement du
         choix, l'étape qu'enrichit le supplément. */
      const rang = nature === "etape" ? +/\[(\d+)\]$/.exec(ref)[1]
        : nature === "supplement" ? Math.min(s.i, r.steps.length - 1)
        : r.steps.findIndex(e => e.choice && r.choices.find(c => c.id === e.choice).options.some(o => o.step === s));
      if (nature === "etape" && rang === r.steps.length - 1) ko(`${ref} : une attente « pendant » en dernière étape ne recouvre aucun travail — c'est un repos qui bloque (repos: true)`);
      const avant = defaut.slice(0, rang).reduce((n, e) => n + (estPendant(e) ? 0 : e.timer || 0), 0);
      const place = (r.times.prep || 0) + (r.times.repos || 0) + (r.times.cuisson || 0) - avant;
      if (s.timer > place) ko(`${ref} : l'attente « pendant » dure ${s.timer} min, mais il ne reste que ${place} min de recette après les minuteurs qui la précèdent — elle dépasse la recette : allonge times, ou c'est un repos qui bloque`);
    } else if (estRepos(s)) {
      if (!s.timer) ko(`${ref} : un repos sans minuteur n'a ni début ni fin dans la frise — retire repos, ou donne-lui sa durée`);
      if ("four" in s) ko(`${ref} : un repos ne porte pas four — le four a sa propre annotation, la frise le montre autrement`);
      if (s.repos === true && s.adds && s.adds !== "repos") ko(`${ref} : repos: true mais adds: "${s.adds}" — son temps s'ajoute à un autre poste que le repos`);
      if (s.repos === true && !s.adds && nature === "option") ko(`${ref} : une option qui repose sans adds: "repos" n'est lisible que comme version par défaut — sinon times.repos ne compterait son temps nulle part`);
    } else {
      if ("reposLabel" in s) ko(`${ref} : reposLabel sur une étape qui n'est pas un repos`);
      if (s.timer && !s.four && MOTS_DE_REPOS.test(s.txt || "")) {
        ko(`${ref} : le minuteur de ${s.timer} min accompagne un texte qui parle d'attente (« ${MOTS_DE_REPOS.exec(s.txt)[0]} ») sans que l'étape soit un repos — si le minuteur est l'attente, ajoute repos: true`);
      }
    }
  }
  const somme = defaut.filter(estRepos).reduce((n, s) => n + (s.timer || 0), 0);
  const annonce = r.times.repos || 0;
  if (somme !== annonce) {
    ko(annonce && !somme
      ? `${r.id} : times.repos annonce ${annonce} min mais aucune étape n'est un repos — marque repos: true celles où l'on attend sans rien faire`
      : `${r.id} : les repos de la version par défaut durent ${somme} min, times.repos en annonce ${annonce} — la carte et la frise ne disent pas la même chose`);
  }
  if (annonce && !r.reposLabel) ko(`${r.id} : times.repos sans reposLabel — la carte et la fiche diraient « Repos » faute de mieux`);
}

/* ---------- 9. Logique culinaire ---------- */

/* La liste de courses fusionne par `cid` et n'affiche qu'UN libellé par ligne :
   celui de la première recette du menu qui le porte. Si deux recettes ne s'accordent
   pas sur ce libellé, la liste dit tantôt « Farine T55 ou T65 » tantôt « Farine »
   selon l'ordre du menu, et l'une des deux recettes y lit une exigence qui n'est
   pas la sienne. Deux cas, deux remèdes :
   - c'est le même produit : un libellé qui convient à toutes les recettes, et ce qui
     est propre à l'une (« non traité pour le zeste ») va dans `shop.note`, qui se
     fond sans rien écraser ;
   - ce sont deux produits (farine de pain contre farine de blé, beurre doux contre
     salé, sucre blanc contre cassonade) : deux `cid`, donc deux lignes à acheter.
   Aucune exception : un `cid` partagé par plusieurs recettes dit la même chose partout. */
const libellesParCid = new Map();
const entiersParCid = new Map();
for (const r of RECIPES) {
  const lotsCulinaires = [
    [r.id, r.ingredients],
    ...(r.choices || []).flatMap(c => c.options.map(o => [`${r.id} / ${o.id}`, o.ingredients])),
    ...(r.addons || []).map(a => [`${r.id} / +${a.id}`, a.ingredients])
  ];
  for (const [ref, ings] of lotsCulinaires) for (const i of ings || []) {
    if (i.course === false || !i.cid) continue;
    const libelle = (i.shop && i.shop.label) || i.name;
    if (!libellesParCid.has(i.cid)) libellesParCid.set(i.cid, new Map());
    const parLibelle = libellesParCid.get(i.cid);
    if (!parLibelle.has(libelle)) parLibelle.set(libelle, []);
    parLibelle.get(libelle).push(ref);
    if (!entiersParCid.has(i.cid)) entiersParCid.set(i.cid, new Set());
    entiersParCid.get(i.cid).add(!!i.entier);
  }
}
for (const [cid, parLibelle] of libellesParCid) {
  if (parLibelle.size < 2) continue;
  const detail = [...parLibelle].map(([l, refs]) => `« ${l} » (${[...new Set(refs)].join(", ")})`).join(" contre ");
  ko(`${cid} : libellés de courses différents — ${detail}. Même produit : un seul shop.label (le plus général), le reste en shop.note ; produits différents : deux cid`);
}
/* Un œuf est entier partout ou nulle part : sinon la fiche arrondit « 1½ œuf » dans une recette et pas dans l'autre. */
for (const [cid, valeurs] of entiersParCid) {
  if (valeurs.size > 1) ko(`${cid} : \`entier: true\` n'est pas posé sur tous ses ingrédients — une quantité s'arrondirait à la pièce dans une recette et pas dans l'autre`);
}

if (erreurs.length) {
  console.error(`${erreurs.length} problème(s) :\n` + erreurs.map(e => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}

console.log(`${RECIPES.length} recettes vérifiées : ancrages, minuteurs et ingrédients cohérents.`);
console.log(`${FONDAMENTAUX.length} fondamentaux vérifiés : identifiants, familles et certitudes cohérents.`);
console.log(`${nbFigures} figure(s) vérifiée(s) pour ${Object.keys(FIGURES).length} fondamental(aux) : types, titres, alt, emplacements, aucune couleur en dur ; ${THERMOMETRE.length} repère(s) du thermomètre.`);
console.log(`Référentiels vérifiés : ${Object.keys(ALLERGENES).length} allergènes, ${Object.keys(SAISONS).length} saisons, ${Object.keys(SUBSTITUTIONS).length} substitutions.`);

/* Pour information seulement — jamais une erreur. Un fondamental sans recette
   est une astuce croisée dans la vie qui attend la sienne, et c'est prévu. */
const orphelins = FONDAMENTAUX.filter(f => !RECIPES.some(r => [
  ...r.steps, ...(r.choices || []).flatMap(c => c.options.map(o => o.step)), ...(r.addons || []).map(a => a.step)
].some(s => idsFond(s).some(id => (FONDAMENTAL_RENAMES[id] || id) === f.id))));
const sansFond = RECIPES.filter(r => ![
  ...r.steps, ...(r.choices || []).flatMap(c => c.options.map(o => o.step)), ...(r.addons || []).map(a => a.step)
].some(s => idsFond(s).length));

if (orphelins.length) console.log(`  · ${orphelins.length} pas encore rattaché(s) : ${orphelins.map(f => f.id).join(", ")}`);
if (sansFond.length) console.log(`  · ${sansFond.length} recette(s) sans aucun fondamental : ${sansFond.map(r => r.id).join(", ")}`);
if (etapesSansIng) console.log(`  · ${etapesSansIng} étape(s) sur ${etapesTotal} sans ing (liste des ingrédients de l'étape) : ils n'apparaîtront pas en mode cuisine`);
