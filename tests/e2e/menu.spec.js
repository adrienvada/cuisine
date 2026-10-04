/* Au menu : le repas (convives, heure, allergies), la frise, le calendrier, les repas passés, les annulations. */

import { readFileSync } from "node:fs";
import { test, expect, preremplir, entree, lireCarnet } from "./outils.js";

/* Une date lointaine : la frise ne dépend alors pas de l'horloge du test. */
const REPAS = { convives: 6, heure: "20:00", date: "2099-06-15", exclus: [] };

const carte = (page, titre) => page.locator(".menu-card", { hasText: titre });
const annuler = page => page.locator("#toast").getByRole("button", { name: "Annuler" });

/* Aucune boîte de dialogue du navigateur dans ce lot : si une s'ouvre, le test échoue. */
test.beforeEach(({ page }) => {
  page.dialogues = [];
  page.on("dialog", d => { page.dialogues.push(d.message()); d.dismiss(); });
});
test.afterEach(({ page }) => {
  expect(page.dialogues).toEqual([]);
});

test("convives : régler « Pour combien ? » règle les portions des entrées en personnes, pas les autres", async ({ page, context }) => {
  await preremplir(context, {
    carnet: {
      menu: [
        entree("quiche-lorraine", { k: "q1" }),
        entree("cake-sale", { k: "c1", portions: 9 }),
        entree("cocktail-concombre-menthe", { k: "v1", portions: 3 }),
        entree("tartines-figues-chevre-miel", { k: "t1", portions: 5 })
      ],
      repas: { ...REPAS, convives: 8 }
    }
  });
  await page.goto("/#/menu");
  await expect(page.locator("#rp-conv-val")).toHaveText("8 convives");

  await page.getByRole("button", { name: "Un convive de plus" }).click();
  await expect(page.locator("#rp-conv-val")).toHaveText("9 convives");
  await page.getByRole("button", { name: "Un convive de moins" }).click();
  await page.getByRole("button", { name: "Un convive de moins" }).click();
  await expect(page.locator("#rp-conv-val")).toHaveText("7 convives");

  await expect(carte(page, "Quiche lorraine").locator(".mc-portions .val")).toHaveText("7 personnes");
  await expect(carte(page, "Cake salé").locator(".mc-portions .val")).toHaveText("7 personnes");
  await expect(carte(page, "Cocktail").locator(".mc-portions .val")).toHaveText("3 verres");
  await expect(carte(page, "Tartines").locator(".mc-portions .val")).toHaveText("5 tartines");

  const carnet = await lireCarnet(page);
  expect(carnet.repas.convives).toBe(7);
  expect(carnet.menu.find(e => e.k === "q1").portions).toBe(7);
  expect(carnet.menu.find(e => e.k === "v1").portions).toBe(3);

  // Un convive en plus pour une seule entrée ne dérègle pas les convives.
  await carte(page, "Quiche lorraine").getByRole("button", { name: "Plus de portions" }).click();
  await expect(page.locator("#rp-conv-val")).toHaveText("7 convives");
});

test("frise : « À table à 20 h », départs et préchauffage dans l'ordre", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("focaccia-romarin", { k: "f1" })], repas: REPAS } });
  await page.goto("/#/menu");

  await expect(page.locator(".retro-titre")).toContainText("À table à 20 h");
  const lignes = page.locator(".frise .fr");
  await expect(lignes).toHaveCount(5);
  await expect(lignes.nth(0)).toContainText("16 h 30");
  await expect(lignes.nth(0)).toContainText("Démarre : Focaccia");
  await expect(lignes.nth(1)).toContainText("19 h 20");
  await expect(lignes.nth(1)).toContainText("Préchauffe le four à 220 °C");
  await expect(lignes.nth(2)).toContainText("19 h 40");
  await expect(lignes.nth(2)).toContainText("Enfourne : Focaccia (220 °C)");
  await expect(lignes.nth(3)).toContainText("Sors du four : Focaccia");
  await expect(lignes.nth(4)).toContainText("À table !");
  await expect(page.locator(".retro-note")).toHaveCount(0);

  // Changer l'heure déplace tout.
  await page.locator("#repas-heure").fill("19:30");
  await expect(page.locator(".retro-titre")).toContainText("À table à 19 h 30");
  await expect(lignes.nth(0)).toContainText("16 h");
  expect((await lireCarnet(page)).repas.heure).toBe("19:30");
});

