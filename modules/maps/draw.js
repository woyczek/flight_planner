// V3 maps — dessin de la carte (modules/maps/SPEC.md § 5, § 6) : la surcouche aéronautique sur son canvas, par-dessus
// MapLibre ou le fond uni, un dessin par tour d'animation ; la projection de la vue (copies du monde, ligne de changement de
// date), la taille du fond MapLibre, le relief ombré, les noms de lieux du fond, TOC / TOD, le curseur commun, les
// procédures. Les données de la vue sont relues (data.js) quand la vue sort de celles chargées.

import {
  drawAlts
} from './alts.js';
import {
  canvasDpr
} from './canvas_scale.js';
import {
  S,
  got,
  onMission,
  level,
  tileLoader,
  keptRoute,
  greatCircle,
  thinPx
} from './state.js';
import {
  nearLon
} from '../../frame/lib/geo.js';
import {
  mapSize as baseSize,
  setBottomInset,
  loadOutlines as baseOutlines,
  plainView,
  drawPlain,
  COVER_ZOOM
} from './lib/map_base.js';
import {
  layersNow,
  detailShift
} from './layers.js';
import {
  refresh,
  wantBox,
  corridorFor,
  within,
  fresh,
  widthNm,
  WORLD_NM
} from './data.js';
import {
  status
} from './screen.js';
import {
  withEta,
  drawProgress,
  isStarted
} from './flight_time.js';
import {
  drawVfr,
  vfrVrpIds
} from './vfr.js';
import {
  drawWinds
} from './tips.js';
import {
  groundLayout,
  groundLight
} from './ground.js';
import {
  layout as procLayout,
  draw as drawProcs,
  drawLabels as drawProcLabels,
  runwayArrows,
  drawRunways,
  reserveRunways,
  wantDrawnRunways,
  routeLines
} from './procs.js';
import {
  covSync,
  covFlush
} from './coverage.js';
import {
  adTitle
} from '../../frame/lib/adnames.js';
import {
  chooseLayout,
  DIM
} from './choose.js';
import {
  lightPaths,
  drawLight,
  sameSrc
} from './light.js';

// ---------------------------------------------------------------- l'ordonnanceur : trois états (refonte R-M3)
// (V3 maps, 30 octobre : « déplacement de carte sur la région de Paris : très saccadé », puis « le freeze de refresh est efficace
// pour la fluidité, mais gênant pour se déplacer : un intermédiaire ? ») — rest : un dessin complet par tour d'animation quand il est
// demandé ; move : un geste — les demandes de dessin complet attendent, l'image du dernier dessin complet est copiée au premier
// mouvement, puis au plus un dessin léger toutes les LIGHT_MS (traits seuls, light.js : rien d'étiqueté, aucune collision), la
// copie translatée et mise à l'échelle par ses deux coins géographiques entre deux ; un dessin léger de plus de LIGHT_MAX_MS sur cette
// base rend la main à la copie seule pour le reste du geste ; settle : fin du geste (150 ms sans mouvement), retour à rest et le
// dessin complet (étiquettes, vecteurs, collisions, lectures), les demandes faites pendant le geste comprises
const REST_MS = 150,
  LIGHT_MS = 120,
  LIGHT_MAX_MS = 8;
/** L'état de l'ordonnanceur : state, la case du tour d'animation (raf, kind : 'full' l'emporte sur 'move'), la minuterie du repos,
 *  le dernier dessin léger et s'il reste permis pour ce geste. */
const sched = {
  state: 'rest',
  raf: 0,
  kind: null,
  rest: 0,
  lastLight: 0,
  lightOn: false
};
/** Une seule case de tour d'animation pour tous les dessins ; une demande complète l'emporte sur un mouvement déjà demandé. */
function tick(kind) {
  if (sched.raf) {
    if (kind === 'full') sched.kind = 'full';
    return;
  }
  sched.kind = kind;
  sched.raf = requestAnimationFrame(() => {
    const k = sched.kind;
    sched.raf = 0;
    sched.kind = null;
    if (!S) return;
    if (k === 'full' || !S.map || !S.frame?.bmp || !S.lightSrc)
      return draw(); // pas de source du dessin léger (carte de mission, route vide) : le dessin complet
    // le dessin léger reprend les listes du dernier dessin complet, tracées aux seuils de SON zoom : un geste qui change de zoom d'un demi-niveau ou plus (pincer, molette) les
    // ferait paraître à un autre zoom que le fond (SOG-0173 : « comme si le quart haut gauche avait un autre niveau de zoom ») : la copie de l'image seule, jusqu'au repos
    if (sched.lightOn && performance.now() - sched.lastLight >= LIGHT_MS && Math.abs(S.map.getZoom() - (S.lightZoom ?? S.map
        .getZoom())) < .5) light();
    else follow();
  });
}
/** Demande un dessin complet au prochain tour d'animation ; pendant un geste, la demande attend le repos (un survol, une lecture
 *  qui aboutit ne relancent pas tout le dessin au milieu d'un pan). */
export const schedule = () => {
  if (S && sched.state === 'rest') tick('full');
};
/** Dessin demandé abandonné (démontage) : l'ordonnanceur revient au repos. */
export function cancelDraw() {
  if (sched.raf) cancelAnimationFrame(sched.raf);
  clearTimeout(sched.rest);
  Object.assign(sched, {
    state: 'rest',
    raf: 0,
    kind: null,
    rest: 0,
    lightOn: false
  });
}
/** La carte bouge (événement « move » de MapLibre) : au premier mouvement d'un geste, l'image du dernier dessin complet est copiée
 *  et le dessin léger permis s'il y a de quoi ; au prochain tour d'animation, un dessin léger s'il est dû, sinon la copie suit ; le
 *  dessin complet attend le repos. Sans dessin complet encore (fond uni, premier dessin), le dessin complet tout de suite. */
