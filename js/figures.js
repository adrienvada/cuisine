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

FIGURES["levure-chimique"] = [
  { ou: "tete", type: "svg", vb: "0 0 320 292",
    titre: "Deux poudres qui attendent l'eau",
    legende: "À sec, la base et l'acide sont tenus à distance par la fécule. Dès qu'un liquide les dissout, ils réagissent et libèrent des bulles de gaz carbonique dans la pâte.",
    alt: "Schéma en deux temps. En haut, dans le sachet, à sec : trois poudres côte à côte, le bicarbonate (la base), la fécule de maïs qui sépare les deux et absorbe l'humidité, et un sel acide comme le phosphate acide de calcium. Une flèche descend, avec une goutte et la mention « un liquide ». En bas, dans la pâte : l'acide et la base se dissolvent et réagissent, ce qui libère du gaz carbonique, dessiné en bulles réparties dans la pâte. En dessous : c'est une réaction chimique instantanée, sans pousse ni pétrissage.",
    corps: `<text class="fg-txt fg-txt-b fg-txt-doux" x="160" y="16" text-anchor="middle">Dans le sachet, à sec</text>
<rect class="fg-f-vert-l fg-t-vert" x="8" y="24" width="96" height="76" rx="10"/>
<circle class="fg-f-vert" cx="40" cy="40" r="3"/><circle class="fg-f-vert" cx="56" cy="37" r="3"/><circle class="fg-f-vert" cx="72" cy="41" r="3"/>
<text class="fg-txt fg-txt-b fg-txt-vert" x="56" y="66" text-anchor="middle">Bicarbonate</text>
<text class="fg-txt fg-txt-s" x="56" y="82" text-anchor="middle">la base</text>
<rect class="fg-f-doux fg-t-doux" x="110" y="24" width="100" height="76" rx="10"/>
<circle class="fg-f-carte fg-t-doux fg-t-fin" cx="146" cy="40" r="3"/><circle class="fg-f-carte fg-t-doux fg-t-fin" cx="160" cy="37" r="3"/><circle class="fg-f-carte fg-t-doux fg-t-fin" cx="174" cy="41" r="3"/>
<text class="fg-txt fg-txt-b" x="160" y="66" text-anchor="middle">Fécule de maïs</text>
<text class="fg-txt fg-txt-s" x="160" y="82" text-anchor="middle"><tspan x="160">sépare les deux,</tspan><tspan x="160" dy="13.5">boit l'humidité</tspan></text>
<rect class="fg-f-or-l fg-t-or" x="216" y="24" width="96" height="76" rx="10"/>
<circle class="fg-f-or" cx="248" cy="40" r="3"/><circle class="fg-f-or" cx="264" cy="37" r="3"/><circle class="fg-f-or" cx="280" cy="41" r="3"/>
<text class="fg-txt fg-txt-b fg-txt-or" x="264" y="66" text-anchor="middle">Sel acide</text>
<text class="fg-txt fg-txt-s" x="264" y="82" text-anchor="middle"><tspan x="264">phosphate acide</tspan><tspan x="264" dy="13.5">de calcium…</tspan></text>
<path class="fg-f-bleu" d="M146 112c-1 3-6 8-6 12a6 6 0 0 0 12 0c0-4-5-9-6-12z"/>
<path class="fg-t-axe" d="M160 106L160 138" marker-end="url(#fg-fl-encre)"/>
<text class="fg-txt-script fg-txt-bleu" x="172" y="128" text-anchor="start">un liquide</text>
<rect class="fg-f-or-l fg-t-or" x="8" y="144" width="304" height="116" rx="14"/>
<text class="fg-txt fg-txt-b fg-txt-or" x="160" y="168" text-anchor="middle">acide + base  →  gaz carbonique (CO₂)</text>
<text class="fg-txt fg-txt-s" x="160" y="184" text-anchor="middle">dissous dans la pâte, ils réagissent</text>
<circle class="fg-f-carte fg-t-axe fg-t-fin" cx="36" cy="232" r="9"/>
<circle class="fg-f-carte fg-t-axe fg-t-fin" cx="64" cy="212" r="6"/>
<circle class="fg-f-carte fg-t-axe fg-t-fin" cx="92" cy="236" r="11"/>
<circle class="fg-f-carte fg-t-axe fg-t-fin" cx="124" cy="214" r="7"/>
<circle class="fg-f-carte fg-t-axe fg-t-fin" cx="152" cy="238" r="8"/>
<circle class="fg-f-carte fg-t-axe fg-t-fin" cx="182" cy="212" r="10"/>
<circle class="fg-f-carte fg-t-axe fg-t-fin" cx="212" cy="238" r="6"/>
<circle class="fg-f-carte fg-t-axe fg-t-fin" cx="240" cy="216" r="9"/>
<circle class="fg-f-carte fg-t-axe fg-t-fin" cx="268" cy="238" r="11"/>
<circle class="fg-f-carte fg-t-axe fg-t-fin" cx="294" cy="214" r="7"/>
<circle class="fg-f-carte fg-t-axe fg-t-fin" cx="44" cy="202" r="4"/>
<circle class="fg-f-carte fg-t-axe fg-t-fin" cx="204" cy="196" r="4"/>
<text class="fg-txt fg-txt-s fg-txt-doux" x="160" y="282" text-anchor="middle">une réaction instantanée : ni pousse ni pétrissage</text>` },

  { ou: "cas", type: "comparaison",
    titre: "Bicarbonate seul ou levure chimique ?",
    legende: "Le bicarbonate est une base pure : sans acide dans la recette, il lève mal. La levure chimique embarque le sien et fonctionne dans toute pâte.",
    alt: "Trois coupes de pâte côte à côte. À gauche, le bicarbonate seul, sans acide : quelques grains de base dans la pâte et une seule bulle ; il lui faut un acide, sinon il laisse un goût métallique et fait moins lever. Au centre, bicarbonate et acide de la recette (yaourt, miel, cacao, jus de citron) : la base et l'acide, séparés dans la pâte, réagissent et font de nombreuses bulles. À droite, la levure chimique : base et acide sont déjà associés grain à grain, donc de nombreuses bulles dans n'importe quelle pâte, acide ou non.",
    panneaux: [
      { label: "Bicarbonate seul", sous: "il lui faut un acide, sinon goût métallique", ton: "or", vb: "0 0 84 70",
        corps: `<path class="fg-f-or-l fg-t-or" d="M6 34h72v18a12 12 0 0 1-12 12H18A12 12 0 0 1 6 52z"/><circle class="fg-f-vert" cx="22" cy="46" r="3"/><circle class="fg-f-vert" cx="40" cy="53" r="3"/><circle class="fg-f-vert" cx="58" cy="45" r="3"/><circle class="fg-f-vert" cx="67" cy="54" r="3"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="44" cy="22" r="4.5"/>` },
      { label: "Bicarbonate + acide", sous: "yaourt, miel, cacao, citron : il lève", ton: "vert", vb: "0 0 84 70",
        corps: `<path class="fg-f-or-l fg-t-or" d="M6 34h72v18a12 12 0 0 1-12 12H18A12 12 0 0 1 6 52z"/><circle class="fg-f-vert" cx="20" cy="44" r="3"/><circle class="fg-f-vert" cx="52" cy="54" r="3"/><circle class="fg-f-vert" cx="68" cy="44" r="3"/><circle class="fg-f-or" cx="34" cy="50" r="3.5"/><circle class="fg-f-or" cx="46" cy="42" r="3.5"/><circle class="fg-f-or" cx="62" cy="54" r="3.5"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="18" cy="24" r="4.5"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="34" cy="14" r="5.5"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="52" cy="22" r="4.5"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="68" cy="11" r="4"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="72" cy="26" r="3.5"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="46" cy="5" r="3"/>` },
      { label: "Levure chimique", sous: "son acide est déjà dedans : toute pâte convient", ton: "vert", vb: "0 0 84 70",
        corps: `<path class="fg-f-or-l fg-t-or" d="M6 34h72v18a12 12 0 0 1-12 12H18A12 12 0 0 1 6 52z"/><circle class="fg-f-vert" cx="21" cy="44" r="3.4"/><circle class="fg-f-or" cx="27.6" cy="44" r="3.4"/><circle class="fg-f-vert" cx="43" cy="54" r="3.4"/><circle class="fg-f-or" cx="49.6" cy="54" r="3.4"/><circle class="fg-f-vert" cx="60" cy="43" r="3.4"/><circle class="fg-f-or" cx="66.6" cy="43" r="3.4"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="18" cy="24" r="4.5"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="34" cy="14" r="5.5"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="52" cy="22" r="4.5"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="68" cy="11" r="4"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="72" cy="26" r="3.5"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="46" cy="5" r="3"/>` }
    ] },

  { ou: "pourquoi", apres: 2, type: "courbe", qualitative: true,
    titre: "Le gaz, du mélange au four",
    legende: "Allure qualitative : une petite part du gaz part dès l'hydratation ; l'essentiel, la seconde vague, n'est libéré qu'à la chaleur du four. Plus la pâte attend, plus le premier gaz s'échappe.",
    alt: "Courbe qualitative, sans valeurs chiffrées. L'axe horizontal suit le temps depuis l'hydratation de la pâte, de la température ambiante au four ; l'axe vertical est le gaz carbonique libéré. Une première petite bosse apparaît dès l'hydratation, à température ambiante, puis la courbe retombe presque à zéro pendant l'attente. Elle repart ensuite franchement quand la pâte chauffe, à partir de 40 à 50 °C environ, et forme une grande seconde vague : c'est elle qui donne l'essentiel du gonflant.",
    x: { label: "Du mélange à la cuisson", extremites: ["hydratation", "four"] },
    y: { label: "Gaz carbonique libéré" },
    series: [ { nom: "Double action", ton: "terra", aire: true,
      points: [[0, 0.02], [6, 0.3], [14, 0.2], [26, 0.05], [40, 0.05], [54, 0.3], [70, 0.82], [84, 1], [100, 0.92]] } ],
    zones: [ { de: 0, a: 42, label: "température ambiante", ton: "bleu" }, { de: 42, a: 100, label: "au four : dès 40-50 °C", ton: "terra" } ],
    notes: [
      { x: 7, y: 0.3, texte: "une petite part, dès l'hydratation", dx: 8, dy: -4, largeur: 100, ancre: "start" },
      { x: 84, y: 1, texte: "l'essentiel du gaz", dx: -6, dy: 22, largeur: 80, ancre: "end" }
    ] },

  { ou: "reperes", type: "etapes",
    titre: "Tester une levure ouverte",
    legende: "Une levure entamée depuis plus de 6 mois a perdu une bonne part de son pouvoir : si la mousse est faible, ne vous y fiez pas.",
    alt: "Trois étapes. Première étape : prélever une pincée de la levure ouverte depuis longtemps. Deuxième étape : la verser dans un peu d'eau chaude. Troisième étape : observer. Elle doit mousser aussitôt et franchement ; sinon, elle a perdu une bonne part de son pouvoir.",
    etapes: [
      { libelle: "Une pincée", desc: "de levure ouverte depuis longtemps", emoji: "🥄" },
      { libelle: "Eau chaude", desc: "dans un peu d'eau", emoji: "💧", ton: "bleu" },
      { libelle: "Elle mousse ?", desc: "aussitôt et franchement", emoji: "🫧", ton: "vert" }
    ] }
];

