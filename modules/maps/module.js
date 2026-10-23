// V3 maps — module Carte de l'appli Pilote, monté par le cadre (frame/SPEC.md § 3.2 ; modules/maps/SPEC.md,
// INTEGRATION.md, READING.md). La carte de route du vol prévu (pilot/<tri>/current_flight.json écrit par Carburant)
// et son profil vertical, en lecture seule (lots 2 et 3) ; les cartes d'une mission redessinées d'après son YAML
// (missions/<l>_<FAMILLE>/<ID>/mission<ID>.yaml : emprise, profil d'affichage, points, zones, cheminement ; lot 4),
// adresse #maps?mission=<ID>&map=<fichier>.
//   · fond : tuiles OpenFreeMap (MapLibre, chargé au premier affichage, appelle lui-même les hôtes de meta.net) ;
//     sans tuiles (hors ligne, hôte refusé, pas de WebGL), fond uni avec les contours des pays (lib/outlines.js) ;
//   · surcouche aéronautique sur un canvas (render.js, sorti du studio) : espaces du couloir de la route, voies basses ou
//     hautes selon le niveau, aérodromes, balises, MORA, canevas, route avec marques de distance ;
//   · profil vertical sous la carte (profile.js, SiaProfile copié du studio) : relief des tuiles Terrarium ou MORA,
//     espaces traversés, trajectoire de Carburant (profile : TOC, TOD), marques NM ; un curseur commun aux deux vues
//     (doigt sur le profil, ou toucher sur la route), une ligne dit ce qui est dessous ;
//   · données par aerodb (ctx.aerodb), pour l'emprise utile seulement ; vol par ctx.data ; rien n'est écrit.
// Styles limités au module ([data-module="maps"]) : primitives f-… et jetons --sog-… du cadre ; le canvas prend les
// jetons de dessin (MapsRender.tokens / themed), relus et redessinés quand le design, le ton ou le thème du système
// changent ; la nuit, fond de carte sombre (OpenFreeMap dark).
export const meta = {
  id: 'maps',
  apps: ['pilot'],
  level: 1,
  // missions/ : lu à la demande seulement (dossiers lourds : PNG, versions, reçus), jamais tiré d'avance
  reads: ['pilot/', {
    prefix: 'missions/',
    policy: 'reference'
  }, 'cache/maps/'],
  // préréglage de carte choisi (propre à l'appareil, jamais synchronisé)
  writes: [{
    prefix: 'cache/maps/',
    policy: 'cache'
  }],
  // gardés à l'installation (hors ligne dès la première visite) : le noyau, les symboles, les contours du fond uni
  files: ['render.js?v=0', 'profile.js?v=0', 'mission.js?v=0', 'lib/aero_symbols.js?v=0', 'lib/vertical_profile.js?v=0',
    'lib/outlines.js?v=0', 'lib/profiles.js?v=0', '../../frame/lib/js-yaml.min.js?v=0'
  ],
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
    ['MapsMission', 'mission.js'],
    ['MAPS_PROFILES', 'lib/profiles.js'],
    ['MAPS_OUTLINES', 'lib/outlines.js'],
    ['jsyaml', '../../frame/lib/js-yaml.min.js']
  ],
  STYLE_URL = 'https://tiles.openfreemap.org/styles/positron',
  STYLE_NIGHT = 'https://tiles.openfreemap.org/styles/dark',
  // fond d'un profil d'affichage du studio : styles publiés d'OpenFreeMap et de VersaTiles ; le style maison du studio
  // (vector), OSM standard et OpenTopoMap (hôtes hors de meta.net) sont remplacés par positron
  STYLES = {
    'ofm-liberty': 'https://tiles.openfreemap.org/styles/liberty',
    'ofm-bright': 'https://tiles.openfreemap.org/styles/bright',
    'ofm-positron': 'https://tiles.openfreemap.org/styles/positron',
    'vt-colorful': 'https://tiles.versatiles.org/assets/styles/colorful/style.json',
    'vt-graybeard': 'https://tiles.versatiles.org/assets/styles/graybeard/style.json',
    'vt-shadow': 'https://tiles.versatiles.org/assets/styles/shadow/style.json',
    'vt-eclipse': 'https://tiles.versatiles.org/assets/styles/eclipse/style.json'
  },
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
  pick: ['Carte à montrer', 'Map to show', 'Anzuzeigende Karte', 'Mapa que mostrar'],
  flight: ['Vol prévu', 'Planned flight', 'Geplanter Flug', 'Vuelo previsto'],
  missionsGroup: ['Missions', 'Missions', 'Missionen', 'Misiones'],
  mapOf: ['Carte de la mission', 'Mission map', 'Karte der Mission', 'Mapa de la misión'],
  missionMissing: ['Mission introuvable dans le dépôt des données : {m}.', 'Mission not found in the data repository: {m}.',
    'Mission im Datenrepository nicht gefunden: {m}.', 'Misión no encontrada en el repositorio de datos: {m}.'
  ],
  missionBad: ['Mission illisible ({e}).', 'Unreadable mission ({e}).', 'Mission nicht lesbar ({e}).', 'Misión ilegible ({e}).'],
  noMaps: ['Cette mission ne déclare aucune carte : son cheminement seul est montré.',
    'This mission declares no map: only its route is shown.',
    'Diese Mission deklariert keine Karte: nur ihre Route wird gezeigt.',
    'Esta misión no declara ningún mapa: solo se muestra su ruta.'
  ],
  builtin: ['Profil d’affichage intégré « {p} » : la mission n’en porte pas encore la copie.',
    'Built-in display profile “{p}”: the mission does not carry its copy yet.',
    'Integriertes Anzeigeprofil „{p}“: die Mission enthält noch keine Kopie davon.',
    'Perfil de visualización integrado «{p}»: la misión aún no lleva su copia.'
  ],
  cycleDiff: ['Carte faite sur le cycle {a} ; base aéronautique du cycle {b}.',
    'Map made on cycle {a}; aeronautical database of cycle {b}.',
    'Karte mit Zyklus {a} erstellt; Luftfahrtdatenbank des Zyklus {b}.', 'Mapa hecho con el ciclo {a}; base aeronáutica del ciclo {b}.'
  ],
  preset: ['Préréglage de la carte', 'Map preset', 'Kartenvoreinstellung', 'Preajuste del mapa'],
  presets: {
    auto: ['Auto (niveau du vol)', 'Auto (flight level)', 'Auto (Flugfläche)', 'Auto (nivel del vuelo)'],
    low: ['IFR bas', 'Low IFR', 'IFR unten', 'IFR bajo'],
    high: ['IFR haut', 'High IFR', 'IFR oben', 'IFR alto'],
    vfr: ['VFR', 'VFR', 'VFR', 'VFR']
  },
  awHigh: ['voie haute', 'upper airway', 'oberer Flugweg', 'aerovía superior'],
  awLow: ['voie basse', 'lower airway', 'unterer Flugweg', 'aerovía inferior'],
  tipNone: ['Aucun espace choisi ici.', 'No airspace shown here.', 'Hier kein gezeigter Luftraum.',
    'Ningún espacio mostrado aquí.'
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

/** Style du fond : celui du profil d'affichage, de jour ; la nuit, le style sombre (VersaTiles : eclipse). */
const styleFor = () => S.theme?.dark ? /^vt-/.test(S.profile?.base || '') ? STYLES['vt-eclipse'] : STYLE_NIGHT : STYLES[S.profile?.base] ||
  STYLE_URL;
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
    // alt_ft (facultatif, Carburant, INTEGRATION § 3) : niveau tenu à partir du point, jamais au premier ni au dernier ;
    // le vol part à level.ft, un point sans alt_ft continue le précédent. Pour le profil : lvl (niveau à partir du
    // point), comme « /F240 » d'une route OFP ; paliers et TOC / TOD tronçon par tronçon
    raw = (f?.route?.points || []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon)),
    pts = raw.map((p, i) => ({
      id: p.id || '',
      lat: +p.lat,
      lon: +p.lon,
      ...(i > 0 && i < raw.length - 1 && p.alt_ft != null && +p.alt_ft > 0 ? {
        lvl: {
          ft: +p.alt_ft
        }
      } : {})
    }));
  if (pts.some(p => p.lvl) && +f?.level?.ft > 0) pts[0].lvl = {
    ft: +f.level.ft
  };
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
  const [airspaces, aerodromes, navaids, airways, moraCells, obstacles, cities, vrp, points] = await Promise.all([
    many(A.airspaces, boxes),
    E.aerodromes ? A.aerodromes(q) : [],
    E.navaids ? A.navaids(q) : [],
    E.airwaysLow || E.airwaysHigh ? many(A.airways, boxes) : [],
    E.mora ? A.moraCells(q) : [],
    E.obstacles ? A.obstacles({
      ...q,
      minHgt: +E.obstacleMin || 300
    }) : [],
    p.cities || E.agglos ? A.cities({
      ...q,
      n: 400
    }) : [],
    E.vrpPoints ? A.vrp(q) : [],
    E.rnavPoints ? A.points(q) : []
  ].map(x => Promise.resolve(x).catch(() => [])));
  return {
    box,
    data: {
      airspaces: MapsRender.selectAirspaces(airspaces, p, route),
      aerodromes,
      navaids,
      airways,
      moraCells,
      obstacles,
      cities,
      vrp,
      points
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
  } = view(W, H), raw = S.canvas.getContext('2d'), t = S.theme, ctx = MapsRender.themed(raw, t);
  raw.setTransform(dpr, 0, 0, dpr, 0, 0);
  raw.clearRect(0, 0, W, H);
  if (!S.map) MapsRender.drawBackground(ctx, toC, W, H, window.MAPS_OUTLINES, {
    sea: t.page,
    land: t.bg,
    border: t.grid
  });
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
  S.awHits = MapsRender.draw(ctx, {
    toC,
    W,
    H,
    scale: 1,
    bbox: shown,
    profile: S.profile,
    data: S.data?.data || {},
    route,
    marks: S.marks,
    theme: S.theme,
    mission: S.mission ? {
      points: S.mission.points,
      zones: S.mission.zones
    } : null
  })?.airways || [];
  if (S.route.altn && route.length) {
    // terrain de dégagement : rond gris et code, par-dessus le reste
    const q = toC(S.route.altn.lat, S.route.altn.lon);
    ctx.save();
    ctx.beginPath();
    ctx.arc(q.x, q.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = S.theme.bg;
    ctx.fill();
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '700 13px Arial,sans-serif';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = S.theme.bg;
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
    ctx.strokeStyle = S.theme.bg;
    ctx.lineWidth = 3;
    ctx.strokeText(name, q.x + 8, q.y - 9);
    ctx.fillText(name, q.x + 8, q.y - 9);
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

// ---------------------------------------------------------------- profil vertical
const FT_NM = 1852;
/** Coupe du vol : espaces de la route (types du profil, sans plancher ni plafond), relief (Terrarium), sinon MORA. */
async function buildProfile() {
  const pts = S.route.profilePoints || S.route.points,
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
      p = S.vprofProfile || S.profile;
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
  } = fit(S.pc, S.profBox), raw = S.pc.getContext('2d'), ctx = MapsRender.themed(raw, S.theme);
  raw.setTransform(dpr, 0, 0, dpr, 0, 0);
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
  // points des voies et balises à moins de 3 NM de la route : petit triangle et nom, au-dessus des marques NM
  const ends = new Map();
  for (const w of S.data?.data?.airways || [])
    for (const e of [w.a, w.b])
      if (e?.id) ends.set(e.id, e);
  for (const n of S.data?.data?.navaids || []) ends.set(n.id, n);
  const own = new Set(S.route.points.map(p => p.id)),
    marks = [];
  for (const e of ends.values()) {
    if (own.has(e.id)) continue; // points de la route : déjà nommés sous le cadre
    const pr = MapsProfile.project(S.prof, e.lat, e.lon);
    if (pr.s != null && pr.offNm <= 3) marks.push({
      id: e.id,
      x: MapsProfile.xOf(g, pr.s)
    });
  }
  marks.sort((a, b) => a.x - b.x);
  ctx.fillStyle = S.theme.fg;
  ctx.strokeStyle = S.theme.fg;
  ctx.font = '600 9px Arial,sans-serif';
  let lastX = -Infinity;
  for (const m of marks) {
    if (m.x - lastX < 30) continue;
    lastX = m.x;
    const y = yb - 22;
    ctx.beginPath();
    ctx.moveTo(m.x, y - 4);
    ctx.lineTo(m.x + 3.5, y + 2);
    ctx.lineTo(m.x - 3.5, y + 2);
    ctx.closePath();
    ctx.stroke();
    ctx.fillText(m.id, m.x, y - 5);
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
  ctx.strokeStyle = S.theme.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, g.padT);
  ctx.lineTo(x, g.H - g.padB);
  ctx.stroke();
  if (info.alt != null) {
    const y = g.padT + (g.H - g.padT - g.padB) * (1 - (Math.min(Math.max(info.alt, g.bottom), g.top) - g.bottom) / (g.top - g.bottom));
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = S.theme.accent;
    ctx.fill();
  }
  ctx.restore();
}
/** Hauteur lisible : « FL270 » au-dessus de 10 000 ft, sinon « 3 400 ft ». */
const altTxt = ft => ft >= 10000 ? `FL${String(Math.round(ft / 100)).padStart(3, '0')}` : `${Math.round(ft).toLocaleString(S.ctx.lang())} ft`;
/** Ligne sous le profil : distance, altitude prévue, relief ou MORA, espaces sous le curseur (notation SIA) ; l'aide sans curseur. */
function strip() {
  if (!S?.stripEl) return;
  let text = '';
  if (S.prof && S.cursor != null) {
    const i = MapsProfile.at(S.prof, S.cursor),
      zones = i.zones.map(z => MapsRender.sia(z)[0]); // notation SIA, comme l'infobulle
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
        style: styleFor(),
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
        if (!S) return;
        const s = S.prof ? MapsProfile.nearest(S.prof, (lat, lon) => map.project([lon, lat]), e.point.x, e.point.y) : null;
        if (s != null) {
          hideTips();
          return setCursor(s);
        }
        if (S.tipEl.hidden) mapTip(e.lngLat.lat, e.lngLat.lng, e.point.x, e.point.y);
        else hideTips(); // toucher suivant : fermée
      });
      let hover = 0;
      // survol à la souris seulement : un toucher est suivi d'événements souris de compatibilité, ignorés
      map.on('mousemove', e => {
        clearTimeout(hover);
        if (!S || fromTouch(e.originalEvent)) return;
        hover = setTimeout(() => S && mapTip(e.lngLat.lat, e.lngLat.lng, e.point.x, e.point.y), 450);
      });
      map.on('mouseout', e => {
        clearTimeout(hover);
        if (S && !fromTouch(e.originalEvent)) S.tipEl.hidden = true;
      });
      map.on('movestart', hideTips);
      finish(true);
    });
  });
}