export function moving() {
  clearTimeout(sched.rest);
  sched.rest = setTimeout(settle, REST_MS);
  if (!S?.map || !S.frame?.ok) return tick('full');
  if (sched.state !== 'move') {
    sched.state = 'move';
    copyFrame();
    sched.lightOn = !!S.lightSrc;
  }
  tick('move');
}
/** Les marques NM de la route au pas rond de ce qui est visible (SOG-0177) : 5, 10, 25, 50, 100, 250, 500, 1 000, 2 500 NM, le plus petit qui laisse
 *  au plus une douzaine de marques sur la part de la route dans la vue ; refaites seulement quand le pas change. */
function viewMarks(box) {
  const pts = S.marksPts;
  if (!pts || pts.length < 2) return S.marks || [];
  const d = MapsRender.distances(pts),
    mw = (box.e - box.w) * .1,
    mh = (box.n - box.s) * .1;
  // la part de la route dans la vue, mesurée le long de la loxodromie de chaque tronçon (la droite de la carte : un tronçon de 2 500 NM dont le milieu est hors de la vue compte pour ce qui
  // en est vu, le pas ne saute plus, les marques ne disparaissent plus brutalement en dézoomant, SOG-0233 ; le chemin d'un direct est la loxodromie, SOG-0243) : le segment est rogné par la
  // vue en coordonnées de Mercator, où il est droit, et la longueur gardée est la part de latitude retenue (la distance d'une loxodromie lui est proportionnelle)
  const psi = lat => Math.log(Math.tan(Math.PI / 4 + Math.max(-89.9, Math.min(89.9, lat)) * Math.PI / 360)),
    unpsi = y => (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180 / Math.PI,
    lim = [box.w - mw, box.e + mw, psi(box.s - mh), psi(box.n + mh)];
  let vis = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1],
      b = pts[i],
      len = d[i] - d[i - 1],
      ay = psi(a.lat),
      dx = b.lon - a.lon,
      dy = psi(b.lat) - ay;
    let t0 = 0,
      t1 = 1;
    for (const [pp, qq] of [
        [-dx, a.lon - lim[0]],
        [dx, lim[1] - a.lon],
        [-dy, ay - lim[2]],
        [dy, lim[3] - ay]
      ]) {
      if (Math.abs(pp) < 1e-12) {
        if (qq < 0) t1 = -1; // parallèle à ce bord et dehors
      } else {
        const r = qq / pp;
        if (pp < 0) t0 = Math.max(t0, r);
        else t1 = Math.min(t1, r);
      }
    }
    if (t1 <= t0) continue;
    const dLat = b.lat - a.lat,
      f = t => Math.abs(dLat) > 1e-9 ? (unpsi(ay + dy * t) - a.lat) / dLat : t;
    vis += len * Math.max(0, f(t1) - f(t0));
  }
  const step = [5, 10, 25, 50, 100, 250, 500, 1000, 2500].find(s => vis / s <= 12) || 5000;
  if (S.marksStep !== step || S.marksFor !== pts) {
    S.marks = MapsRender.marks(pts, step);
    S.marksStep = step;
    S.marksFor = pts;
  }
  return S.marks;
}
/** Le calque vidé : plus de route, donc plus de tracé, de listes de toucher ni de dessin léger à reprendre (le geste suivant ne ressuscite pas l'ancien). */
function blank() {
  const c = S.canvas,
    g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, c.width, c.height);
  S.lightSrc = null;
  S.lightPaths = null;
  S.frame = null;
  for (const k of ['awHits', 'zoneHits', 'adHits', 'navHits', 'vrpHits', 'altHits', 'windHits', 'vfrHits']) S[k] = [];
}
/** Le dessin léger (light.js) à la vue de la carte, gardé comme image à recopier jusqu'au suivant ; les chemins refaits seulement
 *  quand les listes du dernier dessin complet ont changé (mesure à part : maps:light:paths). */
function light() {
  if (!sameSrc(S.lightPaths?.src, S.lightSrc)) {
    performance.mark('maps:light:paths:start');
    S.lightPaths = lightPaths(S.lightSrc);
    performance.measure('maps:light:paths', 'maps:light:paths:start');
  }
  performance.mark('maps:light:start');
  const t0 = performance.now(),
    {
      W,
      H,
      dpr,
      mx,
      my,
      CW,
      CH
    } = sizeCanvas(),
    c = S.canvas,
    g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, c.width, c.height);
  // tout le canvas, débordement compris : la projection de la vue décalée de (mx, my)
  drawLight(g, S.lightPaths, {
    project: ll => {
      const q = S.map.project(ll);
      return {
        x: q.x + mx,
        y: q.y + my
      };
    },
    zoom: S.map.getZoom(),
    W: CW,
    H: CH,
    dpr,
    pal: MapsRender.palette(!!S.theme.dark),
    paper: S.theme.bg
  });
  groundLight(g, ll => { // les traits du sol seuls (§ 10.40, D68)
    const q = S.map.project(ll);
    return {
      x: q.x + mx,
      y: q.y + my
    };
  }, S.map.getZoom(), dpr);
  markFrame(W, H, mx, my);
  copyFrame();
  sched.lastLight = performance.now();
  performance.measure('maps:light', 'maps:light:start');
  if (sched.lastLight - t0 > LIGHT_MAX_MS) sched.lightOn = false; // trop lourd sur cette base : la copie seule pour le reste du geste
}
/** Repos (fin du geste, ou REST_MS sans mouvement) : retour à rest et le dessin complet, les demandes faites pendant le geste
 *  comprises. */
