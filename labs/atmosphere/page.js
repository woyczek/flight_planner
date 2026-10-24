// Maquette « Atmosphère de la route » (labs/atmosphere/README.md) — la page : vol (exemple du schéma, vol courant servi
// par le lanceur, fichier current_flight.json, texte de route), prévisions Open-Meteo de la route (24 lieux, tous les
// niveaux) et de la grille de la carte, METAR (metar.vatsim.net) et TAF (avwx.rest, clé de l'appareil posée dans les
// Réglages de la suite), puis coupe, carte, tranche, table et terrains. Chaque lieu de la route est lu à l'heure où le
// vol y passe (départ + temps estimé sans vent). Textes en français seulement (maquette).

import * as A from './atmo.js';
import * as Demo from './demo.js';
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
} from '../../modules/fuel/weather.js';

const $ = id => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a == null || b == null ? (a ?? b) : a + (b - a) * k;
const R = Math.PI / 180;

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

function notify(msg, err = false) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.toggle('err', err);
  t.classList.remove('hidden');
  clearTimeout(notify.h);
  notify.h = setTimeout(() => t.classList.add('hidden'), 7000);
}
const store = {
  get: k => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  }
};
/** Couleur d'un jeton CSS de la page. */
const tok = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const dark = () => matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.dataset.theme !== 'light' ||
  document.documentElement.dataset.theme === 'dark';
const fmtLvl = ft => ft == null ? '—' : formatLevel(Math.max(0, Math.round(ft / 100) * 100));
const fmtT = t => t == null ? '—' : `${t < 0 ? '−' : ''}${Math.abs(Math.round(t))} °C`;
const fmtDev = d => d == null ? '—' : `ISA ${d >= 0 ? '+' : '−'}${Math.abs(Math.round(d))}`;
const fmtWind = (d, kt) => d == null || kt == null ? '—' : kt < 1 ? 'calme' : `${String(Math.round(d / 10) * 10 || 360).padStart(3, '0')}/${Math.round(kt)} kt`;
const fmtHM = s => {
  const d = new Date(s * 1000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}Z`;
};
const fmtNum = (x, d = 0) => x == null || !Number.isFinite(x) ? '—' : x.toLocaleString('fr-FR', {
  maximumFractionDigits: d,
  minimumFractionDigits: d
});
const fmtComp = c => c == null ? '—' : `${c.head >= 0 ? 'face' : 'arrière'} ${Math.abs(Math.round(c.head))} · trav. ${Math.abs(Math.round(c.cross))}${c.cross >= 0 ? 'D' : 'G'}`;
const PHASE = {
  climb: 'montée',
  cruise: 'croisière',
  descent: 'descente'
};
const ICE = ['—', 'possible', 'probable'];

/** Couleurs : divergente bleu ↔ rouge, gris au milieu (température : 0 °C ; écarts : 0). */
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const BLUE = ['#0d366b', '#256abf', '#6da7ec', '#b7d3f6'],
  RED = ['#f6c9c0', '#ec8a85', '#e34948', '#9e2a2a'];

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
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/** Canevas à la taille de son bloc (pixels de l'écran). */
function sized(canvas, cssH) {
  const dpr = window.devicePixelRatio || 1,
    W = canvas.parentElement.clientWidth,
    H = cssH;
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.height = `${H}px`;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  return {
    ctx,
    W,
    H
  };
}

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

/** Texte avec un liseré de la couleur du fond. */
function halo(ctx, text, x, y, color, align = 'center', base = 'middle') {
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.lineWidth = 3;
  ctx.strokeStyle = tok('--surface');
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// ---------------------------------------------------------------- vol

/** Enregistrement du vol courant (ou de la même forme) → vol de la page. */
function fromRecord(rec, from) {
  const pts = (rec?.route?.points || []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon)).map(p => ({
    id: String(p.id || p.name || ''),
    lat: +p.lat,
    lon: +p.lon,
    alt_ft: +p.alt_ft || 0
  }));
  if (pts.length < 2) throw new Error('Ce vol n’a pas deux points positionnés au moins (route.points).');
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
/** Texte de route en coordonnées → vol ; les noms sans position sont écartés (la base aéronautique n'est pas lue ici). */
function fromText(text) {
  const toks = tokenize(text),
    pts = toks.filter(t => t.kind === 'coord').map(t => ({
      id: t.id,
      lat: t.lat,
      lon: t.lon,
      alt_ft: t.alt_ft || 0
    })),
    skipped = toks.filter(t => t.kind === 'name' && !t.airway).map(t => t.id);
  if (pts.length < 2) throw new Error('Il faut deux points au moins, en coordonnées (« ID lat lon » ou « 4530N00030E »).');
  if (skipped.length) notify(`Points sans position écartés : ${skipped.join(', ')} (la maquette ne lit pas la base aéronautique).`);
  const first = toks.find(t => t.kind === 'group' && t.alt_ft)?.alt_ft || 0;
  pts[0].alt_ft = 0;
  pts.at(-1).alt_ft = 0;
  return {
    points: pts,
    levelFt: first,
    profile: null,
    dep: pts[0].id,
    arr: pts.at(-1).id,
    altn: '',
    text,
    when: null,
    aircraft: null,
    from: 'texte'
  };
}

async function readFlight() {
  const src = $('flightSrc').value;
  if (src === 'example') return fromRecord(EXAMPLE, 'exemple');
  if (src === 'text') return fromText($('routeText').value);
  if (src === 'file') {
    const f = $('file').files?.[0];
    if (!f) throw new Error('Choisissez un fichier current_flight.json.');
    return fromRecord(JSON.parse(await f.text()), f.name);
  }
  const tri = $('tri').value.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,4}$/.test(tri)) throw new Error('Indiquez votre trigramme.');
  store.set('labs:atmosphere:tri', tri);
  let rec;
  try {
    rec = await IO.read(`pilot/${tri}/current_flight.json`);
  } catch (e) {
    throw new Error(e.status ? `Vol courant illisible (HTTP ${e.status}).` :
      'Lanceur injoignable : ouvrez cette page depuis la suite servie par le lanceur.');
  }
  if (!rec) throw new Error(`Aucun vol courant pour ${tri} (data/pilot/${tri}/current_flight.json).`);
  return fromRecord(rec, `vol courant ${tri}`);
}

// ---------------------------------------------------------------- données

/** Réserve de l'appareil : réponses gardées d'un chargement, d'un onglet et d'une session à l'autre (Cache API, cache
 *  « labs-atmosphere ») ; sans Cache API (page en http hors localhost, fichier), la mémoire de la page seulement. */
const MEM = new Map(),
  PENDING = new Map();
const keep = {
  url: key => `${location.origin}/__labs-atmosphere/${encodeURIComponent(key)}`,
  async get(key) {
    if (MEM.has(key)) return MEM.get(key);
    try {
      const r = await (await caches.open('labs-atmosphere')).match(keep.url(key)),
        v = r ? await r.json() : null;
      if (v) MEM.set(key, v);
      return v;
    } catch {
      return null;
    }
  },
  async set(key, v) {
    MEM.set(key, v);
    try {
      await (await caches.open('labs-atmosphere')).put(keep.url(key), new Response(JSON.stringify(v), {
        headers: {
          'content-type': 'application/json'
        }
      }));
    } catch {}
  }
};

/** Accès de la page à son environnement, en un seul endroit, pour que l'intégration en V3 n'ait qu'eux à remplacer
 *  (ROADMAP.md) : read(chemin du dépôt des données) → JSON, null si absent — en V3 ctx.data.read ; fetch — en V3
 *  ctx.net.fetch (relais du lanceur, clé avwx de l'appareil ajoutée par le cadre) ; cache — en V3 la politique « cache »
 *  de ctx.data (cache/fuel/aloft.json de fuel relu d'abord, pour ne pas payer deux fois le quota). */
const IO = {
  async read(path) {
    const r = await fetch(new URL(`../../data/${path.split('/').map(encodeURIComponent).join('/')}`, location.href), {
      cache: 'no-store'
    });
    if (r.status === 404) return null;
    if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), {
      status: r.status
    });
    return r.json();
  },
  fetch: (url, init) => fetch(url, init),
  cache: keep
};

/** Décompte local des appels Open-Meteo sur cet appareil (poids : lieux × variables / 10, A.callWeight), sur 24 h
 *  glissantes : la page attend plutôt que de dépasser 600 / min et s'arrête avant 10 000 / jour. Approché : le quota
 *  réel est compté par adresse IP, qu'un autre appareil ou une autre page peut partager. Sans objet avec une clé. */
const QUOTA = {
  min: 600,
  day: 10000
};
const ledger = () => {
  try {
    return JSON.parse(localStorage.getItem('labs:atmosphere:ledger') || '[]').filter(([t]) => Date.now() - t < 864e5);
  } catch {
    return [];
  }
};
const spent = (ms, l = ledger()) => l.filter(([t]) => Date.now() - t < ms).reduce((s, [, w]) => s + w, 0);
async function spend(w, stale) {
  if (spent(864e5) + w > QUOTA.day) throw Object.assign(new Error(`décompte de cet appareil : ≈ ${Math.round(spent(864e5))} appels ` +
    'sur 24 h, la demande suivante dépasserait 10 000'), {
    quota: true
  });
  for (;;) {
    const l = ledger().filter(([t]) => Date.now() - t < 6e4);
    if (spent(6e4, l) + w <= QUOTA.min || w > QUOTA.min || !l.length) break;
    if (stale()) throw Object.assign(new Error('chargement remplacé'), {
      stale: true
    });
    $('status').textContent = `Quota minute d'Open-Meteo (600 / min) : reprise dans ${Math.ceil((l[0][0] + 6e4 - Date.now()) / 1e3)} s…`;
    await new Promise(r => setTimeout(r, 2000));
  }
  store.set('labs:atmosphere:ledger', JSON.stringify([...ledger(), [Date.now(), Math.round(w * 10) / 10]]));
}

