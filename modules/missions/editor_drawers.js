// V3 missions — les tiroirs dans l'atelier (SOG-0445, lot P3), le calcul pur : une partie du fichier (`phases`) lue en champs pour la
// fiche d'un tiroir, et réécrite. Ni page, ni stockage, ni réseau. Le fichier lu est une entrée non fiable (docs/technique/
// FORMAT_MISSION.md § 5) : textes bornés, nombres bornés jamais ramenés dans leurs bornes (un nombre hors bornes n'est pas écrit), un
// identifiant n'est jamais une clé d'objet. Règle des with… de editor.js (audit 182) : seul ce que l'auteur a changé est écrit ; une
// partie inchangée reste l'objet du fichier ; rien de changé, rien d'écrit — withDrawerRows rend alors une COPIE de contenu identique
// (un structuredClone), jamais l'objet reçu : la règle se juge au contenu (Sécurisation, relecture du 17 nov. 2026).
// Les caractères de format invisibles qui trompent l'œil (contrôles de sens d'écriture, espaces de largeur nulle, marque d'ordre) sont
// retirés de ce que l'atelier lit dans ses lignes et de ce qu'il écrit — par `visible` du lecteur (frame/lib/mission.js), la seule
// liste ; un texte du fichier que l'auteur ne touche pas reste tel quel.
//
// Le format (FORMAT_MISSION.md § 2, § 3 ; décision du 17 nov. 2026 sur Q-0095) : un tiroir CITE une zone ou un objet de la mission par
// son identifiant — l'atelier n'écrit jamais une zone ou un objet dans la partie. Les parties que le lecteur refuse (identifiant hors
// de B à M, doublon, valeur nue, au-delà de douze) ne sont pas des lignes : elles restent à leur place, telles quelles.
//
// API :
//   KEYS : les clés que l'atelier édite — hand (le geste du pilote seul), time (l'heure : un point et un délai), zone (une zone de
//     passage), object (un objet à trouver), arrival (l'arrivée au terrain).
//   TYPES : ce que le choix du type propose (SOG-0467 : « ＋ Tiroir » et la clé d'un tiroir, LE MÊME choix) — [{ key, judged }] dans
//     l'ordre, une liste à allonger (le catalogue de briques y viendra) ; `judged` faux : une sorte que le vol ne juge pas encore (l'écran
//     dit « s'ouvre au geste ou à l'heure de repli »). Aujourd'hui les cinq clés que l'atelier sait ÉCRIRE, toutes jugées en vol.
//   keyed(row, key, places) → la ligne avec la clé choisie et ce qu'une clé neuve devine : la première zone, le premier objet des
//     lieux, l'arrivée au terrain d'arrivée (1 NM, 30 kt, posé), l'heure après le décollage.
//   drawerRowsOf(doc) → [{ i (la place dans `phases`, -1 pour une ligne ajoutée), id (B à M, donné, jamais saisi), title, said (la clé
//     dite en clair, `trigger`), message, brief, key (une de KEYS, ou 'kept'), keptWhy, point, delay, zone, shown, object, arrPoint,
//     arrRadius, arrSpeed, arrGround, stops [identifiants], fallback, route [identifiants] }] — les nombres en texte, pour les champs.
//     key 'kept' : une clé que l'atelier n'édite pas encore, MONTRÉE et GARDÉE telle quelle — keptWhy : 'several' (plusieurs clés
//     écrites), 'inPart' (une zone ou un objet écrits dans la partie), 'actor' (une cible franchit la zone), 'condition' (une condition
//     de la version 1.1 de l'atelier), 'escort' (une arrivée après un suivi). Choisir une autre clé la remplace (withKey).
//   withKey(row, key) → la ligne avec une autre clé : les champs de l'ancienne vidés ; l'heure de repli tombe pour une clé qui ne
//     regarde pas l'avion (hand, time).
//   blankDrawer(rows, base) → une ligne neuve (son identifiant : nextDrawerId) ; null au-delà de douze.
//   nextDrawerId(rows, base) → la première lettre de B à M que ni les lignes ni le fichier ne portent (un tiroir retiré dans la séance
//     garde sa lettre jusqu'à l'enregistrement : les carnets des pilotes la citent) ; à défaut la première que les lignes ne portent pas.
//   withDrawerRows(doc, rows) → un NOUVEAU document : les parties gardées dans l'ordre du fichier (une ligne retirée : sa partie part ;
//     les rangs se resserrent, les identifiants restent), les lignes ajoutées à la fin ; douze tiroirs au plus.
//   drawersTodo(doc) → [{ key, name (le rang) }] : ce qu'un tiroir a « à compléter », jamais bloquant — noMessage, noBrief, noFallback
//     (une clé qui regarde l'avion sans heure de repli), keyUnread (une clé que le lecteur ne sait pas lire : le tiroir ne s'ouvre
//     qu'à la main), routeUnknown (sa suite de route cite un lieu absent).
import * as MS from '../../frame/lib/mission.js';

