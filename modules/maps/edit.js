// V3 maps — le mode Édition (modules/maps/SPEC.md § 12), chargé au premier appui sur « Édition » (meta.lazy) : déplacer un
// point tournant (appui à 22 px, posé sur un point à 20 px ou libre), ajouter (« + » armé, appui long), la carte d'un point
// (niveau, « Retirer »), les paliers glissés sur le profil, « Annuler » ; chaque geste montré tout de suite, l'enregistrement
// du vol fusionné 400 ms après le dernier (frame/lib/current_flight.js merge, by 'maps').

import {
  S,
  keep,
  esc,
  tt,
  setLabel,
  setPressed,
  flightPath,
  outLon,
  dLon,
  level
} from './state.js';
import {
  unwrapLons
} from '../../frame/lib/geo.js';
import {
  textFromPoints,
  icaoCoord
} from '../../frame/lib/route_text.js';
import {
  merge
} from '../../frame/lib/current_flight.js';
import {
  TX
} from './texts.js';
import {
  schedule
} from './draw.js';
import {
  pointsOf
} from './data.js';
import {
  closePanels
} from './layers.js';
import {
  header,
  syncButtons
} from './screen.js';
import {
  buildProfile,
  drawCursor,
  setCursor,
  yAtAlt,
  altAtY
} from './profile_view.js';
import {
  hideTips,
  showTip,
  mapTip,
  llAt as llOf
} from './tips.js';

/** Rayon d'appui sur un point de la route (px) et rayon d'accroche d'un point où se poser (px). */
const HIT = 22,
  SNAP = 20;
/** Retenue de l'annulation (gestes gardés en mémoire). */
const UNDO_MAX = 20;

/** Points de l'enregistrement aux longitudes continues, tous leurs champs gardés (wind, via, awy…). */
const rawPoints = () => unwrapLons((S.route.flight?.route?.points || []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon)));
/** Point de la route sous (x, y) : son rang, ou null ; movable : sans le départ ni l'arrivée. */
function pointAt(x, y, movable = false) {
  const pts = rawPoints();
  let best = null,
    bd = HIT;
  pts.forEach((p, i) => {
    if (movable && (i === 0 || i === pts.length - 1)) return;
    const q = S.toC(+p.lat, +p.lon),
      d = Math.hypot(q.x - x, q.y - y);
    if (d <= bd) {
      bd = d;
      best = i;
    }
  });
  return best;
}
/** Points où se poser : balises, terrains, points des voies, points RNAV et de report des données lues (gardés par lecture). */
function anchors() {
  const d = S.data?.data;
  if (!d) return [];
  if (S.edit.anchorsFor === d) return S.edit.anchors;
  const out = [],
    add = (id, lat, lon, kind) => {
      if (id && Number.isFinite(+lat) && Number.isFinite(+lon)) out.push({
        id: String(id),
        lat: +lat,
        lon: +lon,
        kind
      });
    };
  for (const n of d.navaids || []) add(n.id, n.lat, n.lon, 'navaid');
  for (const a of d.aerodromes || []) add(a.icao || a.id, a.lat, a.lon, 'aerodrome');
  for (const w of d.airways || [])
    for (const e of [w.a, w.b]) add(e?.id, e?.lat, e?.lon, 'fix');
  for (const p of d.points || []) add(p.id, p.lat, p.lon, 'fix');
  for (const v of d.vrp || []) add(v.id || v.name, v.lat, v.lon, 'vrp');
  S.edit.anchorsFor = d;
  return S.edit.anchors = out;
}
/** Position sous (x, y) arrondie au millionième de degré, longitude dans [-180, 180[ ; null sans carte. */
function llAt(x, y) {
  const p = llOf(x, y);
  return p && {
    lat: Math.round(p.lat * 1e6) / 1e6,
    lon: Math.round(p.lon * 1e6) / 1e6
  };
}
/** Point où se poser le plus proche de (x, y), à moins de SNAP px ; null sinon. */
function snapAt(x, y) {
  let best = null,
    bd = SNAP;
  for (const a of anchors()) {
    const q = S.toC(a.lat, a.lon),
      d = Math.hypot(q.x - x, q.y - y);
    if (d <= bd) {
      bd = d;
      best = a;
    }
  }
  return best;
}

