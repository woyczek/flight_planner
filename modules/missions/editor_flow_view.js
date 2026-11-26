// V3 missions — le bloc « Déroulé » de l'atelier (SOG-0620, lot 2) et la fiche d'un événement : les événements et les tiroirs rangés
// par l'heure (editor_flow.js rows), « ＋ Événement » et « ＋ Tiroir », puis, sous les lignes, la fiche de l'événement choisi (titre,
// consigne, heure prévue par un repère, tolérance, heure imposée, lieu, équipes, ce que le pilote lira). La maquette validée :
// modules/missions/maquette/deroule.html. Le bloc remplace la liste d'événements du groupe « Chronologie et cartes » de l'atelier
// (editor_view.js) ; une ligne de tiroir ouvre la fiche de tiroir EXISTANTE (data-do="edsel"), « ＋ Tiroir » la fenêtre des briques
// (data-do="edflowdrawer", jouée par editor_view.js : seul lui la connaît).
//
// L'état de la séance (s.ed) : `flow` (les lignes d'événement, editor_flow.js read ; absentes tant que le groupe n'est pas ouvert),
// `flowSel` (la ligne dont la fiche est ouverte, -1 sinon). Le document de la séance les prend par EF.withFlow (edDoc). Une retouche
// passe par les gestes de l'atelier — `h.draw` (le dessin, qui garde le brouillon), `h.refresh` (la frappe : sur place, le brouillon
// suit), `h.remember` (l'instantané d'avant un choix, un ajout, un retrait : « Annuler le geste » le rend), `h.clear` (une saisie vide
// l'historique, la règle de l'atelier) — que editor_view.js donne : h = { doc(e), shown(e, rows), drawers(e), draw(s), refresh(s), clear(e),
// remember(e), said(s, row) } (said : la clé du tiroir dite en clair, `trigger`).
//
// Le choix « Annoncé au brief » ⇄ « Caché jusqu'à un stimulus » (SOG-0620, lot 4) : sur la fiche d'un événement et sur celle d'un tiroir né d'un événement
// (`event_id`) ; editor_flow.js toDrawer / toEvent font le calcul, ici l'état de la séance (e.flow, e.drawers, e.sel) et « Annuler le geste ».
//
// API : flowHtml(s, h) → le bloc (une chaîne) ; input(s, ev, h) → une saisie ou un choix de la fiche (data-k="edflow") ; act(s, b, h) → vrai
//   quand le geste est celui du déroulé (edflowsel, edflowadd, edflowdel).
import * as ED from './editor.js';
import * as EF from './editor_flow.js';
import {
  EDTX
} from './editor_texts.js'; // dwMax : « Douze tiroirs au plus. »
import {
  FTX
} from './editor_flow_texts.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

