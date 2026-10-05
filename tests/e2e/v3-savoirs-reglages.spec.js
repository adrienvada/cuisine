/* Vague 3, lot « savoirs-reglages » : la bascule de thème en cercle, l'interrupteur « Vibrations », la
   pastille des choix, les illustrations traçables, les Savoirs (bandeau, recherche, barre de lecture,
   volet « Pourquoi ça marche ») et le journal (entrée qui arrive, entrée qui sort, état vide). */

import { test, expect, preremplir, lireCarnet, pageStable } from "./outils.js";
import { simulerCarnetSync, themeAffiche } from "./outils-reglages.js";

const ouvrirReglages = async page => {
  await page.getByRole("button", { name: /^Réglages/ }).click();
  const feuille = page.getByRole("dialog", { name: "Réglages" });
  await expect(feuille).toBeVisible();
  return feuille;
};

/* Note chaque pose et retrait de html[data-vt] et chaque appel à startViewTransition. */
const espionnerTransition = page => page.evaluate(() => {
  window.__vt = { valeurs: [], appels: 0 };
  const racine = document.documentElement;
  new MutationObserver(() => window.__vt.valeurs.push(racine.dataset.vt ?? null))
    .observe(racine, { attributes: true, attributeFilter: ["data-vt"] });
  const origine = document.startViewTransition?.bind(document);
  if (origine) document.startViewTransition = (...a) => { window.__vt.appels++; return origine(...a); };
});

/* ---------- Bascule clair / sombre ---------- */

test("thème : la bascule s'étend en cercle depuis le bouton touché, puis la page est propre", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const feuille = await ouvrirReglages(page);
  await espionnerTransition(page);

  await feuille.getByRole("button", { name: "Sombre" }).click();
  await expect.poll(() => themeAffiche(page)).toBe("sombre");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#15180F");   // la barre d'état suit
  // la transition est posée, puis retirée
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.vt ?? null)).toBeNull();
  const { valeurs, appels } = await page.evaluate(() => window.__vt);
  expect(appels).toBe(1);
  expect(valeurs[0]).toBe("theme");
  expect(valeurs.at(-1)).toBeNull();
  // l'origine et le rayon n'ont rien laissé sur la page
  expect(await page.evaluate(() => document.documentElement.getAttribute("style") || "")).not.toMatch(/--vt-/);

  await feuille.getByRole("button", { name: "Clair" }).click();
  await expect.poll(() => themeAffiche(page)).toBe("clair");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#42603A");
});

test("thème : le cercle part du centre du bouton touché et couvre l'écran entier", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const feuille = await ouvrirReglages(page);
  const bouton = feuille.getByRole("button", { name: "Sombre" });
  await pageStable(page);                  // la feuille a fini de monter : la mesure est la bonne
  const boite = await bouton.boundingBox();
  await page.evaluate(() => {
    window.__cercle = null;
    new MutationObserver(() => {
      const s = document.documentElement.style;
      if (s.getPropertyValue("--vt-r")) window.__cercle = { x: s.getPropertyValue("--vt-x"), y: s.getPropertyValue("--vt-y"), r: s.getPropertyValue("--vt-r") };
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
  });
  await bouton.click();
  await expect.poll(() => page.evaluate(() => window.__cercle)).not.toBeNull();
  const c = await page.evaluate(() => window.__cercle);
  expect(parseFloat(c.x)).toBeCloseTo(boite.x + boite.width / 2, 0);
  expect(parseFloat(c.y)).toBeCloseTo(boite.y + boite.height / 2, 0);
  const coinLointain = await page.evaluate(({ x, y }) => Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)), { x: parseFloat(c.x), y: parseFloat(c.y) });
  expect(parseFloat(c.r)).toBeGreaterThanOrEqual(coinLointain);
});

test("thème : en mouvement réduit, aucune transition, le thème change à l'instant", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/");
  const feuille = await ouvrirReglages(page);
  await espionnerTransition(page);
  await feuille.getByRole("button", { name: "Sombre" }).click();
  expect(await themeAffiche(page)).toBe("sombre");      // sans attendre
  const { valeurs, appels } = await page.evaluate(() => window.__vt);
  expect(appels).toBe(0);
  expect(valeurs).toEqual([]);
  await expect(feuille.getByRole("button", { name: "Sombre" })).toHaveAttribute("aria-pressed", "true");
});

