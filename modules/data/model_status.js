// V3 data — le calcul pur de l'état par zone (SPEC § 5.9, V3_SPECIFICATION § 10.44, SOG-0071 temps 2) : la lecture fermée de la réponse du verbe base/status (frame/aerodb/INTEGRATION.md « The state per zone »), le plan de « Mettre à jour » et la teinte
// d'une zone d'après son état. Rien n'est dessiné ici et rien n'est demandé : le lanceur répond, la page lit et traduit les codes (texts.js). Tout ce que le lanceur dit est lu comme une entrée non fiable : listes fermées, textes courts, nombres bornés.

/** Les états d'une zone que le lanceur donne ; « en cours » (building) est celui de la page, jamais celui du lanceur. */
export const ZONE_STATES = Object.freeze(['up-to-date', 'stale', 'never-built', 'failed']);
/** Les codes de raison que la page sait dire (frame/aerodb/INTEGRATION.md) ; un code inconnu est gardé sous `unknown` (la zone reste signalée, sa raison est dite sans détail). */
/** Les avis (information qui ne rend pas la zone périmée) que la page sait dire. */
export const NOTICE_CODES = Object.freeze(['no-points']);
export const REASON_CODES = Object.freeze(['never-built', 'failed', 'pickup-waiting', 'source-newer', 'inputs-changed', 'parser-old',
  'files-missing', 'source-old', 'index-orphan', 'source-unbuilt', 'source-unread', 'source-missing', 'personal-undeclared'
]);
/** Les raisons qui attendent un geste de l'utilisateur sur un FICHIER (le prendre dans Téléchargements, le choisir) : seules elles donnent « Prendre le fichier téléchargé » et « Choisir le fichier… » sur la ligne de la zone. */
export const HAND_CODES = Object.freeze(['pickup-waiting', 'source-missing', 'source-old']);
/** Les raisons qui attendent la coche « Je certifie utiliser les données pour mon usage personnel » : la source est là (ou déclarée) mais la page ne la déclare pas au lanceur. Aucun fichier à donner. */
export const PERSONAL_CODES = Object.freeze(['personal-undeclared', 'source-unread']);
/** Une raison de la main de l'utilisateur sur un fichier ? */
export const isHandReason = r => HAND_CODES.includes(r?.code);
/** Une raison qui attend la coche d'usage personnel ? */
export const isPersonalReason = r => PERSONAL_CODES.includes(r?.code);
/** Ce qu'attend une zone qu'aucune construction ne traite : 'hand' (un fichier à prendre ou à choisir), 'personal' (la coche d'usage personnel), null (rien de reconnu : un code du lanceur que la page ne connaît pas). */
export function waitKind(z) {
  const rs = Array.isArray(z?.reasons) ? z.reasons : [];
  return rs.some(isHandReason) ? 'hand' : rs.some(isPersonalReason) ? 'personal' : null;
}
const ID = /^[a-z0-9]{2,8}$/;
const DAY = /^\d{4}-\d{2}-\d{2}/;
/** Un texte court sans caractère de commande ; '' sinon. */
const text = (v, n = 40) => typeof v === 'string' ? v.replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ').trim().slice(0, n) : '';
/** Une date « AAAA-MM-JJ », sinon ''. */
const day = v => typeof v === 'string' && DAY.test(v) ? v.slice(0, 10) : '';
/** Un entier fini et borné, sinon null. */
const int = v => Number.isFinite(v) ? Math.max(0, Math.min(Math.trunc(v), 1e9)) : null;
/** Une raison lue : { code, source, set, cycle, built, current, count, names, zip, error } — seulement les paramètres lus de la forme permise (les dates en « AAAA-MM-JJ », les versions et les comptes en entiers). */
function reasonOf(r) {
  const code = typeof r?.code === 'string' && (REASON_CODES.includes(r.code) || NOTICE_CODES.includes(r.code)) ? r.code : 'unknown',
    isParser = code === 'parser-old',
    num = v => int(v);
  return {
    code,
    raw: typeof r?.code === 'string' ? r.code.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40) :
    '', // le code tel que le lanceur le donne, borné : dit quand la page ne le connaît pas
    why: text(r?.why, 20),
    source: text(r?.source, 20),
    set: text(r?.set, 20),
    cycle: day(r?.cycle),
    built: isParser ? num(r?.built) : day(r?.built),
    current: isParser ? num(r?.current) : day(r?.current),
    count: num(r?.count),
    names: (Array.isArray(r?.names) ? r.names : []).slice(0, 3).map(n => text(n, 60)).filter(Boolean),
    zip: text(r?.zip, 100),
    error: text(r?.error, 60)
  };
}
/** Le champ `download` d'une zone de base/status (AeroDB, 10 nov. 2026) : { done, cycle, at } ; `done` : chaque source téléchargeable de la zone a un fichier écrit depuis le début du cycle en vigueur. null quand le lanceur ne le dit pas (un ancien lanceur : la zone est alors à télécharger). */
function downloadOf(d) {
  if (d === null || typeof d !== 'object' || typeof d.done !== 'boolean') return null;
  return {
    done: d.done,
    sources: d.sources !== null && typeof d.sources === 'object' && !Array.isArray(d.sources) ? Math.min(Object.keys(d.sources).length,
      99) : null, // le nombre de sources que base/fetch télécharge pour cette zone (0 : rien à télécharger)
    cycle: day(d.cycle),
    at: typeof d.at === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(d.at) ? d.at.slice(0, 30) : null,
    list: sourceList(d.sources) // chaque source téléchargée du pays : { présente, date } (la fiche du pays, SOG-0262)
  };
}
/** Les sources téléchargées d'une zone (`download.sources` : { id: { present, at } }), douze au plus : { id: { present, at } } ; {} sans. */
function sourceList(o) {
  const out = {};
  if (o === null || typeof o !== 'object' || Array.isArray(o)) return out;
  for (const [id, v] of Object.entries(o).slice(0, 12)) {
    if (!/^[a-z0-9_]{2,24}$/.test(id) || v === null || typeof v !== 'object') continue;
    out[id] = {
      present: v.present === true,
      at: typeof v.at === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v.at) ? v.at.slice(0, 30) : null
    };
  }
  return out;
}
/** La publication d'une zone (base/status `publish`, SOG-0258) : { state: 'published' | 'unpublished' | 'unknown', at } ; null quand le lanceur ne la dit pas (pas de construction validée). */
function publishOf(p) {
  if (p === null || typeof p !== 'object' || !['published', 'unpublished', 'unknown'].includes(p.state)) return null;
  return {
    state: p.state,
    at: typeof p.at === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(p.at) ? p.at.slice(0, 30) : null
  };
}
/** Les gains d'un pays à jour (base/status, SOG-0568 ; tools/base_gains.py) : { redo: [gain], update: [gain] } ; `redo` : ce qu'une RELECTURE (sans téléchargement) apporterait, `update` : ce qu'une MISE À JOUR (une page à télécharger)
 *  apporterait ; un gain : { id, kind ('absent' | 'better'), label ([fr, en, de, es] : une phrase entière chacune), source ('' sauf pour une pièce à télécharger) }. Lu comme une entrée non fiable : listes bornées, textes courts, jamais d'exception. */
