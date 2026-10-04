/* Deuxième vague, lot « rédaction » : l'accord des portions (« 1 personne »), la typographie française (typo), les phrases du rétroplanning, les textes qui partent hors du DOM (partage, .ics). */

import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RECIPES } from "./donnees.mjs";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
globalThis.PLACARD = new Function(readFileSync(path.join(racine, "js/placard.js"), "utf8") + ";return PLACARD;")();

const { libellePortions, SINGULIERS_PORTIONS, typo } = await import("../../js/core/format.js");
const { state } = await import("../../js/core/etat.js");
const menu = await import("../../js/core/menu.js");
const planning = await import("../../js/core/planning.js");
const { recipeShareText, shareRecipe } = await import("../../js/ui/partage.js");

const NBSP = " ", FINE = " ";

/* ---------- Constat n° 0 : « 1 personnes » ---------- */

test("libellePortions : singulier pour 0 et 1, pluriel dès 2, pour chaque unité des recettes", () => {
  assert.equal(libellePortions(1, "personnes"), "1 personne");
  assert.equal(libellePortions(1, "verres"), "1 verre");
  assert.equal(libellePortions(1, "tartines"), "1 tartine");
  assert.equal(libellePortions(0, "personnes"), "0 personne");
  assert.equal(libellePortions(2, "personnes"), "2 personnes");
  assert.equal(libellePortions(12, "verres"), "12 verres");
  assert.equal(libellePortions(1, "parts"), "1 parts", "une unité inconnue n'est pas inventée");
});

test("tout label de portions d'une recette a son singulier", () => {
  const labels = new Set(RECIPES.map(r => r.portions.label));
  assert.ok(labels.size >= 3, "personnes, verres, tartines au moins");
  for (const l of labels) {
    assert.ok(SINGULIERS_PORTIONS[l], `« ${l} » n'a pas de singulier`);
    assert.ok(libellePortions(1, l).startsWith("1 ") && !libellePortions(1, l).endsWith("s"), l);
  }
});

test("le texte de partage d'une recette à 1 portion dit « 1 personne », avec la typographie", async () => {
  const r = RECIPES.find(x => x.portions.label === "personnes");
  Object.assign(state, { menu: [], portions: { [r.id]: 1 }, choices: {}, addons: {} });
  assert.match(recipeShareText(r, { portions: 1, choices: {}, addons: [] }), /Pour 1 personne :/);
  const envois = [];
  Object.defineProperty(globalThis, "navigator", { value: { share: async d => { envois.push(d); } }, configurable: true });
  globalThis.location = { protocol: "https:", origin: "https://exemple.test", pathname: "/cuisine/" };
  await shareRecipe(r.id);
  assert.ok(envois[0].text.includes(`Pour 1 personne${NBSP}:`), envois[0].text);
  assert.doesNotMatch(envois[0].text, /1 personnes/);
  assert.doesNotMatch(envois[0].text, / [:;!?]/, "rien n'est envoyé avec une espace ordinaire avant la ponctuation");
});

/* ---------- Constat n° 5 : typographie ---------- */

test("typo : espace insécable avant « : », fine avant « ; ! ? », fine dans les guillemets", () => {
  assert.equal(typo("Préparation : 15 min"), `Préparation${NBSP}: 15${NBSP}min`);
  assert.equal(typo("Pour combien ?"), `Pour combien${FINE}?`);
  assert.equal(typo("À table !"), `À table${FINE}!`);
  assert.equal(typo("a ; b"), `a${FINE}; b`);
  assert.equal(typo("une pâte « pur beurre » ici"), `une pâte «${FINE}pur beurre${FINE}» ici`);
  assert.equal(typo("«pur»"), `«${FINE}pur${FINE}»`);
});

test("typo : un nombre et son unité ne se séparent pas", () => {
  assert.equal(typo("Enfourne à 180 °C"), `Enfourne à 180${NBSP}°C`);
  for (const u of ["g", "kg", "cl", "ml", "l", "min", "h", "cm"]) {
    assert.equal(typo(`12 ${u} de`), `12${NBSP}${u} de`, u);
  }
  assert.equal(typo("1 h 30"), `1${NBSP}h 30`);
  assert.equal(typo("2 gousses, 3 oeufs, 4 le"), "2 gousses, 3 oeufs, 4 le", "g, l et h ne mangent pas le mot suivant");
  assert.equal(typo("2 l'huile"), "2 l'huile");
});

test("typo : les heures, les adresses et les textes sans règle restent intacts", () => {
  for (const s of ["à 12:30", "https://exemple.fr/cuisine/r/focaccia.html?p=8&c=a:b", "Bonjour", "", "20:00 – 21:15"]) {
    assert.equal(typo(s), s);
  }
  assert.equal(typo(null), null);
  assert.equal(typo(undefined), undefined);
});

