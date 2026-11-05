// V3 data — dessine la carte des zones à cocher (SPEC § 5.5, § 11) sur le socle de carte (modules/maps/lib/map_base.js) : le cadre de la carte, la carte MapLibre qui vit dans un hôte à elle, les zones remplies de la teinte de leur état, une zone cochée ou décochée dans la sélection du module. N'écrit rien
// d'autre que cette sélection et ne lit jamais la liste dessinée.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  ask,
  esc,
  frozen,
  S,
  tt
} from './state.js';
import {
  buildZones,
  procList,
  renderBuild
} from './panels.js';
import {
  mapSize,
  startTiles,
  styleFor,
  zonesLayer
} from '../maps/lib/map_base.js?v=0';
import *
as MB from '../maps/lib/map_base.js?v=0'; // pointsLayer et COVER_ZOOM (BUGS SOG) : lus par le nom, une version du socle qui ne les a pas ne casse pas le chargement (pas de points)

/** Les contours des zones, demandés à `ctx.aerodb.zoneOutlines()` seul (jamais par adresse) au premier dessin d'un panneau avec carte, une fois ; sans réponse ou en
 *  échec : la liste seule, sans ligne d'erreur. Redessine quand ils arrivent. */
function loadOutlines() {
  if (S.outlines !== null) return;
  S.outlines = 'loading';
  const me = S;
  ask('zoneOutlines').then(o => {
    if (S !== me) return;
    S.outlines = o && typeof o === 'object' && Object.keys(o).length ? o : false;
    renderBuild();
  });
}
/** Les anneaux d'une zone d'aerodb tels qu'on les dessine : `framed` (ramenés de ±360° dans le cadre `box` de la zone, aerodb fed1c6f4a), à défaut `rings`. */
const ringsOf = z => z.framed || z.rings || [];
/** Le contour d'un élément de la carte : ceux des zones d'aerodb qu'il dessine (la zone elle-même pour la base, la France pour « LF », les États-Unis pour « K »), réunis ;
 *  null sans contour connu. */
function outlineOf(kind, id) {
  const zs = (kind === 'base' ? [id] : M.PROC_ZONES[id] || []).map(z => M.own(S.outlines, z)).filter(Boolean);
  if (!zs.length) return null;
  return {
    id,
    rings: zs.flatMap(ringsOf),
    box: zs.map(z => z.box).reduce((b, x) => [Math.min(b[0], x[0]), Math.min(b[1], x[1]), Math.max(b[2], x[2]), Math.max(b[3], x[3])]),
    approx: zs.every(z => M.isApproxOutline({
      ...z,
      rings: ringsOf(z)
    })) // le contour de chaque zone n'est qu'un cadre : tireté, dit en mots
  };
}
/** Les éléments que la carte dessine : ceux que la liste du panneau propose (zones de la couverture, États en bloc), avec leur contour. */
function mapEntries(kind) {
  const ids = kind === 'base' ? buildZones().ids : procList().map(i => i.id);
  return ids.map(id => outlineOf(kind, id)).filter(Boolean);
}
/** La teinte d'un élément : hors couverture, en cours (une opération du panneau le traite), à reconstruire (rien de publié ou cycle dépassé), à jour. */
function mapToneOf(kind, id) {
  const zone = kind === 'base' ? id : M.PROC_ZONES[id]?.[0],
    pub = S.d.pub,
    // la base : publiée si la zone a un cycle en vigueur, daté ou non (SOG-0026 : les États-Unis et le Canada n'ont pas de cycle daté, ils ne sont pas « dépassés ») ; les procédures : le cycle de procédures
    b = kind === 'base' ? M.baseOf(pub?.base, [zone]) : null,
    cycle = b ? b.cycle : pub?.proc?.inForce || null;
  return M.mapTone({
    inCoverage: S.d.cov.ids.includes(zone),
    running: !!S.run && S.run.set === kind && S.ids.includes(id),
    published: b ? b.published > 0 : !!cycle,
    stale: !!cycle && M.staleLevel(S.airac, cycle, S.now) !== null
  });
}
/** Les éléments de la carte d'un panneau avec ce que zoneFeatures en fait : la teinte de l'état (mapToneOf) et la case cochée de la MÊME sélection que la liste
 *  (S.ticked pour la base, S.picked pour les États). */
