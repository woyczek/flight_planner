// V3 missions — les tiroirs d'une mission chez le pilote (SOG-0441, lot T1) : le calcul pur. Ni page, ni stockage, ni réseau.
//
// Un tiroir (douze au plus, identifiants B à M dans l'ordre du fichier — à l'écran « Tiroir 1, 2, 3… » : les lettres désignent les
// équipages d'une opération ; décision de l'utilisateur du 17/11 : plus de limite à trois ; les « phases » d'un fichier de mission, lues et bornées par frame/lib/mission.js — `drawers`, chacun
// { id, title, message, brief, key, route }) est fermé tant que sa clé n'a pas joué. Ce fichier dit, pour UN pilote à UN instant, l'état
// de chaque tiroir, d'après :
//   · l'heure (clé `time`) et l'heure de repli (`key.fallbackMin` de toute autre clé : `zone`, `object`, `hand` quand le lecteur n'a pas
//     lu la condition de l'auteur, et toute clé que ce fichier ne sait pas encore juger — « arrivée », cible mobile : elle n'est pas
//     refusée, le tiroir reste fermé et s'ouvre au geste ou à son heure de repli) : CALCULÉES, jamais écrites ;
//   · les CARNETS : un par pilote et par mission, `pilot/<TRI>/missions/<ID>.json` — chacun n'écrit que le sien (aucun conflit
//     d'écriture) ; seuls les gestes (« Ouvrir le tiroir ») et les constats (zone franchie, objet trouvé, arrivée posée — avec les
//     DEUX relevés du trajet, à pleine précision, pour qu'un autre appareil rejoue le constat) s'y écrivent.
// « Ouvert pour tous » (décision de l'utilisateur, 17/11/2026, Q-0087) se CALCULE : un tiroir est ouvert dès que le carnet d'UN pilote
// de la mission dit un CONSTAT (zone franchie, objet trouvé). Le GESTE « Ouvrir le tiroir » n'ouvre que pour celui qui le fait (sur tous
// ses appareils) : les autres le lisent (`hands` : « BBB l'a ouvert à la main ») et gardent leur tiroir fermé — en attendant la réponse
// de l'utilisateur à Q-0094 (une ligne à changer : SHARED). Le carnet d'un autre est une entrée NON FIABLE (tout pilote écrit dans le dépôt) : il est relu borné, son
// ouverture n'est retenue que si elle tient debout (checkOther), et une ouverture refusée est DITE avec son auteur. Un tiroir ouvert
// le reste : l'appareil garde les ouvertures des autres qu'il a vues (`seen`, sur l'appareil seul) ; si l'un d'eux la retire de son
// carnet, le tiroir reste ouvert ici et l'écran le dit (`gone`).
//
// L'ORDRE (décision de l'ergonome, 17/11/2026, comme le moteur de référence de l'atelier de l'utilisateur) : une clé, l'heure de repli ou
// le geste n'ouvrent que le PREMIER tiroir encore fermé ; les suivants sont verrouillés (`locked`, `after` : le tiroir d'avant) ; ce qui
// est arrivé pendant qu'un tiroir d'avant était fermé (une heure passée, le constat d'un autre) joue dès que celui-ci s'ouvre — l'heure
// d'ouverture (`at`) est alors celle de cette ouverture, `srcAt` gardant l'heure du fait.
//
// La SÉANCE : une mission se rejoue (réaffectée un autre jour, tirée au sort de nouveau) ; un carnet ne vaut que pour une séance.
//   · mission affectée à ce pilote : `A:<AAAA-MM-JJ>` (jour UTC du premier décollage de ses lignes ; `A:0` sans heure) ; l'équipage =
//     les trigrammes des lignes de la mission ;
//   · mission jouée seul : `S:<started.at>` une fois le vol de cette mission démarré, null avant ; l'équipage = le pilote.
// Un carnet d'une AUTRE séance ne compte pas (bookFor) ; il est remplacé à la première écriture. Un carnet écrit avant le départ d'une
// mission jouée seul n'a pas de séance : il est rattaché à celle du départ.
//
// API :
//   bookPath(trigram, missionId) → 'pilot/<TRI>/missions/<ID>.json', ou null (jamais un chemin pris tel quel).
//   readBook(doc, missionId) → le carnet relu borné { mission, seance, readAt, startAt, drawers: { B: { state, at, how, from, to, source } } }
//     (heures en millisecondes), ou null (illisible, ou d'une autre mission).
//   seanceOf({ mission, me, lines, flight }) → { key, ref, crew, assigned } : la séance de ce pilote (voir plus haut) ; ref : l'heure de
//     référence prévue en millisecondes (le décollage affecté, ou le départ du vol), ou null.
//   bookFor(book, seance) → le carnet s'il est de cette séance, sinon null.
//   stateOf(drawers, { me, seance, book, others, seen, now, passage, crosses }) → un état par tiroir :
//     { id, title, key, open, how ('time' | 'fallback' | 'hand' | 'zone' | 'object' | null), at, by (trigramme ; null pour une heure),
//       mine, dueAt (l'heure d'ouverture prévue : la clé `time`, ou le repli ; null si inconnue), estimated (cette heure est estimée),
//       locked (un tiroir d'avant est encore fermé : rien ne l'ouvre), after (l'identifiant du tiroir d'avant), srcAt (l'heure du fait
//       qui l'a ouvert, `at` étant celle où il a joué), gotAt (l'heure où cet appareil a reçu l'ouverture d'un autre, ou null), other
//       (le constat d'un autre le plus ancien retenu, même sous verrou),
//       sealed (rescellé par ce pilote, et personne d'autre ne l'a ouvert), gone (l'ouverture retenue n'est plus dans le carnet de son
//       auteur), hands: [{ by, at }] (les autres pilotes de la mission qui l'ont ouvert à la main, pour eux seuls), refused: [{ by, why }]
//       (les ouvertures d'autres carnets non retenues : 'stranger', 'seance', 'future', 'before', 'key', 'shape') }.
//     others : [{ pilot, book }] (les carnets des autres, déjà passés par readBook) ; seen : readSeen(…) ; passage(pointId) → minutes
//     estimées du départ à ce lieu (un nombre, ou { min }), null si inconnu ; crosses({ from, to }, key) → vrai si ce trajet coupe la
//     forme de la clé (par défaut : stands, le rejeu par le service du cadre — un constat sans relevé ne tient pas).
//   follows(key) → vrai si la clé se juge avec une position en direct ; finding(key, prev, next, { trail }) → le constat d'un trajet,
//     ou null ; stands(entry, key) → le constat d'un carnet tient-il sur cette clé ; catchUp(key, trail, since) → le constat retrouvé sur
//     la trace gardée (le rattrapage au retour de la page).
//   seenAfter(seen, states, seance, now) → ce que l'appareil garde après ce calcul ; readSeen(doc, seance) → { B: { by, at, how, got } }
//     borné (got : l'heure où l'appareil l'a reçue).
//   openPath(missionId) → 'cache/missions/open_<ID>.json' (SOG-0448 : ce que CET appareil sait des tiroirs ouverts de MA mission — sur
//     l'appareil seul, jamais envoyé ; lu par la Carte et par quiconque montre la mission par pilotView de frame/lib/mission.js), ou null.
//   openAfter(states, { mission, mine, seance }, now) → le document à garder : { schema: 1, mission, mine, seance, opened: ['B', 'C'],
//     at } ; `mine` faux : aucune lettre. readOpen(doc, missionId, { now, seance }) → { mine, opened, seance, at } relu BORNÉ, fermé à
//     l'échec ({ mine: false, opened: [] }) : un document d'une autre mission, sans `mine` exactement vrai, daté du futur ou de plus de
//     OPEN_MS (un jour), ou — quand `seance` est donnée — d'une autre séance, ne tient aucun tiroir pour ouvert.
//   withOpen(doc, ctx, id, how, fix?), withSeal(doc, ctx, id), withRead(doc, ctx), withStart(doc, ctx, startAt) → le carnet à écrire
//     (ctx : { mission, me, seance, now }) ; null si rien n'est à écrire (identifiants refusés).

