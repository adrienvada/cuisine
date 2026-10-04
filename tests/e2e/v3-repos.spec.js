/* Les temps de repos dans la frise du rétroplanning : ils se distinguent du four et des gestes. */

import { test, expect, preremplir, entree } from "./outils.js";

/* Une date lointaine : la frise ne dépend alors pas de l'horloge du test. */
const REPAS = { convives: 6, heure: "20:00", date: "2099-06-15", exclus: [] };

const repos = page => page.locator(".frise .fr-repos");

test("focaccia et quiche à la pâte maison : deux repos distincts, avec leurs heures", async ({ page, context }) => {
  await preremplir(context, {
    carnet: {
      menu: [entree("focaccia-romarin", { k: "f1" }), entree("quiche-lorraine", { k: "q1", choices: { pate: "maison" } })],
      repas: REPAS
    }
  });
  await page.goto("/#/menu");
  await expect(repos(page)).toHaveCount(2);

  const levee = repos(page).filter({ hasText: "Focaccia" });
  await expect(levee.locator(".fr-txt b")).toHaveText(/Repos\s:\sFocaccia/);
  await expect(levee.locator(".fr-h")).toHaveText("15 h 10");
  await expect(levee).toContainText("Levée");
  await expect(levee).toContainText(/2\sh\s50,\sjusqu.à\s18\sh/);
  await expect(levee).toContainText("Temps libre");

  const pate = repos(page).filter({ hasText: "Quiche" });
  await expect(pate.locator(".fr-h")).toHaveText("18 h 20");
  await expect(pate).toContainText("Pâte au frais");
  await expect(pate).toContainText(/30\smin,\sjusqu.à\s18\sh\s50/);

  // Le repos se voit à sa forme, pas qu'à sa couleur : une icône de repos, et un fil en pointillés.
  await expect(levee.locator(".fr-pt svg")).toHaveCount(1);
  await expect(levee).toHaveClass(/fr-bas-libre/);
  await expect(page.locator(".retro-legende")).toContainText("pointillés");
  // Les lignes de four, elles, n'ont pas l'icône ni le texte d'un repos.
  await expect(page.locator(".frise .fr-enfourner").first()).not.toContainText("Repos");

  // Le fil est vraiment en pointillés : le dégradé du fil n'est pas plein.
  const fil = await levee.locator(".fr-pt").evaluate(el => getComputedStyle(el, "::before").backgroundImage);
  expect(fil).toContain("repeating-linear-gradient");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("un menu sans repos n'en montre aucun, ni légende, ni séparateur de jour", async ({ page, context }) => {
  await preremplir(context, {
    carnet: { menu: [entree("dip-chevre-herbes", { k: "d1" }), entree("scoopable-cookies", { k: "s1" })], repas: REPAS }
  });
  await page.goto("/#/menu");
  await expect(page.locator(".frise .fr").first()).toBeVisible();
  await expect(repos(page)).toHaveCount(0);
  await expect(page.locator(".retro-legende")).toHaveCount(0);
  await expect(page.locator(".fr-jour")).toHaveCount(0);
  await expect(page.locator(".frise")).not.toContainText("Repos");
});

test("gravlax : la marinade se lit « la veille », avec le jour", async ({ page, context }) => {
  await preremplir(context, {
    carnet: { menu: [entree("gravlax-saumon-yaourt-bulgare", { k: "g1" })], repas: { ...REPAS, heure: "12:00" } }
  });
  await page.goto("/#/menu");
  const jours = page.locator(".frise .fr-jour");
  await expect(jours).toHaveCount(2);
  await expect(jours.first()).toContainText(/la veille/i);
  await expect(jours.first()).toContainText("dimanche 14 juin");
  await expect(jours.last()).toContainText("Le jour du repas");

  const marinade = repos(page).first();
  await expect(marinade.locator(".fr-h")).toHaveText("23 h 20");
  await expect(marinade).toContainText(/Marinade\s:\s12\sh,\sjusqu.à\s11\sh\s20,\sle\slendemain/);
  // La nuit de marinade est un temps libre : le fil est en pointillés jusqu'à la fin du repos.
  await expect(marinade).toHaveClass(/fr-bas-libre/);
  // La veille vient avant le jour du repas dans la frise.
  const ordre = await page.locator(".frise > li").evaluateAll(lis => lis.map(li => li.className.split(" ")[0]));
  expect(ordre.indexOf("fr-jour")).toBe(0);
  expect(ordre.lastIndexOf("fr-jour")).toBeGreaterThan(ordre.indexOf("fr"));
});

test("mode sombre et mouvement réduit : la frise garde ses repos lisibles, sans débordement à 320 px", async ({ page, context }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await preremplir(context, {
    carnet: {
      menu: [entree("gravlax-saumon-yaourt-bulgare", { k: "g1" }), entree("salade-mediterraneenne", { k: "s1" })],
      repas: { ...REPAS, heure: "12:00" }
    }
  });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/#/menu");
  await expect(repos(page)).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  // Le texte de la ligne dit « Repos » : c'est ce qu'entend un lecteur d'écran (l'icône est décorative).
  await expect(repos(page).first().locator(".fr-pt")).toHaveAttribute("aria-hidden", "true");
  await expect(repos(page).first()).toContainText("Repos");
});
