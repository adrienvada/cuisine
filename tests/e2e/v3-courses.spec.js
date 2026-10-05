/* Troisième vague, lot « courses » : la coche tracée, le trait de crayon, le rangement sur place, la barre et le compteur, la liste terminée (tampon, herbes), le balayage d'un article libre, le glisser-déposer des rayons, le volet de provenance, vider / tout décocher. */

import { test, expect, preremplir, entree, lireCarnet, pageStable, attendreCalme } from "./outils.js";
import { annuler, basculer, ligneDe, titresRayons } from "./outils-courses.js";

const QUICHE = [entree("quiche-lorraine", { k: "q1" })];
const DEUX_RECETTES = [entree("quiche-lorraine", { k: "q1" }), entree("focaccia-romarin", { k: "f1" })];
const LIBRES = [{ id: "e1", name: "Éponges" }, { id: "e2", name: "Glaçons" }];

/* Les herbes sont une couche fixe, aria-hidden, posée sur le body par js/ui/effets.js. */
const couche = page => page.locator("body > div[aria-hidden='true'][style*='position: fixed']");

/* Rien n'est resté de travers : pas de translate, de scale ni de style de sortie sur les lignes. */
const lignesPropres = page => page.$$eval("li.art", els => els.every(li => {
  const s = getComputedStyle(li);
  return s.translate === "none" && s.opacity === "1" && !li.style.translate && !li.style.height;
}));

test("cocher : la coche se trace, le nom est rayé, puis la ligne part au panier à sa place, sans transform résiduel", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: QUICHE } });
  await page.goto("/#/courses");
  await pageStable(page);
  const ligne = ligneDe(page, "lardons");
  await basculer(page, "lardons");

  // Tout de suite : l'état est enregistré, la ligne est cochée mais n'a pas bougé.
  await expect(ligne).toHaveClass(/cochee/);
  expect((await lireCarnet(page)).checked).toEqual({ lardons: true });
  await expect(page.locator("details.panier")).toHaveCount(0);
  // La coche et le trait de crayon sont des tracés SVG : ils vont de « tout caché » à « tout dessiné ».
  const decalage = sel => ligne.locator(sel).evaluate(el => parseFloat(getComputedStyle(el).strokeDashoffset));
  await expect.poll(() => decalage(".tick path")).toBe(0);
  await expect.poll(() => decalage(".rature path")).toBe(0);
  await expect(ligne.locator(".rature path")).toHaveAttribute("pathLength", "1");

  // Puis elle se range : plus dans son rayon, au panier, rien de résiduel.
  const panier = page.locator("details.panier");
  await expect(panier.locator("summary")).toHaveText("Dans le panier (1)");
  await expect(page.locator("section.rayon:not(.placard) li", { hasText: "Lardons fumés" })).toHaveCount(0);
  await expect(page.locator("section.rayon", { has: page.getByRole("heading", { name: "Boucherie & charcuterie" }) })).toHaveCount(0);
  await panier.locator("summary").click();
  await expect(panier.locator('li.art input[data-key="lardons"]')).toBeChecked();
  await pageStable(page);
  expect(await lignesPropres(page)).toBe(true);
  expect(await page.evaluate(() => document.querySelectorAll("[data-sortant]").length)).toBe(0);
});

test("décocher : la coche se défait, la ligne remonte dans son rayon, à sa place d'origine", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: QUICHE, checked: { oeufs: true } } });
  await page.goto("/#/courses");
  const avant = await page.locator("section.rayon:not(.placard) input[data-key]").evaluateAll(els => els.map(e => e.dataset.key));
  await page.locator("details.panier summary").click();
  await page.locator('details.panier input[data-key="oeufs"] + .tick').click();
  await expect(page.locator("details.panier")).toHaveCount(0);
  await pageStable(page);
  const apres = await page.locator("section.rayon:not(.placard) input[data-key]").evaluateAll(els => els.map(e => e.dataset.key));
  expect(apres).toContain("oeufs");
  expect(apres.length).toBe(avant.length + 1);
  // L'ordre est celui de la liste d'origine : la ligne n'est pas simplement ajoutée à la fin.
  await page.reload();
  // reload n'attend pas la première vue (les vues se chargent à la demande) : on attend la liste.
  await expect(page.locator("section.rayon:not(.placard) input[data-key]").first()).toBeAttached();
  await pageStable(page);
  expect(await page.locator("section.rayon:not(.placard) input[data-key]").evaluateAll(els => els.map(e => e.dataset.key))).toEqual(apres);
  expect(await lignesPropres(page)).toBe(true);
});

