// Rendus vectoriels du module Atmosphère (INTEGRATION.md § 5) : la coupe le long de la route et la tranche verticale
// (sondage), en SVG d'une taille donnée. Fonctions pures : un modèle (calculé par module.js) et des options entrent, une
// chaîne SVG et la géométrie (pour les infobulles) sortent ; ni DOM de la page (seulement un canevas détaché pour les
// images de champs), ni stockage. Les champs continus
// (nuages, température, humidité, altitude-densité, givrage, inversions) sont des images de la grille de calcul,
// agrandies lissées (pas de marches) ; tout le reste (isothermes, trajectoires, relief, vent, axes, textes) est vectoriel.
// Les couleurs suivent les jetons du cadre (--sog-*) par des variables posées sur la racine du SVG : le rendu se lit dans
// n'importe quel module (la Carte l'affichera dans son bloc de données).
import * as A from './atmo.js';
import {
  formatLevel
} from '../../frame/lib/route_text.js';
import {
  TX
} from './texts.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a == null || b == null ? (a ?? b) : a + (b - a) * k;
const fmtLevel = ft => ft == null ? '—' : formatLevel(Math.max(0, Math.round(ft / 100) * 100));
const R = Math.PI / 180;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const n1 = v => Math.round(v * 10) / 10;
/** Hauteur sous laquelle un dessin ne se lit plus du tout (px) : en dessous, il est dessiné à cette hauteur. */
const MIN_H = 60;
/** Un niveau étiqueté sur combien, selon la hauteur du graphique (px) : l'axe des distances passe avant les niveaux. */
const levelEvery = ph => ph < 110 ? 4 : ph < 160 ? 2 : 1;
/** Pas des niveaux étiquetés (ft) selon le haut du graphique. */
const levelStep = top => top > 25000 ? 5000 : top > 12000 ? 2000 : 1000;
let measure = null;
/** Largeur d'un texte (px) à une taille de police : mesurée quand la page le permet, estimée sinon. */
const textW = (s, size) => {
  try {
    measure ||= document.createElement('canvas').getContext('2d');
    measure.font = `${size}px system-ui, -apple-system, sans-serif`;
    return measure.measureText(String(s)).width;
  } catch {
    return String(s).length * size * 0.58;
  }
};
/** Gouttière gauche (px) d'un graphique : juste ce que demandent ses étiquettes (alignées à droite, 5 px avant l'axe). */
const gutter = (texts, size = 10) => Math.ceil(Math.max(0, ...texts.map(x => textW(x, size)))) + 7;

/** Variables de couleur posées sur la racine du SVG (jetons du cadre). */
export const VARS = '--at-computed:var(--sog-chart-1);--at-planned:var(--sog-chart-4);--at-requested:var(--sog-chart-3);' +
  '--at-inv:var(--sog-chart-2);--at-ice:var(--sog-chart-5);--at-terrain:color-mix(in srgb,var(--sog-chart-6) 55%,var(--sog-chart-bg))';

/** Couleurs des données (indépendantes du design) : divergente bleu ↔ rouge, gris au milieu. */
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const BLUE = ['#0d366b', '#256abf', '#6da7ec', '#b7d3f6'],
  RED = ['#f6c9c0', '#ec8a85', '#e34948', '#9e2a2a'];
export function diverging(x, span, dark = false) {
  const mid = dark ? '#383835' : '#f0efec',
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

/** Image PNG (data:) d'une grille nx × ny, rangée du bas vers le haut ; rgbaOf(n) → [r, g, b, a 0–255] ou null. */
export function gridImage(nx, ny, rgbaOf) {
  // un canevas détaché (jamais posé dans la page) : OffscreenCanvas n'a pas de toDataURL synchrone
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
      img.data[o] = v[0];
      img.data[o + 1] = v[1];
      img.data[o + 2] = v[2];
      img.data[o + 3] = v[3];
    }
  g.putImageData(img, 0, 0);
  return cv.toDataURL('image/png');
}

/** Barbule de vent (hémisphère nord) en SVG : hampe vers le lit du vent, plumes à droite ; fanion 50 kt, plume 10,
 *  demi 5 ; calme : un cercle. Rend des éléments SVG (couleur : currentColor). */
export function barb(x, y, dir, kt, len = 20) {
  if (kt == null || dir == null) return '';
  if (kt < 2.5) return `<circle cx="${n1(x)}" cy="${n1(y)}" r="3" fill="none" stroke="currentColor" stroke-width="1.3"/>`;
  const a = dir * R,
    ux = Math.sin(a),
    uy = -Math.cos(a),
    px = Math.sin(a + Math.PI / 2),
    py = -Math.cos(a + Math.PI / 2),
    ex = x + ux * len,
    ey = y + uy * len,
    step = 4,
    fl = len * 0.45;
  let d = `M${n1(x)} ${n1(y)}L${n1(ex)} ${n1(ey)}`,
    fill = '',
    n = Math.round(kt / 5) * 5,
    pos = 0;
  while (n >= 50) {
    const bx = ex - ux * pos,
      by = ey - uy * pos;
    fill += `M${n1(bx)} ${n1(by)}L${n1(bx + px * fl - ux * 2)} ${n1(by + py * fl - uy * 2)}L${n1(bx - ux * step * 1.4)} ${n1(by - uy * step * 1.4)}Z`;
    pos += step * 1.8;
    n -= 50;
  }
  while (n >= 10) {
    const bx = ex - ux * pos,
      by = ey - uy * pos;
    d += `M${n1(bx)} ${n1(by)}L${n1(bx + px * fl + ux * 3)} ${n1(by + py * fl + uy * 3)}`;
    pos += step;
    n -= 10;
  }
  if (n >= 5) {
    if (pos === 0) pos = step;
    const bx = ex - ux * pos,
      by = ey - uy * pos;
    d += `M${n1(bx)} ${n1(by)}L${n1(bx + px * fl * 0.5 + ux * 1.5)} ${n1(by + py * fl * 0.5 + uy * 1.5)}`;
  }
  return `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>` +
    (fill ? `<path d="${fill}" fill="currentColor"/>` : '');
}

