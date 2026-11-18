// V3 missions — affecter une mission depuis la V3 (SOG-0443) : le calcul pur. Ni page, ni stockage, ni réseau : l'écran est
// assign_view.js, qui lit et écrit missions/affectations.json par le cadre (ctx.data).
//
// L'index des affectations (docs/technique/AFFECTATION_MISSIONS.md § 12) : { updatedAt, assignments: [ligne…] }. Une ligne écrite ici :
//   { mission, title, pilot, callsign, takeoff, departure, aircraft: { type, registration }, status: 'affectée' | 'annulée',
//     role: 'mission', updated_at, by }
// — la forme que lisent déjà mine() (assigned.js, « Mes missions affectées ») et seanceOf() (drawers.js, la séance des tiroirs), et
// rien de plus. Sa CLÉ est mission + pilot + role (la règle de fusion `keyed:assignments:mission+pilot+role` déclarée par module.js,
// la même que tools/data_sync.py) : elle ne change jamais sur une ligne ; changer de pilote = retirer l'une, affecter l'autre.
//
// Le fichier est écrit par n'importe quel pilote (une entrée NON FIABLE) : lu par own(), borné (au plus MAX_LINES lignes et MAX_SIZE
// signes de texte JSON, lu comme à écrire, sinon RIEN
// n'est écrit — jamais les lignes des autres tronquées), un fichier illisible ou d'une autre forme n'est jamais réécrit. Les lignes
// des autres sont gardées TELLES QUELLES (ni relues, ni réécrites, ni réordonnées) ; seule la ligne de la clé visée est remplacée.
//
// API :
//   readIndex(doc) → { ok: true, lines } (les lignes telles quelles ; [] sans fichier) ou { ok: false, why: 'shape' | 'size' }.
//   check(input, { types }) → { ok, why, value } : la saisie (pilot, callsign, date, time, type, registration : des textes) validée ;
//     why : le premier champ refusé ('pilot', 'callsign', 'takeoff', 'type', 'registration') ; value : { pilot, callsign, takeoff
//     (ISO UTC), type, registration }.
//   lineOf(mission, value, { by, now }) → la ligne à écrire, ou null (mission : { id, title, departure } — sa partie VISIBLE).
//   keyOf(line) → « mission|pilot|role » : la clé de la règle de fusion.
//   withLine(doc, line, now) → { doc, updated } (updated : la clé existait déjà, non annulée) ou { error: 'shape' | 'size' | 'line' }.
//   withdrawn(doc, ref, { by, now }) → { doc, line } (la ligne passée « annulée », `by` = celui qui retire, l'ancien `by` gardé dans
//     `assigned_by` s'il se valide) ou { error: 'shape' | 'size' | 'gone' | 'by' } (by : pas de trigramme valide) ; ref : { mission,
//     pilot, role } tels que listOf les a rendus.
//   conflictOf(doc, { mission, pilot, takeoff }) → { mission, takeoff } : une affectation NON annulée du même pilote, d'une AUTRE
//     mission, dont le décollage est à MOINS de deux heures (CONFLICT_MS) de celui-ci ; null sinon.
//   listOf(doc, missionId) → [{ mission, pilot, role, callsign, takeoff, type, registration }] : les lignes NON annulées de CETTE
//     mission, bornées pour l'affichage (pilot, mission, role : les valeurs du fichier, la clé de « Retirer »).
//   trigramsOf(paths) → ['ABC', …] : les trigrammes qui ont un dossier de pilote (pilot/<TRI>/…), triés, bornés.
//   defaultTakeoff(now) → { date: 'AAAA-MM-JJ', time: 'HH:MM' } : aujourd'hui, l'heure ronde suivante, en UTC.
//   meOf(trigram) → le trigramme de l'auteur validé comme drawers_view.js le fait (bookPath : rogné, trois lettres), '' sinon.

