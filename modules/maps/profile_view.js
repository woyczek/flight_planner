// V3 maps — le profil vertical dans la feuille (modules/maps/SPEC.md § 8) : la coupe du vol (profile.js), son dessin à la
// hauteur exacte du corps, les marques NM et les points des voies, le curseur commun (doigt sur le profil, toucher sur la
// route), la ligne sous le profil, la fenêtre sur l'axe des distances (lib/axis_window.js) partagée avec la coupe météo.

import {
  S,
  keep,
  tt,
  got,
  setData,
  FT_NM,
  outLon,
  onMission,
  level,
  altTxt,
  tileLoader
} from './state.js';
import {
  createAxisWindow
} from './lib/axis_window.js';
import {
  TX
} from './texts.js';
import {
  schedule
} from './draw.js';
import {
  many,
  corridorBoxes
} from './data.js';
import {
  groupOf,
  layersNow
} from './layers.js';
import {
  status
} from './screen.js';
import {
  dataHead,
  legendSync,
  redrawSheet
} from './sheet_view.js';
import {
  drawProgressProfile,
  isStarted
} from './flight_time.js';
import {
  followTip,
  hoverHtml,
  linger,
  stay
} from './tips.js';
import {
  flownProfilePoints
} from './data.js';
import {
  drawProfileCons
} from './procs.js';

/** Repères de distance d'une fenêtre : un pas rond (1, 2, 5, 10, 20, 25, 50, 100, 200, 500 NM), deux repères à 40 px au
 *  moins (SPEC § 8.5). */
function nmTicks(from, to, plotW) {
  const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500].find(n => plotW * n / Math.max(1e-9, to - from) >= 40) || 500,
    out = [];
  for (let nm = Math.ceil(from / step) * step; nm <= to + 1e-9; nm += step)
    if (nm > 0) out.push({
      nm
    });
  return out;
}
/** Coupe du vol (SPEC § 8.1) : espaces des types du profil le long de la route (sans plancher ni plafond, sans les régions),
 *  relief Terrarium, sinon MORA ; la fenêtre gardée tant que la route est la même. */
/** Espace qui encombre le profil sans le guider : route libre (FRA), zone W / d'avertissement, zone de recherche météo. */
export const profileNoise = a => /\bFREE RT\b|\bFRA\b/i.test(a?.name || '') || /^(W|WARNING)$/i.test(a?.type || '') ||
  /^W[-\s]|METRESEARCH|WARNING/i.test(a?.name || '');