export function settle() {
  clearTimeout(sched.rest);
  if (!S) return;
  sched.state = 'rest';
  tick('full');
}
/** Recopie la dernière image complète là où ses deux coins géographiques sont maintenant (pan et zoom ; une rotation de la carte
 *  n'existe pas ici). */
function follow() {
  const F = S.frame,
    a = S.map.project(F.g0),
    b = S.map.project(F.g1),
    c = S.canvas,
    g = c.getContext('2d'),
    dpr = c.width / Math.max(1, F.W);
  performance.mark('maps:follow:start');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, c.width, c.height);
  g.drawImage(F.bmp, (a.x + (F.mx || 0)) * dpr, (a.y + (F.my || 0)) * dpr, (b.x - a.x) * dpr, (b.y - a.y) * dpr);
  performance.measure('maps:follow', 'maps:follow:start');
}
/** Note les deux coins géographiques de l'image qui vient d'être dessinée (le haut gauche et le bas droit de la carte) : deux
 *  unproject, rien n'est copié (l'image l'est au premier mouvement d'un geste, copyFrame). */
function markFrame(W, H, mx = 0, my = 0) {
  if (!S.map) return;
  const F = S.frame ||= {},
    p0 = S.map.unproject([-mx, -my]),
    p1 = S.map.unproject([W + mx, H + my]);
  F.g0 = [p0.lng, p0.lat];
  F.g1 = [p1.lng, p1.lat];
  F.W = W + 2 * mx; // la largeur CSS du canvas (débordement compris)
  F.mx = mx;
  F.my = my;
  F.ok = true;
}
/** Copie l'image de la carte (celle des coins notés par markFrame) pour qu'elle suive le geste. */
function copyFrame() {
  const F = S.frame,
    c = S.canvas;
  if (!F) return;
  const bmp = F.bmp ||= document.createElement('canvas');
  if (bmp.width !== c.width || bmp.height !== c.height) {
    bmp.width = c.width;
    bmp.height = c.height;
  }
  const g = bmp.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.drawImage(c, 0, 0);
}

// ---------------------------------------------------------------- fond uni : contours des pays
let outlinesP = null;
/** Contours des pays du fond uni (aerodb.zoneOutlines() du cadre), chargés au premier dessin sans tuiles ; la carte est redessinée
 *  quand ils arrivent (mer seule en attendant). */
const loadOutlines = () => outlinesP ||= baseOutlines(S.ctx.aerodb).then(() => S && schedule(), () => {
  outlinesP = null; // hors ligne sans copie : redemandé au dessin suivant
});

// ---------------------------------------------------------------- projection et taille
/** Débordement du dessin de chaque côté de la vue, en part de sa largeur et de sa hauteur : 0 depuis le 6 novembre 2026 (la règle de coût prime sur
 *  un confort non demandé : à 5 % le dessin au repos coûtait environ 1 ms de plus, à 10 % 2 à 5 ms, SPEC § 5). Le mécanisme reste (le canvas de la vue plus OVER de
 *  chaque côté, les étiquettes dans la vue seulement) : une valeur de .05 rend le déplacement sans « mur » vide (retour de l'utilisateur du 1/11). */
const OVER = 0;
/** Taille du canvas de surcouche (pixels de l'écran) : la vue W × H et son débordement mx, my de chaque côté → { W, H, dpr, mx, my, CW,
 *  CH } ; le canvas a CW × CH (W + 2 mx, H + 2 my) et commence à (−mx, −my) de la vue (le cadre le rogne). Il a la taille de son
 *  bitmap, jamais « 100 % » du cadre : pendant qu'un doigt tient la feuille, le cadre change de taille sans redessin et un bitmap
 *  étiré déformerait la route. */
function sizeCanvas() {
  const c = S.canvas,
    r = S.box.getBoundingClientRect(),
    W = Math.max(1, Math.round(r.width)),
    H = Math.max(1, Math.round(r.height)),
    mx = Math.round(W * OVER),
    my = Math.round(H * OVER),
    CW = W + 2 * mx,
    CH = H + 2 * my,
    dpr = canvasDpr(CW, CH); // bornée par la surface (SOG-0067)
  if (c.width !== Math.round(CW * dpr) || c.height !== Math.round(CH * dpr)) {
    c.width = Math.round(CW * dpr);
    c.height = Math.round(CH * dpr);
  }
  for (const [k, v] of [
      ['width', `${CW}px`],
      ['height', `${CH}px`],
      ['left', `${-mx}px`],
      ['top', `${-my}px`]
    ])
    if (c.style[k] !== v) c.style[k] = v;
  return {
    W,
    H,
    dpr,
    mx,
    my,
    CW,
    CH
  };
}
/** Le débordement (mx, my) ajouté à une projection de la vue : la projection du canvas. */
const shiftTo = (f, mx, my) => (lat, lon) => {
  const p = f(lat, lon);
  return {
    x: p.x + mx,
    y: p.y + my
  };
};
/** Rectangle ou point du canvas ramené à la vue (−mx, −my), ou l'inverse (k = −1) : x, y, x0, x1, y0, y1 quand ils y sont. */
const moved = (o, mx, my, k = 1) => {
  if (!o || typeof o !== 'object') return o;
  const out = {
    ...o
  };
  for (const a of ['x', 'x0', 'x1'])
    if (Number.isFinite(out[a])) out[a] -= k * mx;
  for (const a of ['y', 'y0', 'y1'])
    if (Number.isFinite(out[a])) out[a] -= k * my;
  return out;
};
/** Le placeur de la passe vu en coordonnées de la vue (les dessins de l'écran : procédures, choix, pistes) : leurs demandes
 *  décalées dans le canvas, les places rendues ramenées à la vue. */
