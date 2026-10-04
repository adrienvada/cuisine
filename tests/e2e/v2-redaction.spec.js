/* Deuxième vague, lot « rédaction » : l'accord des portions au singulier, la typographie française sur chaque vue, des messages éphémères sans point final, le vocabulaire des catégories. */

import { test, expect, preremplir, entree, pageStable } from "./outils.js";

const REPAS = { convives: 6, heure: "20:00", date: "2099-06-15", exclus: [] };
const MENU_TROIS = [
  entree("focaccia-romarin", { k: "f1", portions: 1 }),
  entree("cocktail-concombre-menthe", { k: "c1", portions: 1 }),
  entree("tartines-figues-chevre-miel", { k: "t1", portions: 1 })
];

test.beforeEach(({ page }) => {
  page.erreurs = [];
  page.on("pageerror", e => page.erreurs.push(e.message));
});
test.afterEach(({ page }) => {
  expect(page.erreurs).toEqual([]);
});

/* Les fautes de typographie qui restent dans les nœuds texte visibles : une espace
   ordinaire avant « : ; ? ! » ou « » », après « « », ou entre un nombre et son unité. */
const FAUTES = `(() => {
  const ignores = "script, style, textarea, input, [contenteditable]";
  const fautes = [];
  const marcheur = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = marcheur.nextNode(); n; n = marcheur.nextNode()) {
    if (n.parentElement.closest(ignores)) continue;
    const t = n.nodeValue;
    if (/\\S +[:;?!»]|« |\\d +(°C|kg|g|cl|ml|l|min|h|cm)(?![\\p{L}\\d])/u.test(t)) fautes.push(t.trim().slice(0, 90));
  }
  return fautes;
})()`;
const fautes = async page => { await pageStable(page); return page.evaluate(FAUTES); };

/* ---------- Constat n° 0 : « 1 personnes » ---------- */

test("menu : une portion s'écrit au singulier, pour les personnes, les verres et les tartines", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: MENU_TROIS, repas: REPAS } });
  await page.goto("/#/menu");
  await expect(page.locator(".mc-portions .val")).toHaveText(["1 personne", "1 verre", "1 tartine"]);
  // Au pluriel dès 2.
  await page.locator('[data-plus="f1"]').click();
  await expect(page.locator(".mc-portions .val").first()).toHaveText("2 personnes");
  await page.locator('[data-minus="f1"]').click();
  await expect(page.locator(".mc-portions .val").first()).toHaveText("1 personne");
});

test("fiche : le curseur, la feuille d'ingrédient et le toast disent « 1 personne »", async ({ page, context }) => {
  await preremplir(context, { carnet: { portions: { "quiche-lorraine": 1 } } });
  await page.goto("/#/recette/quiche-lorraine");
  await expect(page.locator("#p-val")).toHaveText("1 personne");
  await page.locator(".ing-ligne").first().click();
  await expect(page.locator(".sheet-sub")).toContainText("pour 1 personne");
  await expect(page.locator(".sheet-sub")).not.toContainText("personnes");
});

test("fiche : « J'en ai moins » propose, règle et annonce « 1 verre »", async ({ page, context }) => {
  await preremplir(context, { carnet: {} });
  await page.goto("/#/recette/cocktail-concombre-menthe");
  await page.locator(".ing-ligne", { hasText: "Eau très fraîche" }).click();
  await page.locator("#ing-possede").fill("13");
  await expect(page.locator("#ing-resultat")).toHaveText("Avec ça, tu peux faire 1 verre.");
  await expect(page.locator("#ing-regler")).toHaveText("Régler sur 1 verre");
  await page.locator("#ing-regler").click();
  await expect(page.locator("#toast-msg")).toHaveText("Recette réglée pour 1 verre");
  await expect(page.locator("#p-val")).toHaveText("1 verre");
});

test("mode cuisine : la feuille Ingrédients dit « Pour 1 personne »", async ({ page, context }) => {
  await preremplir(context, { carnet: { portions: { "quiche-lorraine": 1 } } });
  await page.goto("/#/recette/quiche-lorraine/cuisine/0");
  await page.locator("#cook-ing").click();
  await expect(page.locator(".ing-sheet .sheet-sub")).toContainText("Pour 1 personne");
  await expect(page.locator(".ing-sheet .sheet-sub")).not.toContainText("personnes");
});

