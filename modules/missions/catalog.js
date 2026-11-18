// V3 missions — le catalogue des briques et des modèles de l'atelier (lot « modèles de mission », 18 nov. 2026 ; décisions A à D du relais
// de l'ergonome), le calcul pur : ni page, ni stockage, ni réseau. Le catalogue livré (modules/missions/catalog.yaml) et chaque modèle
// personnel (pilot/<TRI>/modeles/<id>.yaml, écrit par n'importe quel appareil du pilote) sont des entrées NON FIABLES, lues par la même
// fonction et bornées de même : taille, nombre d'entrées, identifiants à forme fermée, textes nettoyés par `visible` du lecteur
// (frame/lib/mission.js) et coupés, un texte qui porte une balise ou une adresse refusé, un nombre hors bornes jamais écrit (ni ramené
// dans ses bornes), aucune clé inconnue recopiée, aucune ancre YAML. Une brique est un tiroir sans lieu ; un modèle, des tiroirs et des
// lieux « à placer » (une sorte et un nom, jamais une position).
//
// API :
//   LIMITS : les bornes de lecture ; ID : la forme d'un identifiant de brique ou de modèle ; LANGS : les quatre langues.
//   readCatalog(text, Y) → { ok, why ('' | 'size' | 'unreadable' | 'alias' | 'shape' | 'version'), families [codes], bricks [spec],
//     models [{ id, type, title, brief, drawers [spec], places [{ id, kind, okind, name }] }], dropped (entrées écartées) } ;
//     une « spec » de tiroir : { id?, family?, key (une de editor_drawers.js KEYS), title, message, brief (textes { fr, en, de, es }),
//     place (la clé d'un lieu du modèle, ou ''), fallback (minutes, ou null), params ({ radius_nm, speed_max_kt, require_on_ground,
//     delay_min } bornés), route [mots] }. Y : js-yaml (le cadre le charge ; schéma CORE).
//   textIn(t, lang) → le texte d'une langue (le français à défaut, puis la première langue écrite) ; '' sinon.
//   drawerFrom(blank, spec, places, lang, idOf) → la ligne de tiroir d'une spec (editor_drawers.js keyed : ce que la clé devine), son
//     titre et son message pré-remplis ; idOf(clé d'un lieu du modèle) → l'identifiant du lieu dans la séance ('' sinon).
//   modelOf(doc) → { id, placed [identifiants] } | null : la clé `mission_model` du fichier (docs/technique/FORMAT_MISSION.md § 4
//     quater) ; mal formée, inconnue : null (aucun modèle) ; `placed` ne garde que les lieux qui existent encore.
//   withModel(doc, m) → un NOUVEAU document : `mission_model` écrite (m) ou retirée (null).
//   unplaced(row) → vrai pour une ligne des Lieux sans position (« à placer »).
//   modelChange(places, drawers, prior) → { drawers (n), gone [identifiants], kept [identifiants], mine [identifiants] } : ce que
//     « Changer de modèle » remplace (tous les tiroirs, les lieux posés par le modèle encore à placer) et ce qu'il garde (les lieux
//     posés par le modèle et placés depuis, les lieux de l'auteur).
//   applyModel({ places, drawers, base, prior }, model, lang) → { places, drawers, placed } : les lignes de la séance après le modèle.
//   modelFromSession({ id, title, family, drawers, places }) → l'entrée de modèle d'une séance : tiroirs complets, lieux sans position,
//     ni identifiant de mission, ni équipes, ni indicatifs ; modelText(model, Y) → le texte YAML du fichier ({ version, models: [m] }).
//   slug(title) → l'identifiant d'un modèle tiré de son nom ('' sinon) ; modelPath(trigram, id) → 'pilot/<TRI>/modeles/<id>.yaml' | null.
import * as MS from '../../frame/lib/mission.js';
import * as DR from './editor_drawers.js';
import * as ED from './editor.js';

