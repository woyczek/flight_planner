// V3 maps — le mode « choisir sur la carte » (V3_SPECIFICATION § 10.23 ; modules/maps/SPEC.md § 5.1). Carburant ouvre
// #maps?choose=dep|arr&icao=LFXX depuis le bouton « Sur la carte » d'un côté : la Carte lit la demande au montage (ctx.consume),
// cadre le terrain sur ses procédures, éteint le fond et ses propres couches, et montre UNE famille à la fois — la première que le
// vol n'a pas encore choisie, dans l'ordre dont le côté a besoin (départ : piste, SID, transition ; arrivée : piste, STAR,
// approche, transition de STAR, transition d'approche). Chaque procédure publiée de la famille est tracée dans sa teinte (huit
// teintes en cycle : la même sur la ligne de la liste, le cartouche et le tracé), un cartouche par point de sortie (SID) ou
// d'entrée (STAR, approche) empile les noms qui s'y rejoignent ; les transitions ne sont tracées que pour la procédure surlignée
// (survol d'une ligne, d'un cartouche ou d'un tracé). Un toucher sur un tracé, un cartouche ou une ligne CHOISIT : la Carte remplace
// l'adresse par #fuel?focus=<côté>&<clé>=<identifiant> (une clé par passage, celles de route.procedures v2 ; « none » pour
// « Aucune ») et n'écrit rien au vol — Carburant lit la clé, écrit et dit ce qui a changé. « Annuler » est le « ← Carburant » du cadre.
// Les règles (ordre, ⚠, transitions, approches listées une fois, pistes) sont celles de frame/lib/procedures.js, sans copie.

import {
  S,
  tt,
  esc,
  setData
} from './state.js';
import {
  TX
} from './texts.js';
import * as PR from '../../frame/lib/procedures.js';
import {
  proceduresOf
} from '../../frame/lib/flight_path.js';
import {
  place,
  arrowOf,
  drawRunways,
  LINE_H
} from './procs.js';
import {
  openData,
  endData
} from './sheet_view.js';
import {
  schedule
} from './draw.js';
import {
  syncButtons
} from './screen.js';
import {
  applyFlight
} from './data.js';

/** Ordre des familles de chaque côté : la première non choisie est montrée. */
const ORDER = {
  dep: ['rwy', 'sid', 'trans'],
  arr: ['rwy', 'star', 'app', 'trans', 'appTrans']
};
/** Familles dont la liste se filtre par piste (les pistes elles-mêmes et les transitions ne se filtrent pas). */
const FILTERED = ['sid', 'star', 'app'];
/** Au plus 7 puces de piste, 7 lignes visibles (le reste défile). */
const MAX_CHIPS = 7;
/** Part dont les couches de la Carte sont éteintes (render.js, option dim du dessin). */
export const DIM = .6;
const PAD = 3;
/** Marge des cartouches au bord de la carte, et à droite la place de la colonne des boutons (px). */
const EDGE = 4,
  EDGE_R = 56;
const num = v => v !== null && v !== undefined && v !== '' && Number.isFinite(+v);

// ---------------------------------------------------------------- l'entrée : l'adresse
/** La demande de l'adresse, lue et retirée d'elle (ctx.consume, une seule écriture) : { side, icao, … } ou null (rien demandé, une
 *  carte de mission, la page de réglage). L'état du mode vit dans S.choose tant qu'il dure. */
export function chooseAsk(ctx) {
  const got = ctx.consume ? ctx.consume('choose', 'icao') : {
      choose: ctx.query?.choose,
      icao: ctx.query?.icao
    },
    side = got.choose === 'dep' || got.choose === 'arr' ? got.choose : null,
    icao = String(got.icao ?? '').trim().toUpperCase();
  if (!side || ctx.query?.mission || ctx.query?.tune || (icao && !/^[A-Z0-9]{4}$/.test(icao))) return null;
  return {
    side,
    icao,
    ready: false,
    hl: null,
    chip: null,
    hits: {
      lines: [],
      rows: []
    }
  };
}

