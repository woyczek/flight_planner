// V3 maps — module Carte de l'appli Pilote, monté par le cadre (frame/SPEC.md § 3.2 ; modules/maps/SPEC.md,
// INTEGRATION.md, READING.md). La carte de route du vol prévu (pilot/<tri>/current_flight.json écrit par Carburant)
// et son profil vertical, en lecture seule (lots 2 et 3).
//   · fond : tuiles OpenFreeMap (MapLibre, chargé au premier affichage, appelle lui-même les hôtes de meta.net) ;
//     sans tuiles (hors ligne, hôte refusé, pas de WebGL), fond uni avec les contours des pays (lib/outlines.js) ;
//   · surcouche aéronautique sur un canvas (render.js, sorti du studio) : espaces du couloir de la route, voies basses ou
//     hautes selon le niveau, aérodromes, balises, MORA, canevas, route avec marques de distance ;
//   · profil vertical sous la carte (profile.js, SiaProfile copié du studio) : relief des tuiles Terrarium ou MORA,
//     espaces traversés, trajectoire de Carburant (profile : TOC, TOD), marques NM ; un curseur commun aux deux vues
//     (doigt sur le profil, ou toucher sur la route), une ligne dit ce qui est dessous ;
//   · données par aerodb (ctx.aerodb), pour l'emprise utile seulement ; vol par ctx.data ; rien n'est écrit.
// Styles limités au module ([data-module="maps"]) sur les jetons --sog-… du cadre.
export const meta = {
  id: 'maps',
  apps: ['pilot'],
  level: 1,
  reads: ['pilot/'],
  writes: [],
  // gardés à l'installation (hors ligne dès la première visite) : le noyau, les symboles, les contours du fond uni
  files: ['render.js?v=0', 'profile.js?v=0', 'lib/aero_symbols.js?v=0', 'lib/vertical_profile.js?v=0', 'lib/outlines.js?v=0'],
  // gardés au premier usage seulement (MapLibre, 1 Mo, inutile sans tuiles)
  lazy: ['lib/maplibre-gl.js?v=0', 'lib/maplibre-gl.css?v=0'],
  // hôtes publics de tuiles appelés directement par MapLibre (jamais par ctx.net) ; CSP connect-src du cadre
  net: ['tiles.openfreemap.org', 'tiles.versatiles.org', 's3.amazonaws.com/elevation-tiles-prod']
};

const LIBS = [
    ['SiaAero', 'lib/aero_symbols.js'],
    ['SiaProfile', 'lib/vertical_profile.js'],
    ['MapsRender', 'render.js'],
    ['MapsProfile', 'profile.js'],
    ['MAPS_OUTLINES', 'lib/outlines.js']
  ],
  STYLE_URL = 'https://tiles.openfreemap.org/styles/positron',
  TILE_WAIT = 10e3; // fond pas prêt après ce délai : fond uni

