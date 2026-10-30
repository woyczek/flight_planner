// V3 — le modèle du volet « choisir sur la carte » (modules/maps/SPEC.md § 5.1, refonte R-M1 de V3_SPECIFICATION § 10.33) : une
// fonction pure des fiches du terrain, du vol et de l'état du volet, sans DOM, sans traduction, sans état de la Carte ; le module
// Carte (modules/maps/choose.js) n'en fait que le rendu (le HTML du volet, la mise en page sur la carte). Les textes sont des
// codes que la Carte écrit dans la langue (TX.ch*). Banc : frame/lib/test/pane_model.html.
//
// API :
//   paneModel(input, state) → { choice, groups, subs, rows, summary, focus, frame, empty }
//   panePick(input, state, fam, id) → l'état après une tape (une ligne, « Aucune », ✕ du résumé, la correction)
//   paneFold(input, state, fam) / paneGoto(input, state, fam) / paneHl(input, state, id, fromMap) → l'état après le geste
//   FAMS, KEY, MAX_ROWS, TOWARD_DEG, FRAME_NM
// input : { side, icao, records, runways, ad, at, cur, route, wind } — lu une fois à l'ouverture (fiches de procédures sans les
//   douteuses, fiches de pistes, fiche du terrain, sa position, le choix du vol pour ce côté, { points, dep, arr } du vol, vent
//   { dir, kt } ou null) ; state : { sel, pend, open: { focus, last, more }, hl }.

import * as PR from './procedures.js';
import {
  components,
  runwayAxis,
  severity
} from './wind.js';

/** Familles du volet, dans l'ordre du côté ; la transition de l'approche est repliée sous l'approche (appTrans). */
export const FAMS = {
  dep: ['rwy', 'sid'],
  arr: ['rwy', 'star', 'app']
};
/** Clé du retour vers Carburant par famille (route.procedures v2, en minuscules dans l'adresse ; V3 § 10.30). */
export const KEY = {
  rwy: 'rwy',
  sid: 'sid',
  star: 'star',
  app: 'app',
  appTrans: 'apptrans'
};
/** Au plus six lignes montrées par groupe (plus « Aucune »), le reste replié sous « N autres… ». */
export const MAX_ROWS = 6;
/** Écart (°) en deçà duquel une SID sort, une STAR entre « vers » l'autre terrain. */
export const TOWARD_DEG = 60;
/** Rayon du cadre autour du terrain (NM) : les points des procédures au-delà restent hors cadre, sauf ceux d'une procédure choisie. */
export const FRAME_NM = 40;

const num = v => v !== null && v !== undefined && v !== '' && Number.isFinite(+v);
/** Familles qu'un toucher peut poser : celles du côté, et la transition de l'approche à l'arrivée. */
const pickable = side => [...FAMS[side], ...(side === 'arr' ? ['appTrans'] : [])];
/** L'état vide d'un volet qui s'ouvre. */
export const paneState = () => ({
  sel: {},
  pend: {},
  open: {
    focus: null,
    last: null,
    more: {}
  },
  hl: null
});

/** Points d'une fiche qui ont une position, hors approche interrompue : [{ id, lat, lon }]. */
export const pointsOf = rec => (rec?.points || []).filter(p => p.phase !== 'missed' && num(p.lat) && num(p.lon)).map(p => ({
  id: String(p.id ?? ''),
  lat: +p.lat,
  lon: +p.lon
}));
/** Route initiale (°) de a vers b, orthodromie. */
function bearing(a, b) {
  const r = Math.PI / 180,
    y = Math.sin((b.lon - a.lon) * r) * Math.cos(b.lat * r),
    x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}
/** Points d'une ligne (une famille : ceux de sa fiche choisie, sinon de la première). */
export const ptsOf = it => it.members ? (it.members.find(m => m.chosen) || it.members[0]).pts : it.pts;

/** Ce qui ne change pas d'un état à l'autre : les fiches par identifiant, les pistes à proposer. */
const prep = new WeakMap();

function prepOf(input) {
  let p = prep.get(input);
  if (!p) prep.set(input, p = {
    byId: new Map((input.records || []).map(r => [r.id, r])),
    rwys: PR.runwayChoices(input.runways || [], input.records || [], input.ad || null)
  });
  return p;
}

