/* Lot « accueil » de la vague 3 : le premier affichage, le bandeau à l'encre, les cartes (appui, couleur
   dominante, photo partagée), les filtres et la recherche (pastille, flip), dans les deux modes de mouvement. */

import { test, expect, pageStable } from "./outils.js";

const CARTES = ".card:not(.gone):not(.card-leave)";

/* Attend que le socle du mouvement soit arrivé (il vient au repos, après le chargement). */
const armee = page => page.waitForSelector("#grid[data-anime]", { timeout: 20000 });

/* Ce qui reste sur une carte une fois tout posé : aucun transform, translate ou scale, aucune animation. */
const residus = page => page.evaluate(() => [...document.querySelectorAll(".card:not(.gone)")].flatMap(el => {
  const s = getComputedStyle(el);
  const mal = [];
  if (s.translate !== "none") mal.push("translate " + s.translate);
  if (s.scale !== "none" && s.scale !== "1") mal.push("scale " + s.scale);
  if (el.style.cssText) mal.push("style " + el.style.cssText);
  /* L'arrivée au défilement est une animation CSS : elle n'est pas un résidu du flip. */
  const js = el.getAnimations().filter(a => !(a instanceof CSSAnimation) && !(a instanceof CSSTransition));
  if (js.length) mal.push("animations " + js.length);
  return mal.map(m => el.dataset.id + " : " + m);
}));

/* Les animations de script (Web Animations), sans les transitions ni les animations CSS. */
const animationsJs = page => page.evaluate(() => document.getAnimations().filter(a => !(a instanceof CSSTransition) && !(a instanceof CSSAnimation)).length);

const ids = page => page.locator(CARTES).evaluateAll(els => els.map(e => e.dataset.id));

test("premier affichage à froid : rien du premier écran ne part d'une opacité nulle", async ({ page }) => {
  await page.goto("/");
  const cache = await page.evaluate(() => {
    const opacite = el => { let o = 1; for (let n = el; n && n !== document.documentElement; n = n.parentElement) o *= Number(getComputedStyle(n).opacity); return o; };
    return [...document.querySelectorAll(".masthead h1, .masthead .eyebrow, .byline, .search-row, #chips, .card h3, .card .visual img")]
      .filter(el => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && r.width > 0; })
      .filter(el => opacite(el) < 0.4).map(el => el.className || el.tagName);
  });
  expect(cache).toEqual([]);
});

