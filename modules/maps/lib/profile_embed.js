// V3 maps — le profil vertical de la Carte, appelable HORS de la Carte (modules/maps/INTEGRATION.md § 7 ter, SOG-0464) : le relief sous une
// route — une suite de positions { lat, lon } — dessiné dans un <canvas>. Rien n'est recopié : c'est le profil de la Carte (SiaProfile, lib/vertical_profile.js ;
// MapsProfile, profile.js), chargé ici sans l'écran de la Carte. L'appelant donne `load(url)` → Blob (la Carte : tileLoader(ctx) de state.js, ctx.net.fetch) : la
// brique n'appelle jamais fetch, aucun hôte n'est ajouté ici ; son module déclare lui-même s3.amazonaws.com/elevation-tiles-prod dans son `net`.
// Pur de l'état d'un module : aucune globale à soi, aucune écriture hors du canvas donné.
//   import { loadProfile, drawProfile } from '../maps/lib/profile_embed.js';

/** Les bibliothèques du profil (scripts classiques, une fois par page) : [variable globale, fichier du dossier du module], dans l'ordre. */
const LIBS = [
  ['SiaAero', '../lib/aero_symbols.js'],
  ['MapsRender', '../render.js'],
  ['SiaProfile', '../lib/vertical_profile.js'],
  ['MapsProfile', '../profile.js']
];
let libsP = null;
/** Charge les bibliothèques du profil (une fois) ; rend { SiaProfile, MapsProfile }, ou null si l'une ne vient pas (la demande suivante réessaie). */
export function loadProfile() {
  return libsP ||= (async () => {
    try {
      for (const [glob, file] of LIBS)
        if (!window[glob]) await import(new URL(`${file}?v=0`, import.meta.url).href);
      return window.SiaProfile && window.MapsProfile ? {
        SiaProfile: window.SiaProfile,
        MapsProfile: window.MapsProfile
      } : null;
    } catch {
      return null;
    } finally {
      if (!window.SiaProfile || !window.MapsProfile) libsP = null;
    }
  })();
}
/** Un échantillonneur de relief par chargeur : les tuiles lues sont gardées d'un dessin à l'autre (déplacer un lieu ne relit pas les mêmes tuiles). */
const samplers = new WeakMap();
const NM = 1852;
/** Dessine dans `canvas` le profil de la route `points` ([{ lat, lon, id | name }], deux au moins).
 *  options : load (url → Blob ; sans lui ou hors ligne, la coupe se fait SANS relief), levelFt (niveau de croisière : sans lui, le relief seul), scale (0,8 comme la
 *  Carte), width et height (px CSS ; sinon la taille du canvas dans la page).
 *  → Promise<{ ok: true, terrain, nm } | { ok: false, stale: true } | null> : `terrain` faux = relief indisponible (hors ligne, tuile refusée : l'appelant le DIT) ;
 *  `nm` la longueur de la route ; null sans deux points, longueur nulle ou bibliothèques absentes ; `stale` quand un dessin plus récent du même canvas a pris la
 *  place (rien n'est peint par celui-là). */
export async function drawProfile(canvas, points, {
  load = null,
  levelFt = 0,
  scale = .8,
  width = 0,
  height = 0
} = {}) {
  const mine = canvas.__profileRun = (canvas.__profileRun || 0) + 1,
    pts = (Array.isArray(points) ? points : []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon)).map(p => ({
      ...p,
      lat: +p.lat,
      lon: +p.lon
    }));
  if (pts.length < 2) return null;
  const L = await loadProfile();
  if (!L) return null;
  let elevation = null;
  if (typeof load === 'function' && navigator.onLine !== false) {
    if (!samplers.has(load)) samplers.set(load, L.SiaProfile.terrainSampler(9, load));
    elevation = samplers.get(load);
  }
  let data;
  try {
    data = await L.MapsProfile.build(pts, {
      levelFt: +levelFt > 0 ? +levelFt : 0,
      elevation
    });
  } catch {
    return null; // longueur nulle, ou une coupe qui ne se construit pas
  }
  if (canvas.__profileRun !== mine) return {
    ok: false,
    stale: true
  };
  const W = Math.max(120, Math.round(width || canvas.clientWidth || canvas.width || 600)),
    H = Math.max(80, Math.round(height || canvas.clientHeight || canvas.height || 240)),
    dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  L.MapsProfile.draw(ctx, data, {
    W,
    H,
    scale
  });
  return {
    ok: true,
    terrain: !!data.terrainOk,
    nm: data.total / NM
  };
}