// ---------------------------------------------------------------- ce qui est à choisir
/** Points d'une fiche qui ont une position, hors approche interrompue : [{ id, lat, lon }]. */
const pointsOf = rec => (rec?.points || []).filter(p => p.phase !== 'missed' && num(p.lat) && num(p.lon)).map(p => ({
  id: String(p.id ?? ''),
  lat: +p.lat,
  lon: +p.lon
}));
/** Fiches d'une famille dans l'ordre de la liste (PR.orderProcedures), sans doublon d'identifiant. */
function recsOf(C, fam) {
  const o = C.cur,
    of = kind => C.recs.filter(r => r.kind === kind),
    dep = C.side === 'dep',
    raw = fam === 'rwy' ? C.rwys : fam === 'sid' ? of('SID').filter(r => !r.transition) : fam === 'star' ? of('STAR').filter(r => !r
      .transition) : fam === 'app' ? PR.appChoices(of('APP')).list : fam === 'trans' ? PR.transitionsOf(of(dep ? 'SID' : 'STAR'), dep ?
      o.sid : o.star) : PR.appChoices(of('APP')).transitionsOf(o.app);
  return PR.orderProcedures([...new Map(raw.map(r => [r.id, r])).values()], fam, o, C.byId);
}
/** La famille de ce passage : la première, dans l'ordre du côté, que le vol n'a pas choisie (absent : pas choisi ; null : « aucune »
 *  choisie) et qui a quelque chose à proposer ; tout choisi, la première qui a quelque chose ; null s'il n'y a rien du tout. */
function pickFamily(C) {
  const fams = ORDER[C.side],
    some = k => recsOf(C, k).length > 0;
  if (!C.done)
    for (const k of fams)
      if (C.cur[k] === undefined && some(k)) return k;
  return fams.find(some) || null;
}
/** Nom d'une fiche pour une liste ou un cartouche : son nom (les fiches sans nom ne sont pas listées), la piste quand elle n'en dessert qu'une et
 *  que le nom ne la dit pas, l'état de la source ; une transition porte le nom de sa transition. ⌛ et ⚠ viennent à part. */
function labelOf(C, rec) {
  if (C.family === 'rwy') return tt(TX.chRwy, {
    r: rec.id
  });
  const sub = C.family === 'trans' || C.family === 'appTrans',
    name = (sub ? rec.transition : null) || PR.nameOf(rec, rec.id) || rec.id,
    one = PR.servesAll(rec) ? [] : [...new Set(rec.runways.map(PR.rwNum))],
    tags = rec.status === 'xplane' || rec.local ? tt(TX.procX) : rec.status === 'lnm' ? tt(TX.procLnm) : '';
  return [name, one.length === 1 && !name.toUpperCase().includes(one[0]) ? one[0] : '', tags].filter(Boolean).join(' · ');
}
/** Le seuil de piste où une SID commence, ajouté devant ses points : la piste choisie si la SID la dessert, sinon la seule qu'elle
 *  dessert ; null si elle n'est pas connue. */
function thresholdOf(C, rec) {
  const served = PR.servesAll(rec) ? [] : [...new Set(rec.runways.map(PR.rwNum))],
    id = PR.rwNum(C.cur.rwy) && PR.servesRwy(rec, C.cur.rwy) ? C.cur.rwy : served.length === 1 ? served[0] : null,
    rw = id && C.known.find(r => num(r.lat) && num(r.lon) && PR.sameRwy(r.id, id));
  return rw ? {
    id: `RW${PR.rwNum(rw.id)}`,
    lat: +rw.lat,
    lon: +rw.lon
  } : null;
}
/** Les éléments de la famille montrée, dans l'ordre : { id, rec, hi (rang de teinte, stable), label, old, why (raisons du ⚠), pts,
 *  anchor (point de sortie d'une SID, d'entrée sinon), chosen (piste) }. */
