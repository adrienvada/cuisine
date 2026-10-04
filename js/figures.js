/* Les figures des savoirs — Carnet de cuisine d'Evadri

   Un schéma, une courbe, une échelle, des étapes reliées : de quoi VOIR le
   mécanisme qu'un fondamental (js/fondamentaux.js) explique en mots. Ce fichier ne
   contient que des données ; js/ui/figures.js les dessine en SVG, css/figures.css
   les colore (clair et sombre). Il est chargé avec fondamentaux.js, à la demande :
   s'il manque (hors ligne, erreur), les fiches s'affichent sans leurs schémas et
   rien ne casse — les figures sont un bonus.

   ORGANISATION
   Une section par famille (dans l'ordre de FAMILLES), entre des repères
   « ===== Famille ===== » / « ===== fin Famille ===== » qu'il ne faut ni renommer ni
   déplacer : chacun écrit dans la sienne, sans conflit git. Une entrée par
   fondamental, dans la section de sa famille :

     FIGURES["maillard"] = [ { …figure… }, { …figure… } ];

   La clé est l'id d'un fondamental existant. Trois à cinq figures par fiche est
   un bon ordre : chacune doit APPORTER quelque chose que le texte dit mal, pas
   le répéter en plus joli.

   HONNÊTETÉ SCIENTIFIQUE — la règle du carnet, ici aussi
   Une figure n'invente aucun chiffre. Tout nombre dessiné vient du texte de la
   fiche (ses cas, ses repères, son pourquoi), et se vérifie à la relecture. Quand
   on ne connaît que l'allure d'un phénomène (la vitesse d'une réaction selon
   l'humidité, par exemple), la courbe est QUALITATIVE : `qualitative: true`, axes
   sans graduations chiffrées, et la légende dit « allure qualitative ». Une
   illustration (un biscuit plus ou moins doré) le dit aussi : « illustration ».

   FORME D'UNE FIGURE (communs à tous les types)
   - ou ......... où elle s'insère dans la fiche :
                  "tete"     juste après l'accroche : LA figure qui résume le mécanisme ;
                  "cas"      après « Selon les cas » ;
                  "reperes"  dans « À retenir », sous la liste ;
                  "pourquoi" dans « Pourquoi ça marche », après le paragraphe `apres`.
   - apres ...... (pourquoi seulement) rang du paragraphe, à partir de 1 (1 par défaut).
                  Au-delà du dernier paragraphe, la figure se pose après lui.
   - titre ...... court : « Quelle température de surface ? ». Petites capitales.
   - legende .... une ou deux phrases qui disent QUOI LIRE (pas ce que la figure est).
   - alt ........ description complète pour un lecteur d'écran : obligatoire. Elle décrit
                  le dessin ET sa conclusion, comme on le dirait au téléphone.
   - type ....... courbe | echelle | barres | etapes | svg | comparaison (plus bas).

   Le texte des figures reçoit la typographie française à l'affichage (insécable
   avant °C, %, :, ?…) ; écrire normalement, avec des espaces ordinaires. Pas
   d'accolades dans les textes. Aucune couleur dans les données : ni #hex, ni rgb(),
   ni fill="red" — des TONS et des classes CSS, jamais des valeurs.

   LES TONS — vert, or, terra, bleu, encre, doux
   Les types calculés prennent `ton: "terra"` ; un SVG libre prend des classes :
     traits ........ fg-t-encre fg-t-doux fg-t-vert fg-t-or fg-t-terra fg-t-bleu
                     + fg-t-axe (axes, tiges, flèches) fg-t-grille ;
                     épaisseur fg-t-fin / fg-t-epais / fg-t-tres-epais ;
                     style fg-tirets / fg-pointilles. Un trait n'a pas de remplissage.
     aplats pleins . fg-f-vert fg-f-or fg-f-terra fg-f-bleu fg-f-encre
     aplats clairs . fg-f-vert-l fg-f-or-l fg-f-terra-l fg-f-bleu-l (portent du texte)
                     fg-f-papier fg-f-doux fg-f-carte fg-f-aucun
     textes ........ fg-txt (13) + fg-txt-s (petit, 11,5) / fg-txt-b (gras) /
                     fg-txt-script (Caveat, annotation « faite main ») / fg-txt-serif ;
                     teinte fg-txt-vert fg-txt-or fg-txt-terra fg-txt-bleu fg-txt-doux ;
                     fg-halo (liseré de fond, sur un tracé) ; fg-txt-sur (sur un aplat plein vert)
     divers ........ fg-pt (un point : liseré de carte), fg-emoji
     flèches ....... marker-end="url(#fg-fl-encre)" — encre, vert, or, terra, bleu, doux.
   Les identifiants sont réécrits par figure : #fg-fl-… devient unique dans la page,
   et un id que l'auteur pose lui-même s'écrit « fg-@-nom » (id="fg-@-halo",
   url(#fg-@-halo)).

   LES SIX TYPES — un exemple complet de chacun, à copier

   1. courbe — axes, séries lisses, zones, repères, notes
      { ou: "pourquoi", apres: 2, type: "courbe",
        titre: "Vitesse selon l'humidité",
        legende: "Allure qualitative : la plus rapide à humidité intermédiaire.",
        alt: "Courbe en cloche : la vitesse de la réaction part de presque rien dans un milieu très sec, culmine à humidité intermédiaire et retombe quand il y a trop d'eau. Allure qualitative, sans valeurs.",
        qualitative: true,                                   // pas de graduations chiffrées
        x: { label: "Humidité", extremites: ["sec", "humide"] },  // ou { label, unite: "°C", min, max, graduations: [100, 150] }
        y: { label: "Vitesse de la réaction" },
        series: [ { nom: "Maillard", ton: "terra", aire: true,   // aire, tirets, lisse: false, marqueurs: true
                    points: [[0, 0.04], [40, 0.9], [55, 1], [100, 0.1]] } ],
        zones: [ { de: 0, a: 22, label: "trop sec", ton: "or" } ],       // bandes verticales étiquetées
        reperes: [ { x: 55, label: "maximum", ton: "terra" } ],           // { x } vertical ou { y } horizontal
        notes: [ { x: 55, y: 1, texte: "le plus rapide ici", dx: 24, dy: 10 } ] }  // dx, dy, largeur, ancre facultatifs
      Les coordonnées des points sont celles de l'échelle des axes (min, max
      par défaut : l'étendue des données). Un « x » en qualitatif est une échelle
      libre, 0 à 100 par exemple. Plusieurs séries : une légende s'ajoute seule.

   2. echelle — une règle graduée : zones colorées et marqueurs étiquetés
      { ou: "cas", type: "echelle",
        titre: "Quelle température de surface ?",
        legende: "Lente vers 100 °C, franche entre 150 et 180 °C, pyrolyse au-delà de 200 °C.",
        alt: "Règle de 90 à 230 °C…",
        min: 90, max: 230, unite: "°C", label: "Température de surface",
        graduations: [100, 150, 200],                         // facultatif : calculées sinon
        zones: [ { de: 100, a: 140, label: "lente", ton: "bleu" },
                 { de: 200, a: 230, label: "pyrolyse", ton: "terra" } ],
        marqueurs: [ { v: 100, label: "L'eau plafonne la surface à 100 °C", ton: "bleu" } ] }
      Échelle sans chiffres : `qualitative: true, extremites: ["lent", "rapide"]`.
      Les étiquettes se répartissent seules au-dessus et en dessous de la règle.

   3. barres — barres horizontales comparatives, avec valeur et unité
      { ou: "reperes", type: "barres", titre: "…", legende: "…", alt: "…",
        unite: "g",                                           // max facultatif (le plus grand par défaut)
        barres: [ { label: "Poêle fine", valeur: 1, texte: "1 à 2 min", ton: "or", note: "…" },
                  { label: "Fonte", valeur: 4.5, texte: "4 à 5 min", ton: "terra" } ] }
      `texte` remplace la valeur affichée ; `note` est une ligne de détail sous la barre.

   4. etapes — un processus en cases reliées par des flèches (2 à 5)
      { ou: "cas", type: "etapes", titre: "…", legende: "…", alt: "…",
        etapes: [ { libelle: "Chauffer", desc: "poêle sèche", emoji: "🔥", ton: "terra" },
                  { libelle: "Colorer",  desc: "surface sans eau", emoji: "🥩" },
                  { libelle: "Déglacer", desc: "un peu d'eau", emoji: "💧", ton: "bleu" } ] }
      Jusqu'à trois cases tiennent côte à côte ; au-delà, ou si un libellé est
      trop long pour sa case, elles passent en colonne.

   5. svg — un vrai schéma dessiné à la main (molécules, coupes, gouttelettes…)
      { ou: "tete", type: "svg", titre: "…", legende: "…", alt: "…",
        vb: "0 0 320 200",                                    // viewBox ; 320 de large
        corps: `<rect class="fg-f-or-l fg-t-or" x="10" y="10" width="140" height="50" rx="10"/>
                <text class="fg-txt fg-txt-b" x="80" y="40" text-anchor="middle">Sucre</text>
                <path class="fg-t-axe" d="M80 62L80 96" marker-end="url(#fg-fl-encre)"/>` }
      Le cadre pose le <svg>, le titre, la description et les marqueurs ; `corps`
      n'en est que le contenu. Textes de 11,5 minimum, centrés ou ancrés
      (text-anchor) : le SVG ne coupe pas les lignes, c'est à vous de les poser
      (un <tspan x dy> par ligne). Garder 8 à 10 unités de marge sur les bords.

   6. comparaison — deux ou trois panneaux côte à côte, avant/après ou bon/mauvais
      { ou: "reperes", type: "comparaison", titre: "…", legende: "…", alt: "…",
        fleche: false,                                        // true : des flèches entre les panneaux
        panneaux: [ { label: "Acide", sous: "coloration retardée", ton: "or",
                      vb: "0 0 100 64", corps: `<circle class="fg-f-terra" cx="50" cy="32" r="22" opacity=".3"/>` },
                    { label: "Alcalin", sous: "dore plus vite", ton: "terra",
                      vb: "0 0 100 64", corps: `<circle class="fg-f-terra" cx="50" cy="32" r="22"/>` } ] }
      Chaque panneau est un mini-SVG libre (`vb` et `corps`, comme le type svg)
      dans sa carte, avec son libellé en dessous.

   Le zoom (un appui sur la figure l'ouvre en grand) et l'apparition des tracés
   sont automatiques. Pour voir ce qu'on dessine : node tools/capturer-savoir.mjs <id>
   (captures claires et sombres dans un dossier). Le vérificateur
   (node tools/verifier-recettes.mjs) contrôle clés, types, titres, alt, `ou`, `apres`
   et l'absence de couleur en dur. */

