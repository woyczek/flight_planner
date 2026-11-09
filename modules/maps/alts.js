// V3 maps — la couche « itinéraires proposés » (modules/maps/SPEC.md § 5.4 ; contrat : modules/fuel/INTEGRATION.md § 3 bis, SOG-0134 a) :
// les routes que Carburant calcule ou contrôle (« Calculer A → B », « Contrôler ») sont résolues en positions par Carburant et publiées
// (l'événement de fenêtre fuel-route-alts, le document cache/fuel/route_alts.json) ; la Carte les dessine — le choisi en plein, les
// autres estompés, le survolé épaissi, les tronçons fautifs en rouge — et rend le choix (un appui sur un tracé ou sur sa ligne :
// maps-route-alt en vue double, #fuel?ralt=<index> sur une Carte seule). Tout ce qui est lu est borné : un index est un entier de la
// liste, le reste du document n'est jamais pris tel quel.

import {
  S,
  esc,
  tt,
  onMission,
  thinPx
} from './state.js';
import {
  TX
} from './texts.js';
import {
  schedule
} from './draw.js';

const DOC = 'cache/fuel/route_alts.json',
  MAX_ROUTES = 8,
  MAX_POINTS = 400,
  HIT_PX = 9,
  RED = '#d6173f';
const num = (v, lo, hi) => Number.isFinite(+v) && +v >= lo && +v <= hi;
const clean = (v, n) => typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) : '';

/** Le document ou l'événement de Carburant, nettoyé : { mode, dep, arr, chosen, hovered, list: [{ index, name, faulty (Set), points }] } ou null. */
export function altsSanitize(raw) {
  if (!raw || typeof raw !== 'object' || raw.schema !== 1 || !Array.isArray(raw.alternatives)) return null;
  const list = [];
  for (const a of raw.alternatives.slice(0, MAX_ROUTES)) {
    if (!a || typeof a !== 'object' || !Array.isArray(a.points)) continue;
    const points = a.points.slice(0, MAX_POINTS).filter(p => Array.isArray(p) && num(p[0], -90, 90) && num(p[1], -180, 180)).map(p => ({
      lat: +p[0],
      lon: +p[1]
    }));
    if (points.length < 2) continue;
    list.push({
      index: Number.isInteger(a.index) ? a.index : list.length,
      name: clean(a.name, 60) || clean(a.route, 60),
      faulty: new Set((Array.isArray(a.faulty) ? a.faulty : []).filter(k => Number.isInteger(k) && k >= 0 && k < points.length - 1)
        .slice(0, MAX_POINTS)),
      points
    });
  }
  const ixs = list.map(a => a.index);
  return {
    mode: raw.mode === 'check' ? 'check' : 'compute',
    dep: clean(raw.dep, 8).toUpperCase(),
    arr: clean(raw.arr, 8).toUpperCase(),
    chosen: ixs.includes(raw.chosen) ? raw.chosen : null,
    hovered: ixs.includes(raw.hovered) ? raw.hovered : null,
    list
  };
}
/** Les itinéraires à dessiner : ceux du couple départ / arrivée du vol montré (une Carte d'un autre couple ne dessine rien), jamais sur une carte
 *  de mission. */
const current = () => {
  const A = S?.alts,
    r = S?.route?.flight?.route;
  if (!A || !A.list.length || onMission() || S.choose) return null;
  return r && String(r.dep || '').toUpperCase() === A.dep && String(r.arr || '').toUpperCase() === A.arr ? A : null;
};
/** Vue double : Carburant est à côté (le volet ou la page principale), il écoute maps-route-alt ; seule, la Carte renvoie vers lui. */
const dual = () => S?.ctx?.query?.pane === '1' || !!S?.ctx?.query?.with;