function itemsOf(C) {
  const exit = C.family === 'sid' || (C.family === 'trans' && C.side === 'dep');
  return recsOf(C, C.family).map((rec, hi) => {
    const why = C.family === 'rwy' ? [] : PR.conflictsOf(C.family, rec, C.cur, C.byId).map(c => c.kind === 'rwy' ? tt(TX
        .chConflictRwy, {
          rwy: c.rwy
        }) : tt(TX.chConflictStarApp, {
        app: c.app || PR.nameOf(C.byId.get(c.appId), c.appId) || ''
      })),
      pts = C.family === 'rwy' ? [] : pointsOf(rec),
      th = C.family === 'sid' && pts.length ? thresholdOf(C, rec) : null;
    if (th) pts.unshift(th);
    return {
      id: rec.id,
      rec,
      hi,
      label: labelOf(C, rec),
      old: !!rec.outdated,
      why,
      pts,
      anchor: pts.length ? exit ? pts.at(-1) : pts[0] : null,
      chosen: C.family === 'rwy' && PR.rwNum(rec.id) === PR.rwNum(C.cur.rwy)
    };
  });
}
/** Les éléments montrés : ceux que dessert la piste de la puce pressée (PR.servesRwy), tous sans puce. */
const visible = C => C.chip ? C.items.filter(i => PR.servesRwy(i.rec, C.chip)) : C.items;
/** Teinte d'un élément : l'une des huit de la palette, en cycle (jour ou nuit). */
const hueOf = it => {
  const h = MapsRender.palette(!!S.theme?.dark).procHues;
  return h[it.hi % h.length];
};
/** Transitions de la procédure it à tracer quand elle est surlignée (SID, STAR : PR.transitionsOf ; approche : appChoices). */
function transOf(C, it) {
  const of = kind => C.recs.filter(r => r.kind === kind);
  return C.family === 'sid' ? PR.transitionsOf(of('SID'), it.id) : C.family === 'star' ? PR.transitionsOf(of('STAR'), it.id) : C.family ===
    'app' ? PR.appChoices(of('APP')).transitionsOf(it.id) : [];
}

// ---------------------------------------------------------------- le chargement
/** Lit ce qu'aerodb sait du terrain (procédures publiées, jamais les lectures douteuses ; pistes ; terrain), choisit la famille et
 *  cadre la vue sur ses procédures. Sans rien à montrer, le mode se retire avec une notification. Appelé au montage, après le vol et
 *  avant le fond de carte (qui part de S.fit). */
export async function chooseLoad() {
  const C = S.choose,
    A = S.ctx.aerodb,
    r = S.route.flight?.route || {},
    ask = make => Promise.resolve().then(make).then(v => v || [], () => []);
  C.icao ||= String((C.side === 'dep' ? r.dep : r.arr) || '').trim().toUpperCase();
  const [recs, known, ad, at] = await Promise.all([ask(() => A?.procedures?.(C.icao)), ask(() => A?.runways?.(C.icao)), ask(() => A
    ?.aerodromes?.({
      icao: C.icao
    })), Promise.resolve().then(() => A?.coords?.(C.icao)).catch(() => null)]);
  if (!S) return;
  // jamais une fiche douteuse : ni statut doubt, ni fiche sans nom ou « NONAME » (la même règle que la liste de Carburant, sinon la
  // Carte proposerait ce que Carburant ne montre pas)
  C.recs = recs.filter(p => p?.id && p.status !== 'doubt' && String(p.name ?? '').trim() && !/\.NONAME\./i.test(p.id));
  C.byId = new Map(C.recs.map(p => [p.id, p]));
  C.known = known;
  C.ad = ad[0] || null;
  C.rwys = PR.runwayChoices(known, C.recs, C.ad);
  const side = proceduresOf(S.route.flight)[C.side];
  C.done = side === null; // « aucune » posé sur tout le côté : tout est choisi
  C.cur = side || {};
  C.family = pickFamily(C);
  if (!C.family) {
    S.ctx.notify?.(tt(TX.chNoData, {
      icao: C.icao
    }), 'warn');
    S.choose = null;
    syncButtons(); // les boutons de la carte reviennent
    return;
  }
  C.items = itemsOf(C);
  const own = C.family === 'rwy' ? C.items.map(i => i.rec) : C.items.flatMap(i => i.pts),
    box = MapsRender.bboxOf([...own, ...(num(at?.lat) && num(at?.lon) ? [at] : [])].filter(p => num(p.lat) && num(p.lon)).map(p => ({
      lat: +p.lat,
      lon: +p.lon
    })), 3);
  if (box) {
    C.fit = box;
    S.fit = box;
  }
  C.ready = true;
}
/** Le mode est-il ouvert ? (le corps de la feuille et la classe de la boîte suivent). */
export function chooseView() {
  const on = !!S?.choose;
  if (S?.box && S.box.classList.contains('mp-choosing') !== on) S.box.classList.toggle('mp-choosing', on);
}
/** Le mode s'ouvre une fois les données lues : la feuille porte la liste, le fond s'éteint, la carte est recadrée. */
export function chooseStart() {
  chooseView();
  chooseRender();
  schedule();
}
/** Le mode se retire (✕, Échap ou rien à montrer) : la carte reprend le vol entier, la feuille son profil. */
export function chooseExit() {
  if (!S?.choose) return;
  S.choose = null;
  chooseView();
  endData('choose');
  syncButtons();
  applyFlight(false);
}

