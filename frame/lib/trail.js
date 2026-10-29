// V3 frame/lib (propriétaire : le cadre) — trace volée du vol courant (progress.actual.trail), en calcul pur : ni page,
// ni stockage, ni réseau. Le cadre l'écrit avec progress.actual (frame/app.js, onFix) ; la Carte la dessine.
//
// Un point : [lat, lon, altFt | null, s] — degrés à 5 décimales (environ 1 m), pieds entiers, s = secondes entières depuis
// started.at du vol. Un point est ajouté à la trace quand l'avion a avancé d'au moins TRAIL_NM depuis le dernier point,
// ou TRAIL_S secondes ont passé, ou la route a tourné d'au moins TRAIL_TURN degrés (virage gardé : le coin reste dans la
// trace). Au-delà de TRAIL_MAX points, le point intérieur dont le retrait déforme le moins la trace (écart au segment de
// ses voisins) est retiré, jamais le premier ni le dernier : la trace garde sa forme, ses virages, ses deux bouts.
// La trace suit la vie de progress.actual : vide à un nouveau départ (une trace d'un autre started.at n'est jamais
// reprise), effacée avec la position à l'arrêt du vol.
// API : next(trail, fix, startedAt) → la trace à écrire ; TRAIL_MAX, TRAIL_NM, TRAIL_S, TRAIL_TURN.

export const TRAIL_MAX = 500;
export const TRAIL_NM = 1;
export const TRAIL_S = 60;
export const TRAIL_TURN = 15;
const TURN_MIN_NM = 0.2; // en deçà, un écart de route est du bruit de position, pas un virage

const R_NM = 3440.065;
const rad = Math.PI / 180;
/** Distance en NM entre deux points [lat, lon]. */
function nm(a, b) {
  const s = Math.sin((b[0] - a[0]) * rad / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin((b[1] - a[1]) * rad / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.min(1, Math.sqrt(s)));
}
/** Route vraie de a vers b, en degrés [0, 360[. */
function bearing(a, b) {
  const y = Math.sin((b[1] - a[1]) * rad) * Math.cos(b[0] * rad),
    x = Math.cos(a[0] * rad) * Math.sin(b[0] * rad) - Math.sin(a[0] * rad) * Math.cos(b[0] * rad) * Math.cos((b[1] - a[1]) * rad);
  return (Math.atan2(y, x) / rad + 360) % 360;
}
/** Écart en NM du point p au segment a–b (plan local autour de p : assez juste à l'échelle d'un écart de trace). */
function offset(p, a, b) {
  const k = Math.cos(p[0] * rad),
    xy = q => [(q[1] - p[1]) * k * 60, (q[0] - p[0]) * 60],
    [ax, ay] = xy(a),
    [bx, by] = xy(b),
    dx = bx - ax,
    dy = by - ay,
    l2 = dx * dx + dy * dy,
    t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}
/** Point de trace d'une position { at, lat, lon, altFt } ; null si elle est illisible ou d'avant le départ. */
function pointOf(fix, startedAt) {
  const t0 = Date.parse(startedAt),
    t = Date.parse(fix?.at);
  if (!Number.isFinite(t0) || !Number.isFinite(t) || t < t0 || !Number.isFinite(fix.lat) || !Number.isFinite(fix.lon)) return null;
  return [Math.round(fix.lat * 1e5) / 1e5, Math.round(fix.lon * 1e5) / 1e5, Number.isFinite(fix.altFt) ? Math.round(fix.altFt) : null,
    Math.round((t - t0) / 1000)
  ];
}
/** Trace lue d'un enregistrement : seulement des points bien formés, dans l'ordre du temps. */
function clean(trail) {
  if (!Array.isArray(trail)) return [];
  const out = [];
  for (const p of trail)
    if (Array.isArray(p) && p.length === 4 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Number.isFinite(p[3]) && p[3] >= 0 &&
      (!out.length || p[3] >= out[out.length - 1][3])) out.push(p);
  return out;
}
/** Trace à écrire avec cette position : la trace donnée, plus la position si elle fait un point (voir l'en-tête),
 *  ramenée à TRAIL_MAX points. trail : la trace lue avec progress.actual du même started.at (sinon [] : nouveau vol). */
export function next(trail, fix, startedAt) {
  const p = pointOf(fix, startedAt),
    out = clean(trail);
  if (!p) return out;
  const last = out[out.length - 1];
  if (last && p[3] < last[3]) return out; // position plus ancienne que la trace : ignorée
  let take = !last || p[3] - last[3] >= TRAIL_S || nm(last, p) >= TRAIL_NM;
  if (!take && out.length >= 2 && nm(last, p) >= TURN_MIN_NM) {
    const turn = Math.abs(((bearing(last, p) - bearing(out[out.length - 2], last)) % 360 + 540) % 360 - 180);
    take = turn >= TRAIL_TURN;
  }
  if (!take) return out;
  out.push(p);
  while (out.length > TRAIL_MAX) {
    let worst = 1,
      min = Infinity;
    for (let i = 1; i < out.length - 1; i++) {
      const d = offset(out[i], out[i - 1], out[i + 1]);
      if (d < min) {
        min = d;
        worst = i;
      }
    }
    out.splice(worst, 1);
  }
  return out;
}
