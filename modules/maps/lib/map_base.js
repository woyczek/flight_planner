// V3 maps — socle de carte partagé (modules/maps/INTEGRATION.md § 7) : ce que le module Carte et le module Atmosphère
// font de la même façon pour avoir une carte, et rien de plus. MapLibre chargé une fois (script UMD et sa feuille), les
// styles de fond, le fond à tuiles (création, attente, abandon), la mise à la taille du cadre, le fond uni quand les tuiles
// ne viennent pas (projection de Mercator, contours des pays).
// Pur de l'état d'un module : chaque fonction reçoit la carte, le cadre et des options, et rend une poignée ; aucune
// globale de module, aucune lecture de la page, aucune écriture hors du cadre qu'on lui donne. Seuls les chargements
// (script, feuille, contours) vont chercher des fichiers du dossier lib/, et le noyau de dessin du module Carte
// (window.MapsRender, render.js) sert au fond uni.
//   import { loadMapLibre, styleFor, startTiles, mapSize, isOwnResize, loadRender, loadOutlines, plainView, drawPlain }
//     from '../maps/lib/map_base.js';

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
/** MapLibre (script UMD et sa feuille), chargé une fois par page, au premier fond à tuiles ; null s'il ne charge pas (la
 *  demande suivante réessaie). */
let mlP = null;
export function loadMapLibre() {
  return mlP ||= new Promise(ok => {
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
 *  style ; pas de rotation, d'inclinaison ni de copies du monde. */
export async function startTiles(container, {
  style,
  bounds,
  padding,
  attributionControl = false,
  wait = TILE_WAIT,
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
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        renderWorldCopies: false
      });
    } catch {
      return finish(null); // pas de WebGL
    }
    map.touchZoomRotate.disableRotation();
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
 *  elle est repliée ici sur son bouton « i » ; un toucher sur le bouton la rouvre. */
function collapseAttribution(map) {
  const a = map.getContainer().querySelector('.maplibregl-ctrl-attrib');
  if (!a) return;
  a.removeAttribute('open');
  a.classList.remove('maplibregl-compact-show');
}

// ---------------------------------------------------------------- taille du cadre
/** Cartes dont le script est dans leur propre resize() : mémoire du marqueur (isOwnResize), sans rien poser sur la carte. */
const own = new WeakSet();
/** Vrai pendant que mapSize() redimensionne la carte : son « movestart » n'est pas un geste de l'utilisateur. */
export const isOwnResize = map => own.has(map);
/** Fond MapLibre ramené à la taille de son cadre s'il ne l'a plus (map.resize seulement dans ce cas) : à appeler à chaque
 *  changement de taille, au chargement et au changement de style, au retour d'un onglet caché ou d'une page gelée (les
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

// ---------------------------------------------------------------- fond uni (sans tuiles)
/** Noyau de dessin du module Carte (window.MapsRender : projection du fond uni, fond, jetons du design), chargé une fois. */
export const loadRender = () => window.MapsRender ? Promise.resolve() : import('../render.js?v=0');
/** Contours des pays du fond uni (window.MAPS_OUTLINES, 350 Ko), chargés une fois au premier dessin sans tuiles ; la
 *  promesse est refusée (et la demande suivante réessaie) si le fichier ne vient pas. */
let outlinesP = null;
export const loadOutlines = () => outlinesP ||= import('./outlines.js?v=0').catch(e => {
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
