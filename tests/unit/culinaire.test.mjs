/* La logique de cuisinier : identité des ingrédients (un cid = un produit à acheter),
   quantités qu'on peut cuisiner et acheter, fours et préchauffage, moule. */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RECIPES } from "./donnees.mjs";
import { state } from "../../js/core/etat.js";
import { buildCourseList, quantitesDe } from "../../js/core/courses.js";
import { fmtQty, scaleQty, scaleText } from "../../js/core/format.js";
import { portionsPermises, remarqueCuissonMoule } from "../../js/core/adaptation.js";
import { planPrechauffage } from "../../js/core/cuisine.js";
import { dureePrechauffage, planifier, minutesMurales } from "../../js/core/planning.js";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
globalThis.PLACARD = new Function(readFileSync(path.join(racine, "js/placard.js"), "utf8") + ";return PLACARD;")();

const entree = (rid, { k = "t" + rid, choices = {}, addons = [], portions = null } = {}) => ({ k, rid, choices, addons, portions });
const ligne = (liste, cle) => liste.find(i => i.key === cle);
const remettreAZero = () => { state.menu = []; state.checked = {}; state.extras = []; };

/* Tous les ingrédients, options et suppléments compris, avec leur recette. */
const tousIngredients = () => RECIPES.flatMap(r => [
  ...r.ingredients,
  ...(r.choices || []).flatMap(c => c.options.flatMap(o => o.ingredients || [])),
  ...(r.addons || []).flatMap(a => a.ingredients || [])
].map(i => ({ r, i })));

/* ---------- Identité des ingrédients ---------- */

test("un même cid ne porte qu'un seul libellé de courses, dans toutes les recettes", () => {
  const libelles = new Map();
  for (const { i } of tousIngredients()) {
    if (i.course === false || !i.cid) continue;
    const l = (i.shop && i.shop.label) || i.name;
    if (!libelles.has(i.cid)) libelles.set(i.cid, new Set());
    libelles.get(i.cid).add(l);
  }
  for (const [cid, ls] of libelles) assert.equal(ls.size, 1, `${cid} : ${[...ls].join(" / ")}`);
});

test("la farine du pain n'est pas celle des gâteaux : deux cid, deux lignes", () => {
  remettreAZero();
  state.menu = [entree("focaccia-romarin"), entree("scoopable-cookies")];
  const liste = buildCourseList();
  const pain = ligne(liste, "farine-pain"), blé = ligne(liste, "farine");
  assert.ok(pain && blé);
  assert.match(pain.label, /T65/);
  assert.match(blé.label, /T55/);
  assert.doesNotMatch(blé.label, /T65/);
  assert.equal(pain.qty, 500);
  assert.equal(blé.qty, 160);
});

test("les farines de gâteau, de cookies, de beignets et de pâte brisée sont toutes de la T55", () => {
  for (const id of ["scoopable-cookies", "mi-cuit-chocolat-suzy-palatin", "beignets-brebis-menthe", "cake-sale"]) {
    const r = RECIPES.find(x => x.id === id);
    const farine = r.ingredients.find(i => i.cid === "farine");
    assert.match(farine.name, /T55/, id);
  }
  const quiche = RECIPES.find(x => x.id === "quiche-lorraine");
  const pate = quiche.choices[0].options.find(o => o.id === "maison");
  assert.match(pate.ingredients.find(i => i.cid === "farine").name, /T55/);
  assert.equal(RECIPES.find(x => x.id === "focaccia-romarin").ingredients.find(i => i.cid === "farine-pain").qty, 500);
});

test("le libellé affiché ne dépend plus de la première recette du menu", () => {
  remettreAZero();
  const ordres = [["scoopable-cookies", "cake-sale", "quiche-lorraine"], ["quiche-lorraine", "cake-sale", "scoopable-cookies"]];
  const labels = ordres.map(ids => {
    state.menu = ids.map(id => entree(id));
    return ligne(buildCourseList(), "farine").label;
  });
  assert.equal(labels[0], labels[1]);
});

test("le sésame du cake salé et celui des torsades sont le même produit", () => {
  const ids = new Set(tousIngredients().filter(({ i }) => /^Graines de sésame/.test(i.name)).map(({ i }) => i.cid));
  assert.deepEqual([...ids], ["sesame"]);
});

test("les œufs sont marqués entiers partout où l'on en compte", () => {
  const oeufs = tousIngredients().filter(({ i }) => i.cid === "oeufs");
  assert.ok(oeufs.length >= 8);
  for (const { r, i } of oeufs) assert.equal(i.entier, true, `${r.id} : ${i.name}`);
});

