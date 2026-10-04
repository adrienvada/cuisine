/* Lot « css » de la deuxième vague : contrastes, focus, mouvement réduit, cibles de 44 px,
   petits écrans (320 px) et pastille « Découverte ». Les mesures se font sur les styles
   calculés par le navigateur, dans les deux thèmes. */

import { test, expect, preremplir, entree, pageStable } from "./outils.js";
import { contraste } from "./outils-courses.js";

const VUES = ["#/", "#/recette/quiche-lorraine", "#/menu", "#/courses", "#/fondamentaux", "#/fondamental/maillard", "#/recette/quiche-lorraine/cuisine"];

/* Le thème posé à la main lance des transitions de couleur (0,2 s) : on mesure une
   fois la page immobile, sinon on lirait une couleur intermédiaire. */
const sombre = async page => {
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await pageStable(page);
};

/* Couleur du texte d'un élément et fond réel derrière lui : on empile les fonds
   translucides des ancêtres sur la couleur du thème, et l'opacité de l'élément
   (et de ses ancêtres) éclaircit le texte vers ce fond. */
async function couleurs(locator, pseudo = null) {
  return locator.evaluate((el, pseudo) => {
    const analyser = c => (c.match(/[\d.]+/g) || [0, 0, 0, 0]).map(Number);
    const noir = document.documentElement.getAttribute("data-theme") === "dark";
    let fond = noir ? [28, 32, 25] : [247, 243, 233];
    const chaine = [];
    for (let e = el; e; e = e.parentElement) chaine.unshift(e);
    let opacite = 1;
    for (const e of chaine) {
      const cs = getComputedStyle(e);
      const [r, g, b, a = 1] = analyser(cs.backgroundColor);
      if (cs.backgroundColor !== "rgba(0, 0, 0, 0)") fond = fond.map((v, i) => v * (1 - a) + [r, g, b][i] * a);
      opacite *= Number(cs.opacity);
    }
    const cs = getComputedStyle(el, pseudo);
    const [r, g, b, a = 1] = analyser(cs.color);
    const alpha = a * opacite;
    const texte = [r, g, b].map((v, i) => v * alpha + fond[i] * (1 - alpha));
    const rgb = t => `rgb(${t.map(Math.round).join(", ")})`;
    return { texte: rgb(texte), fond: rgb(fond) };
  }, pseudo);
}

async function ratio(locator, pseudo) {
  const { texte, fond } = await couleurs(locator, pseudo);
  return contraste(texte, fond);
}

for (const theme of ["clair", "sombre"]) {
  test(`n° 6 et 55 (${theme}) : « Pourquoi ça marche » atteint 4,5:1, replié comme déplié`, async ({ page }) => {
    await page.goto("/#/recette/quiche-lorraine");
    if (theme === "sombre") await sombre(page);
    const appel = page.locator(".s-cue").first();
    await expect(appel).toBeVisible();
    expect(await ratio(appel)).toBeGreaterThanOrEqual(4.5);
    await appel.click();
    await expect(page.locator(".a-savoirs.ouvert").first()).toBeVisible();
    await page.waitForTimeout(400);
    expect(await ratio(appel)).toBeGreaterThanOrEqual(4.5);
  });

  test(`n° 46 (${theme}) : l'icône de partage d'une carte atteint 3:1 sur son bouton`, async ({ page }) => {
    await page.goto("/#/");
    if (theme === "sombre") await sombre(page);
    const bouton = page.locator(".card-share").first();
    await expect(bouton).toBeVisible();
    expect(await ratio(bouton)).toBeGreaterThanOrEqual(3);
  });

  test(`n° 57 (${theme}) : les champs de saisie se détachent de leur fond à 3:1`, async ({ page, context }) => {
    await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })] } });
    const mesure = async selecteur => {
      const el = page.locator(selecteur).first();
      await expect(el).toBeVisible();
      return el.evaluate(e => {
        const noir = document.documentElement.getAttribute("data-theme") === "dark";
        const cs = getComputedStyle(e);
        /* Le contour se compare à ce qui entoure le champ : la page ou la carte. */
        let p = e.parentElement, fond = null;
        while (p && !fond) { const b = getComputedStyle(p).backgroundColor; if (b !== "rgba(0, 0, 0, 0)") fond = b; p = p.parentElement; }
        return { bord: cs.borderTopColor, largeur: parseFloat(cs.borderTopWidth), fond: fond || (noir ? "rgb(28, 32, 25)" : "rgb(247, 243, 233)") };
      });
    };
    for (const [vue, selecteur] of [["#/", ".searchbar"], ["#/courses", "#extra-input"], ["#/menu", ".rp-champ"]]) {
      await page.goto("/" + vue);
      if (theme === "sombre") await sombre(page);
      const m = await mesure(selecteur);
      expect(m.largeur, selecteur).toBeGreaterThan(0);
      expect(contraste(m.bord, m.fond), selecteur).toBeGreaterThanOrEqual(3);
    }
  });
}

