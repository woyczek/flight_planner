// V3 missions — les tiroirs d'une mission chez le pilote (SOG-0441, lot T1) : le calcul pur. Ni page, ni stockage, ni réseau.
//
// Un tiroir (B, C, D : les « phases » d'un fichier de mission, lues et bornées par frame/lib/mission.js — `drawers`, chacun
// { id, title, message, brief, key, route }) est fermé tant que sa clé n'a pas joué. Ce fichier dit, pour UN pilote à UN instant, l'état
// de chaque tiroir, d'après :
//   · l'heure (clé `time`) et l'heure de repli (clés `zone` et `object`, `key.fallbackMin`) : CALCULÉES, jamais écrites ;
//   · les CARNETS : un par pilote et par mission, `pilot/<TRI>/missions/<ID>.json` — chacun n'écrit que le sien (aucun conflit
//     d'écriture) ; seuls les gestes (« Ouvrir le tiroir ») et les constats (zone franchie, objet trouvé) s'y écrivent.
// « Ouvert pour tous » (décision de l'utilisateur, 17/11/2026, Q-0087) se CALCULE : un tiroir est ouvert dès que le carnet d'UN pilote
// de la mission dit un CONSTAT (zone franchie, objet trouvé). Le GESTE « Ouvrir le tiroir » n'ouvre que pour celui qui le fait (sur tous
// ses appareils) : les autres le lisent (`hands` : « BBB l'a ouvert à la main ») et gardent leur tiroir fermé — en attendant la réponse
// de l'utilisateur à Q-0094 (une ligne à changer : SHARED). Le carnet d'un autre est une entrée NON FIABLE (tout pilote écrit dans le dépôt) : il est relu borné, son
// ouverture n'est retenue que si elle tient debout (checkOther), et une ouverture refusée est DITE avec son auteur. Un tiroir ouvert
// le reste : l'appareil garde les ouvertures des autres qu'il a vues (`seen`, sur l'appareil seul) ; si l'un d'eux la retire de son
// carnet, le tiroir reste ouvert ici et l'écran le dit (`gone`).
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
//       sealed (rescellé par ce pilote, et personne d'autre ne l'a ouvert), gone (l'ouverture retenue n'est plus dans le carnet de son
//       auteur), hands: [{ by, at }] (les autres pilotes de la mission qui l'ont ouvert à la main, pour eux seuls), refused: [{ by, why }]
//       (les ouvertures d'autres carnets non retenues : 'stranger', 'seance', 'future', 'before', 'key', 'shape') }.
//     others : [{ pilot, book }] (les carnets des autres, déjà passés par readBook) ; seen : readSeen(…) ; passage(pointId) → minutes
//     estimées du départ à ce lieu (un nombre, ou { min }), null si inconnu ; crosses({ from, to }, key) → vrai si ce trajet coupe la
//     forme de la clé (le service du cadre, plus tard : sans lui, une ouverture « zone » d'un autre n'est jugée que sur le reste).
//   seenAfter(seen, states, seance) → ce que l'appareil garde après ce calcul ; readSeen(doc, seance) → { B: { by, at, how } } borné.
//   withOpen(doc, ctx, id, how, fix?), withSeal(doc, ctx, id), withRead(doc, ctx), withStart(doc, ctx, startAt) → le carnet à écrire
//     (ctx : { mission, me, seance, now }) ; null si rien n'est à écrire (identifiants refusés).

export const LETTERS = ['B', 'C', 'D'];
/** Ce qui s'écrit dans un carnet : un geste ou un constat. L'heure et l'heure de repli se calculent. */
export const HOWS = ['hand', 'zone', 'object'];
/** Les ouvertures d'un AUTRE carnet qui ouvrent le tiroir ici : les constats. Le geste d'un autre n'ouvre que pour lui (décision de
 *  l'ergonome du 17/11 en attendant Q-0094 : « pour tous ou pour soi ? ») — pour l'ouvrir à tous, ajouter 'hand' ici, rien d'autre. */
export const SHARED = ['zone', 'object'];
const SOURCES = ['xplane', 'lnm', 'gps', 'ivao', 'vatsim'];
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
/** Une position [lat, lon, altFt | null] bornée (jamais 0°, 0°), sinon null. */
function fixOf(v) {
  if (!Array.isArray(v) || v.length < 2 || v.length > 3) return null;
  const [lat, lon, alt] = v;
  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || lon < -180 || lon > 180 || (lat === 0 && lon === 0)) return null;
  const a = typeof alt === 'number' && Number.isFinite(alt) && alt >= -2000 && alt <= 100000 ? Math.round(alt) : null;
  return [Math.round(lat * 1e5) / 1e5, Math.round(lon * 1e5) / 1e5, a];
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
  if (e.how !== 'hand' && key?.kind !== e.how) return 'key'; // un constat de zone sur un tiroir sans zone
  if (e.how !== 'hand' && typeof crosses === 'function' && !(e.from && e.to && crosses({
      from: e.from,
      to: e.to
    }, key))) return 'shape';
  return '';
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
    } else if ((key.kind === 'zone' || key.kind === 'object') && Number.isFinite(key.fallbackMin) && ref != null) {
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
    const w = found[0] || null;
    out.push({
      id,
      title: typeof d.title === 'string' ? d.title : '',
      key,
      open: !!w,
      how: w ? w.how : null,
      at: w ? w.at : null,
      by: w ? w.by : null,
      mine: !!w && !!tri && w.by === tri,
      dueAt,
      estimated: dueAt != null && estimated,
      sealed: sealed && !w,
      gone: !!w?.gone,
      hands,
      refused
    });
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
      how
    };
  }
  return out;
}

/** Le document « vu » à garder sur l'appareil après un calcul : la plus ancienne ouverture d'un AUTRE par tiroir ; null sans séance. */
export function seenAfter(seen, states, seance) {
  if (!seance?.key) return null;
  const drawers = {};
  for (const l of LETTERS) {
    const old = own(seen, l),
      s = (Array.isArray(states) ? states : []).find(x => x.id === l),
      cur = s && s.open && s.by && !s.mine && SHARED.includes(s.how) ? {
        by: s.by,
        at: s.at,
        how: s.how
      } : null,
      keep = old && cur ? (cur.at < old.at ? cur : old) : old || cur;
    if (keep) drawers[l] = {
      by: keep.by,
      at: isoOf(keep.at),
      how: keep.how
    };
  }
  return {
    schema: 1,
    seance: seance.key,
    drawers
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
  if (b.drawers[id]?.state !== 'open') b.drawers[id] = {
    state: 'open',
    at: now,
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
