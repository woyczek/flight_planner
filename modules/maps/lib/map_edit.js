// V3 maps — socle d'ÉDITION sur une carte (modules/maps/INTEGRATION.md § 7 bis, SOG-0446) : ce qu'un module qui ÉDITE sur une carte
// demande, extrait du mode Édition de la Carte (edit.js) et non recopié ; la Carte passe par ces entrées et garde exactement son comportement.
// Pur d'état de module : chaque fonction prend la carte, le cadre et des options, rend une poignée avec stop() ; rien n'est lu de la page,
// aucun hôte n'est ajouté. Fichier à part de map_base.js : une page qui affiche seulement une carte ne le charge pas.
// `map` : une carte MapLibre, ou tout objet { toXY(lat, lon) → { x, y }, toLL(x, y) → { lat, lon } } (la Carte sans fond MapLibre y donne son
// canevas). Distances en MÈTRES ; positions { lat, lon } en degrés (longitude dans [-180, 180[, arrondie au millionième quand elle vient d'un pixel).

const R_EARTH = 6371008.8;
const rad = d => d * Math.PI / 180;
const round6 = v => Math.round(v * 1e6) / 1e6;
const wrapLon = l => {
  const w = ((l + 180) % 360 + 360) % 360 - 180;
  return w;
};
const isPos = p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon);

/** Distance en mètres entre deux positions (grand cercle). */
function metersBetween(a, b) {
  const dLat = rad(b.lat - a.lat),
    dLon = rad(b.lon - a.lon),
    h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
}
/** La carte vue par la base : project(lat, lon) → { x, y } et unproject(x, y) → { lat, lon } arrondie, longitude dans [-180, 180[. */
function viewOf(map) {
  if (typeof map.toXY === 'function' && typeof map.toLL === 'function') return {
    project: (lat, lon) => map.toXY(lat, lon),
    unproject: (x, y) => {
      const p = map.toLL(x, y);
      return p && {
        lat: round6(p.lat),
        lon: round6(wrapLon(p.lon))
      };
    }
  };
  return {
    project: (lat, lon) => map.project([lon, lat]),
    unproject: (x, y) => {
      const p = map.unproject([x, y]);
      return {
        lat: round6(p.lat),
        lon: round6(wrapLon(p.lng))
      };
    }
  };
}
/** Position d'un événement dans le cadre. */
const posIn = (box, e) => {
  const r = box.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
};
/** `ignore` : un sélecteur ou une fonction de l'événement. */
const skipper = ignore => e => !!ignore && (typeof ignore === 'function' ? ignore(e) : !!e.target?.closest?.(ignore));
/** Les départs de geste pris par dragHandles : tapPosition ne les prend pas pour un toucher sur la carte nue. */
const taken = new WeakSet();
let seq = 0;

// ---------------------------------------------------------------- fonctions pures
/** Le plus proche de `items` ({ lat, lon }) à moins de `px` pixels de (x, y), son rang ; null sinon. Une entrée vide ou sans position
 *  est sautée (son rang est gardé : le mode Édition y met null pour le départ, l'arrivée et les points imposés). Égalité : la dernière. */
