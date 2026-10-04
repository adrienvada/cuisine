/* Synchronisation entre appareils, contre un Supabase et un canal Realtime simulés
   (jamais le vrai serveur). js/sync-config.js est déjà renseigné : il suffit d'un
   mot de passe mémorisé pour que ça parte. Le témoin d'état est l'attribut
   data-synchro de <html> (off | attente | ok | hors). */

import { test, expect, preremplir, entree, lireCarnet } from "./outils.js";
import { simulerServeur, simulerCanal, sujetDuCanal, MDP } from "./outils-synchro.js";

const VIDE = { menu: [], checked: {}, extras: [] };
const etat = (page, valeur) => expect(page.locator("html")).toHaveAttribute("data-synchro", valeur);
const b64url = texte => Buffer.from(texte, "utf8").toString("base64url");

/* Un navigateur déjà connecté, à jour de la version serveur. */
async function connecte(context, carnet = VIDE, options) {
  const serveur = await simulerServeur(context, { ...VIDE, ...carnet }, options);
  await preremplir(context, { carnet, sync: { mdp: MDP, vu: serveur.updated_at } });
  return serveur;
}

async function ajouterTelQuel(page) {
  await page.locator("#add-list").click();
  await page.getByRole("dialog").getByRole("button", { name: "Ajouter tel quel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test("synchro : une modification du menu part au serveur", async ({ page, context }) => {
  const serveur = await connecte(context);
  await page.goto("/#/recette/quiche-lorraine");
  await etat(page, "ok");

  await ajouterTelQuel(page);

  // L'envoi part 0,8 s après la modification.
  await expect.poll(() => serveur.ecritures.length).toBeGreaterThan(0);
  const derniere = serveur.ecritures.at(-1);
  expect(derniere.menu).toHaveLength(1);
  expect(derniere.menu[0].rid).toBe("quiche-lorraine");
  // Le client précise la version qu'il a vue : le serveur peut refuser une écriture périmée.
  const appel = serveur.appels.filter(a => a.nom === "carnet_ecrire").at(-1);
  expect(appel.corps.p_vu).toBe("2026-01-01T00:00:01.000Z");
});

test("synchro : une version serveur plus récente est appliquée au retour sur l'appli", async ({ page, context }) => {
  const serveur = await connecte(context, { menu: [entree("quiche-lorraine", { k: "q1" })] });
  await page.goto("/#/menu");
  await expect(page.locator(".menu-card")).toContainText("Quiche lorraine");
  await etat(page, "ok");

  // Quelqu'un d'autre vient de remplacer le menu.
  serveur.modifier({ menu: [entree("focaccia-romarin", { k: "f1" })], checked: {}, extras: [] });
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));

  await expect(page.locator(".menu-card")).toContainText("Focaccia");
  await expect(page.locator(".menu-card", { hasText: "Quiche lorraine" })).toHaveCount(0);
});

test("synchro : deux ajouts de menu faits chacun de son côté se retrouvent ensemble", async ({ page, context }) => {
  const quiche = entree("quiche-lorraine", { k: "q1" });
  const serveur = await connecte(context, { menu: [quiche] });
  await page.goto("/#/recette/cake-sale");
  await etat(page, "ok");

  // Un autre appareil ajoute une focaccia pendant que celui-ci ajoute le cake.
  serveur.modifier({ ...VIDE, menu: [quiche, entree("focaccia-romarin", { k: "f1" })] });
  await ajouterTelQuel(page);

  await expect.poll(() => serveur.ecritures.length).toBeGreaterThan(0);
  const rids = serveur.ecritures.at(-1).menu.map(e => e.rid).sort();
  expect(rids).toEqual(["cake-sale", "focaccia-romarin", "quiche-lorraine"]);
  // Et l'appareil les affiche aussi.
  await page.goto("/#/menu");
  await expect(page.locator(".menu-card")).toHaveCount(3);
});

