(() => {
  'use strict';
  // V3 maps — lecture d'une mission pour ses cartes (modules/maps/SPEC.md § 4 ter) : le YAML de la mission
  // (missions/<l>_<FAMILLE>/<ID>/mission<ID>.yaml, déjà analysé) → points, zones, cartes et cheminement, selon les règles du
  // studio (apps/cpco/map_parser.html : parseMissionYaml, mapBbox, mapGeoBbox, vprofDefaultRoute) et ses réglages gardés
  // dans le YAML (maps[].profile / view / trace ; profile_def, resolved_bbox et cycle quand le studio les écrit).
  // Aucun texte d'interface.
  // API : window.MapsMission = { parse(root) → mission, profileFor(map, profiles), routeTokens(mission),
  //   OUT_RATIO }.
  if (window.MapsMission) return;
  const OUT_RATIO = 1.6; // largeur / hauteur des cartes du studio (1600 × 1000)
  const keyNorm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(
    /^_|_$/g, '');
  const num = v => {
    if (typeof v === 'number') return v;
    const m = String(v ?? '').replace(/\s/g, '').replace(',', '.').match(/[-+]?\d+(?:\.\d+)?/);
    return m ? +m[0] : NaN;
  };
  /** Liste ou dictionnaire YAML → tableau d'objets. */
  const asList = v => Array.isArray(v) ? v : v && typeof v === 'object' ? Object.entries(v).map(([id, x]) => typeof x === 'object' ? {
    id,
    ...x
  } : {
    id,
    name: String(x)
  }) : v == null ? [] : [v];
  /** Point (lat / lon plausibles) ajouté à la liste, sans doublon de position ; rend le point retenu. */
  function addPoint(points, raw, fallbackId = '') {
    if (!raw || typeof raw !== 'object') return null;
    const lat = num(raw.lat ?? raw.latitude),
      lon = num(raw.lon ?? raw.lng ?? raw.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    const p = {
        id: String(raw.id ?? raw.code ?? fallbackId ?? ''),
        name: String(raw.name ?? raw.nom ?? raw.label ?? raw.id ?? fallbackId ?? 'Point'),
        lat,
        lon
      },
      old = points.find(q => Math.abs(q.lat - lat) < 1e-7 && Math.abs(q.lon - lon) < 1e-7);
    if (old) {
      if (!old.id && p.id) old.id = p.id;
      if ((!old.name || old.name === 'Point') && p.name) old.name = p.name;
      return old;
    }
    points.push(p);
    return p;
  }
  /** Zones de la mission : cercle (centre + rayon) ou polygone ; kind search, exclusion ou mission. */
  function zonesOf(root, meta) {
    return asList(root.zones ?? meta.zones).map((z, i) => {
      if (!z || typeof z !== 'object') return null;
      const poly = asList(z.points ?? z.polygon).map(q => ({
          lat: num(q?.lat),
          lon: num(q?.lon)
        })).filter(q => Number.isFinite(q.lat) && Number.isFinite(q.lon)),
        c = addPoint([], z.centre ?? z.center ?? z),
        r = num(z.radius_km ?? z.rayon_km ?? z.radius),
        role = String(z.role || ''),
        kind = String(z.kind || (/recherche|search/i.test(`${role} ${z.name || ''}`) ? 'search' : /interdi|exclu|évit/i.test(role) ?
          'exclusion' : 'mission')).toLowerCase(),
        lat = c?.lat ?? (poly.length ? poly.reduce((a, q) => a + q.lat, 0) / poly.length : NaN),
        lon = c?.lon ?? (poly.length ? poly.reduce((a, q) => a + q.lon, 0) / poly.length : NaN);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || (poly.length < 3 && !(r > 0))) return null;
      return {
        id: String(z.id || `ZONE-${i + 1}`),
        name: String(z.name || z.id || ''),
        role,
        kind,
        lat,
        lon,
        radiusKm: r > 0 ? r : 0,
        points: poly.length >= 3 ? poly : []
      };
    }).filter(Boolean);
  }
  /** Emprise { w, s, e, n } centrée sur c (largeur × hauteur en km), élargie au format des cartes du studio. */
  function around(c, wKm, hKm) {
    if (wKm / hKm < OUT_RATIO) wKm = hKm * OUT_RATIO;
    else hKm = wKm / OUT_RATIO;
    const dLat = hKm / 2 / 111.32,
      dLon = wKm / 2 / (111.32 * Math.cos(c.lat * Math.PI / 180));
    return {
      w: c.lon - dLon,
      s: c.lat - dLat,
      e: c.lon + dLon,
      n: c.lat + dLat
    };
  }
  /** Emprise englobant des points (marge relative, taille minimale en km). */
  function fitGeo(pts, margin = .12, minKm = 10) {
    pts = pts.filter(p => Number.isFinite(p?.lat) && Number.isFinite(p?.lon));
    if (!pts.length) return null;
    const la = pts.map(p => p.lat),
      lo = pts.map(p => p.lon),
      c = {
        lat: (Math.min(...la) + Math.max(...la)) / 2,
        lon: (Math.min(...lo) + Math.max(...lo)) / 2
      },
      k = 111.32 * Math.cos(c.lat * Math.PI / 180);
    return around(c, Math.max(minKm, (Math.max(...lo) - Math.min(...lo)) * k * (1 + 2 * margin)), Math.max(minKm / OUT_RATIO, (Math.max(
      ...
      la) - Math.min(...la)) * 111.32 * (1 + 2 * margin)));
  }
  const zoneExtent = z => z.points?.length ? z.points : z.radiusKm ? [{
    lat: z.lat - z.radiusKm / 111.32,
    lon: z.lon - z.radiusKm / (111.32 * Math.cos(z.lat * Math.PI / 180))
  }, {
    lat: z.lat + z.radiusKm / 111.32,
    lon: z.lon + z.radiusKm / (111.32 * Math.cos(z.lat * Math.PI / 180))
  }] : [{
    lat: z.lat,
    lon: z.lon
  }];
  /** Emprise donnée par le YAML d'une carte (bbox liste ou objet, sinon rayon ou largeur / hauteur autour de la
   *  référence) : [ouest, sud, est, nord] ou null (map_parser.html, mapBbox). */
  function yamlBox(raw, ref) {
    const box = raw.bbox ?? raw.bounding_box ?? raw.bounds;
    if (Array.isArray(box) && box.length >= 4) return box.slice(0, 4).map(num);
    if (box && typeof box === 'object') {
      const b = [box.west ?? box.ouest, box.south ?? box.sud, box.east ?? box.est, box.north ?? box.nord].map(num);
      if (b.every(Number.isFinite)) return b;
    }
    if (!ref) return null;
    if (ref.points?.length >= 3) {
      const b = fitGeo(ref.points, .2, 5);
      if (b) return [b.w, b.s, b.e, b.n];
    }
    const range = num(raw.range_km ?? raw.radius_km ?? raw.rayon_km),
      width = num(raw.width_km ?? raw.largeur_km),
      height = num(raw.height_km ?? raw.hauteur_km),
      k = 111.32 * Math.cos(ref.lat * Math.PI / 180);
    let hl = 0,
      ho = 0;
    if (Number.isFinite(range)) {
      hl = range / 111.32;
      ho = range / k;
    } else if (Number.isFinite(width) || Number.isFinite(height)) {
      hl = (Number.isFinite(height) ? height : width) / 2 / 111.32;
      ho = (Number.isFinite(width) ? width : height) / 2 / k;
    }
    return hl && ho ? [ref.lon - ho, ref.lat - hl, ref.lon + ho, ref.lat + hl] : null;
  }
  /** Emprise dessinée d'une carte : resolved_bbox (écrite par le studio), sinon view, sinon bbox du YAML, sinon cadrage
   *  automatique par type (map_parser.html, mapGeoBbox) : générale (points et zones), zone, détail 8 × 5 km, cible
   *  100 × 62 km, autres 220 × 140 km. */
  function extentOf(m, mission) {
    const bb = m.resolved || m.view || m.bbox;
    if (bb?.length === 4 && bb.every(Number.isFinite)) return {
      w: bb[0],
      s: bb[1],
      e: bb[2],
      n: bb[3]
    };
    const pts = mission.points,
      zones = mission.zones,
      kind = `${m.type} ${m.file}`.toLowerCase();
    if (/general|operation|organisation|assemblage/.test(kind) && (pts.length || zones.length)) {
      const b = fitGeo([...pts, ...zones.flatMap(zoneExtent)], .12, 20);
      if (b) return b;
    }
    if (/zone/.test(kind) && zones.length) {
      const z = zones.find(q => m.center && Math.abs(q.lat - m.center.lat) < 1e-4 && Math.abs(q.lon - m.center.lon) < 1e-4) || zones[0],
        b = fitGeo(zoneExtent(z), .2, 5);
      if (b) return b;
    }
    const c = m.center || (zones[0] ? {
      lat: zones[0].lat,
      lon: zones[0].lon
    } : pts[0]) || {
      lat: 46.5,
      lon: 2
    };
    if (/detail/.test(kind)) return around(c, 8, 5);
    if (/cible|target/.test(kind)) return around(c, 100, 62);
    return around(c, 220, 140);
  }
  /** Mission du YAML analysé : { id, title, points, zones, maps, vprof }. */
  function parse(root) {
    if (!root || typeof root !== 'object') throw new Error('mission: empty YAML');
    const meta = root.mission && typeof root.mission === 'object' ? root.mission : {},
      points = [],
      roleRefs = new Map();
    for (const [key, id] of [
        ['origin', 'ORIGIN'],
        ['departure', 'ORIGIN'],
        ['depart', 'ORIGIN'],
        ['destination', 'DESTINATION'],
        ['arrival', 'DESTINATION'],
        ['arrivee', 'DESTINATION'],
        ['target', 'TARGET'],
        ['cible', 'TARGET'],
        ['alternate', 'ALTERNATE'],
        ['degagement', 'ALTERNATE']
      ]) {
      const p = addPoint(points, root[key] ?? meta[key], id);
      if (p) roleRefs.set(keyNorm(id), p);
    }
    for (const key of ['turning_points', 'turningPoints', 'points_tournants', 'waypoints', 'points', 'rendezvous', 'rdv'])
      for (const p of asList(root[key] ?? meta[key])) addPoint(points, p, keyNorm(key).toUpperCase());
    const zones = zonesOf(root, meta),
      refs = new Map(roleRefs);
    for (const p of points) {
      if (p.id) refs.set(keyNorm(p.id), p);
      if (p.name) refs.set(keyNorm(p.name), p);
    }
    for (const z of zones) {
      if (z.id && !refs.has(keyNorm(z.id))) refs.set(keyNorm(z.id), z);
      if (z.name && !refs.has(keyNorm(z.name))) refs.set(keyNorm(z.name), z);
    }
    const fallback = refs.get('target') || refs.get('cible') || refs.get('destination') || points.find(p => /^TARGET|CIBLE$/i.test(p
        .id)) ||
      points[points.length - 1] || null,
      mission = {
        id: String(meta.id ?? root.id ?? ''),
        title: String(root.title ?? root.titre ?? meta.title ?? meta.titre ?? ''),
        points,
        zones,
        maps: []
      };
    mission.maps = asList(root.maps ?? root.cartes ?? root.map_outputs ?? meta.maps ?? meta.cartes ?? []).map((v, i) => {
      const m = typeof v === 'string' ? {
          filename: v
        } : v || {},
        file = String(m.filename ?? m.file ?? m.output ?? m.path ?? m.name ?? `carte_${i + 1}.png`),
        refKey = keyNorm(m.centre_ref ?? m.center_ref ?? m.centre ?? m.center ?? ''),
        inline = m.center && typeof m.center === 'object' ? addPoint([], m.center) : null,
        ref = refs.get(refKey) || inline || fallback,
        num4 = a => Array.isArray(a) && a.length === 4 ? a.map(num) : null,
        out = {
          file,
          type: String(m.type ?? m.kind ?? ''),
          description: String(m.description ?? m.desc ?? m.type ?? ''),
          center: ref ? {
            lat: ref.lat,
            lon: ref.lon
          } : null,
          bbox: yamlBox(m, ref),
          view: num4(m.view),
          resolved: num4(m.resolved_bbox),
          profileId: typeof m.profile === 'string' ? m.profile : '',
          profileDef: m.profile_def && typeof m.profile_def === 'object' ? m.profile_def : null,
          trace: ['none', 'route', 'probable', 'both'].includes(m.trace) ? m.trace : '',
          cycle: typeof m.cycle === 'string' ? m.cycle : ''
        };
      out.extent = extentOf(out, mission);
      return out;
    }).filter(m => m.profileId !== 'off');
    const v = root.vertical_profile && typeof root.vertical_profile === 'object' ? root.vertical_profile : {},
      ac = Array.isArray(root.aircraft) ? root.aircraft[0] : root.aircraft,
      cruise = String(v.cruise || ac?.cruise_level || '').toUpperCase().replace(/\s+/g, ''),
      cm = /^(FL)?(\d{1,5})(FT)?$/.exec(cruise);
    mission.vprof = {
      route: String(v.route || '').trim(),
      // cheminement résolu par le studio : { name, lat, lon, alt_ft } (alt_ft : altitude à atteindre au point, ou null)
      routePoints: Array.isArray(v.route_points) ? v.route_points.map(p => ({
        id: String(p?.name ?? p?.id ?? ''),
        lat: num(p?.lat),
        lon: num(p?.lon),
        ...(p?.alt_ft != null && Number.isFinite(num(p.alt_ft)) ? {
          alt: num(p.alt_ft)
        } : {})
      })).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon)) : [],
      cruiseFt: cm ? (cm[1] ? +cm[2] * 100 : +cm[2]) : 0,
      onMap: v.on_map !== false,
      profileDef: v.profile_def && typeof v.profile_def === 'object' ? v.profile_def : null,
      rates: {
        climbFpm: +v.climb_fpm || 1000,
        climbKt: +v.climb_kt || 140,
        descentFpm: +v.descent_fpm || 800,
        descentKt: +v.descent_kt || 160
      },
      cycle: typeof v.cycle === 'string' ? v.cycle : ''
    };
    return mission;
  }
  /** Profil d'affichage d'une carte : sa copie (profile_def), sinon le profil intégré de même id, sinon celui du type
   *  (détail, cible, rdv → vfr-detail ; approche → vfr-simple ; sinon ifr-simple : mission_editor.html). */
  function profileFor(m, profiles = []) {
    if (m.profileDef) return {
      profile: m.profileDef,
      source: 'copy'
    };
    const byId = id => profiles.find(p => p.id === id);
    if (m.profileId && byId(m.profileId)) return {
      profile: byId(m.profileId),
      source: 'builtin-id'
    };
    const key = `${m.type} ${m.file}`,
      id = /detail|cible|target|rdv/i.test(key) ? 'vfr-detail' : /approche|approach/i.test(key) ? 'vfr-simple' : 'ifr-simple';
    return {
      profile: byId(id) || profiles[0] || null,
      source: 'builtin-type'
    };
  }
  /** Jetons du cheminement de la mission : vertical_profile.route, sinon départ, points tournants (ou cible),
   *  destination (map_parser.html, vprofDefaultRoute). */
  function routeTokens(mission) {
    const v = mission.vprof;
    if (v.route) return v.route;
    const ps = mission.points,
      by = id => ps.find(p => p.id === id),
      tps = ps.filter(p => !/^(ORIGIN|DESTINATION|TARGET|ALTERNATE)$/.test(p.id) && !/^RDV/i.test(p.id)),
      list = [by('ORIGIN'), ...(tps.length ? tps : [by('TARGET')]), by('DESTINATION')].filter(Boolean);
    return (list.length >= 2 ? list : ps).map(p => p.id).join(' ');
  }

  window.MapsMission = {
    parse,
    profileFor,
    routeTokens,
    keyNorm,
    OUT_RATIO
  };
})();
