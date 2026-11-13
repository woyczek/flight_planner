// V3 data — le calcul pur de la carte du monde, des paquets de pays et de la fiche d'un pays (SOG-0262, lot A) : le dessin des contours en SVG (projection, cadre de la couverture, chemins), le bilan d'un paquet, la lecture fermée de base/cycle (la liste du cycle, SOG-0259) et
// ce que la fiche en tire (les sources d'un pays, les fichiers attendus et ceux vus dans Téléchargements). Pur : ni page, ni lanceur, ni stockage ; tout ce que le lanceur ou le catalogue répond est une entrée non fiable (textes bornés, listes fermées, nombres entiers).
import {
  STATE_TONE,
  drawnState,
  zoneStateOf
} from './model_status.js';

const ZONE = /^[a-z0-9_-]{2,12}$/;
const SRC = /^[a-z0-9_]{2,24}$/;
const DAY = /^\d{4}-\d{2}-\d{2}/;
const WORLD = Object.freeze([-180, -58, 180, 80]);
/** Un texte court sans caractère de commande ; '' sinon. */
const text = (v, n = 120) => typeof v === 'string' ? v.replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ').trim().slice(0, n) : '';
/** Un entier fini ≥ 0 borné à un milliard, sinon 0. */
const int = v => Number.isFinite(v) ? Math.max(0, Math.min(Math.trunc(v), 1e9)) : 0;
/** Une date « AAAA-MM-JJ », sinon ''. */
const day = v => typeof v === 'string' && DAY.test(v) ? v.slice(0, 10) : '';
/** Un instant ISO UTC, sinon null. */
const stamp = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) ? v.slice(0, 30) : null;

// ------------------------------------------------------------------------------------------------ la carte
/** L'ordonnée d'une latitude en projection de Mercator, en degrés (la latitude est bornée : ni pôle, ni Antarctique). */
export const mercY = lat => Math.log(Math.tan(Math.PI / 4 + Math.max(-58, Math.min(84, lat)) * Math.PI / 360)) * 180 / Math.PI;
/** Un nombre de coordonnée au centième de degré, écrit court. */
const num = v => String(Math.round(v * 100) / 100);
/** Les anneaux d'une zone en un chemin SVG (x = longitude, y = −Mercator de la latitude) ; sans anneau lisible, le rectangle de son cadre `box` ; '' sans rien. */
export function pathOf(rings, box) {
  const list = (Array.isArray(rings) ? rings : []).filter(r => Array.isArray(r) && r.length > 2);
  const d = list.map(r => `M${r.filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])).map(p => `${num(p[0])},${num(-mercY(p[1]))}`).join('L')}Z`).join('');
  if (d) return d;
  if (!Array.isArray(box) || box.length !== 4 || !box.every(Number.isFinite)) return '';
  const [w, s, e, n] = box;
  return `M${num(w)},${num(-mercY(n))}L${num(e)},${num(-mercY(n))}L${num(e)},${num(-mercY(s))}L${num(w)},${num(-mercY(s))}Z`;
}
/** Le cadre [ouest, sud, est, nord] d'un pays SANS son outre-mer ni ses îles lointaines : celui du plus grand anneau, élargi aux anneaux qui le touchent à `gap` degrés près (de proche en proche : la Corse, la Sicile, les îles grecques en font partie ; les Açores, les Canaries, la Guyane, le Svalbard non). Sans anneau lisible, `box`. */
export function mainBox(rings, box, gap = 3) {
  const bb = (Array.isArray(rings) ? rings : []).map(r => {
    const pts = (Array.isArray(r) ? r : []).filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
    return pts.length > 2 ? [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math
      .max(...pts.map(p => p[1]))
    ] : null;
  }).filter(Boolean);
  if (!bb.length) return box;
  const area = b => (b[2] - b[0]) * (b[3] - b[1]);
  let cur = [...bb.sort((a, b) => area(b) - area(a))][0].slice(),
    grown = true;
  const left = bb.slice(1);
  while (grown) {
    grown = false;
    for (let i = left.length - 1; i >= 0; i--) {
      const b = left[i];
      if (b[0] <= cur[2] + gap && b[2] >= cur[0] - gap && b[1] <= cur[3] + gap && b[3] >= cur[1] - gap) {
        cur = [Math.min(cur[0], b[0]), Math.min(cur[1], b[1]), Math.max(cur[2], b[2]), Math.max(cur[3], b[3])];
        left.splice(i, 1);
        grown = true;
      }
    }
  }
  return cur;
}
/** Le cadre de la vue [x, y, largeur, hauteur] (unités du chemin) qui contient des cadres [ouest, sud, est, nord] avec une marge (8 % de chaque côté, 6° au moins) ; null sans cadre lisible. */
export function frameOf(boxes) {
  const ok = (boxes || []).filter(b => Array.isArray(b) && b.length === 4 && b.every(Number.isFinite));
  if (!ok.length) return null;
  const w = Math.min(...ok.map(b => b[0])),
    e = Math.max(...ok.map(b => b[2])),
    s = Math.min(...ok.map(b => b[1])),
    n = Math.max(...ok.map(b => b[3])),
    top = -mercY(n),
    bottom = -mercY(s),
    mx = Math.max((e - w) * .08, 6),
    my = Math.max((bottom - top) * .08, 6);
  return [w - mx, top - my, e - w + 2 * mx, bottom - top + 2 * my].map(v => Math.round(v * 100) / 100);
}
/** Le cadre du monde entier (le même pour tous : « Voir le monde entier »). */
export const worldFrame = () => frameOf([WORLD]);
/** La teinte d'un pays sur la carte : 'muted' (hors de la couverture), la teinte de l'état du lanceur (vert, ambre, rouge ; « en cours » dit ambre : la marche se lit dans la barre d'état), neutre (« état non lu ») quand l'état est lu et ne dit rien de ce pays ; null quand l'état n'est pas lu
 *  (l'appelant donne alors la teinte de la publication). */
