/* Synchronisation entre appareils, contre un Supabase simulé. js/sync-config.js
   est déjà renseigné : il suffit d'un mot de passe mémorisé pour que ça parte. */

import { test, expect, preremplir, entree, simulerSupabase } from "./outils.js";

const VIDE = { menu: [], checked: {}, extras: [] };

/* Un navigateur déjà connecté, à jour de la version serveur. */
async function connecte(context, carnet = VIDE) {
  const serveur = await simulerSupabase(context, { ...VIDE, ...carnet });
  await preremplir(context, { carnet, sync: { mdp: "secret", vu: serveur.updated_at } });
  return serveur;
}

test("synchro : une modification du menu part au serveur", async ({ page, context }) => {
  const serveur = await connecte(context);
  await page.goto("/#/recette/quiche-lorraine");
  // Plus de bouton de synchro dans la page : la première lecture du serveur dit qu'on est connecté.
  await expect.poll(() => serveur.lectures).toBeGreaterThan(0);

  await page.locator("#add-list").click();
  await page.getByRole("dialog").getByRole("button", { name: "Ajouter tel quel" }).click();

  // L'envoi part 0,8 s après la modification.
  await expect.poll(() => serveur.ecritures.length).toBeGreaterThan(0);
  const derniere = serveur.ecritures.at(-1);
  expect(derniere.menu).toHaveLength(1);
  expect(derniere.menu[0].rid).toBe("quiche-lorraine");
});

test("synchro : une version serveur plus récente est appliquée au retour sur l'appli", async ({ page, context }) => {
  const serveur = await connecte(context, { menu: [entree("quiche-lorraine", { k: "q1" })] });
  await page.goto("/#/menu");
  await expect(page.locator(".menu-card")).toContainText("Quiche lorraine");
  // Plus de bouton de synchro dans la page : la première lecture du serveur dit qu'on est connecté.
  await expect.poll(() => serveur.lectures).toBeGreaterThan(0);

  // Quelqu'un d'autre vient de remplacer le menu.
  serveur.modifier({ menu: [entree("focaccia-romarin", { k: "f1" })], checked: {}, extras: [] });
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));

  await expect(page.locator(".menu-card")).toContainText("Focaccia");
  await expect(page.locator(".menu-card", { hasText: "Quiche lorraine" })).toHaveCount(0);
});
