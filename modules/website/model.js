// V3 website — modèle pur des pages du site de la compagnie collées (modules/website/SPEC.md) : journal des vols (V2
// shared/mission_core/defa_log.js : record, parse, recordKey) et flotte (V2 shared/data_admin.js : parseFleetPage,
// mergeFleet, mêmes règles que AircraftDB/update_fleet.py), avec l'aperçu de ce qui change avant écriture et le réglage
// de la compagnie normalisé. Ni page, ni stockage, ni réseau (DOMParser seulement pour lire un HTML collé).

// ---------------------------------------------------------------- journal des vols (log_vols.php)
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
const up = v => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
/** Durée « H:MM[:SS] » → minutes ; null si illisible. */
const minutesOf = text => {
  const m = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(String(text || '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) + Math.round(Number(m[3] || 0) / 60) : null;
};
/** « A332 MRTT », « RFAL B » : type OACI + variante. */
const splitAircraft = text => {
  const [type, ...rest] = up(text).split(/\s+/);
  return {
    type: type || '',
    variant: rest.join(' ')
  };
};
// Immatriculation avec le tiret de la marque de nationalité (V2 MissionModel.formatRegistration)
const TWO_LETTER_MARKS = new Set((
  'HB OO OE OK OM PH EC EI ES LX LY LZ SE SP SX TC UR YL YR YU OH OY LN CS TF HA S5 9A 9H 4X VH ZS ZK VT HS PK RP 9M 9V A6 A7 HZ SU CN EP YI JY OD 5B 5Y ZP LV CC HK YV OB CX HP TG TI XA XB XC EW ER UK UN EX EY EZ 4K 4L EK RA RF PP PR PT PU HI T7 3A HL'
).split(' '));
/** Immatriculation normalisée (majuscules, tiret après la marque de nationalité : F-HABC). */
export function formatRegistration(value) {
  const s = String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
  if (!s || s.includes('-')) return s.replace(/-+/g, '-');
  if (/^N\d/.test(s)) return s;
  if (TWO_LETTER_MARKS.has(s.slice(0, 2)) && s.length > 3) return `${s.slice(0, 2)}-${s.slice(2)}`;
  if (/^[A-Z]{5}$/.test(s)) return `${s[0]}-${s.slice(1)}`;
  return s;
}
/** Ligne du journal à partir de ses 9 cellules (V2 record) ; siteId : identifiant de l'appareil sur le site (lien). */
function record(cells, siteId = '') {
  const c = Object.fromEntries(COLUMNS.map((k, i) => [k, String(cells[i] ?? '').replace(/\s+/g, ' ').trim()])),
    [date, time = ''] = c.date.split(/[ T]/),
    {
      type,
      variant
    } = splitAircraft(c.aircraft);
  return {
    date,
    time: time.slice(0, 5),
    durationMin: minutesOf(c.duration),
    trigram: up(c.trigram),
    callsign: up(c.callsign).replace(/\s+/g, ' '),
    registration: formatRegistration(up(c.registration)),
    type,
    variant,
    dep: up(c.dep),
    arr: up(c.arr),
    mission: up(c.mission),
    siteId
  };
}
/** Lignes d'un journal collé ou enregistré (V2 parse) : HTML (tableau à 9 colonnes), texte copié (tabulations), CSV
 *  (« ; » ou « , », en-têtes reconnus) ou JSON (liste, ou { records | entries }). Lève une erreur sur un CSV sans les
 *  colonnes attendues. */
export function parseLog(text) {
  const source = String(text || '');
  if (/^\s*[[{]/.test(source)) {
    const data = JSON.parse(source),
      list = Array.isArray(data) ? data : data.records || data.entries || [];
    return list.filter(r => r && r.date);
  }
  const tabbed = source.split(/\r?\n/).map(l => l.split('\t').map(c => c.trim())).filter(c => c.length >= 9 && /^\d{4}-\d{2}-\d{2}/.test(c[
    0]));
  if (tabbed.length && !/<table|<tr/i.test(source)) return tabbed.map(c => record(c)).filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.date));
  if (/<table|<tr/i.test(source)) {
    const doc = new DOMParser().parseFromString(source, 'text/html');
    return [...doc.querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('td')]).filter(tds => tds.length >= 9).map(tds => {
      const link = tds[4].querySelector('a')?.getAttribute('href') || '';
      return record(tds.map(td => td.textContent), /[?&]id=(\d+)/.exec(link)?.[1] || '');
    }).filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.date));
  }
  const lines = source.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',',
    cells = line => line.split(sep).map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"')),
    head = cells(lines.shift()),
    order = COLUMNS.map(k => head.findIndex(h => HEADERS[k].test(h.trim())));
  if (order.some(i => i < 0)) throw new Error(`columns: ${COLUMNS.join(', ')}`);
  return lines.map(l => {
    const c = cells(l);
    return record(order.map(i => c[i]));
  }).filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.date));
}
/** Clé d'une ligne du journal (V2 recordKey, sans les champs qui peuvent être corrigés sur le site) : date, heure,
 *  indicatif, immatriculation, trigramme. */