import {
  own
} from '../../frame/lib/untrusted.js'; // la valeur d'une clé PROPRE d'un objet, jamais une clé héritée (K479, SOG-0468 c : écrite une fois)
import {
  mine,
  cut,
  TRI,
  CALLSIGN,
  TYPE,
  ICAO
} from './assigned.js'; // le lecteur de « Mes missions affectées » : la ligne construite doit y passer telle quelle ; ses règles de lecture
import {
  bookPath,
  seanceOf,
  msOf
} from './drawers.js'; // la validation du trigramme et de l'identifiant (bookPath, comme drawers_view.js), la séance des tiroirs, l'instant ISO borné
import {
  two
} from '../../frame/lib/time.js'; // deux chiffres

/** Au plus tant de lignes lues dans le fichier : au-delà, rien n'est écrit (jamais les lignes des autres tronquées). */
export const MAX_LINES = 2000;
/** Au plus tant de signes dans le texte JSON du fichier (JSON.stringify(doc).length, environ un mégaoctet), lu ET à écrire : MAX_LINES
 *  borne le nombre de lignes, pas leur taille — une ligne géante d'un autre pilote serait recopiée à chaque affectation (Sécurisation,
 *  18/11). Au-delà : la raison 'size', rien n'est écrit. */
export const MAX_SIZE = 1000000;
/** Un conflit : une autre mission du même pilote dont le décollage est à MOINS de deux heures (deux heures pile : pas de conflit). */
export const CONFLICT_MS = 2 * 3600e3;
const TRIGRAMS_MAX = 400, // trigrammes proposés dans la liste du champ « Pilote »
  PATHS_MAX = 20000; // chemins de pilot/ parcourus au plus

// Les règles de lecture de assigned.js (mine : cut, TRI, CALLSIGN, TYPE, ICAO) sont IMPORTÉES, plus recopiées ; chaque ligne construite
// est tout de même REPASSÉE par mine() et seanceOf() (lineOf) : une divergence se voit au banc, jamais dans le fichier.
const REG = /^[A-Z0-9-]{1,10}$/i; // l'immatriculation (SOG-0443 : facultative, dix signes) : propre à l'affectation

/** Un trigramme en capitales, '' sinon — validé comme drawers_view.js le fait : par bookPath (rogné, trois lettres). */
const triOf = v => bookPath(typeof v === 'string' ? v : '', 'A-000')?.split('/')[1] || '';
/** Le trigramme de l'auteur d'une écriture (voir l'en-tête). */
export const meOf = v => triOf(v);
/** Un identifiant de mission en capitales, '' sinon — validé par bookPath (la forme des dossiers de missions/). */
const midOf = v => bookPath('AAA', typeof v === 'string' ? v : '')?.split('/')[3]?.replace(/\.json$/, '') || '';

/** Le fichier relu (voir l'en-tête) : ses lignes telles quelles, ou pourquoi il ne se réécrit pas. Ne lève jamais. */
export function readIndex(doc) {
  try {
    if (doc === null || doc === undefined) return {
      ok: true,
      lines: []
    };
    if (typeof doc !== 'object' || Array.isArray(doc)) return {
      ok: false,
      why: 'shape'
    };
    const list = own(doc, 'assignments');
    if (list === undefined) return {
      ok: true,
      lines: []
    };
    if (!Array.isArray(list)) return {
      ok: false,
      why: 'shape'
    };
    if (list.length > MAX_LINES) return {
      ok: false,
      why: 'size'
    };
    // le fichier doit se réécrire tel qu'il est lu : un accesseur qui lève, un cycle, un nombre géant illisible → rien n'est écrit ;
    // un texte de plus de MAX_SIZE signes (une ligne géante) → 'size'
    if (JSON.stringify(doc).length > MAX_SIZE) return {
      ok: false,
      why: 'size'
    };
    return {
      ok: true,
      lines: list.slice()
    };
  } catch {
    return {
      ok: false,
      why: 'shape'
    };
  }
}

