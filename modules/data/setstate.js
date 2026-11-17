// V3 data — la lecture de l'état des AUTRES jeux (SOG-0119) : `proc/status`, `vfr/status`, `aircraft/status` du lanceur (AeroDB 345ad3c15), en lecture seule, une fois à l'ouverture de l'écran puis après chaque opération, par la file de l'écran (une seule lecture du
// lanceur à la fois, jamais pendant une autre opération). Ce que le lanceur dit REMPLACE ce que la page déduisait de la publication pour la ligne repliée du jeu et pour « Tout mettre à jour » ; sans le verbe (un lanceur plus ancien), rien n'est lu et la page garde sa
// déduction. L'état est gardé dans S.cw.ss : { <jeu>: { state: 'loading' | 'ready' | 'none' | 'busy' | 'unread', data, dirty } }.
import {
  pdfLine,
  SET_STATE_VERBS,
  procArgs,
  setStateOf
} from './model_setstate.js';
import {
  busyNow,
  esc,
  ROUTE,
  S,
  serial,
  tt
} from './state.js';
import {
  TX
} from './texts.js';
import {
  procList,
  renderBuild
} from './panels.js';

/** La ligne « Lecture des PDF » (SOG-0376), d'après `pdf/status` lu une fois à l'ouverture : « prête », ou le paquet du groupe pdf en cause (« pypdf 6.21.3, il faut 6.21.4 au moins », « pypdf manque ») puis le NOM du script à lancer — aucune commande pip ; le groupe OCR à part,
 *  jamais le groupe OCR (facultatif : il n'a pas sa place ici). Les noms, versions et script viennent du lanceur : écrits en texte, jamais dans un attribut. '' sans l'état (lanceur plus ancien, lecture refusée). */
export function pdfLibsHtml() {
  const e = S.cw?.ss?.pdf,
    ln = e?.data ? pdfLine(e.data) : null;
  if (!ln || ln.kind === 'ready') return ''; // un état bon se tait : la ligne n'apparaît que s'il y a quelque chose à faire
  const T = TX.pdfl,
    fix = ln.script ? tt(T.fix, {
      s: ln.script
    }) : tt(T.fixAny),
    why = p => p.state === 'missing' ? tt(T.missing, {
      n: p.name
    }) : p.state === 'old' ? tt(p.version ? T.old : T.oldNoV, {
      n: p.name,
      v: p.version,
      m: p.minimum
    }) : p.state === 'new' ? tt(p.version ? T.newer : T.newerNoV, {
      n: p.name,
      v: p.version,
      m: p.maximum
    }) : tt(T.unknown, {
      n: p.name
    }),
    main = ln.kind === 'bounds' ? `<p class="d-headline f-warn" data-pdf-libs data-state="bounds">${esc(`! ${tt(T.label)} : ${tt(T.bounds)}`)}</p>` :
    `<p class="d-headline f-warn" data-pdf-libs data-state="need">${esc(`! ${tt(T.label)} : ${ln.bad.length > 1 ? tt(T.several, { n: ln.bad.length, names: ln.bad.map(p => p.name).join(', ') }) : ln.bad.length ? why(ln.bad[0]) : tt(T.notReady)} — ${fix}`)}</p>`; // plusieurs bibliothèques : dites court (le nombre et les noms), le nom du script reste lisible
  return main;
}
/** Redessine la ligne « Lecture des PDF » de l'en-tête quand sa lecture arrive (renderBuild ne redessine que les panneaux, pas l'en-tête). */
function redrawPdfLibs() {
  const head = S?.body?.querySelector('[data-data-head]');
  if (!head) return;
  head.querySelectorAll('[data-pdf-libs]').forEach(e => e.remove());
  head.insertAdjacentHTML('beforeend', pdfLibsHtml());
}
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
  // SOG-0428 : TOUS les États de la liste (la carte, la liste et la ligne repliée disent chacun le leur : le lanceur dit l'état de chaque État, pas seulement des cochés ; c'est une lecture des noms)
  return {
    states: procArgs(procList().map(i => i.id))
  };
}
/** Les États que le lanceur dit « à faire » sont cochés d'office, une fois chacun (l'utilisateur n'a pas à deviner quoi cocher ; ce qu'il décoche ensuite reste décoché). */
function autoPick(data) {
  S.autoPicked ||= new Set();
  for (const [prefix, x] of Object.entries(data?.states || {}))
    if ((x.state === 'stale' || x.state === 'missing') && !S.autoPicked.has(prefix)) {
      S.autoPicked.add(prefix);
      S.picked?.add(prefix);
    }
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
  if (set === 'proc' && data) autoPick(data);
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
  if (set === 'pdf') redrawPdfLibs();
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
