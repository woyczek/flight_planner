// V3 data — modèle pur de l'écran « Données » (modules/data/SPEC.md § 6, INTEGRATION.md § 2) : arithmétique des cycles AIRAC,
// état d'une ligne, âge, regroupement des États par couleur, débordement à sept lignes, ligne d'un jeu de données à partir de ce que
// publication() d'aerodb donne. Ni page, ni contexte, ni stockage, ni réseau : le cycle AIRAC vient du paramètre `airac`
// (AeroAirac, que ctx.aerodb.sources() porte sous `.airac`), jamais d'un calcul de ce module ; le temps est un paramètre `now`
// (millisecondes) pour que les cas de test donnent leurs propres dates. Dates stockées « AAAA-MM-JJ », montrées « AANN ».

export const DAY = 864e5;
/** Lignes visibles au plus par groupe, et lignes d'États visibles au plus (règle des sept éléments). */
export const MAX_VISIBLE = 7;
/** Un cycle publié dépassé passe au rouge quand sa dernière journée est révolue depuis plus de ce nombre de jours. */
export const RED_AFTER_DAYS = 7;
/** Âge, en jours, au-delà duquel un jeu sans cycle (les appareils) est ambre. */
export const AGE_LIMIT_DAYS = 28;
/** Ordre de priorité des états d'une ligne (SPEC § 6.2) : un seul est montré ; ceux que les données ne permettent pas encore de
 *  calculer (nouveau cycle, source plus récente, non publié) sont listés pour mémoire. `absent` passe avant tout : sans rien de
 *  publié, aucun autre état n'a de sens ; `stale-age` est la règle des 28 jours des jeux sans cycle. */
export const STATE_ORDER = ['absent', 'stale-cycle', 'new-cycle', 'parser', 'source-newer', 'unpushed', 'outdated', 'stale-age', 'ok'];
/** Jeux dont l'état se lit ailleurs que dans la base par zone : source → partie de publication(). */
export const PUBLISHED_BY = {
  vac: 'vfr',
  eaip: 'proc',
  cifp: 'proc',
  aircraft: 'aircraft'
};
const LOCALES = {
  fr: 'fr-FR',
  en: 'en-GB',
  de: 'de-DE',
  es: 'es-ES'
};
const ISO = /^\d{4}-\d{2}-\d{2}/;

