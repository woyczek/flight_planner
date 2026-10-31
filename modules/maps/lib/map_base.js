// V3 maps — socle de carte partagé (modules/maps/INTEGRATION.md § 7) : ce que le module Carte et le module Atmosphère
// font de la même façon pour avoir une carte, et rien de plus. MapLibre chargé une fois (script UMD et sa feuille), les
// styles de fond, le fond à tuiles (création, attente, abandon), la mise à la taille du cadre, le fond uni quand les tuiles
// ne viennent pas (projection de Mercator, contours des pays).
// Pur de l'état d'un module : chaque fonction reçoit la carte, le cadre et des options, et rend une poignée ; aucune
// globale de module, aucune lecture de la page, aucune écriture hors du cadre qu'on lui donne. Seuls les chargements
// (script, feuille, contours) vont chercher des fichiers du dossier lib/, et le noyau de dessin du module Carte
// (window.MapsRender, render.js) sert au fond uni.
//   import { loadMapLibre, styleFor, startTiles, mapSize, isOwnResize, setBottomInset, zonesLayer, loadRender, loadOutlines,
//     plainView, drawPlain } from '../maps/lib/map_base.js';

/** Fond de jour, fond de nuit, styles publiés que choisit un profil d'affichage du studio (OpenFreeMap, VersaTiles) ; le
 *  style maison du studio, OSM standard et OpenTopoMap (hôtes hors de meta.net) sont remplacés par le fond de jour. */
export const STYLE_DAY = 'https://tiles.openfreemap.org/styles/positron';
export const STYLE_NIGHT = 'https://tiles.openfreemap.org/styles/dark';
export const STYLES = {
  'ofm-liberty': 'https://tiles.openfreemap.org/styles/liberty',
  'ofm-bright': 'https://tiles.openfreemap.org/styles/bright',
  'ofm-positron': 'https://tiles.openfreemap.org/styles/positron',
  'vt-colorful': 'https://tiles.versatiles.org/assets/styles/colorful/style.json',
  'vt-graybeard': 'https://tiles.versatiles.org/assets/styles/graybeard/style.json',
  'vt-shadow': 'https://tiles.versatiles.org/assets/styles/shadow/style.json',
  'vt-eclipse': 'https://tiles.versatiles.org/assets/styles/eclipse/style.json'
};
/** Attente des tuiles par défaut (ms) : fond pas prêt après ce délai, fond uni. */
export const TILE_WAIT = 10e3;

/** Style du fond : celui du profil d'affichage (base : clé de STYLES), de jour ; la nuit, le style sombre (VersaTiles :
 *  eclipse pour une base VersaTiles). Sans base connue : le fond de jour. */
export const styleFor = ({
  dark = false,
  base = ''
} = {}) => dark ? /^vt-/.test(base) ? STYLES['vt-eclipse'] : STYLE_NIGHT : STYLES[base] || STYLE_DAY;

// ---------------------------------------------------------------- MapLibre
/** Ce que la page change à la feuille de MapLibre, une fois (règles de poids supérieur, posées après elle).
 *  1. La mention des sources : le cadre donne à tout `summary` une hauteur de 44 px, un chevron et un alignement en ligne
 *     (frame/design/primitives.css) ; le bouton « i » de MapLibre est un `summary` de 24 px dont l'image de fond se répétait
 *     alors sous elle (le « double i », dont le second passait sous la feuille) et dont le chevron dessinait une barre noire
 *     à son côté : hauteur remise à 24 px, image sans répétition, pas de chevron.
 *  2. Les contrôles du bas (mention, échelle, tout autre) se décalent de --mb-inset-b, que setBottomInset() pose sur le cadre
 *     de la carte : la part du cadre que la feuille recouvre (règle 17 de V3_SPECIFICATION § 7.1). Sans valeur : 0. */
const CHROME_CSS = `.maplibregl-map .maplibregl-ctrl-attrib summary.maplibregl-ctrl-attrib-button{min-height:0;height:24px;gap:0;background-repeat:no-repeat}
.maplibregl-map .maplibregl-ctrl-attrib summary.maplibregl-ctrl-attrib-button::before{content:none}
.maplibregl-map .maplibregl-ctrl-bottom-left,.maplibregl-map .maplibregl-ctrl-bottom-right{bottom:var(--mb-inset-b,0px)}`;

function chromeCss() {
  if (document.querySelector('style[data-map-base]')) return;
  const st = document.createElement('style');
  st.dataset.mapBase = '';
  st.textContent = CHROME_CSS;
  document.head.append(st);
}

