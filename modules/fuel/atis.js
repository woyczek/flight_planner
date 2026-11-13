// Fuel — the runway in use read from the ATIS of the flight's networks (SOG-0090, second lot; the ergonomist's GO of 12 Nov 2026).
// Pure: no reading, no screen. The feeds are the two public feeds the suite already reads (VATSIM vatsim-data.json, IVAO whazzup), read
// by module.js through ctx.net; this file only extracts, for one aerodrome, the letter, the time and the runways the ATIS says.
//   · VATSIM: `atis[]`, callsign ICAO_ATIS, ICAO_A_ATIS (arrivals) or ICAO_D_ATIS (departures); `atis_code`, `text_atis`, `last_updated`.
//   · IVAO: the ATIS is carried by the ATC position, `clients.atcs[].atis` = { lines, revision (the letter), timestamp }; callsign
//     ICAO_TWR / APP / GND / DEL / ATIS (a CTR is a region, never an aerodrome).
//   · Never read: the names and the identifiers of persons (`name`, `cid`, `userId`); the text itself is never shown (the runway, the
//     letter and the time only).
//   · A closed list of phrasings (ARR / LDG / LANDING RWY, DEP / DEPARTURE / TKOF RWY, RWY IN USE, APCH RWY, « RUNWAY nn FOR ARRIVALS »);
//     a runway is kept only if the aerodrome has it; two phrasings of one side that disagree: nothing for that side (§ 10.30: nothing
//     without proof). « RWY 24 RENAMED TO RWY 23 », « VISUAL OPS RWY 28 », a RVR group (R19/1100U), « RMK VOR 23 » give no runway.
//   · An ATIS older than 90 minutes is not said.

/** The age limit of an ATIS (ms). */
export const MAX_AGE_MS = 90 * 60e3;
// a runway number (01 to 36, with L / R / C), followed by nothing that makes it another token (« 19/1100U », « 23X »)
const RW = '(?:0[1-9]|[12]\\d|3[0-6])[LRC]?(?![0-9A-Z/])';
const LIST = `${RW}(?:\\s*(?:/|AND|,|&)\\s*${RW})*`;
// an approach named between « ARR RWY » and the runway (IVAO: « ARR RWY ILS X 21L »)
const APP = '(?:(?:ILS|LOC|RNP|RNAV|VOR|NDB|GLS|VISUAL)(?:\\s+[A-Z])?\\s+)?';
const RWY = '(?:RWY|RWYS|RUNWAY|RUNWAYS)';
/** The phrasings, each with the side it says: 'arr', 'dep' or 'both' (« both » takes the side of an ATIS A / D when it has one). */
const PHRASES = [
  [new RegExp(`\\b(?:ARR|ARRIVAL|ARRIVALS|LDG|LANDING)\\s+${RWY}\\s+(?:IN\\s+USE\\s*:?\\s*)?${APP}(${LIST})`, 'g'), 'arr'],
  [new RegExp(`\\b(?:DEP|DEPARTURE|DEPARTURES|TKOF|TAKEOFF|TAKE-OFF)\\s+${RWY}\\s+(?:IN\\s+USE\\s*:?\\s*)?(${LIST})`, 'g'), 'dep'],
  // « RWY IN USE » alone (not « DEP RWY IN USE », said above for its side only)
  [new RegExp(`(?<![A-Z])(?<!(?:ARR|ARRIVAL|ARRIVALS|LDG|LANDING|DEP|DEPARTURE|DEPARTURES|TKOF|TAKEOFF|TAKE-OFF)\\s)${RWY}\\s+IN\\s+USE\\s*:?\\s*(${LIST})`, 'g'), 'both'],
  [new RegExp(`\\b(?:APCH|APPROACH)\\s+${RWY}\\s+(${LIST})`, 'g'), 'arr'],
  [new RegExp(`\\b${RWY}\\s+(${LIST})\\s+FOR\\s+ARRIVALS?(?:\\s*,?\\s*AND\\s+DEPARTURES?)?`, 'g'), 'arrdep'],
  [new RegExp(`\\b${RWY}\\s+(${LIST})\\s+FOR\\s+DEPARTURES?`, 'g'), 'dep']
];

