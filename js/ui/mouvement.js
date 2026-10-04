/* Les aides du mouvement, utilisables partout (une vue qui s'en sert l'importe ; il
   n'est pas sur le chemin de l'accueil, et les effets lourds sont dans effets.js, chargé
   à la demande). Toutes passent par le Web Animations API, avec les
   jetons de css/base.css (js/core/ressort.js en est la source côté JS).

   Règles communes : en mouvement réduit rien ne bouge (l'état final s'applique, la
   promesse se résout tout de suite) ; une promesse ne rejette jamais ; aucune
   animation ne fige un style (pas de fill: forwards qui dure) ; on anime `translate`,
   `scale`, `rotate` (propriétés individuelles, qui se composent avec `transform`) et
   `opacity`. Le détail et un exemple par aide : README, section « Mouvement ». */

import { COURBES, DUREES, PRESETS, REPLIS_RESSORT, ressort } from "../core/ressort.js";
import { mouvementReduit } from "./theme.js";

/* Un seul mécanisme pour toute l'appli : REDUCE_MOTION de theme.js (liste de médias
   vivante, toujours à jour si la préférence change en cours d'usage). */
export { mouvementReduit };

/* ---------- Durées et courbes par leur nom ---------- */

const NOMS_RESSORT = { ressort: "doux", "ressort-vif": "vif", "ressort-rebond": "rebond" };
const LINEAR_OK = typeof CSS !== "undefined" && !!CSS.supports?.("transition-timing-function", "linear(0, 1)");
const calculs = {};

/* Le ressort d'un préréglage, calculé une fois ; { duree, courbe } avec le repli
   cubic-bezier quand linear() n'existe pas. */
function ressortNomme(nom, vitesse = 0) {
  const r = vitesse ? ressort({ ...PRESETS[nom], vitesse }) : (calculs[nom] ??= ressort(nom));
  return { duree: r.duree, courbe: LINEAR_OK ? r.lineaire : REPLIS_RESSORT[nom] };
}

const courbe = nom => COURBES[nom] ?? (NOMS_RESSORT[nom] ? ressortNomme(NOMS_RESSORT[nom]).courbe : nom);

/* ---------- animer ---------- */

const vivantes = new WeakMap();   // élément → Map(cle → { anim, props })
const RESERVEES = new Set(["offset", "easing", "composite"]);
const proprietes = images => [...new Set(images.flatMap(i => Object.keys(i)))].filter(k => !RESERVEES.has(k));

function poser(el, image) {
  for (const k of Object.keys(image)) if (!RESERVEES.has(k)) el.style[k] = image[k];
}

/* animer(el, images, options) — images : un tableau d'images clés WAAPI. Avec deux
   images ou plus, la dernière est l'état d'arrivée. Avec UNE seule, c'est le point de
   départ : l'arrivée est le style normal de l'élément (une entrée, un retour).
   Options : duree (ms ou nom : appui, courte, moyenne, longue, trace), easing (sortie,
   entree, standard, ressort, ressort-vif, ressort-rebond, ou une chaîne CSS), delai,
   cle (défaut « defaut »), garder, reprise, pseudoElement, et toute option WAAPI.
   - Une nouvelle animation de même `cle` sur le même élément remplace la précédente
     et repart de l'état VISIBLE (reprise : les propriétés qu'elle animait déjà
     prennent leur valeur actuelle comme première image), donc sans saut.
   - À la fin, le style normal reprend ; avec `garder: true`, l'état final est écrit
     dans l'attribut style (commitStyles) : pour un état qui doit rester (un tampon
     incliné), pas pour une entrée.
   - La promesse se résout à true si l'animation va au bout, à false si elle est
     interrompue ; elle ne rejette jamais. */
