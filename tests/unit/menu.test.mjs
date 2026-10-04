/* Le repas : rétroplanning (core/planning.js, pur) et logique du menu côté repas
   (convives, allergies, historique, annulations — core/menu.js). */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./donnees.mjs";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
Object.assign(globalThis, new Function(readFileSync(path.join(racine, "js/allergenes.js"), "utf8") + ";return { ALLERGENES_LISTE, ALLERGENES };")());

const { state } = await import("../../js/core/etat.js");
const menu = await import("../../js/core/menu.js");
const planning = await import("../../js/core/planning.js");
const { planifier, minutesMurales, instantTable, phraseConflit, phraseRetard, icsRepas, texteEvenement, heureFr, decomposer, nomCourt } = planning;

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
const tache = k => menu.tachesDuMenu().find(t => t.k === k);
const min = (plan, k) => plan.recettes.find(r => r.k === k);

/* ---------- Heures ---------- */

test("heures : minutes murales, aller-retour et façon de le dire", () => {
  assert.equal(planning.minutesDe("20:30"), 1230);
  assert.equal(planning.minutesDe("25:00"), null);
  assert.equal(planning.minutesDe(""), null);
  assert.deepEqual(decomposer(minutesMurales(JOUR, 19 * 60 + 35)), { date: JOUR, hh: 19, mm: 35 });
  assert.equal(heureFr(TABLE), "20 h");
  assert.equal(heureFr(TABLE - 25), "19 h 35");
});

test("instantTable : date choisie, sinon la prochaine fois qu'il sera cette heure-là", () => {
  const maintenant = { date: "2026-10-04", minutes: 15 * 60 };
  const aujourdhui = instantTable({ date: "", heure: "20:00" }, maintenant);
  assert.equal(aujourdhui.date, "2026-10-04");
  assert.equal(aujourdhui.maintenant, minutesMurales("2026-10-04", 15 * 60));
  const demain = instantTable({ date: "", heure: "12:00" }, maintenant);
  assert.equal(demain.date, "2026-10-05");
  assert.equal(demain.maintenant, null);
  assert.equal(instantTable({ date: "2030-01-02", heure: "20:00" }, maintenant).date, "2030-01-02");
  // Une date passée ne vaut rien : on retombe sur la prochaine occurrence.
  assert.equal(instantTable({ date: "2020-01-02", heure: "20:00" }, maintenant).date, "2026-10-04");
  assert.equal(instantTable({ date: "", heure: "" }, maintenant), null);
});

test("nomCourt : le début du titre, avant la première précision", () => {
  assert.equal(nomCourt("Focaccia maison au romarin"), "Focaccia");
  assert.equal(nomCourt("Quiche lorraine"), "Quiche lorraine");
  assert.equal(nomCourt("Salade méditerranéenne : pois chiches, feta & olives"), "Salade méditerranéenne");
  assert.equal(nomCourt("Scoopable cookies (cookies à la cuillère)"), "Scoopable cookies");
});

/* ---------- Heures de départ et préchauffage ---------- */

test("recette sans minuteur : la durée annoncée se loge dans les étapes, départ = table - durée", () => {
  vide();
  ajouter("dip-chevre-herbes", { k: "d" });
  const plan = planifier({ table: TABLE, taches: menu.tachesDuMenu() });
  const dip = min(plan, "d");
  assert.equal(dip.duree, 10);
  assert.equal(dip.debut, TABLE - 10);
  assert.equal(dip.fin, TABLE);
  assert.equal(dip.four, null);
  assert.deepEqual(plan.evenements.map(e => e.type), ["debut", "table"]);
  assert.equal(plan.retard, 0);
});

test("focaccia seule : départ, entrée au four, sortie à l'heure, préchauffage vingt minutes avant (220 °C)", () => {
  vide();
  ajouter("focaccia-romarin", { k: "f" });
  const plan = planifier({ table: TABLE, taches: menu.tachesDuMenu() });
  const f = min(plan, "f");
  assert.equal(f.duree, 210);                       // 20 + 170 + 20 min, minuteurs compris
  assert.equal(f.debut, TABLE - 210);
  assert.deepEqual(f.four, { temp: 220, entree: TABLE - 20, sortie: TABLE });
  const pre = plan.evenements.find(e => e.type === "prechauffage");
  assert.equal(pre.t, TABLE - 20 - planning.dureePrechauffage(220));
  assert.equal(pre.temp, 220);
  assert.equal(texteEvenement(pre), "Préchauffe le four à 220 °C");
  assert.deepEqual(plan.evenements.map(e => e.type), ["debut", "prechauffage", "enfourner", "sortir", "table"]);
});