test("thème : sans l'API des transitions de vue, la bascule est directe", async ({ page }) => {
  await page.addInitScript(() => { document.startViewTransition = undefined; });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const feuille = await ouvrirReglages(page);
  await feuille.getByRole("button", { name: "Sombre" }).click();
  expect(await themeAffiche(page)).toBe("sombre");
});

test("thème : Automatique qui ne change pas l'aspect ne lance pas de cercle", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const feuille = await ouvrirReglages(page);
  await espionnerTransition(page);
  await feuille.getByRole("button", { name: "Clair" }).click();         // déjà clair : rien à étendre
  expect(await themeAffiche(page)).toBe("clair");
  expect((await page.evaluate(() => window.__vt)).appels).toBe(0);
});

/* ---------- Choix d'apparence : la pastille ---------- */

test("réglages : la pastille glisse sous le choix actif, les boutons gardent leur focus", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const feuille = await ouvrirReglages(page);
  const choix = feuille.locator(".reg-choix");
  const pastille = feuille.locator(".reg-pastille");
  await expect(pastille).toHaveAttribute("aria-hidden", "true");
  const abscisse = async () => (await pastille.boundingBox()).x;
  const x0 = await abscisse();

  await feuille.getByRole("button", { name: "Sombre" }).focus();
  await page.keyboard.press("Enter");
  await expect.poll(abscisse).toBeGreaterThan(x0 + 100);
  // le bouton n'a pas été redessiné : le focus clavier y est toujours
  await expect(feuille.getByRole("button", { name: "Sombre" })).toBeFocused();
  expect(await choix.evaluate(el => el.style.getPropertyValue("--n"))).toBe("2");
  // la pastille s'arrête exactement derrière le bouton choisi
  const bouton = await feuille.getByRole("button", { name: "Sombre" }).boundingBox();
  await pageStable(page);
  const finale = await pastille.boundingBox();
  expect(Math.abs(finale.x - bouton.x)).toBeLessThan(2);
  expect(Math.abs(finale.width - bouton.width)).toBeLessThan(2);
});

test("réglages : en mouvement réduit la pastille n'est pas animée", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/");
  const feuille = await ouvrirReglages(page);
  await feuille.getByRole("button", { name: "Clair" }).click();
  await expect.poll(() => feuille.locator(".reg-pastille").evaluate(el => getComputedStyle(el).transitionDuration)).toMatch(/^0\.01ms$|^1e-05s$/);
});

/* ---------- Vibrations ---------- */

test("vibrations : un interrupteur accessible, lu et écrit dans le stockage de l'appareil", async ({ page }) => {
  await page.addInitScript(() => {
    window.__vib = [];
    navigator.vibrate = motif => { window.__vib.push(motif); return true; };
  });
  await page.goto("/");
  const feuille = await ouvrirReglages(page);
  const interrupteur = feuille.getByRole("switch", { name: "Vibrations" });
  await expect(interrupteur).toHaveAttribute("aria-checked", "true");          // activées par défaut
  // La feuille arrive en glissant : on mesure la cible une fois posée (en vol, la
  // translation fractionnaire donne 43,99997 px pour 44).
  await pageStable(page);
  const boite = await interrupteur.boundingBox();
  expect(boite.height).toBeGreaterThanOrEqual(44);
  expect(boite.width).toBeGreaterThanOrEqual(44);
  await expect(interrupteur).toHaveAccessibleDescription(/minuteur/);

  await interrupteur.click();
  await expect(interrupteur).toHaveAttribute("aria-checked", "false");
  expect(await page.evaluate(() => localStorage.getItem("vibrations"))).toBe("0");
  expect(await page.evaluate(() => window.__vib)).toEqual([]);                // en les coupant, rien ne vibre

  await interrupteur.focus();
  await page.keyboard.press("Space");                                          // et au clavier
  await expect(interrupteur).toHaveAttribute("aria-checked", "true");
  expect(await page.evaluate(() => localStorage.getItem("vibrations"))).toBeNull();
  expect((await page.evaluate(() => window.__vib)).length).toBe(1);           // en l'activant, un tic de démonstration

  await interrupteur.focus();
  await page.keyboard.press("Enter");
  await expect(interrupteur).toHaveAttribute("aria-checked", "false");
});

