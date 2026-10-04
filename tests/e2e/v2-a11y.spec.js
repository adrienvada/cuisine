/* Accessibilité (vague 2) : toasts, annonces, focus du mode cuisine, sémantique. */

import { test, expect, entree, lireCarnet, preremplir } from "./outils.js";

const CUISINE = "/#/recette/quiche-lorraine/cuisine";
const REPAS = { convives: 6, heure: "20:00", date: "2099-06-15", exclus: [] };

const minuteur = (finDans, extra = {}) => ({
  id: "tx1", rid: "quiche-lorraine", mk: null, step: 1, slot: null, label: "Cuisson à blanc", emoji: "🥧",
  end: Date.now() + finDans, total: 20, fired: false, ...extra
});

const actif = page => page.evaluate(() => {
  const el = document.activeElement;
  return el ? { id: el.id, classe: el.className, tag: el.tagName, texte: (el.textContent || "").trim().slice(0, 40) } : null;
});

/* ---------- n° 58 : le toast ---------- */

test("n° 58 — au clavier, le geste qui détruit donne le focus à « Annuler » : Entrée suffit pour le défaire", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("cake-sale", { k: "a" }), entree("quiche-lorraine", { k: "b" })], repas: REPAS } });
  await page.goto("/#/menu");
  await expect(page.locator(".menu-card")).toHaveCount(2);

  await page.locator('.menu-card[data-open="a"] .mc-x').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".menu-card")).toHaveCount(1);
  await expect(page.locator("#toast .toast-action")).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.locator(".menu-card")).toHaveCount(2);
  await expect(page.locator("#toast")).toBeHidden();
});

test("n° 58 — à Échap le toast se ferme, et le bouton ne garde pas le focus dans le vide", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("cake-sale", { k: "a" }), entree("quiche-lorraine", { k: "b" })], repas: REPAS } });
  await page.goto("/#/menu");
  await page.locator('.menu-card[data-open="a"] .mc-x').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#toast .toast-action")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#toast")).toBeHidden();
  await expect(page.locator("#toast .toast-action")).toHaveCount(0);
  expect((await actif(page)).classe).not.toContain("toast-action");
});

test("n° 58 — le toast reste rendu en permanence (jamais hidden) et son message passe par la région du carnet", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("cake-sale", { k: "a" }), entree("quiche-lorraine", { k: "b" })], repas: REPAS } });
  await page.goto("/#/menu");
  expect(await page.locator("#toast").evaluate(el => el.hasAttribute("hidden"))).toBe(false);
  expect(await page.locator("#toast").getAttribute("role")).toBeNull();
  await page.locator('.menu-card[data-open="a"] .mc-x').click();
  await expect(page.locator("#annonces")).toHaveText("Retiré du menu");
});

test("n° 58 — au toucher, le focus ne va pas sur « Annuler »", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("cake-sale", { k: "a" }), entree("quiche-lorraine", { k: "b" })], repas: REPAS } });
  await page.goto("/#/menu");
  await page.locator('.menu-card[data-open="a"] .mc-x').click();
  await expect(page.locator("#toast .toast-action")).toBeVisible();
  await expect(page.locator("#toast .toast-action")).not.toBeFocused();
});

test("n° 58 — le toast ne recouvre pas le plateau de minuteurs", async ({ page, context }) => {
  await preremplir(context, {
    carnet: { menu: [entree("cake-sale", { k: "a" }), entree("quiche-lorraine", { k: "b" })], repas: REPAS, timers: [minuteur(600000)] }
  });
  await page.goto("/#/menu");
  await expect(page.locator("#timer-tray .timer-pill")).toBeVisible();
  await page.locator('.menu-card[data-open="a"] .mc-x').click();
  await expect(page.locator("#toast .toast-action")).toBeVisible();
  const toast = await page.locator("#toast").boundingBox();
  const plateau = await page.locator("#timer-tray .timer-pill").boundingBox();
  const sePosent = toast.y < plateau.y + plateau.height && toast.y + toast.height > plateau.y;
  expect(sePosent, `toast ${toast.y}-${toast.y + toast.height}, plateau ${plateau.y}-${plateau.y + plateau.height}`).toBe(false);
});

