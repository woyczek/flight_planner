// V3 frame/lib — les ÉVÉNEMENTS d'une mission (SOG-0620, lot 1, le lecteur ; fiche de l'ergonome et de l'utilisateur, contrat avec la session « Création de
// missions » le 26 nov. 2026) : un événement vit dans `timeline.events` (et dans les anciennes places où l'atelier le trouve : `timeline` en liste, `chronology`),
// avec ses clés d'aujourd'hui (at, place, text) et des clés FACULTATIVES, que la V2 ignore. Calcul PUR : ni page, ni stockage, ni réseau, jamais d'exception ;
// un fichier de mission est écrit par n'importe quel pilote — tout est borné, une clé hors bornes n'est pas lue (jamais corrigée en silence : le champ vaut null).
// Les missions existantes se lisent telles quelles, sans réécriture : un `at` de la V2 (« H », « H+30mn », « H+1h30 »…) se lit comme un repère « décollage » et
// un décalage ; ce qui n'est pas de cette forme (« 14:00 », un texte libre) est `legacy: true`, `offsetMin: null`.
//
// LES CLÉS DU FICHIER (timeline.events[i] ; FORMAT_MISSION.md est celui de Création) :
//   id          « EV-n » (^EV-\d{1,3}$), l'identifiant stable ; absent ou mal formé : l'événement est lu sous « @<rang dans le fichier> » (`idWritten: false`)
//   title       un texte, 120 signes au plus
//   teams       [lettres d'équipe A à Y] ; vide ou absent = toutes les équipes
//   ref         « takeoff » (défaut) | « order » | « point:<id d'un lieu> » | « event:<EV-n> » | « drawer:<lettre B à M> » ; une autre forme : { kind: 'unknown' }
//   offset_min  un entier de −240 à 1440 (minutes après le repère ; négatif : avant) ; absent avec un `ref` écrit = 0
//   tol_early_min, tol_late_min  des entiers de 0 à 240 (tolérance d'avance et de retard) ; absent : null
//   imposed     true | false (l'heure est imposée : elle ne suit pas l'heure réelle de son repère)
//   at          le miroir lisible pour la V2 (« H+45 », « EV-1+10 ») : lu seulement quand `offset_min` et `ref` ne le sont pas
//   timeline.order_offset_min  un entier de −1440 à 0 : l'heure de réception de l'ordre, en minutes relatives au décollage PRÉVU (−20 : « ordre reçu à H-20 »)
//
// API :
//   readEvents(x) → [{ id, idWritten, i, title, text, place, teams: [lettre], ref: { kind, id }, offsetMin, tolEarlyMin, tolLateMin, imposed, legacy }] : x est le
//     document d'une mission (le YAML lu) OU la mission que readMission a lue (qui garde ce résultat dans `events`) ; 60 événements au plus, dans l'ordre du fichier.
//     kind : 'takeoff' | 'order' | 'point' | 'event' | 'drawer' | 'unknown'.
//   orderOffsetMinOf(x) → l'entier de `timeline.order_offset_min` ou null.
//   plannedMin(mission, passageMin) → Map(id → minutes après le décollage PRÉVU | null) : les événements (en suivant les chaînes de repères : un cycle, un repère
//     inconnu, un décalage non lu, un « order » sans `order_offset_min` donnent null, jamais une boucle) et les tiroirs (par leur lettre) : un tiroir à clé HEURE du
//     départ (trigger_delay_min, point ORIGIN) se range à son heure ; tout autre prend son heure de repli (fallback_delay_min), sinon null. `passageMin(mission,
//     pointId)` est celui de mission.js ({ min } | null : le temps estimé du départ au passage d'un point) ; sans lui, un repère « point: » est null.
//     C'est la clé du TRI du déroulé : null va à la fin, les tiroirs gardent entre eux leur ordre (la fonction ne trie pas).
//   eventDependents(mission, id) → [id] : les événements dont la chaîne de repères (event: et drawer:) mène à `id` — un identifiant d'événement ou une lettre de
//     tiroir —, dans l'ordre du fichier ; un cycle ne boucle pas.
//   hiddenEvents(mission, open) → Set des identifiants d'événements CACHÉS au pilote : un événement dont le repère est un tiroir de la mission qui n'est pas dans
//     `open` (les lettres ouvertes), ou un événement caché (transitif). Un repère « point: » ou inconnu, ou un tiroir qui n'existe pas, ne cache pas.
//   eventTimes(mission, ctx, passageMin) → [{ id, plannedAt (ISO | null), clock, imposed }] pour chaque événement, dans l'ordre du fichier ; ctx { takeoffAt (ISO),
//     orderReadAt (ISO), passed: { pointId: ISO }, held: { 'EV-n': ISO }, drawersOpenAt: { lettre: ISO } } — les heures RÉELLES constatées. L'heure suit l'heure
//     réelle de son repère dès qu'elle est connue (clock: true) ; sinon elle se déduit de l'heure du décollage et de la minute prévue (plannedMin ; clock: false) ;
//     imposed : elle ne suit JAMAIS son repère, elle est prévue depuis le décollage (clock: false). plannedAt null : rien pour la calculer.

