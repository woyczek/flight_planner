// V3 maps — les procédures choisies du vol (SID, STAR, approche : V3_SPECIFICATION § 10.20) sur la carte, dans le profil et sur
// la carte du terrain (modules/maps/SPEC.md § 5, § 8, § 10). Le chemin « route + procédures » vient de
// frame/lib/current_flight.js (expandedPath, flownPath, rangés dans S.route par data.js) ; ce fichier ne fait que le dessin et
// les libellés : le tracé depuis le seuil de piste, la transition et l'approche interrompue en tireté, le tronçon sans point
// (VA, CA, VM, FM) en trait de 2 NM puis tireté, l'arc RF en arc, le raccord avec la route, les contraintes en notation AIP.
// Une procédure non choisie n'est jamais dessinée ; la Carte n'écrit jamais route.procedures.

import {
  S,
  tt,
  esc,
  level,
  FT_NM
} from './state.js';
import {
  nearLon
} from '../../frame/lib/geo.js';
import {
  proceduresOf
} from '../../frame/lib/current_flight.js';
import {
  TX
} from './texts.js';

/** Violet des procédures (le trait de la route est violet aussi : celui-ci est plus fin, avec un liseré du fond). */
const COL = '#7c3aed';
/** Vue rapprochée : les contraintes et les noms des points s'écrivent à partir de 300 px par degré. */
const NEAR_PX = 300;
/** Longueur du trait d'un tronçon sans point, le long de sa route (NM). */
const STUB_NM = 2;
const RAD = Math.PI / 180;
const up = v => String(v ?? '').trim().toUpperCase();
const num = v => v !== null && v !== undefined && v !== '' && Number.isFinite(+v);

// ---------------------------------------------------------------- contraintes en notation AIP
/** Altitude d'une contrainte : les pieds seuls jusqu'à l'altitude de transition comprise (« 3500 », « 5000 » quand elle est
 *  de 5000 ft, comme l'AIP), « FL070 » au-dessus. */
const altText = ft => +ft > (+S?.ctx.airline?.transitionFt || 5000) ? level(ft) : String(Math.round(+ft));
/** Contrainte d'un point en morceaux de texte [{ t, u (souligné), o (surligné) }] : souligné = au moins, surligné = au plus,
 *  les deux = exactement, « 5000–7000 » entre deux altitudes (le bas souligné, le haut surligné) ; null sans contrainte. */
export function altParts(alt) {
  if (!alt || !num(alt.ft)) return null;
  const t = alt.type;
  if (t === 'between' && num(alt.ft2)) {
    const lo = Math.min(+alt.ft, +alt.ft2),
      hi = Math.max(+alt.ft, +alt.ft2);
    return [{
      t: altText(lo),
      u: true
    }, {
      t: '–'
    }, {
      t: altText(hi),
      o: true
    }];
  }
  return [{
    t: altText(alt.ft),
    u: t === 'min' || t === 'at',
    o: t === 'max' || t === 'at'
  }];
}
/** Limite de vitesse indiquée d'un point (« ≤ 220 kt »), ou null. */
export const speedText = kt => num(kt) && +kt > 0 ? `≤ ${Math.round(+kt)} kt` : null;
/** Lignes de texte d'un point [[morceaux]] : son nom (points de procédure seulement), sa contrainte d'altitude, sa vitesse ;
 *  vide si rien à dire. */
function linesOf(p, near) {
  const out = [],
    id = p.origin !== 'route' && p.id ? p.id : '';
  if (near && id) out.push({
    parts: [{
      t: id,
      b: true
    }]
  });
  const alt = near ? altParts(p.alt) : null,
    kt = near ? speedText(p.kt) : null;
  if (alt) out.push({
    parts: alt
  });
  if (kt) out.push({
    parts: [{
      t: kt
    }]
  });
  return out;
}

