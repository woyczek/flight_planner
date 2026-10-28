// Carte météo du module Atmosphère, en bibliothèque (V3_SPECIFICATION § 7.1.8 ; INTEGRATION.md § 6) : la même pour
// Atmosphère et pour la Carte. Isobares, isothermes, nuages, vents, température, courant-jet et convection, au niveau et à
// l'heure demandés : la grille du vol (lue dans la réserve météo, jamais demandée à Open-Meteo d'ici) fondue dans le
// synoptique monde (publication des pages), un seul calcul des deux côtés, aucune frontière visible.
//
// Deux usages :
//   · createWeatherMap(opts) → { draw(c, view), update(partial), info(), at(lat, lon), worldPoint(lat, lon), legend(),
//     detach(), state } : dessine dans le canevas de l'appelant, à sa place dans son ordre de dessin (Atmosphère : fond
//     uni, météo, puis la route) ;
//   · attach(target, opts) : la même, avec son propre canevas — dans map.getCanvasContainer() d'une carte MapLibre (au-
//     dessus des tuiles, sous le canevas de l'hôte, pointer-events: none ; suit move, resize et les copies du monde), ou
//     dans target.container pour un fond uni { container, project(lat, lon) → { x, y }, size() → { W, H }, bounds() →
//     [w, s, e, n] | null, onChange(cb) → désabonnement }.
// opts : { ctx (data, net, t, lang), flight ({ points, levelFt } : le vol et son niveau demandé ; null : le monde seul),
// levelFt (l'altitude pression montrée, ft ; null : la surface), time (s), layers ({ isobar, isotherm, cloud, wind,
// tfill, jet, conv }), gridMax (lieux de la grille du vol, 48), grid (une grille déjà lue { g, locs, levels } : l'hôte qui
// la charge lui-même, Atmosphère ; sans elle, la réserve est lue), colors (() → { bg, fg, muted, border, dark, cloud: [r, g,
// b] }), edge (la limite de la grille du vol tracée en trait fin, avec info().zones pour la légende : vrai par défaut, la
// règle 15 de V3_SPECIFICATION § 7.1 ; l'administrateur peut la masquer, clé edge de airline/map_profiles.json),
// onChange (appelé quand une lecture arrive : redessiner) }.
// Les aplats (nuages, température, courant-jet, convection) viennent du synoptique des deux côtés de la grille du vol ; les
// lignes et les barbules, de la grille du vol fondue dans le synoptique sur son quart extérieur.
// state : 'ok' (la grille du vol est lue), 'world-only' (seul le synoptique monde), 'missing' (rien : « Charger dans
// Météo »). Jamais d'appel à Open-Meteo : la réserve est lue sans réseau, le synoptique sur la même origine.

import * as A from '../atmo.js';
import {
  weatherStore
} from '../weather_store.js';
import {
  worldReader,
  worldGrid,
  worldLocs,
  worldAt,
  stepAt
} from '../world.js';
import {
  diverging,
  topFtOf
} from '../section.js';
import {
  TX
} from '../texts.js';
import {
  formatLevel
} from '../../../frame/lib/route_text.js';

const R = Math.PI / 180;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
/** Altitudes fixes offertes par la carte, sous le haut de la coupe (ft). */
export const MAP_FIXED = [5000, 10000, 18000, 24000, 30000];
/** Couches de la carte météo, dans l'ordre du panneau Couches, et leur réglage par défaut. */
export const MAP_LAYERS = ['isobar', 'isotherm', 'cloud', 'wind', 'tfill', 'jet', 'conv'];
export const DEFAULT_LAYERS = {
  isobar: true,
  isotherm: true,
  cloud: true,
  wind: true,
  tfill: false,
  jet: true,
  conv: true
};
const LABEL = {
  isobar: 'lyIsobar',
  isotherm: 'lyIso',
  cloud: 'lyCloud',
  wind: 'lyWind',
  tfill: 'lyTemp',
  jet: 'lyJet',
  conv: 'lyConv'
};
/** Réseau de la réserve pour la lecture seule : toujours « hors ligne » (l'heure du run est celle que la réserve garde). */
const NO_NET = {
  fetch: async () => new Response(null, {
    status: 503,
    headers: {
      'x-sog-offline': '1'
    }
  })
};

/** Ce que la grille du vol demande à la réserve — lieux (A.grid), niveaux, variables, modèle : le même calcul pour celui
 *  qui la charge (Atmosphère, « Charger ») et pour celui qui la lit (cette bibliothèque) : ils trouvent les mêmes cases.
 *  points : la route (déroulée ici) ; levelFt : le niveau demandé du vol. */
export function gridRequest(points, levelFt, gridMax = 48) {
  const pts = A.unwrapLons(points),
    mid = pts[Math.floor(pts.length / 2)],
    top = topFtOf(levelFt, pts),
    levels = A.bracketLevels([levelFt, ...pts.map(p => p.alt_ft).filter(x => x > 0), ...MAP_FIXED.filter(ft => ft <= top)]),
    vars = [...A.GRID_SURFACE_VARS, ...levels.flatMap(l => A.GRID_LEVEL_VARS.map(v => `${v}_${l}hPa`))];
  return {
    g: A.grid(pts, gridMax),
    levels,
    vars,
    model: A.modelFor(mid.lat, A.wrapLon(mid.lon))
  };
}
/** Jours de prévision (UTC, depuis aujourd'hui) qui couvrent un instant (s) et le vol qui suit. */
export const daysFor = t => clamp(Math.ceil((((t || Date.now() / 1000) + 10 * 3600) * 1000 - Date.parse(new Date().toISOString().slice(0,
  10))) / 864e5), 2, 16);
/** Décalages (multiples de 360°) qui amènent [w, e] dans la vue bounds [W, S, E, N] (la carte répète le monde) ; quatre au
 *  plus ; sans bornes (fond uni) : [0]. */
