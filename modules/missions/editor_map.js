// V3 missions — la carte de l'atelier (SOG-0444, lot P2, première brique ; EDITOR.md § 2 et § 7 undecies) : la mission de la séance
// dessinée sur le SOCLE DE CARTE de la suite (modules/maps/lib/map_base.js : MapLibre à la demande, le fond, l'abandon) et sur les
// couches de l'auteur du socle d'édition (modules/maps/lib/map_edit.js, SOG-0446) — aucun geste ni aucune couche écrits ici.
//
// Deux parts :
//   - le CALCUL PUR, mapFeatures(rows, { zones, adPos, path, run }) → { points, lines, polygons, box } : ce que la carte dessine des
//     lignes des Lieux de la séance (ED.placesOf, ou les lignes retouchées) — les lieux situés (départ, arrivée, cible, points, rendez-vous, objets), les zones (un rond par son centre et son
//     rayon, un contour par ses sommets, lus dans les zones du fichier), la route du départ (en tireté), et pendant un essai des clés la
//     trace et l'avion. Les lignes et le fichier sont des entrées NON FIABLES : tout nombre est borné (jamais ramené dans ses bornes : hors bornes, l'élément n'est pas dessiné),
//     les libellés ne vont que dans des propriétés de MapLibre (jamais dans la page).
//   - la carte EN VIE (une seule : l'atelier d'une mission à la fois) : show(slot, feats, options) la démarre dans un hôte à elle,
//     gardé d'un dessin à l'autre (l'écran est redessiné par innerHTML : l'hôte est reposé dans l'emplacement neuf), fit() recadre,
//     stop() la retire avec son contexte WebGL. Sans tuiles, un fond uni (MapLibre sur un style local) ; sans MapLibre ni WebGL, ou
//     hors ligne : rien — l'écran garde son croquis.
import {
  isOwnResize,
  mapSize,
  startTiles,
  styleFor
} from '../maps/lib/map_base.js';
import {
  authorLayers
} from '../maps/lib/map_edit.js';
import * as MS from '../../frame/lib/mission.js';

/** Les bornes du dessin : le rayon d'une zone ronde (km : celles du lecteur), le nombre de côtés d'un rond, la marge du cadre (degrés,
 *  au moins), l'attente des tuiles puis du fond uni (ms), la marge du cadrage (px ; en bas, la place de « Recentrer »). */
export const MAPB = Object.freeze({
  radiusKm: Object.freeze([0.05, 500]),
  ring: 64,
  margin: 0.02,
  wait: 6000,
  waitPlain: 4000,
  padding: Object.freeze({
    top: 36,
    right: 36,
    bottom: 64,
    left: 36
  })
});

const RAD = Math.PI / 180,
  EARTH_KM = 6371.0088;

/** Un nombre écrit (texte d'une ligne de lieu, nombre du fichier) dans ses bornes, sinon null — jamais ramené dans ses bornes. */
function within(v, lo, hi) {
  if (typeof v !== 'number' && typeof v !== 'string') return null; // ni objet ni tableau : « [] » ne vaut pas 0
  const t = typeof v === 'string' ? v.trim().replace(',', '.') : v;
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= lo && n <= hi ? n : null;
}

/** Une position { lat, lon } bornée, ou null. */
function posOf(lat, lon) {
  const a = within(lat, -90, 90),
    b = within(lon, -180, 180);
  return a === null || b === null ? null : {
    lat: a,
    lon: b
  };
}

/** Le rond d'une zone, en sommets (un cercle de la sphère autour de son centre) : pour le dessin seulement — le franchissement se juge
 *  ailleurs (frame/lib/crossing.js). Les longitudes ne sont pas ramenées à ±180 : l'anneau reste d'un seul tenant. */
export function circleRing(c, km, n = MAPB.ring) {
  const d = km / EARTH_KM,
    la = c.lat * RAD,
    out = [];
  for (let i = 0; i < n; i++) {
    const t = 2 * Math.PI * i / n,
      la2 = Math.asin(Math.min(1, Math.max(-1, Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(t)))),
      lo2 = c.lon * RAD + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
    out.push({
      lat: +(la2 / RAD).toFixed(6),
      lon: +(lo2 / RAD).toFixed(6)
    });
  }
  return out;
}

/** Le contour d'une zone du fichier (ses sommets, sous l'un des trois noms que le lecteur accepte) : 3 à 100 sommets tous situés,
 *  sinon null. */
function contourOf(zone) {
  const z = zone && typeof zone === 'object' && !Array.isArray(zone) ? zone : null,
    raw = z ? [z.points, z.polygon, z.vertices].find(Array.isArray) : null,
    [lo, hi] = MS.DRAWER_BOUNDS?.vertices || [3, 100];
  if (!raw || raw.length < lo || raw.length > hi) return null;
  const ring = raw.map(p => p && typeof p === 'object' ? posOf(p.lat, p.lon) : null);
  return ring.every(Boolean) ? ring : null;
}