/** Les règles du bloc, posées avec lui (le bloc se redessine : un seul <style>). Les teintes sont celles de la maquette. */
const STYLE = `<style>
[data-module="missions"] .fl{--ev:#0b6b5c;--ev-bg:#e3f4f0;--dw:#6b3fb8;--dw-bg:#f1ebfb}
[data-module="missions"] .fl-def{margin:0 0 8px}
[data-module="missions"] .fl-list{display:flex;flex-direction:column;gap:6px}
[data-module="missions"] .fl-row{display:grid;grid-template-columns:74px minmax(0,1fr);gap:8px;align-items:start;width:100%;min-height:44px;margin:0;padding:8px;text-align:left;border:1px solid var(--sog-line,#d0d5dd);border-left:4px solid var(--ev);background:var(--sog-surface,#fff);color:inherit;border-radius:0}
[data-module="missions"] .fl-row[data-kind="drawer"]{border-left-color:var(--dw)}
[data-module="missions"] .fl-row[data-under]{margin-left:40px;width:calc(100% - 40px);border-left-color:var(--dw)}
[data-module="missions"] .fl-row[aria-current="true"]{outline:2px solid var(--sog-accent,#1a6fd8);outline-offset:-2px}
[data-module="missions"] .fl-when{display:flex;flex-direction:column;min-width:0}
[data-module="missions"] .fl-what{display:flex;flex-direction:column;gap:2px;min-width:0}
[data-module="missions"] .fl-what>b{overflow-wrap:anywhere}
[data-module="missions"] .fl-sub{overflow-wrap:anywhere}
[data-module="missions"] .fl-kind{align-self:flex-start;font-size:12px;padding:0 6px;background:var(--ev-bg);color:var(--ev)}
[data-module="missions"] .fl-kind[data-kind="drawer"]{background:var(--dw-bg);color:var(--dw)}
[data-module="missions"] .fl-chips{display:flex;flex-wrap:wrap;gap:4px}
[data-module="missions"] .fl-chip{font-size:12px;padding:0 6px;border:1px solid var(--sog-line,#d0d5dd)}
[data-module="missions"] .fl-adds{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
[data-module="missions"] .fl-sheet{margin-top:10px;padding:10px;border:1px solid var(--sog-line,#d0d5dd);border-left:4px solid var(--ev);display:flex;flex-direction:column;gap:8px}
[data-module="missions"] .fl-sheet .f-field{margin:0}
[data-module="missions"] .fl-inline{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center}
[data-module="missions"] .fl-inline input[type="number"]{width:5.5em}
[data-module="missions"] .fl-teams{display:flex;flex-wrap:wrap;gap:6px 14px}
[data-module="missions"] .fl-teams label{display:inline-flex;gap:6px;align-items:center;min-height:44px}
[data-module="missions"] .fl-read{margin:0}
</style>`;

/** Le texte d'une clé du déroulé, dans la langue de l'écran. */
const tr = s => (k, v) => s.tt(FTX[k], v);

/** Ce que l'écran du déroulé lit de la séance : le document, les tiroirs, les lieux MONTRÉS, et les lignes telles que l'écran les dit (`live`) :
 *  le lieu et le repère « point » à l'identifiant d'AUJOURD'HUI (un lieu renommé dans les Lieux se lit renommé ici, un lieu retiré se lit
 *  « aucun lieu »), et, dans l'atelier voilé, un lieu caché se lit « aucun lieu » (la ligne de la séance garde l'identifiant du fichier,
 *  edDoc fait suivre le document). */
function ctxOf(e, h) {
  const doc = h.doc(e),
    places = h.shown(e, ED.placesOf(doc)).filter(Boolean),
    ids = new Set(places.map(p => p.id.toUpperCase())),
    ok = id => !e.veil || ids.has(String(id).toUpperCase()),
    live = x => {
      if (!x) return x;
      const place = x.place && e.places ? ED.refNow(x.place, e.base, e.places).toUpperCase() : x.place,
        refId = x.refKind === 'point' && x.refId && e.places ? ED.refNow(x.refId, e.base, e.places) : x.refId;
      return {
        ...x,
        place: place && ok(place) ? place : '',
        refId: x.refKind === 'point' && !ok(refId) ? '' : refId
      };
    };
  return {
    doc,
    places,
    drawers: e.veil ? [] : h.drawers(e),
    live,
    list: (e.flow || []).map(live),
    get entries() {
      return this.list;
    }
  };
}

/** Le tiroir `id` de la séance et son rang (1…), sinon null. */
const drawerOf = (drawers, id) => {
  const k = drawers.findIndex(d => d.id === id);
  return k < 0 ? null : {
    d: drawers[k],
    rank: k + 1
  };
};

/** Ce que dit le repère d'une ligne dans « Le pilote lira » : « le passage à ROMEO », « la réception de l'ordre », « le tiroir 2 » ; un autre
 *  événement par son titre (sans titre : le nom de son lieu) — jamais un identifiant d'événement. `c` : ctxOf. */
function refName(s, e, c) {
  if (e.refKind === 'order') return s.tt(FTX.fsRName_order);
  const t = tr(s);
  if (e.refKind === 'point') return s.tt(FTX.fsRName_point, {
    id: EF.refName(e, c, t)
  });
  if (e.refKind === 'drawer') return s.tt(FTX.fsRName_drawer, {
    n: drawerOf(c.drawers, e.refId)?.rank ?? ''
  });
  return c.list.find(x => x.id && x.id === e.refId)?.title || EF.refName(e, c, t);
}