const FIGURES = {};



/* ===== Chaleur & coloration ===== */
FIGURES["maillard"] = [
  { ou: "tete", type: "svg", vb: "0 0 320 312",
    titre: "D'une rencontre à l'odeur du rôti",
    legende: "Un sucre réducteur et une fonction amine se lient ; la cascade qui suit fabrique des centaines de composés volatils, dont l'odeur. Les pigments bruns ne sont qu'un indicateur.",
    alt: "Schéma en quatre niveaux. En haut, deux cases reliées par un plus : un sucre réducteur (glucose, fructose, lactose, maltose) et une fonction amine, souvent celle de la lysine d'une protéine. Deux flèches les mènent à une case centrale, la cascade de réactions, lente vers 100 °C et franche entre 150 et 180 °C. De cette case partent deux flèches. À gauche, les arômes : pyrazines pour le grillé, furanes pour le sucré, composés soufrés pour le rôti. À droite, la couleur : les mélanoïdines, des pigments bruns qui ne sont qu'un simple indicateur.",
    corps: `<rect class="fg-f-or-l fg-t-or" x="10" y="8" width="140" height="58" rx="10"/>
<text class="fg-txt fg-txt-b fg-txt-or" x="80" y="29" text-anchor="middle">Sucre réducteur</text>
<text class="fg-txt fg-txt-s" x="80" y="45" text-anchor="middle"><tspan x="80">glucose, fructose,</tspan><tspan x="80" dy="13.5">lactose, maltose</tspan></text>
<text class="fg-txt fg-txt-xl fg-txt-doux" x="160" y="46" text-anchor="middle">+</text>
<rect class="fg-f-vert-l fg-t-vert" x="170" y="8" width="140" height="58" rx="10"/>
<text class="fg-txt fg-txt-b fg-txt-vert" x="240" y="29" text-anchor="middle">Fonction amine</text>
<text class="fg-txt fg-txt-s" x="240" y="45" text-anchor="middle"><tspan x="240">celle de la lysine,</tspan><tspan x="240" dy="13.5">dans une protéine</tspan></text>
<path class="fg-t-axe" d="M80 69L122 97" marker-end="url(#fg-fl-encre)"/>
<path class="fg-t-axe" d="M240 69L198 97" marker-end="url(#fg-fl-encre)"/>
<rect class="fg-f-terra-l fg-t-terra" x="50" y="100" width="220" height="56" rx="10"/>
<text class="fg-txt fg-txt-b fg-txt-terra" x="160" y="121" text-anchor="middle">Cascade de réactions</text>
<text class="fg-txt fg-txt-s" x="160" y="137" text-anchor="middle"><tspan x="160">lente vers 100 °C,</tspan><tspan x="160" dy="13.5">franche à 150-180 °C</tspan></text>
<path class="fg-t-axe" d="M100 159L100 178" marker-end="url(#fg-fl-encre)"/>
<path class="fg-t-axe" d="M256 159L256 178" marker-end="url(#fg-fl-encre)"/>
<text class="fg-txt-script fg-txt-vert" x="92" y="174" text-anchor="end">des arômes</text>
<text class="fg-txt-script fg-txt-terra" x="264" y="174" text-anchor="start">la couleur</text>
<rect class="fg-f-vert-l fg-t-vert" x="10" y="184" width="182" height="36" rx="9"/>
<text class="fg-txt fg-txt-b fg-txt-vert" x="22" y="207" text-anchor="start">Pyrazines</text>
<text class="fg-txt fg-txt-s" x="180" y="207" text-anchor="end">grillé</text>
<rect class="fg-f-vert-l fg-t-vert" x="10" y="226" width="182" height="36" rx="9"/>
<text class="fg-txt fg-txt-b fg-txt-vert" x="22" y="249" text-anchor="start">Furanes</text>
<text class="fg-txt fg-txt-s" x="180" y="249" text-anchor="end">sucré</text>
<rect class="fg-f-vert-l fg-t-vert" x="10" y="268" width="182" height="36" rx="9"/>
<text class="fg-txt fg-txt-b fg-txt-vert" x="22" y="291" text-anchor="start">Composés soufrés</text>
<text class="fg-txt fg-txt-s" x="180" y="291" text-anchor="end">rôti</text>
<rect class="fg-f-terra-l fg-t-terra" x="202" y="184" width="108" height="120" rx="9"/>
<circle class="fg-f-terra" cx="256" cy="209" r="9"/>
<text class="fg-txt fg-txt-b fg-txt-terra" x="256" y="240" text-anchor="middle">Mélanoïdines</text>
<text class="fg-txt fg-txt-s" x="256" y="257" text-anchor="middle"><tspan x="256">pigments bruns,</tspan><tspan x="256" dy="13.5">simple indicateur :</tspan><tspan x="256" dy="13.5">c'est l'odeur</tspan><tspan x="256" dy="13.5">qui compte</tspan></text>` },

  { ou: "cas", type: "echelle",
    titre: "Quelle température de surface ?",
    legende: "Des ordres de grandeur, pas des seuils nets : lente vers 100 °C, visible à partir de 140 °C, franche entre 150 et 180 °C. Au-delà de 200 °C, la pyrolyse prend le dessus.",
    alt: "Règle graduée de 90 à 230 °C. La réaction est lente de 100 à 140 °C, visible de 140 à 150 °C, franche de 150 à 180 °C. Entre 180 et 200 °C, rien n'est annoncé. Au-delà de 200 °C, la pyrolyse prend le dessus et l'amertume arrive avant les arômes. Un marqueur rappelle qu'une pellicule d'eau liquide plafonne la surface à 100 °C.",
    min: 90, max: 230, unite: "°C", label: "Température de surface",
    graduations: [100, 150, 200],
    zones: [
      { de: 100, a: 140, label: "lente", ton: "bleu" },
      { de: 140, a: 150, label: "visible", ton: "or" },
      { de: 150, a: 180, label: "franche", ton: "vert" },
      { de: 200, a: 230, label: "pyrolyse", ton: "terra" }
    ],
    marqueurs: [
      { v: 100, label: "L'eau liquide plafonne la surface à 100 °C", ton: "bleu" },
      { v: 200, label: "Au-delà : l'amertume avant les arômes", ton: "terra" }
    ] },

  { ou: "pourquoi", apres: 2, type: "courbe", qualitative: true,
    titre: "Vitesse selon l'humidité",
    legende: "Allure qualitative : la réaction est la plus rapide à humidité intermédiaire, et plus lente dans un aliment desséché à l'excès comme dans un milieu noyé d'eau.",
    alt: "Courbe en cloche. L'axe horizontal va d'un milieu sec à un milieu humide, l'axe vertical est la vitesse de la réaction, sans valeurs chiffrées. La vitesse part presque de zéro dans un aliment desséché, monte, culmine à humidité intermédiaire, puis redescend quand il y a trop d'eau. Allure qualitative.",
    x: { label: "Humidité du milieu", extremites: ["sec", "humide"] },
    y: { label: "Vitesse de la réaction" },
    series: [ { nom: "Maillard", ton: "terra", aire: true,
      points: [[0, 0.04], [14, 0.32], [34, 0.8], [52, 1], [68, 0.86], [84, 0.42], [100, 0.12]] } ],
    zones: [ { de: 0, a: 24, label: "trop sec", ton: "or" }, { de: 76, a: 100, label: "trop d'eau", ton: "bleu" } ],
    notes: [
      { x: 52, y: 1, texte: "maximum : humidité intermédiaire", dx: 0, dy: 46, largeur: 120, ancre: "middle" }
    ] },

  { ou: "reperes", type: "comparaison",
    titre: "Le pH et la dorure",
    legende: "Illustration qualitative : plus le milieu est alcalin, plus la coloration vient vite ; une marinade acide la retarde.",
    alt: "Trois biscuits côte à côte, de plus en plus colorés. En milieu acide, par exemple une marinade, le biscuit est à peine coloré : la coloration est retardée. En milieu neutre, il est moyennement doré : c'est la référence. En milieu alcalin, avec une pointe de bicarbonate, il est franchement foncé : la dorure vient bien plus vite. Illustration qualitative.",
    panneaux: [
      { label: "Acide", sous: "marinade : coloration retardée", ton: "or", vb: "0 0 100 64",
        corps: `<circle class="fg-f-terra" cx="50" cy="32" r="25" opacity=".22"/><circle class="fg-t-terra" cx="50" cy="32" r="25"/><circle class="fg-f-carte" cx="40" cy="26" r="2.6"/><circle class="fg-f-carte" cx="58" cy="30" r="2.6"/><circle class="fg-f-carte" cx="47" cy="42" r="2.6"/>` },
      { label: "Neutre", sous: "la référence", ton: "doux", vb: "0 0 100 64",
        corps: `<circle class="fg-f-terra" cx="50" cy="32" r="25" opacity=".6"/><circle class="fg-t-terra" cx="50" cy="32" r="25"/><circle class="fg-f-carte" cx="40" cy="26" r="2.6"/><circle class="fg-f-carte" cx="58" cy="30" r="2.6"/><circle class="fg-f-carte" cx="47" cy="42" r="2.6"/>` },
      { label: "Alcalin", sous: "pointe de bicarbonate : dore bien plus vite", ton: "terra", vb: "0 0 100 64",
        corps: `<circle class="fg-f-terra" cx="50" cy="32" r="25"/><circle class="fg-t-terra" cx="50" cy="32" r="25"/><circle class="fg-f-carte" cx="40" cy="26" r="2.6"/><circle class="fg-f-carte" cx="58" cy="30" r="2.6"/><circle class="fg-f-carte" cx="47" cy="42" r="2.6"/>` }
    ] }
];
/* ===== fin Chaleur & coloration ===== */