export function toneOf(status, id, inCoverage, running) {
  if (!inCoverage) return 'muted';
  const ds = drawnState(status, id, running);
  if (ds) return STATE_TONE[ds] === 'accent' ? 'busy' : STATE_TONE[
    ds
  ]; // une opération en cours est SA teinte (bleue), tenue du début à la fin : jamais le marron de « à faire » entre deux écritures de l'état (SOG-0324)
  return status ? 'unread' : null; // l'état est lu et ne dit rien de ce pays : neutre, ni caché ni peint en défaut (SOG-0260)
}
/** Le bilan d'un paquet : { known (ses pays), inCov, ok (à jour), warn (à faire), err (en échec), none (sans état lu), out (hors de la couverture) } ; `tone(id)` est la teinte d'un pays (toneOf). */
export function tally(known, covIds, tone) {
  const cov = new Set(covIds || []),
    out = {
      known: known.length,
      inCov: 0,
      ok: 0,
      warn: 0,
      err: 0,
      none: 0,
      busy: 0,
      out: 0
    };
  for (const id of known) {
    if (!cov.has(id)) {
      out.out++;
      continue;
    }
    out.inCov++;
    const t = tone(id);
    out[t === 'ok' || t === 'warn' || t === 'err' || t === 'busy' ? t : 'none']++;
  }
  return out;
}
/** Les pays qui ont des procédures d'après les lignes de base/coverage (`procSources` non vide) : { zone: [sources] } ; {} sans ligne. */
export function procZonesOf(rows) {
  const out = {};
  for (const r of rows || [])
    if (r?.procSources?.length) out[r.zone] = r.procSources;
  return out;
}

