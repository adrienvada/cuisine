/* Lot « cuisine » de la vague 3 : pages qui tournent au doigt, progression, minuteur de repos, anneaux, sonnerie, fin de recette, taille du texte. */

import { test, expect, lireCarnet, pageStable, preremplir } from "./outils.js";

const CUISINE = "/#/recette/quiche-lorraine/cuisine";       // 5 étapes ; la 2e (index 1) a un minuteur de 20 min
const FOCACCIA = "/#/recette/focaccia-romarin/cuisine";     // la 1re étape est une levée de 2 h (repos)

/* Enregistre ce que la page anime (Element.animate) et ce qu'elle fait vibrer : on prouve un effet
   par ses appels, sans attendre qu'une animation de quelques centaines de millisecondes passe. */
const espionner = context => context.addInitScript(() => {
  window.__animations = [];
  window.__vibrations = [];
  const natif = Element.prototype.animate;
  Element.prototype.animate = function (frames, options) {
    const liste = Array.isArray(frames) ? frames : [];
    window.__animations.push({
      cible: this.className || this.tagName,
      pseudo: (options && options.pseudoElement) || "",
      props: [...new Set(liste.flatMap(f => Object.keys(f)))]
    });
    return natif.call(this, frames, options);
  };
  navigator.vibrate = m => { window.__vibrations.push(m); return true; };
});

const animations = page => page.evaluate(() => window.__animations);
const vibrations = page => page.evaluate(() => window.__vibrations);

/* Un geste au doigt (la souris produit les mêmes événements de pointeur) : appui au milieu du corps
   de l'étape, déplacement en quelques pas, puis relevé si `lacher`. */
async function glisser(page, dx, { dy = 0, lacher = true, pas = 8 } = {}) {
  const r = await page.locator(".cook-body").boundingBox();
  const x = r.x + r.width / 2, y = r.y + 120;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: pas });
  if (lacher) await page.mouse.up();
}

const translation = page => page.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".cook-body")).translate) || 0);
const etiquette = page => page.locator(".cook-step-label");
const segmentsRemplis = page => page.locator(".cook-progress i.done");

/* ---------- Pages qui tournent ---------- */

test("glisser partiel : la page suit le doigt, puis revient à ressort sans changer d'étape", async ({ page }) => {
  await page.goto(CUISINE + "/0");
  await expect(etiquette(page)).toHaveText("Étape 1 / 5");
  await glisser(page, -40, { lacher: false });
  // Le doigt est toujours posé : l'étape l'a suivi.
  expect(await translation(page)).toBeLessThan(-25);
  await page.mouse.up();
  await expect.poll(() => translation(page)).toBe(0);
  await expect(etiquette(page)).toHaveText("Étape 1 / 5");
  await expect(segmentsRemplis(page)).toHaveCount(1);
});

test("glisser franc : l'étape suivante entre du côté d'où elle vient, puis la précédente en sens inverse", async ({ page }) => {
  await page.goto(CUISINE + "/0");
  await glisser(page, -170);
  await expect(etiquette(page)).toHaveText("Étape 2 / 5");
  await expect(page).toHaveURL(/\/cuisine\/1$/);
  // Un geste : l'entrée a la durée normale, pas la courte.
  await expect(page.locator(".cook-etape")).toHaveClass(/vers-suivant/);
  await expect(page.locator(".cook-etape")).not.toHaveClass(/court/);
  await glisser(page, 170);
  await expect(etiquette(page)).toHaveText("Étape 1 / 5");
  await expect(page.locator(".cook-etape")).toHaveClass(/vers-precedent/);
});

test("glisser rapide et bref : un lancer suffit à tourner la page", async ({ page }) => {
  await page.goto(CUISINE + "/0");
  // 45 px seulement (moins que le seuil de distance) mais d'un coup : la vitesse du doigt compte.
  await glisser(page, -45, { pas: 3 });
  await expect(etiquette(page)).toHaveText("Étape 2 / 5");
});

test("un tap ne tourne jamais la page, ni un geste presque immobile", async ({ page }) => {
  await page.goto(CUISINE + "/1");
  await expect(etiquette(page)).toHaveText("Étape 2 / 5");
  await page.locator(".cook-body").click({ position: { x: 150, y: 100 } });
  await glisser(page, -4);
  await expect(etiquette(page)).toHaveText("Étape 2 / 5");
  expect(await translation(page)).toBe(0);
  await expect(page).toHaveURL(/\/cuisine\/1$/);
});