// ---------------------------------------------------------------- le mode
/** Mode Édition ouvert ou fermé : bouton pressé, colonne de cinq boutons (SPEC § 4), aide dite une fois par page. */
export function setEdit(on) {
  install();
  S.edit.on = on;
  S.edit.drag = null;
  closePanels();
  setPressed(S.editBtn, on);
  setLabel(S.editBtn, tt(on ? TX.editDone : TX.editHelp));
  if (on && !keep.editHinted) {
    keep.editHinted = true;
    S.ctx.notify?.(tt(TX.editHint), 'info');
  }
  setAdding(false);
  if (S.el.classList.contains('mp-editing') !== on) S.el.classList.toggle('mp-editing', on);
  S.undoBtn.disabled = !S.edit.undo.length;
  syncButtons();
  hideTips();
  schedule();
}
/** « + » armé ou non : le prochain toucher ajoute un point ; l'aide dite une fois par page. */
export function setAdding(on) {
  S.edit.adding = on;
  setPressed(S.addBtn, on);
  if (on && !keep.addHinted) {
    keep.addHinted = true;
    S.ctx.notify?.(tt(TX.addHint), 'info');
  }
}

// ---------------------------------------------------------------- les gestes appliqués
/** Geste appliqué : points (et niveau du premier tronçon) montrés tout de suite, écrits 400 ms après le dernier geste. */
function commit(points, levelFt = null) {
  const f = S.route.flight || {},
    pts = points.map(p => ({
      ...p,
      lat: Math.round(+p.lat * 1e6) / 1e6,
      lon: Math.round(outLon(+p.lon) * 1e6) / 1e6 // écrite dans [-180, 180[
    })),
    dist = pts.length >= 2 ? MapsRender.distances(unwrapLons(pts)).pop() : 0,
    route = {
      points: pts,
      // texte refait depuis les points : les voies des tronçons restés intacts sont gardées
      text: textFromPoints(pts, f.route?.text || '', f.route?.points || null),
      distanceNm: Math.round(dist * 10) / 10,
      trackDeg: pts.length >= 2 ? Math.round(MapsRender.trackOf(pts[0], pts[pts.length - 1])) : f.route?.trackDeg,
      from: 'points',
      manual: false
    },
    rec = {
      ...f,
      route: withProcedures({
        ...(f.route || {}),
        ...route
      }),
      ...(levelFt > 0 ? {
        level: {
          ...(f.level || {}),
          ft: levelFt
        }
      } : {}),
      by: 'maps',
      updated_at: new Date().toISOString()
    };
  S.route = {
    ...S.route,
    flight: rec,
    points: pointsOf(rec),
    levelFt: +rec.level?.ft || 0,
    updated: rec.updated_at
  };
  S.marks = MapsRender.marks(S.route.points);
  S.undoBtn.disabled = !S.edit.undo.length;
  header();
  schedule();
  buildProfile();
  // écriture 400 ms après le dernier geste ; le démontage l'envoie tout de suite (S.edit.flush)
  const ctx = S.ctx,
    path = flightPath();
  clearTimeout(S.edit.saveT);
  S.edit.flush = () => {
    S && (S.edit.saveT = 0, S.edit.flush = null);
    return saveRoute(ctx, path, route, levelFt > 0 ? levelFt : null, rec.updated_at);
  };
  S.edit.saveT = setTimeout(S.edit.flush, 400);
}
/** Procédures gardées tant que leur terrain est le départ (SID) ou l'arrivée (STAR) de la route, retirées sinon. */
function withProcedures(r) {
  const pr = r.procedures;
  if (!pr) return r;
  const up = v => String(v || '').toUpperCase(),
    pts = r.points || [],
    dep = up(r.dep || pts[0]?.id),
    arr = up(r.arr || pts[pts.length - 1]?.id),
    sid = pr.sid && up(pr.sid.icao) === dep ? pr.sid : null,
    star = pr.star && up(pr.star.icao) === arr ? pr.star : null,
    out = {
      ...r
    };
  if (sid || star) out.procedures = {
    ...pr,
    sid,
    star
  };
  else delete out.procedures;
  return out;
}
/** Écrit la route (montage ctx, chemin path) sur la dernière version lue de l'enregistrement : fusion dans route (ses autres clés gardées), level.ft si
 *  le premier tronçon a changé ; rien d'autre (progress, quote, profile sont à Carburant ou au cadre). */