test("vibrations : le choix survit au rechargement et suit le réglage de l'appareil", async ({ page }) => {
  await page.addInitScript(() => { try { if (!sessionStorage.__v) { sessionStorage.__v = 1; localStorage.setItem("vibrations", "0"); } } catch {} });
  await page.goto("/");
  const feuille = await ouvrirReglages(page);
  await expect(feuille.getByRole("switch", { name: "Vibrations" })).toHaveAttribute("aria-checked", "false");
  const { vibrationsActives } = await page.evaluate(async () => { const m = await import("/js/ui/geste.js"); return { vibrationsActives: m.vibrationsActives() }; });
  expect(vibrationsActives).toBe(false);
  // ce n'est pas un état du carnet synchronisé
  expect(JSON.stringify(await lireCarnet(page))).not.toContain("vibrations");
});

test("vibrations : la poignée est à droite quand c'est activé, à gauche sinon (clair et sombre)", async ({ page }) => {
  for (const schema of ["light", "dark"]) {
    await page.emulateMedia({ colorScheme: schema });
    await page.goto("/");
    const feuille = await ouvrirReglages(page);
    const interrupteur = feuille.getByRole("switch", { name: "Vibrations" });
    const poignee = interrupteur.locator(".reg-poignee");
    await pageStable(page);
    const actif = (await poignee.boundingBox()).x;
    await interrupteur.click();
    await expect.poll(async () => (await poignee.boundingBox()).x).toBeLessThan(actif - 15);
    await page.evaluate(() => localStorage.removeItem("vibrations"));
  }
});

/* ---------- Points d'état de la synchro ---------- */

test("synchro : le point respire pendant la connexion et se fige sinon", async ({ page, context }) => {
  await simulerCarnetSync(context, { etat: "off" });
  await page.goto("/");
  const point = page.getByRole("button", { name: /^Réglages/ }).locator(".reglages-point");
  const anim = () => point.evaluate(el => getComputedStyle(el).animationName);
  await page.evaluate(() => window.__carnetSyncSimule.changer("attente"));
  await expect.poll(anim).toBe("reglages-respire");
  await page.evaluate(() => window.__carnetSyncSimule.changer("ok"));
  await expect.poll(anim).toBe("none");
  await page.evaluate(() => window.__carnetSyncSimule.changer("hors"));
  await expect.poll(anim).toBe("none");
});

test("synchro : en mouvement réduit le point ne respire pas", async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await simulerCarnetSync(context, { etat: "attente" });
  await page.goto("/");
  const point = page.getByRole("button", { name: /^Réglages/ }).locator(".reglages-point");
  await expect(point).toBeVisible();
  expect(await point.evaluate(el => getComputedStyle(el).animationName)).toBe("none");
});

/* ---------- Export : la coche ---------- */

test("export : une coche se trace dans le bouton, puis le libellé revient", async ({ page }) => {
  await page.goto("/");
  const feuille = await ouvrirReglages(page);
  const bouton = feuille.locator("[data-exporter]");
  await Promise.all([page.waitForEvent("download"), bouton.click()]);
  await expect(bouton.locator(".reg-coche path[pathLength='1']")).toHaveCount(1);
  await expect(bouton).toHaveClass(/trace/);
  await expect(bouton).toContainText("Exporté");
  await expect(bouton).toHaveText("Exporter mon carnet", { timeout: 4000 });
  await expect(bouton.locator(".reg-coche")).toHaveCount(0);
});

/* ---------- Illustrations traçables ---------- */

