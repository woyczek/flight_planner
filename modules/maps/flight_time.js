// V3 maps — le vol dans le temps (modules/maps/SPEC.md § 13) : heures estimées des points et position prévue, dérivées par
// frame/lib/current_flight.js (jamais lues dans progress) ; pendant un vol démarré, la position réelle du cadre
// (progress.actual), sa trace, l'écart à la position prévue, la ligne de progression des notes, « Suivre ».

import {
  S,
  esc,
  tt,
  setPressed,
  dLon,
  level,
  nmTxt,
  flownPts
} from './state.js';
import {
  nearLon
} from '../../frame/lib/geo.js';
import {
  isStarted,
  etaOf,
  plannedPositionAt
} from '../../frame/lib/current_flight.js';
import {
  fmtZ,
  fmtZLocal
} from '../../frame/lib/time.js';
import {
  TX
} from './texts.js';
import {
  TRAIL_MAX
} from '../../frame/lib/trail.js';
import {
  schedule
} from './draw.js';
import {
  header,
  writeNotes,
  noteOnce,
  syncButtons
} from './screen.js';
import {
  drawCursor
} from './profile_view.js';

export {
  isStarted
};
/** Position réelle plus vieille que 2 min : grisée ; trace gardée : les 30 dernières minutes. */
const STALE_MS = 120e3,
  TRAIL_MS = 30 * 60e3;
/** Vrai si le vol démarré est arrivé (progress.phase « arrived »). */
export const isArrived = f => isStarted(f) && f?.progress?.phase === 'arrived';
/** Même route (points, niveau, départ) : seule la progression a changé. */
export const sameRoute = (a, b) => !!a && !!b && JSON.stringify(sigOf(a)) === JSON.stringify(sigOf(b));
/** Ce qui change la route dessinée : les points, le niveau, le départ, la route et les terrains, les procédures choisies et le
 *  profil prévu par Carburant (profile.path suit les procédures). */
const sigOf = f => [f.route?.points, f.level?.ft, f.started?.at, f.route?.dep, f.route?.arr, f.route?.procedures, f.profile?.path];
/** Position valide { lat, lon, … } d'un objet, sinon null. */
const posOf = p => p && Number.isFinite(+p.lat) && Number.isFinite(+p.lon) ? {
  ...p,
  lat: +p.lat,
  lon: +p.lon
} : null;
/** Trace volée écrite par le cadre (progress.actual.trail : [[lat, lon, altFt | null, s depuis started.at], …], INTEGRATION § 6) en
 *  positions { lat, lon, altFt, at } ; [] sans trace ou sans started.at lisible. */
const trailOf = (f, t0) => {
  const tr = f?.progress?.actual?.trail;
  if (!Array.isArray(tr) || !Number.isFinite(t0)) return [];
  return tr.filter(q => Array.isArray(q) && Number.isFinite(+q[0]) && Number.isFinite(+q[1]) && Number.isFinite(+q[3])).map(q => ({
    lat: +q[0],
    lon: +q[1],
    altFt: q[2] === null || q[2] === undefined ? null : +q[2],
    at: new Date(t0 + q[3] * 1000).toISOString()
  }));
};
/** Position réelle de ce vol : progress.actual, sauf une position d'avant started.at (celle du vol précédent) ; null sinon. */
const actualOf = f => {
  const a = posOf(f?.progress?.actual),
    t0 = Date.parse(f?.started?.at || '');
  return a && !(Number.isFinite(t0) && Date.parse(a.at || '') < t0) ? a : null;
};

