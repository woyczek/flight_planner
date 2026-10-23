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

  // ---- modifications locales d'une base (Paramètres › bases, « Appliquer dans ce navigateur » : dataOverride:<id>:v1) :
  // une seule règle pour toute la suite (décision du 16/10/2026), appelée par data_admin.js et mission_core/aircraft.js
  /** Écrit une valeur JSON dans le localStorage (stockage plein : sans effet). */
  const write = (k, value) => {
    try {
      localStorage.setItem(k, JSON.stringify(value));
    } catch {
      /* stockage plein */
    }
  };
  /** Fusion d'une modification locale faite sur un fichier plus ancien (ou d'une ancienne surcharge sans date de base)
   *  avec le fichier actuel : lignes du fichier gardées, lignes locales prioritaires (même clé), objets fusionnés clé par
   *  clé. keyOf : clé d'une ligne des tableaux. */
  function mergeOverride(fileData, local, keyOf) {
    const out = structuredClone(fileData);
    for (const [k, v] of Object.entries(local || {})) {
      if (Array.isArray(v) && Array.isArray(out[k]) && keyOf) {
        const id = r => keyOf(r) || JSON.stringify(r),
          seen = new Map(out[k].map((r, i) => [id(r), i]));
        for (const r of v) {
          const i = seen.get(id(r));
          if (i == null) out[k].push(structuredClone(r));
          else out[k][i] = structuredClone(r);
        }
      } else if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
        for (const [kk, vv] of Object.entries(v)) {
          out[k][kk] = vv && typeof vv === 'object' && !Array.isArray(vv) && out[k][kk] && typeof out[k][kk] === 'object' ? {
            ...out[k][kk],
            ...structuredClone(vv)
          } : structuredClone(vv);
        }
      } else out[k] = structuredClone(v);
    }
    return out;
  }
  /** Données en vigueur d'une base : modification locale (overrideKey) si plus récente que le fichier ET faite sur ce
   *  fichier (base === fileStamp) — elle le remplace ; faite sur un autre état du fichier (ou ancienne, sans date de
   *  base) : fusionnée type par type (mergeOverride) puis réécrite avec la date de base, pour que les autres pages voient
   *  la même chose ; sinon le fichier. Sortie : { data, local : date de la modification locale ou '', fileStamp, merged }. */
  function effectiveData(fileData, overrideKey, fileStamp, keyOf = null) {
    const o = read(overrideKey);
    if (!o?.data || !(o.updatedAt > fileStamp)) return {
      data: structuredClone(fileData),
      local: '',
      fileStamp
    };
    if (o.base === fileStamp) return {
      data: structuredClone(o.data),
      local: o.updatedAt,
      fileStamp
    };
    const data = mergeOverride(fileData, o.data, keyOf);
    write(overrideKey, {
      updatedAt: new Date().toISOString(),
      base: fileStamp,
      data
    });
    return {
      data: structuredClone(data),
      local: o.updatedAt,
      fileStamp,
      merged: true
    };
  }

  // ---- types : base commune enrichie (en place : les pages gardent leur lecture de AIRCRAFT_DB)
  // Mode GitHub (appli sans lanceur) : la base des types (AircraftDB/aircraft_db.js) se lit à la racine du dépôt des données ;
  // absente de ce dépôt, les pages tournent sur une base vide (noms et performances des types indisponibles) et le disent une
  // fois par page, à la fin du chargement (le cadre de page, qui affiche les notifications, n'existe pas encore ici).
  if (!window.AIRCRAFT_DB && window.GitHubData?.on?.()) window.addEventListener('load', () => {
    const row = [
      'Base des types d’appareils absente du dépôt des données (AircraftDB/) : noms et performances des types indisponibles.',
      'Aircraft type database missing from the data repository (AircraftDB/): type names and performance unavailable.',
      'Datenbank der Luftfahrzeugtypen fehlt im Daten-Repository (AircraftDB/): Typnamen und Leistungen nicht verfügbar.',
      'Base de tipos de aeronave ausente del repositorio de datos (AircraftDB/): nombres y rendimientos de los tipos no disponibles.'
    ];
    window.AppFramework?.notify?.(window.RepositoryKit?.t ? window.RepositoryKit.t(row) : row[0], 'warn');
  }, {
    once: true
  });
  const file = window.AIRCRAFT_DB || (window.AIRCRAFT_DB = {});
  const TYPES_OVERRIDE = 'dataOverride:aircraftDb:v1';
  // fichier tel que servi, gardé intact : base de la règle (et de la comparaison de Paramètres, typesFile)
  const pristine = structuredClone(file);
  let appliedRaw; // texte de la modification locale appliquée (relue seulement si elle change)
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
  /** Base des types en vigueur, en place dans window.AIRCRAFT_DB : fichier, modification locale de Paramètres (règle
   *  commune effectiveData), types ajoutés localement dans les CR. Relue si la modification locale a changé (autre
   *  onglet, Paramètres). */
  function typesDb() {
    let raw = null;
    try {
      raw = localStorage.getItem(TYPES_OVERRIDE);
    } catch {
      /* stockage indisponible */
    }
    if (raw === appliedRaw) return file;
    appliedRaw = raw;
    const {
      data
    } = effectiveData(pristine, TYPES_OVERRIDE, String(pristine.__meta?.admin_saved || ''));
    for (const k of Object.keys(file))
      if (!(k in data)) delete file[k];
    Object.assign(file, data);
    Object.entries(read('missionAircraftTypes:v1') || {}).forEach(([code, entry]) => addType(code, entry || {}, 'local'));
    try {
      appliedRaw = localStorage.getItem(TYPES_OVERRIDE); // réécrite par effectiveData après une fusion
    } catch {
      /* stockage indisponible */
    }
    return file;
  }
  typesDb();

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
    // base et terrain de rattachement déclarés par la page Flotte du site : ils font foi (la référence et le journal n'en
    // donnent qu'une estimation, le terrain de départ le plus fréquent — HCMK pour un appareil basé à LFTW et déployé)
    const fleetSet = new Map();
    /** Fusionne un appareil (flotte, référence, missions) dans le catalogue : la donnée la plus récente l'emporte, champs vides
     *  complétés ; base et terrain de rattachement de la flotte gardés. */
    const merge = (r, date = '') => {
      const k = mapped(r.registration);
      if (!k) return;
      const cur = out.get(k) || {
        registration: k === key(r.registration) ? r.registration : (/^[A-Z]{5}$/.test(k) ? `${k[0]}-${k.slice(1)}` : k),
        callsigns: [],
        sources: []
      };
      const newer = String(date) >= String(cur.date || '');
      const fixed = fleetSet.get(k) || new Set();
      ['type', 'variant', 'operator', 'base', 'homeAd', 'fleetId', 'category'].forEach(f => {
        if (r[f] && (newer || !cur[f]) && !fixed.has(f)) cur[f] = r[f];
      });
      if (r.source === 'fleet') fleetSet.set(k, new Set(['base', 'homeAd'].filter(f => r[f])));
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
  // ---- classement d'un type : une seule réponse pour toute la suite (affectations, Mes appareils, Carburant et fiches de
  // performances, icônes, CR, estimation de durée, Maintenance) — « quel est le type ou la catégorie de ce type OACI ou
  // de cet appareil ? »
  /** Désignateur d'un code (majuscules sans séparateurs, alias de la base suivis jusqu'au bout : A4M → A400M → A400) ;
   *  le code normalisé s'il n'est pas un alias. Pour un texte libre (« Rafale B — Patrouille »), codeOf. */
  function canonical(code) {
    const al = (window.AIRCRAFT_DB || {}).__aliases || {};
    let k = fold(code);
    for (let i = 0; i < 6 && al[k] && al[k] !== k; i++) k = al[k];
    return k;
  }
  /** Codes équivalents d'un code : lui-même, la chaîne d'alias jusqu'au désignateur, puis les alias qui renvoient à ce
   *  désignateur (A4M ↔ A400M ↔ A400) — pour trouver une donnée rangée sous l'un d'eux (performances, profils). */
  function related(code) {
    const al = (window.AIRCRAFT_DB || {}).__aliases || {},
      out = [];
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
  /** Fiche de la base d'un code (désignateur ou alias, canonical) ; null si inconnu. */
  function record(code) {
    const db = window.AIRCRAFT_DB || {},
      k = canonical(code);
    return k && !k.startsWith('__') && db[k] && typeof db[k] === 'object' ? db[k] : null;
  }
  /** Catégories, dans l'ordre d'affichage : hélicoptères, turbopropulseurs, réacteurs, pistons, autres. */
  const CATEGORIES = ['helico', 'turboprop', 'jet', 'piston', 'other'];
  /** Libellés des catégories (un seul jeu pour la suite, décision du 16/10/2026 : noms courts), 4 langues. */
  const CATEGORY_LABELS = {
    helico: ['Hélicoptères', 'Helicopters', 'Hubschrauber', 'Helicópteros'],
    turboprop: ['Turbopropulseurs', 'Turboprops', 'Turboprops', 'Turbohélices'],
    jet: ['Réacteurs', 'Jets', 'Strahlflugzeuge', 'Reactores'],
    piston: ['Pistons', 'Pistons', 'Kolbenmotoren', 'Pistón'],
    other: ['Autres', 'Others', 'Andere', 'Otros']
  };
  /** Texte dans la langue de la page (RepositoryKit.t), sinon le français. */
  const tr = row => window.RepositoryKit?.t ? window.RepositoryKit.t(row) : row[0];
  /** Libellé d'une catégorie (classify().category) dans la langue de la page ; « Autres » si elle est inconnue. */
  const categoryLabel = cat => tr(CATEGORY_LABELS[cat] || CATEGORY_LABELS.other);
  /** Groupes d'affichage des appareils (AircraftDBIcons.group : par motorisation, puis nombre de moteurs pour les
   *  pistons) et libellés d'appareil, sous leur clé française ; 4 langues. */
  const GROUP_LABELS = {
    'Hélicoptères': CATEGORY_LABELS.helico,
    'Jets': ['Jets', 'Jets', 'Jets', 'Jets'],
    'Turbopropulseurs': CATEGORY_LABELS.turboprop,
    'Pistons, 2 moteurs et plus': ['Pistons, 2 moteurs et plus', 'Pistons, 2 engines or more', 'Kolben, 2 Motoren und mehr',
      'Pistón, 2 motores o más'
    ],
    'Pistons, 1 moteur': ['Pistons, 1 moteur', 'Pistons, 1 engine', 'Kolben, 1 Motor', 'Pistón, 1 motor'],
    'Autres': CATEGORY_LABELS.other,
    'Hélicoptère': ['Hélicoptère', 'Helicopter', 'Hubschrauber', 'Helicóptero'],
    'Quadriréacteur': ['Quadriréacteur', 'Four-engine jet', 'Vierstrahliger Jet', 'Cuatrirreactor'],
    'Triréacteur': ['Triréacteur', 'Three-engine jet', 'Dreistrahliger Jet', 'Trirreactor'],
    'Biréacteur': ['Biréacteur', 'Twin jet', 'Zweistrahliger Jet', 'Birreactor'],
    'Jet': ['Jet', 'Jet', 'Jet', 'Jet'],
    'Quadriturbopropulseur': ['Quadriturbopropulseur', 'Four-engine turboprop', 'Viermotoriges Turboprop', 'Cuatrimotor turbohélice'],
    'Biturbopropulseur': ['Biturbopropulseur', 'Twin turboprop', 'Zweimotoriges Turboprop', 'Bimotor turbohélice'],
    'Turbopropulseur': ['Turbopropulseur', 'Turboprop', 'Turboprop', 'Turbohélice'],
    'Quadrimoteur': ['Quadrimoteur', 'Four-engine piston', 'Viermotoriges Kolbenflugzeug', 'Cuatrimotor de pistón'],
    'Trimoteur': ['Trimoteur', 'Three-engine piston', 'Dreimotoriges Kolbenflugzeug', 'Trimotor de pistón'],
    'Bimoteur': ['Bimoteur', 'Twin piston', 'Zweimotoriges Kolbenflugzeug', 'Bimotor de pistón'],
    'Monomoteur': ['Monomoteur', 'Single-engine', 'Einmotoriges', 'Monomotor'],
    'Autre': ['Autre', 'Other', 'Andere', 'Otro']
  };
  /** Libellé d'un groupe ou d'un appareil (clé française d'AircraftDBIcons.group) dans la langue de la page ; tel quel
   *  s'il est inconnu. */
  const groupLabel = key => GROUP_LABELS[key] ? tr(GROUP_LABELS[key]) : key;
  /** Classement d'un type. input : code (désignateur, alias) ou fiche de la base ; opts.description : description OACI
   *  seule (« L2J ») quand il n'y a pas de fiche. Sortie : { code, rec, icao, fpl, family, kind, engines, power, category,
   *  wing, wtc } —
   *  · family : L avion, S hydravion, A amphibie, H hélicoptère, G autogire, T convertible, B ballon ou dirigeable
   *    (hors OACI : kind « airship » | « balloon »), '' inconnue ; engines : nombre (« C », moteurs couplés : 2) ;
   *  · power : J réacteur, T turbine, P pistons, E électrique, R fusée, '' inconnue ;
   *  · category (règles de l'utilisateur, 15/10/2026) : helico (H, G), puis selon la motorisation jet (J), turboprop (T),
   *    piston (P) — convertible, amphibie et hydravion compris — ; other : ballon, dirigeable, électrique, inconnu ;
   *  · wing : rotary (H, G, T), amphibious (A, S), fixed (L), lta (ballon, dirigeable), '' ;
   *  · icao : faux pour un type sans désignateur OACI ; fpl : désignateur du plan de vol (SHIP, BALL, ZZZZ sinon le code). */
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
        'L' ? 'fixed' : '',
      wtc: String(rec?.wtc || '').toUpperCase()
    };
  }
  window.AircraftCatalog = {
    mergeOverride,
    effectiveData,
    typesDb,
    /** Base des types telle que servie par le fichier (sans modification locale). */
    typesFile: () => pristine,
    USAGE,
    canonical,
    related,
    record,
    classify,
    CATEGORIES,
    CATEGORY_LABELS,
    categoryLabel,
    groupLabel,
    codeOf,
    displayName,
    SUPPLEMENT,
    defaAircraft,
    defaTypes,
    pilots,
    key
  };
})();
