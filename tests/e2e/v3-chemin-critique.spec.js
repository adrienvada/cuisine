/* Chemin critique de l'accueil : ce que la page demande avant de dessiner ses cartes,
   et les gestes qui doivent répondre même quand ce qu'on a reporté n'est pas encore là
   (réglages, partage), même sans réseau. Aucune durée absolue : on compare des ordres. */

import { test, expect, preremplir, pageStable } from "./outils.js";
import { serveurDeuxVersions } from "./outils-images.js";

/* Ce que l'accueil n'a pas le droit de demander avant son premier dessin. */
const INTERDITS_AVANT_CARTES = /\/(css\/(cuisine|menu|courses|savoirs|journal)\.css|js\/(substitutions|sync-config|sync|fondamentaux)\.js|js\/ui\/(minuteurs|partage)\.js|js\/vues\/(reglages|courses)\.js|js\/core\/(planning|cuisine)\.js)(\?|$)/;

/* L'instant (horloge de la page) où la première carte entre dans le DOM. */
const noterPremiereCarte = () => {
  const noter = () => { if (window.__cartes === undefined && document.querySelector(".card")) { window.__cartes = performance.now(); return true; } return false; };
  new MutationObserver((_, o) => { if (noter()) o.disconnect(); }).observe(document, { childList: true, subtree: true });
};

test.describe("avant les cartes", () => {
  test("l'accueil ne demande ni feuille de vue, ni module de vue, ni script de données inutile", async ({ page }) => {
    await page.addInitScript(noterPremiereCarte);
    await page.goto("/");
    await expect(page.locator(".card").first()).toBeVisible();
    const { cartes, demandes } = await page.evaluate(() => ({
      cartes: window.__cartes,
      demandes: performance.getEntriesByType("resource").map(r => ({ url: r.name, debut: r.startTime }))
    }));
    expect(cartes).toBeGreaterThan(0);
    const tropTot = demandes.filter(d => INTERDITS_AVANT_CARTES.test(d.url) && d.debut < cartes).map(d => d.url);
    expect(tropTot).toEqual([]);
  });

  test("les scripts et les feuilles reportés arrivent ensuite, sans qu'on les demande", async ({ page }) => {
    await page.goto("/");
    await expect.poll(() => page.evaluate(() => performance.getEntriesByType("resource").map(r => new URL(r.name).pathname)))
      .toEqual(expect.arrayContaining(["/css/menu.css", "/css/cuisine.css", "/js/substitutions.js", "/js/sync-config.js", "/js/vues/reglages.js"]));
  });

  test("les polices préchargées sont celles que l'accueil écrit : le bandeau et les titres des cartes", async ({ page }) => {
    await page.goto("/");
    const liens = await page.locator("link[rel=preload][as=font]").evaluateAll(ls => ls.map(l => new URL(l.href).pathname).sort());
    expect(liens).toEqual(["/fonts/caveat-titre.woff2", "/fonts/cormorant.woff2"]);
  });

  test("le bandeau est en Caveat Titre sur l'accueil seulement : Savoirs garde le Caveat complet", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText("Cuisine");
    expect(await page.locator("h1").evaluate(e => getComputedStyle(e).fontFamily)).toMatch(/^"Caveat Titre", Caveat/);
    expect(await page.locator(".byline").evaluate(e => getComputedStyle(e).fontFamily)).toMatch(/^"Caveat Titre", Caveat/);
    await page.evaluate(() => { location.hash = "#/fondamentaux"; });
    await expect(page.locator("h1")).toHaveText("Savoirs");
    // Caveat change de glyphes selon les lettres voisines : un mot à cheval sur deux fichiers ne serait plus le même.
    expect(await page.locator("h1").evaluate(e => getComputedStyle(e).fontFamily)).toMatch(/^Caveat,/);
    expect(await page.locator(".byline").evaluate(e => getComputedStyle(e).fontFamily)).toMatch(/^Caveat,/);
  });

  test("le premier dessin ne se fond pas, les suivants si", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#app")).toHaveClass(/premier-affichage/);
    expect(await page.locator(".masthead").evaluate(e => getComputedStyle(e).animationName)).toBe("none");
    await page.evaluate(() => { location.hash = "#/menu"; });
    await expect(page.locator("h1")).toHaveText("Au menu");
    await expect(page.locator("#app")).not.toHaveClass(/premier-affichage/);
  });
});