export async function buildProfile() {
  // le chemin « route + procédures » (points volés) quand il existe ; la carte d'une mission fournit ses propres points
  const f = S.route.flight,
    flown = !S.route.profilePoints && S.route.flown?.length > 1 ? S.route.flown : null,
    pts = S.route.profilePoints || (flown ? flownProfilePoints(flown, f) : S.route.points),
    A = S.ctx.aerodb;
  S.prof = null;
  S.geo = null;
  if (pts.length < 2) return drawProfile();
  const key = S.route.updated;
  let airspaces = [];
  if (A) {
    const list = await many(A.airspaces, corridorBoxes(pts, 2, null)).catch(() => []);
    if (!S) return; // la Carte a été quittée pendant la lecture
    const p = S.vprofProfile || S.profile;
    airspaces = MapsRender.selectAirspaces(list, {
      ...p,
      corridorNm: 0,
      elements: {
        ...p.elements,
        zoneFloor: '',
        zoneCeil: ''
      }
    }, pts);
    // régions (FIR, UIR, UTA, FRA…) : des repères de carte, pas des volumes à franchir
    if (!onMission()) airspaces = airspaces.filter(a => groupOf(a.type) !== 'asFir');
    // espaces à route libre (FRA, codés CTA « FREE RT ASPC »), zones W / d'avertissement et de recherche météo : absents du profil
    // sauf quand la couche « Autres espaces » est allumée sur la carte (utilisateur, 29 octobre : « la pollution par les CTA »)
    if (!onMission() && !layersNow().asOther) airspaces = airspaces.filter(a => !profileNoise(a));
  }
  S.terrain ||= SiaProfile.terrainSampler(9, tileLoader(S.ctx));
  // la route modifiée sur la carte (by 'maps') : le profil de Carburant est périmé jusqu'au devis refait ; by est le dernier
  // auteur de tout l'enregistrement (le cadre y écrit progress.actual, by 'frame'), seul 'maps' périme le profil ; un
  // profile.path qui ne couvre plus la coupe est de plus écarté par MapsProfile.build
  const stale = f?.by === 'maps',
    opts = (elevation, withMora) => ({
      levelFt: S.route.levelFt,
      profile: stale ? null : f?.profile || null,
      path: stale ? null : f?.profile?.path || null, // la trajectoire de Carburant sous les contraintes des procédures
      airspaces,
      elevation,
      mora: A && withMora ? (lat, lon) => A.mora(lat, outLon(lon)) : null
    }),
    // les échantillons sont sur la route déroulée : relief et MORA lus à la longitude enroulée
    relief = navigator.onLine === false ? null : (lat, lon) => S.terrain(lat, outLon(lon)),
    run = S.profRun = (S.profRun || 0) + 1;
  // la coupe d'abord sans rien à attendre — ni tuile de relief ni lecture des MORA (« relief indisponible ») : aucune attente ne
  // retient sa construction ; puis refaite avec le relief, ou à défaut les MORA des cases (les limites ASFC des espaces suivent le
  // relief : leur traversée change avec lui), elle la remplace si rien n'a changé entre-temps (SPEC § 8.3)
  S.terrainPending = true;
  const prof = await MapsProfile.build(pts, opts(null, false)).catch(() => null);
  if (!S || S.route.updated !== key || S.profRun !== run) return;
  showProf(prof, pts);
  const full = await MapsProfile.build(pts, opts(relief, true)).catch(() => null);
  if (!S || S.route.updated !== key || S.profRun !== run) return;
  S.terrainPending = false;
  if (full) showProf(full, pts); // relief ou MORA arrivés : la coupe complète ; sans relief la note reste (status)
}
/** La coupe calculée posée (S.prof) et dessinée : fenêtre gardée tant que la route est la même, la feuille, la bande, l'état. */
function showProf(prof, pts) {
  S.prof = prof;
  // fenêtre : gardée tant que la route est la même (le niveau ou les taux ont pu changer), remise dès que ses points diffèrent
  const sig = prof ? pts.map(p => `${p.id || ''}:${(+p.lat).toFixed(4)},${(+p.lon).toFixed(4)}`).join('|') : '',
    same = !!keep.win && keep.win.sig === sig;
  if (!same) keep.win = null;
  for (const w of [S.axw, S.axx].filter(Boolean)) {
    if (same) w.set(keep.win.from, keep.win.to, {
      quiet: true
    });
    else w.reset({
      quiet: true
    });
  }
  S.winSig = sig;
  performance.mark('maps:profile');
  drawProfile();
  strip();
  status();
  schedule();
}
/** Taille d'un canvas à son cadre (pixels de l'écran) : { W, H, dpr }. */
function fit(c, box) {
  const r = box.getBoundingClientRect(),
    dpr = Math.min(3, window.devicePixelRatio || 1),
    W = Math.max(1, Math.round(r.width)),
    H = Math.max(1, Math.round(r.height));
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
  }
  return {
    W,
    H,
    dpr
  };
}
/** Fenêtre de la route en NM, ou null pour le vol entier. */
export const windowNm = () => S.axw?.zoomed ? {
  from: S.axw.from,
  to: S.axw.to
} : null;
/** Coupe dessinée à la hauteur du corps (SiaProfile), marques NM au bas du cadre, points des voies, puis le curseur ; les
 *  attributs data-* disent ce qui est dessiné (SPEC § 18). */
