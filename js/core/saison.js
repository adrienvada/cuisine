/* Les saisons des produits (pur) : où en est un produit au mois m, sa période dite en
   français, et les recettes du carnet qui l'emploient. Lu par l'onglet Saison
   (js/vues/saison.js) ; testé sous Node (tests/unit/saison.test.mjs). */

export const NOMS_MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const INITIALES_MOIS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/* Le mois qui suit (ou précède, d < 0) m, en tournant sur l'année. */
export const moisDecale = (m, d) => ((m - 1 + d) % 12 + 12) % 12 + 1;

export const toutLAnnee = p => p.mois === "annee";

/* Les périodes de saison d'un produit, chacune { debut, fin, duree }, dans l'ordre de
   l'année ; une période peut passer d'une année à l'autre (septembre à février). */
export function periodes(mois) {
  if (!Array.isArray(mois) || !mois.length) return [];
  const dans = new Set(mois);
  if (dans.size === 12) return [{ debut: 1, fin: 12, duree: 12 }];
  return [...dans].filter(m => !dans.has(moisDecale(m, -1))).sort((a, b) => a - b).map(debut => {
    let fin = debut, duree = 1;
    while (dans.has(moisDecale(fin, 1))) { fin = moisDecale(fin, 1); duree++; }
    return { debut, fin, duree };
  });
}

/* Où en est le produit au mois m : "arrive" (premier mois d'une période), "fin" (dernier
   mois), "pleine" (entre les deux), ou null (hors saison, ou toute l'année). */
export function phaseDe(p, m) {
  if (toutLAnnee(p) || !p.mois.includes(m)) return null;
  const dans = new Set(p.mois);
  if (dans.size === 12) return "pleine";
  if (!dans.has(moisDecale(m, -1))) return "arrive";
  if (!dans.has(moisDecale(m, 1))) return "fin";
  return "pleine";
}

/* « d'octobre », « de mai » : l'élision devant une voyelle. */
const de = m => (/^[aeiouyéè]/.test(NOMS_MOIS[m - 1]) ? "d'" : "de ") + NOMS_MOIS[m - 1];

/* La saison dite en français : « de juin à septembre », « en mai et juin »,
   « de mars à mai, puis d'octobre à novembre », « toute l'année ». */
export function periodeEnClair(p) {
  if (toutLAnnee(p)) return "toute l'année";
  const ps = periodes(p.mois);
  if (ps.length === 1 && ps[0].duree === 12) return "toute l'année";
  return ps.map(({ debut, fin, duree }) => (duree === 1 ? `en ${NOMS_MOIS[debut - 1]}`
    : duree === 2 ? `en ${NOMS_MOIS[debut - 1]} et ${NOMS_MOIS[fin - 1]}`
    : `${de(debut)} à ${NOMS_MOIS[fin - 1]}`)).join(", puis ");
}

const parNom = (a, b) => a.nom.localeCompare(b.nom, "fr");

/* Les produits de saison au mois m, rangés par phase et par nom ; `famille` (facultatif)
   n'en garde qu'une. */
export function produitsDuMois(produits, m, famille = null) {
  const res = { arrive: [], pleine: [], fin: [] };
  for (const p of produits) {
    if (famille && p.famille !== famille) continue;
    const phase = phaseDe(p, m);
    if (phase) res[phase].push(p);
  }
  for (const k of Object.keys(res)) res[k].sort(parNom);
  return res;
}

/* Les produits qu'on trouve toute l'année, par nom. */
export const produitsDeLAnnee = (produits, famille = null) =>
  produits.filter(p => toutLAnnee(p) && (!famille || p.famille === famille)).sort(parNom);

/* Les recettes qui emploient le produit, avec l'endroit : "base" (la version de la
   carte), "option" (un choix de la fiche) ou "supplement". Une recette n'apparaît
   qu'une fois, à sa place la plus forte. */
export function recettesDu(p, recettes) {
  const cids = new Set(p.cids || []);
  if (!cids.size) return [];
  const a = ings => (ings || []).some(i => cids.has(i.cid));
  const res = [];
  for (const r of recettes) {
    const ou = a(r.ingredients) ? "base"
      : (r.choices || []).some(c => c.options.some(o => a(o.ingredients))) ? "option"
      : (r.addons || []).some(s => a(s.ingredients)) ? "supplement"
      : null;
    if (ou) res.push({ r, ou });
  }
  const rang = { base: 0, option: 1, supplement: 2 };
  return res.sort((x, y) => rang[x.ou] - rang[y.ou] || x.r.title.localeCompare(y.r.title, "fr"));
}