const B = MS.DRAWER_BOUNDS;
export const KEYS = Object.freeze(['hand', 'time', 'zone', 'object', 'arrival']);
/** Les sortes que le choix du type propose (voir l'en-tête) : les clés que l'atelier sait écrire, dans l'ordre de KEYS. */
export const TYPES = Object.freeze(KEYS.map(key => Object.freeze({
  key,
  judged: true
})));
/** Les clés qui regardent l'avion : elles ont une heure de repli. */
const LIVE = new Set(['zone', 'object', 'arrival', 'kept']);
/** Les champs du fichier qui portent une clé. */
const KEY_FIELDS = ['trigger_zone', 'zone_shown', 'trigger_actor', 'trigger_object', 'trigger_condition', 'trigger_point',
  'trigger_delay_min'
];

/** Un texte d'une ligne, sans caractère invisible, borné. */
const cut = (v, n) => MS.visible(v).replace(/\s+/g, ' ').trim().slice(0, n);
/** Un texte de plusieurs lignes (le message, le briefing), comme le lecteur le lit : ses sauts de ligne gardés, borné. */
const lines = (v, n) => typeof v === 'string' || typeof v === 'number' ? MS.visible(v).replace(/\r\n?/g, '\n').replace(
    /[ \t]+\n/g, '\n').trim()
  .slice(0, n) : '';
/** Un objet du fichier (ni liste, ni valeur nue). */
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
/** Une valeur écrite (ni absente, ni vide). */
const has = v => v !== undefined && v !== null && v !== '';
/** Un identifiant ou un nombre écrit nu (jamais un objet). */
const scalar = v => typeof v === 'string' || typeof v === 'number';
/** Un nombre lu du fichier, en texte pour un champ ('' sinon ; un texte blanc n'est pas zéro). */
const numText = v => has(v) && scalar(v) && String(v).trim() !== '' && Number.isFinite(+v) ? String(+v) : '';
/** Un nombre saisi dans [lo, hi] ; null sinon (jamais ramené dans les bornes). */
const within = (v, lo, hi) => /^\s*-?\d+(\.\d+)?\s*$/.test(String(v ?? '')) && +v >= lo && +v <= hi ? +v : null;
/** Oui ou non écrit dans le fichier, comme le lecteur le lit. */
const yes = (v, dflt) => !has(v) ? dflt : !(v === false || v === 0 || /^(false|no|non|0)$/i.test(String(v).trim()));
/** Le mot d'une route : un identifiant nu, ou celui d'un objet { id } ; '' sinon. */
const token = x => scalar(x) ? cut(x, 60) : isObj(x) && scalar(x.id) ? cut(x.id, 60) : '';
/** Les mots d'une liste de route du fichier (bornée). */
const tokens = (v, max) => (Array.isArray(v) ? v : []).slice(0, max).map(token).filter(Boolean);
/** Les parties du fichier, comme le lecteur les lit : une liste, ou un objet seul. */
const phasesOf = d => Array.isArray(d.phases) ? d.phases : isObj(d.phases) ? [d.phases] : [];