// ---------------------------------------------------------------- libellés des procédures
/** Nom d'une procédure : celui de l'enregistrement, sinon celui de son identifiant (« LFBD.SID.ROYAN6P.RW23.NONE »). */
const nameOf = (rec, id) => rec?.name || String(id || '').split('.')[2] || '';
/** « SID ROYAN6P », suivi de l'état de la source : « X-Plane, local », « Little Navmap, local », « périmé » (SPEC § 5). */
export function procLabel(kind, rec, id) {
  const tags = [];
  if (rec?.status === 'xplane') tags.push(tt(TX.procX));
  else if (rec?.status === 'lnm') tags.push(tt(TX.procLnm));
  if (rec?.outdated) tags.push(tt(TX.procOutdated));
  return [`${kind} ${nameOf(rec, id)}`.trim(), ...tags].join(' · ');
}
/** Identifiants (majuscules) des points des procédures d'un côté : 'dep' (SID et sa transition) ou 'arr' (STAR, approche). */
function idsOf(side) {
  const P = S.procs || {},
    recs = side === 'dep' ? [P.sid, P.sidTrans] : [P.starTrans, P.star, P.appTrans, P.app];
  return new Set(recs.flatMap(r => (r?.points || []).map(p => up(p.id))).filter(Boolean));
}

// ---------------------------------------------------------------- tracé sur la carte
/** Point à nm de a le long du cap crs (degrés ; plan local, le trait est court). */
const ahead = (a, crs, nm) => ({
  lat: a.lat + nm / 60 * Math.cos(crs * RAD),
  lon: a.lon + nm / 60 * Math.sin(crs * RAD) / Math.max(.2, Math.cos(a.lat * RAD))
});
/** Polylignes de la route : les suites de points « route » du chemin (le tronçon que la SID ou la STAR dessine n'est pas
 *  redessiné par la route) ; null sans procédure dessinée, la route est alors tout le chemin (SPEC § 5). Longitudes continues. */
export function routeLines() {
  const path = S.route?.path;
  if (!path?.length || path.every(p => p.origin === 'route')) return null;
  const out = [];
  let run = [];
  for (const p of path) {
    if (p.origin === 'route' && num(p.lat) && num(p.lon)) run.push({
      lat: +p.lat,
      lon: +p.lon
    });
    else {
      if (run.length > 1) out.push(run);
      run = [];
    }
  }
  if (run.length > 1) out.push(run);
  return out;
}
/** Une chose à écrire près de q, dans un rectangle de la taille w × h : le premier des quatre coins qui ne recouvre rien de
 *  déjà placé (pl.take), sinon null ; force : posé au premier coin quoi qu'il arrive. */
function place(pl, q, w, h, force) {
  const spots = [
    [7, -h - 3],
    [7, 4],
    [-w - 7, -h - 3],
    [-w - 7, 4]
  ];
  for (const [dx, dy] of spots) {
    const r = {
      x0: q.x + dx,
      y0: q.y + dy,
      x1: q.x + dx + w,
      y1: q.y + dy + h
    };
    if (!pl || pl.take(r)) return r;
  }
  if (!force) return null;
  const [dx, dy] = spots[0];
  return {
    x0: q.x + dx,
    y0: q.y + dy,
    x1: q.x + dx + w,
    y1: q.y + dy + h
  };
}
const LINE_H = 16;
/** Largeur d'une ligne de morceaux (la police du libellé étant posée). */
const widthOf = (ctx, line) => line.parts.reduce((w, c) => {
  ctx.font = `${c.b ? 700 : 600} 11px Arial,sans-serif`;
  return w + ctx.measureText(c.t).width;
}, 0);

/** Mise en page du chemin à l'écran (projection toC, échelle pxDeg en px par degré) : { segs (traits), dots (points de procédure),
 *  names (libellés « SID NOM » à placer), pts (points à écrire), reserve(pl), labels } ; null sans procédure dessinée. Les
 *  libellés se réservent dans le placeur de la carte (reserve), après ceux de la route : un libellé qui n'a pas de place n'est
 *  pas écrit (le nom d'une procédure l'est toujours). */
