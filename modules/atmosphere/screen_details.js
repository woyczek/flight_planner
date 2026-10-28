// Les détails de l'écran Météo (SPEC.md § 2.5, bouton « liste » sur la carte), chargés à leur première ouverture : le
// résumé du vol en liste compacte (une ligne par valeur : nom, valeur, note), les terrains (METAR, TAF), le tableau le
// long de la trajectoire calculée (une ligne ouvre sa tranche), les sources et la ligne d'état.

import * as A from './atmo.js';
import {
  esc,
  fmtHM,
  fmtLvl
} from './fmt.js';
import {
  TX
} from './texts.js';
import {
  station
} from '../fuel/weather.js';

const R = Math.PI / 180;

/** Dessine les détails dans le corps de la feuille : app = l'écran (S, F, dbody, statusText, openRouteSlice). */
export function drawDetails(app) {
  const {
    S,
    F,
    dbody
  } = app, {
    T
  } = F;
  const box = document.createElement('div');
  box.className = 'at-pad';
  box.innerHTML = `<dl class="at-kv">${kpis(S, F).map(([k, v, n]) => `<div><dt title="${esc(k)}">${esc(k)}</dt><dd>${esc(v)}</dd><dd title="${esc(n)}">${esc(n)}</dd></div>`).join('')}</dl>
    <h3>${esc(T('wxTitle'))} <span class="f-muted" style="font-weight:400;font-size:.85em">${esc(S.wx?.note || '')}</span></h3><div class="at-wx">${aerodromeCards(S, F)}</div>
    <h3>${esc(T('tblTitle'))}</h3><p class="f-muted" style="margin:0 0 4px">${esc(T('tblSub'))}</p>
    <div class="f-scroll"><table class="f-table">${table(S, F)}</table></div>
    <p class="at-foot">${esc(app.statusText())}</p><p class="at-foot">${esc(T('foot'))}</p>`;
  box.querySelector('table').onclick = ev => {
    const tr = ev.target.closest('tr[data-i]');
    if (tr) app.openRouteSlice(+tr.dataset.i);
  };
  // les messages bruts en texte (jamais interprétés)
  box.querySelectorAll('.at-raw[data-raw]').forEach(n => n.textContent = n.dataset.raw);
  dbody.replaceChildren(box);
}

/** Résumé du vol : [nom, valeur, note] — distance, niveau et paliers, montée et descente, vent moyen et écart à
 *  l'atmosphère type en croisière, isotherme 0 °C, inversions sous le niveau, givrage, nuages, altitude-densité au départ. */
function kpis(S, F) {
  const {
    T,
    fmtNum,
    fmtWind
  } = F;
  const t = S.traj,
    al = S.along,
    cruise = al.filter(a => a.phase === 'cruise' && a.x && !a.x.below),
    mean = (arr, f) => {
      const v = arr.map(f).filter(Number.isFinite);
      return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
    },
    vx = mean(cruise, a => a.x.kt * Math.sin(a.x.dirDeg * R)),
    vy = mean(cruise, a => a.x.kt * Math.cos(a.x.dirDeg * R)),
    head = mean(cruise, a => a.comp?.head),
    isa = mean(cruise, a => a.x.isaDev),
    zeros = S.cols.map(c => A.zeroIsotherms(c)[0]).filter(Number.isFinite),
    invN = S.cols.filter(c => A.inversions(c).some(v => v.fromFt < S.levelFt)).length,
    ice1 = al.filter(a => a.ice >= 1).length,
    ice2 = al.filter(a => a.ice >= 2).length,
    cloudNm = al.filter(a => (a.x?.cc ?? 0) >= 50).length,
    dep = S.cols[0],
    depDa = dep?.sfc.tC != null ? A.densityAltFt(A.density(dep.sfc.psfc, dep.sfc.tC, dep.sfc.tdC)) : null,
    steps = t.steps.slice(1).filter(s => s.ft !== S.levelFt);
  return [
    [T('kDist'), `${fmtNum(t.total)} NM`, T('kDistN', {
      n: S.flight.points.length,
      m: fmtNum(t.minutesAt(t.total))
    })],
    [T('levelReq'), fmtLvl(S.levelFt), steps.length ? steps.map(s => T('stepFrom', {
      l: fmtLvl(s.ft),
      id: s.id
    })).join(' · ') : T('noStep')],
    [T('kClimb'), `${t.toc == null ? '—' : fmtNum(t.toc)} / ${t.tod == null ? '—' : fmtNum(t.total - t.tod)} NM`, S.flight.profile ? T('kProfile') : T('kDefRates')],
    [T('kWind'), vx == null ? '—' : fmtWind((Math.atan2(vx, vy) / R + 360) % 360, Math.hypot(vx, vy)), head == null ? '' : T(head >=
      0 ? 'kHeadMean' : 'kTailMean', {
        kt: Math.abs(Math.round(head))
      })],
    [T('kIsa'), isa == null ? '—' : `${isa >= 0 ? '+' : '−'}${Math.abs(Math.round(isa))} °C`, ''],
    [T('kZero'), zeros.length ? `${fmtLvl(Math.min(...zeros))}` : '—', zeros.length ? T('upTo', {
      l: fmtLvl(Math.max(...zeros))
    }) : ''],
    [T('kInv'), `${invN} / ${S.cols.length}`, T('kInvN')],
    [T('kIce'), `${ice1} NM`, T('kIceN', {
      n: ice2
    })],
    [T('kCloud'), `${cloudNm} NM`, T('kCloudN')],
    [T('kDa'), depDa == null ? '—' : `${fmtNum(Math.round(depDa / 10) * 10)} ft`, dep ? T('kDaN', {
      ft: fmtNum(Math.round(dep.elevFt / 10) * 10)
    }) : '']
  ];
}

