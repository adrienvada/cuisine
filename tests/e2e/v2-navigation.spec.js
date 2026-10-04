/* Lot « navigation » de la seconde vague : vues chargées à la demande, titre et focus à chaque navigation, fiche sans attente infinie des fondamentaux, provenance de la fiche après le mode cuisine, jeton de connexion jamais gardé. */

import { test, expect, preremplir, entree } from "./outils.js";
import { simulerServeur, MDP } from "./outils-synchro.js";

const CARTES = ".card:not(.gone):not(.card-leave)";
const VIDE = { menu: [], checked: {}, extras: [] };
const b64url = texte => Buffer.from(texte, "utf8").toString("base64url");

/* Une porte qu'on ouvre à la main : la requête retenue ne part qu'à ce moment. */
function porte() {
  let ouvrir;
  const ouverte = new Promise(r => { ouvrir = r; });
  return { ouverte, ouvrir };
}

/* L'index tel que le publie le lot « chargement » : pas de modulepreload pour les vues, et
   les feuilles données ne bloquent plus le rendu. */
async function indexAllege(page, { feuilles = [] } = {}) {
  await page.route(url => url.pathname === "/" || url.pathname.endsWith("/index.html"), async route => {
    const reponse = await route.fetch();
    let corps = (await reponse.text()).replace(/<link rel="modulepreload"[^>]*>\s*/g, "");
    for (const f of feuilles) {
      corps = corps.replace(`<link rel="stylesheet" href="css/${f}.css">`,
        `<link rel="stylesheet" href="css/${f}.css" data-vue media="print" onload="this.media='all'">`);
    }
    await route.fulfill({ response: reponse, body: corps });
  });
}

/* ---------- n° 29 : seule l'accueil est chargée d'emblée ---------- */

test("chargement : l'accueil n'importe aucune autre vue, qui viennent à la première visite", async ({ page }) => {
  const vues = [];
  await indexAllege(page);
  page.on("request", r => { const m = /\/js\/vues\/([a-z]+)\.js/.exec(r.url()); if (m) vues.push(m[1]); });
  await page.goto("/#/");
  await expect(page.locator(CARTES)).toHaveCount(20);
  await page.waitForTimeout(800);
  for (const nom of ["fiche", "cuisine", "menu", "savoirs", "journal"]) expect(vues, nom).not.toContain(nom);

  await page.locator(".tabbar a[data-tab=menu]").tap();
  await expect(page.locator("h1")).toHaveText("Au menu");
  expect(vues).toContain("menu");
});

test("chargement : la synchro et l'élagage des coches ne viennent qu'après le premier affichage", async ({ page }) => {
  const ordre = [];
  page.on("request", r => { const m = /\/js\/(sync|vues\/courses)\.js/.exec(r.url()); if (m) ordre.push(m[1]); });
  await page.goto("/#/");
  await expect(page.locator(CARTES)).toHaveCount(20);
  await expect.poll(() => ordre.sort()).toEqual(["sync", "vues/courses"]);
});

test("chargement : l'élagage des coches marche sur une page autre que Courses", async ({ page, context }) => {
  await preremplir(context, {
    carnet: { menu: [entree("quiche-lorraine", { k: "q1" })], checked: { "oeuf|piece": true, "fantome|g": true }, extras: [] }
  });
  await page.goto("/#/menu");
  await expect(page.locator(".mc-x")).toBeVisible();
  await page.locator(".mc-x").tap();           // vide le menu : les coches n'ont plus de raison d'être
  await expect.poll(() => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("carnet-cuisine-v1")).checked || {}).length)).toBe(0);
});

test("chargement : naviguer pendant le chargement d'une vue ne dessine jamais la vue périmée", async ({ page }) => {
  const p = porte();
  await page.route("**/js/vues/menu.js", async route => { await p.ouverte; await route.continue(); });
  await page.goto("/#/");
  await expect(page.locator(CARTES)).toHaveCount(20);
  await page.evaluate(() => { location.hash = "#/menu"; });
  await page.evaluate(() => { location.hash = "#/courses"; });
  await expect(page.locator("h1")).toHaveText("Liste de courses");
  p.ouvrir();
  await page.waitForTimeout(600);
  await expect(page.locator("h1")).toHaveText("Liste de courses");
});

test("chargement : une vue attend ses feuilles de style non bloquantes", async ({ page }) => {
  await indexAllege(page, { feuilles: ["menu"] });
  await page.route("**/css/menu.css", async route => {
    await new Promise(r => setTimeout(r, 900));
    await route.continue();
  });
  await page.goto("/#/");
  await expect(page.locator(CARTES)).toHaveCount(20);
  await page.evaluate(() => { location.hash = "#/menu"; });
  await expect(page.locator("h1")).toHaveText("Au menu");
  expect(await page.evaluate(() => document.querySelector('link[href="css/menu.css"]').media)).toBe("all");
});

/* ---------- n° 52 : titre et focus ---------- */

