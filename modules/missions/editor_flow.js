// V3 missions — le déroulé de l'atelier (SOG-0620, lot 2), le calcul pur : les événements et les tiroirs d'une mission rangés PAR L'HEURE,
// et l'écriture des clés d'un événement. Ni page, ni stockage, ni réseau. Le fichier lu est une entrée non fiable (FORMAT_MISSION.md § 5) :
// textes bornés, nombres ramenés dans leurs bornes, un identifiant n'est jamais une clé d'objet (les clés écrites sont celles d'ici, jamais
// celles du fichier), rien ne lève jamais. Règle des with… de editor.js (audit 182) : un événement qu'on n'a pas retouché reste l'objet
// du fichier, à l'identique ; un événement retouché garde ses autres clés (celles de la V2 comprises).
//
// Le LECTEUR est celui de la suite (frame/lib/mission.js) : MS.readEvents (les événements lus, V2 comprise), MS.plannedMin (l'heure
// prévue de chacun, en minutes après le décollage prévu), MS.eventDependents (ceux dont la chaîne de repères passe par un autre) — rien
// n'est recalculé ici. Sans lecteur (une version du cadre qui ne l'a pas encore), les événements sont lus tels que le fichier les écrit
// (l'heure de la V2 dite telle quelle, « ancienne ») et aucune heure n'est connue : le déroulé se montre, rien n'est perdu.
//
// API :
//   ID_RE ; OFFSET (−240…1440) ; TOL (0…240) ; TITLE_MAX ; REFS : les sortes de repère (takeoff, order, point, event, drawer).
//   read(doc) → les événements de la séance : [{ i (la place dans le fichier, −1 pour un neuf), id, title, text (la consigne), place,
//     teams [lettres A à Y], refKind, refId, offset (minutes, ou null : l'heure de la V2 non lue), early, late (tolérance, minutes),
//     imposed, legacy, at (l'heure telle que le fichier l'écrit) }].
//   withFlow(doc, entries) → un NOUVEAU document : les événements de `entries`, écrits là où le fichier les porte, avec leurs clés
//     (id, title, text, place, teams, ref, offset_min, tol_early_min, tol_late_min, imposed) et le miroir lisible `at` pour la V2
//     (« H+45 », « H-15 », « EV-1+10 ») ; un événement inchangé n'est pas touché ; un événement qui n'est plus dans `entries` est retiré.
//   withEvent(doc, ev) / withoutEvent(doc, id) → le document avec cet événement posé (remplacé s'il porte le même id) / retiré (ceux
//     qui le prenaient pour repère gardent leur heure, comptée depuis le décollage).
//   nextEventId(doc, entries = []) → le premier EV-n que ni le fichier ni les lignes ne portent ; '' au-delà de 999.
//   blank(doc, entries) → un événement neuf (au décollage, sans tolérance) ; null au-delà de EVENTS_MAX ou sans identifiant libre.
//   plannedOf(doc) → Map id → minutes | null (MS.plannedMin ; vide sans lecteur).
//   without(entries, n, planned) → les lignes sans la n-ième ; ses dépendants prennent pour repère le décollage, à l'heure qu'ils avaient.
//   rows(doc, entries, drawers, t) → [{ kind: 'event'|'drawer', n (la place dans `entries`, −1 pour un tiroir), id, under, min (l'heure
//     prévue ou de repli, null si inconnue), when, tol, title, sub, teams [lettres], imposed }] — TRIÉES PAR L'HEURE (null à la fin), les
//     tiroirs gardent leur ordre entre eux, un événement dont le repère est un tiroir vient juste sous lui (under) ; `t(clé, valeurs)` :
//     les textes de editor_flow_texts.js.
//   whenOf(entry, ctx, t) → « H+45 », « H-15 », « ordre + 5 », « Point un + 10 », « ROMEO + 10 », « Rendez-vous a… + 10 », « T2 + 20 » (ctx : { drawers,
//     entries, places } ; jamais l'identifiant d'un événement : refName) ;
//     tolOf(entry, t) → « ± 10 min », « −2 / +5 min », « imposée », ''.
//   targets(doc, entries, n, drawers, kind) → les repères qu'on peut choisir pour la sorte `kind` : [{ id, label }] — jamais l'événement
//     lui-même ni un événement qui en dépend (un cycle n'est jamais proposé) ; 'point' : les lieux de la mission (placesOf).
//   teamLetters(doc) → [{ letter, name }] : les équipes de la mission, A à Y.
//   orderOf(doc) → les minutes avant le décollage ou '' ; orderStorable(doc) ; withOrder(doc, n) → timeline.order_offset_min = −n (effacé si n est vide).
//   mirror(entry) → le miroir `at` d'une ligne ('' quand l'heure n'est pas lue).
import * as MS from '../../frame/lib/mission.js';
import * as ED from './editor.js';

