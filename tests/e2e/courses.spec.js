/* L'onglet Courses : panier, placard, ordre des rayons, provenance, annulations. */

import { test, expect, preremplir, entree, lireCarnet, cochesAffichees } from "./outils.js";
import { annuler, basculer, contraste, ligneDe, titresRayons } from "./outils-courses.js";
import { animationsFinies } from "./outils-mesure.js";

const MENU_DEUX = [entree("focaccia-romarin", { k: "f1" }), entree("cake-sale", { k: "c1" })];

test("le menu tient en une ligne, avec un lien pour le modifier", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: MENU_DEUX } });
  await page.goto("/#/courses");

  const ligne = page.locator(".menu-ligne");
  await expect(ligne).toContainText("2 recettes au menu");
  await expect(ligne.getByRole("link", { name: "Modifier" })).toHaveAttribute("href", "#/menu");
  await expect(page.locator(".menu-chip")).toHaveCount(0);
});

test("le panier : un article coché descend, la progression avance, décocher le fait remonter", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })] } });
  await page.goto("/#/courses");

  const total = await page.locator("section.rayon:not(.placard) input[data-key]").count();
  await expect(page.locator(".avance-txt")).toHaveText(`0 / ${total}`);
  await expect(page.locator(".panier")).toHaveCount(0);

  await basculer(page, "lardons");
  await expect(page.locator(".avance-txt")).toHaveText(`1 / ${total}`);
  await expect(page.locator(".avance")).toHaveAttribute("aria-valuenow", "1");
  const panier = page.locator("details.panier");
  await expect(panier.locator("summary")).toHaveText("Dans le panier (1)");
  // Replié par défaut : l'article n'est plus dans son rayon, et la coche reste enregistrée.
  await expect(panier).not.toHaveAttribute("open", "");
  await expect(page.locator("section.rayon:not(.placard) li", { hasText: "Lardons fumés" })).toHaveCount(0);
  expect(await cochesAffichees(page)).toEqual(["lardons"]);

  await panier.locator("summary").click();
  await expect(panier.locator("li", { hasText: "Lardons fumés" })).toBeVisible();
  await panier.locator('input[data-key="lardons"] + .tick').click();

  await expect(page.locator(".panier")).toHaveCount(0);
  await expect(page.locator("section.rayon", { has: page.getByRole("heading", { name: "Boucherie & charcuterie" }) }))
    .toContainText("Lardons fumés");
  await expect(page.locator(".avance-txt")).toHaveText(`0 / ${total}`);
});

test("le panier se replie et garde son état d'un dessin à l'autre", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })] } });
  await page.goto("/#/courses");
  await basculer(page, "lardons");
  await page.locator("details.panier summary").click();
  await basculer(page, "oeufs");
  await expect(page.locator("details.panier summary")).toHaveText("Dans le panier (2)");
  await expect(page.locator("details.panier")).toHaveAttribute("open", "");
});

test("sans animation demandée, l'article change de bloc aussitôt", async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })] } });
  await page.goto("/#/courses");
  await ligneDe(page, "lardons").locator(".tick").click();
  await expect(page.locator("details.panier summary")).toHaveText("Dans le panier (1)");
  await expect(page.locator(".art.part")).toHaveCount(0);
});

test("tout est coché : la liste le dit", async ({ page, context }) => {
  await preremplir(context, { carnet: { extras: [{ id: "e1", name: "Éponges" }] } });
  await page.goto("/#/courses");
  await basculer(page, "x-e1");
  await expect(page.locator(".fini")).toHaveText("Tout est dans le panier.");
  await expect(page.locator(".avance-txt")).toHaveText("1 / 1");
});

