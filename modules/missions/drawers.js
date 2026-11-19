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
//     d'écriture) ; seuls les gestes (« Demander la suite », SOG-0459) et les constats (zone franchie, objet trouvé, arrivée posée — avec les
//     DEUX relevés du trajet, à pleine précision, pour qu'un autre appareil rejoue le constat) s'y écrivent.
// « Ouvert pour tous » (décision de l'utilisateur, 17/11/2026, Q-0087) se CALCULE : un tiroir est ouvert dès que le carnet d'UN pilote
// de la mission dit un CONSTAT (zone franchie, objet trouvé). Le GESTE « Demander la suite » (SOG-0459) n'ouvre que pour celui qui le
// fait (sur tous ses appareils) : les autres gardent leur tiroir fermé et n'en lisent rien à l'écran (`hands` reste calculé) — réponse
// de l'utilisateur à Q-0094, 18/11 (une ligne à changer : SHARED). Le carnet d'un autre est une entrée NON FIABLE (tout pilote écrit dans le dépôt) : il est relu borné, son
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
// LES TOLÉRANCES DE L'UTILISATEUR (SOG-0507, l'utilisateur, 19/11/2026) REMPLACENT le rayon du fichier de mission là où il les a posées :
//   · une escale requise d'une arrivée : TRANSIT_NM = 2 NM (stopsDone) ; · une arrivée posée sur un terrain : AD_NM = 1 NM (finding, stands,
//   catchUp), la vitesse et le sol restant les règles de la clé ; · un posé de PRÉCISION (condition « atterrissage » de l'atelier, et ses
//   étapes d'une suite) sur un point géographique : des PALIERS de distance au point visé (PRECISION, TIERS, tierOf, landTier : DÉPLACÉS dans frame/lib/precision.js, SOG-0516, et réexportés ici : excellent ≤ 0,05 NM,
//   parfait ≤ 0,1, réussi ≤ 0,2, partiel ≤ 0,5 ; au-delà, manqué — « posé » dès le dernier palier) ; quand le point visé est un terrain de
//   la route (ORIGIN, DESTINATION), la tolérance du terrain, sans palier. Le stationnaire, le survol, l'objet et la zone gardent le rayon de
//   l'auteur. Le constat d'un posé de précision porte `tier` et `distNm` (relevé `to`, millième de NM) ; chez le lecteur le palier est
//   RECALCULÉ de ce relevé (replayTier, `state.tier`, `state.distNm`), jamais celui qu'un autre a écrit. Dans le carnet, withOpen écrit
//   `tier` et `distNm`, relus bornés (un palier hors TIERS, une distance hors de 0 à 0,5 : ignorés).
//
// API :
//   bookPath(trigram, missionId) → 'pilot/<TRI>/missions/<ID>.json', ou null (jamais un chemin pris tel quel).
//   readBook(doc, missionId) → le carnet relu borné { mission, seance, readAt, startAt, drawers: { B: { state, at, how, from, to, source } } }
//     (heures en millisecondes), ou null (illisible, ou d'une autre mission).
//   seanceOf({ mission, me, lines, flight }) → { key, ref, crew, assigned } : la séance de ce pilote (voir plus haut) ; ref : l'heure de
//     référence prévue en millisecondes (le décollage affecté, ou le départ du vol), ou null.
//   bookFor(book, seance) → le carnet s'il est de cette séance, sinon null.
//   stateOf(drawers, { me, seance, book, others, seen, now, passage, crosses }) → un état par tiroir :
//     { id, title, key, open, how ('time' | 'fallback' | 'hand' | 'zone' | 'object' | 'arrival' | 'landing' | 'overflight' | 'hover' | null), at, by (trigramme ; null pour une heure),
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
//     lands : [{ at, tier, distNm, by, mine }] (SOG-0516, lot B) les posés de précision JUGÉS de ce tiroir ouvert — les miens et ceux des équipiers, le
//       palier RECALCULÉ chez le lecteur, une preuve qui ne tient pas sur sa clé (stands) absente ; [] sinon.
//   debriefOf(states) → [{ title, how: 'landing', tier, distNm, at, by, mine }] : le débrief de la mission, une ligne par posé de précision jugé (voir plus bas).
//   follows(key) → vrai si la clé se juge avec une position en direct ; finding(key, prev, next, { trail }) → le constat d'un trajet,
//     ou null (jamais pour une tenue — atterrissage, stationnaire : holding(key, hold, fix) → { hold, f }, SOG-0500, tient l'état d'une tenue posée) ; stands(entry, key) → le constat d'un carnet tient-il sur cette clé ; catchUp(key, trail, since) → le constat retrouvé sur
//     la trace gardée (le rattrapage au retour de la page). Un SURVOL (SOG-0500, lot 2) se juge sans état : finding rend le constat
//     { how: 'overflight', confirm } du trajet (au rayon du point, dans la bande de hauteur SOL aux deux relevés). Un STATIONNAIRE
//     (SOG-0500, lot 4) est une TENUE comme l'atterrissage : holding(key, hold, fix) la tient (isHold(key) dit si une clé s'y juge) ; un
//     relevé tient quand il est au rayon, sous la tolérance de vitesse, EN L'AIR (onGround faux) et dans la bande de hauteur SOL.
//     Une SUITE D'ÉTAPES (SOG-0500, lot 5 : `{ kind: 'condition', condition: 'sequence', steps: [règle…] }`, une à dix étapes, chacune un
//     atterrissage, un survol sans confirmation ou un stationnaire) garde un état { i, hold, proofs } : stepping(key, state, prev, fix) →
//     { state, f } juge l'étape en cours par les fonctions des conditions seules (stepKey : une étape est une clé), dans l'ordre ; f : le
//     constat { how: 'sequence', at, from, to, steps: [{ how, from, to, at }…] } quand la dernière étape est faite. judgeKind(key) →
//     'hold' | 'steps' | 'leg' : par quoi la vue juge cette clé (holding, stepping, finding).
//   asked(states, { inRange }) → { id, how: 'hand' | 'object' | 'overflight' } ou null (SOG-0459) : le tiroir qu'ouvre le geste neutre
//     « Demander la suite » — le premier fermé, si sa clé est le geste, ou un objet (ou un survol à confirmer) que l'appareil suit et
//     a à portée (`inRange` : son identifiant).
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
  DRAWER_IDS,
  REFILL_RULE
} from '../../frame/lib/mission.js'; // la liste fermée du lecteur (B à M) : une seule liste, jamais recopiée
import {
  own
} from '../../frame/lib/untrusted.js'; // la valeur d'une clé PROPRE d'un objet, jamais une clé héritée (K479, SOG-0468 c : écrite une fois)
import {
  crossed,
  reach,
  arrived,
  fixOf as fixCross
} from '../../frame/lib/crossing.js'; // le service de franchissement du cadre (SOG-0447) : le MÊME jugement en vol et au rejeu d'un constat
import {
  PRECISION,
  TIERS,
  tierOf,
  AD_NM,
  FIX_PERIOD_SEC,
  msOf,
  isoOf,
  fixOf,
  spotOf,
  landRule,
  landTier
} from '../../frame/lib/precision.js'; // SOG-0516 : les paliers d'un posé de précision et leurs petites lectures, DÉPLACÉS dans le cadre (le compte rendu les lit aussi)
// l'API de ce fichier reste la même : ce que le cadre porte maintenant est réexporté tel quel
export {
  PRECISION,
  TIERS,
  tierOf,
  AD_NM,
  FIX_PERIOD_SEC,
  msOf
};

