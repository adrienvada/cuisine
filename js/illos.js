/* Carnet de cuisine — bibliothèque d'illustrations SVG « faites main »
   D  : petits décors botaniques (tiges, fioritures, cœurs…)
   FOOD : une illustration gouache par recette (clé = id de la recette).
   Pour une nouvelle recette : ajouter une entrée FOOD["id-recette"],
   sinon l'emoji de la recette sert de secours. */

const D = {};
const FOOD = {};

/* ---------- Décors (stroke: currentColor → colorable en CSS) ---------- */

/* Brin de romarin horizontal */
D.sprig = `<svg viewBox="0 0 56 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true">
  <path d="M3 10 Q28 4 53 9"/>
  <path d="M9 9 l-3 -5 M9 9 l-4 3"/>
  <path d="M16 8 l-2 -6 M16 8 l-3 5"/>
  <path d="M23 7 l-1 -6 M23 7 l-2 6"/>
  <path d="M30 6.6 l0 -6 M30 6.6 l-1 6.4"/>
  <path d="M37 6.6 l1 -6 M37 6.6 l0 6.4"/>
  <path d="M44 7.2 l2 -5.5 M44 7.2 l1 5.8"/>
  <path d="M50 8.2 l3 -4.5 M50 8.2 l2.5 4"/>
</svg>`;

/* Le même, retourné */
D.sprigR = `<svg viewBox="0 0 56 18" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true">
  <g transform="translate(56 0) scale(-1 1)">
    <path d="M3 10 Q28 4 53 9"/>
    <path d="M9 9 l-3 -5 M9 9 l-4 3"/>
    <path d="M16 8 l-2 -6 M16 8 l-3 5"/>
    <path d="M23 7 l-1 -6 M23 7 l-2 6"/>
    <path d="M30 6.6 l0 -6 M30 6.6 l-1 6.4"/>
    <path d="M37 6.6 l1 -6 M37 6.6 l0 6.4"/>
    <path d="M44 7.2 l2 -5.5 M44 7.2 l1 5.8"/>
    <path d="M50 8.2 l3 -4.5 M50 8.2 l2.5 4"/>
  </g>
</svg>`;

/* Branche d'olivier (couleurs propres, pour fonds papier) */
D.olive = `<svg viewBox="0 0 96 30" fill="none" aria-hidden="true">
  <path d="M4 20 Q48 8 92 16" stroke="#7B916A" stroke-width="1.5" stroke-linecap="round"/>
  <ellipse cx="16" cy="13" rx="7" ry="2.8" fill="#8FA478" transform="rotate(-24 16 13)"/>
  <ellipse cx="30" cy="10.5" rx="7" ry="2.8" fill="#7B916A" transform="rotate(-14 30 10.5)"/>
  <ellipse cx="46" cy="9" rx="7.5" ry="3" fill="#8FA478" transform="rotate(-4 46 9)"/>
  <ellipse cx="62" cy="9.5" rx="7" ry="2.8" fill="#7B916A" transform="rotate(8 62 9.5)"/>
  <ellipse cx="78" cy="11.5" rx="7" ry="2.8" fill="#8FA478" transform="rotate(16 78 11.5)"/>
  <circle cx="24" cy="19" r="3.4" fill="#5A7248"/>
  <circle cx="55" cy="16.5" r="3.4" fill="#42603A"/>
  <circle cx="84" cy="20" r="3.2" fill="#5A7248"/>
</svg>`;

/* Fioriture calligraphique */
D.flourish = `<svg viewBox="0 0 110 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
  <path d="M4 9 C 26 2, 40 13, 56 7 C 64 4, 64 2, 69 5 C 74 9, 88 8, 106 6"/>
</svg>`;

/* Petit cœur dessiné */
D.heart = `<svg viewBox="0 0 18 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M9 13.6 C 2.4 9.2 1.2 4.6 4.8 2.8 C 7.2 1.7 8.8 3.6 9 4.8 C 9.2 3.6 10.8 1.7 13.2 2.8 C 16.8 4.6 15.6 9.2 9 13.6 Z"/>
</svg>`;

/* Trois feuilles de basilic */
D.leaf = `<svg viewBox="0 0 22 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M11 18 V 9"/>
  <path d="M11 9 C 6 9 3.4 5.6 3.8 2.4 C 7.4 2 10.6 4.4 11 9 Z"/>
  <path d="M11 9 C 16 9 18.6 5.6 18.2 2.4 C 14.6 2 11.4 4.4 11 9 Z"/>
  <path d="M11 13.4 C 8 13.6 6.4 12 6.2 10 C 8.6 9.8 10.6 11 11 13.4 Z"/>
</svg>`;

