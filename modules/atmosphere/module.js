// Module V3 « Météo » (atmosphere ; SPEC.md, INTEGRATION.md, DECISIONS.md) : l'atmosphère le long du vol courant —
// une carte météo au niveau choisi, la coupe verticale de la route, la tranche d'un point, à l'heure du départ prévu ou
// jusqu'à 72 h plus tard. Vue fixe plein cadre sur le gabarit de la Carte : en-tête · carte · feuille · barre, rien
// d'autre (V3_SPECIFICATION § 7.1, règles 1 à 21).
//
// Ce fichier est le moyeu de l'écran : la déclaration au cadre, l'état, le squelette, les boutons sur la carte, la feuille
// et son en-tête, l'aiguillage des contenus, le chargement. Le reste par souci, chacun sous 60 Ko :
//   · style.js (styles), fmt.js (formats), flight.js (le vol), wx.js (les données : ctx.weather seulement) ;
//   · screen_map.js (la carte, la carte météo, la puce d'altitude), screen_cut.js (coupe, fenêtre, tranches, légende) ;
//   · chargés à leur première ouverture : screen_details.js, screen_flight.js, screen_layers.js.
// Les briques partagées avec la Carte : section.js (dessins de la coupe et de la tranche), lib/weather_map.js (carte météo),
// atmo.js (calculs purs), world.js (synoptique monde, fonctions pures).

import * as A from './atmo.js';
import {
  STYLE
} from './style.js';
import {
  esc,
  clamp,
  setText,
  setAttr,
  fmtHM,
  fmtLvl,
  createFmt
} from './fmt.js';
import {
  EXAMPLE,
  ROUTE_TEXT,
  fromRecord,
  fromText,
  flightSig
} from './flight.js';
import {
  createWx
} from './wx.js';
import {
  createMapScreen
} from './screen_map.js';
import {
  createCut
} from './screen_cut.js';
import {
  sectionModel,
  sectionPlaces,
  sectionVars,
  topFtOf
} from './section.js';
import {
  gridRequest
} from './lib/weather_map.js';
import {
  createSheet
} from '../../frame/lib/sheet.js';

export const meta = {
  id: 'atmosphere',
  apps: ['pilot'],
  level: 1,
  // vue fixe plein cadre (frame/INTEGRATION.md § 9.2) : la carte sous tout le module, la feuille par-dessus
  fixed: true,
  help: true,
  // la météo passe par la couche du cadre (ctx.weather, frame/INTEGRATION.md § 14), qui garde sa propre réserve
  reads: ['pilot/', 'cache/atmosphere/', 'airline/map_profiles.json'],
  // réglages de l'écran gardés sur l'appareil
  writes: [{
    prefix: 'cache/atmosphere/',
    policy: 'cache'
  }],
  files: ['style.js?v=0', 'fmt.js?v=0', 'flight.js?v=0', 'wx.js?v=0', 'screen_map.js?v=0', 'screen_cut.js?v=0',
    'screen_details.js?v=0', 'screen_flight.js?v=0', 'screen_layers.js?v=0',
    'atmo.js?v=0', 'demo.js?v=0', 'world.js?v=0', 'lib/weather_map.js?v=0', 'section.js?v=0', 'texts.js?v=0',
    '../maps/lib/map_base.js?v=0', '../maps/lib/axis_window.js?v=0', '../maps/render.js?v=0',
    '../../frame/lib/sheet.js?v=0', '../../frame/lib/geo.js?v=0', '../../frame/lib/weather_store.js?v=0',
    '../../frame/lib/route_text.js?v=0', '../../frame/lib/metar.js?v=0', '../fuel/winds.js?v=0', '../fuel/weather.js?v=0'
  ],
  // du module Carte, gardés au premier usage : MapLibre, et les contours des pays du fond uni
  lazy: ['../maps/lib/maplibre-gl.js?v=0', '../maps/lib/maplibre-gl.css?v=0', '../maps/lib/outlines.js?v=0'],
  // tuiles appelées par MapLibre lui-même (jamais par ctx.net) ; CSP connect-src du cadre
  net: ['tiles.openfreemap.org']
};

