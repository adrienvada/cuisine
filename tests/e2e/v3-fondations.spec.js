/* Lot « fondations » de la vague 3 : les aides du mouvement (js/ui/mouvement.js,
   js/ui/geste.js, js/ui/effets.js) et le retour d'appui global, éprouvés sur l'appli
   chargée. Les modules s'importent par import() depuis la page, comme le fera chaque
   lot qui s'en sert ; le DOM de test est posé dans un bac fixe. */

import { test, expect, pageStable } from "./outils.js";

const MOUVEMENT = "/js/ui/mouvement.js";
const GESTE = "/js/ui/geste.js";
const EFFETS = "/js/ui/effets.js";

async function ouvrir(page, { reduit = false } = {}) {
  await page.emulateMedia({ reducedMotion: reduit ? "reduce" : "no-preference" });
  await page.goto("/");
  await pageStable(page);
}

/* Un bac fixe, hors de l'appli, pour y poser ce que le test anime. */
async function bac(page, contenu) {
  await page.evaluate(html => {
    document.getElementById("bac")?.remove();
    const b = document.createElement("div");
    b.id = "bac";
    b.style.cssText = "position:fixed;top:120px;left:20px;width:340px;z-index:10;background:#fff";
    b.innerHTML = html;
    document.body.append(b);
  }, contenu);
}

/* ---------- mouvementReduit ---------- */

test("mouvementReduit() suit la préférence, même quand elle change en cours d'usage", async ({ page }) => {
  await ouvrir(page);
  const lire = () => page.evaluate(async src => (await import(src)).mouvementReduit(), MOUVEMENT);
  expect(await lire()).toBe(false);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await lire()).toBe(true);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  expect(await lire()).toBe(false);
});

/* ---------- animer ---------- */

test("animer : en mouvement réduit, rien n'est animé et l'état final s'applique, tout de suite", async ({ page }) => {
  await ouvrir(page, { reduit: true });
  await bac(page, '<div id="x" style="opacity:0">x</div>');
  const r = await page.evaluate(async src => {
    const { animer } = await import(src);
    const el = document.getElementById("x");
    // Le filet CSS laisse des transitions de 0,01 ms : seules les animations WAAPI comptent.
    const t0 = performance.now();
    const ok = await animer(el, [{ opacity: 0 }, { opacity: 1 }], { duree: 2000, garder: true });
    return { ok, ms: performance.now() - t0, anims: el.getAnimations().filter(a => a.constructor.name === "Animation").length, opacite: el.style.opacity };
  }, MOUVEMENT);
  expect(r).toMatchObject({ ok: true, anims: 0, opacite: "1" });
  expect(r.ms).toBeLessThan(500);
});

test("animer : sans garder, le style normal reprend à la fin, rien n'est figé", async ({ page }) => {
  await ouvrir(page);
  await bac(page, '<div id="x">x</div>');
  const r = await page.evaluate(async src => {
    const { animer } = await import(src);
    const el = document.getElementById("x");
    const ok = await animer(el, [{ opacity: 0, translate: "0 20px" }], { duree: 80 });
    return { ok, anims: el.getAnimations().length, style: el.getAttribute("style"), opacite: getComputedStyle(el).opacity };
  }, MOUVEMENT);
  expect(r).toEqual({ ok: true, anims: 0, style: null, opacite: "1" });
});

test("animer : avec garder, l'état final est écrit dans le style et aucune animation ne reste", async ({ page }) => {
  await ouvrir(page);
  await bac(page, '<div id="x" style="opacity:0">x</div>');
  const r = await page.evaluate(async src => {
    const { animer } = await import(src);
    const el = document.getElementById("x");
    await animer(el, [{ opacity: 0 }, { opacity: 1 }], { duree: 60, garder: true });
    return { anims: el.getAnimations().length, opacite: el.style.opacity };
  }, MOUVEMENT);
  expect(r).toEqual({ anims: 0, opacite: "1" });
});

test("animer : une animation de même clé remplace la précédente en repartant de l'état visible", async ({ page }) => {
  await ouvrir(page);
  await bac(page, '<div id="x">x</div>');
  const r = await page.evaluate(async src => {
    const { animer } = await import(src);
    const el = document.getElementById("x");
    const premiere = animer(el, [{ translate: "0 0" }, { translate: "200px 0" }], { duree: 4000, easing: "linear", cle: "k" });
    const a = el.getAnimations()[0];
    a.pause();
    a.currentTime = 2000;   // à mi-chemin : 100 px
    const visible = parseFloat(getComputedStyle(el).translate);
    const seconde = animer(el, [{ translate: "0 0" }, { translate: "300px 0" }], { duree: 4000, cle: "k" });
    const b = el.getAnimations();
    const depart = parseFloat(b[0].effect.getKeyframes()[0].translate);
    return { visible, depart, nombre: b.length, premiere: await premiere, seconde: await Promise.race([seconde, Promise.resolve("en cours")]) };
  }, MOUVEMENT);
  expect(r.visible).toBeCloseTo(100, 0);
  expect(r.depart).toBeCloseTo(r.visible, 0);
  expect(r.nombre).toBe(1);
  expect(r.premiere).toBe(false);   // interrompue, sans rejet
  expect(r.seconde).toBe("en cours");
});

