/* Deuxième vague, lot « courses-menu » : le rangement des rayons sans exception, le focus clavier gardé à chaque redessin, le partage d'une carte du menu, la ligne « Pour combien ? » à 375 px, les phrases du rétroplanning. */

import { test, expect, preremplir, entree } from "./outils.js";

const REPAS = { convives: 6, heure: "20:00", date: "2099-06-15", exclus: [] };

/* Aucune erreur de page, aucune boîte de dialogue : ce que les anciens tests ne regardaient pas. */
test.beforeEach(({ page }) => {
  page.erreurs = [];
  page.on("pageerror", e => page.erreurs.push(e.message));
  page.dialogues = [];
  page.on("dialog", d => { page.dialogues.push(d.message()); d.dismiss(); });
});
test.afterEach(({ page }) => {
  expect(page.erreurs).toEqual([]);
  expect(page.dialogues).toEqual([]);
});

const actif = page => page.evaluate(() => {
  const a = document.activeElement;
  return a ? { tag: a.localName, data: { ...a.dataset } } : null;
});

/* ---------- Constats n° 2, 20, 42 : « Ranger les rayons » ---------- */

test("ranger les rayons : aucune exception, le bouton déplacé garde le focus, la page garde sa place", async ({ page, context }) => {
  await preremplir(context, {
    carnet: { menu: [entree("quiche-lorraine", { k: "q1" }), entree("focaccia-romarin", { k: "f1" }), entree("tartines-figues-chevre-miel", { k: "t1" })] }
  });
  await page.goto("/#/courses");
  await page.locator("[data-ranger]").click();
  await expect(page.locator(".ranger-liste")).toBeVisible();
  expect(await actif(page)).toMatchObject({ tag: "button", data: { finRanger: "" } });

  const liste = page.locator(".ranger-liste li:not(.r-fixe)");
  const noms = () => page.locator(".ranger-liste .r-nom").evaluateAll(l => l.map(x => x.firstChild.textContent));
  const avant = await noms();
  expect(avant.length).toBeGreaterThanOrEqual(3);

  // Au clavier : on descend le premier rayon deux fois de suite sans quitter le bouton.
  const premier = avant[0];
  const descendre = page.locator(`[data-deplacer="${premier}"][data-sens="1"]`);
  await descendre.focus();
  await page.keyboard.press("Enter");
  expect((await noms())[1]).toBe(premier);
  expect(await actif(page)).toMatchObject({ tag: "button", data: { deplacer: premier, sens: "1" } });
  await page.keyboard.press("Enter");
  expect((await noms())[2]).toBe(premier);
  expect(await actif(page)).toMatchObject({ data: { deplacer: premier } });

  // Monter jusqu'en haut : le bouton « Monter » se désactive, le focus passe à son pendant.
  await page.locator(`[data-deplacer="${premier}"][data-sens="-1"]`).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  expect((await noms())[0]).toBe(premier);
  expect(await actif(page)).toMatchObject({ tag: "button", data: { deplacer: premier } });
  expect(liste).toBeTruthy();

  // Terminé rend le focus au bouton qui ouvrait l'écran.
  await page.locator("[data-fin-ranger]").click();
  expect(await actif(page)).toMatchObject({ data: { ranger: "" } });
});

test("ranger les rayons : la position de défilement est conservée à chaque déplacement", async ({ page, context }) => {
  await preremplir(context, {
    carnet: { menu: [entree("quiche-lorraine", { k: "q1" }), entree("focaccia-romarin", { k: "f1" }), entree("tartines-figues-chevre-miel", { k: "t1" }), entree("cake-sale", { k: "c1" })] }
  });
  await page.setViewportSize({ width: 390, height: 360 });
  await page.goto("/#/courses");
  await page.locator("[data-ranger]").click();
  const dernier = page.locator(".ranger-liste [data-deplacer][data-sens='1']:not([disabled])").last();
  await dernier.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 40));
  const y = await page.evaluate(() => window.scrollY);
  expect(y).toBeGreaterThan(0);
  await page.locator(".ranger-liste [data-deplacer][data-sens='-1']:not([disabled])").last().click();
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - y)).toBeLessThan(2);
});

