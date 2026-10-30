// V3 maps — ce que la Carte lit (modules/maps/SPEC.md § 2.1, § 5, § 6.8) : le vol courant (points, niveau, dégagement), les
// données aéronautiques d'aerodb pour l'emprise utile (couloir de la route, vue rapprochée), les réglages de l'appareil et
// de la compagnie ; la vue vivante (chaque écriture du vol redessine, une version plus ancienne n'est jamais reprise).

import {
  S,
  flightPath,
  flownPts
} from './state.js';
import {
  wrapLon,
  nearLon,
  unwrapLons
} from '../../frame/lib/geo.js';
import {
  expandedPath,
  flownPath,
  loadProcedures,
  proceduresOf
} from '../../frame/lib/current_flight.js';
import {
  effectiveProfile,
  groupOf
} from './layers.js';
import {
  schedule,
  projNow
} from './draw.js';
import {
  status,
  header,
  showBox,
  fitMap
} from './screen.js';
import {
  progressUpdate,
  progressOnly,
  sameRoute
} from './flight_time.js';
import {
  buildProfile
} from './profile_view.js';
import {
  syncView,
  legendSync
} from './sheet_view.js';
import {
  wantRunways
} from './procs.js';

// ---------------------------------------------------------------- vol
/** Le vol courant lu : { flight, points, altn, levelFt, updated }. Le dégagement vient d'aerodb, sans être attendu : sa
 *  position trouvée est gardée, puis le vol est redessiné une fois. */
async function readFlight() {
  const f = (await S.ctx.data.get(flightPath()).catch(() => null)) || null;
  if (!S) return null; // la Carte a été quittée pendant la lecture
  const pts = pointsOf(f);
  let altn = null;
  if (f?.route?.altn && pts.length && S.ctx.aerodb) {
    const id = f.route.altn,
      known = S.altnPos ||= new Map();
    if (!known.has(id)) {
      known.set(id, null);
      S.ctx.aerodb.coords(id).catch(() => null).then(c => {
        if (!S || !c) return;
        known.set(id, c);
        applyFlight(true);
      });
    }
    const c = known.get(id);
    // même côté de la ligne de changement de date que l'arrivée (le dégagement est dessiné à la suite de la route)
    if (c) altn = {
      id,
      lat: c.lat,
      lon: nearLon(c.lon, pts[pts.length - 1].lon)
    };
  }
  return {
    flight: f,
    points: pts,
    altn,
    levelFt: +f?.level?.ft || 0,
    updated: f?.updated_at || ''
  };
}
/** Points de la carte et du profil d'après l'enregistrement du vol : longitudes continues (une route Sibérie → Alaska va de
 *  177° à 195°) ; alt_ft (niveau tenu à partir du point, jamais au premier ni au dernier) devient lvl, le premier point prend
 *  level.ft dès qu'un palier existe (SPEC § 2.1). */
export function pointsOf(f) {
  const raw = (f?.route?.points || []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon)),
    pts = unwrapLons(raw.map((p, i) => ({
      id: p.id || '',
      lat: +p.lat,
      lon: +p.lon,
      ...(i > 0 && i < raw.length - 1 && p.alt_ft != null && +p.alt_ft > 0 ? {
        lvl: {
          ft: +p.alt_ft
        }
      } : {})
    })));
  if (pts.some(p => p.lvl) && +f?.level?.ft > 0) pts[0].lvl = {
    ft: +f.level.ft
  };
  return pts;
}
// ---------------------------------------------------------------- le chemin « route + procédures » (V3_SPECIFICATION § 10.20)
/** Clé des procédures à charger : le choix du vol (v2) et les terrains de la route ; elle change, on relit les enregistrements. */
const procKey = f => JSON.stringify([proceduresOf(f), f?.route?.dep || '', f?.route?.arr || '']);
/** Chemin du vol (route + procédures choisies) et ses points volés, rangés dans S.route (path : tout, tronçons sans point et
 *  approche interrompue compris ; flown : les points volés avec nm), marques NM sur le chemin volé. Sans aerodb, sans
 *  procédure ou sans enregistrement : le chemin est la route. Longitudes continues. */
