// V3 maps — ce que la Carte lit (modules/maps/SPEC.md § 2.1, § 5, § 6.8) : le vol courant (points, niveau, dégagement), les
// données aéronautiques d'aerodb pour l'emprise utile (couloir de la route, vue rapprochée), les réglages de l'appareil et
// de la compagnie ; la vue vivante (chaque écriture du vol redessine, une version plus ancienne n'est jamais reprise).

import {
  S,
  keep,
  tt,
  flightPath,
  flownPts
} from './state.js';
import {
  TX
} from './texts.js';
import {
  wrapLon,
  nearLon,
  unwrapLons
} from '../../frame/lib/geo.js';
import {
  expandedPath,
  flownPath,
  loadProcedures,
  proceduresOf,
  routeBase
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
  frameFlight,
  flightSig
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
import {
  followMission,
  gainMission
} from './mission_view.js';

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
    updated: f?.updated_at || '',
    base: routeBase(f) // la route et le niveau tels que la Carte les a lus : ce qu'elle écrit, c'est ce qu'elle en a changé (SOG-0013)
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
      ...(+f?.route?.holds?.[p.id]?.count > 0 ? {
        hold: Math.min(1440, Math.round(+f.route.holds[p.id]
          .count)), // le temps sur zone compté à ce point, en minutes (Carburant l'écrit, la Carte le lit : route.holds, § 1 bis)
        ...(typeof f.route.holds[p.id].name === 'string' && /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,23}$/.test(f.route.holds[p.id].name
          .trim()) ? {
          holdName: f.route.holds[p.id].name.trim() // le nom du point dans la mission (« PT1 »)
        } : {})
      } : {}),
      ...(i > 0 && typeof p.via === 'string' && /^[A-Z]{1,2}\d{1,4}[A-Z]?$/i.test(p.via) ? {
        via: p.via
          .toUpperCase() // la voie aérienne qui mène à ce point (le tronçon d'avant, SOG-0095) ; sans elle, le tronçon est direct
      } : {}),
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
  S.marksPts = flownPts(); // les marques NM sont refaites au dessin, au pas rond de ce qui est visible (viewMarks)
  S.marks = MapsRender.marks(S.marksPts);
}
/** La couche des routes NAT est affichée : leur validité est lue (aerodb natState : rien n'est demandé au réseau) et dite dans les notes ; périmées, le lanceur du poste est prié de les relire
 *  (natEnsure : une fois, jamais de minuterie), puis les tracés sont relus (SOG-0266 ; contrat frame/aerodb/INTEGRATION.md, SOG-0263). Une fois par montage de la Carte. */