test("une rafale de coches : chaque ligne finit son mouvement, aucune ne se perd ni ne revient à tort", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: DEUX_RECETTES } });
  await page.goto("/#/courses");
  await pageStable(page);
  const cles = await page.locator("section.rayon:not(.placard) input[data-key]").evaluateAll(els => els.map(e => e.dataset.key));
  expect(cles.length).toBeGreaterThanOrEqual(5);
  const [a, b, c, d, e] = cles;
  // Cinq coches sans attendre, dont une défaite aussitôt (b) et une refaite (b encore).
  for (const k of [a, b, c, d]) await ligneDe(page, k).locator(".tick").click();
  await ligneDe(page, b).locator(".tick").click();   // b décoché
  await ligneDe(page, e).locator(".tick").click();
  await ligneDe(page, b).locator(".tick").click();   // b recoché
  const attendues = [a, b, c, d, e];
  await expect(page.locator("details.panier summary")).toHaveText(`Dans le panier (${attendues.length})`);
  await pageStable(page);
  expect(Object.keys((await lireCarnet(page)).checked).sort()).toEqual([...attendues].sort());
  // Une seule case par article, toutes cochées au panier, aucune restée dans un rayon.
  for (const k of attendues) await expect(page.locator(`input[data-key="${k}"]`)).toHaveCount(1);
  expect(await page.locator("section.rayon:not(.placard) input:checked").count()).toBe(0);
  await page.locator("details.panier summary").click();
  expect(await page.locator("details.panier input:checked").count()).toBe(attendues.length);
  expect(await lignesPropres(page)).toBe(true);
});

test("la barre avance avec le geste et le compteur dit la même chose que la barre", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: QUICHE } });
  await page.goto("/#/courses");
  const total = await page.locator("section.rayon:not(.placard) input[data-key]").count();
  const barre = page.locator(".avance");
  await expect(barre).toHaveAttribute("aria-valuenow", "0");
  await basculer(page, "lardons");
  // La barre et le compteur répondent à la coche, avant que la ligne ne parte.
  await expect(barre).toHaveAttribute("aria-valuenow", "1");
  await expect(page.locator(".avance-txt")).toHaveText(`1 / ${total}`);
  await expect(page.locator(".avance-txt strong")).toHaveText(`1 / ${total}`);
  await expect.poll(() => barre.locator("span").evaluate(el => el.style.clipPath)).toContain(`${100 - Math.round(100 / total)}%`);
  await pageStable(page);
  await expect(page.locator(".avance-txt")).toHaveText(`1 / ${total}`);
  await expect(barre).not.toHaveClass(/complete/);
});