// ------------------------------------------------------------------------------------------------ base/cycle
const REGIMES = ['auto', 'hand', 'local'];
const DL_STATES = ['done', 'late', 'missing', 'waiting', 'n/a', 'unavailable'];
const WHYS = ['older-than-cycle', 'newer-in-downloads', 'no-file', 'not-downloaded', 'unavailable-at-publisher'];
/** Les textes d'une liste, bornés (n au plus, de longueur m). */
const texts = (a, n, m = 120) => (Array.isArray(a) ? a : []).slice(0, n).map(x => text(x, m)).filter(Boolean);
/** Une source de la liste du cycle lue : { id, label[4], regime, personal, zones (identifiants, ou null : une source commune), download { state, cycle, at, edition }, build { zones, upToDate }, publish { published, unpublished, unknown }, why, hand { link, expected, inDownloads } | null }. */
function itemOf(it) {
  if (it === null || typeof it !== 'object' || typeof it.id !== 'string' || !SRC.test(it.id)) return null;
  const dl = it.steps?.download,
    h = it.hand;
  return {
    id: it.id,
    label: [0, 1, 2, 3].map(i => text(it.label?.[i], 80) || text(it.label?.[0], 80)),
    regime: REGIMES.includes(it.regime) ? it.regime : '',
    personal: it.personal === true,
    unavailable: it.unavailable !== null && typeof it.unavailable === 'object' ? {
      since: text(it.unavailable.since, 10)
    } : null, // la source n'est plus offerte par son éditeur (K183) : dite à part, ni en retard ni à faire
    zones: Array.isArray(it.zones) ? it.zones.filter(z => typeof z === 'string' && ZONE.test(z)).slice(0, 200) : null,
    download: {
      state: DL_STATES.includes(dl?.state) ? dl.state : '',
      cycle: day(dl?.cycle),
      at: stamp(dl?.at),
      edition: text(dl?.edition, 40)
    },
    build: {
      zones: int(it.steps?.build?.zones),
      upToDate: int(it.steps?.build?.upToDate)
    },
    publish: {
      published: int(it.steps?.publish?.published),
      unpublished: int(it.steps?.publish?.unpublished),
      unknown: int(it.steps?.publish?.unknown)
    },
    why: WHYS.includes(it.why) ? it.why : '',
    hand: h !== null && typeof h === 'object' ? {
      link: text(h.link, 300),
      expected: texts(h.expected, 12),
      inDownloads: texts(h.inDownloads, 30)
    } : null
  };
}
/** Une liste d'identifiants de source, bornée. */
const srcIds = a => [...new Set((Array.isArray(a) ? a : []).filter(x => typeof x === 'string' && SRC.test(x)))].slice(0, 12);
/** La vue par zone de base/cycle `{ zone }` (K182) lue : { zone, known, inCoverage, state (l'état de la zone, comme base/status, ou null), sources (les sources qui nourrissent CE pays, chacune avec ses trois étapes pour lui seul : { id: source }), order (leurs identifiants dans l'ordre reçu),
 *  addWillAsk { sources, auto, hand: [{ id, expected }], personal, noReader } } ; null sans vue lisible. */