/** JSON d'une adresse ; un refus d'Open-Meteo donne sa raison ; une coupure réseau : une seconde tentative. */
async function fetchJson(url, init) {
  let r;
  for (let k = 0; k < 2 && !r; k++) r = await IO.fetch(url, init).catch(() => null);
  if (!r) throw Object.assign(new Error('réseau injoignable'), {
    offline: true
  });
  if (!r.ok) {
    let reason = '';
    try {
      reason = (await r.json()).reason || '';
    } catch {}
    throw Object.assign(new Error(reason || `HTTP ${r.status}`), {
      status: r.status
    });
  }
  return r.json();
}

/** JSON d'une adresse gardé ttl ms dans la réserve (la clé n'entre pas dans le nom) ; cacheOnly : null s'il n'y est pas. */
async function cachedJson(url, init, ttl, cacheOnly = false) {
  const key = 'url|' + url.replace(/&apikey=[^&]*/, ''),
    c = await IO.cache.get(key);
  if (c && Date.now() - c.at < ttl) return c.json;
  if (cacheOnly) return null;
  const json = await fetchJson(url, init);
  await IO.cache.set(key, {
    at: Date.now(),
    json
  });
  return json;
}

/** Variables horaires d'une demande. */
const varsOf = (levels, levelVars, surfaceVars) => [...surfaceVars, ...levels.flatMap(l => levelVars.map(v => `${v}_${l}hPa`))];
/** Variables qu'un modèle peut refuser (nébulosité par niveau, surface hors de l'essentiel) : sur un refus, la demande
 *  est refaite sans elles, et elles sont notées absentes pour ne plus être demandées. */
const CORE_SURFACE = new Set(['temperature_2m', 'dew_point_2m', 'pressure_msl', 'surface_pressure', 'cloud_cover_low',
  'cloud_cover_mid', 'cloud_cover_high'
]);
const optional = v => /^cloud_cover_\d+hPa$/.test(v) || !/hPa$/.test(v) && !CORE_SURFACE.has(v);
/** Une entrée de la réserve vaut pour le run du modèle où elle a été lue (6 h au plus), 30 min si le run est inconnu ;
 *  toujours le même jour UTC (la prévision commence à 0 h UTC du jour). */
const fresh = (e, now) => new Date(e.at).toISOString().slice(0, 10) === new Date(now).toISOString().slice(0, 10) &&
  (S.run && e.run ? e.run === S.run && now - e.at < 6 * 36e5 : now - e.at < 30 * 60e3);

/** Prévision de lieux pour des variables : Open-Meteo, ou la démonstration. La réserve garde, par modèle et par lieux,
 *  les séries déjà lues ; seules les variables manquantes sont demandées puis fusionnées (un niveau de plus ne relit
 *  pas les autres). Deux demandes pour les mêmes lieux s'attendent. { locs, weight (appels du décompte dépensés) } ;
 *  cacheOnly : null s'il manque une variable. */
async function forecast(places, vars, {
  cacheOnly = false,
  stale = () => false
} = {}) {
  if (S.data === 'demo') return {
    locs: A.locations(Demo.forecast(places, vars)),
    weight: 0
  };
  const key = `om|${S.model.id}|${places.map(p => `${(+p.lat).toFixed(3)},${(+p.lon).toFixed(3)}`).join(';')}`;
  for (let p;
    (p = PENDING.get(key));) await p.catch(() => {});
  const job = (async () => {
    const now = Date.now();
    let e = await IO.cache.get(key);
    if (e && !fresh(e, now)) e = null;
    const have = new Set(e ? [...e.vars, ...e.refused] : []);
    let missing = vars.filter(v => !have.has(v)),
      weight = 0;
    if (!missing.length) return {
      locs: A.locations(e.json),
      weight
    };
    if (cacheOnly) return null;
    const apikey = store.get('labs:atmosphere:omkey') || '',
      ask = async list => {
        const w = A.callWeight(places.length, list.length);
        if (!apikey) await spend(w, stale);
        weight += w;
        return [].concat(await fetchJson(A.forecastUrl(places, {
          model: S.model.id,
          vars: list,
          key: apikey
        })));
      };
    let json, refused = [];
    try {
      json = await ask(missing);
    } catch (err) {
      if (err.status !== 400 || !missing.some(optional)) throw err;
      notify(`Open-Meteo refuse une variable pour ${S.model.name} (${err.message}) : nouvelle demande réduite.`);
      refused = missing.filter(optional);
      missing = missing.filter(v => !optional(v));
      json = missing.length ? await ask(missing) : places.map(() => ({
        hourly: {}
      }));
    }
    if (json.length !== places.length) throw new Error('réponse incomplète d’Open-Meteo');
    // fusion : seulement sur les mêmes heures (sinon l'entrée ancienne est laissée et toutes les variables relues)
    if (e && String(e.json[0]?.hourly?.time?.[0]) !== String(json[0]?.hourly?.time?.[0] ?? e.json[0]?.hourly?.time?.[0])) {
      e = null;
      missing = vars.filter(v => !refused.includes(v));
      json = await ask(missing);
    }
    const merged = e ? e.json.map((loc, i) => ({
      ...loc,
      hourly: {
        ...loc.hourly,
        ...json[i].hourly
      }
    })) : json;
    await IO.cache.set(key, {
      at: e?.at ?? now,
      run: e ? e.run : S.run,
      vars: [...(e?.vars || []), ...missing],
      refused: [...(e?.refused || []), ...refused],
      json: merged
    });
    return {
      locs: A.locations(merged),
      weight
    };
  })();
  PENDING.set(key, job);
  try {
    return await job;
  } finally {
    if (PENDING.get(key) === job) PENDING.delete(key);
  }
}

/** Modèle dont on lit l'heure du run : un modèle « seamless » n'a pas de métadonnées, on lit celles du modèle qui
 *  porte les premières heures (essayé dans le navigateur le 24 octobre 2026 : 200, CORS ouvert). */
const RUN_OF = {
  meteofrance_seamless: 'meteofrance_arome_france_hd',
  icon_seamless: 'dwd_icon',
  gfs_seamless: 'ncep_gfs013'
};
/** Heure du dernier run du modèle (Open-Meteo, métadonnées : fichier statique, hors de l'API de prévision), gardée
 *  10 min ; null sans réponse. Elle dit si les prévisions de la réserve sont encore celles du dernier run. */
async function modelRun(model) {
  if (S.data === 'demo') return null;
  try {
    const j = await cachedJson(`https://api.open-meteo.com/data/${RUN_OF[model] || model}/static/meta.json`, {
      signal: AbortSignal.timeout(8000)
    }, 10 * 60e3);
    return j?.last_run_initialisation_time || null;
  } catch {
    return null;
  }
}

/** METAR et TAF des terrains (départ, arrivée, dégagement) : metar.vatsim.net ; TAF par avwx.rest avec la clé de
 *  l'appareil (localStorage githubData:avwx, posée dans les Réglages de la suite ; jamais affichée). */
