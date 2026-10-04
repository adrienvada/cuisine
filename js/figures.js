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

/* (figures de la famille) */

/* ===== fin Sel, acide & goût ===== */



/* ===== Végétal & couleur ===== */

/* (figures de la famille) */

/* ===== fin Végétal & couleur ===== */



/* ===== Froid, gras & sécurité ===== */

FIGURES["infusion-froid"] = [
  { ou: "tete", type: "svg",
    vb: "0 0 320 326",
    titre: "Le chaud ouvre la feuille, le froid laisse le temps",
    legende: "À gauche, l'eau bouillante abîme les membranes et libère tout d'un coup ; à droite, rien ne s'ouvre : les molécules quittent la feuille lentement et se faufilent dans le gel du yaourt. Schéma d'illustration.",
    alt: "Deux cartes côte à côte. À gauche, À chaud, trois minutes : une feuille dont le contour est abîmé, en pointillés, laisse sortir d'un coup ses molécules aromatiques dans toutes les directions, avec la mention membranes abîmées, tout est libéré d'un seul coup. À droite, À froid, une heure : la feuille est intacte au milieu d'un réseau de caséines, le gel du yaourt. Quelques molécules s'en échappent lentement et se faufilent dans le réseau, et des gouttelettes de graisse captent au passage les composés gras. En bas, un bandeau : le froid n'évapore rien et ne dégrade rien, il préserve les terpènes les plus volatils.",
    corps: `<rect class="fg-f-terra-l fg-t-terra" x="8" y="8" width="148" height="246" rx="12"/>
<rect class="fg-f-bleu-l fg-t-bleu" x="164" y="8" width="148" height="246" rx="12"/>
<text class="fg-txt fg-txt-b fg-txt-terra" x="82" y="30" text-anchor="middle"><tspan x="82">À chaud</tspan></text>
<text class="fg-txt fg-txt-s" x="82" y="45" text-anchor="middle"><tspan x="82">trois minutes</tspan></text>
<text class="fg-txt fg-txt-b fg-txt-bleu" x="238" y="30" text-anchor="middle"><tspan x="238">À froid</tspan></text>
<text class="fg-txt fg-txt-s" x="238" y="45" text-anchor="middle"><tspan x="238">une heure</tspan></text>
<path class="fg-f-vert-l fg-t-vert fg-tirets" d="M82 74C106 80 116 108 82 150C48 108 58 80 82 74Z"/>
<path class="fg-t-vert fg-t-fin" d="M82 84L82 140"/>
<circle class="fg-f-vert" cx="34" cy="88" r="3.4"/><circle class="fg-f-vert" cx="26" cy="116" r="3.4"/><circle class="fg-f-vert" cx="40" cy="146" r="3.4"/>
<circle class="fg-f-vert" cx="130" cy="88" r="3.4"/><circle class="fg-f-vert" cx="138" cy="116" r="3.4"/><circle class="fg-f-vert" cx="124" cy="146" r="3.4"/>
<circle class="fg-f-vert" cx="82" cy="62" r="3.4"/><circle class="fg-f-vert" cx="82" cy="164" r="3.4"/>
<path class="fg-t-vert fg-t-fin" d="M62 94L42 89" marker-end="url(#fg-fl-vert)"/>
<path class="fg-t-vert fg-t-fin" d="M58 118L34 116" marker-end="url(#fg-fl-vert)"/>
<path class="fg-t-vert fg-t-fin" d="M64 140L46 145" marker-end="url(#fg-fl-vert)"/>
<path class="fg-t-vert fg-t-fin" d="M102 94L122 89" marker-end="url(#fg-fl-vert)"/>
<path class="fg-t-vert fg-t-fin" d="M106 118L130 116" marker-end="url(#fg-fl-vert)"/>
<path class="fg-t-vert fg-t-fin" d="M100 140L118 145" marker-end="url(#fg-fl-vert)"/>
<path class="fg-t-terra" d="M24 184q8-8 16 0t16 0t16 0t16 0t16 0"/>
<text class="fg-txt fg-txt-s" x="82" y="208" text-anchor="middle"><tspan x="82">membranes abîmées :</tspan><tspan x="82" dy="13.5">tout est libéré</tspan><tspan x="82" dy="13.5">d'un seul coup</tspan></text>
<g opacity=".55">
<path class="fg-t-bleu fg-t-fin" d="M172 66q10-8 20 0t20 0t20 0t20 0t20 0t12 0"/>
<path class="fg-t-bleu fg-t-fin" d="M172 100q10-8 20 0t20 0t20 0t20 0t20 0t12 0"/>
<path class="fg-t-bleu fg-t-fin" d="M172 134q10-8 20 0t20 0t20 0t20 0t20 0t12 0"/>
<path class="fg-t-bleu fg-t-fin" d="M172 168q10-8 20 0t20 0t20 0t20 0t20 0t12 0"/>
<path class="fg-t-bleu fg-t-fin" d="M186 58q-8 14 0 28t0 28t0 28t0 28"/>
<path class="fg-t-bleu fg-t-fin" d="M290 58q8 14 0 28t0 28t0 28t0 28"/>
</g>
<path class="fg-f-vert-l fg-t-vert" d="M238 74C262 80 272 108 238 150C204 108 214 80 238 74Z"/>
<path class="fg-t-vert fg-t-fin" d="M238 84L238 140"/>
<circle class="fg-f-or-l fg-t-or" cx="192" cy="152" r="10"/><circle class="fg-f-vert" cx="192" cy="152" r="3.2"/>
<circle class="fg-f-or-l fg-t-or" cx="286" cy="104" r="10"/><circle class="fg-f-vert" cx="286" cy="104" r="3.2"/>
<path class="fg-t-vert fg-t-fin fg-pointilles" d="M262 100Q270 94 276 100"/>
<circle class="fg-f-vert" cx="264" cy="98" r="3.2"/>
<path class="fg-t-vert fg-t-fin fg-pointilles" d="M214 104Q206 98 200 106"/>
<circle class="fg-f-vert" cx="212" cy="104" r="3.2"/>
<text class="fg-txt fg-txt-s" x="238" y="208" text-anchor="middle"><tspan x="238">un gel de caséines :</tspan><tspan x="238" dy="13.5">on s'y faufile, et la</tspan><tspan x="238" dy="13.5">graisse capte au passage</tspan><tspan x="238" dy="13.5">les composés gras</tspan></text>
<rect class="fg-f-doux fg-t-doux" x="8" y="264" width="304" height="50" rx="10"/>
<text class="fg-txt fg-txt-s" x="160" y="284" text-anchor="middle"><tspan x="160">Le froid n'évapore rien et ne dégrade rien :</tspan><tspan x="160" dy="13.5">il préserve les terpènes les plus volatils.</tspan></text>` },

  { ou: "cas", type: "barres",
    unite: "min",
    titre: "Le temps que prend le parfum",
    legende: "Des ordres de grandeur de cuisine, pas des mesures. Entre l'eau bouillante et le réfrigérateur, la diffusion est cinq ou six fois plus lente : cela n'explique pas à lui seul l'écart, le chaud ouvre en plus la feuille.",
    alt: "Trois barres horizontales de durée. Une infusion chaude dans l'eau bouillante : environ 3 minutes. Une infusion à froid dans un liquide clair et fluide : 20 à 30 minutes. Une infusion à froid dans un yaourt, milieu épais : 1 heure, et 40 minutes au minimum. Ce sont des ordres de grandeur de cuisine, à ajuster en goûtant.",
    barres: [
      { label: "Infusion chaude, eau bouillante",
        valeur: 3,
        texte: "3 min",
        ton: "terra",
        note: "le chaud libère tout d'un coup" },
      { label: "Au froid, liquide clair et fluide",
        valeur: 25,
        texte: "20 à 30 min",
        ton: "bleu",
        note: "froid, mais peu visqueux" },
      { label: "Au froid, dans un yaourt",
        valeur: 60,
        texte: "1 h",
        ton: "bleu",
        note: "froid, épais et immobile : 40 minutes au minimum" }
    ] },

  { ou: "pourquoi", apres: 2, type: "courbe",
    qualitative: true,
    h: 180,
    titre: "La menthe qui s'installe dans le yaourt",
    legende: "Allure qualitative : seuls les trois repères de temps viennent de la fiche, et ils se règlent en goûtant. À dix minutes on ne sent que le yaourt, vers quarante la menthe apparaît, à une heure elle occupe toute la sauce.",
    alt: "Courbe qualitative, sans valeurs en ordonnée. L'axe horizontal va de 0 à 60 minutes, avec trois repères : 10, 40 et 60 minutes. La menthe perçue dans la sauce monte lentement : à 10 minutes, on ne sent que le yaourt ; vers 40 minutes, la menthe apparaît ; à 60 minutes, elle occupe toute la sauce. Allure qualitative.",
    x: { label: "Minutes au réfrigérateur", min: 0, max: 60, graduations: [10, 40, 60] },
    y: { label: "Menthe perçue dans la sauce", max: 1.45 },
    series: [
      { nom: "Menthe perçue",
        ton: "vert",
        aire: true,
        points: [
          [0, 0.02],
          [10, 0.08],
          [25, 0.3],
          [40, 0.62],
          [60, 1]
        ] }
    ],
    notes: [
      { x: 10, y: 0.08, texte: "on ne sent que le yaourt", dx: 6, dy: -62, largeur: 90, ancre: "start" },
      { x: 40, y: 0.62, texte: "la menthe apparaît", dx: 10, dy: 42, largeur: 100, ancre: "start" },
      { x: 60, y: 1, texte: "toute la sauce", dx: -14, dy: -26, largeur: 90, ancre: "end" }
    ] },

  { ou: "reperes", type: "comparaison",
    titre: "Quand retirer l'herbe",
    legende: "Illustration : trop tard comme trop tôt, la sauce y perd. Pour une sauce yaourt-menthe, une heure ; ensuite, on retire les feuilles, qui brunissent et deviennent amères passé quelques heures.",
    alt: "Trois bols de yaourt vus en coupe. Premier bol, au dernier moment : le yaourt est blanc, les feuilles de menthe flottent dessus, on mâche l'herbe sans la retrouver dans la sauce. Deuxième bol, après une heure : le yaourt est teinté de vert, le parfum est installé, une feuille est retirée. Troisième bol, quelques heures : le yaourt est vert mais les feuilles laissées dedans ont bruni ; elles donnent de l'amertume.",
    panneaux: [
      { label: "Au dernier moment",
        sous: "on mâche l'herbe, sans la retrouver dans la sauce",
        ton: "or",
        vb: "0 0 100 64",
        corps: `<path class="fg-f-papier fg-t-axe" d="M10 24H90C88 48 72 58 50 58C28 58 12 48 10 24Z"/><ellipse class="fg-f-vert" cx="34" cy="25" rx="7" ry="3.2" transform="rotate(-18 34 25)"/><ellipse class="fg-f-vert" cx="52" cy="22" rx="7" ry="3.2" transform="rotate(12 52 22)"/><ellipse class="fg-f-vert" cx="68" cy="26" rx="7" ry="3.2" transform="rotate(-8 68 26)"/><ellipse class="fg-f-vert" cx="44" cy="29" rx="7" ry="3.2" transform="rotate(25 44 29)"/><ellipse class="fg-f-vert" cx="60" cy="30" rx="7" ry="3.2" transform="rotate(-22 60 30)"/>` },
      { label: "Après une heure",
        sous: "le parfum est dans la sauce : retirez l'herbe",
        ton: "vert",
        vb: "0 0 100 64",
        corps: `<path class="fg-f-vert-l fg-t-axe" d="M10 24H90C88 48 72 58 50 58C28 58 12 48 10 24Z"/><circle class="fg-f-vert" cx="28" cy="36" r="1.7"/><circle class="fg-f-vert" cx="42" cy="46" r="1.7"/><circle class="fg-f-vert" cx="58" cy="40" r="1.7"/><circle class="fg-f-vert" cx="70" cy="33" r="1.7"/><circle class="fg-f-vert" cx="52" cy="30" r="1.7"/><circle class="fg-f-vert" cx="36" cy="28" r="1.7"/><circle class="fg-f-vert" cx="64" cy="48" r="1.7"/><circle class="fg-f-vert" cx="76" cy="41" r="1.7"/><ellipse class="fg-f-vert" cx="82" cy="10" rx="7" ry="3.2" transform="rotate(-30 82 10)"/><path class="fg-t-axe fg-t-fin" d="M70 20Q76 14 80 14" marker-end="url(#fg-fl-encre)"/>` },
      { label: "Quelques heures",
        sous: "feuilles brunies, amertume : trop tard",
        ton: "terra",
        vb: "0 0 100 64",
        corps: `<path class="fg-f-vert-l fg-t-axe" d="M10 24H90C88 48 72 58 50 58C28 58 12 48 10 24Z"/><circle class="fg-f-vert" cx="28" cy="36" r="1.7"/><circle class="fg-f-vert" cx="42" cy="46" r="1.7"/><circle class="fg-f-vert" cx="58" cy="40" r="1.7"/><circle class="fg-f-vert" cx="70" cy="33" r="1.7"/><circle class="fg-f-vert" cx="52" cy="30" r="1.7"/><circle class="fg-f-vert" cx="36" cy="28" r="1.7"/><circle class="fg-f-vert" cx="64" cy="48" r="1.7"/><circle class="fg-f-vert" cx="76" cy="41" r="1.7"/><ellipse class="fg-f-terra" cx="34" cy="25" rx="7" ry="3.2" transform="rotate(-18 34 25)"/><ellipse class="fg-f-terra" cx="52" cy="22" rx="7" ry="3.2" transform="rotate(12 52 22)"/><ellipse class="fg-f-terra" cx="68" cy="26" rx="7" ry="3.2" transform="rotate(-8 68 26)"/><ellipse class="fg-f-terra" cx="44" cy="29" rx="7" ry="3.2" transform="rotate(25 44 29)"/>` }
    ] }
];

