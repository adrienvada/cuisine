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

/* ---------- Au clavier ---------- */

/* L'appel est un vrai bouton : Tab l'atteint, Entrée et Espace le déplient,
   jamais ils n'ouvrent quoi que ce soit. Puis Tab atteint le lien, et
   Entrée comme Espace ouvrent la feuille. */
for (const touche of ["Enter", "Space"]) {
  const depuis = {
    "la fiche": { url: "/#/recette/quiche-lorraine", zone: page => page.locator("#steps-list li", { hasText: "Les lardons" }) },
    "le mode cuisine": { url: "/#/recette/quiche-lorraine/cuisine/2", zone: page => page.locator(".cook") }
  };
  for (const [nom, { url, zone }] of Object.entries(depuis)) {
    test(`savoirs au clavier : ${touche} déplie l'appel puis ouvre le fondamental (${nom})`, async ({ page }) => {
      await page.goto(url);
      const appel = zone(page).locator(".s-cue").first();
      const lien = zone(page).locator('.s-lien[data-fond="maillard"]').first();
      await expect(appel).toHaveAttribute("aria-expanded", "false");
      await expect(lien).toBeHidden();

      await appel.focus();
      await page.keyboard.press(touche);
      await expect(appel).toHaveAttribute("aria-expanded", "true");
      await expect(lien).toBeVisible();
      // Déplier n'ouvre jamais rien.
      await expect(page.getByRole("dialog")).toHaveCount(0);
      const liste = await appel.getAttribute("aria-controls");
      await expect(page.locator("#" + liste)).toBeVisible();

      await page.keyboard.press("Tab");
      await expect(lien).toBeFocused();
      await page.keyboard.press(touche);
      await expect(page.getByRole("dialog", { name: "La réaction de Maillard" })).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page).toHaveURL(new RegExp(url.slice(2).replace(/\//g, "\\/") + "$"));
    });
  }
}

test("savoirs : l'appel se replie au clavier, et le lien reste hors de portée tant qu'il est replié", async ({ page }) => {
  await page.goto("/#/recette/quiche-lorraine");
  const etape = page.locator("#steps-list li", { hasText: "Les lardons" });
  const appel = etape.locator(".s-cue").first();
  await appel.focus();
  await page.keyboard.press("Enter");
  await expect(appel).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Space");
  await expect(appel).toHaveAttribute("aria-expanded", "false");
  await expect(etape.locator(".s-lien").first()).toBeHidden();
});

test("savoirs : toucher l'astuce déplie aussi, sans rien ouvrir", async ({ page }) => {
  await page.goto("/#/recette/quiche-lorraine");
  const etape = page.locator("#steps-list li", { hasText: "Les lardons" });
  await etape.locator(".tip-body b").first().click();
  await expect(etape.locator(".s-cue").first()).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

/* ---------- Recherche ---------- */

test("savoirs : taper garde le champ, le focus et la sélection", async ({ page }) => {
  await page.goto("/#/fondamentaux");
  const champ = page.locator("#f-search");
  await champ.focus();
  await page.keyboard.type("réaction");
  await expect(champ).toBeFocused();
  await expect(champ).toHaveValue("réaction");
  await expect(page.locator(".f-item", { hasText: "La réaction de Maillard" })).toBeVisible();

  await page.keyboard.type(" zzzxyz");
  await expect(page.locator(".empty")).toContainText("zzzxyz");
  await expect(champ).toBeFocused();
});

test("savoirs : une recherche avec des guillemets et du balisage reste du texte", async ({ page }) => {
  await page.goto("/#/fondamentaux");
  const requete = '"><img src=x onerror="window.__xss=1">';
  await page.locator("#f-search").fill(requete);
  await expect(page.locator(".empty")).toContainText(requete);
  await expect(page.locator("#app img")).toHaveCount(0);
  // Un retour sur l'onglet redessine la vue : la valeur survit à l'aller-retour.
  await page.goto("/#/courses");
  await page.goto("/#/fondamentaux");
  await expect(page.locator("#f-search")).toHaveValue(requete);
});
