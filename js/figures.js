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

FIGURES["eau-coloration"] = [
  { ou: "tete", type: "svg", vb: "0 0 320 346",
    titre: "Deux poêles, deux destins",
    legende: "Regardez le dessous des morceaux : dans la poêle tassée, l'eau forme un film qui retient la surface à 100 °C ; avec de l'air autour, la vapeur s'en va et la face posée peut brunir.",
    alt: "Deux poêles en coupe, l'une au-dessus de l'autre. En haut, la poêle surchargée : cinq morceaux se touchent sur toute la largeur, un film d'eau les sépare du fond et des volutes de vapeur s'élèvent, serrées. La surface reste à 100 °C au plus, l'aliment cuit à la vapeur. En bas, la poêle espacée : quatre morceaux laissent environ un tiers de la poêle libre, la vapeur s'échappe entre eux et leur face posée est brunie. La surface atteint 140 à 180 °C et peut colorer.",
    corps: `<text class="fg-txt fg-txt-b fg-txt-or" x="10" y="18">Poêle surchargée</text>
<g class="fg-t-bleu"><path d="M62 66q-7-9 0-18t0-18"/><path d="M112 66q-7-9 0-18t0-18"/><path d="M162 66q-7-9 0-18t0-18"/><path d="M212 66q-7-9 0-18t0-18"/><path d="M262 66q-7-9 0-18t0-18"/></g>
<rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="35" y="72" width="50" height="28" rx="4"/>
<rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="85" y="72" width="50" height="28" rx="4"/>
<rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="135" y="72" width="50" height="28" rx="4"/>
<rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="185" y="72" width="50" height="28" rx="4"/>
<rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="235" y="72" width="50" height="28" rx="4"/>
<rect class="fg-f-bleu-l fg-t-bleu fg-t-fin" x="26" y="100" width="268" height="6"/>
<path class="fg-t-encre fg-t-epais" d="M24 58V106M296 58V106M297 66H311"/>
<rect class="fg-f-doux fg-t-encre" x="22" y="106" width="276" height="9" rx="3"/>
<g class="fg-t-terra fg-t-epais"><path d="M70 136V121" marker-end="url(#fg-fl-terra)"/><path d="M130 136V121" marker-end="url(#fg-fl-terra)"/><path d="M190 136V121" marker-end="url(#fg-fl-terra)"/><path d="M250 136V121" marker-end="url(#fg-fl-terra)"/></g>
<text class="fg-txt fg-txt-bleu" x="160" y="158" text-anchor="middle">100 °C au plus : l'aliment cuit à la vapeur</text>
<path class="fg-t-doux fg-tirets" d="M10 171H310"/>
<text class="fg-txt fg-txt-b fg-txt-vert" x="10" y="194">Poêle espacée</text>
<text class="fg-txt-script fg-txt-vert" x="310" y="194" text-anchor="end">un tiers de libre</text>
<g class="fg-t-bleu"><path d="M92 250q-6-8 0-16t0-16"/><path d="M160 250q-6-8 0-16t0-16"/><path d="M228 250q-6-8 0-16t0-16"/></g>
<rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="35" y="254" width="46" height="28" rx="4"/>
<rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="103" y="254" width="46" height="28" rx="4"/>
<rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="171" y="254" width="46" height="28" rx="4"/>
<rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="239" y="254" width="46" height="28" rx="4"/>
<rect class="fg-f-terra" x="35" y="277" width="46" height="5" rx="2"/>
<rect class="fg-f-terra" x="103" y="277" width="46" height="5" rx="2"/>
<rect class="fg-f-terra" x="171" y="277" width="46" height="5" rx="2"/>
<rect class="fg-f-terra" x="239" y="277" width="46" height="5" rx="2"/>
<path class="fg-t-encre fg-t-epais" d="M24 234V282M296 234V282M297 242H311"/>
<rect class="fg-f-doux fg-t-encre" x="22" y="282" width="276" height="9" rx="3"/>
<g class="fg-t-terra fg-t-epais"><path d="M70 312V297" marker-end="url(#fg-fl-terra)"/><path d="M130 312V297" marker-end="url(#fg-fl-terra)"/><path d="M190 312V297" marker-end="url(#fg-fl-terra)"/><path d="M250 312V297" marker-end="url(#fg-fl-terra)"/></g>
<text class="fg-txt fg-txt-terra" x="160" y="334" text-anchor="middle">140 à 180 °C : la face posée peut colorer</text>` },

  { ou: "cas", type: "comparaison",
    titre: "Ce qui reste sur la surface",
    legende: "Seule la surface sèche peut monter au-delà de 100 °C : l'eau, ou la saumure d'un sel posé trop tôt, la maintient en dessous.",
    alt: "Trois morceaux posés sur le fond d'une poêle. Le premier, mouillé, porte un film d'eau : sa surface reste à 100 °C au plus, l'eau doit d'abord partir. Le deuxième, épongé au papier absorbant en dix secondes, a une surface sèche qui peut atteindre 140 à 180 °C et brunit. Le troisième, salé trop tôt, retient en surface une saumure qui maintient le morceau sous les 100 °C.",
    panneaux: [
      { label: "Mouillé", sous: "l'eau doit d'abord partir", ton: "bleu", vb: "10 10 80 52",
        corps: `<rect class="fg-f-doux fg-t-encre fg-t-fin" x="11" y="54" width="78" height="6" rx="2"/><rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="22" y="32" width="56" height="22" rx="5"/><path class="fg-f-bleu-l fg-t-bleu" d="M23 32Q50 16 77 32Z"/><circle class="fg-f-bleu" cx="38" cy="29" r="1.8"/><circle class="fg-f-bleu" cx="58" cy="26" r="1.8"/>` },
      { label: "Épongé", sous: "dix secondes au papier", ton: "vert", vb: "10 10 80 52",
        corps: `<rect class="fg-f-doux fg-t-encre fg-t-fin" x="11" y="54" width="78" height="6" rx="2"/><rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="22" y="32" width="56" height="22" rx="5"/><path class="fg-t-terra fg-t-tres-epais" d="M27 31H73"/>` },
      { label: "Salé trop tôt", sous: "la saumure retient la surface", ton: "or", vb: "10 10 80 52",
        corps: `<rect class="fg-f-doux fg-t-encre fg-t-fin" x="11" y="54" width="78" height="6" rx="2"/><rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="22" y="32" width="56" height="22" rx="5"/><path class="fg-f-bleu-l fg-t-bleu" d="M23 32Q50 20 77 32Z"/><rect class="fg-f-or" x="35" y="25" width="4" height="4" rx="1"/><rect class="fg-f-or" x="48" y="23" width="4" height="4" rx="1"/><rect class="fg-f-or" x="61" y="26" width="4" height="4" rx="1"/>` }
    ] },

  { ou: "pourquoi", apres: 2, type: "barres",
    titre: "Faire partir l'eau coûte cher",
    legende: "Pour un même gramme d'eau, la vaporisation consomme près de sept fois la chaleur qu'il faut pour le porter de 20 à 100 °C. Barres à l'échelle de ce rapport.",
    alt: "Deux barres comparées, pour un gramme d'eau. Vaporiser ce gramme consomme environ 2 260 joules : c'est la barre la plus longue. Le chauffer de 20 à 100 °C coûte près de sept fois moins : la barre est environ sept fois plus courte.",
    unite: "J",
    barres: [
      { label: "Vaporiser 1 g d'eau", valeur: 2260, texte: "2 260 J", ton: "terra", note: "La chaleur reçue part en évaporation, la température ne monte pas." },
      { label: "Chauffer 1 g de 20 à 100 °C", valeur: 323, texte: "près de 7 fois moins", ton: "bleu" }
    ] },

  { ou: "pourquoi", apres: 3, type: "courbe", qualitative: true,
    titre: "Un palier à 100 °C",
    legende: "Allure qualitative : tant qu'il reste de l'eau, la surface stagne à 100 °C. Plus la poêle est chargée, plus ce palier dure, et plus la coloration, qui demande 140 à 180 °C, tarde.",
    alt: "Courbe de la température de la surface au fil de la cuisson, sans valeurs de temps. Les deux courbes partent de 20 °C et montent vers 100 °C. Dans la poêle surchargée, la température reste longtemps à 100 °C, le temps que l'eau s'évapore, puis remonte tard et lentement vers la zone de coloration. Dans la poêle espacée, le palier est court : la surface atteint vite 140 à 180 °C et colore. Allure qualitative.",
    x: { label: "Temps de cuisson", extremites: ["on pose", "plus tard"] },
    y: { label: "Température de la surface", min: 20, max: 200, unite: "°C", graduations: [100, 140, 180] },
    series: [
      { nom: "Poêle surchargée", ton: "bleu", points: [[0, 22], [8, 70], [16, 100], [40, 100], [66, 100], [84, 112], [100, 130]] },
      { nom: "Poêle espacée", ton: "terra", points: [[0, 22], [6, 75], [12, 100], [22, 100], [34, 128], [50, 160], [100, 172]] }
    ],
    reperes: [ { y: 100, ton: "bleu" }, { y: 140, ton: "terra" }, { y: 180, label: "coloration : 140 à 180 °C", ton: "terra" } ],
    notes: [ { x: 40, y: 100, texte: "l'eau s'évapore, la température stagne", dx: 0, dy: 38, largeur: 150, ancre: "middle" } ] }
];

