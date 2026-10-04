/* Accueil, fiche recette, partage, thème, anciens liens : le tronc du carnet. */

import { test, expect, preremplir, lireCarnet } from "./outils.js";

/* Les cartes écartées gardent « card-leave » le temps de s'estomper : seules
   celles-ci sont, tout de suite, l'ensemble que le filtre vient de décider. */
const CARTES = ".card:not(.gone):not(.card-leave)";

test("accueil : 20 vignettes, les filtres par catégorie et la recherche", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".card")).toHaveCount(20);
  await expect(page.locator(CARTES)).toHaveCount(20);

  await page.locator("#chips").getByRole("button", { name: "Apéro", exact: true }).click();
  await expect(page.locator(CARTES)).toHaveCount(7);

  await page.locator("#chips").getByRole("button", { name: "Toutes", exact: true }).click();
  await expect(page.locator(CARTES)).toHaveCount(20);

  await page.locator("#search").fill("feta");
  await expect(page.locator(CARTES)).toHaveCount(5);
});

test("fiche quiche-lorraine : titre, ingrédients, quantités mises à l'échelle", async ({ page }) => {
  await page.goto("/#/recette/quiche-lorraine");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quiche lorraine");
  await expect(page.locator("#ing-list")).toContainText("Lardons fumés");
  await expect(page.locator("#ing-list")).toContainText("200 g");
  await expect(page.locator("#p-val")).toHaveText("6 personnes");

  await page.getByRole("button", { name: "Plus de portions" }).click();
  await expect(page.locator("#p-val")).toHaveText("7 personnes");
  // 200 g de lardons pour 6 → 233 g pour 7.
  await expect(page.locator("#ing-list li", { hasText: "Lardons fumés" })).toContainText("233 g");
});

test("ajout au menu : la feuille « Des envies en plus ? » puis « Ajouter tel quel »", async ({ page }) => {
  await page.goto("/#/recette/quiche-lorraine");
  await expect(page.locator("#menu-badge")).toBeHidden();

  await page.locator("#add-list").click();
  const feuille = page.getByRole("dialog");
  await expect(feuille).toBeVisible();
  await expect(feuille).toContainText("Des envies en plus ?");

  await feuille.getByRole("button", { name: "Ajouter tel quel" }).click();
  await expect(feuille).toBeHidden();
  await expect(page.locator("#menu-badge")).toHaveText("1");
  await expect(page.locator("#toast")).toHaveText("Au menu — ingrédients ajoutés aux courses");
  await expect(page.locator("#add-list")).toContainText("Ajouter une autre version");

  const carnet = await lireCarnet(page);
  expect(carnet.menu).toHaveLength(1);
  expect(carnet.menu[0].rid).toBe("quiche-lorraine");
});

test("partage sans navigator.share : la recette est copiée dans le presse-papiers", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); });
  await page.goto("/#/recette/quiche-lorraine");

  await page.locator("#share-recipe").click();
  await expect(page.locator("#toast")).toHaveText("Recette copiée !");
  const copie = await page.evaluate(() => navigator.clipboard.readText());
  expect(copie).toContain("Quiche lorraine");
  expect(copie).toContain("Lardons fumés");
  expect(copie).toContain("/r/quiche-lorraine.html");
});

test("thème : la bascule pose data-theme=dark et le choix survit au rechargement", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).not.toHaveAttribute("data-theme", "dark");

  await page.locator("#theme-toggle").click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#theme-toggle")).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
});

test("ancien identifiant : #/recette/gravlax-saumon-yuzu mène à gravlax-saumon-yaourt-bulgare", async ({ page }) => {
  await page.goto("/#/recette/gravlax-saumon-yuzu");
  await expect(page).toHaveURL(/#\/recette\/gravlax-saumon-yaourt-bulgare$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Gravlax");
});

test("les données d'un ancien carnet sont lues sans erreur (menu converti en entrées)", async ({ page, context }) => {
  // Les anciens menus étaient une liste d'identifiants.
  await preremplir(context, { carnet: { menu: ["focaccia-romarin"] } });
  await page.goto("/#/menu");
  await expect(page.locator(".menu-card")).toHaveCount(1);
  await expect(page.locator(".menu-card")).toContainText("Focaccia");
  const carnet = await lireCarnet(page);
  expect(carnet.menu[0]).toMatchObject({ rid: "focaccia-romarin" });
});
