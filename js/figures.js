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
FIGURES["emulsion"] = [
  { ou: "tete",
    type: "svg",
    vb: "0 0 320 342",
    titre: "Ce que fait l'émulsifiant",
    legende: "Regardez l'agrandissement : la tête de la molécule reste dans l'eau, sa queue plonge dans le gras. Chaque gouttelette porte ainsi sa pellicule, et deux gouttelettes voisines ne fusionnent pas.",
    alt: "Schéma en deux niveaux. En haut, une coupe de vinaigrette : des gouttelettes d'huile de tailles différentes flottent dans la phase aqueuse, eau et vinaigre. Chaque gouttelette est cernée d'une couronne de petites molécules d'émulsifiant. Un cercle sur l'une d'elles est relié par deux lignes pointillées à un agrandissement en bas. L'agrandissement montre l'interface entre l'eau, au-dessus, et l'huile, en dessous : trois molécules d'émulsifiant sont plantées à la frontière, la tête, qui aime l'eau, dans l'eau, et la queue, qui aime le gras, dans l'huile. Elles forment une pellicule autour de la gouttelette, que la gouttelette voisine ne traverse pas.",
    corps: `<rect class="fg-f-bleu-l fg-t-bleu fg-t-fin" x="8" y="8" width="304" height="168" rx="12"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-bleu" x="18" y="28" text-anchor="start"><tspan x="18">phase aqueuse : eau, vinaigre</tspan></text>
<circle class="fg-f-or-l fg-t-or" cx="78" cy="92" r="36"/>
<path class="fg-t-or fg-t-fin" d="M105.3 98.7L112.4 100.9"/>
<path class="fg-t-or fg-t-fin" d="M104.2 101.9L111.4 104.1"/>
<circle class="fg-f-bleu" cx="115.6" cy="103.6" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M101.9 106.7L108 111.1"/>
<path class="fg-t-or fg-t-fin" d="M99.9 109.5L106 113.8"/>
<circle class="fg-f-bleu" cx="110.2" cy="114.7" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M96.1 113.4L100.6 119.4"/>
<path class="fg-t-or fg-t-fin" d="M93.4 115.4L97.9 121.4"/>
<circle class="fg-f-bleu" cx="101.6" cy="123.5" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M88.6 118L91.1 125.1"/>
<path class="fg-t-or fg-t-fin" d="M85.4 119.1L87.8 126.2"/>
<circle class="fg-f-bleu" cx="90.7" cy="129.3" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M80.1 120L80.2 127.5"/>
<path class="fg-t-or fg-t-fin" d="M76.7 120L76.8 127.5"/>
<circle class="fg-f-bleu" cx="78.6" cy="131.4" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M71.3 119.3L69.1 126.4"/>
<path class="fg-t-or fg-t-fin" d="M68.1 118.2L65.9 125.4"/>
<circle class="fg-f-bleu" cx="66.4" cy="129.6" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M63.3 115.9L58.9 122"/>
<path class="fg-t-or fg-t-fin" d="M60.5 113.9L56.2 120"/>
<circle class="fg-f-bleu" cx="55.3" cy="124.2" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M56.6 110.1L50.6 114.6"/>
<path class="fg-t-or fg-t-fin" d="M54.6 107.4L48.6 111.9"/>
<circle class="fg-f-bleu" cx="46.5" cy="115.6" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M52 102.6L44.9 105.1"/>
<path class="fg-t-or fg-t-fin" d="M50.9 99.4L43.8 101.8"/>
<circle class="fg-f-bleu" cx="40.7" cy="104.7" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M50 94.1L42.5 94.2"/>
<path class="fg-t-or fg-t-fin" d="M50 90.7L42.5 90.8"/>
<circle class="fg-f-bleu" cx="38.6" cy="92.6" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M50.7 85.3L43.6 83.1"/>
<path class="fg-t-or fg-t-fin" d="M51.8 82.1L44.6 79.9"/>
<circle class="fg-f-bleu" cx="40.4" cy="80.4" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M54.1 77.3L48 72.9"/>
<path class="fg-t-or fg-t-fin" d="M56.1 74.5L50 70.2"/>
<circle class="fg-f-bleu" cx="45.8" cy="69.3" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M59.9 70.6L55.4 64.6"/>
<path class="fg-t-or fg-t-fin" d="M62.6 68.6L58.1 62.6"/>
<circle class="fg-f-bleu" cx="54.4" cy="60.5" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M67.4 66L64.9 58.9"/>
<path class="fg-t-or fg-t-fin" d="M70.6 64.9L68.2 57.8"/>
<circle class="fg-f-bleu" cx="65.3" cy="54.7" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M75.9 64L75.8 56.5"/>
<path class="fg-t-or fg-t-fin" d="M79.3 64L79.2 56.5"/>
<circle class="fg-f-bleu" cx="77.4" cy="52.6" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M84.7 64.7L86.9 57.6"/>
<path class="fg-t-or fg-t-fin" d="M87.9 65.8L90.1 58.6"/>
<circle class="fg-f-bleu" cx="89.6" cy="54.4" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M92.7 68.1L97.1 62"/>
<path class="fg-t-or fg-t-fin" d="M95.5 70.1L99.8 64"/>
<circle class="fg-f-bleu" cx="100.7" cy="59.8" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M99.4 73.9L105.4 69.4"/>
<path class="fg-t-or fg-t-fin" d="M101.4 76.6L107.4 72.1"/>
<circle class="fg-f-bleu" cx="109.5" cy="68.4" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M104 81.4L111.1 78.9"/>
<path class="fg-t-or fg-t-fin" d="M105.1 84.6L112.2 82.2"/>
<circle class="fg-f-bleu" cx="115.3" cy="79.3" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M106 89.9L113.5 89.8"/>
<path class="fg-t-or fg-t-fin" d="M106 93.3L113.5 93.2"/>
<circle class="fg-f-bleu" cx="117.4" cy="91.4" r="3.1"/>
<circle class="fg-f-or-l fg-t-or" cx="176" cy="66" r="25"/>
<path class="fg-t-or fg-t-fin" d="M192.7 69.4L199.9 71.6"/>
<path class="fg-t-or fg-t-fin" d="M191.7 72.6L198.9 74.9"/>
<circle class="fg-f-bleu" cx="203.1" cy="74.4" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M189.6 76.3L195.1 81.4"/>
<path class="fg-t-or fg-t-fin" d="M187.3 78.8L192.8 83.9"/>
<circle class="fg-f-bleu" cx="196.8" cy="85.3" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M183.8 81.2L186.5 88.2"/>
<path class="fg-t-or fg-t-fin" d="M180.6 82.4L183.3 89.4"/>
<circle class="fg-f-bleu" cx="186.4" cy="92.4" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M176.4 83.1L175.8 90.6"/>
<path class="fg-t-or fg-t-fin" d="M173 82.8L172.5 90.3"/>
<circle class="fg-f-bleu" cx="173.9" cy="94.3" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M169 81.6L165.2 88.1"/>
<path class="fg-t-or fg-t-fin" d="M166 79.9L162.3 86.4"/>
<circle class="fg-f-bleu" cx="161.8" cy="90.6" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M162.9 77L156.7 81.2"/>
<path class="fg-t-or fg-t-fin" d="M161 74.2L154.8 78.4"/>
<circle class="fg-f-bleu" cx="152.5" cy="82" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M159.4 70.2L152 71.3"/>
<path class="fg-t-or fg-t-fin" d="M158.9 66.8L151.5 68"/>
<circle class="fg-f-bleu" cx="147.9" cy="70.2" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M159.3 62.6L152.1 60.4"/>
<path class="fg-t-or fg-t-fin" d="M160.3 59.4L153.1 57.1"/>
<circle class="fg-f-bleu" cx="148.9" cy="57.6" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M162.4 55.7L156.9 50.6"/>
<path class="fg-t-or fg-t-fin" d="M164.7 53.2L159.2 48.1"/>
<circle class="fg-f-bleu" cx="155.2" cy="46.7" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M168.2 50.8L165.5 43.8"/>
<path class="fg-t-or fg-t-fin" d="M171.4 49.6L168.7 42.6"/>
<circle class="fg-f-bleu" cx="165.6" cy="39.6" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M175.6 48.9L176.2 41.4"/>
<path class="fg-t-or fg-t-fin" d="M179 49.2L179.5 41.7"/>
<circle class="fg-f-bleu" cx="178.1" cy="37.7" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M183 50.4L186.8 43.9"/>
<path class="fg-t-or fg-t-fin" d="M186 52.1L189.7 45.6"/>
<circle class="fg-f-bleu" cx="190.2" cy="41.4" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M189.1 55L195.3 50.8"/>
<path class="fg-t-or fg-t-fin" d="M191 57.8L197.2 53.6"/>
<circle class="fg-f-bleu" cx="199.5" cy="50" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M192.6 61.8L200 60.7"/>
<path class="fg-t-or fg-t-fin" d="M193.1 65.2L200.5 64"/>
<circle class="fg-f-bleu" cx="204.1" cy="61.8" r="3.1"/>
<circle class="fg-f-or-l fg-t-or" cx="266" cy="104" r="31"/>
<path class="fg-t-or fg-t-fin" d="M288.5 109.2L295.6 111.4"/>
<path class="fg-t-or fg-t-fin" d="M287.5 112.4L294.6 114.6"/>
<circle class="fg-f-bleu" cx="298.9" cy="114.2" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M285.1 116.9L291 121.6"/>
<path class="fg-t-or fg-t-fin" d="M283 119.6L288.9 124.3"/>
<circle class="fg-f-bleu" cx="293" cy="125.4" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M279.1 123L282.9 129.4"/>
<path class="fg-t-or fg-t-fin" d="M276.2 124.7L280 131.2"/>
<circle class="fg-f-bleu" cx="283.4" cy="133.7" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M271.4 126.4L272.6 133.8"/>
<path class="fg-t-or fg-t-fin" d="M268 127L269.2 134.4"/>
<circle class="fg-f-bleu" cx="271.5" cy="137.9" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M262.9 126.9L261.4 134.2"/>
<path class="fg-t-or fg-t-fin" d="M259.6 126.2L258.1 133.5"/>
<circle class="fg-f-bleu" cx="258.9" cy="137.7" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M254.9 124.2L250.8 130.5"/>
<path class="fg-t-or fg-t-fin" d="M252 122.3L247.9 128.6"/>
<circle class="fg-f-bleu" cx="247.2" cy="132.8" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M248.3 118.8L242.2 123.2"/>
<path class="fg-t-or fg-t-fin" d="M246.3 116.1L240.3 120.4"/>
<circle class="fg-f-bleu" cx="238.1" cy="124.1" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M244.2 111.4L236.9 113.3"/>
<path class="fg-t-or fg-t-fin" d="M243.3 108.1L236.1 110"/>
<circle class="fg-f-bleu" cx="232.7" cy="112.7" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M243 103L235.5 102.2"/>
<path class="fg-t-or fg-t-fin" d="M243.3 99.7L235.9 98.8"/>
<circle class="fg-f-bleu" cx="231.8" cy="100" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M244.9 94.8L238.2 91.3"/>
<path class="fg-t-or fg-t-fin" d="M246.4 91.8L239.8 88.3"/>
<circle class="fg-f-bleu" cx="235.6" cy="88" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M249.6 87.8L244.7 82.1"/>
<path class="fg-t-or fg-t-fin" d="M252.2 85.5L247.3 79.9"/>
<circle class="fg-f-bleu" cx="243.4" cy="78.1" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M256.6 82.9L254 75.9"/>
<path class="fg-t-or fg-t-fin" d="M259.8 81.8L257.2 74.7"/>
<circle class="fg-f-bleu" cx="254.3" cy="71.6" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M264.8 81L265 73.5"/>
<path class="fg-t-or fg-t-fin" d="M268.2 81L268.4 73.5"/>
<circle class="fg-f-bleu" cx="266.8" cy="69.6" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M273.2 82.1L276.1 75.2"/>
<path class="fg-t-or fg-t-fin" d="M276.4 83.4L279.2 76.5"/>
<circle class="fg-f-bleu" cx="279.2" cy="72.2" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M280.6 86.2L285.8 80.8"/>
<path class="fg-t-or fg-t-fin" d="M283.1 88.5L288.3 83.1"/>
<circle class="fg-f-bleu" cx="289.7" cy="79.1" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M286.1 92.7L292.9 89.5"/>
<path class="fg-t-or fg-t-fin" d="M287.5 95.8L294.3 92.6"/>
<circle class="fg-f-bleu" cx="297.1" cy="89.4" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M288.8 100.7L296.3 100.2"/>
<path class="fg-t-or fg-t-fin" d="M289.1 104.1L296.5 103.6"/>
<circle class="fg-f-bleu" cx="300.3" cy="101.6" r="3.1"/>
<circle class="fg-f-or-l fg-t-or" cx="190" cy="138" r="18"/>
<path class="fg-t-or fg-t-fin" d="M200.1 139.3L207.2 141.5"/>
<path class="fg-t-or fg-t-fin" d="M199.1 142.6L206.2 144.8"/>
<circle class="fg-f-bleu" cx="210.4" cy="144.3" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M197.4 145L201.8 151"/>
<path class="fg-t-or fg-t-fin" d="M194.6 147L199.1 153"/>
<circle class="fg-f-bleu" cx="202.8" cy="155.1" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M191.8 148L191.9 155.5"/>
<path class="fg-t-or fg-t-fin" d="M188.4 148L188.5 155.5"/>
<circle class="fg-f-bleu" cx="190.3" cy="159.4" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M185.6 147.2L181.3 153.3"/>
<path class="fg-t-or fg-t-fin" d="M182.8 145.2L178.5 151.3"/>
<circle class="fg-f-bleu" cx="177.7" cy="155.5" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M181.1 142.8L174 145.3"/>
<path class="fg-t-or fg-t-fin" d="M180 139.6L172.9 142"/>
<circle class="fg-f-bleu" cx="169.7" cy="144.9" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M179.9 136.7L172.8 134.5"/>
<path class="fg-t-or fg-t-fin" d="M180.9 133.4L173.8 131.2"/>
<circle class="fg-f-bleu" cx="169.6" cy="131.7" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M182.6 131L178.2 125"/>
<path class="fg-t-or fg-t-fin" d="M185.4 129L180.9 123"/>
<circle class="fg-f-bleu" cx="177.2" cy="120.9" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M188.2 128L188.1 120.5"/>
<path class="fg-t-or fg-t-fin" d="M191.6 128L191.5 120.5"/>
<circle class="fg-f-bleu" cx="189.7" cy="116.6" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M194.4 128.8L198.7 122.7"/>
<path class="fg-t-or fg-t-fin" d="M197.2 130.8L201.5 124.7"/>
<circle class="fg-f-bleu" cx="202.3" cy="120.5" r="3.1"/>
<path class="fg-t-or fg-t-fin" d="M198.9 133.2L206 130.7"/>
<path class="fg-t-or fg-t-fin" d="M200 136.4L207.1 134"/>
<circle class="fg-f-bleu" cx="210.3" cy="131.1" r="3.1"/>
<text class="fg-txt fg-txt-b fg-txt-or" x="78" y="96" text-anchor="middle">huile</text>
<circle class="fg-t-encre fg-t-fin" cx="104" cy="121" r="9"/>
<path class="fg-t-axe fg-t-fin fg-pointilles" d="M97 128L40 192M110 129L150 192"/>
<rect class="fg-f-carte fg-t-encre fg-t-fin" x="8" y="192" width="304" height="140" rx="12"/>
<path class="fg-f-bleu-l" d="M9 204a11 11 0 0 1 11 -11h280a11 11 0 0 1 11 11V238H9Z"/>
<path class="fg-f-or-l" d="M9 238H311V320a11 11 0 0 1 -11 11H20a11 11 0 0 1 -11 -11Z"/>
<path class="fg-t-encre fg-t-fin" d="M9 238H311"/>
<text class="fg-txt fg-txt-s fg-txt-b" x="18" y="210" text-anchor="start"><tspan x="18">L'interface, très agrandie</tspan></text>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-or" x="18" y="262" text-anchor="start"><tspan x="18">huile</tspan></text>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-bleu" x="18" y="230" text-anchor="start"><tspan x="18">eau</tspan></text>
<circle class="fg-f-bleu" cx="58" cy="225" r="8"/>
<path class="fg-t-or fg-t-epais" d="M55 233q-3 8 0 16t0 14"/>
<path class="fg-t-or fg-t-epais" d="M61 233q3 8 0 16t0 14"/>
<circle class="fg-f-bleu" cx="100" cy="225" r="8"/>
<path class="fg-t-or fg-t-epais" d="M97 233q-3 8 0 16t0 14"/>
<path class="fg-t-or fg-t-epais" d="M103 233q3 8 0 16t0 14"/>
<circle class="fg-f-bleu" cx="142" cy="225" r="8"/>
<path class="fg-t-or fg-t-epais" d="M139 233q-3 8 0 16t0 14"/>
<path class="fg-t-or fg-t-epais" d="M145 233q3 8 0 16t0 14"/>
<path class="fg-t-bleu fg-t-fin" d="M190 223L162 223" marker-end="url(#fg-fl-bleu)"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-bleu" x="196" y="227" text-anchor="start"><tspan x="196">tête : aime l'eau</tspan></text>
<path class="fg-t-or fg-t-fin" d="M190 257L156 257" marker-end="url(#fg-fl-or)"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-or" x="196" y="261" text-anchor="start"><tspan x="196">queue : aime le gras</tspan></text>
<text class="fg-txt fg-txt-s" x="160" y="306" text-anchor="middle"><tspan x="160">Une pellicule enveloppe chaque gouttelette : sa</tspan><tspan x="160" dy="13.5">voisine ne la traverse pas.</tspan></text>` },

  { ou: "pourquoi",
    apres: 1,
    type: "courbe",
    qualitative: true,
    titre: "Une émulsion est retardée, jamais éternelle",
    legende: "Allure qualitative : sans émulsifiant, les gouttelettes fusionnent vite ; avec lui, la séparation est freinée longtemps, sans jamais être exclue.",
    alt: "Courbe qualitative, sans valeurs chiffrées. L'axe horizontal est le temps, depuis l'instant du fouet jusqu'à bien plus tard ; l'axe vertical est la part de l'huile restée dispersée en fines gouttelettes. Sans émulsifiant, la courbe terracotta s'effondre presque aussitôt. Avec un émulsifiant, la courbe verte reste haute longtemps puis décline lentement : l'émulsion n'est jamais stable au sens strict, elle est retardée.",
    x: { label: "Temps",
      extremites: ["à l'instant du fouet", "bien plus tard"] },
    y: { label: "Huile restée en fines gouttelettes" },
    series: [
      { nom: "Sans émulsifiant",
        ton: "terra",
        points: [[0, 1], [5, 0.55], [14, 0.2], [30, 0.06], [100, 0.02]] },
      { nom: "Avec un émulsifiant",
        ton: "vert",
        points: [[0, 1], [35, 0.97], [60, 0.86], [80, 0.6], [100, 0.28]] }
    ],
    notes: [
      { x: 80, y: 0.6, texte: "retardée, pas arrêtée", dx: -30, dy: 54, largeur: 130, ancre: "middle", ton: "vert" }
    ] },

  { ou: "cas",
    type: "comparaison",
    titre: "Le débit de l'huile",
    legende: "Versée en filet, l'huile se disperse en gouttelettes assez fines pour que l'émulsifiant les couvre. Versée d'un trait, elle les dépasse : elles fusionnent et la sauce tranche.",
    alt: "Trois bols en coupe, côte à côte. À gauche, l'huile versée en filet : de nombreuses petites gouttelettes d'huile, toutes bien cernées d'une pellicule verte, dans la phase aqueuse. Au milieu, l'huile versée d'un trait : quelques grosses gouttelettes aux contours en pointillé, mal couvertes, qui fusionnent. À droite, la sauce tranchée : une couche d'huile se sépare au-dessus de la phase aqueuse.",
    panneaux: [
      { label: "En filet",
        sous: "fines gouttelettes, bien couvertes",
        ton: "vert",
        vb: "0 0 100 70",
        corps: `<rect class="fg-f-bleu-l fg-t-bleu" x="6" y="4" width="88" height="62" rx="9"/>
<circle class="fg-f-or-l fg-t-vert" cx="20" cy="16" r="5.2"/>
<circle class="fg-f-or-l fg-t-vert" cx="38" cy="14" r="5.2"/>
<circle class="fg-f-or-l fg-t-vert" cx="57" cy="17" r="5.2"/>
<circle class="fg-f-or-l fg-t-vert" cx="76" cy="15" r="5.2"/>
<circle class="fg-f-or-l fg-t-vert" cx="28" cy="30" r="5.2"/>
<circle class="fg-f-or-l fg-t-vert" cx="47" cy="29" r="5.2"/>
<circle class="fg-f-or-l fg-t-vert" cx="66" cy="31" r="5.2"/>
<circle class="fg-f-or-l fg-t-vert" cx="84" cy="29" r="5.2"/>
<circle class="fg-f-or-l fg-t-vert" cx="18" cy="45" r="5.2"/>
<circle class="fg-f-or-l fg-t-vert" cx="37" cy="44" r="5.2"/>
<circle class="fg-f-or-l fg-t-vert" cx="56" cy="46" r="5.2"/>
<circle class="fg-f-or-l fg-t-vert" cx="75" cy="44" r="5.2"/>
<circle class="fg-f-or-l fg-t-vert" cx="27" cy="58" r="5.2"/>
<circle class="fg-f-or-l fg-t-vert" cx="47" cy="58" r="5.2"/>
<circle class="fg-f-or-l fg-t-vert" cx="66" cy="58" r="5.2"/>
<circle class="fg-f-or-l fg-t-vert" cx="84" cy="57" r="5.2"/>` },
      { label: "D'un trait",
        sous: "grosses, mal couvertes : elles fusionnent",
        ton: "terra",
        vb: "0 0 100 70",
        corps: `<rect class="fg-f-bleu-l fg-t-bleu" x="6" y="4" width="88" height="62" rx="9"/>
<path class="fg-f-or-l fg-t-terra fg-tirets" d="M18 26a14 14 0 0 1 24 -8a13 13 0 0 1 17 3a12 12 0 0 1 15 12a13 13 0 0 1 -14 16a13 13 0 0 1 -17 -2a13 13 0 0 1 -20 -3a13 13 0 0 1 -5 -18Z"/>
<circle class="fg-f-or-l fg-t-terra fg-tirets" cx="66" cy="49" r="9"/>
<circle class="fg-f-or-l fg-t-terra fg-tirets" cx="22" cy="55" r="6"/>` },
      { label: "Tranchée",
        sous: "l'huile se sépare en une couche",
        ton: "or",
        vb: "0 0 100 70",
        corps: `<rect class="fg-f-bleu-l fg-t-bleu" x="6" y="4" width="88" height="62" rx="9"/>
<path class="fg-f-or-l" d="M7 13a9 9 0 0 1 9 -9h68a9 9 0 0 1 9 9V28H7Z"/>
<path class="fg-t-or" d="M7 28H93"/>` }
    ] },

  { ou: "reperes",
    type: "barres",
    titre: "Combien d'huile monte une base ?",
    legende: "Une base seule ne dit pas tout : le jaune plafonne parce que son eau sature, pas parce que ses émulsifiants s'épuisent.",
    alt: "Deux barres horizontales. Une cuillerée à café de moutarde monte sans peine 5 cl d'huile. Un jaune d'œuf seul en monte environ 20 cl, quatre fois plus. Sous la barre du jaune, une note : c'est son eau qui limite, pas son pouvoir émulsifiant ; en ajoutant de l'eau au fil de l'huile, il en tient bien davantage.",
    unite: "cl",
    barres: [
      { label: "Une cuillerée à café de moutarde", valeur: 5, texte: "5 cl", ton: "vert" },
      { label: "Un jaune d'œuf seul",
        valeur: 20,
        texte: "environ 20 cl",
        ton: "or",
        note: "Son eau sature : ajoutez de l'eau ou du vinaigre au fil de l'huile, et il en tient bien davantage." }
    ] }
];