export function hitTest(items, project, x, y, px) {
  let best = null,
    bd = px;
  (items || []).forEach((p, i) => {
    if (!isPos(p)) return;
    const q = project(+p.lat, +p.lon),
      d = Math.hypot(q.x - x, q.y - y);
    if (d <= bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}
/** Les points où se poser dans les données de l'emprise (la forme `S.data.data` de la Carte) : balises, terrains, bouts de voies, points, VRP. */
export function anchorsOf(data) {
  const out = [],
    add = (id, lat, lon, kind) => {
      if (id && Number.isFinite(+lat) && Number.isFinite(+lon)) out.push({
        id: String(id),
        lat: +lat,
        lon: +lon,
        kind
      });
    };
  if (!data) return out;
  for (const n of data.navaids || []) add(n.id, n.lat, n.lon, 'navaid');
  for (const a of data.aerodromes || []) add(a.icao || a.id, a.lat, a.lon, 'aerodrome');
  for (const w of data.airways || [])
    for (const e of [w.a, w.b]) add(e?.id, e?.lat, e?.lon, 'fix');
  for (const p of data.points || []) add(p.id, p.lat, p.lon, 'fix');
  for (const v of data.vrp || []) add(v.id || v.name, v.lat, v.lon, 'vrp');
  return out;
}
/** L'ancre la plus proche de (x, y) à moins de `px` pixels (20 par défaut) ; null sinon. */
export const snapTo = (anchors, project, x, y, px = 20) => {
  const i = hitTest(anchors, project, x, y, px);
  return i == null ? null : anchors[i];
};
/** La retenue de l'annulation : les états sont ceux de l'appelant (clonés au push). */
export function createUndo(max = 20) {
  const stack = [];
  return {
    push(state) {
      stack.push(structuredClone(state));
      if (stack.length > max) stack.shift();
    },
    undo: () => stack.pop() ?? null,
    size: () => stack.length,
    clear() {
      stack.length = 0;
    }
  };
}

// ---------------------------------------------------------------- gestes
/** Un toucher sur la carte NUE donne une position (ni glisser de la carte, ni toucher sur une poignée ou une commande : `ignore`) ;
 *  un appui long (moins de 8 px de mouvement) est `onLongPress`, et le toucher qui le termine n'est pas un `onTap`. */
export function tapPosition(map, box, {
  onTap,
  onLongPress,
  longPressMs = 500,
  ignore
} = {}) {
  const v = viewOf(map),
    skip = skipper(ignore);
  let g = null,
    timer = 0;
  const clear = () => {
      clearTimeout(timer);
      timer = 0;
    },
    at = (x, y) => ({
      ...v.unproject(x, y),
      x,
      y
    }),
    down = e => {
      clear();
      g = null;
      if (e.button > 0 || taken.has(e) || skip(e)) return;
      const [x, y] = posIn(box, e);
      g = {
        id: e.pointerId,
        x0: x,
        y0: y,
        moved: false,
        long: false
      };
      if (onLongPress) timer = setTimeout(() => {
        if (!g || g.moved) return;
        g.long = true;
        onLongPress(at(g.x0, g.y0));
      }, longPressMs);
    },
    move = e => {
      if (!g || e.pointerId !== g.id || g.moved) return;
      const [x, y] = posIn(box, e);
      if (Math.hypot(x - g.x0, y - g.y0) > 8) {
        g.moved = true;
        clear();
      }
    },
    up = e => {
      const s = g;
      clear();
      g = null;
      if (!s || e.pointerId !== s.id || e.type === 'pointercancel' || s.moved || s.long) return;
      if (onTap) onTap(at(s.x0, s.y0));
    },
    menu = e => {
      if (onLongPress && !skip(e)) e.preventDefault();
    };
  box.addEventListener('pointerdown', down);
  box.addEventListener('pointermove', move);
  box.addEventListener('pointerup', up);
  box.addEventListener('pointercancel', up);
  box.addEventListener('contextmenu', menu);
  return {
    stop() {
      clear();
      g = null;
      box.removeEventListener('pointerdown', down);
      box.removeEventListener('pointermove', move);
      box.removeEventListener('pointerup', up);
      box.removeEventListener('pointercancel', up);
      box.removeEventListener('contextmenu', menu);
    }
  };
}
/** Les poignées déplaçables : un appui à `hit` px d'une poignée mobile la prend (capture du pointeur, la carte ne glisse pas) et rend
 *  le geste à chaque image (onMove) puis à la fin (onEnd) ; moins de 6 px de mouvement : un toucher (onTap). */
export function dragHandles(map, box, {
  handles,
  hit = 22,
  snap,
  ignore,
  onStart,
  onMove,
  onEnd,
  onTap,
  onCancel
} = {}) {
  const v = viewOf(map),
    skip = skipper(ignore);
  let d = null;
  const read = () => (handles ? handles() : []) || [],
    fields = (h, x, y, moved, sn) => {
      const ll = v.unproject(x, y),
        m = {
          id: h.id,
          kind: h.kind || 'point',
          lat: ll.lat,
          lon: ll.lon,
          x,
          y,
          moved,
          snap: sn
        };
      if (m.kind === 'radius' && h.center) m.meters = Math.round(metersBetween(h.center, ll) * 10) / 10;
      return m;
    },
    down = e => {
      if (e.button > 0 || skip(e)) return;
      const [x, y] = posIn(box, e);
      let best = null,
        bd = hit;
      for (const h of read()) {
        if (h.movable === false || !isPos(h)) continue;
        const q = v.project(+h.lat, +h.lon),
          dist = Math.hypot(q.x - x, q.y - y);
        if (dist <= bd) {
          bd = dist;
          best = h;
        }
      }
      if (!best) return;
      taken.add(e);
      e.stopPropagation();
      e.preventDefault();
      d = {
        h: best,
        id: e.pointerId,
        x0: x,
        y0: y,
        x,
        y,
        moved: false,
        snap: null
      };
      if (onStart) onStart({
        ...best,
        x,
        y
      });
      try {
        box.setPointerCapture(e.pointerId);
      } catch {
        /* capture refusée : le glisser suit tant que le doigt reste sur la carte */
      }
    },
    // le geste commencé sur une poignée n'est pas un déplacement de la carte (MapLibre écoute mousedown et touchstart)
    block = e => {
      if (!d) return;
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
    },
    move = e => {
      if (!d || e.pointerId !== d.id) return;
      e.stopPropagation();
      [d.x, d.y] = posIn(box, e);
      if (!d.moved && Math.hypot(d.x - d.x0, d.y - d.y0) > 6) d.moved = true;
      d.snap = d.moved && snap ? snap(d.x, d.y) || null : null;
      if (onMove) onMove(fields(d.h, d.x, d.y, d.moved, d.snap));
    },
    end = e => {
      if (!d || e.pointerId !== d.id) return;
      e.stopPropagation();
      const s = d;
      d = null;
      if (e.type === 'pointercancel') return onCancel?.(s.h);
      if (!s.moved) return onTap?.(s.h);
      onEnd?.(fields(s.h, s.x, s.y, true, s.snap));
    };
  box.addEventListener('pointerdown', down, true);
  for (const t of ['mousedown', 'touchstart', 'touchmove']) box.addEventListener(t, block, {
    capture: true,
    passive: false
  });
  box.addEventListener('pointermove', move, true);
  box.addEventListener('pointerup', end, true);
  box.addEventListener('pointercancel', end, true);
  return {
    /** Relit les poignées : un geste dont la poignée a disparu est lâché. */
    refresh() {
      if (d && !read().some(h => h.id === d.h.id)) this.cancel();
    },
    cancel() {
      if (!d) return;
      const h = d.h;
      d = null;
      onCancel?.(h);
    },
    dragging: () => d ? {
      id: d.h.id
    } : null,
    stop() {
      d = null;
      box.removeEventListener('pointerdown', down, true);
      for (const t of ['mousedown', 'touchstart', 'touchmove']) box.removeEventListener(t, block, true);
      box.removeEventListener('pointermove', move, true);
      box.removeEventListener('pointerup', end, true);
      box.removeEventListener('pointercancel', end, true);
    }
  };
}

// ---------------------------------------------------------------- couches MapLibre
const EMPTY = {
  type: 'FeatureCollection',
  features: []
};
/** Une source et ses couches reposées après chaque changement de style (comme zonesLayer / pointsLayer). `build()` rend les couches à poser. */
/** `above` : les préfixes d'identifiants des couches qui doivent rester AU-DESSUS de celles-ci, quel que soit l'ordre de création (référence < auteur < retour de geste). */
function layerSet(map, src, build, initial, above = []) {
  let data = initial || EMPTY;
  const put = () => {
      if (!map.getSource(src)) map.addSource(src, {
        type: 'geojson',
        data
      });
      for (const l of build())
        if (!map.getLayer(l.id)) map.addLayer({
          ...l,
          source: src
        }, (map.getStyle().layers || []).find(x => above.some(a => x.id.startsWith(a)))?.id);
    },
    add = () => {
      try {
        put();
      } catch {
        /* style pas encore chargé : la prochaine « style.load » ou « styledata » */
      }
    };
  map.on('style.load', add);
  map.on('styledata', add);
  add();
  return {
    set(next) {
      data = next || EMPTY;
      map.getSource(src)?.setData(data);
    },
    remove(ids) {
      map.off('style.load', add);
      map.off('styledata', add);
      for (const id of ids)
        if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(src)) map.removeSource(src);
    }
  };
}
const ptF = (p, props = {}) => ({
  type: 'Feature',
  properties: props,
  geometry: {
    type: 'Point',
    coordinates: [p.lon, p.lat]
  }
});
/** Le cercle de `meters` autour de p, en anneau de 72 points (formule de la destination sur la sphère). */
function circleRing(p, meters, n = 72) {
  const out = [],
    la = rad(p.lat),
    lo = rad(p.lon),
    dd = meters / R_EARTH;
  for (let i = 0; i <= n; i++) {
    const b = 2 * Math.PI * i / n,
      lat = Math.asin(Math.sin(la) * Math.cos(dd) + Math.cos(la) * Math.sin(dd) * Math.cos(b)),
      lon = lo + Math.atan2(Math.sin(b) * Math.sin(dd) * Math.cos(la), Math.cos(dd) - Math.sin(la) * Math.sin(lat));
    out.push([wrapLon(lon * 180 / Math.PI), lat * 180 / Math.PI]);
  }
  return out;
}
/** Le retour d'un geste en couche MapLibre, sans écran : `ghost` (l'élément où il se poserait), `rubber` (l'élastique d'une ligne en
 *  cours), `circle` ({ lat, lon, meters }, un rayon), `snap` (le point où il s'accrocherait). */
export function previewLayer(map, id, {
  tokens
} = {}) {
  const T = {
      accent: '#1565c0',
      bg: '#ffffff',
      snap: '#e65100',
      ...(tokens || {})
    },
    src = `me-prev-${id}-${++seq}`,
    ids = ['fill', 'ring', 'rubber', 'ghost', 'snap'].map(k => `${src}-${k}`),
    only = (t, extra = []) => ['all', ['==', ['get', 'part'], t], ...extra],
    set = L => L.set({
      type: 'FeatureCollection',
      features: cur
    });
  let cur = [];
  const L = layerSet(map, src, () => [{
    id: ids[0],
    type: 'fill',
    filter: only('circle'),
    paint: {
      'fill-color': T.accent,
      'fill-opacity': .15
    }
  }, {
    id: ids[1],
    type: 'line',
    filter: only('circle'),
    paint: {
      'line-color': T.accent,
      'line-width': 2
    }
  }, {
    id: ids[2],
    type: 'line',
    filter: only('rubber'),
    paint: {
      'line-color': T.accent,
      'line-width': 2,
      'line-dasharray': [3, 2]
    }
  }, {
    id: ids[3],
    type: 'circle',
    filter: only('ghost'),
    paint: {
      'circle-radius': 7,
      'circle-color': T.bg,
      'circle-stroke-color': T.accent,
      'circle-stroke-width': 2.5,
      'circle-opacity': .85
    }
  }, {
    id: ids[4],
    type: 'circle',
    filter: only('snap'),
    paint: {
      'circle-radius': 11,
      'circle-color': 'rgba(0,0,0,0)',
      'circle-stroke-color': T.snap,
      'circle-stroke-width': 3
    }
  }]);
  return {
    set({
      ghost,
      rubber,
      circle,
      snap
    } = {}) {
      cur = [];
      if (isPos(ghost)) cur.push(ptF(ghost, {
        part: 'ghost'
      }));
      if (isPos(snap)) cur.push(ptF(snap, {
        part: 'snap'
      }));
      const rp = (rubber || []).filter(isPos);
      if (rp.length > 1) cur.push({
        type: 'Feature',
        properties: {
          part: 'rubber'
        },
        geometry: {
          type: 'LineString',
          coordinates: rp.map(p => [p.lon, p.lat])
        }
      });
      if (isPos(circle) && Number.isFinite(+circle.meters) && circle.meters > 0) cur.push({
        type: 'Feature',
        properties: {
          part: 'circle'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [circleRing(circle, +circle.meters)]
        }
      });
      set(L);
    },
    clear() {
      cur = [];
      set(L);
    },
    remove: () => L.remove(ids)
  };
}
/** La forme en cours (un contour ouvert, une route) : un toucher sur la carte nue ajoute un sommet (accroché si `snap` répond), les
 *  sommets sont des poignées déplaçables, l'élastique est celui de previewLayer. */
export function sketch(map, box, {
  mode = 'line',
  points = [],
  min,
  snap,
  onChange,
  onTap,
  onDone
} = {}) {
  const need = Number.isFinite(min) ? min : mode === 'polygon' ? 3 : 2,
    undo = createUndo(50),
    pv = map.addSource ? previewLayer(map, 'sketch') : null;
  let n = 0,
    pts = [],
    closed = false;
  const mk = p => ({
      id: p.id ?? `v${++n}`,
      lat: round6(+p.lat),
      lon: round6(wrapLon(+p.lon))
    }),
    keep = () => undo.push(pts),
    show = (ghost = null) => {
      if (pv) pv.set({
        rubber: mode === 'polygon' && pts.length > 2 ? [...pts, pts[0]] : pts,
        ghost
      });
    },
    changed = () => {
      show();
      onChange?.(pts.map(p => ({
        ...p
      })));
    },
    idx = id => pts.findIndex(p => p.id === id);
  pts = points.filter(isPos).map(mk);
  const drag = dragHandles(map, box, {
      handles: () => closed ? [] : pts.map(p => ({
        id: p.id,
        lat: p.lat,
        lon: p.lon,
        kind: 'vertex'
      })),
      snap,
      onStart: () => keep(),
      onMove: m => show(m.snap || {
        lat: m.lat,
        lon: m.lon
      }),
      onEnd: m => {
        const i = idx(m.id),
          s = m.snap || m;
        if (i >= 0) pts[i] = {
          id: m.id,
          lat: round6(s.lat),
          lon: round6(s.lon)
        };
        changed();
      },
      onTap: h => {
        undo.undo(); // le toucher n'a rien changé : l'état gardé au départ est repris
        const i = idx(h.id);
        if (i >= 0) onTap?.({
          id: h.id,
          index: i,
          lat: pts[i].lat,
          lon: pts[i].lon
        });
      },
      onCancel: () => {
        undo.undo();
        show();
      }
    }),
    tap = tapPosition(map, box, {
      onTap: p => {
        if (closed) return;
        const s = snap ? snap(p.x, p.y) : null;
        api.add(s ? {
          lat: s.lat,
          lon: s.lon
        } : p);
      }
    });
  const api = {
    add(p) {
      keep();
      const q = mk(p);
      pts.push(q);
      changed();
      return {
        ...q
      };
    },
    insert(i, p) {
      keep();
      const q = mk(p);
      pts.splice(Math.max(0, Math.min(i, pts.length)), 0, q);
      changed();
      return {
        ...q
      };
    },
    move(id, p) {
      const i = idx(id);
      if (i < 0 || !isPos(p)) return false;
      keep();
      pts[i] = {
        id,
        lat: round6(+p.lat),
        lon: round6(wrapLon(+p.lon))
      };
      changed();
      return true;
    },
    remove(id) {
      const i = idx(id);
      if (i < 0 || pts.length <= need) return false;
      keep();
      pts.splice(i, 1);
      changed();
      return true;
    },
    undo() {
      const prev = undo.undo();
      if (!prev) return false;
      pts = prev;
      closed = false;
      changed();
      return true;
    },
    closeShape() {
      if (pts.length < need) return false;
      closed = true;
      show();
      onDone?.(pts.map(p => ({
        ...p
      })), mode === 'polygon');
      return true;
    },
    points: () => pts.map(p => ({
      ...p
    })),
    stop() {
      drag.stop();
      tap.stop();
      pv?.remove();
    }
  };
  show();
  return api;
}
/** Les éléments d'un auteur en couches SÉPARÉES (celles de la Carte restent intactes), au-dessus des marques de référence : `points`
 *  [{ id, lat, lon, label?, kind? }], `lines` [{ id, points, dash? }], `polygons` [{ id, rings }] ; `at(x, y)` rend l'élément sous un pixel. */
export function authorLayers(map, {
  id,
  tokens,
  onTap
} = {}) {
  const T = {
      default: '#1565c0',
      line: '#1565c0',
      fill: '#1565c0',
      ...(tokens || {})
    },
    src = `me-auth-${id}-${++seq}`,
    ids = ['fill', 'line', 'dash', 'dot'].map(k => `${src}-${k}`),
    kinds = Object.keys(T).filter(k => !['default', 'line', 'fill'].includes(k)),
    dotColor = ['match', ['get', 'kind'], ...kinds.flatMap(k => [k, T[k]]), T.default],
    hasPart = t => ['==', ['get', 'part'], t];
  let visible = true;
  const vis = () => visible ? 'visible' : 'none',
    L = layerSet(map, src, () => [{
      id: ids[0],
      type: 'fill',
      filter: hasPart('polygon'),
      layout: {
        visibility: vis()
      },
      paint: {
        'fill-color': T.fill,
        'fill-opacity': .18
      }
    }, {
      id: ids[1],
      type: 'line',
      filter: ['any', hasPart('polygon'), ['all', hasPart('line'), ['!=', ['get', 'dash'], true]]],
      layout: {
        visibility: vis()
      },
      paint: {
        'line-color': T.line,
        'line-width': 2.5
      }
    }, {
      id: ids[2],
      type: 'line',
      filter: ['all', hasPart('line'), ['==', ['get', 'dash'], true]],
      layout: {
        visibility: vis()
      },
      paint: {
        'line-color': T.line,
        'line-width': 2.5,
        'line-dasharray': [3, 2]
      }
    }, {
      id: ids[3],
      type: 'circle',
      filter: hasPart('point'),
      layout: {
        visibility: vis()
      },
      paint: {
        'circle-radius': 6,
        'circle-color': dotColor,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.5
      }
    }], null, ['me-prev-']),
    at = (x, y) => {
      const pad = 8,
        f = map.queryRenderedFeatures([x, y], {
          layers: ids.filter(i => map.getLayer(i))
        })[0] || map.queryRenderedFeatures([
          [x - pad, y - pad],
          [x + pad, y + pad]
        ], {
          layers: ids.filter(i => map.getLayer(i))
        })[0];
      if (!f || !visible) return null;
      const p = f.properties || {};
      return {
        part: p.part,
        id: p.fid,
        ...(p.label ? {
          label: p.label
        } : {}),
        ...(p.kind ? {
          kind: p.kind
        } : {})
      };
    },
    click = e => {
      if (!onTap || !visible) return;
      const f = at(e.point.x, e.point.y);
      if (f) onTap(f);
    };
  map.on('click', click);
  return {
    setFeatures({
      points = [],
      lines = [],
      polygons = []
    } = {}) {
      L.set({
        type: 'FeatureCollection',
        features: [
          ...points.filter(isPos).map(p => ptF(p, {
            part: 'point',
            fid: p.id,
            label: p.label || '',
            kind: p.kind || ''
          })),
          ...lines.map(l => ({
            type: 'Feature',
            properties: {
              part: 'line',
              fid: l.id,
              dash: !!l.dash
            },
            geometry: {
              type: 'LineString',
              coordinates: (l.points || []).filter(isPos).map(p => [p.lon, p.lat])
            }
          })),
          ...polygons.map(pg => ({
            type: 'Feature',
            properties: {
              part: 'polygon',
              fid: pg.id
            },
            geometry: {
              type: 'Polygon',
              coordinates: (pg.rings || []).map(r => r.filter(isPos).map(p => [p.lon, p.lat]))
            }
          }))
        ]
      });
    },
    setVisible(on) {
      visible = !!on;
      for (const i of ids)
        if (map.getLayer(i)) map.setLayoutProperty(i, 'visibility', vis());
    },
    at,
    remove() {
      map.off('click', click);
      L.remove(ids);
    }
  };
}
/** Les marques de référence de aerodb de l'emprise en couche qu'on touche : `onPick({ id, lat, lon, kind })` ; ce sont aussi les ancres de `snap`. */
export function referenceLayer(map, {
  data,
  kinds = ['aerodrome', 'navaid', 'fix', 'vrp'],
  minzoom = 7,
  onPick
} = {}) {
  const src = `me-ref-${++seq}`,
    dot = `${src}-dot`,
    feats = d => ({
      type: 'FeatureCollection',
      features: anchorsOf(d).filter(a => kinds.includes(a.kind)).map(a => ptF(a, {
        rid: a.id,
        kind: a.kind
      }))
    });
  let visible = true;
  const L = layerSet(map, src, () => [{
      id: dot,
      type: 'circle',
      minzoom,
      layout: {
        visibility: visible ? 'visible' : 'none'
      },
      paint: {
        'circle-radius': 4,
        'circle-color': ['match', ['get', 'kind'], 'aerodrome', '#6d4c41', 'navaid', '#00695c', 'vrp', '#6a1b9a', '#546e7a'],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1
      }
    }], feats(data), ['me-auth-', 'me-prev-']),
    click = e => {
      if (!onPick || !visible || !map.getLayer(dot)) return;
      const {
        x,
        y
      } = e.point,
        f = map.queryRenderedFeatures([x, y], {
          layers: [dot]
        })[0] || map.queryRenderedFeatures([
          [x - 10, y - 10],
          [x + 10, y + 10]
        ], {
          layers: [dot]
        })[0];
      if (!f) return;
      const [lon, lat] = f.geometry.coordinates;
      onPick({
        id: f.properties.rid,
        lat,
        lon,
        kind: f.properties.kind
      });
    };
  map.on('click', click);
  return {
    update(next) {
      L.set(feats(next));
    },
    setVisible(on) {
      visible = !!on;
      if (map.getLayer(dot)) map.setLayoutProperty(dot, 'visibility', visible ? 'visible' : 'none');
    },
    stop() {
      map.off('click', click);
      L.remove([dot]);
    }
  };
}