FIGURES["deglacage"] = [
  { ou: "tete", type: "svg", vb: "0 0 320 362",
    titre: "Des sucs collés à la sauce",
    legende: "En haut, la pellicule brune, sèche et collée au métal ; en bas, la même poêle après le liquide chaud et la spatule : ce que la pellicule contenait est passé dans la sauce.",
    alt: "Schéma en deux temps, la poêle vue en coupe. Premier temps : la poêle est encore brûlante, sans liquide, et une pellicule brune, sèche et collée, les sucs, recouvre le fond. Une flèche descend vers le second temps, avec un liquide chaud et un coup de spatule. Second temps : le fond est couvert de liquide qui siffle et bout, une spatule gratte le fond et les sucs sont dispersés dans le liquide, dissous dans la sauce : leurs arômes de grillé y sont passés.",
    corps: `<text class="fg-txt fg-txt-b fg-txt-terra" x="10" y="18">1. Les sucs, collés au fond</text>
<path class="fg-t-encre fg-t-epais" d="M24 44V104M296 44V104M297 52H311"/>
<rect class="fg-f-doux fg-t-encre" x="22" y="104" width="276" height="9" rx="3"/>
<path class="fg-f-terra" d="M50 104C54 96 66 96 74 99S96 94 112 98S140 94 158 98S196 95 214 98S244 94 262 99S270 102 272 104Z"/>
<text class="fg-txt-script fg-txt-terra" x="160" y="68" text-anchor="middle">brun, sec, collé</text>
<path class="fg-t-axe" d="M160 74V90" marker-end="url(#fg-fl-encre)"/>
<g class="fg-t-terra fg-t-epais"><path d="M70 136V121" marker-end="url(#fg-fl-terra)"/><path d="M130 136V121" marker-end="url(#fg-fl-terra)"/><path d="M190 136V121" marker-end="url(#fg-fl-terra)"/><path d="M250 136V121" marker-end="url(#fg-fl-terra)"/></g>
<text class="fg-txt fg-txt-terra" x="160" y="156" text-anchor="middle">Poêle encore brûlante, sans liquide</text>
<path class="fg-t-bleu fg-t-epais" d="M44 168V194" marker-end="url(#fg-fl-bleu)"/>
<text class="fg-txt fg-txt-b fg-txt-bleu" x="60" y="186">Un liquide chaud, et on gratte</text>
<text class="fg-txt fg-txt-b fg-txt-vert" x="10" y="218">2. Les sucs, dans la sauce</text>
<path class="fg-t-encre fg-t-epais" d="M24 242V302M296 242V302M297 250H311"/>
<rect class="fg-f-bleu-l" x="26" y="268" width="268" height="34"/>
<path class="fg-t-bleu" d="M26 268q16.8-5 33.5 0t33.5 0t33.5 0t33.5 0t33.5 0t33.5 0t33.5 0t33.5 0"/>
<rect class="fg-f-doux fg-t-encre" x="22" y="302" width="276" height="9" rx="3"/>
<g class="fg-f-terra"><circle cx="58" cy="289" r="3"/><circle cx="80" cy="281" r="2"/><circle cx="102" cy="292" r="3.5"/><circle cx="126" cy="283" r="2.5"/><circle cx="148" cy="291" r="2"/><circle cx="170" cy="282" r="3"/><circle cx="238" cy="285" r="2.5"/><circle cx="262" cy="292" r="3"/><circle cx="278" cy="281" r="2"/></g>
<g class="fg-f-carte fg-t-bleu fg-t-fin"><circle cx="90" cy="275" r="3"/><circle cx="152" cy="276" r="2.5"/><circle cx="250" cy="274" r="3"/></g>
<g transform="translate(205 300) rotate(35)"><path class="fg-t-encre fg-t-tres-epais" d="M0 -34V-100"/><rect class="fg-f-doux fg-t-encre" x="-9" y="-34" width="18" height="34" rx="3"/></g>
<text class="fg-txt-script fg-txt-bleu" x="36" y="260">ça siffle, ça bout</text>
<text class="fg-txt fg-txt-vert" x="160" y="336" text-anchor="middle"><tspan x="160">Les sucs se dissolvent : leurs arômes</tspan><tspan x="160" dy="15">de grillé passent dans la sauce</tspan></text>` },

  { ou: "cas", type: "comparaison",
    titre: "À déglacer, ou à laver ?",
    legende: "Le brun foncé qui sent le grillé donne une sauce ; le noir âcre, jamais : son amertume passe dans le liquide et ne se rattrape plus.",
    alt: "Deux fonds de poêle en coupe, côte à côte. À gauche, des sucs brun foncé, avec des volutes vertes d'odeur de grillé : ils se déglacent très bien. À droite, un fond noir, avec des volutes âcres en zigzag : on ne déglace pas, on lave la poêle, car les composés amers de la pyrolyse passeraient dans le liquide.",
    panneaux: [
      { label: "Brun foncé", sous: "odeur de grillé : se déglace très bien", ton: "vert", vb: "0 4 100 60",
        corps: `<path class="fg-t-vert" d="M30 40q-5-6 0-12t0-12M50 38q-5-6 0-12t0-12M70 40q-5-6 0-12t0-12"/><path class="fg-f-terra" d="M12 54C14 46 24 46 32 49S52 45 64 48S84 46 88 54Z"/><rect class="fg-f-doux fg-t-encre fg-t-fin" x="6" y="54" width="88" height="6" rx="2"/>` },
      { label: "Noir", sous: "odeur âcre : à laver, pas à déglacer", ton: "terra", vb: "0 4 100 60",
        corps: `<path class="fg-t-terra" d="M30 42l-5-6l6-6l-5-6l5-6M50 40l-5-6l6-6l-5-6l5-6M70 42l-5-6l6-6l-5-6l5-6"/><path class="fg-f-encre" d="M12 54C14 46 24 46 32 49S52 45 64 48S84 46 88 54Z"/><rect class="fg-f-doux fg-t-encre fg-t-fin" x="6" y="54" width="88" height="6" rx="2"/>` }
    ] },

  { ou: "cas", type: "barres",
    titre: "Combien d'alcool reste-t-il ?",
    legende: "Part de l'alcool qui reste dans le plat, selon la cuisson : bien plus qu'on ne le croit, à savoir si des enfants passent à table.",
    alt: "Trois barres : la part de l'alcool qui reste dans le plat selon la cuisson. Après un flambage, il en reste près des trois quarts. Après un quart d'heure de mijotage, environ 40 %. Après plus de deux heures à découvert, on tombe vers 5 %.",
    unite: "%", max: 100,
    barres: [
      { label: "Après un flambage", valeur: 75, texte: "trois quarts", ton: "terra" },
      { label: "Après un quart d'heure de mijotage", valeur: 40, texte: "environ 40 %", ton: "or" },
      { label: "Après plus de deux heures à découvert", valeur: 5, texte: "vers 5 %", ton: "vert" }
    ] },

  { ou: "pourquoi", apres: 3, type: "echelle",
    titre: "Où le beurre monté se brise-t-il ?",
    legende: "La limite varie d'un livre à l'autre, d'une soixantaine à quatre-vingts degrés : en dessous de cette plage, la sauce reste onctueuse ; au-dessus, les gouttelettes fusionnent. La conduite ne change pas : hors du feu.",
    alt: "Règle graduée en degrés, de 60 à 80 °C. Sous 60 °C, l'émulsion de beurre reste onctueuse. Entre 60 et 80 °C se trouve la limite, que les sources situent différemment : une soixantaine de degrés pour certaines, quatre-vingts pour d'autres. Au-delà de 80 °C, les gouttelettes de gras fusionnent et la sauce devient grasse. Dans tous les cas, on monte le beurre hors du feu, sans jamais bouillir.",
    min: 50, max: 90, unite: "°C", label: "Température de la sauce",
    graduations: [60, 80],
    zones: [
      { de: 50, a: 60, label: "onctueuse", ton: "vert" },
      { de: 60, a: 80, label: "limite selon les sources", ton: "or" },
      { de: 80, a: 90, label: "sauce grasse", ton: "terra" }
    ],
    marqueurs: [
      { v: 60, label: "« une soixantaine »", ton: "or" },
      { v: 80, label: "« quatre-vingts »", ton: "or" }
    ] }
];

