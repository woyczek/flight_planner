// V3 data — le calcul pur du fil de la dernière opération d'UN pays (SOG-0262, lot D1) : les étapes de « Mettre à jour ce pays » (prise du fichier vu dans Téléchargements, téléchargement, construction), ce que la fin de chaque travail du lanceur dit de CE pays (fait, rien de nouveau,
// en échec, arrêté), la part de l'avancement. Pur : ni page, ni lanceur, ni texte (les mots sont à texts.js, le dessin à zoneop.js). Le corps d'une fin vient du lanceur sans confiance : le modèle des résultats (model_results.js) l'a déjà borné.

import {
  setOutcome
} from './model_results.js';

/** Les quatre signes d'une coche, et le mot qui les accompagne toujours (jamais la couleur ni la forme seules) : fait (vert), à faire (cercle vide, ton neutre), en échec (rouge : un vrai échec, avec sa raison seulement), sans objet ou pas encore possible (gris). */
export const SIGN = Object.freeze({
  yes: '✓',
  todo: '○',
  no: '✗',
  na: '—'
});
/** Les quatre états d'une coche. */
export const SIGNS = Object.freeze(Object.keys(SIGN));
/** Les étapes du fil, dans l'ordre où elles se font. */
export const STEP_KEYS = Object.freeze(['pick', 'download', 'build']);
/** Les fins d'un travail qui ne disent rien de ce pays : arrêt demandé, interruption (la chaîne s'arrête). */
const STOPPED = ['cancelled', 'interrupted'];
/** Les motifs propres à tout le travail (le travail n'a pas tourné) : jamais « fait ». */
const NOT_RUN = ['no-codes', 'no-script', 'no-browser', 'xplane-in-page', 'no-pypdf', 'no-cache', 'merge-pending'];
/** Les étapes qu'« Mettre à jour ce pays » va faire d'après l'état lu : la prise si un fichier est vu dans Téléchargements, le téléchargement si le plan en a un, la construction toujours (elle est recalculée après la prise et le téléchargement). */
export function stepsFor({
  seen,
  fetch
}) {
  return [...(seen ? ['pick'] : []), ...(fetch ? ['download'] : []), 'build'];
}
/** Ce que la fin d'un travail du lanceur dit de la zone `zone` pour l'étape `key` : { st: 'done' | 'same' | 'fail' | 'stop', failed (les sources en échec d'un téléchargement), error (le code d'une construction en échec), kind (le motif propre au travail) }.
 *  'same' : rien de nouveau (un téléchargement qui n'a rien changé, une construction sans zone refaite). */
export function stepVerdict(key, out, zone) {
  if (!out) return {
    st: 'fail',
    kind: 'failed'
  };
  if (STOPPED.includes(out.kind)) return {
    st: 'stop',
    kind: out.kind
  };
  if (NOT_RUN.includes(out.kind)) return {
    st: 'fail',
    kind: out.kind
  };
  const mine = (Array.isArray(out.failed) ? out.failed : []).filter(f => f && f.zone === zone);
  if (key === 'download') {
    if (mine.length) return {
      st: 'fail',
      failed: mine,
      kind: out.kind
    };
    return (out.fetched || []).includes(zone) ? {
      st: 'done'
    } : {
      st: 'same'
    };
  }
  if (key === 'build') {
    if (mine.length) return {
      st: 'fail',
      error: mine[0].error ?? null,
      kind: out.kind
    };
    return (out.built || []).includes(zone) ? {
      st: 'done'
    } : {
      st: 'same'
    };
  }
  // la prise du fichier : pris, ou rien de pris (manquant, refusé, non lu)
  if ((out.taken || []).some(t => t.zone === zone)) return {
    st: 'done'
  };
  return {
    st: 'fail',
    failed: mine,
    missing: (out.missing || []).filter(m => m.zone === zone),
    kind: out.kind
  };
}
// ------------------------------------------------------------------------------------------------ le fil lu dans le journal du lanceur (base/last, SOG-0265)
const ZONE = /^[a-z0-9_-]{2,12}$/;
/** Les verbes du journal du lanceur, et les étapes du fil que chacun porte (base/update télécharge puis construit). */
const LAST_STEPS = Object.freeze({
  'base/pickup': ['pick'],
  'base/fetch': ['download'],
  'base/build': ['build'],
  'base/update': ['download', 'build']
});
/** Les fins que le journal sait dire. */
const LAST_STATES = ['done', 'cancelled', 'error'];
/** L'écart le plus grand entre deux opérations du même geste (prise, téléchargement, construction) : au-delà, la plus ancienne n'est plus du fil. */
export const CHAIN_GAP = 30 * 60 * 1000;
/** Le verbe de l'écran pour une étape du fil. */
const VERB_OF = {
  pick: 'pickup',
  download: 'fetch',
  build: 'build'
};
/** Le journal du lanceur (base/last, K191) lu, ou null : { 'base/pickup' | 'base/fetch' | 'base/build' | 'base/update': { state, ended (ms), reason, zones (ceux des arguments, ou null), result } }. Tout vient du lanceur sans confiance : seuls les verbes connus, les fins connues,
 *  une date lisible ; les listes du résultat sont lues par les lecteurs de fin (model_results.js), qui les bornent. `final` : la fin du travail de lecture. */