/** Texte avec un liseré de la couleur du fond (lisible sur les champs). */
const label = (x, y, text, {
    color = 'var(--sog-fg)',
    anchor = 'middle',
    size = 11,
    weight = 400
  } = {}) => `<text x="${n1(x)}" y="${n1(y)}" text-anchor="${anchor}" dominant-baseline="middle" font-size="${size}" font-weight="${weight}" ` +
  `fill="${color}" stroke="var(--sog-chart-bg)" stroke-width="3" paint-order="stroke" stroke-linejoin="round">${esc(text)}</text>`;

/** Motifs hachurés (inversion, givrage possible / probable). */
const PATTERNS = `<pattern id="at-p-inv" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
  `<line x1="0" y1="0" x2="0" y2="7" stroke="var(--at-inv)" stroke-width="1.4"/></pattern>` +
  `<pattern id="at-p-ice1" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">` +
  `<line x1="0" y1="0" x2="0" y2="9" stroke="#c98500" stroke-opacity=".6" stroke-width="1"/></pattern>` +
  `<pattern id="at-p-ice2" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">` +
  `<line x1="0" y1="0" x2="0" y2="5" stroke="var(--at-ice)" stroke-width="1.6"/></pattern>`;

// ---------------------------------------------------------------- modèle de la coupe (calcul pur)

/** Altitude haute de la coupe (ft) : au-dessus du plus haut niveau prévu, en milliers ronds. */
export const topFtOf = (levelFt, points) => clamp(Math.ceil((Math.max(levelFt || 0, ...(points || []).map(p => p.alt_ft || 0)) + 6000) /
    5000) * 5000, 10000,
  40000);
/** Lieux de lecture de la route (un tous les 50 NM, 24 au plus, comme Carburant) : à demander à la réserve météo. */
// Carburant rend ses lieux ramenés à [-180, 180[ ; ils sont redéroulés ici, du même côté de la ligne de changement de date
// que la route (la coupe, ses repères et la carte suivent ; la réserve ramène chaque demande à sa case)
export const sectionPlaces = points => A.unwrapLons(A.samples(A.unwrapLons(points)));
/** Variables horaires de la coupe : surface et niveaux de pression jusqu'au haut de la coupe. */
export const sectionVars = (levelFt, points) => [...A.ROUTE_SURFACE_VARS, ...A.levelsUpTo(topFtOf(levelFt, points)).flatMap(l => A
  .ROUTE_LEVEL_VARS
  .map(v => `${v}_${l}hPa`))];

/** Modèle de la coupe, sans DOM ni réseau : la trajectoire (demandée, planifiée, calculée), chaque lieu de lecture à
 *  l'heure où le vol y passe, le champ NX × NY de la coupe et la lecture tous les 1 NM le long de la trajectoire.
 *  { points, levelFt, profile (de Carburant), profileLevelFt (niveau du profil : TOC / TOD valables à ce niveau seulement,
 *  sinon ses taux et vitesses), depTime (s), cruiseKt, samples (sectionPlaces), locs (lieux de la réserve, A.locations,
 *  dans l'ordre de samples) } → { traj, samples (avec t), cols, field, along, outOfRange, sampleAt(nm, ft) }. */
