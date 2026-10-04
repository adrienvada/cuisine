/* Mode cuisine : étapes, minuteurs, ingrédients, gestes, préchauffage, mains libres, fin de séance et reprise. */

import { test, expect, lireCarnet, preremplir } from "./outils.js";

// La quiche a 5 étapes ; la deuxième (index 1) porte un minuteur de 20 min.
const CUISINE = "/#/recette/quiche-lorraine/cuisine";

test("mode cuisine : « Étape 1 / N », Suivant et Précédent", async ({ page }) => {
  await page.goto(CUISINE);
  const etiquette = page.locator(".cook-step-label");
  await expect(etiquette).toHaveText("Étape 1 / 5");
  await expect(page.getByRole("button", { name: "Précédent" })).toBeDisabled();

  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(etiquette).toHaveText("Étape 2 / 5");
  await expect(page).toHaveURL(/\/cuisine\/1$/);

  await page.getByRole("button", { name: "Précédent" }).click();
  await expect(etiquette).toHaveText("Étape 1 / 5");
});

test("minuteur : sa bulle apparaît sur une autre étape, sa croix l'arrête et « Annuler » le rétablit", async ({ page }) => {
  await page.goto(CUISINE + "/1");
  const plateau = page.locator("#timer-tray");
  await expect(plateau).toBeHidden();

  await page.getByRole("button", { name: /Minuteur 20 min/ }).click();
  await expect(page.locator("#timer-zone .clock")).toBeVisible();
  // Sur l'étape du minuteur, son compte à rebours est déjà en grand : pas de bulle visible.
  await expect(plateau.locator(".timer-pill")).toBeHidden();

  await page.getByRole("button", { name: "Suivant" }).click();
  const bulle = plateau.locator(".timer-pill");
  await expect(bulle).toHaveCount(1);
  await expect(bulle).toBeVisible();
  await expect(bulle).toContainText("Cuisson à blanc");
  const avant = (await lireCarnet(page)).timers[0];

  await bulle.locator(".t-x").click();
  await expect(plateau).toBeHidden();
  await expect(page.locator("#toast")).toContainText("Minuteur arrêté");
  expect((await lireCarnet(page)).timers).toEqual([]);

  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(bulle).toBeVisible();
  // Rétabli tel quel : même identifiant, même fin.
  expect((await lireCarnet(page)).timers[0]).toEqual(avant);
});

test("minuteur : +1 min allonge le compte à rebours", async ({ page }) => {
  await page.goto(CUISINE + "/1");
  await page.getByRole("button", { name: /Minuteur 20 min/ }).click();
  const avant = (await lireCarnet(page)).timers[0];
  await page.locator("#timer-zone").getByRole("button", { name: "+1 min" }).click();
  const apres = (await lireCarnet(page)).timers[0];
  expect(apres.end - avant.end).toBe(60000);
  await expect(page.locator("#timer-zone .clock")).toHaveText(/^(21:0\d|20:5\d)$/);
});

test("minuteur : pause puis reprise, et la bulle d'une autre étape offre les mêmes gestes", async ({ page }) => {
  await page.clock.install();
  await page.goto(CUISINE + "/1");
  await page.getByRole("button", { name: /Minuteur 20 min/ }).click();
  const zone = page.locator("#timer-zone");

  await zone.getByRole("button", { name: "Pause" }).click();
  const enPause = (await lireCarnet(page)).timers[0];
  expect(enPause.reste).toBeGreaterThan(19 * 60000);
  await expect(zone.getByRole("button", { name: "Reprendre" })).toBeVisible();
  const fige = await zone.locator(".clock").textContent();
  // Plus d'une seconde simulée s'écoule : un compte à rebours qui tournerait encore aurait bougé.
  await page.clock.runFor(1300);
  await expect(zone.locator(".clock")).toHaveText(fige);

  await zone.getByRole("button", { name: "Reprendre" }).click();
  const repris = (await lireCarnet(page)).timers[0];
  expect(repris.reste).toBeUndefined();
  expect(repris.end - Date.now()).toBeGreaterThan(19 * 60000);

  await page.getByRole("button", { name: "Suivant" }).click();
  await page.locator("#timer-tray .t-pause").click();
  expect((await lireCarnet(page)).timers[0].reste).toBeDefined();
  await expect(page.locator("#timer-tray .t-pause")).toHaveAccessibleName("Reprendre le minuteur");
});

