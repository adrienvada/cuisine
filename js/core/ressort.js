/* Le ressort amorti et les jetons de mouvement, côté pur (aucun DOM : s'importe sous Node).

   Un ressort donne à un mouvement la façon dont un objet se pose : il arrive vite,
   dépasse à peine, puis se stabilise. ressort() l'échantillonne en une suite de
   valeurs de 0 à 1 et en une chaîne CSS « linear(…) » : la même courbe sert aux
   transitions CSS (jetons --ressort de css/base.css, écrits par
   tools/ressorts-css.mjs) et aux animations JS (js/ui/mouvement.js).

   Les durées et les courbes non ressort vivent ici aussi, pour que JS et CSS
   n'aient qu'une source : un test vérifie que les jetons de base.css disent la
   même chose que ces constantes. */

/* Durées en ms : l'appui d'un doigt, un état (couleur), un élément qui bouge, une
   vue ou une feuille, le tracé d'un trait à l'encre. */
export const DUREES = { appui: 90, courte: 160, moyenne: 260, longue: 420, trace: 380 };

/* Ce qui arrive décélère, ce qui part accélère (et va environ 30 % plus vite),
   ce qui va d'un point à un autre fait les deux. */
export const COURBES = {
  sortie: "cubic-bezier(0.16, 1, 0.3, 1)",
  entree: "cubic-bezier(0.5, 0, 0.9, 0.45)",
  standard: "cubic-bezier(0.4, 0, 0.2, 1)"
};

/* Préréglages « papier qui se pose ». ζ = amortissement / (2 √(raideur × masse)) :
   doux ≈ 0,8 (dépasse de 1,5 %), vif ≈ 0,72 (4 %), rebond ≈ 0,64 (7 %) : jamais un
   rebond de balle. */
export const PRESETS = {
  doux: { raideur: 220, amortissement: 24 },
  vif: { raideur: 600, amortissement: 36 },
  rebond: { raideur: 300, amortissement: 22 }
};

/* Courbes de repli, pour un navigateur qui ne connaît pas linear() (avant Safari 17.2,
   Chrome 113) : la même intention, en cubic-bezier. */
export const REPLIS_RESSORT = {
  doux: "cubic-bezier(0.22, 1.1, 0.36, 1)",
  vif: "cubic-bezier(0.34, 1.25, 0.64, 1)",
  rebond: "cubic-bezier(0.34, 1.5, 0.64, 1)"
};

const DUREE_MAX = 4000;
const arrondi = x => Math.round(x * 1000) / 1000 || 0;   // « || 0 » : jamais « -0 »

/* Écart au repos (x − 1) à l'instant t (secondes) : solution exacte de
   m·x'' + c·x' + k·(x − 1) = 0, avec x(0) = 0 et x'(0) = vitesse. */
function ecart({ raideur, amortissement, masse, vitesse }) {
  const w0 = Math.sqrt(raideur / masse);
  const zeta = amortissement / (2 * Math.sqrt(raideur * masse));
  if (Math.abs(zeta - 1) < 1e-6) {
    const b = vitesse - w0;
    return t => (-1 + b * t) * Math.exp(-w0 * t);
  }
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const b = (vitesse - zeta * w0) / wd;
    return t => Math.exp(-zeta * w0 * t) * (-Math.cos(wd * t) + b * Math.sin(wd * t));
  }
  const r = w0 * Math.sqrt(zeta * zeta - 1);
  const r1 = -zeta * w0 + r;
  const r2 = -zeta * w0 - r;
  const c2 = (vitesse + r1) / (r2 - r1);
  const c1 = -1 - c2;
  return t => c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
}