test("animer : une animation annulée de l'extérieur ne fait jamais rejeter la promesse", async ({ page }) => {
  await ouvrir(page);
  await bac(page, '<div id="x">x</div>');
  const ok = await page.evaluate(async src => {
    const { animer } = await import(src);
    const el = document.getElementById("x");
    const p = animer(el, [{ opacity: 0 }, { opacity: 1 }], { duree: 3000 });
    el.getAnimations().forEach(a => a.cancel());
    return p;
  }, MOUVEMENT);
  expect(ok).toBe(false);
});

/* ---------- flip ---------- */

/* Les animations pilotées par le défilement (l'arrivée des cartes de l'accueil, vague 3 « accueil ») durent tant que la page existe : elles ne sont pas des animations « en cours ». */
test("flip : les éléments partent de leur ancienne place et finissent à la nouvelle, sans transform résiduel", async ({ page }) => {
  await ouvrir(page);
  await bac(page, '<div id="l">' + ["A", "B", "C", "D"].map(c => `<div class="r" style="height:40px;margin-bottom:6px;background:#eee">${c}</div>`).join("") + "</div>");
  const r = await page.evaluate(async src => {
    const { flip } = await import(src);
    const l = document.getElementById("l");
    const haut = el => Math.round(el.getBoundingClientRect().top);
    const [a] = l.children;
    const avant = haut(a);
    const fini = flip(l, () => l.append(a));   // A passe en dernier
    const pendant = haut(a);                   // juste après : encore à sa place d'origine
    const enCours = a.getAnimations().length;
    await fini;
    return { avant, pendant, enCours, apres: haut(a), attendu: haut(l.children[3]), anims: document.getAnimations().filter(a => !(a.timeline instanceof ViewTimeline)).length, style: a.getAttribute("style"), transform: getComputedStyle(a).transform };
  }, MOUVEMENT);
  expect(r.pendant).toBe(r.avant);
  expect(r.enCours).toBe(1);
  expect(r.apres).toBe(r.attendu);
  expect(r.apres).toBeGreaterThan(r.avant + 100);
  expect(r).toMatchObject({ anims: 0, style: "height:40px;margin-bottom:6px;background:#eee", transform: "none" });
});

test("flip : un élément qui arrive est animé, et en mouvement réduit tout est immédiat", async ({ page }) => {
  await ouvrir(page);
  await bac(page, '<div id="l"><div class="r" style="height:30px">A</div></div>');
  const arrive = await page.evaluate(async src => {
    const { flip } = await import(src);
    const l = document.getElementById("l");
    const p = flip(l, () => { const n = document.createElement("div"); n.id = "nouveau"; n.style.height = "30px"; l.prepend(n); });
    const o = getComputedStyle(document.getElementById("nouveau")).opacity;
    await p;
    return { debut: +o, fin: getComputedStyle(document.getElementById("nouveau")).opacity };
  }, MOUVEMENT);
  expect(arrive.debut).toBeLessThan(1);
  expect(arrive.fin).toBe("1");

  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduit = await page.evaluate(async src => {
    const { flip } = await import(src);
    const l = document.getElementById("l");
    await flip(l, () => l.append(l.firstElementChild));
    return document.getAnimations().filter(a => !(a.timeline instanceof ViewTimeline)).length;
  }, MOUVEMENT);
  expect(reduit).toBe(0);
});

/* ---------- sortir ---------- */

test("sortir : inert et aria-hidden dès le début, hors de l'arbre d'accessibilité, retiré à la fin", async ({ page }) => {
  await ouvrir(page);
  await bac(page, '<div id="l"><div id="ligne" style="height:44px"><button>Retirer moi</button></div><div style="height:44px"><button>Rester</button></div></div>');
  await expect(page.getByRole("button", { name: "Retirer moi" })).toHaveCount(1);
  const debut = await page.evaluate(async src => {
    const { sortir } = await import(src);
    const el = document.getElementById("ligne");
    window.__fin = sortir(el);
    return { inert: el.inert, aria: el.getAttribute("aria-hidden"), present: el.isConnected };
  }, MOUVEMENT);
  expect(debut).toEqual({ inert: true, aria: "true", present: true });
  await expect(page.getByRole("button", { name: "Retirer moi" })).toHaveCount(0);   // déjà hors de l'arbre
  await expect(page.getByRole("button", { name: "Rester" })).toHaveCount(1);
  expect(await page.evaluate(() => window.__fin)).toBe(true);
  expect(await page.evaluate(() => !!document.getElementById("ligne"))).toBe(false);
});

