// La coupe et les tranches de l'écran Météo (SPEC.md § 2.5) : la coupe de la route au-dessous de la poignée, dessinée à la
// hauteur exacte du corps de la feuille (section.js, la même pour la Carte) ; sa fenêtre sur l'axe des distances (règle
// 20 : le geste de la Carte, modules/maps/lib/axis_window.js) ; la tranche d'un lieu de la route ou d'un point touché sur
// la carte ; la légende de ce qui est dessiné (règle 14). Rien n'est dessiné pendant un glisser de la feuille (règle 19).

import * as A from './atmo.js';
import {
  esc,
  clamp,
  setAttr,
  fmtHM,
  fmtLvl
} from './fmt.js';
import {
  sectionSvg,
  soundingSvg,
  sectionLegend
} from './section.js';
import {
  createAxisWindow
} from '../maps/lib/axis_window.js';

const R = Math.PI / 180;

/** La coupe : app = l'écran (module.js) — ctx, S, $, F, dbody, dragging, alive, show, drawData, bareHead, baseTitle,
 *  sheetTitle, syncWeather, notify, wx, status, cloudRgb, dark, routeVars. */
export function createCut(app) {
  const {
    ctx,
    S,
    $,
    F,
    dbody
  } = app, {
    T,
    fmtNum,
    fmtT,
    fmtDev,
    fmtWind,
    fmtComp,
    phase,
    iceText
  } = F;

  // ---------------------------------------------------------------- fenêtre sur l'axe des distances (règle 20)
  // deux doigts zooment et déplacent, double toucher ou double clic (ou « Vol entier ») la rendent entière, Ctrl + molette
  // zoome ; un doigt reste le toucher qui ouvre une tranche. Gardée pour la vie de la page, jamais enregistrée ; une autre
  // route la remet entière.
  let winRaf = 0,
    tapTimer = 0;
  const axw = createAxisWindow(dbody, {
    total: () => S.traj?.total || 0,
    min: 5,
    plot: () => S.xsGeo ? {
      x0: S.xsGeo.x0,
      x1: S.xsGeo.x0 + S.xsGeo.pw
    } : null,
    enabled: () => S.view === 'profile' && !!S.traj && !app.dragging(),
    onChange: () => {
      winRaf ||= requestAnimationFrame(() => {
        winRaf = 0;
        if (app.alive() && S.view === 'profile' && S.traj) drawProfile();
      });
    }
  });
  /** « Vol entier » dans la ligne de la poignée : devant la coupe seulement, tant que la fenêtre est resserrée. */
  const winSync = () => {
    const on = S.view === 'profile' && !!S.traj && axw.zoomed;
    if ($('whole').hidden === on) $('whole').hidden = !on;
  };

  // ---------------------------------------------------------------- coupe
  /** Coupe le long de la route, à la taille du corps ; un toucher ouvre la tranche du lieu de lecture le plus proche. */
  function drawProfile() {
    app.baseTitle();
    app.bareHead(T('cutAria'));
    // une autre route : la coupe repart entière
    const sig = JSON.stringify([S.flight.points.map(p => [p.lat, p.lon]), Math.round(S.traj.total)]);
    if (sig !== S.winSig) {
      S.winSig = sig;
      axw.reset({
        quiet: true
      });
    }
    const r = sectionSvg({
      field: S.field,
      traj: S.traj,
      samples: S.route.samples,
      cols: S.cols,
      points: S.flight.points,
      sel: S.local?.kind === 'route' ? S.local.i : null
    }, {
      width: dbody.clientWidth,
      height: dbody.clientHeight,
      layers: S.xsLayers,
      fmtLvl,
      cloudRgb: app.cloudRgb(),
      dark: app.dark(),
      window: axw.zoomed ? {
        from: axw.from,
        to: axw.to
      } : null,
      labels: {
        strips: [T('stLow'), T('stMid'), T('stHigh'), T('stPrecip'), T('stVis')]
      }
    });
    S.xsGeo = r.geo;
    setAttr(dbody, 'data-window', r.geo.window ? `${r.geo.window.from.toFixed(2)},${r.geo.window.to.toFixed(2)}` : `0,${S.traj.total.toFixed(2)}`);
    winSync();
    S.drawn = `${dbody.clientWidth}x${dbody.clientHeight}`;
    dbody.innerHTML = r.svg + '<div class="at-tip" data-at="xsTip"></div>';
    const svg = dbody.firstChild;
    svg.onpointermove = xsTip;
    svg.onpointerleave = () => $('xsTip').style.display = 'none';
    svg.onclick = ev => {
      const nm = S.xsGeo.nmOf(ev.clientX - svg.getBoundingClientRect().left),
        open = () => {
          let k = 0;
          S.route.samples.forEach((s, j) => Math.abs(s.nm - nm) < Math.abs(S.route.samples[k].nm - nm) && (k = j));
          openRouteSlice(k);
        };
      // fenêtre resserrée : un double toucher la rend entière, le premier toucher attend donc un instant (un second l'annule)
      if (tapTimer) {
        clearTimeout(tapTimer);
        tapTimer = 0;
        return;
      }
      if (!axw.zoomed) return open();
      tapTimer = setTimeout(() => {
        tapTimer = 0;
        if (S.view === 'profile') open();
      }, 320);
    };
    showLegend();
  }
  /** Infobulle de la coupe (souris seulement) : l'atmosphère au point survolé et la trajectoire à cette distance. */
  function xsTip(ev) {
    const g = S.xsGeo,
      tip = $('xsTip'),
      svg = dbody.firstChild;
    if (!g || !tip || ev.pointerType === 'touch') return;
    const rect = svg.getBoundingClientRect(),
      x = ev.clientX - rect.left,
      y = ev.clientY - rect.top;
    if (x < g.x0 || x > g.x0 + g.pw || y < g.y0 || y > g.y0 + g.ph) return tip.style.display = 'none';
    const nm = g.nmOf(x),
      ft = g.ftOf(y),
      v = S.model.sampleAt(nm, ft),
      p = A.posAt(S.flight.points, S.traj.nmOf, nm),
      tr = S.traj.computed(nm);
    let html = `<b>${fmtNum(nm)} NM · ${fmtLvl(ft)}</b> <span class="m">· ${esc(T('tipTraj', { l: fmtLvl(tr), p: phase(S.traj.phase(nm)) }))}</span><br>`;
    if (!v || v.below) html += `<span class="m">${esc(T('tipBelow', { l: fmtLvl(v?.ground) }))}</span>`;
    else {
      const comp = A.windComponents(v.dirDeg, v.kt, p.track),
        ice = A.icing(v);
      html += `${fmtT(v.tC)} <span class="m">(${fmtDev(v.isaDev)})</span> · ${esc(T('dew'))} ${fmtT(v.tdC)} · ${esc(T('rhShort'))} ${fmtNum(v.rh)} %<br>` +
        `${esc(T('clouds'))} ${fmtNum(v.cc)} % · ${esc(T('wind'))} ${fmtWind(v.dirDeg, v.kt)} <span class="m">${esc(fmtComp(comp))}</span><br>` +
        `ρ ${fmtNum(v.rho, 3)} kg/m³ · ${esc(T('da'))} ${fmtLvl(v.daFt)}` + (ice ? `<br><b style="color:var(--at-ice)">${esc(T('icing'))} ${esc(iceText(ice))}</b>` : '');
    }
    tip.innerHTML = html;
    tip.style.display = 'block';
    const tw = tip.offsetWidth;
    tip.style.left = `${x + 14 + tw > rect.width ? x - tw - 14 : x + 14}px`;
    tip.style.top = `${clamp(y - 20, 0, rect.height - tip.offsetHeight)}px`;
  }

  // ---------------------------------------------------------------- tranches
  /** Tranche d'un lieu de lecture de la route (coupe touchée, ◀ ▶, ligne du tableau des détails). */
  function openRouteSlice(i) {
    S.sel = clamp(i, 0, S.route.samples.length - 1);
    const s = S.route.samples[S.sel];
    S.local = {
      kind: 'route',
      i: S.sel,
      lat: s.lat,
      lon: s.lon
    };
    app.syncWeather();
    app.show('slice');
  }
  /** Tranche d'un point touché sur la carte, dans la grille du vol : la colonne de sa case (l'appareil, sinon la couche
   *  météo : un lieu), à l'heure où le vol passe au plus près ; les niveaux du vol à cette distance. */
  let pointSeq = 0;
  async function openPointSlice(lat, lon) {
    if (!S.traj) return;
    let best = S.along[0],
      bd = Infinity;
    const kx = Math.cos(lat * R);
    for (const a of S.along) {
      const d = (a.lat - lat) ** 2 + ((a.lon - A.nearLon(lon, a.lon)) * kx) ** 2;
      if (d < bd) {
        bd = d;
        best = a;
      }
    }
    const t = S.depTime + S.traj.minutesAt(best.nm) * 60,
      seq = ++pointSeq,
      stale = () => !app.alive() || seq !== pointSeq || S.local?.kind !== 'point';
    S.local = {
      kind: 'point',
      lat,
      lon,
      nm: best.nm,
      t,
      offNm: Math.sqrt(bd) * 60,
      col: null
    };
    app.syncWeather();
    app.show('slice');
    try {
      const r = await app.wx.forecast([{
        lat,
        lon
      }], app.routeVars(), {
        model: S.mdl.id,
        until: t,
        stale
      });
      if (stale()) return;
      const loc = r.locs[0];
      S.local.col = A.column(loc, A.hourIndex(loc.times, t));
      if (r.weight) app.status();
      if (S.view === 'slice') app.drawData();
    } catch (e) {
      if (!e?.stale) app.notify(app.wx.why(e), true);
    }
  }
  /** La tranche montrée : le sondage (température, point de rosée, atmosphère type, nuages, vents, niveaux du vol) et sa
   *  lecture à côté sur un corps large. */
  function drawSlice() {
    const L = S.local;
    if (!L) return app.show('profile');
    let col, nm, t, head;
    if (L.kind === 'route') {
      const s = S.route.samples[L.i],
        leg = A.posAt(S.flight.points, S.traj.nmOf, s.nm).leg;
      col = S.cols[L.i];
      nm = s.nm;
      t = s.t;
      head = T('sliceHeadShort', {
        i: L.i + 1,
        n: S.route.samples.length,
        near: s.point >= 0 ? S.flight.points[s.point].id : T('between', {
          a: S.flight.points[leg].id,
          b: S.flight.points[leg + 1].id
        }),
        nm: fmtNum(s.nm),
        at: fmtHM(t)
      });
    } else {
      col = L.col;
      nm = L.nm;
      t = L.t;
      head = T('sliceHeadPoint', {
        p: `${L.lat.toFixed(2)}° ${A.wrapLon(L.lon).toFixed(2)}°`,
        off: fmtNum(L.offNm),
        nm: fmtNum(nm),
        at: fmtHM(t)
      });
    }
    app.sheetTitle(head);
    if (!col) {
      const p = document.createElement('p');
      p.className = 'at-pad f-muted';
      p.textContent = T('sliceLoading');
      dbody.replaceChildren(p);
      return;
    }
    app.bareHead(head);
    const wrap = document.createElement('div');
    wrap.className = 'at-sd';
    wrap.innerHTML = '<div class="at-plotbox"></div><div class="at-slice-info"></div>';
    dbody.replaceChildren(wrap);
    const box = wrap.firstChild,
      r = soundingSvg(col, {
        width: box.clientWidth,
        height: box.clientHeight,
        top: S.field.top,
        fmtLvl,
        cloudRgb: app.cloudRgb(),
        lines: [{
          ft: S.traj.requested(nm),
          color: 'var(--at-requested)',
          dash: '2 4'
        }, {
          ft: S.traj.planned(nm),
          color: 'var(--at-planned)',
          dash: '7 4'
        }, {
          ft: S.traj.computed(nm),
          color: 'var(--at-computed)'
        }]
      });
    S.sdGeo = r.geo;
    S.drawn = `${dbody.clientWidth}x${dbody.clientHeight}`;
    box.innerHTML = r.svg + '<div class="at-tip" data-at="sdTip"></div>';
    box.firstChild.onpointermove = ev => sdTip(ev, col, box);
    box.firstChild.onpointerleave = () => $('sdTip').style.display = 'none';
    showLegend();
    wrap.lastChild.replaceChildren(...sliceRows(col, nm).map(([k, v]) => {
      const d = document.createElement('div');
      d.innerHTML = '<span class="m"></span> ';
      d.firstChild.textContent = ctx.t(['{k} :', '{k}:', '{k}:', '{k}:'], {
        k
      });
      d.append(v);
      return d;
    }));
  }
  /** Lecture d'une tranche : sol, nuages, inversions, 0 °C, base des cumulus, conditions sur la trajectoire. */
  function sliceRows(col, nm) {
    const ft = S.traj.computed(nm),
      x = A.at(col, ft),
      p = A.posAt(S.flight.points, S.traj.nmOf, nm),
      comp = x && !x.below ? A.windComponents(x.dirDeg, x.kt, p.track) : null,
      inv = A.inversions(col),
      zeros = A.zeroIsotherms(col),
      cu = A.cumulusBaseFt(col),
      sf = col.sfc;
    return [
      [T('rGround'), `${fmtNum(Math.round(col.elevFt / 10) * 10)} ft · QNH ${fmtNum(sf.mslp)} · ${fmtT(sf.tC)} / ${fmtT(sf.tdC)} · ${fmtWind(sf.dir, sf.kt)}`],
      [T('rCloud'), T('rCloudV', {
          l: fmtNum(sf.ccL),
          m: fmtNum(sf.ccM),
          h: fmtNum(sf.ccH)
        }) + (sf.visM != null ? ` · ${T('vis')} ${fmtNum(sf.visM / 1000, 1)} km` : '') +
        (sf.precip ? ` · ${T('precip')} ${fmtNum(sf.precip, 1)} mm/h` : '')
      ],
      [T('kInv'), inv.length ? inv.map(v => `${v.ground ? `${T('ground')} → ` : `${fmtLvl(v.fromFt)} → `}${fmtLvl(v.toFt)} (+${fmtNum(v.dT, 1)} °C)`).join(' · ') : T('none')],
      ['0 °C', zeros.length ? zeros.map(fmtLvl).join(' · ') : '—'],
      [T('rCu'), cu == null ? '—' : `${fmtLvl(cu)} (${T('estimated')})` + (sf.cape != null ? ` · CAPE ${fmtNum(sf.cape)} J/kg` : '')],
      [T('rTraj', {
          l: fmtLvl(ft),
          p: phase(S.traj.phase(nm))
        }), !x || x.below ? '—' : `${fmtT(x.tC)} (${fmtDev(x.isaDev)}) · ${fmtWind(x.dirDeg, x.kt)} ${fmtComp(comp)} · ` +
        `${T('clouds')} ${fmtNum(x.cc)} % · ${T('da')} ${fmtLvl(x.daFt)}` + (A.icing(x) ? ` · ${T('icing')} ${iceText(A.icing(x))}` : '')
      ]
    ];
  }
  /** Infobulle de la tranche (souris seulement) : l'atmosphère à l'altitude survolée. */
  function sdTip(ev, col, box) {
    const g = S.sdGeo,
      tip = $('sdTip');
    if (!g || !tip || ev.pointerType === 'touch') return;
    const rect = box.firstChild.getBoundingClientRect(),
      x = ev.clientX - rect.left,
      y = ev.clientY - rect.top;
    if (x < g.l || x > g.l + g.pw + 60 || y < g.t || y > g.t + g.ph) return tip.style.display = 'none';
    const ft = g.ftOf(y),
      v = A.at(col, ft);
    if (!v || v.below) return tip.style.display = 'none';
    tip.innerHTML = `<b>${fmtLvl(ft)}</b> <span class="m">${fmtNum(v.hPa)} hPa</span><br>${fmtT(v.tC)} (${fmtDev(v.isaDev)}) · ${esc(T('dew'))} ${fmtT(v.tdC)}<br>` +
      `${esc(T('rhShort'))} ${fmtNum(v.rh)} % · ${esc(T('clouds'))} ${fmtNum(v.cc)} % · ${esc(T('wind'))} ${fmtWind(v.dirDeg, v.kt)}`;
    tip.style.display = 'block';
    tip.style.left = `${Math.min(x + 12, rect.width - tip.offsetWidth)}px`;
    tip.style.top = `${clamp(y - 16, 0, rect.height - tip.offsetHeight)}px`;
  }

  // ---------------------------------------------------------------- légende (règle 14)
  /** Légende en superposition : les séries réellement dessinées (sectionLegend, la même pour la Carte) ; ouverte et fermée
   *  par la puce « i », fermée aussi par un toucher sur elle ou Échap ; reposée après chaque dessin (le corps est réécrit). */
  function showLegend() {
    const open = !!S.legend && (S.view === 'profile' || S.view === 'slice') && !!dbody.querySelector('svg');
    setAttr($('legendBtn'), 'aria-pressed', String(open));
    let box = dbody.querySelector('.at-legend');
    if (!open) return box?.remove();
    const rows = sectionLegend({
      kind: S.view === 'slice' ? 'slice' : 'cut',
      layers: S.xsLayers,
      strips: S.view === 'profile' && dbody.clientHeight >= 260,
      cloudRgb: app.cloudRgb(),
      t: row => ctx.t(row)
    });
    if (!box) {
      box = document.createElement('div');
      box.className = 'at-legend';
      box.setAttribute('role', 'note');
      box.onclick = () => {
        S.legend = false;
        showLegend();
      };
      dbody.append(box);
    }
    const html = rows.map(r => `<div>${r.swatch}<span>${esc(r.label)}</span></div>`).join('');
    if (box.innerHTML !== html) box.innerHTML = html;
    setAttr(box, 'aria-label', T('legend'));
  }

  return {
    drawProfile,
    drawSlice,
    openRouteSlice,
    openPointSlice,
    showLegend,
    winSync,
    /** La fenêtre de la coupe est resserrée (ancre d'aide « atmosphere-zoom »). */
    zoomed: () => axw.zoomed,
    /** « Vol entier » : la coupe entière. */
    whole: () => axw.reset(),
    /** Démontage : le geste, l'attente d'un toucher, l'image demandée. */
    stop() {
      axw.stop();
      clearTimeout(tapTimer);
      cancelAnimationFrame(winRaf);
    }
  };
}