import {
  DRAWER_IDS
} from '../../frame/lib/mission.js'; // la liste fermée du lecteur (B à M) : une seule liste, jamais recopiée
import {
  crossed,
  reach,
  arrived,
  fixOf as fixRead
} from '../../frame/lib/crossing.js'; // le service de franchissement du cadre (SOG-0447) : le MÊME jugement en vol et au rejeu d'un constat

/** Les identifiants de tiroir : ceux du lecteur de mission (un tiroir lu a toujours sa place dans le carnet). */
export const LETTERS = [...DRAWER_IDS];
/** Ce qui s'écrit dans un carnet : un geste ou un constat. L'heure et l'heure de repli se calculent. */
export const HOWS = ['hand', 'zone', 'object', 'arrival'];
/** Les ouvertures d'un AUTRE carnet qui ouvrent le tiroir ici : les constats. Le geste d'un autre n'ouvre que pour lui (décision de
 *  l'ergonome du 17/11 en attendant Q-0094 : « pour tous ou pour soi ? ») — pour l'ouvrir à tous, ajouter 'hand' ici, rien d'autre. */
export const SHARED = ['zone', 'object', 'arrival'];
export const LEG_MS = 60e3; // deux relevés font un trajet s'ils sont à une minute au plus l'un de l'autre (à l'écriture comme au rejeu)
const SOURCES = ['xplane', 'lnm', 'gps', 'ivao', 'vatsim', 'trail']; // trail : constat retrouvé sur la trace gardée (rattrapage)
const TRI = /^[A-Z]{3}$/,
  MID = /^[A-Z]-\d{3}[A-Z]?$/,
  SEANCE = /^(A:(\d{4}-\d{2}-\d{2}|0)|S:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)$/;