test("liste terminée : barre d'or, tampon et herbes, une seule fois ; ni au retour sur l'onglet ni au redessin", async ({ page, context }) => {
  await preremplir(context, { carnet: { extras: LIBRES } });
  await page.goto("/#/courses");
  await pageStable(page);
  await expect(page.locator(".tampon-fini")).toHaveCSS("opacity", "0");
  await basculer(page, "x-e1");
  await expect(couche(page)).toHaveCount(0);
  await basculer(page, "x-e2");
  await expect(page.locator(".avance")).toHaveClass(/complete/);
  await expect(page.locator(".tampon-fini")).toHaveClass(/pose/);
  await expect(page.locator(".tampon-fini")).toHaveCSS("opacity", "1");
  await expect(couche(page)).toHaveCount(1);
  // Seize à vingt feuilles, aria-hidden, sans pointer-events, retirées à la fin.
  const nb = await couche(page).locator("svg").count();
  expect(nb).toBeGreaterThanOrEqual(12);
  expect(nb).toBeLessThanOrEqual(20);
  await expect(couche(page)).toHaveCSS("pointer-events", "none");
  await expect(couche(page)).toHaveCount(0);

  // Retour sur l'onglet : le tampon est posé, rien ne s'envole.
  await page.evaluate(() => { location.hash = "#/menu"; });
  await page.waitForFunction(() => document.title.includes("menu") || !document.getElementById("courses-root"));
  await page.evaluate(() => { location.hash = "#/courses"; });
  await expect(page.locator(".tampon-fini")).toHaveClass(/pose/);
  await attendreCalme(() => couche(page).count(), { duree: 500 });
  await expect(couche(page)).toHaveCount(0);
  await expect(page.locator(".fini")).toHaveText("Tout est dans le panier.");

  // Décocher une ligne : la liste n'est plus terminée, le tampon part ; la recocher la termine de nouveau.
  await page.locator("details.panier summary").click();
  await page.locator('details.panier input[data-key="x-e1"] + .tick').click();
  await expect(page.locator(".tampon-fini")).not.toHaveClass(/pose/);
  await expect(page.locator(".avance")).not.toHaveClass(/complete/);
  await expect(couche(page)).toHaveCount(0);
});

test("liste terminée en mouvement réduit : l'état final, sans herbes, et la vibration suit son réglage", async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => { window.__vibrations = []; navigator.vibrate = m => { window.__vibrations.push(m); return true; }; });
  await preremplir(context, { carnet: { extras: LIBRES } });
  await page.goto("/#/courses");
  await basculer(page, "x-e1");
  await basculer(page, "x-e2");
  await expect(page.locator(".tampon-fini")).toHaveCSS("opacity", "1");
  await expect(page.locator(".avance")).toHaveClass(/complete/);
  await expect(page.locator(".fini")).toBeVisible();
  expect(await attendreCalme(() => couche(page).count(), { duree: 500 })).toBe(0);
  // « tic » à la première coche, « succès » à celle qui termine.
  const motifs = await page.evaluate(() => window.__vibrations);
  expect(motifs.length).toBe(2);
  expect(motifs[0]).toEqual([10]);
  expect(motifs[1].length).toBeGreaterThan(1);
  // Aucune animation Web n'a été jouée par la liste.
  expect(await page.evaluate(() => document.getAnimations().filter(a => !(a instanceof CSSTransition)).length)).toBe(0);
});

test("articles libres : l'ajout arrive à sa place, le champ se vide et garde le focus", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: QUICHE } });
  await page.goto("/#/courses");
  const champ = page.locator("#extra-input");
  await champ.fill("Éponges");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.locator("section.rayon", { has: page.getByRole("heading", { name: "Autre" }) }).locator("li.art")).toHaveCount(1);
  await expect(champ).toHaveValue("");
  await expect(champ).toBeFocused();
  await champ.fill("Glaçons");
  await champ.press("Enter");
  await expect(page.locator("li.libre")).toHaveCount(2);
  await pageStable(page);
  expect(await lignesPropres(page)).toBe(true);
  expect((await lireCarnet(page)).extras.map(x => x.name)).toEqual(["Éponges", "Glaçons"]);
});

/* Un balayage au doigt, simulé à la souris (les Pointer Events sont les mêmes) : pas à pas, pour que le geste se verrouille. */
async function balayer(page, loc, dx, { pas = 8 } = {}) {
  const boite = await loc.boundingBox();
  const x0 = boite.x + boite.width * 0.45;
  const y = boite.y + boite.height / 2;
  await page.mouse.move(x0, y);
  await page.mouse.down();
  for (let i = 1; i <= pas; i++) await page.mouse.move(x0 + dx * i / pas, y);
  await page.mouse.up();
}

