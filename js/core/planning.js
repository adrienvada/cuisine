/* Le rétroplanning d'un repas : à quelle heure commencer chaque recette pour que tout soit prêt à table, quand allumer le four, et ce qui coince quand deux plats n'ont pas la même température.

   Module pur : il ne lit ni l'état ni le DOM, il reçoit des tâches toutes faites
   (cf. tachesDuMenu dans core/menu.js) et rend des minutes. Toutes les heures sont
   des « minutes murales » : le nombre de minutes écoulées depuis une origine
   commune, lues sur l'horloge du mur, sans fuseau — la table à 20 h est à 20 h
   partout, et le calendrier la recevra en Europe/Paris. */

import { fmtTime, typo } from "./format.js";

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
   un passage au four, une cuisson qui mijote. En dessous d'un quart d'heure, on
   reste à côté — sauf un repos, qui libère les mains par nature (voir
   chronologie) ; au-delà du quart d'heure, il libère aussi la personne. */
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

/* Le jour où le repas aura lieu. Une date choisie et encore à venir fait foi —
   la date du jour dont l'heure est passée n'est plus à venir ; sinon c'est « la
   prochaine fois qu'il sera cette heure-là » — aujourd'hui si elle n'est pas
   passée, demain sinon. `maintenant` : { date, minutes } lus sur
   l'horloge de l'appareil. Rend aussi la minute murale de « maintenant » quand
   le repas est pour aujourd'hui (il bornera alors les départs), sinon null. */
export function instantTable({ date, heure }, maintenant) {
  const h = minutesDe(heure);
  if (h == null) return null;
  const ajd = minutesMurales(maintenant.date, 0);
  const choisie = date ? minutesMurales(date, 0) : null;
  let jour = choisie != null && (choisie > ajd || (choisie === ajd && h > maintenant.minutes)) ? date : null;
  if (!jour) jour = maintenant.minutes < h ? maintenant.date : decomposer(ajd + 1440).date;
  const table = minutesMurales(jour, h);
  return { date: jour, table, maintenant: jour === maintenant.date ? ajd + maintenant.minutes : null };
}

/* ---------- Noms ---------- */

/* Des noms qui ne disent pas de quoi on parle une fois seuls : « Salade » pour
   une salade de lentilles ou de pois chiches, « Pesto » pour le basilic ou la
   roquette. Deux salades au même repas deviendraient indiscernables dans une
   phrase de conflit ou dans la frise. */
const GENERIQUES = ["salade", "dip", "pesto", "velouté", "tartines", "mi-cuit"];

/* « Focaccia maison au romarin » → « Focaccia » : le début du titre, avant la
   première précision. Sert dans les phrases où le titre entier alourdirait.
   Un nom générique garde son complément : « Salade de lentilles ». */