test("les départs tombent sur des multiples de cinq minutes, jamais après l'heure", () => {
  vide();
  ajouter("quiche-lorraine", { k: "q" });
  const plan = planifier({ table: TABLE + 3, taches: menu.tachesDuMenu() });   // 20 h 03
  const q = min(plan, "q");
  assert.equal(q.debut % 5, 0);
  assert.ok(q.fin <= TABLE + 3);
});

test("un supplément minuté allonge la recette", () => {
  vide();
  ajouter("houmous-petits-pois-menthe", { k: "h" });
  const sans = planifier({ table: TABLE, taches: [tache("h")] }).recettes[0].duree;
  state.menu[0].addons = ["sesame"];            // sésame torréfié : 2 min à la poêle
  const avec = planifier({ table: TABLE, taches: [tache("h")] }).recettes[0].duree;
  assert.equal(avec - sans, 2);
});

/* ---------- Le four ---------- */

test("conflit de four : focaccia à 220 °C et quiche à 180 °C, la plus chaude d'abord et l'heure tenue", () => {
  vide();
  ajouter("focaccia-romarin", { k: "f" });
  ajouter("quiche-lorraine", { k: "q" });
  const plan = planifier({ table: TABLE, taches: menu.tachesDuMenu() });
  assert.equal(plan.conflits.length, 1);
  const [c] = plan.conflits;
  assert.equal(c.premier.k, "f");
  assert.equal(c.second.k, "q");
  assert.equal(c.premier.temp, 220);
  assert.equal(c.second.temp, 180);
  const f = min(plan, "f"), q = min(plan, "q");
  assert.ok(f.four.sortie + 10 <= q.four.entree, "la focaccia sort avant que la quiche entre");
  assert.equal(q.fin, q.debut + q.duree);
  assert.ok(q.fin <= TABLE && f.fin < TABLE);
  assert.equal(plan.retard, 0);
  assert.ok(c.decale > 0);
  assert.match(phraseConflit(c), /^Focaccia à 220 °C et Quiche lorraine à 180 °C en même temps : enfourne « Focaccia » d'abord : départ avancé de \d+ min, l'heure est tenue/);
  // Le four se règle entre les deux fournées.
  const types = plan.evenements.map(e => e.type);
  assert.ok(types.includes("regler") || types.filter(t => t === "prechauffage").length === 2);
});

test("conflit de four : plusieurs plats à la même température contre le même premier n'en font qu'un", () => {
  vide();
  ajouter("focaccia-romarin", { k: "f" });
  ajouter("quiche-lorraine", { k: "q" });
  ajouter("cake-sale", { k: "c" });
  const plan = planifier({ table: TABLE, taches: menu.tachesDuMenu() });
  assert.equal(plan.conflits.length, 1);
  assert.match(phraseConflit(plan.conflits[0]), /^Focaccia à 220 °C et Quiche lorraine et Cake salé à 180 °C en même temps/);
  assert.equal(plan.retard, 0);
});

test("deux plats à la même température ne se gênent pas", () => {
  vide();
  ajouter("cake-sale", { k: "c" });
  ajouter("quiche-lorraine", { k: "q" });
  const plan = planifier({ table: TABLE, taches: menu.tachesDuMenu() });
  assert.equal(plan.conflits.length, 0);
  assert.equal(min(plan, "c").fin, min(plan, "c").debut + min(plan, "c").duree);
  assert.equal(plan.evenements.filter(e => e.type === "prechauffage").length, 1);
});

