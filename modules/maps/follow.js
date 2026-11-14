// V3 maps — le suivi du vol (SOG-0304, la maquette validée : modules/maps/maquette/suivi.html ; tranche a) : pendant un vol démarré, jamais SUR la carte — sous elle au téléphone (fermé : UNE ligne,
// tiré : le suivi entier), une colonne de 340 px à droite de la carte dès 1 000 px (elle se rétrécit), repliable en une ligne. Ne lit et n'écrit rien du vol partagé : il lit ce que la Carte sait déjà du
// vol démarré (la position réelle et son âge, progress.phase, les heures prévues du cadre, la route volée, la coupe).
// Tranche a : la ligne fermée (prochain point, temps, cap qui suit), PROCHAIN POINT, et le bandeau de trois cases (DESCENTE, PRÉVU AU POINT, SÉCURITÉ). Le contrôle (cercle de portée, « Contacté », gros
// bouton au sol), la radionav et le lien de la procédure sont les tranches b et c.

import {
  S,
  esc,
  tt,
  flownPts,
  nmTxt,
  level
} from './state.js';
import {
  TX
} from './texts.js';
import {
  isStarted,
  etaOf
} from '../../frame/lib/current_flight.js';
import {
  progressState,
  isArrived
} from './flight_time.js';
import {
  fmtZ
} from '../../frame/lib/time.js';

const FT_NM = 6076.12,
  DEFAULT_GS = 250;
/** Ce que le suivi dit à cet instant, ou null (pas de vol démarré, arrivé, une carte de mission, une route sans deux points, aucune position) :
 *  { next: { id, min, nm, hdg, then, at }, descent: { min, nm } | { now: true } | null, fuelKg, gps } ; gps faux : « d'après le plan » (pas de position réelle). */
export function followState(now = Date.now()) {
  const f = S?.route?.flight;
  if (!f || S.missionId || !isStarted(f) || isArrived(f)) return null;
  const pts = flownPts();
  if (pts.length < 2) return null;
  const st = progressState(),
    cum = MapsRender.distances(pts),
    total = cum[cum.length - 1],
    nm = st.pa ? st.pa.nm : st.planned?.nmFromDep;
  if (!Number.isFinite(nm)) return null;
  const eta = etaOf(f, now, {
    path: pts
  }) || [];
  let i = 1;
  while (i < pts.length - 1 && cum[i] <= nm + .2) i++;
  // la vitesse : le sol réel quand il est donné, sinon celle du plan sur ce tronçon, sinon 250 kt
  const legMin = eta[i] && eta[i - 1] ? (Date.parse(eta[i].at) - Date.parse(eta[i - 1].at)) / 60e3 : 0,
    planGs = legMin > 0 ? (cum[i] - cum[i - 1]) / legMin * 60 : 0,
    gs = +st.actual?.gsKt > 30 ? +st.actual.gsKt : planGs > 30 ? planGs : DEFAULT_GS,
    dNm = Math.max(0, cum[i] - nm),
    next = {
      id: String(pts[i].id || pts[i].name || '').slice(0, 12),
      nm: dNm,
      min: dNm / gs * 60,
      hdg: i < pts.length - 1 ? Math.round(MapsRender.trackOf(pts[i], pts[i + 1])) : null,
      then: i < pts.length - 1 ? String(pts[i + 1].id || pts[i + 1].name || '').slice(0, 12) : '',
      at: eta[i]?.at ? fmtZ(eta[i].at) : ''
    };
  // la descente : le début de descente (TOD) de la coupe, ramené sur la route volée ; passé, « en descente »
  let descent = null;
  const todFt = S.prof?.plan?.tod?.s;
  if (Number.isFinite(todFt) && S.prof.total > 0 && total > 0) {
    const dTod = todFt / S.prof.total * total - nm;
    descent = dTod > 0 ? {
      nm: dTod,
      min: dTod / gs * 60
    } : {
      now: true,
      ft: Number.isFinite(+st.actual?.altFt) ? +st.actual.altFt : null
    };
  }
  return {
    next,
    descent,
    fuelKg: Number.isFinite(+f.progress?.fuelRemainingKg) ? Math.round(+f.progress.fuelRemainingKg) : null,
    gps: !!st.actual,
    stale: st.stale
  };
}
const mins = m => m < 1 ? '< 1 min' : `${Math.round(m)} min`;
/** La ligne fermée : toujours lisible (la seconde moitié, le contrôle, est la tranche b). */
function lineHtml(s) {
  return `<span class="mp-fl-a">${esc(tt(TX.followLine, {
    id: s.next.id,
    t: mins(s.next.min)
  }))}${s.next.hdg != null ? ` → ${esc(String(s.next.hdg))}°` : ''}</span>`;
}
/** Le suivi ouvert : PROCHAIN POINT, puis le bandeau de trois cases à deux lignes (la maquette). */
function fullHtml(s) {
  const d = s.descent,
    cell = (k, a, b) => `<div><div class="mp-fl-k">${esc(tt(k))}</div><div class="mp-fl-v">${esc(a)}</div><div class="mp-fl-s">${esc(b || '')}</div></div>`;
  return `<div class="mp-fl-sec"><div class="mp-fl-k">${esc(tt(TX.followNext))}</div><div class="mp-fl-v">${esc(tt(TX.followPoint, {
    id: s.next.id,
    t: mins(s.next.min),
    d: nmTxt(s.next.nm)
  }))}</div>${s.next.hdg != null && s.next.then ? `<div class="mp-fl-s">${esc(tt(TX.followThen, {
    h: s.next.hdg,
    id: s.next.then
  }))}</div>` : ''}</div>
  <div class="mp-fl-band">${cell(TX.followDescent, !d ? '—' : d.now ? tt(TX.followDescending) : mins(d.min), !d ? '' : d.now ? (d.ft != null ? level(d.ft) : '') : `${nmTxt(d.nm)} NM`)}${cell(TX.followPlanned, s.next.at || '—', s.fuelKg != null ? `${s.fuelKg} kg` : '')}${cell(TX.followSafety, '—', '')}</div>`;
}
/** Dessine le suivi (écrit seulement s'il change) ; appelé à chaque progression lue et toutes les 15 s (le temps avant le point). */
export function followRender() {
  const el = S?.followEl;
  if (!el) return;
  const s = followState(),
    open = S.followOpen !== false,
    folded = !!S.followFolded;
  let html = '';
  if (s) html = `<button type="button" class="mp-fl-line" data-follow-toggle aria-expanded="${open && !folded}">${lineHtml(s)}${s.gps ? '' : `<span class="mp-fl-gps">${esc(tt(TX.followPlan))}</span>`}<span class="mp-fl-ch" aria-hidden="true">${open && !folded ? '▾' : '▴'}</span></button>${open && !folded ? `<div class="mp-fl-full">${fullHtml(s)}</div>` : ''}`;
  if (el.hidden === !!s) el.hidden = !s;
  if (S.el.classList.contains('mp-has-follow') !== !!s) S.el.classList.toggle('mp-has-follow', !!s);
  if (el.dataset.html !== html) {
    el.dataset.html = html;
    el.innerHTML = html;
  }
}
/** Écoute du geste unique du suivi : replier / déplier ; rend l'arrêt. */
export function followStart() {
  const tick = setInterval(followRender, 15000),
    click = e => {
      if (!e.target.closest('[data-follow-toggle]')) return;
      S.followOpen = S.followOpen === false;
      followRender();
    };
  S.followEl?.addEventListener('click', click);
  followRender();
  return () => {
    clearInterval(tick);
    S?.followEl?.removeEventListener('click', click);
  };
}
