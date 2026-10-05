/* L'onglet Courses : la liste par rayon, son panier, le placard, l'ordre des rayons, la provenance des quantités, les articles libres et le partage.

   La liste ne se redessine pas d'un bloc quand on la touche : elle se met à jour sur
   place (synchroniser), pour que chaque ligne puisse se replier, se ranger ou arriver
   avec son mouvement. Le premier dessin, lui, reste un gabarit unique (renderCourses) ;
   les deux partent des mêmes fragments (blocs, ligne), donc ne peuvent pas diverger. */

import { buildCourseList, courseQtyStr, deplacerRayon, elaguerCoches, quantitesDe, rayonsOrdonnes, reinitialiserOrdreRayons } from "../core/courses.js";
import { save, state, surSauvegarde } from "../core/etat.js";
import { html, raw } from "../core/html.js";
import { ICON } from "../core/icones.js";
import { basiquesManquants, menuEntrees, resetHints } from "../core/menu.js";
import { annoncer } from "../ui/annonces.js";
import { garderFocus } from "../ui/focus.js";
import { glisser, relacher, vibrer } from "../ui/geste.js";
import { animer, annuler, flip, mouvementReduit, rebondir, rouler, sortir } from "../ui/mouvement.js";
import { shareOrCopy } from "../ui/partage.js";
import { app } from "../ui/routeur.js";
import { toast, updateBadge } from "../ui/toast.js";
import { balayageSupprime, creneauDeposer, decalagesDeposer, ordreApres, signature, vitesseDefilement } from "./courses-gestes.js";

/* L'élagage des coches doit tourner même quand l'onglet n'est pas affiché
   (on vide le menu depuis l'onglet Au menu) : il s'abonne donc au chargement de
   la vue, qui n'est jamais en cycle avec l'état au moment où elle s'évalue — ce
   que serait le module core/courses.js, importé par celui du menu. */
surSauvegarde(elaguerCoches);

/* Ce que la vue retient d'un dessin à l'autre : le mode de rangement, le panier
   ouvert ou fermé, les articles dont la provenance est dépliée. */
let modeRanger = false;
let panierOuvert = false;
const depliees = new Set();

/* Une coche se laisse voir avant que la ligne parte au panier : elle y reste 560 ms
   après le dernier geste (le tracé de la coche et du trait de crayon en demandent
   ~450), au plus 1,6 s pendant une rafale — rien ne glisse sous le pouce tant qu'on
   coche. `enAttente` : la place qu'avait chaque ligne touchée (true : au panier) ; la
   liste se range selon cette place-là, la coche, elle, est déjà celle de l'état. */
const ATTENTE = 560;
const ATTENTE_MAX = 1600;
const enAttente = new Map();
let minuteur = null;
let debutRafale = 0;

/* Les effets qui ne valent qu'une fois : la liste terminée (tant qu'elle ne redevient
   pas incomplète) et la branche d'olivier (une fois par session). */
let celebree = false;
let oliveTracee = false;

/* Chaque dessin complet l'incrémente : une sortie en cours (vider la liste) ne dessine
   pas par-dessus un dessin plus récent (un « Annuler » arrivé entre-temps). */
let generation = 0;

const CHEV_HAUT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>';
const CHEV_BAS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
const POIGNEE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="6" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18" r="1.7"/><circle cx="15" cy="18" r="1.7"/></svg>';

/* La coche et le trait de crayon sont des tracés (pathLength="1") : la feuille de style
   les dessine d'un trait en passant de décoché à coché, et les efface en plus court. */
const TICK = ICON.check.replace("<path ", '<path pathLength="1" ');
const RATURE = '<svg class="rature" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path pathLength="1" d="M1 4.7C13 3.3 22 6 38 4.4S66 2.9 99 4.2"/></svg>';

const articleLibre = nom => state.extras.push({ id: Date.now().toString(36), name: nom });

const versElement = texte => {
  const modele = document.createElement("template");
  modele.innerHTML = texte.trim();
  return modele.content.firstElementChild;
};

/* La branche d'olivier du bandeau, ILLO.D.olive rendue traçable sans toucher à
   js/illos.js : le rameau se dessine, puis les feuilles et les olives poussent. */
function oliveTracable() {
  let k = 0;
  return ILLO.D.olive
    .replace('<path d="M4 20', '<path pathLength="1" d="M4 20')
    // Chaque feuille entre dans un <g> qui, lui, pousse : l'ellipse porte déjà sa rotation (attribut transform).
    .replace(/<(ellipse|circle)\b[^>]*\/>/g, forme => `<g class="o-f" style="--k:${k++}">${forme}</g>`);
}

/* Redessine tout, sans perdre la place où l'on en était : le défilement, le focus
   clavier (la case cochée, le bouton de rayon déplacé) et ce qu'on était en train
   d'écrire dans le champ d'ajout. */
function redessiner({ arrivee = false } = {}) {
  generation++;
  const y = window.scrollY;
  const brouillon = document.getElementById("extra-input")?.value ?? "";
  garderFocus(app, () => dessiner(arrivee));
  const champ = document.getElementById("extra-input");
  if (champ && brouillon && !champ.value) champ.value = brouillon;
  window.scrollTo(0, y);
}

/* La liste telle qu'elle s'affiche : les articles en rayons à acheter, ceux du
   placard à part, ceux déjà cochés dans le panier. Les articles libres vont
   dans « Autre ». `placee` dit où est rangée une ligne (au panier ou pas) : l'état,
   sauf pour les lignes dont la coche vient d'être touchée et qui attendent de partir. */
const placee = i => enAttente.has(i.key) ? enAttente.get(i.key) : !!state.checked[i.key];

