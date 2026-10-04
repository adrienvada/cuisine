/* Les mains libres (js/ui/voix.js), avec une reconnaissance et une synthèse simulées. */

import { test, expect } from "@playwright/test";
import { installerFaux, ouvrirBanc } from "./outils-voix.js";

/* Installe l'écoute avec des commandes qui s'inscrivent dans window.__appels. */
const ecouter = page => page.evaluate(() => {
  window.__appels = [];
  window.__erreurs = [];
  const cmd = n => () => window.__appels.push(n);
  window.__ecoute = window.voix.ecouter(
    { suivant: cmd("suivant"), precedent: cmd("precedent"), repeter: cmd("repeter"),
      minuteur: cmd("minuteur"), ingredients: cmd("ingredients"), terminer: cmd("terminer") },
    { onErreur: m => window.__erreurs.push(m) }
  );
});
const appels = page => page.evaluate(() => window.__appels);
const dire = (page, ...args) => page.evaluate(a => window.__faux.dire(...a), args);
const actives = page => page.evaluate(() => window.__faux.active().length);

test("disponibilité : selon ce que le navigateur sait faire", async ({ page }) => {
  await installerFaux(page);
  await ouvrirBanc(page);
  expect(await page.evaluate(() => window.voix.voixDisponible())).toEqual({ ecoute: true, lecture: true });
});

test("disponibilité : rien de simulé, rien de promis ; ecouter() le dit au lieu de planter", async ({ page }) => {
  await installerFaux(page, { ecoute: false, lecture: false });
  // Chromium porte les vraies interfaces : on les masque pour imiter un navigateur sans voix.
  await page.addInitScript(() => {
    for (const nom of ["SpeechRecognition", "webkitSpeechRecognition", "SpeechSynthesisUtterance", "speechSynthesis"]) {
      Object.defineProperty(window, nom, { configurable: true, value: undefined });
    }
  });
  await ouvrirBanc(page);
  const r = await page.evaluate(() => {
    const erreurs = [];
    const e = window.voix.ecouter({}, { onErreur: m => erreurs.push(m) });
    e.arreter();
    return { dispo: window.voix.voixDisponible(), erreurs };
  });
  expect(r.dispo.ecoute).toBe(false);
  expect(r.erreurs).toHaveLength(1);
  // lire() se résout sans rien dire plutôt que de bloquer le mode cuisine.
  await page.evaluate(() => window.voix.lire("Bonjour"));
});

test("commandes : chaque formulation tombe sur la bonne commande", async ({ page }) => {
  await installerFaux(page);
  await ouvrirBanc(page);
  const attendu = {
    suivant: ["Suivant", "suivante.", "Après", "OK", "C'est bon !", "c’est bon", "Étape suivante"],
    precedent: ["Précédent", "retour", "Avant", "étape précédente"],
    repeter: ["Répète", "relis", "Encore", "répète s'il te plaît"],
    minuteur: ["Minuteur", "chrono", "lance le minuteur"],
    ingredients: ["Ingrédients", "Qu'est-ce qu'il faut ?", "les ingrédients"],
    terminer: ["Terminé", "fini", "j'ai fini"]
  };
  const trouve = await page.evaluate(a => {
    const sortie = {};
    for (const [cmd, phrases] of Object.entries(a)) sortie[cmd] = phrases.map(p => window.voix.commandeDepuis(p));
    return sortie;
  }, attendu);
  for (const [cmd, phrases] of Object.entries(attendu)) expect(trouve[cmd], cmd).toEqual(phrases.map(() => cmd));
  expect(await page.evaluate(() => [
    window.voix.commandeDepuis("il faut affiner la pâte"), window.voix.commandeDepuis(""), window.voix.commandeDepuis("bla bla")
  ])).toEqual([null, null, null]);
});

test("routage : une phrase dite déclenche la commande correspondante", async ({ page }) => {
  await installerFaux(page);
  await ouvrirBanc(page);
  await ecouter(page);
  expect(await page.evaluate(() => window.__faux.sessions[0].lang)).toBe("fr-FR");
  expect(await page.evaluate(() => window.__faux.sessions[0].continuous)).toBe(true);

  await dire(page, "suivant");
  await dire(page, "répète");
  await dire(page, "lance le minuteur");
  await dire(page, "qu'est-ce qu'il faut");
  await dire(page, "précédent");
  await dire(page, "terminé");
  await dire(page, "la farine est où");   // sans commande : ignoré
  expect(await appels(page)).toEqual(["suivant", "repeter", "minuteur", "ingredients", "precedent", "terminer"]);
});

test("une commande ne part qu'une fois par énoncé, malgré les résultats intermédiaires", async ({ page }) => {
  await installerFaux(page);
  await ouvrirBanc(page);
  await ecouter(page);

  // Le même énoncé (indice 0) se précise : partiel, puis partiel plus long, puis final.
  await dire(page, "suivant", { final: false, depuis: 0 });
  await dire(page, "suivant", { final: false, depuis: 0 });
  await dire(page, "suivant", { final: true, depuis: 0 });
  expect(await appels(page)).toEqual(["suivant"]);

  // Un second énoncé (indice 1) est une nouvelle commande.
  await dire(page, "suivant", { depuis: 1 });
  expect(await appels(page)).toEqual(["suivant", "suivant"]);
});