// ---------------------------------------------------------------- la feuille : titre, puces, liste
const titleOf = C => {
  const dep = C.side === 'dep',
    id = C.family === 'trans' ? (dep ? C.cur.sid : C.cur.star) : C.family === 'appTrans' ? C.cur.app : '';
  return tt(TX.chTitle[C.family], {
    icao: C.icao,
    p: id ? PR.nameOf(C.byId.get(id), id) || '' : ''
  });
};
/** Les puces de piste : les pistes du terrain dans l'ordre de la liste des pistes (PR.orderProcedures), 7 au plus ; rien pour les
 *  pistes elles-mêmes, les transitions ou un terrain à une seule piste. */
function chipsOf(C) {
  if (!FILTERED.includes(C.family)) return [];
  const l = PR.orderProcedures([...new Map(C.rwys.map(r => [r.id, r])).values()], 'rwy', C.cur, C.byId).slice(0, MAX_CHIPS);
  return l.length > 1 ? l.map(r => r.id) : [];
}
/** Ligne de la liste : l'échantillon de teinte, le nom, ⌛ (gris) et ⚠ (orange) en fin de ligne ; « Aucune » n'a ni teinte ni marque. */
function rowHtml(C, it) {
  const tip = [it.old ? tt(TX.procOutdated) : '', ...it.why].filter(Boolean).join(' · ');
  return `<button type="button" class="mp-ch-row" data-id="${esc(it.id)}" data-hl="${C.hl === it.id ? 1 : 0}" style="--c:${hueOf(it)}"${tip ? ` title="${esc(tip)}"` : ''}><i class="mp-ch-sw" aria-hidden="true"></i><span class="mp-ch-name">${esc(it.label)}</span>${it.old ? `<span class="mp-ch-old" role="img" aria-label="${esc(tt(TX.procOutdated))}">⌛</span>` : ''}${it.why.length ? `<span class="mp-ch-warn" role="img" aria-label="${esc(it.why.join(' · '))}">⚠</span>` : ''}</button>`;
}
/** Le corps de la feuille : la consigne, les puces de piste, la liste (« Aucune » d'abord, 7 lignes visibles puis le défilement). */
function bodyHtml(C) {
  const vis = visible(C),
    chips = chipsOf(C),
    none = `<button type="button" class="mp-ch-row mp-ch-none" data-id="none" data-hl="0"><span class="mp-ch-name">${esc(tt(TX.chNone))}</span></button>`;
  return `<div class="mp-ch" data-family="${C.family}"><p class="f-muted mp-ch-hint">${esc(tt(TX.chHint))}</p>${chips.length ? `<div class="mp-ch-chips" role="group" aria-label="${esc(tt(TX.chChips))}">${chips.map(r => `<button type="button" class="mp-ch-chip" data-rwy="${esc(r)}" aria-pressed="${C.chip === r}" title="${esc(tt(TX.chChipTip, { r }))}">${esc(r)}</button>`).join('')}</div>` : ''}<div class="mp-ch-list" role="group" aria-label="${esc(titleOf(C))}">${none}${vis.map(it => rowHtml(C, it)).join('')}</div>${vis.length ? '' : `<p class="f-muted mp-ch-empty">${esc(tt(C.chip ? TX.chEmptyChip : TX.chEmpty, { icao: C.icao, r: C.chip || '' }))}</p>`}</div>`;
}
/** (Re)dessine le contenu de la feuille ; écrit seulement si le HTML change (openData). */
export function chooseRender() {
  const C = S?.choose;
  if (!C?.ready) return;
  const title = titleOf(C);
  openData('choose', `choose:${C.family}`, title, () => bodyHtml(C), title);
}
/** Surligne l'élément id (ligne, cartouche, tracé) ou plus rien ; fromMap : la ligne vient sous les yeux. Les lignes ne sont pas
 *  refaites, seul leur attribut data-hl change. */
