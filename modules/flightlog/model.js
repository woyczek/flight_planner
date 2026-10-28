// V3 flightlog — modèle pur de « Mes vols » (modules/flightlog/SPEC.md) : un vol par ligne tiré de chaque source
// (compte rendu V3 ou V2, journal du site, session réseau), clé de rapprochement, fusion sans doublon (le CR l'emporte
// sur le journal, qui l'emporte sur le réseau), filtre, totaux, CSV, famille proposée au CR. Repris de la V2
// (shared/my_flights.js : keyOf, source 'cr', source 'log', collect ; apps/pilot/mes_vols.html : shown, totals,
// exportCsv ; shared/mission_core/defa_log.js : FAMILY_RULES, familyOf). Ni page, ni stockage, ni réseau.
import {
  fmtDateZ
} from '../../frame/lib/time.js';

/** Texte en majuscules sans blancs de bord. */
const up = v => String(v ?? '').trim().toUpperCase();
/** Lettres et chiffres seulement. */
const bare = v => up(v).replace(/[^A-Z0-9]/g, '');
/** Rang d'une source dans la fusion : le CR d'abord, puis le journal du site, puis le réseau. */
const RANK = {
  cr: 0,
  log: 1,
  net: 2
};

/** Clé de rapprochement d'un vol (V2 keyOf) : date, indicatif et immatriculation sans séparateurs. */
export const keyOf = f => [f.date, bare(f.callsign), bare(f.reg)].join('|');

/** Minutes entre deux heures « HH:MM » (passage de minuit compris) ; null si une heure manque. */
function between(a, b) {
  const m = s => {
    const x = /^(\d{1,2}):(\d{2})/.exec(String(s || ''));
    return x && +x[1] < 24 && +x[2] < 60 ? +x[1] * 60 + +x[2] : null;
  };
  const x = m(a),
    y = m(b);
  return x == null || y == null ? null : y >= x ? y - x : y - x + 1440;
}

/** « AAAA-MM-JJ HH:MMZ » d'un instant (date UTC, heure UTC) ; vide s'il est illisible. */
const isoZ = d => d && Number.isFinite(d.getTime()) ? `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}Z` : '';
/** Jour et heure d'un CR à montrer, en UTC : CR marqué timeline.tz = 'Z' tel quel ; CR plus ancien (heures de
 *  l'appareil) converti ; heure UTC du plan de vol (metadata.timeUtc) telle quelle ; le jour seul sans heure. */
function crWhenZ(m, date, tl) {
  const t = tl.offBlock || tl.takeoff || tl.engineStart || '';
  if (/^\d{2}:\d{2}$/.test(t)) return tl.tz === 'Z' ? `${date} ${t}Z` : isoZ(new Date(`${date}T${t}:00`)) || date;
  const u = String(m.metadata?.timeUtc || '');
  return /^\d{2}:\d{2}$/.test(u) ? `${date} ${u}Z` : date;
}

/** Vol d'un compte rendu (enregistrement V3 de cr/reports/, ou entrée du registre V2 : même schéma) ; path : chemin de
 *  l'enregistrement V3 (vide pour un CR du registre V2). Mêmes règles que la source 'cr' de la V2 : premier appareil,
 *  indicatif complet sinon série + numéro, départ = navigation sinon base, arrivée = terrain réel sinon navigation
 *  sinon base de retour, heure = sortie des cales, sinon décollage, sinon mise en route, bloc = statistiques (bloc,
 *  sinon vol), sinon heures. */