FIGURES["gluten"] = [
  { ou: "tete",
    type: "svg",
    vb: "0 0 320 350",
    titre: "Comment se forme le réseau",
    legende: "Sèches, les deux protéines n'ont aucun lien. L'eau les déplie et les rend liantes ; le pétrissage les aligne et multiplie les liaisons, jusqu'à un réseau qui retient le gaz.",
    alt: "Schéma en trois cases, de haut en bas, reliées par des flèches. Première case, la farine sèche : des gluténines, longues chaînes enroulées, qui donnent l'élasticité, et des gliadines, petites billes vertes, éparpillées sans aucun lien ; sèches, les protéines ne font rien. Deuxième case, l'eau les déplie : des gouttes d'eau bleues se mêlent aux chaînes, qui se déroulent et deviennent liantes. Troisième case, le pétrissage les aligne : les chaînes sont parallèles, reliées entre elles par de petits traits, des ponts disulfure, avec des gliadines qui glissent entre elles ; à droite, le réseau enveloppe une bulle de gaz.",
    corps: `<rect class="fg-f-papier fg-t-doux" x="8" y="8" width="304" height="98" rx="10"/>
<circle class="fg-f-vert fg-pt" cx="26" cy="27" r="9"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-sur" x="26" y="31" text-anchor="middle">1</text>
<text class="fg-txt fg-txt-b" x="42" y="32">Farine sèche</text>
<text class="fg-txt fg-txt-s" x="42" y="47">sèches, elles ne font rien</text>
<path class="fg-t-axe" d="M160 108L160 126" marker-end="url(#fg-fl-encre)"/>
<rect class="fg-f-papier fg-t-doux" x="8" y="126" width="304" height="98" rx="10"/>
<circle class="fg-f-vert fg-pt" cx="26" cy="145" r="9"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-sur" x="26" y="149" text-anchor="middle">2</text>
<text class="fg-txt fg-txt-b" x="42" y="150">L'eau les déplie</text>
<text class="fg-txt fg-txt-s" x="42" y="165">elles deviennent liantes</text>
<path class="fg-t-axe" d="M160 226L160 244" marker-end="url(#fg-fl-encre)"/>
<rect class="fg-f-papier fg-t-doux" x="8" y="244" width="304" height="98" rx="10"/>
<circle class="fg-f-vert fg-pt" cx="26" cy="263" r="9"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-sur" x="26" y="267" text-anchor="middle">3</text>
<text class="fg-txt fg-txt-b" x="42" y="268">Le pétrissage les aligne</text>
<text class="fg-txt fg-txt-s" x="42" y="283">les liaisons se multiplient</text>
<path class="fg-t-terra fg-t-epais" d="M24 68q1.8 9.2 3.5 0q1.8 -9.2 3.5 0q1.8 9.2 3.5 0q1.8 -9.2 3.5 0q1.8 9.2 3.5 0q1.8 -9.2 3.5 0q1.8 9.2 3.5 0q1.8 -9.2 3.5 0q1.8 9.2 3.5 0q1.8 -9.2 3.5 0q0.5 9.2 1 0" transform="rotate(12 24 68)"/>
<path class="fg-t-terra fg-t-epais" d="M88 88q1.8 9.2 3.5 0q1.8 -9.2 3.5 0q1.8 9.2 3.5 0q1.8 -9.2 3.5 0q1.8 9.2 3.5 0q1.8 -9.2 3.5 0q1.8 9.2 3.5 0q1.8 -9.2 3.5 0q1.8 9.2 3.5 0q1.8 -9.2 3.5 0q0.5 9.2 1 0" transform="rotate(-14 88 88)"/>
<path class="fg-t-terra fg-t-epais" d="M136 66q1.8 -9.2 3.5 0q1.8 9.2 3.5 0q1.8 -9.2 3.5 0q1.8 9.2 3.5 0q1.8 -9.2 3.5 0q1.8 9.2 3.5 0q1.8 -9.2 3.5 0q1.8 9.2 3.5 0q1.8 -9.2 3.5 0q1.3 9.2 2.5 0" transform="rotate(8 136 66)"/>
<circle class="fg-f-vert fg-pt" cx="78" cy="66" r="4.6"/>
<circle class="fg-f-vert fg-pt" cx="124" cy="86" r="4.6"/>
<circle class="fg-f-vert fg-pt" cx="62" cy="90" r="4.6"/>
<circle class="fg-f-vert fg-pt" cx="172" cy="86" r="4.6"/>
<circle class="fg-f-vert fg-pt" cx="112" cy="72" r="4.6"/>
<circle class="fg-f-vert fg-pt" cx="38" cy="88" r="4.6"/>
<circle class="fg-f-vert fg-pt" cx="166" cy="64" r="4.6"/>
<path class="fg-t-doux fg-t-fin" d="M200 22L200 96"/>
<path class="fg-t-terra fg-t-epais" d="M210 33q1.5 7.2 3 0q1.5 -7.2 3 0q1.5 7.2 3 0q1.5 -7.2 3 0q1.5 7.2 3 0q1.5 -7.2 3 0q1.5 7.2 3 0q1.5 -7.2 3 0q1 7.2 2 0"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-terra" x="242" y="37">gluténines</text>
<text class="fg-txt fg-txt-s" x="210" y="51">l'élasticité</text>
<circle class="fg-f-vert fg-pt" cx="214" cy="68" r="4.6"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-vert" x="224" y="72">gliadines</text>
<text class="fg-txt fg-txt-s" x="210" y="86" text-anchor="start"><tspan x="210">glissent :</tspan><tspan x="210" dy="13.5">l'extensibilité</tspan></text>
<path class="fg-t-terra fg-t-epais" d="M22 182q4.5 10 9 0q4.5 -10 9 0q4.5 10 9 0q4.5 -10 9 0q4.5 10 9 0q4.5 -10 9 0q2 10 4 0" transform="rotate(6 22 182)"/>
<path class="fg-t-terra fg-t-epais" d="M100 202q5 -11 10 0q5 11 10 0q5 -11 10 0q5 11 10 0q5 -11 10 0q5 11 10 0q1 -11 2 0" transform="rotate(-10 100 202)"/>
<path class="fg-t-terra fg-t-epais" d="M188 182q4.5 10 9 0q4.5 -10 9 0q4.5 10 9 0q4.5 -10 9 0q4.5 10 9 0q4.5 -10 9 0q3 10 6 0" transform="rotate(14 188 182)"/>
<path class="fg-t-terra fg-t-epais" d="M40 210q4.3 -10 8.5 0q4.3 10 8.5 0q4.3 -10 8.5 0q4.3 10 8.5 0q4.3 -10 8.5 0q4.3 10 8.5 0q0.5 -10 1 0" transform="rotate(-4 40 210)"/>
<path class="fg-t-terra fg-t-epais" d="M218 208q5 10 10 0q5 -10 10 0q5 10 10 0q5 -10 10 0q5 10 10 0q5 -10 10 0q5 10 10 0" transform="rotate(-6 218 208)"/>
<circle class="fg-f-vert fg-pt" cx="86" cy="184" r="4.6"/>
<circle class="fg-f-vert fg-pt" cx="166" cy="188" r="4.6"/>
<circle class="fg-f-vert fg-pt" cx="150" cy="210" r="4.6"/>
<circle class="fg-f-vert fg-pt" cx="24" cy="198" r="4.6"/>
<circle class="fg-f-vert fg-pt" cx="288" cy="192" r="4.6"/>
<circle class="fg-f-bleu-l fg-t-bleu fg-t-fin" cx="60" cy="182" r="3.8"/>
<circle class="fg-f-bleu-l fg-t-bleu fg-t-fin" cx="120" cy="180" r="3.8"/>
<circle class="fg-f-bleu-l fg-t-bleu fg-t-fin" cx="92" cy="216" r="3.8"/>
<circle class="fg-f-bleu-l fg-t-bleu fg-t-fin" cx="140" cy="200" r="3.8"/>
<circle class="fg-f-bleu-l fg-t-bleu fg-t-fin" cx="200" cy="192" r="3.8"/>
<circle class="fg-f-bleu-l fg-t-bleu fg-t-fin" cx="250" cy="182" r="3.8"/>
<circle class="fg-f-bleu-l fg-t-bleu fg-t-fin" cx="290" cy="210" r="3.8"/>
<circle class="fg-f-bleu-l fg-t-bleu fg-t-fin" cx="176" cy="216" r="3.8"/>
<circle class="fg-f-bleu-l fg-t-bleu fg-t-fin" cx="44" cy="218" r="3.8"/>
<circle class="fg-f-bleu-l fg-t-bleu fg-t-fin" cx="270" cy="198" r="3.8"/>
<circle class="fg-f-bleu-l fg-t-bleu fg-t-fin" cx="236" cy="218" r="3.8"/>
<path class="fg-t-terra fg-t-epais" d="M24 291q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q2 4.8 4 0"/>
<path class="fg-t-terra fg-t-epais" d="M24 305q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q2 -4.8 4 0"/>
<path class="fg-t-terra fg-t-epais" d="M24 319q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q2 4.8 4 0"/>
<path class="fg-t-terra fg-t-epais" d="M24 333q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q2 -4.8 4 0"/>
<path class="fg-t-encre fg-t-fin" d="M58 320L58 332"/>
<path class="fg-t-encre fg-t-fin" d="M96 292L96 304"/>
<path class="fg-t-encre fg-t-fin" d="M134 306L134 318"/>
<path class="fg-t-encre fg-t-fin" d="M172 320L172 332"/>
<path class="fg-t-encre fg-t-fin" d="M210 292L210 304"/>
<circle class="fg-f-vert fg-pt" cx="76" cy="298" r="4.6"/>
<circle class="fg-f-vert fg-pt" cx="118" cy="326" r="4.6"/>
<circle class="fg-f-vert fg-pt" cx="156" cy="312" r="4.6"/>
<circle class="fg-f-vert fg-pt" cx="190" cy="326" r="4.6"/>
<path class="fg-t-terra fg-t-epais" d="M226 291Q296 276 296 312Q296 348 226 333"/>
<circle class="fg-f-carte fg-t-doux" cx="262" cy="312" r="17"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-doux" x="262" y="316" text-anchor="middle">gaz</text>
<text class="fg-txt-script fg-txt-doux" x="302" y="268" text-anchor="end">ponts disulfure</text>
<path class="fg-t-axe fg-t-fin" d="M240 274Q214 282 211 287" marker-end="url(#fg-fl-encre)"/>` },

  { ou: "pourquoi",
    apres: 2,
    type: "etapes",
    titre: "Travailler, puis laisser reposer",
    legende: "Une pâte fraîchement travaillée est sous tension et se rétracte ; dix à vingt minutes de repos suffisent le plus souvent à la détendre.",
    alt: "Trois étapes reliées par des flèches. Un : pétrir, ou faire des rabats ; les chaînes de protéines s'alignent et la pâte est sous tension. Deux : laisser reposer dix à vingt minutes ; les liaisons se réorganisent. Trois : la pâte détendue, qui s'étire sans se rétracter ni se déchirer.",
    etapes: [
      { libelle: "Pétrir", desc: "ou faire des rabats : pâte sous tension", emoji: "🤲", ton: "terra" },
      { libelle: "Reposer", desc: "10 à 20 min : les liaisons se réorganisent", emoji: "⏳", ton: "bleu" },
      { libelle: "Détendue", desc: "elle s'étire sans se rétracter", emoji: "🥖", ton: "vert" }
    ] },

  { ou: "cas",
    type: "comparaison",
    titre: "Du réseau, ou presque pas",
    legende: "Un pain veut un réseau fort, qui retient les gaz et dessine des alvéoles. Un cookie ou un beignet n'en veut pas : on mélange le minimum.",
    alt: "Deux coupes côte à côte. À gauche, un pain ou une focaccia : une mie dorée percée de grandes alvéoles claires, signe d'un réseau de gluten bien développé. À droite, un cookie ou un beignet : une pâte serrée, presque sans alvéoles, parsemée de morceaux de chocolat, mélangée au minimum.",
    panneaux: [
      { label: "Pain, focaccia",
        sous: "pétrissage ou rabats : un réseau qui retient les gaz",
        ton: "terra",
        vb: "0 0 120 80",
        corps: `<path class="fg-f-or-l fg-t-terra fg-t-epais" d="M12 40Q12 8 60 8Q108 8 108 40Q108 72 60 72Q12 72 12 40Z"/>
<ellipse class="fg-f-carte" cx="34" cy="30" rx="8" ry="6"/>
<ellipse class="fg-f-carte" cx="58" cy="24" rx="10" ry="7"/>
<ellipse class="fg-f-carte" cx="82" cy="32" rx="9" ry="7"/>
<ellipse class="fg-f-carte" cx="46" cy="46" rx="11" ry="8"/>
<ellipse class="fg-f-carte" cx="74" cy="52" rx="8" ry="6"/>
<ellipse class="fg-f-carte" cx="92" cy="48" rx="6" ry="5"/>
<ellipse class="fg-f-carte" cx="28" cy="54" rx="6" ry="5"/>
<ellipse class="fg-f-carte" cx="62" cy="62" rx="6" ry="4"/>` },
      { label: "Cookie, beignet",
        sous: "le minimum de mélange : le gras enrobe la farine",
        ton: "or",
        vb: "0 0 120 80",
        corps: `<path class="fg-f-or-l fg-t-or fg-t-epais" d="M12 40Q12 10 60 10Q108 10 108 40Q108 70 60 70Q12 70 12 40Z"/>
<circle class="fg-f-terra" cx="34" cy="32" r="4.2"/>
<circle class="fg-f-terra" cx="62" cy="26" r="4.2"/>
<circle class="fg-f-terra" cx="86" cy="36" r="4.2"/>
<circle class="fg-f-terra" cx="44" cy="52" r="4.2"/>
<circle class="fg-f-terra" cx="76" cy="56" r="4.2"/>
<circle class="fg-f-carte" cx="48" cy="38" r="1.6"/>
<circle class="fg-f-carte" cx="70" cy="44" r="1.6"/>
<circle class="fg-f-carte" cx="28" cy="46" r="1.6"/>
<circle class="fg-f-carte" cx="92" cy="52" r="1.6"/>
<circle class="fg-f-carte" cx="58" cy="62" r="1.6"/>
<circle class="fg-f-carte" cx="84" cy="22" r="1.6"/>` }
    ] },

  { ou: "reperes",
    type: "echelle",
    titre: "Quel taux de protéines pour quelle pâte ?",
    legende: "Lisez le taux de protéines sur le paquet, pas le chiffre T : celui-ci mesure le taux de cendres.",
    alt: "Règle graduée de 8 à 14 pour cent de protéines dans la farine. De 9 à 10 pour cent : farine pour un gâteau tendre. De 11 à 13 pour cent : farine pour un pain ou une focaccia. Un rappel : le chiffre T de la farine mesure son taux de cendres, pas ses protéines.",
    min: 8,
    max: 14,
    unite: "%",
    label: "Protéines de la farine",
    graduations: [9, 10, 11, 13],
    zones: [
      { de: 9, a: 10, label: "gâteau tendre", ton: "or" },
      { de: 11, a: 13, label: "pain, focaccia", ton: "terra" }
    ] }
];

