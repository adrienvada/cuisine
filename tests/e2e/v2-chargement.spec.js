/* Premier chargement et hors-ligne : feuilles non bloquantes, vignettes demandées
   tôt, service worker enregistré au repos, héros précachés, repli sans image cassée. */

import { test, expect } from "./outils.js";
import { serveurDeuxVersions } from "./outils-images.js";

const URL_VIGNETTE = /\/img\/v\/[^/]+\.webp$/;

test.describe("feuilles CSS", () => {
  test("celles des vues se chargent sans bloquer, puis s'appliquent toutes", async ({ page }) => {
    await page.goto("/");
    const liens = page.locator("link[rel=stylesheet][data-vue]");
    expect(await liens.count()).toBe(5);
    await expect.poll(() => liens.evaluateAll(ls => ls.map(l => l.media))).toEqual(Array(5).fill("all"));
    // Toutes les règles sont bien là : celles des vues comme celles de l'accueil.
    const sheets = await page.evaluate(() => [...document.styleSheets].map(s => s.href.split("/").pop() + ":" + (s.cssRules.length > 0)));
    expect(sheets.filter(s => s.endsWith(":false"))).toEqual([]);
  });

  test("lien profond : la fiche n'apparaît pas sans style", async ({ page }) => {
    await page.goto("/#/recette/quiche-lorraine");
    await expect(page.locator("h1")).toBeVisible();
    await expect.poll(() => page.locator("link[data-vue]").evaluateAll(ls => ls.every(l => l.media === "all"))).toBe(true);
    // Le héros est dessiné par fiche.css : 240 px de haut, pas la hauteur d'une image nue.
    expect(await page.locator(".hero .visual").evaluate(e => e.getBoundingClientRect().height)).toBe(240);
  });

  test("les vues hors accueil sont stylées : menu, courses, savoirs, cuisine", async ({ page }) => {
    await page.goto("/");
    await expect.poll(() => page.locator("link[data-vue]").evaluateAll(ls => ls.every(l => l.media === "all"))).toBe(true);
    for (const [route, regle] of [["#/menu", "menu.css"], ["#/courses", "courses.css"], ["#/fondamentaux", "savoirs.css"], ["#/recette/quiche-lorraine/cuisine/0", "cuisine.css"]]) {
      await page.evaluate(r => { location.hash = r; }, route);
      await expect(page.locator("#app > *").first()).toBeVisible();
      expect(await page.evaluate(n => [...document.styleSheets].some(s => s.href.endsWith(n) && s.cssRules.length > 0), regle)).toBe(true);
    }
  });
});

test.describe("vignettes de l'accueil", () => {
  test("les premières sont demandées avant même que main.js ait répondu", async ({ page }) => {
    const vues = [];
    let mainRepondu = 0;
    await page.route("**/js/main.js", async route => {
      await new Promise(r => setTimeout(r, 1200));
      mainRepondu = Date.now();
      await route.continue();
    });
    page.on("request", req => { if (URL_VIGNETTE.test(req.url())) vues.push({ url: req.url(), t: Date.now() }); });
    await page.goto("/");
    await expect(page.locator(".card").first()).toBeVisible();
    const avant = vues.filter(v => v.t < mainRepondu);
    expect(avant.length).toBe(4);
    // Les mêmes que celles des quatre premières cartes : rien de gaspillé.
    const cartes = await page.locator(".card .visual img").evaluateAll(is => is.slice(0, 4).map(i => i.src));
    expect(avant.map(v => v.url).sort()).toEqual(cartes.sort());
  });
});

test.describe("service worker", () => {
  test.use({ serviceWorkers: "allow" });

  test("il ne s'enregistre qu'au repos, après le premier affichage", async ({ page }) => {
    // Le navigateur n'est « au repos » que quand le test le décide.
    await page.addInitScript(() => {
      window.__repos = [];
      window.requestIdleCallback = cb => { window.__repos.push(cb); return 1; };
    });
    await page.goto("/");
    await expect(page.locator(".card").first()).toBeVisible();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => !!r))).toBe(false);
    await page.evaluate(() => window.__repos.forEach(cb => cb()));
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => !!r))).toBe(true);
  });

  test("hors ligne, une fiche jamais ouverte garde sa photo (héros précachés)", async ({ page }) => {
    const serveur = await serveurDeuxVersions();
    let ferme = false;
    try {
      await page.goto(serveur.url + "/");
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.reload();
      await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
      // Le précache des héros se fait au repos : on attend qu'il soit complet.
      await expect.poll(() => page.evaluate(async () => {
        const c = await caches.open("carnet-execution");
        return (await c.keys()).filter(r => r.url.includes("/img/h/")).length;
      }), { timeout: 30000 }).toBe(20);

      // Pas de page.context().setOffline : il ne coupe pas le service worker.
      await serveur.fermer();
      ferme = true;

      await page.evaluate(() => { location.hash = "#/recette/cake-sale"; });
      const photo = page.locator(".hero picture img");
      await expect(photo).toBeVisible();
      await expect.poll(() => photo.evaluate(i => i.complete && i.naturalWidth)).toBeGreaterThan(0);
    } finally {
      if (!ferme) await serveur.fermer();
    }
  });
});

test.describe("photo introuvable", () => {
  test("fiche : ni WebP ni JPEG, l'illustration remplace l'image cassée", async ({ page }) => {
    await page.route(/\/img\/(h\/)?focaccia-romarin\.(webp|jpg)$/, route => route.abort());
    await page.goto("/#/recette/focaccia-romarin");
    await expect(page.locator(".hero .visual svg").first()).toBeVisible();
    expect(await page.locator(".hero .visual img").count()).toBe(0);
    expect(await page.locator(".hero .visual picture").count()).toBe(0);
  });

  test("accueil : la carte retombe sur l'illustration de la recette, pas sur une image cassée", async ({ page }) => {
    await page.route(/\/img\/(v\/)?focaccia-romarin\.(webp|jpg)$/, route => route.abort());
    await page.goto("/");
    const carte = page.locator('.card[data-id="focaccia-romarin"] .visual');
    await expect(carte.locator("svg").first()).toBeVisible();
    expect(await carte.locator("img").count()).toBe(0);
  });

  test("sans illustration, l'emoji de la recette (texte, pas HTML)", async ({ page }) => {
    // Le cake salé n'a pas d'illustration dessinée.
    await page.route(/\/img\/(h\/)?cake-sale\.(webp|jpg)$/, route => route.abort());
    await page.goto("/#/recette/cake-sale");
    await expect(page.locator(".hero .visual")).toContainText("🍰");
    expect(await page.locator(".hero .visual img").count()).toBe(0);
  });
});
