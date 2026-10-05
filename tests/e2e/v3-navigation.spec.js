/* Lot « navigation » de la vague 3 : transitions de vue (types, origine, photo partagée), pastille et icônes de la barre d'onglets, badges qui roulent, feuilles qui se ferment en glissant, messages qu'on écarte du doigt. Chaque effet est vérifié en mouvement normal et en mouvement réduit. */

import { test, expect, preremplir, entree, pageStable } from "./outils.js";

const QUICHE = "quiche-lorraine";
const REPAS = { convives: 6, heure: "20:00", date: "2099-06-15", exclus: [] };

/* Ce que la page fait, vu de l'extérieur, avant tout script de l'appli :
   - chaque transition de vue lancée (le type posé sur <html>, l'origine, les photos nommées avant l'échange du DOM et après) ;
   - les sauts de pastille (Element.animate avec scale 1.18) ;
   - les classes « joue » (icône d'onglet), « entre » et « sort » (badges, feuilles) vues à leur pose. */
const espionner = page => page.addInitScript(() => {
  window.__vt = [];
  window.__sauts = [];
  window.__classes = [];
  window.__sorties = [];
  const nommees = () => [...document.querySelectorAll("[data-vt-photo]")].map((e, i) => ({ i, id: e.dataset.vtPhoto, nom: e.style.viewTransitionName })).filter(e => e.nom === "photo-vt");
  const racine = () => document.documentElement;
  const original = Document.prototype.startViewTransition;
  if (original) {
    Document.prototype.startViewTransition = function (rendu) {
      const e = {
        type: racine().dataset.vt, x: racine().style.getPropertyValue("--vt-x"), y: racine().style.getPropertyValue("--vt-y"),
        avant: nommees(), apres: null, titreAvant: document.title, scrollApres: null
      };
      window.__vt.push(e);
      return original.call(this, () => {
        const r = rendu();
        e.apres = nommees();
        e.titreApres = document.title;
        e.scrollApres = window.scrollY;
        return r;
      });
    };
  }
  const animate = Element.prototype.animate;
  Element.prototype.animate = function (images, ...reste) {
    try { if (Array.isArray(images) && images.some(i => String(i.scale) === "1.18")) window.__sauts.push(this.id || this.className); } catch {}
    return animate.call(this, images, ...reste);
  };
  // Une classe n'est comptée que quand elle vient d'être posée (pas à chaque changement des autres classes de l'élément).
  const vus = new WeakMap();
  new MutationObserver(lot => {
    for (const m of lot) {
      if (m.type !== "attributes" || m.attributeName !== "class") continue;
      const el = m.target;
      const avant = vus.get(el) || {};
      const apres = {};
      for (const c of ["joue", "entre", "sort"]) {
        apres[c] = el.classList.contains(c);
        if (apres[c] && !avant[c]) {
          window.__classes.push({ c, id: el.id || el.dataset.tab || el.className, aria: el.getAttribute("aria-hidden") });
          if (c === "sort" && el.classList.contains("sheet-backdrop")) window.__sorties.push({ inert: el.inert, aria: el.getAttribute("aria-hidden"), focus: document.activeElement?.id || document.activeElement?.tagName });
        }
      }
      vus.set(el, apres);
    }
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ["class"] });
  document.addEventListener("pointermove", () => { window.__dernierMouvement = performance.now(); }, true);
});

const navPret = page => page.waitForFunction(() => document.documentElement.hasAttribute("data-nav-pret"));
const transitions = page => page.evaluate(() => window.__vt);
const sansTransition = page => expect(page.locator("html")).not.toHaveAttribute("data-vt", /.+/);
/* Un doigt reste sur la poignée pendant tout le geste ; une souris, elle, ne le suit qu'à de petits pas (sans capture, un saut la ferait sortir de la poignée) : les gestes à la souris ci-dessous avancent de 5 px par pas. */
/* Attend que le doigt soit immobile depuis un instant (la vitesse du lâcher est celle des 80 dernières ms) : un geste « lent » est alors lent pour de bon, quelle que soit la charge de la machine. */
const immobile = page => page.waitForFunction(() => performance.now() - window.__dernierMouvement > 120, null, { polling: 20 });
const centre = async loc => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };

