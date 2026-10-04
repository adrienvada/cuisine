/* L'onglet Au menu et la liste de courses qui en découle. */

import { test, expect, preremplir, entree, lireCarnet, cochesAffichees } from "./outils.js";

test("au menu : la carte apparaît, ses portions se règlent, la croix la retire", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })] } });
  await page.goto("/#/menu");

  const carte = page.locator(".menu-card");
  await expect(carte).toHaveCount(1);
  await expect(carte).toContainText("Quiche lorraine");
  await expect(carte.locator(".mc-portions .val")).toHaveText("6 personnes");

  await carte.getByRole("button", { name: "Plus de portions" }).click();
  await expect(page.locator(".mc-portions .val")).toHaveText("7 personnes");
  await page.getByRole("button", { name: "Moins de portions" }).click();
  await page.getByRole("button", { name: "Moins de portions" }).click();
  await expect(page.locator(".mc-portions .val")).toHaveText("5 personnes");

  await page.getByRole("button", { name: "Retirer du menu" }).click();
  await expect(page.locator(".menu-card")).toHaveCount(0);
  await expect(page.locator("#app")).toContainText("Rien encore au menu");
  await expect(page.locator("#menu-badge")).toBeHidden();
});

test("courses : articles rangés par rayon", async ({ page, context }) => {
  await preremplir(context, {
    carnet: { menu: [entree("quiche-lorraine", { k: "q1" }), entree("focaccia-romarin", { k: "f1" })] }
  });
  await page.goto("/#/courses");

  const rayon = nom => page.locator("section.rayon", { has: page.getByRole("heading", { name: nom, exact: true }) });
  await expect(rayon("Boucherie & charcuterie").locator("li", { hasText: "Lardons fumés" })).toBeVisible();
  await expect(rayon("Pâtisserie & épicerie sucrée").locator("li", { hasText: "Farine" }).first()).toBeVisible();
  // Chaque article n'apparaît que dans un rayon.
  await expect(page.locator("li", { hasText: "Lardons fumés" })).toHaveCount(1);
  // Les rayons se présentent dans un ordre stable, un titre par rayon.
  const titres = await page.locator("section.rayon h2").allTextContents();
  expect(titres.length).toBeGreaterThanOrEqual(2);
  expect(new Set(titres).size).toBe(titres.length);
});

test("courses : une coche survit au rechargement", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })] } });
  await page.goto("/#/courses");

  const ligne = page.locator("label", { has: page.locator('input[data-key="lardons"]') });
  await ligne.click();
  await expect(page.locator('input[data-key="lardons"]')).toBeChecked();

  await page.reload();
  await expect(page.locator('input[data-key="lardons"]')).toBeChecked();
  expect(await cochesAffichees(page)).toEqual(["lardons"]);
});

test("courses : un article libre s'ajoute puis se supprime", async ({ page }) => {
  await page.goto("/#/courses");
  await page.locator("#extra-input").fill("Glaçons");
  await page.locator("#extra-input").press("Enter");

  const liste = page.locator(".course-list");
  await expect(liste).toContainText("Glaçons");
  await expect(page.locator("#cart-badge")).toHaveText("1");

  await page.getByRole("button", { name: "Supprimer" }).click();
  await expect(page.locator(".course-list")).toHaveCount(0);
  await expect(page.locator("#app")).toContainText("Ta liste est vide");
});

test("courses : « Vider la liste » (confirmation acceptée) vide tout", async ({ page, context }) => {
  await preremplir(context, {
    carnet: { menu: [entree("quiche-lorraine", { k: "q1" })], extras: [{ id: "e1", name: "Éponges" }], checked: { lardons: true } }
  });
  await page.goto("/#/courses");
  await expect(page.locator("li", { hasText: "Éponges" })).toBeVisible();

  let message = "";
  page.once("dialog", d => { message = d.message(); d.accept(); });
  await page.getByRole("button", { name: "Vider la liste" }).click();

  await expect(page.locator("#app")).toContainText("Ta liste est vide");
  expect(message).toContain("Vider la liste de courses");
  await expect(page.locator("#menu-badge")).toBeHidden();
  const carnet = await lireCarnet(page);
  expect(carnet.menu).toEqual([]);
  expect(carnet.extras).toEqual([]);
  expect(carnet.checked).toEqual({});
});
