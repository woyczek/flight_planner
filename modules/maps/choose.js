// V3 maps — le mode « choisir sur la carte » (V3_SPECIFICATION § 10.23 et § 10.30 ; modules/maps/SPEC.md § 5.1). Carburant ouvre
// #maps?choose=dep|arr&icao=LFXX depuis le bouton « Sur la carte » d'un côté (ou la carte du terrain, « Choisir sur la carte ») :
// la Carte lit la demande (ctx.consume), cadre le terrain sur ses procédures, estompe le fond et ses propres couches, et le volet
// liste TOUTES les familles du côté à la fois, dans son ordre : piste, SID (départ) ou STAR (arrivée), approche (arrivée ; sa
// transition repliée dessous). Chaque groupe : « Aucune » d'abord, les compatibles puis les ⚠, six lignes et « N autres… » (la
// feuille est la seule surface qui défile). Un toucher sur une ligne ou un tracé pose le choix de sa famille dans le volet (état
// local du mode, rien d'écrit) ; la Carte dessine la sélection en cours (les pistes, la procédure choisie dans sa teinte, le reste de
// la famille touchée estompé). Piste et procédure se corrigent sans rien imposer : une ligne sous le groupe propose « Passer en 25 »
// ou « Choisir OKRIX5B ». Chaque piste porte le vent du METAR déjà connu (face ou arrière, travers). La fermeture (✕, Échap,
// « Terminer ») rend tout à Carburant en un seul retour : #fuel?focus=<côté>&rwy=…&star=…&app=…&apptrans=… (une clé par famille
// touchée, « none » pour « Aucune », clé absente = famille intouchée) ; Carburant est le seul à écrire. Les règles (ordre, ⚠,
// transitions, approches listées une fois, pistes, piste d'une procédure) sont celles de frame/lib/procedures.js, le vent celui de
// frame/lib/wind.js, sans copie.

import {
  S,
  tt,
  esc,
  setData,
  onMission
} from './state.js';
import {
  TX
} from './texts.js';
import * as PR from '../../frame/lib/procedures.js';
import {
  components
} from '../../frame/lib/wind.js';
import {
  proceduresOf
} from '../../frame/lib/flight_path.js';
import {
  place,
  arrowOf,
  drawRunways,
  runwayBearing,
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
  syncButtons,
  fitMap
} from './screen.js';
import {
  unpinAd
} from './vfr.js';
import {
  applyFlight
} from './data.js';

/** Familles du volet, dans l'ordre du côté ; la transition de l'approche est repliée sous l'approche (appTrans). */
const FAMS = {
  dep: ['rwy', 'sid'],
  arr: ['rwy', 'star', 'app']
};
/** Clé du retour vers Carburant par famille (route.procedures v2, en minuscules dans l'adresse ; V3 § 10.30). */
const KEY = {
  rwy: 'rwy',
  sid: 'sid',
  star: 'star',
  app: 'app',
  appTrans: 'apptrans'
};
/** Au plus 7 lignes montrées par groupe (« Aucune » et six), le reste replié sous « N autres… » qui le déplie sur place : la feuille
 *  est la seule surface qui défile (V3 § 10.30 : jamais deux barres de défilement). */
const MAX_ROWS = 6;
/** Vent arrière au-delà duquel la ligne de piste le dit en orange (nœuds). */
const TAIL_WARN = 5;
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
    side = got.choose,
    icao = String(got.icao ?? '').trim().toUpperCase();
  if (ctx.query?.mission || ctx.query?.tune) return null;
  return askOf(side, icao);
}
/** La demande d'un côté et d'un terrain (vide : celui du vol), ou null si elle ne se lit pas. sel : le choix du volet par famille
 *  (absent : intouchée ; null : « Aucune » ; sinon l'identifiant, la piste sans « RW ») ; focus : la famille touchée en dernier
 *  (tracée entière sur la carte) ; last : celle dont le choix vient de changer (la ligne de correction en dépend). */
