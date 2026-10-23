// COPIE de shared/carto/vertical_profile.js (V2, studio cartographique), gardée telle quelle pour le module maps de la V3 :
// le service worker du cadre ne garde que frame/ et modules/. Recopier après une correction de l'original, sans l'éditer ici.
// Profil vertical (coupe) le long d'un cheminement : relief, obstacles, espaces aériens traversés
// (plancher → plafond, planchers ASFC suivant le relief), points du cheminement et altitude prévue.
// Partagé par le studio cartographique et le planificateur de performances : sélection des espaces
// d'un profil d'affichage, noms des points (brief, aérodromes, balises, points RNAV, radiale /
// distance), relief (tuiles Terrarium), lecture de la base SIA mémorisée par le studio.
// Exposé : window.SiaProfile = { parseRoute, build, draw, zones, selectAirspaces, resolver,
// destination, terrainSampler, loadStudio, opt, normalizeCoords, coordHelper… }.
(() => {
  const NM = 1852,
    FT = 3.28084,
    R = 6371000,
    rad = d => d * Math.PI / 180;
  /** Distance (NM) entre deux points (grand cercle). */
  const dist = (a, b) => {
    const dLat = rad(b.lat - a.lat),
      dLon = rad(b.lon - a.lon),
      h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  };
  /** Point interpolé entre a et b (fraction t). */
  const lerp = (a, b, t) => ({
    lat: a.lat + (b.lat - a.lat) * t,
    lon: a.lon + (b.lon - a.lon) * t
  });

  // Groupe vitesse / niveau du plan de vol OACI (case 15) : vitesse N (nœuds), K (km/h), M (Mach,
  // centièmes) ; niveau F (niveau de vol), A (altitude, centaines de ft), S (niveau métrique) ou
  // M (altitude métrique), en dizaines de mètres. Ex. N0450F350 = 450 kt au FL 350.
  function speedLevel(t) {
    const m = /^([NKM])(\d{3,4})([FASM])(\d{3,4})$/.exec(String(t).toUpperCase().trim());
    if (!m) return null;
    const v = +m[2],
      n = +m[4],
      kt = m[1] === 'N' ? v : m[1] === 'K' ? v / 1.852 : v / 100 * 573;
    const ft = m[3] === 'F' || m[3] === 'A' ? n * 100 : n * 10 * FT;
    return {
      ft: Math.round(ft),
      kt: Math.round(kt),
      code: m[0],
      label: m[3] === 'F' ? `FL${m[4].slice(-3)}` : m[3] === 'A' ? `${n * 100} ft` : `${n * 10} m`
    };
  }
  /** Coordonnée de plan de vol OACI (4830N00210E, 48N002E…) → { lat, lon } ; null sinon. */
  const icaoCoord = t => {
    // degrés, minutes, secondes facultatives (« 4830N00210E », « 483012N0021045E »)
    const m = /^(\d{2})(?:(\d{2})(\d{2})?)?([NS])(\d{3})(?:(\d{2})(\d{2})?)?([EW])$/.exec(t);
    if (!m) return null;
    const lat = (+m[1] + (+m[2] || 0) / 60 + (+m[3] || 0) / 3600) * (m[4] === 'S' ? -1 : 1),
      lon = (+m[5] + (+m[6] || 0) / 60 + (+m[7] || 0) / 3600) * (m[8] === 'W' ? -1 : 1);
    return {
      name: t,
      lat,
      lon
    };
  };

  // Deux écritures :
  // - liste (virgules, points-virgules ou lignes) : « LFOT, SIMIP/3000, TARGET/FL65, 46.5 1.4, LFOT » —
  //   point de la mission, aérodrome, balise, point RNAV, « lat lon » ou « NOM lat lon » ; « /3000 » ou
  //   « /FL65 » = altitude à atteindre au point ; « /N0450F350 » ou un groupe seul après le point =
  //   niveau de croisière à partir de ce point ; « VFR » = pas de niveau ;
  //   un niveau seul entre deux points (« FL105 », « 5500 ft ») = montée ou descente vers ce niveau à
  //   partir du point précédent (au départ s'il est en tête) ;
  // - case 15 du plan de vol (séparée par des espaces) : « LFBO N0450F350 DCT TOU UN460 NTS/N0440F370
  //   LFRN » — DCT et SID / STAR sautés, coordonnées « 4630N00130E » ; voie aérienne entre deux points (« TOU UN460
  //   NTS ») suivie point par point si la base SIA la connaît (resolve.airways), sinon tracé direct ;
  // - « /A035 » ou « /F065 » après un point : altitude (ft / 100) ou niveau à atteindre au point.
  // Chaque point porte ti : rang de son jeton dans le texte (points d'une voie aérienne : via = voie, awy = true).
  // resolve(nom) → {name, lat, lon} ou null.
  function parseRoute(text, resolve) {
    const src = String(text || '').trim(),
      item15 = !/[,;\n]/.test(src) && /\s/.test(src);
    const tokens = item15 ? src.split(/\s+/) : src.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean);
    const out = [],
      unknown = [];
    let pending = null,
      airway = null; // voie aérienne en attente de son point de sortie : { route, ti }
    const awySegs = resolve?.airways || [];
    /** Points d'une voie aérienne entre a et b (exclus) : chemin le long de ses segments ; [] si inconnu. */
    const alongAirway = (route, a, b) => {
      const segs = awySegs.filter(g => g.route === route);
      if (!segs.length) return null;
      const key = p => `${(+p.lat).toFixed(4)},${(+p.lon).toFixed(4)}`,
        nodes = new Map(),
        adj = new Map();
      for (const g of segs)
        for (const [x, y] of [
            [g.a, g.b],
            [g.b, g.a]
          ]) {
          nodes.set(key(x), x);
          if (!adj.has(key(x))) adj.set(key(x), []);
          adj.get(key(x)).push(key(y));
        }
      const nearest = p => {
        let best = null,
          d = Infinity;
        for (const [k, n] of nodes) {
          const e = dist(p, n);
          if (e < d) {
            d = e;
            best = k;
          }
        }
        return d <= 2 * NM ? best : null;
      };
      const s = nearest(a),
        t = nearest(b);
      if (!s || !t) return null;
      const prev = new Map([
          [s, null]
        ]),
        queue = [s];
      while (queue.length) {
        const k = queue.shift();
        if (k === t) break;
        for (const n of adj.get(k) || [])
          if (!prev.has(n)) {
            prev.set(n, k);
            queue.push(n);
          }
      }
      if (!prev.has(t)) return null;
      const path = [];
      for (let k = prev.get(t); k && k !== s; k = prev.get(k)) path.unshift(nodes.get(k));
      return path;
    };
    /** Groupe vitesse / niveau de la route (N0450F350…) appliqué aux points suivants. */
    const setLevel = lvl => {
      if (out.length) out[out.length - 1].lvl = lvl;
      else pending = lvl;
    };
    for (const [ti, raw] of tokens.entries()) {
      const up = raw.toUpperCase();
      if (up === 'DCT') {
        airway = null;
        continue;
      }
      if (up === 'VFR' || up === 'IFR') {
        if (up === 'VFR') setLevel({
          vfr: true
        });
        continue;
      }
      // niveau seul : « FL105 », « 5500 ft » (sans vitesse)
      const bare = /^(?:FL\s*(\d{2,3})|(\d{3,5})\s*FT)$/.exec(up);
      if (bare) {
        setLevel(bare[1] ? {
          ft: +bare[1] * 100,
          label: `FL${bare[1].padStart(3, '0')}`
        } : {
          ft: +bare[2],
          label: `${+bare[2]} ft`
        });
        continue;
      }
      const group = speedLevel(up);
      if (group) {
        setLevel(group);
        continue;
      }
      const [spec, altRaw] = raw.split('/').map(x => x.trim());
      let alt = null,
        lvl = null;
      if (altRaw) {
        const g = speedLevel(altRaw);
        if (g) lvl = g;
        else if (/^VFR$/i.test(altRaw)) lvl = {
          vfr: true
        };
        else {
          const m = /^(FL)?\s*(\d+)/i.exec(altRaw),
            h = /^([AF])(\d{3})$/i.exec(altRaw);
          if (h) alt = +h[2] * 100;
          else if (m) alt = m[1] ? +m[2] * 100 : +m[2];
        }
      }
      const c = /^(?:(\S*[A-Za-z]\S*)\s+)?(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/.exec(spec);
      const p = c ? {
        name: c[1] || spec,
        lat: +c[2],
        lon: +c[3]
      } : icaoCoord(spec.toUpperCase()) || resolve(spec);
      if (p && Number.isFinite(p.lat) && Number.isFinite(p.lon)) {
        // voie aérienne en attente : ses points entre le point précédent et celui-ci
        if (airway && out.length)
          for (const q of alongAirway(airway.route, out[out.length - 1], p) || []) out.push({
            name: q.id || '',
            lat: q.lat,
            lon: q.lon,
            alt: null,
            lvl: null,
            ti: airway.ti,
            via: airway.route,
            awy: true
          });
        out.push({
          ...p,
          alt,
          lvl: lvl || pending,
          ti,
          ...(airway ? {
            via: airway.route
          } : {})
        });
        pending = null;
        airway = null;
      } else if (item15 && (/^[A-Z]{1,2}\d{1,4}[A-Z]?$/.test(up) || /^[A-Z]{2,5}\d[A-Z]$/.test(up))) {
        airway = awySegs.some(g => g.route === up) ? {
          route: up,
          ti
        } : null;
        continue;
      } // voie aérienne, SID / STAR
      else unknown.push(spec);
    }
    return {
      points: out,
      unknown
    };
  }

  // Trajectoire verticale prévue : niveau en vigueur (groupe vitesse / niveau à partir d'un point,
  // « /altitude » = altitude à atteindre au point puis conservée), montée selon le modèle de l'appareil
  // (climb.at(h) → vario et TAS, shared/flight_performance_model.js) ou à taux constant, descente au taux
  // recommandé (pente = taux × 60 / vitesse) ; départ et arrivée au sol (ou à l'altitude donnée pour
  // ces points) ; VFR = pas de niveau (pas de tracé). TOC / TOD : début et fin du palier le plus haut.
  function planPath(samples, marks, total, {
    climb,
    descent
  }) {
    // pente de montée (ft par mètre) : modèle d'appareil (vario et TAS selon l'altitude) ou taux constants
    const gcAt = climb.at ? h => {
        const c = climb.at(h);
        return c.roc > 0 && c.tas > 0 ? c.roc * 60 / c.tas / NM : 0;
      } : () => climb.fpm * 60 / climb.kt / NM,
      gd = descent.fpm * 60 / descent.kt / NM;
    const seg = [];
    let level = null,
      any = false;
    for (let k = 0; k < marks.length - 1; k++) {
      const m = marks[k],
        next = marks[k + 1];
      if (m.lvl) level = m.lvl.vfr ? null : m.lvl.ft;
      const target = Number.isFinite(next.alt) ? next.alt : level;
      seg.push({
        from: m.s,
        to: next.s,
        target
      });
      if (target != null) any = true;
      if (Number.isFinite(next.alt) && !next.lvl) level = next.alt;
    }
    if (!any) return null;
    const first = marks[0],
      last = marks[marks.length - 1],
      n = samples.length - 1;
    const start = Number.isFinite(first.alt) ? first.alt : samples[0].center,
      end = Number.isFinite(last.alt) ? last.alt : samples[n].center;
    const alt = [];
    let a = start,
      k = 0;
    for (let i = 0; i <= n; i++) {
      const q = samples[i];
      while (k < seg.length - 1 && q.s > seg[k].to + 1e-6) k++;
      const t = seg[k].target,
        ds = i ? q.s - samples[i - 1].s : 0;
      if (t == null) {
        alt.push(null);
        continue;
      }
      if (t > a) a = Math.min(t, a + gcAt(a) * ds);
      else if (t < a) a = Math.max(t, a - gd * ds);
      alt.push(Math.min(a, end + gd * (total - q.s)));
    }
    // TOC = fin de la première montée, TOD = début de la descente finale (paliers intermédiaires possibles)
    const vals = alt.filter(v => v != null),
      top = Math.max(...vals),
      eps = 1;
    let iToc = alt.findIndex(v => v != null);
    while (iToc < n && alt[iToc + 1] != null && alt[iToc + 1] > alt[iToc] + eps / 10) iToc++;
    let iTod = n;
    while (iTod > 0 && alt[iTod - 1] != null && alt[iTod - 1] > alt[iTod] + eps / 10) iTod--;
    if (iTod < iToc) iTod = iToc;
    // paliers (≥ 2 % du trajet) pour les libellés de niveau
    const levels = [];
    let run = 0;
    for (let i = 1; i <= n + 1; i++) {
      if (i <= n && alt[i] != null && alt[i - 1] != null && Math.abs(alt[i] - alt[i - 1]) < eps) continue;
      if (alt[run] != null && samples[Math.min(i, n)].s - samples[run].s > total * .02 && alt[run] > start + 100) levels.push({
        s: (samples[run].s + samples[Math.min(i - 1, n)].s) / 2,
        alt: alt[run]
      });
      run = i;
    }
    return {
      alt,
      toc: {
        s: samples[iToc].s,
        alt: alt[iToc]
      },
      tod: {
        s: samples[iTod].s,
        alt: alt[iTod]
      },
      top,
      levels,
      climb,
      descent
    };
  }

  // Échantillonnage : ~4 points par NM (100 à 800), relief = maximum sur la ligne et ± corridorM de part
  // et d'autre ; elevation(lat, lon) → mètres (promesse). Obstacles à moins de corridorNm du trajet.
  async function build({
    points,
    elevation,
    airspaces = [],
    obstacles = [],
    corridorM = 1000,
    corridorNm = 1,
    climb = {
      fpm: 1000,
      kt: 140
    },
    descent = {
      fpm: 800,
      kt: 160
    }
  }) {
    if (points.length < 2) throw Error('Cheminement : au moins deux points.');
    const legs = [];
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const d = dist(points[i - 1], points[i]);
      legs.push({
        a: points[i - 1],
        b: points[i],
        from: total,
        d
      });
      total += d;
    }
    if (!total) throw Error('Cheminement de longueur nulle.');
    const n = Math.max(100, Math.min(800, Math.round(total / NM * 4))),
      samples = [];
    for (let i = 0; i <= n; i++) {
      const s = total * i / n,
        leg = legs.find(l => s <= l.from + l.d + 1e-6) || legs[legs.length - 1],
        t = leg.d ? (s - leg.from) / leg.d : 0,
        p = lerp(leg.a, leg.b, t);
      // décalage latéral perpendiculaire au segment (approximation locale plane)
      const k = Math.cos(rad(p.lat)),
        dx = (leg.b.lon - leg.a.lon) * k,
        dy = leg.b.lat - leg.a.lat,
        len = Math.hypot(dx, dy) || 1,
        off = corridorM / 111320;
      const side = [{
        lat: p.lat + dx / len * off,
        lon: p.lon - dy / len * off / k
      }, {
        lat: p.lat - dx / len * off,
        lon: p.lon + dy / len * off / k
      }];
      samples.push({
        s,
        ...p,
        side
      });
    }
    await Promise.all(samples.map(async q => {
      const h = await Promise.all([q, ...q.side].map(x => elevation(x.lat, x.lon).catch(() => NaN)));
      q.terrain = Math.max(0, ...h.filter(Number.isFinite)) * FT;
      q.center = (Number.isFinite(h[0]) ? h[0] : 0) * FT;
    }));
    // espaces traversés : intervalles d'échantillons à l'intérieur d'un anneau
    const box = {
      s: Math.min(...points.map(p => p.lat)) - .5,
      n: Math.max(...points.map(p => p.lat)) + .5,
      w: Math.min(...points.map(p => p.lon)) - .7,
      e: Math.max(...points.map(p => p.lon)) + .7
    };
    /** Vrai si le point est dans l'anneau (règle pair-impair). */
    const inRing = (lat, lon, ring) => {
      let c = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [yi, xi] = ring[i], [yj, xj] = ring[j];
        if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    const crossed = [];
    for (const a of airspaces) {
      const rings = (a.rings || []).filter(r => r.length >= 3 && r.some(([la, lo]) => la > box.s && la < box.n && lo > box.w && lo < box
        .e));
      if (!rings.length) continue;
      let start = -1;
      for (let i = 0; i <= n + 1; i++) {
        const inside = i <= n && rings.some(r => inRing(samples[i].lat, samples[i].lon, r));
        if (inside && start < 0) start = i;
        if (!inside && start >= 0) {
          crossed.push({
            a,
            i0: start,
            i1: i - 1
          });
          start = -1;
        }
      }
    }
    // obstacles proches : distance au segment le plus proche (approximation plane locale)
    const near = [];
    for (const o of obstacles) {
      if (o.lat < box.s || o.lat > box.n || o.lon < box.w || o.lon > box.e) continue;
      for (const l of legs) {
        const k = Math.cos(rad(o.lat)),
          ax = l.a.lon * k,
          ay = l.a.lat,
          bx = l.b.lon * k,
          by = l.b.lat,
          px = o.lon * k,
          py = o.lat;
        const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / (((bx - ax) ** 2 + (by - ay) ** 2) || 1)));
        const dm = Math.hypot(px - (ax + (bx - ax) * t), py - (ay + (by - ay) * t)) * 111320;
        if (dm <= corridorNm * NM) {
          near.push({
            ...o,
            s: l.from + l.d * t
          });
          break;
        }
      }
    }
    const marks = [0, ...legs.map(l => l.from + l.d)].map((s, i) => ({
      s,
      name: points[i].name,
      alt: points[i].alt,
      lvl: points[i].lvl,
      ti: points[i].ti,
      awy: !!points[i].awy,
      lat: points[i].lat,
      lon: points[i].lon
    }));
    const ok = r => r?.at ? r : r && +r.fpm > 0 && +r.kt > 0 ? {
      fpm: Math.abs(+r.fpm),
      kt: +r.kt
    } : null;
    const plan = planPath(samples, marks, total, {
      climb: ok(climb) || {
        fpm: 1000,
        kt: 140
      },
      descent: ok(descent) || {
        fpm: 800,
        kt: 160
      }
    });
    return {
      total,
      samples,
      crossed,
      obstacles: near,
      marks,
      plan
    };
  }

  const COLORS = {
    R: '#d32f2f',
    P: '#b71c1c',
    D: '#ef6c00',
    TRA: '#ef6c00',
    CTR: '#1565c0',
    TMA: '#1565c0',
    CTA: '#3949ab',
    SIV: '#2e7d32',
    RMZ: '#555',
    TMZ: '#555'
  };
  // Coupe : axe des distances (NM) et des altitudes (ft AMSL), espaces derrière le relief, puis
  // obstacles, points et altitude prévue ; libellés d'espaces sans recouvrement.
  function draw(ctx, data, {
    W,
    H,
    ceiling = 0,
    floor = 0,
    scale = 1,
    limitFt,
    title = '',
    abbrev = false,
    limits = true, // altitudes (plancher – plafond) sous le nom des espaces (profil d'affichage : zoneLimitsShow)
    // V3 maps (ajout, sans effet par défaut) : strictLabels — les espaces où entre la trajectoire prévue passent d'abord,
    // un libellé ne se pose que contre sa bande, et sans place libre il n'est pas posé : compté dans geo.skipped et
    // résumé en « +n » en haut à droite de la coupe (case réservée) ; TOC / TOD réservés avant, reserveBottom px gardés
    // libres au bas de la coupe (marques posées ensuite par l'appelant), cases prises rendues dans geo.taken
    strictLabels = false,
    reserveBottom = 0
  } = {}) {
    const f = 11 * scale,
      padL = 58 * scale,
      padR = 16 * scale,
      padT = (title ? 34 : 18) * scale,
      padB = 64 * scale;
    const terrainMax = Math.max(0, ...data.samples.map(q => q.terrain)),
      obsMax = Math.max(0, ...data.obstacles.map(o => o.elev || 0)),
      altMax = Math.max(0, ...data.marks.map(m => m.alt || m.lvl?.ft || 0), data.plan?.top || 0);
    /** Vrai pour une limite relative au sol (ASFC, AGL, SFC). */
    const rel = t => /ASFC|AGL|SFC/i.test(t || '') && !/AMSL/i.test(t || '');
    /** Plancher d'un espace sur un tronçon de la coupe (relief ajouté pour une limite ASFC). */
    const floorOf = c => {
      const mid = Math.round((c.i0 + c.i1) / 2);
      return (rel(c.a.lower) ? data.samples[mid].center : 0) + limitFt(c.a.lower, false);
    };
    const zoneMax = Math.max(0, ...data.crossed.map(floorOf).filter(v => v <= 19500).map(v => v + 1500));
    const top = ceiling > 0 ? ceiling : Math.ceil((Math.max(terrainMax + 3000, obsMax + 1500, altMax + 1500, zoneMax, 5000)) / 1000) *
      1000;
    const bottom = Math.max(0, Math.min(+floor || 0, top - 1000)),
      X = s => padL + (W - padL - padR) * s / data.total,
      Y = ft => padT + (H - padT - padB) * (1 - (Math.min(Math.max(ft, bottom), top) - bottom) / (top - bottom));
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.font = `${f}px Arial, sans-serif`;
    ctx.textBaseline = 'middle';
    if (title) {
      ctx.fillStyle = '#17202a';
      ctx.font = `bold ${f * 1.3}px Arial, sans-serif`;
      ctx.fillText(title, padL, 16 * scale);
      ctx.font = `${f}px Arial, sans-serif`;
    }
    // grille des altitudes
    const span = top - bottom,
      step = span > 20000 ? 5000 : span > 8000 ? 2000 : 1000;
    ctx.strokeStyle = '#e3e8ec';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#56626b';
    ctx.textAlign = 'right';
    for (let a = Math.ceil(bottom / step) * step; a <= top; a += step) {
      const y = Y(a);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.fillText(a >= 10000 && a % 1000 === 0 ? `FL ${a / 100}` : `${a} ft`, padL - 6 * scale, y);
    }
    // espaces : bande plancher → plafond (plancher / plafond ASFC suivant le relief)
    const labels = [],
      taken = [],
      free = r => !taken.some(q => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0);
    for (const c of data.crossed) {
      const a = c.a,
        col = COLORS[a.type] || '#6d4c41';
      const lo = i => (rel(a.lower) ? data.samples[i].center : 0) + limitFt(a.lower, false),
        hi = i => {
          const v = limitFt(a.upper, true);
          return Number.isFinite(v) ? (rel(a.upper) ? data.samples[i].center : 0) + v : top;
        };
      let seen = false;
      for (let i = c.i0; i <= c.i1; i++)
        if (lo(i) < top && hi(i) > bottom) {
          seen = true;
          break;
        }
      if (!seen) continue; // espace entièrement au-dessus du plafond ou au-dessous du plancher de la coupe
      ctx.beginPath();
      for (let i = c.i0; i <= c.i1; i++) {
        const x = X(data.samples[i].s),
          y = Y(hi(i));
        i === c.i0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      for (let i = c.i1; i >= c.i0; i--) ctx.lineTo(X(data.samples[i].s), Y(lo(i)));
      ctx.closePath();
      ctx.globalAlpha = .13;
      ctx.fillStyle = col;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.2 * scale;
      ctx.stroke();
      const mid = Math.round((c.i0 + c.i1) / 2);
      let entered = false;
      if (strictLabels && data.plan?.alt)
        for (let i = c.i0; i <= c.i1 && !entered; i++) entered = data.plan.alt[i] >= lo(i) && data.plan.alt[i] <= hi(i);
      labels.push({
        entered,
        col,
        x: X(data.samples[mid].s),
        y0: Y(hi(mid)),
        y1: Y(lo(mid)),
        text: abbrev ? a.name : `${a.type} ${a.name}`,
        sub: limits ? `${a.lower || 'SFC'} – ${a.upper || 'UNL'}` : '',
        xa: X(data.samples[c.i0].s),
        xb: X(data.samples[c.i1].s),
        w: X(data.samples[c.i1].s) - X(data.samples[c.i0].s)
      });
    }
    // relief (profil maximal du corridor)
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    for (const q of data.samples) ctx.lineTo(X(q.s), Y(q.terrain));
    ctx.lineTo(X(data.total), Y(0));
    ctx.closePath();
    const g = ctx.createLinearGradient(0, Y(terrainMax), 0, Y(0));
    g.addColorStop(0, '#b08a5a');
    g.addColorStop(1, '#d9c7a3');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#7a5a32';
    ctx.lineWidth = 1.2 * scale;
    ctx.stroke();
    // obstacles : trait vertical et cote AMSL des plus hauts
    ctx.strokeStyle = '#c62828';
    ctx.fillStyle = '#c62828';
    ctx.textAlign = 'center';
    const tall = [...data.obstacles].sort((a, b) => (b.elev || 0) - (a.elev || 0)).slice(0, 12);
    for (const o of data.obstacles) {
      const x = X(o.s),
        yT = Y(o.elev || 0),
        yB = Y(Math.max(0, (o.elev || 0) - (o.hgt || 0)));
      ctx.lineWidth = Math.max(1, 1.4 * scale);
      ctx.beginPath();
      ctx.moveTo(x, yB);
      ctx.lineTo(x, yT);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 3 * scale, yT + 4 * scale);
      ctx.lineTo(x, yT);
      ctx.lineTo(x + 3 * scale, yT + 4 * scale);
      ctx.stroke();
    }
    for (const o of tall) {
      const x = X(o.s),
        y = Y(o.elev || 0) - 9 * scale,
        r = {
          x0: x - 18 * scale,
          y0: y - f / 2,
          x1: x + 18 * scale,
          y1: y + f / 2
        };
      if (free(r)) {
        taken.push(r);
        ctx.fillText(String(Math.round(o.elev || 0)), x, y);
      }
    }
    // libellés de TOUS les espaces traversés (visibles dans la coupe) : dans la bande, au-dessus, en
    // dessous, puis première place libre en balayant la coupe (trait de rappel vers la bande) ; faute de
    // place, posé quand même dans la bande.
    ctx.textAlign = 'center';
    const iL = padL,
      iR = W - padR,
      iT = padT,
      iB = H - padB - (strictLabels ? reserveBottom : 0);
    let skipped = 0;
    const more = strictLabels ? {
      x0: iR - 34 * scale,
      y0: iT,
      x1: iR,
      y1: iT + f * 1.6
    } : null;
    if (more) taken.push(more);
    if (strictLabels && data.plan)
      for (const [m, name] of [
          [data.plan.toc, 'TOC'],
          [data.plan.tod, 'TOD']
        ]) {
        if (!m || (name === 'TOD' && Math.abs(data.plan.tod.s - data.plan.toc.s) < data.total * .005)) continue;
        const x = X(m.s),
          y = Y(m.alt),
          w = ctx.measureText(`${name} ${(m.s / NM).toFixed(0)} NM`).width + 6 * scale;
        taken.push({
          x0: x - w / 2,
          y0: y - 20 * scale,
          x1: x + w / 2,
          y1: y - 6 * scale
        });
      }
    for (const l of labels.sort((a, b) => strictLabels ? (b.entered - a.entered) || (b.w - a.w) : b.w - a.w)) {
      const w = Math.max(ctx.measureText(l.text).width, ctx.measureText(l.sub).width) + 8 * scale,
        hgt = f * (l.sub ? 2.3 : 1.4);
      /** Abscisse d'étiquette ramenée dans le cadre. */
      const cx = x => Math.min(iR - w / 2, Math.max(iL + w / 2, x)),
        rect = (x, y) => ({
          x0: x - w / 2,
          y0: y - hgt / 2,
          x1: x + w / 2,
          y1: y + hgt / 2,
          x,
          y
        });
      const ok = r => r.y0 >= iT - 2 && r.y1 <= iB && r.x0 >= iL - 1 && r.x1 <= iR + 1 && free(r);
      const cands = [rect(cx(l.x), Math.max(iT + hgt / 2, (Math.max(l.y0, iT) + l.y1) / 2)), rect(cx(l.x), l.y0 - hgt / 2 - 2 * scale),
        rect(cx(l.x), l.y1 + hgt / 2 + 2 * scale)
      ];
      const xs = [l.x, (l.xa + l.x) / 2, (l.x + l.xb) / 2, l.xa + w / 2, l.xb - w / 2, l.x - w, l.x + w, l.x - 2 * w, l.x + 2 * w].map(
        cx);
      for (let y = iT + hgt / 2; y <= iB - hgt / 2; y += hgt / 2)
        for (const x of xs) cands.push(rect(x, y));
      const yT = Math.max(l.y0, iT),
        near = r => r.x1 > l.xa && r.x0 < l.xb && r.y1 >= yT - hgt - 4 * scale && r.y0 <= l.y1 + hgt + 4 * scale;
      const r = strictLabels ? cands.find(c => ok(c) && near(c)) : cands.find(ok) || cands[0];
      if (!r) {
        skipped++;
        continue;
      }
      taken.push(r);
      if (r.y1 < l.y0 || r.y0 > l.y1 || r.x < l.xa || r.x > l.xb) { // trait de rappel vers la bande
        const bx = Math.min(l.xb, Math.max(l.xa, r.x)),
          by = Math.min(l.y1, Math.max(Math.max(l.y0, iT), r.y));
        ctx.strokeStyle = l.col;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(r.x, r.y < by ? r.y1 : r.y0);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,.88)';
      ctx.fillRect(r.x0, r.y0, w, hgt);
      ctx.strokeStyle = l.col;
      ctx.lineWidth = .8;
      ctx.strokeRect(r.x0, r.y0, w, hgt);
      ctx.fillStyle = l.col;
      ctx.font = `bold ${f}px Arial, sans-serif`;
      ctx.fillText(l.text, r.x, l.sub ? r.y - f * .55 : r.y);
      ctx.font = `${f * .9}px Arial, sans-serif`;
      ctx.fillText(l.sub, r.x, r.y + f * .6);
      ctx.font = `${f}px Arial, sans-serif`;
    }
    if (more && skipped) {
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.fillRect(more.x0, more.y0, more.x1 - more.x0, more.y1 - more.y0);
      ctx.fillStyle = '#4b5563';
      ctx.font = `bold ${f}px Arial, sans-serif`;
      ctx.fillText(`+${skipped}`, (more.x0 + more.x1) / 2, (more.y0 + more.y1) / 2);
      ctx.font = `${f}px Arial, sans-serif`;
    }
    // points du cheminement et distances cumulées ; noms décalés sur une seconde ligne s'ils se chevauchent
    ctx.textAlign = 'center';
    const rowEnd = [-Infinity, -Infinity];
    for (const m of data.marks) {
      const x = X(m.s);
      ctx.strokeStyle = '#17202a';
      ctx.setLineDash([4 * scale, 3 * scale]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, H - padB);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `bold ${f}px Arial, sans-serif`;
      const dist = `${(m.s / NM).toFixed(m.s / NM < 10 ? 1 : 0)} NM`,
        w = Math.max(ctx.measureText(m.name).width, ctx.measureText(dist).width) + 8 * scale;
      const tx = Math.min(W - padR - w / 2, Math.max(padL + w / 2, x)),
        row = tx - w / 2 >= rowEnd[0] ? 0 : tx - w / 2 >= rowEnd[1] ? 1 : (rowEnd[0] <= rowEnd[1] ? 0 : 1);
      rowEnd[row] = tx + w / 2;
      const y = H - padB + (12 + row * 28) * scale;
      if (row) {
        ctx.strokeStyle = '#9aa5ad';
        ctx.beginPath();
        ctx.moveTo(x, H - padB);
        ctx.lineTo(tx, y - f * .7);
        ctx.stroke();
      }
      ctx.fillStyle = '#17202a';
      ctx.fillText(m.name, tx, y);
      ctx.font = `${f * .9}px Arial, sans-serif`;
      ctx.fillStyle = '#56626b';
      ctx.fillText(dist, tx, y + 13 * scale);
      ctx.font = `${f}px Arial, sans-serif`;
    }
    // plan de vol : trajectoire prévue (violet), TOC / TOD, niveaux des paliers
    const plan = data.plan;
    if (plan) {
      const col = '#6a1b9a';
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.4 * scale;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let pen = false;
      plan.alt.forEach((v, i) => {
        if (v == null) {
          pen = false;
          return;
        }
        const x = X(data.samples[i].s),
          y = Y(v);
        pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        pen = true;
      });
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.textAlign = 'center';
      for (const [m, name] of [
          [plan.toc, 'TOC'],
          [plan.tod, 'TOD']
        ]) {
        if (!m || (name === 'TOD' && Math.abs(plan.tod.s - plan.toc.s) < data.total * .005)) continue;
        const x = X(m.s),
          y = Y(m.alt);
        ctx.beginPath();
        ctx.moveTo(x, y - 4 * scale);
        ctx.lineTo(x + 4 * scale, y);
        ctx.lineTo(x, y + 4 * scale);
        ctx.lineTo(x - 4 * scale, y);
        ctx.closePath();
        ctx.fill();
        const t = `${name} ${(m.s / NM).toFixed(0)} NM`,
          w = ctx.measureText(t).width + 6 * scale,
          r = {
            x0: x - w / 2,
            y0: y - 20 * scale,
            x1: x + w / 2,
            y1: y - 6 * scale
          };
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.fillRect(r.x0, r.y0, w, r.y1 - r.y0);
        ctx.fillStyle = col;
        ctx.font = `bold ${f}px Arial, sans-serif`;
        ctx.fillText(t, x, (r.y0 + r.y1) / 2);
        ctx.font = `${f}px Arial, sans-serif`;
        taken.push(r);
      }
      for (const l of plan.levels) {
        const x = X(l.s),
          y = Y(l.alt) + 9 * scale,
          t = l.alt >= 10000 || l.alt % 100 ? `FL${String(Math.round(l.alt / 100)).padStart(3, '0')}` : `${Math.round(l.alt)} ft`,
          w = ctx.measureText(t).width + 6 * scale,
          r = {
            x0: x - w / 2,
            y0: y - f * .6,
            x1: x + w / 2,
            y1: y + f * .6
          };
        if (!free(r)) continue;
        taken.push(r);
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.fillRect(r.x0, r.y0, w, r.y1 - r.y0);
        ctx.fillStyle = col;
        ctx.fillText(t, x, y);
      }
    }
    ctx.strokeStyle = '#17202a';
    ctx.lineWidth = 1;
    ctx.strokeRect(padL, padT, W - padL - padR, H - padT - padB);
    ctx.restore();
    // géométrie de la coupe (édition à la souris : shared/carto/vprof_editor.js)
    data.geo = {
      W,
      H,
      padL,
      padR,
      padT,
      padB,
      top,
      bottom,
      total: data.total,
      skipped,
      taken: strictLabels ? taken : undefined
    };
    return data.geo;
  }

  // ===== Espaces d'un profil d'affichage (mêmes règles que les cartes du studio) =====
  const zNorm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  /** Nom d'espace réduit à son cœur (sans type ni numéro), pour les correspondances de profil. */
  const zCore = name => {
    const n = String(name || '').trim(),
      d = /^(\d+)/.exec(n);
    if (d) return d[1];
    const w = /^(.*\D)\s+\d+\S*$/.exec(n);
    return w ? w[1].trim() : n;
  };
  /** Vrai si le type t fait partie des types choisis (RMZ-TMZ couvre RMZ et TMZ). */
  const zFamily = (types, t) => types.has(t) || (t === 'RMZ-TMZ' && (types.has('RMZ') || types.has('TMZ')));
  /** Alias de zone (« @nom ») du profil d'affichage correspondant à la requête. */
  const zAlias = (q, aliases) => /^@/.test(String(q).trim()) ? Object.keys(aliases || {}).find(k => zNorm(k) === zNorm(q)) : null;
  // Une entrée de liste désigne-t-elle cet espace ? « @ALIAS » (groupe), « R 166* » (toutes les parties),
  // fragment de nom ou d'identifiant.
  function zHit(a, q, aliases, depth = 0) {
    const alias = zAlias(q, aliases);
    if (alias) return depth < 1 && (aliases[alias] || []).some(m => zHit(a, m, aliases, depth + 1));
    if (/\*\s*$/.test(q)) {
      const base = zNorm(q),
        core = zCore(a.name);
      return !!base && [a.type + core, 'LF' + a.type + core].some(v => zNorm(v) === base);
    }
    const n = zNorm(q);
    return !!n && [a.name, a.key, a.type + a.name].some(v => zNorm(v).includes(n));
  }
  /** Liste des zones choisies dans un profil d'affichage. */
  const zoneList = p => Array.isArray(p?.zoneList) ? p.zoneList : (p?.allZones === false ? String(p?.zoneList || '').split(/\r?\n|,/).map(
    x => x.trim()).filter(Boolean) : []);
  // Valeur d'un réglage d'élément d'un profil (défaut si absent).
  const opt = (profile, id, def) => {
    const v = profile?.elements?.[id];
    return v === undefined || v === '' ? def : v;
  };

  /** Espaces aériens à afficher selon le profil d'affichage (types, zones choisies, alias, zones du brief). */
  function selectAirspaces(profile, airspaces, {
    aliases = {},
    limitFt
  } = {}) {
    const types = new Set(profile?.zones || []),
      list = zoneList(profile),
      lo = parseFloat(opt(profile, 'zoneFloor', '')),
      hi = parseFloat(opt(profile, 'zoneCeil', ''));
    if (!types.size) return [];
    return (airspaces || []).filter(a => zFamily(types, a.type) && (!(lo > 0) || limitFt(a.upper, true) > lo) && (!(hi > 0) || limitFt(a
        .lower, false) < hi) &&
      (!list.length || (profile.zoneMode === 'black' ? !list.some(q => zHit(a, q, aliases)) : list.some(q => zHit(a, q, aliases)))));
  }

  // ===== Noms des points =====
  // Point à une distance (NM) et un relèvement vrai (°) d'un autre (grand cercle).
  function destination(p, brgDeg, nm) {
    const d = nm / 3440.065,
      t = rad(brgDeg),
      f1 = rad(p.lat),
      l1 = rad(p.lon),
      f2 = Math.asin(Math.sin(f1) * Math.cos(d) + Math.cos(f1) * Math.sin(d) * Math.cos(t));
    const l2 = l1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(f1), Math.cos(d) - Math.sin(f1) * Math.sin(f2));
    return {
      lat: f2 * 180 / Math.PI,
      lon: (l2 * 180 / Math.PI + 540) % 360 - 180
    };
  }
  // Résolution : points connus (brief : Map NOM → point), aérodromes (OACI), balises (VOR > TACAN > NDB >
  // DME), points RNAV (AIXM), « REN300010 » = balise REN, radiale magnétique 300 (déclinaison de
  // l'aérodrome le plus proche), 10 NM. Homonymes : le plus proche du point précédent (ou de ref).
  function resolver({
    brief = new Map(),
    aero = {},
    ref = {
      lat: 46.5,
      lon: 2.5
    }
  } = {}) {
    const NAV_PREF = {
      VOR: 0,
      TACAN: 1,
      NDB: 2,
      DME: 3
    };
    let last = null;
    const near = list => {
      const r = last || ref;
      let b = null,
        d = Infinity;
      for (const x of list) {
        const e = (x.lat - r.lat) ** 2 + (x.lon - r.lon) ** 2;
        if (e < d) {
          d = e;
          b = x;
        }
      }
      return b;
    };
    /** Déclinaison magnétique au point (radionavigation la plus proche). */
    const magVarAt = (lat, lon) => {
      let best = 0,
        d = Infinity;
      for (const a of aero.aerodromes || []) {
        if (!a.magVar) continue;
        const e = (a.lat - lat) ** 2 + ((a.lon - lon) * Math.cos(rad(lat))) ** 2;
        if (e < d) {
          d = e;
          best = a.magVar;
        }
      }
      return best;
    };
    /** Balise de radionavigation d'identifiant k (VOR / DME préférés). */
    const navaid = k => {
      const c = (aero.navaids || []).filter(n => String(n.id || '').toUpperCase() === k && n.kind in NAV_PREF);
      if (!c.length) return null;
      const best = Math.min(...c.map(n => NAV_PREF[n.kind]));
      return near(c.filter(n => NAV_PREF[n.kind] === best));
    };
    /** Point de route connu d'identifiant k (brief, aérodrome, balise, point RNAV). */
    const find = k => {
      if (brief.has(k)) return brief.get(k);
      const ad = (aero.aerodromes || []).find(a => String(a.icao || '').toUpperCase() === k);
      if (ad) return {
        name: ad.icao,
        lat: ad.lat,
        lon: ad.lon
      };
      const nv = navaid(k);
      if (nv) return {
        name: nv.id,
        lat: nv.lat,
        lon: nv.lon
      };
      const rn = near((aero.points || []).filter(p => String(p.id).toUpperCase() === k));
      if (rn) return {
        name: rn.id,
        lat: rn.lat,
        lon: rn.lon
      };
      // point de report VFR (XML_SIA : « MM-CV »)
      const vr = (aero.vrp || []).find(p => String(p.id).toUpperCase() === k);
      if (vr) return {
        name: vr.id,
        lat: vr.lat,
        lon: vr.lon
      };
      const m = /^([A-Z]{2,3})(\d{3})(\d{3})$/.exec(k);
      if (m) {
        const b = navaid(m[1]);
        if (b) return {
          name: k,
          ...destination(b, +m[2] + magVarAt(b.lat, b.lon), +m[3])
        };
      }
      return null;
    };
    const fn = name => {
      const p = find(String(name).trim().toUpperCase());
      if (p) last = p;
      return p;
    };
    fn.airways = aero.airways || []; // voies aériennes (parseRoute : « TOU UN460 NTS » suivie point par point)
    return fn;
  }

  // ===== Relief : tuiles d'altitude Terrarium (AWS), z10 ≈ 150 m, gardées en mémoire =====
  function terrainSampler(z = 10) {
    const tiles = new Map();
    /** Tuile de relief (altitudes) pour l'échantillonnage du terrain le long de la route. */
    const tile = (x, y) => {
      const key = `${x}/${y}`;
      if (!tiles.has(key)) tiles.set(key, (async () => {
        const r = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`);
        if (!r.ok) throw Error(`Tuile de relief ${z}/${x}/${y} : ${r.status}`);
        const img = await createImageBitmap(await r.blob()),
          c = new OffscreenCanvas(256, 256),
          g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        return g.getImageData(0, 0, 256, 256).data;
      })().catch(e => {
        tiles.delete(key);
        throw e;
      }));
      return tiles.get(key);
    };
    return async (lat, lon) => {
      const n = 2 ** z,
        xf = (lon + 180) / 360 * n,
        r = rad(lat),
        yf = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n,
        x = Math.floor(xf),
        y = Math.floor(yf);
      const d = await tile(x, y),
        px = Math.min(255, Math.floor((xf - x) * 256)),
        py = Math.min(255, Math.floor((yf - y) * 256)),
        i = (py * 256 + px) * 4;
      return d[i] * 256 + d[i + 1] + d[i + 2] / 256 - 32768;
    };
  }

  // ===== Données mémorisées par le studio (même navigateur) =====
  // Base SIA (IndexedDB 'sia-map-parser' : espaces, aérodromes, balises, obstacles, points RNAV), profils
  // d'affichage, alias de zones, et profil choisi pour le profil vertical dans la mission partagée.
  async function loadStudio() {
    const base = await new Promise(ok => {
      try {
        const r = indexedDB.open('sia-map-parser', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('cache');
        r.onerror = () => ok(null);
        r.onsuccess = () => {
          try {
            const q = r.result.transaction('cache').objectStore('cache').get('base');
            q.onsuccess = () => ok(q.result || null);
            q.onerror = () => ok(null);
          } catch {
            ok(null);
          }
        };
      } catch {
        ok(null);
      }
    });
    const json = (k, d) => {
      try {
        return JSON.parse(localStorage.getItem(k) || 'null') ?? d;
      } catch {
        return d;
      }
    };
    const profiles = json('siaDisplayProfiles', []),
      mission = json('siaMissionShared:v1', null),
      vp = mission?.yaml?.vertical_profile || {};
    return {
      base,
      profiles,
      aliases: json('siaZoneAliases', {}),
      profileId: vp.profile || 'vprof',
      vertical: vp
    };
  }

  /** Coordonnée au degré-minute-seconde (« 462012N0010534E ») : hors norme OACI (la case 15 s'arrête à la minute),
   *  pour les usages qui demandent plus de précision. */
  function icaoLatLonSec(lat, lon) {
    const f = (v, w, h) => {
      let t = Math.round(Math.abs(v) * 3600);
      const d = Math.floor(t / 3600),
        m = Math.floor(t % 3600 / 60),
        s = t % 60;
      return String(d).padStart(w, '0') + String(m).padStart(2, '0') + String(s).padStart(2, '0') + h;
    };
    return f(lat, 2, lat >= 0 ? 'N' : 'S') + f(lon, 3, lon >= 0 ? 'E' : 'W');
  }
  /** Coordonnée de plan de vol OACI au degré-minute (« 4620N00105E »). */
  function icaoLatLon(lat, lon) {
    const f = (v, w, h) => {
      const a = Math.abs(v);
      let d = Math.floor(a),
        m = Math.round((a - d) * 60);
      if (m === 60) {
        d++;
        m = 0;
      }
      return String(d).padStart(w, '0') + String(m).padStart(2, '0') + h;
    };
    return f(lat, 2, lat >= 0 ? 'N' : 'S') + f(lon, 3, lon >= 0 ? 'E' : 'W');
  }
  // ---- coordonnées écrites librement → format du plan de vol (aide à la saisie du champ Route)
  // Règles de lecture (pas une liste close) : une latitude puis une longitude ;
  //   · chacune en degrés décimaux, en degrés et minutes ou en degrés, minutes, secondes (°, ', " et leurs variantes
  //     typographiques), point ou virgule décimale, hémisphère N / S puis E / W (O : ouest) devant ou derrière le nombre,
  //     séparées par une espace, une virgule, un point-virgule ou un tiret ; longitude sans hémisphère : est, si elle
  //     porte le signe des degrés ;
  //   · ou collées à la manière OACI (« 4418N0003W ») : chiffres lus deux à deux (degrés, minutes, secondes, puis
  //     décimales de la seconde), trois chiffres de degrés de longitude dès cinq chiffres ;
  //   · ou deux nombres décimaux dont le premier est signé (« +44.18,-0.038 ») ;
  // les coordonnées déjà au format OACI et « lat lon » en décimal non signé (déjà lu tel quel) ne changent pas.
  // Sortie : case 15 à la minute (« 4411N00002W ») si la position y tombe juste, sinon à la seconde (« 441048N0000217W »,
  // lue par la suite ; « Copier OACI » arrondit à la minute) : aucune précision donnée n'est perdue.
  const DEG = '°º˚',
    MIN = "'′’ʼ",
    SEC = '"″”';
  const NUM = String.raw`\d{1,3}(?:[.,]\d+)?`,
    DMS = String.raw`\d{1,3}\s*[${DEG}]\s*(?:\d{1,2}(?:[.,]\d+)?\s*[${MIN}]?\s*(?:\d{1,2}(?:[.,]\d+)?\s*(?:''|[${SEC}])\s*)?)?`,
    LEAD = String.raw`(^|[\s,;(])`,
    TAIL = String.raw`(?=$|[\s,;/)])`;
  /** Une moitié (latitude : NS, longitude : EWO) : hémisphère devant, signe, nombre, hémisphère derrière. */
  const half = h => String.raw`(?:([${h}])\s*)?([+-]?)(${DMS}|${NUM})\s*([${h}])?`;
  const RX_LOOSE = new RegExp(String.raw`${LEAD}${half('NS')}\s*(?:[,;-]\s*)?${half('EWO')}${TAIL}`, 'gi'),
    RX_PACKED = new RegExp(String.raw`${LEAD}(\d{2,})([NS])(\d{2,})([EWO])${TAIL}`, 'gi'),
    FPL_COORD = /^\d{2}(?:\d{2}(?:\d{2})?)?[NS]\d{3}(?:\d{2}(?:\d{2})?)?[EW]$/i,
    RX_SIGNED = new RegExp(String.raw`${LEAD}([+-]\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*([+-]?\d{1,3}(?:\.\d+)?)${TAIL}`, 'g');
  /** Valeur absolue (degrés) d'un nombre écrit en décimal ou en degrés / minutes / secondes ; null hors limites. */
  const angleOf = (text, max) => {
    const n = String(text).replace(/,/g, '.').split(/[^\d.]+/).filter(Boolean).map(Number);
    if (!n.length || n.some(x => !Number.isFinite(x)) || (n[1] ?? 0) >= 60 || (n[2] ?? 0) >= 60) return null;
    const v = n[0] + (n[1] || 0) / 60 + (n[2] || 0) / 3600;
    return v <= max ? v : null;
  };
  /** Valeur absolue d'une suite de chiffres collés (« 441819584 » → 44° 18′ 19,584″) ; deg : chiffres des degrés. */
  const packedOf = (digits, deg, max) => {
    const d = +digits.slice(0, deg),
      m = +(digits.slice(deg, deg + 2) || 0),
      sec = +((digits.slice(deg + 2, deg + 4) || '0') + '.' + (digits.slice(deg + 4) || '0'));
    if (m >= 60 || sec >= 60) return null;
    const v = d + m / 60 + sec / 3600;
    return v <= max ? v : null;
  };
  /** Coordonnée de la case 15, hémisphères donnés (une longitude nulle garde son W) : à la minute si elle y tombe juste,
   *  sinon à la seconde. */
  function fplCoord(lat, ns, lon, ew) {
    const sec = v => Math.round(v * 3600),
      exact = sec(lat) % 60 === 0 && sec(lon) % 60 === 0,
      f = (v, w) => {
        const t = sec(v),
          dd = String(Math.floor(t / 3600)).padStart(w, '0'),
          mm = String(Math.floor(t % 3600 / 60)).padStart(2, '0');
        return exact ? dd + mm : dd + mm + String(t % 60).padStart(2, '0');
      };
    return f(lat, 2) + ns + f(lon, 3) + ew;
  }
  /** Réécrit au format du plan de vol les coordonnées d'un texte de route écrites autrement (règles ci-dessus).
   *  Retour : { text, changes: [[écrit, réécrit]…] }. */
  function normalizeCoords(text) {
    const changes = [];
    const swap = (whole, lead, out) => {
      if (!out) return whole;
      const from = whole.slice(lead.length).trim();
      if (from === out) return whole;
      changes.push([from, out]);
      return lead + out;
    };
    let t = String(text ?? '');
    // collées : « 4418N0003W », « 441819584N00032421849733W » (déjà OACI : inchangées)
    t = t.replace(RX_PACKED, (whole, lead, la, ns, lo, ew) => {
      ns = ns.toUpperCase();
      ew = ew.toUpperCase() === 'O' ? 'W' : ew.toUpperCase();
      if ([2, 4, 6].includes(la.length) && [3, 5, 7].includes(lo.length) && whole.slice(lead.length) === `${la}${ns}${lo}${ew}`)
        return whole;
      const lat = packedOf(la, 2, 90),
        lon = packedOf(lo, lo.length === 2 || lo.length === 4 ? 2 : 3, 180);
      return swap(whole, lead, lat != null && lon != null ? fplCoord(lat, ns, lon, ew) : '');
    });
    // deux décimaux, le premier signé : « +44.18,-00.038 »
    t = t.replace(RX_SIGNED, (whole, lead, a, b) => {
      const lat = +a,
        lon = +b;
      return swap(whole, lead, Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? fplCoord(Math.abs(lat), lat < 0 ? 'S' : 'N', Math.abs(
          lon),
        lon < 0 ? 'W' : 'E') : '');
    });
    // avec hémisphères ou symboles : « 44.18N 00.038W », « N44,18-W00,034 », « 44°19'52"N 00°59'59" », « 44N 00W »
    t = t.replace(RX_LOOSE, (whole, lead, nsA, sA, la, nsB, ewA, sB, lo, ewB) => {
      if (FPL_COORD.test(whole.slice(lead.length).trim())) return whole; // déjà au format OACI (« 48N002E »)
      const ns = (nsA || nsB || '').toUpperCase(),
        ew = (ewA || ewB || (new RegExp(`[${DEG}]`).test(lo) ? 'E' : '')).toUpperCase().replace('O', 'W');
      if (!ns || !ew) return whole;
      const lat = angleOf(la, 90),
        lon = angleOf(lo, 180);
      return swap(whole, lead, lat != null && lon != null ? fplCoord(lat, ns, lon, ew) : '');
    });
    return {
      text: t,
      changes
    };
  }
  /** Aide du champ Route (textarea) : à la sortie du champ, coordonnées réécrites au format du plan de vol (avant les
   *  traitements de la page : phase de capture), notification de ce qui a changé ; événement input émis. */
  function coordHelper(el) {
    if (!el || el.dataset.coordHelper) return;
    el.dataset.coordHelper = '1';
    el.addEventListener('change', () => {
      const r = normalizeCoords(el.value);
      if (!r.changes.length) return;
      el.value = r.text;
      el.dispatchEvent(new Event('input', {
        bubbles: true
      }));
      const K = window.RepositoryKit,
        list = r.changes.slice(0, 3).map(([a, b]) => `${a} → ${b}`).join(' ; ') + (r.changes.length > 3 ? ` (+${r.changes.length - 3})` : ''),
        row = ['Coordonnées mises au format du plan de vol : {l}.', 'Coordinates rewritten in the flight plan format: {l}.',
          'Koordinaten ins Flugplanformat umgeschrieben: {l}.', 'Coordenadas pasadas al formato del plan de vuelo: {l}.'
        ];
      window.AppFramework?.notify?.(K?.tf ? K.tf(row, {
        l: list
      }) : row[0].replace('{l}', list), 'info');
    }, true);
  }
  /** Groupe vitesse / niveau de la case 15 (« N0180F055 », « N0120A035 ») ; niveau de vol si le libellé est un FL ou
   *  à partir de 6000 ft, sinon altitude en centaines de pieds. */
  function icaoGroup(kt, ft, label) {
    const fl = /^FL/i.test(String(label || '')) || (!label && ft >= 6000);
    return `N${String(Math.round(kt)).padStart(4, '0')}${fl ? 'F' : 'A'}${String(Math.round(ft / 100)).padStart(3, '0')}`;
  }
  /** Cheminement du profil (points de parseRoute : { name, lat, lon, lvl, alt }) → route de plan de vol OACI.
   *  Points publiés (aérodromes, balises, points RNAV de la base SIA, même position à 2 NM près) gardés par leur
   *  indicatif ; les autres (points du brief, sommets des zones du RTBA « R 589 B »…) en coordonnées « 4620N00105E ».
   *  Changement de niveau après un point (« R589B, FL55 ») → « 4452N00012E/N0180F055 ». Niveau de départ : celui du
   *  premier point, sinon cruiseFt. Résultat : { item15, full (départ + case 15 + destination), dep, dest, distNm,
   *  trackDeg (route vraie départ → destination), cruiseFt, kt } ; null s'il y a moins de deux points. */
  function toIcaoRoute(points, {
    aero = {},
    kt = 120,
    cruiseFt = null,
    resolve = null
  } = {}) {
    const pts = (points || []).filter(p => Number.isFinite(p?.lat) && Number.isFinite(p?.lon));
    if (pts.length < 2) return null;
    // resolve donné : texte du champ de route (noms connus de ce résolveur gardés : points du brief, TARGET… ;
    // « /A035 » gardé) ; sinon plan de vol OACI strict (indicatifs publiés, altitudes en groupes vitesse / niveau)
    const strict = !resolve,
      plain = resolve || resolver({
        aero
      });
    const airways = new Set((aero.airways || []).map(g => g.route));
    const nmBetween = (a, b) => {
      const r = Math.PI / 180,
        x = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lon - a.lon) * r / 2) ** 2;
      return 2 * 3440.065 * Math.asin(Math.sqrt(x));
    };
    const desig = p => {
      const n = String(p.name || '').trim().toUpperCase();
      if (strict ? /^[A-Z0-9]{2,5}$/.test(n) : /^[A-Z0-9_-]{2,12}$/.test(n)) {
        const q = plain(n);
        if (q && nmBetween(q, p) <= 2) return n;
      }
      return icaoLatLon(p.lat, p.lon); // case 15 : degrés et minutes seulement (secondes acceptées à la lecture)
    };
    const levelOf = l => l && !l.vfr && Number.isFinite(l.ft) ? l : null;
    const first = levelOf(pts[0].lvl) || (Number.isFinite(cruiseFt) && cruiseFt > 0 ? {
      ft: cruiseFt,
      label: cruiseFt >= 6000 ? 'FL' : ''
    } : null);
    const speed = l => l?.kt || kt;
    /** Suffixe d'un point : groupe vitesse / niveau (changement de niveau) ou altitude à atteindre au point. */
    const suffix = p => {
      const l = levelOf(p.lvl);
      if (l) return '/' + icaoGroup(speed(l), l.ft, l.label);
      if (Number.isFinite(p.alt) && p.alt > 0) return strict ? '/' + icaoGroup(kt, p.alt, p.alt >= 6000 ? 'FL' : '') : `/${p.alt >= 6000 ? 'F' : 'A'}${String(Math.round(p.alt / 100)).padStart(3, '0')}`;
      return p.lvl?.vfr ? ' VFR' : '';
    };
    const out = [];
    if (first) out.push(icaoGroup(speed(first), first.ft, first.label));
    else if (strict) out.push('VFR');
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i],
        sfx = suffix(p),
        awy = p.via && airways.has(p.via) ? p.via : '';
      // portion de voie aérienne : points intermédiaires omis (« TOU UN460 NTS »), sauf changement de niveau
      if (awy && !sfx && pts[i + 1]?.via === awy && i + 1 < pts.length - 1) continue;
      out.push(awy || 'DCT', desig(p) + sfx);
    }
    out.push('DCT');
    const dep = desig(pts[0]),
      dest = desig(pts[pts.length - 1]);
    let dist = 0;
    for (let i = 1; i < pts.length; i++) dist += nmBetween(pts[i - 1], pts[i]);
    const a = pts[0],
      b = pts[pts.length - 1],
      r = Math.PI / 180,
      trk = (Math.atan2(Math.sin((b.lon - a.lon) * r) * Math.cos(b.lat * r), Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat *
        r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r)) / r + 360) % 360;
    const item15 = out.join(' ');
    return {
      item15,
      full: `${dep} ${item15} ${dest}`,
      dep,
      dest,
      distNm: dist,
      trackDeg: trk,
      cruiseFt: first?.ft ?? null,
      kt
    };
  }

  // ---- appareil du profil vertical (Cartes de vol, studio cartographique) : fiches de performances du planificateur
  /** Fiches de performances de ce navigateur (flightPerfState du Carburant). */
  const perfSheets = () => {
    try {
      return Object.values(JSON.parse(localStorage.getItem('flightPerfState') || '{}').profiles || {}).filter(p => p && p.id);
    } catch {
      return [];
    }
  };
  /** Échappement HTML (socle commun, sinon local). */
  const escHtml = t => window.RepositoryKit?.esc ? window.RepositoryKit.esc(t) : String(t ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
  const RATES = '— taux ci-dessous —'; // texte source français (traduit par la page)
  /** Choix de l'appareil du profil vertical : le select (valeur lue par la page, « change » émis au choix) reçoit les
   *  fiches ; il est montré par le sélecteur commun (shared/aircraft_picker.js : bouton, recherche, catégories,
   *  « — taux ci-dessous — » en tête), le select restant caché. sel : fiche présélectionnée (absente : taux saisis). */
  function aircraftChoice(select, sel) {
    if (!select) return;
    const list = perfSheets();
    select.innerHTML = `<option value="">${RATES}</option>` + list.map(p => `<option value="${escHtml(p.id)}">${escHtml(p.name || p.id)}${p.icao && p.icao !== p.name ? ` (${escHtml(p.icao)})` : ''}</option>`).join('');
    select.value = list.some(p => p.id === sel) ? sel : '';
    const P = window.AircraftPicker;
    if (!P) return;
    let btn = select._choiceButton;
    if (!btn) {
      btn = select._choiceButton = Object.assign(document.createElement('button'), {
        type: 'button',
        className: 'vprof-aircraft'
      });
      select.after(btn);
      select.hidden = true;
      P.attach(btn, {
        kind: 'button',
        sources: () => [{
          group: '',
          items: [{
            key: '',
            label: RATES,
            icon: '<span>⇅</span>',
            current: !select.value
          }]
        }, ...P.byCategory(perfSheets().map(p => ({
          key: p.id,
          label: p.name || p.id,
          sub: p.icao || p.type || '',
          type: p.icao || p.type || p.id,
          current: select.value === p.id
        })))],
        current: () => {
          const p = perfSheets().find(x => x.id === select.value);
          return p ? {
            label: p.name || p.id,
            type: p.icao || p.type || p.id
          } : {
            label: RATES,
            icon: '<span>⇅</span>'
          };
        },
        onPick: it => {
          select.value = it.key;
          select.dispatchEvent(new Event('change', {
            bubbles: true
          }));
          btn._aircraftPicker?.refresh();
        }
      });
    }
    btn._aircraftPicker?.refresh();
  }

  window.SiaProfile = {
    aircraftChoice,
    parseRoute,
    toIcaoRoute,
    icaoLatLon,
    icaoLatLonSec,
    normalizeCoords,
    coordHelper,
    speedLevel,
    build,
    draw,
    zones: {
      norm: zNorm,
      core: zCore,
      family: zFamily,
      hit: zHit,
      list: zoneList
    },
    selectAirspaces,
    resolver,
    destination,
    terrainSampler,
    loadStudio,
    opt
  };
})();
