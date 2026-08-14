/* Génère une photo « livre de cuisine » pour chaque recette qui n'en a pas,
   avec Gemini (nano banana), puis référence l'image dans js/recipes.js.

   Usage :  GEMINI_API_KEY=xxxx node tools/generer-photos.mjs
   (clé gratuite sur https://aistudio.google.com → « Get API key »)

   - Ne régénère jamais une image existante (supprimer img/<id>.png pour refaire).
   - Les recettes gardent leur illustration dessinée tant qu'elles n'ont pas de photo. */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RECIPES_FILE = join(ROOT, "js", "recipes.js");
const MODEL = "gemini-2.5-flash-image";

const KEY = process.env.GEMINI_API_KEY || process.argv[2];
if (!KEY) {
  console.error("Il faut une clé d'API Gemini : GEMINI_API_KEY=xxxx node tools/generer-photos.mjs");
  process.exit(1);
}

const src = readFileSync(RECIPES_FILE, "utf8");
const RECIPES = new Function(`${src}; return RECIPES;`)();
mkdirSync(join(ROOT, "img"), { recursive: true });

/* Style commun pour que toutes les photos aient l'air de venir du même livre */
const STYLE = [
  "Photographie culinaire professionnelle de style éditorial, pour un livre de cuisine méditerranéen.",
  "Lumière naturelle latérale douce, ombres délicates, tons chauds.",
  "Décor : table en bois patiné ou nappe en lin, vaisselle artisanale, quelques herbes fraîches autour.",
  "Cadrage en plongée légère (3/4), mise au point sur le plat, arrière-plan légèrement flou.",
  "Aucun texte, aucune main, aucune personne dans l'image."
].join(" ");

async function generate(recipe) {
  const prompt = `${STYLE} Le plat : ${recipe.title}. ${recipe.subtitle || ""}`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { imageConfig: { aspectRatio: "4:3" } }
      })
    }
  );
  if (!res.ok) throw new Error(`API ${res.status} : ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part) throw new Error(`Pas d'image dans la réponse : ${JSON.stringify(data).slice(0, 300)}`);
  return Buffer.from(part.inlineData.data, "base64");
}

let recipesSrc = src;
let done = 0, skipped = 0, failed = 0;

for (const r of RECIPES) {
  const rel = `img/${r.id}.png`;
  const file = join(ROOT, rel);
  if (r.image || existsSync(file)) { skipped++; continue; }
  process.stdout.write(`→ ${r.title} … `);
  try {
    writeFileSync(file, await generate(r));
    const anchor = `id: "${r.id}",`;
    if (recipesSrc.includes(anchor) && !recipesSrc.includes(`image: "${rel}"`)) {
      recipesSrc = recipesSrc.replace(anchor, `${anchor}\n    image: "${rel}",`);
      writeFileSync(RECIPES_FILE, recipesSrc);
    }
    console.log(`ok (${rel})`);
    done++;
  } catch (e) {
    console.log(`échec — ${e.message}`);
    failed++;
  }
}

console.log(`\n${done} générée(s), ${skipped} déjà en place, ${failed} échec(s).`);
if (done) console.log("Pense à recharger le site (et à committer img/ + js/recipes.js).");
