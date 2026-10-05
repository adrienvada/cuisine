/* La complétude d'un repas : ce que les plats du menu apportent (js/apports.js), ce qui
   manque, et les recettes qui le comblent (js/core/completude.js). */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RECIPES } from "./donnees.mjs";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const charger = (f, noms) => new Function(readFileSync(path.join(racine, f), "utf8") + `;return { ${noms} };`)();
Object.assign(globalThis, charger("js/allergenes.js", "ALLERGENES_LISTE, ALLERGENES, NON_VEGETARIEN"), charger("js/saisons.js", "SAISONS"));

const { APPORTS } = await import("../../js/apports.js");
const { analyser, apportsDe, phrase, suggerer } = await import("../../js/core/completude.js");

const recette = id => {
  const r = RECIPES.find(x => x.id === id);
  assert.ok(r, id);
  return r;
};
/* Un menu : « velouté+croutons » ajoute le supplément croûtons. */
const menu = (...ids) => ids.map(x => {
  const [rid, ...addons] = x.split("+");
  return { e: { k: rid, rid, choices: {}, addons, portions: null }, r: recette(rid) };
});
const ids = liste => liste.map(x => x.r.id);

/* ---------- Les données ---------- */

test("chaque recette du carnet a ses apports, avec les mots du vocabulaire", () => {
  const mots = ["legumes", "proteines", "feculents", "frais", "riche"];
  for (const r of RECIPES) {
    assert.ok(APPORTS[r.id] !== undefined, `${r.id} : pas d'entrée dans js/apports.js`);
    for (const m of apportsDe(r)) assert.ok(mots.includes(m), `${r.id} : ${m}`);
  }
  assert.deepEqual(Object.keys(APPORTS).filter(id => !RECIPES.some(r => r.id === id)), []);
});

test("un supplément ajoute son apport à la version composée, pas à la recette de base", () => {
  const velouté = recette("veloute-butternut-shiitakes");
  assert.deepEqual(apportsDe(velouté), ["legumes"]);
  assert.deepEqual(apportsDe(velouté, { addons: ["croutons"] }), ["legumes", "feculents"]);
  assert.deepEqual(apportsDe(velouté, { addons: ["graines-courge"] }), ["legumes"]);
});

/* ---------- Quand le carnet parle ---------- */

test("silence : un apéro seul, un dessert seul, une boisson ou une sauce ne forment pas un repas", () => {
  assert.equal(analyser(menu("cake-sale", "torsades-pesto", "cocktail-concombre-menthe")).actif, false);
  assert.equal(analyser(menu("scoopable-cookies")).actif, false);
  assert.equal(analyser(menu("mayonnaise-maison", "cocktail-concombre-menthe")).actif, false);
  assert.equal(analyser([]).actif, false);
});

test("un plat qui se mange à table suffit ; un apéro de trois plats salés fait un dîner", () => {
  assert.equal(analyser(menu("quiche-lorraine")).actif, true);
  assert.equal(analyser(menu("veloute-butternut-shiitakes")).actif, true);
  assert.equal(analyser(menu("focaccia-romarin", "houmous-petits-pois-menthe", "beignets-brebis-menthe")).actif, true);
  assert.equal(analyser(menu("focaccia-romarin", "beignets-brebis-menthe", "scoopable-cookies")).actif, false);
});

/* ---------- Ce qui manque ---------- */

test("une quiche seule : des légumes et quelque chose de frais", () => {
  const a = analyser(menu("quiche-lorraine"));
  assert.deepEqual(a.manques, ["legumes", "frais"]);
  assert.deepEqual(ids(a.riches.map(r => ({ r }))), ["quiche-lorraine"]);
  assert.equal(phrase(a), "Il manque des légumes et quelque chose de frais pour alléger Quiche lorraine.");
});

test("un velouté seul : des protéines et de quoi caler ; avec ses croûtons, il cale", () => {
  assert.deepEqual(analyser(menu("veloute-butternut-shiitakes")).manques, ["proteines", "feculents"]);
  assert.deepEqual(analyser(menu("veloute-butternut-shiitakes+croutons")).manques, ["proteines"]);
});

test("rien ne manque : la quiche et sa salade, le menu de la frise", () => {
  assert.deepEqual(analyser(menu("quiche-lorraine", "salade-kale-pomme-oeuf")).manques, []);
  assert.deepEqual(analyser(menu("focaccia-romarin", "quiche-lorraine", "salade-mediterraneenne")).manques, []);
});

