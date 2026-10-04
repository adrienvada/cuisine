/* QR code en SVG. Ce module s'importe à la demande (import() depuis les réglages) :
   la bibliothèque de js/vendor/ n'est donc téléchargée qu'à l'affichage d'un code. */

import qrcode from "../vendor/qrcode-generator.js";

/* Un QR code se lit en sombre sur clair, quel que soit le thème : les couleurs
   sont donc fixes, avec la marge blanche (« zone de silence ») de quatre modules
   que les lecteurs exigent. */
export function qrSvg(texte) {
  // Type 0 : la plus petite version qui contienne le texte ; niveau M, assez robuste pour un écran.
  const qr = qrcode(0, "M");
  qr.addData(String(texte));
  qr.make();
  const n = qr.getModuleCount(), marge = 4, taille = n + 2 * marge;
  let d = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) if (qr.isDark(y, x)) d += `M${x + marge} ${y + marge}h1v1h-1z`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${taille} ${taille}" role="img" aria-label="QR code" shape-rendering="crispEdges"><rect width="${taille}" height="${taille}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
