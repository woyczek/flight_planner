(() => {
  'use strict';
  // Symbologie des cartes aéronautiques (légende SIA / IGN au 1 : 500 000) pour le studio
  // cartographique : lecture de l'AIXM 4.5 du SIA (aérodromes, pistes, radionavigation, obstacles)
  // et dessin sur canvas — espaces aériens (classes, hachures R / D / P, RTBA, petite zone),
  // aérodromes, VOR / DME / TACAN / NDB, obstacles. Même code pour le PNG, le SVG et la carte de
  // contrôle. Coordonnées écran fournies par toCanvas(lat, lon) → { x, y } ; `scale` = facteur
  // des tailles (1 = 1600 px de large).

  // ---- lecture de l'AIXM 4.5
  const tag = (b, t) => {
    const m = new RegExp(`<${t}>([^<]*)</${t}>`).exec(b);
    return m ? m[1].trim() : '';
  };

  /** Coordonnée AIXM en degrés-minutes-secondes (« 481530N ») → degrés décimaux. */
  function dms(v) {
    v = String(v || '').trim();
    if (!v) return NaN;
    const h = v.slice(-1).toUpperCase(),
      raw = v.slice(0, -1),
      deg = h === 'E' || h === 'W' ? 3 : 2;
    let x;
    if (raw.split('.')[0].length <= deg) x = +raw;
    else x = +raw.slice(0, deg) + +raw.slice(deg, deg + 2) / 60 + +raw.slice(deg + 2) / 3600;
    return h === 'S' || h === 'W' ? -x : x;
  }
  // Blocs d'un type, sans la référence à l'organisme (son txtName précède celui de l'objet).
  const blocks = (text, t) => text.split(`<${t}>`).slice(1).map(c => c.slice(0, c.indexOf(`</${t}>`)).replace(/<OrgUid[\s\S]*?<\/OrgUid>/, ''));
  /** Position { lat, lon } d'un bloc AIXM (geoLat / geoLong). */
  const geo = b => ({
    lat: dms(tag(b, 'geoLat')),
    lon: dms(tag(b, 'geoLong'))
  });
  const HARD = /^(ASPH|CONC|BITUM|BIT|PEM|ASPC|MACADAM|PAVED|CONC\+ASPH|ASPH\+CONC)/i;

  /** Lecture de l'export AIXM du SIA : aérodromes (pistes, fréquences, statut), radionavigation, points, obstacles, espaces aériens (anneaux, planchers, plafonds), sites à survol interdit, parcs. */
  function parseAixm(text) {
    // Pistes : longueur (m), revêtement, orientation (Rdn : relèvement vrai du premier seuil).
    const rwy = new Map(),
      brg = new Map();
    for (const b of blocks(text, 'Rwy')) {
      const ad = /<AhpUid[^>]*>\s*<codeId>([^<]+)/.exec(b)?.[1];
      if (!ad) continue;
      const len = +tag(b, 'valLen') * (/FT/i.test(tag(b, 'uomDimRwy')) ? .3048 : 1),
        comp = tag(b, 'codeComposition');
      const list = rwy.get(ad) || [];
      list.push({
        desig: /<txtDesig>([^<]+)/.exec(b)?.[1] || '',
        len,
        hard: HARD.test(comp),
        water: /WATE/i.test(comp)
      });
      rwy.set(ad, list);
    }
    const rdnBrg = new Map();
    for (const b of blocks(text, 'Rdn')) {
      const ad = /<AhpUid[^>]*>\s*<codeId>([^<]+)/.exec(b)?.[1],
        d = /<RwyUid[^>]*>[\s\S]*?<txtDesig>([^<]+)/.exec(b)?.[1],
        t = +tag(b, 'valTrueBrg');
      if (ad && d && Number.isFinite(t) && !brg.has(ad + '|' + d)) brg.set(ad + '|' + d, t);
      const thr = /<\/RwyUid>\s*<txtDesig>([^<]+)/.exec(b)?.[1];
      if (ad && thr && Number.isFinite(t)) rdnBrg.set(ad + '|' + thr, t);
    }
    const twr = new Set(),
      afis = new Set();
    for (const b of blocks(text, 'Uni')) {
      const ad = /<AhpUid[^>]*>\s*<codeId>([^<]+)/.exec(b)?.[1],
        t = tag(b, 'codeType');
      if (!ad) continue;
      if (t === 'TWR') twr.add(ad);
      else if (t === 'AFIS') afis.add(ad);
    }
    const aerodromes = [];
    for (const b of blocks(text, 'Ahp')) {
      const id = /<AhpUid[^>]*>\s*<codeId>([^<]+)/.exec(b)?.[1] || '',
        name = tag(b, 'txtName'),
        p = geo(b);
      if (!Number.isFinite(p.lat) || /CLOSED|FICTI/i.test(name + tag(b, 'txtDescrRefPt') + tag(b, 'txtRmk'))) continue;
      const runways = (rwy.get(id) || []).sort((a, c) => c.len - a.len),
        main = runways.find(r => r.hard) || runways[0];
      const admin = tag(b, 'txtNameAdmin'),
        type = tag(b, 'codeType');
      aerodromes.push({
        id,
        icao: tag(b, 'codeIcao'),
        name,
        type,
        ...p,
        elev: +tag(b, 'valElev') || 0,
        magVar: +tag(b, 'valMagVar') || 0,
        state: /MINIST[EÈ]RE DES ARM|DEFENCE|DEFENSE|MILIT/i.test(admin),
        public: type === 'AD' && !!tag(b, 'codeIcao'),
        controlled: twr.has(id),
        afis: afis.has(id),
        hardLen: Math.max(0, ...runways.filter(r => r.hard).map(r => r.len)),
        water: runways.some(r => r.water),
        bearing: main ? brg.get(id + '|' + main.desig) ?? +(main.desig.match(/^(\d{2})/)?.[1] || 0) * 10 : 0
      });
    }
    // Radionavigation : VOR (+ DME associé = VOR-DME ; TACAN co-implanté = VOR-TACAN), DME, TACAN, NDB.
    const navaids = [],
      vorByMid = new Map(),
      ilsDme = new Set([...text.matchAll(/<Ils>[\s\S]*?<DmeUid mid="(\d+)"/g)].map(m => m[1]));
    for (const b of blocks(text, 'Vor')) {
      const mid = /<VorUid mid="(\d+)"/.exec(b)?.[1],
        p = geo(b);
      if (!Number.isFinite(p.lat)) continue;
      const n = {
        kind: 'VOR',
        id: /<VorUid[^>]*>\s*<codeId>([^<]+)/.exec(b)?.[1] || '',
        name: tag(b, 'txtName'),
        freq: tag(b, 'valFreq'),
        ...p
      };
      navaids.push(n);
      if (mid) vorByMid.set(mid, n);
    }
    /** Vrai si deux positions sont voisines (≈ 2 km). */
    const near = (a, c) => Math.abs(a.lat - c.lat) < .02 && Math.abs(a.lon - c.lon) < .03;
    for (const b of blocks(text, 'Dme')) {
      const vor = vorByMid.get(/<VorUid mid="(\d+)"/.exec(b)?.[1]),
        p = geo(b);
      if (!Number.isFinite(p.lat)) continue;
      if (vor) {
        vor.dme = true;
        continue;
      }
      navaids.push({
        kind: 'DME',
        ils: ilsDme.has(/<DmeUid mid="(\d+)"/.exec(b)?.[1]),
        id: /<DmeUid[^>]*>\s*<codeId>([^<]+)/.exec(b)?.[1] || '',
        name: tag(b, 'txtName'),
        freq: tag(b, 'valGhostFreq'),
        channel: tag(b, 'codeChannel'),
        ...p
      });
    }
    for (const b of blocks(text, 'Tcn')) {
      const id = /<TcnUid[^>]*>\s*<codeId>([^<]+)/.exec(b)?.[1] || '',
        p = geo(b);
      if (!Number.isFinite(p.lat)) continue;
      const vor = navaids.find(n => n.kind === 'VOR' && n.id === id && near(n, p));
      if (vor) {
        vor.tacan = true;
        vor.channel = tag(b, 'codeChannel');
        continue;
      }
      navaids.push({
        kind: 'TACAN',
        id,
        name: tag(b, 'txtName'),
        channel: tag(b, 'codeChannel'),
        ...p
      });
    }
    for (const b of blocks(text, 'Ndb')) {
      const p = geo(b);
      if (!Number.isFinite(p.lat)) continue;
      navaids.push({
        kind: 'NDB',
        id: /<NdbUid[^>]*>\s*<codeId>([^<]+)/.exec(b)?.[1] || '',
        name: tag(b, 'txtName'),
        freq: tag(b, 'valFreq'),
        ...p
      });
    }
    for (const b of blocks(text, 'Ils')) {
      const ilz = /<Ilz>([\s\S]*?)<\/Ilz>/.exec(b)?.[1];
      if (!ilz) continue;
      const p = geo(ilz);
      if (!Number.isFinite(p.lat)) continue;
      const ad = /<AhpUid[^>]*>\s*<codeId>([^<]+)/.exec(b)?.[1] || '',
        thr = /<\/RwyUid>\s*<txtDesig>([^<]+)/.exec(b)?.[1] || '';
      navaids.push({
        kind: 'ILS',
        id: tag(ilz, 'codeId'),
        name: `${ad} ${thr}`.trim(),
        freq: tag(ilz, 'valFreq'),
        ad,
        rwy: thr,
        bearing: rdnBrg.get(ad + '|' + thr),
        dme: /<DmeUid/.test(b),
        ...p
      });
    }
    // Obstacles : altitude du sommet (AMSL) et hauteur (AGL) en ft, balisage, groupe, nature.
    const obstacles = [];
    for (const b of blocks(text, 'Obs')) {
      const p = geo(b),
        k = /^M$/i.test(tag(b, 'uomDistVer')) ? 3.28084 : 1;
      if (!Number.isFinite(p.lat)) continue;
      obstacles.push({
        ...p,
        elev: Math.round(+tag(b, 'valElev') * k) || 0,
        hgt: Math.round(+tag(b, 'valHgt') * k) || 0,
        lit: tag(b, 'codeLgt') === 'Y',
        group: tag(b, 'codeGroup') === 'Y',
        wind: /olienne/i.test(tag(b, 'txtDescrType'))
      });
    }
    // Points désignés (Dpn : points RNAV, points de report) : pour les cheminements.
    const points = [];
    for (const b of blocks(text, 'Dpn')) {
      const p = geo(b);
      if (Number.isFinite(p.lat)) points.push({
        id: /<DpnUid[^>]*>\s*<codeId>([^<]+)/.exec(b)?.[1] || '',
        type: tag(b, 'codeType'),
        ...p
      });
    }
    // Voies aériennes (Rsg : segments de route ATS) : extrémités (point RNAV ou balise), niveaux ; pour le calcul
    // des routes (shared/mission_routing.js). Niveau en ft : FL × 100, sinon valeur (ft ou m).
    const airways = [];
    const lvl = (b, w) => { const v = +tag(b, `valDistVer${w}`), u = tag(b, `uomDistVer${w}`).toUpperCase(); return !Number.isFinite(v) || !tag(b, `valDistVer${w}`) ? null : u === 'FL' ? v * 100 : u === 'M' ? Math.round(v * 3.28084) : v; };
    for (const b of blocks(text, 'Rsg')) {
      const route = /<RteUid[^>]*>\s*<txtDesig>([^<]+)/.exec(b)?.[1] || '',
        end = w => { const m = new RegExp(`<(\\w+)Uid${w}[^>]*>([\\s\\S]*?)</\\1Uid${w}>`).exec(b); return m ? { id: tag(m[2], 'codeId'), ...geo(m[2]) } : null; },
        a = end('Sta'), z = end('End');
      if (!a || !z || !Number.isFinite(a.lat) || !Number.isFinite(z.lat)) continue;
      airways.push({ route, a, b: z, lower: lvl(b, 'Lower'), upper: lvl(b, 'Upper'), nm: +tag(b, 'valLen') || null });
    }
    return {
      aerodromes,
      navaids,
      obstacles,
      points,
      airways
    };
  }

  // ---- limites verticales (numériques, ft) et libellés « carte »
  function limitFt(text, top) {
    const t = String(text || '').toUpperCase();
    if (!t) return top ? Infinity : 0;
    if (/UNL/.test(t)) return Infinity;
    if (/SFC|GND/.test(t)) return 0;
    const m = /(FL)?\s*(\d+(?:[.,]\d+)?)/.exec(t);
    if (!m) return top ? Infinity : 0;
    const v = +m[2].replace(',', '.');
    return m[1] ? v * 100 : / M\b/.test(t) ? v * 3.28084 : v;
  }
  /** Limite verticale au format carte (FL 065, 1500 ft AMSL…). */
  const chartLimit = t => String(t || '').replace(/^FL\s*(\d+)$/, (_, n) => 'FL ' + n.padStart(3, '0')).replace(/ ft /, ' ').replace(/ m /, ' m ');

  // ---- placement des libellés : un rectangle n'est posé que s'il ne recouvre aucun autre
  // Grille de cases de 64 px : un rectangle n'est comparé qu'à ceux des cases qu'il touche (des milliers
  // de villes restent rapides) ; les très grands rectangles sont tenus à part.
  function placer(cell = 64) {
    const grid = new Map(),
      big = [],
      /** Vrai si deux rectangles se chevauchent. */
      hit = (r, q) => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0;
    /** Cellules de la grille couvertes par un rectangle. */
    const span = r => [Math.floor(r.x0 / cell), Math.floor(r.x1 / cell), Math.floor(r.y0 / cell), Math.floor(r.y1 / cell)];
    /** Vrai pour un rectangle trop grand pour la grille (liste à part). */
    const large = ([i0, i1, j0, j1]) => (i1 - i0 + 1) * (j1 - j0 + 1) > 256;
    return {
      /** Vrai si le rectangle r ne chevauche aucun élément déjà placé. */
      free(r) {
        if (big.some(q => hit(r, q))) return false;
        const sp = span(r),
          [i0, i1, j0, j1] = sp;
        if (large(sp)) {
          for (const l of grid.values())
            if (l.some(q => hit(r, q))) return false;
          return true;
        }
        for (let i = i0; i <= i1; i++)
          for (let j = j0; j <= j1; j++) {
            const l = grid.get(i + ',' + j);
            if (l && l.some(q => hit(r, q))) return false;
          }
        return true;
      },
      /** Réserve le rectangle r dans la grille de placement. */
      add(r) {
        const sp = span(r),
          [i0, i1, j0, j1] = sp;
        if (large(sp)) big.push(r);
        else
          for (let i = i0; i <= i1; i++)
            for (let j = j0; j <= j1; j++) {
              const k = i + ',' + j;
              if (!grid.has(k)) grid.set(k, []);
              grid.get(k).push(r);
            }
        return true;
      },
      /** Réserve r s'il est libre ; vrai si réservé. */
      take(r) {
        return this.free(r) ? this.add(r) : false;
      }
    };
  }
  let place = null; // placeur de l'image en cours (drawPoints)

  // ---- dessin
  const C = {
    red: '#d6173f',
    redPale: '#f6c7d1',
    blue: '#1d4a9e',
    bluePale: '#c9d6ef',
    bandBCD: 'rgba(78,112,196,.55)',
    bandE: 'rgba(158,195,238,.75)',
    lineE: '#5b86c8'
  };
  const patterns = new WeakMap();

  /** Motif de hachures d'un type d'espace (zone réglementée, dangereuse, interdite…), mis en cache par contexte. */
  function hatch(ctx, kind) {
    let m = patterns.get(ctx);
    if (!m) patterns.set(ctx, m = {});
    if (m[kind]) return m[kind];
    const c = document.createElement('canvas'),
      n = kind === 'rtba' ? 10 : 7;
    c.width = c.height = n;
    const g = c.getContext('2d');
    if (kind === 'rtba') {
      g.fillStyle = C.red;
      g.fillRect(0, 0, n, n);
      g.strokeStyle = 'rgba(255,255,255,.75)';
      g.lineWidth = 2;
    } else {
      g.strokeStyle = C.red;
      g.lineWidth = 1.4;
    }
    g.beginPath();
    g.moveTo(-1, n + 1);
    g.lineTo(n + 1, -1);
    g.moveTo(-1, 1);
    g.lineTo(1, -1);
    g.moveTo(n - 1, n + 1);
    g.lineTo(n + 1, n - 1);
    if (kind === 'cross') {
      g.moveTo(-1, -1);
      g.lineTo(n + 1, n + 1);
    }
    g.stroke();
    return m[kind] = ctx.createPattern(c, 'repeat');
  }
  /** Trace un anneau (lat, lon) dans le contexte, projection toC. */
  const ringPath = (ctx, ring, toC) => {
    ring.forEach(([lat, lon], i) => {
      const p = toC(lat, lon);
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    });
    ctx.closePath();
  };
  /** Anneau principal (le plus grand) d'un espace aérien. */
  const bigRing = a => a.rings.reduce((best, r) => r.length > best.length ? r : best, []);

  /** Rectangle écran englobant un anneau. */
  function screenBox(ring, toC) {
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -Infinity,
      y1 = -Infinity;
    for (const [lat, lon] of ring) {
      const p = toC(lat, lon);
      x0 = Math.min(x0, p.x);
      y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x);
      y1 = Math.max(y1, p.y);
    }
    return {
      x0,
      y0,
      x1,
      y1,
      w: x1 - x0,
      h: y1 - y0
    };
  }

  // Espaces aériens au formalisme de la carte : bande intérieure (clip + trait double largeur).
  function drawAirspaces(ctx, zones, toC, {
    W,
    H,
    scale = 1,
    font = 10,
    labels = true,
    shapes = true,
    limits = true,
    smallCross = true,
    smallPx = 14,
    placer: pl = null,
    alpha = .6,
    abbrev = false
  } = {}) {
    abbrevNames = abbrev;
    const band = Math.max(2.5, 4.5 * scale),
      todo = [];
    const order = {
        E: 0,
        D: 1,
        C: 1,
        B: 1,
        A: 2
      },
      isRdp = a => a.type === 'R' || a.type === 'D' || a.type === 'P' || a.type === 'W' || a.type === 'A'; // W, A : zones d'alerte et d'avertissement (autres pays)
    const sorted = [...zones].sort((a, c) => (isRdp(a) ? 3 : order[a.cls] ?? 1) - (isRdp(c) ? 3 : order[c.cls] ?? 1));
    for (const a of sorted) {
      const ring = bigRing(a);
      if (!ring.length) continue;
      const box = screenBox(ring, toC);
      if (box.x1 < 0 || box.y1 < 0 || box.x0 > W || box.y0 > H) continue;
      const restricted = isRdp(a);
      if (smallCross && restricted && Math.max(box.w, box.h) < smallPx * scale) { // zone de faible superficie : croix rouge
        const x = (box.x0 + box.x1) / 2,
          y = (box.y0 + box.y1) / 2,
          s = 6 * scale;
        if (shapes) {
          ctx.save();
          ctx.strokeStyle = C.red;
          ctx.lineWidth = Math.max(1.5, 2.2 * scale);
          ctx.beginPath();
          ctx.moveTo(x - s, y);
          ctx.lineTo(x + s, y);
          ctx.moveTo(x, y - s);
          ctx.lineTo(x, y + s);
          ctx.stroke();
          ctx.restore();
        }
        if (labels) todo.push({
          a,
          box,
          spots: [{
            x: x + s + 2,
            y,
            align: 'left'
          }]
        });
        continue;
      }
      if (shapes)
        for (const r of a.rings) {
          ctx.save();
          ctx.beginPath();
          ringPath(ctx, r, toC);
          ctx.clip();
          let stroke, line, lineW = Math.max(1, 1.4 * scale);
          if (a.azba) {
            stroke = hatch(ctx, 'rtba');
            line = C.red;
          } else if (a.type === 'P') {
            stroke = hatch(ctx, 'cross');
            line = C.red;
          } else if (restricted) {
            stroke = hatch(ctx, 'diag');
            line = C.red;
          } else if (a.cls === 'A') {
            stroke = 'rgba(214,23,63,.8)';
            line = C.red;
          } else if (/^(RMZ|TMZ|RMZ-TMZ)$/.test(a.type)) {
            stroke = 'rgba(40,40,40,.18)';
            line = '#222';
          } else if (/^(TRA|TSA|MOA|MTR)$/.test(a.type)) { // TSA, MOA, routes MTR : zones militaires activables (autres pays)
            stroke = 'rgba(214,23,63,.25)';
            line = C.red;
          } else if (a.cls === 'E' || a.cls === 'G' || a.type === 'SIV') {
            stroke = C.bandE;
            line = C.lineE;
            lineW = Math.max(1, scale);
          } else {
            stroke = C.bandBCD;
            line = C.blue;
            lineW = Math.max(1.4, 2 * scale);
          }
          ctx.beginPath();
          ringPath(ctx, r, toC);
          ctx.lineWidth = band * 2;
          ctx.strokeStyle = stroke;
          ctx.globalAlpha = alpha;
          ctx.stroke();
          ctx.restore();
          ctx.save();
          ctx.beginPath();
          ringPath(ctx, r, toC);
          ctx.lineWidth = lineW;
          ctx.strokeStyle = line;
          if (/^(RMZ|TMZ|RMZ-TMZ|TRA|TSA|MOA|MTR)$/.test(a.type)) ctx.setLineDash([6 * scale, 3 * scale, 1.5 * scale, 3 * scale]);
          ctx.stroke();
          ctx.restore();
        }
      if (labels) todo.push({
        a,
        box,
        ring
      });
    }
    if (!labels) return;
    const pl2 = pl || placer(),
      cx = b => (b.x0 + b.x1) / 2,
      cy = b => (b.y0 + b.y1) / 2;
    todo.sort((a, b) => b.box.w * b.box.h - a.box.w * a.box.h); // plus la zone est grande, plus son libellé est prioritaire
    for (const t of todo) {
      const size = labelSize(ctx, t.a, font, limits);
      // Candidats : centre de l'emprise, puis le long du contour, un peu vers l'intérieur.
      const spots = t.spots || [{
        x: cx(t.box),
        y: cy(t.box)
      }, ...(t.ring || []).filter((_, k, all) => k % Math.max(1, Math.floor(all.length / 16)) === 0).map(([lat, lon]) => {
        const q = toC(lat, lon);
        return {
          x: q.x + (cx(t.box) - q.x) * .22,
          y: q.y + (cy(t.box) - q.y) * .22
        };
      })];
      for (const sp of spots) {
        const x0 = sp.align === 'left' ? sp.x - size.left : sp.x - size.w / 2 - size.left / 2,
          r = {
            x0: x0 - 3,
            y0: sp.y - size.h / 2 - 2,
            x1: x0 + size.w + size.left + 3,
            y1: sp.y + size.h / 2 + 2
          };
        if (r.x0 < 0 || r.y0 < 0 || r.x1 > W || r.y1 > H || !pl2.take(r)) continue;
        zoneLabel(ctx, t.a, r.x0 + 3 + size.left, sp.y, font, 'left', limits);
        break;
      }
    }
  }

  /** Taille de l'étiquette d'un espace (titre, limites verticales) dans une police donnée. */
  function labelSize(ctx, a, font, limits = true) {
    const red = a.type === 'R' || a.type === 'D' || a.type === 'P',
      up = limits ? chartLimit(a.upper) : '',
      low = limits ? chartLimit(a.lower) : '';
    ctx.save();
    ctx.font = `700 ${font}px Arial,sans-serif`;
    const wt = ctx.measureText(zoneTitle(a)).width;
    ctx.font = `italic 700 ${font * .9}px Arial,sans-serif`;
    const wl = Math.max(ctx.measureText(up).width, ctx.measureText(low).width);
    ctx.restore();
    return {
      w: Math.max(wt, wl),
      h: font * 1.15 * (up || low ? 3 : 1),
      left: !red && a.cls && /^[A-G]$/.test(a.cls) ? font * 1.2 + 4 : 0
    };
  }
  // Noms abrégés (option du profil) : nom seul, sans le type de zone.
  let abbrevNames = false;
  /** Titre d'un espace : type + nom, ou nom seul (option noms abrégés). */
  const zoneTitle = a => abbrevNames ? a.name : (a.type === 'SIV' ? 'SIV ' : a.type + ' ') + a.name;
  // Installations portant une marque distinctive (survol interdit < 1000 m / 3300 ft, type SUR) :
  // contour et symbole ⊗ rouge ; parcs et réserves naturels (PRN) : contour vert tireté.
  // Les symboles ne se recouvrent pas (entre eux ni avec ce qui est déjà posé) : les plus grands
  // sites d'abord, un symbole sans place n'est pas dessiné (le contour, lui, reste).
  // Parcs et réserves réduits à un point dans l'AIXM : symbole vert (cercle et sapin).
  function drawSites(ctx, zones, toC, {
    W,
    H,
    scale = 1,
    placer: pl = null
  } = {}) {
    const own = placer(),
      items = [];
    for (const a of zones) {
      const ring = bigRing(a);
      if (!ring.length) continue;
      const box = screenBox(ring, toC);
      if (box.x1 < 0 || box.y1 < 0 || box.x0 > W || box.y0 > H) continue;
      items.push({
        a,
        box,
        sur: a.type === 'SUR',
        point: ring.length < 3
      });
    }
    items.sort((x, y) => (y.box.w * y.box.h) - (x.box.w * x.box.h));
    for (const {
        a,
        sur
      }
      of items) {
      const col = sur ? '#c2185b' : '#2e7d32';
      ctx.save();
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = Math.max(1, 1.3 * scale);
      if (!sur) ctx.setLineDash([5 * scale, 3 * scale]);
      for (const r of a.rings) {
        if (r.length < 3) continue;
        ctx.beginPath();
        ringPath(ctx, r, toC);
        ctx.stroke();
        if (sur) {
          ctx.globalAlpha = .15;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      ctx.restore();
    }
    for (const {
        box,
        sur,
        point
      }
      of items) {
      if (!sur && !point) continue;
      const x = (box.x0 + box.x1) / 2,
        y = (box.y0 + box.y1) / 2,
        s = 4 * scale + 2,
        k = s * .7,
        r = {
          x0: x - s - 1,
          y0: y - s - 1,
          x1: x + s + 1,
          y1: y + s + 1
        };
      if (!own.free(r) || (pl && !pl.free(r))) continue;
      own.add(r);
      if (pl) pl.add(r);
      ctx.save();
      ctx.lineWidth = Math.max(1.2, 1.6 * scale);
      if (sur) {
        ctx.strokeStyle = '#c2185b';
        ctx.beginPath();
        ctx.arc(x, y, s, 0, Math.PI * 2);
        ctx.moveTo(x - k, y - k);
        ctx.lineTo(x + k, y + k);
        ctx.moveTo(x + k, y - k);
        ctx.lineTo(x - k, y + k);
        ctx.stroke();
      } else {
        ctx.strokeStyle = ctx.fillStyle = '#2e7d32';
        ctx.beginPath();
        ctx.arc(x, y, s, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y - s * .7);
        ctx.lineTo(x + s * .5, y + s * .35);
        ctx.lineTo(x - s * .5, y + s * .35);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(x - s * .1, y + s * .35, s * .2, s * .3);
      }
      ctx.restore();
    }
  }
  // Agglomérations (symbologie OACI) : grande ville = tache orange, ville = tache jaune cerclée
  // d'orange, localité = point jaune cerclé de noir.
  function cityGlyph(pop, scale = 1) {
    return pop >= 100000 ? {
        r: (4 + Math.min(4, Math.log10(pop / 100000) * 3)) * scale,
        fill: '#f39c34',
        stroke: '#b35c00'
      } :
      pop >= 20000 ? {
        r: 3.5 * scale,
        fill: '#f7d23e',
        stroke: '#d9861c'
      } : {
        r: 2.5 * scale,
        fill: '#f7d23e',
        stroke: '#17202a'
      };
  }

  function drawCity(ctx, pop, p, scale = 1) {
    const g = cityGlyph(pop, scale);
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, g.r, 0, Math.PI * 2);
    ctx.fillStyle = g.fill;
    ctx.fill();
    ctx.lineWidth = Math.max(.8, scale);
    ctx.strokeStyle = g.stroke;
    ctx.stroke();
    ctx.restore();
    return g.r;
  }
  // Cartouche : « TMA ST-YAN 1 », plafond, trait, plancher, classe en carré ; R / D / P en rouge.
  function zoneLabel(ctx, a, x, y, font, align = 'center', limits = true) {
    const red = a.type === 'R' || a.type === 'D' || a.type === 'P',
      color = red ? C.red : C.blue,
      up = limits ? chartLimit(a.upper) : '',
      low = limits ? chartLimit(a.lower) : '';
    const title = zoneTitle(a);
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    const fTitle = `700 ${font}px Arial,sans-serif`,
      fLim = `italic 700 ${font * .9}px Arial,sans-serif`;
    ctx.font = fTitle;
    const wt = ctx.measureText(title).width;
    ctx.font = fLim;
    const wl = Math.max(ctx.measureText(up).width, ctx.measureText(low).width);
    const w = Math.max(wt, wl),
      lh = font * 1.15,
      hasLim = up || low,
      h = lh * (hasLim ? 3 : 1);
    const x0 = align === 'center' ? x - w / 2 : x,
      y0 = y - h / 2;
    ctx.fillStyle = 'rgba(255,255,255,.72)';
    ctx.fillRect(x0 - 3, y0 - 2, w + 6, h + 4);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.font = fTitle;
    ctx.fillText(title, x0 + w / 2, y0 + lh / 2);
    if (hasLim) {
      ctx.font = fLim;
      ctx.fillText(up || '—', x0 + w / 2, y0 + lh * 1.5);
      ctx.fillText(low || '—', x0 + w / 2, y0 + lh * 2.5);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, font / 11);
      ctx.beginPath();
      ctx.moveTo(x0 + w / 2 - wl / 2, y0 + lh * 2);
      ctx.lineTo(x0 + w / 2 + wl / 2, y0 + lh * 2);
      ctx.stroke();
    }
    if (!red && a.cls && /^[A-G]$/.test(a.cls)) { // classe dans un carré, à gauche du cartouche
      const s = font * 1.2,
        cx = x0 - s - 4,
        cy = y0 + h / 2 - s / 2;
      ctx.fillStyle = color;
      ctx.fillRect(cx, cy, s, s);
      ctx.fillStyle = '#fff';
      ctx.font = `700 ${font}px Arial,sans-serif`;
      ctx.fillText(a.cls, cx + s / 2, cy + s / 2 + .5);
    }
    ctx.restore();
  }

  // Aérodromes : piste en dur > 2300 m (piste orientée), 1000–2300 m, < 1000 m, bande, hélistation,
  // hydrobase ; ouvert à la CAP (plein, 4 repères), agréé / restreint (clair, sans repère), État (rouge).
  function drawAerodrome(ctx, ad, p, s, labelFont) {
    if (labelFont && labelFont.labelOnly) return aerodromeLabel(ctx, ad, p, s, labelFont);
    const main = ad.state ? C.red : C.blue,
      pale = ad.state ? C.redPale : C.bluePale,
      open = ad.public && !ad.state;
    const rot = (ad.bearing || 0) * Math.PI / 180;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.lineWidth = Math.max(1, s / 5);
    ctx.strokeStyle = main;
    ctx.fillStyle = main;
    const ticks = () => {
      if (!open) return;
      for (let k = 0; k < 4; k++) {
        ctx.save();
        ctx.rotate(k * Math.PI / 2);
        ctx.fillRect(-s * .12, -s * 1.45, s * .24, s * .5);
        ctx.restore();
      }
    };
    const circle = (fill) => {
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.stroke();
    };
    const glyph = g => {
      ctx.fillStyle = main;
      ctx.font = `700 ${s * 1.3}px Arial,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(g, 0, s * .06);
    };
    if (ad.type === 'HP') {
      circle('#fff');
      glyph('H');
      ticks();
    } else if (ad.water) {
      circle('#fff');
      glyph('⚓');
      ticks();
    } else if (ad.hardLen > 2300) { // piste orientée
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.rect(-s * .55, -s * 1.7, s * 1.1, s * 3.4);
      ctx.fillStyle = open ? main : pale;
      ctx.fill();
      ctx.stroke();
      if (!open) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(-s * .18, -s * 1.35, s * .36, s * 2.7);
      }
    } else if (ad.hardLen >= 1000) {
      circle(open ? main : pale);
      ctx.rotate(rot);
      ctx.fillStyle = open ? '#fff' : main;
      ctx.fillRect(-s * .22, -s * .95, s * .44, s * 1.9);
      ctx.rotate(-rot);
      ticks();
    } else if (ad.hardLen > 0) {
      circle('#fff');
      ctx.rotate(rot);
      ctx.fillStyle = main;
      ctx.fillRect(-s * .2, -s * .95, s * .4, s * 1.9);
      ctx.rotate(-rot);
      ticks();
    } else {
      circle('#fff');
      ticks();
    }
    ctx.restore();
    if (labelFont) aerodromeLabel(ctx, ad, p, s, labelFont);
  }

  /** Étiquette d'un aérodrome (code OACI, nom, altitude, fréquence) près de son symbole. */
  function aerodromeLabel(ctx, ad, p, s, labelFont) {
    const main = ad.state ? C.red : C.blue;
    const label = ad.icao || (labelFont && labelFont.full ? ad.name : '');
    if (labelFont && label) {
      ctx.save();
      ctx.font = `700 ${+labelFont}px Arial,sans-serif`;
      const w = ctx.measureText(label).width;
      ctx.restore();
      const r = {
        x0: p.x - w / 2 - 2,
        y0: p.y + s * 1.9,
        x1: p.x + w / 2 + 2,
        y1: p.y + s * 1.9 + +labelFont + 2
      };
      if (!place || place.take(r)) haloText(ctx, label, p.x, p.y + s * 1.9, +labelFont, main, 'center', 'top');
    }
  }
  // VOR (hexagone), VOR-DME (hexagone dans un carré), VOR-TACAN / TACAN (lobes), DME (carré), NDB
  // (cercles pointillés) ; cartouche « (D) ROA 110.25 » et nom en clair au-dessus.
  function drawNavaid(ctx, n, p, s, labelFont, magVar = 0, rose = 3.2, labelOnly = false) {
    if (!labelOnly) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.strokeStyle = C.blue;
      ctx.fillStyle = C.blue;
      ctx.lineWidth = Math.max(1, s / 6);
      const hex = r => {
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const t = Math.PI / 3 * k;
          ctx.lineTo(r * Math.cos(t), r * Math.sin(t));
        }
        ctx.closePath();
        ctx.stroke();
      };
      const dot = r => {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
      };
      if (n.kind === 'ILS') {
        ctx.rotate(((n.bearing ?? 0) + 180) * Math.PI / 180);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-s * .45, -s * 2.6);
        ctx.lineTo(0, -s * 2.2);
        ctx.lineTo(s * .45, -s * 2.6);
        ctx.closePath();
        ctx.globalAlpha = .75;
        ctx.fill();
        ctx.globalAlpha = 1;
        dot(s * .14);
      } else if (n.kind === 'NDB') {
        for (const r of [s * .55, s * .85, s * 1.15]) {
          ctx.setLineDash([1, 2.2]);
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(0, 0, s * .3, 0, Math.PI * 2);
        ctx.stroke();
        dot(s * .12);
      } else if (n.kind === 'DME') {
        ctx.strokeRect(-s * .7, -s * .7, s * 1.4, s * 1.4);
        dot(s * .12);
      } else {
        if (n.kind === 'VOR' || n.tacan) hex(s * .7);
        if (n.kind === 'TACAN' || n.tacan)
          for (let k = 0; k < 3; k++) {
            ctx.save();
            ctx.rotate(Math.PI / 6 + k * 2 * Math.PI / 3 + Math.PI / 2);
            ctx.fillRect(-s * .35, s * .6, s * .7, s * .38);
            ctx.restore();
          }
        if (n.dme && !n.tacan) ctx.strokeRect(-s * .95, -s * .95, s * 1.9, s * 1.9);
        dot(s * .12);
        if (n.kind === 'VOR' && rose > 0 && s >= 4) { // rose au nord magnétique, taille réglable
          ctx.save();
          ctx.rotate(magVar * Math.PI / 180);
          ctx.lineWidth = Math.max(.6, s / 12);
          ctx.globalAlpha = .6;
          ctx.beginPath();
          ctx.arc(0, 0, s * rose, 0, Math.PI * 2);
          ctx.stroke();
          for (let k = 0; k < 36; k++) {
            const t = k * Math.PI / 18,
              l = k % 9 === 0 ? s * .9 : k % 3 === 0 ? s * .5 : s * .25;
            ctx.beginPath();
            ctx.moveTo(Math.sin(t) * s * rose, -Math.cos(t) * s * rose);
            ctx.lineTo(Math.sin(t) * (s * rose - l), -Math.cos(t) * (s * rose - l));
            ctx.stroke();
          }
          ctx.restore();
        }
      }
      ctx.restore();
    }
    if (!labelFont) return;
    const d = n.dme || n.tacan || n.kind === 'DME' || n.kind === 'TACAN' ? '(D) ' : '',
      f = n.freq ? ` ${n.freq}` : n.channel ? ` CH ${n.channel}` : '',
      pre = n.kind === 'ILS' ? `ILS ${n.rwy} ` : '';
    const text = `${pre}${d}${n.id}${f}`;
    ctx.save();
    ctx.font = `700 ${labelFont}px Arial,sans-serif`;
    const w = ctx.measureText(text).width,
      x = p.x + s * 1.5,
      y = p.y - s * 1.4 - labelFont;
    if (place && !place.take({
        x0: x - 1,
        y0: y - (n.name && n.kind !== 'NDB' ? labelFont * .8 : 0) - 3,
        x1: x + w + 2,
        y1: y + labelFont + 2
      })) {
      ctx.restore();
      return;
    }
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillRect(x - 2, y - 2, w + 4, labelFont + 4);
    ctx.strokeStyle = C.blue;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 2, y - 2, w + 4, labelFont + 4);
    ctx.fillStyle = C.blue;
    ctx.textBaseline = 'top';
    ctx.fillText(text, x, y);
    if (n.name && n.kind !== 'NDB') {
      ctx.font = `700 ${labelFont * .72}px Arial,sans-serif`;
      ctx.textBaseline = 'bottom';
      ctx.fillText(n.name, x, y - 3);
    }
    ctx.restore();
  }
  // Obstacles : ≥ 300 ft AGL, élevés ≥ 500 ft, groupe, balisé de nuit, éolienne ; cote AMSL et (hauteur).
  function drawObstacle(ctx, o, p, s, labelFont) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.strokeStyle = C.blue;
    ctx.fillStyle = C.blue;
    ctx.lineWidth = Math.max(1, s / 6);
    ctx.lineJoin = 'round';
    const tall = o.hgt >= 500,
      h = s * (tall ? 2.1 : 1.3);
    const spike = dx => {
      ctx.beginPath();
      ctx.moveTo(dx - s * .45, 0);
      ctx.lineTo(dx, -h);
      ctx.lineTo(dx + s * .45, 0);
      ctx.stroke();
    };
    if (o.wind) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -h);
      ctx.stroke();
      for (let k = 0; k < 3; k++) {
        const t = -Math.PI / 2 + k * 2 * Math.PI / 3;
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(Math.cos(t) * s * .8, -h + Math.sin(t) * s * .8);
        ctx.stroke();
      }
    } else {
      spike(0);
      if (o.group) spike(s * .55);
      ctx.beginPath();
      ctx.arc(0, -s * .05, s * .13, 0, Math.PI * 2);
      ctx.fill();
    }
    if (o.lit)
      for (const t of [-0.9, 0, 0.9]) {
        ctx.beginPath();
        ctx.moveTo(Math.sin(t) * (h * .12 + s * .25), -h - Math.cos(t) * (s * .25));
        ctx.lineTo(Math.sin(t) * (h * .12 + s * .7), -h - Math.cos(t) * s * .7);
        ctx.stroke();
      }
    ctx.restore();
    if (labelFont && tall && (!place || place.take({
        x0: p.x + s * .8,
        y0: p.y - h - labelFont / 2,
        x1: p.x + s * .8 + labelFont * 3,
        y1: p.y - h + labelFont * 1.6
      }))) {
      haloText(ctx, String(o.elev), p.x + s * .8, p.y - h, labelFont, C.blue, 'left', 'middle', 'italic 700');
      haloText(ctx, `(${o.hgt})`, p.x + s * .8, p.y - h + labelFont * 1.05, labelFont * .85, C.blue, 'left', 'middle');
    }
  }

  /** Texte avec halo clair (lisible sur le fond de carte). */
  function haloText(ctx, text, x, y, size, color, align = 'left', base = 'middle', weight = '700') {
    ctx.save();
    ctx.font = `${weight} ${size}px Arial,sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = base;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(2, size * .28);
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }
  // Points aéronautiques de l'emprise ; densité : obstacles filtrés par hauteur, libellés selon le zoom.
  const NAV_RANK = n => n.kind === 'TACAN' || n.tacan ? 6 : n.kind === 'VOR' ? 5 : n.kind === 'DME' ? (n.ils ? 1 : 4) : n.kind === 'NDB' ? 3 : 2;
  /** Rang d'importance d'un aérodrome (contrôlé, longueur de piste en dur, public) : ordre de dessin et priorité des étiquettes. */
  const AD_RANK = a => (a.controlled ? 10 : 0) + (a.hardLen > 2300 ? 3 : a.hardLen >= 1000 ? 2 : a.hardLen > 0 ? 1 : 0) + (a.public || a.state ? 1 : 0) - (a.type === 'HP' ? 1 : 0);

  /** Dessine les points de la carte (aérodromes, radionavigation, obstacles, points de report) avec placement des étiquettes sans chevauchement. */
  function drawPoints(ctx, data, toC, {
    W,
    H,
    scale = 1,
    font = 10,
    aerodromes,
    navaids,
    obstacles,
    obstacleMin = 300,
    pxPerDegree = 100,
    placer: pl = null,
    rose = 3.2,
    adLabels = true,
    navLabels = true
  } = {}) {
    place = pl;
    /** Vrai si un point est dans le cadre (marge de 30 px). */
    const inside = p => p.x > -30 && p.y > -30 && p.x < W + 30 && p.y < H + 30,
      detailed = pxPerDegree >= 180,
      s = Math.max(4, 6 * scale);
    /** Déclinaison magnétique du point de la base le plus proche. */
    const nearestMag = (lat, lon) => {
      let best = null,
        d = Infinity;
      for (const a of data.aerodromes || []) {
        const e = (a.lat - lat) ** 2 + (a.lon - lon) ** 2;
        if (a.magVar && e < d) {
          d = e;
          best = a;
        }
      }
      return best?.magVar || 0;
    };
    // Aérodromes et balises se disputent la place chacun de leur côté (un aérodrome ne masque pas sa
    // balise) ; leurs symboles sont réservés pour les libellés (zones, villes…), qui les évitent.
    const adPl = placer(),
      navPl = placer(),
      sym = (p, k = 1.2) => ({
        x0: p.x - s * k,
        y0: p.y - s * k,
        x1: p.x + s * k,
        y1: p.y + s * k
      });
    /** Réserve la place d'un symbole ou d'une étiquette (placement sans chevauchement). */
    const reserve = r => {
      if (place) place.add(r);
    };
    if (aerodromes) {
      const ads = (data.aerodromes || []).filter(a => detailed || a.public || a.state).map(a => ({
        a,
        p: toC(a.lat, a.lon)
      })).filter(x => inside(x.p)).sort((x, y) => AD_RANK(y.a) - AD_RANK(x.a));
      const shown = ads.filter(x => adPl.take(sym(x.p, x.a.hardLen > 2300 ? 1.7 : 1.2)));
      shown.forEach(x => {
        drawAerodrome(ctx, x.a, x.p, s, 0);
        reserve(sym(x.p));
      });
      if (adLabels) shown.forEach(x => drawAerodrome(ctx, x.a, x.p, s, Object.assign(new Number(font * .85), {
        full: pxPerDegree >= 900,
        labelOnly: true
      })));
    }
    if (navaids) {
      const navs = (data.navaids || []).map(n => ({
        n,
        p: toC(n.lat, n.lon)
      })).filter(x => inside(x.p)).sort((a, b) => NAV_RANK(b.n) - NAV_RANK(a.n));
      const shown = navs.filter(x => navPl.take(sym(x.p)));
      shown.forEach(x => {
        drawNavaid(ctx, x.n, x.p, s, 0, detailed ? nearestMag(x.n.lat, x.n.lon) : 0, detailed ? rose : 0);
        reserve(sym(x.p));
      });
      if (navLabels) shown.forEach(x => drawNavaid(ctx, x.n, x.p, s, font * .85, 0, 0, true));
    }
    // Obstacles regroupés à l'écran (cellule ~ 3 symboles) : le plus haut représente le groupe.
    if (obstacles) {
      const cell = s * (detailed ? 2.2 : 3.5),
        keep = new Map();
      for (const o of data.obstacles || []) {
        if (o.hgt < obstacleMin || (!detailed && o.hgt < 500)) continue;
        const p = toC(o.lat, o.lon);
        if (!inside(p)) continue;
        const k = Math.floor(p.x / cell) + '|' + Math.floor(p.y / cell),
          cur = keep.get(k);
        if (!cur) keep.set(k, {
          o,
          p,
          n: 1
        });
        else {
          cur.n++;
          if (o.elev > cur.o.elev) {
            cur.o = o;
            cur.p = p;
          }
        }
      }
      for (const {
          o,
          p,
          n
        }
        of keep.values()) drawObstacle(ctx, n > 1 ? {
        ...o,
        group: true
      } : o, p, s * .9, detailed ? font * .85 : 0);
    }
    place = null;
  }

  window.SiaAero = {
    parseAixm,
    limitFt,
    chartLimit,
    drawAirspaces,
    drawSites,
    cityGlyph,
    drawCity,
    zoneLabel,
    labelSize,
    placer,
    drawPoints,
    drawAerodrome,
    drawNavaid,
    drawObstacle
  };
})();