/** MapLibre (script UMD et sa feuille), chargé une fois par page, au premier fond à tuiles ; null s'il ne charge pas (la
 *  demande suivante réessaie). */
let mlP = null;
export function loadMapLibre() {
  return mlP ||= new Promise(ok => {
    chromeCss();
    if (window.maplibregl) return ok(window.maplibregl);
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = new URL('maplibre-gl.css?v=0', import.meta.url).href;
    document.head.append(css);
    const sc = document.createElement('script');
    sc.src = new URL('maplibre-gl.js?v=0', import.meta.url).href;
    sc.onload = () => ok(window.maplibregl || null);
    sc.onerror = () => {
      mlP = null;
      ok(null);
    };
    document.head.append(sc);
  });
}

/** Fond MapLibre dans le cadre `container` ; rend la carte une fois chargée, null s'il ne vient pas (hors ligne, MapLibre
 *  introuvable, pas de WebGL, hôte refusé, erreur avant le chargement, délai dépassé, hôte parti) : la carte à demi
 *  construite est alors retirée, et l'appelant passe au fond uni.
 *  opts : style (URL du style, voir styleFor), bounds ([[ouest, sud], [est, nord]]), padding (px, marge du cadrage),
 *  attributionControl (false par défaut ; { compact: true, customAttribution } pour la mention, repliée au chargement), wait (ms, TILE_WAIT), alive () → faux si
 *  l'hôte est démonté (la carte est abandonnée), onCreate (map) dès la création (pour pouvoir la retirer, ou la mettre à la
 *  taille avant qu'elle soit chargée), onStyleLoad (map) à chaque chargement de style (le premier et chaque setStyle), onLoad
 *  (map) une fois chargée, avant que la promesse soit tenue : l'hôte y branche ses événements. Mercator est imposé à chaque
 *  style ; pas de rotation ni d'inclinaison. worldCopies (faux par défaut) : copies du monde de MapLibre — sans elles la
 *  carte ne sort pas de [-180, 180] (la vue d'une route qui passe la ligne de changement de date est ramenée à 180°) ; avec
 *  elles la vue peut être centrée à 190° (ou à −170° : MapLibre choisit la copie), ses bornes (getBounds) et la projection
 *  (project) vont au-delà de ±180, et l'hôte ramène ses longitudes à la copie de la vue (frame/lib/geo.js, nearLon). */
export async function startTiles(container, {
  style,
  bounds,
  padding,
  attributionControl = false,
  wait = TILE_WAIT,
  worldCopies = false,
  alive = () => true,
  onCreate,
  onStyleLoad,
  onLoad
} = {}) {
  if (navigator.onLine === false) return null;
  const ml = await loadMapLibre();
  if (!ml || !alive()) return null;
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
    const timer = setTimeout(() => finish(null), wait);
    try {
      map = new ml.Map({
        container,
        style,
        bounds,
        ...(padding == null ? {} : {
          fitBoundsOptions: {
            padding
          }
        }),
        attributionControl,
        // MapLibre ne suit pas seul la taille de son cadre (fenêtre, ResizeObserver) : il se redimensionnerait à chaque image d'un
        // mouvement de la feuille, effaçant son canvas avant de le redessiner (le clignotement, la zone grise). La taille est reprise
        // à l'endroit que choisit l'hôte, une fois qu'elle est arrêtée : mapSize() (plus bas)
        trackResize: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        renderWorldCopies: worldCopies
      });
    } catch {
      return finish(null); // pas de WebGL
    }
    map.touchZoomRotate.disableRotation();
    if (attributionControl?.compact) collapseAttribution(
      map); // le contrôle est déjà là (vide) : replié et marqué compact tout de suite
    onCreate?.(map);
    map.on('style.load', () => {
      try {
        if (map.getProjection?.()?.type !== 'mercator') map.setProjection({
          type: 'mercator'
        });
      } catch {
        /* version sans projection réglable : Mercator */
      }
      onStyleLoad?.(map);
    });
    map.on('error', () => finish(null));
    map.on('load', () => {
      if (!alive()) return finish(null);
      if (attributionControl?.compact) collapseAttribution(map);
      onLoad?.(map);
      finish(map);
    });
  });
}

