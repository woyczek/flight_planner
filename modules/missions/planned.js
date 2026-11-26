// V3 missions — « Prévu » du bloc « Suite de la mission » du pilote (SOG-0620, lot 3) : les ÉVÉNEMENTS que le pilote voit (MS.pilotView, qui
// cache déjà celui dont le repère est un tiroir fermé), rangés par l'heure, chacun avec son heure — une heure d'horloge (« 14:45Z ») dès que son
// repère est connu, sinon l'heure prévue après le décollage (« H+45 ») —, l'équipe en puces (la mienne pleine, les autres au trait) et, pour
// MON équipe seulement (ou un événement sans équipe), une ligne d'état. La maquette : modules/missions/maquette/deroule.html, scène (e).
//
// Les constats sont ceux du juge (drawers_run.js constatsOf : tenu à, passé à, temps restant) ; le lecteur de la suite donne les heures
// (MS.eventTimes, MS.plannedMin) et les tolérances (readEvents : tolEarlyMin, tolLateMin). Chaque appel est gardé : sans ce lecteur, ou
// sans événement, il n'y a PAS de section « Prévu ». Les textes sont en français seulement (SOG-0680 : la traduction suit).
//
// API : plannedBlock(w, c, view, o) → { html, before } : `html` la section (ou '') ; `before` les événements constatés plus anciens que le
//   dernier — { key, at, title, body } — que « Avant » reprend avec leur heure. w : la vue (w.tt) ; c : le contrôleur (drawers_run.js stateOf) ;
//   view : le résultat de pilotView ; o : { orderReadAt (ms | null), opened (les tiroirs ouverts : { id, at }), now (ms) }.
//   model(c, view, o) → le même calcul sans texte : { upcoming: [ligne], before: [ligne], fold: [ligne] } (une ligne : { id, title, atMs,
//   clock, rel, imposed, teams, own, heldMs, lateMin, inTol, etaMin, soon, after }).

import * as RUN from './drawers_run.js';
import * as MS from '../../frame/lib/mission.js';
import {
  fmtZ
} from '../../frame/lib/time.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

/** Les textes de « Prévu » : le français seulement ; les autres langues retombent sur lui (frame/app.js t). */
export const PTX = {
  kick: ['Prévu'],
  imposed: ['heure imposée'],
  held: ['tenu à {t}'],
  lateN: ['{n} min de retard'],
  earlyN: ['{n} min d\'avance'],
  inTol: ['dans la tolérance'],
  outTol: ['hors tolérance'],
  eta: ['sur site dans {n} min'],
  etaLate: ['en retard de {m} min'],
  soon: ['dans {n} min'],
  after: ['{k} min après {r} tenu'],
  more: ['{n} autre(s)'],
  untitled: ['Événement sans titre']
};

/** Une valeur d'un résultat qui est une Map ou un objet d'identifiants (le lecteur rend l'un ou l'autre) ; une clé PROPRE seulement. */
const pick = (m, id) => m instanceof Map ? m.get(id) : m && typeof m === 'object' && Object.hasOwn(m, id) ? m[id] : undefined;

/** Les relevés de constat en objet d'identifiants, bornés (le lecteur les attend ainsi). */
const asObject = m => Object.fromEntries([...m].slice(0, 100));

/** Un instant ISO, ou null. */
const iso = ms => Number.isFinite(ms) ? new Date(ms).toISOString() : null;