test("un geste plutôt vertical laisse le défilement au navigateur : la page ne bouge pas", async ({ page }) => {
  await page.goto(FOCACCIA + "/0");
  await expect(etiquette(page)).toHaveText("Étape 1 / 5");
  await glisser(page, -30, { dy: 150, lacher: false });
  expect(await translation(page)).toBe(0);
  await page.mouse.up();
  await expect(etiquette(page)).toHaveText("Étape 1 / 5");
});

test("aux deux bouts, la page résiste (élastique) et revient : pas d'étape avant la première ni après la dernière", async ({ page }) => {
  await page.goto(CUISINE + "/0");
  await glisser(page, 200, { lacher: false });
  const tire = await translation(page);
  // Elle a suivi le doigt, mais de moins en moins : bien moins que les 200 px du doigt.
  expect(tire).toBeGreaterThan(20);
  expect(tire).toBeLessThan(150);
  await page.mouse.up();
  await expect.poll(() => translation(page)).toBe(0);
  await expect(etiquette(page)).toHaveText("Étape 1 / 5");

  await page.goto(CUISINE + "/4");
  await expect(etiquette(page)).toHaveText("Étape 5 / 5");
  await glisser(page, -200);
  await expect.poll(() => translation(page)).toBe(0);
  await expect(etiquette(page)).toHaveText("Étape 5 / 5");
});

test("boutons et flèches : la même animation, plus courte ; les segments et l'étiquette sont justes", async ({ page }) => {
  await page.goto(CUISINE + "/0");
  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(etiquette(page)).toHaveText("Étape 2 / 5");
  await expect(page.locator(".cook-etape")).toHaveClass(/vers-suivant court/);
  await page.keyboard.press("ArrowRight");
  await expect(etiquette(page)).toHaveText("Étape 3 / 5");
  await expect(segmentsRemplis(page)).toHaveCount(3);
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".cook-etape")).toHaveClass(/vers-precedent court/);
  await expect(etiquette(page)).toHaveText("Étape 2 / 5");
  await expect(segmentsRemplis(page)).toHaveCount(2);
  // Une fois tout posé, plus rien ne roule ni ne se remplit : le texte et les segments sont ceux de l'étape.
  await expect(page.locator(".cook-num .rouler")).toHaveCount(0);
  await expect(page.locator(".cook-num")).toHaveText("2");
});

test("progression : les segments se remplissent à l'avance et se vident à l'envers, l'étiquette roule, le soulignement se trace", async ({ page, context }) => {
  await espionner(context);
  await page.goto(CUISINE + "/0");
  // Le geste et ses effets se lisent dans le même battement que le clic : rien ne s'est perdu en route.
  const avance = await page.evaluate(() => {
    document.getElementById("next").click();
    const num = document.querySelector(".cook-num");
    return {
      roule: !!num.querySelector(".rouler"),
      texte: document.querySelector(".cook-step-label").textContent,
      trace: document.getAnimations({ subtree: true }).some(a => a.animationName === "trace" && document.querySelector(".cook-flourish").contains(a.effect.target))
    };
  });
  expect(avance).toEqual({ roule: true, texte: "Étape 2 / 5", trace: true });
  const remplissage = (await animations(page)).filter(a => a.pseudo === "::before" && a.props.includes("scale"));
  expect(remplissage.length).toBeGreaterThanOrEqual(1);

  await page.evaluate(() => { window.__animations.length = 0; document.getElementById("prev").click(); });
  const retour = (await animations(page)).filter(a => a.pseudo === "::before" && a.props.includes("scale"));
  expect(retour.length).toBeGreaterThanOrEqual(1);
  await expect(segmentsRemplis(page)).toHaveCount(1);
});

test("mouvement réduit : les pages tournent sans aucune animation, les segments et l'étiquette sont justes", async ({ page, context }) => {
  await espionner(context);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(CUISINE + "/0");
  await glisser(page, -170);
  await expect(etiquette(page)).toHaveText("Étape 2 / 5");
  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(etiquette(page)).toHaveText("Étape 3 / 5");
  await expect(segmentsRemplis(page)).toHaveCount(3);
  await expect(page.locator(".cook-etape")).not.toHaveClass(/vers-/);
  await expect(page.locator(".cook-num .rouler")).toHaveCount(0);
  expect((await animations(page)).filter(a => /segment|cook/.test(a.cible) || a.pseudo)).toEqual([]);
});

