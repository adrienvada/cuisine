/* Lot « finitions » : zone de contact de la croix de recherche, h1 du mode cuisine, saisie de l'heure du repas. */

import { test, expect, entree, preremplir } from "./outils.js";

const REPAS = { convives: 6, heure: "20:00", date: "2099-06-15", exclus: [] };

/* ---------- La croix d'effacement des recherches ---------- */

for (const [nom, adresse, champ] of [["Recettes", "/#/", "#search"], ["Savoirs", "/#/fondamentaux", "#f-search"]]) {
  test(`recherche (${nom}) : la croix d'effacement se touche sur 44 px de côté comme de haut`, async ({ page }) => {
    await page.goto(adresse);
    const input = page.locator(champ);
    await input.fill("quiche");
    const b = await input.boundingBox();
    expect(b.height).toBeGreaterThanOrEqual(44);
    const milieu = b.y + b.height / 2;
    // Ces points sont hors de l'ancienne zone de 28 px : plus à gauche, plus haut, plus bas.
    for (const [dx, dy] of [[-40, 0], [-22, -17], [-22, 17]]) {
      await input.fill("quiche");
      await page.mouse.click(b.x + b.width + dx, milieu + dy);
      await expect(input).toHaveValue("");
    }
  });
}

/* ---------- Le h1 du mode cuisine ---------- */

test("mode cuisine : arrivé par le lien « Cuisiner », le focus est sur le h1, titre de la recette", async ({ page }) => {
  await page.goto("/#/recette/quiche-lorraine");
  await page.getByRole("link", { name: /Cuisiner/ }).click();
  await expect(page).toHaveURL(/\/cuisine/);
  const h1 = page.getByRole("heading", { level: 1 });
  await expect(h1).toHaveText("Quiche lorraine");
  await expect(h1).toBeFocused();
  await expect(page.locator("#app h1")).toHaveCount(1);
  // Le titre garde son apparence : une ligne, en italique serif, sur la barre du haut.
  const style = await h1.evaluate(e => { const cs = getComputedStyle(e); return { fontStyle: cs.fontStyle, taille: cs.fontSize, poids: cs.fontWeight, ligne: e.getBoundingClientRect().height }; });
  expect(style).toMatchObject({ fontStyle: "italic", taille: "16px", poids: "400" });
  expect(style.ligne).toBeLessThan(30);
});

/* ---------- L'heure du repas ---------- */

test("menu : régler l'heure au clavier ne redessine pas le champ, la frise suit", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("focaccia-romarin", { k: "f1" })], repas: REPAS } });
  await page.goto("/#/menu");
  const champ = page.locator("#repas-heure");
  await champ.focus();
  // Une marque posée sur le champ ne survit pas à un redessin de la vue.
  await champ.evaluate(e => { e.dataset.marque = "intact"; });
  await page.keyboard.type("1830");
  await expect(page.locator(".retro-titre")).toContainText("À table à 18 h 30");
  await expect(champ).toHaveAttribute("data-marque", "intact");
  await expect(champ).toBeFocused();
  await expect(champ).toHaveValue("18:30");
  /* Le curseur est resté sur le dernier segment (minutes, ou matin/soir selon la
     langue du navigateur) : la flèche haut n'y avance pas les heures. Redessiné,
     le champ aurait son curseur sur les heures, et « 19:30 » en sortirait. */
  await page.keyboard.press("ArrowUp");
  await expect.poll(() => champ.inputValue()).not.toBe("18:30");
  expect(await champ.inputValue()).not.toBe("19:30");
  await expect(champ).toHaveAttribute("data-marque", "intact");
});
