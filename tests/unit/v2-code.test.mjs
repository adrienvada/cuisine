/* Lot « code » : un seul mécanisme par règle (bornes, quantités, Échap des feuilles, normalisation de la voix), une clé de menu déterministe, et un README qui cite chaque fichier. */

import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./donnees.mjs";
import { CONVIVES_JOURNAL_MAX, CONVIVES_MAX, PORTIONS_MAX, PORTIONS_MIN } from "../../js/core/adaptation.js";
import { fusionner, memesDonnees } from "../../js/core/fusion.js";
import { versionDeRequete } from "../../js/core/liens.js";
import { normaliserEtat } from "../../js/core/sauvegarde.js";
import { commandeDepuis } from "../../js/ui/voix.js";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const lire = fichier => readFileSync(path.join(racine, fichier), "utf8");

function fichiersDe(dossier, filtre = () => true, sortie = []) {
  for (const nom of readdirSync(path.join(racine, dossier))) {
    const rel = path.join(dossier, nom);
    if (statSync(path.join(racine, rel)).isDirectory()) fichiersDe(rel, filtre, sortie);
    else if (filtre(rel)) sortie.push(rel);
  }
  return sortie;
}

const sources = fichiersDe("js", f => f.endsWith(".js") && !f.includes("vendor"));

/* ---------- README ---------- */

test("README : chaque fichier de js/, css/ et tools/ est cité dans la carte des modules", () => {
  const readme = lire("README.md");
  const absents = [...fichiersDe("js"), ...fichiersDe("css"), ...fichiersDe("tools")].filter(f => !readme.includes(f));
  assert.deepEqual(absents, [], "ajouter une ligne au README pour : " + absents.join(", "));
});

test("README : les fichiers de tests nommés dans la liste des familles existent", () => {
  const readme = lire("README.md");
  for (const m of readme.matchAll(/`(tests\/[\w./-]+\.(?:mjs|js|html))`/g)) {
    assert.ok(statSync(path.join(racine, m[1]), { throwIfNoEntry: false }), `${m[1]} n'existe pas`);
  }
});

/* ---------- Bornes ---------- */

test("bornes : les portions et les convives viennent d'un seul module", () => {
  assert.equal(PORTIONS_MIN, 1);
  assert.equal(PORTIONS_MAX, 24);
  assert.equal(CONVIVES_MAX, PORTIONS_MAX);
  assert.ok(CONVIVES_JOURNAL_MAX > CONVIVES_MAX);
  const definitions = sources.filter(f => /\b(PORTIONS_M(AX|IN)|CONVIVES_(JOURNAL_)?MAX)\s*=/.test(lire(f)));
  assert.deepEqual(definitions, [path.join("js", "core", "adaptation.js")]);
});