test("sortir : rappelée, rend la même sortie ; en mouvement réduit, retire tout de suite", async ({ page }) => {
  await ouvrir(page, { reduit: true });
  await bac(page, '<div id="ligne" style="height:44px">x</div>');
  const r = await page.evaluate(async src => {
    const { sortir } = await import(src);
    const el = document.getElementById("ligne");
    const p = sortir(el);
    return { memeSortie: sortir(el) === p, retire: !el.isConnected, anims: document.getAnimations().length };
  }, MOUVEMENT);
  expect(r).toEqual({ memeSortie: true, retire: true, anims: 0 });
});

/* ---------- rebondir, secouer ---------- */

test("rebondir et secouer : jouent puis rendent l'élément intact ; rien en mouvement réduit", async ({ page }) => {
  await ouvrir(page);
  await bac(page, '<div id="x" style="width:40px;height:40px">x</div>');
  const r = await page.evaluate(async src => {
    const { rebondir, secouer } = await import(src);
    const el = document.getElementById("x");
    const a = rebondir(el);
    const jouees = el.getAnimations().length;
    await a;
    await secouer(el);
    return { jouees, anims: el.getAnimations().length, style: el.getAttribute("style") };
  }, MOUVEMENT);
  expect(r).toEqual({ jouees: 1, anims: 0, style: "width:40px;height:40px" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduit = await page.evaluate(async src => {
    const { rebondir, secouer } = await import(src);
    const el = document.getElementById("x");
    rebondir(el); secouer(el);
    return el.getAnimations().length;
  }, MOUVEMENT);
  expect(reduit).toBe(0);
});

/* ---------- rouler ---------- */

test("rouler : une seule valeur lisible pendant et après, des chiffres cachés aux lecteurs, largeur stable", async ({ page }) => {
  await ouvrir(page);
  await bac(page, '<span id="n" style="font-size:40px">8</span>');
  const r = await page.evaluate(async src => {
    const { rouler } = await import(src);
    const el = document.getElementById("n");
    const largeur = () => el.getBoundingClientRect().width;
    const l0 = largeur();
    const fini = rouler(el, 9);
    const pendant = {
      texte: el.textContent,
      cache: !!el.querySelector('[aria-hidden="true"]'),
      lisible: el.querySelector(".r-vrai")?.textContent,
      largeur: largeur(),
      anims: document.getAnimations().length
    };
    await fini;
    return { l0, pendant, texte: el.textContent, enfants: el.childElementCount, lFin: largeur() };
  }, MOUVEMENT);
  expect(r.pendant).toMatchObject({ texte: "9", cache: true, lisible: "9" });
  expect(r.pendant.anims).toBeGreaterThan(0);
  expect(Math.abs(r.pendant.largeur - r.l0)).toBeLessThan(1);
  expect(r).toMatchObject({ texte: "9", enfants: 0 });
  expect(Math.abs(r.lFin - r.l0)).toBeLessThan(1);
});

test("rouler : 9 → 10 et un nouvel appel en cours de route finissent sur la bonne valeur", async ({ page }) => {
  await ouvrir(page);
  await bac(page, '<span id="n">9</span>');
  const r = await page.evaluate(async src => {
    const { rouler } = await import(src);
    const el = document.getElementById("n");
    rouler(el, 10);
    const pendant = el.textContent;
    const dernier = rouler(el, 11);
    await dernier;
    return { pendant, texte: el.textContent, enfants: el.childElementCount };
  }, MOUVEMENT);
  expect(r).toEqual({ pendant: "10", texte: "11", enfants: 0 });
});

test("rouler : en mouvement réduit, le texte change simplement", async ({ page }) => {
  await ouvrir(page, { reduit: true });
  await bac(page, '<span id="n">8</span>');
  const r = await page.evaluate(async src => {
    const { rouler } = await import(src);
    const el = document.getElementById("n");
    await rouler(el, 3);
    return { texte: el.textContent, enfants: el.childElementCount, anims: document.getAnimations().length };
  }, MOUVEMENT);
  expect(r).toEqual({ texte: "3", enfants: 0, anims: 0 });
});

/* ---------- tracer ---------- */

const SVG = '<svg id="s" viewBox="0 0 100 20" width="200" height="40" fill="none" stroke="#000" stroke-width="3"><path pathLength="1" d="M5 10 H95"/><path pathLength="1" d="M5 15 H60"/></svg>';

test("tracer : chaque forme se trace à l'encre, puis reste entière ; rejouable", async ({ page }) => {
  await ouvrir(page);
  await bac(page, SVG);
  const r = await page.evaluate(async src => {
    const { tracer } = await import(src);
    const s = document.getElementById("s");
    const p = tracer(s);
    const traits = s.getAnimations({ subtree: true }).filter(a => a.animationName === "trace").length;
    const debut = getComputedStyle(s.querySelector("path")).strokeDashoffset;
    await p;
    const fin = getComputedStyle(s.querySelector("path")).strokeDashoffset;
    const p2 = tracer(s);
    const rejoue = s.getAnimations({ subtree: true }).filter(a => a.animationName === "trace" && a.playState === "running").length;
    await p2;
    return { traits, debut, fin, rejoue };
  }, MOUVEMENT);
  expect(r.traits).toBe(2);
  expect(parseFloat(r.debut)).toBeGreaterThan(0.2);
  expect(parseFloat(r.fin)).toBe(0);
  expect(r.rejoue).toBe(2);
});

test("tracer : en mouvement réduit le trait est simplement là", async ({ page }) => {
  await ouvrir(page, { reduit: true });
  await bac(page, SVG);
  const r = await page.evaluate(async src => {
    const { tracer } = await import(src);
    const s = document.getElementById("s");
    await tracer(s);
    return { anims: s.getAnimations({ subtree: true }).length, decalage: getComputedStyle(s.querySelector("path")).strokeDashoffset, classe: s.classList.contains("trace") };
  }, MOUVEMENT);
  expect(r).toEqual({ anims: 0, decalage: "0px", classe: true });
});

test("tracer : une classe .trace posée au rendu trace sans JavaScript", async ({ page }) => {
  await ouvrir(page);
  await bac(page, SVG.replace('id="s"', 'id="s" class="trace"'));
  const n = await page.evaluate(() => document.getElementById("s").getAnimations({ subtree: true }).filter(a => a.animationName === "trace").length);
  expect(n).toBe(2);
});

/* ---------- effets ---------- */

test("feuilles : une seule couche aria-hidden et sans pointer-events, 12 à 20 feuilles, ≤ 1,2 s, nettoyée à la fin ; deux appels ne doublent pas", async ({ page }) => {
  await ouvrir(page);
  await bac(page, '<button id="b" style="margin:200px 100px">Fini</button>');
  const r = await page.evaluate(async src => {
    const { feuilles } = await import(src);
    const p1 = feuilles(document.getElementById("b"));
    const p2 = feuilles(document.getElementById("b"));
    const couches = [...document.querySelectorAll("body > div[aria-hidden='true']")].filter(d => d.querySelector("svg"));
    const c = couches[0];
    const cs = getComputedStyle(c);
    const durees = c.getAnimations({ subtree: true }).map(a => a.effect.getTiming().duration);
    const info = { memePromesse: p1 === p2, couches: couches.length, feuilles: c.querySelectorAll("svg").length, position: cs.position, pointer: cs.pointerEvents, max: Math.max(...durees) };
    const t0 = performance.now();
    await p1;
    return { ...info, ms: performance.now() - t0, reste: [...document.querySelectorAll("body > div[aria-hidden='true']")].filter(d => d.querySelector("svg")).length };
  }, EFFETS);
  expect(r).toMatchObject({ memePromesse: true, couches: 1, position: "fixed", pointer: "none", reste: 0 });
  expect(r.feuilles).toBeGreaterThanOrEqual(12);
  expect(r.feuilles).toBeLessThanOrEqual(20);
  expect(r.max).toBeLessThanOrEqual(1200);
});

test("feuilles : rien en mouvement réduit, rien pendant une saisie", async ({ page }) => {
  await ouvrir(page, { reduit: true });
  await bac(page, '<button id="b">Fini</button><input id="champ" type="text">');
  const reduit = await page.evaluate(async src => {
    const { feuilles } = await import(src);
    const ok = await feuilles(document.getElementById("b"));
    return { ok, couches: document.querySelectorAll("body > div[aria-hidden='true'] svg").length };
  }, EFFETS);
  expect(reduit).toEqual({ ok: false, couches: 0 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator("#champ").focus();
  const saisie = await page.evaluate(async src => {
    const { feuilles } = await import(src);
    const ok = await feuilles(document.getElementById("b"));
    return { ok, couches: document.querySelectorAll("body > div[aria-hidden='true'] svg").length };
  }, EFFETS);
  expect(saisie).toEqual({ ok: false, couches: 0 });
});

test("feuilles : les trajectoires sont calculées d'avance (aucun requestAnimationFrame)", async ({ page }) => {
  await ouvrir(page);
  await bac(page, '<button id="b">Fini</button>');
  const r = await page.evaluate(async src => {
    let appels = 0;
    const raf = window.requestAnimationFrame;
    window.requestAnimationFrame = f => { appels++; return raf(f); };
    const { feuilles } = await import(src);
    await feuilles(document.getElementById("b"));
    window.requestAnimationFrame = raf;
    return appels;
  }, EFFETS);
  expect(r).toBe(0);
});

test("envoler : un clone aria-hidden rejoint la cible, qui rebondit, puis il est retiré", async ({ page }) => {
  await ouvrir(page);
  await bac(page, '<div id="src" style="width:60px;height:60px;background:#C1913F">v</div><div id="cib" style="margin-top:300px;width:60px;height:30px;background:#A0532A">cible</div>');
  const r = await page.evaluate(async src => {
    const { envoler } = await import(src);
    const p = envoler(document.getElementById("src"), document.getElementById("cib"));
    const volants = [...document.body.children].filter(e => e.style.position === "fixed" && e.getAttribute("aria-hidden") === "true" && e.id !== "bac");
    const v = volants[0];
    const info = { nombre: volants.length, pointer: v && v.style.pointerEvents };
    const ok = await p;
    return { ...info, ok, reste: [...document.body.children].filter(e => e.style.zIndex === "300").length, rebond: document.getElementById("cib").getAnimations().length };
  }, EFFETS);
  expect(r).toMatchObject({ nombre: 1, pointer: "none", ok: true, reste: 0 });
  expect(r.rebond).toBeGreaterThan(0);
});

test("envoler : en mouvement réduit, aucun clone", async ({ page }) => {
  await ouvrir(page, { reduit: true });
  await bac(page, '<div id="src" style="width:60px;height:60px">v</div><div id="cib" style="width:60px;height:30px">cible</div>');
  const r = await page.evaluate(async src => {
    const { envoler } = await import(src);
    const ok = await envoler(document.getElementById("src"), document.getElementById("cib"));
    return { ok, volants: [...document.body.children].filter(e => e.style.zIndex === "300").length, anims: document.getAnimations().length };
  }, EFFETS);
  expect(r).toEqual({ ok: true, volants: 0, anims: 0 });
});

test("tampon : il reste visible et incliné, en mouvement ou non", async ({ page }) => {
  for (const reduit of [false, true]) {
    await ouvrir(page, { reduit });
    await bac(page, '<span id="t" style="display:inline-block;opacity:0">Tout est dans le panier</span>');
    const r = await page.evaluate(async src => {
      const { tampon } = await import(src);
      const el = document.getElementById("t");
      const p = tampon(el, { angle: -6 });
      await p;
      await Promise.all(el.getAnimations().map(a => a.finished.catch(() => {})));
      return { opacite: getComputedStyle(el).opacity, rotation: getComputedStyle(el).rotate, anims: el.getAnimations().length };
    }, EFFETS);
    expect(r).toEqual({ opacite: "1", rotation: "-6deg", anims: 0 });
  }
});

/* ---------- vibrer ---------- */

test("vibrer : ne lève jamais (vibrate absent, présent, qui refuse ou qui lève) et respecte la préférence", async ({ page }) => {
  await ouvrir(page);
  const r = await page.evaluate(async src => {
    const { vibrer, vibrationsActives, reglerVibrations } = await import(src);
    const sortie = {};
    const appels = [];
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: m => { appels.push(m); return true; } });
    sortie.present = vibrer("succes");
    sortie.motifs = appels.length;
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: () => false });
    sortie.refuse = vibrer("tic");
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: () => { throw new Error("non"); } });
    sortie.leve = vibrer("alerte");
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: undefined });
    sortie.absent = typeof vibrer("tic");
    sortie.inconnu = typeof vibrer("nimportequoi");
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: m => { appels.push(m); return true; } });
    reglerVibrations(false);
    const n = appels.length;
    sortie.coupe = vibrer("tic");
    sortie.rienEnvoye = appels.length === n;
    sortie.cle = localStorage.getItem("vibrations");
    sortie.actives = vibrationsActives();
    reglerVibrations(true);
    sortie.reactive = vibrationsActives() && vibrer("tic");
    sortie.cleRetiree = localStorage.getItem("vibrations");
    return sortie;
  }, GESTE);
  expect(r).toMatchObject({ present: true, motifs: 1, refuse: true, leve: false, absent: "boolean", inconnu: "boolean", coupe: false, rienEnvoye: true, cle: "0", actives: false, reactive: true, cleRetiree: null });
});

