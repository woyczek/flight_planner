// V3 maps — la loupe de la Carte (SOG-0491 ; modules/maps/SPEC.md § 4 ter), chargée au premier appui sur le bouton (meta.lazy) : un champ qui propose terrains, hélistations,
// balises, points et villes (aerodb.find, plus aerodb.suggest pour les terrains de toutes les zones publiées : un code, le début d'un nom, un pays), avec la liste commune du cadre
// (frame/lib/suggest_list.js : ↑ ↓ Entrée Échap, toucher) ; un choix CENTRE la carte, y pose un repère, et offre « Fiche du terrain » (un terrain) et « Ajouter à la route » (avec un
// vol, hors carte de mission). Rien n'est écrit sauf par ce dernier bouton (le seul écrivain du vol, edit.js). Les ESPACES (R 12, « Mont-Saint-Michel ») ne se cherchent pas encore :
// il faut un index des noms de zones chez AeroDB.
//   import { setFind, closeFind } from './find.js';

import {
  S,
  esc,
  tt,
  setPressed,
  onMission,
  outLon,
  need
} from './state.js';
import {
  TX
} from './texts.js';
import {
  createSuggestList
} from '../../frame/lib/suggest_list.js';
import {
  schedule
} from './draw.js';
import {
  pinAd
} from './vfr.js';
import {
  svg
} from '../../frame/lib/icons.js';

const MIN = 2,
  SHOWN = 6,
  DEBOUNCE = 150,
  /** Le zoom où la carte s'approche d'un lieu choisi (le zoom courant s'il est plus fort). */
  ZOOM = {
    aerodrome: 11,
    navaid: 9,
    point: 9.5,
    vrp: 11,
    city: 9
  };

