/* Passe d'harmonisation de la vague 3 : ce qui tient l'ensemble ensemble. La feuille des réglages hors du chemin de l'accueil, le tampon des courses qui ne couvre rien, le minuteur compact à 320 px, la fête de fin de recette après le cercle de sortie, les gestes à la souris (sélection, pointeur synthétique), la valeur des portions annoncée une fois. */

import { test, expect, preremplir, entree, pageStable } from "./outils.js";
import { basculer } from "./outils-courses.js";

const CUISINE = "/#/recette/quiche-lorraine/cuisine";
const LIBRES = [{ id: "e1", name: "Éponges" }, { id: "e2", name: "Glaçons" }];

const croise = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/* ---------- La feuille des réglages ---------- */

test("réglages : la feuille de style n'est pas dans la page de l'accueil, arrive au repos, et la feuille s'ouvre habillée", async ({ page }) => {
  await page.goto("/");
  const bloquantes = await page.evaluate(() => [...document.querySelectorAll("link[rel=stylesheet]")]
    .filter(l => !l.hasAttribute("data-vue") && !l.closest("noscript")).map(l => l.getAttribute("href")));
  expect(bloquantes).toContain("css/reglages.css");
  expect(bloquantes).not.toContain("css/reglages-feuille.css");
  await expect.poll(() => page.evaluate(() => [...document.styleSheets].some(s => s.href?.endsWith("reglages-feuille.css") && s.cssRules.length > 0))).toBe(true);
  await page.locator("[data-reglages]").click();
  await expect(page.locator(".reglages-sheet")).toBeVisible();
  const interrupteur = await page.locator("#reg-vib").boundingBox();
  expect(interrupteur.width).toBeGreaterThanOrEqual(56);
  expect(interrupteur.height).toBeGreaterThanOrEqual(44);
});

test("réglages : touchée tout de suite, la feuille attend sa feuille de style (jamais de flash sans habillage)", async ({ page }) => {
  // La feuille est retenue : le bouton la demande, et rien ne s'ouvre avant qu'elle arrive.
  let liberer;
  const retenue = new Promise(fin => { liberer = fin; });
  await page.route("**/css/reglages-feuille.css", async route => { await retenue; await route.continue(); });
  // Sans attendre « load » : la feuille retenue peut être demandée avant, et load l'attendrait.
  await page.goto("/", { waitUntil: "commit" });
  await page.locator("[data-reglages]").click();
  await expect(page.locator(".reglages-sheet")).toHaveCount(0);
  liberer();
  await expect(page.locator(".reglages-sheet")).toBeVisible();
  expect(await page.locator("#reg-vib").boundingBox().then(b => b.width)).toBeGreaterThanOrEqual(56);
});

/* ---------- Courses : le tampon ---------- */

for (const [largeur, hauteur] of [[390, 844], [320, 640]]) {
  test(`courses terminées à ${largeur} px : le tampon ne couvre ni le titre, ni le texte du bandeau, ni le compteur, et dit autre chose que la ligne du bas`, async ({ page, context }) => {
    await page.setViewportSize({ width: largeur, height: hauteur });
    await preremplir(context, { carnet: { extras: LIBRES } });
    await page.goto("/#/courses");
    await pageStable(page);
    await basculer(page, "x-e1");
    await basculer(page, "x-e2");
    const tampon = page.locator(".tampon-fini");
    await expect(tampon).toHaveCSS("opacity", "1");
    await pageStable(page);
    const rect = await tampon.boundingBox();
    for (const sel of ["h1", ".menu-ligne", ".avance-txt", ".fini"]) {
      const autre = await page.locator(sel).first().boundingBox();
      expect(croise(rect, autre), `le tampon couvre ${sel}`).toBe(false);
    }
    const bandeau = await page.locator(".courses-head").boundingBox();
    expect(croise(rect, bandeau), "le tampon mord sur le bandeau vert").toBe(false);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(largeur);
    await expect(page.locator(".fini")).not.toHaveText(/Tout est dans le panier/i);
    await expect(tampon).toHaveText("Tout est dans le panier");
    await expect(tampon).toHaveAttribute("aria-hidden", "true");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
}

/* ---------- Gestes ---------- */

test("balayage à la souris : aucun texte n'est sélectionné pendant le geste, la sélection normale revient après", async ({ page, context }) => {
  await preremplir(context, { carnet: { extras: LIBRES, menu: [entree("quiche-lorraine", { k: "q1" })] } });
  await page.goto("/#/courses");
  await pageStable(page);
  const ligne = page.locator('li.art:has(input[data-key="x-e2"])');
  await ligne.evaluate(e => e.scrollIntoView({ block: "center" }));
  const r = await ligne.boundingBox();
  const y = r.y + r.height / 2;
  await page.mouse.move(r.x + 120, y);
  await page.mouse.down();
  await page.mouse.move(r.x + 20, y, { steps: 10 });
  expect(await page.evaluate(() => getSelection().toString())).toBe("");
  expect(await page.evaluate(() => document.documentElement.style.userSelect)).toBe("none");
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => document.documentElement.style.userSelect)).toBe("");
});

