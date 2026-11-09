// V3 stats — les fenêtres de palier d'un journal Fuel Phase Monitor (SOG-0052, V3_SPECIFICATION § 10.37 A et C « Proposer depuis
// les mesures »), en calcul pur : ni DOM, ni stockage, ni réseau. Porté du FuelDashboard (FuelDashboard/index.html : parseCSV,
// eligible, la grille fixe de régimes et la médiane pondérée par la durée) ; la phase de chaque fenêtre de 15 s est celle que le
// module du simulateur a écrite, jamais redevinée ici.
//
// API :
//   parseWindows(text) → { rows, skipped, header } : les fenêtres d'un CSV (virgule, tabulation ou point-virgule ; guillemets) ;
//     lève une erreur pour un fichier qui n'est pas un journal reconnu (colonnes phase, flight_id, et mean_fuel_flow_kg_h ou
//     fuel_kg). Le texte est une entrée non fiable : 64 Mo et 500 000 lignes au plus, 200 colonnes au plus.
//   eligible(r) → vrai pour une fenêtre de croisière exploitable : schéma 0.4, durée > 0, débit total > 0 couvert à 99,9 %,
//     débit de chaque moteur connu, altitude pression connue, IAS ≥ 40 kt, |vario| ≤ 100 ft/min, aucun drapeau de qualité.
//   levelCurves(rows, { step = 50, altStep = 1000, minSeconds = 60 }) → [{ altFt, rpm, flowKgH, tasKt, seconds, windows,
//     flights }] : les fenêtres de croisière exploitables groupées par altitude pression (arrondie à altStep) et par régime
//     (arrondi à step) ; débit = médiane pondérée par la durée, TAS = moyenne pondérée ; un groupe de moins de minSeconds est
//     laissé de côté (jamais interpolé). Trié par altitude puis régime.
//   consolidateGroups(groups, limit = 10, near = 150) → groupes { rpm, records, peaks } fusionnés (consolidateRegimeGroups du
//     FuelDashboard) : un petit groupe voisin (≤ near rpm, trois fois moins de fenêtres) rejoint le plus fourni, puis au plus `limit`
//     groupes ; l'étiquette reste le régime arrondi le plus vu (jamais une moyenne qui glisse vers les régimes rares).
//   phaseSummary(rows, phase) → { phase, rpm, flowKgH, iasKt, tasKt, rateFpm, throttlePct, seconds, windows, flights } ou null :
//     la montée (CLIMB, vario ≥ 400 ft/min) ou la descente (DESCENT, vario ≤ −400 ft/min) des fenêtres exploitables ; régime et débit
//     en médiane pondérée, vitesses et vario en moyenne pondérée, manette (mean_throttle_pct) quand la colonne existe ; null sous
//     300 s ou 20 fenêtres (le seuil du FuelDashboard : « mesures insuffisantes »).
//   compare(curves, sheet, { toKg }) → [{ ...point, sheetKgH, deltaPct }] : chaque point face à la fiche, la courbe de même
//     altitude seulement (les lignes de rpmFuelCurve de même altFt), interpolée sur le régime quand deux lignes l'encadrent ;
//     sheetKgH null sinon (rien à comparer : la ligne est une proposition neuve). toKg(valeur, fiche) ramène l'unité de la fiche.

const MAX_TEXT = 64 * 1024 * 1024,
  MAX_ROWS = 500000,
  MAX_COLS = 200;
const num = v => v === undefined || v === null || String(v).trim() === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null;
const duration = r => num(r.duration_sec) ?? (num(r.duration_min) ?? 0) * 60;
const flightKey = r => [r.aircraft_icao, r.aircraft_file, r.registration, r.flight_id].join('|');
const isLegacy = r => !r.schema_version || !String(r.schema_version).startsWith('0.4');