/* ===== Arômes & épices ===== */

/* (figures de la famille) */

/* ===== fin Arômes & épices ===== */



/* ===== Textures & liaisons ===== */

/* --- Textures, partie 1 : émulsion, gluten, amidon, coagulation de l'œuf --- */




/* --- Textures, partie 2 : levure chimique, contraste de textures, pectine --- */

/* ===== fin Textures & liaisons ===== */



/* ===== Sel, acide & goût ===== */

FIGURES["osmose-sel"] = [
  {
    ou: "tete",
    type: "svg",
    vb: "0 0 320 258",
    titre: "L'eau sort d'abord, le sel entre ensuite",
    legende: "Le sel dissous attire l'eau de la cellule (osmose ; le pointillé marque la taille d'origine), puis ses ions diffusent vers l'intérieur. L'une est immédiate, l'autre demande des heures.",
    alt: "Schéma en deux temps d'une cellule végétale sous un film de solution salée, avec des grains de sel en surface. À gauche, l'eau sort : trois flèches bleues montent de la cellule vers la solution salée et la cellule se vide, sa vacuole se rétracte, le pointillé montrant sa taille d'origine. La sortie d'eau est immédiate. À droite, le sel entre : trois flèches descendent de la solution vers la cellule, et les ions sodium et chlorure diffusent à l'intérieur, ce qui prend plusieurs heures.",
    corps: `<text class="fg-txt fg-txt-b fg-txt-bleu" x="80" y="17" text-anchor="middle">L'eau sort</text>
<text class="fg-txt fg-txt-s" x="80" y="32" text-anchor="middle">tout de suite</text>
<text class="fg-txt fg-txt-b" x="240" y="17" text-anchor="middle">Le sel entre</text>
<text class="fg-txt fg-txt-s" x="240" y="32" text-anchor="middle">en plusieurs heures</text>
<rect class="fg-f-bleu-l fg-t-bleu fg-t-fin" x="22" y="62" width="116" height="13" rx="6.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="36" y="52" width="7" height="7" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="54" y="52" width="7" height="7" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="72" y="52" width="7" height="7" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="90" y="52" width="7" height="7" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="108" y="52" width="7" height="7" rx="1.5"/><rect class="fg-f-vert-l fg-t-vert fg-t-epais" x="34" y="84" width="92" height="104" rx="15"/><rect class="fg-t-bleu fg-t-fin fg-tirets" x="40" y="98" width="80" height="84" rx="16"/><rect class="fg-f-bleu-l fg-t-bleu" x="45" y="120" width="70" height="58" rx="14"/><path class="fg-t-bleu fg-t-epais" d="M56 114L56 80" marker-end="url(#fg-fl-bleu)"/><path class="fg-t-bleu fg-t-epais" d="M80 114L80 80" marker-end="url(#fg-fl-bleu)"/><path class="fg-t-bleu fg-t-epais" d="M104 114L104 80" marker-end="url(#fg-fl-bleu)"/>
<rect class="fg-f-bleu-l fg-t-bleu fg-t-fin" x="182" y="62" width="116" height="13" rx="6.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="214" y="52" width="7" height="7" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="250" y="52" width="7" height="7" rx="1.5"/><rect class="fg-f-vert-l fg-t-vert fg-t-epais" x="194" y="84" width="92" height="104" rx="15"/><rect class="fg-t-bleu fg-t-fin fg-tirets" x="200" y="98" width="80" height="84" rx="16"/><rect class="fg-f-bleu-l fg-t-bleu" x="205" y="120" width="70" height="58" rx="14"/><path class="fg-t-encre fg-t-epais" d="M216 80L216 118" marker-end="url(#fg-fl-encre)"/><path class="fg-t-encre fg-t-epais" d="M240 80L240 118" marker-end="url(#fg-fl-encre)"/><path class="fg-t-encre fg-t-epais" d="M264 80L264 118" marker-end="url(#fg-fl-encre)"/><circle class="fg-f-encre" cx="218" cy="134" r="2.2"/><circle class="fg-f-encre" cx="236" cy="144" r="2.2"/><circle class="fg-f-encre" cx="256" cy="132" r="2.2"/><circle class="fg-f-encre" cx="226" cy="162" r="2.2"/><circle class="fg-f-encre" cx="250" cy="160" r="2.2"/><circle class="fg-f-encre" cx="266" cy="148" r="2.2"/><circle class="fg-f-encre" cx="214" cy="150" r="2.2"/><circle class="fg-f-encre" cx="242" cy="128" r="2.2"/>
<path class="fg-t-axe" d="M154 130L166 130" marker-end="url(#fg-fl-encre)"/>
<text class="fg-txt fg-txt-s" x="80" y="208" text-anchor="middle"><tspan x="80">l'eau passe vers la solution</tspan><tspan x="80" dy="13.5">salée : la cellule se vide</tspan></text>
<text class="fg-txt fg-txt-s" x="240" y="208" text-anchor="middle"><tspan x="240">les ions sodium et chlorure</tspan><tspan x="240" dy="13.5">diffusent vers l'intérieur</tspan></text>
<rect class="fg-f-carte fg-t-encre fg-t-fin" x="62" y="240" width="7" height="7" rx="1.5"/>
<text class="fg-txt fg-txt-s" x="74" y="247" text-anchor="start">grain de sel</text>
<circle class="fg-f-encre" cx="156" cy="243.5" r="2.4"/>
<text class="fg-txt fg-txt-s" x="164" y="247" text-anchor="start">ion de sel dissous</text>`
  },
  {
    ou: "cas",
    type: "comparaison",
    titre: "Quand saler une viande ou un poisson ?",
    legende: "Illustration : à l'instant même, ou bien à l'avance. Entre les deux, le sel a fait sortir l'eau sans avoir eu le temps de rentrer.",
    alt: "Trois coupes d'une pièce de viande posée sur une poêle chaude. À gauche, salée à l'instant même : des grains de sel sur le dessus, la surface est sèche et une croûte dorée se forme dessous. Au milieu, salée un quart d'heure avant : l'eau est sortie, des gouttes perlent sur le dessus et une flaque s'étale dans la poêle, mais le sel n'est pas encore rentré ; la surface mouillée ne dore pas, c'est le pire moment. À droite, salée la veille : plus de grains en surface, le sel est entré dans la chair, la surface est sèche, la croûte dorée se forme et la viande rend moins de jus.",
    panneaux: [
      {
        label: "À l'instant même",
        sous: "surface sèche : elle dore bien",
        ton: "vert",
        vb: "6 8 88 62",
        corps: `<path class="fg-t-terra fg-t-epais" d="M6 63H94"/><rect class="fg-f-terra-l fg-t-terra" x="14" y="32" width="72" height="28" rx="9"/><rect class="fg-f-terra" x="17" y="56" width="66" height="4" rx="2"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="24" y="24" width="7" height="7" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="40" y="22" width="7" height="7" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="57" y="24" width="7" height="7" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="71" y="22" width="7" height="7" rx="1.5"/>`
      },
      {
        label: "Un quart d'heure avant",
        sous: "surface mouillée : elle ne dore pas",
        ton: "or",
        vb: "6 8 88 62",
        corps: `<path class="fg-t-terra fg-t-epais" d="M6 63H94"/><rect class="fg-f-terra-l fg-t-terra" x="14" y="32" width="72" height="28" rx="9"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="30" y="25" width="7" height="7" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="62" y="25" width="7" height="7" rx="1.5"/><path class="fg-f-bleu" transform="translate(18 26) scale(0.62)" d="M0 -6C4 -1 5 2 0 5C-5 2 -4 -1 0 -6Z"/><path class="fg-f-bleu" transform="translate(30 17) scale(0.62)" d="M0 -6C4 -1 5 2 0 5C-5 2 -4 -1 0 -6Z"/><path class="fg-f-bleu" transform="translate(44 15) scale(0.62)" d="M0 -6C4 -1 5 2 0 5C-5 2 -4 -1 0 -6Z"/><path class="fg-f-bleu" transform="translate(58 17) scale(0.62)" d="M0 -6C4 -1 5 2 0 5C-5 2 -4 -1 0 -6Z"/><path class="fg-f-bleu" transform="translate(72 15) scale(0.62)" d="M0 -6C4 -1 5 2 0 5C-5 2 -4 -1 0 -6Z"/><path class="fg-f-bleu" transform="translate(82 25) scale(0.62)" d="M0 -6C4 -1 5 2 0 5C-5 2 -4 -1 0 -6Z"/><path class="fg-f-bleu" transform="translate(12 40) scale(0.62)" d="M0 -6C4 -1 5 2 0 5C-5 2 -4 -1 0 -6Z"/><path class="fg-f-bleu" transform="translate(88 41) scale(0.62)" d="M0 -6C4 -1 5 2 0 5C-5 2 -4 -1 0 -6Z"/><ellipse class="fg-f-bleu-l fg-t-bleu fg-t-fin" cx="50" cy="66" rx="40" ry="4.5"/>`
      },
      {
        label: "La veille",
        sous: "le sel est rentré : moins de jus",
        ton: "vert",
        vb: "6 8 88 62",
        corps: `<path class="fg-t-terra fg-t-epais" d="M6 63H94"/><rect class="fg-f-terra-l fg-t-terra" x="14" y="32" width="72" height="28" rx="9"/><rect class="fg-f-terra" x="17" y="56" width="66" height="4" rx="2"/><circle class="fg-f-encre" cx="26" cy="46" r="1.8"/><circle class="fg-f-encre" cx="40" cy="41" r="1.8"/><circle class="fg-f-encre" cx="54" cy="47" r="1.8"/><circle class="fg-f-encre" cx="68" cy="41" r="1.8"/><circle class="fg-f-encre" cx="32" cy="54" r="1.8"/><circle class="fg-f-encre" cx="60" cy="54" r="1.8"/><circle class="fg-f-encre" cx="76" cy="49" r="1.8"/>`
      }
    ]
  },
  {
    ou: "pourquoi",
    apres: 3,
    type: "courbe",
    qualitative: true,
    titre: "Deux vitesses, une fenêtre mouillée",
    legende: "Allure qualitative : l'eau sort tout de suite, le sel met des heures à rentrer. La durée de la fenêtre, elle, n'est pas documentée.",
    alt: "Courbes sans valeurs chiffrées, le temps après le salage en abscisse, de l'instant même jusqu'à plusieurs heures. L'eau perlée en surface monte très vite, atteint un maximum, puis redescend lentement à mesure que le sel pénètre et que le réseau musculaire retient l'eau. Le sel entré dans l'aliment, lui, monte lentement : il reste faible longtemps, puis rattrape. Entre les deux s'ouvre une fenêtre où la surface reste mouillée et ne dore pas ; sa durée exacte dépend de l'épaisseur, de la dose et de la température et n'est pas documentée. Allure qualitative.",
    x: {
      label: "Temps après le salage",
      extremites: ["à l'instant", "des heures"]
    },
    y: { label: "Quantité (allure seulement)" },
    series: [
      {
        nom: "Eau perlée en surface",
        ton: "bleu",
        aire: true,
        points: [[0, 0], [7, 0.62], [18, 1], [40, 0.85], [66, 0.4], [100, 0.08]]
      },
      {
        nom: "Sel entré dans l'aliment",
        ton: "encre",
        points: [[0, 0], [30, 0.1], [58, 0.42], [82, 0.8], [100, 0.95]]
      }
    ],
    zones: [
      { de: 10, a: 74, label: "fenêtre mouillée : durée non documentée", ton: "or" }
    ]
  },
  {
    ou: "reperes",
    type: "etapes",
    titre: "Dégorger un légume",
    legende: "Le geste d'un légume qui rend son eau : une bonne cuillère à café de sel fin pour 500 g, une demi-heure à une heure d'attente.",
    alt: "Trois étapes reliées par des flèches. Un : saler, avec une bonne cuillère à café de sel fin pour 500 g de légume. Deux : attendre de 30 minutes à une heure, l'eau perle et s'écoule. Trois : rincer, puis éponger.",
    etapes: [
      {
        libelle: "Saler",
        desc: "une bonne cuillère à café de sel fin pour 500 g",
        emoji: "🧂",
        ton: "or"
      },
      { libelle: "Attendre", desc: "30 min à 1 h : l'eau perle et coule", emoji: "💧", ton: "bleu" },
      { libelle: "Rincer", desc: "puis bien éponger", emoji: "🚿", ton: "vert" }
    ]
  }
];