/** Fiches d'une famille dans l'ordre du groupe (PR.orderProcedures sur le choix en vigueur), sans doublon d'identifiant ; les
 *  transitions de l'approche choisie sans celles dont l'IAF n'est pas sur la STAR choisie (PR.compatible({ star })). */
function recsOf(input, o, fam) {
  const {
    byId,
    rwys
  } = prepOf(input),
    of = kind => (input.records || []).filter(r => r.kind === kind),
    raw = fam === 'rwy' ? rwys : fam === 'sid' ? of('SID').filter(r => !r.transition) : fam === 'star' ? of('STAR').filter(r => !r
      .transition) : fam === 'app' ? PR.appChoices(of('APP')).list : o.app ? PR.appChoices(of('APP')).transitionsOf(o.app) : [],
    list = fam === 'appTrans' && o.star ? PR.compatible(raw, {
      star: o.star
    }, byId) : raw;
  return PR.orderProcedures([...new Map(list.map(r => [r.id, r])).values()], fam, o, byId);
}
/** Nom d'une fiche, en code : { kind: 'rwy', r } (« Piste 25 ») ; sinon { kind: 'name', name, src } (src : 'x', 'lnm' ou '', l'état
 *  de la source ; une transition porte le nom de sa transition, une approche son libellé court). */
function labelOf(fam, rec, finals) {
  if (fam === 'rwy') return {
    kind: 'rwy',
    r: rec.id
  };
  return {
    kind: 'name',
    name: fam === 'appTrans' ? PR.transitionLabelOf(rec) : fam === 'app' && finals ? PR.labelOf(rec, finals) : PR.nameOf(rec, rec.id) ||
      rec.id,
    src: rec.status === 'xplane' || rec.local ? 'x' : rec.status === 'lnm' ? 'lnm' : ''
  };
}
/** Les pistes d'une fiche, en petites étiquettes ([] pour une fiche qui les dessert toutes, une piste, une transition) ; sans celle
 *  que le libellé dit déjà (« ILS 02 », pas « ILS 02 02 »). */
const tagsOf = (fam, rec, name = '') => fam === 'rwy' || fam === 'appTrans' || PR.servesAll(rec) ? [] : [...new Set(rec.runways.map(PR
  .rwNum))].filter(r => !String(name).split(/[\s·]+/).includes(r)).sort(PR.rwOrder);