function zoneViewOf(v) {
  if (v === null || typeof v !== 'object' || typeof v.zone !== 'string' || !ZONE.test(v.zone)) return null;
  const sources = {},
    order = [];
  for (const it of (Array.isArray(v.sources) ? v.sources : []).slice(0, 24)) {
    const x = itemOf(it);
    if (x && !Object.hasOwn(sources, x.id)) {
      sources[x.id] = x;
      order.push(x.id);
    }
  }
  const a = v.addWillAsk !== null && typeof v.addWillAsk === 'object' ? v.addWillAsk : {};
  return {
    zone: v.zone,
    known: v.known !== false,
    inCoverage: v.inCoverage === true,
    state: zoneStateOf(v.state),
    sources,
    order,
    addWillAsk: {
      sources: srcIds(a.sources),
      auto: srcIds(a.auto),
      hand: (Array.isArray(a.hand) ? a.hand : []).slice(0, 12).filter(h => h && typeof h.id === 'string' && SRC.test(h.id)).map(h => ({
        id: h.id,
        expected: texts(h.expected, 12)
      })),
      personal: srcIds(a.personal),
      noReader: srcIds(a.noReader)
    }
  };
}
const LATER_STATES = ['in-downloads', 'to-take', 'will-be-taken', 'unavailable'];
const UNREAD_REASONS = ['no-reader', 'format'];
/** Le cycle suivant lu (K179) : { cycle (« AAAA-MM-JJ »), id (« 2612 »), items: [{ id, state, files }] } ; `state` : ce que Téléchargements a déjà (in-downloads), ce qui reste à aller chercher à la main (to-take), ce que le poste prendra seul quand il sera en vigueur (will-be-taken), ce que l'éditeur n'offre plus (unavailable) ; null sans rien de lisible. */
export function laterOf(n, ids) {
  if (n === null || typeof n !== 'object' || !Array.isArray(n.items)) return null;
  const items = [];
  for (const it of n.items.slice(0, 60))
    if (it && typeof it.id === 'string' && SRC.test(it.id) && LATER_STATES.includes(it.state) && !items.some(x => x.id === it.id)) items
      .push({
        id: it.id,
        state: it.state,
        files: texts(it.files, 12, 160)
      });
  return {
    cycle: day(n.cycle),
    id: text(ids?.next, 8),
    items
  };
}
/** Ce que le poste voit dans Téléchargements et que la suite ne lit pas encore (K179, K188) : [{ id, files, reason ('no-reader' | 'format'), note }] ; une note est un texte du lanceur (borné). */
export function unreadOf(a) {
  const out = [];
  for (const it of (Array.isArray(a) ? a : []).slice(0, 24))
    if (it && typeof it.id === 'string' && SRC.test(it.id) && !out.some(x => x.id === it.id)) out.push({
      id: it.id,
      files: texts(it.files, 12, 160),
      reason: UNREAD_REASONS.includes(it.reason) ? it.reason : 'no-reader',
      note: text(it.note, 240)
    });
  return out;
}
/** Les sources calculées ou lues sur ce poste (MORA, X-Plane…) lues : [{ id, label[4], at (instant ISO UTC de leur dernier fichier, ou null), personal, zoneCount }] ; bornée. */
export function localOf(a) {
  const out = [];
  for (const it of (Array.isArray(a) ? a : []).slice(0, 24))
    if (it !== null && typeof it === 'object' && typeof it.id === 'string' && SRC.test(it.id) && !out.some(x => x.id === it.id)) out.push({
      id: it.id,
      label: [0, 1, 2, 3].map(i => text(it.label?.[i], 80) || text(it.label?.[0], 80) || it.id),
      at: stamp(it.at),
      personal: it.personal === true || it.personal === 'licence',
      zoneCount: int(it.zoneCount)
    });
  return out;
}
const DS_STATES = ['up-to-date', 'todo', 'n/a'];
const DS_WHYS = ['absent', 'older-than-cycle', 'old', 'expired'];
/** Les AUTRES jeux de l'écran (`datasets` de base/cycle, K207) lus : [{ id, label[4], state ('up-to-date' | 'todo' | 'n/a' : « existe, sans échéance », compté fait), why ('absent' | 'older-than-cycle' | 'old' | 'expired', seulement avec `todo`, sinon ''), at (instant ISO UTC du fichier, ou null),
 *  cycle, run, validUntil, counts { cifp, eaip, aerodromes } (entiers) }] ; un état hors de la liste fermée écarte la ligne ; [] sans rien de lisible (un lanceur sans `datasets` : l'écran garde le compte de la base seule). */