export const LIMITS = Object.freeze({
  bytes: 131072, // 128 Ko
  families: 16,
  bricks: 80,
  models: 20,
  drawers: 12,
  places: 20,
  title: 80,
  brief: 600,
  message: 2000,
  name: 60,
  route: 20,
  placed: 20
});
export const ID = /^[a-z0-9-]{1,40}$/;
export const LANGS = Object.freeze(['fr', 'en', 'de', 'es']);
/** La clé d'un lieu dans un modèle (une clé locale, que l'application remplace par l'identifiant donné par l'atelier). */
const PLACE_KEY = /^[A-Za-z0-9-]{1,24}$/;
/** Un code de famille (celui des thèmes de mission, frame/lib/mission_themes.js THEME_ID). */
const FAMILY = /^[A-Z][A-Z0-9_]{1,23}$/;
/** Les sortes de lieu qu'un modèle pose (celles que la carte de l'atelier déplace : editor.js MOVABLE). */
const PLACE_KINDS = Object.freeze(['target', 'zone', 'pt', 'rdv', 'object']);
/** Les mots de route qui disent le départ ou l'arrivée. */
const ENDS = new Set(['ORIGIN', 'DESTINATION']);
const B = MS.DRAWER_BOUNDS;

/** Un objet du fichier (ni liste, ni valeur nue). */
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
/** Une liste du fichier, bornée (rien sinon) ; `over` reçoit le nombre d'entrées au-delà de la borne. */
const listOf = (v, max, over) => {
  const a = Array.isArray(v) ? v : [];
  if (a.length > max) over(a.length - max);
  return a.slice(0, max);
};
/** Un texte d'une ou plusieurs lignes, nettoyé (caractères invisibles retirés) et coupé ; '' pour une balise, une adresse ou un
 *  type qui n'est pas un texte. */
function clean(v, n, multi = false) {
  if (typeof v !== 'string' && typeof v !== 'number') return '';
  const s = MS.visible(v);
  if (/[<>]|:\/\/|javascript:/i.test(s)) return '';
  return (multi ? s.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim() : s.replace(/\s+/g, ' ').trim()).slice(0, n);
}
/** Un texte en quatre langues { fr, en, de, es } : un objet par langue, ou un texte seul (le même dans les quatre) ; null sans texte. */
function text4(v, n, multi = false) {
  const out = {};
  if (typeof v === 'string' || typeof v === 'number') {
    const t = clean(v, n, multi);
    for (const l of LANGS) out[l] = t;
  } else if (isObj(v))
    for (const l of LANGS) out[l] = clean(v[l], n, multi);
  return LANGS.some(l => out[l]) ? out : null;
}
/** Le texte d'une langue (voir l'en-tête). */
export function textIn(t, lang) {
  if (!isObj(t)) return '';
  return String(t[lang] || t.fr || LANGS.map(l => t[l]).find(Boolean) || '');
}
/** Un nombre écrit dans [lo, hi] (entier si `whole`), ou null : jamais ramené dans ses bornes. */
const num = (v, lo, hi, whole = false) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi && (!whole || Number
  .isInteger(v)) ? v : null;
/** Un identifiant à forme fermée, ou ''. */
const idOf = (v, re = ID) => typeof v === 'string' && re.test(v) ? v : '';

/** Les réglages d'une clé, bornés comme le lecteur les borne (FORMAT_MISSION.md § 5) ; une valeur hors bornes n'est pas lue. */
function paramsOf(v, key) {
  const p = isObj(v) ? v : {},
    out = {};
  if (key === 'arrival') {
    const r = num(p.radius_nm, Number.MIN_VALUE, B.rangeNm),
      k = num(p.speed_max_kt, 0, B.speedKt);
    if (r !== null) out.radius_nm = r;
    if (k !== null) out.speed_max_kt = k;
    if (typeof p.require_on_ground === 'boolean') out.require_on_ground = p.require_on_ground;
  }
  if (key === 'time') {
    const d = num(p.delay_min, 0, B.delayMin);
    if (d !== null) out.delay_min = d;
  }
  return out;
}

/** Une spec de tiroir lue — une brique (`brick` vrai : son « brief », ce qu'elle fait, devient le message du tiroir), ou un tiroir de
 *  modèle (son message et son briefing ; `base` : la brique qu'il reprend, ses textes à défaut des siens) ; null si refusée. */
