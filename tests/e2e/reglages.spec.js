/* Réglages & design : le bouton de l'accueil, le thème, la feuille du carnet partagé,
   l'export et l'import, la persistance du stockage et le focus des feuilles. */

import { readFile } from "node:fs/promises";
import { test, expect, entree, lireCarnet, preremplir, pageStable } from "./outils.js";
import { espionnerPersistance, simulerCarnetSync, themeAffiche } from "./outils-reglages.js";

const ouvrirReglages = async page => {
  await page.getByRole("button", { name: /^Réglages/ }).click();
  const feuille = page.getByRole("dialog", { name: "Réglages" });
  await expect(feuille).toBeVisible();
  return feuille;
};

/* ---------- Le bouton, dans l'en-tête ---------- */

test("accueil : plus de bouton flottant, « Réglages » défile avec la page", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#theme-toggle, #sync-btn")).toHaveCount(0);

  const bouton = page.getByRole("button", { name: /^Réglages/ });
  await expect(bouton).toBeVisible();
  expect(await bouton.evaluate(el => getComputedStyle(el).position)).toBe("absolute");
  await pageStable(page);
  const boite = await bouton.boundingBox();
  expect(boite.width).toBeGreaterThanOrEqual(44);
  expect(boite.height).toBeGreaterThanOrEqual(44);

  const avant = (await bouton.boundingBox()).y;
  await page.evaluate(() => window.scrollBy(0, 160));
  // Il est parti avec la page (on attend que le défilement soit appliqué).
  await expect.poll(async () => (await bouton.boundingBox()).y).toBeLessThan(avant - 100);
});

test("accueil : aucun débordement horizontal à 375 px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: /^Réglages/ })).toBeVisible();
  const deborde = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(deborde).toBe(false);
});

test("accueil : le point du bouton suit l'état de la synchro", async ({ page, context }) => {
  await simulerCarnetSync(context, { etat: "off" });
  await page.goto("/");
  const bouton = page.getByRole("button", { name: /^Réglages/ });
  const point = bouton.locator(".reglages-point");
  const visible = () => point.evaluate(el => getComputedStyle(el).display !== "none");

  await expect(bouton).toHaveAttribute("data-sync", "off");
  expect(await visible()).toBe(false);                 // rien si non connecté

  await page.evaluate(() => window.__carnetSyncSimule.changer("ok"));
  await expect(bouton).toHaveAttribute("data-sync", "ok");
  expect(await visible()).toBe(true);
  expect(await point.evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgb(66, 96, 58)");   // le vert du carnet
  await expect(bouton).toHaveAccessibleName(/connecté/);

  await page.evaluate(() => window.__carnetSyncSimule.changer("hors"));
  await expect(bouton).toHaveAttribute("data-sync", "hors");
  expect(await point.evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgb(193, 145, 63)");   // le doré
  await expect(bouton).toHaveAccessibleName(/hors ligne/);
});

/* ---------- Thème ---------- */

test("thème : Automatique suit le système, même quand il change en cours de route", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  expect(await themeAffiche(page)).toBe("clair");

  const feuille = await ouvrirReglages(page);
  await expect(feuille.getByRole("button", { name: "Automatique" })).toHaveAttribute("aria-pressed", "true");

  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(() => themeAffiche(page)).toBe("sombre");
  await page.emulateMedia({ colorScheme: "light" });
  await expect.poll(() => themeAffiche(page)).toBe("clair");
});

test("thème : Clair et Sombre sont des choix fermes, que le système ne défait pas", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const feuille = await ouvrirReglages(page);

  await feuille.getByRole("button", { name: "Sombre" }).click();
  /* La bascule se fait en cercle (transition de vue) : le thème est posé à l'image suivante. */
  await expect.poll(() => themeAffiche(page)).toBe("sombre");
  await expect(feuille.getByRole("button", { name: "Sombre" })).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");

  await page.emulateMedia({ colorScheme: "dark" });
  await page.emulateMedia({ colorScheme: "light" });
  expect(await themeAffiche(page)).toBe("sombre");     // choix explicite : le système n'y change rien

  await feuille.getByRole("button", { name: "Clair" }).click();
  await expect.poll(() => themeAffiche(page)).toBe("clair");
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("light");
  await page.emulateMedia({ colorScheme: "dark" });
  expect(await themeAffiche(page)).toBe("clair");

  await feuille.getByRole("button", { name: "Automatique" }).click();
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBeNull();
  await expect.poll(() => themeAffiche(page)).toBe("sombre");     // le système est sombre : Automatique le rejoint
});

