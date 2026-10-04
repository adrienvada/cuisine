/* Les attentes qui courent pendant qu'on travaille : leurs temps sur la carte et la fiche, leur ligne « Pendant ce temps » dans la frise, le minuteur des beignets, les libellés des repos, 320 px — et le journal à minuit passé. */

import { test, expect, preremplir, entree, lireCarnet } from "./outils.js";

/* Une date lointaine : la frise ne dépend alors pas de l'horloge du test. */
const REPAS = { convives: 4, heure: "20:00", date: "2099-06-15", exclus: [] };

const menuDe = (...rids) => ({ menu: rids.map(rid => entree(rid, { k: "k-" + rid.slice(0, 4) })), repas: REPAS });
const pendant = page => page.locator(".frise .fr-pendant");
const repos = page => page.locator(".frise .fr-repos");

test("salade et cocktail : leurs temps sont ceux de la réalité sur la carte et la fiche", async ({ page }) => {
  await page.goto("/");
  const temps = id => page.locator(`.card[data-id="${id}"] .t-part`).allInnerTexts();
  // Salade : 15 min de gestes, 15 min de repos (le trempage de l'oignon court pendant) — 30 min, « Rapide ».
  expect((await temps("salade-mediterraneenne")).map(t => t.replace(/\s/g, " ").trim())).toEqual(["15 min", "15 min", "sans cuisson"]);
  // Cocktail : le délai qui commande, 15 min, sans repos de plus.
  expect((await temps("cocktail-concombre-menthe")).map(t => t.replace(/\s/g, " ").trim())).toEqual(["15 min", "sans cuisson"]);

  await page.goto("/#/recette/salade-mediterraneenne");
  await expect(page.locator(".timechip")).toHaveText([/Préparation\s:\s15\smin/, /Repos\s:\s15\smin/, /Sans cuisson/]);
  await page.goto("/#/recette/cocktail-concombre-menthe");
  await expect(page.locator(".timechip")).toHaveText([/Préparation\s:\s15\smin/, /Sans cuisson/]);
});

test("frise de la salade : l'oignon est « Pendant ce temps », sans « Temps libre » ni « Reprends »", async ({ page, context }) => {
  await preremplir(context, { carnet: menuDe("salade-mediterraneenne") });
  await page.goto("/#/menu");
  await expect(page.locator(".frise .fr").first()).toBeVisible();

  await expect(pendant(page)).toHaveCount(1);
  const oignon = pendant(page);
  await expect(oignon.locator(".fr-txt b")).toHaveText(/Pendant ce temps\s:\soignon dans l.eau glacée/);
  await expect(oignon).toContainText(/Salade méditerranéenne\s:\s10\smin,\sjusqu.à\s19\sh\s43/);
  await expect(oignon.locator(".fr-h")).toHaveText("19 h 33");
  await expect(oignon).not.toContainText(/Temps libre|Mains libres|Reprends/);
  await expect(oignon).not.toHaveClass(/fr-(haut|bas)-libre/);
  // Il ne laisse pas de fil en pointillés derrière lui : les mains sont prises.
  const fil = await oignon.locator(".fr-pt").evaluate(el => getComputedStyle(el, "::before").backgroundImage);
  expect(fil).not.toContain("repeating-linear-gradient");
  // Le trempage a sa propre icône (un minuteur), le repos la sienne : deux formes, pas deux couleurs.
  await expect(oignon.locator(".fr-pt svg")).toHaveCount(1);
  expect(await oignon.locator(".fr-pt svg").evaluate(el => el.innerHTML)).not.toBe(await repos(page).locator(".fr-pt svg").evaluate(el => el.innerHTML));

  // Un seul repos qui libère : celui de l'assemblage, qui garde son style et son « Temps libre ».
  await expect(repos(page)).toHaveCount(1);
  await expect(repos(page)).toContainText(/15\smin,\sjusqu.à\s20\sh/);
  await expect(repos(page)).toContainText("Temps libre");
  // Nulle part dans la frise : « Reprends ».
  await expect(page.locator(".frise")).not.toContainText("Reprends");
  await expect(page.locator(".frise")).not.toContainText("découpe de l'oignon");
});