/* Petit citron */
D.lemon = `<svg viewBox="0 0 34 26" aria-hidden="true">
  <ellipse cx="18" cy="15" rx="12.5" ry="8.6" fill="#EAC54F" stroke="#C79B33" stroke-width="1.4"/>
  <path d="M30.2 14 q 3 0.6 2.6 2.6" fill="none" stroke="#C79B33" stroke-width="1.4" stroke-linecap="round"/>
  <ellipse cx="9" cy="6.4" rx="5.4" ry="2.4" fill="#7B916A" transform="rotate(-28 9 6.4)"/>
</svg>`;

/* Deux coupes qui trinquent */
D.cheers = `<svg viewBox="0 0 46 42" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <g transform="rotate(-14 12 20)">
    <path d="M5 7 Q 13 20 21 7 Z" fill="currentColor" fill-opacity="0.14"/>
    <path d="M5 7 Q 13 20 21 7"/>
    <path d="M13 16 V 30 M 8 31 H 18"/>
  </g>
  <g transform="rotate(14 34 20)">
    <path d="M25 7 Q 33 20 41 7 Z" fill="currentColor" fill-opacity="0.14"/>
    <path d="M25 7 Q 33 20 41 7"/>
    <path d="M33 16 V 30 M 28 31 H 38"/>
  </g>
  <circle cx="22.5" cy="3.4" r="0.9" fill="currentColor" stroke="none"/>
  <circle cx="18.5" cy="6.6" r="0.8" fill="currentColor" stroke="none"/>
  <circle cx="26.8" cy="6.2" r="0.8" fill="currentColor" stroke="none"/>
</svg>`;

/* Plume (gestes techniques) */
D.plume = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M3.4 16.8 C 6.4 7.4 12.6 3.2 17 3 C 16.2 8.6 11.4 14.6 5.6 15.8 Z"/>
  <path d="M3.4 16.8 L 10.4 8.6"/>
</svg>`;

/* Toque du chef (astuces) */
D.toque = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M6 13.9 A 4 4 0 0 1 7.4 6 a 5.1 5.1 0 0 1 1.1 -1.5 a 5 5 0 0 1 7 0 A 5.1 5.1 0 0 1 16.6 6 A 4 4 0 0 1 18 13.9 V 19 H 6 Z"/>
  <path d="M6 16 h12"/>
</svg>`;

/* Branche pour les coins (posée en diagonale) */
D.corner = `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
  <path d="M6 58 Q 18 38 42 22" stroke="#6F8A5B" stroke-width="1.6" stroke-linecap="round"/>
  <ellipse cx="16" cy="43" rx="6.4" ry="2.6" fill="#8FA478" transform="rotate(-52 16 43)"/>
  <ellipse cx="26" cy="34" rx="6.4" ry="2.6" fill="#7B916A" transform="rotate(-42 26 34)"/>
  <ellipse cx="37" cy="26.5" rx="6.2" ry="2.5" fill="#8FA478" transform="rotate(-32 37 26.5)"/>
  <ellipse cx="46" cy="21" rx="5.8" ry="2.4" fill="#7B916A" transform="rotate(-24 46 21)"/>
  <circle cx="22" cy="46" r="2.8" fill="#5A7248"/>
  <circle cx="34" cy="35" r="2.6" fill="#42603A"/>
</svg>`;

/* ---------- Illustrations gouache des recettes ---------- */