function composerListe() {
  const items = buildCourseList();
  const libres = state.extras.map(x => ({ key: "x-" + x.id, label: x.name, rayon: "Autre", extra: true, parts: [], textes: [], sources: [], notes: [] }));
  const aAcheter = [...items.filter(i => !i.placard), ...libres];
  const rayons = rayonsOrdonnes().map(rayon => ({
    rayon,
    items: aAcheter.filter(i => i.rayon === rayon && !placee(i))
  })).filter(g => g.items.length);
  const ordre = rayonsOrdonnes();
  const parRayon = (a, b) => ordre.indexOf(a.rayon) - ordre.indexOf(b.rayon);
  return {
    rayons,
    placard: items.filter(i => i.placard).sort(parRayon),
    panier: aAcheter.filter(placee).sort(parRayon),
    total: aAcheter.length,
    // Ce qui est coché, d'après l'état (et non d'après la place) : la barre avance au geste.
    faits: aAcheter.filter(i => state.checked[i.key]).length,
    // Les rayons qu'on peut ranger : ceux qui portent au moins un article, cochés ou non.
    rayonsPresents: ordre.filter(r => aAcheter.some(i => i.rayon === r))
  };
}

const complet = liste => liste.total > 0 && liste.faits === liste.total;

/* ---------- Les fragments : une ligne, un bloc ---------- */

/* Ce qui fait changer une ligne de contenu (et non de coche ni de provenance dépliée) :
   sa signature, posée sur l'élément, dit s'il faut la refaire. */
const signatureLigne = it => signature([it.key, it.label, !!it.extra, it.extra ? "" : courseQtyStr(it), it.addon, it.optional, it.notes, it.sources?.map(s => [s.titre, quantitesDe(s)])]);

function ligne(it, { coche = !!state.checked[it.key], ouvert = depliees.has(it.key) } = {}) {
  const nom = it.extra
    ? html`<span class="nom">${it.label}${raw(RATURE)}</span>`
    : html`<button type="button" class="nom" data-origine="${it.key}" aria-expanded="${String(ouvert)}">${it.label}${raw(RATURE)}</button>`;
  return html`
    <li class="art${it.extra ? " libre" : ""}${coche ? " cochee" : ""}" data-art="${it.key}" data-sig="${signatureLigne(it)}">
      ${it.extra ? raw(`<span class="fond-suppr" aria-hidden="true">Supprimer</span>`) : ""}
      <label>
        <input type="checkbox" data-key="${it.key}" ${coche ? raw("checked") : ""}>
        <span class="tick">${raw(TICK)}</span>
        <span class="lbl">${raw(nom)}${it.addon ? raw(` <span class="sup-tag">supplément</span>`) : ""}${it.optional ? raw(` <span class="opt">optionnel</span>`) : ""}${it.notes && it.notes.length ? raw(html`<span class="cnote">${it.notes.join(" · ")}</span>`) : ""}</span>
        <span class="cqty">${it.extra ? "" : courseQtyStr(it)}</span>
        ${it.extra ? raw(html`<button class="x" data-remove-extra="${it.key.slice(2)}" aria-label="Supprimer ${it.label}">✕</button>`) : ""}
      </label>
      ${it.extra ? "" : raw(html`<ul class="origine" ${ouvert ? "" : raw("hidden")}>${it.sources.map(s => raw(html`<li>${s.titre}${quantitesDe(s) ? ` — ${quantitesDe(s)}` : ""}</li>`))}</ul>`)}
    </li>`;
}

const FORMULAIRE = () => html`
  <form class="add-extra" id="extra-form">
    <input id="extra-input" type="text" placeholder="Ajouter un article (éponges, glaçons…)" autocomplete="off" aria-label="Ajouter un article">
    <button type="submit" aria-label="Ajouter">+</button>
  </form>`;

const menuLigne = ids => ids.length
  ? html`<p class="menu-ligne" data-n="${ids.length}"><span>${ids.length} recette${ids.length > 1 ? "s" : ""} au menu</span> · <a href="#/menu">Modifier</a></p>`
  : `<p class="menu-ligne" data-n="0">Articles ajoutés à la main</p>`;

const ENTETE = (termine, tracee) => html`
  <header class="page-head courses-head fade-in">
    <div class="head-branch${tracee ? " trace" : ""}">${raw(tracee ? oliveTracable() : ILLO.D.olive)}</div>
    <h1>Liste de courses</h1>
    <div class="tampon-fini${termine ? " pose" : ""}" aria-hidden="true">Tout est dans le panier</div>
  </header>`;

/* Les blocs de la liste, dans l'ordre où ils s'affichent. Chacun porte sa clé
   (data-bloc) et son empreinte (data-sig) : synchroniser reconnaît ainsi ceux qui sont
   déjà là. `items` : un bloc qui contient des lignes ; `fixe` : un bloc qu'on ne refait
   jamais (le formulaire garde ce qu'on y écrit). */