export function animer(el, images, options = {}) {
  const { cle = "defaut", garder = false, reprise = true, duree, delai, easing = "sortie", ...autres } = options;
  const liste = Array.isArray(images) ? (images.length === 1 ? [{ ...images[0], offset: 0 }] : images) : null;
  const parCle = vivantes.get(el) ?? vivantes.set(el, new Map()).get(el);
  const avant = parCle.get(cle);
  let frames = liste ?? images;
  if (avant) {
    // Lire l'état visible AVANT d'annuler : après, il est déjà revenu au style normal.
    if (reprise && liste && !mouvementReduit()) {
      const style = getComputedStyle(el, autres.pseudoElement);
      frames = liste.map((f, i) => i ? f : Object.fromEntries(Object.entries(f).map(([k, v]) => [k, avant.props.has(k) ? style[k] : v])));
    }
    avant.anim.cancel();
    parCle.delete(cle);
  }
  if (mouvementReduit()) {
    if (garder && liste?.length > 1 && !autres.pseudoElement) poser(el, liste[liste.length - 1]);
    return Promise.resolve(true);
  }
  const ressortChoisi = NOMS_RESSORT[easing] ? ressortNomme(NOMS_RESSORT[easing]) : null;
  let anim;
  try {
    anim = el.animate(frames, {
      duration: DUREES[duree] ?? duree ?? ressortChoisi?.duree ?? DUREES.moyenne,
      delay: delai,
      easing: courbe(easing),
      fill: garder ? "forwards" : "none",
      ...autres
    });
  } catch {
    if (garder && liste?.length > 1) poser(el, liste[liste.length - 1]);
    return Promise.resolve(false);
  }
  parCle.set(cle, { anim, props: new Set(liste ? proprietes(liste) : []) });
  const fini = ok => { if (parCle.get(cle)?.anim === anim) parCle.delete(cle); return ok; };
  return anim.finished.then(() => {
    if (garder) {
      try { anim.commitStyles(); } catch { if (liste?.length > 1) poser(el, liste[liste.length - 1]); }
      anim.cancel();
    }
    return fini(true);
  }, () => fini(false));
}

/* Annule l'animation de cette clé sur cet élément, sans rien laisser (retour au style normal). */
export function annuler(el, cle) {
  const a = vivantes.get(el)?.get(cle);
  if (a) { a.anim.cancel(); vivantes.get(el).delete(cle); }
}

/* ---------- flip ---------- */

/* flip(cibles, muter, options) — la technique FLIP : mesure, applique le changement,
   puis anime chaque élément de son ancienne place à la nouvelle. `cibles` : un
   conteneur (ses enfants sont les cibles, relus après le changement : les nouveaux
   arrivent en douceur), une liste d'éléments, ou une fonction qui les renvoie.
   `muter()` fait le changement du DOM (réordonner, filtrer, insérer).
   Options : taille (anime aussi les changements de taille, au prix d'une légère
   déformation du contenu pendant le mouvement), arrivees (défaut true), duree,
   easing (défaut ressort-vif), cle (« flip »).
   Un élément qui disparaît ne se retire pas dans muter() : on y appelle sortir(el),
   dont le repli de hauteur fait suivre les voisins. Mesures groupées, puis écritures
   groupées. Une nouvelle mesure pendant un flip en cours part de la place VISIBLE. */
export function flip(cibles, muter, options = {}) {
  const { taille = false, arrivees = true, duree, easing = "ressort-vif", cle = "flip" } = options;
  const lire = () => typeof cibles === "function" ? [...cibles()] : cibles instanceof Element ? [...cibles.children] : [...cibles];
  if (mouvementReduit()) { muter(); return Promise.resolve(true); }
  const avant = lire();
  const premiers = new Map(avant.map(e => [e, e.getBoundingClientRect()]));
  avant.forEach(e => annuler(e, cle));
  muter();
  const apres = lire();
  const derniers = apres.map(e => e.getBoundingClientRect());
  const promesses = [];
  let rang = 0;
  apres.forEach((e, i) => {
    const d = derniers[i];
    const p = premiers.get(e);
    if (!p) {
      if (arrivees) promesses.push(animer(e, [{ opacity: 0, translate: "0 10px", scale: "0.97" }], { cle, duree: duree ?? "moyenne", easing: "sortie", delai: Math.min(rang++, 7) * 35, reprise: false }));
      return;
    }
    const dx = p.left - d.left;
    const dy = p.top - d.top;
    const sx = taille && d.width ? p.width / d.width : 1;
    const sy = taille && d.height ? p.height / d.height : 1;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.005 && Math.abs(sy - 1) < 0.005) return;
    const image = { translate: `${dx}px ${dy}px` };
    if (taille) { image.scale = `${sx} ${sy}`; e.style.transformOrigin = "0 0"; }
    promesses.push(animer(e, [image], { cle, duree, easing, reprise: false }).then(ok => {
      if (taille) e.style.transformOrigin = "";
      return ok;
    }));
  });
  return Promise.all(promesses).then(() => true);
}