/** Le seuil de piste où une SID commence : la piste choisie si la SID la dessert, sinon la seule qu'elle dessert ; null sinon. */
function thresholdOf(input, o, rec) {
  const id = PR.rwNum(o.rwy) && PR.servesRwy(rec, o.rwy) ? o.rwy : PR.runwayOf(rec),
    rw = id && (input.runways || []).find(r => num(r.lat) && num(r.lon) && PR.sameRwy(r.id, id));
  return rw ? {
    id: `RW${PR.rwNum(rw.id)}`,
    lat: +rw.lat,
    lon: +rw.lon
  } : null;
}
/** Vent du METAR sur la piste rec : { k (composantes), sev (ok, warn, alert) } ; null sans vent dirigé ou sans relèvement. */
function windOf(input, rec) {
  const w = input.wind;
  if (!w) return null;
  const brg = runwayAxis(rec, {
      list: input.runways || [],
      magVar: num(input.ad?.magVar) ? +input.ad.magVar : null
    }),
    k = brg === null ? null : components(brg, w.dir, w.kt);
  return k ? {
    k,
    sev: severity(k)
  } : null;
}
/** Une piste qui ne convient pas au choix en vigueur : les procédures choisies qui ne la desservent pas, { kind: 'rwyNotServed', p }. */
function rwyWhy(o, byId, rec) {
  return ['sid', 'star', 'app'].map(f => o[f] && byId.get(o[f])).filter(p => p && !PR.servesRwy(p, rec.id)).map(p => ({
    kind: 'rwyNotServed',
    p: PR.nameOf(p, p.id) || p.id
  }));
}
/** Les lignes d'une famille dans l'ordre du groupe : { id, fam, rec, hi, label, title, old, why, pts, anchor, tags, chosen, wind }. */
function itemsOf(input, o, fam) {
  const {
    byId
  } = prepOf(input),
    finals = fam === 'app' || fam === 'appTrans' ? recsOf(input, o, 'app') : null,
    // une transition d'approche prend la teinte de sa finale (V3 § 10.30, quatrième lecture)
    finalHi = fam === 'appTrans' ? Math.max(0, finals.findIndex(r => r.id === o.app)) : null;
  return recsOf(input, o, fam).map((rec, i) => {
    const why = fam === 'rwy' ? rwyWhy(o, byId, rec) : PR.conflictsOf(fam, rec, o, byId).map(c => c.kind === 'rwy' ? {
        kind: 'rwy',
        rwy: c.rwy
      } : {
        kind: 'starApp',
        app: c.app || PR.nameOf(byId.get(c.appId), c.appId) || ''
      }),
      pts = fam === 'rwy' ? [] : pointsOf(rec),
      th = fam === 'sid' && pts.length ? thresholdOf(input, o, rec) : null,
      label = labelOf(fam, rec, finals);
    if (th) pts.unshift(th);
    return {
      id: rec.id,
      fam,
      rec,
      hi: finalHi ?? i,
      label,
      // le nom publié de l'approche ou de sa transition, en infobulle (le libellé court est sur la ligne)
      title: fam === 'app' || fam === 'appTrans' ? [rec.name, rec.transition].filter(Boolean).join(' · ') : '',
      old: !!rec.outdated,
      why,
      pts,
      anchor: pts.length ? fam === 'sid' ? pts.at(-1) : pts[0] : null,
      tags: tagsOf(fam, rec, label.name),
      chosen: fam === 'rwy' ? !!PR.rwNum(o.rwy) && PR.rwNum(rec.id) === PR.rwNum(o.rwy) : o[fam] === rec.id,
      wind: fam === 'rwy' ? windOf(input, rec) : null,
      off: null,
      dir: null
    };
  });
}
/** Les lignes d'une famille de SID ou de STAR : les fiches qui ne diffèrent que par la piste en UNE ligne « ABLI4 » avec ses pistes en
 *  étiquettes (PR.familiesOf) ; chosen : l'une d'elles choisie, ou la famille posée avant sa piste (pend). */
function familyRows(state, fam, items) {
  if (fam !== 'sid' && fam !== 'star') return items;
  const byId = new Map(items.map(i => [i.id, i])),
    rows = [];
  for (const row of PR.familiesOf(items.map(i => i.rec))) {
    const members = row.recs.map(r => byId.get(r.id)).filter(Boolean);
    if (members.length < 2) {
      rows.push(...members);
      continue;
    }
    const first = members[0];
    rows.push({
      ...first,
      id: `fam:${row.name}`,
      family: row.name,
      members,
      label: {
        kind: 'name',
        name: row.name,
        src: ''
      },
      tags: row.runways,
      old: members.some(m => m.old),
      why: members.every(m => m.why.length) ? first.why : [],
      chosen: members.some(m => m.chosen) || state.pend[fam] === row.name
    });
  }
  return rows;
}
/** Route sans point : chaque SID (STAR) reçoit dir = { deg : le cap du vol à sa sortie (son entrée), off : l'écart (°) à l'orthodromie
 *  vers l'autre terrain } ; rend { icao } (l'autre terrain), ou null sans positions. */
function towards(input, fam, rows) {
  const sid = fam === 'sid',
    rpts = input.route?.points || [],
    other = sid ? rpts.at(-1) : rpts[0],
    at = input.at;
  if (!at || !num(other?.lat) || !num(other?.lon)) return null;
  const goal = bearing(at, {
    lat: +other.lat,
    lon: +other.lon
  });
  for (const it of rows) {
    const pts = ptsOf(it),
      end = sid ? pts.at(-1) : pts[0],
      b = end ? bearing(at, end) : null;
    it.dir = b === null ? {
      deg: null,
      off: 360
    } : {
      deg: sid ? b : (b + 180) % 360,
      off: Math.abs((b - goal + 540) % 360 - 180)
    };
  }
  return {
    icao: String((sid ? input.route?.arr : input.route?.dep) || other.id || '').toUpperCase()
  };
}
/** Ce que montre une famille : les lignes compatibles avec le choix en vigueur (sur la route ou vers l'autre terrain d'abord), six au
 *  plus ; tout, marqué ⚠, quand le groupe est déplié. { shown (ids), ok (les compatibles, pour le cadre), folded, head }. */
