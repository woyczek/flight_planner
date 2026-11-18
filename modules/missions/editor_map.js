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
//   - les GESTES (deuxième brique) : en Sélection, un lieu touché est choisi (il dit son nom), un lieu situé se déplace par sa poignée,
//     le rayon d'une zone ronde choisie par la sienne ; avec un outil de pose, un toucher de la carte nue rend une position. Chaque
//     lieu porte son identifiant écrit sur la carte (un marqueur de MapLibre, pas une police du fond). Tout
//     passe par le socle d'édition (tapPosition, dragHandles, previewLayer) ; ce fichier ne fait que dire quelles poignées existent
//     et rendre le geste fini à l'écran (onPick, onMove, onRadius, onPose), qui seul retouche les lignes.
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
  authorLayers,
  dragHandles,
  previewLayer,
  tapPosition
} from '../maps/lib/map_edit.js';
import * as ED from './editor.js';

/** Les bornes du dessin : le rayon d'une zone ronde (km : celles du lecteur), le nombre de côtés d'un rond, la marge du cadre (degrés,
 *  au moins), l'attente des tuiles puis du fond uni (ms), la marge du cadrage (px). */
export const MAPB = Object.freeze({
  radiusKm: Object.freeze([0.05, 500]),
  ring: 64,
  margin: 0.02,
  wait: 6000,
  waitPlain: 4000,
  padding: 36
});
/** Les sortes de lieu qu'une poignée déplace (celles de ED.MOVABLE : ni le départ ni l'arrivée, ni l'avion de l'essai). */
const MOVABLE = Object.freeze(['target', 'zone', 'pt', 'rdv', 'object']);

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

/** Le contour d'une ligne de zone : ses sommets ({ lat, lon }), lus bornés par ED.ringOf (3 à 100, tous situés) ; null sans contour
 *  retouchable (une zone ronde, ou un contour que le fichier garde tel quel). */
function contourOf(row) {
  const ring = ED.ringOf(row);
  return ring ? ring.map(([lat, lon]) => ({
    lat,
    lon
  })) : null;
}

/** Ce que la carte dessine d'une mission (voir l'en-tête). `rows` : les lignes des Lieux que l'écran montre (une zone en contour y
 *  porte ses sommets : `ring`) ; `adPos(nom)` : la position que la base donne à un terrain dont le fichier ne dit pas la position (départ, arrivée), ou
 *  null ; `path` : la route du départ ([{ lat, lon }…], celle de l'essai) ; `run` : l'essai des clés en cours (sa trace, son avion).
 *  L'identifiant d'un élément est « place:i », i étant le rang de sa ligne dans la liste des Lieux : toucher l'élément mène à elle.
 *  Une zone ronde est aussi un point en son centre (c'est par lui qu'elle se déplace) ; `sel` : le rang du lieu choisi — une zone
 *  ronde choisie montre la poignée de son rayon (« radius:i », à l'est de son rond) ; une zone en contour est un point en son milieu,
 *  et choisie elle montre ses sommets (« vertex:i:k ») et le milieu de chaque côté (« mid:i:k » : il ajoute un sommet après le
 *  sommet k). Un point qu'une poignée déplace porte `movable`.
 *  `labels` [{ id, lat, lon, text }] : l'étiquette de chaque lieu dessiné — son identifiant (à défaut le début de son nom : le code
 *  d'un terrain), vingt-quatre signes au plus —, sur son point, ou au milieu de son contour. */