FIGURES["froid-raffermit"] = [
  { ou: "tete", type: "svg",
    vb: "0 0 320 296",
    titre: "Ce que le froid raidit",
    legende: "Le froid ne fait pas la même chose sur le gras et sur l'eau, mais le résultat est le même : une matière assez ferme pour que la lame la tranche au lieu de l'écraser.",
    alt: "Deux cartes côte à côte, un couteau dans chacune. À gauche, le gras : un bloc de pâte feuilletée en coupe, avec ses couches de beurre bien distinctes, que la lame traverse net, parce que le beurre froid est redevenu cassant. À droite, l'eau de la chair : la coupe d'un filet de poisson, avec une pellicule de surface raidie qui guide la lame et un cœur resté souple. En bas : ferme, la matière se découpe net ; froide, elle met plus longtemps à fondre.",
    corps: `<rect class="fg-f-carte fg-t-or" x="8" y="8" width="148" height="218" rx="12"/>
<rect class="fg-f-carte fg-t-bleu" x="164" y="8" width="148" height="218" rx="12"/>
<text class="fg-txt fg-txt-b fg-txt-or" x="82" y="30" text-anchor="middle"><tspan x="82">Le gras</tspan></text>
<text class="fg-txt fg-txt-b fg-txt-bleu" x="238" y="30" text-anchor="middle"><tspan x="238">L'eau de la chair</tspan></text>
<rect class="fg-f-doux fg-t-axe" x="24" y="108" width="116" height="54" rx="5"/>
<rect class="fg-f-or" x="24" y="117" width="116" height="6"/><rect class="fg-f-or" x="24" y="131" width="116" height="6"/><rect class="fg-f-or" x="24" y="145" width="116" height="6"/>
<rect class="fg-f-terra" x="77" y="58" width="10" height="24" rx="3"/><circle class="fg-f-carte" cx="82" cy="65" r="1.5"/><circle class="fg-f-carte" cx="82" cy="75" r="1.5"/><path class="fg-f-doux fg-t-axe" d="M89 82H75V100Q75 118 89 126Z"/>
<text class="fg-txt fg-txt-s" x="82" y="188" text-anchor="middle"><tspan x="82">le beurre redevient</tspan><tspan x="82" dy="13.5">cassant : la lame</tspan><tspan x="82" dy="13.5">tranche, n'étale pas</tspan></text>
<ellipse class="fg-f-bleu-l fg-t-bleu fg-t-epais" cx="238" cy="136" rx="62" ry="29"/>
<ellipse class="fg-f-terra-l fg-t-terra fg-t-fin" cx="238" cy="136" rx="49" ry="18"/>
<rect class="fg-f-terra" x="233" y="58" width="10" height="24" rx="3"/><circle class="fg-f-carte" cx="238" cy="65" r="1.5"/><circle class="fg-f-carte" cx="238" cy="75" r="1.5"/><path class="fg-f-doux fg-t-axe" d="M245 82H231V100Q231 118 245 126Z"/>
<text class="fg-txt fg-txt-s" x="238" y="188" text-anchor="middle"><tspan x="238">une pellicule raidie</tspan><tspan x="238" dy="13.5">guide la lame ; le</tspan><tspan x="238" dy="13.5">cœur reste souple</tspan></text>
<rect class="fg-f-doux fg-t-doux" x="8" y="236" width="304" height="50" rx="10"/>
<text class="fg-txt fg-txt-s" x="160" y="256" text-anchor="middle"><tspan x="160">Ferme, la matière se découpe net.</tspan><tspan x="160" dy="13.5">Froide, elle met plus longtemps à fondre.</tspan></text>` },

  { ou: "pourquoi", apres: 1, type: "comparaison",
    titre: "Le beurre n'a pas de point de fonte",
    legende: "Illustration qualitative : le beurre est un mélange de triglycérides qui fondent à des températures différentes. Sa fermeté, c'est la fraction restée solide, qui diminue peu à peu quand on le réchauffe.",
    alt: "Trois blocs de beurre en coupe, de plus en plus chauds. Sorti du froid, le bloc contient beaucoup de cristaux de gras solide : il se travaille comme une pâte. Entre les deux, il en reste moins, la fermeté baisse peu à peu. Passé une vingtaine de degrés, presque plus de cristaux et le gras est liquide : le beurre file. Illustration qualitative : la fermeté suit la fraction de gras restée solide.",
    fleche: true,
    panneaux: [
      { label: "Sorti du froid",
        sous: "beaucoup de gras solide : il se travaille comme une pâte",
        ton: "bleu",
        vb: "0 0 100 58",
        corps: `<rect class="fg-f-or-l fg-t-or" x="14" y="6" width="72" height="46" rx="7"/><rect class="fg-f-or" x="22" y="12.5" width="8" height="5" rx="1" transform="rotate(20 26 15)"/><rect class="fg-f-or" x="36" y="11.5" width="8" height="5" rx="1" transform="rotate(-25 40 14)"/><rect class="fg-f-or" x="52" y="13.5" width="8" height="5" rx="1" transform="rotate(35 56 16)"/><rect class="fg-f-or" x="68" y="12.5" width="8" height="5" rx="1" transform="rotate(-10 72 15)"/><rect class="fg-f-or" x="26" y="25.5" width="8" height="5" rx="1" transform="rotate(-30 30 28)"/><rect class="fg-f-or" x="42" y="24.5" width="8" height="5" rx="1" transform="rotate(15 46 27)"/><rect class="fg-f-or" x="58" y="26.5" width="8" height="5" rx="1" transform="rotate(-20 62 29)"/><rect class="fg-f-or" x="72" y="25.5" width="8" height="5" rx="1" transform="rotate(40 76 28)"/><rect class="fg-f-or" x="21" y="38.5" width="8" height="5" rx="1" transform="rotate(10 25 41)"/><rect class="fg-f-or" x="36" y="39.5" width="8" height="5" rx="1" transform="rotate(-35 40 42)"/><rect class="fg-f-or" x="52" y="37.5" width="8" height="5" rx="1" transform="rotate(25 56 40)"/><rect class="fg-f-or" x="68" y="39.5" width="8" height="5" rx="1" transform="rotate(-15 72 42)"/>` },
      { label: "Entre les deux",
        sous: "la fraction solide recule peu à peu",
        ton: "or",
        vb: "0 0 100 58",
        corps: `<rect class="fg-f-or-l fg-t-or" x="14" y="6" width="72" height="46" rx="7"/><rect class="fg-f-or" x="26" y="13.5" width="8" height="5" rx="1" transform="rotate(20 30 16)"/><rect class="fg-f-or" x="62" y="11.5" width="8" height="5" rx="1" transform="rotate(-25 66 14)"/><rect class="fg-f-or" x="44" y="25.5" width="8" height="5" rx="1" transform="rotate(35 48 28)"/><rect class="fg-f-or" x="24" y="38.5" width="8" height="5" rx="1" transform="rotate(-10 28 41)"/><rect class="fg-f-or" x="70" y="35.5" width="8" height="5" rx="1" transform="rotate(30 74 38)"/>` },
      { label: "Passé une vingtaine de degrés",
        sous: "la part solide a fondu : il file",
        ton: "terra",
        vb: "0 0 100 58",
        corps: `<rect class="fg-f-or-l fg-t-or" x="10" y="26" width="80" height="26" rx="13"/><rect class="fg-f-or" x="30" y="37.5" width="8" height="5" rx="1" transform="rotate(20 34 40)"/><rect class="fg-f-or" x="62" y="38.5" width="8" height="5" rx="1" transform="rotate(-25 66 41)"/>` }
    ] },

  { ou: "cas", type: "barres",
    unite: "min",
    titre: "Combien de temps de froid",
    legende: "Un coup de froid court, qui raidit la surface sans geler le cœur. Passé une demi-heure au congélateur, la surface d'un filet fin prend en glace et la lame dérape.",
    alt: "Cinq barres de durée. Pâte feuilletée au congélateur : 10 minutes, pas davantage. Fromage frais à frire au congélateur : 10 minutes. Fromage frais à frire au réfrigérateur : 30 minutes. Filet de poisson de 500 g au congélateur : 15 minutes, surface raide et cœur souple. Dernière barre, en mise en garde : au-delà d'une demi-heure au congélateur, la surface d'un filet fin prend en glace et la lame dérape.",
    barres: [
      { label: "Pâte feuilletée, au congélateur",
        valeur: 10,
        texte: "10 min",
        ton: "bleu",
        note: "avant la découpe, pas davantage" },
      { label: "Fromage frais à frire, au congélateur", valeur: 10, texte: "10 min", ton: "bleu" },
      { label: "Fromage frais à frire, au réfrigérateur", valeur: 30, texte: "30 min", ton: "bleu" },
      { label: "Filet de poisson (500 g), au congélateur",
        valeur: 15,
        texte: "15 min",
        ton: "bleu",
        note: "surface raide, cœur encore souple" },
      { label: "Trop long : filet fin au congélateur",
        valeur: 30,
        texte: "plus de 30 min",
        ton: "or",
        note: "la surface prend en glace, la lame dérape" }
    ] },

  { ou: "reperes", type: "echelle",
    titre: "Les températures qui comptent",
    legende: "La règle entière est la plage où fondent les triglycérides du beurre, d'environ −40 à 40 °C. Le beurre file passé une vingtaine de degrés ; la crème se fouette sous 10 °C, idéalement entre 2 et 5 °C ; le saumon ne cristallise que vers −1 à −1,5 °C.",
    alt: "Règle graduée de −40 à 40 °C, la plage où fondent les triglycérides du beurre. Un filet de saumon ne commence à cristalliser que vers −1 à −1,5 °C. La crème à fouetter se travaille sous 10 °C, idéalement entre 2 et 5 °C. Passé une vingtaine de degrés, le beurre file.",
    min: -40,
    max: 40,
    unite: "°C",
    label: "Température",
    graduations: [-40, -20, 0, 20, 40],
    zones: [
      { de: 2, a: 10, label: "Crème : sous 10 °C, idéalement entre 2 et 5 °C", ton: "bleu" },
      { de: 2, a: 5, ton: "vert" }
    ],
    marqueurs: [
      { v: -1.25, label: "Saumon : cristallise vers −1 à −1,5 °C", ton: "bleu" },
      { v: 20, label: "Beurre : passé une vingtaine de degrés, il file", ton: "terra" }
    ] }
];