export const logKey = r => [r.date, r.time, up(r.callsign).replace(/[^A-Z0-9]/g, ''), up(r.registration).replace(/[^A-Z0-9]/g, ''), r
  .trigram
].join('|');
/** Mes lignes (trigramme) du journal collé fusionnées avec celles déjà gardées : une ligne collée remplace la même
 *  ligne gardée, les lignes gardées absentes de la page restent (le site ne montre qu'une partie du journal). Sortie :
 *  { entries (plus récentes d'abord), added, changed, same, others (lignes d'autres pilotes ignorées) }. */
export function mergeLog(kept, pasted, trigram) {
  const mine = pasted.filter(r => up(r.trigram) === up(trigram)),
    out = new Map((kept || []).map(r => [logKey(r), r])),
    plain = r => JSON.stringify(r, Object.keys(r).sort());
  let added = 0,
    changed = 0,
    same = 0;
  const news = [];
  for (const r of mine) {
    const k = logKey(r),
      old = out.get(k);
    if (!old) {
      added++;
      news.push(r);
    } else if (plain(old) !== plain(r)) changed++;
    else same++;
    out.set(k, r);
  }
  return {
    entries: [...out.values()].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)),
    added,
    changed,
    same,
    news,
    others: pasted.length - mine.length
  };
}

// ---------------------------------------------------------------- flotte (flotte.php)
const FLEET_OPERATORS = {
  "Armee de l'Air et de l'Espace": "Armée de l'Air et de l'Espace",
  'Sécurite Civile': 'Sécurité civile',
  'Marine Nationale': 'Marine nationale',
  'Gendarmerie Nationale': 'Gendarmerie nationale'
};
const FLEET_VARIANTS = {
  'A332 MRTT': 'A330 MRTT Phénix',
  'A332 PAX': 'A330-200',
  'A332 VIP': 'A330-200 VIP',
  'MIR2 5': 'Mirage 2000-5',
  'MIR2 B': 'Mirage 2000B',
  'MIR2 D': 'Mirage 2000D',
  'RFAL B': 'Rafale B',
  'RFAL C': 'Rafale C',
  'RFAL M': 'Rafale M',
  'H145 D3': 'H145 D3'
};
// en-têtes de colonnes et menu du site : jamais pris pour un nom d'opérateur (copie en texte)
const FLEET_NOISE =
  /^(appareil|immatriculation|code|numéro|callsign|base|emplacement|heures de vol|op[ée]rationn?el|▲\s*▼|accueil|enregistrer mon vol|log des vols|flotte virtuelle|maintenance|statistiques|connexion)$/i;
/** Appareils d'une page Flotte collée (V2 parseFleetPage) : HTML (tableaux, titres d'opérateur) ou texte (colonnes
 *  séparées par des tabulations, titre d'opérateur seul sur sa ligne). */