FIGURES["contraste-textures"] = [
  { ou: "tete", type: "svg", vb: "0 0 320 276",
    titre: "Une assiette, plusieurs signaux",
    legende: "Une masse fondante, un éclat de croquant, une touche à une autre température : l'assiette envoie plus d'un signal. C'est un savoir-faire de cuisine, pas un résultat de laboratoire.",
    alt: "Coupe d'un bol de velouté, vu de côté. La masse du velouté est fondante et crémeuse. Posés dessus, des croûtons, des graines et des éclats de noix forment le croquant, sec et dur, qui casse sous la dent. À droite, une quenelle froide apporte une autre température. En dessous, une note rappelle que choisir un contraste est un savoir-faire de cuisine, pas un résultat de laboratoire.",
    corps: `<text class="fg-txt fg-txt-b fg-txt-terra" x="10" y="18" text-anchor="start">Croquant</text>
<text class="fg-txt fg-txt-s" x="10" y="33" text-anchor="start"><tspan x="10">croûtons, graines,</tspan><tspan x="10" dy="13.5">éclats de noix</tspan></text>
<text class="fg-txt fg-txt-b fg-txt-bleu" x="282" y="18" text-anchor="end">Une touche froide</text>
<text class="fg-txt fg-txt-s" x="282" y="33" text-anchor="end"><tspan x="282">une autre température</tspan><tspan x="282" dy="13.5">que la masse</tspan></text>
<path class="fg-t-terra fg-t-fin" d="M62 64L92 92" marker-end="url(#fg-fl-terra)"/>
<path class="fg-t-bleu fg-t-fin" d="M262 64L246 88" marker-end="url(#fg-fl-bleu)"/>
<path class="fg-f-carte fg-t-axe" d="M36 118H284C284 188 240 216 160 216C80 216 36 188 36 118Z"/>
<path class="fg-f-or-l fg-t-or" d="M42 118H278C277 184 238 210 160 210C82 210 43 184 42 118Z"/>
<path class="fg-t-axe" d="M126 216v8h68v-8"/>
<rect class="fg-f-terra-l fg-t-terra" x="84" y="98" width="17" height="15" rx="3" transform="rotate(-12 92 105)"/>
<rect class="fg-f-terra-l fg-t-terra" x="108" y="102" width="15" height="14" rx="3" transform="rotate(10 115 109)"/>
<ellipse class="fg-f-terra" cx="136" cy="112" rx="5" ry="2.8" transform="rotate(-20 136 112)"/>
<ellipse class="fg-f-terra" cx="150" cy="114" rx="5" ry="2.8" transform="rotate(14 150 114)"/>
<ellipse class="fg-f-terra" cx="163" cy="112" rx="5" ry="2.8" transform="rotate(-8 163 112)"/>
<path class="fg-f-or fg-t-terra fg-t-fin" d="M176 116L182 104L192 100L199 108L194 117Z"/>
<ellipse class="fg-f-bleu-l fg-t-bleu" cx="236" cy="108" rx="19" ry="9"/>
<text class="fg-txt fg-txt-b fg-txt-or" x="160" y="158" text-anchor="middle">Velouté</text>
<text class="fg-txt fg-txt-s" x="160" y="174" text-anchor="middle">fondant, crémeux</text>
<text class="fg-txt fg-txt-s fg-txt-doux" x="160" y="250" text-anchor="middle"><tspan x="160">le sec contre le mou,</tspan><tspan x="160" dy="13.5">le froid contre le chaud</tspan></text>` },

  { ou: "pourquoi", apres: 1, type: "courbe", qualitative: true,
    titre: "La satiété sensorielle spécifique",
    legende: "Allure qualitative : après quelques bouchées, l'aliment mangé est jugé moins agréable, les autres gardent tout leur attrait. Le phénomène est établi, son mécanisme l'est moins.",
    alt: "Courbe qualitative, sans valeurs. L'axe horizontal compte les bouchées successives d'un même aliment, l'axe vertical est le plaisir qu'il procure. Les deux séries partent du même niveau. Le plaisir de l'aliment qu'on mange descend nettement de bouchée en bouchée, tandis que celui d'un aliment qu'on n'a pas mangé reste presque inchangé. Le phénomène a été décrit par Rolls et ses coauteurs en 1981 ; son mécanisme est discuté.",
    x: { label: "Bouchées d'un même aliment", extremites: ["première", "dernière"] },
    y: { label: "Plaisir jugé" },
    series: [
      { nom: "L'aliment mangé", ton: "terra", points: [[0, 0.92], [22, 0.74], [48, 0.52], [76, 0.38], [100, 0.3]] },
      { nom: "Un autre aliment", ton: "vert", points: [[0, 0.92], [50, 0.9], [100, 0.88]] }
    ],
    notes: [
      { x: 100, y: 0.3, texte: "il s'émousse", dx: -8, dy: -26, largeur: 80, ancre: "end" }
    ] },

  { ou: "cas", type: "comparaison",
    titre: "Où poser le croquant ?",
    legende: "Un croûton posé sur le velouté tient quelques minutes ; noyé dedans, quelques secondes. Une barrière grasse le sépare d'une sauce aqueuse.",
    alt: "Trois coupes de bol côte à côte, avec une sauce aqueuse en bleu. À gauche, des croûtons noyés dans la sauce : ils sont pâles et ramollis, ils tiennent quelques secondes. Au centre, des croûtons posés sur la sauce : ils tiennent quelques minutes. À droite, des croûtons posés sur une fine couche grasse dorée, elle-même sur la sauce : la barrière grasse les protège de l'eau. Dans tous les cas, on dresse le plus tard possible.",
    panneaux: [
      { label: "Noyé dedans", sous: "quelques secondes", ton: "terra", vb: "0 0 84 64",
        corps: `<rect class="fg-f-bleu-l fg-t-bleu" x="6" y="22" width="72" height="38" rx="9"/><rect class="fg-f-terra-l fg-t-terra" x="14" y="32" width="16" height="14" rx="3" transform="rotate(-8 22 39)" opacity=".5"/><rect class="fg-f-terra-l fg-t-terra" x="40" y="38" width="16" height="14" rx="3" transform="rotate(10 48 45)" opacity=".5"/><rect class="fg-f-terra-l fg-t-terra" x="58" y="30" width="14" height="13" rx="3" opacity=".5"/>` },
      { label: "Posé dessus", sous: "quelques minutes", ton: "vert", vb: "0 0 84 64",
        corps: `<rect class="fg-f-bleu-l fg-t-bleu" x="6" y="30" width="72" height="30" rx="9"/><rect class="fg-f-terra-l fg-t-terra" x="12" y="15" width="16" height="15" rx="3" transform="rotate(-6 20 22)"/><rect class="fg-f-terra-l fg-t-terra" x="34" y="14" width="16" height="16" rx="3" transform="rotate(5 42 22)"/><rect class="fg-f-terra-l fg-t-terra" x="56" y="16" width="16" height="14" rx="3" transform="rotate(-4 64 23)"/>` },
      { label: "Sur du gras", sous: "une barrière contre l'eau", ton: "or", vb: "0 0 84 64",
        corps: `<rect class="fg-f-bleu-l fg-t-bleu" x="6" y="34" width="72" height="26" rx="9"/><rect class="fg-f-or" x="6" y="29" width="72" height="6" rx="3"/><rect class="fg-f-terra-l fg-t-terra" x="12" y="14" width="16" height="15" rx="3" transform="rotate(-6 20 21)"/><rect class="fg-f-terra-l fg-t-terra" x="34" y="13" width="16" height="16" rx="3" transform="rotate(5 42 21)"/><rect class="fg-f-terra-l fg-t-terra" x="56" y="15" width="16" height="14" rx="3" transform="rotate(-4 64 22)"/>` }
    ] },

  { ou: "reperes", type: "echelle",
    titre: "Combien de textures dans l'assiette ?",
    legende: "Deux textures franchement différentes suffisent ; passé trois, l'assiette devient un inventaire.",
    alt: "Règle graduée du nombre de textures franchement différentes dans l'assiette. Avec une seule, un seul signal arrive et il s'émousse. Avec deux ou trois, le contraste fonctionne : deux suffisent. Au-delà de trois, l'assiette devient un inventaire.",
    min: 1, max: 4, label: "Textures franchement différentes",
    graduations: [1, 2, 3],
    zones: [
      { de: 1, a: 2, label: "un seul signal", ton: "or" },
      { de: 2, a: 3, label: "deux suffisent", ton: "vert" },
      { de: 3, a: 4, label: "un inventaire", ton: "terra" }
    ] }
];

