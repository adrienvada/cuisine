/* Les mains libres : dicter « suivant » au lieu de toucher l'écran avec des doigts pleins de farine.
   Module autonome (aucun import) : le mode cuisine le charge par import() dynamique et
   se passe de lui quand le navigateur ne sait ni écouter ni parler.

   API — c'est le contrat avec le mode cuisine :

     voixDisponible()  → { ecoute, lecture }
         ecoute : le navigateur sait reconnaître la voix (SpeechRecognition / webkitSpeechRecognition)
         lecture : il sait la lire à voix haute (speechSynthesis)
         À tester avant de proposer le moindre bouton.

     lire(texte)       → Promise, résolue quand la lecture est finie (ou interrompue, ou impossible)
         Voix française (fr-FR, locale de préférence), débit naturel. Interrompt la lecture
         précédente : on n'empile jamais deux étapes. Ne rejette jamais.

     arreterLecture()  → coupe la lecture en cours (sa promesse se résout)

     ecouter(commandes, { onErreur }) → { arreter() }
         commandes = { suivant, precedent, repeter, minuteur, ingredients, terminer }
         Chaque clé est une fonction facultative, appelée sans argument.
         À lancer depuis un geste (le bouton « Mains libres ») : c'est là que le navigateur
         demande l'accès au micro. Tant que l'écoute est active :
           · elle se relance toute seule quand le navigateur l'arrête (iOS coupe après un silence) ;
           · elle se met en pause pendant que lire() parle — sinon l'appli s'entend elle-même
             et se donne des ordres — et reprend ensuite ;
           · une commande ne se déclenche qu'une fois par énoncé, même si le navigateur
             renvoie dix résultats intermédiaires (« suiv… suivant… suivant »).
         onErreur(message) reçoit un message prêt à afficher, en français ; après un refus du
         micro ou une panne durable, l'écoute est arrêtée pour de bon (ne pas la relancer
         sans geste de l'utilisateur). arreter() est idempotent. */

const LANGUE = "fr-FR";

/* ---------- Disponibilité ---------- */

const reconnaissance = () => globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition || null;
const synthese = () => (globalThis.speechSynthesis && globalThis.SpeechSynthesisUtterance) ? globalThis.speechSynthesis : null;

export function voixDisponible() {
  return { ecoute: !!reconnaissance(), lecture: !!synthese() };
}

/* ---------- Comprendre ce qui est dit ---------- */

/* Les reconnaissances varient (« Suivant. », « suivante », « c’est bon ! ») : on compare
   sur du texte sans accents, sans ponctuation, apostrophes comme espaces, bordé d'espaces
   pour qu'un mot ne se cache pas dans un autre (« fini » dans « affiné »). */
const epurer = t => " " + String(t ?? "")
  .toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/œ/g, "oe")
  .replace(/[^a-z0-9]+/g, " ")
  .trim() + " ";

/* L'ordre compte quand un énoncé en contient plusieurs (« répète l'étape suivante ») :
   le plus précis passe avant, le banal « ok » ferme la marche. */
const LEXIQUE = [
  ["minuteur", ["minuteur", "minuterie", "chrono", "chronometre", "timer"]],
  ["ingredients", ["ingredient", "ingredients", "qu est ce qu il faut", "qu est ce qu on met", "il faut quoi"]],
  ["terminer", ["termine", "terminer", "terminee", "fini", "finie", "finir", "j ai fini", "on a fini"]],
  ["precedent", ["precedent", "precedente", "retour", "avant", "en arriere", "reviens", "revenir"]],
  ["repeter", ["repete", "repeter", "repetes", "relis", "relire", "relit", "encore", "redis"]],
  ["suivant", ["suivant", "suivante", "etape suivante", "apres", "c est bon", "ok", "okay", "continue", "on continue"]]
].map(([nom, mots]) => [nom, mots.map(m => " " + m + " ")]);