function blocs(liste) {
  const basiques = basiquesManquants();
  const nbCoches = Object.keys(state.checked).length;
  const rangeable = liste.rayonsPresents.filter(r => r !== "Autre").length >= 2;
  const bloc = (cle, texte, extra = {}) => {
    const sig = signature(texte);
    return { cle, sig, html: texte.replace(/^(\s*<\w+)/, `$1 data-bloc="${cle.replace(/"/g, "&quot;")}" data-sig="${sig}"`), ...extra };
  };
  const section = (cle, classe, titre, items, aide = "") => bloc(cle, html`
    <section class="rayon ${classe}">
      <h2>${titre}</h2>${raw(aide)}
      <ul class="course-list">${items.map(it => raw(ligne(it)))}</ul>
    </section>`, { items });
  const liste_ = [];
  if (liste.total) {
    const pct = Math.round(liste.faits / liste.total * 100);
    liste_.push(bloc("avance", html`
      <div class="avance-bloc">
        <div class="avance${complet(liste) ? " complete" : ""}" role="progressbar" aria-label="Avancement des courses" aria-valuemin="0" aria-valuemax="${liste.total}" aria-valuenow="${liste.faits}"><span style="clip-path:${clipBarre(pct)}"></span></div>
        <p class="avance-txt"><strong><span class="faits">${liste.faits}</span> / ${liste.total}</strong></p>
      </div>`, { fixe: true }));
  }
  if (liste.total || liste.placard.length) {
    liste_.push(bloc("outils", html`
      <div class="outils">
        ${rangeable ? raw(`<button type="button" class="lien-outil" data-ranger>Ranger les rayons</button>`) : ""}
        ${nbCoches ? raw(`<button type="button" class="lien-outil" data-decocher>Tout décocher</button>`) : ""}
      </div>`));
  }
  for (const g of liste.rayons) liste_.push(section("r:" + g.rayon, "", g.rayon, g.items));
  if (liste.total && !liste.rayons.length) liste_.push(bloc("fini", `<p class="fini">Tout est dans le panier.</p>`));
  if (liste.placard.length) {
    liste_.push(section("placard", "placard", "À vérifier au placard", liste.placard,
      `<p class="placard-aide">Coche ce que tu as déjà : ça ne compte pas dans ce qu'il te reste à acheter.</p>`));
  }
  if (liste.panier.length) {
    liste_.push(bloc("panier", html`
      <details class="panier" ${panierOuvert ? raw("open") : ""}>
        <summary>Dans le panier (<span class="compte">${liste.panier.length}</span>)</summary>
        <ul class="course-list">${liste.panier.map(it => raw(ligne(it)))}</ul>
      </details>`, { items: liste.panier }));
  }
  if (basiques.length) {
    liste_.push(bloc("hint", html`
      <p class="menu-hint">
        <span class="mh-txt">Pour la table, pense peut-être à</span>
        ${basiques.map(b => raw(html`<button class="mh-chip" data-basique="${b.article}">${b.chip}</button>`))}
        <button class="mh-x" data-hint-off aria-label="Ne plus proposer">✕</button>
      </p>`));
  }
  liste_.push(bloc("form", FORMULAIRE(), { fixe: true }));
  liste_.push(bloc("actions", `<div class="course-actions"><button class="btn secondary" id="share">${ICON.share} Partager la liste</button></div>`, { fixe: true }));
  liste_.push(bloc("clear", `<button class="link-danger" id="clear">Vider la liste</button>`, { fixe: true }));
  return liste_;
}

/* La barre se découvre de la gauche : un clip-path (animable sans toucher à la mise en
   page) plutôt qu'une largeur. */
const clipBarre = pct => `inset(0 ${100 - pct}% 0 0 round 999px)`;

function ecranRanger(liste) {
  const mobiles = liste.rayonsPresents.filter(r => r !== "Autre");
  const nb = r => liste.rayons.find(g => g.rayon === r)?.items.length ?? 0;
  const total = r => [...liste.panier].filter(i => i.rayon === r).length + nb(r);
  return html`
    <section class="ranger">
      <h2>Ranger les rayons</h2>
      <p class="ranger-aide">Mets-les dans l'ordre de ton magasin : la liste suivra ton parcours. Glisse la poignée, ou touche les flèches.</p>
      <ol class="ranger-liste">
        ${mobiles.map((r, i) => raw(html`
          <li data-r="${r}">
            <span class="poignee" aria-hidden="true">${raw(POIGNEE)}</span>
            <span class="r-nom">${r}<small>${total(r)} article${total(r) > 1 ? "s" : ""}</small></span>
            <button type="button" class="r-btn" data-deplacer="${r}" data-sens="-1" aria-label="Monter ${r}" ${i === 0 ? raw("disabled") : ""}>${raw(CHEV_HAUT)}</button>
            <button type="button" class="r-btn" data-deplacer="${r}" data-sens="1" aria-label="Descendre ${r}" ${i === mobiles.length - 1 ? raw("disabled") : ""}>${raw(CHEV_BAS)}</button>
          </li>`))}
        ${liste.rayonsPresents.includes("Autre") ? raw(html`<li class="r-fixe"><span class="r-nom">Autre<small>toujours en dernier</small></span></li>`) : ""}
      </ol>
      <div class="course-actions">
        <button type="button" class="btn primary" data-fin-ranger>Terminé</button>
      </div>
      <button type="button" class="link-danger" data-reinit-ordre>Remettre l'ordre d'origine</button>
    </section>`;
}

/* ---------- Le dessin complet ---------- */

export function renderCourses() {
  dessiner(false);
}

