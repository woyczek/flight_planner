// V3 maps — la couche « terrains de dégagement proposés » (SOG-0398, lot 2 ; contrat : modules/fuel/INTEGRATION.md) : Carburant propose des terrains
// de dégagement pour l'arrivée du vol et les publie sur CET appareil (le document cache/fuel/altn_candidates.json, jamais data/, et l'événement de
// fenêtre fuel-altn-candidates, le détail étant le document) ; la Carte les met en avant — sept au plus, verts ou orange selon leur état, jamais rouges
// ni gris — et, au toucher, en dit la fiche avec « Proposer à Carburant » : elle rend le terrain à Carburant (l'événement maps-altn-pick en vue
// double, #fuel?altn=<ICAO> sur une Carte seule) et c'est Carburant qui le PROPOSE : rien n'est pris d'office, la Carte n'écrit rien. Le document
// est une entrée non fiable : tout est borné, un texte reste un texte.

import {
  S,
  esc,
  tt,
  onMission
} from './state.js';
import {
  text,
  inRange
} from './lib/safe_text.js';
import {
  own,
  plain
} from '../../frame/lib/untrusted.js';
import {
  TX
} from './texts.js';
import {
  schedule
} from './draw.js';
import {
  refit
} from './data.js';
import {
  fillLayers
} from './layers.js';
import {
  showTip,
  hideTips
} from './tips.js';
const DOC = 'cache/fuel/altn_candidates.json',
  MAX = 7,
  HIT_PX = 20,
  WHY = ['rwy-unread', 'aids-unread', 'aids-visual', 'wx-ifr',
    'wx-unread', 'wx-notaf', 'wx-notime', 'wx-outside', 'wx-nocat'
  ], // la liste fermée de Carburant (TX.altnPropWhy), dans son ordre (SOG-0494 : piste et moyens non vérifiés ; SOG-0544 : le mot de la météo inconnue)
  // SOG-0544 : les mots d'une météo INCONNUE — le terrain est « à vérifier », jamais « adapté », quoi que dise le document ; l'heure d'une phrase : HH:MMZ, rien d'autre
  WX_UNKNOWN = ['wx-unread', 'wx-notaf', 'wx-notime', 'wx-outside', 'wx-nocat'],
  HHMM = /^\d{2}:\d{2}Z$/;
/** SOG-0544 : une heure de wxv, clé PROPRE et motif strict (une entrée non fiable : jamais un texte montré tel quel), ou null. */
const hourOf = (o, k) => {
  const v = own(o, k);
  return typeof v === 'string' && HHMM.test(v) ? v : null;
};
// un NOMBRE JSON dans ses bornes (jamais une conversion : null, '' et true feraient 0 ou 1, un terrain sans position serait dessiné au large du Gabon, Sécurisation) et un texte sans
// signes de contrôle, sans < > ni marques de format, borné : les gardes du socle (lib/safe_text.js, bâti sur frame/lib/untrusted.js)
const num = inRange,
  clean = text;
/** Les couleurs de la couche : vert et orange, de jour et de nuit (ni le rouge de la route proposée ni le gris du dégagement du vol). */
export const ALTN_TINT = {
  day: {
    ok: '#2e7d32',
    warn: '#e65100'
  },
  night: {
    ok: '#69d28a',
    warn: '#ffb74d'
  }
};
/** Le document ou l'événement de Carburant, nettoyé : { arr, list: [{ icao, name, lat, lon, nm, state, why, wxv, fuel }] } (sept au plus, dans l'ordre du document : la priorité de
 *  Carburant) ou null. Un terrain mal formé est écarté ; un état autre que ok / warn aussi (le document ne porte ni rouge ni gris). */
