// V3 frame/lib (propriétaire : le cadre) — le service de franchissement (SOG-0447) : le trajet entre deux relevés de position contre une zone (cercle ou contour), la portée et la hauteur
// par rapport à un objet, l'arrivée posée, et le rattrapage sur la trace gardée. PUR : ni écran, ni DOM, ni horloge, ni stockage, ni réseau ; ne lève jamais ; chaque entrée est non fiable (une
// zone, un objet, un relevé venus d'un fichier de mission ou d'une source de position) et lue bornée ; le MÊME module juge le vol (« Affectation », modules/missions/drawers.js) et l'essai de
// l'auteur (« Création ») : aucun des deux ne réécrit la géométrie.
//
// FORMES (celles que rend le lecteur de missions, frame/lib/mission.js, les unités converties UNE fois par lui : kilomètres → mètres pour un rayon de zone, milles marins pour une portée ou un rayon
// d'arrivée, pieds pour une altitude, un plafond et une hauteur) :
//   · relevé  { at (ISO) | t (ms), lat, lon, altFt, aglFt, onGround, headingDeg, trackDeg, gsKt, source } — la position en direct (progress.actual) ; tout champ absent ou hors bornes vaut null = INCONNU :
//     jamais 0 ni « en vol » par défaut ; altFt est l'altitude au-dessus de la mer, aglFt la hauteur au-dessus du sol, onGround vrai/faux/null, headingDeg le cap VRAI ;
//   · zone    { shape: { circle: { lat, lon, radiusM } } | { polygon: [[lat, lon]…] }, ceilingFt | null }  (3 à 100 sommets, rayon de 1 m à 500 km, plafond de 0 à 60 000 ft : altitude au-dessus de la mer) ;
//   · objet   { lat, lon, rangeNm, heightFt | null, altitudeFt | null }  (portée de 0 à 100 NM exclu 0 ; heightFt : distance verticale de détection ; altitudeFt : altitude de l'objet, null = au sol) ;
//   · arrivée { at: { lat, lon }, radiusNm, speedMaxKt | null, onGround }  (onGround : l'arrivée doit être posée) ;
//   · trace   [[lat, lon, altFt | null, s, aglFt?, ground?]…]  (frame/lib/trail.js : s = secondes depuis le départ ; aglFt et ground (1/0/null) facultatifs, absents des points d'avant SOG-0447).
// ÉTATS : une réponse est vraie, fausse ou INCONNUE (null / 'unknown') ; une donnée absente ne satisfait JAMAIS une clé : elle rend inconnu (sauf quand une autre donnée suffit déjà à rendre faux).
// GÉOMÉTRIE : plan local (équirectangulaire) autour de la forme ou de l'objet : juste à ± 1 % jusqu'à 500 km du centre, bien en deçà de ce que demande un tiroir ; un côté de contour est une droite
// du plan (pas un grand cercle). Un trajet est le segment rectiligne entre les deux relevés ; l'instant d'un franchissement est interpolé sur ce segment (à vitesse constante).
// API : fixOf, shapeOf, crossed, reach, arrived, replay ; BOUNDS.

export const BOUNDS = Object.freeze({
  vertices: Object.freeze([3, 100]),
  radiusM: Object.freeze([1, 500000]),
  feet: Object.freeze([0, 60000]),
  altitudeFt: Object.freeze([-1500, 60000]),
  fixAltFt: Object.freeze([-2000, 100000]),
  aglFt: Object.freeze([-200, 100000]),
  rangeNm: Object.freeze([0, 100]),
  radiusNm: Object.freeze([0, 100]),
  speedKt: Object.freeze([0, 5000]),
  trailPoints: 2000
});
const M_PER_DEG = 111194.93,
  M_PER_NM = 1852,
  rad = Math.PI / 180;

/** Un nombre réel dans [lo, hi] ; null sinon (un texte, un booléen, NaN, ±Infinity, hors bornes). */
const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null;
const plain = v => v && typeof v === 'object' && !Array.isArray(v) ? v : null;

/** Un relevé lu : { t (ms | null), lat, lon, altFt, aglFt, onGround, headingDeg, trackDeg, gsKt, source } ; null quand sa position est illisible. Tout champ absent ou hors bornes : null. */
export function fixOf(raw) {
  try {
    return readFix(raw);
  } catch {
    return null; // un objet piégé (accesseur qui lève) : illisible, jamais une exception
  }
}