function dessiner(arrivee) {
  clearTimeout(minuteur);
  minuteur = null;
  debutRafale = 0;
  enAttente.clear();
  elaguerCoches();
  const ids = menuEntrees();
  const vide = !ids.length && !state.extras.length;
  const tracee = !oliveTracee;
  oliveTracee = true;

  if (vide) {
    modeRanger = false;
    celebree = false;
    app.innerHTML = html`
      <div id="courses-root" data-forme="vide">
      ${raw(ENTETE(false, tracee))}
      <div class="empty-illo cheers trace">${raw(ILLO.D.cheers.replace(/<path /g, '<path pathLength="1" '))}</div>
      <p class="empty">Ta liste est vide.<br>Ouvre une recette et touche <span class="nowrap">« Ajouter »</span> : les ingrédients se rangeront tout seuls par rayon, quantités fusionnées.<br>Ou ajoute directement un article ci-dessous.</p>
      <div style="text-align:center;margin-bottom:14px"><a class="btn-icon" href="#/">${raw(ICON.back)} Voir les recettes</a></div>
      ${raw(FORMULAIRE())}
      </div>`;
    brancher();
    arriver(arrivee);
    return;
  }

  const liste = composerListe();
  if (modeRanger && liste.rayonsPresents.filter(r => r !== "Autre").length < 2) modeRanger = false;
  // Déjà terminée à l'ouverture : le tampon est posé, sans fête (elle est pour le geste qui termine).
  celebree = complet(liste);

  app.innerHTML = html`
    <div id="courses-root" data-forme="${modeRanger ? "ranger" : "liste"}">
    ${raw(ENTETE(celebree, tracee))}
    ${raw(menuLigne(ids))}
    ${modeRanger
      ? raw(ecranRanger(liste))
      : raw(`<div id="courses-liste">${blocs(liste).map(b => b.html).join("")}</div>`)}
    </div>`;
  brancher();
  arriver(arrivee);
}

/* Le retour d'un écran à l'autre (liste ↔ rangement, liste vide ↔ liste) : les blocs
   arrivent en douceur, échelonnés. Jamais au premier affichage de la vue : la
   transition de vue du routeur s'en charge. */
function arriver(arrivee) {
  if (!arrivee) return;
  const racine = document.getElementById("courses-root");
  const cibles = [
    ...[...racine.children].filter(e => !e.matches(".courses-head, .menu-ligne, #courses-liste")),
    ...(document.getElementById("courses-liste")?.children ?? [])
  ];
  cibles.forEach((e, i) => {
    e.style.setProperty("--i", i);
    e.classList.add("arrive");
  });
}

/* ---------- La mise à jour sur place ---------- */

/* Un changement de forme (liste vide ↔ liste ↔ rangement) est un autre écran : on le
   redessine ; sinon la liste se met à jour sur place. */
function majListe() {
  const racine = document.getElementById("courses-root");
  if (!racine) return;
  const vide = !menuEntrees().length && !state.extras.length;
  const forme = vide ? "vide" : modeRanger ? "ranger" : "liste";
  if (forme !== "liste" || racine.dataset.forme !== "liste") { redessiner({ arrivee: racine.dataset.forme !== forme }); return; }
  garderFocus(app, synchroniser);
}

const vivants = parent => [...parent.children].filter(e => !e.dataset.sortant);

/* Pose `voulus` dans cet ordre sous `parent`, en ne déplaçant que ce qui n'est pas déjà
   à sa place (déplacer un élément, c'est lui faire perdre le focus). Les éléments qui
   sont en train de sortir restent où ils sont. */
function ordonner(parent, voulus) {
  let curseur = vivants(parent)[0] ?? null;
  const suivant = e => { let s = e.nextElementSibling; while (s?.dataset.sortant) s = s.nextElementSibling; return s; };
  for (const el of voulus) {
    if (el === curseur) curseur = suivant(curseur);
    else parent.insertBefore(el, curseur);
  }
}

/* Une ligne ou un bloc qui s'en va : plus de clé (les recherches par data-key et le
   rang du focus ne le voient plus), plus d'interaction, plus lu. */
function marquerSortant(el) {
  el.dataset.sortant = "1";
  el.inert = true;
  el.setAttribute("aria-hidden", "true");
  for (const e of [el, ...el.querySelectorAll("[data-key], [data-art], [data-origine], [data-remove-extra], [data-bloc]")]) {
    for (const a of ["data-key", "data-art", "data-origine", "data-remove-extra"]) e.removeAttribute(a);
  }
}

/* Sort `el` (sortir() le replie et le retire) ; `rang` échelonne une volée : 35 ms par
   élément, les huit premiers seulement, le reste part avec le dernier. */
function retirer(el, rang = 0) {
  if (!el.isConnected || !el.checkVisibility?.()) { marquerSortant(el); el.remove(); return Promise.resolve(true); }
  marquerSortant(el);
  if (!rang || mouvementReduit()) return sortir(el);
  return new Promise(fin => setTimeout(() => sortir(el).then(fin), Math.min(rang, 7) * 35));
}

function retirerBloc(el) {
  const lignes = [...el.querySelectorAll("li.art")].filter(l => l.checkVisibility?.());
  // Un panier ouvert qui se vide : les lignes partent en échelon, puis le panier se replie.
  if (el.matches("details.panier[open]") && lignes.length > 1) {
    marquerSortant(el);
    const sorties = lignes.map((l, i) => { l.dataset.sortant = "1"; return retirer(l, i); });
    return Promise.all(sorties).then(() => sortir(el));
  }
  return retirer(el);
}

/* Les éléments qui bougent d'un seul tenant quand la liste change : ses « feuilles »
   (jamais un conteneur ET son contenu, qui se déplaceraient deux fois). */
const FEUILLES = "li.art, .rayon > h2, .placard-aide, details.panier > summary, .avance-bloc, .outils, .fini, .menu-hint, .add-extra, .course-actions, #clear";
const feuillesDe = racine => [...racine.querySelectorAll(FEUILLES)].filter(e => !e.closest("[data-sortant]"));

function creerLigne(it) {
  const li = versElement(ligne(it));
  equiper(li);
  return li;
}

/* Les lignes d'un bloc rejoignent celles de `items` : celles qui n'y sont plus sortent,
   les nouvelles arrivent, les autres ne bougent que si leur contenu a changé. */