export function model(c, view, o = {}) {
  try {
    const evs = Array.isArray(view?.events) ? view.events.slice(0, 60) : [],
      times = typeof MS.eventTimes === 'function' && evs.length ? (() => {
        const k = RUN.constatsOf(c),
          open = {};
        for (const d of Array.isArray(o.opened) ? o.opened : []) open[d.id] = iso(d.at);
        return MS.eventTimes(c.mission, {
          takeoffAt: c.startIso || null,
          orderReadAt: iso(o.orderReadAt),
          passed: asObject(k.passed),
          held: asObject(k.held),
          drawersOpenAt: open
        });
      })() : null;
    if (!evs.length || !times) return {
      upcoming: [],
      before: [],
      fold: []
    };
    const k = RUN.constatsOf(c),
      letter = RUN.ownLetter(c),
      plan = typeof MS.plannedMin === 'function' ? MS.plannedMin(c.mission) : null,
      takeoff = Date.parse(c.startIso || ''),
      now = Number.isFinite(o.now) ? o.now : Date.now(),
      byId = new Map(evs.map(e => [e.id, e])),
      lines = evs.map(e => {
        const t = pick(times, e.id) || {},
          atMs = Date.parse(t.plannedAt || ''),
          rel = plan ? pick(plan, e.id) : null,
          own = RUN.isOwnEvent(e, letter),
          heldMs = own && k.held.has(e.id) ? Date.parse(k.held.get(e.id)) : null,
          late = heldMs !== null && Number.isFinite(atMs) ? Math.round((heldMs - atMs) / 60000) : null,
          eta = own && heldMs === null ? k.eta.get(e.id) : undefined,
          refEv = e.ref?.kind === 'event' ? byId.get(e.ref.id) : null;
        return {
          id: e.id,
          title: String(e.title || e.text || ''),
          atMs: Number.isFinite(atMs) ? atMs : null,
          clock: t.clock === true && Number.isFinite(atMs),
          rel: Number.isFinite(rel) ? rel : null,
          imposed: t.imposed === true || e.imposed === true,
          teams: Array.isArray(e.teams) ? e.teams : [],
          own,
          // le constat PARTAGÉ d'un événement d'une autre équipe (les carnets des autres pilotes, l'heure la plus ancienne) : « tenu à » seulement
          sharedMs: !own && c.shared?.get(e.id) !== undefined ? c.shared.get(e.id) : null,
          heldMs: Number.isFinite(heldMs) ? heldMs : null,
          lateMin: late,
          inTol: late === null ? null : late <= (e.tolLateMin || 0) && late >= -(e.tolEarlyMin || 0),
          etaMin: Number.isFinite(eta) ? eta : null,
          etaLate: Number.isFinite(eta) && Number.isFinite(atMs) ? Math.max(0, Math.round((now + eta * 60000 - atMs) / 60000)) : null,
          soon: own && heldMs === null && Number.isFinite(atMs) && atMs > now ? Math.max(1, Math.round((atMs - now) / 60000)) : null,
          after: refEv && Number.isFinite(e.offsetMin) && e.offsetMin > 0 && k.held.has(refEv.id) ? {
            k: e.offsetMin,
            r: String(refEv.title || refEv.text || '')
          } : null,
          key: Number.isFinite(atMs) ? atMs : Number.isFinite(rel) && Number.isFinite(takeoff) ? takeoff + rel * 60000 : Infinity
        };
      }).sort((a, b) => a.key - b.key),
      done = lines.filter(l => l.heldMs !== null),
      last = done.at(-1) || null,
      rest = lines.filter(l => l.heldMs === null),
      shown = [...(last ? [last] : []), ...rest.slice(0, 2)];
    return {
      upcoming: shown,
      before: done.slice(0, -1),
      fold: rest.slice(2)
    };
  } catch {
    return {
      upcoming: [],
      before: [],
      fold: []
    };
  }
}

/** L'heure d'une ligne : « 14:45Z » une fois le repère connu, sinon « H+45 » (ou « H-15 ») ; '' sans heure du tout. */
function whenOf(l) {
  if (l.clock) return fmtZ(new Date(l.atMs));
  return l.rel === null ? '' : l.rel === 0 ? 'H' : `H${l.rel < 0 ? '-' : '+'}${Math.abs(l.rel)}`;
}