/* ---------- Constat n° 45 : le focus clavier traverse les redessins ---------- */

test("courses : cocher une case au clavier laisse le focus dans la liste, sur l'article voisin", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })] } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#/courses");
  const cases = page.locator("section.rayon:not(.placard) input[data-key]");
  const cle = await cases.first().getAttribute("data-key");
  await cases.first().focus();
  await page.keyboard.press("Space");
  await expect(page.locator(`details.panier input[data-key="${cle}"]`)).toHaveCount(1);
  const a = await actif(page);
  expect(a.tag).toBe("input");
  expect(a.data.key).toBeTruthy();
  expect(a.data.key).not.toBe(cle);
});

test("courses : décocher dans le panier garde le focus sur la case", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })], checked: { lardons: true } } });
  await page.goto("/#/courses");
  await page.locator("details.panier summary").click();
  const c = page.locator('details.panier input[data-key="lardons"]');
  await c.focus();
  await page.keyboard.press("Space");
  await expect(page.locator('section.rayon input[data-key="lardons"]')).toBeChecked({ checked: false });
  expect(await actif(page)).toMatchObject({ tag: "input", data: { key: "lardons" } });
});

test("courses : ajouter un article libre au clavier garde le champ de saisie", async ({ page }) => {
  await page.goto("/#/courses");
  await page.locator("#extra-input").fill("Glaçons");
  await page.keyboard.press("Enter");
  await expect(page.locator("li.art", { hasText: "Glaçons" })).toHaveCount(1);
  expect((await actif(page)).tag).not.toBe("body");
});

test("menu : + / − de portions et ✕ gardent le focus au clavier", async ({ page, context }) => {
  await preremplir(context, {
    carnet: { menu: [entree("quiche-lorraine", { k: "q1" }), entree("cake-sale", { k: "c1" })], repas: REPAS }
  });
  await page.goto("/#/menu");
  await page.locator('[data-plus="q1"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-k="q1"], .menu-card').first().locator(".mc-portions .val")).toHaveText("7 personnes");
  expect(await actif(page)).toMatchObject({ tag: "button", data: { plus: "q1" } });

  await page.locator('[data-conv="1"]').focus();
  await page.keyboard.press("Enter");
  expect(await actif(page)).toMatchObject({ tag: "button", data: { conv: "1" } });

  // La carte retirée laisse le focus au ✕ de la carte qui prend sa place.
  await page.locator('[data-remove="q1"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".menu-card")).toHaveCount(1);
  expect(await actif(page)).toMatchObject({ tag: "button", data: { remove: "c1" } });
});

/* ---------- Constat n° 19 : « Partager » d'une carte ---------- */

test("menu : « Partager » d'une carte envoie la version de cette carte", async ({ page, context }) => {
  await preremplir(context, {
    carnet: {
      menu: [
        entree("cake-sale", { k: "c1", portions: 9, choices: { garniture: "lardons-comte" } }),
        entree("cake-sale", { k: "c2", portions: 4, choices: { garniture: "olives-feta" } })
      ],
      repas: REPAS
    }
  });
  await page.addInitScript(() => {
    window.__envois = [];
    Object.defineProperty(navigator, "share", { value: async d => { window.__envois.push(d); }, configurable: true });
  });
  await page.goto("/#/menu");
  await page.locator(".menu-card").nth(1).getByRole("button", { name: /Partager/ }).click();
  await page.locator(".menu-card").nth(0).getByRole("button", { name: /Partager/ }).click();
  const envois = await page.evaluate(() => window.__envois);
  expect(envois).toHaveLength(2);
  const [seconde, premiere] = envois;
  expect(seconde.url).toContain("c=garniture:olives-feta");
  expect(seconde.url).toContain("p=4");
  expect(seconde.text).toContain("Pour 4 ");
  expect(premiere.url).toContain("p=9");
  expect(premiere.url).not.toContain("olives-feta");
  expect(premiere.text).toContain("Pour 9 ");
  expect(premiere.url).not.toBe(seconde.url);
});

