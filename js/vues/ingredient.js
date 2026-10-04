/* La feuille d'un ingrédient : sa quantité, « j'en ai moins », ses substitutions et ses allergènes. */

import { allergenesDe, lireQuantite, portionsPermises, PORTIONS_MAX, PORTIONS_MIN } from "../core/adaptation.js";
import { fmtQty, fmtUnit, libellePortions, scaleQty, scaleText } from "../core/format.js";
import { html, raw } from "../core/html.js";
import { fermerFeuille, ouvrirFeuille } from "../ui/feuilles.js";

/* La quantité d'un ingrédient aux portions affichées (`f` = portions / base),
   telle que la liste et la feuille la montrent toutes les deux. */
export function quantiteTexte(ing, f) {
  const q = scaleQty(ing.qty, ing.unit, f, ing.entier);
  return q != null ? `${fmtQty(q)} ${fmtUnit(ing.unit, q)}`.trim() : (ing.qtyText || "—");
}

const pluriel = n => (n > 1 ? "s" : "");

/* `portions` : celles de la fiche en ce moment. `regler(n)` applique le réglage
   (et prévient, avec « Annuler ») : la feuille ne connaît ni l'état ni la fiche. */
export function ouvrirIngredient(r, ing, { portions, regler }) {
  const f = portions / r.portions.base;
  const allergenes = allergenesDe([ing]);
  const substitutions = (ing.cid && SUBSTITUTIONS[ing.cid]) || [];
  const chiffre = ing.qty != null && ing.qty > 0;
  const unite = fmtUnit(ing.unit, 2) || "";

  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop";
  backdrop.innerHTML = html`
    <div class="sheet sheet-ing" role="dialog" aria-modal="true" aria-label="${ing.name}">
      <div class="sheet-grip"></div>
      <h3>${ing.name}</h3>
      <p class="sheet-sub">${quantiteTexte(ing, f)} pour ${libellePortions(portions, r.portions.label)}${ing.note ? raw(html` · ${scaleText(ing.note, f)}`) : ""}</p>

      <p class="ing-allergenes">${allergenes.length
        ? raw(html`Contient : ${raw(allergenes.map(a => html`<span class="alg">${a.emoji} ${a.label.toLowerCase()}</span>`).join(" · "))}`)
        : "Aucun allergène relevé pour cet ingrédient."}
        <small>Vérifie les étiquettes.</small></p>

      ${chiffre ? raw(html`
      <div class="ing-moins">
        <h4>J'en ai moins</h4>
        <label class="ing-moins-champ">
          <span>Ce que tu as</span>
          <input id="ing-possede" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" placeholder="${fmtQty(scaleQty(ing.qty, ing.unit, f, ing.entier))}">
          ${unite ? raw(html`<span class="ing-unite">${unite}</span>`) : ""}
        </label>
        <p class="ing-resultat" id="ing-resultat" aria-live="polite"></p>
        <button class="btn primary" id="ing-regler" type="button" disabled>Régler la recette</button>
      </div>`) : ""}

      ${substitutions.length ? raw(html`
      <div class="ing-subs">
        <h4>À la place</h4>
        <ul>${raw(substitutions.map(s => html`<li><b>${s.par}</b><span>${s.note}</span></li>`).join(""))}</ul>
      </div>`) : ""}
    </div>`;

  /* Le résultat se calcule à chaque frappe : on voit tout de suite ce que ça donnerait. */
  let choix = null;
  const saisie = backdrop.querySelector("#ing-possede");
  const resultat = backdrop.querySelector("#ing-resultat");
  const valider = backdrop.querySelector("#ing-regler");

  const evaluer = () => {
    choix = null;
    valider.disabled = true;
    const possede = lireQuantite(saisie.value);
    if (possede == null) { resultat.textContent = ""; return; }
    const n = portionsPermises(ing, r.portions.base, possede);
    if (n < PORTIONS_MIN) {
      resultat.textContent = "Ça ne suffit pas pour une portion entière.";
    } else if (n >= portions) {
      resultat.textContent = `Ça suffit déjà : la recette est prête pour ${libellePortions(portions, r.portions.label)}.`;
    } else {
      choix = Math.min(n, PORTIONS_MAX);
      resultat.textContent = `Avec ça, tu peux faire ${libellePortions(choix, r.portions.label)}.`;
      valider.disabled = false;
      valider.textContent = `Régler sur ${libellePortions(choix, r.portions.label)}`;
    }
  };

  if (chiffre) {
    saisie.addEventListener("input", evaluer);
    saisie.addEventListener("keydown", e => { if (e.key === "Enter" && choix) valider.click(); });
    valider.addEventListener("click", () => {
      if (!choix) return;
      regler(choix);
      fermerFeuille();
    });
  }
  backdrop.addEventListener("click", e => { if (e.target === backdrop) fermerFeuille(); });
  ouvrirFeuille(backdrop);
}
