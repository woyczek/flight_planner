// V3 data — le calcul pur de la ligne « Route (RAD, points FRA) » (SPEC § 5.7, SOG-0125) : la lecture fermée de ce que rend le travail route/import-rad (le plan à blanc, la fin de l'import), les cycles
// présents sur ce poste et l'état de la ligne. Aucun accès à la page, au lanceur ni au dépôt ; tout ce que le lanceur ou un fichier de cache dit est lu comme une entrée non fiable (§ 10.36).
import {
  cycleDateOf,
  pickState,
  staleLevel
} from './model_screen.js';

/** Le travail du lanceur : le jeu « route » et son verbe d'import (tools/regen/route.py, frame/aerodb/INTEGRATION.md « Route computation »). */
export const ROUTE_JOB = Object.freeze({
  set: 'route',
  verb: 'import-rad',
  key: 'route/import-rad'
});
const MAX_FILES = 12;
const BOOK = /^[A-Za-z0-9][A-Za-z0-9._ ()+-]{0,118}\.xlsx$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const CODE = /^[\w-]{1,40}$/;
/** Une taille en octets : un entier fini, 0 ou plus ; null sinon. */
const bytes = v => Number.isSafeInteger(v) && v >= 0 ? v : null;
/** Un texte court sans caractère de commande ; '' sinon. */
const short = (v, n = 120) => typeof v === 'string' ? v.replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ').trim().slice(0, n) : '';
/** La date d'un cycle : « AAAA-MM-JJ » (le début du classeur), sinon ''. */
const dayOf = v => typeof v === 'string' && DAY.test(v.slice(0, 10)) ? v.slice(0, 10) : '';
/** Une liste de dates de cycles propres, sans doublon, du plus ancien au plus récent. */
const days = v => [...new Set((Array.isArray(v) ? v : []).map(dayOf).filter(Boolean))].sort();
/** Les classeurs d'un plan ou d'une fin : [{ name, size, kind: 'rad' | 'fra', cycle, title }] ; un nom hors règle (chemin, extension), une taille ou un genre invalides sont écartés. */
function filesOf(list) {
  const out = [];
  for (const f of (Array.isArray(list) ? list : []).slice(0, MAX_FILES * 2)) {
    const name = typeof f?.name === 'string' && BOOK.test(f.name) ? f.name : '',
      size = bytes(f?.size);
    if (!name || size === null || !['rad', 'fra'].includes(f.kind) || out.some(x => x.name === name) || out.length >= MAX_FILES) continue;
    out.push({
      name,
      size,
      kind: f.kind,
      cycle: dayOf(f.cycle),
      title: f.kind === 'rad' ? short(f.title, 80) : ''
    });
  }
  return out;
}
/** Les échecs : [{ name, error }] (le nom court, le code court de l'erreur du lanceur). */
function failedOf(list) {
  return (Array.isArray(list) ? list : []).slice(0, MAX_FILES * 2).map(f => ({
    name: short(f?.name, 120),
    error: typeof f?.error === 'string' && CODE.test(f.error) ? f.error : ''
  })).filter(f => f.name);
}
/** La fin du plan à blanc (la vue finale du travail, `{ state, result }`) : { kind: 'plan' | 'none' | 'failed' | 'cancelled', files, failed }. `none` : rien dans Téléchargements ; `failed` : le travail n'a pas rendu de plan lisible. */
export function planOf(final) {
  if (final?.state === 'cancelled' || final?.cancelled) return {
    kind: 'cancelled',
    files: [],
    failed: []
  };
  const r = final?.state === 'done' && final.result !== null && typeof final.result === 'object' ? final.result : null;
  if (!r || r.ok === false) return {
    kind: 'failed',
    files: [],
    failed: failedOf(r?.failed)
  };
  const files = filesOf(r.files);
  return {
    kind: files.length ? 'plan' : 'none',
    files,
    failed: failedOf(r.failed)
  };
}
/** La fin de l'import réel : { kind: 'done' | 'partial' | 'failed' | 'cancelled' | 'not-shown', taken: [noms], failed, rad: [cycles], fra: [cycles], commit, message }. `taken` : seulement les noms que le plan avait montrés (`shown`). */
export function importOutcome(final, shown) {
  if (final?.state === 'cancelled' || final?.cancelled) return {
    kind: 'cancelled',
    taken: [],
    failed: [],
    rad: [],
    fra: [],
    commit: null,
    message: ''
  };
  const r = final?.result !== null && typeof final?.result === 'object' ? final.result : null,
    names = new Set((shown || []).map(f => f.name)),
    taken = (Array.isArray(r?.taken) ? r.taken : []).filter(n => typeof n === 'string' && names.has(n)),
    reason = typeof r?.reason === 'string' && CODE.test(r.reason) ? r.reason : '',
    kind = !r || final.state !== 'done' ? 'failed' : reason === 'not-shown' ? 'not-shown' : reason === 'cancelled' ? 'cancelled' : r.ok ===
    true ? 'done' : taken.length ? 'partial' : 'failed';
  return {
    kind,
    taken,
    failed: failedOf(r?.failed),
    rad: days(r?.rad),
    fra: days(r?.fra),
    commit: typeof r?.commit === 'string' && /^[0-9a-f]{7,40}$/.test(r.commit) ? r.commit : null,
    message: short(r?.message, 160)
  };
}
/** Ce que la mémoire du poste (cache/data/route.json) et la publication d'AeroDB (publication().route, quand le lecteur la donne) disent des cycles présents : { rad: [dates], fra: [dates], at }. Les deux sources s'ajoutent ; une forme inattendue ne dit rien. */
export function knownCycles(mem, pubRoute) {
  const pick = (a, b, k) => [...new Set([...days(a?.[k]), ...days(b?.[k])])].sort(),
    at = [mem?.at, pubRoute?.at].map(v => typeof v === 'string' ? Date.parse(v) : NaN).filter(Number.isFinite);
  return {
    rad: pick(mem, pubRoute, 'rad'),
    fra: pick(mem, pubRoute, 'fra'),
    at: at.length ? new Date(Math.max(...at)).toISOString() : null
  };
}
/** La mémoire après un import : les cycles d'avant plus ceux de la fin, la date et le commit de cet import. */
export function memoryAfter(known, out, at) {
  return {
    rad: [...new Set([...known.rad, ...out.rad])].sort(),
    fra: [...new Set([...known.fra, ...out.fra])].sort(),
    at,
    commit: out.commit
  };
}
/** L'état de la ligne comme celui des autres jeux (pickState, STATE_ORDER) : `absent` sans cycle RAD ; `stale-cycle` (ambre, puis rouge) quand le dernier cycle RAD précède celui en vigueur ; `ok` sinon. `{ state, level, cycleDate }`. */
export function routeState(known, airac, now) {
  const last = known.rad.length ? known.rad[known.rad.length - 1] : null,
    date = last && airac ? cycleDateOf(airac, last) : null,
    stale = date && airac ? staleLevel(airac, date, now) : null,
    [state, level] = pickState({
      absent: !last,
      stale
    });
  return {
    state,
    level,
    cycleDate: date
  };
}