/** Ce que la carte dessine d'une mission (voir l'en-tête). `rows` : les lignes des Lieux que l'écran montre ; `zones` : les zones du
 *  FICHIER d'origine (une ligne de zone garde en `i` son rang dans le fichier : ses sommets y sont lus, ils ne se retouchent pas
 *  encore) ; `adPos(nom)` : la position que la base donne à un terrain dont le fichier ne dit pas la position (départ, arrivée), ou
 *  null ; `path` : la route du départ ([{ lat, lon }…], celle de l'essai) ; `run` : l'essai des clés en cours (sa trace, son avion).
 *  L'identifiant d'un élément est « place:i », i étant le rang de sa ligne dans la liste des Lieux : toucher l'élément mène à elle. */
export function mapFeatures(rows, {
  zones = [],
  adPos = null,
  path = [],
  run = null
} = {}) {
  const points = [],
    lines = [],
    polygons = [],
    all = [],
    file = Array.isArray(zones) ? zones : [];
  (Array.isArray(rows) ? rows : []).slice(0, 400).forEach((r, i) => {
    if (!r || typeof r !== 'object') return;
    const id = `place:${i}`,
      label = String(r.id || r.name || '').slice(0, 60);
    let at = posOf(r.lat, r.lon);
    if (!at && (r.kind === 'dep' || r.kind === 'arr') && adPos) {
      const q = adPos(r.name);
      at = q ? posOf(q.lat, q.lon) : null;
    }
    if (r.kind === 'zone') {
      const km = within(r.radius, ...MAPB.radiusKm),
        ring = r.poly ? (Number.isInteger(r.i) && r.i >= 0 ? contourOf(file[r.i]) : null) : at && km !== null ? circleRing(at, km) :
        null;
      if (ring) {
        polygons.push({
          id,
          rings: [ring]
        });
        all.push(...ring);
        return;
      }
    }
    if (!at) return;
    points.push({
      id,
      lat: at.lat,
      lon: at.lon,
      label,
      kind: r.kind
    });
    all.push(at);
  });
  const route = (Array.isArray(path) ? path : []).map(p => posOf(p?.lat, p?.lon)).filter(Boolean);
  if (route.length > 1) {
    lines.push({
      id: 'route',
      points: route,
      dash: true
    });
    all.push(...route);
  }
  if (run?.ok && Array.isArray(run.trail)) {
    const trail = run.trail.map(p => Array.isArray(p) ? posOf(p[0], p[1]) : null).filter(Boolean);
    if (trail.length > 1) lines.push({
      id: 'trail',
      points: trail
    });
    if (trail.length) {
      const last = trail[trail.length - 1];
      points.push({
        id: 'plane',
        lat: last.lat,
        lon: last.lon,
        label: '',
        kind: 'plane'
      });
      all.push(...trail);
    }
  }
  if (!all.length) return {
    points,
    lines,
    polygons,
    box: null
  };
  const lats = all.map(p => p.lat),
    lons = all.map(p => p.lon),
    m = MAPB.margin;
  return {
    points,
    lines,
    polygons,
    box: {
      w: +(Math.min(...lons) - m).toFixed(6),
      s: +Math.max(-85, Math.min(...lats) - m).toFixed(6),
      e: +(Math.max(...lons) + m).toFixed(6),
      n: +Math.min(85, Math.max(...lats) + m).toFixed(6)
    }
  };
}

/** Ce qui fait changer le dessin : les éléments eux-mêmes. */
const signature = f => JSON.stringify([f.points, f.lines, f.polygons]);
/** Le cadre de la vue pour MapLibre : [[ouest, sud], [est, nord]]. */
const boundsOf = b => [
  [b.w, b.s],
  [b.e, b.n]
];
/** Le fond uni : un style local de MapLibre, sans rien à aller chercher. */
const plainStyle = bg => ({
  version: 8,
  sources: {},
  layers: [{
    id: 'bg',
    type: 'background',
    paint: {
      'background-color': bg || '#eef2f5'
    }
  }]
});

let LIVE = null; // la carte en vie : { owner, host, map, auth, state, sig, box, dark, moved, fitting, starting, failed, ro, timer }

/** L'état de la carte en vie pour l'écran : 'tiles' (le fond de la suite), 'plain' (le fond uni), '' (pas de carte : le croquis). */
export const stateOf = owner => LIVE && LIVE.owner === owner && LIVE.map ? LIVE.state : '';

/** Recadre la vue sur la mission (le premier cadre), sans animation ; ce n'est pas un geste de l'auteur. */
function frame(L) {
  if (!L.map || !L.box) return;
  L.fitting = true;
  try {
    L.map.fitBounds(boundsOf(L.box), {
      padding: MAPB.padding,
      animate: false,
      maxZoom: 13
    });
  } catch {
    /* un cadre que MapLibre refuse : la vue reste où elle est */
  }
  L.fitting = false;
}