function synchroniserLignes(el, items) {
  const ul = el.querySelector(":scope > ul.course-list");
  const presentes = new Map(vivants(ul).map(li => [li.dataset.art, li]));
  const voulues = new Set(items.map(i => i.key));
  [...presentes].filter(([cle]) => !voulues.has(cle)).forEach(([, li], rang) => retirer(li, rang));
  const finales = items.map(it => {
    let li = presentes.get(it.key);
    if (li && li.dataset.sig !== signatureLigne(it)) {
      const neuve = creerLigne(it);
      li.replaceWith(neuve);
      li = neuve;
    } else if (!li) {
      li = creerLigne(it);
    } else if (!enAttente.has(it.key)) {
      // La coche d'une ligne qui n'a pas bougé de place (le placard, ou un « Annuler ») suit l'état.
      const coche = !!state.checked[it.key];
      li.classList.toggle("cochee", coche);
      li.querySelector("input").checked = coche;
    }
    return li;
  });
  ordonner(ul, finales);
  const compte = el.querySelector(".compte");
  if (compte) rouler(compte, items.length);
}

/* Les blocs de la liste rejoignent ceux de `voulus` : un bloc absent sort (un rayon
   dont le dernier article est parti au panier se replie avec son titre), un nouveau
   arrive, un bloc de lignes se met à jour sur place, un autre est refait si son
   contenu a changé. */
function appliquerBlocs(racine, voulus) {
  const presents = new Map(vivants(racine).map(b => [b.dataset.bloc, b]));
  const gardes = new Set(voulus.map(b => b.cle));
  const finaux = voulus.map(b => {
    let el = presents.get(b.cle);
    if (!el) {
      el = versElement(b.html);
      el.querySelectorAll("li.art").forEach(equiper);
    } else if (b.items) {
      synchroniserLignes(el, b.items);
    } else if (!b.fixe && el.dataset.sig !== b.sig) {
      const neuf = versElement(b.html);
      el.replaceWith(neuf);
      el = neuf;
    }
    return el;
  });
  [...presents].filter(([cle]) => !gardes.has(cle)).forEach(([, el]) => retirerBloc(el));
  ordonner(racine, finaux);
}

/* Un nom qui passe sur plusieurs lignes ne peut pas être barré d'un seul trait de
   crayon (il tomberait entre deux lignes) : il garde un line-through, que la feuille de
   style pose à sa place (.multi). Mesuré en une passe de lecture, puis une d'écriture. */
function marquerMultiligne(racine) {
  const noms = [...racine.querySelectorAll(".nom")].filter(n => n.checkVisibility?.());
  const longs = noms.map(n => {
    const c = getComputedStyle(n);
    const haut = n.offsetHeight - parseFloat(c.paddingTop) - parseFloat(c.paddingBottom);
    return haut > parseFloat(c.lineHeight) * 1.5;
  });
  noms.forEach((n, i) => n.classList.toggle("multi", longs[i]));
}

function synchroniser() {
  elaguerCoches();
  const racine = document.getElementById("courses-liste");
  const liste = composerListe();
  const ids = menuEntrees();
  const ml = racine.parentElement.querySelector(":scope > .menu-ligne");
  if (ml && ml.dataset.n !== String(ids.length)) ml.replaceWith(versElement(menuLigne(ids)));
  flip(() => feuillesDe(racine), () => { appliquerBlocs(racine, blocs(liste)); marquerMultiligne(racine); });
  majProgression(liste);
}

/* ---------- Progression, liste terminée ---------- */

/* La barre avance avec un ressort, le compteur roule ; quand tout est coché, la barre
   devient or, un tampon se pose sur le bandeau, les herbes s'envolent — une seule fois
   par liste terminée, et seulement pour le geste qui la termine. */
function majProgression(liste, { geste = false } = {}) {
  const bloc = document.querySelector("#courses-liste > .avance-bloc:not([data-sortant])");
  if (bloc) {
    const barre = bloc.querySelector(".avance");
    const trait = barre.firstElementChild;
    const pct = Math.round(liste.faits / liste.total * 100);
    const avant = Math.round(Number(barre.getAttribute("aria-valuenow")) / Number(barre.getAttribute("aria-valuemax")) * 100);
    if (avant !== pct || !trait.style.clipPath) {
      // Écrire l'arrivée, puis partir de l'image visible : l'animation est le chemin, pas l'état.
      const depart = getComputedStyle(trait).clipPath;
      trait.style.clipPath = clipBarre(pct);
      if (avant !== pct) animer(trait, [{ clipPath: depart }], { easing: "ressort", cle: "barre" });
    }
    barre.setAttribute("aria-valuemax", String(liste.total));
    barre.setAttribute("aria-valuenow", String(liste.faits));
    barre.classList.toggle("complete", complet(liste));
    const faits = bloc.querySelector(".faits");
    if (faits.textContent !== String(liste.faits)) rouler(faits, liste.faits);
    const total = faits.nextSibling;
    if (total && total.textContent !== ` / ${liste.total}`) total.textContent = ` / ${liste.total}`;
  }
  const tampon = document.querySelector(".tampon-fini");
  if (complet(liste) && !celebree) {
    celebree = true;
    if (tampon) {
      tampon.classList.add("pose");
      if (geste) celebrer(tampon);
    }
  } else if (!complet(liste)) {
    celebree = false;
    if (tampon?.classList.contains("pose")) retirerTampon(tampon);
  }
}

/* Le tampon tombe, les herbes s'envolent ; les effets se chargent à la demande, jamais
   avant la première liste terminée. En mouvement réduit : le tampon est simplement là
   (la classe .pose) ; la vibration, elle, suit son réglage. */
function celebrer(tampon) {
  annoncer("Courses terminées : tout est dans le panier.");
  import("../ui/effets.js").then(({ feuilles, tampon: poser }) => {
    if (!tampon.isConnected) return;
    poser(tampon);
    feuilles(tampon);
  }).catch(() => {});
}