/** Progression relue seule (même route) : enregistrement, trace, notes, carte, profil et caméra. */
export function progressOnly(f) {
  S.route = {
    ...S.route,
    flight: f,
    updated: f?.updated_at || ''
  };
  progressUpdate();
  schedule();
  drawCursor();
}
/** Trace gardée en mémoire, ligne de progression, Suivre ; hors d'un vol démarré, tout s'efface. */
export function progressUpdate() {
  const f = S.route.flight,
    on = isStarted(f),
    t0 = Date.parse(f?.started?.at || '');
  header(); // « vol prévu » devient « vol en cours » dans le titre de la poignée
  syncButtons(); // Suivre : seulement pendant un vol démarré et pas arrivé
  if (!on || isArrived(f)) {
    if (!on) S.trail = [];
    if (S.follow) setFollow(false);
  }
  if (!on) {
    S.progHtml = '';
    return writeNotes();
  }
  const a = actualOf(f),
    now = Date.now(),
    // la trace écrite par le cadre (progress.actual.trail, frame/lib/trail.js) : tout le vol depuis started.at, relue à chaque
    // lecture (un changement d'onglet ne la perd plus) ; la Carte n'y ajoute que ses positions plus récentes que son dernier point
    own = trailOf(f, t0),
    last = own.length ? Date.parse(own.at(-1).at) : -Infinity,
    mine = [...(S.trail || []), ...(a ? [a] : [])].filter(p => !p.at || !Number.isFinite(t0) || Date.parse(p.at) >=
      t0) // rien du vol précédent
    .filter(p => p.at && Date.parse(p.at) > last && now - Date.parse(p.at) <= TRAIL_MS);
  S.trail = [...own, ...mine].filter((p, i, all) => !i || p.lat !== all[i - 1].lat || p.lon !== all[i - 1].lon).slice(-(TRAIL_MAX + 400));
  const st = progressState();
  S.progHtml = progressHtml(st);
  writeNotes();
  if (!st.actual && !isArrived(f)) noteOnce('gps', tt(TX.progNoPos)); // une fois par montage ; la ligne et son bouton restent
  if (S.follow && st.actual && S.map) {
    S.selfMove = true;
    S.map.once('moveend', () => {
      if (S) S.selfMove = false;
    });
    S.map.easeTo({
      center: [nearLon(st.actual.lon, S.map.getCenter().lng), st.actual.lat], // la copie du monde de la vue
      duration: 400
    });
  }
}
/** Projection d'une position sur la route : { nm (depuis le départ), xtk (écart latéral, NM, positif à droite), total }. */
function alongRoute(p) {
  const pts = flownPts();
  if (pts.length < 2 || !p) return null;
  const cum = MapsRender.distances(pts);
  let best = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i],
      b = pts[i + 1],
      k = Math.cos((a.lat + b.lat) / 2 * Math.PI / 180),
      bx = dLon(b.lon, a.lon) * k * 60, // modulo 360 : la route peut passer la ligne de changement de date
      by = (b.lat - a.lat) * 60,
      px = dLon(p.lon, a.lon) * k * 60,
      py = (p.lat - a.lat) * 60,
      L2 = bx * bx + by * by || 1e-9,
      t = Math.max(0, Math.min(1, (px * bx + py * by) / L2)),
      d = Math.hypot(px - t * bx, py - t * by);
    if (!best || d < best.d) best = {
      d,
      s: cum[i] + t * (cum[i + 1] - cum[i]),
      side: bx * py - by * px < 0 ? 1 : -1 // à droite du sens de vol : produit vectoriel négatif
    };
  }
  return {
    nm: best.s,
    xtk: best.d * best.side,
    total: cum[cum.length - 1]
  };
}
/** État de la progression : position prévue (dérivée), position réelle, écart en distance et en temps, écart latéral,
 *  péremption. */
function progressState() {
  const f = S.route.flight,
    pl = plannedPositionAt(f, Date.now(), {
      path: flownPts()
    }),
    planned = pl ? {
      ...pl,
      altFt: pl.phase === 'taxi' ? 0 : null
    } : null,
    actual = actualOf(f),
    ageMs = actual?.at ? Date.now() - Date.parse(actual.at) : 0,
    pa = actual ? alongRoute(actual) : null,
    total = pa?.total ?? (flownPts().length > 1 ? MapsRender.distances(flownPts()).pop() : 0),
    pp = planned ? {
      nm: planned.nmFromDep,
      total
    } : null,
    gs = +actual?.gsKt > 30 ? +actual.gsKt : 250,
    ahead = pa && pp ? pa.nm - pp.nm : null;
  return {
    planned,
    actual,
    stale: !!actual && ageMs > STALE_MS,
    ageMin: Math.round(ageMs / 60e3),
    pa,
    pp,
    aheadNm: ahead,
    aheadMin: ahead == null ? null : ahead / gs * 60
  };
}
/** Ligne de progression (la première des notes, SPEC § 13.2) : avance ou retard, écart latéral, altitude réelle et prévue,
 *  source ; sans position réelle, le bouton qui active le GPS (ctx.live.enable) ; arrivé ; déroutement. */
