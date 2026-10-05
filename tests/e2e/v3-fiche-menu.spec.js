/* Lot « fiche-menu » de la vague 3 : le mouvement de la fiche (photo, barre compacte, portions, « Au menu », composition) et du menu (cartes, convives, frise, calendrier), dans les deux modes de mouvement. */

import { test, expect, preremplir, entree, pageStable } from "./outils.js";

const QUICHE = "/#/recette/quiche-lorraine";
const REPAS = { convives: 6, heure: "20:00", date: "2099-06-15", exclus: [] };
const MENU2 = [entree("focaccia-romarin", { k: "f1" }), entree("quiche-lorraine", { k: "q1" })];

/* Compte ce que la page ajoute au <body> en position fixe (clones volants, particules) et
   les appels à Element.animate qui secouent (translate), avant tout script de l'appli. */
const espionner = page => page.addInitScript(() => {
  window.__fixes = [];
  window.__secoues = [];
  const animate = Element.prototype.animate;
  Element.prototype.animate = function (images, ...reste) {
    try {
      if (Array.isArray(images) && images.length > 4 && images.some(i => /-7px/.test(i.translate || ""))) window.__secoues.push(this.className);
    } catch {}
    return animate.call(this, images, ...reste);
  };
  new MutationObserver(lot => {
    for (const m of lot) for (const n of m.addedNodes) {
      if (n.nodeType === 1 && n.parentNode === document.body && n.style.position === "fixed") window.__fixes.push({ aria: n.getAttribute("aria-hidden"), pointer: n.style.pointerEvents });
    }
  }).observe(document, { childList: true, subtree: true });
});