test("illustrations : chaque trait de ILLO.D est traçable (pathLength) sans changer le dessin", async ({ page }) => {
  await page.goto("/");
  const bilan = await page.evaluate(async () => {
    const { tracer } = await import("/js/ui/mouvement.js");
    const sortie = {};
    for (const [nom, svg] of Object.entries(ILLO.D)) {
      const hote = document.createElement("div");
      hote.style.cssText = "position:fixed;left:0;top:0;width:120px;opacity:0;pointer-events:none";
      hote.innerHTML = svg;
      document.body.append(hote);
      const chemins = [...hote.querySelectorAll("path")];
      const sansLongueur = chemins.filter(p => p.getAttribute("pathLength") !== "1" && !p.hasAttribute("fill-opacity"));
      const traces = hote.querySelectorAll('[pathLength="1"]').length;
      const promesse = tracer(hote);
      const animations = hote.getAnimations({ subtree: true }).filter(a => a.animationName === "trace").length;
      await promesse;
      sortie[nom] = { chemins: chemins.length, sansLongueur: sansLongueur.length, traces, animations, classe: hote.classList.contains("trace") };
      hote.remove();
    }
    return sortie;
  });
  for (const [nom, b] of Object.entries(bilan)) {
    expect(b.sansLongueur, `ILLO.D.${nom} : traits sans pathLength`).toBe(0);
    expect(b.classe).toBe(true);
    // chaque forme traçable lance bien son tracé (les remplissages seuls : citron, n'en ont aucune)
    expect(b.animations, `ILLO.D.${nom}`).toBe(b.traces);
  }
  for (const nom of ["sprig", "sprigR", "olive", "flourish", "heart", "leaf", "cheers", "plume", "toque", "corner"]) {
    expect(bilan[nom].traces, `ILLO.D.${nom} se trace`).toBeGreaterThan(0);
  }
});

test("illustrations : tracer() ne rejoue pas ce qui est déjà dessiné en mouvement réduit", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const animations = await page.evaluate(async () => {
    const { tracer } = await import("/js/ui/mouvement.js");
    const hote = document.createElement("div");
    hote.innerHTML = ILLO.D.flourish;
    document.body.append(hote);
    await tracer(hote);
    const a = hote.getAnimations({ subtree: true }).filter(x => x.animationName === "trace" && x.playState === "running").length;
    const decalage = getComputedStyle(hote.querySelector("path")).strokeDashoffset;
    hote.remove();
    return { a, decalage };
  });
  expect(animations.a).toBe(0);
  expect(parseFloat(animations.decalage)).toBe(0);
});

/* ---------- Savoirs : la liste ---------- */

test("savoirs : le bandeau se trace la première fois de la session, pas ensuite", async ({ page }) => {
  await page.goto("/#/fondamentaux");
  await expect(page.locator(".f-item").first()).toBeVisible();
  await expect(page.locator(".mast-row")).toHaveClass(/trace/);
  expect(await page.locator(".mast-row [pathLength='1']").count()).toBeGreaterThan(10);

  await page.goto("/#/courses");
  await expect(page).toHaveURL(/#\/courses$/);
  await page.goto("/#/fondamentaux");
  await expect(page.locator(".f-item").first()).toBeVisible();
  await expect(page.locator(".mast-row")).not.toHaveClass(/trace/);
});

test("savoirs : la recherche réordonne la liste en gardant les mêmes cartes (flip)", async ({ page }) => {
  await page.goto("/#/fondamentaux");
  await expect(page.locator(".f-item").first()).toBeVisible();
  await page.evaluate(() => document.querySelectorAll(".f-item").forEach(a => { a.__marque = a.getAttribute("href"); }));
  const avant = await page.locator(".f-item").count();
  await page.locator("#f-search").fill("maillard");
  const maillard = page.locator('.f-item[href="#/fondamental/maillard"]');
  await expect(maillard).toBeVisible();
  expect(await page.locator(".f-item").count()).toBeLessThan(avant);                  // les autres sont parties
  expect(await maillard.evaluate(a => a.__marque)).toBe("#/fondamental/maillard");   // le même élément, déplacé
  await page.locator("#f-search").fill("");
  await expect(page.locator(".f-item")).toHaveCount(avant);
  // celle qui est restée est toujours le même nœud ; les autres sont revenues
  expect(await page.locator('.f-item[href="#/fondamental/maillard"]').evaluate(a => a.__marque)).toBe("#/fondamental/maillard");
  // rien ne reste figé : plus de translate laissé en style
  await pageStable(page);
  expect(await page.locator(".f-item").evaluateAll(l => l.filter(a => a.style.translate).length)).toBe(0);
});

test("savoirs : une recherche sans résultat dit qu'il n'y a rien, puis la liste revient", async ({ page }) => {
  await page.goto("/#/fondamentaux");
  await page.locator("#f-search").fill("zzzzzz");
  await expect(page.locator(".empty")).toContainText("Aucun savoir");
  await page.locator("#f-search").fill("maillard");
  await expect(page.locator('.f-item[href="#/fondamental/maillard"]')).toBeVisible();
  await expect(page.locator(".empty")).toHaveCount(0);
});

test("savoirs : les cartes arrivent au défilement (animation pilotée par le défilement)", async ({ page }) => {
  await page.goto("/#/fondamentaux");
  await expect(page.locator(".f-item").first()).toBeVisible();
  const lie = await page.locator(".f-item").first().evaluate(a => getComputedStyle(a).animationTimeline);
  expect(lie).toMatch(/view/);
  // et rien de tel en mouvement réduit
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.locator(".f-item").first().evaluate(a => getComputedStyle(a).animationName)).toBe("none");
});