test("bornes : aucun 24 ni 99 en dur dans les contrôles de portions et de convives", () => {
  for (const f of ["js/vues/menu.js", "js/vues/journal.js", "js/core/menu.js", "js/core/liens.js", "js/core/sauvegarde.js"]) {
    assert.doesNotMatch(lire(f), /[<>]=?\s*(24|99)\b|Math\.(min|max)\((24|99)\b|\b(24|99)\s*[<>]/, f);
  }
});

test("liens : une adresse suit la borne des portions", () => {
  const r = { portions: { base: 4 } };
  assert.equal(versionDeRequete(r, `p=${PORTIONS_MAX}`).portions, PORTIONS_MAX);
  assert.equal(versionDeRequete(r, `p=${PORTIONS_MAX + 1}`).portions, undefined);
  assert.equal(versionDeRequete(r, "p=0").portions, undefined);
});

test("préchauffage : une seule constante de durée dans js/", () => {
  const definitions = sources.filter(f => /\b(DUREE_)?PRECHAUFFAGE\s*=/.test(lire(f)));
  assert.deepEqual(definitions, [path.join("js", "core", "planning.js")]);
});

/* ---------- Libellé de quantité ---------- */

test("quantité : un seul calcul de libellé, partagé ; l'homonyme de courses.js est renommé", async () => {
  const courses = await import("../../js/core/courses.js");
  assert.equal(typeof courses.quantitesDe, "function");
  assert.equal(courses.quantiteTexte, undefined);
  assert.equal(courses.courseQtyStr({ parts: [{ qty: 2, unit: "" }], textes: [] }), courses.quantitesDe({ parts: [{ qty: 2, unit: "" }], textes: [] }));
  for (const f of ["js/vues/ingredient.js", "js/ui/partage.js", "js/vues/fiche.js"]) {
    assert.doesNotMatch(lire(f), /fmtQty\(q\)\} \$\{fmtUnit\(ing\.unit|function quantiteTexte|const quantiteTexte/, f);
  }
  const { libelleQuantite } = await import("../../js/core/cuisine.js");
  assert.equal(libelleQuantite({ qty: 200, unit: "g" }, 2), "400 g");
  assert.equal(libelleQuantite({ qty: null, qtyText: "quelques brins" }, 2), "quelques brins");
  assert.equal(libelleQuantite({ qty: null }, 2), "");
});

/* ---------- Échap et piège à focus ---------- */

test("feuilles : Échap et le piège à focus ne vivent que dans js/ui/feuilles.js", () => {
  for (const f of sources.filter(f => f.startsWith(path.join("js", "vues")))) {
    const code = lire(f);
    assert.doesNotMatch(code, /e\.key\s*===?\s*"Escape"/, `${f} écoute Échap lui-même`);
    assert.doesNotMatch(code, /e\.key\s*!==?\s*"Tab"/, `${f} refait un piège à focus`);
  }
  assert.match(lire("js/ui/feuilles.js"), /"Escape"/);
  assert.match(lire("js/ui/feuilles.js"), /"Tab"/);
});

/* ---------- Voix ---------- */

test("voix : le texte est normalisé par normaliser() de core/format.js", () => {
  assert.match(lire("js/ui/voix.js"), /import \{ normaliser \} from "\.\.\/core\/format\.js"/);
  assert.doesNotMatch(lire("js/ui/voix.js"), /normalize\("NFD"\)/);
  assert.equal(commandeDepuis("Étape SUIVANTE !"), "suivant");
  assert.equal(commandeDepuis("c’est bon"), "suivant");
  assert.equal(commandeDepuis("quel œuf ? les ingrédients"), "ingredients");
  assert.equal(commandeDepuis("affiné"), null);
});

/* ---------- Clé d'une entrée de menu reçue sans clé ---------- */

const SANS_CLE = () => ({
  menu: [
    { rid: "cake-sale", choices: { garniture: "olives-feta" }, addons: [], portions: 6 },
    { rid: "cake-sale", choices: { garniture: "olives-feta" }, addons: [], portions: 6 },
    { rid: "quiche-lorraine", choices: {}, addons: ["x"], portions: 4 }
  ]
});

test("clé de menu : une entrée reçue sans clé en reçoit la même à chaque lecture", () => {
  const a = normaliserEtat(SANS_CLE(), { appareil: false }).menu;
  const b = normaliserEtat(SANS_CLE(), { appareil: false }).menu;
  assert.deepEqual(a.map(e => e.k), b.map(e => e.k));
  assert.equal(new Set(a.map(e => e.k)).size, 3, "même deux entrées identiques ont des clés distinctes");
  assert.ok(a.every(e => typeof e.k === "string" && e.k));
});

test("clé de menu : une clé existante est gardée, une clé en double est remplacée de façon stable", () => {
  const brut = { menu: [{ k: "m1", rid: "cake-sale" }, { k: "m1", rid: "quiche-lorraine" }] };
  const a = normaliserEtat(brut).menu, b = normaliserEtat(brut).menu;
  assert.equal(a[0].k, "m1");
  assert.notEqual(a[1].k, "m1");
  assert.equal(a[1].k, b[1].k);
});

test("clé de menu : relever deux fois la même version serveur ne change plus rien", () => {
  const serveur = SANS_CLE();
  let local = {}, base = {};
  const releve = () => {
    const propre = normaliserEtat(fusionner(base, local, serveur), { appareil: false });
    base = serveur;
    const change = !memesDonnees({ menu: local.menu }, { menu: propre.menu });
    local = { ...local, ...propre };
    return change;
  };
  assert.equal(releve(), true, "la première relève apporte le menu");
  assert.equal(releve(), false, "la deuxième ne voit aucune différence");
  assert.equal(releve(), false);
});