test("le placard : à part, hors du badge, hors du panier", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("focaccia-romarin", { k: "f1" })] } });
  await page.goto("/#/courses");

  const placard = page.locator("section.placard");
  await expect(placard.getByRole("heading", { name: "À vérifier au placard" })).toBeVisible();
  await expect(placard.locator('input[data-key="sel-fin"]')).toHaveCount(1);
  await expect(placard.locator('input[data-key="huile-olive"]')).toHaveCount(1);
  // Il vient après les rayons.
  const ordre = await page.locator("section.rayon > h2").allTextContents();
  expect(ordre.at(-1)).toBe("À vérifier au placard");
  // Le badge ne compte que ce qu'il reste à acheter : farine de pain, romarin et levure, ni sel ni huile.
  await expect(page.locator("#cart-badge")).toHaveText("3");

  await basculer(page, "sel-fin");
  await expect(page.locator("#cart-badge")).toHaveText("3");
  // Coché, il reste dans le placard au lieu de partir au panier.
  await expect(placard.locator('li.cochee input[data-key="sel-fin"]')).toHaveCount(1);
  await expect(page.locator(".panier")).toHaveCount(0);
  await expect(page.locator(".avance-txt")).toHaveText("0 / 3");

  await basculer(page, "romarin");
  await expect(page.locator("#cart-badge")).toHaveText("2");
});

test("le partage met le placard dans une section « À vérifier »", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("focaccia-romarin", { k: "f1" })] } });
  await page.addInitScript(() => {
    window.__partage = null;
    navigator.share = async d => { window.__partage = d.text; };
    navigator.canShare = () => true;
  });
  await page.goto("/#/courses");
  await page.getByRole("button", { name: "Partager la liste" }).click();
  await expect.poll(() => page.evaluate(() => window.__partage)).not.toBeNull();
  const texte = await page.evaluate(() => window.__partage);
  expect(texte).toContain("À VÉRIFIER");
  const [avant, apres] = texte.split("À VÉRIFIER");
  expect(apres).toContain("Sel fin");
  expect(avant).not.toContain("Sel fin");
  expect(avant).toContain("Levure");
  expect(avant).toContain("Farine de blé T65");     // la farine du pain s'achète, elle n'est pas au placard
});

test("ranger les rayons : monter, descendre, « Autre » reste en dernier, l'ordre est retenu", async ({ page, context }) => {
  await preremplir(context, {
    carnet: { menu: [entree("quiche-lorraine", { k: "q1" })], extras: [{ id: "e1", name: "Éponges" }] }
  });
  await page.goto("/#/courses");

  const avant = await titresRayons(page);
  expect(avant.length).toBeGreaterThanOrEqual(3);
  expect(avant.at(-1)).toBe("Autre");

  await page.getByRole("button", { name: "Ranger les rayons" }).click();
  await expect(page.getByRole("heading", { name: "Ranger les rayons" })).toBeVisible();
  // Le premier ne monte pas, « Autre » n'a pas de bouton.
  await expect(page.getByRole("button", { name: `Monter ${avant[0]}` })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Autre/ })).toHaveCount(0);

  await page.getByRole("button", { name: `Descendre ${avant[0]}` }).click();
  await page.getByRole("button", { name: `Monter ${avant[2]}` }).click();
  await page.getByRole("button", { name: "Terminé" }).click();

  const apres = await titresRayons(page);
  expect(apres.at(-1)).toBe("Autre");
  expect(apres.slice(0, 3)).toEqual([avant[1], avant[2], avant[0]]);

  const carnet = await lireCarnet(page);
  expect(carnet.ordreRayons.at(-1)).toBe("Autre");
  expect(carnet.ordreRayons.indexOf(avant[1])).toBeLessThan(carnet.ordreRayons.indexOf(avant[0]));

  await page.reload();
  expect((await titresRayons(page)).slice(0, 3)).toEqual([avant[1], avant[2], avant[0]]);
});

test("ranger les rayons : « Remettre l'ordre d'origine »", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })] } });
  await page.goto("/#/courses");
  const avant = await titresRayons(page);
  await page.getByRole("button", { name: "Ranger les rayons" }).click();
  await page.getByRole("button", { name: `Descendre ${avant[0]}` }).click();
  await page.getByRole("button", { name: "Remettre l'ordre d'origine" }).click();
  await page.getByRole("button", { name: "Terminé" }).click();
  expect(await titresRayons(page)).toEqual(avant);
  expect((await lireCarnet(page)).ordreRayons).toEqual([]);   // « aucune préférence » : un tableau vide, qui se synchronise
});