FOOD["focaccia-romarin"] = `<svg viewBox="0 0 140 100" aria-hidden="true">
  <ellipse cx="70" cy="90" rx="54" ry="6" fill="#2C3326" opacity="0.09"/>
  <rect x="10" y="20" width="120" height="68" rx="10" fill="#6E5138"/>
  <rect x="2" y="46" width="12" height="9" rx="4" fill="#6E5138"/>
  <rect x="126" y="46" width="12" height="9" rx="4" fill="#6E5138"/>
  <rect x="15" y="25" width="110" height="58" rx="7" fill="#57402C"/>
  <rect x="19" y="29" width="102" height="50" rx="8" fill="#E4AE55" stroke="#B77F35" stroke-width="2"/>
  <path d="M24 36 q 20 -5 44 -3" stroke="#EDC172" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.8"/>
  <ellipse cx="36" cy="44" rx="4" ry="3.1" fill="#B77F35"/>
  <ellipse cx="62" cy="40" rx="4" ry="3.1" fill="#B77F35"/>
  <ellipse cx="90" cy="43" rx="4" ry="3.1" fill="#B77F35"/>
  <ellipse cx="110" cy="38" rx="3.6" ry="2.9" fill="#B77F35"/>
  <ellipse cx="30" cy="62" rx="4" ry="3.1" fill="#B77F35"/>
  <ellipse cx="52" cy="68" rx="4" ry="3.1" fill="#B77F35"/>
  <ellipse cx="76" cy="60" rx="4" ry="3.1" fill="#B77F35"/>
  <ellipse cx="100" cy="66" rx="4" ry="3.1" fill="#B77F35"/>
  <ellipse cx="114" cy="56" rx="3.4" ry="2.7" fill="#B77F35"/>
  <g stroke="#4E6B3F" stroke-width="1.5" stroke-linecap="round" fill="none">
    <path d="M44 52 l8 -2 M46 49 l1.6 2.6 M49 48.4 l1.4 2.6 M52 48 l1 2.4"/>
    <path d="M84 50 l8 2 M86 49 l0.6 3 M89 49.6 l0.6 3 M92 50.4 l0.4 2.6"/>
    <path d="M62 74 l8 -1 M64 71.6 l1 2.8 M67 71.2 l1 2.8 M70 71 l0.8 2.6"/>
  </g>
  <g fill="#FDFBF3">
    <circle cx="45" cy="60" r="1.2"/><circle cx="70" cy="48" r="1.2"/>
    <circle cx="95" cy="55" r="1.2"/><circle cx="58" cy="35" r="1.1"/>
    <circle cx="106" cy="72" r="1.1"/><circle cx="34" cy="73" r="1.1"/>
  </g>
</svg>`;

FOOD["torsades-pesto"] = `<svg viewBox="0 0 140 100" aria-hidden="true">
  <ellipse cx="70" cy="91" rx="50" ry="5.5" fill="#2C3326" opacity="0.09"/>
  <g stroke="#A9803B" stroke-width="1.5">
    <g transform="rotate(-16 42 52)">
      <ellipse cx="42" cy="18" rx="8.5" ry="10" fill="#E2AC52" transform="rotate(-24 42 18)"/>
      <ellipse cx="42" cy="32" rx="8.5" ry="10" fill="#96A464" transform="rotate(24 42 32)"/>
      <ellipse cx="42" cy="46" rx="8.5" ry="10" fill="#E2AC52" transform="rotate(-24 42 46)"/>
      <ellipse cx="42" cy="60" rx="8.5" ry="10" fill="#96A464" transform="rotate(24 42 60)"/>
      <ellipse cx="42" cy="74" rx="8.5" ry="10" fill="#E2AC52" transform="rotate(-24 42 74)"/>
    </g>
    <g>
      <ellipse cx="70" cy="16" rx="8.5" ry="10" fill="#96A464" transform="rotate(24 70 16)"/>
      <ellipse cx="70" cy="30" rx="8.5" ry="10" fill="#E2AC52" transform="rotate(-24 70 30)"/>
      <ellipse cx="70" cy="44" rx="8.5" ry="10" fill="#96A464" transform="rotate(24 70 44)"/>
      <ellipse cx="70" cy="58" rx="8.5" ry="10" fill="#E2AC52" transform="rotate(-24 70 58)"/>
      <ellipse cx="70" cy="72" rx="8.5" ry="10" fill="#96A464" transform="rotate(24 70 72)"/>
    </g>
    <g transform="rotate(16 98 52)">
      <ellipse cx="98" cy="18" rx="8.5" ry="10" fill="#E2AC52" transform="rotate(-24 98 18)"/>
      <ellipse cx="98" cy="32" rx="8.5" ry="10" fill="#96A464" transform="rotate(24 98 32)"/>
      <ellipse cx="98" cy="46" rx="8.5" ry="10" fill="#E2AC52" transform="rotate(-24 98 46)"/>
      <ellipse cx="98" cy="60" rx="8.5" ry="10" fill="#96A464" transform="rotate(24 98 60)"/>
      <ellipse cx="98" cy="74" rx="8.5" ry="10" fill="#E2AC52" transform="rotate(-24 98 74)"/>
    </g>
  </g>
  <g fill="#F0E3C8" stroke="#C7B080" stroke-width="0.8">
    <ellipse cx="24" cy="84" rx="2.6" ry="1.7" transform="rotate(-20 24 84)"/>
    <ellipse cx="118" cy="82" rx="2.6" ry="1.7" transform="rotate(24 118 82)"/>
    <ellipse cx="112" cy="88" rx="2.4" ry="1.6" transform="rotate(-12 112 88)"/>
  </g>
  <g transform="translate(14 6) rotate(-18 11 9)">
    <path d="M11 18 C 5 18 2 13.6 2.6 9.6 C 7 9 10.6 12 11 18 Z" fill="#5F7F4A"/>
    <path d="M11 18 C 17 18 20 13.6 19.4 9.6 C 15 9 11.4 12 11 18 Z" fill="#6F9457"/>
  </g>
</svg>`;

