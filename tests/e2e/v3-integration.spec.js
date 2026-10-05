/* Vague 3, intégration : ce que l'intégrateur corrige dans le socle partagé après
   l'avoir vu servir dans les vues (feuilles, mode cuisine, courses). */

import { test, expect, pageStable } from "./outils.js";

const GESTE = "/js/ui/geste.js";

async function ouvrir(page) {
  await page.goto("/");
  await pageStable(page);
}

async function poser(page) {
  await page.evaluate(async src => {
    document.getElementById("bac")?.remove();
    const b = document.createElement("div");
    b.id = "bac";
    b.style.cssText = "position:fixed;top:120px;left:20px;width:340px;z-index:10;background:#fff;font-size:16px";
    b.innerHTML = '<p id="avant">Du texte avant le glisseur, à ne pas sélectionner.</p><div id="g" style="touch-action:none;width:200px;height:80px;background:#ddd">tirer ce texte</div><p id="apres">Du texte après.</p>';
    document.body.append(b);
    const { glisser } = await import(src);
    window.__fin = null;
    window.__erreurs = 0;
    window.addEventListener("error", () => window.__erreurs++);
    glisser(document.getElementById("g"), { axe: "x", surFin: f => { window.__fin = f; } });
  }, GESTE);
}

test("glisser : un pointeur que le navigateur refuse de capturer fait quand même glisser", async ({ page }) => {
  await ouvrir(page);
  await poser(page);
  const r = await page.evaluate(() => {
    const g = document.getElementById("g");
    const b = g.getBoundingClientRect();
    const ev = (type, x) => new PointerEvent(type, { pointerId: 4242, isPrimary: true, pointerType: "touch", bubbles: true, clientX: x, clientY: b.top + 20 });
    let leve = null;
    try {
      g.dispatchEvent(ev("pointerdown", b.left + 20));
      for (let i = 1; i <= 6; i++) g.dispatchEvent(ev("pointermove", b.left + 20 + i * 10));
      g.dispatchEvent(ev("pointerup", b.left + 80));
    } catch (e) { leve = String(e); }
    return { leve, fin: window.__fin, erreurs: window.__erreurs };
  });
  expect(r.leve).toBe(null);
  expect(r.erreurs).toBe(0);
  expect(r.fin).not.toBe(null);
  expect(r.fin.annule).toBe(false);
  expect(r.fin.x).toBeGreaterThan(40);
});

test("glisser à la souris : pas de texte sélectionné pendant le geste, sélection rendue après", async ({ page }) => {
  await ouvrir(page);
  await poser(page);
  const b = await page.locator("#g").boundingBox();
  const y = b.y + 30;
  await page.mouse.move(b.x + 10, y);
  await page.mouse.down();
  await page.mouse.move(b.x + 120, y + 4, { steps: 8 });
  const pendant = await page.evaluate(() => ({ sel: getSelection().toString(), us: document.documentElement.style.userSelect }));
  expect(pendant.sel).toBe("");
  expect(pendant.us).toBe("none");
  await page.mouse.up();
  const apres = await page.evaluate(() => ({ us: document.documentElement.style.userSelect, fin: window.__fin }));
  expect(apres.us).toBe("");
  expect(apres.fin.annule).toBe(false);
  // Hors geste, le texte redevient sélectionnable (l'émulation mobile ne sélectionne
  // pas à la souris : on lit le style calculé plutôt que de tirer une sélection).
  expect(await page.evaluate(() => getComputedStyle(document.getElementById("avant")).userSelect)).not.toBe("none");
});
