/* Le journal des recettes cuisinées : ajout avec photo, persistance, suppression, photo absente de l'appareil. */

import { test, expect, preremplir, lireCarnet } from "./outils.js";

const RID = "quiche-lorraine";

/* Le lot fiche pose <section id="journal-zone"> ; en son absence le test la crée,
   puis appelle le module comme le fera la fiche. */
async function dessiner(page) {
  await page.evaluate(async rid => {
    let zone = document.getElementById("journal-zone");
    if (!zone) {
      zone = document.createElement("section");
      zone.id = "journal-zone";
      (document.querySelector("#app .actions") || document.querySelector("#app")).before(zone);
    }
    const { dessinerJournal } = await import("/js/vues/journal.js");
    dessinerJournal(zone, RECIPES.find(r => r.id === rid));
  }, RID);
}

async function ouvrirFiche(page) {
  await page.goto(`/#/recette/${RID}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quiche lorraine");
  await dessiner(page);
}

/* Une image de test, plus grande que la limite de réduction, dessinée dans la page. */
const imageDeTest = page => page.evaluate(async () => {
  const toile = document.createElement("canvas");
  toile.width = 2400; toile.height = 1600;
  const ctx = toile.getContext("2d");
  ctx.fillStyle = "#C1913F"; ctx.fillRect(0, 0, 2400, 1600);
  ctx.fillStyle = "#42603A"; ctx.beginPath(); ctx.arc(1200, 800, 500, 0, 7); ctx.fill();
  const url = toile.toDataURL("image/png");
  return url.slice(url.indexOf(",") + 1);
}).then(b64 => ({ name: "plat.png", mimeType: "image/png", buffer: Buffer.from(b64, "base64") }));

/* Ce que l'IndexedDB de l'appareil garde pour une entrée : taille et type du fichier, dimensions décodées. */
const photoStockee = (page, id) => page.evaluate(id => new Promise((resolve, reject) => {
  const req = indexedDB.open("carnet-photos", 1);
  req.onerror = () => reject(req.error);
  req.onsuccess = () => {
    const get = req.result.transaction("photos").objectStore("photos").get(id);
    get.onsuccess = async () => {
      const blob = get.result;
      if (!blob) return resolve(null);
      const img = await createImageBitmap(blob);
      resolve({ type: blob.type, taille: blob.size, largeur: img.width, hauteur: img.height });
    };
  };
}), id);

async function ajouterAvecPhoto(page, note) {
  await page.locator("#jr-ajout").click();
  const feuille = page.getByRole("dialog", { name: "Ajouter au journal" });
  await expect(feuille).toBeVisible();
  await feuille.locator("#jr-date").fill("2026-09-27");
  await feuille.locator("#jr-plus").click();
  await feuille.locator("#jr-note").fill(note);
  await feuille.locator("#jr-fichier").setInputFiles(await imageDeTest(page));
  await expect(feuille.locator("#jr-apercu")).toBeVisible();
  await feuille.locator("#jr-ok").click();
  await expect(feuille).toHaveCount(0);
}

test("journal : ajout d'une entrée avec photo, réduite à 1 200 px, rangée sur l'appareil", async ({ page }) => {
  await ouvrirFiche(page);
  await expect(page.locator(".jr-vide")).toBeVisible();
  await ajouterAvecPhoto(page, "Un peu de muscade en plus");

  const ligne = page.locator(".jr-entree");
  await expect(ligne).toHaveCount(1);
  await expect(ligne).toContainText("Un peu de muscade en plus");
  await expect(ligne).toContainText("27 septembre");
  await expect(ligne.locator(".jr-photo img")).toBeVisible();

  const carnet = await lireCarnet(page);
  expect(carnet.journal).toHaveLength(1);
  const e = carnet.journal[0];
  expect(e).toMatchObject({ rid: RID, date: "2026-09-27", note: "Un peu de muscade en plus", photo: true });
  expect(e.convives).toBeGreaterThan(1);
  expect(JSON.stringify(carnet)).not.toContain("data:image");   // jamais de photo dans le carnet synchronisé

  const photo = await photoStockee(page, e.id);
  expect(photo.type).toBe("image/jpeg");
  expect(Math.max(photo.largeur, photo.hauteur)).toBe(1200);
  expect(photo.largeur / photo.hauteur).toBeCloseTo(1.5, 1);
});

test("journal : toucher la photo l'affiche en grand dans une feuille, Échap la referme", async ({ page }) => {
  await ouvrirFiche(page);
  await ajouterAvecPhoto(page, "");
  await page.locator(".jr-photo").click();
  const feuille = page.getByRole("dialog", { name: "Photo du plat" });
  await expect(feuille.locator("img.jr-grande")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(feuille).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`#/recette/${RID}$`));
});

test("journal : l'entrée et sa photo survivent au rechargement", async ({ page, context }) => {
  await preremplir(context);
  await ouvrirFiche(page);
  await ajouterAvecPhoto(page, "Pour six, parfaite");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quiche lorraine");
  await dessiner(page);
  await expect(page.locator(".jr-entree")).toContainText("Pour six, parfaite");
  await expect(page.locator(".jr-photo img")).toBeVisible();
});

