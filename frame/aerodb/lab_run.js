(() => {
  'use strict';
  // V3 aerodb — laboratoire des données (TEMPORAIRE) : les deux modes SANS DOMParser de la mesure du ZIP du SIA, utilisables
  // dans un Worker (lab_worker.js) comme dans la page (tests de la zone K), et le résumé commun aux trois modes.
  //   · mode « b » (Worker, ZIP tenu en mémoire) : ZipStore.read (shared/zip_store.js, chargé tel quel dans le Worker avec
  //     window = self) → entrée inflatée en un seul tampon → texte entier → lecteur par balises en tranches de 1 Mo ;
  //   · mode « c » (Worker, tout en flux) : répertoire central lu en fin de fichier, entrée = flux inflaté (File.slice().stream()
  //     → DecompressionStream) → décodage en flux → lecteur par balises ; ni l'archive ni une entrée n'existent en mémoire.
  // Étapes mesurées (ms) : zip (ouverture), inflate, decode, parse (b) ; stream (c, avec l'inflate seul d'une passe à
  // part pour répartir) ; compile (fin du lecteur + sérialisation JSON par sorte, SANS découpage par zone : les objets de
  // b et c sont réduits, leurs tailles ne se comparent pas à celles du mode a). Mémoire : performance.memory (Chromium,
  // aussi dans un Worker) échantillonnée à chaque étape et tous les 4 Mo lus ; ailleurs, null.
  const G = typeof window !== 'undefined' ? window : self;
  const now = () => performance.now();
  const heap = () => {
    try {
      return performance.memory ? performance.memory.usedJSHeapSize : null;
    } catch {
      return null;
    }
  };
  /** Suivi : étapes { name, ms, heap }, pic du tas (échantillons, donc minorant), émission en direct. */
  function tracker(emit) {
    const steps = [];
    let peak = heap() || 0;
    const sample = () => {
      const h = heap();
      if (h && h > peak) peak = h;
      return h;
    };
    return {
      steps,
      sample,
      peak: () => peak || null,
      async step(name, fn, extra) {
        emit?.({
          type: 'step-start',
          name
        });
        const t0 = now();
        let r;
        try {
          r = await fn();
        } finally {
          const s = {
            name,
            ms: Math.round(now() - t0),
            heap: sample(),
            ...extra
          };
          steps.push(s);
          emit?.({
            type: 'step',
            step: s
          });
        }
        return r;
      }
    };
  }
  const isSia = n => /(^|\/)XML_SIA[^/]*\.xml$/i.test(n);
  const isAixm = n => /(^|\/)AIXM[^/]*\.xml$/i.test(n);
  const kb = n => Math.round(n / 1024);

  /** Résumé commun (comptes par sorte) d'un résultat de lecteur : { sia, aixm } (b, c) — ou construit par la page pour a. */
  function summary(sia, aixm) {
    const s = {};
    if (sia) {
      s.airspacesSia = sia.airspaces.length;
      s.ringsSia = sia.airspaces.reduce((n, a) => n + a.rings.length, 0);
      s.pointsSia = sia.airspaces.reduce((n, a) => n + a.rings.reduce((m, r) => m + r.length, 0), 0);
      s.vrp = sia.vrp.length;
      s.countsSia = sia.counts;
    }
    if (aixm) {
      s.airspacesAixm = aixm.airspaces.length;
      s.pointsAixm = aixm.airspaces.reduce((n, a) => n + a.points, 0);
      s.aerodromes = aixm.aerodromes.length;
      s.navaids = aixm.navaids.length;
      s.navaidKinds = aixm.navaids.reduce((o, n) => (o[n.kind] = (o[n.kind] || 0) + 1, o), {});
      s.points = aixm.points;
      s.obstacles = aixm.obstacles;
      s.obstacleCells = Object.keys(aixm.obstacleCells).length;
      s.countsAixm = aixm.counts;
    }
    return s;
  }
  /** Taille JSON (octets UTF-8) de chaque sorte d'un résultat de lecteur. */
  function sizes(sia, aixm) {
    const enc = new TextEncoder(),
      n = v => enc.encode(JSON.stringify(v)).length,
      o = {};
    if (sia) {
      o.airspaces = n(sia.airspaces);
      o.vrp = n(sia.vrp);
    }
    if (aixm) {
      o.aerodromes = n(aixm.aerodromes);
      o.navaids = n(aixm.navaids);
      o.obstaclemax = n(aixm.obstacleCells);
      o.airspacesAixm = n(aixm.airspaces);
    }
    return o;
  }
  const slices = (text, size, push) => {
    for (let i = 0; i < text.length; i += size) push(text.slice(i, i + size));
  };
  /** Rend la main au fil du Worker/de la page (sans minuterie) pour laisser passer les messages. */
  const breathe = () => new Promise(r => {
    const c = new MessageChannel();
    c.port1.onmessage = () => r();
    c.port2.postMessage(0);
  });

  /** Mode b : ZipStore + texte entier + lecteur par balises. */
  async function modeB(file, {
    emit
  } = {}) {
    const T = tracker(emit),
      Z = G.ZipStore;
    if (!Z) throw new Error('ZipStore missing (shared/zip_store.js)');
    const entries = await T.step('zip', () => Z.read(file), {
      bytes: file.size
    });
    const res = {};
    for (const e of entries) {
      const kind = isSia(e.name) ? 'sia' : isAixm(e.name) ? 'aixm' : '';
      if (!kind) continue;
      const bytes = await T.step(`inflate ${kind}`, () => e.bytes(), {
        bytes: e.size
      });
      const text = await T.step(`decode ${kind}`, async () => new TextDecoder(kind === 'sia' ? 'iso-8859-1' : 'utf-8').decode(bytes), {
        chars: e.size
      });
      const r = G.AeroLabXml.create(kind);
      await T.step(`parse ${kind}`, async () => {
        slices(text, 1 << 20, c => {
          r.push(c);
          T.sample();
        });
      });
      res[kind] = r.end();
      res[kind + 'Stats'] = r.stats();
      await breathe();
    }
    const out = await T.step('compile', async () => sizes(res.sia, res.aixm));
    return {
      mode: 'b',
      steps: T.steps,
      peak: T.peak(),
      summary: summary(res.sia, res.aixm),
      sizes: out,
      stats: {
        sia: res.siaStats,
        aixm: res.aixmStats
      }
    };
  }

  /** Mode c : tout en flux, ni l'archive ni une entrée en mémoire. */
  async function modeC(file, {
    emit
  } = {}) {
    const T = tracker(emit),
      Zp = G.AeroLabZip;
    if (!Zp.supported()) throw new Error('DecompressionStream not available');
    const entries = await T.step('zip', () => Zp.entries(file), {
      bytes: file.size
    });
    const res = {};
    for (const e of entries) {
      const kind = isSia(e.name) ? 'sia' : isAixm(e.name) ? 'aixm' : '';
      if (!kind) continue;
      // inflate seul (une passe à part, tranches jetées) : sert à répartir le temps du flux entre inflate et lecture
      await T.step(`inflate ${kind} (own pass)`, async () => {
        const rd = (await Zp.stream(file, e)).getReader();
        let n = 0;
        for (;;) {
          const {
            done,
            value
          } = await rd.read();
          if (done) break;
          n += value.byteLength;
          if ((n & 0x3fffff) < value.byteLength) T.sample();
        }
        return n;
      }, {
        bytes: e.size
      });
      const r = G.AeroLabXml.create(kind);
      let next = 4 << 20,
        info;
      await T.step(`stream ${kind} (inflate + decode + parse)`, async () => {
        info = await G.AeroLabXml.pump(await Zp.stream(file, e), r, {
          onBytes: n => {
            if (n >= next) {
              next += 4 << 20;
              T.sample();
            }
          }
        });
      }, {
        bytes: e.size
      });
      res[kind] = r.end();
      res[kind + 'Stats'] = {
        ...r.stats(),
        chunks: info.chunks,
        encoding: info.encoding
      };
      await breathe();
    }
    const out = await T.step('compile', async () => sizes(res.sia, res.aixm));
    return {
      mode: 'c',
      steps: T.steps,
      peak: T.peak(),
      summary: summary(res.sia, res.aixm),
      sizes: out,
      stats: {
        sia: res.siaStats,
        aixm: res.aixmStats
      }
    };
  }
  G.AeroLabRun = {
    modeB,
    modeC,
    summary,
    sizes,
    tracker,
    heap,
    kb,
    isSia,
    isAixm
  };
})();