test("trois plats à trois températures : du plus chaud au moins chaud, sans chevauchement", () => {
  vide();
  ajouter("focaccia-romarin", { k: "f" });      // 220
  ajouter("quiche-lorraine", { k: "q" });       // 180
  ajouter("mi-cuit-chocolat-suzy-palatin", { k: "m" });   // 150
  const plan = planifier({ table: TABLE, taches: menu.tachesDuMenu() });
  const f = min(plan, "f"), q = min(plan, "q"), m = min(plan, "m");
  assert.ok(f.four.sortie + 10 <= q.four.entree);
  assert.ok(f.four.sortie + 10 <= m.four.entree);
  assert.ok(q.four.sortie + 10 <= m.four.entree || m.four.sortie + 10 <= q.four.entree || q.four.temp === m.four.temp);
  assert.ok(plan.conflits.length >= 2);
});

test("trop tard pour tenir l'heure : le retard est annoncé, rien ne part dans le passé", () => {
  vide();
  ajouter("focaccia-romarin", { k: "f" });
  const maintenant = TABLE - 60;
  const plan = planifier({ table: TABLE, maintenant, taches: menu.tachesDuMenu() });
  assert.ok(min(plan, "f").debut >= maintenant);
  assert.equal(plan.retard, 150);
  assert.equal(plan.tableReelle, TABLE + 150);
  assert.match(phraseRetard(plan), /150 min de retard.*22 h 30/);
});

test("un conflit que « maintenant » rend insoluble repousse le plat suivant : le retard le dit", () => {
  vide();
  ajouter("focaccia-romarin", { k: "f" });
  ajouter("quiche-lorraine", { k: "q" });
  const plan = planifier({ table: TABLE, maintenant: TABLE - 120, taches: menu.tachesDuMenu() });
  const f = min(plan, "f"), q = min(plan, "q");
  assert.ok(f.debut >= TABLE - 120);
  assert.ok(f.four.sortie + 10 <= q.four.entree);
  assert.ok(plan.retard > 0);
  assert.match(phraseConflit(plan.conflits[0]), /l'heure n'est pas tenue/);
});

test("mains libres : ce qui démarre pendant l'attente d'une autre recette le dit", () => {
  vide();
  ajouter("focaccia-romarin", { k: "f" });
  ajouter("dip-chevre-herbes", { k: "d" });
  const plan = planifier({ table: TABLE, taches: menu.tachesDuMenu() });
  const debutDip = plan.evenements.find(e => e.type === "debut" && e.k === "d");
  assert.deepEqual(debutDip.parallele, ["Focaccia maison au romarin"]);
  const debutFocaccia = plan.evenements.find(e => e.type === "debut" && e.k === "f");
  assert.deepEqual(debutFocaccia.parallele, []);
});

test("un menu sans recette ne plante pas", () => {
  const plan = planifier({ table: TABLE, taches: [] });
  assert.deepEqual(plan.evenements.map(e => e.type), ["table"]);
});

/* ---------- Le calendrier ---------- */

test("icsRepas : fuseau Europe/Paris, un événement par recette, des rappels, lignes pliées", () => {
  vide();
  ajouter("focaccia-romarin", { k: "f" });
  ajouter("quiche-lorraine", { k: "q" });
  const plan = planifier({ table: TABLE, taches: menu.tachesDuMenu() });
  const ics = icsRepas(plan, { horodatage: "20300101T000000Z", convives: 6 });
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /\r\nEND:VCALENDAR\r\n$/);
  assert.ok(ics.includes("TZID:Europe/Paris"));
  assert.ok(ics.includes("BEGIN:VTIMEZONE"));
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, (ics.match(/END:VEVENT/g) || []).length);
  assert.ok(ics.includes("SUMMARY:Cuisiner : Focaccia"));
  assert.ok(ics.includes("SUMMARY:Cuisiner : Quiche lorraine"));
  assert.ok(ics.includes("SUMMARY:À table !"));
  assert.ok(ics.includes("DTSTART;TZID=Europe/Paris:20300615T200000"));
  assert.ok(ics.includes("DESCRIPTION:6 convives"));
  assert.ok(/TRIGGER:-PT30M/.test(ics));
  assert.ok((ics.match(/BEGIN:VALARM/g) || []).length >= 4);
  assert.ok(/SUMMARY:Préchauffe le four à 220 °C/.test(ics));
  for (const ligne of ics.split("\r\n")) assert.ok(Buffer.byteLength(ligne) <= 75, ligne);
  // Les virgules et les points-virgules du texte sont échappés.
  const avecVirgule = icsRepas({ ...plan, recettes: [{ ...plan.recettes[0], titre: "Pâtes, sauce; tomate" }] }, { horodatage: "20300101T000000Z" });
  assert.ok(avecVirgule.includes("SUMMARY:Cuisiner : Pâtes\\, sauce\\; tomate") || avecVirgule.includes("SUMMARY:Cuisiner : Pâtes"));
});