/** Les itinéraires, sur la couche des écrans (après la carte) ; rend les tracés touchables : [{ index, q }] en coordonnées de la vue. */
export function drawAlts(ctx, toC) {
  const A = current();
  if (A || (S.altsEl && !S.altsEl.hidden)) altsCard(); // la liste suit ce qui est dessiné (écrite seulement si elle change)
  if (!A) return [];
  const col = MapsRender.palette(!!S.theme?.dark).route,
    bg = S.theme?.bg || '#fff',
    hov = S.altHover ?? A.hovered,
    rank = a => a.index === hov ? 2 : a.index === A.chosen ? 1 : 0,
    hits = [];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const a of [...A.list].sort((x, y) => rank(x) - rank(y))) {
    const q = thinPx(a.points.map(p => toC(p.lat, p.lon))), // un point par pixel au plus (SOG-0156)
      on = rank(a) > 0,
      w = a.index === hov ? 7 : a.index === A.chosen ? 4.5 : 3,
      run = (from, to) => {
        ctx.beginPath();
        for (let i = from; i <= to; i++) i === from ? ctx.moveTo(q[i].x, q[i].y) : ctx.lineTo(q[i].x, q[i].y);
        ctx.stroke();
      };
    ctx.globalAlpha = on ? 1 : .38;
    ctx.strokeStyle = bg;
    ctx.lineWidth = w + 3;
    run(0, q.length - 1);
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    run(0, q.length - 1);
    ctx.strokeStyle = RED; // les tronçons fautifs, par-dessus
    for (const k of a.faulty) run(k, k + 1);
    hits.push({
      index: a.index,
      q
    });
  }
  ctx.restore();
  return hits;
}
const segDist = (x, y, a, b) => {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    l2 = dx * dx + dy * dy,
    t = l2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2)) : 0;
  return Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy));
};
/** L'itinéraire proposé sous (x, y) (vue), le plus proche à 9 px, ou -1. */
export function altAt(x, y) {
  let best = -1,
    d = HIT_PX;
  for (const h of S.altHits || [])
    for (let i = 1; i < h.q.length; i++) {
      const e = segDist(x, y, h.q[i - 1], h.q[i]);
      if (e < d) {
        d = e;
        best = h.index;
      }
    }
  return best;
}
/** Prendre l'itinéraire i : seulement un entier de la liste, et seulement pour un calcul (un contrôle n'a rien à choisir). */
export function altsPick(i) {
  const A = current();
  if (!A || A.mode !== 'compute' || !Number.isInteger(i) || !A.list.some(a => a.index === i)) return false;
  if (dual()) window.dispatchEvent(new CustomEvent('maps-route-alt', {
    detail: {
      index: i
    }
  }));
  else location.hash = `#fuel?ralt=${i}`;
  return true;
}
/** Un appui sur la carte en (x, y) : sur un tracé proposé, c'est « Prendre » (vrai) ; sinon rien (faux). */
export function altsTap(x, y) {
  const i = altAt(x, y);
  return i >= 0 && altsPick(i);
}
/** La liste des itinéraires au-dessus de la carte (une Carte seule : en vue double Carburant a la sienne) : une ligne par route, le choisi
 *  marqué, une faute dite ; un appui prend. Écrite seulement si elle change. */
export function altsCard() {
  const el = S?.altsEl;
  if (!el) return;
  const A = current(),
    on = !!A && !dual() && A.list.length > 0,
    html = on ? `<b class="mp-al-t">${esc(tt(A.mode === 'check' ? TX.altCheck : TX.altTitle))}</b>${A.list.map(a => `<button type="button" class="mp-al-row" data-alt="${a.index}" data-chosen="${a.index === A.chosen ? 1 : 0}" data-faulty="${a.faulty.size ? 1 : 0}"${A.mode === 'compute' ? '' : ' disabled'}><span class="mp-al-n">${esc(a.name || `#${a.index + 1}`)}</span>${a.index === A.chosen ? `<span class="mp-al-k">${esc(tt(TX.altChosen))}</span>` : ''}${a.faulty.size ? `<span class="mp-al-f">${esc(tt(TX.altFaulty))}</span>` : ''}</button>`).join('')}` : '';
  if (el.hidden === on) el.hidden = !on;
  if (el.innerHTML !== html) el.innerHTML = html;
}
/** Ce que Carburant publie, posé (null : rien ou effacé) et redessiné. */
function put(raw) {
  if (!S) return;
  S.alts = altsSanitize(raw);
  if (S.alts && !S.alts.list.length) S.alts = null; // effacé : nouvelle demande, autre couple, refus
  S.altHover = null;
  altsCard();
  schedule();
}
/** Écoute (l'événement de la vue double, le document pour une Carte ouverte ensuite) et lit le document une fois ; rend l'arrêt. */
export function altsStart() {
  const stops = [],
    onEvt = e => put(e.detail),
    readDoc = async () => {
      const d = await S?.ctx.data.get(DOC).catch(() => null);
      if (S && !S.altsLive) put(d);
    };
  // l'événement est plus frais que le document : il l'emporte (le document, écrit à chaque changement sauf le survol, le suit)
  const evt = e => {
    if (S) {
      S.altsLive = true;
      onEvt(e);
    }
  };
  window.addEventListener('fuel-route-alts', evt);
  stops.push(() => window.removeEventListener('fuel-route-alts', evt));
  readDoc();
  if (S.ctx.data.watch) stops.push(S.ctx.data.watch('cache/fuel/', paths => {
    if (S && (paths || []).some(p => p === DOC)) readDoc();
  }));
  S.altsEl?.addEventListener('click', e => {
    const b = e.target.closest('[data-alt]');
    if (b) altsPick(+b.dataset.alt);
  });
  S.altsEl?.addEventListener('pointerover', e => {
    const b = e.target.closest('[data-alt]');
    S.altHover = b ? +b.dataset.alt : null;
    schedule();
  });
  S.altsEl?.addEventListener('pointerleave', () => {
    S.altHover = null;
    schedule();
  });
  return () => stops.forEach(f => f());
}