function retirerTampon(tampon) {
  tampon.classList.remove("pose");
  animer(tampon, [{ opacity: 1 }, { opacity: 0 }], { duree: "courte", easing: "entree", cle: "tampon" })
    .then(() => { tampon.removeAttribute("style"); });
}

/* ---------- Actions ---------- */

/* Ce qu'on peut défaire d'un geste : un message avec « Annuler » plutôt qu'une
   confirmation qui coupe la course. */
function viderListe() {
  const avant = { menu: structuredClone(state.menu), checked: { ...state.checked }, extras: structuredClone(state.extras), hint: state.hintCoursesOff };
  state.menu = []; state.checked = {}; state.extras = [];
  resetHints();
  save(); updateBadge(); depliees.clear();
  enAttente.clear();
  clearTimeout(minuteur);
  evacuer();
  toast("Liste vidée", {
    action: "Annuler",
    surAction: () => {
      state.menu = avant.menu; state.checked = avant.checked; state.extras = avant.extras;
      state.hintCoursesOff = avant.hint;
      save(); updateBadge(); majListe();
    }
  });
}

/* Les blocs partent en échelon (huit au plus, 35 ms entre deux), puis la liste vide
   arrive, son illustration se trace. Un « Annuler » pendant la sortie redessine la liste
   (generation) : la sortie ne dessine pas par-dessus. */
function evacuer() {
  const racine = document.getElementById("courses-liste");
  const gen = ++generation;
  if (!racine) { redessiner({ arrivee: true }); return; }
  const partants = vivants(racine).filter(b => b.dataset.bloc !== "form");
  Promise.all(partants.map((b, i) => retirer(b, i))).then(() => {
    if (generation === gen) redessiner({ arrivee: true });
  });
}

function supprimerArticleLibre(id) {
  const i = state.extras.findIndex(x => x.id === id);
  if (i < 0) return;
  const [x] = state.extras.splice(i, 1);
  const cle = "x-" + id;
  const etaitCoche = !!state.checked[cle];
  delete state.checked[cle];
  enAttente.delete(cle);
  save(); updateBadge(); majListe();
  toast(`« ${x.name} » retiré`, {
    action: "Annuler",
    surAction: () => {
      state.extras.splice(Math.min(i, state.extras.length), 0, x);
      if (etaitCoche) state.checked[cle] = true;
      save(); updateBadge(); majListe();
    }
  });
}

function toutDecocher() {
  const avant = { ...state.checked };
  state.checked = {};
  enAttente.clear();
  save(); updateBadge(); majListe();
  toast("Tout est décoché", {
    action: "Annuler",
    surAction: () => { state.checked = avant; save(); updateBadge(); majListe(); }
  });
}

function brancher() {
  const root = document.getElementById("courses-root");
  root.addEventListener("change", surCoche);
  root.addEventListener("click", surClic);
  root.addEventListener("submit", surAjout);
  root.addEventListener("toggle", e => {
    if (e.target.matches("details.panier")) panierOuvert = e.target.open;
  }, true);
  root.querySelectorAll("li.art").forEach(equiper);
  marquerMultiligne(root);
  const ranger = root.querySelector(".ranger-liste");
  if (ranger) equiperRanger(ranger);
}

/* Le formulaire ne se redessine jamais : il garde le focus et ce qu'on y écrit. */
function surAjout(e) {
  if (!e.target.matches("#extra-form")) return;
  e.preventDefault();
  const champ = document.getElementById("extra-input");
  const v = champ.value.trim();
  if (!v) { secouerChamp(champ); return; }
  articleLibre(v);
  save(); updateBadge();
  vibrer("tic");
  champ.value = "";
  // Le champ se vide avec un petit retour, le bouton répond ; le champ garde le focus pour enchaîner les articles.
  animer(champ, [{ scale: "0.985" }], { duree: "courte", easing: "ressort-vif", cle: "retour" });
  rebondir(e.target.querySelector("button"));
  majListe();
  document.getElementById("extra-input")?.focus({ preventScroll: true });
}

const secouerChamp = champ => animer(champ, [{ translate: "-5px 0" }, { translate: "4px 0" }, { translate: "0 0" }], { duree: "moyenne", easing: "standard", cle: "secoue" });

/* La coche se voit tout de suite (le rond se remplit, la coche et le trait de crayon se
   tracent : c'est la feuille de style, au changement de l'état de la case) ; la ligne,
   elle, ne part au panier qu'après un temps de repos (ATTENTE), et toutes ensemble
   quand on coche en rafale. */
function surCoche(e) {
  const cb = e.target.closest("input[data-key]");
  if (!cb) return;
  const cle = cb.dataset.key;
  const li = cb.closest("li.art");
  if (cb.checked) state.checked[cle] = true;
  else delete state.checked[cle];
  save(); updateBadge();
  li.classList.toggle("cochee", cb.checked);
  const liste = composerListe();
  const termine = complet(liste) && !celebree;
  vibrer(termine ? "succes" : "tic");
  majProgression(liste, { geste: true });
  // Le placard ne se range pas : ses lignes restent en place, cochées ou non.
  if (li.closest(".placard")) return;
  const depart = enAttente.has(cle) ? enAttente.get(cle) : !cb.checked;
  if (depart === cb.checked) enAttente.delete(cle);
  else enAttente.set(cle, depart);
  planifier();
}

function planifier() {
  clearTimeout(minuteur);
  minuteur = null;
  if (!enAttente.size) { debutRafale = 0; return; }
  if (mouvementReduit()) { ranger(); return; }
  const maintenant = performance.now();
  debutRafale ||= maintenant;
  minuteur = setTimeout(ranger, Math.max(0, Math.min(ATTENTE, debutRafale + ATTENTE_MAX - maintenant)));
}

