// V3 data — l'état des AUTRES jeux d'après les verbes d'état du lanceur (SOG-0119 ; AeroDB 345ad3c15) : `proc/status { states }`, `vfr/status {}` et `aircraft/status {}`, en lecture seule, comme `base/status`. « À jour » est toujours ce que le poste a PUBLIÉ
// pour le cycle en vigueur, jamais ce qu'il a seulement téléchargé. Pur : ni page, ni événement, ni stockage ; tout ce que dit le lanceur est une entrée non fiable, bornée ici (états d'une liste fermée, codes d'une liste fermée, entiers bornés).

/** Les verbes d'état, par jeu (le nom du verbe tel que `regen/verbs` le liste). */
export const SET_STATE_VERBS = Object.freeze({
  proc: 'proc/status',
  vfr: 'vfr/status',
  aircraft: 'aircraft/status'
});
const STATES = ['up-to-date', 'stale', 'missing', 'n/a'];
/** Les codes de raison que la page sait dire, par jeu (liste fermée du contrat) ; un autre code est écarté. */
const CODES = Object.freeze({
  proc: ['older-than-cycle', 'not-fetched', 'not-built', 'ead-per-aerodrome', 'no-source'],
  vfr: ['partial', 'older-than-cycle', 'unknown-cycle', 'no-base', 'not-fetched', 'not-built'],
  aircraft: ['no-db', 'fleet-types-missing']
});
const PREFIX = /^[A-Z0-9]{1,4}$/;
const int = v => Number.isInteger(v) && v >= 0 && v <= 1e7 ? v : 0;
const day = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
/** Une raison lue : { code, n (le nombre que le code porte : have, count), of (expected), cycle } ; null pour un code hors de la liste fermée du jeu. */
function reasonOf(set, r) {
  const code = typeof r === 'string' ? r : r?.code;
  if (typeof code !== 'string' || !CODES[set].includes(code)) return null;
  const o = r !== null && typeof r === 'object' ? r : {};
  return {
    code,
    n: int(o.count ?? o.have),
    of: int(o.expected),
    cycle: day(o.cycle)
  };
}
const reasonsOf = (set, a) => (Array.isArray(a) ? a : []).slice(0, 6).map(r => reasonOf(set, r)).filter(Boolean);
/** La fin d'un travail de lecture : son résultat, ou null (échec, refus, forme inattendue). */
const resultOf = final => final?.state === 'done' && final.result !== null && typeof final.result === 'object' && final.result.ok !==
  false ? final.result : null;
/** L'état d'un jeu lu : { set, state ('up-to-date' | 'todo' | 'n/a'), n (ce qui est à faire : États, lignes), reasons: [{ code, n, of, cycle }], cycle } ; null quand le lanceur n'a rien de lisible à dire.
 *  `todo` : le lanceur dit `stale` ou `missing` (le poste n'a rien publié, ou pas pour ce cycle) ; `n/a` : le jeu n'a rien à suivre (une source lue à la demande). */
export function setStateOf(set, final) {
  const r = resultOf(final);
  if (!r || !Object.hasOwn(SET_STATE_VERBS, set)) return null;
  if (set === 'proc') {
    const per = r.states !== null && typeof r.states === 'object' && !Array.isArray(r.states) ? r.states : null;
    if (!per) return null;
    const rows = Object.entries(per).filter(([k, v]) => PREFIX.test(k) && v !== null && typeof v === 'object' && STATES.includes(v.state))
      .slice(0, 80).map(([k, v]) => ({
        prefix: k,
        state: v.state,
        reasons: reasonsOf('proc', v.reasons)
      }));
    const todo = rows.filter(x => x.state === 'stale' || x.state === 'missing'),
      real = rows.filter(x => x.state !== 'n/a');
    return {
      set,
      state: todo.length ? 'todo' : real.length ? 'up-to-date' : 'n/a',
      n: todo.length,
      reasons: todo.flatMap(x => x.reasons.slice(0, 1).map(q => ({
        ...q,
        prefix: x.prefix
      }))).slice(0, 6),
      cycle: day(r.cycle)
    };
  }
  if (!STATES.includes(r.state)) return null;
  const reasons = reasonsOf(set, r.reasons);
  return {
    set,
    state: r.state === 'stale' || r.state === 'missing' ? 'todo' : r.state,
    n: r.state === 'stale' || r.state === 'missing' ? Math.max(1, reasons.length) : 0,
    reasons,
    cycle: day(r.cycle)
  };
}
/** Les États (préfixes) à demander à `proc/status` : ceux que l'utilisateur a cochés, à défaut tous ceux de la liste, bornés ; [] sans. */
export const procArgs = ids => [...new Set((ids || []).filter(x => typeof x === 'string' && PREFIX.test(x)))].slice(0, 60);