test("à chaque nouvelle étape le soulignement est un nouveau tracé", async ({ page }) => {
  await page.goto(CUISINE + "/0");
  const encre = page.locator(".cook-flourish.trace path[pathLength='1']");
  await expect(encre).toHaveCount(1);
  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(etiquette(page)).toHaveText("Étape 2 / 5");
  await expect(encre).toHaveCount(1);
  expect(await page.evaluate(() => document.getAnimations({ subtree: true }).some(a => a.animationName === "trace"))).toBe(true);
});

/* ---------- Entrée et sortie du mode cuisine ---------- */

/* Lance une transition de vue comme le fait le routeur (data-vt, origine) et lit ses animations. */
const transition = (page, vt) => page.evaluate(async vt => {
  const html = document.documentElement;
  html.dataset.vt = vt;
  html.style.setProperty("--vt-x", "300px");
  html.style.setProperty("--vt-y", "700px");
  const t = document.startViewTransition(() => { document.body.dataset.essai = vt; });
  await t.ready;
  const vues = document.getAnimations().filter(a => /view-transition/.test(a.effect.pseudoElement || ""));
  const res = vues.map(a => ({
    pseudo: a.effect.pseudoElement,
    nom: a.animationName,
    images: a.effect.getKeyframes().map(k => k.clipPath).filter(Boolean)
  }));
  t.skipTransition();
  await t.finished.catch(() => {});
  delete html.dataset.vt;
  return res;
}, vt);

test("entrée : l'écran vert s'ouvre en cercle depuis le bouton touché", async ({ page }) => {
  await page.goto(CUISINE + "/0");
  const res = await transition(page, "cuisine");
  const ouvre = res.find(a => a.nom === "cuisine-ouvre");
  expect(ouvre, JSON.stringify(res)).toBeTruthy();
  expect(ouvre.pseudo).toBe("::view-transition-new(root)");
  expect(ouvre.images[0]).toMatch(/^circle\(0(px)? at 300px 700px\)$/);
  expect(ouvre.images[1]).toMatch(/^circle\(.+ at 300px 700px\)$/);
});

test("sortie : l'écran se referme vers la croix, plus vite qu'il ne s'est ouvert", async ({ page }) => {
  await page.goto(CUISINE + "/0");
  const res = await transition(page, "cuisine-sortie");
  const ferme = res.find(a => a.nom === "cuisine-ferme");
  expect(ferme, JSON.stringify(res)).toBeTruthy();
  expect(ferme.pseudo).toBe("::view-transition-old(root)");
  expect(ferme.images[1]).toMatch(/^circle\(0(px)? at 300px 700px\)$/);
  const durees = await page.evaluate(() => {
    const css = [...document.styleSheets].flatMap(f => { try { return [...f.cssRules]; } catch { return []; } });
    return css.length;
  });
  expect(durees).toBeGreaterThan(0);
});

test("mouvement réduit : ni cercle qui s'ouvre, ni cercle qui se ferme", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(CUISINE + "/0");
  for (const vt of ["cuisine", "cuisine-sortie"]) {
    const res = await transition(page, vt);
    expect(res.filter(a => /^cuisine-/.test(a.nom)), vt).toEqual([]);
  }
});

/* ---------- Minuteur de repos, anneau, flamme ---------- */

test("une étape de repos a un minuteur reconnaissable : « Repos » (ou celui de la recette), icône zzz, phrase qui dit de s'éloigner", async ({ page }) => {
  await page.goto(FOCACCIA + "/0");
  const zone = page.locator("#timer-zone");
  await expect(zone).toHaveClass(/repos/);
  const bouton = page.getByRole("button", { name: /Minuteur 2 h/ });
  await expect(bouton).toContainText("Levée");
  await expect(bouton.locator("svg")).toHaveCount(1);
  await bouton.click();
  const anneau = zone.locator(".cook-anneau.repos");
  await expect(anneau).toBeVisible();
  await expect(anneau.locator(".anneau svg").nth(1)).toBeVisible();     // l'icône zzz au centre de l'anneau
  await expect(zone.locator(".cook-rappel")).toContainText("Levée");
  await expect(zone.locator(".cook-rappel")).toContainText("tu peux t'éloigner");
  expect((await lireCarnet(page)).timers[0]).toMatchObject({ repos: true, label: "Levée", total: 120 });
  // Sa bulle, dans le plateau d'une autre étape, porte la même marque.
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(etiquette(page)).toHaveText("Étape 3 / 5");
  await expect(page.locator("#timer-tray .timer-pill.repos")).toBeVisible();
});