/* La commande d'un énoncé, ou null. Exportée pour les tests. */
export function commandeDepuis(texte) {
  const t = epurer(texte);
  for (const [nom, mots] of LEXIQUE) if (mots.some(m => t.includes(m))) return nom;
  return null;
}

/* ---------- Lire à voix haute ---------- */

let voixChoisie = null;
let lectureNo = 0;           // numéro de la lecture en cours : une plus ancienne ne reprend rien
let enCours = null;          // énoncé en train d'être dit : Chrome le ramasse sinon et n'envoie jamais onend
let lectureFin = null;       // termine la lecture en cours (résout sa promesse)
const ecoutes = new Set();   // écoutes ouvertes, à suspendre pendant qu'on parle

/* fr-FR avant les autres français, une voix installée sur l'appareil avant une voix en
   ligne (elle démarre sans délai et marche hors réseau). Exportée pour les tests. */
export function choisirVoix(voix) {
  const note = v => {
    const l = String(v.lang || "").replace("_", "-").toLowerCase();
    return (l === "fr-fr" ? 4 : l.startsWith("fr") ? 2 : 0) + (v.localService ? 1 : 0);
  };
  let meilleure = null;
  for (const v of voix || []) {
    if (note(v) >= 2 && (!meilleure || note(v) > note(meilleure))) meilleure = v;
  }
  return meilleure;
}

function voixFrancaise(synth) {
  if (voixChoisie) return voixChoisie;
  voixChoisie = choisirVoix(synth.getVoices ? synth.getVoices() : []);
  return voixChoisie;
}

/* Les voix arrivent parfois après le chargement (Chrome) : on réessaie à leur arrivée. */
let ecouteVoix = false;
function surveillerVoix(synth) {
  if (ecouteVoix || !synth.addEventListener) return;
  ecouteVoix = true;
  synth.addEventListener("voiceschanged", () => { voixChoisie = null; });
}

export function lire(texte) {
  const synth = synthese();
  const phrase = String(texte ?? "").trim();
  if (!synth || !phrase) return Promise.resolve();
  surveillerVoix(synth);

  const quelqu = lectureFin !== null;
  const no = ++lectureNo;
  if (quelqu) lectureFin();        // la précédente se résout, sans rien relancer
  suspendre(true);

  return new Promise(resolve => {
    let fini = false, garde = null;
    const finir = () => {
      if (fini) return;
      fini = true;
      clearTimeout(garde);
      if (lectureFin === finir) { lectureFin = null; enCours = null; }
      resolve();
      // Seule la dernière lecture rend le micro : si une autre l'a remplacée, elle parle encore.
      if (no === lectureNo) suspendre(false);
    };
    lectureFin = finir;

    const dire = () => {
      if (fini) return;
      const u = new globalThis.SpeechSynthesisUtterance(phrase);
      u.lang = LANGUE;
      u.rate = 1;
      const v = voixFrancaise(synth);
      if (v) u.voice = v;
      u.onend = u.onerror = finir;
      enCours = u;
      // Chrome laisse parfois une lecture sans fin (onend jamais envoyé) : sans garde,
      // le micro resterait coupé et la promesse en suspens pour toujours.
      garde = setTimeout(() => { try { synth.cancel(); } catch {} finir(); }, 4000 + phrase.length * 150);
      try { synth.speak(u); } catch { finir(); }
    };

    try { synth.cancel(); } catch {}
    // Enchaîner cancel() et speak() sans souffler fait parfois taire la seconde (iOS, Chrome).
    if (quelqu) setTimeout(dire, 80); else dire();
  });
}

export function arreterLecture() {
  const synth = synthese();
  if (synth) { try { synth.cancel(); } catch {} }
  if (lectureFin) lectureFin();
}

/* ---------- Écouter ---------- */

