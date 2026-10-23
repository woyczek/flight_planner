(() => {
  'use strict';
  // V3 maps — noyau de rendu sorti du studio cartographique (apps/cpco/map_parser.html, ses draw*Canvas ;
  // modules/maps/READING.md § 1, SPEC.md). Tout entre en paramètre, rien n'est lu dans une page ni dans une globale de
  // données : un profil d'affichage complet (objet), l'emprise affichée, les éléments rendus par aerodb pour cette
  // emprise, la route ; la projection est donnée (toC(lat, lon) → { x, y } : MapLibre map.project, ou la projection
  // de Mercator du fond uni). Symboles OACI et placeur de libellés : window.SiaAero (lib/aero_symbols.js, copie de la V2).
  // Aucun texte d'interface : libellés de données seulement (codes, noms, niveaux).
  // API : window.MapsRender = { routeProfile(levelFt), selectAirspaces(list, profile, route), bboxOf(points, marginNm),
  //   distances(points), marks(points, stepNm), mercator(bbox, W, H, pad), drawBackground(ctx, toC, W, H, rings, colors),
  //   draw(ctx, { toC, W, H, scale, bbox, profile, data, route, marks, mission }), tokens(), themed(ctx, tokens),
  //   contrast(c1, c2) (rapport WCAG) } ;
  //   mission : { points, zones } d'une carte de mission (points tournants, zones de recherche / mission / exclusion).
  // Couleurs « de papier » (fond, halos, encre, gris) : jetons du design du cadre (frame/design/INTEGRATION.md), par
  // themed() qui les substitue aux valeurs écrites en dur, ici et dans les copies du studio ; couleurs cartographiques
  // (espaces, voies, route) gardées.
  if (window.MapsRender) return;
  const A = () => window.SiaAero,
    PT = 4 / 3,
    NM = 1852;

  // ---------------------------------------------------------------- jetons du design
  /** Composantes [r, g, b] (0-255) d'une couleur « #rgb », « #rrggbb » ou « rgb(…) » ; null sinon. */
  function rgbOf(c) {
    const s = String(c || '').trim();
    let m = /^#([0-9a-f]{3})$/i.exec(s);
    if (m) return [...m[1]].map(x => parseInt(x + x, 16));
    m = /^#([0-9a-f]{6})$/i.exec(s);
    if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
    m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(s);
    return m ? [+m[1], +m[2], +m[3]] : null;
  }
  /** Couleur c avec l'opacité a (rgba) ; c telle quelle si elle n'est pas lisible. */
  const withAlpha = (c, a) => {
    const r = rgbOf(c);
    return r ? `rgba(${r.join(',')},${a})` : c;
  };
  /** Jetons de dessin lus sur <html> (design et ton en cours) : fond des dessins, fond de page, encre, gris, grille,
   *  accent ; dark : fond sombre (nuit), déduit de sa clarté. */
  function tokens() {
    const cs = getComputedStyle(document.documentElement),
      v = (n, d) => cs.getPropertyValue(n).trim() || d,
      t = {
        bg: v('--sog-chart-bg', '#fff'),
        page: v('--sog-bg', '#f5f6f8'),
        fg: v('--sog-fg', '#17202a'),
        muted: v('--sog-muted', '#5b6670'),
        grid: v('--sog-chart-grid', '#d9dee4'),
        accent: v('--sog-accent', '#1d6fd8')
      },
      rgb = rgbOf(t.bg) || [255, 255, 255];
    t.dark = (.2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]) / 255 < .45;
    return t;
  }
  /** Jetons du dessin en cours (draw : opts.theme, sinon lus) ; paper() : fond des dessins (halos, cartouches). */
  let T = null;
  const paper = () => (T ||= tokens()).bg;
  const WHITE = /^(#fff|#ffffff|white)$/,
    WHITE_A = /^rgba?\(255,255,255(?:,([\d.]+))?\)$/,
    INK = new Set(['#17202a', '#222', '#222222', '#333', '#333333', '#000', '#000000']),
    GREY = new Set(['#56626b', '#5b6670', '#4b5563', '#6b7280', '#9aa5ad']),
    RULE = new Set(['#e3e8ec', '#d9dee4']);
  /** Luminance relative WCAG d'une couleur [r, g, b] (0-255). */
  const luminance = rgb => {
    const [r, g, b] = rgb.map(v => {
      v /= 255;
      return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    });
    return .2126 * r + .7152 * g + .0722 * b;
  };
  /** Rapport de contraste WCAG de deux couleurs [r, g, b]. */
  const contrast = (a, b) => {
    const x = luminance(a),
      y = luminance(b);
    return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
  };
  /** Contexte 2D dont les couleurs de papier écrites par valeur prennent les jetons t : blanc (fonds, halos, cartouches)
   *  → fond des dessins, encre → texte, gris → texte secondaire, filets → grille. Les autres couleurs (cartographiques)
   *  gardent leur teinte : une couleur pleine sous 4,5:1 avec le fond des halos (WCAG AA pour un texte) est éclaircie la
   *  nuit, foncée le jour, juste assez ; la nuit, une couleur transparente sombre (bandes, fonds de zone) est éclaircie
   *  de 45 %. Les jetons eux-mêmes ne sont
   *  jamais changés. Sert aux copies du studio (symboles, profil), qu'on ne modifie pas. */
  function themed(ctx, t) {
    const keep = new Set([t.bg, t.page, t.fg, t.muted, t.grid, t.accent].map(c => String(c).replace(/\s+/g, '').toLowerCase())),
      bgRgb = rgbOf(t.bg) || [0, 0, 0],
      memo = new Map();
    const map = c => {
      if (typeof c !== 'string') return c; // dégradé, motif
      const k = c.replace(/\s+/g, '').toLowerCase();
      if (keep.has(k)) return c;
      if (WHITE.test(k)) return t.bg;
      const m = WHITE_A.exec(k);
      if (m) return withAlpha(t.bg, m[1] ?? 1);
      if (INK.has(k)) return t.fg;
      if (GREY.has(k)) return t.muted;
      if (RULE.has(k)) return t.grid;
      // nuit : une couleur cartographique trop sombre pour le fond est éclaircie (opacité gardée)
      if (t.dark) {
        if (memo.has(k)) return memo.get(k);
        const r = rgbOf(k),
          a = +(/^rgba\([^)]*,([\d.]+)\)$/.exec(k)?.[1] ?? 1);
        let out = c;
        if (r && a < .6) {
          if (luminance(r) < .2) out = `rgba(${r.map(x => Math.round(x + (255 - x) * .45)).join(',')},${a})`;
        } else if (r && contrast(r, bgRgb) < 4.5) {
          let l = r;
          for (let i = 1; i <= 20 && contrast(l, bgRgb) < 4.5; i++) l = r.map(x => Math.round(x + (255 - x) * i / 20));
          out = a < 1 ? `rgba(${l.join(',')},${a})` : `rgb(${l.join(',')})`;
        }
        memo.set(k, out);
        return out;
      }
      // jour : une couleur pleine trop claire pour le fond (fond crème du design durci) est foncée jusqu'à 4,5:1
      if (memo.has(k)) return memo.get(k);
      const r = rgbOf(k),
        a = +(/^rgba\([^)]*,([\d.]+)\)$/.exec(k)?.[1] ?? 1);
      let out = c;
      if (r && a >= .6 && contrast(r, bgRgb) < 4.5) {
        let l = r;
        for (let i = 1; i <= 20 && contrast(l, bgRgb) < 4.5; i++) l = r.map(x => Math.round(x * (1 - i / 20)));
        out = a < 1 ? `rgba(${l.join(',')},${a})` : `rgb(${l.join(',')})`;
      }
      memo.set(k, out);
      return out;
    };
    return new Proxy(ctx, {
      get(o, p) {
        const v = o[p];
        return typeof v === 'function' ? v.bind(o) : v;
      },
      set(o, p, v) {
        o[p] = p === 'fillStyle' || p === 'strokeStyle' ? map(v) : v;
        return true;
      }
    });
  }

  // ---------------------------------------------------------------- profil d'affichage
  /** Réglages par défaut d'un élément (ceux du profil « IFR simplifié » du studio). */
  const DEFAULTS = {
    airwaysLow: false,
    airwaysHigh: false,
    airwayLabels: true,
    zoneAbbrev: true,
    zoneLabelsShow: true,
    zoneOpacity: '25',
    zoneLimitsShow: false,
    zoneSmallCross: true,
    zoneFont: '7',
    zoneColor: '#17202a',
    icaoStyle: true,
    zoneFloor: '',
    zoneCeil: '',
    aerodromes: false,
    navaids: false,
    obstacles: false,
    obstacleMin: '300',
    adLabels: true,
    navLabels: true,
    roseSize: '3.2',
    adPublic: true,
    adRestricted: false,
    adState: true,
    adHeli: false,
    adStrip: false,
    adControl: 'all',
    navVor: true,
    navTacan: true,
    navDme: true,
    navNdb: true,
    navIls: false,
    pointFont: '11',
    graticule: true,
    graticuleLabels: true,
    graticuleFont: '7',
    graticuleColor: '#365a6c',
    mora: false,
    moraFont: '12',
    moraColor: '#8b2d18',
    moraOpacity: '90',
    moraSpacing: '70',
    vrpPoints: false,
    rnavPoints: false,
    vrpLabels: true,
    agglos: false,
    cityFont: '7',
    cityColor: '#17202a',
    cityLabelMin: '20000',
    turningPoints: true,
    missionZones: true,
    pointColor: '#d0021b',
    pointFill: '#d0021b',
    pointMarker: '8'
  };
  /** Profil intégré « route IFR » (V3, jamais en localStorage) : celui du studio pour les routes IFR (ifrRouteProfile,
   *  couloir de 10 NM, R / D / P / TRA / CTR / TMA / CTA, voies basses ou hautes selon le niveau) avec aérodromes,
   *  balises et MORA. */
  function routeProfile(levelFt = 0) {
    const low = !(levelFt >= 19500);
    return {
      id: 'v3-ifr-route',
      base: 'positron',
      zones: ['R', 'D', 'P', 'TRA', 'CTR', 'TMA', 'CTA'],
      zoneList: [],
      zoneMode: 'white',
      corridorNm: 10,
      elements: {
        ...DEFAULTS,
        airwaysLow: low,
        airwaysHigh: !low,
        zoneFloor: low ? '' : '19500',
        zoneCeil: low ? '19500' : '',
        aerodromes: true,
        navaids: true,
        mora: true,
        // hiérarchie de la carte du vol (px CSS à l'échelle 1) : libellés de la route 12-13, terrains et balises 10,
        // espaces 9, MORA 12 (sans fond), canevas 8 ; bandes des espaces plus claires pour laisser la route devant
        pointFont: '9',
        moraFont: '9',
        zoneFont: '7',
        graticuleFont: '6',
        zoneOpacity: '20'
      }
    };
  }
  /** Valeur d'un élément du profil (défaut si absent). */
  const el = (p, id) => {
    const v = p?.elements?.[id];
    return v === undefined || v === '' ? DEFAULTS[id] : v;
  };
  const on = (p, id) => !!el(p, id);

  // ---------------------------------------------------------------- géométrie
  const rad = d => d * Math.PI / 180;
  /** Distance orthodromique (NM). */
  const gc = (a, b) => {
    const p1 = rad(a.lat),
      p2 = rad(b.lat),
      dl = rad(b.lon - a.lon),
      h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 2 * Math.asin(Math.min(1, Math.sqrt(h))) * 6371008.8 / NM;
  };
  /** Distances cumulées (NM) depuis le premier point. */
  function distances(points) {
    const out = [0];
    for (let i = 1; i < points.length; i++) out.push(out[i - 1] + gc(points[i - 1], points[i]));
    return out;
  }
  /** Marques de distance tous les stepNm (défaut : 10 NM sous 150 NM, 50 NM au-delà) : [{ lat, lon, nm }]. */
  function marks(points, stepNm = 0) {
    if (points.length < 2) return [];
    const d = distances(points),
      total = d[d.length - 1],
      step = stepNm || (total > 150 ? 50 : 10),
      out = [];
    for (let nm = step, i = 1; nm < total; nm += step) {
      while (i < d.length - 1 && d[i] < nm) i++;
      const a = points[i - 1],
        b = points[i],
        k = d[i] > d[i - 1] ? (nm - d[i - 1]) / (d[i] - d[i - 1]) : 0;
      out.push({
        lat: a.lat + (b.lat - a.lat) * k,
        lon: a.lon + (b.lon - a.lon) * k,
        nm
      });
    }
    return out;
  }
  /** Emprise { w, s, e, n } des points, élargie de marginNm (au moins 10 % de chaque côté). */
  function bboxOf(points, marginNm = 25) {
    const ok = points.filter(p => Number.isFinite(p?.lat) && Number.isFinite(p?.lon));
    if (!ok.length) return null;
    let s = 90,
      n = -90,
      w = 180,
      e = -180;
    for (const p of ok) {
      s = Math.min(s, p.lat);
      n = Math.max(n, p.lat);
      w = Math.min(w, p.lon);
      e = Math.max(e, p.lon);
    }
    const k = Math.max(.2, Math.cos(rad((s + n) / 2))),
      dy = Math.max(marginNm / 60, (n - s) * .1),
      dx = Math.max(marginNm / 60 / k, (e - w) * .1);
    return {
      w: w - dx,
      s: Math.max(-85, s - dy),
      e: e + dx,
      n: Math.min(85, n + dy)
    };
  }
  /** Projection de Mercator qui fait tenir l'emprise b dans W × H (marge pad px), nord en haut : toC et l'emprise
   *  réellement affichée. */
  function mercator(b, W, H, pad = 8) {
    const my = lat => Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2)),
      x0 = rad(b.w),
      x1 = rad(b.e),
      y0 = my(b.s),
      y1 = my(b.n),
      k = Math.min((W - 2 * pad) / (x1 - x0 || 1e-9), (H - 2 * pad) / (y1 - y0 || 1e-9)),
      ox = (W - (x1 - x0) * k) / 2,
      oy = (H - (y1 - y0) * k) / 2,
      inv = (x, y) => ({
        lon: (((x - ox) / k + x0) * 180) / Math.PI,
        lat: (2 * Math.atan(Math.exp(y1 - (y - oy) / k)) - Math.PI / 2) * 180 / Math.PI
      }),
      tl = inv(0, 0),
      br = inv(W, H);
    return {
      toC: (lat, lon) => ({
        x: ox + (rad(lon) - x0) * k,
        y: oy + (y1 - my(lat)) * k
      }),
      toLL: inv,
      shown: {
        w: tl.lon,
        n: tl.lat,
        e: br.lon,
        s: br.lat
      }
    };
  }

  // ---------------------------------------------------------------- choix des espaces
  const family = (types, t) => types.has(t) || (t === 'RMZ-TMZ' && (types.has('RMZ') || types.has('TMZ')));
  const ringBox = a => a._mb ??= (() => {
    let s = 90,
      n = -90,
      w = 180,
      e = -180;
    for (const r of a.rings || [])
      for (const [la, lo] of r) {
        s = Math.min(s, la);
        n = Math.max(n, la);
        w = Math.min(w, lo);
        e = Math.max(e, lo);
      }
    return {
      s,
      n,
      w,
      e
    };
  })();
  /** Échantillons de la route (un tous les 2 NM environ). */
  function samples(points) {
    const out = [];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i],
        n = Math.max(1, Math.ceil(gc(a, b) / 2));
      for (let k = 0; k < n; k++) out.push([a.lat + (b.lat - a.lat) * k / n, a.lon + (b.lon - a.lon) * k / n]);
    }
    if (points.length) out.push([points[points.length - 1].lat, points[points.length - 1].lon]);
    return out;
  }
  /** Vrai si l'espace est à moins de nm NM des échantillons de la route (un échantillon dedans ou un bord proche). */
  function nearRoute(a, smp, nm) {
    const b = ringBox(a),
      m = nm / 60;
    if (!smp.some(([la, lo]) => la >= b.s - m && la <= b.n + m && lo >= b.w - m * 2 && lo <= b.e + m * 2)) return false;
    const seg = (la, lo, p, q) => {
      const k = Math.cos(rad(la)),
        ax = (p[1] - lo) * 60 * k,
        ay = (p[0] - la) * 60,
        bx = (q[1] - lo) * 60 * k,
        by = (q[0] - la) * 60,
        dx = bx - ax,
        dy = by - ay,
        t = dx || dy ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy))) : 0;
      return Math.hypot(ax + t * dx, ay + t * dy);
    };
    const inside = (la, lo, ring) => {
      let c = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [yi, xi] = ring[i],
          [yj, xj] = ring[j];
        if ((yi > la) !== (yj > la) && lo < (xj - xi) * (la - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    return smp.some(([la, lo]) => a.rings.some(r => inside(la, lo, r) || r.some((p, i) => i && seg(la, lo, r[i - 1], p) <= nm)));
  }
  /** Espaces à dessiner selon le profil : familles cochées, plancher / plafond, liste blanche ou noire (nom ou clé),
   *  couloir autour de la route (corridorNm). */
  function selectAirspaces(list, profile, route = []) {
    const types = new Set(profile?.zones || []),
      lo = parseFloat(el(profile, 'zoneFloor')),
      hi = parseFloat(el(profile, 'zoneCeil')),
      names = (profile?.zoneList || []).map(x => String(x).toUpperCase().replace(/[^A-Z0-9]/g, '')).filter(Boolean),
      hit = a => names.some(q => [a.name, a.key, a.type + a.name].some(v => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
        .includes(q))),
      lim = A()?.limitFt;
    if (!types.size) return [];
    let out = (list || []).filter(a => family(types, a.type) && (!(lo > 0) || !lim || lim(a.upper, true) > lo) && (!(hi > 0) || !lim ||
      lim(a.lower, false) < hi) && (!names.length || (profile.zoneMode === 'black' ? !hit(a) : hit(a))));
    const nm = +profile?.corridorNm || 0,
      pts = route.filter(p => Number.isFinite(p?.lat));
    if (nm > 0 && pts.length >= 2) {
      const smp = samples(pts);
      out = out.filter(a => nearRoute(a, smp, nm));
    }
    return out;
  }

  // ---------------------------------------------------------------- dessin
  /** Texte gras avec halo blanc, centré verticalement sur y. */
  function halo(ctx, text, x, y, size, color, align = 'left', alpha = 1) {
    ctx.save();
    ctx.font = `700 ${size}px Arial,sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = paper();
    ctx.lineWidth = Math.max(2, size * .28);
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fillText(text, x, y);
    ctx.restore();
  }
  const inBox = (b, lat, lon) => lat >= b.s && lat <= b.n && lon >= b.w && lon <= b.e;
  /** Fond uni (pas de tuiles) : mer, puis terres d'après les contours de pays [lon, lat]. */
  function drawBackground(ctx, toC, W, H, rings, {
    sea = '#dfe9f2',
    land = '#f7f5ef',
    border = '#b9b3a6'
  } = {}) {
    ctx.save();
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = land;
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    for (const r of rings || []) {
      ctx.beginPath();
      r.forEach(([lon, lat], i) => {
        const q = toC(lat, lon);
        i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Espaces : formes (part 'shapes') ou libellés (part 'labels'). Les libellés sont posés un espace à la fois, dans
   *  l'ordre du studio (plus grande emprise d'abord), pour relever le cadre de chacun : rend [{ x0, y0, x1, y1, a }]
   *  (infobulle au survol du libellé). */
  function drawZones(ctx, zones, toC, W, H, scale, pl, profile, part) {
    const showLabels = on(profile, 'zoneLabelsShow');
    if (part === 'labels' && !showLabels) return [];
    const opts = {
      W,
      H,
      scale,
      font: +el(profile, 'zoneFont') * PT * scale,
      limits: on(profile, 'zoneLimitsShow'),
      alpha: (+el(profile, 'zoneOpacity') || 50) / 100,
      abbrev: on(profile, 'zoneAbbrev'),
      smallCross: on(profile, 'zoneSmallCross'),
      placer: pl,
      shapes: part !== 'labels',
      labels: part !== 'shapes' && showLabels
    };
    if (part !== 'labels') {
      A().drawAirspaces(ctx, zones, toC, opts);
      return [];
    }
    const area = a => {
        let x0 = Infinity,
          y0 = Infinity,
          x1 = -Infinity,
          y1 = -Infinity;
        for (const r of a.rings || [])
          for (const [lat, lon] of r) {
            const q = toC(lat, lon);
            if (q.x < x0) x0 = q.x;
            if (q.x > x1) x1 = q.x;
            if (q.y < y0) y0 = q.y;
            if (q.y > y1) y1 = q.y;
          }
        return x1 > x0 ? (x1 - x0) * (y1 - y0) : 0;
      },
      hits = [];
    let cur = null;
    // placeur partagé, vu au travers : chaque cadre réservé pendant le libellé d'un espace lui est attribué
    const seen = pl ? new Proxy(pl, {
      get(o, p) {
        if (p === 'take') return r => {
          const ok = o.take(r);
          if (ok && cur) hits.push({
            x0: r.x0,
            y0: r.y0,
            x1: r.x1,
            y1: r.y1,
            a: cur
          });
          return ok;
        };
        const v = o[p];
        return typeof v === 'function' ? v.bind(o) : v;
      }
    }) : pl;
    for (const {
        a
      }
      of zones.map(a => ({
        a,
        k: area(a)
      })).sort((x, y) => y.k - x.k)) {
      cur = a;
      A().drawAirspaces(ctx, [a], toC, {
        ...opts,
        placer: seen
      });
    }
    return hits;
  }

  function drawPoints(ctx, data, toC, W, H, scale, b, pl, profile) {
    const ad = on(profile, 'aerodromes'),
      nv = on(profile, 'navaids'),
      ob = on(profile, 'obstacles');
    if (!(ad || nv || ob)) return;
    const c = {
        lat: (b.n + b.s) / 2,
        lon: (b.e + b.w) / 2
      },
      ctl = el(profile, 'adControl') || 'all',
      adOk = a => (a.type === 'HP' ? on(profile, 'adHeli') : a.type === 'LS' || (!a.hardLen && !a.water) ? on(profile, 'adStrip') : a
        .state ? on(profile, 'adState') : a.public ? on(profile, 'adPublic') : on(profile, 'adRestricted')) && (ctl === 'all' || (ctl ===
        'ctl') === !!a.controlled),
      navOk = n => n.kind === 'ILS' ? on(profile, 'navIls') : n.kind === 'NDB' ? on(profile, 'navNdb') : n.kind === 'DME' ? on(profile,
        'navDme') : n.kind === 'TACAN' || n.tacan ? on(profile, 'navTacan') : on(profile, 'navVor');
    A().drawPoints(ctx, {
      aerodromes: ad ? (data.aerodromes || []).filter(adOk) : [],
      navaids: nv ? (data.navaids || []).filter(navOk) : [],
      obstacles: ob ? data.obstacles || [] : []
    }, toC, {
      W,
      H,
      scale,
      font: +el(profile, 'pointFont') * PT * scale,
      aerodromes: ad,
      navaids: nv,
      obstacles: ob,
      obstacleMin: +el(profile, 'obstacleMin') || 300,
      pxPerDegree: toC(c.lat, c.lon + 1).x - toC(c.lat, c.lon).x,
      placer: pl,
      rose: +el(profile, 'roseSize'),
      adLabels: on(profile, 'adLabels'),
      navLabels: on(profile, 'navLabels')
    });
  }

  /** Route vraie (°) de a vers b. */
  const trackOf = (a, b) => {
    const p1 = rad(a.lat),
      p2 = rad(b.lat),
      dl = rad(b.lon - a.lon),
      y = Math.sin(dl) * Math.cos(p2),
      x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  };
  const deg3 = d => `${String(Math.round(d) % 360).padStart(3, '0')}°`;
  /** Voies aériennes : basses (trait bleu) et hautes (tireté violet), selon le profil ; étiquettes comme les cartes en
   *  route : nom de la voie dans un cartouche couché le long du tronçon, niveau minimal dessous (F195) ; de près, la
   *  distance du tronçon (NM) et les routes vraies à chaque bout. Rend les bouts des tronçons dessinés (leurs points). */
  function drawAirways(ctx, airways, toC, scale, b, pl, profile, tier = 'near') {
    const lo = on(profile, 'airwaysLow'),
      hi = on(profile, 'airwaysHigh'),
      ends = new Map();
    ends.later = []; // étiquettes à poser après les points des voies
    ends.hits = []; // cartouches posés (centre, rayon, tronçon) : infobulle des voies
    if (!(lo || hi) || !airways?.length) return ends;
    const lab = el(profile, 'airwayLabels') !== false,
      t = {
        s: b.s - .3,
        n: b.n + .3,
        w: b.w - .5,
        e: b.e + .5
      },
      seen = new Set(),
      f = 8.5 * PT * scale * .8;
    ctx.save();
    ctx.lineCap = 'round';
    for (const g of airways) {
      const high = (+g.lower || 0) >= 19500 || /^U/.test(g.route);
      if (high ? !hi : !lo) continue;
      if (!inBox(t, g.a.lat, g.a.lon) && !inBox(t, g.b.lat, g.b.lon)) continue;
      const P = toC(g.a.lat, g.a.lon),
        Q = toC(g.b.lat, g.b.lon),
        col = high ? '#6a3fa0' : '#1f6fb2',
        len = Math.hypot(Q.x - P.x, Q.y - P.y);
      ctx.strokeStyle = col;
      ctx.globalAlpha = .75;
      ctx.lineWidth = (high ? 1 : 1.2) * scale;
      ctx.setLineDash(high ? [6 * scale, 4 * scale] : []);
      ctx.beginPath();
      ctx.moveTo(P.x, P.y);
      ctx.lineTo(Q.x, Q.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      for (const e of [g.a, g.b])
        if (e?.id) ends.set(`${e.id}|${e.lat.toFixed(3)}|${e.lon.toFixed(3)}`, e);
      if (!lab || len < 60 * scale) continue;
      // cartouche couché le long du tronçon (texte toujours lisible de gauche à droite)
      const x = (P.x + Q.x) / 2,
        y = (P.y + Q.y) / 2,
        k = `${g.route}|${Math.round(x / 90)}|${Math.round(y / 90)}`;
      if (seen.has(k)) continue;
      let ang = Math.atan2(Q.y - P.y, Q.x - P.x);
      if (ang > Math.PI / 2) ang -= Math.PI;
      if (ang < -Math.PI / 2) ang += Math.PI;
      const lvl = +g.lower >= 1000 ? `F${String(Math.round(+g.lower / 100)).padStart(3, '0')}` : '',
        w = g.route.length * f * .62 + 6 * scale,
        r = Math.max(w, f * 3) / 2 + 2;
      if (pl && !pl.take({
          x0: x - r,
          y0: y - r,
          x1: x + r,
          y1: y + r
        })) continue;
      seen.add(k);
      ends.hits.push({
        x,
        y,
        r,
        g
      });
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.fillStyle = col;
      ctx.fillRect(-w / 2, -f * .7, w, f * 1.4);
      ctx.font = `700 ${f}px Arial,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = paper();
      ctx.fillText(g.route, 0, 0);
      if (lvl && tier !== 'far') {
        ctx.font = `700 ${f * .85}px Arial,sans-serif`;
        ctx.fillStyle = '#c62828';
        ctx.fillText(lvl, 0, f * 1.35);
      }
      if (tier === 'near' && Number.isFinite(+g.nm)) {
        ctx.font = `700 ${f * .85}px Arial,sans-serif`;
        ctx.fillStyle = col;
        ctx.fillText(String(Math.round(+g.nm)), 0, -f * 1.3);
      }
      ctx.restore();
      if (tier === 'near' && len > 140 * scale) {
        // routes vraies près de chaque bout (comme « 097° » sur les cartes)
        for (const [A, B, from] of [
            [P, Q, g.a],
            [Q, P, g.b]
          ]) {
          const d = Math.hypot(B.x - A.x, B.y - A.y),
            u = 26 * scale / d,
            px = A.x + (B.x - A.x) * u,
            py = A.y + (B.y - A.y) * u,
            to = from === g.a ? g.b : g.a,
            tw = 4 * f * .8 * .62;
          // posées après les points des voies (leurs noms passent d'abord)
          ends.later.push(() => {
            if (!pl || pl.take({
                x0: px - tw / 2,
                y0: py - 7 * scale - f * .5,
                x1: px + tw / 2,
                y1: py - 7 * scale + f * .5
              })) halo(ctx, deg3(trackOf(from, to)), px, py - 7 * scale, f * .8, col, 'center');
          });
        }
      }
    }
    ctx.restore();
    return ends;
  }
  /** Points des voies dessinées qui ne sont pas des balises (fixes, intersections) : triangle et nom. */
  /** Trait fléché de a vers b (points du canevas). */
  function arrowLine(ctx, a, b, scale) {
    const ang = Math.atan2(b.y - a.y, b.x - a.x),
      h = 7 * scale;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - h * Math.cos(ang - .4), b.y - h * Math.sin(ang - .4));
    ctx.lineTo(b.x - h * Math.cos(ang + .4), b.y - h * Math.sin(ang + .4));
    ctx.closePath();
    ctx.fill();
  }
  /** Axes de ravitaillement en vol (aerodb.aarTracks) : hippodrome vert sombre légèrement teinté, branche aller fléchée
   *  IP → CP et nom de l'axe ; axes lourds : leurs deux branches fléchées. */
  function drawAar(ctx, tracks, toC, scale, b, pl) {
    if (!tracks?.length) return;
    const col = '#00695c',
      t = {
        s: b.s - 1,
        n: b.n + 1,
        w: b.w - 1.5,
        e: b.e + 1.5
      },
      f = 10 * scale;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = ctx.fillStyle = col;
    for (const tr of tracks) {
      const legs = tr.ring ? [
        [tr.ip, tr.cp]
      ] : tr.legs || [];
      if (!legs.length || ![...(tr.ring || []), ...legs.flat()].some(p => inBox(t, p.lat, p.lon))) continue;
      if (tr.ring) {
        ctx.beginPath();
        tr.ring.forEach((p, i) => {
          const q = toC(p.lat, p.lon);
          i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
        });
        ctx.closePath();
        ctx.fillStyle = withAlpha(col, .08);
        ctx.fill();
        ctx.fillStyle = col;
        ctx.lineWidth = 1.4 * scale;
        ctx.setLineDash([5 * scale, 3 * scale]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.lineWidth = 2 * scale;
      for (const [a, c] of legs) arrowLine(ctx, toC(a.lat, a.lon), toC(c.lat, c.lon), scale);
      const [a, c] = legs[0],
        m = toC((a.lat + c.lat) / 2, (a.lon + c.lon) / 2),
        w = tr.name.length * f * .62;
      if (!pl || pl.take({
          x0: m.x + 4 * scale,
          y0: m.y - f * .7,
          x1: m.x + 6 * scale + w,
          y1: m.y + f * .7
        })) halo(ctx, tr.name, m.x + 5 * scale, m.y, f, col, 'left');
    }
    ctx.restore();
  }
  /** Tracks NAT du jour (aerodb.natTracks) : tireté ardoise par les points de la track, « NAT A FL350–400 » au premier
   *  point. */
  function drawNat(ctx, tracks, toC, scale, b, pl) {
    if (!tracks?.length) return;
    const col = '#37474f',
      f = 10 * scale;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = ctx.fillStyle = col;
    ctx.lineWidth = 1.6 * scale;
    for (const tr of tracks) {
      const pts = (tr.points || []).filter(p => Number.isFinite(p?.lat) && Number.isFinite(p?.lon));
      if (pts.length < 2) continue;
      ctx.setLineDash([8 * scale, 4 * scale]);
      ctx.beginPath();
      pts.forEach((p, i) => {
        const q = toC(p.lat, p.lon);
        i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      const lv = [...(tr.west || []), ...(tr.east || [])].map(Number).filter(Number.isFinite),
        text = `NAT ${tr.id}${lv.length ? ` FL${Math.min(...lv)}–${Math.max(...lv)}` : ''}`,
        q = toC(pts[0].lat, pts[0].lon),
        w = text.length * f * .62;
      if (!pl || pl.take({
          x0: q.x + 4 * scale,
          y0: q.y - f * 1.6,
          x1: q.x + 6 * scale + w,
          y1: q.y - f * .2
        })) halo(ctx, text, q.x + 5 * scale, q.y - f * .9, f, col, 'left');
    }
    ctx.restore();
  }

  function drawFixes(ctx, fixes, toC, W, H, scale, pl) {
    const f = 8 * PT * scale * .85,
      rr = 4 * scale,
      col = (T ||= tokens()).fg;
    ctx.save();
    for (const v of fixes) {
      const p = toC(v.lat, v.lon);
      if (p.x < -10 || p.y < -10 || p.x > W + 10 || p.y > H + 10) continue;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - rr);
      ctx.lineTo(p.x + rr * .87, p.y + rr * .5);
      ctx.lineTo(p.x - rr * .87, p.y + rr * .5);
      ctx.closePath();
      ctx.fillStyle = paper();
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.3 * scale;
      ctx.stroke();
      const w = v.id.length * f * .62;
      if (!pl || pl.take({
          x0: p.x - w / 2,
          y0: p.y + rr + 1,
          x1: p.x + w / 2,
          y1: p.y + rr + 1 + f * 1.2
        })) halo(ctx, v.id, p.x, p.y + rr + 2 + f * .6, f, col, 'center');
    }
    ctx.restore();
  }
  /** Points de report VFR (losange vert) et points RNAV en route (triangle bleu), identifiant à côté. */
  function drawVrp(ctx, data, toC, W, H, scale, b, pl, profile) {
    const vrp = on(profile, 'vrpPoints') && data.vrp?.length,
      rnav = on(profile, 'rnavPoints') && data.points?.length;
    if (!vrp && !rnav) return;
    const lab = el(profile, 'vrpLabels') !== false,
      t = {
        s: b.s - .2,
        n: b.n + .2,
        w: b.w - .3,
        e: b.e + .3
      },
      f = 8 * PT * scale * .85,
      mark = (v, col, r, shape) => {
        if (!inBox(t, v.lat, v.lon)) return;
        const p = toC(v.lat, v.lon);
        if (p.x < -20 || p.y < -20 || p.x > W + 20 || p.y > H + 20) return;
        ctx.beginPath();
        if (shape === 'tri') {
          ctx.moveTo(p.x, p.y - r);
          ctx.lineTo(p.x + r * .87, p.y + r * .5);
          ctx.lineTo(p.x - r * .87, p.y + r * .5);
        } else {
          ctx.moveTo(p.x, p.y - r);
          ctx.lineTo(p.x + r, p.y);
          ctx.lineTo(p.x, p.y + r);
          ctx.lineTo(p.x - r, p.y);
        }
        ctx.closePath();
        ctx.fillStyle = paper();
        ctx.fill();
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.5 * scale;
        ctx.stroke();
        if (lab && v.id) {
          const w = v.id.length * f * .62;
          if (!pl || pl.take({
              x0: p.x + r + 2,
              y0: p.y - f * .7,
              x1: p.x + r + 4 + w,
              y1: p.y + f * .7
            })) halo(ctx, v.id, p.x + r + 3, p.y, f, col, 'left');
        }
      };
    ctx.save();
    if (rnav)
      for (const v of data.points)
        if (v.type === 'ICAO') mark(v, '#1f5fa8', 4 * scale, 'tri');
    if (vrp)
      for (const v of data.vrp) mark(v, '#0b7a3b', 4.5 * scale, 'diamond');
    ctx.restore();
  }
  /** Villes à dessiner (les plus peuplées d'abord, sans recouvrement) : libellés au-dessus de cityLabelMin si le profil
   *  montre les villes, symboles OACI au-dessus de population si « agglomérations ». */
  function cityList(cities, profile, toC, b, scale, pl) {
    const labels = !!profile?.cities,
      agg = on(profile, 'agglos');
    if (!(labels || agg) || !cities?.length) return [];
    const labMin = labels ? (+el(profile, 'cityLabelMin') || 0) : Infinity,
      min = Math.min(agg ? (+profile.population || 0) : Infinity, labMin),
      font = +el(profile, 'cityFont') * PT * scale,
      out = [];
    for (const c of [...cities].sort((x, y) => (y.population || 0) - (x.population || 0))) {
      if ((c.population || 0) < min) break;
      if (!inBox(b, c.lat, c.lon)) continue;
      const label = (c.population || 0) >= labMin,
        q = toC(c.lat, c.lon),
        g = agg ? A().cityGlyph(c.population, scale).r : 3 * scale,
        r = label ? {
          x0: q.x - g,
          y0: q.y - font * 1.2,
          x1: q.x + g + 5 * scale + String(c.name).length * font * .62,
          y1: q.y + Math.max(g, font * .5)
        } : {
          x0: q.x - g - 1,
          y0: q.y - g - 1,
          x1: q.x + g + 1,
          y1: q.y + g + 1
        };
      if (!pl || pl.take(r)) out.push({
        c,
        q,
        label
      });
    }
    return out;
  }

  function drawCities(ctx, list, profile, scale, W, H) {
    const font = +el(profile, 'cityFont') * PT * scale,
      color = el(profile, 'cityColor'),
      agg = on(profile, 'agglos');
    for (const {
        c,
        q,
        label
      }
      of list) {
      if (q.x < 0 || q.y < 0 || q.x > W || q.y > H) continue;
      let r = 2.5 * scale;
      if (agg) r = A().drawCity(ctx, c.population, q, scale);
      else {
        ctx.beginPath();
        ctx.arc(q.x, q.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
      if (label) halo(ctx, c.name, q.x + r + 3 * scale, q.y - r - 3 * scale, font, color);
    }
  }
  const ZONE_STYLE = {
    search: ['#d0106a', 'rgba(208,16,106,.10)'],
    exclusion: ['#c62828', 'rgba(198,40,40,.09)'],
    mission: ['#6a1b9a', 'rgba(106,27,154,.08)']
  };
  /** Zones de la mission : fond, hachures à 45°, liseré blanc et tireté de la couleur de la zone, nom au-dessus. */
  function drawMissionZones(ctx, zones, toC, scale, pl, profile) {
    if (!zones?.length || !on(profile, 'missionZones')) return;
    const f = 10 * scale;
    ctx.save();
    for (const z of zones) {
      const [stroke, fill] = ZONE_STYLE[z.kind] || ZONE_STYLE.mission,
        path = new Path2D();
      let top;
      if (z.points?.length) {
        const q = z.points.map(p => toC(p.lat, p.lon));
        q.forEach((p, i) => i ? path.lineTo(p.x, p.y) : path.moveTo(p.x, p.y));
        path.closePath();
        top = {
          x: q.reduce((a, p) => a + p.x, 0) / q.length,
          y: Math.min(...q.map(p => p.y))
        };
      } else {
        const c = toC(z.lat, z.lon),
          e = toC(z.lat, z.lon + z.radiusKm / (111.32 * Math.cos(rad(z.lat)))),
          n = toC(z.lat + z.radiusKm / 111.32, z.lon);
        path.ellipse(c.x, c.y, Math.abs(e.x - c.x), Math.abs(n.y - c.y), 0, 0, Math.PI * 2);
        top = {
          x: c.x,
          y: n.y
        };
      }
      ctx.fillStyle = fill;
      ctx.fill(path);
      ctx.save();
      ctx.clip(path);
      ctx.strokeStyle = stroke;
      ctx.globalAlpha = .3;
      ctx.lineWidth = Math.max(.8, 1.2 * scale);
      const cv = ctx.canvas,
        step = 9 * scale,
        hatch = new Path2D();
      for (let x = -cv.height; x < cv.width; x += step) {
        hatch.moveTo(x, 0);
        hatch.lineTo(x + cv.height, cv.height);
      }
      ctx.stroke(hatch);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = Math.max(3, 5 * scale);
      ctx.stroke(path);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(1.6, 2.6 * scale);
      ctx.setLineDash([9 * scale, 5 * scale]);
      ctx.stroke(path);
      ctx.setLineDash([]);
      const text = z.name || z.id,
        w = String(text).length * f * .6;
      if (!pl || pl.take({
          x0: top.x - w / 2,
          y0: top.y - f * 1.6,
          x1: top.x + w / 2,
          y1: top.y - f * .2
        })) halo(ctx, text, top.x, top.y - f * .8, f, stroke, 'center');
    }
    ctx.restore();
  }
  /** Points de la mission (départ, points tournants, cible, rendez-vous…) : rond plein et nom (libellés réservés). */
  function drawMissionPoints(ctx, points, toC, W, H, scale, profile) {
    if (!points?.length || !on(profile, 'turningPoints')) return;
    const radius = (+el(profile, 'pointMarker') || 8) * scale / 2,
      font = (+el(profile, 'pointFont') || 11) * PT * scale,
      gap = 3 * scale,
      color = el(profile, 'pointColor'),
      fill = el(profile, 'pointFill');
    for (const point of points) {
      const p = toC(point.lat, point.lon);
      if (p.x < 0 || p.y < 0 || p.x > W || p.y > H) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, 2 * scale);
      ctx.stroke();
      halo(ctx, point.name || point.id, p.x + radius + gap, p.y - radius - gap, font, color);
    }
  }
  /** Libellés des points de la mission réservés dans le placeur (les cartouches des espaces et des balises les évitent). */
  function reservePoints(pl, points, toC, scale, profile) {
    if (!pl || !points?.length || !on(profile, 'turningPoints')) return;
    const pf = (+el(profile, 'pointFont') || 11) * PT * scale,
      ms = (+el(profile, 'pointMarker') || 8) * scale;
    for (const p of points) {
      const q = toC(p.lat, p.lon);
      pl.add({
        x0: q.x - ms / 2,
        y0: q.y - ms - pf * 1.4,
        x1: q.x + ms + 6 + String(p.name || p.id).length * pf * .62,
        y1: q.y + ms / 2
      });
    }
  }
  const gridStep = span => [1, 2, 5, 10, 15, 20, 30, 60, 120, 300].map(m => m / 60).find(v => v >= span / 5) || 5;

  function gridValues(a, b, step) {
    const out = [];
    for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(6));
    return out;
  }

  function geoLabel(value, lat = false) {
    const hemi = lat ? (value < 0 ? 'S' : 'N') : (value < 0 ? 'W' : 'E'),
      a = Math.abs(value);
    let d = Math.floor(a + 1e-9),
      m = Math.round((a - d) * 60);
    if (m === 60) {
      d++;
      m = 0;
    }
    return `${lat ? d : String(d).padStart(3, '0')}°${String(m).padStart(2, '0')}′${hemi}`;
  }
  const moraFt = c => c.moraFt ?? +String(c.mora).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(d)) * 100;
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  /** Notation MORA « 3⁵ » (milliers, centaines en exposant) d'une hauteur en ft. */
  const moraLabel = ft => {
    const h = Math.ceil(ft / 100);
    return `${Math.floor(h / 10)}${SUP[h % 10]}`;
  };

  function drawGridMora(ctx, cells, toC, b, W, H, scale, pl, profile) {
    const gridColor = el(profile, 'graticuleColor'),
      span = Math.min(b.n - b.s, b.e - b.w),
      gs = on(profile, 'graticule') ? gridStep(span) : 0;
    if (gs) {
      ctx.save();
      ctx.strokeStyle = gridColor;
      ctx.globalAlpha = .3;
      ctx.lineWidth = Math.max(.75, .75 * scale);
      const font = +el(profile, 'graticuleFont') * PT * scale,
        labels = on(profile, 'graticuleLabels'),
        // libellé du canevas écrit seulement là où il ne recouvre rien (noms d'espaces, de la route…)
        gridLabel = (text, x, y, align) => {
          const w = text.length * font * .6,
            x0 = align === 'center' ? x - w / 2 : x;
          if (!pl || pl.take({
              x0,
              y0: y - font * .6,
              x1: x0 + w,
              y1: y + font * .6
            })) halo(ctx, text, x, y, font, gridColor, align);
        };
      for (const lon of gridValues(b.w, b.e, gs)) {
        const p = toC(b.n, lon),
          q = toC(b.s, lon);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
        if (labels) gridLabel(geoLabel(lon), p.x, 8 * scale + font / 2, 'center');
      }
      for (const lat of gridValues(b.s, b.n, gs)) {
        const p = toC(lat, b.w),
          q = toC(lat, b.e);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
        if (labels) gridLabel(geoLabel(lat, true), 4 * scale, p.y, 'left');
      }
      ctx.restore();
    }
    if (!on(profile, 'mora') || !cells?.length) return;
    const font = +el(profile, 'moraFont') * PT * scale,
      color = el(profile, 'moraColor'),
      alpha = (+el(profile, 'moraOpacity') || 90) / 100,
      c = {
        lat: (b.n + b.s) / 2,
        lon: (b.e + b.w) / 2
      },
      px = toC(c.lat, c.lon + 1).x - toC(c.lat, c.lon).x,
      minPx = (+el(profile, 'moraSpacing') || 70) * scale;
    // cases regroupées (2, 4… degrés) quand un degré fait moins de minPx : la plus haute MORA du groupe
    let f = 1;
    while (f < 16 && px * f < minPx) f *= 2;
    if (gs >= 1) f = Math.max(f, Math.round(gs));
    const g = new Map();
    for (const m of cells) {
      const la = Math.floor(m.lat / f) * f,
        lo = Math.floor(m.lon / f) * f,
        k = `${la}|${lo}`,
        ft = moraFt(m),
        cur = g.get(k);
      if (!cur || ft > cur.ft) g.set(k, {
        lat: la + f / 2,
        lon: lo + f / 2,
        ft,
        text: f === 1 ? m.mora : moraLabel(ft)
      });
    }
    const hw = font * .9,
      hh = font * .6,
      d = font * 1.4;
    for (const m of g.values()) {
      const q = toC(m.lat, m.lon);
      if (!(q.x > -50 && q.y > -50 && q.x < W + 50 && q.y < H + 50)) continue;
      let at = q;
      if (pl) {
        at = [
          [0, 0],
          [0, -d],
          [0, d],
          [-d * 1.3, 0],
          [d * 1.3, 0],
          [-d, -d],
          [d, -d],
          [-d, d],
          [d, d]
        ].map(([dx, dy]) => ({
          x: q.x + dx,
          y: q.y + dy
        })).find(p => pl.free({
          x0: p.x - hw,
          y0: p.y - hh,
          x1: p.x + hw,
          y1: p.y + hh
        })) || q;
        pl.add({
          x0: at.x - hw,
          y0: at.y - hh,
          x1: at.x + hw,
          y1: at.y + hh
        });
      }
      halo(ctx, String(m.text), at.x, at.y, font, color, 'center', Math.max(alpha, .95));
    }
  }
  /** Libellés de la route (points : identifiant et niveau ; marques NM) réservés dans le placeur avant tout le reste :
   *  [{ text, x, y, size, align }] ; les extrémités sont toujours écrites. */
  function routeLabels(route, toC, scale, pl, mk = [], level = null) {
    const pts = (route || []).filter(p => Number.isFinite(p?.lat) && Number.isFinite(p?.lon)),
      f0 = 12 * scale,
      out = [];
    if (pts.length < 2) return out;
    for (const [i, p] of pts.entries()) {
      const q = toC(p.lat, p.lon),
        end = i === 0 || i === pts.length - 1,
        // altitude à atteindre au point (alt), sinon niveau tenu à partir du point (lvl ; pas au départ, déjà en tête)
        h = Number.isFinite(p.alt) ? p.alt : i > 0 && !end && +p.lvl?.ft > 0 ? +p.lvl.ft : NaN,
        // niveau écrit comme dans toute la suite (formatLevel de frame/lib/route_text.js, donné par l'écran)
        alt = Number.isFinite(h) ? level ? level(h) : h >= 10000 ? `FL${Math.round(h / 100)}` : `${h} ft` : '',
        text = [p.id || p.name || '', alt].filter(Boolean).join(' · ');
      if (!text) continue;
      const f = end ? 13 * scale : f0,
        r = {
          x0: q.x + 7 * scale,
          y0: q.y + 2 * scale,
          x1: q.x + 9 * scale + text.length * f * .6,
          y1: q.y + 4 * scale + f * 1.2
        };
      if ((pl ? pl.take(r) : true) || end) out.push({
        text,
        x: r.x0,
        y: q.y + 3 * scale + f * .6,
        size: f,
        align: 'left'
      });
    }
    const f = f0;
    for (const m of mk) {
      const q = toC(m.lat, m.lon),
        text = String(m.nm),
        w = text.length * f * .55,
        r = {
          x0: q.x - w / 2 - 1,
          y0: q.y - 4 * scale - f * 1.1,
          x1: q.x + w / 2 + 1,
          y1: q.y - 4 * scale
        };
      if (!pl || pl.take(r)) out.push({
        text,
        x: q.x,
        y: q.y - 4 * scale - f * .55,
        size: f * .85,
        align: 'center'
      });
    }
    return out;
  }
  /** Route : trait violet, points, marques de distance (NM), libellés réservés (routeLabels). */
  function drawRoute(ctx, route, toC, scale, labels = [], {
    marks: mk = [],
    color = '#8e24aa'
  } = {}) {
    const pts = (route || []).filter(p => Number.isFinite(p?.lat) && Number.isFinite(p?.lon));
    if (pts.length < 2) return;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const line = () => {
      ctx.beginPath();
      pts.forEach((p, i) => {
        const q = toC(p.lat, p.lon);
        i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
      });
      ctx.stroke();
    };
    // liseré du fond (détache la route des voies et des limites qu'elle croise), puis le trait : le plus épais de la carte
    ctx.strokeStyle = paper();
    ctx.lineWidth = Math.max(5, 7.5 * scale);
    line();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2.5, 4 * scale);
    line();
    // marques NM : point plein sur la route
    ctx.lineWidth = Math.max(1, 1.5 * scale);
    for (const m of mk) {
      const q = toC(m.lat, m.lon);
      ctx.beginPath();
      ctx.arc(q.x, q.y, 3 * scale, 0, Math.PI * 2);
      ctx.fillStyle = color; // plein, de la couleur de la route : un point du fond la ferait paraître tiretée
      ctx.fill();
    }
    for (const [i, p] of pts.entries()) {
      const q = toC(p.lat, p.lon),
        end = i === 0 || i === pts.length - 1;
      ctx.beginPath();
      ctx.arc(q.x, q.y, (end ? 6 : 4.5) * scale, 0, Math.PI * 2);
      ctx.fillStyle = paper();
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, (end ? 2.5 : 2) * scale);
      ctx.stroke();
    }
    for (const l of labels) halo(ctx, l.text, l.x, l.y, l.size, color, l.align);
    ctx.restore();
  }
  /** Densité selon le zoom (px par degré) : loin (moins de 80) — grands terrains, voies et leurs noms ; moyen (moins de
   *  300) — tous les terrains et balises du profil, points des voies, niveaux minimaux ; près — tout, dont la distance
   *  et la route de chaque tronçon, les VRP et les obstacles du profil. */
  const tierOf = px => px < 80 ? 'far' : px < 300 ? 'mid' : 'near';

  function densify(data, tier, profile) {
    if (tier === 'near') return data;
    // VFR (élément vfrDensity) : points de report à tous les zooms ; obstacles de près seulement (près de 2 000 sur une
    // vue moyenne de 200 NM : illisible)
    const vfr = on(profile, 'vfrDensity'),
      big = a => (+a.hardLen || 0) >= 1800 || (a.controlled && (+a.hardLen || 0) >= 1200);
    return {
      ...data,
      aerodromes: tier === 'far' ? (data.aerodromes || []).filter(big) : data.aerodromes,
      navaids: tier === 'far' ? [] : data.navaids,
      vrp: vfr ? data.vrp : [],
      obstacles: []
    };
  }
  /** Notation SIA d'un espace : « TMA AQUITAINE 8 2000|FL145 D » — type, nom, plancher | plafond (ft AMSL sans
   *  unité, ASFC précisé, SFC, FL, UNL), classe ; activation et informations sur une seconde ligne si elles sont
   *  connues. Rend [ligne principale, ligne secondaire]. */
  function siaLimit(v) {
    const t = String(v ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
    if (!t || /^(SFC|GND)$/.test(t)) return 'SFC';
    if (/UNL/.test(t) || /^FL\s*999/.test(t)) return 'UNL';
    let m = /^FL\s*(\d+)/.exec(t);
    if (m) return `FL${m[1].padStart(3, '0')}`;
    m = /^(\d+)\s*(FT|M)?\s*(AMSL|MSL|ASFC|AGL|SFC)?/.exec(t);
    if (m) return m[3] && /ASFC|AGL|SFC/.test(m[3]) ? `${m[1]} ASFC` : m[1];
    return t;
  }
  const sia = a => [
    // limites omises quand l'espace n'en porte aucune (FIR, UTA de la base : rien plutôt que « SFC|SFC »)
    [a.type, a.name].filter(Boolean).join(' ') + (a.lower == null && a.upper == null ? '' : ` ${siaLimit(a.lower)}|${siaLimit(a.upper)}`) +
    (a.cls ? ` ${a.cls}` : ''),
    [a.act, a.info].filter(Boolean).join(' · ')
  ];
  /** Niveau d'une voie (pieds) en notation SIA : FL au-dessus de 5000 ft, UNL au plafond ouvert. */
  const awLimit = ft => {
    const v = +ft;
    if (!Number.isFinite(v) || v <= 0) return 'SFC';
    if (v >= 66000) return 'UNL';
    return v >= 5000 ? `FL${String(Math.round(v / 100)).padStart(3, '0')}` : String(Math.round(v));
  };
  /** Tronçons dont le cartouche est sous (x, y) (pixels du canevas), le plus proche d'abord. */
  const airwaysAt = (hits, x, y) => (hits || []).map(h => ({
    h,
    d: Math.hypot(h.x - x, h.y - y)
  })).filter(o => o.d <= o.h.r + 4).sort((a, b) => a.d - b.d).map(o => o.h.g);
  /** Espaces de la liste qui contiennent le point (lat, lon), du plus bas au plus haut. */
  function airspacesAt(list, lat, lon) {
    const inRing = r => {
      let c = false;
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [yi, xi] = r[i],
          [yj, xj] = r[j];
        if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    const lim = A()?.limitFt;
    return (list || []).filter(a => (a.rings || []).some(inRing)).sort((x, y) => (lim ? lim(x.lower, false) - lim(y.lower, false) : 0));
  }
  /** Surcouche aéronautique complète, dans l'ordre du studio : espaces (formes), route (réservée en premier pour ses
   *  libellés), voies, aérodromes et balises, libellés d'espaces, canevas et MORA. data : { airspaces (déjà choisis),
   *  aerodromes, navaids, obstacles, airways, moraCells } ; bbox : emprise affichée { w, s, e, n }. */
  function draw(ctx, {
    toC,
    W,
    H,
    scale = 1,
    bbox,
    profile,
    data = {},
    route = [],
    marks: mk = [],
    mission = null,
    theme = null,
    level = null
  }) {
    if (!A()) throw new Error('maps: SiaAero missing');
    T = theme || tokens();
    const pl = A().placer(),
      c = {
        lat: (bbox.n + bbox.s) / 2,
        lon: (bbox.e + bbox.w) / 2
      },
      tier = tierOf(toC(c.lat, c.lon + 1).x - toC(c.lat, c.lon).x),
      // carte de mission : tout ce que le profil montre ; vol : densité selon le zoom
      shown = mission ? data : densify(data, tier, profile),
      labels = routeLabels(route, toC, scale, pl, mk, level);
    reservePoints(pl, mission?.points, toC, scale, profile);
    const towns = cityList(data.cities, profile, toC, bbox, scale, pl);
    drawZones(ctx, shown.airspaces || [], toC, W, H, scale, pl, profile, 'shapes');
    const ends = drawAirways(ctx, shown.airways, toC, scale, bbox, pl, profile, mission ? 'near' : tier);
    // points des voies dessinées (sauf de loin) : les balises avec leur symbole (ajoutées aux balises montrées), les
    // autres en triangle
    const fixes = [],
      endNavs = [];
    if (ends.size && (mission || tier !== 'far') && el(profile, 'fixes') !== false) {
      const byId = new Map((data.navaids || []).map(n => [n.id, n]));
      for (const e of ends.values()) {
        const n = byId.get(e.id);
        if (n && Math.abs(n.lat - e.lat) < .05 && Math.abs(n.lon - e.lon) < .05) endNavs.push(n);
        else fixes.push(e);
      }
    }
    // balises montrées : celles du profil (et de la densité), plus celles qui sont des bouts de voies
    const navAll = on(profile, 'navaids'),
      // nom long d'une balise : trop petit (7 px) hors de la vue rapprochée, l'identifiant et la fréquence suffisent
      navShown = [...new Set([...(navAll ? shown.navaids || [] : []), ...endNavs])].map(n => mission || tier === 'near' ? n : {
        ...n,
        name: ''
      });
    drawPoints(ctx, {
      ...shown,
      navaids: navShown
    }, toC, W, H, scale, bbox, pl, navShown.length && !navAll ? {
      ...profile,
      elements: {
        ...profile.elements,
        navaids: true
      }
    } : profile);
    drawFixes(ctx, fixes, toC, W, H, scale, pl);
    // axes de ravitaillement et tracks NAT (mode CAM, cartes de mission qui les demandent)
    if (on(profile, 'aarTracks')) drawAar(ctx, data.aar, toC, scale, bbox, pl);
    if (on(profile, 'natTracks')) drawNat(ctx, data.nat, toC, scale, bbox, pl);
    for (const f of ends.later || []) f();
    drawVrp(ctx, shown, toC, W, H, scale, bbox, pl, profile);
    const zoneLabels = drawZones(ctx, shown.airspaces || [], toC, W, H, scale, pl, profile, 'labels');
    drawGridMora(ctx, shown.moraCells, toC, bbox, W, H, scale, pl, profile);
    drawMissionZones(ctx, mission?.zones, toC, scale, pl, profile);
    drawMissionPoints(ctx, mission?.points, toC, W, H, scale, profile);
    drawCities(ctx, towns, profile, scale, W, H);
    drawRoute(ctx, route, toC, scale, labels, {
      marks: mk
    });
    // cadres posés, pour les infobulles et les libellés ajoutés par l'écran (TOC, TOD) : cartouches des voies, libellés
    // d'espaces, libellés de la route
    return {
      airways: ends.hits || [],
      zoneLabels,
      routeLabels: labels.map(l => ({
        x0: l.align === 'center' ? l.x - l.text.length * l.size * .3 : l.x,
        x1: l.align === 'center' ? l.x + l.text.length * l.size * .3 : l.x + l.text.length * l.size * .6,
        y0: l.y - l.size * .6,
        y1: l.y + l.size * .6
      }))
    };
  }

  window.MapsRender = {
    routeProfile,
    selectAirspaces,
    bboxOf,
    distances,
    marks,
    mercator,
    drawBackground,
    draw,
    sia,
    siaLimit,
    airspacesAt,
    airwaysAt,
    awLimit,
    /** Valeur d'un élément d'un profil d'affichage (défaut du studio si absent). */
    elementOf: el,
    deg3,
    tierOf,
    trackOf,
    tokens,
    themed,
    withAlpha,
    contrast: (a, b) => contrast(rgbOf(a) || [0, 0, 0], rgbOf(b) || [0, 0, 0])
  };
})();