/** Les identifiants de tiroir : ceux du lecteur de mission (un tiroir lu a toujours sa place dans le carnet). */
export const LETTERS = [...DRAWER_IDS];
/** Ce qui s'écrit dans un carnet : un geste ou un constat. L'heure et l'heure de repli se calculent. */
export const HOWS = ['hand', 'zone', 'object', 'arrival', 'landing', 'overflight', 'hover', 'refill', 'sequence'];
/** Les ouvertures d'un AUTRE carnet qui ouvrent le tiroir ici : les constats. Le geste d'un autre n'ouvre que pour lui (décision de
 *  l'ergonome du 17/11 en attendant Q-0094 : « pour tous ou pour soi ? ») — pour l'ouvrir à tous, ajouter 'hand' ici, rien d'autre. */
export const SHARED = ['zone', 'object', 'arrival', 'landing', 'overflight', 'hover', 'refill', 'sequence'];
export const LEG_MS = 60e3; // deux relevés font un trajet s'ils sont à une minute au plus l'un de l'autre (à l'écriture comme au rejeu)
const SOURCES = ['xplane', 'lnm', 'gps', 'ivao', 'vatsim', 'trail']; // trail : constat retrouvé sur la trace gardée (rattrapage)
const TRI = /^[A-Z]{3}$/,
  MID = /^[A-Z]-\d{3}[A-Z]?$/,
  SEANCE = /^(A:(\d{4}-\d{2}-\d{2}|0)|S:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)$/;
/** Une heure d'un autre carnet est refusée au-delà de deux minutes dans le futur (horloges), et plus de douze heures avant la référence. */
export const FUTURE_MS = 2 * 60e3,
  BEFORE_MS = 12 * 3600e3;
const CREW_MAX = 12;

// LES TOLÉRANCES DE L'UTILISATEUR (SOG-0507, l'utilisateur, 19/11/2026) : ces chiffres PRIMENT sur le rayon écrit dans le fichier de
// mission, là où l'utilisateur les a posés — ses mots, via le relais : « toujours valable à 2 nm », « forcément… ± 1 nm ».
/** Une escale requise d'une arrivée (`key.required`) est passée à cette distance, en milles marins, et non au rayon de l'arrivée. */
export const TRANSIT_NM = 2;
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
/** Le chemin du carnet de ce pilote pour cette mission, ou null (voir l'en-tête). */
export function bookPath(trigram, missionId) {
  const t = triOf(trigram),
    m = midOf(missionId);
  return t && m ? `pilot/${t}/missions/${m}.json` : null;
}

/** Le palier d'un constat relu : un des TIERS, sinon null (une valeur hors liste est ignorée). */
const tierRead = v => {
  const t = own(v, 'tier');
  return typeof t === 'string' && TIERS.includes(t) ? t : null;
};
/** La distance au point visé d'un constat relu : un nombre fini de 0 au dernier palier compris, sinon null (hors bornes : ignorée). */
const distRead = v => {
  const d = own(v, 'distNm');
  return typeof d === 'number' && Number.isFinite(d) && d >= 0 && d <= PRECISION[PRECISION.length - 1].nm ? d : null;
};

/** Un relevé de ravitaillement relu borné : fixOf (precision.js) et, en plus, le cap vrai (`headingDeg`, 0 à 360) que fixOf ne garde pas ;
 *  null s'il est illisible. Le cap inconnu est absent (jamais 0). */
