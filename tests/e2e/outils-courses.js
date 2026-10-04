/* Aides des tests de la liste de courses. */

import { expect } from "./outils.js";

/* La ligne d'un article, par sa clé. */
export const ligneDe = (page, cle) => page.locator("li.art", { has: page.locator(`input[data-key="${cle}"]`) });

/* Coche ou décoche en touchant la case : le centre de la ligne, lui, appartient
   au nom de l'article, qui déplie sa provenance. */
export async function basculer(page, cle) {
  await ligneDe(page, cle).locator(".tick").click();
}

/* Les titres de rayons affichés, dans l'ordre (le placard et le panier n'en sont pas). */
export const titresRayons = page => page.locator("section.rayon:not(.placard) > h2").allTextContents();

/* Un message avec « Annuler » : on le touche. */
export async function annuler(page) {
  await page.locator("#toast .toast-action").click();
}

export { expect };

/* Luminance relative et contraste WCAG de deux couleurs « rgb(r, g, b) » ou « rgba(…) ». */
export function contraste(a, b) {
  const lum = c => {
    const [r, g, bl] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
