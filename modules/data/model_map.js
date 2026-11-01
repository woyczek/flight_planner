// V3 data — le calcul pur de la carte des zones à cocher (SPEC § 5.5, § 11) : les teintes, le contour approché, les anneaux lus d'un seul tenant et les entités que le socle de carte dessine.
// Ni état, ni page, ni appel : ne dessine rien (zonemap.js) et ne connaît ni les jeux ni les fins de travaux ; le cadrage de la vue est celui du socle (zonesLayer.fit).

/** Les zones d'aerodb que dessine la carte pour chaque État du panneau des procédures : la France pour « LF », les États-Unis pour « K ». */
export const PROC_ZONES = {
  LF: ['fr'],
  K: ['us']
};
/** La teinte d'une zone sur la carte : 'muted' (hors de la couverture), 'accent' (une opération la traite), 'warn' (rien de publié ou cycle dépassé), 'ok' (à jour). */
export function mapTone({
  inCoverage,
  running,
  published,
  stale
}) {
  return !inCoverage ? 'muted' : running ? 'accent' : !published || stale ? 'warn' : 'ok';
}
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
/** Un anneau [[lon, lat], …] lu d'un seul tenant : s'il franchit l'antiméridien (ses longitudes s'étalent sur plus de 180°), ses
 *  longitudes ouest (négatives) sont décalées de +360° (Fidji : 177 … 182 au lieu de −180 … 180) ; sinon le même anneau. */
export function unwrapRing(ring) {
  const lons = (ring || []).map(p => p[0]);
  if (!lons.length || Math.max(...lons) - Math.min(...lons) <= 180) return ring || [];
  return ring.map(([lon, lat]) => [lon < 0 ? lon + 360 : lon, lat]);
}
/** Les entités de la carte pour zonesLayer du socle : un GeoJSON FeatureCollection, une entité MultiPolygon par zone (ses anneaux lus
 *  d'un seul tenant ; le cadre seul sans anneau), propriétés { id, tone (mapTone), picked, approx (isApproxOutline) }. `entries` :
 *  [{ id, rings, box, tone, picked }]. */
export function zoneFeatures(entries) {
  return {
    type: 'FeatureCollection',
    features: (entries || []).filter(e => e && e.id).map(e => {
      const rings = Array.isArray(e.rings) && e.rings.length ? e.rings.map(unwrapRing) : Array.isArray(e.box) ? [
        [
          [e.box[0], e.box[1]],
          [e.box[2], e.box[1]],
          [e.box[2], e.box[3]],
          [e.box[0], e.box[3]],
          [e.box[0], e.box[1]]
        ]
      ] : [];
      return {
        type: 'Feature',
        id: e.id,
        properties: {
          id: e.id,
          tone: e.tone || 'muted',
          picked: e.picked === true,
          approx: e.approx === true || isApproxOutline(e)
        },
        geometry: {
          type: 'MultiPolygon',
          coordinates: rings.map(r => [r])
        }
      };
    }).filter(f => f.geometry.coordinates.length)
  };
}
/** La teinte d'un terrain sur la carte d'après coverage(icao) d'aerodb : 'ok' (procédures détenues, à jour), 'warn' (détenues mais d'un cycle passé : `outdated`, ou en partie : `partial`), null pour tout autre
 *  (rouge, orange lisible à la demande, code mal formé : ce n'est pas un terrain détenu, il n'est pas dessiné). */
export function coverTone(c) {
  if (!c || (c.reason !== 'held' && c.reason !== 'partial')) return null;
  return c.outdated === true || c.reason === 'partial' ? 'warn' : 'ok';
}
/** Les emprises [ouest, sud, est, nord] à demander à aerodb pour la vue d'une carte (longitudes sur [-180, 180]) : une seule, ou deux quand la vue passe l'antiméridien (l'ouest ou l'est de la carte du monde répété sort de ±180),
 *  une seule du monde entier quand la vue couvre 360° ou plus ; [] si l'une des limites n'est pas un nombre. */
export function viewBoxes(w, s, e, n) {
  if (![w, s, e, n].every(Number.isFinite)) return [];
  if (e - w >= 360) return [
    [-180, s, 180, n]
  ];
  const w0 = ((w + 180) % 360 + 360) % 360 - 180,
    e0 = w0 + (e - w);
  return e0 > 180 ? [
    [w0, s, 180, n],
    [-180, s, e0 - 360, n]
  ] : [
    [w0, s, e0, n]
  ];
}
/** Les entités de la carte pour pointsLayer du socle : un GeoJSON FeatureCollection de Point [lon, lat] avec { id (le code OACI), tone } ; `items` : [{ id, lon, lat, tone }], ceux sans position ou sans teinte sont laissés. */
export function pointFeatures(items) {
  return {
    type: 'FeatureCollection',
    features: (items || []).filter(p => p && p.id && Number.isFinite(p.lon) && Number.isFinite(p.lat) && (p.tone === 'ok' || p.tone ===
      'warn')).map(p => ({
      type: 'Feature',
      properties: {
        id: p.id,
        tone: p.tone
      },
      geometry: {
        type: 'Point',
        coordinates: [p.lon, p.lat]
      }
    }))
  };
}