/* ---------- Constat n° 1 : « fondamentalaux » ---------- */

test("savoirs : le pied de liste écrit « fondamentaux », et le vocabulaire est celui du carnet", async ({ page }) => {
  await page.goto("/#/fondamentaux");
  await expect(page.locator(".f-compte")).toHaveText(/^\d+ fondamentaux dans le carnet\.$/);
  await expect(page.locator(".f-compte")).not.toContainText("fondamentalaux");
  await page.locator("#f-search").fill("zzzz");
  await expect(page.locator(".f-compte")).toHaveText(/fondamentaux dans le carnet/);
  // Un fondamental sans recette le dit simplement, comme sur sa page.
  await page.locator("#f-search").fill("déglaçage");
  const carte = page.locator(".f-item", { hasText: "Le déglaçage" });
  await expect(carte.locator(".f-item-meta")).toHaveText("Dans aucune recette pour l'instant");
  await carte.click();
  await expect(page.locator(".f-orphelin")).toHaveText("Dans aucune recette pour l'instant.");
  await expect(page.locator("body")).not.toContainText("rattaché");
});

/* ---------- Constat n° 5 : typographie ---------- */

test("typographie : aucune espace ordinaire avant : ; ? ! ni entre un nombre et °C sur l'accueil, la fiche, le mode cuisine", async ({ page, context }) => {
  await preremplir(context, { carnet: {} });
  await page.goto("/");
  expect(await fautes(page)).toEqual([]);
  await page.goto("/#/recette/quiche-lorraine");
  await expect(page.locator("#p-val")).not.toBeEmpty();
  expect(await fautes(page)).toEqual([]);
  await page.goto("/#/recette/focaccia-romarin/cuisine/0");
  await expect(page.locator("#cook-ing")).toBeVisible();
  expect(await fautes(page)).toEqual([]);
  await page.locator("#cook-ing").click();
  expect(await fautes(page)).toEqual([]);
});

test("typographie : le menu, son rétroplanning et ses conflits de four", async ({ page, context }) => {
  await preremplir(context, {
    carnet: { menu: [entree("focaccia-romarin", { k: "f1" }), entree("quiche-lorraine", { k: "q1" }), entree("cake-sale", { k: "c1" })], repas: REPAS }
  });
  await page.goto("/#/menu");
  await expect(page.locator(".retro-note.conflit").first()).toBeVisible();
  expect(await fautes(page)).toEqual([]);
  // La phrase de conflit est claire : ni point-virgule ni guillemets.
  const note = (await page.locator(".retro-note.conflit").first().textContent()).replace(/\s+/g, " ");
  expect(note).toMatch(/^À 220 °C pour Focaccia, 180 °C pour Quiche lorraine et Cake salé : enfourne Focaccia en premier\./);
  expect(note).not.toMatch(/[;«»]/);
});

test("typographie : les courses, les savoirs, une page de fondamental, les réglages", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })], repas: REPAS } });
  await page.goto("/#/courses");
  expect(await fautes(page)).toEqual([]);
  await page.goto("/#/fondamentaux");
  await expect(page.locator(".f-item").first()).toBeVisible();
  expect(await fautes(page)).toEqual([]);
  await page.goto("/#/fondamental/maillard");
  await expect(page.locator(".f-bloc").first()).toBeVisible();
  expect(await fautes(page)).toEqual([]);
  await page.goto("/");
  await page.locator("[data-reglages]").first().click();
  await expect(page.locator(".reglages-sheet")).toBeVisible();
  expect(await fautes(page)).toEqual([]);
});