export function datasetsOf(a) {
  const out = [];
  for (const it of (Array.isArray(a) ? a : []).slice(0, 24))
    if (it !== null && typeof it === 'object' && typeof it.id === 'string' && SRC.test(it.id) && DS_STATES.includes(it.state) && !out.some(
        x => x.id === it.id)) {
      const c = it.counts !== null && typeof it.counts === 'object' ? it.counts : {};
      out.push({
        id: it.id,
        label: [0, 1, 2, 3].map(i => text(it.label?.[i], 80) || text(it.label?.[0], 80) || it.id),
        state: it.state,
        why: it.state === 'todo' && DS_WHYS.includes(it.why) ? it.why : '',
        at: stamp(it.at),
        cycle: day(it.cycle),
        run: text(it.run, 40),
        validUntil: stamp(it.validUntil),
        counts: {
          cifp: int(c.cifp),
          eaip: int(c.eaip),
          aerodromes: int(c.aerodromes)
        }
      });
    }
  return out;
}
/** La fin d'un travail base/cycle lue : { inForce, inForceDate, next, items: { id: source }, order, unavailable, later, unread, local, datasets, zoneView } (`zoneView` quand le travail a demandé un pays) ; null si ce n'est pas une réponse lisible (échec, refus, forme inattendue). */
export function cycleRead(final) {
  const r = final?.state === 'done' && final.result !== null && typeof final.result === 'object' ? final.result : null;
  if (!r || r.ok === false || (!Array.isArray(r.items) && (r.zoneView === null || typeof r.zoneView !== 'object'))) return null;
  const items = {},
    order = [];
  for (const it of (Array.isArray(r.items) ? r.items : []).slice(0, 120)) {
    const x = itemOf(it);
    if (x && !Object.hasOwn(items, x.id)) {
      items[x.id] = x;
      order.push(x.id);
    }
  }
  // les sources calculées sur ce poste : le lanceur les dit à part (`local`, K185) ; un lanceur qui les laisse encore dans `items` (régime « local ») est ramené à la même forme : `local` est LA source de « Quand ça change » et de la fiche
  const local = Array.isArray(r.local) ? localOf(r.local) : localOf(Object.values(items).filter(it => it.regime === 'local').map(it => ({
    id: it.id,
    label: it.label,
    at: it.download.at,
    personal: it.personal,
    zoneCount: it.build.zones
  })));
  return {
    inForce: text(r.cycle?.ids?.inForce, 8) || day(r.cycle?.inForce),
    inForceDate: day(r.cycle?.inForce),
    next: text(r.cycle?.ids?.next, 8) || day(r.cycle?.next),
    items,
    order, // les identifiants des sources dans l'ordre reçu (la liste « ce qui reste à faire » les trie)
    unavailable: srcIds(r.unavailable), // les sources que leur éditeur n'offre plus (K183) : dites à part
    later: laterOf(r.next, r.cycle
      ?.ids), // le cycle suivant : ce que Téléchargements a déjà, ce qui reste à la main, ce que le poste prendra seul
    unread: unreadOf(r.unread), // vu dans Téléchargements, pas encore lu par la suite
    local,
    datasets: datasetsOf(r
      .datasets
    ), // les autres jeux (procédures, points VFR, aéronefs, météo…) : leur état, pour les plis de l'écran et le compte « n faits sur m »
    zoneView: zoneViewOf(r.zoneView)
  };
}

// ------------------------------------------------------------------------------------------------ la fiche d'un pays
/** Les sources qui nourrissent un pays, dans l'ordre : celles que le catalogue lui attribue (zone nommée, source utilisée ou envisagée du groupe « base »), celles que le lanceur dit qu'il télécharge pour lui (`download.sources` de base/status), celles de la liste du cycle qui le nomment. Un identifiant, une fois. */
export function sourcesOfZone(zone, cat, status, cycle) {
  const ids = [],
    add = id => {
      if (typeof id === 'string' && SRC.test(id) && !ids.includes(id)) ids.push(id);
    };
  if (cycle?.zoneView?.zone === zone && cycle.zoneView.order.length) return cycle.zoneView.order.slice(0,
    12); // le lanceur dit lui-même lesquelles nourrissent ce pays
  for (const s of cat?.SOURCES || [])
    if (s?.group === 'base' && s.status !== 'abandoned' && Array.isArray(s.zones) && s.zones.includes(zone)) add(s.id);
  const dl = Object.hasOwn(status?.zones || {}, zone) ? status.zones[zone].download?.list : null;
  for (const id of Object.keys(dl || {})) add(id);
  for (const it of Object.values(cycle?.items || {}))
    if (Array.isArray(it.zones) && it.zones.includes(zone)) add(it.id);
  return ids.slice(0, 12);
}
/** Un nom de fichier du catalogue (« export_xml_bd_SIA_<AAAA-MM-JJ>-v<nn>.zip », « EK_ENR_3_2*.pdf ») en expression : « <…> » et « * » valent n'importe quoi, le reste tel quel, sans tenir compte de la casse. */
export function fileRegex(pattern) {
  const body = String(pattern ?? '').split(/(<[^>]*>|\*)/).map(p => /^<[^>]*>$|^\*$/.test(p) ? '.*' : p.replace(/[.+?^${}()|[\]\\]/g,
    '\\$&')).join('');
  return new RegExp(`^${body}$`, 'i');
}
/** Le fichier de ce nom attendu est-il dans la liste des noms vus dans Téléchargements ? */
export const fileSeen = (pattern, names) => (names || []).some(n => fileRegex(pattern).test(n));
