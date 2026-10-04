/* Réglages : les contrastes de la palette (calculés sur css/base.css) et la sauvegarde du carnet. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  apercu, lireSauvegarde, nomFichier, remplacerEtat, restaurerEtat, instantane
} from "../../js/core/sauvegarde.js";

/* ---------- Contrastes ---------- */

const css = readFileSync(new URL("../../css/base.css", import.meta.url), "utf8");

/* Les déclarations `--nom: #hex` d'un bloc de base.css, du sélecteur à son accolade fermante. */
function variables(selecteur) {
  const debut = css.indexOf(selecteur + " {");
  assert.ok(debut >= 0, `bloc introuvable : ${selecteur}`);
  const bloc = css.slice(debut, css.indexOf("\n}", debut));
  return Object.fromEntries([...bloc.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)].map(m => [m[1], m[2].toUpperCase()]));
}

const CLAIR = variables(":root");
const SOMBRE = { ...CLAIR, ...variables('html[data-theme="dark"]') };

const luminance = hex => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [16, 8, 0].map(s => ((n >> s) & 255) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const ratio = (a, b) => {
  const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clair + 0.05) / (sombre + 0.05);
};

const FONDS = ["paper", "paper-deep", "card"];
const TEINTES = ["gold-tint", "green-tint"];

const PAIRES_TEXTE = [
  // [texte, fonds]
  ["ink", [...FONDS, ...TEINTES]],
  ["ink-soft", [...FONDS, ...TEINTES]],
  ["muted", [...FONDS, ...TEINTES]],           // gris des temps, « optionnel », notes
  ["gold", [...FONDS, ...TEINTES]],            // « LE CARNET DE », titres de rayons, « optionnel »
  ["gold-deep", [...FONDS, ...TEINTES]],
  ["green", FONDS],
  ["green-deep", [...FONDS, ...TEINTES]],
  ["terra", FONDS]
];

for (const [nom, theme] of [["clair", CLAIR], ["sombre", SOMBRE]]) {
  test(`contraste (${nom}) : le petit texte atteint 4,5:1 sur les fonds où il se pose`, () => {
    for (const [texte, fonds] of PAIRES_TEXTE) {
      for (const fond of fonds) {
        const r = ratio(theme[texte], theme[fond]);
        assert.ok(r >= 4.5, `--${texte} sur --${fond} : ${r.toFixed(2)}:1`);
      }
    }
  });

  test(`contraste (${nom}) : le texte posé sur un bouton vert atteint 4,5:1`, () => {
    const r = ratio(theme["sur-vert"], theme.green);
    assert.ok(r >= 4.5, `--sur-vert sur --green : ${r.toFixed(2)}:1`);
  });

  test(`contraste (${nom}) : les éléments graphiques atteignent 3:1 sur la carte`, () => {
    for (const couleur of ["green", "terra", "gold", nom === "sombre" ? "gold-deco" : "gold"]) {
      const r = ratio(theme[couleur], theme.card);
      assert.ok(r >= 3, `--${couleur} sur --card : ${r.toFixed(2)}:1`);
    }
  });
}

test("contraste : le doré clair des décors reste distinct du doré de texte", () => {
  assert.equal(CLAIR["gold-deco"], "#C1913F");
  assert.notEqual(CLAIR["gold-deco"], CLAIR.gold);
  assert.ok(luminance(CLAIR["gold-deco"]) > luminance(CLAIR.gold));
});

test("contraste : le doré des petits textes sur le vert profond fixe (mode cuisine, bulles) atteint 4,5:1", () => {
  // Le vert du mode cuisine et son encadré d'astuce (crème translucide sur ce vert).
  for (const fond of ["#31492B", "#455A3D"]) {
    const r = ratio(CLAIR["or-sur-fond-vert"], fond);
    assert.ok(r >= 4.5, `--or-sur-fond-vert sur ${fond} : ${r.toFixed(2)}:1`);
  }
});

test("contraste : la mesure reproduit les valeurs connues", () => {
  assert.ok(Math.abs(ratio("#000000", "#FFFFFF") - 21) < 0.01);
  // Les mesures du cahier des charges, avant correction.
  assert.ok(Math.abs(ratio("#C1913F", "#F7F3E9") - 2.56) < 0.01);
  assert.ok(Math.abs(ratio("#FDFBF3", "#7BA36C") - 2.78) < 0.01);
});

/* ---------- Sauvegarde ---------- */