test("vibrer : rien quand la page est cachée", async ({ page }) => {
  await ouvrir(page);
  const r = await page.evaluate(async src => {
    const { vibrer } = await import(src);
    let appels = 0;
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: () => { appels++; return true; } });
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    const ok = vibrer("tic");
    delete document.visibilityState;
    return { ok, appels };
  }, GESTE);
  expect(r).toEqual({ ok: false, appels: 0 });
});

test("vibrer : l'astuce de l'interrupteur (sans vibrate) est invisible, hors de l'arbre d'accessibilité, et ses événements ne remontent à aucun écouteur de la page", async ({ page }) => {
  await ouvrir(page);
  const r = await page.evaluate(async src => {
    const { vibrer } = await import(src);
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: undefined });
    const vus = [];
    for (const type of ["click", "input", "change"]) {
      document.addEventListener(type, () => vus.push(type));
      document.body.addEventListener(type, () => vus.push("body-" + type));
      window.addEventListener(type, () => vus.push("fenetre-" + type));
    }
    const ok = vibrer("tic");
    const label = document.querySelector("label[aria-hidden='true'] input[type=checkbox][switch]")?.parentElement;
    return {
      ok, vus,
      present: !!label,
      dansBody: !!label && document.body.contains(label),
      affiche: !!label && getComputedStyle(label).display !== "none",
      bascule: label?.querySelector("input").checked
    };
  }, GESTE);
  expect(r).toMatchObject({ ok: true, vus: [], present: true, dansBody: false, affiche: false, bascule: true });
});