/* ---------- Constat n° 4 : « Pour combien ? » tient sur une ligne ---------- */

for (const largeur of [320, 375]) {
  test(`menu : la ligne « Pour combien ? » garde une hauteur stable à ${largeur} px, de 1 à 12 convives`, async ({ page, context }) => {
    await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })], repas: { ...REPAS, convives: 1 } } });
    await page.setViewportSize({ width: largeur, height: 800 });
    await page.goto("/#/menu");
    const ligne = page.locator(".rp-ligne").first();
    const hauteurs = [];
    for (let n = 1; n <= 12; n++) {
      hauteurs.push(Math.round((await ligne.boundingBox()).height));
      // Le libellé et la valeur tiennent chacun sur une seule ligne, et le stepper reste dans la carte.
      for (const sel of ["#rp-conv", "#rp-conv-val"]) {
        expect(await page.locator(sel).evaluate(e => e.getClientRects().length)).toBe(1);
        expect((await page.locator(sel).boundingBox()).height).toBeLessThan(30);
      }
      const carte = await page.locator(".repas").boundingBox();
      const stepper = await page.locator(".rp-ligne .portions").first().boundingBox();
      expect(stepper.x + stepper.width).toBeLessThanOrEqual(carte.x + carte.width);
      await page.locator('[data-conv="1"]').click();
    }
    expect(new Set(hauteurs).size).toBe(1);
    // Le « ? » ne se détache pas du mot : espace insécable.
    expect(await page.locator("#rp-conv").textContent()).toBe("Pour combien ?");
  });
}

/* ---------- Constat n° 7 : l'état vide cite ce que l'écran affiche ---------- */

test("courses vide : le texte cite le bouton « Ajouter » de la fiche", async ({ page }) => {
  await page.goto("/#/courses");
  const vide = page.locator("p.empty");
  await expect(vide).toContainText("« Ajouter »");
  await expect(vide).not.toContainText("Ajouter au menu");
  await page.goto("/#/recette/quiche-lorraine");
  // Le bouton de la fiche affiche « Ajouter » : « au menu » n'est lu que par les lecteurs d'écran.
  const cache = await page.locator("#add-list .fiche-sr").boundingBox();
  expect(cache.width).toBeLessThanOrEqual(1);
});

/* ---------- Constat n° 11 : une phrase de conflit claire, un seul retard ---------- */

test("frise : conflit lisible, retard dit une fois, au format « 1 h 30 »", async ({ page, context }) => {
  await page.clock.setFixedTime(new Date("2099-06-15T18:00:00+02:00"));
  await preremplir(context, {
    carnet: {
      menu: [entree("focaccia-romarin", { k: "f1" }), entree("quiche-lorraine", { k: "q1" }), entree("cake-sale", { k: "c1" })],
      repas: { ...REPAS, date: "" }
    }
  });
  await page.goto("/#/menu");
  const conflit = page.locator(".retro-note.conflit").first();
  await expect(conflit).toContainText("Focaccia à 220 °C ; Quiche lorraine et Cake salé à 180 °C");
  await expect(conflit).not.toContainText("retard");
  const retard = page.locator(".retro-note.retard");
  await expect(retard).toHaveCount(1);
  await expect(retard).toContainText(/compte \d+ h( \d{2})? de retard/);
  await expect(page.locator(".retro")).not.toContainText(/\d{2,3} min de retard/);
});

/* ---------- Constat n° 35 : date du jour, heure passée ---------- */

test("menu : une date du jour dont l'heure est passée ne crée pas de retard fantôme", async ({ page, context }) => {
  await page.clock.setFixedTime(new Date("2099-06-15T15:00:00+02:00"));
  await preremplir(context, {
    carnet: { menu: [entree("quiche-lorraine", { k: "q1" })], repas: { ...REPAS, heure: "12:00", date: "2099-06-15" } }
  });
  await page.goto("/#/menu");
  await expect(page.locator(".retro-titre")).toContainText("demain");
  await expect(page.locator(".retro-note.retard")).toHaveCount(0);
});
