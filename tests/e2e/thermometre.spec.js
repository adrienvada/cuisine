/* Le thermomètre du carnet : la figure transversale de l'onglet Savoirs (#/fondamentaux). */

import { test, expect } from "./outils.js";
import { mesurerFigures } from "../../tools/capturer-savoir.mjs";

/* Un doigt sur l'étiquette d'un repère : on la centre d'abord à l'écran (la barre d'onglets, fixe, couvre le bas). */
const toucher = async lien => {
  const etiquette = lien.locator("text").first();
  await etiquette.evaluate(el => el.scrollIntoView({ block: "center" }));
  await etiquette.click();
};

const ouvrirThermometre = async page => {
  await page.goto("/#/fondamentaux");
  const encart = page.locator("#f-thermo");
  await expect(encart).toBeVisible();
  await encart.locator("summary").click();
  await expect(encart.locator(".fg-thermo svg")).toBeVisible();
  return encart;
};

test("thermomètre : un encart replié sous l'introduction, qui s'ouvre sur l'échelle de −40 à 220 °C", async ({ page }) => {
  await page.goto("/#/fondamentaux");
  const encart = page.locator("#f-thermo");
  await expect(encart).toBeVisible();
  expect(await encart.evaluate(el => el.open)).toBe(false);
  // Sous l'introduction, au-dessus de la recherche.
  const ordre = await page.locator("#app").evaluate(app => [...app.children].map(c => c.className.split(" ")[0] || c.tagName));
  expect(ordre.indexOf("f-intro")).toBeLessThan(ordre.indexOf("th-encart"));
  expect(ordre.indexOf("th-encart")).toBeLessThan(ordre.indexOf("searchbar"));
  await expect(encart.locator("summary")).toContainText("Le thermomètre du carnet");
  await expect(encart.locator("summary")).toContainText(/−40\sà\s220\s°C/);
  // Replié : le dessin n'est pas encore là (il se dessine à la première ouverture).
  await expect(encart.locator(".fg-thermo")).toHaveCount(0);

  await encart.locator("summary").click();
  const figure = encart.locator(".fg-thermo");
  await expect(figure).toBeVisible();
  await expect(figure.locator("svg")).toHaveAttribute("role", "group");
  await expect(figure.locator("svg title")).toHaveText("Le thermomètre du carnet");
  expect(await figure.locator("a.th-lien").count()).toBeGreaterThanOrEqual(40);
  // Les graduations : la plus basse est −40, la plus haute 220, avec le vrai signe moins.
  const nums = await figure.locator(".th-num").allTextContents();
  expect(nums).toContain("−40");
  expect(nums).toContain("220");
  // Des ruptures de l'axe, dites dans la légende.
  expect(await figure.locator(".th-rupture").count()).toBeGreaterThanOrEqual(4);
  await expect(figure.locator("figcaption")).toContainText("rupture");
  // Les identifiants du dessin sont uniques dans la page.
  expect(await page.evaluate(() => { const ids = [...document.querySelectorAll("[id]")].map(e => e.id); return ids.length - new Set(ids).size; })).toBe(0);
  // Replier le referme.
  await encart.locator("summary").click();
  await expect(encart.locator(".fg-thermo")).toBeHidden();
});

