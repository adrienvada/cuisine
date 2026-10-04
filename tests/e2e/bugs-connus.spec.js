/* Bugs connus (B1 à B12), chacun en test.fixme et écrit pour le comportement
   ATTENDU. Celui qui corrige un bug retire le « fixme » de son test : c'est son
   critère d'acceptation. Tant qu'il reste, la suite l'ignore. */

import { test, expect, preremplir, entree, simulerSupabase, lireCarnet, cochesAffichees, reseau } from "./outils.js";

const VIDE = { menu: [], checked: {}, extras: [] };
const CARTES = ".card:not(.gone):not(.card-leave)";

/* Un navigateur déjà connecté, à jour de la version serveur. */
async function connecte(context, carnet = VIDE) {
  const serveur = await simulerSupabase(context, { ...VIDE, ...carnet });
  await preremplir(context, { carnet, sync: { mdp: "secret", vu: serveur.updated_at } });
  return serveur;
}

/* Change l'adresse sans recharger la page — ce que ferait un lien. */
const aller = (page, hash) => page.evaluate(h => { location.hash = h; }, hash);

/* Ajoute la recette ouverte au menu, par la feuille de composition. */
async function ajouterTelQuel(page) {
  await page.locator("#add-list").click();
  await page.getByRole("dialog").getByRole("button", { name: "Ajouter tel quel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

/* ---------- B1 : la synchro ---------- */

test("B1a — taper une recherche ou avancer d'une étape n'envoie rien au serveur", async ({ page, context }) => {
  const serveur = await connecte(context);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-synchro", "ok");

  await page.locator("#search").fill("feta");
  await expect(page.locator(CARTES)).toHaveCount(5);

  await aller(page, "#/recette/quiche-lorraine/cuisine");
  await expect(page.locator(".cook-step-label")).toHaveText("Étape 1 / 5");
  await page.getByRole("button", { name: "Suivant" }).click();
  await expect(page.locator(".cook-step-label")).toHaveText("Étape 2 / 5");

  // L'envoi part 0,8 s après une modification : on laisse passer ce délai avec marge.
  await page.waitForTimeout(1500);
  expect(serveur.ecritures).toHaveLength(0);
});

test("B1b — une coche faite ailleurs n'est pas effacée par une modification locale d'autre chose", async ({ page, context }) => {
  const quiche = entree("quiche-lorraine", { k: "q1" });
  const serveur = await connecte(context, { menu: [quiche] });
  await page.goto("/#/courses");
  await expect(page.locator("html")).toHaveAttribute("data-synchro", "ok");

  // Un autre appareil coche les œufs ; ce navigateur ne l'a pas encore relevé.
  serveur.modifier({ menu: [quiche], checked: { oeufs: true }, extras: [] });

  // Modification locale d'autre chose : un article libre.
  await page.locator("#extra-input").fill("Citrons");
  await page.locator("#extra-input").press("Enter");
  await expect(page.locator("li", { hasText: "Citrons" })).toHaveCount(1);

  await expect.poll(() => serveur.ecritures.length).toBeGreaterThan(0);
  const envoye = serveur.ecritures.at(-1);
  expect(envoye.extras.map(x => x.name)).toContain("Citrons");
  expect(envoye.checked.oeufs).toBe(true);
});

/* ---------- B2 : les courses fusionnent sans perdre de quantité ---------- */

test("B2a — la ligne « Ail » additionne les gousses : 5 gousses", async ({ page, context }) => {
  await preremplir(context, {
    carnet: {
      menu: [
        entree("houmous-petits-pois-menthe", { k: "h1" }),
        entree("tagliatelles-carotte-carbonara", { k: "t1", addons: ["ail"] }),
        entree("pesto-basilic-maison", { k: "p1" })
      ]
    }
  });
  await page.goto("/#/courses");
  const ail = page.locator("label", { has: page.locator('input[data-key="ail"]') });
  await expect(ail).toContainText("Ail");
  await expect(ail.locator(".cqty")).toHaveText("5 gousses");
});

test("B2b — la ligne du basilic additionne les deux recettes sans rien perdre", async ({ page, context }) => {
  await preremplir(context, {
    carnet: { menu: [entree("dip-chevre-herbes", { k: "d1" }), entree("pesto-basilic-maison", { k: "p1" })] }
  });
  await page.goto("/#/courses");
  const basilic = page.locator("label", { has: page.locator('input[data-key="basilic"]') });
  await expect(basilic).toContainText("Basilic");
  // Les données n'ont plus qu'une unité par article : les deux recettes s'additionnent.
  await expect(basilic.locator(".cqty")).toHaveText("2 bouquets");
});

/* ---------- B3 : les coches ne survivent pas à un menu vidé ---------- */

test("B3 — vider le menu puis remettre la recette : rien n'est coché", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("focaccia-romarin", { k: "f1" })] } });
  page.on("dialog", d => d.accept());
  await page.goto("/#/courses");

  await page.locator("label", { has: page.locator('input[data-key="farine"]') }).locator(".tick").click();
  await page.locator("label", { has: page.locator('input[data-key="levure"]') }).locator(".tick").click();
  expect((await cochesAffichees(page)).sort()).toEqual(["farine", "levure"]);

  await page.locator('.tabbar a[data-tab="menu"]').click();
  await page.getByRole("button", { name: "Vider le menu" }).click();
  await expect(page.locator(".menu-card")).toHaveCount(0);

  await aller(page, "#/recette/focaccia-romarin");
  await ajouterTelQuel(page);
  await page.locator('.tabbar a[data-tab="courses"]').click();

  await expect(page.locator("label", { has: page.locator('input[data-key="farine"]') })).toBeVisible();
  expect(await cochesAffichees(page)).toEqual([]);
});