test("thème : le choix survit au rechargement, sans éclair du mauvais thème", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const feuille = await ouvrirReglages(page);
  await feuille.getByRole("button", { name: "Sombre" }).click();

  /* Le script en ligne d'index.html pose le thème avant même le premier rendu. */
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      window.__themeAuDemarrage = document.documentElement.getAttribute("data-theme");
    });
  });
  await page.reload();
  expect(await page.evaluate(() => window.__themeAuDemarrage)).toBe("dark");
});

test("thème : une ancienne valeur inconnue en stockage vaut Automatique", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => localStorage.setItem("theme", "auto"));
  await page.goto("/");
  expect(await themeAffiche(page)).toBe("sombre");
  const feuille = await ouvrirReglages(page);
  await expect(feuille.getByRole("button", { name: "Automatique" })).toHaveAttribute("aria-pressed", "true");
});

/* ---------- Carnet partagé ---------- */

test("carnet partagé : le bloc est absent quand la synchro n'est pas configurée", async ({ page, context }) => {
  await simulerCarnetSync(context, { disponible: false });
  await page.goto("/");
  const feuille = await ouvrirReglages(page);
  await expect(feuille.getByRole("heading", { name: "Sauvegarde" })).toBeVisible();
  await expect(feuille.getByRole("heading", { name: "Carnet partagé" })).toBeHidden();
});

test("carnet partagé : le mot de passe se saisit dans la feuille, un refus s'explique", async ({ page, context }) => {
  await simulerCarnetSync(context, { etat: "off", mdp: "secret" });
  await page.goto("/");
  const feuille = await ouvrirReglages(page);
  await expect(feuille.getByRole("heading", { name: "Carnet partagé" })).toBeVisible();

  await feuille.getByLabel("Mot de passe du carnet").fill("mauvais");
  await feuille.getByRole("button", { name: "Se connecter" }).click();
  await expect(feuille.getByRole("alert")).toHaveText("Mot de passe incorrect.");
  await expect(feuille.getByLabel("Mot de passe du carnet")).toHaveValue("mauvais");   // rien n'est perdu

  await feuille.getByLabel("Mot de passe du carnet").fill("secret");
  await feuille.getByRole("button", { name: "Se connecter" }).click();
  await expect(feuille.getByText("Connecté", { exact: true })).toBeVisible();
  await expect(feuille.getByRole("button", { name: "Se déconnecter" })).toBeVisible();
  await expect(page.locator("#toast")).toHaveText("Synchronisation activée");
  expect(await page.evaluate(() => window.__carnetSyncSimule.appels.at(-1))).toEqual(["connecter", "secret", {}]);
  await expect(page.getByRole("button", { name: /^Réglages/ })).toHaveAttribute("data-sync", "ok");
});

test("carnet partagé : un refus pendant que l'état passe par « connexion » garde la saisie", async ({ page, context }) => {
  await simulerCarnetSync(context, { etat: "off", mdp: "secret", attente: true });
  await page.goto("/");
  const feuille = await ouvrirReglages(page);
  await feuille.getByLabel("Mot de passe du carnet").fill("mauvais");
  await feuille.getByRole("button", { name: "Se connecter" }).click();
  await expect(feuille.getByRole("alert")).toHaveText("Mot de passe incorrect.");
  await expect(feuille.getByLabel("Mot de passe du carnet")).toHaveValue("mauvais");
});

