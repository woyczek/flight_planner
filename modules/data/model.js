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
const ZONE_STATES = ['waiting', 'building', 'built', 'failed', 'cancelled'];
const ERROR_CODES = ['browser-failed', 'browser-exited', 'timeout', 'page-error', 'invalid-output', 'write-failed', 'cancelled'];
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
/** L'état du bouton « Construire » : { disabled, reason } ; reason : 'no-launcher' | 'busy' | 'no-zone' | 'offline' | null.
 *  `s` : { launcher (le poste en a un), busy (une opération tourne, la nôtre ou une autre), zones (nombre de zones cochées),
 *  offline }. Une seule raison, la première de cet ordre. */
export function buildState(s) {
  const reason = !s.launcher ? 'no-launcher' : s.busy ? 'busy' : s.offline ? 'offline' : !(s.zones > 0) ? 'no-zone' : null;
  return {
    disabled: !!reason,
    reason
  };
}
/** Ce que dit la ligne d'une zone d'après son état dans la vue du travail : { state, key, n, m, code } ; key : la phrase
 *  (waiting, building, buildingN avec n / m sources, built, failed avec le code d'erreur, cancelled). */
export function zonePhrase(z) {
  const state = ZONE_STATES.includes(z?.state) ? z.state : 'waiting',
    n = num(z?.done),
    m = num(z?.total);
  return {
    state,
    key: state === 'building' && n !== null && m !== null ? 'buildingN' : state,
    n,
    m,
    code: state === 'failed' ? ERROR_CODES.includes(z?.error) ? z.error : 'unknown' : null
  };
}
/** Les lignes de zones à montrer : les zones demandées dans leur ordre (celles que la vue ne connaît pas encore : en attente),
 *  puis celles que la vue ajoute ; [{ zone, ...zonePhrase }]. */
export function zoneRows(view, ids) {
  const zs = view?.zones && typeof view.zones === 'object' ? view.zones : {};
  return [...ids, ...Object.keys(zs).filter(z => !ids.includes(z))].map(zone => ({
    zone,
    ...zonePhrase(zs[zone])
  }));
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
/** La vue d'un travail est-elle celle d'une construction de la base ? (elle porte les zones, ou dit son jeu et son verbe). */
export function isBuildView(v) {
  return !!v && (v.set === 'base' && v.verb === 'build' || !!v.zones && typeof v.zones === 'object' && !Array.isArray(v.zones));
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
  else if (r.reason === 'no-browser' || r.reason === 'xplane-in-page') kind = r.reason;
  else if (r.reason === 'cancelled') kind = 'cancelled';
  else if (r.reason === 'partial' || r.reason === 'failed') kind = r.reason;
  else if (final?.state === 'error' || r.ok === false) kind = 'failed';
  else kind = failed.length ? built.length ? 'partial' : 'failed' : 'done';
  return {
    kind,
    built,
    failed
  };
}
/** Le résultat d'une opération pour le journal : 'done' | 'partial' | 'failed' | 'cancelled' | 'interrupted'. */
export const journalResult = kind => ['done', 'partial', 'cancelled', 'interrupted'].includes(kind) ? kind : 'failed';
/** Le refus d'un départ (la forme d'un refus de ctx.launcher) en { key, wait } ; key : busy | tooSoon | unknown-route | bad-args |
 *  offline | refused | failed. */
export function refusal(r) {
  const key = r?.status === 409 ? 'busy' : r?.status === 429 && r.reason === 'too-soon' ? 'tooSoon' : r?.status === 404 ? 'unknown-route' :
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
    ...(out.kind === 'no-browser' || out.kind === 'xplane-in-page' ? {
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
