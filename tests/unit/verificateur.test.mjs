import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/* Les fichiers de données restent des scripts classiques qui déclarent des
   globales : on les lit comme le font les outils de tools/. */
const charger = (fichier, noms) =>
  new Function(readFileSync(path.join(racine, fichier), "utf8") + `;return { ${noms} };`)();

test("le vérificateur de recettes sort en code 0 sur les données actuelles", () => {
  const r = spawnSync("node", ["tools/verifier-recettes.mjs"], { cwd: racine, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("les fichiers de données déclarent bien leurs globales", () => {
  const { RECIPES, RECIPE_RENAMES } = charger("js/recipes.js", "RECIPES, RECIPE_RENAMES");
  assert.ok(Array.isArray(RECIPES) && RECIPES.length > 0);
  // Un ancien identifiant renvoie vers une recette qui existe.
  for (const actuel of Object.values(RECIPE_RENAMES)) {
    assert.ok(RECIPES.some(r => r.id === actuel), `renommage vers une recette inconnue : ${actuel}`);
  }
  const { FONDAMENTAUX } = charger("js/fondamentaux.js", "FONDAMENTAUX");
  assert.ok(FONDAMENTAUX.some(f => f.id === "maillard"));
});
