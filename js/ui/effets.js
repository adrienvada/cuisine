/* Les effets rares : ceux qui célèbrent une vraie réussite (liste de courses
   terminée, recette terminée, minuteur arrivé au bout) ou qui disent où va une chose
   (la vignette qui rejoint l'onglet Au menu). Plus lourds que les aides de
   mouvement.js : on les charge à la demande, par import() au moment du geste, jamais
   sur le chemin de l'accueil.

   Règles : en mouvement réduit, rien (ou, pour envoler, le seul rebond de la cible) ;
   tout ce qui est ajouté à la page est aria-hidden, sans pointer-events, et retiré à la
   fin ; les couleurs viennent des jetons de css/base.css, donc des deux thèmes ;
   aucune boucle requestAnimationFrame : les trajectoires sont calculées d'avance et
   jouées par WAAPI (le navigateur les compose, la page reste fluide). */

import { DUREES } from "../core/ressort.js";
import { animer, mouvementReduit, rebondir } from "./mouvement.js";

const NS = "http://www.w3.org/2000/svg";

/* ---------- feuilles ---------- */

/* Trois feuilles au trait, dans un carré de 24 : le basilic (ovale, nervure), le
   romarin (une branche d'aiguilles), le persil (trois lobes). */
const FORMES = [
  "M12 22C4 16 4 6 12 2c8 4 8 14 0 20zM12 22V6M12 14l-4-3M12 10l4-2",
  "M12 22V3M12 18l-5-4M12 18l5-4M12 12L7.5 8M12 12l4.5-4M12 7L9 4.5M12 7l3-2.5",
  "M12 22v-8M12 14C6 14 3 9 6 5c2-2 5 0 6 4 1-4 4-6 6-4 3 4 0 9-6 9z"
];

let spectacle = null;

/* Un champ de saisie est actif : on ne célèbre pas sous les doigts de quelqu'un qui écrit. */
function saisieEnCours() {
  const a = document.activeElement;
  if (!a) return false;
  if (a.isContentEditable || a.tagName === "TEXTAREA") return true;
  return a.tagName === "INPUT" && !/^(checkbox|radio|button|submit|range|color|file|image|reset)$/.test(a.type);
}

const centre = o => {
  if (o && typeof o.getBoundingClientRect === "function") {
    const r = o.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return o && Number.isFinite(o.x) ? { x: o.x, y: o.y } : { x: innerWidth / 2, y: innerHeight * 0.7 };
};

/* La trajectoire d'une feuille, calculée d'avance : une vitesse de départ en éventail,
   la gravité, la traînée de l'air (une feuille atteint vite sa vitesse limite), un
   balancement qui s'installe quand elle tombe, et une rotation qui s'amortit. */
export function trajectoire({ angle, vitesse, spin, phase }, duree, pas = 1 / 30) {
  const G = 900;
  const TRAINEE = 3;
  const n = Math.ceil(duree / 1000 / pas);
  let x = 0, y = 0, vx = Math.cos(angle) * vitesse, vy = Math.sin(angle) * vitesse, rot = 0;
  const images = [];
  for (let i = 0; i <= n; i++) {
    const t = i * pas;
    const fin = i / n;
    images.push({ offset: fin, translate: `${x.toFixed(1)}px ${y.toFixed(1)}px`, rotate: `${rot.toFixed(0)}deg`, opacity: fin < 0.7 ? 1 : +(1 - (fin - 0.7) / 0.3).toFixed(2) });
    vy += G * pas;
    if (vy > 0) vx += Math.cos(t * 9 + phase) * 260 * pas;   // le balancement ne vient qu'en tombant
    const f = Math.exp(-TRAINEE * pas);
    vx *= f; vy *= f;
    x += vx * pas; y += vy * pas;
    rot += spin * pas;
    spin *= Math.exp(-1.6 * pas);
  }
  return images;
}

/* feuilles(origine, options) — des confettis d'herbes : 16 petites feuilles au trait
   (vert et or) jaillissent en éventail de `origine` (un élément, ou { x, y } en px
   d'écran ; par défaut le bas de l'écran), retombent en tournoyant et s'effacent, en
   1,1 s au plus. Une seule couche, retirée à la fin. Deux appels rapprochés ne doublent
   pas le spectacle (le second rend la promesse du premier) ; rien en mouvement réduit,
   ni pendant une saisie. Options : nombre (12 à 20), duree (≤ 1200 ms).
   La promesse se résout (true) quand la couche est retirée, false si rien n'a été joué. */
export function feuilles(origine, { nombre = 16, duree = 1100 } = {}) {
  if (spectacle) return spectacle;
  if (mouvementReduit() || saisieEnCours()) return Promise.resolve(false);
  const p = centre(origine);
  const style = getComputedStyle(document.documentElement);
  const couleurs = ["--feuille-a", "--feuille-b", "--feuille-c"].map((k, i) => style.getPropertyValue(k).trim() || ["#42603A", "#C1913F", "#6F8F5F"][i]);
  const couche = document.createElement("div");
  couche.setAttribute("aria-hidden", "true");
  couche.style.cssText = "position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:300";
  const total = Math.min(1200, duree);
  const jouees = [];
  for (let i = 0; i < Math.min(20, Math.max(12, nombre)); i++) {
    const taille = 20 + Math.random() * 12;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", taille.toFixed(0));
    svg.setAttribute("height", taille.toFixed(0));
    svg.style.cssText = `position:absolute;left:${p.x - taille / 2}px;top:${p.y - taille / 2}px;fill:none;stroke:${couleurs[i % 3]};stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;opacity:0`;
    const chemin = document.createElementNS(NS, "path");
    chemin.setAttribute("d", FORMES[i % FORMES.length]);
    svg.append(chemin);
    couche.append(svg);
    const eventail = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI * 0.95);
    const images = trajectoire({ angle: eventail, vitesse: 420 + Math.random() * 380, spin: (Math.random() < 0.5 ? -1 : 1) * (240 + Math.random() * 360), phase: Math.random() * 6.28 }, total);
    jouees.push(animer(svg, images, { duree: total, easing: "linear", cle: "feuille", reprise: false, fill: "both" }));
  }
  document.body.append(couche);
  const retirer = () => { couche.remove(); spectacle = null; };
  // Un délai de secours : la couche ne reste jamais, même si une animation se perd.
  const secours = setTimeout(retirer, total + 400);
  spectacle = Promise.all(jouees).then(() => { clearTimeout(secours); retirer(); return true; });
  return spectacle;
}