for (const reduit of [false, true]) {
  const mode = reduit ? "mouvement réduit" : "mouvement normal";

  test.describe(mode, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: reduit ? "reduce" : "no-preference" });
      await espionner(page);
    });

    test("navigation : aucune transition au premier affichage ; focus, titre et position justes après chaque navigation", async ({ page }) => {
      await page.goto("/");
      await navPret(page);
      expect(await transitions(page)).toHaveLength(0);
      await expect(page).toHaveTitle("Recettes – Carnet de cuisine");

      const carte = page.locator(`.card[data-id="${QUICHE}"]`);
      await carte.locator(".card-lien").click();
      await expect(page.locator("h1")).toBeFocused();
      await expect(page).toHaveTitle("Quiche lorraine – Carnet de cuisine");
      await sansTransition(page);

      await page.goBack();
      await expect(page).toHaveTitle("Recettes – Carnet de cuisine");
      await expect(page.locator(`.card[data-id="${QUICHE}"]`)).toBeVisible();
      await sansTransition(page);

      const vt = await transitions(page);
      if (reduit) expect(vt).toEqual([]);
      else expect(vt.map(t => t.type)).toEqual(["avant", "arriere"]);
    });

    test("navigation : changer d'onglet joue « onglet », sans photo ; la pastille rejoint l'onglet", async ({ page }) => {
      await page.goto("/");
      await navPret(page);
      await page.locator('.tabbar a[data-tab="courses"]').click();
      await expect(page.locator("h1")).toContainText(/courses/i);
      await sansTransition(page);
      const vt = await transitions(page);
      if (reduit) expect(vt).toEqual([]);
      else {
        expect(vt).toHaveLength(1);
        expect(vt[0].type).toBe("onglet");
        expect(vt[0].avant).toEqual([]);
        expect(vt[0].apres).toEqual([]);
      }
      // La pastille est sous l'onglet actif (au pixel près), dans les deux modes.
      await expect.poll(async () => {
        const [pastille, onglet] = await Promise.all([page.locator(".tab-pill").boundingBox(), page.locator('.tabbar a[data-tab="courses"]').boundingBox()]);
        return Math.abs(pastille.x - onglet.x) + Math.abs(pastille.y - onglet.y) + Math.abs(pastille.width - onglet.width);
      }).toBeLessThan(2);
      await expect(page.locator(".tab-pill")).toHaveAttribute("aria-hidden", "true");
    });

    test("navigation : l'icône de l'onglet qui devient actif joue son geste, jamais au premier affichage ni en mouvement réduit", async ({ page }) => {
      await page.goto("/");
      await navPret(page);
      expect((await page.evaluate(() => window.__classes)).filter(c => c.c === "joue")).toEqual([]);
      await page.locator('.tabbar a[data-tab="menu"]').click();
      await expect(page.locator('.tabbar a[data-tab="menu"]')).toHaveAttribute("aria-current", "page");
      const joue = (await page.evaluate(() => window.__classes)).filter(c => c.c === "joue");
      if (reduit) expect(joue).toEqual([]);
      else {
        expect(joue.map(c => c.id)).toEqual(["menu"]);
        await expect(page.locator('.tabbar a[data-tab="menu"]')).not.toHaveClass(/joue/);
      }
    });

    test("photo partagée : seule la paire de la recette ouverte est nommée, et seulement à l'écran", async ({ page }) => {
      await page.goto("/");
      await navPret(page);
      await page.locator(`.card[data-id="${QUICHE}"] .card-lien`).click();
      await expect(page.locator("h1")).toBeFocused();
      await page.evaluate(() => window.scrollTo(0, 2000));
      await page.goBack();
      await expect(page).toHaveTitle("Recettes – Carnet de cuisine");
      await sansTransition(page);
      const vt = await transitions(page);
      if (reduit) { expect(vt).toEqual([]); return; }
      expect(vt.map(t => t.type)).toEqual(["avant", "arriere"]);
      // À l'aller : la photo de la carte, puis la grande photo de la fiche — la même recette, une photo de chaque côté.
      expect(vt[0].avant.map(e => e.id)).toEqual([QUICHE]);
      expect(vt[0].apres.map(e => e.id)).toEqual([QUICHE]);
      // Au retour, la grande photo était défilée hors de l'écran : pas de photo partagée de ce côté ; la carte, restaurée avant la capture, y est.
      expect(vt[1].avant).toEqual([]);
      expect(vt[1].apres.map(e => e.id)).toEqual([QUICHE]);
    });

    test("photo partagée : une recette présente deux fois au menu, c'est la vignette touchée qui voyage", async ({ page, context }) => {
      await preremplir(context, { carnet: { menu: [entree(QUICHE, { k: "a1" }), entree("cake-sale", { k: "b1" }), entree(QUICHE, { k: "a2" })], repas: REPAS } });
      await page.goto("/#/menu");
      await navPret(page);
      const vignettes = page.locator(`.mc-visual[data-vt-photo="${QUICHE}"]`);
      await expect(vignettes).toHaveCount(2);
      // Leur rang parmi toutes les photos nommables de la page.
      const rangs = await page.evaluate(id => [...document.querySelectorAll("[data-vt-photo]")].map((e, i) => e.dataset.vtPhoto === id ? i : -1).filter(i => i >= 0), QUICHE);
      await vignettes.nth(1).click();
      await expect(page.locator("h1")).toBeFocused();
      const vt = await transitions(page);
      if (reduit) { expect(vt).toEqual([]); return; }
      expect(vt).toHaveLength(1);
      expect(vt[0].type).toBe("avant");
      // Une seule vignette est nommée : la seconde des deux quiches, celle qu'on a touchée.
      expect(vt[0].avant).toHaveLength(1);
      expect(vt[0].avant[0]).toMatchObject({ id: QUICHE, i: rangs[1] });
      expect(vt[0].apres.map(e => e.id)).toEqual([QUICHE]);
    });

    test("mode cuisine : le cercle part du bouton touché (--vt-x / --vt-y) à l'entrée et de la croix à la sortie", async ({ page }) => {
      await page.goto(`/#/recette/${QUICHE}`);
      await navPret(page);
      const bouton = page.locator(".actions .btn.primary");
      const c1 = await centre(bouton);
      await bouton.click();
      await expect(page.locator(".cook")).toBeVisible();
      await sansTransition(page);
      let vt = await transitions(page);
      if (reduit) { expect(vt).toEqual([]); return; }
      expect(vt.map(t => t.type)).toEqual(["cuisine"]);
      expect(Math.abs(parseFloat(vt[0].x) - c1.x)).toBeLessThan(3);
      expect(Math.abs(parseFloat(vt[0].y) - c1.y)).toBeLessThan(3);
      await pageStable(page);
      const croix = page.locator("#cook-close");
      const c2 = await centre(croix);
      await croix.click();
      await expect(page.locator(".actions .btn.primary")).toBeVisible();
      await sansTransition(page);
      vt = await transitions(page);
      expect(vt.map(t => t.type)).toEqual(["cuisine", "cuisine-sortie"]);
      expect(Math.abs(parseFloat(vt[1].x) - c2.x)).toBeLessThan(3);
      expect(Math.abs(parseFloat(vt[1].y) - c2.y)).toBeLessThan(3);
    });

    test("preparerTransition : un cas particulier vaut pour la prochaine navigation seulement", async ({ page }) => {
      await page.goto("/");
      await navPret(page);
      await page.evaluate(async () => (await import("/js/ui/routeur.js")).preparerTransition({ type: "arriere", origine: { x: 12, y: 34 } }));
      await page.locator('.tabbar a[data-tab="menu"]').click();
      await expect(page.locator("h1")).toContainText("Au menu");
      await page.locator('.tabbar a[data-tab="courses"]').click();
      await expect(page.locator("h1")).toContainText(/courses/i);
      const vt = await transitions(page);
      if (reduit) { expect(vt).toEqual([]); return; }
      expect(vt.map(t => t.type)).toEqual(["arriere", "onglet"]);
      expect(vt[0].x).toBe("12px");
      expect(vt[0].y).toBe("34px");
    });

    test("un redessin sur place ne joue aucune transition, et une navigation pendant une transition saute la précédente", async ({ page, context }) => {
      await preremplir(context, { carnet: { menu: [entree(QUICHE, { k: "a1" }), entree("cake-sale", { k: "b1" })], repas: REPAS } });
      const erreurs = [];
      page.on("pageerror", e => erreurs.push(e.message));
      await page.goto("/#/courses");
      await navPret(page);
      await page.locator('input[data-key="lardons"] + .tick').click();
      await expect(page.locator('input[data-key="lardons"]')).toBeChecked();
      expect(await transitions(page)).toEqual([]);

      await page.locator('.tabbar a[data-tab="menu"]').click();
      await page.evaluate(() => history.back());
      await expect(page.locator("h1")).toContainText(/courses/i);
      await sansTransition(page);
      expect(await page.evaluate(() => document.querySelectorAll("#app > *").length)).toBeGreaterThan(0);
      expect(erreurs).toEqual([]);
    });

    test("barre d'onglets : quatre cibles de 44 px au moins, sans débordement à 320 et 375 px", async ({ page }) => {
      for (const largeur of [320, 375]) {
        await page.setViewportSize({ width: largeur, height: 740 });
        await page.goto("/");
        await navPret(page);
        const onglets = await page.locator(".tabbar a").evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [r.width, r.height, r.left, r.right]; }));
        expect(onglets).toHaveLength(4);
        for (const [l, h, g, d] of onglets) { expect(l).toBeGreaterThanOrEqual(44); expect(h).toBeGreaterThanOrEqual(44); expect(g).toBeGreaterThanOrEqual(0); expect(d).toBeLessThanOrEqual(largeur); }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const pastille = await page.locator(".tab-pill").boundingBox();
        expect(pastille.x + pastille.width).toBeLessThanOrEqual(largeur);
      }
    });

    test("badges : le chiffre roule et la pastille saute quand le nombre change, rien au premier affichage ; une seule valeur lisible", async ({ page, context }) => {
      await preremplir(context, { carnet: { menu: [entree(QUICHE, { k: "a1" }), entree("cake-sale", { k: "b1" })], repas: REPAS } });
      await page.goto("/#/menu");
      await navPret(page);
      const badge = page.locator("#menu-badge");
      await expect(badge).toHaveText("2");
      expect(await page.evaluate(() => window.__sauts)).toEqual([]);
      expect((await page.evaluate(() => window.__classes)).filter(c => c.c === "entre" || c.c === "sort")).toEqual([]);

      await page.locator("[data-remove]").first().click();
      // Dès le geste, la valeur entière est dans le texte, une seule fois ; à la fin, plus de chiffres dessinés.
      await expect(badge).toHaveText("1");
      expect(await badge.evaluate(e => e.textContent)).toBe("1");
      await expect(badge.locator(".rouler")).toHaveCount(0);
      const sauts = await page.evaluate(() => window.__sauts);
      if (reduit) expect(sauts).toEqual([]);
      else expect(sauts).toContain("menu-badge");

      // De 1 à 0 : la pastille s'en va (cachée des lecteurs dès le début), puis est retirée.
      await page.locator("[data-remove]").first().click();
      await expect(badge).toBeHidden();
      const sortie = (await page.evaluate(() => window.__classes)).filter(c => c.c === "sort" && c.id === "menu-badge");
      if (reduit) expect(sortie).toEqual([]);
      else expect(sortie).toEqual([{ c: "sort", id: "menu-badge", aria: "true" }]);

      // De 0 à 1 (annuler) : elle apparaît, lisible.
      await page.locator("#toast").getByRole("button", { name: "Annuler" }).click();
      await expect(badge).toHaveText("1");
      await expect(badge).not.toHaveAttribute("aria-hidden", /.+/);
      const entree1 = (await page.evaluate(() => window.__classes)).filter(c => c.c === "entre" && c.id === "menu-badge");
      expect(entree1.length).toBe(reduit ? 0 : 1);
    });

    test("feuille : glisser la poignée vers le bas la ferme — historique juste, focus rendu, retirée de l'arbre dès le début", async ({ page }) => {
      await page.goto("/");
      await navPret(page);
      const index = () => page.evaluate(() => navigation.currentEntry.index);
      const avant = await index();
      await page.locator("#jai-ouvrir").click();
      const feuille = page.locator(".sheet-backdrop .sheet");
      await expect(feuille).toBeVisible();
      expect(await index()).toBe(avant + 1);
      await pageStable(page);

      // Un geste court : la feuille revient, rien ne se ferme.
      let c = await centre(page.locator(".sheet-grip"));
      await page.mouse.move(c.x, c.y);
      await page.mouse.down();
      await page.mouse.move(c.x, c.y + 40, { steps: 8 });
      await expect(feuille).toHaveCSS("translate", /^0px (2[5-9]|3\d|40)(\.\d+)?px$/);
      await immobile(page);
      await page.mouse.up();
      await expect(page.locator(".sheet-backdrop")).toHaveCount(1);
      await expect.poll(() => feuille.evaluate(e => getComputedStyle(e).translate)).toMatch(/^(none|0px( 0px)?)$/);
      expect(await index()).toBe(avant + 1);

      // Depuis le contenu (le titre), un glissé ne ferme rien : le contenu garde son défilement.
      c = await centre(page.locator(".sheet h3"));
      await page.mouse.move(c.x, c.y);
      await page.mouse.down();
      await page.mouse.move(c.x, c.y + 220, { steps: 6 });
      await page.mouse.up();
      await expect(page.locator(".sheet-backdrop")).toHaveCount(1);

      // Un grand geste ferme : une seule entrée dépile, le focus revient au bouton.
      c = await centre(page.locator(".sheet-grip"));
      await page.mouse.move(c.x, c.y);
      await page.mouse.down();
      await page.mouse.move(c.x, c.y + 240, { steps: 48 });
      await page.mouse.up();
      await expect(page.locator(".sheet-backdrop")).toHaveCount(0);
      expect(await index()).toBe(avant);
      await expect(page.locator("#jai-ouvrir")).toBeFocused();
      // Dès le début de la sortie (animée ou non) : inerte, cachée des lecteurs d'écran, focus déjà rendu.
      expect(await page.evaluate(() => window.__sorties)).toEqual([{ inert: true, aria: "true", focus: "jai-ouvrir" }]);
      await expect(page).toHaveURL(/\/#?\/?$/);
    });

    test("feuille : Échap et le fond ferment par le retour, avec la même sortie", async ({ page }) => {
      await page.goto("/");
      await navPret(page);
      const index = () => page.evaluate(() => navigation.currentEntry.index);
      const avant = await index();
      await page.locator("#jai-ouvrir").click();
      await expect(page.locator(".sheet-backdrop")).toHaveCount(1);
      await page.keyboard.press("Escape");
      await expect(page.locator(".sheet-backdrop")).toHaveCount(0);
      expect(await index()).toBe(avant);
      await page.locator("#jai-ouvrir").click();
      await page.locator(".sheet-backdrop").click({ position: { x: 5, y: 5 } });
      await expect(page.locator(".sheet-backdrop")).toHaveCount(0);
      expect(await index()).toBe(avant);
      await expect(page.locator("#jai-ouvrir")).toBeFocused();
    });

    test("message : un trait montre le temps qui reste, il se fige au survol ; écarté du doigt (côté ou bas), il part sans défaire l'action", async ({ page, context }) => {
      await preremplir(context, { carnet: { menu: [entree(QUICHE, { k: "a1" }), entree("cake-sale", { k: "b1" }), entree("tartines-figues-chevre-miel", { k: "c1" })], repas: REPAS } });
      await page.goto("/#/menu");
      await navPret(page);
      const toast = page.locator("#toast");
      const etatTrait = () => page.evaluate(() => document.querySelector("#toast .toast-temps")?.getAnimations().map(a => a.playState)[0] ?? null);

      await page.locator("[data-remove]").first().click();
      await expect(toast).toHaveClass(/visible/);
      await expect(toast.locator(".toast-temps")).toHaveAttribute("aria-hidden", "true");
      if (reduit) expect(await etatTrait()).toBeNull();
      else {
        expect(await etatTrait()).toBe("running");
        const c = await centre(toast.locator(".toast-msg"));
        await page.mouse.move(c.x, c.y);
        await expect.poll(etatTrait).toBe("paused");
        await page.mouse.move(c.x, 20);
        await expect.poll(etatTrait).toBe("running");
      }

      // Écarté vers la droite : il part, l'entrée retirée ne revient pas.
      let c = await centre(toast.locator(".toast-msg"));
      await page.mouse.move(c.x, c.y);
      await page.mouse.down();
      await page.mouse.move(c.x + 150, c.y, { steps: 6 });
      await page.mouse.up();
      await expect(toast).not.toHaveClass(/visible/);
      await expect(page.locator(".menu-card")).toHaveCount(2);

      // Vers le bas aussi.
      await page.locator("[data-remove]").first().click();
      await expect(toast).toHaveClass(/visible/);
      c = await centre(toast.locator(".toast-msg"));
      await page.mouse.move(c.x, c.y);
      await page.mouse.down();
      await page.mouse.move(c.x, c.y + 90, { steps: 6 });
      await page.mouse.up();
      await expect(toast).not.toHaveClass(/visible/);
      await expect(toast.getByRole("button", { name: "Annuler" })).toHaveCount(0);
      await expect(page.locator(".menu-card")).toHaveCount(1);
    });

    test("message : un geste trop court le laisse en place ; la voix, le bouton Annuler et Échap marchent comme avant", async ({ page, context }) => {
      await preremplir(context, { carnet: { menu: [entree(QUICHE, { k: "a1" }), entree("cake-sale", { k: "b1" })], repas: REPAS } });
      await page.goto("/#/menu");
      await navPret(page);
      const toast = page.locator("#toast");
      await page.locator("[data-remove]").first().click();
      await expect(toast).toHaveClass(/visible/);
      await expect(page.locator("#annonces")).toContainText(/retiré/i);
      const c = await centre(toast.locator(".toast-msg"));
      await page.mouse.move(c.x, c.y);
      await page.mouse.down();
      await page.mouse.move(c.x + 20, c.y, { steps: 3 });
      await immobile(page);
      await page.mouse.up();
      await expect(toast).toHaveClass(/visible/);
      await expect.poll(() => toast.evaluate(e => getComputedStyle(e).translate)).toMatch(/^(none|0px( 0px)?)$/);
      await toast.getByRole("button", { name: "Annuler" }).click();
      await expect(page.locator(".menu-card")).toHaveCount(2);
      await expect(toast).not.toHaveClass(/visible/);
    });

    test("focus clavier : l'anneau se resserre (outline-offset seul) sans remplacer l'animation propre de l'élément ; rien en mouvement réduit", async ({ page }) => {
      await page.goto("/");
      await navPret(page);
      // Un bouton qui a déjà sa propre animation CSS : le focus ne doit pas la remplacer.
      await page.evaluate(() => {
        const st = document.createElement("style");
        st.textContent = "@keyframes propre { to { opacity: 0.99; } } #bouton-test { animation: propre 5s linear infinite; }";
        const b = document.createElement("button");
        b.id = "bouton-test";
        b.textContent = "Test";
        document.head.append(st);
        document.body.prepend(b);
      });
      // L'anneau ne dure que 160 ms : sur une machine chargée, il pourrait être fini avant
      // qu'on le lise. On ralentit le temps des animations de la page (CDP), pas l'appli.
      // (En mouvement réduit, rien à rattraper : on laisse le temps tel quel, sinon les
      // animations ramenées à 0,01 ms vivraient assez pour être comptées.)
      if (!reduit) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Animation.enable");
        await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.05 });
      }
      // Un focus venu du clavier (:focus-visible) : Tab d'abord, puis le bouton reçoit le focus.
      await page.keyboard.press("Tab");
      await page.locator("#bouton-test").focus();
      await expect(page.locator("#bouton-test")).toBeFocused();
      const anims = await page.locator("#bouton-test").evaluate(e => e.getAnimations().map(a => ({
        css: a instanceof CSSAnimation ? a.animationName : null,
        proprietes: a.effect.getKeyframes().flatMap(k => Object.keys(k).filter(n => !["offset", "easing", "composite", "computedOffset"].includes(n)))
      })));
      // En mouvement réduit, la règle générale coupe toute animation CSS : la sienne n'existe plus.
      expect(anims.some(a => a.css === "propre")).toBe(!reduit);
      expect(anims.some(a => a.css === "anneau")).toBe(false);
      expect(anims.some(a => a.proprietes.includes("outlineOffset"))).toBe(!reduit);
    });

    test("message : sur la fiche, il se pose au-dessus de la barre d'actions, sans la recouvrir", async ({ page }) => {
      await page.goto(`/#/recette/${QUICHE}`);
      await navPret(page);
      await page.evaluate(async () => (await import("/js/ui/toast.js")).toast("Ajouté au menu"));
      const toast = page.locator("#toast");
      await expect(toast).toHaveClass(/visible/);
      await pageStable(page);
      const [t, a] = await Promise.all([toast.boundingBox(), page.locator(".actions").boundingBox()]);
      expect(t.y + t.height).toBeLessThanOrEqual(a.y);
    });
  });
}