test("les cartes portent data-vt-photo et une couleur dominante posée avant la photo", async ({ page }) => {
  await page.goto("/");
  const infos = await page.evaluate(() => [...document.querySelectorAll(".card")].map(c => {
    const v = c.querySelector(".visual");
    return { id: c.dataset.id, vt: v.dataset.vtPhoto, p: getComputedStyle(c).getPropertyValue("--p").trim(), fond: getComputedStyle(v).backgroundColor };
  }));
  expect(infos).toHaveLength(20);
  for (const i of infos) {
    expect(i.vt).toBe(i.id);
    expect(i.p, i.id).toMatch(/^#[0-9a-f]{6}$/);
    expect(i.fond, i.id).not.toBe("rgba(0, 0, 0, 0)");
  }
});

for (const reduit of [false, true]) {
  const mode = reduit ? "mouvement réduit" : "mouvement normal";

  test.describe(mode, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: reduit ? "reduce" : "no-preference" });
    });

    test("bandeau : les brins ne se tracent qu'une fois par session, jamais en mouvement réduit", async ({ page }) => {
      await page.goto("/");
      const traces = () => page.locator(".mast-row.trace").count();
      expect(await traces()).toBe(reduit ? 0 : 1);
      if (!reduit) {
        expect(await page.locator(".mast-row.trace [pathLength='1']").count()).toBeGreaterThan(8);
        expect(await page.locator(".masthead.encre").count()).toBe(1);
        // Décor seulement : cachés aux lecteurs d'écran, et le titre est déjà là.
        await expect(page.locator(".mast-row svg").first()).toHaveAttribute("aria-hidden", "true");
      }
      await page.reload();
      await page.waitForFunction(() => document.getElementById("app")?.childElementCount > 0);
      expect(await traces()).toBe(0);
      await expect(page.locator("h1")).toHaveText("Cuisine");
    });

    test("filtre par catégorie : la pastille glisse, la grille se réordonne et ne garde aucun résidu", async ({ page }) => {
      await page.goto("/");
      if (!reduit) await armee(page);
      await page.evaluate(() => {
        window.__pastilles = 0;
        new MutationObserver(l => l.forEach(m => m.addedNodes.forEach(n => { if (n.classList?.contains("pastille")) window.__pastilles++; }))).observe(document.getElementById("chips"), { childList: true });
      });
      const jsAvant = await animationsJs(page);
      await page.locator("#chips .chip", { hasText: "Soupes" }).click();
      if (reduit) expect(await animationsJs(page)).toBe(jsAvant);
      await pageStable(page);
      await expect(page.locator(CARTES)).toHaveCount(1);
      await expect(page.locator(CARTES)).toHaveAttribute("data-id", "veloute-butternut-shiitakes");
      expect(await page.evaluate(() => window.__pastilles)).toBe(reduit ? 0 : 1);
      await expect(page.locator(".pastille")).toHaveCount(0);
      await expect(page.locator("#chips .chip.on")).toHaveText("Soupes");
      expect(await residus(page)).toEqual([]);

      await page.locator("#chips .chip", { hasText: "Toutes" }).click();
      await pageStable(page);
      await expect(page.locator(CARTES)).toHaveCount(20);
      expect(await residus(page)).toEqual([]);
      expect(await page.locator(".card.card-leave").count()).toBe(0);
    });

    test("la pastille repart d'où elle est quand on choisit une autre puce en route", async ({ page }) => {
      await page.goto("/");
      if (!reduit) await armee(page);
      await page.locator("#chips .chip", { hasText: "Soupes" }).click();
      await page.locator("#chips .chip", { hasText: "Apéro" }).click();
      await pageStable(page);
      await expect(page.locator("#chips .chip.on")).toHaveText("Apéro");
      await expect(page.locator("#chips .chip.on")).toHaveCount(1);
      await expect(page.locator(".pastille")).toHaveCount(0);
      expect(await page.locator("#chips.en-vol").count()).toBe(0);
      expect(await residus(page)).toEqual([]);
    });

    test("recherche : le résultat se réordonne, la croix d'effacement est là, rien ne reste sur les cartes", async ({ page }) => {
      await page.goto("/");
      if (!reduit) await armee(page);
      await page.locator("#search").fill("pesto");
      await pageStable(page);
      const trouvees = await ids(page);
      expect(trouvees).toContain("torsades-pesto");
      expect(trouvees.length).toBeLessThan(20);
      expect(await residus(page)).toEqual([]);
      // L'ordre du DOM est l'ordre affiché : les cartes visibles se suivent sur la grille.
      const hauts = await page.locator(CARTES).evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().top)));
      expect(hauts).toEqual([...hauts].sort((a, b) => a - b));
      await page.locator("#search").fill("");
      await pageStable(page);
      await expect(page.locator(CARTES)).toHaveCount(20);
      expect(await residus(page)).toEqual([]);
    });

    test("état vide : l'illustration est un décor tracé, caché aux lecteurs d'écran (absente en mouvement réduit)", async ({ page }) => {
      await page.goto("/");
      if (!reduit) await armee(page);
      await page.locator("#search").fill("zzzzzz");
      await expect(page.locator(".grid-empty")).toBeVisible();
      await expect(page.locator(".grid-empty")).toContainText("Aucune recette ne correspond");
      await pageStable(page);
      if (reduit) { expect(await page.locator(".vide-illo").count()).toBe(0); return; }
      await expect(page.locator(".grid-empty .vide-illo")).toHaveAttribute("aria-hidden", "true");
      expect(await page.locator(".grid-empty .vide-illo path").first().evaluate(p => getComputedStyle(p).strokeDashoffset)).toBe("0px");
    });

    test("« J'ai… » : le nombre de recettes roule, le texte du bouton reste une seule phrase", async ({ page }) => {
      await page.goto("/");
      if (!reduit) await armee(page);
      await page.getByRole("button", { name: /^J'ai…/ }).click();
      const feuille = page.getByRole("dialog");
      await feuille.locator(".jai-chip", { hasText: "Feta" }).click();
      await expect(feuille.locator("#jai-ok")).toContainText("Voir");
      const texte = await feuille.locator("#jai-ok").textContent();
      expect(texte).toMatch(/^Voir (la recette|les \d+ recettes)$/);
      await feuille.locator(".jai-chip").nth(3).click();
      await pageStable(page);
      expect(await feuille.locator("#jai-ok").textContent()).toMatch(/^Voir (la recette|les \d+ recettes|Aucune recette)|^Aucune recette$/);
      await feuille.locator("#jai-ok").click();
      await expect(feuille).toBeHidden();
      await expect(page.locator("#jai-etat")).toBeVisible();
      await pageStable(page);
      const n = await page.locator(CARTES).count();
      await expect(page.locator("#jai-etat")).toContainText(`${n} recette`);
    });
  });
}

