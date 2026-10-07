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
  const R = 6371.0088,
    NM = 1.852,
    rad = d => d * Math.PI / 180,
    deg = r => r * 180 / Math.PI;

  // Plan local (est, nord) en km autour d'une origine : précis à mieux que 0,1 % sur 100 km.
  const toLocal = (o, p) => [rad(p.lon - o.lon) * Math.cos(rad(o.lat)) * R, rad(p.lat - o.lat) * R];
  /** Point géographique d'une position du plan local (km) autour de l'origine o. */
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

  // ---- lecture du XML : pages → points (ordre du document)
  function parsePages(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    const pages = [...doc.getElementsByTagNameNS('*', 'sourcePage')];
    return pages.map(page => ({
      page: Number(page.getAttribute('number')),
      points: [...page.getElementsByTagNameNS('*', 'DesignatedPoint')].map(p => {
        const [lat, lon] = (p.getElementsByTagNameNS('*', 'pos')[0]?.textContent || '').trim().split(/\s+/).map(Number);
        return {
          id: p.getElementsByTagNameNS('*', 'designator')[0]?.textContent || '',
          lat,
          lon,
          source: p.getElementsByTagNameNS('*', 'sourceCoordinate')[0]?.textContent || ''
        };
      }).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon))
    }));
  }

  // ---- regroupement en axes : IP, CP, S1 = milieu (tolérance), S2 perpendiculaire optionnel
  function groups(pages, {
    midToleranceKm = 2,
    perpendicularTolerance = 0.15
  } = {}) {
    const out = [],
      loose = [];
    pages.forEach(({
      page,
      points
    }) => {
      let i = 0,
        n = 0;
      while (i < points.length) {
        const [ip, cp, s1, s2] = points.slice(i, i + 4);
        if (ip && cp && s1) {
          const mid = {
              lat: (ip.lat + cp.lat) / 2,
              lon: (ip.lon + cp.lon) / 2
            },
            off = toLocal(mid, s1);
          if (Math.hypot(...off) <= midToleranceKm) {
            const axis = toLocal(ip, cp),
              L = Math.hypot(...axis);
            let offset = null;
            if (s2) {
              const o = toLocal(s1, s2),
                cross = (axis[0] * o[1] - axis[1] * o[0]) / L,
                along = (axis[0] * o[0] + axis[1] * o[1]) / L;
              if (Math.abs(along) <= perpendicularTolerance * Math.abs(cross) && Math.abs(cross) < L) offset =
                cross; // + : à gauche de l'axe
            }
            const used = offset == null ? 3 : 4;
            out.push({
              id: `P${page}-${++n}`,
              page,
              ip,
              cp,
              s1,
              s2: offset == null ? null : s2,
              points: points.slice(i, i + used)
            });
            i += used;
            continue;
          }
        }
        loose.push({
          page,
          ...points[i]
        });
        i++;
      }
    });
    return {
      axes: out,
      loose
    };
  }

  // ---- hippodrome d'un axe : branche aller IP → CP, branche retour décalée, deux demi-cercles
  function racetrack(axis, {
    defaultWidthNm = 10,
    defaultSide = 'R',
    segments = 24
  } = {}) {
    const o = axis.s1,
      a = toLocal(o, axis.ip),
      b = toLocal(o, axis.cp);
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]),
      u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    const left = [-u[1], u[0]]; // normale à gauche de l'axe (sens IP → CP)
    let widthKm, side, measured = false;
    if (axis.s2) {
      const s = toLocal(o, axis.s2),
        cross = u[0] * s[1] - u[1] * s[0];
      widthKm = Math.abs(cross);
      side = cross > 0 ? 'L' : 'R';
      measured = true;
    } else {
      widthKm = defaultWidthNm * NM;
      side = defaultSide;
    }
    const n = side === 'L' ? left : [-left[0], -left[1]],
      r = widthKm / 2;
    const ip2 = [a[0] + n[0] * widthKm, a[1] + n[1] * widthKm],
      cp2 = [b[0] + n[0] * widthKm, b[1] + n[1] * widthKm];
    /** Demi-cercle de virage de l'hippodrome (points) autour d'un centre. */
    const turn = (center, fromAngle) => Array.from({
      length: segments + 1
    }, (_, k) => {
      const t = fromAngle + (side === 'L' ? 1 : -1) * Math.PI * k / segments;
      return [center[0] + r * Math.cos(t), center[1] + r * Math.sin(t)];
    });
    /** Angle d'un vecteur du plan local. */
    const angle = v => Math.atan2(v[1], v[0]);
    // Contour : IP → CP, virage autour du milieu CP–CP', CP' → IP', virage autour du milieu IP'–IP.
    const cEnd = [(b[0] + cp2[0]) / 2, (b[1] + cp2[1]) / 2],
      cStart = [(a[0] + ip2[0]) / 2, (a[1] + ip2[1]) / 2];
    const ring = [a, b, ...turn(cEnd, angle([-n[0], -n[1]])).slice(1, -1), cp2, ip2, ...turn(cStart, angle(n)).slice(1, -1), a].map(p =>
      toGeo(o, p));
    return {
      id: axis.id,
      name: axis.name || '',
      ip: axis.ip,
      cp: axis.cp,
      s1: axis.s1,
      s2: axis.s2,
      heading: Math.round(bearing(axis.ip, axis.cp) * 10) / 10,
      lengthNm: Math.round(L / NM * 10) / 10,
      widthNm: Math.round(widthKm / NM * 10) / 10,
      side,
      measured,
      returnLeg: [toGeo(o, cp2), toGeo(o, ip2)],
      ring
    };
  }
  // GeoJSON (MapLibre, SVG) : contour + axe aller.
  const toGeoJson = tracks => ({
    type: 'FeatureCollection',
    features: tracks.flatMap(t => [{
      type: 'Feature',
      properties: {
        kind: 'racetrack',
        id: t.id,
        name: t.name,
        heading: t.heading,
        lengthNm: t.lengthNm,
        widthNm: t.widthNm,
        side: t.side,
        measured: t.measured
      },
      geometry: {
        type: 'Polygon',
        coordinates: [t.ring.map(p => [p.lon, p.lat])]
      }
    }, {
      type: 'Feature',
      properties: {
        kind: 'axis',
        id: t.id,
        name: t.name
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [t.ip.lon, t.ip.lat],
          [t.cp.lon, t.cp.lat]
        ]
      }
    }])
  });

  // Axe le plus proche d'une position (point de mission : IP, S1… à ~quelques centaines de mètres).
  function nearest(tracksOrAxes, point, maxKm = 2) {
    let best = null;
    tracksOrAxes.forEach(t => [t.ip, t.cp, t.s1, t.s2].filter(Boolean).forEach(p => {
      const d = Math.hypot(...toLocal(point, p));
      if (d <= maxKm && (!best || d < best.d)) best = {
        d,
        track: t
      };
    }));
    return best?.track || null;
  }

  // ---- lecture du PDF MILAIP ENR 5.7 (texte extrait par pdf.js, une chaîne par page)
  // Chaque point est donné deux fois : minutes décimales, puis DMS suivi du nom entre
  // parenthèses — les deux sont comparés (écart signalé). Axes : xxxIP, xxxCP, puis points
  // particuliers (S1, S2 / F / L1…) ; axes « heavy » : paires de branches FOXnn → ROMnn.
  // Règles de la page : « les lignes droites font 48 Nm » (30 Nm en moyenne altitude p4),
  // « la distance entre 2 points particuliers est de 14 Nm : c'est la largeur des circuits » ;
  // renvois (« YVETTE 3 » → note 3 « Branches de 30 Nm, 14 Nm de large »).
  const Q = "['’‘′]",
    QQ = "(?:''|[\"”″]|['’‘′]{2})?";
  const DMS = new RegExp(`(\\d{1,3})°\\s*(\\d{1,2})\\s*${Q}\\s*(\\d{1,2}(?:[.,]\\d+)?)\\s*${QQ}\\s*([NS])\\s*[-–]\\s*(\\d{1,3})°\\s*(\\d{1,2})\\s*${Q}\\s*(\\d{1,2}(?:[.,]\\d+)?)\\s*${QQ}\\s*([EW])\\s*\\(\\s*([A-Z0-9 ]+?)\\s*\\)`, 'g');
  const DM = new RegExp(`(\\d{1,3})°(\\d{1,2}[.,]\\d+)${Q}\\s*([NS])\\s*[-–]\\s*(\\d{1,3})°(\\d{1,2}[.,]\\d+)${Q}\\s*([EW])(?!\\s*\\()`, 'g');
  /** Nombre d'un texte (virgule décimale acceptée). */
  const num = v => Number(String(v).replace(',', '.'));
  /** Coordonnée signée selon l'hémisphère (S / W négatifs). */
  const sign = (v, h) => (h === 'S' || h === 'W' ? -v : v);
  /** Distance (NM) entre deux points. */
  const distNm = (a, b) => Math.hypot(...toLocal(a, b)) / NM;
  // Mots du tableau qui ne sont pas des noms de circuits.
  const NOT_NAMES = new Set(['FLB', 'TRA', 'UNL', 'SFC', 'ASML', 'AMSL', 'NORD', 'SUD', 'EST', 'OUEST', 'AARA', 'ARIP', 'ARCP', 'NOM',
    'NAME', 'ATC', 'AAR', 'LF', 'FL'
  ]);
  /** Milieu de deux points. */
  const middle = (a, b) => ({
    lat: (a.lat + b.lat) / 2,
    lon: (a.lon + b.lon) / 2
  });
  // Point dont les deux écritures divergent : on retient celle qui satisfait la géométrie.
  const variants = p => p.alt ? [p, {
    ...p,
    lat: p.alt.lat,
    lon: p.alt.lon,
    fromDecimal: true
  }] : [p];

  /** Axes de ravitaillement lus dans le texte de l'ENR 5.7 (MILAIP) : noms, points IP / CP / S1 / S2, axes « heavy » à branches, coordonnées recoupées avec la géométrie. */
  function parseEnr57(pagesText) {
    const tracks = [],
      issues = [],
      notes = {};
    const texts = pagesText.map(raw => raw.replace(/\s+/g, ' '));
    // Renvois communs à toutes les pages (définis p2) : « 3 Branches de 30 Nm… », « 5 Axe limité à 40 Nm… ».
    texts.forEach(text => {
      for (const m of text.matchAll(
          /(?:^|\s)(\d{1,2})\s+((?:Branches|Ne pas|Axe limité|Axe non|Sous r[ée]serve|Points pouvant)[^.]*\.)/g))
        if (!notes[m[1]]) notes[m[1]] = {
          text: m[2].replace(/\s+Zones de ravitaillement.*$/, '.').split(/\s(?=\d{1,2}\s+(?!Nm\b)[A-ZÉ])/)[0].replace(/([^.])$/,
            '$1.'),
          lengthNm: Number((m[2].match(/(\d{2})\s*Nm/) || [])[1]) || null
        };
    });
    texts.forEach((text, pageIndex) => {
      const page = pageIndex + 1;
      const matches = [...text.matchAll(DMS)];
      const named = matches.map(m => ({
        name: m[9].replace(/\s+/g, ''),
        lat: sign(num(m[1]) + num(m[2]) / 60 + num(m[3]) / 3600, m[4]),
        lon: sign(num(m[5]) + num(m[6]) / 60 + num(m[7]) / 3600, m[8]),
        dms: m[0].replace(/\s*\(.*$/, '')
      }));
      if (!named.length) return;
      const decimal = [...text.matchAll(DM)].map(m => ({
        lat: sign(num(m[1]) + num(m[2]) / 60, m[3]),
        lon: sign(num(m[4]) + num(m[5]) / 60, m[6]),
        dm: m[0]
      }));
      // Minutes décimales ↔ DMS, dans l'ordre du document : écart > 0,2 NM signalé.
      named.forEach((p, i) => {
        const d = decimal[i];
        if (!d) return;
        p.dm = d.dm;
        const e = distNm(p, d);
        if (e > 0.2) {
          p.alt = {
            lat: d.lat,
            lon: d.lon
          };
          issues.push({
            page,
            point: p.name,
            kind: 'coordinates',
            text: `${p.name} : ${p.dms} ≠ ${d.dm} (${e.toFixed(1)} NM)`
          });
        }
      });
      const pageLength = /font\s+30\s*Nm/i.test(text) && !/font\s+48\s*Nm/i.test(text) ? 30 : 48;
      // Noms des circuits : colonne du tableau, après la dernière coordonnée ; « YVETTE 3 » = renvoi 3.
      const pointNames = new Set(named.map(p => p.name)),
        tail = text.slice(matches[matches.length - 1].index);
      const words = [...tail.matchAll(/\b([A-Z]{3,})\b(?:\s+(\d{1,2})(?=\s|$))?/g)].map(m => ({
        word: m[1],
        note: m[2] || ''
      })).filter(w => !NOT_NAMES.has(w.word) && !pointNames.has(w.word) && !/(IP|CP)$/.test(w.word));
      /** Nom complet d'un circuit à partir de son préfixe (mots du tableau). */
      const fullName = prefix => words.find(w => w.word.startsWith(prefix)) || words.find(w => w.word[0] === prefix[0] && new RegExp(
        '^' + prefix.split('').join('.*')).test(w.word)) || null;
      // Axes « heavy » : branches FOXnn → ROMnn, deux branches consécutives = un circuit.
      const heavy = named.filter(p => /^(FOX?|ROM?)\d/.test(p.name));
      if (heavy.length) {
        const legs = [];
        for (let i = 0; i + 1 < heavy.length; i += 2) legs.push({
          start: heavy[i],
          end: heavy[i + 1],
          id: heavy[i].name.replace(/^FOX?/, '')
        });
        for (let i = 0; i + 1 < legs.length; i += 2) tracks.push({
          page,
          kind: 'heavy',
          name: `FOX${legs[i].id}/${legs[i + 1].id}`,
          legs: [legs[i], legs[i + 1]],
          points: [legs[i].start, legs[i].end, legs[i + 1].start, legs[i + 1].end]
        });
      }
      let current = null;
      named.filter(p => !heavy.includes(p)).forEach(p => {
        if (/IP$/.test(p.name)) {
          const prefix = p.name.slice(0, -2),
            full = fullName(prefix);
          if (!full) issues.push({
            page,
            track: prefix,
            kind: 'name',
            text: `${p.name} : nom du circuit introuvable`
          });
          current = {
            page,
            kind: 'track',
            name: full?.word || prefix,
            prefix,
            note: full?.note || '',
            ip: p,
            cp: null,
            particular: [],
            points: [p]
          };
          const note = notes[current.note];
          current.expectedNm = note?.lengthNm || pageLength;
          if (note) current.remark = note.text;
          tracks.push(current);
        } else if (current && p.name === `${current.prefix}CP`) {
          current.cp = p;
          current.points.push(p);
        } else if (current) {
          current.particular.push(p);
          current.points.push(p);
        } else issues.push({
          page,
          point: p.name,
          kind: 'orphan',
          text: `${p.name} : point sans axe`
        });
      });
    });
    // Géométrie et contrôles : longueur annoncée, S1 au milieu, S2 à 14 NM (largeur) perpendiculaire.
    tracks.filter(t => t.kind === 'track').forEach(t => {
      if (!t.cp) {
        issues.push({
          page: t.page,
          track: t.name,
          kind: 'incomplete',
          text: `${t.name} : ARCP absent`
        });
        return;
      }
      // Coordonnées divergentes : combinaison IP / CP la plus proche de la longueur annoncée, puis S1 le plus proche du milieu.
      let best = null;
      variants(t.ip).forEach(ip => variants(t.cp).forEach(cp => {
        const e = Math.abs(distNm(ip, cp) - t.expectedNm);
        if (!best || e < best.e - 0.05) best = {
          ip,
          cp,
          e
        };
      }));
      /** Choix de l'écriture cohérente d'un point dont les deux formes divergent. */
      const pick = (from, to) => {
        if (to.fromDecimal) {
          t.points[t.points.indexOf(from)] = to;
          delete to.alt;
          issues.push({
            page: t.page,
            point: to.name,
            kind: 'corrected',
            text: `${to.name} : minutes décimales retenues (${to.dm}) — cohérentes avec l'axe`
          });
        }
        return to;
      };
      t.ip = pick(t.ip, best.ip);
      t.cp = pick(t.cp, best.cp);
      const mid = middle(t.ip, t.cp);
      if (t.particular[0]) {
        const s1 = variants(t.particular[0]).sort((a, b) => distNm(a, mid) - distNm(b, mid))[0];
        t.particular[0] = pick(t.particular[0], s1);
      }
      const [s1, s2] = t.particular, L = distNm(t.ip, t.cp);
      t.lengthNm = Math.round(L * 10) / 10;
      t.widthNm = 14;
      if (Math.abs(L - t.expectedNm) > 1) issues.push({
        page: t.page,
        track: t.name,
        kind: 'length',
        text: `${t.name} : ${t.ip.name}–${t.cp.name} ${L.toFixed(1)} NM pour ${t.expectedNm} NM annoncés`
      });
      if (s1 && distNm(mid, s1) > 0.5) issues.push({
        page: t.page,
        track: t.name,
        kind: 'midpoint',
        text: `${t.name} : ${s1.name} à ${distNm(mid, s1).toFixed(1)} NM du milieu de l'axe`
      });
      if (s2) {
        const w = distNm(s1, s2);
        if (Math.abs(w - 14) > 0.7) issues.push({
          page: t.page,
          track: t.name,
          kind: 'width',
          text: `${t.name} : ${s1.name}–${s2.name} ${w.toFixed(1)} NM pour 14 NM`
        });
      }
      const r = racetrack({
        id: t.name,
        ip: t.ip,
        cp: t.cp,
        s1: s1 || mid,
        s2: s2 || null
      }, {
        defaultWidthNm: 14
      });
      Object.assign(t, {
        heading: r.heading,
        side: s2 ? r.side : null
      });
    });
    // Heavy : longueur d'une branche, écart entre branches (fin de la 1re → début de la 2de).
    tracks.filter(t => t.kind === 'heavy').forEach(t => {
      const [a, b] = t.legs;
      t.lengthNm = Math.round(distNm(a.start, a.end) * 10) / 10;
      t.widthNm = Math.round(distNm(a.end, b.start) * 10) / 10;
      t.heading = Math.round(bearing(a.start, a.end) * 10) / 10;
    });
    return {
      tracks,
      issues,
      notes
    };
  }
  // Racetrack d'un axe issu du PDF (côté inconnu : options.defaultSide).
  const trackRacetrack = (t, options = {}) => t.kind === 'heavy' ? null : racetrack({
    id: t.name,
    name: t.name,
    ip: t.ip,
    cp: t.cp,
    s1: t.particular[0] || {
      lat: (t.ip.lat + t.cp.lat) / 2,
      lon: (t.ip.lon + t.cp.lon) / 2
    },
    s2: t.particular[1] || null
  }, {
    defaultWidthNm: 14,
    ...options
  });

  // ---- XML corrigé : axes nommés, points nommés, largeur / longueur / cap, anomalies
  /** Échappe un texte pour XML. */
  const x = v => String(v ?? '').replace(/[&<>"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  } [c]));
  /** Coordonnée décimale à 8 chiffres. */
  const f6 = v => Number(v).toFixed(8);

  /** XML corrigé des axes (format 2.0) : axes nommés, points nommés avec leur rôle, largeur / longueur / cap, anomalies relevées. */
  function toXml({
    tracks,
    issues
  }, {
    source = 'MILAIP France ENR 5.7',
    edition = ''
  } = {}) {
    /** Élément aixm:DesignatedPoint d'un point d'axe (rôle IP, CP, S1, S2). */
    const pt = (p, role) => `      <aixm:DesignatedPoint gml:id="${x(p.name)}" miam:role="${role}">
        <aixm:designator>${x(p.name)}</aixm:designator>
        <aixm:location><aixm:ElevatedPoint gml:id="${x(p.name)}-location"><gml:pos srsName="EPSG:4326">${f6(p.lat)} ${f6(p.lon)}</gml:pos></aixm:ElevatedPoint></aixm:location>
        <miam:sourceCoordinate>${x(p.dms)}</miam:sourceCoordinate>${p.dm ? `\n        <miam:sourceDecimalMinutes>${x(p.dm)}</miam:sourceDecimalMinutes>` : ''}
      </aixm:DesignatedPoint>`;
    const body = tracks.map(t => t.kind === 'heavy' ?
      `    <miam:Track name="${x(t.name)}" kind="heavy" page="${t.page}" lengthNm="${t.lengthNm}" widthNm="${t.widthNm}" heading="${t.heading}">\n${t.legs.flatMap((l, i) => [pt(l.start, `leg${i + 1}-start`), pt(l.end, `leg${i + 1}-end`)]).join('\n')}\n    </miam:Track>` :
      `    <miam:Track name="${x(t.name)}" kind="track" page="${t.page}"${t.note ? ` note="${x(t.note)}"` : ''} lengthNm="${t.lengthNm ?? ''}" expectedLengthNm="${t.expectedNm}" widthNm="14" heading="${t.heading ?? ''}" side="${t.side || 'unknown'}"${t.remark ? ` remark="${x(t.remark)}"` : ''}>\n${[t.ip && pt(t.ip, 'ARIP'), t.cp && pt(t.cp, 'ARCP'), ...t.particular.map((p, i) => pt(p, i ? 'S2' : 'S1'))].filter(Boolean).join('\n')}\n    </miam:Track>`).join('\n');
    const problems = issues.map(i => `    <miam:issue page="${i.page}" kind="${i.kind}">${x(i.text)}</miam:issue>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<miam:TrackDataset xmlns:miam="https://example.org/miam/enr-5-7" xmlns:gml="http://www.opengis.net/gml/3.2" xmlns:aixm="http://www.aixm.aero/schema/4.5" version="2.0">
  <miam:metadata>
    <miam:sourceTitle>${x(source)} - Axes de ravitaillement</miam:sourceTitle>
    <miam:sourceEdition>${x(edition)}</miam:sourceEdition>
    <miam:rules>Lignes droites 48 NM sauf renvoi (30 ou 40 NM) ; largeur 14 NM (distance entre deux points particuliers) ; côté donné par S2 (inconnu sans S2).</miam:rules>
    <miam:coordinateReferenceSystem>WGS 84 (EPSG:4326), gml:pos order latitude longitude</miam:coordinateReferenceSystem>
    <miam:tracks>${tracks.length}</miam:tracks>
  </miam:metadata>
  <miam:tracksList>
${body}
  </miam:tracksList>
  <miam:issues>
${problems}
  </miam:issues>
</miam:TrackDataset>
`;
  }
  // Lecture du XML corrigé (format 2.0) : mêmes objets que parseEnr57.
  function parseTrackXml(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    return [...doc.getElementsByTagNameNS('*', 'Track')].map(el => {
      const pts = [...el.getElementsByTagNameNS('*', 'DesignatedPoint')].map(p => {
        const [lat, lon] = p.getElementsByTagNameNS('*', 'pos')[0].textContent.trim().split(/\s+/).map(Number);
        return {
          name: p.getElementsByTagNameNS('*', 'designator')[0].textContent,
          role: p.getAttribute('miam:role') || p.getAttributeNS('https://example.org/miam/enr-5-7', 'role'),
          lat,
          lon
        };
      });
      /** Point d'un axe par son rôle. */
      const role = r => pts.find(p => p.role === r),
        attr = k => el.getAttribute(k);
      return {
        name: attr('name'),
        kind: attr('kind'),
        page: Number(attr('page')),
        lengthNm: Number(attr('lengthNm')),
        widthNm: Number(attr('widthNm')),
        heading: Number(attr('heading')),
        side: attr('side') === 'unknown' ? null : attr('side'),
        remark: attr('remark') || '',
        ip: role('ARIP'),
        cp: role('ARCP'),
        particular: [role('S1'), role('S2')].filter(Boolean),
        legs: attr('kind') === 'heavy' ? [{
          start: role('leg1-start'),
          end: role('leg1-end')
        }, {
          start: role('leg2-start'),
          end: role('leg2-end')
        }] : null,
        points: pts
      };
    });
  }

  window.AarTracks = {
    parsePages,
    groups,
    racetrack,
    toGeoJson,
    nearest,
    bearing,
    parseEnr57,
    trackRacetrack,
    toXml,
    parseTrackXml
  };
})();