test("barre d'onglets : papier calque, avec la teinte du thème, clair et sombre", async ({ page }) => {
  await espionner(page);
  const fonds = {};
  for (const schema of ["light", "dark"]) {
    await page.emulateMedia({ colorScheme: schema });
    await page.goto("/");
    await navPret(page);
    fonds[schema] = await page.locator(".tabbar").evaluate(e => getComputedStyle(e).backgroundColor);
    // Translucide (un alpha dans la couleur) quand le navigateur sait flouter, opaque sinon.
    const flou = await page.evaluate(() => CSS.supports("backdrop-filter", "blur(1px)") || CSS.supports("-webkit-backdrop-filter", "blur(1px)"));
    if (flou) expect(fonds[schema]).toMatch(/\/|rgba/);
    // Pas de fond codé en dur qui trahirait l'autre thème : la pastille et le texte lisent les jetons.
    const pastille = await page.locator(".tab-pill").evaluate(e => getComputedStyle(e).backgroundColor);
    const tint = await page.evaluate(() => { const s = document.createElement("i"); s.style.color = "var(--green-tint)"; document.body.append(s); const c = getComputedStyle(s).color; s.remove(); return c; });
    expect(pastille).toBe(tint);
  }
  expect(fonds.dark).not.toBe(fonds.light);
});

test("toasts et feuilles, mouvement réduit : rien ne glisse, tout part tout de suite", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await espionner(page);
  await page.goto("/");
  await navPret(page);
  await page.locator("#jai-ouvrir").click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".sheet-backdrop")).toHaveCount(0);
  // Retirée tout de suite : aucune sortie ne dure, aucun trait ne se vide.
  expect(await page.evaluate(() => document.querySelectorAll(".sheet-backdrop").length)).toBe(0);
  await page.evaluate(async () => (await import("/js/ui/toast.js")).toast("Bonjour", { action: "Annuler", surAction() {} }));
  await expect(page.locator("#toast")).toHaveClass(/visible/);
  expect(await page.evaluate(() => document.querySelector("#toast .toast-temps")?.getAnimations().length ?? 0)).toBe(0);
});
