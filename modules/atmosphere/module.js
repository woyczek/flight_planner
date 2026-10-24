// Module V3 « Atmosphère » (SPEC.md, INTEGRATION.md, DECISIONS.md) : l'atmosphère le long du vol courant, sur le gabarit
// du module Carte — vue fixe plein cadre (meta.fixed) : une ligne d'outils, la carte en haut, le bloc du bas (profil global
// le long de la route ; tranche locale au toucher de la carte ou de la coupe ; « i » : résumé, terrains, tableau ;
// « Vol » : réglages). Chaque lieu de la route est lu à l'heure où le vol y passe (départ + temps estimé sans vent).
//   · carte : la technique du module Carte, mise en commun — fond MapLibre (ses styles, sa bibliothèque), surcouche
//     vectorielle sur un canvas redessiné à chaque image du mouvement (map.project), géométrie calculée une fois par jeu
//     de données (champs en images lissées, isobares et isothermes en segments lon / lat, vents, route) ; sans tuiles,
//     le fond uni de la Carte ; le socle (MapLibre, styles, attente des tuiles, taille, fond uni) est celui de la Carte,
//     modules/maps/lib/map_base.js ;
//   · vol : pilot/<trigramme>/current_flight.json par ctx.data (schéma 1, lecture seule), l'exemple du schéma, un fichier,
//     ou un texte de route (noms résolus par ctx.aerodb.coords) ;
//   · prévisions : la réserve météo partagée (weather_store.js, cache/weather/<modèle>/<case>/<jour>.json), qui n'appelle
//     Open-Meteo par ctx.net que pour ce qui manque ; à l'ouverture, rien n'est demandé : « Charger » lit ce qui manque ;
//   · METAR (metar.vatsim.net) et TAF (avwx.rest, clé de l'appareil ajoutée par le cadre) par ctx.net ;
//   · coupe et tranche : rendus SVG purs de section.js (champs lissés, traits vectoriels) ; textes en quatre langues.

import * as A from './atmo.js';
import * as Demo from './demo.js';
import {
  weatherStore,
  callWeight
} from './weather_store.js';
import {
  sectionSvg,
  soundingSvg,
  sectionModel,
  sectionPlaces,
  sectionVars,
  topFtOf,
  diverging
} from './section.js';
import {
  svg
} from '../../frame/lib/icons.js';
// socle de carte du module Carte, partagé (modules/maps/INTEGRATION.md § 7)
import {
  styleFor,
  startTiles as startMapTiles,
  mapSize,
  isOwnResize,
  loadRender,
  loadOutlines,
  plainView,
  drawPlain
} from '../maps/lib/map_base.js';
// feuille à trois positions : primitive du cadre (frame/INTEGRATION.md § 11)
import {
  createSheet
} from '../../frame/lib/sheet.js';
import {
  TX
} from './texts.js';
import {
  worldReader,
  worldGrid,
  worldAt,
  stepAt
} from './world.js';
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
  level: 1,
  // vue fixe plein cadre (frame/INTEGRATION.md § 9.2) : carte en haut, bloc de données en bas, pas de défilement de page
  fixed: true,
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
  files: ['atmo.js?v=0', 'demo.js?v=0', 'weather_store.js?v=0', 'world.js?v=0', 'section.js?v=0', 'texts.js?v=0',
    '../maps/lib/map_base.js?v=0',
    '../../frame/lib/sheet.js?v=0', '../fuel/winds.js?v=0', '../fuel/weather.js?v=0', '../maps/render.js?v=0',
    '../../frame/lib/route_text.js?v=0', '../../frame/lib/metar.js?v=0', '../../frame/lib/icons.js?v=0'
  ],
  // du module Carte, gardés au premier usage : MapLibre, et les contours des pays du fond uni
  lazy: ['../maps/lib/maplibre-gl.js?v=0', '../maps/lib/maplibre-gl.css?v=0', '../maps/lib/outlines.js?v=0'],
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
/** Attente des tuiles avant le fond uni (ms). */
const TILE_WAIT = 8000;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const R = Math.PI / 180;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

/** Barbule de vent (hémisphère nord) sur un canvas : hampe vers le lit du vent, plumes à droite ; fanion 50 kt, plume 10,
 *  demi 5. */
function barb(c, x, y, dir, kt, len = 20, color = '#333') {
  c.save();
  c.strokeStyle = c.fillStyle = color;
  c.lineWidth = 1.3;
  if (kt == null || dir == null) return c.restore();
  if (kt < 2.5) {
    c.beginPath();
    c.arc(x, y, 3, 0, 2 * Math.PI);
    c.stroke();
    return c.restore();
  }
  const a = dir * R,
    ux = Math.sin(a),
    uy = -Math.cos(a),
    px = Math.sin(a + Math.PI / 2),
    py = -Math.cos(a + Math.PI / 2),
    ex = x + ux * len,
    ey = y + uy * len,
    step = 4,
    fl = len * 0.45;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(ex, ey);
  c.stroke();
  let n = Math.round(kt / 5) * 5,
    pos = 0;
  while (n >= 50) {
    const bx = ex - ux * pos,
      by = ey - uy * pos;
    c.beginPath();
    c.moveTo(bx, by);
    c.lineTo(bx + px * fl - ux * 2, by + py * fl - uy * 2);
    c.lineTo(bx - ux * step * 1.4, by - uy * step * 1.4);
    c.fill();
    pos += step * 1.8;
    n -= 50;
  }
  while (n >= 10) {
    const bx = ex - ux * pos,
      by = ey - uy * pos;
    c.beginPath();
    c.moveTo(bx, by);
    c.lineTo(bx + px * fl + ux * 3, by + py * fl + uy * 3);
    c.stroke();
    pos += step;
    n -= 10;
  }
  if (n >= 5) {
    if (pos === 0) pos = step;
    const bx = ex - ux * pos,
      by = ey - uy * pos;
    c.beginPath();
    c.moveTo(bx, by);
    c.lineTo(bx + px * fl * 0.5 + ux * 1.5, by + py * fl * 0.5 + uy * 1.5);
    c.stroke();
  }
  c.restore();
}

/** Image (canvas détaché) d'une grille nx × ny rangée du bas vers le haut ; rgbaOf(k) → [r, g, b, a] ou null. Dessinée
 *  agrandie et lissée sur l'emprise de la grille. */
function fieldCanvas(nx, ny, rgbaOf) {
  const cv = document.createElement('canvas');
  cv.width = nx;
  cv.height = ny;
  const g = cv.getContext('2d'),
    img = g.createImageData(nx, ny);
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const v = rgbaOf(j * nx + i),
        o = ((ny - 1 - j) * nx + i) * 4;
      if (!v) continue;
      img.data.set(v, o);
    }
  g.putImageData(img, 0, 0);
  return cv;
}