/* ---------- glisser, relacher ---------- */

const GLISSEUR = '<div id="g" style="touch-action:none;width:200px;height:80px;background:#ddd">tirer</div>';

async function brancher(page, options = "{}") {
  await page.evaluate(async ([src, opts]) => {
    const { glisser } = await import(src);
    const g = document.getElementById("g");
    window.__j = { debut: 0, deplacements: [], fin: null, clics: 0, id: null };
    g.addEventListener("pointerdown", e => { window.__j.id = e.pointerId; });
    g.addEventListener("click", () => window.__j.clics++);
    const o = eval("(" + opts + ")");
    glisser(g, { ...o, surDebut: () => window.__j.debut++, surDeplacement: p => window.__j.deplacements.push(p), surFin: f => { window.__j.fin = f; } });
  }, [GESTE, options]);
}

test("glisser : suit le geste à la souris, verrouille l'axe, résiste au-delà des limites et rend la vitesse du lâcher", async ({ page }) => {
  await ouvrir(page);
  await bac(page, GLISSEUR);
  await brancher(page, "{ axe: 'x', limites: [-100, 100] }");
  const b = await page.locator("#g").boundingBox();
  const cx = b.x + 20, cy = b.y + 40;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 40, cy + 2, { steps: 4 });
  const milieu = await page.evaluate(() => ({ t: parseFloat(getComputedStyle(document.getElementById("g")).translate), debut: window.__j.debut }));
  expect(milieu.debut).toBe(1);
  expect(milieu.t).toBeGreaterThan(20);
  expect(milieu.t).toBeLessThan(40);
  await page.mouse.move(cx + 300, cy, { steps: 6 });   // bien au-delà de la limite de 100
  const loin = parseFloat(await page.evaluate(() => getComputedStyle(document.getElementById("g")).translate));
  expect(loin).toBeGreaterThan(100);       // un peu au-delà…
  expect(loin).toBeLessThan(250);          // …mais bien moins que le doigt (300)
  await page.mouse.up();
  const j = await page.evaluate(() => window.__j);
  expect(j.fin.annule).toBe(false);
  expect(j.clics).toBe(0);   // un geste qui a déplacé n'est pas un clic
  /* La vitesse du lâcher se lit sur les ~80 dernières ms du geste : à la souris de
     Playwright, une machine chargée peut relâcher plus de 100 ms après le dernier
     mouvement (le doigt « s'est arrêté » : vitesse nulle, à raison). On rejoue donc un
     lancer dont le rythme est tenu dans la page : un mouvement toutes les 12 ms (attente
     active, pour que l'horodatage ne dépende pas de la charge), le lâcher aussitôt
     après le dernier. */
  const lancer = await page.evaluate(() => {
    const g = document.getElementById("g");
    const b = g.getBoundingClientRect();
    const y = b.top + 40;
    const ev = (type, x) => new PointerEvent(type, { pointerId: 77, isPrimary: true, pointerType: "touch", bubbles: true, clientX: x, clientY: y });
    window.__j.fin = null;
    g.dispatchEvent(ev("pointerdown", b.left + 20));
    let x = b.left + 20;
    for (let i = 0; i < 6; i++) {
      const t0 = performance.now();
      while (performance.now() - t0 < 12) { /* attente active : un pas de 12 ms */ }
      x += 12;
      g.dispatchEvent(ev("pointermove", x));
    }
    g.dispatchEvent(ev("pointerup", x));
    return window.__j.fin;
  });
  expect(lancer.annule).toBe(false);
  expect(lancer.vx).toBeGreaterThan(100);
  expect(lancer.vx).toBeLessThan(50000);
  expect(Math.abs(lancer.vy)).toBeLessThan(lancer.vx);
});

