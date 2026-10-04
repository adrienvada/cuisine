/* Deuxième vague, lot « courses-menu » : le planning (date du jour, noms courts, phrases de conflit et de retard), le partage d'une carte du menu, les quantités de la liste de courses. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RECIPES } from "./donnees.mjs";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
globalThis.PLACARD = new Function(readFileSync(path.join(racine, "js/placard.js"), "utf8") + ";return PLACARD;")();

const { state } = await import("../../js/core/etat.js");
const menu = await import("../../js/core/menu.js");
const { buildCourseList, quantitesDe } = await import("../../js/core/courses.js");
const { instantTable, planifier, minutesMurales, nomCourt, phraseConflit, phraseRetard } = await import("../../js/core/planning.js");
const { recipeShareText, shareRecipe } = await import("../../js/ui/partage.js");

const JOUR = "2030-06-15";
const TABLE = minutesMurales(JOUR, 20 * 60);
const vide = () => {
  Object.assign(state, { menu: [], checked: {}, extras: [], portions: {}, choices: {}, addons: {}, hintCoursesOff: false });
  delete state.repas;
  delete state.historique;
};
const ajouter = (rid, { k, portions = null, choices = {}, addons = [] } = {}) => {
  const e = { k: k || "k" + state.menu.length, rid, choices, addons, portions };
  state.menu.push(e);
  return e;
};

/* ---------- Constat n° 35 : une date du jour dont l'heure est passée ---------- */

test("instantTable : la date du jour dont l'heure est passée n'est plus à venir", () => {
  const maintenant = { date: "2026-10-04", minutes: 15 * 60 };
  const passee = instantTable({ date: "2026-10-04", heure: "12:00" }, maintenant);
  assert.equal(passee.date, "2026-10-05", "comme sans date : la prochaine fois qu'il sera midi");
  assert.equal(passee.maintenant, null);
  assert.ok(passee.table > minutesMurales("2026-10-04", maintenant.minutes));
  const pile = instantTable({ date: "2026-10-04", heure: "15:00" }, maintenant);
  assert.equal(pile.date, "2026-10-05");
});

test("instantTable : la date du jour dont l'heure vient fait toujours foi", () => {
  const maintenant = { date: "2026-10-04", minutes: 15 * 60 };
  const a = instantTable({ date: "2026-10-04", heure: "20:00" }, maintenant);
  assert.equal(a.date, "2026-10-04");
  assert.equal(a.maintenant, minutesMurales("2026-10-04", 15 * 60));
});

test("une date du jour à l'heure passée ne fabrique plus de retard", () => {
  vide();
  ajouter("focaccia-romarin", { k: "f" });
  const maintenant = { date: "2026-10-04", minutes: 15 * 60 };
  const inst = instantTable({ date: "2026-10-04", heure: "12:00" }, maintenant);
  const plan = planifier({ table: inst.table, maintenant: inst.maintenant, taches: menu.tachesDuMenu() });
  assert.equal(plan.retard, 0);
  assert.ok(plan.table > minutesMurales(maintenant.date, maintenant.minutes), "aucun repas dans le passé");
});

/* ---------- Constat n° 36 : des noms courts qui se distinguent ---------- */

test("nomCourt : les 20 recettes ont un nom court distinct, aucun n'est un mot générique seul", () => {
  const noms = RECIPES.map(r => nomCourt(r.title));
  assert.equal(new Set(noms).size, RECIPES.length, noms.join(" | "));
  const generiques = ["salade", "dip", "pesto", "velouté", "tartines", "mi-cuit"];
  for (const n of noms) assert.ok(!generiques.includes(n.toLowerCase()), `« ${n} » est trop pauvre`);
});

test("nomCourt : un nom générique garde son complément", () => {
  assert.equal(nomCourt("Salade de lentilles, feta, pomme verte & tomates"), "Salade de lentilles");
  assert.equal(nomCourt("Pesto au basilic maison"), "Pesto au basilic");
  assert.equal(nomCourt("Dip de chèvre frais « double herbes »"), "Dip de chèvre");
  assert.equal(nomCourt("Mi-cuit au chocolat de Suzy Palatin"), "Mi-cuit au chocolat");
  // Les noms qui se suffisent ne changent pas.
  assert.equal(nomCourt("Focaccia maison au romarin"), "Focaccia");
  assert.equal(nomCourt("Salade méditerranéenne : pois chiches, feta & olives"), "Salade méditerranéenne");
});

/* ---------- Constat n° 11 : phrase de conflit et retard ---------- */

