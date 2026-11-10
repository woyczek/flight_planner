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
  onMission
} from './state.js';
import {
  TX
} from './texts.js';
import {
  schedule
} from './draw.js';
import {
  colOf
} from './procs.js';

const DOC = 'cache/fuel/route_alts.json',
  MAX_ROUTES = 8,
  MAX_POINTS = 400,
  HIT_PX = 9,
  RED = '#d6173f';
/** Ce que le moteur dit d'un tronçon (route/compute) : contrôlé, incomplet, repli, erreur. */
const CONTROLS = ['controlled', 'incomplete', 'fallback', 'error'];
/** La couche d'un tronçon (route/compute) : SID, voies basses ou hautes, route libre, STAR, approche. */
const LAYERS = ['SID', 'LOW', 'HIGH', 'FRA', 'STAR', 'APP'];
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
    // control (SOG-0161) : une entrée par tronçon points[k] → points[k + 1] ; lu seulement si aucun point n'a été écarté (les indices resteraient justes)
    const control = Array.isArray(a.control) && a.points.length === points.length && a.points.length <= MAX_POINTS ?
      a.control.slice(0, points.length - 1).map(v => CONTROLS.includes(v) ? v : null) : [];
    // via (SOG-0134 b) : par tronçon, l'identifiant de la voie, DCT ou FRA ; layer : sa couche ; mêmes indices que control. Vides sans le champ.
    const whole = a.points.length === points.length && a.points.length <= MAX_POINTS,
      via = Array.isArray(a.via) && whole ? a.via.slice(0, points.length - 1).map(v => typeof v === 'string' && /^[A-Z0-9]{1,16}$/i.test(
        v) ? v.toUpperCase() : '') : [],
      layer = Array.isArray(a.layer) && whole ? a.layer.slice(0, points.length - 1).map(v => LAYERS.includes(v) ? v : '') : [],
      ids = Array.isArray(a.ids) && a.ids.length === points.length && whole ? a.ids.map(v => typeof v === 'string' && /^[A-Z0-9._-]{1,12}$/i
        .test(v) ? v.toUpperCase() : '') : [];
    list.push({
      control,
      via,
      layer,
      ids,
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

/** La nature d'un tronçon d'un itinéraire proposé, d'après ce que le moteur en dit (via, layer) et ses fautes : error (rouge), sid / star / app (la teinte
 *  des procédures), fra (pointillé), dct (tirets), awy (une voie : plein, son nom le long), plain (nature non dite : plein). */
const natureOf = (a, k) => {
  if (a.faulty.has(k) || a.control[k] === 'error') return 'error';
  const L = a.layer[k],
    v = a.via[k];
  if (L === 'SID') return 'sid';
  if (L === 'STAR') return 'star';
  if (L === 'APP') return 'app';
  if (L === 'FRA' || v === 'FRA') return 'fra';
  if (v === 'DCT') return 'dct';
  return v ? 'awy' : 'plain';
};
/** Un itinéraire dit-il la nature de ses tronçons ? Sinon, le dessin de SOG-0161 (contrôlé plein, incomplet tireté, repli pointillé). */
const natureKnown = a => a.via.some(Boolean) || a.layer.some(Boolean);
/** Les itinéraires, sur la couche des écrans (après la carte) ; rend les tracés touchables : [{ index, q }] en coordonnées de la vue. Le trait a
 *  l'épaisseur de la route du vol (le choisi plein, les autres estompés, le survolé plus épais) ; il dit la nature du tronçon (SOG-0134) :
 *  voie = plein avec son nom le long, DCT = tirets, FRA = pointillé, SID / STAR / approche = la teinte des procédures, faute = rouge, un tronçon
 *  non contrôlé en entier est plus fin ; les points du choisi sont marqués et nommés, désencombrés au zoom large. */
export function drawAlts(ctx, toC) {
  const A = current();
  if (A || (S.altsEl && !S.altsEl.hidden)) altsCard(); // la liste suit ce qui est dessiné (écrite seulement si elle change)
  if (!A) return [];
  const dark = !!S.theme?.dark,
    col = MapsRender.palette(dark).route,
    tint = {
      sid: colOf('sid'),
      star: colOf('star'),
      app: colOf('app'),
      error: RED
    },
    bg = S.theme?.bg || '#fff',
    fg = S.theme?.fg || '#17202a',
    hov = S.altHover ?? A.hovered,
    rank = a => a.index === hov ? 2 : a.index === A.chosen ? 1 : 0,
    hits = [],
    taken = []; // les cadres des noms déjà posés (jamais deux noms l'un sur l'autre)
  const free = (x, y, w, h) => !taken.some(r => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.font = '700 11px sans-serif';
  ctx.textBaseline = 'middle';
  for (const a of [...A.list].sort((x, y) => rank(x) - rank(y))) {
    const q = a.points.map(p => toC(p.lat, p
        .lon)), // les indices des tronçons restent ceux de la route ; un point à moins d'un pixel du dernier tracé est sauté (SOG-0156)
      on = rank(a) > 0,
      w = a.index === hov ? 6.5 : 4, // 4 px : l'épaisseur de la route du vol ; le survolé l'emporte sur elle
      known = natureKnown(a),
      run = (from, to) => {
        ctx.beginPath();
        ctx.moveTo(q[from].x, q[from].y);
        let last = q[from];
        for (let i = from + 1; i <= to; i++) {
          if (i < to && Math.abs(q[i].x - last.x) < 1 && Math.abs(q[i].y - last.y) < 1) continue;
          ctx.lineTo(q[i].x, q[i].y);
          last = q[i];
        }
        ctx.stroke();
      },
      // la sorte d'un tronçon : sa nature (si le moteur la dit) et s'il est contrôlé en entier ; sans nature, le dessin de SOG-0161
      thin = k => known && (a.control[k] === 'incomplete' || a.control[k] === 'fallback'),
      kind = k => known ? `${natureOf(a, k)}${thin(k) ? '.thin' : ''}` : a.faulty.has(k) || a.control[k] === 'error' ? 'error' : a.control[k] === 'incomplete' ?
      'incomplete' : a.control[k] === 'fallback' ? 'fallback' : 'plain',
      dash = s => s.startsWith('dct') ? [w * 3, w * 2.2] : s.startsWith('fra') || s === 'fallback' ? [.1, w * 2] : s === 'incomplete' ? [w *
        2.6, w * 1.6
      ] : [];
    ctx.globalAlpha = on ? 1 : .38;
    ctx.strokeStyle = bg;
    ctx.lineWidth = w + 3.5;
    run(0, q.length - 1);
    for (let k = 0; k < q.length - 1;) { // des suites de tronçons de même sorte
      const s = kind(k);
      let e = k + 1;
      while (e < q.length - 1 && kind(e) === s) e++;
      ctx.strokeStyle = tint[s.split('.')[0]] || col;
      ctx.lineWidth = s.endsWith('.thin') ? w * .6 : w;
      ctx.setLineDash(dash(s));
      run(k, e);
      k = e;
    }
    ctx.setLineDash([]);
    if (on && known) { // le nom de la voie le long du trait, sur le plus long tronçon de chaque suite, quand il y tient
      ctx.fillStyle = fg;
      ctx.strokeStyle = bg;
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      for (let k = 0; k < q.length - 1;) {
        const v = a.via[k];
        let e = k + 1;
        while (e < q.length - 1 && a.via[e] === v) e++;
        if (natureOf(a, k) === 'awy') {
          let best = k;
          for (let i = k + 1; i < e; i++)
            if (Math.hypot(q[i + 1].x - q[i].x, q[i + 1].y - q[i].y) > Math.hypot(q[best + 1].x - q[best].x, q[best + 1].y - q[best].y))
              best = i;
          const p0 = q[best],
            p1 = q[best + 1],
            len = Math.hypot(p1.x - p0.x, p1.y - p0.y),
            tw = ctx.measureText(v).width;
          if (len >= tw + 16) {
            const mx = (p0.x + p1.x) / 2,
              my = (p0.y + p1.y) / 2;
            let ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
            if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI; // le nom se lit toujours à l'endroit
            if (free(mx - tw / 2, my - 7, tw, 14)) {
              taken.push({
                x: mx - tw / 2,
                y: my - 7,
                w: tw,
                h: 14
              });
              ctx.save();
              ctx.translate(mx, my - 8);
              ctx.rotate(ang);
              ctx.strokeText(v, 0, 0);
              ctx.fillText(v, 0, 0);
              ctx.restore();
            }
          }
        }
        k = e;
      }
    }
    if (on) { // les points de l'itinéraire : l'entrée, la sortie et les changements de voie toujours, les autres quand ils sont assez loin
      const key = i => i === 0 || i === q.length - 1 || (known && (a.via[i - 1] !== a.via[i] || a.layer[i - 1] !== a.layer[i]));
      let lastX = -1e9,
        lastY = -1e9;
      ctx.textAlign = 'left';
      for (let i = 0; i < q.length; i++) {
        const far = Math.hypot(q[i].x - lastX, q[i].y - lastY) >= 70;
        if (!key(i) && !far) continue;
        const id = a.ids[i],
          tw = id ? ctx.measureText(id).width : 0,
          ok = !id || free(q[i].x + 6, q[i].y - 14, tw, 12);
        if (!key(i) && !ok) continue;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(q[i].x, q[i].y, 3.6, 0, Math.PI * 2);
        ctx.fillStyle = bg;
        ctx.fill();
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.stroke();
        lastX = q[i].x;
        lastY = q[i].y;
        if (id && ok) {
          taken.push({
            x: q[i].x + 6,
            y: q[i].y - 14,
            w: tw,
            h: 12
          });
          ctx.strokeStyle = bg;
          ctx.lineWidth = 3;
          ctx.fillStyle = fg;
          ctx.strokeText(id, q[i].x + 6, q[i].y - 8);
          ctx.fillText(id, q[i].x + 6, q[i].y - 8);
        }
      }
    }
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
/** Le survol de la carte en (x, y) : un tracé proposé dessous est surligné (comme sa ligne dans la liste) ; la carte seule le lâche en le quittant. */
export function altsHover(x, y) {
  if (!S.altHits?.length) return;
  const i = altAt(x, y),
    h = i >= 0 ? i : null;
  if (S.altHoverMap === h) return;
  S.altHoverMap = h;
  S.altHover = h;
  schedule();
}
/** Les lignes de la légende des itinéraires, d'après ce que le moteur dit des tronçons de ceux qui sont dessinés : [[symbole (svg), texte]]. */
export function altsLegendRows() {
  const A = current();
  if (!A) return [];
  const seen = new Set(),
    thin = A.list.some(a => natureKnown(a) && a.control.some(c => c === 'incomplete' || c === 'fallback'));
  for (const a of A.list)
    for (let k = 0; k < a.points.length - 1; k++) seen.add(natureKnown(a) || a.faulty.has(k) ? natureOf(a, k) : 'plain');
  const dark = !!S.theme?.dark,
    P = MapsRender.palette(dark),
    sw = (c, dash = '', wd = 3) => `<svg class="mp-al-sw" width="30" height="8" viewBox="0 0 30 8" aria-hidden="true"><line x1="2" x2="28" y1="4" y2="4" stroke="${c}" stroke-width="${wd}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/></svg>`,
    rows = [];
  if (seen.has('awy')) rows.push([sw(P.route), esc(tt(TX.altLgAwy))]);
  if (seen.has('dct')) rows.push([sw(P.route, '9 6'), esc(tt(TX.altLgDct))]);
  if (seen.has('fra')) rows.push([sw(P.route, '0.1 6'), esc(tt(TX.altLgFra))]);
  if (seen.has('sid')) rows.push([sw(colOf('sid')), esc(tt(TX.altLgSid))]);
  if (seen.has('star')) rows.push([sw(colOf('star')), esc(tt(TX.altLgStar))]);
  if (seen.has('app')) rows.push([sw(colOf('app')), esc(tt(TX.altLgApp))]);
  if (seen.has('error')) rows.push([sw(RED), esc(tt(TX.altLgFault))]);
  if (thin) rows.push([sw(P.route, '', 1.8), esc(tt(TX.altLgThin))]);
  return rows;
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
    said = on && A.list.some(a => a.control.some(Boolean)), // le moteur dit ses tronçons : la clef du dessin
    legend = on ? altsLegendRows() : [],
    html = on ? `<b class="mp-al-t">${esc(tt(A.mode === 'check' ? TX.altCheck : TX.altTitle))}</b>${said && !A.list.some(natureKnown) ? `<span class="mp-al-key f-muted">${esc(tt(TX.altKey))}</span>` : ''}${legend.length ? `<details class="mp-al-leg"><summary>${esc(tt(TX.altLegend))}</summary><ul>${legend.map(r => `<li>${r[0]}<span>${r[1]}</span></li>`).join('')}</ul></details>` : ''}${A.list.map(a => `<button type="button" class="mp-al-row" data-alt="${a.index}" data-chosen="${a.index === A.chosen ? 1 : 0}" data-faulty="${a.faulty.size ? 1 : 0}"${A.mode === 'compute' ? '' : ' disabled'}><span class="mp-al-n">${esc(a.name || `#${a.index + 1}`)}</span>${a.index === A.chosen ? `<span class="mp-al-k">${esc(tt(TX.altChosen))}</span>` : ''}${a.faulty.size ? `<span class="mp-al-f">${esc(tt(TX.altFaulty))}</span>` : ''}</button>`).join('')}` : '';
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