export function buildPath() {
  const f = S.route.flight,
    path = expandedPath(f, S.procs || {});
  S.route.path = unwrapLons(path);
  S.route.flown = unwrapLons(flownPath(path));
  S.marks = MapsRender.marks(flownPts());
}
/** Vrai si le vol a une piste ou une procédure choisie (route.procedures v2, côtés vérifiés). */
const isChosen = f => {
  const v = proceduresOf(f);
  return [v.dep?.sid, v.dep?.trans, v.dep?.rwy, v.arr?.star, v.arr?.trans, v.arr?.app, v.arr?.appTrans, v.arr?.rwy].some(Boolean);
};
/** Procédures du vol (aerodb, loadProcedures de frame/lib/current_flight.js), relues une fois par changement de
 *  route.procedures : le chemin est refait et la carte redessinée à leur arrivée, sans attendre (le dessin d'avant reste). La
 *  Carte ne les écrit jamais. */
export function loadProcs() {
  const f = S.route.flight,
    key = procKey(f);
  if (key === S.procsKey) return;
  S.procsKey = key;
  // les pistes des deux terrains, lues avec le vol (choisies ou non) : les vecteurs de seuil de la carte (§ 10.30), par le chemin de
  // toutes les pistes (S.runways, wantRunways)
  const A = S.ctx.aerodb,
    r = f?.route || {};
  wantRunways([r.dep || r.points?.[0]?.id, r.arr || r.points?.at?.(-1)?.id]);
  if (!isChosen(f) || !A) {
    if (S.procs) {
      S.procs = null;
      afterPath();
    }
    return;
  }
  loadProcedures(A, f).then(procs => {
    if (!S || S.procsKey !== key) return;
    S.procs = procs;
    afterPath();
  }, () => {});
}
/** Le chemin a changé (procédures arrivées ou retirées) : refait, puis la carte et le profil redessinés. */
function afterPath() {
  buildPath();
  schedule();
  buildProfile();
}
/** Points du profil d'après les points volés : longitudes continues, niveaux tenus (alt_ft des points de la route, jamais le
 *  premier ni le dernier ; le premier prend level.ft dès qu'un palier existe) ; noMark pour les points de procédure, qui ne
 *  portent pas de nom sous la coupe. */
export function flownProfilePoints(flown, f) {
  const routeIdx = flown.map((p, i) => p.origin === 'route' ? i : -1).filter(i => i >= 0),
    ends = new Set([routeIdx[0], routeIdx.at(-1)]),
    pts = flown.map((p, i) => ({
      id: p.id || '',
      lat: +p.lat,
      lon: +p.lon,
      nm: p.nm,
      ...(p.origin === 'route' && !ends.has(i) && p.alt_ft != null && +p.alt_ft > 0 ? {
        lvl: {
          ft: +p.alt_ft
        }
      } : {}),
      ...(p.origin !== 'route' ? {
        noMark: true
      } : {})
    }));
  if (pts.some(p => p.lvl) && +f?.level?.ft > 0) pts[0].lvl = {
    ft: +f.level.ft
  };
  return pts;
}
/** Emprise imposée : celle des procédures du mode « choisir sur la carte », sinon celle de l'adresse (#maps?view=ouest,sud,est,nord),
 *  sinon null. */
export const viewOf = () => {
  if (S.choose?.fit) return S.choose.fit;
  const v = String(S.ctx.query?.view || '').split(',').map(Number);
  return v.length === 4 && v.every(Number.isFinite) ? {
    w: v[0],
    s: v[1],
    e: v[2],
    n: v[3]
  } : null;
};
/** Vol (re)lu : profil, emprise, marques, données, caméra, notes, progression, profil vertical, dessin choisi. live :
 *  écriture du vol pendant qu'on le regarde — la caméra de l'utilisateur est gardée (SPEC § 5), les zones déjà lues ne sont
 *  pas relues. */
export async function applyFlight(live = false) {
  const route = await readFlight();
  if (!S || !route) return; // quittée pendant la lecture : rien n'est posé sur un état démonté
  S.route = route;
  if (S.procs && !isChosen(S.route.flight)) S.procs = null; // le choix est vidé : le chemin redevient la route tout de suite
  buildPath();
  loadProcs();
  S.profile = effectiveProfile();
  const all = [...S.route.points, ...(S.route.altn ? [S.route.altn] : [])];
  S.fit = viewOf() || MapsRender.bboxOf(all, 25) || {
    w: -5,
    s: 41,
    e: 10,
    n: 51.5
  };
  S.data = null;
  if (!live) S.cursor = null;
  showBox(!!S.route.points.length);
  header();
  // un autre vol (départ ou arrivée changés) se recadre ; le même vol relu garde la caméra dès que l'utilisateur l'a déplacée,
  // sauf si la route sort de la vue avant tout geste
  const inView = () => {
      const bb = S.map.getBounds(),
        toC = projNow(),
        r = S.box.getBoundingClientRect();
      return all.every(p => {
        const q = toC(p.lat, p.lon);
        return q.x >= 0 && q.x <= r.width && q.y >= 0 && q.y <= r.height && p.lat >= bb.getSouth() && p.lat <= bb.getNorth();
      });
    },
    key = `${S.route.flight?.route?.dep || ''}>${S.route.flight?.route?.arr || ''}`,
    other = key !== S.routeKey;
  S.routeKey = key;
  if (other) S.userMoved = false;
  if (S.map && (!live || other || (!S.userMoved && !inView()))) fitMap(false);
  status();
  progressUpdate();
  schedule();
  buildProfile();
  syncView();
}
/** Vue vivante : le vol écrit ailleurs (Carburant à côté, le cadre, un geste de la carte qui revient) est relu 300 ms après la
 *  dernière écriture, s'il est plus récent que la version montrée ; seule la progression a changé : rien n'est relu. */
