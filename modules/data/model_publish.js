// V3 data — le calcul pur de « Publier » (SPEC § 11) : l'état du bouton, les comptes de sync-status, la fin d'une publication, l'entrée du journal.
// Ni état, ni page, ni appel : ne publie rien (ctx.data.sync est appelé par publish.js).
import {
  num
} from './model_sets.js';
import {
  entryHead
} from './model_kit.js';

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
/** Les causes d'un échec de publication que le lanceur sait dire, et les étapes où il s'arrête (SOG-0155) : des listes fermées, tout autre texte est écarté. */
export const PUBLISH_CAUSES = Object.freeze(['remote-refused', 'push-rejected', 'lfs-hook', 'auth', 'network', 'conflict', 'busy',
  'timeout', 'launcher-error', 'other'
]);
export const PUBLISH_STEPS = Object.freeze(['settle', 'commit', 'prepare', 'receive', 'untrack', 'push']);
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
      cause: PUBLISH_CAUSES.includes(x?.cause) ? x.cause : '',
      step: PUBLISH_STEPS.includes(x?.step) ? x.step : '',
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
    ...entryHead({
      at,
      set: 'base',
      verb: 'publish',
      result: out.kind === 'failed' || out.kind === 'no-exchange' || out.kind === 'no-author' ? 'failed' :
        'done' // rien n'est parti : jamais « done »
    }),
    committed: out.committed,
    received: out.received,
    held: out.held,
    conflicts: out.conflicts
  };
}
// ------------------------------------------------------------------------------------------------ le plan de « Publier » (base/publish à blanc, K178)
const ZONE = /^[a-z0-9_-]{2,12}$/;
/** Les refus du plan que le lanceur sait dire : une liste fermée, tout autre code devient 'other'. */
export const PLAN_REASONS = Object.freeze(['bad-zone', 'no-repo', 'no-remote', 'not-built', 'no-sync', 'no-author']);
/** La zone sur laquelle le plan est demandé (le lanceur veut une zone) : d'après l'état du lanceur (`status.zones[id].publish`), la première zone de la couverture construite et pas encore envoyée, à défaut la première construite (le plan dit alors « rien à publier » ou ce qui attend) ; '' quand aucune
 *  zone n'a de construction sur ce poste. */
export function planZone(status, covIds) {
  const zs = status && typeof status === 'object' && status.zones && typeof status.zones === 'object' ? status.zones : {},
    ids = (Array.isArray(covIds) ? covIds : []).filter(z => typeof z === 'string' && ZONE.test(z) && Object.hasOwn(zs, z) && zs[z]
      ?.publish && typeof zs[z].publish === 'object');
  return ids.find(z => zs[z].publish.state === 'unpublished') || ids.find(z => zs[z].publish.state === 'published') || '';
}
/** Le plan de « Publier » lu (la fin d'un travail base/publish à blanc) : { ok, zone, state, ahead (identifiants des AUTRES zones construites pas envoyées, qui partent avec), commits, otherFiles (un NOMBRE : jamais un nom de fichier de l'utilisateur), pending (à commiter par l'envoi), nothing,
 *  reason (si ok est faux) } ; null sans réponse lisible. Tout ce que dit le lanceur est borné. */
export function publishPlanOf(final) {
  const r = final?.state === 'done' && final.result !== null && typeof final.result === 'object' ? final.result : null;
  if (!r) return null;
  const zone = typeof r.zone === 'string' && ZONE.test(r.zone) ? r.zone : '';
  if (r.ok !== true) return {
    ok: false,
    zone,
    reason: PLAN_REASONS.includes(r.reason) ? r.reason : 'other'
  };
  return {
    ok: true,
    zone,
    state: ['published', 'unpublished', 'unknown'].includes(r.state) ? r.state : 'unknown',
    ahead: [...new Set((Array.isArray(r.ahead) ? r.ahead : []).filter(z => typeof z === 'string' && ZONE.test(z)))].slice(0, 80),
    commits: num(r.commits) ?? 0,
    otherFiles: num(r.otherFiles) ?? 0,
    pending: num(r.pending) ?? 0,
    nothing: r.nothing === true
  };
}
/** Ce que le plan emporte, en nombres : { zones (celles construites et pas envoyées : les autres, plus celle du plan si elle ne l'est pas non plus), others (les autres seules), files (les fichiers de l'utilisateur : commités pas envoyés + à commiter), commits }. */
export function planCounts(p) {
  const others = p?.ahead?.length ?? 0;
  return {
    zones: others + (p?.state === 'unpublished' ? 1 : 0),
    others,
    files: (p?.otherFiles ?? 0) + (p?.pending ?? 0),
    commits: p?.commits ?? 0
  };
}
/** La fin d'un envoi réel (la fin du travail base/publish { dry: false }) dans la forme de publishOutcome : kind 'no-author' (le trigramme manque), 'failed' (refus du plan avec son `reason`, échec de l'envoi avec sa cause, travail sans réponse), 'done', 'local' ; les nombres sont tous des nombres. */
export function verbOutcome(final) {
  if (final?.status === 409) return publishOutcome({
    ok: false,
    exchange: {
      ok: false,
      cause: 'busy'
    }
  }); // le lanceur tient déjà un travail : rien n'est parti
  const r = final?.state === 'done' && final.result !== null && typeof final.result === 'object' ? final.result : null,
    base = publishOutcome(r && r.sync && typeof r.sync === 'object' ? {
      ok: r.ok !== false,
      exchange: r.sync
    } : null);
  if (!r) return {
    ...base,
    kind: 'failed',
    message: typeof final?.error === 'string' ? final.error.slice(0, 300) : ''
  };
  if (r.reason === 'no-author') return {
    ...base,
    kind: 'no-author'
  };
  if (r.ok === false && !(r.sync && typeof r.sync === 'object')) return {
    ...base,
    kind: 'failed',
    reason: PLAN_REASONS.includes(r.reason) ? r.reason : 'other',
    message: typeof r.message === 'string' ? r.message.slice(0, 300) : ''
  };
  return base;
}
