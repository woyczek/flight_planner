// V3 maps — dessin de la carte (modules/maps/SPEC.md § 5, § 6) : la surcouche aéronautique sur son canvas, par-dessus
// MapLibre ou le fond uni, un dessin par tour d'animation ; la projection de la vue (copies du monde, ligne de changement de
// date), la taille du fond MapLibre, le relief ombré, les noms de lieux du fond, TOC / TOD, le curseur commun, les
// procédures. Les données de la vue sont relues (data.js) quand la vue sort de celles chargées.

import {
  S,
  got,
  onMission,
  level,
  tileLoader,
  keptRoute
} from './state.js';
import {
  nearLon
} from '../../frame/lib/geo.js';
import {
  mapSize as baseSize,
  setBottomInset,
  loadOutlines as baseOutlines,
  plainView,
  drawPlain
} from './lib/map_base.js';
import {
  layersNow,
  detailShift
} from './layers.js';
import {
  refresh,
  wantBox,
  corridorFor,
  within
} from './data.js';
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
  layout as procLayout,
  draw as drawProcs,
  drawLabels as drawProcLabels,
  runwayArrows,
  drawRunways,
  wantRunways,
  routeLines
} from './procs.js';
import {
  covSync,
  covFlush
} from './coverage.js';
import {
  chooseLayout,
  DIM
} from './choose.js';

// ---------------------------------------------------------------- un dessin par tour d'animation
let frame = 0;
/** Dessin complet au prochain tour d'animation (un seul, quel que soit le nombre de demandes). */
const request = () => {
  if (!frame) frame = requestAnimationFrame(() => {
    frame = 0;
    draw();
  });
};
/** Demande un dessin au prochain tour d'animation ; pendant un geste sur la carte (S.moving), la demande attend le repos (un survol,
 *  une lecture qui aboutit ne relancent pas tout le dessin au milieu d'un pan). */
export const schedule = () => {
  if (S?.moving) return;
  request();
};
/** Dessin demandé abandonné (démontage). */
export function cancelDraw() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  if (quick) cancelAnimationFrame(quick);
  quick = 0;
  clearTimeout(rest);
}

// ---------------------------------------------------------------- pendant un geste : l'image déjà dessinée suit la carte
// (V3 maps, 30 octobre : « déplacement de carte sur la région de Paris : très saccadé ») — chaque image d'un pan reprojetait tous
// les anneaux des espaces et reposait toutes les étiquettes ; pendant le mouvement, la dernière image complète est recopiée,
// translatée et mise à l'échelle par deux de ses coins géographiques, rien n'est reprojeté ; le dessin complet (étiquettes,
// vecteurs, collisions, lectures) revient au repos : fin du geste, ou 150 ms sans mouvement
const REST_MS = 150;
let quick = 0,
  rest = 0;
/** La carte bouge (événement « move » de MapLibre) : l'image gardée suit au prochain tour d'animation, le dessin complet attend le
 *  repos. Sans image gardée (premier dessin, fond uni), le dessin complet tout de suite. */
export function moving() {
  clearTimeout(rest);
  rest = setTimeout(settle, REST_MS);
  if (!S?.map || !S.frame?.ok) return request();
  S.moving = true;
  if (!quick) quick = requestAnimationFrame(() => {
    quick = 0;
    if (S?.map && S.frame?.ok && !frame) follow();
  });
}
/** Repos (fin du geste, ou REST_MS sans mouvement) : le dessin complet, les demandes faites pendant le geste comprises. */
export function settle() {
  clearTimeout(rest);
  if (!S) return;
  S.moving = false;
  request();
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
  g.drawImage(F.bmp, a.x * dpr, a.y * dpr, (b.x - a.x) * dpr, (b.y - a.y) * dpr);
  performance.measure('maps:follow', 'maps:follow:start');
}
/** Garde l'image complète qui vient d'être dessinée et ses deux coins géographiques (le haut gauche et le bas droit de la carte). */
function keepFrame(W, H) {
  if (!S.map) return;
  const F = S.frame ||= {
      bmp: document.createElement('canvas')
    },
    c = S.canvas;
  if (F.bmp.width !== c.width || F.bmp.height !== c.height) {
    F.bmp.width = c.width;
    F.bmp.height = c.height;
  }
  const g = F.bmp.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.drawImage(c, 0, 0);
  const p0 = S.map.unproject([0, 0]),
    p1 = S.map.unproject([W, H]);
  F.g0 = [p0.lng, p0.lat];
  F.g1 = [p1.lng, p1.lat];
  F.W = W;
  F.ok = true;
}

// ---------------------------------------------------------------- fond uni : contours des pays
let outlinesP = null;
/** Contours des pays du fond uni (lib/outlines.js, 350 Ko), chargés au premier dessin sans tuiles ; la carte est redessinée
 *  quand ils arrivent (mer seule en attendant). */