function progressHtml(st) {
  const f = S.route.flight,
    div = f?.started?.diverted ? `<p>${esc(tt(TX.progDiverted, { a: f.route?.arr || '?' }))}</p>` : '';
  if (isArrived(f)) return `<p><b>${esc(tt(TX.progArrived))}</b></p>${div}`;
  if (!st.actual) return `<p class="f-muted">${esc(tt(TX.progNoPos))}${S.ctx.live?.enable ? ` <button type="button" class="f-btn" data-live>${esc(tt(TX.progEnable))}</button>` : ''}</p>${div}`;
  const parts = [];
  if (st.aheadMin != null) {
    const m = Math.round(Math.abs(st.aheadMin)),
      d = nmTxt(Math.abs(st.aheadNm));
    parts.push(m < 1 ? tt(TX.progOnTime) : tt(st.aheadMin > 0 ? TX.progAhead : TX.progLate, {
      m,
      d
    }));
  }
  if (st.pa) {
    const x = Math.abs(st.pa.xtk);
    parts.push(x < .5 ? tt(TX.progOnRoute) : tt(TX.progSide, {
      d: nmTxt(x),
      s: tt(st.pa.xtk > 0 ? TX.progRight : TX.progLeft)
    }));
  }
  if (+st.actual.altFt > 0 && st.pa && S.prof) {
    const pl = MapsProfile.at(S.prof, st.pa.nm * (S.prof.total / (st.pa.total || 1))).alt;
    if (pl != null) parts.push(tt(TX.progAlt, {
      a: level(+st.actual.altFt),
      p: level(pl)
    }));
  }
  const stale = st.stale ? ` <span class="mp-stale">(${esc(tt(TX.progStale, { m: st.ageMin }))})</span>` : '',
    // source de la position (progress.actual.source, posée par le cadre) ; une valeur inconnue : rien
    src = Object.hasOwn(TX.progSources, st.actual.source) ? ` <span class="f-muted">· ${esc(tt(TX.progFrom, {
      s: tt(TX.progSources[st.actual.source])
    }))}</span>` : '';
  return `<p><b>${esc(parts[0] || '')}</b>${parts.length > 1 ? ` · ${esc(parts.slice(1).join(' · '))}` : ''}${stale}${src}</p>${div}`;
}
/** Avion vu de dessus orienté au cap (degrés vrais), plein ou creux, liseré du fond ; la POINTE de la flèche est sur la position
 *  (utilisateur, 29 octobre : « c'est la pointe de la flèche qui doit indiquer la position, pas son centre »). */
export function drawPlane(ctx, c, hdg, col, filled, r = 9) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate((+hdg || 0) * Math.PI / 180);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(r * .75, r * 1.8);
  ctx.lineTo(0, r * 1.35);
  ctx.lineTo(-r * .75, r * 1.8);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = S.theme.bg;
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  if (filled) ctx.fill();
  ctx.stroke();
  ctx.restore();
}
/** Texte avec liseré du fond. */
function haloText(ctx, t, x, y, col) {
  ctx.save();
  ctx.font = '700 12px Arial,sans-serif';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = S.theme.bg;
  ctx.lineWidth = 3;
  ctx.strokeText(t, x, y);
  ctx.fillStyle = col;
  ctx.fillText(t, x, y);
  ctx.restore();
}
/** Points de la route pour le dessin, avec leur heure estimée de près (300 px par degré et plus) : « ETA 14:52Z », l'heure
 *  locale de l'appareil en plus au départ et à l'arrivée ; placées par render.js avec les libellés de la route (SPEC § 13.2). */