const viewPlacer = (pl, mx, my) => !pl || !(mx || my) ? pl : {
  ask: req => {
    const got = pl.ask({
      ...req,
      boxes: (req.boxes || []).map(r => moved(r, mx, my, -1)),
      paint: req.paint && (r => req.paint(moved(r, mx, my)))
    });
    return got && moved(got, mx, my);
  },
  add: (r, rank) => pl.add(moved(r, mx, my, -1), rank),
  free: r => pl.free(moved(r, mx, my, -1)),
  take: r => pl.take(moved(r, mx, my, -1))
};
/** Emprise d'une vue élargie de sa part de débordement de chaque côté (le canvas). */
const widen = (b, fx, fy) => ({
  w: b.w - (b.e - b.w) * fx,
  e: b.e + (b.e - b.w) * fx,
  s: Math.max(-85, b.s - (b.n - b.s) * fy),
  n: Math.min(85, b.n + (b.n - b.s) * fy)
});
/** Étendue en longitude de la route déroulée (points et dégagement) : { w, e } ; null sans route. Gardée tant que les points
 *  ne changent pas. */
function routeSpan() {
  const r = S.route;
  if (!r?.points?.length) return null;
  if (r.span?.of !== r.points || r.span.altn !== r.altn || r.span.path !== r.path) {
    // les points des procédures choisies comptent aussi : une SID peut sortir de la route d'un degré ou deux
    const lons = [...r.points, ...(r.altn ? [r.altn] : []), ...(r.path || []).filter(p => p.lon != null && Number.isFinite(+p.lon))].map(
      p => +p.lon);
    r.span = {
      of: r.points,
      altn: r.altn,
      path: r.path,
      w: Math.min(...lons),
      e: Math.max(...lons)
    };
  }
  return r.span;
}
/** Projection ramenée à la copie du monde de la vue (centre c) : une longitude d'aerodb va à la copie la plus proche du centre,
 *  la route (déroulée) est décalée d'un même nombre de tours, jamais coupée en deux (SPEC § 6.9). raw : la projection brute. */
function wrapTo(raw, c) {
  const sp = routeSpan(),
    ro = sp ? 360 * Math.round((c - (sp.w + sp.e) / 2) / 360) : 0;
  return (lat, lon) => raw(lat, sp && lon >= sp.w && lon <= sp.e ? lon + ro : nearLon(lon, c));
}
/** Vue courante : { toC (projection de la vue), raw (projection brute : le fond uni dessine ses copies), shown (emprise
 *  affichée, continue autour du centre ; fond uni : Mercator sur l'emprise de la route) }. */
function view(W, H) {
  if (S.map) {
    const bb = S.map.getBounds(),
      raw = (lat, lon) => S.map.project([lon, lat]);
    return {
      toC: wrapTo(raw, S.map.getCenter().lng),
      raw,
      shown: {
        w: bb.getWest(),
        e: bb.getEast(),
        s: bb.getSouth(),
        n: bb.getNorth()
      }
    };
  }
  const v = plainView(S.fit, W, H, 12);
  return {
    ...v,
    raw: v.toC,
    toC: wrapTo(v.toC, (S.fit.w + S.fit.e) / 2)
  };
}
/** La route orthodromique (SOG-0145) : le grand cercle du départ à l'arrivée, dès que les deux terrains sont connus (les extrémités de la
 *  route, de ces codes), en points de la vue ; S.gc garde de quoi la montrer à l'infobulle (la longueur, les extrémités). Rien sur une
 *  carte de mission ni pendant le choix sur la carte. */
function gcScreen(mission, pick, toC) {
  S.gc = null;
  const r = S.route?.flight?.route,
    pts = S.route?.points || [],
    a = pts[0],
    b = pts.at(-1);
  if (mission || pick || pts.length < 2 || !r?.dep || !r?.arr || String(a.id || '').toUpperCase() !== String(r.dep).toUpperCase() ||
    String(b.id || '').toUpperCase() !== String(r.arr).toUpperCase()) return null;
  const g = greatCircle(a, b);
  if (!g) return null;
  const q = thinPx(g.pts.map(p => toC(p.lat, p.lon)));
  S.gc = {
    dep: r.dep,
    arr: r.arr,
    nm: g.nm,
    q
  };
  return q;
}
/** Projection courante pour un geste (toucher, survol), sans repasser par draw(). */
export function projNow() {
  return S.map ? wrapTo((lat, lon) => S.map.project([lon, lat]), S.map.getCenter().lng) : S.toC;
}
/** Part du bas du cadre de la carte que la feuille recouvre (px) : le sommet de la feuille contre le bas du cadre quand elle
 *  s'étend sur toute sa largeur (portrait) ; 0 quand la carte est au-dessus d'elle ou à côté (colonne paysage). */