const loadOutlines = () => outlinesP ||= baseOutlines().then(() => S && schedule(), () => {
  outlinesP = null; // hors ligne sans copie : redemandé au dessin suivant
});

// ---------------------------------------------------------------- projection et taille
/** Taille du canvas de surcouche à celle de la carte (pixels de l'écran) : { W, H, dpr }. La surcouche a la taille de son
 *  bitmap, jamais « 100 % » du cadre : pendant qu'un doigt tient la feuille, le cadre change de taille sans redessin et un
 *  bitmap étiré déformerait la route. */
function sizeCanvas() {
  const c = S.canvas,
    r = S.box.getBoundingClientRect(),
    dpr = Math.min(3, window.devicePixelRatio || 1),
    W = Math.max(1, Math.round(r.width)),
    H = Math.max(1, Math.round(r.height));
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
  }
  if (c.style.width !== `${W}px`) c.style.width = `${W}px`;
  if (c.style.height !== `${H}px`) c.style.height = `${H}px`;
  return {
    W,
    H,
    dpr
  };
}
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
  if (!m?.isStyleLoaded?.()) return;
  const want = !!S.profile?.hillshade,
    has = !!m.getLayer('mp-hillshade');
  if (want === has) return;
  try {
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
function drawAltn(ctx, toC, altn, on) {
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
  if (!S?.canvas || !S.fit || !S.route.points.length) return;
  performance.mark('maps:draw:start');
  clearTimeout(rest); // ce dessin complet tient lieu de celui du repos (un nouveau mouvement le redemande)
  mapSize();
  const {
    W,
    H,
    dpr
  } = sizeCanvas(), {
    toC,
    raw: toRaw,
    shown
  } = view(W, H), raw = S.canvas.getContext('2d'), t = S.theme, ctx = MapsRender.themed(raw, t), mission = onMission(), L = layersNow();
  raw.setTransform(dpr, 0, 0, dpr, 0, 0);
  raw.clearRect(0, 0, W, H);
  if (S.plain && !window.MAPS_OUTLINES) loadOutlines(); // fond uni confirmé (pas de tuiles) : pas pendant leur chargement
  if (!S.map) drawPlain(ctx, toRaw, W, H, {
    sea: t.page,
    land: t.bg,
    border: t.grid
  });
  // la route que le chemin garde (une STAR raccordée sur un de ses points court-circuite les suivants)
  const route = mission ? S.route.points : keptRoute(S.route.points),
    altn = mission || L.altn ? S.route.altn : null;
  if (altn) drawAltn(ctx, toC, altn, false);
  // zoom réel, décalé par le curseur de Complexité, corrigé par la taille du cadre : le zoom effectif comparé aux seuils (§ 6.6)
  const pxDeg = W / Math.max(1e-6, shown.e - shown.w),
    zReal = MapsRender.zoomOf(pxDeg),
    zv = mission ? zReal : MapsRender.effectiveZoom(zReal + MapsRender.detailZoom(detailShift()), W, H),
    zoomOn = k => MapsRender.visibleAt(S.profile, k, zv),
    // procédures choisies (SID, STAR, approche) : mise en page à l'écran ; leurs libellés se réservent dans le placeur de la
    // carte, après ceux de la route
    // mode « choisir sur la carte » (V3 § 10.23) : les procédures du terrain à choisir, tracées par choose.js à la place de celles du vol,
    // sur les couches de la Carte éteintes ; null hors du mode
    pick = mission ? null : chooseLayout(ctx, toC, W, H),
    procs = mission || pick ? null : procLayout(ctx, toC, pxDeg, zoomOn),
    rwys = mission || pick ? [] : runwayArrows(toC, zReal), // vecteurs de seuil au-dessus du réglage de la compagnie (runwayZoom)
    // couche « Procédures » : le niveau de couverture des terrains visibles (null : couche cachée ou absente)
    cov = mission || pick ? null : covSync();
  if (S.tuneEl) got('tune')?.markTune(zReal, zv, (shown.n + shown.s) / 2, W, H);
  // nos villes dessinées à ce zoom : les noms de lieux du fond s'effacent (sinon « Mérignac » en double)
  baseNames(!!S.profile?.cities && !!S.data?.data?.cities?.length && ['citiesBig', 'citiesMid', 'citiesSmall'].some(zoomOn));
  // courbes de niveau (VFR, Topo), de près, sous la surcouche aéronautique
  if (!mission && L.contours && zoomOn('contours') && window.MapsContours && navigator.onLine !== false) MapsContours.draw(ctx, {
    toC,
    bbox: shown,
    pxPerDeg: pxDeg,
    W,
    H,
    unit: S.altUnit,
    onReady: schedule,
    load: S.tileLoad ||= tileLoader(S.ctx)
  });
  const got0 = MapsRender.draw(ctx, {
    toC,
    W,
    H,
    scale: 1,
    bbox: shown,
    profile: S.profile,
    data: S.data?.data || {},
    route: withEta(route, pxDeg),
    marks: S.marks,
    theme: S.theme,
    level,
    detail: mission ? 0 : detailShift(),
    hideVrp: mission ? null : vfrVrpIds(),
    lines: mission || pick ? null : routeLines(),
    cov,
    reserve: pick ? pl => pick.reserve(pl) : procs ? pl => procs.reserve(pl) : null,
    legs: mission || pick ? null : S.route?.path || null,
    dim: pick ? DIM : 0,
    overRoute: pick ? c => pick.paint(c) : procs ? c => drawProcs(c, procs) : null,
    // les pistes (vecteurs de seuil et numéros) dans la couche des terrains, priorité « terrains » de la passe de collision
    runways: rwys.length ? (c, pl) => drawRunways(c, rwys, pl) : null,
    adNames: !mission && !pick && zReal >= (S.runwayZoom ?? 11),
    top: pick ? c => pick.top(c) : procs ? c => drawProcLabels(c, procs) : null,
    mission: mission && S.mission ? {
      points: S.mission.points,
      zones: S.mission.zones
    } : null
  }) || {};
  covFlush(); // les terrains demandés pendant ce dessin partent ensemble ; redessin une fois à l'arrivée du lot
  S.awHits = got0.airways || [];
  stat(got0.zoom);
  S.zoneHits = got0.zoneLabels || [];
  S.adHits = got0.aerodromes || [];
  if (!mission && !pick) wantRunways(zReal); // les pistes des terrains dessinés, de près
  S.navHits = got0.navaids || [];
  S.vrpHits = got0.vrps || [];
  // mode choix : rien par-dessus les procédures à choisir (ni dégagement, ni TOC / TOD, ni points de report, ni vents, ni position)
  if (altn && !pick) drawAltn(ctx, toC, altn, true);
  if (!pick) drawPlanOnMap(ctx, toC, [...(got0.routeLabels || []), ...(procs?.labels || []).map(l => l
    .r)]); // TOC / TOD : ni sur la route ni sur une procédure
  if (!mission && !pick) drawVfr(ctx, toC);
  S.windHits = !mission && !pick && L.wind && zoomOn('wind') ? drawWinds(ctx, toC) : [];
  if (!mission && !pick && isStarted(S.route.flight)) drawProgress(ctx, toC);
  S.toC = toC;
  if (S.edit.on) got('edit')?.drawEdit(ctx, toC);
  if (S.data && !S.drawn) {
    S.drawn = true;
    performance.mark('maps:first-draw'); // premier dessin avec les données (mesures : DECISIONS.md)
  }
  const want = wantBox(shown),
    corr = corridorFor(shown, W);
  if (!within(want, S.data?.box) || corr !== S.data?.corridor) refresh(want, corr);
  keepFrame(W, H);
  performance.measure('maps:draw', 'maps:draw:start');
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
/** TOC et TOD (losanges violets) et curseur commun (rond bleu) sur la carte, aux distances de la coupe ; le libellé de TOC /
 *  TOD au nord-est, sinon au sud-est, au nord-ouest, au sud-ouest : là où il ne couvre pas un libellé de la route (taken). */
function drawPlanOnMap(ctx, toC, taken = []) {
  const pr = S.prof,
    col = MapsRender.palette(!!S.theme.dark).plan;
  if (!pr) return;
  ctx.save();
  ctx.font = '700 11px Arial,sans-serif';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (const [m, name] of [
      [pr.plan?.toc, 'TOC'],
      [pr.plan?.tod, 'TOD']
    ]) {
    if (!m || (name === 'TOD' && Math.abs(pr.plan.tod.s - pr.plan.toc.s) < pr.total * .005)) continue;
    const g = MapsProfile.posAt(pr, m.s),
      q = toC(g.lat, g.lon);
    ctx.beginPath();
    ctx.moveTo(q.x, q.y - 7);
    ctx.lineTo(q.x + 7, q.y);
    ctx.lineTo(q.x, q.y + 7);
    ctx.lineTo(q.x - 7, q.y);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = S.theme.bg;
    ctx.lineWidth = 2;
    ctx.stroke();
    const w = ctx.measureText(name).width,
      spot = [
        [8, -9, 'left'],
        [8, 10, 'left'],
        [-8, -9, 'right'],
        [-8, 10, 'right']
      ].find(([dx, dy, al]) => {
        const x0 = al === 'left' ? q.x + dx : q.x + dx - w,
          r = {
            x0,
            x1: x0 + w,
            y0: q.y + dy - 7,
            y1: q.y + dy + 7
          };
        return !taken.some(k => r.x0 < k.x1 && r.x1 > k.x0 && r.y0 < k.y1 && r.y1 > k.y0);
      }) || [8, -9, 'left'];
    ctx.textAlign = spot[2];
    ctx.lineWidth = 3;
    ctx.strokeText(name, q.x + spot[0], q.y + spot[1]);
    ctx.fillText(name, q.x + spot[0], q.y + spot[1]);
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
