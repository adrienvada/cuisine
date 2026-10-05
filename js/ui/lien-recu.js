/* Un lien partagé porte la version de la recette (`?p=8&c=…&a=…`) : le routeur charge ce
   module quand il en reçoit un, jamais pour ouvrir l'accueil. */

import { save, state } from "../core/etat.js";
import { versionDeRequete } from "../core/liens.js";

/* La version s'applique au brouillon de la fiche, jamais au menu — ouvrir un lien ne doit
   pas modifier le repas en préparation. */
export function appliquerVersion(r, requete) {
  const v = versionDeRequete(r, requete);
  if (!Object.keys(v).length) return;
  /* Le lien ne dit que l'écart aux valeurs par défaut : ce qu'il omet vaut le
     défaut. On repart donc d'un brouillon vierge, sans quoi un réglage resté
     d'une visite précédente fausserait la version reçue. */
  delete state.portions[r.id]; delete state.choices[r.id]; delete state.addons[r.id];
  if (v.portions != null) state.portions[r.id] = v.portions;
  if (v.choices) state.choices[r.id] = v.choices;
  if (v.addons) state.addons[r.id] = v.addons;
  save();
}