/** A runway written « 9 », « 09L », « RWY 27R » → « 09 », « 09L », « 27R ». */
export const rwKey = v => {
  const m = /^(?:RWY|RW)?\s*(\d{1,2})([LRC]?)$/i.exec(String(v ?? '').trim());
  return m ? `${m[1].padStart(2, '0')}${m[2].toUpperCase()}` : '';
};

/** The runways a text says, by side: { arr: Set | null, dep: Set | null } ; a side whose phrasings disagree is null (`clash`). `kind`:
 *  'A' (arrival ATIS), 'D' (departure ATIS) or '' (both). Only the runways of `known` (keys) are kept; a phrasing that names a runway the
 *  aerodrome does not have says nothing (a renamed runway, another aerodrome). */
export function runwaysOfText(text, known, kind = '') {
  const up = String(text || '').toUpperCase().replace(/\s+/g, ' '),
    sets = {
      arr: [],
      dep: []
    };
  for (const [re, side] of PHRASES) {
    re.lastIndex = 0;
    for (const m of up.matchAll(re)) {
      const list = m[1].split(/\s*(?:\/|AND|,|&)\s*/).map(rwKey).filter(Boolean);
      if (!list.length || list.some(r => !known.has(r))) continue;
      const set = [...new Set(list)].sort().join(' ');
      const to = side === 'both' ? (kind === 'A' ? ['arr'] : kind === 'D' ? ['dep'] : ['arr', 'dep']) : side === 'arrdep' ? (/DEPARTURE/
        .test(
          m[0]) ? ['arr', 'dep'] : ['arr']) : [side];
      for (const s of to) sets[s].push(set);
    }
  }
  const one = list => !list.length ? null : new Set(list).size === 1 ? new Set(list[0].split(' ')) : 'clash';
  return {
    arr: one(sets.arr),
    dep: one(sets.dep)
  };
}

/** HHMM UTC of an instant (« 1655Z »), '' if unreadable. */
const hhmm = t => {
  const d = new Date(t);
  return Number.isFinite(d.getTime()) ? `${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}Z` : '';
};
/** A letter of ATIS (A to Z), '' otherwise. */
const letterOf = v => {
  const s = String(v ?? '').trim().toUpperCase();
  return /^[A-Z]$/.test(s) ? s : '';
};

/** The ATIS of one aerodrome on one network, from its feed: [{ text, letter, at (ms), kind ('A' | 'D' | '') }]. Nothing else of the
 *  feed is read (never a name, never an identifier of a person). */
function entriesOf(net, feed, icao) {
  const out = [];
  if (net === 'vatsim') {
    const re = new RegExp(`^${icao}(?:_([AD]))?_ATIS$`);
    for (const a of Array.isArray(feed?.atis) ? feed.atis : []) {
      const m = re.exec(String(a?.callsign || '').toUpperCase());
      if (!m || !Array.isArray(a.text_atis)) continue;
      out.push({
        text: a.text_atis.filter(x => typeof x === 'string').join(' ').slice(0, 4000),
        letter: letterOf(a.atis_code),
        at: Date.parse(a.last_updated || ''),
        kind: m[1] || ''
      });
    }
  } else if (net === 'ivao') {
    const re = new RegExp(`^${icao}(?:_[A-Z0-9]{1,3})?_(?:TWR|APP|GND|DEL|ATIS)$`);
    for (const a of Array.isArray(feed?.clients?.atcs) ? feed.clients.atcs : []) {
      const lines = a?.atis?.lines;
      if (!re.test(String(a?.callsign || '').toUpperCase()) || !Array.isArray(lines)) continue;
      out.push({
        text: lines.filter(x => typeof x === 'string').join(' ').slice(0, 4000),
        letter: letterOf(a.atis.revision),
        at: Date.parse(a.atis.timestamp || ''),
        kind: ''
      });
    }
  }
  return out;
}

/** SOG-0325: the QNH an ATIS text says (hPa, an integer from 900 to 1100) — a closed list of phrasings: « QNH 1016 », « Q1016 »,
 *  « ALTIMETER 2992 » / « A2992 » (inches, converted); two values that differ: null (nothing without proof). */
