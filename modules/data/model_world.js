// V3 data — le calcul pur de la ligne « Synoptique monde (GFS) » (SPEC § 5.11, SOG-0138) : la lecture fermée de ce que rend le travail weather/world (frame/aerodb/INTEGRATION.md « weather/world »), l'âge et l'état de la publication. Aucun accès à la page ni au lanceur ;
// tout ce que le lanceur dit est lu comme une entrée non fiable (nombres bornés, dates ISO, codes courts).

/** Le travail du lanceur : le jeu « weather », verbe « world » (`action: 'status'` : l'état sans réseau ; `'build'`, par défaut : la construction). */
export const WORLD_JOB = Object.freeze({
  set: 'weather',
  verb: 'world',
  key: 'weather/world'
});
/** Au-delà de cet âge (heures) la publication est dite ancienne : un run GFS paraît toutes les six heures, la prévision couvre trois jours. */
export const WORLD_OLD_HOURS = 12;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const iso = v => typeof v === 'string' && ISO.test(v) ? v.slice(0, 30) : '';
const num = (v, max = 1e12) => Number.isFinite(v) && v >= 0 ? Math.min(v, max) : null;
/** La fin d'un travail weather/world lue : { ok, exists, kept, run, built, times: [début, fin], steps, files, bytes, age (secondes, ou null), seconds, reason } ; null si ce n'est pas une réponse lisible (échec du suivi, forme inattendue). */
export function worldOf(final) {
  const r = final?.result !== null && typeof final?.result === 'object' ? final.result : null;
  if (!r || final.state !== 'done') return null;
  const times = Array.isArray(r.times) ? r.times.map(iso) : [];
  return {
    ok: r.ok === true,
    exists: r.exists === true || (r.ok === true && r.exists !== false),
    kept: r.kept === true,
    run: iso(r.run),
    built: iso(r.built),
    times: [times[0] || '', times[1] || ''],
    steps: num(r.steps, 1000),
    files: num(r.files, 10000),
    bytes: num(r.bytes),
    age: num(r.age),
    seconds: num(r.seconds, 1e6),
    reason: typeof r.reason === 'string' && /^[\w-]{1,30}$/.test(r.reason) ? r.reason : ''
  };
}
/** L'âge de la publication en heures entières : d'après `built` (à `now`), à défaut `age` en secondes ; null sans l'un ni l'autre. */
export function worldAgeHours(w, now) {
  if (!w) return null;
  const t = w.built ? Date.parse(w.built) : NaN;
  if (Number.isFinite(t)) return Math.max(0, Math.floor((now - t) / 36e5));
  return w.age !== null ? Math.floor(w.age / 3600) : null;
}
/** L'état de la ligne : 'absent' (rien de publié ou état inconnu), 'old' (plus de WORLD_OLD_HOURS), 'ok' ; avec le niveau de la pastille (null, 'warn', 'ok'). */
export function worldState(w, now) {
  if (!w || !w.exists) return {
    state: 'absent',
    level: 'warn'
  };
  const h = worldAgeHours(w, now);
  return h !== null && h >= WORLD_OLD_HOURS ? {
    state: 'old',
    level: 'warn'
  } : {
    state: 'ok',
    level: 'ok'
  };
}