// ---------------------------------------------------------------- infobulles des espaces (notation SIA)
/** Lignes d'infobulle des espaces : « TMA AQUITAINE 8 2000|FL145 D », activation et informations en dessous. */
const tipHtml = list => list.length ? list.map(a => {
  const [main, sub] = MapsRender.sia(a);
  return `<div><b>${esc(main)}</b>${sub ? `<br><span class="f-muted">${esc(sub)}</span>` : ''}</div>`;
}).join('') : `<div class="f-muted">${esc(tt(TX.tipNone))}</div>`;
/** Lignes d'infobulle des voies : « UN482 LMG → NEPIX », puis distance, routes vraies aller et retour, plancher|plafond
 *  et voie basse ou haute. */
const airwayHtml = list => list.map(g => {
  const R = MapsRender,
    high = (+g.lower || 0) >= 19500 || /^U/.test(g.route),
    sub = [Number.isFinite(+g.nm) ? `${Math.round(+g.nm)} NM` : '', g.a && g.b ? `${R.deg3(R.trackOf(g.a, g.b))} / ${R.deg3(R
      .trackOf(g.b, g.a))}` : '', `${R.awLimit(g.lower)}|${R.awLimit(g.upper)}`, tt(high ? TX.awHigh : TX.awLow)].filter(
      Boolean)
    .join(' · ');
  return `<div><b>${esc(`${g.route} ${g.a?.id || ''} → ${g.b?.id || ''}`)}</b><br><span class="f-muted">${esc(sub)}</span></div>`;
}).join('');
/** Infobulle dans un cadre (carte ou profil), à la position (x, y) du cadre ; écrite seulement si elle change. */
function showTip(tip, box, x, y, html) {
  if (tip.innerHTML !== html) tip.innerHTML = html;
  tip.hidden = false;
  const r = box.getBoundingClientRect(),
    w = tip.offsetWidth,
    h = tip.offsetHeight;
  tip.style.left = `${Math.max(4, Math.min(r.width - w - 4, x + 10))}px`;
  tip.style.top = `${Math.max(4, y - h - 10 < 4 ? y + 14 : y - h - 10)}px`;
}
/** Dernier toucher dans le module : les événements souris qui le suivent (compatibilité) ne sont pas un survol. */
let touchAt = -1e9;
const fromTouch = e => !!e?.sourceCapabilities?.firesTouchEvents || performance.now() - touchAt < 1000;
const hideTips = () => {
  if (S?.tipEl) S.tipEl.hidden = true;
  if (S?.ptipEl) S.ptipEl.hidden = true;
};
/** Infobulle de la carte en (x, y) : la voie dont le cartouche est sous le doigt, sinon les espaces montrés sous le
 *  point (lat, lon). */