/** La ligne d'état d'un événement de MON équipe (ou de toutes) ; '' quand il n'y a rien à dire. */
function stateOf(w, l) {
  const tx = (k, v) => w.tt(PTX[k], v);
  if (!l.own) return l.sharedMs !== null ? tx('held', {
    t: fmtZ(new Date(l.sharedMs))
  }) : ''; // une autre équipe : jamais d'état en direct, « tenu à » quand un carnet le dit
  if (l.heldMs !== null) {
    const late = l.lateMin;
    return `${tx('held', {
      t: fmtZ(new Date(l.heldMs))
    })}${late ? `, ${late > 0 ? tx('lateN', {
      n: late
    }) : tx('earlyN', {
      n: -late
    })}` : ''}${late && l.inTol !== null ? ` (${tx(l.inTol ? 'inTol' : 'outTol')})` : ''}`;
  }
  if (l.etaMin !== null) return `${tx('eta', {
    n: l.etaMin
  })}${l.etaLate ? ` : ${tx('etaLate', {
    m: l.etaLate
  })}` : ''}`;
  if (l.soon !== null) return `${tx('soon', {
    n: l.soon
  })}${l.after ? ` · ${tx('after', l.after)}` : ''}`;
  return '';
}

/** Les puces d'équipe : la mienne pleine (`mine`), les autres au trait (`other`) ; le nom vient de la mission, sinon la lettre. */
function chips(c, l) {
  const letter = RUN.ownLetter(c),
    teams = Array.isArray(c.mission?.teams) ? c.mission.teams : [];
  return l.teams.map(t => `<span class="pv-chip ${t === letter ? 'mine' : 'other'}">${esc(teams['ABCDEFGHIJKLMNOPQRSTUVWXY'.indexOf(t)]?.name || t)}</span>`).join('');
}

/** Une ligne de « Prévu » : l'heure, le titre (et « heure imposée »), les puces, l'état. */
function lineHtml(w, c, l) {
  const st = stateOf(w, l),
    title = l.title || w.tt(PTX.untitled);
  return `<div class="pv-line" data-pv="${esc(l.id)}"${l.heldMs !== null ? ' data-held' : ''}><b>${esc(whenOf(l))}</b><div>${esc(title)}${l.imposed ? ` · ${esc(w.tt(PTX.imposed))}` : ''} ${chips(c, l)}${st ? `<div class="pv-state f-muted" data-pv-state>${esc(st)}</div>` : ''}</div></div>`;
}

const STYLE = `<style>[data-dw-planned] .pv-line{display:grid;grid-template-columns:4.5em minmax(0,1fr);gap:8px;padding:4px 0}
[data-dw-planned] .pv-line>b{font-variant-numeric:tabular-nums}
[data-dw-planned] .pv-chip{display:inline-block;margin:0 4px 0 0;padding:0 6px;font-size:12px;border:1px solid var(--sog-border)}
[data-dw-planned] .pv-chip.mine{background:var(--sog-accent);border-color:var(--sog-accent);color:var(--sog-accent-fg,#fff)}
[data-dw-planned] .pv-state{font-size:var(--sog-size-s,14px)}</style>`;

export function plannedBlock(w, c, view, o = {}) {
  const m = model(c, view, o);
  if (!m.upcoming.length && !m.fold.length) return {
    html: '',
    before: []
  };
  const fold = m.fold.length ? `<details class="ms-more" data-pv-fold><summary class="f-muted">${esc(w.tt(PTX.more, {
    n: m.fold.length
  }))}</summary>${m.fold.map(l => lineHtml(w, c, l)).join('')}</details>` : '';
  return {
    html: `${STYLE}<section class="dw-planned" data-dw-planned><p class="dw-kick">${esc(w.tt(PTX.kick))}</p>${m.upcoming.map(l => lineHtml(w, c, l)).join('')}${fold}</section>`,
    before: m.before.map(l => ({
      key: `e:${l.id}`,
      at: l.heldMs,
      title: `${fmtZ(new Date(l.heldMs))} · ${l.title || w.tt(PTX.untitled)}`,
      body: `<p>${esc(stateOf(w, l))}</p>`
    }))
  };
}