/** Une heure d'un autre carnet est refusée au-delà de deux minutes dans le futur (horloges), et plus de douze heures avant la référence. */
export const FUTURE_MS = 2 * 60e3,
  BEFORE_MS = 12 * 3600e3;
const CREW_MAX = 12;

/** La valeur d'une clé PROPRE d'un objet (jamais une clé héritée : `__proto__`, `constructor`), sinon undefined. */
const own = (o, k) => o && typeof o === 'object' && !Array.isArray(o) && Object.hasOwn(o, k) ? o[k] : undefined;
/** Un instant en millisecondes d'un texte ISO borné, sinon null. */
const msOf = v => {
  const t = typeof v === 'string' && v.length <= 40 ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? t : null;
};
/** Le texte ISO d'un instant, '' sans instant. */
const isoOf = ms => Number.isFinite(ms) ? new Date(ms).toISOString() : '';
/** Un trigramme en majuscules, '' sinon. */
const triOf = v => {
  const s = typeof v === 'string' ? v.trim().toUpperCase() : '';
  return TRI.test(s) ? s : '';
};
/** Un identifiant de mission en majuscules, '' sinon. */
const midOf = v => {
  const s = typeof v === 'string' ? v.trim().toUpperCase() : '';
  return MID.test(s) ? s : '';
};
/** Un relevé de position gardé dans un carnet : { at, lat, lon, altFt, aglFt, onGround, gsKt } à PLEINE précision, relu borné par le
 *  service du cadre (fixOf de crossing.js : la porte d'un relevé venu d'un fichier) ; null s'il est illisible, ou à 0°, 0°. Un champ
 *  inconnu est absent. */
function fixOf(v) {
  const f = fixRead(v);
  if (!f || (f.lat === 0 && f.lon === 0)) return null;
  const out = {
    lat: f.lat,
    lon: f.lon
  };
  if (f.t !== null) out.at = isoOf(f.t);
  for (const k of ['altFt', 'aglFt', 'onGround', 'gsKt'])
    if (f[k] !== null && f[k] !== undefined) out[k] = f[k];
  return out;
}

/** Le chemin du carnet de ce pilote pour cette mission, ou null (voir l'en-tête). */
export function bookPath(trigram, missionId) {
  const t = triOf(trigram),
    m = midOf(missionId);
  return t && m ? `pilot/${t}/missions/${m}.json` : null;
}

/** Une ligne de tiroir d'un carnet, bornée ; null sans état ni heure lisibles. */
function entryOf(v) {
  const state = own(v, 'state'),
    at = msOf(own(v, 'at'));
  if ((state !== 'open' && state !== 'sealed') || at == null) return null;
  if (state === 'sealed') return {
    state,
    at
  };
  const how = HOWS.includes(own(v, 'how')) ? own(v, 'how') : 'hand',
    source = SOURCES.includes(own(v, 'source')) ? own(v, 'source') : '';
  return {
    state,
    at,
    how,
    from: fixOf(own(v, 'from')),
    to: fixOf(own(v, 'to')),
    source
  };
}

/** Le carnet relu borné (voir l'en-tête) ; null s'il n'est pas un carnet de cette mission. */
export function readBook(doc, missionId) {
  const id = midOf(missionId);
  if (!id || !doc || typeof doc !== 'object' || Array.isArray(doc) || midOf(own(doc, 'mission')) !== id) return null;
  const s = own(doc, 'seance'),
    drawers = {};
  for (const l of LETTERS) {
    const e = entryOf(own(doc, `drawer_${l}`));
    if (e) drawers[l] = e;
  }
  return {
    mission: id,
    seance: typeof s === 'string' && SEANCE.test(s) ? s : null,
    readAt: msOf(own(doc, 'read_at')),
    startAt: msOf(own(doc, 'start_at')),
    drawers
  };
}