/* ---------- sortir ---------- */

const sorties = new WeakMap();

/* sortir(el, options) — la sortie d'un élément : il glisse vers `vers` en s'effaçant,
   puis (replier, par défaut) sa hauteur se replie pour que les voisins montent sans
   saut ; il est retiré du DOM à la fin. Dès le début il est inert et aria-hidden : plus
   focalisable, plus lu, plus cliquable (le focus qu'il portait est à rendre par
   l'appelant, cf. garderFocus). Rend la promesse de la sortie (la même si on
   rappelle). Options : duree, replier (false pour un élément flottant : un toast),
   vers (défaut "-16px 0"). Ce qui part va plus vite que ce qui arrive : 70 % de la durée. */
export function sortir(el, { duree, replier = true, vers = "-16px 0" } = {}) {
  if (sorties.has(el)) return sorties.get(el);
  el.inert = true;
  el.setAttribute("aria-hidden", "true");
  let p;
  if (mouvementReduit() || !el.isConnected) {
    el.remove();
    p = Promise.resolve(true);
  } else {
    const style = getComputedStyle(el);
    const base = Object.fromEntries(["height", "marginTop", "marginBottom", "paddingTop", "paddingBottom", "borderTopWidth", "borderBottomWidth"].map(k => [k, style[k]]));
    const nul = Object.fromEntries(Object.keys(base).map(k => [k, "0px"]));
    const images = replier
      ? [{ offset: 0, opacity: 1, translate: "0 0", ...base }, { offset: 0.35, ...base }, { offset: 0.6, opacity: 0, translate: vers }, { offset: 1, opacity: 0, translate: vers, ...nul }]
      : [{ opacity: 1, translate: "0 0" }, { opacity: 0, translate: vers }];
    if (replier) el.style.overflow = "hidden";
    p = animer(el, images, { cle: "sortie", duree: duree ?? Math.round(DUREES.moyenne * (replier ? 1 : 0.7)), easing: "entree", reprise: false, fill: "forwards" })
      .then(() => { el.remove(); return true; });
  }
  sorties.set(el, p);
  return p;
}

/* ---------- rebondir, secouer ---------- */

/* rebondir(el) — un petit saut qui dit « c'est pris en compte » (un badge qui change,
   un bouton). L'élément doit pouvoir se transformer (pas display: inline). */
export const rebondir = el => animer(el, [
  { scale: 1 }, { scale: 1.18, offset: 0.4 }, { scale: 0.96, offset: 0.7 }, { scale: 1 }
], { cle: "rebond", duree: 360, easing: "standard", reprise: false });

/* secouer(el) — un refus ou une erreur : quelques allers-retours qui s'éteignent. */
export const secouer = el => animer(el, [
  { translate: "0 0" }, { translate: "-7px 0", offset: 0.2 }, { translate: "6px 0", offset: 0.4 },
  { translate: "-4px 0", offset: 0.6 }, { translate: "2px 0", offset: 0.8 }, { translate: "0 0" }
], { cle: "secoue", duree: 380, easing: "standard", reprise: false });

/* ---------- rouler ---------- */

const rouleaux = new WeakMap();