/** La saisie validée (voir l'en-tête). `types` : les types de la mission (sa partie visible) — vide : l'affectation part sans type. */
export function check(input, {
  types = []
} = {}) {
  const i = input && typeof input === 'object' ? input : {},
    txt = (k, n) => cut(own(i, k), n),
    pilot = txt('pilot', 8).toUpperCase(),
    callsign = txt('callsign', 20).toUpperCase(),
    date = txt('date', 10),
    time = txt('time', 8).slice(0, 5),
    type = txt('type', 8).toUpperCase(),
    registration = txt('registration', 12).toUpperCase(),
    allowed = (Array.isArray(types) ? types : []).slice(0, 20).filter(t => typeof t === 'string' && TYPE.test(t));
  // la date et l'heure lues en UTC : le procédé de modules/atmosphere/screen_flight.js (Date.parse(`${v}:00Z`)), en deux champs comme
  // le compte rendu (modules/report/module.js) ; une date qui n'existe pas (31 février) est refusée, pas reportée au mois suivant
  const stamp = /^20\d{2}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time) ? Date.parse(`${date}T${time}:00Z`) : NaN,
    takeoff = Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 16) === `${date}T${time}` ? new Date(stamp).toISOString() :
    '';
  // le premier champ refusé, dans l'ordre de l'écran ; un type hors de ceux de la mission (ou un type quand elle n'en a pas) est refusé
  const typeOk = allowed.length ? allowed.includes(type) : !type,
    why = !TRI.test(pilot) ? 'pilot' : !CALLSIGN.test(callsign) ? 'callsign' : !takeoff ? 'takeoff' : !typeOk ? 'type' :
    registration && !REG.test(registration) ? 'registration' : '';
  return {
    ok: !why,
    why,
    value: why ? null : {
      pilot,
      callsign,
      takeoff,
      type: allowed.length ? type : '',
      registration
    }
  };
}

/** La ligne à écrire (voir l'en-tête), REPASSÉE par les deux lecteurs : mine() doit la rendre champ pour champ, seanceOf() doit y
 *  trouver le pilote ; null sinon (identifiant, trigramme de l'auteur ou saisie refusés). */
export function lineOf(mission, value, {
  by,
  now = Date.now()
} = {}) {
  const id = midOf(own(mission, 'id')),
    me = triOf(by),
    v = value && typeof value === 'object' ? value : null;
  if (!id || !me || !v || !TRI.test(v.pilot) || !CALLSIGN.test(v.callsign) || msOf(v.takeoff) === null) return null;
  // le terrain : le texte ENTIER doit être un OACI (jamais les quatre premières lettres d'un nom)
  const dep = cut(own(mission, 'departure'), 12).toUpperCase(),
    line = {
      mission: id,
      title: cut(own(mission, 'title'), 120),
      pilot: v.pilot,
      callsign: v.callsign,
      takeoff: new Date(msOf(v.takeoff)).toISOString(),
      departure: ICAO.test(dep) ? dep : '',
      aircraft: {
        type: TYPE.test(v.type || '') ? v.type : '',
        registration: REG.test(v.registration || '') ? v.registration : ''
      },
      status: 'affectée',
      role: 'mission',
      updated_at: new Date(Number.isFinite(now) ? now : Date.now()).toISOString(),
      by: me
    };
  // la contre-lecture : ce que le pilote lira, et la séance de ses tiroirs (au décollage même : mine écarte ce qui a plus de 12 h)
  const read = mine({
      assignments: [line]
    }, line.pilot, msOf(line.takeoff))[0],
    seance = seanceOf({
      mission: id,
      me: line.pilot,
      lines: [line]
    });
  const same = read && read.mission === id && read.title === line.title && read.callsign === line.callsign && read.takeoff === line
    .takeoff && read.departure === line.departure && read.type === line.aircraft.type && read.registration === line.aircraft
    .registration && !read.ferry;
  return same && seance.assigned ? line : null;
}

/** La clé d'une ligne pour la règle de fusion `keyed:assignments:mission+pilot+role` (frame/store/frame_data.js : les valeurs jointes
 *  par « | », '' pour une valeur absente). */
export const keyOf = l => ['mission', 'pilot', 'role'].map(k => {
  const v = own(l, k);
  return v === undefined || v === null ? '' : String(v);
}).join('|');

