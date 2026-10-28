(() => {
  'use strict';
  // V3 maps — courbes de niveau calculées dans le navigateur depuis les tuiles d'altitude Terrarium (AWS, hôte de
  // meta.net, celles du relief du profil et de l'ombrage du mode Topo) : marching squares sur la grille d'altitudes de
  // chaque tuile, segments gardés par tuile et par équidistance, projetés à chaque dessin. Aucune dépendance, aucun
  // stockage : un cache en mémoire (tuiles et segments), borné.
  // API : MapsContours.draw(ctx, { toC, bbox, pxPerDeg, W, H, unit ('ft' | 'm'), scale, onReady, load }) — dessine les tuiles
  //   prêtes, demande les autres (onReady quand une arrive) ; intervalOf(unit) ; reset().
  // La brique n'appelle jamais fetch (modules/maps/SPEC.md § 2.1) : load(url) → Blob est donné par l'appelant (la Carte :
  // ctx.net) ; sans lui, aucune tuile n'est lue.
  const TILE = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
    MAX_TILES = 48,
    MAX_VIEW = 16, // tuiles au plus par vue (au-delà, un zoom de tuile plus grossier)
    STEP = 2, // pas de la grille (pixels de tuile) : 128 cellules par côté
    FT = .3048;
  const cache = new Map(); // 'z/x/y' → { p: Promise, h: Float32Array | null, segs: Map(intervalle → { xy, lv }) }
  let loader = null; // load(url) → Blob du dernier dessin

  /** Équidistance (m) et rang des courbes maîtresses : 100 m (maîtresse 500 m) ou 500 ft (maîtresse 2 500 ft). */
  const intervalOf = unit => unit === 'm' ? {
    step: 100,
    major: 5,
    unit: 'm'
  } : {
    step: 500 * FT,
    major: 5,
    unit: 'ft'
  };

  /** Altitudes (m) d'une tuile, ou null (absente, refusée, hors ligne). */
  function load(z, x, y) {
    const k = `${z}/${x}/${y}`;
    let e = cache.get(k);
    if (e) {
      cache.delete(k); // le plus récent à la fin (cache borné)
      cache.set(k, e);
      return e;
    }
    e = {
      h: null,
      segs: new Map(),
      p: null
    };
    e.p = (async () => {
      if (!loader) throw new Error('no load');
      const b = await loader(TILE.replace('{z}', z).replace('{x}', x).replace('{y}', y)),
        img = await createImageBitmap(b instanceof Blob ? b : new Blob([b])),
        c = new OffscreenCanvas(256, 256),
        g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, 256, 256).data,
        h = new Float32Array(256 * 256);
      for (let i = 0; i < h.length; i++) h[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768;
      e.h = h;
    })().catch(() => {
      e.failed = true;
    });
    cache.set(k, e);
    while (cache.size > MAX_TILES) cache.delete(cache.keys().next().value);
    return e;
  }

  /** Segments des courbes d'une tuile pour l'équidistance iv (m) : xy (lat, lon, lat, lon par segment), lv (niveau en
   *  multiples de iv). Marching squares, cellules de STEP pixels ; un col (cas 5, 10) est tranché au hasard du cas. */
  function segments(e, z, x, y, iv) {
    const key = iv.toFixed(3);
    if (e.segs.has(key)) return e.segs.get(key);
    const h = e.h,
      n = 2 ** z,
      N = Math.floor(255 / STEP), // cellules par côté
      lonOf = px => (x + px / 256) / n * 360 - 180,
      latOf = py => Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + py / 256) / n))) * 180 / Math.PI,
      xy = [],
      lv = [],
      at = (i, j) => Math.max(-500, h[(j * STEP) * 256 + i * STEP]); // mer : altitudes négatives ramenées
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const a = at(i, j),
          b = at(i + 1, j),
          c = at(i + 1, j + 1),
          d = at(i, j + 1),
          lo = Math.min(a, b, c, d),
          hi = Math.max(a, b, c, d);
        if (hi - lo < 1e-6) continue;
        for (let k = Math.ceil(lo / iv); k * iv <= hi; k++) {
          const L = k * iv;
          if (L <= 0) continue; // pas de courbe 0 (le trait de côte vient du fond)
          const idx = (a >= L ? 8 : 0) | (b >= L ? 4 : 0) | (c >= L ? 2 : 0) | (d >= L ? 1 : 0);
          if (idx === 0 || idx === 15) continue;
          // points des arêtes : haut (a-b), droite (b-c), bas (d-c), gauche (a-d), en pixels de tuile
          const t = (p, q) => (L - p) / (q - p),
            top = () => [(i + t(a, b)) * STEP, j * STEP],
            right = () => [(i + 1) * STEP, (j + t(b, c)) * STEP],
            bottom = () => [(i + t(d, c)) * STEP, (j + 1) * STEP],
            left = () => [i * STEP, (j + t(a, d)) * STEP],
            seg = (p, q) => {
              xy.push(latOf(p[1]), lonOf(p[0]), latOf(q[1]), lonOf(q[0]));
              lv.push(k);
            };
          switch (idx) {
            case 1:
            case 14:
              seg(left(), bottom());
              break;
            case 2:
            case 13:
              seg(bottom(), right());
              break;
            case 3:
            case 12:
              seg(left(), right());
              break;
            case 4:
            case 11:
              seg(top(), right());
              break;
            case 5:
              seg(left(), top());
              seg(bottom(), right());
              break;
            case 6:
            case 9:
              seg(top(), bottom());
              break;
            case 7:
            case 8:
              seg(left(), top());
              break;
            case 10:
              seg(top(), right());
              seg(left(), bottom());
              break;
          }
        }
      }
    const out = {
      xy: Float64Array.from(xy),
      lv: Int32Array.from(lv)
    };
    e.segs.set(key, out);
    return out;
  }

  /** Tuile (x, y) d'une position au zoom z. */
  const tileOf = (lat, lon, z) => {
    const n = 2 ** z,
      r = lat * Math.PI / 180;
    return [Math.floor((lon + 180) / 360 * n), Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n)];
  };

  /** Courbes de la vue : fines pour l'équidistance, maîtresses plus épaisses et étiquetées. */
  function draw(ctx, {
    toC,
    bbox,
    pxPerDeg,
    W,
    H,
    unit = 'ft',
    scale = 1,
    onReady = () => {},
    load: read = null // la lecture des tuiles de l'appelant (le nom load est celui de la fonction de la brique)
  }) {
    loader = read;
    const I = intervalOf(unit);
    let z = Math.max(8, Math.min(12, Math.floor(Math.log2(pxPerDeg * 360 / 256)) - 1)),
      a = tileOf(Math.min(85, bbox.n), bbox.w, z),
      b = tileOf(Math.max(-85, bbox.s), bbox.e, z);
    while (z > 8 && (b[0] - a[0] + 1) * (b[1] - a[1] + 1) > MAX_VIEW) {
      z--;
      a = tileOf(Math.min(85, bbox.n), bbox.w, z);
      b = tileOf(Math.max(-85, bbox.s), bbox.e, z);
    }
    const col = '#8d5a2b',
      f = 9 * scale,
      labels = [];
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineCap = 'round';
    for (let ty = a[1]; ty <= b[1]; ty++)
      for (let tx = a[0]; tx <= b[0]; tx++) {
        // la vue peut dépasser 180° (ligne de changement de date) : l'indice de tuile se lit modulo le nombre de tuiles du tour
        const nt = 2 ** z,
          txw = ((tx % nt) + nt) % nt,
          e = load(z, txw, ty);
        if (!e.h) {
          if (!e.failed && !e.waiting) {
            e.waiting = true;
            e.p.then(() => {
              e.waiting = false;
              if (e.h) onReady();
            });
          }
          continue;
        }
        const s = segments(e, z, txw, ty, I.step);
        for (const major of [false, true]) {
          ctx.globalAlpha = major ? .75 : .45;
          ctx.lineWidth = (major ? 1.1 : .6) * scale;
          ctx.beginPath();
          for (let k = 0; k < s.lv.length; k++) {
            if ((s.lv[k] % I.major === 0) !== major) continue;
            const p = toC(s.xy[4 * k], s.xy[4 * k + 1]),
              q = toC(s.xy[4 * k + 2], s.xy[4 * k + 3]);
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            // une étiquette par tuile et par courbe maîtresse, au segment le plus proche du centre de la tuile
            if (major && k % 7 === 0) labels.push({
              x: (p.x + q.x) / 2,
              y: (p.y + q.y) / 2,
              v: s.lv[k],
              t: `${tx}/${ty}`
            });
          }
          ctx.stroke();
        }
      }
    ctx.globalAlpha = 1;
    // étiquettes : une par tuile et par niveau maître, dans la vue, espacées de 80 px au moins
    const seen = new Set(),
      put = [];
    ctx.font = `italic 700 ${f}px Arial,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const l of labels) {
      const key = `${l.t}|${l.v}`;
      if (seen.has(key) || l.x < 20 || l.y < 20 || l.x > W - 20 || l.y > H - 20 || put.some(q => Math.hypot(q.x - l.x, q.y - l.y) < 80))
        continue;
      seen.add(key);
      put.push(l);
      const m = l.v * I.step,
        text = String(Math.round(I.unit === 'm' ? m : m / FT));
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 3;
      ctx.strokeText(text, l.x, l.y);
      ctx.fillStyle = col;
      ctx.fillText(text, l.x, l.y);
    }
    ctx.restore();
  }

  window.MapsContours = {
    draw,
    intervalOf,
    reset: () => cache.clear()
  };
})();
