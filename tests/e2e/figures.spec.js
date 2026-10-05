/* Les figures des savoirs : la page d'un fondamental, la feuille ouverte depuis une recette, le zoom,
   la lisibilité à 360 px et en sombre, et la tolérance à l'absence du fichier. */

import { test, expect } from "./outils.js";
import { contraste } from "./outils-courses.js";
import { mesurerFigures } from "../../tools/capturer-savoir.mjs";

test("figures : la page de Maillard montre ses figures, la première juste après l'accroche", async ({ page }) => {
  await page.goto("/#/fondamental/maillard");
  const figures = page.locator(".f-page .fg");
  await expect(figures).toHaveCount(4);
  // « tete » : entre l'accroche et le premier bloc.
  const ordre = await page.locator(".f-page").evaluate(el => [...el.children].slice(0, 3).map(c => c.tagName + "." + (c.className || "").split(" ")[0]));
  expect(ordre).toEqual(["P.f-accroche", "FIGURE.fg", "DIV.f-bloc"]);
  // Chacune a son SVG nommé et sa légende.
  for (let i = 0; i < 4; i++) {
    const fig = figures.nth(i);
    await expect(fig.locator('svg[role="img"]')).toHaveAttribute("aria-labelledby", /fg-\w+-t fg-\w+-d/);
    await expect(fig.locator("svg title")).not.toBeEmpty();
    await expect(fig.locator("svg desc")).not.toBeEmpty();
    await expect(fig.locator(".fg-titre")).not.toBeEmpty();
    await expect(fig.locator(".fg-legende")).not.toBeEmpty();
  }
  // Les emplacements : « cas » après « Selon les cas », « reperes » dans « À retenir », « pourquoi » dans « Pourquoi ça marche ».
  await expect(page.locator(".f-bloc", { hasText: "À retenir" }).locator(".fg")).toHaveCount(1);
  await expect(page.locator(".f-bloc", { hasText: "Pourquoi ça marche" }).locator(".fg")).toHaveCount(1);
  expect(await page.locator(".f-bloc", { hasText: "Selon les cas" }).evaluate(b => b.nextElementSibling.className)).toContain("fg");
  // Les identifiants sont uniques dans la page.
  expect(await page.evaluate(() => { const ids = [...document.querySelectorAll("[id]")].map(e => e.id); return ids.length - new Set(ids).size; })).toBe(0);
});

test("figures : le catalogue annonce « 4 schémas » sur Maillard, et rien sur une fiche sans figure", async ({ page }) => {
  /* Toutes les fiches ont désormais leurs figures : on en retire une au vol pour
     garder la preuve qu'une fiche sans figure n'affiche aucun badge. */
  await page.route("**/js/figures.js", async route => {
    const reponse = await route.fetch();
    await route.fulfill({ response: reponse, body: (await reponse.text()) + '\ndelete FIGURES["deglacage"];\n' });
  });
  await page.goto("/#/fondamentaux");
  await expect(page.locator(".f-item", { hasText: "La réaction de Maillard" }).locator(".f-item-fig")).toHaveText("4 schémas");
  await expect(page.locator(".f-item", { hasText: "Le déglaçage" }).locator(".f-item-fig")).toHaveCount(0);
});

for (const [nom, theme] of [["clair", "light"], ["sombre", "dark"]]) {
  test(`figures (${nom}) : à 360 px rien ne déborde, aucun texte coupé, trop petit ou superposé`, async ({ page, context }) => {
    await context.addInitScript(t => { try { localStorage.setItem("theme", t); } catch {} }, theme);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/#/fondamental/maillard");
    await expect(page.locator(".f-page .fg")).toHaveCount(4);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBe(theme === "dark" ? "dark" : null);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const rapport = await page.evaluate(mesurerFigures);
    expect(rapport).toHaveLength(4);
    for (const r of rapport) expect(r.problemes, r.titre).toEqual([]);
  });
}

