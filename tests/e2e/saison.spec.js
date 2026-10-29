/* L'onglet Saison : le mois en cours par phase, la navigation entre les mois, les familles,
   la feuille d'un produit et ses recettes, et le renvoi vers les recettes de saison. */

import { test, expect } from "./outils.js";

/* Octobre : les figues vivent leur dernier mois, la butternut est en pleine saison. */
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-15T10:00:00"));
});

test("l'onglet s'ouvre sur le mois en cours, rangé par phase", async ({ page }) => {
  await page.goto("/");
  await page.locator('.tabbar a[data-tab="saison"]').click();
  await expect(page).toHaveURL(/#\/saison$/);
  await expect(page.locator('.tabbar a[data-tab="saison"]')).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Saison");
  await expect(page).toHaveTitle(/^Saison/);
  await expect(page.locator(".sa-mois-nom")).toContainText("Octobre");
  await expect(page.locator(".sa-mois-nom")).toContainText("ce mois-ci");
  await expect(page.locator(".sa-fin [data-produit=figue]")).toBeVisible();
  await expect(page.locator(".sa-pleine [data-produit=courge-butternut]")).toBeVisible();
  await expect(page.locator(".sa-arrive [data-produit=kale]")).toBeVisible();
  await expect(page.locator("#sa-aujourdhui")).toBeHidden();
});

test("les flèches changent de mois, « Revenir à » ramène au mois en cours", async ({ page }) => {
  await page.goto("/#/saison");
  await page.locator(".sa-suiv").click();
  await expect(page.locator(".sa-mois-nom")).toHaveText("Novembre");
  await expect(page.locator("[data-produit=figue]")).toHaveCount(0);
  // Le focus reste sur la flèche touchée : on peut feuilleter au clavier.
  await expect(page.locator(".sa-suiv")).toBeFocused();
  await expect(page.locator("#sa-voir")).toHaveCount(0);
  await page.locator("#sa-aujourdhui").click();
  await expect(page.locator(".sa-mois-nom")).toContainText("Octobre");
  // Janvier, en reculant depuis février : l'année tourne.
  for (let i = 0; i < 9; i++) await page.locator(".sa-prec").click();
  await expect(page.locator(".sa-mois-nom")).toHaveText("Janvier");
  await expect(page.locator(".sa-pleine [data-produit=courge-butternut]")).toBeVisible();
});

test("une famille ne garde que ses produits", async ({ page }) => {
  await page.goto("/#/saison");
  await page.locator('.sa-familles [data-famille="herbes"]').click();
  await expect(page.locator('.sa-familles [data-famille="herbes"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-produit=persil]").first()).toBeVisible();
  await expect(page.locator("[data-produit=figue]")).toHaveCount(0);
  await page.locator('.sa-familles [data-famille=""]').click();
  await expect(page.locator("[data-produit=figue]")).toBeVisible();
});

test("la feuille d'un produit : sa saison, sa frise, ses recettes, et un lien qui y mène", async ({ page }) => {
  await page.goto("/#/saison");
  await page.locator("[data-produit=figue]").click();
  const feuille = page.getByRole("dialog", { name: "Figue" });
  await expect(feuille).toBeVisible();
  await expect(feuille.locator(".sheet-sub")).toHaveText("D'août à octobre");
  await expect(feuille.locator(".sa-frise")).toHaveAttribute("aria-label", "De saison d'août à octobre");
  await expect(feuille.locator(".sa-frise .on")).toHaveCount(3);
  await expect(feuille.locator(".sa-frise .ici")).toHaveText("O");
  await expect(feuille.locator(".sa-phrase")).toContainText("dernier mois");
  await expect(feuille.locator(".sa-carnet li")).toHaveCount(2);
  await feuille.getByRole("link", { name: /Tartines de figues/ }).click();
  await expect(page).toHaveURL(/#\/recette\/tartines-figues-chevre-miel$/);
  await expect(page.locator(".sheet-backdrop")).toHaveCount(0);
  // La flèche de la fiche ramène là d'où l'on vient.
  await expect(page.locator(".topbar a").first()).toContainText("Saison");
});

test("Échap referme la feuille d'un produit", async ({ page }) => {
  await page.goto("/#/saison");
  await page.locator("[data-produit=courge-butternut]").click();
  await expect(page.getByRole("dialog", { name: "Courge butternut" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".sheet-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(/#\/saison$/);
});

test("« Les voir » ouvre l'accueil sur les seules recettes de saison", async ({ page }) => {
  await page.goto("/#/saison");
  await page.locator("#sa-voir").click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator('#criteres [data-critere="de-saison"]')).toHaveAttribute("aria-pressed", "true");
  const cartes = page.locator(".card:not(.gone):not(.card-leave)");
  await expect(cartes.first()).toBeVisible();
  await expect(page.locator(".card:not(.gone):not(.card-leave) .card-saison")).toHaveCount(await cartes.count());
});

test("téléphone : rien ne déborde à 320 px, la barre garde ses cinq onglets lisibles", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/#/saison");
  await expect(page.locator(".sa-produit").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const onglets = page.locator(".tabbar a");
  await expect(onglets).toHaveCount(5);
  for (const o of await onglets.all()) {
    const libelle = o.locator("span").last();
    expect(await libelle.evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  }
});