async function aerodromes(cacheOnly = false) {
  const f = S.flight,
    ids = [f.dep, f.arr, f.altn].filter(x => /^[A-Z]{4}$/.test(x || '')).filter((x, i, a) => a.indexOf(x) === i);
  if (!ids.length) return {
    ids,
    metars: [],
    tafs: {},
    note: 'aucun indicatif OACI'
  };
  if (S.data === 'demo') {
    const pos = ids.map(id => id === f.dep ? f.points[0] : id === f.arr ? f.points.at(-1) : f.points.at(-1));
    return {
      ids,
      metars: decodeMetars(Demo.metars(ids, pos)),
      tafs: {},
      note: 'METAR inventés (démonstration)'
    };
  }
  let metars = [],
    note = [];
  try {
    const r = await IO.fetch(`https://metar.vatsim.net/metar.php?id=${ids.join(',')}`);
    metars = decodeMetars(await r.text());
    note.push('METAR : metar.vatsim.net');
  } catch {
    note.push('METAR injoignables');
  }
  const tafs = {},
    key = store.get('githubData:avwx');
  if (key) {
    for (const id of ids) {
      try {
        const j = await cachedJson(`https://avwx.rest/api/taf/${id}`, {
          headers: {
            Authorization: `BEARER ${key}`
          }
        }, 30 * 60e3, cacheOnly);
        if (j) tafs[id] = fromAvwxTaf(j);
      } catch {
        break;
      }
    }
    note.push(Object.keys(tafs).length ? 'TAF : avwx.rest' : cacheOnly ? 'TAF : « Charger » pour les lire' : 'TAF injoignables');
  } else note.push('TAF : clé avwx.rest à poser dans les Réglages de la suite');
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
      ['Distance', `${fmtNum(t.total)} NM`, `${S.flight.points.length} points · ${fmtNum(t.minutesAt(t.total))} min (sans vent)`],
      ['Niveau demandé', fmtLvl(S.levelFt), steps.length ? steps.map(s => `${fmtLvl(s.ft)} dès ${s.id}`).join(' · ') : 'sans palier planifié'],
      ['Montée / descente', `${t.toc == null ? '—' : fmtNum(t.toc)} / ${t.tod == null ? '—' : fmtNum(t.total - t.tod)} NM`, S.flight.profile ? 'profil de Carburant' :
        'taux par défaut (1 200 / 1 500 ft/min)'
      ],
      ['Vent en croisière', vx == null ? '—' : fmtWind((Math.atan2(vx, vy) / R + 360) % 360, Math.hypot(vx, vy)), head == null ? '' :
        `${head >= 0 ? 'face' : 'arrière'} ${Math.abs(Math.round(head))} kt en moyenne`
      ],
      ['Écart ISA en croisière', isa == null ? '—' : `${isa >= 0 ? '+' : '−'}${Math.abs(Math.round(isa))} °C`, ''],
      ['Isotherme 0 °C', zeros.length ? `${fmtLvl(Math.min(...zeros))}` : '—', zeros.length ? `jusqu'à ${fmtLvl(Math.max(...zeros))}` : ''],
      ['Inversions', `${invN} / ${S.cols.length}`, 'lieux avec une inversion sous le niveau'],
      ['Givrage (indicatif)', `${ice1} NM`, `dont ${ice2} NM probable`],
      ['Dans les nuages', `${cloudNm} NM`, 'nébulosité ≥ 50 % sur la trajectoire'],
      ['Altitude-densité départ', depDa == null ? '—' : `${fmtNum(Math.round(depDa / 10) * 10)} ft`, dep ? `terrain ${fmtNum(Math.round(dep.elevFt / 10) * 10)} ft` : '']
    ];
  $('kpis').replaceChildren(...items.map(([k, v, n]) => {
    const d = document.createElement('div');
    d.className = 'kpi';
    d.innerHTML = '<div class="k"></div><div class="v"></div><div class="n"></div>';
    d.children[0].textContent = k;
    d.children[1].textContent = v;
    d.children[2].textContent = n;
    return d;
  }));
}

// ---------------------------------------------------------------- coupe

const XS = {
  l: 78,
  r: 14,
  t: 26,
  strips: 5,
  stripH: 13
};