/* ---------- B4 : la barre du haut est recouverte par les boutons flottants ---------- */

for (const largeur of [375, 390, 430]) {
  test.fixme(`B4 — barre du haut libre de tout bouton flottant (${largeur} px)`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: 844 });
    await page.goto("/#/recette/quiche-lorraine");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const points = await page.evaluate(() => {
      // La flèche elle-même : c'est là que se pose le pouce, à l'extrémité gauche du lien.
      const retour = document.querySelector(".topbar a svg").getBoundingClientRect();
      const partager = document.getElementById("share-recipe").getBoundingClientRect();
      const qui = (x, y) => {
        const el = document.elementFromPoint(x, y);
        return {
          retour: !!el && !!el.closest(".topbar a"),
          partager: !!el && !!el.closest("#share-recipe"),
          sur: el ? (el.closest("[id], a, button") || el).outerHTML.slice(0, 80) : null
        };
      };
      return {
        centreRetour: { x: retour.left + retour.width / 2, y: retour.top + retour.height / 2 },
        bordPartager: { x: partager.right - 6, y: partager.top + partager.height / 2 },
        auCentreRetour: qui(retour.left + retour.width / 2, retour.top + retour.height / 2),
        auBordPartager: qui(partager.right - 6, partager.top + partager.height / 2)
      };
    });
    expect(points.auCentreRetour.retour, `au centre de la flèche « ← Recettes » : ${points.auCentreRetour.sur}`).toBe(true);
    expect(points.auBordPartager.partager, `au bord droit de « Partager » : ${points.auBordPartager.sur}`).toBe(true);

    // Et le toucher ramène bel et bien à l'accueil.
    await page.touchscreen.tap(points.centreRetour.x, points.centreRetour.y);
    await expect(page).toHaveURL(/#\/$/);
  });
}

/* ---------- B5 : la bulle du minuteur recouvre l'interface ---------- */

/* Un minuteur de la quiche, en cours, posé directement dans le carnet. */
const minuteurQuiche = () => ({
  id: "tmin1", rid: "quiche-lorraine", mk: null, step: 1, slot: null,
  label: "Cuisson à blanc", emoji: "🥧", end: Date.now() + 20 * 60000, total: 20, fired: false
});

test("B5a — sur une autre fiche, la bulle ne recouvre pas « Ajouter au menu »", async ({ page, context }) => {
  await preremplir(context, { carnet: { timers: [minuteurQuiche()] } });
  await page.goto("/#/recette/focaccia-romarin");
  await expect(page.locator("#timer-tray .timer-pill")).toHaveCount(1);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.locator("#add-list")).toBeInViewport();

  const propriete = await page.evaluate(() => {
    const r = document.getElementById("add-list").getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { bouton: !!el && !!el.closest("#add-list"), sur: el ? el.outerHTML.slice(0, 80) : null };
  });
  expect(propriete.bouton, `le centre du bouton appartient à : ${propriete.sur}`).toBe(true);
});

