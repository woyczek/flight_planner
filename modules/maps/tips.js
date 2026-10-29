// V3 maps — ce qui est sous le doigt ou la souris (modules/maps/SPEC.md § 6.4, § 10, § 11) : l'infobulle légère (barbule de
// vent, cartouche de voie, libellé d'espace, balise), les vents en altitude de la route, et le toucher sur la carte (terrain,
// point de report, infobulle, curseur sur la route, liste des espaces du point).

import {
  S,
  keep,
  esc,
  tt,
  got,
  onMission,
  outLon,
  level,
  keptRoute
} from './state.js';
import {
  unwrapLons
} from '../../frame/lib/geo.js';
import {
  fmtZ
} from '../../frame/lib/time.js';
import {
  TX
} from './texts.js';
import {
  projNow
} from './draw.js';
import {
  toggleModes
} from './layers.js';
import {
  setCursor
} from './profile_view.js';
import {
  showLvAt,
  closeLv
} from './lv.js';
import {
  adAt,
  adHover,
  pinAd,
  previewAd,
  vrpTap
} from './vfr.js';

// ---------------------------------------------------------------- infobulle
/** Infobulle de survol : deux lignes, plus la ligne grisée « Aussi ici : … » des espaces écartés. */
export const hoverHtml = (a, b, c) => `<div><b>${esc(a)}</b></div>${b ? `<div>${esc(b)}</div>` : ''}${c ? `<div class="mp-also">${esc(c)}</div>` : ''}`;
/** Infobulle légère qui suit le pointeur : à 12 px, jamais dessous, retenue dans le cadre (carte ou profil) ; écritures
 *  seulement quand la valeur change. */
export function followTip(tip, box, x, y, html) {
  if (tip.innerHTML !== html) tip.innerHTML = html;
  if (!tip.classList.contains('mp-hover')) tip.classList.add('mp-hover');
  if (tip.hidden) tip.hidden = false;
  const r = box.getBoundingClientRect(),
    w = tip.offsetWidth,
    h = tip.offsetHeight,
    G = 12;
  let left = x + G,
    top = y + G;
  if (left + w > r.width - 4) left = x - G - w;
  if (top + h > r.height - 4) top = y - G - h;
  left = `${Math.round(Math.max(4, Math.min(r.width - w - 4, left)))}px`;
  top = `${Math.round(Math.max(4, Math.min(r.height - h - 4, top)))}px`;
  if (tip.style.left !== left) tip.style.left = left;
  if (tip.style.top !== top) tip.style.top = top;
}
/** Carte posée dans un cadre à (x, y), au-dessus du doigt sinon dessous (la carte d'un point de la route) ; reste jusqu'au
 *  toucher suivant ; écrite seulement si elle change. */
export function showTip(tip, box, x, y, html) {
  if (tip.classList.contains('mp-hover')) tip.classList.remove('mp-hover');
  if (tip.innerHTML !== html) tip.innerHTML = html;
  tip.hidden = false;
  const r = box.getBoundingClientRect(),
    w = tip.offsetWidth,
    h = tip.offsetHeight;
  tip.style.left = `${Math.max(4, Math.min(r.width - w - 4, x + 10))}px`;
  tip.style.top = `${Math.max(4, Math.min(r.height - h - 4, y - h - 10 < 4 ? y + 14 : y - h - 10))}px`;
}
/** Infobulle quittée (k : 'map' ou 'prof') : elle reste 5 s à sa place, puis part ; un nouveau survol la remplace. */
export function linger(k) {
  const tip = k === 'map' ? S.tipEl : S.ptipEl;
  if (tip.hidden || !tip.classList.contains('mp-hover') || S.linger?.[k]) return;
  (S.linger ||= {})[k] = setTimeout(() => {
    if (!S) return;
    S.linger[k] = 0;
    if (tip.classList.contains('mp-hover')) tip.hidden = true;
  }, 5000);
}
/** Survol repris : l'attente de 5 s est annulée. */
export function stay(k) {
  if (!S?.linger?.[k]) return;
  clearTimeout(S.linger[k]);
  S.linger[k] = 0;
}
/** Vrai pour un événement souris qui suit un toucher (compatibilité) : ce n'est pas un survol. */
export const fromTouch = e => !!e?.sourceCapabilities?.firesTouchEvents || performance.now() - keep.touchAt < 1000;
/** Infobulles et carte d'un point fermées (un mouvement de la carte, un toucher ailleurs). */
export function hideTips() {
  if (S?.cardEl && !S.cardEl.hidden) S.cardEl.hidden = true;
  for (const k of ['map', 'prof']) stay(k);
  if (S?.tipEl) S.tipEl.hidden = true;
  if (S?.ptipEl) S.ptipEl.hidden = true;
}

