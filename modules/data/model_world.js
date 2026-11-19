// V3 data — le calcul pur de la ligne « Synoptique monde (GFS) » (SPEC § 5.11, SOG-0138) : la lecture fermée de ce que rend le travail weather/world (frame/aerodb/INTEGRATION.md « weather/world »), l'âge et l'état de la publication. Aucun accès à la page ni au lanceur ;
// tout ce que le lanceur dit est lu comme une entrée non fiable (nombres bornés, dates ISO, codes courts).

/** Le travail du lanceur : le jeu « weather », verbe « world » (`action: 'status'` : l'état sans réseau ; `'build'`, par défaut : la construction). */
export const WORLD_JOB = Object.freeze({
  set: 'weather',
  verb: 'world',
  key: 'weather/world'
});
/** Ce travail du lanceur est-il le synoptique monde (une vue de travail ou sa fin) ? */
export const isWorldView = v => !!v && typeof v === 'object' && v.set === WORLD_JOB.set && v.verb === WORLD_JOB.verb;
/** SOG-0429 : la reprise que le lanceur a dite pendant la marche (« reprise : 14 échéances sur 25 déjà là », dans le journal de la vue) : { have, of } ou null. */
export function worldResumed(v) {
  for (const l of Array.isArray(v?.log) ? v.log.slice(-8) : []) {
    const m = typeof l === 'string' ? /^reprise : (\d{1,3}) échéances? sur (\d{1,3}) déjà là\s*$/.exec(l) : null;
    if (m && +m[1] <= +m[2] && +m[2] <= 100) return {
      have: +m[1],
      of: +m[2]
    };
  }
  return null;
}
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
    // SOG-0429 : les échéances reprises d'une construction interrompue (la fin), et ce qu'une interruption a gardé (l'état)
    resumed: num(r.resumed, 100),
    of: num(r.of, 100),
    partial: r.partial !== null && typeof r.partial === 'object' && num(r.partial.have, 100) !== null && num(r.partial.of, 100) ? {
      have: num(r.partial.have, 100),
      of: num(r.partial.of, 100)
    } : null,
    run: iso(r.run),
    built: iso(r.built),
    times: [times[0] || '', times[1] || ''],
    steps: num(r.steps, 1000),
    files: num(r.files, 10000),
    bytes: num(r.bytes),
    age: num(r.age),
    seconds: num(r.seconds, 1e6),
    reason: typeof r.reason === 'string' && /^[\w-]{1,30}$/.test(r.reason) ? r.reason : '',
    last: worldLast(r.last),
    auto: worldAuto(r.auto)
  };
}
/** SOG-0525 (3) : la tenue à jour que le lanceur fait lui-même (tools/weather_keep.py) : { next (ms), due (la publication est en retard : « next » est la prochaine tentative, sinon le prochain regard), fails } ou null si le lanceur n'en dit rien (ancien lanceur, SOG_NO_WEATHER_AUTO) ; entrée non fiable. */
export function worldAuto(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const next = Number.isFinite(v.next) && v.next > 0 && v.next < 4e9 ? v.next * 1000 : null;
  return next === null ? null : {
    next,
    due: v.due === true,
    fails: num(v.fails, 1000) ?? 0
  };
}
/** L'heure locale hh:mm de `at` (ms), ou '' si illisible. */
export function clockOf(at) {
  if (!Number.isFinite(at)) return '';
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
/** SOG-0525 : la dernière lecture de la NOAA que le lanceur a gardée (data/local/last_results.json, par verbe) : { at (ms), ok, reason, message } ou null ; une entrée d'une autre forme : rien (entrée non fiable). */
export function worldLast(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const at = Number.isFinite(v.ended) && v.ended > 0 && v.ended < 4e9 ? v.ended * 1000 : null,
    reason = typeof v.reason === 'string' && /^[\w-]{1,30}$/.test(v.reason) ? v.reason : '',
    message = typeof v.message === 'string' ? v.message.replace(/[\p{Cc}<>]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 300) : '';
  return at === null && !reason && !message ? null : {
    at,
    ok: v.ok === true,
    reason,
    message
  };
}
/** L'attente que le lanceur tient entre deux departs de la lecture (tools/regen/weather.py MIN_GAP : 600 s) : l'heure du dernier depart se deduit de ce qu'il reste a attendre. */
export const WORLD_GAP_S = 600;
/** L'heure locale hh:mm du depart de la derniere lecture, d'apres le refus du lanceur (`wait` s restantes sur WORLD_GAP_S) a `now` (ms) ; '' sans attente lisible. */
export function lastStartClock(wait, now) {
  if (!Number.isFinite(wait) || wait < 0 || !Number.isFinite(now)) return '';
  const d = new Date(now + wait * 1000 - WORLD_GAP_S * 1000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
/** Le temps écoulé depuis `at` (ms), en minutes jusqu'à deux heures, puis en heures : { n, unit: 'min' | 'h' } ; null sans heure. */
export function ago(at, now) {
  if (!Number.isFinite(at) || !Number.isFinite(now)) return null;
  const min = Math.max(0, Math.round((now - at) / 6e4));
  return min < 120 ? {
    n: min,
    unit: 'min'
  } : {
    n: Math.round(min / 60),
    unit: 'h'
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
