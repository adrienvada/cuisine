/* Lot « code » : un champ supprimé sur un téléphone l'est aussi sur l'autre (« Vider le menu » puis « Annuler »),
   et un champ mal formé reçu n'efface pas celui d'ici. Jamais le vrai serveur :
   tout passe par context.route. */

import { test, expect, preremplir, entree, lireCarnet } from "./outils.js";
import { simulerServeur, MDP } from "./outils-synchro.js";

const REPAS = { convives: 4, heure: "20:00", date: "2099-06-15", exclus: [] };
const etat = (page, valeur) => expect(page.locator("html")).toHaveAttribute("data-synchro", valeur);
const reveiller = page => page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));

/* Deux appareils (deux contextes) sur un même faux serveur. */
async function deuxAppareils(browser, context, carnet) {
  const serveur = await simulerServeur(context, { ...carnet }, { mdp: MDP });
  await preremplir(context, { carnet, sync: { mdp: MDP, vu: serveur.updated_at, base: serveur.data } });
  const second = await browser.newContext();
  await second.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await preremplir(second, { carnet, sync: { mdp: MDP, vu: serveur.updated_at, base: serveur.data } });
  const json = (route, status, valeur) => route.fulfill({ status, headers: { "access-control-allow-origin": "*" }, contentType: "application/json", body: JSON.stringify(valeur) });
  await second.route("**/rest/v1/rpc/**", async route => {
    const requete = route.request();
    if (requete.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, OPTIONS" } });
    const corps = JSON.parse(requete.postData() || "{}");
    const nom = new URL(requete.url()).pathname.split("/").pop();
    if (nom === "carnet_lire") return json(route, 200, [{ data: serveur.data, updated_at: serveur.updated_at }]);
    if (nom === "carnet_ecrire") {
      if ((corps.p_vu ?? null) !== (serveur.updated_at ?? null)) return json(route, 200, { ok: false, updated_at: serveur.updated_at });
      serveur.modifier(corps.p_data);
      serveur.ecritures.push(corps.p_data);
      return json(route, 200, { ok: true, updated_at: serveur.updated_at });
    }
    return json(route, 404, {});
  });
  return { serveur, second, pageB: await second.newPage() };
}

test("synchro : « Vider le menu » puis « Annuler » sur un téléphone retire aussi l'historique sur l'autre", async ({ page, context, browser }) => {
  const carnet = { menu: [entree("focaccia-romarin", { k: "f1", portions: 4 })], checked: {}, extras: [], repas: REPAS };
  const { serveur, second, pageB } = await deuxAppareils(browser, context, carnet);
  await page.goto("/#/menu");
  await pageB.goto("/#/menu");
  await etat(page, "ok");
  await etat(pageB, "ok");

  // B vide le menu : un repas passé est rangé dans l'historique, et A le reçoit.
  await pageB.getByRole("button", { name: "Vider le menu" }).click();
  await expect.poll(() => serveur.data.historique?.length).toBe(1);
  await reveiller(page);
  await expect.poll(async () => (await lireCarnet(page)).historique?.length).toBe(1);

  // B annule : l'historique disparaît du serveur, et de A à sa relève.
  await pageB.locator("#toast").getByRole("button", { name: "Annuler" }).click();
  await expect.poll(() => serveur.data.historique).toBeUndefined();
  await expect.poll(() => serveur.data.menu.length).toBe(1);
  await reveiller(page);
  await expect.poll(async () => (await lireCarnet(page)).historique).toBeUndefined();
  await expect(page.locator(".menu-card")).toHaveCount(1);
  // A n'a pas renvoyé l'entrée d'historique du repas annulé.
  await etat(page, "ok");
  expect(serveur.data.historique).toBeUndefined();
  await second.close();
});

test("synchro : un champ mal formé reçu d'un autre téléphone est écarté sans retirer le champ d'ici", async ({ page, context, browser }) => {
  const historique = [{ id: "h1", date: "2099-01-02", convives: 4, entrees: [{ rid: "focaccia-romarin", choices: {}, addons: [], portions: 4 }] }];
  const carnet = { menu: [entree("focaccia-romarin", { k: "f1", portions: 4 })], checked: {}, extras: [], repas: REPAS, historique };
  const { serveur, second } = await deuxAppareils(browser, context, carnet);
  await page.goto("/#/menu");
  await etat(page, "ok");

  // Le serveur reçoit un historique illisible (une version plus récente du carnet, par exemple).
  serveur.modifier({ ...serveur.data, historique: "illisible", repas: { ...REPAS, convives: 6 } });
  await reveiller(page);
  await expect.poll(async () => (await lireCarnet(page)).repas?.convives).toBe(6);
  expect((await lireCarnet(page)).historique).toEqual(historique);
  await second.close();
});