/** Deux lignes d'une voie : « UN482 LMG → NEPIX », puis distance, routes vraies aller et retour, plancher|plafond, basse ou
 *  haute. */
function airwayLines(g) {
  const R = MapsRender,
    high = (+g.lower || 0) >= 19500 || /^U/.test(g.route);
  return [`${g.route} ${g.a?.id || ''} → ${g.b?.id || ''}`, [Number.isFinite(+g.nm) ? `${Math.round(+g.nm)} NM` : '', g.a && g.b ?
    `${R.deg3(R.trackOf(g.a, g.b))} / ${R.deg3(R.trackOf(g.b, g.a))}` : '', `${R.awLimit(g.lower)}|${R.awLimit(g.upper)}`, tt(high ?
      TX.awHigh : TX.awLow)
  ].filter(Boolean).join(' · ')];
}
/** Balise en une ligne : « VOR BZH 114.50 », « ILS 26 BG 110.30 », « DME CLI CH 32X ». */
const navName = n => [n.kind === 'ILS' && n.rwy ? `ILS ${n.rwy}` : n.kind, n.id, n.freq || (n.channel ? `CH ${n.channel}` : '')].filter(Boolean)
  .join(' ');
/** Ligne grisée « Aussi ici : FIR PARIS · SIV POITIERS » d'un libellé d'espace : les espaces écartés au point (sans celui du
 *  libellé) ; vide s'il n'y en a pas. */
function alsoTip(a, ll) {
  if (!ll) return '';
  const own = [a.type, a.name].filter(Boolean).join(' '),
    also = MapsRender.airspacesAround(S.data?.data?.airspaces || [], ll.lat, ll.lon, S.data?.data?.flat).also.filter(n => n !== own);
  return also.length ? tt(TX.tipAlso, {
    l: also.join(' · ')
  }) : '';
}
/** Ce qu'il y a sous (x, y) pour l'infobulle, dans l'ordre : barbule, point de report surligné, cartouche de voie, balise,
 *  libellé d'espace ; avec (lat, lon), les espaces du point en dernier. Deux lignes (plus « Aussi ici »), ou null. */
