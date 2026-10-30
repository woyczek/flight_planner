// V3 frame/lib — export du plan de vol vers les simulateurs (V3_SPECIFICATION § 10.28, « Flight plan export to the simulators ») :
// X-Plane .fms (version 3 « I / 3 version » pour X-Plane 10/11, version 1100 pour X-Plane 11/12) et MSFS .pln (AceXML, 2020 et 2024).
// Écrivains purs : aucun DOM, aucun état, aucun réseau, aucune lecture de la locale (les nombres s'écrivent avec un point) ; ils
// reçoivent le vol (current_flight.json), son chemin « route + procédures » (flight_path.expandedPath) et des options, et rendent un
// texte. Le téléchargement est l'affaire de l'appelant (Carburant) ; l'envoi direct dans le dossier « Output/FMS plans » de X-Plane
// sera un verbe du lanceur, plus tard.
// API : toFmsV3, toFms1100, toPln, fileName, exportOf, airacOf, lla, EOL.
//   opts (tous facultatifs) : { procs: loadProcedures(...) — enregistrements et pistes choisis (noms, cycle, altitude des seuils),
//     names: { LFPO: 'Paris-Orly' } — noms des terrains, kinds: { RGS: 'vor' } — nature des points que la route ne porte pas,
//     now: Date — « aujourd'hui » (nom du fichier, cycle), version: 2020 | 2024 (toPln) }.

import {
  proceduresOf
} from './flight_path.js';
import {
  nameOf,
  rwNum,
  arincApp
} from './procedures.js';

/** Fin de ligne des fichiers écrits : CR LF (X-Plane et MSFS lisent les deux ; la forme de Windows, où ces fichiers vivent). */
export const EOL = '\r\n';

// ---------------------------------------------------------------- petits formats

/** Nombre fini ou null (un champ vide ou illisible n'est pas 0). */
const fin = v => v === null || v === undefined || v === '' || !Number.isFinite(+v) ? null : +v;
/** Nombre à six décimales avec un point, jamais « -0.000000 ». */
const n6 = v => {
  const s = (Math.round(+v * 1e6) / 1e6).toFixed(6);
  return s === '-0.000000' ? '0.000000' : s;
};
/** Identifiant sans blancs, en majuscules (un identifiant de fichier .fms ne porte pas d'espace). */
const ident = s => String(s ?? '').trim().toUpperCase().replace(/\s+/g, '');
/** Nom de procédure sans espaces ni points (« ILS Z RWY 23 » → « ILSZRWY23 »), en majuscules. */
const clean = s => String(s ?? '').toUpperCase().replace(/[\s.]+/g, '');
/** Texte XML : les caractères de contrôle interdits en XML 1.0 retirés (un nom abîmé ferait un .pln que MSFS refuse ; relecture de
 *  sécurité de 99d28acd0), puis & < > échappés (les guillemets des coordonnées DMS s'écrivent tels quels, comme MSFS). */