/** Mention des sources en contrôle compact : MapLibre la montre d'abord ouverte (tout le texte sur une bande au bas de la carte),
 *  elle est repliée sur son bouton « i » ; un toucher sur le bouton la rouvre. Elle est aussi MARQUÉE compacte
 *  (`maplibregl-compact`) : le contrôle de MapLibre n'ouvre la mention d'office (`open`, `compact-show`) que tant qu'il n'a pas
 *  cette classe, à chaque `resize` de la carte (_updateCompact) ; dès qu'une mention a un texte et que la carte est
 *  redimensionnée — ce que fait toute reprise de taille de la feuille —, elle se rouvrait. Posée dès la création du contrôle
 *  (il existe tout de suite, vide), elle ne dépend plus du moment où le style charge ; écrit seulement si cela change. */
function collapseAttribution(map) {
  const a = map.getContainer().querySelector('.maplibregl-ctrl-attrib');
  if (!a) return;
  if (a.hasAttribute('open')) a.removeAttribute('open');
  if (a.classList.contains('maplibregl-compact-show')) a.classList.remove('maplibregl-compact-show');
  if (!a.classList.contains('maplibregl-compact')) a.classList.add('maplibregl-compact');
}

// ---------------------------------------------------------------- taille du cadre
/** Cartes dont le script est dans leur propre resize() : mémoire du marqueur (isOwnResize), sans rien poser sur la carte. */
const own = new WeakSet();
/** Vrai pendant que mapSize() redimensionne la carte : son « movestart » n'est pas un geste de l'utilisateur. */
export const isOwnResize = map => own.has(map);
/** Fond MapLibre ramené à la taille de son cadre s'il ne l'a plus (map.resize seulement dans ce cas ; MapLibre ne le fait pas seul,
 *  `trackResize: false`) : à appeler quand la taille du cadre s'est arrêtée, au chargement et au changement de style, au retour d'un onglet caché ou d'une page gelée (les
 *  observations de taille faites pendant ce temps sont perdues) et à chaque dessin. resize() tire « movestart », que l'hôte
 *  ne doit pas prendre pour un geste de l'utilisateur : il le reconnaît par isOwnResize(map). Rend vrai si la carte a été
 *  redimensionnée. */
export function mapSize(map, box) {
  if (!map || !box) return false;
  const c = map.getCanvas(),
    w = box.clientWidth,
    h = box.clientHeight;
  if (!(w && h && (c.clientWidth !== w || c.clientHeight !== h))) return false;
  const was = own.has(map);
  own.add(map);
  try {
    map.resize();
  } finally {
    if (!was) own.delete(map);
  }
  return true;
}

// ---------------------------------------------------------------- contrôles au-dessus de la feuille
/** Contrôles du bas de la carte (mention des sources, échelle, tout autre) décalés de `px` pixels vers le haut : la part du
 *  cadre que la feuille recouvre, pour qu'aucun ne passe dessous (règle 17 de V3_SPECIFICATION § 7.1). À appeler avec la
 *  hauteur réelle recouverte (sommet de la feuille contre le bas du cadre) à chaque arrêt de la feuille (onSettle) et à
 *  chaque changement de taille ; 0 quand la feuille ne recouvre rien (carte au-dessus d'elle, colonne paysage). Écrit
 *  seulement si la valeur change ; ne touche pas à la caméra (le cadrage de la route reste l'affaire de l'hôte :
 *  fitBounds avec une marge basse). Rend vrai si la valeur a changé. */
export function setBottomInset(map, px) {
  const box = map?.getContainer?.(),
    v = `${Math.max(0, Math.round(+px || 0))}px`;
  if (!box || box.style.getPropertyValue('--mb-inset-b') === v) return false;
  box.style.setProperty('--mb-inset-b', v);
  return true;
}

// ---------------------------------------------------------------- zones touchables (module Données, INTEGRATION.md § 7)
/** Rang des couches de zones posées sur une carte (des identifiants de couches uniques) : rien d'autre n'est gardé. */
const zoneLayers = new WeakMap();
/** Rayon (px) autour du doigt quand rien n'est exactement sous lui : la tape au bord d'une petite zone la trouve. */
const TAP_PX = 6;
/** Un anneau lu d'un seul tenant : celui qui passe l'antiméridien (ses longitudes étalées sur plus de 180°) a ses longitudes ouest
 *  décalées de +360 (fitBounds accepte un est au-delà de 180). */
