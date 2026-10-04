/* Formats : durées, quantités mises à l'échelle, dates, horloge, texte normalisé pour la recherche. */

export function fmtTime(min) {
  if (min == null) return "";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

export function rangeTime(min, max) {
  if (min === max) return fmtTime(min);
  // Même unité de part et d'autre : on ne la répète pas — « 45 – 55 min ».
  if (max < 60) return `${min} – ${max} min`;
  return `${fmtTime(min)} – ${fmtTime(max)}`;
}

/* Un temps affiché, en fourchette dès que des suppléments peuvent l'allonger.
   Quand la recette nue n'a rien à ce poste, la fourchette n'aurait pas de sens :
   on annonce « jusqu'à ». */
export function timeText(base, extra) {
  if (!extra) return fmtTime(base);
  if (!base) return `jusqu'à ${fmtTime(extra)}`;
  return rangeTime(base, base + extra);
}

export function fmtQty(q) {
  if (q == null) return "";
  const rounded = Math.round(q * 4) / 4;
  const whole = Math.floor(rounded);
  const frac = { 0.25: "¼", 0.5: "½", 0.75: "¾" }[rounded - whole];
  if (frac) return (whole || "") + frac;
  return String(Math.round(rounded * 10) / 10).replace(".", ",");
}

export const WEIGHT_UNITS = ["g", "kg", "ml", "cl", "l", "c. à s.", "c. à c."];
/* Les unités de compte sont écrites au singulier dans les données ; leur pluriel
   n'est pas un simple « s » pour toutes (rouleau, bocal), d'où cette table. */
export const PLURALS = {
  rouleau: "rouleaux", bocal: "bocaux", pot: "pots", "petit pot": "petits pots",
  sachet: "sachets", botte: "bottes", bouquet: "bouquets", gousse: "gousses", "petite gousse": "petites gousses",
  tranche: "tranches", brin: "brins", poignée: "poignées", bouteille: "bouteilles",
  paquet: "paquets", tube: "tubes", flacon: "flacons", brique: "briques", "boîte": "boîtes", "œuf": "œufs"
};

export function fmtUnit(unit, qty) {
  if (!unit) return "";
  /* En français le pluriel commence à 2 : « 1½ boîte », « 1,5 sachet ». On compare à
     la quantité telle que fmtQty l'écrit (au quart près), pas à la valeur brute. */
  if (Math.round(qty * 4) / 4 >= 2 && PLURALS[unit]) return PLURALS[unit];
  return unit;
}

/* Ce qui se compte à la pièce et ne se coupe pas : « 1½ œuf » n'existe pas,
   pas plus que « 2½ tranches ». Ces unités-là, et tout ingrédient marqué
   `entier: true` dans les recettes (œufs, cornichons, pitas, feuille de
   laurier…), s'arrondissent à l'entier le plus proche, la moitié vers le haut
   (1,5 œuf → 2), sans jamais tomber à zéro. Un oignon, un citron, une gousse se
   coupent : ils gardent les quarts de fmtQty. */
const UNITES_ENTIERES = ["tranche", "brin", "œuf"];

export function scaleQty(q, unit, factor, entier = false) {
  if (q == null) return null;
  let s = q * factor;
  if (unit === "g" || unit === "ml") s = Math.round(s);
  // Un quart de centilitre ne se mesure ni ne s'achète : « 1¼ cl » devient « 1 cl ».
  else if (unit === "cl") s = Math.max(1, Math.round(s));
  else if (entier || UNITES_ENTIERES.includes(unit)) s = Math.max(1, Math.round(s));
  return s;
}

/* Les quantités écrites au fil d'un texte — « 3 cl pour la pâte », « réservez
   10 cl pour le mixage » — restaient figées quand on bougeait le curseur de
   portions, et contredisaient alors la colonne des quantités juste à côté.
   On les écrit désormais entre accolades pour qu'elles suivent l'échelle :
   {3 cl}, {1-2 c. à s.}, {2} (sans unité). Une quantité laissée nue reste nue,
   ce qui est voulu pour tout ce qui ne dépend pas des portions : une largeur
   de bande en centimètres, un « 2 cl par verre ». */
export const QTE_ECHELLE = /\{(\d+(?:[.,]\d+)?)(?:\s*[–-]\s*(\d+(?:[.,]\d+)?))?\s*([^}]*)\}/g;

