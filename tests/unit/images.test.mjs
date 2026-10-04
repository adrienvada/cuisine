/* Images : markup de visuel(), géométrie des vignettes, liste CORE du service worker. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { visuel } from "../../js/ui/visuel.js";
import { cadrage, GENRES } from "../../tools/generer-vignettes.mjs";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const recette = { id: "cake-sale", image: "img/cake-sale.jpg", emoji: "🍰" };

test("visuel : la vignette et le carré pointent sur leur variante WebP, avec dimensions", () => {
  const v = visuel(recette, { genre: "vignette" });
  assert.match(v, /src="img\/v\/cake-sale\.webp"/);
  assert.match(v, /width="\d+" height="\d+"/);
  assert.match(v, /loading="lazy"/);
  assert.match(v, /data-secours="img\/cake-sale\.jpg"/);
  assert.match(visuel(recette, { genre: "carre" }), /src="img\/c\/cake-sale\.webp"/);
  // Pas de zoom CSS pour une variante : la classe n'apparaît que sur le repli.
  assert.doesNotMatch(v, /zoom/);
});

test("visuel : le héro est un <picture> WebP avec le JPEG en secours, chargé tout de suite", () => {
  const v = visuel(recette, { genre: "hero", eager: true });
  assert.match(v, /^<picture><source srcset="img\/h\/cake-sale\.webp" type="image\/webp"><img src="img\/cake-sale\.jpg"/);
  assert.match(v, /fetchpriority="high"/);
});

test("visuel : sans photo, l'emoji ; image hors convention, JPEG zoomé", () => {
  // ILLO est une globale posée par js/illos.js : ici, sans illustration.
  globalThis.ILLO = { FOOD: {} };
  assert.equal(visuel({ id: "inconnue", emoji: "🥗" }), "🥗");
  assert.match(visuel({ id: "x", image: "photos/x.jpeg" }), /src="photos\/x\.jpeg".*class="zoom"/);
});

test("cadrage : la vignette montre le tiers central, dans les proportions de sa boîte", () => {
  const { extraire, sortie } = cadrage({ largeur: 800, hauteur: 597 }, GENRES.v);
  assert.ok(Math.abs(extraire.width - 800 / 3) <= 1);
  assert.ok(Math.abs(extraire.width / extraire.height - 168 / 110) < 0.02);
  assert.ok(Math.abs(extraire.left * 2 + extraire.width - 800) <= 1, "centrée en largeur");
  assert.ok(Math.abs(extraire.top * 2 + extraire.height - 597) <= 1, "centrée en hauteur");
  // La source donne moins que 2× la boîte (336 px) : on garde sa résolution.
  assert.ok(sortie.width <= extraire.width + 1);
});

test("cadrage : 2× la boîte quand la source est assez grande, jamais plus", () => {
  const grande = cadrage({ largeur: 1600, hauteur: 1194 }, GENRES.v);
  assert.deepEqual(grande.sortie, { width: 336, height: 220 });
  const carre = cadrage({ largeur: 1600, hauteur: 1194 }, GENRES.c);
  assert.deepEqual(carre.sortie, { width: 176, height: 176 });
  assert.equal(carre.extraire.width, carre.extraire.height);
  // Un carré de 25 % de la largeur, comme dans le README.
  assert.ok(Math.abs(carre.extraire.width / 1600 - 0.25) < 0.01);
});

test("sw.js : CORE liste des fichiers qui existent, tous les modules et feuilles", () => {
  const sw = readFileSync(join(RACINE, "sw.js"), "utf8");
  const bloc = sw.slice(sw.indexOf("const CORE = ["), sw.indexOf("];", sw.indexOf("const CORE = [")));
  const core = [...bloc.matchAll(/"([^"]+)"/g)].map(m => m[1]);
  for (const f of core) if (f !== "./") assert.ok(existsSync(join(RACINE, f)), `${f} n'existe pas`);
  const parcourir = d => readdirSync(join(RACINE, d), { withFileTypes: true })
    .flatMap(e => e.isDirectory() ? parcourir(`${d}/${e.name}`) : [`${d}/${e.name}`]);
  for (const f of [...parcourir("js"), ...parcourir("css"), "index.html", "manifest.webmanifest"]) {
    assert.ok(core.includes(f), `${f} manque dans CORE (npm run sw)`);
  }
  assert.match(sw, /const VERSION = "[0-9a-f]{10}";/);
});
