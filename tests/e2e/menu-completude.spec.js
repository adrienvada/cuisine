/* Au menu, « Compléter le repas » : ce qui manque dans les assiettes (légumes, protéines,
   de quoi caler, fraîcheur) et les recettes du carnet qui le comblent, ajoutées d'un
   geste. Dans les deux modes de mouvement. */

import { test, expect, preremplir, entree, lireCarnet, pageStable } from "./outils.js";

const MENU = "/#/menu";
const quiche = [entree("quiche-lorraine", { k: "q1" })];

for (const reduit of [false, true]) {
  const mode = reduit ? "mouvement réduit" : "mouvement normal";

  test.describe(mode, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: reduit ? "reduce" : "no-preference" });
    });

    test("une quiche seule : il manque des légumes et de la fraîcheur, trois salades au plus le comblent", async ({ page, context }) => {
      await preremplir(context, { carnet: { menu: quiche } });
      await page.goto(MENU);
      const bloc = page.locator(".manques");
      await expect(bloc).toBeVisible();
      await expect(bloc.locator(".mq-phrase")).toHaveText("Il manque encore des légumes et un peu de fraîcheur pour alléger le repas.");
      const recos = bloc.locator(".mq-reco");
      expect(await recos.count()).toBeGreaterThan(0);
      expect(await recos.count()).toBeLessThanOrEqual(3);
      for (const titre of await bloc.locator(".mq-texte b").allTextContents()) expect(titre).toMatch(/^Salade/);
      await expect(recos.first().locator("small")).toHaveText("légumes · fraîcheur");
      // Le bloc vient avant les moments du repas, sous le même titre.
      const ordre = await page.evaluate(() => {
        const label = document.querySelector(".sq-label"), manques = document.querySelector(".manques"), sq = document.querySelector(".squelette");
        return label.compareDocumentPosition(manques) & Node.DOCUMENT_POSITION_FOLLOWING && manques.compareDocumentPosition(sq) & Node.DOCUMENT_POSITION_FOLLOWING;
      });
      expect(ordre).toBeTruthy();
    });

    test("« + » ajoute la recette au menu ; il ne manque plus rien ; « Annuler » la retire et le manque revient", async ({ page, context }) => {
      await preremplir(context, { carnet: { menu: quiche } });
      await page.goto(MENU);
      const ajout = page.locator(".mq-ajout").first();
      const titre = (await page.locator(".mq-texte b").first().textContent()).trim();
      await expect(ajout).toHaveAccessibleName(`Ajouter ${titre} au menu`);
      await ajout.click();
      // La quiche (1 h 07) reste la plus longue : elle ouvre la liste, la salade suit.
      await expect(page.locator(".menu-card h3")).toHaveText(["Quiche lorraine", titre]);
      await expect(page.locator(".manques:not([inert])")).toHaveCount(0);
      const rids = (await lireCarnet(page)).menu.map(e => e.rid);
      expect(rids).toHaveLength(2);
      expect(rids[1]).toMatch(/^salade-/);
      await page.getByRole("button", { name: "Annuler" }).click();
      await expect(page.locator(".menu-card")).toHaveCount(1);
      await expect(page.locator(".manques .mq-phrase")).toHaveText(/Il manque encore des légumes/);
      expect((await lireCarnet(page)).menu.map(e => e.rid)).toEqual(["quiche-lorraine"]);
    });

    test("une suggestion ouvre sa fiche ; « Ça me va comme ça » fait taire ces manques jusqu'au menu suivant", async ({ page, context }) => {
      await preremplir(context, { carnet: { menu: quiche } });
      await page.goto(MENU);
      await page.getByRole("button", { name: /Ça me va comme ça/ }).click();
      await expect(page.locator(".manques:not([inert])")).toHaveCount(0);
      await page.reload();
      await expect(page.locator(".menu-card")).toHaveCount(1);
      await expect(page.locator(".manques")).toHaveCount(0);
      // Un menu vidé, c'est un autre repas : les manques peuvent revenir.
      await page.locator(".mc-x").click();
      await expect(page.locator(".empty")).toBeVisible();
      await page.evaluate(() => { const c = JSON.parse(localStorage.getItem("carnet-cuisine-v1")); c.menu = [{ k: "q2", rid: "quiche-lorraine", choices: {}, addons: [], portions: null }]; localStorage.setItem("carnet-cuisine-v1", JSON.stringify(c)); });
      await page.reload();
      await expect(page.locator(".manques .mq-phrase")).toBeVisible();
      await page.locator(".mq-carte").first().click();
      await expect(page).toHaveURL(/#\/recette\/salade-/);
    });
  });
}

test("silence : un apéro de trois plats salés n'est pas encore un dîner", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: ["cake-sale", "torsades-pesto", "focaccia-romarin", "cocktail-concombre-menthe"].map((rid, i) => entree(rid, { k: `a${i}` })) } });
  await page.goto(MENU);
  await expect(page.locator(".menu-card")).toHaveCount(4);
  await expect(page.locator(".squelette")).toBeVisible();
  await expect(page.locator(".manques")).toHaveCount(0);
});

test("silence : la quiche et sa salade forment un repas complet", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" }), entree("salade-kale-pomme-oeuf", { k: "s1" })] } });
  await page.goto(MENU);
  await expect(page.locator(".menu-card")).toHaveCount(2);
  await expect(page.locator(".squelette")).toBeVisible();
  await expect(page.locator(".manques")).toHaveCount(0);
});

test("les allergènes des invités écartent une suggestion : sans lait, ni feta ni chèvre", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: quiche, repas: { convives: 6, heure: "20:00", date: "", exclus: ["lait"] } } });
  await page.goto(MENU);
  const titres = await page.locator(".mq-texte b").allTextContents();
  expect(titres.length).toBeGreaterThan(0);
  for (const t of titres) expect(t).not.toMatch(/feta|chèvre/i);
});

test("le bloc tient à 320 px, ses boutons font 44 px, sans débordement", async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await preremplir(context, { carnet: { menu: quiche } });
  await page.goto(MENU);
  await page.locator(".manques").scrollIntoViewIfNeeded();
  await pageStable(page);
  const mesures = await page.evaluate(() => ({
    deborde: document.documentElement.scrollWidth > innerWidth,
    boutons: [...document.querySelectorAll(".mq-ajout, .mq-taire")].map(b => Math.round(b.getBoundingClientRect().height))
  }));
  expect(mesures.deborde).toBe(false);
  for (const h of mesures.boutons) expect(h).toBeGreaterThanOrEqual(44);
});