FIGURES["assaisonnement-couches"] = [
  {
    ou: "tete",
    type: "svg",
    vb: "0 0 320 282",
    titre: "Où va le sel : dans l'aliment ou sur lui",
    legende: "Seule l'eau de cuisson peut faire entrer le sel : ce qu'on ajoute ensuite reste en surface. Les points marquent le sel entré dans l'aliment.",
    alt: "Trois coupes d'aliments. Une pomme de terre dans l'eau salée : après vingt minutes, le sel ne gagne que quelques millimètres sous la peau, on le voit en anneau de points à la périphérie, et le cœur reste peu salé. Des pâtes dans l'eau salée : elles boivent l'eau et donc le sel, les points sont répartis dans toute la pâte, salée de part en part. Une pomme de terre salée à la fin : les grains de sel restent tout autour, en surface, et rien n'est entré ; on obtient des pointes salées et un cœur fade.",
    corps: `<circle class="fg-f-or-l fg-t-or fg-t-epais" cx="46" cy="45" r="31"/><circle class="fg-t-or fg-t-fin fg-tirets" cx="46" cy="45" r="23"/><circle class="fg-f-encre" cx="70.6" cy="45" r="1.9"/><circle class="fg-f-encre" cx="27.7" cy="61.8" r="1.9"/><circle class="fg-f-encre" cx="48.2" cy="20.1" r="1.9"/><circle class="fg-f-encre" cx="61.4" cy="65" r="1.9"/><circle class="fg-f-encre" cx="21" cy="40.6" r="1.9"/><circle class="fg-f-encre" cx="67.6" cy="31.2" r="1.9"/><circle class="fg-f-encre" cx="39.3" cy="70" r="1.9"/><circle class="fg-f-encre" cx="34" cy="21.9" r="1.9"/><circle class="fg-f-encre" cx="70.6" cy="54" r="1.9"/><circle class="fg-f-encre" cx="21.6" cy="55.1" r="1.9"/><circle class="fg-f-encre" cx="57.3" cy="20.9" r="1.9"/><circle class="fg-f-encre" cx="54" cy="70.6" r="1.9"/><circle class="fg-f-encre" cx="22.6" cy="31.5" r="1.9"/><circle class="fg-f-encre" cx="72.6" cy="39.2" r="1.9"/><circle class="fg-f-encre" cx="30.2" cy="67.4" r="1.9"/><circle class="fg-f-encre" cx="42.5" cy="17.6" r="1.9"/><circle class="fg-f-encre" cx="67.2" cy="62.9" r="1.9"/><circle class="fg-f-encre" cx="18.1" cy="46.2" r="1.9"/><circle class="fg-f-encre" cx="66" cy="25.1" r="1.9"/><circle class="fg-f-encre" cx="44.7" cy="73.3" r="1.9"/><circle class="fg-f-encre" cx="27.7" cy="23.1" r="1.9"/><circle class="fg-f-encre" cx="74.4" cy="48.8" r="1.9"/><circle class="fg-f-encre" cx="22.3" cy="61.5" r="1.9"/><circle class="fg-f-encre" cx="52.4" cy="16.7" r="1.9"/><circle class="fg-f-encre" cx="60.5" cy="70.4" r="1.9"/><circle class="fg-f-encre" cx="18" cy="36.1" r="1.9"/><text class="fg-txt-script fg-txt-doux" x="46" y="50" text-anchor="middle">cœur</text><text class="fg-txt fg-txt-b" x="96" y="28" text-anchor="start">Pomme de terre, eau salée</text><text class="fg-txt fg-txt-s" x="96" y="45" text-anchor="start"><tspan x="96">Vingt minutes : le sel ne dépasse pas</tspan><tspan x="96" dy="13.5">quelques millimètres sous la peau ;</tspan><tspan x="96" dy="13.5">le cœur reste peu salé.</tspan></text><circle class="fg-f-or-l fg-t-or fg-t-epais" cx="46" cy="123" r="31"/><circle class="fg-f-encre" cx="58.3" cy="123" r="1.9"/><circle class="fg-f-encre" cx="36.4" cy="131.8" r="1.9"/><circle class="fg-f-encre" cx="47.2" cy="109.4" r="1.9"/><circle class="fg-f-encre" cx="54.7" cy="134.3" r="1.9"/><circle class="fg-f-encre" cx="31.4" cy="120.4" r="1.9"/><circle class="fg-f-encre" cx="59" cy="114.7" r="1.9"/><circle class="fg-f-encre" cx="41.9" cy="138.4" r="1.9"/><circle class="fg-f-encre" cx="38.4" cy="108.4" r="1.9"/><circle class="fg-f-encre" cx="61.9" cy="128.8" r="1.9"/><circle class="fg-f-encre" cx="29.9" cy="129.7" r="1.9"/><circle class="fg-f-encre" cx="53.6" cy="106.8" r="1.9"/><circle class="fg-f-encre" cx="51.5" cy="140.5" r="1.9"/><circle class="fg-f-encre" cx="29.7" cy="113.6" r="1.9"/><circle class="fg-f-encre" cx="64.8" cy="118.9" r="1.9"/><circle class="fg-f-encre" cx="34.7" cy="139.1" r="1.9"/><circle class="fg-f-encre" cx="43.4" cy="103" r="1.9"/><circle class="fg-f-encre" cx="61.7" cy="136.2" r="1.9"/><circle class="fg-f-encre" cx="25.1" cy="123.9" r="1.9"/><circle class="fg-f-encre" cx="61.1" cy="107.9" r="1.9"/><circle class="fg-f-encre" cx="45" cy="144.7" r="1.9"/><circle class="fg-f-encre" cx="31.8" cy="106" r="1.9"/><circle class="fg-f-encre" cx="68.3" cy="126" r="1.9"/><circle class="fg-f-encre" cx="27.2" cy="136.1" r="1.9"/><circle class="fg-f-encre" cx="51.1" cy="100.3" r="1.9"/><circle class="fg-f-encre" cx="57.7" cy="143.5" r="1.9"/><circle class="fg-f-encre" cx="23.2" cy="115.7" r="1.9"/><circle class="fg-f-encre" cx="68.1" cy="112.8" r="1.9"/><circle class="fg-f-encre" cx="36.5" cy="145.7" r="1.9"/><circle class="fg-f-encre" cx="37.5" cy="99.5" r="1.9"/><circle class="fg-f-encre" cx="68.4" cy="134.8" r="1.9"/><circle class="fg-f-encre" cx="21.2" cy="129.5" r="1.9"/><circle class="fg-f-encre" cx="60" cy="101.2" r="1.9"/><circle class="fg-f-encre" cx="50.5" cy="148.9" r="1.9"/><circle class="fg-f-encre" cx="25" cy="106.7" r="1.9"/><circle class="fg-f-encre" cx="72.8" cy="120.8" r="1.9"/><circle class="fg-f-encre" cx="27.5" cy="143" r="1.9"/><circle class="fg-f-encre" cx="46.1" cy="95.5" r="1.9"/><circle class="fg-f-encre" cx="64.7" cy="143.6" r="1.9"/><circle class="fg-f-carte fg-t-or" cx="46" cy="123" r="8"/><text class="fg-txt fg-txt-b" x="96" y="106" text-anchor="start">Pâtes, eau salée</text><text class="fg-txt fg-txt-s" x="96" y="123" text-anchor="start"><tspan x="96">Elles boivent l'eau, donc le sel :</tspan><tspan x="96" dy="13.5">salées de part en part.</tspan></text><circle class="fg-f-or-l fg-t-or fg-t-epais" cx="46" cy="201" r="28"/><text class="fg-txt-script fg-txt-doux" x="46" y="206" text-anchor="middle">fade</text><rect class="fg-f-carte fg-t-encre fg-t-fin" x="77.3" y="204.6" width="7" height="7" rx="1.5" transform="rotate(10 80.8 208.1)"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="69.1" y="221" width="7" height="7" rx="1.5" transform="rotate(40 72.6 224.5)"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="53.8" y="231.2" width="7" height="7" rx="1.5" transform="rotate(70 57.3 234.7)"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="35.4" y="232.3" width="7" height="7" rx="1.5" transform="rotate(100 38.9 235.8)"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="19" y="224.1" width="7" height="7" rx="1.5" transform="rotate(130 22.5 227.6)"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="8.8" y="208.8" width="7" height="7" rx="1.5" transform="rotate(160 12.3 212.3)"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="7.7" y="190.4" width="7" height="7" rx="1.5" transform="rotate(190 11.2 193.9)"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="15.9" y="174" width="7" height="7" rx="1.5" transform="rotate(220 19.4 177.5)"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="31.2" y="163.8" width="7" height="7" rx="1.5" transform="rotate(250 34.7 167.3)"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="49.6" y="162.7" width="7" height="7" rx="1.5" transform="rotate(280 53.1 166.2)"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="66" y="170.9" width="7" height="7" rx="1.5" transform="rotate(310 69.5 174.4)"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="76.2" y="186.2" width="7" height="7" rx="1.5" transform="rotate(340 79.7 189.7)"/><text class="fg-txt fg-txt-b" x="96" y="184" text-anchor="start">Sel jeté à la fin</text><text class="fg-txt fg-txt-s" x="96" y="201" text-anchor="start"><tspan x="96">Il ne quitte pas la surface :</tspan><tspan x="96" dy="13.5">pointes salées, cœur fade.</tspan></text><path class="fg-t-grille" d="M10 84H310M10 162H310"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="62" y="262" width="7" height="7" rx="1.5"/>
<text class="fg-txt fg-txt-s" x="74" y="269" text-anchor="start">grain de sel</text>
<circle class="fg-f-encre" cx="162" cy="265.5" r="2.4"/>
<text class="fg-txt fg-txt-s" x="170" y="269" text-anchor="start">sel entré dans l'aliment</text>`
  },
  {
    ou: "cas",
    type: "etapes",
    titre: "Où mettre chaque couche de sel",
    legende: "Le sel précoce travaille là où l'eau ne gêne pas ; celui du dessus est une pointe, pas un assaisonnement.",
    alt: "Trois étapes reliées par des flèches. Un : au début, dans l'eau de cuisson ou la marinade, le sel entre dans l'aliment. Deux : après la coloration, pour les champignons ou la courge à saisir, on sale une fois la couleur prise, car le sel précoce fait perler l'eau et empêche de dorer. Trois : à la fin, la fleur de sel posée sur une surface sèche donne des pointes qui craquent, sans assaisonner.",
    etapes: [
      {
        libelle: "Au début",
        desc: "eau de cuisson, marinade : le sel entre dans l'aliment",
        emoji: "🍝",
        ton: "bleu"
      },
      {
        libelle: "Après la couleur",
        desc: "champignons, courge à saisir : salez une fois dorés",
        emoji: "🍄",
        ton: "terra"
      },
      {
        libelle: "À la fin",
        desc: "fleur de sel sur surface sèche : une pointe qui craque",
        emoji: "🧂",
        ton: "or"
      }
    ]
  },
  {
    ou: "pourquoi",
    apres: 2,
    type: "courbe",
    qualitative: true,
    titre: "La salinité, bouchée après bouchée",
    legende: "Allure qualitative : salé à cœur, le goût est égal ; salé en surface, il alterne pointes et bouchées fades. Que l'un vaille mieux que l'autre ne se démontre pas.",
    alt: "Courbe sans valeurs chiffrées : la salinité perçue au fil des bouchées. Un aliment salé à cœur donne une ligne plate, un goût égal d'une bouchée à l'autre. Un aliment salé seulement en surface donne une ligne en dents de scie : des pointes de salinité entre des bouchées fades. Les pointes peuvent être voulues, comme avec la fleur de sel de finition. Allure qualitative.",
    x: {
      label: "Bouchées successives",
      extremites: ["la première", "la dernière"]
    },
    y: { label: "Salinité perçue (allure seulement)" },
    h: 150,
    series: [
      {
        nom: "Salé à cœur",
        ton: "vert",
        points: [[0, 0.55], [100, 0.55]]
      },
      {
        nom: "Salé en surface",
        ton: "or",
        points: [[0, 0.08], [10, 0.1], [18, 0.95], [27, 0.1], [40, 0.1], [48, 0.95], [57, 0.1], [70, 0.1], [78, 0.95], [87, 0.1], [100, 0.08]]
      }
    ]
  },
  {
    ou: "reperes",
    type: "svg",
    vb: "0 0 320 190",
    titre: "L'eau salée : une petite part entre",
    legende: "Illustration des proportions, sans échelle : l'aliment n'absorbe qu'une fraction du sel de l'eau, et le reste s'en va à l'évier.",
    alt: "Une casserole contenant un litre d'eau, salée à environ 10 grammes de sel. Deux flèches en partent vers la droite. Une flèche fine mène à l'aliment : il n'absorbe qu'une petite part du sel. Une flèche épaisse mène à l'évier : le reste s'en va avec l'eau. Illustration sans échelle.",
    corps: `<path class="fg-f-carte fg-t-encre fg-t-epais" d="M30 40L40 142Q41 150 49 150H131Q139 150 140 142L150 40Z"/>
<path class="fg-f-bleu-l fg-t-bleu" d="M34 66L41 140Q42 146 49 146H131Q138 146 139 140L146 66Z"/>
<path class="fg-t-bleu fg-t-fin" d="M34 66Q48 61 62 66T90 66T118 66T146 66"/>
<path class="fg-t-encre fg-t-epais" d="M22 40H158"/>
<text class="fg-txt fg-txt-b fg-txt-bleu" x="90" y="106" text-anchor="middle">1 litre</text>
<text class="fg-txt-script fg-txt-bleu" x="90" y="124" text-anchor="middle">d'eau</text>
<rect class="fg-f-carte fg-t-encre fg-t-fin" x="76" y="20" width="8" height="8" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="88" y="14" width="8" height="8" rx="1.5" transform="rotate(14 92 18)"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="100" y="20" width="8" height="8" rx="1.5"/>
<text class="fg-txt fg-txt-b" x="90" y="178" text-anchor="middle">environ 10 g de sel</text>
<path class="fg-t-or" d="M150 86L186 66" marker-end="url(#fg-fl-or)"/>
<path class="fg-t-axe fg-t-tres-epais" d="M150 120L184 148" marker-end="url(#fg-fl-encre)"/>
<rect class="fg-f-or-l fg-t-or" x="192" y="40" width="120" height="50" rx="10"/>
<text class="fg-txt fg-txt-b fg-txt-or" x="252" y="60" text-anchor="middle">Dans l'aliment</text>
<text class="fg-txt fg-txt-s" x="252" y="76" text-anchor="middle">une petite part</text>
<rect class="fg-f-doux fg-t-doux" x="192" y="124" width="120" height="50" rx="10"/>
<text class="fg-txt fg-txt-b" x="252" y="144" text-anchor="middle">À l'évier</text>
<text class="fg-txt fg-txt-s" x="252" y="160" text-anchor="middle">tout le reste</text>`
  }
];