export function lastOf(final) {
  const r = final?.state === 'done' && final.result !== null && typeof final.result === 'object' ? final.result : null;
  if (!r || r.ok === false || r.results === null || typeof r.results !== 'object') return null;
  const out = {};
  for (const verb of Object.keys(LAST_STEPS)) {
    const e = Object.hasOwn(r.results, verb) ? r.results[verb] : null;
    if (e === null || typeof e !== 'object' || !LAST_STATES.includes(e.state) || !Number.isFinite(e.ended) || e.ended <= 0 || e.ended > 4e9)
      continue;
    out[verb] = {
      state: e.state,
      ended: Math.round(e.ended * 1000),
      reason: typeof e.reason === 'string' ? e.reason.slice(0, 40) : '',
      zones: Array.isArray(e.args?.zones) ? e.args.zones.filter(z => typeof z === 'string' && ZONE.test(z)).slice(0, 200) : null,
      result: e.result !== null && typeof e.result === 'object' ? e.result : {}
    };
  }
  return out;
}
/** La fin d'un travail du journal, ramenée à celle que les lecteurs de l'écran connaissent, pour l'étape `key` ; null quand l'opération n'a pas de part dans cette étape (un plan de prise, un « update » sans téléchargement). */
function lastOut(verb, key, e) {
  if (verb === 'base/pickup') {
    const out = setOutcome('base', 'pickup', {
      state: e.state,
      result: e.result,
      zones: {}
    }).out;
    return out.dry ? null : out; // un plan n'est pas une opération : rien n'a été pris
  }
  if (verb === 'base/update') {
    if (key === 'download') {
      const f = e.result.fetched;
      return f !== null && typeof f === 'object' ? setOutcome('base', 'fetch', {
        state: e.state,
        result: f,
        zones: {}
      }).out : null;
    }
    return setOutcome('base', 'build', {
      state: e.state,
      result: e.result,
      zones: {}
    }).out;
  }
  return setOutcome('base', VERB_OF[key], {
    state: e.state,
    result: e.result,
    zones: {}
  }).out;
}
/** Ce que la fin dit-elle de cette zone (elle est dans les arguments, ou nommée dans les listes du résultat) ? */
function mentions(zone, e, out) {
  return !!e.zones?.includes(zone) || [out.fetched, out.unchanged, out.built].some(a => Array.isArray(a) && a.includes(zone)) || [out
    .failed, out.taken, out.missing, out.manual
  ].some(a => Array.isArray(a) && a.some(x => x?.zone === zone));
}
/** Le fil de la dernière opération d'une zone d'après le journal du lanceur (lastOf) : { at (la fin la plus récente, ms), steps: [{ k, st ('done' | 'same' | 'fail' | 'stop' | 'todo'), at, v (le verdict de stepVerdict : failed, error, missing, kind) }] } ; null sans opération de cette zone.
 *  Une opération est la dernière ; celles qui la précèdent dans l'ordre des étapes (prise, téléchargement, construction) en font partie si elles la précèdent de 30 minutes au plus ; une étape en échec ou arrêtée avant la construction laisse la construction « pas encore faite ». */
export function lastThread(last, zone) {
  if (!last || !ZONE.test(zone || '')) return null;
  const cands = [];
  for (const verb of Object.keys(LAST_STEPS)) {
    const e = last[verb];
    if (!e) continue;
    for (const key of LAST_STEPS[verb]) {
      const out = lastOut(verb, key, e);
      if (!out || !mentions(zone, e, out)) continue;
      let v = stepVerdict(key, out, zone);
      if (e.state === 'error' && v.st !== 'stop') v = {
        st: 'fail',
        kind: 'failed'
      }; // une fin en échec sans rien de dit pour cette zone : jamais « rien de nouveau »
      cands.push({
        k: key,
        st: v.st,
        at: e.ended,
        v
      });
    }
  }
  if (!cands.length) return null;
  cands.sort((a, b) => b.at - a.at || STEP_KEYS.indexOf(b.k) - STEP_KEYS.indexOf(a.k));
  const chain = [cands[0]];
  for (const c of cands.slice(1)) {
    const first = chain[chain.length - 1];
    if (STEP_KEYS.indexOf(c.k) < STEP_KEYS.indexOf(first.k) && first.at - c.at <= CHAIN_GAP) chain.push(c);
  }
  const steps = chain.reverse();
  const bad = steps.find(s => s.st === 'fail' || s.st === 'stop');
  if (bad && bad.k !== 'build' && !steps.some(s => s.k === 'build')) steps.push({
    k: 'build',
    st: 'todo',
    at: 0,
    v: {}
  });
  return {
    at: Math.max(...steps.map(s => s.at)),
    steps
  };
}
/** L'avancement de la chaîne : { done (étapes finies), total, pct } d'après les étapes et la part de l'étape en cours (0 à 1). */
export function stepProgress(steps, part = 0) {
  const total = steps.length,
    done = steps.filter(s => s.st === 'done' || s.st === 'same').length,
    frac = Math.min(Math.max(Number.isFinite(part) ? part : 0, 0), 1);
  return {
    done,
    total,
    pct: total > 0 ? Math.min(100, Math.round(100 * (done + (done < total ? frac : 0)) / total)) : 0
  };
}