FOOD["dip-chevre-herbes"] = `<svg viewBox="0 0 140 100" aria-hidden="true">
  <ellipse cx="68" cy="90" rx="52" ry="6" fill="#2C3326" opacity="0.09"/>
  <path d="M20 50 Q 20 87 68 87 Q 116 87 116 50 Z" fill="#CBB58E" stroke="#A78D63" stroke-width="2"/>
  <path d="M26 62 Q 30 76 44 81" stroke="#BDA377" stroke-width="2" fill="none" stroke-linecap="round"/>
  <ellipse cx="68" cy="50" rx="48" ry="12.5" fill="#F7F2E2" stroke="#D9CBA6" stroke-width="1.8"/>
  <path d="M36 50 Q 50 43 64 49 T 96 48" stroke="#E5DBBC" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M44 54 Q 58 58 74 53" stroke="#E5DBBC" stroke-width="2" fill="none" stroke-linecap="round"/>
  <g stroke="#5F7F4A" stroke-width="1.6" stroke-linecap="round">
    <path d="M50 46 l5 -1.4 M74 44 l5 1.2 M60 52 l4.6 1 M86 51 l4.4 -1.4 M40 49 l4 1.6"/>
  </g>
  <g fill="#5F7F4A"><circle cx="68" cy="45" r="1.1"/><circle cx="82" cy="47.5" r="1"/><circle cx="55" cy="49" r="1"/></g>
  <g>
    <circle cx="124" cy="79" r="7.2" fill="#C4534E" stroke="#9E3B38" stroke-width="1.5"/>
    <ellipse cx="124" cy="84.4" rx="3.4" ry="1.8" fill="#F3E9E7"/>
    <path d="M124 71.5 q 1.4 -5 5.4 -6.4 M124 71.5 q -2.4 -4 -1 -7" stroke="#5F7F4A" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  </g>
  <g transform="translate(6 30)">
    <path d="M8 14 C 4 14 1.8 11 2.2 8 C 5.4 7.6 8 9.8 8 14 Z" fill="#6F9457"/>
    <path d="M8 14 C 12 14 14.2 11 13.8 8 C 10.6 7.6 8 9.8 8 14 Z" fill="#5F7F4A"/>
  </g>
</svg>`;

FOOD["houmous-petits-pois-menthe"] = `<svg viewBox="0 0 140 100" aria-hidden="true">
  <ellipse cx="70" cy="90" rx="52" ry="6" fill="#2C3326" opacity="0.09"/>
  <path d="M22 50 Q 22 87 70 87 Q 118 87 118 50 Z" fill="#B8683C" stroke="#8F4E2B" stroke-width="2"/>
  <path d="M28 62 Q 33 77 48 82" stroke="#A05A32" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <ellipse cx="70" cy="50" rx="48" ry="12.5" fill="#7FA65A" stroke="#5F8140" stroke-width="1.8"/>
  <path d="M38 51 Q 52 43 68 50 T 100 48" stroke="#6C9149" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M48 55 Q 62 59 80 54" stroke="#8FB56B" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path d="M56 46 q 10 -3 20 0 q 8 2 14 0" stroke="#D9A94B" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <g stroke="#3E6130" stroke-width="1">
    <circle cx="50" cy="47" r="3.2" fill="#4F7A38"/>
    <circle cx="60" cy="52.5" r="3.2" fill="#4F7A38"/>
    <circle cx="88" cy="46" r="3.2" fill="#4F7A38"/>
    <circle cx="97" cy="52" r="3" fill="#4F7A38"/>
    <circle cx="74" cy="44" r="3" fill="#4F7A38"/>
  </g>
  <g fill="#A5C77F">
    <circle cx="49" cy="46" r="1"/><circle cx="59" cy="51.5" r="1"/>
    <circle cx="87" cy="45" r="1"/><circle cx="96" cy="51" r="0.9"/><circle cx="73" cy="43" r="0.9"/>
  </g>
  <g transform="translate(62 24) rotate(-8)">
    <path d="M8 14 C 3.6 14 1.4 10.6 1.8 7.2 C 5.4 6.8 8 9.4 8 14 Z" fill="#3F6B33"/>
    <path d="M8 14 C 12.4 14 14.6 10.6 14.2 7.2 C 10.6 6.8 8 9.4 8 14 Z" fill="#527F42"/>
  </g>
  <g transform="translate(10 28)">
    <circle cx="8" cy="8" r="4.6" fill="#4F7A38" stroke="#3E6130"/>
    <circle cx="7" cy="7" r="1.3" fill="#A5C77F"/>
    <circle cx="17" cy="13" r="4" fill="#4F7A38" stroke="#3E6130"/>
    <circle cx="16" cy="12" r="1.1" fill="#A5C77F"/>
  </g>
</svg>`;