/* ---------- n° 3 : la largeur du toast ---------- */

for (const largeur of [320, 375]) {
  test(`n° 3 — à ${largeur} px, « Bon appétit ! Un coup de cœur ? » reste entier dans l'écran`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: 740 });
    await page.goto(CUISINE + "/4");
    await page.getByRole("button", { name: /Terminer/ }).click();
    const action = page.locator("#toast .toast-action");
    await expect(action).toBeVisible();
    // La fiche déborde de quelques pixels à 320 px (la vue élargit alors la fenêtre) :
    // la marge se mesure donc sur la fenêtre réelle, pas sur la largeur demandée.
    const fenetre = await page.evaluate(() => innerWidth);
    const boite = await page.locator("#toast").boundingBox();
    expect(boite.x).toBeGreaterThanOrEqual(12 - 0.5);
    expect(boite.x + boite.width).toBeLessThanOrEqual(fenetre - 12 + 0.5);
    const b = await action.boundingBox();
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(fenetre);
    expect(b.height).toBeGreaterThanOrEqual(44);
  });
}

/* ---------- n° 59 : un minuteur prêt est annoncé ---------- */

test("n° 59 — un minuteur qui finit est annoncé dans la région live", async ({ page, context }) => {
  await preremplir(context, { carnet: { timers: [minuteur(1500)] } });
  await page.goto("/#/recette/focaccia-romarin");
  await expect(page.locator("#annonces")).toHaveText("Minuteur « Cuisson à blanc » prêt", { timeout: 8000 });
});

test("la région live est unique, polie et masquée à l'œil", async ({ page }) => {
  await page.goto("/");
  const region = page.locator("#annonces");
  await expect(region).toHaveCount(1);
  expect(await region.getAttribute("role")).toBe("status");
  expect(await region.getAttribute("aria-live")).toBe("polite");
  const boite = await region.boundingBox();
  expect(boite.width).toBeLessThanOrEqual(1);
});

/* ---------- n° 22 : pas d'erreur de console sans geste ---------- */

test("n° 22 — un minuteur échu à l'ouverture ne vibre pas, ne crée aucun AudioContext et ne laisse aucune erreur", async ({ page, context }) => {
  const bruit = [];
  page.on("console", m => { if (/vibrate|AudioContext|audio/i.test(m.text()) && ["error", "warning"].includes(m.type())) bruit.push(m.text()); });
  page.on("pageerror", e => bruit.push(String(e)));
  // Le navigateur de test se croit déjà activé et ne bloque rien : on joue la page
  // rouverte sans toucher, et l'on compte ce qu'elle tente quand même.
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "userActivation", { value: { hasBeenActive: false, isActive: false }, configurable: true });
    window.__vibrations = 0; window.__contextes = 0;
    navigator.vibrate = () => { window.__vibrations++; return true; };
    const Natif = window.AudioContext;
    window.AudioContext = class extends Natif { constructor(...a) { super(...a); window.__contextes++; } };
  });
  await preremplir(context, { carnet: { timers: [minuteur(-3000)] } });
  await page.goto("/");
  await expect(page.locator("#timer-tray .timer-pill.done")).toBeVisible();
  await page.waitForTimeout(2600);
  expect(await page.evaluate(() => [window.__vibrations, window.__contextes])).toEqual([0, 0]);
  expect(bruit).toEqual([]);
});

/* ---------- n° 44 : le focus du mode cuisine ---------- */