function viewOf(input, state, o, items, fam) {
  const {
    byId
  } = prepOf(input),
    list = items[fam] || [],
    pend = f => state.pend[f] && (items[f] || []).find(i => i.family === state.pend[f])?.members.map(m => m.rec),
    choice = {
      rwy: o.rwy,
      sid: pend('sid') || o.sid,
      star: pend('star') || o.star,
      app: o.app
    },
    recs = fam === 'rwy' ? list.map(i => i.rec.id) : list.flatMap(i => i.members ? i.members.map(m => m.rec) : [i.rec]),
    idOf = r => typeof r === 'string' ? r : r.id,
    ok = new Set(PR.compatible(recs, choice, byId).map(idOf)),
    has = (it, set) => it.members ? it.members.some(m => set.has(m.id)) : set.has(it.rec.id),
    // second axe (V3 § 10.31) : la SID dont la sortie, la STAR dont l'entrée est sur la route tapée d'abord ; une route sans point
    // ni voie entre les deux terrains se tait : le cap vers l'autre terrain classe à sa place (towards)
    rpts = input.route?.points || [],
    route = (fam === 'sid' || fam === 'star') && rpts.length > 2 ? rpts.map(p => p?.id).filter(Boolean) : [],
    onRoute = route.length ? new Set(PR.compatible(recs, {
      ...choice,
      route
    }, byId).map(idOf)) : ok,
    fits = list.filter(it => it.chosen || has(it, onRoute)),
    near = list.filter(it => !fits.includes(it) && has(it, ok));
  for (const it of near) {
    const r = it.members ? it.members[0].rec : it.rec,
      pt = fam === 'sid' ? PR.exitOf(r) : PR.entryOf(r);
    it.off = pt ? {
      kind: fam === 'sid' ? 'exit' : 'entry',
      p: pt
    } : null;
  }
  // ce qui ne va pas avec le choix dit pourquoi (⚠), même sans conflit de piste
  for (const it of list)
    if (!fits.includes(it) && !near.includes(it) && !it.why.length) it.why = [{
      kind: 'notFit'
    }];
  const dir = route.length || (fam !== 'sid' && fam !== 'star') ? null : towards(input, fam, list);
  if (dir) fits.sort((a, b) => a.dir.off - b.dir.off);
  const order = [...fits, ...near],
    shown = state.open.more[fam] ? [...order, ...list.filter(it => !order.includes(it))] : order.slice(0, MAX_ROWS);
  for (const it of fits)
    if (it.chosen && !shown.includes(it)) shown.push(it);
  return {
    shown,
    ok: order,
    folded: list.length - shown.length,
    head: route.length && near.some(it => shown.includes(it)) ? {
      kind: 'toRoute'
    } : dir && shown.some(it => it.dir?.off <= TOWARD_DEG) && shown.some(it => it.dir?.off > TOWARD_DEG) ? {
      kind: 'toward',
      icao: dir.icao
    } : null
  };
}
/** La ligne de correction sous un groupe de procédures (V3 § 10.30), en code : { kind: 'serves', p, r, fam: 'rwy', val } (la procédure
 *  vient d'être choisie et ne dessert qu'une autre piste) ; { kind: 'notServes', p, r, fam, val, alt } (la première du groupe qui
 *  dessert la piste, PR.firstServing ; val null sans elle) ; null. */