export function drawProfile() {
  if (!S?.pc) return;
  if (S.profBox.hidden === !!S.prof) S.profBox.hidden = !S.prof;
  dataHead();
  if (!S.prof || S.dpanel) return; // un contenu ouvert : le profil est redessiné à sa fermeture
  const {
    W,
    H,
    dpr
  } = fit(S.pc, S.profBox), raw = S.pc.getContext('2d'), ctx = MapsRender.themed(raw, S.theme);
  raw.setTransform(dpr, 0, 0, dpr, 0, 0);
  // une seule passe de collision, celle de la Carte (SiaAero.pass), avec la liste fermée de la coupe (PROFILE_RANK)
  const g = S.geo = window.SiaAero.pass(ctx, (c, pl) => paintProfile(c, pl, W, H), r => PROFILE_RANK.get(r));
  S.lgCons = g.cons > 0;
  S.lgFixes = g.fixes > 0; // la légende ne dit que ce qui est dessiné
  setData(S.pc, 'axis', g.axisOk ? '1' : '0');
  setData(S.pc, 'marks', String(g.marks));
  // la fenêtre au centième de NM, comme la coupe (deux arrondis différents d'une même fenêtre ne se comparent pas)
  setData(S.pc, 'window', `${(g.w0 / FT_NM).toFixed(2)},${(g.w1 / FT_NM).toFixed(2)}`);
  setData(S.pc, 'scale', `${g.bottom},${g.top}`);
  setData(S.pc, 'plot', `${Math.round(g.padL)},${Math.round(g.W - g.padR)}`);
  setData(S.pc, 'ticks', g.ticks.map(m => m.nm).join(','));
  legendSync();
  drawCursor();
  winSync();
}
/** La liste fermée des priorités de la coupe (SPEC § 3) : TOC / TOD, contraintes des procédures choisies, paliers, espaces,
 *  obstacles, points des voies ; la case « +n » des espaces est réservée avant tout. */
const PROFILE_RANK = new Map(['plan', 'constraint', 'level', 'zone', 'obstacle', 'fix'].map((k, i) => [k, i]));
/** Un tour de la passe de la coupe (ctx, placeur pl) : la coupe (SiaProfile), les contraintes, les marques NM au bas du cadre, les
 *  points des voies ; rend la géométrie, avec cons (contraintes dessinées), ticks (marques NM) et fixes (points des voies
 *  écrits). */
function paintProfile(ctx, pl, W, H) {
  const g = MapsProfile.draw(ctx, S.prof, {
    W,
    H,
    scale: W < 500 ? .78 : 1,
    window: windowNm(),
    placer: pl
  });
  // paliers de contraintes des procédures choisies, sur la trajectoire prévue
  g.cons = onMission() ? 0 : drawProfileCons(ctx, g);
  // marques NM (celles de la carte) ; dans une fenêtre, des repères au pas rond de ce qui est visible
  const yb = g.H - g.padB,
    inX = x => x >= g.padL - .5 && x <= g.W - g.padR + .5,
    ticks = g.ticks = (g.zoomed ? nmTicks(g.w0 / FT_NM, g.w1 / FT_NM, g.W - g.padL - g.padR) : S.marks || []).filter(m => inX(MapsProfile
      .xOf(g, m.nm * FT_NM)));
  ctx.save();
  ctx.strokeStyle = '#8e24aa';
  ctx.fillStyle = '#8e24aa';
  ctx.font = '600 9px Arial,sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const m of ticks) {
    const x = MapsProfile.xOf(g, m.nm * FT_NM);
    ctx.beginPath();
    ctx.moveTo(x, yb);
    ctx.lineTo(x, yb - 6);
    ctx.stroke();
    ctx.fillText(String(m.nm), x, yb - 7);
  }
  // points des voies et balises à moins de 3 NM de la route : petit triangle et nom, 30 px au moins entre deux, jamais sur un
  // libellé d'espace ; une coupe basse (moins de 90 px de tracé) n'en a pas
  const ends = new Map();
  for (const w of S.data?.data?.airways || [])
    for (const e of [w.a, w.b])
      if (e?.id) ends.set(e.id, e);
  for (const n of S.data?.data?.navaids || []) ends.set(n.id, n);
  const own = new Set(S.route.points.map(p => p.id)),
    marks = [];
  for (const e of g.H - g.padT - g.padB < 90 ? [] : ends.values()) {
    if (own.has(e.id)) continue;
    const pr = MapsProfile.project(S.prof, e.lat, e.lon);
    if (pr.s != null && pr.offNm <= 3 && inX(MapsProfile.xOf(g, pr.s))) marks.push({
      id: e.id,
      x: MapsProfile.xOf(g, pr.s)
    });
  }
  marks.sort((a, b) => a.x - b.x);
  ctx.fillStyle = S.theme.fg;
  ctx.strokeStyle = S.theme.fg;
  let lastX = -Infinity,
    nFix = 0;
  for (const m of marks) {
    const y = yb - 22,
      w = ctx.measureText(m.id).width / 2 + 2;
    if (m.x - lastX < 30 || !MapsRender.kit.ask(pl, {
        layer: 'profile',
        rank: 'fix',
        key: `fx:${m.id}`,
        boxes: [{
          x0: m.x - w,
          y0: y - 14,
          x1: m.x + w,
          y1: y + 3
        }]
      })) continue;
    lastX = m.x;
    nFix++;
    ctx.beginPath();
    ctx.moveTo(m.x, y - 4);
    ctx.lineTo(m.x + 3.5, y + 2);
    ctx.lineTo(m.x - 3.5, y + 2);
    ctx.closePath();
    ctx.stroke();
    ctx.fillText(m.id, m.x, y - 5);
  }
  ctx.restore();
  g.fixes = nFix;
  return g;
}
/** « Vol entier » : dans l'en-tête, devant un dessin, tant que la fenêtre est resserrée ; écrit seulement s'il change. */
export function winSync() {
  if (!S?.wholeBtn || !S.axw) return;
  const on = (S.dpanel === 'weather' ? !!S.wxGeo : !S.dpanel && !!S.prof) && S.axw.zoomed;
  if (S.wholeBtn.hidden === on) S.wholeBtn.hidden = !on;
}
let profRaf = 0;
/** Fenêtre changée par un geste (profil ou coupe) : gardée le temps de la page, le dessin montré redessiné au prochain tour
 *  d'animation (un seul). */