FIGURES["sel-patisserie"] = [
  {
    ou: "tete",
    type: "svg",
    vb: "0 0 320 322",
    titre: "Le sel ne sucre pas : il lève un masque",
    legende: "Illustration qualitative, sans valeurs : l'amertume masque le sucré ; le sodium l'atténue, et le sucré se détache.",
    alt: "Deux petits diagrammes en barres, sans valeurs chiffrées. Sans sel : une grande barre pour l'amer et une petite barre pâle pour le sucré, qui est masqué. Avec du sel : la barre de l'amer est plus basse et la barre du sucré est haute et nette. Le sodium atténue l'amertume, qui masquait le sucré : c'est une levée d'inhibition, montrée par Breslin et Beauchamp en 1997. Un cadre signale ce qui est discuté : que le sel agisse directement sur le récepteur du sucré est mal établi, et l'endroit exact où se joue l'effet n'est pas tranché.",
    corps: `<rect class="fg-f-carte fg-t-doux" x="8" y="8" width="140" height="170" rx="12"/>
<rect class="fg-f-carte fg-t-doux" x="172" y="8" width="140" height="170" rx="12"/>
<text class="fg-txt fg-txt-b" x="78" y="30" text-anchor="middle">Sans sel</text>
<text class="fg-txt fg-txt-b fg-txt-vert" x="242" y="30" text-anchor="middle">Avec du sel</text>
<path class="fg-t-axe" d="M26 150H130M190 150H294"/>
<rect class="fg-f-terra" x="37" y="50" width="34" height="100" rx="5"/><rect class="fg-f-or" x="85" y="122" width="34" height="28" rx="5" opacity=".4"/>
<rect class="fg-f-terra" x="201" y="104" width="34" height="46" rx="5" opacity=".75"/><rect class="fg-f-or" x="249" y="62" width="34" height="88" rx="5"/>
<text class="fg-txt fg-txt-s" x="54" y="167" text-anchor="middle">amer</text>
<text class="fg-txt fg-txt-s" x="102" y="167" text-anchor="middle">sucré</text>
<text class="fg-txt fg-txt-s" x="218" y="167" text-anchor="middle">amer</text>
<text class="fg-txt fg-txt-s" x="266" y="167" text-anchor="middle">sucré</text>
<text class="fg-txt-script fg-txt-terra" x="102" y="76" text-anchor="middle">masqué</text>
<text class="fg-txt-script fg-txt-or" x="266" y="50" text-anchor="middle">net</text>
<path class="fg-t-axe" d="M151 92L169 92" marker-end="url(#fg-fl-encre)"/>
<text class="fg-txt fg-txt-b fg-txt-vert" x="160" y="204" text-anchor="middle"><tspan x="160">Le sodium atténue l'amertume ;</tspan><tspan x="160" dy="13.5">libéré, le sucré paraît plus net.</tspan></text>
<text class="fg-txt fg-txt-s" x="160" y="238" text-anchor="middle"><tspan x="160">Breslin et Beauchamp, 1997 : la levée d'inhibition</tspan></text>
<rect class="fg-f-or-l fg-t-or fg-t-fin fg-tirets" x="8" y="250" width="304" height="62" rx="10"/>
<text class="fg-txt fg-txt-s" x="160" y="269" text-anchor="middle"><tspan class="fg-txt-b fg-txt-or" x="160">Mal établi, discuté</tspan><tspan x="160" dy="13.5">que le sel agisse directement sur le récepteur</tspan><tspan x="160" dy="13.5">du sucré, ou plus haut, dans le mélange des goûts</tspan></text>`
  },
  {
    ou: "cas",
    type: "barres",
    unite: "g",
    titre: "Sel pour 100 g de beurre « demi-sel »",
    legende: "La mention couvre un écart de près de quatre fois : lisez le pourcentage sur l'étiquette, puis retranchez cette part du sel de la recette.",
    alt: "Deux barres en grammes de sel pour 100 grammes de beurre. Un demi-sel le moins salé en contient 0,8 gramme, un demi-sel le plus salé 3 grammes, soit près de quatre fois plus. Au-delà de 3 grammes, le beurre est dit salé.",
    barres: [
      { label: "Un demi-sel peu salé", valeur: 0.8, texte: "0,8 g", ton: "or" },
      {
        label: "Un demi-sel très salé",
        valeur: 3,
        texte: "3 g",
        ton: "terra",
        note: "Au-delà de 3 g, le beurre est dit « salé »."
      }
    ]
  },
  {
    ou: "cas",
    type: "comparaison",
    titre: "Dans la pâte ou posé dessus",
    legende: "Illustration : le sel de la pâte est réparti partout ; la fleur de sel de dessus reste en cristaux et fait des pointes.",
    alt: "Deux biscuits vus de dessus. À gauche, le sel est dans la pâte, tamisé avec les poudres : il est réparti partout, jamais en pointes, et ne pourra plus être ajusté. À droite, la fleur de sel est posée sur le dessus : quelques gros cristaux restent entiers et donnent des pointes salées qui alternent avec le sucré. C'est un contraste, pas un assaisonnement.",
    panneaux: [
      {
        label: "Dans la pâte",
        sous: "réparti partout, jamais en pointes",
        ton: "vert",
        vb: "20 6 80 72",
        corps: `<circle class="fg-f-terra" cx="60" cy="42" r="33" opacity=".6"/><circle class="fg-t-terra" cx="60" cy="42" r="33"/><circle class="fg-f-terra" cx="46" cy="32" r="3.6"/><circle class="fg-f-terra" cx="72" cy="38" r="3.6"/><circle class="fg-f-terra" cx="56" cy="58" r="3.6"/><circle class="fg-f-terra" cx="78" cy="56" r="3.6"/><circle class="fg-f-terra" cx="38" cy="52" r="3.6"/><circle class="fg-f-encre" cx="40" cy="40" r="1.7"/><circle class="fg-f-encre" cx="55" cy="30" r="1.7"/><circle class="fg-f-encre" cx="70" cy="32" r="1.7"/><circle class="fg-f-encre" cx="62" cy="47" r="1.7"/><circle class="fg-f-encre" cx="48" cy="46" r="1.7"/><circle class="fg-f-encre" cx="74" cy="49" r="1.7"/><circle class="fg-f-encre" cx="36" cy="60" r="1.7"/><circle class="fg-f-encre" cx="60" cy="66" r="1.7"/><circle class="fg-f-encre" cx="84" cy="40" r="1.7"/><circle class="fg-f-encre" cx="50" cy="62" r="1.7"/><circle class="fg-f-encre" cx="68" cy="24" r="1.7"/><circle class="fg-f-encre" cx="82" cy="62" r="1.7"/>`
      },
      {
        label: "Fleur de sel dessus",
        sous: "des pointes salées qui alternent avec le sucré",
        ton: "or",
        vb: "20 6 80 72",
        corps: `<circle class="fg-f-terra" cx="60" cy="42" r="33" opacity=".6"/><circle class="fg-t-terra" cx="60" cy="42" r="33"/><circle class="fg-f-terra" cx="46" cy="32" r="3.6"/><circle class="fg-f-terra" cx="72" cy="38" r="3.6"/><circle class="fg-f-terra" cx="56" cy="58" r="3.6"/><circle class="fg-f-terra" cx="78" cy="56" r="3.6"/><circle class="fg-f-terra" cx="38" cy="52" r="3.6"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="42" y="26" width="9" height="9" rx="1.5" transform="rotate(126 46.5 30.5)"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="64" y="28" width="9" height="9" rx="1.5" transform="rotate(192 68.5 32.5)"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="50" y="46" width="9" height="9" rx="1.5" transform="rotate(150 54.5 50.5)"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="74" y="46" width="9" height="9" rx="1.5" transform="rotate(222 78.5 50.5)"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="58" y="62" width="8" height="8" rx="1.5" transform="rotate(174 62 66)"/>`
      }
    ]
  },
  {
    ou: "reperes",
    type: "echelle",
    titre: "Quelle dose de sel ?",
    legende: "Pâte sucrée : 2 à 3 g de sel pour 160 g de farine. Le plafond d'environ 2 % est une limite de goût, tenue par l'usage plus que par la mesure.",
    alt: "Règle graduée du sel en pourcentage du poids de farine, avec des repères à 1 % et 2 %. Une pâte sucrée, un sablé, un cookie : de 1 à 2 %, soit environ 2 à 3 grammes pour 160 grammes de farine. Une pâte levée, une brioche, une focaccia : environ 2 %. Entre 1 et 2 %, le sucré prend du relief ; au-delà d'environ 2 %, on goûte le sel lui-même et la pâte bascule dans le salé.",
    min: 0,
    max: 3,
    unite: "%",
    label: "Sel, en % du poids de farine",
    graduations: [1, 2],
    zones: [
      { de: 1, a: 2, label: "relief du sucré", ton: "vert" },
      { de: 2, a: 3, label: "on goûte le sel", ton: "terra" }
    ],
    marqueurs: [
      { v: 1.5, label: `Pâte sucrée :
1 à 2 %`, ton: "vert" },
      { v: 2, label: `Pâte levée :
environ 2 %`, ton: "or" }
    ]
  }
];