export const ID_RE = /^EV-\d{1,3}$/;
export const OFFSET = Object.freeze([-240, 1440]);
export const TOL = Object.freeze([0, 240]);
export const TITLE_MAX = 120;
export const TEXT_MAX = 500;
export const REFS = Object.freeze(['takeoff', 'order', 'point', 'event', 'drawer']);

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXY';
const plain = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
const str = (v, n) => typeof v === 'string' ? ED.cut(v, n) : typeof v === 'number' && Number.isFinite(v) ? String(v).slice(0, n) : '';
/** Un nombre entier ramené dans ses bornes ; null quand ce n'est pas un nombre (une saisie vide). */
const int = (v, [lo, hi]) => {
  if (v === '' || v === null || v === undefined || typeof v === 'boolean') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : null;
};
/** Un identifiant de repère sûr (jamais « __proto__ », jamais un texte libre). */
const refIdOk = (kind, id) => kind === 'drawer' ? /^[B-M]$/.test(id) : kind === 'event' ? ID_RE.test(id) : kind === 'point' ?
  /^[\w-]{1,40}$/.test(id) &&
  id !== '__proto__' : false;
const teamsOk = v => [...new Set((Array.isArray(v) ? v : []).map(x => String(x).toUpperCase()).filter(x => x.length === 1 && LETTERS
  .includes(x)))].sort();

/** Les heures prévues du fichier (MS.plannedMin) : Map id → minutes | null ; vide sans lecteur. */
export function plannedOf(doc) {
  try {
    const m = MS.plannedMin?.(doc);
    return m instanceof Map ? m : new Map();
  } catch {
    return new Map();
  }
}

/** Une ligne du lecteur (MS.readEvents) en ligne de séance, bornée. `at` : l'heure telle que le fichier l'écrit. */
function entryOf(r, i, at) {
  r = plain(r);
  const ref = plain(r.ref),
    kind = REFS.includes(ref.kind) ? ref.kind : 'takeoff',
    id = typeof ref.id === 'string' ? ref.id : '',
    title = str(r.title, TITLE_MAX),
    text = str(r.text, TEXT_MAX);
  return {
    i,
    id: ID_RE.test(r.id) ? r.id : '',
    title,
    text: title && text === title ? '' : text, // la consigne vide s'écrit comme le titre pour que la V2 ait quelque chose à dire (compose)
    place: str(r.place, 40).toUpperCase(),
    teams: teamsOk(r.teams),
    refKind: kind,
    refId: refIdOk(kind, id) ? id : '',
    offset: Number.isInteger(r.offsetMin) ? int(r.offsetMin, OFFSET) : null,
    early: int(r.tolEarlyMin, TOL) ?? 0,
    late: int(r.tolLateMin, TOL) ?? 0,
    imposed: r.imposed === true,
    legacy: r.legacy === true,
    at: str(at, 20)
  };
}

export function read(doc) {
  const raw = ED.eventsOf(doc);
  let list = null;
  try {
    list = typeof MS.readEvents === 'function' ? MS.readEvents(doc) : null;
  } catch {
    list = null;
  }
  // sans lecteur : les lignes du fichier, l'heure de la V2 dite telle quelle (« ancienne »), rien de plus
  if (!Array.isArray(list)) list = raw.map(r => ({
    title: '',
    text: r.text,
    place: r.place,
    legacy: true
  }));
  // une entrée par entrée du fichier, dans son ordre, chacune avec `i` (son indice) : on s'appuie sur `i`, jamais sur la place dans le tableau
  return list.slice(0, ED.EVENTS_MAX).map((r, k) => {
    const i = Number.isInteger(plain(r).i) && r.i >= 0 ? r.i : k;
    return entryOf(r, i, raw[i]?.at ?? '');
  });
}

/** La forme que la V2 lira d'une ligne : « H+45 », « H-15 », « H », « EV-1+10 », « B+20 », « ORDER-5 », « ROMEO+10 » ; '' sans heure lue. */
export function mirror(e) {
  if (!e || !Number.isInteger(e.offset)) return '';
  const base = e.refKind === 'takeoff' ? 'H' : e.refKind === 'order' ? 'ORDER' : refIdOk(e.refKind, e.refId) ? e.refId : '';
  if (!base) return '';
  return e.offset === 0 ? base : `${base}${e.offset < 0 ? '-' : '+'}${Math.abs(e.offset)}`;
}