/** La clé d'une partie, en champs (voir l'en-tête). */
function keyOf(p) {
  const f = {
      key: 'hand',
      keptWhy: '',
      point: '',
      delay: numText(p.trigger_delay_min),
      zone: '',
      shown: false, // SOG-0459 : une zone de passage est cachée au pilote sauf écrit autrement
      object: '',
      arrPoint: '',
      arrRadius: '',
      arrSpeed: '',
      arrGround: false,
      stops: []
    },
    written = ['trigger_zone', 'trigger_object', 'trigger_condition', 'trigger_point'].filter(k => has(p[k])),
    kept = why => ({
      ...f,
      key: 'kept',
      keptWhy: why
    });
  if (written.length > 1) return kept('several');
  if (written[0] === 'trigger_zone') return !scalar(p.trigger_zone) ? kept('inPart') : has(p.trigger_actor) ? kept('actor') : {
    ...f,
    key: 'zone',
    zone: cut(p.trigger_zone, 40),
    shown: p.zone_shown === true // SOG-0459 : montrée seulement quand le fichier écrit le booléen
  };
  if (written[0] === 'trigger_object') return scalar(p.trigger_object) ? {
    ...f,
    key: 'object',
    object: cut(p.trigger_object, 40)
  } : kept('inPart');
  if (written[0] === 'trigger_condition') {
    const c = p.trigger_condition;
    if (!isObj(c) || cut(c.kind, 24).toLowerCase() !== 'arrival' || has(c.point) && !scalar(c.point)) return kept('condition');
    if (has(c.escort_min_sec) && +c.escort_min_sec !== 0) return kept('escort');
    return {
      ...f,
      key: 'arrival',
      arrPoint: cut(c.point, 40),
      arrRadius: numText(c.radius_nm),
      arrSpeed: numText(c.speed_max_kt),
      arrGround: yes(c.require_on_ground, false),
      stops: tokens(c.required_points, B.required)
    };
  }
  if (written[0] === 'trigger_point') return scalar(p.trigger_point) ? {
    ...f,
    key: 'time',
    point: cut(p.trigger_point, 40)
  } : kept('inPart');
  return f;
}

/** Les tiroirs d'une mission, en lignes (voir l'en-tête). */
export function drawerRowsOf(doc) {
  const d = isObj(doc) ? doc : {},
    all = phasesOf(d);
  return MS.drawerSlots(d).map(({
    i,
    id
  }) => {
    const p = all[i];
    return {
      i,
      id,
      title: cut(p.title, B.title),
      said: cut(p.trigger, B.trigger),
      message: lines(p.message, B.message),
      brief: lines(p.brief, B.brief),
      ...keyOf(p),
      fallback: numText(p.fallback_delay_min),
      route: tokens(p.route_order, B.route)
    };
  });
}

/** La ligne avec une autre clé (voir l'en-tête). */
export function withKey(row, key) {
  const r = isObj(row) ? row : {},
    k = KEYS.includes(key) ? key : 'hand';
  return {
    ...r,
    key: k,
    keptWhy: '',
    point: '',
    delay: '',
    zone: '',
    shown: false,
    object: '',
    arrPoint: '',
    arrRadius: '',
    arrSpeed: '',
    arrGround: false,
    stops: [],
    fallback: LIVE.has(k) ? String(r.fallback ?? '') : ''
  };
}

/** La ligne avec la clé choisie et ce qu'elle devine (voir l'en-tête) ; `places` : les lignes des Lieux de la séance. */
export function keyed(row, key, places = []) {
  const first = kind => (Array.isArray(places) ? places : []).find(p => p && p.id && p.kind === kind)?.id || '';
  return {
    ...withKey(row, key),
    ...(key === 'zone' ? {
      zone: first('zone')
    } : key === 'object' ? {
      object: first('object')
    } : key === 'arrival' ? {
      arrPoint: 'DESTINATION',
      arrRadius: '1',
      arrSpeed: '30',
      arrGround: true
    } : key === 'time' ? {
      point: 'ORIGIN'
    } : {})
  };
}

/** Un identifiant libre pour un tiroir neuf (voir l'en-tête) ; '' quand les douze sont pris. */
export function nextDrawerId(rows, base = null) {
  const mine = new Set((Array.isArray(rows) ? rows : []).map(r => String(r?.id ?? '').toUpperCase())),
    file = new Set(MS.drawerSlots(isObj(base) ? base : {}).map(x => x.id));
  return MS.DRAWER_IDS.find(x => !mine.has(x) && !file.has(x)) || MS.DRAWER_IDS.find(x => !mine.has(x)) || '';
}

