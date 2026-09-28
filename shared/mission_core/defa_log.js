(() => {
    'use strict';
    // Base « DEFA » : journal des vols réalisés (page « Log des vols » de la DEFA enregistrée,
    // ou export CSV / JSON), distincte du registre des missions CR DEFA. Chargée à la demande
    // (Paramétrage › Base DEFA) et gardée dans ce navigateur (defaFlightLog:v1) — jamais dans le
    // dépôt (trigrammes des pilotes), ni dans la sauvegarde locale (rechargeable depuis le fichier).
    // Exploitée par les CR : appareils connus (immatriculation → type, indicatifs utilisés),
    // trigrammes proposés pour l'équipage, terrains ; et par l'analyse des séries d'indicatifs.
    const KEY = 'defaFlightLog:v1';
    const COLUMNS = ['date', 'duration', 'trigram', 'callsign', 'registration', 'aircraft', 'dep', 'arr', 'mission'];
    const HEADERS = {
      date: /^date/i,
      duration: /^dur/i,
      trigram: /^tri/i,
      callsign: /^call|^indic/i,
      registration: /^imm|^reg/i,
      aircraft: /^app|^air|^type/i,
      dep: /^d[ée]p/i,
      arr: /^arr/i,
      mission: /^miss/i
    };
    /** Texte en majuscules sans accents ni blancs de bord. */
    const up = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
    /** Journal DEFA mémorisé (defaFlightLog:v1) ; null sinon. */
    const read = () => {
      try {
        return JSON.parse(localStorage.getItem(KEY) || 'null');
      } catch {
        return null;
      }
    };

    // ---- lecture
    const minutesOf = text => {
      const m = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(String(text || '').trim());
      return m ? Number(m[1]) * 60 + Number(m[2]) + Math.round(Number(m[3] || 0) / 60) : null;
    };
    // « A332 MRTT », « RFAL B », « H145 D3 » : type OACI + variante.
    const splitAircraft = text => {
      const [type, ...rest] = up(text).split(/\s+/);
      return {
        type: type || '',
        variant: rest.join(' ')
      };
    };

    /** Vol du journal à partir des 9 cellules d'une ligne (date, durée, trigramme, indicatif, immatriculation, appareil, départ, arrivée, mission) : champs normalisés, type et variante séparés. */
    function record(cells, fleetId = '') {
      const c = Object.fromEntries(COLUMNS.map((k, i) => [k, String(cells[i] ?? '').replace(/\s+/g, ' ').trim()]));
      const [date, time = ''] = c.date.split(/[ T]/), {
        type,
        variant
      } = splitAircraft(c.aircraft);
      return {
        date,
        time: time.slice(0, 5),
        durationMin: minutesOf(c.duration),
        trigram: up(c.trigram),
        callsign: up(c.callsign).replace(/\s+/g, ' '), // « LCAR C » : patrouille LCAR, élément C
        registration: window.MissionModel?.formatRegistration ? window.MissionModel.formatRegistration(up(c.registration)) : up(c.registration),
        type,
        variant,
        dep: up(c.dep),
        arr: up(c.arr),
        mission: up(c.mission),
        fleetId
      };
    }
    // Page HTML enregistrée (tableau à 9 colonnes), CSV (séparateur ; ou ,) ou JSON (export de cette base).
    function parse(text, name = '') {
      const source = String(text || '');
      if (/^\s*[[{]/.test(source)) {
        const data = JSON.parse(source),
          list = Array.isArray(data) ? data : data.records || [];
        return list.filter(r => r && r.date);
      }
      // Page copiée (Ctrl+A, Ctrl+C sur « Log des vols ») : cellules séparées par des tabulations.
      const tabbed = source.split(/\r?\n/).map(l => l.split('\t').map(c => c.trim())).filter(c => c.length >= 9 && /^\d{4}-\d{2}-\d{2}/.test(c[0]));
      if (tabbed.length && !/<table|<tr/i.test(source)) return tabbed.map(c => record(c)).filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.date));
      if (/<table|<tr/i.test(source)) {
        const doc = new DOMParser().parseFromString(source, 'text/html');
        const rows = [...doc.querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('td')]);
        return rows.filter(tds => tds.length >= 9).map(tds => {
          const link = tds[4].querySelector('a')?.getAttribute('href') || '',
            id = /[?&]id=(\d+)/.exec(link)?.[1] || '';
          return record(tds.map(td => td.textContent), id);
        }).filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.date));
      }
      const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
      const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
      /** Cellules d'une ligne CSV (séparateur détecté, guillemets retirés). */
      const cells = line => line.split(sep).map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
      const head = cells(lines.shift()),
        order = COLUMNS.map(k => head.findIndex(h => HEADERS[k].test(h.trim())));
      if (order.some(i => i < 0)) throw new Error(`${name || 'fichier'} : colonnes attendues ${COLUMNS.join(', ')}`);
      return lines.map(l => {
        const c = cells(l);
        return record(order.map(i => c[i]));
      }).filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.date));
    }

    // ---- stockage (navigateur uniquement)
    /** Journal DEFA du navigateur ({ records, source, importedAt }) ; vide si absent. */
    function load() {
      return read() || {
        importedAt: '',
        source: '',
        records: []
      };
    }
    // Mise à jour : fusion avec le journal déjà chargé (sans doublon) — l'historique s'accumule
    // d'une copie à l'autre ; ou remplacement.
    // Clé = ligne complète : seuls les vrais doublons (lignes identiques) sont fusionnés ; un aller /
    // retour à la même minute (départ / arrivée différents) reste deux vols.
    const recordKey = r => [r.date, r.time, r.durationMin, r.callsign, r.registration, r.trigram, r.type, r.variant, r.dep, r.arr, r.mission].map(up).join('|');

    /** Mémorise le journal (merge : fusion sans doublon — seules les lignes identiques sont fusionnées ; sinon remplacement), trié du plus récent, et prévient les pages (defa-log-change). Retourne { importedAt, source, records, added }. */
    function save(records, source, {
      merge = false
    } = {}) {
      let added = records.length;
      if (merge) {
        const byKey = new Map((read()?.records || []).map(r => [recordKey(r), r]));
        const before = byKey.size;
        records.forEach(r => byKey.set(recordKey(r), r));
        added = byKey.size - before;
        records = [...byKey.values()];
      }
      const sorted = records.slice().sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
      const data = {
        importedAt: new Date().toISOString(),
        source,
        records: sorted,
        added
      };
      localStorage.setItem(KEY, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('defa-log-change', {
        detail: data
      }));
      return data;
    }

    /** Efface le journal DEFA du navigateur. */
    function clear() {
      localStorage.removeItem(KEY);
      window.dispatchEvent(new CustomEvent('defa-log-change', {
        detail: null
      }));
    }
    /** Vols du journal DEFA. */
    const records = () => load().records || [];

    // ---- indicatifs : séries
    // Suffixes de patrouille / d'élément : alphabet OTAN, couleurs, lettre seule (QINA WHITE,
    // LCAR A, CONDOR B, GUEPARD YANKEE) ; tirets et barres parasites (DRAGO74-1, RUES/).
    const SUFFIX = /(ALPHA|BRAVO|CHARLIE|DELTA|ECHO|FOXTROT|GOLF|HOTEL|INDIA|JULIETT?|KILO|LIMA|MIKE|NOVEMBER|OSCAR|PAPA|QUEBEC|ROMEO|SIERRA|TANGO|UNIFORM|VICTOR|WHISKEY|XRAY|YANKEE|ZULU|WHITE|BLANC|RED|ROUGE|BLUE|BLEU|ORANGE|YELLOW|JAUNE|GREEN|VERT|BLACK|NOIR|PIRATE)$/;
    // Registration utilisée comme indicatif, champ vide ou parasite : pas une série.
    const NOISE = /^(\/+|F[A-Z]{4}|FNY\d\d[A-Z]\d|FMY?XX|FA)$/;

    /** Série et numéro d'un indicatif du journal (séparateurs et formes plan de vol tolérés). */
    function splitCallsign(raw) {
      let c = up(raw).replace(/[^A-Z0-9]/g, (ch) => ch === '-' || ch === '/' || ch === ' ' ? ' ' : '').trim().split(' ')[0];
      if (!c || NOISE.test(c)) return null;
      let m = /^([A-Z]+?)(\d+[A-Z]?)$/.exec(c);
      if (m) return {
        prefix: m[1],
        number: m[2],
        suffix: ''
      };
      const suffix = SUFFIX.exec(c)?.[1] || '';
      if (suffix && c.length > suffix.length + 2) return {
        prefix: c.slice(0, -suffix.length),
        number: '',
        suffix
      };
      return {
        prefix: c,
        number: '',
        suffix: ''
      };
    }
    // Variantes d'une même série observées dans le journal (fautes, forme longue / courte).
    const ALIASES = {
      QUINA: 'QINA',
      RAYAK: 'RYAK',
      RHINO: 'RINO',
      RLLE: 'RILLE',
      CICK: 'CRICK',
      CDOR: 'CONDOR',
      XENON: 'XNON',
      XENONG: 'XNON',
      XNONG: 'XNON',
      XNONE: 'XNON',
      XNONA: 'XNON',
      XNOND: 'XNON',
      MOLENC: 'MOLEN',
      MOLENJ: 'MOLEN',
      BGOUT: 'BGOU',
      BGOUW: 'BGOU',
      BGOUX: 'BGOU',
      BGOUA: 'BGOU',
      PELIC: 'PELICAN',
      PELICT: 'PELICAN',
      BENGA: 'BENGALE',
      BENGAL: 'BENGALE',
      BGAL: 'BENGALE',
      DRAGO: 'DRAGON',
      DRAGOC: 'DRAGON',
      DRAGONC: 'DRAGON',
      CHOUC: 'CHOUCAS',
      CTM: 'COTAM',
      LCARA: 'LCAR',
      LCARB: 'LCAR',
      LCARC: 'LCAR',
      LCARD: 'LCAR',
      QINAA: 'QINA',
      QINAB: 'QINA',
      QINAO: 'QINA',
      KONOA: 'KONO',
      GUEPV: 'GUEPARD',
      GUEPW: 'GUEPARD',
      GUEP: 'GUEPARD',
      CONDORA: 'CONDOR',
      CONDORB: 'CONDOR',
      CONDORC: 'CONDOR',
      SAMUIDF: 'SAMU',
      RESCUEA: 'RESCUE',
      RESCUEB: 'RESCUE'
    };
    /** Indicatif complet d'une série d'après la table de correspondance. */
    const canonical = prefix => {
      const table = window.MissionAircraft?.canonicalPrefix;
      const own = ALIASES[prefix] || prefix;
      return table ? table(own) : own;
    };
    // Séries : forme retenue, formes vues, numéros, types, pilotes, période, nombre de vols.
    function series(list = records()) {
      const out = new Map();
      list.forEach(r => {
        const parts = splitCallsign(r.callsign);
        if (!parts) return;
        const prefix = canonical(parts.prefix);
        const s = out.get(prefix) || {
          prefix,
          forms: new Map(),
          numbers: new Set(),
          suffixes: new Set(),
          types: new Map(),
          registrations: new Set(),
          missions: new Map(),
          count: 0,
          first: r.date,
          last: r.date
        };
        s.count++;
        s.forms.set(parts.prefix, (s.forms.get(parts.prefix) || 0) + 1);
        if (parts.number) s.numbers.add(parts.number);
        if (parts.suffix) s.suffixes.add(parts.suffix);
        const t = [r.type, r.variant].filter(Boolean).join(' ');
        if (t) s.types.set(t, (s.types.get(t) || 0) + 1);
        if (r.registration) s.registrations.add(r.registration);
        if (r.mission) s.missions.set(r.mission, (s.missions.get(r.mission) || 0) + 1);
        if (r.date < s.first) s.first = r.date;
        if (r.date > s.last) s.last = r.date;
        out.set(prefix, s);
      });
      return [...out.values()].sort((a, b) => b.count - a.count);
    }

    // ---- exploitation par les CR
    // Appareils : immatriculation, type, variante, indicatifs utilisés (pas d'indicatif « par
    // défaut » : un numéro de COTAM est propre au vol, pas à l'appareil).
    const aircraft = () => records().filter(r => r.registration).map(r => ({
      registration: r.registration,
      type: r.type,
      variant: r.variant,
      callsigns: r.callsign ? [r.callsign] : [],
      date: r.date,
      source: 'defa-log'
    }));

    // Export (CSV tableur, JSON rechargeable).
    const toCsv = (list = records()) => ['date;heure;duree_min;trigramme;indicatif;immatriculation;type;variante;depart;arrivee;mission']
      .concat(list.map(r => [r.date, r.time, r.durationMin ?? '', r.trigram, r.callsign, r.registration, r.type, r.variant, r.dep, r.arr, r.mission].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))).join('\n') + '\n';

  // Référence anonymisée (committée) : pilotes et appareils agrégés, sans les vols. Complète
  // la référence existante sans rien supprimer ; le terrain de rattachement saisi est conservé.
  function reference(list = records(), base = { pilots: [], aircraft: [] }) {
    /** Clé : majuscules, lettres et chiffres seulement. */
    const k = v => up(v).replace(/[^A-Z0-9]/g, '');
    const pilots = new Map((base.pilots || []).map(p => [p.trigram, { ...p }])), aircraft = new Map((base.aircraft || []).map(a => [k(a.registration), { ...a }]));
    /** Valeurs d'une liste, de la plus fréquente à la moins fréquente. */
    const count = (arr) => { const m = new Map(); arr.forEach(v => { if (v) m.set(v, (m.get(v) || 0) + 1); }); return [...m].sort((a, b) => b[1] - a[1]).map(([v]) => v); };
    const byPilot = new Map(), byReg = new Map();
    list.forEach(r => { if (r.trigram) (byPilot.get(r.trigram) || byPilot.set(r.trigram, []).get(r.trigram)).push(r); if (r.registration) (byReg.get(k(r.registration)) || byReg.set(k(r.registration), []).get(k(r.registration))).push(r); });
    byPilot.forEach((fl, tri) => { const dates = fl.map(r => r.date).sort(); pilots.set(tri, { ...(pilots.get(tri) || { trigram: tri }), first: dates[0], last: dates[dates.length - 1], flights: fl.length, types: count(fl.map(r => r.type)).slice(0, 6) }); });
    byReg.forEach((fl, key) => {
      fl.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
      const last = fl[fl.length - 1], cur = aircraft.get(key) || { registration: last.registration };
      const typePair = count(fl.map(r => `${r.type}|${r.variant}`))[0] || '|', [type, variant] = typePair.split('|');
      aircraft.set(key, { ...cur, type: cur.type || type, variant: cur.variant || variant, fleetId: cur.fleetId || (fl.find(r => r.fleetId) || {}).fleetId || '',
        callsigns: count(fl.map(r => up(r.callsign).replace(/\s+/g, '')).filter(c => c && !/^\/+$/.test(c))).slice(0, 12),
        first: fl[0].date, last: last.date, flights: fl.length, lastAd: last.arr || last.dep, homeAd: cur.homeAd || count(fl.map(r => r.dep))[0] || '' });
    });
    return { pilots: [...pilots.values()].sort((a, b) => a.trigram.localeCompare(b.trigram)), aircraft: [...aircraft.values()].sort((a, b) => a.registration.localeCompare(b.registration)) };
  }

  // ---- journal « alternatif » des reportings : vols réalisés → missions (lecture seule)
  // Famille déduite du libellé de mission, sinon de l'indicatif et du type ; à défaut SPECIAL.
  const FAMILY_RULES = [
    ['FIRE', /FEU|INCENDI|GAAR|FIRE|ECOPAGE|WATER ?BOMB|LARGAGE D.?EAU|FFS/],
    ['SAR', /\bSAR\b|RECHERCHE|SAUVETAGE|RESCUE|TREUIL|HOIST/],
    ['HEMS', /MEDEVAC|EVASAN|SMUR|HEMS|SANITAIRE|SAMU|SECOURS/],
    ['AIRBORNE', /PARA|\bDROP\b|AEROLARG|LARGAGE|\bOAP\b/],
    ['MARITIME', /SURMAR|MARITIM|PATMAR|POLMAR|\bASM\b|ANTI ?SOUS/],
    ['COMMAND', /MASA|POLICE DU CIEL|AWACS|\bQRA\b|ALERTE|SURETE AERIENNE|GUET|RELAIS/],
    ['ISR', /\bRECO|RENSEIGNEMENT|\bISR\b|ROEM|ROIM/],
    ['LE', /DOUANE|GENDARMERIE|POLICE|SURVEILLANCE/],
    ['FI', /CALIBRATION|CONTROLE EN VOL|FLIGHT INSPECTION/],
    ['SURVEY', /PHOTO|\bLEVE|SCIENTIFIQUE|CARTO/],
    ['SOF', /FORCES SPECIALES|\bCOS\b|\bSOF\b/],
    ['HADR', /EVACUATION|HUMANITAIRE|HADR|RESSORTISSANT/],
    ['AAR', /RAVITAILL|\bAAR\b|REFUEL|TANKER|\bMRTT\b/],
    ['AIRLIFT', /TRANSPORT|LOGISTI|POSITION|CONVOY|FRET|\bPAX\b|RETOUR BASE|\bRTB\b|LIAISON/]
  ];
  /** Famille de mission d'un vol du journal : règles FAMILY_RULES sur le texte de la mission, puis indicatif et type d'appareil (PELIC → FIRE, DRAGO → HEMS, K35R → AAR…). */
  function familyOf(r) {
    const text = up(r.mission);
    const rule = FAMILY_RULES.find(([, re]) => re.test(text)); if (rule) return rule[0];
    const cs = up(r.callsign), type = up(r.type);
    if (/^(PELIC|PCAN|MILAN)/.test(cs) || /^(CL2T|DH8D)$/.test(type)) return 'FIRE';
    if (/^(DRAGO|SAMU|CHOUC)/.test(cs)) return 'HEMS';
    if (/^(K35R|K35E|C135|KC10|K46|KC46)$/.test(type)) return 'AAR';
    if (/^(A400|C130|C30J|A332|A330|CN35|C160|A310)$/.test(type) || /^(CTM|VANT|CVEX|RILLE)/.test(cs)) return 'AIRLIFT';
    if (/^(E3CF|E3TF)$/.test(type)) return 'COMMAND';
    return 'SPECIAL';
  }
  const addMinutes = (time, minutes) => { const m = /^(\d{1,2}):(\d{2})$/.exec(time || ''); if (!m || minutes == null) return ''; const t = (Number(m[1]) * 60 + Number(m[2]) + minutes) % 1440; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  /** Vols du journal convertis en missions du Core (reportings sur « journal DEFA ») : famille, heures, appareil, équipage, fusions / renommages appliqués. */
  function toMissions(list = records()) {
    const M = window.MissionModel, G = window.MissionGridEdit;
    // Fusions / renommages mémorisés (fiches appareil / équipage) : appliqués au journal rechargé.
    const regOf = v => (G && v ? M.formatRegistration(G.mapAircraft(v)) : v), crewOf = v => (G && v ? G.mapCrew(v) : v);
    return list.map(r0 => ({ ...r0, registration: regOf(r0.registration), trigram: crewOf(r0.trigram) })).map((r, i) => {
      const family = familyOf(r);
      const raw = { schemaVersion: M?.SCHEMA_VERSION || 2, family, series: '', subtype: '', source: 'defa-log',
        metadata: { missionId: `${r.callsign || 'DEFA'}-${r.date.replace(/-/g, '')}${r.time ? r.time.replace(':', '') : ''}`, date: r.date, timeLocal: r.time, context: 'EXERCISE' },
        aircraft: [{ type: r.type, variant: r.variant, registration: r.registration, callsign: r.callsign }],
        crew: r.trigram ? [{ role: 'PIC', name: r.trigram, aircraft: 1, notes: '' }] : [],
        tasking: { objective: r.mission }, navigation: { dep: r.dep, arr: r.arr },
        timeline: { takeoff: r.time, landing: addMinutes(r.time, r.durationMin) },
        results: { outcome: 'SUCCESS' } }; // vol réalisé (journal des vols)
      const mission = M?.migrate ? M.migrate(raw, family) : raw;
      mission.source = 'defa-log';
      Object.defineProperty(mission, '__readOnly', { value: true, enumerable: false });
      return mission;
    });
  }
  // Source des reportings : registre des missions (défaut) ou journal DEFA.
  const SOURCE = 'missionReportingSource:v1';
  /** Source des reportings : « defa » (journal chargé et choisi) ou « ledger » (registre des missions). */
  const source = () => (localStorage.getItem(SOURCE) === 'defa' && records().length ? 'defa' : 'ledger');
  /** Choisit la source des reportings et prévient les pages (mission-source-change). */
  const setSource = value => { localStorage.setItem(SOURCE, value === 'defa' ? 'defa' : 'ledger'); window.dispatchEvent(new CustomEvent('mission-source-change', { detail: source() })); };

  // ---- chargement / mise à jour (reportings, Paramétrage) : page DEFA copiée ou enregistrée
  const LOADER = {
    title: ['Journal DEFA — charger / mettre à jour', 'DEFA log — load / update', 'DEFA-Journal — laden / aktualisieren', 'Diario DEFA — cargar / actualizar'],
    step1: ['1. Ouvrir « Log des vols » sur le site de la DEFA (connexion DEFA) :', '1. Open “Log des vols” on the DEFA website (DEFA login):', '1. „Log des vols“ auf der DEFA-Website öffnen:', '1. Abrir «Log des vols» en el sitio DEFA:'],
    step2: ['2. Sur cette page : Ctrl+A puis Ctrl+C, et coller ici (Ctrl+V) — ou choisir la page enregistrée (Ctrl+S).', '2. On that page: Ctrl+A then Ctrl+C, and paste here (Ctrl+V) — or choose the saved page (Ctrl+S).', '2. Dort: Strg+A, Strg+C, hier einfügen — oder die gespeicherte Seite wählen.', '2. En esa página: Ctrl+A y Ctrl+C, y pegar aquí — o elegir la página guardada.'],
    merge: ['Mettre à jour (ajoute les nouveaux vols, garde l’historique)', 'Update (adds new flights, keeps history)', 'Aktualisieren (neue Flüge hinzufügen, Historie behalten)', 'Actualizar (añade vuelos nuevos, conserva el historial)'],
    replace: ['Remplacer le journal', 'Replace the log', 'Journal ersetzen', 'Reemplazar el diario'],
    file: ['Page enregistrée…', 'Saved page…', 'Gespeicherte Seite…', 'Página guardada…'], load: ['Charger', 'Load', 'Laden', 'Cargar'], close: ['Fermer', 'Close', 'Schließen', 'Cerrar'],
    done: ['{n} vols lus, {a} nouveaux — journal : {t} vols ({d1} → {d2})', '{n} flights read, {a} new — log: {t} flights ({d1} → {d2})', '{n} Flüge gelesen, {a} neu — Journal: {t} Flüge ({d1} → {d2})', '{n} vuelos leídos, {a} nuevos — diario: {t} vuelos ({d1} → {d2})'],
    none: ['Aucun vol reconnu dans ce texte.', 'No flight recognised in this text.', 'Kein Flug erkannt.', 'Ningún vuelo reconocido.']
  };
  // page « Log des vols » du site DEFA (adresse réglable : Paramètres › Maintenance › Sources et dossiers)
  const defaUrl = () => window.RepositoryNav?.source?.('defa') || 'https://flotte.defa-virtual.fr';
  const LOG_URL = defaUrl() + '/log_vols.php';
  /** Fenêtre de chargement du journal DEFA (fichier ou copier-coller de la page « Log des vols »), onLoaded appelé après chargement. */
  function loaderDialog({ onLoaded } = {}) {
    const lang = Math.max(0, ['fr', 'en', 'de', 'es'].indexOf(window.RepositoryNav?.getLanguage?.() || 'fr')), T = k => LOADER[k][lang] || LOADER[k][0];
    const dialog = document.createElement('dialog'); dialog.className = 'defa-loader';
    dialog.innerHTML = `<form method="dialog"><h3></h3><p class="small"></p><p><a target="_blank" rel="noopener"></a></p><p class="small"></p>
      <textarea rows="7" spellcheck="false" placeholder="Ctrl+V"></textarea>
      <div class="dl-row"><label><input type="radio" name="mode" value="merge" checked> <span data-t="merge"></span></label><label><input type="radio" name="mode" value="replace"> <span data-t="replace"></span></label></div>
      <div class="dl-row"><button type="button" data-a="load" class="primary"></button><label class="dl-file"><span data-t="file"></span><input type="file" accept=".html,.htm,.csv,.json,text/html" hidden></label></div>
      <p class="small dl-result"></p></form>`;
    dialog.querySelector('h3').textContent = T('title');
    const ps = dialog.querySelectorAll('p.small'); ps[0].textContent = T('step1'); ps[1].textContent = T('step2');
    const link = dialog.querySelector('a'); const logUrl = defaUrl() + '/log_vols.php'; link.href = logUrl; link.textContent = `${logUrl} ↗`;
    dialog.querySelectorAll('[data-t]').forEach(el => { el.textContent = T(el.dataset.t); });
    dialog.querySelector('[data-a="load"]').textContent = T('load');
    const area = dialog.querySelector('textarea'), result = dialog.querySelector('.dl-result');
    /** Lit un journal collé ou choisi, le mémorise (fusion) et affiche le résultat. */
    const run = (text, name) => {
      let list = []; try { list = parse(text, name); } catch (e) { result.textContent = e.message; return; }
      if (!list.length) { result.textContent = T('none'); return; }
      const merge = dialog.querySelector('[name="mode"]:checked').value === 'merge';
      const data = save(list, name || `copie ${new Date().toLocaleString()}`, { merge });
      const dates = data.records.map(r => r.date).sort();
      result.textContent = T('done').replace('{n}', list.length).replace('{a}', merge ? data.added : list.length).replace('{t}', data.records.length).replace('{d1}', dates[0]).replace('{d2}', dates[dates.length - 1]);
      area.value = ''; panel?.done(); onLoaded?.(data);
    };
    dialog.querySelector('[data-a="load"]').onclick = () => run(area.value, '');
    area.addEventListener('paste', () => setTimeout(() => run(area.value, '')));
    const file = dialog.querySelector('input[type=file]');
    file.onchange = async () => { const f = file.files[0]; if (f) run(await f.text(), f.name); file.value = ''; };
    if (!document.getElementById('defa-loader-style')) document.head.insertAdjacentHTML('beforeend', '<style id="defa-loader-style">.defa-loader{max-width:640px;width:calc(100vw - 32px);border:1px solid #cbd5e1;border-radius:12px;padding:16px;color:#111827;background:#fff}.defa-loader::backdrop{background:#0006}.defa-loader h3{margin:0 0 8px}.defa-loader textarea{width:100%;box-sizing:border-box;font:12px/1.4 ui-monospace,Consolas,monospace}.defa-loader .dl-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:8px 0}.defa-loader button,.defa-loader .dl-file{padding:6px 12px;border-radius:8px;border:1px solid #cbd5e1;background:#f1f5f9;cursor:pointer;font:inherit}.defa-loader button.primary{background:#2f3b52;color:#fff;border-color:#2f3b52}.defa-loader .dl-result{color:#047857;font-weight:600}</style>');
    dialog.addEventListener('close', () => dialog.remove());
    // « × », « Fermer », « Charger » désactivé si vide puis « Valider » (framework FileAccess).
    const panel = window.FileAccess?.pastePanel({ root: dialog.querySelector('form'), area, run: dialog.querySelector('[data-a="load"]'), close: () => dialog.close(), runLabel: () => T('load') });
    if (!panel) { const close = document.createElement('button'); close.type = 'submit'; close.textContent = T('close'); dialog.querySelector('.dl-row:last-of-type').append(close); }
    document.body.append(dialog); dialog.showModal(); area.focus();
    return dialog;
  }

  window.DefaFlightLog = { loaderDialog, LOG_URL, familyOf, toMissions, source, setSource, reference, KEY, parse, load, save, clear, records, series, splitCallsign, aircraft, toCsv, ALIASES };
})();