export function tipAt(x, y, lat = null, lon = null) {
  const w = windAt(x, y);
  if (w) return windLines(w);
  const vp = (S.vfrHits || []).find(h => Math.hypot(h.x - x, h.y - y) <= 9)?.p;
  if (vp) return [
    [vp.code, vp.name].filter(Boolean).join(' '), [vp.vacCode && vp.vacCode !== vp.code ? tt(TX.vfrVacCode, {
      c: vp.vacCode
    }) : '', vp.restrictions.join(' ; ')].filter(Boolean).join(' · ')
  ];
  const g = MapsRender.airwaysAt(S.awHits, x, y)[0];
  if (g) return airwayLines(g);
  const nv = (S.navHits || []).find(h => Math.hypot(h.x - x, h.y - y) <= 9);
  if (nv) return [navName(nv.n), nv.merged.length ? tt(TX.navAlso, {
    l: nv.merged.map(navName).join(', ')
  }) : nv.n.name || ''];
  const z = (S.zoneHits || []).find(r => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
  if (z) return [...MapsRender.sia(z.a), alsoTip(z.a, lat == null ? llAt(x, y) : {
    lat,
    lon
  })];
  if (lat == null) return null;
  const l = MapsRender.airspacesAt(S.data?.data?.airspaces || [], lat, lon).map(a => MapsRender.sia(a)[0]);
  return l.length ? [l[0], l.length > 2 ? `${l[1]} ${tt(TX.tipMore, {
    n: l.length - 2
  })}` : l[1] || ''] : null;
}
/** Position géographique sous (x, y), longitude dans [-180, 180[ : MapLibre, sinon le Mercator du fond uni ; null sans carte. */
export function llAt(x, y) {
  if (S.map) {
    const p = S.map.unproject([x, y]);
    return {
      lat: p.lat,
      lon: outLon(p.lng)
    };
  }
  const r = S.box.getBoundingClientRect(),
    ll = r.width ? MapsRender.mercator(S.fit, r.width, r.height, 12).toLL(x, y) : null;
  return ll && {
    lat: ll.lat,
    lon: outLon(ll.lon)
  };
}
/** Survol de la carte en (x, y) : un terrain (aperçu de ses points de report), sinon l'infobulle de ce qui est dessous,
 *  sinon rien (l'infobulle reste 5 s). */
export function hoverMap(x, y) {
  const t = tipAt(x, y),
    ad = t || onMission() ? null : adAt(x, y);
  previewAd(ad?.icao || null);
  if (ad) return adHover(ad, x, y);
  if (!t) return linger('map');
  stay('map');
  followTip(S.tipEl, S.box, x, y, hoverHtml(t[0], t[1], t[2]));
}
/** Toucher ou clic sur la carte en (x, y), position (lat, lon) : une barbule ou une voie dessous passent avant ; des espaces
 *  sous le point : leur liste dans la feuille ; sinon l'infobulle de ce qui est dessous, posée 5 s ; rien : fermée. Vrai si
 *  quelque chose est montré. */
export function mapTip(lat, lon, x, y) {
  if (!windAt(x, y) && !MapsRender.airwaysAt(S.awHits, x, y).length && showLvAt(lat, lon)) {
    hideTips();
    return true;
  }
  const t = tipAt(x, y, lat, lon);
  if (!t) {
    hideTips();
    return false;
  }
  stay('map');
  followTip(S.tipEl, S.box, x, y, hoverHtml(t[0], t[1]));
  linger('map');
  return true;
}
/** Toucher sur la carte (MapLibre ou fond uni) : le panneau des modes se ferme ; la liste des espaces se ferme (le toucher
 *  suivant la rouvre sur des espaces) ; en mode Édition, le geste du mode ; sinon un point de report, un terrain, la carte d'un
 *  point ouverte qui se ferme, l'infobulle de ce qui est dessous, le curseur sur la route, les espaces du point (SPEC § 11,
 *  § 16). */
export function tapAt(x, y, lat, lon) {
  lon = outLon(lon); // la vue peut être sur une autre copie du monde : le test des espaces se fait dans [-180, 180[
  if (!S.modeOpts.hidden) return toggleModes(false);
  closeLv();
  if (S.edit.on) return got('edit')?.editTap(x, y);
  if (!onMission() && vrpTap(x, y)) return;
  const ad = onMission() ? null : adAt(x, y);
  if (ad) return pinAd(ad);
  if (!S.cardEl.hidden) return hideTips();
  if (tipAt(x, y)) return mapTip(lat, lon, x, y);
  const s = S.prof ? MapsProfile.nearest(S.prof, projNow(), x, y) : null;
  if (s != null) {
    hideTips();
    return setCursor(s);
  }
  mapTip(lat, lon, x, y);
}

// ---------------------------------------------------------------- vents en altitude (SPEC § 6.4)
/** Une barbule tous les 50 NM entre deux points qui portent un vent. */
const WIND_STEP_NM = 50;
/** Vents à dessiner : ceux des points (route.points[].wind), plus des interpolés composante par composante tous les 50 NM. */
function windPoints() {
  const pts = unwrapLons(keptRoute(S.route.flight?.route?.points || []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon))),
    ok = w => w && Number.isFinite(+w.dirDeg) && Number.isFinite(+w.kt),
    out = [];
  if (!pts.some(p => ok(p.wind))) return out;
  const cum = MapsRender.distances(pts.map(p => ({
      lat: +p.lat,
      lon: +p.lon
    }))),
    uv = w => {
      const r = +w.dirDeg * Math.PI / 180;
      return [- +w.kt * Math.sin(r), - +w.kt * Math.cos(r)]; // vers où souffle le vent (est, nord)
    };
  pts.forEach((p, i) => {
    if (ok(p.wind)) out.push({
      lat: +p.lat,
      lon: +p.lon,
      ...p.wind
    });
    const q = pts[i + 1];
    if (!q || !ok(p.wind) || !ok(q.wind)) return;
    const a = uv(p.wind),
      b = uv(q.wind),
      len = cum[i + 1] - cum[i],
      tA = +p.wind.tempC,
      tB = +q.wind.tempC;
    for (let d = WIND_STEP_NM; d < len - WIND_STEP_NM / 4; d += WIND_STEP_NM) {
      const f = d / len,
        u = a[0] + (b[0] - a[0]) * f,
        v = a[1] + (b[1] - a[1]) * f;
      out.push({
        lat: +p.lat + (+q.lat - +p.lat) * f,
        lon: +p.lon + (+q.lon - +p.lon) * f,
        dirDeg: (Math.atan2(-u, -v) * 180 / Math.PI + 360) % 360,
        kt: Math.hypot(u, v),
        tempC: Number.isFinite(tA) && Number.isFinite(tB) ? tA + (tB - tA) * f : null,
        levelFt: p.wind.levelFt,
        at: p.wind.at,
        between: true
      });
    }
  });
  return out;
}
/** Barbule au point c : hampe de 30 px vers d'où vient le vent, barbes côté basses pressions (gauche dos au vent au nord,
 *  droite au sud) : fanion 50 kt, barbe 10 kt, demi-barbe 5 kt ; sous 3 kt, un cercle. */