export function withEta(route, pxDeg) {
  if (S.ctx.query?.mission || pxDeg < 300) return route;
  const eta = etaOf(S.route.flight, Date.now(), {
    path: flownPts()
  });
  if (!eta) return route;
  const last = route.length - 1;
  return route.map((p, i) => {
    const at = (eta[i]?.id === p.id ? eta[i] : eta.find(e => e.id === p.id))?.at;
    return at ? {
      ...p,
      eta: `ETA ${i === 0 || i === last ? fmtZLocal(at) : fmtZ(at)}`
    } : p;
  });
}
/** Route vraie de la route au point à nm du départ (pour orienter la position prévue). */
function trackAt(nm) {
  const pts = flownPts(),
    cum = MapsRender.distances(pts);
  for (let i = 0; i < pts.length - 1; i++)
    if (nm <= cum[i + 1] || i === pts.length - 2) return MapsRender.trackOf(pts[i], pts[i + 1]);
  return 0;
}
/** Progression sur la carte : trace pointillée, position prévue (avion creux, « prévu 14:32Z »), position réelle (pleine). */
export function drawProgress(ctx, toC) {
  const st = progressState(),
    acc = S.theme.accent,
    real = st.stale ? S.theme.muted : MapsRender.palette(!!S.theme.dark).actual,
    ref = S.route.points[0]?.lon ?? 0;
  if (S.trail?.length > 1) {
    ctx.save();
    ctx.strokeStyle = real;
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    S.trail.forEach((p, i) => {
      const q = toC(p.lat, nearLon(p.lon, ref));
      i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
    });
    ctx.stroke();
    ctx.restore();
  }
  if (st.planned && st.planned.phase !== 'arrived') {
    const q = toC(st.planned.lat, nearLon(st.planned.lon, ref));
    drawPlane(ctx, q, st.pp ? trackAt(st.pp.nm) : 0, acc, false);
    haloText(ctx, tt(TX.progPlanned, {
      t: fmtZ(new Date().toISOString())
    }), q.x + 12, q.y - 12, acc);
  }
  if (st.actual) {
    const q = toC(st.actual.lat, nearLon(st.actual.lon, ref)),
      tr = S.trail || [],
      prev = tr.length > 1 ? tr[tr.length - 2] : null,
      hdg = Number.isFinite(+st.actual.trackDeg) ? +st.actual.trackDeg : prev ? MapsRender.trackOf(prev, st.actual) : 0;
    drawPlane(ctx, q, hdg, real, true, 10);
  }
}
/** Profil : position prévue (cercle) à la distance et à l'altitude prévues, position réelle (point plein). */
export function drawProgressProfile(ctx) {
  const st = progressState(),
    g = S.geo;
  if (!g || !S.prof) return;
  const k = st.pa?.total ? S.prof.total / st.pa.total : st.pp?.total ? S.prof.total / st.pp.total : 0,
    y = ft => g.padT + (g.H - g.padT - g.padB) * (1 - (Math.min(Math.max(ft, g.bottom), g.top) - g.bottom) / (g.top - g.bottom));
  ctx.save();
  if (st.pp && k && st.planned.phase !== 'arrived') {
    const s = st.pp.nm * k,
      alt = st.planned.altFt === 0 ? MapsProfile.at(S.prof, 0).terrain ?? 0 : MapsProfile.at(S.prof, s).alt;
    if (alt != null) {
      ctx.beginPath();
      ctx.arc(MapsProfile.xOf(g, s), y(alt), 6, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = S.theme.accent;
      ctx.stroke();
    }
  }
  if (st.pa && k && +st.actual.altFt > 0) {
    ctx.beginPath();
    ctx.arc(MapsProfile.xOf(g, st.pa.nm * k), y(+st.actual.altFt), 6, 0, Math.PI * 2);
    ctx.fillStyle = st.stale ? S.theme.muted : MapsRender.palette(!!S.theme.dark).actual;
    ctx.fill();
  }
  ctx.restore();
}
/** « Suivre » : la carte reste centrée sur la position réelle à chaque mise à jour ; un mouvement de l'utilisateur l'arrête. */
export function setFollow(on) {
  S.follow = on;
  setPressed(S.followBtn, on);
  if (on) {
    S.userMoved = false;
    progressUpdate();
  }
}
