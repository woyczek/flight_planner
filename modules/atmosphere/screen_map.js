// La carte de l'écran Météo (SPEC.md § 2.1, § 4) : le fond MapLibre du socle de la Carte (modules/maps/lib/map_base.js),
// ou son fond uni sans tuiles ; la carte météo de la bibliothèque partagée (lib/weather_map.js : la grille du vol fondue
// dans le synoptique monde) dessinée sur le canevas .at-over, puis le vol par-dessus, à chaque image du mouvement. La carte
// a la taille du module entier, sous la feuille : un mouvement de la feuille ne la redimensionne pas (règle 19). La puce
// d'altitude dans la couche des boutons du cadre ; un toucher ouvre la tranche du point (dans la grille du vol) ou les
// valeurs du synoptique (hors d'elle), jamais d'appel hors de la grille du vol.

import * as A from './atmo.js';
import {
  esc,
  setText,
  fmtHM,
  fmtLvl
} from './fmt.js';
import {
  createWeatherMap,
  copiesFor,
  inBox,
  halo,
  MAP_FIXED
} from './lib/weather_map.js';
import {
  diverging
} from './section.js';
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

/** Attente des tuiles avant le fond uni (ms). */
const TILE_WAIT = 8000;

/** La carte : app = l'écran (module.js) — ctx, S, $, F, notify, tok, dark, cloudRgb, show, onWeather, openPointSlice. */
export function createMapScreen(app) {
  const {
    ctx,
    S,
    $,
    F
  } = app, {
    T,
    fmtNum,
    fmtT,
    fmtWind
  } = F;
  let frame = 0;

  /** Redessin de la surcouche à la prochaine image (une seule demande à la fois). */
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(() => {
      frame = 0;
      drawMap();
    });
  };

  // ---------------------------------------------------------------- la carte météo (bibliothèque partagée)
  /** Couleurs du dessin de la carte (jetons du design ; MapsRender.tokens quand le rendu de la Carte est là). */
  const pal = () => {
    const t = window.MapsRender?.tokens?.();
    return {
      bg: app.tok('--sog-chart-bg'),
      fg: app.tok('--sog-fg'),
      muted: app.tok('--sog-muted'),
      border: app.tok('--sog-border'),
      accent: app.tok('--sog-accent'),
      route: app.tok('--at-computed'),
      ice: app.tok('--at-ice'),
      dark: t ? t.dark : app.dark()
    };
  };
  const wm = createWeatherMap({
    ctx,
    layers: S.mapLayers,
    colors: () => {
      const K = pal();
      return {
        bg: K.bg,
        fg: K.fg,
        muted: K.muted,
        border: K.border,
        dark: K.dark,
        cloud: app.cloudRgb()
      };
    },
    onChange: () => app.onWeather()
  });

  /** Emprise du vol (degrés), avec une marge ; l'ouest de l'Europe sans vol. */
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
  /** Emprise de la grille du vol (lue, sinon celle qui le serait) ; null sans vol. */
  const gridBox = () => S.grid?.g.bbox || S.gridBox || null;

  /** Altitude pression de la carte selon le choix de la puce (sol : null). */
  function mapFt() {
    const v = S.mapLevel;
    if (v === 'sfc') return null;
    if (v.startsWith('step:')) return S.traj?.steps[+v.slice(5)]?.ft ?? S.levelFt;
    if (v.startsWith('alt:')) return +v.slice(4);
    return S.levelFt; // req, traj
  }
  /** Heure de la carte : passage du vol au lieu de la tranche montrée, sinon au départ ; sans route, le départ. */
  const mapTime = () => !S.route ? S.depTime || Date.now() / 1000 : S.local?.kind === 'point' ? S.local.t : S.route.samples[S.local
    ?.kind === 'route' ? S.local.i : 0].t;

  /** Les options de la carte météo d'après l'écran : le vol et son niveau, la grille lue, l'altitude, l'heure, les couches. */
  function syncWeather() {
    wm.update({
      flight: S.flight ? {
        points: S.flight.points,
        levelFt: S.levelFt
      } : null,
      grid: S.grid || null,
      levelFt: S.traj ? mapFt() : null,
      time: mapTime(),
      layers: S.mapLayers,
      gridMax: S.opts.grid
    });
  }

  // ---------------------------------------------------------------- taille, fond, cadrage
  /** Part de la carte cachée par la feuille (px), en bas ('b') ou à droite ('r'). */
  const hidden = k => parseFloat($('box').style.getPropertyValue(`--at-hide-${k}`)) || 0;
  /** La carte à la taille du module entier (sous la feuille) et la part que la feuille en cache, posées seulement quand elles
   *  changent ; MapLibre ne change de taille qu'avec le module (fenêtre, rotation), jamais avec la feuille. */
  function sizeMap() {
    const box = $('box'),
      st = box.style,
      fw = Math.max(1, app.el.clientWidth - box.offsetLeft),
      fh = Math.max(1, app.el.clientHeight - box.offsetTop),
      set = (k, v) => st.getPropertyValue(k) !== v && st.setProperty(k, v);
    set('--at-full-w', `${fw}px`);
    set('--at-full-h', `${fh}px`);
    set('--at-hide-r', `${Math.max(0, fw - box.clientWidth)}px`);
    set('--at-hide-b', `${Math.max(0, fh - box.clientHeight)}px`);
    if (S.map) {
      mapSize(S.map, $('map'));
      // les contrôles du bas de MapLibre au-dessus de la feuille (règle 17, la fonction du socle) ; en paysage la feuille
      // cache la droite : --at-hide-r les décale à gauche de la colonne
      setBottomInset(S.map, Math.max(0, fh - box.clientHeight));
    }
  }
  /** Cadre le vol dans la part visible de la carte (au-dessus de la feuille, à gauche de la colonne). */
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
  /** Fond MapLibre sur l'emprise du vol (startTiles du socle) ; false s'il ne vient pas (hors ligne, pas de WebGL, hôte
   *  refusé, délai) : le fond uni. Une fois par montage. */
  async function startTiles() {
    sizeMap(); // MapLibre lit la taille de son conteneur à sa création : celle du module entier
    if (S.map || S.mapTried) return !!S.map;
    S.mapTried = true;
    await loadRender().catch(() => {});
    const b = fitBox(),
      map = await startMapTiles($('map'), {
        style: styleFor({
          dark: app.dark()
        }),
        bounds: [
          [b.w, b.s],
          [b.e, b.n]
        ],
        attributionControl: {
          compact: true
        },
        // le monde répété : la carte fait le tour par la droite comme par la gauche
        worldCopies: true,
        wait: TILE_WAIT,
        alive: app.alive,
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
    if (!map || !app.alive()) return flat();
    S.map = map;
    $('box').classList.remove('at-flat');
    sizeMap();
    fitMap();
    schedule();
    return true;
  }
  /** Fond uni de la Carte : Mercator sur l'emprise du vol, contours des pays ; le canevas reçoit toucher et survol. */
  function flat() {
    $('box').classList.add('at-flat');
    loadOutlines().then(schedule, () => {});
    const over = $('over'),
      llOf = ev => {
        const r = over.getBoundingClientRect(),
          x = ev.clientX - r.left,
          y = ev.clientY - r.top;
        return {
          x,
          y,
          ll: view().toLL?.(x, y)
        };
      };
    over.onclick = ev => {
      const {
        ll
      } = llOf(ev);
      if (ll) mapTap(ll.lat, ll.lon);
    };
    over.onpointermove = ev => {
      const {
        x,
        y,
        ll
      } = llOf(ev);
      if (ll) mapTip(ll.lat, ll.lon, {
        x,
        y
      }, ev);
    };
    schedule();
    return false;
  }
  /** Vue courante : projection (MapLibre, sinon Mercator du fond uni cadré sur le vol dans la part visible) et dimensions. */
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
  /** Bornes de la vue [w, s, e, n] (MapLibre) ; null sur le fond uni. */
  const viewBounds = () => {
    if (!S.map) return null;
    const b = S.map.getBounds();
    return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
  };
  /** La part de la carte que la feuille ne cache pas : ce que l'on regarde (le titre du synoptique en dépend). */
  const visibleBounds = () => {
    if (!S.map) return null;
    const box = $('box'),
      sw = S.map.unproject([0, box.clientHeight]),
      ne = S.map.unproject([box.clientWidth, 0]);
    return [sw.lng, sw.lat, ne.lng, ne.lat];
  };

  // ---------------------------------------------------------------- dessin
  /** Trajectoire calculée colorée par la température rencontrée, plus épaisse dans les nuages (altitude « trajectoire »),
   *  calculée une fois par trajectoire et par ton. */
  function trajGeometry() {
    if (!(S.grid && S.mapLevel === 'traj' && S.along)) return null;
    const dk = app.dark();
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
  /** Dessin de la surcouche (et du fond uni sans tuiles) : la carte météo, puis le vol sur chaque copie du monde visible. */
  function drawMap() {
    const cv = $('over');
    if (!cv || !app.alive()) return;
    const v = view(),
      dpr = Math.min(3, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(v.W * dpr) || cv.height !== Math.round(v.H * dpr)) {
      cv.width = Math.round(v.W * dpr);
      cv.height = Math.round(v.H * dpr);
    }
    const c = cv.getContext('2d'),
      P = (lat, lon) => v.toC(lat, lon),
      K = pal();
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, v.W, v.H);
    if (!S.map) {
      if (window.MapsRender) drawPlain(c, P, v.W, v.H, K.dark ? {
        sea: '#1d2731',
        land: '#26282b',
        border: '#4a4a46'
      } : undefined);
      else {
        c.fillStyle = app.tok('--sog-chart-grid');
        c.fillRect(0, 0, v.W, v.H);
      }
    }
    const bounds = viewBounds();
    wm.draw(c, {
      W: v.W,
      H: v.H,
      project: P,
      bounds,
      visible: visibleBounds(),
      zoom: S.map?.getZoom?.() ?? 6
    });
    // la vue est surtout hors de la grille du vol : le titre de la poignée dit ce qu'on regarde
    const world = wm.info().outside === 2;
    if (world !== !!S.worldShown) {
      S.worldShown = world;
      app.baseTitle();
    }
    if (S.wpoint && S.view === 'wpoint') ring(c, P(S.wpoint.lat, S.wpoint.lon), K.accent);
    if (!S.flight) return;
    const fb = fitBox(),
      gb = gridBox() || [fb.w, fb.s, fb.e, fb.n],
      traj = trajGeometry();
    for (const off of copiesFor(bounds, Math.min(gb[0], fb.w), Math.max(gb[2], fb.e))) drawFlight(c, off ? (la, lo) => P(la, lo + off) :
      P, traj, K);
  }
  /** Un cercle de repère (lieu de la tranche, point du monde touché). */
  const ring = (c, q, color) => {
    c.strokeStyle = color;
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(q.x, q.y, 9, 0, 2 * Math.PI);
    c.stroke();
  };
  /** Le vol à une projection : la trajectoire colorée (altitude « trajectoire ») ou la route, les points nommés, le lieu de
   *  la tranche montrée. */
  function drawFlight(c, P, traj, K) {
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
    if (S.local) ring(c, P(S.local.lat, S.local.lon), K.accent);
  }

  // ---------------------------------------------------------------- toucher, survol
  /** Toucher de la carte : dans la grille du vol, la tranche à ce point ; hors d'elle, les valeurs du synoptique monde. */
  function mapTap(lat, lon) {
    const b = gridBox();
    if (!b || !inBox(b, lat, lon)) {
      // la longitude touchée (continue chez MapLibre) : le repère suit ; les valeurs se lisent modulo 360
      S.wpoint = {
        lat,
        lon
      };
      app.show('wpoint');
      return schedule();
    }
    app.openPointSlice(lat, A.nearLon(lon, (b[0] + b[2]) / 2));
  }
  /** Infobulle de survol (souris seulement) : la valeur de la carte météo au pointeur. */
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

  // ---------------------------------------------------------------- textes de la carte
  /** Titre du synoptique : l'heure montrée, le run et l'échéance. */
  function worldTitle() {
    const i = wm.info();
    if (!i.world) return T(i.worldReading ? 'worldReading' : 'worldNone');
    return T('worldTitle', {
      at: fmtHM(i.world.time),
      run: i.world.run ? fmtHM(i.world.run) : '—',
      h: i.world.h ?? '—'
    });
  }
  /** Ce que montre la carte (heure, niveau et lignes), en tête des couches ; « Charger » quand la grille manque. */
  function mapNote() {
    const i = wm.info();
    if (i.state !== 'ok' && S.traj) return T('mapLoad');
    return [i.time ? fmtHM(i.time) : '', i.pLabel].filter(Boolean).join(' · ');
  }
  /** Contenu « point hors de la zone du vol » : toutes les valeurs du synoptique monde en ce point, à l'heure de la carte. */
  function drawWorldPoint(dbody) {
    const P = S.wpoint,
      where = `${P.lat.toFixed(2)}° ${A.wrapLon(P.lon).toFixed(2)}°`,
      wp = wm.worldPoint(P.lat, P.lon),
      x = wp?.values || null,
      deg = v => v == null ? '—' : `${v < 0 ? '−' : ''}${fmtNum(Math.abs(v))} °C`,
      pc = v => v == null ? '—' : `${fmtNum(v)} %`;
    app.sheetTitle(x ? T('worldPoint', {
      p: where,
      at: fmtHM(wp.time)
    }) : where);
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
    const box = document.createElement('div');
    box.className = 'at-pad';
    box.innerHTML = rows ? `<dl class="at-kv">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd><dd></dd></div>`).join('')}</dl>
      <p class="f-muted" style="margin:8px 0 0;font-size:12px">${esc(T('worldPointNote', { src: wp.source, step: wp.step, run: wp.run ? fmtHM(wp.run) : '—' }))}</p>` :
      `<p class="f-muted">${esc(T(wp?.reading ? 'worldReading' : 'worldNone'))}</p>`;
    dbody.replaceChildren(box);
  }

  // ---------------------------------------------------------------- puce d'altitude
  // le niveau en bref, la liste native du système par-dessus (invisible) pour choisir ; cachée avant la grille de la carte
  const lvlChip = document.createElement('label');
  lvlChip.className = 'at-lvl';
  lvlChip.title = T('mapLevelAria');
  lvlChip.innerHTML = `<span></span><span aria-hidden="true">▾</span><select aria-label="${esc(T('mapLevelAria'))}"></select>`;
  lvlChip.hidden = true;
  const lvlText = lvlChip.firstChild,
    lvlSel = lvlChip.querySelector('select');
  lvlSel.onchange = () => {
    S.mapLevel = lvlSel.value;
    lvlShort();
    app.saveUi();
    app.render();
  };
  /** Les altitudes offertes : sol, niveau demandé, paliers, trajectoire, altitudes fixes lisibles dans la grille lue. */
  function mapLevelOptions() {
    const gridTop = S.grid ? A.paFt(S.grid.levels.at(-1)) : 0,
      known = new Set(S.grid?.levels || []),
      readable = ft => A.bracketLevels([ft]).every(l => known.has(l)),
      opts = [
        ['sfc', T('mlSfc')],
        ['req', T('mlReq', {
          l: fmtLvl(S.levelFt)
        })],
        // l'indice du palier dans steps (un palier au niveau demandé n'est pas proposé deux fois)
        ...S.traj.steps.map((st, k) => [`step:${k}`, T('mlStep', {
          l: fmtLvl(st.ft),
          id: st.id
        }), st.ft]).slice(1).filter(o => o[2] !== S.levelFt).map(o => o.slice(0, 2)),
        ['traj', T('mlTraj')],
        ...MAP_FIXED.filter(ft => ft <= gridTop && readable(ft)).map(ft => [`alt:${ft}`, fmtLvl(ft)])
      ],
      sig = JSON.stringify(opts);
    if (lvlSel.dataset.sig !== sig) {
      lvlSel.dataset.sig = sig;
      lvlSel.replaceChildren(...opts.map(([v, t]) => new Option(t, v)));
    }
    if (!opts.some(([v]) => v === S.mapLevel)) S.mapLevel = 'sfc';
    if (lvlSel.value !== S.mapLevel) lvlSel.value = S.mapLevel;
    lvlShort();
  }
  /** Texte de la puce : le niveau seul (le nom entier est celui de la liste, en infobulle). */
  function lvlShort() {
    const v = S.mapLevel;
    setText(lvlText, v === 'sfc' ? T('mlSfcShort') : v === 'traj' ? T('mlTrajShort') : fmtLvl(mapFt()));
    const full = lvlSel.selectedOptions[0]?.text || T('mapLevelAria');
    if (lvlChip.title !== full) lvlChip.title = full;
  }
  /** La puce montrée seulement quand la grille du vol est lue. */
  const showChip = on => {
    if (lvlChip.hidden !== !on) lvlChip.hidden = !on;
  };

  return {
    wm,
    lvlChip,
    schedule,
    syncWeather,
    sizeMap,
    fitMap,
    startTiles,
    gridBox,
    worldTitle,
    mapNote,
    drawWorldPoint,
    mapLevelOptions,
    showChip,
    /** Couleurs du design relues (design ou ton changés) : fond MapLibre et carte météo. */
    repaint() {
      wm.update({});
      S.map?.setStyle(styleFor({
        dark: app.dark()
      }));
      schedule();
    },
    /** Démontage : la carte météo, l'image demandée, MapLibre. */
    stop() {
      wm.detach();
      cancelAnimationFrame(frame);
      S.map?.remove();
      S.map = null;
    }
  };
}