export function nomCourt(titre) {
  const entier = String(titre || "");
  const coupe = entier.split(/\s*[,:(«&]\s*|\s+(?:maison|au|aux|à|de|du|des|façon|et)\s|\s+d['’]/i)[0].trim();
  if (GENERIQUES.includes(coupe.toLowerCase())) {
    const suite = /^\S+\s+((?:de|du|des|au|aux)\s+[^\s,;:()]+|d['’][^\s,;:()]+)/i.exec(entier);
    if (suite) return `${coupe} ${suite[1]}`;
  }
  return coupe || entier;
}

/* ---------- Le déroulé d'une recette ---------- */

/* Une tâche : { k, titre, temps: { prep, repos, cuisson }, supplement, etapes: [{ titre, duree, four, genre, libelle }] }
   `duree` est le minuteur de l'étape (0 sans minuteur), `four` la température
   où elle enfourne. `genre` dit ce que l'étape demande : « repos » (rien à faire :
   levée, marinade, trempage, congélateur), « four » (il chauffe), « travail » (le
   reste : les gestes, le feu qu'on surveille) — sans genre, il se déduit de `four`.
   `libelle` nomme un repos (« Levée »). Les temps de la recette disent combien
   dure le tout ; les minuteurs disent où se logent les attentes ; le reste,
   c'est du travail des mains, qu'on répartit sur les étapes sans minuteur. */
function chronologie(tache) {
  const etapes = (tache.etapes || []).map(s => ({
    titre: s.titre || "", duree: Math.max(0, Math.round(s.duree || 0)), four: s.four || null, prechauffe: s.prechauffe || null,
    genre: s.four ? "four" : s.genre === "repos" ? "repos" : "travail", libelle: s.libelle || ""
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
    etapes.push({ titre: tache.titre, duree: reste, four: null, genre: "travail", libelle: "", fixe: false });
  }

  let t = 0;
  for (const e of etapes) {
    e.debut = t; t += e.duree; e.fin = t;
    /* Libres : le four et un repos (les mains n'y sont pour rien), et une cuisson
       sur le feu de plus d'un quart d'heure — des lentilles qui mijotent ne
       demandent pas les mains, seulement de rester dans la cuisine. C'est ce
       qui distingue le « Temps libre » d'un repos (on peut s'absenter) du feu. */
    e.libre = e.genre !== "travail" || (e.fixe && e.duree >= SEUIL_LIBRE);
  }
  /* Le four n'est occupé que pendant les étapes qui chauffent : des étapes qui
     s'enchaînent font une seule plage, mais une quiche qui sort après la cuisson
     à blanc, le temps de garnir, libère le four entre ses deux passages — la
     préparation entre les deux n'est pas du four. `temp` est la chaleur qu'il
     faut au four À L'ENTRÉE de la plage (préchauffage, conflits) ; `cuisson` celle
     de la cuisson, quand une recette préchauffe fort puis baisse (mi-cuit :
     200 °C, puis 150 °C en enfournant). */
  const plages = [];
  for (const e of etapes) {
    if (!e.four) continue;
    const derniere = plages[plages.length - 1];
    if (derniere && derniere.sortie === e.debut) { derniere.sortie = e.fin; continue; }
    plages.push({ temp: Math.max(e.four, e.prechauffe || 0), cuisson: e.four, entree: e.debut, sortie: e.fin });
  }
  /* `four` garde l'enveloppe (première entrée, dernière sortie) : c'est ce que
     lisent les départs et la fin de la frise ; les conflits lisent les plages. */
  const four = plages.length
    ? { temp: plages[0].temp, cuisson: plages[0].cuisson, entree: plages[0].entree, sortie: plages[plages.length - 1].sortie, plages }
    : null;
  return { etapes, duree: t, four };
}

/* Quand commencer. Chaque recette vise l'heure de table, pile. Si deux plats
   veulent le four à des températures différentes sur des créneaux qui se
   touchent, le plus chaud passe d'abord — un four ménager monte plus vite qu'il
   ne redescend : on cuit le plus chaud, puis on baisse en entrouvrant la porte,
   comme le font les cuisiniers — et se fait donc plus tôt, quitte à attendre à
   table. Si « maintenant » interdit de partir assez tôt, les plus tardifs
   glissent après lui : c'est le retard, annoncé tel quel. */
export function planifier({ table, maintenant = null, taches }) {
  const lignes = taches.map((t, i) => ({ i, t, ...chronologie(t), decalage: 0, retard: 0 }));
  for (const l of lignes) { l.debut = au5(table - l.duree); l.depart = l.debut; }

  /* Deux plats se gênent quand l'une de leurs plages de four, décalée de leur
     départ, touche une plage de l'autre à moins de la marge. */
  const seGenent = (a, b) => a.four.plages.some(pa => b.four.plages.some(pb =>
    a.debut + pa.entree < b.debut + pb.sortie + MARGE_FOUR && b.debut + pb.entree < a.debut + pa.sortie + MARGE_FOUR));
  const four = lignes.filter(l => l.four).sort((a, b) => b.four.temp - a.four.temp || a.i - b.i);
  const autreTemp = (a, b) => !memeChaleur(a.four.temp, b.four.temp);

  /* Les conflits se lisent sur la position de départ, avant toute correction. */
  const conflits = [];
  for (let j = 0; j < four.length; j++) {
    for (let k = j + 1; k < four.length; k++) {
      const [a, b] = [four[j], four[k]];
      if (!autreTemp(a, b)) continue;
      if (seGenent(a, b)) {
        /* Plusieurs plats à la même température contre le même premier ne font
           qu'un conflit : une seule phrase les nomme tous. */
        const second = { k: b.t.k, titre: b.t.titre, temp: b.four.temp };
        const groupe = conflits.find(c => c.premier.k === a.t.k && c.second.temp === second.temp);
        if (groupe) groupe.autres.push(second);
        else conflits.push({ premier: { k: a.t.k, titre: a.t.titre, temp: a.four.temp }, second, autres: [], decale: 0, retard: 0 });
      }
    }
  }

  /* De la fin vers le début : chacun s'écarte de tous ceux qui sont moins chauds,
     du plus petit pas de cinq minutes qui libère le four (le plus chaud peut
     passer pendant que l'autre garnit, sans rien lui devoir de plus). */
  for (let j = four.length - 2; j >= 0; j--) {
    const gene = () => four.slice(j + 1).some(autre => autreTemp(four[j], autre) && seGenent(four[j], autre));
    while (gene()) four[j].debut -= PAS;
  }

  /* On ne remonte pas le temps : qui devrait partir avant « maintenant » part
     maintenant, et ceux qui attendent le four après lui suivent. */
  if (maintenant != null) {
    const depart = sur5(maintenant);
    for (const l of lignes) if (l.debut < depart) l.debut = depart;
    for (let j = 0; j < four.length; j++) {
      for (let k = j + 1; k < four.length; k++) {
        if (!autreTemp(four[j], four[k])) continue;
        /* Le plus chaud garde la priorité : celui qui suit attend la dernière
           sortie du premier, même si ses plages tombaient entre les siennes. */
        const besoin = four[j].debut + four[j].four.sortie + MARGE_FOUR - (four[k].debut + four[k].four.entree);
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
      /* Les passages au four, un par plage : c'est là, et là seulement, qu'il est occupé. */
      plagesFour: (l.four?.plages || []).map(p => ({ temp: p.temp, entree: l.debut + p.entree, sortie: l.debut + p.sortie })),
      etapes: l.etapes.map(e => ({ titre: e.titre, debut: l.debut + e.debut, fin: l.debut + e.fin, libre: e.libre, genre: e.genre, libelle: e.libelle }))
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
      for (const p of l.four.plages) {
        ev.push({ t: l.debut + p.entree, type: "enfourner", k, titre, temp: p.cuisson ?? p.temp });
        ev.push({ t: l.debut + p.sortie, type: "sortir", k, titre, temp: p.temp });
      }
    }
    if (l.fin <= table - 10 && !(l.four && l.fin === l.debut + l.four.sortie)) ev.push({ t: l.fin, type: "pret", k, titre });

    /* Les repos d'une recette, d'un seul tenant : trois attentes qui se suivent
       et portent le même nom (la levée de la focaccia : 120 + 20 + 30 min) ne
       font qu'un repos à la frise. Un geste entre deux les sépare, et un autre
       nom aussi — l'oignon qui trempe puis la vinaigrette qui macère sont deux
       attentes, pas une. */
    let courant = null;
    for (const e of l.etapes) {
      if (e.duree <= 0) continue;
      if (e.genre !== "repos") { courant = null; continue; }
      if (courant && courant.fin === l.debut + e.debut && courant.libelle === e.libelle) { courant.fin = l.debut + e.fin; courant.duree = courant.fin - courant.t; continue; }
      courant = { t: l.debut + e.debut, type: "repos", k, titre, fin: l.debut + e.fin, duree: e.duree, libelle: e.libelle };
      ev.push(courant);
    }
  }

  /* Le four : allumé avant la première fournée, réglé à chaque changement de
     température, laissé tel quel quand le plat suivant a la même. */
  const fournees = lignes.flatMap(l => (l.four?.plages || []).map(p => ({ temp: p.temp, entree: l.debut + p.entree, sortie: l.debut + p.sortie })))
    .sort((a, b) => a.entree - b.entree);
  let sortieVue = null, tempVue = null;
  for (const f of fournees) {
    if (sortieVue == null || f.entree - sortieVue > 2 * PRECHAUFFAGE) {
      ev.push({ t: Math.max(sortieVue ?? -Infinity, f.entree - dureePrechauffage(f.temp)), type: "prechauffage", temp: f.temp });
    } else if (!memeChaleur(f.temp, tempVue)) {
      ev.push({ t: Math.max(sortieVue, f.entree - MARGE_FOUR), type: "regler", temp: f.temp });
    }
    sortieVue = Math.max(sortieVue ?? -Infinity, f.sortie);
    tempVue = f.temp;
  }
  ev.push({ t: table, type: "table" });

  /* Le jour, relatif à celui de la table (0 : le jour même, -1 : la veille) : une
     marinade de 12 h fait commencer la veille, et l'heure seule ne le dirait pas. */
  const jourTable = jourDe(table);
  for (const e of ev) {
    e.jour = jourDe(e.t) - jourTable;
    if (e.fin != null) e.jourFin = jourDe(e.fin) - jourTable;
  }

  /* Qui a les mains libres au moment où une recette démarre. */
  for (const e of ev) {
    if (e.type !== "debut") continue;
    e.parallele = lignes
      .filter(l => l.t.k !== e.k && l.etapes.some(s => s.libre && l.debut + s.debut <= e.t && e.t < l.debut + s.fin))
      .map(l => l.t.titre);
  }
  const ordre = { prechauffage: 0, regler: 1, sortir: 2, debut: 3, repos: 3.5, enfourner: 4, pret: 5, table: 6 };
  return ev.sort((a, b) => a.t - b.t || ordre[a.type] - ordre[b.type]);
}

/* ---------- Phrases ---------- */

/* Le numéro du jour d'une minute murale : deux instants du même jour ont le même. */
const jourDe = murales => Math.floor(murales / 1440);

/* « la veille », « l'avant-veille », « 3 jours avant » : où tombe un jour relatif
   à celui de la table (0 : le jour même, rien à dire). */
export function jourRelatif(jour) {
  if (!jour) return "";
  if (jour === 1) return "le lendemain";
  if (jour === -1) return "la veille";
  if (jour === -2) return "l'avant-veille";
  return jour < 0 ? `${-jour} jours avant` : `${jour} jours après`;
}

/* Un repos n'est pas un geste : la ligne le dit en deux mots, le détail
   (detailRepos) dit combien de temps et jusqu'à quand. */
export function texteEvenement(e) {
  const nom = nomCourt(e.titre);
  switch (e.type) {
    case "repos": return `Repos : ${nom}`;
    case "debut": return `Démarre : ${nom}`;
    case "prechauffage": return `Préchauffe le four à ${e.temp} °C`;
    case "regler": return `Règle le four à ${e.temp} °C`;
    case "enfourner": return `Enfourne : ${nom} (${e.temp} °C)`;
    case "sortir": return `Sors du four : ${nom}`;
    case "pret": return `Terminé en avance : ${nom}`;
    default: return "À table !";
  }
}

/* Les lignes qui suivent un repos : « Levée : 2 h 50, jusqu'à 17 h 30 », puis ce
   qu'il libère. Passé un quart d'heure, on peut s'absenter ; en deçà, on reste à
   côté mais les mains sont libres. Quand le repos finit un autre jour que celui
   où il commence (la marinade du soir), on le dit. */
export function detailRepos(e) {
  const libelle = e.libelle && e.libelle.trim().toLowerCase() !== "repos" ? `${e.libelle} : ` : "";
  const autreJour = (e.jourFin ?? 0) - (e.jour ?? 0);
  const quand = autreJour ? `, ${jourRelatif(autreJour)}` : "";
  return [
    `${libelle}${fmtTime(e.duree)}, jusqu'à ${heureFr(e.fin)}${quand}`,
    e.duree >= SEUIL_LIBRE ? "Temps libre : tu peux t'absenter." : "Mains libres : reste à côté."
  ];
}

/* « À 220 °C pour Focaccia, 180 °C pour Quiche lorraine et Cake salé : enfourne
   Focaccia en premier. » Chaque plat se lit avec sa température, sans point-virgule
   ni guillemets imbriqués ; la tournure évite tout accord, car le genre et le nombre
   d'un nom de plat ne se devinent pas. Le retard n'est pas redit ici : le message
   de retard, juste dessous, l'annonce une fois pour tout le repas. */
export function phraseConflit(c) {
  const a = nomCourt(c.premier.titre);
  const noms = [c.second, ...(c.autres || [])].map(x => nomCourt(x.titre));
  const b = noms.length > 1 ? `${noms.slice(0, -1).join(", ")} et ${noms[noms.length - 1]}` : noms[0];
  const base = `À ${c.premier.temp} °C pour ${a}, ${c.second.temp} °C pour ${b} : enfourne ${a} en premier.`;
  if (c.retard > 0 || !(c.decale > 0)) return base;
  return `${base} Le départ est avancé de ${fmtTime(c.decale)}, l'heure est tenue.`;
}

export function phraseRetard(plan) {
  if (!plan.retard) return "";
  return `Pour ${heureFr(plan.table)}, il aurait fallu s'y mettre plus tôt : compte ${fmtTime(plan.retard)} de retard, à table vers ${heureFr(plan.tableReelle)}.`;
}

/* ---------- Le calendrier (.ics) ---------- */

/* RFC 5545 : le texte s'échappe, et les lignes se plient à 75 caractères. */
const ics = t => typo(String(t ?? "")).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

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
      /* Les repos ne sont pas des rendez-vous : le calendrier montre à quelle heure
         démarrer et la table, pas une alarme par attente. Ils se lisent dans la
         description, avec leur fin — c'est ce qu'on regarde pour savoir si l'on
         peut sortir. */
      description: r.etapes.filter(e => e.titre).map(e => e.genre === "repos"
        ? `${heureFr(e.debut)} · ${e.titre} (repos, jusqu'à ${heureFr(e.fin)})`
        : `${heureFr(e.debut)} · ${e.titre}`).join("\n")
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