function readFix(raw) {
  const o = plain(raw);
  if (!o) return null;
  const lat = num(o.lat, -90, 90),
    lon = num(o.lon, -180, 180);
  if (lat === null || lon === null) return null;
  const t = Number.isFinite(o.t) ? o.t : typeof o.at === 'string' ? Date.parse(o.at) : NaN;
  return {
    t: Number.isFinite(t) ? t : null,
    lat,
    lon,
    altFt: num(o.altFt, ...BOUNDS.fixAltFt),
    aglFt: num(o.aglFt, ...BOUNDS.aglFt),
    onGround: typeof o.onGround === 'boolean' ? o.onGround : null,
    headingDeg: num(o.headingDeg, 0, 360),
    trackDeg: num(o.trackDeg, 0, 360),
    gsKt: num(o.gsKt, ...BOUNDS.speedKt),
    source: typeof o.source === 'string' ? o.source.slice(0, 16) : ''
  };
}

/** Une zone lue : { kind: 'circle', lat, lon, radiusM } | { kind: 'polygon', ring: [[lat, lon]…] } ; null quand elle est illisible (hors bornes : jamais ramenée dans ses bornes, ce serait une autre zone).
 *  Reçoit la forme du lecteur de missions ({ circle } | { polygon }) ou, déjà lue, la sienne ({ kind }). */
export function shapeOf(raw) {
  try {
    return readShape(raw);
  } catch {
    return null;
  }
}

function readShape(raw) {
  const o = plain(raw);
  if (!o) return null;
  const c = plain(o.circle) || (o.kind === 'circle' ? o : null);
  if (c) {
    const lat = num(c.lat, -90, 90),
      lon = num(c.lon, -180, 180),
      r = num(c.radiusM, ...BOUNDS.radiusM);
    return lat === null || lon === null || r === null ? null : {
      kind: 'circle',
      lat,
      lon,
      radiusM: r
    };
  }
  const ring = Array.isArray(o.polygon) ? o.polygon : o.kind === 'polygon' && Array.isArray(o.ring) ? o.ring : null;
  if (!ring || ring.length < BOUNDS.vertices[0] || ring.length > BOUNDS.vertices[1]) return null;
  const pts = [];
  for (const p of ring) {
    const lat = Array.isArray(p) ? num(p[0], -90, 90) : null,
      lon = Array.isArray(p) ? num(p[1], -180, 180) : null;
    if (lat === null || lon === null) return null;
    pts.push([lat, lon]);
  }
  return {
    kind: 'polygon',
    ring: pts
  };
}

// ----------------------------------------------------------------------------------------------------------------- géométrie (plan local, mètres)
/** Le plan local autour de (lat0, lon0) : xy(lat, lon) → [x, y] en mètres (x vers l'est, y vers le nord). */
function plane(lat0, lon0) {
  const k = Math.cos(lat0 * rad) * M_PER_DEG;
  return (lat, lon) => {
    let d = lon - lon0;
    d = ((d + 540) % 360) - 180; // le plus court côté de l'antiméridien
    return [d * k, (lat - lat0) * M_PER_DEG];
  };
}
/** Le point du segment a–b le plus proche de l'origine : { t (0..1), d (m) }. */
function nearest(a, b) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    l2 = dx * dx + dy * dy,
    t = l2 ? Math.max(0, Math.min(1, -(a[0] * dx + a[1] * dy) / l2)) : 0;
  return {
    t,
    d: Math.hypot(a[0] + t * dx, a[1] + t * dy)
  };
}
/** Le point p est-il dans le contour (règle pair-impair) ? */
function within(p, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i],
      [xj, yj] = ring[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** Le paramètre (0..1) du premier croisement du segment a–b avec le segment c–d ; null s'il n'y en a pas. */
function cut(a, b, c, d) {
  const rx = b[0] - a[0],
    ry = b[1] - a[1],
    sx = d[0] - c[0],
    sy = d[1] - c[1],
    den = rx * sy - ry * sx;
  if (!den) return null; // parallèles (ou confondus : le contact est alors pris par within / les extrémités)
  const t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den,
    u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
}
/** Le premier paramètre (0..1) où le segment a–b entre dans le disque de rayon r centré à l'origine ; null s'il n'y entre pas. */
function enter(a, b, r) {
  if (Math.hypot(a[0], a[1]) <= r) return 0;
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    A = dx * dx + dy * dy,
    B = 2 * (a[0] * dx + a[1] * dy),
    C = a[0] * a[0] + a[1] * a[1] - r * r;
  if (!A) return null;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return null;
  const t = (-B - Math.sqrt(disc)) / (2 * A);
  return t >= 0 && t <= 1 ? t : null;
}
const nmBetween = (a, b) => {
  const s = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lon - a.lon) * rad /
    2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.min(1, Math.sqrt(s))) / M_PER_NM;
};
const lerp = (a, b, t) => a === null || b === null ? null : a + (b - a) * t;