FOOD["salade-kale-pomme-oeuf"] = `<svg viewBox="0 0 140 100" aria-hidden="true">
  <ellipse cx="70" cy="90" rx="52" ry="6" fill="#2C3326" opacity="0.09"/>
  <path d="M22 50 Q 22 87 70 87 Q 118 87 118 50 Z" fill="#CBB58E" stroke="#A78D63" stroke-width="2"/>
  <ellipse cx="70" cy="50" rx="48" ry="12.5" fill="#527F42" stroke="#3E6130" stroke-width="1.6"/>
  <g fill="#3E6130">
    <path d="M34 48 q 4 -8 11 -8 q -2 5 1 8 q -6 4 -12 0 Z"/>
    <path d="M56 42 q 6 -7 13 -5 q -1 5 2 8 q -8 3 -15 -3 Z"/>
    <path d="M88 44 q 6 -6 12 -4 q -1 5 2 7 q -7 4 -14 -3 Z"/>
  </g>
  <g fill="#6F9457">
    <path d="M46 52 q 5 -7 12 -6 q -1 5 2 7 q -7 4 -14 -1 Z"/>
    <path d="M74 50 q 5 -7 12 -6 q -1 5 2 7 q -7 4 -14 -1 Z"/>
    <path d="M100 52 q 4 -6 10 -5 q -1 4 1 6 q -5 3 -11 -1 Z"/>
  </g>
  <g>
    <path d="M36 56 a 7 9 0 0 1 8 -4 l -1 10 Z" fill="#C6DC96" stroke="#8CB05C" stroke-width="1.2"/>
    <path d="M96 40 a 7 9 0 0 1 9 -3 l -2 10 Z" fill="#C6DC96" stroke="#8CB05C" stroke-width="1.2"/>
  </g>
  <g>
    <ellipse cx="70" cy="41" rx="10" ry="7.6" fill="#FDFBF3" stroke="#D9CBA6" stroke-width="1.4"/>
    <circle cx="70" cy="41" r="3.8" fill="#E8B33C"/>
  </g>
</svg>`;

FOOD["veloute-butternut-shiitakes"] = `<svg viewBox="0 0 140 100" aria-hidden="true">
  <ellipse cx="70" cy="90" rx="52" ry="6" fill="#2C3326" opacity="0.09"/>
  <path d="M22 50 Q 22 87 70 87 Q 118 87 118 50 Z" fill="#CBB58E" stroke="#A78D63" stroke-width="2"/>
  <path d="M28 62 Q 33 77 48 82" stroke="#BDA377" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <ellipse cx="70" cy="50" rx="48" ry="12.5" fill="#E0973F" stroke="#B87226" stroke-width="1.8"/>
  <path d="M40 52 Q 54 44 70 50 T 102 49" stroke="#C87F2C" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M52 45 q 9 8 18 0 q 7 -6 14 1" stroke="#F3E0C0" stroke-width="3" fill="none" stroke-linecap="round"/>
  <g fill="#8A6B4D" stroke="#6E5138" stroke-width="1">
    <ellipse cx="52" cy="52" rx="6.4" ry="4" transform="rotate(-10 52 52)"/>
    <ellipse cx="88" cy="53" rx="6" ry="3.8" transform="rotate(10 88 53)"/>
  </g>
  <path d="M49 52 l6 0 M85.4 53 l5.6 0.8" stroke="#D9C6A8" stroke-width="1.1" stroke-linecap="round"/>
  <g fill="#6F9457"><ellipse cx="70" cy="44" rx="4.6" ry="2" transform="rotate(-14 70 44)"/><ellipse cx="78" cy="46" rx="4.2" ry="1.9" transform="rotate(12 78 46)"/></g>
  <g fill="#F3E0C0"><circle cx="44" cy="47" r="1.1"/><circle cx="98" cy="45" r="1.1"/><circle cx="62" cy="55" r="1"/></g>
</svg>`;

