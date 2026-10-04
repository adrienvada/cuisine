/* Robustesse : stockage corrompu, refusé ou plein, données reçues mal formées, photos orphelines du journal. */

import { test, expect, preremplir, entree, lireCarnet } from "./outils.js";
import { simulerServeur, MDP } from "./outils-synchro.js";

const CARTES = ".card:not(.gone):not(.card-leave)";
const RID = "quiche-lorraine";

/* Écrit une valeur brute (pas forcément du JSON) sous la clé du carnet, avant le
   chargement et une seule fois par onglet, comme preremplir(). */
async function poserBrut(context, brut) {
  await context.addInitScript(brut => {
    try {
      if (sessionStorage.getItem("__brut")) return;
      sessionStorage.setItem("__brut", "1");
      localStorage.setItem("carnet-cuisine-v1", brut);
    } catch {}
  }, brut);
}

/* Les erreurs de page : un démarrage qui s'interrompt en laisse. */
function surveillerErreurs(page) {
  const erreurs = [];
  page.on("pageerror", e => erreurs.push(e.message));
  return erreurs;
}

/* Le stockage du carnet refuse d'écrire (quota). Les autres clés restent libres. */
const stockagePlein = context => context.addInitScript(() => {
  const ecrire = Storage.prototype.setItem;
  Storage.prototype.setItem = function (cle, valeur) {
    if (cle === "carnet-cuisine-v1") throw new DOMException("quota", "QuotaExceededError");
    return ecrire.call(this, cle, valeur);
  };
});

const cles = page => page.evaluate(() => new Promise((resolve, reject) => {
  const req = indexedDB.open("carnet-photos", 1);
  req.onupgradeneeded = () => req.result.createObjectStore("photos");
  req.onerror = () => reject(req.error);
  req.onsuccess = () => {
    const tx = req.result.transaction("photos", "readonly").objectStore("photos").getAllKeys();
    tx.onsuccess = () => resolve(tx.result.sort());
  };
}));

const ranger = (page, ids) => page.evaluate(ids => new Promise((resolve, reject) => {
  const req = indexedDB.open("carnet-photos", 1);
  req.onupgradeneeded = () => req.result.createObjectStore("photos");
  req.onerror = () => reject(req.error);
  req.onsuccess = () => {
    const tx = req.result.transaction("photos", "readwrite");
    for (const id of ids) tx.objectStore("photos").put(new Blob(["x"], { type: "image/jpeg" }), id);
    tx.oncomplete = () => resolve();
  };
}), ids);

/* ---------- Stockage corrompu ou inaccessible (n° 41, 26) ---------- */

test("stockage corrompu : l'appli démarre sur un carnet vide et garde la copie brute", async ({ page, context }) => {
  const erreurs = surveillerErreurs(page);
  await poserBrut(context, "{pas du json");
  await page.goto("/");
  await expect(page.locator(CARTES)).toHaveCount(20);
  expect(erreurs).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem("carnet-cuisine-v1-illisible"))).toBe("{pas du json");

  // L'appli reste utilisable, et sa première sauvegarde ne reprend pas la copie brute.
  await page.goto(`/#/recette/${RID}`);
  await page.locator("#add-list").click();
  await page.getByRole("dialog").getByRole("button", { name: "Ajouter tel quel" }).click();
  await expect(page.locator("#menu-badge")).toHaveText("1");
  expect((await lireCarnet(page)).menu).toHaveLength(1);
  expect(await page.evaluate(() => localStorage.getItem("carnet-cuisine-v1-illisible"))).toBe("{pas du json");
});

test("stockage tronqué : même chose, le carnet illisible est récupérable", async ({ page, context }) => {
  const brut = JSON.stringify({ menu: [entree(RID)], notes: { [RID]: "encore" } }).slice(0, -9);
  await poserBrut(context, brut);
  await page.goto("/#/menu");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("carnet-cuisine-v1-illisible"))).toBe(brut);
});

