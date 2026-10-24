// Module V3 « Atmosphère » (SPEC.md, INTEGRATION.md, DECISIONS.md) : l'atmosphère le long du vol courant — coupe
// verticale (nuages, isothermes, inversions, givrage indicatif, altitude-densité, vent, relief) avec les trajectoires
// demandée, planifiée et calculée ; carte aux mêmes altitudes (isobares, isothermes, nuages, vent) ; tranche verticale
// (sondage) ; table le long de la trajectoire ; METAR / TAF des terrains. Chaque lieu de la route est lu à l'heure où le
// vol y passe (départ + temps estimé sans vent). Né maquette (labs/atmosphere, 24 oct 2026).
//   · vol : pilot/<trigramme>/current_flight.json par ctx.data (schéma 1, modules/fuel/INTEGRATION.md § 3, lecture
//     seule), l'exemple du schéma, un fichier, ou un texte de route (noms résolus par ctx.aerodb.coords) ;
//   · prévisions : la réserve météo partagée (weather_store.js, cache/weather/<modèle>/<case>/<jour>.json), qui
//     n'appelle Open-Meteo par ctx.net que pour ce qui manque et compte les appels ; à l'ouverture, rien n'est demandé
//     (seulement ce que l'appareil garde) : « Charger » lit ce qui manque ;
//   · METAR (metar.vatsim.net) et TAF (avwx.rest, clé de l'appareil ajoutée par le cadre) par ctx.net ;
//   · MapLibre du module Carte (modules/maps/lib/), chargé au premier dessin de la carte ;
//   · textes en quatre langues (texts.js) ; couleurs par les jetons --sog-* (design, jour et nuit).

import * as A from './atmo.js';
import * as Demo from './demo.js';
import {
  weatherStore,
  callWeight
} from './weather_store.js';
import {
  TX
} from './texts.js';
import {
  tokenize,
  formatLevel
} from '../../frame/lib/route_text.js';
import {
  decodeMetars,
  fromAvwxTaf
} from '../../frame/lib/metar.js';
import {
  station
} from '../fuel/weather.js';

export const meta = {
  id: 'atmosphere',
  apps: ['pilot'],
  // niveau « complet » : hors du menu par défaut, joignable par #atmosphere à tout niveau (DECISIONS.md, 24 oct 2026)
  level: 3,
  help: false,
  reads: ['pilot/', 'cache/weather/', 'cache/atmosphere/'],
  // réserve météo partagée (politique « cache », jamais synchronisée) ; réglages de l'écran et TAF gardés sur l'appareil
  writes: [{
    prefix: 'cache/weather/',
    policy: 'cache'
  }, {
    prefix: 'cache/atmosphere/',
    policy: 'cache'
  }],
  files: ['atmo.js?v=0', 'demo.js?v=0', 'weather_store.js?v=0', 'texts.js?v=0', '../fuel/winds.js?v=0', '../fuel/weather.js?v=0',
    '../../frame/lib/route_text.js?v=0', '../../frame/lib/metar.js?v=0'
  ],
  // MapLibre du module Carte : gardé au premier usage seulement
  lazy: ['../maps/lib/maplibre-gl.js?v=0', '../maps/lib/maplibre-gl.css?v=0'],
  // tuiles appelées par MapLibre lui-même (jamais par ctx.net) ; CSP connect-src du cadre
  net: ['tiles.openfreemap.org']
};

/** Vol d'exemple : celui du schéma du vol courant (modules/fuel/INTEGRATION.md § 3). */
const EXAMPLE = {
  route: {
    text: 'LFRS LUGEN/F290 LFML',
    dep: 'LFRS',
    arr: 'LFML',
    altn: 'LFMN',
    points: [{
      id: 'LFRS',
      lat: 47.1569,
      lon: -1.6078
    }, {
      id: 'LUGEN',
      lat: 46.5833,
      lon: -1.2,
      alt_ft: 29000
    }, {
      id: 'LFML',
      lat: 43.4367,
      lon: 5.215
    }]
  },
  level: {
    ft: 27000
  },
  profile: {
    climbFpm: 1230,
    climbKt: 196,
    descentFpm: 1500,
    descentKt: 253,
    tocNm: 48.2,
    todNm: 56.1
  },
  aircraft: {
    type: 'C30J',
    registration: 'F-RAJA'
  },
  by: 'exemple'
};
const ROUTE_TEXT = 'LFRS 47.1569 -1.6078\nLUGEN 46.5833 -1.2000/F290\nMEN 44.6050 3.1600\nLFML 43.4367 5.2150';
const UI = 'cache/atmosphere/ui.json';
/** Altitudes fixes proposées pour la carte (ft), en plus du niveau demandé et des paliers. */
const MAP_FIXED = [5000, 10000, 18000, 24000, 30000];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a == null || b == null ? (a ?? b) : a + (b - a) * k;
const R = Math.PI / 180;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

/** Couleurs des données (indépendantes du design) : divergente bleu ↔ rouge, gris au milieu. */
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const BLUE = ['#0d366b', '#256abf', '#6da7ec', '#b7d3f6'],
  RED = ['#f6c9c0', '#ec8a85', '#e34948', '#9e2a2a'];
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/** Motif hachuré (angle 45 ou 135°). */
function hatch(ctx, color, angle = 45, gap = 7, width = 1.4) {
  const c = document.createElement('canvas');
  c.width = c.height = gap;
  const g = c.getContext('2d');
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  if (angle === 45) {
    g.moveTo(0, gap);
    g.lineTo(gap, 0);
    g.moveTo(-1, 1);
    g.lineTo(1, -1);
    g.moveTo(gap - 1, gap + 1);
    g.lineTo(gap + 1, gap - 1);
  } else {
    g.moveTo(0, 0);
    g.lineTo(gap, gap);
    g.moveTo(gap - 1, -1);
    g.lineTo(gap + 1, 1);
    g.moveTo(-1, gap - 1);
    g.lineTo(1, gap + 1);
  }
  g.stroke();
  return ctx.createPattern(c, 'repeat');
}

/** Barbule de vent (hémisphère nord) : hampe vers le lit du vent, plumes à droite ; fanion 50 kt, plume 10, demi 5. */
function barb(ctx, x, y, dir, kt, len = 22, color = '#333') {
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = color;
  ctx.lineWidth = 1.3;
  if (kt == null || dir == null) return ctx.restore();
  if (kt < 2.5) {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.stroke();
    return ctx.restore();
  }
  const a = dir * R,
    ux = Math.sin(a),
    uy = -Math.cos(a),
    px = Math.sin(a + Math.PI / 2),
    py = -Math.cos(a + Math.PI / 2),
    ex = x + ux * len,
    ey = y + uy * len;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  let n = Math.round(kt / 5) * 5,
    pos = 0;
  const step = 4,
    fl = len * 0.45;
  while (n >= 50) {
    const bx = ex - ux * pos,
      by = ey - uy * pos;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + px * fl - ux * 2, by + py * fl - uy * 2);
    ctx.lineTo(bx - ux * step * 1.4, by - uy * step * 1.4);
    ctx.fill();
    pos += step * 1.8;
    n -= 50;
  }
  while (n >= 10) {
    const bx = ex - ux * pos,
      by = ey - uy * pos;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + px * fl + ux * 3, by + py * fl + uy * 3);
    ctx.stroke();
    pos += step;
    n -= 10;
  }
  if (n >= 5) {
    if (pos === 0) pos = step;
    const bx = ex - ux * pos,
      by = ey - uy * pos;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + px * fl * 0.5 + ux * 1.5, by + py * fl * 0.5 + uy * 1.5);
    ctx.stroke();
  }
  ctx.restore();
}

/** MapLibre (script UMD et sa feuille, ceux du module Carte), chargé une fois ; null s'il ne charge pas. */
let mlP = null;

function loadMapLibre() {
  return mlP ||= new Promise(ok => {
    if (window.maplibregl) return ok(window.maplibregl);
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = new URL('../maps/lib/maplibre-gl.css?v=0', import.meta.url).href;
    document.head.append(css);
    const sc = document.createElement('script');
    sc.src = new URL('../maps/lib/maplibre-gl.js?v=0', import.meta.url).href;
    sc.onload = () => ok(window.maplibregl || null);
    sc.onerror = () => {
      mlP = null;
      ok(null);
    };
    document.head.append(sc);
  });
}

// styles du module : jetons du cadre (--sog-*), classes préfixées « at- » sous [data-module="atmosphere"]
const STYLE = `
[data-module="atmosphere"]{--at-computed:var(--sog-chart-1);--at-planned:var(--sog-chart-4);--at-requested:var(--sog-chart-3);--at-inv:var(--sog-chart-2);--at-ice:var(--sog-chart-5);--at-terrain:color-mix(in srgb,var(--sog-chart-6) 55%,var(--sog-chart-bg))}
[data-module="atmosphere"] .at-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 12px}
[data-module="atmosphere"] .at-head h1{margin:0}
[data-module="atmosphere"] .at-spacer{flex:1}
[data-module="atmosphere"] .at-main{display:grid;gap:var(--sog-gap,12px)}
[data-module="atmosphere"] .at-card-head{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin-bottom:8px}
[data-module="atmosphere"] .at-card-head h2{margin:0}
[data-module="atmosphere"] .at-sub{color:var(--sog-muted);font-size:var(--sog-size-s,13px)}
[data-module="atmosphere"] .at-status{color:var(--sog-muted);font-size:var(--sog-size-s,13px);margin-top:8px}
[data-module="atmosphere"] .at-form{align-items:end}
[data-module="atmosphere"] .at-form textarea{font:13px/1.4 ui-monospace,monospace;min-height:88px}
[data-module="atmosphere"] .at-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
[data-module="atmosphere"] .at-kpi{background:var(--sog-surface);border:1px solid var(--sog-border);border-radius:var(--sog-radius);padding:9px 12px}
[data-module="atmosphere"] .at-kpi .k{font-size:12px;color:var(--sog-muted)}
[data-module="atmosphere"] .at-kpi .v{font-size:20px;font-weight:600;font-variant-numeric:tabular-nums}
[data-module="atmosphere"] .at-kpi .n{font-size:12px;color:var(--sog-muted)}
[data-module="atmosphere"] .at-chips{display:flex;flex-wrap:wrap;gap:6px}
[data-module="atmosphere"] .at-chips button{border-radius:99px;padding:0 14px}
[data-module="atmosphere"] .at-chips button[aria-pressed="true"]{border-color:var(--sog-accent);box-shadow:inset 0 0 0 1px var(--sog-accent)}
[data-module="atmosphere"] .at-sw{width:18px;height:0;border-top:2px solid currentColor;display:inline-block;vertical-align:middle}
[data-module="atmosphere"] .at-legend{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:12px;color:var(--sog-muted);margin-top:6px;align-items:center}
[data-module="atmosphere"] .at-ramp{width:120px;height:9px;border-radius:2px;display:inline-block;vertical-align:middle}
[data-module="atmosphere"] .at-plot{position:relative}
[data-module="atmosphere"] .at-plot canvas{display:block;width:100%;touch-action:pan-y}
[data-module="atmosphere"] .at-tip{position:absolute;pointer-events:none;background:var(--sog-chart-bg);color:var(--sog-fg);border:1px solid var(--sog-border);border-radius:var(--sog-radius-s,6px);padding:7px 9px;font-size:12px;line-height:1.4;box-shadow:var(--sog-shadow);white-space:nowrap;z-index:5;display:none;font-variant-numeric:tabular-nums}
[data-module="atmosphere"] .at-tip .m{color:var(--sog-muted)}
[data-module="atmosphere"] .at-row2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:var(--sog-gap,12px)}
[data-module="atmosphere"] .at-map{height:520px;border-radius:var(--sog-radius);overflow:hidden;position:relative;background:var(--sog-chart-grid)}
[data-module="atmosphere"] .at-map canvas.at-over{position:absolute;inset:0;pointer-events:none;z-index:2}
[data-module="atmosphere"] .f-table tr.wp td{font-weight:600}
[data-module="atmosphere"] .f-table tr.sel td{background:color-mix(in srgb,var(--sog-accent) 14%,transparent)}
[data-module="atmosphere"] .f-table tbody tr{cursor:pointer}
[data-module="atmosphere"] .at-scroll{max-height:460px}
[data-module="atmosphere"] .at-flag{display:inline-block;font-size:11px;padding:0 6px;border-radius:4px;border:1px solid var(--sog-border)}
[data-module="atmosphere"] .at-flag.ice2{border-color:var(--at-ice);color:var(--at-ice)}
[data-module="atmosphere"] .at-flag.ice1{border-color:var(--sog-warn)}
[data-module="atmosphere"] .at-flag.inv{border-color:var(--at-inv);color:var(--at-inv)}
[data-module="atmosphere"] .at-wx{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:10px}
[data-module="atmosphere"] .at-st{border:1px solid var(--sog-border);border-radius:var(--sog-radius-s,6px);padding:8px 10px}
[data-module="atmosphere"] .at-st .id{font-weight:600}
[data-module="atmosphere"] .at-cat{font-size:11px;font-weight:600;padding:1px 6px;border-radius:4px;color:#fff}
[data-module="atmosphere"] .at-cat.VFR{background:#0ca30c}
[data-module="atmosphere"] .at-cat.MVFR{background:#2a78d6}
[data-module="atmosphere"] .at-cat.IFR{background:#d03b3b}
[data-module="atmosphere"] .at-cat.LIFR{background:#a0329a}
[data-module="atmosphere"] .at-raw{font:12px/1.4 ui-monospace,monospace;color:var(--sog-muted);white-space:pre-wrap;margin-top:4px}
[data-module="atmosphere"] .at-slice-info{font-size:13px;display:grid;gap:3px;margin-top:6px}
[data-module="atmosphere"] .at-slice-info .m{color:var(--sog-muted)}
[data-module="atmosphere"] .at-foot{font-size:12px;color:var(--sog-muted)}
[data-module="atmosphere"] .at-hidden{display:none!important}
@media (max-width:600px){[data-module="atmosphere"] .at-map{height:380px}}
`;