export function fromReport(m, path = '') {
  const a = (m.aircraft || [])[0] || {},
    tl = m.timeline || {},
    nav = m.navigation || {},
    st = m.statistics || {};
  return {
    source: 'cr',
    date: String(m.metadata?.date || ''),
    time: tl.offBlock || tl.takeoff || tl.engineStart || m.metadata?.timeUtc || '', // CR d'un vol démarré : la mise en route seule
    whenZ: crWhenZ(m, String(m.metadata?.date || ''), tl), // à montrer : en UTC (règle de l'appli Pilote)
    callsign: up(a.callsign || [a.callsignPrefix, a.callsignNumber].filter(Boolean).join(' ')),
    type: up(a.type),
    reg: up(a.registration),
    dep: up(nav.dep || a.baseDeparture),
    arr: up(a.landingAd || nav.arr || a.baseReturn),
    block: st.blockMinutes ?? st.flightMinutes ?? between(tl.offBlock || tl.engineStart, tl.onBlock || tl.shutdown) ?? between(tl.takeoff,
      tl.landing),
    mission: [m.family, m.subtype, m.metadata?.operationName].filter(Boolean).join(' · '),
    family: m.family || '',
    crId: m.metadata?.missionId || '',
    path,
    by: up(m.by || m.metadata?.reportedBy),
    notes: [m.results?.detail, m.results?.incidents].filter(Boolean).join(' · ')
  };
}

/** Vol d'une ligne du journal du site (pilot/<trigramme>/site_log.json, SPEC § 3). */
export function fromLog(r) {
  return {
    source: 'log',
    date: String(r.date || ''),
    time: String(r.time || ''),
    whenZ: [r.date, r.time].filter(Boolean).join(' '), // convention du formulaire du site, sans conversion
    callsign: up(r.callsign),
    type: up(r.type),
    reg: up(r.registration),
    dep: up(r.dep),
    arr: up(r.arr),
    block: Number.isFinite(+r.durationMin) && r.durationMin !== null && r.durationMin !== '' ? +r.durationMin : null,
    mission: up(r.mission),
    family: familyOf(r),
    crId: '',
    path: '',
    notes: ''
  };
}

/** Vol d'une session réseau (liste de frame/lib/last_flight.js : callsign, dep, arr, start, end, open) : date et heure
 *  locales de l'appareil, durée connexion → déconnexion ; ni type ni immatriculation. */
export function fromNetwork(f, network) {
  const s = f.start ? new Date(f.start) : null,
    e = f.end ? new Date(f.end) : null,
    pad = n => String(n).padStart(2, '0');
  return {
    source: 'net',
    network,
    netId: f.id,
    date: s ? `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}` : '',
    time: s ? `${pad(s.getHours())}:${pad(s.getMinutes())}` : '',
    whenZ: s ? isoZ(s) : '',
    callsign: up(f.callsign),
    type: '',
    reg: '',
    dep: up(f.dep),
    arr: up(f.arr),
    block: s && e ? Math.round((e - s) / 60000) : null,
    mission: '',
    family: familyOf({
      callsign: f.callsign
    }),
    crId: '',
    path: '',
    open: !!f.open,
    notes: ''
  };
}

/** Fusion de listes de vols : une ligne par clé, la source de meilleur rang gardée (sa durée complétée par une
 *  ligne couverte s'il n'en a pas) ; un vol du réseau (sans immatriculation) est couvert par une ligne de meilleur rang de même date et même indicatif. Du plus récent au plus
 *  ancien. */
export function merge(...lists) {
  const all = lists.flat().filter(f => f && f.date).map(f => ({
      ...f
    })).sort((a, b) => RANK[a.source] - RANK[b.source]),
    out = new Map(),
    seen = new Set();
  for (const f of all) {
    const k = keyOf(f),
      dc = `${f.date}|${bare(f.callsign)}`;
    const had = out.get(k);
    // ligne couverte : sa durée sert au vol gardé qui n'en a pas (CR sans heures, journal qui en a une)
    if (had) {
      if (had.block == null && f.block != null) had.block = f.block;
      continue;
    }
    if (f.source === 'net' && bare(f.callsign) && seen.has(dc)) continue;
    out.set(k, f);
    seen.add(dc);
  }
  return [...out.values()].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}

/** Un vol n'a pas de compte rendu quand sa meilleure source n'est pas un CR (journal du site ou réseau) : une seule
 *  règle pour le filtre « Sans CR », la tuile de totaux et la liste publiée pour le cadre (pending). */