FOOD["gravlax-saumon-yaourt-bulgare"] = `<svg viewBox="0 0 140 100" aria-hidden="true">
  <ellipse cx="70" cy="88" rx="58" ry="6.5" fill="#2C3326" opacity="0.09"/>
  <ellipse cx="70" cy="58" rx="58" ry="20" fill="#F2ECDA" stroke="#D9CBA6" stroke-width="1.8"/>
  <ellipse cx="70" cy="56" rx="46" ry="14.5" fill="#FDFBF3" stroke="#E5DBBC" stroke-width="1.2"/>
  <g stroke="#C96F58" stroke-width="1.3">
    <path d="M38 55 q 8 -12 20 -8 q -2 8 4 10 q -12 8 -24 -2 Z" fill="#E38E7A"/>
    <path d="M62 48 q 10 -10 22 -6 q -3 8 3 11 q -13 7 -25 -5 Z" fill="#EA9C86"/>
    <path d="M86 54 q 8 -10 18 -7 q -2 7 3 9 q -10 8 -21 -2 Z" fill="#E38E7A"/>
  </g>
  <g stroke="#FBE3DB" stroke-width="1.2" stroke-linecap="round" fill="none">
    <path d="M44 52 q 6 -4 12 -4 M68 46 q 7 -3 13 -2 M92 51 q 6 -3 11 -2"/>
  </g>
  <g fill="#E8D26B" stroke="#C9AE3B" stroke-width="0.8">
    <circle cx="48" cy="64" r="2.6"/><circle cx="72" cy="66" r="2.6"/><circle cx="96" cy="63" r="2.4"/><circle cx="60" cy="42" r="2.2"/>
  </g>
  <g stroke="#5F7F4A" stroke-width="1.5" stroke-linecap="round">
    <path d="M56 60 l 9 -2 M80 58 l 8 2 M66 38 l 8 -1"/>
  </g>
</svg>`;

FOOD["beignets-brebis-menthe"] = `<svg viewBox="0 0 140 100" aria-hidden="true">
  <ellipse cx="70" cy="89" rx="54" ry="6" fill="#2C3326" opacity="0.09"/>
  <ellipse cx="64" cy="70" rx="50" ry="14" fill="#F2ECDA" stroke="#D9CBA6" stroke-width="1.6"/>
  <g stroke="#A9803B" stroke-width="1.6">
    <circle cx="42" cy="56" r="13" fill="#D9A94B"/>
    <circle cx="68" cy="50" r="14" fill="#E2B45C"/>
    <circle cx="92" cy="58" r="12.5" fill="#D9A94B"/>
  </g>
  <g fill="#B77F35">
    <circle cx="38" cy="52" r="1.2"/><circle cx="46" cy="60" r="1.2"/><circle cx="64" cy="46" r="1.2"/>
    <circle cx="72" cy="54" r="1.2"/><circle cx="90" cy="54" r="1.1"/><circle cx="96" cy="62" r="1.1"/>
  </g>
  <path d="M34 47 a 13 13 0 0 1 10 -3" stroke="#F0CE8A" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <g transform="translate(58 28) rotate(-10)">
    <path d="M7 12 C 3.4 12 1.6 9.4 2 6.6 C 4.8 6.2 7 8.2 7 12 Z" fill="#3F6B33"/>
    <path d="M7 12 C 10.6 12 12.4 9.4 12 6.6 C 9.2 6.2 7 8.2 7 12 Z" fill="#527F42"/>
  </g>
  <g>
    <path d="M104 76 Q 104 88 118 88 Q 132 88 132 76 Z" fill="#FDFBF3" stroke="#D9CBA6" stroke-width="1.5"/>
    <ellipse cx="118" cy="76" rx="14" ry="4.4" fill="#F7F2E2" stroke="#D9CBA6" stroke-width="1.2"/>
    <path d="M112 75.6 l 4.6 -1 M122 76.6 l 4.4 -1" stroke="#5F7F4A" stroke-width="1.3" stroke-linecap="round"/>
  </g>
</svg>`;

FOOD["scoopable-cookies"] = `<svg viewBox="0 0 140 100" aria-hidden="true">
  <ellipse cx="70" cy="90" rx="52" ry="6" fill="#2C3326" opacity="0.09"/>
  <g stroke="#996F33" stroke-width="1.6">
    <ellipse cx="47" cy="66" rx="24" ry="16" fill="#C9954F"/>
    <ellipse cx="93" cy="70" rx="22" ry="14" fill="#D2A25C"/>
    <circle cx="78" cy="38" r="15" fill="#C08A46"/>
  </g>
  <path d="M64 33 a 15 15 0 0 1 12 -9" stroke="#DDb478" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <g fill="#5C3A24">
    <ellipse cx="38" cy="60" rx="3" ry="2.4"/><ellipse cx="52" cy="68" rx="3" ry="2.4"/>
    <ellipse cx="45" cy="74" rx="2.6" ry="2.1"/><ellipse cx="58" cy="59" rx="2.6" ry="2.1"/>
    <ellipse cx="86" cy="66" rx="2.8" ry="2.2"/><ellipse cx="98" cy="74" rx="2.8" ry="2.2"/>
    <ellipse cx="102" cy="64" rx="2.4" ry="2"/><ellipse cx="73" cy="34" rx="2.6" ry="2.2"/>
    <ellipse cx="83" cy="43" rx="2.4" ry="2"/><ellipse cx="84" cy="31" rx="2.2" ry="1.9"/>
  </g>
  <path d="M92 24 q 8 -8 18 -6 q 0 8 -7 11" fill="none" stroke="#8B8874" stroke-width="1.6" stroke-linecap="round"/>
  <g fill="#FDFBF3"><circle cx="43" cy="64" r="0.9"/><circle cx="95" cy="69" r="0.9"/></g>
</svg>`;