/** La séance de ce pilote pour cette mission (voir l'en-tête). lines : les lignes de l'index des affectations, telles quelles. */
export function seanceOf({
  mission,
  me,
  lines,
  flight
} = {}) {
  const id = midOf(mission),
    tri = triOf(me),
    crew = [];
  let ref = null;
  for (const a of (Array.isArray(lines) ? lines : []).slice(0, 5000)) {
    if (!a || typeof a !== 'object' || midOf(own(a, 'mission')) !== id || !id) continue;
    if (own(a, 'status') === 'annulée' || own(a, 'role') === 'convoyage') continue; // le convoyeur ne joue pas la mission
    const p = triOf(own(a, 'pilot'));
    if (!p) continue;
    if (!crew.includes(p) && crew.length < CREW_MAX) crew.push(p);
    const t = msOf(own(a, 'takeoff'));
    if (t != null && (ref == null || t < ref)) ref = t;
  }
  if (tri && crew.includes(tri)) return {
    key: ref == null ? 'A:0' : `A:${isoOf(ref).slice(0, 10)}`,
    ref,
    crew,
    assigned: true
  };
  // jouée seul : la séance commence au départ du vol de cette mission
  const started = midOf(own(flight, 'mission')) === id && id ? msOf(own(own(flight, 'started'), 'at')) : null;
  return {
    key: started == null ? null : `S:${isoOf(started)}`,
    ref: started,
    crew: tri ? [tri] : [],
    assigned: false
  };
}

/** Le carnet s'il vaut pour cette séance, sinon null : un carnet sans séance (écrit avant le départ d'une mission jouée seul) vaut et sera
 *  rattaché ; un carnet d'une autre séance — ou d'une séance passée quand aucune n'est en cours — ne vaut pas : la mission se rejoue. */
export function bookFor(book, seance) {
  if (!book) return null;
  return !book.seance || book.seance === (seance?.key ?? null) ? book : null;
}

/** Pourquoi l'ouverture d'un AUTRE carnet n'est pas retenue ('' : elle l'est). Voir l'en-tête pour les codes. */
function checkOther(e, {
  pilot,
  me,
  book,
  seance,
  ref,
  now,
  key,
  crosses
}) {
  if (!pilot || pilot === me || !seance.crew.includes(pilot)) return 'stranger';
  if (!seance.key || book.seance !== seance.key) return 'seance';
  if (e.at > now + FUTURE_MS) return 'future';
  if (ref != null && e.at < ref - BEFORE_MS) return 'before';
  // un constat de zone sur un tiroir sans zone ; un constat sur une clé que ce fichier ne sait pas suivre (une cible qui franchit,
  // un objet mobile, une arrivée avec suivi) : l'écran dit qu'elle n'est pas jugée en vol, le constat d'un autre ne l'ouvre pas
  if (e.how !== 'hand' && (key?.kind !== e.how || !follows(key))) return 'key';
  // le constat est REJOUÉ sur le fichier de mission de celui qui lit, avec le même service et le même mot que celui qui l'a écrit
  if (e.how !== 'hand' && !(e.to && (typeof crosses === 'function' ? crosses({
      from: e.from,
      to: e.to
    }, key) : stands(e, key)))) return 'shape';
  return '';
}

/** Vrai si CE fichier sait juger cette clé avec une position en direct : une zone que le pilote franchit lui-même, un objet immobile,
 *  une arrivée sans suivi d'escorte. Le reste (cible qui franchit, objet mobile, suivi, condition de l'atelier) n'est pas jugé en vol. */
export function follows(key) {
  if (!key || typeof key !== 'object') return false;
  if (key.kind === 'zone') return !key.actor;
  if (key.kind === 'object') return !!key.object && !key.object.moving;
  if (key.kind === 'arrival') return !(key.escortMinSec > 0);
  return false;
}

/** Les relevés d'une trace gardée ({ from: ISO du départ, trail: [[lat, lon, altFt, s, aglFt?, ground?]…] }, frame/lib/trail.js) depuis
 *  cet instant, à la forme d'un relevé ; [] si la trace est illisible. Deux mille points au plus. */
function trailFixes(trail, startMs) {
  const t0 = msOf(own(trail, 'from')),
    pts = own(trail, 'trail');
  if (t0 === null || !Array.isArray(pts)) return [];
  const out = [];
  for (const q of pts.slice(-2000)) {
    if (!Array.isArray(q) || !Number.isFinite(q[3])) continue;
    const t = t0 + q[3] * 1000;
    if (Number.isFinite(startMs) && t < startMs) continue;
    const f = fixOf({
      t,
      lat: q[0],
      lon: q[1],
      altFt: q[2],
      aglFt: q[4],
      onGround: q[5] === 1 ? true : q[5] === 0 ? false : null
    });
    if (f) out.push(f);
  }
  return out;
}

/** Les escales requises d'une arrivée sont-elles faites ? Chacune (douze au plus) doit avoir été approchée — à moins du rayon de
 *  l'arrivée — sur la trace gardée, ou sur ce trajet. Sans escale requise : vrai. */