FIGURES["acidite-finale"] = [
  {
    ou: "tete",
    type: "svg",
    vb: "0 0 320 268",
    titre: "Ce que fait le trait d'acide",
    legende: "L'effet est perceptif : un contraste pour le gras et le sucré, et la salivation la plus forte de toutes les saveurs. Rien ne réveille d'arômes endormis.",
    alt: "Deux bandes de sensations. En haut, sans acide : une onde dorée, gras et sucré, occupe seule la bouche, sans rien contre quoi se détacher. En bas, avec un trait d'acide : la même onde est traversée par un pic vert, l'acide, qui fait un contraste, et des gouttes bleues figurent la salivation, qui rince la bouche au lieu de la laisser s'engourdir.",
    corps: `<rect class="fg-f-carte fg-t-doux" x="8" y="8" width="304" height="96" rx="12"/>
<text class="fg-txt fg-txt-b" x="20" y="29" text-anchor="start">Sans acide</text>
<path class="fg-f-or-l fg-aire" d="M22 64C46 58 70 70 94 64S142 58 166 64S214 70 238 64S286 58 298 64L298 90L22 90Z"/>
<path class="fg-t-or fg-t-epais" d="M22 64C46 58 70 70 94 64S142 58 166 64S214 70 238 64S286 58 298 64"/>
<text class="fg-txt fg-txt-s" x="160" y="82" text-anchor="middle">gras et sucré, seuls dans la bouche</text>
<text class="fg-txt-script fg-txt-doux" x="298" y="33" text-anchor="end">rien contre quoi se détacher</text>
<rect class="fg-f-carte fg-t-doux" x="8" y="114" width="304" height="146" rx="12"/>
<text class="fg-txt fg-txt-b fg-txt-vert" x="20" y="135" text-anchor="start">Avec un trait d'acide</text>
<path class="fg-f-or-l fg-aire" d="M22 206C46 200 70 212 94 206S142 200 166 206S214 212 238 206S286 200 298 206L298 232L22 232Z"/>
<path class="fg-t-or fg-t-epais" d="M22 206C46 200 70 212 94 206S142 200 166 206S214 212 238 206S286 200 298 206"/>
<path class="fg-f-vert fg-t-vert" d="M104 206C112 206 114 176 118 156C122 176 124 206 132 206Z"/>
<text class="fg-txt-script fg-txt-vert" x="136" y="180" text-anchor="start"><tspan x="136">l'acide :</tspan><tspan x="136" dy="17">un contraste</tspan></text>
<path class="fg-f-bleu" transform="translate(236 184) scale(1.25)" d="M0 -6C4 -1 5 2 0 5C-5 2 -4 -1 0 -6Z"/><path class="fg-f-bleu" transform="translate(262 172) scale(1.25)" d="M0 -6C4 -1 5 2 0 5C-5 2 -4 -1 0 -6Z"/><path class="fg-f-bleu" transform="translate(288 186) scale(1.25)" d="M0 -6C4 -1 5 2 0 5C-5 2 -4 -1 0 -6Z"/><path class="fg-f-bleu" transform="translate(248 204) scale(1)" d="M0 -6C4 -1 5 2 0 5C-5 2 -4 -1 0 -6Z"/><path class="fg-f-bleu" transform="translate(276 208) scale(1)" d="M0 -6C4 -1 5 2 0 5C-5 2 -4 -1 0 -6Z"/>
<text class="fg-txt-script fg-txt-bleu" x="262" y="150" text-anchor="middle">la salivation</text>
<text class="fg-txt fg-txt-s" x="160" y="250" text-anchor="middle">la bouche se rince au lieu de s'engourdir</text>`
  },
  {
    ou: "pourquoi",
    apres: 1,
    type: "comparaison",
    fleche: true,
    titre: "Pourquoi le citron éteint l'odeur de poisson",
    legende: "Ce n'est pas un réveil d'arômes, c'est l'inverse : baisser le pH protone la triméthylamine, qui cesse de s'envoler.",
    alt: "Deux schémas de la triméthylamine, une molécule basique à l'azote entouré de trois groupes, et une flèche de l'un à l'autre. À gauche, sans acide : la molécule est libre, elle est volatile et s'envole, d'où l'odeur de poisson. À droite, avec du citron : un ion H plus s'est fixé sur l'azote, la molécule est protonée et cesse de s'envoler, l'odeur s'éteint.",
    panneaux: [
      {
        label: "Sans acide",
        sous: "triméthylamine libre : elle s'envole",
        ton: "terra",
        vb: "0 -10 128 100",
        corps: `<circle class="fg-f-vert-l fg-t-vert fg-t-epais" cx="60" cy="58" r="13"/><text class="fg-txt fg-txt-b fg-txt-vert" x="60" y="63" text-anchor="middle">N</text><path class="fg-t-vert" d="M60 58L60 28"/><circle class="fg-f-vert-l fg-t-vert fg-t-fin" cx="60" cy="28" r="7"/><path class="fg-t-vert" d="M60 58L34 76"/><circle class="fg-f-vert-l fg-t-vert fg-t-fin" cx="34" cy="76" r="7"/><path class="fg-t-vert" d="M60 58L86 76"/><circle class="fg-f-vert-l fg-t-vert fg-t-fin" cx="86" cy="76" r="7"/><path class="fg-t-terra fg-t-fin" d="M44 18C37 12 51 8 44 2S51 -4 44 -8"/><path class="fg-t-terra fg-t-fin" d="M60 18C53 12 67 8 60 2S67 -4 60 -8"/><path class="fg-t-terra fg-t-fin" d="M76 18C69 12 83 8 76 2S83 -4 76 -8"/><text class="fg-txt-script fg-txt-terra" x="86" y="8" text-anchor="start">odeur</text>`
      },
      {
        label: "Avec du citron",
        sous: "protonée : elle reste dans le plat",
        ton: "vert",
        vb: "0 -10 128 100",
        corps: `<circle class="fg-f-vert-l fg-t-vert fg-t-epais" cx="60" cy="58" r="13"/><text class="fg-txt fg-txt-b fg-txt-vert" x="60" y="63" text-anchor="middle">N</text><path class="fg-t-vert" d="M60 58L60 28"/><circle class="fg-f-vert-l fg-t-vert fg-t-fin" cx="60" cy="28" r="7"/><path class="fg-t-vert" d="M60 58L34 76"/><circle class="fg-f-vert-l fg-t-vert fg-t-fin" cx="34" cy="76" r="7"/><path class="fg-t-vert" d="M60 58L86 76"/><circle class="fg-f-vert-l fg-t-vert fg-t-fin" cx="86" cy="76" r="7"/><path class="fg-t-or" d="M72 48L90 36"/><circle class="fg-f-or fg-pt" cx="96" cy="31" r="9"/><text class="fg-txt fg-txt-s fg-txt-b" x="96" y="35.5" text-anchor="middle">H<tspan dy="-4">+</tspan></text>`
      }
    ]
  },
  {
    ou: "cas",
    type: "courbe",
    qualitative: true,
    titre: "Le jus d'agrume : hors du feu",
    legende: "Allure qualitative : sur le feu, les arômes très volatils du jus partent en quelques minutes ; il ne reste que l'acidité nue.",
    alt: "Courbes sans valeurs chiffrées, le temps passé sur le feu en abscisse. Les arômes du jus d'agrume sont entiers hors du feu, puis déclinent vite et disparaissent en quelques minutes de chaleur. L'acidité, elle, reste constante : il ne reste que l'acidité nue, et le plat est acide sans avoir le goût de citron. Allure qualitative.",
    x: {
      label: "Temps passé sur le feu",
      extremites: ["hors du feu", "quelques minutes"]
    },
    y: { label: "Ce qui reste dans le plat" },
    h: 150,
    series: [
      {
        nom: "Acidité",
        ton: "vert",
        tirets: true,
        points: [[0, 0.9], [100, 0.9]]
      },
      {
        nom: "Arômes du jus",
        ton: "or",
        aire: true,
        points: [[0, 1], [12, 0.62], [28, 0.28], [50, 0.1], [100, 0.03]]
      }
    ],
    notes: [
      { x: 60, y: 0.08, texte: "ne reste que l'acidité nue", dx: -10, dy: -56, largeur: 120, ancre: "end" }
    ]
  },
  {
    ou: "reperes",
    type: "echelle",
    titre: "Le pH et la tenue des légumes",
    legende: "Plus acide à gauche. La pectine résiste le mieux autour de pH 4 à 4,5 ; plus acide encore, l'hydrolyse prend le relais.",
    alt: "Règle graduée du pH, de 3 à 5, avec des repères à 3,5, 4 et 4,5. Sous pH 4,5, la β-élimination, voie par laquelle la pectine des parois se défait à la cuisson, est freinée. Entre pH 4 et 4,5, la pectine se dégrade le plus lentement : les légumes tiennent. Vers pH 3,5, l'hydrolyse acide prend le relais et ramollit à son tour.",
    min: 3,
    max: 5,
    unite: "",
    label: "pH du milieu",
    graduations: [3.5, 4, 4.5],
    zones: [
      { de: 3, a: 3.5, label: "hydrolyse", ton: "terra" },
      { de: 4, a: 4.5, label: "le plus lent", ton: "vert" }
    ],
    marqueurs: [
      {
        v: 3.5,
        label: "Vers 3,5 : l'hydrolyse acide prend le relais",
        ton: "terra"
      },
      { v: 4.5, label: "Sous 4,5 : la β-élimination est freinée", ton: "vert" }
    ]
  }
];