test("synchro : un retrait fait ailleurs n'est pas ressuscité par une modification locale", async ({ page, context }) => {
  const quiche = entree("quiche-lorraine", { k: "q1" });
  const focaccia = entree("focaccia-romarin", { k: "f1" });
  const serveur = await connecte(context, { menu: [quiche, focaccia] });
  await page.goto("/#/courses");
  await etat(page, "ok");

  serveur.modifier({ ...VIDE, menu: [quiche] });                 // l'autre appareil a retiré la focaccia
  await page.locator("#extra-input").fill("Citrons");
  await page.locator("#extra-input").press("Enter");

  await expect.poll(() => serveur.ecritures.length).toBeGreaterThan(0);
  const envoye = serveur.ecritures.at(-1);
  expect(envoye.menu.map(e => e.k)).toEqual(["q1"]);
  expect(envoye.extras.map(x => x.name)).toContain("Citrons");
});

test("synchro : conflit de version, le client relit, refusionne et réessaie", async ({ page, context }) => {
  const quiche = entree("quiche-lorraine", { k: "q1" });
  const serveur = await connecte(context, { menu: [quiche] });
  await page.goto("/#/courses");
  await etat(page, "ok");

  // Une autre personne écrit juste avant que notre écriture n'arrive.
  serveur.avantEcriture(s => s.modifier({ menu: [quiche], checked: { oeufs: true }, extras: [] }));
  await page.locator("#extra-input").fill("Citrons");
  await page.locator("#extra-input").press("Enter");

  await expect.poll(() => serveur.ecritures.length).toBe(1);
  expect(serveur.refus).toBe(1);                                  // première tentative refusée
  const envoye = serveur.ecritures[0];
  expect(envoye.checked.oeufs).toBe(true);                        // ce qui venait d'ailleurs est gardé
  expect(envoye.extras.map(x => x.name)).toEqual(["Citrons"]);    // et ce qui vient d'ici aussi
  // Le client a relu avant de réessayer.
  expect(serveur.appels.filter(a => a.nom === "carnet_ecrire")).toHaveLength(2);
  await expect.poll(async () => (await lireCarnet(page)).checked?.oeufs).toBe(true);
});

test("synchro : le serveur sans la nouvelle fonction SQL, repli sur l'ancienne", async ({ page, context }) => {
  const serveur = await connecte(context, VIDE, { ancienne: true });
  await page.goto("/#/recette/quiche-lorraine");
  await etat(page, "ok");

  await ajouterTelQuel(page);

  await expect.poll(() => serveur.ecritures.length).toBe(1);
  expect(serveur.ecritures[0].menu[0].rid).toBe("quiche-lorraine");
  const ecrire = serveur.appels.filter(a => a.nom === "carnet_ecrire");
  expect(ecrire.at(0).corps).toHaveProperty("p_vu");              // d'abord la nouvelle, introuvable
  expect(ecrire.at(-1).corps).not.toHaveProperty("p_vu");         // puis l'ancienne, à deux arguments

  // Une deuxième modification ne retente pas la nouvelle fonction.
  const avant = ecrire.length;
  await page.goto("/#/courses");
  await page.locator("#extra-input").fill("Sel fin");
  await page.locator("#extra-input").press("Enter");
  await expect.poll(() => serveur.ecritures.length).toBe(2);
  const plus = serveur.appels.filter(a => a.nom === "carnet_ecrire").slice(avant);
  expect(plus.every(a => !("p_vu" in a.corps))).toBe(true);
});

test("synchro : le mot de passe refusé arrête la synchro", async ({ page, context }) => {
  await simulerServeur(context, VIDE, { mdp: "autre" });
  await preremplir(context, { carnet: VIDE, sync: { mdp: MDP, vu: "x" } });
  await page.goto("/#/");
  await etat(page, "off");
  await expect(page.locator("#toast")).toContainText("Mot de passe refusé");
});

/* ---------- temps réel ---------- */

