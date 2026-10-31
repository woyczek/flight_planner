// V3 data — le calcul pur des jeux et de leurs verbes (SPEC § 11) : SETS, les verbes connus, setGate, les arguments d'un travail, la vue d'un travail lue et ramenée à la forme de la base, les États en bloc, `own` et `num`.
// Ni état, ni page, ni appel : ne lit pas la fin d'un travail (model_results.js) et ne connaît ni la chaîne, ni la carte, ni la publication.
import {
  obj
} from './model_kit.js';

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
const ERROR_CODES = ['browser-failed', 'browser-exited', 'timeout', 'page-error', 'invalid-output', 'write-failed', 'cancelled'];
/** Codes d'échec d'une source téléchargée (base/fetch). */
const FETCH_CODES = ['network', 'http', 'parse', 'personal', 'manual'];
/** États d'une source dans la vue d'un téléchargement. */
const SOURCE_STATES = ['downloaded', 'unchanged', 'failed', 'skipped', 'manual'];
/** Un nombre fini, sinon null. */
export const num = v => Number.isFinite(v) ? v : null;
/** La valeur d'une clé PROPRE d'une table, sinon undefined : jamais celle du prototype. Toute clé qui vient d'une réponse du lanceur (motif, erreur, état, verbe, jeu, source…) passe par
 *  là avant d'entrer dans une table du module : « constructor », « toString » ou « __proto__ » ne rendent ni une fonction ni un objet. */
export const own = (table, key) => table !== null && typeof table === 'object' && (typeof key === 'string' || typeof key === 'number') &&
  Object.hasOwn(table, key) ? table[
    key] : undefined;
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
/** Les jeux qui ont le panneau Télécharger · Construire · Purger (SPEC § 5.5), par identifiant de jeu du lanceur (`regen/job { set }`) :
 *  arg : la clé des éléments dans les arguments et à la racine de la vue du travail ; unit : le nom d'un élément (TX.unit) ; noItem : la
 *  raison grise « aucun élément coché » (absente : le jeu n'a pas à en cocher) ; group : le groupe de l'écran où vit le panneau ; single :
 *  un seul élément implicite (le cycle) ; free : les éléments se tapent dans un champ. La météo n'a pas de panneau (publiée avec le site). */
export const SETS = {
  base: {
    arg: 'zones',
    map: true,
    unit: 'zone',
    noItem: 'no-zone',
    group: 'base',
    verbs: ['fetch', 'build', 'purge']
  },
  proc: {
    arg: 'states',
    map: true,
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
export const bulkName = (byState, id, li = 0) => own(byState, id)?.names?.[li] || own(BULK_NAMES, id)?.[li] || id;
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
  if (own(SETS, v.set)?.verbs.includes(v.verb)) return {
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