function fixOf(input, state, o, items, fam) {
  const {
    byId
  } = prepOf(input),
    rec = o[fam] ? byId.get(o[fam]) : null,
    rwy = PR.rwNum(o.rwy);
  if (!rec || !rwy || PR.servesRwy(rec, rwy)) return null;
  const p = PR.nameOf(rec, rec.id) || rec.id,
    one = PR.runwayOf(rec);
  if (one && state.open.last === fam) return {
    kind: 'serves',
    p,
    r: one,
    fam: 'rwy',
    val: one
  };
  const alt = PR.firstServing((items[fam] || []).map(i => i.rec), rwy);
  return {
    kind: 'notServes',
    p,
    r: rwy,
    fam,
    val: alt?.id || null,
    alt: alt ? PR.nameOf(alt, alt.id) || alt.id : ''
  };
}
/** Le choix en vigueur du côté : celui du vol, puis celui du volet par-dessus (clés de route.procedures v2). */
const choiceOf = (input, state) => ({
  ...(input.cur || {}),
  ...state.sel
});

/** Le modèle du volet : { choice, groups: { [famille]: { rows, shown (ids), folded, head, fix, ok (ids) } }, subs (les transitions sous
 *  l'approche choisie), rows (toutes les lignes, toutes familles), summary { rwy, proc, app } (undefined : rien ; null : « Aucune » ;
 *  sinon le texte de PR.summaryOf, ou { family, runways } d'une famille posée avant sa piste), focus, frame (les points à cadrer),
 *  empty }. Pur : mêmes entrées, même modèle. */
export function paneModel(input, state) {
  const o = choiceOf(input, state),
    {
      byId
    } = prepOf(input),
    items = Object.fromEntries(pickable(input.side).map(f => [f, familyRows(state, f, itemsOf(input, o, f))])),
    fams = FAMS[input.side],
    views = Object.fromEntries(fams.map(f => [f, viewOf(input, state, o, items, f)])),
    groups = Object.fromEntries(fams.map(f => [f, {
      rows: items[f],
      shown: views[f].shown.map(it => it.id),
      folded: views[f].folded,
      head: views[f].head,
      fix: f === 'rwy' ? null : fixOf(input, state, o, items, f),
      ok: views[f].ok.map(it => it.id)
    }])),
    rows = Object.values(items).flat(),
    rw = (items.rwy || []).find(i => i.chosen),
    sum = PR.summaryOf(o, {
      byId,
      wind: rw?.wind?.k
    }),
    proc = input.side === 'dep' ? 'sid' : 'star',
    pendRow = state.pend[proc] && (items[proc] || []).find(i => i.family === state.pend[proc]),
    focus = state.open.focus || fams.find(f => input.cur?.[f] === undefined && items[f]?.length) || fams.find(f => items[f]?.length) ||
    null;
  // le cadre : le terrain, ses pistes, les points des procédures compatibles à moins de FRAME_NM du terrain, les choisies entières
  const c = input.at,
    k = c ? Math.cos(c.lat * Math.PI / 180) : 1,
    near = p => !c || Math.hypot((p.lat - c.lat) * 60, (p.lon - c.lon) * 60 * k) <= FRAME_NM,
    okRows = [...fams.filter(f => f !== 'rwy').flatMap(f => views[f].ok), ...(items.appTrans || [])],
    frame = [...(c ? [c] : []), ...(items.rwy || []).map(i => i.rec), ...okRows.flatMap(ptsOf).filter(near), ...rows.filter(it => it
      .chosen).flatMap(ptsOf)].filter(p => num(p.lat) && num(p.lon)).map(p => ({
      lat: +p.lat,
      lon: +p.lon
    }));
  return {
    choice: o,
    groups,
    subs: items.appTrans || [],
    rows,
    summary: {
      rwy: o.rwy === null ? null : sum.rwy,
      proc: pendRow ? {
        family: pendRow.family,
        runways: pendRow.tags
      } : sum.proc,
      app: input.side === 'arr' ? sum.app : undefined
    },
    focus,
    frame,
    empty: !rows.length
  };
}

/** L'état après une tape qui pose le choix de la famille fam (id, « none » pour « Aucune ») : une famille de SID ou de STAR sans piste
 *  se met en attente (pend) et la résout à la piste suivante ; une procédure qui ne dessert qu'une piste la pose quand aucune ne l'est ;
 *  une autre approche, ou une STAR dont la transition choisie ne part pas, remet la transition à « Aucune ». Rien n'est écrit. */
