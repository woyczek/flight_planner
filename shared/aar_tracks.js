(() => {
  'use strict';
  // Axes de ravitaillement en vol (MILAIP France ENR 5.7) : lecture du XML de coordonnées
  // (miam-enr-5-7-coordinates.xml, points aixm:DesignatedPoint par page) et géométrie exacte de
  // l'hippodrome — position, longueur, largeur, orientation, côté du circuit.
  //
  // Les points d'un axe se suivent : IP (entrée), CP (fin d'axe), S1 (milieu exact de l'axe),
  // et, s'il existe, S2 (décalé perpendiculairement à l'axe depuis S1 : centre de la branche
  // retour, donc largeur et côté de l'hippodrome). Ex. SIMONE : IP → CP 48 NM au 010°, S2 à
  // 14,1 NM au 280° → branche retour à l'ouest, virages de 14,1 NM de diamètre.
  // Sans S2, la largeur est celle demandée (options.defaultWidthNm) et le côté « droite » par défaut
  // (convention d'hippodrome), à confirmer.
  // Les noms des axes ne figurent pas dans le XML : table de noms optionnelle (options.names,
  // clé = identifiant du groupe « P<page>-<n> » ou coordonnées de l'IP arrondies).
  const R = 6371.0088, NM = 1.852, rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;

  // Plan local (est, nord) en km autour d'une origine : précis à mieux que 0,1 % sur 100 km.
  const toLocal = (o, p) => [rad(p.lon - o.lon) * Math.cos(rad(o.lat)) * R, rad(p.lat - o.lat) * R];
  const toGeo = (o, [x, y]) => ({ lat: o.lat + deg(y / R), lon: o.lon + deg(x / (R * Math.cos(rad(o.lat)))) });
  const bearing = (a, b) => { const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat)), x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon)); return (deg(Math.atan2(y, x)) + 360) % 360; };

  // ---- lecture du XML : pages → points (ordre du document)
  function parsePages(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    const pages = [...doc.getElementsByTagNameNS('*', 'sourcePage')];
    return pages.map(page => ({
      page: Number(page.getAttribute('number')),
      points: [...page.getElementsByTagNameNS('*', 'DesignatedPoint')].map(p => {
        const [lat, lon] = (p.getElementsByTagNameNS('*', 'pos')[0]?.textContent || '').trim().split(/\s+/).map(Number);
        return { id: p.getElementsByTagNameNS('*', 'designator')[0]?.textContent || '', lat, lon, source: p.getElementsByTagNameNS('*', 'sourceCoordinate')[0]?.textContent || '' };
      }).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon))
    }));
  }

  // ---- regroupement en axes : IP, CP, S1 = milieu (tolérance), S2 perpendiculaire optionnel
  function groups(pages, { midToleranceKm = 2, perpendicularTolerance = 0.15 } = {}) {
    const out = [], loose = [];
    pages.forEach(({ page, points }) => {
      let i = 0, n = 0;
      while (i < points.length) {
        const [ip, cp, s1, s2] = points.slice(i, i + 4);
        if (ip && cp && s1) {
          const mid = { lat: (ip.lat + cp.lat) / 2, lon: (ip.lon + cp.lon) / 2 }, off = toLocal(mid, s1);
          if (Math.hypot(...off) <= midToleranceKm) {
            const axis = toLocal(ip, cp), L = Math.hypot(...axis); let offset = null;
            if (s2) {
              const o = toLocal(s1, s2), cross = (axis[0] * o[1] - axis[1] * o[0]) / L, along = (axis[0] * o[0] + axis[1] * o[1]) / L;
              if (Math.abs(along) <= perpendicularTolerance * Math.abs(cross) && Math.abs(cross) < L) offset = cross; // + : à gauche de l'axe
            }
            const used = offset == null ? 3 : 4;
            out.push({ id: `P${page}-${++n}`, page, ip, cp, s1, s2: offset == null ? null : s2, points: points.slice(i, i + used) });
            i += used; continue;
          }
        }
        loose.push({ page, ...points[i] }); i++;
      }
    });
    return { axes: out, loose };
  }

  // ---- hippodrome d'un axe : branche aller IP → CP, branche retour décalée, deux demi-cercles
  function racetrack(axis, { defaultWidthNm = 10, defaultSide = 'R', segments = 24 } = {}) {
    const o = axis.s1, a = toLocal(o, axis.ip), b = toLocal(o, axis.cp);
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    const left = [-u[1], u[0]]; // normale à gauche de l'axe (sens IP → CP)
    let widthKm, side, measured = false;
    if (axis.s2) { const s = toLocal(o, axis.s2), cross = u[0] * s[1] - u[1] * s[0]; widthKm = Math.abs(cross); side = cross > 0 ? 'L' : 'R'; measured = true; }
    else { widthKm = defaultWidthNm * NM; side = defaultSide; }
    const n = side === 'L' ? left : [-left[0], -left[1]], r = widthKm / 2;
    const ip2 = [a[0] + n[0] * widthKm, a[1] + n[1] * widthKm], cp2 = [b[0] + n[0] * widthKm, b[1] + n[1] * widthKm];
    const turn = (center, fromAngle) => Array.from({ length: segments + 1 }, (_, k) => { const t = fromAngle + (side === 'L' ? 1 : -1) * Math.PI * k / segments; return [center[0] + r * Math.cos(t), center[1] + r * Math.sin(t)]; });
    const angle = v => Math.atan2(v[1], v[0]);
    // Contour : IP → CP, virage autour du milieu CP–CP', CP' → IP', virage autour du milieu IP'–IP.
    const cEnd = [(b[0] + cp2[0]) / 2, (b[1] + cp2[1]) / 2], cStart = [(a[0] + ip2[0]) / 2, (a[1] + ip2[1]) / 2];
    const ring = [a, b, ...turn(cEnd, angle([-n[0], -n[1]])).slice(1, -1), cp2, ip2, ...turn(cStart, angle(n)).slice(1, -1), a].map(p => toGeo(o, p));
    return {
      id: axis.id, name: axis.name || '', ip: axis.ip, cp: axis.cp, s1: axis.s1, s2: axis.s2,
      heading: Math.round(bearing(axis.ip, axis.cp) * 10) / 10, lengthNm: Math.round(L / NM * 10) / 10,
      widthNm: Math.round(widthKm / NM * 10) / 10, side, measured,
      returnLeg: [toGeo(o, cp2), toGeo(o, ip2)], ring
    };
  }
  // GeoJSON (MapLibre, SVG) : contour + axe aller.
  const toGeoJson = tracks => ({ type: 'FeatureCollection', features: tracks.flatMap(t => [
    { type: 'Feature', properties: { kind: 'racetrack', id: t.id, name: t.name, heading: t.heading, lengthNm: t.lengthNm, widthNm: t.widthNm, side: t.side, measured: t.measured }, geometry: { type: 'Polygon', coordinates: [t.ring.map(p => [p.lon, p.lat])] } },
    { type: 'Feature', properties: { kind: 'axis', id: t.id, name: t.name }, geometry: { type: 'LineString', coordinates: [[t.ip.lon, t.ip.lat], [t.cp.lon, t.cp.lat]] } }
  ]) });

  // Axe le plus proche d'une position (point de mission : IP, S1… à ~quelques centaines de mètres).
  function nearest(tracksOrAxes, point, maxKm = 2) {
    let best = null;
    tracksOrAxes.forEach(t => [t.ip, t.cp, t.s1, t.s2].filter(Boolean).forEach(p => { const d = Math.hypot(...toLocal(point, p)); if (d <= maxKm && (!best || d < best.d)) best = { d, track: t }; }));
    return best?.track || null;
  }

  window.AarTracks = { parsePages, groups, racetrack, toGeoJson, nearest, bearing };
})();
