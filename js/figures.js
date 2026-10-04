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

FIGURES["torrefaction"] = [
  { ou: "tete", type: "svg", vb: "0 0 320 296",
    titre: "Ce que la chaleur sèche fait à une graine",
    legende: "Trois choses se passent en même temps dans la graine : l'eau part, les sucres et les acides aminés brunissent, les huiles volatiles s'échappent. Le parfum qui monte de la poêle est celui que le plat ne retrouvera pas.",
    alt: "Coupe d'une graine, faite de cellules rangées et chauffée par en dessous, à sec. Trois flèches partent de la graine vers trois encadrés. En haut, en bleu : l'eau résiduelle est chassée d'abord, elle sort en vapeur. Au milieu, en brun : vers 140 à 160 degrés, les sucres et les acides aminés réagissent, c'est la réaction de Maillard, qui produit notamment des pyrazines, la note grillée. En bas, en or : les huiles essentielles des épices se volatilisent et partent dans l'air. Une dernière note, en bas à droite, rappelle que la chaleur fragilise les parois cellulaires : la graine devient cassante et se moud plus finement.",
    corps: `<path class="fg-t-bleu" d="M52 26C44 20 60 14 52 6"/>
<path class="fg-t-bleu" d="M80 26C72 20 88 14 80 6"/>
<path class="fg-t-bleu" d="M108 26C100 20 116 14 108 6"/>
<path class="fg-f-terra-l fg-t-terra fg-t-epais" d="M80 32C130 44 150 100 146 140C140 190 108 214 80 214C52 214 20 190 14 140C10 100 30 44 80 32Z"/>
<rect class="fg-f-carte fg-t-doux" x="54" y="62" width="30" height="24" rx="6"/>
<rect class="fg-f-carte fg-t-doux" x="88" y="62" width="30" height="24" rx="6"/>
<rect class="fg-f-carte fg-t-doux" x="38" y="90" width="30" height="24" rx="6"/>
<rect class="fg-f-carte fg-t-doux" x="72" y="90" width="30" height="24" rx="6"/>
<rect class="fg-f-carte fg-t-doux" x="106" y="90" width="26" height="24" rx="6"/>
<rect class="fg-f-carte fg-t-doux" x="26" y="118" width="30" height="24" rx="6"/>
<rect class="fg-f-carte fg-t-doux" x="60" y="118" width="30" height="24" rx="6"/>
<rect class="fg-f-carte fg-t-doux" x="94" y="118" width="30" height="24" rx="6"/>
<rect class="fg-f-carte fg-t-doux" x="34" y="146" width="30" height="24" rx="6"/>
<rect class="fg-f-carte fg-t-doux" x="68" y="146" width="30" height="24" rx="6"/>
<rect class="fg-f-carte fg-t-doux" x="102" y="146" width="28" height="24" rx="6"/>
<rect class="fg-f-carte fg-t-doux" x="48" y="174" width="30" height="22" rx="6"/>
<rect class="fg-f-carte fg-t-doux" x="82" y="174" width="30" height="22" rx="6"/>
<circle class="fg-f-or" cx="66" cy="72" r="3.4"/><circle class="fg-f-or" cx="106" cy="80" r="3.4"/>
<circle class="fg-f-or" cx="50" cy="106" r="3.4"/><circle class="fg-f-or" cx="118" cy="102" r="3.4"/>
<circle class="fg-f-or" cx="42" cy="130" r="3.4"/><circle class="fg-f-or" cx="110" cy="132" r="3.4"/>
<circle class="fg-f-or" cx="52" cy="158" r="3.4"/><circle class="fg-f-or" cx="114" cy="158" r="3.4"/>
<circle class="fg-f-or" cx="94" cy="186" r="3.4"/>
<rect class="fg-f-terra" x="75" y="68" width="6" height="6" rx="1.5" transform="rotate(20 78 71)"/>
<rect class="fg-f-terra" x="86" y="98" width="6" height="6" rx="1.5" transform="rotate(20 89 101)"/>
<rect class="fg-f-terra" x="72" y="128" width="6" height="6" rx="1.5" transform="rotate(20 75 131)"/>
<rect class="fg-f-terra" x="80" y="156" width="6" height="6" rx="1.5" transform="rotate(20 83 159)"/>
<rect class="fg-f-terra" x="62" y="182" width="6" height="6" rx="1.5" transform="rotate(20 65 185)"/>
<path class="fg-t-terra fg-t-epais" d="M34 262L34 232" marker-end="url(#fg-fl-terra)"/>
<path class="fg-t-terra fg-t-epais" d="M80 262L80 232" marker-end="url(#fg-fl-terra)"/>
<path class="fg-t-terra fg-t-epais" d="M126 262L126 232" marker-end="url(#fg-fl-terra)"/>
<text class="fg-txt-script fg-txt-terra" x="80" y="286" text-anchor="middle">chaleur sèche, sans gras</text>
<rect class="fg-f-bleu-l fg-t-bleu" x="168" y="6" width="116" height="58" rx="10"/>
<text class="fg-txt fg-txt-b fg-txt-bleu" x="178" y="26" text-anchor="start">D'abord, l'eau</text>
<text class="fg-txt fg-txt-s" x="178" y="42" text-anchor="start"><tspan x="178">l'eau résiduelle</tspan><tspan x="178" dy="13.5">part en vapeur</tspan></text>
<path class="fg-t-bleu" d="M166 34L116 30" marker-end="url(#fg-fl-bleu)"/>
<rect class="fg-f-terra-l fg-t-terra" x="168" y="76" width="144" height="76" rx="10"/>
<text class="fg-txt fg-txt-b fg-txt-terra" x="178" y="96" text-anchor="start">Maillard</text>
<text class="fg-txt fg-txt-s" x="178" y="112" text-anchor="start"><tspan x="178">dès 140 à 160 °C :</tspan><tspan x="178" dy="13.5">des pyrazines, la</tspan><tspan x="178" dy="13.5">note grillée</tspan></text>
<path class="fg-t-terra" d="M166 114L134 120" marker-end="url(#fg-fl-terra)"/>
<rect class="fg-f-or-l fg-t-or" x="168" y="164" width="144" height="76" rx="10"/>
<text class="fg-txt fg-txt-b fg-txt-or" x="178" y="184" text-anchor="start">Parfum volatil</text>
<text class="fg-txt fg-txt-s" x="178" y="200" text-anchor="start"><tspan x="178">les huiles</tspan><tspan x="178" dy="13.5">essentielles partent</tspan><tspan x="178" dy="13.5">dans l'air</tspan></text>
<path class="fg-t-or" d="M166 204L134 176" marker-end="url(#fg-fl-or)"/>
<rect class="fg-f-doux fg-t-doux" x="168" y="252" width="144" height="38" rx="10"/>
<text class="fg-txt fg-txt-s" x="240" y="268" text-anchor="middle"><tspan x="240">parois fragilisées :</tspan><tspan x="240" dy="13.5">la graine devient cassante</tspan></text>` },

  { ou: "pourquoi", apres: 2, type: "courbe", qualitative: true,
    titre: "La fenêtre avant l'amertume",
    legende: "Allure qualitative, sans durée chiffrée : les arômes grillés montent et culminent, les arômes volatils de l'épice s'en vont, et l'amertume, qui n'arrive qu'à la fin, ne se rattrape plus. On s'arrête dans la fenêtre.",
    alt: "Courbes qualitatives, sans valeurs chiffrées, selon la durée de chauffe, de courte à longue. Les notes grillées, en vert, montent, culminent vers le milieu puis retombent. Les arômes volatils de l'épice, en or, diminuent régulièrement : ils partent dans l'air. L'amertume, en brun, reste presque nulle puis grimpe en fin de chauffe. Une zone centrale marque la fenêtre idéale, où le grillé est à son maximum avant que l'amertume n'apparaisse ; un repère indique de couper le feu au premier parfum net.",
    x: { label: "Durée de chauffe", extremites: ["courte", "longue"] },
    y: { label: "Intensité perçue" },
    series: [
      { nom: "Notes grillées", ton: "vert", points: [[0, 0.02], [24, 0.3], [48, 0.82], [60, 1], [78, 0.76], [100, 0.4]] },
      { nom: "Arômes volatils", ton: "or", tirets: true, points: [[0, 0.78], [34, 0.62], [64, 0.36], [100, 0.1]] },
      { nom: "Amertume", ton: "terra", points: [[0, 0], [56, 0.03], [72, 0.2], [86, 0.62], [100, 1]] }
    ],
    zones: [ { de: 42, a: 68, label: "la fenêtre", ton: "vert" } ],
    reperes: [ { x: 52, label: "coupez le feu", ton: "vert" } ] },

  { ou: "cas", type: "comparaison",
    titre: "Dans la poêle ou sur l'assiette ?",
    legende: "Le métal garde de la chaleur et continue de cuire après l'extinction du feu : c'est entre le feu coupé et l'assiette que la plupart des graines brûlent.",
    alt: "Deux panneaux. À gauche, les graines restent dans la poêle encore chaude : le métal restitue sa chaleur, la cuisson continue plusieurs minutes et les graines ressortent amères. À droite, les graines sont versées aussitôt sur une assiette froide : la cuisson s'arrête net et elles gardent le parfum qu'elles avaient au moment où le feu a été coupé.",
    panneaux: [
      { label: "Laissées dans la poêle", sous: "le métal continue de cuire", ton: "terra", vb: "0 0 100 64",
        corps: `<path class="fg-t-terra fg-t-fin" d="M30 18C26 12 34 8 30 2M50 18C46 12 54 8 50 2M70 18C66 12 74 8 70 2"/>
<path class="fg-f-terra-l fg-t-terra fg-t-epais" d="M12 40L76 40C76 52 70 58 44 58C18 58 12 52 12 40Z"/>
<path class="fg-t-terra fg-t-epais" d="M76 44L96 38"/>
<ellipse class="fg-f-terra" cx="26" cy="36" rx="6" ry="3.6"/><ellipse class="fg-f-terra" cx="40" cy="35" rx="6" ry="3.6" transform="rotate(-8 40 35)"/><ellipse class="fg-f-terra" cx="54" cy="36" rx="6" ry="3.6"/><ellipse class="fg-f-terra" cx="66" cy="35" rx="5" ry="3.4" transform="rotate(8 66 35)"/>` },
      { label: "Sur une assiette froide", sous: "la cuisson s'arrête net", ton: "vert", vb: "0 0 100 64",
        corps: `<path class="fg-t-bleu fg-t-fin" d="M30 20L30 12M50 20L50 8M70 20L70 12"/>
<ellipse class="fg-f-bleu-l fg-t-bleu fg-t-epais" cx="50" cy="48" rx="40" ry="9"/>
<ellipse class="fg-f-terra" cx="30" cy="42" rx="6" ry="3.6"/><ellipse class="fg-f-terra" cx="42" cy="44" rx="6" ry="3.6" transform="rotate(-8 42 44)"/><ellipse class="fg-f-terra" cx="55" cy="43" rx="6" ry="3.6"/><ellipse class="fg-f-terra" cx="68" cy="42" rx="5" ry="3.4" transform="rotate(8 68 42)"/>` }
    ] },

  { ou: "reperes", type: "barres",
    titre: "Combien de temps, selon la méthode",
    legende: "La barre marque la durée la plus longue conseillée : au-delà, la chaleur résiduelle finit le travail. À sec, des minutes ; dans le gras, des secondes.",
    alt: "Quatre barres comparent les durées conseillées. Graines à la poêle, à feu moyen et en remuant : 2 à 4 minutes. Cerneaux à la poêle : 4 à 6 minutes. Fruits secs entiers au four à 150-160 degrés : 8 à 12 minutes. Épices moulues dans le gras, à feu moyen : 30 à 60 secondes, pas davantage. La barre des épices moulues est de loin la plus courte.",
    unite: "min",
    barres: [
      { label: "Graines, à la poêle", valeur: 4, texte: "2 à 4 min", ton: "terra", note: "feu moyen, en remuant" },
      { label: "Cerneaux, à la poêle", valeur: 6, texte: "4 à 6 min", ton: "terra", note: "feu moyen, en remuant" },
      { label: "Fruits secs entiers, au four", valeur: 12, texte: "8 à 12 min", ton: "terra", note: "150 à 160 °C, plaque secouée à mi-parcours" },
      { label: "Épices moulues, dans le gras", valeur: 1, texte: "30 à 60 s", ton: "or", note: "feu moyen, pas davantage" }
    ] }
];

