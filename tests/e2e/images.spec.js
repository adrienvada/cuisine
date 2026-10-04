/* Service worker (cache d'abord, mises à jour) et images légères. */

import { test, expect } from "./outils.js";
import { reseau } from "./outils.js";
import { serveurDeuxVersions, espionnerImages } from "./outils-images.js";

test.describe("images", () => {
  test("la grille ne charge que des .webp légers, jamais la photo entière", async ({ page }) => {
    const vues = espionnerImages(page);
    await page.goto("/");
    await expect(page.locator(".card")).toHaveCount(20);
    await page.waitForLoadState("networkidle");

    expect(vues.length).toBeGreaterThan(0);
    for (const v of vues) {
      expect(v.chemin, v.chemin).toMatch(/^img\/(v|c)\/.+\.webp$/);
      expect(v.status).toBe(200);
      expect(v.octets, `${v.chemin} : ${v.octets} o`).toBeLessThan(30 * 1024);
    }
    const poids = liste => liste.reduce((s, v) => s + v.octets, 0);
    // Le premier écran : les vignettes dont le haut est dans la fenêtre. Avant, chacune
    // téléchargeait la photo entière (70 à 160 Ko) : le premier écran pesait 351 Ko.
    const visibles = await page.$$eval(".card .visual img", (imgs, h) =>
      imgs.filter(i => i.getBoundingClientRect().top < h).map(i => new URL(i.currentSrc).pathname.replace(/^.*\/img\//, "img/")),
    844);
    expect(visibles.length).toBeGreaterThan(2);
    const premier = poids(vues.filter(v => visibles.includes(v.chemin)));
    expect(premier, `images du premier écran : ${Math.round(premier / 1024)} Ko`).toBeLessThan(100 * 1024);
    // La grille entière (20 vignettes) pèse moins que deux photos d'avant.
    expect(poids(vues), `grille entière : ${Math.round(poids(vues) / 1024)} Ko`).toBeLessThan(300 * 1024);
  });

  test("les vignettes affichées ne sont plus zoomées par le CSS", async ({ page }) => {
    await page.goto("/");
    const img = page.locator(".card .visual img").first();
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate(i => i.complete && i.naturalWidth)).toBeGreaterThan(0);
    expect(await img.evaluate(i => getComputedStyle(i).transform)).toBe("none");
    expect(await img.getAttribute("width")).toBeTruthy();
    expect(await img.getAttribute("height")).toBeTruthy();
  });

  test("variante absente : la vignette retombe sur le JPEG, zoomé", async ({ page }) => {
    await page.route("**/img/v/focaccia-romarin.webp", route => route.fulfill({ status: 404, body: "" }));
    await page.goto("/");
    const img = page.locator('.card .visual img[data-secours$="focaccia-romarin.jpg"], .card .visual img[src$="img/focaccia-romarin.jpg"]').first();
    await expect(img).toHaveAttribute("src", /img\/focaccia-romarin\.jpg$/);
    await expect(img).toHaveClass(/zoom/);
    await expect.poll(() => img.evaluate(i => i.complete && i.naturalWidth)).toBeGreaterThan(0);
    expect(await img.evaluate(i => getComputedStyle(i).transform)).not.toBe("none");
  });

  test("héro : <picture> WebP, et le JPEG en secours si la variante manque", async ({ page }) => {
    await page.goto("/#/recette/focaccia-romarin");
    const img = page.locator(".hero picture img");
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate(i => i.currentSrc)).toMatch(/img\/h\/focaccia-romarin\.webp$/);
    await expect(page.locator(".hero picture source")).toHaveAttribute("type", "image/webp");

    const autre = await page.context().newPage();
    await autre.route("**/img/h/focaccia-romarin.webp", route => route.fulfill({ status: 404, body: "" }));
    await autre.goto("/#/recette/focaccia-romarin");
    const secours = autre.locator(".hero picture img");
    await expect.poll(() => secours.evaluate(i => i.currentSrc)).toMatch(/img\/focaccia-romarin\.jpg$/);
    await expect.poll(() => secours.evaluate(i => i.complete && i.naturalWidth)).toBeGreaterThan(0);
  });

  test("carte du menu : variante carrée, sans zoom", async ({ page, context }) => {
    await context.addInitScript(() => {
      try {
        if (sessionStorage.getItem("__p")) return;
        sessionStorage.setItem("__p", "1");
        localStorage.setItem("carnet-cuisine-v1", JSON.stringify({ menu: [{ k: "t1", rid: "quiche-lorraine", choices: {}, addons: [], portions: null }] }));
      } catch {}
    });
    await page.goto("/#/menu");
    const img = page.locator(".mc-visual img").first();
    await expect(img).toHaveAttribute("src", /img\/c\/quiche-lorraine\.webp$/);
    expect(await img.evaluate(i => getComputedStyle(i).transform)).toBe("none");
  });
});

