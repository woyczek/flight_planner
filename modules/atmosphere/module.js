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
  routeMidpoint
} from '../../frame/lib/flight_path.js';
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
  diverging,
  sectionLegend
} from './section.js';
import {
  svg
} from '../../frame/lib/icons.js';
// socle de carte du module Carte, partagé (modules/maps/INTEGRATION.md § 7)
import {
  styleFor,
  startTiles as startMapTiles,
  mapSize,
  setBottomInset,
  isOwnResize,
  loadRender,
  loadOutlines,
  plainView,
  drawPlain
} from '../maps/lib/map_base.js';
import {
  createAxisWindow
} from '../maps/lib/axis_window.js';
// feuille à trois positions : primitive du cadre (frame/INTEGRATION.md § 11)
import {
  createSheet
} from '../../frame/lib/sheet.js';
import {
  TX
} from './texts.js';
// carte météo (grille du vol et synoptique monde) : la bibliothèque partagée avec la Carte
import {
  createWeatherMap,
  gridRequest,
  copiesFor,
  inBox,
  halo,
  MAP_FIXED
} from './lib/weather_map.js';
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
  reads: ['pilot/', 'cache/weather/', 'cache/atmosphere/', 'airline/map_profiles.json'],
  // réserve météo partagée (politique « cache », jamais synchronisée) ; réglages de l'écran et TAF gardés sur l'appareil
  writes: [{
    prefix: 'cache/weather/',
    policy: 'cache'
  }, {
    prefix: 'cache/atmosphere/',
    policy: 'cache'
  }],
  files: ['atmo.js?v=0', 'demo.js?v=0', 'weather_store.js?v=0', 'world.js?v=0', 'lib/weather_map.js?v=0', 'section.js?v=0',
    'texts.js?v=0',
    '../maps/lib/map_base.js?v=0', '../maps/lib/axis_window.js?v=0',
    '../../frame/lib/sheet.js?v=0', '../../frame/lib/geo.js?v=0', '../../frame/lib/flight_path.js?v=0',
    '../../frame/lib/flight_time.js?v=0', '../fuel/winds.js?v=0', '../fuel/weather.js?v=0',
    '../maps/render.js?v=0',
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
/** Attente des tuiles avant le fond uni (ms). */
const TILE_WAIT = 8000;
/** Curseur « date du vol » : de l'heure prévue à +72 h (la dernière échéance publiée du synoptique monde). */
const SHIFT_MAX = 72;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const R = Math.PI / 180;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

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
/* la carte et sa surcouche ont la taille du module entier, sous la feuille : un mouvement de la feuille découvre de la carte déjà
   dessinée, sans redimensionner MapLibre (plus de clignotement ni de zone grise au glisser) ; --at-hide-b / -r : la part cachée
   par la feuille (en bas en portrait, à droite en paysage), où les contrôles de MapLibre ne vont pas */
[data-module="atmosphere"] .at-map{position:absolute;left:0;top:0;width:var(--at-full-w,100%);height:var(--at-full-h,100%);touch-action:none}
[data-module="atmosphere"] .at-map .maplibregl-ctrl-bottom-right{right:var(--at-hide-r,0px)}
[data-module="atmosphere"] :is(button,select,input,label){touch-action:manipulation}
[data-module="atmosphere"] canvas.at-over{position:absolute;left:0;top:0;width:var(--at-full-w,100%);height:var(--at-full-h,100%);z-index:2;pointer-events:none}
[data-module="atmosphere"] .at-box.at-flat canvas.at-over{pointer-events:auto}
[data-module="atmosphere"] .at-layers{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0 16px;font-size:.92em}
[data-module="atmosphere"] .at-layers>div{display:flex;flex-direction:column;min-width:0}
[data-module="atmosphere"] .at-layers b{margin:2px 0}
[data-module="atmosphere"] .at-layers label{display:flex;gap:8px;align-items:center;min-height:36px}
[data-module="atmosphere"] .at-layers .at-key{width:22px;flex:none;display:inline-block;height:0;border-top:2px solid currentColor}
[data-module="atmosphere"] .at-layers .at-ramp{width:22px;height:9px;border-radius:2px;flex:none;display:inline-block}
[data-module="atmosphere"] .at-layers>p{grid-column:1/-1;margin:6px 0 0;font-size:.9em;color:var(--sog-muted)}
[data-module="atmosphere"] .at-layers>p.at-mapnote{margin:0 0 4px;color:var(--sog-fg)}
[data-module="atmosphere"] .at-layers p.at-zone{display:flex;gap:8px;align-items:center;margin:4px 0 0;font-size:.9em;color:var(--sog-muted)}
[data-module="atmosphere"] .at-layers p.at-zone .at-key{box-sizing:border-box}
[data-module="atmosphere"] .at-maptip{position:absolute;z-index:6;pointer-events:none;background:var(--sog-chart-bg);color:var(--sog-fg);border:1px solid var(--sog-border);border-radius:var(--sog-radius-s,6px);padding:5px 7px;font-size:12px;line-height:1.35;box-shadow:var(--sog-shadow);white-space:nowrap;display:none;font-variant-numeric:tabular-nums}
[data-module="atmosphere"] .f-sheet-panel{container-type:inline-size}
[data-module="atmosphere"] .f-sheet-head>button:not(.f-sheet-grip):not(.f-sheet-close){flex:none;min-height:0;height:100%;min-width:var(--sog-touch,44px);padding:0 8px;border:0;border-radius:0;background:none}
[data-module="atmosphere"] .f-sheet-body.at-dbody{position:relative}
/* puces du dessin, ◀ ▶ des tranches et « i » (§ 7.1.13, 4e affinement, et 14) : toujours dans la ligne de la poignée, à droite,
   avant ✕ ; nue, la primitive du cadre leur donne 28 px et une zone de toucher de 44 ; leur nombre ne change pas (une puce sans
   objet est désactivée, pas retirée) */
[data-module="atmosphere"] .at-chips{flex:none;display:flex;align-items:center;gap:4px;height:100%}
[data-module="atmosphere"] .at-chips[hidden]{display:none}
[data-module="atmosphere"] .f-sheet-head:not(.f-sheet-head-bare)>.at-chips{gap:0}
[data-module="atmosphere"] .f-sheet-head:not(.f-sheet-head-bare)>.at-chips>button{width:var(--sog-touch,44px);height:100%;min-height:0;margin:0;padding:0;border:0;border-radius:0;background:none;color:inherit;box-shadow:none}
[data-module="atmosphere"] .at-chips>button:disabled{opacity:.35;cursor:default}
[data-module="atmosphere"] .f-sheet-head>.at-whole{flex:none;box-sizing:border-box;min-height:0;height:100%;min-width:44px;margin:0;padding:0 8px;border:0;border-radius:var(--sog-radius);background:none;color:var(--sog-accent);font:600 var(--sog-size-xs,12px)/1 inherit;font-family:inherit;white-space:nowrap;cursor:pointer;touch-action:manipulation}
[data-module="atmosphere"] .f-sheet-head>.at-whole[hidden]{display:none}
/* la coupe : deux doigts sont la fenêtre (pincement, glisser), un doigt le toucher ; pas de défilement de page sous le dessin */
[data-module="atmosphere"] .f-sheet-body.at-dbody.at-plot{touch-action:none}
[data-module="atmosphere"] .at-chip-i{font:italic 600 16px/1 Georgia,serif}
[data-module="atmosphere"] .at-chips>button[aria-pressed=true]{color:var(--sog-accent)}
/* légende du dessin (règle 14) : panneau translucide sur le dessin, en haut à gauche */
[data-module="atmosphere"] .at-legend{position:absolute;z-index:3;left:4px;top:4px;max-width:calc(100% - 8px);max-height:calc(100% - 8px);overflow:auto;box-sizing:border-box;display:grid;gap:3px;padding:6px 8px;font-size:12px;line-height:1.3;background:color-mix(in srgb,var(--sog-surface) 90%,transparent);border:1px solid var(--sog-border);border-radius:var(--sog-radius-s,6px);box-shadow:var(--sog-shadow);cursor:pointer}
[data-module="atmosphere"] .at-legend>div{display:flex;gap:8px;align-items:center}
[data-module="atmosphere"] .at-legend svg{flex:none}
[data-module="atmosphere"] .at-when{flex:none;display:flex;align-items:center;gap:10px;height:30px;padding:0 12px;font-size:12px}
/* la ligne d'heure a une largeur fixe : un texte plus long (le jour ajouté, l'alerte) ne raccourcit jamais le curseur, dont le
   bouton glisserait sous le doigt et changerait l'heure en boucle */
[data-module="atmosphere"] .at-when .at-track{position:relative;flex:1 1 auto;min-width:0;display:flex;align-items:center;height:100%}
[data-module="atmosphere"] .at-when input{flex:1 1 auto;min-width:0;margin:0;accent-color:var(--sog-accent);touch-action:manipulation}
[data-module="atmosphere"] .at-when output{flex:none;box-sizing:border-box;width:17em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums;color:var(--sog-muted)}
@container (max-width:560px){[data-module="atmosphere"] .at-when output{width:13em}}
/* heures du curseur couvertes par la prévision lue (montrée seulement quand une partie ne l'est pas) */
[data-module="atmosphere"] .at-cover{position:absolute;bottom:7px;height:3px;border-radius:2px;background:var(--sog-accent);opacity:.45;pointer-events:none;left:calc(8px + (100% - 16px) * var(--a,0));width:calc((100% - 16px) * (var(--b,1) - var(--a,0)))}
[data-module="atmosphere"] .at-cover[hidden]{display:none}
[data-module="atmosphere"] .at-when output.at-out{color:var(--sog-warn,#b26a00)}
[data-module="atmosphere"] .f-sheet-body.at-dbody.at-plot{overflow-x:hidden;overflow-y:auto}
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
      wind: true,
      jet: true,
      conv: true
    },
    mapLevel: 'sfc',
    shiftH: 0 // heures ajoutées au départ prévu (curseur ; pour la visite, jamais gardé)
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
    <button type="button" class="at-whole" data-at="whole" hidden title="${esc(T('winWholeHelp'))}" aria-label="${esc(T('winWholeHelp'))}">${esc(T('winWhole'))}</button>
    <div class="at-chips" role="group" data-at="chips" aria-label="${esc(T('sliceNav'))}" hidden><button type="button" data-at="prev" aria-label="${esc(T('slicePrev'))}" title="${esc(T('slicePrev'))}">◀</button><button type="button" data-at="next" aria-label="${esc(T('sliceNext'))}" title="${esc(T('sliceNext'))}">▶</button><button type="button" class="at-chip-i" data-at="legendBtn" aria-pressed="false" aria-label="${esc(T('legend'))}" title="${esc(T('legend'))}">i</button></div>
    <button type="button" class="f-sheet-close" data-at="dclose" aria-label="${esc(T('backProfile'))}" title="${esc(T('backProfile'))}" hidden>✕</button></div>
  <div class="at-when" data-at="when"><span class="at-track"><input type="range" min="0" max="${SHIFT_MAX}" step="1" value="0" data-at="shift" aria-label="${esc(T('whenAria'))}"><span class="at-cover" data-at="cover" hidden title="${esc(T('coverHelp'))}"></span></span><output data-at="whenOut"></output></div>
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
      // la date du vol du vol partagé (Carburant, « Date du vol ») ; sinon la copie de weather.when ; sinon maintenant
      when: rec.planned_at || rec.weather?.when || null,
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
    const {
      days,
      from
    } = forecastDaysFor(cacheOnly);
    if (S.data === 'demo') return {
      locs: A.locations(Demo.forecast(places, vars, from, days * 24)),
      weight: 0
    };
    const r = await W.forecast(places, vars, {
      model: S.model.id,
      days,
      from,
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

  /** Jours de prévision (UTC) : { from (premier jour, ms : aujourd'hui, ou le jour du départ d'un vol daté d'avant), days } ;
   *  en lecture de la réserve, ceux du vol à l'heure choisie ; au chargement, tous ceux que le curseur peut atteindre (prévu +
   *  72 h + le vol) — Open-Meteo compte les lieux et les variables, pas les jours : le curseur ne coûte ensuite plus rien. */
  function forecastDaysFor(cacheOnly) {
    const until = (cacheOnly ? S.depTime || depValue() : depValue() + SHIFT_MAX * 3600) + 10 * 3600,
      today = Date.parse(new Date().toISOString().slice(0, 10)),
      // un vol daté d'avant aujourd'hui : ses jours passés sont demandés aussi (Open-Meteo les sert, jusqu'à 92 jours ;
      // utilisateur, 29 octobre : « pas de météo avant H+56 » sur un vol du 26), sinon la lecture commence aujourd'hui
      depDay = Date.parse(new Date(Math.min(S.depTime || depValue(), depValue()) * 1000).toISOString().slice(0, 10)),
      from = Math.max(today - 92 * 864e5, Math.min(today, depDay));
    return {
      from,
      days: clamp(Math.ceil((until * 1000 - from) / 864e5), 2, 16 + Math.round((today - from) / 864e5))
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
  // fenêtre sur l'axe des distances de la coupe (règle 20, l'aide de la Carte : le même geste) : deux doigts zooment et
  // déplacent, double toucher ou double clic, ou « Vol entier », la rend entière, Ctrl + molette zoome ; un doigt reste le
  // toucher qui ouvre une tranche. Gardée pour la vie de la page, jamais enregistrée ; une autre route la remet entière.
  let winRaf = 0,
    tapTimer = 0;
  const axw = createAxisWindow(dbody, {
    total: () => S.traj?.total || 0,
    min: 5,
    plot: () => S.xsGeo ? {
      x0: S.xsGeo.x0,
      x1: S.xsGeo.x0 + S.xsGeo.pw
    } : null,
    enabled: () => S.view === 'profile' && !!S.traj && !dragging(),
    onChange: () => {
      winRaf ||= requestAnimationFrame(() => {
        winRaf = 0;
        if (alive && S.view === 'profile' && S.traj) drawProfile();
      });
    }
  });
  /** « Vol entier » dans la ligne de la poignée : seulement devant la coupe, tant que la fenêtre est resserrée. */
  const winSync = () => {
    const on = S.view === 'profile' && !!S.traj && axw.zoomed;
    if ($('whole').hidden === on) $('whole').hidden = !on;
  };

  /** Affiche un contenu du bloc : profil (défaut), tranche locale, détails, réglages, couches. */
  function show(view) {
    if (S.view !== view && sheet?.pos === 'collapsed') sheet.set('default', true);
    S.view = view;
    setAttr(btnFlight, 'aria-pressed', String(view === 'settings'));
    setAttr(btnInfo, 'aria-pressed', String(view === 'info'));
    setAttr(btnLayers, 'aria-pressed', String(view === 'layers'));
    $('dclose').hidden = view === 'profile';
    // ◀ ▶ des tranches de la route : en colonne à droite du dessin (portrait), en ligne au-dessus (paysage), comme les puces de
    // la Carte (§ 7.1.13) ; le dessin laisse la place de la colonne
    // les puces d'un dessin, toujours trois : ◀ ▶ actives sur une tranche de la route seulement
    $('chips').hidden = !(view === 'profile' || view === 'slice');
    $('prev').disabled = $('next').disabled = !(view === 'slice' && S.local?.kind === 'route');
    winSync();
    if (view !== 'profile' && view !== 'slice') S.legend = false;
    dbody.classList.toggle('at-plot', view === 'profile' || view === 'slice');
    drawData();
    schedule();
  }

  function drawData() {
    if (!alive) return;
    const v = S.view;
    bareHead(null);
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
    bareHead(T('cutAria'));
    // une autre route : la coupe repart entière (la fenêtre vit avec la page, jamais gardée)
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
      cloudRgb: cloudRgb(),
      dark: dark(),
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
      // fenêtre resserrée : un double toucher la rend entière, le premier toucher attend donc un instant avant d'ouvrir la
      // tranche (un second toucher l'annule)
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
    syncWeather();
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
    syncWeather();
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
    if (col) bareHead(head);
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
    showLegend();
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
  /** Un glisser de la poignée est en cours (la feuille suit le doigt : le cadre lui ôte sa transition). */
  const dragging = () => $('data').classList.contains('f-sheet-nt');
  /** La carte à la taille du module entier (sous la feuille) et la part que la feuille en cache : posées seulement quand elles
   *  changent ; MapLibre ne change de taille qu'avec le module (fenêtre, rotation), jamais avec la feuille. */
  function sizeMap() {
    const box = $('box'),
      st = box.style,
      fw = Math.max(1, el.clientWidth - box.offsetLeft),
      fh = Math.max(1, el.clientHeight - box.offsetTop),
      set = (k, v) => st.getPropertyValue(k) !== v && st.setProperty(k, v);
    set('--at-full-w', `${fw}px`);
    set('--at-full-h', `${fh}px`);
    set('--at-hide-r', `${Math.max(0, fw - box.clientWidth)}px`);
    set('--at-hide-b', `${Math.max(0, fh - box.clientHeight)}px`);
    if (S.map) {
      mapSize(S.map, $('map'));
      // les contrôles du bas de MapLibre au-dessus de la feuille (règle 17 ; map_base, la même fonction que la Carte) ; en
      // paysage la feuille cache la droite : la règle --at-hide-r les décale à gauche de la colonne
      setBottomInset(S.map, Math.max(0, fh - box.clientHeight));
    }
  }
  /** Après un changement de taille (feuille, rotation ; onSettle de la feuille, 120 ms après le dernier) : le fond
   *  MapLibre reprend la taille du cadre, la route reste cadrée tant que l'utilisateur n'a pas déplacé la carte, le bloc
   *  est redessiné s'il n'est plus à la taille de son dernier dessin. */
  function settled() {
    // pendant un glisser de la poignée, rien : la feuille suit le doigt, tout est repris une fois au lâcher
    if (!alive || dragging()) return;
    applyBare();
    sizeMap();
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
    sizeMap(); // MapLibre lit la taille de son conteneur à sa création : celle du module entier
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
        // le monde répété : la carte fait le tour par la droite comme par la gauche (option du socle)
        worldCopies: true,
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
    sizeMap();
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
      where = `${P.lat.toFixed(2)}° ${A.wrapLon(P.lon).toFixed(2)}°`,
      wp = wm.worldPoint(P.lat, P.lon),
      x = wp?.values || null,
      deg = v => v == null ? '—' : `${v < 0 ? '−' : ''}${fmtNum(Math.abs(v))} °C`,
      pc = v => v == null ? '—' : `${fmtNum(v)} %`;
    sheetTitle(x ? T('worldPoint', {
      p: where,
      at: fmtHM(wp.time)
    }) : where);
    const box = document.createElement('div');
    box.className = 'at-pad';
    // tout ce que porte la publication (les variables absentes d'une source sont omises)
    const rows = x ? [
      [T('wpP'), x.p == null ? '—' : `${fmtNum(x.p)} hPa`],
      [T('wpWind'), fmtWind(x.wd, x.ws)],
      [T('wpT'), deg(x.t)],
      [T('wpCloud'), pc(x.cc)],
      'ccl' in x && [T('wpLayers'), [x.ccl, x.ccm, x.cch].map(v => v == null ? '—' : fmtNum(v)).join(' / ') + ' %'],
      'pr' in x && [T('wpPr'), x.pr == null ? '—' : `${fmtNum(x.pr, 1)} mm/h`],
      'vis' in x && [T('wpVis'), x.vis == null ? '—' : `${fmtNum(x.vis / 1000, 1)} km`],
      'cape' in x && [T('wpCape'), x.cape == null ? '—' : `${fmtNum(Math.round(x.cape / 10) * 10)} J/kg`],
      'frz' in x && [T('wpFrz'), x.frz == null ? '—' : x.frz < 100 ? T('wpFrzSfc') : `${fmtNum(Math.round(x.frz / 100) * 100)} ft`],
      'trop' in x && [T('wpTrop'), x.trop == null ? '—' : fmtLvl(x.trop)],
      'js' in x && [T('wpJet'), fmtWind(x.jd, x.js)]
    ].filter(Boolean) : null;
    box.innerHTML = rows ? `<dl class="at-kv">${rows.map(([k2, v]) => `<div><dt>${esc(k2)}</dt><dd>${esc(v)}</dd><dd></dd></div>`).join('')}</dl>
      <p class="f-muted" style="margin:8px 0 0;font-size:12px">${esc(T('worldPointNote', { src: wp.source, step: wp.step, run: wp.run ? fmtHM(wp.run) : '—' }))}</p>` :
      `<p class="f-muted">${esc(T(wp?.reading ? 'worldReading' : 'worldNone'))}</p>`;
    dbody.replaceChildren(box);
  }
  /** Vue courante : projection (MapLibre, sinon Mercator du fond uni sur l'emprise du vol) et ses dimensions. */
  function view() {
    const box = $('box'),
      mp = $('map'),
      Wd = Math.max(1, mp.clientWidth || box.clientWidth),
      H = Math.max(1, mp.clientHeight || box.clientHeight);
    if (S.map) return {
      W: Wd,
      H,
      toC: (lat, lon) => S.map.project([lon, lat])
    };
    const b = fitBox(),
      // le fond uni cadre la route dans la partie visible (au-dessus de la feuille), dessiné sur toute la surface
      m = window.MapsRender ? plainView(b, Math.max(1, box.clientWidth), Math.max(1, box.clientHeight), 12) : null;
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
      border: tok('--sog-border'),
      accent: tok('--sog-accent'),
      route: tok('--at-computed'),
      ice: tok('--at-ice'),
      dark: t ? t.dark : dark()
    };
  };

  /** La carte météo (bibliothèque partagée avec la Carte, lib/weather_map.js ; INTEGRATION.md § 6) : la grille du vol de
   *  l'écran (lue ici, démonstration comprise) fondue dans le synoptique monde, un seul calcul des deux côtés ; ce module
   *  dessine par-dessus la route, la trajectoire et leurs repères. */
  const wm = createWeatherMap({
    ctx,
    layers: S.mapLayers,
    colors: () => {
      const K = pal();
      return {
        bg: K.bg,
        fg: K.fg,
        muted: K.muted,
        dark: K.dark,
        cloud: cloudRgb()
      };
    },
    onChange: () => {
      if (!alive) return;
      baseTitle();
      if (S.view === 'wpoint') drawData();
      if (S.view === 'layers') layersCard();
      schedule();
    }
  });
  /** Les options de la carte météo d'après l'écran : le vol et son niveau, la grille lue, l'altitude et l'heure de la
   *  carte, les couches. */
  function syncWeather() {
    wm.update({
      flight: S.flight ? {
        points: S.flight.points,
        levelFt: S.levelFt
      } : null,
      grid: S.grid || null,
      levelFt: S.traj ? mapFt() : null,
      time: worldTime(),
      layers: S.mapLayers,
      gridMax: +$f('gridMax').value || 48
    });
  }
  /** Emprise de la grille du vol (lue, sinon celle qui le serait) ; null sans vol. */
  const gridBox = () => S.grid?.g.bbox || S.gridBox || null;
  /** Bornes de la vue [w, s, e, n] (fond MapLibre) ; null sur le fond uni (cadré sur le vol). */
  const viewBounds = () => {
    if (!S.map) return null;
    const b = S.map.getBounds();
    return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
  };
  /** La part de la carte que la feuille ne cache pas (la carte est dessinée dessous aussi) : ce que l'on regarde. */
  const visibleBounds = () => {
    if (!S.map) return null;
    const box = $('box'),
      sw = S.map.unproject([0, box.clientHeight]),
      ne = S.map.unproject([box.clientWidth, 0]);
    return [sw.lng, sw.lat, ne.lng, ne.lat];
  };
  /** Titre du synoptique : l'heure montrée, le run et l'échéance. */
  function worldTitle() {
    const i = wm.info();
    if (!i.world) return T(i.worldReading ? 'worldReading' : 'worldNone');
    if (i.world.time == null || i.world.h == null) return i.world.run ? T('worldTitleRun', {
      run: fmtHM(i.world.run)
    }) : T('worldReading');
    return T('worldTitle', {
      at: fmtHM(i.world.time),
      run: fmtHM(i.world.run),
      h: i.world.h
    });
  }
  /** Heure montrée par la carte météo : celle de la carte (passage du vol), sinon le départ, sinon maintenant. */
  const worldTime = () => S.route ? mapTime() : S.depTime || Date.now() / 1000;
  /** Trajectoire calculée colorée par la température rencontrée, plus épaisse dans les nuages (altitude « trajectoire »). */
  function trajGeometry() {
    if (!(S.grid && S.mapLevel === 'traj' && S.along)) return null;
    const dk = dark();
    if (S.tgeo?.along === S.along && S.tgeo.dk === dk) return S.tgeo.pts;
    S.tgeo = {
      along: S.along,
      dk,
      pts: S.along.map(a => ({
        lat: a.lat,
        lon: a.lon,
        c: a.x && !a.x.below && a.x.tC != null ? `rgb(${diverging(a.x.tC, 40, dk).join(',')})` : '#888',
        w: (a.x?.cc ?? 0) >= 50 ? 6 : 4,
        ice: a.ice
      }))
    };
    return S.tgeo.pts;
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
    // la carte météo (grille du vol fondue dans le synoptique monde), puis le vol par-dessus
    const bounds = viewBounds();
    wm.draw(c, {
      W: v.W,
      H: v.H,
      project: P,
      bounds,
      visible: visibleBounds(),
      zoom: S.map?.getZoom?.() ?? 6
    });
    const out = wm.info().outside;
    if ((out === 2) !== !!S.worldShown) {
      S.worldShown = out === 2;
      baseTitle();
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
    // le vol sur chaque copie du monde visible (la carte fait le tour par la droite comme par la gauche)
    const fb = fitBox(),
      gb = gridBox() || [fb.w, fb.s, fb.e, fb.n],
      traj = trajGeometry();
    for (const off of copiesFor(bounds, Math.min(gb[0], fb.w), Math.max(gb[2], fb.e))) drawFlight(off ? (la, lo) => P(la, lo + off) : P);

    /** Le vol à une projection : la trajectoire colorée, la route, les points, le lieu de la tranche locale. */
    function drawFlight(P) {
      // trajectoire colorée par la température rencontrée, plus épaisse dans les nuages, ❄ au givrage
      if (traj) {
        const q = traj.map(t => P(t.lat, t.lon));
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
          c.strokeStyle = traj[k].c;
          c.lineWidth = traj[k].w;
          c.stroke();
          if (traj[k].ice >= 1 && k % 4 === 0) halo(c, '❄', q[k].x, q[k].y - 9, traj[k].ice === 2 ? K.ice : '#9a6b00', K.bg);
        }
      }
      // route et points
      const pts = S.flight.points;
      if (!traj) {
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
  }

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

  function mapTip(lat, lon, pt, ev) {
    const box = $('mapTip');
    if (!box || ev?.pointerType === 'touch' || matchMedia('(hover: none)').matches) return;
    const x = wm.at(lat, lon);
    if (!x) return box.style.display = 'none';
    box.innerHTML = `<b>${lat.toFixed(2)}° ${A.wrapLon(lon).toFixed(2)}°</b> <span class="m">${x.ft == null ? esc(T('ground')) : fmtLvl(x.ft)}</span><br>` +
      `${fmtT(x.t)} · ${esc(T('clouds'))} ${fmtNum(x.cc)} %${x.p == null ? '' : ` · ${fmtNum(x.p, 1)} hPa`}`;
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

  /** Part de la carte cachée par la feuille (px), en bas ('b') ou à droite ('r'). */
  const hidden = k => parseFloat($('box').style.getPropertyValue(`--at-hide-${k}`)) || 0;

  function fitMap() {
    if (!S.map || !S.flight) return schedule();
    const b = fitBox();
    S.map.fitBounds([
      [b.w, b.s],
      [b.e, b.n]
    ], {
      padding: {
        top: 56,
        bottom: 24 + hidden('b'),
        left: 24,
        right: 56 + hidden('r')
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
    // les couches de la carte météo : la légende de la bibliothèque (la Carte étiquette son panneau de la même façon)
    layersBox.innerHTML = (note ? `<p class="at-mapnote">${esc(T('mapTitle'))} · ${esc(note)}</p>` : '') + `<div><b>${esc(T('mapTitle'))}</b>` +
      wm.legend().map(ly => `<label><input type="checkbox" data-g="mapLayers" data-k="${ly.key}"${ly.on ? ' checked' : ''}> ${ly.swatch
        .barb ? barbKey : key(ly.swatch.css, ly.swatch.ramp)} ${esc(ly.label)}</label>`).join('') +
      // les deux côtés de la limite tracée : le modèle et la maille de la zone du vol, ceux du synoptique autour
      (wm.edge ? wm.info().zones.map(z => `<p class="at-zone">${key(z.key === 'flight' ? 'border:1px solid var(--sog-fg);height:8px' :
        'border:1px dashed var(--sog-muted);height:8px')} ${esc(z.label)}</p>`).join('') : '') +
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

  let bareLabel = null;
  /** Pas de titre au-dessus d'un dessin (V3_SPECIFICATION § 7.1 règle 13) : la coupe et la tranche ont une poignée nue
   *  (barrette, puces et boutons de la ligne) ; label : ce que dit le dessin, pour les lecteurs d'écran ; null : la tête
   *  avec son titre (Vol, Détails, Couches, textes). */
  function bareHead(label) {
    bareLabel = label;
    applyBare();
  }
  /** La tête nue en position normale seulement : agrandie, réduite ou en colonne (paysage), il y a la place et le titre
   *  est alors la seule chose qui dise ce qu'on regarde (règle 13 affinée). Revue à chaque arrêt de la feuille. */
  function applyBare() {
    const head = $('grip').parentNode,
      chips = $('chips'),
      on = !!bareLabel && sheet?.pos === 'default' && !document.documentElement.classList.contains('f-land');
    head.classList.toggle('f-sheet-head-bare', on);
    // « i » : active quand un dessin est là (la légende de ce qui est dessiné)
    chips.querySelector('[data-at="legendBtn"]').disabled = !bareLabel;
    if (on) {
      setAttr(head, 'aria-label', bareLabel);
      setAttr(head, 'role', 'group');
    } else if (head.hasAttribute('aria-label')) head.removeAttribute('aria-label');
  }

  /** Légende du dessin en superposition (règle 14) : les séries réellement dessinées, produites par section.js (la même pour
   *  la Carte) ; ouverte et fermée par la puce « i », fermée aussi par un toucher sur elle ou Échap. Reposée après chaque
   *  dessin (le corps est réécrit). */
  function showLegend() {
    const btn = $('legendBtn'),
      open = !!S.legend && (S.view === 'profile' || S.view === 'slice') && !!dbody.querySelector('svg');
    setAttr(btn, 'aria-pressed', String(open));
    let box = dbody.querySelector('.at-legend');
    if (!open) return box?.remove();
    const rows = sectionLegend({
      kind: S.view === 'slice' ? 'slice' : 'cut',
      layers: S.xsLayers,
      strips: S.view === 'profile' && dbody.clientHeight >= 260,
      cloudRgb: cloudRgb(),
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
    // sans coupe, la carte montre le synoptique monde (vue hors de la grille du vol, ou sans vol) : le titre dit ce qu'on
    // regarde ; avec une coupe, le bloc la montre et le titre reste le sien (élargir le bloc ne le change pas)
    if (S.view === 'profile' && S.worldShown && !S.traj) return sheetTitle(worldTitle());
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
  /** Heure UTC d'un instant, avec le jour quand ce n'est pas aujourd'hui. */
  const fmtWhen = t => {
    const d = new Date(t * 1000);
    return d.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10) ? fmtHM(t) : `${d.toLocaleDateString(lang(), {
      weekday: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    })} ${fmtHM(t)}`;
  };
  /** Ligne du curseur : le décalage et l'heure de départ qui en résulte ; en alerte hors de la prévision lue. */
  function whenText() {
    const t = S.depTime || depValue() + S.shiftH * 3600,
      out = $('whenOut'),
      s = S.shiftH ? T('whenPlus', {
        h: S.shiftH,
        at: fmtWhen(t)
      }) : T('whenPlanned', {
        at: fmtWhen(t)
      });
    // hors de la prévision lue : l'alerte dite sur la ligne du curseur, bloc déplié comme replié (le titre la porte aussi)
    const oor = !!(S.route && S.outOfRange);
    setText(out, oor ? `⚠ ${s}` : s);
    setAttr(out, 'title', oor ? `${s}
${T('outOfRange')}` : s);
    out.classList.toggle('at-out', oor);
    coverBand();
    const v = String(S.shiftH);
    if ($('shift').value !== v) $('shift').value = v;
  }
  /** Bande des heures du curseur couvertes par la prévision lue (le vol entier dedans) : montrée quand une partie du curseur
   *  ne l'est pas, ces heures-là montrant l'heure la plus proche. */
  function coverBand() {
    const band = $('cover'),
      tm = S.route?.locs?.[0]?.times,
      end = S.route?.samples?.at(-1)?.t;
    let a = 0,
      b = 1;
    if (S.route && tm?.length && Number.isFinite(end) && Number.isFinite(S.depTime)) {
      const base = depValue(),
        dur = Math.max(0, end - S.depTime);
      a = clamp((tm[0] - 3600 - base) / 3600 / SHIFT_MAX, 0, 1);
      b = clamp((tm.at(-1) + 3600 - dur - base) / 3600 / SHIFT_MAX, 0, 1);
    }
    const part = a > 0 || b < 1;
    if (band.hidden === part) band.hidden = !part;
    if (!part) return;
    // aucune heure du curseur ne couvre le vol entier : bande vide, l'alerte seule le dit
    const va = a.toFixed(4),
      vb = Math.max(a, b).toFixed(4);
    if (band.style.getPropertyValue('--a') !== va) band.style.setProperty('--a', va);
    if (band.style.getPropertyValue('--b') !== vb) band.style.setProperty('--b', vb);
  }
  /** Alerte flottante quand l'heure du vol sort de la prévision lue (une fois par sortie, au relâché ou après une lecture). */
  let rangeWarned = false;

  function warnRange() {
    const oor = !!(S.route && S.outOfRange);
    if (oor && !rangeWarned) notify(T('outOfRange'));
    rangeWarned = oor;
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
    whenText(); // l'heure de départ du vol lu (sa date du vol), même sans prévision
    if (!f) return setSum('');
    setSum([ac, `${f.dep} → ${f.arr}`, fmtLvl(S.levelFt), fmtWhen(S.depTime), S.data === 'demo' ? T('demoSrc') :
      `${S.model?.name || ''}${S.run ? ` · run ${fmtHM(S.run)}` : ''}`
    ].filter(Boolean).join(' · ') + (S.outOfRange ? ' ⚠' : ''));
  }
  /** Ce que montre la carte (heure, niveau et lignes), en tête des couches ; « Charger » quand la grille manque. */
  function mapNote() {
    const i = wm.info();
    if (i.state !== 'ok' && S.traj) return T('mapLoad');
    return [i.time ? fmtHM(i.time) : '', i.pLabel].filter(Boolean).join(' · ');
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
    whenText();
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
  const gridLevels = () => gridRequest(S.flight.points, S.levelFt, +$f('gridMax').value || 48).levels;

  /** Rendu de tout ce qui dépend des données : sélecteur d'altitude, bloc du bas, carte. */
  function render() {
    if (!S.traj || !alive) return;
    if (S.grid) mapLevelOptions();
    syncWeather();
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
      S.depTime = depValue() + S.shiftH * 3600;
      // le point qui choisit le modèle : le même que la Carte (frame/lib/flight_path.js routeMidpoint, mi-longueur de la route)
      const mid = routeMidpoint(f.points);
      S.model = A.modelFor(mid.lat, mid.lon);
      S.run = null;
      flightSum();
      syncWeather();
      // un lieu tous les 50 NM, 24 au plus (comme Carburant) : l'échantillonnage tient le quota d'abord
      // la grille de la carte : la demande partagée avec la Carte (gridRequest), au niveau choisi et à celui du vol courant
      // quand il diffère (la carte météo de la Carte, au niveau du vol, la trouve alors dans la réserve)
      const smp = sectionPlaces(f.points),
        gq = gridRequest(f.points, S.levelFt, +$f('gridMax').value || 48),
        gq2 = $f('flightSrc').value === 'current' && f.levelFt && f.levelFt !== S.levelFt ? gridRequest(f.points, f.levelFt, +$f(
          'gridMax').value || 48) : null,
        levels = [...new Set([...gq.levels, ...(gq2?.levels || [])])].sort((a, b) => b - a),
        gr = gq.g,
        rLevels = routeLevels(),
        // au niveau choisi, et à celui du vol courant quand il diffère : la coupe de la Carte (au niveau du vol) est alors
        // dans la réserve elle aussi
        rVars = [...new Set([...sectionVars(S.levelFt, f.points), ...($f('flightSrc').value === 'current' && f.levelFt && f
          .levelFt !== S.levelFt ? sectionVars(f.levelFt, f.points) : [])])],
        gVars = [...new Set([...gq.vars, ...(gq2?.vars || [])])];
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
      S.wx = wx;
      S.sel = 0;
      S.local = null;
      compute();
      if (S.view === 'slice') S.view = 'profile';
      show(S.view);
      render();
      fitMap();
      warnRange();
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
        syncWeather();
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
    syncWeather();
    render();
    show('profile');
  };
  $('whole').onclick = () => axw.reset();
  $('legendBtn').onclick = () => {
    S.legend = !S.legend;
    showLegend();
  };
  const legendKey = ev => {
    if (ev.key === 'Escape' && S.legend) {
      S.legend = false;
      showLegend();
    }
  };
  document.addEventListener('keydown', legendKey);
  $('prev').onclick = () => openRouteSlice((S.local?.i ?? 0) - 1);
  $('next').onclick = () => openRouteSlice((S.local?.i ?? 0) + 1);
  // heure, niveau, vitesse : recalcul sans relire la prévision (sauf un niveau que la route ou la grille n'a pas encore :
  // seules ses variables sont demandées)
  const recompute = () => {
    if (!S.route) return;
    S.depTime = depValue() + S.shiftH * 3600;
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
  // curseur « date du vol » : le départ prévu + x heures ; la coupe, la carte du vol et le synoptique monde suivent,
  // depuis ce que l'appareil garde (rien n'est demandé ; au-delà de la prévision lue, « Charger »)
  let shiftFrame = 0;
  $('shift').oninput = () => {
    S.shiftH = +$('shift').value;
    S.depTime = depValue() + S.shiftH * 3600;
    whenText();
    shiftFrame ||= requestAnimationFrame(() => {
      shiftFrame = 0;
      if (!alive) return;
      if (S.traj) {
        compute();
        render();
      } else {
        if (S.flight) flightSum();
        syncWeather();
        baseTitle();
        schedule();
      }
      whenText();
    });
  };
  // relâché au-delà des jours lus à l'ouverture : la réserve relue pour la nouvelle heure (toujours sans appel)
  $('shift').onchange = () => {
    if (S.route && S.outOfRange) load({
      cacheOnly: true
    }).then(warnRange, () => {});
    else warnRange();
  };
  whenText();
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
    if (c.dataset.g === 'mapLayers') {
      syncWeather();
      schedule();
    } else if (S.view === 'profile') drawData();
  };
  // tailles : la carte (MapLibre suit, la surcouche est redessinée) et le bloc du bas (coupe ou tranche à sa nouvelle
  // taille) ; design ou ton changés : fond et dessins repris (réaction à un événement : rien n'est réécrit hors du module)
  // le bloc est redessiné quand sa taille n'est plus celle de son dernier dessin (un dessin pris pendant un glissement est
  // repris à la taille finale)
  const ro = new ResizeObserver(() => {
    if (dragging()) return; // pendant le glisser, rien : onSettle reprend au lâcher
    sizeMap();
    schedule();
    if (`${dbody.clientWidth}x${dbody.clientHeight}` !== S.drawn) sheet?.settle();
  });
  ro.observe(dbody);
  ro.observe($('box'));
  ro.observe(el);
  const repaint = () => {
    colors.clear();
    wm.update({}); // couleurs du design relues au prochain dessin
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
    sizeMap();
    schedule();
  };
  document.addEventListener('visibilitychange', back);
  window.addEventListener('pageshow', back);
  // limite de la zone du vol sur la carte météo : tracée par défaut (règle 15), masquée si l'administrateur l'a choisi
  // (clé edge.show de airline/map_profiles.json, écrite par la carte Administration des Réglages : frame/settings/INTEGRATION § 4 ;
  // la forme ancienne `edge: false` est encore lue)
  const PROFILES = 'airline/map_profiles.json',
    readEdge = async () => {
      const d = await data.get(PROFILES).catch(() => null);
      wm.update({
        edge: d?.edge !== false && d?.edge?.show !== false
      });
      schedule();
      if (S.view === 'layers') layersCard();
    };
  readEdge();
  const unwatchEdge = data.watch(PROFILES, readEdge);
  // vol courant changé (Carburant, Carte, un autre appareil) : relu, la prévision seulement depuis la réserve
  const sig = r => JSON.stringify([r?.route?.points, r?.level, r?.profile, r?.planned_at, r?.weather?.when]);
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
    wm.detach();
    sheet?.stop();
    cancelAnimationFrame(frame);
    ro.disconnect();
    mo.disconnect();
    mq.removeEventListener('change', repaint);
    document.removeEventListener('visibilitychange', back);
    document.removeEventListener('keydown', legendKey);
    axw.stop();
    clearTimeout(tapTimer);
    cancelAnimationFrame(winRaf);
    window.removeEventListener('pageshow', back);
    unwatch?.();
    unwatchEdge?.();
    S.map?.remove();
    S.map = null;
  };
  sheet = createSheet({
    root: el,
    panel: $('data'),
    head: $('grip').parentNode,
    grip: $('grip'),
    pos: sheetKeep,
    ignore: '[data-at="dclose"],[data-at="prev"],[data-at="next"],[data-at="legendBtn"],[data-at="whole"]',
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
