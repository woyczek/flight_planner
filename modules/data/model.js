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
