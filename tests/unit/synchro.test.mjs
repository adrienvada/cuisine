/* La fusion à trois voies (js/core/fusion.js) : ajouts et retraits croisés,
   modifications concurrentes, champs absents. */

import test from "node:test";
import assert from "node:assert/strict";
import { qrSvg } from "../../js/ui/qr.js";
import { CHAMPS_SYNCHRO, fusionner, fusionnerListe, fusionnerDico, memesDonnees } from "../../js/core/fusion.js";

const e = (k, extra = {}) => ({ k, rid: "r-" + k, portions: null, ...extra });
const cles = liste => liste.map(x => x.k);

test("fusion : le contrat des champs synchronisés", () => {
  assert.deepEqual(CHAMPS_SYNCHRO, ["menu", "checked", "extras", "notes", "cooked", "notesPerso", "repas", "historique", "journal", "ordreRayons"]);
});

/* ---------- listes à clé ---------- */

test("liste : les ajouts des deux côtés sont gardés", () => {
  const sortie = fusionnerListe([e("a")], [e("a"), e("b")], [e("a"), e("c")], "k");
  assert.deepEqual(cles(sortie).sort(), ["a", "b", "c"]);
});

test("liste : un retrait d'un côté est respecté, de l'autre aussi", () => {
  const base = [e("a"), e("b"), e("c")];
  const sortie = fusionnerListe(base, [e("a"), e("b")], [e("b"), e("c")], "k");   // ici : sans c ; serveur : sans a
  assert.deepEqual(cles(sortie), ["b"]);
});

test("liste : retrait local et ajout serveur ne s'annulent pas", () => {
  const sortie = fusionnerListe([e("a")], [], [e("a"), e("n")], "k");
  assert.deepEqual(cles(sortie), ["n"]);
});

test("liste : modifiée d'un seul côté, la modification suit", () => {
  const base = [e("a", { portions: 4 })];
  assert.equal(fusionnerListe(base, base, [e("a", { portions: 6 })], "k")[0].portions, 6);
  assert.equal(fusionnerListe(base, [e("a", { portions: 8 })], base, "k")[0].portions, 8);
});

test("liste : modifiée des deux côtés, la version locale l'emporte", () => {
  const base = [e("a", { portions: 4 })];
  const sortie = fusionnerListe(base, [e("a", { portions: 8 })], [e("a", { portions: 6 })], "k");
  assert.equal(sortie.length, 1);
  assert.equal(sortie[0].portions, 8);
});

test("liste : retirée côté serveur et modifiée ici, elle reste retirée", () => {
  const base = [e("a", { portions: 4 })];
  assert.deepEqual(fusionnerListe(base, [e("a", { portions: 8 })], [], "k"), []);
});

test("liste : sans base (premier échange), tout se cumule", () => {
  const sortie = fusionnerListe(undefined, [e("a")], [e("b")], "k");
  assert.deepEqual(cles(sortie).sort(), ["a", "b"]);
});

test("liste : l'ordre d'ici est gardé, les ajouts distants suivent", () => {
  const sortie = fusionnerListe([e("a"), e("b")], [e("b"), e("a")], [e("a"), e("b"), e("z")], "k");
  assert.deepEqual(cles(sortie), ["b", "a", "z"]);
});

test("liste : extras, une vraie fusion croisée", () => {
  const base = { extras: [{ id: "x1", name: "Sel" }] };
  const local = { extras: [{ id: "x1", name: "Sel" }, { id: "x2", name: "Lait" }] };
  const serveur = { extras: [{ id: "x1", name: "Sel" }, { id: "x3", name: "Pain" }] };
  assert.deepEqual(fusionner(base, local, serveur).extras.map(x => x.id), ["x1", "x2", "x3"]);
});

test("liste : historique et journal par id, la note locale l'emporte sur l'ancienne", () => {
  const base = { historique: [], journal: [{ id: "j1", note: "" }] };
  const local = { historique: [{ id: "h1" }], journal: [{ id: "j1", note: "bon" }] };
  const serveur = { historique: [{ id: "h2" }], journal: [{ id: "j1", note: "" }, { id: "j2", note: "x" }] };
  const m = fusionner(base, local, serveur);
  assert.deepEqual(m.historique.map(x => x.id), ["h1", "h2"]);
  assert.deepEqual(m.journal.map(x => [x.id, x.note]), [["j1", "bon"], ["j2", "x"]]);
});

/* ---------- dictionnaires ---------- */

test("dico : ce qui a changé d'un côté l'emporte, clé par clé", () => {
  const base = { oeufs: true, farine: true };
  const sortie = fusionnerDico(base, { oeufs: true, farine: true, sel: true }, { farine: true }, undefined);
  // serveur a décoché les œufs, local a coché le sel
  assert.deepEqual(sortie, { farine: true, sel: true });
});

test("dico : changé des deux côtés, le local l'emporte", () => {
  const sortie = fusionnerDico({ a: "x" }, { a: "ici" }, { a: "la" });
  assert.equal(sortie.a, "ici");
});

test("dico : décoché ici, modifié là-bas : le local (la suppression) l'emporte", () => {
  assert.deepEqual(fusionnerDico({ a: 1 }, {}, { a: 2 }), {});
});

test("checked : une coche faite ailleurs survit à une modification locale", () => {
  const m = fusionner({ checked: {} }, { checked: { lait: true } }, { checked: { oeufs: true } });
  assert.deepEqual(m.checked, { lait: true, oeufs: true });
});

test("notes : verdict changé ailleurs, suit ; changé des deux côtés, local", () => {
  const m = fusionner({ notes: { a: "encore", b: "bof" } }, { notes: { a: "encore", b: "top" } }, { notes: { a: "jamais", b: "non" } });
  assert.deepEqual(m.notes, { a: "jamais", b: "top" });
});