/** Les débits par moteur d'une fenêtre (colonne regroupée engine_fuel_flow_kg_h « a;b », sinon engineN_fuel_flow_kg_h). */
function engineValues(r, metric) {
  const packed = r['engine_' + metric],
    count = Math.max(0, Math.min(16, num(r.engine_count) ?? 8));
  if (packed !== undefined && packed !== '') return String(packed).split(';').slice(0, count).map(num);
  return Array.from({
    length: count
  }, (_, i) => num(r[`engine${i + 1}_${metric}`]));
}

/** Les fenêtres d'un journal CSV (voir l'en-tête). */
export function parseWindows(text) {
  text = String(text ?? '');
  if (text.length > MAX_TEXT) throw Error('journal too large');
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/, 1)[0] || '',
    delimiter = first.includes(',') ? ',' : first.includes('\t') ? '\t' : ';',
    records = [];
  let record = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' && quoted && text[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (c === '"') quoted = !quoted;
    else if (c === delimiter && !quoted) {
      record.push(cell);
      cell = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      record.push(cell);
      if (record.some(x => x.trim() !== '')) records.push(record);
      if (records.length > MAX_ROWS) throw Error('journal too long');
      record = [];
      cell = '';
    } else cell += c;
  }
  if (quoted) throw Error('unclosed quote: the file is incomplete');
  if (cell !== '' || record.length) {
    record.push(cell);
    if (record.some(x => x.trim() !== '')) records.push(record);
  }
  if (!records.length) throw Error('empty file');
  const header = records.shift().map(x => x.trim());
  if (header.length > MAX_COLS) throw Error('too many columns');
  if (!header.includes('phase') || !header.includes('flight_id') || (!header.includes('mean_fuel_flow_kg_h') && !header.includes(
      'fuel_kg'))) throw Error('not a Fuel Phase Monitor journal');
  if (new Set(header).size !== header.length) throw Error('duplicate column names');
  let skipped = 0;
  const rows = [];
  for (const cells of records) {
    if (cells.length !== header.length) {
      skipped++;
      continue;
    }
    const r = Object.fromEntries(header.map((h, i) => [h, cells[i]]));
    if (r.phase === 'phase' || !r.flight_id || !r.phase || duration(r) < 0) {
      skipped++;
      continue;
    }
    rows.push(r);
  }
  return {
    rows,
    skipped,
    header
  };
}

/** Fenêtre de croisière exploitable (règle d'eligible du FuelDashboard, la croisière seule). */
export function eligible(r) {
  return eligibleFor(r, 'CRUISE');
}
/** Fenêtre exploitable d'une phase en vol (CRUISE : |vario| ≤ 100 ; CLIMB : vario ≥ 400 ; DESCENT : vario ≤ −400 ft/min), la règle
 *  d'eligible du FuelDashboard. */
export function eligibleFor(r, phase) {
  if (!r || r.phase !== phase || isLegacy(r) || duration(r) <= 0 || !(num(r.mean_fuel_flow_kg_h) > 0)) return false;
  const cov = num(r.fuel_coverage_pct);
  if (cov === null || cov < 99.9) return false;
  const flows = engineValues(r, 'fuel_flow_kg_h');
  if (!flows.length || flows.length !== num(r.engine_count) || flows.some(v => v === null || v <= 0)) return false;
  if (num(r.mean_pressure_altitude_ft) === null || !(num(r.mean_ias_kt) >= 40)) return false;
  const vs = num(r.mean_vertical_speed_fpm);
  if (vs === null || (phase === 'CRUISE' ? Math.abs(vs) > 100 : phase === 'CLIMB' ? vs < 400 : vs > -400)) return false;
  return !r.quality_flags;
}