/** Tableau le long de la trajectoire calculée : une ligne par lieu de lecture (les points de la route en gras, la tranche
 *  montrée surlignée). */
function table(S, F) {
  const {
    T,
    fmtNum,
    fmtT,
    fmtDev,
    fmtWind,
    phase,
    iceText
  } = F;
  const head = ['thPlace', 'NM', 'thPass', 'thPhase', 'thTraj', 'thPlanned', 'thTemp', 'ISA', 'thWind', 'thComp', 'thCloud', 'thIce',
      'thDa',
      'kInv', 'QNH', 'thGround', 'thLmh'
    ].map(k => TX[k] ? T(k) : k),
    num = new Set([1, 4, 5, 6, 7, 10, 12, 14, 15]);
  const rows = S.route.samples.map((s, i) => {
    const col = S.cols[i],
      ft = S.traj.computed(s.nm),
      x = A.at(col, ft),
      p = A.posAt(S.flight.points, S.traj.nmOf, s.nm),
      ok = x && !x.below,
      comp = ok ? A.windComponents(x.dirDeg, x.kt, p.track) : null,
      ice = ok ? A.icing(x) : 0,
      inv = A.inversions(col).filter(v => v.fromFt <= Math.max(ft, S.levelFt)),
      sf = col.sfc,
      cells = [esc(s.point >= 0 ? S.flight.points[s.point].id : '·'), fmtNum(s.nm), fmtHM(s.t), esc(phase(S.traj.phase(s.nm))), fmtLvl(
          ft),
        fmtLvl(S.traj.planned(s.nm)),
        ok ? fmtT(x.tC) : '—', ok ? fmtDev(x.isaDev).replace('ISA ', '') : '—', ok ? fmtWind(x.dirDeg, x.kt) : '—',
        comp ? `${Math.round(comp.head)} / ${Math.abs(Math.round(comp.cross))}${comp.cross >= 0 ? T('right') : T('left')}` : '—', ok ? `${fmtNum(x.cc)} %` : '—',
        ice ? `<span class="at-flag ice${ice}">${esc(iceText(ice))}</span>` : '—', ok ? fmtLvl(x.daFt) : '—',
        inv.length ? `<span class="at-flag inv">${inv.map(v => `${v.ground ? esc(T('ground')) : fmtLvl(v.fromFt)}–${fmtLvl(v.toFt)}`).join(', ')}</span>` : '—',
        fmtNum(sf.mslp), `${fmtT(sf.tC)}`, `${fmtNum(sf.ccL)} / ${fmtNum(sf.ccM)} / ${fmtNum(sf.ccH)}`
      ];
    return `<tr data-i="${i}" class="${s.point >= 0 ? 'wp' : ''}${S.local?.kind === 'route' && i === S.local.i ? ' sel' : ''}">${cells.map((v, k) => `<td${num.has(k) ? ' class="f-num"' : ''}>${v}</td>`).join('')}</tr>`;
  });
  return `<thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody>`;
}

/** Cartes des terrains : départ à l'heure du départ, arrivée et dégagement à l'heure d'arrivée — le TAF valide à cette
 *  heure, sinon le METAR (station() de Carburant) ; catégorie de vol, convection, message brut. */
function aerodromeCards(S, F) {
  const {
    T,
    fmtNum,
    fmtT,
    fmtWind
  } = F;
  const Wx = S.wx;
  if (!Wx) return '';
  const f = S.flight,
    whenOf = id => id === f.dep ? S.depTime : S.route.samples.at(-1).t;
  return Wx.ids.map(id => {
    const m = Wx.metars.find(x => x.icaoId === id) || null,
      st = station(m, Wx.tafs[id] || null, whenOf(id)),
      role = T(id === f.dep ? 'roleDep' : id === f.arr ? 'roleArr' : 'roleAltn');
    if (!st) return `<div class="at-st"><span class="id">${esc(id)}</span> <span class="f-muted">${esc(T('noMsg', { role }))}</span></div>`;
    const vis = st.vis ? st.vis.sm >= 6 ? '≥ 10 km' : `${fmtNum(st.vis.sm * 1.609, 1)} km` : '—';
    return `<div class="at-st"><div><span class="id">${esc(id)}</span> <span class="f-muted">${esc(role)} · ${esc(st.source)}${st.source === 'TAF' ? ` ${esc(T('at', { t: fmtHM(st.at) }))}` : ''}</span> ` +
      (st.cat ? `<span class="at-cat ${esc(st.cat)}">${esc(st.cat)}</span>` : '') + (st.convective ? ' <span class="at-flag ice2">CB / TCU</span>' : '') + '</div>' +
      `<div>${esc(T('wind'))} ${fmtWind(st.wdir === 'VRB' ? null : st.wdir, st.wspd)}${st.wdir === 'VRB' ? ` VRB ${esc(st.wspd)} kt` : ''}${st.wgst ? ` ${esc(T('gusts', { kt: st.wgst }))}` : ''} · ${esc(T('vis'))} ${vis} · ` +
      `${esc(T('ceiling'))} ${st.ceil == null ? '—' : `${fmtNum(st.ceil)} ft`}${st.temp != null ? ` · ${fmtT(st.temp)}` : ''}${st.qnh ? ` · QNH ${fmtNum(st.qnh)}` : ''}${st.wx ? ` · ${esc(st.wx)}` : ''}</div>` +
      `<div class="at-raw" data-raw="${esc(st.raw)}"></div></div>`;
  }).join('');
}