async function saveRoute(ctx, path, route, levelFt, at) {
  try {
    const cur = (await ctx.data.get(path).catch(() => null)) || {},
      next = merge(cur, {
        route: withProcedures({
          ...(cur.route || {}),
          ...route
        }),
        ...(levelFt ? {
          level: {
            ...(cur.level || {}),
            ft: levelFt
          }
        } : {})
      }, {
        fields: levelFt ? ['route', 'level'] : ['route'],
        by: 'maps'
      });
    next.updated_at = at; // la version montrée : la vue vivante ne reprend qu'une version plus récente
    await ctx.data.put(path, next);
  } catch (e) {
    ctx.notify?.(ctx.t(TX.saveFailed, {
      m: e?.message || String(e)
    }), 'err');
  }
}
/** L'état d'avant le geste gardé pour « Annuler ». */
function remember() {
  S.edit.undo.push({
    points: structuredClone(rawPoints()),
    level: +S.route.flight?.level?.ft || 0
  });
  if (S.edit.undo.length > UNDO_MAX) S.edit.undo.shift();
}
/** Point i posé sur a : son nom et sa position, son palier gardé ; son vent et sa voie d'arrivée tombent (il a bougé). */
function movePoint(i, a) {
  const pts = rawPoints(),
    old = pts[i];
  remember();
  pts[i] = {
    id: a.id,
    lat: a.lat,
    lon: a.lon,
    ...(old?.alt_ft != null ? {
      alt_ft: old.alt_ft
    } : {})
  };
  commit(pts);
}
/** Point a inséré dans le tronçon qu'il allonge le moins. */
function insertPoint(a) {
  const pts = rawPoints();
  if (pts.length < 2) return;
  const gc = (p, q) => MapsRender.distances([p, q]).pop();
  let at = 1,
    best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const p = {
        lat: +pts[i].lat,
        lon: +pts[i].lon
      },
      q = {
        lat: +pts[i + 1].lat,
        lon: +pts[i + 1].lon
      },
      add = gc(p, a) + gc(a, q) - gc(p, q);
    if (add < best) {
      best = add;
      at = i + 1;
    }
  }
  remember();
  pts.splice(at, 0, {
    id: a.id,
    lat: a.lat,
    lon: a.lon
  });
  commit(pts);
}
/** Point i retiré (jamais le départ ni l'arrivée). */
function removePoint(i) {
  const pts = rawPoints();
  if (i <= 0 || i >= pts.length - 1) return;
  remember();
  pts.splice(i, 1);
  commit(pts);
}
/** Dernier geste repris : points et niveau du vol d'avant. */
export function undoEdit() {
  const prev = S.edit.undo.pop();
  if (!prev) return;
  hideTips();
  commit(prev.points, prev.level);
}
/** Niveau tenu sur le tronçon qui part du point i : celui du point s'il en porte un, sinon le précédent, sinon level.ft. */
function heldLevel(i) {
  const pts = rawPoints();
  let l = +S.route.flight?.level?.ft || 0;
  for (let k = 1; k <= i && k < pts.length - 1; k++)
    if (+pts[k].alt_ft > 0) l = +pts[k].alt_ft;
  return l;
}
/** Palier du tronçon qui part du point i (pas de 1 000 ft) : au départ level.ft, ailleurs alt_ft du point, retiré quand il
 *  redevient celui du tronçon précédent. */