test("un rayon absent de l'ordre enregistré se place selon l'ordre d'origine", async ({ page, context }) => {
  // Un ordre enregistré quand ces rayons n'avaient pas encore d'article : il ne connaît que la Crèmerie.
  await preremplir(context, {
    carnet: {
      menu: [entree("quiche-lorraine", { k: "q1" })],
      ordreRayons: ["Crèmerie & œufs", "Autre"]
    }
  });
  await page.goto("/#/courses");
  const titres = await titresRayons(page);
  // Boucherie n'a aucun prédécesseur connu de l'ordre : elle passe en tête ; Fromages suit la Crèmerie.
  expect(titres).toEqual(["Boucherie & charcuterie", "Crèmerie & œufs", "Fromages"]);
});

test("pour quoi ? : toucher le nom déplie la provenance, recette par recette", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("scoopable-cookies", { k: "k1" }), entree("cake-sale", { k: "c1" })] } });
  await page.goto("/#/courses");

  const ligne = ligneDe(page, "farine");
  const origine = ligne.locator(".origine");
  await expect(origine).toBeHidden();
  await ligne.locator(".nom").click();
  await expect(origine).toBeVisible();
  await expect(origine).toContainText("Scoopable cookies (cookies à la cuillère) — 160 g");
  await expect(origine).toContainText("Cake salé — 150 g");
  await expect(ligne.locator(".cqty")).toHaveText("310 g");
  // Toucher le nom ne coche pas.
  expect(await cochesAffichees(page)).toEqual([]);

  await ligne.locator(".nom").click();
  await expect(origine).toBeHidden();
});

test("tout décocher, et l'annulation", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })] } });
  await page.goto("/#/courses");
  await expect(page.getByRole("button", { name: "Tout décocher" })).toHaveCount(0);

  await basculer(page, "lardons");
  await basculer(page, "oeufs");
  expect((await cochesAffichees(page)).sort()).toEqual(["lardons", "oeufs"]);

  await page.getByRole("button", { name: "Tout décocher" }).click();
  expect(await cochesAffichees(page)).toEqual([]);
  expect((await lireCarnet(page)).checked).toEqual({});
  await expect(page.getByRole("button", { name: "Tout décocher" })).toHaveCount(0);

  await annuler(page);
  expect((await cochesAffichees(page)).sort()).toEqual(["lardons", "oeufs"]);
  expect(Object.keys((await lireCarnet(page)).checked).sort()).toEqual(["lardons", "oeufs"]);
});

test("une coche disparaît avec l'article, une coche d'article libre reste tant qu'il existe", async ({ page, context }) => {
  await preremplir(context, {
    carnet: {
      menu: [entree("quiche-lorraine", { k: "q1" }), entree("focaccia-romarin", { k: "f1" })],
      extras: [{ id: "e1", name: "Éponges" }],
      checked: { lardons: true, levure: true, "x-e1": true }
    }
  });
  await page.goto("/#/menu");
  await page.getByRole("button", { name: "Retirer du menu" }).first().click();
  await page.getByRole("button", { name: "Retirer du menu" }).first().click();
  await expect(page.locator(".menu-card")).toHaveCount(0);

  const carnet = await lireCarnet(page);
  expect(carnet.checked).toEqual({ "x-e1": true });
});

test("vider la liste : aussitôt, sans confirmation, et « Annuler » rend tout", async ({ page, context }) => {
  await preremplir(context, {
    carnet: {
      menu: [entree("quiche-lorraine", { k: "q1" })],
      extras: [{ id: "e1", name: "Éponges" }],
      checked: { lardons: true }
    }
  });
  let dialogue = false;
  page.on("dialog", d => { dialogue = true; d.dismiss(); });
  await page.goto("/#/courses");

  await page.getByRole("button", { name: "Vider la liste" }).click();
  await expect(page.locator("#app")).toContainText("Ta liste est vide");
  expect(dialogue).toBe(false);
  await expect(page.locator("#menu-badge")).toBeHidden();
  let carnet = await lireCarnet(page);
  expect(carnet.menu).toEqual([]);
  expect(carnet.extras).toEqual([]);
  expect(carnet.checked).toEqual({});

  await annuler(page);
  await expect(page.locator("li", { hasText: "Éponges" })).toBeVisible();
  await expect(page.locator("#menu-badge")).toHaveText("1");
  expect(await cochesAffichees(page)).toEqual(["lardons"]);
  carnet = await lireCarnet(page);
  expect(carnet.menu).toHaveLength(1);
  expect(carnet.menu[0].rid).toBe("quiche-lorraine");
  expect(carnet.extras).toEqual([{ id: "e1", name: "Éponges" }]);
  expect(carnet.checked).toEqual({ lardons: true });
});