function drawBarb(ctx, c, w, col, lw = 1.8) {
  const kt = Math.round(+w.kt / 5) * 5,
    L = 30,
    r = +w.dirDeg * Math.PI / 180,
    dx = Math.sin(r),
    dy = -Math.cos(r),
    side = w.lat >= 0 ? 1 : -1,
    nx = -dy * side,
    ny = dx * side;
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = col;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.arc(c.x, c.y, 2.5 + (lw - 1.8) / 2, 0, Math.PI * 2);
  ctx.fill();
  if (kt < 3) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
    ctx.stroke();
    return ctx.restore();
  }
  const tip = {
    x: c.x + dx * L,
    y: c.y + dy * L
  };
  ctx.beginPath();
  ctx.moveTo(c.x, c.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  let left = kt,
    at = 0;
  const pos = k => ({
      x: tip.x - dx * k,
      y: tip.y - dy * k
    }),
    feather = (k, len) => {
      const p = pos(k);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + nx * len + dx * 4, p.y + ny * len + dy * 4);
      ctx.stroke();
    };
  while (left >= 50) {
    const p = pos(at),
      q = pos(at + 6);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + nx * 11 + dx * 2, p.y + ny * 11 + dy * 2);
    ctx.lineTo(q.x, q.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    at += 8;
    left -= 50;
  }
  while (left >= 10) {
    feather(at, 11);
    at += 4.5;
    left -= 10;
  }
  if (left >= 5) feather(at === 0 ? 4.5 : at, 6);
  ctx.restore();
}
/** Barbules de la route, sur un liseré du fond de 5 px ; rend les cadres touchés pour l'infobulle : [{ x, y, w }]. */
export function drawWinds(ctx, toC) {
  const col = MapsRender.palette(!!S.theme?.dark).wind,
    hits = [];
  for (const w of windPoints()) {
    const c = toC(w.lat, w.lon);
    drawBarb(ctx, c, w, S.theme.bg, 5);
    drawBarb(ctx, c, w, col);
    hits.push({
      x: c.x,
      y: c.y,
      w
    });
  }
  return hits;
}
/** Barbule sous (x, y) (hampe comprise : 18 px autour du point). */
const windAt = (x, y) => (S.windHits || []).find(h => Math.hypot(h.x - x, h.y - y) <= 18)?.w || null;
/** Deux lignes d'infobulle d'un vent : « Vent 270° / 45 kt », puis température, niveau et heure de la prévision. */
function windLines(w) {
  const t = Number.isFinite(+w.tempC) && w.tempC !== null ? `${Math.round(+w.tempC)} °C` : '',
    l = +w.levelFt > 0 ? level(+w.levelFt) : '',
    h = fmtZ(w.at);
  return [tt(TX.windTip, {
    d: String(Math.round(+w.dirDeg) % 360 || 360).padStart(3, '0'),
    k: Math.round(+w.kt)
  }), t || l || h ? tt(TX.windSub, {
    t: t || '—',
    l: l || '—',
    h: h || '—'
  }) : ''];
}
