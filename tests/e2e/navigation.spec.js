/* Navigation & partage : la place retrouvée, le lien d'une version, l'onglet courant, les fondamentaux à la demande. */

import { test, expect, preremplir, entree, lireCarnet } from "./outils.js";

const CARTES = ".card:not(.gone):not(.card-leave)";
const defilement = page => page.evaluate(() => window.scrollY);
const proche = async (page, attendu, marge = 50) =>
  expect.poll(async () => Math.abs((await defilement(page)) - attendu)).toBeLessThanOrEqual(marge);

/* Fait défiler l'accueil et attend que la position soit atteinte. */
async function defilerAccueil(page, y) {
  await page.goto("/#/");
  await expect(page.locator(CARTES)).toHaveCount(20);
  await page.evaluate(y => window.scrollTo(0, y), y);
  await expect.poll(() => defilement(page)).toBeGreaterThanOrEqual(y - 100);
  return defilement(page);
}

/* ---------- La place retrouvée ---------- */

test("place : la flèche de retour d'une fiche ramène à la même position de l'accueil", async ({ page }) => {
  await page.addInitScript(() => { history.scrollRestoration = "manual"; });
  const avant = await defilerAccueil(page, 1200);
  await page.locator(`${CARTES} .body`).nth(10).scrollIntoViewIfNeeded();
  const milieu = await defilement(page);
  await page.locator(`${CARTES} .body`).nth(10).tap();
  await expect(page.locator(".hero")).toBeVisible();
  await proche(page, 0, 10);

  await page.locator("[data-retour]").first().tap();
  await expect(page.locator(CARTES)).toHaveCount(20);
  await proche(page, milieu);
  expect(avant).toBeGreaterThan(0);
});

test("place : une page où l'on arrive par un lien commence en haut", async ({ page }) => {
  await defilerAccueil(page, 900);
  await page.locator(`${CARTES} .body`).nth(8).tap();
  await expect(page.locator(".hero")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect.poll(() => defilement(page)).toBeGreaterThan(300);

  // Une entrée neuve de l'historique : on ne retrouve rien, on est en haut.
  await page.evaluate(() => { location.hash = "#/fondamentaux"; });
  await expect(page.locator(".f-fam").first()).toBeVisible();
  await proche(page, 0, 10);
});

test("place : changer d'onglet puis revenir retrouve la position de l'onglet", async ({ page }) => {
  const avant = await defilerAccueil(page, 1000);
  await page.locator('.tabbar a[data-tab="courses"]').click();
  await expect(page).toHaveURL(/#\/courses$/);
  await proche(page, 0, 10);

  await page.locator('.tabbar a[data-tab="home"]').click();
  await expect(page.locator(CARTES)).toHaveCount(20);
  await proche(page, avant);
});

/* ---------- Le lien d'une version ---------- */

test("partage : le lien d'une version applique portions et composition au brouillon, puis nettoie l'adresse", async ({ page }) => {
  await page.goto("/r/cake-sale.html?p=8&c=garniture:olives-feta&a=tomates-sechees");
  await expect(page).toHaveURL(/#\/recette\/cake-sale$/);
  await expect(page.locator("#p-val")).toContainText("8");
  await expect(page.locator('[data-option="olives-feta"]').first()).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-addon="tomates-sechees"]').first()).toHaveAttribute("aria-pressed", "true");

  const carnet = await lireCarnet(page);
  expect(carnet.portions["cake-sale"]).toBe(8);
  expect(carnet.choices["cake-sale"]).toEqual({ garniture: "olives-feta" });
  expect(carnet.addons["cake-sale"]).toEqual(["tomates-sechees"]);
  // Le menu n'est jamais touché.
  expect(carnet.menu || []).toEqual([]);
});

test("partage : paramètres inconnus ou invalides ignorés, une entrée du menu jamais modifiée", async ({ context, page }) => {
  const e = entree("cake-sale", { k: "m1", portions: 4, choices: { garniture: "lardons-comte" } });
  await preremplir(context, { carnet: { menu: [e], checked: {}, extras: [] } });
  await page.goto("/r/cake-sale.html?p=99&c=garniture:inconnue&c=truc:machin&a=nimporte&zz=1");
  await expect(page).toHaveURL(/#\/recette\/cake-sale$/);
  await expect(page.locator("#p-val")).toContainText("6");
  const carnet = await lireCarnet(page);
  expect(carnet.portions?.["cake-sale"]).toBeUndefined();
  expect(carnet.menu).toEqual([e]);

  // Sur l'adresse d'une entrée de menu, les réglages sont écartés, pas appliqués.
  await page.goto("/#/recette/cake-sale/m/m1?p=12");
  await expect(page).toHaveURL(/#\/recette\/cake-sale\/m\/m1$/);
  expect((await lireCarnet(page)).menu).toEqual([e]);
  expect((await lireCarnet(page)).portions?.["cake-sale"]).toBeUndefined();
});

test("partage : le lien envoyé garde les portions et la composition affichées", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: async d => { window.__partage = d; }, configurable: true });
  });
  await page.goto("/#/recette/cake-sale");
  await page.locator("#p-plus").click();
  await page.locator("#p-plus").click();
  await page.locator('[data-option="olives-feta"]').first().click();
  await page.locator('[data-addon="tomates-sechees"]').first().click();
  await page.locator("#share-recipe").click();
  const url = await page.evaluate(() => window.__partage && window.__partage.url);
  expect(url).toMatch(/\/r\/cake-sale\.html\?p=8&c=garniture:olives-feta&a=tomates-sechees$/);
});

