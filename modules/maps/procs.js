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
import {
  schedule
} from './draw.js';
import {
  runwayAxis
} from '../../frame/lib/wind.js';

/** Teintes des procédures, de jour puis de nuit (utilisateur, 29 octobre : « des couleurs de contraste autres que violet (vert ?
 *  orange ? bleu ?) ») : SID en vert, STAR en orange, approche (et son approche interrompue) en bleu ciel — ni le violet de la
 *  route et des voies hautes, ni le bleu foncé des voies basses. */
export const colOf = origin => {
  const P = MapsRender.palette(!!S?.theme?.dark),
    k = origin === 'missed' ? 'app' : origin;
  return P[k === 'sid' || k === 'star' || k === 'app' ? k : 'app'];
};
/** Sans seuils (page d'essai) : les contraintes et les noms des points s'écrivent à partir de 300 px par degré. */
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
/** Symbole d'une procédure périmée (lue sous un cycle antérieur) : jamais le mot (décision du 29 octobre). */
export const OUTDATED = '⌛';
/** « SID ROYAN6P », suivi de l'état de la source : « X-Plane, local », « Little Navmap, local », puis « ⌛ » quand elle est
 *  périmée (SPEC § 5). */
export function procLabel(kind, rec, id) {
  const tags = [];
  if (rec?.status === 'xplane') tags.push(tt(TX.procX));
  else if (rec?.status === 'lnm') tags.push(tt(TX.procLnm));
  return [`${kind} ${nameOf(rec, id)}`.trim(), ...tags].join(' · ') + (rec?.outdated ? ` ${OUTDATED}` : '');
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
export function place(pl, q, w, h, force) {
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
export const LINE_H = 16;
/** Largeur d'une ligne de morceaux (la police du libellé étant posée). */
const widthOf = (ctx, line) => line.parts.reduce((w, c) => {
  ctx.font = `${c.b ? 700 : 600} 11px Arial,sans-serif`;
  return w + ctx.measureText(c.t).width;
}, 0);

/** Mise en page du chemin à l'écran (projection toC, échelle pxDeg en px par degré) : { segs (traits), dots (points de procédure),
 *  names (libellés « SID NOM » à placer), pts (points à écrire), reserve(pl), labels } ; null sans procédure dessinée. Les
 *  libellés se réservent dans le placeur de la carte (reserve), après ceux de la route : un libellé qui n'a pas de place n'est
 *  pas écrit (le nom d'une procédure l'est toujours). */
export function layout(ctx, toC, pxDeg, zoomOn = null) {
  const path = S.route?.path;
  if (!path?.length || path.every(p => p.origin === 'route')) return null;
  // seuils de la page des seuils (procNames, procCons : layers.js) ; sans eux, 300 px par degré
  const near = zoomOn ? zoomOn('procCons') : pxDeg >= NEAR_PX,
    showNames = zoomOn ? zoomOn('procNames') : true,
    pos = p => num(p.lat) && num(p.lon),
    at = p => ({
      ...toC(+p.lat, +p.lon),
      src: p
    }),
    routePts = path.filter(p => p.origin === 'route' && pos(p)),
    last = routePts.at(-1),
    isEnd = p => p === path[0] || p === last,
    isRwy = p => !!p.rwy || /^RW\d{2}[LRC]?$/.test(p.id || ''),
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
          dash: missed,
          o: p.origin
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
        // jonctions marquées par expandedPath (§ 10.29 c) : un direct, ou un tronçon dont le prédécesseur n'est pas codé, en tireté
        direct = p.join === 'direct' || p.join === 'gap',
        // la route dessine ses propres tronçons ; le terrain et le seuil de la piste se touchent
        skip = (p.origin === 'route' && from?.origin === 'route') || (isRwy(p) && from?.origin === 'route' && isEnd(from)) ||
        (p.origin === 'route' && isEnd(p) && from && isRwy(from)),
        viaTrans = p.origin === 'route' && p.join === 'common' && p.joinPhase === 'trans';
      if (!skip) {
        const seg = {
          a: cur,
          b: q,
          dash: vec || direct || viaTrans || p.phase === 'trans' || missed,
          o: p.origin !== 'route' ? p.origin : from?.origin
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
    if (!showNames) break;
    // ses points hors seuil, sinon (une approche donnée par son entrée : un ou deux points) tous ses points placés ; le nom au
    // milieu de son plus long tronçon, jamais perdu
    let own = path.filter(p => p.origin === origin && pos(p) && !isRwy(p));
    if (own.length < 2) own = path.filter(p => (p.origin === origin || (origin === 'app' && p.origin === 'missed')) && pos(p));
    if (!own.length) continue;
    let q = at(own[0]),
      best = -1;
    for (let i = 1; i < own.length; i++) {
      const a = at(own[i - 1]),
        b = at(own[i]),
        d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d > best) {
        best = d;
        q = {
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
          src: own[i]
        };
      }
    }
    names.push({
      q,
      text: procLabel(kind, rec, id),
      old: !!rec?.outdated,
      origin
    });
  }
  S.lgOutdated = names.some(n => n.old); // la ligne « ⌛ » de la légende
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
        // « ⌛ » en gris (jeton muted), le nom dans la couleur des procédures
        const tail = n.old ? ` ${OUTDATED}` : '';
        L.labels.push({
          r,
          lines: [{
            parts: [{
              t: tail ? n.text.slice(0, -tail.length) : n.text,
              b: true
            }, ...(tail ? [{
              t: tail,
              b: true,
              m: true
            }] : [])]
          }],
          name: true,
          col: colOf(n.origin)
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
            lines,
            col: colOf(q.src?.origin)
          });
        }
      ctx.restore();
    }
  };
  return L;
}