/* ---------- envoler ---------- */

/* envoler(source, cible, options) — une pastille part de `source` (un élément), rejoint
   `cible` en arc, rétrécit, puis `cible` rebondit (rebondir). Elle porte l'image de
   `options.image` (une URL), à défaut la première <img> de la source, à défaut un clone
   de la source. aria-hidden, sans pointer-events, retirée à l'arrivée. La promesse se
   résout (true) à l'arrivée. En mouvement réduit : seulement le rebond de la cible
   (lui-même sans effet) ; elle se résout tout de suite. Option : duree (620 ms). */
export async function envoler(source, cible, { image, duree = 620 } = {}) {
  if (!source?.isConnected || !cible?.isConnected) return false;
  if (mouvementReduit()) { rebondir(cible); return true; }
  const a = source.getBoundingClientRect();
  const b = cible.getBoundingClientRect();
  if (!a.width || !b.width) return false;
  const taille = Math.min(56, Math.max(36, Math.min(a.width, a.height)));
  const depart = { x: a.left + a.width / 2, y: a.top + a.height / 2 };
  const arrivee = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  const url = image || source.querySelector?.("img")?.currentSrc || (source.tagName === "IMG" ? source.currentSrc : "");
  let volant;
  if (url) {
    volant = document.createElement("div");
    volant.style.cssText = `width:${taille}px;height:${taille}px;border-radius:50%;background:center/cover url("${url.replace(/"/g, "%22")}");border:2px solid var(--card);box-shadow:var(--ombre-2)`;
  } else {
    volant = source.cloneNode(true);
    volant.querySelectorAll("[id]").forEach(e => e.removeAttribute("id"));
    volant.removeAttribute("id");
    volant.style.width = `${a.width}px`;
    volant.style.height = `${a.height}px`;
  }
  const l = url ? taille : a.width;
  const h = url ? taille : a.height;
  volant.setAttribute("aria-hidden", "true");
  volant.inert = true;
  volant.style.position = "fixed";
  volant.style.margin = "0";
  volant.style.left = `${depart.x - l / 2}px`;
  volant.style.top = `${depart.y - h / 2}px`;
  volant.style.pointerEvents = "none";
  volant.style.zIndex = "300";
  document.body.append(volant);
  // Un arc : courbe de Bézier quadratique dont le point de contrôle est au-dessus du milieu.
  const haut = Math.min(140, Math.max(60, Math.hypot(arrivee.x - depart.x, arrivee.y - depart.y) * 0.35));
  const c = { x: (depart.x + arrivee.x) / 2, y: Math.min(depart.y, arrivee.y) - haut };
  const images = Array.from({ length: 17 }, (_, i) => {
    const u = i / 16;
    const t = u * u * (3 - 2 * u);   // départ et arrivée en douceur
    const mx = (1 - t) ** 2 * depart.x + 2 * (1 - t) * t * c.x + t * t * arrivee.x;
    const my = (1 - t) ** 2 * depart.y + 2 * (1 - t) * t * c.y + t * t * arrivee.y;
    return { offset: u, translate: `${(mx - depart.x).toFixed(1)}px ${(my - depart.y).toFixed(1)}px`, scale: +(1 - 0.65 * t).toFixed(3), opacity: u < 0.85 ? 1 : +(1 - (u - 0.85) / 0.15 * 0.6).toFixed(2) };
  });
  await animer(volant, images, { duree, easing: "linear", cle: "envol", reprise: false, fill: "forwards" });
  volant.remove();
  rebondir(cible);
  return true;
}

/* ---------- tampon ---------- */

/* tampon(el, options) — l'apparition d'un tampon encré, pour une réussite : il tombe de
   haut (échelle 1,3 → 1 avec un ressort qui dépasse à peine), prend son inclinaison
   (`angle`, -6° par défaut, gardée), l'encre « marque » d'un coup (l'opacité arrive
   avant la fin du mouvement) et une lueur dorée s'éteint autour. `el` est le tampon
   déjà dans la page, invisible (opacity: 0) : il reste visible, incliné. En mouvement
   réduit il apparaît simplement, incliné. La promesse se résout à la fin du mouvement. */
export function tampon(el, { angle = -6 } = {}) {
  const lueur = getComputedStyle(document.documentElement).getPropertyValue("--lueur").trim() || "rgb(193 145 63 / 0.4)";
  animer(el, [
    { filter: "drop-shadow(0 0 0 transparent)" },
    { filter: `drop-shadow(0 0 7px ${lueur})`, offset: 0.4 },
    { filter: "drop-shadow(0 0 0 transparent)" }
  ], { cle: "tampon-lueur", duree: DUREES.longue + 200, easing: "standard", reprise: false });
  return animer(el, [
    { opacity: 0, scale: "1.3", rotate: `${angle - 9}deg` },
    { opacity: 1, offset: 0.2 },
    { opacity: 1, scale: "1", rotate: `${angle}deg` }
  ], { cle: "tampon", easing: "ressort-rebond", garder: true, reprise: false });
}