/** Ce que le trajet prev → next fait d'une zone : { state, touched, at, altFt, reason? }.
 *  crossing : vrai pour entered et through seulement (un FRANCHISSEMENT : l'avion est entré dans la zone pendant le trajet), faux pour les autres états, null pour unknown ; `touched` dit la PRÉSENCE (y compris un relevé déjà
 *  dedans : un départ dans la zone, un trajet qui en sort). C'est à l'appelant de choisir celui de ses deux mots que sa clé veut ; la fonction est sans état : même entrées, même réponse sur deux appareils.
 *  state : 'outside' (ni dedans ni touchée) | 'entered' (de dehors à dedans) | 'inside' (dedans aux deux relevés) | 'left' (de dedans à dehors) | 'through' (dehors aux deux relevés, mais le trajet
 *  traverse la zone) | 'unknown' (forme ou relevé illisible, altitude absente alors qu'un plafond est demandé) ; touched : vrai pour entered, inside, left et through, faux pour outside, null pour unknown ;
 *  at : l'instant (ms) du premier contact, interpolé sur le trajet quand les deux relevés ont leur instant ; altFt : l'altitude à ce contact.
 *  Le plafond (zone.ceilingFt, au-dessus de la mer, ou de la hauteur sol avec { alt: 'agl' }) est celui de l'atelier : les DEUX relevés du segment doivent être sous lui ; au-dessus : 'outside' (reason: 'ceiling').
 *  prev peut être null (premier relevé) : le point seul est jugé. */
export function crossed(prev, next, zone, {
  alt = 'msl'
} = {}) {
  const unknown = (reason = 'data') => ({
    state: 'unknown',
    touched: null,
    crossing: null,
    at: null,
    altFt: null,
    reason
  });
  try {
    const z = plain(zone),
      shape = shapeOf(z?.shape),
      b = fixOf(next),
      a = prev == null ? null : fixOf(prev);
    if (!shape || !b || (prev != null && !a)) return unknown('shape-or-fix');
    const ceil = z.ceilingFt == null ? null : num(z.ceilingFt, ...BOUNDS.feet);
    if (z.ceilingFt != null && ceil === null) return unknown('ceiling');
    const key = alt === 'agl' ? 'aglFt' : 'altFt';
    if (ceil !== null) {
      const vals = [a, b].filter(Boolean).map(f => f[key]);
      if (vals.some(v => v === null)) return unknown('altitude'); // une altitude absente ne satisfait jamais un plafond
      if (vals.some(v => v > ceil)) return {
        state: 'outside',
        touched: false,
        crossing: false,
        at: null,
        altFt: null,
        reason: 'ceiling'
      };
    }
    // le plan local autour de la forme
    const [lat0, lon0] = shape.kind === 'circle' ? [shape.lat, shape.lon] : [shape.ring.reduce((s, p) => s + p[0], 0) / shape.ring.length,
        shape.ring[0][1]
      ],
      xy = plane(lat0, lon0),
      B = xy(b.lat, b.lon),
      A = a ? xy(a.lat, a.lon) : null,
      ring = shape.kind === 'polygon' ? shape.ring.map(p => xy(p[0], p[1])) : null,
      inside = p => shape.kind === 'circle' ? Math.hypot(p[0], p[1]) <= shape.radiusM : within(p, ring),
      inB = inside(B),
      inA = A ? inside(A) : null;
    let t = null; // le paramètre du premier contact sur A → B
    if (A) {
      if (inA) t = 0;
      else if (shape.kind === 'circle') t = enter(A, B, shape.radiusM);
      else
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const c = cut(A, B, ring[j], ring[i]);
          if (c !== null && (t === null || c < t)) t = c;
        }
    } else if (inB) t = 0;
    const touched = A ? t !== null || inB : inB;
    const state = !A ? (inB ? 'inside' : 'outside') : inA && inB ? 'inside' : !inA && inB ? 'entered' : inA && !inB ? 'left' : touched ?
      'through' : 'outside';
    const when = A ? (t === null ? 1 : t) : 0,
      at = A && a.t !== null && b.t !== null ? Math.round(a.t + (b.t - a.t) * when) : b.t;
    return {
      state,
      touched: state !== 'outside',
      crossing: state === 'entered' || state === 'through',
      at: state === 'outside' ? null : at,
      altFt: state === 'outside' ? null : A ? lerp(a.altFt, b.altFt, when) : b.altFt
    };
  } catch {
    return unknown('error');
  }
}