export function sectionModel({
  points,
  levelFt,
  profile = null,
  profileLevelFt = levelFt,
  depTime,
  cruiseKt = 200,
  samples,
  locs
}) {
  points = A.unwrapLons(points); // une route qui passe la ligne de changement de date (comme sectionPlaces)
  const c0 = A.column(locs[0], A.hourIndex(locs[0].times, depTime)),
    cN = A.column(locs.at(-1), A.hourIndex(locs.at(-1).times, depTime + 3600));
  const {
    tocNm,
    todNm,
    path,
    ...rates
  } = profile || {};
  // le chemin vertical de Carburant (profile.path) n'est valable qu'au niveau où il a été calculé, comme TOC / TOD
  const same = levelFt === profileLevelFt,
    opts = {
      levelFt,
      profile: same ? profile : rates,
      depFt: c0.sfc.pa,
      arrFt: cN.sfc.pa,
      cruiseKt,
      path: same ? path : null
    };
  let traj = A.trajectory(points, opts),
    smp = samples.map(s => ({
      ...s,
      t: depTime + traj.minutesAt(s.nm) * 60
    })),
    cols = smp.map((s, i) => A.column(locs[i], A.hourIndex(locs[i].times, s.t)));
  const times = locs[0].times;
  /** Lecture à une distance et une altitude pression, entre les deux lieux qui l'encadrent (chacun à son heure). */
  function sampleAt(nm, ft) {
    let i = 1;
    while (i < smp.length - 1 && smp[i].nm < nm) i++;
    const a = smp[i - 1],
      b = smp[i],
      k = clamp((nm - a.nm) / ((b.nm - a.nm) || 1), 0, 1),
      ca = cols[i - 1],
      cb = cols[i],
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
  // seconde passe : le temps à la vitesse sol, le vent de face lu tous les 1 NM sur la trajectoire aux heures de la première passe
  // (utilisateur, 29 octobre : « 30 kt de face = 30 kt de vitesse sol en moins »)
  {
    const heads = [];
    for (let nm = 0; nm <= Math.ceil(traj.total); nm++) {
      const x = sampleAt(Math.min(nm, traj.total), traj.computed(Math.min(nm, traj.total))),
        p = A.posAt(points, traj.nmOf, Math.min(nm, traj.total));
      heads.push(x && !x.below && x.dirDeg != null ? A.windComponents(x.dirDeg, x.kt, p.track).head : 0);
    }
    traj = A.trajectory(points, {
      ...opts,
      headAt: nm => heads[Math.max(0, Math.min(heads.length - 1, Math.floor(nm)))]
    });
    smp = samples.map(s => ({
      ...s,
      t: depTime + traj.minutesAt(s.nm) * 60
    }));
    cols = smp.map((s, i) => A.column(locs[i], A.hourIndex(locs[i].times, s.t)));
  }
  // champ de la coupe : NX × NY cellules
  const NX = 200,
    NY = 120,
    top = topFtOf(levelFt, points),
    keys = ['tC', 'tdC', 'rh', 'cc', 'isaDev', 'daFt'],
    field = {
      NX,
      NY,
      top,
      below: new Uint8Array(NX * NY)
    };
  keys.forEach(k => field[k] = new Array(NX * NY).fill(null));
  for (let i = 0; i < NX; i++) {
    const nm = traj.total * i / (NX - 1);
    for (let j = 0; j < NY; j++) {
      const x = sampleAt(nm, top * j / (NY - 1)),
        n = j * NX + i;
      if (!x || x.below) {
        field.below[n] = 1;
        continue;
      }
      keys.forEach(k => field[k][n] = x[k] ?? null);
      field.daFt[n] = x.daFt == null ? null : x.daFt - x.ft;
    }
  }
  // le long de la trajectoire calculée, tous les 1 NM
  const along = [];
  for (let nm = 0; nm <= traj.total; nm += 1) {
    const ft = traj.computed(nm),
      x = sampleAt(nm, ft),
      p = A.posAt(points, traj.nmOf, nm);
    along.push({
      nm,
      ft,
      x,
      lat: p.lat,
      lon: p.lon,
      phase: traj.phase(nm),
      track: p.track,
      comp: x && !x.below ? A.windComponents(x.dirDeg, x.kt, p.track) : null,
      ice: x && !x.below ? A.icing(x) : 0
    });
  }
  return {
    traj,
    samples: smp,
    cols,
    field,
    along,
    outOfRange: !times.length || depTime < times[0] - 3600 || smp.at(-1).t > times.at(-1) + 3600,
    sampleAt
  };
}

/** Coupe dessinée dans un élément, pour un autre module (la feuille de la Carte : openData(…, (w, h, el) => …)) :
 *  idempotent (el remplacé à chaque appel), à la taille donnée, sans lecture de la page ni de la couche de données.
 *  o : { width, height, route (points), levelFt, profile, profileLevelFt, depTime (s), cruiseKt, locs (la réserve
 *  météo pour sectionPlaces(route) et sectionVars(levelFt, route)), layers, cursorM (curseur partagé, mètres depuis le
 *  départ), labels { strips }, fmtLvl, cloudRgb, dark } → la géométrie (infobulles, touchers), ou null sans prévision. */
export function drawSection(el, o) {
  if (!o?.locs?.length || !o.route?.length) {
    el.replaceChildren();
    return null;
  }
  const M = o.model || sectionModel({
      points: o.route,
      levelFt: o.levelFt,
      profile: o.profile,
      profileLevelFt: o.profileLevelFt ?? o.levelFt,
      depTime: o.depTime ?? Math.ceil(Date.now() / 36e5) * 3600,
      cruiseKt: o.cruiseKt,
      samples: sectionPlaces(o.route),
      locs: o.locs
    }),
    r = sectionSvg({
      ...M,
      points: o.route,
      sel: null,
      cursorNm: o.cursorM == null ? null : o.cursorM / 1852
    }, {
      width: o.width,
      height: o.height,
      minHeight: o.minHeight,
      window: o.window,
      layers: o.layers || {
        cloud: true,
        iso: true,
        inv: true,
        ice: true,
        wind: true,
        cu: true
      },
      fmtLvl: o.fmtLvl || fmtLevel,
      cloudRgb: o.cloudRgb,
      dark: o.dark,
      labels: o.labels,
      id: o.id || 'at-ext'
    });
  el.innerHTML = r.svg;
  return r.geo;
}

/** Coupe le long de la route.
 *  M : { field (NX, NY, top, below, tC, rh, cc, daFt), traj, samples [{ nm, t, point }], cols, points, sel (indice ou
 *  null), levelFt }.
 *  o : { width, height, layers { cloud, temp, rh, da, iso, inv, ice, wind, cu }, labels { strips: [5 libellés] },
 *  fmtLvl, cloudRgb [r, g, b], dark, strips (bandes de surface, vrai si la hauteur le permet), id (préfixe unique),
 *  minHeight (plancher de hauteur, 0 par défaut : la coupe tient dans la hauteur donnée, axe des distances compris ; basse,
 *  elle garde un niveau sur deux, puis sur quatre), window ({ from, to } en NM depuis le départ : la partie de la route
 *  dessinée, l'échelle verticale recalée sur ce qu'elle montre ; absente ou le vol entier : la coupe entière) }.
 *  → { svg, geo { x0, y0, pw, ph, xOf, yOf, nmOf, ftOf, window (la fenêtre prise, absente sans fenêtre), top, strips,
 *  layers } }. */
export function sectionSvg(M, o) {
  const F = M.field,
    L = o.layers,
    W = Math.max(200, o.width),
    H = Math.max(o.minHeight || 0, MIN_H, o.height),
    strips = o.strips !== false && H >= 260,
    SH = 10,
    total = M.traj.total || 1,
    // fenêtre sur l'axe des distances (règle 20 : le geste de la Carte) : NM depuis le départ, bornée au vol ; entière = sans
    // fenêtre
    win = windowOf(o.window, total),
    nm0 = win ? win.from : 0,
    nm1 = win ? win.to : total,
    // haut de l'échelle : celui du champ, ou recalé sur ce que montre la fenêtre (niveaux du vol, relief), 1 500 ft au-dessus
    top = win ? visibleTop(M, nm0, nm1) : F.top,
    // gouttière gauche au strict nécessaire : les étiquettes de niveau, ou les libellés des bandes de surface s'ils sont plus
    // longs (police de 9 px)
    l = Math.max(gutter(Array.from({
      length: Math.floor(top / levelStep(top)) + 1
    }, (_, k) => k ? o.fmtLvl(k * levelStep(top)) : '0')), strips ? gutter(o.labels?.strips || [], 9) : 0),
    r = 8,
    t = 16,
    bottom = 16 + (strips ? 5 * (SH + 2) + 6 : 0),
    pw = W - l - r,
    ph = H - t - bottom,
    xOf = nm => l + pw * (nm - nm0) / ((nm1 - nm0) || 1),
    yOf = ft => t + ph * (1 - ft / top),
    inWin = nm => nm >= nm0 - 1e-6 && nm <= nm1 + 1e-6,
    id = o.id || 'at',
    // le champ entier (0 → la distance du vol, 0 → le haut du champ), posé sur l'échelle de la fenêtre et coupé au cadre
    fx0 = xOf(0),
    fy0 = yOf(F.top),
    cw = (xOf(total) - fx0) / (F.NX - 1),
    ch = (yOf(0) - fy0) / (F.NY - 1),
    cloud = o.cloudRgb || [96, 104, 116],
    out = [];
  // image d'un champ, posée sur la grille de calcul (centres des cellules aux nœuds), coupée au cadre du graphique
  const field = (rgbaOf, attrs = '') => `<image href="${gridImage(F.NX, F.NY, n => F.below[n] ? null : rgbaOf(n))}" x="${n1(fx0 - cw / 2)}" ` +
    `y="${n1(fy0 - ch / 2)}" width="${n1(cw * (F.NX - 1) + cw)}" height="${n1(ch * (F.NY - 1) + ch)}" preserveAspectRatio="none" clip-path="url(#${id}-clip)" ${attrs}/>`;
  const mask = (name, test) => `<mask id="${id}-${name}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">` +
    field(n => test(n) ? [255, 255, 255, 255] : null) + '</mask>';
  out.push(`<defs>${PATTERNS.replace(/at-p-/g, `${id}-p-`)}<clipPath id="${id}-clip"><rect x="${l}" y="${t}" width="${n1(pw)}" height="${n1(ph)}"/></clipPath>` +
    `<clipPath id="${id}-xclip"><rect x="${l}" y="0" width="${n1(pw)}" height="${H}"/></clipPath>`);
  const iceOf = n => A.icing({
    tC: F.tC[n],
    rh: F.rh[n],
    cc: F.cc[n]
  });
  const invOf = n => {
    const up = n + F.NX;
    return up < F.NX * F.NY && F.tC[n] != null && F.tC[up] != null && F.tC[up] - F.tC[n] > 0.02;
  };
  if (L.inv) out.push(mask('inv', invOf));
  if (L.ice) out.push(mask('ice1', n => iceOf(n) === 1), mask('ice2', n => iceOf(n) === 2));
  out.push('</defs>');
  out.push(`<rect x="${l}" y="${t}" width="${n1(pw)}" height="${n1(ph)}" fill="var(--sog-chart-bg)"/>`);
  // fonds : température, humidité, altitude-densité (un seul à la fois)
  const fill = L.da ? 'da' : L.temp ? 'temp' : L.rh ? 'rh' : null;
  if (fill === 'temp') out.push(field(n => F.tC[n] == null ? null : [...diverging(F.tC[n], 40, o.dark), 190]));
  if (fill === 'da') out.push(field(n => F.daFt[n] == null ? null : [...diverging(F.daFt[n], 4000, o.dark), 190]));
  if (fill === 'rh') out.push(field(n => F.rh[n] == null ? null : [42, 120, 214, Math.round(clamp((F.rh[n] - 30) / 70, 0, 1) * 150)]));
  if (L.cloud) out.push(field(n => F.cc[n] > 5 ? [...cloud, Math.round(F.cc[n] / 100 * 160)] : null));
  if (L.inv) out.push(`<rect x="${l}" y="${t}" width="${n1(pw)}" height="${n1(ph)}" fill="url(#${id}-p-inv)" mask="url(#${id}-inv)"/>`);
  if (L.ice) out.push(`<rect x="${l}" y="${t}" width="${n1(pw)}" height="${n1(ph)}" fill="url(#${id}-p-ice1)" mask="url(#${id}-ice1)"/>`,
    `<rect x="${l}" y="${t}" width="${n1(pw)}" height="${n1(ph)}" fill="url(#${id}-p-ice2)" mask="url(#${id}-ice2)"/>`);
  // isothermes tous les 5 °C, 0 °C appuyé, étiquettes décalées par niveau
  if (L.iso) {
    const iso = A.contours(F.tC.map((v, n) => F.below[n] ? null : v), F.NX, F.NY, A.thresholdsOf(F.tC, 5)),
      X = gx => fx0 + gx * cw,
      Y = gy => yOf(0) - gy * ch,
      // étiquettes placées dans la partie montrée (colonnes de la fenêtre)
      g0 = nm0 / total * (F.NX - 1),
      g1 = nm1 / total * (F.NX - 1);
    const labs = [];
    for (const c of iso) {
      const zero = c.level === 0,
        d = c.segs.map(s => `M${n1(X(s[0]))} ${n1(Y(s[1]))}L${n1(X(s[2]))} ${n1(Y(s[3]))}`).join('');
      out.push(`<path d="${d}" fill="none" stroke="${zero ? '#1c5cab' : c.level < 0 ? 'rgba(37,106,191,.6)' : 'rgba(227,73,72,.6)'}" ` +
        `stroke-width="${zero ? 2 : 1}"${zero ? '' : ' stroke-dasharray="4 3"'} clip-path="url(#${id}-clip)"/>`);
      const gx = g0 + (g1 - g0) * (0.12 + 0.76 * (((c.level / 5) % 7 + 7) % 7) / 6);
      let best = null,
        bd = Infinity;
      for (const s of c.segs) {
        const mx = (s[0] + s[2]) / 2,
          dd = Math.abs(mx - gx);
        if (mx < g0 || mx > g1) continue;
        if (dd < bd) {
          bd = dd;
          best = s;
        }
      }
      if (best) labs.push(label(X((best[0] + best[2]) / 2), Y((best[1] + best[3]) / 2), `${c.level < 0 ? '−' : ''}${Math.abs(c.level)}°`, {
        color: zero ? '#1c5cab' : 'var(--sog-muted)',
        size: 10
      }));
    }
    out.push(...labs);
  }
  // base des cumulus estimée
  if (L.cu) {
    const pts = M.samples.map((s, i) => [s, A.cumulusBaseFt(M.cols[i])]).filter(([, b]) => b != null);
    if (pts.length > 1) out.push(`<polyline points="${pts.map(([s, b]) => `${n1(xOf(s.nm))},${n1(yOf(Math.min(b, top)))}`).join(' ')}" ` +
      `fill="none" stroke="var(--sog-muted)" stroke-width="1.2" stroke-dasharray="1 3" clip-path="url(#${id}-clip)"/>`);
  }
  // relief (altitude pression du sol)
  out.push(`<path d="M${n1(xOf(0))} ${n1(t + ph)}${M.samples.map((s, i) => `L${n1(xOf(s.nm))} ${n1(yOf(clamp(M.cols[i].sfc.pa, 0, top)))}`).join('')}L${n1(xOf(total))} ${n1(t + ph)}Z" ` +
    `fill="var(--at-terrain)" clip-path="url(#${id}-clip)"/>`);
  // vent : une barbule par lieu de lecture, toutes les 3 000 ou 5 000 ft (un lieu sur deux si serré)
  if (L.wind) {
    // une barbule tous les ~34 px au moins, un niveau sur deux quand la coupe est basse (téléphone)
    const shown = M.samples.filter(s => inWin(s.nm)).length || 1,
      every = Math.max(1, Math.ceil(34 / (pw / shown))),
      dy = (top > 20000 ? 5000 : 3000) * (ph < 220 ? 2 : 1);
    let g = '';
    M.samples.forEach((s, i) => {
      if (i % every || !inWin(s.nm)) return;
      for (let ft = dy; ft < top; ft += dy) {
        const x = A.at(M.cols[i], ft);
        if (x && !x.below && x.dirDeg != null) g += barb(xOf(s.nm), yOf(ft), x.dirDeg, x.kt, ph < 200 ? 15 : 19);
      }
    });
    out.push(`<g color="var(--sog-muted)" clip-path="url(#${id}-clip)">${g}</g>`);
  }
  // trajectoires : demandée, planifiée, calculée
  const line = (fn, color, dash, w) => {
    let d = '';
    for (let x = 0; x <= pw; x += 2) d += `${x ? 'L' : 'M'}${n1(l + x)} ${n1(yOf(fn(nm0 + x / pw * (nm1 - nm0))))}`;
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''} clip-path="url(#${id}-clip)"/>`;
  };
  out.push(line(M.traj.requested, 'var(--at-requested)', '2 4', 2), line(M.traj.planned, 'var(--at-planned)', '7 4', 2),
    line(M.traj.computed, 'var(--at-computed)', '', 2.5));
  for (const [nm, lab] of [
      [M.traj.toc, 'TOC'],
      [M.traj.tod, 'TOD']
    ])
    if (nm != null && inWin(nm)) {
      const x = xOf(nm),
        y = yOf(M.traj.computed(nm));
      out.push(`<circle cx="${n1(x)}" cy="${n1(y)}" r="3.5" fill="var(--at-computed)"/>`, label(x, y - 10, lab, {
        color: 'var(--at-computed)',
        size: 10
      }));
    }
  // points de la route : un trait chacun ; les noms qui se chevaucheraient sont écartés (départ et arrivée gardés)
  const xs = M.points.map((p, i) => xOf(M.traj.nmOf[i])),
    vis = xs.map((x, i) => i).filter(i => inWin(M.traj.nmOf[i])),
    named = [];
  vis.forEach((i, k) => {
    const x = xs[i],
      last = k === vis.length - 1;
    out.push(`<line x1="${n1(x)}" y1="${t}" x2="${n1(x)}" y2="${n1(t + ph)}" stroke="var(--sog-border)" stroke-dasharray="2 3"/>`);
    const w = 7 * String(M.points[i].id).length + 8;
    if (last)
      while (named.length > 1 && x - xs[named.at(-1)] < w) named.pop();
    if (!named.length || last || x - xs[named.at(-1)] >= w) named.push(i);
  });
  for (const i of named) out.push(label(clamp(xs[i], l + 16, l + pw - 16), t - 8, M.points[i].id, {
    size: 10,
    weight: 600
  }));
  // curseur partagé (la Carte : distance depuis le départ)
  if (M.cursorNm != null && M.cursorNm >= 0 && M.cursorNm <= M.traj.total && inWin(M.cursorNm)) {
    const x = xOf(M.cursorNm);
    out.push(`<line x1="${n1(x)}" y1="${t}" x2="${n1(x)}" y2="${n1(t + ph)}" stroke="var(--sog-accent)" stroke-width="1.5" stroke-dasharray="3 2"/>`);
  }
  // lieu choisi (tranche)
  if (M.sel != null && M.samples[M.sel] && inWin(M.samples[M.sel].nm)) {
    const x = xOf(M.samples[M.sel].nm);
    out.push(`<line x1="${n1(x)}" y1="${t}" x2="${n1(x)}" y2="${n1(t + ph)}" stroke="var(--sog-accent)" stroke-width="1.5"/>`);
  }
  // axes
  const stepFt = levelStep(top);
  for (let ft = 0, every = levelEvery(ph); ft <= top; ft += stepFt) {
    if ((ft / stepFt) % every) continue;
    out.push(`<text x="${l - 5}" y="${n1(yOf(ft))}" text-anchor="end" dominant-baseline="middle" font-size="10" fill="var(--sog-muted)">${esc(ft ? o.fmtLvl(ft) : '0')}</text>`);
  }
  // graduations des distances : un pas rond, 46 px au moins entre deux, seulement dans la fenêtre
  const nmStep = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500].find(s => pw / ((nm1 - nm0) / s) > 46) || 500;
  for (let nm = Math.ceil(nm0 / nmStep - 1e-9) * nmStep; nm <= nm1 + 1e-9; nm += nmStep) out.push(`<text x="${n1(xOf(nm))}" y="${n1(t + ph + 4)}" text-anchor="middle" dominant-baseline="hanging" font-size="10" fill="var(--sog-muted)">${nm}</text>`);
  out.push(`<text x="${n1(l + pw)}" y="${n1(t + ph + 4)}" text-anchor="end" dominant-baseline="hanging" font-size="10" fill="var(--sog-muted)">NM</text>`,
    `<rect x="${l + 0.5}" y="${t + 0.5}" width="${n1(pw)}" height="${n1(ph)}" fill="none" stroke="var(--sog-border)"/>`);
  // bandes de surface : nébulosité basse, moyenne, haute, précipitations, visibilité < 8 km
  if (strips) {
    const rows = [
      [q => q.sfc.ccL, v => `rgba(${cloud},${n1(v / 100 * 0.85)})`],
      [q => q.sfc.ccM, v => `rgba(${cloud},${n1(v / 100 * 0.85)})`],
      [q => q.sfc.ccH, v => `rgba(${cloud},${n1(v / 100 * 0.85)})`],
      [q => q.sfc.precip, v => `rgba(42,120,214,${n1(clamp(v / 4, 0, 1) * 0.9)})`],
      [q => q.sfc.visM, v => v < 8000 ? `rgba(250,178,25,${n1(clamp((8000 - v) / 7000, 0.15, 1))})` : null]
    ];
    rows.forEach(([get, col], k) => {
      const y = t + ph + 18 + k * (SH + 2);
      out.push(`<text x="${l - 5}" y="${n1(y + SH / 2)}" text-anchor="end" dominant-baseline="middle" font-size="9" fill="var(--sog-muted)">${esc(o.labels?.strips?.[k] || '')}</text>`,
        `<rect x="${l}" y="${n1(y)}" width="${n1(pw)}" height="${SH}" fill="var(--sog-chart-grid)"/>`);
      M.samples.forEach((s, i) => {
        const v = get(M.cols[i]),
          c = v == null ? null : col(v);
        if (!c) return;
        const xa = i ? (xOf(M.samples[i - 1].nm) + xOf(s.nm)) / 2 : xOf(0),
          xb = i < M.samples.length - 1 ? (xOf(s.nm) + xOf(M.samples[i + 1].nm)) / 2 : xOf(total);
        out.push(`<rect x="${n1(xa)}" y="${n1(y)}" width="${n1(xb - xa)}" height="${SH}" fill="${c}" clip-path="url(#${id}-xclip)"/>`);
      });
    });
  }
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="${VARS};display:block;font-family:inherit">${out.join('')}</svg>`,
    geo: {
      x0: l,
      y0: t,
      pw,
      ph,
      xOf,
      yOf,
      nmOf: x => nm0 + clamp((x - l) / pw, 0, 1) * (nm1 - nm0),
      ftOf: y => clamp(1 - (y - t) / ph, 0, 1) * top,
      // ce qui a été dessiné : la fenêtre réellement prise (absente : la coupe entière), le haut de l'échelle, les bandes de
      // surface et les couches (pour la légende de l'appelant : INTEGRATION.md § 5)
      ...(win ? {
        window: {
          from: nm0,
          to: nm1
        }
      } : {}),
      top,
      strips,
      layers: L
    }
  };
}