/** Une ligne neuve : le geste du pilote seul, rien d'écrit ; null au-delà de douze tiroirs. */
export function blankDrawer(rows, base = null) {
  const id = nextDrawerId(rows, base);
  return id && (Array.isArray(rows) ? rows : []).length < MS.DRAWER_IDS.length ? withKey({
    i: -1,
    id,
    title: '',
    said: '',
    message: '',
    brief: '',
    fallback: '',
    route: []
  }, 'hand') : null;
}

/** Pose ou retire un texte borné dans une partie. */
function putText(o, k, v, n, multi = false) {
  const x = multi ? lines(v, n) : cut(v, n);
  if (x) o[k] = x;
  else delete o[k];
}

/** Pose un nombre saisi dans ses bornes, ou retire le champ (un nombre hors bornes n'est jamais écrit, ni ramené dans ses bornes). */
function putNumber(o, k, v, lo, hi, whole = false) {
  const n = within(v, lo, hi);
  if (n === null || whole && !Number.isInteger(n)) delete o[k];
  else o[k] = n;
}

/** Une liste de route réécrite depuis ses mots : un mot gardé reprend l'entrée du fichier (un objet { id, … } garde ses autres clés). */
function routeFrom(words, before, max) {
  const pool = (Array.isArray(before) ? before : []).map(x => ({
    x,
    t: token(x),
    used: false
  }));
  return (Array.isArray(words) ? words : []).map(w => cut(w, 60)).filter(Boolean).slice(0, max).map(w => {
    const hit = pool.find(e => !e.used && e.t === w);
    if (hit) hit.used = true;
    return hit ? hit.x : w;
  });
}

/** Les champs de la clé d'une ligne, écrits dans une partie : `diff` — les champs changés (tous pour une clé neuve). */
function putKey(o, r, diff) {
  const ch = f => diff.includes(f);
  if (r.key === 'time') {
    if (ch('point')) putText(o, 'trigger_point', r.point, 40);
    if (ch('delay')) putNumber(o, 'trigger_delay_min', r.delay, 0, B.delayMin);
  } else if (r.key === 'zone') {
    if (ch('zone')) putText(o, 'trigger_zone', r.zone, 40);
    // SOG-0459 : cochée → `zone_shown: true` ; décochée → la clé n'est pas écrite (cachée, le défaut)
    if (ch('shown')) {
      if (r.shown === true) o.zone_shown = true;
      else delete o.zone_shown;
    }
  } else if (r.key === 'object') {
    if (ch('object')) putText(o, 'trigger_object', r.object, 40);
  } else if (r.key === 'arrival') {
    const c = {
      ...(isObj(o.trigger_condition) ? o.trigger_condition : {}),
      kind: 'arrival'
    };
    if (ch('arrPoint')) putText(c, 'point', r.arrPoint, 40);
    if (ch('arrRadius')) putNumber(c, 'radius_nm', r.arrRadius, Number.MIN_VALUE, B.rangeNm);
    if (ch('arrSpeed')) putNumber(c, 'speed_max_kt', r.arrSpeed, 0, B.speedKt);
    if (ch('arrGround')) c.require_on_ground = r.arrGround === true;
    if (ch('stops')) {
      const stops = routeFrom(r.stops, c.required_points, B.required);
      if (stops.length) c.required_points = stops;
      else delete c.required_points;
    }
    o.trigger_condition = c;
  }
}

/** Les champs d'une ligne qui se comparent (une liste par sa forme écrite). */
const FIELDS = ['title', 'said', 'message', 'brief', 'key', 'point', 'delay', 'zone', 'shown', 'object', 'arrPoint', 'arrRadius',
  'arrSpeed',
  'arrGround', 'stops', 'fallback', 'route'
];
const KEY_OF = ['point', 'delay', 'zone', 'shown', 'object', 'arrPoint', 'arrRadius', 'arrSpeed', 'arrGround', 'stops'];
const text = v => Array.isArray(v) ? JSON.stringify(v.map(x => String(x ?? ''))) : String(v ?? '');