test("n° 56 : le texte d'aide du champ d'ajout de la liste de courses atteint 4,5:1 en sombre", async ({ page }) => {
  await page.goto("/#/courses");
  await sombre(page);
  const champ = page.locator("#extra-input");
  const { texte } = await couleurs(champ, "::placeholder");
  const fond = await champ.evaluate(e => getComputedStyle(e).backgroundColor);
  expect(contraste(texte, fond)).toBeGreaterThanOrEqual(4.5);
});

test("n° 10 : la croix d'effacement des recherches est celle du carnet, et le champ des Savoirs a un nom", async ({ page }) => {
  /* Le navigateur ne rend pas les styles calculés de cette croix : on lit la règle
     qui la vise dans les feuilles chargées, et elle doit retirer l'apparence native. */
  await page.goto("/#/");
  const regle = await page.evaluate(() => {
    for (const feuille of document.styleSheets) {
      let regles = [];
      try { regles = [...feuille.cssRules]; } catch { continue; }
      for (const r of regles) {
        if (r.selectorText && r.selectorText.includes("::-webkit-search-cancel-button")) {
          return { appearance: r.style.getPropertyValue("appearance") || r.style.getPropertyValue("-webkit-appearance"), fond: r.style.getPropertyValue("background-color") };
        }
      }
    }
    return null;
  });
  expect(regle).not.toBeNull();
  expect(regle.appearance).toBe("none");
  expect(regle.fond).toContain("var(--");
  await page.goto("/#/fondamentaux");
  await expect(page.locator("#f-search")).toHaveAccessibleName("Chercher un mécanisme");
});

test("n° 47 : chaque champ de recherche ou de saisie montre un contour quand il a le focus au clavier", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })] } });
  /* Le contour est sur le champ ou sur la barre qui l'enveloppe. */
  const contour = champ => champ.evaluate(e => {
    const boite = e.closest(".searchbar") || e;
    return [e, boite].map(x => { const cs = getComputedStyle(x); return { style: cs.outlineStyle, largeur: parseFloat(cs.outlineWidth), ombre: cs.boxShadow }; });
  });
  const visible = ms => ms.some(m => (m.style !== "none" && m.largeur >= 2) || (m.ombre && m.ombre !== "none"));
  /* Un focus venu du clavier : on en sort et on y revient par Tab. */
  const auClavier = async champ => {
    await champ.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(champ).toBeFocused();
    return visible(await contour(champ));
  };

  await page.goto("/#/");
  expect(await auClavier(page.locator("#search")), "#search").toBe(true);

  await page.locator("#jai-ouvrir").click();
  expect(await auClavier(page.locator("#jai-recherche")), "#jai-recherche").toBe(true);

  await page.goto("/#/courses");
  expect(await auClavier(page.locator("#extra-input")), "#extra-input").toBe(true);

  await page.goto("/#/fondamentaux");
  expect(await auClavier(page.locator("#f-search")), "#f-search").toBe(true);
});

test("n° 48 : sous « réduire les animations », plus aucune animation ni transition ne dure", async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })] } });
  for (const vue of ["#/", "#/recette/quiche-lorraine", "#/menu", "#/courses", "#/fondamentaux"]) {
    await page.goto("/" + vue);
    await page.waitForTimeout(150);
    const longues = await page.evaluate(() => document.getAnimations()
      .map(a => ({ nom: a.animationName || a.transitionProperty, duree: a.effect.getTiming().duration, cible: String(a.effect.target?.className) }))
      .filter(a => a.duree > 1));
    expect(longues, vue).toEqual([]);
  }
  /* Les transitions d'un état (chevron, thème) sont coupées elles aussi. */
  await page.goto("/#/recette/quiche-lorraine");
  const duree = await page.locator(".s-cue svg").first().evaluate(e => getComputedStyle(e).transitionDuration);
  expect(parseFloat(duree)).toBeLessThanOrEqual(0.001);
  const corps = await page.evaluate(() => getComputedStyle(document.body).transitionDuration);
  expect(parseFloat(corps)).toBeLessThanOrEqual(0.001);
});