/** Fenêtre demandée { from, to } (NM) bornée au vol, 1 NM au moins ; null si absente, invalide ou le vol entier. */
function windowOf(w, total) {
  if (!w || !Number.isFinite(w.from) || !Number.isFinite(w.to) || !(total > 0)) return null;
  const from = clamp(Math.min(w.from, w.to), 0, total),
    to = clamp(Math.max(w.from, w.to), 0, total);
  if (to - from < 1 || (from <= 1e-6 && to >= total - 1e-6)) return null;
  return {
    from,
    to
  };
}
/** Haut de l'échelle d'une fenêtre (ft) : le plus haut des niveaux du vol et du relief qu'elle montre, 1 500 ft au-dessus,
 *  arrondi au millier, jamais au-dessus du champ calculé ni sous 3 000 ft. */
function visibleTop(M, from, to) {
  let hi = 0;
  for (let k = 0; k <= 40; k++) {
    const nm = from + (to - from) * k / 40;
    hi = Math.max(hi, M.traj.requested(nm) || 0, M.traj.planned(nm) || 0, M.traj.computed(nm) || 0);
  }
  M.samples.forEach((s, i) => {
    if (s.nm >= from && s.nm <= to) hi = Math.max(hi, M.cols[i]?.sfc?.pa || 0);
  });
  return clamp(Math.ceil((hi + 1500) / 1000) * 1000, 3000, M.field.top);
}