/** Le premier EV-n libre (le fichier, puis les lignes de la séance) ; '' au-delà de 999. */
export function nextEventId(doc, entries) {
  // jamais un EV-n déjà ÉCRIT dans le fichier, même celui d'un doublon que le lecteur renvoie sous « ＠<i> »
  const used = new Set([...read(doc).map(e => e.id), ...ED.eventsRawOf(doc).map(e => e.id), ...(Array.isArray(entries) ? entries : []).map(
    e => plain(e).id)]);
  for (let n = 1; n <= 999; n++)
    if (!used.has(`EV-${n}`)) return `EV-${n}`;
  return '';
}

/** Un événement neuf : au décollage, sans tolérance, sans lieu, pour tout le monde. */
export function blank(doc, entries) {
  const list = Array.isArray(entries) ? entries : read(doc),
    id = nextEventId(doc, list);
  return list.length >= ED.EVENTS_MAX || !id ? null : {
    i: -1,
    id,
    title: '',
    text: '',
    place: '',
    teams: [],
    refKind: 'takeoff',
    refId: '',
    offset: 0,
    early: 0,
    late: 0,
    imposed: false,
    legacy: false,
    at: ''
  };
}

/** Ce qui compte pour dire qu'une ligne a été retouchée (`at` et `legacy` viennent du fichier, ils ne se retouchent pas). */
const core = e => JSON.stringify({
  ...plain(e),
  at: 0,
  legacy: 0
});

/** L'objet du fichier d'une ligne retouchée : les autres clés gardées, celles du déroulé réécrites (une valeur vide retire sa clé). */
function compose(base, e, id) {
  const o = {
      ...plain(base)
    },
    set = (k, v) => {
      if (v === '' || v === null || v === undefined || v === false || Array.isArray(v) && !v.length) delete o[k];
      else o[k] = v;
    },
    tk = ['text', 'description', 'label'].find(k => typeof o[k] === 'string' && o[k].trim()) || 'text',
    title = str(e.title, TITLE_MAX),
    kind = REFS.includes(e.refKind) ? e.refKind : 'takeoff',
    refId = refIdOk(kind, e.refId) ? e.refId : '',
    ref = kind === 'takeoff' ? '' : kind === 'order' ? 'order' : refId ? `${kind}:${refId}` : '',
    off = int(e.offset, OFFSET),
    flat = {
      refKind: ref ? kind : 'takeoff',
      refId: ref ? refId : '',
      offset: off
    };
  set('id', id);
  set('title', title);
  set(tk, str(e.text, TEXT_MAX) ||
    title); // la V2 lit `text` : sans consigne, le titre ; le lecteur de la suite n'y voit pas de consigne (entryOf)
  set('place', str(e.place, 40).toUpperCase());
  set('teams', teamsOk(e.teams));
  set('ref', ref);
  set('offset_min', off);
  set('tol_early_min', int(e.early, TOL) || '');
  set('tol_late_min', int(e.late, TOL) || '');
  set('imposed', e.imposed === true);
  const at = mirror({
    ...flat
  });
  if (at) o.at = at; // une heure de la V2 non lue (off null) reste telle quelle tant que l'auteur n'a pas choisi de repère
  return o;
}

export function withFlow(doc, entries) {
  const out = structuredClone(plain(doc));
  try {
    if (!ED.eventsStorable(doc)) return out;
    const prev = read(doc),
      list = (Array.isArray(entries) ? entries : []).slice(0, ED.EVENTS_MAX),
      raw = ED.eventsRawOf(doc);
    const byI = new Map(prev.map(x => [x.i, x]));
    if (JSON.stringify(list.map(core)) === JSON.stringify(prev.map(core)) && list.every((e, k) => plain(e).i === prev[k]?.i)) return out;
    const used = new Set([...list.map(e => plain(e).id), ...raw.map(r => r.id)].filter(id => ID_RE.test(id))),
      objs = list.map(e => {
        e = plain(e);
        const was = Number.isInteger(e.i) && e.i >= 0 ? byI.get(e.i) : null;
        if (was && core(was) === core(e) && raw[e.i]) return structuredClone(raw[e.i]); // inchangé : l'objet du fichier
        let id = ID_RE.test(e.id) ? e.id : '';
        if (!id) { // une ligne de la V2 retouchée reçoit son identifiant (les autres la citeront)
          for (let n = 1; n <= 999 && !id; n++)
            if (!used.has(`EV-${n}`)) id = `EV-${n}`;
          if (id) used.add(id);
        }
        return compose(Number.isInteger(e.i) && e.i >= 0 ? raw[e.i] : {}, e, id);
      });
    return ED.withEventObjects(doc, objs);
  } catch {
    return out;
  }
}