/** Groupes de régime fusionnés (voir l'en-tête ; consolidateRegimeGroups du FuelDashboard, à l'identique). */
export function consolidateGroups(initial, limit = 10, near = 150) {
  const support = g => g.records.length,
    merge = (a, b) => {
      const peaks = new Map(a.peaks);
      for (const [rpm, count] of b.peaks) peaks.set(rpm, (peaks.get(rpm) || 0) + count);
      return {
        rpm: [...peaks].sort((x, y) => y[1] - x[1] || x[0] - y[0])[0][0],
        records: [...a.records, ...b.records],
        peaks
      };
    };
  let groups = initial.map(g => ({
    ...g,
    records: [...g.records],
    peaks: new Map(g.peaks)
  })).sort((a, b) => a.rpm - b.rpm);
  while (groups.length > 1) {
    const cand = [];
    for (let i = 0; i < groups.length - 1; i++) {
      const a = groups[i],
        b = groups[i + 1],
        small = Math.min(support(a), support(b)),
        large = Math.max(support(a), support(b)),
        distance = b.rpm - a.rpm;
      if (distance <= near && small * 3 <= large) cand.push({
        i,
        small,
        large,
        distance
      });
    }
    if (!cand.length) break;
    cand.sort((a, b) => a.small - b.small || a.distance - b.distance || b.large - a.large || a.i - b.i);
    const i = cand[0].i;
    groups.splice(i, 2, merge(groups[i], groups[i + 1]));
    groups.sort((a, b) => a.rpm - b.rpm);
  }
  while (groups.length > limit) {
    const weakest = groups.map((g, i) => ({
        i,
        count: support(g)
      })).sort((a, b) => a.count - b.count || a.i - b.i)[0].i,
      nb = [weakest - 1, weakest + 1].filter(i => i >= 0 && i < groups.length);
    nb.sort((a, b) => Math.abs(groups[a].rpm - groups[weakest].rpm) - Math.abs(groups[b].rpm - groups[weakest].rpm) || support(groups[b]) -
      support(groups[a]) || a - b);
    const i = Math.min(weakest, nb[0]);
    groups.splice(i, 2, merge(groups[i], groups[i + 1]));
    groups.sort((a, b) => a.rpm - b.rpm);
  }
  return groups;
}

/** La montée ou la descente mesurée (voir l'en-tête). */
export function phaseSummary(rows, phase) {
  const list = (rows || []).filter(r => eligibleFor(r, phase)),
    seconds = list.reduce((s, r) => s + duration(r), 0);
  if (seconds < 300 || list.length < 20) return null;
  const rpm = weightedMedian(list, 'mean_engine_rpm'),
    flow = weightedMedian(list, 'mean_fuel_flow_kg_h'),
    ias = weightedMean(list, 'mean_ias_kt'),
    tas = weightedMean(list, 'mean_tas_kt'),
    vs = weightedMean(list, 'mean_vertical_speed_fpm'),
    thr = weightedMean(list, 'mean_throttle_pct');
  return {
    phase,
    rpm: rpm === null ? null : Math.round(rpm / 10) * 10,
    flowKgH: flow === null ? null : Math.round(flow * 10) / 10,
    iasKt: ias === null ? null : Math.round(ias),
    tasKt: tas === null ? null : Math.round(tas),
    rateFpm: vs === null ? null : Math.round(Math.abs(vs) / 10) * 10,
    throttlePct: thr === null ? null : Math.round(thr),
    seconds: Math.round(seconds),
    windows: list.length,
    flights: new Set(list.map(flightKey)).size
  };
}

/** Médiane pondérée par la durée d'une valeur des fenêtres (null sans valeur). */
function weightedMedian(records, key) {
  const values = records.map(r => ({
    v: num(r[key]),
    w: duration(r)
  })).filter(x => x.v !== null && x.w > 0).sort((a, b) => a.v - b.v);
  const half = values.reduce((s, x) => s + x.w, 0) / 2;
  if (!values.length || !half) return null;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i].w;
    if (Math.abs(sum - half) < 1e-9) return (values[i].v + (values[i + 1]?.v ?? values[i].v)) / 2;
    if (sum > half) return values[i].v;
  }
  return values.at(-1).v;
}