function stopsDone(key, prev, next, trail) {
  const req = (Array.isArray(key.required) ? key.required : []).slice(0, 12);
  if (!req.length) return true;
  const fixes = [...trailFixes(trail, null), ...(prev ? [prev] : []), next];
  return req.every(q => fixes.some((f, i) => reach(i ? fixes[i - 1] : null, f, {
    lat: q?.lat,
    lon: q?.lon,
    rangeNm: key.radiusNm,
    heightFt: null
  }).ok === true));
}

/** Le CONSTAT de ce trajet (prev → next, deux relevés ; prev null : le relevé seul) pour cette clé, ou null : { how, at, from, to,
 *  confirm } — zone : le trajet touche la zone (le mot « touched » du service : entré, dedans, traversé) ; objet : le trajet passe à
 *  portée (confirm : vrai quand le pilote doit encore déclarer « Objet en vue ») ; arrivée : posé au terrain, escales requises faites
 *  (trail : la trace gardée). Une donnée qui manque ne satisfait jamais une clé. */
export function finding(key, prev, next, {
  trail
} = {}) {
  if (!follows(key)) return null;
  const b = fixOf(next),
    a = prev ? fixOf(prev) : null;
  if (!b) return null;
  const t = b.at ? Date.parse(b.at) : null,
    leg = (how, at, more = {}) => ({
      how,
      at: Number.isFinite(at) ? at : t,
      from: a || b,
      to: b,
      ...more
    });
  if (key.kind === 'zone') {
    const r = crossed(a, b, key);
    return r.touched === true ? leg('zone', r.at) : null;
  }
  if (key.kind === 'object') {
    const r = reach(a, b, key.object);
    return r.ok === true ? leg('object', r.at, {
      confirm: key.object.confirm !== false
    }) : null;
  }
  return arrived(b, key).ok === true && stopsDone(key, a, b, trail) ? leg('arrival', t) : null;
}

/** Le constat d'un carnet tient-il sur CETTE clé (le fichier de mission de celui qui lit) ? Rejoué par le même service : la zone
 *  touchée par le trajet, l'objet à portée, l'arrivée posée au dernier relevé. */
export function stands(e, key) {
  if (!e || !e.to || !key || key.kind !== e.how) return false;
  // les deux relevés d'un constat ne font un trajet que s'ils sont à une minute au plus l'un de l'autre (la règle de l'écriture) :
  // sinon un « from » lointain tracerait une corde à travers la forme — le dernier relevé est alors jugé seul
  const same = !e.from || (e.from.lat === e.to.lat && e.from.lon === e.to.lon && e.from.at === e.to.at),
    gap = Math.abs(Date.parse(e.to.at) - Date.parse(e.from?.at)),
    prev = same || !(gap <= LEG_MS) ? null : e.from;
  if (e.how === 'zone') return crossed(prev, e.to, key).touched === true;
  if (e.how === 'object') return !!key.object && reach(prev, e.to, key.object).ok === true;
  if (e.how === 'arrival') return arrived(e.to, key).ok === true;
  return false;
}

/** Le rattrapage : le premier constat de cette clé sur la trace gardée depuis `since` (l'instant où ce tiroir est devenu le premier
 *  fermé ; null : toute la trace), ou null. La trace garde un point par mille marin : un trajet plus grossier que les relevés. Un
 *  objet qui veut « Objet en vue » n'est jamais rattrapé (il faut le geste, à portée). */
export function catchUp(key, trail, since = null) {
  if (!follows(key)) return null;
  const fixes = trailFixes(trail, since);
  for (let i = 0; i < fixes.length; i++) {
    const f = finding(key, i ? fixes[i - 1] : null, fixes[i], {
      trail
    });
    if (f && !f.confirm) return {
      ...f,
      source: 'trail'
    };
  }
  return null;
}

/** Les minutes estimées jusqu'à un lieu, d'après la fonction donnée (un nombre, ou { min }) ; 0 pour le départ ; null si inconnues. */
function minutesTo(passage, point) {
  if (!point || point === 'ORIGIN' || point === 'DEPART') return 0;
  const r = typeof passage === 'function' ? passage(point) : null,
    m = typeof r === 'number' ? r : r && typeof r === 'object' ? r.min : null;
  return typeof m === 'number' && Number.isFinite(m) && m >= 0 && m <= 48 * 60 ? m : null;
}