const unwrapRing = ring => {
  let lo = Infinity,
    hi = -Infinity;
  for (const [lon] of ring) {
    if (lon < lo) lo = lon;
    if (lon > hi) hi = lon;
  }
  return hi - lo > 180 ? ring.map(([lon, lat]) => [lon < 0 ? lon + 360 : lon, lat]) : ring;
};
/** Aire (degrés carrés, formule du lacet) d'un anneau. */
const ringArea = ring => Math.abs(ring.reduce((a, [x, y], i) => {
  const [x2, y2] = ring[(i + 1) % ring.length];
  return a + x * y2 - x2 * y;
}, 0) / 2);
/** Cadre [w, s, e, n] de l'union des anneaux principaux des entités (pour chacune, son anneau extérieur le plus grand, lu d'un seul
 *  tenant) : une zone qui passe l'antiméridien ou porte des îles lointaines (les 48 États et les Aléoutiennes, la métropole et
 *  l'outre-mer) est cadrée sur sa terre principale, jamais sur le tour du monde ; null sans entité. */
function mainBox(fc) {
  let w = Infinity,
    s = Infinity,
    e = -Infinity,
    n = -Infinity;
  for (const f of fc?.features || []) {
    const g = f?.geometry,
      polys = g?.type === 'Polygon' ? [g.coordinates] : g?.type === 'MultiPolygon' ? g.coordinates : [];
    let best = null,
      area = -1;
    for (const poly of polys) {
      const ring = poly?.[0]?.length ? unwrapRing(poly[0]) : null,
        a = ring ? ringArea(ring) : -1;
      if (a > area) {
        area = a;
        best = ring;
      }
    }
    for (const [lon, lat] of best || []) {
      if (lon < w) w = lon;
      if (lon > e) e = lon;
      if (lat < s) s = lat;
      if (lat > n) n = lat;
    }
  }
  return w <= e && s <= n ? [w, s, e, n] : null;
}
/** Polygones de zones remplis et touchables sur une carte du socle, repérés par leur identifiant ; le module Données en fait sa carte
 *  des zones (V3, retour de l'utilisateur du 31/10 : « la vraie carte, pas un timbre-poste »). Rien n'est lu ni écrit ici : les
 *  zones et les couleurs viennent de l'appelant.
 *  features : FeatureCollection de Polygon / MultiPolygon en [lon, lat] (plusieurs anneaux pour une zone : l'Alaska, Hawaï), chaque
 *  entité { id, tone: 'ok' | 'warn' | 'err' | 'muted', picked, approx } ; colors : { ok, warn, err, muted, line } déjà résolues
 *  (MapLibre ne lit pas les variables CSS : l'appelant lit les jetons du design et les passe) ; le remplissage translucide et le
 *  trait à la teinte du ton (line pour un ton inconnu), le trait plus épais quand picked, en pointillé quand approx. onTap(id) :
 *  une tape ou un clic sans déplacement de la carte (l'événement « click » de MapLibre n'a jamais lieu à la fin d'un glissement ni
 *  d'un pincement), l'entité la plus haute sous le doigt, sinon dans TAP_PX autour. Les couches reviennent à chaque changement de
 *  style (setStyle : jour, nuit). → { update(features, colors), fit(padding, bounds), remove() } : update remplace les données
 *  (setData) et, si colors est donné, les teintes, sans recréer les couches ; fit cadre bounds ([w, s, e, n], l'est pouvant passer
 *  180), sinon l'union des anneaux principaux des entités (mainBox) ; remove retire couches, source et écoutes. Un anneau qui passe
 *  l'antiméridien se dessine d'un seul tenant quand l'appelant le donne ainsi (longitudes ouest + 360). */