export function onWindow() {
  keep.win = S.axw.zoomed ? {
    sig: S.winSig,
    from: S.axw.from,
    to: S.axw.to
  } : null;
  if (!profRaf) profRaf = requestAnimationFrame(() => {
    profRaf = 0;
    if (!S) return;
    if (S.dpanel === 'weather') redrawSheet();
    else drawProfile();
  });
}
/** Dessin de fenêtre abandonné (démontage). */
export function cancelProfile() {
  if (profRaf) cancelAnimationFrame(profRaf);
  profRaf = 0;
}
/** Curseur sur le profil (trait vertical, point à l'altitude prévue), sur son canvas ; progression d'un vol démarré ; le
 *  palier en cours de glisser du mode Édition. */
export function drawCursor() {
  if (!S?.pcur || !S.geo) return;
  const {
    W,
    H,
    dpr
  } = fit(S.pcur, S.profBox), ctx = S.pcur.getContext('2d'), g = S.geo;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.beginPath();
  ctx.rect(g.padL, 0, g.W - g.padL - g.padR, H); // rien hors du cadre de tracé
  ctx.clip();
  if (!onMission() && isStarted(S.route.flight)) drawProgressProfile(ctx);
  ctx.restore();
  if (S.edit.ldrag) got('edit')?.drawLevelDrag(ctx);
  if (S.cursor == null) return;
  const x = MapsProfile.xOf(g, S.cursor),
    info = MapsProfile.at(S.prof, S.cursor);
  if (x < g.padL - .5 || x > g.W - g.padR + .5) return; // hors de la fenêtre
  ctx.save();
  ctx.strokeStyle = S.theme.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, g.padT);
  ctx.lineTo(x, g.H - g.padB);
  ctx.stroke();
  if (info.alt != null) {
    ctx.beginPath();
    ctx.arc(x, yAtAlt(g, info.alt), 5, 0, Math.PI * 2);
    ctx.fillStyle = S.theme.accent;
    ctx.fill();
  }
  ctx.restore();
}
/** Hauteur y du profil pour une altitude (ft), bornée au cadre, et l'inverse. */
export const yAtAlt = (g, a) => g.padT + (g.H - g.padT - g.padB) * (1 - (Math.min(Math.max(a, g.bottom), g.top) - g.bottom) / (g.top - g
  .bottom));