function gainsOf(g) {
  const one = list => (Array.isArray(list) ? list : []).slice(0, 12).map(x => ({
    id: text(x?.id, 40),
    kind: x?.kind === 'absent' ? 'absent' : 'better',
    label: Array.isArray(x?.label) && x.label.length === 4 && x.label.every(l => typeof l === 'string') ? x.label.map(l => text(l,
      160)) : null,
    source: text(x?.source, 20)
  })).filter(x => x.id && x.label && x.label.every(Boolean));
  return {
    redo: one(g?.redo),
    update: one(g?.update)
  };
}
/** Ce qu'un pays À JOUR peut encore recevoir : 'redo' (une relecture : le lecteur de la suite lirait mieux ce que le poste détient), 'update' (une pièce à télécharger, sans relecture), null (rien, ou le pays n'est pas à jour). */
export const gainLevel = z => z?.state === 'up-to-date' && z.gains ? z.gains.redo.length ? 'redo' : z.gains.update.length ? 'update' :
  null : null;
/** Les pays à relire : ceux de `ids` à jour dont une relecture apporterait quelque chose. */
export const rereadIds = (status, ids) => (ids || []).filter(id => Object.hasOwn(status?.zones || {}, id) && status.zones[id].gains?.redo
  .length > 0 && status.zones[id].state === 'up-to-date');
