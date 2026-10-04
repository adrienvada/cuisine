/* Vague 2, lot « synchro » : deux appareils (deux contextes Playwright) sur un même
   faux Supabase, les notes perso, les exclusions d'allergènes, le menu, l'ordre des
   rayons, et le délai des requêtes. Jamais le vrai serveur : tout passe par context.route. */

import { test, expect, preremplir, entree, lireCarnet } from "./outils.js";
import { simulerServeur, MDP } from "./outils-synchro.js";

const REPAS = { convives: 6, heure: "20:00", date: "2099-06-15", exclus: [] };
const etat = (page, valeur) => expect(page.locator("html")).toHaveAttribute("data-synchro", valeur);

/* Un second appareil : son propre contexte, les mêmes données serveur que le premier. */
async function appareil(browser, serveurPartage, carnet, vu) {
  const context = await browser.newContext();
  await context.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await preremplir(context, { carnet, sync: { mdp: MDP, vu, base: serveurPartage.data } });
  /* Le même faux serveur : chaque appareil l'atteint par sa route, mais on
     délègue au serveur du premier contexte. */
  await context.route("**/rest/v1/rpc/**", route => serveurPartage.traiter(route));
  const page = await context.newPage();
  return { context, page };
}

/* Un serveur simulé sur le contexte du test, rendu accessible à un second appareil. */
async function serveurDeuxAppareils(context, donnees) {
  const serveur = await simulerServeur(context, donnees, { mdp: MDP });
  const traiterLocal = async route => {
    // Rejoue la requête par le contexte d'origine : on réutilise la route déjà posée en la fetchant.
    const requete = route.request();
    const corps = JSON.parse(requete.postData() || "{}");
    const nom = new URL(requete.url()).pathname.split("/").pop();
    const json = (status, valeur) => route.fulfill({ status, headers: { "access-control-allow-origin": "*" }, contentType: "application/json", body: JSON.stringify(valeur) });
    if (requete.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, OPTIONS" } });
    if (nom === "carnet_lire") serveur.lectures++;
    if (nom === "carnet_lire") return json(200, serveur.data ? [{ data: serveur.data, updated_at: serveur.updated_at }] : []);
    if (nom === "carnet_ecrire") {
      if ((corps.p_vu ?? null) !== (serveur.updated_at ?? null)) return json(200, { ok: false, updated_at: serveur.updated_at });
      serveur.modifier(corps.p_data);
      serveur.ecritures.push(corps.p_data);
      return json(200, { ok: true, updated_at: serveur.updated_at });
    }
    return json(404, {});
  };
  serveur.traiter = traiterLocal;
  return serveur;
}

/* Deux appareils connectés au même carnet, plus un interrupteur réseau commun. */
async function deux(browser, context, carnet) {
  const donnees = { menu: [], checked: {}, extras: [], ...carnet };
  const serveur = await serveurDeuxAppareils(context, donnees);
  await preremplir(context, { carnet, sync: { mdp: MDP, vu: serveur.updated_at, base: serveur.data } });
  const second = await appareil(browser, serveur, carnet, serveur.updated_at);
  return { serveur, second };
}

/* Coupe le réseau d'un appareil (ses requêtes échouent) ou le rétablit. */
async function reseau(context, serveur, coupe) {
  await context.unroute("**/rest/v1/rpc/**");
  if (coupe) await context.route("**/rest/v1/rpc/**", route => route.abort());
  else await context.route("**/rest/v1/rpc/**", route => serveur.traiter(route));
}

const revenir = page => page.evaluate(() => window.dispatchEvent(new Event("online")));
const reveiller = page => page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
/* Réveille l'appareil et attend que le relevé qui suit ait bien eu lieu côté serveur : c'est
   le signal que « rien n'a été écrasé » se lit après, pas après un délai deviné. */
async function reveillerEtAttendre(page, serveur) {
  const avant = serveur.lectures;
  await reveiller(page);
  await expect.poll(() => serveur.lectures).toBeGreaterThan(avant);
  await etat(page, "ok");
}
const masquer = page => page.evaluate(() => {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
  document.dispatchEvent(new Event("visibilitychange"));
  Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
});

test("notes perso : la note d'un autre téléphone s'affiche dans la fiche ouverte et survit à la mise en arrière-plan", async ({ page, context, browser }) => {
  const { serveur, second } = await deux(browser, context, { menu: [], checked: {}, extras: [] });
  await page.goto("/#/recette/quiche-lorraine");
  await second.page.goto("/#/recette/quiche-lorraine");
  await etat(page, "ok");
  await etat(second.page, "ok");

  // B écrit sa note et quitte le champ : elle part au serveur.
  await second.page.locator("#note-saisie").fill("Moins de sel");
  await second.page.locator("#note-saisie").blur();
  await expect.poll(() => serveur.data.notesPerso?.["quiche-lorraine"]?.txt).toBe("Moins de sel");

  // A reçoit la version : sa fiche ouverte se rafraîchit, sans que A ait rien tapé.
  await reveiller(page);
  await expect(page.locator("#note-saisie")).toHaveValue("Moins de sel");
  await expect(page.locator("#note-perso-tete")).toContainText("Moins de sel");

  // A passe en arrière-plan : la note de B tient, chez A comme au serveur.
  await masquer(page);
  await reveillerEtAttendre(page, serveur);
  expect((await lireCarnet(page)).notesPerso["quiche-lorraine"].txt).toBe("Moins de sel");
  expect(serveur.data.notesPerso["quiche-lorraine"].txt).toBe("Moins de sel");
  await second.context.close();
});

test("notes perso : une fiche déjà quittée n'écrase pas la note plus récente d'un autre téléphone", async ({ page, context, browser }) => {
  const { serveur, second } = await deux(browser, context, { menu: [], checked: {}, extras: [] });
  await page.goto("/#/recette/quiche-lorraine");
  await etat(page, "ok");
  await page.locator("#note-saisie").fill("note A");
  await page.locator("#note-saisie").blur();
  await expect.poll(() => serveur.data.notesPerso?.["quiche-lorraine"]?.txt).toBe("note A");
  await page.goto("/#/");

  // B, ailleurs, écrit une note plus récente.
  await second.page.goto("/#/recette/quiche-lorraine");
  await second.page.locator("#note-saisie").fill("note B");
  await second.page.locator("#note-saisie").blur();
  await expect.poll(() => serveur.data.notesPerso?.["quiche-lorraine"]?.txt).toBe("note B");

  await reveiller(page);
  await expect.poll(async () => (await lireCarnet(page)).notesPerso?.["quiche-lorraine"]?.txt).toBe("note B");
  await masquer(page);
  await reveillerEtAttendre(page, serveur);
  expect((await lireCarnet(page)).notesPerso["quiche-lorraine"].txt).toBe("note B");
  expect(serveur.data.notesPerso["quiche-lorraine"].txt).toBe("note B");
  await second.context.close();
});

test("notes perso : on tape pendant qu'une synchro arrive, la frappe n'est pas écrasée", async ({ page, context, browser }) => {
  const { serveur, second } = await deux(browser, context, { menu: [], checked: {}, extras: [] });
  await page.goto("/#/recette/quiche-lorraine");
  await etat(page, "ok");
  await page.locator("#note-saisie").focus();
  await page.keyboard.type("ma frappe");

  await second.page.goto("/#/recette/quiche-lorraine");
  await second.page.locator("#note-saisie").fill("note B");
  await second.page.locator("#note-saisie").blur();
  await expect.poll(() => serveur.data.notesPerso?.["quiche-lorraine"]?.txt).toBe("note B");

  await reveillerEtAttendre(page, serveur);
  await expect(page.locator("#note-saisie")).toHaveValue("ma frappe");
  await second.context.close();
});

test("allergènes : le gluten coché ici et le lait coché là-bas sont tous deux gardés", async ({ page, context, browser }) => {
  const carnet = { menu: [entree("quiche-lorraine", { k: "q1" })], checked: {}, extras: [], repas: REPAS };
  const { serveur, second } = await deux(browser, context, carnet);
  await page.goto("/#/menu");
  await second.page.goto("/#/menu");
  await etat(page, "ok");
  await etat(second.page, "ok");

  await reseau(context, serveur, true);
  await reseau(second.context, serveur, true);

  await page.locator("summary", { hasText: "Invités et allergies" }).click();
  await page.locator('[data-exclu="gluten"]').click();
  await second.page.locator("summary", { hasText: "Invités et allergies" }).click();
  await second.page.locator('[data-exclu="lait"]').click();

  await reseau(context, serveur, false);
  await reseau(second.context, serveur, false);
  await revenir(page);
  await expect.poll(() => serveur.ecritures.length).toBeGreaterThan(0);
  await revenir(second.page);
  await expect.poll(() => [...(serveur.data.repas.exclus || [])].sort().join()).toBe("gluten,lait");

  await reveiller(page);
  await expect.poll(async () => [...(await lireCarnet(page)).repas.exclus].sort().join()).toBe("gluten,lait");
  await expect(page.locator('[data-exclu="gluten"]')).toHaveAttribute("aria-pressed", "true");
  await second.context.close();
});

test("menu : les convives réglés ici et un supplément ajouté là-bas à la même entrée se cumulent", async ({ page, context, browser }) => {
  const carnet = {
    menu: [entree("cake-sale", { k: "c1", portions: 6 }), entree("quiche-lorraine", { k: "q1", portions: 6 })],
    checked: {}, extras: [], repas: REPAS
  };
  const { serveur, second } = await deux(browser, context, carnet);
  await page.goto("/#/menu");
  await second.page.goto("/#/recette/cake-sale/m/c1");
  await etat(page, "ok");
  await etat(second.page, "ok");

  await reseau(context, serveur, true);
  await reseau(second.context, serveur, true);

  await page.getByRole("button", { name: "Un convive de plus" }).click();
  await page.getByRole("button", { name: "Un convive de plus" }).click();
  await expect(page.locator("#rp-conv-val")).toHaveText("8 convives");
  await second.page.locator('[data-addon="tomates-sechees"]').click();

  await reseau(context, serveur, false);
  await reseau(second.context, serveur, false);
  /* L'autre appareil, revenu en ligne, peut écrire le premier : on attend l'écriture de
     celui-ci par son contenu, pas par le nombre d'écritures. */
  await revenir(page);
  await expect.poll(() => serveur.data.repas?.convives).toBe(8);
  await revenir(second.page);
  await expect.poll(() => serveur.data.menu.find(e => e.k === "c1").addons.join()).toBe("tomates-sechees");

  await expect.poll(() => serveur.data.menu.find(e => e.k === "c1").portions).toBe(8);
  expect(serveur.data.menu.find(e => e.k === "q1").portions).toBe(8);
  expect(serveur.data.repas.convives).toBe(8);
  await second.context.close();
});

test("ordre des rayons : « Remettre l'ordre d'origine » tient et se propage à l'autre appareil", async ({ page, context, browser }) => {
  const perso = ["Crèmerie & œufs", "Fruits & légumes", "Autre"];
  const carnet = { menu: [entree("quiche-lorraine", { k: "q1" })], checked: {}, extras: [], ordreRayons: perso };
  const { serveur, second } = await deux(browser, context, carnet);
  await page.goto("/#/courses");
  await second.page.goto("/#/courses");
  await etat(page, "ok");
  await etat(second.page, "ok");

  await page.getByRole("button", { name: "Ranger les rayons" }).click();
  await page.getByRole("button", { name: "Remettre l'ordre d'origine" }).click();
  await page.getByRole("button", { name: "Terminé" }).click();

  await expect.poll(() => serveur.ecritures.length).toBeGreaterThan(0);
  expect(serveur.data.ordreRayons).toEqual([]);

  // Une relève ne ramène pas l'ancien ordre, ni ici ni là-bas.
  await reveillerEtAttendre(page, serveur);
  expect((await lireCarnet(page)).ordreRayons).toEqual([]);
  await reveiller(second.page);
  await expect.poll(async () => (await lireCarnet(second.page)).ordreRayons).toEqual([]);
  expect(serveur.data.ordreRayons).toEqual([]);
  await second.context.close();
});

test("délai : une requête qui ne répond jamais est abandonnée, l'état passe à hors puis un nouvel essai aboutit", async ({ page, context }) => {
  const serveur = await simulerServeur(context, { menu: [], checked: {}, extras: [] }, { mdp: MDP });
  await preremplir(context, { sync: { mdp: MDP, vu: serveur.updated_at, base: serveur.data } });
  let suspendre = true;
  const suspendues = [];
  await context.unroute("**/rest/v1/rpc/**");
  const reponse = { menu: [], checked: {}, extras: [] };
  await context.route("**/rest/v1/rpc/**", route => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, OPTIONS" } });
    if (suspendre) { suspendues.push(route); return; }   // ni réponse ni échec
    return route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*" }, contentType: "application/json", body: JSON.stringify([{ data: reponse, updated_at: "2026-01-01T00:00:09.000Z" }]) });
  });
  await page.clock.install();
  await page.goto("/#/");
  await expect.poll(() => suspendues.length).toBeGreaterThan(0);
  await etat(page, "attente");

  await page.clock.runFor(16000);
  await etat(page, "hors");
  await page.clock.runFor(16000);   // toute requête restée en vol a, elle aussi, dépassé son délai

  // Le réseau revient : le verrou n'est pas resté pris, un nouvel appel part et aboutit.
  suspendre = false;
  const avant = suspendues.length;   // aucune nouvelle requête ne doit rester suspendue
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await etat(page, "ok");
  expect(suspendues.length).toBe(avant);
});
