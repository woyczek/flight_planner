// V3 data — le calcul pur du zoom et du déplacement de la carte du monde (SOG-0262, lot D1) : la vue est un cadre [x, y, largeur, hauteur] en unités du chemin ; elle garde le rapport de son cadre de départ (celui de la couverture ou du monde), ne sort jamais du monde et ne
// dépasse ni un zoom minimal ni un zoom maximal. Pur : ni page, ni événement, ni stockage.

/** Le zoom avant le plus fort : la vue ne peut pas être plus étroite que ce quotient de la largeur du monde. */
export const MAX_ZOOM = 60;
/** Un cadre [x, y, l, h] lisible ? */
export const okBox = b => Array.isArray(b) && b.length === 4 && b.every(Number.isFinite) && b[2] > 0 && b[3] > 0;
/** Ramène la vue dans le monde : sa largeur entre le minimum (le monde / MAX_ZOOM) et le maximum (le monde entier, sans jamais être plus petit que le cadre de départ), sa hauteur suit le rapport du cadre de départ, sa position reste dans le monde (ou dans le cadre de départ s'il le dépasse). */
export function clampView(view, base, world) {
  const ratio = base[2] / base[3],
    maxW = Math.max(Math.min(world[2], world[3] * ratio), base[2]),
    minW = Math.min(world[2] / MAX_ZOOM, maxW),
    w = Math.min(Math.max(view[2], minW), maxW),
    h = w / ratio,
    x0 = Math.min(world[0], base[0]),
    x1 = Math.max(world[0] + world[2], base[0] + base[2]),
    y0 = Math.min(world[1], base[1]),
    y1 = Math.max(world[1] + world[3], base[1] + base[3]),
    fit = (v, lo, hi, size) => hi - lo <= size ? lo + (hi - lo - size) / 2 : Math.min(Math.max(v, lo), hi - size);
  return [fit(view[0], x0, x1, w), fit(view[1], y0, y1, h), w, h].map(v => Math.round(v * 1e4) / 1e4);
}
/** Zoom autour d'un point (px, py en unités du chemin) : `factor` > 1 éloigne, < 1 approche ; le point reste sous le doigt. */
export function zoomAt(view, px, py, factor, base, world) {
  const f = Math.min(Math.max(Number.isFinite(factor) ? factor : 1, .05), 20),
    w = view[2] * f,
    h = view[3] * f;
  return clampView([px - (px - view[0]) * f, py - (py - view[1]) * f, w, h], base, world);
}
/** Déplacement de la vue de (dx, dy) unités du chemin ; borné au monde. */
export const panBy = (view, dx, dy, base, world) => clampView([view[0] + dx, view[1] + dy, view[2], view[3]], base, world);
/** Zoom en nombre de fois le cadre de départ (1 = le cadre de départ) : pour dire si la vue est celle de départ. */
export const zoomOf = (view, base) => base[2] / view[2];