test("synchro : le canal dérive du mot de passe, et un « changé » fait relever sans attendre", async ({ page, context }) => {
  const canal = await simulerCanal(context);
  const serveur = await connecte(context, { menu: [entree("quiche-lorraine", { k: "q1" })] });
  await page.goto("/#/menu");
  await etat(page, "ok");
  await expect.poll(() => canal.joints.length).toBe(1);
  expect(canal.joints[0]).toBe(sujetDuCanal(MDP));
  expect(canal.joints[0]).not.toContain(MDP);

  serveur.modifier({ ...VIDE, menu: [entree("focaccia-romarin", { k: "f1" })] });
  canal.diffuser();
  await expect(page.locator(".menu-card")).toContainText("Focaccia");
});

test("synchro : après une écriture, un simple « changé » est diffusé, sans donnée", async ({ page, context }) => {
  const canal = await simulerCanal(context);
  const serveur = await connecte(context);
  await page.goto("/#/recette/quiche-lorraine");
  await etat(page, "ok");
  await expect.poll(() => canal.joints.length).toBe(1);

  await ajouterTelQuel(page);
  await expect.poll(() => serveur.ecritures.length).toBe(1);
  await expect.poll(() => canal.recus.filter(m => m.event === "broadcast").length).toBe(1);
  const diffusion = canal.recus.find(m => m.event === "broadcast");
  expect(diffusion.topic).toBe(sujetDuCanal(MDP));
  expect(diffusion.payload).toEqual({ type: "broadcast", event: "change", payload: {} });
});

test("synchro : canal tenu, heartbeat toutes les 25 s et relevé de secours toutes les 2 min", async ({ page, context }) => {
  const canal = await simulerCanal(context);
  const serveur = await connecte(context);
  await page.clock.install();
  await page.goto("/#/");
  await etat(page, "ok");
  await expect.poll(() => canal.joints.length).toBe(1);
  await expect.poll(() => serveur.lectures).toBeGreaterThan(0);

  // Heartbeat toutes les 25 s ; un relevé de secours seulement après 2 min.
  const avant = serveur.lectures;
  for (let i = 1; i <= 5; i++) {
    await page.clock.runFor(25000);
    await expect.poll(() => canal.battements).toBe(i);
    if (i === 4) expect(serveur.lectures).toBe(avant);
  }
  await expect.poll(() => serveur.lectures - avant).toBeGreaterThanOrEqual(1);
  expect(serveur.lectures - avant).toBeLessThanOrEqual(2);
});

test("synchro : canal refusé, on relève toutes les 10 s", async ({ page, context }) => {
  const canal = await simulerCanal(context);
  canal.refuser = true;
  const serveur = await connecte(context);
  await page.clock.install();
  await page.goto("/#/");
  await etat(page, "ok");
  await expect.poll(() => serveur.lectures).toBeGreaterThan(0);
  const avant = serveur.lectures;
  await page.clock.runFor(35000);
  await expect.poll(() => serveur.lectures - avant).toBeGreaterThanOrEqual(3);
});

test("synchro : canal coupé, reconnexion à délai croissant", async ({ page, context }) => {
  const canal = await simulerCanal(context);
  await connecte(context);
  await page.goto("/#/");
  await etat(page, "ok");
  await expect.poll(() => canal.joints.length).toBe(1);

  canal.couper();
  await expect.poll(() => canal.connexions, { timeout: 8000 }).toBe(2);
  await expect.poll(() => canal.joints.length).toBe(2);
});

/* ---------- lien de connexion ---------- */