test("glisser : un mouvement plutôt vertical sur un axe x ne démarre pas (le défilement garde la main)", async ({ page }) => {
  await ouvrir(page);
  await bac(page, GLISSEUR);
  await brancher(page, "{ axe: 'x' }");
  const b = await page.locator("#g").boundingBox();
  await page.mouse.move(b.x + 20, b.y + 20);
  await page.mouse.down();
  await page.mouse.move(b.x + 25, b.y + 60, { steps: 5 });
  await page.mouse.up();
  const j = await page.evaluate(() => ({ ...window.__j, translate: document.getElementById("g").style.translate }));
  expect(j.debut).toBe(0);
  expect(j.fin).toBe(null);
  expect(j.translate).toBe("");
});

test("glisser : un geste annulé (pointercancel) revient au point de départ et le dit", async ({ page }) => {
  await ouvrir(page);
  await bac(page, GLISSEUR);
  await brancher(page, "{ axe: 'x' }");
  const b = await page.locator("#g").boundingBox();
  await page.mouse.move(b.x + 20, b.y + 40);
  await page.mouse.down();
  await page.mouse.move(b.x + 120, b.y + 40, { steps: 5 });
  await page.evaluate(() => document.getElementById("g").dispatchEvent(new PointerEvent("pointercancel", { pointerId: window.__j.id, bubbles: true })));
  expect((await page.evaluate(() => window.__j.fin)).annule).toBe(true);
  await page.waitForFunction(() => document.getElementById("g").style.translate === "" && document.getAnimations().filter(a => !(a.timeline instanceof ViewTimeline)).length === 0);
  await page.mouse.up();
});