test("une étape qui n'est pas un repos garde son minuteur ordinaire (pas de phrase de repos)", async ({ page }) => {
  await page.goto(CUISINE + "/1");
  await expect(page.locator("#timer-zone")).not.toHaveClass(/repos/);
  await page.getByRole("button", { name: /Minuteur 20 min/ }).click();
  await expect(page.locator("#timer-zone .cook-anneau")).toBeVisible();
  await expect(page.locator("#timer-zone .cook-rappel")).toHaveCount(0);
  expect((await lireCarnet(page)).timers[0].repos).toBeUndefined();
});

/* Le sens d'avancement d'un anneau : l'animation « anneau » de sa jauge. */
const etatAnneau = (page, sel) => page.evaluate(sel => {
  const jauge = document.querySelector(sel).querySelector(".jauge");
  const a = jauge.getAnimations().find(x => x.animationName === "anneau");
  return {
    animation: a ? a.playState : "aucune",
    debut: parseFloat(getComputedStyle(jauge.parentElement.parentElement).getPropertyValue("--debut")),
    duree: parseFloat(getComputedStyle(jauge.parentElement.parentElement).getPropertyValue("--duree"))
  };
}, sel);

test("anneau : il se vide en continu sur le temps restant, se suspend en pause et repart à la reprise", async ({ page }) => {
  await page.goto(CUISINE + "/1");
  await page.getByRole("button", { name: /Minuteur 20 min/ }).click();
  const en = await etatAnneau(page, "#timer-zone .cook-anneau");
  expect(en.animation).toBe("running");
  expect(en.debut).toBeLessThan(0.01);
  expect(en.duree).toBeGreaterThan(1190);
  expect(en.duree).toBeLessThanOrEqual(1200);

  await page.locator("#timer-zone").getByRole("button", { name: "Pause" }).click();
  await expect.poll(async () => (await etatAnneau(page, "#timer-zone .cook-anneau")).animation).toBe("paused");
  const figee = await page.evaluate(() => getComputedStyle(document.querySelector("#timer-zone .jauge")).strokeDashoffset);
  // En pause l'anneau ne bouge plus : deux lectures rapprochées donnent la même valeur.
  expect(await page.evaluate(() => getComputedStyle(document.querySelector("#timer-zone .jauge")).strokeDashoffset)).toBe(figee);

  await page.locator("#timer-zone").getByRole("button", { name: "Reprendre" }).click();
  await expect.poll(async () => (await etatAnneau(page, "#timer-zone .cook-anneau")).animation).toBe("running");
});

test("anneau : « +1 min » le recale (plus de temps restant, sans qu'il remonte au plein)", async ({ page }) => {
  await page.goto(CUISINE + "/1");
  await page.getByRole("button", { name: /Minuteur 20 min/ }).click();
  await page.locator("#timer-zone").getByRole("button", { name: "+1 min" }).click();
  const apres = await etatAnneau(page, "#timer-zone .cook-anneau");
  expect(apres.duree).toBeGreaterThan(1250);
  expect(apres.debut).toBeLessThan(0.02);
});

test("bulle du plateau : elle porte un anneau, qui se suspend en pause", async ({ page }) => {
  await page.goto(CUISINE + "/1");
  await page.getByRole("button", { name: /Minuteur 20 min/ }).click();
  await page.keyboard.press("ArrowRight");
  const bulle = page.locator("#timer-tray .timer-pill");
  await expect(bulle.locator(".anneau")).toBeVisible();
  expect((await etatAnneau(page, "#timer-tray .timer-pill")).animation).toBe("running");
  await bulle.locator(".t-pause").click();
  await expect.poll(async () => (await etatAnneau(page, "#timer-tray .timer-pill")).animation).toBe("paused");
});

