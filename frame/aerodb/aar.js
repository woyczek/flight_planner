(() => {
  'use strict';
  // V3 aerodb — axes de ravitaillement en vol (AAR) prêts à dessiner, d'après le XML publié par zone (aarXml, aarXmlExtra :
  // format 2.0 de la MILAIP France ENR 5.7, et des autres pays au même format). Repris de shared/aar_tracks.js (V2) :
  // lecture du XML corrigé (parseTrackXml) et géométrie exacte de l'hippodrome (racetrack) — branche aller IP → CP,
  // branche retour décalée de la largeur du côté donné par S2 (sinon le côté écrit, sinon la droite), deux demi-cercles.
  // Calcul pur : aucune page, aucun stockage.
  // API : AeroDBAar.tracksOf(xmlTexts) → [{ name, kind ('track' | 'heavy'), heading, lengthNm, widthNm, side, ip, cp,
  //   ring: [{ lat, lon }] (contour de l'hippodrome, axes « track »), legs: [[a, b], [a, b]] (axes « heavy ») }] ;
  //   parseTrackXml(xml), racetrack(axe, options).
  const R = 6371.0088,
    NM = 1.852,
    rad = d => d * Math.PI / 180,
    deg = r => r * 180 / Math.PI;
  /** Plan local (est, nord) en km autour de l'origine o (précis à mieux que 0,1 % sur 100 km). */
  const toLocal = (o, p) => [rad(p.lon - o.lon) * Math.cos(rad(o.lat)) * R, rad(p.lat - o.lat) * R];
  /** Point géographique d'une position du plan local (km) autour de o. */
  const toGeo = (o, [x, y]) => ({
    lat: o.lat + deg(y / R),
    lon: o.lon + deg(x / (R * Math.cos(rad(o.lat))))
  });
  /** Route vraie (°) de a vers b. */
  const bearing = (a, b) => {
    const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat)),
      x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
    return (deg(Math.atan2(y, x)) + 360) % 360;
  };

  /** Hippodrome d'un axe { name, ip, cp, s1, s2 } : contour, cap, longueur, largeur, côté. */
  function racetrack(axis, {
    defaultWidthNm = 14,
    defaultSide = 'R',
    segments = 24
  } = {}) {
    const o = axis.s1,
      a = toLocal(o, axis.ip),
      b = toLocal(o, axis.cp),
      L = Math.hypot(b[0] - a[0], b[1] - a[1]),
      u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L],
      left = [-u[1], u[0]]; // normale à gauche de l'axe (sens IP → CP)
    let widthKm, side;
    if (axis.s2) {
      const s = toLocal(o, axis.s2),
        cross = u[0] * s[1] - u[1] * s[0];
      widthKm = Math.abs(cross);
      side = cross > 0 ? 'L' : 'R';
    } else {
      widthKm = defaultWidthNm * NM;
      side = defaultSide;
    }
    const n = side === 'L' ? left : [-left[0], -left[1]],
      r = widthKm / 2,
      ip2 = [a[0] + n[0] * widthKm, a[1] + n[1] * widthKm],
      cp2 = [b[0] + n[0] * widthKm, b[1] + n[1] * widthKm],
      turn = (c, from) => Array.from({
        length: segments + 1
      }, (_, k) => {
        const t = from + (side === 'L' ? 1 : -1) * Math.PI * k / segments;
        return [c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)];
      }),
      angle = v => Math.atan2(v[1], v[0]),
      cEnd = [(b[0] + cp2[0]) / 2, (b[1] + cp2[1]) / 2],
      cStart = [(a[0] + ip2[0]) / 2, (a[1] + ip2[1]) / 2];
    return {
      name: axis.name || '',
      kind: 'track',
      ip: axis.ip,
      cp: axis.cp,
      heading: Math.round(bearing(axis.ip, axis.cp) * 10) / 10,
      lengthNm: Math.round(L / NM * 10) / 10,
      widthNm: Math.round(widthKm / NM * 10) / 10,
      side,
      ring: [a, b, ...turn(cEnd, angle([-n[0], -n[1]])).slice(1, -1), cp2, ip2, ...turn(cStart, angle(n)).slice(1, -1), a].map(p => toGeo(
        o, p))
    };
  }

  /** Axes du XML corrigé (format 2.0) : points par rôle (ARIP, ARCP, S1, S2, legN-start / end). */
  function parseTrackXml(xmlText) {
    const doc = new DOMParser().parseFromString(String(xmlText || ''), 'application/xml');
    if (doc.querySelector('parsererror')) return [];
    return [...doc.getElementsByTagNameNS('*', 'Track')].map(el => {
      const pts = [...el.getElementsByTagNameNS('*', 'DesignatedPoint')].map(p => {
          const [lat, lon] = (p.getElementsByTagNameNS('*', 'pos')[0]?.textContent || '').trim().split(/\s+/).map(Number);
          return {
            name: p.getElementsByTagNameNS('*', 'designator')[0]?.textContent || '',
            role: p.getAttribute('miam:role') || p.getAttributeNS('https://example.org/miam/enr-5-7', 'role') || '',
            lat,
            lon
          };
        }).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon)),
        role = r => pts.find(p => p.role === r),
        attr = k => el.getAttribute(k);
      return {
        name: attr('name') || '',
        kind: attr('kind') || 'track',
        widthNm: Number(attr('widthNm')) || 14,
        side: attr('side') === 'L' || attr('side') === 'R' ? attr('side') : null,
        ip: role('ARIP'),
        cp: role('ARCP'),
        s1: role('S1'),
        s2: role('S2'),
        legs: [
          [role('leg1-start'), role('leg1-end')],
          [role('leg2-start'), role('leg2-end')]
        ].filter(l => l[0] && l[1])
      };
    });
  }

  /** Axes prêts à dessiner de plusieurs XML (doublons de nom écartés : le premier gagne). */
  function tracksOf(xmlTexts) {
    const out = [],
      seen = new Set();
    for (const x of [].concat(xmlTexts || []))
      for (const t of parseTrackXml(x)) {
        if (!t.name || seen.has(t.name)) continue;
        if (t.kind === 'heavy') {
          if (!t.legs.length) continue;
          seen.add(t.name);
          out.push({
            name: t.name,
            kind: 'heavy',
            widthNm: t.widthNm,
            heading: Math.round(bearing(t.legs[0][0], t.legs[0][1]) * 10) / 10,
            legs: t.legs
          });
          continue;
        }
        if (!t.ip || !t.cp) continue;
        seen.add(t.name);
        out.push(racetrack({
          name: t.name,
          ip: t.ip,
          cp: t.cp,
          s1: t.s1 || {
            lat: (t.ip.lat + t.cp.lat) / 2,
            lon: (t.ip.lon + t.cp.lon) / 2
          },
          s2: t.s2 || null
        }, {
          defaultWidthNm: t.widthNm,
          defaultSide: t.side || 'R'
        }));
      }
    return out;
  }

  window.AeroDBAar = {
    tracksOf,
    parseTrackXml,
    racetrack
  };
})();
