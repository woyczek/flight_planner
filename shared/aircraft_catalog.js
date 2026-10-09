(() => {
  'use strict';
  // Catalogue d'aéronefs commun aux trois applications (CR, Landing Performance
  // Dashboard, Flight Planner) — chargé juste après AircraftDB/aircraft_db.js :
  //   · types : base OACI (aircraft_db.js, avec les modifications de la page Paramétrage plus
  //     récentes que le fichier), types ajoutés
  //     localement dans les CR (missionAircraftTypes:v1) — fusionnés dans window.AIRCRAFT_DB :
  //     toutes les pages voient les mêmes types ;
  //   · appareils : flotte (aircraft_fleet.js), référence anonymisée (defa_reference.js),
  //     appareils des missions enregistrées, journal chargé — base « lâche » : aide à la
  //     saisie, jamais une contrainte (un appareil absent reste saisissable).
  const read = key => {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
      return null;
    }
  };
  /** Clé de comparaison : majuscules, lettres et chiffres seulement. */
  const key = v => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Plus de types écrits dans le code : les types de la flotte viennent de la base OACI (aircraft_db.js, liste
  // officielle Doc 8643 via AircraftDB/update_aircraft_db.py), les codes propres à la compagnie (E2C, RQ9P) y sont des
  // alias (aircraft_overrides.json). Objet vide gardé pour les modules qui le lisent encore.
  const SUPPLEMENT = {};

  // ---- types : base commune enrichie (en place : les pages gardent leur lecture de AIRCRAFT_DB)
  const file = window.AIRCRAFT_DB || (window.AIRCRAFT_DB = {});
  const override = read('dataOverride:aircraftDb:v1');
  if (override?.data && override.updatedAt > String(file.__meta?.admin_saved || '')) Object.assign(file, override.data);
  /** Ajoute un type à window.AIRCRAFT_DB s'il n'y est pas déjà (ni en alias) ; local : origine de l'ajout (supplément, type ajouté dans un CR). */
  const addType = (code, entry, local) => {
    const k = key(code);
    if (!k || file[k] || file.__aliases?.[k]) return;
    file[k] = {
      tdesig: k,
      model: entry.model || '',
      category: entry.category || '',
      wtc: entry.wtc || '',
      description: entry.category === 'rotary' ? 'H' : entry.category === 'amphibious' ? 'A' : entry.category === 'fixed' ? 'L' : '',
      local
    };
  };
  Object.entries(read('missionAircraftTypes:v1') || {}).forEach(([code, entry]) => addType(code, entry || {}, 'local'));

  // ---- appareils (par immatriculation ; la donnée la plus récente l'emporte)
  function defaAircraft() {
    const out = new Map();
    // Fusions mémorisées (fiche appareil › fusionner) : A → B.
    const map = (read('missionMergeMap:v1') || {}).aircraft || {};
    /** Immatriculation normalisée, ramenée à celle de la flotte quand un indicatif la désigne. */
    const mapped = reg => {
      let k = key(reg);
      for (let i = 0; i < 5 && map[k]; i++) k = map[k];
      return k;
    };
    /** Fusionne un appareil (flotte, référence, missions) dans le catalogue : la donnée la plus récente l'emporte, champs vides complétés. */
    const merge = (r, date = '') => {
      const k = mapped(r.registration);
      if (!k) return;
      const cur = out.get(k) || {
        registration: k === key(r.registration) ? r.registration : (/^[A-Z]{5}$/.test(k) ? `${k[0]}-${k.slice(1)}` : k),
        callsigns: [],
        sources: []
      };
      const newer = String(date) >= String(cur.date || '');
      ['type', 'variant', 'operator', 'base', 'homeAd', 'fleetId', 'category'].forEach(f => {
        if (r[f] && (newer || !cur[f])) cur[f] = r[f];
      });
      if (r.lastAd && newer) cur.lastAd = r.lastAd;
      [r.callsign, ...(r.callsigns || [])].filter(Boolean).forEach(c => {
        const u = String(c).toUpperCase();
        if (!cur.callsigns.includes(u)) cur.callsigns.push(u);
      });
      if (date > String(cur.date || '')) cur.date = date;
      if (r.source && !cur.sources.includes(r.source)) cur.sources.push(r.source);
      out.set(k, cur);
    };
    (window.DEFA_FLEET || []).forEach(r => merge({
      ...r,
      homeAd: r.base,
      source: 'fleet'
    }, '0000'));
    (window.DEFA_REFERENCE?.aircraft || []).forEach(r => merge({
      ...r,
      source: 'reference'
    }, r.last || ''));
    Object.values(read('missionAircraftRegistry:v1') || {}).forEach(r => merge({
      ...r,
      source: 'missions'
    }, r.date || ''));
    ((read('defaFlightLog:v1') || {}).records || []).forEach(r => merge({
      registration: r.registration,
      type: r.type,
      variant: r.variant,
      callsign: r.callsign,
      lastAd: r.arr || r.dep,
      source: 'log'
    }, `${r.date} ${r.time || ''}`));
    return [...out.values()].sort((a, b) => a.registration.localeCompare(b.registration));
  }
  // Types employés par la compagnie (avec leurs appareils) : Planner, Landing, reportings.
  function defaTypes() {
    const out = new Map();
    defaAircraft().forEach(a => {
      const code = key(a.type);
      if (!code) return;
      const resolved = key(file.__aliases?.[code] || code),
        t = out.get(resolved) || {
          type: resolved,
          model: file[resolved]?.model || '',
          registrations: []
        };
      t.registrations.push(a.registration);
      out.set(resolved, t);
    });
    return [...out.values()].sort((a, b) => a.type.localeCompare(b.type));
  }
  /** Pilotes de la référence (trigrammes, activité). */
  const pilots = () => window.DEFA_REFERENCE?.pilots || [];

  /** Nom d'affichage d'un modèle de la base OACI (« CONSTRUCTEUR RÉF Surnom ») : référence et surnom d'abord,
   *  constructeur ensuite (« AS-350 Ecureuil — Airbus Helicopters ») : un nom tronqué garde l'essentiel. Référence
   *  purement numérique : constructeur devant (« Fokker 100 », « Boeing 787-8 BBJ ») ; sans constructeur : inchangé. */
  function displayName(model) {
    const s = String(model || '').trim().replace(/\s+/g, ' ');
    if (!s) return '';
    const words = s.split(' ');
    // constructeur : mots de tête en capitales sans chiffre (sinon un premier mot suivi d'une référence chiffrée)
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
  // ---- type écrit en clair dans une mission → désignateur OACI (Doc 8643)
  // Noms d'usage des missions (militaires, absents des alias de la base) ; la valeur passe encore par les alias de la
  // base (A400M → désignateur de la base).
  const USAGE = {
    H225: 'EC25',
    H225M: 'EC25',
    EC725: 'EC25',
    CARACAL: 'EC25',
    E3F: 'E3CF',
    AWACS: 'E3CF',
    MRTT: 'A332',
    A330: 'A332', // famille sans désignateur : l'A330 des missions est le MRTT Phénix, un A330-200
    A330MRTT: 'A332',
    PHENIX: 'A332',
    C130J: 'C30J',
    C130J30: 'C30J',
    SUPERHERCULES: 'C30J',
    RAFALE: 'RFAL',
    MIRAGE2000: 'MIR2',
    ATLAS: 'A400M',
    A400M: 'A400', // désignateur OACI de l'A400M
    // noms commerciaux Airbus Helicopters (le désignateur reste celui d'Eurocopter)
    H120: 'EC20',
    H125: 'AS50',
    H130: 'EC30',
    H135: 'EC35',
    H145: 'EC45',
    H175: 'EC75',
    // drones et guet aérien
    E2C: 'E2',
    HAWKEYE: 'E2',
    RQ9P: 'Q9',
    MQ9: 'Q9',
    REAPER: 'Q9',
    CAIMAN: 'NH90',
    TIGRE: 'TIGR'
  };
  /** Texte réduit à ses lettres et chiffres en majuscules, accents retirés (« Phénix » → PHENIX). */
  const fold = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  /** Désignateur OACI d'un type écrit en clair (« MIR2 Mirage 2000B », « A330 MRTT Phénix », « C-130J-30 Super Hercules »,
   *  « Rafale B — Patrouille de 2 ») : type ou variante de la flotte (DEFA_FLEET) écrits tels quels, puis texte entier,
   *  mots deux à deux, mot à mot — désignateur de la base, alias, nom d'usage ; à défaut, nom propre du modèle d'un
   *  seul type de la base (« DASSAULT Rafale »). Les saisies locales des CR (entrées « local ») ne sont pas des
   *  désignateurs. '' si rien. */
  function codeOf(text) {
    const db = window.AIRCRAFT_DB || {},
      al = db.__aliases || {},
      words = String(text || '').split(/[\s/,;+()—–]+/).map(fold).filter(w => w.length >= 2 && /[A-Z]/.test(w));
    /** Bout de la chaîne d'alias (A4M → A400M → A400 : un code maison ou en usage renvoyé vers le désignateur OACI). */
    const chase = c => {
      let x = c;
      for (let i = 0; i < 5 && al[x] && al[x] !== x; i++) x = al[x];
      return x;
    };
    const hit = k => {
      if (!k) return '';
      if (db[k] && !k.startsWith('__') && !db[k].local) return chase(k);
      if (al[k]) return chase(k);
      if (USAGE[k]) return chase(USAGE[k]);
      return '';
    };
    // flotte : « A330 MRTT Phénix » (variante) → A332, « Rafale C » → RFAL — la donnée de la compagnie avant les tables
    const whole = fold(text);
    for (const r of window.DEFA_FLEET || []) {
      if (whole && r.type && (fold(r.variant) === whole || fold(r.type) === whole)) return hit(fold(r.type)) || chase(fold(r.type));
    }
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
  window.AircraftCatalog = {
    codeOf,
    displayName,
    SUPPLEMENT,
    defaAircraft,
    defaTypes,
    pilots,
    key
  };
})();