export function parseFleet(text) {
  const out = [],
    blank = v => v === '-' ? '' : v,
    reg = v => {
      v = v.trim().toUpperCase();
      return /^[FD][A-Z]{4}$/.test(v) ? `${v[0]}-${v.slice(1)}` : v;
    };
  /** Ajoute l'appareil d'une ligne du tableau (9 colonnes au moins), en-têtes et menus écartés. */
  const row = (operator, cells) => {
    if (cells.length < 9) return;
    const [name, registration, code, number, callsign, base, location, , operational] = cells.map(c => String(c).replace(/\s+/g, ' ')
      .trim());
    if (!name || !registration || FLEET_NOISE.test(name)) return;
    out.push({
      operator: FLEET_OPERATORS[operator] || operator,
      type: name.split(' ')[0].toUpperCase(),
      variant: FLEET_VARIANTS[name] || '',
      registration: reg(registration),
      tacticalNumber: blank(code),
      number: blank(number),
      callsigns: blank(callsign).toUpperCase().split('/').filter(c => c && !c.includes(' ')),
      base: blank(base).toUpperCase(),
      operational: /^oui/i.test(operational),
      location: blank(location).toUpperCase()
    });
  };
  let operator = '';
  if (/<t[dr][\s>]/i.test(text)) {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    doc.querySelectorAll('h1, h2, h3, h4, tr').forEach(el => {
      if (el.tagName !== 'TR') {
        const h = el.textContent.replace(/\s+/g, ' ').trim();
        if (h && !FLEET_NOISE.test(h)) operator = h;
      } else row(operator, [...el.querySelectorAll('td')].map(td => td.textContent));
    });
  } else
    for (const line of String(text).split(/\r?\n/)) {
      const cells = line.split('\t');
      if (cells.length >= 9) row(operator, cells);
      else if (cells.length === 1 && line.trim() && !FLEET_NOISE.test(line.trim())) operator = line.trim();
    }
  return out;
}
/** Fusion avec la flotte gardée (V2 mergeFleet) : un appareil de la page remplace celui gardé (même immatriculation) en
 *  gardant ses indicatifs supplémentaires ; même emplacement : sa date est gardée ; les appareils absents de la page
 *  sont conservés ; stamp : date ISO d'un emplacement nouveau. Sortie : { aircraft, added, updated, kept, changed
 *  (appareils dont une valeur change) }. */
export function mergeFleet(kept, page, stamp = new Date().toISOString().replace(/\.\d+Z$/, 'Z')) {
  page = page.map(a => ({
    ...a,
    callsigns: [...(a.callsigns || [])]
  }));
  const known = new Map(page.map(a => [a.registration, a])),
    before = new Map((kept || []).map(a => [a.registration, JSON.stringify(a)]));
  let updated = 0,
    keptN = 0;
  for (const old of kept || []) {
    const r = old.registration;
    if (known.has(r)) {
      const a = known.get(r);
      for (const c of [].concat(old.callsigns || []))
        if (c && !a.callsigns.includes(c)) a.callsigns.push(c);
      if (old.locationAt) page.forEach(x => {
        if (x.registration === r && x.location === old.location) x.locationAt = old.locationAt;
      });
      updated++;
    } else if (r) {
      page.push({
        ...old
      });
      known.set(r, old);
      keptN++;
    }
  }
  page.forEach(a => {
    if (a.location && !a.locationAt) a.locationAt = stamp;
  });
  return {
    aircraft: page,
    added: page.length - updated - keptN,
    updated,
    kept: keptN,
    changed: page.filter(a => before.has(a.registration) && before.get(a.registration) !== JSON.stringify(a)).map(a => a.registration)
  };
}

// ---------------------------------------------------------------- réglage de la compagnie (airline/settings.json)
/** Réglage normalisé : nom, adresse du site (sans « / » final), chemins des pages (« / » initial) ; textes seulement. */
export function airlineSettings(v = {}) {
  const s = x => typeof x === 'string' ? x.trim() : '',
    path = x => {
      x = s(x);
      return !x || /^https?:\/\//.test(x) || x.startsWith('/') ? x : `/${x}`;
    },
    p = v.pages || {};
  return {
    name: s(v.name),
    site: s(v.site).replace(/\/+$/, ''),
    pages: {
      recordFlight: path(p.recordFlight),
      log: path(p.log),
      fleet: path(p.fleet),
      aircraft: path(p.aircraft)
    }
  };
}
/** Adresse complète d'une page du réglage ('' si le site ou la page manque). */
export const pageUrl = (a, key) => {
  const p = a?.pages?.[key] || '';
  return /^https?:\/\//.test(p) ? p : a?.site && p ? `${a.site}${p}` : '';
};
