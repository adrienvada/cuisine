/* L'accueil : critères cumulables, « De saison », « J'ai… », recherche gardée le temps d'une visite, partage depuis la vignette. */

import { test, expect, lireCarnet } from "./outils.js";

/* Les cartes écartées gardent « card-leave » le temps de s'estomper : seules
   celles-ci sont, tout de suite, l'ensemble que le filtre vient de décider. */
const CARTES = ".card:not(.gone):not(.card-leave)";
/* La feuille 🌿 du rebond fait partie du nom accessible tant que l'animation joue. */
const critere = (page, nom) => page.locator("#criteres").getByRole("button", { name: new RegExp(`^${nom}`) });
const idsAffiches = page => page.$$eval(CARTES, els => els.map(e => e.dataset.id));

test("critères : ils se cumulent, et se défont d'un second appui", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(CARTES)).toHaveCount(20);

  await critere(page, "Végétarien").click();
  await expect(critere(page, "Végétarien")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(CARTES)).toHaveCount(17);
  // Le houmous est végétarien, le gravlax non.
  expect(await idsAffiches(page)).not.toContain("gravlax-saumon-yaourt-bulgare");

  await critere(page, "Rapide").click();
  await expect(page.locator(CARTES)).toHaveCount(7);

  await critere(page, "Sans cuisson").click();
  const ids = await idsAffiches(page);
  expect(ids.length).toBeGreaterThan(0);
  expect(ids.length).toBeLessThan(7);

  await critere(page, "Sans cuisson").click();
  await critere(page, "Rapide").click();
  await expect(page.locator(CARTES)).toHaveCount(17);
  await critere(page, "Végétarien").click();
  await expect(page.locator(CARTES)).toHaveCount(20);
});

test("critères : « Sans four » écarte la focaccia, et se cumule avec la catégorie", async ({ page }) => {
  await page.goto("/");
  await critere(page, "Sans four").click();
  await expect(page.locator(CARTES)).toHaveCount(13);
  expect(await idsAffiches(page)).not.toContain("focaccia-romarin");

  await page.locator("#chips").getByRole("button", { name: "Apéro", exact: true }).click();
  const ids = await idsAffiches(page);
  expect(ids.length).toBeGreaterThan(0);
  expect(ids.length).toBeLessThan(7);
});

test("critères : aucun résultat affiche le message, en tutoyant", async ({ page }) => {
  await page.goto("/");
  await page.locator("#search").fill("zzzzz");
  await expect(page.locator(CARTES)).toHaveCount(0);
  await expect(page.locator(".grid-empty")).toBeVisible();
  await expect(page.locator(".grid-empty")).toContainText("Essaie d'enlever un filtre");
});

test("critères : la sélection n'est gardée que pendant la visite", async ({ page }) => {
  await page.goto("/");
  await critere(page, "Végétarien").click();
  await expect(page.locator(CARTES)).toHaveCount(17);

  await page.locator('.tabbar a[data-tab="courses"]').click();
  await page.locator('.tabbar a[data-tab="home"]').click();
  await expect(critere(page, "Végétarien")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(CARTES)).toHaveCount(17);

  await page.reload();
  await expect(critere(page, "Végétarien")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(CARTES)).toHaveCount(20);
});

test("De saison (juillet) : les recettes de saison, avec leur pastille", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-07-15T10:00:00"));
  await page.goto("/");
  await expect(page.locator(".card-saison")).toHaveCount(8);

  await critere(page, "De saison").click();
  await expect(page.locator(CARTES)).toHaveCount(8);
  const ids = await idsAffiches(page);
  expect(ids).toContain("salade-mediterraneenne");
  expect(ids).not.toContain("veloute-butternut-shiitakes");
  await expect(page.locator(`${CARTES} .card-saison`)).toHaveCount(8);
  await expect(page.locator(".card-saison").first()).toHaveText("De saison");
});

test("De saison (janvier) : seule la soupe de courge l'est", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-01-15T10:00:00"));
  await page.goto("/");
  await critere(page, "De saison").click();
  await expect(page.locator(CARTES)).toHaveCount(1);
  await expect(page.locator(CARTES)).toHaveAttribute("data-id", "veloute-butternut-shiitakes");
});