function fixHd(v) {
  const f = fixOf(v),
    h = f ? fixCross(v)?.headingDeg : null;
  return f && Number.isFinite(h) ? {
    ...f,
    headingDeg: h
  } : f;
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
    source = SOURCES.includes(own(v, 'source')) ? own(v, 'source') : '',
    raw = own(v, 'steps'),
    steps = raw === undefined ? null : proofsOf(raw);
  // une suite d'étapes (lot 5) : de 1 à 10 constats, chacun lu borné ; un tableau trop long ou illisible, ou une suite sans étapes, rend
  // le constat illisible. Un constat sans `steps` se lit comme avant.
  if ((raw !== undefined && !steps) || (how === 'sequence' && !steps)) return null;
  const rd = how === 'refill' ? fixHd :
    fixOf, // un ravitaillement garde le cap de ses relevés, et porte `last` et `off` (le départ, SOG-0521)
    last = how === 'refill' ? rd(own(v, 'last')) : null,
    off = how === 'refill' ? rd(own(v, 'off')) : null;
  return {
    state,
    at,
    how,
    from: rd(own(v, 'from')),
    to: rd(own(v, 'to')),
    ...(last ? {
      last
    } : {}),
    ...(off ? {
      off
    } : {}),
    tier: tierRead(v), // le palier et la distance d'un posé de précision (SOG-0507) : lus bornés, null sinon (un ancien constat n'en a pas)
    distNm: distRead(v),
    source,
    ...(steps ? {
      steps
    } : {})
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
  if (e.how !== 'hand' && (howOf(key) !== e.how || !follows(key))) return 'key';
  // le constat est REJOUÉ sur le fichier de mission de celui qui lit, avec le même service et le même mot que celui qui l'a écrit
  if (e.how !== 'hand' && !(e.to && (typeof crosses === 'function' ? crosses({
      from: e.from,
      to: e.to
    }, key) : stands(e, key)))) return 'shape';
  return '';
}

/** Vrai si CE fichier sait juger cette clé avec une position en direct : une zone que le pilote franchit lui-même, un objet immobile,
 *  une arrivée sans suivi d'escorte, une condition « atterrissage » de l'atelier (SOG-0500 : un point ou un objet immobile, sans mot de
 *  confirmation, un écart permis d'au moins une période de relevé), une condition « survol » (SOG-0500, lot 2 : un point ou un objet
 *  immobile, un rayon, une bande de hauteur SOL, sans mot de confirmation), une condition « stationnaire » (lot 4 : point ou objet
 *  immobile, rayon, tolérance de vitesse, bande de hauteur SOL, durée, écart permis d'au moins une période de relevé). Le reste (cible qui franchit, objet mobile, suivi,
 *  maintien, événement) n'est pas jugé en vol. Une condition « suite d'étapes » (lot 5) se juge quand elle a de une à dix étapes, chacune
 *  jugée ici (atterrissage, survol, stationnaire) et aucun survol à confirmer (un « Demander » au milieu d'une suite n'est pas jugé, par
 *  prudence). */
export function follows(key) {
  if (!key || typeof key !== 'object') return false;
  if (key.kind === 'zone') return !key.actor;
  if (key.kind === 'object') return !!key.object && !key.object.moving;
  if (key.kind === 'arrival') return !(key.escortMinSec > 0);
  return !!landSpec(key) || !!overSpec(key) || !!hoverSpec(key) || !!refillSpec(key) || !!seqOf(key);
}

/** Le genre de constat d'une clé : « landing », « overflight » ou « hover » pour les conditions de l'atelier de ce nom, `key.kind` sinon
 *  (ce que le carnet écrit dans `how`). */
export const howOf = key => key?.kind === 'condition' && (key.condition === 'landing' || key.condition === 'overflight' || key.condition ===
  'hover' || key.condition === 'refill' || key.condition === 'sequence') ? key.condition : key?.kind;

/** Ce que le vol juge d'une clé « atterrissage » : voir landRule (frame/lib/precision.js, SOG-0516), que ce fichier applique à la règle de
 *  la clé ; null quand la clé n'est pas un atterrissage ou ne se juge pas ici. */
function landSpec(key) {
  return landRule(landOf(key));
}

/** La règle d'une clé « atterrissage » (null pour toute autre clé) : celle dont landTier (cadre) recalcule le palier. */
const landOf = key => key && key.kind === 'condition' && key.condition === 'landing' ? key.rule : null;

/** Le PALIER d'un constat REJOUÉ sur la clé de celui qui lit : recalculé de `e.to` (le relevé du constat), jamais le `tier` écrit par
 *  l'autre ; '' quand la clé n'est pas un posé de précision (terrain, autre condition), le relevé illisible ou au-delà du dernier
 *  palier. Pour l'étape d'une suite : la preuve et `stepKey(règle)`. */
export function replayTier(e, key) {
  try {
    return landTier(landOf(key), e && e.to).tier;
  } catch {
    return '';
  }
}

/** Ce que le vol juge d'une condition « survol » : { at, radiusNm, heightMinFt, heightMaxFt, confirm }, ou null quand elle ne se juge
 *  pas ici : pas un survol, ni point lisible ni objet immobile, un mot de confirmation demandé par l'auteur, un rayon illisible ou nul,
 *  une hauteur illisible, une bande à l'envers. Les hauteurs sont des hauteurs SOL (aglFt) : seul le simulateur les donne. `confirm`
 *  (vrai par défaut) : le passage attend « Demander la suite », comme un objet. */
function overSpec(key) {
  const r = key && key.kind === 'condition' && key.condition === 'overflight' ? key.rule : null;
  if (!r || typeof r !== 'object' || r.kind !== 'overflight' || r.confirmation !== '') return null;
  const at = r.at ? spotOf(r.at) : r.object && !r.object.moving ? spotOf(r.object) : null,
    num = v => typeof v === 'number' && Number.isFinite(v) ? v : null,
    radiusNm = num(r.radiusNm),
    heightMinFt = num(r.heightMinFt),
    heightMaxFt = num(r.heightMaxFt);
  if (!at || !(radiusNm > 0) || heightMinFt === null || heightMaxFt === null || heightMinFt > heightMaxFt) return null;
  return {
    at,
    radiusNm,
    heightMinFt,
    heightMaxFt,
    confirm: r.confirm !== false
  };
}

/** Le passage d'un trajet (prev → next ; prev null : le relevé seul) selon cette règle : { ok, at } — vrai quand le trajet passe au
 *  rayon du point (reach du cadre, SANS contrainte verticale : pas de heightFt) ET que la hauteur sol des DEUX relevés (du seul relevé
 *  sans prev) est connue et dans la bande. Une hauteur inconnue ne compte jamais. */
function overPass(prev, next, spec) {
  const r = reach(prev, next, {
      lat: spec.at.lat,
      lon: spec.at.lon,
      rangeNm: spec.radiusNm
    }),
    inBand = f => !!f && Number.isFinite(f.aglFt) && f.aglFt >= spec.heightMinFt && f.aglFt <= spec.heightMaxFt;
  return {
    ok: r.ok === true && inBand(next) && (!prev || inBand(prev)),
    at: r.at
  };
}

/** Ce que le vol juge d'une condition « stationnaire » (SOG-0500, lot 4) : { at, radiusNm, speedMaxKt (la tolérance de vitesse),
 *  heightMinFt, heightMaxFt, durationSec, maxGapSec }, ou null quand elle ne se juge pas ici : pas un stationnaire, ni point lisible ni
 *  objet immobile, un mot de confirmation demandé par l'auteur, un nombre illisible, un rayon ou une durée nuls, un écart permis sous
 *  la période d'un relevé, une tolérance négative, une bande à l'envers. Les hauteurs sont des hauteurs SOL (aglFt). */
function hoverSpec(key) {
  const r = key && key.kind === 'condition' && key.condition === 'hover' ? key.rule : null;
  if (!r || typeof r !== 'object' || r.kind !== 'hover' || r.confirmation !== '') return null;
  const at = r.at ? spotOf(r.at) : r.object && !r.object.moving ? spotOf(r.object) : null,
    num = v => typeof v === 'number' && Number.isFinite(v) ? v : null,
    radiusM = num(r.radiusM),
    durationSec = num(r.durationSec),
    maxGapSec = num(r.maxGapSec),
    speedMaxKt = num(r.speedToleranceKt),
    heightMinFt = num(r.heightMinFt),
    heightMaxFt = num(r.heightMaxFt);
  if (!at || !(radiusM > 0) || !(durationSec > 0) || maxGapSec === null || maxGapSec < FIX_PERIOD_SEC || speedMaxKt === null || speedMaxKt <
    0 || heightMinFt === null || heightMaxFt === null || heightMinFt > heightMaxFt)
    return null;
  return {
    at,
    radiusNm: radiusM / 1852,
    speedMaxKt,
    heightMinFt,
    heightMaxFt,
    durationSec,
    maxGapSec
  };
}

/** Ce que le vol juge d'une condition « refill » (ravitaillement en retardant, SOG-0521) : { at (la station), radiusNm, speedMaxKt,
 *  onGround: true, durationSec, maxGapSec, headingDeg | null, headingTolDeg, departure }, ou null quand elle ne se juge pas ici : pas un
 *  refill, une station mobile ou sans position lisible, un mot de confirmation, un nombre illisible, un écart permis sous la période d'un
 *  relevé, un rayon, une tolérance de cap ou un cap hors des bornes de REFILL_RULE (le cadre : jamais recopiées). Le départ se juge
 *  sauf `departure` faux. */
function refillSpec(key) {
  const r = key && key.kind === 'condition' && key.condition === 'refill' ? key.rule : null;
  if (!r || typeof r !== 'object' || r.kind !== 'refill' || r.confirmation !== '' || r.confirm === true) return null;
  const R = REFILL_RULE,
    at = r.object && !r.object.moving ? spotOf(r.object) : null,
    num = v => typeof v === 'number' && Number.isFinite(v) ? v : null,
    inside = (v, [lo, hi]) => v !== null && v >= lo && v <= hi,
    radiusM = num(r.radiusM),
    durationSec = num(r.durationSec),
    maxGapSec = num(r.maxGapSec),
    speedMaxKt = num(r.speedMaxKt),
    headingTolDeg = num(r.headingTolDeg),
    headingDeg = r.headingDeg === null || r.headingDeg === undefined ? null : num(r.headingDeg);
  if (!at || !inside(radiusM, R.radiusBoundsM) || !(durationSec > 0) || maxGapSec === null || maxGapSec < FIX_PERIOD_SEC || speedMaxKt ===
    null ||
    speedMaxKt < 0 || !inside(headingTolDeg, R.headingTolBoundsDeg) || (r.headingDeg != null && !inside(headingDeg, R.headingBoundsDeg)))
    return null;
  return {
    at,
    radiusNm: radiusM / 1852,
    speedMaxKt,
    onGround: true,
    durationSec,
    maxGapSec,
    headingDeg,
    headingTolDeg,
    departure: r.departure !== false
  };
}

/** Ce relevé est-il « tenu » au ravitaillement : posé, au rayon R de la station et sous la vitesse (arrived du cadre, sans nouvelle
 *  formule) et, quand un cap est demandé, d'un cap connu à la tolérance près (écart angulaire modulo 360 : 359° et 1° sont à 2°). Un cap
 *  ou une donnée inconnue ne compte jamais. */
const isRefilling = (fix, spec) => {
  if (arrived(fix, spec).ok !== true) return false;
  if (spec.headingDeg === null) return true;
  const h = fix?.headingDeg;
  return Number.isFinite(h) && Math.abs((h - spec.headingDeg + 540) % 360 - 180) <= spec.headingTolDeg;
};

/** Ce relevé est-il « posé dans R » : au sol (onGround exactement vrai) et à R au plus de la station, tenu ou non (vitesse, cap : aucune
 *  contrainte). C'est `last` d'un ravitaillement : le dernier relevé posé dans R avant le départ. Inconnu : jamais. */
const isSettled = (fix, spec) => arrived(fix, {
  ...spec,
  speedMaxKt: null
}).ok === true;

/** Ce relevé est-il un DÉPART : il n'est plus « posé dans R » — en l'air (onGround exactement faux), ou hors de R avec une position
 *  lisible. Posé ou d'état inconnu dans R : jamais un départ. */
const isLeaving = (fix, spec) => {
  if (!fix) return false;
  if (fix.onGround === false) return true;
  const d = arrived(fix, spec).distNm;
  return Number.isFinite(d) && d > spec.radiusNm;
};

/** Ce relevé est-il « posé » selon cette règle : au rayon, sous la vitesse, au sol ? Une donnée inconnue ne l'est jamais. */
const isDown = (fix, spec) => arrived(fix, spec).ok === true;

/** Ce relevé est-il « en stationnaire » selon cette règle : au rayon et sous la tolérance de vitesse (le même test que arrived du cadre,
 *  sans contrainte de sol), EN L'AIR (onGround exactement faux : inconnu ne compte jamais), et d'une hauteur sol connue dans la bande. */
const isHovering = (fix, spec) => arrived(fix, spec).ok === true && fix.onGround === false && Number.isFinite(fix.aglFt) && fix.aglFt >=
  spec.heightMinFt && fix.aglFt <= spec.heightMaxFt;

/** Les tenues : par genre de constat, ce que le vol lit de la clé (spec) et ce qui fait un relevé « tenu » (ok). Ajouter une tenue = une
 *  ligne ici (et son genre dans howOf, HOWS, SHARED). */
const HOLDS = {
  landing: {
    spec: landSpec,
    ok: isDown
  },
  hover: {
    spec: hoverSpec,
    ok: isHovering
  },
  refill: {
    spec: refillSpec,
    ok: isRefilling
  }
};
const holdOf = key => Object.hasOwn(HOLDS, howOf(key)) ? HOLDS[howOf(key)] : null;
/** Vrai si cette clé se juge par une TENUE (atterrissage, stationnaire) : le vol garde l'état de la tenue (holding). */
export const isHold = key => !!holdOf(key) && follows(key);

/** La tenue d'un RAVITAILLEMENT (SOG-0521) : holding, avec l'état « rempli » en plus. hold : null, { from, last } (la tenue en cours) ou
 *  { from, last, to, full: true } (la durée est atteinte, le pilote n'est pas reparti : « rempli », il le reste tant qu'aucun relevé n'est
 *  un départ, même s'il bouge un peu ; `last` suit le dernier relevé tenu). f : null, ou le constat { how: 'refill', at, from, to } à la
 *  fin de la tenue quand `departure` est faux, { how, at (le relevé de départ), from, to, last, off } au premier relevé de départ. Ne lève jamais. */
function refilling(spec, hold, b, t) {
  const none = {
      hold: null,
      f: null
    },
    sound = hold && typeof hold === 'object' ? {
      from: fixHd(hold.from),
      last: fixHd(hold.last),
      to: fixHd(hold.to)
    } : null,
    t1 = sound?.last?.at ? Date.parse(sound.last.at) : NaN;
  if (sound && hold.full === true) { // « rempli » : en attente du départ
    if (!sound.from || !sound.last || !sound.to || !Number.isFinite(t1)) return none;
    const keep = {
      hold: {
        from: sound.from,
        last: sound.last,
        to: sound.to,
        full: true
      },
      f: null
    };
    if (!b || !Number.isFinite(t) || t <= t1) return keep; // sans heure (ou à rebours) : ni départ ni relevé tenu
    if (isSettled(b, spec)) return { // posé dans R, tenu ou non (il roule un peu) : `last` le suit
      hold: {
        ...keep.hold,
        last: b
      },
      f: null
    };
    return isLeaving(b, spec) ? {
      hold: null,
      f: {
        how: 'refill',
        at: t,
        from: sound.from,
        to: sound.to,
        last: sound.last,
        off: b
      }
    } : keep;
  }
  if (!b || !Number.isFinite(t) || !isRefilling(b, spec)) return none;
  const t0 = sound?.from?.at ? Date.parse(sound.from.at) : NaN,
    kept = Number.isFinite(t0) && Number.isFinite(t1) && t0 <= t1 && t > t1 && t - t1 <= spec.maxGapSec * 1000,
    start = kept ? sound.from : b,
    done = t - (kept ? t0 : t) >= spec.durationSec * 1000;
  if (done && spec.departure) return {
    hold: {
      from: start,
      last: b,
      to: b,
      full: true
    },
    f: null
  };
  return {
    hold: {
      from: start,
      last: b
    },
    f: done ? {
      how: 'refill',
      at: t,
      from: start,
      to: b
    } : null
  };
}

/** La TENUE d'un atterrissage ou d'un stationnaire : (clé, tenue d'avant, relevé) → { hold, f }. hold : null, ou { from, last } (le
 *  premier relevé tenu de la tenue en cours, le dernier) ; f : null, ou le constat { how: 'landing' | 'hover', at, from, to } quand le
 *  pilote a tenu `durationSec` secondes d'affilée (at : l'instant du relevé qui la complète). Deux relevés tenus successifs ne sont
 *  jamais séparés de plus de `maxGapSec` ; un relevé non tenu, un écart trop long, une donnée inconnue ou sans heure remet la tenue à
 *  zéro. Ne lève jamais. */
export function holding(key, hold, fix) {
  const none = {
    hold: null,
    f: null
  };
  try {
    const how = howOf(key),
      h = holdOf(key),
      spec = h ? h.spec(key) : null,
      b = how === 'refill' ? fixHd(fix) : fixOf(fix),
      t = b?.at ? Date.parse(b.at) : NaN;
    if (how === 'refill' && spec) return refilling(spec, hold, b, t);
    if (!spec || !b || !Number.isFinite(t) || !h.ok(b, spec)) return none;
    const from = hold && typeof hold === 'object' ? fixOf(hold.from) : null,
      last = hold && typeof hold === 'object' ? fixOf(hold.last) : null,
      t0 = from?.at ? Date.parse(from.at) : NaN,
      t1 = last?.at ? Date.parse(last.at) : NaN,
      kept = Number.isFinite(t0) && Number.isFinite(t1) && t0 <= t1 && t > t1 && t - t1 <= spec.maxGapSec * 1000,
      start = kept ? from : b,
      ts = kept ? t0 : t;
    const land = landTier(landOf(key),
      b); // un posé de précision : son palier et sa distance, recalculés ici (rien hors posé de précision, ni au-delà du dernier palier)
    return {
      hold: {
        from: start,
        last: b
      },
      f: t - ts >= spec.durationSec * 1000 ? {
        how,
        at: t,
        from: start,
        to: b,
        ...(land.tier ? land : {}) // un posé de précision : le palier et la distance du relevé `to` au point visé (SOG-0507)
      } : null
    };
  } catch {
    return none;
  }
}

/** Les étapes d'une suite : au plus dix (le lecteur de mission les borne déjà). */
export const SEQ_MAX = 10;

/** La clé d'une ÉTAPE : une étape est une clé, jugée comme la condition seule (SOG-0500, lot 5). */
export const stepKey = rule => ({
  kind: 'condition',
  condition: rule?.kind,
  rule
});

/** Les clés d'étape d'une condition « suite d'étapes » que le vol juge, ou null : de une à dix étapes, chacune d'un genre jugé (jamais une
 *  suite dans une suite), chaque clé d'étape acceptée par follows, et AUCUN survol à confirmer (un « Demander » au milieu d'une suite
 *  n'est pas encore jugé : décidé par prudence). */
function seqOf(key) {
  const steps = key && key.kind === 'condition' && key.condition === 'sequence' ? key.steps : null;
  if (!Array.isArray(steps) || steps.length < 1 || steps.length > SEQ_MAX) return null;
  const keys = [];
  for (const rule of steps) {
    if (!rule || typeof rule !== 'object' || !['landing', 'overflight', 'hover'].includes(rule.kind)) return null;
    const k = stepKey(rule);
    if (!follows(k) || (rule.kind === 'overflight' && overSpec(k).confirm)) return null;
    keys.push(k);
  }
  return keys;
}

/** Par quoi la vue juge cette clé : 'hold' (une tenue : holding), 'steps' (une suite d'étapes : stepping), 'leg' (un trajet : finding). */
export const judgeKind = key => isHold(key) ? 'hold' : seqOf(key) ? 'steps' : 'leg';

/** Un constat d'étape lu borné : { how, from, to, at (ms) }, ou null. `how` est un genre de constat (jamais une suite ni un geste), les
 *  deux relevés passent par fixOf, `at` est un nombre (millisecondes) ou un texte ISO. */
function proofOf(v) {
  const how = own(v, 'how'),
    t = own(v, 'at'),
    at = typeof t === 'number' ? (Number.isFinite(t) ? t : null) : msOf(t),
    from = fixOf(own(v, 'from')),
    to = fixOf(own(v, 'to'));
  return HOWS.includes(how) && how !== 'sequence' && how !== 'hand' && at !== null && from && to ? {
    how,
    from,
    to,
    at,
    tier: tierRead(v),
    distNm: distRead(v)
  } : null;
}

/** Les constats d'étape d'un tableau (de 1 à SEQ_MAX), ou null si le tableau est absent, trop long, vide ou si l'un d'eux est illisible. */
function proofsOf(v) {
  if (!Array.isArray(v) || v.length < 1 || v.length > SEQ_MAX) return null;
  const out = v.map(proofOf);
  return out.every(Boolean) ? out : null;
}

/** L'état d'une suite relu borné : { i, hold, proofs } ; illisible → le départ { i: 0, hold: null, proofs: [] }. i est le nombre
 *  d'étapes faites (de 0 à n), `proofs` en a exactement i. */
function stepsState(state, n) {
  const start = {
    i: 0,
    hold: null,
    proofs: []
  };
  try {
    const i = own(state, 'i'),
      list = own(state, 'proofs'),
      hold = own(state, 'hold');
    if (!Number.isInteger(i) || i < 0 || i > n || !Array.isArray(list) || list.length !== i) return start;
    const proofs = list.map(proofOf);
    if (!proofs.every(Boolean)) return start;
    return {
      i,
      hold: hold && typeof hold === 'object' ? hold : null,
      proofs
    };
  } catch {
    return start;
  }
}

/** La SUITE D'ÉTAPES (SOG-0500, lot 5) : (clé, état d'avant, relevé d'avant, relevé) → { state, f }. state : { i (l'étape en cours),
 *  hold (la tenue en cours, atterrissage ou stationnaire), proofs ([{ how, from, to, at }] : les constats des étapes faites) } ; f :
 *  null, ou le constat { how: 'sequence', at (celui de la dernière étape), from (le premier relevé de la première preuve), to (le dernier
 *  de la dernière), steps: proofs } quand la dernière étape est faite. Les étapes se font DANS L'ORDRE : seule l'étape en cours est
 *  jugée, par holding (une tenue) ou finding (un survol), les mêmes fonctions que pour la condition seule ; le relevé qui finit une
 *  étape ne compte pas pour la suivante (une étape par relevé, et le relevé d'avant n'est jamais le début du trajet d'un survol s'il a
 *  fini l'étape d'avant). Une tenue interrompue repart sans perdre les étapes faites. Un état illisible repart du début. Ne lève
 *  jamais. */
export function stepping(key, state, prev, fix) {
  const start = {
    i: 0,
    hold: null,
    proofs: []
  };
  try {
    const keys = seqOf(key);
    if (!keys) return {
      state: start,
      f: null
    };
    const cur = stepsState(state, keys.length);
    if (cur.i < keys.length) {
      const k = keys[cur.i];
      let f = null,
        hold = null;
      if (isHold(k)) {
        const r = holding(k, cur.hold, fix);
        hold = r.hold;
        f = r.f;
      } else {
        // le relevé qui a fini l'étape d'avant ne fait pas le début du trajet de celle-ci
        const last = cur.proofs.length ? cur.proofs[cur.proofs.length - 1].to.at : null,
          p = fixOf(prev),
          ok = !!p && (last === null || Date.parse(p.at) > Date.parse(last));
        f = finding(k, ok ? p : null, fix);
        if (f && f.confirm) f = null;
      }
      if (f) {
        cur.proofs = [...cur.proofs, {
          how: f.how,
          from: f.from,
          to: f.to,
          at: f.at,
          tier: f.tier ?? null, // la preuve d'une étape « atterrissage » de précision porte son palier et sa distance (SOG-0507)
          distNm: f.distNm ?? null
        }];
        cur.i++;
        hold = null;
      }
      cur.hold = hold;
    }
    if (cur.i < keys.length || !cur.proofs.length) return {
      state: cur,
      f: null
    };
    const first = cur.proofs[0],
      last = cur.proofs[cur.proofs.length - 1];
    return {
      state: cur,
      f: {
        how: 'sequence',
        at: last.at,
        from: first.from,
        to: last.to,
        steps: cur.proofs
      }
    };
  } catch {
    return {
      state: start,
      f: null
    };
  }
}

/** Les preuves d'une suite se rejouent une à une sur la clé d'étape du LECTEUR, dans l'ordre : même nombre d'étapes, chaque preuve tient
 *  sur sa règle (stands de la condition seule), et chacune commence après la fin de la précédente. Rejoué, pas prouvé. */
function standsSteps(e, key) {
  const keys = seqOf(key),
    list = e.steps;
  if (!keys || !Array.isArray(list) || list.length !== keys.length) return false;
  return list.every((p, j) => !!p && stands({
    how: p.how,
    from: p.from,
    to: p.to
  }, keys[j]) && (j === 0 || Date.parse(p.from?.at) >= Date.parse(list[j - 1].to?.at)));
}

/** Le constat d'une tenue (atterrissage, stationnaire) tient-il sur CETTE clé ? Les deux relevés sont tenus selon elle, séparés d'au
 *  moins `durationSec` secondes et de MOINS de `durationSec + maxGapSec` : ce qu'un appareil honnête écrit (holding conclut au premier
 *  relevé qui complète la durée, et deux relevés tenus successifs sont à maxGapSec au plus) — un constat forgé doit lui ressembler
 *  (Sécurisation, 18/11). Rejoué, pas prouvé : deux relevés « au sol » d'un carnet hostile tiennent comme ceux d'un vrai. */
function standsHeld(e, key) {
  const h = holdOf(key),
    spec = h ? h.spec(key) : null;
  if (!spec || !e.from || !e.to) return false;
  const gap = Date.parse(e.to.at) - Date.parse(e.from.at);
  return h.ok(e.from, spec) && h.ok(e.to, spec) && gap >= spec.durationSec * 1000 && gap < (spec.durationSec + spec
    .maxGapSec) * 1000;
}

/** Le constat d'un ravitaillement tient-il sur CETTE clé ? Comme une tenue (standsHeld : `from` et `to` tenus selon la clé du lecteur,
 *  au cap demandé, séparés d'au moins `durationSec` et de moins de `durationSec + maxGapSec`) ; avec départ, `last` est posé dans R (tenu ou non :
 *  il a pu rouler un peu), `off` ne l'est pas et est un départ (en l'air, ou hors de R), `off` suit `last` de `maxGapSec` au plus, et `last` ne précède pas `to` (de 24 h au plus :
 *  l'attente au sol). Rejoué, pas prouvé : des relevés forgés qui satisfont la règle tiennent comme ceux d'un vrai vol. */
function standsRefill(e, key) {
  const spec = refillSpec(key);
  if (!spec || !e.from || !e.to || !isRefilling(e.from, spec) || !isRefilling(e.to, spec)) return false;
  const gap = Date.parse(e.to.at) - Date.parse(e.from.at);
  if (!(gap >= spec.durationSec * 1000 && gap < (spec.durationSec + spec.maxGapSec) * 1000)) return false;
  if (!spec.departure) return true;
  if (!e.last || !e.off || !isSettled(e.last, spec) || isRefilling(e.off, spec) || !isLeaving(e.off, spec)) return false;
  const tl = Date.parse(e.last.at),
    to = Date.parse(e.to.at),
    gapOff = Date.parse(e.off.at) - tl;
  return gapOff > 0 && gapOff <= spec.maxGapSec * 1000 && tl >= to && tl - to <= 24 * 3600e3;
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

/** La clé d'une arrivée telle que le vol la juge : « dans la zone » à AD_NM, quel que soit le rayon du fichier (la tolérance de
 *  l'utilisateur prime, SOG-0507, 19/11) ; la vitesse et le sol restent les règles de la clé. */
const adKey = key => ({
  ...key,
  radiusNm: AD_NM
});

/** Les escales requises d'une arrivée sont-elles faites ? Chacune (douze au plus) doit avoir été approchée — à moins de TRANSIT_NM
 *  (2 NM : la tolérance de l'utilisateur prime sur le rayon de l'arrivée, SOG-0507) — sur la trace gardée, ou sur ce trajet. Sans
 *  escale requise : vrai. */
function stopsDone(key, prev, next, trail) {
  const req = (Array.isArray(key.required) ? key.required : []).slice(0, 12);
  if (!req.length) return true;
  const fixes = [...trailFixes(trail, null), ...(prev ? [prev] : []), next];
  return req.every(q => fixes.some((f, i) => reach(i ? fixes[i - 1] : null, f, {
    lat: q?.lat,
    lon: q?.lon,
    rangeNm: TRANSIT_NM,
    heightFt: null
  }).ok === true));
}

/** Le CONSTAT de ce trajet (prev → next, deux relevés ; prev null : le relevé seul) pour cette clé, ou null : { how, at, from, to,
 *  confirm } — zone : le trajet touche la zone (le mot « touched » du service : entré, dedans, traversé) ; objet : le trajet passe à
 *  portée (confirm : vrai quand le pilote doit encore déclarer « Objet en vue ») ; arrivée : posé au terrain, escales requises faites
 *  (trail : la trace gardée) ; survol : le trajet passe au rayon, aux deux relevés dans la bande de hauteur sol (confirm : vrai par
 *  défaut, comme l'objet). Une donnée qui manque ne satisfait jamais une clé. */
export function finding(key, prev, next, {
  trail
} = {}) {
  if (!follows(key) || isHold(key) || seqOf(key)) return null; // une tenue a besoin d'un état (holding), une suite aussi (stepping)
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
  if (howOf(key) === 'overflight') { // le survol : aucun état, le trajet et la bande de hauteur sol suffisent (SOG-0500, lot 2)
    const spec = overSpec(key),
      r = spec ? overPass(a, b, spec) : null;
    return r?.ok ? leg('overflight', r.at, {
      confirm: spec.confirm
    }) : null;
  }
  return arrived(b, adKey(key)).ok === true && stopsDone(key, a, b, trail) ? leg('arrival', t) : null;
}

/** Le constat d'un carnet tient-il sur CETTE clé (le fichier de mission de celui qui lit) ? Rejoué par le même service : la zone
 *  touchée par le trajet, l'objet à portée, l'arrivée posée au dernier relevé. */
export function stands(e, key) {
  if (!e || !e.to || !key || howOf(key) !== e.how) return false;
  if (e.how === 'landing' || e.how === 'hover') return standsHeld(e, key);
  if (e.how === 'refill') return standsRefill(e, key);
  if (e.how === 'sequence') return standsSteps(e, key); // chaque preuve rejouée sur l'étape du lecteur (lot 5)
  // les deux relevés d'un constat ne font un trajet que s'ils sont à une minute au plus l'un de l'autre (la règle de l'écriture) :
  // sinon un « from » lointain tracerait une corde à travers la forme — le dernier relevé est alors jugé seul
  const same = !e.from || (e.from.lat === e.to.lat && e.from.lon === e.to.lon && e.from.at === e.to.at),
    gap = Math.abs(Date.parse(e.to.at) - Date.parse(e.from?.at)),
    prev = same || !(gap <= LEG_MS) ? null : e.from;
  if (e.how === 'zone') return crossed(prev, e.to, key).touched === true;
  if (e.how === 'object') return !!key.object && reach(prev, e.to, key.object).ok === true;
  if (e.how === 'arrival') return arrived(e.to, adKey(key)).ok ===
    true; // rejoué sur la clé du lecteur, à la tolérance du terrain (SOG-0507)
  if (e.how === 'overflight') { // rejoué sur la règle du lecteur : « rejoué, pas prouvé » — des relevés forgés qui la satisfont tiennent
    const spec = overSpec(key);
    return !!spec && overPass(prev, e.to, spec).ok;
  }
  return false;
}

/** Le rattrapage : le premier constat de cette clé sur la trace gardée depuis `since` (l'instant où ce tiroir est devenu le premier
 *  fermé ; null : toute la trace), ou null. La trace garde un point par mille marin : un trajet plus grossier que les relevés. Un
 *  objet qui veut « Objet en vue » n'est jamais rattrapé (il faut le geste, à portée), ni un survol à confirmer. Un point de la trace
 *  sans hauteur sol (aglFt, q[4] : absent des anciens points) donne une hauteur inconnue : jamais un survol. */
export function catchUp(key, trail, since = null) {
  if (!follows(key) || isHold(key) || seqOf(key))
    return null; // la trace n'a pas les relevés d'une tenue ni d'une suite (un point par mille marin)
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

/** Le geste neutre « Demander la suite » (SOG-0459) : quel tiroir il ouvre, ou null. Seul le PREMIER tiroir fermé (non verrouillé)
 *  compte : sa clé est le geste (`hand`, quel que soit `keyWhy`) → { id, how: 'hand' } ; c'est un objet ou un survol à confirmer, et
 *  `inRange` est son identifiant (l'appareil suit cette clé et l'a à portée maintenant : la vue le sait, pas ce calcul) → { id, how:
 *  'object' | 'overflight' }. Toute
 *  autre clé (heure, zone, arrivée, objet hors de portée ou non suivi), aucun tiroir fermé, une entrée illisible : null. Ne lève jamais. */
export function asked(states, options = null) {
  try {
    const inRange = own(options, 'inRange');
    const first = (Array.isArray(states) ? states : []).slice(0, 64).find(s => s && typeof s === 'object' && !Array.isArray(s) &&
      own(s, 'open') !== true && own(s, 'locked') !== true);
    const id = first ? own(first, 'id') : undefined;
    if (typeof id !== 'string' || !LETTERS.includes(id)) return null;
    const key = own(first, 'key'),
      kind = key && typeof key === 'object' ? own(key, 'kind') : undefined;
    if (kind === 'hand') return {
      id,
      how: 'hand'
    };
    const how = kind === 'object' ? 'object' : kind === 'condition' && own(key, 'condition') === 'overflight' ? 'overflight' : '';
    if (how && typeof inRange === 'string' && inRange === id) return {
      id,
      how
    };
    return null;
  } catch {
    return null; // un état hostile (un accesseur qui lève) : rien n'est ouvert
  }
}

/** Les posés de précision JUGÉS d'un constat (SOG-0516, lot B) : [{ at, tier, distNm }], le palier RECALCULÉ de chaque relevé sur la règle
 *  du LECTEUR (landTier), jamais le palier écrit. Une preuve qui ne tient pas sur la clé du lecteur (stands) n'en donne aucun ; un posé
 *  au terrain ou au-delà du dernier palier non plus. Un constat « landing » donne une ligne ; une suite, une par étape atterrissage, avec
 *  l'heure de l'étape. Ne lève jamais. */
function landLines(e, key) {
  try {
    if (!e || !e.to || !stands(e, key)) return [];
    if (e.how === 'landing') {
      const r = landTier(landOf(key), e.to);
      return r.tier ? [{
        at: e.at,
        tier: r.tier,
        distNm: r.distNm
      }] : [];
    }
    if (e.how !== 'sequence') return [];
    const keys = seqOf(key),
      out = [];
    (e.steps || []).forEach((p, j) => {
      const r = p && p.how === 'landing' && keys ? landTier(landOf(keys[j]), p.to) : null;
      if (r && r.tier) out.push({
        at: p.at,
        tier: r.tier,
        distNm: r.distNm
      });
    });
    return out;
  } catch {
    return [];
  }
}

/** Le DÉBRIEF de MA mission (SOG-0516, lot B) : une ligne par posé de PRÉCISION jugé, les miens et ceux des équipiers, d'après les états
 *  de stateOf (qui portent `lands`, le palier recalculé chez le lecteur) → [{ title, how: 'landing', tier, distNm, at, by, mine }], dans
 *  l'ordre de `at` (puis de l'ordre des états, le tri est stable). title : le titre du tiroir, tel que l'état le porte (vide s'il n'en a pas) ;
 *  jamais son numéro : un rang trahirait qu'un autre tiroir existe (§ 7.4, la règle du secret). Un posé au terrain, une autre condition,
 *  un tiroir fermé : aucune ligne ; jamais un lieu ni un identifiant de point. Pure ; ne lève jamais (une entrée hostile est omise). */
export function debriefOf(states) {
  const out = [];
  try {
    (Array.isArray(states) ? states : []).slice(0, LETTERS.length).forEach(s => {
      try {
        const lands = s && s.open === true ? own(s, 'lands') : null;
        for (const l of (Array.isArray(lands) ? lands : []).slice(0, SEQ_MAX * 8)) {
          const tier = own(l, 'tier'),
            distNm = own(l, 'distNm'),
            at = own(l, 'at'),
            by = own(l, 'by');
          if (typeof tier === 'string' && TIERS.includes(tier) && typeof distNm === 'number' && Number.isFinite(distNm) && distNm >=
            0 &&
            distNm <= PRECISION[PRECISION.length - 1].nm && typeof at === 'number' && Number.isFinite(at)) out.push({
            title: typeof own(s, 'title') === 'string' ? own(s, 'title') : '',
            how: 'landing',
            tier,
            distNm,
            at,
            by: typeof by === 'string' ? by : '',
            mine: own(l, 'mine') === true
          });
        }
      } catch {
        /* une entrée hostile : omise */
      }
    });
    return out.sort((a, b) => a.at - b.at).slice(0, 200);
  } catch {
    return [];
  }
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
      by: tri || null,
      to: my.to,
      from: my.from,
      steps: my.steps
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
          by: o.pilot,
          to: e.to,
          from: e.from,
          steps: e.steps
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
      got = own(seenOf, id),
      // le palier d'un posé de précision : RECALCULÉ du relevé du constat sur la clé de celui qui lit, jamais le palier écrit (SOG-0507)
      land = w && w.how === 'landing' && w.to ? landTier(landOf(key), w.to) : null;
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
      tier: land && land.tier ? land.tier :
      null, // le palier d'un posé de précision, recalculé ici ; null sans palier (terrain, autre clé)
      distNm: land && land.tier ? land.distNm : null,
      lands: w ? found.flatMap(c => landLines(c, key).map(l =>
        ({ // les posés jugés de ce tiroir, les miens et ceux des équipiers (SOG-0516, lot B)
          ...l,
          by: c.by || null,
          mine: !!tri && c.by === tri
        }))) : [],
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
      ...(e.how === 'refill' && e.last ? {
        last: e.last
      } : {}),
      ...(e.how === 'refill' && e.off ? {
        off: e.off
      } : {}),
      ...(e.source ? {
        source: e.source
      } : {}),
      ...(e.tier ? {
        tier: e.tier
      } : {}),
      ...(e.distNm != null ? {
        distNm: e.distNm
      } : {}),
      ...(e.how === 'sequence' && e.steps ? {
        steps: e.steps.map(p => ({
          how: p.how,
          from: p.from,
          to: p.to,
          at: isoOf(p.at),
          ...(p.tier ? {
            tier: p.tier
          } : {}),
          ...(p.distNm != null ? {
            distNm: p.distNm
          } : {})
        }))
      } : {})
    };
  }
  out.updated_at = isoOf(now);
  out.by = b.by;
  return out;
}

/** Le carnet avec ce tiroir ouvert par ce pilote (how : 'hand', 'zone', 'object'… ; fix : { from, to, at, source } d'un constat, et `steps` pour une suite d'étapes). Un tiroir
 *  déjà ouvert par lui garde sa première ouverture. */
export function withOpen(doc, ctx, id, how = 'hand', fix = null) {
  const b = baseOf(doc, ctx);
  if (!b || !LETTERS.includes(id) || !HOWS.includes(how)) return null;
  const steps = how === 'sequence' ? proofsOf(fix?.steps) : null;
  if (how === 'sequence' && !steps) return null; // une suite s'écrit avec ses preuves (de 1 à 10), sinon rien
  const now = Number.isFinite(ctx.now) ? ctx.now : Date.now();
  // l'heure d'un constat est celle du fait (le franchissement), jamais dans le futur ; celle d'un geste, l'instant du geste
  const at = how !== 'hand' && Number.isFinite(fix?.at) ? Math.min(fix.at, now) : now;
  if (b.drawers[id]?.state !== 'open') b.drawers[id] = {
    state: 'open',
    at,
    how,
    from: (how === 'refill' ? fixHd : fixOf)(fix?.from),
    to: (how === 'refill' ? fixHd : fixOf)(fix?.to),
    ...(how === 'refill' && fixHd(fix?.last) ? {
      last: fixHd(fix.last)
    } : {}),
    ...(how === 'refill' && fixHd(fix?.off) ? {
      off: fixHd(fix.off)
    } : {}),
    source: SOURCES.includes(fix?.source) ? fix.source : '',
    tier: how === 'landing' ? tierRead(fix) : null, // le palier et la distance d'un posé de précision (SOG-0507), relus bornés
    distNm: how === 'landing' ? distRead(fix) : null,
    ...(steps ? {
      steps
    } : {})
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
