/* L'onglet Savoirs et la feuille des fondamentaux. */

import { test, expect } from "./outils.js";

test("savoirs : les familles s'affichent, la recherche « maillard » trouve la réaction", async ({ page }) => {
  await page.goto("/#/fondamentaux");
  await expect(page.locator(".f-fam")).toHaveCount(6);
  await expect(page.getByRole("heading", { name: "Chaleur & coloration" })).toBeVisible();
  await expect(page.locator(".f-item").first()).toBeVisible();

  await page.locator("#f-search").fill("maillard");
  const trouves = page.locator(".f-item");
  await expect(trouves.filter({ hasText: "La réaction de Maillard" })).toBeVisible();
});

test("savoirs : la page #/fondamental/maillard s'ouvre", async ({ page }) => {
  await page.goto("/#/fondamental/maillard");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("La réaction de Maillard");
  await expect(page.locator(".f-page")).toContainText("Pourquoi ça marche");
  await expect(page.locator(".f-page .f-rec", { hasText: "Quiche lorraine" })).toBeVisible();
});

test("« Pourquoi ça marche » : le lien ouvre la feuille du fondamental, Échap la referme", async ({ page }) => {
  await page.goto("/#/recette/quiche-lorraine");
  // L'étape « Les lardons » met la réaction de Maillard en jeu.
  const etape = page.locator("#steps-list li", { hasText: "Les lardons" });
  await etape.locator(".s-cue").first().click();
  await etape.locator('.s-lien[data-fond="maillard"]').first().click();

  const feuille = page.getByRole("dialog", { name: "La réaction de Maillard" });
  await expect(feuille).toBeVisible();
  await expect(feuille).toContainText("Pourquoi ça marche");

  await page.keyboard.press("Escape");
  await expect(feuille).toHaveCount(0);
  // On est restés sur la fiche.
  await expect(page).toHaveURL(/#\/recette\/quiche-lorraine$/);
});
