(() => {
  'use strict';
  // V3 aerodb — base des types d'aéronefs (frame/aerodb/SPEC.md § 4) : code de données pur, sans DOM ni texte
  // d'interface, porté de shared/aircraft_catalog.js (canonical, related, record, classify, codeOf, displayName) et de
  // shared/fuel_reference.js (estimate) ; opère sur les objets lus (base OACI, performances), jamais sur des globales.
  // API : window.AeroDBAircraft.create({ db, perf, fleet }) → { canonical, related, record, classify, codeOf,
  //   displayName, label, perf, estimate, search, size } ; db : base des types ({ CODE: fiche, __aliases }) ; perf :
  //   performances ({ CODE: fiche EUROCONTROL / SimBrief / Airframe DB }) ; fleet : [{ type, variant }] facultative.
  if (window.AeroDBAircraft) return;
  /** Texte réduit à ses lettres et chiffres en majuscules, accents retirés (« Phénix » → PHENIX). */
  const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  // noms d'usage des missions (militaires, commerciaux), absents des alias de la base ; la valeur passe encore par eux
  const USAGE = {
    H225: 'EC25',
    H225M: 'EC25',
    EC725: 'EC25',
    CARACAL: 'EC25',
    E3F: 'E3CF',
    AWACS: 'E3CF',
    MRTT: 'A332',
    A330: 'A332',
    A330MRTT: 'A332',
    PHENIX: 'A332',
    C130J: 'C30J',
    C130J30: 'C30J',
    SUPERHERCULES: 'C30J',
    RAFALE: 'RFAL',
    MIRAGE2000: 'MIR2',
    ATLAS: 'A400M',
    A400M: 'A400',
    H120: 'EC20',
    H125: 'AS50',
    H130: 'EC30',
    H135: 'EC35',
    H145: 'EC45',
    H175: 'EC75',
    E2C: 'E2',
    HAWKEYE: 'E2',
    RQ9P: 'Q9',
    MQ9: 'Q9',
    REAPER: 'Q9',
    CAIMAN: 'NH90',
    TIGRE: 'TIGR'
  };
  // consommations de croisière de référence (shared/fuel_reference.js) : types nommés [kg/h, TAS kt, alias, source] et
  // classes OACI { L | M | H : [kg/h, TAS kt] } — ordres de grandeur, une estimation affichée comme telle par le module
  const TYPES = {
    A400: [4000, 400, ['A4M', 'A400M'], 'Airbus A400M : ≈ 8 700 km avec ≈ 50 t de carburant à ≈ 400 kt → ≈ 4 t/h'],
    C130: [2400, 290, ['C130H', 'C30J'], 'Lockheed C-130H : 4 × T56-A-15, ≈ 1 200-1 300 lb/h par moteur'],
    A332: [6000, 470, ['A330', 'KC30'], 'Airbus A330-200 / MRTT : 5,5 à 6,5 t/h selon la masse'],
    E3CF: [6000, 420, ['E3', 'E3F'], 'Boeing E-3F : 4 × CFM56-2 (≈ 12 000-13 000 lb/h)'],
    E2: [1100, 270, ['E2C', 'E2D'], 'Grumman E-2C/D : ≈ 2 400 lb/h en transit'],
    DH8D: [1100, 330, ['Q400'], 'Dash 8-400 : ≈ 1 000-1 200 kg/h'],
    FA50: [850, 450, [], 'Falcon 50 : 3 × TFE731-3, ≈ 1 800-1 900 lb/h'],
    PC24: [480, 420, [], 'Pilatus PC-24 : ≈ 1 000-1 100 lb/h'],
    B350: [360, 300, ['B300'], 'King Air 350 : ≈ 800 lb/h au FL250'],
    BE20: [290, 260, ['B200'], 'King Air 200 : ≈ 640 lb/h'],
    DHC6: [300, 150, [], 'Twin Otter : ≈ 650 lb/h'],
    E121: [220, 235, [], 'EMB-121 Xingu : ≈ 480 lb/h'],
    CL2T: [900, 180, ['CL415', 'CL215T'], 'Canadair CL-415 : transit ≈ 2 000 lb/h, écopage non compris'],
    RFAL: [2000, 480, ['RAFALE'], 'Rafale : ≈ 2 × 12 kN × 0,8 lb/lbf/h → ≈ 2 t/h'],
    MIR2: [1500, 480, ['M2000'], 'Mirage 2000 : ≈ 15 kN × 0,9 lb/lbf/h → ≈ 1,4-1,6 t/h'],
    PC21: [250, 300, [], 'Pilatus PC-21 : ≈ 530 lb/h'],
    TBM7: [180, 280, ['TBM700', 'TBM8', 'TBM9'], 'TBM 700 : ≈ 60 USgal/h'],
    PC6T: [130, 115, ['PC6'], 'PC-6 Turbo Porter : ≈ 280 lb/h'],
    Q9: [80, 170, ['MQ9', 'RQ9P'], 'MQ-9 Reaper : ≈ 170-180 lb/h'],
    CP10: [22, 130, ['CAP10'], 'CAP 10 : ≈ 30 L/h × 0,72 kg/L'],
    SR22: [46, 175, [], 'Cirrus SR22 : ≈ 17 USgal/h'],
    NH90: [650, 140, [], 'NH90 : ≈ 600-700 kg/h'],
    EC25: [680, 145, ['H225', 'H225M', 'EC725'], 'H225M Caracal : ≈ 650-700 kg/h'],
    AS32: [600, 135, ['AS332'], 'AS332 Super Puma : ≈ 600 kg/h'],
    PUMA: [580, 130, ['SA330'], 'SA330 Puma : ≈ 550-600 kg/h'],
    TIGR: [380, 130, ['TIGRE'], 'Tigre : ≈ 350-400 kg/h'],
    H160: [330, 145, [], 'H160 : ≈ 300-350 kg/h (classe 5-6 t biturbine)'],
    AS65: [330, 140, ['AS365', 'AS565', 'SA365'], 'Dauphin / Panther : ≈ 300-350 kg/h'],
    EC45: [220, 125, ['H145', 'EC145', 'BK17'], 'H145 : ≈ 200-240 kg/h'],
    EC35: [190, 120, ['H135', 'EC135'], 'H135 : ≈ 180-200 kg/h'],
    AS55: [190, 115, ['AS355'], 'AS355 Écureuil 2 : ≈ 190 kg/h'],
    AS50: [165, 120, ['AS350', 'H125'], 'AS350 Écureuil : ≈ 160-170 kg/h'],
    GAZL: [160, 120, ['SA342', 'SA341'], 'Gazelle : ≈ 150-170 kg/h'],
    EC20: [110, 110, ['EC120'], 'EC120 Colibri : ≈ 110 kg/h']
  };
  const CLASSES = {
    L1P: {
      L: [35, 130]
    },
    L2P: {
      L: [80, 170]
    },
    L1T: {
      L: [180, 260],
      M: [400, 260]
    },
    L2T: {
      L: [300, 250],
      M: [900, 290]
    },
    L4T: {
      M: [2400, 290],
      H: [4000, 380]
    },
    L1J: {
      L: [250, 330],
      M: [1500, 460]
    },
    L2J: {
      L: [500, 400],
      M: [2400, 450],
      H: [6000, 470]
    },
    L3J: {
      M: [1000, 450],
      H: [7000, 470]
    },
    L4J: {
      M: [2200, 400],
      H: [7500, 470]
    },
    H1P: {
      L: [40, 90]
    },
    H1T: {
      L: [160, 115],
      M: [400, 130]
    },
    H2T: {
      L: [250, 125],
      M: [650, 140],
      H: [1300, 140]
    }
  };
  const TYPE_ALIAS = (() => {
    const m = {};
    for (const [code, row] of Object.entries(TYPES)) {
      m[code] = code;
      for (const a of row[2]) m[fold(a)] ||= code;
    }
    return m;
  })();

  /** Nom d'affichage d'un modèle de la base OACI : référence et surnom d'abord, constructeur ensuite (« AS-350 Ecureuil —
   *  Airbus Helicopters ») ; référence purement numérique : constructeur devant (« Fokker 100 »). */
  function displayName(model) {
    const s = String(model || '').trim().replace(/\s+/g, ' ');
    if (!s) return '';
    const words = s.split(' ');
    let n = 0;
    while (n < words.length - 1 && /^[A-Z][A-Z&.'-]*$/.test(words[n]) && !/\d/.test(words[n])) n++;
    if (!n && words.length > 1 && /^[A-Z][a-z]+$/.test(words[0]) && /\d/.test(words[1])) n = 1;
    if (!n) return s;
    const pretty = w => /^(?:[A-Z]{2,3}|[A-Z]+&[A-Z]+)$/.test(w) && !/^(?:DE|LA|DU|DI|EL)$/.test(w) ? w : w.charAt(0) + w.slice(1)
      .toLowerCase();
    const maker = words.slice(0, n).map(pretty).join(' '),
      rest = words.slice(n).join(' ');
    return /^\d/.test(rest) ? `${maker} ${rest}` : `${rest} — ${maker}`;
  }

  function create({
    db = {},
    perf = {},
    fleet = []
  } = {}) {
    db ||= {};
    perf ||= {};
    const al = db.__aliases || {};
    /** Bout de la chaîne d'alias (A4M → A400M → A400). */
    const chase = c => {
      let x = c;
      for (let i = 0; i < 6 && al[x] && al[x] !== x; i++) x = al[x];
      return x;
    };
    /** Désignateur d'un code (alias suivis jusqu'au bout) ; le code normalisé s'il n'est pas un alias. */
    const canonical = code => chase(fold(code));
    /** Codes équivalents : le code, la chaîne d'alias, puis les alias qui renvoient au désignateur. */
    function related(code) {
      const out = [];
      let k = fold(code);
      for (let i = 0; i < 7 && k && !out.includes(k); i++) {
        out.push(k);
        if (!al[k] || al[k] === k) break;
        k = al[k];
      }
      const end = out[out.length - 1];
      if (end)
        for (const [a, b] of Object.entries(al))
          if (b === end && !out.includes(a)) out.push(a);
      return out;
    }
    /** Fiche de la base d'un code ; null si inconnu. */
    function record(code) {
      const k = canonical(code);
      return k && !k.startsWith('__') && db[k] && typeof db[k] === 'object' ? db[k] : null;
    }
    /** Classement d'un type (code ou fiche ; opts.description : description OACI seule) : { code, rec, icao, fpl, family,
     *  kind, engines, power, category, wing, wtc } — mêmes règles que la V2 (shared/aircraft_catalog.js). */
    function classify(input, {
      description
    } = {}) {
      const rec = input && typeof input === 'object' ? input : input ? record(input) : null,
        d = String(description ?? rec?.description ?? '').toUpperCase(),
        kind = rec?.kind === 'airship' || rec?.kind === 'balloon' ? rec.kind : '',
        family = kind ? 'B' : d[0] && 'LSAHGT'.includes(d[0]) ? d[0] : '',
        engines = kind ? +rec.engines || 0 : d[1] === 'C' ? 2 : parseInt(d[1], 10) || 0,
        power = kind ? String(rec.engine_type || '').toUpperCase() : d[2] && 'JTPER'.includes(d[2]) ? d[2] : '';
      const category = kind || !family ? 'other' : family === 'H' || family === 'G' ? 'helico' : power === 'J' ? 'jet' : power === 'T' ?
        'turboprop' : power === 'P' ? 'piston' : 'other';
      const code = rec?.tdesig ? fold(rec.tdesig) : typeof input === 'string' ? fold(input) : '';
      return {
        code,
        rec,
        icao: rec ? rec.icao !== false : null,
        fpl: rec?.icao === false ? rec.fpl || 'ZZZZ' : code,
        family,
        kind,
        engines,
        power,
        category,
        wing: kind ? 'lta' : 'HGT'.includes(family) && family ? 'rotary' : family === 'A' || family === 'S' ? 'amphibious' : family ===
          'L' ?
          'fixed' : '',
        wtc: String(rec?.wtc || '').toUpperCase()
      };
    }
    /** Désignateur OACI d'un type écrit en clair (« A330 MRTT Phénix », « Rafale B — Patrouille ») ; '' si rien. */
    function codeOf(text) {
      const words = String(text || '').split(/[\s/,;+()—–]+/).map(fold).filter(w => w.length >= 2 && /[A-Z]/.test(w));
      const hit = k => !k ? '' : db[k] && !k.startsWith('__') && !db[k].local ? chase(k) : al[k] ? chase(k) : USAGE[k] ? chase(USAGE[k]) :
        '';
      const whole = fold(text);
      for (const r of fleet || [])
        if (whole && r.type && (fold(r.variant) === whole || fold(r.type) === whole)) return hit(fold(r.type)) || chase(fold(r.type));
      for (const k of [whole, ...words.slice(1).map((w, i) => words[i] + w), ...words]) {
        const c = hit(k);
        if (c) return c;
      }
      for (const w of words.filter(x => x.length >= 4)) {
        const found = Object.keys(db).filter(k => !k.startsWith('__') && fold(String(db[k]?.model || '').split(/\s+/).at(-1)) === w);
        if (found.length === 1) return chase(found[0]);
      }
      return '';
    }
    /** Libellé « Nom d'usage (CODE) » d'un code ; le code seul s'il est inconnu. */
    const label = code => {
      const r = record(code),
        k = canonical(code);
      return r?.model ? `${displayName(r.model)} (${k})` : k;
    };
    /** Fiche de performances d'un code (rangée sous l'un de ses codes équivalents) ; null si aucune. */
    const perfOf = code => related(code).map(k => perf[k]).find(Boolean) || null;
    /** Catégorie de sillage : MTOW EUROCONTROL, sinon Airframe DB, sinon base des types (« L/M » : L). */
    const wtcOf = (row, apd, adb) => {
      const mtow = +apd?.takeoff?.mtowKg || +adb?.mtowKg || 0;
      if (mtow > 0) return mtow < 7000 ? 'L' : mtow < 136000 ? 'M' : 'H';
      const w = String(row?.wtc || '').toUpperCase()[0];
      return w && 'LMH'.includes(w) ? w : '';
    };
    /** Estimation de la consommation de croisière (type nommé, sinon classe OACI et sillage) : { kgPerHour, tasKt,
     *  ceilingFt, basis: 'type' | 'class', code, cls, wtc, src } ; null si ni le type ni sa classe ne sont connus. */
    function estimate(codes) {
      const ks = [...new Set([].concat(codes || []).map(fold).filter(Boolean))],
        apd = ks.map(perfOf).find(Boolean) || null,
        adb = apd?.airframedb || null;
      for (const k of ks) {
        const row = record(k),
          code = TYPE_ALIAS[k] || TYPE_ALIAS[canonical(k)] || TYPE_ALIAS[fold(row?.tdesig)];
        if (code) {
          const [kg, tas, , src] = TYPES[code];
          return {
            kgPerHour: kg,
            tasKt: tas,
            ceilingFt: adb?.ceilingFt > 0 ? adb.ceilingFt : null,
            basis: 'type',
            code,
            cls: String(row?.description || ''),
            wtc: wtcOf(row, apd, adb),
            src
          };
        }
      }
      for (const k of ks) {
        const row = record(k),
          cls = String(row?.description || '').toUpperCase(),
          band = CLASSES[cls] || CLASSES[cls.replace(/^[AG]/, 'L')];
        if (!band) continue;
        const w = wtcOf(row, apd, adb),
          pick = band[w] ? w : ['M', 'L', 'H'].find(x => band[x]);
        return {
          kgPerHour: band[pick][0],
          tasKt: adb?.cruiseKt > 0 ? adb.cruiseKt : band[pick][1],
          ceilingFt: adb?.ceilingFt > 0 ? adb.ceilingFt : null,
          basis: 'class',
          code: row?.tdesig || k,
          cls,
          wtc: pick,
          src: `ICAO class ${cls} / ${pick}${adb?.cruiseKt > 0 ? '; Airframe DB TAS and ceiling' : ''}`
        };
      }
      return null;
    }
    /** Types qui répondent au texte, dans cet ordre : désignateur qui commence par le texte ; alias ou nom d'usage
     *  (RAFALE, H145) qui commence par lui ; mot du modèle qui commence par lui ; [{ code, label }], n au plus. */
    function search(text, n = 20) {
      const q = fold(text);
      if (q.length < 2) return [];
      const ranks = [
          [],
          [],
          []
        ],
        put = (r, k) => k && db[k] && !ranks.some(l => l.includes(k)) && ranks[r].push(k);
      for (const k of Object.keys(db)) {
        if (k.startsWith('__') || !db[k] || typeof db[k] !== 'object') continue;
        if (k.startsWith(q)) put(0, k);
        else if (String(db[k].model || '').split(/[\s/-]+/).some(w => fold(w).startsWith(q))) put(2, k);
      }
      for (const [a, b] of [...Object.entries(al), ...Object.entries(USAGE)])
        if (a.startsWith(q)) put(1, chase(b));
      return ranks.flat().slice(0, n).map(code => ({
        code,
        label: label(code)
      }));
    }
    return {
      canonical,
      related,
      record,
      classify,
      codeOf,
      displayName,
      label,
      perf: perfOf,
      estimate,
      search,
      size: () => Object.keys(db).filter(k => !k.startsWith('__')).length
    };
  }

  window.AeroDBAircraft = {
    create,
    fold,
    displayName,
    USAGE,
    TYPES,
    CLASSES
  };
})();