test("journal : plus récente d'abord, « Aujourd'hui » et « Hier » en clair", async ({ page, context }) => {
  const jour = decalage => {
    const d = new Date(); d.setDate(d.getDate() - decalage);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  await preremplir(context, { carnet: { journal: [
    { id: "j1", rid: RID, date: jour(1), convives: 2, note: "hier", photo: false },
    { id: "j2", rid: RID, date: jour(40), convives: 4, note: "ancienne", photo: false },
    { id: "j3", rid: RID, date: jour(0), convives: 1, note: "ce soir", photo: false },
    { id: "j4", rid: "autre-recette", date: jour(0), convives: 1, note: "ailleurs", photo: false }
  ] } });
  await ouvrirFiche(page);
  const lignes = page.locator(".jr-entree");
  await expect(lignes).toHaveCount(3);
  await expect(lignes.nth(0)).toContainText("Aujourd'hui");
  await expect(lignes.nth(0)).toContainText("1 convive");
  await expect(lignes.nth(1)).toContainText("Hier");
  await expect(lignes.nth(2)).toContainText("ancienne");
});

test("journal : supprimer une entrée, puis annuler la rend avec sa photo", async ({ page }) => {
  await ouvrirFiche(page);
  await ajouterAvecPhoto(page, "À garder");
  const id = (await lireCarnet(page)).journal[0].id;

  await page.getByRole("button", { name: "Supprimer cette entrée" }).click();
  await expect(page.locator(".jr-entree")).toHaveCount(0);
  expect((await lireCarnet(page)).journal).toHaveLength(0);
  await expect(page.locator("#toast")).toContainText("Entrée supprimée");

  await page.locator("#toast .toast-action", { hasText: "Annuler" }).click();
  await expect(page.locator(".jr-entree")).toHaveCount(1);
  await expect(page.locator(".jr-entree")).toContainText("À garder");
  await expect(page.locator(".jr-photo img")).toBeVisible();
  expect((await lireCarnet(page)).journal[0].id).toBe(id);
  expect(await photoStockee(page, id)).not.toBeNull();
});

test("journal : supprimer sans annuler efface aussi la photo de l'appareil", async ({ page }) => {
  await ouvrirFiche(page);
  await ajouterAvecPhoto(page, "");
  const id = (await lireCarnet(page)).journal[0].id;
  await page.getByRole("button", { name: "Supprimer cette entrée" }).click();
  await expect.poll(() => photoStockee(page, id), { timeout: 15000 }).toBeNull();
});

test("journal : une entrée venue d'un autre téléphone annonce que sa photo est ailleurs", async ({ page, context }) => {
  await preremplir(context, { carnet: { journal: [
    { id: "ailleurs1", rid: RID, date: "2026-09-20", convives: 3, note: "Chez les parents", photo: true }
  ] } });
  await ouvrirFiche(page);
  const vignette = page.locator(".jr-photo.absente");
  await expect(vignette).toContainText("photo sur un autre appareil");
  await expect(vignette).toBeDisabled();
  await expect(page.locator(".jr-entree")).toContainText("Chez les parents");
});

test("journal : une note ne s'exécute jamais comme du HTML", async ({ page, context }) => {
  await preremplir(context, { carnet: { journal: [
    { id: "x1", rid: RID, date: "2026-09-20", convives: 2, note: '<img src=x onerror="window.__piege=1"><b>gras</b>', photo: false }
  ] } });
  await ouvrirFiche(page);
  await expect(page.locator(".jr-note")).toHaveText('<img src=x onerror="window.__piege=1"><b>gras</b>');
  expect(await page.evaluate(() => window.__piege)).toBeUndefined();
});

test("journal : sans photo, l'entrée s'enregistre ; la feuille tient à 375 px, sans débordement", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await ouvrirFiche(page);
  await page.locator("#jr-ajout").click();
  const feuille = page.getByRole("dialog", { name: "Ajouter au journal" });
  await expect(feuille).toBeVisible();
  const trop = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(trop).toBe(false);
  // Les zones de contact font au moins 44 px.
  for (const sel of ["#jr-moins", "#jr-plus", "#jr-ok", "#jr-non", ".jr-fichier"]) {
    const boite = await feuille.locator(sel).boundingBox();
    expect(boite.height, sel).toBeGreaterThanOrEqual(44);
  }
  await feuille.locator("#jr-ok").click();
  await expect(page.locator(".jr-entree")).toHaveCount(1);
  expect((await lireCarnet(page)).journal[0].photo).toBe(false);
  await expect(page.locator(".jr-photo")).toHaveCount(0);
});

test("journal : « Enregistrer » juste après le choix de la photo ne la perd pas, et une date future devient aujourd'hui", async ({ page }) => {
  await ouvrirFiche(page);
  await page.locator("#jr-ajout").click();
  const feuille = page.getByRole("dialog", { name: "Ajouter au journal" });
  await feuille.locator("#jr-date").evaluate(el => { el.removeAttribute("max"); el.value = "2999-01-01"; });
  await feuille.locator("#jr-fichier").setInputFiles(await imageDeTest(page));
  await feuille.locator("#jr-ok").click();
  await expect(feuille).toBeHidden();
  const e = (await lireCarnet(page)).journal[0];
  expect(e.photo).toBe(true);
  expect(e.date.startsWith("2999")).toBe(false);
  expect(await photoStockee(page, e.id)).not.toBeNull();
});
