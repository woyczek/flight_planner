// V3 maps — la couche « sol » : voies de circulation, postes de stationnement et points d'attente du départ et de l'arrivée
// (V3_SPECIFICATION § 10.40, SOG-0046 ; modules/maps/SPEC.md § 5.2). Les données viennent d'AeroDB (ctx.aerodb.ground(icao) : un petit
// fichier par terrain, OpenStreetMap, ODbL) ; sans cette fonction, ni couche ni bouton. Règle de coût (D68, < 16 ms par image) :
// seulement avec un terrain du vol (départ, arrivée) et à partir du zoom 14 ; traits à z ≥ 14, noms des voies à z ≥ 15, postes et
// points d'attente (points + noms) à z ≥ 16 ; jamais d'aprons remplis ; pendant un geste, les traits seuls. Le panneau est une liste
// de la feuille (copiée de choose.js) : un champ de filtre (sous-chaîne sans casse ni accent), des puces par nature, une ligne par
// élément ; le survol ou le focus d'une ligne la surligne sur la carte (setGroundHl), un toucher la cadre ; de la carte vers la liste,
// un toucher à moins de 6 px d'un trait ou d'un point (groundAt). Le fichier est une entrée non fiable (§ 10.36) : nombres bornés, noms
// tronqués et échappés, effectifs plafonnés.

import {
  S,
  tt,
  esc,
  setData,
  onMission
} from './state.js';
import {
  TX
} from './texts.js';
import {
  openData,
  endData
} from './sheet_view.js';
import {
  schedule
} from './draw.js';

export const Z_LINE = 14,
  Z_NAME = 15,
  Z_PARK = 16,
  HIT_PX = 6,
  ROWS_MAX = 40,
  ATTRIBUTION = '© OpenStreetMap contributors, ODbL';
// zoom de la Carte (MapLibre, celui des autres seuils : COVER_ZOOM, runwayZoom) ; la tolérance absorbe l'arrondi de la vue (14 posé → 13,9999)
const at = (z, min) => z >= min - .02;
const KINDS = ['twy', 'park', 'hold'],
  CAPS = {
    items: 4000,
    points: 600
  };

const G = () => S.ground ||= {
  cache: new Map(), // ICAO → { status: 'loading' | 'ok' | 'none', items, source, attribution }
  hl: null, // id surligné
  q: '', // filtre du panneau
  kinds: {
    twy: true,
    park: true,
    hold: true
  },
  icao: '', // terrain du panneau
  drawn: new Map(), // id → vrai si son nom a trouvé une place au dernier dessin
  hits: [] // { id, x, y | segs } en coordonnées de la vue
};
/** Le groupe d'un élément : sa nature et son nom (OpenStreetMap découpe une voie en plusieurs tronçons : une ligne de la liste, tous les tronçons surlignés). */
export const grpOf = it => `g:${it.kind}:${it.name}`;
const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const finite = (v, lo, hi) => Number.isFinite(+v) && +v >= lo && +v <= hi;
const ll = p => Array.isArray(p) && finite(p[0], -180, 180) && finite(p[1], -90, 90) ? [+p[0], +p[1]] : null;

/** Le fichier d'un terrain, nettoyé : { items: [{ id, kind, name, line | point, box }], source, attribution } ; null si rien d'utilisable. */
export function sanitize(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) return null;
  const items = [],
    seen = new Set();
  for (const it of raw.items.slice(0, CAPS.items)) {
    if (!it || typeof it !== 'object' || !KINDS.includes(it.kind)) continue;
    const id = String(it.id ?? '').slice(0, 40),
      name = String(it.name ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24);
    if (!id || seen.has(id)) continue;
    let o;
    if (Array.isArray(it.line)) {
      const line = it.line.slice(0, CAPS.points).map(ll).filter(Boolean);
      if (line.length < 2) continue;
      o = {
        line
      };
    } else {
      const p = ll(it.point);
      if (!p) continue;
      o = {
        point: p
      };
    }
    seen.add(id);
    const pts = o.line || [o.point];
    items.push({
      id,
      kind: it.kind,
      name,
      ...o,
      box: [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p =>
        p[1]))]
    });
  }
  return items.length ? {
    items,
    source: String(raw.source ?? '').slice(0, 20),
    attribution: String(raw.attribution ?? '').slice(0, 80)
  } : null;
}