/* rouler(el, valeur, options) — la valeur d'un compteur change : chaque chiffre qui
   change roule (vers le haut si la valeur monte, vers le bas si elle baisse), de droite
   à gauche. Le texte de `el` est TOUJOURS la valeur entière, une seule fois : pendant
   le roulement, les chiffres dessinés sont des pseudo-éléments (hors de textContent et
   de l'arbre d'accessibilité) et le vrai texte est dans .r-vrai. Largeur stable :
   chiffres tabulaires, chaque colonne a la largeur du plus large de ses deux chiffres.
   En mouvement réduit, ou si l'élément n'est pas affiché, le texte change simplement.
   Un nouvel appel pendant un roulement pose d'abord le texte précédent. */
export function rouler(el, valeur, { duree = DUREES.moyenne } = {}) {
  const apres = String(valeur);
  rouleaux.get(el)?.();
  const avant = el.textContent;
  if (avant === apres) return Promise.resolve(true);
  if (mouvementReduit() || !el.isConnected || !avant.trim()) { el.textContent = apres; return Promise.resolve(true); }
  const n = Math.max(avant.length, apres.length);
  const a = avant.padStart(n);
  const b = apres.padStart(n);
  const sens = parseFloat(apres.replace(",", ".")) < parseFloat(avant.replace(",", ".")) ? -1 : 1;
  const vrai = document.createElement("span");
  vrai.className = "r-vrai";
  vrai.textContent = apres;
  const visuel = document.createElement("span");
  visuel.className = "rouler";
  visuel.setAttribute("aria-hidden", "true");
  const colonnes = [];
  for (let i = 0; i < n; i++) {
    const c = document.createElement("span");
    c.className = "r-c";
    c.dataset.n = b[i];
    if (a[i] !== b[i]) { c.dataset.a = a[i]; colonnes.push(c); }
    visuel.append(c);
  }
  el.replaceChildren(vrai, visuel);
  const fin = () => { rouleaux.delete(el); el.textContent = apres; };
  rouleaux.set(el, fin);
  const options = { duree, easing: "sortie", reprise: false };
  const toutes = colonnes.flatMap((c, i) => {
    const delai = Math.min(colonnes.length - 1 - i, 3) * 30;   // les unités d'abord
    return [
      animer(c, [{ translate: "0 0", opacity: 1 }, { translate: `0 ${-sens * 100}%`, opacity: 0 }], { ...options, delai, pseudoElement: "::before", cle: "r-a", fill: "both" }),
      animer(c, [{ translate: `0 ${sens * 100}%`, opacity: 0 }, { translate: "0 0", opacity: 1 }], { ...options, delai, pseudoElement: "::after", cle: "r-n", fill: "both" })
    ];
  });
  return Promise.all(toutes).then(() => { if (rouleaux.get(el) === fin) fin(); return true; });
}

/* ---------- tracer ---------- */

/* tracer(el) — déclenche (ou rejoue) le tracé à l'encre des formes `pathLength="1"` de
   `el` (un SVG ou son conteneur) : le style et l'animation vivent dans base.css
   (.trace, @keyframes trace). Sans appel, une classe .trace posée au rendu trace une
   fois ; en mouvement réduit le trait est simplement là. Les formes partent l'une
   après l'autre (--i, 60 ms) sauf si echelonner vaut false. */
export function tracer(el, { echelonner = true } = {}) {
  const formes = [...el.querySelectorAll('[pathLength="1"]')];
  if (echelonner) formes.forEach((f, i) => { if (!f.style.getPropertyValue("--i")) f.style.setProperty("--i", Math.min(i, 5)); });
  const traits = () => el.getAnimations({ subtree: true }).filter(a => a.animationName === "trace");
  if (mouvementReduit() || !el.classList.contains("trace")) el.classList.add("trace");
  else traits().forEach(a => { a.cancel(); a.play(); });
  return mouvementReduit() ? Promise.resolve(true) : Promise.all(traits().map(a => a.finished)).then(() => true, () => false);
}
