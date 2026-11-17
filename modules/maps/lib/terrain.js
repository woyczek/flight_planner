// V3 maps — le relief sous des positions (modules/maps/INTEGRATION.md § 7 bis, SOG-0446) : l'altitude du terrain, en MÈTRES, à chaque
// { lat, lon }, lue dans les tuiles Terrarium que le profil de la Carte lit déjà (SiaProfile.terrainSampler). Aucun hôte n'est ajouté ici :
// `load(url)` est celui de l'appelant (la Carte : tileLoader(ctx) de state.js) ; il rend un ImageBitmap, un Blob ou null.
// Une lacune (une tuile qui ne vient pas, un lieu sans donnée) est `null`, JAMAIS 0 : le niveau de la mer est une altitude, pas une absence.

const TILE = 256;
const MAX_TILES = 96;
/** Les tuiles lues (octets RGBA), par chargeur : une promesse par tuile, la plus ancienne retirée au-delà de MAX_TILES. */
const caches = new WeakMap();
const rad = d => d * Math.PI / 180;

/** Les octets RGBA d'une tuile 256 × 256 à partir de ce que rend `load` ; null si ce n'est pas lisible. */
async function pixels(got) {
  if (!got) return null;
  const img = typeof got.width === 'number' && typeof got.close === 'function' ? got : await createImageBitmap(got instanceof Blob ? got :
    new Blob([got]));
  const c = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(TILE, TILE) : Object.assign(document.createElement('canvas'), {
      width: TILE,
      height: TILE
    }),
    g = c.getContext('2d', {
      willReadFrequently: true
    });
  g.drawImage(img, 0, 0, TILE, TILE);
  return g.getImageData(0, 0, TILE, TILE).data;
}
/** Altitudes (m) aux positions `points` : un tableau de la même longueur, `null` pour une lacune. */
export async function elevationAt(points, {
  load,
  z = 9
} = {}) {
  const list = Array.isArray(points) ? points : [];
  if (typeof load !== 'function') return list.map(() => null);
  let cache = caches.get(load);
  if (!cache) caches.set(load, cache = new Map());
  const n = 2 ** z,
    tile = (x, y) => {
      const key = `${z}/${x}/${y}`;
      if (!cache.has(key)) {
        if (cache.size >= MAX_TILES) cache.delete(cache.keys().next().value);
        cache.set(key, (async () => pixels(await load(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`)))().catch(() => null).then(d => {
          if (!d) cache.delete(key); // une tuile qui n'est pas venue sera redemandée à la prochaine lecture
          return d;
        }));
      }
      return cache.get(key);
    };
  return Promise.all(list.map(async p => {
    const lat = +p?.lat,
      lon = +p?.lon;
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 85.0511) return null;
    const xf = (((lon + 180) % 360 + 360) % 360) / 360 * n,
      r = rad(lat),
      yf = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n,
      x = Math.min(n - 1, Math.floor(xf)),
      y = Math.min(n - 1, Math.floor(yf)),
      d = await tile(x, y);
    if (!d) return null;
    const px = Math.min(TILE - 1, Math.floor((xf - x) * TILE)),
      py = Math.min(TILE - 1, Math.floor((yf - y) * TILE)),
      i = (py * TILE + px) * 4;
    if (d[i + 3] === 0) return null; // un pixel transparent : pas de donnée
    return Math.round((d[i] * 256 + d[i + 1] + d[i + 2] / 256 - 32768) * 10) / 10;
  }));
}