test("typographie : un texte ajouté ou modifié après coup est corrigé avant d'être vu", async ({ page }) => {
  await page.goto("/");
  const resultat = await page.evaluate(async () => {
    const p = document.createElement("p");
    document.getElementById("app").append(p);
    p.textContent = "Préparation : 15 min, à 180 °C ?";
    await Promise.resolve();                        // la microtâche de l'observateur
    const ajoute = p.textContent;
    p.firstChild.nodeValue = "Cuisson : 57 min !";
    await Promise.resolve();
    const modifie = p.textContent;
    const saisie = document.createElement("textarea");
    saisie.value = "ne touche pas : à ma note ?";
    document.getElementById("app").append(saisie);
    saisie.textContent = "brouillon : tel quel ?";
    await Promise.resolve();
    p.remove(); saisie.remove();
    return { ajoute, modifie, brouillon: saisie.textContent };
  });
  expect(resultat.ajoute).toBe("Préparation : 15 min, à 180 °C ?");
  expect(resultat.modifie).toBe("Cuisson : 57 min !");
  expect(resultat.brouillon).toBe("brouillon : tel quel ?");
});

test("typographie : un compte à rebours qui tourne est corrigé sans boucler (pas de mutation en rafale)", async ({ page, context }) => {
  await preremplir(context, { carnet: {} });
  await page.goto("/#/recette/quiche-lorraine/cuisine/0");
  const mutations = await page.evaluate(() => new Promise(resolve => {
    let n = 0;
    const o = new MutationObserver(l => { n += l.length; });
    o.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
    const el = document.createElement("span");
    document.getElementById("app").append(el);
    for (let i = 0; i < 20; i++) el.textContent = `Reste ${i} min : prêt ?`;
    setTimeout(() => { o.disconnect(); el.remove(); resolve(n); }, 100);
  }));
  // 1 ajout + 20 écritures + au plus 20 corrections : jamais une boucle.
  expect(mutations).toBeLessThanOrEqual(45);
});

/* ---------- Constat n° 8 : messages éphémères ---------- */

test("messages : la fiche d'une entrée du menu dit « Retiré du menu », comme l'onglet Menu", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })], repas: REPAS } });
  await page.goto("/#/recette/quiche-lorraine/m/q1");
  await page.locator("#menu-retirer").click();
  await expect(page.locator("#toast-msg")).toHaveText("Retiré du menu");

});

test("messages : retirer une carte du menu dit « Retiré du menu »", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })], repas: REPAS } });
  await page.goto("/#/menu");
  await page.locator("[data-remove]").first().click();
  await expect(page.locator("#toast-msg")).toHaveText("Retiré du menu");
});

test("messages : « pas encore la dernière étape » et le micro n'ont pas de point final", async ({ page, context }) => {
  await preremplir(context, { carnet: {} });
  await page.goto("/#/recette/quiche-lorraine/cuisine/0");
  const resultat = await page.evaluate(async () => {
    const { toast } = await import("/js/ui/toast.js");
    toast("Le micro ne répond pas.");
    return document.getElementById("toast-msg").textContent;
  });
  expect(resultat).toBe("Le micro ne répond pas");
});

/* ---------- Constat n° 13 : vocabulaire du repas ---------- */

test("menu : la structure d'un repas reprend les mots des catégories de l'accueil", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [], repas: REPAS } });
  await page.goto("/#/menu");
  const noms = await page.locator(".sq-nom").allTextContents();
  expect(noms).toContain("Desserts");
  expect(noms).toContain("Boissons");
  expect(noms).not.toContain("Dessert");
  expect(noms).not.toContain("Boisson");
});

/* ---------- Textes signalés par les autres lots ---------- */

test("le placeholder de la recherche de l'accueil n'est pas coupé à 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await pageStable(page);
  const mesure = await page.locator("#search").evaluate(el => {
    const s = getComputedStyle(el);
    // Le texte est mesuré tel que l'input l'écrit, dans un span de même police.
    const span = document.createElement("span");
    span.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${s.font};letter-spacing:${s.letterSpacing}`;
    span.textContent = el.placeholder;
    document.body.append(span);
    const largeurTexte = span.getBoundingClientRect().width;
    span.remove();
    // La croix d'effacement du navigateur (28 px dans accueil.css) réserve sa place dans le champ, même vide :
    // le texte doit tenir dans ce qui reste, sinon sa fin est rognée (« Recette, ingrédien »).
    const reserve = 30;
    const place = el.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight) - reserve;
    return { largeurTexte, place, placeholder: el.placeholder };
  });
  expect(mesure.largeurTexte, mesure.placeholder).toBeLessThanOrEqual(mesure.place);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