/** L'état de chaque tiroir pour ce pilote à cet instant (voir l'en-tête). */
export function stateOf(drawers, {
  me,
  seance,
  book,
  others,
  seen,
  now = Date.now(),
  passage,
  crosses
} = {}) {
  const tri = triOf(me),
    sc = seance && typeof seance === 'object' ? seance : {
      key: null,
      ref: null,
      crew: []
    },
    mine = bookFor(book, sc),
    peers = (Array.isArray(others) ? others : []).slice(0, CREW_MAX).map(o => ({
      pilot: triOf(o?.pilot),
      book: o?.book || null
    })).filter(o => o.book);
  // la référence d'heure : le départ RÉEL le plus ancien dit par un carnet de la séance, sinon l'heure prévue
  let ref = sc.ref ?? null,
    real = sc.assigned === false && sc.ref != null; // jouée seul : la référence EST le départ du vol
  const starts = [mine?.startAt, ...peers.filter(o => o.pilot !== tri && sc.crew.includes(o.pilot) && sc.key && o.book.seance === sc.key)
    .map(o => o.book.startAt)
  ].filter(t => t != null && t <= now + FUTURE_MS && (sc.ref == null || Math.abs(t - sc.ref) <= BEFORE_MS));
  if (starts.length) {
    ref = Math.min(...starts);
    real = true;
  }
  const seenOf = seen && typeof seen === 'object' ? seen : {},
    done = new Set(),
    out = [];
  // l'ORDRE (voir l'en-tête) : le tiroir d'avant (son identifiant, l'heure de son ouverture) ; un tiroir d'avant encore fermé verrouille
  let prev = null,
    prevAt = -Infinity,
    locked = false;
  for (const d of (Array.isArray(drawers) ? drawers : [])) {
    const id = d?.id;
    if (!LETTERS.includes(id) || done.has(id) || done.size >= LETTERS.length) continue;
    done.add(id);
    const key = d.key && typeof d.key === 'object' ? d.key : {
        kind: 'hand'
      },
      refused = [],
      hands = [], // les autres pilotes qui l'ont ouvert à la main, pour eux seuls
      found = []; // les ouvertures retenues : { how, at, by, gone? }
    // l'heure, ou l'heure de repli : calculées de la référence
    let dueAt = null,
      estimated = false;
    if (key.kind === 'time') {
      const m = minutesTo(passage, key.point),
        delay = Number.isFinite(key.delayMin) ? Math.min(1440, Math.max(0, key.delayMin)) : 0;
      if (ref != null && m != null) dueAt = ref + (m + delay) * 60e3;
      estimated = !real || m !== 0; // un départ prévu, ou un passage estimé sur la route prévue : « heure estimée »
    } else if (Number.isFinite(key.fallbackMin) && ref != null) {
      // toute clé sauf l'heure a son repli (docs/technique/FORMAT_MISSION.md § 4) : zone, objet, celles que ce fichier ne sait pas encore
      // juger (« arrivée », cible mobile), et le geste seul que le lecteur rend quand il ne lit pas la condition écrite par l'auteur
      dueAt = ref + Math.min(1440, Math.max(0, key.fallbackMin)) * 60e3;
      estimated = !real;
    }
    const my = mine?.drawers?.[id] || null,
      sealed = my?.state === 'sealed';
    if (!sealed && dueAt != null && now >= dueAt) found.push({
      how: key.kind === 'time' ? 'time' : 'fallback',
      at: dueAt,
      by: null
    });
    if (my?.state === 'open') found.push({
      how: my.how,
      at: my.at,
      by: tri || null
    });
    // les carnets des autres : une entrée non fiable
    const said = new Set();
    for (const o of peers) {
      const e = o.book.drawers?.[id];
      if (!e || e.state !== 'open') continue;
      const why = checkOther(e, {
        pilot: o.pilot,
        me: tri,
        book: o.book,
        seance: sc,
        ref,
        now,
        key,
        crosses
      });
      if (why) refused.push({
        by: o.pilot,
        why
      });
      else if (!SHARED.includes(e.how)) hands.push({
        by: o.pilot,
        at: e.at
      });
      else {
        said.add(o.pilot);
        found.push({
          how: e.how,
          at: e.at,
          by: o.pilot
        });
      }
    }
    // ce que l'appareil a déjà vu ouvert par un autre : un tiroir ouvert le reste, même retiré du carnet de son auteur
    const s = own(seenOf, id);
    if (s && s.by && s.by !== tri && !said.has(s.by)) found.push({
      how: s.how,
      at: s.at,
      by: s.by,
      gone: true
    });
    found.sort((a, b) => a.at - b.at);
    // l'ordre : rien n'ouvre ce tiroir tant qu'un tiroir d'avant est fermé ; ce qui était arrivé joue à l'ouverture de celui d'avant
    const first = found[0] || null,
      w = first && !locked ? {
        ...first,
        srcAt: first.at,
        at: Math.max(first.at, prevAt)
      } : null,
      // le constat d'un autre le plus ancien, retenu même sous verrou : l'appareil le garde (seenAfter), il jouera à son tour
      other = found.find(c => c.by && c.by !== tri) || null,
      got = own(seenOf, id);
    out.push({
      id,
      title: typeof d.title === 'string' ? d.title : '',
      key,
      open: !!w,
      how: w ? w.how : null,
      at: w ? w.at : null,
      srcAt: w ? w.srcAt : null,
      by: w ? w.by : null,
      mine: !!w && !!tri && w.by === tri,
      dueAt,
      estimated: dueAt != null && estimated,
      locked: locked && !w,
      after: locked ? prev : null,
      since: !locked && Number.isFinite(prevAt) ? prevAt : null, // depuis quand il est le premier fermé (l'ouverture de celui d'avant)
      sealed: sealed && !w && !locked,
      gone: !!w?.gone,
      gotAt: w && w.by && w.by !== tri && got && got.by === w.by && Number.isFinite(got.got) ? got.got : null,
      other: other ? {
        by: other.by,
        at: other.at,
        how: other.how
      } : null,
      hands,
      refused
    });
    prev = id;
    if (w) prevAt = w.at;
    else locked = true;
  }
  return out;
}

