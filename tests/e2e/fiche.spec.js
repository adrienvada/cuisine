/* La fiche recette : retour, allergènes, notes, feuille d'ingrédient, moule, impression. */

import { test, expect, preremplir, entree, lireCarnet } from "./outils.js";
import { animationsFinies } from "./outils-mesure.js";

const QUICHE = "/#/recette/quiche-lorraine";

/* Arriver sur la fiche « de l'intérieur », comme un doigt : l'adresse change sans rechargement,
   le routeur retient d'où l'on vient. */
const ouvrirDepuis = async (page, depuis, fiche = QUICHE) => {
  await page.goto("/" + depuis);
  await page.evaluate(h => { location.hash = h; }, fiche.replace("/", ""));
};

const retour = page => page.locator(".topbar a").first();

test.describe("flèche de retour", () => {
  test("fiche ouverte directement ou depuis l'accueil : « Recettes »", async ({ page }) => {
    await page.goto(QUICHE);
    await expect(retour(page)).toContainText("Recettes");
    await retour(page).click();
    await expect(page).toHaveURL(/#\/$/);
  });

  test("depuis le menu : « Au menu », et elle y ramène", async ({ page, context }) => {
    await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "m1" })] } });
    await ouvrirDepuis(page, "#/menu");
    await expect(retour(page)).toContainText("Au menu");
    await retour(page).click();
    await expect(page).toHaveURL(/#\/menu$/);
  });

  test("depuis les courses : « Courses »", async ({ page }) => {
    await ouvrirDepuis(page, "#/courses");
    await expect(retour(page)).toContainText("Courses");
    await retour(page).click();
    await expect(page).toHaveURL(/#\/courses$/);
  });

  test("depuis les savoirs : « Savoirs »", async ({ page }) => {
    await ouvrirDepuis(page, "#/fondamentaux");
    await expect(retour(page)).toContainText("Savoirs");
    await retour(page).click();
    await expect(page).toHaveURL(/#\/fondamentaux$/);
  });
});

test("une version au menu : la fiche dit « Tu composes la version » et porte ses portions", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "m1", portions: 4 })] } });
  await page.goto("/#/recette/quiche-lorraine/m/m1");
  await expect(page.locator("#p-val")).toHaveText("4 personnes");
  await expect(page.locator("#menu-info")).toContainText("Tu composes la version qui est au menu");
  // Les quantités suivent les 4 portions : 200 g de lardons pour 6 → 133 g.
  await expect(page.locator("#ing-list li", { hasText: "Lardons fumés" })).toContainText("133 g");
});

test("tutoiement : « Compose ta version »", async ({ page }) => {
  await page.goto("/#/recette/cake-sale");
  await expect(page.getByRole("heading", { name: "Compose ta version" })).toBeVisible();
});

test.describe("allergènes", () => {
  test("sous les temps : « Contient : 🌾 gluten · 🥚 œufs · 🥛 lait », avec la mention des étiquettes", async ({ page }) => {
    await page.goto(QUICHE);
    const ligne = page.locator("#allergenes");
    await expect(ligne).toContainText("Contient : 🌾 gluten · 🥚 œufs · 🥛 lait");
    await expect(ligne).toContainText("vérifie les étiquettes");
  });
});

test.describe("mes notes", () => {
  test("elles s'enregistrent seules, remontent en tête et survivent au rechargement", async ({ page }) => {
    await page.goto(QUICHE);
    await expect(page.locator("#note-perso-tete")).toBeHidden();
    await page.locator("#note-saisie").fill("Moins de muscade, plus de gruyère <b>vraiment</b>");
    await expect(page.locator("#note-etat")).toHaveText("Enregistré");

    const carnet = await lireCarnet(page);
    expect(carnet.notesPerso["quiche-lorraine"].txt).toBe("Moins de muscade, plus de gruyère <b>vraiment</b>");
    expect(carnet.notesPerso["quiche-lorraine"].at).toBeGreaterThan(0);

    await page.reload();
    await expect(page.locator("#note-saisie")).toHaveValue("Moins de muscade, plus de gruyère <b>vraiment</b>");
    // En tête de fiche, en texte brut : le balisage tapé ne s'exécute pas.
    await expect(page.locator("#note-perso-tete")).toContainText("Moins de muscade, plus de gruyère <b>vraiment</b>");
    await expect(page.locator("#note-perso-tete b")).toHaveCount(1);   // le seul <b> est le titre « Ma note »
  });

  test("effacer la note la retire de l'état et de la tête de fiche", async ({ page, context }) => {
    await preremplir(context, { carnet: { notesPerso: { "quiche-lorraine": { txt: "À refaire", at: 1 } } } });
    await page.goto(QUICHE);
    await expect(page.locator("#note-perso-tete")).toContainText("À refaire");
    await page.locator("#note-saisie").fill("");
    await page.locator("h1").click();   // la saisie perd le focus : la tête se redessine
    await expect(page.locator("#note-perso-tete")).toBeHidden();
    expect((await lireCarnet(page)).notesPerso["quiche-lorraine"]).toBeUndefined();
  });
});