export function copiesFor(bounds, w, e) {
  if (!bounds) return [0];
  const out = [];
  for (let k = Math.ceil((bounds[0] - e) / 360); k <= Math.floor((bounds[2] - w) / 360) && out.length < 4; k++) out.push(k * 360);
  return out.length ? out : [0];
}
/** Point de grille dans une emprise [w, s, e, n] (longitude comparée modulo 360). */
export const inBox = (b, lat, lon) => {
  const lo = A.nearLon(lon, (b[0] + b[2]) / 2);
  return lat >= b[1] && lat <= b[3] && lo >= b[0] && lo <= b[2];
};

/** Barbule de vent (hémisphère nord) sur un canvas : hampe vers le lit du vent, plumes à droite ; fanion 50 kt, plume 10,
 *  demi 5. */
export function barb(c, x, y, dir, kt, len = 20, color = '#333') {
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
/** Image d'un champ (une cellule par point, rangées du sud au nord) : rgbaOf(k) → [r, g, b, a] ou null. */
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
/** Halo de texte (fond du dessin) puis texte. */
export function halo(c, text, x, y, color, bg, align = 'center') {
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
/** Point arrondi au pixel : les images de la grille du vol et la découpe du synoptique tombent sur les mêmes pixels. */
/** Modèle de la grille du vol et sa maille (le libellé de la légende de la limite), par modèle d'Open-Meteo. */
const RES = {
  meteofrance_seamless: 'resMeteofrance',
  icon_seamless: 'resIcon',
  gfs_seamless: 'resGfs'
};
/** Écart (px) entre une étiquette de ligne et la limite tracée de la grille du vol (option edge), dedans comme dehors. */
const EDGE_GAP = 24;
const px = q => ({
  x: Math.round(q.x),
  y: Math.round(q.y)
});
const triplet = c => (String(c).match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
/** Couleurs par défaut : les jetons du design lus sur un élément (une sonde posée dedans). */
function tokenColors(el) {
  const probe = document.createElement('i');
  probe.style.display = 'none';
  (el || document.body).append(probe);
  const tok = name => {
    probe.style.color = `var(${name})`;
    return getComputedStyle(probe).color;
  };
  return () => {
    const bg = tok('--sog-chart-bg'),
      [r, g, b] = triplet(bg);
    return {
      bg,
      fg: tok('--sog-fg'),
      muted: tok('--sog-muted'),
      border: tok('--sog-border'),
      cloud: triplet(tok('--sog-muted')),
      dark: 0.2126 * r + 0.7152 * g + 0.0722 * b < 110
    };
  };
}

/** La carte météo, dessinée dans le canevas de l'appelant (voir l'en-tête). */
export function createWeatherMap({
  ctx,
  flight = null,
  levelFt = null,
  time = null,
  layers = {},
  gridMax = 48,
  grid: given = null,
  colors = null,
  edge = true,
  onChange = () => {}
} = {}) {
  const T = (k, v) => ctx.t(TX[k], v),
    lang = () => ctx.lang?.() || 'fr',
    fmtNum = (x, d = 0) => x == null || !Number.isFinite(x) ? '—' : x.toLocaleString(lang(), {
      maximumFractionDigits: d,
      minimumFractionDigits: d
    }),
    fmtLvl = ft => ft == null ? '—' : formatLevel(Math.max(0, Math.round(ft / 100) * 100)),
    store = weatherStore({
      data: ctx.data,
      net: NO_NET
    }),
    reader = worldReader({
      data: ctx.data,
      net: ctx.net
    }),
    o = {
      flight,
      levelFt,
      time,
      layers: {
        ...DEFAULT_LAYERS,
        ...layers
      },
      gridMax,
      grid: given,
      colors: colors || tokenColors(),
      edge,
      onChange
    },
    wsteps = new Map(),
    wasked = new Set(),
    wfailed = new Map();
  let alive = true,
    box = null, // emprise de la grille du vol, connue dès le vol (avant toute prévision)
    boxModel = null, // son modèle ({ id, name, short })
    grid = null, // { key, g, locs, levels }
    gridKey = '',
    gridState = 'missing',
    gridReading = false,
    world, // undefined : pas encore demandé ; null : absent ; l'index sinon
    worldReading = false,
    worldAsked = 0,
    fF = null, // champs de la grille du vol { key, F }
    wfields = null,
    geo = null,
    wgeo = null,
    last = {
      out: 2,
      k: null
    };
  const changed = () => alive && o.onChange();

  // ---------------------------------------------------------------- lectures (jamais Open-Meteo)
  /** La grille du vol dans la réserve, pour le vol, son niveau et les jours de l'heure demandée. */
  let injected = 0;

  function readGrid() {
    if (o.grid) {
      // la grille de l'hôte (déjà lue, démonstration comprise) : rien à lire
      box = o.grid.g.bbox;
      boxModel = o.grid.model || A.modelFor((box[1] + box[3]) / 2, A.wrapLon((box[0] + box[2]) / 2));
      if (grid?.src !== o.grid) {
        grid = {
          ...o.grid,
          src: o.grid,
          key: `given:${++injected}`
        };
        gridKey = grid.key;
        gridState = 'ok';
        fF = geo = null;
      }
      return;
    }
    if (grid?.src) {
      grid = null;
      gridKey = '';
    }
    const pts = o.flight?.points;
    if (!pts || pts.length < 2) {
      grid = box = boxModel = null;
      gridKey = '';
      gridState = 'missing';
      return;
    }
    const req = gridRequest(pts, o.flight.levelFt, o.gridMax);
    box = req.g.bbox;
    boxModel = req.model;
    const
      days = daysFor(o.time),
      key = JSON.stringify([pts.map(p => [p.lat, p.lon, p.alt_ft || 0]), o.flight.levelFt, o.gridMax, days, req.model.id]);
    if (key === gridKey) return;
    gridKey = key;
    gridReading = true;
    store.forecast(req.g.places, req.vars, {
      model: req.model.id,
      days,
      cacheOnly: true
    }).then(r => {
      if (!alive || key !== gridKey) return;
      gridReading = false;
      grid = r ? {
        key,
        g: req.g,
        locs: A.locations(r.locs),
        levels: req.levels
      } : null;
      gridState = grid ? 'ok' : 'missing';
      fF = geo = null;
      changed();
    }, () => {
      if (key !== gridKey) return;
      gridReading = false;
      grid = null;
      gridState = 'missing';
      changed();
    });
  }
  /** Le synoptique monde : l'index une fois (puis toutes les 10 min s'il manquait). */
  function loadWorld() {
    if (world !== undefined && !(world === null && Date.now() - worldAsked > 10 * 60e3)) return;
    world = null;
    worldReading = true;
    worldAsked = Date.now();
    reader.index().then(w => {
      if (!alive) return;
      worldReading = false;
      world = w;
      wgeo = wfields = null;
      changed();
    }, () => {
      worldReading = false;
      changed();
    });
  }
  /** Échéance k du synoptique (alt : ses niveaux de pression) : prête, sinon null (demandée, redessin à son arrivée). */
  function worldStep(k, alt = false) {
    const w = world,
      key = `${w.built}:${k}${alt ? ':alt' : ''}`;
    if (wsteps.has(key)) return wsteps.get(key);
    // un fichier qui n'est pas venu (réseau coupé, publication en cours) est redemandé après 30 s, pas à chaque image
    if (!wasked.has(key) && !(wfailed.get(key) > Date.now() - 30e3)) {
      wasked.add(key);
      reader.step(w, k, alt).then(sd => {
        wasked.delete(key);
        if (!sd) wfailed.set(key, Date.now());
        if (!alive || world !== w || !sd) return;
        wsteps.set(key, sd);
        if (wsteps.size > 8) wsteps.delete(wsteps.keys().next().value);
        wgeo = null;
        changed();
      });
    }
    return null;
  }

  // ---------------------------------------------------------------- champs : un seul calcul des deux côtés
  /** Champs d'une grille de lieux à la forme d'Open-Meteo (la grille du vol, ou celle du monde par worldLocs) à une altitude
   *  pression ft (null : la surface) et un instant t ; zFix : l'altitude vraie des isobares (celle de la grille du vol,
   *  reprise par le monde : les isobares se raccordent). */
  function fieldsOf(locs, ft, t, zFix = null) {
    const cols = locs.map(loc => A.column(loc, A.hourIndex(loc.times, t)));
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
      z = zFix ?? (zs.length ? zs.reduce((s, v) => s + v, 0) / zs.length : null),
      p = cols.map(q => z == null ? null : A.pressureAtZ(q, z)),
      pv = p.filter(Number.isFinite),
      spread = pv.length ? Math.max(...pv) - Math.min(...pv) : 0;
    return {
      cols,
      ft,
      z,
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
  /** Champs de la grille du vol (ses valeurs propres : infobulles, et le calcul du monde y prend l'altitude des
   *  isobares). */
  function flightFields() {
    if (!grid) return null;
    const key = JSON.stringify([grid.key, o.levelFt, o.time]);
    if (fF?.key !== key) fF = {
      key,
      F: fieldsOf(grid.locs, o.levelFt, o.time)
    };
    return fF.F;
  }
  /** Champs du synoptique monde au niveau et à l'heure demandés : { key, k, built, G, F, X (jet, CAPE) } ; pendant la
   *  lecture d'une échéance, les précédents s'ils sont au même niveau (une autre échéance, le curseur qui avance), sinon
   *  rien : des champs d'un autre niveau (la surface quand la carte passe au FL160 et que le fichier des niveaux de
   *  pression arrive encore) fondus dans la grille du vol y dessineraient des centaines d'anneaux (null sans
   *  publication). */
  function worldFields() {
    const w = world;
    if (!w) return null;
    const ft = o.levelFt,
      fl = flightFields(),
      k = stepAt(w, o.time || Date.now() / 1000),
      sd = worldStep(k),
      sa = ft == null ? null : worldStep(k, true);
    if (!sd || (ft != null && !sa)) return wfields?.built === w.built && wfields.F.ft === ft ? wfields : null;
    const zFix = fl?.z ?? null,
      key = JSON.stringify([w.built, k, ft, zFix == null ? null : Math.round(zFix)]);
    if (wfields?.key === key) return wfields;
    const {
      G,
      F: X
    } = worldGrid(w, sd);
    wfields = {
      key,
      k,
      built: w.built,
      G,
      X,
      F: fieldsOf(worldLocs(w, sd, sa), ft, sd.time, zFix)
    };
    return wfields;
  }
  /** Largeur (en lieux) de la bande de passage de la grille du vol au synoptique : son quart extérieur. */
  const bandOf = G => Math.max(1, (Math.min(G.nx, G.ny) - 1) * 0.25);
  /** La grille du vol fondue dans le synoptique monde sur son quart extérieur : à son bord, les valeurs du monde (les
   *  lignes se raccordent, aucune teinte ne change à la limite) ; au centre, le modèle fin du vol ; entre les deux, un
   *  passage progressif — les modèles divergent (Météo-France ou ICON d'un côté, GFS de l'autre), d'autant plus que
   *  l'échéance est lointaine (zone de relaxation, comme un modèle régional imbriqué dans un modèle global). */
  function blendWorld(F, G, wf) {
    const W = wf.F;
    // deux champs du même niveau et de la même heure (à une demi-échéance près), sinon pas de fondu : il tracerait des
    // lignes qui ne sont dans aucune des deux prévisions
    if (W.ft !== F.ft || Math.abs((W.time ?? 0) - (F.time ?? 0)) > 2 * 3600) return F;
    const
      WG = wf.G,
      [w0, s0, e0, n0] = WG.bbox,
      at = (arr, lat, lon) => {
        const x = (A.wrapLon(lon) - w0) / (e0 - w0) * (WG.nx - 1),
          y = clamp((lat - s0) / (n0 - s0) * (WG.ny - 1), 0, WG.ny - 1),
          i = Math.min(WG.nx - 2, Math.floor(x)),
          j = Math.min(WG.ny - 2, Math.floor(y)),
          fx = x - i,
          fy = y - j,
          q = [arr[j * WG.nx + i], arr[j * WG.nx + i + 1], arr[(j + 1) * WG.nx + i], arr[(j + 1) * WG.nx + i + 1]];
        return q.some(v => v == null) ? null : (q[0] * (1 - fx) + q[1] * fx) * (1 - fy) + (q[2] * (1 - fx) + q[3] * fx) * fy;
      },
      uv = W.wind.map(([d, kt]) => d == null || kt == null ? [null, null] : [kt * Math.sin(d * R), kt * Math.cos(d * R)]),
      U = uv.map(x => x[0]),
      V = uv.map(x => x[1]),
      m = bandOf(G),
      out = {
        ...F,
        p: [],
        t: [],
        cc: [],
        wind: []
      };
    G.places.forEach((pl, k) => {
      const d = Math.min(pl.i, G.nx - 1 - pl.i, pl.j, G.ny - 1 - pl.j) / m,
        f = d >= 1 ? 1 : d * d * (3 - 2 * d), // part du vol : 0 au bord, 1 au-delà du quart extérieur
        mix = (a, b) => a == null ? b : b == null ? a : b + (a - b) * f;
      out.p.push(mix(F.p[k], at(W.p, pl.lat, pl.lon)));
      out.t.push(mix(F.t[k], at(W.t, pl.lat, pl.lon)));
      out.cc.push(mix(F.cc[k], at(W.cc, pl.lat, pl.lon)));
      const [d0, k0] = F.wind[k],
        u = mix(d0 == null || k0 == null ? null : k0 * Math.sin(d0 * R), at(U, pl.lat, pl.lon)),
        v = mix(d0 == null || k0 == null ? null : k0 * Math.cos(d0 * R), at(V, pl.lat, pl.lon));
      out.wind.push(u == null || v == null ? [null, null] : [((Math.atan2(u, v) / R) + 360) % 360, Math.hypot(u, v)]);
    });
    return out;
  }

  // ---------------------------------------------------------------- géométrie (une fois par jeu de données)
  /** Pas des isobares et des isothermes selon l'échelle de la carte : les mêmes des deux côtés de la grille du vol. */
  function curveSteps(pStep, zoom) {
    const z = zoom ?? 6;
    return z >= 5 ? {
      p: pStep,
      t: 2
    } : z >= 3 ? {
      p: Math.max(pStep, 4),
      t: 5
    } : {
      p: Math.max(pStep, 4),
      t: 10
    };
  }
  /** Géométrie d'une grille régulière en lat / lon (celle du vol ou celle du monde), calculée une fois par jeu de données et
   *  seulement projetée à chaque image : champs lissés en images, isobares et isothermes en segments lat / lon avec leur
   *  étiquette, hautes et basses pressions, vents. o2.merc : images rééchantillonnées en Mercator (une grille de 150° de
   *  latitude étirée en latitude serait fausse à l'écran) ; o2.tStep : pas des isothermes ; o2.thin : un vent sur deux ;
   *  o2.hlR / hlMin : rayon (lieux) et creux (hPa) d'une haute ou basse pression ; o2.wrap : la grille fait le tour du
   *  monde (sa dernière colonne recopie la première : pas de bord à l'antiméridien) ; o2.inner : largeur de la bande de
   *  passage au synoptique (lieux), sans étiquette ; o2.fade : la même, où les aplats s'effacent (la grille seule). */
  function fieldGeometry(F, G, o2 = {}) {
    const [w, s, e, n] = G.bbox,
      f = 4,
      K = o.colors(),
      dk = K.dark,
      cloud = K.cloud,
      lonOf = gx => w + (e - w) * gx / ((G.nx - 1) * f),
      latOf = gy => s + (n - s) * gy / ((G.ny - 1) * f),
      merc = r => {
        if (!o2.merc) return r;
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
          // places possibles de l'étiquette, de la meilleure à la moins bonne, espacées : le dessin prend la première dans la
          // vue (et loin de la limite tracée) ; aucune sur la bande de passage au synoptique (o2.inner : sa largeur en
          // lieux) : une ligne y change de prévision, son étiquette se lit dedans ou dehors
          const tx = (r.nx - 1) * labelAt(c.level),
            ranked = [],
            spots = [];
          for (const sg of c.segs) {
            const mx = (sg[0] + sg[2]) / 2,
              my = (sg[1] + sg[3]) / 2;
            if (o2.inner && Math.min(mx, r.nx - 1 - mx, my, r.ny - 1 - my) < o2.inner * f) continue;
            ranked.push([Math.abs(mx - tx) + Math.abs(my - (r.ny - 1) / 2) * 0.3, mx, my]);
          }
          ranked.sort((x, y) => x[0] - y[0]);
          for (const [, mx, my] of ranked) {
            if (spots.length >= 6) break;
            if (spots.every(q => Math.hypot(q[0] - mx, q[1] - my) > 3 * f)) spots.push([mx, my]);
          }
          out.push({
            k,
            level: c.level,
            color: colorOf(c.level),
            segs: c.segs.map(sg => [latOf(sg[1]), lonOf(sg[0]), latOf(sg[3]), lonOf(sg[2])]),
            label: spots.length ? {
              text: labelOf(c.level),
              at: spots.map(([mx, my]) => [latOf(my), lonOf(mx)])
            } : null
          });
        }
        return out;
      },
      // o2.fade : la grille seule (rien à quoi la fondre) : ses aplats s'effacent sur la bande de passage au lieu de finir en
      // rectangle
      fade = (nx, ny, rgbaOf) => !o2.fade ? rgbaOf : k => {
        const v = rgbaOf(k);
        if (!v) return v;
        const i = k % nx,
          j = (k - i) / nx,
          d = Math.min(i, nx - 1 - i, j, ny - 1 - j) / (o2.fade * f);
        return d >= 1 ? v : [v[0], v[1], v[2], Math.round(v[3] * d * d * (3 - 2 * d))];
      },
      image = (nx, ny, rgbaOf) => fieldCanvas(nx, ny, fade(nx, ny, rgbaOf)),
      shade = (vals, from, span, rgb, a0, a1) => vals?.some(Number.isFinite) ? (r => image(r.nx, r.ny, k => r.v[k] >= from ? [...rgb,
        Math.round(Math.min(1, (r.v[k] - from) / span) * a1 + a0)
      ] : null))(merc(A.refine(vals, G.nx, G.ny, f))) : null;
    const rt = merc(A.refine(F.t, G.nx, G.ny, f)),
      rc = merc(A.refine(F.cc, G.nx, G.ny, f)),
      tStep = o2.tStep || 2,
      r = o2.hlR || 1,
      hlMin = o2.hlMin || 0.5,
      nw = G.nx - 1,
      hl = [];
    if (F.ft == null)
      for (let j = 1; j < G.ny - 1; j++)
        for (let i = o2.wrap ? 0 : 1; i < (o2.wrap ? nw : G.nx - 1); i++) {
          const v = F.p[j * G.nx + i];
          if (v == null) continue;
          const nb = [];
          for (let dj = -r; dj <= r; dj++)
            for (let di = -r; di <= r; di++) {
              const jj = j + dj,
                ii = o2.wrap ? (((i + di) % nw) + nw) % nw : i + di;
              if ((dj || di) && jj >= 0 && jj < G.ny && ii >= 0 && ii < G.nx && F.p[jj * G.nx + ii] != null) nb.push(F.p[jj * G.nx + ii]);
            }
          const isMin = nb.every(x => x >= v) && nb.some(x => x >= v + hlMin),
            isMax = nb.every(x => x <= v) && nb.some(x => x <= v - hlMin);
          if (isMin || isMax) hl.push({
            ...G.places[j * G.nx + i],
            low: isMin,
            v
          });
        }
    return {
      bbox: [w, s, e, n],
      tImg: image(rt.nx, rt.ny, k => rt.v[k] == null ? null : [...diverging(rt.v[k], 40, dk), 120]),
      cImg: image(rc.nx, rc.ny, k => rc.v[k] > 8 ? [...cloud, Math.round(rc.v[k] / 100 * 150)] : null),
      // le synoptique monde seulement : courant-jet à 250 hPa (dès 60 kt), convection (CAPE dès 500 J/kg)
      jImg: shade(F.js, 60, 80, [124, 58, 237], 30, 100),
      capeImg: shade(F.cape, 500, 2000, [230, 120, 20], 30, 90),
      isobars: F.p.some(Number.isFinite) ? curves(F.p, F.pStep, 'p', lv => `${Math.round(lv)}`, lv => 0.2 + 0.6 * (((lv / F.pStep) % 5 + 5) % 5) /
        4, () => dk ? '#c3c2b7' : '#3d3c39') : [],
      isotherms: F.t.some(Number.isFinite) ? curves(F.t, tStep, 't', lv => `${lv < 0 ? '−' : ''}${Math.abs(lv)}°`, lv => 0.15 + 0.7 * (((lv /
        tStep) % 6 + 6) % 6) / 5, lv => lv === 0 ? '#1c5cab' : lv < 0 ? '#256abf' : '#c23b3a') : [],
      pStep: F.pStep,
      hl,
      winds: G.places.map((pl, k) => [pl, F.wind[k]]).filter(([pl, [d, kt]]) => d != null && kt != null && !(o2.thin && (pl.i + pl.j) % 2)),
      windCols: G.nx - 1
    };
  }
  /** Géométrie de la grille du vol (fondue dans le monde quand il est là). */
  function flightGeometry(zoom, K) {
    const F = flightFields();
    if (!F) return null;
    const G = grid.g,
      st = curveSteps(F.pStep, zoom),
      wf = world ? worldFields() : null,
      key = JSON.stringify([fF.key, K.dark, st, wf?.key]);
    if (geo?.key === key) return geo;
    const B = wf ? blendWorld(F, G, wf) : F;
    geo = {
      key,
      ...fieldGeometry({
        ...B,
        pStep: st.p
      }, G, {
        thin: G.places.length > 40,
        tStep: st.t,
        inner: B !== F ? bandOf(G) : 0,
        fade: B === F ? bandOf(G) : 0
      }),
      blended: B !== F
    };
    return geo;
  }
  /** Géométrie du synoptique monde (null sans publication). */
  function worldGeometry(zoom, K) {
    const wf = worldFields();
    if (!wf) return null;
    const fl = flightFields(),
      st = curveSteps(fl ? fl.pStep : wf.F.pStep, zoom),
      key = JSON.stringify([wf.key, K.dark, st]);
    if (wgeo?.key === key) return wgeo;
    wgeo = {
      key,
      k: wf.k,
      built: wf.built,
      ...fieldGeometry({
        ...wf.F,
        pStep: st.p,
        js: wf.X.js,
        cape: wf.X.cape
      }, wf.G, {
        merc: true,
        tStep: st.t,
        hlR: 3,
        hlMin: 2,
        wrap: true
      })
    };
    return wgeo;
  }

  // ---------------------------------------------------------------- dessin
  /** Une géométrie projetée par P : champs, courant-jet et convection, isobares, isothermes, hautes et basses pressions,
   *  vents (L : les couches à dessiner ; L.vb : la vue [w, s, e, n] dans les longitudes de la géométrie, marge comprise —
   *  seul ce qu'elle contient est projeté : le monde entier à chaque image coûterait cent fois la vue ; L.keep : les
   *  places d'étiquette admises). */
  function drawGeo(c, g, P, K, L) {
    const [w, s, e, n] = g.bbox,
      a = px(P(n, w)),
      b = px(P(s, e)),
      vb = L.vb,
      inV = vb ? (la, lo) => la >= vb[1] && la <= vb[3] && lo >= vb[0] && lo <= vb[2] : () => true;
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    if (L.tfill) c.drawImage(g.tImg, a.x, a.y, b.x - a.x, b.y - a.y);
    if (L.cloud) c.drawImage(g.cImg, a.x, a.y, b.x - a.x, b.y - a.y);
    if (L.conv && g.capeImg) c.drawImage(g.capeImg, a.x, a.y, b.x - a.x, b.y - a.y);
    if (L.jet && g.jImg) c.drawImage(g.jImg, a.x, a.y, b.x - a.x, b.y - a.y);
    const stroke = (list, style) => {
      for (const cv of list) {
        style(cv);
        c.beginPath();
        for (const sg of cv.segs) {
          if (!inV(sg[0], sg[1]) && !inV(sg[2], sg[3])) continue;
          const p = P(sg[0], sg[1]),
            q = P(sg[2], sg[3]);
          c.moveTo(p.x, p.y);
          c.lineTo(q.x, q.y);
        }
        c.stroke();
        c.setLineDash([]);
      }
      for (const cv of list)
        if (cv.label) {
          const p = cv.label.at.filter(([la, lo]) => inV(la, lo)).map(([la, lo]) => P(la, lo)).find(q => !L.keep || L.keep(q));
          if (p) halo(c, cv.label.text, p.x, p.y, cv.color, K.bg);
        }
    };
    c.font = '11px system-ui, sans-serif';
    if (L.isobar) stroke(g.isobars, cv => {
      c.strokeStyle = cv.color;
      c.lineWidth = cv.level % (g.pStep * 2) === 0 ? 1.6 : 0.9;
    });
    if (L.isotherm) stroke(g.isotherms, cv => {
      c.strokeStyle = cv.color;
      c.lineWidth = cv.level === 0 ? 2 : 1;
      c.setLineDash(cv.level === 0 ? [] : [5, 4]);
    });
    if (L.isobar) {
      // les plus marquées d'abord, puis 70 px au moins entre deux marques à l'écran (le monde dézoomé)
      const shown = [];
      for (const h of [...g.hl].sort((x, y) => Math.abs(y.v - 1013) - Math.abs(x.v - 1013))) {
        if (!inV(h.lat, h.lon)) continue;
        const p = P(h.lat, h.lon);
        if (L.keep && !L.keep(p) || shown.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 70)) continue;
        shown.push(p);
        c.font = 'bold 18px system-ui, sans-serif';
        halo(c, h.low ? T('low') : T('high'), p.x, p.y, h.low ? '#c23b3a' : '#1c5cab', K.bg);
        c.font = '11px system-ui, sans-serif';
        halo(c, `${Math.round(h.v)}`, p.x, p.y + 15, K.muted, K.bg);
      }
    }
    if (L.wind && g.winds.length) {
      // un vent tous les « stride » lieux : au moins 44 px entre deux barbules à l'écran, des deux côtés de la grille du vol
      const [p0] = g.winds[0],
        q0 = P(p0.lat, p0.lon),
        q1 = P(p0.lat, p0.lon + (g.bbox[2] - g.bbox[0]) / Math.max(1, g.windCols)),
        stride = Math.max(1, Math.ceil(44 / Math.max(1, Math.hypot(q1.x - q0.x, q1.y - q0.y))));
      for (const [pl, [d, kt]] of g.winds) {
        if (pl.i % stride || pl.j % stride || !inV(pl.lat, pl.lon)) continue;
        const p = P(pl.lat, pl.lon);
        barb(c, p.x, p.y, d, kt, 22, K.fg);
      }
    }
  }
  /** La vue et la grille du vol : 0 dedans ; 1 en partie dehors (le synoptique remplit ce qui dépasse) ; 2 surtout dehors
   *  (la grille couvre moins de 40 % de la vue, ou son centre en sort) ; sans vol : 2 ; fond uni (sans bornes) : 0. */
  function outside(bounds) {
    const b = grid?.g.bbox || box;
    if (!b) return 2;
    if (!bounds) return 0;
    const k = 360 * Math.round(((bounds[0] + bounds[2]) / 2 - (b[0] + b[2]) / 2) / 360),
      [w, s, e, n] = [bounds[0] - k, bounds[1], bounds[2] - k, bounds[3]];
    if (w >= b[0] && e <= b[2] && s >= b[1] && n <= b[3]) return 0;
    const ix = Math.max(0, Math.min(e, b[2]) - Math.max(w, b[0])),
      iy = Math.max(0, Math.min(n, b[3]) - Math.max(s, b[1])),
      cover = ix * iy / Math.max(1e-9, (e - w) * (n - s));
    return cover < 0.4 || !inBox(b, (s + n) / 2, (w + e) / 2) ? 2 : 1;
  }
  /** Dessine la carte météo dans c : view = { W, H, project(lat, lon) → { x, y }, bounds [w, s, e, n] | null, zoom, visible
   *  (la part vue quand le canevas déborde sous un panneau, pour info().outside ; sinon bounds) }.
   *  Ordre : courant-jet et convection partout (sous les nuages et les lignes, des deux côtés), le synoptique monde hors de
   *  la grille du vol, puis la grille du vol (fondue dans le monde) sur chaque copie visible du monde. */
  function draw(c, view) {
    if (!alive) return;
    const L = o.layers,
      K = o.colors(),
      P = view.project,
      out = outside(view.visible || view.bounds);
    last.out = out;
    if (out || L.jet || L.conv || L.cloud || L.tfill) loadWorld();
    const wg = world ? worldGeometry(view.zoom, K) : null;
    last.k = wg?.k ?? null;
    // la vue dans les longitudes d'une copie du monde, marge comprise : seul ce qu'elle contient est projeté
    const vbOf = off => {
        const b = view.bounds;
        if (!b) return null;
        const m = Math.max(1.5, (b[2] - b[0]) * 0.05);
        return [b[0] - off - m, b[1] - m, b[2] - off + m, b[3] + m];
      },
      wcopies = copiesFor(view.bounds, -180, 180),
      // le bord de la grille du vol à l'écran, une fois par copie du monde, au pixel
      rects = grid ? copiesFor(view.bounds, grid.g.bbox[0], grid.g.bbox[2]).map(off => {
        const [w, s, e, n] = grid.g.bbox,
          a = px(P(n, w + off)),
          b = px(P(s, e + off));
        return [a.x, a.y, b.x, b.y];
      }) : [],
      // distance d'un point au bord (positive dedans, négative dehors), pour les étiquettes quand le bord est tracé
      depth = q => Math.max(...rects.map(([x0, y0, x1, y1]) => q.x >= x0 && q.x <= x1 && q.y >= y0 && q.y <= y1 ? Math.min(q.x - x0, x1 -
        q.x, q.y - y0, y1 - q.y) : -Math.hypot(Math.max(x0 - q.x, 0, q.x - x1), Math.max(y0 - q.y, 0, q.y - y1))), -Infinity),
      edge = o.edge && rects.length,
      // les aplats (nuages, température, courant-jet, convection) d'une seule source : le synoptique, des deux côtés de la
      // grille du vol — deux modèles qui divergent (AROME sec, GFS humide au même niveau) y dessineraient son rectangle ;
      // la grille ne garde les siens que sans synoptique (rien autour)
      worldFills = !!wg;
    if (wg && (L.jet || L.conv || L.cloud || L.tfill))
      for (const off of wcopies) drawGeo(c, wg, (la, lo) => P(la, lo + off), K, {
        jet: L.jet,
        conv: L.conv,
        cloud: L.cloud,
        tfill: L.tfill,
        vb: vbOf(off)
      });
    if (out && wg) {
      c.save();
      if (rects.length) {
        c.beginPath();
        c.rect(0, 0, view.W, view.H);
        for (const [x0, y0, x1, y1] of rects) c.rect(x0, y0, x1 - x0, y1 - y0);
        c.clip('evenodd');
      }
      for (const off of wcopies) drawGeo(c, wg, (la, lo) => P(la, lo + off), K, {
        ...L,
        jet: false,
        conv: false,
        cloud: false,
        tfill: false,
        keep: edge ? q => depth(q) <= -EDGE_GAP : null,
        vb: vbOf(off)
      });
      c.restore();
    }
    const g = flightGeometry(view.zoom, K);
    if (g) {
      const [w, , e] = grid.g.bbox;
      for (const off of copiesFor(view.bounds, w, e)) drawGeo(c, g, off ? (la, lo) => P(la, lo + off) : P, K, {
        ...L,
        jet: false,
        conv: false,
        cloud: L.cloud && !worldFills,
        tfill: L.tfill && !worldFills,
        keep: edge ? q => depth(q) >= EDGE_GAP : null,
        vb: vbOf(off)
      });
    }
    // option edge (réglage de l'administrateur) : la limite de la grille du vol en trait fin, à la couleur des bordures
    if (edge) {
      c.save();
      c.strokeStyle = K.border || K.muted;
      c.lineWidth = 1;
      for (const [x0, y0, x1, y1] of rects) c.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0 - 1, y1 - y0 - 1);
      c.restore();
    }
  }

  // ---------------------------------------------------------------- ce que l'hôte lit
  const api = {
    draw,
    /** La limite de la zone du vol est-elle tracée (option edge). */
    get edge() {
      return !!o.edge;
    },
    /** Change des options (flight, levelFt, time, layers, gridMax, colors, edge) ; relit la réserve si le vol ou ses jours ont
     *  changé ; redessin à la charge de l'hôte (ou par attach). */
    update(partial = {}) {
      if (partial.layers) partial = {
        ...partial,
        layers: {
          ...o.layers,
          ...partial.layers
        }
      };
      Object.assign(o, partial);
      if ('colors' in partial) geo = wgeo = null;
      readGrid();
    },
    /** Relit la réserve même si rien n'a changé (après un « Charger »). */
    reload() {
      gridKey = '';
      readGrid();
    },
    get state() {
      return grid ? 'ok' : world ? 'world-only' : 'missing';
    },
    /** Ce que la carte montre : { state, reading, outside (0, 1, 2), gridBox, levels (niveaux de la grille du vol), pLabel,
     *  time, world: { run, time, h, step, source, k } | null, worldReading }. */
    info() {
      const F = flightFields(),
        wf = world ? worldFields() : null,
        k = last.k ?? wf?.k ?? null,
        t = world && k != null ? world.times[k] : null;
      return {
        state: api.state,
        reading: gridReading,
        outside: last.out,
        gridBox: grid?.g.bbox || box,
        levels: grid?.levels || [],
        pLabel: F?.pLabel || wf?.F.pLabel || '',
        time: F?.time ?? t,
        world: world ? {
          run: world.run,
          time: t,
          h: world.run && t != null ? Math.round((t - world.run) / 3600) : null,
          step: world.step,
          source: world.source || world.model,
          k
        } : null,
        worldReading: worldReading || world === undefined,
        blended: !!(F && geo?.blended),
        // les deux côtés de la grille du vol, pour la légende de l'hôte (option edge)
        zones: [box && boxModel ? {
          key: 'flight',
          label: T('zoneFlight', {
            model: RES[boxModel.id] ? T(RES[boxModel.id]) : boxModel.name
          })
        } : null, world ? {
          key: 'world',
          label: T('zoneWorld', {
            src: world.source || world.model,
            step: world.step
          })
        } : null].filter(Boolean)
      };
    },
    /** Valeurs de la grille du vol en un point (bilinéaire) : { t, p, cc, ft } ; null hors de la grille. */
    at(lat, lon) {
      const F = flightFields();
      if (!F) return null;
      const G = grid.g,
        [w, s, e, n] = G.bbox,
        gx = (A.nearLon(lon, (w + e) / 2) - w) / (e - w) * (G.nx - 1),
        gy = (lat - s) / (n - s) * (G.ny - 1);
      if (gx < 0 || gy < 0 || gx > G.nx - 1 || gy > G.ny - 1) return null;
      const i = Math.min(G.nx - 2, Math.floor(gx)),
        j = Math.min(G.ny - 2, Math.floor(gy)),
        fx = gx - i,
        fy = gy - j,
        bil = arr => {
          const q = [arr[j * G.nx + i], arr[j * G.nx + i + 1], arr[(j + 1) * G.nx + i], arr[(j + 1) * G.nx + i + 1]];
          return q.some(v => v == null) ? null : q[0] * (1 - fx) * (1 - fy) + q[1] * fx * (1 - fy) + q[2] * (1 - fx) * fy + q[3] * fx *
            fy;
        };
      return {
        t: bil(F.t),
        p: bil(F.p),
        cc: bil(F.cc),
        ft: F.ft
      };
    },
    /** Toutes les valeurs du synoptique monde en un point, à l'heure demandée : { values, time, run, step, source } ;
     *  { reading: true } pendant la lecture ; null sans publication. */
    worldPoint(lat, lon) {
      loadWorld();
      if (!world) return worldReading || world === undefined ? {
        reading: true
      } : null;
      const k = stepAt(world, o.time || Date.now() / 1000),
        sd = worldStep(k);
      if (!sd) return {
        reading: true
      };
      return {
        values: worldAt(world, sd, lat, lon),
        time: world.times[k],
        run: world.run,
        step: world.step,
        source: world.source || world.model
      };
    },
    /** Les couches de la carte météo pour un panneau Couches : [{ key, label (langue de l'appli), labels ([fr, en, de, es]),
     *  on, swatch ({ css, ramp }) }]. */
    legend() {
      const K = o.colors(),
        mid = K.dark ? '#383835' : '#f0efec',
        ramp = `linear-gradient(90deg,#0d366b,#6da7ec,${mid},#ec8a85,#9e2a2a)`,
        swatch = {
          isobar: {
            css: `color:${K.dark ? '#c3c2b7' : '#3d3c39'}`
          },
          isotherm: {
            css: 'color:#c23b3a;border-top-style:dashed'
          },
          cloud: {
            css: `linear-gradient(90deg,transparent,rgba(${K.cloud.join(',')},.7))`,
            ramp: true
          },
          wind: {
            css: '',
            barb: true
          },
          tfill: {
            css: ramp,
            ramp: true
          },
          jet: {
            css: 'linear-gradient(90deg,rgba(124,58,237,.25),rgba(124,58,237,.75))',
            ramp: true
          },
          conv: {
            css: 'linear-gradient(90deg,rgba(230,120,20,.25),rgba(230,120,20,.7))',
            ramp: true
          }
        };
      return MAP_LAYERS.map(key => ({
        key,
        label: T(LABEL[key]),
        labels: TX[LABEL[key]],
        on: !!o.layers[key],
        swatch: swatch[key]
      }));
    },
    detach() {
      alive = false;
    }
  };
  readGrid();
  return api;
}

/** La carte météo avec son propre canevas : sur une carte MapLibre (target.getCanvasContainer) ou sur un fond uni
 *  ({ container, project, size, bounds, onChange }) ; redessinée au mouvement, à la taille et à chaque lecture. */
export function attach(target, opts = {}) {
  const isMap = typeof target?.getCanvasContainer === 'function',
    host = isMap ? target.getCanvasContainer() : target.container,
    cv = document.createElement('canvas');
  cv.className = 'sog-weather-map';
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  host.append(cv);
  let frame = 0;
  const wm = createWeatherMap({
      colors: opts.colors || tokenColors(host),
      ...opts,
      onChange: () => {
        schedule();
        opts.onChange?.();
      }
    }),
    view = () => {
      if (isMap) {
        const c = target.getContainer(),
          b = target.getBounds();
        return {
          W: c.clientWidth,
          H: c.clientHeight,
          project: (lat, lon) => target.project([lon, lat]),
          bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
          zoom: target.getZoom()
        };
      }
      const s = target.size();
      return {
        ...s,
        project: target.project,
        bounds: target.bounds?.() || null,
        zoom: target.zoom?.()
      };
    },
    paint = () => {
      frame = 0;
      const v = view(),
        dpr = Math.min(3, window.devicePixelRatio || 1);
      if (cv.width !== Math.round(v.W * dpr) || cv.height !== Math.round(v.H * dpr)) {
        cv.width = Math.round(v.W * dpr);
        cv.height = Math.round(v.H * dpr);
      }
      const c = cv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, v.W, v.H);
      wm.draw(c, v);
    },
    schedule = () => {
      frame ||= requestAnimationFrame(paint);
    },
    off = isMap ? (() => {
      target.on('move', schedule);
      target.on('resize', schedule);
      return () => {
        target.off('move', schedule);
        target.off('resize', schedule);
      };
    })() : target.onChange?.(schedule) || (() => {});
  schedule();
  return {
    ...wm,
    get state() {
      return wm.state;
    },
    get edge() {
      return wm.edge;
    },
    update(partial) {
      wm.update(partial);
      schedule();
    },
    detach() {
      wm.detach();
      off();
      if (frame) cancelAnimationFrame(frame);
      cv.remove();
    }
  };
}