test("frise du cocktail : les verres givrent pendant la préparation, aucun repos ni temps libre", async ({ page, context }) => {
  await preremplir(context, { carnet: menuDe("cocktail-concombre-menthe") });
  await page.goto("/#/menu");
  await expect(page.locator(".frise .fr").first()).toBeVisible();
  await expect(pendant(page)).toHaveCount(1);
  await expect(pendant(page).locator(".fr-txt b")).toHaveText(/Pendant ce temps\s:\sverres au congélateur/);
  await expect(pendant(page).locator(".fr-h")).toHaveText("19 h 45");
  await expect(pendant(page)).toContainText(/15\smin,\sjusqu.à\s20\sh/);
  await expect(repos(page)).toHaveCount(0);
  await expect(page.locator(".retro-legende")).toHaveCount(0);
  await expect(page.locator(".frise")).not.toContainText(/Temps libre|Repos/);
  // Le départ et l'attente partent ensemble : le départ d'abord.
  const types = await page.locator(".frise > li").evaluateAll(lis => lis.map(li => li.className.split(" ")[1]));
  expect(types).toEqual(["fr-debut", "fr-pendant", "fr-table"]);
});

test("beignets : la sauce a retrouvé sa « 1 heure » et son minuteur de 60 min en mode cuisine", async ({ page }) => {
  await page.goto("/#/recette/beignets-brebis-menthe");
  await expect(page.locator("#steps-list li").first()).toContainText(/Réservez au frais 1\sheure/);

  await page.goto("/#/recette/beignets-brebis-menthe/cuisine/0");
  const bouton = page.getByRole("button", { name: /Minuteur 1\sh/ });
  await expect(bouton).toBeVisible();
  await bouton.click();
  await expect(page.locator("#timer-zone .clock")).toBeVisible();
  const [minuteur] = (await lireCarnet(page)).timers;
  const restant = (minuteur.end - await page.evaluate(() => Date.now())) / 60000;
  expect(restant).toBeGreaterThan(59);
  expect(restant).toBeLessThanOrEqual(60);

});

test("beignets dans le menu : la sauce court pendant le reste, le fromage au frais libère", async ({ page, context }) => {
  await preremplir(context, { carnet: menuDe("beignets-brebis-menthe") });
  await page.goto("/#/menu");
  await expect(pendant(page)).toHaveCount(1);
  await expect(pendant(page).locator(".fr-txt b")).toHaveText(/Pendant ce temps\s:\ssauce au frais/);
  await expect(pendant(page)).toContainText(/1\sh,\sjusqu.à\s19\sh\s55/);
  await expect(repos(page)).toHaveCount(1);
  await expect(repos(page)).toContainText(/Repos au frais\s:\s30\smin/);
});

test("libellés : « Au congélateur » et « Marinade » pour le gravlax, pas le titre de l'étape", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("gravlax-saumon-yaourt-bulgare", { k: "g1" })], repas: { ...REPAS, heure: "12:00" } } });
  await page.goto("/#/menu");
  await expect(repos(page)).toHaveCount(2);
  await expect(repos(page).nth(0)).toContainText(/Marinade\s:\s12\sh/);
  await expect(repos(page).nth(1)).toContainText(/Au congélateur\s:\s15\smin/);
  await expect(page.locator(".frise")).not.toContainText("raffermir et trancher");
  await expect(page.locator(".frise")).not.toContainText("Pendant ce temps");
});

test("libellés : le supplément oignon des lentilles court pendant, sous son propre nom", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("salade-lentilles-feta", { k: "l1", addons: ["oignon-rouge"] })], repas: REPAS } });
  await page.goto("/#/menu");
  await expect(pendant(page)).toHaveCount(1);
  await expect(pendant(page).locator(".fr-txt b")).toHaveText(/Pendant ce temps\s:\soignon dans l.eau glacée/);
  await expect(repos(page)).toHaveCount(1);
  await expect(repos(page)).toContainText(/Macération\s:\s5\smin/);
});