function setLevel(i, ft) {
  const pts = rawPoints();
  ft = Math.max(1000, Math.round(ft / 1000) * 1000);
  if (i < 0 || i >= pts.length - 1 || ft === heldLevel(i)) return;
  remember();
  if (i === 0) return commit(pts, ft);
  const p = {
    ...pts[i]
  };
  if (ft === heldLevel(i - 1)) delete p.alt_ft;
  else p.alt_ft = ft;
  pts[i] = p;
  commit(pts);
}
/** Tronçon du profil sous la distance s (mètres de la coupe) : { i (point qui l'ouvre), s0, s1 }. */
function segmentAt(s) {
  const pts = rawPoints().map(p => ({
      lat: +p.lat,
      lon: +p.lon
    })),
    cum = MapsRender.distances(pts),
    k = S.geo.total / (cum[cum.length - 1] || 1);
  for (let i = 0; i < pts.length - 1; i++)
    if (s <= cum[i + 1] * k || i === pts.length - 2) return {
      i,
      s0: cum[i] * k,
      s1: cum[i + 1] * k
    };
  return null;
}

// ---------------------------------------------------------------- dessins du mode
/** Palier en cours de glisser sur le profil (canvas du curseur) : trait tireté du tronçon au nouveau niveau, et son nom. */
export function drawLevelDrag(ctx) {
  const d = S.edit.ldrag;
  if (!d?.moved || !S.geo) return;
  const g = S.geo,
    x0 = MapsProfile.xOf(g, d.s0),
    x1 = MapsProfile.xOf(g, d.s1),
    y = yAtAlt(g, d.ft),
    t = level(d.ft);
  ctx.save();
  ctx.strokeStyle = S.theme.accent;
  ctx.lineWidth = 3;
  ctx.setLineDash([7, 4]);
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = '700 13px Arial,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = S.theme.bg;
  ctx.lineWidth = 3;
  ctx.strokeText(t, (x0 + x1) / 2, y - 4);
  ctx.fillStyle = S.theme.accent;
  ctx.fillText(t, (x0 + x1) / 2, y - 4);
  ctx.restore();
}
/** Poignées des points tournants, élastique et point visé (cerclé, nommé) pendant un glisser. */
export function drawEdit(ctx, toC) {
  const pts = rawPoints(),
    acc = S.theme.accent,
    d = S.edit.drag;
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = acc;
  pts.forEach((p, i) => {
    if (i === 0 || i === pts.length - 1 || d?.i === i) return;
    const q = toC(+p.lat, +p.lon);
    ctx.beginPath();
    ctx.arc(q.x, q.y, 9, 0, Math.PI * 2);
    ctx.stroke();
  });
  if (d?.moved) {
    const a = toC(+pts[d.i - 1].lat, +pts[d.i - 1].lon),
      b = toC(+pts[d.i + 1].lat, +pts[d.i + 1].lon),
      at = d.snap ? toC(d.snap.lat, d.snap.lon) : {
        x: d.x,
        y: d.y
      };
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(at.x, at.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(at.x, at.y, d.snap ? 12 : 7, 0, Math.PI * 2);
    ctx.fillStyle = MapsRender.withAlpha(acc, d.snap ? .3 : .15);
    ctx.fill();
    ctx.stroke();
    // nom du point visé, sinon celui du point libre (coordonnées OACI)
    const ll = d.snap ? null : llAt(d.x, d.y),
      name = d.snap ? d.snap.id : ll ? icaoCoord(ll.lat, ll.lon) : '';
    if (name) {
      ctx.font = '700 12px Arial,sans-serif';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = S.theme.bg;
      ctx.lineWidth = 3;
      ctx.strokeText(name, at.x + 15, at.y - 12);
      ctx.fillStyle = acc;
      ctx.fillText(name, at.x + 15, at.y - 12);
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- touchers
/** Carte d'un point de la route (dans la boîte de la carte) : nom, départ / arrivée ou niveau tenu avec « − » / « + »,
 *  « Retirer » pour un point tournant. */
function openCard(i) {
  const pts = rawPoints(),
    p = pts[i];
  if (!p) return;
  const end = i === 0 || i === pts.length - 1,
    lvl = +p.alt_ft > 0 ? tt(TX.ptLevel, {
      l: level(+p.alt_ft)
    }) : tt(TX.ptSame),
    held = i < pts.length - 1 ? heldLevel(i) : 0,
    btn = (d, label, sign) => `<button type="button" class="f-btn" data-lvl="${i}" data-d="${d}" aria-label="${esc(label)}" title="${esc(label)}">${sign}</button>`,
    step = held ? `<div class="mp-lvl">${btn(-1000, tt(TX.lvlDown), '−')}<b>${esc(level(held))}</b>${btn(1000, tt(TX.lvlUp), '+')}</div>` : '',
    html = `<div><b>${esc(p.id || icaoCoord(+p.lat, outLon(+p.lon)))}</b></div><div class="f-muted">${esc(i === 0 ? tt(TX.ptDep) : end ? tt(TX.ptArr) : lvl)}</div>${step}${end ? '' : `<button type="button" class="f-btn" data-remove="${i}">${esc(tt(TX.remove))}</button>`}`,
    q = S.toC(+p.lat, +p.lon);
  hideTips();
  showTip(S.cardEl, S.box, q.x, q.y, html);
}
/** Toucher en mode Édition : un point de la route ouvre sa carte ; « + » armé : ajout ; sinon l'infobulle, jamais d'ajout. */
export function editTap(x, y) {
  if (performance.now() - (S.edit.tapGuard || 0) < 450) return; // le clic qui suit un glisser : déjà traité
  if (!S.cardEl.hidden) return hideTips();
  const i = pointAt(x, y);
  if (i != null) return openCard(i);
  if (!S.edit.adding) {
    const ll = llAt(x, y);
    return ll && mapTip(ll.lat, ll.lon, x, y);
  }
  addAt(x, y);
}
/** Ajoute le point où se poser sous (x, y), sinon un point libre nommé par ses coordonnées OACI ; « + » désarmé. */
function addAt(x, y) {
  const ll = llAt(x, y),
    a = snapAt(x, y) || (ll ? {
      id: icaoCoord(ll.lat, ll.lon),
      lat: ll.lat,
      lon: ll.lon
    } : null);
  if (a && !rawPoints().some(p => p.id === a.id && Math.abs(+p.lat - a.lat) < 1e-3 && Math.abs(dLon(+p.lon, a.lon)) < 1e-3)) insertPoint(a);
  setAdding(false);
}

// ---------------------------------------------------------------- gestes posés une fois, au premier chargement
let installed = null;
/** Pose les écouteurs du mode (une fois par montage) ; ils ne font rien hors du mode. */
function install() {
  if (installed === S) return;
  installed = S;
  mapGestures();
  levelGestures();
}
/** Gestes du mode sur la carte : appui sur un point tournant (capture, avant MapLibre), glisser, lâcher ; appui long. */
function mapGestures() {
  const box = S.box,
    pos = e => {
      const r = box.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    },
    ui = e => e.target.closest('.mp-mode-opts, .mp-tip, .mp-layers, .f-ov-btn');
  box.addEventListener('pointerdown', e => {
    if (!S?.edit.on || e.button > 0 || !S.toC || ui(e)) return;
    const [x, y] = pos(e),
      i = pointAt(x, y, true);
    if (i == null) return;
    e.stopPropagation();
    e.preventDefault();
    S.edit.drag = {
      i,
      id: e.pointerId,
      x0: x,
      y0: y,
      x,
      y,
      moved: false,
      snap: null
    };
    hideTips();
    try {
      box.setPointerCapture(e.pointerId);
    } catch {
      /* capture refusée : le glisser suit tant que le doigt reste sur la carte */
    }
  }, true);
  // le geste commencé sur un point n'est pas un déplacement de la carte (MapLibre écoute mousedown et touchstart)
  for (const t of ['mousedown', 'touchstart', 'touchmove']) box.addEventListener(t, e => {
    if (!S?.edit.drag) return;
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
  }, {
    capture: true,
    passive: false
  });
  box.addEventListener('pointermove', e => {
    const d = S?.edit.drag;
    if (!d || e.pointerId !== d.id) return;
    e.stopPropagation();
    [d.x, d.y] = pos(e);
    if (!d.moved && Math.hypot(d.x - d.x0, d.y - d.y0) > 6) d.moved = true;
    d.snap = d.moved ? snapAt(d.x, d.y) : null;
    schedule();
  }, true);
  const end = e => {
    const d = S?.edit.drag;
    if (!d || e.pointerId !== d.id) return;
    e.stopPropagation();
    S.edit.drag = null;
    S.edit.tapGuard = performance.now();
    if (e.type === 'pointercancel') return schedule();
    if (!d.moved) openCard(d.i);
    else if (d.snap) movePoint(d.i, d.snap);
    else {
      const ll = llAt(d.x, d.y); // loin de tout point où se poser : point libre (VFR, hélicoptère)
      if (ll) movePoint(d.i, {
        id: icaoCoord(ll.lat, ll.lon),
        lat: ll.lat,
        lon: ll.lon
      });
    }
    schedule();
  };
  box.addEventListener('pointerup', end, true);
  box.addEventListener('pointercancel', end, true);
  // appui long (500 ms, moins de 8 px) hors d'un point de la route : ajout là où le doigt reste
  let longT = 0,
    longAt = null;
  box.addEventListener('pointerdown', e => {
    clearTimeout(longT);
    if (!S?.edit.on || S.edit.drag || e.button > 0 || ui(e)) return;
    longAt = pos(e);
    longT = setTimeout(() => {
      if (!S || !longAt || S.edit.drag) return;
      S.edit.tapGuard = performance.now() + 300; // le toucher qui finit l'appui long n'est pas un toucher simple
      addAt(...longAt);
      longAt = null;
    }, 500);
  });
  box.addEventListener('pointermove', e => {
    if (!longAt) return;
    const [x, y] = pos(e);
    if (Math.hypot(x - longAt[0], y - longAt[1]) > 8) {
      clearTimeout(longT);
      longAt = null;
    }
  });
  for (const t of ['pointerup', 'pointercancel']) box.addEventListener(t, () => {
    clearTimeout(longT);
    longAt = null;
  });
  // l'appui long n'ouvre pas le menu du navigateur pendant le mode
  box.addEventListener('contextmenu', e => {
    if (S?.edit.on && !ui(e)) e.preventDefault();
  });
  S.cardEl.addEventListener('click', e => {
    const lv = e.target.closest('[data-lvl]');
    if (lv) {
      const i = +lv.dataset.lvl;
      setLevel(i, heldLevel(i) + +lv.dataset.d);
      return openCard(i); // la carte reste ouverte, niveau à jour
    }
    const i = e.target.closest('[data-remove]')?.dataset.remove;
    if (i == null) return;
    hideTips();
    removePoint(+i);
  });
}
/** Gestes du mode sur le profil : un glisser vertical (plus de 6 px) règle le palier du tronçon touché ; un toucher sans
 *  glisser place le curseur. */
function levelGestures() {
  const box = S.profBox,
    pos = e => {
      const r = box.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
  box.addEventListener('pointerdown', e => {
    if (!S?.edit.on || !S.geo || e.button > 0 || e.target.closest('.mp-tip')) return;
    const [x, y] = pos(e),
      seg = segmentAt(MapsProfile.sOf(S.geo, x));
    if (!seg) return;
    e.stopPropagation();
    e.preventDefault();
    S.edit.ldrag = {
      ...seg,
      id: e.pointerId,
      x,
      y0: y,
      ft: heldLevel(seg.i),
      moved: false
    };
    try {
      box.setPointerCapture(e.pointerId);
    } catch {
      /* capture refusée : le glisser suit tant que le doigt reste sur le profil */
    }
  }, true);
  box.addEventListener('pointermove', e => {
    const d = S?.edit.ldrag;
    if (!d || e.pointerId !== d.id) return;
    e.stopPropagation();
    const [, y] = pos(e);
    if (!d.moved && Math.abs(y - d.y0) > 6) d.moved = true;
    if (!d.moved) return;
    d.ft = Math.max(1000, Math.min(S.geo.top, Math.round(altAtY(S.geo, y) / 1000) * 1000));
    drawCursor();
  }, true);
  const end = e => {
    const d = S?.edit.ldrag;
    if (!d || e.pointerId !== d.id) return;
    e.stopPropagation();
    S.edit.ldrag = null;
    if (e.type === 'pointercancel') return drawCursor();
    if (d.moved) setLevel(d.i, d.ft);
    else setCursor(MapsProfile.sOf(S.geo, d.x));
    drawCursor();
  };
  box.addEventListener('pointerup', end, true);
  box.addEventListener('pointercancel', end, true);
}