export function qnhOfText(text) {
  const t = String(text || '').toUpperCase(),
    got = new Set(),
    inch = (a, b) => Math.round((+a + +b / 100) * 33.8639);
  for (const m of t.matchAll(/\bQNH\s*:?\s*(\d{3,4})\b/g)) got.add(+m[1]);
  for (const m of t.matchAll(/(?<![A-Z0-9/])Q(\d{4})(?![0-9A-Z])/g)) got.add(+m[1]);
  for (const m of t.matchAll(/\bALTIMETER\s*:?\s*([23]\d)\.?(\d{2})\b/g)) got.add(inch(m[1], m[2]));
  for (const m of t.matchAll(/(?<![A-Z0-9/])A([23]\d)(\d{2})(?![0-9A-Z])/g)) got.add(inch(m[1], m[2]));
  const v = [...got];
  return v.length === 1 && v[0] >= 900 && v[0] <= 1100 ? v[0] : null;
}

/** SOG-0325: the wind an ATIS text says — « WIND 130/12KT », « WIND 130 DEGREES 12 KNOTS », a METAR group « 13012KT » (gusts left out);
 *  { dir (1 to 360), kt } or { dir: null, kt: 0 } (calm); two winds that differ, a variable one, or nothing: null. */
export function windOfText(text) {
  const t = String(text || '').toUpperCase(),
    got = [];
  for (const m of t.matchAll(/\bWIND\s*:?\s*(\d{3})\s*(?:DEGREES?|DEG|°)?\s*(?:\/|AT|,)?\s*(\d{1,3})\s*(?:KT|KTS|KNOTS)\b/g)) got.push([+m[
    1], +m[2]]);
  for (const m of t.matchAll(/(?<![A-Z0-9/])(\d{3})(\d{2,3})(?:G\d{2,3})?KT\b/g)) got.push([+m[1], +m[2]]);
  const ok = got.filter(([d, k]) => d <= 360 && k <= 150);
  if (!ok.length || ok.length !== got.length || new Set(ok.map(x => x.join('/'))).size > 1) return null;
  const [d, k] = ok[0];
  return k === 0 ? {
    dir: null,
    kt: 0
  } : {
    dir: d % 360 || 360,
    kt: k
  };
}

/** SOG-0325: beyond the runway, what the ATIS of a network says for one aerodrome and one side: { net, letter, at ('1655Z'), qnh, wind },
 *  from its most recent fresh ATIS of that side (an ATIS D is not read for the arrival, nor an ATIS A for the departure); null without
 *  a fresh ATIS. The text itself is never returned. */
export function atisInfo(net, feed, icao, side, now = Date.now()) {
  const ad = String(icao || '').toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(ad) || !['arr', 'dep'].includes(side)) return null;
  const fresh = entriesOf(net, feed, ad).filter(e => Number.isFinite(e.at) && now - e.at <= MAX_AGE_MS && e.at - now <= 10 * 60e3 && (!e
    .kind || (e.kind === 'A') === (side === 'arr')));
  if (!fresh.length) return null;
  const last = fresh.sort((a, b) => b.at - a.at)[0];
  return {
    net,
    letter: last.letter,
    at: hhmm(last.at),
    qnh: qnhOfText(last.text),
    wind: windOfText(last.text)
  };
}

/** What the ATIS of a network says for one aerodrome and one side: { net, letter, at ('1655Z'), rwys: ['25'] } or null (no ATIS, too
 *  old, no phrasing of the list, a clash between its phrasings or between its ATIS). `known`: the runways of the aerodrome (any form). */
export function atisSide(net, feed, icao, side, known, now = Date.now()) {
  const ad = String(icao || '').toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(ad) || !['arr', 'dep'].includes(side)) return null;
  const keys = new Set([...(known || [])].map(rwKey).filter(Boolean)),
    said = [];
  for (const e of entriesOf(net, feed, ad)) {
    if (!Number.isFinite(e.at) || now - e.at > MAX_AGE_MS || e.at - now > 10 * 60e3) continue;
    if (e.kind && (e.kind === 'A') !== (side === 'arr')) continue;
    const r = runwaysOfText(e.text, keys, e.kind)[side];
    if (r === 'clash') return null;
    if (r) said.push({
      ...e,
      rwys: [...r].sort()
    });
  }
  if (!said.length || new Set(said.map(x => x.rwys.join(' '))).size > 1) return null;
  const last = said.sort((a, b) => b.at - a.at)[0];
  return {
    net,
    letter: last.letter,
    at: hhmm(last.at),
    rwys: last.rwys
  };
}