for (const reduit of [false, true]) {
  const mode = reduit ? "mouvement réduit" : "mouvement normal";

  test.describe(mode, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: reduit ? "reduce" : "no-preference" });
    });

    test("fiche : la grande photo porte data-vt-photo, et la parallaxe n'existe qu'en mouvement normal", async ({ page }) => {
      await page.goto(QUICHE);
      await expect(page.locator(".hero .visual")).toHaveAttribute("data-vt-photo", "quiche-lorraine");
      const anim = await page.locator(".hero .visual > picture").evaluate(el => getComputedStyle(el).animationName);
      if (reduit || !(await page.evaluate(() => CSS.supports("animation-timeline: scroll()")))) expect(anim).toBe("none");
      else expect(anim).toBe("fiche-parallaxe");
    });

    test("portions : la valeur est lisible juste après le geste et à la fin de l'animation, le texte n'existe qu'une fois", async ({ page }) => {
      await page.goto(QUICHE);
      await pageStable(page);
      await page.locator("#p-plus").click();
      // Tout de suite : le texte entier, une seule fois (les chiffres qui roulent sont des pseudo-éléments).
      expect(await page.locator("#p-val").evaluate(e => e.textContent.replace(/\s+/g, " ").trim())).toBe("7 personnes");
      await expect(page.locator("#p-val")).toHaveText("7 personnes");
      await pageStable(page);
      await expect(page.locator("#p-val .rouler")).toHaveCount(0);
      await page.locator("#p-minus").click();
      await expect(page.locator("#p-val")).toHaveText("6 personnes");
      await expect(page.locator("#p-val")).toHaveAttribute("aria-live", "polite");
    });

    test("portions : les quantités de la liste suivent sans que la ligne change de place ni de largeur", async ({ page }) => {
      await page.goto(QUICHE);
      await pageStable(page);
      const avant = await page.locator(".ing-list .qty").first().evaluate(e => ({ t: e.textContent, w: e.getBoundingClientRect().width }));
      await page.locator("#p-plus").click();
      await pageStable(page);
      const apres = await page.locator(".ing-list .qty").first().evaluate(e => ({ t: e.textContent, w: e.getBoundingClientRect().width }));
      expect(apres.t).not.toBe(avant.t);
      expect(Math.abs(apres.w - avant.w)).toBeLessThan(24);
      expect(await page.locator(".ing-list .qty .rouler").count()).toBe(0);
    });

    test("portions : à la borne, le stepper répond (secousse) sans rien changer", async ({ page, context }) => {
      await preremplir(context, { carnet: { portions: { "quiche-lorraine": 24 } } });
      await espionner(page);
      await page.goto(QUICHE);
      await expect(page.locator("#p-val")).toHaveText("24 personnes");
      await page.locator("#p-plus").click();
      await expect(page.locator("#p-val")).toHaveText("24 personnes");
      const secoues = await page.evaluate(() => window.__secoues);
      if (reduit) expect(secoues).toEqual([]); else expect(secoues.some(c => c.includes("portions"))).toBe(true);
    });

    test("« Au menu » : un clone vole puis disparaît du DOM, aria-hidden ; rien en mouvement réduit", async ({ page }) => {
      await espionner(page);
      await page.goto("/#/recette/focaccia-romarin");
      await pageStable(page);
      await page.locator("#add-list").click();
      await page.getByRole("dialog").getByRole("button", { name: "Ajouter tel quel" }).click();
      await expect(page.locator("#add-list")).toContainText("Ajouté");
      if (reduit) {
        expect(await page.evaluate(() => window.__fixes.filter(f => f.aria === "true").length)).toBe(0);
        return;
      }
      await page.waitForFunction(() => window.__fixes.length > 0);
      const [vol] = await page.evaluate(() => window.__fixes);
      expect(vol).toEqual({ aria: "true", pointer: "none" });
      await page.waitForFunction(() => ![...document.body.children].some(n => n.style.position === "fixed" && n.getAttribute("aria-hidden") === "true" && n.style.zIndex === "300"));
    });

    test("« Au menu » : le bouton se transforme (coche tracée, libellé qui change) puis redevient « Ajouter une autre version »", async ({ page }) => {
      await page.goto("/#/recette/focaccia-romarin");
      await page.locator("#add-list").click();
      await page.getByRole("dialog").getByRole("button", { name: "Ajouter tel quel" }).click();
      await expect(page.locator("#add-list")).toContainText("Ajouté");
      await expect(page.locator("#add-list path[pathLength='1']")).toHaveCount(1);
      await expect(page.locator("#add-list")).toContainText("Ajouter une autre version");
    });

    test("composition : une puce se bascule sur place (même élément), les ingrédients qui arrivent et partent se remplacent", async ({ page }) => {
      await page.goto(QUICHE);
      const puce = page.locator('[data-addon]').first();
      await puce.evaluate(e => { e.dataset.vu = "1"; });
      const avant = await page.locator("#ing-list li").count();
      await puce.click();
      await expect(puce).toHaveAttribute("aria-pressed", "true");
      expect(await puce.getAttribute("data-vu")).toBe("1");
      await expect(page.locator("#ing-list li:not([inert])")).not.toHaveCount(avant);
      await puce.click();
      await expect(puce).toHaveAttribute("aria-pressed", "false");
      await expect(page.locator("#ing-list li:not([inert])")).toHaveCount(avant);
      await pageStable(page);
      await expect(page.locator("#ing-list li")).toHaveCount(avant);
    });

    test("cœur : le coup de cœur bascule sur place, le même bouton garde son état", async ({ page }) => {
      await page.goto(QUICHE);
      const bouton = page.locator("#verdict-row [data-verdict]").first();
      await bouton.evaluate(e => { e.dataset.vu = "1"; });
      await bouton.click();
      await expect(bouton).toHaveAttribute("aria-pressed", "true");
      expect(await bouton.getAttribute("data-vu")).toBe("1");
      await bouton.click();
      await expect(bouton).toHaveAttribute("aria-pressed", "false");
    });

    test("« Pourquoi ça marche » reste ouvert quand les portions changent les quantités du texte", async ({ page }) => {
      await page.goto(QUICHE);
      const appel = page.locator(".s-cue").first();
      await appel.scrollIntoViewIfNeeded();
      await appel.click();
      await expect(appel).toHaveAttribute("aria-expanded", "true");
      const nb = await page.locator(".a-savoirs.ouvert").count();
      await page.locator("#p-plus").click();
      await expect(page.locator("#p-val")).toHaveText("7 personnes");
      await pageStable(page);
      await expect(page.locator(".a-savoirs.ouvert")).toHaveCount(nb);
      await expect(appel).toHaveAttribute("aria-expanded", "true");
    });

    test("feuille d'un ingrédient : ses blocs arrivent avec elle (jamais en mouvement réduit)", async ({ page }) => {
      await page.goto(QUICHE);
      await page.locator(".ing-ligne").first().click();
      const blocs = page.locator(".sheet-ing > :not(.sheet-grip)");
      await expect(blocs.first()).toBeVisible();
      expect(await blocs.count()).toBeGreaterThan(0);
      // Neutralisée en réduit : la classe peut rester posée, l'animation, non.
      const nom = await blocs.first().evaluate(e => getComputedStyle(e).animationName);
      if (reduit) expect(nom).toBe("none");
      else await expect(blocs.first()).toHaveClass(/arrive/);
    });

    test("« Cuisiner » : le bouton est le dernier élément activé quand on le touche", async ({ page }) => {
      await page.goto(QUICHE);
      const lien = page.locator(".actions a.btn.primary");
      await lien.scrollIntoViewIfNeeded();
      const b = await lien.boundingBox();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down();
      expect(await page.evaluate(() => document.activeElement?.matches(".actions a.btn.primary"))).toBe(true);
      await page.mouse.up();
    });

    test("menu : la frise se trace une fois, en 900 ms au plus ; un changement d'heure ne la retrace pas ; en réduit, état final", async ({ page, context }) => {
      await preremplir(context, { carnet: { menu: MENU2, repas: REPAS } });
      await page.goto("/#/menu");
      const frise = page.locator(".frise");
      if (reduit) {
        await expect(frise.locator(".fr").first()).toBeVisible();
        await expect(frise).not.toHaveAttribute("data-trace", /.+/);
        expect(await page.evaluate(() => document.getAnimations().filter(a => /^fr-/.test(a.animationName || "")).length)).toBe(0);
        return;
      }
      await expect(frise).toHaveAttribute("data-trace", "joue");
      const bilan = await page.evaluate(() => {
        const a = document.getAnimations().filter(x => ["fr-fil", "fr-fil-calme", "fr-point", "fr-fondu"].includes(x.animationName));
        return { n: a.length, fin: Math.max(...a.map(x => x.effect.getComputedTiming().endTime)) };
      });
      expect(bilan.n).toBeGreaterThan(5);
      expect(bilan.fin).toBeLessThanOrEqual(900);
      await pageStable(page);
      // Un changement d'heure : fondu, pas de nouveau tracé.
      await page.locator("#repas-heure").fill("19:00");
      await expect(page.locator(".frise .fr-h").first()).not.toHaveText("15 h 10");
      await expect(page.locator(".frise")).not.toHaveAttribute("data-trace", /.+/);
      expect(await page.evaluate(() => document.getAnimations().filter(a => /^fr-fil/.test(a.animationName || "")).length)).toBe(0);
    });

    test("menu : les repos ont leur propre tracé (fil calme), et la notice de conflit secoue une fois", async ({ page, context }) => {
      await preremplir(context, { carnet: { menu: MENU2, repas: REPAS } });
      await espionner(page);
      await page.goto("/#/menu");
      await expect(page.locator(".retro-note.conflit")).toBeVisible();
      const secoues = await page.evaluate(() => window.__secoues.filter(c => c.includes("conflit")).length);
      if (reduit) { expect(secoues).toBe(0); return; }
      expect(secoues).toBe(1);
      const calme = await page.evaluate(() => document.getAnimations().some(a => a.animationName === "fr-fil-calme"));
      expect(calme).toBe(true);
      // Un redessin qui redit la même notice ne secoue pas de nouveau.
      await page.locator('[data-conv="1"]').click();
      await expect(page.locator("#rp-conv-val")).toHaveText("7 convives");
      expect(await page.evaluate(() => window.__secoues.filter(c => c.includes("conflit")).length)).toBe(1);
    });

    test("menu : convives, le chiffre roule puis se lit en entier", async ({ page, context }) => {
      await preremplir(context, { carnet: { menu: MENU2, repas: REPAS } });
      await page.goto("/#/menu");
      await pageStable(page);
      await page.locator('[data-conv="1"]').click();
      expect(await page.locator("#rp-conv-val").evaluate(e => e.textContent.replace(/\s+/g, " ").trim())).toBe("7 convives");
      await expect(page.locator("#rp-conv-val")).toHaveText("7 convives");
      await pageStable(page);
      await expect(page.locator("#rp-conv-val .rouler")).toHaveCount(0);
    });

    test("menu : une carte retirée se replie (inert, aria-hidden dès le début), Annuler la remet à sa place", async ({ page, context }) => {
      await preremplir(context, { carnet: { menu: [...MENU2, entree("cake-sale", { k: "c1" })], repas: REPAS } });
      await page.goto("/#/menu");
      const ordre = () => page.locator(".menu-card:not([inert])").evaluateAll(l => l.map(c => c.dataset.open));
      const avant = await ordre();
      expect(avant).toHaveLength(3);
      const milieu = avant[1];
      await page.locator(`.menu-card[data-open="${milieu}"] .mc-x`).click();
      if (!reduit) {
        // Dès le début de la sortie : sortie de l'arbre d'accessibilité, ou déjà retirée.
        const etat = await page.evaluate(k => { const c = document.querySelector(`.menu-card[data-open="${k}"]`); return c ? { inert: c.inert, aria: c.getAttribute("aria-hidden") } : null; }, milieu);
        if (etat) expect(etat).toEqual({ inert: true, aria: "true" });
      }
      await expect(page.locator(".menu-card")).toHaveCount(2);
      await page.locator("#toast").getByRole("button", { name: "Annuler" }).click();
      await expect(page.locator(".menu-card")).toHaveCount(3);
      await pageStable(page);
      expect(await ordre()).toEqual(avant);
    });

    test("menu : vider puis Annuler ramène toutes les cartes ; l'état vide trace son illustration", async ({ page, context }) => {
      await preremplir(context, { carnet: { menu: MENU2, repas: REPAS } });
      await page.goto("/#/menu");
      await page.getByRole("button", { name: "Vider le menu" }).click();
      await expect(page.locator(".empty")).toBeVisible();
      await expect(page.locator(".empty-illo")).toBeVisible();
      if (!reduit) {
        await expect(page.locator(".empty-illo.trace [pathLength='1']").first()).toBeAttached();
      }
      await page.locator("#toast").getByRole("button", { name: "Annuler" }).click();
      await expect(page.locator(".menu-card")).toHaveCount(2);
    });

    test("menu : « Ajouter au calendrier » confirme par une coche tracée", async ({ page, context }) => {
      await preremplir(context, { carnet: { menu: MENU2, repas: REPAS } });
      await page.goto("/#/menu");
      const [dl] = await Promise.all([page.waitForEvent("download"), page.locator("#ajout-calendrier").click()]);
      expect(dl.suggestedFilename()).toMatch(/\.ics$/);
      const bouton = page.locator("#ajout-calendrier");
      await expect(bouton).toContainText("Ajouté au calendrier");
      await expect(bouton.locator("path[pathLength='1']")).toHaveCount(1);
      await expect(bouton).toContainText("Ajouter au calendrier");
    });
  });
}