/** Démarre la carte dans son hôte : le fond de la suite, sinon le fond uni ; puis les couches de l'auteur et le premier cadre. Sans
 *  carte (hors ligne, pas de WebGL, MapLibre absent) : `onState('')`, l'écran garde son croquis. */
async function start(L, o) {
  L.starting = true;
  const alive = () => LIVE === L && o.alive(),
    common = {
      bounds: boundsOf(L.box),
      padding: MAPB.padding,
      attributionControl: {
        compact: true
      },
      alive
    };
  let map = await startTiles(L.host, {
      ...common,
      style: styleFor({
        dark: L.dark
      }),
      wait: MAPB.wait
    }),
    state = 'tiles';
  if (!map && alive()) {
    map = await startTiles(L.host, {
      ...common,
      style: plainStyle(o.colors?.bg),
      attributionControl: false,
      wait: MAPB.waitPlain
    });
    state = 'plain';
  }
  L.starting = false;
  if (!alive()) {
    try {
      map?.remove();
    } catch {
      /* déjà retirée */
    }
    return;
  }
  if (!map) {
    L.failed = true;
    return o.onState('');
  }
  L.map = map;
  L.state = state;
  L.auth = authorLayers(map, {
    id: 'mission',
    tokens: o.colors?.tokens,
    onTap: f => L.onTap?.(f)
  });
  L.auth.setFeatures(L.feats);
  map.on('movestart', () => {
    if (!L.fitting && !isOwnResize(map)) L.moved = true; // l'auteur a déplacé la vue : elle ne se recadre plus seule
  });
  mapSize(map, L.host);
  frame(L);
  // MapLibre ne suit pas seul la taille de son cadre (le socle) : la fenêtre change de taille, l'appareil tourne, la carte se déplie —
  // la taille est reprise une fois arrêtée, et la vue recadrée tant que l'auteur ne l'a pas déplacée
  if (typeof ResizeObserver === 'function') {
    L.ro = new ResizeObserver(() => {
      clearTimeout(L.timer);
      L.timer = setTimeout(() => {
        if (LIVE === L && L.host.clientWidth > 0 && mapSize(map, L.host) && !L.moved) frame(L);
      }, 120);
    });
    L.ro.observe(L.host);
  }
  o.onState(state);
}

/** Montre la carte de la mission dans `slot` (l'emplacement du dessin courant) : la démarre au premier appel, repose son hôte après
 *  chaque dessin, met ses éléments à jour s'ils ont changé, la recadre tant que l'auteur n'a pas déplacé la vue. `feats` : mapFeatures ;
 *  options : owner (la séance : une autre séance repart d'une carte neuve), dark, colors ({ tokens, bg }), onTap(élément),
 *  onState(état), alive(). Sans élément situé (pas de cadre) : pas de carte. */
export function show(slot, feats, o) {
  if (LIVE && LIVE.owner !== o.owner) stop();
  if (!slot || !feats?.box) return;
  const L = LIVE ||= {
      owner: o.owner,
      host: Object.assign(document.createElement('div'), {
        className: 'ms-atmaphost'
      }),
      map: null,
      auth: null,
      state: '',
      sig: '',
      box: null,
      dark: !!o.dark,
      moved: false,
      fitting: false,
      starting: false,
      failed: false
    },
    sig = signature(feats),
    boxSig = JSON.stringify(feats.box),
    reframed = boxSig !== JSON.stringify(L.box);
  L.onTap = o.onTap;
  L.feats = feats;
  L.box = feats.box;
  if (L.host.parentNode !== slot) slot.replaceChildren(L.host);
  if (!L.map) {
    L.sig = sig;
    if (!L.starting && !L.failed && L.host.clientWidth > 0) start(L, o); // repliée (sans taille), elle démarre à son ouverture
    return;
  }
  if (!!o.dark !== L.dark && L.state === 'tiles') L.map.setStyle(styleFor({
    dark: !!o.dark
  })); // le design a changé de ton : le fond suit, les couches du socle reviennent seules
  L.dark = !!o.dark;
  if (sig !== L.sig) L.auth.setFeatures(feats);
  L.sig = sig;
  const resized = mapSize(L.map, L.host);
  if ((reframed || resized) && !L.moved) frame(L);
}

/** « Recentrer » : la vue revient au cadre de la mission, et se recadre de nouveau seule. */
export function fit() {
  if (!LIVE?.map) return;
  LIVE.moved = false;
  mapSize(LIVE.map, LIVE.host);
  frame(LIVE);
}

/** Retire la carte en vie (en quittant l'atelier, au démontage) : ses couches, la carte et son contexte WebGL, son hôte. */
export function stop() {
  const L = LIVE;
  LIVE = null;
  if (!L) return;
  clearTimeout(L.timer);
  L.ro?.disconnect();
  try {
    L.auth?.remove();
    L.map?.remove();
  } catch {
    /* déjà retirée */
  }
  L.host.remove();
}