FOOD["cocktail-concombre-menthe"] = `<svg viewBox="0 0 140 100" aria-hidden="true">
  <ellipse cx="70" cy="91" rx="34" ry="5" fill="#2C3326" opacity="0.09"/>
  <path d="M52 16 L 56 86 Q 56 90 70 90 Q 84 90 84 86 L 88 16 Z" fill="#EAF2EC" stroke="#B9CDbD" stroke-width="1.8"/>
  <path d="M55 34 L 57.5 84 Q 58 87 70 87 Q 82 87 82.5 84 L 85 34 Z" fill="#A8D4C0"/>
  <g stroke="#86A860" stroke-width="1.2">
    <circle cx="66" cy="52" r="7" fill="#C4DE9E"/>
    <circle cx="77" cy="68" r="6.4" fill="#C4DE9E"/>
  </g>
  <g stroke="#A9C87E" stroke-width="1" fill="none">
    <circle cx="66" cy="52" r="4.4"/><circle cx="77" cy="68" r="4"/>
  </g>
  <path d="M62 20 L 84 4" stroke="#C1913F" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M60 40 q 4 6 0 12 q -4 6 1 12" stroke="#D7EBDD" stroke-width="2" fill="none" stroke-linecap="round"/>
  <g transform="translate(66 22) rotate(6)">
    <path d="M6 11 C 2.8 11 1.2 8.6 1.6 6 C 4.2 5.6 6 7.6 6 11 Z" fill="#3F6B33"/>
    <path d="M6 11 C 9.2 11 10.8 8.6 10.4 6 C 7.8 5.6 6 7.6 6 11 Z" fill="#527F42"/>
  </g>
  <path d="M88 26 a 8 8 0 0 1 6 -8 a 8 8 0 0 1 -1 9 Z" fill="#C6DC96" stroke="#8CB05C" stroke-width="1.2"/>
  <g fill="#FDFBF3" opacity="0.85"><circle cx="63" cy="78" r="1.2"/><circle cx="72" cy="74" r="1"/><circle cx="68" cy="81" r="0.9"/></g>
</svg>`;

FOOD["salade-mediterraneenne"] = `<svg viewBox="0 0 140 100" aria-hidden="true">
  <ellipse cx="70" cy="90" rx="52" ry="6" fill="#2C3326" opacity="0.09"/>
  <path d="M22 50 Q 22 87 70 87 Q 118 87 118 50 Z" fill="#CBB58E" stroke="#A78D63" stroke-width="2"/>
  <ellipse cx="70" cy="50" rx="48" ry="12.5" fill="#9BAA6B" stroke="#77864A" stroke-width="1.6"/>
  <g fill="#E3C87E" stroke="#C4A250" stroke-width="0.9">
    <circle cx="42" cy="50" r="3.6"/><circle cx="50" cy="45" r="3.6"/><circle cx="58" cy="52" r="3.6"/>
    <circle cx="80" cy="44" r="3.4"/><circle cx="90" cy="52" r="3.4"/><circle cx="100" cy="47" r="3.2"/>
  </g>
  <g fill="#FDFBF3" stroke="#D9CBA6" stroke-width="0.9">
    <rect x="62" y="42" width="8" height="7" rx="1" transform="rotate(-8 66 45)"/>
    <rect x="70" y="50" width="7.4" height="6.6" rx="1" transform="rotate(10 74 53)"/>
    <rect x="34" y="44" width="7" height="6.4" rx="1" transform="rotate(14 37 47)"/>
  </g>
  <g fill="#3A4230">
    <ellipse cx="86" cy="46" rx="3" ry="2.3" transform="rotate(-16 86 46)"/>
    <ellipse cx="48" cy="54" rx="3" ry="2.3" transform="rotate(12 48 54)"/>
    <ellipse cx="104" cy="53" rx="2.8" ry="2.2" transform="rotate(-8 104 53)"/>
  </g>
  <g fill="#C4534E" stroke="#9E3B38" stroke-width="0.9"><circle cx="70" cy="56" r="3.4"/><circle cx="96" cy="42" r="3.2"/></g>
  <g stroke="#3F6B33" stroke-width="1.4" stroke-linecap="round"><path d="M56 40 l 6 -2 M76 55 l 6 1"/></g>
</svg>`;

