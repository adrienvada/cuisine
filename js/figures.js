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

/* (figures de la famille) */

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
   alors d'un tronçon à l'autre, et la légende le dit. L'ordre ci-dessous est celui
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
  { de: 160, label: "Friture : jamais en dessous", fond: "eau-coloration", ton: "or" },
  { de: 160, label: "Four : en dessous, la croûte reste pâle", fond: "maillard", ton: "terra" },
  { de: 170, a: 180, label: "Friture : la bonne fenêtre", fond: "friture", ton: "or" },
  { de: 190, label: "Friture : au-delà, l'huile s'oxyde", fond: "friture", ton: "or" },
  { de: 200, label: "Épices dans l'huile fumante : elles noircissent", fond: "epices-gras", ton: "terra" },
  { de: 200, ouvert: "haut", label: "Pyrolyse en surface : l'amertume avant les arômes", fond: "maillard", ton: "terra" },
  { de: 200, a: 220, label: "Four : une croûte franchement colorée", fond: "maillard", ton: "terra" },
  { de: 220, label: "Plaque de four : surface sèche", fond: "eau-coloration", ton: "terra" }
];

/* ===== fin Vue d'ensemble ===== */