export function setHl(id, fromMap = false) {
  const C = S?.choose;
  if (!C?.ready) return;
  const hl = id && C.items.some(i => i.id === id) ? id : null;
  if (C.hl === hl) return;
  C.hl = hl;
  for (const b of S.dbodyEl.querySelectorAll('.mp-ch-row')) setData(b, 'hl', b.dataset.id === hl ? '1' : '0');
  if (hl && fromMap) {
    const row = [...S.dbodyEl.querySelectorAll('.mp-ch-row')].find(b => b.dataset.id === hl);
    row?.scrollIntoView({
      block: 'nearest'
    });
  }
  schedule();
}
/** La puce de piste r pressée, ou relâchée si elle l'était : la liste et le dessin suivent. */
function setChip(r) {
  const C = S.choose;
  C.chip = C.chip === r ? null : r;
  if (C.hl && !visible(C).some(i => i.id === C.hl)) C.hl = null;
  chooseRender();
  S.dbodyEl.querySelector(`.mp-ch-chip[data-rwy="${CSS.escape(r)}"]`)?.focus();
  schedule();
}

// ---------------------------------------------------------------- choisir
/** Un choix : la Carte remplace l'adresse par celle de Carburant, avec la clé de la famille et l'identifiant (la piste sans « RW »)
 *  ou « none » ; elle n'écrit rien au vol. */
export function chooseDo(id) {
  const C = S?.choose;
  if (!C?.ready || !id) return;
  const val = id === 'none' ? 'none' : C.family === 'rwy' ? PR.rwNum(id) : id;
  location.replace(`#fuel?focus=${C.side}&${C.family}=${encodeURIComponent(val)}`);
}
/** Gestes de la feuille (délégués : le HTML est refait) : un toucher sur une ligne choisit, sur une puce filtre ; le survol et le
 *  focus d'une ligne la surlignent sur la carte. Rend la fonction d'arrêt. */
export function chooseEvents() {
  const el = S.dbodyEl,
    on = () => S?.dpanel === 'choose',
    click = e => {
      if (!on()) return;
      const chip = e.target.closest('[data-rwy]');
      if (chip) return setChip(chip.dataset.rwy);
      const row = e.target.closest('.mp-ch-row');
      if (row) chooseDo(row.dataset.id);
    },
    over = e => {
      if (on()) setHl(e.target.closest('.mp-ch-row')?.dataset.id ?? null);
    },
    out = e => {
      if (on() && !e.relatedTarget?.closest?.('.mp-ch-row')) setHl(null);
    },
    ev = [
      ['click', click],
      ['pointerover', over],
      ['focusin', over],
      ['pointerout', out],
      ['focusout', out]
    ];
  for (const [k, f] of ev) el.addEventListener(k, f);
  return () => {
    for (const [k, f] of ev) el.removeEventListener(k, f);
  };
}

// ---------------------------------------------------------------- sur la carte : mise en page, dessin, toucher
/** Distance de (x, y) au segment ab. */
function distSeg(x, y, a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    l = dx * dx + dy * dy,
    t = l ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l)) : 0;
  return Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
}
/** Largeur d'une ligne de cartouche : l'échantillon, le nom, ⌛ et ⚠ (la police étant posée). */
const rowWidth = (ctx, it) => 14 + ctx.measureText(it.label).width + (it.old ? 4 + ctx.measureText('⌛').width : 0) + (it.why.length ? 4 +
  ctx
  .measureText('⚠').width : 0);
