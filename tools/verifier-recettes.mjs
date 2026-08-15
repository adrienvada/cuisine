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

   Usage :  node tools/verifier-recettes.mjs        (code de sortie 1 si erreur) */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(ROOT, "js", "recipes.js"), "utf8");
const RECIPES = new Function(`${src}; return RECIPES;`)();
const RAYONS = new Function(`${src}; return RAYONS;`)();

const DUREE = /(\d+(?:\s*à\s*\d+)?)\s*(minutes?|min\b|heures?|h\b)/i;
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
}

if (erreurs.length) {
  console.error(`${erreurs.length} problème(s) :\n` + erreurs.map(e => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`${RECIPES.length} recettes vérifiées : ancrages, minuteurs et ingrédients cohérents.`);