test("balayer un article libre vers la gauche le supprime ; « Annuler » le rend à sa place", async ({ page, context }) => {
  await preremplir(context, { carnet: { extras: LIBRES } });
  await page.goto("/#/courses");
  await pageStable(page);
  await balayer(page, ligneDe(page, "x-e1").locator("label"), -240);
  await expect(page.locator("li.art", { hasText: "Éponges" })).toHaveCount(0);
  await expect(page.locator("#toast")).toContainText("« Éponges » retiré");
  expect((await lireCarnet(page)).extras.map(x => x.name)).toEqual(["Glaçons"]);
  await annuler(page);
  await expect(page.locator("li.libre")).toHaveCount(2);
  expect(await page.locator("li.libre .nom").allTextContents()).toEqual(["Éponges", "Glaçons"]);
  await pageStable(page);
  expect(await lignesPropres(page)).toBe(true);
  expect((await lireCarnet(page)).extras.map(x => x.name)).toEqual(["Éponges", "Glaçons"]);
});

test("un balayage trop court ne supprime rien : la ligne revient", async ({ page, context }) => {
  await preremplir(context, { carnet: { extras: LIBRES } });
  await page.goto("/#/courses");
  await pageStable(page);
  await balayer(page, ligneDe(page, "x-e1").locator("label"), -30);
  await pageStable(page);
  await expect(page.locator("li.libre")).toHaveCount(2);
  expect(await page.locator("li.libre > label").evaluateAll(els => els.map(e => getComputedStyle(e).translate))).toEqual(["none", "none"]);
  // Le geste n'a pas coché la ligne (le clic qui le suit est avalé).
  expect((await lireCarnet(page)).checked ?? {}).toEqual({});
});

test("balayer en mouvement réduit supprime sans déplacement, et le bouton ✕ reste la voie du clavier", async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await preremplir(context, { carnet: { extras: LIBRES } });
  await page.goto("/#/courses");
  await balayer(page, ligneDe(page, "x-e1").locator("label"), -240);
  await expect(page.locator("li.libre")).toHaveCount(1);
  await ligneDe(page, "x-e2").getByRole("button", { name: "Supprimer Glaçons" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("li.libre")).toHaveCount(0);
});

test("le volet de provenance s'ouvre et se ferme en hauteur", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("focaccia-romarin", { k: "f1" }), entree("cake-sale", { k: "c1" })] } });
  await page.goto("/#/courses");
  await pageStable(page);
  const ligne = page.locator("li.art", { has: page.locator('input[data-key="farine"]') }).first();
  const nom = ligne.locator("button.nom");
  const volet = ligne.locator(".origine");
  await expect(volet).toBeHidden();
  await nom.click();
  await expect(nom).toHaveAttribute("aria-expanded", "true");
  await expect(volet).toBeVisible();
  await pageStable(page);
  const pleine = (await volet.boundingBox()).height;
  expect(pleine).toBeGreaterThan(20);
  await nom.click();
  await expect(nom).toHaveAttribute("aria-expanded", "false");
  await expect(volet).toBeHidden();
  expect(await volet.evaluate(el => el.style.height)).toBe("");
});

test("ranger les rayons : monter / descendre glisse sans redessiner et le focus reste sur le bouton", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: QUICHE, extras: LIBRES } });
  await page.goto("/#/courses");
  const avant = await titresRayons(page);
  await page.getByRole("button", { name: "Ranger les rayons" }).click();
  const ol = page.locator(".ranger-liste");
  await ol.evaluate(el => { el.dataset.temoin = "1"; });
  const premier = ol.locator("li[data-r]").nth(0);
  await premier.locator('[data-sens="1"]').focus();
  await page.keyboard.press("Enter");
  // Le même <ol> (pas de redessin) et le bouton déplacé garde le focus.
  expect(await ol.evaluate(el => el.dataset.temoin)).toBe("1");
  await expect(page.locator(`[data-deplacer="${avant[0]}"][data-sens="1"]`)).toBeFocused();
  await expect(ol.locator("li[data-r]").nth(1)).toHaveAttribute("data-r", avant[0]);
  await pageStable(page);
  expect(await lignesPropres(page)).toBe(true);
  expect(await ol.locator("li[data-r]").evaluateAll(els => els.map(e => getComputedStyle(e).translate))).toEqual(els0(await ol.locator("li[data-r]").count()));
  await page.getByRole("button", { name: "Terminé" }).click();
  const apres = await titresRayons(page);
  expect(apres.slice(0, 2)).toEqual([avant[1], avant[0]]);
  expect(apres.at(-1)).toBe("Autre");
});
const els0 = n => Array(n).fill("none");