/** La portée et la hauteur du trajet prev → next par rapport à un objet : { ok, distNm, heightFt, at }.
 *  ok : vrai quand le point le plus proche du trajet est à portée (rangeNm) ET, si l'objet veut une hauteur (heightFt), à moins de cette distance VERTICALE ; faux quand l'une des deux est certainement
 *  manquée ; null (inconnu) quand une donnée nécessaire manque (une altitude absente ne satisfait jamais). La hauteur se juge, selon `heightOf` : 'auto' (défaut) = par rapport à l'altitude de l'objet
 *  si elle est connue (altitudeFt), sinon la hauteur sol du relevé (aglFt : l'objet est au sol), sinon inconnu ; 'target' ou 'agl' pour forcer. Les valeurs verticales sont interpolées au point le plus proche.
 *  prev peut être null : le point seul. À 350 kt, 5 s font 0,5 NM : c'est le trajet qui est jugé, pas seulement les deux points. */
export function reach(prev, next, target, {
  heightOf = 'auto'
} = {}) {
  const none = {
    ok: null,
    distNm: null,
    heightFt: null,
    at: null
  };
  try {
    const o = plain(target),
      b = fixOf(next),
      a = prev == null ? null : fixOf(prev),
      lat = num(o?.lat, -90, 90),
      lon = num(o?.lon, -180, 180),
      range = num(o?.rangeNm, 0, BOUNDS.rangeNm[1]);
    if (!b || (prev != null && !a) || lat === null || lon === null || range === null || range <= 0) return none;
    const hmax = o.heightFt == null ? null : num(o.heightFt, ...BOUNDS.feet),
      objAlt = o.altitudeFt == null ? null : num(o.altitudeFt, ...BOUNDS.altitudeFt);
    if (o.heightFt != null && hmax === null) return none;
    const xy = plane(lat, lon),
      B = xy(b.lat, b.lon),
      A = a ? xy(a.lat, a.lon) : null,
      n = A ? nearest(A, B) : {
        t: 1,
        d: Math.hypot(B[0], B[1])
      },
      distNm = n.d / M_PER_NM,
      at = a && a.t !== null && b.t !== null ? Math.round(a.t + (b.t - a.t) * n.t) : b.t;
    if (distNm > range) return {
      ok: false,
      distNm,
      heightFt: null,
      at: null
    };
    if (hmax === null) return {
      ok: true,
      distNm,
      heightFt: null,
      at
    };
    const mode = heightOf === 'agl' || heightOf === 'target' ? heightOf : objAlt !== null ? 'target' : 'agl';
    const here = key => a ? lerp(a[key], b[key], n.t) : b[key];
    let vertical = null;
    if (mode === 'target') {
      if (objAlt !== null) {
        const h = here('altFt');
        vertical = h === null ? null : Math.abs(h - objAlt);
      }
    } else {
      const h = here('aglFt');
      vertical = h === null ? null : Math.abs(h);
    }
    if (vertical === null) return {
      ok: null,
      distNm,
      heightFt: null,
      at
    };
    return {
      ok: vertical <= hmax,
      distNm,
      heightFt: vertical,
      at: vertical <= hmax ? at : null
    };
  } catch {
    return none;
  }
}

