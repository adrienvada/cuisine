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
  // Une garniture ne cale pas : trois châtaignes sur un velouté.
  assert.deepEqual(apportsDe(velouté, { addons: ["chataignes"] }), ["legumes"]);
  // Deux ou trois radis par personne rafraîchissent un dip, mais ne font pas une part de légumes.
  assert.deepEqual(apportsDe(recette("dip-chevre-herbes"), { addons: ["radis"] }), ["frais"]);
  assert.deepEqual(apportsDe(recette("houmous-petits-pois-menthe"), { addons: ["pita"] }), ["frais", "feculents"]);
});

/* ---------- Quand le carnet parle ---------- */

test("silence : un apéro seul, un dessert seul, une boisson ou une sauce ne forment pas un repas", () => {
  assert.equal(analyser(menu("cake-sale", "torsades-pesto", "cocktail-concombre-menthe")).actif, false);
  // Trois plats salés, c'est encore un apéro : le carnet ne le sermonne pas.
  assert.equal(analyser(menu("cake-sale", "torsades-pesto", "focaccia-romarin")).actif, false);
  assert.equal(analyser(menu("scoopable-cookies")).actif, false);
  assert.equal(analyser(menu("mayonnaise-maison", "cocktail-concombre-menthe")).actif, false);
  assert.equal(analyser([]).actif, false);
});

test("un plat qui se mange à table suffit ; un apéro de quatre plats salés fait un dîner", () => {
  assert.equal(analyser(menu("quiche-lorraine")).actif, true);
  assert.equal(analyser(menu("veloute-butternut-shiitakes")).actif, true);
  assert.equal(analyser(menu("focaccia-romarin", "houmous-petits-pois-menthe", "dip-chevre-herbes", "beignets-brebis-menthe")).actif, true);
  assert.equal(analyser(menu("focaccia-romarin", "houmous-petits-pois-menthe", "beignets-brebis-menthe")).actif, false);
  assert.equal(analyser(menu("focaccia-romarin", "beignets-brebis-menthe", "scoopable-cookies", "mi-cuit-chocolat-suzy-palatin")).actif, false);
});

/* ---------- Ce qui manque ---------- */

test("une quiche seule : des légumes et un peu de fraîcheur", () => {
  const a = analyser(menu("quiche-lorraine"));
  assert.deepEqual(a.manques, ["legumes", "frais"]);
  assert.equal(phrase(a.manques), "Il manque encore des légumes et un peu de fraîcheur pour alléger le repas.");
  // Un houmous à l'apéro ne fait pas la part de légumes : il ne fait qu'alléger.
  assert.deepEqual(analyser(menu("houmous-petits-pois-menthe", "quiche-lorraine")).manques, ["legumes"]);
});

test("un velouté seul : des protéines et de quoi caler ; avec ses croûtons, il cale", () => {
  assert.deepEqual(analyser(menu("veloute-butternut-shiitakes")).manques, ["proteines", "feculents"]);
  assert.deepEqual(analyser(menu("veloute-butternut-shiitakes+croutons")).manques, ["proteines"]);
});

test("rien ne manque : la quiche et sa salade, le menu de la frise", () => {
  assert.deepEqual(analyser(menu("quiche-lorraine", "salade-kale-pomme-oeuf")).manques, []);
  assert.deepEqual(analyser(menu("focaccia-romarin", "quiche-lorraine", "salade-mediterraneenne")).manques, []);
});

test("un dessert peut alléger, jamais alourdir ni apporter des légumes ; boissons et sauces ne comptent pas", () => {
  // Le gravlax a son pain suédois, il cale ; il ne manque que des légumes.
  assert.deepEqual(analyser(menu("gravlax-saumon-yaourt-bulgare", "mi-cuit-chocolat-suzy-palatin")).manques, ["legumes"]);
  // Un mi-cuit au chocolat après un velouté ne rend pas le repas lourd : pas de fraîcheur à réclamer.
  assert.deepEqual(analyser(menu("veloute-butternut-shiitakes", "mi-cuit-chocolat-suzy-palatin")).manques, ["proteines", "feculents"]);
  // Le cocktail est frais, mais une boisson n'allège pas une quiche.
  assert.deepEqual(analyser(menu("quiche-lorraine", "cocktail-concombre-menthe")).manques, ["legumes", "frais"]);
  // La mayonnaise est riche, mais une sauce ne réclame pas de fraîcheur.
  assert.ok(!analyser(menu("veloute-butternut-shiitakes", "mayonnaise-maison")).manques.includes("frais"));
});