const MESSAGES = {
  refus: "Le micro est refusé : autorise-le dans les réglages du navigateur pour commander à la voix.",
  micro: "Aucun micro n'a été trouvé sur cet appareil.",
  absent: "Ce navigateur ne sait pas écouter la voix. Essaie Safari ou Chrome.",
  panne: "L'écoute vocale s'est interrompue. Touche le bouton pour la relancer."
};

/* On suspend les écoutes pendant une lecture ; chacune sait se rendormir et se réveiller. */
function suspendre(oui) {
  for (const e of ecoutes) e.pause(oui);
}

export function ecouter(commandes = {}, { onErreur } = {}) {
  const Ctor = reconnaissance();
  const signaler = msg => { try { onErreur && onErreur(msg); } catch {} };
  if (!Ctor) {
    signaler(MESSAGES.absent);
    return { arreter() {} };
  }

  let actif = true;
  let enPause = lectureFin !== null;   // on peut naître pendant une lecture
  let rec = null;
  let relance = null;
  let echecs = 0;                      // sessions coupées d'emblée, de suite : on ralentit puis on abandonne
  let debut = 0;

  const ecoute = {
    pause(oui) {
      if (!actif || enPause === oui) return;
      enPause = oui;
      if (oui) { clearTimeout(relance); fermer(); }
      // Un instant de silence : la fin de la phrase lue résonne encore dans la pièce.
      else relance = setTimeout(demarrer, 250);
    }
  };

  function fermer() {
    const r = rec;
    rec = null;
    if (!r) return;
    r.onresult = r.onerror = r.onend = null;
    try { r.abort(); } catch {}
  }

  function arret(msg) {
    if (!actif) return;
    actif = false;
    clearTimeout(relance);
    fermer();
    ecoutes.delete(ecoute);
    if (msg) signaler(msg);
  }

  function demarrer() {
    if (!actif || enPause || rec) return;
    const r = new Ctor();
    rec = r;
    r.lang = LANGUE;
    r.continuous = true;
    r.interimResults = true;     // « suivant » part dès qu'il est entendu, sans attendre la fin de phrase
    r.maxAlternatives = 3;
    const declenches = new Set();   // numéros d'énoncés déjà traités dans cette session

    r.onresult = e => {
      if (rec !== r) return;
      echecs = 0;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (declenches.has(i)) continue;
        const res = e.results[i];
        for (let j = 0; j < res.length; j++) {
          const cmd = commandeDepuis(res[j].transcript);
          if (!cmd) continue;
          declenches.add(i);
          try { commandes[cmd] && commandes[cmd](); } catch (err) { console.error(err); }
          break;
        }
      }
    };

    r.onerror = e => {
      if (rec !== r) return;
      const code = e && e.error;
      if (code === "not-allowed" || code === "service-not-allowed") arret(MESSAGES.refus);
      else if (code === "audio-capture") arret(MESSAGES.micro);
      // Les autres (no-speech, aborted, network…) finissent par onend, qui relance.
    };

    r.onend = () => {
      if (rec !== r) return;
      rec = null;
      if (!actif || enPause) return;
      // Une session qui meurt aussitôt, plusieurs fois de suite, ne se relance pas à l'infini.
      if (Date.now() - debut < 1000) echecs++; else echecs = 0;
      if (echecs >= 6) return arret(MESSAGES.panne);
      relance = setTimeout(demarrer, Math.min(5000, 250 * 2 ** echecs));
    };

    debut = Date.now();
    try { r.start(); }
    catch (err) {
      rec = null;
      // start() jette quand le micro est refusé d'emblée ; ailleurs, on retente plus tard.
      if (err && (err.name === "NotAllowedError" || err.name === "SecurityError")) arret(MESSAGES.refus);
      else { echecs++; if (echecs >= 6) arret(MESSAGES.panne); else relance = setTimeout(demarrer, 500); }
    }
  }

  ecoutes.add(ecoute);
  demarrer();
  return { arreter: () => arret() };
}