/** Les lignes sans la n-ième ; les événements qui la prenaient pour repère prennent le décollage, à l'heure qu'ils avaient (`plan` :
 *  l'heure prévue de chacun avant le retrait, MS.plannedMin ; sans elle, au décollage même). */
export function without(entries, n, plan = new Map()) {
  const list = Array.isArray(entries) ? entries : [],
    gone = plain(list[n]).id;
  return list.filter((_, k) => k !== n).map(e => e.refKind === 'event' && gone && e.refId === gone ? {
    ...e,
    refKind: 'takeoff',
    refId: '',
    offset: int(plan.get(e.id), OFFSET) ?? 0
  } : e);
}

export function withEvent(doc, ev) {
  const list = read(doc),
    k = ev && ev.id ? list.findIndex(e => e.id === ev.id) : -1;
  return withFlow(doc, k >= 0 ? list.map((e, j) => j === k ? {
    ...ev,
    i: e.i
  } : e) : [...list, {
    ...ev,
    i: -1
  }]);
}

export function withoutEvent(doc, id) {
  const list = read(doc),
    k = list.findIndex(e => e.id === id);
  return k < 0 ? structuredClone(plain(doc)) : withFlow(doc, without(list, k, plannedOf(doc)));
}

/** Les équipes de la mission, nommées par leur lettre (A à Y, dans l'ordre du fichier). */
export const teamLetters = doc => ED.teamsOf(doc).slice(0, LETTERS.length).map((t, i) => ({
  letter: LETTERS[i],
  name: t.name || LETTERS[i]
}));

/** L'heure d'une ligne (voir l'en-tête). ctx.drawers : les tiroirs de la séance (leur rang nomme « T2 »). */
export function whenOf(e, ctx, t) {
  if (!Number.isInteger(e.offset)) return e.at || '—'; // l'heure de la V2 non lue : telle que le fichier l'écrit
  const n = e.offset;
  if (e.refKind === 'takeoff') return n === 0 ? 'H' : `H${n < 0 ? '-' : '+'}${Math.abs(n)}`;
  const name = refName(e, ctx, t);
  return n === 0 ? name : `${name} ${n < 0 ? '−' : '+'} ${Math.abs(n)}`;
}

/** Le nom d'un lieu de la mission (`id` : son identifiant ; ctx.places : placesOf) : son nom, sinon l'identifiant. */
const placeName = (ctx, id) => {
  const p = (ctx?.places || []).find(x => x.id && x.id.toUpperCase() === String(id).toUpperCase());
  return p?.name || String(id || '');
};

/** Un titre coupé à quatorze signes, « … » compris (« Rendez-vous a… ») ; entier jusqu'à quatorze. */
const short = v => v.length > 14 ? `${v.slice(0, 13).trimEnd()}…` : v;

/** Le repère d'une ligne dit pour l'auteur — JAMAIS l'identifiant d'un événement : un autre événement par le NOM de son lieu s'il en a un, sinon
 *  son titre coupé (« ROMEO », « Rendez-vous a… ») ; un tiroir par son rang (« T2 ») ; un point par son nom ; l'ordre (« ordre »).
 *  ctx : { drawers, entries, places }. */
export function refName(e, ctx, t) {
  if (e.refKind === 'order') return t('flOrder');
  if (e.refKind === 'point') return placeName(ctx, e.refId);
  if (e.refKind === 'drawer') {
    const k = (ctx?.drawers || []).findIndex(d => d.id === e.refId);
    return `${t('flDrawerShort')}${k >= 0 ? k + 1 : ''}`;
  }
  const o = (ctx?.entries || []).find(x => x.id && x.id === e.refId);
  return o ? o.place ? placeName(ctx, o.place) : short(o.title || o.text || t('flNoTitle')) : t('flNoTitle');
}

/** La tolérance d'une ligne (voir l'en-tête). */
export function tolOf(e, t) {
  if (e.imposed) return t('flImposedTag');
  if (!e.early && !e.late) return '';
  return e.early === e.late ? t('flTolSame', {
    a: e.early
  }) : t('flTolDiff', {
    a: e.early,
    b: e.late
  });
}

/** Le déroulé : les événements et les tiroirs, TRIÉS PAR L'HEURE (voir l'en-tête). `drawers` : les lignes de tiroir de la séance
 *  (editor_drawers.js drawerRowsOf). */