test("relacher : un lâcher rapide part plus vite ; l'élément se pose à sa cible, sans animation restante", async ({ page }) => {
  await ouvrir(page);
  await bac(page, GLISSEUR);
  const r = await page.evaluate(async ([src]) => {
    const { relacher } = await import(src);
    const g = document.getElementById("g");
    const lancer = async vitesse => {
      g.style.translate = "150px 0px";
      const p = relacher(g, { x: 0, y: 0 }, { x: vitesse, y: 0 });
      const a = g.getAnimations()[0];
      a.pause();
      a.currentTime = 40;
      const x40 = parseFloat(getComputedStyle(g).translate);
      const duree = a.effect.getTiming().duration;
      a.finish();
      await p;
      return { x40, duree, fin: g.style.translate, anims: g.getAnimations().length };
    };
    const lent = await lancer(0);
    const rapide = await lancer(-3000);   // vers la cible : de droite à gauche
    return { lent, rapide };
  }, [GESTE]);
  expect(r.rapide.x40).toBeLessThan(r.lent.x40);   // plus avancé vers 0
  expect(r.lent).toMatchObject({ fin: "", anims: 0 });
  expect(r.rapide).toMatchObject({ fin: "", anims: 0 });
  expect(r.lent.duree).toBeGreaterThan(100);
  expect(r.lent.duree).toBeLessThan(4001);
});

test("relacher : en mouvement réduit, l'élément est posé tout de suite", async ({ page }) => {
  await ouvrir(page, { reduit: true });
  await bac(page, GLISSEUR);
  const r = await page.evaluate(async src => {
    const { relacher } = await import(src);
    const g = document.getElementById("g");
    g.style.translate = "80px 0px";
    await relacher(g, { x: 0, y: 0 }, { x: 500, y: 0 });
    return { translate: g.style.translate, anims: document.getAnimations().length };
  }, GESTE);
  expect(r).toEqual({ translate: "", anims: 0 });
});

/* ---------- retour d'appui, jetons ---------- */