export function zonesLayer(map, features, {
  colors = {},
  onTap = null
} = {}) {
  const n = (zoneLayers.get(map) || 0) + 1;
  zoneLayers.set(map, n);
  const src = `mb-zones-${n}`,
    fill = `${src}-fill`,
    line = `${src}-line`,
    dash = `${src}-dash`,
    empty = {
      type: 'FeatureCollection',
      features: []
    };
  let data = features || empty,
    cols = colors || {};
  const picked = ['boolean', ['get', 'picked'], false],
    approx = ['boolean', ['get', 'approx'], false],
    // la teinte du ton de l'entité (celle du trait pour un ton inconnu, transparente sans elle)
    tone = () => ['match', ['get', 'tone'], ...['ok', 'warn', 'err', 'muted'].flatMap(k => [k, cols[k] || cols.line || 'rgba(0,0,0,0)']),
      cols.line || 'rgba(0,0,0,0)'
    ],
    lineWidth = ['case', picked, 3, 1.2];
  /** Source et couches posées si elles manquent (au départ, puis après chaque changement de style qui les a retirées) ; sans effet
   *  quand elles sont là, ou tant que le style n'est pas chargé. */
  const add = () => {
    if (!map.isStyleLoaded()) return;
    if (!map.getSource(src)) map.addSource(src, {
      type: 'geojson',
      data
    });
    if (!map.getLayer(fill)) map.addLayer({
      id: fill,
      type: 'fill',
      source: src,
      paint: {
        'fill-color': tone(),
        'fill-opacity': ['case', picked, .45, .25]
      }
    });
    if (!map.getLayer(line)) map.addLayer({
      id: line,
      type: 'line',
      source: src,
      filter: ['!', approx],
      paint: {
        'line-color': tone(),
        'line-width': lineWidth
      }
    });
    // line-dasharray n'est pas piloté par les données : une seconde couche de trait, celle des contours approximatifs
    if (!map.getLayer(dash)) map.addLayer({
      id: dash,
      type: 'line',
      source: src,
      filter: approx,
      paint: {
        'line-color': tone(),
        'line-width': lineWidth,
        'line-dasharray': [2, 2]
      }
    });
  };
  const tap = e => {
    if (!onTap || !map.getLayer(fill)) return;
    const {
      x,
      y
    } = e.point;
    const f = map.queryRenderedFeatures([x, y], {
      layers: [fill]
    })[0] || map.queryRenderedFeatures([
      [x - TAP_PX, y - TAP_PX],
      [x + TAP_PX, y + TAP_PX]
    ], {
      layers: [fill]
    })[0];
    if (f?.properties?.id != null) onTap(f.properties.id);
  };
  // setStyle d'une URL recharge le style (« style.load ») ; d'un objet, MapLibre applique un écart qui retire les couches sans
  // « style.load » : « styledata » suit l'un et l'autre (add ne fait rien quand tout est là)
  map.on('style.load', add);
  map.on('styledata', add);
  map.on('click', tap);
  add();
  return {
    update(next, nextColors) {
      data = next || empty;
      map.getSource(src)?.setData(data);
      if (!nextColors) return;
      cols = nextColors;
      for (const id of [fill, line, dash])
        if (map.getLayer(id)) map.setPaintProperty(id, id === fill ? 'fill-color' : 'line-color', tone());
    },
    fit(padding = 24, bounds = null) {
      const b = bounds || mainBox(data);
      if (b) map.fitBounds([
        [b[0], b[1]],
        [b[2], b[3]]
      ], {
        padding,
        animate: false
      });
    },
    remove() {
      map.off('style.load', add);
      map.off('styledata', add);
      map.off('click', tap);
      for (const id of [dash, line, fill])
        if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(src)) map.removeSource(src);
    }
  };
}

// ---------------------------------------------------------------- fond uni (sans tuiles)
/** Noyau de dessin du module Carte (window.MapsRender : projection du fond uni, fond, jetons du design), chargé une fois. */
export const loadRender = () => window.MapsRender ? Promise.resolve() : import('../render.js?v=0');
/** Contours des pays du fond uni (window.MAPS_OUTLINES : les anneaux [lon, lat]), chargés une fois au premier dessin sans tuiles :
 *  ceux du cadre quand aerodb les offre (aerodb.zoneOutlines(), la seule source ; la Carte), sinon la copie lib/outlines.js
 *  (Atmosphère, jusqu'à ce qu'elle passe aussi par aerodb) ; la promesse est refusée (et la demande suivante réessaie) s'ils ne
 *  viennent pas. */
let outlinesP = null;
export const loadOutlines = (aerodb = null) => outlinesP ||= (aerodb?.zoneOutlines ? Promise.resolve().then(() => aerodb.zoneOutlines())
  .then(z => {
    window.MAPS_OUTLINES = Object.values(z || {}).flatMap(v => v?.rings || []);
  }) : import('./outlines.js?v=0')).catch(e => {
  outlinesP = null;
  throw e;
});
/** Projection du fond uni : Mercator qui fait tenir l'emprise `fit` ({ w, e, s, n }) dans W × H (marge pad px), nord en haut.
 *  → { toC (lat, lon) → { x, y }, toLL (x, y) → { lat, lon }, shown (l'emprise réellement affichée) } ; il faut que
 *  loadRender() soit tenue. */
export const plainView = (fit, W, H, pad = 12) => window.MapsRender.mercator(fit, W, H, pad);
/** Fond uni dessiné : mer, puis terres d'après les contours (mer seule tant qu'ils ne sont pas arrivés). colors : { sea,
 *  land, border } (défauts de jour). */
export const drawPlain = (ctx, toC, W, H, colors) => window.MapsRender.drawBackground(ctx, toC, W, H, window.MAPS_OUTLINES, colors);