test("carnet partagé : si un carnet existe déjà, une feuille demande avant de le remplacer", async ({ page, context }) => {
  await simulerCarnetSync(context, { etat: "off", carnetExistant: true });
  await page.goto("/");
  const feuille = await ouvrirReglages(page);
  await feuille.getByLabel("Mot de passe du carnet").fill("secret");
  await feuille.getByRole("button", { name: "Se connecter" }).click();

  const confirmation = page.getByRole("alertdialog");
  await expect(confirmation).toContainText("Un carnet partagé existe déjà");
  await confirmation.getByRole("button", { name: "Annuler" }).click();
  await expect(confirmation).toBeHidden();
  await expect(feuille.getByLabel("Mot de passe du carnet")).toBeVisible();   // pas connecté
  expect(await page.evaluate(() => window.__carnetSyncSimule.etat())).toBe("off");

  await feuille.getByRole("button", { name: "Se connecter" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remplacer et me connecter" }).click();
  await expect(feuille.getByText("Connecté", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__carnetSyncSimule.appels.at(-1))).toEqual(["connecter", "secret", { remplacer: true }]);
});

test("carnet partagé : l'état hors ligne s'affiche, et se déconnecter demande confirmation", async ({ page, context }) => {
  await simulerCarnetSync(context, { etat: "ok" });
  await page.goto("/");
  const feuille = await ouvrirReglages(page);
  await expect(feuille.getByText("Connecté", { exact: true })).toBeVisible();

  await page.evaluate(() => window.__carnetSyncSimule.changer("hors"));
  await expect(feuille.getByText("Hors ligne", { exact: true })).toBeVisible();
  await expect(feuille).toContainText("tes modifications partiront au retour du réseau");

  await feuille.getByRole("button", { name: "Se déconnecter" }).click();
  const confirmation = page.getByRole("alertdialog");
  await confirmation.getByRole("button", { name: "Annuler" }).click();
  expect(await page.evaluate(() => window.__carnetSyncSimule.etat())).toBe("hors");

  await feuille.getByRole("button", { name: "Se déconnecter" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Se déconnecter" }).click();
  await expect(feuille.getByLabel("Mot de passe du carnet")).toBeVisible();
  expect(await page.evaluate(() => window.__carnetSyncSimule.appels.at(-1))).toEqual(["deconnecter"]);
});

test("carnet partagé : le QR code n'apparaît qu'à la demande, avec son avertissement", async ({ page, context }) => {
  const { lien } = await simulerCarnetSync(context, { etat: "ok" });
  await page.goto("/");
  const feuille = await ouvrirReglages(page);
  await expect(feuille.locator(".reg-qr")).toHaveCount(0);

  await feuille.getByRole("button", { name: "Connecter un autre téléphone" }).click();
  await expect(feuille.getByRole("note")).toContainText("contient le mot de passe");
  const svg = feuille.locator(".reg-qr svg");
  await expect(svg).toBeVisible();
  expect(decodeURIComponent(await svg.getAttribute("data-texte"))).toBe(lien);

  await feuille.getByRole("button", { name: "Masquer le code" }).click();
  await expect(feuille.locator(".reg-qr")).toHaveCount(0);
});

/* ---------- Sauvegarde ---------- */

test("export : un fichier JSON daté contenant tout le carnet", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "m1", portions: 4 })], extras: [{ id: "a", name: "Sel" }], notes: { "cake-sale": "bien" } } });
  await page.goto("/");
  const feuille = await ouvrirReglages(page);

  const [telechargement] = await Promise.all([
    page.waitForEvent("download"),
    feuille.getByRole("button", { name: "Exporter mon carnet" }).click()
  ]);
  expect(telechargement.suggestedFilename()).toMatch(/^carnet-cuisine-\d{4}-\d{2}-\d{2}\.json$/);
  const contenu = JSON.parse(await readFile(await telechargement.path(), "utf8"));
  expect(contenu.menu).toHaveLength(1);
  expect(contenu.menu[0].rid).toBe("quiche-lorraine");
  expect(contenu.extras).toEqual([{ id: "a", name: "Sel" }]);
  expect(contenu.notes).toEqual({ "cake-sale": "bien" });
  await expect(page.locator("#toast")).toHaveText("Carnet exporté");
});

