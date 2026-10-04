/* Les faux navigateurs du lot voix : SpeechRecognition et speechSynthesis simulés,
   installés avant le chargement de la page (addInitScript). Le test joue ensuite le rôle
   de la personne qui parle et du moteur de synthèse, depuis window.__faux. */

export async function installerFaux(page, { ecoute = true, lecture = true, refus = false } = {}) {
  await page.addInitScript(({ ecoute, lecture, refus }) => {
    const faux = window.__faux = {
      sessions: [],          // chaque SpeechRecognition créée, dans l'ordre
      lectures: [],          // chaque énoncé confié à speak()
      annulations: 0,
      refus,
      active: () => faux.sessions.filter(s => s.demarree && !s.terminee),
      /* La personne dit quelque chose : résultats cumulés comme le fait Chrome
         (indices stables, le dernier se précise). */
      dire(textes, { final = true, depuis = null } = {}) {
        const s = faux.active().at(-1);
        if (!s) throw new Error("aucune écoute active");
        const liste = [].concat(textes);
        const base = depuis ?? s.resultats.length;
        liste.forEach((t, k) => {
          const res = [{ transcript: t, confidence: 0.9 }];
          res.isFinal = final;
          s.resultats[base + k] = res;
        });
        s.onresult && s.onresult({ resultIndex: base, results: s.resultats });
      },
      /* Le navigateur coupe l'écoute de lui-même (iOS après un silence). */
      couper() { const s = faux.active().at(-1); s && s.finir(); },
      /* Le moteur de synthèse a fini de lire. */
      finLecture() { const u = faux.lectures.at(-1); u && u.finir && u.finir(); }
    };

    if (ecoute) {
      class FauxReconnaissance {
        constructor() { this.resultats = []; this.demarree = false; this.terminee = false; faux.sessions.push(this); }
        start() {
          if (this.demarree) throw new DOMException("déjà lancée", "InvalidStateError");
          this.demarree = true;
          setTimeout(() => {
            if (faux.refus) { this.onerror && this.onerror({ error: "not-allowed" }); this.finir(); }
          }, 0);
        }
        finir() {
          if (this.terminee) return;
          this.terminee = true;
          setTimeout(() => this.onend && this.onend(), 0);
        }
        stop() { this.finir(); }
        abort() { this.finir(); }
      }
      window.SpeechRecognition = FauxReconnaissance;
    }

    if (lecture) {
      window.SpeechSynthesisUtterance = class { constructor(texte) { this.text = texte; } };
      const voix = [
        { name: "Anglais", lang: "en-US", localService: true },
        { name: "Québec", lang: "fr-CA", localService: true },
        { name: "France en ligne", lang: "fr-FR", localService: false },
        { name: "France locale", lang: "fr-FR", localService: true }
      ];
      let courante = null;
      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: {
          getVoices: () => voix,
          addEventListener() {},
          speak(u) {
            courante = u;
            u.finir = () => { if (courante === u) courante = null; u.onend && u.onend({}); };
            faux.lectures.push(u);
          },
          cancel() {
            faux.annulations++;
            const u = courante;
            courante = null;
            if (u) setTimeout(() => u.onerror && u.onerror({ error: "canceled" }), 0);
          }
        }
      });
    }
  }, { ecoute, lecture, refus });
}

export async function ouvrirBanc(page) {
  await page.goto("/tests/fixtures/voix.html");
  await page.waitForFunction(() => window.__pret === true);
}