test("relance automatique : quand le navigateur coupe, une nouvelle écoute démarre", async ({ page }) => {
  await page.clock.install();
  await installerFaux(page);
  await ouvrirBanc(page);
  await ecouter(page);
  expect(await page.evaluate(() => window.__faux.sessions.length)).toBe(1);

  await page.evaluate(() => window.__faux.couper());
  await expect.poll(() => actives(page)).toBe(1);
  expect(await page.evaluate(() => window.__faux.sessions.length)).toBe(2);

  // La nouvelle session repart de zéro : sa première phrase compte bien.
  await dire(page, "suivant");
  expect(await appels(page)).toEqual(["suivant"]);

  // arreter() : plus de relance, plus de commandes.
  await page.evaluate(() => window.__ecoute.arreter());
  await page.clock.runFor(10000);
  expect(await actives(page)).toBe(0);
  expect(await page.evaluate(() => window.__faux.sessions.length)).toBe(2);
});

test("pause pendant la lecture : le micro se tait tant que l'appli parle, puis reprend", async ({ page }) => {
  await page.clock.install();
  await installerFaux(page);
  await ouvrirBanc(page);
  await ecouter(page);
  expect(await actives(page)).toBe(1);

  await page.evaluate(() => { window.__lue = false; window.voix.lire("Mélangez la farine et le sel.").then(() => { window.__lue = true; }); });
  // L'écoute est coupée dès que la lecture commence, et ne revient pas toute seule.
  await expect.poll(() => actives(page)).toBe(0);
  await page.clock.runFor(1000);
  expect(await actives(page)).toBe(0);
  expect(await page.evaluate(() => window.__lue)).toBe(false);

  // La synthèse a fini : la promesse se résout, l'écoute repart.
  await page.evaluate(() => window.__faux.finLecture());
  await expect.poll(() => page.evaluate(() => window.__lue)).toBe(true);
  await expect.poll(() => actives(page)).toBe(1);

  // Aucune erreur remontée pendant la pause, et la nouvelle écoute entend.
  expect(await page.evaluate(() => window.__erreurs)).toEqual([]);
  await dire(page, "suivant");
  expect(await appels(page)).toEqual(["suivant"]);
});

test("lire() : voix française locale, et une nouvelle lecture interrompt la précédente", async ({ page }) => {
  await page.clock.install();
  await installerFaux(page);
  await ouvrirBanc(page);
  await ecouter(page);

  await page.evaluate(() => {
    window.__fin = [];
    window.voix.lire("Première étape.").then(() => window.__fin.push(1));
  });
  await expect.poll(() => page.evaluate(() => window.__faux.lectures.length)).toBe(1);
  const u = await page.evaluate(() => { const u = window.__faux.lectures[0]; return { lang: u.lang, rate: u.rate, voix: u.voice.name, texte: u.text }; });
  expect(u).toEqual({ lang: "fr-FR", rate: 1, voix: "France locale", texte: "Première étape." });

  await page.evaluate(() => { window.voix.lire("Deuxième étape.").then(() => window.__fin.push(2)); });
  // La première promesse s'est résolue, pas la seconde...
  await expect.poll(() => page.evaluate(() => window.__fin)).toEqual([1]);
  expect(await page.evaluate(() => window.__faux.annulations)).toBeGreaterThan(0);
  // ... et l'écoute n'a pas repris entre les deux : la seconde parle encore.
  await page.clock.runFor(1000);
  expect(await actives(page)).toBe(0);
  await expect.poll(() => page.evaluate(() => window.__faux.lectures.at(-1).text)).toBe("Deuxième étape.");
});

test("arreterLecture() : coupe la voix, résout la promesse et rend le micro", async ({ page }) => {
  await installerFaux(page);
  await ouvrirBanc(page);
  await ecouter(page);
  await page.evaluate(() => { window.__lue = false; window.voix.lire("Un long texte.").then(() => { window.__lue = true; }); });
  await expect.poll(() => page.evaluate(() => window.__faux.lectures.length)).toBe(1);
  await page.evaluate(() => window.voix.arreterLecture());
  await expect.poll(() => page.evaluate(() => window.__lue)).toBe(true);
  await expect.poll(() => actives(page)).toBe(1);
});

test("refus du micro : écoute arrêtée pour de bon, message clair en français", async ({ page }) => {
  await page.clock.install();
  await installerFaux(page, { refus: true });
  await ouvrirBanc(page);
  await ecouter(page);
  await expect.poll(() => page.evaluate(() => window.__erreurs.length)).toBe(1);
  const msg = await page.evaluate(() => window.__erreurs[0]);
  expect(msg).toMatch(/micro/i);
  expect(msg).toMatch(/autorise/i);

  // Pas de relance en boucle devant un refus.
  await page.clock.runFor(10000);
  expect(await page.evaluate(() => window.__faux.sessions.length)).toBe(1);
  expect(await page.evaluate(() => window.__erreurs.length)).toBe(1);
});