let stop = null;

export async function mount(el, ctx) {
  const {
    data,
    net
  } = ctx;
  const T = (key, v) => ctx.t(TX[key], v);
  const $ = k => el.querySelector(`[data-at="${k}"]`);
  const W = weatherStore({
    data,
    net
  });
  const tri = ctx.identity?.trigram || 'ANON',
    flightPath = `pilot/${tri}/current_flight.json`;
  let alive = true;

  const S = {
    flight: null,
    data: 'live',
    depTime: 0,
    levelFt: 0,
    cruiseKt: 200,
    route: null,
    grid: null,
    wx: null,
    traj: null,
    cols: [],
    field: null,
    sel: 0,
    run: null,
    model: null,
    map: null,
    daySpent: 0,
    xsLayers: {
      cloud: true,
      temp: false,
      rh: false,
      iso: true,
      inv: true,
      ice: true,
      da: false,
      wind: true,
      cu: true
    },
    mapLayers: {
      isobar: true,
      isotherm: true,
      tfill: false,
      cloud: true,
      wind: true
    },
    mapLevel: 'sfc'
  };

  // ---------------------------------------------------------------- outils
  const lang = () => ctx.lang?.() || 'fr';
  const notify = (msg, err = false) => ctx.notify(msg, err ? 'err' : 'warn');
  /** Couleur résolue d'un jeton (rgb) : sonde dans le bloc du module, donc au design et au ton affichés. */
  const probe = document.createElement('i');
  const colors = new Map();
  const tok = name => {
    if (colors.has(name)) return colors.get(name);
    probe.style.color = `var(${name})`;
    const c = getComputedStyle(probe).color;
    colors.set(name, c);
    return c;
  };
  const triplet = c => (c.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
  /** Nuit : fond des graphiques sombre. */
  const dark = () => {
    const [r, g, b] = triplet(tok('--sog-chart-bg'));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
  };
  const cloudRgb = () => {
    const [r, g, b] = triplet(tok('--sog-muted'));
    return `${r},${g},${b}`;
  };
  const fmtLvl = ft => ft == null ? '—' : formatLevel(Math.max(0, Math.round(ft / 100) * 100));
  const fmtT = t => t == null ? '—' : `${t < 0 ? '−' : ''}${Math.abs(Math.round(t))} °C`;
  const fmtDev = d => d == null ? '—' : `ISA ${d >= 0 ? '+' : '−'}${Math.abs(Math.round(d))}`;
  const fmtWind = (d, kt) => d == null || kt == null ? '—' : kt < 1 ? T('calm') :
    `${String(Math.round(d / 10) * 10 || 360).padStart(3, '0')}/${Math.round(kt)} kt`;
  const fmtHM = s => {
    const d = new Date(s * 1000);
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}Z`;
  };
  const fmtNum = (x, d = 0) => x == null || !Number.isFinite(x) ? '—' : x.toLocaleString(lang(), {
    maximumFractionDigits: d,
    minimumFractionDigits: d
  });
  const fmtComp = c => c == null ? '—' : T(c.head >= 0 ? 'compHead' : 'compTail', {
    h: Math.abs(Math.round(c.head)),
    x: `${Math.abs(Math.round(c.cross))}${c.cross >= 0 ? T('right') : T('left')}`
  });
  const phase = p => T({
    climb: 'phClimb',
    cruise: 'phCruise',
    descent: 'phDescent'
  } [p] || 'phCruise');
  const iceText = n => n ? T(n === 2 ? 'iceProbable' : 'icePossible') : '—';

  function diverging(x, span) {
    const mid = dark() ? '#383835' : '#f0efec',
      stops = [...BLUE.map((c, i) => [-span + i * span / 4, c]), [0, mid], ...RED.map((c, i) => [(i + 1) * span / 4, c])];
    x = clamp(x, -span, span);
    for (let i = 1; i < stops.length; i++)
      if (x <= stops[i][0]) {
        const k = (x - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]),
          a = hex(stops[i - 1][1]),
          b = hex(stops[i][1]);
        return a.map((v, j) => Math.round(v + (b[j] - v) * k));
      }
    return hex(stops.at(-1)[1]);
  }

  /** Canevas à la taille de son bloc (pixels de l'écran). */
  function sized(canvas, cssH) {
    const dpr = window.devicePixelRatio || 1,
      Wd = canvas.parentElement.clientWidth,
      H = cssH;
    if (canvas.width !== Math.round(Wd * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(Wd * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.height = `${H}px`;
    }
    const c = canvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, Wd, H);
    return {
      ctx: c,
      W: Wd,
      H
    };
  }

  /** Texte avec un liseré de la couleur du fond. */
  function halo(c, text, x, y, color, align = 'center', base = 'middle') {
    c.save();
    c.textAlign = align;
    c.textBaseline = base;
    c.lineWidth = 3;
    c.strokeStyle = tok('--sog-chart-bg');
    c.strokeText(text, x, y);
    c.fillStyle = color;
    c.fillText(text, x, y);
    c.restore();
  }

  // ---------------------------------------------------------------- page
  el.innerHTML = `<style>${STYLE}</style>
  <div class="at-main">
  <div class="at-head"><h1>${esc(T('title'))}</h1><span class="f-badge" data-kind="accent">${esc(T('mockup'))}</span>
    <span class="f-badge at-hidden" data-kind="warn" data-at="demoTag">${esc(T('demoTag'))}</span><span class="at-spacer"></span>
    <span class="at-sub" data-at="source"></span></div>
  <section class="f-card">
    <form class="f-grid at-form" data-at="form" style="--f-min:170px">
      <label class="f-field">${esc(T('flight'))}<select data-at="flightSrc">
        <option value="current">${esc(T('srcCurrent', { tri }))}</option>
        <option value="example">${esc(T('srcExample'))}</option>
        <option value="file">${esc(T('srcFile'))}</option>
        <option value="text">${esc(T('srcText'))}</option></select></label>
      <label class="f-field at-hidden" data-at="fileBox">${esc(T('file'))}<input type="file" data-at="file" accept=".json,application/json"></label>
      <label class="f-field f-full at-hidden" data-at="textBox">${esc(T('routeHint'))}<textarea data-at="routeText" spellcheck="false" rows="4"></textarea></label>
      <label class="f-field">${esc(T('depUtc'))}<input type="datetime-local" data-at="dep"></label>
      <label class="f-field">${esc(T('levelReq'))}<select data-at="levelSel"></select></label>
      <label class="f-field">${esc(T('cruiseKt'))}<input type="number" data-at="cruiseKt" min="60" max="600" step="5"></label>
      <label class="f-field">${esc(T('dataSrc'))}<select data-at="dataSrc">
        <option value="live">${esc(T('dataLive'))}</option><option value="demo">${esc(T('dataDemo'))}</option></select></label>
      <label class="f-field">${esc(T('gridSize'))}<select data-at="gridMax">
        <option value="35">${esc(T('grid35'))}</option><option value="48" selected>${esc(T('grid48'))}</option>
        <option value="96">${esc(T('grid96'))}</option></select></label>
      <button class="primary" type="submit">${esc(T('load'))}</button>
    </form>
    <div class="at-status" data-at="status" role="status"></div>
  </section>
  <section class="at-kpis" data-at="kpis" aria-label="${esc(T('summary'))}"></section>
  <section class="f-card">
    <div class="at-card-head"><h2>${esc(T('xsTitle'))}</h2><span class="at-sub" data-at="xsSub"></span><span class="at-spacer"></span>
      <div class="at-chips" data-at="xsLayers"></div></div>
    <div class="at-plot"><canvas data-at="xs" height="460" aria-label="${esc(T('xsAria'))}"></canvas><div class="at-tip" data-at="xsTip"></div></div>
    <div class="at-legend" data-at="xsLegend"></div>
  </section>
  <div class="at-row2">
    <section class="f-card">
      <div class="at-card-head"><h2>${esc(T('mapTitle'))}</h2><select data-at="mapLevel" aria-label="${esc(T('mapLevelAria'))}"></select>
        <span class="at-sub" data-at="mapSub"></span><span class="at-spacer"></span><div class="at-chips" data-at="mapLayers"></div></div>
      <div class="at-map" data-at="map"><canvas class="at-over" data-at="mapCanvas"></canvas><div class="at-tip" data-at="mapTip"></div></div>
      <div class="at-legend" data-at="mapLegend"></div>
    </section>
    <section class="f-card">
      <div class="at-card-head"><h2>${esc(T('sliceTitle'))}</h2><span class="at-spacer"></span>
        <button type="button" data-at="slicePrev" aria-label="${esc(T('slicePrev'))}">◀</button>
        <button type="button" data-at="sliceNext" aria-label="${esc(T('sliceNext'))}">▶</button></div>
      <div class="at-chips" data-at="sliceWps"></div>
      <div class="at-sub" data-at="sliceHead" style="margin:6px 0"></div>
      <div class="at-plot"><canvas data-at="sd" height="440" aria-label="${esc(T('sdAria'))}"></canvas><div class="at-tip" data-at="sdTip"></div></div>
      <div class="at-legend"><span><span class="at-sw" style="color:#e34948"></span> ${esc(T('lgTemp'))}</span>
        <span><span class="at-sw" style="color:#008300"></span> ${esc(T('lgDew'))}</span>
        <span><span class="at-sw" style="color:var(--sog-muted);border-top-style:dashed"></span> ${esc(T('lgIsa'))}</span>
        <span>${esc(T('lgSdCloud'))}</span></div>
      <div class="at-slice-info" data-at="sliceInfo"></div>
    </section>
  </div>
  <section class="f-card">
    <div class="at-card-head"><h2>${esc(T('tblTitle'))}</h2><span class="at-sub">${esc(T('tblSub'))}</span></div>
    <div class="f-scroll at-scroll"><table class="f-table" data-at="tbl"></table></div>
  </section>
  <section class="f-card">
    <div class="at-card-head"><h2>${esc(T('wxTitle'))}</h2><span class="at-sub" data-at="wxSub"></span></div>
    <div class="at-wx" data-at="wx"></div>
  </section>
  <p class="at-foot">${esc(T('foot'))}</p>
  </div>`;
  probe.style.display = 'none';
  el.append(probe);

  // ---------------------------------------------------------------- vol

  /** Enregistrement du vol courant (ou de la même forme) → vol de l'écran. */
  function fromRecord(rec, from) {
    const pts = (rec?.route?.points || []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon)).map(p => ({
      id: String(p.id || p.name || ''),
      lat: +p.lat,
      lon: +p.lon,
      alt_ft: +p.alt_ft || 0
    }));
    if (pts.length < 2) throw new Error(T('errTwoPoints'));
    return {
      points: pts,
      levelFt: +rec.level?.ft || +rec.quote?.levelFt || 0,
      profile: rec.profile || null,
      dep: rec.route.dep || pts[0].id,
      arr: rec.route.arr || pts.at(-1).id,
      altn: rec.route.altn || '',
      text: rec.route.text || '',
      when: rec.weather?.when || null,
      aircraft: rec.aircraft || null,
      updated: rec.updated_at || null,
      from
    };
  }
  /** Texte de route → vol : coordonnées, ou noms résolus par aerodb (terrains, balises, points) ; un nom inconnu écarté. */
  async function fromText(text) {
    const toks = tokenize(text),
      pts = [],
      skipped = [];
    let pendingAlt = 0;
    for (const t of toks) {
      if (t.kind === 'group' && t.alt_ft) pendingAlt = pendingAlt || t.alt_ft;
      if (t.kind === 'coord') pts.push({
        id: t.id,
        lat: t.lat,
        lon: t.lon,
        alt_ft: t.alt_ft || 0
      });
      else if (t.kind === 'name' && !t.airway) {
        const c = await Promise.resolve(ctx.aerodb?.coords?.(t.id)).catch(() => null);
        if (c && Number.isFinite(+c.lat)) pts.push({
          id: t.id,
          lat: +c.lat,
          lon: +c.lon,
          alt_ft: t.alt_ft || 0
        });
        else skipped.push(t.id);
      }
    }
    if (pts.length < 2) throw new Error(T('errTextPoints'));
    if (skipped.length) notify(T('skipped', {
      ids: skipped.join(', ')
    }));
    pts[0].alt_ft = 0;
    pts.at(-1).alt_ft = 0;
    return {
      points: pts,
      levelFt: pendingAlt,
      profile: null,
      dep: pts[0].id,
      arr: pts.at(-1).id,
      altn: '',
      text,
      when: null,
      aircraft: null,
      from: T('fromText')
    };
  }

  async function readFlight() {
    const src = $('flightSrc').value;
    if (src === 'example') return fromRecord(EXAMPLE, T('fromExample'));
    if (src === 'text') return fromText($('routeText').value);
    if (src === 'file') {
      const f = $('file').files?.[0];
      if (!f) throw new Error(T('errFile'));
      return fromRecord(JSON.parse(await f.text()), f.name);
    }
    const rec = await data.get(flightPath);
    if (!rec) throw new Error(T('errNoFlight', {
      tri
    }));
    return fromRecord(rec, T('fromCurrent', {
      tri
    }));
  }

  // ---------------------------------------------------------------- données

  /** Variables horaires d'une demande. */
  const varsOf = (levels, levelVars, surfaceVars) => [...surfaceVars, ...levels.flatMap(l => levelVars.map(v => `${v}_${l}hPa`))];
  /** Prévision de lieux : la réserve météo (Open-Meteo pour ce qui manque), ou la démonstration ; null (cacheOnly) s'il
   *  manque quelque chose. */
  async function forecast(places, vars, {
    cacheOnly,
    stale
  }) {
    if (S.data === 'demo') return {
      locs: A.locations(Demo.forecast(places, vars)),
      weight: 0
    };
    const r = await W.forecast(places, vars, {
      model: S.model.id,
      cacheOnly,
      stale,
      onWait: s => $('status').textContent = T('waitQuota', {
        s
      })
    });
    return r && {
      ...r,
      locs: A.locations(r.locs)
    };
  }

  /** TAF d'un terrain : gardé 30 min sur l'appareil (cache/atmosphere/taf/) ; cacheOnly : seulement ce qui est gardé. */
  async function taf(id, cacheOnly) {
    const p = `cache/atmosphere/taf/${id}.json`,
      c = await data.get(p);
    if (c && Date.now() - c.at < 30 * 60e3) return c.json;
    if (cacheOnly) return null;
    const r = await net.fetch(`https://avwx.rest/api/taf/${id}`);
    if (r.headers.get('x-sog-unreachable')) throw Object.assign(new Error('no key'), {
      noKey: true
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const json = await r.json();
    await data.put(p, {
      at: Date.now(),
      json
    });
    return json;
  }

  /** METAR et TAF des terrains (départ, arrivée, dégagement) : metar.vatsim.net ; TAF par avwx.rest (clé de l'appareil,
   *  ajoutée par le cadre). */
  async function aerodromes(cacheOnly = false) {
    const f = S.flight,
      ids = [f.dep, f.arr, f.altn].filter(x => /^[A-Z]{4}$/.test(x || '')).filter((x, i, a) => a.indexOf(x) === i);
    if (!ids.length) return {
      ids,
      metars: [],
      tafs: {},
      note: T('noIcao')
    };
    if (S.data === 'demo') {
      const pos = ids.map(id => id === f.dep ? f.points[0] : f.points.at(-1));
      return {
        ids,
        metars: decodeMetars(Demo.metars(ids, pos)),
        tafs: {},
        note: T('demoMetars')
      };
    }
    let metars = [];
    const note = [];
    const r = await net.fetch(`https://metar.vatsim.net/metar.php?id=${ids.join(',')}`);
    if (r.ok) {
      metars = decodeMetars(await r.text());
      note.push(T('metarSrc'));
    } else note.push(T('metarNone'));
    const tafs = {};
    let noKey = false;
    for (const id of ids) {
      try {
        const j = await taf(id, cacheOnly);
        if (j) tafs[id] = fromAvwxTaf(j);
      } catch (e) {
        noKey = !!e.noKey;
        break;
      }
    }
    note.push(Object.keys(tafs).length ? T('tafSrc') : noKey ? T('tafNoKey') : cacheOnly ? T('tafLoad') : T('tafNone'));
    return {
      ids,
      metars,
      tafs,
      note: note.join(' · ')
    };
  }

  // ---------------------------------------------------------------- calculs

  /** Altitude haute de la coupe (ft) : au-dessus du plus haut niveau prévu, en milliers ronds. */
  const topFt = () => {
    const hi = Math.max(S.levelFt, ...S.flight.points.map(p => p.alt_ft || 0));
    return clamp(Math.ceil((hi + 6000) / 5000) * 5000, 10000, 40000);
  };

  /** Lecture de l'atmosphère à une distance et une altitude pression : entre les deux lieux de lecture qui l'encadrent,
   *  chacun lu à l'heure de passage du vol. { …at(), ground, below }. */
  function sampleAt(nm, ft) {
    const smp = S.route.samples;
    let i = 1;
    while (i < smp.length - 1 && smp[i].nm < nm) i++;
    const a = smp[i - 1],
      b = smp[i],
      k = clamp((nm - a.nm) / ((b.nm - a.nm) || 1), 0, 1),
      ca = S.cols[i - 1],
      cb = S.cols[i],
      ground = lerp(ca.sfc.pa, cb.sfc.pa, k);
    if (ft < ground) return {
      ft,
      below: true,
      ground
    };
    const X = A.at(ca, Math.max(ft, ca.sfc.pa)),
      Y = A.at(cb, Math.max(ft, cb.sfc.pa));
    if (!X || !Y) return X || Y;
    const out = {
      ft,
      ground,
      below: false
    };
    for (const key of ['hPa', 'zFt', 'tC', 'tdC', 'rh', 'cc', 'isaDev', 'rho', 'daFt']) out[key] = lerp(X[key], Y[key], k);
    if (X.dirDeg != null && Y.dirDeg != null) {
      const vx = lerp(X.kt * Math.sin(X.dirDeg * R), Y.kt * Math.sin(Y.dirDeg * R), k),
        vy = lerp(X.kt * Math.cos(X.dirDeg * R), Y.kt * Math.cos(Y.dirDeg * R), k);
      out.dirDeg = (Math.atan2(vx, vy) / R + 360) % 360;
      out.kt = Math.hypot(vx, vy);
    }
    return out;
  }

  function compute() {
    const f = S.flight,
      locs = S.route.locs,
      k0 = A.hourIndex(locs[0].times, S.depTime),
      c0 = A.column(locs[0], k0),
      cN = A.column(locs.at(-1), A.hourIndex(locs.at(-1).times, S.depTime + 3600));
    // TOC / TOD de Carburant : valables pour le niveau du vol seulement ; à un autre niveau, ses taux et vitesses
    const {
      tocNm,
      todNm,
      ...rates
    } = f.profile || {};
    S.traj = A.trajectory(f.points, {
      levelFt: S.levelFt,
      profile: S.levelFt === f.levelFt ? f.profile : rates,
      depFt: c0.sfc.pa,
      arrFt: cN.sfc.pa,
      cruiseKt: S.cruiseKt
    });
    S.route.samples.forEach(s => s.t = S.depTime + S.traj.minutesAt(s.nm) * 60);
    S.cols = S.route.samples.map((s, i) => A.column(locs[i], A.hourIndex(locs[i].times, s.t)));
    const times = locs[0].times;
    S.outOfRange = !times.length || S.depTime < times[0] - 3600 || S.route.samples.at(-1).t > times.at(-1) + 3600;
    // champ de la coupe : NX × NY cellules
    const NX = 200,
      NY = 120,
      top = topFt(),
      keys = ['tC', 'tdC', 'rh', 'cc', 'isaDev', 'daFt'],
      fld = {
        NX,
        NY,
        top,
        below: new Uint8Array(NX * NY)
      };
    keys.forEach(k => fld[k] = new Array(NX * NY).fill(null));
    for (let i = 0; i < NX; i++) {
      const nm = S.traj.total * i / (NX - 1);
      for (let j = 0; j < NY; j++) {
        const x = sampleAt(nm, top * j / (NY - 1)),
          n = j * NX + i;
        if (!x || x.below) {
          fld.below[n] = 1;
          continue;
        }
        keys.forEach(k => fld[k][n] = x[k] ?? null);
        fld.daFt[n] = x.daFt == null ? null : x.daFt - x.ft;
      }
    }
    S.field = fld;
    // le long de la trajectoire calculée, tous les 1 NM
    const along = [];
    for (let nm = 0; nm <= S.traj.total; nm += 1) {
      const ft = S.traj.computed(nm),
        x = sampleAt(nm, ft),
        p = A.posAt(f.points, S.traj.nmOf, nm);
      along.push({
        nm,
        ft,
        x,
        phase: S.traj.phase(nm),
        track: p.track,
        comp: x && !x.below ? A.windComponents(x.dirDeg, x.kt, p.track) : null,
        ice: x && !x.below ? A.icing(x) : 0
      });
    }
    S.along = along;
    S.sel = clamp(S.sel, 0, S.route.samples.length - 1);
  }

  // ---------------------------------------------------------------- résumé

  function kpis() {
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
      steps = t.steps.slice(1).filter(s => s.ft !== S.levelFt),
      items = [
        [T('kDist'), `${fmtNum(t.total)} NM`, T('kDistN', {
          n: S.flight.points.length,
          m: fmtNum(t.minutesAt(t.total))
        })],
        [T('levelReq'), fmtLvl(S.levelFt), steps.length ? steps.map(s => T('stepFrom', {
          l: fmtLvl(s.ft),
          id: s.id
        })).join(' · ') : T('noStep')],
        [T('kClimb'), `${t.toc == null ? '—' : fmtNum(t.toc)} / ${t.tod == null ? '—' : fmtNum(t.total - t.tod)} NM`, S.flight.profile ? T('kProfile') :
          T('kDefRates')
        ],
        [T('kWind'), vx == null ? '—' : fmtWind((Math.atan2(vx, vy) / R + 360) % 360, Math.hypot(vx, vy)), head == null ? '' :
          T(head >= 0 ? 'kHeadMean' : 'kTailMean', {
            kt: Math.abs(Math.round(head))
          })
        ],
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
    $('kpis').replaceChildren(...items.map(([k, v, n]) => {
      const d = document.createElement('div');
      d.className = 'at-kpi';
      d.innerHTML = '<div class="k"></div><div class="v"></div><div class="n"></div>';
      d.children[0].textContent = k;
      d.children[1].textContent = v;
      d.children[2].textContent = n;
      return d;
    }));
  }

  // ---------------------------------------------------------------- coupe

  const XS = {
    l: 82,
    r: 14,
    t: 26,
    strips: 5,
    stripH: 13
  };

  function xsGeo(Wd, H) {
    const bottom = 22 + XS.strips * (XS.stripH + 2) + 8,
      pw = Wd - XS.l - XS.r,
      ph = H - XS.t - bottom;
    return {
      x0: XS.l,
      y0: XS.t,
      pw,
      ph,
      xOf: nm => XS.l + pw * nm / (S.traj.total || 1),
      yOf: ft => XS.t + ph * (1 - ft / S.field.top),
      nmOf: x => clamp((x - XS.l) / pw, 0, 1) * S.traj.total,
      ftOf: y => clamp(1 - (y - XS.t) / ph, 0, 1) * S.field.top
    };
  }

  function drawXs() {
    const cv = $('xs'),
      {
        ctx: c,
        W: Wd,
        H
      } = sized(cv, Math.max(380, Math.min(560, Math.round(cv.parentElement.clientWidth * 0.42)))),
      g = xsGeo(Wd, H),
      F = S.field,
      L = S.xsLayers,
      cw = g.pw / (F.NX - 1),
      ch = g.ph / (F.NY - 1),
      cloud = cloudRgb();
    S.xsGeo = g;
    c.font = '11px system-ui, sans-serif';
    c.fillStyle = tok('--sog-chart-bg');
    c.fillRect(g.x0, g.y0, g.pw, g.ph);
    // fonds : température, humidité, altitude-densité (un seul à la fois, le dernier coché l'emporte)
    const fill = L.da ? 'da' : L.temp ? 'temp' : L.rh ? 'rh' : null;
    if (fill)
      for (let j = 0; j < F.NY; j++)
        for (let i = 0; i < F.NX; i++) {
          const n = j * F.NX + i;
          if (F.below[n]) continue;
          let col;
          if (fill === 'temp' && F.tC[n] != null) col = rgba(diverging(F.tC[n], 40), 0.75);
          else if (fill === 'da' && F.daFt[n] != null) col = rgba(diverging(F.daFt[n], 4000), 0.75);
          else if (fill === 'rh' && F.rh[n] != null) col = rgba(hex('#2a78d6'), clamp((F.rh[n] - 30) / 70, 0, 1) * 0.6);
          if (!col) continue;
          c.fillStyle = col;
          c.fillRect(g.x0 + (i - 0.5) * cw, g.y0 + g.ph - (j + 0.5) * ch, cw + 0.6, ch + 0.6);
        }
    // nuages
    if (L.cloud)
      for (let j = 0; j < F.NY; j++)
        for (let i = 0; i < F.NX; i++) {
          const n = j * F.NX + i,
            v = F.cc[n];
          if (F.below[n] || !(v > 5)) continue;
          c.fillStyle = `rgba(${cloud},${(v / 100) * 0.62})`;
          c.fillRect(g.x0 + (i - 0.5) * cw, g.y0 + g.ph - (j + 0.5) * ch, cw + 0.6, ch + 0.6);
        }
    // inversions (température qui monte avec l'altitude) et givrage, par colonnes de cellules contiguës
    const runs = (test, style) => {
      c.fillStyle = style;
      for (let i = 0; i < F.NX; i++) {
        let start = -1;
        for (let j = 0; j <= F.NY; j++) {
          const on = j < F.NY && test(i, j);
          if (on && start < 0) start = j;
          if (!on && start >= 0) {
            c.fillRect(g.x0 + (i - 0.5) * cw, g.y0 + g.ph - (j - 0.5) * ch, cw + 0.6, (j - start) * ch);
            start = -1;
          }
        }
      }
    };
    if (L.inv) runs((i, j) => {
      const n = j * F.NX + i,
        up = (j + 1) * F.NX + i;
      return j + 1 < F.NY && !F.below[n] && F.tC[n] != null && F.tC[up] != null && F.tC[up] - F.tC[n] > 0.02;
    }, hatch(c, tok('--at-inv'), 45, 7, 1.4));
    if (L.ice) {
      const lvl = (i, j) => {
        const n = j * F.NX + i;
        return F.below[n] ? 0 : A.icing({
          tC: F.tC[n],
          rh: F.rh[n],
          cc: F.cc[n]
        });
      };
      runs((i, j) => lvl(i, j) === 1, hatch(c, rgba(hex('#c98500'), 0.55), 135, 9, 1));
      runs((i, j) => lvl(i, j) === 2, hatch(c, tok('--at-ice'), 135, 5, 1.6));
    }
    // isothermes tous les 5 °C, 0 °C appuyé
    if (L.iso) {
      const iso = A.contours(F.tC.map((v, n) => F.below[n] ? null : v), F.NX, F.NY, A.thresholdsOf(F.tC, 5)),
        X = gx => g.x0 + gx * cw,
        Y = gy => g.y0 + g.ph - gy * ch;
      for (const ct of iso) {
        const zero = ct.level === 0;
        c.strokeStyle = zero ? '#1c5cab' : ct.level < 0 ? 'rgba(37,106,191,.55)' : 'rgba(227,73,72,.55)';
        c.lineWidth = zero ? 2 : 1;
        c.setLineDash(zero ? [] : [4, 3]);
        c.beginPath();
        for (const s of ct.segs) {
          c.moveTo(X(s[0]), Y(s[1]));
          c.lineTo(X(s[2]), Y(s[3]));
        }
        c.stroke();
        c.setLineDash([]);
        // étiquette sur le segment le plus proche d'un point qui glisse avec le niveau (évite les empilements)
        const gx = (F.NX - 1) * (0.12 + 0.76 * (((ct.level / 5) % 7 + 7) % 7) / 6);
        let best = null,
          bd = Infinity;
        for (const s of ct.segs) {
          const d = Math.abs((s[0] + s[2]) / 2 - gx);
          if (d < bd) {
            bd = d;
            best = s;
          }
        }
        if (best) halo(c, `${ct.level < 0 ? '−' : ''}${Math.abs(ct.level)}°`, X((best[0] + best[2]) / 2), Y((best[1] + best[3]) / 2), zero ? '#1c5cab' :
          tok('--sog-muted'));
      }
    }
    // base des cumulus estimée (sol + 400 ft par degré d'écart au point de rosée)
    if (L.cu) {
      c.save();
      c.strokeStyle = tok('--sog-muted');
      c.setLineDash([1, 3]);
      c.lineWidth = 1.2;
      c.beginPath();
      S.route.samples.forEach((s, i) => {
        const b = A.cumulusBaseFt(S.cols[i]);
        if (b == null) return;
        const x = g.xOf(s.nm),
          y = g.yOf(Math.min(b, F.top));
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      });
      c.stroke();
      c.restore();
    }
    // relief (altitude pression du sol)
    c.fillStyle = tok('--at-terrain');
    c.beginPath();
    c.moveTo(g.x0, g.y0 + g.ph);
    S.route.samples.forEach((s, i) => c.lineTo(g.xOf(s.nm), g.yOf(Math.max(0, S.cols[i].sfc.pa))));
    c.lineTo(g.x0 + g.pw, g.y0 + g.ph);
    c.closePath();
    c.fill();
    // vent : une barbule par lieu de lecture et tous les 3 000 ft (tous les deux lieux si serré)
    if (L.wind) {
      const every = Math.max(1, Math.ceil(30 / (g.pw / S.route.samples.length)));
      S.route.samples.forEach((s, i) => {
        if (i % every) return;
        for (let ft = 3000; ft < F.top; ft += F.top > 20000 ? 5000 : 3000) {
          const x = A.at(S.cols[i], ft);
          if (!x || x.below || x.dirDeg == null) continue;
          barb(c, g.xOf(s.nm), g.yOf(ft), x.dirDeg, x.kt, 20, tok('--sog-muted'));
        }
      });
    }
    // trajectoires : demandée, planifiée, calculée
    const line = (fn, color, dash, w) => {
      c.save();
      c.strokeStyle = color;
      c.lineWidth = w;
      c.setLineDash(dash);
      c.beginPath();
      for (let x = 0; x <= g.pw; x += 2) {
        const nm = g.nmOf(g.x0 + x),
          y = g.yOf(fn(nm));
        x ? c.lineTo(g.x0 + x, y) : c.moveTo(g.x0 + x, y);
      }
      c.stroke();
      c.restore();
    };
    line(S.traj.requested, tok('--at-requested'), [2, 4], 2);
    line(S.traj.planned, tok('--at-planned'), [7, 4], 2);
    line(S.traj.computed, tok('--at-computed'), [], 2.5);
    for (const [nm, lab] of [
        [S.traj.toc, 'TOC'],
        [S.traj.tod, 'TOD']
      ])
      if (nm != null) {
        const x = g.xOf(nm),
          y = g.yOf(S.traj.computed(nm));
        c.fillStyle = tok('--at-computed');
        c.beginPath();
        c.arc(x, y, 4, 0, 2 * Math.PI);
        c.fill();
        halo(c, lab, x, y - 11, tok('--at-computed'));
      }
    // points de la route et tranche choisie
    c.save();
    S.flight.points.forEach((p, i) => {
      const x = g.xOf(S.traj.nmOf[i]);
      c.strokeStyle = tok('--sog-border');
      c.setLineDash([2, 3]);
      c.beginPath();
      c.moveTo(x, g.y0);
      c.lineTo(x, g.y0 + g.ph);
      c.stroke();
      halo(c, p.id, clamp(x, g.x0 + 18, g.x0 + g.pw - 18), g.y0 - 10, tok('--sog-fg'));
    });
    c.restore();
    const sx = g.xOf(S.route.samples[S.sel].nm);
    c.strokeStyle = tok('--sog-accent');
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(sx, g.y0);
    c.lineTo(sx, g.y0 + g.ph);
    c.stroke();
    // axes
    c.fillStyle = tok('--sog-muted');
    c.lineWidth = 1;
    const stepFt = F.top > 25000 ? 5000 : F.top > 12000 ? 2000 : 1000;
    for (let ft = 0; ft <= F.top; ft += stepFt) {
      const y = g.yOf(ft);
      c.textAlign = 'right';
      c.textBaseline = 'middle';
      c.fillText(ft ? fmtLvl(ft) : '0', g.x0 - 6, y);
    }
    c.textAlign = 'center';
    c.textBaseline = 'top';
    const nmStep = [10, 20, 25, 50, 100, 200].find(s => g.pw / (S.traj.total / s) > 60) || 200;
    for (let nm = 0; nm <= S.traj.total; nm += nmStep) c.fillText(`${nm}`, g.xOf(nm), g.y0 + g.ph + 4);
    c.textAlign = 'right';
    c.fillText('NM', g.x0 + g.pw, g.y0 + g.ph + 4);
    c.strokeStyle = tok('--sog-border');
    c.strokeRect(g.x0 + 0.5, g.y0 + 0.5, g.pw, g.ph);
    // bandes de surface : nébulosité basse, moyenne, haute, précipitations, visibilité
    const strips = [
      [T('stLow'), q => q.sfc.ccL, v => `rgba(${cloud},${v / 100 * 0.85})`],
      [T('stMid'), q => q.sfc.ccM, v => `rgba(${cloud},${v / 100 * 0.85})`],
      [T('stHigh'), q => q.sfc.ccH, v => `rgba(${cloud},${v / 100 * 0.85})`],
      [T('stPrecip'), q => q.sfc.precip, v => rgba(hex('#2a78d6'), clamp(v / 4, 0, 1) * 0.9)],
      [T('stVis'), q => q.sfc.visM, v => v < 8000 ? rgba(hex('#fab219'), clamp((8000 - v) / 7000, 0.15, 1)) : 'transparent']
    ];
    strips.forEach(([lab, get, col], k) => {
      const y = g.y0 + g.ph + 22 + k * (XS.stripH + 2);
      c.fillStyle = tok('--sog-muted');
      c.textAlign = 'right';
      c.textBaseline = 'middle';
      c.fillText(lab, g.x0 - 6, y + XS.stripH / 2);
      c.fillStyle = tok('--sog-chart-grid');
      c.fillRect(g.x0, y, g.pw, XS.stripH);
      const smp = S.route.samples;
      smp.forEach((s, i) => {
        const v = get(S.cols[i]);
        if (v == null) return;
        const xa = i ? (g.xOf(smp[i - 1].nm) + g.xOf(s.nm)) / 2 : g.x0,
          xb = i < smp.length - 1 ? (g.xOf(s.nm) + g.xOf(smp[i + 1].nm)) / 2 : g.x0 + g.pw;
        c.fillStyle = col(v);
        c.fillRect(xa, y, xb - xa, XS.stripH);
      });
    });
    $('xsSub').textContent = T('xsSub', {
      n: S.route.samples.length
    });
  }

  function xsLegend() {
    const L = S.xsLayers,
      mid = dark() ? '#383835' : '#f0efec',
      items = [
        `<span><span class="at-sw" style="color:var(--at-computed)"></span> ${esc(T('lgComputed'))}</span>`,
        `<span><span class="at-sw" style="color:var(--at-planned);border-top-style:dashed"></span> ${esc(T('lgPlanned'))}</span>`,
        `<span><span class="at-sw" style="color:var(--at-requested);border-top-style:dotted"></span> ${esc(T('levelReq'))}</span>`
      ];
    if (L.cloud) items.push(`<span><span class="at-ramp" style="background:linear-gradient(90deg,transparent,rgba(${cloudRgb()},.62))"></span> ${esc(T('lgCloud'))}</span>`);
    if (L.temp) items.push(`<span>−40 °C <span class="at-ramp" style="background:linear-gradient(90deg,#0d366b,#6da7ec,${mid},#ec8a85,#9e2a2a)"></span> +40 °C</span>`);
    if (L.da) items.push(`<span>${esc(T('lgDa'))} −4 000 <span class="at-ramp" style="background:linear-gradient(90deg,#0d366b,#6da7ec,${mid},#ec8a85,#9e2a2a)"></span> +4 000 ft</span>`);
    if (L.rh) items.push(`<span>${esc(T('lgRh'))} 30 <span class="at-ramp" style="background:linear-gradient(90deg,transparent,rgba(42,120,214,.6))"></span> 100 %</span>`);
    if (L.iso) items.push(`<span><span class="at-sw" style="color:#1c5cab"></span> ${esc(T('lgIso'))}</span>`);
    if (L.inv) items.push(`<span style="color:var(--at-inv)">▨ ${esc(T('lgInv'))}</span>`);
    if (L.ice) items.push(`<span style="color:#c98500">▧ ${esc(T('icePossibleL'))}</span><span style="color:var(--at-ice)">▧ ${esc(T('iceProbableL'))}</span>`);
    if (L.cu) items.push(`<span>··· ${esc(T('lgCu'))}</span>`);
    items.push(`<span><span class="at-ramp" style="background:var(--at-terrain);width:18px"></span> ${esc(T('lgTerrain'))}</span>`);
    $('xsLegend').innerHTML = items.join('');
  }

  function xsTip(ev) {
    const g = S.xsGeo,
      tip = $('xsTip');
    if (!g) return;
    const rect = $('xs').getBoundingClientRect(),
      x = ev.clientX - rect.left,
      y = ev.clientY - rect.top;
    if (x < g.x0 || x > g.x0 + g.pw || y < g.y0 || y > g.y0 + g.ph) return tip.style.display = 'none';
    const nm = g.nmOf(x),
      ft = g.ftOf(y),
      v = sampleAt(nm, ft),
      p = A.posAt(S.flight.points, S.traj.nmOf, nm),
      tr = S.traj.computed(nm);
    let html = `<b>${fmtNum(nm)} NM · ${fmtLvl(ft)}</b> <span class="m">· ${esc(T('tipTraj', { l: fmtLvl(tr), p: phase(S.traj.phase(nm)) }))}</span><br>`;
    if (!v || v.below) html += `<span class="m">${esc(T('tipBelow', { l: fmtLvl(v?.ground) }))}</span>`;
    else {
      const comp = A.windComponents(v.dirDeg, v.kt, p.track),
        ice = A.icing(v);
      html += `${fmtT(v.tC)} <span class="m">(${fmtDev(v.isaDev)})</span> · ${esc(T('dew'))} ${fmtT(v.tdC)} · ${esc(T('rhShort'))} ${fmtNum(v.rh)} %<br>` +
        `${esc(T('clouds'))} ${fmtNum(v.cc)} % · ${esc(T('wind'))} ${fmtWind(v.dirDeg, v.kt)} <span class="m">${esc(fmtComp(comp))}</span><br>` +
        `ρ ${fmtNum(v.rho, 3)} kg/m³ · ${esc(T('da'))} ${fmtLvl(v.daFt)} · ${esc(T('trueAlt'))} ≈ ${fmtNum(Math.round((v.zFt ?? 0) / 10) * 10)} ft` +
        (ice ? `<br><b style="color:var(--at-ice)">${esc(T('icing'))} ${esc(iceText(ice))}</b>` : '');
    }
    tip.innerHTML = html;
    tip.style.display = 'block';
    const tw = tip.offsetWidth;
    tip.style.left = `${x + 14 + tw > rect.width ? x - tw - 14 : x + 14}px`;
    tip.style.top = `${clamp(y - 20, 0, rect.height - tip.offsetHeight)}px`;
  }

  // ---------------------------------------------------------------- tranche (sondage)

  function drawSlice() {
    const i = S.sel,
      s = S.route.samples[i],
      col = S.cols[i],
      cv = $('sd'),
      {
        ctx: c,
        W: Wd,
        H
      } = sized(cv, 440),
      top = S.field.top,
      l = 50,
      r = 74,
      t = 10,
      b = 24,
      pw = Wd - l - r,
      ph = H - t - b,
      prof = [];
    for (let ft = Math.max(0, col.sfc.pa); ft <= top; ft += 200) prof.push(A.at(col, ft));
    const temps = prof.flatMap(p => [p.tC, p.tdC]).filter(Number.isFinite),
      tMin = Math.floor((Math.min(...temps, A.isaC(top)) - 4) / 10) * 10,
      tMax = Math.ceil((Math.max(...temps, 15) + 4) / 10) * 10,
      X = tc => l + pw * (tc - tMin) / (tMax - tMin),
      Y = ft => t + ph * (1 - ft / top);
    S.sdGeo = {
      l,
      t,
      pw,
      ph,
      top,
      tMin,
      tMax
    };
    c.font = '11px system-ui, sans-serif';
    // grille des températures
    for (let tc = tMin; tc <= tMax; tc += 10) {
      c.strokeStyle = tc === 0 ? '#1c5cab' : tok('--sog-chart-grid');
      c.lineWidth = tc === 0 ? 1.5 : 1;
      c.beginPath();
      c.moveTo(X(tc), t);
      c.lineTo(X(tc), t + ph);
      c.stroke();
      c.fillStyle = tok('--sog-muted');
      c.textAlign = 'center';
      c.textBaseline = 'top';
      c.fillText(`${tc}°`, X(tc), t + ph + 5);
    }
    const stepFt = top > 25000 ? 5000 : top > 12000 ? 2000 : 1000;
    c.textAlign = 'right';
    c.textBaseline = 'middle';
    for (let ft = 0; ft <= top; ft += stepFt) {
      c.strokeStyle = tok('--sog-chart-grid');
      c.beginPath();
      c.moveTo(l, Y(ft));
      c.lineTo(l + pw, Y(ft));
      c.stroke();
      c.fillStyle = tok('--sog-muted');
      c.fillText(ft ? fmtLvl(ft) : '0', l - 5, Y(ft));
    }
    // inversions
    c.fillStyle = hatch(c, tok('--at-inv'), 45, 7, 1.4);
    for (const v of A.inversions(col))
      if (v.fromFt < top) c.fillRect(l, Y(Math.min(top, v.toFt)), pw, Y(v.fromFt) - Y(Math.min(top, v.toFt)));
    // relief
    c.fillStyle = tok('--at-terrain');
    c.fillRect(l, Y(Math.max(0, col.sfc.pa)), pw + r, t + ph - Y(Math.max(0, col.sfc.pa)));
    // atmosphère type
    c.strokeStyle = tok('--sog-muted');
    c.setLineDash([5, 4]);
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(X(A.isaC(0)), Y(0));
    c.lineTo(X(A.isaC(top)), Y(top));
    c.stroke();
    c.setLineDash([]);
    // température et point de rosée
    for (const [k, color] of [
        ['tdC', '#008300'],
        ['tC', '#e34948']
      ]) {
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.beginPath();
      prof.forEach((p, n) => p[k] != null && (n ? c.lineTo(X(p[k]), Y(p.ft)) : c.moveTo(X(p[k]), Y(p.ft))));
      c.stroke();
    }
    // nuages (colonne à droite) et vent
    const cloud = cloudRgb();
    prof.forEach(p => {
      if (!(p.cc > 5)) return;
      c.fillStyle = `rgba(${cloud},${p.cc / 100 * 0.8})`;
      c.fillRect(l + pw + 4, Y(p.ft + 100), 22, Y(p.ft - 100) - Y(p.ft + 100));
    });
    for (let ft = Math.ceil((col.sfc.pa + 500) / stepFt) * stepFt; ft < top; ft += stepFt) {
      const x = A.at(col, ft);
      if (x && !x.below) barb(c, l + pw + 52, Y(ft), x.dirDeg, x.kt, 18, tok('--sog-muted'));
    }
    // niveaux du vol à cette distance
    const lv = [
      [S.traj.requested(s.nm), '--at-requested', [2, 4]],
      [S.traj.planned(s.nm), '--at-planned', [7, 4]],
      [S.traj.computed(s.nm), '--at-computed', []]
    ];
    for (const [ft, color, dash] of lv) {
      c.strokeStyle = tok(color);
      c.lineWidth = 2;
      c.setLineDash(dash);
      c.beginPath();
      c.moveTo(l, Y(ft));
      c.lineTo(l + pw, Y(ft));
      c.stroke();
    }
    c.setLineDash([]);
    c.strokeStyle = tok('--sog-border');
    c.strokeRect(l + 0.5, t + 0.5, pw, ph);
    // en-tête et lecture
    const leg = A.posAt(S.flight.points, S.traj.nmOf, s.nm).leg,
      near = s.point >= 0 ? S.flight.points[s.point].id : T('between', {
        a: S.flight.points[leg].id,
        b: S.flight.points[leg + 1].id
      }),
      ft = S.traj.computed(s.nm),
      x = A.at(col, ft),
      p = A.posAt(S.flight.points, S.traj.nmOf, s.nm),
      comp = x && !x.below ? A.windComponents(x.dirDeg, x.kt, p.track) : null,
      inv = A.inversions(col),
      zeros = A.zeroIsotherms(col),
      cu = A.cumulusBaseFt(col),
      sf = col.sfc;
    $('sliceHead').textContent = T('sliceHead', {
      i: i + 1,
      n: S.route.samples.length,
      nm: fmtNum(s.nm),
      near,
      at: col.time ? fmtHM(col.time) : '—',
      pass: fmtHM(s.t)
    });
    const rows = [
      [T('rGround'), `${fmtNum(Math.round(col.elevFt / 10) * 10)} ft · QNH ${fmtNum(sf.mslp)} hPa · ${fmtT(sf.tC)} / ${T('dew')} ${fmtT(sf.tdC)} · ${T('wind')} ${fmtWind(sf.dir, sf.kt)}`],
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
          p: phase(S.traj.phase(s.nm))
        }), !x || x.below ? '—' : `${fmtT(x.tC)} (${fmtDev(x.isaDev)}) · ${T('wind')} ${fmtWind(x.dirDeg, x.kt)} ${fmtComp(comp)} · ` +
        `${T('clouds')} ${fmtNum(x.cc)} % · ${T('da')} ${fmtLvl(x.daFt)}` + (A.icing(x) ? ` · ${T('icing')} ${iceText(A.icing(x))}` : '')
      ]
    ];
    $('sliceInfo').replaceChildren(...rows.map(([k, v]) => {
      const d = document.createElement('div');
      d.innerHTML = '<span class="m"></span> ';
      d.firstChild.textContent = ctx.t(['{k} :', '{k}:', '{k}:', '{k}:'], {
        k
      });
      d.append(v);
      return d;
    }));
    // puces des points de la route
    const wps = S.route.samples.map((q, j) => [q, j]).filter(([q]) => q.point >= 0);
    $('sliceWps').replaceChildren(...wps.map(([q, j]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = S.flight.points[q.point].id;
      btn.setAttribute('aria-pressed', String(j === i));
      btn.onclick = () => select(j);
      return btn;
    }));
  }

  function sdTip(ev) {
    const g = S.sdGeo,
      tip = $('sdTip');
    if (!g) return;
    const rect = $('sd').getBoundingClientRect(),
      x = ev.clientX - rect.left,
      y = ev.clientY - rect.top;
    if (x < g.l || x > g.l + g.pw + 70 || y < g.t || y > g.t + g.ph) return tip.style.display = 'none';
    const ft = clamp(1 - (y - g.t) / g.ph, 0, 1) * g.top,
      v = A.at(S.cols[S.sel], ft);
    if (!v || v.below) return tip.style.display = 'none';
    tip.innerHTML = `<b>${fmtLvl(ft)}</b> <span class="m">${fmtNum(v.hPa)} hPa</span><br>${fmtT(v.tC)} (${fmtDev(v.isaDev)}) · ${esc(T('dew'))} ${fmtT(v.tdC)}<br>` +
      `${esc(T('rhShort'))} ${fmtNum(v.rh)} % · ${esc(T('clouds'))} ${fmtNum(v.cc)} % · ${esc(T('wind'))} ${fmtWind(v.dirDeg, v.kt)}`;
    tip.style.display = 'block';
    tip.style.left = `${Math.min(x + 12, rect.width - tip.offsetWidth)}px`;
    tip.style.top = `${clamp(y - 16, 0, rect.height - tip.offsetHeight)}px`;
  }

  // ---------------------------------------------------------------- table

  function table() {
    const smp = S.route.samples,
      head = ['thPlace', 'NM', 'thPass', 'thPhase', 'thTraj', 'thPlanned', 'thTemp', 'ISA', 'thWind', 'thComp', 'thCloud', 'thIce',
        'thDa',
        'kInv', 'QNH', 'thGround', 'thLmh'
      ].map(k => TX[k] ? T(k) : k),
      num = new Set([1, 4, 5, 6, 7, 10, 12, 14, 15]);
    const rows = smp.map((s, i) => {
      const col = S.cols[i],
        ft = S.traj.computed(s.nm),
        x = A.at(col, ft),
        p = A.posAt(S.flight.points, S.traj.nmOf, s.nm),
        comp = x && !x.below ? A.windComponents(x.dirDeg, x.kt, p.track) : null,
        ice = x && !x.below ? A.icing(x) : 0,
        inv = A.inversions(col).filter(v => v.fromFt <= Math.max(ft, S.levelFt)),
        sf = col.sfc,
        ok = x && !x.below,
        cells = [esc(s.point >= 0 ? S.flight.points[s.point].id : '·'), fmtNum(s.nm), fmtHM(s.t), esc(phase(S.traj.phase(s.nm))),
          fmtLvl(ft),
          fmtLvl(S.traj.planned(s.nm)),
          ok ? fmtT(x.tC) : '—', ok ? fmtDev(x.isaDev).replace('ISA ', '') : '—', ok ? fmtWind(x.dirDeg, x.kt) : '—',
          comp ? `${Math.round(comp.head)} / ${Math.abs(Math.round(comp.cross))}${comp.cross >= 0 ? T('right') : T('left')}` : '—', ok ? `${fmtNum(x.cc)} %` : '—',
          ice ? `<span class="at-flag ice${ice}">${esc(iceText(ice))}</span>` : '—', ok ? fmtLvl(x.daFt) : '—',
          inv.length ? `<span class="at-flag inv">${inv.map(v => `${v.ground ? esc(T('ground')) : fmtLvl(v.fromFt)}–${fmtLvl(v.toFt)}`).join(', ')}</span>` : '—',
          fmtNum(sf.mslp), `${fmtT(sf.tC)}`, `${fmtNum(sf.ccL)} / ${fmtNum(sf.ccM)} / ${fmtNum(sf.ccH)}`
        ];
      return `<tr data-i="${i}" class="${s.point >= 0 ? 'wp' : ''}${i === S.sel ? ' sel' : ''}">${cells.map((v, k) => `<td${num.has(k) ? ' class="f-num"' : ''}>${v}</td>`).join('')}</tr>`;
    });
    $('tbl').innerHTML = `<thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody>`;
  }

  // ---------------------------------------------------------------- terrains

  function aerodromeCards() {
    const Wx = S.wx;
    $('wxSub').textContent = Wx?.note || '';
    if (!Wx) return $('wx').replaceChildren();
    const f = S.flight,
      whenOf = id => id === f.dep ? S.depTime : S.route.samples.at(-1).t;
    $('wx').replaceChildren(...Wx.ids.map(id => {
      const m = Wx.metars.find(x => x.icaoId === id) || null,
        st = station(m, Wx.tafs[id] || null, whenOf(id)),
        d = document.createElement('div');
      d.className = 'at-st';
      const role = T(id === f.dep ? 'roleDep' : id === f.arr ? 'roleArr' : 'roleAltn');
      if (!st) {
        d.innerHTML = `<span class="id">${esc(id)}</span> <span class="at-sub">${esc(T('noMsg', { role }))}</span>`;
        return d;
      }
      const vis = st.vis ? st.vis.sm >= 6 ? '≥ 10 km' : `${fmtNum(st.vis.sm * 1.609, 1)} km` : '—';
      d.innerHTML = `<div><span class="id">${esc(id)}</span> <span class="at-sub">${esc(role)} · ${esc(st.source)}${st.source === 'TAF' ? ` ${esc(T('at', { t: fmtHM(st.at) }))}` : ''}</span> ` +
        (st.cat ? `<span class="at-cat ${esc(st.cat)}">${esc(st.cat)}</span>` : '') + (st.convective ? ' <span class="at-flag ice2">CB / TCU</span>' : '') + '</div>' +
        `<div>${esc(T('wind'))} ${fmtWind(st.wdir === 'VRB' ? null : st.wdir, st.wspd)}${st.wdir === 'VRB' ? ` VRB ${esc(st.wspd)} kt` : ''}${st.wgst ? ` ${esc(T('gusts', { kt: st.wgst }))}` : ''} · ${esc(T('vis'))} ${vis} · ` +
        `${esc(T('ceiling'))} ${st.ceil == null ? '—' : `${fmtNum(st.ceil)} ft`}${st.temp != null ? ` · ${fmtT(st.temp)}` : ''}${st.qnh ? ` · QNH ${fmtNum(st.qnh)}` : ''}${st.wx ? ` · ${esc(st.wx)}` : ''}</div>` +
        `<div class="at-raw"></div>`;
      d.querySelector('.at-raw').textContent = st.raw;
      return d;
    }));
  }

  // ---------------------------------------------------------------- carte

  const BLANK = {
    version: 8,
    sources: {},
    layers: [{
      id: 'bg',
      type: 'background',
      paint: {
        'background-color': '#e9edf1'
      }
    }]
  };

  async function initMap() {
    if (S.map) return;
    const ml = await loadMapLibre();
    if (!ml || S.map || !alive) return;
    const style = dark() ? 'https://tiles.openfreemap.org/styles/dark' : 'https://tiles.openfreemap.org/styles/positron';
    try {
      S.map = new ml.Map({
        container: $('map'),
        style: S.data === 'demo' && !navigator.onLine ? BLANK : style,
        center: [2, 46],
        zoom: 5,
        attributionControl: {
          compact: true
        },
        dragRotate: false
      });
    } catch {
      S.map = null;
      return;
    }
    const blank = () => {
      if (S.map.__blank) return;
      S.map.__blank = true;
      S.map.setStyle(BLANK);
      $('mapSub').textContent = T('mapBlank');
    };
    S.map.on('error', () => !S.map.isStyleLoaded() && blank());
    setTimeout(() => S.map && !S.map.isStyleLoaded() && blank(), 6000);
    S.map.on('move', drawMap);
    S.map.on('resize', drawMap);
    S.map.on('load', drawMap);
    S.map.on('idle', drawMap);
    S.map.on('mousemove', e => mapTip(e.lngLat.lng, e.lngLat.lat, e.point));
    S.map.once('load', fitMap);
    fitMap();
  }

  /** Projection lon / lat → pixels de la carte (MapLibre, sinon équirectangulaire sur l'emprise de la grille). */
  function projector(Wd, H) {
    if (S.map) return (lon, lat) => S.map.project([lon, lat]);
    const [w, s, e, n] = S.grid.g.bbox,
      k = Math.min(Wd / ((e - w) * Math.cos((s + n) / 2 * R)), H / (n - s)),
      ox = (Wd - (e - w) * Math.cos((s + n) / 2 * R) * k) / 2,
      oy = (H - (n - s) * k) / 2;
    return (lon, lat) => ({
      x: ox + (lon - w) * Math.cos((s + n) / 2 * R) * k,
      y: oy + (n - lat) * k
    });
  }

  /** Altitudes de la carte d'un vol : niveau demandé, paliers, altitudes fixes sous le haut de la coupe. */
  const mapAltitudes = f => [S.levelFt, ...f.points.map(p => p.alt_ft).filter(x => x > 0), ...MAP_FIXED.filter(ft => ft <= topFt())];

  /** Altitude pression de la carte selon le choix (sol : null). */
  function mapFt() {
    const v = S.mapLevel;
    if (v === 'sfc') return null;
    if (v === 'req' || v === 'traj') return S.levelFt;
    if (v.startsWith('step:')) return S.traj.steps[+v.slice(5)]?.ft ?? S.levelFt;
    if (v.startsWith('alt:')) return +v.slice(4);
    return S.levelFt;
  }

  /** Heure de la carte : passage du vol à la tranche choisie. */
  const mapTime = () => S.route.samples[S.sel].t;

  /** Champs de la carte à l'altitude choisie, sur la grille : { t, cc, p, wind, label }. */
  function mapFields() {
    const G = S.grid,
      ft = mapFt(),
      t = mapTime(),
      cols = G.locs.map(loc => A.column(loc, A.hourIndex(loc.times, t)));
    if (ft == null) return {
      cols,
      ft,
      t: cols.map(q => q.sfc.tC),
      cc: cols.map(q => Math.max(q.sfc.ccL ?? 0, q.sfc.ccM ?? 0, q.sfc.ccH ?? 0)),
      p: cols.map(q => q.sfc.mslp),
      wind: cols.map(q => [q.sfc.dir, q.sfc.kt]),
      pStep: 2,
      pLabel: T('isoMsl'),
      time: cols[0]?.time
    };
    const xs = cols.map(q => A.at(q, ft)),
      zs = xs.map(x => x && !x.below ? x.zFt : null).filter(Number.isFinite),
      z = zs.length ? zs.reduce((s, v) => s + v, 0) / zs.length : null,
      p = cols.map(q => z == null ? null : A.pressureAtZ(q, z)),
      pv = p.filter(Number.isFinite),
      spread = pv.length ? Math.max(...pv) - Math.min(...pv) : 0;
    return {
      cols,
      ft,
      t: xs.map(x => x && !x.below ? x.tC : null),
      cc: xs.map(x => x && !x.below ? x.cc : null),
      p,
      wind: xs.map(x => x && !x.below ? [x.dirDeg, x.kt] : [null, null]),
      pStep: spread > 12 ? 2 : 1,
      pLabel: z == null ? '' : T('isoAlt', {
        z: fmtNum(Math.round(z / 50) * 50),
        l: fmtLvl(ft),
        s: spread > 12 ? 2 : 1
      }),
      time: cols[0]?.time
    };
  }

  function drawMap() {
    const cv = $('mapCanvas');
    if (!cv) return;
    if (!S.grid || !S.traj) return cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
    const box = $('map'),
      dpr = window.devicePixelRatio || 1,
      Wd = box.clientWidth,
      H = box.clientHeight;
    if (cv.width !== Math.round(Wd * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(Wd * dpr);
      cv.height = Math.round(H * dpr);
    }
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, Wd, H);
    const P = projector(Wd, H),
      G = S.grid.g,
      [w, s, e, n] = G.bbox,
      F = S.mapF || (S.mapF = mapFields()),
      L = S.mapLayers,
      f = 4,
      lonOf = gx => w + (e - w) * gx / ((G.nx - 1) * f),
      latOf = gy => s + (n - s) * gy / ((G.ny - 1) * f),
      cloud = cloudRgb();
    c.font = '11px system-ui, sans-serif';
    if (!S.map) {
      c.fillStyle = tok('--sog-chart-grid');
      c.fillRect(0, 0, Wd, H);
    }
    // fonds : température (facultatif), nuages
    const cells = (vals, colorOf) => {
      const r = A.refine(vals, G.nx, G.ny, f);
      for (let j = 0; j < r.ny - 1; j++)
        for (let i = 0; i < r.nx - 1; i++) {
          const v = r.v[j * r.nx + i];
          if (v == null) continue;
          const col = colorOf(v);
          if (!col) continue;
          // bords arrondis au pixel : cases jointives, sans recouvrement (pas de couture dans un fond transparent)
          const a = P(lonOf(i), latOf(j)),
            b = P(lonOf(i + 1), latOf(j + 1)),
            x0 = Math.round(Math.min(a.x, b.x)),
            y0 = Math.round(Math.min(a.y, b.y));
          c.fillStyle = col;
          c.fillRect(x0, y0, Math.round(Math.max(a.x, b.x)) - x0, Math.round(Math.max(a.y, b.y)) - y0);
        }
    };
    if (L.tfill) cells(F.t, v => rgba(diverging(v, 40), 0.45));
    if (L.cloud) cells(F.cc, v => v > 8 ? `rgba(${cloud},${v / 100 * 0.6})` : null);
    // courbes
    const curves = (vals, step, style, labelOf, labelAt) => {
      const r = A.refine(vals, G.nx, G.ny, f),
        cs = A.contours(r.v, r.nx, r.ny, A.thresholdsOf(vals, step));
      for (const ct of cs) {
        style(ct.level);
        c.beginPath();
        for (const sg of ct.segs) {
          const a = P(lonOf(sg[0]), latOf(sg[1])),
            b = P(lonOf(sg[2]), latOf(sg[3]));
          c.moveTo(a.x, a.y);
          c.lineTo(b.x, b.y);
        }
        c.stroke();
        c.setLineDash([]);
        let best = null,
          bd = Infinity;
        const tx = (r.nx - 1) * labelAt(ct.level);
        for (const sg of ct.segs) {
          const d = Math.abs((sg[0] + sg[2]) / 2 - tx) + Math.abs((sg[1] + sg[3]) / 2 - (r.ny - 1) / 2) * 0.3;
          if (d < bd) {
            bd = d;
            best = sg;
          }
        }
        if (best) {
          const q = P(lonOf((best[0] + best[2]) / 2), latOf((best[1] + best[3]) / 2));
          halo(c, labelOf(ct.level), q.x, q.y, c.strokeStyle);
        }
      }
    };
    if (L.isobar && F.p.some(Number.isFinite)) curves(F.p, F.pStep, lv => {
      c.strokeStyle = dark() ? '#c3c2b7' : '#3d3c39';
      c.lineWidth = lv % (F.pStep * 2) === 0 ? 1.6 : 0.9;
    }, lv => `${Math.round(lv)}`, lv => 0.2 + 0.6 * (((lv / F.pStep) % 5 + 5) % 5) / 4);
    if (L.isotherm && F.t.some(Number.isFinite)) curves(F.t, 2, lv => {
      c.strokeStyle = lv === 0 ? '#1c5cab' : lv < 0 ? '#256abf' : '#c23b3a';
      c.lineWidth = lv === 0 ? 2 : 1;
      c.setLineDash(lv === 0 ? [] : [5, 4]);
    }, lv => `${lv < 0 ? '−' : ''}${Math.abs(lv)}°`, lv => 0.15 + 0.7 * (((lv / 2) % 6 + 6) % 6) / 5);
    // dépressions et anticyclones (sol)
    if (F.ft == null && L.isobar) {
      for (let j = 1; j < G.ny - 1; j++)
        for (let i = 1; i < G.nx - 1; i++) {
          const v = F.p[j * G.nx + i];
          if (v == null) continue;
          const nb = [-1, 0, 1].flatMap(dj => [-1, 0, 1].map(di => F.p[(j + dj) * G.nx + i + di])).filter(x => x != null);
          const isMin = nb.every(x => x >= v),
            isMax = nb.every(x => x <= v);
          if (!isMin && !isMax) continue;
          const q = P(G.places[j * G.nx + i].lon, G.places[j * G.nx + i].lat);
          c.font = 'bold 18px system-ui, sans-serif';
          halo(c, isMin ? T('low') : T('high'), q.x, q.y, isMin ? '#c23b3a' : '#1c5cab');
          c.font = '11px system-ui, sans-serif';
          halo(c, `${Math.round(v)}`, q.x, q.y + 15, tok('--sog-muted'));
        }
    }
    // vent
    if (L.wind) G.places.forEach((pl, k) => {
      if ((pl.i + pl.j) % 2 && G.places.length > 40) return;
      const [d, kt] = F.wind[k],
        q = P(pl.lon, pl.lat);
      barb(c, q.x, q.y, d, kt, 22, tok('--sog-fg'));
    });
    // route : trajectoire calculée colorée par la température rencontrée en mode « trajectoire », sinon trait
    const pts = S.flight.points;
    c.lineCap = 'round';
    if (S.mapLevel === 'traj') {
      // liseré d'un seul tracé, puis les tronçons de 1 NM colorés par-dessus
      const q = S.along.map(a => {
        const p = A.posAt(pts, S.traj.nmOf, a.nm);
        return P(p.lon, p.lat);
      });
      c.strokeStyle = tok('--sog-chart-bg');
      c.lineWidth = 9;
      c.beginPath();
      q.forEach((v, k) => k ? c.lineTo(v.x, v.y) : c.moveTo(v.x, v.y));
      c.stroke();
      c.lineCap = 'butt';
      for (let k = 1; k < S.along.length; k++) {
        const b = S.along[k],
          qa = q[k - 1],
          qb = q[k],
          t = b.x && !b.x.below ? b.x.tC : null;
        c.beginPath();
        c.moveTo(qa.x, qa.y);
        c.lineTo(qb.x, qb.y);
        c.strokeStyle = t == null ? '#888' : rgba(diverging(t, 40), 1);
        c.lineWidth = (b.x?.cc ?? 0) >= 50 ? 6 : 4;
        c.stroke();
        if (b.ice >= 1 && k % 4 === 0) halo(c, '❄', qb.x, qb.y - 9, b.ice === 2 ? tok('--at-ice') : '#9a6b00');
      }
    } else {
      c.beginPath();
      pts.forEach((p, k) => {
        const q = P(p.lon, p.lat);
        k ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y);
      });
      c.strokeStyle = tok('--sog-chart-bg');
      c.lineWidth = 6;
      c.stroke();
      c.strokeStyle = tok('--at-computed');
      c.lineWidth = 3;
      c.stroke();
    }
    pts.forEach(p => {
      const q = P(p.lon, p.lat);
      c.fillStyle = tok('--sog-fg');
      c.beginPath();
      c.arc(q.x, q.y, 3.5, 0, 2 * Math.PI);
      c.fill();
      c.font = 'bold 11.5px system-ui, sans-serif';
      halo(c, p.id, q.x + 7, q.y - 8, tok('--sog-fg'), 'left');
    });
    const sel = S.route.samples[S.sel],
      qs = P(sel.lon, sel.lat);
    c.strokeStyle = tok('--sog-accent');
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(qs.x, qs.y, 8, 0, 2 * Math.PI);
    c.stroke();
  }

  function mapLegend() {
    const F = S.mapF,
      L = S.mapLayers,
      mid = dark() ? '#383835' : '#f0efec',
      items = [];
    if (L.isobar && F.pLabel) items.push(`<span><span class="at-sw" style="color:${dark() ? '#c3c2b7' : '#3d3c39'}"></span> ${esc(F.pLabel)}</span>`);
    if (L.isotherm) items.push(`<span><span class="at-sw" style="color:#c23b3a;border-top-style:dashed"></span> ${esc(T('lgIso2'))} · <span style="color:#1c5cab">0 °C</span></span>`);
    if (L.cloud) items.push(`<span><span class="at-ramp" style="background:linear-gradient(90deg,transparent,rgba(${cloudRgb()},.6))"></span> ` +
      `${esc(F.ft == null ? T('lgCloudSfc') : T('lgCloudAt', { l: fmtLvl(F.ft) }))}</span>`);
    if (L.tfill) items.push(`<span>−40 °C <span class="at-ramp" style="background:linear-gradient(90deg,#0d366b,#6da7ec,${mid},#ec8a85,#9e2a2a)"></span> +40 °C</span>`);
    if (L.wind) items.push(`<span>${esc(F.ft == null ? T('lgWind10') : T('lgWindAt', { l: fmtLvl(F.ft) }))}</span>`);
    if (S.mapLevel === 'traj') items.push(`<span>${esc(T('lgTrajMap'))}</span>`);
    $('mapLegend').innerHTML = items.join('');
    $('mapSub').textContent = T('mapSub', {
      t: F.time ? fmtHM(F.time) : ''
    }) + (S.map?.__blank ? ` · ${T('mapBlankShort')}` : '');
  }

  function mapTip(lon, lat, pt) {
    const box = $('mapTip');
    if (!S.grid || !S.mapF || !box) return;
    const G = S.grid.g,
      [w, s, e, n] = G.bbox,
      gx = (lon - w) / (e - w) * (G.nx - 1),
      gy = (lat - s) / (n - s) * (G.ny - 1);
    if (gx < 0 || gy < 0 || gx > G.nx - 1 || gy > G.ny - 1) return box.style.display = 'none';
    const i = Math.min(G.nx - 2, Math.floor(gx)),
      j = Math.min(G.ny - 2, Math.floor(gy)),
      fx = gx - i,
      fy = gy - j,
      bil = arr => {
        const q = [arr[j * G.nx + i], arr[j * G.nx + i + 1], arr[(j + 1) * G.nx + i], arr[(j + 1) * G.nx + i + 1]];
        return q.some(v => v == null) ? null : q[0] * (1 - fx) * (1 - fy) + q[1] * fx * (1 - fy) + q[2] * (1 - fx) * fy + q[3] * fx * fy;
      },
      F = S.mapF;
    const t = bil(F.t),
      p = bil(F.p),
      cc = bil(F.cc);
    box.innerHTML = `<b>${lat.toFixed(2)}° ${lon.toFixed(2)}°</b> <span class="m">${F.ft == null ? esc(T('ground')) : fmtLvl(F.ft)}</span><br>` +
      `${fmtT(t)} · ${esc(T('clouds'))} ${fmtNum(cc)} %${p == null ? '' : ` · ${fmtNum(p, 1)} hPa`}`;
    box.style.display = 'block';
    box.style.left = `${Math.min(pt.x + 14, $('map').clientWidth - box.offsetWidth - 4)}px`;
    box.style.top = `${Math.max(0, pt.y - 40)}px`;
  }

  function mapLevelOptions() {
    const sel = $('mapLevel'),
      gridTop = A.paFt(S.grid.levels.at(-1)),
      known = new Set(S.grid.levels),
      readable = ft => A.bracketLevels([ft]).every(l => known.has(l)),
      opts = [
        ['sfc', T('mlSfc')],
        ['req', T('mlReq', {
          l: fmtLvl(S.levelFt)
        })],
        ...S.traj.steps.slice(1).filter(st => st.ft !== S.levelFt).map((st, k) => [`step:${k + 1}`, T('mlStep', {
          l: fmtLvl(st.ft),
          id: st.id
        })]),
        ['traj', T('mlTraj')],
        ...MAP_FIXED.filter(ft => ft <= gridTop && readable(ft)).map(ft => [`alt:${ft}`, fmtLvl(ft)])
      ];
    sel.replaceChildren(...opts.map(([v, t]) => new Option(t, v)));
    if (!opts.some(([v]) => v === S.mapLevel)) S.mapLevel = 'sfc';
    sel.value = S.mapLevel;
  }

  function fitMap() {
    if (!S.map || !S.flight) return;
    const lats = S.flight.points.map(p => p.lat),
      lons = S.flight.points.map(p => p.lon);
    S.map.fitBounds([
      [Math.min(...lons), Math.min(...lats)],
      [Math.max(...lons), Math.max(...lats)]
    ], {
      padding: 60,
      duration: 0,
      maxZoom: 8
    });
  }

  // ---------------------------------------------------------------- écran

  function select(i) {
    S.sel = clamp(i, 0, S.route.samples.length - 1);
    S.mapF = null;
    render(['xs', 'slice', 'table', 'map']);
  }

  function render(parts = ['kpi', 'xs', 'slice', 'table', 'wx', 'map']) {
    if (!S.traj || !alive) return;
    if (parts.includes('kpi')) kpis();
    if (parts.includes('xs')) {
      drawXs();
      xsLegend();
    }
    if (parts.includes('slice')) drawSlice();
    if (parts.includes('table')) table();
    if (parts.includes('wx')) aerodromeCards();
    if (parts.includes('map') && S.grid) {
      S.mapF = S.mapF || mapFields();
      drawMap();
      mapLegend();
    }
  }

  function status() {
    const f = S.flight,
      r = S.route,
      run = S.run ? ` · run ${fmtHM(S.run)}` : '',
      spentNow = Math.round((r?.weight || 0) + (S.grid?.weight || 0)),
      ac = f.aircraft ? [f.aircraft.type, f.aircraft.registration].filter(Boolean).join(' ') : '';
    $('source').textContent = S.data === 'demo' ? T('demoSrc') : `${S.model?.name || ''}${run}`;
    $('demoTag').classList.toggle('at-hidden', S.data !== 'demo');
    $('status').textContent = T('stFlight', {
        from: f.from
      }) + (ac ? ` · ${ac}` : '') + ` · ${f.dep} → ${f.arr}` + (f.altn ? ` (${T('altnShort', { id: f.altn })})` : '') +
      (f.updated ? ` · ${T('written', { d: new Date(f.updated).toLocaleString(lang()) })}` : '') +
      (r && S.data !== 'demo' ? ` · ${T('stPlaces', { r: r.samples.length, g: S.grid?.g.places.length || 0 })} · ` +
        (spentNow ? T('stSpent', {
          n: spentNow
        }) : T('stCached')) + ` · ${T('stDay', { n: Math.round(S.daySpent) })}` : '') +
      (S.outOfRange ? ` · ${T('outOfRange')}` : '');
  }

  function levelOptions(cur) {
    const sel = $('levelSel'),
      vals = new Set([cur]);
    for (let ft = 3000; ft <= 41000; ft += ft < 10000 ? 500 : 1000) vals.add(ft);
    sel.replaceChildren(...[...vals].filter(Boolean).sort((a, b) => a - b).map(ft => new Option(fmtLvl(ft), ft)));
    sel.value = cur;
  }

  /** Niveaux lus sur la route (jusqu'au haut de la coupe) et sur la grille (ceux qui encadrent les altitudes offertes). */
  const routeLevels = () => A.levelsUpTo(topFt());
  const gridLevels = () => A.bracketLevels(mapAltitudes(S.flight));

  /** Charge le vol puis la météo de la route, de la carte et des terrains. cacheOnly (ouverture, vol courant changé) :
   *  seulement ce que l'appareil garde, sans appel à Open-Meteo ni à avwx.rest ; sinon l'écran attend « Charger ». */
  async function load({
    cacheOnly = false
  } = {}) {
    // un chargement plus récent l'emporte : celui-ci s'arrête dès qu'il ne l'est plus
    const seq = load.seq = (load.seq || 0) + 1,
      stale = () => seq !== load.seq || !alive;
    try {
      S.data = $('dataSrc').value;
      if (S.data === 'demo') cacheOnly = false;
      $('status').textContent = T('readingFlight');
      const f = await readFlight();
      if (stale()) return;
      S.flight = f;
      // un niveau choisi dans l'écran l'emporte sur celui du vol (comme l'heure de départ)
      S.levelFt = $('levelSel').dataset.touched && +$('levelSel').value || f.levelFt || +$('levelSel').value || 10000;
      levelOptions(S.levelFt);
      S.cruiseKt = +$('cruiseKt').value || A.cruiseKtOf(f.text) || 200;
      $('cruiseKt').value = S.cruiseKt;
      if (f.when && !$('dep').dataset.touched) setDep(Date.parse(f.when) / 1000);
      S.depTime = depValue();
      const mid = f.points[Math.floor(f.points.length / 2)];
      S.model = A.modelFor(mid.lat, mid.lon);
      // un lieu tous les 50 NM, 24 au plus (comme Carburant) : l'échantillonnage tient le quota d'abord
      const smp = A.samples(f.points),
        levels = gridLevels(),
        gr = A.grid(f.points, +$('gridMax').value),
        rLevels = routeLevels(),
        rVars = varsOf(rLevels, A.ROUTE_LEVEL_VARS, A.ROUTE_SURFACE_VARS),
        gVars = varsOf(levels, A.GRID_LEVEL_VARS, A.GRID_SURFACE_VARS);
      $('status').textContent = S.data === 'demo' ? T('demoComputing') : T('reading', {
        m: S.model.name
      });
      // l'heure du run d'abord (fichier statique, gardé 10 min) : elle dit si la réserve a encore le dernier run
      S.run = S.data === 'demo' ? null : await W.run(S.model.id);
      if (stale()) return;
      // la grille de la carte (lourde) arrive après la route ; la coupe s'affiche sans l'attendre
      const gridP = forecast(gr.places, gVars, {
        cacheOnly,
        stale
      });
      gridP.catch(() => {});
      const [route, wx] = await Promise.all([
        forecast(smp, rVars, {
          cacheOnly,
          stale
        }),
        aerodromes(cacheOnly).catch(() => null)
      ]);
      if (stale()) return;
      S.daySpent = S.data === 'demo' ? 0 : await W.spent();
      if (!route) {
        // rien en réserve pour ce vol : rien n'est demandé tant que l'utilisateur ne charge pas
        const cells = new Set(smp.map(p => W.cellOf(p.lat, p.lon, S.model.id).id)).size,
          gcells = new Set(gr.places.map(p => W.cellOf(p.lat, p.lon, S.model.id).id)).size;
        $('status').textContent = T('notLoaded', {
          m: S.model.name,
          n: Math.round(callWeight(cells, rVars.length) + callWeight(gcells, gVars.length)),
          d: Math.round(S.daySpent)
        });
        return;
      }
      S.route = {
        samples: smp,
        locs: route.locs,
        levels: rLevels,
        weight: route.weight
      };
      S.grid = null;
      S.wx = wx;
      S.sel = 0;
      S.mapF = null;
      compute();
      status();
      render();
      $('mapSub').textContent = T('mapReading');
      initMap().then(fitMap);
      let grid;
      try {
        grid = await gridP;
      } catch (e) {
        if (!stale() && !e.stale) notify(T('mapUnreachable', {
          m: why(e)
        }), true);
        return;
      }
      if (stale()) return;
      if (!grid) return $('mapSub').textContent = T('mapLoad');
      S.grid = {
        g: gr,
        locs: grid.locs,
        levels,
        weight: grid.weight
      };
      S.daySpent = S.data === 'demo' ? 0 : await W.spent();
      mapLevelOptions();
      status();
      render(['map']);
    } catch (e) {
      if (stale() || e.stale) return;
      console.error(e);
      $('status').textContent = T('failed', {
        m: why(e)
      });
      notify(why(e), true);
    }
  }
  /** Raison d'un échec, dans les mots de l'écran. */
  const why = e => e.quota ? T('quotaDay', {
      n: e.spent
    }) : /limit exceeded/i.test(e.message) ? T('quotaIp') : e.offline ? T('offline') : e.incomplete ? T('incomplete') :
    e.message;

  // heure de départ (UTC) dans le champ datetime-local
  const pad = v => String(v).padStart(2, '0');

  function setDep(sec) {
    const d = new Date(sec * 1000);
    $('dep').value = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  }
  const depValue = () => {
    const v = $('dep').value;
    return v ? Date.parse(`${v}:00Z`) / 1000 : Math.ceil(Date.now() / 36e5) * 3600;
  };

  /** Boutons bascule des couches (aria-pressed) ; un seul fond à la fois dans la coupe. */
  function chips(box, layers, labels, onChange) {
    $(box).replaceChildren(...Object.entries(labels).map(([k, label]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = T(label);
      b.setAttribute('aria-pressed', String(!!layers[k]));
      b.onclick = () => {
        layers[k] = !layers[k];
        if (layers[k] && ['temp', 'rh', 'da'].includes(k))['temp', 'rh', 'da'].filter(x => x !== k).forEach(x => layers[x] =
          false);
        chips(box, layers, labels, onChange);
        saveUi();
        onChange();
      };
      return b;
    }));
  }

  /** Réglages de l'écran gardés sur l'appareil (cache/atmosphere/ui.json), écrits seulement s'ils changent. */
  let uiText = '';

  function saveUi() {
    const v = {
        src: $('flightSrc').value,
        text: $('routeText').value,
        grid: $('gridMax').value,
        xs: S.xsLayers,
        map: S.mapLayers
      },
      s = JSON.stringify(v);
    if (s === uiText) return;
    uiText = s;
    data.put(UI, v).catch(() => {});
  }

  // ---------------------------------------------------------------- départ
  setDep(Math.ceil(Date.now() / 36e5) * 3600);
  levelOptions(27000);
  const ui = await data.get(UI).catch(() => null),
    rec = await data.get(flightPath).catch(() => null);
  if (!alive) return;
  uiText = ui ? JSON.stringify(ui) : '';
  Object.assign(S.xsLayers, ui?.xs || {});
  Object.assign(S.mapLayers, ui?.map || {});
  $('routeText').value = ui?.text || ROUTE_TEXT;
  if (ui?.grid) $('gridMax').value = ui.grid;
  // le vol courant d'abord quand il y en a un ; sinon le dernier choix, ou l'exemple
  $('flightSrc').value = rec?.route?.points?.length >= 2 ? (ui?.src || 'current') : ui?.src && ui.src !== 'current' ? ui.src : 'example';
  const showSrc = () => {
    const v = $('flightSrc').value;
    $('fileBox').classList.toggle('at-hidden', v !== 'file');
    $('textBox').classList.toggle('at-hidden', v !== 'text');
  };
  $('flightSrc').onchange = () => {
    showSrc();
    saveUi();
  };
  $('routeText').onchange = saveUi;
  $('gridMax').onchange = saveUi;
  showSrc();
  if (ctx.query?.donnees === 'demo' || ctx.query?.data === 'demo') $('dataSrc').value = 'demo';
  $('form').onsubmit = e => {
    e.preventDefault();
    load();
  };
  // heure, niveau, vitesse : recalcul sans relire la prévision (sauf un niveau que la route ou la grille n'a pas encore :
  // seules ses variables sont demandées)
  const recompute = () => {
    if (!S.route) return;
    S.depTime = depValue();
    S.levelFt = +$('levelSel').value;
    S.cruiseKt = +$('cruiseKt').value || S.cruiseKt;
    if (!routeLevels().every(l => S.route.levels.includes(l)) || S.grid && !gridLevels().every(l => S.grid.levels.includes(l)))
      return load();
    S.mapF = null;
    compute();
    if (S.grid) mapLevelOptions();
    status();
    render();
  };
  $('dep').onchange = () => {
    $('dep').dataset.touched = '1';
    recompute();
  };
  $('levelSel').onchange = () => {
    $('levelSel').dataset.touched = '1';
    recompute();
  };
  $('cruiseKt').onchange = recompute;
  chips('xsLayers', S.xsLayers, {
    cloud: 'lyCloud',
    iso: 'lyIso',
    inv: 'lyInv',
    ice: 'lyIce',
    wind: 'lyWind',
    cu: 'lyCu',
    temp: 'lyTemp',
    rh: 'lyRh',
    da: 'lyDa'
  }, () => render(['xs']));
  chips('mapLayers', S.mapLayers, {
    isobar: 'lyIsobar',
    isotherm: 'lyIso',
    cloud: 'lyCloud',
    wind: 'lyWind',
    tfill: 'lyTemp'
  }, () => render(['map']));
  $('mapLevel').onchange = () => {
    S.mapLevel = $('mapLevel').value;
    S.mapF = null;
    render(['map']);
  };
  const xs = $('xs');
  xs.onmousemove = xsTip;
  xs.onmouseleave = () => $('xsTip').style.display = 'none';
  xs.onclick = ev => {
    if (!S.xsGeo) return;
    const nm = S.xsGeo.nmOf(ev.clientX - xs.getBoundingClientRect().left);
    let k = 0;
    S.route.samples.forEach((s, j) => Math.abs(s.nm - nm) < Math.abs(S.route.samples[k].nm - nm) && (k = j));
    select(k);
  };
  $('sd').onmousemove = sdTip;
  $('sd').onmouseleave = () => $('sdTip').style.display = 'none';
  $('slicePrev').onclick = () => select(S.sel - 1);
  $('sliceNext').onclick = () => select(S.sel + 1);
  $('tbl').onclick = ev => {
    const tr = ev.target.closest('tr[data-i]');
    if (tr) select(+tr.dataset.i);
  };
  $('map').onmouseleave = () => $('mapTip').style.display = 'none';
  // redessin à la taille du bloc, et au changement de design ou de ton (réaction à un événement : rien n'est réécrit)
  let w0 = 0;
  const ro = new ResizeObserver(() => {
    const w = el.clientWidth;
    if (w === w0) return;
    w0 = w;
    render(['xs', 'slice', 'map']);
  });
  ro.observe(el);
  const repaint = () => {
    colors.clear();
    render(['xs', 'slice', 'map']);
  };
  const mo = new MutationObserver(repaint);
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-design', 'data-tone']
  });
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', repaint);
  // vol courant changé (Carburant, Carte, un autre appareil) : relu, la prévision seulement depuis la réserve
  const sig = r => JSON.stringify([r?.route?.points, r?.level, r?.profile, r?.weather?.when]);
  let lastSig = sig(rec);
  const unwatch = data.watch(flightPath, async () => {
    if ($('flightSrc').value !== 'current') return;
    const r = await data.get(flightPath);
    if (sig(r) === lastSig) return;
    lastSig = sig(r);
    load({
      cacheOnly: true
    });
  });
  stop = () => {
    alive = false;
    ro.disconnect();
    mo.disconnect();
    mq.removeEventListener('change', repaint);
    unwatch?.();
    S.map?.remove();
    S.map = null;
  };
  // à l'ouverture, seulement la réserve de l'appareil : Open-Meteo n'est lu que sur « Charger »
  load({
    cacheOnly: true
  });
}

export function unmount() {
  stop?.();
  stop = null;
}