import {
  own,
  plain,
  bounded,
  clean
} from './untrusted.js';

export const EVENTS_MAX = 60;
export const EVENT_ID = /^EV-\d{1,3}$/;
const TEAM = /^[A-Y]$/,
  DRAWER = /^[B-M]$/,
  OFFSET = Object.freeze({
    lo: -240,
    hi: 1440
  }),
  TOL_MAX = 240,
  ORDER = Object.freeze({
    lo: -1440,
    hi: 0
  }),
  TITLE_MAX = 120,
  TEXT_MAX = 1000,
  PLACE_MAX = 120,
  ID_MAX = 80,
  CHAIN_MAX = 100;

const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi ? v : null;
const cut = (v, n) => typeof v === 'string' || typeof v === 'number' ? clean(v).slice(0, n) : '';

/** Où le fichier garde ses événements : `timeline.events`, `timeline` en liste, `chronology` en liste ou `chronology.events` (la même règle que l'atelier). */
function listOf(d) {
  for (const key of ['timeline', 'chronology']) {
    const v = own(d, key);
    if (Array.isArray(v) && v.length) return v;
    if (plain(v) && Array.isArray(own(v, 'events')) && v.events.length) return v.events;
  }
  return [];
}

/** Un `at` de la V2 : « H », « H+N » (minutes), « H+Nmn », « H+Nmin », « H+Nh », « H+NhNN », « H+NhNNmn », « H-… », avec ou sans blancs autour du signe → les minutes
 *  (entier de −240 à 1440), null sinon (une heure d'horloge, un texte libre, hors bornes). */
export function atMin(at) {
  const s = typeof at === 'string' ? clean(at) : '';
  if (/^H$/i.test(s)) return 0;
  let m = /^H\s*([+-])\s*(\d{1,4})\s*(?:mn|min)?$/i.exec(s),
    n = null;
  if (m) n = +m[2];
  else if ((m = /^H\s*([+-])\s*(\d{1,2})\s*h(?:\s*(\d{1,2})\s*(?:mn|min)?)?$/i.exec(s))) n = +m[2] * 60 + (m[3] === undefined ? 0 : +m[3]);
  return n === null ? null : int(m[1] === '-' ? -n : n, OFFSET.lo, OFFSET.hi);
}

/** Le repère écrit : { kind, id } ; une forme inconnue : { kind: 'unknown', id: '' }. */
function refOf(v) {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s === 'takeoff' || s === 'order') return {
    kind: s,
    id: ''
  };
  const m = /^(point|event|drawer):(.+)$/.exec(s);
  if (m) {
    const id = m[2].trim();
    if (m[1] === 'event' && EVENT_ID.test(id) || m[1] === 'drawer' && DRAWER.test(id) || m[1] === 'point' && id.length <= ID_MAX && !
      /[\u0000-\u001f]/.test(id)) return {
      kind: m[1],
      id: m[1] === 'point' ? clean(id) : id
    };
  }
  return {
    kind: 'unknown',
    id: ''
  };
}