const carnet = {
  portions: { quiche: 4 }, menu: [{ k: "m1", rid: "quiche", choices: {}, addons: [], portions: null }],
  checked: {}, extras: [{ id: "a", name: "Sel" }], filter: "Toutes", query: "", notes: {}, cooked: { quiche: { count: 2 } },
  timers: [{ id: "t1" }], reglages: { tailleCuisine: 2 }
};

test("sauvegarde : le nom du fichier porte la date locale", () => {
  assert.equal(nomFichier(new Date(2026, 0, 5, 23, 59)), "carnet-cuisine-2026-01-05.json");
  assert.equal(nomFichier(new Date(2026, 10, 15)), "carnet-cuisine-2026-11-15.json");
});

test("sauvegarde : un export relu redonne le carnet, sauf ce qui tient à l'appareil", () => {
  const { donnees, erreur } = lireSauvegarde(JSON.stringify(carnet));
  assert.equal(erreur, undefined);
  assert.deepEqual(donnees.menu, carnet.menu);
  assert.deepEqual(donnees.extras, carnet.extras);
  assert.equal("timers" in donnees, false);
  assert.equal("reglages" in donnees, false);
});

test("sauvegarde : les champs omis reçoivent leur valeur de départ", () => {
  const { donnees } = lireSauvegarde(JSON.stringify({ menu: [] }));
  assert.equal(donnees.filter, "Toutes");
  assert.deepEqual(donnees.checked, {});
  assert.deepEqual(donnees.extras, []);
});

test("sauvegarde : un champ connu de mauvaise forme est écarté, un champ inconnu est gardé", () => {
  const { donnees } = lireSauvegarde(JSON.stringify({ menu: "oups", extras: [{ id: "a", name: "Sel" }, 3, { name: "sans id" }], bientot: { x: 1 } }));
  assert.deepEqual(donnees.menu, []);                       // remplacé par la valeur de départ
  assert.deepEqual(donnees.extras, [{ id: "a", name: "Sel" }]);
  assert.deepEqual(donnees.bientot, { x: 1 });
});

test("sauvegarde : les fichiers qui ne sont pas des carnets sont refusés", () => {
  for (const texte of ["pas du json", "[1,2]", "42", "null", "{}", '{"truc": 1}', '{"menu": 3}']) {
    assert.ok(lireSauvegarde(texte).erreur, texte);
  }
});

test("sauvegarde : une clé empoisonnée ne touche ni l'état ni les prototypes", () => {
  const { donnees } = lireSauvegarde('{"menu": [], "__proto__": {"pollue": true}, "constructor": {"x": 1}}');
  const etat = { menu: [{ rid: "a" }], timers: [] };
  remplacerEtat(etat, donnees);
  assert.equal({}.pollue, undefined);
  assert.equal(etat.pollue, undefined);
  assert.equal(Object.getPrototypeOf(etat), Object.prototype);
  assert.equal(Object.hasOwn(etat, "constructor"), false);
});

test("sauvegarde : remplacer garde minuteurs et réglages de l'appareil, annuler rend tout", () => {
  const etat = structuredClone(carnet);
  const avant = instantane(etat);
  const { donnees } = lireSauvegarde(JSON.stringify({ menu: [{ k: "n", rid: "cake" }], extras: [], notes: { cake: "bon" } }));
  remplacerEtat(etat, donnees);
  assert.deepEqual(etat.menu.map(e => e.rid), ["cake"]);
  assert.deepEqual(etat.timers, [{ id: "t1" }]);
  assert.deepEqual(etat.reglages, { tailleCuisine: 2 });
  assert.deepEqual(etat.cooked, {});                        // le fichier n'en avait pas : ils sont remplacés
  restaurerEtat(etat, avant);
  assert.deepEqual(etat, carnet);
});

test("sauvegarde : l'aperçu compare le carnet et le fichier, sans lignes vides", () => {
  const { donnees } = lireSauvegarde(JSON.stringify({ menu: [{ k: "a", rid: "x" }, { k: "b", rid: "y" }], notes: { x: "t" } }));
  const lignes = apercu(carnet, donnees);
  assert.deepEqual(lignes.find(l => l.libelle === "Recettes au menu"), { libelle: "Recettes au menu", actuel: 1, importe: 2 });
  assert.deepEqual(lignes.find(l => l.libelle === "Articles libres"), { libelle: "Articles libres", actuel: 1, importe: 0 });
  assert.deepEqual(lignes.find(l => l.libelle === "Recettes cuisinées"), { libelle: "Recettes cuisinées", actuel: 1, importe: 0 });
  assert.equal(lignes.some(l => l.libelle === "Journal"), false);
});