export function layout(ctx, toC, pxDeg) {
  const path = S.route?.path;
  if (!path?.length || path.every(p => p.origin === 'route')) return null;
  const near = pxDeg >= NEAR_PX,
    pos = p => num(p.lat) && num(p.lon),
    at = p => ({
      ...toC(+p.lat, +p.lon),
      src: p
    }),
    routePts = path.filter(p => p.origin === 'route' && pos(p)),
    last = routePts.at(-1),
    isEnd = p => p === path[0] || p === last,
    isRwy = p => !!p.rwy || /^RW\d{2}[LRC]?$/.test(p.id || ''),
    ids = {
      dep: idsOf('dep'),
      arr: idsOf('arr')
    },
    // fins de la transition de la SID : la route la rejoint par un tronçon de transition (tireté)
    transIds = new Set((S.procs?.sidTrans?.points || []).map(p => up(p.id)).filter(Boolean)),
    segs = [],
    dots = [],
    pts = [];
  let cur = null,
    vec = false,
    inMissed = false,
    anchor = null;
  for (const p of path) {
    const missed = p.origin === 'missed';
    if (missed && !inMissed) {
      // l'approche interrompue part de l'extrémité de l'approche (le seuil), non du terrain d'arrivée qui ferme le chemin
      inMissed = true;
      if (anchor) cur = anchor;
      vec = false;
    }
    if (!pos(p)) {
      // tronçon sans point (VA, CA, VM, FM) : un trait de 2 NM le long de son cap, puis le tireté jusqu'au point suivant
      if (cur && num(p.crs)) {
        const e = ahead(cur, +p.crs, STUB_NM),
          b = {
            ...toC(e.lat, e.lon),
            lat: e.lat,
            lon: e.lon,
            src: p
          };
        segs.push({
          a: cur,
          b,
          dash: missed
        });
        cur = b;
        vec = true;
      }
      continue;
    }
    const q = at(p);
    q.lat = +p.lat;
    q.lon = +p.lon;
    if (cur) {
      const from = cur.src,
        route = p.origin === 'route' ? p : from?.origin === 'route' ? from : null,
        other = route === p ? from : p,
        // la route et la procédure ne se joignent pas sur un de leurs points : direct tireté entre les deux (jamais aux
        // extrémités, où la procédure part du terrain ou y arrive)
        direct = !!route && !!other && other.origin !== 'route' && !isEnd(route) && !ids[other.origin === 'sid' ? 'dep' : 'arr'].has(up(
          route.id)),
        // la route dessine ses propres tronçons ; le terrain et le seuil de la piste se touchent
        skip = (p.origin === 'route' && from?.origin === 'route') || (isRwy(p) && from?.origin === 'route' && isEnd(from)) ||
        (p.origin === 'route' && isEnd(p) && from && isRwy(from)),
        viaTrans = p.origin === 'route' && from?.origin === 'sid' && transIds.has(up(p.id));
      if (!skip) {
        const seg = {
          a: cur,
          b: q,
          dash: vec || direct || viaTrans || p.phase === 'trans' || missed
        };
        if (p.arc?.centre && num(p.arc.centre.lat) && num(p.arc.centre.lon)) {
          seg.arc = {
            c: toC(+p.arc.centre.lat, nearLon(+p.arc.centre.lon, +p.lon)),
            turn: p.turn
          };
        }
        segs.push(seg);
      }
    }
    cur = q;
    vec = false;
    if (!missed && (p.origin === 'star' || p.origin === 'app')) anchor = q;
    if (p.origin !== 'route' && !isRwy(p)) dots.push(q);
    if (p.origin !== 'route' || p.alt || p.kt) pts.push(q);
  }
  // les noms : « SID ROYAN6P » au point du milieu de la procédure
  const P = S.procs || {},
    f = proceduresOf(S.route.flight),
    names = [];
  for (const [origin, kind, rec, id] of [
      ['sid', 'SID', P.sid || P.sidTrans, f.dep?.sid || f.dep?.trans],
      ['star', 'STAR', P.star || P.starTrans, f.arr?.star || f.arr?.trans],
      ['app', 'APP', P.app || P.appTrans, f.arr?.app || f.arr?.appTrans]
    ]) {
    const own = path.filter(p => p.origin === origin && pos(p) && !isRwy(p));
    if (!own.length) continue;
    names.push({
      q: at(own[Math.floor(own.length / 2)]),
      text: procLabel(kind, rec, id)
    });
  }
  const L = {
    segs,
    dots,
    names,
    pts,
    near,
    labels: [],
    /** Réserve dans le placeur pl : les noms des procédures, puis (de près) les noms de points et les contraintes. */
    reserve(pl) {
      ctx.save();
      for (const n of names) {
        ctx.font = '700 12px Arial,sans-serif';
        const w = ctx.measureText(n.text).width,
          r = place(pl, n.q, w + 2, LINE_H, true);
        L.labels.push({
          r,
          lines: [{
            parts: [{
              t: n.text,
              b: true
            }]
          }],
          name: true
        });
      }
      if (near)
        for (const q of pts) {
          const lines = linesOf(q.src, near);
          if (!lines.length) continue;
          const w = Math.max(...lines.map(l => widthOf(ctx, l))) + 2,
            r = place(pl, q, w, lines.length * LINE_H, false);
          if (r) L.labels.push({
            r,
            lines
          });
        }
      ctx.restore();
    }
  };
  return L;
}

