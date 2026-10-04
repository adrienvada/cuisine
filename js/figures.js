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

FIGURES["herbes-coupees"] = [
  {
    ou: "tete",
    type: "svg",
    vb: "0 0 320 312",
    titre: "Ce que la lame met en présence",
    legende: "Dans la feuille intacte, phénols et enzyme sont rangés à part. La coupe les réunit, l'oxygène complète : le brun se fabrique. En parallèle, une autre voie produit l'odeur d'herbe coupée.",
    alt: "Schéma en deux temps. À gauche, une cellule intacte : les phénols sont rangés dans leur compartiment, l'enzyme polyphénol oxydase est dehors, chacun dans son coin. Une flèche, marquée « la lame », mène à droite vers la même cellule tranchée en deux : le compartiment est ouvert, phénols et enzyme se mélangent, et l'oxygène de l'air entre par la coupe. Il se forme des quinones, puis, en dessous, une chaîne de mélanines, des pigments bruns : c'est le noircissement. Un encadré en bas rappelle qu'en parallèle la lipoxygénase libère le cis-3-hexénal, l'odeur même de l'herbe tondue.",
    corps: `<text class="fg-txt fg-txt-b fg-txt-vert" x="66" y="16" text-anchor="middle">Intacte</text>
<text class="fg-txt fg-txt-b fg-txt-terra" x="254" y="16" text-anchor="middle">Tranchée</text>
<rect class="fg-f-carte fg-t-vert fg-t-epais" x="10" y="52" width="112" height="100" rx="16"/>
<rect class="fg-f-or-l fg-t-or" x="22" y="64" width="50" height="76" rx="12"/>
<circle class="fg-f-or" cx="34" cy="80" r="3.2"/><circle class="fg-f-or" cx="55" cy="78" r="3.2"/><circle class="fg-f-or" cx="46" cy="96" r="3.2"/><circle class="fg-f-or" cx="62" cy="108" r="3.2"/><circle class="fg-f-or" cx="36" cy="114" r="3.2"/><circle class="fg-f-or" cx="52" cy="129" r="3.2"/>
<path class="fg-f-encre" d="M90 76l4 4-4 4-4-4z"/><path class="fg-f-encre" d="M106 88l4 4-4 4-4-4z"/><path class="fg-f-encre" d="M94 104l4 4-4 4-4-4z"/><path class="fg-f-encre" d="M108 118l4 4-4 4-4-4z"/><path class="fg-f-encre" d="M92 130l4 4-4 4-4-4z"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-or" x="47" y="170" text-anchor="middle">phénols</text>
<text class="fg-txt fg-txt-s fg-txt-b" x="99" y="170" text-anchor="middle">enzyme</text>
<text class="fg-txt-script fg-txt-vert" x="66" y="199" text-anchor="middle"><tspan x="66">chacun dans son</tspan><tspan x="66" dy="17">compartiment</tspan></text>
<text class="fg-txt-script" x="160" y="90" text-anchor="middle">la lame</text>
<path class="fg-t-axe" d="M132 102L188 102" marker-end="url(#fg-fl-encre)"/>
<path class="fg-f-carte fg-t-vert fg-t-epais" d="M214 52H250V152H214Q198 152 198 136V68Q198 52 214 52Z"/>
<path class="fg-f-carte fg-t-vert fg-t-epais" d="M258 52H294Q310 52 310 68V136Q310 152 294 152H258Z"/>
<text class="fg-txt fg-txt-s fg-txt-doux" x="226" y="38" text-anchor="middle">O₂</text>
<text class="fg-txt fg-txt-s fg-txt-doux" x="284" y="38" text-anchor="middle">O₂</text>
<path class="fg-t-axe fg-t-fin" d="M228 43L243 62" marker-end="url(#fg-fl-encre)"/>
<path class="fg-t-axe fg-t-fin" d="M282 43L267 62" marker-end="url(#fg-fl-encre)"/>
<circle class="fg-f-or" cx="212" cy="72" r="3.2"/><circle class="fg-f-or" cx="226" cy="86" r="3.2"/><circle class="fg-f-or" cx="214" cy="106" r="3.2"/><circle class="fg-f-or" cx="234" cy="120" r="3.2"/><circle class="fg-f-or" cx="222" cy="136" r="3.2"/><circle class="fg-f-or" cx="238" cy="100" r="3.2"/><circle class="fg-f-or" cx="272" cy="72" r="3.2"/><circle class="fg-f-or" cx="288" cy="88" r="3.2"/><circle class="fg-f-or" cx="300" cy="104" r="3.2"/><circle class="fg-f-or" cx="278" cy="124" r="3.2"/><circle class="fg-f-or" cx="294" cy="140" r="3.2"/>
<path class="fg-f-encre" d="M214 86l4 4-4 4-4-4z"/><path class="fg-f-encre" d="M238 66l4 4-4 4-4-4z"/><path class="fg-f-encre" d="M230 126l4 4-4 4-4-4z"/><path class="fg-f-encre" d="M278 94l4 4-4 4-4-4z"/><path class="fg-f-encre" d="M298 68l4 4-4 4-4-4z"/><path class="fg-f-encre" d="M286 112l4 4-4 4-4-4z"/><path class="fg-f-encre" d="M268 136l4 4-4 4-4-4z"/>
<circle class="fg-f-terra" cx="248" cy="84" r="4.6"/><circle class="fg-f-terra" cx="262" cy="100" r="4.6"/><circle class="fg-f-terra" cx="249" cy="114" r="4.6"/><circle class="fg-f-terra" cx="262" cy="126" r="4.6"/><circle class="fg-f-terra" cx="256" cy="70" r="4.6"/><circle class="fg-f-terra" cx="250" cy="140" r="4.6"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-terra" x="254" y="170" text-anchor="middle">quinones</text>
<path class="fg-t-axe fg-t-fin" d="M254 177L254 188" marker-end="url(#fg-fl-encre)"/>
<path class="fg-t-terra fg-t-epais" d="M222 204L286 204"/>
<circle class="fg-f-terra" cx="222" cy="204" r="5.5"/><circle class="fg-f-terra" cx="238" cy="204" r="5.5"/><circle class="fg-f-terra" cx="254" cy="204" r="5.5"/><circle class="fg-f-terra" cx="270" cy="204" r="5.5"/><circle class="fg-f-terra" cx="286" cy="204" r="5.5"/>
<text class="fg-txt fg-txt-b fg-txt-terra" x="254" y="227" text-anchor="middle">Mélanines</text>
<text class="fg-txt fg-txt-s" x="254" y="241" text-anchor="middle">pigments bruns</text>
<rect class="fg-f-vert-l fg-t-vert fg-t-fin" x="10" y="256" width="300" height="46" rx="10"/>
<text class="fg-txt fg-txt-s" x="160" y="274" text-anchor="middle"><tspan x="160">En parallèle, la lipoxygénase libère le cis-3-hexénal,</tspan><tspan x="160" dy="14.5">l'odeur même de l'herbe tondue.</tspan></text>`
  },
  {
    ou: "pourquoi",
    apres: 2,
    type: "comparaison",
    titre: "Trancher, écraser, broyer",
    legende: "Illustration du raisonnement de la fiche, plausible mais jamais mesuré en cuisine : plus il y a de cellules ouvertes, plus il y a de rencontres entre enzyme et phénols.",
    alt: "Trois coupes de feuille, vues comme neuf cellules en grille. Avec une lame affûtée, un passage unique sectionne proprement une seule colonne de cellules, les autres restent intactes : peu de cellules ouvertes. Avec une lame émoussée, la feuille est écrasée et la plupart des cellules sont aplaties et éclatées, d'où le brunissement rapide. Au mixeur, toutes les cellules sont réduites en éclats et la préparation chauffe : c'est le pire traitement pour une feuille tendre. Illustration d'un raisonnement plausible, non mesuré en cuisine.",
    panneaux: [
      {
        label: "Lame affûtée",
        sous: "un passage : peu de cellules ouvertes",
        ton: "vert",
        vb: "0 0 84 96",
        corps: `<rect class="fg-f-vert-l fg-t-vert fg-t-fin" x="4" y="14" width="24" height="24" rx="6"/><circle class="fg-f-vert" cx="16" cy="26" r="3"/><rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="31" y="14" width="10" height="24" rx="4"/><rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="45" y="14" width="10" height="24" rx="4"/><circle class="fg-f-terra" cx="35" cy="22" r="1.8"/><circle class="fg-f-terra" cx="50" cy="30" r="1.8"/><rect class="fg-f-vert-l fg-t-vert fg-t-fin" x="58" y="14" width="24" height="24" rx="6"/><circle class="fg-f-vert" cx="70" cy="26" r="3"/><rect class="fg-f-vert-l fg-t-vert fg-t-fin" x="4" y="41" width="24" height="24" rx="6"/><circle class="fg-f-vert" cx="16" cy="53" r="3"/><rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="31" y="41" width="10" height="24" rx="4"/><rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="45" y="41" width="10" height="24" rx="4"/><circle class="fg-f-terra" cx="35" cy="49" r="1.8"/><circle class="fg-f-terra" cx="50" cy="57" r="1.8"/><rect class="fg-f-vert-l fg-t-vert fg-t-fin" x="58" y="41" width="24" height="24" rx="6"/><circle class="fg-f-vert" cx="70" cy="53" r="3"/><rect class="fg-f-vert-l fg-t-vert fg-t-fin" x="4" y="68" width="24" height="24" rx="6"/><circle class="fg-f-vert" cx="16" cy="80" r="3"/><rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="31" y="68" width="10" height="24" rx="4"/><rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="45" y="68" width="10" height="24" rx="4"/><circle class="fg-f-terra" cx="35" cy="76" r="1.8"/><circle class="fg-f-terra" cx="50" cy="84" r="1.8"/><rect class="fg-f-vert-l fg-t-vert fg-t-fin" x="58" y="68" width="24" height="24" rx="6"/><circle class="fg-f-vert" cx="70" cy="80" r="3"/><path class="fg-t-encre fg-t-epais" d="M43 3V94"/>`
      },
      {
        label: "Lame émoussée",
        sous: "cellules écrasées et rouvertes",
        ton: "or",
        vb: "0 0 84 96",
        corps: `<rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="3" y="19.5" width="26" height="13" rx="6" transform="rotate(-7 16 26)"/><circle class="fg-f-terra" cx="11" cy="22" r="2.2"/><circle class="fg-f-terra" cx="20" cy="29" r="2.2"/><circle class="fg-f-terra" cx="12" cy="32" r="1.8"/><rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="30" y="21" width="26" height="10" rx="6" transform="rotate(0 43 26)"/><circle class="fg-f-terra" cx="38" cy="22" r="2.2"/><circle class="fg-f-terra" cx="47" cy="29" r="2.2"/><circle class="fg-f-terra" cx="39" cy="32" r="1.8"/><rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="57" y="19.5" width="26" height="13" rx="6" transform="rotate(8 70 26)"/><circle class="fg-f-terra" cx="65" cy="22" r="2.2"/><circle class="fg-f-terra" cx="74" cy="29" r="2.2"/><circle class="fg-f-terra" cx="66" cy="32" r="1.8"/><rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="3" y="47" width="26" height="12" rx="6" transform="rotate(5 16 53)"/><circle class="fg-f-terra" cx="11" cy="49" r="2.2"/><circle class="fg-f-terra" cx="20" cy="56" r="2.2"/><circle class="fg-f-terra" cx="12" cy="59" r="1.8"/><rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="30" y="48.5" width="26" height="9" rx="6" transform="rotate(-4 43 53)"/><circle class="fg-f-terra" cx="38" cy="49" r="2.2"/><circle class="fg-f-terra" cx="47" cy="56" r="2.2"/><circle class="fg-f-terra" cx="39" cy="59" r="1.8"/><rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="57" y="47" width="26" height="12" rx="6" transform="rotate(-6 70 53)"/><circle class="fg-f-terra" cx="65" cy="49" r="2.2"/><circle class="fg-f-terra" cx="74" cy="56" r="2.2"/><circle class="fg-f-terra" cx="66" cy="59" r="1.8"/><rect class="fg-f-vert-l fg-t-vert fg-t-fin" x="4" y="68" width="24" height="24" rx="6"/><circle class="fg-f-vert" cx="16" cy="80" r="3"/><rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="30" y="74.5" width="26" height="11" rx="6" transform="rotate(6 43 80)"/><circle class="fg-f-terra" cx="38" cy="76" r="2.2"/><circle class="fg-f-terra" cx="47" cy="83" r="2.2"/><circle class="fg-f-terra" cx="39" cy="86" r="1.8"/><rect class="fg-f-vert-l fg-t-vert fg-t-fin" x="58" y="68" width="24" height="24" rx="6"/><circle class="fg-f-vert" cx="70" cy="80" r="3"/><rect class="fg-f-doux fg-t-encre" x="34" y="0" width="18" height="14" rx="5"/>`
      },
      {
        label: "Mixeur",
        sous: "tout s'ouvre, et ça chauffe",
        ton: "terra",
        vb: "0 0 84 96",
        corps: `<path class="fg-f-terra-l fg-t-terra fg-t-fin" d="M4 24L10 15L16 23Z" transform="rotate(0 10 20)"/><path class="fg-f-terra-l fg-t-terra fg-t-fin" d="M18 32L24 23L30 31Z" transform="rotate(40 24 28)"/><path class="fg-f-terra-l fg-t-terra fg-t-fin" d="M34 22L40 13L46 21Z" transform="rotate(80 40 18)"/><path class="fg-f-terra-l fg-t-terra fg-t-fin" d="M52 28L58 19L64 27Z" transform="rotate(20 58 24)"/><path class="fg-f-terra-l fg-t-terra fg-t-fin" d="M66 22L72 13L78 21Z" transform="rotate(60 72 18)"/><path class="fg-f-terra-l fg-t-terra fg-t-fin" d="M8 48L14 39L20 47Z" transform="rotate(90 14 44)"/><path class="fg-f-terra-l fg-t-terra fg-t-fin" d="M26 54L32 45L38 53Z" transform="rotate(10 32 50)"/><path class="fg-f-terra-l fg-t-terra fg-t-fin" d="M42 46L48 37L54 45Z" transform="rotate(50 48 42)"/><path class="fg-f-terra-l fg-t-terra fg-t-fin" d="M58 54L64 45L70 53Z" transform="rotate(100 64 50)"/><path class="fg-f-terra-l fg-t-terra fg-t-fin" d="M70 48L76 39L82 47Z" transform="rotate(30 76 44)"/><path class="fg-f-terra-l fg-t-terra fg-t-fin" d="M6 72L12 63L18 71Z" transform="rotate(70 12 68)"/><path class="fg-f-terra-l fg-t-terra fg-t-fin" d="M22 80L28 71L34 79Z" transform="rotate(20 28 76)"/><path class="fg-f-terra-l fg-t-terra fg-t-fin" d="M38 70L44 61L50 69Z" transform="rotate(110 44 66)"/><path class="fg-f-terra-l fg-t-terra fg-t-fin" d="M54 82L60 73L66 81Z" transform="rotate(45 60 78)"/><path class="fg-f-terra-l fg-t-terra fg-t-fin" d="M68 74L74 65L80 73Z" transform="rotate(85 74 70)"/><path class="fg-f-terra-l fg-t-terra fg-t-fin" d="M14 92L20 83L26 91Z" transform="rotate(15 20 88)"/><path class="fg-f-terra-l fg-t-terra fg-t-fin" d="M44 92L50 83L56 91Z" transform="rotate(65 50 88)"/><path class="fg-f-terra-l fg-t-terra fg-t-fin" d="M64 94L70 85L76 93Z" transform="rotate(35 70 90)"/><circle class="fg-f-terra" cx="18" cy="34" r="2.2"/><circle class="fg-f-terra" cx="36" cy="36" r="2.2"/><circle class="fg-f-terra" cx="54" cy="32" r="2.2"/><circle class="fg-f-terra" cx="68" cy="36" r="2.2"/><circle class="fg-f-terra" cx="22" cy="58" r="2.2"/><circle class="fg-f-terra" cx="40" cy="56" r="2.2"/><circle class="fg-f-terra" cx="58" cy="62" r="2.2"/><circle class="fg-f-terra" cx="32" cy="82" r="2.2"/><circle class="fg-f-terra" cx="64" cy="82" r="2.2"/><circle class="fg-f-terra" cx="8" cy="80" r="2.2"/><path class="fg-t-terra fg-t-fin" d="M20 12q-4-4 0-8t0-7M42 12q-4-4 0-8t0-7M64 12q-4-4 0-8t0-7"/>`
      }
    ]
  },
  {
    ou: "cas",
    type: "echelle",
    titre: "Le froid et le basilic",
    legende: "Le basilic craint le froid autant que la lame : sous 12 °C ses membranes commencent à céder, et il noircit même entier, franchement dès 4 °C.",
    alt: "Règle des températures de conservation, graduée à 4 et 12 °C. Entre zéro et 4 °C, le basilic noircit franchement, même entier. Entre 4 et 12 °C, ses membranes commencent à céder et il noircit encore entier. Au-dessus de 12 °C, il est à l'abri du froid : on le garde hors du réfrigérateur, la tige dans l'eau. Conclusion : le basilic ne va pas au réfrigérateur.",
    min: 0,
    max: 20,
    unite: "°C",
    label: "Température de conservation",
    graduations: [4, 12],
    zones: [
      { de: 0, a: 4, label: "noircit", ton: "terra" },
      { de: 4, a: 12, label: "membranes fragilisées", ton: "or" },
      { de: 12, a: 20, label: "à l'abri du froid", ton: "vert" }
    ],
    marqueurs: [
      { v: 4, label: "Dès 4 °C : noircit franchement, même entier", ton: "terra" },
      { v: 12, label: "Sous 12 °C : les membranes cèdent", ton: "or" }
    ]
  },
  {
    ou: "reperes",
    type: "etapes",
    titre: "Quand mettre l'herbe",
    legende: "Les ligneuses attendent dans la cuisson, les tendres arrivent à la toute fin : la chaleur efface leurs arômes.",
    alt: "Trois étapes à la suite. Un : au début de la cuisson, les herbes ligneuses — romarin, thym, laurier, sauge — pendant 15 à 20 minutes, pour qu'elles donnent leur parfum. Deux : on éteint le feu. Trois : au service, les herbes tendres — basilic, cerfeuil, ciboulette, aneth, menthe — ciselées moins de 10 minutes avant de servir.",
    etapes: [
      { libelle: "Dès le début", desc: "romarin, thym, laurier, sauge : 15 à 20 minutes de cuisson", emoji: "🌿", ton: "terra" },
      { libelle: "Hors du feu", desc: "la chaleur efface les arômes des herbes tendres", emoji: "🥘", ton: "or" },
      {
        libelle: "Au service",
        desc: "basilic, cerfeuil, ciboulette, aneth, menthe : ciselés moins de 10 minutes avant",
        emoji: "🍃",
        ton: "vert"
      }
    ]
  }
];

