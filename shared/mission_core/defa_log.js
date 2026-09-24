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

  window.DefaFlightLog = { KEY, parse, load, save, clear, records, series, splitCallsign, aircraft, toCsv, ALIASES };
})();