function featureEntries(kind) {
  const sel = kind === 'base' ? S.ticked : S.picked;
  return mapEntries(kind).map(e => ({
    ...e,
    tone: mapToneOf(kind, e.id),
    picked: !!sel?.has(e.id)
  }));
}
/** Ce qui fait changer le dessin d'une carte : l'identité, la teinte, la case, le contour approximatif et le nombre d'anneaux de chaque élément (les contours eux-mêmes ne
 *  changent pas tant que les éléments sont les mêmes). */
const signature = entries => JSON.stringify(entries.map(e => [e.id, e.tone, e.picked, e.approx, e.rings.length]));
/** La carte d'un panneau (`kind` : base ou proc) : seulement son cadre — un emplacement pour la carte MapLibre (attachMaps y pose l'hôte), « Recentrer » et la légende d'une
 *  ligne (le nom ET l'état en toutes lettres : la teinte seule ne dit rien). Rien (la liste seule) sans contours, sans zone à dessiner, ou si le socle n'a pas pu démarrer
 *  pour ce panneau (S.mapFail). */
export function zoneMapHtml(kind) {
  loadOutlines();
  if (!S.outlines || S.outlines === 'loading' || !S.airac || S.mapFail[kind]) return '';
  const entries = mapEntries(kind);
  if (!entries.length) return '';
  return `<div class="d-map" data-zone-map="${kind}" role="group" aria-label="${esc(tt(TX.zoneMap[kind]))}"><div data-zone-slot></div>${kind === 'proc' ? '<p class="f-muted" data-point-info role="status"></p>' : ''}
    <p class="d-map-row"><button type="button" data-act="map-recenter">${esc(tt(TX.mapRecenter))}</button></p>
    <p class="f-muted" data-zone-legend>${esc(tt(TX.mapLegend))} :${['ok', 'warn', 'accent', 'muted'].map(t => `<span class="d-sw" data-tone="${t}"></span>${esc(tt(TX.mapTone[t]))}`).join(' · ')}${entries.some(e => e.approx) ? ` · ${esc(tt(TX.mapLegendApprox))}` : ''}. ${esc(tt(TX.mapLegendNote))}</p></div>`;
}
/** Une couleur du design (un jeton --sog-…) résolue en rgb(), la seule forme que MapLibre lit (il ne lit pas les variables CSS). */
function token(name) {
  const probe = document.createElement('i');
  probe.style.cssText = `display:none;color:var(${name})`;
  S.body.append(probe);
  const v = getComputedStyle(probe).color;
  probe.remove();
  return v;
}
/** Les teintes de la carte pour le socle : celles des jetons du cadre ; `line` (le ton inconnu du socle) porte l'accent, la teinte d'une zone dont une opération s'occupe. */
function mapColors() {
  return {
    ok: token('--sog-ok'),
    warn: token('--sog-warn'),
    muted: token('--sog-muted'),
    line: token('--sog-accent')
  };
}
/** Le design est-il sombre ? Le fond des graphiques du design est sombre (la lecture de la Météo). */
function isDark() {
  const [r, g, b] = (token('--sog-chart-bg').match(/[\d.]+/g) || [255, 255, 255]).slice(0, 3).map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
}
/** Le socle sait-il dessiner des points (pointsLayer et COVER_ZOOM, ajoutés par la Carte) ? Sinon la carte des États n'a pas de points et les comptes des lignes d'État restent. */
const havePoints = () => typeof MB.pointsLayer === 'function' && Number.isFinite(MB.COVER_ZOOM);
/** Dit le code et le cycle d'un terrain détenu dans la ligne sous la carte des États (jamais une fenêtre) : « LFPG : à jour, cycle 2611 » pour des procédures publiées, « LFMN : cycle dépassé, relu le … » pour les autres. */
function showInfo(kind, icao) {
  const m = S.maps[kind],
    p = m?.pts?.get(icao);
  if (!p) return;
  const word = tt(TX.mapTone[p.tone === 'ok' ? 'ok' : 'warn']),
    inForce = S.d.pub?.proc?.inForce,
    cycle = p.cov?.source === 'published' && inForce && S.airac ? M.cycleName(S.airac, inForce) : '';
  m.info = cycle ? tt(TX.ptInfo, {
    i: icao,
    w: word,
    c: cycle
  }) : tt(TX.ptInfoRead, {
    i: icao,
    w: word,
    d: String(p.cov?.read_at || '').slice(0, 10) || '?'
  });
  const line = S.body?.querySelector(`[data-zone-map="${kind}"] [data-point-info]`);
  if (line) line.textContent = m.info;
}
/** Lit, pour la vue de la carte des États, les terrains détenus (lecture seule de la base locale, jamais un téléchargement ni une écriture) : au-dessus de COVER_ZOOM seulement, `aerodromes({ bbox, lite })` de la vue puis
 *  `coverage(icao)` de chacun ; ceux dont la couverture est détenue (verte, ou orange partielle) deviennent des points, verts à jour, orange d'un cycle passé. Refait à chaque fin de mouvement ; une réponse dépassée par un
 *  mouvement plus récent est jetée. Sous le zoom : aucun point, aucune lecture. */