export function mapFeatures(rows, {
  adPos = null,
  path = [],
  run = null,
  sel = -1
} = {}) {
  const points = [],
    lines = [],
    polygons = [],
    labels = [],
    all = [],
    // l'étiquette d'un lieu : son identifiant ; à défaut le début de son nom (« XTST · Base Test » : le code du terrain)
    tag = r => String(r.id || String(r.name || '').split(' · ')[0] || '').slice(0, 24),
    middle = ring => ({
      lat: +(ring.reduce((t, p) => t + p.lat, 0) / ring.length).toFixed(6),
      lon: +(ring.reduce((t, p) => t + p.lon, 0) / ring.length).toFixed(6)
    });
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
        contour = r.poly ? contourOf(r) : null,
        ring = contour || (!r.poly && at && km !== null ? circleRing(at, km) : null);
      if (ring) {
        polygons.push({
          id,
          rings: [ring]
        });
        all.push(...ring);
      }
      if (contour) {
        // un contour : il se déplace d'un bloc par son milieu, où il porte son étiquette ; choisi, il montre ses sommets (des
        // poignées) et, au milieu de chaque côté, le point qui en ajoute un
        const mid = middle(contour);
        points.push({
          id,
          ...mid,
          label,
          kind: 'zone',
          movable: true
        });
        if (tag(r)) labels.push({
          id,
          ...mid,
          text: tag(r)
        });
        if (sel === i) contour.forEach((v, k) => {
          const w = contour[(k + 1) % contour.length];
          points.push({
            id: `mid:${i}:${k}`,
            lat: +((v.lat + w.lat) / 2).toFixed(6),
            lon: +((v.lon + w.lon) / 2).toFixed(6),
            label: '',
            kind: 'mid'
          }, {
            id: `vertex:${i}:${k}`,
            lat: v.lat,
            lon: v.lon,
            label: '',
            kind: 'vertex'
          });
        });
        return;
      }
      if (ring && sel === i) points.push({
        id: `radius:${i}`,
        lat: ring[ring.length / 4].lat,
        lon: ring[ring.length / 4].lon,
        label: '',
        kind: 'handle',
        center: at
      });
    }
    if (!at) return;
    points.push({
      id,
      lat: at.lat,
      lon: at.lon,
      label,
      kind: r.kind,
      ...(MOVABLE.includes(r.kind) ? {
        movable: true
      } : {})
    });
    if (tag(r)) labels.push({
      id,
      lat: at.lat,
      lon: at.lon,
      text: tag(r)
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
    labels,
    box: null
  };
  const lats = all.map(p => p.lat),
    lons = all.map(p => p.lon),
    m = MAPB.margin;
  return {
    points,
    lines,
    polygons,
    labels,
    box: {
      w: +(Math.min(...lons) - m).toFixed(6),
      s: +Math.max(-85, Math.min(...lats) - m).toFixed(6),
      e: +(Math.max(...lons) + m).toFixed(6),
      n: +Math.min(85, Math.max(...lats) + m).toFixed(6)
    }
  };
}

/** Ce qui fait changer le dessin : les éléments eux-mêmes. */
const signature = f => JSON.stringify([f.points, f.lines, f.polygons, f.labels]);
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

let LIVE = null; // la carte en vie : { owner, host, map, auth, pv, drag, tap, labels, mode, sel, cb, state, sig, box, dark, moved, … }

/** Ce que désigne l'identifiant d'un élément : { what: 'place' | 'radius', i } (le rang de la ligne), { what: 'vertex' | 'mid', i, k }
 *  (le rang du sommet) ; null pour tout autre texte. */
function partsOf(id) {
  const m = /^(?:(place|radius):(\d{1,3})|(vertex|mid):(\d{1,3}):(\d{1,3}))$/.exec(String(id || ''));
  return !m ? null : m[1] ? {
    what: m[1],
    i: +m[2]
  } : {
    what: m[3],
    i: +m[4],
    k: +m[5]
  };
}
/** Le rang de la ligne que désigne l'identifiant d'un élément ; -1 sinon. */
const rankOf = id => partsOf(id)?.i ?? -1;

/** Les poignées que le socle d'édition peut saisir (dragHandles), relues à chaque toucher : en Sélection seulement, les points qu'un
 *  geste déplace (une zone ronde par son centre, un contour par son milieu), la poignée du rayon de la zone ronde choisie, les
 *  sommets et les milieux des côtés du contour choisi. */