FIGURES["chlorophylle"] = [
  {
    ou: "tete",
    type: "svg",
    vb: "0 0 320 258",
    titre: "Quand le magnésium s'en va",
    legende: "Regardez le centre de l'anneau : tant que le magnésium y reste, le vert tient ; quand un proton le remplace, il vire à l'olive, et la bascule est sans retour en cuisine.",
    alt: "Schéma en deux molécules reliées par une flèche. À gauche, la chlorophylle : un grand anneau avec un atome de magnésium au centre, d'un vert vif. À droite, la phéophytine, d'un vert olive terne : un proton H plus a pris la place du magnésium, qui s'échappe de l'anneau. La flèche est marquée « acides libérés » : les cellules cuites relâchent leurs acides. Elle est sans retour, car le magnésium ne revient jamais dans l'anneau en cuisine. Un encadré en bas rappelle comment retarder la bascule : beaucoup d'eau, pas de couvercle, cuisson courte.",
    corps: `<text class="fg-txt fg-txt-b fg-txt-vert" x="78" y="16" text-anchor="middle">Chlorophylle</text>
<text class="fg-txt fg-txt-s" x="78" y="31" text-anchor="middle">vert vif</text>
<text class="fg-txt fg-txt-b fg-txt-or" x="242" y="16" text-anchor="middle">Phéophytine</text>
<text class="fg-txt fg-txt-s" x="242" y="31" text-anchor="middle">vert olive terne</text>
<rect class="fg-t-vert fg-t-epais" x="40" y="60" width="76" height="76" rx="22"/><circle class="fg-f-vert-l fg-t-vert" cx="51" cy="71" r="11"/><circle class="fg-f-vert-l fg-t-vert" cx="105" cy="71" r="11"/><circle class="fg-f-vert-l fg-t-vert" cx="51" cy="125" r="11"/><circle class="fg-f-vert-l fg-t-vert" cx="105" cy="125" r="11"/><path class="fg-t-vert fg-t-fin" d="M78 98L53 98"/><circle class="fg-f-vert" cx="53" cy="98" r="3.6"/><path class="fg-t-vert fg-t-fin" d="M78 98L103 98"/><circle class="fg-f-vert" cx="103" cy="98" r="3.6"/><path class="fg-t-vert fg-t-fin" d="M78 98L78 73"/><circle class="fg-f-vert" cx="78" cy="73" r="3.6"/><path class="fg-t-vert fg-t-fin" d="M78 98L78 123"/><circle class="fg-f-vert" cx="78" cy="123" r="3.6"/><circle class="fg-f-or-l fg-t-or fg-t-epais" cx="78" cy="98" r="12"/><text class="fg-txt fg-txt-s fg-txt-b fg-txt-or" x="78" y="102" text-anchor="middle">Mg</text>
<rect class="fg-t-or fg-t-epais" x="204" y="60" width="76" height="76" rx="22"/><circle class="fg-f-or-l fg-t-or" cx="215" cy="71" r="11"/><circle class="fg-f-or-l fg-t-or" cx="269" cy="71" r="11"/><circle class="fg-f-or-l fg-t-or" cx="215" cy="125" r="11"/><circle class="fg-f-or-l fg-t-or" cx="269" cy="125" r="11"/><path class="fg-t-or fg-t-fin" d="M242 98L217 98"/><circle class="fg-f-or" cx="217" cy="98" r="3.6"/><path class="fg-t-or fg-t-fin" d="M242 98L267 98"/><circle class="fg-f-or" cx="267" cy="98" r="3.6"/><path class="fg-t-or fg-t-fin" d="M242 98L242 73"/><circle class="fg-f-or" cx="242" cy="73" r="3.6"/><path class="fg-t-or fg-t-fin" d="M242 98L242 123"/><circle class="fg-f-or" cx="242" cy="123" r="3.6"/><circle class="fg-f-terra-l fg-t-terra fg-t-epais" cx="242" cy="98" r="12"/><text class="fg-txt fg-txt-s fg-txt-b fg-txt-terra" x="242" y="102" text-anchor="middle">H⁺</text>
<circle class="fg-f-or-l fg-t-or fg-tirets" cx="298" cy="54" r="10"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-or" x="298" y="58" text-anchor="middle">Mg</text>
<path class="fg-t-terra fg-t-fin fg-tirets" d="M276 74Q284 70 288 62" marker-end="url(#fg-fl-terra)"/>
<text class="fg-txt fg-txt-s" x="160" y="70" text-anchor="middle"><tspan x="160">acides</tspan><tspan x="160" dy="13.5">libérés</tspan></text>
<path class="fg-t-axe" d="M126 98L194 98" marker-end="url(#fg-fl-encre)"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-terra" x="160" y="120" text-anchor="middle">sans retour</text>
<text class="fg-txt fg-txt-s" x="78" y="154" text-anchor="middle"><tspan x="78">magnésium au centre</tspan><tspan x="78" dy="13.5">du grand anneau</tspan></text>
<text class="fg-txt fg-txt-s" x="242" y="154" text-anchor="middle"><tspan x="242">un proton prend la</tspan><tspan x="242" dy="13.5">place du magnésium</tspan></text>
<rect class="fg-f-vert-l fg-t-vert fg-t-fin" x="10" y="188" width="300" height="60" rx="10"/>
<text class="fg-txt fg-txt-b fg-txt-vert" x="160" y="209" text-anchor="middle">Retarder la bascule</text>
<text class="fg-txt fg-txt-s" x="160" y="226" text-anchor="middle"><tspan x="160">beaucoup d'eau, pas de couvercle,</tspan><tspan x="160" dy="13.5">cuisson courte</tspan></text>`
  },
  {
    ou: "pourquoi",
    apres: 2,
    type: "courbe",
    qualitative: true,
    titre: "Le vert selon la durée d'ébullition",
    legende: "Allure qualitative : la chaleur avive d'abord le vert, puis il tient quelques minutes, tourne entre 5 et 7 minutes et s'effondre au-delà. Seules les durées viennent de la fiche.",
    alt: "Courbe sans valeurs chiffrées : l'éclat du vert en fonction de la durée d'ébullition. Il monte au début, car la chaleur chasse l'air entre les cellules, atteint son maximum vers 3 minutes, où un haricot vert reste éclatant, puis redescend. Le virage devient visible entre 5 et 7 minutes d'ébullition, puis il s'emballe : à 10 minutes, le légume est cuit mais kaki. Allure qualitative ; les durées sont celles de la fiche.",
    x: {
      label: "Durée d'ébullition",
      min: 0,
      max: 12,
      extremites: ["crue", "longue"]
    },
    y: { label: "Éclat du vert", min: 0, max: 1.08 },
    series: [
      {
        nom: "Vert",
        ton: "vert",
        aire: true,
        points: [[0, 0.5], [1.5, 0.82], [3, 0.97], [5, 0.9], [7, 0.55], [8.5, 0.28], [10, 0.14], [12, 0.08]]
      }
    ],
    zones: [
      { de: 5, a: 7, label: "virage visible", ton: "or" }
    ],
    reperes: [
      { x: 3, label: "3 min : éclatant", ton: "vert" },
      { x: 10, label: "10 min : kaki", ton: "terra" }
    ],
    notes: [
      { x: 1, y: 0.7, texte: "l'air est chassé", dx: 6, dy: 52, largeur: 90, ancre: "start" }
    ]
  },
  {
    ou: "cas",
    type: "comparaison",
    titre: "Trois gestes, trois verts",
    legende: "Beaucoup d'eau à découvert tient le vert. Le couvercle donne un légume kaki, sans qu'on sache bien pourquoi ; le vinaigre sur un légume brûlant le fait virer en quelques minutes.",
    alt: "Trois dessins côte à côte. À gauche, une grande casserole d'eau à gros bouillons, sans couvercle, la vapeur s'échappe : les haricots restent d'un vert éclatant, car les acides qu'ils libèrent sont dilués. Au centre, une casserole couverte : les haricots sont kaki, la raison exacte se discute. À droite, des haricots brûlants dans une assiette, du vinaigre ou du citron qui coule dessus : la surface vire en quelques minutes.",
    panneaux: [
      {
        label: "Grande eau, à découvert",
        sous: "acides dilués : vert tenu",
        ton: "vert",
        vb: "0 0 84 76",
        corps: `<path class="fg-t-bleu fg-t-fin" d="M24 24q-4-4 0-8t0-8M42 24q-4-4 0-8t0-8M60 24q-4-4 0-8t0-8"/>
<path class="fg-f-bleu-l fg-t-encre fg-t-epais" d="M8 30V60Q8 70 18 70H66Q76 70 76 60V30"/>
<path class="fg-t-encre fg-t-epais" d="M4 30H80"/>
<ellipse class="fg-f-vert" cx="24" cy="52" rx="8" ry="3.2" transform="rotate(-18 24 52)"/><ellipse class="fg-f-vert" cx="42" cy="58" rx="8" ry="3.2" transform="rotate(14 42 58)"/><ellipse class="fg-f-vert" cx="58" cy="49" rx="8" ry="3.2" transform="rotate(-10 58 49)"/><ellipse class="fg-f-vert" cx="30" cy="63" rx="8" ry="3.2" transform="rotate(10 30 63)"/><ellipse class="fg-f-vert" cx="54" cy="63" rx="8" ry="3.2" transform="rotate(-16 54 63)"/>
<circle class="fg-t-bleu fg-t-fin" cx="16" cy="42" r="2.2"/><circle class="fg-t-bleu fg-t-fin" cx="66" cy="58" r="2.2"/><circle class="fg-t-bleu fg-t-fin" cx="46" cy="42" r="2.2"/>
<circle class="fg-f-or" cx="18" cy="56" r="1.7"/><circle class="fg-f-or" cx="70" cy="44" r="1.7"/><circle class="fg-f-or" cx="36" cy="42" r="1.7"/><circle class="fg-f-or" cx="64" cy="66" r="1.7"/>`
      },
      {
        label: "Sous couvercle",
        sous: "kaki ; la raison se discute",
        ton: "terra",
        vb: "0 0 84 76",
        corps: `<path class="fg-f-bleu-l" d="M9 46H75V60Q75 69 66 69H18Q9 69 9 60Z"/>
<path class="fg-t-encre fg-t-epais" d="M8 34V60Q8 70 18 70H66Q76 70 76 60V34"/>
<path class="fg-f-doux fg-t-encre fg-t-epais" d="M4 34Q42 8 80 34Z"/>
<circle class="fg-f-encre" cx="42" cy="19" r="3"/>
<ellipse class="fg-f-or" cx="24" cy="58" rx="8" ry="3.2" transform="rotate(-12 24 58)"/><ellipse class="fg-f-or" cx="44" cy="61" rx="8" ry="3.2" transform="rotate(10 44 61)"/><ellipse class="fg-f-or" cx="60" cy="56" rx="8" ry="3.2" transform="rotate(-14 60 56)"/>
<circle class="fg-f-or" cx="14" cy="50" r="1.7"/><circle class="fg-f-or" cx="22" cy="52" r="1.7"/><circle class="fg-f-or" cx="32" cy="49" r="1.7"/><circle class="fg-f-or" cx="40" cy="53" r="1.7"/><circle class="fg-f-or" cx="50" cy="50" r="1.7"/><circle class="fg-f-or" cx="58" cy="52" r="1.7"/><circle class="fg-f-or" cx="68" cy="50" r="1.7"/><circle class="fg-f-or" cx="16" cy="64" r="1.7"/><circle class="fg-f-or" cx="30" cy="66" r="1.7"/><circle class="fg-f-or" cx="38" cy="56" r="1.7"/><circle class="fg-f-or" cx="52" cy="66" r="1.7"/><circle class="fg-f-or" cx="66" cy="64" r="1.7"/><circle class="fg-f-or" cx="46" cy="48" r="1.7"/><circle class="fg-f-or" cx="26" cy="60" r="1.7"/>`
      },
      {
        label: "Acide trop tôt",
        sous: "sur un légume brûlant : la surface vire",
        ton: "or",
        vb: "0 0 84 76",
        corps: `<path class="fg-t-terra fg-t-fin" d="M30 44q-4-4 0-8t0-8M54 44q-4-4 0-8t0-8"/>
<ellipse class="fg-f-carte fg-t-encre fg-t-epais" cx="42" cy="66" rx="36" ry="9"/>
<ellipse class="fg-f-vert" cx="24" cy="61" rx="8" ry="3.2" transform="rotate(-10 24 61)"/><ellipse class="fg-f-or" cx="40" cy="58" rx="8" ry="3.2" transform="rotate(8 40 58)"/><ellipse class="fg-f-or" cx="56" cy="60" rx="8" ry="3.2" transform="rotate(-8 56 60)"/><ellipse class="fg-f-vert" cx="34" cy="66" rx="8" ry="3.2" transform="rotate(6 34 66)"/><ellipse class="fg-f-vert" cx="52" cy="67" rx="8" ry="3.2" transform="rotate(-12 52 67)"/>
<path class="fg-f-or" d="M38 4q5 7 0 10q-5-3 0-10zM47 16q5 7 0 10q-5-3 0-10z"/>`
      }
    ]
  },
  {
    ou: "reperes",
    type: "etapes",
    titre: "La méthode d'un coup d'œil",
    legende: "Cuire vite dans beaucoup d'eau, refroidir aussitôt, assaisonner à la fin.",
    alt: "Trois étapes à la suite. Un : cuire au moins 3 litres d'eau pour 500 grammes de légumes verts, à gros bouillons et à découvert, 3 à 5 minutes. Deux : plonger dans un bain glacé, autant de glaçons que d'eau, jusqu'à ce que le légume soit froid à cœur. Trois : assaisonner une fois le légume refroidi, juste avant de passer à table.",
    etapes: [
      {
        libelle: "Cuire",
        desc: "au moins 3 litres d'eau pour 500 g, à gros bouillons, à découvert : 3 à 5 minutes",
        emoji: "🔥",
        ton: "terra"
      },
      {
        libelle: "Bain glacé",
        desc: "autant de glaçons que d'eau, jusqu'à ce que le légume soit froid à cœur",
        emoji: "🧊",
        ton: "bleu"
      },
      { libelle: "Assaisonner", desc: "une fois refroidi, juste avant de passer à table", emoji: "🥗", ton: "or" }
    ]
  }
];