/* À 320 px : chaque ligne de la frise, et non seulement la page, reste dans l'écran. */
for (const theme of ["light", "dark"]) {
  test(`320 px, thème ${theme} : aucune ligne de la frise ne touche le bord`, async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await preremplir(context, {
      carnet: {
        menu: ["gravlax-saumon-yaourt-bulgare", "salade-mediterraneenne", "beignets-brebis-menthe", "cocktail-concombre-menthe"].map((rid, i) => entree(rid, { k: "m" + i })),
        repas: { ...REPAS, heure: "12:00" }
      }
    });
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/#/menu");
    await expect(pendant(page)).toHaveCount(3);
    await expect(repos(page)).toHaveCount(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

    const debords = await page.locator(".frise").evaluate(frise => {
      const bord = document.documentElement.clientWidth - 12;
      const pas = [];
      for (const el of frise.querySelectorAll(".fr, .fr-txt, .fr-sub, .fr-txt b")) {
        const r = el.getBoundingClientRect();
        if (r.right > bord) pas.push(`${el.className || el.tagName} ${Math.round(r.right)}`);
        if (el.scrollWidth > el.clientWidth + 1) pas.push(`${el.className || el.tagName} déborde (${el.scrollWidth} > ${el.clientWidth})`);
      }
      return pas;
    });
    expect(debords).toEqual([]);
    // Le texte de la bulle est lisible : fond et texte assez contrastés.
    const contraste = await pendant(page).first().locator(".fr-txt").evaluate(el => {
      const lum = c => {
        const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const [a, b] = [lum(getComputedStyle(el).color), lum(getComputedStyle(el).backgroundColor)].sort((x, y) => y - x);
      return (a + 0.05) / (b + 0.05);
    });
    expect(contraste).toBeGreaterThan(4.5);
  });
}

/* ---------- Le journal à minuit passé : le jour se lit à Paris ---------- */

/* Le test d'origine bâtissait ses dates avec `new Date()` de Node (UTC) alors que
   le navigateur lit l'heure de Paris : entre minuit et deux heures, la veille.
   L'appli, elle, lit le jour local — on fige l'horloge de la page des deux côtés de minuit. */
for (const [heure, instant, aujourdhui, hier] of [
  ["0 h 30", "2026-06-15T22:30:00Z", "2026-06-16", "2026-06-15"],
  ["23 h 30", "2026-06-15T21:30:00Z", "2026-06-15", "2026-06-14"]
]) {
  test(`journal à ${heure} (heure de Paris) : « Aujourd'hui » et « Hier » suivent le jour de Paris`, async ({ page, context }) => {
    await page.clock.setFixedTime(new Date(instant));
    await preremplir(context, { carnet: { journal: [
      { id: "j1", rid: "quiche-lorraine", date: hier, convives: 2, note: "hier", photo: false },
      { id: "j2", rid: "quiche-lorraine", date: "2026-04-01", convives: 4, note: "ancienne", photo: false },
      { id: "j3", rid: "quiche-lorraine", date: aujourdhui, convives: 1, note: "ce soir", photo: false }
    ] } });
    await page.goto("/#/recette/quiche-lorraine");
    const lignes = page.locator(".jr-entree");
    await expect(lignes).toHaveCount(3);
    await expect(lignes.nth(0)).toContainText("Aujourd'hui");
    await expect(lignes.nth(0)).toContainText("ce soir");
    await expect(lignes.nth(1)).toContainText("Hier");
    await expect(lignes.nth(2)).toContainText("ancienne");
  });
}

test("revue : le repos de la salade n'annonce pas « Temps libre » quand le cocktail occupe les mains", async ({ page, context }) => {
  await preremplir(context, { carnet: menuDe("salade-mediterraneenne", "cocktail-concombre-menthe") });
  await page.goto("/#/menu");
  await expect(repos(page)).toHaveCount(1);
  await expect(repos(page)).toContainText(/15\smin,\sjusqu.à\s20\sh/);
  await expect(repos(page)).not.toContainText(/Temps libre|Mains libres/);
  // Le fil, lui, n'est pas en pointillés : les mains sont prises.
  await expect(repos(page)).not.toHaveClass(/fr-bas-libre/);
});