// styles : jetons du cadre (--sog-*), classes préfixées « at- » sous [data-module="atmosphere"] ; gabarit du module Carte
// (vue fixe : la carte prend ce que le bloc du bas laisse, le bloc défile dedans)
const STYLE = `
[data-module="atmosphere"]{--at-computed:var(--sog-chart-1);--at-planned:var(--sog-chart-4);--at-requested:var(--sog-chart-3);--at-inv:var(--sog-chart-2);--at-ice:var(--sog-chart-5);--at-terrain:color-mix(in srgb,var(--sog-chart-6) 55%,var(--sog-chart-bg))}
[data-module="atmosphere"] .at-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
[data-module="atmosphere"] .at-box{position:relative;flex:1 1 0;min-height:0;overflow:hidden;background:var(--sog-chart-grid);isolation:isolate}
[data-module="atmosphere"]~.f-overlay .at-lvl{position:relative;flex:none;display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:44px;height:44px;box-sizing:border-box;padding:0 12px 0 14px;border:1px solid var(--sog-border);border-radius:min(22px,calc(var(--sog-radius) * 22));background:color-mix(in srgb,var(--sog-surface) 92%,transparent);color:var(--sog-fg);box-shadow:0 2px 8px #0000002e;font-weight:600;font-size:14px;font-variant-numeric:tabular-nums;white-space:nowrap;pointer-events:auto;touch-action:manipulation;cursor:pointer}
[data-module="atmosphere"]~.f-overlay .at-lvl[hidden]{display:none}
[data-module="atmosphere"]~.f-overlay .at-lvl>span[aria-hidden]{font-size:10px;color:var(--sog-muted)}
[data-module="atmosphere"]~.f-overlay .at-lvl select{position:absolute;inset:0;width:100%;height:100%;opacity:0;font-size:16px;cursor:pointer;margin:0}
[data-module="atmosphere"]~.f-overlay .at-lvl:focus-within{outline:2px solid var(--sog-accent);outline-offset:2px}
[data-module="atmosphere"]~.f-overlay button.f-ov-btn.at-load{color:var(--sog-accent)}
[data-module="atmosphere"] .f-sheet-grip .f-badge{flex:none;margin-right:6px}
[data-module="atmosphere"] .at-map{position:absolute;inset:0;touch-action:none}
[data-module="atmosphere"] :is(button,select,input,label){touch-action:manipulation}
[data-module="atmosphere"] canvas.at-over{position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none}
[data-module="atmosphere"] .at-box.at-flat canvas.at-over{pointer-events:auto}
[data-module="atmosphere"] .at-layers{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0 16px;font-size:.92em}
[data-module="atmosphere"] .at-layers>div{display:flex;flex-direction:column;min-width:0}
[data-module="atmosphere"] .at-layers b{margin:2px 0}
[data-module="atmosphere"] .at-layers label{display:flex;gap:8px;align-items:center;min-height:36px}
[data-module="atmosphere"] .at-layers .at-key{width:22px;flex:none;display:inline-block;height:0;border-top:2px solid currentColor}
[data-module="atmosphere"] .at-layers .at-ramp{width:22px;height:9px;border-radius:2px;flex:none;display:inline-block}
[data-module="atmosphere"] .at-layers>p{grid-column:1/-1;margin:6px 0 0;font-size:.9em;color:var(--sog-muted)}
[data-module="atmosphere"] .at-layers>p.at-mapnote{margin:0 0 4px;color:var(--sog-fg)}
[data-module="atmosphere"] .at-maptip{position:absolute;z-index:6;pointer-events:none;background:var(--sog-chart-bg);color:var(--sog-fg);border:1px solid var(--sog-border);border-radius:var(--sog-radius-s,6px);padding:5px 7px;font-size:12px;line-height:1.35;box-shadow:var(--sog-shadow);white-space:nowrap;display:none;font-variant-numeric:tabular-nums}
[data-module="atmosphere"] .f-sheet-panel{container-type:inline-size}
[data-module="atmosphere"] .f-sheet-head>button:not(.f-sheet-grip):not(.f-sheet-close){flex:none;min-height:0;height:100%;min-width:var(--sog-touch,44px);padding:0 8px;border:0;border-radius:0;background:none}
[data-module="atmosphere"] .f-sheet-body.at-dbody{position:relative}
[data-module="atmosphere"] .f-sheet-body.at-dbody.at-plot{overflow:hidden}
[data-module="atmosphere"] .at-tip{position:absolute;pointer-events:none;background:var(--sog-chart-bg);color:var(--sog-fg);border:1px solid var(--sog-border);border-radius:var(--sog-radius-s,6px);padding:6px 8px;font-size:12px;line-height:1.4;box-shadow:var(--sog-shadow);white-space:nowrap;z-index:5;display:none;font-variant-numeric:tabular-nums}
[data-module="atmosphere"] .at-tip .m,[data-module="atmosphere"] .at-maptip .m{color:var(--sog-muted)}
[data-module="atmosphere"] .at-sd{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.8fr);gap:8px;height:100%}
[data-module="atmosphere"] .at-sd .at-plotbox{position:relative;min-width:0;min-height:0}
[data-module="atmosphere"] .at-slice-info{font-size:12.5px;display:grid;gap:2px;align-content:start;overflow:auto;padding:4px 8px 8px 0}
[data-module="atmosphere"] .at-slice-info .m{color:var(--sog-muted)}
@container (max-width:560px){[data-module="atmosphere"] .at-sd{grid-template-columns:1fr}[data-module="atmosphere"] .at-slice-info{display:none}}
[data-module="atmosphere"] .at-pad{padding:8px}
[data-module="atmosphere"] .at-go{display:flex;flex-wrap:wrap;gap:8px;padding-top:0}
[data-module="atmosphere"] .at-kv{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:0 20px;margin:0}
[data-module="atmosphere"] .at-kv>div{display:grid;grid-template-columns:8.5em auto minmax(0,1fr);align-items:baseline;gap:8px;padding:4px 0;border-bottom:1px solid var(--sog-border);font-size:13px}
[data-module="atmosphere"] .at-kv dt{color:var(--sog-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-module="atmosphere"] .at-kv dd{margin:0;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
[data-module="atmosphere"] .at-kv dd+dd{font-weight:400;color:var(--sog-muted);font-size:12px;overflow:hidden;text-overflow:ellipsis}
[data-module="atmosphere"] .at-pad h3{margin:14px 0 6px}
[data-module="atmosphere"] .f-table tr.wp td{font-weight:600}
[data-module="atmosphere"] .f-table tr.sel td{background:color-mix(in srgb,var(--sog-accent) 14%,transparent)}
[data-module="atmosphere"] .f-table tbody tr{cursor:pointer}
[data-module="atmosphere"] .at-flag{display:inline-block;font-size:11px;padding:0 6px;border-radius:4px;border:1px solid var(--sog-border)}
[data-module="atmosphere"] .at-flag.ice2{border-color:var(--at-ice);color:var(--at-ice)}
[data-module="atmosphere"] .at-flag.ice1{border-color:var(--sog-warn)}
[data-module="atmosphere"] .at-flag.inv{border-color:var(--at-inv);color:var(--at-inv)}
[data-module="atmosphere"] .at-wx{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:8px}
[data-module="atmosphere"] .at-st{border:1px solid var(--sog-border);border-radius:var(--sog-radius-s,6px);padding:8px 10px}
[data-module="atmosphere"] .at-st .id{font-weight:600}
[data-module="atmosphere"] .at-cat{font-size:11px;font-weight:600;padding:1px 6px;border-radius:4px;color:#fff}
[data-module="atmosphere"] .at-cat.VFR{background:#0ca30c}
[data-module="atmosphere"] .at-cat.MVFR{background:#2a78d6}
[data-module="atmosphere"] .at-cat.IFR{background:#d03b3b}
[data-module="atmosphere"] .at-cat.LIFR{background:#a0329a}
[data-module="atmosphere"] .at-raw{font:12px/1.4 ui-monospace,monospace;color:var(--sog-muted);white-space:pre-wrap;margin-top:4px}
[data-module="atmosphere"] .at-form textarea{font:13px/1.4 ui-monospace,monospace;min-height:80px}
[data-module="atmosphere"] .at-foot{font-size:12px;color:var(--sog-muted);margin:10px 0 0}
[data-module="atmosphere"] .at-hidden{display:none!important}
`;