/** Une valeur bornée et sans signes de contrôle ni de format (les noms viennent de la base, entrée externe) ; '' sinon. */
const clean = (v, n) => typeof v === 'string' ? v.replace(/[\u0000-\u001f<>\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, n) : '';
/** Le lieu d'une réponse d'aerodb, nettoyé : { value, name, kind, code, lat, lon } ou null (sans position ou sans nom ni code). */
function place(h, kind) {
  const lat = typeof h?.lat === 'number' ? h.lat : NaN,
    lon = typeof h?.lon === 'number' ? h.lon : NaN,
    code = clean(String(h?.code ?? ''), 12).toUpperCase(),
    name = clean(String(h?.name ?? ''), 60);
  if (!(Math.abs(lat) <= 90) || !(Math.abs(lon) <= 180) || !(code || name)) return null;
  return {
    value: code || name,
    name: name || code,
    kind,
    code,
    lat,
    lon
  };
}
/** À rang égal : les terrains, puis les balises, les points, les points VFR, les villes. */
const KIND = {
  aerodrome: 0,
  navaid: 1,
  point: 2,
  vrp: 3,
  city: 4
};
const fold = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
/** Le rang d'un lieu pour le texte q (déjà en capitales) : 0 l'identifiant EXACT (une balise, un point, un terrain), 1 un identifiant qui COMMENCE par le texte, 2 un nom (ou un mot du nom) qui commence par lui, 3 le reste. */
const rankOf = (p, q) => {
  const code = fold(p.code),
    name = fold(p.name);
  return code && code === q ? 0 : code && code.startsWith(q) ? 1 : name.startsWith(q) || name.split(/[^A-Z0-9]+/).some(w => w.startsWith(
    q)) ? 2 : 3;
};
/** Les propositions pour un texte (SOG-0491, refusée au test : « REN » donnait tout sauf la VOR REN) : l'identifiant EXACT d'abord, où qu'il soit — aerodb.find ne lit que les zones OUVERTES,
 *  coordsAll cherche l'identifiant dans toutes les zones publiées — puis les identifiants qui commencent par le texte, puis les noms ; aerodb.find (lieux des zones ouvertes, villes) et suggest
 *  (les terrains de toutes les zones) complètent ; SHOWN au plus, sans doublon (un identifiant donné par deux sources n'est proposé qu'une fois). */
export async function searchPlaces(q, A) {
  if (!A) return [];
  const Q = fold(q).trim(),
    [exact, found, ads] = await Promise.all([
      // un identifiant (3 à 5 signes) est demandé à TOUTES les zones publiées ; coordsAll les parcourt une à une jusqu'à le trouver : jamais plus de 1,5 s d'attente, et pas pour un texte qui n'en est pas un
      /^[A-Z0-9]{3,5}$/.test(Q) ? Promise.race([Promise.resolve(A.coordsAll?.(q.trim())), new Promise(ok => setTimeout(() => ok([]),
        1500))]).catch(() => []) : [],
      Promise.resolve(A.find?.(q, 40)).catch(() => []),
      Promise.resolve(A.suggest?.(q, {
        n: 10
      })).catch(() => [])
    ]),
    out = [],
    seen = new Set(),
    add = p => {
      if (!p) return;
      const k = `${p.kind}|${p.value}`;
      if (seen.has(k) || [...seen].some(s => s.endsWith(`|${p.value}`) && p.kind === 'aerodrome')) return;
      seen.add(k);
      out.push(p);
    };
  for (const x of Array.isArray(exact) ? exact.slice(0, 6) : []) {
    const it = x?.item || {};
    add(place({
      code: it.icao || it.id,
      name: it.name,
      lat: it.lat,
      lon: it.lon
    }, ['aerodrome', 'navaid', 'point', 'vrp'].includes(x?.kind) ? x.kind : 'point'));
  }
  for (const h of Array.isArray(found) ? found : []) add(place(h, ['aerodrome', 'navaid', 'point', 'vrp', 'city'].includes(h?.kind) ? h
    .kind : 'point'));
  for (const h of Array.isArray(ads) ? ads : []) add(place(h, 'aerodrome'));
  // l'ordre : exact, début d'identifiant, noms ; à rang égal, l'ordre des sources (la même suite stable)
  return out.map((p, i) => ({
    p,
    i,
    r: rankOf(p, Q)
  })).sort((a, b) => a.r - b.r || KIND[a.p.kind] - KIND[b.p.kind] || a.i - b.i).map(x => x.p).slice(0, SHOWN);
}
const search = q => searchPlaces(q, S.ctx?.aerodb);

const kindText = kind => tt(TX.findKinds[kind] || TX.findKinds.point);
/** Centre la carte sur le lieu (la caméra est ensuite celle de l'utilisateur) ; sur le fond uni, le cadre se pose autour de lui. */
function centerOn(p) {
  S.userMoved = true;
  if (S.map) {
    const z = Math.max(S.map.getZoom(), ZOOM[p.kind] || 9),
      here = S.map.getCenter().lng,
      lon = p.lon + 360 * Math.round((here - p.lon) / 360); // la copie du monde la plus proche de la vue
    S.map.easeTo({
      center: [lon, p.lat],
      zoom: Math.min(14, z),
      duration: 600
    });
  } else {
    const d = p.kind === 'aerodrome' ? .25 : .6;
    S.fit = {
      w: p.lon - d * 1.6,
      e: p.lon + d * 1.6,
      s: p.lat - d,
      n: p.lat + d
    };
  }
  schedule();
}

/** Ouvre ou ferme la loupe. */
export function setFind(on) {
  if (!S) return;
  if (!!S.find.on === !!on) return;
  S.find.on = !!on;
  setPressed(S.findBtn, !!on);
  if (on) open();
  else close();
}
/** Ferme la loupe sans rien d'autre (le repère part avec elle). */
export const closeFind = () => setFind(false);

function open() {
  const el = S.findEl;
  if (!el) return;
  S.find.pick = null;
  S.find.pin = null;
  el.hidden = false;
  el.style.top = `${S.mbarEl && !S.mbarEl.hidden ? S.mbarEl.offsetHeight + 16 : 8}px`; // sous la fenêtre de la mission quand elle est là
  el.innerHTML = `<label class="mp-find-f"><span class="mp-find-i" aria-hidden="true">${svg('search', { size: 20 })}</span><input type="search" class="mp-find-q" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(tt(TX.findHolder))}" aria-label="${esc(tt(TX.findHelp))}" aria-autocomplete="list" aria-controls="mp-find-sug" aria-expanded="false" role="combobox"><button type="button" class="mp-find-x" aria-label="${esc(tt(TX.findClose))}">${svg('x', { size: 18 })}</button></label><div id="mp-find-sug" class="mp-find-sug" data-mpsug role="listbox" hidden></div><div class="mp-find-act" hidden></div><p class="mp-find-none f-muted" hidden role="status"></p>`;
  const input = el.querySelector('.mp-find-q'),
    act = el.querySelector('.mp-find-act'),
    none = el.querySelector('.mp-find-none');
  let timer = 0,
    hits = [];
  const list = createSuggestList({
    body: () => S?.findEl || null,
    box: '[data-mpsug]',
    attr: 'code',
    idPrefix: 'mp-sug',
    fields: () => [input],
    owns: x => x === input,
    write: (inp, v) => {
      const p = hits.find(h => h.value === v);
      if (!p) return false;
      inp.value = `${p.code ? `${p.code} — ` : ''}${p.name !== p.code ? p.name : ''}`.replace(/ — $/, '');
      choose(p);
      return true;
    }
  });
  S.find.list = list;
  const showHits = h => {
    hits = h;
    none.hidden = true;
    if (!h.length) return list.close();
    list.show(input, h.map(p => ({
      value: p.value,
      label: `${p.name !== p.value ? p.name : ''} · ${kindText(p.kind)}`.replace(/^ · /, '')
    })));
  };
  const run = async () => {
    const q = input.value.trim(),
      seq = list.ticket();
    if (q.length < MIN) {
      hits = [];
      none.hidden = true;
      return list.close();
    }
    const h = await search(q);
    if (!list.live(seq) || !S?.find.on) return;
    showHits(h);
    if (!h.length) {
      none.textContent = tt(TX.findNone);
      none.hidden = false;
    }
  };
  /** Un choix : la carte s'y centre, un repère y est posé, les actions s'offrent. */
  function choose(p) {
    S.find.pick = p;
    S.find.pin = {
      lat: p.lat,
      lon: p.lon
    };
    centerOn(p);
    const flight = !!S.boxOn && !onMission() && !S.choose && !!S.route?.flight && S.route.points.length >= 2,
      b = [];
    if (p.kind === 'aerodrome' && p.code) b.push(`<button type="button" class="f-btn f-primary" data-find="sheet">${esc(tt(TX.findSheet))}</button>`);
    if (flight && p.code && p.kind !== 'city') b.push(`<button type="button" class="f-btn" data-find="add">${esc(tt(TX.findAdd))}</button>`);
    act.innerHTML = b.join('');
    act.hidden = !b.length;
    none.hidden = true;
  }
  input.addEventListener('input', () => {
    if (list.picking()) return;
    S.find.pick = null;
    S.find.pin = null;
    act.hidden = true;
    clearTimeout(timer);
    timer = setTimeout(run, DEBOUNCE);
    schedule();
  });
  el.addEventListener('keydown', e => {
    if (list.onKey(e)) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setFind(false);
    }
  });
  el.addEventListener('focusout', e => list.onFocusOut(e));
  el.addEventListener('pointerdown', e => list.onPointerDown(e));
  el.addEventListener('click', e => {
    if (list.onClick(e)) return;
    if (e.target.closest('.mp-find-x')) return setFind(false);
    const a = e.target.closest('[data-find]'),
      p = S.find.pick;
    if (!a || !p) return;
    if (a.dataset.find === 'sheet') pinAd({
      icao: p.code,
      name: p.name,
      lat: p.lat,
      lon: p.lon
    });
    else need('edit').then(m => {
      if (S?.find.pick === p && m.addPlace({
          id: p.code,
          lat: p.lat,
          lon: outLon(p.lon)
        })) {
        S.ctx.notify?.(tt(TX.findAdded, {
          c: p.code
        }), 'info');
        act.querySelector('[data-find="add"]')?.setAttribute('disabled', '');
      }
    }, () => S?.ctx.notify?.(tt(TX.saveFailed, {
      m: 'edit.js'
    }), 'err'));
  });
  input.focus();
  schedule();
}

function close() {
  const el = S.findEl;
  S.find.list?.close();
  S.find.list = null;
  S.find.pick = null;
  S.find.pin = null;
  if (el) {
    el.hidden = true;
    el.innerHTML = '';
  }
  schedule();
}