// ---------------------------------------------------------------- textes [fr, en, de, es]
const TX = {
  title: ['Carte', 'Map', 'Karte', 'Mapa'],
  edit: ['Modifier la route', 'Edit the route', 'Route bearbeiten', 'Editar la ruta'],
  fit: ['Recentrer', 'Recentre', 'Zentrieren', 'Recentrar'],
  noFlight: ['Aucun vol prévu : préparez-le dans Carburant.', 'No planned flight: prepare it in Fuel.',
    'Kein geplanter Flug: im Kraftstoff vorbereiten.', 'Ningún vuelo previsto: prepárelo en Combustible.'
  ],
  toFuel: ['Ouvrir Carburant', 'Open Fuel', 'Kraftstoff öffnen', 'Abrir Combustible'],
  noBase: ['Base aéronautique non publiée : la carte ne montre que la route.',
    'Aeronautical database not published: the map shows the route only.',
    'Luftfahrtdatenbank nicht veröffentlicht: die Karte zeigt nur die Route.',
    'Base aeronáutica no publicada: el mapa solo muestra la ruta.'
  ],
  noZone: ['Hors ligne, sans les données de cette zone : gardez-la dans Réglages › Données hors ligne.',
    'Offline, without this zone’s data: keep it in Settings › Offline data.',
    'Offline, ohne die Daten dieser Zone: unter Einstellungen › Offline-Daten behalten.',
    'Sin conexión y sin los datos de esta zona: guárdela en Ajustes › Datos sin conexión.'
  ],
  toSettings: ['Données hors ligne', 'Offline data', 'Offline-Daten', 'Datos sin conexión'],
  plain: ['Fond de carte indisponible : fond uni.', 'Base map unavailable: plain background.',
    'Hintergrundkarte nicht verfügbar: einfarbiger Hintergrund.', 'Mapa de fondo no disponible: fondo liso.'
  ],
  loading: ['Chargement de la carte…', 'Loading the map…', 'Karte wird geladen…', 'Cargando el mapa…'],
  summary: ['{dep} → {arr}', '{dep} → {arr}', '{dep} → {arr}', '{dep} → {arr}'],
  altn: ['dégagement {a}', 'alternate {a}', 'Ausweich {a}', 'alternativa {a}'],
  dist: ['{d} NM', '{d} NM', '{d} NM', '{d} NM'],
  profileLabel: ['Profil vertical de la route', 'Vertical profile of the route', 'Vertikalprofil der Route',
    'Perfil vertical de la ruta'
  ],
  hint: ['Glissez le doigt sur le profil, ou touchez la route sur la carte.',
    'Slide a finger along the profile, or tap the route on the map.',
    'Mit dem Finger über das Profil fahren oder die Route auf der Karte antippen.',
    'Deslice el dedo por el perfil o toque la ruta en el mapa.'
  ],
  planned: ['prévu {a}', 'planned {a}', 'geplant {a}', 'previsto {a}'],
  terrain: ['relief {h}', 'terrain {h}', 'Gelände {h}', 'relieve {h}'],
  mora: ['MORA {h}', 'MORA {h}', 'MORA {h}', 'MORA {h}'],
  noZoneHere: ['hors espace choisi', 'outside the airspaces shown', 'außerhalb der gezeigten Lufträume',
    'fuera de los espacios mostrados'
  ],
  noTerrain: ['Relief indisponible : le profil montre les MORA des cases traversées.',
    'Terrain unavailable: the profile shows the MORA of the cells crossed.',
    'Gelände nicht verfügbar: das Profil zeigt die MORA der überflogenen Felder.',
    'Relieve no disponible: el perfil muestra las MORA de las celdas atravesadas.'
  ],
  credit: ['© OpenFreeMap © OpenStreetMap ; SIA : base publiée, non certifiée',
    '© OpenFreeMap © OpenStreetMap; SIA: published database, not certified',
    '© OpenFreeMap © OpenStreetMap; SIA: veröffentlichte Datenbank, nicht zertifiziert',
    '© OpenFreeMap © OpenStreetMap; SIA: base publicada, no certificada'
  ]
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
let S = null;
const tt = (row, v) => S.ctx.t(row, v);
const flightPath = () => `pilot/${S.ctx.identity?.trigram || 'ANON'}/current_flight.json`;

/** Charge le noyau (scripts du dossier du module, une fois par page). */
async function loadLibs() {
  for (const [glob, file] of LIBS)
    if (!window[glob]) await import(new URL(`${file}?v=0`, import.meta.url).href);
  // première visite : la page tourne avant que le service worker la contrôle ; relus une fois quand il prend la main
  const sw = navigator.serviceWorker;
  if (sw && !sw.controller) sw.addEventListener('controllerchange', () => {
    for (const [, file] of LIBS) fetch(new URL(`${file}?v=0`, import.meta.url)).catch(() => {});
  }, {
    once: true
  });
}
/** MapLibre (script UMD et sa feuille), chargé une fois, au premier fond à tuiles ; null s'il ne charge pas. */
let mlP = null;

function loadMapLibre() {
  return mlP ||= new Promise(ok => {
    if (window.maplibregl) return ok(window.maplibregl);
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = new URL('lib/maplibre-gl.css?v=0', import.meta.url).href;
    document.head.append(css);
    const sc = document.createElement('script');
    sc.src = new URL('lib/maplibre-gl.js?v=0', import.meta.url).href;
    sc.onload = () => ok(window.maplibregl || null);
    sc.onerror = () => {
      mlP = null;
      ok(null);
    };
    document.head.append(sc);
  });
}

// ---------------------------------------------------------------- vol
/** Points de la route (route.points, positions résolues par Carburant) et dégagement (aerodb). */
async function readFlight() {
  const f = (await S.ctx.data.get(flightPath()).catch(() => null)) || null,
    pts = (f?.route?.points || []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon)).map(p => ({
      id: p.id || '',
      lat: +p.lat,
      lon: +p.lon
    }));
  let altn = null;
  if (f?.route?.altn && pts.length && S.ctx.aerodb) {
    const c = await S.ctx.aerodb.coords(f.route.altn).catch(() => null);
    if (c) altn = {
      id: f.route.altn,
      lat: c.lat,
      lon: c.lon
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
/** Emprise des données à lire pour la vue montrée : vue d'ensemble (vue au moins aussi large que la route) → l'emprise
 *  de la route (la carte n'y montre que ce qui est près de la route) ; vue rapprochée → la vue élargie de 15 %. */
const wantBox = shown => (shown.e - shown.w) >= (S.fit.e - S.fit.w) * .9 ? S.fit : enlarge(shown, .15);
/** Éléments de l'emprise box selon le profil. */
async function loadData(box) {
  const A = S.ctx.aerodb;
  if (!A) return {
    box: {
      w: -180,
      e: 180,
      s: -85,
      n: 85
    },
    data: {},
    empty: true
  };
  const q = {
      bbox: [box.w, box.s, box.e, box.n]
    },
    p = S.profile,
    E = p.elements,
    route = [...S.route.points, ...(S.route.altn ? [S.route.altn] : [])],
    // profil à couloir : espaces et voies lus pour le couloir de la route, tronçon par tronçon (un rectangle autour
    // d'une route en diagonale touche des zones voisines : l'Espagne pour une route Nantes → Marseille)
    boxes = +p.corridorNm > 0 ? corridorBoxes(route, +p.corridorNm + 2, box) : [q.bbox];
  const [airspaces, aerodromes, navaids, airways, moraCells, obstacles] = await Promise.all([
    many(A.airspaces, boxes),
    E.aerodromes ? A.aerodromes(q) : [],
    E.navaids ? A.navaids(q) : [],
    E.airwaysLow || E.airwaysHigh ? many(A.airways, boxes) : [],
    E.mora ? A.moraCells(q) : [],
    E.obstacles ? A.obstacles({
      ...q,
      minHgt: +E.obstacleMin || 300
    }) : []
  ].map(x => Promise.resolve(x).catch(() => [])));
  return {
    box,
    data: {
      airspaces: MapsRender.selectAirspaces(airspaces, p, route),
      aerodromes,
      navaids,
      airways,
      moraCells,
      obstacles
    },
    empty: !airspaces.length && !aerodromes.length && !navaids.length
  };
}
const within = (inner, outer) => outer && inner.w >= outer.w && inner.e <= outer.e && inner.s >= outer.s && inner.n <= outer.n;
/** Emprises du couloir de la route (marge nm NM), une par tronçon, coupées à l'emprise box : [[ouest, sud, est, nord]]. */
function corridorBoxes(route, nm, box) {
  const out = [];
  for (let i = 1; i < route.length; i++) {
    const b = MapsRender.bboxOf([route[i - 1], route[i]], nm),
      c = [Math.max(box.w, b.w), Math.max(box.s, b.s), Math.min(box.e, b.e), Math.min(box.n, b.n)];
    if (c[0] <= c[2] && c[1] <= c[3]) out.push(c);
  }
  return out;
}
/** Réunion sans doublons des réponses d'une requête aerodb sur plusieurs emprises. */
async function many(f, boxes) {
  const seen = new Set(),
    out = [];
  for (const bbox of boxes)
    for (const x of await f({
        bbox
      }))
      if (!seen.has(x)) {
        seen.add(x);
        out.push(x);
      }
  return out;
}

// ---------------------------------------------------------------- dessin
/** Taille du canvas de surcouche à celle de la carte (pixels de l'écran). */
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
  return {
    W,
    H,
    dpr
  };
}
/** Vue courante : projection et emprise affichée (MapLibre, sinon Mercator du fond uni sur l'emprise de la route). */
function view(W, H) {
  if (S.map) {
    const bb = S.map.getBounds();
    return {
      toC: (lat, lon) => S.map.project([lon, lat]),
      shown: {
        w: bb.getWest(),
        e: bb.getEast(),
        s: bb.getSouth(),
        n: bb.getNorth()
      }
    };
  }
  return MapsRender.mercator(S.fit, W, H, 12);
}
/** Redessine la surcouche (et le fond uni sans tuiles) ; données relues si la vue sort de celles chargées. */
function draw() {
  if (!S?.canvas || !S.fit || !S.route.points.length) return;
  const {
    W,
    H,
    dpr
  } = sizeCanvas(), {
    toC,
    shown
  } = view(W, H), ctx = S.canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (!S.map) MapsRender.drawBackground(ctx, toC, W, H, window.MAPS_OUTLINES);
  const route = S.route.points;
  if (S.route.altn && route.length) {
    // dégagement : tireté gris de l'arrivée au terrain de dégagement
    const a = toC(route[route.length - 1].lat, route[route.length - 1].lon),
      b = toC(S.route.altn.lat, S.route.altn.lon);
    ctx.save();
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }
  MapsRender.draw(ctx, {
    toC,
    W,
    H,
    scale: 1,
    bbox: shown,
    profile: S.profile,
    data: S.data?.data || {},
    route,
    marks: S.marks
  });
  if (S.route.altn && route.length) {
    // terrain de dégagement : rond gris et code, par-dessus le reste
    const q = toC(S.route.altn.lat, S.route.altn.lon);
    ctx.save();
    ctx.beginPath();
    ctx.arc(q.x, q.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '700 13px Arial,sans-serif';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.strokeText(S.route.altn.id, q.x + 8, q.y);
    ctx.fillStyle = '#4b5563';
    ctx.fillText(S.route.altn.id, q.x + 8, q.y);
    ctx.restore();
  }
  drawPlanOnMap(ctx, toC);
  if (S.data && !S.drawn) {
    S.drawn = true;
    performance.mark('maps:first-draw'); // premier dessin avec les données (mesures : DECISIONS.md)
  }
  const want = wantBox(shown);
  if (!within(want, S.data?.box)) refresh(want);
}
/** TOC et TOD (losanges) et curseur commun (rond) sur la carte, aux distances de la coupe. */
function drawPlanOnMap(ctx, toC) {
  const pr = S.prof,
    col = '#6a1b9a';
  if (!pr) return;
  ctx.save();
  ctx.font = '700 12px Arial,sans-serif';
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
    ctx.moveTo(q.x, q.y - 6);
    ctx.lineTo(q.x + 6, q.y);
    ctx.lineTo(q.x, q.y + 6);
    ctx.lineTo(q.x - 6, q.y);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.strokeText(name, q.x + 8, q.y - 9);
    ctx.fillText(name, q.x + 8, q.y - 9);
  }
  if (S.cursor != null) {
    const g = MapsProfile.posAt(pr, S.cursor),
      q = toC(g.lat, g.lon);
    ctx.beginPath();
    ctx.arc(q.x, q.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(29,111,216,.25)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1d6fd8';
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- profil vertical
const FT_NM = 1852;
/** Coupe du vol : espaces de la route (types du profil, sans plancher ni plafond), relief (Terrarium), sinon MORA. */
async function buildProfile() {
  const pts = S.route.points,
    A = S.ctx.aerodb;
  S.prof = null;
  S.geo = null;
  if (pts.length < 2) return drawProfile();
  const key = S.route.updated;
  let airspaces = [];
  if (A) {
    const list = await many(A.airspaces, corridorBoxes(pts, 2, {
        w: -180,
        e: 180,
        s: -85,
        n: 85
      })).catch(() => []),
      p = S.profile;
    airspaces = MapsRender.selectAirspaces(list, {
      ...p,
      corridorNm: 0,
      elements: {
        ...p.elements,
        zoneFloor: '',
        zoneCeil: ''
      }
    }, pts);
  }
  S.terrain ||= SiaProfile.terrainSampler(9);
  const prof = await MapsProfile.build(pts, {
    levelFt: S.route.levelFt,
    profile: S.route.flight?.profile || null,
    airspaces,
    elevation: navigator.onLine === false ? null : S.terrain,
    mora: A ? (lat, lon) => A.mora(lat, lon) : null
  }).catch(() => null);
  if (!S || S.route.updated !== key) return;
  S.prof = prof;
  performance.mark('maps:profile');
  drawProfile();
  strip();
  status();
  schedule();
}
/** Taille d'un canvas à son cadre (pixels de l'écran) : { W, H, dpr }. */
function fit(c, box) {
  const r = box.getBoundingClientRect(),
    dpr = Math.min(3, window.devicePixelRatio || 1),
    W = Math.max(1, Math.round(r.width)),
    H = Math.max(1, Math.round(r.height));
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
  }
  return {
    W,
    H,
    dpr
  };
}
/** Coupe dessinée (SiaProfile), marques NM en bas du cadre, puis le curseur. */
function drawProfile() {
  if (!S?.pc) return;
  S.profBox.hidden = !S.prof;
  if (!S.prof) return;
  const {
    W,
    H,
    dpr
  } = fit(S.pc, S.profBox), ctx = S.pc.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  S.geo = MapsProfile.draw(ctx, S.prof, {
    W,
    H,
    scale: W < 500 ? .78 : 1
  });
  // marques NM (mêmes que sur la carte) : petits traits au bas du cadre
  const g = S.geo,
    yb = g.H - g.padB;
  ctx.save();
  ctx.strokeStyle = '#8e24aa';
  ctx.fillStyle = '#8e24aa';
  ctx.font = '600 9px Arial,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const m of S.marks || []) {
    const x = MapsProfile.xOf(g, m.nm * FT_NM);
    ctx.beginPath();
    ctx.moveTo(x, yb);
    ctx.lineTo(x, yb - 6);
    ctx.stroke();
    ctx.fillText(String(m.nm), x, yb - 7);
  }
  ctx.restore();
  drawCursor();
}
/** Curseur sur le profil (trait vertical, point sur l'altitude prévue). */
function drawCursor() {
  if (!S?.pcur || !S.geo) return;
  const {
    W,
    H,
    dpr
  } = fit(S.pcur, S.profBox), ctx = S.pcur.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (S.cursor == null) return;
  const g = S.geo,
    x = MapsProfile.xOf(g, S.cursor),
    info = MapsProfile.at(S.prof, S.cursor);
  ctx.save();
  ctx.strokeStyle = '#1d6fd8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, g.padT);
  ctx.lineTo(x, g.H - g.padB);
  ctx.stroke();
  if (info.alt != null) {
    const y = g.padT + (g.H - g.padT - g.padB) * (1 - (Math.min(Math.max(info.alt, g.bottom), g.top) - g.bottom) / (g.top - g.bottom));
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#1d6fd8';
    ctx.fill();
  }
  ctx.restore();
}
/** Hauteur lisible : « FL270 » au-dessus de 10 000 ft, sinon « 3 400 ft ». */
const altTxt = ft => ft >= 10000 ? `FL${String(Math.round(ft / 100)).padStart(3, '0')}` : `${Math.round(ft).toLocaleString(S.ctx.lang())} ft`;
/** Ligne sous le profil : distance, altitude prévue, relief ou MORA, espaces sous le curseur ; l'aide sans curseur. */
function strip() {
  if (!S?.stripEl) return;
  let text = '';
  if (S.prof && S.cursor != null) {
    const i = MapsProfile.at(S.prof, S.cursor),
      zones = i.zones.map(z => `${z.type} ${z.name} (${z.lower} – ${z.upper})`);
    text = [tt(TX.dist, {
      d: i.nm.toFixed(i.nm < 10 ? 1 : 0)
    }), i.alt != null ? tt(TX.planned, {
      a: altTxt(i.alt)
    }) : '', i.terrain != null ? tt(TX.terrain, {
      h: altTxt(i.terrain)
    }) : Number.isFinite(i.mora) ? tt(TX.mora, {
      h: altTxt(i.mora)
    }) : '', zones.length ? zones.join(', ') : tt(TX.noZoneHere)].filter(Boolean).join(' · ');
  } else if (S.prof) text = tt(TX.hint);
  if (S.stripEl.textContent !== text) S.stripEl.textContent = text;
}
/** Curseur commun à la distance s (mètres ; null : effacé). */
function setCursor(s) {
  S.cursor = s;
  drawCursor();
  strip();
  schedule();
}

let frame = 0;
const schedule = () => {
  if (!frame) frame = requestAnimationFrame(() => {
    frame = 0;
    draw();
  });
};
/** Relit les éléments pour l'emprise b (une lecture à la fois ; la dernière demandée gagne). */
async function refresh(b) {
  if (!S || S.loadingFor) {
    if (S) S.pending = b;
    return;
  }
  S.loadingFor = b;
  try {
    const got = await loadData(b).catch(() => ({
      box: b,
      data: {},
      empty: true
    })); // lecture en échec : rien cette fois, relue quand la vue sort de b
    if (!S) return;
    S.data = got;
    status();
  } finally {
    if (S) {
      S.loadingFor = null;
      const next = S.pending;
      S.pending = null;
      if (next && !within(next, S.data?.box)) refresh(next);
      else schedule();
    }
  }
}

// ---------------------------------------------------------------- fond à tuiles
/** Fond MapLibre sur l'emprise de la route ; false s'il ne vient pas (pas de réseau, pas de WebGL, hôte refusé). */
async function startTiles() {
  if (navigator.onLine === false) return false;
  const ml = await loadMapLibre();
  if (!ml || !S) return false;
  return new Promise(ok => {
    let map, done = false;
    const finish = v => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (!v && map) try {
        map.remove();
      } catch {
        /* déjà retirée */
      }
      ok(v);
    };
    const timer = setTimeout(() => finish(false), TILE_WAIT);
    try {
      map = new ml.Map({
        container: S.mapEl,
        style: STYLE_URL,
        bounds: [
          [S.fit.w, S.fit.s],
          [S.fit.e, S.fit.n]
        ],
        fitBoundsOptions: {
          padding: 12
        },
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        renderWorldCopies: false
      });
    } catch {
      return finish(false); // pas de WebGL
    }
    map.touchZoomRotate.disableRotation();
    map.on('style.load', () => {
      try {
        if (map.getProjection?.()?.type !== 'mercator') map.setProjection({
          type: 'mercator'
        });
      } catch {
        /* version sans projection réglable : Mercator */
      }
    });
    map.on('error', () => finish(false));
    map.on('load', () => {
      if (!S) return finish(false);
      S.map = map;
      map.on('move', schedule);
      map.on('moveend', schedule);
      map.on('click', e => {
        if (!S?.prof) return;
        const s = MapsProfile.nearest(S.prof, (lat, lon) => map.project([lon, lat]), e.point.x, e.point.y);
        if (s != null) setCursor(s);
      });
      finish(true);
    });
  });
}

// ---------------------------------------------------------------- écran
/** Messages de l'état (vol, base, zone hors ligne, fond) ; écrits seulement s'ils changent. */
async function status() {
  if (!S) return;
  const out = [];
  if (!S.route.points.length) out.push(`<p>${esc(tt(TX.noFlight))} <button type="button" class="f-btn" data-go="fuel">${esc(tt(TX.toFuel))}</button></p>`);
  else {
    const st = await S.ctx.aerodb?.status().catch(() => null);
    if (!st?.published || !Object.keys(st.published).length) out.push(`<p>${esc(tt(TX.noBase))}</p>`);
    else if (S.data?.empty && navigator.onLine === false) out.push(
      `<p>${esc(tt(TX.noZone))} <button type="button" class="f-btn" data-go="settings">${esc(tt(TX.toSettings))}</button></p>`);
  }
  if (S.plain && S.route.points.length) out.push(`<p class="mp-muted">${esc(tt(TX.plain))}</p>`);
  if (S.prof && !S.prof.terrainOk) out.push(`<p class="mp-muted">${esc(tt(TX.noTerrain))}</p>`);
  const html = out.join('');
  if (S.stEl.innerHTML !== html) S.stEl.innerHTML = html;
}
/** En-tête : départ → arrivée, dégagement, niveau, distance. */
function header() {
  const f = S.route.flight,
    r = f?.route || {},
    lvl = S.route.levelFt ? (S.route.levelFt >= 10000 ? `FL${Math.round(S.route.levelFt / 100)}` : `${S.route.levelFt} ft`) : '',
    d = S.route.points.length >= 2 ? MapsRender.distances(S.route.points).pop() : 0,
    parts = [r.dep || r.arr ? tt(TX.summary, {
      dep: r.dep || '?',
      arr: r.arr || '?'
    }) : '', r.altn ? tt(TX.altn, {
      a: r.altn
    }) : '', lvl, d ? tt(TX.dist, {
      d: Math.round(d)
    }) : '', f?.aircraft?.type || ''].filter(Boolean),
    text = parts.join(' · ');
  if (S.hdEl.textContent !== text) S.hdEl.textContent = text;
}
/** Vol (re)lu : profil selon le niveau, emprise, marques, données, fond. */
async function applyFlight() {
  S.route = await readFlight();
  if (!S) return;
  S.profile = MapsRender.routeProfile(S.route.levelFt);
  const all = [...S.route.points, ...(S.route.altn ? [S.route.altn] : [])];
  S.fit = MapsRender.bboxOf(all, 25) || {
    w: -5,
    s: 41,
    e: 10,
    n: 51.5
  };
  S.marks = MapsRender.marks(S.route.points);
  S.data = null;
  S.cursor = null;
  S.box.hidden = !S.route.points.length; // pas de vol : pas de carte, le message de l'état
  header();
  if (S.map) S.map.fitBounds([
    [S.fit.w, S.fit.s],
    [S.fit.e, S.fit.n]
  ], {
    padding: 12,
    animate: false
  });
  status();
  schedule();
  buildProfile();
}

const STYLE = `
[data-module="maps"]{display:flex;flex-direction:column;gap:8px}
[data-module="maps"] .mp-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
[data-module="maps"] .mp-head h1{font-size:1.25rem;margin:0}
[data-module="maps"] .mp-sum{flex:1 1 100%;color:var(--sog-muted);font-variant-numeric:tabular-nums}
[data-module="maps"] .mp-box{position:relative;height:52vh;min-height:260px;border:1px solid var(--sog-border);border-radius:var(--sog-radius);overflow:hidden;background:#dfe9f2;touch-action:none}
[data-module="maps"] .mp-map{position:absolute;inset:0}
[data-module="maps"] canvas.mp-over{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
[data-module="maps"] .mp-credit{position:absolute;right:4px;bottom:2px;font-size:10px;color:#333;background:#fffc;padding:0 4px;border-radius:3px;pointer-events:none}
[data-module="maps"] .mp-prof{position:relative;height:clamp(200px,30vh,340px);border:1px solid var(--sog-border);border-radius:var(--sog-radius);overflow:hidden;background:#fff;touch-action:pan-y;cursor:crosshair}
[data-module="maps"] .mp-prof canvas{position:absolute;inset:0;width:100%;height:100%}
[data-module="maps"] .mp-strip{min-height:1.4em;font-size:.92em;font-variant-numeric:tabular-nums}
[data-module="maps"] .mp-status p{margin:4px 0}
[data-module="maps"] .mp-muted{color:var(--sog-muted);font-size:.9em}
`;

export async function mount(el, ctx) {
  performance.mark('maps:mount');
  S = {
    el,
    ctx,
    stops: [],
    route: {
      points: []
    },
    map: null,
    plain: false
  };
  el.innerHTML = `<style>${STYLE}</style>
<div class="mp-head"><h1>${esc(ctx.t(TX.title))}</h1>
<button type="button" class="f-btn" data-go="fuel">${esc(ctx.t(TX.edit))}</button>
<button type="button" class="f-btn" data-fit>${esc(ctx.t(TX.fit))}</button>
<div class="mp-sum" aria-live="polite"></div></div>
<div class="mp-box"><div class="mp-map"></div><canvas class="mp-over" aria-hidden="true"></canvas>
<div class="mp-credit">${esc(ctx.t(TX.credit))}</div></div>
<div class="mp-prof" hidden role="img" aria-label="${esc(ctx.t(TX.profileLabel))}"><canvas class="mp-pc"></canvas><canvas class="mp-pcur"></canvas></div>
<div class="mp-strip" aria-live="polite"></div>
<div class="mp-status" aria-live="polite"><p class="mp-muted">${esc(ctx.t(TX.loading))}</p></div>`;
  Object.assign(S, {
    box: el.querySelector('.mp-box'),
    mapEl: el.querySelector('.mp-map'),
    canvas: el.querySelector('canvas.mp-over'),
    hdEl: el.querySelector('.mp-sum'),
    stEl: el.querySelector('.mp-status'),
    profBox: el.querySelector('.mp-prof'),
    pc: el.querySelector('canvas.mp-pc'),
    pcur: el.querySelector('canvas.mp-pcur'),
    stripEl: el.querySelector('.mp-strip')
  });
  // curseur commun : doigt (ou souris) sur le profil
  const onProf = e => {
    if (!S?.geo || (e.type === 'pointermove' && !e.buttons && e.pointerType !== 'mouse')) return;
    const r = S.profBox.getBoundingClientRect();
    setCursor(MapsProfile.sOf(S.geo, e.clientX - r.left));
  };
  S.profBox.addEventListener('pointerdown', onProf);
  S.profBox.addEventListener('pointermove', onProf);
  // toucher sur la carte près de la route (fond uni : la boîte reçoit le toucher ; MapLibre : son « click »)
  S.box.addEventListener('click', e => {
    if (S.map || !S.prof) return;
    const r = S.box.getBoundingClientRect(),
      v = MapsRender.mercator(S.fit, r.width, r.height, 12),
      s = MapsProfile.nearest(S.prof, v.toC, e.clientX - r.left, e.clientY - r.top);
    if (s != null) setCursor(s);
  });
  el.addEventListener('click', e => {
    const go = e.target.closest('[data-go]')?.dataset.go;
    if (go) location.hash = `#${go}`;
    if (e.target.closest('[data-fit]')) {
      if (S.map) S.map.fitBounds([
        [S.fit.w, S.fit.s],
        [S.fit.e, S.fit.n]
      ], {
        padding: 12
      });
      else schedule();
    }
  });
  await loadLibs();
  if (!S) return;
  await applyFlight();
  if (!S) return;
  // fond à tuiles si possible, sinon fond uni (dit une fois)
  const tiles = S.route.points.length ? await startTiles() : false;
  if (!S) return;
  if (!tiles) {
    S.plain = true;
    S.el.querySelector('.mp-credit').hidden = true;
  }
  status();
  schedule();
  S.stops.push(ctx.data.watch(flightPath(), async () => {
    const f = await ctx.data.get(flightPath()).catch(() => null);
    if (S && (f?.updated_at || '') !== S.route.updated) applyFlight();
  }));
  if (ctx.aerodb?.on) S.stops.push(ctx.aerodb.on('change', () => {
    if (!S) return;
    S.data = null;
    schedule();
  }));
  const ro = new ResizeObserver(() => {
    S?.map?.resize();
    schedule();
  });
  ro.observe(S.box);
  const rp = new ResizeObserver(() => drawProfile());
  rp.observe(S.profBox);
  S.stops.push(() => ro.disconnect(), () => rp.disconnect());
}

export function unmount() {
  if (!S) return;
  for (const f of S.stops) try {
    f?.();
  } catch {
    /* déjà arrêté */
  }
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  try {
    S.map?.remove();
  } catch {
    /* déjà retirée */
  }
  S = null;
}