test("le fond de placard n'a que des produits qu'on a presque toujours", () => {
  assert.ok(!PLACARD.includes("paprika-fume") && !PLACARD.includes("piment-espelette"));
  assert.ok(!PLACARD.includes("farine-pain"));
  assert.ok(PLACARD.includes("farine") && PLACARD.includes("sucre"));
});

test("le vérificateur refuse deux libellés de courses pour un même cid", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "verif-"));
  try {
    mkdirSync(path.join(tmp, "tools"));
    mkdirSync(path.join(tmp, "js"));
    mkdirSync(path.join(tmp, "js/core"));
    cpSync(path.join(racine, "js/core/format.js"), path.join(tmp, "js/core/format.js"));     // la table des singuliers de portions
    cpSync(path.join(racine, "tools/verifier-recettes.mjs"), path.join(tmp, "tools/verifier-recettes.mjs"));
    for (const f of ["recipes", "placard", "fondamentaux", "allergenes", "saisons", "substitutions"]) {
      cpSync(path.join(racine, `js/${f}.js`), path.join(tmp, `js/${f}.js`));
    }
    writeFileSync(path.join(tmp, "package.json"), '{"type":"module"}');
    const recettes = path.join(tmp, "js/recipes.js");
    // La quiche réclame « Farine » quand le cake dit « Farine T55 » : la liste afficherait l'un ou l'autre.
    writeFileSync(recettes, readFileSync(recettes, "utf8").replace('{ name: "Farine T55", qty: 250, unit: "g"', '{ name: "Farine", qty: 250, unit: "g"'));
    const r = spawnSync("node", [path.join(tmp, "tools/verifier-recettes.mjs")], { encoding: "utf8" });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /farine : libellés de courses différents/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

/* ---------- Quantités qu'on peut cuisiner ---------- */

test("un œuf ne se coupe pas : arrondi à l'entier le plus proche, la moitié vers le haut, jamais zéro", () => {
  assert.equal(scaleQty(1, "", 1.5, true), 2);       // 1½ œuf n'existe pas
  assert.equal(scaleQty(1, "", 1.25, true), 1);
  assert.equal(scaleQty(4, "", 7 / 6, true), 5);     // 4,67
  assert.equal(scaleQty(3, "", 0.5, true), 2);       // 1,5
  assert.equal(scaleQty(1, "", 0.25, true), 1);      // jamais « 0 œuf »
  assert.equal(scaleQty(2, "tranche", 1.25), 3);     // 2½ tranches → 3
  assert.equal(scaleQty(2, "brin", 1.2), 2);
});

test("ce qui se coupe garde ses quarts : un demi-oignon, un demi-citron, une demi-gousse", () => {
  assert.equal(scaleQty(0.5, "", 1.5), 0.75);
  assert.equal(fmtQty(scaleQty(1, "", 1.5)), "1½");
  assert.equal(fmtQty(scaleQty(1, "gousse", 1.5)), "1½");
});

test("grammes et millilitres restent entiers, la fiche et la liste disent la même chose", () => {
  assert.equal(scaleQty(200, "g", 1 / 3), 67);
  assert.equal(scaleQty(100, "ml", 2 / 3), 67);
});

test("une quantité d'œufs écrite dans un texte suit la même règle", () => {
  assert.equal(scaleText("{2-4 œuf} selon les appétits", 1.25), "3 à 5 œufs selon les appétits");
  assert.equal(scaleText("{2-4 œuf} selon les appétits", 1), "2 à 4 œufs selon les appétits");
  assert.equal(scaleText("{1 œuf}", 1), "1 œuf");
});

test("la fiche d'une salade de kale à 5 convives ne demande pas 5 œufs à demi", () => {
  const kale = RECIPES.find(x => x.id === "salade-kale-pomme-oeuf");
  const oeufs = kale.ingredients.find(i => i.cid === "oeufs");
  for (let portions = 1; portions <= 24; portions++) {
    const q = scaleQty(oeufs.qty, oeufs.unit, portions / kale.portions.base, oeufs.entier);
    assert.ok(Number.isInteger(q) && q >= 1, `${portions} portions → ${q}`);
  }
});

test("J'en ai moins : ce que la fiche écrirait ne dépasse jamais ce qu'on possède", () => {
  const oeufs = { qty: 4, unit: "", entier: true };
  for (const possede of [1, 2, 2.6, 3, 3.4, 5]) {
    const n = portionsPermises(oeufs, 6, possede);
    if (n > 0) assert.ok(scaleQty(oeufs.qty, oeufs.unit, n / 6, true) <= possede + 1e-9, `${possede} œufs → ${n} portions`);
  }
  // 2,6 œufs : 4 portions demanderaient 3 œufs écrits, 3 portions en demandent 2.
  assert.equal(portionsPermises(oeufs, 6, 2.6), 3);
  // Un demi-œuf ne fait pas une portion.
  assert.equal(portionsPermises(oeufs, 6, 0.5), 0);
});

/* ---------- Ce qu'on achète ---------- */

test("des œufs entiers : les jaunes et l'œuf de la dorure comptent, la liste n'a que des entiers", () => {
  remettreAZero();
  state.menu = [
    entree("torsades-pesto", { portions: 9 }),
    entree("mayonnaise-maison", { portions: 6 }),
    entree("tagliatelles-carotte-carbonara", { addons: ["oeuf"] })
  ];
  const it = ligne(buildCourseList(), "oeufs");
  assert.ok(Number.isInteger(it.qty));
  assert.equal(it.qty, 2 + 2 + 2);          // 1,5 → 2 ; 1,5 → 2 ; 2 jaunes
});

test("une quantité de courses exprimée en grammes est entière, pas « 66¾ g »", () => {
  remettreAZero();
  state.menu = [entree("pesto-basilic-maison", { portions: 3 })];
  const parmesan = ligne(buildCourseList(), "parmesan");
  assert.equal(parmesan.qty, 38);           // 50 × 3/4 = 37,5
  assert.equal(quantitesDe(parmesan), "38 g");
});

test("un pot de moutarde sert à toutes les vinaigrettes : une seule fois sur la liste", () => {
  remettreAZero();
  state.menu = [
    entree("salade-kale-pomme-oeuf", { choices: { vinaigrette: "moutarde-cidre" } }),
    entree("salade-champetre", { choices: { vinaigrette: "moutardee" } }),
    entree("mayonnaise-maison")
  ];
  const moutarde = ligne(buildCourseList(), "moutarde");
  assert.equal(quantitesDe(moutarde), "1 pot");
});

test("les demi-oignons rouges de trois recettes s'additionnent avant qu'on achète", () => {
  remettreAZero();
  state.menu = [
    entree("focaccia-romarin", { addons: ["oignon-rouge"] }),
    entree("salade-mediterraneenne"),
    entree("salade-lentilles-feta", { addons: ["oignon-rouge"] })
  ];
  const it = ligne(buildCourseList(), "oignon-rouge");
  assert.equal(it.qty, 2);                  // ½ + ¼ + ½ = 1¼ → 2 oignons
});

test("des petits pois en cosses : la liste le dit, la boîte de pois chiches aussi", () => {
  remettreAZero();
  state.menu = [entree("houmous-petits-pois-menthe"), entree("salade-mediterraneenne")];
  const liste = buildCourseList();
  assert.match(ligne(liste, "petits-pois").notes.join(" "), /cosses/);
  assert.equal(quantitesDe(ligne(liste, "pois-chiches")), "2 boîtes");     // une boîte pour le houmous, une pour la salade
});

test("la liste ne dit plus « T55 ou T65 » pour des cookies", () => {
  remettreAZero();
  state.menu = [entree("scoopable-cookies")];
  assert.ok(buildCourseList().every(i => !/T65/.test(i.label)));
});

/* ---------- Four et préchauffage ---------- */

test("le préchauffage dépend de la température", () => {
  assert.equal(dureePrechauffage(150), 10);
  assert.equal(dureePrechauffage(180), 15);
  assert.equal(dureePrechauffage(200), 15);
  assert.equal(dureePrechauffage(220), 20);
  assert.equal(dureePrechauffage(undefined), 15);
});

test("mode cuisine : le bandeau du four remonte assez loin pour la température", () => {
  const etapes = [{ txt: "a" }, { txt: "b", timer: 12 }, { txt: "c", four: 150 }, { txt: "d" }, { txt: "e", timer: 12 }, { txt: "f", four: 230 }];
  assert.deepEqual(planPrechauffage(etapes.slice(0, 3)), { etape: 1, four: 2, temperature: 150, duree: 10 });   // 12 min suffisent pour 150 °C
  assert.equal(planPrechauffage([{ txt: "a", timer: 12 }, { txt: "b", four: 230 }]).etape, 0);
  assert.deepEqual(planPrechauffage([{ txt: "a" }, { txt: "b", timer: 12 }, { txt: "c", four: 230 }]),
    { etape: 0, four: 2, temperature: 230, duree: 20 });                       // 12 min ne suffisent pas pour 230 °C
});

const TABLE = minutesMurales("2030-06-15", 20 * 60);
const tache = (k, titre, temp, duree) => ({ k, titre, temps: { prep: 0, repos: 0, cuisson: duree }, supplement: 0, etapes: [{ titre, duree, four: temp }] });

test("le four attend 20 minutes pour monter à 220 °C, 10 pour 150 °C", () => {
  const chaud = planifier({ table: TABLE, taches: [tache("a", "Pain", 220, 30)] });
  const doux = planifier({ table: TABLE, taches: [tache("a", "Flan", 150, 30)] });
  assert.equal(chaud.evenements.find(e => e.type === "prechauffage").t, TABLE - 30 - 20);
  assert.equal(doux.evenements.find(e => e.type === "prechauffage").t, TABLE - 30 - 10);
});

test("170 °C et 180 °C, c'est le même four : des cookies et une quiche cuisent ensemble", () => {
  remettreAZero();
  const plan = planifier({ table: TABLE, taches: [tache("c", "Cookies", 170, 20), tache("q", "Quiche", 180, 35)] });
  assert.equal(plan.conflits.length, 0);
  assert.equal(plan.evenements.filter(e => e.type === "prechauffage").length, 1);
  assert.equal(plan.retard, 0);
});

test("220 °C et 180 °C, non : le conflit reste annoncé", () => {
  const plan = planifier({ table: TABLE, taches: [tache("f", "Focaccia", 220, 20), tache("q", "Quiche", 180, 35)] });
  assert.equal(plan.conflits.length, 1);
});

/* ---------- Moule ---------- */

test("un autre moule : la cuisson ne change guère, on le dit — et rien à dire pour le moule de la recette", () => {
  const rond = { forme: "rond", diametre: 26 };
  assert.equal(remarqueCuissonMoule(rond, 26), "");
  assert.match(remarqueCuissonMoule(rond, 28), /même épaisseur.*cuisson ne change guère/);
  assert.match(remarqueCuissonMoule({ forme: "cake", longueur: 26 }, 30), /même épaisseur/);
});

/* ---------- Revue : préchauffer plus fort qu'on ne cuit, pluriel ---------- */

test("mi-cuit : on préchauffe à 200 °C même si l'on cuit à 150 °C", () => {
  const miCuit = RECIPES.find(r => r.id === "mi-cuit-chocolat-suzy-palatin");
  const cuisson = miCuit.steps.find(s => s.four);
  assert.equal(cuisson.four, 150);
  assert.equal(cuisson.prechauffe, 200);
  // Mode cuisine : le texte d'une étape précédente parle déjà de préchauffer → pas de bandeau ; sinon 200 °C et 15 min.
  assert.deepEqual(planPrechauffage([{ txt: "a", timer: 30 }, { txt: "b", four: 150, prechauffe: 200 }]),
    { etape: 0, four: 1, temperature: 200, duree: 15 });
  // Rétroplanning : le four monte à 200 °C, on enfourne « à 150 °C ».
  const t = { k: "m", titre: "Mi-cuit", temps: { prep: 0, repos: 0, cuisson: 30 }, supplement: 0,
    etapes: [{ titre: "Cuisson", duree: 30, four: 150, prechauffe: 200 }] };
  const plan = planifier({ table: TABLE, taches: [t] });
  assert.equal(plan.evenements.find(e => e.type === "prechauffage").temp, 200);
  assert.equal(plan.evenements.find(e => e.type === "enfourner").temp, 150);
});

test("un mi-cuit préchauffé à 200 °C et une quiche à 180 °C ne cuisent pas ensemble", () => {
  const t = { k: "m", titre: "Mi-cuit", temps: { prep: 0, repos: 0, cuisson: 30 }, supplement: 0,
    etapes: [{ titre: "Cuisson", duree: 30, four: 150, prechauffe: 200 }] };
  const plan = planifier({ table: TABLE, taches: [t, tache("q", "Quiche", 180, 35)] });
  assert.equal(plan.conflits.length, 1);
});

test("le pluriel commence à deux : « 1½ boîte », « 2 boîtes »", async () => {
  const { fmtUnit } = await import("../../js/core/format.js");
  assert.equal(fmtUnit("boîte", 1), "boîte");
  assert.equal(fmtUnit("boîte", 1.5), "boîte");
  assert.equal(fmtUnit("boîte", 2), "boîtes");
  assert.equal(fmtUnit("sachet", 1.9), "sachets");           // fmtQty écrit « 2 »
});