function specOf(v, base = null, brick = false) {
  if (!isObj(v)) return null;
  const key = base ? base.key : DR.KEYS.includes(v.key) ? v.key : '',
    title = text4(v.title, LIMITS.title) || base?.title || null;
  if (!key || !title) return null;
  const route = listOf(v.route, LIMITS.route, () => {}).map(x => typeof x === 'string' && (ENDS.has(x) || PLACE_KEY.test(x)) ? x : '')
    .filter(Boolean);
  return {
    key,
    title,
    message: brick ? text4(v.brief, LIMITS.brief, true) : text4(v.message, LIMITS.message, true) || base?.message || null,
    brief: brick ? null : text4(v.brief, LIMITS.message, true) || base?.brief || null,
    place: idOf(v.place, PLACE_KEY),
    fallback: num(v.fallback_min, 0, B.delayMin, true) ?? base?.fallback ?? null,
    params: Object.keys(paramsOf(v.params, key)).length ? paramsOf(v.params, key) : base?.params || {},
    route
  };
}

/** Un lieu de modèle lu : { id (sa clé), kind, okind, name } ; null si refusé (une position écrite n'est jamais lue). */
function placeOf(v) {
  if (!isObj(v)) return null;
  const id = idOf(v.id, PLACE_KEY),
    kind = PLACE_KINDS.includes(v.kind) ? v.kind : '';
  if (!id || !kind) return null;
  return {
    id,
    kind,
    okind: kind === 'object' && MS.OBJECT_KINDS.includes(v.okind) ? v.okind : '',
    name: text4(v.name, LIMITS.name)
  };
}

/** Le catalogue d'un texte YAML (voir l'en-tête). */
export function readCatalog(text, Y = globalThis.jsyaml) {
  const empty = why => ({
    ok: false,
    why,
    families: [],
    bricks: [],
    models: [],
    dropped: 0
  });
  if (typeof text !== 'string' || !text.trim()) return empty('unreadable');
  if (new TextEncoder().encode(text).length > LIMITS.bytes) return empty('size');
  let doc;
  try {
    doc = Y.load(text, {
      schema: Y.CORE_SCHEMA
    });
  } catch {
    return empty('unreadable');
  }
  if (!isObj(doc)) return empty('shape');
  if (MS.shapeOf(doc)) return empty('alias'); // une ancre YAML, ou trop de nœuds : jamais lu
  if (doc.version !== 1) return empty('version');
  let dropped = 0;
  const over = n => {
      dropped += n;
    },
    families = [...new Set(listOf(doc.families, LIMITS.families, over).map(f => idOf(f, FAMILY)).filter(Boolean))],
    bricks = [],
    seen = new Set();
  for (const v of listOf(doc.bricks, LIMITS.bricks, over)) {
    const id = idOf(v?.id),
      family = v?.family === 'common' ? 'common' : idOf(v?.family, FAMILY),
      spec = id && family && !seen.has(id) ? specOf(v, null, true) : null;
    if (!spec) {
      dropped += 1;
      continue;
    }
    seen.add(id);
    bricks.push({
      id,
      family,
      ...spec,
      place: '',
      route: []
    });
  }
  const byId = new Map(bricks.map(b => [b.id, b])),
    models = [],
    mids = new Set();
  for (const v of listOf(doc.models, LIMITS.models, over)) {
    const id = idOf(v?.id),
      title = text4(v?.title, LIMITS.title);
    if (!id || !title || mids.has(id) || (v.type !== undefined && v.type !== '' && !idOf(v.type, FAMILY))) {
      dropped += 1;
      continue;
    }
    mids.add(id);
    const places = [],
      keys = new Set();
    for (const p of listOf(v.places, LIMITS.places, over).map(placeOf)) {
      if (!p || keys.has(p.id)) {
        dropped += 1;
        continue;
      }
      keys.add(p.id);
      places.push(p);
    }
    const drawers = [];
    for (const d of listOf(v.drawers, LIMITS.drawers, over)) {
      // un tiroir de modèle reprend une brique du même fichier (`brick`), ou s'écrit en entier (`key`)
      const brick = isObj(d) && d.brick !== undefined ? byId.get(idOf(d.brick)) : null,
        spec = isObj(d) && (d.brick === undefined || brick) ? specOf(d, brick) : null;
      if (!spec) {
        dropped += 1;
        continue;
      }
      // un lieu cité que le modèle ne pose pas n'est pas cité
      drawers.push({
        ...spec,
        place: keys.has(spec.place) ? spec.place : '',
        route: spec.route.filter(t => ENDS.has(t) || keys.has(t))
      });
    }
    models.push({
      id,
      type: idOf(v.type, FAMILY),
      title,
      brief: text4(v.brief, LIMITS.brief, true),
      drawers,
      places
    });
  }
  return {
    ok: true,
    why: '',
    families,
    bricks,
    models,
    dropped
  };
}