export function watchFlight() {
  let live = 0;
  const check = (ms = 300) => {
    clearTimeout(live);
    live = setTimeout(async () => {
      const f = await S?.ctx.data.get(flightPath()).catch(() => null);
      if (!S || !((f?.updated_at || '') > (S.route.updated || ''))) return;
      performance.mark('maps:live');
      if (sameRoute(f, S.route.flight)) return progressOnly(f);
      await applyFlight(true);
    }, ms);
  };
  const stop = S.ctx.data.watch(flightPath(), () => check());
  // une écriture arrivée entre la lecture du montage et cet abonnement (Carburant écrit started.at puis ouvre la Carte) n'a pas
  // d'événement : relue une fois, tout de suite (J2, étape 3 : « Carte says something at mount », une fois sur deux)
  check(0);
  return [stop, () => clearTimeout(live)];
}

// ---------------------------------------------------------------- réglages
/** Seuil de zoom des vecteurs de piste sans réglage de la compagnie (le seul défaut, lu ici). */
const RUNWAY_ZOOM = 11;
/** Profils des modes de la compagnie (airline/map_profiles.json) et unité d'altitude du pilote (fuel.json, displayAlt :
 *  équidistance des courbes de niveau). */
export async function readSettings() {
  const P = await S.ctx.data.get('airline/map_profiles.json').catch(() => null);
  if (!S) return; // la Carte a été quittée pendant la lecture
  const F = await S.ctx.data.get(`pilot/${S.ctx.identity?.trigram || 'ANON'}/fuel.json`).catch(() => null);
  if (!S) return;
  S.repoProfiles = P?.profiles && typeof P.profiles === 'object' ? P.profiles : null;
  // seuil de zoom des vecteurs de piste (V3 § 10.30 ; Réglages › Administration ; frame/settings/INTEGRATION.md § 4)
  const z = P?.runwayZoom;
  S.runwayZoom = Number.isInteger(z) && z >= 8 && z <= 16 ? z : RUNWAY_ZOOM;
  S.altUnit = F?.displayAlt === 'm' ? 'm' : 'ft';
}
/** Réglages de l'écran gardés sur cet appareil (cache/maps/ui.json) : mode et couches par mode (seulement ce qui diffère des
 *  valeurs de départ, SPEC § 6.7). */
export const saveUi = () => S.ctx.data.put('cache/maps/ui.json', {
  preset: S.preset,
  layers: S.layers || {}
}).catch(() => {});

// ---------------------------------------------------------------- données (aerodb, emprise utile)
/** Emprise b élargie de k de chaque côté. */
const enlarge = (b, k) => {
  const dx = (b.e - b.w) * k,
    dy = (b.n - b.s) * k;
  return {
    w: b.w - dx,
    e: b.e + dx,
    s: Math.max(-85, b.s - dy),
    n: Math.min(85, b.n + dy)
  };
};
/** Emprise des données à lire pour la vue montrée : vue d'ensemble (au moins 90 % de la largeur de la route) → l'emprise de
 *  la route ; vue rapprochée → la vue élargie de 15 %. */
export const wantBox = shown => S.profile?.corridorNm > 0 && (shown.e - shown.w) >= (S.fit.e - S.fit.w) * .9 ? S.fit : enlarge(shown, .15);
/** Largeur (NM) au-delà de laquelle la vue n'est lue qu'autour du vol, même « Autour du vol seulement » décochée (garde-fou d'une
 *  vue continent : la puce « i » le dit) ; marge du couloir alors imposé. */