test.describe("service worker", () => {
  test.use({ serviceWorkers: "allow" });

  test("cache d'abord : 3 s de latence réseau, la liste s'affiche sans les attendre", async ({ page, baseURL }) => {
    try {
      await page.goto("/");
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.reload();
      await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
      await expect(page.locator(".card").first()).toBeVisible();

      await reseau(baseURL, { latence: 3000 });
      const debut = Date.now();
      await page.reload();
      await expect(page.locator(".card").first()).toBeVisible({ timeout: 2500 });
      expect(Date.now() - debut).toBeLessThan(2500);
    } finally {
      await reseau(baseURL);
    }
  });

  test("seules les réponses ok entrent en cache (pas les 404)", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

    const statut = await page.evaluate(async () => (await fetch("img/v/inexistante.webp")).status);
    expect(statut).toBe(404);
    const enCache = await page.evaluate(async () => {
      const urls = [];
      for (const nom of await caches.keys()) for (const r of await (await caches.open(nom)).keys()) urls.push(r.url);
      return urls.filter(u => u.includes("inexistante"));
    });
    expect(enCache).toEqual([]);
  });

  test("hors ligne, une image déjà vue reste servie depuis le cache", async ({ page, baseURL }) => {
    try {
      await page.goto("/#/recette/quiche-lorraine");
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.reload();
      await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
      await expect.poll(() => page.locator(".hero picture img").evaluate(i => i.complete && i.naturalWidth)).toBeGreaterThan(0);
      // Laisse le temps à la copie en cache d'être rangée.
      await expect.poll(() => page.evaluate(async () => !!(await caches.match("img/h/quiche-lorraine.webp")))).toBe(true);

      await reseau(baseURL, { bloque: true });
      const octets = await page.evaluate(async () => (await (await fetch("img/h/quiche-lorraine.webp")).blob()).size);
      expect(octets).toBeGreaterThan(1000);
    } finally {
      await reseau(baseURL);
    }
  });

  test("mise à jour : « Nouvelle version — Recharger » active la nouvelle version et recharge", async ({ page }) => {
    const serveur = await serveurDeuxVersions();
    try {
      await page.goto(serveur.url + "/");
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.reload();
      await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
      await expect(page.locator(".card").first()).toBeVisible();
      expect(await page.evaluate(() => caches.keys())).toContain("carnet-cuisine-test-v1");
      await expect(page.locator("#toast")).toBeHidden();

      // La version 2 est publiée ; l'appli la découvre au retour sur la page.
      serveur.version = "v2";
      await page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));

      const toast = page.locator("#toast");
      await expect(toast).toBeVisible();
      await expect(toast).toContainText("Nouvelle version");
      // L'ancienne version tient toujours la page : rien n'est remplacé en silence.
      expect(await page.evaluate(() => caches.keys())).toContain("carnet-cuisine-test-v1");
      await page.evaluate(() => { window.__ancien = true; });

      await toast.getByRole("button", { name: "Recharger" }).click();
      await expect.poll(
        () => page.evaluate(() => !window.__ancien && !!document.querySelector("#app .card")).catch(() => false)
      ).toBe(true);
      await expect.poll(() => page.evaluate(() => caches.keys())).toEqual(expect.arrayContaining(["carnet-cuisine-test-v2"]));
      expect(await page.evaluate(() => caches.keys())).not.toContain("carnet-cuisine-test-v1");
    } finally {
      await serveur.fermer();
    }
  });

  test("la nouvelle version est reproposée au retour sur la page si un autre message a recouvert le toast", async ({ page }) => {
    const serveur = await serveurDeuxVersions();
    try {
      await page.goto(serveur.url + "/");
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.reload();
      await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
      serveur.version = "v2";
      await page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
      await expect(page.locator("#toast")).toContainText("Nouvelle version");

      await page.evaluate(() => { document.getElementById("toast").hidden = true; });
      await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
      await expect(page.locator("#toast").getByRole("button", { name: "Recharger" })).toBeVisible();
    } finally {
      await serveur.fermer();
    }
  });

  test("une vignette de la version courante passe avant une copie d'exécution plus ancienne", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    const taille = await page.evaluate(async () => {
      const chemin = "img/v/quiche-lorraine.webp";
      await (await caches.open("carnet-execution")).put(chemin, new Response("vieux", { headers: { "Content-Type": "image/webp" } }));
      return (await (await fetch(chemin)).blob()).size;
    });
    expect(taille).toBeGreaterThan(1000);
  });

  test("premier chargement : aucune « Nouvelle version » proposée", async ({ page }) => {
    const serveur = await serveurDeuxVersions();
    try {
      await page.goto(serveur.url + "/");
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.waitForTimeout(500);
      await expect(page.locator("#toast")).toBeHidden();
    } finally {
      await serveur.fermer();
    }
  });
});