const escText = s => String(s ?? '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');
/** Valeur d'attribut XML : en plus, les guillemets et les apostrophes. */
const escAttr = s => escText(s).replace(/"/g, '&quot;').replace(/'/g, '&apos;');

// ---------------------------------------------------------------- cycle AIRAC

/** Cycle AIRAC (« 2610 » : deux chiffres de l'année, numéro du cycle dans l'année sur deux chiffres) en vigueur à une date : cycles
 *  de 28 jours depuis le 2401 (25 janvier 2024) ; le numéro compte les cycles depuis le premier de l'année du cycle. */
export function airacOf(date = new Date()) {
  const DAY = 864e5,
    CYC = 28 * DAY,
    REF = Date.UTC(2024, 0, 25),
    t = date instanceof Date ? date.getTime() : Date.parse(date);
  if (!Number.isFinite(t)) return '';
  const start = REF + Math.floor((t - REF) / CYC) * CYC,
    year = new Date(start).getUTCFullYear();
  // numéro : le premier cycle de l'année commence dans les 28 jours qui suivent le 1er janvier
  const k = Math.floor((start - Date.UTC(year, 0, 1)) / CYC) + 1;
  return `${String(year).slice(2)}${String(k).padStart(2, '0')}`;
}
/** Cycle d'un champ de fiche (source.cycle) : « 2610 » tel quel, une date « 2026-10-01 » ou « 2026-10 » convertie ; '' sinon. */
function airacOfField(c) {
  const s = String(c ?? '').trim();
  if (/^\d{4}$/.test(s)) return s;
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(s);
  return m ? airacOf(new Date(Date.UTC(+m[1], +m[2] - 1, +(m[3] || 1)))) : '';
}

// ---------------------------------------------------------------- lecture du vol et du chemin

/** Instant du vol : planned_at s'il est lisible, sinon opts.now, sinon maintenant. */
function when(flight, opts) {
  const t = Date.parse(flight?.planned_at || '');
  return Number.isFinite(t) ? new Date(t) : opts?.now instanceof Date ? opts.now : new Date();
}
/** Points de la route dans le chemin (origin 'route'), avec position, dans l'ordre : le départ, les points, l'arrivée. */
function routePoints(path) {
  return (path || []).filter(p => p && p.origin === 'route' && fin(p.lat) !== null && fin(p.lon) !== null);
}
/** Points de tout le chemin volé pour le format version 3, qui ne connaît pas les procédures : la route et les points des procédures,
 *  sans approche interrompue, sans seuil de piste (« RW07 » n'est pas un point de navigation), sans doublon consécutif. */
function flownPoints(path) {
  const out = [];
  for (const p of path || []) {
    if (!p || p.origin === 'missed' || p.rwy || fin(p.lat) === null || fin(p.lon) === null) continue;
    if (out.length && ident(out.at(-1).id) === ident(p.id)) continue;
    out.push(p);
  }
  return out;
}
/** Niveau prévu du vol, en pieds (0 s'il n'y en a pas). */
const levelFt = flight => fin(flight?.level?.ft) > 0 ? +flight.level.ft : 0;
/** Code du départ et de l'arrivée : ceux de la route, sinon le premier et le dernier point. */
function endsOf(flight, pts) {
  const r = flight?.route || {};
  return {
    dep: ident(r.dep || pts[0]?.id || ''),
    arr: ident(r.arr || pts.at(-1)?.id || '')
  };
}

/** Nature d'un point : 'airport' | 'ndb' | 'vor' | 'fix' | 'latlon'. Le départ et l'arrivée sont des terrains ; les autres suivent
 *  la nature que le point porte (kind ou type), puis opts.kinds[identifiant] (aerodb), puis la forme de l'identifiant (une
 *  coordonnée écrite en clair est un point de position), sinon un point nommé (fix). */
function kindOf(p, role, opts) {
  if (role) return 'airport';
  const raw = String(p.kind ?? p.type ?? opts?.kinds?.[ident(p.id)] ?? '').toLowerCase();
  if (/^(airport|aerodrome|ad|apt)$/.test(raw)) return 'airport';
  if (/ndb/.test(raw)) return 'ndb';
  if (/vor|dme|tacan|vortac/.test(raw)) return 'vor';
  if (/^(coord|latlon|user|pos)/.test(raw)) return 'latlon';
  if (/^(fix|waypoint|intersection|wpt|point)$/.test(raw)) return 'fix';
  const id = ident(p.id);
  if (!id || /^\d{2,4}[NS](\d{3,5}[EW])?$/.test(id) || /^[NS]\d{2,6}[EW]\d{3,7}$/.test(id) || /^[+-]?\d+(\.\d+)?[,_/][+-]?\d/.test(id))
    return 'latlon';
  return 'fix';
}
/** Code de type d'un point dans un fichier .fms : 1 terrain, 2 NDB, 3 VOR, 11 point, 28 position. */
const FMS_TYPE = {
  airport: 1,
  ndb: 2,
  vor: 3,
  fix: 11,
  latlon: 28
};
/** Identifiant d'un point dans un .fms : le sien ; un point de position sans nom en reçoit un d'après ses coordonnées. */
function fmsIdent(p, kind) {
  const id = ident(p.id);
  if (id) return id;
  return kind === 'latlon' ? `${n6(p.lat)}_${n6(p.lon)}` : 'WPT';
}
/** Niveau en route à un point : celui du palier que le point porte (alt_ft), sinon le niveau courant (le dernier palier, au départ
 *  celui du vol) ; un point de procédure ou un terrain ne le change pas. */
const levelAt = (p, cur) => p.origin === 'route' && fin(p.alt_ft) > 0 ? +p.alt_ft : cur;
/** Altitude écrite d'un point dans un .fms ou un .pln : 0 sur un terrain (son altitude si le chemin la porte), le niveau en route
 *  (cur, voir levelAt) sur un point de la route, l'altitude de la contrainte (en pieds) sur un point de procédure, 0 à défaut. */
function fmsAlt(p, kind, cur) {
  if (kind === 'airport') return fin(p.elev) !== null ? Math.max(0, +p.elev) : 0;
  if (p.origin === 'route') return cur;
  return fin(p.alt?.ft ?? p.alt) > 0 ? +(p.alt?.ft ?? p.alt) : 0;
}

// ---------------------------------------------------------------- X-Plane version 3 (X-Plane 10/11)

/** Plan de vol X-Plane 10/11, format « I / 3 version » : `I`, `3 version`, `1`, le nombre de points moins un, puis une ligne par
 *  point `type identifiant altitude lat lon` (types 1 terrain, 2 NDB, 3 VOR, 11 point, 28 position ; six décimales). Le chemin
 *  entier y passe, procédures comprises : ce format n'a pas de champ pour elles. */
export function toFmsV3(flight, path, opts = {}) {
  const pts = flownPoints(path),
    rp = routePoints(path),
    first = rp[0],
    last = rp.at(-1),
    lvl = levelFt(flight);
  let cur = lvl;
  const rows = pts.map(p => {
    const role = p === first ? 'dep' : p === last ? 'arr' : null,
      k = kindOf(p, role, opts);
    cur = levelAt(p, cur);
    return `${FMS_TYPE[k]} ${fmsIdent(p, k)} ${n6(fmsAlt(p, k, cur))} ${n6(p.lat)} ${n6(p.lon)}`;
  });
  return ['I', '3 version', '1', String(Math.max(0, rows.length - 1)), ...rows].join(EOL) + EOL;
}

// ---------------------------------------------------------------- X-Plane 1100 (X-Plane 11/12)

/** Nom de transition d'une fiche ou d'un identifiant (« LFPO.SID.OPAL2E.RW07.OPALE » → « OPALE ») ; '' pour NONE, ALL ou rien. */
function transOf(rec, id) {
  const t = clean(rec?.transition ?? String(id ?? '').split('.')[4] ?? '');
  return t === 'NONE' || t === 'ALL' ? '' : t;
}
/** Procédures choisies du vol, écrites pour le fichier : { depRwy, sid, sidTrans, arrRwy, star, starTrans, app, appTrans } (chaînes,
 *  '' pour « pas de valeur »). Les noms viennent des fiches (opts.procs) par nameOf, à défaut des identifiants du vol. */
function procsOf(flight, opts) {
  const v = proceduresOf(flight),
    d = v.dep || {},
    a = v.arr || {},
    P = opts?.procs || {},
    nm = (rec, id) => typeof id === 'string' && id || rec ? clean(nameOf(rec, id)) : '',
    rw = (x, rec) => {
      const n = rwNum(x ?? (rec ? rec.id : ''));
      return n ? `RW${n}` : '';
    };
  return {
    depRwy: rw(d.rwy, P.depRwy),
    sid: nm(P.sid, d.sid),
    sidTrans: typeof d.trans === 'string' ? transOf(P.sidTrans, d.trans) : '',
    arrRwy: rw(a.rwy, P.arrRwy),
    star: nm(P.star, a.star),
    starTrans: typeof a.trans === 'string' ? transOf(P.starTrans, a.trans) : '',
    // l'identifiant ARINC (« I02 », « R06-Y ») quand la fiche en porte un ou qu'il se déduit, sinon le nom sans espaces
    app: (P.app && arincApp(P.app)) || nm(P.app, a.app).replace(/\s+/g, ''),
    appTrans: typeof a.appTrans === 'string' ? transOf(P.appTrans, a.appTrans) : ''
  };
}
/** Cycle AIRAC du fichier : celui de la base publiée quand l'appelant le donne (opts.cycle, « 2610 » ou sa date), sinon celui des
 *  fiches de procédures choisies, sinon celui du jour du vol. */
function cycleOf(flight, opts) {
  const base = airacOfField(opts?.cycle);
  if (base) return base;
  const P = opts?.procs || {};
  for (const rec of [P.sid, P.star, P.app, P.sidTrans, P.starTrans, P.appTrans]) {
    const c = airacOfField(rec?.source?.cycle ?? rec?.cycle);
    if (c) return c;
  }
  return airacOf(when(flight, opts));
}

/** Plan de vol X-Plane 11/12, format « 1100 Version » : l'en-tête (cycle, terrains, pistes, procédures et leurs transitions, une ligne
 *  absente quand elle n'a pas de valeur), `NUMENR n`, puis une ligne par point de la route `type identifiant via altitude lat lon`
 *  (via : ADEP, ADES, le nom de la voie aérienne qui mène au point, sinon DRCT). Les points des procédures n'y sont pas : X-Plane
 *  les déroule lui-même d'après l'en-tête. */
export function toFms1100(flight, path, opts = {}) {
  const rp = routePoints(path),
    {
      dep,
      arr
    } = endsOf(flight, rp),
    pr = procsOf(flight, opts),
    lvl = levelFt(flight),
    head = ['I', '1100 Version', `CYCLE ${cycleOf(flight, opts)}`];
  const put = (key, v) => {
    if (v) head.push(`${key} ${v}`);
  };
  put('ADEP', dep);
  put('DEPRWY', pr.depRwy);
  put('SID', pr.sid);
  put('SIDTRANS', pr.sidTrans);
  put('ADES', arr);
  put('DESRWY', pr.arrRwy);
  put('STAR', pr.star);
  put('STARTRANS', pr.starTrans);
  put('APP', pr.app);
  put('APPTRANS', pr.appTrans);
  let cur = lvl;
  const rows = rp.map((p, i) => {
    const role = i === 0 ? 'dep' : i === rp.length - 1 ? 'arr' : null,
      k = kindOf(p, role, opts),
      via = role === 'dep' ? 'ADEP' : role === 'arr' ? 'ADES' : p.via && ident(p.via) !== 'DCT' ? ident(p.via) : 'DRCT';
    cur = levelAt(p, cur);
    return `${FMS_TYPE[k]} ${fmsIdent(p, k)} ${via} ${n6(fmsAlt(p, k, cur))} ${n6(p.lat)} ${n6(p.lon)}`;
  });
  return [...head, `NUMENR ${rows.length}`, ...rows].join(EOL) + EOL;
}

// ---------------------------------------------------------------- MSFS .pln (AceXML)

/** Degrés d'une coordonnée en `N48° 43' 22.80"` (hémisphère, degrés sans zéro de tête, minutes, secondes à deux décimales ; les
 *  centièmes de seconde sont arrondis une seule fois, pour qu'une minute ne s'écrive jamais 60). */
function dms(v, pos, neg) {
  const hs = Math.round(Math.abs(+v) * 3600 * 100),
    deg = Math.floor(hs / 360000),
    min = Math.floor(hs % 360000 / 6000),
    sec = (hs % 6000) / 100;
  return `${v < 0 ? neg : pos}${deg}° ${min}' ${sec.toFixed(2)}"`;
}
/** Position MSFS `N48° 43' 22.80",E2° 22' 44.40",+000291.00` : latitude, longitude, altitude en pieds avec signe et deux décimales. */
export function lla(lat, lon, altFt = 0) {
  const a = Math.round((fin(altFt) ?? 0) * 100) / 100;
  return `${dms(lat, 'N', 'S')},${dms(lon, 'E', 'W')},${a < 0 ? '-' : '+'}${Math.abs(a).toFixed(2).padStart(9, '0')}`;
}
/** Désignation de piste MSFS d'après « 14L » : { num: '14', des: 'LEFT' } (NONE sans lettre) ; null sans piste lisible. */
function runwayMsfs(rwy) {
  const m = /^(\d{1,2})([LRCW]?)$/.exec(rwNum(rwy));
  return m ? {
    num: String(+m[1]),
    des: {
      L: 'LEFT',
      R: 'RIGHT',
      C: 'CENTER',
      W: 'WATER',
      '': 'NONE'
    } [m[2]]
  } : null;
}
/** Type d'approche MSFS et suffixe d'après le nom de la fiche : « ILS Z RWY 23 » → { type: 'ILS', suffix: 'Z' }, « I13R » (CIFP) →
 *  { type: 'ILS' } ; {} quand le nom ne dit rien de sûr. */
function approachMsfs(name) {
  const s = String(name ?? '').trim().toUpperCase(),
    KEY = {
      ILS: 'ILS',
      LOC: 'LOCALIZER',
      LOCALIZER: 'LOCALIZER',
      RNAV: 'RNAV',
      RNP: 'RNAV',
      GPS: 'GPS',
      GNSS: 'GPS',
      VOR: 'VOR',
      NDB: 'NDB'
    },
    w = /^([A-Z]+)(?:[\s-]+(?:\(?([A-Z])\)?(?=[\s-]+(?:RWY|RW|\d))))?/.exec(s);
  if (w && KEY[w[1]]) return {
    type: KEY[w[1]],
    ...(w[2] ? {
      suffix: w[2]
    } : {})
  };
  const c = /^([ILRHVDNPB])\d{2}[LRC]?[A-Z]?$/.exec(s);
  return c ? {
    type: {
      I: 'ILS',
      L: 'LOCALIZER',
      B: 'LOCALIZER',
      R: 'RNAV',
      H: 'RNAV',
      V: 'VOR',
      D: 'VOR',
      N: 'NDB',
      P: 'GPS'
    } [c[1]]
  } : {};
}
/** Versions de l'application écrites dans AppVersion (major, build) : 2020 → 11 / 282174 ; 2024 → 12 / 282174 (le build de 2024 est un
 *  choix, MSFS ne le vérifie pas à la lecture). */
const APP = {
  2020: ['11', '282174'],
  2024: ['12', '282174']
};
/** Type de waypoint AceXML d'après la nature du point. */
const ATC_TYPE = {
  airport: 'Airport',
  ndb: 'NDB',
  vor: 'VOR',
  fix: 'Intersection',
  latlon: 'User'
};

/** Plan de vol MSFS (.pln, AceXML 2020 ou 2024 : opts.version) : un `ATCWaypoint` par point de la route (le départ et l'arrivée en
 *  `Airport`, la voie aérienne dans `ATCAirway`), la position au format DMS de MSFS, et sur les terrains la piste et les procédures
 *  choisies (DepartureFP, ArrivalFP, ApproachTypeFP, SuffixFP, RunwayNumberFP, RunwayDesignatorFP). Les points des procédures ne sont
 *  pas des waypoints : MSFS les déroule d'après ces champs. */
export function toPln(flight, path, opts = {}) {
  const rp = routePoints(path),
    {
      dep,
      arr
    } = endsOf(flight, rp),
    pr = procsOf(flight, opts),
    names = opts.names || {},
    lvl = levelFt(flight),
    ver = opts.version === 2024 ? 2024 : 2020,
    P = opts.procs || {},
    first = rp[0],
    last = rp.at(-1),
    elev = (p, rw) => fin(p?.elev) !== null ? +p.elev : fin(rw?.elev) !== null ? +rw.elev : 0,
    tag = (k, v) => v === undefined || v === null || v === '' ? '' : `<${k}>${escText(v)}</${k}>`,
    L = [];
  const push = (n, s) => L.push(`${'    '.repeat(n)}${s}`);
  push(0, '<?xml version="1.0" encoding="UTF-8"?>');
  push(0, '<SimBase.Document Type="AceXML" version="1,0">');
  push(1, '<Descr>AceXML Document</Descr>');
  push(1, '<FlightPlan.FlightPlan>');
  push(2, tag('Title', `${dep} to ${arr}`));
  push(2, '<FPType>IFR</FPType>');
  push(2, `<RouteType>${lvl > 18000 ? 'HighAlt' : 'LowAlt'}</RouteType>`);
  push(2, tag('CruisingAlt', lvl.toFixed(3)));
  push(2, tag('DepartureID', dep));
  if (first) push(2, tag('DepartureLLA', lla(first.lat, first.lon, elev(first, P.depRwy))));
  push(2, tag('DestinationID', arr));
  if (last) push(2, tag('DestinationLLA', lla(last.lat, last.lon, elev(last, P.arrRwy))));
  push(2, tag('Descr', `${dep}, ${arr}`));
  if (names[dep]) push(2, tag('DepartureName', names[dep]));
  if (names[arr]) push(2, tag('DestinationName', names[arr]));
  push(2, '<AppVersion>');
  push(3, tag('AppVersionMajor', APP[ver][0]));
  push(3, tag('AppVersionBuild', APP[ver][1]));
  push(2, '</AppVersion>');
  let cur = lvl;
  rp.forEach((p, i) => {
    cur = levelAt(p, cur);
    const role = p === first ? 'dep' : p === last ? 'arr' : null,
      k = kindOf(p, role, opts),
      id = fmsIdent(p, k),
      alt = k === 'airport' ? elev(p, role === 'dep' ? P.depRwy : P.arrRwy) : fmsAlt(p, k, cur);
    push(2, `<ATCWaypoint id="${escAttr(id)}">`);
    push(3, tag('ATCWaypointType', ATC_TYPE[k]));
    push(3, tag('WorldPosition', lla(p.lat, p.lon, alt)));
    if (!role && p.via && ident(p.via) !== 'DCT') push(3, tag('ATCAirway', ident(p.via)));
    if (role === 'dep') {
      const rw = runwayMsfs(pr.depRwy);
      if (rw) {
        push(3, tag('RunwayNumberFP', rw.num));
        push(3, tag('RunwayDesignatorFP', rw.des));
      }
      push(3, tag('DepartureFP', pr.sid));
    } else if (role === 'arr') {
      const rw = runwayMsfs(pr.arrRwy),
        ap = pr.app ? approachMsfs(nameOf(P.app, proceduresOf(flight).arr?.app)) : {};
      push(3, tag('ArrivalFP', pr.star));
      push(3, tag('ApproachTypeFP', ap.type));
      push(3, tag('SuffixFP', ap.suffix));
      if (rw) {
        push(3, tag('RunwayNumberFP', rw.num));
        push(3, tag('RunwayDesignatorFP', rw.des));
      }
    }
    if (k !== 'latlon') {
      push(3, '<ICAO>');
      push(4, tag('ICAOIdent', id));
      push(3, '</ICAO>');
    }
    push(2, '</ATCWaypoint>');
  });
  push(1, '</FlightPlan.FlightPlan>');
  push(0, '</SimBase.Document>');
  return L.filter(s => s.trim()).join(EOL) + EOL;
}

// ---------------------------------------------------------------- nom du fichier et sortie complète

/** Nom du fichier : `LFPO-EIDW_2026-10-30.fms` (départ, arrivée, jour du vol en UTC d'après planned_at, sinon opts.now ou aujourd'hui),
 *  caractères sûrs seulement (A-Z, 0-9, tiret, souligné). ext : 'fms' ou 'pln' (sans point). */
export function fileName(flight, ext, opts = {}) {
  const rp = (flight?.route?.points || []).filter(p => p && fin(p.lat) !== null),
    safe = s => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
    dep = safe(flight?.route?.dep || rp[0]?.id),
    arr = safe(flight?.route?.arr || rp.at(-1)?.id),
    day = when(flight, opts).toISOString().slice(0, 10),
    e = String(ext || 'fms').toLowerCase().replace(/[^a-z0-9]/g, '') || 'fms';
  return `${[dep, arr].filter(Boolean).join('-') || 'FLIGHTPLAN'}_${day}.${e}`;
}

/** Fichier complet d'un format : { name, text, type }. kind : 'fms1100' | 'fmsv3' | 'pln2020' | 'pln2024'. */
export function exportOf(kind, flight, path, opts = {}) {
  const pln = /^pln(2020|2024)$/.exec(kind);
  if (pln) return {
    name: fileName(flight, 'pln', opts),
    text: toPln(flight, path, {
      ...opts,
      version: +pln[1]
    }),
    type: 'application/xml'
  };
  return {
    name: fileName(flight, 'fms', opts),
    text: (kind === 'fmsv3' ? toFmsV3 : toFms1100)(flight, path, opts),
    type: 'text/plain'
  };
}