/** Le document avec ses tiroirs retouchés (voir l'en-tête). */
export function withDrawerRows(doc, rows) {
  const out = structuredClone(isObj(doc) ? doc : {}),
    prev = drawerRowsOf(doc),
    list = (Array.isArray(rows) ? rows : []).filter(isObj);
  // audit 182 : rien de changé, rien de réécrit
  if (JSON.stringify(list) === JSON.stringify(prev)) return out;
  const before = phasesOf(out),
    slots = new Set(prev.map(p => p.i)),
    byI = new Map(list.filter(r => Number.isInteger(r.i) && slots.has(r.i)).map(r => [r.i, r])),
    edit = (o, r, was) => {
      const diff = was ? FIELDS.filter(f => text(r[f]) !== text(was[f])) : FIELDS;
      if (!diff.length) return null;
      if (diff.includes('title')) putText(o, 'title', r.title, B.title);
      if (diff.includes('said')) putText(o, 'trigger', r.said, B.trigger);
      if (diff.includes('message')) putText(o, 'message', r.message, B.message, true);
      if (diff.includes('brief')) putText(o, 'brief', r.brief, B.brief, true);
      // une autre clé : les champs de l'ancienne partent tous, ceux de la nouvelle s'écrivent tous ; la même clé : ses champs changés
      if (diff.includes('key') && KEYS.includes(r.key)) {
        for (const k of KEY_FIELDS) delete o[k];
        putKey(o, r, KEY_OF);
      } else if (r.key !== 'kept') putKey(o, r, diff);
      // l'heure de repli saisie s'écrit quelle que soit la clé (withKey la vide pour une clé qui ne regarde pas l'avion)
      if (diff.includes('fallback')) putNumber(o, 'fallback_delay_min', r.fallback, 0, B.delayMin, true);
      if (diff.includes('route')) {
        const route = routeFrom(r.route, o.route_order, B.route);
        if (route.length) o.route_order = route;
        else delete o.route_order;
      }
      return o;
    },
    kept = [];
  let count = 0;
  before.forEach((p, i) => {
    // une partie que le lecteur refuse n'est pas un tiroir : elle reste à sa place
    if (!slots.has(i)) return kept.push(p);
    const r = byI.get(i);
    if (!r) return; // la ligne retirée : sa partie part
    count += 1;
    kept.push(edit({
      ...p
    }, r, prev.find(x => x.i === i)) || p);
  });
  const taken = new Set(prev.filter(p => byI.has(p.i)).map(p => p.id));
  for (const r of list) {
    if (Number.isInteger(r.i) && slots.has(r.i)) continue;
    const id = String(r.id ?? '').toUpperCase();
    // une ligne neuve : son identifiant est une lettre libre de B à M ; au-delà de douze, rien
    if (count >= MS.DRAWER_IDS.length || !MS.DRAWER_IDS.includes(id) || taken.has(id)) continue;
    taken.add(id);
    count += 1;
    kept.push(edit({
      id
    }, r, null) || {
      id
    });
  }
  if (kept.length) out.phases = kept;
  else delete out.phases;
  return out;
}

/** Ce qu'un tiroir a « à compléter » (voir l'en-tête) : lu par le lecteur que l'écran du pilote emploie. */
export function drawersTodo(doc) {
  const d = isObj(doc) ? doc : {},
    out = [];
  let m = null;
  try {
    m = MS.readMission(d);
  } catch {
    return out; // un fichier que le lecteur ne lit pas : rien à dire ici (l'ouverture l'a déjà refusé)
  }
  for (const x of m?.drawers || []) {
    const name = String(x.rank),
      add = key => out.push({
        key,
        name
      });
    if (x.keyWhy && x.keyWhy !== 'several') add('keyUnread');
    else if (['zone', 'object', 'arrival', 'condition'].includes(x.key.kind) && x.key.fallbackMin === null) add('noFallback');
    if (!x.message) add('noMessage');
    if (!x.brief) add('noBrief');
    if (x.routeUnknown) add('routeUnknown');
  }
  return out;
}