const fichierJson = (nom, objet) => ({ name: nom, mimeType: "application/json", buffer: Buffer.from(typeof objet === "string" ? objet : JSON.stringify(objet)) });

test("import : un aperçu, un remplacement, puis « Annuler » rend l'ancien carnet", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "m1" })], extras: [{ id: "a", name: "Sel" }] } });
  await page.goto("/");
  await expect(page.locator("#menu-badge")).toHaveText("1");
  const feuille = await ouvrirReglages(page);

  const importe = {
    menu: [entree("cake-sale", { k: "n1" }), entree("focaccia-romarin", { k: "n2" })],
    extras: [],
    notes: { "cake-sale": "top" }
  };
  await feuille.locator("#reg-fichier").setInputFiles(fichierJson("mon-carnet.json", importe));

  const confirmation = page.getByRole("alertdialog");
  await expect(confirmation).toContainText("mon-carnet.json");
  await expect(confirmation.getByText("Recettes au menu")).toBeVisible();
  await expect(confirmation.locator("li", { hasText: "Recettes au menu" })).toContainText("1 → 2");
  await expect(confirmation.locator("li", { hasText: "Articles libres" })).toContainText("1 → 0");
  expect((await lireCarnet(page)).menu).toHaveLength(1);        // rien n'a bougé avant d'avoir dit oui

  await confirmation.getByRole("button", { name: "Remplacer mon carnet" }).click();
  await expect(page.locator(".sheet-backdrop")).toHaveCount(0);   // la confirmation et les réglages sont partis
  await expect(page.locator("#menu-badge")).toHaveText("2");
  const apres = await lireCarnet(page);
  expect(apres.menu.map(e => e.rid)).toEqual(["cake-sale", "focaccia-romarin"]);
  expect(apres.extras).toEqual([]);
  expect(apres.filter).toBe("Toutes");                            // les champs omis reçoivent leur valeur de départ

  const toast = page.locator("#toast");
  await expect(toast).toContainText("Carnet importé");
  await toast.getByRole("button", { name: "Annuler" }).click();
  await expect(page.locator("#menu-badge")).toHaveText("1");
  const retour = await lireCarnet(page);
  expect(retour.menu.map(e => e.rid)).toEqual(["quiche-lorraine"]);
  expect(retour.extras).toEqual([{ id: "a", name: "Sel" }]);
});

test("import : annuler la confirmation ne change rien ; un fichier invalide est refusé", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "m1" })] } });
  await page.goto("/");
  const feuille = await ouvrirReglages(page);

  await feuille.locator("#reg-fichier").setInputFiles(fichierJson("autre.json", { menu: [] }));
  await page.getByRole("alertdialog").getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  expect((await lireCarnet(page)).menu).toHaveLength(1);

  await feuille.locator("#reg-fichier").setInputFiles(fichierJson("mauvais.json", "ceci n'est pas du JSON"));
  await expect(page.locator("#toast")).toHaveText("Ce fichier n'est pas un fichier JSON lisible");
  await feuille.locator("#reg-fichier").setInputFiles(fichierJson("liste.json", [1, 2, 3]));
  await expect(page.locator("#toast")).toHaveText("Ce fichier ne ressemble pas à un carnet de cuisine");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  expect((await lireCarnet(page)).menu).toHaveLength(1);
});

/* ---------- Persistance du stockage ---------- */

test("stockage : persist() est demandé au premier lancement, une seule fois, même sans synchro", async ({ page, context }) => {
  await espionnerPersistance(context);
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => window.__persist)).toBe(1);
  expect((await lireCarnet(page)).reglages.persistanceDemandee).toBe(true);
  await page.reload();
  await expect(page.getByRole("button", { name: /^Réglages/ })).toBeVisible();
  expect(await page.evaluate(() => window.__persist)).toBe(0);
});

/* ---------- Focus des feuilles ---------- */