// ---------------------------------------------------------------- dates
/** Minuit UTC (ms) du jour d'une date « AAAA-MM-JJ… », d'un instant en ms ou d'un Date ; null si illisible. */
export function dayOf(v) {
  if (v === null || v === undefined || v === '') return null;
  const ms = typeof v === 'string' ? Date.parse(ISO.test(v) ? `${v.slice(0, 10)}T00:00:00Z` : v) : +v;
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
/** « AAAA-MM-JJ » d'un instant en ms. */
export const isoOf = ms => new Date(ms).toISOString().slice(0, 10);
/** La date « AAAA-MM-JJ » décalée de n jours ; null si illisible. */
export function addDays(iso, n) {
  const d = dayOf(iso);
  return d === null ? null : isoOf(d + n * DAY);
}
/** Nombre de jours entiers de a à b (deux dates ou instants, comptés au jour UTC) ; null si l'un est illisible. */
export function daysBetween(a, b) {
  const x = dayOf(a),
    y = dayOf(b);
  return x === null || y === null ? null : Math.round((y - x) / DAY);
}
/** « 01/10/2026 » : la date UTC dans l'écriture de la langue (lang : fr, en, de, es) ; vide si illisible. */
export function dateText(iso, lang = 'fr') {
  const d = dayOf(iso);
  return d === null ? '' : new Date(d).toLocaleDateString(LOCALES[lang] || LOCALES.fr, {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}
/** Âge entier en jours d'une publication (0 le jour même ; jamais négatif) ; null si la date est illisible. */
export function ageDays(at, now) {
  const t = typeof at === 'string' ? Date.parse(at) : +at;
  return Number.isFinite(t) && at !== null && at !== '' ? Math.max(0, Math.floor((now - t) / DAY)) : null;
}

// ---------------------------------------------------------------- cycles AIRAC
/** Le cycle en vigueur à `now` : { id « AANN », date d'effet, end (dernière journée), next { id, date }, daysToNext }. */
export function cycleHead(airac, now) {
  const c = airac.cycleOf(now);
  return {
    id: c.id,
    date: c.date,
    end: addDays(c.next.date, -1),
    next: {
      id: c.next.id,
      date: c.next.date
    },
    daysToNext: daysBetween(now, c.next.date)
  };
}
/** Date d'effet d'un cycle donné en « AANN » ou en date (une date quelconque donne le cycle qui la contient) ; null sinon. */
export function cycleDateOf(airac, v) {
  const s = String(v ?? '').trim();
  if (/^\d{4}$/.test(s)) return airac.cycleDate(s) || null;
  return ISO.test(s) ? airac.cycleOf(s.slice(0, 10)).date : null;
}
/** « AANN » du cycle qui commence à `date` (vide sans date). */
export const cycleName = (airac, date) => date ? airac.cycleOf(date).id : '';
/** Un cycle publié est-il dépassé ? null s'il est celui en vigueur ou un suivant ; 'warn' (ambre) dès qu'il est antérieur ; 'err'
 *  (rouge) quand sa dernière journée est révolue depuis plus de RED_AFTER_DAYS jours. */
export function staleLevel(airac, cycleDate, now) {
  if (!cycleDate || cycleDate >= airac.cycleOf(now).date) return null;
  const over = daysBetween(addDays(airac.cycleOf(cycleDate).next.date, -1), now);
  return over !== null && over > RED_AFTER_DAYS ? 'err' : 'warn';
}
/** La version de l'analyseur publiée est-elle plus ancienne que celle des constructeurs ? Jamais sans constante (`current` non
 *  numérique) ; une version inconnue (publiée avant qu'elle soit écrite) est plus ancienne que toute version. */
export function parserOld(current, found) {
  if (!Number.isFinite(current)) return false;
  return !Number.isFinite(found) || found < current;
}
/** La plus basse de plusieurs versions ; null dès que l'une est inconnue. */
export function lowestVersion(list) {
  return list.length && list.every(Number.isFinite) ? Math.min(...list) : null;
}

// ---------------------------------------------------------------- état d'une ligne
/** L'état à montrer d'après des drapeaux { absent, stale ('warn' | 'err' | null), parser, outdated, old } : [état, niveau] avec le
 *  niveau 'ok' | 'warn' | 'err' de la pastille ; l'ordre est celui de STATE_ORDER. */
export function pickState(f) {
  if (f.absent) return ['absent', 'warn'];
  if (f.stale) return ['stale-cycle', f.stale];
  if (f.parser) return ['parser', 'warn'];
  if (f.outdated) return ['outdated', 'warn'];
  if (f.old) return ['stale-age', 'warn'];
  return ['ok', 'ok'];
}

// ---------------------------------------------------------------- couverture
/** Les éléments d'une liste sans doublon, dans l'ordre. */
const unique = list => [...new Set(list)];
/** Les zones de la couverture de ce poste : celles de cache/data/coverage.json si le fichier existe ; sinon toutes les zones
 *  publiées (zones() avec published, à défaut les clés de publication().base). { ids, stored } : stored dit si le fichier existe. */
export function coverageIds(stored, zones, publication) {
  if (Array.isArray(stored?.zones)) return {
    ids: unique(stored.zones.filter(z => typeof z === 'string' && z)),
    stored: true
  };
  const pub = (Array.isArray(zones) ? zones : []).filter(z => z?.published).map(z => z.id);
  return {
    ids: unique(pub.length ? pub : Object.keys(publication?.base || {})),
    stored: false
  };
}
/** Les identifiants dans l'ordre de zones() (l'ordre alphabétique français), les inconnus à la fin dans l'ordre de leur nom. */
export function orderZones(ids, zones) {
  const rank = new Map((zones || []).map((z, i) => [z.id, i]));
  return [...ids].sort((a, b) => (rank.has(a) ? rank.get(a) : 1e6) - (rank.has(b) ? rank.get(b) : 1e6) || a.localeCompare(b));
}
/** Nom d'une zone dans la langue (index li : 0 fr, 1 en, 2 de, 3 es) ; son identifiant si la zone est inconnue. */
export function zoneName(zones, id, li) {
  const z = (zones || []).find(x => x.id === id);
  return z?.names?.[li] || z?.names?.[0] || id;
}
/** Zones de la couverture nourries par une source : toutes pour `'*'`, celles de sa liste sinon. */
export function fedZones(src, ids) {
  if (src.zones === '*') return [...ids];
  return Array.isArray(src.zones) ? src.zones.filter(z => ids.includes(z)) : [];
}
/** Une source compte-t-elle pour cette couverture ? Les appareils et la météo toujours ; la base et les procédures si une zone
 *  de la couverture est nourrie par la source. */
export function matters(src, ids) {
  return src.group === 'aircraft' || src.group === 'weather' || fedZones(src, ids).length > 0;
}

// ---------------------------------------------------------------- lignes
/** Agrège la base publiée des zones nourries : le cycle en vigueur le plus ancien, la date de publication la plus ancienne, la plus
 *  basse version d'analyseur, et le détail par zone { zone, published, cycle, at, by, parserVersion, format }. */
export function baseOf(pubBase, zoneIds) {
  const zones = zoneIds.map(zone => {
    const z = pubBase?.[zone],
      e = z?.inForce && z.cycles?.[z.inForce];
    return e ? {
      zone,
      published: true,
      cycle: z.inForce,
      at: e.at ?? null,
      by: e.by ?? null,
      parserVersion: Number.isFinite(e.parserVersion) ? e.parserVersion : null,
      format: e.format || 'split'
    } : {
      zone,
      published: false
    };
  });
  const pub = zones.filter(z => z.published),
    ats = pub.map(z => Date.parse(z.at)).filter(Number.isFinite);
  return {
    zones,
    published: pub.length,
    cycle: pub.length ? pub.map(z => z.cycle).sort()[0] : null,
    at: ats.length ? new Date(Math.min(...ats)).toISOString() : null,
    parserVersion: lowestVersion(pub.map(z => z.parserVersion)),
    whole: pub.some(z => z.format === 'whole')
  };
}
/** La ligne d'un jeu de données (une source du catalogue) : { id, group, status, kind, state, level, cycle, cycleDate, at, ageDays,
 *  counts, zones, fed, attention, unknown }. `env` : { airac, pub (publication() ou null), ids (zones de la couverture), now,
 *  parserVersion (constante des constructeurs, absente aujourd'hui) }. Une source écartée ou envisagée n'a jamais d'état ; une
 *  source dont publication() ne dit rien (la météo) non plus ; sans publication() lisible la ligne est `unknown` et sans état. */
export function rowOf(src, env) {
  const row = {
    id: src.id,
    group: src.group,
    status: src.status,
    kind: 'none',
    state: null,
    level: null,
    cycle: '',
    cycleDate: null,
    at: null,
    ageDays: null,
    counts: {},
    zones: [],
    byStatus: null,
    fed: fedZones(src, env.ids),
    attention: false,
    unknown: false
  };
  const part = PUBLISHED_BY[src.id] || (src.group === 'base' ? 'base' : null);
  if (src.status !== 'used' || !part) return row;
  row.kind = part;
  if (!env.pub) {
    row.unknown = true;
    return row;
  }
  const flags = {};
  if (part === 'base') {
    const b = baseOf(env.pub.base, row.fed);
    row.zones = b.zones;
    row.counts.zones = b.published;
    flags.absent = !b.published;
    row.cycleDate = b.cycle;
    row.at = b.at;
    flags.parser = !flags.absent && parserOld(env.parserVersion, b.whole ? null : b.parserVersion);
  } else if (part === 'proc') {
    const p = env.pub.proc,
      e = p?.inForce && p.cycles?.[p.inForce];
    flags.absent = !e;
    if (e) {
      row.cycleDate = p.inForce;
      row.counts.aerodromes = e.aerodromes;
      row.byStatus = e.byStatus || null;
      flags.outdated = (e.byStatus?.outdated || 0) > 0;
    }
  } else if (part === 'vfr') {
    const v = env.pub.vfr;
    flags.absent = !v;
    if (v) {
      row.cycleDate = cycleDateOf(env.airac, v.cycle);
      row.at = v.at ?? null;
      row.counts.aerodromes = v.count;
    }
  } else if (part === 'aircraft') {
    const a = env.pub.aircraft;
    flags.absent = !a;
    if (a) {
      row.at = a.at ?? null;
      row.counts.types = a.types;
      row.counts.files = a.files;
      flags.old = (ageDays(a.at, env.now) ?? 0) > AGE_LIMIT_DAYS;
    }
  }
  row.cycle = cycleName(env.airac, row.cycleDate);
  row.ageDays = ageDays(row.at, env.now);
  flags.stale = flags.absent ? null : staleLevel(env.airac, row.cycleDate, env.now);
  [row.state, row.level] = pickState(flags);
  row.attention = row.state !== 'ok';
  return row;
}
/** Découpe une liste : les `max` premiers visibles, le reste sous le repli « n autres ». */
export function split(list, max = MAX_VISIBLE) {
  return {
    visible: list.slice(0, max),
    more: list.slice(max)
  };
}
/** Les quatre groupes dans l'ordre du catalogue : { id, rows (visibles, au plus sept, celles qui demandent attention d'abord),
 *  more (le surplus des jeux utilisés, puis les jeux envisagés et écartés, sans état), attention (une ligne utilisée n'est pas à jour),
 *  used (nombre de jeux utilisés qui comptent pour la couverture) }. */
export function buildGroups(cat, env) {
  return cat.GROUPS.map(id => {
    const all = cat.SOURCES.filter(s => s.group === id),
      used = all.filter(s => s.status === 'used' && matters(s, env.ids)).map(s => rowOf(s, env)),
      // une ligne qui demande attention ne se cache pas derrière le repli ; sinon l'ordre du catalogue
      ranked = [...used.filter(r => r.attention), ...used.filter(r => !r.attention)],
      {
        visible,
        more
      } = split(ranked),
      others = cat.ORDER.filter(st => st !== 'used').flatMap(st => all.filter(s => s.status === st)).map(s => rowOf(s, env));
    return {
      id,
      rows: visible,
      more: [...more, ...others],
      attention: used.some(r => r.attention),
      used: used.length
    };
  });
}

// ---------------------------------------------------------------- États
/** Les lignes de la liste des États : une par (couleur, raison), vert puis orange puis rouge ; chaque ligne { level, reason, label,
 *  items: [{ prefix, name, held }] } : nom = names[li] sinon le préfixe, `held` (terrains détenus) seulement s'il est un nombre
 *  positif. `byState` : coverageByState() ; `order` : l'ordre des raisons du catalogue (COVERAGE), à défaut l'ordre alphabétique. */
export function stateLines(byState, li, order = []) {
  const levels = ['green', 'orange', 'red'],
    lines = new Map();
  for (const [prefix, e] of Object.entries(byState || {})) {
    if (!e || !levels.includes(e.level)) continue;
    const key = `${e.level}|${e.reason}`;
    if (!lines.has(key)) lines.set(key, {
      level: e.level,
      reason: String(e.reason ?? ''),
      label: e.label?.[li] || e.label?.[0] || String(e.reason ?? ''),
      items: []
    });
    lines.get(key).items.push({
      prefix,
      name: e.names?.[li] || prefix,
      held: Number.isFinite(e.held) && e.held > 0 ? e.held : null
    });
  }
  const rank = r => order.includes(r) ? order.indexOf(r) : order.length;
  return [...lines.values()].sort((a, b) => levels.indexOf(a.level) - levels.indexOf(b.level) || rank(a.reason) - rank(b.reason) ||
    a.reason.localeCompare(b.reason)).map(l => ({
    ...l,
    items: l.items.sort((x, y) => x.name.localeCompare(y.name, ['fr', 'en', 'de', 'es'][li] || 'fr'))
  }));
}

// ---------------------------------------------------------------- construire la base (lot D5)
/** Sources de la base sous licence d'usage personnel, par identifiant de shared/aero_zones.js (SOURCES : le champ `personal`) ;
 *  `zones` : les zones qu'elles nourrissent ('*' : toutes). Ce module ne charge pas shared/aero_zones.js : le cas L1 compare
 *  cette table au fichier (aero_zones.js : `personal:`, COMMON, EXTRA) pour que les deux ne s'écartent pas. Les identifiants
 *  sont ceux que le lanceur attend dans args.personal. */
export const PERSONAL = {
  enaire: {
    kind: 'licence',
    zones: ['es']
  },
  nats: {
    kind: 'licence',
    zones: ['gb']
  },
  xplane: {
    kind: 'xplane',
    zones: '*'
  }
};
/** Dernières opérations gardées dans cache/data/journal.json. */
export const JOURNAL_MAX = 50;
/** États d'une zone dans la vue d'un travail, par verbe. */
const ZONE_STATES = {
  build: ['waiting', 'building', 'built', 'failed', 'cancelled'],
  fetch: ['waiting', 'fetching', 'done', 'failed', 'cancelled'],
  purge: ['waiting', 'purging', 'done', 'failed', 'cancelled']
};
/** Le verbe en cours dans la phrase d'une zone (la clé de « n / m sources »). */
const ZONE_RUNNING = {
  build: 'building',
  fetch: 'fetching',
  purge: 'purging'
};
/** Les motifs du lanceur qui sont chacun une fin à part d'une construction (une phrase chacun) : le navigateur, X-Plane, les appareils (aucun type,
 *  script absent), les points VFR (pypdf manque, aucune carte en cache, plan refusé) et, pour tous les jeux, une fusion qui attend dans data/
 *  (rien n'est écrit : « merge-pending »). */
const EXTRA_KINDS = ['no-browser', 'xplane-in-page', 'no-codes', 'no-script', 'no-pypdf', 'no-cache', 'invalid', 'merge-pending'];
const ERROR_CODES = ['browser-failed', 'browser-exited', 'timeout', 'page-error', 'invalid-output', 'write-failed', 'cancelled'];
/** Codes d'échec d'une source téléchargée (base/fetch). */
const FETCH_CODES = ['network', 'http', 'parse', 'personal', 'manual'];
/** États d'une source dans la vue d'un téléchargement. */
const SOURCE_STATES = ['downloaded', 'unchanged', 'failed', 'skipped', 'manual'];
/** Unités de taille par langue (base 1024). */
const SIZE_UNITS = {
  fr: ['o', 'Ko', 'Mo', 'Go'],
  en: ['B', 'KB', 'MB', 'GB'],
  de: ['B', 'KB', 'MB', 'GB'],
  es: ['B', 'KB', 'MB', 'GB']
};
/** Un nombre fini, sinon null. */
export const num = v => Number.isFinite(v) ? v : null;

/** Les sources sous licence personnelle à proposer pour ces zones cochées : celles qui nourrissent au moins l'une d'elles,
 *  dans l'ordre de PERSONAL ; [{ id, kind ('licence' | 'xplane') }]. */
export function personalSources(zoneIds) {
  return Object.entries(PERSONAL).filter(([, p]) => p.zones === '*' ? zoneIds.length > 0 : p.zones.some(z => zoneIds.includes(z)))
    .map(([id, p]) => ({
      id,
      kind: p.kind
    }));
}
/** Le code d'échec d'une zone : ceux du verbe, sinon 'unknown' ; pour la purge (codes non fixés par le lanceur) le code court tel quel ;
 *  `loose` (les jeux autres que la base : leurs constructeurs sont en Python, codes non fixés) garde aussi le code court d'une construction ou d'un téléchargement. */
function zoneCode(verb, error, loose = false) {
  const short = typeof error === 'string' && /^[\w-]{1,40}$/.test(error) ? error : 'unknown';
  if (verb === 'build') return ERROR_CODES.includes(error) ? error : loose ? short : 'unknown';
  if (verb === 'fetch') return FETCH_CODES.includes(error) ? error : loose ? short : 'unknown';
  return short;
}
/** Ce que dit la ligne d'une zone d'après son état dans la vue du travail : { state, key, n, m, code, files, bytes } ; key : la phrase
 *  (waiting, building / fetching / purging, buildingN / fetchingN avec n / m sources, built / done, failed avec le code d'erreur,
 *  cancelled) ; `verb` : build (par défaut), fetch ou purge ; files et bytes : ce que la purge a compté pour la zone. */
export function zonePhrase(z, verb = 'build', loose = false) {
  const states = ZONE_STATES[verb] || ZONE_STATES.build,
    state = states.includes(z?.state) ? z.state : 'waiting',
    n = num(z?.done),
    m = num(z?.total),
    run = ZONE_RUNNING[verb] || 'building';
  return {
    state,
    key: state === run && verb !== 'purge' && n !== null && m !== null ? `${run}${loose ? 'P' : 'N'}` :
    state, // P : « (n / m) » sans nom (les autres jeux comptent des terrains, des étapes…)
    n,
    m,
    code: state === 'failed' ? zoneCode(verb, z?.error, loose) : null,
    files: num(z?.files),
    bytes: num(z?.bytes)
  };
}
/** Les lignes de zones à montrer : les zones demandées dans leur ordre (celles que la vue ne connaît pas encore : en attente),
 *  puis celles que la vue ajoute ; [{ zone, ...zonePhrase }]. */
export function zoneRows(view, ids, verb = 'build', loose = false) {
  const zs = view?.zones && typeof view.zones === 'object' ? view.zones : {};
  return [...ids, ...Object.keys(zs).filter(z => !ids.includes(z))].map(zone => ({
    zone,
    ...zonePhrase(zs[zone], verb, loose)
  }));
}
/** Les sources d'une zone dans la vue d'un téléchargement : [{ id, state, files, bytes, code, status }] dans l'ordre de la vue ;
 *  seules les sources dont l'état est connu (celles pas encore essayées n'y sont pas) ; code : le code d'échec, 'personal' pour une
 *  source ignorée faute de licence déclarée, null sinon. */
export function sourceRows(z) {
  const ss = z?.sources && typeof z.sources === 'object' ? z.sources : {};
  return Object.keys(ss).filter(id => SOURCE_STATES.includes(ss[id]?.state)).map(id => {
    const s = ss[id],
      failed = s.state === 'failed';
    return {
      id,
      state: s.state,
      files: num(s.files),
      bytes: num(s.bytes),
      code: failed ? zoneCode('fetch', s.error) : s.state === 'skipped' && s.error === 'personal' ? 'personal' : null,
      status: failed ? num(s.status) : null
    };
  });
}
/** La barre : { done, total, pct } ; done / total de la vue (en zones), à défaut 0 sur le nombre de zones demandées ; pct 0 à 100,
 *  null sans total. */
export function progress(view, ids) {
  const total = num(view?.total) > 0 ? num(view.total) : ids.length,
    done = Math.min(num(view?.done) ?? 0, total);
  return {
    done,
    total,
    pct: total > 0 ? Math.round(100 * done / total) : null
  };
}
/** « 2:05 » : un nombre de secondes en minutes et secondes. */
export function clock(sec) {
  const s = Math.max(0, Math.round(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
/** La fin d'un travail de construction, d'après sa dernière vue : { kind, built: [zone], failed: [{ zone, error }] } ; kind :
 *  'done' | 'partial' | 'failed' | 'cancelled' | 'interrupted' | 'no-browser' | 'xplane-in-page'. Le résultat du lanceur
 *  (result.built, result.failed, result.reason) l'emporte, à défaut l'état des zones. */
export function outcome(final) {
  const r = final?.result && typeof final.result === 'object' ? final.result : {},
    zs = final?.zones && typeof final.zones === 'object' ? final.zones : {};
  const built = Array.isArray(r.built) ? r.built.filter(z => typeof z === 'string') : Object.keys(zs).filter(z => zs[z]?.state === 'built'),
    failed = Array.isArray(r.failed) ? r.failed.filter(f => f && f.zone).map(f => ({
      zone: f.zone,
      error: f.error
    })) : Object.keys(zs).filter(z => zs[z]?.state === 'failed').map(z => ({
      zone: z,
      error: zs[z].error
    }));
  let kind;
  if (final?.state === 'interrupted') kind = 'interrupted';
  else if (final?.state === 'cancelled') kind = 'cancelled';
  else if (EXTRA_KINDS.includes(r.reason)) kind = r.reason;
  else if (r.reason === 'cancelled') kind = 'cancelled';
  else if (r.reason === 'partial' || r.reason === 'failed') kind = r.reason;
  else if (final?.state === 'error' || r.ok === false) kind = 'failed';
  else kind = failed.length ? built.length ? 'partial' : 'failed' : 'done';
  if (EXTRA_KINDS.includes(kind) && !Array.isArray(r.failed)) failed.length =
    0; // un motif propre (pypdf manque…) : la zone « en échec » de la vue n'est pas un échec de plus
  return {
    kind,
    built,
    failed
  };
}
/** Le résultat d'une opération pour le journal : 'done' | 'partial' | 'failed' | 'cancelled' | 'interrupted' | 'nothing' (rien à télécharger). */
export const journalResult = kind => ['done', 'partial', 'cancelled', 'interrupted', 'nothing'].includes(kind) ? kind : 'failed';
/** Le refus d'un départ (la forme d'un refus de ctx.launcher) en { key, wait } ; key : busy | tooSoon | unknown-route | bad-args |
 *  offline | refused | failed. */
export function refusal(r) {
  const key = r?.status === 409 && r.reason === 'updating' ? 'updating' : r?.status === 409 ? 'busy' : r?.status === 429 && r.reason ===
    'too-soon' ? 'tooSoon' : r?.status === 404 ? 'unknown-route' :
    r?.status === 400 ? 'bad-args' : r?.refused ? 'refused' : r?.offline ? 'offline' : 'failed';
  return {
    key,
    wait: key === 'tooSoon' ? Math.max(1, Math.ceil(num(r.wait) ?? 1)) : null
  };
}
/** Une entrée du journal : { at (UTC ISO), set, verb, zones, seconds, result, built, failed, job? }. `at` : instant en ms. */
export function journalEntry({
  at,
  zones,
  seconds,
  out,
  job
}) {
  return {
    at: new Date(at).toISOString(),
    set: 'base',
    verb: 'build',
    zones: [...zones],
    seconds: seconds === null || seconds === undefined ? null : Math.max(0, Math.round(seconds)),
    result: journalResult(out.kind),
    ...(EXTRA_KINDS.includes(out.kind) ? {
      reason: out.kind
    } : {}),
    built: [...out.built],
    failed: out.failed.map(f => ({
      zone: f.zone,
      error: f.error ?? null
    })),
    ...(job ? {
      job: String(job)
    } : {})
  };
}
/** Un objet, sinon {}. */
const obj = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
/** Les textes d'une liste, sinon []. */
const strs = v => Array.isArray(v) ? v.filter(x => typeof x === 'string' && x) : [];
/** Les avertissements d'un résultat : [{ code, count }] (count : un nombre, 0 sans). */
function warningsOf(r) {
  return (Array.isArray(r.warnings) ? r.warnings : []).filter(w => w && typeof w.code === 'string').map(w => ({
    code: w.code,
    count: num(w.count) ?? 0
  }));
}
/** Le total d'un avertissement d'un code donné. */
const warned = (list, code) => list.filter(w => w.code === code).reduce((a, w) => a + w.count, 0);

// ---------------------------------------------------------------- télécharger (base/fetch)
/** La fin d'un téléchargement, d'après sa dernière vue : { kind, fetched: [zone], unchanged: [zone], failed: [{ zone, source, error,
 *  status? }], manual: [{ zone, source, url, name }], outside, level } ; kind : 'done' | 'partial' | 'failed' | 'cancelled' |
 *  'interrupted' | 'nothing' (rien à télécharger pour ces zones) ; outside : les fichiers suivis par git que le travail a modifiés
 *  (result.outside_sync) ; level : 'ok' | 'warn' | 'err'. Le résultat du lanceur l'emporte, à défaut l'état des zones de la vue. */
export function fetchOutcome(final) {
  const r = obj(final?.result),
    zs = obj(final?.zones),
    keys = Object.keys(zs),
    hasLists = ['fetched', 'unchanged', 'failed'].some(k => Array.isArray(r[k]));
  let fetched, unchanged, failed;
  if (hasLists) {
    fetched = strs(r.fetched);
    unchanged = strs(r.unchanged);
    failed = (Array.isArray(r.failed) ? r.failed : []).filter(f => f && f.zone).map(f => ({
      zone: f.zone,
      source: f.source ?? null,
      error: f.error ?? null,
      ...(num(f.status) !== null ? {
        status: f.status
      } : {})
    }));
  } else {
    const srcs = z => Object.entries(obj(zs[z]?.sources)).map(([id, s]) => [id, obj(s)]);
    failed = keys.filter(z => zs[z]?.state === 'failed').map(z => {
      const [id, s] = srcs(z).find(([, x]) => x.state === 'failed') || [null, {}];
      return {
        zone: z,
        source: id,
        error: s.error ?? zs[z].error ?? null,
        ...(num(s.status) !== null ? {
          status: s.status
        } : {})
      };
    });
    const done = keys.filter(z => zs[z]?.state === 'done');
    fetched = done.filter(z => srcs(z).some(([, x]) => x.state === 'downloaded'));
    unchanged = done.filter(z => !fetched.includes(z));
  }
  const manual = (Array.isArray(r.manual) ? r.manual : []).filter(m => m && m.zone && m.source).map(m => ({
      zone: m.zone,
      source: m.source,
      url: typeof m.url === 'string' ? m.url : '',
      name: Array.isArray(m.name) ? m.name.map(x => String(x ?? '')) : [],
      pickup: m.pickup === true,
      expected: typeof m.expected === 'string' ? m.expected : ''
    })),
    warns = warningsOf(r),
    outside = num(r.outside_sync) ?? warned(warns, 'outside-sync');
  let kind;
  if (final?.state === 'interrupted') kind = 'interrupted';
  else if (final?.state === 'cancelled') kind = 'cancelled';
  else if (r.reason === 'nothing-to-fetch') kind = 'nothing';
  else if (r.reason === 'no-codes' || r.reason === 'no-script') kind = r.reason;
  else if (r.reason === 'cancelled') kind = 'cancelled';
  else if (r.reason === 'partial' || r.reason === 'failed') kind = r.reason;
  else if (final?.state === 'error' || r.ok === false) kind = 'failed';
  else kind = failed.length ? fetched.length || unchanged.length ? 'partial' : 'failed' : 'done';
  const level = kind === 'failed' || kind === 'no-codes' || kind === 'no-script' ? 'err' : kind === 'done' && outside <= 0 ? 'ok' : 'warn';
  return {
    kind,
    fetched,
    unchanged,
    failed,
    manual,
    outside: Math.max(0, outside),
    level
  };
}
/** Une adresse de source manuelle est-elle un lien ? Seulement en https:// (jamais javascript:, data:, http:…). */
export const isHttps = url => /^https:\/\/[^\s"'<>]+$/i.test(String(url ?? ''));
/** Une entrée du journal pour un téléchargement : { at, set, verb ('download' : le verbe du lanceur est « fetch »), zones, seconds,
 *  result, fetched, unchanged, failed, job? }. */
export function fetchEntry({
  at,
  zones,
  seconds,
  out,
  job
}) {
  return {
    at: new Date(at).toISOString(),
    set: 'base',
    verb: 'download',
    zones: [...zones],
    seconds: seconds === null || seconds === undefined ? null : Math.max(0, Math.round(seconds)),
    result: journalResult(out.kind),
    fetched: [...out.fetched],
    unchanged: [...out.unchanged],
    failed: out.failed.map(f => ({
      zone: f.zone,
      source: f.source ?? null,
      error: f.error ?? null,
      ...(num(f.status) !== null ? {
        status: f.status
      } : {})
    })),
    ...(job ? {
      job: String(job)
    } : {})
  };
}

// ---------------------------------------------------------------- purger (base/purge)
/** Une taille en octets écrite dans la langue : « 13,8 Mo » (virgule en fr, de, es ; point en en), une décimale, base 1024 ; les octets
 *  entiers sous 1 Ko ; vide si ce n'est pas un nombre. */
export function fmtBytes(n, lang = 'fr') {
  if (!Number.isFinite(n) || n < 0) return '';
  const units = SIZE_UNITS[lang] || SIZE_UNITS.fr,
    sep = lang === 'en' ? '.' : ',';
  if (n < 1024) return `${Math.round(n)} ${units[0]}`;
  let i = 1,
    v = n / 1024;
  while (i < units.length - 1 && Math.round(v * 10) / 10 >= 1024) { // 1023,96 Ko s'écrit 1,0 Mo, jamais « 1024,0 Ko »
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1).replace('.', sep)} ${units[i]}`;
}
/** Le plan ou la fin d'une purge, d'après la dernière vue du travail : { kind, files, bytes, zones, removed, shared, kept, unsafe, nothing,
 *  level } ; kind : 'done' | 'partial' | 'failed' | 'cancelled' | 'interrupted' ; files / bytes : le total de result.removed (à défaut les
 *  zones de la vue) ; zones : celles qui ont des fichiers ; shared : l'avertissement 'shared-fr' ; kept : les fichiers suivis par git
 *  gardés (le total des 'kept-tracked') ; unsafe : les chemins refusés ; nothing : réussi et rien à retirer ; level : 'ok' | 'warn' | 'err'. */
export function purgeOutcome(final) {
  const r = obj(final?.result),
    zs = obj(final?.zones),
    from = r.removed && typeof r.removed === 'object' ? 'files' in r.removed || 'bytes' in r.removed ? {
      '*': r.removed
    } : r.removed : zs, // aircraft/purge : { files, bytes } sans élément (clé '*')
    removed = {};
  for (const [z, e] of Object.entries(obj(from))) removed[z] = {
    files: num(e?.files) ?? 0,
    bytes: num(e?.bytes) ?? 0
  };
  const warns = warningsOf(r),
    files = Object.values(removed).reduce((a, e) => a + e.files, 0),
    bytes = Object.values(removed).reduce((a, e) => a + e.bytes, 0),
    kept = warned(warns, 'kept-tracked'),
    unsafe = warned(warns, 'unsafe-path'),
    shared = warns.some(w => w.code === 'shared-fr');
  let kind;
  if (final?.state === 'interrupted') kind = 'interrupted';
  else if (final?.state === 'cancelled' || r.reason === 'cancelled') kind = 'cancelled';
  else if (r.reason === 'partial' || r.reason === 'failed') kind = r.reason;
  else if (final?.state === 'error' || r.ok === false) kind = 'failed';
  else kind = 'done';
  return {
    kind,
    files,
    bytes,
    zones: Object.keys(removed).filter(z => removed[z].files > 0),
    removed,
    shared,
    kept,
    unsafe,
    nothing: kind === 'done' && files === 0,
    level: kind === 'failed' ? 'err' : kind === 'done' && unsafe <= 0 ? 'ok' : 'warn'
  };
}
/** Une entrée du journal pour une purge réelle (le plan n'y est jamais) : { at, set, verb: 'purge', zones, seconds, result, files, bytes,
 *  job? }. */
export function purgeEntry({
  at,
  zones,
  seconds,
  out,
  job
}) {
  return {
    at: new Date(at).toISOString(),
    set: 'base',
    verb: 'purge',
    zones: [...zones],
    seconds: seconds === null || seconds === undefined ? null : Math.max(0, Math.round(seconds)),
    result: journalResult(out.kind),
    files: out.files,
    bytes: out.bytes,
    ...(job ? {
      job: String(job)
    } : {})
  };
}
/** Les opérations lues du fichier journal (un tableau, ou { ops }) : les entrées lisibles seulement, de la plus ancienne à la plus
 *  récente. */
export function journalList(doc) {
  const list = Array.isArray(doc) ? doc : Array.isArray(doc?.ops) ? doc.ops : [];
  return list.filter(e => e && typeof e === 'object' && typeof e.at === 'string' && typeof e.verb === 'string');
}
/** Le journal avec une opération de plus, à la fin, borné aux `max` dernières ; inchangé si le travail (job) y est déjà. */
export function journalAdd(list, entry, max = JOURNAL_MAX) {
  if (entry.job && list.some(e => e.job === entry.job)) return list;
  return [...list, entry].slice(-max);
}

// ---------------------------------------------------------------- les autres jeux (V3 § 10.34, lot A1)
/** Les jeux qui ont le panneau Télécharger · Construire · Purger (SPEC § 5.5), par identifiant de jeu du lanceur (`regen/job { set }`) :
 *  arg : la clé des éléments dans les arguments et à la racine de la vue du travail ; unit : le nom d'un élément (TX.unit) ; noItem : la
 *  raison grise « aucun élément coché » (absente : le jeu n'a pas à en cocher) ; group : le groupe de l'écran où vit le panneau ; single :
 *  un seul élément implicite (le cycle) ; free : les éléments se tapent dans un champ. La météo n'a pas de panneau (publiée avec le site). */
export const SETS = {
  base: {
    arg: 'zones',
    unit: 'zone',
    noItem: 'no-zone',
    group: 'base',
    verbs: ['fetch', 'build', 'purge']
  },
  proc: {
    arg: 'states',
    unit: 'state',
    noItem: 'no-state',
    group: 'proc',
    verbs: ['fetch', 'build', 'purge']
  },
  vfr: {
    arg: 'cycle',
    view: 'cycles',
    unit: 'cycle',
    noItem: null,
    group: 'base',
    single: true,
    verbs: ['fetch', 'build', 'purge']
  },
  aircraft: {
    arg: 'codes',
    unit: 'step',
    view: 'steps',
    steps: ['types', 'apd', 'simbrief'],
    noItem: null,
    group: 'aircraft',
    free: true,
    verbs: ['fetch', 'build', 'purge']
  }
};
/** La prise du fichier téléchargé à la main (SIA, NATS) dans Téléchargements : un verbe du jeu « base » à part (base/pickup : plan à blanc, puis la prise), un
 *  quatrième bouton du panneau de la base ; jamais dans la chaîne « Tout mettre à jour ». */
export const PICKUP = {
  set: 'base',
  verb: 'pickup'
};
/** Où la prise dépose les fichiers de chaque source (écrit tel que le lanceur le fait : tools/regen/base_sources.py PICKUP) : sources brutes du poste, jamais commitées. */
export const PICKUP_DEST = {
  sia: 'data/sia/',
  nats: 'data/sia/zones/gb/'
};
/** Les fiches publiées de la compagnie : un seul verbe du jeu « aircraft », son propre panneau (aircraft/publish : plan à blanc, puis la copie). */
export const SHEETS = {
  set: 'aircraft',
  verb: 'publish',
  panel: 'sheets',
  group: 'aircraft'
};
/** Les verbes que connaît un lanceur ancien (avant `regen/verbs`) : ceux du jeu « base » seulement. */
export const OLD_VERBS = ['base/fetch', 'base/build', 'base/purge'];
/** Les clés sous lesquelles un lanceur peut nommer l'élément d'un échec ou d'une source manuelle (la base dit `zone`). */
const ITEM_KEYS = ['zone', 'state', 'code', 'type', 'cycle', 'item'];
/** Le verbe du lanceur « set/verb » d'un jeu et d'un verbe. */
export const verbKey = (set, verb) => `${set}/${verb}`;
/** Le panneau de l'écran qui montre une opération : 'base' (le panneau d'origine), 'proc', 'vfr', 'aircraft' ou 'sheets' (aircraft/publish). */
export const panelOf = (set, verb) => set === SHEETS.set && verb === SHEETS.verb ? SHEETS.panel : set;
/** Le groupe de l'écran qui porte le panneau d'un jeu (ou 'sheets'). */
export const groupOf = (set, verb) => set === SHEETS.set && verb === SHEETS.verb ? SHEETS.group : SETS[set]?.group || 'base';

/** Les verbes que le lanceur dit connaître, d'après la réponse de `regen/verbs` ({ verbs: ['base/build', …] }) : la liste des « jeu/verbe »
 *  lisibles ; sans réponse, sur un 404 ou un refus, ou sans liste : un lanceur ancien, qui ne connaît que base/fetch, base/build et base/purge. */
export function knownVerbs(r) {
  const list = r && r.ok !== false && Array.isArray(r.verbs) ? r.verbs.filter(v => typeof v === 'string' && /^[a-z]+\/[a-z]+$/.test(v)) :
    null;
  return list || [...OLD_VERBS];
}
/** Le lanceur connaît-il ce verbe de ce jeu ? `known` : knownVerbs() (absente : celle d'un lanceur ancien). */
export function verbKnown(known, set, verb) {
  return (Array.isArray(known) ? known : OLD_VERBS).includes(verbKey(set, verb));
}
/** L'état des boutons d'un panneau : { reason, verbs: { <verbe>: { disabled, reason } } }. `s` : { set, verbs (par défaut ceux du jeu), launcher,
 *  known (knownVerbs), busy (une opération tourne, la nôtre ou une autre, une question est posée), offline, items (nombre d'éléments cochés ;
 *  absent : le jeu n'en coche pas) }. Les raisons communes passent dans l'ordre no-launcher, busy, offline, « aucun élément » (SETS[set].noItem) ;
 *  un verbe que le lanceur ne connaît pas est gris pour sa raison propre, 'unknown-verb'. La raison du panneau, écrite une fois : no-launcher ; puis
 *  'unknown-verb' quand aucun des verbes n'est connu ; puis la commune ; puis 'unknown-verb' pour un verbe seul. */
export function setGate(s) {
  const spec = SETS[s.set] || {},
    verbs = s.verbs || spec.verbs || [],
    common = !s.launcher ? 'no-launcher' : s.busy ? 'busy' : s.offline ? 'offline' : s.items !== undefined && s.items !== null && !(s
      .items > 0) &&
    spec.noItem ? spec.noItem : null,
    per = Object.fromEntries(verbs.map(v => {
      const unknown = !verbKnown(s.known, s.set, v),
        reason = common || (unknown ? 'unknown-verb' : null);
      return [v, {
        disabled: !!reason,
        reason
      }];
    })),
    all = verbs.length > 0 && verbs.every(v => !verbKnown(s.known, s.set, v)),
    some = verbs.some(v => !verbKnown(s.known, s.set, v)),
    reason = !s.launcher ? 'no-launcher' : all ? 'unknown-verb' : common || (some ? 'unknown-verb' : null);
  return {
    reason,
    verbs: per
  };
}
/** Les États qui ont une source en bloc : la France (« LF », l'eAIP du SIA) et les États-Unis (« K », le CIFP de la FAA). Les États lus par EAD
 *  Basic ne se lisent jamais en bloc (frame/aerodb/EAD_BASIC.md § 1) : un terrain par geste, « Relire » ; ils ne sont pas proposés. */
export const BULK_STATES = ['LF', 'K'];
/** Le nom des États en bloc quand coverageByState() n'en donne pas (les États-Unis n'y figurent pas). */
export const BULK_NAMES = {
  LF: ['France', 'France', 'Frankreich', 'Francia'],
  K: ['États-Unis', 'United States', 'Vereinigte Staaten', 'Estados Unidos']
};
/** Le nom d'un État en bloc dans la langue (index li) : celui de coverageByState(), sinon BULK_NAMES, sinon le préfixe. */
export const bulkName = (byState, id, li = 0) => byState?.[id]?.names?.[li] || BULK_NAMES[id]?.[li] || id;
/** Les États à proposer pour les procédures : ceux qui ont une source en bloc (BULK_STATES), [{ id (le préfixe), name, level (celui de
 *  coverageByState(), sinon null) }] dans l'ordre des noms ; aucun n'est coché d'office (le module le décide). */
export function procItems(byState, li = 0) {
  const lang = ['fr', 'en', 'de', 'es'][li] || 'fr';
  return BULK_STATES.map(id => ({
    id,
    name: bulkName(byState, id, li),
    level: byState?.[id]?.level ?? null
  })).sort((a, b) => a.name.localeCompare(b.name, lang) || a.id.localeCompare(b.id));
}
/** Les types OACI tapés dans le champ des appareils : séparés par des virgules ou des espaces, mis en majuscules, sans doublon ; { codes
 *  (les valides, `^[A-Z0-9]{2,4}$`), bad (les refusés, tels que tapés en majuscules) }. Un champ vide est valide : les types de la flotte. */
export function parseCodes(text) {
  const parts = [...new Set(String(text ?? '').split(/[\s,]+/).map(x => x.trim().toUpperCase()).filter(Boolean))],
    ok = x => /^[A-Z0-9]{2,4}$/.test(x);
  return {
    codes: parts.filter(ok),
    bad: parts.filter(x => !ok(x))
  };
}
/** Les arguments d'un travail d'un jeu, pour un verbe (sans `dry`, que l'appelant ajoute pour un plan) : base { zones, personal } (la purge : zones
 *  seules), proc { states }, vfr { cycle } (date d'effet), aircraft { codes } (vide : les types de la flotte). `sel` : { ids, personal, cycle, codes }. */
export function setArgs(set, verb, sel = {}) {
  const ids = [...(sel.ids || [])];
  if (set === 'base') return verb === 'purge' ? {
    zones: ids
  } : {
    zones: ids,
    personal: [...(sel.personal || [])]
  };
  if (set === 'proc') return {
    states: [...new Set(ids)].sort() // 1 à 2 préfixes, triés et sans doublon (« K » avant « LF »), comme le lanceur les prend
  };
  if (set === 'vfr') return verb === 'purge' ? {} : {
    cycle: sel.cycle
  };
  return verb === 'purge' ? {} : {
    codes: [...(sel.codes || [])]
  };
}
/** Le jeu et le verbe dont une vue est le travail : { set, verb } ou null (un autre travail du lanceur). Une vue qui dit son jeu et son verbe
 *  (le lanceur le fait) est lue d'après eux ; une vue sans verbe qui porte ses zones est une construction de la base.
 *  `aircraft/publish` est connu aussi. */
export function viewOp(v) {
  if (!v || typeof v !== 'object') return null;
  if (SETS[v.set]?.verbs.includes(v.verb)) return {
    set: v.set,
    verb: v.verb
  };
  if (v.set === SHEETS.set && v.verb === SHEETS.verb) return {
    set: SHEETS.set,
    verb: SHEETS.verb
  };
  if (v.set === PICKUP.set && v.verb === PICKUP.verb) return {
    set: PICKUP.set,
    verb: PICKUP.verb
  };
  const zones = !!v.zones && typeof v.zones === 'object' && !Array.isArray(v.zones);
  return zones && !v.verb ? {
    set: 'base',
    verb: 'build'
  } : null;
}
/** La vue est-elle le plan à blanc (args.dry) d'une purge ou d'une publication de fiches, de n'importe quel jeu ? */
export function opDry(v) {
  const op = viewOp(v);
  return !!op && (op.verb === 'purge' || op.verb === 'publish' || op.verb === 'pickup') && v.args?.dry === true;
}
/** L'état de l'élément unique d'un jeu à un seul élément (le cycle) d'après le travail : l'état de la zone qu'un jeu par éléments aurait. */
function singleState(verb, v) {
  const run = {
    build: 'building',
    fetch: 'fetching',
    purge: 'purging'
  } [verb];
  if (v?.state === 'cancelled') return 'cancelled';
  if (v?.state === 'error' || obj(v?.result).ok === false) return 'failed';
  if (v?.state === 'done') return verb === 'build' ? 'built' : 'done';
  return v?.state === 'running' ? run : 'waiting';
}
/** La vue d'un travail d'un jeu autre que la base, ramenée à la forme de la base (`zones` à la racine, `zone` dans les échecs et les sources
 *  manuelles) pour que outcome, fetchOutcome, purgeOutcome, zoneRows et sourceRows servent à tous. La base et ce qui n'est pas une vue : rendus
 *  tels quels. Les éléments sont ceux de la clé du jeu (states, codes, cycle) ; un jeu à un seul élément (le cycle) en reçoit un d'après
 *  l'état du travail. */
export function normView(set, v) {
  const spec = SETS[set];
  if (!spec || set === 'base' || !v || typeof v !== 'object') return v;
  const raw = v[spec.view || spec.arg],
    r = obj(v.result),
    fix = list => (Array.isArray(list) ? list : []).filter(x => x && typeof x === 'object').map(x => ({
      ...x,
      zone: x.zone ?? ITEM_KEYS.map(k => x[k]).find(y => typeof y === 'string' && y) ?? null
    }));
  let zones = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  if (spec.single && !Object.keys(zones).length) {
    const id = String(v.args?.cycle ?? (typeof raw === 'string' ? raw : v.cycle ?? ''));
    if (id) zones = {
      [id]: {
        state: singleState(v.verb, v)
      }
    };
  }
  if (v.verb === 'build') zones = Object.fromEntries(Object.entries(zones).map(([k, z]) => [k, z && z.state === 'done' ? {
    ...z,
    state: 'built'
  } : z])); // un jeu autre que la base dit « done » où la base dit « construite »
  const stepsDone = set === 'aircraft' && Array.isArray(r.steps) ? r.steps.filter(x => typeof x === 'string') : null;
  return {
    ...v,
    zones,
    ...(v.result && typeof v.result === 'object' ? {
      result: {
        ...r,
        // aircraft/fetch et aircraft/build : `steps` liste les étapes faites ; `failed[].item` nomme l'étape en échec
        ...(r.built && typeof r.built === 'object' && !Array.isArray(r.built) ? {
          built: Object.keys(r.built).filter(k => num(r.built[k]) === null || r.built[k] >
            0) // proc/build : { État: nombre de terrains }
        } : {}),
        ...(stepsDone ? {
          built: r.built ?? stepsDone,
          fetched: r.fetched ?? stepsDone,
          unchanged: r.unchanged ?? []
        } : {}),
        ...(Array.isArray(r.failed) ? {
          failed: fix(r.failed)
        } : {}),
        ...(Array.isArray(r.manual) ? {
          manual: fix(r.manual)
        } : {})
      }
    } : {})
  };
}
/** La fin d'une prise de fichiers (base/pickup), plan à blanc ou réelle, d'après la dernière vue : { kind, dry, taken [{ zone, source, zip, files [noms], bytes }],
 *  missing [{ zone, source, expected }], failed [{ zone, source, error }], files (nombre de fichiers pris), bytes, level } ; kind : 'done' | 'partial' | 'failed' |
 *  'cancelled' | 'interrupted' | 'nothing' (rien de pris ni d'en échec : aucun fichier au nom attendu dans Téléchargements). */
export function pickupOutcome(final) {
  const r = obj(final?.result),
    list = v => (Array.isArray(v) ? v : []).filter(x => x && x.zone && x.source),
    taken = list(r.taken).map(t => ({
      zone: t.zone,
      source: t.source,
      zip: String(t.zip ?? ''),
      size: num(t.size),
      files: strs(t.files),
      bytes: num(t.bytes) ?? 0
    })),
    missing = list(r.missing).map(m => ({
      zone: m.zone,
      source: m.source,
      expected: String(m.expected ?? '')
    })),
    failed = list(r.failed).map(f => ({
      zone: f.zone,
      source: f.source,
      error: f.error ?? null,
      ...(typeof f.zip === 'string' ? {
        zip: f.zip
      } : {}),
      ...(num(f.size) !== null ? {
        size: f.size
      } : {})
    }));
  let kind;
  if (final?.state === 'interrupted') kind = 'interrupted';
  else if (final?.state === 'cancelled' || r.reason === 'cancelled') kind = 'cancelled';
  else if (r.reason === 'partial' || r.reason === 'failed') kind = r.reason;
  else if (final?.state === 'error' || r.ok === false) kind = 'failed';
  else kind = taken.length ? failed.length ? 'partial' : 'done' : failed.length ? 'failed' : 'nothing';
  return {
    kind,
    dry: r.dry === true,
    taken,
    missing,
    failed,
    files: taken.reduce((a, t) => a + t.files.length, 0),
    bytes: taken.reduce((a, t) => a + t.bytes, 0),
    level: kind === 'done' ? 'ok' : kind === 'failed' ? 'err' : 'warn'
  };
}
/** Les zips que le plan a montrés, pour la prise réelle : { <source>: { name, size } } construit des seules entrées `taken` du plan (jamais relu), une par source (la première),
 *  seulement pour une source connue, un nom de fichier simple (le motif du lanceur : lettres, chiffres, espace, point, parenthèses, + et -) et une taille entière positive ou nulle.
 *  Le lanceur refuse la source dont le zip le plus récent n'est plus celui-là (« changed »). */
export function pickupZips(taken) {
  return pickupSplit(taken).zips;
}
/** Le zip d'une entrée du plan peut-il être envoyé au lanceur ? Source connue, nom de fichier simple (le motif du lanceur), taille entière positive ou nulle. */
const zipSendable = t => !!t && t.source in PICKUP_DEST && typeof t.zip === 'string' && /^[A-Za-z0-9_ .()+-]{1,150}$/.test(t.zip) && Number
  .isInteger(t.size) && t.size >= 0;
/** Ce que la prise réelle peut faire du plan montré : { ready (les entrées dont le zip peut être envoyé), blocked (les autres : un nom hors de la règle, une taille absente… ; la prise
 *  réelle ne les lance pas, car le lanceur prendrait « le plus récent » sans contrôle), zips (celui de chaque source prête : { name, size }, le premier par source), zones (les zones
 *  à lancer : celles qui ont une entrée prête et aucune entrée bloquée) }. */
/** Refus d'une prise qui appellent un nouveau plan : le zip a changé depuis le plan (changed), ou la source n'y figurait pas
 *  (not-shown, lanceur 8965e8c47) ; dits avec « Relancer le plan ». */
export const REPLAN_ERRORS = Object.freeze(['changed', 'not-shown']);
export function pickupSplit(taken) {
  const list = (Array.isArray(taken) ? taken : []).filter(t => t && typeof t === 'object'),
    ready = list.filter(zipSendable),
    blocked = list.filter(t => !zipSendable(t)),
    zips = {};
  for (const t of ready)
    if (!(t.source in zips)) zips[t.source] = {
      name: t.zip,
      size: t.size
    };
  const bad = new Set(blocked.map(t => t.zone));
  return {
    ready,
    blocked,
    zips,
    zones: [...new Set(ready.map(t => t.zone))].filter(z => !bad.has(z))
  };
}
/** Une entrée du journal pour une prise réelle (le plan n'y est jamais) : { at, set: 'base', verb: 'pickup', zones, seconds, result, files, bytes, failed, job? }. */
export function pickupEntry({
  at,
  zones,
  seconds,
  out,
  job
}) {
  return {
    at: new Date(at).toISOString(),
    set: 'base',
    verb: 'pickup',
    zones: [...zones],
    seconds: seconds === null || seconds === undefined ? null : Math.max(0, Math.round(seconds)),
    result: journalResult(out.kind),
    files: out.files,
    bytes: out.bytes,
    failed: out.failed.map(f => ({
      zone: f.zone,
      source: f.source,
      error: f.error ?? null
    })),
    ...(job ? {
      job: String(job)
    } : {})
  };
}
/** Un compte : le nombre d'une liste, ou le nombre lui-même ; 0 sinon. */
const countOf = v => Array.isArray(v) ? v.length : num(v) ?? 0;
/** La fin d'un téléchargement des cartes VAC (vfr/fetch), d'après la vue ramenée à la base : { kind, fetched, unchanged, failed [{ zone (l'OACI),
 *  error }], manual, outside, level, counts { fetched, unchanged, notPublished } } ; kind : 'done' | 'partial' | 'failed' | 'cancelled' |
 *  'interrupted' | 'no-base' (aucune base SIA de ce cycle sur le poste) | 'not-published' (le SIA ne publie pas encore le cycle). fetched et
 *  unchanged sont des nombres (de cartes) chez le lanceur ; une carte absente compte dans notPublished, jamais comme un échec. */
export function vfrFetchOutcome(final) {
  const r = obj(final?.result),
    failed = (Array.isArray(r.failed) ? r.failed : []).filter(f => f && f.zone).map(f => ({
      zone: f.zone,
      error: f.error ?? null
    })),
    counts = {
      fetched: countOf(r.fetched),
      unchanged: countOf(r.unchanged),
      notPublished: countOf(r.notPublished)
    };
  let kind;
  if (final?.state === 'interrupted') kind = 'interrupted';
  else if (final?.state === 'cancelled' || r.reason === 'cancelled') kind = 'cancelled';
  else if (['no-base', 'not-published', 'partial', 'failed'].includes(r.reason)) kind = r.reason;
  else if (final?.state === 'error' || r.ok === false) kind = 'failed';
  else kind = failed.length ? counts.fetched || counts.unchanged ? 'partial' : 'failed' : 'done';
  return {
    kind,
    fetched: [],
    unchanged: [],
    failed,
    manual: [],
    outside: 0,
    level: kind === 'failed' || kind === 'no-base' ? 'err' : kind === 'done' && !counts.notPublished ? 'ok' : 'warn',
    counts
  };
}
/** La fin d'une opération d'un jeu : { verb, out }, `out` calculé par outcome, fetchOutcome ou purgeOutcome sur la vue ramenée à la base
 *  (normView) ; pour un jeu à un seul élément dont le résultat ne liste rien, l'élément (le cycle) est compté d'après la fin. */
export function setOutcome(set, verb, final) {
  const v = normView(set, final),
    out = set === 'vfr' && verb === 'fetch' ? vfrFetchOutcome(v) : verb === 'fetch' ? fetchOutcome(v) : verb === 'purge' ? purgeOutcome(v) :
    verb ===
    'pickup' ? pickupOutcome(v) : outcome(v);
  if (SETS[set]?.single && out.kind === 'done' && verb === 'build' && !out.built.length) out.built = Object.keys(obj(v?.zones));
  if (set === 'proc' && verb === 'fetch') { // proc/fetch : fetched et unchanged sont des nombres de terrains (ou des listes d'États)
    const r = obj(v?.result);
    if (typeof r.fetched === 'number' || typeof r.unchanged === 'number') out.counts = {
      fetched: countOf(r.fetched),
      unchanged: countOf(r.unchanged)
    };
  }
  if (set === 'vfr' && verb === 'build') { // sans trigramme le lanceur ne commite pas (commit null, warning) : la page le dit
    const r = obj(v?.result);
    out.commit = typeof r.commit === 'string' && r.commit ? r.commit : null;
    out.noCommit = out.kind === 'done' && !out.commit;
  }
  return {
    verb,
    out
  };
}
/** Une entrée du journal pour une opération d'un jeu : celle de la base (journalEntry, fetchEntry, purgeEntry : le verbe de téléchargement s'écrit
 *  « download ») ; pour un autre jeu, `set` à sa valeur et les éléments sous `items` (au lieu de `zones`). `ids` : les éléments du travail. */
export function setEntry(set, verb, {
  at,
  ids,
  seconds,
  out,
  job
}) {
  const make = {
      build: journalEntry,
      fetch: fetchEntry,
      purge: purgeEntry,
      pickup: pickupEntry
    } [verb],
    e = make({
      at,
      zones: ids,
      seconds,
      out,
      job
    });
  if (set === 'base') return e;
  const {
    zones,
    ...rest
  } = e;
  return {
    ...rest,
    set,
    items: zones,
    ...(out.counts ? {
      counts: out.counts
    } : {}) // vfr/fetch : les cartes téléchargées, déjà là, pas encore publiées
  };
}
/** Le plan d'une publication de fiches (aircraft/publish à blanc), d'après la dernière vue : { remove: [..], copy: [..] } ; le plan est
 *  `result.plan`, à défaut le résultat lui-même ; { removed, copied } sont les comptes. */
export function sheetsPlan(final) {
  const r = obj(final?.result),
    p = obj(r.plan && typeof r.plan === 'object' ? r.plan : r),
    list = v => Array.isArray(v) ? v : [];
  const size = l => list(l).reduce((a, x) => a + (num(x?.size) ?? 0), 0);
  return {
    remove: list(p.remove),
    copy: list(p.copy),
    removed: countOf(p.remove),
    copied: countOf(p.copy),
    bytes: size(p.remove) + size(p.copy)
  };
}
/** La fin d'une publication de fiches, d'après la dernière vue : { kind, copied, removed, nothing, level } ; kind : 'done' | 'failed' |
 *  'cancelled' | 'interrupted' | 'no-author' (trigramme non réglé) ; copied et removed : les comptes (de `result.copied` / `result.removed`, à défaut du plan) ; nothing : réussi,
 *  rien à copier ni à retirer. */
export function sheetsOutcome(final) {
  const r = obj(final?.result),
    p = sheetsPlan(final),
    copied = num(r.copied) ?? (Array.isArray(r.copied) ? r.copied.length : p.copied),
    removed = num(r.removed) ?? (Array.isArray(r.removed) ? r.removed.length : p.removed);
  let kind;
  if (final?.state === 'interrupted') kind = 'interrupted';
  else if (final?.state === 'cancelled' || r.reason === 'cancelled') kind = 'cancelled';
  else if (r.reason === 'no-author' || r.reason === 'merge-pending') kind = r.reason;
  else if (final?.state === 'error' || r.ok === false || r.reason === 'failed') kind = 'failed';
  else kind = 'done';
  return {
    kind,
    copied,
    removed,
    nothing: kind === 'done' && copied === 0 && removed === 0,
    level: kind === 'failed' || kind === 'no-author' || kind === 'merge-pending' ? 'err' : kind === 'done' ? 'ok' : 'warn'
  };
}
/** Une entrée du journal pour une publication de fiches réelle (le plan n'y est jamais) : { at, set: 'aircraft', verb: 'publish', items: [],
 *  seconds, result, copied, removed, job? }. */
export function sheetsEntry({
  at,
  seconds,
  out,
  job
}) {
  return {
    at: new Date(at).toISOString(),
    set: SHEETS.set,
    verb: SHEETS.verb,
    items: [],
    seconds: seconds === null || seconds === undefined ? null : Math.max(0, Math.round(seconds)),
    result: journalResult(out.kind),
    copied: out.copied,
    removed: out.removed,
    ...(job ? {
      job: String(job)
    } : {})
  };
}

// ---------------------------------------------------------------- « Tout mettre à jour » (SPEC § 5.3)
/** Les jeux de la chaîne dans l'ordre publié (SPEC § 4.5 : la base, les procédures, les points VFR qui ont besoin de la base, les appareils), chacun avec
 *  ses deux verbes : télécharger, puis construire. Ni purge ni `aircraft/publish` dans la chaîne. */
export const CHAIN_SETS = ['base', 'proc', 'vfr', 'aircraft'];
/** Les verbes d'un jeu dans la chaîne, dans l'ordre. */
export const CHAIN_VERBS = ['fetch', 'build'];
/** Le verdict de la chaîne sur la fin d'une opération : 'ok' (fait), 'nothing' (rien de neuf : un téléchargement qui n'a rien à prendre, « nothing » du
 *  lanceur, ou des cartes pas encore publiées : la chaîne continue) ou 'stop' (tout le reste : échec, échec partiel, arrêt, interruption, motif propre,
 *  fusion en attente). `out` : la fin calculée par setOutcome. */
export function chainVerdict(verb, out) {
  const k = out?.kind;
  if (k === 'done') return 'ok';
  return verb === 'fetch' && (k === 'nothing' || k === 'not-published') ? 'nothing' : 'stop';
}
/** Les groupes dont un jeu publié a un cycle dépassé (la règle de la ligne « cycle X dépassé, à reconstruire pour Y »), d'après buildGroups() :
 *  { base, proc } : le plus ancien cycle publié « AANN » des lignes dépassées de ce groupe, null sans. */
export function staleGroups(groups) {
  const out = {
    base: null,
    proc: null
  };
  for (const g of groups || []) {
    if (!(g.id in out)) continue;
    const old = [...g.rows, ...g.more].filter(r => r.state === 'stale-cycle' && r.cycle).map(r => r.cycle).sort();
    out[g.id] = old[0] || null;
  }
  return out;
}
/** Le journal avec une opération de plus, ou, si une entrée du même travail (`job`) s'y trouve, remplacée par celle-ci (la fin d'une chaîne remplace son
 *  repère de départ) ; borné aux `max` dernières. */
export function journalSet(list, entry, max = JOURNAL_MAX) {
  const i = entry.job ? list.findIndex(e => e.job === entry.job) : -1;
  if (i < 0) return [...list, entry].slice(-max);
  return list.map((e, k) => k === i ? entry : e);
}
/** Une entrée du journal pour « Tout mettre à jour » : { at, set: 'all', verb: 'update', items: [{ set, result }], seconds, result, job }. `result` :
 *  'running' (le repère du départ, sans fin), 'done', 'failed', 'cancelled' ou 'interrupted' (la page a été rechargée en route). */
export function chainEntry({
  at,
  items,
  seconds,
  result,
  job
}) {
  return {
    at: new Date(at).toISOString(),
    set: 'all',
    verb: 'update',
    items: items.map(i => ({
      set: i.set,
      result: i.result
    })),
    seconds: seconds === null || seconds === undefined ? null : Math.max(0, Math.round(seconds)),
    result,
    job: String(job)
  };
}
/** Un repère de chaîne resté sans fin dans le journal : l'entrée { set: 'all', verb: 'update', result: 'running' } la plus récente, ou null. */
export function openChain(list) {
  return [...list].reverse().find(e => e.set === 'all' && e.verb === 'update' && e.result === 'running') || null;
}

// ---------------------------------------------------------------- la carte des zones à cocher
/** Les zones d'aerodb que dessine la carte pour chaque État du panneau des procédures : la France pour « LF », les États-Unis pour « K ». */
export const PROC_ZONES = {
  LF: ['fr'],
  K: ['us']
};
/** Le côté, en pixels, sous lequel une zone n'est pas assez grande pour le doigt : sans carte si l'une des zones à cocher est plus petite (SPEC § 3). */
export const MAP_MIN_PX = 44;
/** La teinte d'une zone sur la carte : 'muted' (hors de la couverture), 'accent' (une opération la traite), 'warn' (rien de publié ou cycle dépassé), 'ok' (à jour). */
export function mapTone({
  inCoverage,
  running,
  published,
  stale
}) {
  return !inCoverage ? 'muted' : running ? 'accent' : !published || stale ? 'warn' : 'ok';
}
/** Un nombre arrondi à trois décimales (les coordonnées du dessin). */
const r3 = v => Math.round(v * 1000) / 1000;
/** Le contour d'une zone n'est-il qu'un cadre ? Vrai sans aucun anneau, ou quand l'unique anneau est exactement le rectangle de son `box` (quatre coins, fermé ou non, dans
 *  n'importe quel ordre) : le contour est alors approximatif. Jamais d'après le nom ou l'identifiant d'une zone. Faux sans `box` lisible. */
export function isApproxOutline(e) {
  if (!e || !Array.isArray(e.box) || e.box.length !== 4 || !e.box.every(Number.isFinite)) return false;
  const rings = Array.isArray(e.rings) ? e.rings : [];
  if (!rings.length) return true;
  if (rings.length !== 1 || !Array.isArray(rings[0])) return false;
  const ring = rings[0],
    pts = ring.length > 1 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1] ? ring.slice(0, -1) : ring,
    [w, s, ea, n] = e.box,
    corners = new Set([
      [w, s],
      [ea, s],
      [ea, n],
      [w, n]
    ].map(String)),
    got = new Set(pts.map(p => String([p[0], p[1]])));
  return pts.length === 4 && got.size === 4 && [...got].every(p => corners.has(p));
}
/** La carte de zones, projetée et mesurée : `entries` [{ id, rings [[[lon, lat], …]], box [w, s, e, n] }], `widthPx` la largeur disponible, `maxH` la hauteur maximale.
 *  Projection équirectangulaire x = lon·cos φ0, y = −lat sur le cadre qui réunit les zones (φ0 : sa latitude médiane), 5 % de marge. Rend null sans zone ; sinon { vb [x, y, w, h]
 *  (le viewBox), w, h (pixels), scale (pixels par unité), small (une zone à cocher fait moins de MAP_MIN_PX en largeur ou en hauteur : pas de carte), shapes [{ id, d, approx
 *  (contour approximatif : voir isApproxOutline) }] }. Une zone sans anneau est dessinée par le rectangle de son cadre. */
export function zoneMap(entries, widthPx, maxH = 260) {
  const list = (entries || []).filter(e => e && Array.isArray(e.box) && e.box.length === 4 && e.box.every(Number.isFinite) && Array.isArray(
    e.rings));
  if (!list.length) return null;
  const box = list.reduce((b, e) => [Math.min(b[0], e.box[0]), Math.min(b[1], e.box[1]), Math.max(b[2], e.box[2]), Math.max(b[3], e.box[
      3])], [180, 90, -180, -90]),
    k = Math.max(0.05, Math.cos((box[1] + box[3]) / 2 * Math.PI / 180)),
    W = Math.max(1e-6, (box[2] - box[0]) * k),
    H = Math.max(1e-6, box[3] - box[1]),
    vb = [box[0] * k - W * 0.05, -box[3] - H * 0.05, W * 1.1, H * 1.1],
    scale = Math.min(Math.max(0, widthPx) / vb[2], maxH / vb[3]);
  return {
    vb: vb.map(r3),
    w: r3(vb[2] * scale),
    h: r3(vb[3] * scale),
    scale,
    small: list.some(e => (e.box[2] - e.box[0]) * k * scale < MAP_MIN_PX || (e.box[3] - e.box[1]) * scale < MAP_MIN_PX),
    shapes: list.map(e => ({
      id: e.id,
      approx: e.approx === true || isApproxOutline(e),
      d: (e.rings.length ? e.rings : [
        [
          [e.box[0], e.box[1]],
          [e.box[2], e.box[1]],
          [e.box[2], e.box[3]],
          [e.box[0], e.box[3]],
          [e.box[0], e.box[1]]
        ]
      ]).map(ring => `M${ring.map(([lon, lat]) => `${r3(lon * k)} ${r3(-lat)}`).join('L')}Z`).join('')
    }))
  };
}

// ---------------------------------------------------------------- publier la base (échange avec le dépôt des données)
/** L'état du bouton « Publier » : { disabled, reason } ; reason : 'no-launcher' | 'publishing' | 'building' | 'busy' | 'no-gesture' |
 *  'nothing' | 'offline' | null. `s` : { launcher (le poste en a un), publishing (une publication tourne, ou sa question est posée),
 *  building (la construction de la base tourne), other (une autre opération du lanceur tourne), gesture (le cadre sait publier :
 *  ctx.data.sync.gesture === true), nothing (l'état du poste est lu et il n'y a rien à envoyer), offline }. Une seule raison, la
 *  première de cet ordre. */
export function publishState(s) {
  const reason = !s.launcher ? 'no-launcher' : s.publishing ? 'publishing' : s.building ? 'building' : s.other ? 'busy' : !s.gesture ?
    'no-gesture' : s.nothing ? 'nothing' : s.offline ? 'offline' : null;
  return {
    disabled: !!reason,
    reason
  };
}
/** Ce que dit GET sync-status (tools/launch.py) : { known, changes, ahead, merging, nothing, last } ; known : la réponse est lisible ;
 *  nothing : lue, rien à envoyer (ni fichier modifié, ni commit en avance, ni fusion en attente) ; last : { at, pushed } du dernier
 *  passage, null sans. Une réponse illisible (null, refus) : known faux, jamais « rien à publier ». */
export function publishCounts(st) {
  if (!st || typeof st !== 'object' || st.ok === false || st.repo === false) return {
    known: false,
    changes: null,
    ahead: null,
    merging: false,
    nothing: false,
    last: null
  };
  const changes = num(st.changes) ?? 0,
    ahead = num(st.ahead) ?? 0,
    merging = st.merging === true,
    at = typeof st.last?.at === 'string' && st.last.at ? st.last.at : null;
  return {
    known: true,
    changes,
    ahead,
    merging,
    nothing: changes === 0 && ahead === 0 && !merging,
    last: at ? {
      at,
      pushed: st.last.pushed === true
    } : null
  };
}
/** La fin d'une publication, d'après le résultat de ctx.data.sync({ gesture: true }) : { kind, committed, held, received, conflicts,
 *  refused, message } ; kind : 'done' (envoyé), 'local' (ok, mais rien n'est parti : pas de dépôt distant), 'no-exchange' (le cadre
 *  n'a fait aucun échange avec le lanceur : trigramme non réglé…), 'failed' (échec : message = ce que dit le lanceur, à défaut le
 *  cadre). Les nombres sont tous des nombres (0 sans valeur). C'est le seul endroit qui connaît la forme du résultat du cadre. */
export function publishOutcome(r) {
  const x = r && typeof r.exchange === 'object' && r.exchange ? r.exchange : null,
    out = {
      committed: num(x?.committed) ?? 0,
      held: num(x?.held) ?? 0,
      received: num(x?.received) ?? 0,
      conflicts: Array.isArray(x?.conflicts) ? x.conflicts.length : num(x?.conflicts) ?? 0, // le cadre rend un nombre, le lanceur une liste
      refused: Array.isArray(x?.refused) ? x.refused.length : num(x?.refused) ?? 0,
      message: String(x?.message || r?.error || r?.warning || '')
    };
  const failed = !r || r.ok === false || x?.ok === false;
  return {
    kind: failed ? 'failed' : !x ? 'no-exchange' : x.pushed === true ? 'done' : 'local',
    ...out
  };
}
/** Une entrée du journal pour une publication : { at (UTC ISO), set, verb, result, committed, received, held, conflicts }. `at` :
 *  instant en ms ; result : 'failed' pour un échec, 'done' sinon. */
export function publishEntry(at, out) {
  return {
    at: new Date(at).toISOString(),
    set: 'base',
    verb: 'publish',
    result: out.kind === 'failed' || out.kind === 'no-exchange' ? 'failed' : 'done', // rien n'est parti : jamais « done »
    committed: out.committed,
    received: out.received,
    held: out.held,
    conflicts: out.conflicts
  };
}