/** Ce que l'appareil a vu ouvert par d'autres, relu borné : { B: { by, at, how } } ; {} pour une autre séance ou un document illisible. */
export function readSeen(doc, seance) {
  const out = {};
  if (!seance?.key || own(doc, 'seance') !== seance.key) return out;
  const src = own(doc, 'drawers');
  for (const l of LETTERS) {
    const v = own(src, l),
      by = triOf(own(v, 'by')),
      at = msOf(own(v, 'at')),
      how = own(v, 'how');
    if (by && at != null && SHARED.includes(how)) out[l] = {
      by,
      at,
      how,
      got: msOf(own(v, 'got')) // l'heure à laquelle cet appareil l'a reçue (« reçu ici à … ») ; null pour un « vu » d'avant
    };
  }
  return out;
}

/** Le document « vu » à garder sur l'appareil après un calcul : la plus ancienne ouverture d'un AUTRE par tiroir ; null sans séance. */
export function seenAfter(seen, states, seance, now = Date.now()) {
  if (!seance?.key) return null;
  const drawers = {};
  for (const l of LETTERS) {
    const old = own(seen, l),
      s = (Array.isArray(states) ? states : []).find(x => x.id === l),
      cur = s?.other && SHARED.includes(s.other.how) ? s.other : null,
      keep = old && cur ? (cur.at < old.at ? cur : old) : old || cur;
    if (keep) drawers[l] = {
      by: keep.by,
      at: isoOf(keep.at),
      how: keep.how,
      // reçue ici : la première fois que l'appareil l'a vue (gardée ensuite, même si l'ouverture retenue devient plus ancienne)
      got: isoOf(old && Number.isFinite(old.got) ? old.got : now)
    };
  }
  return {
    schema: 1,
    seance: seance.key,
    drawers
  };
}

/** Le document « ouverts » vaut un jour après son écriture (il est récrit à chaque calcul de la section) : au-delà, la Carte ne tient
 *  plus aucun tiroir pour ouvert tant que la fiche de la mission n'a pas été rouverte. */
export const OPEN_MS = 24 * 3600e3;

/** Le chemin du document « ouverts » de cette mission sur l'appareil, ou null (jamais un chemin pris tel quel). */
export function openPath(missionId) {
  const m = midOf(missionId);
  return m ? `cache/missions/open_${m}.json` : null;
}

/** Le document « ouverts » à garder sur l'appareil après un calcul (voir l'en-tête) : les lettres des tiroirs ouverts de MA mission,
 *  dans l'ordre du lecteur ; une mission qui n'est pas la mienne n'en a aucune. null sans identifiant de mission ni instant. */
export function openAfter(states, {
  mission,
  mine,
  seance
} = {}, now = Date.now()) {
  const id = midOf(mission);
  if (!id || !Number.isFinite(now)) return null;
  const is = mine === true,
    open = new Set(is ? (Array.isArray(states) ? states : []).filter(s => s && s.open === true).map(s => s.id) : []),
    key = own(seance, 'key');
  return {
    schema: 1,
    mission: id,
    mine: is,
    seance: is && typeof key === 'string' && SEANCE.test(key) ? key : null,
    opened: LETTERS.filter(l => open.has(l)),
    at: isoOf(now)
  };
}