test.describe("gestes dont le module vient après", () => {
  test("Réglages répond au premier appui même si son module tarde : il le dit, puis s'ouvre", async ({ page }) => {
    await page.route("**/js/vues/reglages.js", async route => {
      await new Promise(r => setTimeout(r, 1500));
      await route.continue();
    });
    await page.goto("/");
    const bouton = page.getByRole("button", { name: /^Réglages/ });
    await bouton.click();
    await expect(bouton).toHaveAttribute("aria-busy", "true");
    await expect(page.getByRole("dialog", { name: "Réglages" })).toBeVisible();
    await expect(bouton).not.toHaveAttribute("aria-busy", "true");
  });

  test("Réglages : si le module ne vient pas, un message le dit, et un second appui réessaie", async ({ page }) => {
    // Deux échecs : le chargement au repos, puis le premier appui. Le second appui demande une adresse neuve.
    let tentatives = 0;
    await page.route("**/js/vues/reglages.js*", route => (++tentatives <= 2 ? route.abort() : route.continue()));
    await page.goto("/");
    await expect.poll(() => tentatives).toBe(1);
    const bouton = page.getByRole("button", { name: /^Réglages/ });
    await bouton.click();
    await expect(page.locator("#toast")).toContainText("Les réglages ne se sont pas chargés");
    await expect(bouton).not.toHaveAttribute("aria-busy", "true");
    await bouton.click();
    await expect(page.getByRole("dialog", { name: "Réglages" })).toBeVisible();
  });

  test("le bouton partager d'une carte marche même si le module de partage tarde", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.addInitScript(() => { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); });
    await page.route("**/js/ui/partage.js", async route => {
      await new Promise(r => setTimeout(r, 1200));
      await route.continue();
    });
    await page.goto("/");
    await page.locator('.card[data-id="quiche-lorraine"] .card-share').click();
    await expect(page.locator("#toast")).toHaveText("Recette copiée !");
    await expect(page).toHaveURL(/#\/$|\/$/);
  });

  test("sans minuteur en cours, le module des minuteurs ne se charge pas à l'ouverture ; avec un, la bulle est là", async ({ page, context }) => {
    const modules = [];
    page.on("request", r => { if (/\/js\/ui\/minuteurs\.js/.test(r.url())) modules.push(r.url()); });
    await page.goto("/");
    await pageStable(page);
    expect(modules).toEqual([]);

    const autre = await context.newPage();
    await preremplir(context, { carnet: { timers: [{
      id: "tmin1", rid: "quiche-lorraine", mk: null, step: 1, slot: null,
      label: "Cuisson à blanc", emoji: "🥧", end: Date.now() + 20 * 60000, total: 20, fired: false
    }] } });
    await autre.goto("/");
    await expect(autre.locator("#timer-tray .timer-pill")).toHaveCount(1);
  });
});

test.describe("sans réseau, service worker installé", () => {
  test.use({ serviceWorkers: "allow" });

  test("Réglages et une autre vue s'ouvrent depuis le cache", async ({ page }) => {
    const serveur = await serveurDeuxVersions();
    let ferme = false;
    try {
      await page.goto(serveur.url + "/");
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.reload();
      await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
      // Le précache de base est fait avant l'activation : tout ce que la page a reporté y est.
      await serveur.fermer();
      ferme = true;

      await page.reload();
      await expect(page.locator(".card").first()).toBeVisible();
      await page.getByRole("button", { name: /^Réglages/ }).click();
      await expect(page.getByRole("dialog", { name: "Réglages" })).toBeVisible();
      await page.keyboard.press("Escape");
      await page.evaluate(() => { location.hash = "#/menu"; });
      await expect(page.locator("h1")).toHaveText("Au menu");
      // Sa feuille est bien appliquée (elle a été demandée avec le module, depuis le cache).
      expect(await page.evaluate(() => [...document.styleSheets].some(s => s.href && s.href.endsWith("menu.css") && s.cssRules.length > 0))).toBe(true);
    } finally {
      if (!ferme) await serveur.fermer();
    }
  });
});