/* ---------- Cibles de 44 px ---------- */

/* La zone qui répond au doigt : on vise les quatre bords d'un carré de 44 px centré
   sur l'élément et on vérifie que c'est lui (ou son contenu) qui répond. */
async function zoneDe44(locator) {
  return locator.evaluate(el => {
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const touche = (x, y) => {
      const t = document.elementFromPoint(x, y);
      return !!t && (el === t || el.contains(t) || (t.tagName === "LABEL" && t.contains(el)));
    };
    const marge = 21;
    return {
      haut: touche(cx, cy - marge), bas: touche(cx, cy + marge),
      gauche: touche(cx - marge, cy), droite: touche(cx + marge, cy),
      l: Math.round(r.width), h: Math.round(r.height)
    };
  });
}

async function attendre44(locator, nom) {
  const z = await zoneDe44(locator);
  expect(z, `${nom} ${z.l}×${z.h}`).toMatchObject({ haut: true, bas: true, gauche: true, droite: true });
}

test("n° 53 : courses, suggestion, ajout d'article et actions ont des cibles de 44 px", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" }), entree("cake-sale", { k: "c1" })], extras: [{ id: "z1", name: "Papier cuisson" }] } });
  await page.goto("/#/courses");
  await expect(page.locator(".mh-chip").first()).toBeVisible();
  await attendre44(page.locator(".mh-chip").first(), "suggestion");
  await attendre44(page.locator(".mh-x"), "ne plus proposer");
  await attendre44(page.locator("#extra-input"), "champ d'ajout");
  await attendre44(page.locator("#extra-form button"), "bouton d'ajout");
  await attendre44(page.locator("#clear"), "vider la liste");
  /* Le nom d'un article déplie sa provenance : sa boîte (pas seulement son texte) fait 44 px dans les deux sens. */
  const nom = await page.locator("button.nom").first().boundingBox();
  expect(nom.width, "nom d'un article").toBeGreaterThanOrEqual(44);
  expect(nom.height, "nom d'un article").toBeGreaterThanOrEqual(44);
  await attendre44(page.locator("[data-remove-extra]").first(), "supprimer un article libre");
});

test("n° 53 : « Remettre l'ordre d'origine » a une cible de 44 px", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("quiche-lorraine", { k: "q1" })] } });
  await page.goto("/#/courses");
  await page.locator("[data-ranger]").click();
  await attendre44(page.locator("[data-reinit-ordre]"), "ordre d'origine");
});

test("n° 53 : les puces de composition et les verdicts de la fiche ont 44 px", async ({ page }) => {
  await page.goto("/#/recette/cake-sale");
  const puce = page.locator(".chip.pick").first();
  await expect(puce).toBeVisible();
  await attendre44(puce, "puce de composition");
  await attendre44(page.locator(".verdict-btn").first(), "verdict");
});

test("n° 53 : « La retirer » du menu, sur la fiche, a une cible de 44 px", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: [entree("cake-sale", { k: "c1" })] } });
  await page.goto("/#/recette/cake-sale/m/c1");
  const retirer = page.locator("#menu-retirer");
  await expect(retirer).toBeVisible();
  await attendre44(retirer, "La retirer");
});

test("n° 54 : les puces de filtre de l'accueil ont une zone de contact de 44 px", async ({ page }) => {
  await page.goto("/#/");
  for (const rangee of ["#chips", "#criteres"]) {
    const puces = page.locator(`${rangee} .chip`);
    const n = await puces.count();
    expect(n, rangee).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(n, 3); i++) await attendre44(puces.nth(i), `${rangee} puce ${i}`);
  }
});

/* ---------- Petits écrans ---------- */

