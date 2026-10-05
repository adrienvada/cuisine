/* Thème automatique, clair ou sombre, et préférence de mouvement réduit. */

/* La liste de médias est vivante : `.matches` est toujours à jour si la préférence
   change en cours d'usage. C'est le seul mécanisme de l'appli ; js/ui/mouvement.js
   l'expose sous le nom mouvementReduit() pour les aides du mouvement. Il vit ici,
   dans un module déjà sur le chemin de l'accueil, pour que mouvement.js (plus lourd)
   n'y entre pas. */
export const REDUCE_MOTION = matchMedia("(prefers-reduced-motion: reduce)");
export const mouvementReduit = () => REDUCE_MOTION.matches;

/* Safari d'iOS n'applique :active (le retour d'appui de base.css) qu'à condition
   qu'un écouteur tactile existe quelque part dans le document. */
document.addEventListener("touchstart", () => {}, { passive: true });

const SYSTEME_SOMBRE = matchMedia("(prefers-color-scheme: dark)");

/* On range « dark » et « light » sous la clé « theme », comme avant les trois
   modes : le script en ligne d'index.html (qui évite le flash au chargement) les
   lit tels quels, et un appareil déjà réglé garde son choix. Pas de valeur =
   automatique. */
export function modeTheme() {
  let v = null;
  try { v = localStorage.getItem("theme"); } catch {}
  return v === "dark" ? "sombre" : v === "light" ? "clair" : "auto";
}

const themeSombre = mode => mode === "sombre" || (mode === "auto" && SYSTEME_SOMBRE.matches);

function appliquer() {
  const dark = themeSombre(modeTheme());
  const racine = document.documentElement;
  if (dark) racine.setAttribute("data-theme", "dark");
  else racine.removeAttribute("data-theme");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#15180F" : "#42603A");
}

/* Le nouveau thème s'étend en cercle depuis `origine` (le bouton touché : un élément ou
   { x, y }). C'est une transition de vue, repérée par html[data-vt="theme"] (css/reglages.css
   en règle le cercle) : le routeur a ses propres types, et on ne s'y mêle pas, on ne
   démarre pas par-dessus l'un des siens. Le cercle grandit jusqu'au coin le plus
   éloigné (--vt-r). Sans l'API, en mouvement réduit, ou si l'aspect ne change pas
   (Automatique quand le système est déjà dans ce thème), le thème change d'un coup. */
function etendreEnCercle(origine) {
  const racine = document.documentElement;
  const r = origine instanceof Element ? origine.getBoundingClientRect() : null;
  const x = r ? r.left + r.width / 2 : (origine?.x ?? innerWidth / 2);
  const y = r ? r.top + r.height / 2 : (origine?.y ?? innerHeight / 2);
  const rayon = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  racine.dataset.vt = "theme";
  racine.style.setProperty("--vt-x", x + "px");
  racine.style.setProperty("--vt-y", y + "px");
  racine.style.setProperty("--vt-r", Math.ceil(rayon) + "px");
  const fin = () => {
    if (racine.dataset.vt !== "theme") return;
    delete racine.dataset.vt;
    racine.style.removeProperty("--vt-x");
    racine.style.removeProperty("--vt-y");
    racine.style.removeProperty("--vt-r");
  };
  try {
    const transition = document.startViewTransition(appliquer);
    transition.finished.then(fin, fin);
  } catch {
    appliquer();
    fin();
  }
}

/* Rend true si la bascule se fait en cercle (la mise à jour de la page arrive alors à
   l'image suivante), false si elle est faite à l'instant même. */
export function choisirTheme(mode, origine) {
  const avant = document.documentElement.getAttribute("data-theme") === "dark";
  try {
    if (mode === "sombre") localStorage.setItem("theme", "dark");
    else if (mode === "clair") localStorage.setItem("theme", "light");
    else localStorage.removeItem("theme");
  } catch {}
  const cercle = !!origine && typeof document.startViewTransition === "function" && !mouvementReduit()
    && !document.documentElement.dataset.vt && themeSombre(mode) !== avant;
  if (cercle) etendreEnCercle(origine);
  else appliquer();
  return cercle;
}

export function initialiserTheme() {
  appliquer();
  /* Le système peut basculer en cours d'utilisation (coucher du soleil, réglage
     rapide) : seul le mode automatique le suit, un choix explicite ne bouge pas. */
  SYSTEME_SOMBRE.addEventListener("change", () => { if (modeTheme() === "auto") appliquer(); });
}