/** Moyenne pondérée par la durée (null sans valeur). */
function weightedMean(records, key) {
  let w = 0,
    s = 0;
  for (const r of records) {
    const v = num(r[key]),
      d = duration(r);
    if (v === null || d <= 0) continue;
    w += d;
    s += v * d;
  }
  return w ? s / w : null;
}

/** Les points de palier mesurés (voir l'en-tête). */
export function levelCurves(rows, {
  step = 50,
  altStep = 1000,
  minSeconds = 60
} = {}) {
  // par altitude, des groupes par régime arrondi, puis les voisins peu fournis fusionnés (consolidateGroups, comme buildCurve du
  // FuelDashboard) ; toutes les valeurs recalculées sur les fenêtres d'origine (jamais une médiane de médianes)
  const byAlt = new Map();
  for (const r of rows || []) {
    if (!eligible(r)) continue;
    const rpm = num(r.mean_engine_rpm);
    if (!(rpm > 0)) continue;
    const altFt = Math.round(num(r.mean_pressure_altitude_ft) / altStep) * altStep,
      k = Math.round(rpm / step) * step;
    if (!byAlt.has(altFt)) byAlt.set(altFt, new Map());
    const bins = byAlt.get(altFt);
    if (!bins.has(k)) bins.set(k, {
      rpm: k,
      records: [],
      peaks: new Map()
    });
    const b = bins.get(k);
    b.records.push(r);
    b.peaks.set(k, b.records.length);
  }
  const groups = [];
  for (const [altFt, bins] of byAlt)
    for (const g of consolidateGroups([...bins.values()], 10, Math.max(150, step))) groups.push({
      altFt,
      rpm: g.rpm,
      records: g.records
    });
  const out = [];
  for (const g of groups) {
    const seconds = g.records.reduce((s, r) => s + duration(r), 0);
    if (seconds < minSeconds) continue;
    const flow = weightedMedian(g.records, 'mean_fuel_flow_kg_h'),
      tas = weightedMean(g.records, 'mean_tas_kt');
    out.push({
      altFt: g.altFt,
      rpm: g.rpm,
      flowKgH: flow === null ? null : Math.round(flow * 10) / 10,
      tasKt: tas === null ? null : Math.round(tas),
      seconds: Math.round(seconds),
      windows: g.records.length,
      flights: new Set(g.records.map(flightKey)).size
    });
  }
  return out.sort((a, b) => a.altFt - b.altFt || a.rpm - b.rpm);
}

/** Chaque point face à la courbe de même altitude de la fiche (voir l'en-tête). */
export function compare(curves, sheet, {
  toKg = v => v
} = {}) {
  const table = Array.isArray(sheet?.rpmFuelCurve) ? sheet.rpmFuelCurve : [];
  return (curves || []).map(p => {
    const rows = table.filter(r => num(r.altFt) === p.altFt && num(r.rpm) > 0 && num(r.fuelFlowPerHour) > 0)
      .map(r => [num(r.rpm), num(r.fuelFlowPerHour)]).sort((a, b) => a[0] - b[0]),
      at = rows.find(r => r[0] === p.rpm),
      lo = rows.filter(r => r[0] < p.rpm).at(-1),
      hi = rows.find(r => r[0] > p.rpm),
      raw = at ? at[1] : lo && hi ? lo[1] + (p.rpm - lo[0]) / (hi[0] - lo[0]) * (hi[1] - lo[1]) : null,
      sheetKgH = raw === null ? null : toKg(raw, sheet);
    return {
      ...p,
      sheetKgH: sheetKgH === null ? null : Math.round(sheetKgH * 10) / 10,
      deltaPct: sheetKgH > 0 && p.flowKgH !== null ? Math.round((p.flowKgH - sheetKgH) / sheetKgH * 1000) / 10 : null
    };
  });
}
