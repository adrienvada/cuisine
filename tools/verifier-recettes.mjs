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
const psrc = readFileSync(join(ROOT, "js", "placard.js"), "utf8");
const PLACARD = new Function(`${psrc}; return PLACARD;`)();
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

  /* Même règle pour les options de choix : une option plus longue que la version
     par défaut dit où son minuteur s'ajoute (`adds`), sinon la carte annonce un
     temps que la frise du rétroplanning, elle, additionne autrement. Et une
     option sans `adds` dont le minuteur dépasse ce que `times` laisse de place
     est une option qui aurait dû en avoir un. */
  const total = (r.times.prep || 0) + (r.times.repos || 0) + (r.times.cuisson || 0);
  for (const c of r.choices || []) {
    const i = r.steps.findIndex(s => s.choice === c.id);
    const minuteurs = (o) => r.steps.reduce((n, s, j) => n + ((j === i ? o.step : s).timer || 0), 0);
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