test("typo : jamais deux espaces, idempotente, indifférente à l'espace déjà posée", () => {
  assert.equal(typo("Contient  :   lait"), `Contient${NBSP}: lait`);
  assert.equal(typo(`déjà${NBSP}: bon ${FINE}!`), `déjà${NBSP}: bon${FINE}!`);
  const exemples = [
    "Préparation : 15 min · Cuisson : 57 min", "« double herbes » ; 180 °C ?", "Un coup de cœur ? À table !",
    "Pour 4 personnes :\n• Farine — 250 g\n• Eau — 15 cl", "!? ?!  ;"
  ];
  for (const s of exemples) {
    const une = typo(s);
    assert.equal(typo(une), une, s);
    assert.doesNotMatch(une, /\S {2,}/);
    assert.doesNotMatch(une, /[ ][:;?!»]/, "plus d'espace ordinaire avant la ponctuation");
    assert.doesNotMatch(une, /\d [°cmgkhl]/);
  }
});

test("typo : « ?! » reste collé, seule la première ponctuation reçoit l'espace", () => {
  assert.equal(typo("Quoi ?!"), `Quoi${FINE}?!`);
  assert.equal(typo("Quoi ? !"), `Quoi${FINE}?${FINE}!`);
});

/* ---------- Phrases du rétroplanning ---------- */

const JOUR = "2030-06-15";
const TABLE = planning.minutesMurales(JOUR, 20 * 60);
const ajouter = (rid, k) => state.menu.push({ k, rid, choices: {}, addons: [], portions: null });

test("phraseConflit : ni point-virgule ni guillemets, chaque plat avec sa température", () => {
  Object.assign(state, { menu: [], checked: {}, extras: [], portions: {}, choices: {}, addons: {} });
  ajouter("focaccia-romarin", "f"); ajouter("quiche-lorraine", "q"); ajouter("cake-sale", "c");
  const plan = planning.planifier({ table: TABLE, maintenant: TABLE - 120, taches: menu.tachesDuMenu() });
  assert.equal(plan.conflits.length, 1);
  assert.ok(plan.retard > 0, "le retard n'est pas redit dans la phrase");
  const phrase = planning.phraseConflit(plan.conflits[0]);
  assert.equal(phrase, "À 220 °C pour Focaccia, 180 °C pour Quiche lorraine et Cake salé : enfourne Focaccia en premier.");
  assert.doesNotMatch(phrase, /[;«»"]/);
});

/* ---------- Textes hors du DOM ---------- */

test("le .ics reçoit la typographie : « Cuisiner : » et « À table ! » ne se coupent pas", () => {
  Object.assign(state, { menu: [], checked: {}, extras: [], portions: {}, choices: {}, addons: {} });
  ajouter("focaccia-romarin", "f");
  const plan = planning.planifier({ table: TABLE, taches: menu.tachesDuMenu() });
  const ics = planning.icsRepas(plan, { horodatage: "20300101T000000Z" });
  assert.ok(ics.includes(`SUMMARY:Cuisiner${NBSP}: Focaccia`));
  assert.ok(ics.includes(`SUMMARY:À table${FINE}!`));
  assert.ok(ics.includes(`220${NBSP}°C`));
  assert.doesNotMatch(ics, /SUMMARY:[^\r\n]* [:!?]/, "aucun titre d'événement n'a d'espace ordinaire avant sa ponctuation");
});

test("les pages d'aperçu r/ et f/ portent la typographie (npm run pages)", () => {
  let vues = 0;
  for (const dossier of ["r", "f"]) {
    for (const nom of readdirSync(path.join(racine, dossier)).filter(n => n.endsWith(".html"))) {
      const page = readFileSync(path.join(racine, dossier, nom), "utf8");
      const textes = [...page.matchAll(/content="([^"]*)"|<(?:title|h1|p)>([^<]*)</g)].map(m => m[1] ?? m[2]).filter(t => !t.startsWith("http"));
      for (const t of textes) {
        assert.doesNotMatch(t, /\S [:;?!»]|« |\d (°C|kg|g|cl|ml|l|min|h|cm)(?![\p{L}\d])/u, `${dossier}/${nom} : « ${t} »`);
      }
      vues++;
    }
  }
  assert.ok(vues >= 40);
  const focaccia = readFileSync(path.join(racine, "r/focaccia-romarin.html"), "utf8");
  assert.ok(focaccia.includes(`Préparation 20${NBSP}min`));
});