FIGURES["amidon"] = [
  { ou: "tete",
    type: "svg",
    vb: "0 0 320 360",
    titre: "La vie d'un granule d'amidon",
    legende: "Trois temps : le granule intact, la gélatinisation qui le gonfle et libère l'amylose, puis la rétrogradation qui la réassocie en refroidissant.",
    alt: "Schéma en trois cases, de haut en bas. Première case, à froid : un granule ovale, aux couches concentriques semi-cristallines, intact et insoluble, qui sédimente ; il empile deux polymères de glucose, l'amylose, droite, et l'amylopectine, ramifiée. Une flèche, gélatinisation, mène à la deuxième case, chauffé : le granule est plus gros, sa structure cristalline s'est défaite, l'eau y entre, plusieurs fois son poids, et des filaments d'amylose s'en échappent ; s'il cuit trop ou est trop remué, il éclate. Une flèche, rétrogradation, mène à la troisième case, refroidi : l'amylose libérée se réassocie en doubles hélices, deux brins entrelacés, et recristallise. La sauce fige, le pain rassit.",
    corps: `<rect class="fg-f-papier fg-t-doux" x="8" y="8" width="304" height="100" rx="10"/>
<text class="fg-txt fg-txt-b" x="112" y="32">À froid</text>
<text class="fg-txt fg-txt-s" x="112" y="49" text-anchor="start"><tspan x="112">Intact et insoluble, il sédimente. Il</tspan><tspan x="112" dy="13.5">empile deux polymères de</tspan><tspan x="112" dy="13.5">glucose : l'amylose, droite, et</tspan><tspan x="112" dy="13.5">l'amylopectine, ramifiée.</tspan></text>
<rect class="fg-f-papier fg-t-doux" x="8" y="136" width="304" height="100" rx="10"/>
<text class="fg-txt fg-txt-b" x="112" y="160">Chauffé : il gonfle</text>
<text class="fg-txt fg-txt-s" x="112" y="177" text-anchor="start"><tspan x="112">Au seuil, le cristal se défait ; le</tspan><tspan x="112" dy="13.5">granule absorbe plusieurs fois son</tspan><tspan x="112" dy="13.5">poids d'eau et l'amylose s'échappe.</tspan><tspan x="112" dy="13.5">Trop cuit ou remué, il éclate.</tspan></text>
<rect class="fg-f-papier fg-t-doux" x="8" y="264" width="304" height="88" rx="10"/>
<text class="fg-txt fg-txt-b" x="112" y="288">Refroidi : il se referme</text>
<text class="fg-txt fg-txt-s" x="112" y="305" text-anchor="start"><tspan x="112">L'amylose libérée se réassocie en</tspan><tspan x="112" dy="13.5">doubles hélices et recristallise : la</tspan><tspan x="112" dy="13.5">sauce fige, le pain rassit.</tspan></text>
<ellipse class="fg-f-or-l fg-t-or fg-t-epais" cx="58" cy="58" rx="30" ry="24"/>
<ellipse class="fg-t-or fg-t-fin" cx="56" cy="59" rx="22" ry="17"/>
<ellipse class="fg-t-or fg-t-fin" cx="56" cy="59" rx="14" ry="11"/>
<ellipse class="fg-t-or fg-t-fin" cx="56" cy="59" rx="6" ry="5"/>
<circle class="fg-f-or" cx="56" cy="59" r="2.2"/>
<circle class="fg-f-bleu" cx="18" cy="30" r="2.2"/>
<circle class="fg-f-bleu" cx="92" cy="82" r="2.2"/>
<circle class="fg-f-bleu" cx="96" cy="32" r="2.2"/>
<circle class="fg-f-bleu" cx="20" cy="88" r="2.2"/>
<circle class="fg-f-or-l fg-t-or fg-t-epais" cx="46" cy="186" r="30"/>
<circle class="fg-t-or fg-t-fin fg-tirets" cx="46" cy="186" r="20"/>
<path class="fg-t-bleu fg-t-fin" d="M12 150L22 162" marker-end="url(#fg-fl-bleu)"/>
<path class="fg-t-bleu fg-t-fin" d="M10 186L20 186" marker-end="url(#fg-fl-bleu)"/>
<path class="fg-t-bleu fg-t-fin" d="M12 222L22 210" marker-end="url(#fg-fl-bleu)"/>
<path class="fg-t-terra fg-t-epais" d="M70 170q2.5 6.8 5 0q2.5 -6.8 5 0q2.5 6.8 5 0q2.5 -6.8 5 0q2 6.8 4 0" transform="rotate(-24 70 170)"/>
<path class="fg-t-terra fg-t-epais" d="M76 188q2.5 -6.8 5 0q2.5 6.8 5 0q2.5 -6.8 5 0q2.5 6.8 5 0q2.5 -6.8 5 0q1.5 6.8 3 0" transform="rotate(2 76 188)"/>
<path class="fg-t-terra fg-t-epais" d="M68 206q2.5 6.8 5 0q2.5 -6.8 5 0q2.5 6.8 5 0q2.5 -6.8 5 0q2.5 6.8 5 0q0.5 -6.8 1 0" transform="rotate(26 68 206)"/>
<path class="fg-t-terra fg-t-epais" d="M20 287q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3 8.8 6 0"/>
<path class="fg-t-or fg-t-epais" d="M20 287q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3 -8.8 6 0"/>
<path class="fg-t-terra fg-t-epais" d="M22 305q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3 8.8 6 0"/>
<path class="fg-t-or fg-t-epais" d="M22 305q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3 -8.8 6 0"/>
<path class="fg-t-terra fg-t-epais" d="M24 323q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3 8.8 6 0"/>
<path class="fg-t-or fg-t-epais" d="M24 323q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3.5 -8.8 7 0q3.5 8.8 7 0q3 -8.8 6 0"/>
<path class="fg-t-axe" d="M58 111L58 133" marker-end="url(#fg-fl-encre)"/>
<text class="fg-txt-script fg-txt-terra" x="72" y="128">gélatinisation</text>
<path class="fg-t-axe" d="M58 239L58 261" marker-end="url(#fg-fl-encre)"/>
<text class="fg-txt-script fg-txt-bleu" x="72" y="256">rétrogradation</text>` },

  { ou: "pourquoi",
    apres: 2,
    type: "courbe",
    qualitative: true,
    titre: "L'épaisseur d'une sauce liée",
    legende: "Allure qualitative : la sauce épaissit quand les granules gonflent, puis redevient liquide si la cuisson dure ou si on remue trop et qu'ils éclatent. Le seuil dépend de l'amidon (voir les repères).",
    alt: "Courbe qualitative, sans valeurs chiffrées. L'axe horizontal va de l'amidon à froid jusqu'à un amidon trop cuit ou trop remué ; l'axe vertical est la viscosité de la sauce. À froid, les granules sont intacts et la viscosité reste presque nulle. Pendant la gélatinisation, les granules gonflent et la viscosité monte jusqu'à un maximum. Ensuite, les granules gonflés éclatent et la viscosité s'effondre.",
    x: { label: "Chaleur et agitation",
      extremites: ["à froid", "trop cuit, trop remué"] },
    y: { label: "Viscosité de la sauce" },
    series: [
      { nom: "Viscosité",
        ton: "terra",
        aire: true,
        points: [[0, 0.03], [20, 0.05], [34, 0.3], [48, 0.82], [58, 1], [70, 0.74], [84, 0.36], [100, 0.2]] }
    ],
    zones: [
      { de: 0, a: 26, label: "granules intacts", ton: "bleu" },
      { de: 26, a: 58, label: "gélatinisation", ton: "terra" },
      { de: 66, a: 100, label: "granules éclatés", ton: "or" }
    ],
    notes: [
      { x: 58, y: 1, texte: "granules gonflés : le plus épais", dx: -8, dy: 44, largeur: 120, ancre: "end" }
    ] },

  { ou: "cas",
    type: "comparaison",
    titre: "Tièdes ou froides ?",
    legende: "Illustration qualitative : tièdes, les granules sont encore gonflés et la chair reste ouverte ; froides, l'amylose a rétrogradé et la structure s'est refermée. Le mécanisme est solide, mais ce transfert n'a jamais été mesuré finement.",
    alt: "Deux coupes de pomme de terre côte à côte, chacune surmontée d'une goutte de liquide. À gauche, les pommes de terre tièdes : des granules gonflés, espacés, la chair reste ouverte, et la goutte s'y enfonce par une flèche. À droite, les pommes de terre froides : des granules plus serrés, reliés par de petites croix d'amylose rétrogradée ; la structure est refermée et la goutte reste dessus.",
    panneaux: [
      { label: "Tièdes",
        sous: "granules gonflés, chair ouverte : elles boivent",
        ton: "vert",
        vb: "0 0 120 80",
        corps: `<rect class="fg-f-papier fg-t-doux fg-t-fin" x="6" y="22" width="108" height="52" rx="8"/>
<circle class="fg-f-or-l fg-t-or" cx="22" cy="46" r="9.5"/>
<circle class="fg-f-or-l fg-t-or" cx="48" cy="40" r="9.5"/>
<circle class="fg-f-or-l fg-t-or" cx="76" cy="48" r="9.5"/>
<circle class="fg-f-or-l fg-t-or" cx="100" cy="40" r="9.5"/>
<circle class="fg-f-or-l fg-t-or" cx="34" cy="62" r="9.5"/>
<circle class="fg-f-or-l fg-t-or" cx="64" cy="62" r="9.5"/>
<circle class="fg-f-or-l fg-t-or" cx="92" cy="62" r="9.5"/>
<path class="fg-t-axe fg-t-fin" d="M24 18q-4 -5 0 -9M60 18q-4 -5 0 -9M96 18q-4 -5 0 -9" opacity="0"/>
<path class="fg-f-bleu" d="M60 3q6 8 0 11q-6 -3 0 -11Z"/>
<path class="fg-t-bleu fg-t-fin" d="M60 15L60 28" marker-end="url(#fg-fl-bleu)"/>` },
      { label: "Froides",
        sous: "amylose rétrogradée, structure refermée",
        ton: "bleu",
        vb: "0 0 120 80",
        corps: `<rect class="fg-f-papier fg-t-doux fg-t-fin" x="6" y="22" width="108" height="52" rx="8"/>
<circle class="fg-f-or-l fg-t-or" cx="28" cy="48" r="9"/>
<circle class="fg-f-or-l fg-t-or" cx="54" cy="42" r="9"/>
<circle class="fg-f-or-l fg-t-or" cx="80" cy="48" r="9"/>
<circle class="fg-f-or-l fg-t-or" cx="100" cy="44" r="9"/>
<circle class="fg-f-or-l fg-t-or" cx="42" cy="62" r="9"/>
<circle class="fg-f-or-l fg-t-or" cx="70" cy="62" r="9"/>
<path class="fg-t-terra fg-t-fin" d="M36 44l8 4m-8 0l8 -4"/>
<path class="fg-t-terra fg-t-fin" d="M62 43l8 4m-8 0l8 -4"/>
<path class="fg-t-terra fg-t-fin" d="M86 44l8 4m-8 0l8 -4"/>
<path class="fg-t-terra fg-t-fin" d="M52 54l8 4m-8 0l8 -4"/>
<path class="fg-t-terra fg-t-fin" d="M80 56l8 4m-8 0l8 -4"/>
<path class="fg-t-terra fg-t-fin" d="M32 55l8 4m-8 0l8 -4"/>
<path class="fg-f-bleu" d="M60 3q6 8 0 11q-6 -3 0 -11Z"/>
<path class="fg-t-bleu fg-t-fin" d="M60 15L60 20"/>
<path class="fg-t-bleu fg-t-fin" d="M48 19L72 19"/>` }
    ] },

  { ou: "reperes",
    type: "svg",
    vb: "0 0 320 242",
    titre: "Les températures de l'amidon",
    legende: "Le seuil de gélatinisation dépend de l'amidon. À l'autre bout, la rétrogradation va le plus vite au froid du réfrigérateur ; au-delà de 60 °C, on refond les cristaux d'un pain rassis.",
    alt: "Quatre barres sur un axe de température en degrés Celsius. La rétrogradation est la plus rapide entre 0 et 4 degrés : le réfrigérateur rassit le pain plus vite que le placard. La gélatinisation de l'amidon de blé se fait entre 52 et 64 degrés ; celle de la pomme de terre, entre 58 et 66 degrés. Enfin, un pain rassis repassé au four au-delà de 60 degrés refond ses cristaux et retrouve sa souplesse, pour quelques heures.",
    corps: `<path class="fg-t-doux fg-t-fin fg-tirets" d="M260 54L260 200"/>
<text class="fg-txt fg-txt-b fg-halo fg-txt-bleu" x="16" y="22" text-anchor="start">Rétrogradation la plus rapide : 0 à 4 °C</text>
<rect class="fg-f-bleu fg-t-bleu fg-t-fin" x="20" y="30" width="16" height="16" rx="3"/>
<text class="fg-txt fg-txt-b fg-halo fg-txt-terra" x="16" y="70" text-anchor="start">Blé : gélatinisation, 52 à 64 °C</text>
<rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="228" y="78" width="48" height="16" rx="3"/>
<text class="fg-txt fg-txt-b fg-halo fg-txt-terra" x="16" y="118" text-anchor="start">Pomme de terre : gélatinisation, 58 à 66 °C</text>
<rect class="fg-f-terra fg-t-terra fg-t-fin" x="252" y="126" width="32" height="16" rx="3"/>
<text class="fg-txt fg-txt-b fg-halo fg-txt-or" x="16" y="166" text-anchor="start">Pain rassis : refondu au-delà de 60 °C</text>
<rect class="fg-f-or-l fg-t-or fg-t-fin" x="260" y="174" width="32" height="16" rx="3"/>
<path class="fg-t-or fg-t-epais" d="M290 182L304 182" marker-end="url(#fg-fl-or)"/>
<path class="fg-t-axe" d="M20 214L304 214" marker-end="url(#fg-fl-encre)"/>
<path class="fg-t-axe" d="M20 214L20 219"/>
<text class="fg-txt fg-txt-s" x="20" y="233" text-anchor="middle">0</text>
<path class="fg-t-axe" d="M260 214L260 219"/>
<text class="fg-txt fg-txt-s" x="260" y="233" text-anchor="middle">60</text>
<text class="fg-txt fg-txt-s fg-txt-b" x="44" y="233" text-anchor="start">température, en °C</text>` }
];