test("B5b — en mode cuisine, la bulle du minuteur affiché ne chevauche pas son compte à rebours", async ({ page }) => {
  // Petit téléphone (375 × 667) : c'est là que le compte à rebours descend sous la bulle.
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/#/recette/quiche-lorraine/cuisine/1");
  await page.getByRole("button", { name: /Minuteur 20 min/ }).click();
  await expect(page.locator("#timer-tray .timer-pill")).toHaveCount(1);
  await expect(page.locator("#timer-zone .clock")).toBeVisible();

  const { bulle, compte } = await page.evaluate(() => {
    const rect = el => { const r = el.getBoundingClientRect(); return { gauche: r.left, droite: r.right, haut: r.top, bas: r.bottom }; };
    return {
      bulle: rect(document.querySelector("#timer-tray .timer-pill")),
      compte: rect(document.querySelector("#timer-zone .clock"))
    };
  });
  const disjoints = bulle.droite <= compte.gauche || compte.droite <= bulle.gauche ||
    bulle.bas <= compte.haut || compte.bas <= bulle.haut;
  expect(disjoints, `bulle ${JSON.stringify(bulle)} / compte à rebours ${JSON.stringify(compte)}`).toBe(true);
});

/* ---------- B6 : le son doit être débloqué par le geste de l'utilisateur ---------- */

test("B6 — l'AudioContext est créé ou repris pendant le toucher sur « Minuteur »", async ({ page }) => {
  await page.addInitScript(() => {
    window.__audio = [];
    const Natif = window.AudioContext || window.webkitAudioContext;
    const noter = type => window.__audio.push({ type, geste: navigator.userActivation.isActive });
    class Espion extends Natif {
      constructor(...a) { super(...a); noter("create"); }
      resume(...a) { noter("resume"); return super.resume(...a); }
    }
    window.AudioContext = Espion;
    window.webkitAudioContext = Espion;
  });
  await page.goto("/#/recette/quiche-lorraine/cuisine/1");
  expect(await page.evaluate(() => window.__audio)).toEqual([]);

  await page.getByRole("button", { name: /Minuteur 20 min/ }).tap();
  await expect(page.locator("#timer-tray .timer-pill")).toHaveCount(1);

  // Le minuteur (20 min) est loin de sonner : tout ce qui est noté date du toucher.
  const journal = await page.evaluate(() => window.__audio);
  expect(journal.length).toBeGreaterThan(0);
  expect(journal.some(e => e.geste), `journal : ${JSON.stringify(journal)}`).toBe(true);
});

/* ---------- B7 : l'appli doit s'ouvrir même quand le réseau ne répond plus ---------- */

test.describe("B7", () => {
  test.use({ serviceWorkers: "allow" });

  test.fixme("B7 — appli en cache, réseau muet : elle s'affiche en moins de 3 s au rechargement", async ({ page, baseURL }) => {
    try {
      await page.goto("/");
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.reload();
      await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
      await expect(page.locator(".card").first()).toBeVisible();

      await reseau(baseURL, { bloque: true });
      // Marqueur de l'ancien document : seul le nouveau, une fois chargé, en est dépourvu.
      await page.evaluate(() => { window.__ancien = true; });
      const debut = Date.now();
      page.reload({ waitUntil: "commit" }).catch(() => {});
      await expect.poll(
        () => page.evaluate(() => !window.__ancien && !!document.querySelector("#app .card")).catch(() => false),
        { timeout: 3000, intervals: [100] }
      ).toBe(true);
      expect(Date.now() - debut).toBeLessThan(3000);
    } finally {
      await reseau(baseURL);
    }
  });
});

/* ---------- B8 : les portions d'une version au menu ---------- */

test("B8 — la fiche d'une version au menu affiche ses portions, et « + » les modifie", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("cake-sale", { k: "m9", portions: 9 })] } });
  await page.goto("/#/recette/cake-sale/m/m9");
  await expect(page.locator("#p-val")).toHaveText("9 personnes");

  await page.getByRole("button", { name: "Plus de portions" }).click();
  await expect(page.locator("#p-val")).toHaveText("10 personnes");
  await expect.poll(async () => (await lireCarnet(page)).menu.find(e => e.k === "m9").portions).toBe(10);
});

/* ---------- B9 : le défilement ne doit pas revenir en haut ---------- */

test("B9a — accueil défilé, recette ouverte, retour : même position à 50 px près", async ({ page }) => {
  /* Chromium rétablit de lui-même la position après le redessin, ce qui masque le
     défaut ; Safari et les PWA installées ne le font pas de façon fiable. On coupe
     donc la restauration native : c'est à l'application de retrouver sa place. */
  await page.addInitScript(() => { history.scrollRestoration = "manual"; });
  await page.goto("/#/");
  await expect(page.locator(CARTES)).toHaveCount(20);
  await page.evaluate(() => window.scrollTo(0, 1300));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(1200);
  const avant = await page.evaluate(() => window.scrollY);

  // Une carte entièrement visible à cet endroit de la page.
  const id = await page.evaluate(() => {
    const carte = [...document.querySelectorAll(".card")].find(c => {
      const r = c.getBoundingClientRect();
      return r.top > 60 && r.bottom < window.innerHeight - 90;
    });
    return carte.dataset.id;
  });
  await page.locator(`.card[data-id="${id}"] .body`).tap();
  await expect(page).toHaveURL(new RegExp(`#/recette/${id}$`));

  await page.goBack();
  await expect(page.locator(CARTES)).toHaveCount(20);
  await expect.poll(async () => Math.abs((await page.evaluate(() => window.scrollY)) - avant)).toBeLessThanOrEqual(50);
});

