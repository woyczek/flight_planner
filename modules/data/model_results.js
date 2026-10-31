// V3 data — le calcul pur de la fin d'un travail, pour chaque verbe (SPEC § 11) : les fins (outcome, fetchOutcome, purgeOutcome, pickupOutcome, setOutcome…), le refus d'un départ, la prise de fichiers, le plan des fiches, les entrées et la liste du journal.
// Ni état, ni page, ni appel : ne choisit pas les jeux ni les verbes (model_sets.js) et ne dessine rien.
import {
  normView,
  num,
  own,
  PICKUP_DEST,
  SETS,
  SHEETS
} from './model_sets.js';
import {
  entryHead,
  jobOf,
  obj
} from './model_kit.js';

/** Dernières opérations gardées dans cache/data/journal.json. */
export const JOURNAL_MAX = 50;
/** Les motifs du lanceur qui sont chacun une fin à part d'une construction (une phrase chacun) : le navigateur, X-Plane, les appareils (aucun type,
 *  script absent), les points VFR (pypdf manque, aucune carte en cache, plan refusé) et, pour tous les jeux, une fusion qui attend dans data/
 *  (rien n'est écrit : « merge-pending »). */
const EXTRA_KINDS = ['no-browser', 'xplane-in-page', 'no-codes', 'no-script', 'no-pypdf', 'no-cache', 'invalid', 'merge-pending'];
/** Unités de taille par langue (base 1024). */
const SIZE_UNITS = {
  fr: ['o', 'Ko', 'Mo', 'Go'],
  en: ['B', 'KB', 'MB', 'GB'],
  de: ['B', 'KB', 'MB', 'GB'],
  es: ['B', 'KB', 'MB', 'GB']
};
/** Le genre de la fin d'un travail, la chaîne commune à tous les lecteurs de fin : interrompu, arrêté (l'état de la vue, ou le motif « cancelled »), un motif du lanceur
 *  renommé par `map` (motif → genre) ou repris tel quel s'il est dans `pass`, échec (l'état « error » de la vue ou `ok: false`), sinon `fallback` (le genre que les champs
 *  propres au verbe donnent). `final` : la dernière vue ; `r` : son résultat (un objet). */
function kindOf(final, r, pass, fallback, map = {}) {
  if (final?.state === 'interrupted') return 'interrupted';
  if (final?.state === 'cancelled' || r.reason === 'cancelled') return 'cancelled';
  const named = own(map, r.reason);
  if (named !== undefined) return named;
  if (pass.includes(r.reason)) return r.reason;
  if (final?.state === 'error' || r.ok === false) return 'failed';
  return fallback;
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
  const kind = kindOf(final, r, [...EXTRA_KINDS, 'partial', 'failed'], failed.length ? built.length ? 'partial' : 'failed' : 'done');
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
/** Une entrée du journal : { at (UTC ISO), set, verb, zones, seconds, result, built, failed, job? }. `at` : instant en ms ; `set` et `key` : pour un autre jeu que la base. */
export function journalEntry({
  at,
  zones,
  seconds,
  out,
  job,
  set = 'base',
  key
}) {
  return {
    ...entryHead({
      at,
      set,
      verb: 'build',
      ids: zones,
      key,
      seconds,
      result: journalResult(out.kind),
      reason: EXTRA_KINDS.includes(out.kind) ? out.kind : undefined
    }),
    built: [...out.built],
    failed: out.failed.map(f => ({
      zone: f.zone,
      error: f.error ?? null
    })),
    ...jobOf(job)
  };
}
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
  const kind = kindOf(final, r, ['no-codes', 'no-script', 'partial', 'failed'], failed.length ? fetched.length || unchanged.length ?
    'partial' : 'failed' : 'done', {
      'nothing-to-fetch': 'nothing'
    });
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
  job,
  set = 'base',
  key
}) {
  return {
    ...entryHead({
      at,
      set,
      verb: 'download',
      ids: zones,
      key,
      seconds,
      result: journalResult(out.kind)
    }),
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
    ...jobOf(job)
  };
}
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
  const kind = kindOf(final, r, ['partial', 'failed'], 'done');
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
  job,
  set = 'base',
  key
}) {
  return {
    ...entryHead({
      at,
      set,
      verb: 'purge',
      ids: zones,
      key,
      seconds,
      result: journalResult(out.kind)
    }),
    files: out.files,
    bytes: out.bytes,
    ...jobOf(job)
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
  const kind = kindOf(final, r, ['partial', 'failed'], taken.length ? failed.length ? 'partial' : 'done' : failed.length ? 'failed' :
    'nothing');
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
const zipSendable = t => !!t && Object.hasOwn(PICKUP_DEST, t.source) && typeof t.zip === 'string' && /^[A-Za-z0-9_ .()+-]{1,150}$/.test(t
    .zip) && Number
  .isInteger(t.size) && t.size >= 0;
/** Refus d'une prise qui appellent un nouveau plan : le zip a changé depuis le plan (changed), ou la source n'y figurait pas
 *  (not-shown, lanceur 8965e8c47) ; dits avec « Relancer le plan ». */
export const REPLAN_ERRORS = Object.freeze(['changed', 'not-shown']);
/** Ce que la prise réelle peut faire du plan montré : { ready (les entrées dont le zip peut être envoyé), blocked (les autres : un nom hors de la règle, une taille absente… ; la prise
 *  réelle ne les lance pas, car le lanceur prendrait « le plus récent » sans contrôle), zips (celui de chaque source prête : { name, size }, le premier par source), zones (les zones
 *  à lancer : celles qui ont une entrée prête et aucune entrée bloquée) }. */
export function pickupSplit(taken) {
  const list = (Array.isArray(taken) ? taken : []).filter(t => t && typeof t === 'object'),
    ready = list.filter(zipSendable),
    blocked = list.filter(t => !zipSendable(t)),
    zips = {};
  for (const t of ready)
    if (!Object.hasOwn(zips, t.source)) zips[t.source] = {
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
  job,
  set = 'base',
  key
}) {
  return {
    ...entryHead({
      at,
      set,
      verb: 'pickup',
      ids: zones,
      key,
      seconds,
      result: journalResult(out.kind)
    }),
    files: out.files,
    bytes: out.bytes,
    failed: out.failed.map(f => ({
      zone: f.zone,
      source: f.source,
      error: f.error ?? null
    })),
    ...jobOf(job)
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
  const kind = kindOf(final, r, ['no-base', 'not-published', 'partial', 'failed'], failed.length ? counts.fetched || counts.unchanged ?
    'partial' : 'failed' : 'done');
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
  const base = set === 'base';
  return {
    ...({
      build: journalEntry,
      fetch: fetchEntry,
      purge: purgeEntry,
      pickup: pickupEntry
    } [verb])({
      at,
      zones: ids,
      seconds,
      out,
      job,
      set,
      key: base ? 'zones' : 'items'
    }),
    ...(!base && out.counts ? {
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
  const kind = kindOf(final, r, ['no-author', 'merge-pending', 'failed'], 'done');
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
    ...entryHead({
      at,
      set: SHEETS.set,
      verb: SHEETS.verb,
      ids: [],
      key: 'items',
      seconds,
      result: journalResult(out.kind)
    }),
    copied: out.copied,
    removed: out.removed,
    ...jobOf(job)
  };
}
