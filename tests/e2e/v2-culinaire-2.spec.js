/* Vague 2, lot « culinaire-2 » : le temps d'une option de choix est le même sur la fiche,
   la carte du menu et la frise du rétroplanning. */

import { test, expect, preremplir, entree } from "./outils.js";

const REPAS = { convives: 6, heure: "20:00", date: "2099-06-15", exclus: [] };

test("quiche : la pâte maison allonge les temps de la fiche", async ({ page, context }) => {
  await preremplir(context, { carnet: {} });
  await page.goto("/#/recette/quiche-lorraine");
  const temps = page.locator(".timerow");
  await expect(temps).toContainText("Cuisson : 52 min");
  await expect(temps).not.toContainText("Repos");

  await page.locator("#pick-zone").getByRole("button", { name: /Maison/ }).click();
  await expect(temps).toContainText("Repos : 30 min");
  await expect(temps).toContainText("Cuisson : 52 min");
  await expect(temps).toContainText("Préparation : 15 min");
});

test("quiche à la pâte maison au menu : 1 h 37 sur la carte, départ à 18 h 20 pour 20 h sur la frise", async ({ page, context }) => {
  await preremplir(context, {
    carnet: { menu: [entree("quiche-lorraine", { k: "q1", choices: { pate: "maison" } })], repas: REPAS }
  });
  await page.goto("/#/menu");
  await expect(page.locator(".menu-card .meta")).toContainText("1 h 37");
  await expect(page.locator(".frise .fr", { hasText: "Démarre" })).toContainText("18 h 20");
});

test("quiche à la pâte du commerce au menu : 1 h 07 sur la carte, départ à 18 h 50", async ({ page, context }) => {
  await preremplir(context, {
    carnet: { menu: [entree("quiche-lorraine", { k: "q1", choices: { pate: "industrielle" } })], repas: REPAS }
  });
  await page.goto("/#/menu");
  await expect(page.locator(".menu-card .meta")).toContainText("1 h 07");
  await expect(page.locator(".frise .fr", { hasText: "Démarre" })).toContainText("18 h 50");
});

test("tartines : le chèvre gratiné affiche ses 6 min de four, le chèvre frais « Sans cuisson »", async ({ page, context }) => {
  await preremplir(context, { carnet: {} });
  await page.goto("/#/recette/tartines-figues-chevre-miel");
  const temps = page.locator(".timerow");
  await expect(temps).toContainText("Sans cuisson");
  await page.getByRole("button", { name: /Chèvre chaud gratiné/ }).click();
  await expect(temps).toContainText("Cuisson : 6 min");
  await expect(temps).not.toContainText("Sans cuisson");
});

test("accueil : la vignette de la quiche annonce la cuisson réelle de 52 min", async ({ page, context }) => {
  await preremplir(context, { carnet: {} });
  await page.goto("/");
  await expect(page.locator(".card", { hasText: "Quiche lorraine" }).first()).toContainText("52 min");
});