/* ---------- Un savoir ---------- */

test("savoir : la barre de lecture se remplit avec le défilement", async ({ page }) => {
  await page.goto("/#/fondamental/maillard");
  const barre = page.locator(".f-lecture");
  await expect(barre).toHaveCount(1);
  await expect(barre).toHaveAttribute("aria-hidden", "true");
  const echelle = () => barre.evaluate(el => parseFloat(getComputedStyle(el).scale.split(" ")[0]) || 0);
  expect(await echelle()).toBeLessThan(0.05);
  const boite = await barre.boundingBox();
  expect(boite.y).toBe(0);
  expect(boite.height).toBeLessThanOrEqual(4);

  await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) / 2));
  await expect.poll(echelle).toBeGreaterThan(0.3);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(echelle).toBeGreaterThan(0.95);
  // elle ne capte aucun appui
  expect(await barre.evaluate(el => getComputedStyle(el).pointerEvents)).toBe("none");
});

test("savoir : les ornements se tracent à leur entrée dans l'écran, une seule fois", async ({ page }) => {
  await page.goto("/#/fondamental/maillard");
  await expect(page.locator(".f-head .f-orne")).toHaveClass(/trace/);            // visible tout de suite : tracé
  const fin = page.locator(".f-orne-fin");
  await expect(fin).not.toHaveClass(/trace/);                                    // hors écran : pas encore
  expect(await fin.locator("path").first().evaluate(p => getComputedStyle(p).strokeDashoffset)).toBe("1px");
  await fin.scrollIntoViewIfNeeded();
  await expect(fin).toHaveClass(/trace/);
  await expect.poll(() => fin.locator("path").first().evaluate(p => parseFloat(getComputedStyle(p).strokeDashoffset))).toBe(0);
});

test("savoir : en mouvement réduit les ornements sont dessinés d'emblée, sans barre de lecture animée", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#/fondamental/maillard");
  const fin = page.locator(".f-orne-fin");
  expect(await fin.locator("path").first().evaluate(p => parseFloat(getComputedStyle(p).strokeDashoffset))).toBe(0);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.locator(".f-lecture")).toHaveCount(1);
});

test("savoir : un lien depuis la fiche ouvre la feuille dont le contenu arrive en échelon", async ({ page }) => {
  await page.goto("/#/recette/quiche-lorraine");
  const etape = page.locator("#steps-list li", { hasText: "Les lardons" });
  await etape.locator(".s-cue").first().click();
  await etape.locator('.s-lien[data-fond="maillard"]').first().click();
  const feuille = page.getByRole("dialog", { name: "La réaction de Maillard" });
  await expect(feuille).toBeVisible();
  const arrivees = await feuille.locator(".arrive").evaluateAll(l => l.map(e => e.style.getPropertyValue("--i")));
  expect(arrivees.length).toBeGreaterThanOrEqual(4);
  expect(arrivees[0]).toBe("0");
  // le titre, le bouton de partage et le focus ne dépendent pas de l'animation
  await expect(feuille.locator(".f-top")).not.toHaveClass(/arrive/);
  await expect(feuille).toBeFocused();
  await pageStable(page);
  await page.keyboard.press("Escape");
  await expect(feuille).toHaveCount(0);
});