FOOD["salade-champetre"] = `<svg viewBox="0 0 140 100" aria-hidden="true">
  <ellipse cx="70" cy="90" rx="52" ry="6" fill="#2C3326" opacity="0.09"/>
  <path d="M22 50 Q 22 87 70 87 Q 118 87 118 50 Z" fill="#CBB58E" stroke="#A78D63" stroke-width="2"/>
  <ellipse cx="70" cy="50" rx="48" ry="12.5" fill="#9BC088" stroke="#77A164" stroke-width="1.6"/>
  <g fill="#B4D49E">
    <path d="M34 49 q 4 -9 12 -9 q -2 6 1 9 q -7 4 -13 0 Z"/>
    <path d="M60 42 q 6 -8 14 -6 q -2 6 2 9 q -9 3 -16 -3 Z"/>
    <path d="M92 45 q 6 -7 13 -5 q -2 6 2 8 q -8 4 -15 -3 Z"/>
  </g>
  <g stroke="#4F7A38" stroke-width="2.2" stroke-linecap="round" fill="none">
    <path d="M44 52 q 8 -3 16 -1 M78 52 q 8 -2 15 1 M58 56 q 7 2 13 1"/>
  </g>
  <g stroke="#3E6130" stroke-width="0.9">
    <circle cx="52" cy="46" r="2.8" fill="#4F7A38"/><circle cx="86" cy="48" r="2.8" fill="#4F7A38"/>
    <circle cx="70" cy="57" r="2.6" fill="#4F7A38"/><circle cx="100" cy="54" r="2.5" fill="#4F7A38"/>
  </g>
  <g fill="#EFDFB4" stroke="#CBB076" stroke-width="1">
    <ellipse cx="42" cy="42" rx="5.6" ry="4"/><ellipse cx="104" cy="44" rx="5.2" ry="3.8"/><ellipse cx="64" cy="49" rx="5" ry="3.6"/>
  </g>
</svg>`;

FOOD["salade-lentilles-feta"] = `<svg viewBox="0 0 140 100" aria-hidden="true">
  <ellipse cx="70" cy="90" rx="52" ry="6" fill="#2C3326" opacity="0.09"/>
  <path d="M22 50 Q 22 87 70 87 Q 118 87 118 50 Z" fill="#CBB58E" stroke="#A78D63" stroke-width="2"/>
  <ellipse cx="70" cy="50" rx="48" ry="12.5" fill="#8A6B4D" stroke="#6E5138" stroke-width="1.6"/>
  <g fill="#A5825F">
    <ellipse cx="40" cy="49" rx="2.4" ry="1.7"/><ellipse cx="48" cy="53" rx="2.4" ry="1.7"/><ellipse cx="56" cy="47" rx="2.4" ry="1.7"/>
    <ellipse cx="66" cy="53" rx="2.4" ry="1.7"/><ellipse cx="76" cy="47" rx="2.4" ry="1.7"/><ellipse cx="86" cy="53" rx="2.4" ry="1.7"/>
    <ellipse cx="94" cy="46" rx="2.4" ry="1.7"/><ellipse cx="102" cy="52" rx="2.2" ry="1.6"/><ellipse cx="61" cy="43" rx="2.2" ry="1.6"/>
  </g>
  <g fill="#FDFBF3" stroke="#D9CBA6" stroke-width="0.9">
    <rect x="50" y="42" width="8" height="7" rx="1" transform="rotate(-10 54 45)"/>
    <rect x="78" y="50" width="7.4" height="6.6" rx="1" transform="rotate(12 82 53)"/>
    <rect x="96" y="41" width="7" height="6.2" rx="1" transform="rotate(-6 99 44)"/>
  </g>
  <g>
    <path d="M34 52 a 7 8 0 0 1 8 -4 l -1.4 9 Z" fill="#C6DC96" stroke="#8CB05C" stroke-width="1.1"/>
    <path d="M66 40 a 6.6 8 0 0 1 8 -3.6 l -1.6 8.6 Z" fill="#C6DC96" stroke="#8CB05C" stroke-width="1.1"/>
  </g>
  <g fill="#C4534E" stroke="#9E3B38" stroke-width="0.9"><circle cx="88" cy="44" r="3.2"/><circle cx="46" cy="46" r="3"/><circle cx="108" cy="48" r="2.8"/></g>
  <g stroke="#3F6B33" stroke-width="1.3" stroke-linecap="round"><path d="M58 55 l 6 1 M96 54 l 5 -1.6"/></g>
</svg>`;

const ILLO = { D, FOOD };