test("B9b — liste de courses défilée : une mise à jour du serveur ne ramène pas en haut", async ({ page, context }) => {
  const ids = ["focaccia-romarin", "quiche-lorraine", "veloute-butternut-shiitakes", "cake-sale", "salade-lentilles-feta", "scoopable-cookies"];
  const menu = ids.map((rid, i) => entree(rid, { k: "c" + i }));
  const serveur = await connecte(context, { menu });
  await page.goto("/#/courses");
  await expect(page.locator("html")).toHaveAttribute("data-synchro", "ok");

  await page.evaluate(() => window.scrollTo(0, 500));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  const avant = await page.evaluate(() => window.scrollY);

  serveur.modifier({ menu, checked: { farine: true }, extras: [{ id: "e1", name: "Citrons" }] });
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.locator("li", { hasText: "Citrons" })).toHaveCount(1);

  const apres = await page.evaluate(() => window.scrollY);
  expect(Math.abs(apres - avant)).toBeLessThanOrEqual(50);
});

/* ---------- B10 : la recherche ignore accents et ligatures ---------- */

test("B10a — la recherche des recettes ignore accents et ligatures", async ({ page }) => {
  await page.goto("/");
  const compter = async texte => {
    await page.locator("#search").fill(texte);
    return page.locator(CARTES).count();
  };
  for (const [sans, avec] of [["creme", "crème"], ["oeuf", "œuf"], ["emulsion", "émulsion"]]) {
    const attendu = await compter(avec);
    expect(attendu, `« ${avec} » doit trouver au moins une recette`).toBeGreaterThan(0);
    expect(await compter(sans), `« ${sans} » doit donner autant de résultats que « ${avec} »`).toBe(attendu);
  }
});

test("B10b — dans les Savoirs, « reaction » trouve la réaction de Maillard", async ({ page }) => {
  await page.goto("/#/fondamentaux");
  await page.locator("#f-search").fill("reaction");
  await expect(page.locator(".f-item", { hasText: "La réaction de Maillard" })).toBeVisible();
});

/* ---------- B11 : échappement du texte saisi ---------- */

test("B11a — un article libre s'affiche en texte brut, sans exécuter son HTML", async ({ page }) => {
  const nom = '<img src=x onerror="window.__xss=1">Glaçons';
  await page.goto("/#/courses");
  await page.locator("#extra-input").fill(nom);
  await page.locator("#extra-input").press("Enter");

  await expect(page.locator(".course-list .lbl")).toHaveText(nom);
  await expect(page.locator(".course-list img")).toHaveCount(0);
  // Une image cassée déclencherait onerror aussitôt : on laisse le navigateur trancher.
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => setTimeout(r, 100))));
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
});

test("B11b — une recherche avec des guillemets reste intacte après un aller-retour", async ({ page }) => {
  const requete = 'pâte "feuilletée';
  await page.goto("/");
  await page.locator("#search").fill(requete);
  await expect(page.locator("#search")).toHaveValue(requete);

  await page.locator('.tabbar a[data-tab="courses"]').click();
  await expect(page).toHaveURL(/#\/courses$/);
  await page.locator('.tabbar a[data-tab="home"]').click();
  await expect(page.locator("#search")).toBeVisible();
  await expect(page.locator("#search")).toHaveValue(requete);
});

/* ---------- B12 : la recherche des Savoirs ne doit pas recréer l'en-tête ---------- */

test("B12 — taper dans la recherche des Savoirs garde le même en-tête dans le document", async ({ page }) => {
  await page.goto("/#/fondamentaux");
  await expect(page.locator(".masthead")).toBeVisible();
  await page.evaluate(() => { window.__entete = document.querySelector(".masthead"); });

  await page.locator("#f-search").pressSequentially("mail");
  await expect(page.locator(".f-item", { hasText: "Maillard" })).toBeVisible();

  const meme = await page.evaluate(() => window.__entete.isConnected && window.__entete === document.querySelector(".masthead"));
  expect(meme).toBe(true);
});
