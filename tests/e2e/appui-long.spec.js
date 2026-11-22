/* L'appui long sur une vignette de l'accueil : le menu de la recette, et la
   suppression d'une recette du carnet (réversible, par « Annuler » ou les réglages). */

import { expect, test } from "./outils.js";

const RID = "cake-sale";

/* Un doigt posé `ms` millisecondes au milieu de la carte, puis levé (vrais événements
   tactiles, par le protocole de Chromium). */
async function appuyer(page, selecteur, ms = 700) {
  await page.locator(selecteur).scrollIntoViewIfNeeded();
  const boite = await page.locator(selecteur).boundingBox();
  const x = boite.x + boite.width / 2, y = boite.y + boite.height / 2;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await page.waitForTimeout(ms);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

const carte = `.card[data-id="${RID}"]`;

test("un appui long ouvre le menu de la recette, sans ouvrir la fiche", async ({ page }) => {
  await page.goto("/");
  await appuyer(page, carte);
  const feuille = page.locator(".actions-sheet");
  await expect(feuille).toBeVisible();
  await expect(feuille.locator("h3")).toHaveText(/cake/i);
  await expect(feuille.locator("[data-action]")).toHaveText([
    /Ajouter au menu/, /Cuisiner maintenant/, /Ajouter aux coups de cœur/, /Partager/, /Supprimer du carnet/
  ]);
  await page.waitForTimeout(400);
  expect(new URL(page.url()).hash).toBe("");
  // Une seule feuille, même si le navigateur émet aussi son contextmenu.
  await expect(page.locator(".sheet-backdrop:not(.sort)")).toHaveCount(1);
});

test("un appui bref ouvre toujours la fiche", async ({ page }) => {
  await page.goto("/");
  await appuyer(page, carte, 80);
  await expect(page).toHaveURL(new RegExp(`#/recette/${RID}$`));
});

test("le clic droit ouvre le même menu", async ({ page }) => {
  await page.goto("/");
  await page.locator(carte).dispatchEvent("contextmenu");
  await expect(page.locator(".actions-sheet")).toBeVisible();
});

test("ajouter au menu depuis le menu de la recette", async ({ page }) => {
  await page.goto("/");
  await appuyer(page, carte);
  await page.locator('[data-action="ajouter"]').click();
  await expect(page.locator("#menu-badge")).toHaveText("1");
  await expect(page.locator("#toast")).toContainText("Au menu");
  // Rouvert, le menu propose une autre version et le retrait.
  await page.waitForTimeout(900);
  await appuyer(page, carte);
  await expect(page.locator('[data-action="ajouter"]')).toContainText("autre version");
  await page.locator('[data-action="retirer"]').click();
  await expect(page.locator("#menu-badge")).toBeHidden();
});

test("coup de cœur depuis le menu de la recette : la vignette le montre", async ({ page }) => {
  await page.goto("/");
  await appuyer(page, carte);
  await page.locator('[data-action="coeur"]').click();
  await expect(page.locator(`${carte} .verdict-tag`)).toBeVisible();
  await expect(page.locator("#chips [data-cat='coup-de-coeur']")).toBeVisible();
});

test("supprimer une recette du carnet, puis annuler", async ({ page }) => {
  await page.goto("/");
  await appuyer(page, carte);
  await page.locator('[data-action="supprimer"]').click();
  await expect(page.locator(carte)).toBeHidden();
  await page.locator(".toast-action").click();
  await expect(page.locator(carte)).toBeVisible();
});

test("une recette supprimée le reste au rechargement, et les réglages la remettent", async ({ page }) => {
  await page.goto("/");
  await appuyer(page, carte);
  await page.locator('[data-action="supprimer"]').click();
  await expect(page.locator(carte)).toBeHidden();
  await page.reload();
  await page.waitForFunction(() => document.getElementById("grid"));
  await expect(page.locator(carte)).toBeHidden();
  // Sa fiche reste lisible par son adresse, et le dit.
  await page.goto(`/#/recette/${RID}`);
  await expect(page.locator("#fiche-masquee")).toBeVisible();
  await page.goto("/");
  await page.locator("[data-reglages]").first().click();
  const ligne = page.locator(`[data-remettre="${RID}"]`);
  await expect(ligne).toBeVisible();
  await ligne.click();
  await expect(page.locator("#reg-supp-bloc")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.locator(carte)).toBeVisible();
});