FIGURES["salaison"] = [
  {
    ou: "tete",
    type: "svg",
    vb: "0 0 320 294",
    titre: "Le sel avance du bord vers le cœur",
    legende: "Illustration d'un filet de 500 g coupé en travers, sous un mélange de sel et de sucre en parts égales : des repères d'usage, calés sur l'épaisseur plus que sur une mesure.",
    alt: "Trois coupes d'un filet de saumon, chacune sous et sur une couche de mélange sel et sucre à parts égales, de plus en plus salées du bord vers le cœur. En moins de 8 heures, seule une mince bande du bord est salée, le centre reste cru et mou. Entre 12 et 24 heures, le filet de 500 grammes est salé en dégradé : ferme au bord, plus souple au cœur. Après plus de 36 heures, le sel a gagné tout le cœur : la chair est sèche, dure et compacte.",
    corps: `<g transform="translate(0 12)"><rect class="fg-f-terra-l fg-t-terra" x="126" y="22" width="184" height="46" rx="3"/><rect class="fg-f-terra" x="126" y="22" width="184" height="5" opacity="0.5"/><rect class="fg-f-terra" x="126" y="63" width="184" height="5" opacity="0.5"/><rect class="fg-f-terra" x="126" y="22" width="184" height="4" opacity="0.28"/><rect class="fg-f-terra" x="126" y="64" width="184" height="4" opacity="0.28"/><rect class="fg-t-terra" x="126" y="22" width="184" height="46" rx="3"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="131" y="14" width="6" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="131" y="70" width="6" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="147.5" y="14" width="7" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="147.5" y="70" width="7" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="164" y="14" width="6" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="164" y="70" width="6" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="180.5" y="14" width="7" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="180.5" y="70" width="7" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="197" y="14" width="6" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="197" y="70" width="6" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="213.5" y="14" width="7" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="213.5" y="70" width="7" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="230" y="14" width="6" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="230" y="70" width="6" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="246.5" y="14" width="7" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="246.5" y="70" width="7" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="263" y="14" width="6" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="263" y="70" width="6" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="279.5" y="14" width="7" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="279.5" y="70" width="7" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="296" y="14" width="6" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="296" y="70" width="6" height="6" rx="1.5"/>
<text class="fg-txt fg-txt-b" x="8" y="42" text-anchor="start">Moins de 8 h</text>
<text class="fg-txt fg-txt-s" x="8" y="58" text-anchor="start"><tspan x="8">le centre reste</tspan><tspan x="8" dy="13.5">cru et mou</tspan></text>
<rect class="fg-f-terra-l fg-t-terra" x="126" y="104" width="184" height="46" rx="3"/><rect class="fg-f-terra" x="126" y="104" width="184" height="11" opacity="0.5"/><rect class="fg-f-terra" x="126" y="139" width="184" height="11" opacity="0.5"/><rect class="fg-f-terra" x="126" y="104" width="184" height="8" opacity="0.28"/><rect class="fg-f-terra" x="126" y="142" width="184" height="8" opacity="0.28"/><rect class="fg-t-terra" x="126" y="104" width="184" height="46" rx="3"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="131" y="96" width="6" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="131" y="152" width="6" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="147.5" y="96" width="7" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="147.5" y="152" width="7" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="164" y="96" width="6" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="164" y="152" width="6" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="180.5" y="96" width="7" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="180.5" y="152" width="7" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="197" y="96" width="6" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="197" y="152" width="6" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="213.5" y="96" width="7" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="213.5" y="152" width="7" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="230" y="96" width="6" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="230" y="152" width="6" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="246.5" y="96" width="7" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="246.5" y="152" width="7" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="263" y="96" width="6" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="263" y="152" width="6" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="279.5" y="96" width="7" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="279.5" y="152" width="7" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="296" y="96" width="6" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="296" y="152" width="6" height="6" rx="1.5"/>
<text class="fg-txt fg-txt-b fg-txt-vert" x="8" y="124" text-anchor="start">12 à 24 h</text>
<text class="fg-txt fg-txt-s" x="8" y="140" text-anchor="start"><tspan x="8">ferme au bord,</tspan><tspan x="8" dy="13.5">souple au cœur</tspan></text>
<rect class="fg-f-terra-l fg-t-terra" x="126" y="186" width="184" height="46" rx="3"/><rect class="fg-f-terra" x="126" y="186" width="184" height="23" opacity="0.5"/><rect class="fg-f-terra" x="126" y="209" width="184" height="23" opacity="0.5"/><rect class="fg-t-terra" x="126" y="186" width="184" height="46" rx="3"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="131" y="178" width="6" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="131" y="234" width="6" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="147.5" y="178" width="7" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="147.5" y="234" width="7" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="164" y="178" width="6" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="164" y="234" width="6" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="180.5" y="178" width="7" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="180.5" y="234" width="7" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="197" y="178" width="6" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="197" y="234" width="6" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="213.5" y="178" width="7" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="213.5" y="234" width="7" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="230" y="178" width="6" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="230" y="234" width="6" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="246.5" y="178" width="7" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="246.5" y="234" width="7" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="263" y="178" width="6" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="263" y="234" width="6" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="279.5" y="178" width="7" height="6" rx="1.5"/><rect class="fg-f-or-l fg-t-or fg-t-fin" x="279.5" y="234" width="7" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="296" y="178" width="6" height="6" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="296" y="234" width="6" height="6" rx="1.5"/>
<text class="fg-txt fg-txt-b fg-txt-terra" x="8" y="206" text-anchor="start">Plus de 36 h</text>
<text class="fg-txt fg-txt-s" x="8" y="222" text-anchor="start"><tspan x="8">salé à cœur :</tspan><tspan x="8" dy="13.5">sec, dur, compact</tspan></text>
<rect class="fg-f-carte fg-t-encre fg-t-fin" x="126" y="262" width="7" height="7" rx="1.5"/><text class="fg-txt fg-txt-s" x="138" y="269" text-anchor="start">sel</text>
<rect class="fg-f-or-l fg-t-or fg-t-fin" x="172" y="262" width="7" height="7" rx="1.5"/><text class="fg-txt fg-txt-s" x="184" y="269" text-anchor="start">sucre, à parts égales</text></g>`
  },
  {
    ou: "pourquoi",
    apres: 1,
    type: "svg",
    vb: "0 0 320 224",
    titre: "À poids égal, une douzaine de fois plus de particules",
    legende: "Une molécule de sucre pèse près de six fois celle du sel, et le sel se sépare en deux ions : c'est lui qui tire l'eau, le sucre beaucoup moins.",
    alt: "À gauche, du sucre : à masse égale, une seule molécule, près de six fois plus lourde que celle du sel. À droite, du sel : six unités, chacune se séparant en deux ions, sodium et chlorure, soit une douzaine de particules actives. Entre les deux, un signe égal et la mention même poids. Conclusion : le tirage d'eau, c'est le sel ; le sucre y participe beaucoup moins qu'on ne le croit.",
    corps: `<rect class="fg-f-or-l fg-t-or fg-t-fin" x="8" y="10" width="124" height="160" rx="12"/>
<text class="fg-txt fg-txt-b fg-txt-or" x="70" y="32" text-anchor="middle">Sucre</text>
<path class="fg-f-or fg-t-or fg-t-epais" opacity=".85" d="M89.1 81L70 92L50.9 81L50.9 59L70 48L89.1 59Z"/>
<text class="fg-txt fg-txt-s" x="70" y="118" text-anchor="middle"><tspan x="70">1 molécule,</tspan><tspan x="70" dy="13.5">près de six fois</tspan><tspan x="70" dy="13.5">plus lourde</tspan></text>
<rect class="fg-f-doux fg-t-doux" x="188" y="10" width="124" height="160" rx="12"/>
<text class="fg-txt fg-txt-b" x="250" y="32" text-anchor="middle">Sel</text>
<circle class="fg-f-carte fg-t-encre" cx="223" cy="50" r="5"/><circle class="fg-f-encre" cx="231" cy="50" r="3.6"/><circle class="fg-f-carte fg-t-encre" cx="259" cy="50" r="5"/><circle class="fg-f-encre" cx="267" cy="50" r="3.6"/><circle class="fg-f-carte fg-t-encre" cx="223" cy="68" r="5"/><circle class="fg-f-encre" cx="231" cy="68" r="3.6"/><circle class="fg-f-carte fg-t-encre" cx="259" cy="68" r="5"/><circle class="fg-f-encre" cx="267" cy="68" r="3.6"/><circle class="fg-f-carte fg-t-encre" cx="223" cy="86" r="5"/><circle class="fg-f-encre" cx="231" cy="86" r="3.6"/><circle class="fg-f-carte fg-t-encre" cx="259" cy="86" r="5"/><circle class="fg-f-encre" cx="267" cy="86" r="3.6"/>
<text class="fg-txt fg-txt-s" x="250" y="118" text-anchor="middle"><tspan x="250">6 unités, chacune</tspan><tspan x="250" dy="13.5">en 2 ions : une</tspan><tspan x="250" dy="13.5">douzaine de</tspan><tspan x="250" dy="13.5">particules</tspan></text>
<text class="fg-txt fg-txt-xl fg-txt-doux" x="160" y="74" text-anchor="middle">=</text>
<text class="fg-txt-script fg-txt-doux" x="160" y="96" text-anchor="middle"><tspan x="160">même</tspan><tspan x="160" dy="15">poids</tspan></text>
<text class="fg-txt fg-txt-b fg-txt-vert" x="160" y="196" text-anchor="middle">C'est le sel qui tire l'eau</text>
<text class="fg-txt fg-txt-s" x="160" y="213" text-anchor="middle">le sucre y participe beaucoup moins qu'on ne le croit</text>`
  },
  {
    ou: "pourquoi",
    apres: 2,
    type: "courbe",
    qualitative: true,
    titre: "Le sel et l'eau retenue par la chair",
    legende: "Allure qualitative, repères placés à peu près à l'échelle : maximum vers 5 % de sel dans la phase aqueuse ; au-delà, l'effet s'inverse, puis la myosine se dénature.",
    alt: "Courbe en cloche sans valeurs chiffrées : l'eau retenue par la chair selon la quantité de sel dans sa phase aqueuse. À faible concentration, le sel gonfle les protéines myofibrillaires et la rétention d'eau augmente ; le maximum se situe vers 5 % de sel, à peu près une mole par litre. Au-delà, l'effet s'inverse et les protéines s'agrègent. Vers 8 à 10 % dans le muscle, la myosine se dénature franchement. Allure qualitative.",
    x: {
      label: "Sel dans la phase aqueuse",
      extremites: ["peu", "beaucoup"]
    },
    y: { label: "Eau retenue (allure seulement)" },
    series: [
      {
        nom: "Eau retenue",
        ton: "bleu",
        aire: true,
        points: [[0, 0.3], [18, 0.58], [36, 0.9], [50, 1], [64, 0.82], [80, 0.45], [100, 0.12]]
      }
    ],
    zones: [
      { de: 80, a: 100, label: "8 à 10 %", ton: "terra" }
    ],
    reperes: [
      { x: 50, label: "vers 5 % : maximum", ton: "vert" }
    ],
    notes: [
      { x: 88, y: 0.3, texte: "la myosine se dénature", dx: -12, dy: -56, largeur: 100, ancre: "end" }
    ]
  },
  {
    ou: "cas",
    type: "comparaison",
    titre: "La texture se ressemble, pas le résultat sanitaire",
    legende: "Dans les deux cas la chair se raffermit : mais seule la chaleur détruit micro-organismes et parasites. Un poisson salé reste un poisson cru.",
    alt: "Deux coupes de poisson côte à côte. À gauche, la cuisson : la chaleur dénature les protéines, la chair devient ferme, et en même temps les micro-organismes et les parasites sont détruits, représentés par des points barrés d'une croix. À droite, la salaison : le sel dénature aussi les protéines et la chair devient ferme, mais aucune chaleur n'a agi, donc micro-organismes et parasites sont toujours là. Un poisson salé reste un poisson cru.",
    panneaux: [
      {
        label: "Cuisson",
        sous: "ferme ; microbes et parasites détruits",
        ton: "terra",
        vb: "0 -8 100 108",
        corps: `<path class="fg-t-terra fg-t-epais" d="M30 24C24 18 36 14 30 8S36 0 30 -4M50 24C44 18 56 14 50 8S56 0 50 -4M70 24C64 18 76 14 70 8S76 0 70 -4"/><path class="fg-f-terra-l fg-t-terra" d="M14 36Q50 22 86 36L86 62Q50 74 14 62Z"/><path class="fg-t-terra fg-t-fin" d="M24 46Q38 40 50 46T76 46"/><circle class="fg-f-vert" cx="26" cy="84" r="3.8" opacity=".45"/><path class="fg-t-terra fg-t-epais" d="M19 77L33 91M33 77L19 91"/><ellipse class="fg-f-vert" cx="56" cy="90" rx="6" ry="3.4" opacity=".45"/><path class="fg-t-terra fg-t-epais" d="M49 83L63 97M63 83L49 97"/><circle class="fg-f-vert" cx="86" cy="84" r="3.8" opacity=".45"/><path class="fg-t-terra fg-t-epais" d="M79 77L93 91M93 77L79 91"/>`
      },
      {
        label: "Salaison",
        sous: "ferme ; microbes et parasites toujours là",
        ton: "or",
        vb: "0 -8 100 108",
        corps: `<rect class="fg-f-carte fg-t-encre fg-t-fin" x="24" y="12" width="8" height="8" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="46" y="6" width="8" height="8" rx="1.5" transform="rotate(12 50 10)"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="68" y="12" width="8" height="8" rx="1.5"/><path class="fg-f-terra-l fg-t-terra" d="M14 36Q50 22 86 36L86 62Q50 74 14 62Z"/><path class="fg-t-terra fg-t-fin" d="M24 46Q38 40 50 46T76 46"/><circle class="fg-f-vert" cx="26" cy="84" r="3.8"/><ellipse class="fg-f-vert" cx="56" cy="90" rx="6" ry="3.4"/><circle class="fg-f-vert" cx="86" cy="84" r="3.8"/>`
      }
    ]
  }
];

/* ===== fin Sel, acide & goût ===== */



/* ===== Végétal & couleur ===== */

/* (figures de la famille) */

/* ===== fin Végétal & couleur ===== */



/* ===== Froid, gras & sécurité ===== */

/* (figures de la famille) */

/* ===== fin Froid, gras & sécurité ===== */



/* ===== Vue d'ensemble ===== */

/* (figures transversales de l'onglet Savoirs) */

/* ===== fin Vue d'ensemble ===== */