FIGURES["epices-gras"] = [
  { ou: "tete", type: "svg", vb: "0 0 320 298",
    titre: "Où vont les molécules d'une épice ?",
    legende: "Même épice, même poudre : dans l'eau, ses molécules d'arôme ne passent presque pas ; dans le gras chaud, elles se dissolvent puis se répartissent dans tout le plat.",
    alt: "Deux bols vus en coupe, côte à côte, avec chacun un petit tas de poudre d'épice au fond. À gauche, le bol d'eau : les molécules d'arôme, de petits points bruns, restent presque toutes dans la poudre, car l'eau les dissout très mal. À droite, le bol de gras chaud : les mêmes molécules se sont dissoutes et se répartissent dans tout le liquide, jusqu'en haut du bol. En dessous, une légende précise que ces points figurent des molécules d'arôme liposolubles : la capsaïcine du piment, la pipérine du poivre et le cuminaldéhyde du cumin.",
    corps: `<text class="fg-txt fg-txt-b fg-txt-bleu" x="80" y="26" text-anchor="middle">Eau</text>
<text class="fg-txt fg-txt-b fg-txt-or" x="240" y="26" text-anchor="middle">Gras chaud</text>
<path class="fg-f-bleu-l fg-t-bleu fg-t-epais" d="M14 44L146 44C146 110 118 150 80 150C42 150 14 110 14 44Z"/>
<path class="fg-f-or-l fg-t-or fg-t-epais" d="M174 44L306 44C306 110 278 150 240 150C202 150 174 110 174 44Z"/>
<ellipse class="fg-f-terra-l fg-t-terra" cx="80" cy="141" rx="15" ry="6"/>
<ellipse class="fg-f-terra-l fg-t-terra" cx="240" cy="141" rx="15" ry="6"/>
<circle class="fg-f-terra" cx="73" cy="140" r="2.8"/><circle class="fg-f-terra" cx="80" cy="143" r="2.8"/><circle class="fg-f-terra" cx="87" cy="139" r="2.8"/><circle class="fg-f-terra" cx="82" cy="138" r="2.8"/>
<circle class="fg-f-terra" cx="75" cy="127" r="2.8"/><circle class="fg-f-terra" cx="90" cy="124" r="2.8"/>
<circle class="fg-f-terra" cx="236" cy="143" r="2.8"/>
<circle class="fg-f-terra" cx="205" cy="62" r="2.8"/><circle class="fg-f-terra" cx="234" cy="60" r="2.8"/><circle class="fg-f-terra" cx="264" cy="66" r="2.8"/><circle class="fg-f-terra" cx="292" cy="60" r="2.8"/>
<circle class="fg-f-terra" cx="216" cy="82" r="2.8"/><circle class="fg-f-terra" cx="248" cy="80" r="2.8"/><circle class="fg-f-terra" cx="278" cy="86" r="2.8"/>
<circle class="fg-f-terra" cx="200" cy="100" r="2.8"/><circle class="fg-f-terra" cx="228" cy="102" r="2.8"/><circle class="fg-f-terra" cx="258" cy="104" r="2.8"/><circle class="fg-f-terra" cx="285" cy="104" r="2.8"/>
<circle class="fg-f-terra" cx="216" cy="122" r="2.8"/><circle class="fg-f-terra" cx="244" cy="120" r="2.8"/><circle class="fg-f-terra" cx="268" cy="124" r="2.8"/>
<circle class="fg-f-terra" cx="226" cy="134" r="2.8"/><circle class="fg-f-terra" cx="256" cy="134" r="2.8"/>
<path class="fg-t-terra fg-t-fin" d="M214 166C210 162 218 160 214 156M240 168C236 164 244 162 240 158M266 166C262 162 270 160 266 156"/>
<text class="fg-txt fg-txt-s" x="80" y="190" text-anchor="middle"><tspan x="80">l'eau les dissout</tspan><tspan x="80" dy="13.5">très mal : la poudre</tspan><tspan x="80" dy="13.5">garde ses arômes</tspan></text>
<text class="fg-txt fg-txt-s" x="240" y="190" text-anchor="middle"><tspan x="240">le gras chaud les</tspan><tspan x="240" dy="13.5">extrait, puis les</tspan><tspan x="240" dy="13.5">répartit partout</tspan></text>
<rect class="fg-f-or-l fg-t-or" x="10" y="238" width="300" height="52" rx="10"/>
<circle class="fg-f-terra" cx="26" cy="254" r="3.2"/>
<text class="fg-txt fg-txt-b fg-txt-or" x="36" y="258" text-anchor="start">molécule d'arôme liposoluble</text>
<text class="fg-txt fg-txt-s" x="20" y="274" text-anchor="start"><tspan x="20">capsaïcine, pipérine, cuminaldéhyde</tspan></text>` },

  { ou: "cas", type: "etapes",
    titre: "Verser le paprika sans le brûler",
    legende: "Le paprika est un fruit séché et sucré : ses sucres brunissent bien avant le seuil de caramélisation. On baisse donc la chaleur avant de verser, pas après.",
    alt: "Trois étapes reliées par des flèches. Première étape : retirer la casserole du feu. Deuxième étape : compter cinq secondes. Troisième étape : verser la poudre dans le gras encore chaud, où elle infuse sans roussir.",
    etapes: [
      { libelle: "Hors du feu", desc: "retirez la casserole", emoji: "🍳", ton: "terra" },
      { libelle: "Cinq secondes", desc: "le temps de compter", emoji: "⏱️", ton: "or" },
      { libelle: "Versez la poudre", desc: "dans le gras encore chaud : elle infuse sans roussir", emoji: "🌶️", ton: "vert" }
    ] },

  { ou: "cas", type: "comparaison",
    titre: "Le safran fait l'inverse",
    legende: "Ses pigments, les crocines, se dissolvent dans l'eau et non dans l'huile. On infuse dans un liquide vers 60 °C, et plus chaud ou plus long ne donne pas davantage.",
    alt: "Trois verres côte à côte contenant des pistils de safran. Dans l'huile, le liquide reste pâle : les crocines n'y passent pas. Dans l'eau vers 60 degrés, au bout d'une vingtaine de minutes, le liquide se teinte d'un jaune doré : les pigments sont passés. Dans un liquide plus chaud ou plus longtemps infusé, la couleur ne progresse plus : la crocine se dégrade plus vite qu'elle ne passe.",
    panneaux: [
      { label: "Huile", sous: "les crocines n'y passent pas", ton: "or", vb: "0 0 100 64",
        corps: `<path class="fg-f-or-l" opacity=".7" d="M32.8 22L32.8 52Q32.8 57 38 57L62 57Q67.2 57 67.2 52L67.2 22Z"/>
<path class="fg-t-axe fg-t-epais" d="M32 8L32 52Q32 58 38 58L62 58Q68 58 68 52L68 8"/>
<path class="fg-t-terra fg-t-epais" d="M42 55L47 44M51 55L50 42M58 55L63 46"/>` },
      { label: "Eau vers 60 °C", sous: "20 min : les pigments passent", ton: "bleu", vb: "0 0 100 64",
        corps: `<path class="fg-f-or" opacity=".75" d="M32.8 22L32.8 52Q32.8 57 38 57L62 57Q67.2 57 67.2 52L67.2 22Z"/>
<path class="fg-t-axe fg-t-epais" d="M32 8L32 52Q32 58 38 58L62 58Q68 58 68 52L68 8"/>
<path class="fg-t-terra fg-t-epais" d="M42 55L47 44M51 55L50 42M58 55L63 46"/>` },
      { label: "Plus chaud, plus long", sous: "la crocine se dégrade", ton: "terra", vb: "0 0 100 64",
        corps: `<path class="fg-f-or" opacity=".4" d="M32.8 22L32.8 52Q32.8 57 38 57L62 57Q67.2 57 67.2 52L67.2 22Z"/>
<path class="fg-t-axe fg-t-epais" d="M32 8L32 52Q32 58 38 58L62 58Q68 58 68 52L68 8"/>
<path class="fg-t-terra fg-t-fin" d="M40 6C36 2 44 0 40 -4M50 6C46 2 54 0 50 -4M60 6C56 2 64 0 60 -4" transform="translate(0 4)"/>
<path class="fg-t-terra fg-t-epais" d="M42 55L47 44M51 55L50 42M58 55L63 46"/>` }
    ] },

  { ou: "reperes", type: "echelle",
    titre: "Quelle chaleur pour quelle épice ?",
    legende: "Moulues, les épices veulent un gras à 140-160 °C ; paprika et piment en poudre, sous 150 °C ; le safran, un liquide vers 60 °C. À 200 °C, tout noircit.",
    alt: "Règle de température de 50 à 220 degrés Celsius. Un marqueur à 60 degrés : le safran s'infuse environ 20 minutes dans un liquide, jamais dans l'huile seule. Une zone verte de 140 à 160 degrés : le gras des épices moulues. Un marqueur à 150 degrés : paprika et piment en poudre, sous 150 degrés. Une zone brune à partir de 200 degrés : les épices noircissent et l'amertume ne se rattrape pas.",
    min: 50, max: 220, unite: "°C", label: "Température du gras ou du liquide",
    graduations: [60, 100, 150, 200],
    zones: [
      { de: 140, a: 160, label: "épices moulues", ton: "vert" },
      { de: 200, a: 220, label: "noircissent", ton: "terra" }
    ],
    marqueurs: [
      { v: 60, label: "Safran : 20 min dans un liquide, pas d'huile", ton: "bleu" },
      { v: 150, label: "Paprika, piment : sous 150 °C", ton: "or" },
      { v: 200, label: "À 200 °C, l'amertume est définitive", ton: "terra" }
    ] }
];