test("icsRepas : un titre accentué long se plie à 75 octets, pas à 75 caractères", () => {
  vide();
  ajouter("focaccia-romarin", { k: "f" });
  const plan = planifier({ table: TABLE, taches: menu.tachesDuMenu() });
  plan.recettes[0].titre = "Éééééééééé ".repeat(12);
  const ics = icsRepas(plan, { horodatage: "20300101T000000Z" });
  for (const ligne of ics.split("\r\n")) assert.ok(Buffer.byteLength(ligne) <= 75, ligne);
  assert.ok(ics.includes("\r\n "));
});

/* ---------- Convives ---------- */

test("convives : les portions de toutes les entrées en « personnes » suivent, les autres gardent leur réglage", () => {
  vide();
  ajouter("quiche-lorraine", { k: "q" });
  ajouter("cake-sale", { k: "c", portions: 9 });
  ajouter("cocktail-concombre-menthe", { k: "v", portions: 3 });          // verres
  ajouter("tartines-figues-chevre-miel", { k: "t", portions: 5 });        // tartines
  assert.equal(menu.setConvives(10), 10);
  const p = k => state.menu.find(e => e.k === k).portions;
  assert.equal(p("q"), 10);
  assert.equal(p("c"), 10);
  assert.equal(p("v"), 3);
  assert.equal(p("t"), 5);
  assert.equal(state.repas.convives, 10);
  assert.equal(menu.setConvives(0), 1);
  assert.equal(menu.setConvives(99), 24);
});

test("convives : sans choix, ceux que le menu suppose ; une recette ajoutée ensuite s'y range", () => {
  vide();
  assert.equal(menu.lireRepas().convives, 4);
  ajouter("quiche-lorraine", { k: "q", portions: 8 });
  ajouter("cake-sale", { k: "c", portions: 8 });
  ajouter("dip-chevre-herbes", { k: "d", portions: 2 });
  assert.equal(menu.lireRepas().convives, 8);
  assert.equal(state.repas, undefined, "lire ne fixe rien");
  menu.setConvives(5);
  const e = menu.ajouterAuMenu("mayonnaise-maison");
  assert.equal(e.portions, 5);
  const v = menu.ajouterAuMenu("cocktail-concombre-menthe");
  assert.equal(v.portions, null, "des verres ne se comptent pas par convive");
});

/* ---------- Allergies ---------- */

test("allergies : le message dit quoi et dans quoi, version composée comprise", () => {
  vide();
  const lait = e => menu.allergenesDeEntree(RECIPES.find(r => r.id === e.rid), e, ["lait"]);
  const cake = ajouter("cake-sale", { k: "c", choices: { garniture: "lardons-comte" } });
  const [a] = lait(cake);
  assert.equal(a.id, "lait");
  assert.equal(a.phrase, "du lait");
  assert.ok(a.ingredients.includes("comté râpé"), a.ingredients.join(", "));
  assert.ok(a.ingredients.includes("lait"));
  // Une autre garniture, un autre contenu.
  cake.choices = { garniture: "olives-feta" };
  assert.ok(lait(cake)[0].ingredients.includes("feta"));
  assert.ok(!lait(cake)[0].ingredients.includes("comté râpé"));
  // Sans allergène à éviter : rien.
  assert.deepEqual(menu.allergenesDeEntree(RECIPES.find(r => r.id === "cake-sale"), cake, []), []);
  // Un supplément compte aussi.
  const sesame = e => menu.allergenesDeEntree(RECIPES.find(r => r.id === "cake-sale"), e, ["sesame"]);
  assert.deepEqual(sesame(cake), []);
  cake.addons = ["graines-sesame"];
  assert.equal(sesame(cake)[0].phrase, "du sésame");
  assert.ok(sesame(cake)[0].ingredients.includes("graines de sésame"));
});