function sheetOverlap() {
  const p = S?.dataEl,
    m = S?.mapEl;
  if (!p || !m || p.hidden) return 0;
  const a = p.getBoundingClientRect(),
    b = m.getBoundingClientRect();
  if (!(a.width && b.width) || a.left > b.left + 1 || a.right < b.right - 1) return 0;
  return Math.min(b.height, Math.max(0, b.bottom - a.top));
}
/** Fond MapLibre ramené à la taille du cadre s'il ne l'a plus (resize seulement dans ce cas, reconnu par isOwnResize), et
 *  marge du bas pour ses contrôles (au-dessus de la feuille) ; jamais pendant qu'un doigt tient la feuille (rien n'a changé
 *  de taille). Appelé à onSettle, au chargement et au changement de style, au retour de la page et à chaque dessin. */
export function mapSize() {
  const map = S?.map || S?.mapNew,
    r = baseSize(map, S?.mapEl);
  if (map) setBottomInset(map, sheetOverlap());
  return r;
}
/** Couleur de fond du style de la carte, posée sur son cadre (--mp-base) : la bande que le cadre montre quand la feuille
 *  descend, avant le redessin, est de la couleur de la carte. Écrite seulement si elle change. */
export function mapBase(map) {
  const bg = map.getStyle?.()?.layers?.find(l => l.type === 'background')?.paint?.['background-color'],
    v = typeof bg === 'string' ? bg : '';
  if (S.box.style.getPropertyValue('--mp-base') === v) return;
  if (v) S.box.style.setProperty('--mp-base', v);
  else S.box.style.removeProperty('--mp-base');
}

// ---------------------------------------------------------------- fond MapLibre : relief et noms de lieux
/** Tuiles d'altitude Terrarium (hôte de meta.net). */
const DEM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
/** Relief ombré (mode Topo, profil hillshade) : couche hillshade posée sous les libellés du fond, retirée hors du mode ; rien
 *  tant que le style n'est pas prêt (posée au chargement du style). */
export function relief() {
  const m = S?.map;
  if (!m) return;
  try {
    // pas isStyleLoaded() : faux tant que les sources du style se chargent, donc au « style.load » d'un setStyle (SOG-0171 rouvert : le relief ne venait pas
    // après un changement de vue) ; un style qui n'est pas encore posé refuse (getLayer, addSource) et la pose est reprise à son chargement
    const want = !!S.profile?.hillshade,
      has = !!m.getLayer('mp-hillshade');
    if (want === has) return;
    if (!want) return m.removeLayer('mp-hillshade');
    if (!m.getSource('mp-dem')) m.addSource('mp-dem', {
      type: 'raster-dem',
      tiles: [DEM],
      tileSize: 256,
      encoding: 'terrarium',
      maxzoom: 12
    });
    m.addLayer({
      id: 'mp-hillshade',
      type: 'hillshade',
      source: 'mp-dem',
      paint: {
        'hillshade-exaggeration': .45
      }
    }, m.getStyle().layers.find(l => l.type === 'symbol')?.id);
  } catch {
    /* style sans place pour la couche : fond sans relief */
  }
}
/** Noms de lieux du fond (couches de symboles dont la source-layer est « place » ou « place_labels ») masqués quand nos villes
 *  sont dessinées, rendus sinon (SPEC § 5) ; seules les couches visibles dans le style sont touchées, au changement
 *  seulement ; la liste est relevée de nouveau à chaque style chargé (placeIds remis à null). */
export function baseNames(off) {
  const m = S?.map;
  if (!S || off == null) return;
  S.placeWant = off;
  if (!m || S.placeOff === off) return;
  try {
    S.placeIds ||= (m.getStyle()?.layers || []).filter(l => l.type === 'symbol' && /^place(_labels)?$/.test(l['source-layer'] || '') &&
      l.layout?.visibility !== 'none').map(l => l.id);
    for (const id of S.placeIds)
      if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', off ? 'none' : 'visible');
    S.placeOff = off;
  } catch {
    S.placeIds = null; // style pas encore chargé : réglé au chargement (style.load)
  }
}