function askOf(side, icao, fromCard = false) {
  if (side !== 'dep' && side !== 'arr' || (icao && !/^[A-Z0-9]{4}$/.test(icao))) return null;
  return {
    side,
    icao,
    fromCard,
    ready: false,
    sel: {},
    more: {},
    focus: null,
    last: null,
    hl: null,
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
/** Le choix en vigueur du côté : celui du vol, puis celui du volet par-dessus (clés de route.procedures v2). */
const eff = C => ({
  ...C.cur,
  ...C.sel
});
/** Fiches d'une famille dans l'ordre du groupe (PR.orderProcedures sur le choix en vigueur), sans doublon d'identifiant. */
function recsOf(C, fam) {
  const o = eff(C),
    of = kind => C.recs.filter(r => r.kind === kind),
    raw = fam === 'rwy' ? C.rwys : fam === 'sid' ? of('SID').filter(r => !r.transition) : fam === 'star' ? of('STAR').filter(r => !r
      .transition) : fam === 'app' ? PR.appChoices(of('APP')).list : o.app ? PR.appChoices(of('APP')).transitionsOf(o.app) : [];
  return PR.orderProcedures([...new Map(raw.map(r => [r.id, r])).values()], fam, o, C.byId);
}
/** Nom d'une fiche pour une ligne ou un cartouche : la piste (« Piste 25 »), sinon le nom (les fiches sans nom ne sont pas listées),
 *  la piste quand elle n'en dessert qu'une et que le nom ne la dit pas, l'état de la source ; une transition porte le nom de sa
 *  transition. ⌛ et ⚠ viennent à part. */
function labelOf(fam, rec) {
  if (fam === 'rwy') return tt(TX.chRwy, {
    r: rec.id
  });
  const name = (fam === 'appTrans' ? rec.transition : null) || PR.nameOf(rec, rec.id) || rec.id,
    one = PR.runwayOf(rec),
    tags = rec.status === 'xplane' || rec.local ? tt(TX.procX) : rec.status === 'lnm' ? tt(TX.procLnm) : '';
  return [name, one && !name.toUpperCase().includes(one) ? one : '', tags].filter(Boolean).join(' · ');
}
/** Le seuil de piste où une SID commence, ajouté devant ses points : la piste choisie si la SID la dessert, sinon la seule qu'elle
 *  dessert ; null si elle n'est pas connue. */
function thresholdOf(C, rec) {
  const o = eff(C),
    id = PR.rwNum(o.rwy) && PR.servesRwy(rec, o.rwy) ? o.rwy : PR.runwayOf(rec),
    rw = id && C.known.find(r => num(r.lat) && num(r.lon) && PR.sameRwy(r.id, id));
  return rw ? {
    id: `RW${PR.rwNum(rw.id)}`,
    lat: +rw.lat,
    lon: +rw.lon
  } : null;
}
/** Vent du METAR déjà connu sur la piste rec : { text, tail (arrière au-delà de TAIL_WARN), tip } ; null sans METAR, sans direction
 *  (VRB) ou sans relèvement de la piste — rien n'est inventé. */
function windOf(C, rec) {
  const w = C.wind;
  if (!w) return null;
  const brg = runwayBearing(rec, C.known, num(C.ad?.magVar) ? +C.ad.magVar : null),
    k = brg === null ? null : components(brg, w.dir, w.kt);
  if (!k) return null;
  const head = k.head >= 0 ? `↑ ${k.head} kt` : `↓ ${-k.head} kt`,
    // la flèche de travers va dans le sens où le vent pousse : venu de droite, « ← »
    cross = k.cross ? `${k.side === 'R' ? '←' : '→'} ${k.cross} kt` : '';
  return {
    text: [head, cross].filter(Boolean).join(' · '),
    tail: k.head < -TAIL_WARN,
    tip: tt(TX.chWindTip, {
      id: C.icao,
      d: String(Math.round(w.dir)).padStart(3, '0'),
      kt: Math.round(w.kt),
      h: k.head,
      x: k.cross
    })
  };
}
/** Les lignes d'une famille, dans l'ordre du groupe : { id, fam, rec, hi (rang de teinte, stable), label, old, why (raisons du ⚠),
 *  pts, anchor (point de sortie d'une SID, d'entrée sinon), chosen, wind (piste) }. */
function itemsOf(C, fam) {
  const o = eff(C),
    exit = fam === 'sid';
  return recsOf(C, fam).map((rec, hi) => {
    const why = fam === 'rwy' ? [] : PR.conflictsOf(fam, rec, o, C.byId).map(c => c.kind === 'rwy' ? tt(TX.chConflictRwy, {
        rwy: c.rwy
      }) : tt(TX.chConflictStarApp, {
        app: c.app || PR.nameOf(C.byId.get(c.appId), c.appId) || ''
      })),
      pts = fam === 'rwy' ? [] : pointsOf(rec),
      th = fam === 'sid' && pts.length ? thresholdOf(C, rec) : null;
    if (th) pts.unshift(th);
    return {
      id: rec.id,
      fam,
      rec,
      hi,
      label: labelOf(fam, rec),
      old: !!rec.outdated,
      why,
      pts,
      anchor: pts.length ? exit ? pts.at(-1) : pts[0] : null,
      chosen: fam === 'rwy' ? !!PR.rwNum(o.rwy) && PR.rwNum(rec.id) === PR.rwNum(o.rwy) : o[fam] === rec.id,
      wind: fam === 'rwy' ? windOf(C, rec) : null
    };
  });
}
/** Familles montrées : celles du côté, plus la transition de l'approche quand l'approche choisie en a. */
const famsOf = C => [...FAMS[C.side], ...(C.side === 'arr' && recsOf(C, 'appTrans').length ? ['appTrans'] : [])];
/** Refait les lignes de chaque famille (après un choix) : C.items = { famille: lignes }. */
function refresh(C) {
  C.items = Object.fromEntries(famsOf(C).map(f => [f, itemsOf(C, f)]));
}
/** Toutes les lignes, toutes familles. */
const allItems = C => Object.values(C.items || {}).flat();
/** Teinte d'une ligne : l'une des huit de la palette, en cycle (jour ou nuit). */
const hueOf = it => {
  const h = MapsRender.palette(!!S.theme?.dark).procHues;
  return h[it.hi % h.length];
};
/** Transitions de la procédure it (SID, STAR : PR.transitionsOf ; approche : appChoices), tracées en tireté quand elle est surlignée. */
function transOf(C, it) {
  const of = kind => C.recs.filter(r => r.kind === kind);
  return it.fam === 'sid' ? PR.transitionsOf(of('SID'), it.id) : it.fam === 'star' ? PR.transitionsOf(of('STAR'), it.id) : it.fam ===
    'app' ? PR.appChoices(of('APP')).transitionsOf(it.id) : [];
}

// ---------------------------------------------------------------- le chargement
/** Lit ce qu'aerodb sait du terrain (procédures publiées, jamais les lectures douteuses ; pistes ; terrain) et le METAR déjà connu
 *  (cache de la couche météo du cadre, rien n'est demandé au réseau), puis cadre la vue sur les procédures du côté. Sans rien à
 *  montrer, le mode se retire avec une notification. Appelé au montage, après le vol et avant le fond de carte (qui part de S.fit). */
export async function chooseLoad() {
  const C = S.choose,
    A = S.ctx.aerodb,
    r = S.route.flight?.route || {},
    ask = make => Promise.resolve().then(make).then(v => v || [], () => []);
  C.icao ||= String((C.side === 'dep' ? r.dep : r.arr) || '').trim().toUpperCase();
  const [recs, known, ad, at, wx] = await Promise.all([ask(() => A?.procedures?.(C.icao)), ask(() => A?.runways?.(C.icao)), ask(() => A
    ?.aerodromes?.({
      icao: C.icao
    })), Promise.resolve().then(() => A?.coords?.(C.icao)).catch(() => null), Promise.resolve().then(() => S.ctx.weather?.metar?.([C
    .icao
  ], {
    cacheOnly: true
  })).catch(() => null)]);
  if (!S) return;
  // jamais une fiche douteuse (PR.isDoubt : statut doubt, sans nom, « NONAME » ; la règle de Carburant)
  C.recs = recs.filter(p => p?.id && !PR.isDoubt(p));
  C.byId = new Map(C.recs.map(p => [p.id, p]));
  C.known = known;
  C.ad = ad[0] || null;
  C.rwys = PR.runwayChoices(known, C.recs, C.ad);
  const m = wx?.items?.[C.icao];
  // vent du METAR (directions vraies) ; variable (VRB) ou absent : pas de ligne
  C.wind = m && num(m.wdir) && num(m.wspd) ? {
    dir: +m.wdir,
    kt: +m.wspd
  } : null;
  C.cur = proceduresOf(S.route.flight)[C.side] || {};
  refresh(C);
  if (!allItems(C).length) {
    S.ctx.notify?.(tt(TX.chNoData, {
      icao: C.icao
    }), 'warn');
    S.choose = null;
    syncButtons(); // les boutons de la carte reviennent
    return;
  }
  // la famille touchée d'abord : la première du côté que le vol n'a pas choisie, sinon la première qui a quelque chose
  C.focus = FAMS[C.side].find(f => C.cur[f] === undefined && C.items[f]?.length) || FAMS[C.side].find(f => C.items[f]?.length);
  const own = [...(C.items.rwy || []).map(i => i.rec), ...allItems(C).flatMap(i => i.pts)],
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
/** Le mode est-il ouvert ? (la classe de la boîte suit : le fond MapLibre s'estompe). */
export function chooseView() {
  const on = !!S?.choose;
  if (S?.box && S.box.classList.contains('mp-choosing') !== on) S.box.classList.toggle('mp-choosing', on);
}
/** Le mode s'ouvre une fois les données lues : la feuille porte le volet, le fond s'estompe, la carte est recadrée. */
export function chooseStart() {
  chooseView();
  chooseRender();
  schedule();
}
/** Le mode s'ouvre depuis la carte du terrain (« Choisir sur la carte ») : le même chemin que #maps?choose=, sans rechargement ;
 *  la vue se recadre sur les procédures. */
export async function chooseOpen(side, icao) {
  const ask = askOf(side, String(icao ?? '').trim().toUpperCase(), true);
  if (!S || !ask || onMission()) return;
  unpinAd();
  S.choose = ask;
  syncButtons();
  chooseView();
  await chooseLoad();
  if (!S) return;
  if (S.choose !== ask) return chooseView(); // rien à montrer (notifié) ou une autre demande : la classe suit
  chooseStart();
  if (S.map) fitMap(true);
}
/** Le mode se retire sans retour vers Carburant (ouvert depuis la carte du terrain, rien choisi) : la carte reprend le vol entier et
 *  son cadre, la feuille son profil. */
export async function chooseExit() {
  if (!S?.choose) return;
  S.choose = null;
  chooseView();
  endData('choose');
  syncButtons();
  await applyFlight(false);
  if (S?.map && !S.choose) fitMap(true);
}
/** L'adresse du retour : #fuel?focus=<côté> et une clé par famille touchée (« none » pour « Aucune ») ; '' rien de touché. */
export function chooseReturn(C = S?.choose) {
  if (!C) return '';
  const keys = Object.entries(C.sel).filter(([f]) => KEY[f]).map(([f, v]) => `&${KEY[f]}=${encodeURIComponent(v === null ? 'none' : f ===
    'rwy' ? PR.rwNum(v) : v)}`);
  return keys.length ? `#fuel?focus=${C.side}${keys.join('')}` : '';
}
/** Fermeture du volet (✕, Échap, « Terminer ») : tout ce qui a été choisi part vers Carburant en un seul retour, qui l'écrit ; la
 *  Carte n'écrit jamais. Rien de choisi : retour à Carburant sur ce côté, ou, ouvert depuis la carte du terrain, à la carte du vol. */
export function chooseFinish() {
  const C = S?.choose;
  if (!C) return;
  const to = chooseReturn(C);
  if (!to && C.fromCard) return chooseExit();
  location.replace(to || `#fuel?focus=${C.side}`);
}

// ---------------------------------------------------------------- choisir
/** Pose le choix de la famille fam (id, « none » pour « Aucune ») dans le volet : une procédure qui ne dessert qu'une piste la pose
 *  quand aucune n'est choisie (PR.runwayOf) ; une autre approche remet sa transition à « Aucune » quand l'ancienne ne la suit pas.
 *  Rien n'est écrit : la sélection reste dans le volet et sur la carte jusqu'à la fermeture. */
export function choosePick(fam, id) {
  const C = S?.choose;
  if (!C?.ready || !famsOf(C).includes(fam) || !id) return;
  const v = id === 'none' ? null : fam === 'rwy' ? PR.rwNum(id) : id;
  C.sel[fam] = v;
  C.last = fam;
  if (fam !== 'appTrans') C.focus = fam;
  const rec = v && fam !== 'rwy' ? C.byId.get(v) : null,
    one = rec ? PR.runwayOf(rec) : null;
  if (one && !PR.rwNum(eff(C).rwy)) C.sel.rwy = one;
  if (fam === 'app') {
    const keep = eff(C).appTrans;
    if (keep && !recsOf(C, 'appTrans').some(r => r.id === keep)) C.sel.appTrans = null;
  }
  refresh(C);
  chooseRender();
  schedule();
}
/** Ligne de correction sous un groupe de procédures (V3 § 10.30), en données : { text, fam, val, act } ou null. La procédure vient
 *  d'être choisie et ne dessert qu'une autre piste : « OPAL2E sert la 25 — Passer en 25 » ; sinon (la piste a changé, ou elle en
 *  dessert plusieurs) : « OKRIX5A ne sert pas la 07 — Choisir OKRIX5B », la première du groupe qui la dessert (PR.firstServing). */
function fixOf(C, fam) {
  const o = eff(C),
    rec = o[fam] ? C.byId.get(o[fam]) : null,
    rwy = PR.rwNum(o.rwy);
  if (!rec || !rwy || PR.servesRwy(rec, rwy)) return null;
  const p = PR.nameOf(rec, rec.id) || rec.id,
    one = PR.runwayOf(rec);
  if (one && C.last === fam) return {
    text: tt(TX.chServes, {
      p,
      r: one
    }),
    fam: 'rwy',
    val: one,
    act: tt(TX.chUseRwy, {
      r: one
    })
  };
  const alt = PR.firstServing((C.items[fam] || []).map(i => i.rec), rwy);
  return {
    text: tt(TX.chNotServes, {
      p,
      r: rwy
    }),
    fam,
    val: alt?.id || null,
    act: alt ? tt(TX.chUseProc, {
      p: PR.nameOf(alt, alt.id) || alt.id
    }) : ''
  };
}

// ---------------------------------------------------------------- la feuille : titre, groupes, Terminer
/** Ligne d'un groupe : l'échantillon de teinte (pas pour les pistes), le nom, le vent (pistes), ⌛ (gris) et ⚠ (orange) en fin de
 *  ligne ; la ligne choisie pressée. */
function rowHtml(C, it) {
  const tip = [it.old ? tt(TX.procOutdated) : '', ...it.why, it.wind?.tip || ''].filter(Boolean).join(' · ');
  return `<button type="button" class="mp-ch-row" data-fam="${it.fam}" data-id="${esc(it.id)}" data-hl="${C.hl === it.id ? 1 : 0}" aria-pressed="${it.chosen}"${it.fam === 'rwy' ? '' : ` style="--c:${hueOf(it)}"`}${tip ? ` title="${esc(tip)}"` : ''}>${it.fam === 'rwy' ? '' : '<i class="mp-ch-sw" aria-hidden="true"></i>'}<span class="mp-ch-name">${esc(it.label)}</span>${it.wind ? `<span class="mp-ch-wind"${it.wind.tail ? ' data-tail="1"' : ''}>${esc(it.wind.text)}</span>` : ''}${it.old ? `<span class="mp-ch-old" role="img" aria-label="${esc(tt(TX.procOutdated))}">⌛</span>` : ''}${it.why.length ? `<span class="mp-ch-warn" role="img" aria-label="${esc(it.why.join(' · '))}">⚠</span>` : ''}</button>`;
}
/** Un groupe : son titre, « Aucune » (pressée quand elle est le choix), six lignes et « N autres… », la ligne de correction. */
function groupHtml(C, fam) {
  const list = C.items[fam] || [],
    o = eff(C),
    noneOn = fam in o && o[fam] === null,
    fold = !C.more[fam] && list.length > MAX_ROWS + 1,
    shown = fold ? list.slice(0, MAX_ROWS) : list,
    fix = fam === 'rwy' ? null : fixOf(C, fam);
  return `<section class="mp-ch-grp" data-fam="${fam}"><h4 class="mp-ch-head">${esc(tt(TX.chFam[fam]))}</h4><div class="mp-ch-list" role="group" aria-label="${esc(tt(TX.chFam[fam]))}"><button type="button" class="mp-ch-row mp-ch-none" data-fam="${fam}" data-id="none" data-hl="0" aria-pressed="${noneOn}"><span class="mp-ch-name">${esc(tt(TX.chNone))}</span></button>${shown.map(it => rowHtml(C, it)).join('')}${fold ? `<button type="button" class="mp-ch-row mp-ch-more" data-more="${fam}">${esc(tt(TX.chMore, { n: list.length - MAX_ROWS }))}</button>` : ''}</div>${fix ? `<p class="mp-ch-fix">${esc(fix.text)}${fix.val ? ` <button type="button" class="f-btn" data-fix="${fix.fam}" data-val="${esc(fix.val)}">${esc(fix.act)}</button>` : ''}</p>` : ''}${list.length ? '' : `<p class="f-muted mp-ch-empty">${esc(tt(TX.chEmpty, { icao: C.icao }))}</p>`}</section>`;
}
/** Le corps de la feuille : la consigne, les groupes du côté, « Terminer ». */
function bodyHtml(C) {
  return `<div class="mp-ch"><p class="f-muted mp-ch-hint">${esc(tt(TX.chHint))}</p>${famsOf(C).map(f => groupHtml(C, f)).join('')}<button type="button" class="f-btn primary mp-ch-done" data-done="1">${esc(tt(TX.chDone))}</button></div>`;
}
/** (Re)dessine le contenu de la feuille ; écrit seulement si le HTML change (openData). */
export function chooseRender() {
  const C = S?.choose;
  if (!C?.ready) return;
  const title = tt(TX.chSide[C.side], {
    icao: C.icao
  });
  openData('choose', `choose:${C.side}:${C.icao}`, title, () => bodyHtml(C), title);
}
/** Surligne la ligne id (ligne, cartouche, tracé) ou plus rien ; fromMap : son groupe se déplie si elle y est repliée, et elle
 *  vient sous les yeux. Les lignes ne sont pas refaites, seul leur attribut data-hl change. */
export function setHl(id, fromMap = false) {
  const C = S?.choose;
  if (!C?.ready) return;
  const it = id ? allItems(C).find(i => i.id === id) : null,
    hl = it ? id : null;
  if (C.hl === hl) return;
  C.hl = hl;
  if (it && it.fam !== 'appTrans' && it.fam !== 'rwy' && fromMap) C.focus = it.fam;
  for (const b of S.dbodyEl.querySelectorAll('.mp-ch-row')) setData(b, 'hl', b.dataset.id === hl ? '1' : '0');
  if (it && fromMap && !C.more[it.fam] && !S.dbodyEl.querySelector(`.mp-ch-row[data-id="${CSS.escape(hl)}"]`)) {
    C.more[it.fam] = true; // la ligne surlignée sur la carte est repliée : son groupe se déplie
    chooseRender();
  }
  if (it && fromMap) S.dbodyEl.querySelector(`.mp-ch-row[data-id="${CSS.escape(hl)}"]`)?.scrollIntoView({
    block: 'nearest'
  });
  schedule();
}
/** Gestes de la feuille (délégués : le HTML est refait) : un toucher sur une ligne pose le choix de sa famille, sur « N autres… »
 *  déplie le groupe, sur la ligne de correction l'applique, sur « Terminer » rend le tout à Carburant ; le survol et le focus d'une
 *  ligne la surlignent sur la carte. Rend la fonction d'arrêt. */
export function chooseEvents() {
  const el = S.dbodyEl,
    on = () => S?.dpanel === 'choose',
    click = e => {
      const pick = e.target.closest('[data-choose]');
      if (pick) return chooseOpen(pick.dataset.choose, pick.dataset.icao); // la carte du terrain
      if (!on()) return;
      const C = S.choose,
        more = e.target.closest('[data-more]'),
        fix = e.target.closest('[data-fix]'),
        row = e.target.closest('.mp-ch-row[data-fam]');
      if (e.target.closest('[data-done]')) return chooseFinish();
      if (more) {
        C.more[more.dataset.more] = true;
        return chooseRender();
      }
      if (fix) return choosePick(fix.dataset.fix, fix.dataset.val);
      if (row) choosePick(row.dataset.fam, row.dataset.id);
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
  ctx.measureText('⚠').width : 0);
/** Mise en page du mode à l'écran (projection toC) : { traces, arrows, groups, reserve(pl), paint(ctx), top(ctx) } ; null hors du
 *  mode. La sélection en cours reste dessinée : toutes les pistes (la choisie en gras), toutes les procédures de la famille touchée
 *  (estompées sauf la choisie quand il y en a une), la procédure choisie des autres familles et la transition choisie de l'approche.
 *  Les cadres touchables (tracés, lignes des cartouches) sont rangés dans S.choose.hits pour le toucher et le survol. Tant que les
 *  données ne sont pas lues, rien n'est tracé (les couches de la Carte sont déjà estompées). */
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
  const hl = C.hl,
    o = eff(C),
    trace = (it, pts, extra = {}) => {
      if (!pts.length) return;
      L.traces.push({
        it,
        pts,
        ...extra
      });
      C.hits.lines.push({
        id: it.id,
        pts
      });
    };
  // les pistes : toutes, la choisie en gras
  for (const it of C.items.rwy || []) {
    const a = arrowOf(toC, C.side, it.rec, C.known, C.ad?.magVar, it.chosen ? S.theme.fg : S.theme.muted);
    if (!a) continue;
    a.lw = it.chosen ? 6 : it.id === hl ? 4.5 : 3;
    L.arrows.push(a);
    C.hits.lines.push({
      id: it.id,
      pts: [a.a, a.b]
    });
  }
  // les procédures : la famille touchée entière (le reste estompé dès qu'une est choisie), le choix des autres familles
  const shown = [];
  for (const f of famsOf(C).filter(f => f !== 'rwy' && f !== 'appTrans')) {
    const list = C.items[f] || [];
    for (const it of f === C.focus ? list : list.filter(i => i.chosen)) {
      trace(it, it.pts.map(p => toC(p.lat, p.lon)), {
        dim: f === C.focus && !!o[f] && !it.chosen && it.id !== hl
      });
      shown.push(it);
    }
  }
  // transitions : celles de la procédure surlignée, et la transition choisie de l'approche
  const on = hl && shown.find(i => i.id === hl);
  if (on)
    for (const t of transOf(C, on)) trace(on, pointsOf(t).map(p => toC(p.lat, p.lon)), {
      dash: true
    });
  const at = (C.items.appTrans || []).find(i => i.chosen);
  if (at) trace(at, pointsOf(at.rec).map(p => toC(p.lat, p.lon)), {
    dash: true
  });
  // un cartouche par point de sortie ou d'entrée : les noms qui s'y rejoignent, empilés
  const groups = new Map();
  for (const it of shown) {
    if (!it.anchor) continue;
    const k = it.anchor.id ? it.anchor.id.toUpperCase() : `${it.anchor.lat.toFixed(3)},${it.anchor.lon.toFixed(3)}`;
    if (!groups.has(k)) groups.set(k, {
      q: toC(it.anchor.lat, it.anchor.lon),
      rows: []
    });
    groups.get(k).rows.push(it);
  }
  L.groups = [...groups.values()];
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
      const lit = t.it.id === hl || t.it.chosen,
        faded = t.dim || (!!hl && t.it.id !== hl && !t.it.chosen),
        path = () => {
          c.beginPath();
          t.pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
          c.stroke();
        };
      c.setLineDash(t.dash ? [7, 5] : []);
      c.globalAlpha = faded ? .25 : .8;
      c.strokeStyle = S.theme.bg;
      c.lineWidth = lit ? 8 : 6;
      path();
      c.globalAlpha = faded ? .3 : 1;
      c.strokeStyle = hueOf(t.it);
      c.lineWidth = lit ? 5 : 3;
      path();
    }
    c.setLineDash([]);
    c.globalAlpha = 1;
    // le point de sortie ou d'entrée de chaque cartouche
    for (const g of L.groups) {
      const lit = g.rows.find(i => i.id === hl) || g.rows.find(i => i.chosen);
      c.beginPath();
      c.arc(g.q.x, g.q.y, 4, 0, Math.PI * 2);
      c.fillStyle = S.theme.bg;
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = lit ? hueOf(lit) : S.theme.fg;
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
        if (it.id === hl || it.chosen) {
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
/** Toucher sur la carte en mode choix : ce qui est dessous est choisi dans sa famille (le volet le garde) ; rien dessous : rien. */
export function chooseTap(x, y) {
  const C = S?.choose,
    id = chooseAt(x, y),
    it = id && allItems(C).find(i => i.id === id);
  if (it) choosePick(it.fam, it.id);
}
/** Survol de la carte à la souris : l'élément dessous est surligné (sa ligne, son cartouche, ses transitions). */
export function chooseHover(x, y) {
  setHl(chooseAt(x, y), true);
}