test.describe("320 px", () => {
  test.use({ viewport: { width: 320, height: 700 } });

  test("n° 15 : aucune vue ne défile à l'horizontale", async ({ page, context }) => {
    const aujourdhui = new Date().toISOString().slice(0, 10);
    await preremplir(context, { carnet: {
      menu: ["quiche-lorraine", "cake-sale", "focaccia-romarin", "cocktail-concombre-menthe"].map((rid, i) => entree(rid, { k: "m" + i })),
      extras: [{ id: "z1", name: "Papier cuisson et un très long nom d'article libre pour voir" }],
      cooked: { "quiche-lorraine": { count: 12, last: Date.now() } },
      journal: [{ rid: "quiche-lorraine", date: aujourdhui, convives: 1, note: "Délicieuse" }]
    } });
    for (const vue of [...VUES, "#/recette/cocktail-concombre-menthe"]) {
      await page.goto("/" + vue);
      await page.waitForTimeout(400);
      /* La page ne défile pas, et rien de ce qui est dessiné ne dépasse du bord (hors rangées à défilement voulu). */
      const m = await page.evaluate(() => {
        const large = document.documentElement.clientWidth;
        const depasse = [...document.querySelectorAll("#app *, .tabbar *")]
          .filter(e => e.offsetParent && !e.closest(".chips"))
          .filter(e => e.getBoundingClientRect().right > large + 1)
          .map(e => `${e.tagName}.${e.className} ${Math.round(e.getBoundingClientRect().right)}`);
        return { page: document.documentElement.scrollWidth, large, depasse };
      });
      expect(m.page, vue).toBeLessThanOrEqual(m.large);
      expect(m.depasse, vue).toEqual([]);
    }
  });

  test("n° 60 : la bulle d'un minuteur au libellé long tient dans l'écran, croix comprise", async ({ page, context }) => {
    const minuteur = { id: "t1", rid: "quiche-lorraine", mk: null, step: 1, slot: null, label: "Préchauffage du four", emoji: "🥧", end: Date.now() + 600000, total: 10, fired: false };
    await preremplir(context, { carnet: { timers: [minuteur] } });
    await page.goto("/#/menu");
    const bulle = page.locator("#timer-tray .timer-pill").first();
    await expect(bulle).toBeVisible();
    for (const cible of [bulle, bulle.locator(".t-x")]) {
      const r = await cible.evaluate(e => { const b = e.getBoundingClientRect(); return { gauche: b.left, droite: b.right }; });
      expect(r.gauche).toBeGreaterThanOrEqual(0);
      expect(r.droite).toBeLessThanOrEqual(320);
    }
  });
});

test("n° 12 : à 375 px, les deux boutons de sauvegarde ont la même présentation", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/#/");
  await page.getByRole("button", { name: /^Réglages/ }).click();
  const exporter = page.locator("[data-exporter]");
  const importer = page.locator("[data-importer]");
  await exporter.scrollIntoViewIfNeeded();
  const [a, b] = await Promise.all([exporter, importer].map(x => x.evaluate(e => Math.round(e.getBoundingClientRect().height))));
  expect(a).toBe(b);
  /* Chacun tient sur une seule ligne de texte. */
  for (const bouton of [exporter, importer]) {
    const lignes = await bouton.evaluate(e => {
      const s = document.createRange();
      s.selectNodeContents(e);
      return new Set([...s.getClientRects()].map(r => Math.round(r.top))).size;
    });
    expect(lignes).toBe(1);
  }
});

test("n° 14 : sur la page d'un fondamental, la famille respire sous les boutons et l'emoji est séparé du titre", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/#/fondamental/maillard");
  // Vue et fondamentaux arrivent à la demande : on mesure la page une fois dessinée.
  await expect(page.locator(".f-fam-tag")).toBeVisible();
  const m = await page.evaluate(() => {
    const barre = document.querySelector(".topbar").getBoundingClientRect();
    const famille = document.querySelector(".f-fam-tag").getBoundingClientRect();
    const emoji = document.querySelector(".f-head h1 .f-emoji");
    const e = emoji.getBoundingClientRect();
    const mot = document.createRange();
    mot.setStart(emoji.nextSibling, 0);
    mot.setEnd(emoji.nextSibling, 1);
    return { ecartFamille: famille.top - barre.bottom, ecartEmoji: mot.getBoundingClientRect().left - e.right };
  });
  expect(m.ecartFamille).toBeGreaterThanOrEqual(12);
  expect(m.ecartEmoji).toBeGreaterThanOrEqual(4);
});

test("n° 9 : la pastille « Découverte » d'une vignette se lit en entier à 375 px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/#/");
  const pastilles = page.locator(".card-disc span");
  const n = await pastilles.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const p = pastilles.nth(i);
    const coupe = await p.evaluate(e => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1);
    expect(coupe, await p.textContent()).toBe(false);
  }
});