// ---------------------------------------------------------------- dessin
/** Dégagement : tireté gris de l'arrivée au terrain (sous la surcouche), puis rond gris et code (par-dessus). */
function drawAltn(ctx, toC, altn, on, named = true) {
  const route = S.route.points,
    a = toC(route[route.length - 1].lat, route[route.length - 1].lon),
    b = toC(altn.lat, altn.lon);
  ctx.save();
  ctx.strokeStyle = MapsRender.palette(!!S.theme.dark).altn;
  ctx.lineWidth = 2;
  if (!on) {
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    return ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = S.theme.bg;
  ctx.fill();
  ctx.stroke();
  // le code, sauf si la carte dessine ce terrain : son nom y est déjà, la seule boîte du point (SPEC § 3)
  if (!named) return ctx.restore();
  ctx.font = '700 12px Arial,sans-serif';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = S.theme.bg;
  ctx.lineWidth = 3;
  ctx.strokeText(altn.id, b.x + 8, b.y);
  ctx.fillStyle = MapsRender.palette(!!S.theme.dark).altnText;
  ctx.fillText(altn.id, b.x + 8, b.y);
  ctx.restore();
}
/** Redessine la surcouche (et le fond uni sans tuiles) ; données relues si la vue sort de celles chargées. */
function draw() {
  if (S?.canvas && !S.route.points.length)
    return blank(); // plus de route (« Nouveau vol ») : la carte se vide à l'instant, rien de l'ancien tracé ne reste (SOG-0194)
  if (!S?.canvas || !S.fit) return;
  if (!S.map && S.tilesWait) return; // le fond se charge : pas d'image d'un autre cadrage avant la sienne (SPEC § 5)
  performance.mark('maps:draw:start');
  clearTimeout(sched.rest); // ce dessin complet tient lieu de celui du repos (un nouveau mouvement le redemande)
  mapSize();
  const {
    W,
    H,
    dpr,
    mx,
    my,
    CW,
    CH
  } = sizeCanvas(), {
      toC,
      raw: toRaw,
      shown
    } = view(W, H), raw = S.canvas.getContext('2d'), t = S.theme, ctx = MapsRender.themed(raw, t), mission = onMission(), L = layersNow(),
    // le canvas déborde de la vue (OVER de chaque côté) : le noyau dessine en coordonnées du canvas (toCs, CW × CH, wide) ; ce que
    // l'écran dessine lui-même (procédures, choix, pistes, TOC / TOD, vents, position) reste en coordonnées de la vue, le contexte
    // décalé (inView), comme les listes de toucher
    toCs = shiftTo(toC, mx, my),
    wide = widen(shown, mx / W, my / H),
    inView = () => raw.setTransform(dpr, 0, 0, dpr, dpr * mx, dpr * my),
    onCanvas = () => raw.setTransform(dpr, 0, 0, dpr, 0, 0),
    screen = fn => fn && ((c, pl) => {
      c.save();
      c.translate(mx, my);
      try {
        return fn(c, viewPlacer(pl, mx, my));
      } finally {
        c.restore();
      }
    });
  onCanvas();
  raw.clearRect(0, 0, CW, CH);
  if (S.plain && !window.MAPS_OUTLINES) loadOutlines(); // fond uni confirmé (pas de tuiles) : pas pendant leur chargement
  if (!S.map) drawPlain(ctx, shiftTo(toRaw, mx, my), CW, CH, {
    sea: t.page,
    land: t.bg,
    border: t.grid
  });
  inView();
  // la route que le chemin garde (une STAR raccordée sur un de ses points court-circuite les suivants)
  const route = mission ? S.route.points : keptRoute(S.route.points),
    altn = mission || L.altn ? S.route.altn : null;
  if (altn) drawAltn(ctx, toC, altn, false);
  // zoom réel, décalé par le curseur de Complexité, corrigé par la taille du cadre : le zoom effectif comparé aux seuils (§ 6.6)
  const pxDeg = W / Math.max(1e-6, shown.e - shown.w),
    zReal = MapsRender.zoomOf(pxDeg),
    FR = frameRef(W, H),
    zv = MapsRender.effectiveZoom(zReal + MapsRender.detailZoom(detailShift()), FR.W, FR.H),
    zoomOn = k => MapsRender.visibleAt(S.profile, k, zv),
    // procédures choisies (SID, STAR, approche) : mise en page à l'écran ; leurs libellés se réservent dans le placeur de la
    // carte, après ceux de la route
    // mode « choisir sur la carte » (V3 § 10.23) : les procédures du terrain à choisir, tracées par choose.js à la place de celles du vol,
    // sur les couches de la Carte éteintes ; null hors du mode
    pick = mission ? null : chooseLayout(ctx, toC, W, H),
    procs = mission || pick ? null : procLayout(ctx, toC, pxDeg, zoomOn),
    rwys = mission || pick ? [] : runwayArrows(toC, zReal), // vecteurs de seuil au-dessus du réglage de la compagnie (runwayZoom)
    // couche « Procédures » : le niveau de couverture des terrains visibles (null : couche cachée ou absente)
    cov = mission || pick ? null : covSync(),
    // couche « sol » (§ 10.40) : voies, postes et attentes du départ et de l'arrivée, de près ; les pistes surlignées sont celles déjà tracées
    gnd = mission || pick ? null : groundLayout(toC, zReal, W, H);
  if (S.tuneEl) got('tune')?.markTune(zReal, zv, (shown.n + shown.s) / 2, W, H);
  // nos villes dessinées à ce zoom : les noms de lieux du fond s'effacent (sinon « Mérignac » en double)
  baseNames(!!S.profile?.cities && !!S.data?.data?.cities?.length && ['citiesBig', 'citiesMid', 'citiesSmall'].some(zoomOn));
  // courbes de niveau (VFR, Topo), de près, sous la surcouche aéronautique : les maîtresses seules d'abord, les intermédiaires 1,5 niveau de zoom plus près
  // (le curseur de Complexité décale ce zoom : peu de complexité, les maîtresses seules) ; sur une carte de mission, la vue qui les veut (VFR topo, ou un profil
  // du studio qui coche les courbes) les allume — l'IFR et le fond seul non (SOG-0184)
  const contoursWanted = !!(L.contours || mission && S.profile?.layers
    ?.contours
  ); // la case « Courbes de niveau » (d'origine : les vues à densité VFR) ; le profil du studio d'une carte de mission les demande aussi
  if (contoursWanted && zoomOn('contours') && window.MapsContours && navigator.onLine !== false) MapsContours.draw(ctx, {
    minor: MapsRender.visibleAt(S.profile, 'contours', zv - 1.5),
    toC,
    bbox: shown,
    pxPerDeg: pxDeg,
    W,
    H,
    unit: S.altUnit,
    onReady: schedule,
    load: S.tileLoad ||= tileLoader(S.ctx)
  });
  onCanvas();
  const got0 = MapsRender.draw(ctx, {
    toC: toCs,
    W: CW,
    H: CH,
    view: {
      W,
      H
    },
    frame: FR,
    scale: 1,
    bbox: wide,
    profile: S.profile,
    data: S.data?.data || {},
    // choix sur la carte : le terrain du choix porte son code par-dessus le voile (choose.js) ; la route estompée ne le répète pas
    route: withEta(pick ? route.map(p => p.id === S.choose?.icao ? {
      ...p,
      id: '',
      name: ''
    } : p) : route, pxDeg),
    marks: viewMarks(shown),
    theme: S.theme,
    level,
    detail: detailShift(),
    hideVrp: mission ? null : vfrVrpIds(),
    lines: mission || pick ? null : routeLines(),
    cov,
    coverZoom: COVER_ZOOM,
    runwayZoom: S.runwayZoom,
    reserve: pick ? pl => pick.reserve(viewPlacer(pl, mx, my)) : procs ? pl => procs.reserve(viewPlacer(pl, mx, my)) : null,
    legs: mission || pick ? null : S.route?.path || null,
    dim: pick ? DIM : 0,
    overRoute: screen(pick ? (c, pl) => pick.paint(c, pl) : procs || gnd ? (c, pl) => {
      gnd?.paint(c, pl); // la couche sol (§ 10.40) sous les procédures
      if (procs) drawProcs(c, procs);
    } : null),
    // les pistes (vecteurs de seuil et numéros) dans la couche des terrains, priorité « terrains » de la passe de collision
    runways: rwys.length ? screen((c, pl) => drawRunways(c, rwys, pl)) : null,
    runwayLabels: rwys.length ? screen((c, pl) => reserveRunways(c, rwys, pl)) : null,
    adName: !mission && !pick && zReal >= S.runwayZoom ? a => adTitle(a, a.icao) : null,
    top: screen(pick ? c => pick.top(c) : procs ? c => drawProcLabels(c, procs) : null),
    // TOC et TOD : leurs noms dans la passe (rang route), glissés le long de la trace ; pas pendant le choix sur la carte
    plan: pick ? null : planMarks(ctx, toCs),
    // les terrains de la route et le dégagement : leur nom est la seule boîte de leur point (SPEC § 3)
    onRoute: [...route.map(p => p.id), altn?.id],
    gc: gcScreen(mission, pick, toC),
    // un vol qui nomme une mission : la vue vol, la mission en surimpression (zones en aplat léger, points à rôle ; SOG-0193 L1)
    aside: !mission && S.missionAside && S.mission ? {
      points: S.missionPts || [],
      zones: S.mission.zones,
      flat: true
    } : null,
    mission: mission && S.mission ? {
      points: S.missionPts || S.mission.points, // avec leur rôle dit dans la langue (missionUi)
      zones: S.mission.zones,
      flat: true // zones en aplat léger (SOG-0137)
    } : null
  }) || {};
  covFlush(); // les terrains demandés pendant ce dessin partent ensemble ; redessin une fois à l'arrivée du lot
  // ce que le dessin léger d'un geste reprendra (pas sur une carte de mission ni pendant le choix sur la carte) ; la route est le
  // chemin volé (SID, STAR et approche choisies à la place des tronçons de route qu'elles remplacent, SPEC § 5), sinon la route
  S.lightZoom = S.map ? S.map.getZoom() : null; // le zoom de ce dessin complet : ses listes ne valent que près de lui pour le dessin léger
  S.lightSrc = mission || pick || !got0.light ? null : {
    ...got0.light,
    route: S.route.flown?.length > 1 ? S.route.flown : route
  };
  // les listes de toucher ramenées du canvas à la vue
  const back = l => (l || []).map(o => moved(o, mx, my));
  S.awHits = back(got0.airways);
  stat(got0.zoom);
  S.zoneHits = back(got0.zoneLabels);
  S.adHits = back(got0.aerodromes);
  if (!mission && !pick) wantDrawnRunways(zReal); // les pistes des terrains dessinés, de près
  S.navHits = back(got0.navaids);
  S.vrpHits = back(got0.vrps);
  inView();
  // mode choix : rien par-dessus les procédures à choisir (ni dégagement, ni TOC / TOD, ni points de report, ni vents, ni position)
  if (altn && !pick) drawAltn(ctx, toC, altn, true, !S.adHits.some(h => h.a.icao === altn.id));
  if (!pick) drawPlanOnMap(ctx, toC, (got0.plan || []).map(p => ({
    ...p,
    r: p.r && moved(p.r, mx, my)
  }))); // TOC / TOD : leurs noms là où la passe les a posés
  if (!mission && !pick) drawVfr(ctx, toC);
  // une vue de plus de WORLD_NM : pas de barbules (SOG-0156), et le dit dans les notes (écrit seulement quand cela change)
  const world = !mission && widthNm(shown) > WORLD_NM;
  if (world !== !!S.worldView) {
    S.worldView = world;
    status();
  }
  S.windHits = !mission && !pick && !world && L.wind && zoomOn('wind') ? drawWinds(ctx, toC) : [];
  // les étiquettes de la route du vol (rectangles, du canvas à la vue) : les itinéraires proposés ne les barrent pas et ne nomment pas un point déjà nommé
  S.routeLabelRects = [...(got0.routeLabels || []), ...(got0.plan || []).map(p => p.r).filter(Boolean)].map(r =>
    ({ // y compris les noms de TOC et de TOD
      x0: r.x0 - mx - 2,
      x1: r.x1 - mx + 2,
      y0: r.y0 - my - 2,
      y1: r.y1 - my + 2
    }));
  S.altHits = drawAlts(ctx, toC, S.routeLabelRects); // les itinéraires proposés par Carburant, sur la route (SOG-0134 a)
  if (!mission && !pick && isStarted(S.route.flight)) drawProgress(ctx, toC);
  S.toC = toC;
  if (S.edit.on) got('edit')?.drawEdit(ctx, toC);
  if (S.data && !S.drawn) {
    S.drawn = true;
    performance.mark('maps:first-draw'); // premier dessin avec les données (mesures : DECISIONS.md)
  }
  // les données couvrent le débordement aussi (le couloir autour du vol dans sa limite)
  const corr = corridorFor(shown, W),
    want = wantBox(wide);
  if (!within(want, S.data?.box) || corr !== S.data?.corridor || !fresh()) refresh(want, corr);
  // la lecture limitée au couloir du vol masque des espaces : la Carte le dit (SOG-0169), écrit seulement quand cela change
  if (corr !== (S.corrNote || 0) && !mission) {
    S.corrNote = corr;
    status();
  }
  markFrame(W, H, mx, my);
  performance.measure('maps:draw', 'maps:draw:start');
}
/** La taille que le zoom effectif compare aux seuils (SOG-0169) : celle du module (la page ou le volet), qui ne change qu'avec la fenêtre,
 *  jamais celle de la seule carte, que la feuille fait varier (un même zoom ne montrait pas les mêmes espaces feuille ouverte ou repliée) ;
 *  0,85 la remet à l'échelle de l'ancienne moyenne (la carte occupe environ 85 % du module). */
function frameRef(W, H) {
  const w = S.el?.clientWidth,
    h = S.el?.clientHeight;
  return w > 0 && h > 0 ? {
    W: w * .85,
    H: h * .85
  } : {
    W,
    H
  };
}
/** Zoom effectif et éléments gardés par les seuils, posés sur l'élément de la carte (data-zoom-eff, data-kept : § 18) ; écrits
 *  seulement s'ils changent. */
function stat(z) {
  if (!z?.kept) return;
  const eff = z.effective.toFixed(2),
    kept = JSON.stringify(z.kept),
    d = S.mapEl.dataset;
  if (d.zoomEff !== eff) d.zoomEff = eff;
  if (d.kept !== kept) d.kept = kept;
}
/** TOC et TOD de la coupe à leur place sur la carte, pour la passe unique : [{ name, s, q, w, along(d) }] — q le point à l'écran, w
 *  la largeur de son nom, along(d) le point de la trace à d px (signé) de q en suivant la coupe (null au-delà de ses bouts) ; null
 *  sans coupe. */
function planMarks(ctx, toC) {
  const pr = S.prof;
  if (!pr?.plan) return null;
  ctx.save();
  ctx.font = '700 11px Arial,sans-serif';
  const out = [];
  // TOC, TOD, puis les transitions intermédiaires (le niveau atteint pour nom, rien pour le début d'un palier) : SOG-0008
  const marks = [
    [pr.plan.toc, 'TOC', 'toc'],
    [pr.plan.tod, 'TOD', 'tod'], ...(pr.plan.steps || []).map((m, i) => [m, m.kind === 'reach' ? level(m.alt) : '', `step:${i}`])
  ];
  for (const [m, name, id] of marks) {
    if (!m || (name === 'TOD' && Math.abs(pr.plan.tod.s - pr.plan.toc.s) < pr.total * .005)) continue;
    const at = s => {
        const g = MapsProfile.posAt(pr, s);
        return toC(g.lat, g.lon);
      },
      q = at(m.s),
      ds = Math.max(1, pr.total * .001),
      q1 = at(Math.min(pr.total, m.s + ds)),
      k = Math.hypot(q1.x - q.x, q1.y - q.y) / ds; // px par mètre de trace, près du repère
    out.push({
      name,
      id,
      step: id.startsWith('step:'),
      s: m.s,
      q,
      w: ctx.measureText(name).width,
      along: d => {
        const s = m.s + d / (k || Infinity);
        return k > 0 && s >= 0 && s <= pr.total ? at(s) : null;
      }
    });
  }
  ctx.restore();
  return out;
}
/** TOC et TOD (losanges violets) et curseur commun (rond bleu) sur la carte, aux distances de la coupe ; le nom de TOC / TOD à la
 *  place que la passe unique lui a donnée (planned : [{ name, r }], r null sans place : le losange seul). */
function drawPlanOnMap(ctx, toC, planned = []) {
  const pr = S.prof,
    col = MapsRender.palette(!!S.theme.dark).plan;
  if (!pr) return;
  ctx.save();
  ctx.font = '700 11px Arial,sans-serif';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (const m of planMarks(ctx, toC) || []) {
    const q = m.q,
      r = planned.find(p => p.id === m.id)?.r,
      k = m.step ? 4.5 : 7; // un losange creux, plus petit, pour une transition intermédiaire
    ctx.beginPath();
    ctx.moveTo(q.x, q.y - k);
    ctx.lineTo(q.x + k, q.y);
    ctx.lineTo(q.x, q.y + k);
    ctx.lineTo(q.x - k, q.y);
    ctx.closePath();
    ctx.fillStyle = m.step ? S.theme.bg : col;
    ctx.fill();
    ctx.strokeStyle = m.step ? col : S.theme.bg;
    ctx.lineWidth = m.step ? 1.8 : 2;
    ctx.stroke();
    if (!r) continue;
    ctx.textAlign = r.align;
    ctx.lineWidth = 3;
    ctx.strokeStyle = S.theme.bg;
    ctx.strokeText(m.name, r.x, r.y);
    ctx.fillText(m.name, r.x, r.y);
    ctx.textAlign = 'left';
  }
  if (S.cursor != null) {
    const g = MapsProfile.posAt(pr, S.cursor),
      q = toC(g.lat, g.lon);
    ctx.beginPath();
    ctx.arc(q.x, q.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = MapsRender.withAlpha(S.theme.accent, .25);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = S.theme.accent;
    ctx.stroke();
  }
  ctx.restore();
}
