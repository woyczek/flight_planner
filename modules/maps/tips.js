// V3 maps — ce qui est sous le doigt ou la souris (modules/maps/SPEC.md § 6.4, § 10, § 11) : l'infobulle légère (barbule de
// vent, cartouche de voie, libellé d'espace, balise), les vents en altitude de la route, et le toucher sur la carte (terrain,
// point de report, infobulle, curseur sur la route, liste des espaces du point).

import {
  altsTap,
  altsHover
} from './alts.js';
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
  gridWinds
} from './weather.js';
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
  chooseTap,
  chooseHover
} from './choose.js';
import {
  atcAt
} from './atc.js';
import {
  groundTap,
  groundHover
} from './ground.js';
import {
  adAt,
  adHover,
  endAt,
  fieldAt,
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

/** Le sens d'un tronçon (SOG-0078) : « sens unique LMG → NEPIX » (dir F : de a vers b ; B : de b vers a), « double sens » (FB) ; rien quand la
 *  source se tait. */
function awWay(g) {
  if (g.dir === 'FB') return tt(TX.awBoth);
  if (g.dir !== 'F' && g.dir !== 'B') return '';
  const [x, y] = g.dir === 'F' ? [g.a, g.b] : [g.b, g.a];
  return tt(TX.awOne, {
    a: x?.id || '…',
    b: y?.id || '…'
  });
}
/** Deux lignes d'une voie : « UN482 LMG → NEPIX », puis distance, routes vraies aller et retour, plancher|plafond, basse ou
 *  haute. */
function airwayLines(g) {
  const R = MapsRender,
    high = (+g.lower || 0) >= 19500 || /^U/.test(g.route);
  return [`${g.route} ${g.a?.id || ''} → ${g.b?.id || ''}`, [Number.isFinite(+g.nm) ? `${Math.round(+g.nm)} NM` : '', g.a && g.b ?
    `${R.deg3(R.trackOf(g.a, g.b))} / ${R.deg3(R.trackOf(g.b, g.a))}` : '', `${R.awLimit(g.lower)}|${R.awLimit(g.upper)}`, tt(high ?
      TX.awHigh : TX.awLow), awWay(g)
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
export function tipAt(x, y, lat = null, lon = null, tap = false) {
  const w = windAt(x, y);
  if (w) return windLines(w);
  const at = atcAt(x, y);
  if (at) return at; // les contrôleurs d'un terrain : positions, fréquences, réseaux (SOG-0094)
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
  // la route orthodromique, à 7 px : son nom et sa longueur (SOG-0145) ; la route, les voies et les balises passent avant ; un TOUCHER
  // sur la route y place le curseur (une route directe est son propre grand cercle : l'infobulle du pointillé ne le prend pas)
  if (S.gc?.q?.length > 1 && S.gc.q.slice(1).some((p, i) => segDist(x, y, S.gc.q[i], p) <= 7) &&
    !(tap && S.prof && projNow() && MapsProfile.nearest(S.prof, projNow(), x, y) != null)) return [tt(TX.gcTip, {
    a: S.gc.dep,
    b: S.gc.arr
  }), tt(TX.gcLen, {
    n: Math.round(S.gc.nm)
  })];
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
/** Distance de (x, y) au segment [a, b] (pixels). */
function segDist(x, y, a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    l2 = dx * dx + dy * dy,
    t = l2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2)) : 0;
  return Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy));
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
  if (S.choose) return chooseHover(x, y); // mode choix : seul ce qu'on peut choisir réagit
  altsHover(x, y); // un itinéraire proposé survolé est surligné (SOG-0134)
  if (!onMission()) groundHover(x,
    y); // une voie (un poste, une attente) survolée est surlignée et sa ligne se place dans la liste du volet (SOG-0254)
  const t = tipAt(x, y),
    ad = t || onMission() ? null : adAt(x, y);
  previewAd(ad?.icao || null);
  if (ad) return adHover(ad, x, y);
  if (!t) return linger('map');
  stay('map');
  followTip(S.tipEl, S.box, x, y, hoverHtml(t[0], t[1], t[2]));
}
/** Le bouton « Direct vers ce point » d'une fiche (SOG-0088 ; contrat de Carburant : `#fuel?direct=<ID>[&lat=&lon=]`, l'ID en majuscules ^[A-Z0-9]{2,11}$, la position à 5 décimales au plus) :
 *  jamais le vol n'est écrit ici, Carburant propose le direct (« Appliquer » / « Annuler ») ; null si le nom ou la position ne tiennent pas le contrat. */
export function directHtml(id, lat, lon) {
  const k = String(id || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{2,11}$/.test(k)) return '';
  const pos = Number.isFinite(+lat) && Math.abs(+lat) <= 90 && Number.isFinite(+lon) && Math.abs(+lon) <= 180 ? ` data-lat="${(+lat).toFixed(5)}" data-lon="${outLon(+lon).toFixed(5)}"` : '';
  return `<button type="button" class="f-btn mp-direct" data-direct="${esc(k)}"${pos}>${esc(tt(TX.directTo))}</button>`;
}
/** Écoute du bouton « Direct vers ce point » des fiches (la fiche d'un point de la carte, celle d'un point de la route en Édition) ; rend l'arrêt. */
export function directEvents() {
  const on = e => {
    const b = e.target.closest('[data-direct]');
    if (!b) return;
    const q = S.ctx?.query || {},
      lat = b.dataset.lat,
      lon = b.dataset.lon;
    hideTips();
    location.hash = `#fuel?direct=${encodeURIComponent(b.dataset.direct)}${lat != null && lon != null ? `&lat=${lat}&lon=${lon}` : ''}${q.pane === '1' || q.with ? '&with=maps' : ''}`;
  };
  S.cardEl.addEventListener('click', on);
  return () => S.cardEl?.removeEventListener('click', on);
}
/** Une balise ou un point de voie touché : sa fiche (nom, et « Direct vers ce point ») ; vrai si une fiche est montrée. */
function navTap(x, y) {
  const nv = (S.navHits || []).find(h => Math.hypot(h.x - x, h.y - y) <= 12);
  if (!nv) return false;
  const html = directHtml(nv.n.id, nv.n.lat, nv.n.lon);
  if (!html) return false;
  hideTips();
  showTip(S.cardEl, S.box, nv.x, nv.y, `<div><b>${esc(navName(nv.n))}</b></div>${nv.n.name ? `<div class="f-muted">${esc(nv.n.name)}</div>` : ''}${html}`);
  return true;
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
  if (S.choose) return chooseTap(x, y); // mode choix : un toucher sur un tracé ou un cartouche choisit, ailleurs rien
  lon = outLon(lon); // la vue peut être sur une autre copie du monde : le test des espaces se fait dans [-180, 180[
  if (!S.modeOpts.hidden) return toggleModes(false);
  closeLv();
  if (S.edit.on) return got('edit')?.editTap(x, y);
  // le départ et l'arrivée du vol avant tout autre objet sous le doigt (une zone de 44 px) : « toucher le terrain » ne demande pas un doigt précis (SOG-0310)
  if (!onMission() && atcAt(x, y) && tipAt(x, y, null, null, true)) return mapTip(lat, lon, x,
    y
  ); // les contrôleurs en ligne d'un terrain (de petites pastilles sur lui) gardent leur infobulle : la zone de 44 px du terrain ne les couvre pas
  const end = onMission() ? null : endAt(x, y);
  if (end) return pinAd(end);
  if (!onMission() && vrpTap(x, y)) return;
  if (altsTap(x, y)) return; // un tracé proposé par Carburant touché : « Prendre » (SOG-0134 a)
  if (!onMission() && navTap(x, y)) return; // une balise ou un point de voie : sa fiche, avec « Direct vers ce point » (SOG-0088)
  if (!onMission() && groundTap(x, y)) return; // un trait ou un point du sol touché : sa ligne dans le panneau (§ 10.40)
  const ad = onMission() ? null : adAt(x, y) || fieldAt(x, y); // le terrain : son point, ou n'importe où dans son emprise (au zoom du sol)
  if (ad) return pinAd(ad);
  if (!S.cardEl.hidden) return hideTips();
  if (tipAt(x, y, null, null, true)) return mapTip(lat, lon, x, y);
  const s = S.prof && projNow() ? MapsProfile.nearest(S.prof, projNow(), x, y) :
    null; // pas de projection tant que rien n'est dessiné (un toucher avant le premier dessin)
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
  const g = gridWinds(); // la grille que lit la coupe, quand elle est en réserve (SOG-0148) ; sinon ce que Carburant a écrit
  if (g) return g;
  return noRepeat(carburantWinds());
}
/** Jamais une même flèche répétée (SOG-0141) : un vent identique (direction, force, température) au précédent, à plus de 100 NM,
 *  est la signature d'une lecture qui rend la même case hors de la couverture du modèle : il devient un lieu sans vent. */
function noRepeat(list) {
  let last = null;
  return list.map(w => {
    const same = last && !w.gap && Math.round(+w.dirDeg) === Math.round(+last.dirDeg) && Math.round(+w.kt) === Math.round(+last.kt) &&
      Math.round(+w.tempC) === Math.round(+last.tempC) && !w.between && Math.hypot(+w.lat - +last.lat, (+w.lon - +last.lon) * Math.cos(+
        w.lat * Math.PI / 180)) * 60 > 100;
    if (!w.gap && !w.between) last = w;
    return same ? {
      lat: w.lat,
      lon: w.lon,
      gap: true,
      model: ''
    } : w;
  });
}

function carburantWinds() {
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
        ...MapsRender.rhumbAt(p, q, f), // sur la loxodromie du tronçon, le chemin du trait (SOG-0243)

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
/** Entre WIND_MIN et WIND_MAX barbules dans la vue, à tout zoom (SOG-0214) : la liste du long de la trajectoire (un vent tous les 50 NM, ou ceux de Carburant) est éclaircie quand
 *  elle en met trop dans la vue, et complétée par des vents interpolés entre deux voisins quand elle en met trop peu (un vent qui n'est pas lu mais reliant deux lus : `between`) ; jamais
 *  de vent inventé à travers un lieu sans vent ou entre deux lieux éloignés de plus de 400 NM. Rend [{ w, c }] des barbules de la vue. */
const WIND_MIN = 40,
  WIND_MAX = 80,
  WIND_TARGET = 60,
  /** Écart minimal à l'écran entre deux barbules (px : une hampe) : sur une route qui tient sur un trait droit, soixante barbules se chevauchaient et cachaient le trait ; le compte
   *  « 40 à 80 » est un plafond, l'espacement la règle (SOG-0243, retouche). */
  WIND_GAP_PX = 30;

function windsPicked(list, toC, W, H) {
  const at = list.map(w => ({
      w,
      c: toC(w.lat, w.lon)
    })),
    inV = q => q.c.x >= -20 && q.c.x <= W + 20 && q.c.y >= -20 && q.c.y <= H + 20,
    seen = at.filter(inV);
  if (seen.length > WIND_MAX) {
    const stride = Math.ceil(seen.length / WIND_TARGET);
    return seen.filter((q, i) => i % stride === 0);
  }
  if (seen.length >= WIND_MIN || at.length < 2) return seen;
  // trop peu : des vents interpolés entre deux voisins lus, dans les paires qui touchent la vue
  let pairs = [];
  for (let i = 0; i + 1 < at.length; i++) {
    const a = at[i],
      b = at[i + 1];
    if (!a.w.gap && !b.w.gap && Number.isFinite(+a.w.kt) && Number.isFinite(+b.w.kt) && Math.hypot(+a.w.lat - +b.w
        .lat, (+a.w.lon - +b.w.lon) * Math.cos(+a.w.lat * Math.PI / 180)) * 60 < 400) pairs.push([a, b]);
  }
  if (!pairs.length) return seen;
  // la route à l'écran (le trait : la suite de ses points, droite entre deux d'entre eux) : les vents interpolés entre deux lus la suivent, tronçon par tronçon, et ne coupent jamais un coude
  // (SOG-0243, LFPO → SFD via MOPAR KOLIV VEPET PETAX : les barbules allaient droit de KOLIV à PETAX en ignorant VEPET)
  const pl = (S.marksPts || []).map(p => toC(p.lat, p.lon)),
    cum = pl.reduce((acc, q, i) => (acc.push(i ? acc[i - 1] + Math.hypot(q.x - pl[i - 1].x, q.y - pl[i - 1].y) : 0), acc), []),
    // la place d'un point sur le trait : son abscisse (px) et son écart (px)
    onLine = c => {
      let best = null;
      for (let i = 1; i < pl.length; i++) {
        const a = pl[i - 1],
          b = pl[i],
          dx = b.x - a.x,
          dy = b.y - a.y,
          l2 = dx * dx + dy * dy,
          t = l2 ? Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.y - a.y) * dy) / l2)) : 0,
          d = Math.hypot(c.x - a.x - t * dx, c.y - a.y - t * dy);
        if (!best || d < best.d) best = {
          d,
          s: cum[i - 1] + t * Math.sqrt(l2)
        };
      }
      return best;
    },
    // le point du trait à l'abscisse s
    lineAt = sv => {
      let i = 1;
      while (i < pl.length - 1 && cum[i] < sv) i++;
      const a = pl[i - 1],
        b = pl[i],
        len = cum[i] - cum[i - 1],
        t = len ? Math.max(0, Math.min(1, (sv - cum[i - 1]) / len)) : 0;
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t
      };
    };
  for (const pr of pairs) {
    const [a, b] = pr;
    if (pl.length < 2) {
      pr.arc = null;
      continue;
    }
    const la = onLine(a.c),
      lb = onLine(b.c);
    pr.arc = la.d <= 8 && lb.d <= 8 ? {
      sa: la.s,
      sb: lb.s
    } : false; // un lieu hors du trait : pas de vent inventé entre eux
  }
  // les paires dont le trait entre les deux lieux touche la vue (même si leurs deux lieux sont hors d'elle : le trait en traverse un morceau)
  pairs = pairs.filter(pr => {
    if (pr.arc === false) return false;
    if (!pr.arc) return inV(pr[0]) || inV(pr[1]);
    for (let m = 0; m <= 40; m++)
      if (inV({
          c: lineAt(pr.arc.sa + (pr.arc.sb - pr.arc.sa) * m / 40)
        })) return true;
    return false;
  });
  if (!pairs.length) return seen;
  const uv = w => {
      const r = +w.dirDeg * Math.PI / 180;
      return [- +w.kt * Math.sin(r), - +w.kt * Math.cos(r)];
    },
    // les barbules à insérer à un pas de `step` px sur chaque paire ; celles qui tombent hors de la vue ne comptent pas (deux essais : le pas est corrigé de ce qui est vu)
    build = step => {
      const out = [...seen];
      for (const pr of pairs) {
        const [a, b] = pr;
        if (pr.arc === false) continue;
        const ua = uv(a.w),
          ub = uv(b.w),
          k = Math.min(200, Math.floor((pr.arc ? Math.abs(pr.arc.sb - pr.arc.sa) : Math.hypot(a.c.x - b.c.x, a.c.y - b.c.y)) / step) - 1);
        for (let m = 1; m <= k; m++) {
          const f = m / (k + 1),
            u1 = ua[0] + (ub[0] - ua[0]) * f,
            v1 = ua[1] + (ub[1] - ua[1]) * f,
            ll = pr.arc ? null : MapsRender.rhumbAt(a.w, b.w, f),
            c = pr.arc ? lineAt(pr.arc.sa + (pr.arc.sb - pr.arc.sa) * f) : toC(ll.lat, ll
              .lon), // sur le trait, tronçon par tronçon, entre les deux lieux lus (SOG-0243)
            w = {
              ...a.w,
              ...(ll || llAt(c.x, c.y)),
              dirDeg: (Math.atan2(-u1, -v1) * 180 / Math.PI + 360) % 360,
              kt: Math.hypot(u1, v1),
              tempC: Number.isFinite(+a.w.tempC) && Number.isFinite(+b.w.tempC) ? +a.w.tempC + (+b.w.tempC - +a.w.tempC) * f : null,
              between: true
            };
          if (inV({
              c
            })) out.push({
            w,
            c
          });
        }
      }
      return out;
    };
  let step = Math.max(4, pairs.reduce((s, [a, b]) => s + Math.hypot(a.c.x - b.c.x, a.c.y - b.c.y), 0) / WIND_TARGET),
    out = build(step);
  for (let t = 0; t < 2 && (out.length < WIND_MIN || out.length > WIND_MAX); t++) {
    step = Math.max(4, step * (out.length - seen.length) / Math.max(1, WIND_TARGET - seen.length));
    out = build(step);
  }
  return out;
}
/** Les barbules de la vue (windsPicked : de 40 à 80, éclaircies ou complétées), jamais posées sur un point de repère de distance : une barbule dont le point tomberait sur un repère se décale le long du
 *  trait (de 8 à 24 px, de part et d'autre : le trait est droit) ou saute ; deux barbules sont à WIND_GAP_PX au moins l'une de l'autre, les lues d'abord ; au plus WIND_MAX. Les points
 *  des repères et leurs libellés (« 1000 », « 1500 ») sont redessinés par-dessus les barbules (draw.js) : une hampe qui les croise ne les cache pas. Rend [{ w, c }]. */
