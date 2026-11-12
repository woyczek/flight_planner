// V3 maps — les contrôleurs en ligne IVAO et VATSIM sur la Carte, une teinte par réseau (SOG-0094, voie « Carte » de la feuille de route). Couche « Contrôleurs en ligne »
// (éteinte d'origine) : les flux publics (IVAO whazzup, VATSIM vatsim-data) sont lus par ctx.net, tous les 90 s tant que la couche est allumée (jamais de minuterie couche éteinte) ;
// un contrôleur dont l'indicatif commence par le code OACI d'un terrain (LFPG_TWR, LFPG_N_APP, LFPG_ATIS) est posé à ce terrain, en petites pastilles (D G T A i) de la teinte
// de son réseau ; son survol dit l'indicatif, la fréquence et le réseau. Les centres (CTR, FSS) n'ont pas de position dans les flux : ils ne sont pas dessinés.
// Aucun hôte nouveau : api.ivao.aero et data.vatsim.net sont déjà ouverts au cadre.
import {
  S,
  tt
} from './state.js';
import {
  TX
} from './texts.js';
import {
  schedule
} from './draw.js';
import {
  layersNow
} from './layers.js';

const IVAO = 'https://api.ivao.aero/v2/tracker/whazzup',
  VATSIM = 'https://data.vatsim.net/v3/vatsim-data.json',
  EVERY = 90e3,
  /** Teinte de chaque réseau (deux teintes que l'on distingue de la route violette et des espaces bleus) et lettre de chaque position. */
  TINT = {
    ivao: '#1f6fe0',
    vatsim: '#e07b00'
  },
  LETTER = {
    DEL: 'D',
    GND: 'G',
    TWR: 'T',
    APP: 'A',
    DEP: 'A',
    ATIS: 'i'
  },
  CALL = /^([A-Z]{4})(?:_[A-Z0-9]{1,3})?_(DEL|GND|TWR|APP|DEP|ATIS)$/;
/** Les contrôleurs des deux flux, à plat : [{ net, callsign, icao, kind, freq }] ; ce qui n'a pas la forme d'un indicatif de terrain est écarté. */
export function atcParse(ivao, vatsim) {
  const out = [],
    add = (net, callsign, freq) => {
      const m = CALL.exec(String(callsign || '').toUpperCase());
      if (m) out.push({
        net,
        callsign: String(callsign).toUpperCase(),
        icao: m[1],
        kind: m[2],
        freq: Number.isFinite(+freq) && +freq > 0 ? (+freq).toFixed(3) : ''
      });
    };
  for (const a of ivao?.clients?.atcs || []) add('ivao', a?.callsign, a?.atcSession?.frequency ?? a?.frequency);
  for (const a of vatsim?.controllers || []) add('vatsim', a?.callsign, a?.frequency);
  for (const a of vatsim?.atis || []) add('vatsim', a?.callsign, a?.frequency);
  return out;
}
/** Un flux par ctx.net ; null s'il ne vient pas (hors ligne, relais absent, erreur). */
async function get(url) {
  try {
    const r = await S.ctx.net.fetch(url, {
      headers: {
        accept: 'application/json'
      }
    });
    if (!r.ok || r.headers?.get?.('x-sog-offline') || r.headers?.get?.('x-sog-unreachable')) return null;
    return await r.json();
  } catch {
    return null;
  }
}
/** Lecture des deux flux (en parallèle), gardée dans S.atc ; la Carte se redessine. */
export async function atcRead() {
  const me = S;
  if (!me?.ctx.net?.fetch) return;
  const [a, b] = await Promise.all([get(IVAO), get(VATSIM)]);
  if (S !== me) return;
  S.atc = {
    list: atcParse(a, b),
    at: Date.now(),
    ivao: !!a,
    vatsim: !!b
  };
  schedule();
}
/** Écoute : à chaque tour, si la couche est allumée, les flux sont lus (tout de suite à l'allumage, puis toutes les 90 s) ; rend l'arrêt. */
export function atcStart() {
  let t = 0;
  const tick = () => {
    clearTimeout(t);
    if (S && layersNow().atc && Date.now() - (S.atc?.at || 0) >= EVERY - 1000) atcRead();
    t = setTimeout(tick, 5e3); // vérifier l'allumage de la couche : seulement lire (jamais demander) quand elle est éteinte
  };
  tick();
  return () => clearTimeout(t);
}
/** Les pastilles aux terrains dessinés : [{ x, y, w, h, icao, items }] pour les infobulles. */
export function drawAtc(ctx, toC) {
  const hits = [],
    by = new Map();
  for (const c of S.atc?.list || []) {
    const k = c.icao;
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(c);
  }
  if (!by.size) return hits;
  ctx.save();
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // les terrains dessinés, puis ceux du vol (départ, arrivée, dégagement) qui ne le seraient pas
  const places = new Map();
  for (const h of S.adHits || []) places.set(String(h.a?.icao || '').toUpperCase(), {
    x: h.x,
    y: h.y
  });
  for (const p of [...(S.route?.points || []), ...(S.route?.altn ? [S.route.altn] : [])]) {
    const id = String(p?.id || '').toUpperCase();
    if (/^[A-Z]{4}$/.test(id) && !places.has(id)) places.set(id, toC(+p.lat, +p.lon));
  }
  for (const [icao, h] of places) {
    const list = by.get(icao);
    if (!list) continue;
    // une pastille par position et par réseau, en rangée sous le terrain
    const seen = [];
    for (const c of list) {
      const key = `${c.net}:${LETTER[c.kind]}`;
      if (!seen.some(s => s.key === key)) seen.push({
        key,
        net: c.net,
        letter: LETTER[c.kind],
        items: []
      });
      seen.find(s => s.key === key).items.push(c);
    }
    const w = 13,
      total = seen.length * (w + 2) - 2,
      x0 = h.x - total / 2,
      y0 = h.y + 12;
    seen.forEach((s, i) => {
      const x = x0 + i * (w + 2);
      ctx.fillStyle = TINT[s.net];
      ctx.fillRect(x, y0, w, w);
      ctx.strokeStyle = S.theme?.bg || '#fff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + .75, y0 + .75, w - 1.5, w - 1.5);
      ctx.fillStyle = '#fff';
      ctx.fillText(s.letter, x + w / 2, y0 + w / 2 + .5);
    });
    hits.push({
      x: h.x - total / 2,
      y: y0,
      w: total,
      h: w,
      icao,
      items: list
    });
  }
  ctx.restore();
  return hits;
}
/** Les contrôleurs sous (x, y) : leur infobulle (deux lignes) ou null. */
export function atcAt(x, y) {
  const h = (S.atcHits || []).find(q => x >= q.x - 3 && x <= q.x + q.w + 3 && y >= q.y - 3 && y <= q.y + q.h + 3);
  if (!h) return null;
  const rows = h.items.map(c => `${c.callsign.replace(/^[A-Z]{4}_/, '')}${c.freq ? ` ${c.freq}` : ''} · ${tt(TX.atcNet[c.net])}`);
  return [tt(TX.atcTitle, {
    a: h.icao
  }), rows.slice(0, 6).join(' ; ') + (rows.length > 6 ? ` +${rows.length - 6}` : '')];
}