test.describe("feuille d'ingrédient", () => {
  test("toucher une ligne l'ouvre : quantité, allergènes", async ({ page }) => {
    await page.goto(QUICHE);
    await page.locator("#ing-list li", { hasText: "Œufs" }).click();
    const feuille = page.getByRole("dialog");
    await expect(feuille).toBeVisible();
    await expect(feuille).toContainText("4");
    await expect(feuille).toContainText("pour 6 personnes");
    await expect(feuille).toContainText("Contient : 🥚 œufs");
  });

  test("J'en ai moins : 3 œufs règlent la quiche sur 4 personnes, « Annuler » la rétablit", async ({ page }) => {
    await page.goto(QUICHE);
    await page.locator("#ing-list li", { hasText: "Œufs" }).click();
    const feuille = page.getByRole("dialog");
    await feuille.getByLabel("Ce que tu as").fill("3");
    await expect(feuille.locator("#ing-resultat")).toContainText("4 personnes");
    await feuille.getByRole("button", { name: "Régler sur 4 personnes" }).click();
    await expect(feuille).toBeHidden();
    await expect(page.locator("#p-val")).toHaveText("4 personnes");
    // 3 œufs pour 4 personnes : jamais plus que ce qu'on a (4 œufs × 4/6 = 2⅔).
    await expect(page.locator("#toast")).toContainText("Recette réglée pour 4 personnes");

    await page.locator("#toast .toast-action").click();
    await expect(page.locator("#p-val")).toHaveText("6 personnes");
  });

  test("J'en ai moins : assez d'œufs, ou pas assez pour une portion, on le dit sans rien changer", async ({ page }) => {
    await page.goto(QUICHE);
    await page.locator("#ing-list li", { hasText: "Œufs" }).click();
    const feuille = page.getByRole("dialog");
    await feuille.getByLabel("Ce que tu as").fill("6");
    await expect(feuille.locator("#ing-resultat")).toContainText("Ça suffit déjà");
    await expect(feuille.locator("#ing-regler")).toBeDisabled();
    await feuille.getByLabel("Ce que tu as").fill("0,5");
    await expect(feuille.locator("#ing-resultat")).toContainText("pas pour une portion");
    await expect(feuille.locator("#ing-regler")).toBeDisabled();
  });

  test("substitutions : les lardons proposent des champignons, avec leur note", async ({ page }) => {
    await page.goto(QUICHE);
    await page.locator("#ing-list li", { hasText: "Lardons fumés" }).click();
    const feuille = page.getByRole("dialog");
    await expect(feuille).toContainText("À la place");
    await expect(feuille).toContainText("Champignons de Paris");
    await expect(feuille).toContainText("Version végétarienne");
  });

  test("sur une version au menu, le réglage porte sur l'entrée", async ({ page, context }) => {
    await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "m1", portions: 6 })] } });
    await page.goto("/#/recette/quiche-lorraine/m/m1");
    await page.locator("#ing-list li", { hasText: "Œufs" }).click();
    await page.getByRole("dialog").getByLabel("Ce que tu as").fill("2");
    await page.getByRole("dialog").getByRole("button", { name: /Régler sur/ }).click();
    await expect.poll(async () => (await lireCarnet(page)).menu[0].portions).toBe(3);
  });
});

test.describe("taille du moule", () => {
  test("« Ton moule : 26 cm », et un moule de 28 cm règle la recette pour 7", async ({ page }) => {
    await page.goto(QUICHE);
    await expect(page.locator("#moule-zone")).toContainText("Ton moule : 26 cm");
    await page.getByRole("button", { name: "Moule plus grand" }).click();
    await page.getByRole("button", { name: "Moule plus grand" }).click();
    await expect(page.locator("#moule-zone")).toContainText("Ton moule : 28 cm");
    await expect(page.locator("#moule-zone")).toContainText("moule de 28 cm → recette pour 7 personnes");
    await expect(page.locator("#p-val")).toHaveText("7 personnes");
  });

  test("régler les portions à la main fait suivre le moule affiché", async ({ page }) => {
    await page.goto(QUICHE);
    await page.getByRole("button", { name: "Plus de portions" }).click();   // 7 : le moule équivalent est de 28 cm
    await expect(page.locator("#moule-zone")).toContainText("Ton moule : 28 cm");
  });

  test("une recette sans moule n'a pas ce réglage", async ({ page }) => {
    await page.goto("/#/recette/focaccia-romarin");
    await expect(page.locator("#moule-zone")).toHaveCount(0);
  });
});