export function rows(doc, entries, drawers, t, places = ED.placesOf(doc)) {
  const plan = plannedOf(doc),
    ctx = {
      drawers,
      entries,
      places
    },
    evs = (Array.isArray(entries) ? entries : []).map((e, n) => ({
      kind: 'event',
      n,
      id: e.id,
      min: e.id && Number.isFinite(plan.get(e.id)) ? plan.get(e.id) : null,
      when: whenOf(e, ctx, t),
      tol: tolOf(e, t),
      title: e.title || e.text || t('flNoTitle'),
      sub: [e.place || t('flNoPlace'), e.title && e.text ? e.text : ''].filter(Boolean).join(' · '),
      teams: e.teams,
      imposed: e.imposed,
      parent: e.refKind === 'drawer' && (drawers || []).some(d => d.id === e.refId) ? e.refId : ''
    })),
    dws = (Array.isArray(drawers) ? drawers : []).map((d, k) => {
      const fb = Number.isFinite(plan.get(d.id)) ? plan.get(d.id) : null;
      return {
        kind: 'drawer',
        n: -1,
        id: d.id,
        min: fb,
        when: t('flKeyWord'),
        tol: fb !== null ? t('flFallback', {
          n: fb
        }) : '',
        title: `${t('flDrawerTitle', { n: k + 1 })}${d.title ? ` · ${d.title}` : ''}`,
        sub: d.said || '',
        teams: teamsOk(d.teams),
        imposed: false,
        parent: ''
      };
    }),
    // le tri : par l'heure (null à la fin, l'ordre d'origine entre égaux) ; les tiroirs gardent entre eux leur ordre d'origine
    top = [...evs.filter(r => !r.parent), ...dws].sort((a, b) => (a.min === null) - (b.min === null) || (a.min ?? 0) - (b.min ?? 0)),
    slots = top.map((r, k) => r.kind === 'drawer' ? k : -1).filter(k => k >= 0);
  slots.forEach((k, j) => {
    top[k] = dws[j];
  });
  return top.flatMap(r => [{
    ...r,
    under: false
  }, ...(r.kind === 'drawer' ? evs.filter(x => x.parent === r.id).map(x => ({
    ...x,
    under: true
  })) : [])]);
}

/** Les repères qu'on peut choisir (voir l'en-tête). */
export function targets(doc, entries, n, drawers, kind) {
  const list = Array.isArray(entries) ? entries : [],
    me = plain(list[n]).id;
  if (kind === 'drawer') return (drawers || []).map((d, k) => ({
    id: d.id,
    label: d.title || `${d.id}`,
    rank: k + 1
  }));
  if (kind === 'point') return ED.placesOf(doc).filter(p => p.id && !['dep', 'arr'].includes(p.kind)).map(p => ({
    id: p.id,
    label: p.name || p.id
  }));
  if (kind !== 'event') return [];
  let dep = [];
  try {
    dep = me ? MS.eventDependents?.(doc, me) || [] : [];
  } catch {
    dep = [];
  }
  return list.filter((e, k) => k !== n && e.id && !dep.includes(e.id)).map(e => ({
    id: e.id,
    label: e.title || (e.place ? ED.placesOf(doc).find(p => p.id && p.id.toUpperCase() === e.place)?.name || e.place : e.text.slice(0,
      40)) // jamais l'identifiant
  }));
}

/** Le temps de réception de l'ordre, en minutes AVANT le décollage (timeline.order_offset_min = −n) : un nombre, ou '' quand il n'est pas donné. */
export const orderOf = doc => {
  const v = plain(plain(doc).timeline).order_offset_min;
  return Number.isFinite(v) && v <= 0 ? Math.min(1440, Math.round(-v)) : '';
};

/** Vrai quand la mission peut porter `timeline.order_offset_min` (une chronologie en liste ou un texte nu ne le peut pas). */
export const orderStorable = doc => {
  const t = plain(doc).timeline;
  return t === undefined || t === null || !!t && typeof t === 'object' && !Array.isArray(t);
};

/** Le document avec le temps de réception de l'ordre posé (`n` minutes avant le décollage, 0 à 1 440) ou effacé (`n` vide). */
export function withOrder(doc, n) {
  const out = structuredClone(plain(doc));
  if (!orderStorable(out)) return out;
  const v = n === '' || n === null || n === undefined ? null : int(n, [0, 1440]),
    tl = {
      ...plain(out.timeline)
    };
  if (v === null) delete tl.order_offset_min;
  else tl.order_offset_min = -v;
  if (Object.keys(tl).length) out.timeline = tl;
  else delete out.timeline;
  return out;
}