test("J'ai… : choisir des ingrédients trie les recettes et affiche « 3 / 5 »", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".card-jai:visible")).toHaveCount(0);
  await page.getByRole("button", { name: /^J'ai…/ }).click();
  const feuille = page.getByRole("dialog");
  await expect(feuille).toBeVisible();
  await expect(feuille.locator("#jai-ok")).toHaveText("Fermer");

  // Sans accents : « oeuf » trouve « Œuf », « feta » filtre la liste.
  await feuille.locator("#jai-recherche").fill("oeuf");
  await expect(feuille.locator(".jai-chip:not([hidden])", { hasText: "Œuf" })).toHaveCount(1);
  await feuille.locator("#jai-recherche").fill("feta");
  await expect(feuille.locator(".jai-chip:not([hidden])")).toHaveCount(1);
  await feuille.locator(".jai-chip", { hasText: "Feta" }).click();
  await expect(feuille.locator(".jai-chip.on")).toHaveCount(1);

  await feuille.locator("#jai-recherche").fill("lardons");
  await feuille.locator(".jai-chip:not([hidden])").first().click();
  await expect(feuille.locator(".jai-chip.on")).toHaveCount(2);
  await expect(feuille.locator("#jai-ok")).toContainText("Voir");

  await feuille.locator("#jai-ok").click();
  await expect(feuille).toBeHidden();
  await expect(page.getByRole("button", { name: /^J'ai…/ })).toContainText("2");

  // Seules les recettes qui servent un ingrédient restent, les plus avancées d'abord.
  await expect(page.locator(CARTES)).not.toHaveCount(20);
  const pastilles = await page.$$eval(`${CARTES} .card-jai`, els => els.map(e => e.textContent));
  expect(pastilles.length).toBeGreaterThan(0);
  const trouves = pastilles.map(t => Number(t.split("/")[0]));
  expect(pastilles.every(t => /^\d+ \/ \d+$/.test(t))).toBe(true);
  expect(trouves.every(n => n > 0)).toBe(true);
  expect(trouves).toEqual([...trouves].sort((a, b) => b - a));
  await expect(page.locator(`${CARTES} .card-jai`).first()).toBeVisible();

  // « Effacer » défait la sélection sans rouvrir la feuille.
  await page.locator("#jai-efface").click();
  await expect(page.locator(CARTES)).toHaveCount(20);
  await expect(page.locator("#jai-etat")).toBeHidden();
  await expect(page.locator(".card-jai:visible")).toHaveCount(0);
});

test("J'ai… : « Tout effacer » dans la feuille, et le geste de retour la referme", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^J'ai…/ }).click();
  const feuille = page.getByRole("dialog");
  await feuille.locator(".jai-chip", { hasText: "Feta" }).click();
  await expect(feuille.locator("#jai-vider")).toBeEnabled();
  await feuille.locator("#jai-vider").click();
  await expect(feuille.locator(".jai-chip.on")).toHaveCount(0);
  await expect(feuille.locator("#jai-vider")).toBeDisabled();

  await feuille.locator(".jai-chip", { hasText: "Feta" }).click();
  await page.goBack();
  await expect(feuille).toBeHidden();
  await expect(page.locator(CARTES)).not.toHaveCount(20);
});

test("recherche : elle est gardée pendant la visite, pas d'une session à l'autre", async ({ page }) => {
  await page.goto("/");
  await page.locator("#search").fill("feta");
  await expect(page.locator(CARTES)).toHaveCount(5);

  await page.locator('.tabbar a[data-tab="courses"]').click();
  await page.locator('.tabbar a[data-tab="home"]').click();
  await expect(page.locator("#search")).toHaveValue("feta");
  await expect(page.locator(CARTES)).toHaveCount(5);

  // Rien n'est écrit dans le carnet : rouvrir l'appli montre toutes les recettes.
  expect((await lireCarnet(page)).query).toBeUndefined();
  await page.reload();
  await expect(page.locator("#search")).toHaveValue("");
  await expect(page.locator(CARTES)).toHaveCount(20);
});

test("vignette : le bouton partager n'est plus dans le lien, et ne navigue pas", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); });
  await page.goto("/");
  await expect(page.locator(".card a button, .card button a")).toHaveCount(0);

  await page.locator('.card[data-id="quiche-lorraine"] .card-share').click();
  await expect(page.locator("#toast")).toHaveText("Recette copiée !");
  await expect(page).toHaveURL(/#\/$|\/$/);
  await expect(page.locator("#search")).toBeVisible();
});

test("vignette : toucher n'importe où sur la carte ouvre la recette", async ({ page }) => {
  await page.goto("/");
  const premiere = page.locator(CARTES).first();
  const id = await premiere.getAttribute("data-id");
  // Le lien étiré recouvre la carte : Playwright le voit « devant » .meta, et c'est voulu.
  await premiere.locator(".meta").tap({ force: true });
  await expect(page).toHaveURL(new RegExp(`#/recette/${id}$`));
});

test("téléphone : rien ne déborde à 375 px, la feuille « J'ai… » comprise, zones de 44 px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  const deborde = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(await deborde()).toBe(false);

  const boite = await page.getByRole("button", { name: /^J'ai…/ }).boundingBox();
  expect(boite.height).toBeGreaterThanOrEqual(44);
  expect(boite.width).toBeGreaterThanOrEqual(44);

  await page.getByRole("button", { name: /^J'ai…/ }).click();
  expect(await deborde()).toBe(false);
  const chip = await page.locator(".jai-chip").first().boundingBox();
  expect(chip.height).toBeGreaterThanOrEqual(44);
});