test("thermomètre : un repère est un lien qui mène à la bonne fiche", async ({ page }) => {
  const encart = await ouvrirThermometre(page);
  const lien = encart.locator('a.th-lien[data-th-fond="poisson-cru"]', { hasText: "Congélateur ménager" });
  await expect(lien).toHaveAttribute("href", "#/fondamental/poisson-cru");
  await toucher(lien);
  await expect(page).toHaveURL(/#\/fondamental\/poisson-cru$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("poisson cru");

  // Un autre repère, une autre fiche.
  await page.goBack();
  await expect(page.locator("#f-thermo")).toBeVisible();
  const maillard = page.locator('#f-thermo a.th-lien[data-th-fond="maillard"]', { hasText: "Pyrolyse" });
  await toucher(maillard);
  await expect(page).toHaveURL(/#\/fondamental\/maillard$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("réaction de Maillard");
});

test("thermomètre : chaque repère est atteignable au clavier et nommé pour un lecteur d'écran", async ({ page }) => {
  const encart = await ouvrirThermometre(page);
  const liens = encart.locator("a.th-lien");
  const nb = await liens.count();
  // Chacun a un nom accessible : la température, le repère, la fiche.
  for (const nom of await liens.evaluateAll(as => as.map(a => a.getAttribute("aria-label")))) {
    expect(nom).toMatch(/°C/);
    expect(nom).toMatch(/\sFiche\s: .+\.$/);
  }
  // Le rôle « lien » est exposé, avec ce nom.
  await expect(page.getByRole("link", { name: /Congélateur ménager : 7 jours \(Anses\)\. Fiche : Le poisson cru/ })).toHaveCount(1);
  // Tab y entre : le premier repère est le plus chaud, le dernier le plus froid.
  await liens.first().focus();
  expect(await page.evaluate(() => document.activeElement.getAttribute("aria-label"))).toMatch(/^220\s°C/);
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement.classList.contains("th-lien"))).toBe(true);
  await liens.nth(nb - 1).focus();
  expect(await page.evaluate(() => document.activeElement.getAttribute("aria-label"))).toMatch(/^de −40 à 40\s°C/);
  // Entrée ouvre la fiche.
  await liens.nth(1).focus();
  const cible = await page.evaluate(() => document.activeElement.getAttribute("href"));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(cible.replace("#", "#") + "$"));
});

test("thermomètre : replié, il ne met aucun lien dans l'ordre de tabulation", async ({ page }) => {
  await page.goto("/#/fondamentaux");
  await expect(page.locator("#f-thermo")).toBeVisible();
  expect(await page.locator("#f-thermo a").count()).toBe(0);
  await page.locator("#f-thermo summary").focus();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement.id)).toBe("f-search");
});

test("thermomètre : il se masque quand une recherche est en cours, et revient quand elle s'efface", async ({ page }) => {
  const encart = await ouvrirThermometre(page);
  await page.locator("#f-search").fill("maillard");
  await expect(encart).toBeHidden();
  await expect(page.locator(".f-item", { hasText: "La réaction de Maillard" })).toBeVisible();
  // Des espaces seuls ne sont pas une recherche.
  await page.locator("#f-search").fill("   ");
  await expect(encart).toBeVisible();
  await page.locator("#f-search").fill("amidon");
  await expect(encart).toBeHidden();
  await page.locator("#f-search").fill("");
  await expect(encart).toBeVisible();
  await expect(encart.locator(".fg-thermo svg")).toBeVisible();
});

test("thermomètre : une recherche déjà saisie le garde masqué au retour sur l'onglet", async ({ page }) => {
  await page.goto("/#/fondamentaux");
  await page.locator("#f-search").fill("maillard");
  await expect(page.locator("#f-thermo")).toBeHidden();
  await page.locator(".f-item", { hasText: "La réaction de Maillard" }).click();
  await expect(page).toHaveURL(/#\/fondamental\/maillard$/);
  await page.goBack();
  await expect(page.locator("#f-search")).toHaveValue("maillard");
  await expect(page.locator("#f-thermo")).toBeHidden();
});

test("thermomètre : ouvert, il le reste au retour d'une fiche", async ({ page }) => {
  const encart = await ouvrirThermometre(page);
  const lien = encart.locator('a.th-lien[data-th-fond="friture"]').first();
  await toucher(lien);
  await expect(page).toHaveURL(/#\/fondamental\/friture$/);
  await page.goBack();
  await expect(page.locator("#f-thermo")).toHaveJSProperty("open", true);
  await expect(page.locator("#f-thermo .fg-thermo svg")).toBeVisible();
});

for (const [nom, theme] of [["clair", "light"], ["sombre", "dark"]]) {
  test(`thermomètre (${nom}) : à 360 px rien ne déborde, aucun texte coupé, trop petit ou superposé`, async ({ page, context }) => {
    await context.addInitScript(t => { try { localStorage.setItem("theme", t); } catch {} }, theme);
    await page.setViewportSize({ width: 360, height: 800 });
    await ouvrirThermometre(page);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBe(theme === "dark" ? "dark" : null);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    // L'encart et la figure tiennent dans l'écran.
    const boites = await page.evaluate(() => ["#f-thermo", "#f-thermo .fg-thermo", "#f-thermo .th-svg"].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left, r.right]; }));
    for (const [gauche, droite] of boites) { expect(gauche).toBeGreaterThanOrEqual(0); expect(droite).toBeLessThanOrEqual(360); }
    const rapport = await page.evaluate(mesurerFigures);
    expect(rapport).toHaveLength(1);
    expect(rapport[0].problemes).toEqual([]);
  });
}