export function panePick(input, state, fam, id) {
  if (!pickable(input.side).includes(fam) || !id) return state;
  const s = {
      sel: {
        ...state.sel
      },
      pend: {
        ...state.pend
      },
      open: {
        ...state.open,
        more: {
          ...state.open.more
        }
      },
      hl: state.hl
    },
    m = paneModel(input, state),
    rowsOf = f => (f === 'appTrans' ? m.subs : m.groups[f]?.rows) || [];
  let v = id === 'none' ? null : fam === 'rwy' ? PR.rwNum(id) : id;
  if (String(v).startsWith('fam:')) {
    const row = rowsOf(fam).find(i => i.id === v),
      rwy = PR.rwNum(m.choice.rwy),
      rec = row && rwy ? PR.firstServing(row.members.map(x => x.rec), rwy) : null;
    if (!row) return state;
    if (!rec) { // pas encore de piste : la famille réduit les pistes, taper l'une d'elles résout la fiche
      s.pend[fam] = row.family;
      delete s.sel[fam];
      s.open.last = fam;
      s.open.focus = fam;
      return s;
    }
    v = rec.id;
  }
  if (fam !== 'rwy') delete s.pend[fam];
  s.sel[fam] = v;
  if (v && fam !== 'rwy') s.hl = id; // la tape laisse la ligne surlignée
  // une piste posée résout la famille posée avant elle
  if (fam === 'rwy' && v)
    for (const f of ['sid', 'star']) {
      const row = s.pend[f] && rowsOf(f).find(i => i.family === s.pend[f]),
        rec = row ? PR.firstServing(row.members.map(x => x.rec), v) : null;
      if (rec) {
        s.sel[f] = rec.id;
        delete s.pend[f];
      }
    }
  s.open.last = fam;
  if (fam !== 'appTrans') s.open.focus = fam;
  const rec = v && fam !== 'rwy' ? prepOf(input).byId.get(v) : null,
    one = rec ? PR.runwayOf(rec) : null;
  if (one && !PR.rwNum(choiceOf(input, s).rwy)) s.sel.rwy = one;
  if (fam === 'app' || fam === 'star') {
    const o = choiceOf(input, s),
      keep = o.appTrans;
    if (keep && !recsOf(input, o, 'appTrans').some(r => r.id === keep)) s.sel.appTrans = null;
  }
  return s;
}
/** L'état après « N autres · Toutes » / « Compatibles seulement » : le groupe fam déplié ou replié. */
export function paneFold(input, state, fam) {
  return {
    ...state,
    open: {
      ...state.open,
      more: {
        ...state.open.more,
        [fam]: !state.open.more[fam]
      }
    }
  };
}
/** L'état après une tape sur le nom d'une famille du résumé : son groupe déplié s'il était replié. */
export function paneGoto(input, state, fam) {
  if (!FAMS[input.side].includes(fam) || !paneModel(input, state).groups[fam]?.folded) return state;
  return paneFold(input, state, fam);
}
/** L'état après un survol ou une tape sur la carte : la ligne id surlignée (null : aucune) ; fromMap : sa famille passe au premier plan
 *  et son groupe se déplie si elle y est repliée. */
export function paneHl(input, state, id, fromMap = false) {
  const m = paneModel(input, state),
    it = id ? m.rows.find(i => i.id === id) : null,
    hl = it ? id : null;
  if (hl === state.hl && !(it && fromMap)) return state;
  const s = {
    ...state,
    hl
  };
  if (it && fromMap && it.fam !== 'appTrans' && it.fam !== 'rwy') {
    s.open = {
      ...state.open,
      focus: it.fam,
      more: {
        ...state.open.more
      }
    };
    if (!m.groups[it.fam]?.shown.includes(id)) s.open.more[it.fam] = true;
  }
  return s;
}
/** L'adresse du retour vers Carburant : #fuel?focus=<côté> et une clé par famille touchée (« none » pour « Aucune ») ; '' rien de
 *  touché. */
export function paneReturn(side, state) {
  const keys = Object.entries(state.sel).filter(([f]) => KEY[f]).map(([f, v]) => `&${KEY[f]}=${encodeURIComponent(v === null ? 'none' :
    f === 'rwy' ? PR.rwNum(v) : v)}`);
  return keys.length ? `#fuel?focus=${side}${keys.join('')}` : '';
}
