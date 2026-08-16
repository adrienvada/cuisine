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

   Ce que ce vérificateur ne fera JAMAIS : juger du contenu. Il ne réclame pas
   d'astuce, ne compte pas les rattachements, ne trouve pas qu'un fondamental
   orphelin est un problème — le carnet sert aussi de boîte de réception aux
   savoirs qui n'ont pas encore trouvé leur recette. Il n'attrape que ce qui
   fait afficher quelque chose de faux.

   Usage :  node tools/verifier-recettes.mjs        (code de sortie 1 si erreur) */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(ROOT, "js", "recipes.js"), "utf8");
const RECIPES = new Function(`${src}; return RECIPES;`)();
const RAYONS = new Function(`${src}; return RAYONS;`)();
const fsrc = readFileSync(join(ROOT, "js", "fondamentaux.js"), "utf8");
const FONDAMENTAUX = new Function(`${fsrc}; return FONDAMENTAUX;`)();
const FAMILLES = new Function(`${fsrc}; return FAMILLES;`)();
const FONDAMENTAL_RENAMES = new Function(`${fsrc}; return FONDAMENTAL_RENAMES;`)();

const DUREE = /(\d+(?:\s*à\s*\d+)?)\s*(minutes?|min\b|heures?|h\b)/i;
const POSTES = ["prep", "repos", "cuisson"];
/* Une quantité mise à l'échelle : {3 cl}, {1-2 c. à s.}, {2}. */
const MARQUEE = /\{(\d+(?:[.,]\d+)?)(?:\s*[–-]\s*(\d+(?:[.,]\d+)?))?\s*([^}]*)\}/g;
/* La même, laissée nue — ce que l'on cherche à débusquer. On scanne le texte
   privé de ses accolades, donc pas besoin d'exclure celles-ci ici. Les unités
   de longueur sont absentes de la liste : une bande de 1,5 cm de large reste
   large de 1,5 cm qu'on soit deux ou douze. */
const NUE = /\b(\d+(?:[.,]\d+)?)\s*(g|kg|ml|cl|l|c\. à s\.|c\. à c\.|sachets?|bocaux?|bocal|pots?|bottes?|bouquets?|gousses?)\b/g;
/* « 2 cl par verre » se règle tout seul : c'est une quantité par portion. */
const PAR_PORTION = /\bpar\s+(verre|personne|part|portion|convive|pièce|sachet)/i;
/* Ce qu'on achète tout fait : le poids annoncé décrit l'emballage. */
const CONTENANTS = ["bocal", "boîte", "brique", "pot", "petit pot", "sachet", "rouleau", "botte", "bouquet"];
const nombre = n => parseFloat(String(n).replace(",", "."));

function quantitesNues(txt) {
  if (!txt || PAR_PORTION.test(txt)) return [];
  return [...txt.replace(MARQUEE, "…").matchAll(NUE)].map(m => m[0]);
}
const erreurs = [];
const ko = m => erreurs.push(m);

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
     gonfle le total sans apparaître dans aucune des fourchettes affichées. */
  for (const a of r.addons || []) {
    if (a.step && a.step.timer && !POSTES.includes(a.step.adds)) {
      ko(`${r.id} / +${a.id} a un minuteur mais pas de \`adds\` valide (${POSTES.join(", ")})`);
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

if (erreurs.length) {
  console.error(`${erreurs.length} problème(s) :\n` + erreurs.map(e => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}

console.log(`${RECIPES.length} recettes vérifiées : ancrages, minuteurs et ingrédients cohérents.`);
console.log(`${FONDAMENTAUX.length} fondamentaux vérifiés : identifiants, familles et certitudes cohérents.`);

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