test("n° 44 — Suivant puis Précédent au clavier : le focus reste sur le bouton, l'étape est annoncée", async ({ page }) => {
  await page.goto(CUISINE);
  await page.locator("#next").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".cook-step-label")).toHaveText("Étape 2 / 5");
  await expect(page.locator("#next")).toBeFocused();
  await expect(page.locator("#annonces")).toHaveText(/^Étape 2 \/ 5, /);

  await page.locator("#prev").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".cook-step-label")).toHaveText("Étape 1 / 5");
  // « Précédent » est désactivé à la première étape : le focus va au titre de l'étape.
  await expect(page.locator(".cook-etape h2")).toBeFocused();
  await expect(page.locator("#annonces")).toHaveText(/^Étape 1 \/ 5, /);
});

test("n° 44 — les gestes du minuteur gardent le focus sur le contrôle équivalent", async ({ page }) => {
  await page.goto(CUISINE + "/1");
  await page.locator("#timer-start").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#timer-zone .clock")).toBeVisible();
  await expect(page.locator("#timer-zone button:focus")).toHaveCount(1);

  await page.locator("#timer-zone [data-pause]").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#timer-zone [data-pause]")).toHaveText("Reprendre");
  await expect(page.locator("#timer-zone [data-pause]")).toBeFocused();

  await page.locator("#timer-zone [data-plus]").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#timer-zone [data-plus]")).toBeFocused();
});

test("n° 44 — les bulles du plateau gardent le focus après +1, pause et reprise", async ({ page, context }) => {
  await preremplir(context, { carnet: { timers: [minuteur(600000)] } });
  await page.goto(CUISINE + "/2");
  const pause = page.locator(".timer-pill .t-pause");
  await pause.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".timer-pill.en-pause")).toHaveCount(1);
  await expect(page.locator(".timer-pill .t-pause")).toBeFocused();
  await page.locator(".timer-pill .t-plus").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".timer-pill .t-plus")).toBeFocused();
});

test("n° 44 — A+ jusqu'au maximum : le focus passe sur A−", async ({ page }) => {
  await page.goto(CUISINE);
  const plus = page.locator("#cook-plus");
  await plus.focus();
  for (let i = 0; i < 8 && await plus.isEnabled(); i++) await page.keyboard.press("Enter");
  await expect(plus).toBeDisabled();
  await expect(page.locator("#cook-moins")).toBeFocused();
});

/* ---------- n° 62 : sémantique ---------- */

test("n° 62 — les catégories forment un groupe nommé", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("group", { name: "Catégories" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Catégories" }).getByRole("button").first()).toBeVisible();
});

test("n° 62 — chaque rangée de choix de la fiche est un groupe nommé", async ({ page }) => {
  await page.goto("/#/recette/salade-champetre");
  await expect(page.getByRole("group", { name: "La vinaigrette" }).getByRole("button").first()).toBeVisible();
});

test("n° 62 — le champ de recherche des Savoirs est étiqueté", async ({ page }) => {
  await page.goto("/#/fondamentaux");
  // Un placeholder donne un nom de repli, mais disparaît à la saisie : l'étiquette est explicite.
  await expect(page.getByRole("searchbox", { name: "Chercher un mécanisme" })).toBeVisible();
  await expect(page.locator("#f-search")).toHaveAttribute("aria-label", "Chercher un mécanisme");
});

test("n° 62 — un savoir ouvert : un h1, des h2, pas de h4 sous le h1", async ({ page }) => {
  await page.goto("/#/fondamental/maillard");
  await expect(page.locator("#app h1")).toHaveCount(1);
  expect(await page.locator("#app h4").count()).toBe(0);
  expect(await page.locator("#app h2").count()).toBeGreaterThanOrEqual(2);
});

test("n° 62 — le mode cuisine a un h1, le titre de la recette", async ({ page }) => {
  await page.goto(CUISINE);
  await expect(page.locator("#app h1")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Quiche lorraine");
});

/* ---------- n° 61 : valeurs et résultats annoncés ---------- */

test("n° 61 — la fiche annonce les portions (région live)", async ({ page }) => {
  await page.goto("/#/recette/quiche-lorraine");
  expect(await page.locator("#p-val").getAttribute("aria-live")).toBe("polite");
});

test("n° 61 — le menu annonce les convives et les portions", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "b" })], repas: REPAS } });
  await page.goto("/#/menu");
  await page.locator('[data-conv="1"]').click();
  await expect(page.locator("#annonces")).toHaveText("7 convives");
  await page.locator('[data-plus="b"]').click();
  await expect(page.locator("#annonces")).toContainText("Quiche lorraine");
  await expect(page.locator("#annonces")).toContainText("personnes");
  expect((await lireCarnet(page)).repas.convives).toBe(7);
});