test("synchro : un lien de connexion rejoint un carnet vide de ce côté, puis efface le jeton de l'adresse", async ({ page, context }) => {
  const serveur = await simulerServeur(context, { ...VIDE, menu: [entree("focaccia-romarin", { k: "f1" })] }, { mdp: MDP });
  await page.goto(`/#/connexion/${b64url(MDP)}`);
  await etat(page, "ok");
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator("#toast")).toContainText("Synchronisation activée");

  expect((await lireCarnet(page)).menu.map(e => e.rid)).toEqual(["focaccia-romarin"]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("carnet-sync-v2")).mdp)).toBe(MDP);
  expect(serveur.ecritures).toHaveLength(0);                     // rejoindre n'écrit rien

  // Le jeton n'est plus dans l'historique : revenir en arrière ne le retrouve pas.
  expect(await page.evaluate(() => location.href)).not.toContain("connexion");
  await page.goBack().catch(() => {});
  expect(await page.evaluate(() => location.href)).not.toContain("connexion");
});

test("synchro : un lien de connexion devant un carnet local non vide demande confirmation", async ({ page, context }) => {
  await simulerServeur(context, { ...VIDE, menu: [entree("focaccia-romarin", { k: "f1" })] }, { mdp: MDP });
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })], checked: {}, extras: [] } });
  await page.goto(`/#/connexion/${b64url(MDP)}`);
  const feuille = page.getByRole("dialog", { name: "Rejoindre le carnet partagé" });
  await expect(feuille).toBeVisible();
  await expect(page).toHaveURL(/#\/$/);
  expect((await lireCarnet(page)).menu.map(e => e.rid)).toEqual(["quiche-lorraine"]);   // rien n'a bougé

  await feuille.getByRole("button", { name: "Remplacer et rejoindre" }).click();
  await etat(page, "ok");
  await expect.poll(async () => (await lireCarnet(page)).menu.map(e => e.rid)).toEqual(["focaccia-romarin"]);
});

test("synchro : un lien de connexion annulé ne change rien", async ({ page, context }) => {
  await simulerServeur(context, { ...VIDE, menu: [entree("focaccia-romarin", { k: "f1" })] }, { mdp: MDP });
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })], checked: {}, extras: [] } });
  await page.goto(`/#/connexion/${b64url(MDP)}`);
  await page.getByRole("dialog").getByRole("button", { name: "Annuler" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await etat(page, "off");
  expect((await lireCarnet(page)).menu.map(e => e.rid)).toEqual(["quiche-lorraine"]);
});

/* ---------- l'API des réglages ---------- */

const api = (page, corps, ...args) => page.evaluate(async ([corps, args]) => {
  const { carnetSync } = await import("/js/sync.js");
  return new Function("carnetSync", "args", `return (async () => { ${corps} })()`)(carnetSync, args);
}, [corps, args]);

test("synchro : connecter() prévient d'un carnet existant sans rien changer, puis remplace sur demande", async ({ page, context }) => {
  const serveur = await simulerServeur(context, { ...VIDE, menu: [entree("focaccia-romarin", { k: "f1" })] }, { mdp: MDP });
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })], checked: {}, extras: [] } });
  await page.goto("/#/");
  expect(await api(page, "return carnetSync.disponible && carnetSync.etat() + '|' + carnetSync.lienConnexion()")).toBe("off|null");

  const refus = await api(page, `return carnetSync.connecter("mauvais")`);
  expect(refus.ok).toBe(false);
  expect(refus.message).toContain("incorrect");

  const existant = await api(page, `return carnetSync.connecter(args[0])`, MDP);
  expect(existant).toMatchObject({ ok: false, carnetExistant: true });
  expect((await lireCarnet(page)).menu[0].rid).toBe("quiche-lorraine");
  expect(await api(page, "return carnetSync.etat()")).toBe("off");

  const remplace = await api(page, `return carnetSync.connecter(args[0], { remplacer: true })`, MDP);
  expect(remplace.ok).toBe(true);
  expect(await api(page, "return carnetSync.etat()")).toBe("ok");
  await expect.poll(async () => (await lireCarnet(page)).menu[0].rid).toBe("focaccia-romarin");
  expect(serveur.ecritures).toHaveLength(0);

  // Le lien de connexion est une adresse du site portant le mot de passe en base64url.
  const lien = await api(page, "return carnetSync.lienConnexion()");
  expect(lien).toMatch(/\/#\/connexion\/c2VjcmV0$/);
  expect(lien.startsWith("http://localhost")).toBe(true);

  await api(page, "carnetSync.deconnecter()");
  expect(await api(page, "return carnetSync.etat() + '|' + carnetSync.lienConnexion()")).toBe("off|null");
});