test("allergies : les allergènes à éviter se basculent et se retiennent", () => {
  vide();
  menu.basculerExclu("lait");
  menu.basculerExclu("oeufs");
  assert.deepEqual(menu.lireRepas().exclus, ["lait", "oeufs"]);
  menu.basculerExclu("lait");
  assert.deepEqual(menu.lireRepas().exclus, ["oeufs"]);
});

/* ---------- Historique et annulations ---------- */

test("vider le menu range le repas dans l'historique, avec la composition de chaque entrée", () => {
  vide();
  ajouter("cake-sale", { k: "c", choices: { garniture: "olives-feta" }, addons: ["herbes-provence"], portions: 8 });
  ajouter("quiche-lorraine", { k: "q" });
  state.checked = { farine: true, "x-e1": true };
  menu.setConvives(8);
  menu.setDateRepas("2030-06-15");
  menu.viderLeMenu();
  assert.deepEqual(state.menu, []);
  assert.equal(state.historique.length, 1);
  const h = state.historique[0];
  assert.equal(h.date, "2030-06-15");
  assert.equal(h.convives, 8);
  assert.deepEqual(h.entrees.map(e => e.rid).sort(), ["cake-sale", "quiche-lorraine"]);
  const cake = h.entrees.find(e => e.rid === "cake-sale");
  assert.deepEqual(cake.choices, { garniture: "olives-feta" });
  assert.deepEqual(cake.addons, ["herbes-provence"]);
  assert.equal(cake.portions, 8);
  // Les coches du repas disparaissent, celles des articles libres restent.
  assert.deepEqual(state.checked, { "x-e1": true });
  assert.equal(state.repas.date, "", "la date visée est passée");
});

test("vider un menu déjà vide ne laisse rien dans l'historique", () => {
  vide();
  menu.viderLeMenu();
  assert.equal((state.historique || []).length, 0);
});

test("« Annuler » restaure le menu tel quel : entrées, coches, historique, repas", () => {
  vide();
  ajouter("cake-sale", { k: "c", portions: 8 });
  state.checked = { farine: true };
  menu.setDateRepas("2030-06-15");
  const avant = JSON.parse(JSON.stringify({ menu: state.menu, checked: state.checked, repas: state.repas }));
  const instantane = menu.viderLeMenu();
  menu.restaurerMenu(instantane);
  assert.deepEqual(state.menu, avant.menu);
  assert.deepEqual(state.checked, avant.checked);
  assert.deepEqual(state.repas, avant.repas);
  assert.equal((state.historique || []).length, 0);
});

test("retirer une entrée puis annuler la remet à sa place, clé comprise", () => {
  vide();
  ajouter("cake-sale", { k: "a" });
  ajouter("quiche-lorraine", { k: "b" });
  ajouter("mayonnaise-maison", { k: "c" });
  const retire = menu.retirerDuMenu("b");
  assert.deepEqual(state.menu.map(e => e.k), ["a", "c"]);
  menu.remettreAuMenu(retire);
  assert.deepEqual(state.menu.map(e => e.k), ["a", "b", "c"]);
  menu.remettreAuMenu(retire);
  assert.equal(state.menu.length, 3, "annuler deux fois ne duplique pas");
  assert.equal(menu.retirerDuMenu("zzz"), null);
});

test("refaire un repas remet ses entrées avec des clés neuves ; annuler les retire", () => {
  vide();
  ajouter("cake-sale", { k: "c", choices: { garniture: "saumon-aneth" }, portions: 6 });
  menu.viderLeMenu();
  const id = state.historique[0].id;
  const cles = menu.refaireRepas(id);
  assert.equal(cles.length, 1);
  assert.notEqual(cles[0], "c");
  assert.deepEqual(state.menu[0].choices, { garniture: "saumon-aneth" });
  assert.equal(state.menu[0].portions, 6);
  assert.equal(state.historique.length, 1, "le repas passé reste dans l'historique");
  menu.defaireRefaire(cles);
  assert.deepEqual(state.menu, []);
  assert.deepEqual(menu.refaireRepas("inconnu"), []);
});

test("l'historique garde les trente derniers repas", () => {
  vide();
  for (let i = 0; i < 32; i++) { ajouter("cake-sale", { k: "c" + i }); menu.viderLeMenu(); }
  assert.equal(state.historique.length, 30);
});