/* Le temps de repos est passé : les lignes touchées rejoignent leur place. */
function ranger() {
  clearTimeout(minuteur);
  minuteur = null;
  debutRafale = 0;
  enAttente.clear();
  majListe();
}

/* ---------- La provenance d'un article : un volet qui s'ouvre en hauteur ---------- */

const FERME = { height: "0px", paddingTop: "0px", paddingBottom: "0px", marginBottom: "0px", opacity: 0 };
const etatVolet = el => {
  const s = getComputedStyle(el);
  return { height: s.height, paddingTop: s.paddingTop, paddingBottom: s.paddingBottom, marginBottom: s.marginBottom, opacity: s.opacity };
};

/* Le volet part de là où il est (on peut le rouvrir à mi-fermeture) et va à sa hauteur
   naturelle, mesurée une fois l'animation en cours retirée. La hauteur est animée ici,
   exceptionnellement : le contenu d'en dessous doit suivre ; c'est un volet de quelques
   lignes. */
function basculerVolet(volet, ouvrir) {
  const depart = volet.hidden ? FERME : etatVolet(volet);
  annuler(volet, "volet");
  if (ouvrir) {
    volet.hidden = false;
    animer(volet, [depart, { ...etatVolet(volet), opacity: 1 }], { duree: "moyenne", easing: "sortie", cle: "volet", reprise: false });
  } else {
    animer(volet, [depart, FERME], { duree: "courte", easing: "entree", cle: "volet", reprise: false })
      .then(ok => { if (ok) volet.hidden = true; });
  }
}

function surClic(e) {
  const t = e.target;
  const origine = t.closest("[data-origine]");
  if (origine) {
    e.preventDefault();
    const cle = origine.dataset.origine;
    const ouvert = !depliees.has(cle);
    if (ouvert) depliees.add(cle); else depliees.delete(cle);
    origine.setAttribute("aria-expanded", String(ouvert));
    basculerVolet(origine.closest("li.art").querySelector(".origine"), ouvert);
    return;
  }
  const bas = t.closest("[data-basique]");
  if (bas) {
    articleLibre(bas.dataset.basique);
    save(); updateBadge(); vibrer("tic"); majListe();
    return;
  }
  if (t.closest("[data-hint-off]")) { state.hintCoursesOff = true; save(); majListe(); return; }
  const rx = t.closest("[data-remove-extra]");
  if (rx) {
    e.preventDefault();
    supprimerArticleLibre(rx.dataset.removeExtra);
    return;
  }
  if (t.closest("[data-decocher]")) { toutDecocher(); return; }
  if (t.closest("#share")) { shareList(); return; }
  if (t.closest("#clear")) { viderListe(); return; }
  /* Le bouton qu'on vient de toucher disparaît avec son écran : le focus passe à son pendant. */
  if (t.closest("[data-ranger]")) {
    modeRanger = true; redessiner({ arrivee: true });
    document.querySelector("[data-fin-ranger]")?.focus({ preventScroll: true });
    return;
  }
  if (t.closest("[data-fin-ranger]")) {
    modeRanger = false; redessiner({ arrivee: true }); window.scrollTo(0, 0);
    document.querySelector("[data-ranger]")?.focus({ preventScroll: true });
    return;
  }
  if (t.closest("[data-reinit-ordre]")) { reinitialiserOrdreRayons(); ordonnerRanger(); return; }
  const dep = t.closest("[data-deplacer]");
  if (dep) {
    deplacerRayon(dep.dataset.deplacer, Number(dep.dataset.sens), composerListe().rayonsPresents);
    // Le doigt reste sur le rayon qu'il déplace : garderFocus lui rend le même bouton (ou son pendant, au bout de la liste).
    ordonnerRanger();
  }
}

/* ---------- Ranger les rayons ---------- */

/* Les rayons prennent l'ordre de l'état : ils glissent à leur nouvelle place (flip), et
   les flèches du premier et du dernier se désactivent. Rien n'est redessiné. */
function ordonnerRanger() {
  const ol = document.querySelector(".ranger-liste");
  if (!ol) return;
  const mobiles = composerListe().rayonsPresents.filter(r => r !== "Autre");
  garderFocus(app, () => flip(ol, () => {
    const parNom = new Map([...ol.querySelectorAll(":scope > li[data-r]")].map(li => [li.dataset.r, li]));
    ordonner(ol, mobiles.map(r => parNom.get(r)));
    mobiles.forEach((r, i) => {
      const li = parNom.get(r);
      li.querySelector('[data-sens="-1"]').disabled = i === 0;
      li.querySelector('[data-sens="1"]').disabled = i === mobiles.length - 1;
    });
  }));
}

/* Glisser-déposer au doigt : la poignée soulève la ligne, les autres s'écartent à
   mesure qu'elle passe, elle se pose au créneau le plus proche avec la vitesse du doigt.
   Près d'un bord de la fenêtre, la page défile (une boucle d'image seulement tant que le
   doigt est dans la zone du bord). Les flèches restent la voie du clavier. */