export async function natCheck() {
  const A = S?.ctx.aerodb;
  if (!A?.natState || S.natAsked) return;
  S.natAsked = true;
  const me = S,
    say = st => {
      S.natNote = !st?.present ? '' : st.expired === true ? tt(TX.natExpired) : st.validUntil ? tt(TX.natValid, {
        d: new Date(st.validUntil).toISOString().slice(8, 10) + '/' + new Date(st.validUntil).toISOString().slice(5, 7) + ' ' +
          new Date(st.validUntil).toISOString().slice(11, 16) + 'Z'
      }) : '';
      status();
    };
  try {
    let st = await A.natState();
    if (S !== me) return;
    say(st);
    if (A.natEnsure && st?.expired !== false) {
      const r = await A.natEnsure();
      if (S !== me) return;
      say(r);
      if (r?.refreshed && r.ok) { // les routes ont été relues : les tracés de la vue aussi
        invalidate();
        schedule();
      }
    }
  } catch {
    /* sans état : rien n'est dit */
  }
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
/** Le chemin a changé (procédures arrivées ou retirées) : refait, l'emprise du vol avec lui (recadrée tant que l'utilisateur n'a
 *  pas bougé la carte), puis la carte et le profil redessinés. */
function afterPath() {
  buildPath();
  S.fit = fitOf();
  if (S.map && !S.userMoved) frameFlight(false);
  header(); // la distance du titre : celle du chemin, procédures comprises, comme Carburant et l'axe de la coupe
  schedule();
  buildProfile();
}
/** L'emprise du vol que la carte cadre (SPEC § 5, retour cadré) : imposée (viewOf), sinon le chemin déployé — la route et ses
 *  procédures choisies — et le dégagement, à 25 NM ; sinon l'Europe de l'Ouest. */
function fitOf() {
  const pts = S.route.path?.length ? S.route.path : S.route.points;
  return viewOf() || MapsRender.bboxOf([...pts, ...(S.route.altn ? [S.route.altn] : [])], 25) || {
    w: -5,
    s: 41,
    e: 10,
    n: 51.5
  };
}
/** Les directs sur instruction du contrôle du vol (SOG-0326) : [{ lost, from, to }] — lost : le trajet abandonné, de l'ancre du direct
 *  (`from`) par les points sautés jusqu'à celui où la route reprenait ; from → to : le direct (to : le point demandé, retrouvé dans les
 *  points de la route par son nom). Contrat avec Carburant (route.directs[i].trail, écrit au direct, lu ici seulement) :
 *  `trail: { from: { lat, lon }, dropped: [{ lat, lon }…], rejoin: { lat, lon } }`. Un direct sans trace (vol d'avant), au point
 *  disparu de la route ou aux nombres hors bornes ne se dessine pas ; les 20 derniers, 60 points sautés au plus ; longitudes
 *  continues avec celles du point demandé. Calculé une fois par vol lu (S.route.trails). */
export function directTrails(route) {
  if (route?.trails) return route.trails;
  const list = Array.isArray(route?.flight?.route?.directs) ? route.flight.route.directs.slice(-20) : [],
    ok = q => q && Number.isFinite(+q.lat) && Number.isFinite(+q.lon) && Math.abs(+q.lat) <= 90 && Math.abs(+q.lon) <= 360,
    out = [];
  for (const d of list) {
    const t = d?.trail,
      id = String(d?.to || '').toUpperCase(),
      to = id && (route.points || []).find(p => String(p.id || '').toUpperCase() === id || String(p.mission || '').toUpperCase() === id);
    if (!ok(to) || !ok(t?.from) || !ok(t?.rejoin) || !Array.isArray(t.dropped) || t.dropped.length > 60 || !t.dropped.every(ok)) continue;
    const at = q => ({
      lat: +q.lat,
      lon: nearLon(+q.lon, +to.lon)
    });
    out.push({
      lost: [t.from, ...t.dropped, t.rejoin].map(at),
      from: at(t.from),
      to: {
        lat: +to.lat,
        lon: +to.lon
      }
    });
  }
  if (route) route.trails = out;
  return out;
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
  if (S?.missionAside)
    followMission(); // le vol ne nomme plus la mission : la Carte la quitte (SOG-0251) ; pas attendu : applyFlight est appelé par des passages de la file (leaveProvided), qui s'attendraient eux-mêmes
  if (S?.missionId) return; // une carte fournie est montrée sur place (SOG-0196) : le vol relu ne prend pas sa place
  const me = S, // ce montage : un vol lu après un remontage n'est pas posé dans le suivant (D172)
    route = await readFlight();
  if (S !== me || !route) return; // quittée pendant la lecture : rien n'est posé sur un état démonté
  S.route = route;
  if (S.procs && !isChosen(S.route.flight)) S.procs = null; // le choix est vidé : le chemin redevient la route tout de suite
  buildPath();
  loadProcs();
  S.profile = effectiveProfile();
  const all = [...S.route.points, ...(S.route.altn ? [S.route.altn] : [])];
  S.fit = fitOf();
  invalidate();
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
  if (keep.cam && keep.cam.sig !== flightSig()) keep.cam = null; // un autre vol : le cadrage gardé ne le suit pas
  if (S.map && (!live || other || (!S.userMoved && !inView()))) frameFlight(false);
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
      if (S
        ?.missionAside
      ) { // le vol ne nomme plus la mission (même route, seul le champ a changé) : la Carte la quitte ; une carte fournie montrée sur place n'est pas remplacée par le vol relu (SOG-0251)
        const left = followMission();
        if (S.missionId) return left;
      }
      const f = await S?.ctx.data.get(flightPath()).catch(() => null);
      // le vol vient de nommer une mission (« Préparer ce vol » avec la Carte à côté) : la fenêtre n'attend pas un remontage (SOG-0312) ; pas attendu, la lecture est longue
      if (S && !S.missionAside && !S.missionId && typeof f?.mission === 'string' && f.mission.trim() && f.mission.trim() !== S
        .missionWanted) gainMission();
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
  const me = S,
    seq = me.settingsSeq = (me.settingsSeq || 0) +
    1, // deux changements de suite (14 puis 30) lancent deux lectures : la plus récente seule pose ses valeurs, jamais la plus lente d'avant (D58 rouge sous charge : « an out-of-range value is 11 »)
    live = () => S === me && me.settingsSeq === seq;
  const P = await S.ctx.data.get('airline/map_profiles.json').catch(() => null);
  if (!S) return; // la Carte a été quittée pendant la lecture
  const F = await S.ctx.data.get(`pilot/${S.ctx.identity?.trigram || 'ANON'}/fuel.json`).catch(() => null);
  if (!live()) return; // quittée, ou une lecture plus récente est partie : ses valeurs sont les bonnes
  S.repoProfiles = P?.profiles && typeof P.profiles === 'object' ? P.profiles : null;
  // seuil de zoom des vecteurs de piste (V3 § 10.30 ; Réglages › Administration ; frame/settings/INTEGRATION.md § 4)
  const z = P?.runwayZoom;
  S.runwayZoom = Number.isInteger(z) && z >= 8 && z <= 16 ? z : RUNWAY_ZOOM;
  // l'unité d'altitude : le réglage d'affichage de l'appareil (cache/fuel/display.json, lecture seule), sinon celui du pilote (fuel.json) sur un appareil où Carburant n'a pas encore tourné
  const D = await S.ctx.data.get('cache/fuel/display.json').catch(() => null);
  if (!live()) return;
  S.altUnit = (D?.displayAlt ?? F?.displayAlt) === 'm' ? 'm' : 'ft';
}
/** Réglages de l'écran gardés sur cet appareil (cache/maps/ui.json) : mode et couches par mode (seulement ce qui diffère des
 *  valeurs de départ, SPEC § 6.7). */
export const saveUi = () => S.ctx.data.put('cache/maps/ui.json', {
  preset: S.preset,
  layers: S.layers || {},
  mission: S.mthemes || {} // la vue retenue par carte de mission (SOG-0171) : « <mission>|<fichier> » → vfr | ifr | base | yaml
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
/** Emprise des données à lire pour la vue montrée : la vue élargie de 15 %. (Jusqu'à SOG-0169 une vue d'ensemble lisait l'emprise de la route
 *  seule : les grandes familles d'espaces de la vue n'y étaient pas lues, et l'affichage dépendait de la route et non du zoom.) */
export const wantBox = shown => enlarge(shown, .15);
/** Largeur (NM) au-delà de laquelle la vue n'est lue qu'autour du vol, même « Autour du vol seulement » décochée (garde-fou d'une
 *  vue continent : la puce « i » le dit) ; marge du couloir alors imposé. */
export const WIDE_NM = 600;
/** Au-delà, la vue est « le monde » (SOG-0156) : les barbules de vent ne se dessinent pas (illisibles à cette échelle, et une route de
 *  plusieurs milliers de NM ferait lire et calculer toute une grille pour rien) ; le coût d'une image ne dépend pas de la longueur de la route. */
export const WORLD_NM = 3000;
const FORCED_NM = 10;
/** Largeur d'une emprise en NM, à sa latitude moyenne. */
export const widthNm = b => (b.e - b.w) * 60 * Math.cos((b.s + b.n) / 2 * Math.PI / 180);
/** Couloir de lecture (NM ; 0 : toute l'emprise) : « Autour du vol seulement » cochée, hors vue rapprochée (300 px par degré et
 *  plus : toute l'emprise est lue) ; décochée, toute la vue filtrée par la complexité, sauf au-delà de WORLD_NM de large (couloir
 *  imposé). Jamais sur une carte de mission. */
export const corridorFor = (shown, W) => {
  const nm = +S.profile?.corridorNm || 0;
  if (nm > 0) return W / Math.max(1e-6, shown.e - shown.w) < 300 ? nm : 0;
  return !S.missionId && S.route.points.length > 1 && widthNm(shown) > WORLD_NM ? FORCED_NM :
    0; // le dernier garde-fou : l'échelle du monde (SOG-0246) ; la case décochée lit toute la vue sinon
};
/** Vrai si l'emprise inner est dans outer. */
/** Les données de la vue sont à relire (une part d'aerodb arrivée, un autre vol, un autre profil, d'autres réglages) : la lecture
 *  suivante les remplace d'un coup ; celles qui sont montrées restent jusque-là — jamais une image sans elles (le clignotement au
 *  premier affichage, retour de l'utilisateur du 1/11 : une remise à zéro par arrivée). */
export function invalidate() {
  if (S) S.dataGen = (S.dataGen || 0) + 1;
}
/** Vrai si les données montrées sont de la dernière génération (invalidate). */
export const fresh = () => !!S?.data && (S.data.gen || 0) === (S.dataGen || 0);
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
/** Les points d'un tronçon a → b à la suite, en pas d'au plus stepNm NM le long de la loxodromie (le trait de la carte : droit en Mercator, longitude et
 *  latitude croissante interpolées linéairement) ; a et b compris. */
function legPieces(a, b, stepNm) {
  const rad = Math.PI / 180,
    psi = la => Math.log(Math.tan(Math.PI / 4 + Math.max(-85, Math.min(85, la)) * rad / 2)),
    unpsi = p => (2 * Math.atan(Math.exp(p)) - Math.PI / 2) / rad,
    dLat = (b.lat - a.lat) * 60,
    dLon = (b.lon - a.lon) * 60 * Math.cos((a.lat + b.lat) / 2 * rad),
    k = Math.max(1, Math.ceil(Math.hypot(dLat, dLon) / stepNm)),
    out = [];
  for (let i = 0; i <= k; i++) {
    const t = i / k;
    out.push(i === 0 ? a : i === k ? b : {
      lat: unpsi(psi(a.lat) + (psi(b.lat) - psi(a.lat)) * t),
      lon: a.lon + (b.lon - a.lon) * t
    });
  }
  return out;
}
/** Emprises du couloir de la route (marge nm NM), coupées à box puis ramenées à [-180, 180] : UN rectangle PAR MORCEAU de tronçon, jamais celui de la route ni d'un long
 *  tronçon entier (SOG-0246 : « un rectangle de 4500nm de côté, ça donne deux pays de hauteur » — le rectangle d'un tronçon de l'Atlantique couvre le Maroc et le Canada) ;
 *  un tronçon est coupé en morceaux d'au plus max(100 NM, la route / 48), le même couloir pour toutes les couches (aerodb : espaces, terrains, balises, voies, MORA, obstacles,
 *  villes, points). */
export function corridorBoxes(route, nm, box) {
  const out = [],
    legs = [];
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1],
      b = route[i];
    if (!Number.isFinite(a?.lat) || !Number.isFinite(b?.lat)) continue;
    legs.push([a, b]);
    total += Math.hypot((b.lat - a.lat) * 60, (b.lon - a.lon) * 60 * Math.cos((a.lat + b.lat) / 2 * Math.PI / 180));
  }
  const step = Math.max(100, total / 48);
  for (const [a, b] of legs) {
    const pts = legPieces(a, b, step);
    for (let i = 1; i < pts.length; i++) {
      const bb = MapsRender.bboxOf([pts[i - 1], pts[i]], nm),
        c = box ? {
          w: Math.max(box.w, bb.w),
          s: Math.max(box.s, bb.s),
          e: Math.min(box.e, bb.e),
          n: Math.min(box.n, bb.n)
        } : bb;
      if (c.w <= c.e && c.s <= c.n) out.push(...wrapBoxes(c));
    }
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
/** Ce qu'une lecture d'aerodb a rendu, gardé le temps de la page (la coupe aussi s'en sert : profile_view.js) (SOG-0349 : « cocher ou décocher une couche ne redemande rien de ce qui est déjà sur l'appareil ») : par couche, emprises et
 *  paramètres ; vidé quand la base change (S.dataEpoch, module.js). Une lecture en échec n'est JAMAIS gardée ni prise pour « rien » : FAILED, et l'appelant garde ce qu'il montrait. */
export const FAILED = Symbol('failed');
/** Des zones sont-elles encore en lecture (aerodb.readStatus, SOG-0349) ? Une réponse faite alors est PARTIELLE : une part en attente ou illisible n'est pas « absente ». */
const pendingNow = () => (S?.ctx?.aerodb?.readStatus?.()?.pending || 0) > 0;
/** Réunion sans doublons (keyOf) : ce qui est déjà montré et la part qui arrive. */
const union = (a, b) => {
  const seen = new Set(),
    out = [];
  for (const x of [...(a || []), ...(b || [])]) {
    const k = keyOf(x);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(x);
    }
  }
  return out;
};
export async function readOnce(name, f, boxes, extra) {
  const memo = S.dataMemo ||= new Map(),
    last = S.dataLast ||= new Map(),
    k = `${S.dataEpoch || 0}|${name}|${JSON.stringify(boxes)}|${JSON.stringify(extra || {})}`;
  if (memo.has(k)) return memo.get(k);
  let v;
  try {
    v = await many(f, boxes, extra);
  } catch {
    return FAILED;
  }
  if (
    pendingNow()
  ) { // réponse partielle : elle S'AJOUTE à ce qui est montré, elle ne le remplace pas, et n'est pas gardée (la part qui arrive la complétera)
    v = union(last.get(name), v);
    last.set(name, v);
    return v;
  }
  last.set(name, v);
  memo.set(k, v);
  if (memo.size > 80) memo.delete(memo.keys().next().value);
  return v;
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
  const prev = S.data?.data || {},
    failed = []; // les couches dont la lecture a échoué : ce qui était montré reste
  const read = async (name, on, f, extra) => {
    if (!on) return [];
    const v = await readOnce(name, f, boxes, extra);
    if (v === FAILED) {
      failed.push(name);
      return prev[name] || []; // ce qui était montré reste : un échec ne vide jamais la carte (SOG-0349)
    }
    return v;
  };
  const [airspaces, aerodromes, navaids, airways, moraCells, obstacles, cities, vrp0, points] = await Promise.all([
    read('airspaces', true, A.airspaces),
    // « Autour du vol seulement » cochée : TOUT ce qui est lu autour du plan l'est dans le couloir de la route (SOG-0246 : les terrains, balises, MORA, obstacles, villes, VRP et points RNAV se lisaient sur toute
    // la vue) ; décochée, toute la vue (boxes vaut bboxes sans couloir)
    read('aerodromes', E.aerodromes, A.aerodromes),
    read('navaids', E.navaids, A.navaids),
    read('airways', E.airwaysLow || E.airwaysHigh, A.airways),
    read('moraCells', E.mora, A.moraCells),
    read('obstacles', E.obstacles, A.obstacles, {
      minHgt: +E.obstacleMin || 300
    }),
    read('cities', p.cities || E.agglos, A.cities, {
      n: 400
    }),
    read('vrp', E.vrpPoints, A.vrp),
    read('points', E.rnavPoints, A.points)
  ]);
  // un point par code et par lieu (la base SIA le publie deux fois)
  const vrp = E.vrpPoints && failed.indexOf('vrp') < 0 ? MapsRender.dedupeVrp(vrp0) : vrp0;
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
    empty: !airspaces.length && !aerodromes.length && !navaids.length,
    failed
  };
}
/** Relit les éléments pour l'emprise b (une lecture à la fois ; la dernière demandée gagne). */
export async function refresh(b, corridor = 0) {
  if (!S || S.loadingFor) {
    if (S) S.pending = [b, corridor];
    return;
  }
  S.loadingFor = b;
  const gen = S.dataGen || 0; // une arrivée pendant la lecture : relue après (fresh() faux), jamais une remise à zéro
  try {
    // lecture en échec : rien cette fois, relue quand la vue sort de b
    const got = await loadData(b, corridor).catch(() => null);
    if (!S) return;
    if (!got) { // lecture en échec : ce qui est montré reste (SOG-0349), la vue est relue quand elle sort de ce qu'elle a
      S.loadFailedAt = Date.now();
      return;
    }
    S.data = {
      ...got,
      gen
    }; // remplacées d'un coup : l'image suivante a toutes les nouvelles
    status();
    legendSync(); // la puce « i » dit une lecture autour du vol seulement
  } finally {
    if (S) {
      S.loadingFor = null;
      const next = S.pending;
      S.pending = null;
      if (next && (!within(next[0], S.data?.box) || next[1] !== S.data?.corridor || !fresh())) refresh(...next);
      else schedule();
    }
  }
}