test("thermomètre : même à 320 px, la page ne défile pas de côté", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await ouvrirThermometre(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("thermomètre : sur un grand écran, la figure garde une largeur lisible", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await ouvrirThermometre(page);
  const largeur = await page.locator("#f-thermo .th-svg").evaluate(el => el.getBoundingClientRect().width);
  expect(largeur).toBeLessThanOrEqual(481);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("thermomètre : un repère au clavier montre où il est (anneau de focus)", async ({ page }) => {
  const encart = await ouvrirThermometre(page);
  const lien = encart.locator("a.th-lien").nth(3);
  await lien.focus();
  await page.keyboard.press("Tab");        // un cran plus loin, puis retour : le focus est bien celui du clavier (:focus-visible)
  await page.keyboard.press("Shift+Tab");
  await expect(lien).toBeFocused();
  const trait = await lien.locator(".th-zone").evaluate(z => getComputedStyle(z).stroke);
  expect(trait).not.toBe("none");
  expect(trait).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
});

test("thermomètre : sans js/figures.js, l'onglet s'affiche sans l'encart", async ({ page }) => {
  await page.route("**/js/figures.js", route => route.abort());
  await page.goto("/#/fondamentaux");
  await expect(page.locator(".f-item", { hasText: "La réaction de Maillard" })).toBeVisible();
  await expect(page.locator("#f-thermo")).toHaveCount(0);
});

test("thermomètre : chaque étiquette porte l'emoji de sa fiche, l'axe est léger et finit par un réservoir bleu", async ({ page }) => {
  const encart = await ouvrirThermometre(page);
  const paires = await encart.locator("a.th-lien").evaluateAll(as => as.map(a => [a.dataset.thFond, (a.querySelector(".th-emoji") || {}).textContent]));
  expect(paires.length).toBeGreaterThanOrEqual(40);
  const attendu = await page.evaluate(() => Object.fromEntries(FONDAMENTAUX.map(f => [f.id, f.emoji])));
  for (const [fond, emoji] of paires) expect(emoji, fond).toBe(attendu[fond]);
  // L'emoji ne se lit pas deux fois : le nom accessible n'en porte pas.
  const noms = await encart.locator("a.th-lien").evaluateAll(as => as.map(a => a.getAttribute("aria-label")));
  for (const nom of noms) expect(nom).not.toMatch(/\p{Extended_Pictographic}/u);
  // Peu de graduations : pas un trait tous les 5 °C.
  expect(await encart.locator(".th-num").count()).toBeLessThanOrEqual(28);
  // Le réservoir, de la couleur froide.
  const bulbe = encart.locator(".th-bulbe");
  await expect(bulbe).toHaveCount(1);
  expect(await bulbe.evaluate(el => getComputedStyle(el).fill)).toBe(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bleu").trim()).then(hex => {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`;
  }));
});
