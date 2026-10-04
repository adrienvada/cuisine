/* Gabarits HTML : l'échappement des valeurs interpolées, pour ne plus écrire de balisage à la main. */

const ECHAPPEMENTS = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/* Échappe ce qui pourrait être pris pour du balisage — dans un texte comme dans
   la valeur d'un attribut (les deux guillemets sont donc traités). */
export const esc = texte => String(texte ?? "").replace(/[&<>"']/g, c => ECHAPPEMENTS[c]);

/* Du HTML déjà sûr, que l'étiquette `html` ne doit pas échapper une seconde fois. */
class Brut {
  constructor(texte) { this.texte = texte; }
}

export const raw = texte => new Brut(String(texte ?? ""));

const valeur = v => {
  if (Array.isArray(v)) return v.map(valeur).join("");   // chaque élément suit la même règle
  if (v instanceof Brut) return v.texte;
  if (v == null || v === false) return "";               // `${cond && html`…`}` n'écrit pas « false »
  return esc(v);
};

/* html`<li>${titre}</li>` : chaque valeur interpolée est échappée, sauf celles
   enveloppées dans raw(…). Un tableau se déroule sans séparateur. Le résultat
   est une chaîne ordinaire : pour l'insérer dans un autre gabarit, le passer
   par raw(html`…`). */
export function html(morceaux, ...valeurs) {
  return morceaux.reduce((sortie, m, i) => sortie + m + (i < valeurs.length ? valeur(valeurs[i]) : ""), "");
}