/** Les terrains du vol qui peuvent porter la couche : départ et arrivée (majuscules, quatre lettres), dans cet ordre. */
export function groundIcaos() {
  if (onMission() || !S.ctx?.aerodb || typeof S.ctx.aerodb.ground !== 'function') return [];
  const r = S.route?.flight?.route,
    pts = S.route?.points || [],
    ids = [r?.dep || pts[0]?.id, r?.arr || pts.at(-1)?.id].map(x => String(x || '').toUpperCase()).filter(x => /^[A-Z0-9]{4}$/.test(x));
  return [...new Set(ids)];
}

/** Lit (une fois par terrain) le fichier du sol ; le dessin est redemandé à son arrivée. */
function load(icao) {
  const g = G();
  if (g.cache.has(icao)) return;
  g.cache.set(icao, {
    status: 'loading'
  });
  const ctx = S.ctx;
  Promise.resolve().then(() => ctx.aerodb.ground(icao)).catch(() => null).then(raw => {
    if (S?.ctx !== ctx) return;
    const ok = sanitize(raw);
    g.cache.set(icao, ok ? {
      status: 'ok',
      ...ok
    } : {
      status: 'none'
    });
    if (g.icao === icao && S.dpanel === 'ground') render();
    schedule();
  });
}
const recOf = icao => G().cache.get(icao);

// ---------------------------------------------------------------- dessin
const stroke = (c, pts, w, col) => {
  c.lineWidth = w;
  c.strokeStyle = col;
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
  c.stroke();
};
const inside = (pts, W, H) => pts.some(p => p.x > -40 && p.x < W + 40 && p.y > -40 && p.y < H + 40);
/** La couche de ce dessin : { paint(c, pl), shown } ou null (pas de terrain du vol, zoom trop petit, rien de lu). toC : (lat, lon) → { x, y }
 *  de la vue ; rwys : les vecteurs de seuil déjà tracés (le surlignement d'une piste n'est pas un nouveau dessin). */