test("figures (sombre) : le texte des figures reste lisible, 4,5:1 sur le fond de la carte", async ({ page, context }) => {
  await context.addInitScript(() => { try { localStorage.setItem("theme", "dark"); } catch {} });
  await page.goto("/#/fondamental/maillard");
  await expect(page.locator(".f-page .fg")).toHaveCount(4);
  const mesures = await page.evaluate(() => {
    const fond = getComputedStyle(document.querySelector(".fg-cadre")).backgroundColor;
    return {
      fond,
      textes: [...document.querySelectorAll(".fg-svg text")].map(t => getComputedStyle(t).fill),
      legende: [getComputedStyle(document.querySelector(".fg-legende")).color, getComputedStyle(document.querySelector(".fg-legende")).backgroundColor]
    };
  });
  // Les textes posés sur une teinte claire sont mesurés en unitaire (css) ; ici, les textes de la carte nue.
  for (const c of new Set(mesures.textes)) {
    if (!/^rgb/.test(c)) continue;
    expect(contraste(c, mesures.fond), c).toBeGreaterThanOrEqual(4.5);
  }
});

test("figures : la feuille ouverte depuis une recette montre les figures du fondamental", async ({ page }) => {
  await page.goto("/#/recette/quiche-lorraine");
  const etape = page.locator("#steps-list li", { hasText: "Les lardons" });
  await etape.locator(".s-cue").first().click();
  await etape.locator('.s-lien[data-fond="maillard"]').first().click();
  const feuille = page.getByRole("dialog", { name: "La réaction de Maillard" });
  await expect(feuille).toBeVisible();
  await expect(feuille.locator(".fg")).toHaveCount(4);
  await expect(feuille.locator(".fg-svg").first()).toBeVisible();
  const largeurFeuille = await feuille.evaluate(el => el.clientWidth);
  for (const largeur of await feuille.locator(".fg").evaluateAll(fs => fs.map(f => f.getBoundingClientRect().width))) {
    expect(largeur).toBeLessThanOrEqual(largeurFeuille);
  }
});