FIGURES["huiles-essentielles"] = [
  { ou: "tete", type: "svg", vb: "0 0 320 252",
    titre: "Coupe d'un citron : où est le parfum ?",
    legende: "Le parfum est dans les poches du flavédo, la fine couche colorée ; l'amertume dans l'albédo blanc, juste dessous ; l'acidité dans le jus. Schéma sans échelle : le flavédo est bien plus mince que l'albédo.",
    alt: "Coupe de l'écorce d'un citron, de la surface vers le cœur, en trois couches. Tout en haut, le flavédo, fine couche colorée de 0,3 à 0,5 millimètre, criblée de poches microscopiques remplies d'huile essentielle, faite à 70-90 % de limonène : une flèche montante figure le parfum qui s'en échappe. Dessous, l'albédo, blanc et spongieux, sans huile essentielle mais avec de la limonine, responsable de l'amertume : une ligne en tirets à sa limite avec le flavédo indique où arrêter la râpe. Tout en bas, la pulpe et son jus, une solution acide d'environ 5 % d'acide citrique, presque muette au nez.",
    corps: `<path class="fg-t-or fg-t-epais" d="M66 44L66 14" marker-end="url(#fg-fl-or)"/>
<text class="fg-txt-script fg-txt-or" x="78" y="24" text-anchor="start">le parfum</text>
<rect class="fg-f-or-l fg-t-or" x="10" y="36" width="156" height="36"/>
<circle class="fg-f-carte fg-t-or" cx="30" cy="54" r="9"/><circle class="fg-f-or" cx="30" cy="54" r="4.2"/>
<circle class="fg-f-carte fg-t-or" cx="66" cy="54" r="9"/><circle class="fg-f-or" cx="66" cy="54" r="4.2"/>
<circle class="fg-f-carte fg-t-or" cx="102" cy="54" r="9"/><circle class="fg-f-or" cx="102" cy="54" r="4.2"/>
<circle class="fg-f-carte fg-t-or" cx="138" cy="54" r="9"/><circle class="fg-f-or" cx="138" cy="54" r="4.2"/>
<rect class="fg-f-doux fg-t-doux" x="10" y="72" width="156" height="70"/>
<circle class="fg-f-carte fg-t-doux" cx="24" cy="86" r="5"/><circle class="fg-f-carte fg-t-doux" cx="48" cy="82" r="3.6"/><circle class="fg-f-carte fg-t-doux" cx="140" cy="84" r="5.4"/><circle class="fg-f-carte fg-t-doux" cx="158" cy="94" r="3.4"/>
<circle class="fg-f-carte fg-t-doux" cx="22" cy="108" r="4"/><circle class="fg-f-carte fg-t-doux" cx="44" cy="116" r="5.4"/><circle class="fg-f-carte fg-t-doux" cx="72" cy="124" r="3.8"/><circle class="fg-f-carte fg-t-doux" cx="104" cy="120" r="5"/>
<circle class="fg-f-carte fg-t-doux" cx="134" cy="112" r="4.4"/><circle class="fg-f-carte fg-t-doux" cx="152" cy="126" r="5"/><circle class="fg-f-carte fg-t-doux" cx="26" cy="132" r="3.4"/><circle class="fg-f-carte fg-t-doux" cx="124" cy="134" r="3.4"/>
<circle class="fg-f-carte fg-t-doux" cx="86" cy="100" r="3"/><circle class="fg-f-carte fg-t-doux" cx="62" cy="136" r="3.2"/><circle class="fg-f-carte fg-t-doux" cx="158" cy="108" r="3"/>
<path class="fg-t-terra fg-t-epais fg-tirets" d="M4 72L172 72"/>
<text class="fg-txt-script fg-txt-terra fg-halo" x="88" y="93" text-anchor="middle">on s'arrête ici</text>
<rect class="fg-f-carte fg-t-doux" x="10" y="142" width="156" height="98"/>
<ellipse class="fg-f-bleu-l fg-t-bleu fg-t-fin" cx="38" cy="162" rx="19" ry="7" transform="rotate(28 38 162)"/>
<ellipse class="fg-f-bleu-l fg-t-bleu fg-t-fin" cx="86" cy="160" rx="19" ry="7" transform="rotate(-18 86 160)"/>
<ellipse class="fg-f-bleu-l fg-t-bleu fg-t-fin" cx="132" cy="166" rx="19" ry="7" transform="rotate(35 132 166)"/>
<ellipse class="fg-f-bleu-l fg-t-bleu fg-t-fin" cx="56" cy="192" rx="19" ry="7" transform="rotate(-30 56 192)"/>
<ellipse class="fg-f-bleu-l fg-t-bleu fg-t-fin" cx="106" cy="196" rx="19" ry="7" transform="rotate(12 106 196)"/>
<ellipse class="fg-f-bleu-l fg-t-bleu fg-t-fin" cx="146" cy="198" rx="15" ry="7" transform="rotate(-35 146 198)"/>
<ellipse class="fg-f-bleu-l fg-t-bleu fg-t-fin" cx="36" cy="220" rx="17" ry="7" transform="rotate(10 36 220)"/>
<ellipse class="fg-f-bleu-l fg-t-bleu fg-t-fin" cx="82" cy="222" rx="19" ry="7" transform="rotate(-14 82 222)"/>
<ellipse class="fg-f-bleu-l fg-t-bleu fg-t-fin" cx="128" cy="224" rx="19" ry="7" transform="rotate(20 128 224)"/>
<path class="fg-t-or fg-t-tres-epais" d="M174 36L174 72"/>
<path class="fg-t-terra fg-t-tres-epais" d="M174 74L174 142"/>
<path class="fg-t-bleu fg-t-tres-epais" d="M174 144L174 240"/>
<text class="fg-txt fg-txt-b fg-txt-or" x="184" y="48" text-anchor="start">Flavédo</text>
<text class="fg-txt fg-txt-s" x="184" y="62" text-anchor="start"><tspan x="184">0,3 à 0,5 mm</tspan><tspan x="184" dy="13.5">poches d'huile :</tspan><tspan x="184" dy="13.5">limonène 70-90 %</tspan></text>
<text class="fg-txt fg-txt-b fg-txt-terra" x="184" y="112" text-anchor="start">Albédo</text>
<text class="fg-txt fg-txt-s" x="184" y="126" text-anchor="start"><tspan x="184">blanc, spongieux,</tspan><tspan x="184" dy="13.5">pas d'huile, mais</tspan><tspan x="184" dy="13.5">la limonine, amère</tspan></text>
<text class="fg-txt fg-txt-b fg-txt-bleu" x="184" y="184" text-anchor="start">Pulpe et jus</text>
<text class="fg-txt fg-txt-s" x="184" y="198" text-anchor="start"><tspan x="184">acide, environ 5 %</tspan><tspan x="184" dy="13.5">d'acide citrique,</tspan><tspan x="184" dy="13.5">presque muet au nez</tspan></text>` },

  { ou: "cas", type: "etapes",
    titre: "Zester d'abord, presser ensuite",
    legende: "Le fruit entier est ferme et se laisse zester proprement ; pressé, il devient mou et déchiré, et la lame n'emporte plus que du blanc amer.",
    alt: "Deux étapes reliées par une flèche. Première étape : zester le fruit entier, encore ferme, la lame glisse sur le flavédo. Deuxième étape : presser ensuite seulement, car le fruit pressé devient mou, humide et déchiré, la lame accroche l'albédo et l'ordre ne se rattrape pas.",
    etapes: [
      { libelle: "Zester", desc: "le fruit entier, encore ferme : la lame ne prend que le flavédo", emoji: "🍋", ton: "or" },
      { libelle: "Presser", desc: "ensuite seulement : mou et déchiré, il ne se zeste plus sans amertume", emoji: "💧", ton: "bleu" }
    ] },

  { ou: "pourquoi", apres: 3, type: "comparaison",
    titre: "Où va le parfum d'un zeste ?",
    legende: "Un zeste nu perd son parfum en s'évaporant, sans arrêt. Dans l'huile ou dans le sucre, il est retenu : zestez donc directement au-dessus de la préparation.",
    alt: "Trois panneaux. À gauche, un zeste nu posé sur une planche : des vapeurs montent, l'huile s'évapore sans cesse. Au centre, un zeste dans l'huile : les composés liposolubles s'y dissolvent aussitôt, le parfum ne s'échappe plus. À droite, un zeste dans le sucre : les cristaux crèvent les poches d'huile et retiennent l'huile libérée, le parfum cesse là aussi de s'évaporer.",
    panneaux: [
      { label: "Zeste nu", sous: "l'huile s'évapore sans arrêt", ton: "terra", vb: "0 0 100 64",
        corps: `<path class="fg-t-or fg-t-fin" d="M30 30C26 24 34 20 30 14M50 28C46 22 54 18 50 10M70 30C66 24 74 20 70 14"/>
<rect class="fg-f-doux fg-t-doux" x="8" y="48" width="84" height="10" rx="3"/>
<path class="fg-f-or-l fg-t-or fg-t-epais" d="M24 46C34 36 50 36 60 42C66 46 70 46 78 42"/>` },
      { label: "Dans l'huile", sous: "les composés s'y dissolvent", ton: "or", vb: "0 0 100 64",
        corps: `<path class="fg-f-or-l fg-t-or fg-t-epais" d="M10 26L90 26C90 50 74 58 50 58C26 58 10 50 10 26Z"/>
<path class="fg-f-or-l fg-t-or fg-t-epais" d="M28 34C36 28 46 28 54 32"/>
<circle class="fg-f-or" cx="26" cy="46" r="2.2"/><circle class="fg-f-or" cx="40" cy="42" r="2.2"/><circle class="fg-f-or" cx="52" cy="50" r="2.2"/><circle class="fg-f-or" cx="64" cy="40" r="2.2"/><circle class="fg-f-or" cx="74" cy="46" r="2.2"/><circle class="fg-f-or" cx="62" cy="52" r="2.2"/><circle class="fg-f-or" cx="36" cy="52" r="2.2"/>` },
      { label: "Dans le sucre", sous: "poches crevées, huile retenue", ton: "or", vb: "0 0 100 64",
        corps: `<rect class="fg-f-carte fg-t-doux" x="18" y="50" width="8" height="8" rx="1.5"/><rect class="fg-f-carte fg-t-doux" x="27" y="50" width="8" height="8" rx="1.5"/><rect class="fg-f-carte fg-t-doux" x="36" y="50" width="8" height="8" rx="1.5"/><rect class="fg-f-carte fg-t-doux" x="45" y="50" width="8" height="8" rx="1.5"/><rect class="fg-f-carte fg-t-doux" x="54" y="50" width="8" height="8" rx="1.5"/><rect class="fg-f-carte fg-t-doux" x="63" y="50" width="8" height="8" rx="1.5"/><rect class="fg-f-carte fg-t-doux" x="72" y="50" width="8" height="8" rx="1.5"/>
<rect class="fg-f-carte fg-t-doux" x="22" y="41" width="8" height="8" rx="1.5"/><rect class="fg-f-carte fg-t-doux" x="31" y="41" width="8" height="8" rx="1.5"/><rect class="fg-f-carte fg-t-doux" x="58" y="41" width="8" height="8" rx="1.5"/><rect class="fg-f-carte fg-t-doux" x="67" y="41" width="8" height="8" rx="1.5"/>
<path class="fg-f-or-l fg-t-or fg-t-epais" d="M34 38C42 28 56 28 64 38"/>
<circle class="fg-f-or" cx="41" cy="46" r="2.2"/><circle class="fg-f-or" cx="50" cy="42" r="2.2"/><circle class="fg-f-or" cx="55" cy="48" r="2.2"/><circle class="fg-f-or" cx="48" cy="54" r="2.2"/>` }
    ] },

  { ou: "reperes", type: "barres",
    titre: "Deux couches, deux épaisseurs",
    legende: "La barre marque l'épaisseur maximale : l'albédo est plusieurs fois plus épais que le flavédo. Un ordre de grandeur, variable selon l'espèce et la saison.",
    alt: "Deux barres comparent l'épaisseur des couches d'un citron. Le flavédo, la couche qui porte le parfum, fait de 0,3 à 0,5 millimètre. L'albédo, la partie blanche et amère, en fait de 2 à 5 : sa barre est bien plus longue. D'où la règle d'arrêter la râpe à la première trace de blanc.",
    unite: "mm",
    barres: [
      { label: "Flavédo", valeur: 0.5, texte: "0,3 à 0,5 mm", ton: "or", note: "le parfum : poches d'huile essentielle" },
      { label: "Albédo", valeur: 5, texte: "2 à 5 mm", ton: "terra", note: "l'amertume : arrêtez-vous au premier blanc" }
    ] }
];

