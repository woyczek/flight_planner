// V3 data — le calcul pur de l'état par zone (SPEC § 5.9, V3_SPECIFICATION § 10.44, SOG-0071 temps 2) : la lecture fermée de la réponse du verbe base/status (frame/aerodb/INTEGRATION.md « The state per zone »), le plan de « Mettre à jour » et la teinte
// d'une zone d'après son état. Rien n'est dessiné ici et rien n'est demandé : le lanceur répond, la page lit et traduit les codes (texts.js). Tout ce que le lanceur dit est lu comme une entrée non fiable : listes fermées, textes courts, nombres bornés.

/** Les états d'une zone que le lanceur donne ; « en cours » (building) est celui de la page, jamais celui du lanceur. */
export const ZONE_STATES = Object.freeze(['up-to-date', 'stale', 'never-built', 'failed']);
/** Les codes de raison que la page sait dire (frame/aerodb/INTEGRATION.md) ; un code inconnu est gardé sous `unknown` (la zone reste signalée, sa raison est dite sans détail). */
/** Les avis (information qui ne rend pas la zone périmée) que la page sait dire. */
export const NOTICE_CODES = Object.freeze(['no-points']);
export const REASON_CODES = Object.freeze(['never-built', 'failed', 'pickup-waiting', 'source-newer', 'inputs-changed', 'parser-old',
  'files-missing', 'source-old', 'index-orphan', 'source-unbuilt', 'source-unread', 'source-missing'
]);
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
    at: typeof d.at === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(d.at) ? d.at.slice(0, 30) : null
  };
}
/** La réponse de base/status lue : { current, parserVersion, zones: { id: { state, reasons: [raison], buildable, builtCycle, expectedCycle } } } ; null si ce n'est pas une réponse lisible (échec, refus, forme inattendue). Une zone dont l'identifiant ou l'état est hors règle est écartée. */
export function statusOf(final) {
  const r = final?.state === 'done' && final.result !== null && typeof final.result === 'object' ? final.result : null;
  if (!r || r.ok === false || r.zones === null || typeof r.zones !== 'object' || Array.isArray(r.zones)) return null;
  const zones = {};
  for (const [id, z] of Object.entries(r.zones).slice(0, 300)) {
    if (!ID.test(id) || z === null || typeof z !== 'object' || !ZONE_STATES.includes(z.state)) continue;
    zones[id] = {
      state: z.state,
      reasons: (Array.isArray(z.reasons) ? z.reasons : []).slice(0, 8).map(reasonOf),
      notices: (Array.isArray(z.notices) ? z.notices : []).filter(n => NOTICE_CODES.includes(n?.code)).slice(0, 4).map(reasonOf),
      buildable: z.buildable === true,
      builtCycle: day(z.builtCycle),
      expectedCycle: day(z.expectedCycle),
      download: downloadOf(z.download)
    };
  }
  return {
    current: day(r.current),
    parserVersion: int(r.parserVersion),
    zones
  };
}
/** L'état dessiné d'une zone : 'building' (la page la traite), l'état du lanceur, ou null sans état connu. */
export function drawnState(status, id, running) {
  if (running) return 'building';
  return Object.hasOwn(status?.zones || {}, id) ? status.zones[id].state : null;
}
/** La teinte de la carte pour un état dessiné : vert (à jour), orange (à reconstruire), gris (jamais construite), rouge (en échec), bleu (en cours). */
export const STATE_TONE = Object.freeze({
  'up-to-date': 'ok',
  stale: 'warn',
  'never-built': 'muted',
  failed: 'err',
  building: 'accent'
});
/** Le plan de « Mettre à jour » sur une sélection d'après l'état : { build: [{ zone, reasons }] (pas à jour ET constructibles), waiting: [{ zone, reasons }] (pas à jour mais en attente d'un fichier : rien à construire), upToDate, unknown (sans état) }. */
export function updatePlan(status, ids) {
  const build = [],
    waiting = [];
  let upToDate = 0,
    unknown = 0;
  for (const zone of ids || []) {
    const z = Object.hasOwn(status?.zones || {}, zone) ? status.zones[zone] : null;
    if (!z) unknown++;
    else if (z.state === 'up-to-date') upToDate++;
    else(z.buildable ? build : waiting).push({
      zone,
      reasons: z.reasons
    });
  }
  return {
    build,
    waiting,
    upToDate,
    unknown
  };
}
/** Ce que « Mettre à jour » fait d'une sélection d'après l'état lu AVANT de rien télécharger (SOG-0180) : { upToDate: [ids] sautées, fetch: [ids] à télécharger, build: [ids] à reconstruire (celles à télécharger en font partie, les zones qui attendent un fichier non), waiting: [ids] qui attendent un fichier déposé à la main, unknown }.
 *  Une zone dont les sources du cycle sont déjà là (`download.done`) n'est pas téléchargée de nouveau : sa construction seule ; une zone dont le lanceur ne dit rien du téléchargement est téléchargée. */
export function downloadPlan(status, ids) {
  const out = {
    upToDate: [],
    fetch: [],
    build: [],
    waiting: [],
    unknown: []
  };
  for (const id of ids || []) {
    const z = Object.hasOwn(status?.zones || {}, id) ? status.zones[id] : null;
    if (!z) {
      out.unknown.push(id);
      out.fetch.push(id);
    } else if (z.state === 'up-to-date') out.upToDate.push(id);
    else if (z.reasons.some(r => r.code === 'pickup-waiting')) out.waiting.push(id);
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
/** Le bilan d'une liste de zones d'après l'état du lanceur (SOG-0180) : { upToDate, rebuild, failed, waiting, unknown } en listes d'identifiants. `waiting` : pas à jour et pas constructible (un fichier que seul l'utilisateur dépose) ;
 *  `rebuild` : pas à jour et constructible ; `failed` : la dernière construction a échoué. */
export function balanceOf(status, ids) {
  const out = {
    upToDate: [],
    rebuild: [],
    failed: [],
    waiting: [],
    unknown: []
  };
  for (const id of ids || []) {
    const z = Object.hasOwn(status?.zones || {}, id) ? status.zones[id] : null;
    if (!z) out.unknown.push(id);
    else if (z.state === 'up-to-date') out.upToDate.push(id);
    else if (z.state === 'failed') out.failed.push(id);
    else(z.buildable ? out.rebuild : out.waiting).push(id);
  }
  return out;
}