test("ranger les rayons : glisser la poignée pose le rayon au bon créneau, l'ordre est retenu", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: DEUX_RECETTES, extras: LIBRES } });
  await page.goto("/#/courses");
  const avant = await titresRayons(page);
  expect(avant.length).toBeGreaterThanOrEqual(4);
  await page.getByRole("button", { name: "Ranger les rayons" }).click();
  const ol = page.locator(".ranger-liste");
  await pageStable(page);
  const lignes = ol.locator("li[data-r]");
  const poignee = lignes.nth(0).locator(".poignee");
  const p = await poignee.boundingBox();
  const cible = await lignes.nth(2).boundingBox();
  const x = p.x + p.width / 2;
  await page.mouse.move(x, p.y + p.height / 2);
  await page.mouse.down();
  const arrivee = cible.y + cible.height / 2 + 4;
  for (let i = 1; i <= 10; i++) await page.mouse.move(x, p.y + p.height / 2 + (arrivee - p.y - p.height / 2) * i / 10);
  await expect(lignes.nth(0)).toHaveClass(/en-main/);
  await page.mouse.up();
  await expect(page.locator("li.en-main")).toHaveCount(0);
  await pageStable(page);
  const ordre = await lignes.evaluateAll(els => els.map(e => e.dataset.r));
  expect(ordre.slice(0, 3)).toEqual([avant[1], avant[2], avant[0]]);
  expect(await lignes.evaluateAll(els => els.map(e => getComputedStyle(e).translate))).toEqual(els0(ordre.length));
  expect((await lireCarnet(page)).ordreRayons.filter(r => avant.includes(r)).slice(0, 3)).toEqual([avant[1], avant[2], avant[0]]);
  await page.getByRole("button", { name: "Terminé" }).click();
  expect((await titresRayons(page)).slice(0, 3)).toEqual([avant[1], avant[2], avant[0]]);
});

test("tout décocher : les lignes du panier partent, celles des rayons arrivent ; « Annuler » les rend", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: QUICHE, checked: { lardons: true, oeufs: true, "creme-liquide": true } } });
  await page.goto("/#/courses");
  await page.getByRole("button", { name: "Tout décocher" }).click();
  await expect(page.locator("details.panier")).toHaveCount(0);
  await expect(page.locator('section.rayon:not(.placard) input[data-key="lardons"]')).toHaveCount(1);
  await expect(page.locator(".avance-txt strong .faits")).toHaveText("0");
  await pageStable(page);
  expect(await lignesPropres(page)).toBe(true);
  await annuler(page);
  await expect(page.locator("details.panier summary")).toContainText("(3)");
  await expect(page.locator("details.panier")).toHaveCount(1);
});

test("vider la liste : les blocs partent, la liste vide arrive avec son illustration tracée ; « Annuler » rend tout", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: QUICHE, extras: LIBRES } });
  await page.goto("/#/courses");
  await pageStable(page);
  await page.getByRole("button", { name: "Vider la liste" }).click();
  await expect(page.locator(".empty")).toBeVisible();
  const illo = page.locator(".empty-illo.trace");
  await expect(illo).toBeVisible();
  expect(await illo.locator('path[pathLength="1"]').count()).toBeGreaterThanOrEqual(4);
  await expect(page.locator("li.art")).toHaveCount(0);
  await annuler(page);
  await expect(page.locator("li.libre")).toHaveCount(2);
  await expect(page.locator(".menu-ligne")).toContainText("1 recette au menu");
  await pageStable(page);
  expect(await lignesPropres(page)).toBe(true);
});