const eventOf = (e, i) => {
  const o = plain(e) || {},
    written = typeof own(o, 'id') === 'string' && EVENT_ID.test(o.id.trim()),
    hasRef = own(o, 'ref') !== undefined,
    hasOffset = own(o, 'offset_min') !== undefined,
    fromAt = !hasRef && !hasOffset ? atMin(own(o, 'at')) : null,
    ref = hasRef ? refOf(o.ref) : {
      kind: 'takeoff',
      id: ''
    },
    offsetMin = hasOffset ? int(o.offset_min, OFFSET.lo, OFFSET.hi) : hasRef ? 0 : fromAt,
    teams = [...new Set((Array.isArray(own(o, 'teams')) ? o.teams : []).slice(0, 25).map(x => typeof x === 'string' ? x.trim()
      .toUpperCase() : '').filter(x => TEAM.test(x)))].sort();
  return {
    id: written ? o.id.trim() : `@${i}`,
    idWritten: written,
    i,
    title: cut(own(o, 'title'), TITLE_MAX),
    text: cut(own(o, 'text') ?? own(o, 'description') ?? own(o, 'label'), TEXT_MAX),
    place: cut(own(o, 'place'), PLACE_MAX),
    teams,
    ref,
    offsetMin,
    tolEarlyMin: int(own(o, 'tol_early_min'), 0, TOL_MAX),
    tolLateMin: int(own(o, 'tol_late_min'), 0, TOL_MAX),
    imposed: own(o, 'imposed') === true,
    legacy: offsetMin === null && !hasOffset && !hasRef
  };
};

export function readEvents(x) {
  try {
    const m = plain(x);
    if (!m) return [];
    if (Array.isArray(m.events) && !('timeline' in m) && !('chronology' in m)) return m.events; // la mission déjà lue (readMission)
    const seen = new Set();
    return listOf(m).slice(0, EVENTS_MAX).map(eventOf).map(ev => { // deux événements de même identifiant : le second est lu sous son rang
      if (ev.idWritten && seen.has(ev.id)) return {
        ...ev,
        id: `@${ev.i}`,
        idWritten: false
      };
      seen.add(ev.id);
      return ev;
    });
  } catch {
    return [];
  }
}

export const orderOffsetMinOf = x => {
  const t = own(plain(x), 'timeline');
  return plain(t) ? int(own(t, 'order_offset_min'), ORDER.lo, ORDER.hi) : null;
};

const eventsOfMission = m => Array.isArray(plain(m)?.events) ? m.events.filter(e => plain(e) && typeof e.id === 'string') : readEvents(m);
const drawersOfMission = m => (Array.isArray(plain(m)?.drawers) ? m.drawers : []).filter(d => plain(d) && typeof d.id === 'string');

/** L'heure d'un tiroir, en minutes après le décollage prévu : sa clé HEURE du départ, sinon son heure de repli, sinon null. */
const drawerMin = d => {
  const k = plain(d.key) || {};
  const n = k.kind === 'time' && (k.point === 'ORIGIN' || k.point === undefined) ? bounded(k.delayMin, 0, 100000) : bounded(k.fallbackMin,
    0, 100000);
  return n;
};

export function plannedMin(mission, passageMin) {
  const out = new Map();
  try {
    const evs = eventsOfMission(mission),
      byId = new Map(evs.map(e => [e.id, e])),
      drawers = new Map(drawersOfMission(mission).map(d => [d.id, d])),
      order = Number.isInteger(plain(mission)?.orderOffsetMin) ? mission.orderOffsetMin : null,
      memo = new Map(),
      visiting = new Set(),
      of = id => {
        if (memo.has(id)) return memo.get(id);
        if (visiting.has(id)) return null; // un cycle
        visiting.add(id);
        const e = byId.get(id);
        let v = null;
        if (e && e.offsetMin !== null) {
          const r = e.ref;
          let base = null;
          if (r.kind === 'takeoff') base = 0;
          else if (r.kind === 'order') base = order;
          else if (r.kind === 'event') base = byId.has(r.id) ? of(r.id) : null;
          else if (r.kind === 'drawer') base = drawers.has(r.id) ? drawerMin(drawers.get(r.id)) : null;
          else if (r.kind === 'point') {
            const p = typeof passageMin === 'function' ? passageMin(mission, r.id) : null;
            base = plain(p) && Number.isFinite(p.min) ? p.min : null;
          }
          v = base === null ? null : base + e.offsetMin;
        }
        visiting.delete(id);
        memo.set(id, v);
        return v;
      };
    for (const e of evs) out.set(e.id, of(e.id));
    for (const [id, d] of drawers) out.set(id, drawerMin(d));
  } catch {
    /* une carte partielle vaut mieux qu'une exception */
  }
  return out;
}

