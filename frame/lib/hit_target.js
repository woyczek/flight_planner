// V3 — la règle commune des CIBLES d'une carte (SOG-0343 : « il faut avoir de tout petits doigts pour viser les points météo déjà téléchargés… des accès parasites »).
// La taille d'un doigt n'est pas un réglage de l'utilisateur : c'est un fait que l'appareil déclare (pointeur grossier ou fin). Donc UNE règle pour toutes les cartes :
//   · sur un pointeur GROSSIER (un doigt, un stylet) tout point d'une carte se prend dans un rayon de 22 px (une cible de 44 px) ; à la SOURIS, 8 px ;
//   · quand plusieurs points sont dans le rayon, c'est le PLUS PROCHE du point d'appui qui est pris (à égalité, le premier de la liste) ;
//   · un appui qui ne prend RIEN rend null : il ne lance AUCUNE lecture, aucun accès (c'est à l'appelant de n'en lancer aucun) ;
//   · le rayon ne vaut que pour des points déjà dessinés : l'appelant donne leurs positions à l'écran (px, dans le même repère que l'appui).
// Pur : aucune lecture de la page hors `radiusFor` (qui lit le type du pointeur de l'événement, sinon la requête média).
export const RADIUS = Object.freeze({
  coarse: 22, // un doigt : une cible de 44 px
  fine: 8 // une souris
});

/** Le rayon d'une cible pour ce pointeur : 'touch' | 'pen' (grossier) → 22, 'mouse' → 8 ; sans type connu, la requête média (pointer: coarse) de l'appareil. */
export function radiusFor(pointerType, env = globalThis) {
  if (pointerType === 'touch' || pointerType === 'pen') return RADIUS.coarse;
  if (pointerType === 'mouse') return RADIUS.fine;
  try {
    return env.matchMedia?.('(pointer: coarse)').matches ? RADIUS.coarse : RADIUS.fine;
  } catch {
    return RADIUS.fine;
  }
}

/** Le point pris par un appui en (x, y) : { item, d, i } — le plus proche dans `radius` px (inclus), à égalité le premier — ou null (rien n'est pris : aucune lecture).
 *  points : [{ x, y, … }] positions à l'écran (px) ; ou, avec `at`, une liste d'objets dont at(item) rend { x, y }. */
export function pick(points, x, y, radius, at = p => p) {
  if (!Array.isArray(points) || !Number.isFinite(x) || !Number.isFinite(y) || !(radius > 0)) return null;
  let best = null;
  for (let i = 0; i < points.length; i++) {
    const p = at(points[i]);
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= radius && (!best || d < best.d)) best = {
      item: points[i],
      d,
      i
    };
  }
  return best;
}

/** Les points qui se touchent : ceux dont deux sont plus proches que le rayon (de quoi dire « plusieurs points ici » ou les écarter) ; utile aux tests et au dessin. */
export function crowded(points, radius, at = p => p) {
  const out = new Set();
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) {
      const a = at(points[i]),
        b = at(points[j]);
      if (a && b && Math.hypot(a.x - b.x, a.y - b.y) < radius) {
        out.add(i);
        out.add(j);
      }
    }
  return [...out];
}
