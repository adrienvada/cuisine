/* Fiabilité de la suite elle-même : le simulateur de mauvais réseau de tests/serveur.mjs
   doit rester propre à chaque test (constat n° 23 de la seconde vague). */

import { test, expect } from "@playwright/test";
import { attendreCalme } from "./outils.js";

const regler = (baseURL, id, reglage = "") =>
  fetch(`${baseURL}/__reseau?id=${id}${reglage}`).then(r => r.json());
const demander = (baseURL, id) => fetch(`${baseURL}/index.html`, { headers: { cookie: `reseau=${id}` } });

test("réseau simulé : la remise à zéro d'un test ne coupe pas la requête d'un autre", async ({ baseURL }) => {
  const a = `iso-a-${process.pid}`;
  const b = `iso-b-${process.pid}`;
  await regler(baseURL, a, "&bloque=1");

  // La requête du test A reste sans réponse...
  let sortA = "attente";
  const requeteA = demander(baseURL, a).then(() => { sortA = "reponse"; }, () => { sortA = "coupee"; });

  // ... le test B bloque à son tour, puis remet à zéro : seule sa propre attente est touchée.
  await regler(baseURL, b, "&bloque=1");
  let sortB = "attente";
  const requeteB = demander(baseURL, b).then(() => { sortB = "reponse"; }, () => { sortB = "coupee"; });
  await regler(baseURL, b);
  await requeteB;
  expect(sortB).toBe("coupee");

  // Un test sans réglage est servi normalement pendant que A est bloqué.
  expect((await demander(baseURL, "personne")).status).toBe(200);
  expect(sortA).toBe("attente");

  // Remise à zéro de A : sa requête, et elle seule, est coupée.
  await regler(baseURL, a);
  await requeteA;
  expect(sortA).toBe("coupee");
});

test("réseau simulé : la latence d'un test ne ralentit pas les autres", async ({ baseURL }) => {
  const id = `lent-${process.pid}`;
  await regler(baseURL, id, "&latence=1500");
  try {
    const debut = Date.now();
    await demander(baseURL, "autre");
    expect(Date.now() - debut).toBeLessThan(1000);
    const lent = Date.now();
    await demander(baseURL, id);
    expect(Date.now() - lent).toBeGreaterThanOrEqual(1400);
  } finally {
    await regler(baseURL, id);
  }
});

test("attendre le calme : une requête tardive (lecture puis écriture) est vue avant de conclure", async () => {
  // Un envoi fait deux allers-retours : la seconde requête part après la première réponse.
  // Conclure « rien n'est arrivé » dès la première ne prouverait donc rien.
  const recu = [];
  setTimeout(() => recu.push("lecture"), 50);
  setTimeout(() => recu.push("ecriture"), 250);
  expect(await attendreCalme(() => recu.length)).toBe(2);
});