/* ---------- L'onglet courant ---------- */

test("onglets : l'onglet actif porte aria-current=page, lui seul", async ({ page }) => {
  const actifs = () => page.locator(".tabbar a[aria-current]");
  await page.goto("/#/");
  await expect(actifs()).toHaveCount(1);
  await expect(page.locator('.tabbar a[data-tab="home"]')).toHaveAttribute("aria-current", "page");

  await page.evaluate(() => { location.hash = "#/menu"; });
  await expect(page.locator('.tabbar a[data-tab="menu"]')).toHaveAttribute("aria-current", "page");
  await expect(actifs()).toHaveCount(1);

  await page.evaluate(() => { location.hash = "#/fondamental/maillard"; });
  await expect(page.locator('.tabbar a[data-tab="fond"]')).toHaveAttribute("aria-current", "page");
  await expect(actifs()).toHaveCount(1);
});

/* ---------- Les fondamentaux à la demande ---------- */

test("fondamentaux : aucune requête avant le premier affichage de l'accueil, puis chargement", async ({ page }) => {
  let cartesALaRequete = null;
  await page.route("**/js/fondamentaux.js", async route => {
    cartesALaRequete = await page.evaluate(() => document.querySelectorAll(".card").length);
    await route.continue();
  });
  await page.goto("/#/");
  await expect(page.locator(CARTES)).toHaveCount(20);
  await expect.poll(() => page.evaluate(() => typeof FONDAMENTAUX !== "undefined")).toBe(true);
  expect(cartesALaRequete).toBe(20);
});

test("fondamentaux : la recherche par mécanisme marche dès qu'ils sont arrivés", async ({ page }) => {
  await page.goto("/#/");
  await expect.poll(() => page.evaluate(() => typeof FONDAMENTAUX !== "undefined")).toBe(true);
  await page.locator("#search").fill("maillard");
  await expect.poll(() => page.locator(CARTES).count()).toBeGreaterThan(0);
  expect(await page.locator(CARTES).count()).toBeLessThan(20);
});

test("fondamentaux : une fiche ouverte directement attend le fichier et affiche « Pourquoi ça marche »", async ({ page }) => {
  await page.route("**/js/fondamentaux.js", async route => {
    await new Promise(r => setTimeout(r, 300));
    await route.continue();
  });
  await page.goto("/#/recette/quiche-lorraine");
  await expect(page.locator("#steps-list .s-cue").first()).toContainText("Pourquoi ça marche");
});

test("fondamentaux : sans le fichier, une fiche s'affiche et les Savoirs proposent de réessayer", async ({ page }) => {
  await page.route("**/js/fondamentaux.js", route => route.abort());
  await page.goto("/#/recette/quiche-lorraine");
  await expect(page.locator("#steps-list li").first()).toBeVisible();
  await expect(page.locator("#steps-list .s-cue")).toHaveCount(0);

  await page.evaluate(() => { location.hash = "#/fondamentaux"; });
  await expect(page.locator("#fonds-reessayer")).toBeVisible();
  await page.unroute("**/js/fondamentaux.js");
  await page.locator("#fonds-reessayer").click();
  await expect(page.locator(".f-fam").first()).toBeVisible();
});