test("étape : ses ingrédients en pastilles, aux portions de la séance", async ({ page, context }) => {
  await preremplir(context, { carnet: { portions: { "quiche-lorraine": 12 } } });
  await page.goto(CUISINE + "/2");
  const pastilles = page.locator(".cook-pastilles li");
  await expect(pastilles).toHaveCount(1);
  await expect(pastilles.first()).toContainText("400 g");
  await expect(pastilles.first()).toContainText("Lardons fumés");

  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(pastilles).toHaveCount(4);
  // Une étape qui n'en cite aucun (`ing: []`) n'affiche pas de rangée vide.
  await page.goto("/#/recette/focaccia-romarin/cuisine/2");
  await expect(page.locator(".cook-step-label")).toHaveText("Étape 3 / 5");
  await expect(page.locator(".cook-pastilles")).toHaveCount(0);
});

test("feuille Ingrédients : toute la liste aux bonnes portions, cochable, l'étape ne bouge pas", async ({ page, context }) => {
  await preremplir(context, { carnet: { portions: { "quiche-lorraine": 12 } } });
  await page.goto(CUISINE + "/2");
  await page.getByRole("button", { name: "Ingrédients" }).click();
  const feuille = page.locator(".ing-sheet");
  await expect(feuille).toBeVisible();
  await expect(feuille.locator(".ing-ligne")).toHaveCount(7);   // six ingrédients et la pâte du choix par défaut
  await expect(feuille).toContainText("400 g");
  await expect(feuille).toContainText("60 cl");

  await feuille.locator(".ing-ligne").first().click();
  await expect(feuille.locator("input").first()).toBeChecked();
  await page.getByRole("button", { name: "Fermer" }).last().click();
  await expect(feuille).toBeHidden();
  await expect(page.locator(".cook-step-label")).toHaveText("Étape 3 / 5");

  // Les coches sont celles de la séance : elles survivent au changement d'étape.
  await page.getByRole("button", { name: "Suivant" }).click();
  await page.getByRole("button", { name: "Ingrédients" }).click();
  await expect(page.locator(".ing-sheet input").first()).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(page.locator(".ing-sheet")).toBeHidden();
});

test("« Terminer » oublie les coches de mise en place", async ({ page }) => {
  await page.goto(CUISINE + "/4");
  await page.getByRole("button", { name: "Ingrédients" }).click();
  await page.locator(".ing-sheet .ing-ligne").first().click();
  await page.getByRole("button", { name: "Fermer" }).last().click();
  await page.getByRole("button", { name: /Terminer/ }).click();
  await expect(page).toHaveURL(/#\/recette\/quiche-lorraine$/);
  await page.goto(CUISINE);
  await page.getByRole("button", { name: "Ingrédients" }).click();
  await expect(page.locator(".ing-sheet input:checked")).toHaveCount(0);
});

test("ta note s'affiche à la première étape et dans la feuille, échappée", async ({ page, context }) => {
  await preremplir(context, { carnet: { notesPerso: { "quiche-lorraine": { txt: "Plus de gruyère <b>!</b>", at: 1 } } } });
  await page.goto(CUISINE);
  const note = page.locator(".cook-etape .note-perso");
  await expect(note).toContainText("Plus de gruyère <b>!</b>");
  await expect(note.locator("b")).toHaveCount(1);   // le seul <b> est le titre « Ta note »
  await page.getByRole("button", { name: "Ingrédients" }).click();
  await expect(page.locator(".ing-sheet .note-perso")).toContainText("Plus de gruyère");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(page.locator(".cook-etape .note-perso")).toHaveCount(0);
});

/* Un balayage, comme le fait un doigt : appui, déplacement, relevé. */
const balayer = (page, dx, dy = 0) => page.evaluate(([dx, dy]) => {
  const corps = document.querySelector(".cook-body");
  const r = corps.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const evt = (type, px, py) => corps.dispatchEvent(new PointerEvent(type, {
    bubbles: true, pointerId: 7, pointerType: "touch", clientX: px, clientY: py
  }));
  evt("pointerdown", x, y);
  evt("pointerup", x + dx, y + dy);
}, [dx, dy]);

test("balayage : à gauche étape suivante, à droite précédente, le vertical ne compte pas", async ({ page }) => {
  await page.goto(CUISINE);
  const etiquette = page.locator(".cook-step-label");
  await balayer(page, -120);
  await expect(etiquette).toHaveText("Étape 2 / 5");
  await balayer(page, -120, 150);          // plutôt vertical : rien
  await expect(etiquette).toHaveText("Étape 2 / 5");
  await balayer(page, -20);                // trop court : rien
  await expect(etiquette).toHaveText("Étape 2 / 5");
  await balayer(page, 120);
  await expect(etiquette).toHaveText("Étape 1 / 5");
  await balayer(page, 120);                // déjà à la première : rien
  await expect(etiquette).toHaveText("Étape 1 / 5");
});

test("flèches du clavier : droite suivante, gauche précédente", async ({ page }) => {
  await page.goto(CUISINE);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".cook-step-label")).toHaveText("Étape 2 / 5");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".cook-step-label")).toHaveText("Étape 1 / 5");
});