test("n° 61 — l'accueil annonce le nombre de recettes après un filtre", async ({ page }) => {
  await page.goto("/");
  await page.locator("#chips").getByRole("button", { name: "Apéro", exact: true }).click();
  await expect(page.locator("#annonces")).toHaveText(/^\d+ recettes?$/);
  // La phrase dit le vrai nombre de cartes qui restent, une fois la sortie des autres terminée.
  await expect.poll(async () => {
    const dit = Number(((await page.locator("#annonces").textContent()) || "").match(/^(\d+)/)?.[1]);
    return dit === await page.locator("#grid .card:visible").count();
  }).toBe(true);
});

test("n° 61 — « Aucune recette ne correspond » est annoncé", async ({ page }) => {
  await page.goto("/");
  await page.locator("#search").fill("zzzxyzqq");
  await expect(page.locator("#annonces")).toHaveText("Aucune recette ne correspond");
});

/* ---------- relecture : deux minuteurs prêts au même battement ---------- */

test("n° 59 — deux minuteurs qui finissent ensemble sont annoncés tous les deux (une annonce n'écrase pas l'autre)", async ({ page, context }) => {
  await preremplir(context, { carnet: { timers: [minuteur(1500), minuteur(1500, { id: "tx2", label: "Salade", step: 2 })] } });
  await page.goto("/#/recette/focaccia-romarin");
  await expect(page.locator("#annonces")).toHaveText(/^2 minuteurs prêts/, { timeout: 8000 });
  await expect(page.locator("#annonces")).toContainText("« Cuisson à blanc »");
  await expect(page.locator("#annonces")).toContainText("« Salade »");
});

test("n° 58 — à la fermeture le message reste pendant le fondu (pas de pastille vide), le bouton part tout de suite", async ({ page }) => {
  await page.goto("/#/fondamentaux");
  await page.evaluate(async () => { (await import("/js/ui/toast.js")).toast("Retiré du menu", { action: "Annuler" }); });
  const etat = await page.evaluate(() => {
    document.querySelector("#toast .toast-action").click();
    const t = document.getElementById("toast");
    return { texte: t.textContent, boutons: t.querySelectorAll(".toast-action").length, visible: t.classList.contains("visible") };
  });
  expect(etat).toEqual({ texte: "Retiré du menu", boutons: 0, visible: false });
  await expect(page.locator("#toast")).toHaveText("");
});

/* ---------- relecture : un message qui en remplace un autre ne perd pas le focus ---------- */

test("n° 58 — un second message qui efface le bouton « Annuler » focalisé rend le focus au contrôle d'origine", async ({ page }) => {
  await page.goto("/#/fondamentaux");
  await page.locator("#f-search").focus();
  await page.keyboard.press("a");
  await page.evaluate(async () => { (await import("/js/ui/toast.js")).toast("Retiré", { action: "Annuler" }); });
  await expect(page.locator("#toast .toast-action")).toBeFocused();
  await page.evaluate(async () => { (await import("/js/ui/toast.js")).toast("Autre chose"); });
  await expect(page.locator("#toast")).toContainText("Autre chose");
  await expect(page.locator("#toast .toast-action")).toHaveCount(0);
  await expect(page.locator("#f-search")).toBeFocused();
});