test("feuilles : le focus entre, Tab y reste, Échap ferme, le focus revient au bouton", async ({ page }) => {
  await page.goto("/");
  const bouton = page.getByRole("button", { name: /^Réglages/ });
  await bouton.focus();
  await bouton.click();
  const feuille = page.getByRole("dialog", { name: "Réglages" });
  await expect(feuille).toBeVisible();

  const dedans = () => page.evaluate(() => !!document.activeElement.closest(".sheet"));
  expect(await dedans()).toBe(true);

  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    expect(await dedans(), `après ${i + 1} Tab`).toBe(true);
  }
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Shift+Tab");
    expect(await dedans(), `après ${i + 1} Maj+Tab`).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(feuille).toBeHidden();
  await expect(bouton).toBeFocused();
  expect(new URL(page.url()).hash).toBe("");     // l'entrée d'historique de la feuille est bien dépilée
});

test("feuilles : Échap ferme aussi la feuille d'ajout au menu, et le focus revient à « Ajouter »", async ({ page }) => {
  await page.goto("/#/recette/quiche-lorraine");
  const ajouter = page.locator("#add-list");
  await ajouter.focus();
  await ajouter.click();
  const feuille = page.getByRole("dialog");
  await expect(feuille).toBeVisible();
  expect(await page.evaluate(() => !!document.activeElement.closest(".sheet"))).toBe(true);

  await page.keyboard.press("Escape");
  await expect(feuille).toBeHidden();
  await expect(ajouter).toBeFocused();
  expect(new URL(page.url()).hash).toBe("#/recette/quiche-lorraine");
});

test("feuilles : une confirmation empilée se ferme seule avec Échap, puis les réglages", async ({ page, context }) => {
  await simulerCarnetSync(context, { etat: "ok" });
  await page.goto("/");
  const feuille = await ouvrirReglages(page);
  await feuille.getByRole("button", { name: "Se déconnecter" }).click();
  const confirmation = page.getByRole("alertdialog");
  await expect(confirmation).toBeVisible();
  await expect(confirmation.getByRole("button", { name: "Annuler" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(confirmation).toBeHidden();
  await expect(feuille).toBeVisible();
  expect(await page.evaluate(() => window.__carnetSyncSimule.etat())).toBe("ok");   // Échap vaut « non »

  await page.keyboard.press("Escape");
  await expect(feuille).toBeHidden();
});

/* ---------- Contrastes des surfaces au vert profond fixe ---------- */

const luminance = rgb => {
  const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(v => {
    const c = Number(v) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

for (const theme of ["light", "dark"]) {
  test(`contraste (${theme}) : bulles de minuteur et mode cuisine restent lisibles`, async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: theme });
    await preremplir(context, { carnet: { timers: [
      { id: "t1", rid: "torsades-pesto", mk: null, step: 1, slot: null, label: "Levée", emoji: "x", end: Date.now() + 600000, total: 10, fired: false },
      { id: "t2", rid: "torsades-pesto", mk: null, step: 2, slot: null, label: "Four", emoji: "x", end: Date.now() - 1000, total: 10, fired: true }
    ] } });
    await page.goto("/");
    const bulle = page.locator(".timer-pill:not(.done)").first();
    await expect(bulle).toBeVisible();
    const [fond, horloge] = await bulle.evaluate(el => [getComputedStyle(el).backgroundColor, getComputedStyle(el.querySelector(".t-clock")).color]);
    expect(contraste(horloge, fond)).toBeGreaterThanOrEqual(4.5);
    const prete = page.locator(".timer-pill.done").first();
    const [fondPret, textePret] = await prete.evaluate(el => [getComputedStyle(el).backgroundColor, getComputedStyle(el.querySelector(".t-label")).color]);
    expect(contraste(textePret, fondPret)).toBeGreaterThanOrEqual(4.5);

    await page.locator(".card").first().click();
    await page.getByRole("link", { name: /mode cuisine/i }).dispatchEvent("click");
    const etiquette = page.locator(".cook-step-label");
    await expect(etiquette).toBeVisible();
    const [couleur, vert] = await etiquette.evaluate(el => [getComputedStyle(el).color, getComputedStyle(el.closest(".cook")).backgroundColor]);
    expect(contraste(couleur, vert)).toBeGreaterThanOrEqual(4.5);
  });
}