/** La chaîne des repères d'un événement (lui exclu), du plus proche au plus lointain : les identifiants d'événement et de tiroir rencontrés ; s'arrête sur un cycle. */
function chainOf(e, byId) {
  const chain = [],
    seen = new Set([e.id]);
  let r = e.ref;
  while (chain.length < CHAIN_MAX && (r.kind === 'event' || r.kind === 'drawer')) {
    if (seen.has(r.id)) break;
    seen.add(r.id);
    chain.push(r.id);
    const next = r.kind === 'event' ? byId.get(r.id) : null;
    if (!next) break;
    r = next.ref;
  }
  return chain;
}

export function eventDependents(mission, id) {
  try {
    const evs = eventsOfMission(mission),
      byId = new Map(evs.map(e => [e.id, e]));
    return evs.filter(e => e.id !== id && chainOf(e, byId).includes(id)).map(e => e.id);
  } catch {
    return [];
  }
}

export function hiddenEvents(mission, open) {
  const hidden = new Set();
  try {
    const evs = eventsOfMission(mission),
      byId = new Map(evs.map(e => [e.id, e])),
      known = new Set(drawersOfMission(mission).map(d => d
        .id)), // un tiroir qui n'existe pas n'est pas un secret : l'événement n'est pas caché pour lui
      opened = new Set((Array.isArray(open) ? open : open instanceof Set ? [...open] : []).filter(x => typeof x === 'string'));
    for (const e of evs)
      if (chainOf(e, byId).some(id => known.has(id) && !opened.has(id))) hidden.add(e.id);
  } catch {
    /* rien de caché par erreur : l'appelant ne retient que ce qu'il lit */
  }
  return hidden;
}

const iso = v => typeof v === 'string' && Number.isFinite(Date.parse(v)) ? v : null;
const plus = (isoText, min) => new Date(Date.parse(isoText) + min * 60000).toISOString();

export function eventTimes(mission, ctx, passageMin) {
  try {
    const evs = eventsOfMission(mission),
      c = plain(ctx) || {},
      planned = plannedMin(mission, passageMin),
      takeoff = iso(c.takeoffAt),
      byId = new Map(evs.map(e => [e.id, e])),
      times = new Map(),
      at = id => {
        if (times.has(id)) return times.get(id);
        times.set(id, null); // un cycle ne boucle pas
        const e = byId.get(id);
        let t = null;
        if (e) {
          const r = e.ref,
            offset = e.offsetMin;
          let refAt = null;
          if (!e.imposed && offset !== null) {
            if (r.kind === 'takeoff') refAt = iso(c.takeoffAt);
            else if (r.kind === 'order') refAt = iso(c.orderReadAt);
            else if (r.kind === 'point') refAt = iso(own(plain(c.passed), r.id));
            else if (r.kind === 'drawer') refAt = iso(own(plain(c.drawersOpenAt), r.id));
            else if (r.kind === 'event') refAt = iso(own(plain(c.held), r.id));
          }
          if (refAt) t = {
            at: plus(refAt, offset),
            clock: true
          };
          else {
            const p = planned.get(id);
            t = takeoff && p !== null && p !== undefined ? {
              at: plus(takeoff, p),
              clock: false
            } : null;
          }
        }
        times.set(id, t);
        return t;
      };
    return evs.map(e => {
      const t = at(e.id);
      return {
        id: e.id,
        plannedAt: t ? t.at : null,
        clock: !!t && t.clock,
        imposed: e.imposed
      };
    });
  } catch {
    return [];
  }
}
