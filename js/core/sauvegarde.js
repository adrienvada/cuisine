/* Sauvegarde du carnet : le fichier d'export, la lecture prudente d'un fichier importé et l'aperçu de ce qu'il remplacerait. */

/* Un fichier importé vient de l'extérieur : on ne lui fait confiance ni pour sa
   forme ni pour ses clés. Ce module ne touche ni `document` ni `localStorage`,
   il s'importe donc sous Node et se teste sans navigateur. */

/* La forme attendue des champs connus de l'état. Un champ connu qui n'a pas la
   bonne forme est écarté (le reste du fichier passe) : mieux vaut perdre ce
   champ que faire planter, plus tard, la vue qui le lit. Un champ inconnu —
   ajouté par une version plus récente du carnet — est gardé tel quel. */
const FORMES = {
  portions: "objet", checked: "objet", notes: "objet", cooked: "objet", choices: "objet",
  addons: "objet", cooking: "objet", notesPerso: "objet", repas: "objet",
  menu: "tableau", extras: "tableau", historique: "tableau", journal: "tableau", ordreRayons: "tableau",
  filter: "texte", query: "texte", fondQuery: "texte", hintCoursesOff: "booleen"
};

/* Ce qui décrit l'appareil et non le carnet : les minuteurs qui tournent ici et
   les réglages de ce téléphone survivent à un import. */
const DE_L_APPAREIL = ["timers", "reglages"];

/* Sans ces champs les vues ne se dessinent pas (un filtre absent masquerait
   toutes les recettes) : un fichier qui les omet reçoit les valeurs de départ
   de l'état. Les minuteurs, eux, restent ceux de l'appareil. */
const VIDES = {
  portions: {}, checked: {}, notes: {}, cooked: {}, choices: {}, addons: {}, cooking: {},
  menu: [], extras: [], filter: "Toutes", query: "", fondQuery: "", hintCoursesOff: false
};

const INTERDITES = new Set(["__proto__", "constructor", "prototype"]);

const estObjet = v => v !== null && typeof v === "object" && !Array.isArray(v);

const AVEC_FORME = {
  objet: estObjet,
  tableau: Array.isArray,
  texte: v => typeof v === "string",
  booleen: v => typeof v === "boolean"
};

/* Une entrée de menu est un objet qui nomme sa recette (les anciens menus,
   une liste d'identifiants, sont convertis par migrer() après l'import) ; un
   article libre a un identifiant. */
const entreeValide = {
  menu: e => typeof e === "string" || (estObjet(e) && typeof e.rid === "string"),
  extras: e => estObjet(e) && typeof e.id === "string"
};

export function nomFichier(date = new Date()) {
  const deux = n => String(n).padStart(2, "0");
  return `carnet-cuisine-${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}.json`;
}

export const contenuExport = etat => JSON.stringify(etat, null, 2);

/* → { donnees } ou { erreur }. */
export function lireSauvegarde(texte) {
  let brut;
  try { brut = JSON.parse(texte); } catch { return { erreur: "Ce fichier n'est pas un fichier JSON lisible." }; }
  if (!estObjet(brut)) return { erreur: "Ce fichier ne ressemble pas à un carnet de cuisine." };
  const donnees = {};
  let reconnus = 0;
  for (const [cle, valeur] of Object.entries(brut)) {
    if (INTERDITES.has(cle) || DE_L_APPAREIL.includes(cle)) continue;
    const forme = FORMES[cle];
    if (forme) {
      if (!AVEC_FORME[forme](valeur)) continue;
      reconnus++;
    }
    donnees[cle] = entreeValide[cle] ? valeur.filter(entreeValide[cle]) : valeur;
  }
  if (!reconnus) return { erreur: "Ce fichier ne ressemble pas à un carnet de cuisine." };
  return { donnees: { ...structuredClone(VIDES), ...donnees } };
}

const compte = v => Array.isArray(v) ? v.length : estObjet(v) ? Object.keys(v).length : 0;

/* Les lignes de l'aperçu : ce que le carnet contient, ce que le fichier
   contiendrait. Une ligne vide des deux côtés ne s'affiche pas. */
const LIGNES = [
  ["Recettes au menu", "menu"],
  ["Articles libres", "extras"],
  ["Recettes notées", "notes"],
  ["Notes personnelles", "notesPerso"],
  ["Recettes cuisinées", "cooked"],
  ["Repas passés", "historique"],
  ["Journal", "journal"]
];

export function apercu(actuel, importe) {
  return LIGNES
    .map(([libelle, cle]) => ({ libelle, actuel: compte(actuel[cle]), importe: compte(importe[cle]) }))
    .filter(l => l.actuel || l.importe);
}

/* Remplace le contenu de l'état en place (les vues et la synchro en gardent la
   référence), en conservant ce qui est propre à l'appareil. */
export function remplacerEtat(etat, donnees) {
  const gardes = Object.fromEntries(DE_L_APPAREIL.filter(c => c in etat).map(c => [c, etat[c]]));
  for (const cle of Object.keys(etat)) delete etat[cle];
  Object.assign(etat, structuredClone(donnees), gardes);
}

/* L'état tel qu'il était : pour « Annuler », qui rend tout, minuteurs compris. */
export const instantane = etat => structuredClone(etat);

export function restaurerEtat(etat, photo) {
  for (const cle of Object.keys(etat)) delete etat[cle];
  Object.assign(etat, structuredClone(photo));
}