test("figures : un appui sur le bouton agrandit la figure dans une feuille, Échap la referme", async ({ page }) => {
  await page.goto("/#/fondamental/maillard");
  const bouton = page.locator(".fg-agrandir").first();
  await expect(bouton).toHaveAttribute("aria-label", /^Agrandir le schéma : /);
  await bouton.focus();
  await page.keyboard.press("Enter");
  const zoom = page.getByRole("dialog", { name: "D'une rencontre à l'odeur du rôti" });
  await expect(zoom).toBeVisible();
  await expect(zoom.locator(".fg-zoomee svg")).toBeVisible();
  await expect(zoom.locator(".fg-agrandir")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(bouton).toBeFocused();
  await expect(page).toHaveURL(/#\/fondamental\/maillard$/);
  // Toucher le dessin fait de même.
  await page.locator(".fg-svg").nth(1).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("figures : sans js/figures.js, la fiche s'affiche comme avant", async ({ page }) => {
  await page.route("**/js/figures.js", route => route.abort());
  await page.goto("/#/fondamental/maillard");
  await expect(page.locator(".f-page")).toContainText("Pourquoi ça marche");
  await expect(page.locator(".f-page .f-rec", { hasText: "Quiche lorraine" })).toBeVisible();
  await expect(page.locator(".fg")).toHaveCount(0);
  await page.evaluate(() => { location.hash = "#/fondamentaux"; });
  await expect(page.locator(".f-item", { hasText: "La réaction de Maillard" })).toBeVisible();
  await expect(page.locator(".f-item-fig")).toHaveCount(0);
});

test("figures : un fichier de figures qui tarde ne retarde pas la fiche au-delà d'un instant", async ({ page }) => {
  await page.route("**/js/figures.js", () => new Promise(() => {}));   // ne répond jamais
  const debut = Date.now();
  await page.goto("/#/fondamental/maillard", { waitUntil: "commit" });   // une requête en suspens retarde « load » : on n'attend pas cet événement
  await expect(page.locator(".f-page")).toContainText("Pourquoi ça marche");
  expect(Date.now() - debut).toBeLessThan(5000);
  await expect(page.locator(".fg")).toHaveCount(0);
});

test("figures : un tracé animé finit visible, et rien ne s'anime sous mouvement réduit", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#/fondamental/maillard");
  const trace = page.locator(".fg-trace").first();
  await trace.scrollIntoViewIfNeeded();
  await expect(trace).toHaveCSS("stroke-dashoffset", "0px");
});

test("figures : le bouton d'agrandissement est dans la ligne du titre, hors du dessin, avec une cible de 44 px", async ({ page }) => {
  await page.goto("/#/fondamental/maillard");
  const figures = page.locator(".f-page .fg");
  await expect(figures).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    const fig = figures.nth(i);
    await fig.scrollIntoViewIfNeeded();
    const bouton = fig.locator(".fg-agrandir");
    await expect(bouton).toHaveAttribute("aria-label", /^Agrandir le schéma : /);
    await expect(fig.locator(".fg-cadre .fg-agrandir")).toHaveCount(0);
    const [b, svg, titre] = await Promise.all([bouton.boundingBox(), fig.locator("svg.fg-svg").boundingBox(), fig.locator(".fg-titre").boundingBox()]);
    expect(b.width).toBeGreaterThanOrEqual(43.5);
    expect(b.height).toBeGreaterThanOrEqual(43.5);
    // Aucun recouvrement avec le dessin : le bouton est entièrement sous lui.
    expect(b.y + 0.5).toBeGreaterThanOrEqual(svg.y + svg.height);
    // À droite du titre, sur sa ligne.
    expect(b.x).toBeGreaterThan(titre.x + 20);
    expect(b.x + b.width).toBeLessThanOrEqual(390.5);
  }
  // L'outil de capture le dit aussi : aucun signalement sur le bouton (les autres contrôles se font à 360 px, plus haut).
  const rapport = await page.evaluate(mesurerFigures);
  expect(rapport.flatMap(x => x.problemes).filter(p => /bouton/.test(p))).toEqual([]);
});

test("capture : la mesure repère un bouton de zoom posé sur le dessin ou sur un texte, et un texte barré par un tracé", async ({ page }) => {
  await page.goto("/#/fondamental/maillard");
  await expect(page.locator(".f-page .fg")).toHaveCount(4);
  // Bien placé : rien à signaler.
  expect((await page.evaluate(mesurerFigures)).flatMap(r => r.problemes).filter(p => /bouton/.test(p))).toEqual([]);
  // Ramené sur le dessin (comme avant) : signalé, avec le texte qu'il recouvre.
  await page.addStyleTag({ content: ".fg { position: relative; } .fg-agrandir { position: absolute !important; top: 40px; left: 60px; margin: 0 !important; width: 28px !important; height: 28px !important; }" });
  const problemes = (await page.evaluate(mesurerFigures)).flatMap(r => r.problemes).filter(p => /bouton/.test(p));
  expect(problemes.some(p => /recouvre le dessin/.test(p))).toBe(true);
  expect(problemes.some(p => /cible de 44 px/.test(p))).toBe(true);
  expect(problemes.some(p => /recouvre «/.test(p))).toBe(true);
});

test("capture : un trait qui traverse un texte est signalé, à part des problèmes", async ({ page }) => {
  await page.goto("/#/fondamental/torrefaction");
  const fig = page.locator(".f-page .fg-courbe").first();
  await expect(fig).toBeVisible();
  const avant = (await page.evaluate(mesurerFigures)).flatMap(r => r.signalements);
  // On traverse volontairement la première étiquette de la courbe par un repère.
  await page.evaluate(() => {
    const svg = document.querySelector(".fg-courbe svg.fg-svg");
    const t = [...svg.querySelectorAll("text")].find(x => x.textContent.trim().length > 3);
    const b = t.getBBox();
    const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l.setAttribute("class", "fg-t-terra fg-t-fin fg-tirets");
    for (const [k, v] of Object.entries({ x1: b.x + b.width / 2, y1: b.y - 6, x2: b.x + b.width / 2, y2: b.y + b.height + 6 })) l.setAttribute(k, v);
    t.parentNode.appendChild(l);
  });
  const apres = (await page.evaluate(mesurerFigures)).flatMap(r => r.signalements);
  expect(apres.length).toBeGreaterThan(avant.length);
  expect(apres.some(s => /barré par une ligne de repère/.test(s))).toBe(true);
});

test("figures : sur téléphone, la figure agrandie défile avec un indice visible (ombre, ligne d'indication)", async ({ page }) => {
  await page.goto("/#/fondamental/maillard");
  await page.locator(".fg-agrandir").first().click();
  const zoom = page.getByRole("dialog", { name: "D'une rencontre à l'odeur du rôti" });
  await expect(zoom).toBeVisible();
  const boite = zoom.locator(".fg-zoom-boite");
  const corps = zoom.locator(".fg-zoom-corps");
  expect(await corps.evaluate(c => c.scrollWidth > c.clientWidth + 4)).toBe(true);
  await expect(boite).toHaveClass(/fg-defile/);
  await expect(zoom.locator(".fg-zoom-indice")).toBeVisible();
  expect(await boite.evaluate(b => getComputedStyle(b, "::after").content)).not.toBe("none");
  // Au bout du défilement, l'ombre s'efface.
  await expect(boite).not.toHaveClass(/fg-fin/);
  await corps.evaluate(c => { c.scrollLeft = c.scrollWidth; });
  await expect(boite).toHaveClass(/fg-fin/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("figures : sur un grand écran, la figure agrandie tient sans défiler ni indice", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.goto("/#/fondamental/maillard");
  await page.locator(".fg-agrandir").first().click();
  const zoom = page.getByRole("dialog", { name: "D'une rencontre à l'odeur du rôti" });
  await expect(zoom.locator(".fg-zoomee svg")).toBeVisible();
  await expect(zoom.locator(".fg-zoom-boite")).not.toHaveClass(/fg-defile/);
  await expect(zoom.locator(".fg-zoom-indice")).toBeHidden();
});

test("symboles : une fiche qui en emploie les dessine (chaque <use> a son <symbol> et une taille)", async ({ page }) => {
  await page.goto("/#/fondamental/emulsion");
  await expect(page.locator(".f-page .fg").first()).toBeVisible();
  const rapport = await page.evaluate(() => {
    const usages = [...document.querySelectorAll(".fg-svg use")];
    const ids = [...document.querySelectorAll("[id]")].map(e => e.id);
    return {
      n: usages.length,
      sansCible: usages.filter(u => !document.getElementById(u.getAttribute("href").slice(1))).length,
      invisibles: usages.filter(u => u.getBoundingClientRect().width < 1).length,
      doublons: ids.length - new Set(ids).size,
      symboles: document.querySelectorAll(".fg-svg symbol").length
    };
  });
  expect(rapport.n).toBeGreaterThan(40);
  expect(rapport.sansCible).toBe(0);
  expect(rapport.invisibles).toBe(0);
  expect(rapport.doublons).toBe(0);
  expect(rapport.symboles).toBe(1);   // un seul <symbol> (emulsifiant) : les autres figures de la fiche n'en emploient aucun
});

test("recherche : un titre de figure fait trouver sa fiche", async ({ page }) => {
  await page.goto("/#/fondamentaux");
  await page.locator("#f-search").fill("deux poeles deux destins");
  await expect(page.locator(".f-item")).toHaveCount(1);
  await expect(page.locator('.f-item[href="#/fondamental/eau-coloration"]')).toBeVisible();
});

test("figures : arrivées après le délai, elles complètent la fiche ouverte sans la redessiner (défilement et focus gardés)", async ({ page }) => {
  await page.route("**/js/figures.js", async route => { await new Promise(r => setTimeout(r, 5000)); await route.continue(); });
  await page.goto("/#/fondamental/maillard", { waitUntil: "commit" });
  await expect(page.locator(".f-page")).toContainText("Pourquoi ça marche");
  await expect(page.locator(".fg")).toHaveCount(0);
  // On lit : la page est défilée jusqu'aux recettes, le focus est sur « Partager », la page est marquée.
  await page.locator(".f-recettes").scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    document.querySelector(".f-page").dataset.marque = "avant";
    document.getElementById("f-share-page").focus({ preventScroll: true });
  });
  const avant = await page.locator(".f-recettes").evaluate(e => e.getBoundingClientRect().top);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(300);
  // Les figures arrivent : les quatre sont insérées, chacune à sa place.
  await expect(page.locator(".f-page .fg")).toHaveCount(4, { timeout: 15000 });
  const apres = await page.locator(".f-recettes").evaluate(e => e.getBoundingClientRect().top);
  expect(Math.abs(apres - avant), "le contenu sous les yeux n'a pas bougé").toBeLessThan(3);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(300);
  expect(await page.evaluate(() => document.querySelector(".f-page").dataset.marque)).toBe("avant");   // le même nœud : rien n'a été redessiné
  expect(await page.evaluate(() => document.activeElement.id)).toBe("f-share-page");
  const ordre = await page.locator(".f-page").evaluate(el => [...el.children].slice(0, 3).map(c => c.tagName + "." + (c.className || "").split(" ")[0]));
  expect(ordre).toEqual(["P.f-accroche", "FIGURE.fg", "DIV.f-bloc"]);
  await expect(page.locator(".f-bloc", { hasText: "À retenir" }).locator(".fg")).toHaveCount(1);
  await expect(page.locator(".f-bloc", { hasText: "Pourquoi ça marche" }).locator(".fg")).toHaveCount(1);
  expect(await page.evaluate(() => { const ids = [...document.querySelectorAll("[id]")].map(e => e.id); return ids.length - new Set(ids).size; })).toBe(0);
  // Et ce qu'on y ajoute marche : le zoom.
  await page.locator(".f-page .fg-agrandir").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("figures : arrivées après le délai, elles complètent aussi la feuille ouverte depuis une recette", async ({ page }) => {
  await page.route("**/js/figures.js", async route => { await new Promise(r => setTimeout(r, 5000)); await route.continue(); });
  await page.goto("/#/recette/quiche-lorraine", { waitUntil: "commit" });
  const etape = page.locator("#steps-list li", { hasText: "Les lardons" });
  await etape.locator(".s-cue").first().click();
  await etape.locator('.s-lien[data-fond="maillard"]').first().click();
  const feuille = page.getByRole("dialog", { name: "La réaction de Maillard" });
  await expect(feuille).toBeVisible();
  await expect(feuille.locator(".fg")).toHaveCount(0);
  await feuille.evaluate(el => { el.dataset.marque = "avant"; });
  await expect(feuille.locator(".fg")).toHaveCount(4, { timeout: 15000 });
  expect(await feuille.evaluate(el => el.dataset.marque)).toBe("avant");
  await expect(feuille).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("figures : arrivées après le délai, le catalogue des Savoirs se complète (badges, thermomètre) sans toucher à la recherche", async ({ page }) => {
  await page.route("**/js/figures.js", async route => { await new Promise(r => setTimeout(r, 5000)); await route.continue(); });
  await page.goto("/#/fondamentaux", { waitUntil: "commit" });
  await expect(page.locator(".f-item").first()).toBeVisible();
  await expect(page.locator(".f-item-fig")).toHaveCount(0);
  await expect(page.locator("#f-thermo")).toHaveCount(0);
  await page.locator("#f-search").focus();
  await page.keyboard.type("maill");
  await expect(page.locator("#f-thermo")).toBeAttached({ timeout: 15000 });
  await expect(page.locator(".f-item", { hasText: "La réaction de Maillard" }).locator(".f-item-fig")).toHaveText("4 schémas");
  expect(await page.evaluate(() => document.activeElement.id)).toBe("f-search");
  await expect(page.locator("#f-search")).toHaveValue("maill");
});