test.describe("impression", () => {
  test("le bouton « Imprimer » est dans la barre du haut, à côté de « Partager »", async ({ page }) => {
    await page.goto(QUICHE);
    await expect(page.locator(".topbar").getByRole("button", { name: "Imprimer" })).toBeVisible();
    await expect(page.locator(".topbar #share-recipe")).toBeVisible();
  });

  test("en mode impression : ni barres ni boutons, mais les ingrédients, les étapes et la note", async ({ page, context }) => {
    await preremplir(context, { carnet: { notesPerso: { "quiche-lorraine": { txt: "Servir tiède", at: 1 } } } });
    await page.goto(QUICHE);
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".topbar")).toBeHidden();
    await expect(page.locator(".tabbar")).toBeHidden();
    await expect(page.locator(".actions")).toBeHidden();
    await expect(page.locator(".section-notes")).toBeHidden();
    await expect(page.locator("#theme-toggle")).toBeHidden();
    await expect(page.locator("#ing-list")).toBeVisible();
    await expect(page.locator("#steps-list")).toBeVisible();
    await expect(page.locator("#note-perso-tete")).toContainText("Servir tiède");
    // La photo est réduite en bandeau.
    const haut = await page.locator(".hero .visual").evaluate(el => el.getBoundingClientRect().height);
    expect(haut).toBeLessThan(200);
  });

  test("en sombre, le papier reste blanc", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    await page.goto(QUICHE);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.emulateMedia({ media: "print" });
    // Le fond se fond en douceur d'un thème à l'autre : on attend qu'il ait fini.
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(255, 255, 255)");
  });
});

test.describe("mise en page téléphone", () => {
  test("375 px : rien ne déborde, héro de 240 px, actions sur une ligne de 44 px au moins", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(QUICHE);
    await expect(page.locator("#ing-list li").first()).toBeVisible();
    await animationsFinies(page);
    const m = await page.evaluate(() => {
      const r = s => document.querySelector(s).getBoundingClientRect();
      return {
        largeur: document.documentElement.scrollWidth,
        fenetre: window.innerWidth,
        hero: r(".hero .visual").height,
        ajouter: r("#add-list"), cuisiner: r(".actions .btn.primary"),
        topbar: [...document.querySelectorAll(".topbar .btn-icon")].map(e => e.getBoundingClientRect().height),
        ligne: r(".ing-ligne").height
      };
    });
    expect(m.largeur).toBeLessThanOrEqual(m.fenetre);
    expect(m.hero).toBeGreaterThanOrEqual(235);
    expect(m.hero).toBeLessThanOrEqual(245);
    expect(Math.abs(m.ajouter.top - m.cuisiner.top)).toBeLessThan(2);
    expect(m.ajouter.height).toBeGreaterThanOrEqual(44);
    expect(m.cuisiner.height).toBeGreaterThanOrEqual(44);
    for (const h of m.topbar) expect(h).toBeGreaterThanOrEqual(44);
    expect(m.ligne).toBeGreaterThanOrEqual(44);
  });

  test("375 px : la feuille d'ingrédient ne déborde pas non plus", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(QUICHE);
    await page.locator("#ing-list li", { hasText: "Lardons fumés" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const m = await page.evaluate(() => ({
      feuille: document.querySelector(".sheet").scrollWidth <= document.querySelector(".sheet").clientWidth,
      page: document.documentElement.scrollWidth <= window.innerWidth
    }));
    expect(m).toEqual({ feuille: true, page: true });
  });
});

test("journal : sans le module du journal, la section n'apparaît pas", async ({ page }) => {
  await page.route("**/js/vues/journal.js", route => route.fulfill({ status: 404, body: "" }));
  await page.goto(QUICHE);
  await expect(page.locator("#ing-list li").first()).toBeVisible();
  await expect(page.locator("#journal-zone")).toBeHidden();
});

test("journal : avec un module, la section est remplie par dessinerJournal(zone, r)", async ({ page }) => {
  await page.route("**/js/vues/journal.js", route => route.fulfill({
    status: 200,
    contentType: "text/javascript",
    body: "export const dessinerJournal = (zone, r) => { zone.innerHTML = '<h2>Journal de ' + r.id + '</h2>'; };"
  }));
  await page.goto(QUICHE);
  await expect(page.locator("#journal-zone")).toContainText("Journal de quiche-lorraine");
});

test("J'en ai moins : « 1/2 » se lit comme une demie, et « Annuler » après avoir quitté la fiche défait sans erreur", async ({ page }) => {
  const erreurs = [];
  page.on("pageerror", e => erreurs.push(e.message));
  await page.goto(QUICHE);
  await page.locator("#ing-list li", { hasText: "Œufs" }).click();
  const feuille = page.getByRole("dialog");
  await feuille.getByLabel("Ce que tu as").fill("1/2");
  await expect(feuille.locator("#ing-resultat")).toContainText("Ça ne suffit pas");
  await feuille.getByLabel("Ce que tu as").fill("3");
  await feuille.getByRole("button", { name: /Régler sur/ }).click();
  await page.evaluate(() => { location.hash = "#/courses"; });
  await page.locator("#toast .toast-action").click();
  expect(erreurs).toEqual([]);
  expect((await lireCarnet(page)).portions["quiche-lorraine"]).toBe(6);
});
