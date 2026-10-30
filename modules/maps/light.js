// V3 maps — le dessin léger pendant un geste (V3 § 10.30 ; l'utilisateur, 30 octobre : « le freeze de refresh est efficace pour la
// fluidité, mais gênant pour se déplacer : un intermédiaire ? ») : des traits seuls — espaces, voies, route, terrains en symbole —
// depuis des chemins en coordonnées Mercator faits une fois pour les listes du dernier dessin complet ; ni étiquette, ni passe de
// collision, ni vecteur de piste, ni cartouche. Les chemins ne dépendent pas du zoom : une transformation les pose à l'écran (pan et
// zoom). Le dessin complet revient au repos (draw.js).

const Z0 = 10,
  TILE = 512,
  RAD = Math.PI / 180;
/** Position Mercator (px du monde au zoom Z0, celui de MapLibre : 512 × 2^z). */
function merc(lat, lon) {
  const s = Math.sin(Math.max(-85, Math.min(85, lat)) * RAD),
    w = TILE * 2 ** Z0;
  return [(lon + 180) / 360 * w, (.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * w];
}
/** Couleur du trait d'un espace : la règle du dessin complet (lib/aero_symbols.js), sans bande ni hachure. */
function colorOf(a) {
  const t = String(a.type || '').toUpperCase();
  if (a.azba || /^(R|D|P|W|A|TRA|TSA|MOA|MTR)$/.test(t) || a.cls === 'A') return '#d6173f';
  if (/^(RMZ|TMZ|RMZ-TMZ)$/.test(t)) return '#222';
  if (a.cls === 'E' || a.cls === 'G' || t === 'SIV') return '#5b86c8';
  return '#1d4a9e';
}
/** Les listes d'un dessin complet sont-elles les mêmes (mêmes tableaux) ? */
export const sameSrc = (a, b) => !!a && !!b && a.airspaces === b.airspaces && a.airways === b.airways && a.aerodromes === b.aerodromes &&
  a.route === b.route;
/** Chemins du dessin léger pour src = { airspaces, airways, aerodromes, route } (les listes que le dernier dessin complet a montrées) :
 *  { src, ref, spaces: [[couleur, Path2D]], airways, route, ads } en px Mercator au zoom Z0 relatifs au point ref (des nombres petits). */
export function lightPaths(src) {
  const first = (src.route || [])[0] || (src.aerodromes || [])[0] || {
      lat: 0,
      lon: 0
    },
    ref = {
      lat: +first.lat,
      lon: +first.lon
    },
    [rx, ry] = merc(ref.lat, ref.lon),
    at = (lat, lon) => {
      const [x, y] = merc(+lat, +lon);
      return [x - rx, y - ry];
    },
    byColor = new Map();
  for (const a of src.airspaces || []) {
    const col = colorOf(a),
      p = byColor.get(col) || byColor.set(col, new Path2D()).get(col);
    for (const r of a.rings || []) {
      r.forEach((q, i) => {
        const [x, y] = Array.isArray(q) ? at(q[0], q[1]) : at(q.lat, q.lon);
        if (i) p.lineTo(x, y);
        else p.moveTo(x, y);
      });
      p.closePath();
    }
  }
  const airways = new Path2D();
  for (const s of src.airways || []) {
    if (!s?.a || !s?.b) continue;
    airways.moveTo(...at(s.a.lat, s.a.lon));
    airways.lineTo(...at(s.b.lat, s.b.lon));
  }
  const route = new Path2D();
  (src.route || []).forEach((q, i) => i ? route.lineTo(...at(q.lat, q.lon)) : route.moveTo(...at(q.lat, q.lon)));
  const list = src.aerodromes || [],
    ads = new Float64Array(list.length * 2);
  list.forEach((a, i) => {
    const [x, y] = at(a.lat, a.lon);
    ads[2 * i] = x;
    ads[2 * i + 1] = y;
  });
  return {
    src,
    ref,
    spaces: [...byColor],
    airways,
    route,
    ads
  };
}
/** Peint les chemins L à l'écran : project(lngLat) → { x, y } (px CSS, la carte MapLibre), zoom de la carte, W × H, dpr ; pal : la
 *  palette de la Carte (route, voies), ink : l'encre des terrains. Rend le nombre de terrains peints. */
export function drawLight(ctx, L, {
  project,
  zoom,
  W,
  H,
  dpr,
  pal,
  ink
}) {
  const o = project([L.ref.lon, L.ref.lat]),
    k = 2 ** (zoom - Z0);
  ctx.save();
  ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * o.x, dpr * o.y);
  ctx.lineJoin = 'round';
  ctx.globalAlpha = .8;
  ctx.lineWidth = 1.2 / k;
  for (const [col, p] of L.spaces) {
    ctx.strokeStyle = col;
    ctx.stroke(p);
  }
  ctx.globalAlpha = .6;
  ctx.lineWidth = .8 / k;
  ctx.strokeStyle = pal.airwayLow;
  ctx.stroke(L.airways);
  ctx.globalAlpha = 1;
  ctx.lineWidth = 3 / k;
  ctx.strokeStyle = pal.route;
  ctx.stroke(L.route);
  // les terrains : un petit carré chacun, à taille fixe à l'écran
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = ink;
  let n = 0;
  for (let i = 0; i < L.ads.length; i += 2) {
    const x = o.x + L.ads[i] * k,
      y = o.y + L.ads[i + 1] * k;
    if (x < -4 || y < -4 || x > W + 4 || y > H + 4) continue;
    ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
    n++;
  }
  ctx.restore();
  return n;
}