async function loadPoints(kind) {
  const m = S.maps[kind],
    a = S.ctx.aerodb,
    me = S;
  if (!m?.points || !m.map || !a) return;
  const tok = ++m.ptTok,
    draw = items => {
      m.pts = new Map(items.map(x => [x.id, x]));
      m.points.update(M.pointFeatures(items));
    };
  if (!(m.map.getZoom() >= MB.COVER_ZOOM)) return draw([]);
  const b = m.map.getBounds(),
    center = m.map.getCenter().lng,
    seen = new Set(),
    list = (await Promise.all(M.viewBoxes(b.getWest(), b.getSouth(), b.getEast(), b.getNorth()).map(bbox => a.aerodromes({
      bbox,
      lite: true
    }).catch(() => [])))).flat().filter(x => /^[A-Z0-9]{4}$/.test(x?.icao || '') && Number.isFinite(+x.lat) && Number.isFinite(+x.lon) &&
      !seen.has(x.icao) && seen.add(x.icao)),
    covs = await Promise.all(list.map(x => a.coverage(x.icao).catch(() => null)));
  if (S !== me || tok !== m.ptTok) return;
  draw(list.map((x, i) => ({
    id: x.icao,
    lat: +x.lat,
    lon: +x.lon + 360 * Math.round((center - +x.lon) / 360), // la copie du monde de la vue
    tone: M.coverTone(covs[i]),
    cov: covs[i]
  })).filter(x => x.tone));
}
/** Pose la couche des terrains détenus sur la carte des États et la fait suivre le mouvement de la vue (`moveend`) ; sans pointsLayer au socle, rien (les comptes des lignes d'État restent). */
function startPoints(kind, m) {
  if (!havePoints()) return;
  m.ptTok = 0;
  m.pts = new Map();
  m.points = MB.pointsLayer(m.map, M.pointFeatures([]), {
    colors: mapColors(),
    onTap: id => showInfo(kind, id),
    minzoom: MB.COVER_ZOOM
  });
  m.map.on('moveend', () => loadPoints(kind));
  loadPoints(kind);
}
/** Démarre la carte d'un panneau dans son hôte (le socle : MapLibre à la demande, tuiles, abandon) puis y pose les zones et cadre la vue ; sans carte (hors ligne, pas de
 *  WebGL, MapLibre absent, délai) : le panneau est redessiné sans carte, la liste seule. Une carte déjà en route n'est pas redémarrée. */