/** L'état d'une zone lu (celui de base/status, ou le `state` de la vue par zone de base/cycle : ses raisons peuvent y être de simples codes) : { state, reasons, notices, buildable, builtCycle, expectedCycle, builtAt, publish, download } ; null si l'état est hors règle. */
export function zoneStateOf(z) {
  if (z === null || typeof z !== 'object' || !ZONE_STATES.includes(z.state)) return null;
  const rs = x => typeof x === 'string' ? {
    code: x
  } : x;
  return {
    state: z.state,
    reasons: (Array.isArray(z.reasons) ? z.reasons : []).slice(0, 8).map(x => reasonOf(rs(x))),
    notices: (Array.isArray(z.notices) ? z.notices : []).map(rs).filter(n => NOTICE_CODES.includes(n?.code)).slice(0, 4).map(reasonOf),
    buildable: z.buildable === true,
    builtCycle: day(z.builtCycle),
    expectedCycle: day(z.expectedCycle),
    parserVersion: int(z
      .parserVersion), // la version d'analyseur avec laquelle la zone a été construite sur ce poste (SOG-0510) ; null sans
    builtAt: typeof z.builtAt === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(z.builtAt) ? z.builtAt.slice(0, 30) : null,
    publish: publishOf(z.publish),
    download: downloadOf(z.download),
    gains: gainsOf(z.gains),
    datedBy: z.datedBy === 'file' ? 'file' :
    null, // la zone est construite sur un dépôt à la main, sans édition (SOG-0368 ; AeroDB 1e8ac887f) : la liste des pays le sait sans ouvrir la fiche
    deposited: day(z.deposited)
  };
}
/** La réponse de base/status lue : { current, parserVersion, zones: { id: { state, reasons: [raison], buildable, builtCycle, expectedCycle } } } ; null si ce n'est pas une réponse lisible (échec, refus, forme inattendue). Une zone dont l'identifiant ou l'état est hors règle est écartée. */
export function statusOf(final) {
  const r = final?.state === 'done' && final.result !== null && typeof final.result === 'object' ? final.result : null;
  if (!r || r.ok === false || r.zones === null || typeof r.zones !== 'object' || Array.isArray(r.zones)) return null;
  const zones = {};
  for (const [id, z] of Object.entries(r.zones).slice(0, 300)) {
    const one = ID.test(id) ? zoneStateOf(z) : null;
    if (one) zones[id] = one;
  }
  return {
    current: day(r.current),
    parserVersion: int(r.parserVersion),
    zones
  };
}
/** Une raison lue, remise sous la forme que le lanceur la dit (celle que reasonOf relit) : le code inconnu est rendu tel que le lanceur l'avait donné. */
const reasonRaw = r => ({
  code: r.code === 'unknown' ? r.raw : r.code,
  why: r.why,
  source: r.source,
  set: r.set,
  cycle: r.cycle,
  built: r.built,
  current: r.current,
  count: r.count,
  names: r.names,
  zip: r.zip,
  error: r.error
});
/** Un état lu (statusOf) sous la forme qui sera écrite sur l'appareil : { current, parserVersion, zones } avec chaque zone sous la forme du lanceur, cent zones au plus ; `key` : le texte des zones seules (sert à ne pas réécrire la même lecture). */
export function persistable(st) {
  const zones = {};
  for (const [id, z] of Object.entries(st?.zones || {}).slice(0, 100)) zones[id] = {
    state: z.state,
    reasons: z.reasons.map(reasonRaw),
    notices: z.notices.map(reasonRaw),
    buildable: z.buildable,
    builtCycle: z.builtCycle,
    expectedCycle: z.expectedCycle,
    parserVersion: z.parserVersion,
    builtAt: z.builtAt,
    publish: z.publish,
    download: z.download ? {
      done: z.download.done,
      cycle: z.download.cycle,
      at: z.download.at,
      sources: z.download.list
    } : null,
    datedBy: z.datedBy,
    deposited: z.deposited,
    gains: z.gains
  };
  return {
    current: st?.current || '',
    parserVersion: st?.parserVersion ?? null,
    zones,
    key: JSON.stringify(zones)
  };
}
/** Le dernier état gardé sur l'appareil (cache/data/status-last.json), lu comme une entrée NON FIABLE : le même lecteur que la réponse du lanceur (statusOf : listes fermées, textes courts, nombres bornés), cent zones au plus ; { status, at (ms) } ; null pour un fichier illisible, vide ou sans date, comme s'il n'existait pas. */
export function lastStatusOf(file) {
  if (file === null || typeof file !== 'object' || Array.isArray(file)) return null;
  const zs = file.zones;
  if (zs === null || typeof zs !== 'object' || Array.isArray(zs)) return null;
  const status = statusOf({
    state: 'done',
    result: {
      ok: true,
      current: file.current,
      parserVersion: file.parserVersion,
      zones: Object.fromEntries(Object.entries(zs).slice(0, 100))
    }
  });
  if (!status || !Object.keys(status.zones).length || !Number.isFinite(file.at)) return null;
  return {
    status,
    at: Math.max(0, Math.min(Math.trunc(file.at), 8.64e15))
  };
}
/** L'état dessiné d'une zone : 'building' (la page la traite), l'état du lanceur, ou null sans état connu. */
export function drawnState(status, id, running) {
  if (running) return 'building';
  return Object.hasOwn(status?.zones || {}, id) ? status.zones[id].state : null;
}
/** La teinte de la carte pour un état dessiné : trois états lisibles sans légende — vert (à jour), ambre (à faire : reconstruire, fichier ou coche attendus, jamais construite), rouge (en échec) — et le bleu d'une zone que la page traite. */
export const STATE_TONE = Object.freeze({
  'up-to-date': 'ok',
  stale: 'warn',
  'never-built': 'warn',
  failed: 'err',
  building: 'accent'
});
/** Le plan de « Mettre à jour » sur une sélection d'après l'état : { build: [{ zone, reasons }] (pas à jour ET constructibles), waiting: [{ zone, reasons }] (pas à jour mais en attente d'un fichier : rien à construire), personal: [{ zone, reasons }] (en attente de la coche d'usage personnel), upToDate, unknown (sans état) }. */
export function updatePlan(status, ids) {
  const build = [],
    waiting = [],
    personal = [];
  let upToDate = 0,
    unknown = 0;
  for (const zone of ids || []) {
    const z = Object.hasOwn(status?.zones || {}, zone) ? status.zones[zone] : null;
    if (!z) unknown++;
    else if (z.state === 'up-to-date') upToDate++;
    else(z.buildable ? build : waitKind(z) === 'personal' ? personal : waiting).push({
      zone,
      reasons: z.reasons
    });
  }
  return {
    build,
    waiting,
    personal,
    upToDate,
    unknown
  };
}
/** Ce que « Mettre à jour » fait d'une sélection d'après l'état lu AVANT de rien télécharger (SOG-0180) : { upToDate: [ids] sautées, fetch: [ids] à télécharger, build: [ids] à reconstruire (celles à télécharger en font partie, les zones qui attendent un fichier non), waiting: [ids] qui attendent un fichier déposé à la main, personal: [ids] qui attendent la coche d'usage personnel (rien à télécharger), unknown }.
 *  Une zone dont les sources du cycle sont déjà là (`download.done`) n'est pas téléchargée de nouveau : sa construction seule ; une zone dont le lanceur ne dit rien du téléchargement est téléchargée. */
