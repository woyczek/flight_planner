// V3 maps — les tours de piste VFR de l'extracteur de l'utilisateur (SOG-0253 ; AeroDB 34c24550e, format VfrCircuits : tools/report-vfr/FORMAT-DONNEES.md) :
// le lanceur lit le XML déposé (verbe `vfr/circuits`, lecture seule) et la Carte les dessine EN VUE VFR : trait plein noir pour la voilure fixe, pointillé vert pour la tournante, une
// flèche dans l'ordre du vol sur chaque branche, l'altitude sur le trait quand elle est donnée. TROIS états, la règle de l'utilisateur (13 nov.) : (1) la carte VAC du terrain n'est pas
// lue : RIEN ; (2) lue, aucun tracé extrait : « Tour de piste : main gauche (rien de publié sur la carte) » ; (3) un tracé extrait : le tracé (et sa main, déduite de l'ordre des points).
// Jamais un rectangle inventé sur une piste. Tout ce que dit le lanceur est une entrée non fiable : bornes (200 terrains, 20 tours, 64 points), nombres finis, textes nettoyés.

import {
  S,
  esc,
  tt
} from './state.js';
import {
  TX
} from './texts.js';
import {
  schedule
} from './draw.js';

const ICAO = /^[A-Z0-9]{3,5}$/,
  num = (v, lo, hi) => Number.isFinite(+v) && +v >= lo && +v <= hi,
  clean = (v, n) => typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) : '';
/** La réponse du verbe (`result`), nettoyée : Map OACI → [{ id, aircraft, altitude: { ft, ref } | null, closed, hand, points: [{ lat, lon }] }] ; les terrains dont la carte a changé
 *  (`obsolete`) ne rendent rien ; null sans réponse utilisable. */