export function altnSanitize(raw) {
  if (!raw || typeof raw !== 'object' || raw.schema !== 1 || !Array.isArray(raw.list)) return null;
  const list = [],
    seen = new Set();
  for (const t of raw.list.slice(0, 40)) {
    if (list.length >= MAX) break;
    const icao = typeof t?.icao === 'string' ? t.icao.toUpperCase() : '';
    if (!/^[A-Z0-9]{4}$/.test(icao) || seen.has(icao) || !num(t.lat, -90, 90) || !num(t.lon, -180, 180) || (t.state !== 'ok' && t.state !==
        'warn')) continue;
    seen.add(icao);
    // SOG-0544 : les heures de la phrase (wx-outside : at ; wx-nocat : a et b) ; une heure absente ou hors motif écarte CETTE raison, le terrain reste « à vérifier »
    const codes = Array.isArray(t.why) ? [...new Set(t.why.filter(c => WHY.includes(c)))] : [],
      wv = plain(own(t, 'wxv')),
      at = hourOf(wv, 'at'),
      a = hourOf(wv, 'a'),
      b = hourOf(wv, 'b'),
      why = codes.filter(c => c === 'wx-outside' ? !!at : c === 'wx-nocat' ? !!(a && b) : true),
      wxv = {
        ...(why.includes('wx-outside') ? {
          at
        } : {}),
        ...(why.includes('wx-nocat') ? {
          a,
          b
        } : {})
      };
    const f = t.fuel && typeof t.fuel === 'object' && num(t.fuel.amount, 0, 1e7) && (t.fuel.unit === 'kg' || t.fuel.unit === 'lb') ? {
      amount: Math.round(+t.fuel.amount),
      unit: t.fuel.unit,
      min: num(t.fuel.min, 0, 99999) ? Math.round(+t.fuel.min) : null
    } : null;
    list.push({
      icao,
      name: clean(t.name, 60),
      lat: +t.lat,
      lon: +t.lon,
      nm: num(t.nm, 0, 3000) ? Math.round(+t.nm * 10) / 10 : null,
      state: codes.some(c => WX_UNKNOWN.includes(c)) ? 'warn' : t.state,
      why,
      wxv,
      fuel: f
    });
  }
  return {
    arr: clean(raw.arr, 8).toUpperCase(),
    list
  };
}
/** Une proposition existe pour l'arrivée du vol montré (un autre vol, une autre arrivée : non), hors carte de mission, mode « choisir » et Édition. */
const avail = () => {
  const A = S?.altn,
    r = S?.route?.flight?.route;
  if (!A || !A.list.length || onMission() || S.choose || S.edit?.on) return null;
  return r && String(r.arr || '').toUpperCase() === A.arr ? A : null;
};
/** Les terrains à dessiner : la proposition, si le pilote ne l'a pas masquée (la case « Terrains de dégagement proposés » du panneau des couches : décochée, elle le reste jusqu'à la proposition suivante). */
const current = () => S?.altnOff ? null : avail();
export const altnAvail = () => !!avail();
export const altnOn = () => !!current();
/** La case du panneau des couches : cochée = montrée, décochée = masquée ; le recadrage suit (la vue garde les terrains montrés seulement). */
export function altnSet(on) {
  if (!S) return;
  const off = !on;
  if (!!S.altnOff === off) return;
  S.altnOff = off;
  if (off) S.altnHits = [];
  refit();
  schedule();
}
/** Vue double : Carburant est à côté, il écoute maps-altn-pick ; seule, la Carte renvoie vers lui (comme les itinéraires proposés). */
const dual = () => S?.ctx?.query?.pane === '1' || !!S?.ctx?.query?.with;
/** Le signe de l'état dans l'anneau, comme dans Carburant (la couleur seule ne suffit pas) : ✓ pour un terrain adapté, ! pour une réserve (le document ne porte pas d'état refusé : pas de ✕). Tracé, jamais une police. */
function drawSign(ctx, x, y, state, col) {
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (state === 'ok') {
    ctx.moveTo(x - 4, y + .5);
    ctx.lineTo(x - 1.2, y + 3.4);
    ctx.lineTo(x + 4.2, y - 3.4);
    ctx.stroke();
  } else {
    ctx.moveTo(x, y - 4.6);
    ctx.lineTo(x, y + .8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y + 3.9, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}
/** Les terrains mis en avant, sur la couche des écrans ; rend les cibles touchables : [{ icao, x, y }] en coordonnées de la vue. Un anneau de la couleur de l'état (vert ou orange, son
 *  halo du fond) avec son signe (✓ ou !) et, à côté, l'INDICATIF seul : le nom est dans la fiche (sept noms près de l'arrivée la recouvriraient) ; les terrains que la route du vol nomme
 *  déjà ne sont pas redessinés ; un indicatif ne couvre jamais les étiquettes de la route (avoid) ni un autre indicatif. */
export function drawProposedAltn(ctx, toC, avoid = [], cur = null) {
  const A = current();
  if (!A) return [];
  const T = ALTN_TINT[S.theme?.dark ? 'night' : 'day'],
    bg = S.theme?.bg || '#fff',
    own = new Set((S.route?.points || []).map(p => String(p.id || '').toUpperCase()).filter(Boolean)),
    taken = avoid.map(r => ({
      x: r.x0,
      y: r.y0,
      w: r.x1 - r.x0,
      h: r.y1 - r.y0
    })),
    free = (x, y, w, h) => !taken.some(r => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y),
    hits = [];
  if (
    cur
  ) { // le dégagement ACTUEL du vol (l'anneau gris) : le pilote compare les terrains proposés à lui ; sa place et son code sont réservés, et draw.js le redessine par-dessus
    const q = toC(cur.lat, cur.lon);
    own.add(String(cur.id || '').toUpperCase());
    taken.push({
      x: q.x - 11,
      y: q.y - 11,
      w: 22,
      h: 22
    }, {
      x: q.x + 4,
      y: q.y - 9,
      w: 46,
      h: 18
    });
  }
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.textBaseline = 'middle';
  const shown = A.list.filter(t => !own.has(t.icao)).map(t => ({
    t,
    q: toC(t.lat, t.lon)
  }));
  // d'abord les anneaux (ils tiennent leur place : un indicatif ne couvre ni l'anneau d'un autre terrain ni le sien), puis les indicatifs
  for (const {
      t,
      q
    }
    of shown) {
    const col = T[t.state];
    ctx.beginPath();
    ctx.arc(q.x, q.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = col;
    ctx.stroke();
    drawSign(ctx, q.x, q.y, t.state, col);
    taken.push({
      x: q.x - 11,
      y: q.y - 11,
      w: 22,
      h: 22
    });
    hits.push({
      icao: t.icao,
      x: q.x,
      y: q.y
    });
  }
  // l'indicatif d'un terrain proposé n'est JAMAIS écarté (c'est son nom : un anneau anonyme ne sert à rien au pilote) : huit places près de l'anneau (droite, gauche, dessus, dessous, quatre diagonales) ; quand elles
  // sont prises, de plus en plus loin, avec un trait de rappel vers l'anneau ; et, tout occupé, la place qui en recouvre le moins
  ctx.font = '700 12px sans-serif';
  const overlap = (x, y, w, h) => taken.reduce((a, r) => a + Math.max(0, Math.min(x + w, r.x + r.w) - Math.max(x, r.x)) * Math.max(0, Math
    .min(y + h, r.y + r.h) - Math.max(y, r.y)), 0);
  for (const {
      t,
      q
    }
    of shown) {
    const w = ctx.measureText(t.icao).width,
      col = T[t.state],
      near = [
        [13, -8],
        [-13 - w, -8],
        [-w / 2, -28],
        [-w / 2, 12],
        [13, -26],
        [13, 10],
        [-13 - w, -26],
        [-13 - w, 10]
      ].map(([dx, dy]) => ({
        x: q.x + dx,
        y: q.y + dy,
        far: false
      })),
      far = [];
    for (const r of [36, 54, 76, 100])
      for (let a = 0; a < 360; a += 30) {
        const c = Math.cos(a * Math.PI / 180),
          s = Math.sin(a * Math.PI / 180);
        far.push({
          x: q.x + r * c - w / 2,
          y: q.y + r * s - 8,
          far: true
        });
      }
    const all = [...near, ...far];
    let spot = all.find(c => free(c.x, c.y, w, 16));
    if (!spot) {
      let best = Infinity;
      for (const c of all) {
        const o = overlap(c.x, c.y, w, 16);
        if (o < best) {
          best = o;
          spot = c;
        }
      }
    }
    taken.push({
      x: spot.x,
      y: spot.y,
      w,
      h: 16
    });
    if (spot.far) { // le trait de rappel : du bord de l'anneau au bord le plus proche de l'indicatif
      const cx = Math.max(spot.x, Math.min(q.x, spot.x + w)),
        cy = Math.max(spot.y, Math.min(q.y, spot.y + 16)),
        d = Math.hypot(cx - q.x, cy - q.y) || 1,
        sx = q.x + (cx - q.x) / d * 11,
        sy = q.y + (cy - q.y) / d * 11;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(cx, cy);
      ctx.lineWidth = 3.4;
      ctx.strokeStyle = bg;
      ctx.stroke();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = col;
      ctx.stroke();
    }
    ctx.lineWidth = 3;
    ctx.strokeStyle = bg;
    ctx.textAlign = 'left';
    ctx.fillStyle = col;
    ctx.strokeText(t.icao, spot.x, spot.y + 8);
    ctx.fillText(t.icao, spot.x, spot.y + 8);
  }
  ctx.restore();
  return hits;
}
/** Les positions des terrains proposés quand la couche est dessinée : pour que la vue les garde avec l'arrivée (data.js fitOf) ; vide sinon. */
export const altnPoints = () => current()?.list.map(t => ({
  lat: t.lat,
  lon: t.lon
})) || [];
/** Le terrain mis en avant sous (x, y) (vue) : le plus proche à 20 px, ou null. */
function altnAt(x, y) {
  let best = null,
    d = HIT_PX;
  for (const h of S.altnHits || []) {
    const e = Math.hypot(h.x - x, h.y - y);
    if (e < d) {
      d = e;
      best = h;
    }
  }
  return best && current()?.list.find(t => t.icao === best.icao) || null;
}
/** La fiche d'un terrain : indicatif et nom (un texte), son état, la distance de l'arrivée, les motifs, le carburant de dégagement, puis « Proposer à Carburant ». */
function cardHtml(t) {
  const why = t.why.map(c => tt(TX.altnWhy[c], t.wxv || {})), // SOG-0544 : les phrases de la météo inconnue portent leurs heures
    state = tt(t.state === 'ok' ? TX.altnOk : TX.altnWarn),
    fuel = t.fuel ? tt(TX.altnFuel, {
      a: t.fuel.amount.toLocaleString(S.ctx.lang?.() || 'fr'),
      u: t.fuel.unit,
      m: t.fuel.min != null ? t.fuel.min : '—'
    }) : '';
  return `<div><b>${esc(t.icao)}</b>${t.name ? ` · ${esc(t.name)}` : ''}</div><div class="f-muted">${esc([state, t.nm != null ? tt(TX.altnDist, {
    n: t.nm.toLocaleString(S.ctx.lang?.() || 'fr', { maximumFractionDigits: 1 }) // la distance à la façon de la langue (« 83,2 »), une décimale au plus : Carburant l'a arrondie au dixième
  }) : ''].filter(Boolean).join(' · '))}</div>${why.length ? `<div class="f-muted">${esc(why.join(' ; '))}</div>` : ''}${fuel ? `<div class="f-muted">${esc(fuel)}</div>` : ''}<button type="button" class="f-btn mp-altn-pick" data-altn="${esc(t.icao)}">${esc(tt(TX.altnPick))}</button>`;
}
/** Un appui sur la carte en (x, y) : sur un terrain mis en avant, sa fiche s'ouvre (vrai) ; sinon rien (faux). */
export function altnTap(x, y) {
  const t = altnAt(x, y);
  if (!t) return false;
  hideTips();
  const q = S.toC(t.lat, t.lon);
  showTip(S.cardEl, S.box, q.x, q.y, cardHtml(t));
  return true;
}
/** Rend le terrain à Carburant, qui le PROPOSE : seulement un indicatif de la liste, et rien d'autre ne part. */
export function altnPick(icao) {
  const A = current();
  if (!A || !A.list.some(t => t.icao === icao)) return false;
  if (dual()) window.dispatchEvent(new CustomEvent('maps-altn-pick', {
    detail: {
      icao
    }
  }));
  else location.hash = `#fuel?altn=${icao}`;
  hideTips();
  return true;
}
/** Les lignes de la légende : vert et orange, quand la couche est dessinée : [[symbole (svg), texte]]. */
export function altnLegendRows() {
  const A = current();
  if (!A) return [];
  const T = ALTN_TINT[S.theme?.dark ? 'night' : 'day'],
    mark = (s, c) => s === 'ok' ? `<path d="M11 7.4 L13.8 10.4 L19.2 3.6" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` :
    `<path d="M15 2.4 L15 7.8" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/><circle cx="15" cy="10.9" r="1.4" fill="${c}"/>`,
    sw = (s, c) => `<svg class="mp-al-sw" width="30" height="14" viewBox="0 0 30 14" aria-hidden="true"><circle cx="15" cy="7" r="6" fill="none" stroke="${c}" stroke-width="2.4"/>${mark(s, c)}</svg>`;
  return ['ok', 'warn'].filter(s => A.list.some(t => t.state === s)).map(s => [sw(s, T[s]), esc(tt(s === 'ok' ? TX.altnLgOk : TX
    .altnLgWarn))]);
}
/** Ce que Carburant publie, posé (null : rien ou effacé) et redessiné : une liste vide (un terrain pris, « Proposer » refermé, une autre arrivée) ou un document supprimé efface la couche, sans quitter l'écran.
 *  S.altnAt : la date du dernier document posé ; un document plus ancien que lui (l'événement a déjà dit mieux) n'est pas reposé. */
function put(raw) {
  if (!S) return;
  const had = !!S.altn,
    A = altnSanitize(raw),
    sig = A ? A.list.map(t => t.icao).join(',') : '',
    shown = () => altnPoints().map(p => `${p.lat},${p.lon}`).join(';'),
    before =
    shown(); // ce que la vue garde avant : un document sans effet sur les terrains montrés (aucun, ou une carte de mission) ne recadre rien
  if (!S.altn || sig !== S.altnSig) S.altnOff =
    false; // une proposition suivante (après « Prendre », une autre arrivée, d'autres terrains) : la couche revient
  S.altnSig = sig;
  S.altn = A && A.list.length ? A : null;
  S.altnAt = typeof raw?.updated_at === 'string' ? raw.updated_at : '';
  if (!S.altn) S.altnHits = [];
  if (S.layersEl) fillLayers(); // la case du panneau suit
  if (shown() !== before)
    refit(); // la vue garde l'arrivée et les terrains proposés (ou revient au vol seul quand la proposition est retirée), sauf si l'utilisateur a déplacé la carte
  if (had || S.altn) schedule(); // sans proposition avant ni après (le montage sans document, un document sans terrain) : rien à redessiner
}
/** Écoute (l'événement de la vue double, le document pour une Carte ouverte ensuite ET à chaque réécriture) ; rend l'arrêt. */
export function altnStart() {
  const stops = [],
    readDoc = async () => {
        const d = await S?.ctx.data.get(DOC).catch(() => null);
        if (S && (!d || (S.altnAt || '') <= (typeof d.updated_at === 'string' ? d.updated_at : ''))) put(d);
      },
      evt = e => {
        if (S) put(e.detail); // l'événement dit tout de suite ce que le document dira un instant après
      };
  window.addEventListener('fuel-altn-candidates', evt);
  stops.push(() => window.removeEventListener('fuel-altn-candidates', evt));
  readDoc();
  if (S.ctx.data.watch) stops.push(S.ctx.data.watch('cache/fuel/', paths => {
    if (S && (paths || []).some(p => p === DOC)) readDoc();
  }));
  const onCard = e => {
    const b = e.target.closest?.('[data-altn]');
    if (b) altnPick(b.dataset.altn);
  };
  S.cardEl?.addEventListener('click', onCard);
  stops.push(() => S?.cardEl?.removeEventListener('click', onCard));
  return () => stops.forEach(f => f());
}