/** « H+45 (± 10 min) » ou « 10 min après le rendez-vous (± 2 min) » : ce que le pilote lira de l'heure d'une ligne. */
function readWhen(s, e, c) {
  const t = tr(s),
    tol = EF.tolOf({
      ...e,
      imposed: false
    }, t),
    n = Number.isInteger(e.offset) ? e.offset : null;
  let when;
  if (n === null) when = e.at || '';
  else if (e.refKind === 'takeoff') when = EF.whenOf(e, c, t);
  else {
    const r = refName(s, e, c);
    when = n === 0 ? r : s.tt(n < 0 ? FTX.fsBefore : FTX.fsAfter, {
      n: Math.abs(n),
      r
    });
  }
  return `${when}${tol ? ` (${tol})` : ''}${e.imposed ? ` · ${t('flImposedTag')}` : ''}`;
}

/** La phrase « Le pilote lira : … » d'une ligne. */
const readLine = (s, e, c) => s.tt(FTX.fsRead, {
  t: `${readWhen(s, e, c)} · ${e.title || e.text || s.tt(FTX.flNoTitle)}`
});

/** Les lignes du déroulé (le contenu de [data-flowrows]). */
function rowsHtml(s, h) {
  const e = s.ed,
    c = ctxOf(e, h),
    t = tr(s),
    teams = new Map(EF.teamLetters(c.doc).map(x => [x.letter, x.name])),
    rows = EF.rows(c.doc, c.list, c.drawers, t, c.places);
  if (!rows.length) return `<p class="f-muted" data-noevent>${esc(s.tt(FTX.flNone))}</p>`;
  return rows.map(r => {
    const ev = r.kind === 'event',
      cur = ev ? e.flowSel === r.n : e.sel === r.id && (e.sel || 'start') !== 'start';
    return `<button type="button" class="fl-row" data-do="${ev ? 'edflowsel' : 'edsel'}" ${ev ? `data-n="${r.n}"` : `data-sel="${esc(r.id)}"`} data-kind="${r.kind}"${r.under ? ' data-under="1"' : ''}${cur ? ' aria-current="true"' : ''}>
      <span class="fl-when"><b>${esc(r.when)}</b><span class="f-muted">${esc(r.tol)}</span></span>
      <span class="fl-what"><span class="fl-kind" data-kind="${r.kind}">${esc(s.tt(ev ? FTX.flEvent : FTX.flDrawer))}</span><b>${esc(r.title)}</b>${r.sub ? `<span class="f-muted fl-sub">${esc(r.sub)}</span>` : ''}${r.teams.length ? `<span class="fl-chips">${r.teams.map(l => `<span class="fl-chip">${esc(teams.get(l) || l)}</span>`).join('')}</span>` : ''}</span></button>`;
  }).join('');
}

