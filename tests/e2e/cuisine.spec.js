/* Mode cuisine : étapes, minuteurs, fin de séance et reprise. */

import { test, expect } from "./outils.js";

// La quiche a 5 étapes ; la deuxième (index 1) porte un minuteur de 20 min.
const CUISINE = "/#/recette/quiche-lorraine/cuisine";

test("mode cuisine : « Étape 1 / N », Suivant et Précédent", async ({ page }) => {
  await page.goto(CUISINE);
  const etiquette = page.locator(".cook-step-label");
  await expect(etiquette).toHaveText("Étape 1 / 5");
  await expect(page.getByRole("button", { name: "Précédent" })).toBeDisabled();

  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(etiquette).toHaveText("Étape 2 / 5");
  await expect(page).toHaveURL(/\/cuisine\/1$/);

  await page.getByRole("button", { name: "Précédent" }).click();
  await expect(etiquette).toHaveText("Étape 1 / 5");
});

test("minuteur : sa bulle apparaît dans le plateau, sa croix l'arrête", async ({ page }) => {
  await page.goto(CUISINE + "/1");
  const plateau = page.locator("#timer-tray");
  await expect(plateau).toBeHidden();

  await page.getByRole("button", { name: /Minuteur 20 min/ }).click();
  const bulle = plateau.locator(".timer-pill");
  await expect(bulle).toHaveCount(1);
  await expect(bulle).toContainText("Cuisson à blanc");
  await expect(page.locator("#timer-zone .clock")).toBeVisible();

  await bulle.locator(".t-x").click();
  await expect(plateau).toBeHidden();
  await expect(page.getByRole("button", { name: /Minuteur 20 min/ })).toBeVisible();
});

test("« Terminer » à la dernière étape revient à la fiche, « Cuisinée une fois »", async ({ page }) => {
  await page.goto(CUISINE);
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Suivant" }).click();
  await expect(page.locator(".cook-step-label")).toHaveText("Étape 5 / 5");

  await page.getByRole("button", { name: /Terminer/ }).click();
  await expect(page).toHaveURL(/#\/recette\/quiche-lorraine$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quiche lorraine");
  await expect(page.locator("#cooked-line")).toContainText("Cuisinée une fois");
});

test("reprise : à l'étape 3, la fiche propose « Reprendre » « étape 3 / N »", async ({ page }) => {
  await page.goto(CUISINE);
  await page.getByRole("button", { name: "Suivant" }).click();
  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(page.locator(".cook-step-label")).toHaveText("Étape 3 / 5");

  await page.getByRole("button", { name: "Fermer" }).click();
  await expect(page).toHaveURL(/#\/recette\/quiche-lorraine$/);
  const reprise = page.locator(".actions a.resume");
  await expect(reprise).toContainText("Reprendre");
  await expect(reprise).toContainText("étape 3 / 5");
  await expect(page.getByRole("button", { name: "Repartir du début" })).toBeVisible();
});