export const altAtY = (g, y) => g.bottom + (1 - (y - g.padT) / (g.H - g.padT - g.padB)) * (g.top - g.bottom);
/** Ligne sous le profil (feuille agrandie) : distance, altitude prévue, relief ou MORA, espaces sous le curseur du plus haut
 *  au plus bas, ou « hors des espaces montrés » ; vide sans curseur. */
function strip() {
  if (!S?.stripEl) return;
  let text = '';
  if (S.prof && S.cursor != null) {
    const i = MapsProfile.at(S.prof, S.cursor),
      zones = MapsRender.sortAirspacesTopDown(i.zones).map(z => MapsRender.sia(z)[0]);
    text = [tt(TX.dist, {
      d: i.nm.toFixed(i.nm < 10 ? 1 : 0)
    }), i.alt != null ? tt(TX.planned, {
      a: level(i.alt)
    }) : '', i.terrain != null ? tt(TX.terrain, {
      h: altTxt(i.terrain)
    }) : Number.isFinite(i.mora) ? tt(TX.mora, {
      h: altTxt(i.mora)
    }) : '', zones.length ? zones.join(', ') : tt(TX.noZoneHere)].filter(Boolean).join(' · ');
  }
  if (S.stripEl.textContent !== text) {
    S.stripEl.textContent = text;
    S.stripEl.title = text;
  }
}
/** Curseur commun à la distance s (mètres ; null : effacé) : profil, carte, ligne et coupe le suivent ; data-cursor-nm. */
export function setCursor(s) {
  S.cursor = s;
  setData(S.mapEl, 'cursorNm', s == null ? '' : String(Math.round(s / FT_NM * 10) / 10));
  drawCursor();
  strip();
  schedule();
  redrawSheet();
}

/** Gestes du profil : la fenêtre (deux doigts, double toucher, Ctrl + molette ; jamais un seul doigt, désarmée en mode
 *  Édition et sous un autre contenu) et le curseur commun avec l'infobulle des espaces traversés. Rend les fonctions d'arrêt. */
export function profileEvents() {
  const routeNm = () => S.prof ? S.prof.total / FT_NM : 0;
  S.axw = createAxisWindow(S.profBox, {
    total: routeNm,
    min: 5,
    plot: () => S.geo ? {
      x0: S.geo.padL,
      x1: S.geo.W - S.geo.padR
    } : null,
    enabled: () => !S.edit.on && !S.dpanel,
    onChange: (f, t) => {
      S.axx?.set(f, t, {
        quiet: true
      }); // la coupe porte la même fenêtre
      onWindow();
    }
  });
  S.wholeBtn.addEventListener('click', () => S.axw.reset());
  const onProf = e => {
    if (S.axw.active || !S?.geo || S.edit.ldrag || (e.type === 'pointermove' && !e.buttons && e.pointerType !== 'mouse')) return;
    const r = S.profBox.getBoundingClientRect(),
      x = e.clientX - r.left;
    setCursor(MapsProfile.sOf(S.geo, x));
    const zones = MapsProfile.at(S.prof, S.cursor).zones;
    if (!zones.length) return linger('prof');
    stay('prof');
    const l = zones.map(z => MapsRender.sia(z)[0]);
    followTip(S.ptipEl, S.profBox, x, e.clientY - r.top, hoverHtml(l[0], l.length > 2 ? `${l[1]} ${tt(TX.tipMore, {
      n: l.length - 2
    })}` : l[1] || ''));
  };
  S.profBox.addEventListener('pointerleave', e => {
    if (e.pointerType === 'mouse') linger('prof');
  });
  S.profBox.addEventListener('pointerup', e => {
    if (e.pointerType !== 'mouse') linger('prof'); // doigt levé : l'infobulle reste 5 s
  });
  S.profBox.addEventListener('pointerdown', onProf);
  S.profBox.addEventListener('pointermove', onProf);
  return [() => S.axw.stop()];
}
