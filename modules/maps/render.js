(() => {
  'use strict';
  // V3 maps — noyau de rendu sorti du studio cartographique (apps/cpco/map_parser.html, ses draw*Canvas ;
  // modules/maps/READING.md § 1, SPEC.md). Tout entre en paramètre, rien n'est lu dans une page ni dans une globale de
  // données : un profil d'affichage complet (objet), l'emprise affichée, les éléments rendus par aerodb pour cette
  // emprise, la route ; la projection est donnée (toC(lat, lon) → { x, y } : MapLibre map.project, ou la projection
  // de Mercator du fond uni). Symboles OACI et placeur de libellés : window.SiaAero (lib/aero_symbols.js, copie de la V2).
  // Aucun texte d'interface : libellés de données seulement (codes, noms, niveaux).
  // API : window.MapsRender = { routeProfile(levelFt), selectAirspaces(list, profile, route), bboxOf(points, marginNm),
  //   nearLon(lon, ref), wrapLon(lon) (copies of frame/lib/geo.js),
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

  // ---------------------------------------------------------------- longitudes autour de la ligne de changement de date
  // Copie de frame/lib/geo.js (render.js est un script classique, il n'importe rien ; frame/lib/test/geo.html compare les
  // deux) : la route arrive déroulée (une route Sibérie → Alaska va de 177° à 195°), les données d'aerodb sont en
  // [-180, 180[ ; une donnée se compare et se dessine à la copie la plus proche de la vue (nearLon), une longitude
  // envoyée à un service ou comparée à un polygone d'aerodb est enroulée (wrapLon, rendue telle quelle si elle y est déjà).
  const nearLon = (lon, ref) => +lon + 360 * Math.round((ref - lon) / 360),
    wrapLon = lon => lon >= -180 && lon < 180 ? +lon : ((((+lon + 180) % 360) + 360) % 360) - 180;

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
        accent: v('--sog-accent', '#1d6fd8'),
        ok: v('--sog-ok', '#1e7d32'),
        warn: v('--sog-warn', '#9a5b00'),
        err: v('--sog-err', '#b3261e')
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
    // une méthode liée une fois par nom (un bind à chaque appel créait des milliers de fonctions par dessin : travail du ramasse-miettes)
    const bound = new Map();
    return new Proxy(ctx, {
      get(o, p) {
        const v = o[p];
        if (typeof v !== 'function') return v;
        let f = bound.get(p);
        if (!f) bound.set(p, f = v.bind(o));
        return f;
      },
      set(o, p, v) {
        o[p] = p === 'fillStyle' || p === 'strokeStyle' ? map(v) : v;
        return true;
      }
    });
  }

  // ---------------------------------------------------------------- palette de la Carte (§ 10.29 f)
  /** Couleurs cartographiques de la Carte, de jour et de nuit : la route, les voies, les procédures, le profil, la position, les
   *  vents, les zones de mission… Lues par le rendu, l'écran (procs.js, la légende, la position, les barbules) : aucune ailleurs.
   *  Les couleurs « de papier » (fond, encre, gris) restent les jetons du design (tokens, themed). */
  const PALETTE = {
    day: {
      route: '#8e24aa',
      nm: '#8e24aa',
      plan: '#6a1b9a',
      airwayLow: '#1f6fb2',
      airwayHigh: '#6a3fa0',
      airwayLevel: '#c62828',
      aar: '#00695c',
      nat: '#37474f',
      obstacleLabel: '#1565c0',
      vrpHeli: '#2e7d32',
      vfr: '#00897b',
      altn: '#6b7280',
      altnText: '#4b5563',
      terrain: '#b08a5a',
      mora: '#8b2d18',
      sid: '#1b8a3a',
      star: '#d95500',
      app: '#0a86c4',
      // mode « choisir sur la carte » (V3 § 10.23) : huit teintes, reprises en cycle, une par procédure (ligne de la liste, cartouche et
      // tracé la même) ; toutes lisibles sur le fond du jour sans que le dessin ait à les foncer
      procHues: ['#c2185b', '#1565c0', '#d84315', '#00796b', '#827717', '#2e7d32', '#7b1fa2', '#795548'],
      actual: '#c62828',
      wind: '#1a237e',
      missionSearch: ['#d0106a', 'rgba(208,16,106,.10)'],
      missionExclusion: ['#c62828', 'rgba(198,40,40,.09)'],
      missionZone: ['#6a1b9a', 'rgba(106,27,154,.08)']
    }
  };
  PALETTE.night = {
    ...PALETTE.day,
    sid: '#5cd27a',
    star: '#ff9a4d',
    app: '#5cc4f5',
    procHues: ['#f48fb1', '#64b5f6', '#ff8a65', '#4db6ac', '#dce775', '#81c784', '#ce93d8', '#bcaaa4'],
    wind: '#b3c7ff'
  };
  Object.freeze(PALETTE.day);
  Object.freeze(PALETTE.night);
  /** Palette du jour ou de la nuit (dark : les jetons du design le disent). */
  const palette = dark => dark ? PALETTE.night : PALETTE.day;

  // ---------------------------------------------------------------- profil d'affichage
  /** Réglages par défaut d'un élément (ceux du profil « IFR simplifié » du studio). */
  const DEFAULTS = {
    airwaysLow: false,
    airwaysHigh: false,
    awLabels: true,
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
    moraColor: PALETTE.day.mora,
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
  /** Un seul élément pour les noms des voies (§ 10.29 g) : awLabels ; un profil du studio ou d'une compagnie qui porte encore
   *  airwayLabels (l'ancien interrupteur du profil d'affichage) est lu comme awLabels quand celui-ci est absent. */
  const migrated = p => {
    const E = p?.elements;
    if (!E || !('airwayLabels' in E)) return p;
    const {
      airwayLabels,
      ...rest
    } = E;
    return {
      ...p,
      elements: 'awLabels' in rest ? rest : {
        ...rest,
        awLabels: airwayLabels
      }
    };
  };
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

  // ---------------------------------------------------------------- dessin (espaces et voies : render_airspace.js ; route : render_route.js)
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
  /** Le point est dans l'emprise b (qui peut dépasser 180° : vue de la ligne de changement de date) : sa longitude est
   *  prise à la copie la plus proche du milieu de l'emprise. */
  const inBox = (b, lat, lon) => {
    if (!(lat >= b.s && lat <= b.n)) return false;
    const l = lon >= b.w && lon <= b.e ? lon : nearLon(lon, (b.w + b.e) / 2);
    return l >= b.w && l <= b.e;
  };
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
    // copies du monde dans la vue (une vue de la ligne de changement de date : 170° à 205° montre la Sibérie et, à 360° de
    // là, l'Alaska) ; toC est la projection brute (une longitude = un x), les contours sont en [-180, 180[
    const x0 = toC(0, 0).x,
      k = toC(0, 1).x - x0,
      offs = [];
    if (k > 0)
      for (let c = Math.floor((-x0 / k + 180) / 360); c <= Math.floor(((W - x0) / k + 180) / 360) && offs.length < 4; c++) offs.push(c *
        360);
    if (!offs.length) offs.push(0);
    for (const off of offs)
      for (const r of rings || []) {
        ctx.beginPath();
        r.forEach(([lon, lat], i) => {
          const q = toC(lat, lon + off);
          i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    ctx.restore();
  }

  /** Couche « Procédures » : les terrains visibles prennent la couleur de leur niveau de couverture (cov(icao) → 'green' |
   *  'orange' | 'red', ou rien tant que la réponse n'est pas là : symbole d'origine) ; ok / warn / err du design, le fond
   *  clair du symbole étant la même teinte éclaircie vers le fond du dessin. Les terrains hors cadre ne sont pas demandés. */
  function coverPins(ads, toC, W, H, detailed, cov) {
    const t = T || tokens(),
      bg = rgbOf(t.bg) || [255, 255, 255],
      paint = {};
    for (const [lv, k] of [
        ['green', 'ok'],
        ['orange', 'warn'],
        ['red', 'err']
      ]) {
      const m = rgbOf(t[k]) || [128, 128, 128];
      paint[lv] = {
        main: t[k],
        pale: `rgb(${m.map((x, i) => Math.round(x * .25 + bg[i] * .75)).join(',')})`
      };
    }
    return ads.map(a => {
      if (!a.icao || !(detailed || a.public || a.state)) return a;
      const p = toC(a.lat, a.lon);
      if (p.x < -30 || p.y < -30 || p.x > W + 30 || p.y > H + 30) return a;
      const c = paint[cov(a.icao)];
      return c ? {
        ...a,
        cov: c
      } : a;
    });
  }

  function drawPoints(ctx, data, toC, W, H, scale, b, pl, profile, cov) {
    const ad = on(profile, 'aerodromes'),
      nv = on(profile, 'navaids'),
      ob = on(profile, 'obstacles');
    if (!(ad || nv || ob)) return {
      ads: [],
      navs: []
    };
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
    const pxDeg = toC(c.lat, c.lon + 1).x - toC(c.lat, c.lon).x,
      ads = ad ? (data.aerodromes || []).filter(adOk) : [];
    const got = A().drawPoints(ctx, {
      aerodromes: cov ? coverPins(ads, toC, W, H, pxDeg >= 180, cov) : ads,
      navaids: nv ? (data.navaids || []).filter(navOk) : [],
      obstacles: []
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
    if (ob) drawObstacles(ctx, data.obstacles || [], toC, W, H, scale, pl, profile, pxDeg);
    return {
      ads,
      navs: got?.navaids || []
    };
  }
  /** Obstacles : symboles de la copie du studio (regroupés à l'écran, sans leur libellé), puis, de près (vue rapprochée,
   *  300 px par degré et plus), la hauteur à côté du symbole : « 450 AGL (1230) » — hauteur sol en pieds, altitude du
   *  sommet entre parenthèses ; posée seulement là où il y a la place. */
  function drawObstacles(ctx, list, toC, W, H, scale, pl, profile, pxDeg) {
    if (!list.length) return;
    const min = +el(profile, 'obstacleMin') || 300,
      detailed = pxDeg >= 180,
      s = Math.max(4, 6 * scale),
      cell = s * (detailed ? 2.2 : 3.5),
      keep = new Map();
    for (const o of list) {
      if (o.hgt < min || (!detailed && o.hgt < 500)) continue;
      const p = toC(o.lat, o.lon);
      if (p.x < -30 || p.y < -30 || p.x > W + 30 || p.y > H + 30) continue;
      const k = `${Math.floor(p.x / cell)}|${Math.floor(p.y / cell)}`,
        cur = keep.get(k);
      if (!cur || o.elev > cur.o.elev) keep.set(k, {
        o,
        p
      });
    }
    const shown = [...keep.values()];
    A().drawPoints(ctx, {
      obstacles: shown.map(x => x.o)
    }, toC, {
      W,
      H,
      scale,
      font: 0,
      aerodromes: false,
      navaids: false,
      obstacles: true,
      obstacleMin: min,
      pxPerDegree: pxDeg,
      placer: pl
    });
    if (pxDeg < 300) return;
    const f = Math.max(9, +el(profile, 'pointFont') * PT * scale * .85),
      col = palette((T || tokens()).dark).obstacleLabel;
    for (const {
        o,
        p
      }
      of shown) {
      if (!Number.isFinite(+o.hgt)) continue;
      const text = `${Math.round(+o.hgt)} AGL${Number.isFinite(+o.elev) ? ` (${Math.round(+o.elev)})` : ''}`,
        x0 = p.x + s * .9,
        y = p.y - s * .9,
        w = text.length * f * .58;
      if (pl && !pl.take({
          x0,
          y0: y - f * .65,
          x1: x0 + w,
          y1: y + f * .65
        })) continue;
      halo(ctx, text, x0, y, f, col, 'left');
    }
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
  /** VRP d'hélicoptères : « -H- » dans l'identifiant de la base publiée (MN-H-HE). */
  const vrpRotary = id => /-H-/.test(String(id || ''));
  /** Code court d'un point de report : celui que la carte écrit (lisibilité d'abord), jamais le nom long. L'identifiant de
   *  la base porte le préfixe du terrain (« MN-SE » → « SE ») et « H- » pour un hélicoptère (« MN-H-HE » → « HE »). */
  const vrpCode = id => {
    const s = String(id || ''),
      i = s.indexOf('-');
    return (i > 0 ? s.slice(i + 1) : s).replace(/^H-/, '');
  };
  /** Couleur d'un point de report VFR : voilure fixe dans la couleur du texte (--sog-fg), voilure tournante en vert. */
  const vrpColor = id => vrpRotary(id) ? VRP_HELI : (T || tokens()).fg;
  /** Clé d'un code de point de report : sans casse ni espaces (« na », « N A » = « NA »). */
  const vrpNorm = c => String(c || '').toUpperCase().replace(/\s+/g, '');
  /** Un point de report par code et par lieu. Le SIA publie chaque VRP deux fois dans le XML : « QT-N » avec sa description
   *  (« Relais hertzien 2 NM Sud Steenvoorde ») et « N » nu, dont le nom est le code, au même endroit (25 octobre 2026,
   *  « Bug LFQN. Points de report VFR doublonnés »). Deux entrées de même code à 0,5 NM au plus sont le même point, si l'une
   *  des deux au moins est nue (ou si elles ont le même identifiant : deux zones qui se recouvrent) ; deux identifiants
   *  préfixés différents (deux terrains) restent deux points. On garde la description la plus riche (celle qui n'est pas
   *  égale au code), puis l'identifiant préfixé (il porte « -H- » des hélicoptères), puis le premier lu ; sa position est
   *  celle de l'entrée gardée. L'ordre de lecture est conservé. */
  function dedupeVrp(list, tolNm = .5) {
    const kept = [],
      by = new Map(),
      nm = (a, b) => Math.hypot(+a.lat - +b.lat, ((+a.lon - +b.lon + 540) % 360 - 180) * Math.cos(+a.lat * Math.PI / 180)) * 60,
      bare = v => !String(v.id).includes('-'),
      rich = v => !!v.name && vrpNorm(v.name) !== vrpNorm(vrpCode(v.id)),
      rank = v => (rich(v) ? 2 : 0) + (bare(v) ? 0 : 1);
    for (const v of list || []) {
      if (!v) continue;
      const k = vrpNorm(vrpCode(v.id)),
        row = by.get(k) || by.set(k, []).get(k),
        i = row.findIndex(q => nm(q.v, v) <= tolNm && (q.v.id === v.id || bare(q.v) || bare(v)));
      if (i < 0) {
        const q = {
          v,
          at: kept.length
        };
        row.push(q);
        kept.push(v);
      } else if (rank(v) > rank(row[i].v)) {
        row[i].v = v;
        kept[row[i].at] = v;
      }
    }
    return kept;
  }
  const VRP_HELI = PALETTE.day.vrpHeli;

  function drawVrp(ctx, data, toC, W, H, scale, b, pl, profile) {
    const vrp = on(profile, 'vrpPoints') && data.vrp?.length,
      rnav = on(profile, 'rnavPoints') && data.points?.length,
      hits = []; // points de report dessinés, à leur place à l'écran (toucher d'un point de report)
    if (!vrp && !rnav) return hits;
    const lab = el(profile, 'vrpLabels') !== false,
      t = {
        s: b.s - .2,
        n: b.n + .2,
        w: b.w - .3,
        e: b.e + .3
      },
      f = 8 * PT * scale * .85,
      mark = (v, col, r, shape, text = v.id) => {
        if (!inBox(t, v.lat, v.lon)) return false;
        const p = toC(v.lat, v.lon);
        if (p.x < -20 || p.y < -20 || p.x > W + 20 || p.y > H + 20) return false;
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
        if (lab && text) {
          const w = text.length * f * .62;
          if (!pl || pl.take({
              x0: p.x + r + 2,
              y0: p.y - f * .7,
              x1: p.x + r + 4 + w,
              y1: p.y + f * .7
            })) halo(ctx, text, p.x + r + 3, p.y, f, col, 'left');
        }
        return true;
      };
    ctx.save();
    if (rnav)
      for (const v of data.points)
        if (v.type === 'ICAO') mark(v, '#1f5fa8', 4 * scale, 'tri');
    if (vrp)
      for (const v of data.vrp)
        if (mark(v, vrpColor(v.id), 4.5 * scale, 'diamond', vrpCode(v.id))) hits.push({
          v,
          ...toC(v.lat, v.lon)
        });
    ctx.restore();
    return hits;
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
    search: PALETTE.day.missionSearch,
    exclusion: PALETTE.day.missionExclusion,
    mission: PALETTE.day.missionZone
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
    if (!lat) value = wrapLon(value); // 195° → 165° W
    const hemi = lat ? (value < 0 ? 'S' : 'N') : value === -180 ? '' : (value < 0 ? 'W' : 'E'), // 180° : ni est ni ouest
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
  /** Densité selon le zoom (px par degré) : loin (moins de 80) — grands terrains, voies et leurs noms ; moyen (moins de
   *  300) — tous les terrains et balises du profil, points des voies, niveaux minimaux ; près — tout, dont la distance
   *  et la route de chaque tronçon, les VRP et les obstacles du profil. */
  const tierOf = px => px < 80 ? 'far' : px < 300 ? 'mid' : 'near';

  // ---- seuils de zoom (lot 7b) : chaque élément dessiné entre [min, max] de zoom MapLibre (tuiles de 512 px), réglés
  // par mode (profile.elements.zoom, #maps?tune=1) ; sans seuil, toujours
  /** Zoom MapLibre d'une échelle en px par degré, et l'inverse. */
  const zoomOf = px => Math.log2(Math.max(1e-6, px) * 360 / 512),
    pxOfZoom = z => 512 * 2 ** z / 360;
  /** Zoom effectif, celui qu'on compare aux seuils : le zoom (déjà décalé par le curseur de complexité) corrigé par la
   *  taille montrée dans le cadre, la moyenne de sa hauteur et de sa largeur (px CSS). À la taille de référence
   *  (FRAME_REF_PX, un cadre de portable) aucune correction ; un cadre deux fois plus petit compte pour un niveau de
   *  moins (moins d'éléments), deux fois plus grand pour un niveau de plus. Une seule fonction, pour le dessin, les
   *  libellés, la couche des VRP et la densité. */
  const FRAME_REF_PX = 900,
    FRAME_K = 1;
  const effectiveZoom = (zoom, w, h, k = FRAME_K) => {
    const mean = ((+w || 0) + (+h || 0)) / 2;
    return mean > 0 ? zoom + Math.log2(mean / FRAME_REF_PX) * k : zoom;
  };
  /** Curseur de complexité : un cran décale le zoom effectif d'un niveau entier, de −DETAIL_MAX à +DETAIL_MAX crans (±4 : un
   *  téléphone dézoomé sur l'Europe, zoom effectif ≈ 3, tombe sous zéro au cran −4, où plus rien ne passe un seuil). Le
   *  curseur ne fait que cela : ce que montre chaque zoom vient des seuils de la page de réglage (#maps?tune=1). */
  const DETAIL_ZOOM = 1,
    DETAIL_MAX = 4;
  const detailZoom = d => Math.max(-DETAIL_MAX, Math.min(DETAIL_MAX, Math.round(+d) || 0)) * DETAIL_ZOOM;
  /** Clé de seuil de la famille d'un espace. */
  const zoneKey = t => {
    t = String(t || '').toUpperCase();
    if (/^(FIR|UIR|UTA|LTA|OCA|FRA)$/.test(t)) return 'asFir';
    if (/^(TMA|CTA|CTR|R|D|P)$/.test(t)) return `as${t[0]}${t.slice(1).toLowerCase()}`;
    if (/^(TSA|TRA|CBA)$/.test(t)) return 'asTsa';
    return 'asOther';
  };
  /** Vrai si l'élément key est dessiné au zoom z (profile.elements.zoom[key] = [min, max]). */
  const visibleAt = (profile, key, z) => {
    const r = profile?.elements?.zoom?.[key];
    return !Array.isArray(r) || (z >= +r[0] && z <= (r[1] == null ? 99 : +r[1]));
  };
  /** Classe de taille d'une ville : grandes (200 000 hab. et plus), moyennes (30 000), petites. */
  const cityKey = c => (+c.population || 0) >= 2e5 ? 'citiesBig' : (+c.population || 0) >= 3e4 ? 'citiesMid' : 'citiesSmall';
  /** Profil du dessin au zoom z : les éléments hors de leurs seuils sont coupés. */
  function atZoom(profile, z) {
    const v = k => visibleAt(profile, k, z);
    return {
      ...profile,
      elements: {
        ...(profile.elements || {}),
        airwaysLow: on(profile, 'airwaysLow') && v('awLow'),
        airwaysHigh: on(profile, 'airwaysHigh') && v('awHigh'),
        graticule: on(profile, 'graticule') && v('graticule'),
        zoneLabelsShow: on(profile, 'zoneLabelsShow') && v('zoneLabels'),
        aarTracks: on(profile, 'aarTracks') && v('aar'),
        natTracks: on(profile, 'natTracks') && v('nat'),
        fixes: el(profile, 'fixes') !== false && v('fixes'),
        awLabels: el(profile, 'awLabels') !== false && v('awLabels')
      }
    };
  }
  /** Données de la vue gardées par les seuils (familles d'espaces, balises, points de report, obstacles, MORA, villes) ;
   *  de loin (tier far), les grands terrains seulement. */
  function byZoom(data, profile, z, tier) {
    const v = k => visibleAt(profile, k, z),
      big = a => (+a.hardLen || 0) >= 1800 || (a.controlled && (+a.hardLen || 0) >= 1200);
    return {
      ...data,
      airspaces: (data.airspaces || []).filter(a => v(zoneKey(a.type))),
      aerodromes: tier === 'far' ? (data.aerodromes || []).filter(big) : data.aerodromes,
      navaids: v('navaids') ? data.navaids : [],
      vrp: v('vrp') ? data.vrp : [],
      obstacles: v('obstacles') ? data.obstacles : [],
      moraCells: v('mora') ? data.moraCells : [],
      cities: (data.cities || []).filter(c => v(cityKey(c)))
    };
  }
  /** Surcouche aéronautique complète, dans l'ordre du studio : espaces (formes), route (réservée en premier pour ses
   *  libellés), voies, aérodromes et balises, libellés d'espaces, canevas et MORA. data : { airspaces (déjà choisis),
   *  aerodromes, navaids, obstacles, airways, moraCells } ; bbox : emprise affichée { w, s, e, n }. */
  // ---------------------------------------------------------------- aides partagées avec les parties du rendu
  // render_airspace.js (espaces, voies, AAR, NAT) et render_route.js (libellés et tracé de la route), scripts classiques
  // chargés après celui-ci, y lisent ces aides ; leurs dessins sont dans leurs espaces de noms gelés, MapsRender.parts.airspace
  // et MapsRender.parts.route, que draw() appelle avec env = { theme, placer, pal } (§ 10.29 e).
  const K = {
    A,
    PT,
    deg3,
    el,
    gc,
    halo,
    inBox,
    on,
    rad,
    tokens,
    trackOf,
    withAlpha,
    wrapLon,
  };
  // gelé (§ 10.29 e) : les parties y lisent des aides, n'y rangent rien ; leurs dessins sont dans MapsRender.parts
  Object.freeze(K);

  /** Surcouche complète (drawFrame) ; le thème du dessin (T) est remis à null en sortie, même sur une erreur : rien ne reste
   *  d'un dessin à l'autre (§ 10.29 e). */
  function draw(ctx, opts = {}) {
    try {
      return drawFrame(ctx, opts);
    } finally {
      T = null;
    }
  }

  function drawFrame(ctx, {
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
    level = null,
    detail = 0,
    hideVrp = null, // identifiants de VRP que l'écran dessine lui-même (terrain survolé ou épinglé) : pas deux fois
    lines = null, // suites de points que la route trace (null : toute la route), voir drawRoute
    cov = null, // couche « Procédures » : cov(icao) → niveau de couverture ('green' | 'orange' | 'red') ou rien, voir coverPins
    reserve = null, // reserve(placeur) : l'écran réserve ses libellés (procédures choisies) juste après ceux de la route
    // chemin volé (route et procédures, points nommés dans l'ordre) : ses tronçons portent les cartouches des voies qu'ils
    // suivent par-dessus leur trait ; sans lui, la route
    legs = null,
    // overRoute(ctx) : l'écran peint ses tracés au niveau de la route (procédures choisies), avant ces cartouches
    overRoute = null,
    // top(ctx) : ce que l'écran peint en dernier, par-dessus tout (les noms et contraintes des procédures : jamais couverts)
    top = null,
    // adName(rec) : le libellé d'un terrain de près, son code et son nom (« LFPO Paris-Orly », adTitle de frame/lib/adnames.js, la règle
    // de nom du § 10.27 ; le seuil runwayZoom de la compagnie, V3 § 10.30) ; null : le code seul
    adName = null,
    // runways(ctx, pl) : l'écran peint les vecteurs et numéros des pistes juste après les terrains, dans la même passe de collision
    runways = null,
    // dim (0 à 1) : la part dont les couches de la Carte, de la route comprise, sont éteintes avant ce que l'écran peint au niveau de
    // la route (mode « choisir sur la carte », V3 § 10.23) ; 0 : aucune
    dim = 0
  }) {
    if (!A()) throw new Error('maps: SiaAero missing');
    // le thème ne vit que le temps du dessin (§ 10.29 e) : posé ici, remis à null en sortie (draw) ; les parties le reçoivent
    // dans env, gelé, avec le placeur et la palette
    T = theme || tokens();
    const pl = A().placer(),
      env = Object.freeze({
        theme: T,
        placer: pl,
        pal: palette(T.dark)
      }),
      PA = window.MapsRender.parts.airspace,
      PR = window.MapsRender.parts.route,
      c = {
        lat: (bbox.n + bbox.s) / 2,
        lon: (bbox.e + bbox.w) / 2
      },
      // zoom de la vue, décalé d'un niveau par cran du curseur de complexité (detail, de −4 à +4 : plus de détails à
      // droite ; detailZoom), puis corrigé par la taille du cadre (effectiveZoom) ; carte de mission : tout ce que son
      // profil montre (ni curseur ni taille) ; vol : les seuils de zoom de chaque élément se comparent à ce zoom effectif
      zs = zoomOf(toC(c.lat, c.lon + 1).x - toC(c.lat, c.lon).x) + detailZoom(detail),
      zv = mission ? zs : effectiveZoom(zs, W, H),
      tier = tierOf(pxOfZoom(zv));
    profile = migrated(profile); // l'ancien airwayLabels lu comme awLabels (§ 10.29 g)
    if (!mission) profile = atZoom(profile, zv);
    const shown = mission ? data : byZoom(data, profile, zv, tier);
    // les couches de la carte dans l'ordre de dessin de la SPEC § 3 (§ 10.29 d) : chacune { id, reserve(), paint(ctx) } ; toutes
    // les réservations dans le placeur d'abord, dans l'ordre de la liste (libellés de la route, de l'écran, points de mission,
    // villes : les deux premiers n'ont rien à peindre), puis tous les dessins
    let labels = [],
      towns = [],
      ends = new Map(),
      pts = {},
      vrpHits = [],
      zoneLabels = [];
    // une seule passe de collision (le placeur pl), dans l'ordre des priorités (V3 § 10.30) : les libellés de l'écran (procédure
    // surlignée, puis choisies), les tronçons de la route, les cartouches des voies, les terrains, les balises et fixes, le reste
    // (points de report, espaces, villes) ; une étiquette sans place glisse le long de son ancre, sinon elle se cache
    const layers = [{
      id: 'screenLabels', // l'écran réserve ses libellés d'abord (procédure surlignée, puis choisies)
      reserve: () => reserve && reserve(pl)
    }, {
      id: 'routeLabels',
      reserve: () => labels = PR.routeLabels(route, toC, scale, pl, mk, level, env)
    }, {
      id: 'zoneShapes',
      paint: c => PA.drawZones(c, shown.airspaces || [], toC, W, H, scale, pl, profile, 'shapes')
    }, {
      id: 'airways',
      paint: c => ends = PA.drawAirways(c, shown.airways, toC, scale, bbox, pl, profile, mission ? 'near' : tier, PR.routeLegs(legs ||
        route), env)
    }, {
      id: 'points',
      paint: c => {
        // points des voies dessinées (sauf de loin) : les balises avec leur symbole (ajoutées aux balises montrées), les
        // autres en triangle
        const fixes = [],
          endNavs = [];
        if (ends.size && el(profile, 'fixes') !== false) {
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
        pts = drawPoints(c, {
          ...shown,
          aerodromes: adName ? (shown.aerodromes || []).map(a => a.icao ? {
            ...a,
            label: adName(a) || a.icao
          } : a) : shown.aerodromes,
          navaids: navShown
        }, toC, W, H, scale, bbox, pl, navShown.length && !navAll ? {
          ...profile,
          elements: {
            ...profile.elements,
            navaids: true
          }
        } : profile, cov);
        drawFixes(c, fixes, toC, W, H, scale, pl);
        // les pistes des terrains (vecteurs de seuil et numéros), juste après eux : leurs numéros prennent leur place avant les
        // balises, les points de report et le reste
        runways && runways(c, pl);
      }
    }, {
      // axes de ravitaillement et tracks NAT (mode CAM, cartes de mission qui les demandent)
      id: 'aar',
      paint: c => on(profile, 'aarTracks') && PA.drawAar(c, data.aar, toC, scale, bbox, pl, env)
    }, {
      id: 'nat',
      paint: c => on(profile, 'natTracks') && PA.drawNat(c, data.nat, toC, scale, bbox, pl, env)
    }, {
      id: 'airwayNames', // étiquettes des voies posées après leurs points
      paint: () => {
        for (const f of ends.later || []) f();
      }
    }, {
      id: 'vrp',
      paint: c => vrpHits = drawVrp(c, hideVrp?.size ? {
        ...shown,
        vrp: (shown.vrp || []).filter(v => !hideVrp.has(v.id))
      } : shown, toC, W, H, scale, bbox, pl, profile)
    }, {
      id: 'zoneLabels',
      paint: c => zoneLabels = PA.drawZones(c, shown.airspaces || [], toC, W, H, scale, pl, profile, 'labels')
    }, {
      id: 'gridMora',
      paint: c => drawGridMora(c, shown.moraCells, toC, bbox, W, H, scale, pl, profile)
    }, {
      id: 'missionZones',
      paint: c => drawMissionZones(c, mission?.zones, toC, scale, pl, profile)
    }, {
      id: 'missionPoints',
      reserve: () => reservePoints(pl, mission?.points, toC, scale, profile),
      paint: c => drawMissionPoints(c, mission?.points, toC, W, H, scale, profile)
    }, {
      id: 'cities', // les villes après les terrains, balises et points de report : leur place n'est plus réservée d'avance
      paint: c => {
        towns = cityList(shown.cities, profile, toC, bbox, scale, pl);
        drawCities(c, towns, profile, scale, W, H);
      }
    }, {
      id: 'route',
      paint: c => PR.drawRoute(c, route, toC, scale, labels, {
        marks: mk,
        lines
      }, env)
    }, {
      // couches de la Carte éteintes : la part dim de ce qui est déjà peint s'efface (destination-out), le fond MapLibre l'est par la
      // classe de la boîte ; ce que l'écran peint ensuite est entier
      id: 'dim',
      paint: c => {
        if (!(dim > 0)) return;
        c.save();
        c.globalCompositeOperation = 'destination-out';
        c.globalAlpha = Math.min(1, dim);
        c.fillStyle = '#000';
        c.fillRect(0, 0, W, H);
        c.restore();
      }
    }, {
      id: 'screenTraces', // l'écran peint ses tracés au niveau de la route (procédures choisies)
      paint: c => overRoute && overRoute(c, pl) // le placeur : les numéros de piste de l'écran cèdent aux balises déjà posées
    }, {
      // cartouches des voies que suit le chemin (route et procédures) : par-dessus son trait (le mode Édition de l'écran
      // dessine ensuite ses poignées)
      id: 'airwayOver',
      paint: () => {
        for (const f of ends.over || []) f();
      }
    }, {
      id: 'screenTop', // ce que l'écran peint en dernier (noms et contraintes des procédures)
      paint: c => top && top(c)
    }];
    // couches estompées (mode « choisir sur la carte », V3 § 10.30) : les cartouches des voies passent sous le voile avec le reste de
    // la Carte ; ce que l'écran dessine (traces, vecteurs, cartouches des procédures) reste au-dessus de toutes les étiquettes
    if (dim > 0) layers.splice(layers.findIndex(l => l.id === 'dim'), 0, ...layers.splice(layers.findIndex(l => l.id === 'airwayOver'),
      1));
    for (const l of layers) l.reserve?.();
    for (const l of layers) l.paint?.(ctx);
    // cadres posés, pour les infobulles et les libellés ajoutés par l'écran (TOC, TOD) : cartouches des voies, libellés
    // d'espaces, libellés de la route
    return {
      // zoom effectif comparé aux seuils et ce que la vue en garde (mesures, page d'essai : window.__maps.mod)
      zoom: {
        shifted: zs,
        effective: zv,
        tier,
        kept: mission ? null : {
          airspaces: shown.airspaces?.length || 0,
          // par famille de seuil (asTma, asCtr, asP, asR, asD, …) : ce que les curseurs gardent, pour les mesures
          byKey: (shown.airspaces || []).reduce((n, a) => {
            const k = zoneKey(a.type);
            n[k] = (n[k] || 0) + 1;
            return n;
          }, {}),
          aerodromes: shown.aerodromes?.length || 0,
          navaids: shown.navaids?.length || 0,
          vrp: shown.vrp?.length || 0,
          obstacles: shown.obstacles?.length || 0,
          moraCells: shown.moraCells?.length || 0,
          cities: shown.cities?.length || 0
        }
      },
      airways: ends.hits || [],
      // les listes montrées (espaces, voies, terrains) : le dessin léger d'un geste les reprend en traits seuls (light.js)
      light: mission ? null : {
        airspaces: shown.airspaces || [],
        airways: shown.airways || [],
        aerodromes: shown.aerodromes || []
      },
      // terrains dessinés dans le cadre, à leur place à l'écran (survol et toucher d'un terrain : points de report VFR)
      // balises dessinées et celles qui leur sont rattachées faute de place (même endroit) : infobulle
      navaids: pts.navs,
      vrps: vrpHits || [],
      aerodromes: (pts.ads || []).map(a => ({
        a,
        ...toC(+a.lat, +a.lon)
      })).filter(h => h.x > -10 && h.y > -10 && h.x < W + 10 && h.y < H + 10),
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
    vrpRotary,
    vrpColor,
    routeProfile,
    bboxOf,
    nearLon,
    wrapLon,
    distances,
    marks,
    mercator,
    drawBackground,
    draw,
    zoomOf,
    pxOfZoom,
    effectiveZoom,
    detailZoom,
    DETAIL_MAX,
    FRAME_REF_PX,
    vrpCode,
    vrpNorm,
    dedupeVrp,
    zoneKey,
    visibleAt,
    atZoom,
    byZoom,
    /** Valeur d'un élément d'un profil d'affichage (défaut du studio si absent). */
    elementOf: (p, id) => el(migrated(p), id),
    /** Profil d'affichage dont l'ancien airwayLabels est rendu en awLabels (§ 10.29 g). */
    migrated,
    deg3,
    tierOf,
    trackOf,
    tokens,
    themed,
    withAlpha,
    contrast: (a, b) => contrast(rgbOf(a) || [0, 0, 0], rgbOf(b) || [0, 0, 0]),
    /** Palette de la Carte, de jour ou de nuit (§ 10.29 f). */
    palette,
    /** Aides du noyau, gelées, que lisent les parties : interne au rendu. */
    kit: K,
    /** Espaces de noms gelés des parties (airspace : render_airspace.js ; route : render_route.js), posés à leur chargement. */
    parts: {}
  };
})();