/** Réglages de l'écran gardés sur l'appareil : texte de route, grille, couches, altitude de la carte. */
const UI = 'cache/atmosphere/ui.json';
/** Clé de l'administrateur : la limite de la zone du vol (edge.show), lue par la carte météo (règle 15). */
const PROFILES = 'airline/map_profiles.json';
/** Curseur « date du vol » : de l'heure prévue à +72 h (la dernière échéance publiée du synoptique monde). */
const SHIFT_MAX = 72;
/** Contenus chargés à leur première ouverture. */
const LAZY = {
  details: () => import('./screen_details.js'),
  flight: () => import('./screen_flight.js'),
  layers: () => import('./screen_layers.js')
};
/** Le contenu de la feuille que chacun dessine. */
const VIEW_OF = {
  details: 'info',
  flight: 'settings',
  layers: 'layers'
};

let stop = null;
/** Position de la feuille gardée d'un montage à l'autre dans la même page (la primitive n'en garde pas). */
let sheetKeep = 'default';
/** L'indice « toucher la carte » est donné une fois par page. */
let tapNoted = false;

export async function mount(el, ctx) {
  const F = createFmt(ctx),
    {
      T
    } = F,
    data = ctx.data,
    $ = k => el.querySelector(`[data-at="${k}"]`),
    tri = ctx.identity?.trigram || 'ANON',
    flightPath = `pilot/${tri}/current_flight.json`;
  let alive = true;

  /** L'état de l'écran. */
  const S = {
    flight: null, // le vol montré (flight.js)
    data: 'live', // 'live' : la couche météo ; 'demo' : la démonstration hors ligne
    depTime: 0, // départ montré (s) : le départ prévu + le décalage du curseur
    levelFt: 0,
    cruiseKt: 200,
    mdl: null, // modèle météo { id, name, short }
    run: null,
    route: null, // { samples, locs, levels, weight }
    grid: null, // { g, locs, levels, weight, model }
    gridBox: null,
    wx: null, // terrains : { ids, metars, tafs, note }
    model: null, // modèle de la coupe (section.js)
    traj: null,
    cols: [],
    field: null,
    along: null,
    sel: 0,
    view: 'profile', // contenu de la feuille : profile, slice, info, settings, layers, wpoint
    local: null, // tranche montrée : { kind: 'route', i, lat, lon } ou { kind: 'point', lat, lon, nm, t, offNm, col }
    wpoint: null, // point du monde touché hors de la grille du vol
    legend: false,
    daySpent: 0,
    statusText: '',
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
    shiftH: 0, // heures ajoutées au départ prévu (curseur ; pour la visite, jamais gardé)
    // les choix de « Vol et réglages » (screen_flight.js les montre et les écrit)
    opts: {
      src: 'current', // toujours le vol courant à l'ouverture
      file: null,
      text: ROUTE_TEXT,
      dep: null, // départ choisi à la main (s) ; null : la date du vol
      level: 27000,
      levelTouched: false,
      cruise: null,
      data: ctx.query?.donnees === 'demo' || ctx.query?.data === 'demo' ? 'demo' : 'live',
      grid: 48
    }
  };

  // ---------------------------------------------------------------- couleurs du design
  /** Couleur résolue d'un jeton : sondée dans le module, donc au design et au ton affichés ; gardée jusqu'à leur changement. */
  const probe = document.createElement('i'),
    colors = new Map();
  probe.style.display = 'none';
  const tok = name => {
    if (!colors.has(name)) {
      probe.style.color = `var(${name})`;
      colors.set(name, getComputedStyle(probe).color);
    }
    return colors.get(name);
  };
  const triplet = c => (c.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
  /** Nuit : le fond des graphiques est sombre. */
  const dark = () => {
    const [r, g, b] = triplet(tok('--sog-chart-bg'));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
  };
  const cloudRgb = () => triplet(tok('--sog-muted'));

  // ---------------------------------------------------------------- squelette
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
  <div class="at-when" data-at="when"><input type="range" min="0" max="${SHIFT_MAX}" step="1" value="0" data-at="shift" aria-label="${esc(T('whenAria'))}"><output data-at="whenOut"></output></div>
  <div class="f-sheet-body at-dbody" data-at="dbody"></div>
</section>`;
  el.classList.add('f-sheet');
  el.append(probe);
  const dbody = $('dbody');

  // ---------------------------------------------------------------- l'écran, partagé avec ses parties
  const app = {
    ctx,
    el,
    S,
    $,
    F,
    dbody,
    tri,
    tok,
    dark,
    cloudRgb,
    alive: () => alive,
    /** Un glisser de la poignée est en cours (le cadre marque la feuille) : rien n'est redessiné. */
    dragging: () => $('data').classList.contains('f-sheet-nt'),
    notify: (msg, err = false) => ctx.notify(msg, err ? 'err' : 'warn'),
    statusText: () => S.statusText,
    /** Variables horaires d'une lecture de colonne : celles de la coupe (route, point touché). */
    routeVars: () => sectionVars(S.levelFt, S.flight.points),
    show,
    drawData,
    render,
    status,
    baseTitle,
    sheetTitle,
    bareHead,
    load,
    recompute,
    saveUi,
    depValue,
    onWeather,
    syncWeather: () => map.syncWeather(),
    schedule: () => map.schedule(),
    mapNote: () => map.mapNote(),
    openRouteSlice: i => cut.openRouteSlice(i),
    openPointSlice: (lat, lon) => cut.openPointSlice(lat, lon)
  };
  const wx = app.wx = createWx(ctx, T, () => S.data === 'demo');
  const map = createMapScreen(app);
  const cut = createCut(app);
  app.wm = map.wm;

  // ---------------------------------------------------------------- boutons sur la carte (frame/INTEGRATION.md § 9.3)
  // Couches à gauche ; Vol, Détails, Charger et la puce d'altitude à droite (le plein écran y est ajouté par le cadre)
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
  ov.right.insertBefore(map.lvlChip, btnLoad.nextSibling);

  // ---------------------------------------------------------------- contenus de la feuille
  const lazyMods = {};
  /** Le module d'un contenu chargé à sa première ouverture ; null tant qu'il arrive (le contenu est dessiné à son arrivée). */
  function need(name) {
    const m = lazyMods[name];
    if (m?.mod) return m.mod;
    if (!m) lazyMods[name] = {
      p: LAZY[name]().then(mod => {
        lazyMods[name].mod = mod;
        // dessiné à son arrivée s'il est le contenu montré (un préchargement ne redessine rien d'autre)
        if (alive && S.view === VIEW_OF[name]) drawData();
      }, e => {
        delete lazyMods[name];
        app.notify(String(e?.message || e), true);
      })
    };
    return null;
  }

  /** Montre un contenu de la feuille : coupe (défaut), tranche, détails, vol et réglages, couches, point du monde. */
  function show(view) {
    if (S.view !== view && sheet?.pos === 'collapsed') sheet.set('default', true);
    S.view = view;
    setAttr(btnFlight, 'aria-pressed', String(view === 'settings'));
    setAttr(btnInfo, 'aria-pressed', String(view === 'info'));
    setAttr(btnLayers, 'aria-pressed', String(view === 'layers'));
    const drawing = view === 'profile' || view === 'slice';
    if ($('dclose').hidden !== (view === 'profile')) $('dclose').hidden = view === 'profile';
    // les puces d'un dessin, toujours trois (règle 13) : ◀ ▶ actives sur une tranche de la route seulement
    if ($('chips').hidden !== !drawing) $('chips').hidden = !drawing;
    $('prev').disabled = $('next').disabled = !(view === 'slice' && S.local?.kind === 'route');
    cut.winSync();
    if (!drawing) S.legend = false;
    dbody.classList.toggle('at-plot', drawing);
    drawData();
    map.schedule();
  }
  /** Dessine le contenu montré dans le corps de la feuille. */
  function drawData() {
    if (!alive) return;
    const v = S.view;
    bareHead(null);
    if (v === 'settings') {
      sheetTitle(T('flightTitle'));
      return need('flight')?.drawFlight(app);
    }
    if (v === 'wpoint') return S.wpoint ? map.drawWorldPoint(dbody) : show('profile');
    if (v === 'layers') {
      sheetTitle(T('layers'));
      return need('layers')?.drawLayers(app);
    }
    if (!S.traj) return drawNoForecast();
    // feuille réduite : rien à dessiner (redessiné à sa réouverture, la taille n'étant plus celle du dernier dessin)
    if (sheet?.pos === 'collapsed' && (v === 'profile' || v === 'slice')) return;
    if (v === 'profile') return cut.drawProfile();
    if (v === 'slice') return cut.drawSlice();
    if (v === 'info') {
      baseTitle();
      return need('details')?.drawDetails(app);
    }
  }
  /** Sans coupe : l'état de la lecture ; sans vol, Carburant et l'exemple. */
  function drawNoForecast() {
    baseTitle();
    const p = document.createElement('p');
    p.className = 'at-pad f-muted';
    p.textContent = S.statusText || T('readingFlight');
    if (!S.noFlight) return dbody.replaceChildren(p);
    const go = document.createElement('div');
    go.className = 'at-pad at-go';
    go.innerHTML = `<a class="f-btn primary" href="#fuel">${esc(T('goFuel'))}</a><button type="button" class="f-btn" data-at="seeExample">${esc(T('seeExample'))}</button>`;
    // comme à l'ouverture : la réserve seulement, rien n'est demandé avant « Charger »
    go.lastChild.onclick = () => {
      S.opts.src = 'example';
      saveUi();
      load({
        cacheOnly: true
      });
    };
    dbody.replaceChildren(p, go);
  }

  // ---------------------------------------------------------------- en-tête de la feuille
  let bareLabel = null;
  /** Pas de titre au-dessus d'un dessin (règle 13) : la coupe et la tranche ont la tête nue (barrette, puces, ✕) ; label : ce
   *  que dit le dessin, pour les lecteurs d'écran ; null : la tête avec son titre. */
  function bareHead(label) {
    bareLabel = label;
    applyBare();
  }
  /** La tête nue en position normale, en portrait seulement : agrandie, réduite ou en colonne, le titre dit ce qu'on regarde.
   *  Revue à chaque arrêt de la feuille. */
  function applyBare() {
    const head = $('grip').parentNode,
      on = !!bareLabel && sheet?.pos === 'default' && !document.documentElement.classList.contains('f-land');
    head.classList.toggle('f-sheet-head-bare', on);
    // « i » : active quand un dessin est là
    $('legendBtn').disabled = !bareLabel;
    if (on) {
      setAttr(head, 'aria-label', bareLabel);
      setAttr(head, 'role', 'group');
    } else if (head.hasAttribute('aria-label')) head.removeAttribute('aria-label');
  }
  /** Titre de la poignée : le contenu, puis son contexte (le texte entier et sa note en infobulle). */
  function sheetTitle(s, note = '') {
    const node = $('dtitle'),
      full = note ? `${s}\n${note}` : s;
    setText(node, s);
    if (node.title !== full) node.title = full;
  }
  /** Titre de la coupe et des détails : le contenu, puis le vol en bref ; le synoptique quand la carte le montre surtout. */
  function baseTitle() {
    const ctxt = s => S.sum ? `${s} · ${S.sum}` : s;
    if (S.view === 'profile' && S.worldShown) return sheetTitle(map.worldTitle());
    if (S.view === 'profile') sheetTitle(ctxt(T('profileTitle')), S.route ? T('xsSub', {
      n: S.route.samples.length
    }) : '');
    else if (S.view === 'info') sheetTitle(ctxt(T('infoShort')), T('infoTitle'));
  }
  /** Le vol en bref (appareil, route, niveau, départ, modèle et run), connu avant la météo ; la marque d'un vol qui n'est
   *  pas le vol courant (démonstration, exemple, texte, fichier). */
  function flightSum() {
    const f = S.flight,
      ac = f?.aircraft ? [f.aircraft.type, f.aircraft.registration].filter(Boolean).join(' ') : '',
      tag = S.data === 'demo' ? T('demoShort') : {
        example: T('tagExample'),
        text: T('tagText'),
        file: T('tagFile')
      } [S.opts.src] || '';
    setText($('srcTag'), tag);
    $('srcTag').classList.toggle('at-hidden', !tag);
    whenText();
    S.sum = f ? [ac, `${f.dep} → ${f.arr}`, fmtLvl(S.levelFt), fmtHM(S.depTime), S.data === 'demo' ? T('demoSrc') :
      `${S.mdl?.name || ''}${S.run ? ` · run ${fmtHM(S.run)}` : ''}`
    ].filter(Boolean).join(' · ') + (S.outOfRange ? ' ⚠' : '') : '';
    baseTitle();
  }

  // ---------------------------------------------------------------- curseur « date du vol »
  /** Départ prévu (s) : choisi dans « Vol et réglages », sinon la date du vol, sinon l'heure ronde qui vient. */
  function depValue() {
    if (S.opts.dep != null) return S.opts.dep;
    const w = S.flight?.when ? Date.parse(S.flight.when) / 1000 : NaN;
    return Number.isFinite(w) ? w : Math.ceil(Date.now() / 36e5) * 3600;
  }
  /** Ligne du curseur : le décalage et l'heure de départ qui en résulte ; en alerte hors de la prévision lue. */
  function whenText() {
    const t = S.depTime || depValue() + S.shiftH * 3600,
      out = $('whenOut');
    setText(out, S.shiftH ? T('whenPlus', {
      h: S.shiftH,
      at: F.fmtWhen(t)
    }) : T('whenPlanned', {
      at: F.fmtWhen(t)
    }));
    out.classList.toggle('at-out', !!(S.route && S.outOfRange));
    const v = String(S.shiftH);
    if ($('shift').value !== v) $('shift').value = v;
  }

  // ---------------------------------------------------------------- état, calcul, rendu
  /** État de la lecture : dans « Vol et réglages » et dans le corps tant qu'il n'y a pas de coupe (jamais dans le titre). */
  function setStatus(s) {
    S.statusText = s;
    lazyMods.flight?.mod?.refreshFlight(app);
    if (!S.traj && S.view !== 'settings') drawData();
  }
  /** Ligne d'état d'un vol lu : sa source, ses terrains, sa date d'écriture, les lieux lus et les appels du jour. */
  function status() {
    const f = S.flight,
      r = S.route,
      spentNow = Math.round((r?.weight || 0) + (S.grid?.weight || 0)),
      ac = f.aircraft ? [f.aircraft.type, f.aircraft.registration].filter(Boolean).join(' ') : '';
    flightSum();
    S.statusText = T('stFlight', {
        from: f.from
      }) + (ac ? ` · ${ac}` : '') + ` · ${f.dep} → ${f.arr}` + (f.altn ? ` (${T('altnShort', { id: f.altn })})` : '') +
      (f.updated ? ` · ${T('written', { d: new Date(f.updated).toLocaleString(F.lang()) })}` : '') +
      (r && S.data !== 'demo' ? ` · ${T('stPlaces', { r: r.samples.length, g: S.grid?.g.places.length || 0 })} · ` +
        (spentNow ? T('stSpent', {
          n: spentNow
        }) : T('stCached')) + ` · ${T('stDay', { n: Math.round(S.daySpent) })}` : '') +
      (S.outOfRange ? ` · ${T('outOfRange')}` : '');
    lazyMods.flight?.mod?.refreshFlight(app);
    if (S.view === 'layers') drawData();
  }
  /** La coupe calculée (section.js : le même calcul que celui offert à la Carte). */
  function compute() {
    const m = S.model = sectionModel({
      points: S.flight.points,
      levelFt: S.levelFt,
      profile: S.flight.profile,
      profileLevelFt: S.flight.levelFt,
      depTime: S.depTime,
      cruiseKt: S.cruiseKt,
      samples: S.route.samples,
      locs: S.route.locs
    });
    S.route.samples = m.samples;
    S.traj = m.traj;
    S.cols = m.cols;
    S.field = m.field;
    S.along = m.along;
    S.outOfRange = m.outOfRange;
    S.sel = clamp(S.sel, 0, S.route.samples.length - 1);
  }
  /** Rendu de tout ce qui dépend des données : puce d'altitude, carte météo, ligne d'état, feuille, carte. */
  function render() {
    if (!S.traj || !alive) return;
    if (S.grid) map.mapLevelOptions();
    map.syncWeather();
    map.showChip(!!S.grid);
    // l'indice du toucher : une notification, une fois par page (jamais posé sur la carte)
    if (!tapNoted) {
      tapNoted = true;
      ctx.notify(T('tapNote'), 'info');
    }
    status();
    drawData();
    map.schedule();
  }
  /** Une lecture de la carte météo est arrivée (grille, synoptique) : titres et contenus qui la montrent, carte. */
  function onWeather() {
    if (!alive) return;
    baseTitle();
    if (S.view === 'wpoint' || S.view === 'layers') drawData();
    map.schedule();
  }

  // ---------------------------------------------------------------- chargement
  /** Le vol montré, selon la source choisie. */
  async function readFlight() {
    const o = S.opts,
      err = T('errTwoPoints');
    if (o.src === 'example') return fromRecord(EXAMPLE, T('fromExample'), err);
    if (o.src === 'text') {
      const r = await fromText(o.text, ctx, {
        err: T('errTextPoints'),
        from: T('fromText')
      });
      if (r.skipped.length) app.notify(T('skipped', {
        ids: r.skipped.join(', ')
      }));
      return r.flight;
    }
    if (o.src === 'file') {
      if (!o.file) throw new Error(T('errFile'));
      return fromRecord(JSON.parse(await o.file.text()), o.file.name, err);
    }
    const rec = await data.get(flightPath);
    // la démonstration hors ligne sans vol courant : l'exemple, marqué « Démo »
    if (!rec?.route?.points?.length && S.data === 'demo') return fromRecord(EXAMPLE, T('fromExample'), err);
    if (!rec?.route?.points?.length) throw Object.assign(new Error(T('noFlight')), {
      noFlight: true
    });
    return fromRecord(rec, T('fromCurrent', {
      tri
    }), err);
  }
  /** Lit le vol, puis la météo de la route, de la carte et des terrains par la couche météo. cacheOnly (ouverture, vol
   *  courant changé, curseur relâché) : seulement ce que l'appareil garde ; sinon (« Charger ») ce qui manque est demandé,
   *  tous les jours que le curseur peut atteindre. Un chargement plus récent l'emporte. */
  let loadSeq = 0;
  async function load({
    cacheOnly = false
  } = {}) {
    const seq = ++loadSeq,
      stale = () => seq !== loadSeq || !alive,
      o = S.opts;
    try {
      S.data = o.data;
      if (S.data === 'demo') cacheOnly = false;
      setStatus(T('readingFlight'));
      const f = await readFlight();
      if (stale()) return;
      Object.assign(S, {
        flight: f,
        noFlight: false,
        userMoved: false
      });
      // un niveau choisi dans l'écran l'emporte sur celui du vol (comme le départ)
      S.levelFt = o.levelTouched && o.level || f.levelFt || o.level || 10000;
      S.cruiseKt = o.cruise || A.cruiseKtOf(f.text) || 200;
      S.depTime = depValue() + S.shiftH * 3600;
      const mid = f.points[Math.floor(f.points.length / 2)];
      S.mdl = A.modelFor(mid.lat, A.wrapLon(mid.lon));
      S.run = null;
      flightSum();
      map.syncWeather();
      // la route : un lieu tous les 50 NM, 24 au plus ; la grille de la carte : la demande partagée avec la Carte, au niveau
      // choisi et à celui du vol courant quand il diffère (la carte et la coupe de la Carte le trouvent alors sur l'appareil)
      const other = o.src === 'current' && f.levelFt && f.levelFt !== S.levelFt ? f.levelFt : 0,
        smp = sectionPlaces(f.points),
        gq = gridRequest(f.points, S.levelFt, o.grid),
        gq2 = other ? gridRequest(f.points, other, o.grid) : null,
        levels = [...new Set([...gq.levels, ...(gq2?.levels || [])])].sort((a, b) => b - a),
        rVars = [...new Set([...sectionVars(S.levelFt, f.points), ...(other ? sectionVars(other, f.points) : [])])],
        gVars = [...new Set([...gq.vars, ...(gq2?.vars || [])])],
        until = cacheOnly ? S.depTime : depValue() + SHIFT_MAX * 3600,
        opt = {
          model: S.mdl.id,
          until,
          cacheOnly,
          stale,
          onWait: s => setStatus(T('waitQuota', {
            s
          }))
        };
      S.gridBox = gq.g.bbox; // connue avant la prévision : hors d'elle, rien n'est jamais demandé
      setStatus(S.data === 'demo' ? T('demoComputing') : T('reading', {
        m: S.mdl.name
      }));
      map.startTiles().then(map.fitMap);
      S.run = await wx.run(S.mdl.id);
      if (stale()) return;
      flightSum();
      // la grille de la carte (lourde) arrive après la route ; la coupe s'affiche sans l'attendre
      const gridP = wx.forecast(gq.g.places, gVars, opt);
      gridP.catch(() => {});
      const [route, wxr] = await Promise.all([wx.forecast(smp, rVars, opt), wx.aerodromes(f, cacheOnly).catch(() => null)]);
      if (stale()) return;
      S.daySpent = await wx.spentToday();
      if (!route) {
        // rien sur l'appareil pour ce vol : rien n'est demandé tant que l'utilisateur ne charge pas
        setStatus(T('notLoaded', {
          m: S.mdl.name,
          d: Math.round(S.daySpent)
        }));
        map.fitMap();
        return;
      }
      Object.assign(S, {
        route: {
          samples: smp,
          locs: route.locs,
          levels: A.levelsUpTo(topFtOf(S.levelFt, f.points)),
          weight: route.weight
        },
        run: route.run || S.run,
        grid: null,
        wx: wxr,
        sel: 0,
        local: null
      });
      compute();
      if (S.view === 'slice') S.view = 'profile';
      show(S.view);
      render();
      map.fitMap();
      let grid;
      try {
        grid = await gridP;
      } catch (e) {
        if (!stale() && !e?.stale) app.notify(T('mapUnreachable', {
          m: wx.why(e)
        }), true);
        return;
      }
      if (stale()) return;
      if (!grid) return S.view === 'layers' && drawData();
      S.grid = {
        g: gq.g,
        locs: grid.locs,
        levels,
        weight: grid.weight,
        model: S.mdl
      };
      S.daySpent = await wx.spentToday();
      render();
    } catch (e) {
      if (stale() || e?.stale) return;
      if (e.noFlight) {
        // aucun vol courant : rien de montré d'un autre vol ; la carte reste utile (le synoptique monde, aucun appel)
        Object.assign(S, {
          flight: null,
          traj: null,
          route: null,
          grid: null,
          local: null,
          gridBox: null,
          noFlight: true
        });
        map.startTiles().then(map.schedule);
        flightSum();
        map.syncWeather();
        map.showChip(false);
        setStatus(T('noFlight'));
        map.schedule();
        return;
      }
      console.error(e);
      setStatus(T('failed', {
        m: wx.why(e)
      }));
      app.notify(wx.why(e), true);
    }
  }
  /** Départ, niveau ou vitesse changés : recalcul sans relire la prévision, sauf un niveau que la route ou la grille n'a pas
   *  encore (seul ce qui manque est alors demandé). */
  function recompute() {
    if (!S.route) return;
    const o = S.opts;
    S.depTime = depValue() + S.shiftH * 3600;
    if (o.levelTouched) S.levelFt = o.level;
    S.cruiseKt = o.cruise || S.cruiseKt;
    const routeOk = A.levelsUpTo(topFtOf(S.levelFt, S.flight.points)).every(l => S.route.levels.includes(l)),
      gridOk = !S.grid || gridRequest(S.flight.points, S.levelFt, o.grid).levels.every(l => S.grid.levels.includes(l));
    if (!routeOk || !gridOk) return load();
    compute();
    render();
  }

  // ---------------------------------------------------------------- réglages gardés
  let uiText = '';
  /** Réglages de l'écran gardés sur l'appareil, écrits seulement s'ils changent. */
  function saveUi() {
    const v = {
        text: S.opts.text,
        grid: String(S.opts.grid),
        xs: S.xsLayers,
        map: S.mapLayers,
        mapLevel: S.mapLevel
      },
      s = JSON.stringify(v);
    if (s === uiText) return;
    uiText = s;
    data.put(UI, v).catch(() => {});
  }

  // ---------------------------------------------------------------- feuille (primitive du cadre)
  let sheet = null;
  /** Après un changement de taille (lâcher de la feuille, rotation) : la carte reprend la taille du module, la route reste
   *  cadrée tant que l'utilisateur n'a pas déplacé la carte, le dessin est repris s'il n'est plus à la taille du corps. */
  function settled() {
    if (!alive || app.dragging()) return;
    applyBare();
    map.sizeMap();
    if (S.map && !S.userMoved) map.fitMap();
    map.schedule();
    if ((S.view === 'profile' || S.view === 'slice') && `${dbody.clientWidth}x${dbody.clientHeight}` !== S.drawn) drawData();
  }

  // ---------------------------------------------------------------- réponses de l'écran
  $('dclose').onclick = () => {
    S.local = null;
    S.wpoint = null;
    map.syncWeather();
    render();
    show('profile');
  };
  $('whole').onclick = () => cut.whole();
  $('legendBtn').onclick = () => {
    S.legend = !S.legend;
    cut.showLegend();
  };
  // Échap ferme la légende, et elle seule : la touche est consommée (preventDefault), le cadre qui écoute sur window ne
  // quitte donc pas aussi le plein écran (frame/INTEGRATION.md § 9.4, le plus intérieur d'abord)
  const legendKey = ev => {
    if (ev.key === 'Escape' && !ev.defaultPrevented && S.legend) {
      ev.preventDefault();
      S.legend = false;
      cut.showLegend();
    }
  };
  document.addEventListener('keydown', legendKey);
  $('prev').onclick = () => cut.openRouteSlice((S.local?.i ?? 0) - 1);
  $('next').onclick = () => cut.openRouteSlice((S.local?.i ?? 0) + 1);
  // le « ? » du cadre ouvre le chapitre au paragraphe de la vue montrée (règle 16 ; ancres identiques ×4 dans help/*.md)
  ctx.helpAnchor?.(() => !alive ? null : !S.traj && !['settings', 'layers', 'wpoint'].includes(S.view) ? 'atmosphere-flight' : {
    settings: 'atmosphere-settings',
    layers: 'atmosphere-map',
    wpoint: 'atmosphere-map',
    info: 'atmosphere-details'
  } [S.view] || (S.legend ? 'atmosphere-legend' : S.view === 'profile' && cut.zoomed() ? 'atmosphere-zoom' : 'atmosphere-cut'));
  // curseur « date du vol » : la coupe, la carte du vol et le synoptique suivent depuis ce que l'appareil garde ; relâché
  // au-delà de la prévision lue, l'appareil est relu pour la nouvelle heure (toujours sans appel)
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
        map.syncWeather();
        baseTitle();
        map.schedule();
      }
      whenText();
    });
  };
  $('shift').onchange = () => {
    if (S.route && S.outOfRange) load({
      cacheOnly: true
    });
  };
  // tailles (un événement) : la carte suit le module, le dessin est repris à la taille du corps — jamais pendant un glisser
  const ro = new ResizeObserver(() => {
    if (app.dragging()) return;
    map.sizeMap();
    map.schedule();
    if (`${dbody.clientWidth}x${dbody.clientHeight}` !== S.drawn) sheet?.settle();
  });
  ro.observe(dbody);
  ro.observe($('box'));
  ro.observe(el);
  // design ou ton changés (un événement : attributs du document) : couleurs relues, fond et dessins repris
  const repaint = () => {
    colors.clear();
    map.repaint();
    drawData();
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
    map.sizeMap();
    map.schedule();
  };
  document.addEventListener('visibilitychange', back);
  window.addEventListener('pageshow', back);
  // limite de la zone du vol : tracée par défaut, masquée si l'administrateur l'a choisi (edge.show ; l'ancien edge: false lu)
  const readEdge = async () => {
    const d = await data.get(PROFILES).catch(() => null);
    map.wm.update({
      edge: d?.edge !== false && d?.edge?.show !== false
    });
    onWeather();
  };
  const unwatchEdge = data.watch(PROFILES, readEdge);

  // ---------------------------------------------------------------- départ
  const ui = await data.get(UI).catch(() => null),
    rec = await data.get(flightPath).catch(() => null);
  if (!alive) return;
  uiText = ui ? JSON.stringify(ui) : '';
  Object.assign(S.xsLayers, ui?.xs || {});
  Object.assign(S.mapLayers, ui?.map || {});
  if (ui?.mapLevel) S.mapLevel = ui.mapLevel;
  if (ui?.text) S.opts.text = ui.text;
  if (+ui?.grid) S.opts.grid = +ui.grid;
  // vol courant changé (Carburant, Carte, un autre appareil) : relu, la prévision seulement depuis l'appareil
  let lastSig = flightSig(rec);
  const unwatch = data.watch(flightPath, async () => {
    if (S.opts.src !== 'current') return;
    const r = await data.get(flightPath);
    if (flightSig(r) === lastSig) return;
    lastSig = flightSig(r);
    load({
      cacheOnly: true
    });
  });
  stop = () => {
    alive = false;
    map.stop();
    cut.stop();
    sheet?.stop();
    cancelAnimationFrame(shiftFrame);
    ro.disconnect();
    mo.disconnect();
    mq.removeEventListener('change', repaint);
    document.removeEventListener('visibilitychange', back);
    document.removeEventListener('keydown', legendKey);
    window.removeEventListener('pageshow', back);
    unwatch?.();
    unwatchEdge?.();
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
  readEdge();
  whenText();
  show('profile');
  // à l'ouverture, seulement l'appareil : Open-Meteo n'est lu que sur « Charger »
  load({
    cacheOnly: true
  });
  // les contenus chargés à la demande, gardés pour le hors ligne une fois l'écran dessiné
  setTimeout(() => alive && Object.keys(LAZY).forEach(need), 1500);
}

export function unmount() {
  stop?.();
  stop = null;
}