test("synchro : connecter() sur une base vide en fait le carnet partagé", async ({ page, context }) => {
  const serveur = await simulerServeur(context, null, { mdp: MDP });
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })], checked: {}, extras: [] } });
  await page.goto("/#/");
  const r = await api(page, `return carnetSync.connecter(args[0])`, MDP);
  expect(r.ok).toBe(true);
  await expect.poll(() => serveur.ecritures.length).toBe(1);
  expect(serveur.ecritures[0].menu[0].rid).toBe("quiche-lorraine");
});

test("synchro : surEtat() prévient des changements et se désabonne", async ({ page, context }) => {
  await simulerServeur(context, null, { mdp: MDP });
  await page.goto("/#/");
  const vus = await api(page, `
    const vus = [];
    const stop = carnetSync.surEtat(e => vus.push(e));
    await carnetSync.connecter(args[0]);
    carnetSync.deconnecter();
    stop();
    await carnetSync.connecter(args[0]);
    return vus;`, MDP);
  expect(vus).toEqual(["ok", "off"]);
});

test("synchro : une relève tardive de l'ancien carnet ne s'applique pas après un changement de carnet", async ({ page, context }) => {
  const serveur = await simulerServeur(context, { ...VIDE, menu: [entree("focaccia-romarin", { k: "f1" })] });
  await preremplir(context, { carnet: VIDE, sync: { mdp: "vieux", vu: serveur.updated_at } });
  // La réponse du vieux carnet arrive en retard, avec un menu qui n'est pas celui du nouveau.
  let liberer, vue;
  const retenue = new Promise(r => { liberer = r; });
  const arrivee = new Promise(r => { vue = r; });
  await context.route("**/rest/v1/rpc/carnet_lire", async route => {
    if (JSON.parse(route.request().postData() || "{}").p_mdp !== "vieux") return route.fallback();
    vue();
    await retenue;
    await route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*" }, contentType: "application/json",
      body: JSON.stringify([{ data: { ...VIDE, menu: [entree("quiche-lorraine", { k: "q1" })] }, updated_at: "2030-01-01T00:00:00.000Z" }]) });
  });
  await page.goto("/#/");
  await arrivee;                       // la relève du vieux carnet est partie et attend sa réponse
  await api(page, "carnetSync.deconnecter(); return carnetSync.connecter(args[0], { remplacer: true })", "nouveau");
  liberer();
  await page.waitForTimeout(500);
  const menu = (await lireCarnet(page)).menu.map(e => e.rid);
  expect(menu).toEqual(["focaccia-romarin"]);
});

/* ---------- ne pas déranger ---------- */

test("synchro : une mise à jour attend la fin de la saisie en cours", async ({ page, context }) => {
  const serveur = await connecte(context, { menu: [entree("quiche-lorraine", { k: "q1" })] });
  await page.goto("/#/courses");
  await etat(page, "ok");

  await page.locator("#extra-input").focus();
  await page.keyboard.type("Cit");
  serveur.modifier({ ...VIDE, menu: [entree("quiche-lorraine", { k: "q1" })], extras: [{ id: "e1", name: "Pastèque" }] });
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect.poll(() => serveur.lectures).toBeGreaterThan(1);

  // Le champ garde le focus et ce qui y est tapé tant qu'on y est.
  await page.waitForTimeout(1500);
  await expect(page.locator("#extra-input")).toBeFocused();
  await expect(page.locator("#extra-input")).toHaveValue("Cit");
  await expect(page.locator("li", { hasText: "Pastèque" })).toHaveCount(0);

  await page.locator("#extra-input").blur();
  await expect(page.locator("li", { hasText: "Pastèque" })).toHaveCount(1);
});