test("en-tête compact : il apparaît quand le titre sort de l'écran, son titre est aria-hidden, le h1 reste unique", async ({ page }) => {
  await page.goto(QUICHE);
  await pageStable(page);
  const barre = page.locator("#fiche-barre");
  await expect(barre).not.toHaveClass(/visible/);
  expect(await barre.evaluate(e => e.inert)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 900));
  await expect(barre).toHaveClass(/visible/);
  expect(await barre.evaluate(e => e.inert)).toBe(false);
  await expect(barre.locator(".fb-titre")).toHaveAttribute("aria-hidden", "true");
  await expect(barre.locator(".fb-titre")).toContainText("Quiche lorraine");
  await expect(page.locator("h1")).toHaveCount(1);
  // La barre ne masque rien : la marge de défilement de la page lui laisse la place.
  expect(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop))).toBeGreaterThanOrEqual(52);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(barre).not.toHaveClass(/visible/);
  expect(await barre.evaluate(e => e.inert)).toBe(true);
});

test("ingrédients et étapes : ceux du premier écran ne sont jamais cachés, les autres attendent d'y entrer", async ({ page }) => {
  await page.goto(QUICHE);
  const premiere = page.locator("#ing-list li").first();
  expect(await premiere.getAttribute("data-attend")).toBeNull();
  const attendu = page.locator("#steps-list > li").last();
  await expect(attendu).toHaveAttribute("data-attend", "");
  await attendu.scrollIntoViewIfNeeded();
  await expect(attendu).not.toHaveAttribute("data-attend", "");
});

test("aucun débordement horizontal à 320 px, fiche et menu, clair et sombre", async ({ page, context }) => {
  await preremplir(context, { carnet: { menu: MENU2, repas: REPAS } });
  await page.setViewportSize({ width: 320, height: 700 });
  for (const theme of ["light", "dark"]) {
    await page.emulateMedia({ colorScheme: theme });
    for (const vue of [QUICHE, "/#/menu"]) {
      await page.goto(vue);
      await pageStable(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    }
  }
});