function windsInView(list, toC, W, H) {
  const blocks = (S.marks || []).map(m => {
      const c = toC(m.lat, m.lon);
      return {
        x0: c.x - 7,
        x1: c.x + 7,
        y0: c.y - 7,
        y1: c.y + 7
      };
    }),
    boxOf = ({
      c
    }) => ({
      x0: c.x - 3,
      x1: c.x + 3,
      y0: c.y - 3,
      y1: c.y + 3
    }),
    hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0,
    pts = (S.marksPts || []).map(p => toC(p.lat, p.lon)),
    // la route à l'écran : abscisse curviligne de chaque point de la polyligne ; un décalage se fait LE LONG DU TRACÉ (tronçon par tronçon, le coude suivi), jamais dans la direction d'un
    // seul tronçon : près d'un coude le point décalé de la tangente quittait le trait de sin(angle) × décalage (SOG-0243, 14 à 17 px à VEPET quand le coude est près du bord)
    cum = pts.reduce((acc, q, i) => (acc.push(i ? acc[i - 1] + Math.hypot(q.x - pts[i - 1].x, q.y - pts[i - 1].y) : 0), acc), []),
    // la place d'un point sur le trait : son abscisse s (px) et son écart d (px) ; null sans tracé
    onPoly = c => {
      let best = null;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1],
          b = pts[i],
          dx = b.x - a.x,
          dy = b.y - a.y,
          l2 = dx * dx + dy * dy,
          t = l2 ? Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.y - a.y) * dy) / l2)) : 0,
          d = Math.hypot(c.x - a.x - t * dx, c.y - a.y - t * dy);
        if (l2 && (!best || d < best.d)) best = {
          d,
          s: cum[i - 1] + t * Math.sqrt(l2)
        };
      }
      return best;
    },
    // le point du trait à l'abscisse s (borné aux deux bouts)
    polyAt = sv => {
      let i = 1;
      while (i < pts.length - 1 && cum[i] < sv) i++;
      const a = pts[i - 1],
        b = pts[i],
        len = cum[i] - cum[i - 1],
        t = len ? Math.max(0, Math.min(1, (sv - cum[i - 1]) / len)) : 0;
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t
      };
    },
    out = [];
  for (const q of windsPicked(list, toC, W, H)) {
    if (out.length >= WIND_MAX) break;
    const on = pts.length > 1 ? onPoly(q.c) : null;
    for (const sh of [0, 8, -8, 16, -16, 24, -24]) {
      if (sh && !on) break;
      const c = sh ? polyAt(on.s + sh) : q.c,
        b = boxOf({
          w: q.w,
          c
        });
      if (blocks.some(k => hit(b, k)) || out.some(o => Math.hypot(o.c.x - c.x, o.c.y - c.y) < WIND_GAP_PX)) continue;
      out.push(sh ? {
        ...q,
        c
      } : q);
      break;
    }
  }
  return out;
}
/** Barbules de la route, sur un liseré du fond de 5 px ; rend les cadres touchés pour l'infobulle : [{ x, y, w }]. */
export function drawWinds(ctx, toC) {
  const col = MapsRender.palette(!!S.theme?.dark).wind,
    hits = [];
  for (const {
      w,
      c
    }
    of windsInView(windPoints(), toC, S.canvas.width / Math.max(1, window.devicePixelRatio || 1), S.canvas.height / Math.max(1, window
      .devicePixelRatio || 1))) {
    if (!w.gap) { // hors couverture : pas de flèche, la place reste touchable (« pas de vent ici »)
      drawBarb(ctx, c, w, S.theme.bg, 5);
      drawBarb(ctx, c, w, col);
    }
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
  if (w.gap) return [tt(w.model ? TX.windGap : TX.windGapRepeat, {
    m: w.model
  }), ''];
  const t = Number.isFinite(+w.tempC) && w.tempC !== null ? `${Math.round(+w.tempC)} °C` : '',
    l = +w.levelFt > 0 ? level(+w.levelFt) : '',
    h = fmtZ(w.at);
  return [tt(TX.windTip, {
    d: String(Math.round(+w.dirDeg) % 360 || 360).padStart(3, '0'),
    k: Math.round(+w.kt)
  }), (t || l || h ? tt(TX.windSub, {
    t: t || '—',
    l: l || '—',
    h: h || '—'
  }) : '') + (w.other && w.model ? ` · ${w.model}` : '')]; // un vent lu d'un autre modèle que la coupe le dit
}