export const lacksReport = f => f.source !== 'cr';

/** Vols retenus (V2 shown) : période en jours (0 : tout), recherche par mots (indicatif, type, immatriculation,
 *  terrains, mission, n° de CR), sans CR seulement ; today : AAAA-MM-JJ. */
export function filter(flights, {
  days = 365,
  find = '',
  noReport = false,
  today = new Date().toISOString().slice(0, 10)
} = {}) {
  const from = days ? new Date(Date.parse(`${today}T00:00:00Z`) - days * 864e5).toISOString().slice(0, 10) : '',
    words = up(find).split(/\s+/).filter(Boolean);
  return flights.filter(f => (!from || f.date >= from) && (!noReport || lacksReport(f)) && words.every(w => up([f.callsign, f.type, f
    .reg,
    f.dep, f.arr, f.mission, f.crId
  ].join(' ')).includes(w)));
}

/** Totaux (V2 totals / tiles) : nombre de vols, minutes de bloc, vols sans CR, trois types les plus volés. */
export function totals(list) {
  const byType = {};
  for (const f of list)
    if (f.type) byType[f.type] = (byType[f.type] || 0) + 1;
  return {
    flights: list.length,
    blockMinutes: list.reduce((s, f) => s + (f.block || 0), 0),
    noReport: list.filter(lacksReport).length,
    types: Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 3)
  };
}

/** Vols sans compte rendu à écrire, publiés pour le bouton « i » du cadre (cache/flightlog/pending.json, schéma 2) :
 *  les vols de `flights` (fusionnés) sans CR, du plus récent au plus ancien, des `days` derniers jours (30), `max`
 *  au plus (5) ; source : website (journal du site), ivao ou vatsim ; handoff : ce que « Écrire le CR » remet à
 *  report (handoffOf), pour que le cadre le remette lui-même. today : AAAA-MM-JJ. */
/** Vols sans compte rendu de la fenêtre (days jours jusqu'à today), du plus récent, max au plus : la sélection commune
 *  de pending et de statusLines. */
function pendingFlights(flights, {
  today = new Date().toISOString().slice(0, 10),
  days = 30,
  max = 5
} = {}) {
  return filter(flights, {
    days,
    noReport: true,
    today
  }).sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)).slice(0, max);
}
export function pending(flights, {
  today = new Date().toISOString().slice(0, 10),
  days = 30,
  max = 5
} = {}) {
  return pendingFlights(flights, {
    today,
    days,
    max
  }).map(f => ({
    date: f.date,
    dep: f.dep,
    arr: f.arr,
    registration: f.reg,
    source: f.source === 'log' ? 'website' : String(f.network || f.source).toLowerCase(),
    handoff: handoffOf(f)
  }));
}

/** Texte d'une ligne d'état « CR à écrire » ×4 (fr, en, de, es), la formulation du cadre (frame/app.js). */
const STATUS_TX = ['CR à écrire pour le vol du {date} {dep}→{arr}', 'Report to write for the flight of {date} {dep}→{arr}',
  'Bericht zu schreiben für den Flug vom {date} {dep}→{arr}', 'Informe por escribir del vuelo del {date} {dep}→{arr}'
];
const LANGS = ['fr', 'en', 'de', 'es'];
/** Lignes d'état publiées pour le cadre (cache/flightlog/status.json, frame/INTEGRATION.md § 10.0) : une par vol sans
 *  compte rendu (pending : 30 jours, 5 au plus, du plus récent), texte prêt ×4 avec le jour dans l'écriture de la langue
 *  et l'heure en UTC quand elle est connue (« 23/10/2026 16:30Z » ; le journal du site : son jour, sans conversion),
 *  go #report?from=flightlog, news, et le passage vers report (handoff { to, family, values }). */
