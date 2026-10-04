/* Les figures des savoirs : la page d'un fondamental, la feuille ouverte depuis une recette, le zoom,
   la lisibilité à 360 px et en sombre, et la tolérance à l'absence du fichier. */

import { test, expect } from "./outils.js";
import { contraste } from "./outils-courses.js";
import { mesurerFigures } from "../../tools/capturer-savoir.mjs";

test("figures : la page de Maillard montre ses figures, la première juste après l'accroche", async ({ page }) => {
  await page.goto("/#/fondamental/maillard");
  const figures = page.locator(".f-page .fg");
  await expect(figures).toHaveCount(4);
  // « tete » : entre l'accroche et le premier bloc.
  const ordre = await page.locator(".f-page").evaluate(el => [...el.children].slice(0, 3).map(c => c.tagName + "." + (c.className || "").split(" ")[0]));
  expect(ordre).toEqual(["P.f-accroche", "FIGURE.fg", "DIV.f-bloc"]);
  // Chacune a son SVG nommé et sa légende.
  for (let i = 0; i < 4; i++) {
    const fig = figures.nth(i);
    await expect(fig.locator('svg[role="img"]')).toHaveAttribute("aria-labelledby", /fg-\w+-t fg-\w+-d/);
    await expect(fig.locator("svg title")).not.toBeEmpty();
    await expect(fig.locator("svg desc")).not.toBeEmpty();
    await expect(fig.locator(".fg-titre")).not.toBeEmpty();
    await expect(fig.locator(".fg-legende")).not.toBeEmpty();
  }
  // Les emplacements : « cas » après « Selon les cas », « reperes » dans « À retenir », « pourquoi » dans « Pourquoi ça marche ».
  await expect(page.locator(".f-bloc", { hasText: "À retenir" }).locator(".fg")).toHaveCount(1);
  await expect(page.locator(".f-bloc", { hasText: "Pourquoi ça marche" }).locator(".fg")).toHaveCount(1);
  expect(await page.locator(".f-bloc", { hasText: "Selon les cas" }).evaluate(b => b.nextElementSibling.className)).toContain("fg");
  // Les identifiants sont uniques dans la page.
  expect(await page.evaluate(() => { const ids = [...document.querySelectorAll("[id]")].map(e => e.id); return ids.length - new Set(ids).size; })).toBe(0);
});

test("figures : le catalogue annonce « 4 schémas » sur Maillard, et rien sur une fiche sans figure", async ({ page }) => {
  /* Toutes les fiches ont désormais leurs figures : on en retire une au vol pour
     garder la preuve qu'une fiche sans figure n'affiche aucun badge. */
  await page.route("**/js/figures.js", async route => {
    const reponse = await route.fetch();
    await route.fulfill({ response: reponse, body: (await reponse.text()) + '\ndelete FIGURES["deglacage"];\n' });
  });
  await page.goto("/#/fondamentaux");
  await expect(page.locator(".f-item", { hasText: "La réaction de Maillard" }).locator(".f-item-fig")).toHaveText("4 schémas");
  await expect(page.locator(".f-item", { hasText: "Le déglaçage" }).locator(".f-item-fig")).toHaveCount(0);
});

for (const [nom, theme] of [["clair", "light"], ["sombre", "dark"]]) {
  test(`figures (${nom}) : à 360 px rien ne déborde, aucun texte coupé, trop petit ou superposé`, async ({ page, context }) => {
    await context.addInitScript(t => { try { localStorage.setItem("theme", t); } catch {} }, theme);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/#/fondamental/maillard");
    await expect(page.locator(".f-page .fg")).toHaveCount(4);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBe(theme === "dark" ? "dark" : null);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const rapport = await page.evaluate(mesurerFigures);
    expect(rapport).toHaveLength(4);
    for (const r of rapport) expect(r.problemes, r.titre).toEqual([]);
  });
}