FIGURES["coagulation-oeuf"] = [
  { ou: "tete",
    type: "svg",
    vb: "0 0 320 348",
    titre: "Ce que fait la chaleur à l'œuf",
    legende: "Suivez l'eau (en bleu) : libre dans l'œuf cru, elle est emprisonnée par le réseau quand l'œuf prend, puis chassée quand la maille se resserre trop.",
    alt: "Schéma en quatre cases numérotées. Un, cru : des protéines repliées en pelotes, libres dans l'eau, en bleu. Deux, dépliées : sous l'effet de la chaleur, les protéines se déroulent et exposent des zones, des points dorés, qui s'accrochaient à l'eau. Trois, liées : ces zones s'accrochent entre protéines voisines et forment un réseau qui emprisonne l'eau dans ses mailles ; l'œuf est pris. Quatre, surcuit : la maille se resserre, et l'eau est expulsée en dessous, en une flaque. Le résultat est irréversible.",
    corps: `<rect class="fg-f-carte fg-t-bleu fg-t-fin" x="8" y="8" width="148" height="162" rx="10"/>
<circle class="fg-f-bleu fg-pt" cx="24" cy="25" r="9"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-sur" x="24" y="29" text-anchor="middle">1</text>
<text class="fg-txt fg-txt-b fg-txt-bleu" x="40" y="30">Cru</text>
<text class="fg-txt fg-txt-s" x="18" y="118" text-anchor="start"><tspan x="18">Des protéines repliées</tspan><tspan x="18" dy="13.5">sur elles-mêmes,</tspan><tspan x="18" dy="13.5">libres dans l'eau.</tspan></text>
<rect class="fg-f-carte fg-t-or fg-t-fin" x="164" y="8" width="148" height="162" rx="10"/>
<circle class="fg-f-or fg-pt" cx="180" cy="25" r="9"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-sur" x="180" y="29" text-anchor="middle">2</text>
<text class="fg-txt fg-txt-b fg-txt-or" x="196" y="30">Dépliées</text>
<text class="fg-txt fg-txt-s" x="174" y="118" text-anchor="start"><tspan x="174">La chaleur les déplie :</tspan><tspan x="174" dy="13.5">des zones qui</tspan><tspan x="174" dy="13.5">s'accrochaient à l'eau</tspan><tspan x="174" dy="13.5">s'exposent.</tspan></text>
<rect class="fg-f-carte fg-t-vert fg-t-fin" x="8" y="178" width="148" height="162" rx="10"/>
<circle class="fg-f-vert fg-pt" cx="24" cy="195" r="9"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-sur" x="24" y="199" text-anchor="middle">3</text>
<text class="fg-txt fg-txt-b fg-txt-vert" x="40" y="200">Liées</text>
<text class="fg-txt fg-txt-s" x="18" y="288" text-anchor="start"><tspan x="18">Elles s'accrochent</tspan><tspan x="18" dy="13.5">entre voisines : un</tspan><tspan x="18" dy="13.5">réseau emprisonne</tspan><tspan x="18" dy="13.5">l'eau.</tspan></text>
<rect class="fg-f-carte fg-t-terra fg-t-fin" x="164" y="178" width="148" height="162" rx="10"/>
<circle class="fg-f-terra fg-pt" cx="180" cy="195" r="9"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-sur" x="180" y="199" text-anchor="middle">4</text>
<text class="fg-txt fg-txt-b fg-txt-terra" x="196" y="200">Surcuit</text>
<text class="fg-txt fg-txt-s" x="174" y="288" text-anchor="start"><tspan x="174">La maille se resserre</tspan><tspan x="174" dy="13.5">et expulse l'eau, sans</tspan><tspan x="174" dy="13.5">retour possible.</tspan></text>
<circle class="fg-f-terra-l fg-t-terra" cx="42" cy="56" r="8.5"/>
<path class="fg-t-terra fg-t-fin" d="M38 58C36 51 46 50 46 55C46 59 41 59 41 55"/>
<circle class="fg-f-terra-l fg-t-terra" cx="78" cy="48" r="8.5"/>
<path class="fg-t-terra fg-t-fin" d="M74 50C72 43 82 42 82 47C82 51 77 51 77 47"/>
<circle class="fg-f-terra-l fg-t-terra" cx="114" cy="60" r="8.5"/>
<path class="fg-t-terra fg-t-fin" d="M110 62C108 55 118 54 118 59C118 63 113 63 113 59"/>
<circle class="fg-f-terra-l fg-t-terra" cx="60" cy="78" r="8.5"/>
<path class="fg-t-terra fg-t-fin" d="M56 80C54 73 64 72 64 77C64 81 59 81 59 77"/>
<circle class="fg-f-terra-l fg-t-terra" cx="100" cy="82" r="8.5"/>
<path class="fg-t-terra fg-t-fin" d="M96 84C94 77 104 76 104 81C104 85 99 85 99 81"/>
<circle class="fg-f-terra-l fg-t-terra" cx="132" cy="44" r="8.5"/>
<path class="fg-t-terra fg-t-fin" d="M128 46C126 39 136 38 136 43C136 47 131 47 131 43"/>
<circle class="fg-f-bleu" cx="32" cy="74" r="2"/>
<circle class="fg-f-bleu" cx="92" cy="62" r="2"/>
<circle class="fg-f-bleu" cx="74" cy="94" r="2"/>
<circle class="fg-f-bleu" cx="122" cy="74" r="2"/>
<circle class="fg-f-bleu" cx="48" cy="44" r="2"/>
<circle class="fg-f-bleu" cx="108" cy="42" r="2"/>
<circle class="fg-f-bleu" cx="28" cy="96" r="2"/>
<circle class="fg-f-bleu" cx="138" cy="92" r="2"/>
<path class="fg-t-terra fg-t-epais" d="M178 52q4 10 8 0q4 -10 8 0q4 10 8 0q4 -10 8 0q4 10 8 0q4 -10 8 0q1 10 2 0" transform="rotate(8 178 52)"/>
<path class="fg-t-terra fg-t-epais" d="M234 46q4.3 -10 8.5 0q4.3 10 8.5 0q4.3 -10 8.5 0q4.3 10 8.5 0q4.3 -10 8.5 0q4.3 10 8.5 0q2.5 -10 5 0" transform="rotate(-6 234 46)"/>
<path class="fg-t-terra fg-t-epais" d="M180 80q4.3 10 8.5 0q4.3 -10 8.5 0q4.3 10 8.5 0q4.3 -10 8.5 0q4.3 10 8.5 0q4.3 -10 8.5 0q2.5 10 5 0" transform="rotate(-4 180 80)"/>
<path class="fg-t-terra fg-t-epais" d="M240 84q4 -10 8 0q4 10 8 0q4 -10 8 0q4 10 8 0q4 -10 8 0q4 10 8 0q1 -10 2 0" transform="rotate(6 240 84)"/>
<circle class="fg-f-or fg-pt" cx="194" cy="54" r="2.7"/>
<circle class="fg-f-or fg-pt" cx="222" cy="52" r="2.7"/>
<circle class="fg-f-or fg-pt" cx="256" cy="48" r="2.7"/>
<circle class="fg-f-or fg-pt" cx="284" cy="44" r="2.7"/>
<circle class="fg-f-or fg-pt" cx="198" cy="78" r="2.7"/>
<circle class="fg-f-or fg-pt" cx="230" cy="80" r="2.7"/>
<circle class="fg-f-or fg-pt" cx="260" cy="86" r="2.7"/>
<circle class="fg-f-or fg-pt" cx="284" cy="92" r="2.7"/>
<circle class="fg-f-bleu" cx="182" cy="96" r="2"/>
<circle class="fg-f-bleu" cx="292" cy="68" r="2"/>
<circle class="fg-f-bleu" cx="172" cy="64" r="2"/>
<circle class="fg-f-bleu" cx="300" cy="98" r="2"/>
<circle class="fg-f-bleu" cx="234" cy="64" r="2"/>
<circle class="fg-f-bleu" cx="276" cy="64" r="2"/>
<path class="fg-t-terra fg-t-epais" d="M20 224L48 244L82 226L116 248L146 230"/>
<path class="fg-t-terra fg-t-epais" d="M22 256L50 234L84 258L118 236L146 258"/>
<path class="fg-t-terra fg-t-epais" d="M42 216L66 240L98 222L128 240"/>
<circle class="fg-f-or fg-pt" cx="35" cy="234" r="2.7"/>
<circle class="fg-f-or fg-pt" cx="65" cy="238" r="2.7"/>
<circle class="fg-f-or fg-pt" cx="66" cy="240" r="2.7"/>
<circle class="fg-f-or fg-pt" cx="100" cy="242" r="2.7"/>
<circle class="fg-f-or fg-pt" cx="132" cy="242" r="2.7"/>
<circle class="fg-f-or fg-pt" cx="99" cy="224" r="2.7"/>
<circle class="fg-f-or fg-pt" cx="50" cy="234" r="2.7"/>
<circle class="fg-f-or fg-pt" cx="118" cy="236" r="2.7"/>
<circle class="fg-f-bleu" cx="32" cy="240" r="2"/>
<circle class="fg-f-bleu" cx="60" cy="228" r="2"/>
<circle class="fg-f-bleu" cx="74" cy="248" r="2"/>
<circle class="fg-f-bleu" cx="96" cy="234" r="2"/>
<circle class="fg-f-bleu" cx="108" cy="252" r="2"/>
<circle class="fg-f-bleu" cx="128" cy="224" r="2"/>
<circle class="fg-f-bleu" cx="138" cy="244" r="2"/>
<circle class="fg-f-bleu" cx="82" cy="240" r="2"/>
<circle class="fg-f-bleu" cx="52" cy="254" r="2"/>
<circle class="fg-f-bleu" cx="120" cy="262" r="2"/>
<path class="fg-t-terra fg-t-epais" d="M194 214L212 230L232 216L252 232L272 218"/>
<path class="fg-t-terra fg-t-epais" d="M196 240L214 224L234 240L254 224L274 240"/>
<path class="fg-t-terra fg-t-epais" d="M204 212L222 234L244 220L262 236"/>
<circle class="fg-f-or fg-pt" cx="212" cy="230" r="2.7"/>
<circle class="fg-f-or fg-pt" cx="232" cy="216" r="2.7"/>
<circle class="fg-f-or fg-pt" cx="252" cy="232" r="2.7"/>
<circle class="fg-f-or fg-pt" cx="214" cy="224" r="2.7"/>
<circle class="fg-f-or fg-pt" cx="234" cy="240" r="2.7"/>
<circle class="fg-f-or fg-pt" cx="254" cy="224" r="2.7"/>
<circle class="fg-f-or fg-pt" cx="222" cy="234" r="2.7"/>
<circle class="fg-f-or fg-pt" cx="244" cy="220" r="2.7"/>
<path class="fg-t-bleu fg-t-fin" d="M204 244L204 254" marker-end="url(#fg-fl-bleu)"/>
<path class="fg-t-bleu fg-t-fin" d="M238 244L238 256" marker-end="url(#fg-fl-bleu)"/>
<path class="fg-t-bleu fg-t-fin" d="M268 244L268 254" marker-end="url(#fg-fl-bleu)"/>
<path class="fg-f-bleu-l fg-t-bleu fg-t-fin" d="M178 268q60 -8 120 0q-60 8 -120 0Z"/>` },

  { ou: "pourquoi",
    apres: 3,
    type: "courbe",
    qualitative: true,
    titre: "Entre le cru et la surcuisson",
    legende: "Allure qualitative : la maille retient d'abord de plus en plus d'eau, puis, resserrée par la chaleur, elle la rend. Le chemin du retour n'existe pas.",
    alt: "Courbe qualitative, sans valeurs chiffrées. L'axe horizontal est la chaleur et la durée de cuisson, du cru au très cuit ; l'axe vertical est l'eau retenue dans la maille de protéines. Dans l'œuf cru, liquide, la maille n'existe pas. En chauffant, le réseau se forme et l'eau retenue monte jusqu'à un maximum : l'œuf est pris, soyeux. Au-delà, la maille se resserre et expulse l'eau : la courbe retombe, la texture devient grainée. Cette descente est irréversible.",
    x: { label: "Chaleur et durée de cuisson",
      extremites: ["cru", "très cuit"] },
    y: { label: "Eau retenue dans la maille" },
    series: [
      { nom: "Eau retenue",
        ton: "bleu",
        aire: true,
        points: [[0, 0.06], [22, 0.14], [38, 0.6], [50, 0.96], [58, 1], [70, 0.66], [86, 0.28], [100, 0.14]] }
    ],
    zones: [
      { de: 0, a: 30, label: "liquide", ton: "bleu" },
      { de: 38, a: 64, label: "pris, soyeux", ton: "vert" },
      { de: 70, a: 100, label: "surcuit, grainé", ton: "terra" }
    ],
    notes: [
      { x: 86,
        y: 0.28,
        texte: "l'eau ressort, sans retour",
        dx: -20,
        dy: -44,
        largeur: 112,
        ancre: "end",
        ton: "terra" }
    ] },

  { ou: "cas",
    type: "comparaison",
    titre: "Quand sortir la quiche ?",
    legende: "Illustration qualitative : sortez-la quand le centre tremble encore, la cuisson résiduelle fait le reste pendant le repos ; attendue trop longtemps, elle rend son eau.",
    alt: "Trois coupes d'un moule, de gauche à droite. À la sortie du four : l'appareil est pris sur les bords et son centre tremble encore, marqué par de petits traits de vibration ; c'est le bon moment. Après 5 à 10 minutes de repos : l'appareil est lisse et pris jusqu'au centre, grâce à la cuisson résiduelle. Si l'on attend trop : l'appareil est grainé, troué de petits vides, et une flaque d'eau claire apparaît en surface ; aucun repos ne le rattrape.",
    panneaux: [
      { label: "Au four",
        sous: "le centre tremble encore : sortez-la",
        ton: "or",
        vb: "0 0 100 70",
        corps: `<path class="fg-f-or-l fg-t-or fg-t-epais" d="M10 28Q30 21 50 28Q70 35 90 28V56a8 8 0 0 1 -8 8H18a8 8 0 0 1 -8 -8Z"/>
<path class="fg-t-encre fg-t-epais" d="M8 20V56a10 10 0 0 0 10 10H82a10 10 0 0 0 10 -10V20"/>
<path class="fg-t-terra fg-t-fin" d="M30 22q-5 -6 0 -12M40 22q-5 -6 0 -12M60 22q5 -6 0 -12M70 22q5 -6 0 -12"/>` },
      { label: "Au repos",
        sous: "5 à 10 min : la chaleur finit le centre",
        ton: "vert",
        vb: "0 0 100 70",
        corps: `<path class="fg-f-or-l fg-t-or fg-t-epais" d="M10 28H90V56a8 8 0 0 1 -8 8H18a8 8 0 0 1 -8 -8Z"/>
<path class="fg-t-encre fg-t-epais" d="M8 20V56a10 10 0 0 0 10 10H82a10 10 0 0 0 10 -10V20"/>` },
      { label: "Trop tard",
        sous: "grainée, elle rend son eau",
        ton: "terra",
        vb: "0 0 100 70",
        corps: `<path class="fg-f-or-l fg-t-terra fg-t-epais" d="M10 28H90V56a8 8 0 0 1 -8 8H18a8 8 0 0 1 -8 -8Z"/>
<circle class="fg-f-carte" cx="24" cy="44" r="2.2"/>
<circle class="fg-f-carte" cx="38" cy="54" r="1.8"/>
<circle class="fg-f-carte" cx="52" cy="42" r="2.4"/>
<circle class="fg-f-carte" cx="66" cy="52" r="2"/>
<circle class="fg-f-carte" cx="78" cy="40" r="1.8"/>
<circle class="fg-f-carte" cx="30" cy="36" r="1.6"/>
<circle class="fg-f-carte" cx="60" cy="34" r="1.6"/>
<circle class="fg-f-carte" cx="46" cy="56" r="1.6"/>
<path class="fg-f-bleu-l fg-t-bleu fg-t-fin" d="M16 30q34 -7 68 0q-34 6 -68 0Z"/>
<path class="fg-t-encre fg-t-epais" d="M8 20V56a10 10 0 0 0 10 10H82a10 10 0 0 0 10 -10V20"/>` }
    ] },

  { ou: "reperes",
    type: "svg",
    vb: "0 0 320 250",
    titre: "Où l'œuf prend-il ?",
    legende: "Le blanc prend progressivement : trouble dès 63 °C, ferme vers 70 °C. Le jaune prend un peu plus haut. Dilué par la crème ou le lait, l'œuf demande bien plus de chaleur.",
    alt: "Trois barres sur un axe de température en degrés Celsius. Le blanc d'œuf prend progressivement entre 60 et 80 degrés : il devient laiteux, trouble, dès 63 degrés, puis ferme vers 70 degrés. Le jaune prend vers 65 à 70 degrés, et reste crémeux au-delà. Un appareil dilué, comme une quiche, un flan ou une crème prise, ne prend qu'entre 80 et 85 degrés.",
    corps: `<path class="fg-t-doux fg-t-fin fg-tirets" d="M60 30L60 192"/>
<path class="fg-t-doux fg-t-fin fg-tirets" d="M140 30L140 192"/>
<path class="fg-t-doux fg-t-fin fg-tirets" d="M220 30L220 192"/>
<text class="fg-txt fg-txt-b fg-halo" x="16" y="22">Blanc : il prend progressivement</text>
<rect class="fg-f-doux fg-t-doux fg-t-fin" x="60" y="32" width="24" height="18"/>
<rect class="fg-f-or-l fg-t-or fg-t-fin" x="84" y="32" width="56" height="18"/>
<rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="140" y="32" width="80" height="18"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-or" x="112" y="45" text-anchor="middle">laiteux</text>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-terra" x="180" y="45" text-anchor="middle">ferme</text>
<text class="fg-txt fg-txt-s" x="60" y="66" text-anchor="middle">60</text>
<text class="fg-txt fg-txt-s" x="84" y="66" text-anchor="middle">63</text>
<text class="fg-txt fg-txt-s" x="140" y="66" text-anchor="middle">70</text>
<text class="fg-txt fg-txt-s" x="220" y="66" text-anchor="middle">80</text>
<text class="fg-txt fg-txt-b fg-halo" x="16" y="94">Jaune : un peu plus haut</text>
<rect class="fg-f-or fg-t-or fg-t-fin" x="100" y="104" width="40" height="18" rx="2"/>
<text class="fg-txt fg-txt-s fg-halo" x="148" y="117">reste crémeux au-delà</text>
<text class="fg-txt fg-txt-s" x="100" y="138" text-anchor="middle">65</text>
<text class="fg-txt fg-txt-s" x="140" y="138" text-anchor="middle">70</text>
<text class="fg-txt fg-txt-b fg-halo" x="16" y="166">Appareil dilué : quiche, flan, crème</text>
<rect class="fg-f-terra fg-t-terra fg-t-fin" x="220" y="176" width="40" height="18" rx="2"/>
<text class="fg-txt fg-txt-s" x="220" y="210" text-anchor="middle">80</text>
<text class="fg-txt fg-txt-s" x="260" y="210" text-anchor="middle">85</text>
<path class="fg-t-axe" d="M20 222L306 222" marker-end="url(#fg-fl-encre)"/>
<text class="fg-txt fg-txt-s fg-txt-b" x="306" y="240" text-anchor="end">température, en °C</text>` }
];


/* --- Textures, partie 2 : levure chimique, contraste de textures, pectine --- */

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
