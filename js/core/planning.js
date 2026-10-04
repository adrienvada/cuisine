/* Le rétroplanning d'un repas : à quelle heure commencer chaque recette pour que tout soit prêt à table, quand allumer le four, et ce qui coince quand deux plats n'ont pas la même température.

   Module pur : il ne lit ni l'état ni le DOM, il reçoit des tâches toutes faites
   (cf. tachesDuMenu dans core/menu.js) et rend des minutes. Toutes les heures sont
   des « minutes murales » : le nombre de minutes écoulées depuis une origine
   commune, lues sur l'horloge du mur, sans fuseau — la table à 20 h est à 20 h
   partout, et le calendrier la recevra en Europe/Paris. */

/* Un four se préchauffe en un quart d'heure environ… */
export const PRECHAUFFAGE = 15;

/* … mais pas tous les fours à toutes les températures : il en faut moins pour
   150 °C que pour 230 °C. Ce sont des ordres de grandeur de four ménager (à
   chaleur tournante, un peu moins) ; le sien, on le connaît mieux que le carnet.
   Sans température connue, le quart d'heure habituel. */
export function dureePrechauffage(temp) {
  if (!(temp > 0)) return PRECHAUFFAGE;
  if (temp <= 160) return 10;
  if (temp <= 200) return PRECHAUFFAGE;
  return 20;
}

/* Entre un plat à 220 °C et un plat à 180 °C, le four a besoin de souffler :
   le thermostat ne descend pas d'un coup, et une porte ouverte l'aide à peine. */
const MARGE_FOUR = 10;

/* 170 °C et 180 °C, c'est le même four : on cuit ensemble à 175 °C, personne
   ne rallume le préchauffage pour dix degrés. Au-delà, c'est un autre plat. */
const ECART_NEGLIGEABLE = 10;
const memeChaleur = (a, b) => Math.abs(a - b) <= ECART_NEGLIGEABLE;

/* Un pas de cinq minutes : personne ne se met à ses fourneaux à 17 h 37. */
const PAS = 5;
const au5 = n => Math.floor(n / PAS) * PAS;
const sur5 = n => Math.ceil(n / PAS) * PAS;

/* Un temps mort dont on profite pour faire autre chose : une levée, un repos,
   un passage au four. En dessous d'un quart d'heure, on reste à côté. */
const SEUIL_LIBRE = 15;

/* ---------- Heures ---------- */

const deuxChiffres = n => String(n).padStart(2, "0");

/* « 20:30 » → 1230 ; une saisie illisible rend null. */
export function minutesDe(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  return +m[1] * 60 + +m[2];
}

/* « 2026-10-04 » + minutes dans la journée → minutes murales. */
export function minutesMurales(date, minutes) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3]) / 60000 + minutes;
}

/* L'inverse : { date: "AAAA-MM-JJ", hh, mm }. */
export function decomposer(murales) {
  const d = new Date(murales * 60000);
  return {
    date: `${d.getUTCFullYear()}-${deuxChiffres(d.getUTCMonth() + 1)}-${deuxChiffres(d.getUTCDate())}`,
    hh: d.getUTCHours(),
    mm: d.getUTCMinutes()
  };
}

/* « 19 h 35 », « 20 h » : la façon de dire l'heure dans le carnet. */
export function heureFr(murales) {
  const { hh, mm } = decomposer(murales);
  return mm ? `${hh} h ${deuxChiffres(mm)}` : `${hh} h`;
}

/* Le jour où le repas aura lieu. Une date choisie et encore à venir fait foi ;
   sinon c'est « la prochaine fois qu'il sera cette heure-là » — aujourd'hui si
   elle n'est pas passée, demain sinon. `maintenant` : { date, minutes } lus sur
   l'horloge de l'appareil. Rend aussi la minute murale de « maintenant » quand
   le repas est pour aujourd'hui (il bornera alors les départs), sinon null. */