test("l'appui sur une carte la soulève (ombre et taille), et le relâcher hors de la carte n'ouvre rien", async ({ page }) => {
  await page.goto("/");
  await armee(page);
  const carte = page.locator(".card").nth(1);
  const repos = await carte.evaluate(c => getComputedStyle(c).boxShadow);
  const boite = await carte.boundingBox();
  await page.mouse.move(boite.x + boite.width / 2, boite.y + 60);
  await page.mouse.down();
  await expect.poll(() => carte.evaluate(c => getComputedStyle(c).scale)).not.toBe("none");
  await expect.poll(() => carte.evaluate(c => getComputedStyle(c).boxShadow)).not.toBe(repos);
  await page.mouse.move(boite.x + boite.width / 2, 30);
  await page.mouse.up();
  expect(new URL(page.url()).hash).toBe("");
  await pageStable(page);
  await expect.poll(() => carte.evaluate(c => getComputedStyle(c).scale)).toBe("none");
});

test("un défilement tactile qui part d'une carte défile la page sans ouvrir la fiche", async ({ page }) => {
  await page.goto("/");
  const boite = await page.locator(".card").nth(1).boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const x = Math.round(boite.x + boite.width / 2), y0 = Math.round(boite.y + 100);
  const toucher = (type, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  await toucher("touchStart", y0);
  for (let y = y0; y > y0 - 300; y -= 20) { await toucher("touchMove", y); await page.evaluate(() => new Promise(r => requestAnimationFrame(r))); }
  await toucher("touchEnd");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  expect(new URL(page.url()).hash).toBe("");
});

test("en mouvement réduit, une carte appuyée ne change pas de taille", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const carte = page.locator(".card").first();
  const boite = await carte.boundingBox();
  await page.mouse.move(boite.x + 40, boite.y + 40);
  await page.mouse.down();
  await expect.poll(() => carte.evaluate(c => c.matches(":active"))).toBe(true);
  expect(await carte.evaluate(c => getComputedStyle(c).scale)).toBe("none");
  await page.mouse.up();
});

test("les photos du premier écran ne se fondent pas", async ({ page }) => {
  await page.goto("/");
  await pageStable(page);
  const fondues = await page.evaluate(() => [...document.querySelectorAll(".card img.photo-arrive")].filter(i => i.getBoundingClientRect().top < innerHeight).length);
  expect(fondues).toBe(0);
});

test("rien ne déborde à 320 et 375 px", async ({ page }) => {
  for (const largeur of [320, 375]) {
    await page.setViewportSize({ width: largeur, height: 740 });
    await page.goto("/");
    await pageStable(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), String(largeur)).toBe(true);
  }
});