test("supprimer un article libre : aussitôt, et « Annuler » le rend avec sa coche", async ({ page, context }) => {
  await preremplir(context, {
    carnet: { extras: [{ id: "e1", name: "Éponges" }, { id: "e2", name: "Glaçons" }], checked: { "x-e1": true } }
  });
  let dialogue = false;
  page.on("dialog", d => { dialogue = true; d.dismiss(); });
  await page.goto("/#/courses");

  await page.locator("details.panier summary").click();   // Éponges est cochée : elle est au panier
  await page.getByRole("button", { name: "Supprimer Éponges" }).click();
  await expect(page.locator("li.art", { hasText: "Éponges" })).toHaveCount(0);
  expect(dialogue).toBe(false);
  expect((await lireCarnet(page)).extras).toEqual([{ id: "e2", name: "Glaçons" }]);

  await annuler(page);
  await expect(page.locator("li.art", { hasText: "Éponges" })).toHaveCount(1);
  const carnet = await lireCarnet(page);
  expect(carnet.extras.map(x => x.id)).toEqual(["e1", "e2"]);
  expect(carnet.checked).toEqual({ "x-e1": true });
});

test("un article libre est affiché comme du texte, jamais comme du balisage", async ({ page, context }) => {
  await preremplir(context, { carnet: {} });
  await page.goto("/#/courses");
  const piege = '<img src=x onerror="window.__pwn=1"> & "guillemets"';
  await page.locator("#extra-input").fill(piege);
  await page.locator("#extra-input").press("Enter");
  await expect(page.locator("li.art .nom")).toHaveText(piege);
  await expect(page.locator("li.art img")).toHaveCount(0);
  expect(await page.evaluate(() => window.__pwn)).toBeUndefined();
});

for (const theme of ["clair", "sombre"]) {
  test(`les cases se voient (${theme}) : rondes, 26 px, contour à 3:1 au moins, aucun débordement à 375 px`, async ({ page, context }) => {
    await preremplir(context, {
      carnet: { menu: MENU_DEUX, checked: { lardons: true }, extras: [{ id: "e1", name: "Éponges" }] }
    });
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/#/courses");
    if (theme === "sombre") await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    // Le fond passe au sombre en 0,2 s : lu pendant la transition, le contraste est faux.
    await expect(ligneDe(page, "farine")).toBeVisible();
    await animationsFinies(page);

    const tick = ligneDe(page, "farine").locator(".tick");
    const boite = await tick.boundingBox();
    expect(Math.round(boite.width)).toBe(26);
    expect(Math.round(boite.height)).toBe(26);

    // Couleurs relues jusqu'à la fin de la transition du thème.
    const couleurs = () => tick.evaluate(el => {
      const s = getComputedStyle(el);
      return { bord: s.borderTopColor, fond: s.backgroundColor, papier: getComputedStyle(document.body).backgroundColor };
    });
    await expect.poll(async () => { const c = await couleurs(); return contraste(c.bord, c.fond); }).toBeGreaterThanOrEqual(3);
    await expect.poll(async () => { const c = await couleurs(); return contraste(c.bord, c.papier); }).toBeGreaterThanOrEqual(3);

    // Une zone de contact d'au moins 44 px pour la ligne, le nom, la croix et les boutons.
    const hauteur = loc => async () => (await loc.boundingBox()).height;
    for (const loc of [ligneDe(page, "farine").locator("label"), ligneDe(page, "x-e1").locator(".x"), page.getByRole("button", { name: "Ranger les rayons" })]) {
      await expect.poll(hauteur(loc)).toBeGreaterThanOrEqual(44);
    }
    await expect.poll(hauteur(ligneDe(page, "farine").locator(".nom"))).toBeGreaterThanOrEqual(44);

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test("la case se coche au clavier (elle reste dans la page, invisible)", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("focaccia-romarin", { k: "f1" })], checked: { farine: true } } });
  await page.goto("/#/courses");
  // La case est dans la page (focalisable), pas retirée de l'affichage.
  const caseHuile = page.locator('input[data-key="huile-olive"]');
  await caseHuile.focus();
  await page.keyboard.press("Space");
  expect((await lireCarnet(page)).checked["huile-olive"]).toBe(true);
});