FIGURES["poisson-cru"] = [
  { ou: "tete", type: "svg",
    vb: "0 0 320 380",
    titre: "Des larves dans la chair : ce qui les tue",
    legende: "Les larves d'Anisakis logent dans les viscères puis, après la mort du poisson, dans la chair voisine. Elles ne résistent ni à la chaleur ni au grand froid : le sel, l'acide et le fumage à froid n'y changent rien aux doses de cuisine.",
    alt: "Schéma d'un poisson en coupe. Une larve d'Anisakis, enroulée en spirale, se trouve dans les viscères, une autre dans la chair voisine. Ingérée vivante, une larve peut perforer la paroi digestive : c'est l'anisakidose. Deux boîtes. Ce qui les met hors d'état : la congélation, si le froid atteint le cœur du morceau, ou la cuisson à plus de 60 °C à cœur. Ce qui ne les tue pas aux doses de cuisine : le sel, le vinaigre, le citron et le fumage à froid. Un bandeau rappelle que leurs allergènes résistent au froid comme à la chaleur.",
    corps: `<path class="fg-f-terra-l fg-t-terra" d="M22 100C36 66 108 54 184 78C204 85 218 96 230 102L274 78L274 142L230 110C218 116 204 126 184 134C108 158 36 142 22 100Z"/>
<path class="fg-t-doux fg-tirets" d="M50 102H226"/>
<circle class="fg-f-encre" cx="46" cy="94" r="3"/>
<ellipse class="fg-f-or-l fg-t-or" cx="112" cy="125" rx="46" ry="14"/>
<path class="fg-t-terra fg-t-epais" d="M104.9 125.4L104.9 125.9L104.7 126.3L104.2 126.7L103.5 126.9L102.7 126.8L101.9 126.4L101.3 125.7L101 124.7L101.1 123.5L101.6 122.4L102.6 121.5L103.8 121L105.3 121L106.8 121.5L108.1 122.5L108.9 124.1L109.2 125.9L108.8 127.8L107.7 129.4L106 130.7L103.9 131.2L101.6 131L99.5 130L97.8 128.2L96.8 125.9L96.7 123.3L97.6 120.7L99.3 118.5L101.8 117L104.7 116.5"/>
<path class="fg-t-terra fg-t-epais" d="M161.6 89.9L161.1 89.9L160.6 89.6L160.3 89.1L160.1 88.4L160.2 87.7L160.6 86.9L161.4 86.3L162.4 86L163.5 86.1L164.6 86.7L165.5 87.7L166 89L166 90.4L165.4 91.9L164.3 93.1L162.8 93.9L161 94.1L159.1 93.7L157.5 92.5L156.3 90.8L155.8 88.7L156 86.4L157.1 84.3L159 82.7L161.3 81.8L163.9 81.8L166.5 82.7L168.6 84.5L170 87L170.4 90"/>
<text class="fg-txt fg-txt-s fg-txt-or" x="112" y="156" text-anchor="middle"><tspan x="112">viscères</tspan></text>
<text class="fg-txt fg-txt-s" x="184" y="66" text-anchor="start"><tspan x="184">chair voisine</tspan></text>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-terra" x="70" y="40" text-anchor="start"><tspan x="70">larve d'Anisakis</tspan></text>
<path class="fg-t-axe fg-t-fin" d="M130 44Q150 52 156 76" marker-end="url(#fg-fl-terra)"/>
<path class="fg-t-axe fg-t-fin" d="M94 46Q84 76 94 110" marker-end="url(#fg-fl-terra)"/>
<text class="fg-txt fg-txt-s" x="160" y="182" text-anchor="middle"><tspan x="160">ingérée vivante, elle peut perforer la paroi</tspan><tspan x="160" dy="13.5">digestive : c'est l'anisakidose</tspan></text>
<rect class="fg-f-vert-l fg-t-vert" x="8" y="206" width="148" height="112" rx="12"/>
<text class="fg-txt fg-txt-b fg-txt-vert" x="82" y="228" text-anchor="middle"><tspan x="82">Les met hors d'état</tspan></text>
<text class="fg-txt fg-txt-s" x="82" y="249" text-anchor="middle"><tspan x="82">la congélation, si le</tspan><tspan x="82" dy="13.5">froid atteint le cœur</tspan></text>
<path class="fg-t-vert fg-t-fin fg-tirets" d="M32 277H132"/>
<text class="fg-txt fg-txt-s" x="82" y="296" text-anchor="middle"><tspan x="82">la cuisson à plus de</tspan><tspan x="82" dy="13.5">60 °C à cœur</tspan></text>
<rect class="fg-f-or-l fg-t-or" x="164" y="206" width="148" height="112" rx="12"/>
<text class="fg-txt fg-txt-b fg-txt-or" x="238" y="228" text-anchor="middle"><tspan x="238">Ne les tue pas</tspan></text>
<text class="fg-txt fg-txt-s" x="238" y="256" text-anchor="middle"><tspan x="238">le sel, le vinaigre,</tspan><tspan x="238" dy="13.5">le citron, le fumage</tspan><tspan x="238" dy="13.5">à froid, aux doses</tspan><tspan x="238" dy="13.5">de cuisine</tspan></text>
<rect class="fg-f-doux fg-t-doux" x="8" y="328" width="304" height="42" rx="10"/>
<text class="fg-txt fg-txt-s" x="160" y="346" text-anchor="middle"><tspan x="160">Leurs allergènes résistent au froid</tspan><tspan x="160" dy="13.5">comme à la chaleur</tspan></text>` },

  { ou: "cas", type: "svg",
    vb: "0 0 320 210",
    titre: "Du grand froid à la cuisson",
    legende: "Deux façons de les mettre hors d'état : le froid tenu jusqu'au cœur, ou plus de 60 °C à cœur. Entre les deux, rien n'est garanti, et le froid n'empêche pas Listeria de se multiplier jusqu'à quelques dixièmes de degré sous zéro.",
    alt: "Règle des températures à cœur, avec un axe interrompu entre le froid et la cuisson. À gauche, de −40 à 0 °C, les durées de congélation : 15 heures à −35 °C, 24 heures à −20 °C, et 7 jours à −18 °C ou moins pour un congélateur domestique. Vers 0 °C, un repère rappelle que Listeria se multiplie encore jusqu'à quelques dixièmes de degré sous zéro. À droite, la cuisson : 60 °C à cœur pendant une minute suffisent, et les guides sanitaires retiennent souvent 63 °C par sécurité.",
    corps: `<rect class="fg-f-bleu-l fg-t-bleu fg-t-fin" x="16" y="100" width="160" height="16" rx="3"/>
<rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="204" y="100" width="100" height="16" rx="3"/>
<path class="fg-t-axe" d="M183 94L189 122M193 94L199 122"/>
<path class="fg-t-axe" d="M16 116V122M176 116V122"/>
<text class="fg-txt fg-txt-s" x="16" y="136" text-anchor="start"><tspan x="16">−40 °C</tspan></text>
<text class="fg-txt fg-txt-s" x="176" y="136" text-anchor="middle"><tspan x="176">0 °C</tspan></text>
<text class="fg-txt fg-txt-s fg-txt-doux" x="188" y="16" text-anchor="end"><tspan x="188">Listeria se multiplie</tspan><tspan x="188" dy="13.5">encore jusqu'à quelques</tspan><tspan x="188" dy="13.5">dixièmes de degré sous zéro</tspan></text>
<path class="fg-t-doux fg-t-fin" d="M176 104V52"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-bleu" x="36" y="70" text-anchor="middle"><tspan x="36">−35 °C</tspan><tspan x="36" dy="13.5">15 h</tspan></text>
<path class="fg-t-bleu fg-t-fin" d="M36 104V88"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-bleu" x="96" y="70" text-anchor="middle"><tspan x="96">−20 °C</tspan><tspan x="96" dy="13.5">24 h</tspan></text>
<path class="fg-t-bleu fg-t-fin" d="M96 104V88"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-or" x="104" y="160" text-anchor="middle"><tspan x="104">−18 °C ou moins :</tspan><tspan x="104" dy="13.5">7 jours</tspan></text>
<path class="fg-t-or fg-t-fin fg-tirets" d="M104 112V146"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-terra" x="237" y="70" text-anchor="middle"><tspan x="237">60 °C à cœur,</tspan><tspan x="237" dy="13.5">1 minute</tspan></text>
<path class="fg-t-terra fg-t-fin" d="M237.3 104V88"/>
<text class="fg-txt fg-txt-s fg-txt-terra" x="312" y="160" text-anchor="end"><tspan x="312">63 °C : souvent retenu</tspan><tspan x="312" dy="13.5">par les guides sanitaires</tspan></text>
<path class="fg-t-terra fg-t-fin fg-tirets" d="M257.3 112V146"/>
<circle class="fg-pt fg-f-bleu" cx="36" cy="108" r="4"/>
<circle class="fg-pt fg-f-bleu" cx="96" cy="108" r="4"/>
<circle class="fg-pt fg-f-or" cx="104" cy="108" r="4"/>
<circle class="fg-pt fg-f-bleu" cx="176" cy="108" r="4"/>
<circle class="fg-pt fg-f-terra" cx="237.3" cy="108" r="4"/>
<circle class="fg-pt fg-f-terra" cx="257.3" cy="108" r="4"/>
<text class="fg-txt fg-txt-s fg-txt-b" x="304" y="200" text-anchor="end"><tspan x="304">Température à cœur, axe interrompu</tspan></text>` },

  { ou: "pourquoi", apres: 3, type: "comparaison",
    titre: "Le sel et l'acide, seulement sur des semaines",
    legende: "Les seuls procédés validés associent sel et acide, au froid, pendant des semaines. Un gravlax, un ceviche, des anchois au vinaigre restent du poisson cru : ils demandent une congélation préalable.",
    alt: "Trois morceaux de poisson, chacun avec sa larve enroulée en spirale. Premier, gravlax de 24 heures, ceviche, anchois au vinaigre : sel et acide aux doses de cuisine, la larve est vivante. Deuxième, hareng à 4 % de sel : plus de quatre mois plus tard, des larves survivent. Troisième, hareng à 9 % de sel dans la phase aqueuse avec 2,6 % d'acide acétique, au froid : cinq semaines suffisent, la larve est hors d'état, barrée d'une croix.",
    panneaux: [
      { label: "Gravlax, ceviche",
        sous: "doses de cuisine : larves vivantes",
        ton: "or",
        vb: "0 0 100 68",
        corps: `<rect class="fg-f-terra-l fg-t-terra" x="8" y="6" width="84" height="56" rx="14"/><path class="fg-t-terra fg-t-epais" d="M50.9 34.4L51 35L50.8 35.8L50.1 36.4L49.1 36.7L47.8 36.5L46.6 35.8L45.8 34.4L45.4 32.7L45.9 30.8L47.1 29.1L49 28L51.4 27.5L53.9 28.1L56.2 29.7L57.8 32.2L58.4 35.3L57.7 38.5L55.8 41.4L52.8 43.5L49.1 44.3L45.2 43.7L41.6 41.5L39 38.1L37.8 33.7L38.3 29.1L40.6 24.8L44.5 21.6L49.4 19.9L54.8 20.3L59.8 22.7"/>` },
      { label: "4 % de sel",
        sous: "plus de quatre mois : des larves survivent",
        ton: "or",
        vb: "0 0 100 68",
        corps: `<rect class="fg-f-terra-l fg-t-terra" x="8" y="6" width="84" height="56" rx="14"/><path class="fg-t-terra fg-t-epais" d="M50.9 34.4L51 35L50.8 35.8L50.1 36.4L49.1 36.7L47.8 36.5L46.6 35.8L45.8 34.4L45.4 32.7L45.9 30.8L47.1 29.1L49 28L51.4 27.5L53.9 28.1L56.2 29.7L57.8 32.2L58.4 35.3L57.7 38.5L55.8 41.4L52.8 43.5L49.1 44.3L45.2 43.7L41.6 41.5L39 38.1L37.8 33.7L38.3 29.1L40.6 24.8L44.5 21.6L49.4 19.9L54.8 20.3L59.8 22.7"/>` },
      { label: "9 % de sel, 2,6 % d'acide acétique",
        sous: "cinq semaines au froid : larves tuées",
        ton: "vert",
        vb: "0 0 100 68",
        corps: `<rect class="fg-f-terra-l fg-t-terra" x="8" y="6" width="84" height="56" rx="14"/><path class="fg-t-axe fg-t-epais fg-tirets" d="M50.9 34.4L51 35L50.8 35.8L50.1 36.4L49.1 36.7L47.8 36.5L46.6 35.8L45.8 34.4L45.4 32.7L45.9 30.8L47.1 29.1L49 28L51.4 27.5L53.9 28.1L56.2 29.7L57.8 32.2L58.4 35.3L57.7 38.5L55.8 41.4L52.8 43.5L49.1 44.3L45.2 43.7L41.6 41.5L39 38.1L37.8 33.7L38.3 29.1L40.6 24.8L44.5 21.6L49.4 19.9L54.8 20.3L59.8 22.7"/><path class="fg-t-vert fg-t-tres-epais" d="M44 28L56 40M56 28L44 40"/>` }
    ] },

  { ou: "reperes", type: "barres",
    unite: "h",
    titre: "Congeler : combien de temps",
    legende: "Les 24 h et 15 h sont les durées réglementaires, mesurées à cœur. Les 7 jours du particulier sont une marge de sécurité, pas une durée létale mesurée : un congélateur ménager gèle lentement et oscille à chaque ouverture.",
    alt: "Trois barres de durée de congélation. Congélateur domestique, −18 °C ou moins : 7 jours, recommandation de l'Anses, une marge de sécurité et non une durée létale mesurée. Référence réglementaire à −20 °C, mesurée à cœur : 24 heures. Référence réglementaire à −35 °C, mesurée à cœur : 15 heures.",
    barres: [
      { label: "Congélateur domestique, −18 °C ou moins",
        valeur: 168,
        texte: "7 jours",
        ton: "or",
        note: "recommandation de l'Anses : une marge de sécurité" },
      { label: "Règlement, −20 °C à cœur", valeur: 24, texte: "24 h", ton: "bleu" },
      { label: "Règlement, −35 °C à cœur", valeur: 15, texte: "15 h", ton: "bleu" }
    ] }
];