test("getItem qui lève (Safari, cookies bloqués) : l'appli démarre quand même", async ({ page, context }) => {
  const erreurs = surveillerErreurs(page);
  await context.addInitScript(() => {
    Storage.prototype.getItem = function () { throw new DOMException("refusé", "SecurityError"); };
  });
  await page.goto("/");
  await expect(page.locator(CARTES)).toHaveCount(20);
  expect(erreurs).toEqual([]);
  await page.goto("/#/menu");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("JSON valide mais de mauvaise forme : nettoyé, aucune vue ne reste blanche", async ({ page, context }) => {
  const erreurs = surveillerErreurs(page);
  await preremplir(context, {
    carnet: {
      timers: null, checked: null, extras: [null, 3], cooked: [], notes: "encore",
      menu: [null, { rid: RID }, 12],
      historique: [null, { id: "h", date: "x" }, { id: "h2", date: "2026-01-01", entrees: [null] }],
      journal: [null, { id: "j1", rid: RID, date: "2026-02-01", convives: 4, note: "bon", photo: false }]
    }
  });
  await page.goto("/");
  await expect(page.locator(CARTES)).toHaveCount(20);
  await expect(page.locator("#menu-badge")).toHaveText("1");

  await page.goto("/#/menu");
  await expect(page.locator(".menu-card")).toHaveCount(1);
  await page.getByText("Repas passés").click();
  await expect(page.locator(".passe")).toHaveCount(1);

  await page.goto("/#/courses");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Le journal n'est pas réduit au silence par une entrée vide.
  await page.goto(`/#/recette/${RID}`);
  await expect(page.locator(".jr-entree")).toHaveCount(1);
  await expect(page.locator("#jr-ajout")).toBeVisible();
  expect(erreurs).toEqual([]);
});

/* ---------- Stockage plein (n° 43) ---------- */

test("stockage plein : le démarrage va jusqu'à la synchro", async ({ page, context }) => {
  const serveur = await simulerServeur(context, { menu: [], checked: {}, extras: [] });
  await preremplir(context, { sync: { mdp: MDP, vu: serveur.updated_at } });
  await stockagePlein(context);
  const erreurs = surveillerErreurs(page);
  await page.goto("/");
  await expect(page.locator(CARTES)).toHaveCount(20);
  await expect(page.locator("html")).toHaveAttribute("data-synchro", "ok");
  expect(serveur.lectures).toBeGreaterThan(0);
  expect(erreurs).toEqual([]);
});

test("stockage plein : l'ajout au menu marche en mémoire, avec un message, et la synchro envoie", async ({ page, context }) => {
  const serveur = await simulerServeur(context, { menu: [], checked: {}, extras: [] });
  await preremplir(context, { sync: { mdp: MDP, vu: serveur.updated_at } });
  await stockagePlein(context);
  await page.goto(`/#/recette/${RID}`);
  await expect(page.locator("html")).toHaveAttribute("data-synchro", "ok");

  await page.locator("#add-list").click();
  await page.getByRole("dialog").getByRole("button", { name: "Ajouter tel quel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("#menu-badge")).toHaveText("1");
  await expect(page.locator("#toast")).toContainText("Mémoire pleine");

  // La synchro, elle, a bien reçu la modification : c'est ce qui sauve les données.
  await expect.poll(() => serveur.ecritures.length).toBeGreaterThan(0);
  expect(serveur.ecritures.at(-1).menu).toHaveLength(1);
});

test("stockage plein : « Enregistrer » du journal ne fige pas la feuille", async ({ page, context }) => {
  await stockagePlein(context);
  await page.goto(`/#/recette/${RID}`);
  await page.locator("#jr-ajout").click();
  const feuille = page.getByRole("dialog", { name: "Ajouter au journal" });
  await feuille.locator("#jr-note").fill("Très bon");
  await feuille.locator("#jr-ok").click();
  await expect(feuille).toHaveCount(0);
  await expect(page.locator(".jr-entree")).toContainText("Très bon");
  await expect(page.locator("#toast")).toContainText("Mémoire pleine");
});

test("stockage plein : une séance de cuisine expirée ne casse pas l'affichage de la fiche", async ({ page, context }) => {
  await preremplir(context, { carnet: { cooking: { [RID]: { step: 2, at: Date.now() - 13 * 3600 * 1000 } } } });
  await stockagePlein(context);
  const erreurs = surveillerErreurs(page);
  await page.goto(`/#/recette/${RID}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quiche lorraine");
  await expect(page.getByRole("link", { name: /Cuisiner|Commencer/ }).first()).toBeVisible();
  expect(erreurs).toEqual([]);
});

/* ---------- Données reçues (n° 30, 51) ---------- */

test("un fichier importé mal formé est assaini : le menu reste affichable et « Vider le menu » marche", async ({ page, context }) => {
  const erreurs = surveillerErreurs(page);
  await preremplir(context, { carnet: { menu: [entree(RID, { k: "q1" })] } });
  await page.goto("/#/");
  await page.getByRole("button", { name: /^Réglages/ }).click();
  await expect(page.getByRole("dialog", { name: "Réglages" })).toBeVisible();
  const fichier = {
    menu: [{ rid: RID }],
    repas: { exclus: "gluten", convives: "abc" },
    historique: [null, { id: "h", date: "2026-01-01" }, { id: "h2", date: "2026-01-01", entrees: [null, { rid: RID }] }],
    journal: [null, { id: "j", rid: RID, date: "2026-01-02" }]
  };
  await page.locator("#reg-fichier").setInputFiles({ name: "carnet.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(fichier)) });
  await page.getByRole("alertdialog").getByRole("button", { name: "Remplacer mon carnet" }).click();

  await page.goto("/#/menu");
  await expect(page.locator(".menu-card")).toHaveCount(1);
  await expect(page.locator(".passe")).toHaveCount(1);
  await page.getByRole("button", { name: "Vider le menu" }).click();
  await expect(page.locator(".menu-card")).toHaveCount(0);
  expect(erreurs).toEqual([]);
});

test("une version serveur mal formée est assainie : le menu s'affiche, rien n'est copié sans contrôle", async ({ page, context }) => {
  const erreurs = surveillerErreurs(page);
  await simulerServeur(context, {
    menu: [null, { rid: RID }],
    historique: [null, { id: "h", date: "2026-01-01", entrees: [null, { rid: RID }] }],
    journal: [null, { id: "j", rid: RID, date: "2026-01-02" }],
    repas: { exclus: "gluten", convives: "abc" },
    checked: null
  });
  await preremplir(context, { sync: { mdp: MDP } });
  await page.goto("/#/menu");
  await expect(page.locator("html")).toHaveAttribute("data-synchro", "ok");
  await expect(page.locator(".menu-card")).toHaveCount(1);
  await expect(page.locator(".passe")).toHaveCount(1);
  const carnet = await lireCarnet(page);
  expect(carnet.menu[0].addons).toEqual([]);
  expect(typeof carnet.menu[0].k).toBe("string");
  expect(carnet.repas?.exclus ?? []).toEqual([]);   // « gluten » (une chaîne) n'est pas une liste d'allergènes
  expect(carnet.repas?.convives).toBeUndefined();
  expect(erreurs).toEqual([]);
});

/* ---------- Photos orphelines (n° 34) ---------- */

test("photos orphelines : le démarrage supprime celles qu'aucune entrée ne réclame", async ({ page, context }) => {
  await preremplir(context, {
    carnet: { journal: [{ id: "garde", rid: RID, date: "2026-02-01", convives: 2, note: "", photo: true }] }
  });
  await page.goto("/");
  await ranger(page, ["garde", "orphelin"]);
  await page.reload();
  await expect.poll(() => cles(page), { timeout: 15000 }).toEqual(["garde"]);
});

test("photos orphelines : une entrée retirée par la synchro emporte sa photo", async ({ page, context }) => {
  await preremplir(context, {
    carnet: { journal: [{ id: "reste", rid: RID, date: "2026-02-01", convives: 2, note: "", photo: true }] }
  });
  await page.goto("/");
  await page.evaluate(() => import("/js/vues/journal.js"));
  await ranger(page, ["reste", "partie-ailleurs"]);
  await page.evaluate(() => document.dispatchEvent(new CustomEvent("carnet-synchro")));
  await expect.poll(() => cles(page)).toEqual(["reste"]);
});

test("photos orphelines : un carnet de secours (stockage illisible) ne fait rien disparaître", async ({ page, context }) => {
  await poserBrut(context, "{abîmé");
  await page.goto("/");
  await page.evaluate(() => import("/js/vues/journal.js"));
  await ranger(page, ["precieuse"]);
  await page.evaluate(() => document.dispatchEvent(new CustomEvent("carnet-synchro")));
  await page.waitForTimeout(500);
  expect(await cles(page)).toEqual(["precieuse"]);
});
