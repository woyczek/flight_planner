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
    ...entryHead({
      at,
      set: 'base',
      verb: 'publish',
      result: out.kind === 'failed' || out.kind === 'no-exchange' ? 'failed' : 'done' // rien n'est parti : jamais « done »
    }),
    committed: out.committed,
    received: out.received,
    held: out.held,
    conflicts: out.conflicts
  };
}