/** Le rang de la ligne de cette clé dans les lignes du fichier, -1 sinon (comparaison EXACTE, comme la règle de fusion) ; -2 si une
 *  ligne ne se lit pas (un accesseur qui lève). */
function rankOf(lines, key) {
  try {
    for (let i = 0; i < lines.length; i++)
      if (lines[i] && typeof lines[i] === 'object' && !Array.isArray(lines[i]) && keyOf(lines[i]) === key) return i;
    return -1;
  } catch {
    return -2;
  }
}

/** Le fichier à écrire : la ligne de la clé remplacée À SA PLACE, ou ajoutée en dernier ; toutes les autres lignes et toutes les autres
 *  clés du fichier gardées telles quelles ; `updatedAt` neuf. → { doc } ou { error: 'shape' | 'size' } (plus de MAX_SIZE signes une fois
 *  écrit). Ne lève jamais. */
function written(doc, lines, now) {
  try {
    const out = {
      ...(doc && typeof doc === 'object' && !Array.isArray(doc) ? doc : {}),
      updatedAt: new Date(Number.isFinite(now) ? now : Date.now()).toISOString(),
      assignments: lines
    };
    // un fichier qui ne se réécrit pas, ou qui passerait MAX_SIZE signes, n'est pas écrit
    return JSON.stringify(out).length > MAX_SIZE ? {
      error: 'size'
    } : {
      doc: out
    };
  } catch {
    return {
      error: 'shape'
    };
  }
}

/** Affecter : la ligne insérée par sa clé (voir l'en-tête). */
export function withLine(doc, line, now = Date.now()) {
  const r = readIndex(doc);
  if (!r.ok) return {
    error: r.why
  };
  if (!line || typeof line !== 'object' || own(line, 'role') !== 'mission' || !midOf(own(line, 'mission')) || !triOf(own(line, 'pilot')))
    return {
      error: 'line'
    };
  const lines = r.lines,
    at = rankOf(lines, keyOf(line));
  if (at === -2) return {
    error: 'shape'
  };
  if (at < 0 && lines.length >= MAX_LINES) return {
    error: 'size'
  };
  const updated = at >= 0 && own(lines[at], 'status') !== 'annulée';
  if (at >= 0) lines[at] = line;
  else lines.push(line);
  const out = written(doc, lines, now);
  return out.error ? out : {
    doc: out.doc,
    updated
  };
}

/** Retirer : la ligne de cette clé passée « annulée », `updated_at` neuf, `by` = celui qui retire (validé comme lineOf), l'ancien `by`
 *  gardé dans `assigned_by` (absent s'il ne se valide pas) — jamais supprimée (elle se ré-affecte en deux gestes). Rien d'autre de la
 *  ligne ne change (la forme lue par mine()). */
export function withdrawn(doc, ref, {
  by,
  now = Date.now()
} = {}) {
  const me = triOf(by);
  if (!me) return {
    error: 'by'
  };
  const r = readIndex(doc);
  if (!r.ok) return {
    error: r.why
  };
  let line, at;
  try {
    at = rankOf(r.lines, keyOf(ref));
    const old = at >= 0 ? r.lines[at] : null;
    if (at === -2) return {
      error: 'shape'
    };
    if (!old || own(old, 'status') === 'annulée' || !midOf(own(old, 'mission')) || !triOf(own(old, 'pilot'))) return {
      error: 'gone'
    };
    const before = triOf(own(old, 'by'));
    line = {
      ...old,
      status: 'annulée',
      updated_at: new Date(Number.isFinite(now) ? now : Date.now()).toISOString(),
      by: me
    };
    if (before) line.assigned_by = before;
    else delete line.assigned_by;
  } catch {
    return {
      error: 'shape'
    };
  }
  r.lines[at] = line;
  const out = written(doc, r.lines, now);
  return out.error ? out : {
    doc: out.doc,
    line
  };
}

