// V3 data — la lecture de l'état des AUTRES jeux (SOG-0119) : `proc/status`, `vfr/status`, `aircraft/status` du lanceur (AeroDB 345ad3c15), en lecture seule, une fois à l'ouverture de l'écran puis après chaque opération, par la file de l'écran (une seule lecture du
// lanceur à la fois, jamais pendant une autre opération). Ce que le lanceur dit REMPLACE ce que la page déduisait de la publication pour la ligne repliée du jeu et pour « Tout mettre à jour » ; sans le verbe (un lanceur plus ancien), rien n'est lu et la page garde sa
// déduction. L'état est gardé dans S.cw.ss : { <jeu>: { state: 'loading' | 'ready' | 'none' | 'busy' | 'unread', data, dirty } }.
import {
  SET_STATE_VERBS,
  procArgs,
  setStateOf
} from './model_setstate.js';
import {
  busyNow,
  ROUTE,
  S,
  serial
} from './state.js';
import {
  procList,
  renderBuild
} from './panels.js';

/** L'état de lecture de tous les jeux, créé avec celui de la carte. */
export const ssInit = () => ({});
/** L'état que le lanceur dit d'un jeu (`{ state, n, reasons, cycle }`), ou null tant qu'il n'est pas lu (ou sans verbe) : la page garde alors sa déduction. */
export const launcherSetState = set => {
  const e = S?.cw?.ss?.[set];
  return e?.data || null;
};
/** Les arguments du verbe d'un jeu : les États cochés (à défaut, ceux de la liste) pour les procédures, rien pour les autres. */
function argsOf(set) {
  if (set !== 'proc') return {};
  const picked = [...(S.picked || [])];
  return {
    states: procArgs(picked.length ? picked : procList().map(i => i.id))
  };
}
/** Un travail de lecture du lanceur pour un jeu, passé à la file de l'écran ; refusé (`{ status: 409 }`, sans appel) quand une opération tourne ; null sans réponse. */
async function readSetJob(set, args) {
  const L = S?.ctx?.launcher;
  try {
    return await serial(() => busyNow() ? {
      status: 409
    } : L.job(ROUTE, {
      set,
      verb: 'status',
      args
    }, {
      onProgress: () => {},
      signal: new AbortController().signal
    }));
  } catch {
    return null;
  }
}
/** Lit l'état d'un jeu si le lanceur connaît son verbe et que la lecture n'est pas à jour ; ne lève jamais. */
async function wantOne(set) {
  const e = S?.cw?.ss?.[set];
  if (e && (e.reading || (!e.dirty && ['loading', 'ready', 'none'].includes(e.state)))) return;
  const verb = SET_STATE_VERBS[set];
  if (!S.ctx?.launcher || !S.known?.includes(verb)) {
    S.cw.ss[set] = {
      state: 'none'
    };
    return;
  }
  const me = S,
    keep = e?.state === 'ready' ? e.data : null,
    mine = S.cw.ss[set] = keep ? {
      state: 'ready',
      data: keep,
      reading: true
    } : {
      state: 'loading',
      reading: true
    };
  if (S.statusP) await S.statusP.catch(() => null);
  if (S !== me) return;
  const args = argsOf(set);
  if (set === 'proc' && !args.states.length) {
    S.cw.ss[set] = {
      state: 'none'
    };
    return;
  }
  const final = await readSetJob(set, args);
  if (S !== me || S.cw.ss[set] !== mine) return;
  const data = setStateOf(set, final);
  S.cw.ss[set] = data ? {
    state: 'ready',
    data
  } : final?.status === 409 ? {
    state: keep ? 'ready' : 'busy',
    data: keep || undefined,
    dirty: true,
    at: Date.now(),
    tries: (e?.tries || 0) + 1
  } : {
    state: 'unread'
  };
  renderBuild();
}
/** Lit ce qui est à lire (appelée après un dessin complet de l'écran et quand il est libre) : les trois jeux, l'un après l'autre. */
export function wantSetStates() {
  if (!S?.cw) return;
  S.cw.ss ||= ssInit();
  for (const set of Object.keys(SET_STATE_VERBS)) wantOne(set);
}
/** Les lectures à refaire (une opération vient de finir) : marquées « à relire », elles restent affichées jusqu'à la relecture. */
export function forgetSetStates() {
  for (const e of Object.values(S?.cw?.ss || {})) e.dirty = true;
}
/** Une lecture que le lanceur a refusée est retentée dès que l'écran est libre, au plus toutes les 4 s ; une lecture « à relire » aussi. */
export function setStatesIdle() {
  const ss = S?.cw?.ss;
  if (!ss) return;
  const due = r => !!r && (r.dirty || r.state === 'busy') && !(r.tries >= 3 && Date.now() - r.at < 4000);
  if (Object.values(ss).some(due)) wantSetStates();
}