test("le titre de l'étape reste en haut : il ne saute pas d'une étape à l'autre", async ({ page }) => {
  await page.goto(CUISINE);
  const haut = async () => (await page.locator(".cook-body h2").boundingBox()).y;
  const premier = await haut();
  for (const i of [1, 2, 3, 4]) {
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".cook-step-label")).toHaveText(`Étape ${i + 1} / 5`);
    expect(Math.abs((await haut()) - premier)).toBeLessThan(2);
  }
});

test("préchauffage : bandeau à l'étape où lancer le four, minuteur de 15 min", async ({ page }) => {
  // Quiche : le four sert dès l'étape 2, aucun minuteur avant — on prévient dès la première.
  await page.goto(CUISINE);
  const bandeau = page.locator(".cook-chauffe");
  await expect(bandeau).toContainText("Lance le préchauffage : 180 °C");
  await bandeau.getByRole("button", { name: /Minuteur 15 min/ }).click();
  await expect(bandeau).toContainText("Préchauffage en cours");
  await expect(bandeau.locator(".clock")).toBeVisible();
  const t = (await lireCarnet(page)).timers[0];
  expect(t.label).toBe("Préchauffage du four");
  expect(t.total).toBe(15);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".cook-chauffe")).toHaveCount(0);
});

test("préchauffage : pas de bandeau quand une étape précédente en parle déjà", async ({ page }) => {
  // Focaccia : l'étape 3 dit déjà « Lancez le préchauffage… ».
  await page.goto("/#/recette/focaccia-romarin/cuisine");
  for (let i = 0; i < 5; i++) {
    await expect(page.locator(".cook-step-label")).toHaveText(`Étape ${i + 1} / 5`);
    await expect(page.locator(".cook-chauffe")).toHaveCount(0);
    await page.keyboard.press("ArrowRight");
  }
});

test("taille du texte : A+ et A− changent la taille, gardée dans les réglages", async ({ page }) => {
  await page.goto(CUISINE);
  const taille = () => page.locator(".cook .txt").evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  await expect(page.locator(".cook")).toHaveClass(/taille-1/);
  const moyenne = await taille();

  await page.getByRole("button", { name: "Texte plus grand" }).click();
  await expect(page.locator(".cook")).toHaveClass(/taille-2/);
  expect(await taille()).toBeGreaterThan(moyenne);
  await expect(page.getByRole("button", { name: "Texte plus grand" })).toBeDisabled();
  expect((await lireCarnet(page)).reglages.tailleCuisine).toBe("grande");

  // Retenue d'une visite à l'autre.
  await page.reload();
  await expect(page.locator(".cook")).toHaveClass(/taille-2/);

  await page.getByRole("button", { name: "Texte plus petit" }).click();
  await page.getByRole("button", { name: "Texte plus petit" }).click();
  await expect(page.locator(".cook")).toHaveClass(/taille-0/);
  expect(await taille()).toBeLessThan(moyenne);
  await expect(page.getByRole("button", { name: "Texte plus petit" })).toBeDisabled();
  expect((await lireCarnet(page)).reglages.tailleCuisine).toBe("petite");
});