/** Une affectation NON annulée du même pilote, d'une AUTRE mission, à moins de deux heures (voir l'en-tête) ; la plus proche. */
export function conflictOf(doc, {
  mission,
  pilot,
  takeoff
} = {}) {
  const r = readIndex(doc),
    id = midOf(mission),
    me = triOf(pilot),
    t = msOf(takeoff);
  if (!r.ok || !id || !me || t === null) return null;
  let best = null;
  try {
    for (const l of r.lines) {
      if (!l || typeof l !== 'object' || Array.isArray(l) || own(l, 'status') === 'annulée' || triOf(own(l, 'pilot')) !== me) continue;
      const other = midOf(own(l, 'mission')),
        at = msOf(own(l, 'takeoff'));
      if (!other || other === id || at === null || Math.abs(at - t) >= CONFLICT_MS) continue;
      if (!best || Math.abs(at - t) < Math.abs(best.at - t)) best = {
        mission: other,
        at
      };
    }
  } catch {
    return null; // une ligne qui ne se lit pas : pas de conflit dit (l'écriture, elle, refusera le fichier)
  }
  return best ? {
    mission: best.mission,
    takeoff: new Date(best.at).toISOString()
  } : null;
}

/** Les lignes NON annulées de cette mission, bornées pour l'affichage (voir l'en-tête), par décollage. */
export function listOf(doc, missionId) {
  const r = readIndex(doc),
    id = midOf(missionId);
  if (!r.ok || !id) return [];
  const out = [];
  try {
    collect(r.lines, id, out);
  } catch {
    return []; // une ligne qui ne se lit pas : rien n'est listé
  }
  return out.sort((a, b) => (Date.parse(a.takeoff) || 9e15) - (Date.parse(b.takeoff) || 9e15));
}

/** Les lignes de listOf, ajoutées à `out` (soixante au plus). */
function collect(lines, id, out) {
  for (const l of lines) {
    if (!l || typeof l !== 'object' || Array.isArray(l) || own(l, 'status') === 'annulée' || midOf(own(l, 'mission')) !== id) continue;
    const pilot = own(l, 'pilot'),
      mid = own(l, 'mission'),
      role = own(l, 'role');
    if (!triOf(pilot) || typeof mid !== 'string' || (role !== undefined && typeof role !== 'string')) continue;
    const ac = own(l, 'aircraft'),
      cs = cut(own(l, 'callsign'), 12),
      ty = cut(own(ac, 'type'), 8),
      at = msOf(own(l, 'takeoff'));
    out.push({
      mission: mid, // la valeur du fichier : la clé de « Retirer »
      pilot,
      role: role ?? '',
      tri: triOf(pilot),
      callsign: CALLSIGN.test(cs) ? cs.toUpperCase() : '',
      takeoff: at === null ? '' : new Date(at).toISOString(),
      type: TYPE.test(ty) ? ty.toUpperCase() : '',
      registration: cut(own(ac, 'registration'), 12).toUpperCase()
    });
    if (out.length >= 60) break;
  }
}

/** Les trigrammes qui ont un dossier de pilote (voir l'en-tête) : la règle de frame/help/signaler.js (les chemins de
 *  ctx.data.list('pilot/') lus par motif), au trigramme de trois lettres. */
export function trigramsOf(paths) {
  const seen = new Set();
  for (const p of (Array.isArray(paths) ? paths : []).slice(0, PATHS_MAX)) {
    const m = /^pilot\/([A-Z]{3})\//.exec(typeof p === 'string' ? p : '');
    if (m) seen.add(m[1]);
    if (seen.size >= TRIGRAMS_MAX) break;
  }
  return [...seen].sort();
}

/** Aujourd'hui, l'heure ronde suivante, en UTC (les valeurs des champs date et heure ; le procédé de depField, screen_flight.js). */
export function defaultTakeoff(now = Date.now()) {
  const d = new Date((Math.floor((Number.isFinite(now) ? now : Date.now()) / 3600e3) + 1) * 3600e3);
  return {
    date: `${d.getUTCFullYear()}-${two(d.getUTCMonth() + 1)}-${two(d.getUTCDate())}`,
    time: `${two(d.getUTCHours())}:00`
  };
}