function startMap(kind, m) {
  if (m.starting) return;
  m.starting = true;
  const me = S;
  startTiles(m.host, {
    style: styleFor({
      dark: isDark()
    }),
    worldCopies: true,
    attributionControl: {
      compact: true
    },
    alive: () => S === me
  }).then(map => {
    m.starting = false;
    if (S !== me) return map?.remove();
    if (!map) {
      delete S.maps[kind];
      S.mapFail[kind] = true;
      return renderBuild();
    }
    const entries = featureEntries(kind);
    m.map = map;
    m.dark = isDark();
    m.sig = signature(entries);
    m.layer = zonesLayer(map, M.zoneFeatures(entries), {
      colors: mapColors(),
      onTap: id => toggleZone(kind, id)
    });
    mapSize(map, m.host);
    m.layer.fit();
    if (kind === 'proc') startPoints(kind, m);
  });
}
/** Pose, dans chaque cadre de carte du dessin (`root`), l'hôte persistant de sa carte à la place de l'emplacement : le panneau est redessiné par innerHTML, l'hôte (et la
 *  carte MapLibre qu'il porte) survit à chaque redessin dans S.maps. Au premier dessin visible la carte démarre (startMap) ; ensuite les zones et les teintes sont remises à
 *  jour (seulement si quelque chose a changé) et la carte reprend la taille de son hôte. Appelée à la fin de chaque dessin des panneaux. */
export function attachMaps(root = S?.body) {
  if (!S?.body || !root) return;
  for (const frame of root.querySelectorAll('[data-zone-map]')) {
    const kind = frame.dataset.zoneMap,
      slot = frame.querySelector('[data-zone-slot]');
    if (!slot) continue;
    const m = S.maps[kind] ||= {
      host: Object.assign(document.createElement('div'), {
        className: 'd-map-host'
      }),
      map: null,
      layer: null,
      starting: false,
      sig: '',
      dark: false
    };
    slot.replaceWith(m.host);
    if (!m.map) {
      if (m.host.clientWidth > 0) startMap(kind,
        m); // dans un groupe replié l'hôte n'a pas de taille : la carte démarre à l'ouverture du groupe
      continue;
    }
    const entries = featureEntries(kind),
      sig = signature(entries),
      dark = isDark();
    if (dark !== m.dark) { // le design a changé de ton : le fond suit, les couches du socle reviennent seules
      m.map.setStyle(styleFor({
        dark
      }));
    }
    if (sig !== m.sig || dark !== m.dark) m.layer.update(M.zoneFeatures(entries), mapColors());
    if (dark !== m.dark && m.points) m.points.update(M.pointFeatures([...m.pts.values()]), mapColors());
    const line = frame.querySelector('[data-point-info]');
    if (line && m.info) line.textContent = m.info; // le panneau est redessiné : la ligne du dernier terrain touché revient
    m.sig = sig;
    m.dark = dark;
    mapSize(m.map, m.host);
  }
}
/** Les cartes reprennent la taille de leur hôte (la fenêtre a changé de taille) ; sans effet pour une carte qui n'est pas là. */
export function resizeMaps() {
  for (const m of Object.values(S?.maps || {}))
    if (m.map) mapSize(m.map, m.host);
}
/** « Recentrer » : la vue revient au premier cadre, celui de toutes les zones du panneau (zonesLayer.fit, sans cadre donné). */
export function recenterMap(kind) {
  S.maps[kind]?.layer?.fit();
}
/** Retire les cartes MapLibre du module (au démontage) : couches du socle, puis la carte et son contexte WebGL. */
export function destroyMaps() {
  for (const m of Object.values(S?.maps || {})) {
    try {
      m.points?.remove();
      m.layer?.remove();
      m.map?.remove();
    } catch {
      /* déjà retirée */
    }
  }
  S.maps = {};
}
/** Coche ou décoche, dans la sélection du module (S.ticked pour la base, S.picked pour les États), l'élément d'une zone de la carte, puis redessine les panneaux : la carte
 *  et la liste se lisent toutes deux de cette sélection, jamais l'une de l'autre. Sans effet pendant une marche, ou pour un élément que la liste ne propose pas. */
function toggleZone(kind, id) {
  if (frozen() || !S.d) return;
  const set = kind === 'base' && buildZones().ids.includes(id) ? S.ticked : kind === 'proc' && procList().some(i => i.id === id) ? S
    .picked : null;
  if (!set) return;
  if (set.has(id)) set.delete(id);
  else set.add(id);
  renderBuild();
}
