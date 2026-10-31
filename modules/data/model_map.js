// V3 data — le calcul pur de la carte des zones à cocher (SPEC § 11) : les teintes, le contour approché, la mise en page, la règle des 44 px.
// Ni état, ni page, ni appel : ne dessine rien (zonemap.js) et ne connaît ni les jeux ni les fins de travaux.

/** Les zones d'aerodb que dessine la carte pour chaque État du panneau des procédures : la France pour « LF », les États-Unis pour « K ». */
export const PROC_ZONES = {
  LF: ['fr'],
  K: ['us']
};
/** Le côté, en pixels, sous lequel une zone n'est pas assez grande pour le doigt : sans carte si l'une des zones à cocher est plus petite (SPEC § 3). */
export const MAP_MIN_PX = 44;
/** La teinte d'une zone sur la carte : 'muted' (hors de la couverture), 'accent' (une opération la traite), 'warn' (rien de publié ou cycle dépassé), 'ok' (à jour). */
export function mapTone({
  inCoverage,
  running,
  published,
  stale
}) {
  return !inCoverage ? 'muted' : running ? 'accent' : !published || stale ? 'warn' : 'ok';
}
/** Un nombre arrondi à trois décimales (les coordonnées du dessin). */
const r3 = v => Math.round(v * 1000) / 1000;
/** Le contour d'une zone n'est-il qu'un cadre ? Vrai sans aucun anneau, ou quand l'unique anneau est exactement le rectangle de son `box` (quatre coins, fermé ou non, dans
 *  n'importe quel ordre) : le contour est alors approximatif. Jamais d'après le nom ou l'identifiant d'une zone. Faux sans `box` lisible. */
export function isApproxOutline(e) {
  if (!e || !Array.isArray(e.box) || e.box.length !== 4 || !e.box.every(Number.isFinite)) return false;
  const rings = Array.isArray(e.rings) ? e.rings : [];
  if (!rings.length) return true;
  if (rings.length !== 1 || !Array.isArray(rings[0])) return false;
  const ring = rings[0],
    pts = ring.length > 1 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1] ? ring.slice(0, -1) : ring,
    [w, s, ea, n] = e.box,
    corners = new Set([
      [w, s],
      [ea, s],
      [ea, n],
      [w, n]
    ].map(String)),
    got = new Set(pts.map(p => String([p[0], p[1]])));
  return pts.length === 4 && got.size === 4 && [...got].every(p => corners.has(p));
}
/** La carte de zones, projetée et mesurée : `entries` [{ id, rings [[[lon, lat], …]], box [w, s, e, n] }], `widthPx` la largeur disponible, `maxH` la hauteur maximale.
 *  Projection équirectangulaire x = lon·cos φ0, y = −lat sur le cadre qui réunit les zones (φ0 : sa latitude médiane), 5 % de marge. Rend null sans zone ; sinon { vb [x, y, w, h]
 *  (le viewBox), w, h (pixels), scale (pixels par unité), small (une zone à cocher fait moins de MAP_MIN_PX en largeur ou en hauteur : pas de carte), shapes [{ id, d, approx
 *  (contour approximatif : voir isApproxOutline) }] }. Une zone sans anneau est dessinée par le rectangle de son cadre. */
export function zoneMap(entries, widthPx, maxH = 260) {
  const list = (entries || []).filter(e => e && Array.isArray(e.box) && e.box.length === 4 && e.box.every(Number.isFinite) && Array.isArray(
    e.rings));
  if (!list.length) return null;
  const box = list.reduce((b, e) => [Math.min(b[0], e.box[0]), Math.min(b[1], e.box[1]), Math.max(b[2], e.box[2]), Math.max(b[3], e.box[
      3])], [180, 90, -180, -90]),
    k = Math.max(0.05, Math.cos((box[1] + box[3]) / 2 * Math.PI / 180)),
    W = Math.max(1e-6, (box[2] - box[0]) * k),
    H = Math.max(1e-6, box[3] - box[1]),
    vb = [box[0] * k - W * 0.05, -box[3] - H * 0.05, W * 1.1, H * 1.1],
    scale = Math.min(Math.max(0, widthPx) / vb[2], maxH / vb[3]);
  return {
    vb: vb.map(r3),
    w: r3(vb[2] * scale),
    h: r3(vb[3] * scale),
    scale,
    small: list.some(e => (e.box[2] - e.box[0]) * k * scale < MAP_MIN_PX || (e.box[3] - e.box[1]) * scale < MAP_MIN_PX),
    shapes: list.map(e => ({
      id: e.id,
      approx: e.approx === true || isApproxOutline(e),
      d: (e.rings.length ? e.rings : [
        [
          [e.box[0], e.box[1]],
          [e.box[2], e.box[1]],
          [e.box[2], e.box[3]],
          [e.box[0], e.box[3]],
          [e.box[0], e.box[1]]
        ]
      ]).map(ring => `M${ring.map(([lon, lat]) => `${r3(lon * k)} ${r3(-lat)}`).join('L')}Z`).join('')
    }))
  };
}