/** Écrit des lignes de morceaux dans le rectangle r : liseré du fond, puis le texte, souligné ou surligné (SPEC § 5). */
function drawLines(ctx, lines, r) {
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.lineJoin = 'round';
  lines.forEach((line, k) => {
    const y = r.y0 + k * LINE_H + LINE_H / 2;
    let x = r.x0;
    for (const c of line.parts) {
      ctx.font = `${c.b ? 700 : 600} 11px Arial,sans-serif`;
      const w = ctx.measureText(c.t).width;
      ctx.strokeStyle = S.theme.bg;
      ctx.lineWidth = 3;
      ctx.strokeText(c.t, x, y);
      ctx.fillStyle = COL;
      ctx.fillText(c.t, x, y);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = COL;
      if (c.u || c.o) {
        ctx.beginPath();
        if (c.u) {
          ctx.moveTo(x, y + 7);
          ctx.lineTo(x + w, y + 7);
        }
        if (c.o) {
          ctx.moveTo(x, y - 7);
          ctx.lineTo(x + w, y - 7);
        }
        ctx.stroke();
      }
      x += w;
    }
  });
}
/** Dessine la mise en page L (layout) par-dessus la route : traits (liseré du fond puis violet), points, libellés. */
export function draw(ctx, L) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const trace = s => {
    ctx.setLineDash(s.dash ? [7, 5] : []);
    ctx.beginPath();
    ctx.moveTo(s.a.x, s.a.y);
    const c = s.arc?.c;
    if (c) {
      const ra = Math.hypot(s.a.x - c.x, s.a.y - c.y),
        rb = Math.hypot(s.b.x - c.x, s.b.y - c.y),
        r = (ra + rb) / 2,
        a0 = Math.atan2(s.a.y - c.y, s.a.x - c.x),
        a1 = Math.atan2(s.b.y - c.y, s.b.x - c.x);
      if (r > 0 && r < 1e5) {
        // virage à gauche : sens inverse des aiguilles sur la carte ; sans le sens, l'arc le plus court
        const ccw = s.arc.turn === 'L' ? true : s.arc.turn === 'R' ? false : ((a1 - a0 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI < 0;
        ctx.arc(c.x, c.y, r, a0, a1, ccw);
        return ctx.stroke();
      }
    }
    ctx.lineTo(s.b.x, s.b.y);
    ctx.stroke();
  };
  ctx.strokeStyle = S.theme.bg;
  ctx.globalAlpha = .8;
  ctx.lineWidth = 6;
  for (const s of L.segs) trace(s);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = COL;
  ctx.lineWidth = 3;
  for (const s of L.segs) trace(s);
  ctx.setLineDash([]);
  for (const q of L.dots) {
    ctx.beginPath();
    ctx.arc(q.x, q.y, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = S.theme.bg;
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }
  for (const l of L.labels) drawLines(ctx, l.lines, l.r);
  ctx.restore();
}

// ---------------------------------------------------------------- contraintes dans le profil
/** Paliers de contraintes sur le profil (SPEC § 8.6) : à chaque point volé qui porte une contrainte d'altitude, un trait à
 *  l'altitude (souligné : montée au moins jusque-là, flèche vers le haut ; surligné : flèche vers le bas ; les deux : un rond),
 *  une barre verticale entre deux altitudes, et la contrainte écrite quand il y a la place. g : la géométrie du profil. Rend le
 *  nombre de paliers dessinés. */
export function drawProfileCons(ctx, g) {
  const flown = S.route?.flown || [],
    Y = ft => g.padT + (g.H - g.padT - g.padB) * (1 - (Math.min(Math.max(ft, g.bottom), g.top) - g.bottom) / (g.top - g.bottom)),
    X = nm => g.padL + (g.W - g.padL - g.padR) * (nm * FT_NM - g.w0) / ((g.w1 - g.w0) || 1),
    inX = x => x >= g.padL - .5 && x <= g.W - g.padR + .5;
  let n = 0,
    lastX = -Infinity;
  ctx.save();
  ctx.beginPath();
  ctx.rect(g.padL, g.padT, g.W - g.padL - g.padR, g.H - g.padT - g.padB);
  ctx.clip();
  ctx.strokeStyle = COL;
  ctx.fillStyle = COL;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const p of flown) {
    const a = p.alt;
    if (!a || !num(a.ft) || !num(p.nm)) continue;
    const x = X(p.nm);
    if (!inX(x)) continue;
    n++;
    const lo = a.type === 'between' && num(a.ft2) ? Math.min(+a.ft, +a.ft2) : +a.ft,
      hi = a.type === 'between' && num(a.ft2) ? Math.max(+a.ft, +a.ft2) : +a.ft,
      y0 = Y(lo),
      y1 = Y(hi);
    ctx.beginPath();
    if (a.type === 'between') {
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
      ctx.moveTo(x - 5, y0);
      ctx.lineTo(x + 5, y0);
      ctx.moveTo(x - 5, y1);
      ctx.lineTo(x + 5, y1);
    } else {
      ctx.moveTo(x - 6, y0);
      ctx.lineTo(x + 6, y0);
      if (a.type === 'min') { // au moins : la flèche monte
        ctx.moveTo(x - 3, y0 - 4);
        ctx.lineTo(x, y0 - 8);
        ctx.lineTo(x + 3, y0 - 4);
      } else if (a.type === 'max') {
        ctx.moveTo(x - 3, y0 + 4);
        ctx.lineTo(x, y0 + 8);
        ctx.lineTo(x + 3, y0 + 4);
      }
    }
    ctx.stroke();
    if (a.type === 'at') {
      ctx.beginPath();
      ctx.arc(x, y0, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // le texte quand il reste 40 px depuis le précédent
    if (x - lastX >= 40) {
      lastX = x;
      const parts = altParts(a),
        y = Math.min(g.H - g.padB - 8, Math.max(g.padT + 8, y1 - 12));
      let tx = x + 8;
      const w = parts.reduce((s, c) => (ctx.font = '600 10px Arial,sans-serif', s + ctx.measureText(c.t).width), 0);
      if (tx + w > g.W - g.padR) tx = x - 8 - w;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      for (const c of parts) {
        ctx.font = '600 10px Arial,sans-serif';
        const cw = ctx.measureText(c.t).width;
        ctx.lineWidth = 3;
        ctx.strokeStyle = S.theme.bg;
        ctx.lineJoin = 'round';
        ctx.strokeText(c.t, tx, y);
        ctx.fillStyle = COL;
        ctx.fillText(c.t, tx, y);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = COL;
        if (c.u || c.o) {
          ctx.beginPath();
          if (c.u) {
            ctx.moveTo(tx, y + 6);
            ctx.lineTo(tx + cw, y + 6);
          }
          if (c.o) {
            ctx.moveTo(tx, y - 6);
            ctx.lineTo(tx + cw, y - 6);
          }
          ctx.stroke();
        }
        tx += cw;
      }
      ctx.lineWidth = 2;
    }
  }
  ctx.restore();
  return n;
}

// ---------------------------------------------------------------- carte du terrain
/** Texte d'un côté du choix pour la carte du terrain : « piste 23 · SID ROYAN6P · transition ABC » ; null si le côté n'est pas
 *  choisi, '' si le pilote a choisi « aucune ». */
function sideText(side, kinds) {
  if (side === null) return tt(TX.adProcNone);
  const out = [],
    P = S.procs || {};
  if (side?.rwy) out.push(tt(TX.adProcRwy, {
    r: String(side.rwy).replace(/^RW/i, '')
  }));
  for (const [key, kind, rec, tkey, trec] of kinds) {
    const id = side?.[key];
    if (!id) continue;
    const r = P[rec];
    out.push(r ? procLabel(kind, r, id) : tt(TX.adProcLost, {
      id: `${kind} ${nameOf(null, id) || id}`
    }));
    const tid = side?.[tkey];
    if (tid) out.push(tt(TX.adProcTrans, {
      t: P[trec]?.transition || String(tid).split('.')[4] || nameOf(P[trec], tid)
    }));
  }
  return out.length ? out.join(' · ') : null;
}
/** Piste et procédures choisies pour le terrain icao, pour sa carte (SPEC § 10) : une ligne par côté du vol que ce terrain est
 *  (départ, arrivée), le choix, et « Changer » vers Carburant (#fuel?focus=dep / arr) ; la Carte n'écrit jamais le choix.
 *  '' pour un terrain qui n'est ni le départ ni l'arrivée du vol. */
export function cardHtml(icao) {
  const f = S.route?.flight,
    r = f?.route;
  if (!f || !icao) return '';
  const v = proceduresOf(f),
    k = up(icao),
    rows = [];
  if (k === up(r?.dep || r?.points?.[0]?.id)) {
    rows.push(['dep', TX.adProcDep, sideText(v.dep, [
      ['sid', 'SID', 'sid', 'trans', 'sidTrans']
    ])]);
  }
  if (k === up(r?.arr || r?.points?.at?.(-1)?.id)) {
    rows.push(['arr', TX.adProcArr, sideText(v.arr, [
      ['star', 'STAR', 'star', 'trans', 'starTrans'],
      ['app', 'APP', 'app', 'appTrans',
        'appTrans'
      ]
    ])]);
  }
  if (!rows.length) return '';
  const change = tt(TX.adProcChange),
    tip = tt(TX.adProcChangeTip);
  return rows.map(([side, label, text]) =>
    `<p class="mp-ad-proc" data-proc="${side}"><b>${esc(tt(label))}</b> : ${esc(text ?? tt(TX.adProcUnset))} <button type="button" class="f-btn" data-go="fuel?focus=${side}" title="${esc(tip)}" aria-label="${esc(tip)}">${esc(change)}</button></p>`
  ).join('');
}