/* ressort({ raideur, amortissement, masse = 1, vitesse = 0 }) :
   - vitesse : celle du doigt au lâcher, en « distance totale par seconde » (1 = le
     mouvement entier en une seconde) ; négative, elle part d'abord en sens inverse ;
   - duree : ms, jusqu'au repos (écart et vitesse sous leurs seuils), au plus 4 s ;
   - points : 30 à 60 valeurs régulièrement espacées, de 0 (premier) à 1 (dernier,
     exactement) ; une valeur au-delà de 1 est un dépassement ;
   - lineaire : la chaîne CSS « linear(0, 0.1, …, 1) », 3 décimales.
   Le préréglage se donne par son nom : ressort("vif"), ressort({ ...PRESETS.doux, vitesse: 2 }). */
export function ressort(parametres = "doux") {
  const p = typeof parametres === "string" ? { ...PRESETS[parametres] } : { ...parametres };
  if (!(p.raideur > 0) || !(p.amortissement >= 0)) throw new RangeError("ressort : raideur > 0 et amortissement ≥ 0");
  const masse = p.masse > 0 ? p.masse : 1;
  const vitesse = Number.isFinite(p.vitesse) ? p.vitesse : 0;
  const seuilPosition = p.seuilPosition ?? 0.002;
  const seuilVitesse = p.seuilVitesse ?? 0.02;
  const y = ecart({ raideur: p.raideur, amortissement: p.amortissement, masse, vitesse });

  // Dernier instant (au ms près) où le ressort bouge encore : ensuite, c'est le repos.
  let dernierActif = 0;
  for (let ms = 0; ms < DUREE_MAX; ms++) {
    const t = ms / 1000;
    const v = (y(t + 0.001) - y(t)) / 0.001;
    if (Math.abs(y(t)) > seuilPosition || Math.abs(v) > seuilVitesse) dernierActif = ms;
  }
  let duree = Math.min(DUREE_MAX, Math.max(16, dernierActif + 1));

  const echantillonner = fin => {
    const n = Math.min(60, Math.max(30, Math.round(fin / 20)));
    const pts = Array.from({ length: n }, (_, i) => arrondi(1 + y((fin * i) / (n - 1) / 1000)));
    pts[0] = 0;
    pts[n - 1] = 1;
    return pts;
  };
  /* Une traîne de valeurs à 0,2 % du repos n'apprend rien au navigateur : on
     raccourcit jusqu'à son premier point, puis on réechantillonne. */
  let points = echantillonner(duree);
  for (let essai = 0; essai < 6; essai++) {
    let k = points.length - 1;
    while (k > 0 && Math.abs(points[k - 1] - 1) <= 0.002) k--;
    if (k === points.length - 1) break;
    duree = Math.max(16, Math.round((duree * k) / (points.length - 1)));
    points = echantillonner(duree);
  }
  return { duree, points, lineaire: `linear(${points.join(", ")})` };
}

/* Résistance élastique : un doigt qui tire au-delà d'une limite ne suit plus qu'en
   partie, de moins en moins (la matière s'étire). `exces` : distance dépassée, en
   px ; `portee` : l'étirement vers lequel on tend, jamais atteint. Monotone, 0 en 0. */
export function resistance(exces, portee = 300, coefficient = 0.55) {
  if (!(exces > 0)) return 0;
  return (1 - 1 / ((exces * coefficient) / portee + 1)) * portee;
}

/* Vitesse d'un geste, en px/s, sur les dernières `fenetre` ms d'échantillons
   { t (ms), x, y }. Un doigt resté immobile avant de lâcher (dernier échantillon
   plus vieux que `repos` ms au moment `t`) ne lance rien. */
export function vitesseDeGeste(echantillons, t, { fenetre = 80, repos = 100 } = {}) {
  const dernier = echantillons[echantillons.length - 1];
  if (!dernier || t - dernier.t > repos) return { x: 0, y: 0 };
  let premier = dernier;
  for (let i = echantillons.length - 2; i >= 0 && dernier.t - echantillons[i].t <= fenetre; i--) premier = echantillons[i];
  const dt = dernier.t - premier.t;
  if (dt < 8) return { x: 0, y: 0 };
  return { x: ((dernier.x - premier.x) / dt) * 1000, y: ((dernier.y - premier.y) / dt) * 1000 };
}