export function groundLayout(toC, zReal, W, H, rwys = []) {
  if (!groundIcaos().length) { // pas de terrain du vol, ou AeroDB ne sait pas donner le sol : ni couche ni état
    if (S.ground) { // (les touchers et les marques ne gardent pas l'image d'avant : la liste se remplace à la fin de chaque dessin)
      S.ground.hits = [];
      S.ground.drawn = new Map();
    }
    return null;
  }
  const g = G();
  if (!at(zReal, Z_LINE)) {
    g.drawn = new Map();
    g.hits = [];
    return null;
  }
  const items = [];
  for (const icao of groundIcaos()) {
    const rec = recOf(icao);
    if (!rec) load(icao);
    else if (rec.items) items.push(...rec.items.map(it => ({
      ...it,
      icao
    })));
  }
  g.rwys = rwys;
  if (!items.length && !(g.hl || '').startsWith('rwy:')) return null;
  const dark = !!S.theme?.dark,
    col = dark ? 'rgba(225,225,225,.85)' : 'rgba(60,60,60,.85)',
    halo = dark ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.7)',
    shown = [];
  for (const it of items) {
    if (!g.kinds[it.kind] && g.hl !== grpOf(it)) continue;
    if (it.kind === 'twy') {
      const pts = it.line.map(p => toC(p[1], p[0]));
      if (inside(pts, W, H)) shown.push({
        it,
        pts
      });
    } else if (at(zReal, Z_PARK)) {
      const p = toC(it.point[1], it.point[0]);
      if (p.x > -10 && p.x < W + 10 && p.y > -10 && p.y < H + 10) shown.push({
        it,
        pts: [p]
      });
    }
  }
  const hl = g.hl;
  return {
    shown,
    paint(c, pl) {
      c.save();
      c.lineCap = 'round';
      c.lineJoin = 'round';
      for (const s of shown)
        if (s.it.kind === 'twy' && grpOf(s.it) !== hl) stroke(c, s.pts, 2, col);
      for (const s of shown)
        if (s.it.kind !== 'twy') {
          const p = s.pts[0];
          c.fillStyle = s.it.kind === 'hold' ? '#d6173f' : S.theme.accent;
          c.globalAlpha = grpOf(s.it) === hl ? 1 : .85;
          c.fillRect(p.x - 2, p.y - 2, 4, 4);
          c.globalAlpha = 1;
        }
      // les noms : une demande par élément (rang « ground » de la passe de collision), trois places le long d'une voie
      c.font = '10.5px system-ui, sans-serif';
      c.textBaseline = 'middle';
      const drawn = new Map();
      if (pl && at(zReal, Z_NAME))
        for (const s of shown) {
          const it = s.it;
          if (!it.name || (it.kind !== 'twy' && !at(zReal, Z_PARK))) continue;
          const w = c.measureText(it.name).width + 4,
            spots = it.kind === 'twy' ? [.5, .25, .75].map(f => {
              const i = Math.min(s.pts.length - 1, Math.floor((s.pts.length - 1) * f));
              return s.pts[i];
            }) : [{
              x: s.pts[0].x + 4 + w / 2,
              y: s.pts[0].y
            }],
            boxes = spots.map(p => ({
              x0: p.x - w / 2,
              y0: p.y - 7,
              x1: p.x + w / 2,
              y1: p.y + 7
            })),
            got = MapsRender.kit.ask(pl, {
              layer: 'points',
              rank: 'ground',
              key: `gnd:${it.id}`,
              anchor: spots[0],
              boxes
            });
          drawn.set(it.id, !!got);
          if (got) {
            c.lineWidth = 3;
            c.strokeStyle = halo;
            c.strokeText(it.name, (got.x0 + got.x1) / 2 - w / 2 + 2, (got.y0 + got.y1) / 2);
            c.fillStyle = dark ? '#eee' : '#222';
            c.fillText(it.name, (got.x0 + got.x1) / 2 - w / 2 + 2, (got.y0 + got.y1) / 2);
          }
        }
      // l'élément surligné, par-dessus tout : plus épais, teinte d'accent
      for (const h of shown.filter(s => grpOf(s.it) === hl)) {
        if (h.it.kind === 'twy') {
          stroke(c, h.pts, 6, halo);
          stroke(c, h.pts, 3.5, S.theme.accent);
        } else {
          c.beginPath();
          c.arc(h.pts[0].x, h.pts[0].y, 7, 0, Math.PI * 2);
          c.lineWidth = 3;
          c.strokeStyle = S.theme.accent;
          c.stroke();
        }
      }
      const rw = hl?.startsWith('rwy:') ? (g.rwys || []).find(w => `rwy:${w.name}` === hl) : null;
      if (rw) {
        stroke(c, [rw.a, rw.b], 6, halo);
        stroke(c, [rw.a, rw.b], 3.5, S.theme.accent);
      }
      // l'attribution (ODbL), tant que la couche est dessinée
      if (shown.length) {
        c.font = '10px system-ui, sans-serif';
        c.textAlign = 'left';
        c.textBaseline = 'alphabetic';
        const t = ATTRIBUTION,
          w = c.measureText(t).width;
        c.fillStyle = halo;
        c.fillRect(4, H - 34, w + 8, 14); // au-dessus de l'attribution du fond de carte (même coin)
        c.fillStyle = dark ? '#ddd' : '#333';
        c.fillText(t, 8, H - 23);
      }
      c.restore();
      g.drawn = drawn;
      g.hits = shown.map(s => s.it.kind === 'twy' ? {
        id: s.it.id,
        grp: grpOf(s.it),
        pts: s.pts
      } : {
        id: s.it.id,
        grp: grpOf(s.it),
        x: s.pts[0].x,
        y: s.pts[0].y
      });
      if (S.dpanel === 'ground') marks();
    }
  };
}
/** Le dessin léger d'un geste : les traits seuls (D68), sans noms ni postes. project : ll → { x, y } du canvas. */
export function groundLight(g2, project, zoom, dpr = 1) {
  if (!at(zoom, Z_LINE)) return;
  const g = G(),
    dark = !!S.theme?.dark;
  g2.save();
  g2.setTransform(dpr, 0, 0, dpr, 0, 0);
  g2.lineCap = 'round';
  g2.lineJoin = 'round';
  for (const icao of groundIcaos()) {
    const rec = recOf(icao);
    if (!rec?.items) continue;
    for (const it of rec.items)
      if (it.kind === 'twy' && g.kinds.twy) stroke(g2, it.line.map(p => project({
        lng: p[0],
        lat: p[1]
      })), 2, dark ? 'rgba(225,225,225,.85)' : 'rgba(60,60,60,.85)');
  }
  g2.restore();
}