export function circuitsSanitize(r) {
  if (!r || typeof r !== 'object' || r.ok === false || !r.aerodromes || typeof r.aerodromes !== 'object') return null;
  const out = new Map();
  for (const [icao, a] of Object.entries(r.aerodromes).slice(0, 200)) {
    if (!ICAO.test(icao) || !a || typeof a !== 'object' || a.state === 'obsolete' || !Array.isArray(a.circuits)) continue;
    const list = [];
    for (const c of a.circuits.slice(0, 20)) {
      const points = (Array.isArray(c?.points) ? c.points : []).slice(0, 64).filter(p => num(p?.lat, -90, 90) && num(p?.lon, -180, 180))
        .map(p => ({
          lat: +p.lat,
          lon: +p.lon
        }));
      if (points.length < 2) continue;
      list.push({
        id: clean(c.id, 24),
        aircraft: ['fixed', 'rotary', 'both'].includes(c.aircraft) ? c.aircraft : 'unknown',
        altitude: c.altitude && num(c.altitude.ft, 0, 60000) ? {
          ft: Math.round(+c.altitude.ft),
          ref: ['AAL', 'AMSL'].includes(c.altitude.ref) ? c.altitude.ref : ''
        } : null,
        closed: c.closed !== false,
        hand: c.hand === 'left' || c.hand === 'right' ? c.hand : '',
        points
      });
    }
    if (list.length) out.set(icao, list);
  }
  return out;
}
/** Lit les tours une fois par montage (le lanceur seul : sans lui, ou sans fichier déposé, rien ; la Carte ne dessine jamais un tour par défaut). */
export function loadCircuits() {
  if (S.circuitsState) return;
  S.circuitsState = 'loading';
  const me = S,
    L = S.ctx?.launcher;
  if (!L?.job) return void(S.circuitsState = 'none');
  Promise.resolve().then(() => L.job('regen/job', {
    set: 'vfr',
    verb: 'circuits',
    args: {}
  }, {
    onProgress: () => {},
    signal: new AbortController().signal
  })).then(fin => {
    if (S !== me) return;
    S.circuits = fin?.state === 'done' ? circuitsSanitize(fin.result) : null;
    S.circuitsState = 'done';
    schedule();
    if (S.vfrPin) import('./vfr.js').then(m => S === me && m
      .refreshAdCard()); // le contenu du terrain épinglé dit le tour de piste dès qu'il est lu
  }, () => {
    if (S === me) S.circuitsState = 'none';
  });
}
/** Les tours extraits d'un terrain ([] sans). */
export const circuitsOf = icao => S.circuits?.get(icao) || [];
/** Les tours d'un terrain, dessinés (vue VFR : le terrain est de ceux que la couche VFR montre). */
export function drawCircuits(ctx, toC, icao) {
  loadCircuits();
  const list = circuitsOf(icao);
  if (!list.length) return;
  const dark = !!S.theme?.dark;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const c of list) {
    const rotary = c.aircraft === 'rotary',
      col = rotary ? dark ? '#81c784' : '#2e7d32' : dark ? '#f2f2f2' : '#111111',
      q = c.points.map(p => toC(p.lat, p.lon)),
      pts = c.closed ? [...q, q[0]] : q;
    ctx.strokeStyle = S.theme.bg; // le liseré du fond
    ctx.lineWidth = 5;
    ctx.setLineDash([]);
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.4;
    ctx.setLineDash(rotary ? [7, 5] : []);
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.stroke();
    ctx.setLineDash([]);
    // une flèche dans l'ordre du vol au milieu de chaque branche assez longue
    ctx.fillStyle = col;
    let longest = null;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1],
        b = pts[i],
        len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len > 24) {
        const ang = Math.atan2(b.y - a.y, b.x - a.x),
          mx = (a.x + b.x) / 2,
          my = (a.y + b.y) / 2;
        ctx.beginPath();
        ctx.moveTo(mx + 6 * Math.cos(ang), my + 6 * Math.sin(ang));
        ctx.lineTo(mx - 5 * Math.cos(ang) + 5 * Math.sin(ang), my - 5 * Math.sin(ang) - 5 * Math.cos(ang));
        ctx.lineTo(mx - 5 * Math.cos(ang) - 5 * Math.sin(ang), my - 5 * Math.sin(ang) + 5 * Math.cos(ang));
        ctx.closePath();
        ctx.fill();
        if (!longest || len > longest.len) longest = {
          len,
          mx,
          my
        };
      }
    }
    if (c.altitude && longest) { // l'altitude du tour sur le trait (la branche la plus longue), jamais inventée
      ctx.font = '700 11px Arial,sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const t = `${c.altitude.ft}${c.altitude.ref ? ` ${c.altitude.ref}` : ''}`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = S.theme.bg;
      ctx.strokeText(t, longest.mx, longest.my - 11);
      ctx.fillText(t, longest.mx, longest.my - 11);
      ctx.textAlign = 'left';
    }
  }
  ctx.restore();
}
/** La ligne du tour de piste dans le contenu du terrain, selon les trois états : la carte VAC du terrain (`vac`) n'est pas lue : rien ; lue sans tracé : main gauche, rien de publié ;
 *  un tracé extrait : sa main et son altitude. */
export function circuitLine(icao, vac) {
  if (!vac) return '';
  const list = circuitsOf(icao);
  if (!list.length) return `<p class="mp-vfr-circ" data-circuit="default">${esc(tt(TX.circuitDefault))}</p>`;
  return list.map(c => `<p class="mp-vfr-circ" data-circuit="extracted">${esc(tt(TX.circuitHand, {
    h: c.hand === 'right' ? tt(TX.circuitRight) : tt(TX.circuitLeft)
  }))}${c.altitude ? ` · ${esc(tt(TX.circuitAlt, { a: `${c.altitude.ft}${c.altitude.ref ? ` ${c.altitude.ref}` : ''}` }))}` : ''}${c.aircraft === 'rotary' ? ` · ${esc(tt(TX.circuitRotary))}` : ''}</p>`).join('');
}