/** La fiche de l'événement choisi (sinon ''). */
function sheetHtml(s, h) {
  const e = s.ed,
    c = ctxOf(e, h),
    row = c.live(e.flow?.[e.flowSel]);
  if (!row) return '';
  const {
    doc,
    drawers,
    list
  } = c,
  opt = (v, label, cur) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`,
    places = h.shown(e, ED.placesOf(doc)).filter(p => p && p.id && !['dep', 'arr', 'object'].includes(p.kind)),
    place = e.veil && row.place && !places.some(p => p.id.toUpperCase() === row.place) ? '' : row.place,
    tg = EF.targets(doc, list, e.flowSel, drawers, row.refKind),
    // un repère que le fichier cite et que rien ne propose plus reste choisi (il ne disparaît pas en silence)
    tgs = row.refId && !tg.some(x => x.id === row.refId) ? [...tg, {
      id: row.refId,
      label: ''
    }] : tg,
    teams = EF.teamLetters(doc),
    num = (f, v, [lo, hi], label) => `<input type="number" inputmode="numeric" data-k="edflow" data-f="${f}" value="${Number.isInteger(v) ? v : ''}" min="${lo}" max="${hi}" step="1" aria-label="${esc(label)}">`,
    n = e.flowSel;
  return `<div class="fl-sheet" data-flowsheet="${n}"><span class="fl-kind">${esc(s.tt(FTX.flEvent))}</span><span class="f-muted">${esc(s.tt(FTX.fsKind))}</span>
    ${e.veil ? '' : choiceHtml(s, false, row.id ? EF.dependentCount(doc, e.flow, row.id) : 0, '')}
    <label class="f-field"><span class="ms-tlabel f-muted">${esc(s.tt(FTX.fsTitle))}</span><input data-k="edflow" data-f="title" value="${esc(row.title)}" maxlength="${EF.TITLE_MAX}" autocomplete="off"></label>
    <label class="f-field"><span class="ms-tlabel f-muted">${esc(s.tt(FTX.fsText))}</span><input data-k="edflow" data-f="text" value="${esc(row.text)}" maxlength="${EF.TEXT_MAX}" autocomplete="off"></label>
    <div class="f-field"><span class="ms-tlabel f-muted">${esc(s.tt(FTX.fsWhen))}</span><div class="fl-inline">
      <select data-k="edflow" data-f="refKind" aria-label="${esc(s.tt(FTX.fsRefAria))}">${EF.REFS.filter(k => k !== 'drawer' || drawers.length).map(k => opt(k, s.tt(FTX[`fsRef_${k}`]), row.refKind)).join('')}</select>
      ${['point', 'event', 'drawer'].includes(row.refKind) ? `<select data-k="edflow" data-f="refId" aria-label="${esc(s.tt(FTX.fsTarget))}">${opt('', '—', row.refId)}${tgs.map(x => opt(x.id, row.refKind === 'drawer' ? `${s.tt(FTX.flDrawerTitle, { n: x.rank ?? '' })}${x.label && x.label !== x.id ? ` · ${x.label}` : ''}` : x.label || s.tt(FTX.flNoTitle), row.refId)).join('')}</select>` : ''}
      <span>${esc(s.tt(FTX.fsPlus))}</span>${num('offset', row.offset, EF.OFFSET, s.tt(FTX.fsOffset))}<span>${esc(s.tt(FTX.fsMin))}</span></div>
      ${row.refKind === 'order' && EF.orderOf(doc) === '' ? `<span class="f-muted" data-floworder>${esc(s.tt(FTX.fsNoOrder))} <button type="button" class="f-linkbtn" data-do="edstep" data-step="cadre">${esc(s.tt(FTX.fsOpenCadre))}</button></span>` : ''}
      ${!Number.isInteger(row.offset) && row.at ? `<span class="f-muted" data-flowlegacy>${esc(s.tt(FTX.fsLegacy, { at: row.at }))}</span>` : ''}</div>
    <div class="f-field"><span class="ms-tlabel f-muted">${esc(s.tt(FTX.fsTol))}</span><div class="fl-inline"><span>${esc(s.tt(FTX.fsEarly))}</span>${num('early', row.early, EF.TOL, s.tt(FTX.fsEarly))}<span>${esc(s.tt(FTX.fsLate))}</span>${num('late', row.late, EF.TOL, s.tt(FTX.fsLate))}<span>${esc(s.tt(FTX.fsMin))}</span></div></div>
    <label class="fl-inline"><input type="checkbox" data-k="edflow" data-f="imposed"${row.imposed ? ' checked' : ''}><span>${esc(s.tt(FTX.fsImposed))}</span></label>
    <label class="f-field"><span class="ms-tlabel f-muted">${esc(s.tt(FTX.fsPlace))}</span><select data-k="edflow" data-f="place">${opt('', s.tt(FTX.fsNoPlace), place)}${[...places.map(p => [p.id.toUpperCase(), `${p.id}${p.name ? ` — ${p.name}` : ''}`]), ...(place && !places.some(p => p.id.toUpperCase() === place) ? [[place, place]] : [])].map(([v, l]) => opt(v, l, place)).join('')}</select></label>
    <div class="f-field"><span class="ms-tlabel f-muted">${esc(s.tt(FTX.fsTeams))}</span>${teams.length ? `<div class="fl-teams">${teams.map(x => `<label><input type="checkbox" data-k="edflow" data-f="team" data-l="${x.letter}"${row.teams.includes(x.letter) ? ' checked' : ''}><span>${esc(x.name)}</span></label>`).join('')}</div><span class="f-muted">${esc(s.tt(FTX.fsTeamsAll))}</span>` : `<span class="f-muted">${esc(s.tt(FTX.fsNoTeams))}</span>`}</div>
    <p class="fl-read f-muted" data-flowread>${esc(readLine(s, row, c))}</p>
    <div class="f-row"><button type="button" class="f-linkbtn" data-do="edflowdel" data-n="${n}">${esc(s.tt(FTX.fsDel))}</button></div></div>`;
}

/** Le choix « Annoncé au brief » ⇄ « Caché jusqu'à un stimulus » (une fiche d'événement : annoncé ; une fiche de tiroir né d'un événement : caché), et,
 *  quand des événements en dépendent, la phrase qui le dit AVANT le geste (jamais une question : un geste, annulable). */
function choiceHtml(s, hidden, deps, letter, lost = '') {
  const radio = (v, label) => `<label class="fl-inline"><input type="radio" name="flowhide${esc(letter)}" data-k="edflow" data-f="hide" data-letter="${esc(letter)}" value="${v}"${hidden === !!v ? ' checked' : ''}><span>${esc(s.tt(label))}</span></label>`;
  return `<div class="f-field" role="radiogroup" data-flowchoice>${radio(0, FTX.fsShown)}${radio(1, FTX.fsHidden)}${lost && hidden ? `<span class="f-muted" data-flowlost>${esc(s.tt(FTX[lost]))}</span>` : ''}${deps > 0 && !hidden ? `<span class="f-muted" data-flowdeps>${esc(s.tt(deps === 1 ? FTX.fsDep1 : FTX.fsDepN, { n: deps }))}</span>` : ''}</div>`;
}

/** Le choix sur la fiche d'un tiroir né d'un événement (editor_view.js l'appelle ; '' pour tout autre tiroir ou dans l'atelier voilé). */
export function switchHtml(s, row, h) {
  // ce que « Annoncé au brief » ne garde pas (le briefing, la suite de route) est dit AVANT le geste, au même endroit que les dépendants ; rien de perdu, rien dit
  const brief = !!String(row?.brief ?? '').trim(),
    route = Array.isArray(row?.route) && row.route.length > 0;
  return row?.eventId && !s.ed.veil ? choiceHtml(s, true, 0, row.id, brief && route ? 'fsLostBoth' : brief ? 'fsLostBrief' : route ?
    'fsLostRoute' : '') : '';
}

/** Le choix touché : un événement devient un tiroir (« Caché »), un tiroir né d'un événement redevient un événement (« Annoncé »). Un seul geste,
 *  « Annuler le geste » le défait ; douze tiroirs : la phrase d'avant, rien ne change. */
function toggle(s, t, h) {
  const e = s.ed,
    letter = String(t.dataset.letter || ''),
    hide = t.value === '1';
  if (e.veil) return;
  if (!e.flow) e.flow = EF.read(e.base);
  const doc = h.doc(e),
    rows = h.drawers(e);
  if (hide && !letter) {
    const row = e.flow[e.flowSel];
    if (!row) return;
    if (!row.id) row.id = EF.nextEventId(doc, e.flow); // un événement de la V2 reçoit son identifiant : le tiroir le garde (`event_id`)
    const res = EF.toDrawer(h.doc(e), e.flow, rows, row.id);
    if (!res) {
      s.ctx.notify?.(s.tt(EDTX.dwMax), 'info');
      return h.draw(s);
    }
    h.remember(e);
    Object.assign(e, {
      flow: res.entries,
      drawers: res.drawers,
      flowSel: -1,
      sel: res.letter,
      tab: 'itin',
      placeEdit: -1,
      mapSel: -1,
      itAt: '',
      drawerAsk: '',
      dopen: {},
      kinds: ''
    });
    const made = e.drawers.find(r => r.id === res.letter);
    if (made && h.said) made.said = h.said(s, made);
  } else if (!hide && letter) {
    const res = EF.toEvent(doc, e.flow, rows, letter);
    if (!res) return h.draw(s);
    h.remember(e);
    Object.assign(e, {
      flow: res.entries,
      drawers: res.drawers,
      flowSel: res.entries.length - 1,
      sel: 'start',
      tab: 'mission'
    });
  } else return;
  h.draw(s);
}

export function flowHtml(s, h) {
  const e = s.ed,
    doc = h.doc(e),
    storable = ED.eventsStorable(doc),
    full = (e.flow || []).length >= ED.EVENTS_MAX;
  return `${STYLE}<div class="fl ms-edsub" data-flow><h4>${esc(s.tt(FTX.flTitle))}</h4><p class="f-muted fl-def">${esc(s.tt(FTX.flDef))}</p>
    <div class="fl-list" data-flowrows>${rowsHtml(s, h)}</div>
    ${!storable ? `<p class="f-muted" data-evnohome>${esc(s.tt(FTX.flNoHome))}</p>` : `<div class="fl-adds">${full ? `<p class="f-muted">${esc(s.tt(FTX.flFull))}</p>` : `<button type="button" data-do="edflowadd">${esc(s.tt(FTX.flAddEvent))}</button>`}${e.veil ? '' : `<button type="button" data-do="edflowdrawer">${esc(s.tt(FTX.flAddDrawer))}</button>`}</div>`}
    ${sheetHtml(s, h)}</div>`;
}

/** Les lignes et la phrase du pilote redessinées sur place (une frappe ne remplace jamais le champ en main). */
function showLive(s, h) {
  const e = s.ed,
    rows = s.el.querySelector('[data-flowrows]'),
    c = ctxOf(e, h),
    row = c.live(e.flow?.[e.flowSel]),
    html = rowsHtml(s, h);
  if (rows && rows.innerHTML !== html) rows.innerHTML = html;
  const read = s.el.querySelector('[data-flowread]');
  if (read && row) {
    const txt = readLine(s, row, c);
    if (read.textContent !== txt) read.textContent = txt;
  }
}

export function input(s, ev, h) {
  const e = s.ed,
    t = ev.target,
    f = t?.dataset?.f,
    row = e.flow?.[e.flowSel];
  if (f === 'hide') return ev.type === 'change' || t.type === 'radio' ? toggle(s, t, h) : undefined;
  if (f === 'order') { // « Ordre reçu » du Cadre : timeline.order_offset_min = −n ; vide, la clé est effacée
    const v = String(t.value ?? '').trim(),
      n = Number(v);
    e.orderMin = v === '' || !Number.isFinite(n) ? '' : Math.min(1440, Math.max(0, Math.round(n)));
    h.clear(e);
    h.refresh(s);
    return showLive(s, h);
  }
  if (!row || !f) return;
  const doc = h.doc(e),
    drawers = e.veil ? [] : h.drawers(e);
  let soft = false;
  if (f === 'title' || f === 'text') {
    row[f] = String(t.value ?? '').slice(0, f === 'title' ? EF.TITLE_MAX : EF.TEXT_MAX);
    soft = true;
  } else if (f === 'offset') {
    const v = String(t.value ?? '').trim(),
      n = Number(v);
    row.offset = v === '' || !Number.isFinite(n) ? null : Math.min(EF.OFFSET[1], Math.max(EF.OFFSET[0], Math.round(n)));
    soft = true;
  } else if (f === 'early' || f === 'late') {
    const n = Number(t.value);
    row[f] = Number.isFinite(n) && t.value !== '' ? Math.min(EF.TOL[1], Math.max(EF.TOL[0], Math.round(n))) : 0;
    soft = true;
  } else if (f === 'imposed') {
    h.remember(e);
    row.imposed = t.checked === true;
  } else if (f === 'refKind') {
    if (!EF.REFS.includes(t.value) || t.value === row.refKind) return;
    h.remember(e);
    row.refKind = t.value;
    row.refId = EF.targets(doc, e.flow, e.flowSel, drawers, row.refKind)[0]?.id || ''; // la première cible proposée, jamais une cible vide
    if (!Number.isInteger(row.offset)) row.offset = 0; // choisir un repère, c'est lire l'heure : plus d'« ancienne »
  } else if (f === 'refId') {
    if (!EF.targets(doc, e.flow, e.flowSel, drawers, row.refKind).some(x => x.id === t.value) && t.value !== '') return;
    h.remember(e);
    row.refId = t.value;
  } else if (f === 'place') {
    // atelier voilé : seul un lieu montré (ou aucun) se choisit — une page forgée ne pose pas un lieu caché
    const v = String(t.value ?? '').toUpperCase();
    if (v && e.veil && !h.shown(e, ED.placesOf(doc)).some(p => p && p.id && p.id.toUpperCase() === v)) return;
    h.remember(e);
    row.place = v;
  } else if (f === 'team') {
    const l = String(t.dataset.l || ''),
      on = new Set(row.teams);
    if (!EF.teamLetters(doc).some(x => x.letter === l)) return;
    h.remember(e);
    if (t.checked) on.add(l);
    else on.delete(l);
    row.teams = [...on].sort();
  } else return;
  if (soft) h.clear(e); // une saisie vide l'historique (la règle de l'atelier) ; un choix, lui, s'annule (h.remember, avant)
  if (!soft) return h.draw(s);
  h.refresh(s);
  showLive(s, h);
}

export function act(s, b, h) {
  const e = s.ed,
    what = b.dataset.do;
  if (!['edflowsel', 'edflowadd', 'edflowdel'].includes(what)) return false;
  if (!e.flow) e.flow = EF.read(e.base);
  const n = Number(b.dataset.n);
  if (what === 'edflowsel') {
    if (!(n >= 0 && n < e.flow.length)) return true;
    e.flowSel = e.flowSel === n ? -1 : n; // une seule fiche ouverte : celle d'un tiroir se ferme
    if (e.flowSel >= 0) e.sel = 'start';
    h.draw(s);
    s.el.querySelector('[data-flowsheet] [data-f=title]')?.focus?.({
      preventScroll: true
    });
    return true;
  }
  if (what === 'edflowadd') {
    const ev = EF.blank(h.doc(e), e.flow);
    if (!ev || !ED.eventsStorable(h.doc(e))) return true;
    h.remember(e);
    e.flow = [...e.flow, ev];
    e.flowSel = e.flow.length - 1;
    e.sel = 'start';
    h.draw(s);
    s.el.querySelector('[data-flowsheet] [data-f=title]')?.focus?.();
    return true;
  }
  if (!(n >= 0 && n < e.flow.length)) return true;
  // « Retirer cet événement » : ses dépendants gardent leur heure, comptée depuis le décollage (une phrase le dit)
  const gone = e.flow[n],
    moved = e.flow.some(x => x.refKind === 'event' && gone.id && x.refId === gone.id);
  h.remember(e);
  e.flow = EF.without(e.flow, n, EF.plannedOf(h.doc(e)));
  e.flowSel = -1;
  h.draw(s);
  if (moved) s.ctx.notify?.(s.tt(FTX.flRemoved, {
    t: gone.title || gone.text || s.tt(FTX.flNoTitle)
  }), 'info');
  return true;
}

/** Le champ « Ordre reçu : n min avant le décollage » du Cadre (timeline.order_offset_min = −n ; vide : la clé est effacée) ; '' quand la
 *  chronologie du fichier ne peut pas la porter. */
export function orderHtml(s, h) {
  const e = s.ed,
    doc = h.doc(e);
  if (!EF.orderStorable(doc)) return '';
  const v = EF.orderOf(doc);
  return `<div class="f-field" data-floworderfield><span class="ms-tlabel f-muted">${esc(s.tt(FTX.fsOrderL))}</span><div class="fl-inline"><input type="number" inputmode="numeric" data-k="edflow" data-f="order" value="${v}" min="0" max="1440" step="1" aria-label="${esc(s.tt(FTX.fsOrderL))}"><span>${esc(s.tt(FTX.fsOrderU))}</span></div></div>`;
}