test("« Pourquoi ça marche » : le volet s'ouvre en hauteur fluide, fermé il est hors d'atteinte", async ({ page }) => {
  await page.goto("/#/recette/quiche-lorraine");
  const etape = page.locator("#steps-list li", { hasText: "Les lardons" });
  const appel = etape.locator(".s-cue").first();
  const liste = etape.locator(".s-liste").first();
  expect(await liste.evaluate(el => getComputedStyle(el).transitionProperty)).toContain("height");
  expect(await liste.evaluate(el => getComputedStyle(el).visibility)).toBe("hidden");
  expect((await liste.boundingBox()).height).toBe(0);

  await appel.click();
  await expect(appel).toHaveAttribute("aria-expanded", "true");
  await expect(liste.locator(".s-lien").first()).toBeVisible();
  await expect.poll(async () => (await liste.boundingBox()).height).toBeGreaterThan(40);

  await appel.click();
  await expect(appel).toHaveAttribute("aria-expanded", "false");
  await expect.poll(() => liste.evaluate(el => getComputedStyle(el).visibility)).toBe("hidden");
});

test("« Pourquoi ça marche » : le volet s'ouvre aussi dans le mode cuisine, hauteur fluide comprise", async ({ page }) => {
  await page.goto("/#/recette/quiche-lorraine/cuisine/2");
  const liste = page.locator(".cook .s-liste").first();
  await expect(liste).toHaveCount(1);
  expect(await liste.evaluate(el => getComputedStyle(el).transitionProperty)).toContain("height");
  await page.locator(".cook .s-cue").first().click();
  await expect(liste.locator(".s-lien").first()).toBeVisible();
});

test("« Pourquoi ça marche » : en mouvement réduit le volet s'ouvre sans transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#/recette/quiche-lorraine");
  const etape = page.locator("#steps-list li", { hasText: "Les lardons" });
  const liste = etape.locator(".s-liste").first();
  expect(await liste.evaluate(el => getComputedStyle(el).display)).toBe("none");
  await etape.locator(".s-cue").first().click();
  await expect(liste.locator(".s-lien").first()).toBeVisible();
});

/* ---------- Journal ---------- */

const RID = "quiche-lorraine";
const entreeJournal = (id, date, note = "") => ({ id, rid: RID, date, convives: 2, note, photo: false });

async function ouvrirFiche(page) {
  await page.goto(`/#/recette/${RID}`);
  await expect(page.locator(".jr-zone")).toBeVisible();
}

test("journal : l'état vide dessine une feuille au trait qui se trace", async ({ page }) => {
  await ouvrirFiche(page);
  const illo = page.locator(".jr-vide .jr-vide-illo");
  await expect(illo).toHaveClass(/trace/);
  expect(await illo.locator("[pathLength='1']").count()).toBeGreaterThan(2);
  await expect(page.locator(".jr-vide")).toContainText("Rien de noté");
  await expect(illo).toHaveAttribute("aria-hidden", "true");
});

