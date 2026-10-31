// V3 data — le calcul pur de « Tout mettre à jour » (SPEC § 11) : ses jeux et ses verbes, le verdict d'une opération, les groupes périmés, l'entrée du journal.
// Ni état, ni page, ni appel : ne lance rien et ne lit pas la vue d'un travail (model_sets.js, model_results.js).
import {
  JOURNAL_MAX
} from './model_results.js';
import {
  entryHead
} from './model_kit.js';

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
    ...entryHead({
      at,
      set: 'all',
      verb: 'update',
      ids: items.map(i => ({
        set: i.set,
        result: i.result
      })),
      key: 'items',
      seconds,
      result
    }),
    job: String(job)
  };
}
/** Un repère de chaîne resté sans fin dans le journal : l'entrée { set: 'all', verb: 'update', result: 'running' } la plus récente, ou null. */
export function openChain(list) {
  return [...list].reverse().find(e => e.set === 'all' && e.verb === 'update' && e.result === 'running') || null;
}