test("titre : chaque vue donne son titre au document", async ({ page }) => {
  const SUFFIXE = " – Carnet de cuisine";
  await page.goto("/#/");
  await expect(page.locator(CARTES)).toHaveCount(20);
  await expect(page).toHaveTitle("Recettes" + SUFFIXE);
  for (const [hash, titre] of [
    ["#/menu", "Au menu"], ["#/courses", "Liste de courses"], ["#/fondamentaux", "Savoirs"],
    ["#/recette/quiche-lorraine", "Quiche lorraine"]
  ]) {
    await page.evaluate(h => { location.hash = h; }, hash);
    await expect(page).toHaveTitle(titre + SUFFIXE);
  }
  await page.evaluate(() => { location.hash = "#/fondamental/maillard"; });
  await expect(page).toHaveTitle(/Maillard.* – Carnet de cuisine$/);
  await page.evaluate(() => { location.hash = "#/recette/quiche-lorraine/cuisine/1"; });
  await expect(page).toHaveTitle("Mode cuisine : Quiche lorraine" + SUFFIXE);
});

test("focus : arriver par un lien donne le focus au titre, un retour arrière non", async ({ page }) => {
  await page.goto("/#/");
  await expect(page.locator(CARTES)).toHaveCount(20);
  await page.locator(`${CARTES} .body`).first().tap();
  await expect(page.locator(".hero")).toBeVisible();
  await expect(page.locator("h1")).toBeFocused();
  await expect(page.locator("h1")).toHaveAttribute("tabindex", "-1");

  await page.locator(".tabbar a[data-tab=courses]").tap();
  await expect(page.locator("h1")).toHaveText("Liste de courses");
  await expect(page.locator("h1")).toBeFocused();

  await page.goBack();
  await expect(page.locator(".hero")).toBeVisible();
  await expect(page.locator("h1")).not.toBeFocused();
});

/* ---------- n° 50 : la fiche n'attend pas indéfiniment les fondamentaux ---------- */

test("fondamentaux lents : la fiche s'affiche sans eux, puis se complète à leur arrivée", async ({ page }) => {
  const p = porte();
  await page.route("**/js/fondamentaux.js", async route => { await p.ouverte; await route.continue(); });
  await page.goto("/#/recette/quiche-lorraine", { waitUntil: "commit" });
  await expect(page.locator("#steps-list li").first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator("#steps-list .s-cue")).toHaveCount(0);
  p.ouvrir();
  await expect(page.locator("#steps-list .s-cue").first()).toContainText("Pourquoi ça marche");
});

test("fondamentaux lents : une fiche touchée entre-temps n'est pas redessinée", async ({ page }) => {
  const p = porte();
  await page.route("**/js/fondamentaux.js", async route => { await p.ouverte; await route.continue(); });
  await page.goto("/#/recette/quiche-lorraine", { waitUntil: "commit" });
  await expect(page.locator("#steps-list li").first()).toBeVisible({ timeout: 5000 });
  await page.locator("#steps-list li").first().tap();
  p.ouvrir();
  await expect.poll(() => page.evaluate(() => typeof FONDAMENTAUX !== "undefined")).toBe(true);
  await page.waitForTimeout(300);
  await expect(page.locator("#steps-list .s-cue")).toHaveCount(0);
});

test("fondamentaux lents : les Savoirs disent qu'ils arrivent au lieu d'une page blanche", async ({ page }) => {
  const p = porte();
  await page.route("**/js/fondamentaux.js", async route => { await p.ouverte; await route.continue(); });
  await page.goto("/#/fondamentaux", { waitUntil: "commit" });
  await expect(page.getByText("Les savoirs arrivent")).toBeVisible();
  p.ouvrir();
  await expect(page.locator(".f-fam").first()).toBeVisible();
  await expect(page.getByText("Les savoirs arrivent")).toHaveCount(0);
});

/* ---------- n° 21 : la provenance de la fiche survit au mode cuisine ---------- */

test("retour : la fiche ouverte depuis le menu garde « Au menu » après le mode cuisine", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })], checked: {}, extras: [] } });
  await page.goto("/#/menu");
  await page.locator(".mc-title").first().tap();
  await expect(page.locator(".hero")).toBeVisible();
  await expect(page.locator("[data-retour]").first()).toContainText("Au menu");

  await page.locator("a.btn.primary[href*='/cuisine']").tap();
  await expect(page.locator(".cook")).toBeVisible();
  await page.locator("#cook-close").tap();
  await expect(page.locator(".hero")).toBeVisible();
  await expect(page.locator("[data-retour]").first()).toContainText("Au menu");
});

/* ---------- n° 33 : le jeton de connexion ne reste nulle part ---------- */

test("connexion par lien : le mot de passe ne reste pas dans la mémoire des positions", async ({ page, context }) => {
  await simulerServeur(context, { ...VIDE }, { mdp: MDP });
  await page.goto(`/#/connexion/${b64url(MDP)}`);
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator("#toast")).toContainText("Synchronisation activée");
  const stockage = await page.evaluate(() => JSON.stringify({ ...sessionStorage }));
  expect(stockage).not.toContain(b64url(MDP));
  expect(stockage).not.toContain("connexion");
});
