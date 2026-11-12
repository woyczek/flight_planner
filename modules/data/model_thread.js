// V3 data — le calcul pur du fil de la dernière opération d'UN pays (SOG-0262, lot D1) : les étapes de « Mettre à jour ce pays » (prise du fichier vu dans Téléchargements, téléchargement, construction), ce que la fin de chaque travail du lanceur dit de CE pays (fait, rien de nouveau,
// en échec, arrêté), la part de l'avancement. Pur : ni page, ni lanceur, ni texte (les mots sont à texts.js, le dessin à zoneop.js). Le corps d'une fin vient du lanceur sans confiance : le modèle des résultats (model_results.js) l'a déjà borné.

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