export const WIDE_NM = 600;
const FORCED_NM = 10;
/** Largeur d'une emprise en NM, à sa latitude moyenne. */
export const widthNm = b => (b.e - b.w) * 60 * Math.cos((b.s + b.n) / 2 * Math.PI / 180);
/** Couloir de lecture (NM ; 0 : toute l'emprise) : « Autour du vol seulement » cochée, hors vue rapprochée (300 px par degré et
 *  plus : toute l'emprise est lue) ; décochée, toute la vue filtrée par la complexité, sauf au-delà de WIDE_NM de large (couloir
 *  imposé). Jamais sur une carte de mission. */
export const corridorFor = (shown, W) => {
  const nm = +S.profile?.corridorNm || 0;
  if (nm > 0) return W / Math.max(1e-6, shown.e - shown.w) < 300 ? nm : 0;
  return !S.mission && !S.ctx.query?.mission && S.route.points.length > 1 && widthNm(shown) > WIDE_NM ? FORCED_NM : 0;
};
/** Vrai si l'emprise inner est dans outer. */
export const within = (inner, outer) => !!outer && inner.w >= outer.w && inner.e <= outer.e && inner.s >= outer.s && inner.n <= outer.n;
/** Emprise box ramenée au même tour du monde que la route (la vue peut être sur une autre copie du monde). */
function alignBox(box, route) {
  if (!route?.length) return box;
  const lons = route.map(p => +p.lon),
    k = 360 * Math.round(((Math.min(...lons) + Math.max(...lons)) / 2 - (box.w + box.e) / 2) / 360);
  return k ? {
    ...box,
    w: box.w + k,
    e: box.e + k
  } : box;
}
/** Emprise aux longitudes continues → emprises [ouest, sud, est, nord] dans [-180, 180] : une, ou deux si elle passe la ligne
 *  de changement de date ; le monde entier au-delà de 360°. */
function wrapBoxes(b) {
  if (b.w >= -180 && b.e <= 180) return [
    [b.w, b.s, b.e, b.n]
  ];
  if (b.e - b.w >= 360) return [
    [-180, b.s, 180, b.n]
  ];
  const w = wrapLon(b.w),
    e = w + (b.e - b.w);
  return e <= 180 ? [
    [w, b.s, e, b.n]
  ] : [
    [w, b.s, 180, b.n],
    [-180, b.s, e - 360, b.n]
  ];
}
/** Emprises du couloir de la route (marge nm NM), une par tronçon, coupées à box puis ramenées à [-180, 180]. */
export function corridorBoxes(route, nm, box) {
  const out = [];
  for (let i = 1; i < route.length; i++) {
    const b = MapsRender.bboxOf([route[i - 1], route[i]], nm),
      c = box ? {
        w: Math.max(box.w, b.w),
        s: Math.max(box.s, b.s),
        e: Math.min(box.e, b.e),
        n: Math.min(box.n, b.n)
      } : b;
    if (c.w <= c.e && c.s <= c.n) out.push(...wrapBoxes(c));
  }
  return out;
}
/** La clé d'une réponse d'aerodb (refonte R-M2) : deux copies gelées d'une même chose (lue par deux emprises du couloir) ont la même ;
 *  l'espace par son type, sa clé, son nom, ses limites et son premier point, le tronçon de voie par sa route et ses bouts, le terrain par son code, un point par son identifiant et sa
 *  place, une ville par son nom et sa place ; à défaut, l'objet lui-même. */
const at4 = x => `${(+x.lat).toFixed(4)},${(+x.lon).toFixed(4)}`;
export function keyOf(x) {
  if (!x || typeof x !== 'object') return x;
  if (x.route && x.a && x.b) return `aw:${x.route}|${x.a.id ?? at4(x.a)}|${x.b.id ?? at4(x.b)}`;
  // la clé du SIA n'est pas unique (« LF600 » : une zone SUR et une PRN) : avec le type, les limites et le premier point
  if (x.rings) return `as:${x.type}|${x.key ?? ''}|${x.name ?? ''}|${x.lower}|${x.upper}|${x.rings[0]?.[0]?.join(',') ?? ''}`;
  if (x.icao && Number.isFinite(+x.lat)) return `ad:${x.icao}`;
  if (x.id && Number.isFinite(+x.lat)) return `pt:${x.id}@${at4(x)}`;
  if (x.name && Number.isFinite(+x.lat)) return `nm:${x.name}@${at4(x)}`;
  return x;
}
/** Réunion sans doublons (par keyOf) des réponses d'une requête aerodb sur plusieurs emprises ; extra : les autres champs de la
 *  requête. */