test("figures (sombre) : le texte des figures reste lisible, 4,5:1 sur le fond de la carte", async ({ page, context }) => {
  await context.addInitScript(() => { try { localStorage.setItem("theme", "dark"); } catch {} });
  await page.goto("/#/fondamental/maillard");
  await expect(page.locator(".f-page .fg")).toHaveCount(4);
  const mesures = await page.evaluate(() => {
    const fond = getComputedStyle(document.querySelector(".fg-cadre")).backgroundColor;
    return {
      fond,
      textes: [...document.querySelectorAll(".fg-svg text")].map(t => getComputedStyle(t).fill),
      legende: [getComputedStyle(document.querySelector(".fg-legende")).color, getComputedStyle(document.querySelector(".fg-legende")).backgroundColor]
    };
  });
  // Les textes posés sur une teinte claire sont mesurés en unitaire (css) ; ici, les textes de la carte nue.
  for (const c of new Set(mesures.textes)) {
    if (!/^rgb/.test(c)) continue;
    expect(contraste(c, mesures.fond), c).toBeGreaterThanOrEqual(4.5);
  }
});

test("figures : la feuille ouverte depuis une recette montre les figures du fondamental", async ({ page }) => {
  await page.goto("/#/recette/quiche-lorraine");
  const etape = page.locator("#steps-list li", { hasText: "Les lardons" });
  await etape.locator(".s-cue").first().click();
  await etape.locator('.s-lien[data-fond="maillard"]').first().click();
  const feuille = page.getByRole("dialog", { name: "La réaction de Maillard" });
  await expect(feuille).toBeVisible();
  await expect(feuille.locator(".fg")).toHaveCount(4);
  await expect(feuille.locator(".fg-svg").first()).toBeVisible();
  const largeurFeuille = await feuille.evaluate(el => el.clientWidth);
  for (const largeur of await feuille.locator(".fg").evaluateAll(fs => fs.map(f => f.getBoundingClientRect().width))) {
    expect(largeur).toBeLessThanOrEqual(largeurFeuille);
  }
});

test("figures : un appui sur le bouton agrandit la figure dans une feuille, Échap la referme", async ({ page }) => {
  await page.goto("/#/fondamental/maillard");
  const bouton = page.locator(".fg-agrandir").first();
  await expect(bouton).toHaveAttribute("aria-label", /^Agrandir le schéma : /);
  await bouton.focus();
  await page.keyboard.press("Enter");
  const zoom = page.getByRole("dialog", { name: "D'une rencontre à l'odeur du rôti" });
  await expect(zoom).toBeVisible();
  await expect(zoom.locator(".fg-zoomee svg")).toBeVisible();
  await expect(zoom.locator(".fg-agrandir")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(bouton).toBeFocused();
  await expect(page).toHaveURL(/#\/fondamental\/maillard$/);
  // Toucher le dessin fait de même.
  await page.locator(".fg-svg").nth(1).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("figures : sans js/figures.js, la fiche s'affiche comme avant", async ({ page }) => {
  await page.route("**/js/figures.js", route => route.abort());
  await page.goto("/#/fondamental/maillard");
  await expect(page.locator(".f-page")).toContainText("Pourquoi ça marche");
  await expect(page.locator(".f-page .f-rec", { hasText: "Quiche lorraine" })).toBeVisible();
  await expect(page.locator(".fg")).toHaveCount(0);
  await page.evaluate(() => { location.hash = "#/fondamentaux"; });
  await expect(page.locator(".f-item", { hasText: "La réaction de Maillard" })).toBeVisible();
  await expect(page.locator(".f-item-fig")).toHaveCount(0);
});

test("figures : un fichier de figures qui tarde ne retarde pas la fiche au-delà d'un instant", async ({ page }) => {
  await page.route("**/js/figures.js", () => new Promise(() => {}));   // ne répond jamais
  const debut = Date.now();
  await page.goto("/#/fondamental/maillard", { waitUntil: "commit" });   // une requête en suspens retarde « load » : on n'attend pas cet événement
  await expect(page.locator(".f-page")).toContainText("Pourquoi ça marche");
  expect(Date.now() - debut).toBeLessThan(5000);
  await expect(page.locator(".fg")).toHaveCount(0);
});

test("figures : un tracé animé finit visible, et rien ne s'anime sous mouvement réduit", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#/fondamental/maillard");
  const trace = page.locator(".fg-trace").first();
  await trace.scrollIntoViewIfNeeded();
  await expect(trace).toHaveCSS("stroke-dashoffset", "0px");
});
