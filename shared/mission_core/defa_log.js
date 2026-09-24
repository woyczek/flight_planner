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
  const HEADERS = { date: /^date/i, duration: /^dur/i, trigram: /^tri/i, callsign: /^call|^indic/i, registration: /^imm|^reg/i, aircraft: /^app|^air|^type/i, dep: /^d[ée]p/i, arr: /^arr/i, mission: /^miss/i };
  const up = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };

  // ---- lecture
  const minutesOf = text => { const m = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(String(text || '').trim()); return m ? Number(m[1]) * 60 + Number(m[2]) + Math.round(Number(m[3] || 0) / 60) : null; };
  // « A332 MRTT », « RFAL B », « H145 D3 » : type OACI + variante.
  const splitAircraft = text => { const [type, ...rest] = up(text).split(/\s+/); return { type: type || '', variant: rest.join(' ') }; };
  function record(cells, fleetId = '') {
    const c = Object.fromEntries(COLUMNS.map((k, i) => [k, String(cells[i] ?? '').replace(/\s+/g, ' ').trim()]));
    const [date, time = ''] = c.date.split(/[ T]/), { type, variant } = splitAircraft(c.aircraft);
    return {
      date, time: time.slice(0, 5), durationMin: minutesOf(c.duration), trigram: up(c.trigram), callsign: up(c.callsign).replace(/\s+/g, ' '), // « LCAR C » : patrouille LCAR, élément C
      registration: window.MissionModel?.formatRegistration ? window.MissionModel.formatRegistration(up(c.registration)) : up(c.registration),
      type, variant, dep: up(c.dep), arr: up(c.arr), mission: up(c.mission), fleetId
    };
  }
  // Page HTML enregistrée (tableau à 9 colonnes), CSV (séparateur ; ou ,) ou JSON (export de cette base).
  function parse(text, name = '') {
    const source = String(text || '');
    if (/^\s*[[{]/.test(source)) {
      const data = JSON.parse(source), list = Array.isArray(data) ? data : data.records || [];
      return list.filter(r => r && r.date);
    }
    if (/<table|<tr/i.test(source)) {
      const doc = new DOMParser().parseFromString(source, 'text/html');
      const rows = [...doc.querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('td')]);
      return rows.filter(tds => tds.length >= 9).map(tds => {
        const link = tds[4].querySelector('a')?.getAttribute('href') || '', id = /[?&]id=(\d+)/.exec(link)?.[1] || '';
        return record(tds.map(td => td.textContent), id);
      }).filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.date));
    }
    const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
    const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
    const cells = line => line.split(sep).map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
    const head = cells(lines.shift()), order = COLUMNS.map(k => head.findIndex(h => HEADERS[k].test(h.trim())));
    if (order.some(i => i < 0)) throw new Error(`${name || 'fichier'} : colonnes attendues ${COLUMNS.join(', ')}`);
    return lines.map(l => { const c = cells(l); return record(order.map(i => c[i])); }).filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.date));
  }

  // ---- stockage (navigateur uniquement)
  function load() { return read() || { importedAt: '', source: '', records: [] }; }
  function save(records, source) {
    const sorted = records.slice().sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
    const data = { importedAt: new Date().toISOString(), source, records: sorted };
    localStorage.setItem(KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('defa-log-change', { detail: data }));
    return data;
  }
  function clear() { localStorage.removeItem(KEY); window.dispatchEvent(new CustomEvent('defa-log-change', { detail: null })); }
  const records = () => load().records || [];

  // ---- indicatifs : séries
  // Suffixes de patrouille / d'élément : alphabet OTAN, couleurs, lettre seule (QINA WHITE,
  // LCAR A, CONDOR B, GUEPARD YANKEE) ; tirets et barres parasites (DRAGO74-1, RUES/).
  const SUFFIX = /(ALPHA|BRAVO|CHARLIE|DELTA|ECHO|FOXTROT|GOLF|HOTEL|INDIA|JULIETT?|KILO|LIMA|MIKE|NOVEMBER|OSCAR|PAPA|QUEBEC|ROMEO|SIERRA|TANGO|UNIFORM|VICTOR|WHISKEY|XRAY|YANKEE|ZULU|WHITE|BLANC|RED|ROUGE|BLUE|BLEU|ORANGE|YELLOW|JAUNE|GREEN|VERT|BLACK|NOIR|PIRATE)$/;
  // Registration utilisée comme indicatif, champ vide ou parasite : pas une série.
  const NOISE = /^(\/+|F[A-Z]{4}|FNY\d\d[A-Z]\d|FMY?XX|FA)$/;
  function splitCallsign(raw) {
    let c = up(raw).replace(/[^A-Z0-9]/g, (ch) => ch === '-' || ch === '/' || ch === ' ' ? ' ' : '').trim().split(' ')[0];
    if (!c || NOISE.test(c)) return null;
    let m = /^([A-Z]+?)(\d+[A-Z]?)$/.exec(c);
    if (m) return { prefix: m[1], number: m[2], suffix: '' };
    const suffix = SUFFIX.exec(c)?.[1] || '';
    if (suffix && c.length > suffix.length + 2) return { prefix: c.slice(0, -suffix.length), number: '', suffix };
    return { prefix: c, number: '', suffix: '' };
  }
  // Variantes d'une même série observées dans le journal (fautes, forme longue / courte).
  const ALIASES = { QUINA: 'QINA', RAYAK: 'RYAK', RHINO: 'RINO', RLLE: 'RILLE', CICK: 'CRICK', CDOR: 'CONDOR', XENON: 'XNON', XENONG: 'XNON', XNONG: 'XNON', XNONE: 'XNON', XNONA: 'XNON', XNOND: 'XNON', MOLENC: 'MOLEN', MOLENJ: 'MOLEN', BGOUT: 'BGOU', BGOUW: 'BGOU', BGOUX: 'BGOU', BGOUA: 'BGOU', PELIC: 'PELICAN', PELICT: 'PELICAN', BENGA: 'BENGALE', BENGAL: 'BENGALE', BGAL: 'BENGALE', DRAGO: 'DRAGON', DRAGOC: 'DRAGON', DRAGONC: 'DRAGON', CHOUC: 'CHOUCAS', CTM: 'COTAM', LCARA: 'LCAR', LCARB: 'LCAR', LCARC: 'LCAR', LCARD: 'LCAR', QINAA: 'QINA', QINAB: 'QINA', QINAO: 'QINA', KONOA: 'KONO', GUEPV: 'GUEPARD', GUEPW: 'GUEPARD', GUEP: 'GUEPARD', CONDORA: 'CONDOR', CONDORB: 'CONDOR', CONDORC: 'CONDOR', SAMUIDF: 'SAMU', RESCUEA: 'RESCUE', RESCUEB: 'RESCUE' };
  const canonical = prefix => {
    const table = window.MissionAircraft?.canonicalPrefix;
    const own = ALIASES[prefix] || prefix;
    return table ? table(own) : own;
  };
  // Séries : forme retenue, formes vues, numéros, types, pilotes, période, nombre de vols.
  function series(list = records()) {
    const out = new Map();
    list.forEach(r => {
      const parts = splitCallsign(r.callsign); if (!parts) return;
      const prefix = canonical(parts.prefix);
      const s = out.get(prefix) || { prefix, forms: new Map(), numbers: new Set(), suffixes: new Set(), types: new Map(), registrations: new Set(), missions: new Map(), count: 0, first: r.date, last: r.date };
      s.count++; s.forms.set(parts.prefix, (s.forms.get(parts.prefix) || 0) + 1);
      if (parts.number) s.numbers.add(parts.number); if (parts.suffix) s.suffixes.add(parts.suffix);
      const t = [r.type, r.variant].filter(Boolean).join(' '); if (t) s.types.set(t, (s.types.get(t) || 0) + 1);
      if (r.registration) s.registrations.add(r.registration);
      if (r.mission) s.missions.set(r.mission, (s.missions.get(r.mission) || 0) + 1);
      if (r.date < s.first) s.first = r.date; if (r.date > s.last) s.last = r.date;
      out.set(prefix, s);
    });
    return [...out.values()].sort((a, b) => b.count - a.count);
  }

  // ---- exploitation par les CR
  // Appareils : immatriculation, type, variante, indicatifs utilisés (pas d'indicatif « par
  // défaut » : un numéro de COTAM est propre au vol, pas à l'appareil).
  const aircraft = () => records().filter(r => r.registration).map(r => ({ registration: r.registration, type: r.type, variant: r.variant, callsigns: r.callsign ? [r.callsign] : [], date: r.date, source: 'defa-log' }));

  // Export (CSV tableur, JSON rechargeable).
  const toCsv = (list = records()) => ['date;heure;duree_min;trigramme;indicatif;immatriculation;type;variante;depart;arrivee;mission']
    .concat(list.map(r => [r.date, r.time, r.durationMin ?? '', r.trigram, r.callsign, r.registration, r.type, r.variant, r.dep, r.arr, r.mission].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'))).join('\n') + '\n';

  // Référence anonymisée (committée) : pilotes et appareils agrégés, sans les vols. Complète
  // la référence existante sans rien supprimer ; le terrain de rattachement saisi est conservé.
  function reference(list = records(), base = { pilots: [], aircraft: [] }) {
    const k = v => up(v).replace(/[^A-Z0-9]/g, '');
    const pilots = new Map((base.pilots || []).map(p => [p.trigram, { ...p }])), aircraft = new Map((base.aircraft || []).map(a => [k(a.registration), { ...a }]));
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
    ['AIRLIFT', /TRANSPORT|LOGISTI|POSITION|CONVOY|FRET|\bPAX\b|RAVITAILL|\bAAR\b|REFUEL|RETOUR BASE|\bRTB\b|LIAISON|TANKER/]
  ];
  function familyOf(r) {
    const text = up(r.mission);
    const rule = FAMILY_RULES.find(([, re]) => re.test(text)); if (rule) return rule[0];
    const cs = up(r.callsign), type = up(r.type);
    if (/^(PELIC|PCAN|MILAN)/.test(cs) || /^(CL2T|DH8D)$/.test(type)) return 'FIRE';
    if (/^(DRAGO|SAMU|CHOUC)/.test(cs)) return 'HEMS';
    if (/^(A400|C130|C30J|A332|A330|CN35|C160|A310)$/.test(type) || /^(CTM|VANT|CVEX|RILLE)/.test(cs)) return 'AIRLIFT';
    if (/^(E3CF|E3TF)$/.test(type)) return 'COMMAND';
    return 'SPECIAL';
  }
  const addMinutes = (time, minutes) => { const m = /^(\d{1,2}):(\d{2})$/.exec(time || ''); if (!m || minutes == null) return ''; const t = (Number(m[1]) * 60 + Number(m[2]) + minutes) % 1440; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  function toMissions(list = records()) {
    const M = window.MissionModel;
    return list.map((r, i) => {
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
  const source = () => (localStorage.getItem(SOURCE) === 'defa' && records().length ? 'defa' : 'ledger');
  const setSource = value => { localStorage.setItem(SOURCE, value === 'defa' ? 'defa' : 'ledger'); window.dispatchEvent(new CustomEvent('mission-source-change', { detail: source() })); };

  window.DefaFlightLog = { familyOf, toMissions, source, setSource, reference, KEY, parse, load, save, clear, records, series, splitCallsign, aircraft, toCsv, ALIASES };
})();