let stop = null;
/** Position de la feuille gardée d'un montage à l'autre dans la même page (la primitive n'en garde pas). */
let sheetKeep = 'default';
/** L'indice « toucher la carte » est donné une fois par page. */
let tapNoted = false;

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
    }),
    readWorld = worldReader({
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
    geo: null,
    daySpent: 0,
    // bloc du bas : 'profile' (coupe globale), 'slice' (tranche locale), 'info' (« i »), 'settings' (« Vol »)
    view: 'profile',
    // tranche locale : { kind: 'route', i, lat, lon } (un lieu de lecture) ou { kind: 'point', lat, lon, col, nm, t, offNm }
    local: null,
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
  const cloudRgb = () => triplet(tok('--sog-muted'));
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
  /** Écrit un texte seulement s'il change. */
  const setText = (node, s) => {
    if (node && node.textContent !== s) node.textContent = s;
  };
  /** Écrit un attribut seulement s'il change. */
  const setAttr = (node, k, v) => {
    if (node.getAttribute(k) !== v) node.setAttribute(k, v);
  };

  // ---------------------------------------------------------------- écran
  el.innerHTML = `<style>${STYLE}</style>
<h1 class="at-sr">${esc(T('srTitle'))}</h1>
<div class="at-box" data-at="box">
  <div class="at-map" data-at="map"></div><canvas class="at-over" data-at="over" aria-hidden="true"></canvas>
  <div class="at-maptip" data-at="mapTip"></div>
</div>
<section class="f-sheet-panel" data-at="data">
  <div class="f-sheet-head"><button type="button" class="f-sheet-grip" data-at="grip"><span class="f-badge at-hidden" data-kind="warn" data-at="srcTag"></span><b class="f-sheet-title" data-at="dtitle"></b></button>
    <button type="button" data-at="prev" aria-label="${esc(T('slicePrev'))}" hidden>◀</button>
    <button type="button" data-at="next" aria-label="${esc(T('sliceNext'))}" hidden>▶</button>
    <button type="button" class="f-sheet-close" data-at="dclose" aria-label="${esc(T('backProfile'))}" title="${esc(T('backProfile'))}" hidden>✕</button></div>
  <div class="f-sheet-body at-dbody" data-at="dbody"></div>
</section>`;
  el.classList.add('f-sheet');
  // boutons sur la carte, dans la couche du cadre (frame/INTEGRATION.md § 9.3) : Couches à gauche ; Vol, i, Charger et la
  // puce d'altitude à droite (le plein écran y est ajouté par le cadre, en dernier)
  const ov = ctx.overlay;
  ov.over($('box'));
  const btnLayers = ov.button({
      icon: 'layers',
      label: T('layers'),
      pressed: false,
      side: 'left',
      onClick: () => show(S.view === 'layers' ? 'profile' : 'layers')
    }),
    btnFlight = ov.button({
      icon: 'plane',
      label: T('flightTitle'),
      pressed: false,
      onClick: () => show(S.view === 'settings' ? 'profile' : 'settings')
    }),
    btnInfo = ov.button({
      icon: 'list',
      label: T('infoTitle'),
      pressed: false,
      onClick: () => show(S.view === 'info' ? 'profile' : 'info')
    }),
    btnLoad = ov.button({
      icon: 'download',
      label: T('load'),
      onClick: () => load()
    });
  btnLoad.classList.add('at-load');
  // la puce d'altitude : le niveau en bref, la liste native du système par-dessus (invisible) pour choisir
  const lvlChip = document.createElement('label');
  lvlChip.className = 'at-lvl';
  lvlChip.title = T('mapLevelAria');
  lvlChip.innerHTML = `<span></span><span aria-hidden="true">▾</span><select aria-label="${esc(T('mapLevelAria'))}"></select>`;
  lvlChip.hidden = true; // rien à choisir avant la grille de la carte
  const lvlText = lvlChip.firstChild,
    lvlSel = lvlChip.querySelector('select');
  ov.right.insertBefore(lvlChip, btnLoad.nextSibling);
  probe.style.display = 'none';
  el.append(probe);
  // les couches de la carte et du profil : un contenu du bloc du bas (la carte reste visible), construit à son ouverture
  const layersBox = document.createElement('div');
  layersBox.className = 'at-layers at-pad';
  layersBox.setAttribute('role', 'group');
  layersBox.setAttribute('aria-label', T('layers'));
  // le formulaire « Vol » est construit une fois et gardé (les champs gardent leur saisie d'un affichage à l'autre)
  const form = document.createElement('form');
  form.className = 'f-grid at-form at-pad';
  form.style.setProperty('--f-min', '160px');
  form.innerHTML = `<label class="f-field">${esc(T('flight'))}<select data-at="flightSrc">
      <option value="current">${esc(T('srcCurrent', { tri }))}</option>
      <option value="example">${esc(T('srcExample'))}</option>
      <option value="file">${esc(T('srcFile'))}</option>
      <option value="text">${esc(T('srcText'))}</option></select></label>
    <label class="f-field at-hidden" data-at="fileBox">${esc(T('file'))}<input type="file" data-at="file" accept=".json,application/json"></label>
    <label class="f-field f-full at-hidden" data-at="textBox">${esc(T('routeHint'))}<textarea data-at="routeText" spellcheck="false" rows="3"></textarea></label>
    <label class="f-field">${esc(T('depUtc'))}<input type="datetime-local" data-at="dep"></label>
    <label class="f-field">${esc(T('levelReq'))}<select data-at="levelSel"></select></label>
    <label class="f-field">${esc(T('cruiseKt'))}<input type="number" data-at="cruiseKt" min="60" max="600" step="5"></label>
    <label class="f-field">${esc(T('dataSrc'))}<select data-at="dataSrc">
      <option value="live">${esc(T('dataLive'))}</option><option value="demo">${esc(T('dataDemo'))}</option></select></label>
    <label class="f-field">${esc(T('gridSize'))}<select data-at="gridMax">
      <option value="35">${esc(T('grid35'))}</option><option value="48" selected>${esc(T('grid48'))}</option>
      <option value="96">${esc(T('grid96'))}</option></select></label>
    <button class="primary" type="submit">${esc(T('load'))}</button>
    <p class="at-foot f-full" data-at="status" role="status"></p>`;
  const $f = k => form.querySelector(`[data-at="${k}"]`);

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
      points: A.unwrapLons(pts),
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
    let firstAlt = 0;
    for (const t of toks) {
      if (t.kind === 'group' && t.alt_ft) firstAlt = firstAlt || t.alt_ft;
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
      points: A.unwrapLons(pts),
      levelFt: firstAlt,
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
    const src = $f('flightSrc').value;
    if (src === 'example') return fromRecord(EXAMPLE, T('fromExample'));
    if (src === 'text') return fromText($f('routeText').value);
    if (src === 'file') {
      const f = $f('file').files?.[0];
      if (!f) throw new Error(T('errFile'));
      return fromRecord(JSON.parse(await f.text()), f.name);
    }
    const rec = await data.get(flightPath);
    // la démonstration hors ligne sans vol courant : l'exemple, marqué « Démo »
    if (!rec?.route?.points?.length && S.data === 'demo') return fromRecord(EXAMPLE, T('fromExample'));
    if (!rec?.route?.points?.length) throw Object.assign(new Error(T('noFlight')), {
      noFlight: true
    });
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
      onWait: s => setStatus(T('waitQuota', {
        s
      }))
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

  /** Altitude haute de la coupe (ft). */
  const topFt = () => topFtOf(S.levelFt, S.flight.points);
  /** Modèle de la coupe (section.js : calcul pur, le même que celui offert à la Carte). */
  let model = null;
  const sampleAt = (nm, ft) => model.sampleAt(nm, ft);

  function compute() {
    model = sectionModel({
      points: S.flight.points,
      levelFt: S.levelFt,
      profile: S.flight.profile,
      profileLevelFt: S.flight.levelFt,
      depTime: S.depTime,
      cruiseKt: S.cruiseKt,
      samples: S.route.samples,
      locs: S.route.locs
    });
    S.route.samples = model.samples;
    S.traj = model.traj;
    S.cols = model.cols;
    S.field = model.field;
    S.along = model.along;
    S.outOfRange = model.outOfRange;
    S.sel = clamp(S.sel, 0, S.route.samples.length - 1);
  }

  // ---------------------------------------------------------------- bloc du bas

  const dbody = $('dbody');

  /** Affiche un contenu du bloc : profil (défaut), tranche locale, détails, réglages, couches. */
  function show(view) {
    if (S.view !== view && sheet?.pos === 'collapsed') sheet.set('default', true);
    S.view = view;
    setAttr(btnFlight, 'aria-pressed', String(view === 'settings'));
    setAttr(btnInfo, 'aria-pressed', String(view === 'info'));
    setAttr(btnLayers, 'aria-pressed', String(view === 'layers'));
    $('dclose').hidden = view === 'profile';
    $('prev').hidden = $('next').hidden = !(view === 'slice' && S.local?.kind === 'route');
    dbody.classList.toggle('at-plot', view === 'profile' || view === 'slice');
    drawData();
    schedule();
  }

  function drawData() {
    if (!alive) return;
    const v = S.view;
    if (v === 'settings') {
      sheetTitle(T('flightTitle'));
      if (form.parentNode !== dbody) dbody.replaceChildren(form);
      return;
    }
    if (v === 'wpoint') return drawWorldPoint();
    if (v === 'layers') {
      sheetTitle(T('layers'));
      layersCard();
      if (layersBox.parentNode !== dbody) dbody.replaceChildren(layersBox);
      return;
    }
    if (!S.traj) {
      baseTitle();
      const p = document.createElement('p');
      p.className = 'at-pad f-muted';
      p.textContent = $f('status').textContent || T('readingFlight');
      if (S.noFlight) {
        const go = document.createElement('div');
        go.className = 'at-pad at-go';
        go.innerHTML = `<a class="f-btn primary" href="#fuel">${esc(T('goFuel'))}</a><button type="button" class="f-btn" data-at="seeExample">${esc(T('seeExample'))}</button>`;
        go.lastChild.onclick = () => {
          $f('flightSrc').value = 'example';
          $f('flightSrc').onchange();
          // comme à l'ouverture : la réserve seulement, rien n'est demandé avant « Charger »
          load({
            cacheOnly: true
          });
        };
        dbody.replaceChildren(p, go);
      } else dbody.replaceChildren(p);
      return;
    }
    // feuille réduite : rien à dessiner (redessiné à sa réouverture, la taille n'étant plus celle du dernier dessin)
    if (sheet?.pos === 'collapsed' && (v === 'profile' || v === 'slice')) return;
    if (v === 'profile') return drawProfile();
    if (v === 'slice') return drawSlice();
    if (v === 'info') return drawInfo();
  }

  /** Coupe globale le long de la route, à la taille du bloc ; un toucher ouvre la tranche du lieu de lecture le plus proche. */
  function drawProfile() {
    baseTitle();
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
      cloudRgb: cloudRgb(),
      dark: dark(),
      labels: {
        strips: [T('stLow'), T('stMid'), T('stHigh'), T('stPrecip'), T('stVis')]
      }
    });
    S.xsGeo = r.geo;
    S.drawn = `${dbody.clientWidth}x${dbody.clientHeight}`;
    dbody.innerHTML = r.svg + '<div class="at-tip" data-at="xsTip"></div>';
    const svg = dbody.firstChild;
    svg.onpointermove = xsTip;
    svg.onpointerleave = () => $('xsTip').style.display = 'none';
    svg.onclick = ev => {
      const nm = S.xsGeo.nmOf(ev.clientX - svg.getBoundingClientRect().left);
      let k = 0;
      S.route.samples.forEach((s, j) => Math.abs(s.nm - nm) < Math.abs(S.route.samples[k].nm - nm) && (k = j));
      openRouteSlice(k);
    };
  }

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
        `ρ ${fmtNum(v.rho, 3)} kg/m³ · ${esc(T('da'))} ${fmtLvl(v.daFt)}` + (ice ? `<br><b style="color:var(--at-ice)">${esc(T('icing'))} ${esc(iceText(ice))}</b>` : '');
    }
    tip.innerHTML = html;
    tip.style.display = 'block';
    const tw = tip.offsetWidth;
    tip.style.left = `${x + 14 + tw > rect.width ? x - tw - 14 : x + 14}px`;
    tip.style.top = `${clamp(y - 20, 0, rect.height - tip.offsetHeight)}px`;
  }

  /** Tranche d'un lieu de lecture de la route (coupe touchée, ◀ ▶, ligne du tableau). */
  function openRouteSlice(i) {
    S.sel = clamp(i, 0, S.route.samples.length - 1);
    const s = S.route.samples[S.sel];
    S.local = {
      kind: 'route',
      i: S.sel,
      lat: s.lat,
      lon: s.lon
    };
    S.mapF = null;
    show('slice');
  }

  /** Tranche locale à un point touché sur la carte : la colonne de sa case (réserve, sinon Open-Meteo : un lieu), à l'heure
   *  où le vol passe au plus près ; le niveau du vol à cette distance. */
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
      seq = (openPointSlice.seq || 0) + 1;
    openPointSlice.seq = seq;
    S.local = {
      kind: 'point',
      lat,
      lon,
      nm: best.nm,
      t,
      offNm: Math.sqrt(bd) * 60,
      col: null
    };
    S.mapF = null;
    show('slice');
    try {
      const r = await forecast([{
        lat,
        lon
      }], varsOf(A.levelsUpTo(topFt()), A.ROUTE_LEVEL_VARS, A.ROUTE_SURFACE_VARS), {
        cacheOnly: false,
        stale: () => !alive || openPointSlice.seq !== seq
      });
      if (!alive || openPointSlice.seq !== seq || S.local?.kind !== 'point') return;
      const loc = r.locs[0];
      S.local.col = A.column(loc, A.hourIndex(loc.times, t));
      if (r.weight) {
        S.daySpent = await W.spent();
        status();
      }
      if (S.view === 'slice') drawData();
    } catch (e) {
      if (e.stale) return;
      notify(why(e), true);
    }
  }

  function drawSlice() {
    const L = S.local;
    if (!L) return show('profile');
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
    sheetTitle(head);
    if (!col) {
      const p = document.createElement('p');
      p.className = 'at-pad f-muted';
      p.textContent = T('sliceLoading');
      dbody.replaceChildren(p);
      return;
    }
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
        cloudRgb: cloudRgb(),
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
    // lecture
    const ft = S.traj.computed(nm),
      x = A.at(col, ft),
      p = A.posAt(S.flight.points, S.traj.nmOf, nm),
      comp = x && !x.below ? A.windComponents(x.dirDeg, x.kt, p.track) : null,
      inv = A.inversions(col),
      zeros = A.zeroIsotherms(col),
      cu = A.cumulusBaseFt(col),
      sf = col.sfc;
    const rows = [
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
    wrap.lastChild.replaceChildren(...rows.map(([k, v]) => {
      const d = document.createElement('div');
      d.innerHTML = '<span class="m"></span> ';
      d.firstChild.textContent = ctx.t(['{k} :', '{k}:', '{k}:', '{k}:'], {
        k
      });
      d.append(v);
      return d;
    }));
  }

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

  /** « i » : résumé, terrains, tableau le long de la trajectoire, sources ; défile dans le bloc. */
  function drawInfo() {
    baseTitle();
    const box = document.createElement('div');
    box.className = 'at-pad';
    box.innerHTML = `<dl class="at-kv">${kpis().map(([k, v, n]) => `<div><dt title="${esc(k)}">${esc(k)}</dt><dd>${esc(v)}</dd><dd title="${esc(n)}">${esc(n)}</dd></div>`).join('')}</dl>
      <h3>${esc(T('wxTitle'))} <span class="f-muted" style="font-weight:400;font-size:.85em">${esc(S.wx?.note || '')}</span></h3><div class="at-wx">${aerodromeCards()}</div>
      <h3>${esc(T('tblTitle'))}</h3><p class="f-muted" style="margin:0 0 4px">${esc(T('tblSub'))}</p>
      <div class="f-scroll"><table class="f-table">${table()}</table></div>
      <p class="at-foot">${esc($f('status').textContent)}</p><p class="at-foot">${esc(T('foot'))}</p>`;
    box.querySelector('table').onclick = ev => {
      const tr = ev.target.closest('tr[data-i]');
      if (tr) openRouteSlice(+tr.dataset.i);
    };
    box.querySelectorAll('.at-raw[data-raw]').forEach(n => n.textContent = n.dataset.raw);
    dbody.replaceChildren(box);
  }

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
      return `<tr data-i="${i}" class="${s.point >= 0 ? 'wp' : ''}${S.local?.kind === 'route' && i === S.local.i ? ' sel' : ''}">${cells.map((v, k) => `<td${num.has(k) ? ' class="f-num"' : ''}>${v}</td>`).join('')}</tr>`;
    });
    return `<thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody>`;
  }

  function aerodromeCards() {
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

  // ---------------------------------------------------------------- feuille du bas (primitive du cadre)
  // Hauteur fixe à trois positions, tirée par la poignée de son en-tête (frame/lib/sheet.js) ; son contenu défile dedans,
  // la page jamais. Propre au module : la position gardée d'un montage à l'autre, et ce qui suit un changement de taille.
  let sheet = null;
  /** Après un changement de taille (feuille, rotation ; onSettle de la feuille, 120 ms après le dernier) : le fond
   *  MapLibre reprend la taille du cadre, la route reste cadrée tant que l'utilisateur n'a pas déplacé la carte, le bloc
   *  est redessiné s'il n'est plus à la taille de son dernier dessin. */
  function settled() {
    if (!alive) return;
    if (S.map) mapSize(S.map, $('box'));
    if (S.map && !S.userMoved) fitMap();
    schedule();
    if ((S.view === 'profile' || S.view === 'slice') && `${dbody.clientWidth}x${dbody.clientHeight}` !== S.drawn) drawData();
  }

  // ---------------------------------------------------------------- carte (technique du module Carte)
  // Fond MapLibre ; surcouche vectorielle sur le canvas .at-over, redessinée une fois par image pendant le mouvement
  // (move → requestAnimationFrame), projetée par map.project ; sans tuiles, le fond uni de la Carte (Mercator).

  let frame = 0;
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(() => {
      frame = 0;
      drawMap();
    });
  };

  /** Emprise du vol (degrés), avec une marge. */
  const fitBox = () => {
    const pts = S.flight?.points || [],
      lats = pts.map(p => p.lat),
      lons = pts.map(p => p.lon),
      m = 0.4;
    return pts.length ? {
      w: Math.min(...lons) - m,
      e: Math.max(...lons) + m,
      s: Math.min(...lats) - m,
      n: Math.max(...lats) + m
    } : {
      w: -5,
      e: 9,
      s: 41,
      n: 51
    };
  };

  /** Fond MapLibre sur l'emprise du vol (startTiles du socle de la Carte) ; false s'il ne vient pas (hors ligne, pas de
   *  WebGL, hôte refusé, délai) : fond uni. Ce qui suit le chargement est propre au module (événements, surcouche). */
  async function startTiles() {
    if (S.map || S.mapTried) return !!S.map;
    S.mapTried = true;
    await loadRender().catch(() => {});
    const b = fitBox(),
      map = await startMapTiles($('map'), {
        style: styleFor({
          dark: dark()
        }),
        bounds: [
          [b.w, b.s],
          [b.e, b.n]
        ],
        attributionControl: {
          compact: true
        },
        wait: TILE_WAIT,
        alive: () => alive,
        onLoad: map => {
          map.on('move', schedule);
          map.on('moveend', schedule);
          map.on('movestart', e => {
            if (e.originalEvent && !isOwnResize(map)) S.userMoved = true;
          });
          map.on('resize', schedule);
          map.on('click', e => mapTap(e.lngLat.lat, e.lngLat.lng));
          map.on('mousemove', e => mapTip(e.lngLat.lat, e.lngLat.lng, e.point, e.originalEvent));
          map.on('mouseout', () => $('mapTip').style.display = 'none');
        }
      });
    if (!map || !alive) return flat();
    S.map = map;
    $('box').classList.remove('at-flat');
    mapSize(map, $('box'));
    fitMap();
    schedule();
    return true;
  }
  /** Fond uni de la Carte : Mercator sur l'emprise du vol, contours des pays ; un toucher sur le canvas. */
  function flat() {
    $('box').classList.add('at-flat');
    loadOutlines().then(schedule, () => {});
    const over = $('over');
    over.onclick = ev => {
      const v = view(),
        r = over.getBoundingClientRect(),
        ll = v.toLL?.(ev.clientX - r.left, ev.clientY - r.top);
      if (ll) mapTap(ll.lat, ll.lon);
    };
    over.onpointermove = ev => {
      const v = view(),
        r = over.getBoundingClientRect(),
        x = ev.clientX - r.left,
        y = ev.clientY - r.top,
        ll = v.toLL?.(x, y);
      if (ll) mapTip(ll.lat, ll.lon, {
        x,
        y
      }, ev);
    };
    schedule();
    return false;
  }
  /** Toucher de la carte : dans la grille du vol, la tranche locale à ce point ; hors d'elle, les valeurs du synoptique
   *  monde (aucun appel hors de la grille du vol). */
  function mapTap(lat, lon) {
    const b = gridBox();
    if (!b || !inBox(b, lat, lon)) {
      // la longitude touchée (MapLibre la donne continue) : le repère suit ; les valeurs se lisent modulo 360
      S.wpoint = {
        lat,
        lon
      };
      show('wpoint');
      return schedule();
    }
    openPointSlice(lat, A.nearLon(lon, (b[0] + b[2]) / 2));
  }
  /** Contenu « point hors de la zone du vol » : le synoptique monde en ce point, à l'heure de la carte. */
  function drawWorldPoint() {
    if (!S.wpoint) return show('profile');
    const P = S.wpoint,
      w = S.world,
      where = `${P.lat.toFixed(2)}° ${A.wrapLon(P.lon).toFixed(2)}°`;
    if (S.world === undefined) loadWorld();
    const k = w ? S.wgeo?.k ?? stepAt(w, S.route ? mapTime() : S.depTime || Date.now() / 1000) : 0,
      x = w ? worldAt(w, k, P.lat, P.lon) : null;
    sheetTitle(w ? T('worldPoint', {
      p: where,
      at: fmtHM(w.times[k])
    }) : where);
    const box = document.createElement('div');
    box.className = 'at-pad';
    box.innerHTML = x ? `<dl class="at-kv">${[
        [T('wpP'), x.p == null ? '—' : `${fmtNum(x.p)} hPa`],
        [T('wpWind'), fmtWind(x.dir, x.kt)],
        [T('wpCloud'), x.cc == null ? '—' : `${fmtNum(x.cc)} %`],
        [T('wpT'), x.t == null ? '—' : `${x.t < 0 ? '−' : ''}${fmtNum(Math.abs(x.t))} °C`]
      ].map(([k2, v]) => `<div><dt>${esc(k2)}</dt><dd>${esc(v)}</dd><dd></dd></div>`).join('')}</dl>
      <p class="f-muted" style="margin:8px 0 0;font-size:12px">${esc(T('worldPointNote', { run: w.run ? fmtHM(w.run) : '—' }))}</p>` :
      `<p class="f-muted">${esc(T(S.worldReading || S.world === undefined ? 'worldReading' : 'worldNone'))}</p>`;
    dbody.replaceChildren(box);
  }
  /** Vue courante : projection (MapLibre, sinon Mercator du fond uni sur l'emprise du vol) et ses dimensions. */
  function view() {
    const box = $('box'),
      Wd = Math.max(1, box.clientWidth),
      H = Math.max(1, box.clientHeight);
    if (S.map) return {
      W: Wd,
      H,
      toC: (lat, lon) => S.map.project([lon, lat])
    };
    const b = fitBox(),
      m = window.MapsRender ? plainView(b, Wd, H, 12) : null;
    return m ? {
      ...m,
      W: Wd,
      H
    } : {
      W: Wd,
      H,
      toC: (lat, lon) => ({
        x: (lon - b.w) / (b.e - b.w) * Wd,
        y: (b.n - lat) / (b.n - b.s) * H
      })
    };
  }
  /** Couleurs du dessin de la carte (jetons du design, par MapsRender.tokens quand il est là). */
  const pal = () => {
    const t = window.MapsRender?.tokens?.();
    return {
      bg: tok('--sog-chart-bg'),
      fg: tok('--sog-fg'),
      muted: tok('--sog-muted'),
      accent: tok('--sog-accent'),
      route: tok('--at-computed'),
      ice: tok('--at-ice'),
      dark: t ? t.dark : dark()
    };
  };

  /** Géométrie de la carte pour les champs choisis, calculée une fois par jeu de données (pas à chaque image) : images
   *  des champs, courbes (segments lon / lat) et étiquettes, dépressions et anticyclones, vents, trajectoire colorée. */
  /** Géométrie d'une grille régulière en lat / lon (celle du vol ou celle du monde), calculée une fois par jeu de données et
   *  seulement projetée à chaque image : champs lissés en images, isobares et isothermes en segments lat / lon avec leur
   *  étiquette, hautes et basses pressions, vents. o.merc : images rééchantillonnées en Mercator (une grille de 150° de
   *  latitude étirée en latitude serait fausse à l'écran) ; o.tStep : pas des isothermes ; o.thin : un vent sur deux. */
  function fieldGeometry(F, G, o = {}) {
    const [w, s, e, n] = G.bbox,
      f = 4,
      dk = dark(),
      cloud = cloudRgb(),
      lonOf = gx => w + (e - w) * gx / ((G.nx - 1) * f),
      latOf = gy => s + (n - s) * gy / ((G.ny - 1) * f),
      // rangées d'une grille affinée, du sud au nord, réparties en Mercator (même nombre de rangées)
      merc = r => {
        if (!o.merc) return r;
        const yOf = la => Math.log(Math.tan(Math.PI / 4 + la * R / 2)),
          y0 = yOf(s),
          y1 = yOf(n),
          v = new Array(r.v.length).fill(null);
        for (let jm = 0; jm < r.ny; jm++) {
          const la = (2 * Math.atan(Math.exp(y0 + (y1 - y0) * jm / (r.ny - 1))) - Math.PI / 2) / R,
            gy = (la - s) / (n - s) * (r.ny - 1),
            j0 = Math.min(r.ny - 2, Math.floor(gy)),
            fy = gy - j0;
          for (let i = 0; i < r.nx; i++) {
            const a = r.v[j0 * r.nx + i],
              b = r.v[(j0 + 1) * r.nx + i];
            v[jm * r.nx + i] = a == null || b == null ? (a ?? b) : a + (b - a) * fy;
          }
        }
        return {
          ...r,
          v
        };
      },
      curves = (vals, step, k, labelOf, labelAt, colorOf) => {
        const r = A.refine(vals, G.nx, G.ny, f),
          out = [];
        for (const c of A.contours(r.v, r.nx, r.ny, A.thresholdsOf(vals, step))) {
          let best = null,
            bd = Infinity;
          const tx = (r.nx - 1) * labelAt(c.level);
          for (const sg of c.segs) {
            const d = Math.abs((sg[0] + sg[2]) / 2 - tx) + Math.abs((sg[1] + sg[3]) / 2 - (r.ny - 1) / 2) * 0.3;
            if (d < bd) {
              bd = d;
              best = sg;
            }
          }
          out.push({
            k,
            level: c.level,
            color: colorOf(c.level),
            segs: c.segs.map(sg => [latOf(sg[1]), lonOf(sg[0]), latOf(sg[3]), lonOf(sg[2])]),
            label: best ? {
              text: labelOf(c.level),
              lat: latOf((best[1] + best[3]) / 2),
              lon: lonOf((best[0] + best[2]) / 2)
            } : null
          });
        }
        return out;
      };
    const rt = merc(A.refine(F.t, G.nx, G.ny, f)),
      rc = merc(A.refine(F.cc, G.nx, G.ny, f)),
      tStep = o.tStep || 2,
      hl = [];
    if (F.ft == null)
      for (let j = 1; j < G.ny - 1; j++)
        for (let i = 1; i < G.nx - 1; i++) {
          const v = F.p[j * G.nx + i];
          if (v == null) continue;
          const nb = [-1, 0, 1].flatMap(dj => [-1, 0, 1].map(di => F.p[(j + dj) * G.nx + i + di])).filter(x => x != null);
          // un extrêmum : aucun voisin de l'autre côté, et au moins un écart de 0,5 hPa (un champ plat n'en a pas)
          const isMin = nb.every(x => x >= v) && nb.some(x => x >= v + 0.5),
            isMax = nb.every(x => x <= v) && nb.some(x => x <= v - 0.5);
          if (isMin || isMax) hl.push({
            ...G.places[j * G.nx + i],
            low: isMin,
            v
          });
        }
    return {
      bbox: [w, s, e, n],
      tImg: fieldCanvas(rt.nx, rt.ny, k => rt.v[k] == null ? null : [...diverging(rt.v[k], 40, dk), 120]),
      cImg: fieldCanvas(rc.nx, rc.ny, k => rc.v[k] > 8 ? [...cloud, Math.round(rc.v[k] / 100 * 150)] : null),
      isobars: F.p.some(Number.isFinite) ? curves(F.p, F.pStep, 'p', lv => `${Math.round(lv)}`, lv => 0.2 + 0.6 * (((lv / F.pStep) % 5 + 5) % 5) /
        4,
        () => dk ? '#c3c2b7' : '#3d3c39') : [],
      isotherms: F.t.some(Number.isFinite) ? curves(F.t, tStep, 't', lv => `${lv < 0 ? '−' : ''}${Math.abs(lv)}°`, lv => 0.15 + 0.7 * (((lv /
          tStep) % 6 + 6) % 6) / 5,
        lv => lv === 0 ? '#1c5cab' : lv < 0 ? '#256abf' : '#c23b3a') : [],
      pStep: F.pStep,
      hl,
      winds: G.places.map((pl, k) => [pl, F.wind[k]]).filter(([pl, [d, kt]]) => d != null && kt != null && !(o.thin && (pl.i + pl.j) % 2))
    };
  }
  /** Géométrie de la grille du vol, et la trajectoire colorée. */
  function mapGeometry() {
    const F = S.mapF || (S.mapF = mapFields()),
      G = S.grid.g,
      key = JSON.stringify([S.mapLevel, F.time, F.ft, G.bbox, dark(), S.mapLayers.tfill, S.levelFt, S.traj?.total]);
    if (S.geo?.key === key) return S.geo;
    S.geo = {
      key,
      ...fieldGeometry(F, G, {
        thin: G.places.length > 40
      }),
      traj: S.mapLevel === 'traj' ? S.along.map(a => ({
        lat: a.lat,
        lon: a.lon,
        c: a.x && !a.x.below && a.x.tC != null ? `rgb(${diverging(a.x.tC, 40, dark()).join(',')})` : '#888',
        w: (a.x?.cc ?? 0) >= 50 ? 6 : 4,
        ice: a.ice
      })) : null
    };
    return S.geo;
  }
  /** Dessin d'une géométrie (fieldGeometry) : champs, isobares, isothermes, hautes et basses pressions, vents ; P projette
   *  (lat, lon) en pixels. */
  function drawGeo(c, g, P, K, L) {
    const [w, s, e, n] = g.bbox,
      a = P(n, w),
      b = P(s, e);
    // champs : une image lissée sur l'emprise de la grille (Mercator : un rectangle à l'écran)
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    if (L.tfill) c.drawImage(g.tImg, a.x, a.y, b.x - a.x, b.y - a.y);
    if (L.cloud) c.drawImage(g.cImg, a.x, a.y, b.x - a.x, b.y - a.y);
    // courbes
    const stroke = (list, style) => {
      for (const cv2 of list) {
        style(cv2);
        c.beginPath();
        for (const sg of cv2.segs) {
          const p = P(sg[0], sg[1]),
            q = P(sg[2], sg[3]);
          c.moveTo(p.x, p.y);
          c.lineTo(q.x, q.y);
        }
        c.stroke();
        c.setLineDash([]);
      }
      for (const cv2 of list)
        if (cv2.label) {
          const p = P(cv2.label.lat, cv2.label.lon);
          halo(c, cv2.label.text, p.x, p.y, cv2.color, K.bg);
        }
    };
    if (L.isobar) stroke(g.isobars, cv2 => {
      c.strokeStyle = cv2.color;
      c.lineWidth = cv2.level % (g.pStep * 2) === 0 ? 1.6 : 0.9;
    });
    if (L.isotherm) stroke(g.isotherms, cv2 => {
      c.strokeStyle = cv2.color;
      c.lineWidth = cv2.level === 0 ? 2 : 1;
      c.setLineDash(cv2.level === 0 ? [] : [5, 4]);
    });
    if (L.isobar)
      for (const h of g.hl) {
        const p = P(h.lat, h.lon);
        c.font = 'bold 18px system-ui, sans-serif';
        halo(c, h.low ? T('low') : T('high'), p.x, p.y, h.low ? '#c23b3a' : '#1c5cab', K.bg);
        c.font = '11px system-ui, sans-serif';
        halo(c, `${Math.round(h.v)}`, p.x, p.y + 15, K.muted, K.bg);
      }
    if (L.wind && g.winds.length) {
      // un vent tous les « stride » lieux : au moins 30 px entre deux barbules à l'écran (grille du monde dézoomée)
      const [p0] = g.winds[0],
        q0 = P(p0.lat, p0.lon),
        q1 = P(p0.lat, p0.lon + (g.bbox[2] - g.bbox[0]) / Math.max(1, Math.max(...g.winds.map(([pl]) => pl.i)))),
        stride = Math.max(1, Math.ceil(30 / Math.max(1, Math.hypot(q1.x - q0.x, q1.y - q0.y))));
      for (const [pl, [d, kt]] of g.winds) {
        if (pl.i % stride || pl.j % stride) continue;
        const p = P(pl.lat, pl.lon);
        barb(c, p.x, p.y, d, kt, 22, K.fg);
      }
    }
  }
  /** Emprise de la grille du vol (lue, sinon celle qui le serait) ; null sans vol. */
  const gridBox = () => S.grid?.g.bbox || S.gridBox || null;
  const inBox = (b, lat, lon) => {
    const lo = A.nearLon(lon, (b[0] + b[2]) / 2); // la grille peut passer la ligne de changement de date (longitudes > 180°)
    return lat >= b[1] && lat <= b[3] && lo >= b[0] && lo <= b[2];
  };
  /** La vue et la grille du vol : 0 dedans ; 1 en partie dehors (le synoptique remplit ce qui dépasse) ; 2 surtout
   *  dehors — la grille couvre moins de 40 % de la vue, ou son centre en sort (le titre dit alors « synoptique »). Sans
   *  vol : 2. */
  function outsideGrid() {
    const b = gridBox();
    if (!b) return 2;
    if (!S.map) return 0; // fond uni : cadré sur le vol
    const v = S.map.getBounds(),
      [w, s, e, n] = [v.getWest(), v.getSouth(), v.getEast(), v.getNorth()];
    if (w >= b[0] && e <= b[2] && s >= b[1] && n <= b[3]) return 0;
    const ix = Math.max(0, Math.min(e, b[2]) - Math.max(w, b[0])),
      iy = Math.max(0, Math.min(n, b[3]) - Math.max(s, b[1])),
      cover = ix * iy / Math.max(1e-9, (e - w) * (n - s));
    return cover < 0.4 || !inBox(b, (s + n) / 2, (w + e) / 2) ? 2 : 1;
  }
  /** Décalages de longitude des copies du monde visibles (MapLibre dézoomé répète le monde). */
  function worldCopies() {
    if (!S.map) return [0];
    const v = S.map.getBounds(),
      out = [];
    for (let k = Math.floor((v.getWest() + 180) / 360); k <= Math.floor((v.getEast() + 180) / 360); k++) out.push(k * 360);
    return out.length ? out.slice(0, 3) : [0];
  }
  /** Le synoptique monde, lu une fois (réserve de l'appareil, sinon le fichier publié) ; jamais Open-Meteo. */
  function loadWorld() {
    S.world = null;
    S.worldReading = true;
    S.worldAsked = Date.now();
    readWorld().then(w => {
      if (!alive) return;
      S.worldReading = false;
      S.world = w;
      S.wgeo = null;
      baseTitle();
      if (S.view === 'wpoint') drawData();
      schedule();
    }, () => {
      S.worldReading = false;
      baseTitle();
    });
  }
  /** Titre du synoptique : l'heure montrée, le run et l'échéance. */
  function worldTitle() {
    const w = S.world;
    if (!w) return T(S.worldReading || S.world === undefined ? 'worldReading' : 'worldNone');
    const t = w.times[S.wgeo?.k ?? 0];
    return T('worldTitle', {
      at: fmtHM(t),
      run: w.run ? fmtHM(w.run) : '—',
      h: w.run ? Math.round((t - w.run) / 3600) : '—'
    });
  }
  /** Géométrie du synoptique monde au pas le plus proche de l'heure de la carte (null sans fichier). */
  function worldGeometry() {
    const w = S.world;
    if (!w) return null;
    const k = stepAt(w, S.route ? mapTime() : S.depTime || Date.now() / 1000),
      key = JSON.stringify([w.built, k, dark()]);
    if (S.wgeo?.key === key) return S.wgeo;
    const {
      G,
      F
    } = worldGrid(w, k);
    S.wgeo = {
      key,
      k,
      ...fieldGeometry(F, G, {
        merc: true,
        tStep: 5
      })
    };
    return S.wgeo;
  }

  /** Halo de texte (fond du dessin) puis texte. */
  function halo(c, text, x, y, color, bg, align = 'center') {
    c.save();
    c.textAlign = align;
    c.textBaseline = 'middle';
    c.lineWidth = 3;
    c.lineJoin = 'round';
    c.strokeStyle = bg;
    c.strokeText(text, x, y);
    c.fillStyle = color;
    c.fillText(text, x, y);
    c.restore();
  }

  /** Dessin de la surcouche (et du fond uni sans tuiles), à chaque image du mouvement. */
  function drawMap() {
    const cv = $('over');
    if (!cv || !alive) return;
    const v = view(),
      dpr = Math.min(3, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(v.W * dpr) || cv.height !== Math.round(v.H * dpr)) {
      cv.width = Math.round(v.W * dpr);
      cv.height = Math.round(v.H * dpr);
    }
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, v.W, v.H);
    const P = (lat, lon) => v.toC(lat, lon),
      K = pal();
    if (!S.map) {
      const dk = K.dark;
      if (window.MapsRender) drawPlain(c, P, v.W, v.H, dk ? {
        sea: '#1d2731',
        land: '#26282b',
        border: '#4a4a46'
      } : undefined);
      else {
        c.fillStyle = tok('--sog-chart-grid');
        c.fillRect(0, 0, v.W, v.H);
      }
    }
    c.font = '11px system-ui, sans-serif';
    const L = S.mapLayers;
    // synoptique monde : dès que la vue sort de la grille du vol (ou sans vol), hors de la grille du vol ; jamais d'appel
    const out = outsideGrid();
    if ((out === 2) !== !!S.worldShown) {
      S.worldShown = out === 2;
      baseTitle();
    }
    if (out) {
      if (S.world === undefined || (S.world === null && Date.now() - S.worldAsked > 10 * 60e3)) loadWorld();
      const wg = worldGeometry();
      if (wg) {
        c.save();
        if (S.grid && S.traj) {
          const [w, s, e, n] = S.grid.g.bbox,
            a = P(n, w),
            b = P(s, e);
          c.beginPath();
          c.rect(0, 0, v.W, v.H);
          c.rect(a.x, a.y, b.x - a.x, b.y - a.y);
          c.clip('evenodd');
        }
        for (const off of worldCopies()) drawGeo(c, wg, (la, lo) => P(la, lo + off), K, L);
        c.restore();
      }
    }
    if (S.wpoint && S.view === 'wpoint') {
      const q = P(S.wpoint.lat, S.wpoint.lon);
      c.strokeStyle = K.accent;
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(q.x, q.y, 9, 0, 2 * Math.PI);
      c.stroke();
    }
    if (!S.flight) return;
    if (S.grid && S.traj) {
      const g = mapGeometry();
      drawGeo(c, g, P, K, L);
      // trajectoire colorée par la température rencontrée, plus épaisse dans les nuages, ❄ au givrage
      if (g.traj) {
        const q = g.traj.map(t => P(t.lat, t.lon));
        c.lineCap = 'round';
        c.strokeStyle = K.bg;
        c.lineWidth = 9;
        c.beginPath();
        q.forEach((p, k) => k ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
        c.stroke();
        c.lineCap = 'butt';
        for (let k = 1; k < q.length; k++) {
          c.beginPath();
          c.moveTo(q[k - 1].x, q[k - 1].y);
          c.lineTo(q[k].x, q[k].y);
          c.strokeStyle = g.traj[k].c;
          c.lineWidth = g.traj[k].w;
          c.stroke();
          if (g.traj[k].ice >= 1 && k % 4 === 0) halo(c, '❄', q[k].x, q[k].y - 9, g.traj[k].ice === 2 ? K.ice : '#9a6b00', K.bg);
        }
      }
    }
    // route et points
    const pts = S.flight.points;
    if (!(S.grid && S.mapLevel === 'traj')) {
      c.lineCap = c.lineJoin = 'round';
      c.beginPath();
      pts.forEach((p, k) => {
        const q = P(p.lat, p.lon);
        k ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y);
      });
      c.strokeStyle = K.bg;
      c.lineWidth = 6;
      c.stroke();
      c.strokeStyle = K.route;
      c.lineWidth = 3;
      c.stroke();
    }
    for (const p of pts) {
      const q = P(p.lat, p.lon);
      c.fillStyle = K.fg;
      c.beginPath();
      c.arc(q.x, q.y, 3.5, 0, 2 * Math.PI);
      c.fill();
      c.font = 'bold 11.5px system-ui, sans-serif';
      halo(c, p.id, q.x + 7, q.y - 8, K.fg, K.bg, 'left');
    }
    // lieu de la tranche locale
    if (S.local) {
      const q = P(S.local.lat, S.local.lon);
      c.strokeStyle = K.accent;
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(q.x, q.y, 9, 0, 2 * Math.PI);
      c.stroke();
    }
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

  /** Heure de la carte : passage du vol au lieu de la tranche locale, sinon au départ. */
  const mapTime = () => S.local?.kind === 'point' ? S.local.t : S.route.samples[S.local?.kind === 'route' ? S.local.i : 0].t;

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

  function mapTip(lat, lon, pt, ev) {
    const box = $('mapTip');
    if (!S.grid || !S.mapF || !box || ev?.pointerType === 'touch' || matchMedia('(hover: none)').matches) return;
    const G = S.grid.g,
      [w, s, e, n] = G.bbox,
      gx = (A.nearLon(lon, (w + e) / 2) - w) / (e - w) * (G.nx - 1),
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
    box.innerHTML = `<b>${lat.toFixed(2)}° ${A.wrapLon(lon).toFixed(2)}°</b> <span class="m">${F.ft == null ? esc(T('ground')) : fmtLvl(F.ft)}</span><br>` +
      `${fmtT(t)} · ${esc(T('clouds'))} ${fmtNum(cc)} %${p == null ? '' : ` · ${fmtNum(p, 1)} hPa`}`;
    box.style.display = 'block';
    box.style.left = `${Math.min(pt.x + 14, $('box').clientWidth - box.offsetWidth - 4)}px`;
    box.style.top = `${Math.max(0, pt.y - 40)}px`;
  }

  function mapLevelOptions() {
    const sel = lvlSel,
      gridTop = S.grid ? A.paFt(S.grid.levels.at(-1)) : 0,
      known = new Set(S.grid?.levels || []),
      readable = ft => A.bracketLevels([ft]).every(l => known.has(l)),
      opts = [
        ['sfc', T('mlSfc')],
        ['req', T('mlReq', {
          l: fmtLvl(S.levelFt)
        })],
        // l'indice du palier dans steps (filtré après : un palier au niveau demandé n'est pas proposé deux fois)
        ...S.traj.steps.map((st, k) => [`step:${k}`, T('mlStep', {
          l: fmtLvl(st.ft),
          id: st.id
        }), st.ft]).slice(1).filter(o => o[2] !== S.levelFt).map(o => o.slice(0, 2)),
        ['traj', T('mlTraj')],
        ...MAP_FIXED.filter(ft => ft <= gridTop && readable(ft)).map(ft => [`alt:${ft}`, fmtLvl(ft)])
      ];
    const sig = JSON.stringify(opts);
    if (sel.dataset.sig !== sig) {
      sel.dataset.sig = sig;
      sel.replaceChildren(...opts.map(([v, t]) => new Option(t, v)));
    }
    if (!opts.some(([v]) => v === S.mapLevel)) S.mapLevel = 'sfc';
    if (sel.value !== S.mapLevel) sel.value = S.mapLevel;
    lvlShort();
  }
  /** Texte de la puce d'altitude : le niveau seul (le nom entier est celui de la liste). */
  function lvlShort() {
    const v = S.mapLevel;
    setText(lvlText, v === 'sfc' ? T('mlSfcShort') : v === 'traj' ? T('mlTrajShort') : fmtLvl(mapFt()));
    const full = lvlSel.selectedOptions[0]?.text || T('mapLevelAria');
    if (lvlChip.title !== full) lvlChip.title = full;
  }

  function fitMap() {
    if (!S.map || !S.flight) return schedule();
    const b = fitBox();
    S.map.fitBounds([
      [b.w, b.s],
      [b.e, b.n]
    ], {
      padding: {
        top: 56,
        bottom: 24,
        left: 24,
        right: 56
      },
      duration: 0,
      maxZoom: 8
    });
  }

  /** Carte des couches (bouton sur la carte) : carte et coupe, chaque couche avec sa légende. */
  function layersCard() {
    const mid = dark() ? '#383835' : '#f0efec',
      ramp = `linear-gradient(90deg,#0d366b,#6da7ec,${mid},#ec8a85,#9e2a2a)`,
      key = (style, ramped) => ramped ? `<span class="at-ramp" style="background:${style}"></span>` : `<span class="at-key" style="${style}"></span>`,
      row = (group, k, label, k2) => `<label><input type="checkbox" data-g="${group}" data-k="${k}"${S[group][k] ? ' checked' : ''}> ${k2 || ''} ${esc(T(label))}</label>`,
      cloud = `rgba(${cloudRgb()},.7)`,
      barbKey = '<span class="at-key" style="border:0;height:auto;text-align:center">⟋</span>';
    const note = mapNote();
    layersBox.innerHTML = (note ? `<p class="at-mapnote">${esc(T('mapTitle'))} · ${esc(note)}</p>` : '') + `<div><b>${esc(T('mapTitle'))}</b>` +
      row('mapLayers', 'isobar', 'lyIsobar', key(`color:${dark() ? '#c3c2b7' : '#3d3c39'}`)) +
      row('mapLayers', 'isotherm', 'lyIso', key('color:#c23b3a;border-top-style:dashed')) +
      row('mapLayers', 'cloud', 'lyCloud', key(`linear-gradient(90deg,transparent,${cloud})`, true)) +
      row('mapLayers', 'wind', 'lyWind', barbKey) +
      row('mapLayers', 'tfill', 'lyTemp', key(ramp, true)) +
      `</div><div><b>${esc(T('profileTitle'))}</b>` +
      row('xsLayers', 'cloud', 'lyCloud', key(`linear-gradient(90deg,transparent,${cloud})`, true)) +
      row('xsLayers', 'iso', 'lyIso', key('color:#1c5cab')) +
      row('xsLayers', 'inv', 'lyInv', key('repeating-linear-gradient(45deg,var(--at-inv) 0 1.5px,transparent 1.5px 5px)', true)) +
      row('xsLayers', 'ice', 'lyIce', key('repeating-linear-gradient(-45deg,var(--at-ice) 0 1.5px,transparent 1.5px 4px)', true)) +
      row('xsLayers', 'wind', 'lyWind', barbKey) +
      row('xsLayers', 'cu', 'lyCu', key('color:var(--sog-muted);border-top-style:dotted')) +
      row('xsLayers', 'temp', 'lyTemp', key(ramp, true)) +
      row('xsLayers', 'rh', 'lyRh', key('linear-gradient(90deg,transparent,rgba(42,120,214,.6))', true)) +
      row('xsLayers', 'da', 'lyDa', key(ramp, true)) +
      `</div><p>${esc(T('lgPaths'))}</p>`;
  }

  // ---------------------------------------------------------------- état, chargement

  /** Titre de la poignée : le contenu, puis son contexte (une ligne coupée ; le texte entier et sa note en infobulle). */
  function sheetTitle(s, note = '') {
    const node = $('dtitle'),
      full = note ? `${s}\n${note}` : s;
    setText(node, s);
    if (node.title !== full) node.title = full;
  }
  /** Titre du profil et des informations : le contenu, puis le vol en bref (ou l'état de la lecture). */
  function baseTitle() {
    const ctxt = s => S.sum ? `${s} · ${S.sum}` : s;
    // la carte montre le synoptique monde (vue hors de la grille du vol, ou sans vol) : le titre dit ce qu'on regarde
    if (S.view === 'profile' && S.worldShown) return sheetTitle(worldTitle());
    if (S.view === 'profile') sheetTitle(ctxt(T('profileTitle')), S.route ? T('xsSub', {
      n: S.route.samples.length
    }) : '');
    else if (S.view === 'info') sheetTitle(ctxt(T('infoShort')), T('infoTitle'));
  }
  /** Le vol en bref (appareil, route, niveau, départ, modèle), ou l'état de la lecture : contexte du titre de la poignée. */
  const setSum = s => {
    S.sum = s;
    baseTitle();
  };

  /** État de la lecture : dans « Vol » et dans le corps du bloc tant qu'il n'y a pas de coupe (jamais dans le titre). */
  function setStatus(s) {
    setText($f('status'), s);
    if (!S.traj && S.view !== 'settings') drawData();
  }
  /** Le vol en bref, connu avant la météo : appareil, route, niveau, départ, modèle et run. */
  function flightSum() {
    const f = S.flight,
      ac = f?.aircraft ? [f.aircraft.type, f.aircraft.registration].filter(Boolean).join(' ') : '';
    // le vol montré n'est pas le vol courant (démonstration, exemple, texte, fichier) : dit dans la poignée, jamais confondu
    const tag = S.data === 'demo' ? T('demoShort') : {
      example: T('tagExample'),
      text: T('tagText'),
      file: T('tagFile')
    } [$f('flightSrc').value] || '';
    setText($('srcTag'), tag);
    $('srcTag').classList.toggle('at-hidden', !tag);
    if (!f) return setSum('');
    setSum([ac, `${f.dep} → ${f.arr}`, fmtLvl(S.levelFt), fmtHM(S.depTime), S.data === 'demo' ? T('demoSrc') :
      `${S.model?.name || ''}${S.run ? ` · run ${fmtHM(S.run)}` : ''}`
    ].filter(Boolean).join(' · ') + (S.outOfRange ? ' ⚠' : ''));
  }
  /** Ce que montre la carte (heure, niveau et lignes), en tête des couches ; « Charger » quand la grille manque. */
  function mapNote() {
    const F = S.grid && S.mapF;
    if (!F) return S.traj ? T('mapLoad') : '';
    return [F.time ? fmtHM(F.time) : '', F.pLabel].filter(Boolean).join(' · ');
  }

  function status() {
    const f = S.flight,
      r = S.route,
      spentNow = Math.round((r?.weight || 0) + (S.grid?.weight || 0)),
      ac = f.aircraft ? [f.aircraft.type, f.aircraft.registration].filter(Boolean).join(' ') : '';
    // titre de la poignée : le vol en bref ; le détail des appels dans « Vol »
    flightSum();
    setText($f('status'), T('stFlight', {
        from: f.from
      }) + (ac ? ` · ${ac}` : '') + ` · ${f.dep} → ${f.arr}` + (f.altn ? ` (${T('altnShort', { id: f.altn })})` : '') +
      (f.updated ? ` · ${T('written', { d: new Date(f.updated).toLocaleString(lang()) })}` : '') +
      (r && S.data !== 'demo' ? ` · ${T('stPlaces', { r: r.samples.length, g: S.grid?.g.places.length || 0 })} · ` +
        (spentNow ? T('stSpent', {
          n: spentNow
        }) : T('stCached')) + ` · ${T('stDay', { n: Math.round(S.daySpent) })}` : '') +
      (S.outOfRange ? ` · ${T('outOfRange')}` : ''));
    if (S.view === 'layers') layersCard();
  }

  function levelOptions(cur) {
    const sel = $f('levelSel'),
      vals = new Set([cur]);
    for (let ft = 3000; ft <= 41000; ft += ft < 10000 ? 500 : 1000) vals.add(ft);
    sel.replaceChildren(...[...vals].filter(Boolean).sort((a, b) => a - b).map(ft => new Option(fmtLvl(ft), ft)));
    sel.value = cur;
  }

  /** Niveaux lus sur la route (jusqu'au haut de la coupe) et sur la grille (ceux qui encadrent les altitudes offertes). */
  const routeLevels = () => A.levelsUpTo(topFt());
  const gridLevels = () => A.bracketLevels(mapAltitudes(S.flight));

  /** Rendu de tout ce qui dépend des données : sélecteur d'altitude, bloc du bas, carte. */
  function render() {
    if (!S.traj || !alive) return;
    S.mapF = null;
    if (S.grid) {
      mapLevelOptions();
      S.mapF = mapFields();
    }
    if (lvlChip.hidden !== !S.grid) lvlChip.hidden = !S.grid;
    // l'indice du toucher : une notification, une fois par page (jamais posé sur la carte)
    if (!tapNoted) {
      tapNoted = true;
      ctx.notify(T('tapNote'), 'info');
    }
    status();
    drawData();
    schedule();
  }

  /** Charge le vol puis la météo de la route, de la carte et des terrains. cacheOnly (ouverture, vol courant changé) :
   *  seulement ce que l'appareil garde, sans appel à Open-Meteo ni à avwx.rest ; sinon l'écran attend « Charger ». */
  async function load({
    cacheOnly = false
  } = {}) {
    // un chargement plus récent l'emporte : celui-ci s'arrête dès qu'il ne l'est plus
    const seq = load.seq = (load.seq || 0) + 1,
      stale = () => seq !== load.seq || !alive;
    try {
      S.data = $f('dataSrc').value;
      if (S.data === 'demo') cacheOnly = false;
      setStatus(T('readingFlight'));
      const f = await readFlight();
      if (stale()) return;
      S.flight = f;
      S.noFlight = false;
      S.userMoved = false;
      // un niveau choisi dans l'écran l'emporte sur celui du vol (comme l'heure de départ)
      S.levelFt = $f('levelSel').dataset.touched && +$f('levelSel').value || f.levelFt || +$f('levelSel').value || 10000;
      levelOptions(S.levelFt);
      S.cruiseKt = +$f('cruiseKt').value || A.cruiseKtOf(f.text) || 200;
      $f('cruiseKt').value = S.cruiseKt;
      if (f.when && !$f('dep').dataset.touched) setDep(Date.parse(f.when) / 1000);
      S.depTime = depValue();
      const mid = f.points[Math.floor(f.points.length / 2)];
      S.model = A.modelFor(mid.lat, A.wrapLon(mid.lon));
      S.run = null;
      flightSum();
      // un lieu tous les 50 NM, 24 au plus (comme Carburant) : l'échantillonnage tient le quota d'abord
      const smp = sectionPlaces(f.points),
        levels = gridLevels(),
        gr = A.grid(f.points, +$f('gridMax').value),
        rLevels = routeLevels(),
        // au niveau choisi, et à celui du vol courant quand il diffère : la coupe de la Carte (au niveau du vol) est alors
        // dans la réserve elle aussi
        rVars = [...new Set([...sectionVars(S.levelFt, f.points), ...($f('flightSrc').value === 'current' && f.levelFt && f
          .levelFt !== S.levelFt ? sectionVars(f.levelFt, f.points) : [])])],
        gVars = varsOf(levels, A.GRID_LEVEL_VARS, A.GRID_SURFACE_VARS);
      S.gridBox = gr.bbox; // emprise de la grille, connue avant la prévision : hors d'elle, rien n'est jamais demandé
      setStatus(S.data === 'demo' ? T('demoComputing') : T('reading', {
        m: S.model.name
      }));
      startTiles().then(fitMap);
      // l'heure du run d'abord (fichier statique, gardé 10 min) : elle dit si la réserve a encore le dernier run
      S.run = S.data === 'demo' ? null : await W.run(S.model.id);
      if (stale()) return;
      flightSum();
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
        setStatus(T('notLoaded', {
          m: S.model.name,
          n: Math.round(callWeight(cells, rVars.length) + callWeight(gcells, gVars.length)),
          d: Math.round(S.daySpent)
        }));
        fitMap();
        return;
      }
      S.route = {
        samples: smp,
        locs: route.locs,
        levels: rLevels,
        weight: route.weight
      };
      S.grid = null;
      S.geo = null;
      S.wx = wx;
      S.sel = 0;
      S.local = null;
      compute();
      if (S.view === 'slice') S.view = 'profile';
      show(S.view);
      render();
      fitMap();
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
      if (!grid) return S.view === 'layers' && layersCard();
      S.grid = {
        g: gr,
        locs: grid.locs,
        levels,
        weight: grid.weight
      };
      S.daySpent = S.data === 'demo' ? 0 : await W.spent();
      render();
    } catch (e) {
      if (stale() || e.stale) return;
      if (e.noFlight) {
        // aucun vol courant : rien de montré (ni coupe ni carte d'un autre vol) ; le bloc propose Carburant et l'exemple
        Object.assign(S, {
          flight: null,
          traj: null,
          route: null,
          grid: null,
          geo: null,
          local: null,
          gridBox: null,
          noFlight: true
        });
        // la carte reste utile sans vol : le synoptique monde (rien n'est demandé à Open-Meteo)
        startTiles().then(schedule);
        flightSum();
        if (lvlChip.hidden !== true) lvlChip.hidden = true;
        setStatus(T('noFlight'));
        schedule();
        return;
      }
      console.error(e);
      setStatus(T('failed', {
        m: why(e)
      }));
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
    $f('dep').value = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  }
  const depValue = () => {
    const v = $f('dep').value;
    return v ? Date.parse(`${v}:00Z`) / 1000 : Math.ceil(Date.now() / 36e5) * 3600;
  };

  /** Réglages de l'écran gardés sur l'appareil (cache/atmosphere/ui.json), écrits seulement s'ils changent. */
  let uiText = '';

  function saveUi() {
    const v = {
        text: $f('routeText').value,
        grid: $f('gridMax').value,
        xs: S.xsLayers,
        map: S.mapLayers,
        mapLevel: S.mapLevel
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
  if (ui?.mapLevel) S.mapLevel = ui.mapLevel;
  $f('routeText').value = ui?.text || ROUTE_TEXT;
  if (ui?.grid) $f('gridMax').value = ui.grid;
  // toujours le vol courant à l'ouverture (celui que lisent Carburant et la Carte) ; un autre vol (exemple, texte, fichier)
  // est un essai de la visite, jamais gardé : gardé, il était montré comme s'il était le vol prévu
  $f('flightSrc').value = 'current';
  const showSrc = () => {
    const v = $f('flightSrc').value;
    $f('fileBox').classList.toggle('at-hidden', v !== 'file');
    $f('textBox').classList.toggle('at-hidden', v !== 'text');
  };
  $f('flightSrc').onchange = () => {
    showSrc();
    saveUi();
  };
  $f('routeText').onchange = saveUi;
  $f('gridMax').onchange = saveUi;
  showSrc();
  if (ctx.query?.donnees === 'demo' || ctx.query?.data === 'demo') $f('dataSrc').value = 'demo';
  form.onsubmit = e => {
    e.preventDefault();
    show('profile');
    load();
  };
  $('dclose').onclick = () => {
    S.local = null;
    S.wpoint = null;
    S.mapF = null;
    render();
    show('profile');
  };
  $('prev').onclick = () => openRouteSlice((S.local?.i ?? 0) - 1);
  $('next').onclick = () => openRouteSlice((S.local?.i ?? 0) + 1);
  // heure, niveau, vitesse : recalcul sans relire la prévision (sauf un niveau que la route ou la grille n'a pas encore :
  // seules ses variables sont demandées)
  const recompute = () => {
    if (!S.route) return;
    S.depTime = depValue();
    S.levelFt = +$f('levelSel').value;
    S.cruiseKt = +$f('cruiseKt').value || S.cruiseKt;
    if (!routeLevels().every(l => S.route.levels.includes(l)) || S.grid && !gridLevels().every(l => S.grid.levels.includes(l)))
      return load();
    compute();
    render();
  };
  $f('dep').onchange = () => {
    $f('dep').dataset.touched = '1';
    recompute();
  };
  $f('levelSel').onchange = () => {
    $f('levelSel').dataset.touched = '1';
    recompute();
  };
  $f('cruiseKt').onchange = recompute;
  lvlSel.onchange = () => {
    S.mapLevel = lvlSel.value;
    lvlShort();
    saveUi();
    render();
  };
  // couches (un contenu du bloc, ouvert par son bouton) : une case cochée redessine la carte, ou la coupe à son retour
  layersBox.onchange = ev => {
    const c = ev.target.closest('input[data-g]');
    if (!c) return;
    const g = S[c.dataset.g];
    g[c.dataset.k] = c.checked;
    // un seul fond à la fois dans la coupe
    if (c.dataset.g === 'xsLayers' && c.checked && ['temp', 'rh', 'da'].includes(c.dataset.k))['temp', 'rh', 'da'].filter(x => x !== c
      .dataset.k).forEach(x => g[x] = false);
    layersCard();
    saveUi();
    if (c.dataset.g === 'mapLayers') schedule();
    else if (S.view === 'profile') drawData();
  };
  // tailles : la carte (MapLibre suit, la surcouche est redessinée) et le bloc du bas (coupe ou tranche à sa nouvelle
  // taille) ; design ou ton changés : fond et dessins repris (réaction à un événement : rien n'est réécrit hors du module)
  // le bloc est redessiné quand sa taille n'est plus celle de son dernier dessin (un dessin pris pendant un glissement est
  // repris à la taille finale)
  const ro = new ResizeObserver(() => {
    if (S.map) mapSize(S.map, $('box'));
    schedule();
    if (`${dbody.clientWidth}x${dbody.clientHeight}` !== S.drawn) sheet?.settle();
  });
  ro.observe(dbody);
  ro.observe($('box'));
  const repaint = () => {
    colors.clear();
    S.geo = null;
    S.map?.setStyle(styleFor({
      dark: dark()
    }));
    drawData();
    schedule();
    if (S.view === 'layers') layersCard();
  };
  const mo = new MutationObserver(repaint);
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-design', 'data-tone']
  });
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', repaint);
  // retour d'un onglet caché ou d'une page gelée : les observations de taille faites pendant ce temps sont perdues
  const back = () => {
    if (document.visibilityState !== 'visible' || !S.map) return;
    mapSize(S.map, $('box'));
    schedule();
  };
  document.addEventListener('visibilitychange', back);
  window.addEventListener('pageshow', back);
  // vol courant changé (Carburant, Carte, un autre appareil) : relu, la prévision seulement depuis la réserve
  const sig = r => JSON.stringify([r?.route?.points, r?.level, r?.profile, r?.weather?.when]);
  let lastSig = sig(rec);
  const unwatch = data.watch(flightPath, async () => {
    if ($f('flightSrc').value !== 'current') return;
    const r = await data.get(flightPath);
    if (sig(r) === lastSig) return;
    lastSig = sig(r);
    load({
      cacheOnly: true
    });
  });
  stop = () => {
    alive = false;
    sheet?.stop();
    cancelAnimationFrame(frame);
    ro.disconnect();
    mo.disconnect();
    mq.removeEventListener('change', repaint);
    document.removeEventListener('visibilitychange', back);
    window.removeEventListener('pageshow', back);
    unwatch?.();
    S.map?.remove();
    S.map = null;
  };
  sheet = createSheet({
    root: el,
    panel: $('data'),
    head: $('grip').parentNode,
    grip: $('grip'),
    pos: sheetKeep,
    ignore: '[data-at="dclose"],[data-at="prev"],[data-at="next"]',
    labels: (pos, rank) => `${T('sheetSize')} (${T(`sheet${rank}`)})`,
    onChange: pos => sheetKeep = pos,
    onSettle: settled
  });
  show('profile');
  // à l'ouverture, seulement la réserve de l'appareil : Open-Meteo n'est lu que sur « Charger »
  load({
    cacheOnly: true
  });
}

export function unmount() {
  stop?.();
  stop = null;
}