/** La ligne de tiroir d'une spec (voir l'en-tête). */
export function drawerFrom(blank, spec, places, lang, idOf = () => '') {
  const row = DR.keyed(blank, spec.key, places),
    at = spec.place ? idOf(spec.place) : '',
    p = spec.params || {};
  row.title = textIn(spec.title, lang).slice(0, B.title);
  row.message = textIn(spec.message, lang).slice(0, B.message);
  row.brief = textIn(spec.brief, lang).slice(0, B.brief);
  if (at && spec.key === 'zone') row.zone = at;
  if (at && spec.key === 'object') row.object = at;
  if (at && spec.key === 'time') row.point = at;
  if (spec.key === 'time' && p.delay_min !== undefined) row.delay = String(p.delay_min);
  if (spec.key === 'arrival') {
    if (p.radius_nm !== undefined) row.arrRadius = String(p.radius_nm);
    if (p.speed_max_kt !== undefined) row.arrSpeed = String(p.speed_max_kt);
    if (p.require_on_ground !== undefined) row.arrGround = p.require_on_ground === true;
  }
  // l'heure de repli : seulement pour une clé qui regarde l'avion (withKey la vide pour les autres)
  if (spec.fallback !== null && spec.fallback !== undefined && ['zone', 'object', 'arrival'].includes(spec.key)) row.fallback = String(
    spec.fallback);
  row.route = (spec.route || []).map(t => ENDS.has(t) ? t : idOf(t)).filter(Boolean);
  return row;
}

/** La clé `mission_model` d'un document (voir l'en-tête). */
export function modelOf(doc) {
  const m = isObj(doc) ? doc.mission_model : null;
  if (!isObj(m) || !idOf(m.id)) return null;
  if (m.placed !== undefined && (!Array.isArray(m.placed) || m.placed.length > LIMITS.placed)) return null;
  const ids = new Set(ED.placesOf(doc).map(p => p.id).filter(Boolean));
  return {
    id: m.id,
    placed: [...new Set((m.placed || []).filter(x => typeof x === 'string' && ids.has(x)))]
  };
}

/** Le document avec sa clé `mission_model` (voir l'en-tête). */
export function withModel(doc, m) {
  const out = structuredClone(isObj(doc) ? doc : {});
  if (m && idOf(m.id)) out.mission_model = {
    id: m.id,
    placed: (Array.isArray(m.placed) ? m.placed : []).filter(x => typeof x === 'string' && x).slice(0, LIMITS.placed)
  };
  else delete out.mission_model;
  return out;
}

/** Une ligne des Lieux sans position (voir l'en-tête ; la règle de « à placer » de editor.js todo). */
export const unplaced = p => !!p && !['dep', 'arr'].includes(p.kind) && !p.poly && !p.ring && (p.lat === '' || p.lon === '');

/** Ce que « Changer de modèle » remplace et garde (voir l'en-tête). */
export function modelChange(places, drawers, prior) {
  const rows = (Array.isArray(places) ? places : []).filter(p => p && p.id && PLACE_KINDS.includes(p.kind)),
    own = new Set(prior?.placed || []);
  return {
    drawers: (Array.isArray(drawers) ? drawers : []).length,
    gone: rows.filter(p => own.has(p.id) && unplaced(p)).map(p => p.id),
    kept: rows.filter(p => own.has(p.id) && !unplaced(p)).map(p => p.id),
    mine: rows.filter(p => !own.has(p.id)).map(p => p.id)
  };
}

/** Les lignes de la séance après un modèle (voir l'en-tête) : les tiroirs remplacés, les lieux du modèle d'avant encore à placer
 *  retirés, ceux du nouveau posés « à placer » avec un identifiant libre (editor.js newPlace) ; les tiroirs citent ces identifiants. */