FIGURES["oxydation-enzymatique"] = [
  {
    ou: "tete",
    type: "svg",
    vb: "0 0 320 348",
    titre: "Trois conditions, trois leviers",
    legende: "Le brun demande l'enzyme, les phénols et l'oxygène réunis : en retirer un seul suffit. Les barres marquent où chaque geste coupe la chaîne ; le froid, lui, ne fait que ralentir.",
    alt: "Schéma en trois colonnes qui se rejoignent. Il faut trois choses : l'enzyme polyphénol oxydase, les phénols propres au fruit, et l'oxygène de l'air. Elles mènent aux quinones, puis aux mélanines, des chaînes de pigments bruns, les mêmes que ceux du bronzage. Chaque geste barre une colonne. Sur l'enzyme : l'acidité, avec un pH sous 4 obtenu par le citron, et la chaleur d'un blanchiment au-dessus de 80 degrés. Sur l'oxygène : l'eau ou un film, qui écartent l'air. Une bande en pointillés traverse les trois colonnes : le froid ralentit tout mais n'arrête rien, l'enzyme reste active à 4 °C.",
    corps: `<rect class="fg-f-or-l fg-t-or" x="10" y="8" width="96" height="62" rx="10"/>
<text class="fg-txt fg-txt-b fg-txt-or" x="58" y="28" text-anchor="middle">Enzyme</text>
<text class="fg-txt fg-txt-s" x="58" y="43" text-anchor="middle"><tspan x="58">polyphénol</tspan><tspan x="58" dy="13.5">oxydase</tspan></text>
<rect class="fg-f-vert-l fg-t-vert" x="112" y="8" width="96" height="62" rx="10"/>
<text class="fg-txt fg-txt-b fg-txt-vert" x="160" y="28" text-anchor="middle">Phénols</text>
<text class="fg-txt fg-txt-s" x="160" y="43" text-anchor="middle"><tspan x="160">propres</tspan><tspan x="160" dy="13.5">au fruit</tspan></text>
<rect class="fg-f-doux fg-t-axe" x="214" y="8" width="96" height="62" rx="10"/>
<text class="fg-txt fg-txt-b" x="262" y="28" text-anchor="middle">Oxygène</text>
<text class="fg-txt fg-txt-s" x="262" y="43" text-anchor="middle"><tspan x="262">de l'air</tspan></text>
<path class="fg-t-axe" d="M58 72L58 272" marker-end="url(#fg-fl-encre)"/>
<path class="fg-t-axe" d="M160 72L160 272" marker-end="url(#fg-fl-encre)"/>
<path class="fg-t-axe" d="M262 72L262 272" marker-end="url(#fg-fl-encre)"/>
<rect class="fg-f-carte fg-t-or" x="10" y="82" width="96" height="48" rx="8"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-or" x="58" y="97" text-anchor="middle">Acidité</text>
<text class="fg-txt fg-txt-s" x="58" y="111" text-anchor="middle"><tspan x="58">pH sous 4</tspan><tspan x="58" dy="13.5">(le citron)</tspan></text>
<path class="fg-t-or fg-t-tres-epais" d="M42 135H74"/>
<rect class="fg-f-carte fg-t-terra" x="10" y="144" width="96" height="48" rx="8"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-terra" x="58" y="159" text-anchor="middle">Chaleur</text>
<text class="fg-txt fg-txt-s" x="58" y="173" text-anchor="middle"><tspan x="58">blanchiment,</tspan><tspan x="58" dy="13.5">plus de 80 °C</tspan></text>
<path class="fg-t-terra fg-t-tres-epais" d="M42 197H74"/>
<rect class="fg-f-carte fg-t-bleu" x="214" y="112" width="96" height="44" rx="8"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-bleu" x="262" y="127" text-anchor="middle">Eau, film</text>
<text class="fg-txt fg-txt-s" x="262" y="141" text-anchor="middle"><tspan x="262">écartent l'air</tspan></text>
<path class="fg-t-bleu fg-t-tres-epais" d="M246 162H278"/>
<rect class="fg-f-bleu-l fg-t-bleu fg-tirets" x="10" y="212" width="300" height="44" rx="10"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-bleu" x="160" y="230" text-anchor="middle">Le froid ralentit tout et n'arrête rien</text>
<text class="fg-txt fg-txt-s" x="160" y="245" text-anchor="middle">l'enzyme reste active à 4 °C</text>
<rect class="fg-f-terra-l fg-t-terra" x="10" y="276" width="300" height="62" rx="10"/>
<text class="fg-txt fg-txt-b fg-txt-terra" x="160" y="298" text-anchor="middle">Quinones, puis mélanines</text>
<text class="fg-txt fg-txt-s" x="160" y="315" text-anchor="middle"><tspan x="160">des chaînes de pigments bruns,</tspan><tspan x="160" dy="13.5">les mêmes que ceux du bronzage</tspan></text>`
  },
  {
    ou: "pourquoi",
    apres: 2,
    type: "svg",
    vb: "0 0 320 200",
    titre: "Du phénol au pigment brun",
    legende: "La chaîne va dans un seul sens, sauf là où la vitamine C du citron fait marche arrière, tant qu'il en reste.",
    alt: "Schéma en trois cases reliées. Les phénols du fruit, sous l'action de l'enzyme et de l'oxygène, deviennent des quinones, très réactives. Les quinones se lient en chaînes pour former les mélanines, des pigments bruns, les mêmes que ceux du bronzage. Une flèche en pointillés revient des quinones vers les phénols : la vitamine C du citron ramène les quinones en arrière, tant qu'il en reste.",
    corps: `<text class="fg-txt fg-txt-s" x="105" y="19" text-anchor="middle"><tspan x="105">enzyme</tspan><tspan x="105" dy="13.5">+ O₂</tspan></text>
<text class="fg-txt fg-txt-s" x="216" y="19" text-anchor="middle"><tspan x="216">se lient en</tspan><tspan x="216" dy="13.5">chaînes</tspan></text>
<rect class="fg-f-vert-l fg-t-vert" x="8" y="42" width="84" height="62" rx="10"/>
<text class="fg-txt fg-txt-b fg-txt-vert" x="50" y="68" text-anchor="middle">Phénols</text>
<text class="fg-txt fg-txt-s" x="50" y="85" text-anchor="middle">du fruit</text>
<rect class="fg-f-or-l fg-t-or" x="118" y="42" width="84" height="62" rx="10"/>
<text class="fg-txt fg-txt-b fg-txt-or" x="160" y="68" text-anchor="middle">Quinones</text>
<text class="fg-txt fg-txt-s" x="160" y="85" text-anchor="middle">très réactives</text>
<rect class="fg-f-terra-l fg-t-terra" x="228" y="42" width="84" height="62" rx="10"/>
<text class="fg-txt fg-txt-b fg-txt-terra" x="270" y="68" text-anchor="middle">Mélanines</text>
<text class="fg-txt fg-txt-s" x="270" y="85" text-anchor="middle">chaînes brunes</text>
<path class="fg-t-axe" d="M94 73L116 73" marker-end="url(#fg-fl-encre)"/>
<path class="fg-t-axe" d="M204 73L226 73" marker-end="url(#fg-fl-encre)"/>
<path class="fg-t-or fg-t-epais fg-tirets" d="M150 108Q100 146 56 110" marker-end="url(#fg-fl-or)"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-or" x="104" y="158" text-anchor="middle">Vitamine C du citron</text>
<text class="fg-txt fg-txt-s" x="104" y="172" text-anchor="middle"><tspan x="104">ramène les quinones en arrière,</tspan><tspan x="104" dy="13.5">tant qu'il en reste</tspan></text>
<text class="fg-txt fg-txt-s" x="270" y="122" text-anchor="middle"><tspan x="270">les pigments</tspan><tspan x="270" dy="13.5">du bronzage</tspan></text>`
  },
  {
    ou: "cas",
    type: "comparaison",
    titre: "La surface exposée décide",
    legende: "Illustration qualitative : le brunissement se joue sur la face coupée. Une pomme en petits dés, qui n'a presque que des faces coupées, vire beaucoup plus vite qu'un gros morceau.",
    alt: "Deux dessins de pomme côte à côte. À gauche, un gros morceau : seule sa face coupée, à la base, est teintée de brun ; le reste est intact, donc peu de surface exposée. À droite, des petits dés : neuf cubes dont toutes les faces sont coupées et brunies, donc beaucoup de surface exposée. Elle vire beaucoup plus vite. Illustration qualitative.",
    panneaux: [
      {
        label: "Un gros morceau",
        sous: "peu de face coupée à l'air",
        ton: "vert",
        vb: "0 0 134 96",
        corps: `<path class="fg-f-carte fg-t-vert fg-t-epais" d="M22 70A45 56 0 0 1 112 70Z"/>
<path class="fg-t-doux" d="M33 66A34 44 0 0 1 101 66"/>
<ellipse class="fg-f-doux fg-t-doux" cx="67" cy="60" rx="6" ry="8"/>
<path class="fg-t-terra fg-t-tres-epais" d="M22 70H112"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-terra" x="67" y="90" text-anchor="middle">face coupée</text>`
      },
      {
        label: "Petits dés",
        sous: "presque tout est face coupée : vire beaucoup plus vite",
        ton: "terra",
        vb: "0 0 134 96",
        corps: `<rect class="fg-f-terra" opacity=".5" x="28" y="10" width="22" height="22" rx="3"/><rect class="fg-t-terra fg-t-epais" x="28" y="10" width="22" height="22" rx="3"/><rect class="fg-f-terra" opacity=".5" x="56" y="10" width="22" height="22" rx="3"/><rect class="fg-t-terra fg-t-epais" x="56" y="10" width="22" height="22" rx="3"/><rect class="fg-f-terra" opacity=".5" x="84" y="10" width="22" height="22" rx="3"/><rect class="fg-t-terra fg-t-epais" x="84" y="10" width="22" height="22" rx="3"/><rect class="fg-f-terra" opacity=".5" x="28" y="38" width="22" height="22" rx="3"/><rect class="fg-t-terra fg-t-epais" x="28" y="38" width="22" height="22" rx="3"/><rect class="fg-f-terra" opacity=".5" x="56" y="38" width="22" height="22" rx="3"/><rect class="fg-t-terra fg-t-epais" x="56" y="38" width="22" height="22" rx="3"/><rect class="fg-f-terra" opacity=".5" x="84" y="38" width="22" height="22" rx="3"/><rect class="fg-t-terra fg-t-epais" x="84" y="38" width="22" height="22" rx="3"/><rect class="fg-f-terra" opacity=".5" x="28" y="66" width="22" height="22" rx="3"/><rect class="fg-t-terra fg-t-epais" x="28" y="66" width="22" height="22" rx="3"/><rect class="fg-f-terra" opacity=".5" x="56" y="66" width="22" height="22" rx="3"/><rect class="fg-t-terra fg-t-epais" x="56" y="66" width="22" height="22" rx="3"/><rect class="fg-f-terra" opacity=".5" x="84" y="66" width="22" height="22" rx="3"/><rect class="fg-t-terra fg-t-epais" x="84" y="66" width="22" height="22" rx="3"/>`
      }
    ]
  },
  {
    ou: "reperes",
    type: "echelle",
    titre: "L'acidité qui arrête l'enzyme",
    legende: "L'enzyme travaille au mieux vers pH 6 et s'arrête presque sous pH 4. Comptez le jus d'un citron entier par litre d'eau : un demi ne fait qu'effleurer le seuil.",
    alt: "Règle du pH de 3 à 7, graduée à 4 et 6. Vers pH 6, l'enzyme travaille au mieux. En dessous de pH 4, elle s'arrête presque : c'est la zone protégée. Pour y descendre, il faut le jus d'un citron entier par litre d'eau ; un demi ne fait qu'effleurer le seuil.",
    min: 3,
    max: 7,
    unite: "",
    label: "pH du milieu",
    graduations: [4, 6],
    zones: [
      { de: 3, a: 4, label: "presque arrêtée", ton: "vert" }
    ],
    marqueurs: [
      { v: 4, label: "Sous pH 4 : l'enzyme s'arrête presque", ton: "vert" },
      { v: 6, label: "Optimum vers pH 6", ton: "terra" }
    ]
  }
];

/* ===== fin Végétal & couleur ===== */



/* ===== Froid, gras & sécurité ===== */

/* (figures de la famille) */

/* ===== fin Froid, gras & sécurité ===== */



/* ===== Vue d'ensemble ===== */

/* (figures transversales de l'onglet Savoirs) */

/* ===== fin Vue d'ensemble ===== */
