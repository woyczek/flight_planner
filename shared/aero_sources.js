// Sources de données aéronautiques autres que le SIA français : lecteurs et réglages (window.AeroSources).
// Voir docs/technique/DONNEES_AERO_ETRANGER.md. Chaque lecteur rend le modèle de la base SIA (shared/sia_base.js) :
//   espaces { src, type, cls, name, key, lower, upper, azba, admin, act, info, rings: [[[lat, lon], …], …] }
//     (limites en texte : « FL 115 », « SFC », « 1500 ft AMSL », « 800 ft ASFC », « UNL » — SiaAero.limitFt) ;
//   aero { aerodromes, navaids, points, airways, vrp } aux formes de SiaAero.parseAixm ; obstacleMax { 'lat|lon': ft } ;
//   moraCells [{ lat, lon, mora, moraFt, latStep, lonStep }].
// Lecteurs :
//   · aixm5(texte)        AIXM 5.1 (NATS, ENAIRE, DFS, FAA…) : Airspace, Navaid / VOR / NDB / DME / TACAN,
//                         DesignatedPoint, AirportHeliport, RouteSegment, VerticalStructure ;
//   · geojson(objet, nom) GeoJSON : exports openAIP (asp, apt, nav, rpp), FAA ADDS (Special Use Airspace, MTR en couloirs,
//                         Class Airspace), sinon propriétés courantes (name, type, upper / lower…) ;
//   · openair(texte)      OpenAir (exports openAIP .txt, espaces de X-Plane 12) ;
//   · xplane(nom, texte)  données de navigation de X-Plane : earth_nav.dat, earth_fix.dat, earth_awy.dat, earth_mora.dat.
// Réglages (localStorage aeroSources:v1) : sources actives, pays openAIP. Rangement : sous-dossiers du dossier SIA
// (aixm5/, geojson/, openaip/) ; X-Plane : dossier du simulateur mémorisé (FileAccess __xpnav).
(() => {
  'use strict';
  if (window.AeroSources) return;
  const KEY = 'aeroSources:v1';
  /** Sources connues, dans l'ordre d'affichage ; dir : sous-dossier du dossier SIA (null : fichiers du dossier lui-même ou
   *  dossier à part). */
  const SOURCES = [{
    id: 'sia',
    on: true,
    dir: null,
    label: ['SIA France (AIXM 4.5, XML_SIA)', 'SIA France (AIXM 4.5, XML_SIA)', 'SIA Frankreich (AIXM 4.5, XML_SIA)', 'SIA Francia (AIXM 4.5, XML_SIA)']
  }, {
    id: 'dircam',
    on: true,
    dir: null,
    label: ['DIRCAM / MILAIP (RTBA, AZBA, axes de ravitaillement ENR 5.7)', 'DIRCAM / MILAIP (RTBA, AZBA, ENR 5.7 refuelling tracks)', 'DIRCAM / MILAIP (RTBA, AZBA, Betankungsstrecken ENR 5.7)', 'DIRCAM / MILAIP (RTBA, AZBA, ejes de reabastecimiento ENR 5.7)']
  }, {
    id: 'aixm5',
    on: true,
    dir: 'aixm5',
    label: ['AIXM 5.1 (autres pays : NATS, ENAIRE, DFS, FAA…)', 'AIXM 5.1 (other countries: NATS, ENAIRE, DFS, FAA…)', 'AIXM 5.1 (andere Länder: NATS, ENAIRE, DFS, FAA…)', 'AIXM 5.1 (otros países: NATS, ENAIRE, DFS, FAA…)']
  }, {
    id: 'geojson',
    on: true,
    dir: 'geojson',
    label: ['GeoJSON (FAA ADDS, LVNL, autres)', 'GeoJSON (FAA ADDS, LVNL, others)', 'GeoJSON (FAA ADDS, LVNL, andere)', 'GeoJSON (FAA ADDS, LVNL, otros)']
  }, {
    id: 'openaip',
    on: false,
    dir: 'openaip',
    label: ['openAIP (exports par pays, CC BY-NC)', 'openAIP (country exports, CC BY-NC)', 'openAIP (Länderexporte, CC BY-NC)', 'openAIP (exportaciones por país, CC BY-NC)']
  }, {
    id: 'xplane',
    on: false,
    dir: null,
    label: ['X-Plane (données de navigation du simulateur)', 'X-Plane (simulator navigation data)', 'X-Plane (Navigationsdaten des Simulators)', 'X-Plane (datos de navegación del simulador)']
  }];
  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    } catch {
      return {};
    }
  };
  const settings = () => {
    const s = read();
    return {
      enabled: Object.fromEntries(SOURCES.map(x => [x.id, s.enabled?.[x.id] ?? x.on])),
      openaipCountries: s.openaipCountries ?? 'gb de es it be nl ch',
      faaLayers: s.faaLayers ?? 'sua mtr'
    };
  };
  const save = patch => {
    const s = {
      ...settings(),
      ...patch
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* stockage refusé */ }
    window.dispatchEvent(new CustomEvent('aero-sources-change', {
      detail: s
    }));
    return s;
  };
  const enabled = id => settings().enabled[id] !== false;

  // ---------------------------------------------------------------- outils communs
  const NM = 1852,
    R_EARTH = 6371008.8;
  const toFt = (v, uom) => /^M$/i.test(uom) ? v * 3.28084 : /^KM$/i.test(uom) ? v * 3280.84 : v;
  /** Libellé de limite au format de la base (« FL 115 », « SFC », « 1500 ft AMSL », « 800 ft ASFC », « UNL »). */
  function limit(val, uom, ref) {
    const v = String(val ?? '').trim().toUpperCase(),
      u = String(uom || '').toUpperCase(),
      r = String(ref || '').toUpperCase();
    if (!v && !r) return '';
    if (/^(UNL|UNLTD|UNLIMITED)$/.test(v) || +v <= -9000) return 'UNL';
    if (/^(GND|SFC)$/.test(v) || /^(GND|SFC)$/.test(r) && !+v) return 'SFC';
    if (u === 'FL' || r === 'STD' || u === 'FLIGHT_LEVEL') return 'FL ' + Math.round(+v);
    if (!+v && /^(SFC|GND|HEI|AGL|W84)$/.test(r || 'SFC')) return 'SFC';
    const m = u === 'M' ? 'm' : 'ft',
      agl = /^(SFC|GND|HEI|AGL|ASFC)$/.test(r);
    return `${Math.round(+v)} ${m} ${agl ? 'ASFC' : 'AMSL'}`;
  }
  /** Point à distance (m) et cap vrai (degrés) d'un point [lat, lon] (sphère). */
  function dest([lat, lon], dist, brg) {
    const d = dist / R_EARTH,
      t = brg * Math.PI / 180,
      p1 = lat * Math.PI / 180,
      l1 = lon * Math.PI / 180;
    const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(t));
    const l2 = l1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
    return [p2 * 180 / Math.PI, ((l2 * 180 / Math.PI + 540) % 360) - 180];
  }
  const bearing = ([a, b], [c, d]) => {
    const p1 = a * Math.PI / 180,
      p2 = c * Math.PI / 180,
      dl = (d - b) * Math.PI / 180;
    return (Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) * 180 / Math.PI + 360) % 360;
  };
  const distM = ([a, b], [c, d]) => {
    const p1 = a * Math.PI / 180,
      p2 = c * Math.PI / 180,
      h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((d - b) * Math.PI / 360) ** 2;
    return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(h)));
  };
  /** Arc de cercle densifié (caps vrais en degrés, sens horaire si cw), de 5° en 5°. */
  function arc(center, radiusM, from, to, cw = true) {
    let span = cw ? (to - from + 360) % 360 : (from - to + 360) % 360;
    if (span === 0) span = 360;
    const n = Math.max(2, Math.ceil(span / 5)),
      out = [];
    for (let i = 0; i <= n; i++) out.push(dest(center, radiusM, from + (cw ? 1 : -1) * span * i / n));
    return out;
  }
  const circle = (center, radiusM) => arc(center, radiusM, 0, 360, true);
  /** Couloir autour d'une ligne [[lat, lon]…] : largeurs à gauche et à droite en mètres → anneau. */
  function corridor(line, left, right) {
    if (line.length < 2) return [];
    const L = [],
      R = [];
    line.forEach((p, i) => {
      const a = line[Math.max(0, i - 1)],
        b = line[Math.min(line.length - 1, i + 1)],
        h = bearing(a, b);
      L.push(dest(p, left, h - 90));
      R.push(dest(p, right, h + 90));
    });
    const ring = [...L, ...R.reverse()];
    ring.push(ring[0]);
    return ring;
  }
  const closed = r => r.length > 2 && (r[0][0] !== r[r.length - 1][0] || r[0][1] !== r[r.length - 1][1]) ? [...r, r[0]] : r;
  const cell = (lat, lon) => `${Math.floor(lat)}|${Math.floor(lon)}`;
  /** Espace : champs manquants complétés (modèle de la base). */
  const zone = (src, z) => ({
    src,
    type: z.type || 'OTHER',
    cls: z.cls || '',
    name: z.name || z.key || '',
    key: z.key || z.name || '',
    lower: z.lower || '',
    upper: z.upper || '',
    azba: false,
    admin: z.admin || '',
    act: z.act || '',
    info: z.info || '',
    rings: (z.rings || []).map(closed).filter(r => r.length > 3)
  });
  /** Types gardés (les autres — FIR, secteurs, parachutage, vol à voile… — n'apportent rien aux cartes de mission). */
  const KEEP = new Set(['P', 'R', 'D', 'W', 'A', 'TRA', 'TSA', 'MOA', 'MTR', 'CTR', 'CTA', 'TMA', 'ATZ', 'MATZ', 'TMZ', 'RMZ', 'RMZ-TMZ', 'SIV', 'ADIZ', 'TIZ', 'TIA', 'MCTR', 'HTZ', 'LFA']);
  /** Type d'un espace AIXM 5.1 / FAA / divers ramené au vocabulaire de la base. */
  function normType(t) {
    const u = String(t || '').toUpperCase().replace(/[\s-]+/g, '_');
    const map = {
      TMA_P: 'TMA',
      CTA_P: 'CTA',
      CTR_P: 'CTR',
      FIS: 'SIV',
      FIZ: 'SIV',
      WARNING: 'W',
      ALERT: 'A',
      RESTRICTED: 'R',
      DANGER: 'D',
      PROHIBITED: 'P',
      PROTECT: 'P',
      MILOPS: 'MOA',
      TRA_GEN: 'TRA',
      TSA_GEN: 'TSA'
    };
    return map[u] || u.replace(/_/g, '-');
  }
  const activable = t => /^(R|D|W|A|TRA|TSA|MOA|MTR)$/.test(t);

  // ---------------------------------------------------------------- AIXM 5.1
  const NSX = '*';
  const kids = (el, name) => el ? [...el.getElementsByTagNameNS(NSX, name)] : [];
  const kid = (el, name) => kids(el, name)[0] || null;
  const text = (el, name) => kid(el, name)?.textContent.trim() || '';
  const posOf = el => {
    const p = kid(el, 'pos');
    if (!p) return null;
    const v = p.textContent.trim().split(/\s+/).map(Number);
    return v.length >= 2 && v.every(Number.isFinite) ? [v[0], v[1]] : null;
  };
  /** Ordre des axes : EPSG:4326 (urn) = lat lon ; CRS84 = lon lat. */
  const lonFirst = el => /CRS84|OGC.*1\.3.*CRS84/i.test(el?.closest?.('[srsName]')?.getAttribute('srsName') || '');
  function posList(el, swap) {
    const v = el.textContent.trim().split(/\s+/).map(Number),
      out = [];
    for (let i = 0; i + 1 < v.length; i += 2) out.push(swap ? [v[i + 1], v[i]] : [v[i], v[i + 1]]);
    return out;
  }
  const radiusM = el => {
    const r = kid(el, 'radius');
    if (!r) return 0;
    const v = +r.textContent,
      u = (r.getAttribute('uom') || 'NM').toUpperCase();
    return u === 'NM' || u === '[NMI_I]' ? v * NM : u === 'KM' ? v * 1000 : u === 'FT' ? v * .3048 : v;
  };
  /** Anneau d'une surface GML (segments : listes de points, arcs et cercles autour d'un centre). */
  function ringOf(ringEl) {
    const swap = lonFirst(ringEl),
      out = [];
    for (const seg of ringEl.getElementsByTagNameNS(NSX, '*')) {
      const n = seg.localName;
      if (n === 'GeodesicString' || n === 'LineStringSegment' || n === 'LinearRing') {
        const pl = kid(seg, 'posList');
        if (pl) out.push(...posList(pl, swap));
        else out.push(...kids(seg, 'pos').map(p => posList(p, swap)[0]).filter(Boolean));
      } else if (n === 'CircleByCenterPoint') {
        const c = posOf(seg);
        if (c) out.push(...circle(swap ? [c[1], c[0]] : c, radiusM(seg)));
      } else if (n === 'ArcByCenterPoint') {
        const c = posOf(seg);
        if (!c) continue;
        const a = +text(seg, 'startAngle'),
          b = +text(seg, 'endAngle');
        // angles AIXM : caps vrais ; sens : celui où l'on va de l'angle de départ à celui d'arrivée en croissant
        // (b > a : horaire) ou en décroissant
        out.push(...arc(swap ? [c[1], c[0]] : c, radiusM(seg), a, b, b >= a));
      }
    }
    return out;
  }
  /** TimeSlice BASELINE la plus récente d'un élément AIXM (les autres sont ignorées). */
  function slice(feat, name) {
    const all = kids(feat, name);
    return all.find(s => text(s, 'interpretation') === 'BASELINE') || all[0] || null;
  }
  const idOf = feat => (kid(feat, 'identifier')?.textContent || feat.getAttributeNS?.('http://www.opengis.net/gml/3.2', 'id') || '').trim();
  const href = el => (el?.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || el?.getAttribute('xlink:href') || '').replace(/^.*?(urn:uuid:|#uuid\.|#)/, '');

  function aixm5(txt) {
    const doc = new DOMParser().parseFromString(txt, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('AIXM 5.1 illisible');
    const out = {
      airspaces: [],
      aero: {
        aerodromes: [],
        navaids: [],
        points: [],
        airways: [],
        obstacles: [],
        vrp: []
      },
      obstacleMax: {}
    };
    const where = new Map; // identifiant → { id, lat, lon } (points et balises, pour les tronçons de route)
    // espaces
    for (const f of doc.getElementsByTagNameNS(NSX, 'Airspace')) {
      const s = slice(f, 'AirspaceTimeSlice');
      if (!s) continue;
      const type = normType(text(s, 'type'));
      if (!KEEP.has(type)) continue;
      const vols = kids(s, 'AirspaceVolume');
      const notes = kids(s, 'note').map(n => n.textContent).join(' ');
      for (const v of vols) {
        const rings = kids(v, 'Ring').map(ringOf).filter(r => r.length > 2);
        if (!rings.length) continue;
        const up = kid(v, 'upperLimit'),
          lo = kid(v, 'lowerLimit');
        out.airspaces.push(zone('aixm5', {
          type,
          cls: text(s, 'classification') || kids(s, 'AirspaceLayerClass').map(c => text(c, 'classification'))[0] || '',
          name: text(s, 'name') || text(s, 'designator'),
          key: text(s, 'designator') || idOf(f),
          upper: limit(up?.textContent, up?.getAttribute('uom'), text(v, 'upperLimitReference')),
          lower: limit(lo?.textContent, lo?.getAttribute('uom'), text(v, 'lowerLimitReference')),
          act: /NOTAM/i.test(notes) ? 'NOTAM' : activable(type) ? 'activable' : '',
          info: '',
          rings
        }));
      }
    }
    // balises : équipements (VOR, NDB, DME, TACAN) puis Navaid (type, nom) qui les regroupe
    const equip = new Map;
    const freq = (s, name) => {
      const e = kid(s, name);
      return e ? (+e.textContent).toFixed(/K/i.test(e.getAttribute('uom') || '') ? 0 : 2) : '';
    };
    for (const [tag, kind] of [
        ['VOR', 'VOR'],
        ['NDB', 'NDB'],
        ['DME', 'DME'],
        ['TACAN', 'TACAN']
      ])
      for (const f of doc.getElementsByTagNameNS(NSX, tag)) {
        const s = slice(f, tag + 'TimeSlice'),
          p = s && posOf(kid(s, 'location') || s);
        if (!p) continue;
        equip.set(idOf(f), {
          kind,
          id: text(s, 'designator'),
          name: text(s, 'name'),
          freq: freq(s, 'frequency'),
          channel: text(s, 'channel'),
          lat: p[0],
          lon: p[1]
        });
      }
    const used = new Set;
    for (const f of doc.getElementsByTagNameNS(NSX, 'Navaid')) {
      const s = slice(f, 'NavaidTimeSlice');
      if (!s) continue;
      const t = text(s, 'type').toUpperCase(),
        parts = kids(s, 'theNavaidEquipment').map(e => equip.get(href(e))).filter(Boolean);
      parts.forEach(p => used.add(p));
      const main = parts.find(p => p.kind === 'VOR') || parts.find(p => p.kind === 'NDB') || parts.find(p => p.kind === 'TACAN') || parts[0];
      const p = posOf(kid(s, 'location') || s) || (main && [main.lat, main.lon]);
      if (!p || /^(ILS|LOC|LOC_DME|ILS_DME|MKR|GLS|MLS)/.test(t)) continue;
      const kind = /VORTAC/.test(t) ? 'VOR' : /VOR/.test(t) ? 'VOR' : /NDB/.test(t) ? 'NDB' : /TACAN/.test(t) ? 'TACAN' : /DME/.test(t) ? 'DME' : main?.kind || 'VOR';
      const n = {
        kind,
        id: text(s, 'designator') || main?.id || '',
        name: text(s, 'name') || main?.name || '',
        freq: main?.freq || '',
        lat: p[0],
        lon: p[1]
      };
      if (/DME|VORTAC/.test(t) && kind !== 'DME') n.dme = true;
      if (/VORTAC|TACAN/.test(t) && kind !== 'TACAN') n.tacan = true;
      const ch = parts.find(q => q.channel)?.channel;
      if (ch) n.channel = ch;
      out.aero.navaids.push(n);
      where.set(idOf(f), n);
    }
    for (const [k, e] of equip)
      if (!used.has(e) && e.id) {
        const n = {
          kind: e.kind,
          id: e.id,
          name: e.name,
          freq: e.freq,
          lat: e.lat,
          lon: e.lon
        };
        if (e.channel) n.channel = e.channel;
        out.aero.navaids.push(n);
        where.set(k, n);
      }
    // points
    for (const f of doc.getElementsByTagNameNS(NSX, 'DesignatedPoint')) {
      const s = slice(f, 'DesignatedPointTimeSlice'),
        p = s && posOf(kid(s, 'location') || s);
      if (!p) continue;
      const pt = {
        id: text(s, 'designator') || text(s, 'name'),
        type: text(s, 'type') || 'ICAO',
        lat: p[0],
        lon: p[1]
      };
      if (/VFR|VRP/i.test(pt.type)) out.aero.vrp.push({
        id: pt.id,
        name: text(s, 'name') || pt.id,
        lat: p[0],
        lon: p[1]
      });
      else out.aero.points.push(pt);
      where.set(idOf(f), pt);
    }
    // aérodromes
    for (const f of doc.getElementsByTagNameNS(NSX, 'AirportHeliport')) {
      const s = slice(f, 'AirportHeliportTimeSlice'),
        p = s && posOf(kid(s, 'ARP') || s);
      if (!p) continue;
      const el = kid(s, 'fieldElevation');
      out.aero.aerodromes.push({
        id: text(s, 'designator'),
        icao: text(s, 'locationIndicatorICAO') || text(s, 'designator'),
        name: text(s, 'name'),
        type: text(s, 'type') || 'AD',
        lat: p[0],
        lon: p[1],
        elev: el ? Math.round(toFt(+el.textContent, el.getAttribute('uom'))) : null,
        public: !/MIL/.test(text(s, 'controlType'))
      });
    }
    // tronçons de route (extrémités : points ou balises déjà lus)
    const routes = new Map;
    for (const f of doc.getElementsByTagNameNS(NSX, 'Route')) {
      const s = slice(f, 'RouteTimeSlice');
      if (s) routes.set(idOf(f), [text(s, 'designatorPrefix'), text(s, 'designatorSecondLetter'), text(s, 'designatorNumber')].join('') || text(s, 'name'));
    }
    const endOf = el => {
      if (!el) return null;
      for (const c of el.getElementsByTagNameNS(NSX, '*'))
        if (/^(pointChoice_|theDesignatedPoint|theNavaid)/.test(c.localName) || /fixDesignatedPoint|navaidSystem/.test(c.localName)) {
          const w = where.get(href(c));
          if (w) return {
            id: w.id,
            lat: w.lat,
            lon: w.lon
          };
        }
      const p = posOf(el);
      return p ? {
        id: '',
        lat: p[0],
        lon: p[1]
      } : null;
    };
    for (const f of doc.getElementsByTagNameNS(NSX, 'RouteSegment')) {
      const s = slice(f, 'RouteSegmentTimeSlice');
      if (!s) continue;
      const a = endOf(kid(s, 'start')),
        b = endOf(kid(s, 'end'));
      if (!a || !b) continue;
      const up = kid(s, 'upperLimit'),
        lo = kid(s, 'lowerLimit'),
        ft = e => e ? (/FL/i.test(e.getAttribute('uom') || '') ? +e.textContent * 100 : /UNL/i.test(e.textContent) ? Infinity : toFt(+e.textContent, e.getAttribute('uom'))) : null;
      out.aero.airways.push({
        route: routes.get(href(kid(s, 'routeFormed'))) || '',
        a,
        b,
        lower: ft(lo),
        upper: ft(up),
        nm: +(distM([a.lat, a.lon], [b.lat, b.lon]) / NM).toFixed(1)
      });
    }
    // obstacles : point le plus haut de chaque structure ; maximum par case d'un degré
    for (const f of doc.getElementsByTagNameNS(NSX, 'VerticalStructure')) {
      for (const part of kids(f, 'VerticalStructurePart')) {
        const ep = kid(part, 'ElevatedPoint') || kid(part, 'ElevatedSurface') || kid(part, 'ElevatedCurve'),
          p = ep && (posOf(ep) || (kid(ep, 'posList') && posList(kid(ep, 'posList'), lonFirst(ep))[0]));
        const el = ep && kid(ep, 'elevation');
        if (!p || !el) continue;
        const ft = Math.round(toFt(+el.textContent, el.getAttribute('uom')));
        out.aero.obstacles.push({
          lat: p[0],
          lon: p[1],
          elev: ft,
          hgt: null,
          lit: /YES|TRUE/i.test(text(part, 'lighted')),
          group: false,
          wind: /WIND/i.test(text(part, 'type'))
        });
        const k = cell(p[0], p[1]);
        out.obstacleMax[k] = Math.max(out.obstacleMax[k] || 0, ft);
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- GeoJSON
  // openAIP : codes numériques (schéma de l'API openAIP)
  const OA_ASP = {
    0: 'OTHER',
    1: 'R',
    2: 'D',
    3: 'P',
    4: 'CTR',
    5: 'TMZ',
    6: 'RMZ',
    7: 'TMA',
    8: 'TRA',
    9: 'TSA',
    10: 'FIR',
    11: 'UIR',
    12: 'ADIZ',
    13: 'ATZ',
    14: 'MATZ',
    15: 'AWY',
    16: 'MTR',
    17: 'A',
    18: 'W',
    19: 'P',
    20: 'HTZ',
    21: 'GLD',
    22: 'TRP',
    23: 'TIZ',
    24: 'TIA',
    25: 'MTA',
    26: 'CTA',
    27: 'ACC',
    28: 'SPORT',
    29: 'LAOR',
    30: 'MRT',
    31: 'TFR',
    32: 'VFR',
    33: 'SIV',
    34: 'LTA',
    35: 'UTA',
    36: 'MCTR'
  };
  const OA_CLASS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', '', ''];
  const OA_NAV = {
    0: 'DME',
    1: 'TACAN',
    2: 'NDB',
    3: 'VOR',
    4: 'VOR',
    5: 'VOR',
    6: 'VOR',
    7: 'VOR',
    8: 'VOR'
  };
  const oaLimit = l => l ? limit(l.value, {
    0: 'M',
    1: 'FT',
    6: 'FL'
  } [l.unit] || 'FT', {
    0: 'SFC',
    1: 'MSL',
    2: 'STD'
  } [l.referenceDatum] || 'MSL') : '';
  /** Anneaux d'une géométrie GeoJSON (Polygon, MultiPolygon) en [lat, lon]. */
  const ringsOf = g => !g ? [] : g.type === 'Polygon' ? g.coordinates.map(r => r.map(([x, y]) => [y, x])) : g.type === 'MultiPolygon' ? g.coordinates.flatMap(p => p.map(r => r.map(([x, y]) => [y, x]))) : [];
  const linesOf = g => !g ? [] : g.type === 'LineString' ? [g.coordinates.map(([x, y]) => [y, x])] : g.type === 'MultiLineString' ? g.coordinates.map(l => l.map(([x, y]) => [y, x])) : [];
  const pointOf = g => g?.type === 'Point' ? [g.coordinates[1], g.coordinates[0]] : null;
  const pick = (p, ...keys) => {
    for (const k of keys)
      for (const q of [k, k.toUpperCase(), k.toLowerCase()])
        if (p[q] != null && p[q] !== '') return p[q];
    return '';
  };

  function geojson(obj, name = '') {
    const out = {
      airspaces: [],
      aero: {
        aerodromes: [],
        navaids: [],
        points: [],
        airways: [],
        obstacles: [],
        vrp: []
      },
      obstacleMax: {}
    };
    const feats = obj?.type === 'FeatureCollection' ? obj.features || [] : obj?.type === 'Feature' ? [obj] : [];
    const src = /openaip|_asp|_apt|_nav|_rpp/i.test(name) ? 'openaip' : 'geojson';
    for (const f of feats) {
      const p = f.properties || {},
        g = f.geometry;
      // openAIP (identifiant _id, limites en objets, codes numériques)
      if (p._id && (p.upperLimit || p.icaoCode !== undefined || p.trafficType !== undefined || p.identifier !== undefined || p.compulsory !== undefined || typeof p.type === 'number')) {
        if (p.upperLimit && ringsOf(g).length) {
          const type = OA_ASP[p.type] || 'OTHER';
          if (!KEEP.has(type)) continue;
          out.airspaces.push(zone('openaip', {
            type,
            cls: OA_CLASS[p.icaoClass] || '',
            name: p.name,
            key: p.name,
            upper: oaLimit(p.upperLimit),
            lower: oaLimit(p.lowerLimit),
            act: p.byNotam ? 'NOTAM' : p.onRequest || p.onDemand ? 'sur demande' : activable(type) ? 'activable' : '',
            rings: ringsOf(g)
          }));
        } else if (pointOf(g) && (p.icaoCode !== undefined || p.trafficType !== undefined)) {
          const [lat, lon] = pointOf(g);
          out.aero.aerodromes.push({
            id: p.icaoCode || p.name,
            icao: p.icaoCode || '',
            name: p.name,
            type: [4, 7].includes(p.type) ? 'HP' : p.type === 5 ? 'MIL' : 'AD',
            lat,
            lon,
            elev: p.elevation ? Math.round(toFt(p.elevation.value, p.elevation.unit === 0 ? 'M' : 'FT')) : null,
            public: !p.private
          });
        } else if (pointOf(g) && p.identifier !== undefined) {
          const [lat, lon] = pointOf(g),
            n = {
              kind: OA_NAV[p.type] || 'VOR',
              id: p.identifier,
              name: p.name,
              freq: p.frequency ? String(p.frequency.value) : '',
              lat,
              lon
            };
          if ([4, 7].includes(p.type)) n.dme = true;
          if ([5, 8].includes(p.type)) n.dme = n.tacan = true;
          if (p.channel) n.channel = p.channel;
          out.aero.navaids.push(n);
        } else if (pointOf(g) && p.compulsory !== undefined) {
          const [lat, lon] = pointOf(g);
          out.aero.vrp.push({
            id: p.name,
            name: p.name,
            lat,
            lon
          });
        }
        continue;
      }
      // FAA ADDS — routes d'entraînement militaire (MTR) : segments en couloirs (largeurs en NM)
      if (p.IDENT !== undefined && (p.WIDTHLEFT !== undefined || p.MTR_TYPE !== undefined) && linesOf(g).length) {
        const kind = {
          0: 'IR',
          1: 'VR',
          2: 'SR'
        } [p.MTR_TYPE] || p.ROUTETYPE || '';
        for (const l of linesOf(g)) out.airspaces.push(zone('geojson', {
          type: 'MTR',
          name: `${kind}${p.IDENT}`.trim(),
          key: `${kind}${p.IDENT}|${p.OBJECTID ?? ''}`,
          upper: limit(p.UPPER_VAL, p.UPPER_UOM, p.UPPER_CODE === 'ALT' ? 'MSL' : p.UPPER_CODE),
          lower: limit(p.LOWER_VAL, p.LOWER_UOM, p.LOWER_CODE === 'HEI' ? 'SFC' : p.LOWER_CODE),
          act: 'activable',
          rings: [corridor(l, (+p.WIDTHLEFT || 4) * NM, (+p.WIDTHRIGHT || 4) * NM)]
        }));
        continue;
      }
      const rings = ringsOf(g);
      if (rings.length) {
        // FAA ADDS (Special Use Airspace : TYPE_CODE ; Class Airspace : CLASS, LOCAL_TYPE), sinon propriétés courantes
        const faaClass = p.LOCAL_TYPE !== undefined && p.CLASS ? String(p.CLASS) : '';
        let type = normType(p.TYPE_CODE || (faaClass ? (/CLASS_[BCD]/.test(p.LOCAL_TYPE) ? 'CTR' : 'CTA') : '') || pick(p, 'type', 'category', 'kind', 'airspace_type') || 'OTHER');
        if (/^CLASS_?[A-G]$/.test(type)) type = 'CTA';
        if (!KEEP.has(type)) continue;
        out.airspaces.push(zone(src, {
          type,
          cls: faaClass || String(pick(p, 'class', 'icaoClass', 'airspace_class') || '').replace(/^CLASS_?/i, ''),
          name: pick(p, 'name', 'NAME', 'designator', 'ident', 'id'),
          key: pick(p, 'designator', 'ident', 'GLOBAL_ID', 'id', 'name'),
          upper: p.UPPER_VAL !== undefined ? limit(p.UPPER_VAL, p.UPPER_UOM, p.UPPER_CODE) : String(pick(p, 'upper', 'upperLimit', 'ceiling', 'top') || ''),
          lower: p.LOWER_VAL !== undefined ? limit(p.LOWER_VAL, p.LOWER_UOM, p.LOWER_CODE) : String(pick(p, 'lower', 'lowerLimit', 'floor', 'bottom') || ''),
          act: /NOTAM/i.test(p.TIMESOFUSE || '') ? 'NOTAM' : activable(type) ? 'activable' : '',
          info: p.TIMESOFUSE ? String(p.TIMESOFUSE) : '',
          admin: p.CONT_AGENT || '',
          rings
        }));
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- OpenAir
  /** Coordonnée OpenAir « 51:30:00 N 000:10:00 W » (ou degrés décimaux) → [lat, lon]. */
  function oaCoord(s) {
    const m = /(\d+(?::\d+(?::\d+(?:\.\d+)?)?)?(?:\.\d+)?)\s*([NS])\s*,?\s*(\d+(?::\d+(?::\d+(?:\.\d+)?)?)?(?:\.\d+)?)\s*([EW])/i.exec(s);
    if (!m) return null;
    const dms = t => t.split(':').reduce((a, v, i) => a + +v / 60 ** i, 0);
    return [dms(m[1]) * (/S/i.test(m[2]) ? -1 : 1), dms(m[3]) * (/W/i.test(m[4]) ? -1 : 1)];
  }
  const OPENAIR_TYPES = {
    R: 'R',
    Q: 'D',
    P: 'P',
    CTR: 'CTR',
    TMA: 'TMA',
    CTA: 'CTA',
    A: 'CTA',
    B: 'CTA',
    C: 'CTA',
    D: 'CTA',
    E: 'CTA',
    F: 'CTA',
    G: 'CTA',
    TMZ: 'TMZ',
    RMZ: 'RMZ',
    ATZ: 'ATZ',
    MATZ: 'MATZ',
    TRA: 'TRA',
    TSA: 'TSA',
    MOA: 'MOA'
  };
  // classes sans intérêt pour les cartes de mission : A (espaces supérieurs et océaniques), E, F, G ; W (fenêtre d'onde)
  const OPENAIR_SKIP = new Set(['A', 'E', 'F', 'G', 'W', 'GP', 'GSEC']);
  const oaLim = s => {
    const t = String(s || '').trim().toUpperCase();
    if (!t) return '';
    if (/UNL/.test(t)) return 'UNL';
    if (/^(GND|SFC|0)$/.test(t)) return 'SFC';
    const fl = /FL\s*(\d+)/.exec(t);
    if (fl) return 'FL ' + +fl[1];
    const n = /(\d+(?:\.\d+)?)\s*(M|FT|F)?\s*(AGL|GND|SFC|ASFC|AMSL|MSL)?/.exec(t);
    return n ? limit(n[1], n[2] === 'M' ? 'M' : 'FT', /AGL|GND|SFC|ASFC/.test(n[3] || '') ? 'SFC' : 'MSL') : t;
  };

  function openair(txt, src = 'openair') {
    const out = [];
    let cur = null,
      center = null,
      cw = true;
    const flush = () => {
      if (cur?.ring.length > 2 && !OPENAIR_SKIP.has(cur.ac)) {
        const type = OPENAIR_TYPES[cur.ac] || normType(cur.ac);
        if (KEEP.has(type)) out.push(zone(src, {
          type,
          cls: /^[A-G]$/.test(cur.ac) ? cur.ac : cur.cls || '',
          name: cur.an,
          key: cur.an,
          upper: oaLim(cur.ah),
          lower: oaLim(cur.al),
          act: activable(type) ? 'activable' : '',
          rings: [cur.ring]
        }));
      }
      cur = null;
      center = null;
      cw = true;
    };
    for (const raw of txt.split(/\r?\n/)) {
      const line = raw.replace(/\*.*$/, '').trim();
      if (!line) continue;
      const [cmd, ...rest] = line.split(/\s+/),
        arg = rest.join(' ');
      switch (cmd.toUpperCase()) {
        case 'AC':
          flush();
          cur = {
            ac: arg.toUpperCase(),
            an: '',
            ah: '',
            al: '',
            ring: []
          };
          break;
        case 'AY':
          if (cur) cur.ac = arg.toUpperCase();
          break;
        case 'AN':
          if (cur) cur.an = arg;
          break;
        case 'AH':
          if (cur) cur.ah = arg;
          break;
        case 'AL':
          if (cur) cur.al = arg;
          break;
        case 'DP': {
          const c = oaCoord(arg);
          if (cur && c) cur.ring.push(c);
          break;
        }
        case 'V': {
          const [k, v] = arg.split('=').map(s => s.trim());
          if (/^X$/i.test(k)) center = oaCoord(v);
          else if (/^D$/i.test(k)) cw = v !== '-';
          break;
        }
        case 'DC':
          if (cur && center) cur.ring.push(...circle(center, +arg * NM));
          break;
        case 'DA': {
          const [r, a, b] = arg.split(',').map(Number);
          if (cur && center) cur.ring.push(...arc(center, r * NM, a, b, cw));
          break;
        }
        case 'DB': {
          const [p1, p2] = arg.split(',').map(oaCoord);
          if (cur && center && p1 && p2) cur.ring.push(...arc(center, distM(center, p1), bearing(center, p1), bearing(center, p2), cw));
          break;
        }
      }
    }
    flush();
    return out;
  }

  // ---------------------------------------------------------------- X-Plane (earth_*.dat)
  /** Lignes de données d'un fichier X-Plane (en-tête « I » / « A », ligne de version, « 99 » final). */
  const datLines = t => t.split(/\r?\n/).slice(2).map(l => l.trim()).filter(l => l && l !== '99');

  function xplane(name, txt) {
    const out = {
      aero: {
        navaids: [],
        points: [],
        airways: []
      },
      moraCells: []
    };
    const n = name.toLowerCase();
    if (n === 'earth_nav.dat') {
      // code lat lon élév fréq portée (variation | biais) ident terrain région nom…
      const dme = new Map;
      for (const l of datLines(txt)) {
        const f = l.split(/\s+/),
          code = +f[0];
        if (![2, 3, 12, 13].includes(code)) continue;
        const lat = +f[1],
          lon = +f[2],
          freq = code === 2 ? String(+f[4]) : (+f[4] / 100).toFixed(2),
          id = f[7],
          nm = f.slice(10).join(' ');
        if (code === 12) {
          dme.set(id + '|' + freq, /TACAN|VORTAC/i.test(nm));
          continue;
        }
        out.aero.navaids.push({
          kind: code === 2 ? 'NDB' : code === 13 ? (/TACAN/i.test(nm) ? 'TACAN' : 'DME') : 'VOR',
          id,
          name: nm.replace(/\s+(VOR|VORTAC|VOR\/DME|VOR-DME|NDB|DME|TACAN|NDB\/DME)$/i, ''),
          freq,
          lat,
          lon
        });
      }
      for (const v of out.aero.navaids)
        if (v.kind === 'VOR' && dme.has(v.id + '|' + v.freq)) {
          v.dme = true;
          if (dme.get(v.id + '|' + v.freq)) v.tacan = true;
        }
    } else if (n === 'earth_fix.dat') {
      // lat lon ident terrain région [type]
      for (const l of datLines(txt)) {
        const f = l.split(/\s+/);
        if (f.length >= 3 && Number.isFinite(+f[0])) out.aero.points.push({
          id: f[2],
          type: f[3] === 'ENRT' ? 'ICAO' : 'TERMINAL',
          lat: +f[0],
          lon: +f[1]
        });
      }
    } else if (n === 'earth_awy.dat') {
      // ident1 région1 type1 ident2 région2 type2 sens niveau base sommet nom(s) — coordonnées prises dans les points et
      // balises déjà lus (resolve)
      for (const l of datLines(txt)) {
        const f = l.split(/\s+/);
        if (f.length < 10) continue;
        out.aero.airways.push({
          route: f[10] || '',
          a: {
            id: f[0],
            region: f[1]
          },
          b: {
            id: f[3],
            region: f[4]
          },
          lower: +f[8] * 100,
          upper: +f[9] * 100,
          nm: 0
        });
      }
    } else if (n === 'earth_mora.dat') {
      // « +45 -030 010 012 … » : latitude du bord sud, longitude du bord ouest de la première case, puis 30 valeurs en
      // centaines de pieds, une par case d'un degré vers l'est (format XP1150, grille ARINC 424) ; 000 ou UNK : inconnu
      for (const l of datLines(txt)) {
        const f = l.split(/\s+/);
        if (f.length < 3 || !/^[+-]?\d+$/.test(f[0]) || !/^[+-]?\d+$/.test(f[1])) continue;
        const lat = +f[0],
          lon0 = +f[1];
        f.slice(2).forEach((v, i) => {
          const h = /^\d+$/.test(v) ? +v : 0;
          if (!h) return;
          out.moraCells.push({
            lat: lat + .5,
            lon: ((lon0 + i + 180) % 360) - 180 + .5,
            mora: `${Math.floor(h / 10)}${'⁰¹²³⁴⁵⁶⁷⁸⁹' [h % 10]}`,
            moraFt: h * 100,
            latStep: 1,
            lonStep: 1
          });
        });
      }
    }
    return out;
  }
  /** Extrémités des voies X-Plane : coordonnées prises dans les points et balises (même identifiant, le plus proche du
   *  tronçon précédent quand il y en a plusieurs). */
  function resolveAirways(airways, points, navaids) {
    const at = new Map;
    for (const p of [...points, ...navaids]) {
      const k = p.id;
      if (!at.has(k)) at.set(k, []);
      at.get(k).push(p);
    }
    const out = [];
    for (const w of airways) {
      const A = at.get(w.a.id),
        B = at.get(w.b.id);
      if (!A || !B) continue;
      let best = null;
      for (const a of A)
        for (const b of B) {
          const d = distM([a.lat, a.lon], [b.lat, b.lon]);
          if (!best || d < best.d) best = {
            a,
            b,
            d
          };
        }
      if (best.d > 1000 * NM) continue;
      out.push({
        route: w.route,
        a: {
          id: w.a.id,
          lat: best.a.lat,
          lon: best.a.lon
        },
        b: {
          id: w.b.id,
          lat: best.b.lat,
          lon: best.b.lon
        },
        lower: w.lower,
        upper: w.upper,
        nm: +(best.d / NM).toFixed(1)
      });
    }
    return out;
  }

  // ---------------------------------------------------------------- fusion avec la base SIA
  /** Ajoute à la base les données d'une source (part : { airspaces, aero, obstacleMax, moraCells }) sans doublons :
   *  un espace de même type et même nom déjà présent (SIA d'abord) est gardé ; un aérodrome de même indicatif ; une
   *  balise ou un point de même identifiant à moins de 2 NM ; obstacles et MORA : seulement les cases encore vides. */
  const FAMILY = {
    CTA: 'C',
    TMA: 'C',
    TRA: 'T',
    TSA: 'T',
    W: 'D',
    A: 'D'
  };
  const bbox = a => {
    let b = null;
    for (const [la, lo] of a.rings?.[0] || []) b = b ? [Math.min(b[0], la), Math.min(b[1], lo), Math.max(b[2], la), Math.max(b[3], lo)] : [la, lo, la, lo];
    return b;
  };
  /** Index des emprises par famille de type et case de 0,1° de leur centre : un espace d'une autre source qui a la même
   *  emprise (bords à moins de 0,05°) qu'un espace déjà présent de la même famille est un doublon, quel que soit son nom
   *  (le SIA et X-Plane ne nomment pas les zones de la même façon). */
  function shapeIndex(list) {
    const grid = new Map;
    const key = (f, la, lo) => `${f}|${la}|${lo}`;
    const add = a => {
      const b = bbox(a);
      if (!b) return;
      const f = FAMILY[a.type] || a.type,
        la = Math.round((b[0] + b[2]) * 5),
        lo = Math.round((b[1] + b[3]) * 5),
        k = key(f, la, lo);
      (grid.get(k) || grid.set(k, []).get(k)).push(b);
    };
    const has = a => {
      const b = bbox(a);
      if (!b) return false;
      const f = FAMILY[a.type] || a.type,
        la = Math.round((b[0] + b[2]) * 5),
        lo = Math.round((b[1] + b[3]) * 5);
      for (let i = -1; i <= 1; i++)
        for (let j = -1; j <= 1; j++)
          for (const q of grid.get(key(f, la + i, lo + j)) || [])
            if (Math.abs(q[0] - b[0]) < .05 && Math.abs(q[1] - b[1]) < .05 && Math.abs(q[2] - b[2]) < .05 && Math.abs(q[3] - b[3]) < .05) return true;
      return false;
    };
    list.forEach(add);
    return {
      add,
      has
    };
  }

  function merge(base, part) {
    base.airspaces ||= [];
    const seenZ = new Set(base.airspaces.map(a => a.type + '|' + String(a.name).toUpperCase())),
      shapes = shapeIndex(base.airspaces);
    for (const a of part.airspaces || []) {
      const k = a.type + '|' + String(a.name).toUpperCase();
      if (a.type !== 'MTR' && (seenZ.has(k) || shapes.has(a))) continue;
      seenZ.add(k);
      shapes.add(a);
      base.airspaces.push(a);
    }
    if (part.aero) {
      base.aero ||= {
        aerodromes: [],
        navaids: [],
        points: [],
        airways: [],
        obstacles: [],
        vrp: []
      };
      const near = (list, x) => list.some(y => y.id === x.id && Math.abs(y.lat - x.lat) < .04 && Math.abs(y.lon - x.lon) < .06);
      const icao = new Set((base.aero.aerodromes || []).map(a => a.icao).filter(Boolean));
      for (const a of part.aero.aerodromes || [])
        if (!a.icao || !icao.has(a.icao)) {
          icao.add(a.icao);
          (base.aero.aerodromes ||= []).push(a);
        }
      for (const k of ['navaids', 'points', 'vrp']) {
        const list = base.aero[k] ||= [];
        // index par identifiant : la recherche de voisins reste rapide sur des centaines de milliers de points
        const by = new Map;
        for (const y of list)(by.get(y.id) || by.set(y.id, []).get(y.id)).push(y);
        for (const x of part.aero[k] || []) {
          const same = by.get(x.id) || [];
          if (near(same, x)) continue;
          list.push(x);
          (by.get(x.id) || by.set(x.id, []).get(x.id)).push(x);
        }
      }
      (base.aero.airways ||= []).push(...(part.aero.airways || []));
      (base.aero.obstacles ||= []).push(...(part.aero.obstacles || []));
    }
    base.obstacleMax ||= {};
    for (const [k, v] of Object.entries(part.obstacleMax || {}))
      if (!(k in base.obstacleMax)) base.obstacleMax[k] = v;
    if (part.moraCells?.length) {
      const have = new Set((base.moraCells || []).map(c => `${Math.floor(c.lat)}|${Math.floor(c.lon)}`));
      base.moraCells = (base.moraCells || []).concat(part.moraCells.filter(c => !have.has(`${Math.floor(c.lat)}|${Math.floor(c.lon)}`)));
    }
    return base;
  }

  window.AeroSources = {
    KEY,
    SOURCES,
    settings,
    save,
    enabled,
    aixm5,
    geojson,
    openair,
    xplane,
    resolveAirways,
    merge,
    limit,
    corridor,
    normType,
    activable
  };
})();