test("jetons : durées, courbes, ressorts avec leur durée, ombres claires et sombres", async ({ page }) => {
  await ouvrir(page);
  const lire = () => page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    const v = k => s.getPropertyValue(k).trim();
    return { appui: v("--d-appui"), courte: v("--d-courte"), moyenne: v("--d-moyenne"), longue: v("--d-longue"), trace: v("--d-trace"), sortie: v("--e-sortie"), ressort: v("--ressort"), vif: v("--ressort-vif"), rebond: v("--ressort-rebond"), dureeVif: v("--ressort-vif-duree"), ombre1: v("--ombre-1"), ombre3: v("--ombre-3"), lueur: v("--lueur"), feuilleC: v("--feuille-c") };
  });
  const clair = await lire();
  expect(clair).toMatchObject({ appui: "90ms", courte: "160ms", moyenne: "260ms", longue: "420ms", trace: "380ms" });
  expect(clair.sortie).toMatch(/^cubic-bezier\(/);
  for (const k of ["ressort", "vif", "rebond"]) expect(clair[k]).toMatch(/^linear\(0, /);
  expect(clair.dureeVif).toMatch(/^\d+ms$/);
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  const sombre = await lire();
  expect(sombre.ombre1).not.toBe(clair.ombre1);
  expect(sombre.ombre3).not.toBe(clair.ombre3);
  expect(sombre.lueur).not.toBe(clair.lueur);
  expect(sombre.feuilleC).not.toBe(clair.feuilleC);
  expect(`${clair.ombre1}${clair.ombre3}${sombre.ombre1}${sombre.ombre3}`).not.toMatch(/\b0 0 0 \/|rgb\(0 0 0/);   // jamais de noir pur
});

test("retour d'appui : les boutons s'enfoncent par `scale` sans toucher à `transform`, et rien ne bouge au repos", async ({ page }) => {
  await ouvrir(page);
  await bac(page, '<button id="b" class="btn secondary" style="transform:rotate(1deg)">Bouton</button><button id="c" class="chip">Filtre</button>');
  const boite = id => page.locator(id).boundingBox();
  const avant = [await boite("#b"), await boite("#c")];
  const b = avant[0];
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.getElementById("b")).scale)).toBe("0.965");
  expect(await page.evaluate(() => getComputedStyle(document.getElementById("b")).transform.startsWith("matrix"))).toBe(true);   // la rotation de départ est intacte
  await page.mouse.up();
  await pageStable(page);
  expect(await page.evaluate(() => getComputedStyle(document.getElementById("b")).scale)).toBe("none");
  const apres = [await boite("#b"), await boite("#c")];
  expect(apres).toEqual(avant);
});

test("retour d'appui : sur la barre d'onglets, rien ne bouge au repos, et en mouvement réduit rien ne change de taille", async ({ page }) => {
  await ouvrir(page);
  const onglet = page.locator(".tabbar a").first();
  const r0 = await onglet.boundingBox();
  await page.mouse.move(r0.x + r0.width / 2, r0.y + r0.height / 2);
  await page.mouse.down();
  await expect.poll(() => onglet.evaluate(e => getComputedStyle(e).scale)).toBe("0.965");
  await page.mouse.move(5, 5);   // on sort de l'onglet sans cliquer
  await page.mouse.up();
  await pageStable(page);
  expect(await onglet.boundingBox()).toEqual(r0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.mouse.move(r0.x + r0.width / 2, r0.y + r0.height / 2);
  await page.mouse.down();
  expect(await onglet.evaluate(e => getComputedStyle(e).scale)).toBe("none");
  await page.mouse.move(5, 5);
  await page.mouse.up();
});

test("transitions de vue : le CSS de base règle leur rythme, et rien n'est animé en mouvement réduit", async ({ page }) => {
  await ouvrir(page);
  const regles = () => page.evaluate(() => {
    const trouvees = [];
    const parcourir = liste => { for (const r of liste) { if (r.cssRules) parcourir(r.cssRules); if (r.selectorText?.includes("view-transition")) trouvees.push([r.selectorText, r.style.animationDuration, r.style.animationName || r.style.animation]); } };
    for (const f of document.styleSheets) { try { parcourir(f.cssRules); } catch {} }
    return trouvees;
  });
  const normal = await regles();
  expect(normal.some(([s, d]) => s.includes("group") && d === "var(--d-longue)")).toBe(true);
  const reduit = normal.filter(([, , a]) => a === "none");
  expect(reduit.length).toBe(3);   // groupe, ancien, nouveau
});

test("mouvement réduit : le filet couvre aussi les utilitaires (.arrive, .trace) et la pastille", async ({ page }) => {
  await ouvrir(page, { reduit: true });
  await bac(page, '<div id="a" class="arrive">x</div>' + SVG.replace('id="s"', 'id="s" class="trace"'));
  const r = await page.evaluate(() => ({ anims: document.getElementById("bac").getAnimations({ subtree: true }).length, opacite: getComputedStyle(document.getElementById("a")).opacity, decalage: getComputedStyle(document.querySelector("#s path")).strokeDashoffset }));
  expect(r).toEqual({ anims: 0, opacite: "1", decalage: "0px" });
});

test("les modules du mouvement ne touchent pas à l'accueil au chargement à froid : effets.js n'est pas chargé", async ({ page }) => {
  const modules = [];
  page.on("request", q => { if (q.url().endsWith(".js")) modules.push(new URL(q.url()).pathname); });
  await page.goto("/");
  await pageStable(page);
  expect(modules).not.toContain("/js/ui/effets.js");
});