FIGURES["friture"] = [
  { ou: "tete", type: "svg", vb: "0 0 320 270",
    titre: "Coupe d'un beignet dans le bain",
    legende: "Les flèches bleues, c'est l'eau du beignet qui sort en vapeur : elle tient l'huile à distance et laisse derrière elle une croûte sèche, qui brunit. L'huile, elle, ne fait que transporter la chaleur.",
    alt: "Coupe d'un beignet plongé dans un bain d'huile à 170-180 °C. Au centre, un cœur humide, entouré d'une pâte tendre, puis d'une croûte sèche et brunie. Des flèches bleues partent du cœur vers l'extérieur : c'est l'eau qui se vaporise et sort, en formant des bulles qui montent dans l'huile. Cette vapeur crée une surpression qui repousse l'huile, figurée par un anneau en pointillés à distance de la croûte. Privée d'eau, la surface dépasse 100 °C et brunit.",
    corps: `<text class="fg-txt fg-txt-b fg-txt-or" x="10" y="20">Bain d'huile : 170 à 180 °C</text>
<rect class="fg-f-or-l fg-t-or" x="8" y="30" width="304" height="232" rx="14"/>
<ellipse class="fg-t-bleu fg-tirets fg-t-fin" cx="160" cy="150" rx="76" ry="58"/>
<ellipse class="fg-f-terra" cx="160" cy="150" rx="64" ry="49"/>
<ellipse class="fg-f-carte" cx="160" cy="150" rx="55" ry="40"/>
<ellipse class="fg-f-bleu-l fg-t-bleu fg-t-fin" cx="160" cy="150" rx="33" ry="22"/>
<g class="fg-f-bleu"><circle cx="148" cy="146" r="2"/><circle cx="168" cy="152" r="2"/><circle cx="158" cy="158" r="2"/><circle cx="172" cy="143" r="2"/></g>
<g class="fg-t-bleu"><path d="M160 112V88" marker-end="url(#fg-fl-bleu)"/><path d="M192 124L212 106" marker-end="url(#fg-fl-bleu)"/><path d="M128 124L108 106" marker-end="url(#fg-fl-bleu)"/><path d="M198 150H224" marker-end="url(#fg-fl-bleu)"/><path d="M122 150H96" marker-end="url(#fg-fl-bleu)"/><path d="M192 176L212 194" marker-end="url(#fg-fl-bleu)"/><path d="M128 176L108 194" marker-end="url(#fg-fl-bleu)"/><path d="M160 188V212" marker-end="url(#fg-fl-bleu)"/></g>
<g class="fg-f-carte fg-t-bleu fg-t-fin"><circle cx="136" cy="70" r="5"/><circle cx="158" cy="52" r="4"/><circle cx="186" cy="64" r="6"/><circle cx="206" cy="46" r="4"/><circle cx="116" cy="50" r="3.5"/><circle cx="216" cy="84" r="4.5"/></g>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-terra" x="14" y="116"><tspan x="14">Croûte sèche,</tspan><tspan x="14" dy="13.5">brunie</tspan></text>
<path class="fg-t-axe fg-t-fin" d="M70 128L106 138"/>
<circle class="fg-pt fg-f-terra" cx="106" cy="138" r="3.5"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-bleu" x="14" y="214">Cœur humide</text>
<path class="fg-t-axe fg-t-fin" d="M50 204L136 160"/>
<circle class="fg-pt fg-f-bleu" cx="136" cy="160" r="3.5"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-bleu" x="306" y="62" text-anchor="end"><tspan x="306">Bulles :</tspan><tspan x="306" dy="13.5">l'eau part</tspan><tspan x="306" dy="13.5">en vapeur</tspan></text>
<path class="fg-t-axe fg-t-fin" d="M244 56L222 48"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-bleu" x="306" y="146" text-anchor="end"><tspan x="306">Vapeur qui</tspan><tspan x="306" dy="13.5">repousse</tspan><tspan x="306" dy="13.5">l'huile</tspan></text>
<text class="fg-txt fg-txt-terra" x="160" y="238" text-anchor="middle"><tspan x="160">Privée d'eau, la surface dépasse</tspan><tspan x="160" dy="15">100 °C et brunit</tspan></text>` },

  { ou: "cas", type: "echelle",
    titre: "Quelle température pour le bain ?",
    legende: "La fenêtre est étroite : en dessous de 150 °C l'huile imbibe la pâte, au-delà de 190 °C elle s'oxyde et la croûte fonce avant que le cœur soit chaud.",
    alt: "Règle graduée de 150 à 190 °C. Sous 150 °C, la vapeur ne repousse plus l'huile : le beignet s'imbibe. Entre 170 et 180 °C se trouve la fenêtre idéale, où la vapeur sort assez fort sans que l'huile se dégrade trop vite. Au-delà de 190 °C, l'huile s'oxyde et la croûte fonce avant que le cœur soit chaud.",
    min: 140, max: 200, unite: "°C", label: "Température de l'huile",
    graduations: [150, 170, 180, 190],
    zones: [
      { de: 140, a: 150, ton: "or" },
      { de: 170, a: 180, label: "idéal", ton: "vert" },
      { de: 190, a: 200, ton: "terra" }
    ],
    marqueurs: [
      { v: 150, label: "Sous 150 °C : l'huile entre dans la pâte", ton: "or" },
      { v: 190, label: "Au-delà : l'huile s'oxyde, la croûte fonce avant le cœur", ton: "terra" }
    ] },

  { ou: "pourquoi", apres: 2, type: "etapes",
    titre: "Quand l'huile entre vraiment",
    legende: "L'aspiration se joue à la sortie du bain, pas dans la poêle : une croûte formée trop lentement, restée poreuse, boit d'autant plus.",
    alt: "Trois étapes qui se suivent. D'abord l'immersion : l'eau de l'aliment se vaporise, ce sont les bulles, et la surpression tient l'huile à distance. Ensuite la sortie du bain : l'aliment refroidit et la vapeur emprisonnée se condense. Enfin l'aspiration : la pression tombe et l'huile restée en surface est aspirée dans les pores de la croûte.",
    etapes: [
      { libelle: "Immersion", desc: "l'eau se vaporise, la surpression tient l'huile à distance", emoji: "💨", ton: "terra" },
      { libelle: "Sortie", desc: "l'aliment refroidit, la vapeur se condense", emoji: "❄️", ton: "bleu" },
      { libelle: "Aspiration", desc: "la pression tombe, l'huile entre dans les pores", emoji: "🫗", ton: "or" }
    ] },

  { ou: "pourquoi", apres: 4, type: "barres",
    titre: "Où l'huile entre-t-elle ?",
    legende: "Un ordre de grandeur mesuré sur des chips : l'essentiel de l'huile entre après la sortie du bain, d'où l'importance de l'égouttage.",
    alt: "Deux barres comparées, pour des chips. Pendant la friture, environ un cinquième de l'huile absorbée entre. Pendant le refroidissement, après la sortie du bain, les quatre cinquièmes restants. La part exacte de la capillarité, de la dépression et de l'huile collée en surface reste discutée.",
    unite: "%", max: 100,
    barres: [
      { label: "Pendant la friture", valeur: 20, texte: "un cinquième", ton: "terra" },
      { label: "Pendant le refroidissement", valeur: 80, texte: "quatre cinquièmes", ton: "or", note: "Le lieu est acquis ; le détail (capillarité, dépression, huile collée en surface) reste discuté." }
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

/* (figures de la famille) */

/* ===== fin Froid, gras & sécurité ===== */



/* ===== Vue d'ensemble ===== */

/* (figures transversales de l'onglet Savoirs) */

/* ===== fin Vue d'ensemble ===== */
