// Fuel — a direct to a point on instruction of the controller (SOG-0088; the ergonomist's GO of 12 Nov 2026, his answers (a) (b) (c)).
// Pure: no screen, no reading, no writing. module.js gives the route, the anchor (where the direct starts) and the target; this file
// says what the route becomes, what is skipped (and what leaves with it: a time on area, a mission lock), and refuses what must be.
//   · the anchor: the real position (< 2 min), else the planned position, else the last point passed according to the plan; it enters
//     the route as a point in ICAO coordinates (to the minute) after the points already passed (none for the last point passed);
//   · a target on the remaining route: the points between the anchor and it are skipped, the rest follows as it is;
//   · a target off the route: inserted, then the route resumes at the first remaining point after its projection (another one may be
//     chosen among the remaining points);
//   · a target off the route is ALLOWED, however far (the user, 13 Nov: « le contrôle peut donner un direct vers un point autre que la
//     route. un warn, avec la distance à la route »): the plan carries `off`, its distance to the route (NM), said by the screen;
//   · a point of the route is found by its id or by its mission name (« PT4 » for a point written in coordinates);
//   · refused: a point already passed, an unknown point, no route.
import {
  rhumbNm
} from '../../frame/lib/geo.js';

/** A position on the route: the leg (i: from points[i] to points[i + 1]) whose segment is nearest, the fraction t along it and the
 *  cross-track distance (NM, local plane: enough at the scale of a leg). null without two positioned points. */
export function projectOnRoute(points, pos) {
  const P = (points || []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon));
  if (P.length < 2 || !Number.isFinite(+pos?.lat) || !Number.isFinite(+pos?.lon)) return null;
  let best = null;
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i],
      b = P[i + 1],
      k = Math.cos(((+a.lat + +b.lat) / 2) * Math.PI / 180),
      xy = q => [(+q.lon - +a.lon) * 60 * k, (+q.lat - +a.lat) * 60],
      [bx, by] = xy(b),
      [px, py] = xy(pos),
      L2 = bx * bx + by * by,
      t = L2 > 0 ? Math.max(0, Math.min(1, (px * bx + py * by) / L2)) : 0,
      d = Math.hypot(px - bx * t, py - by * t);
    if (!best || d < best.d - 1e-9) best = {
      i,
      t,
      d
    };
  }
  return best;
}

/** The distance (NM, by compass, leg after leg) from `from` through `pts`. */
const along = (from, pts) => pts.reduce((a, p, i) => a + rhumbNm(i ? pts[i - 1] : from, p), 0);

/** The direct: { ok: true, points, skipped: [{ id, lock, hold }], resume, choices, nmBefore, nmAfter, holdsLeft, locksLeft, off } or
 *  { ok: false, why: 'route' | 'passed' | 'unknown' | 'anchor' }. off: the distance of an off-route target to the route (NM), 0 on it.
 *  route: { points, holds, locks } (the flight's) ; anchor: { kind: 'actual' | 'planned' | 'passed', lat, lon, id? } ; target:
 *  { id, lat, lon } ; resume (off-route only): the index (in points) where the route resumes, else the first after the projection ;
 *  coord(lat, lon): the ICAO name of a position (route_text icaoCoord). */
export function planDirect(route, anchor, target, {
  resume = null,
  coord
} = {}) {
  const pts = (route?.points || []).filter(p => p && Number.isFinite(+p.lat) && Number.isFinite(+p.lon));
  if (pts.length < 2) return {
    ok: false,
    why: 'route'
  };
  const name = String(target?.id || '').toUpperCase(),
    // a point of the route by its id or its mission name (SOG-0088 refused: « le direct PT m'est refusé … c'est sur la route »)
    named = p => String(p.id || '').toUpperCase() === name || String(p.mission || '').toUpperCase() === name;
  // the anchor: the index of the last point passed (pass) and, for a position, its point
  let pass, pos = null;
  if (anchor?.kind === 'passed') pass = Math.max(0, Math.min(pts.length - 2, +anchor.index || 0));
  else {
    const pr = projectOnRoute(pts, anchor);
    if (!pr) return {
      ok: false,
      why: 'anchor'
    };
    pass = pr.i;
    pos = {
      id: coord ? coord(+anchor.lat, +anchor.lon) : 'POS',
      lat: +anchor.lat,
      lon: +anchor.lon
    };
  }
  const from = pos || pts[pass],
    rest = pts.slice(pass + 1),
    nmBefore = along(from, rest);
  // the target on the remaining route (the first of its name after the anchor)
  const j = pts.findIndex((p, k) => k > pass && named(p));
  let next, skipped, choices = [],
    resumeAt = null,
    off = 0;
  if (j > 0) {
    next = [...pts.slice(0, pass + 1), ...(pos ? [pos] : []), ...pts.slice(j)];
    skipped = pts.slice(pass + 1, j);
  } else {
    if (pts.slice(0, pass + 1).some(named)) return {
      ok: false,
      why: 'passed'
    };
    if (!Number.isFinite(+target?.lat) || !Number.isFinite(+target?.lon)) return {
      ok: false,
      why: 'unknown'
    };
    const tp = {
      id: name,
      lat: +target.lat,
      lon: +target.lon
    };
    // never refused for its distance (SOG-0088, 13 Nov): its distance to the route is said
    const pt = projectOnRoute(pts, tp);
    off = pt ? Math.round(pt.d * 10) / 10 : 0;
    // where the route resumes: the first remaining point after the projection of the target (never the anchor's leg start), or the
    // pilot's choice among the remaining points (the arrival comprised)
    const first = Math.max(pass + 1, pt ? pt.i + 1 : pass + 1);
    choices = pts.map((p, k) => k).filter(k => k > pass);
    const k = Number.isInteger(resume) && choices.includes(resume) ? resume : first;
    next = [...pts.slice(0, pass + 1), ...(pos ? [pos] : []), tp, ...pts.slice(k)];
    skipped = pts.slice(pass + 1, k);
    resumeAt = k;
  }
  const H = route?.holds && typeof route.holds === 'object' ? route.holds : {},
    gone = new Set(skipped.map(p => String(p.id || '').toUpperCase())),
    holdsLeft = Object.fromEntries(Object.entries(H).filter(([k]) => !gone.has(k))),
    locksLeft = (Array.isArray(route?.locks) ? route.locks : []).filter(l => !gone.has(String(l?.id || '').toUpperCase()));
  return {
    ok: true,
    points: next,
    skipped: skipped.map(p => ({
      id: String(p.id || ''),
      // the name the pilot knows (the mission's « PT4 » for a point in coordinates), as the Map writes it
      name: String(p.mission || H[String(p.id || '').toUpperCase()]?.name || p.id || '').slice(0, 40),
      lock: p.lock === 'mission' ? String(p.mission || p.id || '') : '',
      hold: +H[String(p.id || '').toUpperCase()]?.count || 0
    })),
    resume: j > 0 ? j : resumeAt,
    choices,
    nmBefore,
    nmAfter: along(from, next.slice(pass + 1 + (pos ? 1 : 0))),
    holdsLeft,
    locksLeft,
    off
  };
}