export function applyModel({
  places,
  base = null,
  prior = null
}, model, lang) {
  const gone = new Set(modelChange(places, [], prior).gone),
    map = new Map();
  let rows = (Array.isArray(places) ? places : []).filter(p => !(p && p.id && gone.has(p.id)));
  for (const p of model?.places || []) {
    const made = ED.newPlace(rows, p.kind, base, null);
    if (!made) continue;
    const r = {
      ...made.rows[made.at],
      name: textIn(p.name, lang).slice(0, LIMITS.name),
      ...(p.kind === 'object' && p.okind ? {
        okind: p.okind
      } : {})
    };
    rows = made.rows.map((x, i) => i === made.at ? r : x);
    map.set(p.id, r.id);
  }
  const list = [];
  for (const d of model?.drawers || []) {
    const blank = DR.blankDrawer(list, base);
    if (!blank) break;
    list.push(drawerFrom(blank, d, rows, lang, k => map.get(k) || ''));
  }
  return {
    places: rows,
    drawers: list,
    placed: [...map.values()].filter(Boolean)
  };
}

/** L'entrée de modèle d'une séance (voir l'en-tête). */
export function modelFromSession({
  id,
  title,
  family,
  drawers,
  places
}) {
  const rows = (Array.isArray(places) ? places : []).filter(p => p && PLACE_KINDS.includes(p.kind) && idOf(p.id, PLACE_KEY)).slice(0,
      LIMITS.places),
    keys = new Set(rows.map(p => p.id)),
    at = v => keys.has(v) ? v : '',
    one = (v, n, multi) => clean(v, n, multi);
  return {
    id,
    type: idOf(family, FAMILY),
    title: one(title, LIMITS.title),
    drawers: (Array.isArray(drawers) ? drawers : []).slice(0, LIMITS.drawers).map(r => {
      const key = DR.KEYS.includes(r.key) ? r.key : 'hand', // une clé gardée telle quelle n'est pas écrite : le geste du pilote seul
        params = paramsOf({
          radius_nm: +r.arrRadius || undefined,
          speed_max_kt: r.arrSpeed === '' ? undefined : +r.arrSpeed,
          require_on_ground: key === 'arrival' ? r.arrGround === true : undefined,
          delay_min: r.delay === '' ? undefined : +r.delay
        }, key),
        fb = r.fallback === '' ? null : num(+r.fallback, 0, B.delayMin, true),
        d = {
          key,
          title: one(r.title, LIMITS.title) || '—'
        };
      if (one(r.message, LIMITS.message, true)) d.message = one(r.message, LIMITS.message, true);
      if (one(r.brief, LIMITS.message, true)) d.brief = one(r.brief, LIMITS.message, true);
      const place = at(key === 'zone' ? r.zone : key === 'object' ? r.object : key === 'time' ? r.point : '');
      if (place) d.place = place;
      if (fb !== null && ['zone', 'object', 'arrival'].includes(key)) d.fallback_min = fb;
      if (Object.keys(params).length) d.params = params;
      const route = (Array.isArray(r.route) ? r.route : []).filter(t => ENDS.has(t) || keys.has(t)).slice(0, LIMITS.route);
      if (route.length) d.route = route;
      return d;
    }),
    places: rows.map(p => ({
      id: p.id,
      kind: p.kind,
      ...(p.kind === 'object' && MS.OBJECT_KINDS.includes(p.okind) ? {
        okind: p.okind
      } : {}),
      ...(one(p.name, LIMITS.name) ? {
        name: one(p.name, LIMITS.name)
      } : {})
    }))
  };
}

/** Le texte YAML du fichier d'un modèle personnel (voir l'en-tête). */
export function modelText(model, Y = globalThis.jsyaml) {
  return Y.dump({
    version: 1,
    models: [model]
  }, {
    lineWidth: 140,
    noRefs: true
  });
}

/** L'identifiant d'un modèle tiré de son nom (voir l'en-tête) : minuscules sans accent, un tiret entre les mots, 40 signes. */
export function slug(title) {
  const s = MS.visible(title).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(
    /^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
  return ID.test(s) ? s : '';
}

/** Le chemin du fichier d'un modèle personnel (voir l'en-tête) : un trigramme de trois lettres et un identifiant à forme fermée. */
export function modelPath(trigram, id) {
  const t = typeof trigram === 'string' ? trigram.trim().toUpperCase() : '';
  return /^[A-Z]{3}$/.test(t) && idOf(id) ? `pilot/${t}/modeles/${id}.yaml` : null;
}