test("frise : deux recettes qui veulent le four à des températures différentes, le conflit est dit et résolu", async ({ page, context }) => {
  await preremplir(context, {
    carnet: { menu: [entree("focaccia-romarin", { k: "f1" }), entree("quiche-lorraine", { k: "q1" })], repas: REPAS }
  });
  await page.goto("/#/menu");

  const note = page.locator(".retro-note.conflit");
  await expect(note).toHaveCount(1);
  await expect(note).toContainText("Focaccia à 220 °C et Quiche lorraine à 180 °C en même temps : enfourne « Focaccia » d'abord");
  await expect(note).toContainText("l'heure est tenue");
  await expect(page.locator(".retro-note.retard")).toHaveCount(0);

  // La focaccia est enfournée avant la quiche, et le four est réglé entre les deux.
  const textes = await page.locator(".frise .fr-txt").allTextContents();
  const place = motif => textes.findIndex(t => t.includes(motif));
  expect(place("Enfourne : Focaccia")).toBeLessThan(place("Enfourne : Quiche lorraine"));
  expect(place("Sors du four : Focaccia")).toBeLessThan(place("Enfourne : Quiche lorraine"));
  expect(place("Règle le four à 180 °C")).toBeGreaterThan(-1);
  // Les heures de la frise ne reculent jamais.
  const heures = (await page.locator(".frise .fr-h").allTextContents())
    .map(h => { const m = /(\d+) h(?: (\d+))?/.exec(h); return +m[1] * 60 + +(m[2] || 0); });
  expect([...heures].sort((a, b) => a - b)).toEqual(heures);
});

test("frise : quatre températures, deux phrases de conflit au plus, le reste se replie sous un résumé", async ({ page, context }) => {
  await preremplir(context, {
    carnet: {
      menu: [entree("focaccia-romarin", { k: "f1" }), entree("torsades-pesto", { k: "t1" }), entree("quiche-lorraine", { k: "q1" }), entree("mi-cuit-chocolat-suzy-palatin", { k: "m1" })],
      repas: REPAS
    }
  });
  await page.goto("/#/menu");
  await expect(page.locator(".retro > .retro-note.conflit")).toHaveCount(2);
  const plus = page.locator(".retro-plus");
  await expect(plus).toContainText("autres conflits de four");
  /* Le mi-cuit préchauffe à 200 °C (il cuit à 150 °C) : il rejoint les torsades, plus de conflit entre eux. */
  await expect(plus.locator(".retro-note.conflit")).toHaveCount(2);
  await expect(plus.locator(".retro-note.conflit").first()).toBeHidden();
  await plus.locator("summary").click();
  await expect(plus.locator(".retro-note.conflit").first()).toBeVisible();
});

test("frise : trop tard pour l'heure demandée, le retard est annoncé", async ({ page, context }) => {
  await page.clock.setFixedTime(new Date("2099-06-15T18:00:00+02:00"));
  await preremplir(context, {
    carnet: { menu: [entree("focaccia-romarin", { k: "f1" })], repas: { ...REPAS, date: "" } }
  });
  await page.goto("/#/menu");

  const retard = page.locator(".retro-note.retard");
  await expect(retard).toContainText("90 min de retard");
  await expect(retard).toContainText("21 h 30");
  await expect(page.locator(".frise .fr").first()).toContainText("18 h");
});

test("frise : sans heure valable, on invite à l'indiquer au lieu de planter", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })], repas: { ...REPAS, heure: "" } } });
  await page.goto("/#/menu");
  await expect(page.locator(".retro-note")).toContainText("Indique l'heure du repas");
  await expect(page.locator(".frise")).toHaveCount(0);
});

test("calendrier : « Ajouter au calendrier » télécharge un .ics aux événements, rappels et fuseau", async ({ page, context }) => {
  await preremplir(context, {
    carnet: { menu: [entree("focaccia-romarin", { k: "f1" }), entree("quiche-lorraine", { k: "q1" })], repas: REPAS }
  });
  await page.goto("/#/menu");

  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Ajouter au calendrier" }).click()]);
  expect(dl.suggestedFilename()).toBe("repas-2099-06-15.ics");
  const ics = readFileSync(await dl.path(), "utf8");
  expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
  expect(ics).toContain("TZID:Europe/Paris");
  expect(ics).toContain("SUMMARY:Cuisiner : Focaccia");
  expect(ics).toContain("SUMMARY:Cuisiner : Quiche lorraine");
  expect(ics).toContain("SUMMARY:À table !");
  expect(ics).toContain("DTSTART;TZID=Europe/Paris:20990615T200000");
  expect(ics).toContain("DESCRIPTION:6 convives");
  expect(ics).toMatch(/SUMMARY:Préchauffe le four à 220 °C/);
  expect((ics.match(/BEGIN:VALARM/g) || []).length).toBeGreaterThanOrEqual(4);
  expect(ics).toContain("TRIGGER:-PT30M");
});