test("mouvement réduit : l'anneau ne tourne pas tout seul, il avance avec le compte", async ({ page, context }) => {
  const carnet = { timers: [{ id: "t1", rid: "quiche-lorraine", mk: null, step: 1, slot: null, label: "Cuisson à blanc", emoji: "🥧", end: Date.now() + 600000, total: 10, fired: false }] };
  await preremplir(context, { carnet });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#/recette/focaccia-romarin");
  await expect(page.locator("#timer-tray .anneau")).toBeVisible();
  const lectures = await page.evaluate(() => {
    const jauge = document.querySelector("#timer-tray .jauge");
    return { animee: jauge.getAnimations().some(a => a.animationName === "anneau" && a.effect.getComputedTiming().duration > 1), debut: getComputedStyle(jauge.parentElement.parentElement).getPropertyValue("--debut") };
  });
  expect(lectures.animee).toBe(false);
  expect(parseFloat(lectures.debut)).toBeGreaterThan(0);
});

test("préchauffage : la flamme ondule tant qu'il chauffe, pas en pause ni en mouvement réduit", async ({ page }) => {
  // Une recette qui demande le four : le bandeau de préchauffage est à l'étape d'où il faut le lancer.
  await page.goto(CUISINE + "/0");
  const bandeau = page.locator("#four-zone");
  await expect(bandeau).toBeVisible();
  await bandeau.getByRole("button", { name: /Minuteur 15 min/ }).click();
  await expect(bandeau).toHaveClass(/(^|\s)chauffe(\s|$)/);
  const flamme = bandeau.locator(".cook-anneau.four .anneau > svg:not(.cercle)");
  await expect(flamme).toBeVisible();
  expect(await flamme.evaluate(el => el.getAnimations().some(a => a.animationName === "ondule"))).toBe(true);
  await bandeau.getByRole("button", { name: "Pause" }).click();
  await expect(bandeau).not.toHaveClass(/(^|\s)chauffe(\s|$)/);
  expect(await flamme.evaluate(el => el.getAnimations().some(a => a.animationName === "ondule"))).toBe(false);
});

test("le bouton « Minuteur » se transforme en anneau au lancement (pas en mouvement réduit)", async ({ page, context }) => {
  await espionner(context);
  await page.goto(CUISINE + "/1");
  await page.getByRole("button", { name: /Minuteur 20 min/ }).click();
  const morphose = (await animations(page)).filter(a => /cook-anneau/.test(a.cible));
  expect(morphose).toHaveLength(1);
  expect(morphose[0].props).toEqual(expect.arrayContaining(["translate", "scale"]));
});

test("mouvement réduit : le minuteur se lance sans transformation", async ({ page, context }) => {
  await espionner(context);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(CUISINE + "/1");
  await page.getByRole("button", { name: /Minuteur 20 min/ }).click();
  await expect(page.locator("#timer-zone .cook-anneau")).toBeVisible();
  expect((await animations(page)).filter(a => /cook-anneau/.test(a.cible))).toEqual([]);
});

/* ---------- Plateau : arrivée, départ, dix dernières secondes, +1 ---------- */

const minuteur = (id, reste, total = 5, extra = {}) => ({
  id, rid: "quiche-lorraine", mk: null, step: 1, slot: null, label: "Cuisson à blanc", emoji: "🥧",
  end: Date.now() + reste, total, fired: reste <= 0, ...extra
});

test("les dix dernières secondes battent ; en pause ou à l'arrêt, plus de battement", async ({ page, context }) => {
  await preremplir(context, { carnet: { timers: [minuteur("a", 7000), minuteur("b", 400000, 10)] } });
  await page.goto("/#/recette/focaccia-romarin");
  await expect(page.locator("#timer-tray .timer-pill")).toHaveCount(2);
  const [proche, loin] = await page.locator("#timer-tray .timer-pill").all();
  await expect(proche).toHaveClass(/derniers/);
  await expect(loin).not.toHaveClass(/derniers/);
  expect(await proche.evaluate(el => el.getAnimations().some(a => a.animationName === "battement"))).toBe(true);
  // Une bulle qui bat n'est jamais « immobile » pour Playwright : le geste est forcé.
  await proche.locator(".t-pause").click({ force: true });
  await expect(proche).not.toHaveClass(/derniers/);
});

