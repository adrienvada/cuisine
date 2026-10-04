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
                     fg-f-suie : le noir de brûlé (sucs, croûte, charbon), SOMBRE dans les deux
                     thèmes avec un liseré clair en sombre — fg-f-encre, lui, devient crème en
                     sombre : un « fond noir » y deviendrait blanc
     aplats clairs . fg-f-vert-l fg-f-or-l fg-f-terra-l fg-f-bleu-l (portent du texte)
                     fg-f-papier fg-f-doux fg-f-carte fg-f-aucun
     textes ........ fg-txt (13) + fg-txt-s (petit, 11,5) / fg-txt-b (gras) /
                     fg-txt-script (Caveat, annotation « faite main ») / fg-txt-serif ;
                     teinte fg-txt-vert fg-txt-or fg-txt-terra fg-txt-bleu fg-txt-doux ;
                     fg-halo (liseré de fond, sur un tracé) ; fg-txt-sur (sur un aplat plein vert)
     divers ........ fg-pt (un point : liseré de carte), fg-emoji
     flèches ....... marker-end="url(#fg-fl-encre)" : la pointe d'ARRIVÉE, au bout du tracé ;
                     marker-start="url(#fg-fd-encre)" : la pointe de DÉPART, pour une cote à
                     double flèche (<path d="M20 30L300 30" marker-start="url(#fg-fd-encre)"
                     marker-end="url(#fg-fl-encre)"/>). Tons : encre, vert, or, terra, bleu, doux.
                     Un <path> à plusieurs « M » ne porte qu'UNE pointe par bout (le début du
                     premier tracé, la fin du dernier) : une flèche par <path>. Un
                     <g class="fg-t-terra fg-t-epais"> propage son trait à tous ses enfants (et
                     marker-end, hérité, s'y met aussi : à ne poser que sur un enfant).
   Les identifiants sont réécrits par figure : #fg-fl-… et #fg-fd-… deviennent uniques dans la
   page, et un id que l'auteur pose lui-même s'écrit « fg-@-nom » (id="fg-@-halo",
   url(#fg-@-halo)).

   LE SENS DES COULEURS — la palette dit quelque chose, ne la détournez pas
   - terra = la chaleur, la coloration brune, l'amertume, le danger ;
   - or-l (le fond clair doré) = la chair crue, le gras, les sucres ;
   - bleu = l'eau et le froid ; vert = le végétal, l'amidon, ce qui va bien ;
   - une nuance plus PÂLE ne doit pas signifier « moins » si le texte ne le dit pas : une
     teinte claire est un autre ton (un fond), pas une quantité plus petite ;
   - un POURCENTAGE nomme toujours sa base : « 4 % dans la chair », « 5 % dans la phase
     aqueuse », jamais un « 4 % » nu.

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
        notes: [ { x: 55, y: 1, texte: "le plus rapide ici", dx: 24, dy: -26 } ] }  // dx, dy, largeur, ancre facultatifs
      Les coordonnées des points sont celles de l'échelle des axes (min, max
      par défaut : l'étendue des données). Un « x » en qualitatif est une échelle
      libre, 0 à 100 par exemple. Plusieurs séries : une légende s'ajoute seule.
      Plus :
      - zonesY: [ { de: 150, a: 180, label: "la bonne fenêtre", ton: "vert", ancre: "droite" } ]
        des BANDES HORIZONTALES (sur toute la largeur du tracé), étiquetées dans la bande, à
        gauche par défaut (ancre: "droite" pour l'autre bout) ;
      - reperes: [ { y: 100, label: "plafond", ton: "bleu", ancre: "gauche" } ] : l'étiquette
        d'un repère horizontal se pose à droite par défaut, à gauche avec ancre: "gauche" ;
      - une étiquette de zone (x) trop étroite pour sa bande ne se coupe plus en quatre lignes :
        elle passe AU-DESSUS du tracé, sur une ligne, centrée sur sa bande ;
      - qualitative + x.graduations : une courbe qualitative peut tout de même graduer son axe
        en choisissant les valeurs (x: { label, extremites: ["tôt", "tard"], min: 0, max: 100,
        graduations: [0, 50, 100] }) ; les extrémités passent alors sous les graduations ;
      - notes : dx est le décalage horizontal du texte, dy le décalage VERTICAL — négatif =
        VERS LE HAUT (défaut −26 : l'annotation au-dessus du point), positif = en dessous ;
        la flèche relie toujours l'annotation au point.

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
      Les étiquettes se répartissent seules au-dessus et en dessous de la règle ; un nombre
      n'est jamais séparé de son unité (« 20 g », « 12 heures » ne se coupent pas). Plus :
      - cote: "haut" | "bas", sur une zone OU un marqueur : force le côté de l'étiquette
        ({ v: 100, label: "…", cote: "bas" }) ; une zone dont on force le côté sort de la bande ;
      - coupures: [ { de: 100, a: 900 } ] : un AXE INTERROMPU. Les valeurs de 100 à 900 n'ont plus
        de place ; la règle se coupe en deux, avec le signe // (celui du thermomètre) et un
        blanc ; les deux bords de la coupure sont étiquetés, ce qui tombe dedans disparaît, une
        zone qui l'enjambe se dessine en deux morceaux ;
      - rangees: true : des zones qui se CHEVAUCHENT passent sur des pistes parallèles au lieu de
        se superposer (la première piste libre, de haut en bas) ;
      - une tige d'étiquette ne barre jamais une graduation : celle-ci se range à son côté.

   3. barres — barres horizontales comparatives, avec valeur et unité
      { ou: "reperes", type: "barres", titre: "…", legende: "…", alt: "…",
        unite: "g",                                           // max facultatif (le plus grand par défaut)
        barres: [ { label: "Poêle fine", valeur: 1, texte: "1 à 2 min", ton: "or", note: "…" },
                  { label: "Fonte", valeur: 4.5, texte: "4 à 5 min", ton: "terra" } ] }
      `texte` remplace la valeur affichée ; `note` est une ligne de détail sous la barre.
      Une barre peut être une PLAGE : { label: "Moyenne", de: 4, a: 5, texte: "4 à 5 min" },
      dessinée comme un segment avec ses deux bornes (deux disques) sur la piste ; sans
      `texte`, la valeur affichée est « 4 à 5 min ». `min` (0 par défaut) et `max` fixent l'échelle.

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
      Les SYMBOLES PARTAGÉS (plus bas) s'y appellent par <use href="#fg-sym-NOM" …/>.

   6. comparaison — deux ou trois panneaux côte à côte, avant/après ou bon/mauvais
      { ou: "reperes", type: "comparaison", titre: "…", legende: "…", alt: "…",
        fleche: false,                                        // true : des flèches entre les panneaux
        panneaux: [ { label: "Acide", sous: "coloration retardée", ton: "or",
                      vb: "0 0 100 64", corps: `<circle class="fg-f-terra" cx="50" cy="32" r="22" opacity=".3"/>` },
                    { label: "Alcalin", sous: "dore plus vite", ton: "terra",
                      vb: "0 0 100 64", corps: `<circle class="fg-f-terra" cx="50" cy="32" r="22"/>` } ] }
      Chaque panneau est un mini-SVG libre (`vb` et `corps`, comme le type svg)
      dans sa carte, avec son libellé en dessous.
      - Le TEXTE d'un panneau garde sa taille nominale (11,5 ; 13…) quelle que soit la largeur du
        panneau : le dessin est mis à l'échelle de sa carte, le texte non (le cadre en annule
        l'échelle). Le `vb` RECOMMANDÉ donne pourtant l'échelle 1, donc un dessin à la taille
        qu'on a tracée : sa largeur est celle de la zone de dessin — 134 pour deux panneaux,
        84 pour trois ; 128 et 77 si `fleche: true` ; 116 en une colonne. Un autre `vb` est mis à
        l'échelle (le cadre l'ajuste seul) : seul le dessin change de taille.
      - colonnes: 1 | 2 | 3 : le nombre de panneaux par rangée (le nombre de panneaux par
        défaut). `colonnes: 1` met chaque panneau sur une ligne — le dessin à gauche, le texte à
        droite, sur 160 unités : la disposition des TEXTES LONGS, qui se couperaient en six lignes
        dans une colonne étroite. `colonnes: 2` avec trois panneaux : deux, puis un.

   LES SYMBOLES PARTAGÉS — la bibliothèque (SYMBOLES, dans js/ui/figures.js)
   Un `corps` (svg libre, panneau de comparaison) appelle un symbole par
     <use href="#fg-sym-NOM" x="10" y="20" width="24" height="30"/>
   ou, pour le tourner, <use href="#fg-sym-NOM" transform="rotate(40 100 60)" x y width height/>.
   Le cadre n'injecte dans chaque figure que les <symbol> utilisés, avec des identifiants
   uniques par figure (comme les marqueurs). Chaque symbole est dessiné dans sa boîte à sa
   taille d'usage ; width et height le mettent à l'échelle, ses traits avec lui (un trait de
   2,6 reste de 2,6 à l'échelle 1). Le TON du symbole se choisit par une classe sur le <use> :
   class="fg-sy-vert" (ou or, terra, bleu, encre, doux) ; sans classe, il garde son ton par
   défaut. Aucune couleur en dur. Le vérificateur n'autorise <use> QU'avec href="#fg-sym-…"
   d'un symbole qui existe ; tout autre usage reste interdit.
     cuisine   poele (72×26, encre) · casserole (58×44, encre) · flamme (24×30, terra) ·
               vapeur (14×32, bleu) · goutte (16×22, bleu) · bulle (18×18, bleu) ·
               couteau (72×15, encre) · thermometre (14×40, terra)
     matière   cellule (56×44, vert : paroi, vacuole, noyau) · grain-sel (8×8, encre) ·
               cristal (24×24, encre) · bacterie (32×16, terra) · larve (24×24, terra : spirale) ·
               oeuf (24×30, or : contour) · feuille (30×24, vert) ·
               emulsifiant (16×46, bleu : tête qui aime l'eau en haut, queue grasse dessous) ·
               ion-plus (16×16, terra) · ion-moins (16×16, bleu)
     composés  grains-sel-sucre (184×8 : une rangée de 11 grains, sel et sucre en alternance) ·
               pelote (20×20, terra : une protéine repliée sur elle-même)
   Exemple : une couronne de molécules d'émulsifiant autour d'une gouttelette de rayon 36 —
     <g transform="translate(78 92)"><use href="#fg-sym-emulsifiant" transform="rotate(75)"
     x="-3" y="-42" width="6" height="17"/> … </g>   (rotate : l'angle de chaque molécule).
   La planche de tous les symboles, en clair et en sombre : node tools/planche-symboles.mjs <dossier>.

   Le zoom (un appui sur la figure, ou sur le bouton dans la ligne du titre : cible de 44 px,
   Échap ; sur un écran étroit la figure agrandie défile, une ombre et une ligne le disent) et
   l'apparition des tracés sont automatiques. Pour voir ce qu'on dessine : node
   tools/capturer-savoir.mjs <id> (captures claires et sombres dans un dossier ; signale texte
   trop petit ou coupé, chevauchements, bouton de zoom sur le dessin, texte barré par un tracé
   ou une ligne de repère). Le vérificateur (node tools/verifier-recettes.mjs) contrôle clés,
   types, titres, alt, `ou`, `apres`, les options des types, les <use> et l'absence de couleur
   en dur. */

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
<text class="fg-txt fg-txt-s" x="240" y="45" text-anchor="middle"><tspan x="240">le plus souvent la</tspan><tspan x="240" dy="13.5">lysine d'une protéine</tspan></text>
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
    legende: "Des ordres de grandeur, pas des seuils nets : lente vers 100 °C, visible à partir de 140 °C environ, franche entre 150 et 180 °C. Au-delà de 200 °C, la pyrolyse prend le dessus.",
    alt: "Règle graduée de 90 à 230 °C. La réaction est lente de 100 à 140 °C, visible de 140 à 150 °C, franche de 150 à 180 °C. De 180 à 200 °C, la fiche ne donne aucun repère. Au-delà de 200 °C, la pyrolyse prend le dessus et l'amertume arrive avant les arômes. Un marqueur rappelle qu'une pellicule d'eau liquide plafonne la surface à 100 °C.",
    min: 90, max: 230, unite: "°C", label: "Température de surface",
    graduations: [100, 140, 150, 180, 200],
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
    legende: "Illustration qualitative : un milieu alcalin accélère nettement la coloration ; une marinade acide la retarde.",
    alt: "Trois biscuits côte à côte, de plus en plus colorés. En milieu acide, par exemple une marinade, le biscuit est à peine coloré : la coloration est retardée. En milieu neutre, il est moyennement doré : c'est la référence. En milieu alcalin, avec une pointe de bicarbonate, il est franchement foncé : la dorure s'accélère nettement. Illustration qualitative.",
    panneaux: [
      { label: "Acide", sous: "marinade : coloration retardée", ton: "or", vb: "0 0 100 64",
        corps: `<circle class="fg-f-terra" cx="50" cy="32" r="25" opacity=".22"/><circle class="fg-t-terra" cx="50" cy="32" r="25"/><circle class="fg-f-carte" cx="40" cy="26" r="2.6"/><circle class="fg-f-carte" cx="58" cy="30" r="2.6"/><circle class="fg-f-carte" cx="47" cy="42" r="2.6"/>` },
      { label: "Neutre", sous: "la référence", ton: "doux", vb: "0 0 100 64",
        corps: `<circle class="fg-f-terra" cx="50" cy="32" r="25" opacity=".6"/><circle class="fg-t-terra" cx="50" cy="32" r="25"/><circle class="fg-f-carte" cx="40" cy="26" r="2.6"/><circle class="fg-f-carte" cx="58" cy="30" r="2.6"/><circle class="fg-f-carte" cx="47" cy="42" r="2.6"/>` },
      { label: "Alcalin", sous: "bicarbonate : dore nettement plus vite", ton: "terra", vb: "0 0 100 64",
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
    legende: "Seule la surface sèche peut monter au-delà de 100 °C : l'eau la maintient en dessous, la saumure d'un sel posé trop tôt aussi, mais l'effet est modeste.",
    alt: "Trois morceaux posés sur le fond d'une poêle. Le premier, mouillé, porte un film d'eau : sa surface reste à 100 °C au plus, l'eau doit d'abord partir. Le deuxième, épongé au papier absorbant en dix secondes, a une surface sèche qui peut atteindre 140 à 180 °C et brunit. Le troisième, salé trop tôt, retient en surface une saumure qui maintient le morceau sous les 100 °C, mais l'effet est modeste.",
    panneaux: [
      { label: "Mouillé", sous: "l'eau doit d'abord partir", ton: "bleu", vb: "10 10 80 52",
        corps: `<rect class="fg-f-doux fg-t-encre fg-t-fin" x="11" y="54" width="78" height="6" rx="2"/><rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="22" y="32" width="56" height="22" rx="5"/><path class="fg-f-bleu-l fg-t-bleu" d="M23 32Q50 16 77 32Z"/><circle class="fg-f-bleu" cx="38" cy="29" r="1.8"/><circle class="fg-f-bleu" cx="58" cy="26" r="1.8"/>` },
      { label: "Épongé", sous: "dix secondes au papier", ton: "vert", vb: "10 10 80 52",
        corps: `<rect class="fg-f-doux fg-t-encre fg-t-fin" x="11" y="54" width="78" height="6" rx="2"/><rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="22" y="32" width="56" height="22" rx="5"/><path class="fg-t-terra fg-t-tres-epais" d="M27 31H73"/>` },
      { label: "Salé trop tôt", sous: "la saumure retient la surface (effet modeste)", ton: "or", vb: "10 10 80 52",
        corps: `<rect class="fg-f-doux fg-t-encre fg-t-fin" x="11" y="54" width="78" height="6" rx="2"/><rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="22" y="32" width="56" height="22" rx="5"/><path class="fg-f-bleu-l fg-t-bleu" d="M23 32Q50 20 77 32Z"/><use href="#fg-sym-grain-sel" x="33" y="23" width="7" height="7"/><use href="#fg-sym-grain-sel" x="47" y="20" width="7" height="7"/><use href="#fg-sym-grain-sel" x="61" y="24" width="7" height="7"/>` }
    ] },

  { ou: "pourquoi", apres: 2, type: "barres",
    titre: "Faire partir l'eau coûte cher",
    legende: "Pour un même gramme d'eau, la vaporisation consomme près de sept fois la chaleur qu'il faut pour le porter de 20 à 100 °C. Barres à l'échelle de ce rapport.",
    alt: "Deux barres comparées, pour un gramme d'eau. Vaporiser ce gramme consomme environ 2 260 joules : c'est la barre la plus longue. Le chauffer de 20 à 100 °C coûte près de sept fois moins : la barre est près de sept fois plus courte.",
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
    notes: [ { x: 40, y: 100, texte: "l'eau s'évapore, la température stagne", dx: 0, dy: 38, largeur: 150, ancre: "middle", ton: "bleu" } ] }
];

FIGURES["deglacage"] = [
  { ou: "tete", type: "svg", vb: "0 0 320 378",
    titre: "Des sucs collés à la sauce",
    legende: "Schéma simplifié. En haut, la pellicule brune, sèche et collée au métal ; en bas, la même poêle après le liquide chaud et la spatule : ce que la pellicule contenait de soluble est passé dans la sauce.",
    alt: "Schéma en deux temps, la poêle vue en coupe. Premier temps : la poêle est encore brûlante, sans liquide, et une pellicule brune, sèche et collée, les sucs, recouvre le fond. Une flèche descend vers le second temps, avec un liquide chaud et un coup de spatule. Second temps : le fond est couvert de liquide qui siffle et bout, une spatule gratte le fond et les sucs sont dispersés dans le liquide : leurs composés solubles sont passés en solution, avec leurs arômes de grillé.",
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
<text class="fg-txt fg-txt-vert" x="160" y="336" text-anchor="middle"><tspan x="160">Les composés solubles passent en</tspan><tspan x="160" dy="15">solution : les arômes de grillé</tspan><tspan x="160" dy="15">gagnent la sauce</tspan></text>` },

  { ou: "cas", type: "comparaison",
    titre: "À déglacer, ou à laver ?",
    legende: "Le brun foncé qui sent le grillé donne une sauce ; le noir âcre, jamais : son amertume passe dans le liquide et ne se rattrape plus.",
    alt: "Deux fonds de poêle en coupe, côte à côte. À gauche, des sucs brun foncé, avec des volutes vertes d'odeur de grillé : ils se déglacent très bien. À droite, un fond noir, avec des volutes âcres en zigzag : on ne déglace pas, on lave la poêle, car les composés amers de la pyrolyse passeraient dans le liquide.",
    panneaux: [
      { label: "Brun foncé", sous: "odeur de grillé : se déglace très bien", ton: "vert", vb: "0 4 100 60",
        corps: `<path class="fg-t-vert" d="M30 40q-5-6 0-12t0-12M50 38q-5-6 0-12t0-12M70 40q-5-6 0-12t0-12"/><path class="fg-f-terra" d="M12 54C14 46 24 46 32 49S52 45 64 48S84 46 88 54Z"/><rect class="fg-f-doux fg-t-encre fg-t-fin" x="6" y="54" width="88" height="6" rx="2"/>` },
      { label: "Noir", sous: "odeur âcre : à laver, pas à déglacer", ton: "terra", vb: "0 4 100 60",
        corps: `<path class="fg-t-terra" d="M30 42l-5-6l6-6l-5-6l5-6M50 40l-5-6l6-6l-5-6l5-6M70 42l-5-6l6-6l-5-6l5-6"/><path class="fg-f-suie" d="M12 54C14 46 24 46 32 49S52 45 64 48S84 46 88 54Z"/><rect class="fg-f-doux fg-t-encre fg-t-fin" x="6" y="54" width="88" height="6" rx="2"/>` }
    ] },

  { ou: "cas", type: "barres",
    titre: "Combien d'alcool reste-t-il ?",
    legende: "Ordres de grandeur de la part d'alcool qui reste dans le plat, selon la cuisson : bien plus qu'on ne le croit, à savoir si des enfants passent à table.",
    alt: "Trois barres : la part de l'alcool qui reste dans le plat selon la cuisson. Après un flambage, il en reste près des trois quarts. Après un quart d'heure de mijotage, environ 40 %. Après plus de deux heures à découvert, on tombe vers 5 %.",
    unite: "%", max: 100,
    barres: [
      { label: "Après un flambage", valeur: 75, texte: "près des trois quarts", ton: "terra" },
      { label: "Après un quart d'heure de mijotage", valeur: 40, texte: "environ 40 %", ton: "or" },
      { label: "Après plus de deux heures à découvert", valeur: 5, texte: "vers 5 %", ton: "vert" }
    ] },

  { ou: "pourquoi", apres: 3, type: "echelle",
    titre: "Où le beurre monté se brise-t-il ?",
    legende: "La limite varie d'un livre à l'autre, d'une soixantaine à quatre-vingts degrés : en dessous de cette plage, la sauce reste onctueuse ; au-dessus, les gouttelettes fusionnent. La conduite ne change pas : hors du feu.",
    alt: "Règle graduée en degrés, de 50 à 90 °C, avec deux repères à 60 et 80 °C. Sous 60 °C, l'émulsion de beurre reste onctueuse. Entre 60 et 80 °C se trouve la limite, que les sources situent différemment : une soixantaine de degrés pour certaines, quatre-vingts pour d'autres. Au-delà de 80 °C, les gouttelettes de gras fusionnent et la sauce devient grasse. Dans tous les cas, on monte le beurre hors du feu, sans jamais bouillir.",
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
    legende: "Schéma simplifié. Les flèches bleues, c'est l'eau du beignet qui sort en vapeur : elle tient l'huile à distance et laisse derrière elle une croûte sèche, qui brunit. L'huile, elle, ne fait que transporter la chaleur.",
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
<text class="fg-txt fg-txt-s fg-txt-b" x="306" y="212" text-anchor="end">Pâte tendre</text>
<path class="fg-t-axe fg-t-fin" d="M258 206L200 162"/>
<circle class="fg-pt fg-f-encre" cx="200" cy="162" r="3.5"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-bleu" x="306" y="62" text-anchor="end"><tspan x="306">Bulles :</tspan><tspan x="306" dy="13.5">l'eau part</tspan><tspan x="306" dy="13.5">en vapeur</tspan></text>
<path class="fg-t-axe fg-t-fin" d="M244 56L222 48"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-bleu" x="306" y="146" text-anchor="end"><tspan x="306">Vapeur qui</tspan><tspan x="306" dy="13.5">repousse</tspan><tspan x="306" dy="13.5">l'huile</tspan></text>
<text class="fg-txt fg-txt-terra" x="160" y="238" text-anchor="middle"><tspan x="160">Privée d'eau, la surface dépasse</tspan><tspan x="160" dy="15">100 °C et brunit</tspan></text>` },

  { ou: "cas", type: "echelle",
    titre: "Quelle température pour le bain ?",
    legende: "La fenêtre est étroite : en dessous de 150 °C l'huile imbibe la pâte, au-delà de 190 °C elle s'oxyde et la croûte fonce avant que le cœur soit chaud.",
    alt: "Règle graduée de 150 à 190 °C. Sous 150 °C, la vapeur ne repousse plus l'huile : le beignet s'imbibe. Entre 170 et 180 °C se trouve la fenêtre usuelle, où la vapeur sort assez fort sans que l'huile se dégrade trop vite : la température usuelle des beignets. Au-delà de 190 °C, l'huile s'oxyde et la croûte fonce avant que le cœur soit chaud.",
    min: 140, max: 200, unite: "°C", label: "Température de l'huile",
    graduations: [150, 170, 180, 190],
    zones: [
      { de: 140, a: 150, ton: "or" },
      { de: 170, a: 180, label: "usuel", ton: "vert" },
      { de: 190, a: 200, ton: "terra" }
    ],
    marqueurs: [
      { v: 150, label: "Sous 150 °C : l'huile entre dans la pâte", ton: "or" },
      { v: 190, label: "Au-delà : l'huile s'oxyde, croûte brunie avant le cœur", ton: "terra" }
    ] },

  { ou: "pourquoi", apres: 2, type: "etapes",
    titre: "Quand l'huile entre vraiment",
    legende: "L'aspiration se joue à la sortie du bain, pas dans la poêle : une croûte formée trop lentement, restée poreuse, boit d'autant plus.",
    alt: "Trois étapes qui se suivent. D'abord l'immersion : l'eau de l'aliment se vaporise, ce sont les bulles, et la surpression tient l'huile à distance. Ensuite la sortie du bain : l'aliment refroidit et la vapeur emprisonnée se condense. Enfin l'aspiration : la pression tombe et l'huile restée en surface est aspirée dans les pores de la croûte.",
    etapes: [
      { libelle: "Immersion", desc: "l'eau se vaporise, la surpression tient l'huile à distance", emoji: "♨️", ton: "terra" },
      { libelle: "Sortie", desc: "l'aliment refroidit, la vapeur se condense", emoji: "❄️", ton: "bleu" },
      { libelle: "Aspiration", desc: "la pression tombe, l'huile entre dans les pores", emoji: "🛢️", ton: "or" }
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

FIGURES["torrefaction"] = [
  { ou: "tete", type: "svg", vb: "0 0 320 318",
    titre: "Ce que la chaleur sèche fait à une graine",
    legende: "Schéma simplifié. L'eau part d'abord ; puis, vers 140 à 160 °C, les sucres et les acides aminés brunissent, pendant que les huiles volatiles s'échappent. Le parfum qui monte de la poêle est celui que le plat ne retrouvera pas.",
    alt: "Coupe d'une graine, faite de cellules rangées et chauffée par en dessous, à sec. Trois flèches relient la graine à trois encadrés, pour dire ce qui s'y passe. En haut, en bleu : l'eau résiduelle est chassée d'abord, elle sort en vapeur. Au milieu, en brun : vers 140 à 160 degrés, les sucres et les acides aminés réagissent, c'est la réaction de Maillard, qui produit notamment des pyrazines, la note grillée. En bas, en or : les huiles essentielles des épices se volatilisent et partent dans l'air. Une dernière note, en bas à droite, rappelle que la chaleur fragilise les parois cellulaires : la graine devient cassante et se moud plus finement.",
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
<path class="fg-t-terra fg-t-epais" d="M34 282L34 252" marker-end="url(#fg-fl-terra)"/>
<path class="fg-t-terra fg-t-epais" d="M80 282L80 252" marker-end="url(#fg-fl-terra)"/>
<path class="fg-t-terra fg-t-epais" d="M126 282L126 252" marker-end="url(#fg-fl-terra)"/>
<circle class="fg-f-or" cx="16" cy="228" r="3.4"/><text class="fg-txt fg-txt-s" x="24" y="232" text-anchor="start">sucres</text>
<rect class="fg-f-terra" x="68" y="225" width="6" height="6" rx="1.5" transform="rotate(20 71 228)"/><text class="fg-txt fg-txt-s" x="80" y="232" text-anchor="start">acides aminés</text>
<text class="fg-txt-script fg-txt-terra" x="80" y="306" text-anchor="middle">chaleur sèche, sans gras</text>
<rect class="fg-f-bleu-l fg-t-bleu" x="168" y="6" width="116" height="58" rx="10"/>
<text class="fg-txt fg-txt-b fg-txt-bleu" x="178" y="26" text-anchor="start">D'abord, l'eau</text>
<text class="fg-txt fg-txt-s" x="178" y="42" text-anchor="start"><tspan x="178">l'eau résiduelle</tspan><tspan x="178" dy="13.5">part en vapeur</tspan></text>
<path class="fg-t-bleu" d="M112 32L164 34" marker-end="url(#fg-fl-bleu)"/>
<rect class="fg-f-terra-l fg-t-terra" x="168" y="76" width="144" height="76" rx="10"/>
<text class="fg-txt fg-txt-b fg-txt-terra" x="178" y="96" text-anchor="start">Maillard</text>
<text class="fg-txt fg-txt-s" x="178" y="112" text-anchor="start"><tspan x="178">vers 140 à 160 °C :</tspan><tspan x="178" dy="13.5">des pyrazines, la</tspan><tspan x="178" dy="13.5">note grillée</tspan></text>
<path class="fg-t-terra" d="M132 120L164 114" marker-end="url(#fg-fl-terra)"/>
<rect class="fg-f-or-l fg-t-or" x="168" y="164" width="144" height="76" rx="10"/>
<text class="fg-txt fg-txt-b fg-txt-or" x="178" y="184" text-anchor="start">Parfum volatil</text>
<text class="fg-txt fg-txt-s" x="178" y="200" text-anchor="start"><tspan x="178">les huiles</tspan><tspan x="178" dy="13.5">essentielles partent</tspan><tspan x="178" dy="13.5">dans l'air</tspan></text>
<path class="fg-t-or" d="M134 176L164 204" marker-end="url(#fg-fl-or)"/>
<rect class="fg-f-doux fg-t-doux" x="168" y="252" width="144" height="38" rx="10"/>
<text class="fg-txt fg-txt-s" x="240" y="268" text-anchor="middle"><tspan x="240">parois fragilisées :</tspan><tspan x="240" dy="13.5">la graine devient cassante</tspan></text>` },

  { ou: "pourquoi", apres: 2, type: "courbe", qualitative: true,
    titre: "La fenêtre avant l'amertume",
    legende: "Allure qualitative, sans durée chiffrée : les arômes grillés montent et culminent, les arômes volatils de l'épice s'en vont, et l'amertume, qui n'arrive qu'à la fin, ne se rattrape plus. On s'arrête dans la fenêtre.",
    alt: "Courbes qualitatives, sans valeurs chiffrées, selon la durée de chauffe, de courte à longue. Les notes grillées, en vert, montent, culminent vers le milieu puis retombent. Les arômes volatils de l'épice, en or, diminuent régulièrement : ils partent dans l'air. L'amertume, en brun, reste presque nulle puis grimpe en fin de chauffe. Une zone centrale marque la fenêtre, où le grillé approche son maximum avant que l'amertume n'apparaisse ; un repère y indique de couper le feu au premier parfum net.",
    x: { label: "Durée de chauffe", extremites: ["courte", "longue"] },
    y: { label: "Intensité perçue" },
    series: [
      { nom: "Notes grillées", ton: "vert", points: [[0, 0.02], [24, 0.3], [48, 0.82], [60, 1], [78, 0.76], [100, 0.4]] },
      { nom: "Arômes volatils", ton: "or", tirets: true, points: [[0, 0.78], [34, 0.62], [64, 0.36], [100, 0.1]] },
      { nom: "Amertume", ton: "terra", points: [[0, 0], [56, 0.03], [72, 0.2], [86, 0.62], [100, 1]] }
    ],
    zones: [ { de: 42, a: 68, ton: "vert" } ],
    reperes: [ { x: 52, label: "la fenêtre : coupez le feu", ton: "vert" } ] },

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
        corps: `<path class="fg-t-axe" d="M30 4V20" marker-end="url(#fg-fl-encre)"/><path class="fg-t-axe" d="M50 4V20" marker-end="url(#fg-fl-encre)"/><path class="fg-t-axe" d="M70 4V20" marker-end="url(#fg-fl-encre)"/>
<ellipse class="fg-f-bleu-l fg-t-bleu fg-t-epais" cx="50" cy="48" rx="40" ry="9"/>
<ellipse class="fg-f-terra" cx="30" cy="42" rx="6" ry="3.6"/><ellipse class="fg-f-terra" cx="42" cy="44" rx="6" ry="3.6" transform="rotate(-8 42 44)"/><ellipse class="fg-f-terra" cx="55" cy="43" rx="6" ry="3.6"/><ellipse class="fg-f-terra" cx="68" cy="42" rx="5" ry="3.4" transform="rotate(8 68 42)"/>` }
    ] },

  { ou: "reperes", type: "barres",
    titre: "Combien de temps, selon la méthode",
    legende: "La barre marque la durée la plus longue conseillée : au-delà, la chaleur résiduelle finit le travail. À sec, des minutes ; dans le gras, des secondes.",
    alt: "Cinq barres comparent les durées conseillées. Graines à la poêle, à feu moyen et en remuant : 2 à 4 minutes. Cerneaux à la poêle : 4 à 6 minutes. Fruits secs entiers au four à 150-160 degrés : 8 à 12 minutes. Épices moulues dans le gras, à feu moyen : 10 à 20 secondes, pas davantage. Graines entières dans le gras : 30 à 60 secondes. Les barres dans le gras sont de loin les plus courtes.",
    unite: "min",
    barres: [
      { label: "Graines, à la poêle", valeur: 4, texte: "2 à 4 min", ton: "terra", note: "feu moyen, en remuant" },
      { label: "Cerneaux, à la poêle", valeur: 6, texte: "4 à 6 min", ton: "terra", note: "feu moyen, en remuant" },
      { label: "Fruits secs entiers, au four", valeur: 12, texte: "8 à 12 min", ton: "terra", note: "150 à 160 °C, plaque secouée à mi-parcours" },
      { label: "Graines entières, dans le gras", valeur: 1, texte: "30 à 60 s", ton: "or", note: "feu moyen" },
      { label: "Épices moulues, dans le gras", valeur: 0.33, texte: "10 à 20 s", ton: "or", note: "feu moyen, pas davantage" }
    ] }
];

FIGURES["epices-gras"] = [
  { ou: "tete", type: "svg", vb: "0 0 320 298",
    titre: "Où vont les molécules d'une épice ?",
    legende: "Schéma simplifié. Même épice, même poudre, même chaleur : dans l'eau, ses molécules de goût ne passent presque pas ; dans le gras, elles se dissolvent puis se répartissent dans tout le plat.",
    alt: "Deux bols chauffés vus en coupe, côte à côte, avec chacun un petit tas de poudre d'épice au fond. À gauche, le bol d'eau chaude : les molécules de goût, de petits points bruns, restent presque toutes dans la poudre, car l'eau les dissout très mal. À droite, le bol de gras chaud : les mêmes molécules se sont dissoutes et se répartissent dans tout le liquide, jusqu'en haut du bol. En dessous, une légende précise que ces points figurent des molécules de goût liposolubles : la capsaïcine du piment, la pipérine du poivre et le cuminaldéhyde du cumin.",
    corps: `<text class="fg-txt fg-txt-b fg-txt-bleu" x="80" y="26" text-anchor="middle">Eau chaude</text>
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
<path class="fg-t-terra fg-t-fin" d="M54 166C50 162 58 160 54 156M80 168C76 164 84 162 80 158M106 166C102 162 110 160 106 156"/>
<text class="fg-txt fg-txt-s" x="80" y="190" text-anchor="middle"><tspan x="80">l'eau les dissout</tspan><tspan x="80" dy="13.5">très mal : la poudre</tspan><tspan x="80" dy="13.5">garde son goût</tspan></text>
<text class="fg-txt fg-txt-s" x="240" y="190" text-anchor="middle"><tspan x="240">le gras chaud les</tspan><tspan x="240" dy="13.5">extrait, puis les</tspan><tspan x="240" dy="13.5">répartit partout</tspan></text>
<rect class="fg-f-or-l fg-t-or" x="10" y="238" width="300" height="52" rx="10"/>
<circle class="fg-f-terra" cx="26" cy="254" r="3.2"/>
<text class="fg-txt fg-txt-b fg-txt-or" x="36" y="258" text-anchor="start">molécule de goût liposoluble</text>
<text class="fg-txt fg-txt-s" x="20" y="274" text-anchor="start"><tspan x="20">capsaïcine, pipérine, cuminaldéhyde</tspan></text>` },

  { ou: "cas", type: "etapes",
    titre: "Verser le paprika sans le brûler",
    legende: "Le paprika est un fruit séché et sucré : ses sucres brunissent bien avant le seuil de caramélisation. On baisse donc la chaleur avant de verser, pas après : sous 150 °C, dix secondes au plus.",
    alt: "Trois étapes reliées par des flèches. Première étape : retirer la casserole du feu, le gras doit rester sous 150 °C. Deuxième étape : compter cinq secondes. Troisième étape : verser la poudre dans le gras encore chaud, dix secondes au plus : elle infuse sans roussir.",
    etapes: [
      { libelle: "Hors du feu", desc: "retirez la casserole : le gras doit rester sous 150 °C", emoji: "♨️", ton: "terra" },
      { libelle: "Cinq secondes", desc: "le temps de compter", emoji: "⏱️", ton: "or" },
      { libelle: "Versez la poudre", desc: "dans le gras encore chaud, 10 secondes au plus", emoji: "🌶️", ton: "vert" }
    ] },

  { ou: "cas", type: "comparaison",
    titre: "Le safran fait l'inverse",
    legende: "Ses pigments, les crocines, se dissolvent dans l'eau et non dans l'huile. On infuse dans un liquide vers 60 °C ; plus chaud ou plus long ne donne pas davantage de couleur, la crocine se dégrade.",
    alt: "Trois verres côte à côte contenant des pistils de safran. Dans l'huile, le liquide reste pâle : les crocines n'y passent pas. Dans l'eau vers 60 degrés, au bout d'une vingtaine de minutes, le liquide se teinte d'un jaune doré : les pigments sont passés. Dans un liquide plus chaud ou plus longtemps infusé, la couleur est aussi soutenue que dans le verre précédent, sans l'être davantage : la crocine se dégrade plus vite qu'elle ne passe.",
    panneaux: [
      { label: "Huile", sous: "les crocines n'y passent pas", ton: "or", vb: "0 0 100 64",
        corps: `<path class="fg-f-or-l" d="M32.8 22L32.8 52Q32.8 57 38 57L62 57Q67.2 57 67.2 52L67.2 22Z"/>
<path class="fg-t-or" d="M33 22H67"/><circle class="fg-f-or" cx="38" cy="30" r="2.2"/><circle class="fg-f-or" cx="58" cy="38" r="2.2"/><circle class="fg-f-or" cx="45" cy="47" r="2.2"/>
<path class="fg-t-axe fg-t-epais" d="M32 8L32 52Q32 58 38 58L62 58Q68 58 68 52L68 8"/>
<path class="fg-t-terra fg-t-epais" d="M42 55L47 44M51 55L50 42M58 55L63 46"/>` },
      { label: "Eau vers 60 °C", sous: "20 min : les pigments passent", ton: "bleu", vb: "0 0 100 64",
        corps: `<path class="fg-f-or" opacity=".75" d="M32.8 22L32.8 52Q32.8 57 38 57L62 57Q67.2 57 67.2 52L67.2 22Z"/>
<path class="fg-t-axe fg-t-epais" d="M32 8L32 52Q32 58 38 58L62 58Q68 58 68 52L68 8"/>
<path class="fg-t-terra fg-t-epais" d="M42 55L47 44M51 55L50 42M58 55L63 46"/>` },
      { label: "Plus chaud, plus long", sous: "pas plus de couleur : la crocine se dégrade", ton: "terra", vb: "0 0 100 64",
        corps: `<path class="fg-f-or" opacity=".75" d="M32.8 22L32.8 52Q32.8 57 38 57L62 57Q67.2 57 67.2 52L67.2 22Z"/>
<path class="fg-t-axe fg-t-epais" d="M32 8L32 52Q32 58 38 58L62 58Q68 58 68 52L68 8"/>
<path class="fg-t-terra fg-t-fin" d="M40 6C36 2 44 0 40 -4M50 6C46 2 54 0 50 -4M60 6C56 2 64 0 60 -4" transform="translate(0 4)"/>
<path class="fg-t-terra fg-t-epais" d="M42 55L47 44M51 55L50 42M58 55L63 46"/>` }
    ] },

  { ou: "reperes", type: "echelle",
    titre: "Quelle chaleur pour quelle épice ?",
    legende: "Moulues, les épices veulent un gras à 140-160 °C ; paprika et piment en poudre, sous 150 °C ; le safran, un liquide vers 60 °C. À 200 °C, les épices moulues noircissent.",
    alt: "Règle de température de 50 à 220 degrés Celsius. Un marqueur à 60 degrés : le safran s'infuse environ 20 minutes dans un liquide, jamais dans l'huile seule. Une zone verte de 140 à 160 degrés : le gras des autres épices moulues. Un marqueur à 150 degrés : paprika et piment en poudre, en dessous de 150 degrés. Une zone brune à partir de 200 degrés : les épices moulues noircissent et l'amertume ne se rattrape pas.",
    min: 50, max: 220, unite: "°C", label: "Température du gras ou du liquide",
    graduations: [60, 150, 200],
    zones: [
      { de: 140, a: 160, label: "autres épices moulues", ton: "vert", cote: "bas" },
      { de: 200, a: 220, label: "noircissent", ton: "terra", cote: "bas" }
    ],
    marqueurs: [
      { v: 60, label: "Safran : 20 min dans un liquide, pas d'huile", ton: "bleu", cote: "haut" },
      { v: 150, label: "Paprika, piment : en dessous de 150 °C", ton: "or", cote: "haut" },
      { v: 200, label: "À 200 °C : amer pour de bon", ton: "terra", cote: "haut" }
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
<rect class="fg-f-papier fg-t-doux" x="10" y="72" width="156" height="70"/>
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

  { ou: "cas", type: "comparaison", colonnes: 2,
    titre: "Zester d'abord, presser ensuite",
    legende: "Le fruit entier est ferme et se laisse zester proprement ; pressé, il devient mou et déchiré, et la lame n'emporte plus que du blanc amer.",
    alt: "Deux panneaux côte à côte. À gauche, le fruit entier, encore ferme : la lame glisse sur la peau et ne prend que le flavédo, une fine pelure se détache. À droite, le fruit pressé, mou, humide et déchiré, sur lequel coulent des gouttes de jus : la lame s'enfonce dans la partie blanche, l'albédo, et n'emporte plus que du blanc amer. L'ordre ne se rattrape pas.",
    panneaux: [
      { label: "Zester d'abord", sous: "fruit entier, ferme : la lame ne prend que le flavédo", ton: "vert", vb: "0 0 134 70",
        corps: `<ellipse class="fg-f-or-l fg-t-or fg-t-epais" cx="62" cy="46" rx="40" ry="22"/>
<path class="fg-t-or fg-t-fin" d="M30 44C44 36 80 36 94 44"/>
<g transform="rotate(-10 62 22)"><rect class="fg-f-doux fg-t-encre" x="22" y="14" width="80" height="9" rx="3"/></g>
<path class="fg-t-vert fg-t-epais" d="M100 30C112 28 120 34 118 46"/>` },
      { label: "Presser ensuite", sous: "mou et déchiré : la lame accroche le blanc amer", ton: "terra", vb: "0 0 134 70",
        corps: `<path class="fg-f-or-l fg-t-or fg-t-epais fg-tirets" d="M16 54C14 40 32 36 50 40C66 34 92 38 108 44C122 52 104 62 70 60C46 64 22 62 16 54Z"/>
<path class="fg-f-papier fg-t-doux" d="M32 52C46 46 80 46 96 52C84 58 48 58 32 52Z"/>
<g transform="rotate(-10 62 24)"><rect class="fg-f-doux fg-t-encre" x="26" y="26" width="76" height="9" rx="3"/></g>
<use href="#fg-sym-goutte" class="fg-sy-bleu" x="6" y="6" width="9" height="12"/><use href="#fg-sym-goutte" class="fg-sy-bleu" x="118" y="12" width="9" height="12"/>` }
    ] },

  { ou: "pourquoi", apres: 3, type: "comparaison",
    titre: "Où va le parfum d'un zeste ?",
    legende: "Un zeste nu perd son parfum en s'évaporant, sans arrêt. Dans l'huile ou dans le sucre, il est retenu : zestez donc directement au-dessus de la préparation.",
    alt: "Trois panneaux. À gauche, un zeste nu posé sur une planche : des vapeurs montent, le parfum s'évapore sans cesse. Au centre, un zeste dans l'huile : les composés liposolubles s'y dissolvent aussitôt, le parfum ne s'échappe plus. À droite, un zeste dans le sucre : les cristaux crèvent les poches d'huile et retiennent l'huile libérée, le parfum cesse là aussi de s'évaporer.",
    panneaux: [
      { label: "Zeste nu", sous: "le parfum s'évapore sans arrêt", ton: "terra", vb: "0 0 100 64",
        corps: `<path class="fg-t-or fg-t-fin" d="M30 30C26 24 34 20 30 14M50 28C46 22 54 18 50 10M70 30C66 24 74 20 70 14"/>
<rect class="fg-f-doux fg-t-doux" x="8" y="48" width="84" height="10" rx="3"/>
<path class="fg-f-vert-l fg-t-vert fg-t-epais" d="M24 46C34 36 50 36 60 42C66 46 70 46 78 42"/>` },
      { label: "Dans l'huile", sous: "le parfum se dissout dans le gras", ton: "or", vb: "0 0 100 64",
        corps: `<path class="fg-f-or-l fg-t-or fg-t-epais" d="M10 26L90 26C90 50 74 58 50 58C26 58 10 50 10 26Z"/>
<path class="fg-f-vert-l fg-t-vert fg-t-epais" d="M24 36C34 28 50 28 62 34C54 38 38 40 24 36Z"/>
<circle class="fg-f-or" cx="26" cy="46" r="2.2"/><circle class="fg-f-or" cx="40" cy="42" r="2.2"/><circle class="fg-f-or" cx="52" cy="50" r="2.2"/><circle class="fg-f-or" cx="64" cy="40" r="2.2"/><circle class="fg-f-or" cx="74" cy="46" r="2.2"/><circle class="fg-f-or" cx="62" cy="52" r="2.2"/><circle class="fg-f-or" cx="36" cy="52" r="2.2"/>` },
      { label: "Dans le sucre", sous: "poches crevées, parfum retenu", ton: "or", vb: "0 0 100 64",
        corps: `<rect class="fg-f-carte fg-t-doux" x="18" y="50" width="8" height="8" rx="1.5"/><rect class="fg-f-carte fg-t-doux" x="27" y="50" width="8" height="8" rx="1.5"/><rect class="fg-f-carte fg-t-doux" x="36" y="50" width="8" height="8" rx="1.5"/><rect class="fg-f-carte fg-t-doux" x="45" y="50" width="8" height="8" rx="1.5"/><rect class="fg-f-carte fg-t-doux" x="54" y="50" width="8" height="8" rx="1.5"/><rect class="fg-f-carte fg-t-doux" x="63" y="50" width="8" height="8" rx="1.5"/><rect class="fg-f-carte fg-t-doux" x="72" y="50" width="8" height="8" rx="1.5"/>
<rect class="fg-f-carte fg-t-doux" x="22" y="41" width="8" height="8" rx="1.5"/><rect class="fg-f-carte fg-t-doux" x="31" y="41" width="8" height="8" rx="1.5"/><rect class="fg-f-carte fg-t-doux" x="58" y="41" width="8" height="8" rx="1.5"/><rect class="fg-f-carte fg-t-doux" x="67" y="41" width="8" height="8" rx="1.5"/>
<path class="fg-f-vert-l fg-t-vert fg-t-epais" d="M34 38C42 28 56 28 64 38"/>
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
  { ou: "tete", type: "svg", vb: "0 0 320 352",
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
<rect class="fg-f-bleu-l fg-t-bleu" x="6" y="270" width="152" height="74" rx="10"/>
<text class="fg-txt fg-txt-b fg-txt-bleu" x="82" y="290" text-anchor="middle">Les larmes</text>
<text class="fg-txt fg-txt-s" x="82" y="306" text-anchor="middle"><tspan x="82">propanethial-S-oxyde,</tspan><tspan x="82" dy="13.5">formé par une</tspan><tspan x="82" dy="13.5">seconde enzyme</tspan></text>
<rect class="fg-f-or-l fg-t-or" x="162" y="270" width="152" height="74" rx="10"/>
<text class="fg-txt fg-txt-b fg-txt-or" x="238" y="290" text-anchor="middle">Arrière-goût</text>
<text class="fg-txt fg-txt-s" x="238" y="306" text-anchor="middle"><tspan x="238">thiosulfinates, puis</tspan><tspan x="238" dy="13.5">disulfures</tspan></text>` },

  { ou: "cas", type: "etapes",
    titre: "Adoucir un oignon cru",
    legende: "L'eau glacée emporte une partie du piquant sans toucher au croquant ; l'essorage évite de diluer la vinaigrette.",
    alt: "Trois étapes reliées par des flèches. Première étape : trancher des lamelles de 2 millimètres avec une lame bien aiguisée. Deuxième étape : les plonger 10 à 15 minutes dans l'eau glacée. Troisième étape : égoutter soigneusement et presser dans un linge avant d'ajouter à la vinaigrette.",
    etapes: [
      { libelle: "Trancher", desc: "lamelles de 2 mm, lame bien aiguisée", emoji: "🔪", ton: "vert" },
      { libelle: "Eau glacée", desc: "10 à 15 minutes", emoji: "🧊", ton: "bleu" },
      { libelle: "Essorer", desc: "égoutter, presser dans un linge", emoji: "🥣", ton: "or" }
    ] },

  { ou: "cas", type: "courbe", qualitative: true,
    titre: "Le piquant se forme tout de suite",
    legende: "Allure qualitative : l'essentiel du piquant se forme dans la minute qui suit la coupe. Un acide versé ensuite ne l'empêche plus ; il n'en extrait qu'une part et couvre le reste en bouche.",
    alt: "Courbe qualitative, sans valeurs chiffrées : la quantité de composés piquants formés, selon le temps écoulé depuis la coupe. Elle monte très vite dans la première minute, puis se stabilise à un haut niveau, sans s'arrêter tout à fait. Un repère vertical, bien plus tard, marque le moment où l'on ajoute le vinaigre ou le citron : le piquant est déjà formé, l'acide n'empêche plus rien.",
    x: { label: "Temps depuis la coupe", extremites: ["coupe", "plus tard"] },
    y: { label: "Composés piquants formés" },
    series: [ { nom: "Piquant formé", ton: "terra", aire: true,
      points: [[0, 0], [5, 0.5], [12, 0.88], [22, 0.97], [100, 1]] } ],
    zones: [ { de: 0, a: 22, label: "première minute", ton: "terra" } ],
    reperes: [ { x: 64, label: "vinaigre ajouté ici", ton: "or" } ],
    notes: [ { x: 64, y: 1, texte: "trop tard pour l'empêcher", dx: -12, dy: 50, largeur: 110, ancre: "end" } ] },

  { ou: "pourquoi", apres: 3, type: "comparaison",
    titre: "Eau claire, sel ou acide",
    legende: "Moins concentrée que la sève, l'eau claire entre dans les cellules et raffermit les lamelles ; le sel en tire l'eau sans ôter le mordant ; l'acide assouplit au bout d'un quart d'heure.",
    alt: "Trois cellules d'oignon côte à côte. Dans l'eau claire, la cellule est bien tendue : des flèches bleues montrent l'eau qui y entre, l'oignon ressort plus ferme. Dans le sel, la cellule est ridée et plus petite : des flèches montrent l'eau qui en sort, les lamelles deviennent molles et translucides, et le mordant reste entier. Dans l'acide, le contour de la cellule est en pointillés et des flèches en font sortir des points, les composés soufrés extraits : passé un quart d'heure, l'oignon s'assouplit.",
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
      { label: "Acide", sous: "extrait du soufré, assouplit après un quart d'heure", ton: "terra", vb: "0 0 100 64",
        corps: `<ellipse class="fg-f-vert-l fg-t-vert fg-t-epais fg-tirets" cx="44" cy="32" rx="26" ry="20"/>
<circle class="fg-f-vert" cx="44" cy="32" r="3.4" opacity=".5"/>
<path class="fg-t-terra fg-t-fin" d="M68 26L80 20" marker-end="url(#fg-fl-terra)"/><path class="fg-t-terra fg-t-fin" d="M70 34L82 34" marker-end="url(#fg-fl-terra)"/><path class="fg-t-terra fg-t-fin" d="M66 44L78 50" marker-end="url(#fg-fl-terra)"/>
<circle class="fg-f-terra" cx="86" cy="18" r="2.4"/><circle class="fg-f-terra" cx="88" cy="34" r="2.4"/><circle class="fg-f-terra" cx="84" cy="53" r="2.4"/>` }
    ] }
];

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
<g transform="translate(78 92)"><use href="#fg-sym-emulsifiant" transform="rotate(107)" x="-3" y="-42" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(125)" x="-3" y="-42" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(143)" x="-3" y="-42" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(161)" x="-3" y="-42" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(179)" x="-3" y="-42" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(197)" x="-3" y="-42" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(215)" x="-3" y="-42" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(233)" x="-3" y="-42" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(251)" x="-3" y="-42" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(269)" x="-3" y="-42" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(-73)" x="-3" y="-42" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(-55)" x="-3" y="-42" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(-37)" x="-3" y="-42" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(-19)" x="-3" y="-42" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(-1)" x="-3" y="-42" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(17)" x="-3" y="-42" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(35)" x="-3" y="-42" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(53)" x="-3" y="-42" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(71)" x="-3" y="-42" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(89)" x="-3" y="-42" width="6" height="17"/></g>
<circle class="fg-f-or-l fg-t-or" cx="176" cy="66" r="25"/>
<g transform="translate(176 66)"><use href="#fg-sym-emulsifiant" transform="rotate(107)" x="-3" y="-31" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(133)" x="-3" y="-31" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(158)" x="-3" y="-31" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(184)" x="-3" y="-31" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(210)" x="-3" y="-31" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(236)" x="-3" y="-31" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(261)" x="-3" y="-31" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(-73)" x="-3" y="-31" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(-47)" x="-3" y="-31" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(-22)" x="-3" y="-31" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(4)" x="-3" y="-31" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(30)" x="-3" y="-31" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(56)" x="-3" y="-31" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(81)" x="-3" y="-31" width="6" height="17"/></g>
<circle class="fg-f-or-l fg-t-or" cx="266" cy="104" r="31"/>
<g transform="translate(266 104)"><use href="#fg-sym-emulsifiant" transform="rotate(107)" x="-3" y="-37" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(128)" x="-3" y="-37" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(150)" x="-3" y="-37" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(171)" x="-3" y="-37" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(192)" x="-3" y="-37" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(213)" x="-3" y="-37" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(234)" x="-3" y="-37" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(255)" x="-3" y="-37" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(-83)" x="-3" y="-37" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(-62)" x="-3" y="-37" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(-41)" x="-3" y="-37" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(-20)" x="-3" y="-37" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(1)" x="-3" y="-37" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(23)" x="-3" y="-37" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(44)" x="-3" y="-37" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(65)" x="-3" y="-37" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(86)" x="-3" y="-37" width="6" height="17"/></g>
<circle class="fg-f-or-l fg-t-or" cx="190" cy="138" r="18"/>
<g transform="translate(190 138)"><use href="#fg-sym-emulsifiant" transform="rotate(107)" x="-3" y="-24" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(143)" x="-3" y="-24" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(179)" x="-3" y="-24" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(215)" x="-3" y="-24" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(251)" x="-3" y="-24" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(-73)" x="-3" y="-24" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(-37)" x="-3" y="-24" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(-1)" x="-3" y="-24" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(35)" x="-3" y="-24" width="6" height="17"/><use href="#fg-sym-emulsifiant" transform="rotate(71)" x="-3" y="-24" width="6" height="17"/></g>
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
<use href="#fg-sym-emulsifiant" x="50" y="217" width="16" height="46"/>
<use href="#fg-sym-emulsifiant" x="92" y="217" width="16" height="46"/>
<use href="#fg-sym-emulsifiant" x="134" y="217" width="16" height="46"/>
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
    alt: "Courbe qualitative, sans valeurs chiffrées. L'axe horizontal est le temps, depuis l'instant du fouet jusqu'à bien plus tard ; l'axe vertical est la part de l'huile restée dispersée en fines gouttelettes. Sans émulsifiant, la courbe terre cuite s'effondre presque aussitôt. Avec un émulsifiant, la courbe verte reste haute longtemps puis décline lentement : l'émulsion n'est jamais stable au sens strict, elle est retardée.",
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
    titre: "Combien d'huile se monte, selon la base ?",
    legende: "Une base seule ne dit pas tout : la moutarde monte 5 cl sans peine, ce n'est pas un plafond ; le jaune plafonne vers 20 cl parce que son eau sature, pas parce que ses émulsifiants s'épuisent.",
    alt: "Deux barres horizontales. Une cuillerée à café de moutarde monte sans peine 5 cl d'huile. Un jaune d'œuf seul en monte environ 20 cl, mais c'est un plafond, non la quantité facile de la moutarde : les deux barres ne mesurent pas la même chose. Sous la barre du jaune, une note : c'est son eau qui limite, pas son pouvoir émulsifiant ; en ajoutant de l'eau au fil de l'huile, il en tient bien davantage.",
    unite: "cl",
    barres: [
      { label: "Une cuillerée à café de moutarde", valeur: 5, texte: "5 cl", ton: "vert", note: "Ce qui se monte sans peine : pas un plafond." },
      { label: "Un jaune d'œuf seul : le plafond",
        valeur: 20,
        texte: "environ 20 cl",
        ton: "or",
        note: "Son eau sature : ajoutez de l'eau ou du vinaigre au fil de l'huile, et il en tient bien davantage." }
    ] },

  { ou: "pourquoi", apres: 2, type: "comparaison", colonnes: 2,
    titre: "Un liquide épais ralentit les rencontres",
    legende: "Schéma simplifié. La viscosité de la phase aqueuse est le troisième levier : les mucilages de la moutarde l'épaississent et ralentissent les rencontres entre gouttelettes. La part de chacun des mécanismes reste discutée.",
    alt: "Deux panneaux côte à côte. À gauche, une phase aqueuse fluide : quatre gouttelettes d'huile se déplacent librement, des flèches montrent qu'elles se rejoignent. À droite, une phase aqueuse épaissie par les mucilages de la moutarde, figurés par des lignes ondulées bleues : les mêmes gouttelettes sont retenues à distance les unes des autres et se rencontrent plus lentement. Schéma simplifié, la part respective des mécanismes reste discutée.",
    panneaux: [
      { label: "Phase fluide", sous: "les gouttelettes se rejoignent", ton: "terra", vb: "0 0 134 70",
        corps: `<circle class="fg-f-or-l fg-t-or fg-t-epais" cx="26" cy="24" r="13"/><circle class="fg-f-or-l fg-t-or fg-t-epais" cx="62" cy="46" r="13"/><circle class="fg-f-or-l fg-t-or fg-t-epais" cx="102" cy="22" r="13"/><circle class="fg-f-or-l fg-t-or fg-t-epais" cx="110" cy="54" r="9"/>
<path class="fg-t-terra fg-t-epais" d="M38 32L46 38" marker-end="url(#fg-fl-terra)"/><path class="fg-t-terra fg-t-epais" d="M90 28L74 40" marker-end="url(#fg-fl-terra)"/><path class="fg-t-terra fg-t-epais" d="M100 48L90 51" marker-end="url(#fg-fl-terra)"/>` },
      { label: "Phase épaissie", sous: "mucilages : les rencontres ralentissent", ton: "vert", vb: "0 0 134 70",
        corps: `<path class="fg-t-bleu fg-t-fin" d="M4 12q8-6 16 0t16 0t16 0t16 0t16 0t16 0t16 0"/><path class="fg-t-bleu fg-t-fin" d="M4 36q8-6 16 0t16 0t16 0t16 0t16 0t16 0t16 0"/><path class="fg-t-bleu fg-t-fin" d="M4 60q8-6 16 0t16 0t16 0t16 0t16 0t16 0t16 0"/>
<circle class="fg-f-or-l fg-t-or fg-t-epais" cx="26" cy="24" r="13"/><circle class="fg-f-or-l fg-t-or fg-t-epais" cx="62" cy="48" r="13"/><circle class="fg-f-or-l fg-t-or fg-t-epais" cx="102" cy="22" r="13"/><circle class="fg-f-or-l fg-t-or fg-t-epais" cx="110" cy="54" r="9"/>` }
    ] }
];

FIGURES["gluten"] = [
  { ou: "tete",
    type: "svg",
    vb: "0 0 320 350",
    titre: "Comment se forme le réseau",
    legende: "Schéma simplifié. Sèches, les deux protéines ne font rien ; l'eau les déplie et les rend liantes ; le pétrissage les aligne et multiplie les liaisons, jusqu'à un réseau qui retient le gaz.",
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
<use href="#fg-sym-bulle" x="55.4" y="177.4" width="9.1" height="9.1"/>
<use href="#fg-sym-bulle" x="115.4" y="175.4" width="9.1" height="9.1"/>
<use href="#fg-sym-bulle" x="87.4" y="211.4" width="9.1" height="9.1"/>
<use href="#fg-sym-bulle" x="135.4" y="195.4" width="9.1" height="9.1"/>
<use href="#fg-sym-bulle" x="195.4" y="187.4" width="9.1" height="9.1"/>
<use href="#fg-sym-bulle" x="245.4" y="177.4" width="9.1" height="9.1"/>
<use href="#fg-sym-bulle" x="285.4" y="205.4" width="9.1" height="9.1"/>
<use href="#fg-sym-bulle" x="171.4" y="211.4" width="9.1" height="9.1"/>
<use href="#fg-sym-bulle" x="39.4" y="213.4" width="9.1" height="9.1"/>
<use href="#fg-sym-bulle" x="265.4" y="193.4" width="9.1" height="9.1"/>
<use href="#fg-sym-bulle" x="231.4" y="213.4" width="9.1" height="9.1"/>
<path class="fg-t-terra fg-t-epais" d="M24 291q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q2 4.8 4 0"/>
<path class="fg-t-terra fg-t-epais" d="M24 305q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q2 -4.8 4 0"/>
<path class="fg-t-terra fg-t-epais" d="M24 319q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q2 4.8 4 0"/>
<path class="fg-t-terra fg-t-epais" d="M24 333q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q7 -4.8 14 0q7 4.8 14 0q2 -4.8 4 0"/>
<path class="fg-t-encre" d="M58 320L58 332"/>
<path class="fg-t-encre" d="M96 292L96 304"/>
<path class="fg-t-encre" d="M134 306L134 318"/>
<path class="fg-t-encre" d="M172 320L172 332"/>
<path class="fg-t-encre" d="M210 292L210 304"/>
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
    alt: "Trois étapes reliées par des flèches. Un : pétrir, ou faire des rabats ; les chaînes de protéines s'alignent et la pâte est sous tension. Deux : laisser reposer dix à vingt minutes ; les liaisons se réorganisent. Trois : la pâte détendue, qui s'étire sans se rétracter.",
    etapes: [
      { libelle: "Pétrir", desc: "ou faire des rabats : pâte sous tension", emoji: "🤲", ton: "terra" },
      { libelle: "Reposer", desc: "10 à 20 min : les liaisons se réorganisent", emoji: "⏳", ton: "bleu" },
      { libelle: "Détendue", desc: "elle s'étire sans se rétracter", emoji: "🫓", ton: "vert" }
    ] },

  { ou: "cas",
    type: "comparaison",
    titre: "Du réseau, ou presque pas",
    legende: "Illustration : un pain veut un réseau fort, qui retient les gaz et dessine des alvéoles. Un cookie ou un beignet n'en veut pas : on mélange le minimum.",
    alt: "Deux coupes côte à côte. À gauche, un pain ou une focaccia : une mie dorée percée de grandes alvéoles claires, signe d'un réseau de gluten bien développé. À droite, un cookie ou un beignet : une pâte serrée et compacte, presque sans alvéoles, mélangée au minimum.",
    panneaux: [
      { label: "Pain, focaccia",
        sous: "pétrissage ou rabats : un réseau qui retient les gaz",
        ton: "terra",
        vb: "0 0 120 80",
        corps: `<path class="fg-f-or-l fg-t-terra fg-t-epais" d="M12 40Q12 8 60 8Q108 8 108 40Q108 72 60 72Q12 72 12 40Z"/>
<ellipse class="fg-f-carte fg-t-terra fg-t-fin" cx="34" cy="30" rx="8" ry="6"/>
<ellipse class="fg-f-carte fg-t-terra fg-t-fin" cx="58" cy="24" rx="10" ry="7"/>
<ellipse class="fg-f-carte fg-t-terra fg-t-fin" cx="82" cy="32" rx="9" ry="7"/>
<ellipse class="fg-f-carte fg-t-terra fg-t-fin" cx="46" cy="46" rx="11" ry="8"/>
<ellipse class="fg-f-carte fg-t-terra fg-t-fin" cx="74" cy="52" rx="8" ry="6"/>
<ellipse class="fg-f-carte fg-t-terra fg-t-fin" cx="92" cy="48" rx="6" ry="5"/>
<ellipse class="fg-f-carte fg-t-terra fg-t-fin" cx="28" cy="54" rx="6" ry="5"/>
<ellipse class="fg-f-carte fg-t-terra fg-t-fin" cx="62" cy="62" rx="6" ry="4"/>` },
      { label: "Cookie, beignet",
        sous: "le minimum de mélange : le gras enrobe la farine",
        ton: "or",
        vb: "0 0 120 80",
        corps: `<path class="fg-f-or-l fg-t-or fg-t-epais" d="M12 40Q12 10 60 10Q108 10 108 40Q108 70 60 70Q12 70 12 40Z"/>
<circle class="fg-f-carte fg-t-terra fg-t-fin" cx="48" cy="38" r="1.6"/>
<circle class="fg-f-carte fg-t-terra fg-t-fin" cx="70" cy="44" r="1.6"/>
<circle class="fg-f-carte fg-t-terra fg-t-fin" cx="28" cy="46" r="1.6"/>
<circle class="fg-f-carte fg-t-terra fg-t-fin" cx="92" cy="52" r="1.6"/>
<circle class="fg-f-carte fg-t-terra fg-t-fin" cx="58" cy="62" r="1.6"/>
<circle class="fg-f-carte fg-t-terra fg-t-fin" cx="84" cy="22" r="1.6"/>` }
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
    legende: "Chauffé dans l'eau, le granule gonfle et libère son amylose (gélatinisation) ; en refroidissant, l'amylose se réassocie et recristallise (rétrogradation).",
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
<circle class="fg-f-or-l fg-t-or fg-t-epais" cx="48" cy="186" r="34"/>
<circle class="fg-t-or fg-t-fin fg-tirets" cx="48" cy="186" r="23"/>
<path class="fg-t-bleu fg-t-fin" d="M8 152L17 164" marker-end="url(#fg-fl-bleu)"/>
<path class="fg-t-bleu fg-t-fin" d="M6 186L14 186" marker-end="url(#fg-fl-bleu)"/>
<path class="fg-t-bleu fg-t-fin" d="M8 220L17 208" marker-end="url(#fg-fl-bleu)"/>
<path class="fg-t-terra fg-t-epais" d="M78 170q2.5 6.8 5 0q2.5 -6.8 5 0q2.5 6.8 5 0q2.5 -6.8 5 0q2 6.8 4 0" transform="rotate(-24 78 170)"/>
<path class="fg-t-terra fg-t-epais" d="M82 188q2.5 -6.8 5 0q2.5 6.8 5 0q2.5 -6.8 5 0q2.5 6.8 5 0q2.5 -6.8 5 0q1.5 6.8 3 0" transform="rotate(2 82 188)"/>
<path class="fg-t-terra fg-t-epais" d="M76 206q2.5 6.8 5 0q2.5 -6.8 5 0q2.5 6.8 5 0q2.5 -6.8 5 0q2.5 6.8 5 0q0.5 -6.8 1 0" transform="rotate(26 76 206)"/>
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
      { x: 58, y: 1, texte: "granules gonflés : le plus épais", dx: -56, dy: 24, largeur: 120, ancre: "end" }
    ] },

  { ou: "cas",
    type: "comparaison",
    titre: "Tièdes ou froides ?",
    legende: "Illustration qualitative : tièdes, les granules sont encore gonflés et la chair reste ouverte ; froides, l'amylose a rétrogradé et la structure s'est refermée. La goutte figure le liquide à absorber. Le mécanisme est solide, mais ce transfert n'a jamais été mesuré finement.",
    alt: "Deux coupes de pomme de terre côte à côte, chacune surmontée d'une goutte, qui figure le liquide à absorber. À gauche, les pommes de terre tièdes : des granules gonflés, espacés, la chair reste ouverte, et la goutte s'y enfonce par une flèche. À droite, les pommes de terre froides : des granules plus serrés, reliés par de petites croix d'amylose rétrogradée ; la structure est refermée et la goutte reste dessus.",
    panneaux: [
      { label: "Tièdes",
        sous: "granules gonflés, chair ouverte : elles boivent le liquide",
        ton: "vert",
        vb: "0 0 120 80",
        corps: `<rect class="fg-f-papier fg-t-doux fg-t-fin" x="6" y="22" width="108" height="52" rx="8"/>
<circle class="fg-f-or-l fg-t-or" cx="22" cy="46" r="10"/>
<circle class="fg-f-or-l fg-t-or" cx="48" cy="40" r="10"/>
<circle class="fg-f-or-l fg-t-or" cx="76" cy="48" r="10"/>
<circle class="fg-f-or-l fg-t-or" cx="100" cy="40" r="10"/>
<circle class="fg-f-or-l fg-t-or" cx="34" cy="62" r="10"/>
<circle class="fg-f-or-l fg-t-or" cx="64" cy="62" r="10"/>
<circle class="fg-f-or-l fg-t-or" cx="92" cy="62" r="10"/>
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
    legende: "Seuils approximatifs : celui de la gélatinisation dépend de l'amidon. À l'autre bout, la rétrogradation va le plus vite au froid du réfrigérateur ; au-delà de 60 °C, on refond les cristaux d'un pain rassis.",
    alt: "Quatre barres sur un axe de température en degrés Celsius. La rétrogradation est la plus rapide entre 0 et 4 degrés : le réfrigérateur rassit le pain plus vite que le placard. La gélatinisation de l'amidon de blé se fait entre 52 et 64 degrés environ ; celle de la pomme de terre, entre 58 et 66 degrés environ. Enfin, un pain rassis repassé au four au-delà de 60 degrés refond ses cristaux et retrouve sa souplesse, pour quelques heures.",
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
    legende: "Suivez l'eau (en bleu) : libre dans l'œuf cru, elle est emprisonnée par le réseau quand l'œuf prend, puis chassée quand la maille se resserre trop. Les points dorés figurent les zones qui s'accrochaient à l'eau.",
    alt: "Schéma en quatre cases numérotées. Un, cru : des protéines repliées en pelotes, libres dans l'eau, en bleu. Deux, dépliées : sous l'effet de la chaleur, les protéines se déroulent et exposent des zones, figurées par des points dorés, qui s'accrochaient à l'eau. Trois, liées : ces zones s'accrochent entre protéines voisines et forment un réseau qui emprisonne l'eau dans ses mailles ; l'œuf est pris. Quatre, surcuit : la maille se resserre, et l'eau est expulsée en dessous, en une flaque. Le résultat est irréversible.",
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
<use href="#fg-sym-pelote" x="32" y="46" width="20" height="20"/>
<use href="#fg-sym-pelote" x="68" y="38" width="20" height="20"/>
<use href="#fg-sym-pelote" x="104" y="50" width="20" height="20"/>
<use href="#fg-sym-pelote" x="50" y="68" width="20" height="20"/>
<use href="#fg-sym-pelote" x="90" y="72" width="20" height="20"/>
<use href="#fg-sym-pelote" x="122" y="34" width="20" height="20"/>
<circle class="fg-f-bleu" cx="32" cy="74" r="2"/>
<circle class="fg-f-bleu" cx="92" cy="62" r="2"/>
<circle class="fg-f-bleu" cx="74" cy="94" r="2"/>
<circle class="fg-f-bleu" cx="122" cy="74" r="2"/>
<circle class="fg-f-bleu" cx="48" cy="44" r="2"/>
<circle class="fg-f-bleu" cx="108" cy="42" r="2"/>
<circle class="fg-f-bleu" cx="28" cy="96" r="2"/>
<circle class="fg-f-bleu" cx="138" cy="92" r="2"/>
<path class="fg-t-terra fg-t-epais" d="M178 52q4 10 8 0q4 -10 8 0q4 10 8 0q4 -10 8 0q4 10 8 0q4 -10 8 0" transform="rotate(8 178 52)"/>
<path class="fg-t-terra fg-t-epais" d="M234 46q4.3 -10 8.5 0q4.3 10 8.5 0q4.3 -10 8.5 0q4.3 10 8.5 0q4.3 -10 8.5 0q4.3 10 8.5 0" transform="rotate(-6 234 46)"/>
<path class="fg-t-terra fg-t-epais" d="M180 80q4.3 10 8.5 0q4.3 -10 8.5 0q4.3 10 8.5 0q4.3 -10 8.5 0q4.3 10 8.5 0q4.3 -10 8.5 0" transform="rotate(-4 180 80)"/>
<path class="fg-t-terra fg-t-epais" d="M240 84q4 -10 8 0q4 10 8 0q4 -10 8 0q4 10 8 0q4 -10 8 0q4 10 8 0" transform="rotate(6 240 84)"/>
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
    legende: "Allure qualitative : en chauffant, le réseau se forme et emprisonne l'eau ; resserrée par la chaleur, la maille la rend. Le chemin du retour n'existe pas.",
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
        dx: 40,
        dy: -62,
        largeur: 100,
        ancre: "end",
        ton: "terra" }
    ] },

  { ou: "cas",
    type: "comparaison",
    titre: "Quand sortir la quiche ?",
    legende: "Illustration qualitative : sortez-la quand le centre tremble encore, la cuisson résiduelle fait le reste pendant le repos ; attendue trop longtemps, elle rend son eau.",
    alt: "Trois coupes d'un moule, de gauche à droite. À la sortie du four : la surface de l'appareil ondule, son centre tremble encore, ce que figurent quatre petits traits de vibration au-dessus ; c'est le bon moment. Après 5 à 10 minutes de repos : l'appareil est lisse et pris jusqu'au centre, la chaleur des bords gagnant le centre par la cuisson résiduelle, figurée par deux flèches. Si l'on attend trop : l'appareil est grainé, troué de petits vides, et une flaque d'eau claire apparaît en surface ; aucun repos ne le rattrape.",
    panneaux: [
      { label: "Sortie du four",
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
<path class="fg-t-encre fg-t-epais" d="M8 20V56a10 10 0 0 0 10 10H82a10 10 0 0 0 10 -10V20"/>
<path class="fg-t-terra fg-t-fin" d="M15 46H35" marker-end="url(#fg-fl-terra)"/>
<path class="fg-t-terra fg-t-fin" d="M85 46H65" marker-end="url(#fg-fl-terra)"/>` },
      { label: "Trop tard",
        sous: "grainée, elle rend son eau",
        ton: "terra",
        vb: "0 0 100 70",
        corps: `<path class="fg-f-or-l fg-t-terra fg-t-epais" d="M10 28H90V56a8 8 0 0 1 -8 8H18a8 8 0 0 1 -8 -8Z"/>
<circle class="fg-f-terra" opacity=".55" cx="24" cy="44" r="2.2"/>
<circle class="fg-f-terra" opacity=".55" cx="38" cy="54" r="1.8"/>
<circle class="fg-f-terra" opacity=".55" cx="52" cy="42" r="2.4"/>
<circle class="fg-f-terra" opacity=".55" cx="66" cy="52" r="2"/>
<circle class="fg-f-terra" opacity=".55" cx="78" cy="40" r="1.8"/>
<circle class="fg-f-terra" opacity=".55" cx="30" cy="36" r="1.6"/>
<circle class="fg-f-terra" opacity=".55" cx="60" cy="34" r="1.6"/>
<circle class="fg-f-terra" opacity=".55" cx="46" cy="56" r="1.6"/>
<path class="fg-f-bleu-l fg-t-bleu fg-t-fin" d="M16 30q34 -7 68 0q-34 6 -68 0Z"/>
<path class="fg-t-encre fg-t-epais" d="M8 20V56a10 10 0 0 0 10 10H82a10 10 0 0 0 10 -10V20"/>` }
    ] },

  { ou: "reperes",
    type: "svg",
    vb: "0 0 320 250",
    titre: "Où l'œuf prend-il ?",
    legende: "Le blanc prend progressivement : trouble dès 63 °C, ferme vers 70 °C. Le jaune prend vers 65-70 °C et reste crémeux au-delà. Dilué par la crème ou le lait, l'œuf demande bien plus de chaleur : 80 à 85 °C.",
    alt: "Trois barres sur un axe de température en degrés Celsius. Le blanc d'œuf prend progressivement entre 60 et 80 degrés : il devient laiteux, trouble, dès 63 degrés, puis ferme vers 70 degrés. Le jaune prend vers 65 à 70 degrés, et reste crémeux au-delà. Un appareil dilué, comme une quiche, un flan ou une crème prise, ne prend qu'entre 80 et 85 degrés.",
    corps: `<path class="fg-t-doux fg-t-fin fg-tirets" d="M60 30L60 192"/>
<path class="fg-t-doux fg-t-fin fg-tirets" d="M140 30L140 192"/>
<path class="fg-t-doux fg-t-fin fg-tirets" d="M220 30L220 192"/>
<text class="fg-txt fg-txt-b fg-halo" x="16" y="22">Blanc : il prend progressivement</text>
<rect class="fg-f-aucun fg-t-doux fg-t-fin fg-tirets" x="60" y="32" width="24" height="18"/>
<rect class="fg-f-or-l fg-t-or fg-t-fin" x="84" y="32" width="56" height="18"/>
<rect class="fg-f-terra-l fg-t-terra fg-t-fin" x="140" y="32" width="80" height="18"/>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-or" x="112" y="45" text-anchor="middle">laiteux</text>
<text class="fg-txt fg-txt-s fg-txt-b fg-txt-terra" x="180" y="45" text-anchor="middle">ferme</text>
<text class="fg-txt fg-txt-s" x="60" y="66" text-anchor="middle">60</text>
<text class="fg-txt fg-txt-s" x="84" y="66" text-anchor="middle">63</text>
<text class="fg-txt fg-txt-s" x="140" y="66" text-anchor="middle">70</text>
<text class="fg-txt fg-txt-s" x="220" y="66" text-anchor="middle">80</text>
<text class="fg-txt fg-txt-b fg-halo" x="16" y="94">Jaune : prend vers 65-70 °C</text>
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

FIGURES["levure-chimique"] = [
  { ou: "tete", type: "svg", vb: "0 0 320 292",
    titre: "Deux poudres qui attendent l'eau",
    legende: "À sec, la base et l'acide sont tenus à distance par la fécule. Au contact d'un liquide, ils se dissolvent et réagissent : une petite part du gaz carbonique part tout de suite, l'essentiel à la chaleur du four.",
    alt: "Schéma en deux temps. En haut, dans le sachet, à sec : trois poudres côte à côte, le bicarbonate (la base), la fécule de maïs qui sépare les deux et absorbe l'humidité, et un sel acide comme le phosphate acide de calcium. Une flèche descend, avec une goutte et la mention « un liquide ». En bas, dans la pâte : l'acide et la base se dissolvent et réagissent, ce qui libère du gaz carbonique, dessiné en bulles réparties dans la pâte ; une petite part part tout de suite, l'essentiel à la chaleur du four. En dessous : c'est une réaction chimique, sans pousse ni pétrissage.",
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
<text class="fg-txt fg-txt-s fg-txt-doux" x="160" y="282" text-anchor="middle">une réaction chimique : ni pousse ni pétrissage</text>` },

  { ou: "cas", type: "comparaison",
    titre: "Bicarbonate seul ou levure chimique ?",
    legende: "Le bicarbonate est une base pure : sans acide dans la recette, il lève mal. La levure chimique embarque le sien et fonctionne dans toute pâte.",
    alt: "Trois coupes de pâte côte à côte. À gauche, le bicarbonate seul, sans acide : quelques grains de base dans la pâte et une seule bulle ; il lui faut un acide, sinon il laisse un goût métallique et fait moins lever. Au centre, bicarbonate et acide de la recette (yaourt, miel, cacao, jus de citron) : la base et l'acide, séparés dans la pâte, réagissent et font de nombreuses bulles. À droite, la levure chimique : base, fécule et acide sont déjà mélangés dans la même poudre, donc de nombreuses bulles dans n'importe quelle pâte, acide ou non.",
    panneaux: [
      { label: "Bicarbonate seul", sous: "il lui faut un acide, sinon goût métallique", ton: "or", vb: "0 0 84 70",
        corps: `<path class="fg-f-or-l fg-t-or" d="M6 34h72v18a12 12 0 0 1-12 12H18A12 12 0 0 1 6 52z"/><circle class="fg-f-vert" cx="22" cy="46" r="3"/><circle class="fg-f-vert" cx="40" cy="53" r="3"/><circle class="fg-f-vert" cx="58" cy="45" r="3"/><circle class="fg-f-vert" cx="67" cy="54" r="3"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="44" cy="22" r="4.5"/>` },
      { label: "Bicarbonate + acide", sous: "yaourt, miel, cacao, citron : il lève", ton: "vert", vb: "0 0 84 70",
        corps: `<path class="fg-f-or-l fg-t-or" d="M6 34h72v18a12 12 0 0 1-12 12H18A12 12 0 0 1 6 52z"/><circle class="fg-f-vert" cx="20" cy="44" r="3"/><circle class="fg-f-vert" cx="52" cy="54" r="3"/><circle class="fg-f-vert" cx="68" cy="44" r="3"/><circle class="fg-f-or" cx="34" cy="50" r="3.5"/><circle class="fg-f-or" cx="46" cy="42" r="3.5"/><circle class="fg-f-or" cx="62" cy="54" r="3.5"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="18" cy="24" r="4.5"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="34" cy="14" r="5.5"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="52" cy="22" r="4.5"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="68" cy="11" r="4"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="72" cy="26" r="3.5"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="46" cy="5" r="3"/>` },
      { label: "Levure chimique", sous: "son acide est déjà dedans : toute pâte convient", ton: "vert", vb: "0 0 84 70",
        corps: `<path class="fg-f-or-l fg-t-or" d="M6 34h72v18a12 12 0 0 1-12 12H18A12 12 0 0 1 6 52z"/><circle class="fg-f-vert" cx="14" cy="44" r="3.2"/><circle class="fg-f-carte fg-t-doux fg-t-fin" cx="20.4" cy="44" r="2.4"/><circle class="fg-f-or" cx="26.8" cy="44" r="3.2"/><circle class="fg-f-vert" cx="34" cy="54" r="3.2"/><circle class="fg-f-carte fg-t-doux fg-t-fin" cx="40.4" cy="54" r="2.4"/><circle class="fg-f-or" cx="46.8" cy="54" r="3.2"/><circle class="fg-f-vert" cx="54" cy="43" r="3.2"/><circle class="fg-f-carte fg-t-doux fg-t-fin" cx="60.4" cy="43" r="2.4"/><circle class="fg-f-or" cx="66.8" cy="43" r="3.2"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="18" cy="24" r="4.5"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="34" cy="14" r="5.5"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="52" cy="22" r="4.5"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="68" cy="11" r="4"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="72" cy="26" r="3.5"/><circle class="fg-f-carte fg-t-axe fg-t-fin" cx="46" cy="5" r="3"/>` }
    ] },

  { ou: "pourquoi", apres: 2, type: "courbe", qualitative: true,
    titre: "Le gaz, du mélange au four",
    legende: "Allure qualitative : une petite part du gaz part dès l'hydratation ; l'essentiel, la seconde vague, n'est libéré qu'à la chaleur du four. Plus la pâte attend, plus le premier gaz s'échappe.",
    alt: "Courbe qualitative, sans valeurs chiffrées. L'axe horizontal suit le temps depuis l'hydratation de la pâte, de la température ambiante au four ; l'axe vertical est la vitesse à laquelle le gaz carbonique est libéré. Une première petite bosse apparaît dès l'hydratation, à température ambiante, puis la courbe retombe pendant l'attente. Elle repart ensuite franchement quand la pâte chauffe, à partir de 40 à 50 °C environ, et forme une grande seconde vague : c'est elle qui donne l'essentiel du gonflant.",
    x: { label: "Du mélange à la cuisson", extremites: ["hydratation", "four"] },
    y: { label: "Vitesse de libération du gaz" },
    series: [ { nom: "Double action", ton: "terra", aire: true,
      points: [[0, 0.02], [6, 0.3], [14, 0.2], [26, 0.05], [40, 0.05], [54, 0.3], [70, 0.82], [84, 1], [100, 0.92]] } ],
    zones: [ { de: 0, a: 42, label: "température ambiante", ton: "bleu" }, { de: 42, a: 100, label: "au four : dès 40-50 °C", ton: "terra" } ],
    notes: [
      { x: 7, y: 0.3, texte: "une petite part, dès l'hydratation", dx: 8, dy: -4, largeur: 130, ancre: "start" },
      { x: 84, y: 1, texte: "l'essentiel du gaz", dx: 0, dy: 64, largeur: 90, ancre: "middle" }
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
  { ou: "tete", type: "svg", vb: "0 0 320 240",
    titre: "Une assiette, plusieurs signaux",
    legende: "Une masse fondante, un éclat de croquant, une touche à une autre température : l'assiette envoie plus d'un signal. C'est un savoir-faire de cuisine, pas un résultat de laboratoire.",
    alt: "Coupe d'un bol de velouté, vu de côté. La masse du velouté est fondante et crémeuse. Posés dessus, des croûtons, des graines et des éclats de noix forment le croquant, sec et dur, qui casse sous la dent. À droite, une touche froide, par exemple une boule de glace, apporte une autre température. Choisir un contraste est un savoir-faire de cuisine, pas un résultat de laboratoire.",
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
<text class="fg-txt fg-txt-s" x="160" y="174" text-anchor="middle">fondant, crémeux</text>` },

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
      { x: 100, y: 0.3, texte: "il s'émousse", dx: -8, dy: -26, largeur: 110, ancre: "end" }
    ] },

  { ou: "cas", type: "comparaison",
    titre: "Où poser le croquant ?",
    legende: "Un croûton posé sur le velouté tient quelques minutes ; noyé dedans, quelques secondes. Une barrière grasse le sépare d'une sauce aqueuse.",
    alt: "Trois coupes de bol côte à côte, avec une sauce aqueuse en bleu. À gauche, des croûtons noyés dans la sauce : ils sont pâles et ramollis, ils tiennent quelques secondes. Au centre, des croûtons posés sur la sauce : ils tiennent quelques minutes. À droite, des croûtons posés sur une fine couche grasse dorée, elle-même sur la sauce : la barrière grasse les protège de l'eau. Dans tous les cas, on dresse le plus tard possible.",
    panneaux: [
      { label: "Noyé dedans", sous: "quelques secondes", ton: "terra", vb: "0 0 84 64",
        corps: `<rect class="fg-f-bleu-l fg-t-bleu" x="6" y="22" width="72" height="38" rx="9"/><rect class="fg-f-terra-l fg-t-terra" x="14" y="32" width="16" height="14" rx="3" transform="rotate(-8 22 39)" opacity=".5"/><rect class="fg-f-terra-l fg-t-terra" x="40" y="38" width="16" height="14" rx="3" transform="rotate(10 48 45)" opacity=".5"/><rect class="fg-f-terra-l fg-t-terra" x="58" y="30" width="14" height="13" rx="3" opacity=".5"/>` },
      { label: "Posé dessus", sous: "quelques minutes", ton: "or", vb: "0 0 84 64",
        corps: `<rect class="fg-f-bleu-l fg-t-bleu" x="6" y="30" width="72" height="30" rx="9"/><rect class="fg-f-terra-l fg-t-terra" x="12" y="15" width="16" height="15" rx="3" transform="rotate(-6 20 22)"/><rect class="fg-f-terra-l fg-t-terra" x="34" y="14" width="16" height="16" rx="3" transform="rotate(5 42 22)"/><rect class="fg-f-terra-l fg-t-terra" x="56" y="16" width="16" height="14" rx="3" transform="rotate(-4 64 23)"/>` },
      { label: "Sur du gras", sous: "une barrière contre l'eau", ton: "vert", vb: "0 0 84 64",
        corps: `<rect class="fg-f-bleu-l fg-t-bleu" x="6" y="34" width="72" height="26" rx="9"/><rect class="fg-f-or" x="6" y="29" width="72" height="6" rx="3"/><rect class="fg-f-terra-l fg-t-terra" x="12" y="14" width="16" height="15" rx="3" transform="rotate(-6 20 21)"/><rect class="fg-f-terra-l fg-t-terra" x="34" y="13" width="16" height="16" rx="3" transform="rotate(5 42 21)"/><rect class="fg-f-terra-l fg-t-terra" x="56" y="15" width="16" height="14" rx="3" transform="rotate(-4 64 22)"/>` }
    ] },

  { ou: "reperes", type: "svg", vb: "0 0 320 112",
    titre: "Combien de textures dans l'assiette ?",
    legende: "Deux textures franchement différentes suffisent ; passé trois, l'assiette devient un inventaire.",
    alt: "Quatre cases côte à côte, du nombre de textures franchement différentes dans l'assiette. Une seule : un seul signal, qui s'émousse. Deux : cela suffit. Trois : c'est le plafond. Quatre et plus : l'assiette devient un inventaire.",
    corps: `<rect class="fg-f-or-l fg-t-or" x="8" y="10" width="70" height="46" rx="10"/>
<rect class="fg-f-vert-l fg-t-vert" x="86" y="10" width="70" height="46" rx="10"/>
<rect class="fg-f-vert-l fg-t-vert" x="164" y="10" width="70" height="46" rx="10"/>
<rect class="fg-f-terra-l fg-t-terra" x="242" y="10" width="70" height="46" rx="10"/>
<text class="fg-txt fg-txt-xl fg-txt-b fg-txt-or" x="43" y="42" text-anchor="middle">1</text>
<text class="fg-txt fg-txt-xl fg-txt-b fg-txt-vert" x="121" y="42" text-anchor="middle">2</text>
<text class="fg-txt fg-txt-xl fg-txt-b fg-txt-vert" x="199" y="42" text-anchor="middle">3</text>
<text class="fg-txt fg-txt-xl fg-txt-b fg-txt-terra" x="277" y="42" text-anchor="middle">4+</text>
<text class="fg-txt fg-txt-s" x="43" y="76" text-anchor="middle"><tspan x="43">un seul</tspan><tspan x="43" dy="13.5">signal</tspan></text>
<text class="fg-txt fg-txt-s fg-txt-b" x="121" y="76" text-anchor="middle"><tspan x="121">cela</tspan><tspan x="121" dy="13.5">suffit</tspan></text>
<text class="fg-txt fg-txt-s" x="199" y="76" text-anchor="middle"><tspan x="199">c'est</tspan><tspan x="199" dy="13.5">le plafond</tspan></text>
<text class="fg-txt fg-txt-s" x="277" y="76" text-anchor="middle"><tspan x="277">un</tspan><tspan x="277" dy="13.5">inventaire</tspan></text>` }
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
<rect class="fg-f-vert-l fg-t-vert" x="8" y="224" width="90" height="84" rx="16"/>
<rect class="fg-f-vert-l fg-t-vert" x="222" y="224" width="90" height="84" rx="16"/>
<text class="fg-txt fg-txt-s" x="53" y="270" text-anchor="middle">cellule</text>
<text class="fg-txt fg-txt-s" x="267" y="270" text-anchor="middle">cellule</text>
<rect class="fg-f-doux" x="98" y="224" width="124" height="84"/>
<text class="fg-txt fg-txt-s fg-txt-or" x="160" y="240" text-anchor="middle">chaînes coupées</text>
<path class="fg-t-or fg-t-epais" d="M98 256q9-6 18 0t18 0"/>
<path class="fg-t-or fg-t-epais" d="M222 256q-9-6 -18 0t-18 0"/>
<path class="fg-t-or fg-t-epais" d="M98 272q9-6 18 0"/>
<path class="fg-t-or fg-t-epais" d="M222 272q-9-6 -18 0"/>
<path class="fg-t-or fg-t-epais" d="M98 288q9-6 18 0t18 0t18 0"/>
<path class="fg-t-or fg-t-epais" d="M222 288q-9-6 -18 0"/>` },

  { ou: "pourquoi", apres: 2, type: "echelle",
    titre: "Où le pH arrête la cuisson",
    legende: "Sous pH 4 environ, l'attendrissement s'arrête : la pectine tient. Tomate, vin, vinaigre et citron bloquent tous la cuisson. C'est une limite de la cuisson, pas du légume.",
    alt: "Règle graduée du pH du milieu de cuisson, avec un repère à pH 4 environ. À gauche de ce repère, en dessous de pH 4, l'attendrissement s'arrête : tomate, vin, vinaigre et citron bloquent tous la cuisson. À droite, vers la neutralité, la chaleur peut couper les chaînes de pectine et le légume s'attendrit.",
    min: 3, max: 7, label: "pH du milieu de cuisson",
    graduations: [4],
    zones: [
      { de: 3, a: 4, label: "bloqué", ton: "terra" },
      { de: 4, a: 7, label: "attendrissement possible", ton: "vert" }
    ],
    marqueurs: [
      { v: 4, label: "pH 4 environ", ton: "terra" },
      { v: 7, label: "proche de la neutralité", ton: "vert", cote: "bas" }
    ] },

  { ou: "pourquoi", apres: 3, type: "comparaison", fleche: true,
    titre: "Calcium et sodium",
    legende: "Schéma simplifié. Le calcium relie les chaînes de pectine ; le sodium prend sa place et desserre l'édifice. Une eau salée assouplit donc la peau au lieu de la durcir.",
    alt: "Deux panneaux reliés par une flèche. À gauche, eau calcaire : deux chaînes de pectine sont reliées par trois ions calcium, Ca2+, qui les pontent en pectate insoluble ; la peau reste ferme. À droite, eau salée : des ions sodium, Na+, échangent leur place avec le calcium accroché à la pectine ; le calcium est délogé, les chaînes ne sont plus pontées, l'édifice se desserre et la peau est plus souple.",
    panneaux: [
      { label: "Eau calcaire", sous: "Ca²⁺ ponte les chaînes : peau ferme", ton: "or", vb: "0 0 128 84",
        corps: `<path class="fg-t-or fg-t-epais" d="M10 12q9-6 18 0t18 0t18 0t18 0t18 0t18 0"/><path class="fg-t-or fg-t-epais" d="M10 72q9-6 18 0t18 0t18 0t18 0t18 0t18 0"/><path class="fg-t-axe" d="M26 13V27M26 57V71M64 13V27M64 57V71M102 13V27M102 57V71"/><circle class="fg-f-carte fg-t-encre" cx="26" cy="42" r="15"/><circle class="fg-f-carte fg-t-encre" cx="64" cy="42" r="15"/><circle class="fg-f-carte fg-t-encre" cx="102" cy="42" r="15"/><text class="fg-txt fg-txt-s fg-txt-encre" x="26" y="46" text-anchor="middle">Ca²⁺</text><text class="fg-txt fg-txt-s fg-txt-encre" x="64" y="46" text-anchor="middle">Ca²⁺</text><text class="fg-txt fg-txt-s fg-txt-encre" x="102" y="46" text-anchor="middle">Ca²⁺</text>` },
      { label: "Eau salée", sous: "Na⁺ prend la place : peau plus souple", ton: "vert", vb: "0 0 128 84",
        corps: `<path class="fg-t-or fg-t-epais" d="M10 8q9-6 18 0t18 0t18 0t18 0t18 0t18 0"/><path class="fg-t-or fg-t-epais" d="M10 76q9-6 18 0t18 0t18 0t18 0t18 0t18 0"/><path class="fg-t-axe" d="M28 9V21M100 63V75"/><circle class="fg-f-bleu-l fg-t-bleu" cx="28" cy="34" r="14"/><circle class="fg-f-bleu-l fg-t-bleu" cx="100" cy="50" r="14"/><text class="fg-txt fg-txt-s fg-txt-bleu" x="28" y="38" text-anchor="middle">Na⁺</text><text class="fg-txt fg-txt-s fg-txt-bleu" x="100" y="54" text-anchor="middle">Na⁺</text><circle class="fg-f-carte fg-t-encre fg-tirets" cx="64" cy="42" r="15" opacity=".5"/><text class="fg-txt fg-txt-s fg-txt-encre" x="64" y="46" text-anchor="middle" opacity=".6">Ca²⁺</text>` }
    ] },

  { ou: "cas", type: "etapes",
    titre: "Quand ajouter l'acide",
    legende: "Pour attendrir, l'acide va en fin de cuisson : ajouté avant, il bloque l'attendrissement, et aucune prolongation ne le rattrape.",
    alt: "Trois étapes, pour une graine ou un légume à attendrir. Première étape : cuire d'abord dans l'eau, sans acide. Deuxième étape : vérifier que la graine ou le légume est déjà tendre. Troisième étape seulement : ajouter la tomate, le vinaigre, le vin ou le citron.",
    etapes: [
      { libelle: "Cuire dans l'eau", desc: "sans acide", emoji: "🫘", ton: "bleu" },
      { libelle: "Goûter", desc: "déjà tendre ?", emoji: "🥄" },
      { libelle: "Puis l'acide", desc: "tomate, vinaigre, vin, citron", emoji: "🍅", ton: "or" }
    ] }
];

/* ===== fin Textures & liaisons ===== */



/* ===== Sel, acide & goût ===== */

FIGURES["osmose-sel"] = [
  {
    ou: "tete",
    type: "svg",
    vb: "0 0 320 258",
    titre: "L'eau sort d'abord, le sel entre ensuite",
    legende: "Le sel dissous attire l'eau de la cellule (osmose ; le pointillé marque la taille d'origine), puis ses ions diffusent vers l'intérieur. L'une est immédiate, l'autre demande des heures.",
    alt: "Schéma en deux temps d'une cellule végétale sous un film de solution salée, avec des grains de sel en surface. À gauche, l'eau sort : trois flèches bleues montent de la cellule vers la solution salée et la cellule se vide, son centre se rétracte, le pointillé montrant sa taille d'origine. La sortie d'eau est immédiate. À droite, le sel entre : trois flèches descendent de la solution vers la cellule, et les ions sodium et chlorure diffusent à l'intérieur, ce qui prend plusieurs heures.",
    corps: `<text class="fg-txt fg-txt-b fg-txt-bleu" x="80" y="17" text-anchor="middle">L'eau sort</text>
<text class="fg-txt fg-txt-s" x="80" y="32" text-anchor="middle">tout de suite</text>
<text class="fg-txt fg-txt-b" x="240" y="17" text-anchor="middle">Le sel entre</text>
<text class="fg-txt fg-txt-s" x="240" y="32" text-anchor="middle">en plusieurs heures</text>
<rect class="fg-f-bleu-l fg-t-bleu fg-t-fin" x="22" y="56" width="116" height="20" rx="10"/><text class="fg-txt fg-txt-s fg-txt-bleu" x="80" y="70" text-anchor="middle">solution salée</text><rect class="fg-f-carte fg-t-encre fg-t-fin" x="36" y="44" width="7" height="7" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="54" y="44" width="7" height="7" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="72" y="44" width="7" height="7" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="90" y="44" width="7" height="7" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="108" y="44" width="7" height="7" rx="1.5"/><rect class="fg-f-vert-l fg-t-vert fg-t-epais" x="34" y="84" width="92" height="104" rx="15"/><rect class="fg-t-bleu fg-t-fin fg-tirets" x="40" y="98" width="80" height="84" rx="16"/><rect class="fg-f-bleu-l fg-t-bleu" x="45" y="120" width="70" height="58" rx="14"/><path class="fg-t-bleu fg-t-epais" d="M56 114L56 79" marker-end="url(#fg-fl-bleu)"/><path class="fg-t-bleu fg-t-epais" d="M80 114L80 79" marker-end="url(#fg-fl-bleu)"/><path class="fg-t-bleu fg-t-epais" d="M104 114L104 79" marker-end="url(#fg-fl-bleu)"/>
<rect class="fg-f-bleu-l fg-t-bleu fg-t-fin" x="182" y="56" width="116" height="20" rx="10"/><text class="fg-txt fg-txt-s fg-txt-bleu" x="240" y="70" text-anchor="middle">solution salée</text><rect class="fg-f-carte fg-t-encre fg-t-fin" x="214" y="44" width="7" height="7" rx="1.5"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="250" y="44" width="7" height="7" rx="1.5"/><rect class="fg-f-vert-l fg-t-vert fg-t-epais" x="194" y="84" width="92" height="104" rx="15"/><rect class="fg-t-bleu fg-t-fin fg-tirets" x="200" y="98" width="80" height="84" rx="16"/><rect class="fg-f-bleu-l fg-t-bleu" x="205" y="120" width="70" height="58" rx="14"/><path class="fg-t-encre fg-t-epais" d="M216 79L216 118" marker-end="url(#fg-fl-encre)"/><path class="fg-t-encre fg-t-epais" d="M240 79L240 118" marker-end="url(#fg-fl-encre)"/><path class="fg-t-encre fg-t-epais" d="M264 79L264 118" marker-end="url(#fg-fl-encre)"/><circle class="fg-f-encre" cx="218" cy="134" r="2.2"/><circle class="fg-f-encre" cx="236" cy="144" r="2.2"/><circle class="fg-f-encre" cx="256" cy="132" r="2.2"/><circle class="fg-f-encre" cx="226" cy="162" r="2.2"/><circle class="fg-f-encre" cx="250" cy="160" r="2.2"/><circle class="fg-f-encre" cx="266" cy="148" r="2.2"/><circle class="fg-f-encre" cx="214" cy="150" r="2.2"/><circle class="fg-f-encre" cx="242" cy="128" r="2.2"/>
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
        points: [[0, 0], [7, 0.62], [18, 1], [40, 0.85], [66, 0.4], [100, 0.08]]
      },
      {
        nom: "Sel entré dans l'aliment",
        ton: "encre",
        points: [[0, 0], [30, 0.1], [58, 0.42], [82, 0.8], [100, 0.95]]
      }
    ],
    zones: [
      { de: 10, a: 62, label: "fenêtre mouillée : durée non documentée", ton: "or" }
    ]
  },
  {
    ou: "reperes",
    type: "etapes",
    titre: "Dégorger un légume",
    legende: "Pour dégorger un légume : une bonne cuillère à café de sel fin pour 500 g, une demi-heure à une heure d'attente, puis on rince et on éponge.",
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
    legende: "Schéma simplifié. Seule l'eau de cuisson peut faire entrer le sel : ce qu'on ajoute ensuite reste en surface. Les points marquent le sel entré dans l'aliment.",
    alt: "Trois coupes d'aliments. Une pomme de terre dans l'eau salée : après vingt minutes, le sel ne gagne que quelques millimètres sous la peau, on le voit en anneau de points à la périphérie, et le cœur reste peu salé. Des pâtes dans l'eau salée : elles boivent l'eau et donc le sel, les points sont répartis dans toute la pâte, salée de part en part. Une pomme de terre salée à la fin : les grains de sel restent tout autour, en surface, et rien n'est entré ; on obtient des pointes salées et un cœur fade.",
    corps: `<circle class="fg-f-or-l fg-t-or fg-t-epais" cx="46" cy="45" r="31"/><circle class="fg-t-or fg-t-fin fg-tirets" cx="46" cy="45" r="23"/><circle class="fg-f-encre" cx="70.6" cy="45" r="1.9"/><circle class="fg-f-encre" cx="27.7" cy="61.8" r="1.9"/><circle class="fg-f-encre" cx="48.2" cy="20.1" r="1.9"/><circle class="fg-f-encre" cx="61.4" cy="65" r="1.9"/><circle class="fg-f-encre" cx="21" cy="40.6" r="1.9"/><circle class="fg-f-encre" cx="67.6" cy="31.2" r="1.9"/><circle class="fg-f-encre" cx="39.3" cy="70" r="1.9"/><circle class="fg-f-encre" cx="34" cy="21.9" r="1.9"/><circle class="fg-f-encre" cx="70.6" cy="54" r="1.9"/><circle class="fg-f-encre" cx="21.6" cy="55.1" r="1.9"/><circle class="fg-f-encre" cx="57.3" cy="20.9" r="1.9"/><circle class="fg-f-encre" cx="54" cy="70.6" r="1.9"/><circle class="fg-f-encre" cx="22.6" cy="31.5" r="1.9"/><circle class="fg-f-encre" cx="72.6" cy="39.2" r="1.9"/><circle class="fg-f-encre" cx="30.2" cy="67.4" r="1.9"/><circle class="fg-f-encre" cx="42.5" cy="17.6" r="1.9"/><circle class="fg-f-encre" cx="67.2" cy="62.9" r="1.9"/><circle class="fg-f-encre" cx="18.1" cy="46.2" r="1.9"/><circle class="fg-f-encre" cx="66" cy="25.1" r="1.9"/><circle class="fg-f-encre" cx="44.7" cy="73.3" r="1.9"/><circle class="fg-f-encre" cx="27.7" cy="23.1" r="1.9"/><circle class="fg-f-encre" cx="74.4" cy="48.8" r="1.9"/><circle class="fg-f-encre" cx="22.3" cy="61.5" r="1.9"/><circle class="fg-f-encre" cx="52.4" cy="16.7" r="1.9"/><circle class="fg-f-encre" cx="60.5" cy="70.4" r="1.9"/><circle class="fg-f-encre" cx="18" cy="36.1" r="1.9"/><text class="fg-txt-script fg-txt-doux" x="46" y="50" text-anchor="middle">cœur</text><text class="fg-txt fg-txt-b" x="96" y="28" text-anchor="start">Pomme de terre, eau salée</text><text class="fg-txt fg-txt-s" x="96" y="45" text-anchor="start"><tspan x="96">Vingt minutes : le sel ne dépasse pas</tspan><tspan x="96" dy="13.5">quelques millimètres sous la peau ;</tspan><tspan x="96" dy="13.5">le cœur reste peu salé.</tspan></text><circle class="fg-f-or-l fg-t-or fg-t-epais" cx="46" cy="123" r="31"/><circle class="fg-f-encre" cx="58.3" cy="123" r="1.9"/><circle class="fg-f-encre" cx="36.4" cy="131.8" r="1.9"/><circle class="fg-f-encre" cx="47.2" cy="109.4" r="1.9"/><circle class="fg-f-encre" cx="54.7" cy="134.3" r="1.9"/><circle class="fg-f-encre" cx="31.4" cy="120.4" r="1.9"/><circle class="fg-f-encre" cx="59" cy="114.7" r="1.9"/><circle class="fg-f-encre" cx="41.9" cy="138.4" r="1.9"/><circle class="fg-f-encre" cx="38.4" cy="108.4" r="1.9"/><circle class="fg-f-encre" cx="61.9" cy="128.8" r="1.9"/><circle class="fg-f-encre" cx="29.9" cy="129.7" r="1.9"/><circle class="fg-f-encre" cx="53.6" cy="106.8" r="1.9"/><circle class="fg-f-encre" cx="51.5" cy="140.5" r="1.9"/><circle class="fg-f-encre" cx="29.7" cy="113.6" r="1.9"/><circle class="fg-f-encre" cx="64.8" cy="118.9" r="1.9"/><circle class="fg-f-encre" cx="34.7" cy="139.1" r="1.9"/><circle class="fg-f-encre" cx="43.4" cy="103" r="1.9"/><circle class="fg-f-encre" cx="61.7" cy="136.2" r="1.9"/><circle class="fg-f-encre" cx="25.1" cy="123.9" r="1.9"/><circle class="fg-f-encre" cx="61.1" cy="107.9" r="1.9"/><circle class="fg-f-encre" cx="45" cy="144.7" r="1.9"/><circle class="fg-f-encre" cx="31.8" cy="106" r="1.9"/><circle class="fg-f-encre" cx="68.3" cy="126" r="1.9"/><circle class="fg-f-encre" cx="27.2" cy="136.1" r="1.9"/><circle class="fg-f-encre" cx="51.1" cy="100.3" r="1.9"/><circle class="fg-f-encre" cx="57.7" cy="143.5" r="1.9"/><circle class="fg-f-encre" cx="23.2" cy="115.7" r="1.9"/><circle class="fg-f-encre" cx="68.1" cy="112.8" r="1.9"/><circle class="fg-f-encre" cx="36.5" cy="145.7" r="1.9"/><circle class="fg-f-encre" cx="37.5" cy="99.5" r="1.9"/><circle class="fg-f-encre" cx="68.4" cy="134.8" r="1.9"/><circle class="fg-f-encre" cx="21.2" cy="129.5" r="1.9"/><circle class="fg-f-encre" cx="60" cy="101.2" r="1.9"/><circle class="fg-f-encre" cx="50.5" cy="148.9" r="1.9"/><circle class="fg-f-encre" cx="25" cy="106.7" r="1.9"/><circle class="fg-f-encre" cx="72.8" cy="120.8" r="1.9"/><circle class="fg-f-encre" cx="27.5" cy="143" r="1.9"/><circle class="fg-f-encre" cx="46.1" cy="95.5" r="1.9"/><circle class="fg-f-encre" cx="64.7" cy="143.6" r="1.9"/><circle class="fg-f-encre" cx="42" cy="119" r="1.9"/><circle class="fg-f-encre" cx="52" cy="124" r="1.9"/><circle class="fg-f-encre" cx="46" cy="130" r="1.9"/><circle class="fg-f-encre" cx="48" cy="114" r="1.9"/><circle class="fg-f-encre" cx="38" cy="127" r="1.9"/><text class="fg-txt fg-txt-b" x="96" y="106" text-anchor="start">Pâtes, eau salée</text><text class="fg-txt fg-txt-s" x="96" y="123" text-anchor="start"><tspan x="96">Elles boivent l'eau, donc le sel :</tspan><tspan x="96" dy="13.5">salées de part en part.</tspan></text><circle class="fg-f-or-l fg-t-or fg-t-epais" cx="46" cy="201" r="28"/><text class="fg-txt-script fg-txt-doux" x="46" y="206" text-anchor="middle">fade</text><use href="#fg-sym-grain-sel" transform="rotate(10 80.8 208.1)" x="76.13" y="203.43" width="9.33" height="9.33"/><use href="#fg-sym-grain-sel" transform="rotate(40 72.6 224.5)" x="67.93" y="219.83" width="9.33" height="9.33"/><use href="#fg-sym-grain-sel" transform="rotate(70 57.3 234.7)" x="52.63" y="230.03" width="9.33" height="9.33"/><use href="#fg-sym-grain-sel" transform="rotate(100 38.9 235.8)" x="34.23" y="231.13" width="9.33" height="9.33"/><use href="#fg-sym-grain-sel" transform="rotate(130 22.5 227.6)" x="17.83" y="222.93" width="9.33" height="9.33"/><use href="#fg-sym-grain-sel" transform="rotate(160 12.3 212.3)" x="7.63" y="207.63" width="9.33" height="9.33"/><use href="#fg-sym-grain-sel" transform="rotate(190 11.2 193.9)" x="6.53" y="189.23" width="9.33" height="9.33"/><use href="#fg-sym-grain-sel" transform="rotate(220 19.4 177.5)" x="14.73" y="172.83" width="9.33" height="9.33"/><use href="#fg-sym-grain-sel" transform="rotate(250 34.7 167.3)" x="30.03" y="162.63" width="9.33" height="9.33"/><use href="#fg-sym-grain-sel" transform="rotate(280 53.1 166.2)" x="48.43" y="161.53" width="9.33" height="9.33"/><use href="#fg-sym-grain-sel" transform="rotate(310 69.5 174.4)" x="64.83" y="169.73" width="9.33" height="9.33"/><use href="#fg-sym-grain-sel" transform="rotate(340 79.7 189.7)" x="75.03" y="185.03" width="9.33" height="9.33"/><text class="fg-txt fg-txt-b" x="96" y="184" text-anchor="start">Sel jeté à la fin</text><text class="fg-txt fg-txt-s" x="96" y="201" text-anchor="start"><tspan x="96">Il ne quitte pas la surface :</tspan><tspan x="96" dy="13.5">pointes salées, cœur fade.</tspan></text><path class="fg-t-grille" d="M10 84H310M10 162H310"/><use href="#fg-sym-grain-sel" x="60.83" y="260.83" width="9.33" height="9.33"/>
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
        desc: "eau de cuisson, marinade : le sel entre",
        emoji: "🍝",
        ton: "bleu"
      },
      {
        libelle: "Après la couleur",
        desc: "champignons, courge : salez une fois dorés",
        emoji: "🍄",
        ton: "terra"
      },
      {
        libelle: "À la fin",
        desc: "fleur de sel : une pointe qui craque",
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
        points: [[0, 0.35], [100, 0.35]]
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
<path class="fg-f-doux fg-t-axe fg-t-fin" transform="translate(150 120) rotate(40)" d="M0 -5H28V-11L46 0L28 11V5H0Z"/>
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
    vb: "0 0 320 336",
    titre: "Le sel ne sucre pas : il lève un masque",
    legende: "Illustration qualitative, sans valeurs : la hauteur des barres figure l'intensité perçue. L'amertume masque le sucré ; le sodium l'atténue, et le sucré se détache.",
    alt: "Deux petits diagrammes en barres, sans valeurs chiffrées. Sans sel : une grande barre pour l'amer et une petite barre pâle pour le sucré, qui est masqué. Avec du sel : la barre de l'amer est plus basse et la barre du sucré est haute et nette. Le sodium atténue l'amertume, qui masquait le sucré : c'est une levée d'inhibition, montrée par Breslin et Beauchamp en 1997. Un cadre signale deux points non tranchés : que le sel rende le sucré plus sucré en agissant directement sur son récepteur est mal établi, et l'endroit exact où se joue la levée d'inhibition n'est pas établi.",
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
<rect class="fg-f-or-l fg-t-or fg-t-fin fg-tirets" x="8" y="250" width="304" height="76" rx="10"/>
<text class="fg-txt fg-txt-s" x="160" y="269" text-anchor="middle"><tspan class="fg-txt-b fg-txt-or" x="160">Mal établi, discuté</tspan><tspan x="160" dy="13.5">que le sel rende le sucré plus sucré en agissant</tspan><tspan x="160" dy="13.5">directement sur son récepteur. Pas tranché non plus :</tspan><tspan x="160" dy="13.5">où se joue la levée d'inhibition.</tspan></text>`
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
        corps: `<circle class="fg-f-terra" cx="60" cy="42" r="33" opacity=".6"/><circle class="fg-t-terra" cx="60" cy="42" r="33"/><circle class="fg-f-encre" cx="40" cy="40" r="1.7"/><circle class="fg-f-encre" cx="55" cy="30" r="1.7"/><circle class="fg-f-encre" cx="70" cy="32" r="1.7"/><circle class="fg-f-encre" cx="62" cy="47" r="1.7"/><circle class="fg-f-encre" cx="48" cy="46" r="1.7"/><circle class="fg-f-encre" cx="74" cy="49" r="1.7"/><circle class="fg-f-encre" cx="36" cy="60" r="1.7"/><circle class="fg-f-encre" cx="60" cy="66" r="1.7"/><circle class="fg-f-encre" cx="84" cy="40" r="1.7"/><circle class="fg-f-encre" cx="50" cy="62" r="1.7"/><circle class="fg-f-encre" cx="68" cy="24" r="1.7"/><circle class="fg-f-encre" cx="82" cy="62" r="1.7"/>`
      },
      {
        label: "Fleur de sel dessus",
        sous: "des pointes salées qui alternent avec le sucré",
        ton: "or",
        vb: "20 6 80 72",
        corps: `<circle class="fg-f-terra" cx="60" cy="42" r="33" opacity=".6"/><circle class="fg-t-terra" cx="60" cy="42" r="33"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="42" y="26" width="9" height="9" rx="1.5" transform="rotate(126 46.5 30.5)"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="64" y="28" width="9" height="9" rx="1.5" transform="rotate(192 68.5 32.5)"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="50" y="46" width="9" height="9" rx="1.5" transform="rotate(150 54.5 50.5)"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="74" y="46" width="9" height="9" rx="1.5" transform="rotate(222 78.5 50.5)"/><rect class="fg-f-carte fg-t-encre fg-t-fin" x="58" y="62" width="8" height="8" rx="1.5" transform="rotate(174 62 66)"/>`
      }
    ]
  },
  {
    ou: "reperes",
    type: "echelle",
    titre: "Quelle dose de sel ?",
    legende: "Pâte sucrée : 2 à 3 g de sel pour 160 g de farine. Le plafond d'environ 2 % est une limite de goût, tenue par l'usage plus que par la mesure ; une pâte levée se sale elle aussi à environ 2 %, mais pour le réseau et la levure.",
    alt: "Règle graduée du sel en pourcentage du poids de farine, avec des repères à 1 % et 2 %. Une pâte sucrée, un sablé, un cookie : de 1 à 2 %, soit environ 2 à 3 grammes pour 160 grammes de farine. Une pâte levée, une brioche, une focaccia : environ 2 %. Entre 1 et 2 %, le sucré prend du relief ; au-delà d'environ 2 %, on goûte le sel lui-même et la pâte bascule dans le salé.",
    min: 0,
    max: 3,
    unite: "%",
    label: "Sel, en % du poids de farine",
    graduations: [1],
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
    corps: `<g transform="translate(0 12)"><rect class="fg-f-terra-l fg-t-terra" x="126" y="22" width="184" height="46" rx="3"/><rect class="fg-f-terra" x="126" y="22" width="184" height="5" opacity="0.5"/><rect class="fg-f-terra" x="126" y="63" width="184" height="5" opacity="0.5"/><rect class="fg-f-terra" x="126" y="22" width="184" height="4" opacity="0.28"/><rect class="fg-f-terra" x="126" y="64" width="184" height="4" opacity="0.28"/><rect class="fg-t-terra" x="126" y="22" width="184" height="46" rx="3"/><use href="#fg-sym-grains-sel-sucre" x="126" y="13" width="184" height="8"/><use href="#fg-sym-grains-sel-sucre" x="126" y="69" width="184" height="8"/>
<text class="fg-txt fg-txt-b" x="8" y="42" text-anchor="start">Moins de 8 h</text>
<text class="fg-txt fg-txt-s" x="8" y="58" text-anchor="start"><tspan x="8">le centre reste</tspan><tspan x="8" dy="13.5">cru et mou</tspan></text>
<rect class="fg-f-terra-l fg-t-terra" x="126" y="104" width="184" height="46" rx="3"/><rect class="fg-f-terra" x="126" y="104" width="184" height="11" opacity="0.5"/><rect class="fg-f-terra" x="126" y="139" width="184" height="11" opacity="0.5"/><rect class="fg-f-terra" x="126" y="104" width="184" height="8" opacity="0.28"/><rect class="fg-f-terra" x="126" y="142" width="184" height="8" opacity="0.28"/><rect class="fg-t-terra" x="126" y="104" width="184" height="46" rx="3"/><use href="#fg-sym-grains-sel-sucre" x="126" y="95" width="184" height="8"/><use href="#fg-sym-grains-sel-sucre" x="126" y="151" width="184" height="8"/>
<text class="fg-txt fg-txt-b fg-txt-vert" x="8" y="124" text-anchor="start">12 à 24 h</text>
<text class="fg-txt fg-txt-s" x="8" y="140" text-anchor="start"><tspan x="8">ferme au bord,</tspan><tspan x="8" dy="13.5">souple au cœur</tspan></text>
<rect class="fg-f-terra-l fg-t-terra" x="126" y="186" width="184" height="46" rx="3"/><rect class="fg-f-terra" x="126" y="186" width="184" height="23" opacity="0.5"/><rect class="fg-f-terra" x="126" y="209" width="184" height="23" opacity="0.5"/><rect class="fg-t-terra" x="126" y="186" width="184" height="46" rx="3"/><use href="#fg-sym-grains-sel-sucre" x="126" y="177" width="184" height="8"/><use href="#fg-sym-grains-sel-sucre" x="126" y="233" width="184" height="8"/>
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
<use href="#fg-sym-larve" x="91.7" y="112.1" width="23.5" height="23.5"/>
<use href="#fg-sym-larve" x="151.9" y="76.2" width="23.4" height="23.4"/>
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
        corps: `<rect class="fg-f-terra-l fg-t-terra" x="8" y="6" width="84" height="56" rx="14"/><use href="#fg-sym-larve" x="30.1" y="12.6" width="39" height="39"/>` },
      { label: "4 % de sel",
        sous: "plus de quatre mois : des larves survivent",
        ton: "or",
        vb: "0 0 100 68",
        corps: `<rect class="fg-f-terra-l fg-t-terra" x="8" y="6" width="84" height="56" rx="14"/><use href="#fg-sym-larve" x="30.1" y="12.6" width="39" height="39"/>` },
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

/* LE THERMOMÈTRE DU CARNET — la figure transversale de l'onglet Savoirs
   (#/fondamentaux), dessinée par thermometreHtml() de js/ui/figures.js.

   Chaque entrée est une température-repère CITÉE dans le texte d'une fiche
   (js/fondamentaux.js) ; rien n'est inventé, et un test relit chaque chiffre
   dans la fiche qu'il désigne. Forme :

     { de: 150, a: 180, label: "Maillard : franche", fond: "maillard", ton: "terra" }

   - de ....... la température en °C (négative si besoin) : un POINT si `a` manque
                (un plafond, un cap, « sous 150 °C ») ;
   - a ........ (facultatif) le haut de la plage : une ZONE de `de` à `a`. Les
                fiches le répètent : il n'y a pas de seuil net, la zone se dessine
                donc en dégradé, jamais en bord franc ;
   - label .... ce que dit la fiche à cette température ; le dessin écrit la valeur
                en gras devant, inutile de la répéter. Des mots plutôt qu'un chiffre
                quand la fiche écrit en toutes lettres (« vingt à trente minutes ») ;
   - fond ..... l'id de la fiche : le repère est un lien vers #/fondamental/<id> ;
   - ton ...... bleu (froid, eau), vert (végétal, amidon), or (gras, œuf, épices),
                terra (chaleur, coloration), doux (un « seuil » que la fiche juge
                mal établi) ;
   - ancre .... (facultatif) la température où poser l'étiquette d'une zone très
                étendue ; le milieu de la zone par défaut ;
   - ouvert ... (facultatif) « haut » : une zone sans plafond (« au-delà de 200 °C »),
                dessinée jusqu'en haut de l'échelle avec un chevron ; `a` s'omet.

   Le dessin range les repères du plus chaud au plus froid et ouvre des RUPTURES
   de l'axe là où plus de 12 °C séparent deux repères : la hauteur d'un degré change
   alors d'un tronçon à l'autre, et la légende le dit. Chaque étiquette est précédée de
   l'EMOJI de sa fiche (rien à écrire ici : il vient de js/fondamentaux.js) ; l'axe est un
   tube dont le réservoir, en bas, a la couleur froide ; les graduations sont légères (les
   bornes de chaque tronçon, quelques valeurs rondes). Deux repères de MÊME température
   (mêmes `de` et `a`) dans la MÊME fiche se rangent sous un seul point : leurs
   étiquettes se suivent, la seconde précédée d'un « + ». L'ordre ci-dessous est celui
   de l'écriture (du froid au chaud) : il n'a pas d'autre effet. */
const THERMOMETRE = [
  /* Le froid : congélation, réfrigérateur */
  { de: -40, a: 40, ancre: -40, label: "Beurre : points de fusion étalés sur toute la plage", fond: "froid-raffermit", ton: "or" },
  { de: -35, label: "Anisakis : 15 heures à cœur", fond: "poisson-cru", ton: "bleu" },
  { de: -20, label: "Anisakis : 24 heures à cœur", fond: "poisson-cru", ton: "bleu" },
  { de: -18, label: "Congélateur ménager : 7 jours (Anses)", fond: "poisson-cru", ton: "bleu" },
  { de: -1.5, a: -1, label: "Saumon : la glace commence à se former", fond: "froid-raffermit", ton: "bleu" },
  { de: 0, label: "Listeria : se multiplie encore, juste sous zéro", fond: "poisson-cru", ton: "bleu" },
  { de: 0, a: 4, label: "Réfrigérateur : l'œuf cru, 24 heures", fond: "oeuf-cru", ton: "bleu" },
  { de: 0, a: 4, label: "Amidon : rétrogradation la plus rapide", fond: "amidon", ton: "vert" },
  { de: 2, a: 5, label: "Crème à fouetter : la température idéale", fond: "froid-raffermit", ton: "or" },
  { de: 4, label: "Brunissement : l'enzyme reste active", fond: "oxydation-enzymatique", ton: "vert" },
  { de: 5, a: 7, label: "Salmonelle : sa croissance s'arrête", fond: "oeuf-cru", ton: "bleu" },
  { de: 10, label: "Crème : elle monte mal au-dessus", fond: "froid-raffermit", ton: "or" },
  { de: 12, label: "Basilic : pas en dessous, il noircit", fond: "herbes-coupees", ton: "vert" },
  { de: 18, a: 23, label: "Mayonnaise acidifiée (pH 4,1) : protocole industriel", fond: "oeuf-cru", ton: "or" },

  /* La chaleur douce : amidon, œuf, sauces au beurre */
  { de: 40, a: 50, label: "Levure chimique : le gaz se libère au four", fond: "levure-chimique", ton: "or" },
  { de: 50, a: 60, label: "Pomme de terre : l'enzyme raffermit", fond: "amidon", ton: "vert" },
  { de: 55, a: 60, label: "Pomme de terre, vingt à trente minutes : ferme pour de bon", fond: "pectine-acidite", ton: "vert" },
  { de: 52, a: 66, ancre: 58, label: "Gélatinisation : blé de 52 à 64, pomme de terre de 58 à 66", fond: "amidon", ton: "vert" },
  { de: 55, a: 85, ancre: 85, label: "Sauce montée au beurre : les auteurs divergent", fond: "emulsion", ton: "or" },
  { de: 57, label: "Œuf en coquille : 75 minutes", fond: "oeuf-cru", ton: "or" },
  { de: 60, label: "Safran : infusion d'environ 20 minutes", fond: "epices-gras", ton: "or" },
  { de: 60, a: 63, label: "Poisson cuit à cœur : 63 par sécurité", fond: "poisson-cru", ton: "terra" },
  { de: 60, a: 80, ancre: 70, label: "Blanc d'œuf : trouble dès 63, ferme vers 70", fond: "coagulation-oeuf", ton: "or" },
  { de: 63, a: 68, label: "Food Code : quinze secondes à 63, dix-sept à 68", fond: "oeuf-cru", ton: "or" },
  { de: 65, a: 70, label: "Jaune d'œuf : prend, reste crémeux", fond: "coagulation-oeuf", ton: "or" },
  { de: 60, a: 80, label: "Beurre monté : jamais d'ébullition", fond: "deglacage", ton: "or" },
  { de: 80, label: "Blanchiment au-dessus : plus de brunissement", fond: "oxydation-enzymatique", ton: "vert" },
  { de: 80, a: 85, label: "Quiche, flan, crème prise : l'appareil prend", fond: "coagulation-oeuf", ton: "or" },

  /* L'eau qui bout, puis la coloration */
  { de: 100, label: "Maillard : très lente, des heures", fond: "maillard", ton: "terra" },
  { de: 100, label: "Surface mouillée : l'eau plafonne", fond: "eau-coloration", ton: "bleu" },
  { de: 100, label: "Bain-marie : le moule ne dépasse pas", fond: "coagulation-oeuf", ton: "bleu" },
  { de: 100, label: "Salé trop tôt : la saumure garde sous ce plafond", fond: "osmose-sel", ton: "bleu" },
  { de: 100, label: "Champignons salés tôt : pas de dorure", fond: "assaisonnement-couches", ton: "bleu" },
  { de: 110, a: 160, label: "Sucres : « seuils » lus partout (fructose 110, saccharose 160), jamais fiables", fond: "maillard", ton: "doux" },
  { de: 120, label: "Acrylamide : se forme au-delà, en milieu sec", fond: "maillard", ton: "terra" },
  { de: 140, a: 180, ancre: 160, label: "Maillard : visible dès 140, franche de 150 à 180", fond: "maillard", ton: "terra" },
  { de: 140, a: 180, ancre: 175, label: "Coloration : une surface sans eau", fond: "eau-coloration", ton: "terra" },
  { de: 140, a: 160, label: "Torréfaction : sucres et acides aminés", fond: "torrefaction", ton: "terra" },
  { de: 140, a: 160, label: "Épices moulues, dans le gras", fond: "epices-gras", ton: "or" },
  { de: 150, a: 160, label: "Fruits secs au four : 8 à 12 minutes", fond: "torrefaction", ton: "terra" },
  { de: 150, label: "Friture : en dessous, le beignet s'imbibe", fond: "friture", ton: "or" },
  { de: 150, label: "Paprika, piment : hors du feu, sous cette limite", fond: "epices-gras", ton: "or" },
  { de: 150, label: "Friture : jamais en dessous", fond: "eau-coloration", ton: "or" },
  { de: 160, label: "Four : en dessous, la croûte reste pâle", fond: "maillard", ton: "terra" },
  { de: 170, a: 180, label: "Friture : la bonne fenêtre", fond: "friture", ton: "or" },
  { de: 190, label: "Friture : au-delà, l'huile s'oxyde", fond: "friture", ton: "or" },
  { de: 200, label: "Épices dans l'huile fumante : elles noircissent", fond: "epices-gras", ton: "terra" },
  { de: 200, ouvert: "haut", label: "Pyrolyse en surface : l'amertume avant les arômes", fond: "maillard", ton: "terra" },
  { de: 200, a: 220, label: "Four : une croûte franchement colorée", fond: "maillard", ton: "terra" },
  { de: 220, label: "Plaque de four : surface sèche", fond: "eau-coloration", ton: "terra" }
];

/* ===== fin Vue d'ensemble ===== */