export async function many(f, boxes, extra = {}) {
  const seen = new Set(),
    out = [];
  for (const bbox of boxes)
    for (const x of await f({
        bbox,
        ...extra
      })) {
      const k = keyOf(x);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(x);
      }
    }
  return out;
}
/** Éléments de l'emprise box selon le profil : { box, corridor, data, empty }. Espaces et voies lus pour le couloir de la
 *  route, tronçon par tronçon, quand corridor (NM, corridorFor) n'est pas nul (SPEC § 5). */
async function loadData(box, corridor = 0) {
  const A = S.ctx.aerodb;
  if (!A) return {
    box: {
      w: Math.min(-180, box.w),
      e: Math.max(180, box.e),
      s: -85,
      n: 85
    },
    data: {},
    empty: true
  };
  const route = [...S.route.points, ...(S.route.altn ? [S.route.altn] : [])],
    bboxes = wrapBoxes(alignBox(box, route)),
    p0 = S.profile,
    p = +p0.corridorNm === corridor ? p0 : {
      ...p0,
      corridorNm: corridor
    },
    E = p.elements,
    boxes = +p.corridorNm > 0 ? corridorBoxes(route, +p.corridorNm + 2, alignBox(box, route)) : bboxes,
    t0 = performance.now();
  const [airspaces, aerodromes, navaids, airways, moraCells, obstacles, cities, vrp, points] = await Promise.all([
    many(A.airspaces, boxes),
    E.aerodromes ? many(A.aerodromes, bboxes) : [],
    E.navaids ? many(A.navaids, bboxes) : [],
    E.airwaysLow || E.airwaysHigh ? many(A.airways, boxes) : [],
    E.mora ? many(A.moraCells, bboxes) : [],
    E.obstacles ? many(A.obstacles, bboxes, {
      minHgt: +E.obstacleMin || 300
    }) : [],
    p.cities || E.agglos ? many(A.cities, bboxes, {
      n: 400
    }) : [],
    // un point par code et par lieu (la base SIA le publie deux fois)
    E.vrpPoints ? Promise.resolve(many(A.vrp, bboxes)).then(l => MapsRender.dedupeVrp(l)) : [],
    E.rnavPoints ? many(A.points, bboxes) : []
  ].map(x => Promise.resolve(x).catch(() => [])));
  // axes de ravitaillement et tracks NAT : lus après les zones de la vue (SPEC § 6.3)
  const [aar, nat] = await Promise.all([E.aarTracks && A.aarTracks ? A.aarTracks() : [], E.natTracks && A.natTracks ? A.natTracks() : []]
    .map(x => Promise.resolve(x).catch(() => [])));
  // couche « Autres espaces » : les types présents hors des trois familles, ajoutés au choix du profil
  const pz = p.otherZones ? {
    ...p,
    zones: [...(p.zones || []), ...new Set(airspaces.map(a => a.type).filter(t => groupOf(t) === 'asOther'))]
  } : p;
  performance.measure('maps:load', {
    start: t0
  });
  return {
    box,
    corridor,
    data: {
      airspaces: MapsRender.selectAirspaces(airspaces, pz, route),
      // les espaces de la surface au plafond (FIR, SIV…) : écartés de la coupe et de la liste, nommés dans « Aussi ici »
      flat: airspaces.filter(a => window.SiaAero?.surfaceToCeiling?.(a)),
      aerodromes,
      navaids,
      airways,
      moraCells,
      obstacles,
      cities,
      vrp,
      points,
      aar,
      nat
    },
    empty: !airspaces.length && !aerodromes.length && !navaids.length
  };
}
/** Relit les éléments pour l'emprise b (une lecture à la fois ; la dernière demandée gagne). */
export async function refresh(b, corridor = 0) {
  if (!S || S.loadingFor) {
    if (S) S.pending = [b, corridor];
    return;
  }
  S.loadingFor = b;
  try {
    // lecture en échec : rien cette fois, relue quand la vue sort de b
    const got = await loadData(b, corridor).catch(() => ({
      box: b,
      corridor,
      data: {},
      empty: true
    }));
    if (!S) return;
    S.data = got;
    status();
    legendSync(); // la puce « i » dit une lecture autour du vol seulement
  } finally {
    if (S) {
      S.loadingFor = null;
      const next = S.pending;
      S.pending = null;
      if (next && (!within(next[0], S.data?.box) || next[1] !== S.data?.corridor)) refresh(...next);
      else schedule();
    }
  }
}