function mapTip(lat, lon, x, y) {
  const ways = MapsRender.airwaysAt(S.awHits, x, y);
  showTip(S.tipEl, S.box, x, y, ways.length ? airwayHtml(ways.slice(0, 3)) : tipHtml(MapsRender.airspacesAt(S.data?.data
    ?.airspaces || [], lat, lon)));
}
/** Profil d'affichage choisi au préréglage : profil, données, fond, profil vertical refaits. */
async function setPreset(v) {
  S.preset = v;
  S.ctx.data.put('cache/maps/ui.json', {
    preset: v
  }).catch(() => {});
  const before = styleFor();
  S.profile = flightProfile();
  S.data = null;
  if (S.map && styleFor() !== before) S.map.setStyle(styleFor());
  schedule();
  buildProfile();
}

// ---------------------------------------------------------------- écran
/** Messages de l'état (vol, base, zone hors ligne, fond) ; écrits seulement s'ils changent. */
async function status() {
  if (!S) return;
  const out = [];
  if (S.missionError) out.push(`<p>${esc(S.missionError)}</p>`);
  else if (S.mission) {
    if (!S.mission.maps.length) out.push(`<p class="f-muted">${esc(tt(TX.noMaps))}</p>`);
    if (S.profileSource && S.profileSource !== 'copy') out.push(`<p class="f-muted">${esc(tt(TX.builtin, {
      p: S.profile?.name || S.profile?.id || ''
    }))}</p>`);
    const cyc = S.mapDef?.cycle,
      now = (await S.ctx.aerodb?.status().catch(() => null))?.cycle;
    if (S.mapDef?.cycle && now && S.mapDef.cycle !== now) out.push(`<p class="f-muted">${esc(tt(TX.cycleDiff, {
      a: cyc,
      b: now
    }))}</p>`);
  } else if (!S.route.points.length) out.push(
    `<p>${esc(tt(TX.noFlight))} <button type="button" class="f-btn" data-go="fuel">${esc(tt(TX.toFuel))}</button></p>`);
  if (!S.missionError && S.route.points.length) {
    const st = await S.ctx.aerodb?.status().catch(() => null);
    if (!st?.published || !Object.keys(st.published).length) out.push(`<p>${esc(tt(TX.noBase))}</p>`);
    else if (S.data?.empty && navigator.onLine === false) out.push(
      `<p>${esc(tt(TX.noZone))} <button type="button" class="f-btn" data-go="settings">${esc(tt(TX.toSettings))}</button></p>`);
  }
  if (S.plain && S.route.points.length) out.push(`<p class="f-muted">${esc(tt(TX.plain))}</p>`);
  if (S.prof && !S.prof.terrainOk) out.push(`<p class="f-muted">${esc(tt(TX.noTerrain))}</p>`);
  const html = out.join('');
  if (S.stEl.innerHTML !== html) S.stEl.innerHTML = html;
}
/** En-tête : départ → arrivée, dégagement, niveau, distance. */
function header() {
  if (S.mission) {
    const m = S.mapDef,
      text = [S.mission.id, S.mission.title, m ? m.description || m.file : ''].filter(Boolean).join(' · ');
    if (S.hdEl.textContent !== text) S.hdEl.textContent = text;
    return;
  }
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
/** Profil d'affichage du vol selon le préréglage : IFR bas ou haut (voies, espaces de la tranche, MORA, balises), VFR
 *  (profil « VFR détaillé » du studio sur un fond plus topographique), ou automatique selon le niveau du vol. */
function flightProfile() {
  if (S.preset === 'vfr') return {
    ...structuredClone(window.MAPS_PROFILES.find(x => x.id === 'vfr-detail') || MapsRender.routeProfile(0)),
    base: 'ofm-liberty'
  };
  return MapsRender.routeProfile(S.preset === 'low' ? 5000 : S.preset === 'high' ? 30000 : S.route.levelFt);
}
/** Emprise donnée par l'adresse (#maps?view=ouest,sud,est,nord), sinon null. */
const viewOf = () => {
  const v = String(S.ctx.query?.view || '').split(',').map(Number);
  return v.length === 4 && v.every(Number.isFinite) ? {
    w: v[0],
    s: v[1],
    e: v[2],
    n: v[3]
  } : null;
};
/** Vol (re)lu. live : écriture du vol courant pendant qu'on le regarde (vue double avec Carburant) — la vue reste où
 *  l'utilisateur l'a mise tant que la route y tient ; les zones déjà lues par aerodb ne sont pas relues. */
async function applyFlight(live = false) {
  S.route = await readFlight();
  if (!S) return;
  S.profile = flightProfile();
  const all = [...S.route.points, ...(S.route.altn ? [S.route.altn] : [])];
  S.fit = viewOf() || MapsRender.bboxOf(all, 25) || {
    w: -5,
    s: 41,
    e: 10,
    n: 51.5
  };
  S.marks = MapsRender.marks(S.route.points);
  S.data = null;
  if (!live) S.cursor = null;
  S.box.hidden = !S.route.points.length; // pas de vol : pas de carte, le message de l'état
  header();
  const inView = () => {
    const bb = S.map.getBounds();
    return all.every(p => p.lon >= bb.getWest() && p.lon <= bb.getEast() && p.lat >= bb.getSouth() && p.lat <= bb.getNorth());
  };
  if (S.map && !(live && inView())) S.map.fitBounds([
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

// ---------------------------------------------------------------- cartes de mission
const MISSION_YAML = /^missions\/[^/]+\/([^/]+)\/mission[^/]*\.ya?ml$/i;
/** Missions du dépôt (chemins du YAML de chaque dossier ; liste de l'arbre, rien n'est lu) : [{ id, path }]. */
async function missionList() {
  const paths = await S.ctx.data.list('missions/').catch(() => null) || [];
  return paths.map(path => ({
    id: MISSION_YAML.exec(path)?.[1],
    path
  })).filter(x => x.id).sort((a, b) => a.id.localeCompare(b.id));
}
/** Points du cheminement de la mission : route_points écrits par le studio, sinon le texte (vertical_profile.route,
 *  sinon départ, points tournants, destination) résolu par les points de la mission, puis par aerodb. */
async function missionRoute(mission) {
  const v = mission.vprof;
  if (v.routePoints.length >= 2) return v.routePoints;
  const text = MapsMission.routeTokens(mission),
    own = new Map(),
    K = MapsMission.keyNorm;
  for (const p of mission.points) {
    if (p.id) own.set(K(p.id), p);
    if (p.name) own.set(K(p.name), p);
  }
  for (const z of mission.zones) own.set(K(z.id), z);
  const ext = new Map();
  if (S.ctx.aerodb)
    for (const tok of new Set(text.split(/[\s,;]+/).map(t => t.split('/')[0].trim()).filter(Boolean)))
      if (!own.has(K(tok)) && /^[A-Z0-9]{2,5}$/i.test(tok)) {
        const c = await S.ctx.aerodb.coords(tok).catch(() => null);
        if (c) ext.set(tok.toUpperCase(), c);
      }
  const resolve = name => {
    const p = own.get(K(name)) || ext.get(String(name).toUpperCase());
    return p ? {
      name: p.id || name,
      lat: p.lat,
      lon: p.lon
    } : null;
  };
  try {
    // niveaux du texte gardés (lvl : niveau de croisière à partir du point ; alt : altitude à atteindre au point)
    return SiaProfile.parseRoute(text, resolve).points.map(p => ({
      id: p.name,
      lat: p.lat,
      lon: p.lon,
      ...(Number.isFinite(p.alt) ? {
        alt: p.alt
      } : {}),
      ...(p.lvl ? {
        lvl: p.lvl
      } : {})
    }));
  } catch {
    return [];
  }
}
/** Mission (re)lue et carte choisie : profil, emprise, cheminement tracé si la carte le demande, profil vertical. */
async function applyMission() {
  const q = S.ctx.query || {},
    list = await missionList(),
    hit = list.find(x => x.id === q.mission);
  S.missions = list;
  S.mission = null;
  S.missionError = '';
  if (!hit) S.missionError = tt(TX.missionMissing, {
    m: q.mission
  });
  else try {
    const r = await S.ctx.data.read(hit.path, {
        policy: 'reference',
        wait: true
      }),
      text = typeof r?.value === 'string' ? r.value : r?.text;
    if (!text) throw new Error('empty');
    S.mission = MapsMission.parse(window.jsyaml.load(text));
    S.mission.id ||= hit.id;
    S.missionRev = r.rev || '';
  } catch (e) {
    S.missionError = tt(TX.missionBad, {
      e: e?.message || e
    });
  }
  if (!S) return;
  const M = S.mission,
    m = M ? M.maps.find(x => x.file === q.map) || M.maps[0] || null : null,
    chosen = m ? MapsMission.profileFor(m, window.MAPS_PROFILES) : {
      profile: window.MAPS_PROFILES.find(p => p.id === 'ifr-simple'),
      source: 'builtin-type'
    };
  S.mapDef = m;
  S.profile = chosen.profile;
  S.profileSource = chosen.source;
  S.vprofProfile = M?.vprof.profileDef || window.MAPS_PROFILES.find(p => p.id === 'vprof') || null;
  const pts = M ? await missionRoute(M) : [];
  if (!S) return;
  const trace = m?.trace || (M?.vprof.onMap !== false && pts.length > 1 ? 'route' : 'none'),
    shown = trace === 'route' || trace === 'both' ? pts : [];
  S.route = {
    flight: {
      profile: M?.vprof.rates || null
    },
    points: shown,
    profilePoints: pts,
    altn: null,
    levelFt: M?.vprof.cruiseFt || 0,
    updated: `${q.mission}|${m?.file || ''}|${S.missionRev || ''}`
  };
  S.fit = viewOf() || m?.extent || MapsRender.bboxOf([...pts, ...(M?.points || [])], 10) || {
    w: -5,
    s: 41,
    e: 10,
    n: 51.5
  };
  S.marks = shown.length > 1 ? MapsRender.marks(shown) : [];
  S.data = null;
  S.cursor = null;
  S.box.hidden = !M;
  header();
  fillPick();
  status();
  schedule();
  buildProfile();
}
/** Choix de la carte : vol prévu, puis chaque mission du dépôt ; pour une mission, ses cartes. */
async function fillPick() {
  const q = S.ctx.query || {},
    list = S.missions || await missionList();
  if (!S) return;
  S.missions = list;
  const cur = q.mission ? `m:${q.mission}` : 'flight',
    html = `<option value="flight">${esc(tt(TX.flight))}</option>${list.length ? `<optgroup label="${esc(tt(TX.missionsGroup))}">${list.map(x => `<option value="m:${esc(x.id)}">${esc(x.id)}</option>`).join('')}</optgroup>` : ''}`;
  if (S.pickEl.innerHTML !== html) S.pickEl.innerHTML = html;
  S.pickEl.value = cur;
  const maps = S.mission?.maps || [],
    mh = maps.map(m => `<option value="${esc(m.file)}">${esc(m.description || m.file)}</option>`).join('');
  S.mapPickEl.hidden = maps.length < 2;
  if (S.mapPickEl.innerHTML !== mh) S.mapPickEl.innerHTML = mh;
  if (S.mapDef) S.mapPickEl.value = S.mapDef.file;
}
/** Adresse de la carte choisie (le cadre remonte le module sur sa nouvelle suite d'adresse). */
function go(mission, map) {
  location.hash = mission ? `#maps?mission=${encodeURIComponent(mission)}${map ? `&map=${encodeURIComponent(map)}` : ''}` : '#maps';
}

const STYLE = `
[data-module="maps"]{display:flex;flex-direction:column;gap:8px}
[data-module="maps"] .f-tools{margin-bottom:0}
[data-module="maps"] .mp-sum{flex:1 1 100%;font-variant-numeric:tabular-nums}
[data-module="maps"] .mp-picks{display:flex;flex-wrap:wrap;gap:6px;flex:1 1 100%;min-width:0}
[data-module="maps"] .mp-picks select{min-height:var(--sog-touch);min-width:0;width:100%;flex:1 1 140px;text-overflow:ellipsis}
[data-module="maps"] .mp-box{position:relative;height:52vh;min-height:260px;border:1px solid var(--sog-border);border-radius:var(--sog-radius);overflow:hidden;background:var(--sog-bg);touch-action:none}
[data-module="maps"] .mp-map{position:absolute;inset:0}
[data-module="maps"] canvas.mp-over{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
[data-module="maps"] .mp-credit{position:absolute;right:4px;bottom:2px;font-size:10px;color:var(--sog-fg);background:var(--sog-chart-bg);opacity:.85;padding:0 4px;border-radius:var(--sog-radius-s);pointer-events:none}
[data-module="maps"] .mp-prof{position:relative;height:clamp(200px,30vh,340px);border:1px solid var(--sog-border);border-radius:var(--sog-radius);overflow:hidden;background:var(--sog-chart-bg);touch-action:pan-y;cursor:crosshair}
[data-module="maps"] .mp-prof canvas{position:absolute;inset:0;width:100%;height:100%}
[data-module="maps"] .mp-strip{min-height:1.4em;font-size:.92em;font-variant-numeric:tabular-nums}
[data-module="maps"] .mp-status p{margin:4px 0}
[data-module="maps"] .mp-preset{position:absolute;left:8px;top:8px;z-index:3;min-height:var(--sog-touch);max-width:60%;font-size:.88em;padding-block:0}
[data-module="maps"] .mp-tip{position:absolute;z-index:4;max-width:min(92%,340px);padding:6px 8px;margin:0;font-size:.88em;line-height:1.35;pointer-events:none;box-shadow:0 2px 8px #0003}
[data-module="maps"] .mp-tip>div+div{margin-top:4px}
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
<div class="f-tools"><h1>${esc(ctx.t(TX.title))}</h1>
<button type="button" class="f-btn" data-go="fuel">${esc(ctx.t(TX.edit))}</button>
<button type="button" class="f-btn" data-fit>${esc(ctx.t(TX.fit))}</button>
<div class="mp-picks"><select class="mp-pick" aria-label="${esc(ctx.t(TX.pick))}"></select>
<select class="mp-mappick" hidden aria-label="${esc(ctx.t(TX.mapOf))}"></select></div>
<div class="mp-sum f-muted" aria-live="polite"></div></div>
<div class="mp-box"><div class="mp-map"></div><canvas class="mp-over" aria-hidden="true"></canvas>
<select class="mp-preset" aria-label="${esc(ctx.t(TX.preset))}">${['auto', 'low', 'high', 'vfr'].map(k => `<option value="${k}">${esc(ctx.t(TX.presets[k]))}</option>`).join('')}</select>
<div class="mp-tip f-card" hidden role="tooltip"></div>
<div class="mp-credit">${esc(ctx.t(TX.credit))}</div></div>
<div class="mp-prof" hidden role="img" aria-label="${esc(ctx.t(TX.profileLabel))}"><canvas class="mp-pc"></canvas><canvas class="mp-pcur"></canvas>
<div class="mp-tip f-card" hidden role="tooltip"></div></div>
<div class="mp-strip" aria-live="polite"></div>
<div class="mp-status" aria-live="polite"><p class="f-muted">${esc(ctx.t(TX.loading))}</p></div>`;
  Object.assign(S, {
    box: el.querySelector('.mp-box'),
    mapEl: el.querySelector('.mp-map'),
    canvas: el.querySelector('canvas.mp-over'),
    hdEl: el.querySelector('.mp-sum'),
    stEl: el.querySelector('.mp-status'),
    profBox: el.querySelector('.mp-prof'),
    pc: el.querySelector('canvas.mp-pc'),
    pcur: el.querySelector('canvas.mp-pcur'),
    stripEl: el.querySelector('.mp-strip'),
    pickEl: el.querySelector('.mp-pick'),
    mapPickEl: el.querySelector('.mp-mappick'),
    presetEl: el.querySelector('.mp-preset'),
    tipEl: el.querySelector('.mp-box .mp-tip'),
    ptipEl: el.querySelector('.mp-prof .mp-tip')
  });
  S.pickEl.addEventListener('change', () => {
    const v = S.pickEl.value;
    go(v.startsWith('m:') ? v.slice(2) : '', '');
  });
  S.mapPickEl.addEventListener('change', () => go(ctx.query?.mission, S.mapPickEl.value));
  // curseur commun : doigt (ou souris) sur le profil
  const onProf = e => {
    if (!S?.geo || (e.type === 'pointermove' && !e.buttons && e.pointerType !== 'mouse')) return;
    const r = S.profBox.getBoundingClientRect(),
      x = e.clientX - r.left;
    setCursor(MapsProfile.sOf(S.geo, x));
    const zones = MapsProfile.at(S.prof, S.cursor).zones;
    showTip(S.ptipEl, S.profBox, x, e.clientY - r.top, tipHtml(zones));
  };
  S.profBox.addEventListener('pointerleave', e => {
    if (e.pointerType === 'mouse') S.ptipEl.hidden = true;
  });
  el.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') touchAt = performance.now();
  }, true);
  S.profBox.addEventListener('pointerdown', onProf);
  S.profBox.addEventListener('pointermove', onProf);
  // toucher sur la carte près de la route (fond uni : la boîte reçoit le toucher ; MapLibre : son « click »)
  S.box.addEventListener('click', e => {
    if (S.map || e.target.closest('.mp-preset, .mp-tip')) return;
    const r = S.box.getBoundingClientRect(),
      x = e.clientX - r.left,
      y = e.clientY - r.top,
      v = MapsRender.mercator(S.fit, r.width, r.height, 12),
      s = S.prof ? MapsProfile.nearest(S.prof, v.toC, x, y) : null;
    if (s != null) {
      hideTips();
      return setCursor(s);
    }
    if (!S.tipEl.hidden) return hideTips();
    const ll = v.toLL(x, y);
    mapTip(ll.lat, ll.lon, x, y);
  });
  S.presetEl.addEventListener('change', () => setPreset(S.presetEl.value));
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
  S.theme = MapsRender.tokens();
  // design, ton ou thème du système changés : jetons relus, fond de nuit ou de jour, tout redessiné (observateur
  // d'attributs de <html> : réagit à l'événement, n'écrit rien dans la page)
  const onTheme = () => {
    if (!S) return;
    const t = MapsRender.tokens();
    if (JSON.stringify(t) === JSON.stringify(S.theme)) return;
    const night = t.dark !== S.theme.dark;
    S.theme = t;
    if (night && S.map) S.map.setStyle(styleFor());
    drawProfile();
    schedule();
  };
  const mq = matchMedia('(prefers-color-scheme: dark)'),
    mo = new MutationObserver(onTheme);
  mq.addEventListener('change', onTheme);
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-design', 'data-tone']
  });
  S.stops.push(() => mq.removeEventListener('change', onTheme), () => mo.disconnect());
  S.preset = ((await ctx.data.get('cache/maps/ui.json').catch(() => null)) || {}).preset || 'auto';
  S.presetEl.value = S.preset;
  S.presetEl.hidden = !!ctx.query?.mission; // une carte de mission garde son profil
  if (ctx.query?.mission) await applyMission();
  else {
    await applyFlight();
    fillPick();
  }
  if (!S) return;
  // fond à tuiles si possible, sinon fond uni (dit une fois)
  const tiles = S.route.points.length || S.mission ? await startTiles() : false;
  if (!S) return;
  if (!tiles) {
    S.plain = true;
    S.el.querySelector('.mp-credit').hidden = true;
  }
  status();
  schedule();
  // vue vivante : chaque écriture du vol courant (Carburant à côté) redessine carte et profil, 300 ms après la dernière
  let live = 0;
  if (!ctx.query?.mission) S.stops.push(ctx.data.watch(flightPath(), () => {
    clearTimeout(live);
    live = setTimeout(async () => {
      const f = await ctx.data.get(flightPath()).catch(() => null);
      if (S && (f?.updated_at || '') !== S.route.updated) {
        performance.mark('maps:live');
        await applyFlight(true);
      }
    }, 300);
  }), () => clearTimeout(live));
  else S.stops.push(ctx.data.watch('missions/', paths => {
    // le YAML de la mission montrée a changé (studio, nouvelle version) : relu
    if (S && (paths || []).some(p => MISSION_YAML.exec(p)?.[1] === ctx.query.mission)) applyMission();
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