test("un apéro dînatoire ne se fait pas reprocher ses légumes, mais sa lourdeur oui", () => {
  const apero = menu("cake-sale", "torsades-pesto", "focaccia-romarin", "beignets-brebis-menthe");
  assert.deepEqual(analyser(apero).manques, ["frais"]);
  // Fromage, pain, de quoi rafraîchir : un dînatoire complet, le carnet se tait.
  assert.deepEqual(analyser(menu("focaccia-romarin", "houmous-petits-pois-menthe", "dip-chevre-herbes", "beignets-brebis-menthe")).manques, []);
});

test("la phrase : « du pain suffit » tant que les manques sont deux au plus", () => {
  assert.equal(phrase(["feculents"]), "Il manque encore de quoi caler (du pain suffit).");
  assert.equal(phrase(["proteines", "feculents"]), "Il manque encore des protéines et de quoi caler (du pain suffit).");
  assert.equal(phrase(["legumes", "proteines", "feculents"]), "Il manque encore des légumes, des protéines et de quoi caler.");
  assert.equal(phrase(["feculents", "frais"]), "Il manque encore de quoi caler (du pain suffit) et un peu de fraîcheur pour alléger le repas.");
  assert.equal(phrase(["frais"]), "Il manque encore un peu de fraîcheur pour alléger le repas.");
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
  // Même à la dernière place : un plat carné dans un menu végétarien ne vaut pas une carte.
  assert.ok(!ids(suggerer(m, analyser(m).manques, { mois: 10, max: 20 })).includes("quiche-lorraine"));
});

test("rien de riche tant que le menu n'a rien de frais : il faudrait ensuite l'alléger", () => {
  // Le velouté n'appelle pas de fraîcheur, mais des beignets ou un cake l'alourdiraient.
  const m = menu("veloute-butternut-shiitakes");
  const s = suggerer(m, analyser(m).manques, { mois: 10 });
  assert.equal(s.length, 3);
  for (const x of s) assert.ok(!apportsDe(x.r).includes("riche"), x.r.id);
  // Avec une salade déjà au menu, la question ne se pose plus.
  const k = menu("salade-kale-pomme-oeuf");
  assert.ok(ids(suggerer(k, ["feculents"], { mois: 10, max: 20 })).includes("torsades-pesto"));
});

test("le four se lit sur la version qu'on ajouterait : des tartines au chèvre frais n'y passent pas", () => {
  const m = menu("quiche-lorraine");
  const score = (id, compo) => suggerer(m, ["feculents"], { max: 20, compo }).find(x => x.r.id === id).score;
  const chaud = rid => (rid === "tartines-figues-chevre-miel" ? { choices: { chevre: "chaud" }, addons: [] } : {});
  assert.equal(score("tartines-figues-chevre-miel") - score("tartines-figues-chevre-miel", chaud), 0.5);
  // La focaccia passe au four, déjà pris par la quiche.
  assert.equal(score("salade-champetre") - score("focaccia-romarin"), 0.5);
});

test("en dessous du seuil, le carnet préfère se taire plutôt que de proposer un pis-aller", () => {
  // Sans œufs, à une salade champêtre il manque des protéines : les tagliatelles aux lardons
  // dans un menu végétarien ne valent pas une troisième carte.
  const m = menu("salade-champetre");
  assert.deepEqual(ids(suggerer(m, analyser(m).manques, { exclus: ["oeufs"], mois: 10 })), ["salade-mediterraneenne", "salade-lentilles-feta"]);
});

test("à égalité, les recettes qu'on aime d'abord, puis celles qu'on n'a pas faites depuis longtemps", () => {
  const m = menu("quiche-lorraine");
  const manques = analyser(m).manques;
  const ordre = opts => ids(suggerer(m, manques, { mois: 10, max: 4, ...opts }));
  assert.deepEqual(ordre({}), ["salade-kale-pomme-oeuf", "salade-mediterraneenne", "salade-champetre", "salade-lentilles-feta"]);
  assert.deepEqual(ordre({ favori: r => r.id === "salade-lentilles-feta" }), ["salade-kale-pomme-oeuf", "salade-lentilles-feta", "salade-mediterraneenne", "salade-champetre"]);
  assert.deepEqual(ordre({ derniere: r => (r.id === "salade-mediterraneenne" ? Date.UTC(2026, 9, 1) : null) }), ["salade-kale-pomme-oeuf", "salade-champetre", "salade-lentilles-feta", "salade-mediterraneenne"]);
  // L'utilité passe avant tout : une recette aimée ne double pas une plus utile.
  assert.equal(ordre({ favori: r => r.id === "salade-champetre" })[0], "salade-kale-pomme-oeuf");
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
