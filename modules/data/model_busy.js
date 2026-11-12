// V3 data — l'opération en cours que le lanceur refuse de doubler (SOG-0245) : la lecture sûre de ce qu'il en dit (`running` d'un refus « busy », ou la vue d'un travail), son avancement, le
// mot de son état de vie. Calcul pur : ni page, ni appel, ni texte (les mots sont à texts.js, le dessin à busy.js). Le corps du lanceur est une entrée non fiable : un jeu fermé de champs, des
// types bornés, des mots courts.
import {
  num,
  own
} from './model_sets.js';

/** Les quatre états de vie d'un travail (le lanceur : signe il y a moins de 120 s, sans signe depuis 120 s, sans signe depuis 300 s, son fil a disparu). */
export const ALIVE = Object.freeze(['alive', 'quiet', 'stuck', 'gone']);
const WORD = /^[a-z0-9_-]{1,40}$/;
const word = x => typeof x === 'string' && WORD.test(x) ? x : '';
/** Un nombre fini et positif ou nul (borné), ou null. */
const nat = (x, max = 1e9) => typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.min(x, max) : null;

/** Ce que le lanceur dit du travail en cours (`running` d'un refus, ou une vue de travail) ramené à une forme sûre :
 *  { id, set, verb, args: { zones: [mot]?, icao?, action? }, started (secondes d'époque) | null, step (texte borné), done, total, unit, seen, silent, alive ('alive' | 'quiet' | 'stuck' | 'gone' | null),
 *  cancelling } ; null sans identifiant lisible. Un champ absent ou illisible est '' ou null, jamais une valeur étrangère. */
export function runningOf(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
  const id = word(b.id);
  if (!id) return null;
  const a = b.args && typeof b.args === 'object' && !Array.isArray(b.args) ? b.args : {},
    zones = Array.isArray(a.zones) ? a.zones.filter(z => typeof z === 'string' && WORD.test(z)).slice(0, 12) : [],
    step = typeof b.step === 'string' ? b.step.replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ').trim().slice(0, 120) : '',
    started = nat(b.started, 4e9);
  return {
    id,
    set: word(b.set),
    verb: word(b.verb),
    args: {
      ...(zones.length ? {
        zones
      } : {}),
      ...(word(a.icao) ? {
        icao: word(a.icao)
      } : {}),
      ...(word(a.action) ? {
        action: word(a.action)
      } : {})
    },
    started: started > 0 ? started : null,
    step,
    done: nat(b.done),
    total: nat(b.total),
    unit: word(b.unit),
    seen: nat(b.seen, 4e9),
    silent: nat(b.silent, 1e7),
    alive: ALIVE.includes(b.alive) ? b.alive : null,
    cancelling: b.cancelling === true
  };
}
/** Ajoute à `old` ce que `fresh` (une vue plus récente du même travail, lue par runningOf) sait : un champ vide ou absent ne remplace rien ; l'arrêt demandé reste demandé. */
export function mergeRunning(old, fresh) {
  if (!old) return fresh || null;
  if (!fresh || fresh.id !== old.id) return old;
  const out = {
    ...old
  };
  for (const k of ['set', 'verb', 'started', 'step', 'done', 'total', 'unit', 'seen', 'silent', 'alive'])
    if (fresh[k] !== '' && fresh[k] !== null && fresh[k] !== undefined) out[k] = fresh[k];
  if (Object.keys(fresh.args).length) out.args = fresh.args;
  out.cancelling = old.cancelling || fresh.cancelling;
  return out;
}
/** L'avancement : { done, total, pct } (pct en pour cent entier, null quand le total est inconnu ou nul). */
export function runningProgress(r) {
  const total = num(r?.total) > 0 ? num(r.total) : 0,
    done = total > 0 ? Math.min(num(r?.done) ?? 0, total) : num(r?.done) ?? 0;
  return {
    done,
    total,
    pct: total > 0 ? Math.round(100 * done / total) : null
  };
}
/** L'état de vie à dire : 'alive' | 'quiet' | 'stuck' | 'gone' ; null quand le lanceur n'en dit rien. */
export const aliveOf = r => own({
  alive: 1,
  quiet: 1,
  stuck: 1,
  gone: 1
}, r?.alive) ? r.alive : null;
/** « Libérer » n'est offert que pour un travail qui ne répond plus (stuck) ou dont le fil a disparu (gone) : jamais pour un travail qui donne signe de vie. */
export const canRelease = r => r?.alive === 'stuck' || r?.alive === 'gone';