export function downloadPlan(status, ids) {
  const out = {
    upToDate: [],
    fetch: [],
    build: [],
    waiting: [],
    personal: [],
    unknown: []
  };
  for (const id of ids || []) {
    const z = Object.hasOwn(status?.zones || {}, id) ? status.zones[id] : null;
    if (!z) {
      out.unknown.push(id);
      out.fetch.push(id);
    } else if (z.state === 'up-to-date') out.upToDate.push(id);
    else if (z.reasons.some(r => r.code === 'pickup-waiting' || (r.source === 'aimbe' && !z.buildable && isHandReason(r)))) out.waiting
      .push(
        id
      ); // l'ENR 3.2 de Belgique manque ou est périmée (source-missing, source-old) : un fichier à déposer, rien à télécharger (SOG-0541)
    else if (!z.buildable && waitKind(z) === 'personal') out.personal.push(
      id); // la coche d'usage personnel manque : rien à télécharger, rien à construire
    else if (z.download && (z.download.done || z.download.sources === 0))(z.buildable ? out.build : out.waiting).push(
      id); // les sources du cycle sont là : la construction seule, ou, si elle n'est pas possible, un fichier à déposer
    else {
      out.fetch.push(id);
      out.build.push(id);
    }
  }
  return out;
}
/** Les zones à reconstruire regroupées par première raison : [{ code, zones: [ids], reason (la première raison du premier de ses zones) }], dans l'ordre d'apparition ; sert à dire « 45 zones : parseur changé » plutôt que quarante-cinq lignes. */
export function groupReasons(items) {
  const groups = [];
  for (const it of items || []) {
    const r = it.reasons[0] || {
      code: 'unknown'
    };
    let g = groups.find(x => x.code === r.code);
    if (!g) groups.push(g = {
      code: r.code,
      zones: [],
      reason: r
    });
    g.zones.push(it.zone);
  }
  return groups;
}
/** Le bilan d'une liste de zones d'après l'état du lanceur (SOG-0180) : { upToDate, rebuild, failed, waiting, personal, unknown } en listes d'identifiants. `waiting` : pas à jour, pas constructible, et un FICHIER que seul l'utilisateur donne
 *  (prendre, choisir) ; `personal` : pas constructible faute de la coche d'usage personnel (aucun fichier à donner) ; `rebuild` : pas à jour et constructible ; `failed` : la dernière construction a échoué ;
 *  `unknown` : sans état du lanceur, ou pas constructible pour une raison que la page ne reconnaît pas (jamais cachée, jamais dite « fichier »). */
export function balanceOf(status, ids) {
  const out = {
    upToDate: [],
    rebuild: [],
    failed: [],
    waiting: [],
    personal: [],
    unknown: []
  };
  for (const id of ids || []) {
    const z = Object.hasOwn(status?.zones || {}, id) ? status.zones[id] : null;
    if (!z) out.unknown.push(id);
    else if (z.state === 'up-to-date') out.upToDate.push(id);
    else if (z.state === 'failed') out.failed.push(id);
    else if (z.buildable) out.rebuild.push(id);
    else {
      const k = waitKind(z);
      out[k === 'hand' ? 'waiting' : k === 'personal' ? 'personal' : 'unknown'].push(id);
    }
  }
  return out;
}