export function scaleText(txt, f) {
  if (!txt) return txt;
  return txt.replace(QTE_ECHELLE, (_, a, b, unit) => {
    unit = unit.trim();
    const q = n => scaleQty(parseFloat(n.replace(",", ".")), unit, f);
    const min = q(a), max = b ? q(b) : min;
    const nombre = min === max ? fmtQty(min) : `${fmtQty(min)} à ${fmtQty(max)}`;
    return `${nombre} ${fmtUnit(unit, max)}`.trim();
  });
}

export function fmtDate(ts) {
  const d = new Date(ts);
  const opts = { day: "numeric", month: "long" };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString("fr-FR", opts);
}

export function fmtClock(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  const h = Math.floor(m / 60);
  if (h) return `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* Le texte tel qu'on le compare : minuscules, sans accents, « œ » et « æ » dépliés.
   Une recherche sur « oeuf » doit trouver « œuf », et « ete » l'« été ». */
export function normaliser(texte) {
  return String(texte ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe").replace(/æ/g, "ae");
}

/* Le singulier de chaque unité de portions des recettes (`portions.label`, écrit
   au pluriel dans les données). Le vérificateur exige que tout label de recette y
   figure : sans cela, « 1 personnes » reviendrait en silence. */
export const SINGULIERS_PORTIONS = { personnes: "personne", verres: "verre", tartines: "tartine" };

/* « 4 personnes », « 1 personne » : le pluriel commence à 2, comme pour fmtUnit ;
   0 et les valeurs inférieures à 2 vont donc au singulier. */
export function libellePortions(n, label) {
  const mot = n < 2 ? (SINGULIERS_PORTIONS[label] || label) : label;
  return `${n} ${mot}`;
}

/* Typographie française, une seule mécanique pour tout le carnet : espace insécable
   avant « : » (U+00A0), insécable fine avant « ; ! ? » et à l'intérieur des
   guillemets « » (U+202F), insécable entre un nombre et son unité (°C, g, min…).
   Elle ne remplace que des espaces déjà écrites (ou en pose là où la règle l'exige
   et où il n'y en a pas) : « 12:30 » et les adresses n'en ont pas, elles restent
   intactes. Idempotente — la passe sur le DOM (js/ui/typo.js) s'en sert pour ne
   jamais boucler. */
const ESPACE = "[ \\u00a0\\u202f]";
const RE_DOUBLE_ESPACE = /(\S) {2,}/g;
const RE_AVANT_DEUX_POINTS = new RegExp(`(\\S)${ESPACE}+:`, "g");
const RE_AVANT_PONCTUATION = new RegExp(`(\\S)${ESPACE}+(?=[;!?])`, "g");
const RE_OUVRANT = new RegExp(`«${ESPACE}*(?=\\S)`, "g");
const RE_FERMANT = new RegExp(`(\\S)${ESPACE}*»`, "g");
const RE_NOMBRE_UNITE = new RegExp(`(\\d)${ESPACE}+(°C|kg|g|cl|ml|l|min|h|cm)(?![\\p{L}\\d'’])`, "gu");

export function typo(texte) {
  if (!texte) return texte;
  return String(texte)
    .replace(RE_DOUBLE_ESPACE, "$1 ")
    .replace(RE_AVANT_DEUX_POINTS, "$1 :")
    .replace(RE_AVANT_PONCTUATION, "$1 ")
    .replace(RE_OUVRANT, "« ")
    .replace(RE_FERMANT, "$1 »")
    .replace(RE_NOMBRE_UNITE, "$1 $2");
}