FIGURES["oeuf-cru"] = [
  { ou: "tete", type: "svg",
    vb: "0 0 320 344",
    titre: "L'œuf en coupe : par où elle entre, où elle se plaît",
    legende: "Deux voies, une seule courante. Une fois dedans, la bactérie survit sans croître dans le blanc ; c'est en vieillissant que la membrane vitelline devient perméable et que le jaune devient son milieu. Schéma d'illustration : il ne chiffre aucun risque.",
    alt: "Coupe d'un œuf, avec en haut deux cartes. Voie 1, la coquille, la plus courante : la bactérie arrive sur la coquille à la ponte ou dans le nid. Voie 2, l'intérieur, plus rare : une poule infectée dépose la bactérie dans l'œuf en formation, avant que la coquille se referme. L'œuf est dessiné avec, de l'extérieur vers l'intérieur : la cuticule, qui bouche les pores, la coquille, le blanc, milieu hostile où l'ovotransferrine séquestre le fer, de sorte que les rares bactéries y survivent sans croître, puis la membrane vitelline, qui devient perméable avec l'âge, et enfin le jaune, riche et sans défense, où les bactéries qui passent se multiplient vite.",
    corps: `<rect class="fg-f-terra-l fg-t-terra" x="8" y="8" width="148" height="66" rx="10"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-terra" x="82" y="28" text-anchor="middle"><tspan x="82">Voie 1 : la coquille</tspan></text>
<text class="fg-txt fg-txt-s" x="82" y="43" text-anchor="middle"><tspan x="82">la plus courante : à la</tspan><tspan x="82" dy="13.5">ponte ou dans le nid</tspan></text>
<rect class="fg-f-or-l fg-t-or" x="164" y="8" width="148" height="66" rx="10"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-or" x="238" y="28" text-anchor="middle"><tspan x="238">Voie 2 : l'intérieur</tspan></text>
<text class="fg-txt fg-txt-s" x="238" y="43" text-anchor="middle"><tspan x="238">plus rare : poule infectée,</tspan><tspan x="238" dy="13.5">avant que la coquille</tspan><tspan x="238" dy="13.5">se referme</tspan></text>
<path class="fg-t-or fg-pointilles fg-t-epais" d="M85 100C128 100 160 170 160 232C160 282 128 318 85 318C42 318 10 282 10 232C10 170 42 100 85 100Z" transform="translate(85 232) scale(1.035) translate(-85 -232)"/>
<path class="fg-f-papier fg-t-axe fg-t-epais" d="M85 100C128 100 160 170 160 232C160 282 128 318 85 318C42 318 10 282 10 232C10 170 42 100 85 100Z"/>
<path class="fg-f-bleu-l fg-t-bleu fg-t-fin" d="M85 100C128 100 160 170 160 232C160 282 128 318 85 318C42 318 10 282 10 232C10 170 42 100 85 100Z" transform="translate(85 232) scale(0.9) translate(-85 -232)"/>
<circle class="fg-f-or-l fg-t-or fg-t-epais" cx="85" cy="236" r="38"/>
<circle class="fg-f-or fg-t-or fg-t-fin" cx="85" cy="236" r="30" opacity=".45"/>
<rect class="fg-f-terra fg-pt" x="52.3" y="117.3" width="9" height="5" rx="2.5" transform="rotate(136.2 56.8 119.8)"/><rect class="fg-f-terra fg-pt" x="36.2" y="137.9" width="9" height="5" rx="2.5" transform="rotate(120.3 40.7 140.4)"/><rect class="fg-f-terra fg-pt" x="23.6" y="165.4" width="9" height="5" rx="2.5" transform="rotate(109.1 28.1 167.9)"/>
<rect class="fg-f-terra fg-pt" x="57.5" y="161.5" width="9" height="5" rx="2.5" transform="rotate(20 62 164)"/><rect class="fg-f-terra fg-pt" x="101.5" y="165.5" width="9" height="5" rx="2.5" transform="rotate(-30 106 168)"/>
<rect class="fg-f-terra fg-pt" x="67.5" y="223.5" width="9" height="5" rx="2.5" transform="rotate(10 72 226)"/><rect class="fg-f-terra fg-pt" x="87.5" y="219.5" width="9" height="5" rx="2.5" transform="rotate(-40 92 222)"/><rect class="fg-f-terra fg-pt" x="75.5" y="241.5" width="9" height="5" rx="2.5" transform="rotate(30 80 244)"/><rect class="fg-f-terra fg-pt" x="95.5" y="237.5" width="9" height="5" rx="2.5" transform="rotate(70 100 240)"/><rect class="fg-f-terra fg-pt" x="61.5" y="239.5" width="9" height="5" rx="2.5" transform="rotate(-20 66 242)"/><rect class="fg-f-terra fg-pt" x="83.5" y="229.5" width="9" height="5" rx="2.5" transform="rotate(0 88 232)"/>
<path class="fg-t-axe fg-t-fin" d="M40 78Q22 92 53.8 113.8" marker-end="url(#fg-fl-terra)"/>
<path class="fg-t-axe fg-t-fin" d="M218 78Q150 92 112 160" marker-end="url(#fg-fl-or)"/>
<text class="fg-txt fg-txt-s fg-txt-b" x="178" y="104" text-anchor="start"><tspan x="178">Coquille et cuticule</tspan></text>
<text class="fg-txt fg-txt-s" x="178" y="118" text-anchor="start"><tspan x="178">la cuticule, déposée à la</tspan><tspan x="178" dy="13.5">ponte, bouche les pores</tspan></text>
<path class="fg-t-doux" d="M174 110L150 148"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-bleu" x="178" y="160" text-anchor="start"><tspan x="178">Blanc : milieu hostile</tspan></text>
<text class="fg-txt fg-txt-s" x="178" y="174" text-anchor="start"><tspan x="178">l'ovotransferrine y</tspan><tspan x="178" dy="13.5">séquestre le fer : les</tspan><tspan x="178" dy="13.5">bactéries y survivent</tspan><tspan x="178" dy="13.5">sans croître</tspan></text>
<path class="fg-t-doux" d="M174 168L138 198"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-or" x="178" y="244" text-anchor="start"><tspan x="178">Membrane vitelline</tspan></text>
<text class="fg-txt fg-txt-s" x="178" y="258" text-anchor="start"><tspan x="178">perméable avec l'âge :</tspan><tspan x="178" dy="13.5">les bactéries passent</tspan></text>
<path class="fg-t-doux" d="M174 250L122 238"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-or" x="178" y="298" text-anchor="start"><tspan x="178">Jaune</tspan></text>
<text class="fg-txt fg-txt-s" x="178" y="312" text-anchor="start"><tspan x="178">riche, sans défense :</tspan><tspan x="178" dy="13.5">elles s'y multiplient vite</tspan></text>
<path class="fg-t-doux" d="M174 304L108 258"/>` },

  { ou: "cas", type: "echelle",
    titre: "Le froid du réfrigérateur : ce qu'il fait, ce qu'il ne fait pas",
    legende: "Le froid suspend, il ne tue pas. Un réfrigérateur à 4 °C bloque la croissance ; mais la contre-porte est la zone la plus chaude et la plus instable, et des relevés chez des particuliers trouvent couramment des appareils entiers au-dessus de 6 °C.",
    alt: "Règle des températures du réfrigérateur, de 0 à 10 °C. La recommandation couvre 0 à 4 °C. La salmonelle cesse de se multiplier entre 5 et 7 °C environ, selon la souche. À 4 °C, la croissance est bien bloquée. Au-dessus de 6 °C, la multiplication repart lentement : des relevés chez des particuliers trouvent couramment des réfrigérateurs entiers dans cette zone. La contre-porte est la zone la plus chaude et la plus instable.",
    min: 0,
    max: 10,
    unite: "°C",
    label: "Température du réfrigérateur",
    graduations: [0, 2, 4, 6, 8, 10],
    zones: [
      { de: 0, a: 4, label: "0 à 4 °C : recommandé", ton: "bleu" },
      { de: 5, a: 7, label: "5 à 7 °C : seuil de croissance selon la souche", ton: "or" }
    ],
    marqueurs: [
      { v: 4, label: "4 °C : croissance bloquée", ton: "bleu" },
      { v: 6, label: "Chez des particuliers : souvent plus de 6 °C", ton: "terra" }
    ] },

  { ou: "cas", type: "comparaison",
    fleche: false,
    titre: "Europe et États-Unis : deux systèmes cohérents",
    legende: "Aucun des deux n'a tort, mais il ne faut pas les mélanger : laver ses œufs européens avant de les ranger, c'est retirer la barrière sans rien mettre à la place.",
    alt: "Deux œufs côte à côte. En Europe, l'œuf n'est pas lavé : la cuticule déposée à la ponte reste, elle bouche les pores et fait barrière, l'œuf se vend à température ambiante, et l'on agit à la source, en vaccinant et en surveillant les pondeuses. Aux États-Unis, l'œuf est lavé et désinfecté au centre de conditionnement, ce qui emporte la cuticule : la coquille devient perméable, et la réfrigération continue, de la ferme au magasin, est obligatoire.",
    panneaux: [
      { label: "Europe",
        sous: "non lavé : la cuticule bouche les pores et fait barrière ; on agit à la source, sur les pondeuses",
        ton: "vert",
        vb: "0 0 100 84",
        corps: `<path class="fg-f-papier fg-t-axe" d="M50 10C66 10 78 34 78 50C78 64 66 74 50 74C34 74 22 64 22 50C22 34 34 10 50 10Z"/><path class="fg-t-or fg-t-tres-epais" d="M50 10C66 10 78 34 78 50C78 64 66 74 50 74C34 74 22 64 22 50C22 34 34 10 50 10Z" transform="translate(50 42) scale(1.09) translate(-50 -42)"/><circle class="fg-f-or" cx="38" cy="28" r="2"/><circle class="fg-f-or" cx="60" cy="24" r="2"/><circle class="fg-f-or" cx="64" cy="50" r="2"/><circle class="fg-f-or" cx="40" cy="60" r="2"/><circle class="fg-f-or" cx="50" cy="42" r="2"/><circle class="fg-f-or" cx="34" cy="46" r="2"/>` },
      { label: "États-Unis",
        sous: "lavé, désinfecté : plus de cuticule, la coquille devient perméable ; réfrigération continue obligatoire",
        ton: "bleu",
        vb: "0 0 100 84",
        corps: `<path class="fg-f-papier fg-t-axe" d="M50 10C66 10 78 34 78 50C78 64 66 74 50 74C34 74 22 64 22 50C22 34 34 10 50 10Z"/><circle class="fg-f-encre" cx="38" cy="28" r="2"/><circle class="fg-f-encre" cx="60" cy="24" r="2"/><circle class="fg-f-encre" cx="64" cy="50" r="2"/><circle class="fg-f-encre" cx="40" cy="60" r="2"/><circle class="fg-f-encre" cx="50" cy="42" r="2"/><circle class="fg-f-encre" cx="34" cy="46" r="2"/><path class="fg-t-bleu fg-t-epais" d="M90 14V34M81 19L99 29M81 29L99 19"/>` }
    ] },

  { ou: "reperes", type: "etapes",
    titre: "Le fil des 24 heures",
    legende: "Les 24 heures sont la limite d'usage retenue par l'Anses, raisonnable mais non mesurée : on la note sur le couvercle, on ne la goûte pas.",
    alt: "Quatre étapes pour une préparation à l'œuf cru. Un œuf récent, des neuf premiers jours après la ponte, ni fêlé, ni souillé, ni lavé. Préparer, en lavant mains, bol et fouet dès que les coquilles sont à la poubelle. Réfrigérer entre 0 et 4 °C, avec l'heure notée sur le couvercle. Au bout de 24 heures, jeter, sans goûter : une préparation crue ne donne aucun signe.",
    etapes: [
      { libelle: "Un œuf récent",
        desc: "9 premiers jours après la ponte ; ni fêlé, ni souillé, ni lavé",
        emoji: "🥚",
        ton: "or" },
      { libelle: "Préparer", desc: "mains, bol et fouet lavés dès que les coquilles sont jetées", emoji: "🧼", ton: "vert" },
      { libelle: "Réfrigérer", desc: "0 à 4 °C, l'heure notée sur le couvercle", emoji: "🧊", ton: "bleu" },
      { libelle: "À 24 heures, jeter",
        desc: "sans goûter : une préparation crue ne donne aucun signe",
        emoji: "🗑️",
        ton: "terra" }
    ] }
];

/* ===== fin Froid, gras & sécurité ===== */



/* ===== Vue d'ensemble ===== */

/* (figures transversales de l'onglet Savoirs) */

/* ===== fin Vue d'ensemble ===== */
