/* Thème automatique, clair ou sombre. (La préférence de mouvement réduit vit dans
   js/ui/mouvement.js : mouvementReduit(), un seul mécanisme pour toute l'appli.) */

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

export function choisirTheme(mode) {
  try {
    if (mode === "sombre") localStorage.setItem("theme", "dark");
    else if (mode === "clair") localStorage.setItem("theme", "light");
    else localStorage.removeItem("theme");
  } catch {}
  appliquer();
}

export function initialiserTheme() {
  appliquer();
  /* Le système peut basculer en cours d'utilisation (coucher du soleil, réglage
     rapide) : seul le mode automatique le suit, un choix explicite ne bouge pas. */
  SYSTEME_SOMBRE.addEventListener("change", () => { if (modeTheme() === "auto") appliquer(); });
}