/* Le module de voix est écrit à part : on le simule, en notant ce qu'on lui demande. */
const MODULE_VOIX = `
  const note = (...a) => (window.__voix = window.__voix || []).push(a);
  export const voixDisponible = () => ({ ecoute: true, lecture: true });
  export const lire = async texte => { note("lire", texte); };
  export const arreterLecture = () => { note("silence"); };
  export const ecouter = (commandes, options) => {
    window.__commandes = commandes;
    note("ecouter");
    return { arreter() { note("arreter"); } };
  };`;

const simulerVoix = page => page.route("**/js/ui/voix.js", route =>
  route.fulfill({ contentType: "text/javascript", body: MODULE_VOIX }));

test("mains libres : sans module de voix, pas de micro", async ({ page }) => {
  await page.route("**/js/ui/voix.js", route => route.fulfill({ status: 404, body: "" }));
  await page.goto(CUISINE);
  await expect(page.locator(".cook-step-label")).toBeVisible();
  await expect(page.locator("#cook-micro")).toHaveCount(0);
});

test("mains libres : le micro écoute, lit l'étape à chaque changement, un second toucher arrête", async ({ page }) => {
  await simulerVoix(page);
  await page.goto(CUISINE);
  const micro = page.getByRole("button", { name: "Mains libres" });
  await expect(micro).toBeVisible();
  await expect(micro).toHaveAttribute("aria-pressed", "false");

  await micro.click();
  await expect(micro).toHaveAttribute("aria-pressed", "true");
  const journal = () => page.evaluate(() => window.__voix);
  expect((await journal()).some(e => e[0] === "ecouter")).toBe(true);
  expect((await journal()).filter(e => e[0] === "lire").length).toBe(1);

  // Une commande vocale fait avancer, et l'étape suivante est lue.
  await page.evaluate(() => window.__commandes.suivant());
  await expect(page.locator(".cook-step-label")).toHaveText("Étape 2 / 5");
  const lectures = (await journal()).filter(e => e[0] === "lire");
  expect(lectures.length).toBe(2);
  expect(lectures[1][1]).toContain("Cuisson à blanc");

  await page.evaluate(() => window.__commandes.ingredients());
  await expect(page.locator(".ing-sheet")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Mains libres" }).click();
  await expect(page.getByRole("button", { name: "Mains libres" })).toHaveAttribute("aria-pressed", "false");
  expect((await journal()).some(e => e[0] === "arreter")).toBe(true);
});

test("mains libres : l'écoute s'arrête en quittant le mode cuisine", async ({ page }) => {
  await simulerVoix(page);
  await page.goto(CUISINE);
  await page.getByRole("button", { name: "Mains libres" }).click();
  await page.getByRole("button", { name: "Fermer" }).click();
  await expect(page).toHaveURL(/#\/recette\/quiche-lorraine$/);
  expect((await page.evaluate(() => window.__voix)).some(e => e[0] === "arreter")).toBe(true);
});

test("« Terminer » à la dernière étape revient à la fiche, « Cuisinée une fois »", async ({ page }) => {
  await page.goto(CUISINE);
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Suivant" }).click();
  await expect(page.locator(".cook-step-label")).toHaveText("Étape 5 / 5");

  await page.getByRole("button", { name: /Terminer/ }).click();
  await expect(page).toHaveURL(/#\/recette\/quiche-lorraine$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quiche lorraine");
  await expect(page.locator("#cooked-line")).toContainText("Cuisinée une fois");
});

test("« Terminer » : sans module journal, le message reste celui d'avant", async ({ page }) => {
  await page.route("**/js/vues/journal.js", route => route.fulfill({ status: 404, body: "" }));
  await page.goto(CUISINE + "/4");
  await page.getByRole("button", { name: /Terminer/ }).click();
  await expect(page.locator("#toast")).toContainText("Bon appétit");
  await expect(page.locator("#toast .toast-action")).toHaveCount(0);
});

test("« Terminer » : avec le journal, le message propose « Ajouter au journal »", async ({ page }) => {
  await page.route("**/js/vues/journal.js", route => route.fulfill({
    contentType: "text/javascript",
    body: "export const ouvrirJournal = rid => { window.__journal = rid; }; export const dessinerJournal = () => {};"
  }));
  await page.goto(CUISINE + "/4");
  await page.getByRole("button", { name: /Terminer/ }).click();
  await page.getByRole("button", { name: "Ajouter au journal" }).click();
  expect(await page.evaluate(() => window.__journal)).toBe("quiche-lorraine");
});

test("reprise : à l'étape 3, la fiche propose « Reprendre » « étape 3 / N »", async ({ page }) => {
  await page.goto(CUISINE);
  await page.getByRole("button", { name: "Suivant" }).click();
  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(page.locator(".cook-step-label")).toHaveText("Étape 3 / 5");

  await page.getByRole("button", { name: "Fermer" }).click();
  await expect(page).toHaveURL(/#\/recette\/quiche-lorraine$/);
  const reprise = page.locator(".actions a.resume");
  await expect(reprise).toContainText("Reprendre");
  await expect(reprise).toContainText("étape 3 / 5");
  await expect(page.getByRole("button", { name: "Repartir du début" })).toBeVisible();
});

/* ---------- Son, verrou d'écran, retard ---------- */

const minuteurPret = retardMs => ({
  id: "tprt", rid: "quiche-lorraine", mk: null, step: 1, slot: null, label: "Cuisson à blanc", emoji: "🥧",
  end: Date.now() - retardMs, total: 20, fired: false
});

/* Compte les notes de sonnerie jouées : une sonnerie en fait trois. */
const compterSons = context => context.addInitScript(() => {
  window.__sons = 0;
  const natif = AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator = function (...a) { window.__sons++; return natif.apply(this, a); };
});

test("un minuteur fini en arrière-plan sonne tout de suite et dit depuis quand", async ({ page, context }) => {
  await compterSons(context);
  await preremplir(context, { carnet: { timers: [minuteurPret(3 * 60000 + 5000)] } });
  await page.goto("/#/recette/focaccia-romarin");
  await expect(page.locator("#toast")).toContainText("Prêt depuis 3 min");
  await expect(page.locator("#timer-tray .timer-pill.done")).toBeVisible();
  expect(await page.evaluate(() => window.__sons)).toBeGreaterThan(0);
});

test("la sonnerie se répète toutes les 2 s jusqu'à « OK »", async ({ page, context }) => {
  await compterSons(context);
  await preremplir(context, { carnet: { timers: [minuteurPret(1000)] } });
  await page.clock.install();
  await page.goto("/#/recette/focaccia-romarin");
  await page.clock.runFor(1000);
  const sons = () => page.evaluate(() => window.__sons);
  const premier = await sons();
  expect(premier).toBeGreaterThan(0);
  await page.clock.runFor(6500);
  // Trois relances en 6,5 s.
  expect(await sons()).toBeGreaterThanOrEqual(premier + 3 * 3);

  await page.locator("#timer-tray .t-x").click();
  await expect(page.locator("#timer-tray")).toBeHidden();
  const apres = await sons();
  await page.clock.runFor(6000);
  expect(await sons()).toBe(apres);
});

test("la sonnerie s'éteint d'elle-même au bout de 2 min", async ({ page, context }) => {
  await compterSons(context);
  await preremplir(context, { carnet: { timers: [minuteurPret(1000)] } });
  await page.clock.install();
  await page.goto("/#/recette/focaccia-romarin");
  await page.clock.runFor(125000);
  const sons = await page.evaluate(() => window.__sons);
  expect(sons).toBeGreaterThan(30);
  await page.clock.runFor(10000);
  expect(await page.evaluate(() => window.__sons)).toBe(sons);
});

test("l'écran reste allumé tant qu'un minuteur tourne, même hors du mode cuisine", async ({ page, context }) => {
  await context.addInitScript(() => {
    window.__verrou = [];
    const faux = { request: async () => {
      window.__verrou.push("pris");
      return { release: async () => { window.__verrou.push("relâché"); }, addEventListener() {} };
    } };
    Object.defineProperty(navigator, "wakeLock", { value: faux, configurable: true });
  });
  await page.goto("/#/recette/focaccia-romarin");
  expect(await page.evaluate(() => window.__verrou)).toEqual([]);

  await page.goto(CUISINE + "/1");
  await page.getByRole("button", { name: /Minuteur 20 min/ }).click();
  // Sortie du mode cuisine : le minuteur tourne encore, le verrou reste.
  await page.getByRole("button", { name: "Fermer" }).click();
  await expect(page.locator("#timer-tray .timer-pill")).toBeVisible();
  expect(await page.evaluate(() => window.__verrou)).not.toContain("relâché");

  // Plus rien ne tourne : il est relâché.
  await page.locator("#timer-tray .t-x").click();
  await expect.poll(() => page.evaluate(() => window.__verrou)).toContain("relâché");
});

test("375 px : aucun débordement horizontal, le plateau a sa place, zones de contact de 44 px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(CUISINE + "/1");
  await page.getByRole("button", { name: /Minuteur 20 min/ }).click();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#timer-tray .timer-pill")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  // Le plateau ne recouvre ni « Précédent » ni « Suivant ».
  const [plateau, nav] = await page.evaluate(() => ["#timer-tray", ".cook-nav"].map(s => {
    const r = document.querySelector(s).getBoundingClientRect();
    return { haut: r.top, bas: r.bottom };
  }));
  expect(plateau.bas).toBeLessThanOrEqual(nav.haut + 1);
  for (const b of await page.locator(".cook-outils button, .cook-top button, #timer-tray button").all()) {
    const boite = await b.boundingBox();
    expect(boite.height).toBeGreaterThanOrEqual(43.5);
    expect(boite.width).toBeGreaterThanOrEqual(43.5);
  }
});

test("mode cuisine : toutes les bulles restent visibles, y compris celle qui sonne", async ({ page, context }) => {
  const un = (id, step, label, delta) => ({
    id, rid: "quiche-lorraine", mk: null, step, slot: null, label, emoji: "🥧",
    end: Date.now() + delta, total: 10, fired: delta < 0
  });
  await preremplir(context, { carnet: { timers: [un("a", 1, "Pâte", 600000), un("b", 3, "Gratin", 900000), un("c", 4, "Prêt", -4000)] } });
  await page.goto(CUISINE + "/0");
  const pilules = page.locator("#timer-tray .timer-pill");
  await expect(pilules).toHaveCount(3);
  for (const p of await pilules.all()) {
    const boite = await p.boundingBox();
    expect(boite.x).toBeGreaterThanOrEqual(0);
    expect(boite.x + boite.width).toBeLessThanOrEqual(390.5);
  }
  await expect(pilules.first()).toHaveClass(/done/);
  await expect(pilules.first()).toBeInViewport();
});

test("page rouverte avec un minuteur : le premier toucher réveille le son", async ({ page, context }) => {
  await context.addInitScript(() => {
    window.__audio = [];
    const Natif = window.AudioContext || window.webkitAudioContext;
    class Espion extends Natif {
      constructor(...a) { super(...a); window.__audio.push({ type: "create", geste: navigator.userActivation.isActive }); }
    }
    window.AudioContext = Espion;
    window.webkitAudioContext = Espion;
  });
  await preremplir(context, { carnet: { timers: [{ id: "t1", rid: "quiche-lorraine", mk: null, step: 1, slot: null, label: "Pâte", emoji: "🥧", end: Date.now() + 600000, total: 10, fired: false }] } });
  await page.goto("/#/recette/quiche-lorraine");
  expect(await page.evaluate(() => window.__audio)).toEqual([]);
  await page.locator("body").tap({ position: { x: 20, y: 300 } });
  const journal = await page.evaluate(() => window.__audio);
  expect(journal.some(e => e.type === "create" && e.geste), JSON.stringify(journal)).toBe(true);
});