test("un dessert compte pour le riche et le frais, jamais pour les légumes ; boissons et sauces ne comptent pas", () => {
  // Le gravlax est frais : le mi-cuit ne réclame rien de plus ; il manque les légumes et de quoi caler.
  assert.deepEqual(analyser(menu("gravlax-saumon-yaourt-bulgare", "mi-cuit-chocolat-suzy-palatin")).manques, ["legumes", "feculents"]);
  // Le cocktail est frais, mais une boisson n'allège pas une quiche.
  assert.deepEqual(analyser(menu("quiche-lorraine", "cocktail-concombre-menthe")).manques, ["legumes", "frais"]);
  // La mayonnaise est riche, mais une sauce ne réclame pas de fraîcheur.
  assert.ok(!analyser(menu("veloute-butternut-shiitakes", "mayonnaise-maison")).manques.includes("frais"));
});

test("la phrase : « du pain suffit » quand c'est le seul manque ; « le repas » au-delà de deux plats riches", () => {
  assert.equal(phrase({ manques: ["feculents"], riches: [] }), "Il manque de quoi caler (du pain suffit).");
  assert.equal(phrase({ manques: ["proteines", "feculents"], riches: [] }), "Il manque des protéines et de quoi caler.");
  const trois = ["quiche-lorraine", "beignets-brebis-menthe", "scoopable-cookies"].map(recette);
  assert.equal(phrase({ manques: ["legumes", "proteines", "frais"], riches: trois }),
    "Il manque des légumes, des protéines et quelque chose de frais pour alléger le repas.");
  assert.equal(phrase({ manques: ["frais"], riches: trois.slice(0, 2) }),
    "Il manque quelque chose de frais pour alléger Quiche lorraine et Beignets de brebis.");
});

/* ---------- Ce que le carnet propose ---------- */

test("une quiche seule : des salades qui apportent légumes et fraîcheur, jamais un plat déjà au menu", () => {
  const m = menu("quiche-lorraine");
  const s = suggerer(m, analyser(m).manques, { mois: 10 });
  assert.ok(s.length > 0 && s.length <= 3);
  for (const x of s) {
    assert.notEqual(x.r.id, "quiche-lorraine");
    assert.ok(!["Boissons", "Sauces"].includes(x.r.category));
    assert.deepEqual(x.comble, ["legumes", "frais"], x.r.id);
    assert.ok(!apportsDe(x.r).includes("riche"), `${x.r.id} alourdirait le repas`);
  }
  assert.ok(s.every((x, i) => i === 0 || s[i - 1].score >= x.score), "rangées de la plus utile à la moins utile");
});

test("un menu végétarien n'est pas complété par un plat carné quand d'autres font l'affaire", () => {
  const m = menu("veloute-butternut-shiitakes");
  const s = suggerer(m, analyser(m).manques, { mois: 10 });
  assert.ok(!ids(s).includes("quiche-lorraine"), ids(s).join(", "));
  assert.ok(ids(s).includes("salade-lentilles-feta"), ids(s).join(", "));
});

test("les allergènes que les invités évitent écartent une suggestion (version qu'on ajouterait)", () => {
  const m = menu("quiche-lorraine");
  const sans = suggerer(m, ["legumes", "frais"], { exclus: ["lait"], mois: 10 });
  for (const x of sans) assert.ok(!x.r.ingredients.some(i => (ALLERGENES[i.cid] || []).includes("lait")), x.r.id);
  assert.ok(!ids(sans).includes("salade-mediterraneenne"), "la feta contient du lait");
  // La version composée qu'on ajouterait compte : des copeaux de parmesan en supplément contiennent du lait.
  const compo = rid => (rid === "salade-kale-pomme-oeuf" ? { choices: {}, addons: ["parmesan"] } : {});
  assert.ok(!ids(suggerer(m, ["legumes", "frais"], { exclus: ["lait"], compo, mois: 10 })).includes("salade-kale-pomme-oeuf"));
});

test("un dessert ne peut qu'alléger : il n'est jamais proposé pour des légumes ou des protéines", () => {
  const m = menu("quiche-lorraine");
  for (const manques of [["legumes"], ["proteines"], ["feculents"]]) {
    assert.ok(suggerer(m, manques, { max: 20 }).every(x => x.r.category !== "Desserts"));
  }
});

test("rien à proposer quand rien ne manque", () => {
  assert.deepEqual(suggerer(menu("quiche-lorraine"), []), []);
});