function handlesOf(L) {
  if (L.mode !== 'select') return [];
  return (L.feats?.points || []).filter(p => p.movable || ['handle', 'vertex', 'mid'].includes(p.kind)).map(p => p.kind === 'handle' ? {
    id: p.id,
    lat: p.lat,
    lon: p.lon,
    kind: 'radius',
    center: p.center
  } : p.kind === 'vertex' || p.kind === 'mid' ? {
    id: p.id,
    lat: p.lat,
    lon: p.lon,
    kind: 'vertex'
  } : {
    id: p.id,
    lat: p.lat,
    lon: p.lon,
    kind: p.kind === 'object' ? 'object' : 'point'
  });
}

/** La largeur de la vue, en km (à la latitude de son centre) : l'écran en tire le rayon d'une zone posée. */
function spanKm(map) {
  try {
    const b = map.getBounds(),
      lat = map.getCenter().lat;
    return Math.abs(b.getEast() - b.getWest()) * 111.32 * Math.max(0.01, Math.cos(lat * RAD));
  } catch {
    return 0;
  }
}

/** Chaque lieu dit son identifiant sur la carte (l'ergonome, 18 nov. 2026 : « une carte de points sans nom ne se lit pas »), et le lieu
 *  choisi son nom complet : des marqueurs de MapLibre — des éléments de la page, leur texte par textContent, qui ne prennent aucun
 *  toucher —, pas une police du fond (un fond n'en porte pas toujours). Un marqueur par étiquette, gardé d'un dessin à l'autre, déplacé,
 *  retiré avec son lieu ; pendant un essai des clés, les étiquettes restent, aucun lieu n'est choisi. */
function mark(L) {
  const ml = globalThis.maplibregl,
    want = new Map((L.map && ml?.Marker ? L.feats?.labels || [] : []).map(l => [l.id, l]));
  L.labels ||= new Map();
  for (const [id, m] of L.labels)
    if (!want.has(id)) {
      m.remove();
      L.labels.delete(id);
    }
  for (const [id, l] of want) {
    let m = L.labels.get(id);
    if (!m) {
      const el = Object.assign(document.createElement('div'), {
        className: 'ms-atmaplbl'
      });
      el.dataset.maplbl = id;
      m = new ml.Marker({
        element: el,
        anchor: 'bottom-left',
        offset: [7, -7]
      });
      L.labels.set(id, m);
    }
    const el = m.getElement(),
      chosen = L.mode === 'select' && id === `place:${L.sel}`,
      text = String((chosen && L.selLabel) || l.text).slice(0, 60);
    if (el.textContent !== text) el.textContent = text;
    if (chosen) el.dataset.mapsel = '';
    else delete el.dataset.mapsel;
    m.setLngLat([l.lon, l.lat]).addTo(L.map);
  }
  spread(L);
}

/** Les étiquettes de lieux voisins s'empilent au lieu de se recouvrir (une zone centrée sur un point, un objet près de la cible) :
 *  chacune monte d'une ligne tant qu'elle en touche une déjà posée — à l'échelle de la vue, donc refait à chaque dessin et à chaque
 *  changement d'échelle. */
function spread(L) {
  if (!L.map || !L.labels) return;
  const step = 16,
    placed = [];
  for (const m of L.labels.values()) {
    let p;
    try {
      p = L.map.project(m.getLngLat());
    } catch {
      continue;
    }
    const w = m.getElement().offsetWidth || 60;
    let k = 0;
    while (k < 6 && placed.some(q => p.x < q.x + q.w && q.x < p.x + w && Math.abs(q.y - (p.y - step * k)) < step - 1)) k++;
    placed.push({
      x: p.x,
      y: p.y - step * k,
      w
    });
    m.setOffset([7, -7 - step * k]);
  }
}

/** Un geste fini sur une poignée, rendu à l'écran : un lieu touché est choisi, déplacé s'il a bougé ; la poignée d'un rayon le règle ; un
 *  sommet touché est choisi (l'écran propose « Retirer ce sommet »), déplacé s'il a bougé ; le milieu d'un côté, touché ou tiré, pose
 *  un sommet là où le geste finit. */