function equiperRanger(ol) {
  for (const poignee of ol.querySelectorAll(".poignee")) {
    const li = poignee.closest("li");
    let g = null;
    const maj = () => {
      const y = Math.max(g.min, Math.min(g.max, g.y + window.scrollY - g.defile0));
      li.style.translate = `0 ${y}px`;
      const cible = creneauDeposer(g.tops, g.hauteurs, g.depart, y);
      if (cible !== g.cible) {
        g.cible = cible;
        const decalages = decalagesDeposer(g.tops, g.hauteurs, g.depart, cible);
        g.lis.forEach((autre, i) => { if (i !== g.depart) relacher(autre, { x: 0, y: decalages[i] }, { x: 0, y: 0 }, { cle: "decale" }); });
      }
    };
    const defiler = () => {
      if (!g) return;
      g.raf = 0;
      if (!g.v) return;
      window.scrollBy(0, g.v);
      maj();
      g.raf = requestAnimationFrame(defiler);
    };
    const suivre = e => {
      if (!g) return;
      g.v = vitesseDefilement(e.clientY, 0, window.innerHeight - 64);
      if (g.v && !g.raf) g.raf = requestAnimationFrame(defiler);
    };
    glisser(poignee, {
      axe: "y",
      elastique: false,
      appliquer: false,
      seuil: 4,
      surDebut: () => {
        const lis = [...ol.querySelectorAll(":scope > li[data-r]")];
        const rects = lis.map(l => l.getBoundingClientRect());
        const haut = window.scrollY;
        const tops = rects.map(r => r.top + haut);
        const depart = lis.indexOf(li);
        g = { lis, depart, cible: depart, tops, hauteurs: rects.map(r => r.height), y: 0, defile0: haut, v: 0, raf: 0, min: tops[0] - tops[depart], max: tops[tops.length - 1] - tops[depart] };
        li.classList.add("en-main");
        vibrer("tic");
        poignee.addEventListener("pointermove", suivre);
      },
      surDeplacement: ({ y }) => { if (g) { g.y = y; maj(); } },
      surFin: ({ vy, annule }) => {
        if (!g) return;
        const fini = g;
        g = null;
        cancelAnimationFrame(fini.raf);
        poignee.removeEventListener("pointermove", suivre);
        const cible = annule ? fini.depart : fini.cible;
        const decalages = decalagesDeposer(fini.tops, fini.hauteurs, fini.depart, cible);
        fini.lis.forEach((autre, i) => { if (i !== fini.depart) relacher(autre, { x: 0, y: decalages[i] }, { x: 0, y: 0 }, { cle: "decale" }); });
        relacher(li, { x: 0, y: decalages[fini.depart] }, { x: 0, y: vy }).then(() => {
          // Posée : l'état prend le nouvel ordre, les décalages s'effacent là où l'ordre du DOM les rend inutiles.
          if (cible !== fini.depart) {
            const presents = composerListe().rayonsPresents;
            const sens = cible > fini.depart ? 1 : -1;
            for (let n = Math.abs(cible - fini.depart); n > 0; n--) deplacerRayon(fini.lis[fini.depart].dataset.r, sens, presents);
          }
          const nouvel = ordreApres(fini.lis.length, fini.depart, cible).map(i => fini.lis[i]);
          fini.lis.forEach(l => { annuler(l, "decale"); annuler(l, "relache"); l.style.translate = ""; });
          ordonner(ol, nouvel);
          li.classList.remove("en-main");
          ol.querySelectorAll(":scope > li[data-r]").forEach((l, i, tous) => {
            l.querySelector('[data-sens="-1"]').disabled = i === 0;
            l.querySelector('[data-sens="1"]').disabled = i === tous.length - 1;
          });
        });
      }
    });
  }
}

/* ---------- Glisser une ligne libre vers la gauche pour la supprimer ---------- */

const equipees = new WeakSet();

function equiper(li) {
  if (!li.classList.contains("libre") || equipees.has(li)) return;
  equipees.add(li);
  const face = li.querySelector("label");
  const fin = () => { li.classList.remove("en-main"); li.style.removeProperty("--glisse"); };
  glisser(face, {
    axe: "x",
    seuil: 8,
    limites: () => ({ x: [-li.offsetWidth, 0] }),
    surDebut: () => li.classList.add("en-main"),
    surDeplacement: ({ x }) => li.style.setProperty("--glisse", Math.min(1, -x / 72).toFixed(2)),
    surFin: ({ x, vx, annule }) => {
      const id = li.querySelector("[data-remove-extra]")?.dataset.removeExtra;
      if (annule || !id || !balayageSupprime({ x, vx, largeur: li.offsetWidth })) {
        // Pas assez : la ligne revient avec un ressort.
        if (!annule) relacher(face, { x: 0, y: 0 }, { x: vx, y: 0 }).then(fin);
        else fin();
        return;
      }
      // Elle sort de l'écran avec la vitesse du doigt, puis l'article est retiré ; le « Annuler » du message la rend à sa place.
      relacher(face, { x: -(li.offsetWidth + 24), y: 0 }, { x: vx, y: 0 }).then(() => {
        li.style.visibility = "hidden";
        face.style.translate = "";
        fin();
        supprimerArticleLibre(id);
      });
    }
  });
}

function shareList() {
  elaguerCoches();
  const liste = composerListe();
  const lines = ["🛒 Liste de courses — Carnet de cuisine", ""];
  const ids = menuEntrees();
  if (ids.length) {
    lines.push("Menu : " + ids.map(({ r }) => r.title).join(", "), "");
  }
  const bloc = (titre, items) => {
    if (!items.length) return;
    lines.push(titre.toUpperCase());
    for (const it of items) {
      const q = it.parts.length || it.textes.length ? ` — ${courseQtyStr(it)}` : "";
      lines.push(`• ${it.label}${q}`);
    }
    lines.push("");
  };
  for (const g of liste.rayons) bloc(g.rayon, g.items);
  bloc("À vérifier", liste.placard.filter(i => !state.checked[i.key]));
  shareOrCopy({ title: "Liste de courses", text: lines.join("\n").trim() }, "Liste copiée !");
}