export function instantTable({ date, heure }, maintenant) {
  const h = minutesDe(heure);
  if (h == null) return null;
  const ajd = minutesMurales(maintenant.date, 0);
  let jour = date && minutesMurales(date, 0) != null && minutesMurales(date, 0) >= ajd ? date : null;
  if (!jour) jour = maintenant.minutes < h ? maintenant.date : decomposer(ajd + 1440).date;
  const table = minutesMurales(jour, h);
  return { date: jour, table, maintenant: jour === maintenant.date ? ajd + maintenant.minutes : null };
}

/* ---------- Noms ---------- */

/* « Focaccia maison au romarin » → « Focaccia » : le début du titre, avant la
   première précision. Sert dans les phrases où le titre entier alourdirait. */
export function nomCourt(titre) {
  const coupe = String(titre || "").split(/\s*[,:(«&]\s*|\s+(?:maison|au|aux|à|de|du|des|façon|et)\s|\s+d['’]/i)[0].trim();
  return coupe || String(titre || "");
}

/* ---------- Le déroulé d'une recette ---------- */

/* Une tâche : { k, titre, temps: { prep, repos, cuisson }, supplement, etapes: [{ titre, duree, four }] }
   `duree` est le minuteur de l'étape (0 sans minuteur), `four` la température
   où elle enfourne. Les temps de la recette disent combien dure le tout ; les
   minuteurs disent où se logent les attentes ; le reste, c'est du travail des
   mains, qu'on répartit sur les étapes sans minuteur. */
function chronologie(tache) {
  const etapes = (tache.etapes || []).map(s => ({
    titre: s.titre || "", duree: Math.max(0, Math.round(s.duree || 0)), four: s.four || null, prechauffe: s.prechauffe || null
  }));
  for (const e of etapes) e.fixe = e.duree > 0;
  const temps = tache.temps || {};
  /* Un enfournement sans minuteur dure le temps de cuisson annoncé. */
  const cuisson = temps.cuisson || 0;
  const sansMinuteur = etapes.find(e => e.four && !e.fixe);
  if (sansMinuteur && cuisson) { sansMinuteur.duree = cuisson; sansMinuteur.fixe = true; }

  const total = (temps.prep || 0) + (temps.repos || 0) + (temps.cuisson || 0) + (tache.supplement || 0);
  const reste = Math.max(0, total - etapes.reduce((n, e) => n + e.duree, 0));
  const mains = etapes.filter(e => !e.fixe);
  if (reste && mains.length) {
    const part = Math.floor(reste / mains.length);
    mains.forEach((e, i) => { e.duree = part + (i === 0 ? reste - part * mains.length : 0); });
  } else if (reste && etapes.length) {
    etapes[0].duree += reste;                  // tout minuté : le surplus ouvre la recette
  } else if (reste) {
    etapes.push({ titre: tache.titre, duree: reste, four: null, fixe: false });
  }

  let t = 0;
  for (const e of etapes) {
    e.debut = t; t += e.duree; e.fin = t;
    e.libre = !!e.four || (e.fixe && e.duree >= SEUIL_LIBRE);
  }
  const aufour = etapes.filter(e => e.four);
  const four = aufour.length
    /* `temp` est la chaleur qu'il faut au four À L'ENTRÉE (préchauffage, conflits) ;
       `cuisson` celle de la cuisson, quand une recette préchauffe fort puis baisse
       (mi-cuit : 200 °C, puis 150 °C en enfournant). */
    ? { temp: Math.max(aufour[0].four, aufour[0].prechauffe || 0), cuisson: aufour[0].four, entree: aufour[0].debut, sortie: aufour[aufour.length - 1].fin }
    : null;
  return { etapes, duree: t, four };
}

/* Quand commencer. Chaque recette vise l'heure de table, pile. Si deux plats
   veulent le four à des températures différentes sur des créneaux qui se
   touchent, le plus chaud passe d'abord — un four redescend plus vite qu'il ne
   remonte — et se fait donc plus tôt, quitte à attendre à table. Si « maintenant »
   interdit de partir assez tôt, les plus tardifs glissent après lui : c'est le
   retard, annoncé tel quel. */
export function planifier({ table, maintenant = null, taches }) {
  const lignes = taches.map((t, i) => ({ i, t, ...chronologie(t), decalage: 0, retard: 0 }));
  for (const l of lignes) { l.debut = au5(table - l.duree); l.depart = l.debut; }

  const entree = l => l.debut + l.four.entree;
  const sortie = l => l.debut + l.four.sortie;
  const four = lignes.filter(l => l.four).sort((a, b) => b.four.temp - a.four.temp || a.i - b.i);
  const autreTemp = (a, b) => !memeChaleur(a.four.temp, b.four.temp);

  /* Les conflits se lisent sur la position de départ, avant toute correction. */
  const conflits = [];
  for (let j = 0; j < four.length; j++) {
    for (let k = j + 1; k < four.length; k++) {
      const [a, b] = [four[j], four[k]];
      if (!autreTemp(a, b)) continue;
      if (entree(a) < sortie(b) + MARGE_FOUR && entree(b) < sortie(a) + MARGE_FOUR) {
        /* Plusieurs plats à la même température contre le même premier ne font
           qu'un conflit : une seule phrase les nomme tous. */
        const second = { k: b.t.k, titre: b.t.titre, temp: b.four.temp };
        const groupe = conflits.find(c => c.premier.k === a.t.k && c.second.temp === second.temp);
        if (groupe) groupe.autres.push(second);
        else conflits.push({ premier: { k: a.t.k, titre: a.t.titre, temp: a.four.temp }, second, autres: [], decale: 0, retard: 0 });
      }
    }
  }

  /* De la fin vers le début : chacun s'écarte de tous ceux qui sont moins chauds. */
  for (let j = four.length - 2; j >= 0; j--) {
    let besoin = 0;
    for (let k = j + 1; k < four.length; k++) {
      if (autreTemp(four[j], four[k])) besoin = Math.max(besoin, sortie(four[j]) + MARGE_FOUR - entree(four[k]));
    }
    if (besoin > 0) four[j].debut -= sur5(besoin);
  }

  /* On ne remonte pas le temps : qui devrait partir avant « maintenant » part
     maintenant, et ceux qui attendent le four après lui suivent. */
  if (maintenant != null) {
    const depart = sur5(maintenant);
    for (const l of lignes) if (l.debut < depart) l.debut = depart;
    for (let j = 0; j < four.length; j++) {
      for (let k = j + 1; k < four.length; k++) {
        if (!autreTemp(four[j], four[k])) continue;
        const besoin = sortie(four[j]) + MARGE_FOUR - entree(four[k]);
        if (besoin > 0) four[k].debut += sur5(besoin);
      }
    }
  }

  for (const l of lignes) {
    l.fin = l.debut + l.duree;
    l.retard = Math.max(0, l.fin - table);
    l.avance = Math.max(0, table - l.fin);
    l.decalage = l.depart - l.debut;
  }
  for (const c of conflits) {
    const concernes = [c.premier, c.second, ...c.autres].map(x => lignes.find(l => l.t.k === x.k));
    c.decale = Math.max(0, concernes[0].decalage);
    c.retard = Math.max(...concernes.map(l => l.retard));
  }
  const retard = lignes.reduce((n, l) => Math.max(n, l.retard), 0);

  return {
    table, retard, tableReelle: table + retard, conflits,
    recettes: lignes.map(l => ({
      k: l.t.k, titre: l.t.titre, debut: l.debut, fin: l.fin, duree: l.duree,
      retard: l.retard, avance: l.avance, four: l.four ? { temp: l.four.temp, entree: l.debut + l.four.entree, sortie: l.debut + l.four.sortie } : null,
      etapes: l.etapes.map(e => ({ titre: e.titre, debut: l.debut + e.debut, fin: l.debut + e.fin, libre: e.libre }))
    })),
    evenements: evenements(lignes, table + retard)
  };
}

/* La frise : tout ce qui se passe, dans l'ordre. */
function evenements(lignes, table) {
  const ev = [];
  for (const l of lignes) {
    const { k, titre } = l.t;
    ev.push({ t: l.debut, type: "debut", k, titre });
    if (l.four) {
      ev.push({ t: l.debut + l.four.entree, type: "enfourner", k, titre, temp: l.four.cuisson ?? l.four.temp });
      ev.push({ t: l.debut + l.four.sortie, type: "sortir", k, titre, temp: l.four.temp });
    }
    if (l.fin <= table - 10 && !(l.four && l.fin === l.debut + l.four.sortie)) ev.push({ t: l.fin, type: "pret", k, titre });
  }

  /* Le four : allumé avant la première fournée, réglé à chaque changement de
     température, laissé tel quel quand le plat suivant a la même. */
  const fournees = lignes.filter(l => l.four).sort((a, b) => a.debut + a.four.entree - (b.debut + b.four.entree));
  let sortieVue = null, tempVue = null;
  for (const l of fournees) {
    const entree = l.debut + l.four.entree;
    if (sortieVue == null || entree - sortieVue > 2 * PRECHAUFFAGE) {
      ev.push({ t: Math.max(sortieVue ?? -Infinity, entree - dureePrechauffage(l.four.temp)), type: "prechauffage", temp: l.four.temp });
    } else if (!memeChaleur(l.four.temp, tempVue)) {
      ev.push({ t: Math.max(sortieVue, entree - MARGE_FOUR), type: "regler", temp: l.four.temp });
    }
    sortieVue = Math.max(sortieVue ?? -Infinity, l.debut + l.four.sortie);
    tempVue = l.four.temp;
  }
  ev.push({ t: table, type: "table" });

  /* Qui a les mains libres au moment où une recette démarre. */
  for (const e of ev) {
    if (e.type !== "debut") continue;
    e.parallele = lignes
      .filter(l => l.t.k !== e.k && l.etapes.some(s => s.libre && l.debut + s.debut <= e.t && e.t < l.debut + s.fin))
      .map(l => l.t.titre);
  }
  const ordre = { prechauffage: 0, regler: 1, sortir: 2, debut: 3, enfourner: 4, pret: 5, table: 6 };
  return ev.sort((a, b) => a.t - b.t || ordre[a.type] - ordre[b.type]);
}

/* ---------- Phrases ---------- */

export function texteEvenement(e) {
  const nom = nomCourt(e.titre);
  switch (e.type) {
    case "debut": return `Démarre : ${nom}`;
    case "prechauffage": return `Préchauffe le four à ${e.temp} °C`;
    case "regler": return `Règle le four à ${e.temp} °C`;
    case "enfourner": return `Enfourne : ${nom} (${e.temp} °C)`;
    case "sortir": return `Sors du four : ${nom}`;
    case "pret": return `Terminé en avance : ${nom}`;
    default: return "À table !";
  }
}

/* « Focaccia à 220 °C et Quiche lorraine à 180 °C en même temps : enfourne
   « Focaccia » d'abord. » Les titres restent entre guillemets : le genre d'un
   nom de plat ne se devine pas, et un article faux serait pire qu'aucun. */
export function phraseConflit(c) {
  const a = nomCourt(c.premier.titre);
  const noms = [c.second, ...(c.autres || [])].map(x => nomCourt(x.titre));
  const b = noms.length > 1 ? `${noms.slice(0, -1).join(", ")} et ${noms[noms.length - 1]}` : noms[0];
  const base = `${a} à ${c.premier.temp} °C et ${b} à ${c.second.temp} °C en même temps : enfourne « ${a} » d'abord`;
  if (c.retard > 0) return `${base}. Même ainsi l'heure n'est pas tenue : ${c.retard} min de retard.`;
  if (c.decale > 0) return `${base} : départ avancé de ${c.decale} min, l'heure est tenue.`;
  return `${base}.`;
}

export function phraseRetard(plan) {
  if (!plan.retard) return "";
  return `Pour ${heureFr(plan.table)}, il aurait fallu s'y mettre plus tôt : compte ${plan.retard} min de retard, à table vers ${heureFr(plan.tableReelle)}.`;
}

/* ---------- Le calendrier (.ics) ---------- */

/* RFC 5545 : le texte s'échappe, et les lignes se plient à 75 caractères. */
const ics = t => String(t ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

function plier(ligne) {
  /* RFC 5545 compte en octets : un « é » en pèse deux. */
  const octets = c => new TextEncoder().encode(c).length;
  const morceaux = [];
  let courant = "", poids = 0, max = 75;
  for (const c of ligne) {
    if (poids + octets(c) > max) { morceaux.push(courant); courant = ""; poids = 0; max = 74; }
    courant += c; poids += octets(c);
  }
  morceaux.push(courant);
  return morceaux.join("\r\n ");
}

const stampLocal = murales => {
  const { date, hh, mm } = decomposer(murales);
  return `${date.replaceAll("-", "")}T${deuxChiffres(hh)}${deuxChiffres(mm)}00`;
};

const FUSEAU = `BEGIN:VTIMEZONE
TZID:Europe/Paris
BEGIN:DAYLIGHT
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
TZNAME:CEST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
TZNAME:CET
DTSTART:19701025T030000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE`.replace(/\n/g, "\r\n");

/* Un événement par recette (du départ à la fin), un pour le préchauffage, un
   pour la table — chacun avec son rappel. `horodatage` : instant de création en
   UTC, « AAAAMMJJTHHMMSSZ », passé de l'extérieur pour que la fonction reste pure. */
export function icsRepas(plan, { horodatage, convives = null } = {}) {
  const lignes = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Carnet de cuisine//Repas//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-TIMEZONE:Europe/Paris", FUSEAU];
  let n = 0;
  const evenement = ({ debut, fin, titre, description, rappel }) => {
    n++;
    lignes.push(
      "BEGIN:VEVENT",
      `UID:carnet-${stampLocal(plan.table)}-${n}@carnet-cuisine`,
      `DTSTAMP:${horodatage}`,
      `DTSTART;TZID=Europe/Paris:${stampLocal(debut)}`,
      `DTEND;TZID=Europe/Paris:${stampLocal(Math.max(fin, debut + 5))}`,
      `SUMMARY:${ics(titre)}`,
      ...(description ? [`DESCRIPTION:${ics(description)}`] : []),
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${ics(titre)}`, `TRIGGER:-PT${rappel}M`, "END:VALARM",
      "END:VEVENT"
    );
  };
  for (const r of plan.recettes) {
    evenement({
      debut: r.debut, fin: r.fin, titre: `Cuisiner : ${nomCourt(r.titre)}`, rappel: 10,
      description: r.etapes.filter(e => e.titre).map(e => `${heureFr(e.debut)} · ${e.titre}`).join("\n")
    });
  }
  for (const e of plan.evenements.filter(x => x.type === "prechauffage" || x.type === "regler")) {
    evenement({ debut: e.t, fin: e.t + (e.type === "prechauffage" ? dureePrechauffage(e.temp) : PRECHAUFFAGE), titre: texteEvenement(e), rappel: 0 });
  }
  evenement({
    debut: plan.tableReelle, fin: plan.tableReelle + 90, titre: "À table !", rappel: 30,
    description: convives ? `${convives} convive${convives > 1 ? "s" : ""}` : ""
  });
  lignes.push("END:VCALENDAR");
  return lignes.map(plier).join("\r\n") + "\r\n";
}