test("journal : une entrée ajoutée arrive à sa place, les autres glissent, l'état final est juste", async ({ page, context }) => {
  await preremplir(context, { carnet: { journal: [entreeJournal("a1", "2026-09-20", "Première"), entreeJournal("a2", "2026-08-02", "Ancienne")] } });
  await ouvrirFiche(page);
  await expect(page.locator(".jr-entree")).toHaveCount(2);
  await page.evaluate(() => document.querySelectorAll(".jr-entree").forEach(li => { li.__marque = li.dataset.id; }));

  await page.locator("#jr-ajout").click();
  const feuille = page.getByRole("dialog", { name: "Ajouter au journal" });
  await feuille.locator("#jr-date").fill("2026-09-01");
  await feuille.locator("#jr-note").fill("Au milieu");
  await feuille.locator("#jr-ok").click();
  await expect(feuille).toHaveCount(0);

  const lignes = page.locator(".jr-entree");
  await expect(lignes).toHaveCount(3);
  await expect(lignes.nth(1)).toContainText("Au milieu");                      // à sa place, par date
  // les deux anciennes lignes sont les mêmes éléments (elles n'ont pas été redessinées)
  expect(await lignes.nth(0).evaluate(li => li.__marque)).toBe("a1");
  expect(await lignes.nth(2).evaluate(li => li.__marque)).toBe("a2");
  expect(await lignes.nth(1).evaluate(li => li.__marque)).toBeUndefined();
  await pageStable(page);
  expect(await lignes.evaluateAll(l => l.filter(li => li.style.translate || li.style.opacity).length)).toBe(0);
  expect((await lireCarnet(page)).journal.map(e => e.note)).toEqual(["Première", "Ancienne", "Au milieu"]);
});

test("journal : la suppression sort la ligne en glissant, le focus passe à sa voisine, « Annuler » la rend", async ({ page, context }) => {
  await preremplir(context, { carnet: { journal: [entreeJournal("a1", "2026-09-20", "Première"), entreeJournal("a2", "2026-08-02", "Ancienne")] } });
  await ouvrirFiche(page);
  await page.locator("[data-suppr='a1']").focus();
  await page.keyboard.press("Enter");

  // dès le début de la sortie la ligne est retirée de l'arbre d'accessibilité
  const ligne = page.locator(".jr-entree[data-id='a1']");
  await expect(page.locator(".jr-entree")).toHaveCount(1);                     // puis retirée du DOM
  await expect(ligne).toHaveCount(0);
  expect((await lireCarnet(page)).journal.map(e => e.id)).toEqual(["a2"]);
  await expect(page.locator("#toast")).toContainText("Entrée supprimée");
  // au clavier, le message donne le focus à « Annuler » ; il le rend à la voisine de la ligne partie (jamais au vide)
  await expect(page.locator("#toast .toast-action")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".jr-entree")).toHaveCount(2);
  await expect(page.locator(".jr-entree").first()).toContainText("Première");   // remise à la même place
  expect((await lireCarnet(page)).journal.map(e => e.id)).toEqual(["a1", "a2"]);
  await expect(page.locator("[data-suppr='a2']")).toBeFocused();
});

test("journal : « Annuler » pendant la sortie de la ligne la remet, et elle y reste", async ({ page, context }) => {
  await preremplir(context, { carnet: { journal: [entreeJournal("a1", "2026-09-20", "Première"), entreeJournal("a2", "2026-08-02", "Ancienne")] } });
  await ouvrirFiche(page);
  // les deux gestes dans le même tour : la sortie de la ligne n'a pas fini quand « Annuler » arrive
  await page.evaluate(() => {
    document.querySelector("[data-suppr='a1']").click();
    document.querySelector("#toast .toast-action").click();
  });
  await page.waitForFunction(() => [...document.querySelectorAll(".jr-entree")].every(l => l.getAnimations().length === 0));
  await expect(page.locator(".jr-entree")).toHaveCount(2);
  await expect(page.locator(".jr-entree").first()).toContainText("Première");
  await expect(page.locator(".jr-entree[inert]")).toHaveCount(0);
  expect((await lireCarnet(page)).journal.map(e => e.id)).toEqual(["a1", "a2"]);
});

test("journal : la ligne qui sort est inerte et masquée aux lecteurs d'écran dès le départ", async ({ page, context }) => {
  await preremplir(context, { carnet: { journal: [entreeJournal("a1", "2026-09-20", "Première"), entreeJournal("a2", "2026-08-02")] } });
  await ouvrirFiche(page);
  const etat = await page.evaluate(() => {
    const ligne = document.querySelector(".jr-entree[data-id='a1']");
    ligne.querySelector("[data-suppr]").click();
    return { inert: ligne.inert, cache: ligne.getAttribute("aria-hidden"), connectee: ligne.isConnected };
  });
  expect(etat).toEqual({ inert: true, cache: "true", connectee: true });         // encore là, mais plus lue ni cliquable
  await expect(page.locator(".jr-entree[data-id='a1']")).toHaveCount(0);
});