test("calendrier : quand le téléphone sait partager un fichier, c'est la feuille de partage qui le reçoit", async ({ page, context }) => {
  await context.addInitScript(() => {
    navigator.canShare = d => !!(d && d.files && d.files.length);
    navigator.share = async d => {
      const f = d.files[0];
      window.__partage = { nom: f.name, type: f.type, texte: await f.text() };
    };
  });
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })], repas: REPAS } });
  await page.goto("/#/menu");
  await page.getByRole("button", { name: "Ajouter au calendrier" }).click();
  await expect.poll(() => page.evaluate(() => window.__partage && window.__partage.nom)).toBe("repas-2099-06-15.ics");
  const p = await page.evaluate(() => window.__partage);
  expect(p.type).toBe("text/calendar");
  expect(p.texte).toContain("BEGIN:VCALENDAR");
  expect(p.texte).toContain("SUMMARY:Cuisiner : Quiche lorraine");
});

test("allergies : un allergène à éviter marque les cartes qui en contiennent, version composée comprise", async ({ page, context }) => {
  await preremplir(context, {
    carnet: {
      menu: [
        entree("cake-sale", { k: "c1", choices: { garniture: "lardons-comte" } }),
        entree("cake-sale", { k: "c2", choices: { garniture: "saumon-aneth" } }),
        entree("cocktail-concombre-menthe", { k: "v1" })
      ],
      repas: REPAS
    }
  });
  await page.goto("/#/menu");
  await expect(page.locator(".mc-alerte")).toHaveCount(0);

  await page.getByText("Invités et allergies").click();
  await page.getByRole("button", { name: /Lait/ }).click();
  // Le panneau reste ouvert après le redessin, et le choix est retenu.
  await expect(page.getByRole("button", { name: /Lait/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".alg-n")).toHaveText("1 à éviter");

  const alerte1 = page.locator('.menu-card[data-open="c1"] .mc-alerte');
  await expect(alerte1).toContainText("Contient du lait : lait, beurre, comté râpé");
  // Le cake au saumon contient aussi du lait (la pâte, et le beurre du moule), mais pas de comté.
  await expect(page.locator('.menu-card[data-open="c2"] .mc-alerte')).toContainText("Contient du lait : lait");
  await expect(page.locator('.menu-card[data-open="c2"] .mc-alerte')).not.toContainText("comté");
  await expect(page.locator('.menu-card[data-open="v1"] .mc-alerte')).toHaveCount(0);
  expect((await lireCarnet(page)).repas.exclus).toEqual(["lait"]);

  await page.getByRole("button", { name: /Poissons/ }).click();
  await expect(page.locator('.menu-card[data-open="c2"] .mc-alerte')).toHaveCount(2);
  await expect(page.locator('.menu-card[data-open="c2"] .mc-alerte', { hasText: "du poisson" })).toContainText("saumon fumé");

  await page.getByRole("button", { name: /Lait/ }).click();
  await page.getByRole("button", { name: /Poissons/ }).click();
  await expect(page.locator(".mc-alerte")).toHaveCount(0);
});

test("historique : vider le menu range le repas, « Repas passés » (repliée) le refait avec des clés neuves", async ({ page, context }) => {
  await preremplir(context, {
    carnet: {
      menu: [
        entree("cake-sale", { k: "c1", choices: { garniture: "olives-feta" }, addons: ["herbes-provence"], portions: 8 }),
        entree("quiche-lorraine", { k: "q1", portions: 8 })
      ],
      repas: { ...REPAS, convives: 8 }
    }
  });
  await page.goto("/#/menu");
  await expect(page.locator(".passes")).toHaveCount(0);

  await page.getByRole("button", { name: "Vider le menu" }).click();
  await expect(page.locator(".menu-card")).toHaveCount(0);
  await expect(page.locator("#toast")).toContainText("Menu vidé");

  const carnet = await lireCarnet(page);
  expect(carnet.menu).toEqual([]);
  expect(carnet.historique).toHaveLength(1);
  expect(carnet.historique[0]).toMatchObject({ date: "2099-06-15", convives: 8 });
  expect(carnet.historique[0].entrees).toEqual(expect.arrayContaining([
    { rid: "cake-sale", choices: { garniture: "olives-feta" }, addons: ["herbes-provence"], portions: 8 }
  ]));

  // Repliée tant qu'on ne l'ouvre pas.
  const passes = page.locator("details.passes");
  await expect(passes).toBeVisible();
  expect(await passes.evaluate(d => d.open)).toBe(false);
  await expect(passes.locator("summary")).toContainText("Repas passés");
  await passes.locator("summary").click();
  await expect(passes.locator(".passe")).toHaveCount(1);
  await expect(passes.locator(".passe")).toContainText("8 convives");
  await expect(passes.locator(".passe")).toContainText("Cake salé · Quiche lorraine");

  await page.getByRole("button", { name: "Refaire ce repas" }).click();
  await expect(page.locator(".menu-card")).toHaveCount(2);
  await expect(carte(page, "Cake salé")).toContainText("Olives & feta");
  await expect(carte(page, "Cake salé").locator(".mc-portions .val")).toHaveText("8 personnes");
  await expect(page.locator("#rp-conv-val")).toHaveText("8 convives");
  const apres = await lireCarnet(page);
  expect(apres.menu.map(e => e.k)).not.toContain("c1");
  expect(apres.menu.map(e => e.k)).not.toContain("q1");
  expect(new Set(apres.menu.map(e => e.k)).size).toBe(2);
  expect(apres.historique).toHaveLength(1);

  // Le toast défait le geste.
  await annuler(page).click();
  await expect(page.locator(".menu-card")).toHaveCount(0);
});

test("annuler : retirer une carte se fait tout de suite, « Annuler » la remet à sa place", async ({ page, context }) => {
  await preremplir(context, {
    carnet: {
      menu: [entree("cake-sale", { k: "a", addons: ["herbes-provence"] }), entree("quiche-lorraine", { k: "b" })],
      repas: REPAS
    }
  });
  await page.goto("/#/menu");
  await expect(page.locator(".menu-card")).toHaveCount(2);

  await page.locator('.menu-card[data-open="a"] .mc-x').click();
  await expect(page.locator(".menu-card")).toHaveCount(1);
  await expect(page.locator("#toast")).toContainText("Retiré du menu");
  await expect(annuler(page)).toBeVisible();
  const boite = await annuler(page).boundingBox();
  expect(boite.height).toBeGreaterThanOrEqual(44);

  await annuler(page).click();
  await expect(page.locator(".menu-card")).toHaveCount(2);
  const carnet = await lireCarnet(page);
  expect(carnet.menu.find(e => e.k === "a").addons).toEqual(["herbes-provence"]);
  await expect(page.locator("#menu-badge")).toHaveText("2");
});

test("annuler : vider le menu, puis « Annuler » restaure menu, coches et repas tels quels", async ({ page, context }) => {
  await preremplir(context, {
    carnet: {
      menu: [entree("focaccia-romarin", { k: "f1", portions: 5 })],
      checked: { "farine-pain": true, "x-e1": true },
      extras: [{ id: "e1", name: "Glaçons" }],
      repas: REPAS
    }
  });
  await page.goto("/#/menu");
  await page.getByRole("button", { name: "Vider le menu" }).click();
  await expect(page.locator(".menu-card")).toHaveCount(0);
  const vide = await lireCarnet(page);
  expect(vide.checked).toEqual({ "x-e1": true });
  expect(vide.extras).toEqual([{ id: "e1", name: "Glaçons" }]);
  expect(vide.historique).toHaveLength(1);

  await annuler(page).click();
  await expect(page.locator(".menu-card")).toHaveCount(1);
  const retour = await lireCarnet(page);
  expect(retour.menu).toEqual([{ k: "f1", rid: "focaccia-romarin", choices: {}, addons: [], portions: 5 }]);
  expect(retour.checked).toEqual({ "farine-pain": true, "x-e1": true });
  expect(retour.historique || []).toHaveLength(0);
  expect(retour.repas).toEqual(REPAS);
  await expect(page.locator("#menu-badge")).toHaveText("1");
});

test("mise en page : rien ne déborde à 375 px, zones de contact d'au moins 44 px, en clair comme en sombre", async ({ page, context }) => {
  await preremplir(context, {
    carnet: {
      menu: [entree("focaccia-romarin", { k: "f1" }), entree("quiche-lorraine", { k: "q1" }), entree("cake-sale", { k: "c1" })],
      repas: { ...REPAS, exclus: ["lait"] },
      historique: [{ id: "h1", date: "2099-01-02", convives: 4, entrees: [{ rid: "quiche-lorraine", choices: {}, addons: [], portions: 4 }] }]
    }
  });
  await page.setViewportSize({ width: 375, height: 800 });
  for (const theme of ["light", "dark"]) {
    await page.goto("/#/menu");
    await page.evaluate(t => { if (t === "dark") document.documentElement.setAttribute("data-theme", "dark"); else document.documentElement.removeAttribute("data-theme"); }, theme);
    await page.locator("details.alg").evaluate(d => { d.open = true; });
    await page.locator("details.passes").evaluate(d => { d.open = true; });
    await expect(page.locator(".frise .fr").first()).toBeVisible();

    const debord = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(debord, theme).toBeLessThanOrEqual(0);

    const petits = await page.evaluate(() => [...document.querySelectorAll(
      ".repas button, .repas summary, .repas input, .alg-chip, #ajout-calendrier, .passes summary, .passe-refaire, #clear-menu, .mc-x, .mc-btn"
    )].map(el => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width && r.height && (r.height < 43.5 || r.width < 43.5))
      .map(({ el, r }) => `${el.className || el.id || el.tagName} ${Math.round(r.width)}×${Math.round(r.height)}`));
    expect(petits, theme).toEqual([]);
  }
});