/** Écrit des lignes de morceaux dans le rectangle r (la cartouche du noyau, sans cadre : un liseré du fond autour du texte), souligné
 *  ou surligné (SPEC § 5). */
function drawLines(ctx, lines, r, col) {
  MapsRender.cartouche(ctx, r, {
    lineH: LINE_H,
    halo: S.theme.bg,
    rows: lines.map(line => ({
      runs: line.parts.map(c => ({
        t: c.t,
        color: c.m ? S.theme.muted || col : col,
        font: `${c.b ? 700 : 600} 11px Arial,sans-serif`,
        u: c.u,
        o: c.o,
        deco: col
      }))
    }))
  });
}
/** Dessine la mise en page L (layout) par-dessus la route : traits (liseré du fond puis la teinte de la procédure), points,
 *  libellés. */
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
  ctx.lineWidth = 3;
  for (const s of L.segs) {
    ctx.strokeStyle = colOf(s.o);
    trace(s);
  }
  ctx.setLineDash([]);
  for (const q of L.dots) {
    ctx.beginPath();
    ctx.arc(q.x, q.y, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = S.theme.bg;
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = colOf(q.src?.origin);
    ctx.stroke();
  }
  ctx.restore();
}
/** Libellés de la mise en page L (noms des procédures, puis points et contraintes) : peints en dernier, par-dessus les traits
 *  et les cartouches des voies, pour qu'aucun ne soit couvert. */