/** Mise en page du mode à l'écran (projection toC) : { traces, arrows, groups, reserve(pl), paint(ctx), top(ctx) } ; null hors du
 *  mode. Les cadres touchables (tracés, lignes des cartouches) sont rangés dans S.choose.hits pour le toucher et le survol. Tant que
 *  les données ne sont pas lues, rien n'est tracé (les couches de la Carte sont déjà éteintes). */
export function chooseLayout(ctx, toC, W = 0, H = 0) {
  const C = S.choose;
  if (!C) return null;
  const L = {
    traces: [],
    arrows: [],
    groups: [],
    reserve() {},
    paint() {},
    top() {}
  };
  C.hits = {
    lines: [],
    rows: []
  };
  if (!C.ready) return L;
  const vis = visible(C),
    hl = C.hl;
  if (C.family === 'rwy') {
    for (const it of vis) {
      const a = arrowOf(toC, C.side, it.rec, C.known, C.ad?.magVar, hueOf(it));
      if (!a) continue;
      a.lw = it.chosen ? 7 : it.id === hl ? 5.5 : 3.5; // la piste choisie en gras
      L.arrows.push(a);
      C.hits.lines.push({
        id: it.id,
        pts: [a.a, a.b]
      });
    }
  } else {
    const parent = C.family === 'trans' ? C.cur[C.side === 'dep' ? 'sid' : 'star'] : C.family === 'appTrans' ? C.cur.app : null;
    // la procédure dont on choisit la transition, en gris fin, pour situer les transitions
    if (parent && C.byId.get(parent)) {
      const pts = pointsOf(C.byId.get(parent)).map(p => toC(p.lat, p.lon));
      if (pts.length) L.traces.push({
        it: null,
        pts
      });
    }
    for (const it of vis) {
      const pts = it.pts.map(p => toC(p.lat, p.lon));
      if (!pts.length) continue;
      L.traces.push({
        it,
        pts
      });
      C.hits.lines.push({
        id: it.id,
        pts
      });
    }
    const on = hl && vis.find(i => i.id === hl);
    if (on)
      for (const t of transOf(C, on)) {
        const pts = pointsOf(t).map(p => toC(p.lat, p.lon));
        if (!pts.length) continue;
        L.traces.push({
          it: on,
          pts,
          dash: true
        });
        C.hits.lines.push({
          id: on.id,
          pts
        });
      }
    // un cartouche par point de sortie ou d'entrée : les noms qui s'y rejoignent, empilés
    const groups = new Map();
    for (const it of vis) {
      if (!it.anchor) continue;
      const k = it.anchor.id ? it.anchor.id.toUpperCase() : `${it.anchor.lat.toFixed(3)},${it.anchor.lon.toFixed(3)}`;
      if (!groups.has(k)) groups.set(k, {
        q: toC(it.anchor.lat, it.anchor.lon),
        rows: []
      });
      groups.get(k).rows.push(it);
    }
    L.groups = [...groups.values()];
  }
  L.reserve = pl => {
    ctx.save();
    ctx.font = '700 11px Arial,sans-serif';
    for (const g of L.groups) {
      const w = Math.max(...g.rows.map(it => rowWidth(ctx, it))) + 2 * PAD + 2;
      const h = g.rows.length * LINE_H + 2 * PAD,
        r = place(pl, g.q, w, h, true),
        // le cartouche reste dans la carte, hors de la colonne des boutons de droite
        dx = W ? Math.min(0, W - EDGE_R - r.x1) || Math.max(0, EDGE - r.x0) : 0,
        dy = H ? Math.min(0, H - EDGE - r.y1) || Math.max(0, EDGE - r.y0) : 0;
      g.r = {
        x0: r.x0 + dx,
        x1: r.x1 + dx,
        y0: r.y0 + dy,
        y1: r.y1 + dy
      };
      g.rows.forEach((it, i) => C.hits.rows.push({
        id: it.id,
        x0: g.r.x0,
        x1: g.r.x1,
        y0: g.r.y0 + PAD + i * LINE_H,
        y1: g.r.y0 + PAD + (i + 1) * LINE_H
      }));
    }
    ctx.restore();
  };
  L.paint = c => {
    c.save();
    c.lineJoin = 'round';
    c.lineCap = 'round';
    for (const t of L.traces) {
      const on = !!t.it && t.it.id === hl,
        faded = !!hl && !!t.it && !on,
        path = () => {
          c.beginPath();
          t.pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
          c.stroke();
        };
      c.setLineDash(t.dash ? [7, 5] : []);
      c.globalAlpha = faded ? .25 : .8;
      c.strokeStyle = S.theme.bg;
      c.lineWidth = on ? 8 : 6;
      path();
      c.globalAlpha = faded ? .3 : 1;
      c.strokeStyle = t.it ? hueOf(t.it) : S.theme.muted;
      c.lineWidth = t.it ? on ? 5 : 3 : 2;
      path();
    }
    c.setLineDash([]);
    c.globalAlpha = 1;
    // le point de sortie ou d'entrée de chaque cartouche
    for (const g of L.groups) {
      c.beginPath();
      c.arc(g.q.x, g.q.y, 4, 0, Math.PI * 2);
      c.fillStyle = S.theme.bg;
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = g.rows.some(i => i.id === hl) ? hueOf(g.rows.find(i => i.id === hl)) : S.theme.fg;
      c.stroke();
    }
    c.restore();
    drawRunways(c, L.arrows);
  };
  L.top = c => {
    c.save();
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.font = '700 11px Arial,sans-serif';
    for (const g of L.groups) {
      c.fillStyle = S.theme.bg;
      c.globalAlpha = .94;
      c.fillRect(g.r.x0, g.r.y0, g.r.x1 - g.r.x0, g.r.y1 - g.r.y0);
      c.globalAlpha = 1;
      c.lineWidth = 1;
      c.strokeStyle = S.theme.grid;
      c.strokeRect(g.r.x0 + .5, g.r.y0 + .5, g.r.x1 - g.r.x0 - 1, g.r.y1 - g.r.y0 - 1);
      g.rows.forEach((it, i) => {
        const y0 = g.r.y0 + PAD + i * LINE_H,
          y = y0 + LINE_H / 2;
        let x = g.r.x0 + PAD + 1;
        if (it.id === hl) {
          c.fillStyle = MapsRender.withAlpha(hueOf(it), .16);
          c.fillRect(g.r.x0 + 1, y0, g.r.x1 - g.r.x0 - 2, LINE_H);
        }
        c.fillStyle = hueOf(it);
        c.fillRect(x, y - 4, 8, 8);
        x += 14;
        c.fillText(it.label, x, y);
        x += c.measureText(it.label).width + 4;
        if (it.old) {
          c.fillStyle = S.theme.muted;
          c.fillText('⌛', x, y);
          x += c.measureText('⌛').width + 4;
        }
        if (it.why.length) {
          c.fillStyle = S.theme.warn;
          c.fillText('⚠', x, y);
        }
      });
    }
    c.restore();
  };
  return L;
}
/** L'élément sous (x, y) : la ligne d'un cartouche d'abord, sinon le tracé le plus proche à moins de 14 px ; null sinon. */
export function chooseAt(x, y) {
  const h = S?.choose?.hits;
  if (!h) return null;
  // le dernier cartouche peint est au-dessus : c'est lui que le doigt touche
  const r = [...h.rows].reverse().find(q => x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1);
  if (r) return r.id;
  let best = null,
    min = 14;
  for (const l of h.lines)
    for (let i = 1; i < l.pts.length; i++) {
      const d = distSeg(x, y, l.pts[i - 1], l.pts[i]);
      if (d < min) {
        min = d;
        best = l.id;
      }
    }
  return best;
}
/** Toucher sur la carte en mode choix : ce qui est dessous est choisi ; rien dessous : rien (aucun autre contenu ne remplace la liste). */
export function chooseTap(x, y) {
  const id = chooseAt(x, y);
  if (id) chooseDo(id);
}
/** Survol de la carte à la souris : l'élément dessous est surligné (sa ligne, son cartouche, ses transitions). */
export function chooseHover(x, y) {
  setHl(chooseAt(x, y), true);
}