FIGURES["mordant-oignon"] = [
  { ou: "tete", type: "svg", vb: "0 0 320 346",
    titre: "Ce que le couteau déclenche dans l'oignon",
    legende: "Intacte, la cellule range à part son précurseur soufré et son enzyme. Le couteau les met en présence : la cascade qui suit fabrique les larmes, puis l'odeur et le goût qui s'attardent.",
    alt: "Schéma en deux temps. En haut à gauche, une cellule d'oignon intacte, avec deux compartiments séparés : l'un contient l'isoalliine, un dérivé soufré de la cystéine, l'autre l'alliinase, une enzyme. À droite, la même cellule tranchée par un couteau : les deux compartiments se sont ouverts et leur contenu se mélange. Une flèche descend vers un encadré : l'enzyme coupe la molécule et libère des acides sulféniques, instables. De cet encadré partent deux flèches. À gauche, une seconde enzyme en tire le propanethial-S-oxyde, qui fait pleurer. À droite, le reste se recombine en thiosulfinates puis en disulfures, d'où l'odeur et l'arrière-goût qui remontent longtemps après.",
    corps: `<text class="fg-txt fg-txt-b fg-txt-vert" x="70" y="22" text-anchor="middle">Intact</text>
<text class="fg-txt fg-txt-b fg-txt-terra" x="236" y="22" text-anchor="middle">Tranché</text>
<rect class="fg-f-vert-l fg-t-vert fg-t-epais" x="10" y="32" width="120" height="92" rx="16"/>
<rect class="fg-f-or-l fg-t-or" x="18" y="44" width="50" height="68" rx="10"/>
<rect class="fg-f-terra-l fg-t-terra" x="76" y="44" width="46" height="68" rx="10"/>
<circle class="fg-f-or" cx="32" cy="60" r="3.2"/><circle class="fg-f-or" cx="52" cy="58" r="3.2"/><circle class="fg-f-or" cx="40" cy="80" r="3.2"/><circle class="fg-f-or" cx="56" cy="88" r="3.2"/><circle class="fg-f-or" cx="30" cy="98" r="3.2"/><circle class="fg-f-or" cx="52" cy="102" r="3.2"/>
<rect class="fg-f-terra" x="86" y="58" width="7" height="7" rx="1.5" transform="rotate(20 89 61)"/><rect class="fg-f-terra" x="104" y="66" width="7" height="7" rx="1.5" transform="rotate(20 107 69)"/><rect class="fg-f-terra" x="88" y="82" width="7" height="7" rx="1.5" transform="rotate(20 91 85)"/><rect class="fg-f-terra" x="106" y="94" width="7" height="7" rx="1.5" transform="rotate(20 109 97)"/><rect class="fg-f-terra" x="90" y="100" width="7" height="7" rx="1.5" transform="rotate(20 93 103)"/>
<path class="fg-t-axe" d="M136 78L170 78" marker-end="url(#fg-fl-encre)"/>
<rect class="fg-f-vert-l fg-t-vert fg-t-epais fg-tirets" x="176" y="32" width="120" height="92" rx="16"/>
<circle class="fg-f-or" cx="198" cy="58" r="3.2"/><circle class="fg-f-or" cx="218" cy="74" r="3.2"/><circle class="fg-f-or" cx="262" cy="62" r="3.2"/><circle class="fg-f-or" cx="276" cy="86" r="3.2"/><circle class="fg-f-or" cx="206" cy="98" r="3.2"/><circle class="fg-f-or" cx="240" cy="106" r="3.2"/><circle class="fg-f-or" cx="282" cy="108" r="3.2"/>
<rect class="fg-f-terra" x="208" y="56" width="7" height="7" rx="1.5" transform="rotate(20 211 59)"/><rect class="fg-f-terra" x="230" y="82" width="7" height="7" rx="1.5" transform="rotate(20 233 85)"/><rect class="fg-f-terra" x="252" y="78" width="7" height="7" rx="1.5" transform="rotate(20 255 81)"/><rect class="fg-f-terra" x="266" y="98" width="7" height="7" rx="1.5" transform="rotate(20 269 101)"/><rect class="fg-f-terra" x="218" y="106" width="7" height="7" rx="1.5" transform="rotate(20 221 109)"/><rect class="fg-f-terra" x="190" y="78" width="7" height="7" rx="1.5" transform="rotate(20 193 81)"/>
<path class="fg-f-doux fg-t-encre" d="M246 28L256 28L240 138L232 138Z"/>
<rect class="fg-f-or" x="12" y="134" width="10" height="10" rx="2"/>
<text class="fg-txt fg-txt-s" x="28" y="143" text-anchor="start">isoalliine</text>
<rect class="fg-f-terra" x="12" y="150" width="10" height="10" rx="2"/>
<text class="fg-txt fg-txt-s" x="28" y="159" text-anchor="start">alliinase (l'enzyme)</text>
<path class="fg-t-axe" d="M262 128L262 170" marker-end="url(#fg-fl-encre)"/>
<rect class="fg-f-terra-l fg-t-terra" x="40" y="174" width="240" height="58" rx="10"/>
<text class="fg-txt fg-txt-b fg-txt-terra" x="160" y="194" text-anchor="middle">Acides sulféniques</text>
<text class="fg-txt fg-txt-s" x="160" y="210" text-anchor="middle"><tspan x="160">instables : l'enzyme a coupé</tspan><tspan x="160" dy="13.5">l'isoalliine</tspan></text>
<path class="fg-t-bleu" d="M96 236L80 266" marker-end="url(#fg-fl-bleu)"/>
<path class="fg-t-or" d="M224 236L240 266" marker-end="url(#fg-fl-or)"/>
<rect class="fg-f-bleu-l fg-t-bleu" x="6" y="270" width="152" height="68" rx="10"/>
<text class="fg-txt fg-txt-b fg-txt-bleu" x="82" y="290" text-anchor="middle">Les larmes</text>
<text class="fg-txt fg-txt-s" x="82" y="306" text-anchor="middle"><tspan x="82">propanethial-S-oxyde</tspan><tspan x="82" dy="13.5">(seconde enzyme)</tspan></text>
<rect class="fg-f-or-l fg-t-or" x="162" y="270" width="152" height="68" rx="10"/>
<text class="fg-txt fg-txt-b fg-txt-or" x="238" y="290" text-anchor="middle">Arrière-goût</text>
<text class="fg-txt fg-txt-s" x="238" y="306" text-anchor="middle"><tspan x="238">thiosulfinates, puis</tspan><tspan x="238" dy="13.5">disulfures</tspan></text>` },

  { ou: "pourquoi", apres: 1, type: "courbe", qualitative: true,
    titre: "Le piquant se forme tout de suite",
    legende: "Allure qualitative : l'essentiel du piquant se forme dans la minute qui suit la coupe. Un acide versé ensuite ne l'empêche plus ; il n'en extrait qu'une part et couvre le reste en bouche.",
    alt: "Courbe qualitative, sans valeurs chiffrées : la quantité de composés piquants formés, selon le temps écoulé depuis la coupe. Elle monte très vite dans la première minute, puis se stabilise à un haut niveau. Un repère vertical, bien plus tard, marque le moment où l'on ajoute le vinaigre ou le citron : le piquant est déjà formé, l'acide n'empêche plus rien.",
    x: { label: "Temps depuis la coupe", extremites: ["coupe", "plus tard"] },
    y: { label: "Composés piquants formés" },
    series: [ { nom: "Piquant formé", ton: "terra", aire: true,
      points: [[0, 0], [5, 0.5], [12, 0.88], [22, 1], [100, 1]] } ],
    zones: [ { de: 0, a: 22, label: "1re minute", ton: "terra" } ],
    reperes: [ { x: 64, label: "vinaigre ajouté ici", ton: "or" } ],
    notes: [ { x: 64, y: 1, texte: "trop tard pour l'empêcher", dx: 0, dy: 50, largeur: 120, ancre: "middle" } ] },

  { ou: "cas", type: "etapes",
    titre: "Adoucir un oignon cru",
    legende: "L'eau glacée emporte une partie du piquant sans toucher au croquant ; l'essorage évite de diluer la vinaigrette.",
    alt: "Trois étapes reliées par des flèches. Première étape : trancher des lamelles de 2 millimètres avec une lame bien aiguisée. Deuxième étape : les plonger 10 à 15 minutes dans l'eau glacée. Troisième étape : égoutter soigneusement et presser dans un linge avant d'ajouter à la vinaigrette.",
    etapes: [
      { libelle: "Trancher", desc: "lamelles de 2 mm, lame bien aiguisée", emoji: "🔪", ton: "vert" },
      { libelle: "Eau glacée", desc: "10 à 15 minutes", emoji: "🧊", ton: "bleu" },
      { libelle: "Essorer", desc: "égoutter, presser dans un linge", emoji: "🥣", ton: "or" }
    ] },

  { ou: "pourquoi", apres: 3, type: "comparaison",
    titre: "Eau claire, sel ou acide",
    legende: "Moins concentrée que la sève, l'eau claire entre dans les cellules et raffermit les lamelles ; le sel en tire l'eau sans ôter le mordant ; l'acide assouplit au bout d'un quart d'heure.",
    alt: "Trois cellules d'oignon côte à côte. Dans l'eau claire, la cellule est bien tendue : des flèches bleues montrent l'eau qui y entre, l'oignon ressort plus ferme. Dans le sel, la cellule est ridée et plus petite : des flèches montrent l'eau qui en sort, les lamelles deviennent molles et translucides, et le mordant reste entier. Dans l'acide, le contour de la cellule est en pointillés : passé un quart d'heure, l'oignon s'assouplit, et une partie des composés soufrés est extraite.",
    panneaux: [
      { label: "Eau claire", sous: "l'eau entre : plus ferme", ton: "bleu", vb: "0 0 100 64",
        corps: `<ellipse class="fg-f-vert-l fg-t-vert fg-t-epais" cx="50" cy="32" rx="26" ry="22"/>
<circle class="fg-f-vert" cx="50" cy="32" r="4" opacity=".5"/>
<path class="fg-t-bleu fg-t-epais" d="M6 32L18 32" marker-end="url(#fg-fl-bleu)"/>
<path class="fg-t-bleu fg-t-epais" d="M94 32L82 32" marker-end="url(#fg-fl-bleu)"/>
<path class="fg-t-bleu fg-t-epais" d="M20 8L28 14" marker-end="url(#fg-fl-bleu)"/>
<path class="fg-t-bleu fg-t-epais" d="M80 8L72 14" marker-end="url(#fg-fl-bleu)"/>
<path class="fg-t-bleu fg-t-epais" d="M20 56L28 50" marker-end="url(#fg-fl-bleu)"/>
<path class="fg-t-bleu fg-t-epais" d="M80 56L72 50" marker-end="url(#fg-fl-bleu)"/>` },
      { label: "Sel", sous: "tire l'eau : mou, mordant entier", ton: "or", vb: "0 0 100 64",
        corps: `<path class="fg-f-vert-l fg-t-vert fg-t-epais" d="M50 20C58 22 62 24 64 30C69 34 66 40 62 44C58 50 54 48 50 50C44 52 40 48 36 44C30 40 33 34 36 30C38 24 42 22 50 20Z"/>
<circle class="fg-f-vert" cx="50" cy="35" r="3" opacity=".5"/>
<path class="fg-t-or fg-t-epais" d="M28 32L12 32" marker-end="url(#fg-fl-or)"/>
<path class="fg-t-or fg-t-epais" d="M72 32L88 32" marker-end="url(#fg-fl-or)"/>
<path class="fg-t-or fg-t-epais" d="M32 20L22 12" marker-end="url(#fg-fl-or)"/>
<path class="fg-t-or fg-t-epais" d="M68 20L78 12" marker-end="url(#fg-fl-or)"/>
<path class="fg-t-or fg-t-epais" d="M32 48L22 56" marker-end="url(#fg-fl-or)"/>
<path class="fg-t-or fg-t-epais" d="M68 48L78 56" marker-end="url(#fg-fl-or)"/>` },
      { label: "Acide", sous: "assouplit après un quart d'heure", ton: "terra", vb: "0 0 100 64",
        corps: `<ellipse class="fg-f-vert-l fg-t-vert fg-t-epais fg-tirets" cx="44" cy="32" rx="26" ry="20"/>
<circle class="fg-f-vert" cx="44" cy="32" r="3.4" opacity=".5"/>
<circle class="fg-f-terra" cx="78" cy="22" r="2.4"/><circle class="fg-f-terra" cx="86" cy="34" r="2.4"/><circle class="fg-f-terra" cx="76" cy="44" r="2.4"/><circle class="fg-f-terra" cx="92" cy="48" r="2.4"/>` }
    ] }
];

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

/* (figures de la famille) */

/* ===== fin Froid, gras & sécurité ===== */



/* ===== Vue d'ensemble ===== */

/* (figures transversales de l'onglet Savoirs) */

/* ===== fin Vue d'ensemble ===== */
