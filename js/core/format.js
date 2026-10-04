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
  paquet: "paquets", tube: "tubes", flacon: "flacons"
};

export function fmtUnit(unit, qty) {
  if (!unit) return "";
  if (qty > 1 && PLURALS[unit]) return PLURALS[unit];
  return unit;
}

export function scaleQty(q, unit, factor) {
  if (q == null) return null;
  let s = q * factor;
  if (unit === "g" || unit === "ml") s = Math.round(s);
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