// ---------------------------------------------------------------- de la carte vers la liste
const distSeg = (x, y, a, b) => {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    l2 = dx * dx + dy * dy,
    t = l2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2)) : 0;
  return Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy));
};
/** L'élément du sol sous (x, y) (vue) à moins de HIT_PX, ou null ; le plus proche. */
export function groundAt(x, y) {
  let best = null,
    d = HIT_PX;
  for (const h of G().hits || []) {
    const e = h.pts ? Math.min(...h.pts.slice(1).map((p, i) => distSeg(x, y, h.pts[i], p))) : Math.hypot(x - h.x, y - h.y);
    if (e < d) {
      d = e;
      best = h.grp;
    }
  }
  return best;
}
/** Un toucher sur la carte : l'élément du sol touché ouvre sa ligne dans le panneau (vrai), sinon rien (faux). */
export function groundTap(x, y) {
  const id = groundAt(x, y);
  if (!id || !G().icao) return false;
  openFor(G().icao);
  setGroundHl(id, true);
  return true;
}

// ---------------------------------------------------------------- le panneau
const kindText = k => tt(TX.gKinds[k]);
const rowsOf = icao => {
  const g = G(),
    rec = recOf(icao),
    q = fold(g.q),
    rows = [];
  for (const w of g.rwys || []) rows.push({
    id: `rwy:${w.name}`,
    kind: 'rwy',
    name: String(w.name)
  });
  // les pistes d'abord, puis les voies, les postes, les attentes ; dans chaque nature, par nom (« A1 » avant « A10 »)
  const nat = (a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) || a.name.localeCompare(b.name, 'en', {
    numeric: true
  });
  const groups = new Map();
  for (const it of (rec?.items || []).filter(it => g.kinds[it.kind] && it.name && (!q || fold(it.name).includes(q)))) {
    const k = grpOf(it);
    if (!groups.has(k)) groups.set(k, {
      id: k,
      kind: it.kind,
      name: it.name,
      ids: []
    });
    groups.get(k).ids.push(it.id);
  }
  rows.push(...[...groups.values()].sort(nat));
  return rows.filter(r => r.kind === 'rwy' ? !q || fold(r.name).includes(q) : true);
};
/** Vrai si le nom de la ligne a été demandé au dernier dessin et qu'aucun de ses tronçons n'a trouvé de place. */
const notDrawn = r => {
  const d = (r.ids || [r.id]).filter(i => G().drawn.has(i));
  return d.length > 0 && d.every(i => G().drawn.get(i) === false);
};
const rowHtml = r => `<button type="button" class="mp-gd-row" data-id="${esc(r.id)}" data-kind="${r.kind}" data-hl="${G().hl === r.id ? 1 : 0}" data-drawn="${notDrawn(r) ? 0 : 1}"><span class="mp-gd-k">${esc(r.kind === 'rwy' ? tt(TX.gRunway) : kindText(r.kind))}</span><b>${esc(r.name)}</b><span class="mp-gd-no">${esc(tt(TX.gNotDrawn))}</span></button>`;
const listHtml = icao => {
  const rec = recOf(icao);
  if (!rec || rec.status === 'loading') return `<p class="mp-gd-msg">${esc(tt(TX.gLoading))}</p>`;
  if (rec.status === 'none') return `<p class="mp-gd-msg">${esc(tt(TX.gNone))}</p>`;
  const rows = rowsOf(icao);
  if (!rows.length) return `<p class="mp-gd-msg">${esc(tt(TX.gNoMatch))}</p>`;
  return rows.slice(0, ROWS_MAX).map(rowHtml).join('') + (rows.length > ROWS_MAX ? `<p class="mp-gd-msg">${esc(tt(TX.gMore, {
    n: rows.length - ROWS_MAX
  }))}</p>` : '');
};
const shell = icao => `<div class="mp-gd" data-icao="${esc(icao)}"><input type="search" class="mp-gd-q" placeholder="${esc(tt(TX.gFilter))}" aria-label="${esc(tt(TX.gFilter))}" autocomplete="off" spellcheck="false"><div class="mp-gd-chips" role="group">${KINDS.map(k => `<button type="button" class="mp-gd-chip" data-kind="${k}" aria-pressed="${G().kinds[k]}">${esc(kindText(k))}</button>`).join('')}</div><div class="mp-gd-list" role="list">${listHtml(icao)}</div><button type="button" class="f-btn primary mp-gd-done" data-gdone>${esc(tt(TX.gDone))}</button></div>`;