/** Le document « ouverts » relu borné (voir l'en-tête) → { mine, opened, seance, at } ; fermé à l'échec. Ne lève jamais. */
export function readOpen(doc, missionId, options = null) {
  const none = {
      mine: false,
      opened: [],
      seance: null,
      at: null
    },
    o = options && typeof options === 'object' && !Array.isArray(options) ? options : {},
    now = own(o, 'now') === undefined ? Date.now() : own(o, 'now'),
    id = midOf(missionId),
    at = msOf(own(doc, 'at')),
    s = own(doc, 'seance'),
    key = typeof s === 'string' && SEANCE.test(s) ? s : null;
  if (!id || own(doc, 'schema') !== 1 || midOf(own(doc, 'mission')) !== id || own(doc, 'mine') !== true || at == null) return none;
  if (typeof now !== 'number' || !Number.isFinite(now) || at > now + FUTURE_MS || at < now - OPEN_MS) return none;
  // la séance, quand celui qui lit la connaît (null : aucune séance en cours) : un document d'une autre séance ne vaut pas
  if (Object.hasOwn(o, 'seance') && o.seance !== undefined && (o.seance ?? null) !== key) return none;
  const list = own(doc, 'opened'),
    got = new Set((Array.isArray(list) ? list.slice(0, 64) : []).filter(x => typeof x === 'string'));
  return {
    mine: true,
    opened: LETTERS.filter(l => got.has(l)),
    seance: key,
    at
  };
}

/** Le carnet de départ d'une écriture : celui qui est là s'il vaut pour la séance, sinon un carnet neuf ; null sans identifiants. */
function baseOf(doc, ctx) {
  const id = midOf(ctx?.mission),
    tri = triOf(ctx?.me);
  if (!id || !tri) return null;
  const key = ctx.seance?.key || null,
    b = bookFor(readBook(doc, id), ctx.seance) || {
      mission: id,
      seance: null,
      readAt: null,
      startAt: null,
      drawers: {}
    };
  return {
    ...b,
    seance: key || b.seance,
    drawers: {
      ...b.drawers
    },
    by: tri
  };
}

/** Le document à écrire d'un carnet : une clé de premier niveau par tiroir (la fusion du cadre réunit deux appareils du même pilote). */
function docOf(b, now) {
  const out = {
    schema: 1,
    mission: b.mission,
    seance: b.seance,
    read_at: isoOf(b.readAt) || null,
    start_at: isoOf(b.startAt) || null
  };
  for (const l of LETTERS) {
    const e = b.drawers[l];
    if (!e) continue;
    out[`drawer_${l}`] = e.state === 'sealed' ? {
      state: 'sealed',
      at: isoOf(e.at)
    } : {
      state: 'open',
      at: isoOf(e.at),
      how: e.how,
      ...(e.from && e.to ? {
        from: e.from,
        to: e.to
      } : {}),
      ...(e.source ? {
        source: e.source
      } : {})
    };
  }
  out.updated_at = isoOf(now);
  out.by = b.by;
  return out;
}

/** Le carnet avec ce tiroir ouvert par ce pilote (how : 'hand', 'zone', 'object' ; fix : { from, to, source } d'un constat). Un tiroir
 *  déjà ouvert par lui garde sa première ouverture. */
export function withOpen(doc, ctx, id, how = 'hand', fix = null) {
  const b = baseOf(doc, ctx);
  if (!b || !LETTERS.includes(id) || !HOWS.includes(how)) return null;
  const now = Number.isFinite(ctx.now) ? ctx.now : Date.now();
  // l'heure d'un constat est celle du fait (le franchissement), jamais dans le futur ; celle d'un geste, l'instant du geste
  const at = how !== 'hand' && Number.isFinite(fix?.at) ? Math.min(fix.at, now) : now;
  if (b.drawers[id]?.state !== 'open') b.drawers[id] = {
    state: 'open',
    at,
    how,
    from: fixOf(fix?.from),
    to: fixOf(fix?.to),
    source: SOURCES.includes(fix?.source) ? fix.source : ''
  };
  return docOf(b, now);
}

/** Le carnet avec ce tiroir rescellé par ce pilote (outil d'auteur, niveau Complet) : son ouverture et l'heure ne l'ouvrent plus pour
 *  lui ; l'ouverture d'un autre le garde ouvert. */
export function withSeal(doc, ctx, id) {
  const b = baseOf(doc, ctx);
  if (!b || !LETTERS.includes(id)) return null;
  const now = Number.isFinite(ctx.now) ? ctx.now : Date.now();
  b.drawers[id] = {
    state: 'sealed',
    at: now
  };
  return docOf(b, now);
}

/** Le carnet avec la mission lue (« Ouvrir » de l'enveloppe) : la première lecture est gardée. */
export function withRead(doc, ctx) {
  const b = baseOf(doc, ctx);
  if (!b) return null;
  const now = Number.isFinite(ctx.now) ? ctx.now : Date.now();
  if (b.readAt == null) b.readAt = now;
  return docOf(b, now);
}

/** Le carnet avec le départ réel du vol de cette mission (started.at) : la référence d'heure de la séance. */
export function withStart(doc, ctx, startAt) {
  const b = baseOf(doc, ctx),
    t = typeof startAt === 'number' ? startAt : msOf(startAt);
  if (!b || t == null) return null;
  b.startAt = t;
  return docOf(b, Number.isFinite(ctx.now) ? ctx.now : Date.now());
}