/** L'arrivée posée : { ok, distNm, gsKt, onGround } pour un relevé. ok : vrai quand le relevé est dans le rayon, sous la vitesse maximale (si l'arrivée en veut une) et, si elle doit être posée, AU SOL ;
 *  faux quand l'une de ces conditions est certainement manquée ; null quand une donnée nécessaire manque (une vitesse ou un état « au sol » inconnu ne satisfait jamais). */
export function arrived(fix, arrival) {
  const none = {
    ok: null,
    distNm: null,
    gsKt: null,
    onGround: null
  };
  try {
    const f = fixOf(fix),
      o = plain(arrival),
      at = plain(o?.at),
      lat = num(at?.lat, -90, 90),
      lon = num(at?.lon, -180, 180),
      radius = num(o?.radiusNm, 0, BOUNDS.radiusNm[1]);
    if (!f || lat === null || lon === null || radius === null || radius <= 0) return none;
    const maxKt = o.speedMaxKt == null ? null : num(o.speedMaxKt, ...BOUNDS.speedKt);
    if (o.speedMaxKt != null && maxKt === null) return none;
    const distNm = nmBetween(f, {
      lat,
      lon
    });
    const checks = [distNm <= radius];
    if (maxKt !== null) checks.push(f.gsKt === null ? null : f.gsKt <= maxKt);
    if (o.onGround === true) checks.push(f.onGround === null ? null : f.onGround === true);
    return {
      ok: checks.includes(false) ? false : checks.includes(null) ? null : true,
      distNm,
      gsKt: f.gsKt,
      onGround: f.onGround
    };
  } catch {
    return none;
  }
}

/** Les points d'une trace gardée comme des relevés : startMs (instant du départ, ms) donne l'instant de chacun. */
function trailFixes(trail, startMs) {
  const out = [];
  for (const p of (Array.isArray(trail) ? trail : []).slice(0, BOUNDS.trailPoints)) {
    if (!Array.isArray(p)) continue;
    const f = fixOf({
      lat: p[0],
      lon: p[1],
      altFt: p[2],
      t: Number.isFinite(startMs) && Number.isFinite(p[3]) ? startMs + p[3] * 1000 : null,
      aglFt: p.length > 4 ? p[4] : null,
      onGround: p.length > 5 ? (p[5] === 1 ? true : p[5] === 0 ? false : null) : null
    });
    if (f) out.push(f);
  }
  return out;
}

/** Le rattrapage : rejoue la trace gardée avec les MÊMES fonctions (la page revient après une absence : un franchissement manqué est retrouvé). kind : 'zone' (crossed), 'object' (reach) ou 'arrival'
 *  (arrived, sur chaque point) ; key : la zone, l'objet ou l'arrivée ; opts : { startMs, alt, heightOf }.
 *  Rend { found: true | false | null, at, state, index, points } : found vrai au premier contact (zone touchée, objet à portée et à hauteur, arrivée posée), faux quand la trace entière est jugée sans contact,
 *  null quand elle ne le dit pas (aucun contact et des morceaux inconnus : la trace garde un point par mille marin, l'altitude au sol et la hauteur manquent aux anciens points). */
export function replay(trail, kind, key, opts = {}) {
  const none = {
    found: null,
    at: null,
    state: 'unknown',
    index: -1,
    points: 0
  };
  try {
    const fixes = trailFixes(trail, opts?.startMs);
    if (!fixes.length) return none;
    let unknown = false;
    for (let i = kind === 'arrival' ? 0 : 1; i < fixes.length; i++) {
      const r = kind === 'zone' ? crossed(fixes[i - 1], fixes[i], key, opts) : kind === 'object' ? reach(fixes[i - 1], fixes[i], key,
        opts) : kind === 'arrival' ? arrived(fixes[i], key) : null;
      if (!r) return none;
      const hit = kind === 'zone' ? r.touched === true : r.ok === true,
        unk = kind === 'zone' ? r.touched === null : r.ok === null;
      if (hit) return {
        found: true,
        at: r.at ?? fixes[i].t,
        state: kind === 'zone' ? r.state : 'ok',
        index: i,
        points: fixes.length
      };
      if (unk) unknown = true;
    }
    return {
      found: unknown ? null : false,
      at: null,
      state: unknown ? 'unknown' : kind === 'zone' ? 'outside' : 'no',
      index: -1,
      points: fixes.length
    };
  } catch {
    return none;
  }
}