test("mouvement réduit : pas de battement dans les dernières secondes", async ({ page, context }) => {
  await preremplir(context, { carnet: { timers: [minuteur("a", 7000)] } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#/recette/focaccia-romarin");
  const bulle = page.locator("#timer-tray .timer-pill");
  await expect(bulle).toHaveClass(/derniers/);
  expect(await bulle.evaluate(el => el.getAnimations().some(a => a.animationName === "battement" && a.effect.getComputedTiming().duration > 1))).toBe(false);
});

test("arrivée et départ d'une bulle : elle se pose, puis s'efface en étant déjà inerte et muette", async ({ page }) => {
  await page.goto("/#/recette/focaccia-romarin");
  await expect(page.locator("#timer-tray")).toBeHidden();
  await page.goto(CUISINE + "/1");
  await page.getByRole("button", { name: /Minuteur 20 min/ }).click();
  const arrivee = await page.evaluate(() => {
    document.getElementById("next").click();
    return document.getAnimations({ subtree: true }).some(a => a.animationName === "pill-arrive");
  });
  expect(arrivee).toBe(true);
  const depart = await page.evaluate(() => {
    document.querySelector("#timer-tray .t-x").click();
    const bulle = document.querySelector("#timer-tray .timer-pill");
    return { classe: bulle.className, inerte: bulle.inert, cachee: bulle.getAttribute("aria-hidden") };
  });
  expect(depart.classe).toContain("sort");
  expect(depart.inerte).toBe(true);
  expect(depart.cachee).toBe("true");
  await expect(page.locator("#timer-tray .timer-pill")).toHaveCount(0);
});

test("« +1 » saute et le temps roule ; le texte reste une seule valeur lisible", async ({ page, context }) => {
  await espionner(context);
  await page.goto(CUISINE + "/1");
  await page.getByRole("button", { name: /Minuteur 20 min/ }).click();
  await page.evaluate(() => { window.__animations.length = 0; document.querySelector("#timer-zone [data-plus]").click(); });
  await expect.poll(async () => (await animations(page)).filter(a => a.props.includes("scale") && /t-btn/.test(a.cible)).length).toBeGreaterThanOrEqual(1);
  await expect.poll(async () => (await animations(page)).filter(a => a.pseudo === "::before" && a.props.includes("translate")).length).toBeGreaterThanOrEqual(1);
  // Pendant comme après le roulement, le texte est le compte, une fois.
  await expect(page.locator("#timer-zone .clock")).toHaveText(/^(21:0\d|20:5\d)$/);
  await expect(page.locator("#timer-zone .clock .rouler")).toHaveCount(0);
});

test("mouvement réduit : « +1 » change le compte sans rien animer", async ({ page, context }) => {
  await espionner(context);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(CUISINE + "/1");
  await page.getByRole("button", { name: /Minuteur 20 min/ }).click();
  await page.locator("#timer-zone").getByRole("button", { name: "+1 min" }).click();
  await expect(page.locator("#timer-zone .clock")).toHaveText(/^(21:0\d|20:5\d)$/);
  expect((await animations(page)).filter(a => a.props.includes("scale") || a.pseudo)).toEqual([]);
});

/* ---------- Sonnerie ---------- */

test("sonnerie : « Prêt ! » arrive avec une coche tracée, la bulle est dorée et la secousse revient avec chaque reprise du son", async ({ page, context }) => {
  await espionner(context);
  await preremplir(context, { carnet: { timers: [minuteur("a", -1000, 5, { fired: false })] } });
  await page.clock.install();
  await page.goto("/#/recette/focaccia-romarin");
  await page.clock.runFor(1000);
  const bulle = page.locator("#timer-tray .timer-pill");
  await expect(bulle).toHaveClass(/done/);
  await expect(bulle.locator(".t-clock")).toHaveText("Prêt !");
  await expect(bulle.locator(".coche.trace path[pathLength='1']")).toHaveCount(1);
  const secousses = async () => (await animations(page)).filter(a => /timer-pill/.test(a.cible) && a.props.includes("rotate")).length;
  await expect.poll(secousses).toBeGreaterThanOrEqual(1);
  const premiere = await secousses();
  await page.clock.runFor(2100);
  await expect.poll(secousses).toBeGreaterThan(premiere);
  // Elle s'arrête avec la sonnerie : « OK » coupe l'une et l'autre.
  await bulle.locator(".t-x").click();
  await expect(page.locator("#timer-tray")).toBeHidden();
  const apres = await secousses();
  await page.clock.runFor(4500);
  expect(await secousses()).toBe(apres);
});

test("mouvement réduit : la sonnerie ne secoue rien, l'état « Prêt ! » se lit au texte et à la couleur", async ({ page, context }) => {
  await espionner(context);
  await preremplir(context, { carnet: { timers: [minuteur("a", -1000, 5, { fired: false })] } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/#/recette/focaccia-romarin");
  await page.clock.runFor(5000);
  const bulle = page.locator("#timer-tray .timer-pill");
  await expect(bulle).toHaveClass(/done/);
  await expect(bulle.locator(".t-clock")).toHaveText("Prêt !");
  expect(await bulle.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
  expect((await animations(page)).filter(a => a.props.includes("rotate"))).toEqual([]);
  expect(await bulle.evaluate(el => el.getAnimations().some(a => a.animationName === "sonne-halo" && a.effect.getComputedTiming().duration > 1))).toBe(false);
});

test("sonnerie dans l'étape affichée : le compte se retire à moitié (souffle), sans clignoter", async ({ page }) => {
  await page.goto(CUISINE + "/1");
  await page.getByRole("button", { name: /Minuteur 20 min/ }).click();
  const fini = await page.evaluate(() => {
    const horloge = document.querySelector("#timer-zone .clock");
    horloge.classList.add("flash");
    return horloge.getAnimations().map(a => a.animationName);
  });
  expect(fini).toEqual(["souffle"]);
});

test("vibration d'alerte : une seule, à l'échéance, pas à chaque reprise de la sonnerie", async ({ page, context }) => {
  await espionner(context);
  await page.clock.install();
  await page.goto(CUISINE + "/1");
  await page.getByRole("button", { name: /Minuteur 20 min/ }).click();
  await page.clock.runFor(20 * 60 * 1000 + 1500);
  await expect(page.locator("#timer-zone .clock")).toHaveClass(/flash/);
  await expect.poll(() => vibrations(page).then(v => v.length)).toBe(1);
  expect((await vibrations(page))[0]).toEqual([70, 50, 70, 50, 140]);
  await page.clock.runFor(6500);
  expect((await vibrations(page)).length).toBe(1);
});

/* ---------- Fin de recette ---------- */

const couchePlumes = page => page.locator("body > div[aria-hidden='true'][style*='z-index: 300']");

test("« Terminer » célèbre : feuilles, tampon « Bon appétit », vibration de réussite, une seule fois, puis plus rien", async ({ page, context }) => {
  await espionner(context);
  await page.goto(CUISINE + "/4");
  await expect(etiquette(page)).toHaveText("Étape 5 / 5");
  await page.getByRole("button", { name: /Terminer/ }).click();
  await expect(couchePlumes(page)).toHaveCount(1);
  await expect(page.locator(".cook-tampon")).toHaveText("Bon appétit");
  await expect(page.locator(".cook-tampon")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#toast")).toContainText("Bon appétit");
  expect(await vibrations(page)).toEqual([[14, 50, 22]]);
  // Puis tout part : la couche de particules et le tampon.
  await expect(couchePlumes(page)).toHaveCount(0, { timeout: 5000 });
  await expect(page.locator(".cook-tampon")).toHaveCount(0, { timeout: 5000 });
  expect((await lireCarnet(page)).cooked["quiche-lorraine"].count).toBe(1);
});

test("mouvement réduit : la fin de recette ne lance ni feuilles ni tampon, seulement la vibration permise", async ({ page, context }) => {
  await espionner(context);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(CUISINE + "/4");
  await page.getByRole("button", { name: /Terminer/ }).click();
  await expect(page.locator("#toast")).toContainText("Bon appétit");
  await expect(couchePlumes(page)).toHaveCount(0);
  await expect(page.locator(".cook-tampon")).toHaveCount(0);
  expect(await vibrations(page)).toEqual([[14, 50, 22]]);
  expect((await animations(page)).filter(a => a.props.includes("filter"))).toEqual([]);
});

test("le réglage « Vibrations » coupé : la fin de recette ne vibre pas", async ({ page, context }) => {
  await espionner(context);
  await context.addInitScript(() => { try { localStorage.setItem("vibrations", "0"); } catch {} });
  await page.goto(CUISINE + "/4");
  await page.getByRole("button", { name: /Terminer/ }).click();
  await expect(page.locator("#toast")).toContainText("Bon appétit");
  expect(await vibrations(page)).toEqual([]);
});

/* ---------- Taille du texte ---------- */

test("A+ : le texte grossit en douceur et le passage qu'on lisait reste en haut de l'écran", async ({ page, context }) => {
  await espionner(context);
  await page.goto(FOCACCIA + "/0");
  const corps = page.locator(".cook-body");
  await corps.evaluate(el => { el.scrollTop = 120; });
  // Le bloc qui est au haut de l'écran, et la part de lui qui est déjà passée : à garder.
  const ancre = () => page.evaluate(() => {
    const haut = document.querySelector(".cook-body").getBoundingClientRect().top;
    const bloc = window.__bloc ||= [...document.querySelector(".cook-etape").children].find(e => e.getBoundingClientRect().bottom > haut + 1);
    const b = bloc.getBoundingClientRect();
    return (haut - b.top) / b.height;
  });
  const avant = await ancre();
  const taille = () => page.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".cook-etape .txt")).fontSize));
  const t0 = await taille();
  await page.evaluate(() => { window.__animations.length = 0; });
  await page.getByRole("button", { name: "Texte plus grand" }).click();
  expect(await taille()).toBeGreaterThan(t0);
  // L'étape part de l'ancienne taille (échelle) et la rejoint : pas de saut de mise en page.
  const mouvement = (await animations(page)).filter(a => /cook-etape/.test(a.cible) && a.props.includes("scale"));
  expect(mouvement).toHaveLength(1);
  // Mesure une fois l'échelle rejointe : pendant le mouvement les rectangles sont ceux de l'image intermédiaire.
  await pageStable(page);
  expect(Math.abs((await ancre()) - avant)).toBeLessThan(0.04);
  await expect(page.locator(".cook")).toHaveClass(/taille-2/);
});

test("mouvement réduit : A− change la taille sans animation", async ({ page, context }) => {
  await espionner(context);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(FOCACCIA + "/0");
  await page.getByRole("button", { name: "Texte plus petit" }).click();
  await expect(page.locator(".cook")).toHaveClass(/taille-0/);
  expect((await animations(page)).filter(a => /cook-etape/.test(a.cible))).toEqual([]);
});

/* ---------- Lisibilité et gabarits ---------- */

for (const largeur of [320, 375]) {
  test(`${largeur} px : aucun débordement horizontal, cibles de 44 px, anneau et repos dans l'écran`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: 700 });
    await page.goto(FOCACCIA + "/0");
    await page.getByRole("button", { name: /Minuteur 2 h/ }).click();
    await expect(page.locator("#timer-zone .cook-anneau")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(await page.evaluate(() => document.querySelector(".cook-body").scrollWidth > document.querySelector(".cook-body").clientWidth)).toBe(false);
    for (const b of await page.locator(".cook-outils button, .cook-top button, .cook-nav button, #timer-zone button").all()) {
      const boite = await b.boundingBox();
      expect(boite.height).toBeGreaterThanOrEqual(43.5);
      expect(boite.x + boite.width).toBeLessThanOrEqual(largeur + 0.5);
    }
    await expect(page.locator("#timer-zone .clock")).toBeInViewport();
  });
}

test("minuteur qui sonne dans l'étape affichée : le compte dit « Prêt ! » et l'anneau devient une coche", async ({ page, context }) => {
  await preremplir(context, { carnet: { timers: [minuteur("a", -2000, 5, { fired: true })] } });
  await page.goto(CUISINE + "/1");
  const zone = page.locator("#timer-zone");
  await expect(zone.locator(".clock")).toHaveText("Prêt !");
  await expect(zone.locator(".clock")).toHaveClass(/flash/);
  await expect(zone.locator(".cook-anneau.done .coche")).toBeVisible();
  await expect(zone.getByRole("button", { name: "OK" })).toBeVisible();
});