test("un pointeur synthétique (pointerId inventé) ne fait pas lever le geste : l'étape suit, aucune erreur de page", async ({ page }) => {
  const erreurs = [];
  page.on("pageerror", e => erreurs.push(e.message));
  await page.goto(CUISINE + "/0");
  await pageStable(page);
  const x = await page.evaluate(() => {
    const el = document.querySelector(".cook-body");
    const r = el.getBoundingClientRect();
    const y = r.top + 120;
    const ev = (type, px) => new PointerEvent(type, { pointerId: 4242, isPrimary: true, pointerType: "touch", bubbles: true, clientX: px, clientY: y });
    const x0 = r.left + r.width / 2;
    el.dispatchEvent(ev("pointerdown", x0));
    el.dispatchEvent(ev("pointermove", x0 - 30));
    el.dispatchEvent(ev("pointermove", x0 - 60));
    return parseFloat(getComputedStyle(el).translate) || 0;
  });
  expect(x).toBeLessThan(-20);
  await page.evaluate(() => document.querySelector(".cook-body").dispatchEvent(new PointerEvent("pointercancel", { pointerId: 4242, isPrimary: true, pointerType: "touch", bubbles: true })));
  expect(erreurs).toEqual([]);
});

/* ---------- Portions : une seule annonce ---------- */

test("portions : la région live ne reçoit que la valeur finale, jamais un texte intermédiaire ni une réécriture", async ({ page }) => {
  await page.goto("/#/recette/quiche-lorraine");
  await pageStable(page);
  await page.evaluate(() => {
    const cible = document.getElementById("p-val");
    window.__textes = [];
    new MutationObserver(() => window.__textes.push(cible.textContent.replace(/\s+/g, " ").trim()))
      .observe(cible, { childList: true, characterData: true, subtree: true });
  });
  await page.locator("#p-plus").click();
  await expect(page.locator("#p-val")).toHaveText("7 personnes");
  await pageStable(page);
  const textes = await page.evaluate(() => window.__textes);
  expect(textes.length).toBeGreaterThan(0);
  expect([...new Set(textes)]).toEqual(["7 personnes"]);
  await expect(page.locator("#p-val .rouler")).toHaveCount(0);
});

/* ---------- Mode cuisine ---------- */

test("320 px : le minuteur de repos collé en bas laisse plus de la moitié de l'écran à la lecture", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/#/recette/focaccia-romarin/cuisine/0");
  await pageStable(page);
  await page.locator(".cook-timer button").first().click();
  await expect(page.locator("#timer-zone.repos .clock")).toBeVisible();
  // L'anneau court pendant deux heures : la page n'est jamais « stable », on attend la hauteur.
  await expect.poll(async () => (await page.locator("#timer-zone").boundingBox()).height).toBeLessThan(568 * 0.3);
  for (const bouton of await page.locator("#timer-zone .t-btn").all()) {
    // offsetHeight : la taille de mise en page, que l'arrivée en échelle du bouton ne fausse pas.
    expect(await bouton.evaluate(e => e.offsetHeight)).toBeGreaterThanOrEqual(44);
    const b = await bouton.boundingBox();
    expect(b.x + b.width).toBeLessThanOrEqual(320);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});

test("« Terminer » : les effets sont chargés avant le geste, et les feuilles naissent après la fin du cercle de sortie", async ({ page }) => {
  const demandes = [];
  page.on("request", r => { if (r.url().endsWith("/js/ui/effets.js")) demandes.push(Date.now()); });
  await page.addInitScript(() => {
    window.__vt = [];
    const couche = () => document.querySelectorAll("body > div[aria-hidden='true'][style*='position: fixed']").length;
    window.addEventListener("DOMContentLoaded", () => {
      new MutationObserver(() => {
        if (couche() && !window.__vt.some(e => e.couche)) window.__vt.push({ couche: true, vt: document.documentElement.dataset.vt || "" });
      }).observe(document.body, { childList: true });
      new MutationObserver(() => window.__vt.push({ vt: document.documentElement.dataset.vt || "" }))
        .observe(document.documentElement, { attributes: true, attributeFilter: ["data-vt"] });
    });
  });
  await page.goto(CUISINE + "/4");
  await expect(page.locator(".cook-step-label")).toHaveText("Étape 5 / 5");
  await expect.poll(() => demandes.length).toBeGreaterThan(0);
  await page.evaluate(() => new Promise(r => setTimeout(r, 0)));   // laisser passer un tour : le clic part après l'arrivée du module
  const avant = demandes.length;
  await page.getByRole("button", { name: /Terminer/ }).click();
  await expect(page.locator(".cook-tampon")).toHaveText("Bon appétit");
  expect(demandes.length).toBe(avant);
  const journal = await page.evaluate(() => window.__vt);
  const naissance = journal.find(e => e.couche);
  expect(naissance, "les feuilles ne sont pas nées").toBeTruthy();
  // Quand elles naissent, aucune transition de vue n'est en cours (data-vt est retiré).
  expect(naissance.vt).toBe("");
  // Et le cercle de sortie a bien eu lieu avant (sauf si le navigateur n'a pas l'API).
  if (await page.evaluate(() => typeof document.startViewTransition === "function")) {
    const iTransition = journal.findIndex(e => e.vt === "cuisine-sortie");
    expect(iTransition).toBeGreaterThanOrEqual(0);
    expect(journal.indexOf(naissance)).toBeGreaterThan(iTransition);
  }
});

test("mouvement réduit : « Terminer » n'attend ni transition ni effets, et ne charge pas effets.js", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const demandes = [];
  page.on("request", r => { if (r.url().endsWith("/js/ui/effets.js")) demandes.push(r.url()); });
  await page.goto(CUISINE + "/4");
  await page.getByRole("button", { name: /Terminer/ }).click();
  await expect(page.locator("h1")).toHaveText("Quiche lorraine");
  await expect(page.locator(".cook-tampon")).toHaveCount(0);
  expect(demandes).toEqual([]);
});