export function statusLines(flights, opts = {}) {
  return pendingFlights(flights, opts).map(f => {
    const p = {
        date: f.date,
        dep: f.dep,
        arr: f.arr,
        handoff: handoffOf(f)
      },
      m = /^(\d{4}-\d{2}-\d{2})(?: (\d{2}:\d{2})Z)?/.exec(f.whenZ || f.date || ''),
      day = l => m ? m[2] ? fmtDateZ(`${m[1]}T${m[2]}:00Z`, l) : fmtDateZ(`${m[1]}T00:00:00Z`, l).split(' ')[0] : p.date;
    return {
      text: LANGS.map((l, i) => STATUS_TX[i].replace('{date}', day(l)).replace('{dep}', p.dep || '?').replace('{arr}', p.arr ||
        '?')),
      go: '#report?from=flightlog',
      news: true,
      handoff: {
        to: 'report',
        ...p.handoff
      }
    };
  });
}

/** Minutes → « 1:35 » ; « — » sans valeur. */
export const hm = n => n == null ? '—' : `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;

/** CSV de la V2 (point-virgule, guillemets, BOM, fins de ligne CRLF) : head = libellés des sept colonnes, noCr =
 *  texte d'un vol sans CR. */
export function csv(list, head, noCr) {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`,
    rows = [head, ...list.map(f => [f.date, f.callsign, [f.type, f.reg].filter(Boolean).join(' '), [f.dep, f.arr].filter(Boolean).join(
        ' → '),
      f.block == null ? '' : hm(f.block), f.mission, f.crId || noCr
    ])];
  return '﻿' + rows.map(r => r.map(q).join(';')).join('\r\n');
}

// Famille de mission d'un vol sans CR (V2 defa_log.js) : texte de la mission, puis indicatif et type ; à défaut SPECIAL.
const FAMILY_RULES = [
  ['FIRE', /FEU|INCENDI|GAAR|FIRE|ECOPAGE|WATER ?BOMB|LARGAGE D.?EAU|FFS/],
  ['COMBAT', /\bBFM\b|\bACM\b|\bDACT\b|COMBAT|DOGFIGHT|\b[1-4] ?V ?[1-4]\b|PLASTRON|RED ?AIR/],
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
/** Famille d'un vol : règles sur le texte de la mission, puis indicatif et type d'appareil (V2 familyOf). */
export function familyOf(r) {
  const text = up(r.mission),
    rule = FAMILY_RULES.find(([, re]) => re.test(text));
  if (rule) return rule[0];
  const cs = up(r.callsign),
    type = up(r.type);
  if (/^(PELIC|PCAN|MILAN)/.test(cs) || /^(CL2T|DH8D)$/.test(type)) return 'FIRE';
  if (/^(DRAGO|SAMU|CHOUC)/.test(cs)) return 'HEMS';
  if (/^(K35R|K35E|C135|KC10|K46|KC46)$/.test(type)) return 'AAR';
  if (/^(A400|C130|C30J|A332|A330|CN35|C160|A310)$/.test(type) || /^(CTM|VANT|CVEX|RILLE)/.test(cs)) return 'AIRLIFT';
  if (/^(E3CF|E3TF)$/.test(type)) return 'COMMAND';
  return 'SPECIAL';
}

/** Valeurs du passage vers report (pilot/handoff.json) pour écrire le CR d'un vol : chemins de la mission V2. */
export function reportValues(f) {
  const v = {
    'metadata.date': f.date,
    'aircraft.0.callsign': f.callsign,
    'aircraft.0.type': f.type,
    'aircraft.0.registration': f.reg,
    'navigation.dep': f.dep,
    'navigation.arr': f.arr,
    'metadata.operationName': f.source === 'log' ? f.mission : ''
  };
  return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== '' && x != null));
}

/** Ce que « Écrire le CR » d'un vol remet à report dans pilot/handoff.json, en plus de to / from / source / at / fresh :
 *  la famille proposée et les valeurs (reportValues). Une seule fonction pour le geste du module et pour l'entrée de
 *  cache/flightlog/pending.json, d'où le cadre peut écrire le même passage. */
export const handoffOf = f => ({
  family: f.family,
  values: reportValues(f)
});