test("journal : supprimer la dernière entrée ramène l'état vide avec son dessin", async ({ page, context }) => {
  await preremplir(context, { carnet: { journal: [entreeJournal("a1", "2026-09-20", "Seule")] } });
  await ouvrirFiche(page);
  await page.locator("[data-suppr='a1']").click();
  await expect(page.locator(".jr-vide .jr-vide-illo.trace")).toBeVisible();
  await expect(page.locator(".jr-entree")).toHaveCount(0);
  expect((await lireCarnet(page)).journal).toEqual([]);
  await expect(page.locator("#jr-ajout")).toBeVisible();
});

test("journal : en mouvement réduit, l'ajout et la suppression sont immédiats et corrects", async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await preremplir(context, { carnet: { journal: [entreeJournal("a1", "2026-09-20", "Première")] } });
  await ouvrirFiche(page);
  await page.locator("#jr-ajout").click();
  const feuille = page.getByRole("dialog", { name: "Ajouter au journal" });
  await feuille.locator("#jr-note").fill("Nouvelle");
  await feuille.locator("#jr-ok").click();
  await expect(page.locator(".jr-entree")).toHaveCount(2);
  const sans = await page.evaluate(() => document.getAnimations().filter(a => a.effect?.target?.closest?.(".jr-zone") && !(a instanceof CSSTransition)).length);
  expect(sans).toBe(0);
  await page.locator(".jr-entree", { hasText: "Nouvelle" }).locator("[data-suppr]").click();
  await expect(page.locator(".jr-entree")).toHaveCount(1);
  expect((await lireCarnet(page)).journal.map(e => e.note)).toEqual(["Première"]);
});

test("journal : la photo se fond sur la case de sa vignette une fois chargée", async ({ page, context }) => {
  await preremplir(context, { carnet: { journal: [{ ...entreeJournal("p1", "2026-09-20", "Avec photo"), photo: true }] } });
  await page.goto(`/#/recette/${RID}`);
  await expect(page.locator(".jr-zone")).toBeVisible();
  await page.evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.open("carnet-photos", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("photos");
    req.onerror = () => reject(req.error);
    req.onsuccess = async () => {
      const toile = document.createElement("canvas");
      toile.width = toile.height = 40;
      toile.getContext("2d").fillRect(0, 0, 40, 40);
      const blob = await new Promise(r => toile.toBlob(r, "image/png"));
      const tx = req.result.transaction("photos", "readwrite");
      tx.objectStore("photos").put(blob, "p1");
      tx.oncomplete = () => resolve();
    };
  }));
  await page.reload();
  await expect(page.locator(".jr-photo img")).toBeVisible();
  await expect(page.locator(".jr-photo")).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");   // la case a sa couleur sous l'image
});

/* ---------- Mise en page ---------- */

test("savoirs, un savoir, réglages et journal : aucun débordement à 320 et 375 px, cibles de 44 px", async ({ page }) => {
  for (const largeur of [320, 375]) {
    await page.setViewportSize({ width: largeur, height: 740 });
    for (const url of ["/#/fondamentaux", "/#/fondamental/maillard", `/#/recette/${RID}`]) {
      await page.goto(url);
      await pageStable(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), `${url} à ${largeur}`).toBe(false);
    }
    await page.goto("/");
    const feuille = await ouvrirReglages(page);
    await pageStable(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), `réglages à ${largeur}`).toBe(false);
    for (const cible of [feuille.locator(".reg-mode").first(), feuille.getByRole("switch"), feuille.locator(".reg-fermer")]) {
      const b = await cible.boundingBox();
      expect(b.height).toBeGreaterThanOrEqual(44);
      expect(b.width).toBeGreaterThanOrEqual(44);
    }
    await page.keyboard.press("Escape");
  }
});
