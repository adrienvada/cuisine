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

/* `englober(appliquer)` est facultatif : une vue qui veut animer le changement (le cercle des
   réglages, js/vues/reglages.js) reçoit la fonction qui pose le thème et rend true si elle s'en
   charge ; sinon, ou si l'aspect ne change pas (Automatique quand le système est déjà dans ce
   thème), le thème est posé à l'instant. Ce module est sur le chemin de l'accueil : l'animation
   elle-même n'y est pas. */
export function choisirTheme(mode, englober) {
  const avant = document.documentElement.getAttribute("data-theme") === "dark";
  try {
    if (mode === "sombre") localStorage.setItem("theme", "dark");
    else if (mode === "clair") localStorage.setItem("theme", "light");
    else localStorage.removeItem("theme");
  } catch {}
  if (englober && themeSombre(mode) !== avant && englober(appliquer)) return true;
  appliquer();
  return false;
}

export function initialiserTheme() {
  appliquer();
  /* Le système peut basculer en cours d'utilisation (coucher du soleil, réglage
     rapide) : seul le mode automatique le suit, un choix explicite ne bouge pas. */
  SYSTEME_SOMBRE.addEventListener("change", () => { if (modeTheme() === "auto") appliquer(); });
}