function xsGeo(W, H) {
  const bottom = 22 + XS.strips * (XS.stripH + 2) + 8,
    pw = W - XS.l - XS.r,
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
      ctx,
      W,
      H
    } = sized(cv, Math.max(380, Math.min(560, Math.round(cv.parentElement.clientWidth * 0.42)))),
    g = xsGeo(W, H),
    F = S.field,
    L = S.xsLayers,
    cw = g.pw / (F.NX - 1),
    ch = g.ph / (F.NY - 1),
    cloud = tok('--cloud');
  S.xsGeo = g;
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = tok('--surface');
  ctx.fillRect(g.x0, g.y0, g.pw, g.ph);
  // fonds : température, humidité, altitude-densité (un seul à la fois, le dernier coché l'emporte)
  const fill = L.da ? 'da' : L.temp ? 'temp' : L.rh ? 'rh' : null;
  if (fill)
    for (let j = 0; j < F.NY; j++)
      for (let i = 0; i < F.NX; i++) {
        const n = j * F.NX + i;
        if (F.below[n]) continue;
        let c;
        if (fill === 'temp' && F.tC[n] != null) c = rgba(diverging(F.tC[n], 40), 0.75);
        else if (fill === 'da' && F.daFt[n] != null) c = rgba(diverging(F.daFt[n], 4000), 0.75);
        else if (fill === 'rh' && F.rh[n] != null) c = rgba(hex('#2a78d6'), clamp((F.rh[n] - 30) / 70, 0, 1) * 0.6);
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(g.x0 + (i - 0.5) * cw, g.y0 + g.ph - (j + 0.5) * ch, cw + 0.6, ch + 0.6);
      }
  // nuages
  if (L.cloud)
    for (let j = 0; j < F.NY; j++)
      for (let i = 0; i < F.NX; i++) {
        const n = j * F.NX + i,
          c = F.cc[n];
        if (F.below[n] || !(c > 5)) continue;
        ctx.fillStyle = `rgba(${cloud},${(c / 100) * 0.62})`;
        ctx.fillRect(g.x0 + (i - 0.5) * cw, g.y0 + g.ph - (j + 0.5) * ch, cw + 0.6, ch + 0.6);
      }
  // inversions (température qui monte avec l'altitude) et givrage, par colonnes de cellules contiguës
  const runs = (test, style) => {
    ctx.fillStyle = style;
    for (let i = 0; i < F.NX; i++) {
      let start = -1;
      for (let j = 0; j <= F.NY; j++) {
        const on = j < F.NY && test(i, j);
        if (on && start < 0) start = j;
        if (!on && start >= 0) {
          ctx.fillRect(g.x0 + (i - 0.5) * cw, g.y0 + g.ph - (j - 0.5) * ch, cw + 0.6, (j - start) * ch);
          start = -1;
        }
      }
    }
  };
  if (L.inv) runs((i, j) => {
    const n = j * F.NX + i,
      up = (j + 1) * F.NX + i;
    return j + 1 < F.NY && !F.below[n] && F.tC[n] != null && F.tC[up] != null && F.tC[up] - F.tC[n] > 0.02;
  }, hatch(ctx, tok('--inv'), 45, 7, 1.4));
  if (L.ice) {
    const lvl = (i, j) => {
      const n = j * F.NX + i;
      return F.below[n] ? 0 : A.icing({
        tC: F.tC[n],
        rh: F.rh[n],
        cc: F.cc[n]
      });
    };
    runs((i, j) => lvl(i, j) === 1, hatch(ctx, rgba(hex('#c98500'), 0.55), 135, 9, 1));
    runs((i, j) => lvl(i, j) === 2, hatch(ctx, tok('--ice'), 135, 5, 1.6));
  }
  // isothermes tous les 5 °C, 0 °C appuyé
  if (L.iso) {
    const iso = A.contours(F.tC.map((v, n) => F.below[n] ? null : v), F.NX, F.NY, A.thresholdsOf(F.tC, 5)),
      X = gx => g.x0 + gx * cw,
      Y = gy => g.y0 + g.ph - gy * ch;
    for (const c of iso) {
      const zero = c.level === 0;
      ctx.strokeStyle = zero ? '#1c5cab' : c.level < 0 ? 'rgba(37,106,191,.55)' : 'rgba(227,73,72,.55)';
      ctx.lineWidth = zero ? 2 : 1;
      ctx.setLineDash(zero ? [] : [4, 3]);
      ctx.beginPath();
      for (const s of c.segs) {
        ctx.moveTo(X(s[0]), Y(s[1]));
        ctx.lineTo(X(s[2]), Y(s[3]));
      }
      ctx.stroke();
      ctx.setLineDash([]);
      // étiquette sur le segment le plus proche d'un point qui glisse avec le niveau (évite les empilements)
      const gx = (F.NX - 1) * (0.12 + 0.76 * (((c.level / 5) % 7 + 7) % 7) / 6);
      let best = null,
        bd = Infinity;
      for (const s of c.segs) {
        const d = Math.abs((s[0] + s[2]) / 2 - gx);
        if (d < bd) {
          bd = d;
          best = s;
        }
      }
      if (best) halo(ctx, `${c.level < 0 ? '−' : ''}${Math.abs(c.level)}°`, X((best[0] + best[2]) / 2), Y((best[1] + best[3]) / 2), zero ? '#1c5cab' : tok(
        '--ink-2'));
    }
  }
  // base des cumulus estimée (sol + 400 ft par degré d'écart au point de rosée)
  if (L.cu) {
    ctx.save();
    ctx.strokeStyle = tok('--ink-2');
    ctx.setLineDash([1, 3]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    S.route.samples.forEach((s, i) => {
      const b = A.cumulusBaseFt(S.cols[i]);
      if (b == null) return;
      const x = g.xOf(s.nm),
        y = g.yOf(Math.min(b, F.top));
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  }
  // relief (altitude pression du sol)
  ctx.fillStyle = tok('--terrain');
  ctx.beginPath();
  ctx.moveTo(g.x0, g.y0 + g.ph);
  S.route.samples.forEach((s, i) => ctx.lineTo(g.xOf(s.nm), g.yOf(Math.max(0, S.cols[i].sfc.pa))));
  ctx.lineTo(g.x0 + g.pw, g.y0 + g.ph);
  ctx.closePath();
  ctx.fill();
  // vent : une barbule par lieu de lecture et tous les 3 000 ft (tous les deux lieux si serré)
  if (L.wind) {
    const every = Math.max(1, Math.ceil(30 / (g.pw / S.route.samples.length)));
    S.route.samples.forEach((s, i) => {
      if (i % every) return;
      for (let ft = 3000; ft < F.top; ft += F.top > 20000 ? 5000 : 3000) {
        const x = A.at(S.cols[i], ft);
        if (!x || x.below || x.dirDeg == null) continue;
        barb(ctx, g.xOf(s.nm), g.yOf(ft), x.dirDeg, x.kt, 20, tok('--ink-2'));
      }
    });
  }
  // trajectoires : demandée, planifiée, calculée
  const line = (fn, color, dash, w) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.setLineDash(dash);
    ctx.beginPath();
    for (let x = 0; x <= g.pw; x += 2) {
      const nm = g.nmOf(g.x0 + x),
        y = g.yOf(fn(nm));
      x ? ctx.lineTo(g.x0 + x, y) : ctx.moveTo(g.x0 + x, y);
    }
    ctx.stroke();
    ctx.restore();
  };
  line(S.traj.requested, tok('--s-requested'), [2, 4], 2);
  line(S.traj.planned, tok('--s-planned'), [7, 4], 2);
  line(S.traj.computed, tok('--s-computed'), [], 2.5);
  for (const [nm, lab] of [
      [S.traj.toc, 'TOC'],
      [S.traj.tod, 'TOD']
    ])
    if (nm != null) {
      const x = g.xOf(nm),
        y = g.yOf(S.traj.computed(nm));
      ctx.fillStyle = tok('--s-computed');
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
      halo(ctx, lab, x, y - 11, tok('--s-computed'));
    }
  // points de la route et tranche choisie
  ctx.save();
  S.flight.points.forEach((p, i) => {
    const x = g.xOf(S.traj.nmOf[i]);
    ctx.strokeStyle = tok('--line');
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(x, g.y0);
    ctx.lineTo(x, g.y0 + g.ph);
    ctx.stroke();
    halo(ctx, p.id, clamp(x, g.x0 + 18, g.x0 + g.pw - 18), g.y0 - 10, tok('--ink'));
  });
  ctx.restore();
  const sx = g.xOf(S.route.samples[S.sel].nm);
  ctx.strokeStyle = tok('--accent');
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(sx, g.y0);
  ctx.lineTo(sx, g.y0 + g.ph);
  ctx.stroke();
  // axes
  ctx.fillStyle = tok('--ink-2');
  ctx.strokeStyle = tok('--grid');
  ctx.lineWidth = 1;
  const stepFt = F.top > 25000 ? 5000 : F.top > 12000 ? 2000 : 1000;
  for (let ft = 0; ft <= F.top; ft += stepFt) {
    const y = g.yOf(ft);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(ft ? fmtLvl(ft) : '0', g.x0 - 6, y);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const nmStep = [10, 20, 25, 50, 100, 200].find(s => g.pw / (S.traj.total / s) > 60) || 200;
  for (let nm = 0; nm <= S.traj.total; nm += nmStep) ctx.fillText(`${nm}`, g.xOf(nm), g.y0 + g.ph + 4);
  ctx.textAlign = 'right';
  ctx.fillText('NM', g.x0 + g.pw, g.y0 + g.ph + 4);
  ctx.strokeStyle = tok('--line');
  ctx.strokeRect(g.x0 + 0.5, g.y0 + 0.5, g.pw, g.ph);
  // bandes de surface : nébulosité basse, moyenne, haute, précipitations, visibilité
  const strips = [
    ['Nébul. basse', c => c.sfc.ccL, v => `rgba(${cloud},${v / 100 * 0.85})`],
    ['moyenne', c => c.sfc.ccM, v => `rgba(${cloud},${v / 100 * 0.85})`],
    ['haute', c => c.sfc.ccH, v => `rgba(${cloud},${v / 100 * 0.85})`],
    ['Précip.', c => c.sfc.precip, v => rgba(hex('#2a78d6'), clamp(v / 4, 0, 1) * 0.9)],
    ['Visi < 8 km', c => c.sfc.visM, v => v < 8000 ? rgba(hex('#fab219'), clamp((8000 - v) / 7000, 0.15, 1)) : 'transparent']
  ];
  strips.forEach(([lab, get, col], k) => {
    const y = g.y0 + g.ph + 22 + k * (XS.stripH + 2);
    ctx.fillStyle = tok('--ink-2');
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(lab, g.x0 - 6, y + XS.stripH / 2);
    ctx.fillStyle = tok('--grid');
    ctx.fillRect(g.x0, y, g.pw, XS.stripH);
    const smp = S.route.samples;
    smp.forEach((s, i) => {
      const v = get(S.cols[i]);
      if (v == null) return;
      const xa = i ? (g.xOf(smp[i - 1].nm) + g.xOf(s.nm)) / 2 : g.x0,
        xb = i < smp.length - 1 ? (g.xOf(s.nm) + g.xOf(smp[i + 1].nm)) / 2 : g.x0 + g.pw;
      ctx.fillStyle = col(v);
      ctx.fillRect(xa, y, xb - xa, XS.stripH);
    });
  });
  $('xsSub').textContent = `chaque lieu lu à l'heure de passage · ${S.route.samples.length} lieux · altitude pression`;
}

function xsLegend() {
  const L = S.xsLayers,
    items = [
      `<span><span class="sw" style="color:var(--s-computed)"></span> Trajectoire calculée</span>`,
      `<span><span class="sw" style="color:var(--s-planned);border-top-style:dashed"></span> Niveaux planifiés</span>`,
      `<span><span class="sw" style="color:var(--s-requested);border-top-style:dotted"></span> Niveau demandé</span>`
    ];
  if (L.cloud) items.push(`<span><span class="ramp" style="background:linear-gradient(90deg,transparent,rgba(${tok('--cloud')},.62))"></span> nébulosité 0 → 100 %</span>`);
  if (L.temp) items.push(`<span>−40 °C <span class="ramp" style="background:linear-gradient(90deg,#0d366b,#6da7ec,${dark() ? '#383835' : '#f0efec'},#ec8a85,#9e2a2a)"></span> +40 °C</span>`);
  if (L.da) items.push(`<span>altitude-densité − altitude pression : −4 000 <span class="ramp" style="background:linear-gradient(90deg,#0d366b,#6da7ec,${dark() ? '#383835' : '#f0efec'},#ec8a85,#9e2a2a)"></span> +4 000 ft</span>`);
  if (L.rh) items.push(`<span>humidité 30 <span class="ramp" style="background:linear-gradient(90deg,transparent,rgba(42,120,214,.6))"></span> 100 %</span>`);
  if (L.iso) items.push(`<span><span class="sw" style="color:#1c5cab"></span> 0 °C · isothermes tous les 5 °C</span>`);
  if (L.inv) items.push(`<span style="color:var(--inv)">▨ inversion</span>`);
  if (L.ice) items.push(`<span style="color:#c98500">▧ givrage possible</span><span style="color:var(--ice)">▧ givrage probable</span>`);
  if (L.cu) items.push(`<span>··· base des cumulus (estimée)</span>`);
  items.push(`<span><span class="ramp" style="background:var(--terrain);width:18px"></span> relief</span>`);
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
  let html = `<b>${fmtNum(nm)} NM · ${fmtLvl(ft)}</b> <span class="m">· trajectoire ${fmtLvl(tr)} (${PHASE[S.traj.phase(nm)]})</span><br>`;
  if (!v || v.below) html += `<span class="m">sous le relief (sol ${fmtLvl(v?.ground)})</span>`;
  else {
    const c = A.windComponents(v.dirDeg, v.kt, p.track),
      ice = A.icing(v);
    html += `${fmtT(v.tC)} <span class="m">(${fmtDev(v.isaDev)})</span> · rosée ${fmtT(v.tdC)} · HR ${fmtNum(v.rh)} %<br>` +
      `nuages ${fmtNum(v.cc)} % · vent ${fmtWind(v.dirDeg, v.kt)} <span class="m">${fmtComp(c)}</span><br>` +
      `ρ ${fmtNum(v.rho, 3)} kg/m³ · altitude-densité ${fmtLvl(v.daFt)} · vraie ≈ ${fmtNum(Math.round((v.zFt ?? 0) / 10) * 10)} ft` +
      (ice ? `<br><b style="color:var(--ice)">givrage ${ICE[ice]}</b>` : '');
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
      ctx,
      W,
      H
    } = sized(cv, 440),
    top = S.field.top,
    l = 46,
    r = 74,
    t = 10,
    b = 24,
    pw = W - l - r,
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
  ctx.font = '11px system-ui, sans-serif';
  // grille des températures
  for (let tc = tMin; tc <= tMax; tc += 10) {
    ctx.strokeStyle = tc === 0 ? '#1c5cab' : tok('--grid');
    ctx.lineWidth = tc === 0 ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(X(tc), t);
    ctx.lineTo(X(tc), t + ph);
    ctx.stroke();
    ctx.fillStyle = tok('--ink-2');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${tc}°`, X(tc), t + ph + 5);
  }
  const stepFt = top > 25000 ? 5000 : top > 12000 ? 2000 : 1000;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let ft = 0; ft <= top; ft += stepFt) {
    ctx.strokeStyle = tok('--grid');
    ctx.beginPath();
    ctx.moveTo(l, Y(ft));
    ctx.lineTo(l + pw, Y(ft));
    ctx.stroke();
    ctx.fillStyle = tok('--ink-2');
    ctx.fillText(ft ? fmtLvl(ft) : '0', l - 5, Y(ft));
  }
  // inversions
  ctx.fillStyle = hatch(ctx, tok('--inv'), 45, 7, 1.4);
  for (const v of A.inversions(col))
    if (v.fromFt < top) ctx.fillRect(l, Y(Math.min(top, v.toFt)), pw, Y(v.fromFt) - Y(Math.min(top, v.toFt)));
  // relief
  ctx.fillStyle = tok('--terrain');
  ctx.fillRect(l, Y(Math.max(0, col.sfc.pa)), pw + r, t + ph - Y(Math.max(0, col.sfc.pa)));
  // atmosphère type
  ctx.strokeStyle = tok('--muted');
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(X(A.isaC(0)), Y(0));
  ctx.lineTo(X(A.isaC(top)), Y(top));
  ctx.stroke();
  ctx.setLineDash([]);
  // température et point de rosée
  for (const [k, c] of [
      ['tdC', '#008300'],
      ['tC', '#e34948']
    ]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    ctx.beginPath();
    prof.forEach((p, n) => p[k] != null && (n ? ctx.lineTo(X(p[k]), Y(p.ft)) : ctx.moveTo(X(p[k]), Y(p.ft))));
    ctx.stroke();
  }
  // nuages (colonne à droite) et vent
  const cloud = tok('--cloud');
  prof.forEach(p => {
    if (!(p.cc > 5)) return;
    ctx.fillStyle = `rgba(${cloud},${p.cc / 100 * 0.8})`;
    ctx.fillRect(l + pw + 4, Y(p.ft + 100), 22, Y(p.ft - 100) - Y(p.ft + 100));
  });
  for (let ft = Math.ceil((col.sfc.pa + 500) / stepFt) * stepFt; ft < top; ft += stepFt) {
    const x = A.at(col, ft);
    if (x && !x.below) barb(ctx, l + pw + 52, Y(ft), x.dirDeg, x.kt, 18, tok('--ink-2'));
  }
  // niveaux du vol à cette distance
  const lv = [
    [S.traj.requested(s.nm), '--s-requested', [2, 4]],
    [S.traj.planned(s.nm), '--s-planned', [7, 4]],
    [S.traj.computed(s.nm), '--s-computed', []]
  ];
  for (const [ft, c, dash] of lv) {
    ctx.strokeStyle = tok(c);
    ctx.lineWidth = 2;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(l, Y(ft));
    ctx.lineTo(l + pw, Y(ft));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = tok('--line');
  ctx.strokeRect(l + 0.5, t + 0.5, pw, ph);
  // en-tête et lecture
  const leg = A.posAt(S.flight.points, S.traj.nmOf, s.nm).leg,
    near = s.point >= 0 ? S.flight.points[s.point].id : `entre ${S.flight.points[leg].id} et ${S.flight.points[leg + 1].id}`,
    ft = S.traj.computed(s.nm),
    x = A.at(col, ft),
    p = A.posAt(S.flight.points, S.traj.nmOf, s.nm),
    comp = x && !x.below ? A.windComponents(x.dirDeg, x.kt, p.track) : null,
    inv = A.inversions(col),
    zeros = A.zeroIsotherms(col),
    cu = A.cumulusBaseFt(col),
    sf = col.sfc;
  $('sliceHead').textContent = `Tranche ${i + 1} / ${S.route.samples.length} — ${fmtNum(s.nm)} NM, ${near} — ${col.time ? fmtHM(col.time) : '—'} ` +
    `(passage estimé ${fmtHM(s.t)})`;
  const rows = [
    ['Au sol', `${fmtNum(Math.round(col.elevFt / 10) * 10)} ft · QNH ${fmtNum(sf.mslp)} hPa · ${fmtT(sf.tC)} / rosée ${fmtT(sf.tdC)} · vent ${fmtWind(sf.dir, sf.kt)}`],
    ['Nébulosité', `basse ${fmtNum(sf.ccL)} % · moyenne ${fmtNum(sf.ccM)} % · haute ${fmtNum(sf.ccH)} %` + (sf.visM != null ? ` · visi ${fmtNum(sf.visM / 1000, 1)} km` : '') +
      (sf.precip ? ` · précip. ${fmtNum(sf.precip, 1)} mm/h` : '')
    ],
    ['Inversions', inv.length ? inv.map(v => `${v.ground ? 'au sol → ' : `${fmtLvl(v.fromFt)} → `}${fmtLvl(v.toFt)} (+${fmtNum(v.dT, 1)} °C)`).join(' · ') : 'aucune'],
    ['0 °C', zeros.length ? zeros.map(fmtLvl).join(' · ') : '—'],
    ['Base des cumulus', cu == null ? '—' : `${fmtLvl(cu)} (estimée)` + (sf.cape != null ? ` · CAPE ${fmtNum(sf.cape)} J/kg` : '')],
    [`Trajectoire ${fmtLvl(ft)} (${PHASE[S.traj.phase(s.nm)]})`, !x || x.below ? '—' : `${fmtT(x.tC)} (${fmtDev(x.isaDev)}) · vent ${fmtWind(x.dirDeg, x.kt)} ${fmtComp(comp)} · ` +
      `nuages ${fmtNum(x.cc)} % · altitude-densité ${fmtLvl(x.daFt)}` + (A.icing(x) ? ` · givrage ${ICE[A.icing(x)]}` : '')
    ]
  ];
  $('sliceInfo').replaceChildren(...rows.map(([k, v]) => {
    const d = document.createElement('div');
    d.innerHTML = '<span class="m"></span> ';
    d.firstChild.textContent = `${k} :`;
    d.append(v);
    return d;
  }));
  // puces des points de la route
  const wps = S.route.samples.map((q, j) => [q, j]).filter(([q]) => q.point >= 0);
  $('sliceWps').replaceChildren(...wps.map(([q, j]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
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
  tip.innerHTML = `<b>${fmtLvl(ft)}</b> <span class="m">${fmtNum(v.hPa)} hPa</span><br>${fmtT(v.tC)} (${fmtDev(v.isaDev)}) · rosée ${fmtT(v.tdC)}<br>` +
    `HR ${fmtNum(v.rh)} % · nuages ${fmtNum(v.cc)} % · vent ${fmtWind(v.dirDeg, v.kt)}`;
  tip.style.display = 'block';
  tip.style.left = `${Math.min(x + 12, rect.width - tip.offsetWidth)}px`;
  tip.style.top = `${clamp(y - 16, 0, rect.height - tip.offsetHeight)}px`;
}

// ---------------------------------------------------------------- table

function table() {
  const smp = S.route.samples,
    head = ['Lieu', 'NM', 'Passage', 'Phase', 'Trajectoire', 'Planifié', 'Temp.', 'ISA', 'Vent', 'Face / travers', 'Nuages', 'Givrage',
      'Alt.-densité',
      'Inversion', 'QNH', 'Sol', 'Nébul. B / M / H'
    ];
  const rows = smp.map((s, i) => {
    const col = S.cols[i],
      ft = S.traj.computed(s.nm),
      x = A.at(col, ft),
      p = A.posAt(S.flight.points, S.traj.nmOf, s.nm),
      c = x && !x.below ? A.windComponents(x.dirDeg, x.kt, p.track) : null,
      ice = x && !x.below ? A.icing(x) : 0,
      inv = A.inversions(col).filter(v => v.fromFt <= Math.max(ft, S.levelFt)),
      sf = col.sfc,
      cells = [s.point >= 0 ? S.flight.points[s.point].id : '·', fmtNum(s.nm), fmtHM(s.t), PHASE[S.traj.phase(s.nm)], fmtLvl(ft),
        fmtLvl(S.traj.planned(s.nm)),
        x && !x.below ? fmtT(x.tC) : '—', x && !x.below ? fmtDev(x.isaDev).replace('ISA ', '') : '—', x && !x.below ? fmtWind(x.dirDeg,
          x.kt) : '—',
        c ? `${Math.round(c.head)} / ${Math.abs(Math.round(c.cross))}${c.cross >= 0 ? 'D' : 'G'}` : '—', x && !x.below ? `${fmtNum(x.cc)} %` : '—',
        ice ? `<span class="flag ice${ice}">${ICE[ice]}</span>` : '—', x && !x.below ? fmtLvl(x.daFt) : '—',
        inv.length ? `<span class="flag inv">${inv.map(v => `${v.ground ? 'sol' : fmtLvl(v.fromFt)}–${fmtLvl(v.toFt)}`).join(', ')}</span>` : '—',
        fmtNum(sf.mslp), `${fmtT(sf.tC)}`, `${fmtNum(sf.ccL)} / ${fmtNum(sf.ccM)} / ${fmtNum(sf.ccH)}`
      ];
    return `<tr data-i="${i}" class="${s.point >= 0 ? 'wp' : ''}${i === S.sel ? ' sel' : ''}">${cells.map(v => `<td>${v}</td>`).join('')}</tr>`;
  });
  $('tbl').innerHTML = `<thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody>`;
}

// ---------------------------------------------------------------- terrains

function aerodromeCards() {
  const W = S.wx;
  $('wxSub').textContent = W?.note || '';
  if (!W) return $('wx').replaceChildren();
  const f = S.flight,
    whenOf = id => id === f.dep ? S.depTime : S.route.samples.at(-1).t;
  $('wx').replaceChildren(...W.ids.map(id => {
    const m = W.metars.find(x => x.icaoId === id) || null,
      st = station(m, W.tafs[id] || null, whenOf(id)),
      d = document.createElement('div');
    d.className = 'st';
    const role = id === f.dep ? 'départ' : id === f.arr ? 'arrivée' : 'dégagement';
    if (!st) {
      d.innerHTML = `<span class="id">${id}</span> <span class="status">${role} — aucun message</span>`;
      return d;
    }
    const vis = st.vis ? st.vis.sm >= 6 ? '≥ 10 km' : `${fmtNum(st.vis.sm * 1.609, 1)} km` : '—';
    d.innerHTML = `<div><span class="id">${id}</span> <span class="status">${role} · ${st.source}${st.source === 'TAF' ? ` à ${fmtHM(st.at)}` : ''}</span> ` +
      (st.cat ? `<span class="cat ${st.cat}">${st.cat}</span>` : '') + (st.convective ? ' <span class="flag ice2">CB / TCU</span>' : '') + '</div>' +
      `<div>vent ${fmtWind(st.wdir === 'VRB' ? null : st.wdir, st.wspd)}${st.wdir === 'VRB' ? ` VRB ${st.wspd} kt` : ''}${st.wgst ? ` rafales ${st.wgst} kt` : ''} · visi ${vis} · ` +
      `plafond ${st.ceil == null ? '—' : `${fmtNum(st.ceil)} ft`}${st.temp != null ? ` · ${fmtT(st.temp)}` : ''}${st.qnh ? ` · QNH ${fmtNum(st.qnh)}` : ''}${st.wx ? ` · ${st.wx}` : ''}</div>` +
      `<div class="raw"></div>`;
    d.querySelector('.raw').textContent = st.raw;
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

function initMap() {
  if (S.map || !window.maplibregl) return;
  const style = dark() ? 'https://tiles.openfreemap.org/styles/dark' : 'https://tiles.openfreemap.org/styles/positron';
  try {
    S.map = new maplibregl.Map({
      container: 'map',
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
    $('mapSub').textContent = 'fond de carte injoignable : fond neutre';
  };
  S.map.on('error', () => !S.map.isStyleLoaded() && blank());
  setTimeout(() => !S.map.isStyleLoaded() && blank(), 6000);
  S.map.on('move', drawMap);
  S.map.on('resize', drawMap);
  S.map.on('load', drawMap);
  S.map.on('idle', drawMap);
  S.map.on('mousemove', e => mapTip(e.lngLat.lng, e.lngLat.lat, e.point));
  S.map.on('mouseout', () => $('mapCanvas').title = '');
}

/** Projection lon / lat → pixels de la carte (MapLibre, sinon équirectangulaire sur l'emprise de la grille). */
function projector(W, H) {
  if (S.map) return (lon, lat) => S.map.project([lon, lat]);
  const [w, s, e, n] = S.grid.g.bbox,
    k = Math.min(W / ((e - w) * Math.cos((s + n) / 2 * R)), H / (n - s)),
    ox = (W - (e - w) * Math.cos((s + n) / 2 * R) * k) / 2,
    oy = (H - (n - s) * k) / 2;
  return (lon, lat) => ({
    x: ox + (lon - w) * Math.cos((s + n) / 2 * R) * k,
    y: oy + (n - lat) * k
  });
}

/** Altitudes fixes proposées pour la carte (ft), en plus du niveau demandé et des paliers. */
const MAP_FIXED = [5000, 10000, 18000, 24000, 30000];
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
    t: cols.map(c => c.sfc.tC),
    cc: cols.map(c => Math.max(c.sfc.ccL ?? 0, c.sfc.ccM ?? 0, c.sfc.ccH ?? 0)),
    p: cols.map(c => c.sfc.mslp),
    wind: cols.map(c => [c.sfc.dir, c.sfc.kt]),
    pStep: 2,
    pLabel: 'isobares au niveau de la mer (2 hPa)',
    time: cols[0]?.time
  };
  const xs = cols.map(c => A.at(c, ft)),
    zs = xs.map(x => x && !x.below ? x.zFt : null).filter(Number.isFinite),
    z = zs.length ? zs.reduce((s, v) => s + v, 0) / zs.length : null,
    p = cols.map(c => z == null ? null : A.pressureAtZ(c, z)),
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
    pLabel: z == null ? '' : `isobares à ${fmtNum(Math.round(z / 50) * 50)} ft d'altitude vraie, ≈ ${fmtLvl(ft)} (${spread > 12 ? 2 : 1} hPa)`,
    time: cols[0]?.time
  };
}

function drawMap() {
  const cv = $('mapCanvas');
  if (!S.grid || !S.traj) return cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
  const
    box = $('map'),
    dpr = window.devicePixelRatio || 1,
    W = box.clientWidth,
    H = box.clientHeight;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
  }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const P = projector(W, H),
    G = S.grid.g,
    [w, s, e, n] = G.bbox,
    F = S.mapF || (S.mapF = mapFields()),
    L = S.mapLayers,
    f = 4,
    lonOf = gx => w + (e - w) * gx / ((G.nx - 1) * f),
    latOf = gy => s + (n - s) * gy / ((G.ny - 1) * f),
    cloud = tok('--cloud');
  ctx.font = '11px system-ui, sans-serif';
  if (!S.map) {
    ctx.fillStyle = tok('--grid');
    ctx.fillRect(0, 0, W, H);
  }
  // fonds : température (facultatif), nuages
  const cells = (vals, colorOf) => {
    const r = A.refine(vals, G.nx, G.ny, f);
    for (let j = 0; j < r.ny - 1; j++)
      for (let i = 0; i < r.nx - 1; i++) {
        const v = r.v[j * r.nx + i];
        if (v == null) continue;
        const c = colorOf(v);
        if (!c) continue;
        // bords arrondis au pixel : cases jointives, sans recouvrement (pas de couture dans un fond transparent)
        const a = P(lonOf(i), latOf(j)),
          b = P(lonOf(i + 1), latOf(j + 1)),
          x0 = Math.round(Math.min(a.x, b.x)),
          y0 = Math.round(Math.min(a.y, b.y));
        ctx.fillStyle = c;
        ctx.fillRect(x0, y0, Math.round(Math.max(a.x, b.x)) - x0, Math.round(Math.max(a.y, b.y)) - y0);
      }
  };
  if (L.tfill) cells(F.t, v => rgba(diverging(v, 40), 0.45));
  if (L.cloud) cells(F.cc, v => v > 8 ? `rgba(${cloud},${v / 100 * 0.6})` : null);
  // courbes
  const curves = (vals, step, style, labelOf, labelAt) => {
    const r = A.refine(vals, G.nx, G.ny, f),
      cs = A.contours(r.v, r.nx, r.ny, A.thresholdsOf(vals, step));
    for (const c of cs) {
      style(c.level);
      ctx.beginPath();
      for (const sg of c.segs) {
        const a = P(lonOf(sg[0]), latOf(sg[1])),
          b = P(lonOf(sg[2]), latOf(sg[3]));
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
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
      if (best) {
        const q = P(lonOf((best[0] + best[2]) / 2), latOf((best[1] + best[3]) / 2));
        halo(ctx, labelOf(c.level), q.x, q.y, ctx.strokeStyle);
      }
    }
  };
  if (L.isobar && F.p.some(Number.isFinite)) curves(F.p, F.pStep, lv => {
    ctx.strokeStyle = dark() ? '#c3c2b7' : '#3d3c39';
    ctx.lineWidth = lv % (F.pStep * 2) === 0 ? 1.6 : 0.9;
  }, lv => `${Math.round(lv)}`, lv => 0.2 + 0.6 * (((lv / F.pStep) % 5 + 5) % 5) / 4);
  if (L.isotherm && F.t.some(Number.isFinite)) curves(F.t, 2, lv => {
    ctx.strokeStyle = lv === 0 ? '#1c5cab' : lv < 0 ? '#256abf' : '#c23b3a';
    ctx.lineWidth = lv === 0 ? 2 : 1;
    ctx.setLineDash(lv === 0 ? [] : [5, 4]);
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
        ctx.font = 'bold 18px system-ui, sans-serif';
        halo(ctx, isMin ? 'D' : 'A', q.x, q.y, isMin ? '#c23b3a' : '#1c5cab');
        ctx.font = '11px system-ui, sans-serif';
        halo(ctx, `${Math.round(v)}`, q.x, q.y + 15, tok('--ink-2'));
      }
  }
  // vent
  if (L.wind) G.places.forEach((pl, k) => {
    if ((pl.i + pl.j) % 2 && G.places.length > 40) return;
    const [d, kt] = F.wind[k],
      q = P(pl.lon, pl.lat);
    barb(ctx, q.x, q.y, d, kt, 22, dark() ? '#f0efec' : '#17202a');
  });
  // route : trajectoire calculée colorée par la température rencontrée en mode « trajectoire », sinon trait
  const pts = S.flight.points;
  ctx.lineCap = 'round';
  if (S.mapLevel === 'traj') {
    // liseré d'un seul tracé, puis les tronçons de 1 NM colorés par-dessus
    const q = S.along.map(a => {
      const p = A.posAt(pts, S.traj.nmOf, a.nm);
      return P(p.lon, p.lat);
    });
    ctx.strokeStyle = tok('--surface');
    ctx.lineWidth = 9;
    ctx.beginPath();
    q.forEach((v, k) => k ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y));
    ctx.stroke();
    ctx.lineCap = 'butt';
    for (let k = 1; k < S.along.length; k++) {
      const b = S.along[k],
        qa = q[k - 1],
        qb = q[k],
        t = b.x && !b.x.below ? b.x.tC : null;
      ctx.beginPath();
      ctx.moveTo(qa.x, qa.y);
      ctx.lineTo(qb.x, qb.y);
      ctx.strokeStyle = t == null ? '#888' : rgba(diverging(t, 40), 1);
      ctx.lineWidth = (b.x?.cc ?? 0) >= 50 ? 6 : 4;
      ctx.stroke();
      if (b.ice >= 1 && k % 4 === 0) halo(ctx, '❄', qb.x, qb.y - 9, b.ice === 2 ? tok('--ice') : '#9a6b00');
    }
  } else {
    ctx.beginPath();
    pts.forEach((p, k) => {
      const q = P(p.lon, p.lat);
      k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
    });
    ctx.strokeStyle = tok('--surface');
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = tok('--s-computed');
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  pts.forEach(p => {
    const q = P(p.lon, p.lat);
    ctx.fillStyle = tok('--ink');
    ctx.beginPath();
    ctx.arc(q.x, q.y, 3.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.font = 'bold 11.5px system-ui, sans-serif';
    halo(ctx, p.id, q.x + 7, q.y - 8, tok('--ink'), 'left');
  });
  const sel = S.route.samples[S.sel],
    qs = P(sel.lon, sel.lat);
  ctx.strokeStyle = tok('--accent');
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(qs.x, qs.y, 8, 0, 2 * Math.PI);
  ctx.stroke();
}

function mapLegend() {
  const F = S.mapF,
    L = S.mapLayers,
    items = [];
  if (L.isobar && F.pLabel) items.push(`<span><span class="sw" style="color:${dark() ? '#c3c2b7' : '#3d3c39'}"></span> ${F.pLabel}</span>`);
  if (L.isotherm) items.push(`<span><span class="sw" style="color:#c23b3a;border-top-style:dashed"></span> isothermes 2 °C · <span style="color:#1c5cab">0 °C</span></span>`);
  if (L.cloud) items.push(`<span><span class="ramp" style="background:linear-gradient(90deg,transparent,rgba(${tok('--cloud')},.6))"></span> ` +
    `${F.ft == null ? 'nébulosité (la plus forte de basse, moyenne, haute)' : `nébulosité à ${fmtLvl(F.ft)}`}</span>`);
  if (L.tfill) items.push(`<span>−40 °C <span class="ramp" style="background:linear-gradient(90deg,#0d366b,#6da7ec,${dark() ? '#383835' : '#f0efec'},#ec8a85,#9e2a2a)"></span> +40 °C</span>`);
  if (L.wind) items.push(`<span>barbules : vent ${F.ft == null ? 'à 10 m' : `à ${fmtLvl(F.ft)}`}</span>`);
  if (S.mapLevel === 'traj') items.push(
    '<span>route : température rencontrée sur la trajectoire calculée, trait épais dans les nuages, ❄ givrage</span>');
  $('mapLegend').innerHTML = items.join('');
  $('mapSub').textContent = `${F.time ? fmtHM(F.time) : ''} — passage à la tranche choisie` + (S.map?.__blank ? ' · fond de carte injoignable' : '');
}

function mapTip(lon, lat, pt) {
  if (!S.grid || !S.mapF) return;
  const G = S.grid.g,
    [w, s, e, n] = G.bbox,
    gx = (lon - w) / (e - w) * (G.nx - 1),
    gy = (lat - s) / (n - s) * (G.ny - 1);
  if (gx < 0 || gy < 0 || gx > G.nx - 1 || gy > G.ny - 1) return $('mapCanvas').title = '';
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
    cc = bil(F.cc),
    tip = $('xsTip').cloneNode();
  // la carte garde une seule infobulle, posée dans son bloc
  let box = $('mapTip');
  if (!box) {
    box = tip;
    box.id = 'mapTip';
    $('map').append(box);
  }
  box.innerHTML = `<b>${lat.toFixed(2)}° ${lon.toFixed(2)}°</b> <span class="m">${F.ft == null ? 'sol' : fmtLvl(F.ft)}</span><br>` +
    `${fmtT(t)} · nuages ${fmtNum(cc)} %${p == null ? '' : ` · ${fmtNum(p, 1)} hPa`}`;
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
      ['sfc', 'Sol (niveau de la mer)'],
      ['req', `Niveau demandé ${fmtLvl(S.levelFt)}`],
      ...S.traj.steps.slice(1).filter(st => st.ft !== S.levelFt).map((st, k) => [`step:${k + 1}`, `Palier planifié ${fmtLvl(st.ft)} (dès ${st.id})`]),
      ['traj', 'Trajectoire calculée (montée, croisière, descente)'],
      ...MAP_FIXED.filter(ft => ft <= gridTop && readable(ft)).map(ft => [`alt:${ft}`, fmtLvl(ft)])
    ];
  sel.replaceChildren(...opts.map(([v, t]) => new Option(t, v)));
  if (!opts.some(([v]) => v === S.mapLevel)) S.mapLevel = 'sfc';
  sel.value = S.mapLevel;
}

function fitMap() {
  if (!S.map) return;
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

// ---------------------------------------------------------------- page

function select(i) {
  S.sel = clamp(i, 0, S.route.samples.length - 1);
  S.mapF = null;
  render(['xs', 'slice', 'table', 'map']);
}

function render(parts = ['kpi', 'xs', 'slice', 'table', 'wx', 'map']) {
  if (!S.traj) return;
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
    day = Math.round(spent(864e5));
  $('source').textContent = S.data === 'demo' ? 'démonstration hors ligne' : `${S.model?.name || ''}${run}`;
  $('demoTag').classList.toggle('hidden', S.data !== 'demo');
  $('status').textContent = `Vol : ${f.from}${f.aircraft ? ` · ${[f.aircraft.type, f.aircraft.registration].filter(Boolean).join(' ')}` : ''} · ` +
    `${f.dep} → ${f.arr}${f.altn ? ` (dégagement ${f.altn})` : ''}` + (f.updated ? ` · écrit le ${new Date(f.updated).toLocaleString('fr-FR')}` : '') +
    (r && S.data !== 'demo' ? ` · Open-Meteo : ${r.samples.length} lieux sur la route, ${S.grid?.g.places.length || 0} pour la carte, ` +
      (spentNow ? `≈ ${spentNow} appels du décompte pour ce chargement` : 'lu dans la réserve de l’appareil (aucun appel)') +
      ` · ≈ ${day} sur 24 h depuis cet appareil (gratuit : 10 000 / jour, 600 / min)` : '') +
    (S.outOfRange ? ' · ⚠ heure hors de la prévision : l’heure la plus proche est montrée' : '');
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

/** Charge le vol puis la météo de la route, de la carte et des terrains. cacheOnly (ouverture de la page) : seulement ce
 *  que la réserve de l'appareil a déjà, sans appel à Open-Meteo ni à avwx.rest ; sinon la page attend « Charger ». */
async function load({
  cacheOnly = false
} = {}) {
  // un chargement plus récent l'emporte : celui-ci s'arrête dès qu'il ne l'est plus
  const seq = load.seq = (load.seq || 0) + 1,
    stale = () => seq !== load.seq;
  try {
    S.data = $('dataSrc').value;
    if (S.data === 'demo') cacheOnly = false;
    $('status').textContent = 'Lecture du vol…';
    const f = await readFlight();
    if (stale()) return;
    S.flight = f;
    // un niveau choisi dans la page l'emporte sur celui du vol (comme l'heure de départ)
    S.levelFt = $('levelSel').dataset.touched && +$('levelSel').value || f.levelFt || +$('levelSel').value || 10000;
    levelOptions(S.levelFt);
    S.cruiseKt = +$('cruiseKt').value || A.cruiseKtOf(f.text) || 200;
    $('cruiseKt').value = S.cruiseKt;
    if (f.when && !$('dep').dataset.touched) setDep(Date.parse(f.when) / 1000);
    S.depTime = depValue();
    const mid = f.points[Math.floor(f.points.length / 2)];
    S.model = A.modelFor(mid.lat, mid.lon);
    const smp = A.samples(f.points, 25, 24),
      rLevels = routeLevels(),
      levels = gridLevels(),
      gr = A.grid(f.points, +$('gridMax').value),
      rVars = varsOf(rLevels, A.ROUTE_LEVEL_VARS, A.ROUTE_SURFACE_VARS),
      gVars = varsOf(levels, A.GRID_LEVEL_VARS, A.GRID_SURFACE_VARS);
    $('status').textContent = S.data === 'demo' ? 'Démonstration : calcul…' : `Open-Meteo (${S.model.name}) : route et carte…`;
    // l'heure du run d'abord (fichier statique, gardé 10 min) : elle dit si la réserve a encore le dernier run
    S.run = await modelRun(S.model.id);
    if (stale()) return;
    // la grille de la carte (lourde : jusqu'à 30 s) arrive après la route ; la coupe s'affiche sans l'attendre
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
    if (!route) {
      // ouverture de la page sans prévision en réserve : rien n'est demandé tant que l'utilisateur ne charge pas
      $('status').textContent = `Prévision non chargée : « Charger » lit Open-Meteo (${S.model.name}, ≈ ` +
        `${Math.round(A.callWeight(smp.length, rVars.length) + A.callWeight(gr.places.length, gVars.length))} appels du décompte ; ` +
        `≈ ${Math.round(spent(864e5))} sur 24 h depuis cet appareil, gratuit : 10 000 / jour), ou « Démonstration hors ligne ».`;
      return;
    }
    if (route.locs.length !== smp.length) throw new Error('réponse incomplète d’Open-Meteo');
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
    $('mapSub').textContent = 'carte : lecture de la grille…';
    initMap();
    if (S.map) S.map.once('load', fitMap), fitMap();
    let grid;
    try {
      grid = await gridP;
    } catch (e) {
      if (!stale() && !e.stale) notify(`Carte : prévision de la grille injoignable (${e.message}).`, true);
      return;
    }
    if (stale()) return;
    if (!grid) return $('mapSub').textContent = 'carte : « Charger » pour lire la grille';
    if (grid.locs.length !== gr.places.length) return notify('Carte : réponse incomplète d’Open-Meteo.', true);
    S.grid = {
      g: gr,
      locs: grid.locs,
      levels,
      weight: grid.weight
    };
    mapLevelOptions();
    status();
    render(['map']);
  } catch (e) {
    if (stale() || e.stale) return;
    console.error(e);
    const quota = /limit exceeded/i.test(e.message) || e.quota ?
      `Quota gratuit d’Open-Meteo atteint (${e.quota ? e.message : 'pour cette adresse IP'} ; 10 000 appels / jour, 600 / min) : ` +
      'réessayer plus tard, poser une clé Open-Meteo, ou choisir « Démonstration hors ligne ».' : '';
    $('status').textContent = `Échec : ${quota || e.message}`;
    notify(quota || (e.offline ? 'Prévision injoignable : vérifiez le réseau, ou choisissez « Démonstration hors ligne ».' : e.message),
      true);
  }
}

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

function chips(box, layers, labels, onChange) {
  $(box).replaceChildren(...Object.entries(labels).map(([k, t]) => {
    const l = document.createElement('label'),
      c = document.createElement('input');
    l.className = 'chip';
    c.type = 'checkbox';
    c.checked = !!layers[k];
    c.onchange = () => {
      layers[k] = c.checked;
      // un seul fond dans la coupe
      if (c.checked && ['temp', 'rh', 'da'].includes(k))['temp', 'rh', 'da'].filter(x => x !== k).forEach(x => layers[x] = false);
      chips(box, layers, labels, onChange);
      onChange();
    };
    l.append(c, t);
    return l;
  }));
}

function boot() {
  setDep(Math.ceil(Date.now() / 36e5) * 3600);
  levelOptions(27000);
  $('tri').value = store.get('labs:atmosphere:tri') || '';
  // clé Open-Meteo facultative : gardée sur l'appareil, jamais réaffichée
  const omk = $('omKey');
  omk.placeholder = store.get('labs:atmosphere:omkey') ? 'enregistrée' : 'facultative';
  omk.onchange = () => {
    const v = omk.value.trim();
    try {
      v ? localStorage.setItem('labs:atmosphere:omkey', v) : localStorage.removeItem('labs:atmosphere:omkey');
    } catch {}
    omk.value = '';
    omk.placeholder = v ? 'enregistrée' : 'facultative';
  };
  const showSrc = () => {
    const v = $('flightSrc').value;
    $('triBox').classList.toggle('hidden', v !== 'launcher');
    $('fileBox').classList.toggle('hidden', v !== 'file');
    $('textBox').classList.toggle('hidden', v !== 'text');
  };
  $('flightSrc').onchange = showSrc;
  showSrc();
  if (new URLSearchParams(location.search).get('donnees') === 'demo') $('dataSrc').value = 'demo';
  if (location.protocol === 'file:') {
    $('dataSrc').value = 'demo';
    notify('Page ouverte depuis un fichier : les modules ne se chargent que servis (lanceur, ou python -m http.server).', true);
  }
  $('form').onsubmit = e => {
    e.preventDefault();
    load();
  };
  // heure, niveau, vitesse : recalcul sans relire la prévision (sauf un niveau au-dessus de la grille lue)
  const recompute = () => {
    if (!S.route) return;
    S.depTime = depValue();
    S.levelFt = +$('levelSel').value;
    S.cruiseKt = +$('cruiseKt').value || S.cruiseKt;
    // un niveau que la route ou la grille n'a pas encore : seules ses variables sont demandées (réserve de l'appareil)
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
    cloud: 'Nuages',
    iso: 'Isothermes',
    inv: 'Inversions',
    ice: 'Givrage',
    wind: 'Vent',
    cu: 'Base Cu',
    temp: 'Température',
    rh: 'Humidité',
    da: 'Altitude-densité'
  }, () => render(['xs']));
  chips('mapLayers', S.mapLayers, {
    isobar: 'Isobares',
    isotherm: 'Isothermes',
    cloud: 'Nuages',
    wind: 'Vent',
    tfill: 'Température'
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
  $('map').onmouseleave = () => $('mapTip') && ($('mapTip').style.display = 'none');
  // redessin à la taille des blocs (réaction à un événement de taille, rien n'est réécrit)
  let w0 = 0;
  new ResizeObserver(() => {
    const w = document.body.clientWidth;
    if (w === w0) return;
    w0 = w;
    render(['xs', 'slice', 'map']);
  }).observe(document.body);
  // à l'ouverture, seulement la réserve de l'appareil : Open-Meteo n'est lu que sur « Charger »
  load({
    cacheOnly: true
  });
}

boot();