test("phraseConflit : chaque plat est lié à sa température, le retard n'est pas redit", () => {
  vide();
  ajouter("focaccia-romarin", { k: "f" });
  ajouter("quiche-lorraine", { k: "q" });
  ajouter("cake-sale", { k: "c" });
  const plan = planifier({ table: TABLE, maintenant: TABLE - 120, taches: menu.tachesDuMenu() });
  assert.ok(plan.retard > 0);
  const phrase = phraseConflit(plan.conflits[0]);
  assert.match(phrase, /^Focaccia à 220 °C ; Quiche lorraine et Cake salé à 180 °C en même temps : enfourne « Focaccia » d'abord\.$/);
  assert.doesNotMatch(phrase, /retard|min\b/);
});

test("phraseRetard : la durée s'écrit comme partout ailleurs (1 h 22), jamais en minutes brutes", () => {
  const plan = { retard: 82, table: TABLE, tableReelle: TABLE + 82 };
  assert.equal(phraseRetard(plan), "Pour 20 h, il aurait fallu s'y mettre plus tôt : compte 1 h 22 de retard, à table vers 21 h 22.");
  assert.match(phraseRetard({ ...plan, retard: 45, tableReelle: TABLE + 45 }), /compte 45 min de retard/);
});

test("phraseConflit : le départ avancé s'écrit aussi en heures", () => {
  const c = { premier: { titre: "Focaccia", temp: 220 }, second: { titre: "Quiche lorraine", temp: 180 }, autres: [], decale: 80, retard: 0 };
  assert.match(phraseConflit(c), /départ avancé de 1 h 20, l'heure est tenue\.$/);
});

/* ---------- Constat n° 19 : « Partager » d'une carte du menu ---------- */

function installerPartage() {
  const envois = [];
  Object.defineProperty(globalThis, "navigator", { value: { share: async d => { envois.push(d); } }, configurable: true });
  globalThis.location = { protocol: "https:", origin: "https://exemple.test", pathname: "/cuisine/" };
  return envois;
}

test("shareRecipe(id, k) envoie la version de l'entrée, pas le brouillon de la fiche", async () => {
  vide();
  const envois = installerPartage();
  const r = RECIPES.find(x => x.id === "cake-sale");
  const choix = r.choices[0];
  const [premiere, seconde] = [choix.options[0].id, choix.options[1].id];
  ajouter("cake-sale", { k: "a", portions: 9, choices: { [choix.id]: premiere } });
  ajouter("cake-sale", { k: "b", portions: 4, choices: { [choix.id]: seconde } });
  // Le brouillon de la fiche, lui, dit autre chose.
  state.portions["cake-sale"] = 6;
  state.choices["cake-sale"] = { [choix.id]: premiere };

  await shareRecipe("cake-sale", "b");
  await shareRecipe("cake-sale", "a");
  const [b, a] = envois;
  assert.match(b.url, new RegExp(`\\?.*c=${choix.id}:${seconde}`));
  assert.match(b.url, /p=4/);
  assert.match(b.text, /Pour 4 /);
  assert.ok(b.text.includes(`Version : ${choix.options[1].label}`));
  assert.match(a.text, /Pour 9 /);
  assert.notEqual(a.url, b.url, "deux cakes du même repas n'envoient pas le même lien");
});

test("sans clé d'entrée, shareRecipe garde la composition courante (fiche, accueil)", () => {
  vide();
  const r = RECIPES.find(x => x.id === "quiche-lorraine");
  state.portions["quiche-lorraine"] = 10;
  assert.match(recipeShareText(r), /Pour 10 /);
});

/* ---------- Constat n° 27 : grammes et millilitres entiers ---------- */

test("liste de courses : aucun gramme ni millilitre fractionnaire, aucune fraction écrite pour g et ml", () => {
  for (const r of RECIPES) {
    for (const p of [1, 2, 3, 5, 7, 9, 11, 13]) {
      vide();
      ajouter(r.id, { k: "a", portions: p, addons: (r.addons || []).map(a => a.id) });
      for (const it of buildCourseList()) {
        for (const s of [it, ...it.sources]) {
          for (const q of s.parts) {
            if (q.unit !== "g" && q.unit !== "ml") continue;
            assert.ok(Number.isInteger(q.qty), `${r.id} ×${p} : ${it.key} ${q.qty} ${q.unit}`);
            assert.doesNotMatch(quantitesDe({ parts: [q] }), /[¼½¾]/);
          }
        }
      }
    }
  }
});

/* ---------- Constat n° 27 (reste) : centilitres entiers, comme la fiche ---------- */

test("liste de courses et fiche : aucun centilitre fractionnaire, jamais 0 cl", () => {
  for (const r of RECIPES) {
    for (const p of [1, 2, 3, 5, 7, 9, 11, 13]) {
      vide();
      ajouter(r.id, { k: "a", portions: p, addons: (r.addons || []).map(a => a.id) });
      for (const it of buildCourseList()) {
        for (const q of it.parts) {
          if (q.unit !== "cl") continue;
          assert.ok(Number.isInteger(q.qty) && q.qty >= 1, `${r.id} ×${p} : ${it.key} ${q.qty} cl`);
        }
      }
    }
  }
});