FIGURES["pectine-acidite"] = [
  { ou: "tete", type: "svg", vb: "0 0 320 314",
    titre: "La colle entre les cellules",
    legende: "La pectine de la lamelle moyenne colle les cellules entre elles. Quand la chaleur coupe ses chaînes, les cellules se séparent et le légume s'attendrit.",
    alt: "Schéma en deux niveaux. En haut, cru : deux cellules de végétal face à face, reliées par la lamelle moyenne, où trois chaînes de pectine ondulées vont d'une paroi à l'autre : les cellules sont collées. Au milieu, une flèche descendante : la chaleur coupe les chaînes de pectine, à un pH proche de la neutralité. En bas, cuit : les mêmes chaînes sont rompues en fragments accrochés chacun à une paroi, les cellules se séparent et le légume est tendre.",
    corps: `<text class="fg-txt fg-txt-b" x="160" y="16" text-anchor="middle">Cru : les cellules sont collées</text>
<rect class="fg-f-vert-l fg-t-vert" x="8" y="26" width="98" height="84" rx="16"/>
<rect class="fg-f-vert-l fg-t-vert" x="214" y="26" width="98" height="84" rx="16"/>
<text class="fg-txt fg-txt-s" x="57" y="72" text-anchor="middle">cellule</text>
<text class="fg-txt fg-txt-s" x="263" y="72" text-anchor="middle">cellule</text>
<rect class="fg-f-or-l" x="106" y="26" width="108" height="84"/>
<text class="fg-txt fg-txt-s fg-txt-or" x="160" y="42" text-anchor="middle">lamelle moyenne</text>
<path class="fg-t-or fg-t-epais" d="M106 58q9-6 18 0t18 0t18 0t18 0t18 0t18 0"/>
<path class="fg-t-or fg-t-epais" d="M106 74q9-6 18 0t18 0t18 0t18 0t18 0t18 0"/>
<path class="fg-t-or fg-t-epais" d="M106 90q9-6 18 0t18 0t18 0t18 0t18 0t18 0"/>
<text class="fg-txt fg-txt-s fg-txt-or" x="160" y="127" text-anchor="middle">chaînes de pectine</text>
<path class="fg-t-terra fg-t-epais" d="M42 142L42 180" marker-end="url(#fg-fl-terra)"/>
<text class="fg-txt-script fg-txt-terra" x="58" y="156" text-anchor="start">la chaleur</text>
<text class="fg-txt fg-txt-s" x="58" y="172" text-anchor="start"><tspan x="58">coupe les chaînes, à un pH</tspan><tspan x="58" dy="13.5">proche de la neutralité</tspan></text>
<text class="fg-txt fg-txt-b" x="160" y="214" text-anchor="middle">Cuit : les cellules se séparent</text>
<rect class="fg-f-vert-l fg-t-vert" x="8" y="224" width="98" height="84" rx="16"/>
<rect class="fg-f-vert-l fg-t-vert" x="214" y="224" width="98" height="84" rx="16"/>
<text class="fg-txt fg-txt-s" x="57" y="270" text-anchor="middle">cellule</text>
<text class="fg-txt fg-txt-s" x="263" y="270" text-anchor="middle">cellule</text>
<rect class="fg-f-doux" x="106" y="224" width="108" height="84"/>
<text class="fg-txt fg-txt-s fg-txt-or" x="160" y="240" text-anchor="middle">chaînes coupées</text>
<path class="fg-t-or fg-t-epais" d="M106 256q9-6 18 0t18 0"/>
<path class="fg-t-or fg-t-epais" d="M178 256q9-6 18 0t18 0"/>
<path class="fg-t-or fg-t-epais" d="M106 272q9-6 18 0"/>
<path class="fg-t-or fg-t-epais" d="M196 272q9-6 18 0"/>
<path class="fg-t-or fg-t-epais" d="M106 288q9-6 18 0t18 0t18 0"/>
<path class="fg-t-or fg-t-epais" d="M196 288q9-6 18 0"/>` },

  { ou: "pourquoi", apres: 2, type: "echelle",
    titre: "Où le pH arrête la cuisson",
    legende: "Sous pH 4 environ, l'attendrissement s'arrête : la pectine tient. C'est une limite de la cuisson, pas du légume.",
    alt: "Règle graduée du pH du milieu de cuisson, avec un repère à pH 4 environ. À gauche de ce repère, en dessous de pH 4, l'attendrissement s'arrête : c'est le domaine de la tomate, du vin, du vinaigre et du citron. À droite, vers la neutralité, la chaleur peut couper les chaînes de pectine et le légume s'attendrit.",
    min: 3, max: 7, label: "pH du milieu de cuisson",
    graduations: [4],
    zones: [
      { de: 3, a: 4, label: "bloqué", ton: "terra" },
      { de: 4, a: 7, label: "attendrissement possible", ton: "vert" }
    ],
    marqueurs: [
      { v: 4, label: "pH 4 environ : tomate, vin, vinaigre, citron", ton: "terra" }
    ] },

  { ou: "pourquoi", apres: 3, type: "comparaison", fleche: true,
    titre: "Calcium et sodium",
    legende: "Le calcium relie les chaînes de pectine ; le sodium prend sa place et desserre l'édifice. Une eau salée assouplit donc la peau au lieu de la durcir.",
    alt: "Deux panneaux reliés par une flèche. À gauche, eau calcaire : deux chaînes de pectine sont reliées par trois ions calcium, Ca2+, qui les pontent en pectate insoluble ; la peau reste ferme. À droite, eau salée : des ions sodium, Na+, échangent leur place avec le calcium accroché à la pectine ; le calcium est délogé, les chaînes ne sont plus pontées, l'édifice se desserre et la peau est plus souple.",
    panneaux: [
      { label: "Eau calcaire", sous: "Ca²⁺ ponte les chaînes : peau ferme", ton: "or", vb: "0 0 128 84",
        corps: `<path class="fg-t-or fg-t-epais" d="M10 12q9-6 18 0t18 0t18 0t18 0t18 0t18 0"/><path class="fg-t-or fg-t-epais" d="M10 72q9-6 18 0t18 0t18 0t18 0t18 0t18 0"/><path class="fg-t-axe" d="M26 13V27M26 57V71M64 13V27M64 57V71M102 13V27M102 57V71"/><circle class="fg-f-carte fg-t-encre" cx="26" cy="42" r="15"/><circle class="fg-f-carte fg-t-encre" cx="64" cy="42" r="15"/><circle class="fg-f-carte fg-t-encre" cx="102" cy="42" r="15"/><text class="fg-txt fg-txt-s fg-txt-encre" x="26" y="46" text-anchor="middle">Ca²⁺</text><text class="fg-txt fg-txt-s fg-txt-encre" x="64" y="46" text-anchor="middle">Ca²⁺</text><text class="fg-txt fg-txt-s fg-txt-encre" x="102" y="46" text-anchor="middle">Ca²⁺</text>` },
      { label: "Eau salée", sous: "Na⁺ prend la place : peau plus souple", ton: "vert", vb: "0 0 128 84",
        corps: `<path class="fg-t-or fg-t-epais" d="M10 8q9-6 18 0t18 0t18 0t18 0t18 0t18 0"/><path class="fg-t-or fg-t-epais" d="M10 76q9-6 18 0t18 0t18 0t18 0t18 0t18 0"/><path class="fg-t-axe" d="M28 9V21M100 63V75"/><circle class="fg-f-bleu-l fg-t-bleu" cx="28" cy="34" r="14"/><circle class="fg-f-bleu-l fg-t-bleu" cx="100" cy="50" r="14"/><text class="fg-txt fg-txt-s fg-txt-bleu" x="28" y="38" text-anchor="middle">Na⁺</text><text class="fg-txt fg-txt-s fg-txt-bleu" x="100" y="54" text-anchor="middle">Na⁺</text><circle class="fg-f-carte fg-t-encre fg-tirets" cx="64" cy="42" r="15" opacity=".5"/><text class="fg-txt fg-txt-s fg-txt-encre" x="64" y="46" text-anchor="middle" opacity=".6">Ca²⁺</text>` }
    ] },

  { ou: "cas", type: "etapes",
    titre: "Quand ajouter l'acide",
    legende: "L'acide va en fin de cuisson : ajouté avant, il bloque l'attendrissement, et aucune prolongation ne le rattrape.",
    alt: "Trois étapes. Première étape : cuire d'abord dans l'eau, sans acide. Deuxième étape : vérifier que la graine ou le légume est déjà tendre. Troisième étape seulement : ajouter la tomate, le vinaigre, le vin ou le citron.",
    etapes: [
      { libelle: "Cuire dans l'eau", desc: "sans acide", emoji: "🫘", ton: "bleu" },
      { libelle: "Goûter", desc: "déjà tendre ?", emoji: "🥄" },
      { libelle: "Puis l'acide", desc: "tomate, vinaigre, vin, citron", emoji: "🍅", ton: "or" }
    ] }
];

/* ===== fin Textures & liaisons ===== */



/* ===== Sel, acide & goût ===== */

/* (figures de la famille) */

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