function render() {
  const g = G(),
    list = S.dbodyEl?.querySelector('.mp-gd-list');
  if (list && S.dpanel === 'ground') {
    const h = listHtml(g.icao);
    if (list.innerHTML !== h) list.innerHTML = h;
  }
}
/** Met à jour la marque « non dessiné » des lignes ouvertes (sans refaire la liste). */
function marks() {
  const g = G();
  const rows = new Map(rowsOf(g.icao).map(r => [r.id, r]));
  for (const b of S.dbodyEl?.querySelectorAll('.mp-gd-row') || []) {
    const r = rows.get(b.dataset.id);
    setData(b, 'drawn', r && notDrawn(r) ? '0' : '1');
  }
}
/** Ouvre le panneau du sol d'un terrain (départ ou arrivée du vol). */
export function openFor(icao) {
  const g = G();
  g.icao = icao;
  if (!recOf(icao)) load(icao);
  const title = tt(TX.gTitle, {
    icao
  });
  openData('ground', `ground:${icao}`, title, () => shell(icao), title);
  const q = S.dbodyEl.querySelector('.mp-gd-q');
  if (q && q.value !== g.q) q.value = g.q;
  schedule();
}
/** Surligne l'élément id (ligne, point ou trait) ou plus rien ; fromMap : sa ligne vient sous les yeux. */
export function setGroundHl(id, fromMap = false) {
  const g = G();
  id = id || null;
  if (g.hl === id) return;
  g.hl = id;
  for (const b of S.dbodyEl?.querySelectorAll('.mp-gd-row') || []) setData(b, 'hl', b.dataset.id === id ? '1' : '0');
  if (id && fromMap) S.dbodyEl?.querySelector(`.mp-gd-row[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({
    block: 'nearest'
  });
  schedule();
}
/** « Voir » : cadre l'élément (la boîte d'un trait, le point au zoom 17). */
function see(id) {
  const its = [...G().cache.values()].flatMap(r => r.items || []).filter(x => grpOf(x) === id),
    it = its[0];
  if (!it || !S.map) return;
  const box = its.reduce((b, x) => [Math.min(b[0], x.box[0]), Math.min(b[1], x.box[1]), Math.max(b[2], x.box[2]), Math.max(b[3], x.box[3])],
    its[0].box);
  if (it.line) S.map.fitBounds([
    [box[0], box[1]],
    [box[2], box[3]]
  ], {
    padding: 60,
    maxZoom: 17,
    animate: false
  });
  else S.map.easeTo({
    center: it.point,
    zoom: 17,
    animate: false
  });
}
/** Gestes du panneau (délégués : la liste est refaite) et du bouton de la carte du terrain ; rend la fonction d'arrêt. */
export function groundEvents() {
  const el = S.dbodyEl,
    host = S.mapEl || el,
    on = () => S?.dpanel === 'ground',
    clickAny = e => {
      const b = e.target.closest?.('[data-ground]');
      if (b) openFor(b.dataset.ground);
    },
    click = e => {
      if (!on()) return;
      if (e.target.closest('[data-gdone]')) return endData('ground');
      const chip = e.target.closest('.mp-gd-chip');
      if (chip) {
        const k = chip.dataset.kind;
        G().kinds[k] = !G().kinds[k];
        chip.setAttribute('aria-pressed', String(G().kinds[k]));
        render();
        return schedule();
      }
      const row = e.target.closest('.mp-gd-row');
      if (row) {
        setGroundHl(row.dataset.id);
        see(row.dataset.id);
      }
    },
    input = e => {
      if (!on() || !e.target.matches?.('.mp-gd-q')) return;
      G().q = e.target.value;
      render();
    },
    over = e => {
      if (on()) setGroundHl(e.target.closest?.('.mp-gd-row')?.dataset.id ?? null);
    },
    out = e => {
      if (on() && !e.relatedTarget?.closest?.('.mp-gd-row')) setGroundHl(null);
    },
    ev = [
      ['click', click],
      ['input', input],
      ['pointerover', over],
      ['focusin', over],
      ['pointerout', out],
      ['focusout', out]
    ];
  for (const [k, f] of ev) el.addEventListener(k, f);
  document.addEventListener('click', clickAny);
  return () => {
    for (const [k, f] of ev) el.removeEventListener(k, f);
    document.removeEventListener('click', clickAny);
    void host;
  };
}