function done(L, id, moved, at) {
  const t = partsOf(id),
    cb = L.cb;
  if (!t) return;
  if (t.what === 'mid') return cb?.onInsert?.({
    i: t.i,
    k: t.k,
    lat: at.lat,
    lon: at.lon
  });
  if (t.what === 'vertex') return moved ? cb?.onVertex?.({
    i: t.i,
    k: t.k,
    lat: at.lat,
    lon: at.lon
  }) : cb?.onVertexPick?.({
    i: t.i,
    k: t.k
  });
  if (!moved) return cb?.onPick?.(t.i);
  if (t.what === 'radius') return cb?.onRadius?.({
    i: t.i,
    km: at.meters / 1000
  });
  cb?.onMove?.({
    i: t.i,
    lat: at.lat,
    lon: at.lon
  });
}

/** Branche les gestes du socle d'édition sur la carte en vie (une fois, au démarrage) : le retour pendant un glisser, le geste fini
 *  rendu à l'écran. Rien n'est retouché ici. */
function gestures(L, map, o) {
  const ignore = '.maplibregl-ctrl';
  L.pv = previewLayer(map, 'mission', {
    tokens: o.colors?.preview
  });
  L.drag = dragHandles(map, L.host, {
    handles: () => handlesOf(L),
    ignore,
    onMove: m => {
      const c = m.kind === 'radius' ? (L.feats?.points || []).find(p => p.id === m.id)?.center : null;
      L.pv.set(c ? {
        circle: {
          lat: c.lat,
          lon: c.lon,
          meters: m.meters
        }
      } : {
        ghost: {
          lat: m.lat,
          lon: m.lon
        }
      });
    },
    onEnd: m => {
      L.pv.clear();
      done(L, m.id, m.moved, m);
    },
    onTap: h => done(L, h.id, false, h),
    onCancel: () => L.pv.clear()
  });
  L.tap = tapPosition(map, L.host, {
    ignore,
    onTap: p => {
      if (L.mode === 'select') {
        // en Sélection : l'élément sous le doigt est choisi (un terrain, un contour, le rond d'une zone) ; la carte nue ne choisit rien
        const f = L.auth?.at(p.x, p.y);
        return L.cb?.onPick?.(f ? rankOf(f.id) : -1);
      }
      if (L.mode === 'view') return; // pendant un essai des clés la carte ne fait que montrer
      L.cb?.onPose?.({
        lat: p.lat,
        lon: p.lon,
        spanKm: spanKm(map)
      });
    }
  });
}

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
    tokens: o.colors?.tokens
  });
  L.auth.setFeatures(L.feats);
  gestures(L, map, o);
  mark(L);
  map.on('movestart', () => {
    if (!L.fitting && !isOwnResize(map)) L.moved = true; // l'auteur a déplacé la vue : elle ne se recadre plus seule
  });
  map.on('zoomend', () => spread(L)); // les étiquettes voisines s'empilent à l'échelle de la vue
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
 *  options : owner (la séance : une autre séance repart d'une carte neuve), dark, colors ({ tokens, bg, preview }), onState(état),
 *  alive() ; mode ('select' : la Sélection ; 'point', 'zone', 'object' : un outil de pose ; 'view' : la carte ne fait que montrer),
 *  sel (le rang du lieu choisi, -1 sinon), selLabel (son nom) ; les gestes finis : onPick(rang | -1), onMove({ i, lat, lon }),
 *  onRadius({ i, km }), onPose({ lat, lon, spanKm }), et pour un contour onVertex({ i, k, lat, lon }), onInsert({ i, k, lat, lon }),
 *  onVertexPick({ i, k }). Sans élément situé (pas de cadre) : pas de carte. */
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
  L.cb = o;
  L.mode = ['select', 'point', 'zone', 'object', 'view'].includes(o.mode) ? o.mode : 'select';
  L.sel = Number.isInteger(o.sel) ? o.sel : -1;
  L.selLabel = o.selLabel || '';
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
  L.drag?.refresh(); // un geste dont la poignée a disparu est lâché
  mark(L);
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
    for (const m of L.labels?.values() || []) m.remove();
    L.tap?.stop();
    L.drag?.stop();
    L.pv?.remove();
    L.auth?.remove();
    L.map?.remove();
  } catch {
    /* déjà retirée */
  }
  L.host.remove();
}