test("vider puis « Annuler » aussitôt : la liste revient, la sortie ne redessine pas une liste vide par-dessus", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: QUICHE, extras: LIBRES } });
  await page.goto("/#/courses");
  await pageStable(page);
  await page.getByRole("button", { name: "Vider la liste" }).click();
  await annuler(page);
  await attendreCalme(() => page.locator(".empty, li.libre").count(), { duree: 900 });
  await expect(page.locator(".empty")).toHaveCount(0);
  await expect(page.locator("li.libre")).toHaveCount(2);
  expect((await lireCarnet(page)).menu.length).toBe(1);
});

test("la branche d'olivier se trace une fois par session, pas à chaque visite", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: QUICHE } });
  await page.goto("/#/courses");
  const branche = page.locator(".head-branch");
  await expect(branche).toHaveClass(/trace/);
  await expect(branche.locator('path[pathLength="1"]')).toHaveCount(1);
  expect(await branche.locator(".o-f").count()).toBeGreaterThanOrEqual(8);
  await page.evaluate(() => { location.hash = "#/menu"; });
  await page.waitForFunction(() => !document.getElementById("courses-root"));
  await page.evaluate(() => { location.hash = "#/courses"; });
  await expect(page.locator(".head-branch")).toBeVisible();
  await expect(page.locator(".head-branch")).not.toHaveClass(/trace/);
});

for (const [theme, largeur] of [["clair", 320], ["sombre", 320], ["clair", 375], ["sombre", 375]]) {
  test(`aucun débordement horizontal à ${largeur} px (${theme}), liste en cours et liste terminée, cibles de 44 px`, async ({ page, context }) => {
    await preremplir(context, { carnet: { menu: DEUX_RECETTES, extras: LIBRES, checked: { "x-e1": true } } });
    await page.setViewportSize({ width: largeur, height: 800 });
    await page.goto("/#/courses");
    if (theme === "sombre") await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    await pageStable(page);
    const deborde = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(await deborde()).toBe(false);
    // La poignée de rangement et les boutons de rayon ont une cible d'au moins 44 px.
    await page.getByRole("button", { name: "Ranger les rayons" }).click();
    await pageStable(page);
    expect(await deborde()).toBe(false);
    for (const loc of [page.locator(".poignee").first(), page.locator(".r-btn").first()]) {
      const boite = await loc.boundingBox();
      expect(boite.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole("button", { name: "Terminé" }).click();
    // Tout cocher : le tampon sur le bandeau ne fait pas déborder la page.
    for (const k of await page.locator("section.rayon input[data-key]").evaluateAll(els => els.map(e => e.dataset.key))) await ligneDe(page, k).locator(".tick").click();
    await expect(page.locator(".tampon-fini")).toHaveClass(/pose/);
    await pageStable(page);
    expect(await deborde()).toBe(false);
    const tampon = await page.locator(".tampon-fini").boundingBox();
    expect(tampon.x).toBeGreaterThanOrEqual(0);
    expect(tampon.x + tampon.width).toBeLessThanOrEqual(largeur);
  });
}

test("un nom sur plusieurs lignes est barré d'un line-through (le trait de crayon tomberait entre deux lignes)", async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await preremplir(context, { carnet: { extras: [{ id: "e9", name: "Un très long nom d'article libre qui passe sur plusieurs lignes à 320 pixels de large" }, { id: "e8", name: "Éponges" }] } });
  await page.goto("/#/courses");
  await pageStable(page);
  const long = page.locator('li.art[data-art="x-e9"] .nom');
  await expect(long).toHaveClass(/multi/);
  await expect(page.locator('li.art[data-art="x-e8"] .nom')).not.toHaveClass(/multi/);
  await page.locator('li.art[data-art="x-e9"] .tick').click();
  await expect(long).toHaveCSS("text-decoration-line", "line-through");
  await expect(long.locator(".rature")).toBeHidden();
});