/** Tranche verticale (sondage) d'une colonne : température, point de rosée, atmosphère type, inversions, nuages, vent,
 *  relief, et les niveaux du vol à cet endroit (lines [{ ft, color, dash }]).
 *  → { svg, geo { l, t, pw, ph, top, ftOf } }. */
export function soundingSvg(col, {
  width,
  height,
  minHeight = 0,
  top,
  lines = [],
  fmtLvl,
  cloudRgb = [96, 104, 116]
}) {
  const W = Math.max(200, width),
    H = Math.max(minHeight, MIN_H, height),
    l = gutter(Array.from({
      length: Math.floor(top / levelStep(top)) + 1
    }, (_, k) => k ? fmtLvl(k * levelStep(top)) : '0')),
    r = 62,
    t = 8,
    b = 18,
    pw = W - l - r,
    ph = H - t - b,
    prof = [];
  for (let ft = Math.max(0, col.sfc.pa); ft <= top; ft += 200) prof.push(A.at(col, ft));
  const temps = prof.flatMap(p => [p?.tC, p?.tdC]).filter(Number.isFinite),
    tMin = Math.floor((Math.min(...temps, A.isaC(top)) - 4) / 10) * 10,
    tMax = Math.ceil((Math.max(...temps, 15) + 4) / 10) * 10,
    X = tc => l + pw * (tc - tMin) / (tMax - tMin),
    Y = ft => t + ph * (1 - ft / top),
    out = [];
  out.push(`<rect x="${l}" y="${t}" width="${n1(pw)}" height="${n1(ph)}" fill="var(--sog-chart-bg)"/>`);
  const pat = `<defs><pattern id="at-sd-inv" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
    `<line x1="0" y1="0" x2="0" y2="7" stroke="var(--at-inv)" stroke-width="1.4"/></pattern></defs>`;
  out.push(pat);
  // grille des températures et des niveaux
  // une étiquette tous les 10 °C, ou 20 °C quand elles se toucheraient (moins de 30 px d'écart : colonne étroite)
  const tLab = pw / ((tMax - tMin) / 10) >= 30 ? 10 : 20;
  for (let tc = tMin; tc <= tMax; tc += 10) {
    out.push(`<line x1="${n1(X(tc))}" y1="${t}" x2="${n1(X(tc))}" y2="${n1(t + ph)}" stroke="${tc === 0 ? '#1c5cab' : 'var(--sog-chart-grid)'}" stroke-width="${tc === 0 ? 1.5 : 1}"/>`);
    if (!(tc % tLab)) out.push(`<text x="${n1(X(tc))}" y="${n1(t + ph + 4)}" text-anchor="middle" dominant-baseline="hanging" font-size="10" fill="var(--sog-muted)">${tc}°</text>`);
  }
  const stepFt = levelStep(top);
  for (let ft = 0; ft <= top; ft += stepFt) {
    out.push(`<line x1="${l}" y1="${n1(Y(ft))}" x2="${n1(l + pw)}" y2="${n1(Y(ft))}" stroke="var(--sog-chart-grid)"/>`);
    if (!((ft / stepFt) % levelEvery(ph))) out.push(`<text x="${l - 5}" y="${n1(Y(ft))}" text-anchor="end" dominant-baseline="middle" font-size="10" fill="var(--sog-muted)">${esc(ft ? fmtLvl(ft) : '0')}</text>`);
  }
  // inversions
  for (const v of A.inversions(col))
    if (v.fromFt < top) out.push(`<rect x="${l}" y="${n1(Y(Math.min(top, v.toFt)))}" width="${n1(pw)}" height="${n1(Y(v.fromFt) - Y(Math.min(top, v.toFt)))}" fill="url(#at-sd-inv)"/>`);
  // nuages (colonne à droite)
  prof.forEach(p => {
    if (!(p?.cc > 5)) return;
    out.push(`<rect x="${n1(l + pw + 4)}" y="${n1(Y(p.ft + 100))}" width="18" height="${n1(Y(p.ft - 100) - Y(p.ft + 100) + 0.5)}" fill="rgba(${cloudRgb},${n1(p.cc / 100 * 0.8)})"/>`);
  });
  // relief
  const g = Y(clamp(col.sfc.pa, 0, top));
  out.push(`<rect x="${l}" y="${n1(g)}" width="${n1(pw + r)}" height="${n1(t + ph - g)}" fill="var(--at-terrain)"/>`);
  // atmosphère type, température, point de rosée
  out.push(`<line x1="${n1(X(A.isaC(0)))}" y1="${n1(Y(0))}" x2="${n1(X(A.isaC(top)))}" y2="${n1(Y(top))}" stroke="var(--sog-muted)" stroke-width="1.2" stroke-dasharray="5 4"/>`);
  for (const [k, color] of [
      ['tdC', '#008300'],
      ['tC', '#e34948']
    ]) {
    const pts = prof.filter(p => p?.[k] != null).map(p => `${n1(X(p[k]))},${n1(Y(p.ft))}`);
    if (pts.length > 1) out.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`);
  }
  // niveaux du vol à cet endroit
  for (const ln of lines)
    if (ln.ft != null) out.push(`<line x1="${l}" y1="${n1(Y(ln.ft))}" x2="${n1(l + pw)}" y2="${n1(Y(ln.ft))}" stroke="${ln.color}" stroke-width="2"${ln.dash ? ` stroke-dasharray="${ln.dash}"` : ''}/>`);
  // vent
  let wb = '';
  for (let ft = Math.ceil((col.sfc.pa + 500) / stepFt) * stepFt; ft < top; ft += stepFt * (ph < 220 ? 2 : 1)) {
    const x = A.at(col, ft);
    if (x && !x.below) wb += barb(l + pw + 44, Y(ft), x.dirDeg, x.kt, ph < 200 ? 14 : 17);
  }
  out.push(`<g color="var(--sog-muted)">${wb}</g>`, `<rect x="${l + 0.5}" y="${t + 0.5}" width="${n1(pw)}" height="${n1(ph)}" fill="none" stroke="var(--sog-border)"/>`);
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="${VARS};display:block;font-family:inherit">${out.join('')}</svg>`,
    geo: {
      l,
      t,
      pw,
      ph,
      top,
      ftOf: y => clamp(1 - (y - t) / ph, 0, 1) * top
    }
  };
}

/** Légende du dessin (V3_SPECIFICATION § 7.1 règle 14) : les séries réellement dessinées, dans l'ordre de lecture, avec leur
 *  symbole. o : { kind ('cut' : la coupe, 'slice' : la tranche), layers (ceux de sectionSvg), strips (bandes de surface
 *  montrées), cloudRgb, t (texte d'une ligne [fr, en, de, es] dans la langue de l'appli ; sans elle, le français) }.
 *  → [{ key, label, labels [fr, en, de, es], swatch (SVG de 28 × 14, couleurs des dessins) }]. Pure (pas de DOM). */
export function sectionLegend({
  kind = 'cut',
  layers = {},
  strips = false,
  cloudRgb = [96, 104, 116],
  t = null
} = {}) {
  const L = layers,
    sw = inner => `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="14" viewBox="0 0 28 14" style="${VARS}" aria-hidden="true">${inner}</svg>`,
    line = (color, dash = '', w = 2) => sw(`<line x1="1" y1="7" x2="27" y2="7" stroke="${color}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`),
    box = fill => sw(`<rect x="1" y="2" width="26" height="10" rx="2" fill="${fill}"/>`),
    ramp = (stops, id) => sw(`<defs><linearGradient id="${id}">${stops.map((c, i) => `<stop offset="${i / (stops.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient></defs><rect x="1" y="2" width="26" height="10" rx="2" fill="url(#${id})"/>`),
    hatch = (pat, id) => sw(`<defs>${PATTERNS.replace(/at-p-/g, `${id}-`)}</defs><rect x="1" y="2" width="26" height="10" fill="url(#${id}-${pat})"/>`),
    cloud = `rgba(${cloudRgb},.75)`,
    rows = [],
    add = (key, text, swatch) => rows.push({
      key,
      labels: TX[text],
      label: t ? t(TX[text]) : TX[text][0],
      swatch
    });
  if (kind === 'slice') {
    add('tC', 'lgTemp', line('#e34948'));
    add('tdC', 'lgDew', line('#008300'));
    add('isa', 'lgIsa', line('var(--sog-muted)', '5 4', 1.2));
    add('computed', 'lgComputed', line('var(--at-computed)'));
    add('planned', 'lgPlanned', line('var(--at-planned)', '7 4'));
    add('requested', 'lgRequested', line('var(--at-requested)', '2 4'));
    add('inv', 'lgInv', hatch('inv', 'lg-sd'));
    add('cloud', 'lgCloudCol', ramp(['transparent', cloud], 'lg-sdc'));
    add('wind', 'lgWind', sw(`<g color="var(--sog-muted)">${barb(14, 7, 270, 65, 12)}</g>`));
    add('terrain', 'lgTerrain', box('var(--at-terrain)'));
    return rows;
  }
  add('computed', 'lgComputed', line('var(--at-computed)', '', 2.5));
  add('planned', 'lgPlanned', line('var(--at-planned)', '7 4'));
  add('requested', 'lgRequested', line('var(--at-requested)', '2 4'));
  add('toc', 'lgTocTod', sw('<circle cx="14" cy="7" r="3.5" fill="var(--at-computed)"/>'));
  if (L.cloud) add('cloud', 'lgCloud', ramp(['transparent', cloud], 'lg-c'));
  const fill = L.da ? 'da' : L.temp ? 'temp' : L.rh ? 'rh' : null;
  if (fill === 'temp') add('temp', 'lgTempFill', ramp([...BLUE.slice(0, 3), ...RED.slice(1)], 'lg-t'));
  if (fill === 'da') add('da', 'lgDaFill', ramp([...BLUE.slice(0, 3), ...RED.slice(1)], 'lg-d'));
  if (fill === 'rh') add('rh', 'lgRhFill', ramp(['rgba(42,120,214,0)', 'rgba(42,120,214,.6)'], 'lg-r'));
  if (L.iso) add('iso', 'lgIso', sw(
    '<line x1="1" y1="4" x2="27" y2="4" stroke="rgba(227,73,72,.8)" stroke-dasharray="4 3"/><line x1="1" y1="10" x2="27" y2="10" stroke="#1c5cab" stroke-width="2"/>'
  ));
  if (L.inv) add('inv', 'lgInv', hatch('inv', 'lg-i'));
  if (L.ice) add('ice', 'lgIce', hatch('ice2', 'lg-g'));
  if (L.wind) add('wind', 'lgWind', sw(`<g color="var(--sog-muted)">${barb(14, 7, 270, 65, 12)}</g>`));
  if (L.cu) add('cu', 'lgCu', line('var(--sog-muted)', '1 3', 1.2));
  add('terrain', 'lgTerrain', box('var(--at-terrain)'));
  add('points', 'lgPoints', sw('<line x1="14" y1="1" x2="14" y2="13" stroke="var(--sog-border)" stroke-dasharray="2 3"/>'));
  if (strips) add('strips', 'lgStrips', sw(`<rect x="1" y="1" width="26" height="3" fill="${cloud}"/><rect x="1" y="5.5" width="26" height="3" fill="rgba(42,120,214,.7)"/><rect x="1" y="10" width="26" height="3" fill="rgba(250,178,25,.8)"/>`));
  return rows;
}