export function drawLabels(ctx, L) {
  ctx.save();
  for (const l of L.labels) drawLines(ctx, l.lines, l.r, l.col);
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
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const p of flown) {
    const a = p.alt;
    if (!a || !num(a.ft) || !num(p.nm)) continue;
    // la teinte de la procédure du point (un point de la route qui porte une contrainte : celle de l'approche)
    const col = colOf(p.origin);
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
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
    // le texte quand il reste 40 px depuis le précédent, à une place libre de la coupe (g.taken : libellés des espaces, TOC / TOD,
    // paliers) : au-dessus à droite, à gauche, puis dessous ; sans place, le palier seul (parcours du 30/10, point 15)
    if (x - lastX >= 40) {
      const parts = altParts(a),
        w = parts.reduce((s, c) => (ctx.font = '600 10px Arial,sans-serif', s + ctx.measureText(c.t).width), 0),
        at = v => Math.min(g.H - g.padB - 8, Math.max(g.padT + 8, v)),
        taken = g.taken ||= [],
        box = ([bx, by]) => ({
          x0: bx - 1,
          y0: by - 7,
          x1: bx + w + 1,
          y1: by + 7
        }),
        free = r => r.x0 >= g.padL && r.x1 <= g.W - g.padR && !taken.some(q => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0),
        spot = [
          [x + 8, at(y1 - 12)],
          [x - 8 - w, at(y1 - 12)],
          [x + 8, at(y0 + 12)],
          [x - 8 - w, at(y0 + 12)]
        ].find(q => free(box(q)));
      if (!spot) continue;
      lastX = x;
      taken.push(box(spot));
      let [tx, y] = spot;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      for (const c of parts) {
        ctx.font = '600 10px Arial,sans-serif';
        const cw = ctx.measureText(c.t).width;
        ctx.lineWidth = 3;
        ctx.strokeStyle = S.theme.bg;
        ctx.lineJoin = 'round';
        ctx.strokeText(c.t, tx, y);
        ctx.fillStyle = col;
        ctx.fillText(c.t, tx, y);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = col;
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
/** Fiches choisies d'un côté qui ont une page (S.procs : celles que loadProcedures a lues) : [[sorte, fiche]]. */
const sideRecs = side => {
  const P = S.procs || {};
  return (side === 'dep' ? [
    ['SID', P.sid]
  ] : [
    ['STAR', P.star],
    ['APP', P.app]
  ]).filter(([, r]) => r);
};
/** Adresse publique de la page d'une fiche (source.url d'aerodb, V3 § 10.25) : seulement en https, sinon null. */
const pageUrl = rec => {
  const u = String(rec?.source?.url ?? '').trim();
  return /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : null;
};
/** Liens « Source » d'un côté : la page de chaque fiche choisie, dans un nouvel onglet ; « Source STAR », « Source APP » quand les
 *  deux en ont une. '' sans page. */
function sourceLinks(side) {
  const got = sideRecs(side).map(([k, r]) => [k, pageUrl(r)]).filter(([, u]) => u),
    word = tt(TX.adProcSource),
    tip = tt(TX.adProcSourceTip);
  return got.map(([k, u]) => ` <a class="mp-ad-src" href="${esc(u)}" target="_blank" rel="noopener noreferrer" title="${esc(tip)}">${esc(got.length > 1 ? `${word} ${k}` : word)}</a>`).join('');
}
/** Infobulle d'un côté dont les fiches n'ont pas de page publique (EAD, lecture d'image, saisie) : le nom de leur document. */
function docTitle(side) {
  const docs = [...new Set(sideRecs(side).filter(([, r]) => !pageUrl(r)).map(([, r]) => String(r.source?.file || r.source?.ref ||
    r.source?.name || '').trim()).filter(Boolean))];
  return docs.length ? ` title="${esc(docs.join(' · '))}"` : '';
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
    tip = tt(TX.adProcChangeTip),
    pick = tt(TX.adProcChoose),
    pickTip = tt(TX.adProcChooseTip);
  // « Choisir sur la carte » : le mode choix de ce côté, sur la famille qui manque (choose.js, sans rechargement) ; pleine largeur
  // sur un téléphone (style.js) ; « Changer » ouvre Carburant sur la ligne du côté
  return rows.map(([side, label, text]) =>
    `<p class="mp-ad-proc" data-proc="${side}"${docTitle(side)}><b>${esc(tt(label))}</b> : ${esc(text ?? tt(TX.adProcUnset))}${sourceLinks(side)} <button type="button" class="f-btn" data-go="fuel?focus=${side}" title="${esc(tip)}" aria-label="${esc(tip)}">${esc(change)}</button><button type="button" class="f-btn primary mp-ad-choose" data-choose="${side}" data-icao="${esc(k)}" title="${esc(pickTip)}">${esc(pick)}</button></p>`
  ).join('');
}

// ---------------------------------------------------------------- les pistes en vecteur de seuil (V3_SPECIFICATION § 10.30)
/** Longueur du vecteur (px écran, jamais géographique). */
const VEC_PX = 24;
const rwNo = id => String(id ?? '').trim().toUpperCase().replace(/^RW/, '');
/** Déclinaison (degrés, + à l'est) d'un terrain d'après sa fiche (les terrains lus pour la vue, indexés une fois par lecture) ; null
 *  sinon. */
const magVars = new WeakMap();
const magVarOf = icao => {
  const list = S.data?.data?.aerodromes || [];
  let m = magVars.get(list);
  if (!m) magVars.set(list, m = new Map(list.filter(a => num(a?.magVar)).map(a => [String(a.icao || a.id || '').toUpperCase(), +a
    .magVar
  ])));
  return m.get(String(icao || '').toUpperCase()) ?? null;
};
/** Vecteurs de seuil des pistes du vol (V3 § 10.30) : toutes les pistes connues des terrains de départ et d'arrivée (S.runways, lues
 *  avec le vol), celle choisie dans route.procedures en gras et dans la teinte de son côté, les autres fines ; puis celles des autres
 *  terrains dessinés, fines ; seulement à partir du seuil de zoom de la compagnie (S.runwayZoom, readSettings) ; [] en dessous. zoom :
 *  le zoom réel de la vue (MapsRender.zoomOf). */
export function runwayArrows(toC, zoom) {
  if (!(zoom >= S.runwayZoom)) return [];
  const f = S.route?.flight,
    v = f ? proceduresOf(f) : null,
    r = f?.route || {},
    P = S.procs || {},
    out = [];
  for (const [side, icao] of [
      ['dep', r.dep || r.points?.[0]?.id],
      ['arr', r.arr || r.points?.at?.(-1)?.id]
    ]) {
    const list = S.runways?.get(String(icao || '').toUpperCase()) || [],
      chosen = rwNo(v?.[side]?.rwy),
      col = colOf(side === 'dep' ? 'sid' : P.app ? 'app' : 'star');
    for (const rw of list) {
      const on = !!chosen && rwNo(rw.id) === chosen,
        a = arrowOf(toC, rw, list, magVarOf(icao), on ? col : S.theme.muted);
      if (!a) continue;
      a.side = side;
      a.lw = on ? 3.5 : 2;
      out.push(a);
    }
  }
  // les autres terrains dessinés (S.adHits du dernier dessin), leurs pistes lues à la demande (wantDrawnRunways), fines
  const own = new Set([r.dep, r.arr].filter(Boolean).map(x => String(x).toUpperCase()));
  for (const h of S.adHits || []) {
    const icao = String(h.a?.icao || '').toUpperCase(),
      list = S.runways?.get(icao);
    if (!icao || own.has(icao) || !list?.length) continue;
    for (const rw of list) {
      const a = arrowOf(toC, rw, list, num(h.a.magVar) ? +h.a.magVar : null, S.theme.muted);
      if (!a) continue;
      a.lw = 1.6;
      out.push(a);
    }
  }
  return out;
}
/** Les pistes des terrains : une seule réserve, S.runways (Map OACI → fiches d'aerodb ; undefined : demandée, [] : rien), un seul
 *  chemin (refonte R-M4) : les codes pas encore demandés partent à aerodb en un lot, la carte est redessinée à l'arrivée du lot. */
export function wantRunways(icaos) {
  const A = S?.ctx.aerodb;
  if (!A?.runways) return;
  const M = S.runways ||= new Map(),
    ask = [...new Set((icaos || []).map(i => String(i || '').toUpperCase()).filter(i => /^[A-Z0-9]{4}$/.test(i) && !M.has(i)))];
  if (!ask.length) return;
  for (const i of ask) M.set(i, undefined);
  Promise.all(ask.map(i => Promise.resolve().then(() => A.runways(i)).then(l => [i, l || []], () => [i, []]))).then(got => {
    if (!S || S.runways !== M) return;
    for (const [i, l] of got) M.set(i, l);
    schedule();
  });
}
/** Les pistes des terrains dessinés au dernier dessin, de près (au-dessus de runwayZoom). */
export function wantDrawnRunways(zoom) {
  if (zoom >= S.runwayZoom) wantRunways((S.adHits || []).map(h => h.a?.icao));
}
/** Vecteur de seuil d'une piste rw (fiche d'aerodb) parmi les pistes list du terrain : { a (le seuil), b (VEC_PX plus loin le long du
 *  relèvement vrai, sur l'écran), name, col } ; null sans position ni relèvement. Partagé avec le mode « choisir sur la carte »
 *  (choose.js), qui les dessine toutes. */
export function arrowOf(toC, rw, list, magVar, col) {
  if (!num(rw?.lat) || !num(rw?.lon)) return null;
  const brg = runwayAxis(rw, {
    list,
    magVar
  });
  if (brg === null) return null;
  // le sens sur l'écran : un point 1 NM plus loin, projeté ; le vecteur a toujours VEC_PX, quel que soit le zoom
  const end = ahead({
      lat: +rw.lat,
      lon: +rw.lon
    }, brg, 1),
    a = toC(+rw.lat, +rw.lon),
    e = toC(end.lat, nearLon(end.lon, +rw.lon)),
    len = Math.hypot(e.x - a.x, e.y - a.y) || 1;
  return {
    a,
    b: {
      x: a.x + (e.x - a.x) / len * VEC_PX,
      y: a.y + (e.y - a.y) / len * VEC_PX
    },
    name: rwNo(rw.id),
    col
  };
}
/** Place du numéro d'un vecteur de seuil : en queue, derrière le seuil (la police du dessin). */
function numBox(ctx, w) {
  const dx = w.b.x - w.a.x,
    dy = w.b.y - w.a.y,
    len = Math.hypot(dx, dy) || 1,
    nx = w.a.x - dx / len * 11,
    ny = w.a.y - dy / len * 11;
  ctx.font = `${(w.lw || 2) > 2.5 ? 700 : 600} 11px Arial,sans-serif`;
  const tw = ctx.measureText(w.name).width;
  return {
    x0: nx - tw / 2 - 1,
    y0: ny - 7,
    x1: nx + tw / 2 + 1,
    y1: ny + 7
  };
}
/** Réserve dans la passe de collision la place des numéros de piste avant les balises (l'utilisateur, 30/10 : « a minima le numéro
 *  de piste au seuil » ; une balise cachée coûte moins qu'une piste muette) : w.num = la place prise, ou false. */
export function reserveRunways(ctx, arrows, pl) {
  if (!arrows?.length || !pl) return;
  ctx.save();
  for (const w of arrows) {
    const r = numBox(ctx, w);
    w.num = pl.take(r) ? r : false;
  }
  ctx.restore();
}
/** Dessine les vecteurs de seuil : un trait court du seuil vers le sens de la piste (épaisseur lw, liseré du fond), une petite pointe
 *  au bout, l'indicatif en queue, derrière le seuil (à la place réservée par reserveRunways, sinon à une place libre de pl). */
export function drawRunways(ctx, arrows, pl = null) {
  if (!arrows?.length) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const w of arrows) {
    const dx = w.b.x - w.a.x,
      dy = w.b.y - w.a.y,
      len = Math.hypot(dx, dy) || 1,
      ux = dx / len,
      uy = dy / len,
      lw = w.lw || 2,
      h = 5 + lw,
      base = {
        x: w.b.x - ux * h,
        y: w.b.y - uy * h
      };
    for (const [col, k] of [
        [S.theme.bg, lw + 3],
        [w.col, lw]
      ]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = k;
      ctx.beginPath();
      ctx.moveTo(w.a.x, w.a.y);
      ctx.lineTo(base.x, base.y);
      ctx.stroke();
    }
    ctx.fillStyle = w.col;
    ctx.strokeStyle = S.theme.bg;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(w.b.x, w.b.y);
    ctx.lineTo(base.x - uy * h * .55, base.y + ux * h * .55);
    ctx.lineTo(base.x + uy * h * .55, base.y - ux * h * .55);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    // l'indicatif en queue, derrière le seuil
    ctx.font = `${lw > 2.5 ? 700 : 600} 11px Arial,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const nx = w.a.x - ux * 11,
      ny = w.a.y - uy * 11,
      tw = ctx.measureText(w.name).width;
    // dans la passe de collision de la carte : un numéro qui n'a pas de place n'est pas écrit (le vecteur reste) ; réservé d'avance
    // (reserveRunways), il est écrit à sa place
    if (w.num === false) continue;
    if (!w.num && pl && !pl.take({
        x0: nx - tw / 2 - 1,
        y0: ny - 7,
        x1: nx + tw / 2 + 1,
        y1: ny + 7
      })) continue;
    ctx.lineWidth = 3;
    ctx.strokeStyle = S.theme.bg;
    ctx.strokeText(w.name, nx, ny);
    ctx.fillStyle = w.col;
    ctx.fillText(w.name, nx, ny);
  }
  ctx.restore();
}