test("cooked : le plus grand compte, la date la plus récente", () => {
  const base = { cooked: { a: { count: 1, last: 100 } } };
  const local = { cooked: { a: { count: 3, last: 300 } } };
  const serveur = { cooked: { a: { count: 2, last: 500 }, b: { count: 1, last: 50 } } };
  const m = fusionner(base, local, serveur);
  assert.deepEqual(m.cooked.a, { count: 3, last: 500 });
  assert.deepEqual(m.cooked.b, { count: 1, last: 50 });
});

test("cooked : modifié d'un seul côté, tel quel", () => {
  const base = { cooked: { a: { count: 1, last: 100 } } };
  const m = fusionner(base, base, { cooked: { a: { count: 2, last: 200 } } });
  assert.deepEqual(m.cooked.a, { count: 2, last: 200 });
});

test("notesPerso : écrite des deux côtés, la plus récente (at) l'emporte", () => {
  const base = { notesPerso: { a: { txt: "v0", at: 1 } } };
  const local = { notesPerso: { a: { txt: "ici", at: 20 }, b: { txt: "seule", at: 5 } } };
  const serveur = { notesPerso: { a: { txt: "là", at: 30 } } };
  const m = fusionner(base, local, serveur);
  assert.equal(m.notesPerso.a.txt, "là");
  assert.equal(m.notesPerso.b.txt, "seule");
  const m2 = fusionner(base, { notesPerso: { a: { txt: "ici", at: 40 } } }, serveur);
  assert.equal(m2.notesPerso.a.txt, "ici");
});

/* ---------- repas, ordreRayons, champs absents ---------- */

test("repas : champ par champ", () => {
  const base = { repas: { convives: 4, heure: "19:30", date: "2026-01-01", exclus: [] } };
  const local = { repas: { convives: 6, heure: "19:30", date: "2026-01-01", exclus: [] } };
  const serveur = { repas: { convives: 4, heure: "20:00", date: "2026-01-01", exclus: ["gluten"] } };
  assert.deepEqual(fusionner(base, local, serveur).repas, { convives: 6, heure: "20:00", date: "2026-01-01", exclus: ["gluten"] });
});

test("ordreRayons : celui qui a changé l'emporte, le local en cas de double changement", () => {
  const base = { ordreRayons: ["A", "B"] };
  assert.deepEqual(fusionner(base, base, { ordreRayons: ["B", "A"] }).ordreRayons, ["B", "A"]);
  assert.deepEqual(fusionner(base, { ordreRayons: ["A", "C"] }, base).ordreRayons, ["A", "C"]);
  assert.deepEqual(fusionner(base, { ordreRayons: ["A", "C"] }, { ordreRayons: ["B", "A"] }).ordreRayons, ["A", "C"]);
});

test("champs absents : ils restent absents", () => {
  const m = fusionner({}, { menu: [e("a")] }, {});
  assert.deepEqual(Object.keys(m), ["menu"]);
  assert.deepEqual(fusionner(null, {}, undefined), {});
});

test("champs absents d'un côté : l'autre côté parle", () => {
  const m = fusionner({}, { menu: [] }, { journal: [{ id: "j" }], ordreRayons: ["A"] });
  assert.deepEqual(m.journal, [{ id: "j" }]);
  assert.deepEqual(m.ordreRayons, ["A"]);
  assert.deepEqual(m.menu, []);
  assert.ok(!("checked" in m));
});

test("fusion : un champ inconnu du serveur traverse", () => {
  assert.deepEqual(fusionner({}, { menu: [] }, { futur: { x: 1 } }).futur, { x: 1 });
});

test("fusion : ne modifie aucune de ses entrées", () => {
  const base = { menu: [e("a")], checked: { x: true } };
  const local = { menu: [e("a"), e("b")], checked: {} };
  const serveur = { menu: [e("c")], checked: { x: true, y: true } };
  const copie = JSON.parse(JSON.stringify([base, local, serveur]));
  fusionner(base, local, serveur);
  assert.deepEqual([base, local, serveur], copie);
});

/* ---------- comparaison ---------- */

test("memesDonnees : un champ vide vaut un champ absent, l'ordre des clés ne compte pas", () => {
  assert.ok(memesDonnees({ menu: [], checked: {}, extras: [], notes: {} }, { menu: [], checked: {}, extras: [] }));
  assert.ok(memesDonnees({ checked: { a: 1, b: 2 } }, { checked: { b: 2, a: 1 } }));
  assert.ok(!memesDonnees({ checked: { a: true } }, { checked: {} }));
  assert.ok(!memesDonnees({ menu: [e("a")] }, {}));
  assert.ok(memesDonnees(null, undefined));
});

test("memesDonnees : seuls les champs synchronisés comptent", () => {
  assert.ok(memesDonnees({ query: "feta", timers: [1] }, {}));
});

/* ---------- QR code ---------- */

test("qrSvg : un SVG sombre sur clair avec sa zone de silence, fonction du texte", () => {
  const a = qrSvg("https://adrienvada.fr/cuisine/#/connexion/c2VjcmV0");
  assert.match(a, /^<svg [^>]*viewBox="0 0 (\d+) \1"/);
  assert.match(a, /fill="#fff"/);
  assert.match(a, /<path d="M\d+ \d+h1v1h-1z/);
  assert.notEqual(a, qrSvg("https://adrienvada.fr/cuisine/#/connexion/autre"));
  assert.equal(a, qrSvg("https://adrienvada.fr/cuisine/#/connexion/c2VjcmV0"));
});
