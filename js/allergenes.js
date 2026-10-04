/* Allergènes et régime végétarien — référentiel indexé par `cid`, comme les
   ingrédients de js/recipes.js.

   - ALLERGENES_LISTE : les 14 allergènes à déclaration obligatoire du règlement
     européen INCO (n° 1169/2011, annexe II), dans l'ordre de la liste officielle.
     `id` court et sans accent (il sert de clé), `label` pour l'affichage.
   - ALLERGENES : pour chaque `cid` qui en contient, la liste des `id` concernés.
     Un `cid` absent n'en contient pas, ou n'a pas été examiné : voir la règle.
   - NON_VEGETARIEN : les `cid` qui contiennent de la chair animale (viande,
     charcuterie, poisson, fruits de mer, gélatine). Les produits laitiers et les
     œufs ne comptent pas : ils sont végétariens.

   Critère : la composition d'un produit nature, telle que le règlement la lit.
   Quelques cas qui piègent : le pignon de pin n'est pas un « fruit à coque » au
   sens du règlement, ni la châtaigne ; la pâte feuilletée ou brisée du commerce
   contient du gluten et du lait ; le vinaigre de vin et le vinaigre balsamique
   contiennent des sulfites.

   Règle d'honnêteté : un produit du commerce dont la composition varie d'une
   marque à l'autre (moutarde, bouillon, chocolat, pesto, conserves au vinaigre…)
   porte l'allergène PROBABLE, et le commentaire le dit. L'interface rappelle de
   toujours vérifier l'étiquette : ce référentiel aide à choisir, il ne remplace
   pas l'emballage. Les traces éventuelles (« peut contenir ») ne sont pas
   relevées. En cas de doute sur un produit, on ne coche rien plutôt que
   d'inventer.

   Pas d'accolades dans les textes : elles sont réservées aux quantités mises à
   l'échelle. */

const ALLERGENES_LISTE = [
  { id: "gluten", label: "Gluten", emoji: "🌾" },
  { id: "crustaces", label: "Crustacés", emoji: "🦐" },
  { id: "oeufs", label: "Œufs", emoji: "🥚" },
  { id: "poissons", label: "Poissons", emoji: "🐟" },
  { id: "arachides", label: "Arachides", emoji: "🥜" },
  { id: "soja", label: "Soja", emoji: "🫘" },
  { id: "lait", label: "Lait", emoji: "🥛" },
  { id: "fruits-a-coque", label: "Fruits à coque", emoji: "🌰" },
  { id: "celeri", label: "Céleri", emoji: "🥬" },
  { id: "moutarde", label: "Moutarde", emoji: "🟡" },
  { id: "sesame", label: "Sésame", emoji: "⚪" },
  { id: "sulfites", label: "Sulfites", emoji: "🍷" },
  { id: "lupin", label: "Lupin", emoji: "🌼" },
  { id: "mollusques", label: "Mollusques", emoji: "🐚" }
];

const ALLERGENES = {
  /* Gluten : céréales du commerce */
  farine: ["gluten"],
  "farine-pain": ["gluten"],
  "levure-chimique": ["gluten"],   // selon la marque (amidon de blé) : lire l'étiquette
  pain: ["gluten"],
  "pain-suedois": ["gluten"],   // seigle ; certaines marques ajoutent du sésame
  pita: ["gluten"],
  blinis: ["gluten", "oeufs", "lait"],
  "pate-brisee": ["gluten", "lait"],       // pur beurre
  "pate-feuilletee": ["gluten", "lait"],   // pur beurre

  /* Lait et dérivés */
  beurre: ["lait"],
  "beurre-sale": ["lait"],
  lait: ["lait"],
  "creme-fraiche": ["lait"],   // la variante « crème de coco » n'en contient pas
  "creme-liquide": ["lait"],
  "yaourt-bulgare": ["lait"],
  "yaourt-grec": ["lait"],
  "brebis-frais": ["lait"],
  "chevre-frais": ["lait"],
  "chevre-buche": ["lait"],
  feta: ["lait"],
  comte: ["lait"],
  gruyere: ["lait"],
  parmesan: ["lait"],
  reblochon: ["lait"],
  "glace-vanille": ["lait", "oeufs"],   // crème glacée classique : composition de marque à vérifier
  pesto: ["lait"],   // parmesan ; beaucoup de marques ajoutent de la noix de cajou : lire l'étiquette

  /* Œufs */
  oeufs: ["oeufs"],

  /* Poissons */
  saumon: ["poissons"],
  "saumon-fume": ["poissons"],

  /* Fruits à coque (liste du règlement : amande, noisette, noix, cajou, pécan,
     noix du Brésil, pistache, macadamia). Ni pignon, ni châtaigne, ni arachide. */
  amandes: ["fruits-a-coque"],
  noisettes: ["fruits-a-coque"],
  noix: ["fruits-a-coque"],
  pecan: ["fruits-a-coque"],
  pistaches: ["fruits-a-coque"],
  "huile-noix": ["fruits-a-coque"],   // huile vierge ; l'huile raffinée en est dispensée, rarement ici

  /* Sésame */
  sesame: ["sesame"],
  tahini: ["sesame"],

  /* Moutarde */
  moutarde: ["moutarde", "sulfites"],   // vinaigre ou vin blanc dans la plupart des marques
  "moutarde-ancienne": ["moutarde", "sulfites"],

  /* Sulfites : vins, vinaigres de vin, produits conservés au vinaigre ou séchés */
  "vinaigre-vin": ["sulfites"],
  "vinaigre-balsamique": ["sulfites"],
  "balsamique-reduction": ["sulfites"],
  "vinaigre-cidre": ["sulfites"],   // fréquent mais pas systématique : vérifier
  cornichons: ["sulfites", "moutarde"],   // saumure au vinaigre, souvent avec graines de moutarde
  capres: ["sulfites"],   // conservées au vinaigre ou au sel selon les marques
  artichauts: ["sulfites"],   // cœurs marinés au vinaigre
  "tomates-sechees": ["sulfites"],   // les tomates séchées sont souvent traitées au dioxyde de soufre

  /* Soja : lécithine de soja, presque systématique dans le chocolat de pâtisserie */
  "chocolat-patissier": ["soja"],   // le noir contient souvent aussi des traces de lait
  "pepites-chocolat": ["soja", "lait"],   // « noir ou au lait » : le lait est certain pour le chocolat au lait
  "pepites-chocolat-blanc": ["soja", "lait"],

  /* Céleri : bouillons du commerce */
  bouillon: ["celeri"]   // bouillon de légumes : le céleri y est quasi constant
};

/* Végétarien : tout ce qui vient d'un animal tué. Les présures animales de
   certains fromages (parmesan, comté, reblochon, feta…) ne sont pas relevées :
   elles dépendent de l'appellation et du producteur, et le carnet ne peut pas le
   savoir pour un produit acheté au marché. */
const NON_VEGETARIEN = [
  "chorizo",
  "jambon-cru",
  "lardons",
  "saumon",
  "saumon-fume"
];
