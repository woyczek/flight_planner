// V3 data — la ligne « X-Plane (personnel, local) » du bloc des sources personnelles (Q-0108, repli local d'AeroDB) : le dossier d'X-Plane se donne UNE fois, le lanceur (`__setup/xplane`) le vérifie et le garde sur ce poste. La page ne contrôle
// rien d'autre que la longueur (260 signes) : le chemin n'est écrit NULLE PART côté page (ni message, ni DOM après l'envoi, ni attribut, ni stockage, ni console) ; le champ est vidé AVANT la réponse, la ligne ne dit que l'état (« Enregistré — X-Plane, cycle 2610 », neutre) ; un ÉCHEC de geste n'est jamais écrit dans la page : une notification flottante (S.ctx.notify, 'err') avec une phrase FIXE.
// L'état est gardé dans S.xp : { state: 'loading' | 'ready' | 'none', data (xplaneOf), dirty, reading, sending, build }.
// « Enregistrer » réussi lance aussitôt le verbe `xplane/build` du lanceur (la lecture du réseau de repli) ; « Mettre à jour » le relance à sa fin quand le cycle du dossier a changé (xplaneAfterUpdate). Le résultat est dit par la ligne d'état
// (S.xp.build : { state: 'idle' | 'waiting' | 'running' | 'ok' | 'fail', cycle, segs, reason }), un échec aussi par une notification à phrase fixe ; jamais le chemin, jamais un texte du lanceur.
import {
  xplaneBuildOf,
  xplaneOf,
  xplaneReason,
  xplaneStale
} from './model_setstate.js';
import {
  busyNow,
  esc,
  frozen,
  ROUTE,
  S,
  serial,
  tt,
  XPLANE_ROUTE
} from './state.js';
import {
  TX
} from './texts.js';
import {
  renderBuild
} from './panels.js';

/** La longueur la plus grande d'un chemin que la page envoie (le contrat du lanceur : 260 signes). */
const MAX = 260;
/** Le verbe du lanceur qui lit le réseau de repli (job `regen/job` { set: 'xplane', verb: 'build', args: {} }) : la liste `regen/verbs` doit le dire. */
const BUILD_VERB = 'xplane/build';
/** La phrase fermée de chaque code de refus du contrat (jamais un texte du lanceur). */
const REASON_ROW = {
  'bad-body': TX.xp.reason.badBody,
  'too-long': TX.xp.reason.tooLong,
  refused: TX.xp.reason.refused,
  'not-a-folder': TX.xp.reason.notAFolder,
  'not-xplane': TX.xp.reason.notXplane,
  'not-personal': TX.xp.reason.notPersonal
};
/** L'état de la ligne à la création de l'écran : à lire (la lecture ne part que si la coche « personnel » est cochée). */
export const xpInit = () => ({
  state: 'loading',
  data: null,
  dirty: true,
  reading: false,
  sending: false,
  build: xpBuildInit()
});
/** L'état de la lecture du réseau au repos : rien lancé, rien à dire. */
export const xpBuildInit = () => ({
  state: 'idle',
  cycle: '',
  segs: 0,
  reason: ''
});
/** Le lanceur connaît-il le verbe `xplane/build` ? Sans lui (lanceur plus ancien) rien n'est lancé et la ligne ne dit rien de plus. */
const buildKnown = () => !!S?.ctx?.launcher && Array.isArray(S.known) && S.known.includes(BUILD_VERB);
/** Lance la lecture du réseau X-Plane (`xplane/build`, arguments `{}`) par la file de l'écran (le lanceur ne tient qu'un travail à la fois) ; rend à sa fin. Un seul à la fois ; jamais pendant une opération (l'état passe à 'waiting' et setStatesIdle la reprend dès que l'écran est libre) ;
 *  sans la coche « personnel » ou sans le verbe : rien. À la fin : l'état de la ligne (réussite ou une phrase fermée par code, un échec est aussi une notification), puis le GET est relu (le cycle construit change). L'écran quitté : rien n'est écrit. */
export async function startXpBuild() {
  const me = S,
    x = S?.xp;
  if (!x || !buildKnown()) return;
  if (S.certified !== true) {
    if (x.build.state === 'waiting') x.build = xpBuildInit();
    return;
  }
  if (x.build.state === 'running') return;
  if (busyNow()) {
    if (x.build.state !== 'waiting') {
      x.build = {
        ...xpBuildInit(),
        state: 'waiting'
      };
      renderBuild();
    }
    return;
  }
  x.build = {
    ...xpBuildInit(),
    state: 'running'
  };
  renderBuild();
  let final = null;
  try {
    final = await serial(() => me.ctx.launcher.job(ROUTE, {
      set: 'xplane',
      verb: 'build',
      args: {}
    }, {
      onProgress: () => {},
      signal: new AbortController().signal
    }));
  } catch {
    final = null; // jamais le texte de l'erreur
  }
  if (S !== me) return;
  const out = xplaneBuildOf(final);
  x.build = !out ? xpBuildInit() : out.ok ? {
    state: 'ok',
    cycle: out.cycle,
    segs: out.segs,
    reason: ''
  } : {
    ...xpBuildInit(),
    state: 'fail',
    reason: out.reason
  };
  if (out && !out.ok) S.ctx.notify(tt(TX.xp.netFail[out.reason]), 'warn');
  x.dirty = true; // le GET dit le cycle construit (`built`) et les zones : relu
  renderBuild();
  await wantXplane();
}
/** À la fin de « Mettre à jour » : relit le dossier (son cycle a pu changer) et relance la lecture du réseau si elle n'est pas de ce cycle (xplaneStale : dossier configuré, état 'ok', cycle connu, `built` différent du cycle ou, sans `built`, aucune zone construite) ;
 *  rend à la fin de la lecture. Sans la coche « personnel » ou sans le verbe : rien. L'échec de la lecture ne change pas le verdict de « Mettre à jour » (la ligne X-Plane le dit seule). */
export async function xplaneAfterUpdate() {
  const me = S,
    x = S?.xp;
  if (!x || S.certified !== true || !buildKnown()) return;
  x.dirty = true;
  await wantXplane();
  for (let i = 0; x.reading && S === me && i < 100; i++) await new Promise(r => setTimeout(r,
    100)); // une lecture déjà en route (elle se refait : elle voit « à relire ») finit d'abord
  if (S !== me || x.dirty || !x.data || !xplaneStale(x.data)) return;
  await startXpBuild();
}
/** Lit le dossier d'X-Plane que le lanceur tient (GET xplane) si la lecture est à refaire ; ne lit rien sans la coche « personnel », jamais pendant une opération du lanceur (elle reste « à relire »), ne lève jamais.
 *  Un 404, un 403, un lanceur plus ancien : pas de données, la ligne n'est pas dessinée. */
export async function wantXplane() {
  const me = S,
    x = S?.xp;
  if (!x || !x.dirty || x.reading || x.sending) return;
  if (S.certified !== true) {
    x.dirty = false;
    x.data = null;
    x.state = 'none';
    return;
  }
  if (busyNow()) return; // une opération tourne : la lecture reste « à relire », setStatesIdle la reprend
  x.reading = true;
  x.dirty = false;
  let r = null;
  try {
    r = await S.ctx.launcher?.call?.(XPLANE_ROUTE);
  } catch {
    r = null;
  }
  if (S !== me) return;
  x.reading = false;
  if (x.dirty) return wantXplane(); // un geste ou la coche ont changé pendant la lecture : elle est refaite
  x.data = S.certified === true ? xplaneOf(r) : null;
  x.state = x.data ? 'ready' : 'none';
  renderBuild();
}
/** La coche « personnel » a changé (ou un geste a fini) : la lecture est à refaire ; décochée, la ligne disparaît aussitôt. */
export function xplaneRefresh() {
  const x = S?.xp;
  if (!x) return;
  x.dirty = true;
  if (S.certified !== true) {
    x.data = null;
    x.state = 'none';
    if (x.build.state === 'ok' || x.build.state === 'fail') x.build =
      xpBuildInit(); // décochée : ce que la lecture du réseau avait dit s'efface avec la ligne
  }
  wantXplane();
}
/** Lit le champ, le vide AUSSITÔT et envoie : le chemin ne vit que dans cette fonction, le temps de l'appel (jamais gardé après). Rend la promesse de l'appel, 'too-long' (rien n'est envoyé), ou null (champ vide : rien à faire).
 *  `clear` : « Effacer » envoie un chemin vide. */
function sendPath(input, clear) {
  const p = clear ? '' : input.value.trim();
  if (!clear && !p) return null;
  if (p.length > MAX) {
    input.value = '';
    return 'too-long';
  }
  const sent = S.ctx.launcher?.call?.(XPLANE_ROUTE, {
    path: p
  });
  input.value = ''; // vidé avant même la réponse
  return sent;
}
/** La phrase fermée d'un ÉCHEC de geste d'après la réponse du lanceur : celle de son code de refus (hors liste : « refused »), ou « Demande refusée » sans réponse lisible ; null quand le lanceur a accepté (`ok: true`). Jamais un texte du lanceur. */
function failure(r) {
  if (r !== null && typeof r === 'object' && r.ok === true) return null;
  const code = r !== null && typeof r === 'object' && typeof r.reason === 'string' ? xplaneReason(r.reason) : 'bad-body';
  return REASON_ROW[code];
}
/** « Enregistrer » (`xplane-save`, ou la touche Entrée dans le champ) et « Effacer » (`xplane-clear`) : un seul geste à la fois, jamais pendant une opération ; un succès n'écrit rien de plus (le GET relu change la ligne d'état), un échec est dit par une notification flottante à phrase FIXE (jamais le chemin),
 *  puis le GET est relu. Un « Enregistrer » réussi lance ensuite la lecture du réseau (startXpBuild : la ligne dit le résultat) ; un « Effacer » réussi efface ce que la lecture avait dit. Un 261e signe ou plus : « Chemin trop long », le lanceur n'est pas appelé. */
export async function xplaneGesture(act) {
  const me = S,
    x = S?.xp,
    input = S?.body?.querySelector('[data-xplane-path]');
  if (!x || !input || x.sending || frozen() || S.certified !== true) return;
  const out = sendPath(input, act === 'xplane-clear');
  if (out === null) return;
  if (out === 'too-long') return S.ctx.notify(tt(TX.xp.reason.tooLong), 'err');
  x.sending = true;
  let r = null;
  try {
    r = await out;
  } catch {
    r = null; // jamais le texte de l'erreur
  }
  if (S !== me) return;
  x.sending = false;
  const row = failure(r);
  if (row) S.ctx.notify(tt(row), 'err'); // l'échec : une notification, phrase fixe
  else if (x.build.state !== 'running' && x.build.state !== 'waiting') x.build =
    xpBuildInit(); // un dossier enregistré ou effacé : ce que la lecture du réseau disait de l'ancien n'est plus vrai
  x.dirty = true;
  renderBuild(); // les boutons se rouvrent
  await wantXplane(); // le GET relu dit l'état d'après (cycle, dossier introuvable, non configuré…)
  if (S === me && !row && act === 'xplane-save')
    startXpBuild(); // « Enregistrer » réussi : le réseau est lu aussitôt (la ligne dit le résultat)
}
/** La ligne d'état d'après ce que le lanceur dit : « Non configuré » (rien d'enregistré), « Enregistré — X-Plane, cycle 2610 », « Dossier introuvable », « Ce n'est pas un dossier X-Plane », « Dossier illisible » ; '' sans état. Jamais le chemin, jamais le nombre de zones.
 *  La lecture du réseau prime quand elle tourne (« Lecture du réseau X-Plane… ») et, un dossier en état 'ok', quand elle est finie : « Réseau lu — cycle 2610, 12 tronçons » ou la phrase fermée de son échec. */
function stateText(d) {
  const b = S.xp.build;
  if (b.state === 'running') return tt(TX.xp.netRun);
  if (b.state === 'waiting') return tt(TX.xp.netWait);
  if (!d.configured) return tt(TX.xp.notConfigured);
  if (d.state === 'ok' && b.state === 'ok') return b.cycle ? tt(TX.xp.netDone, {
    c: b.cycle,
    n: b.segs
  }) : tt(TX.xp.netDoneNoCycle, {
    n: b.segs
  });
  if (d.state === 'ok' && b.state === 'fail') return tt(TX.xp.netFail[b.reason]);
  if (d.state === 'ok') return d.cycle ? tt(TX.xp.okCycle, {
    c: d.cycle
  }) : tt(TX.xp.ok);
  if (d.state === 'missing') return tt(TX.xp.missing);
  if (d.state === 'not-xplane') return tt(TX.xp.notXplane);
  if (d.state === 'unreadable') return tt(TX.xp.unreadable);
  return '';
}
/** La ligne « X-Plane (personnel, local) » : vide sans la coche « personnel » ou sans réponse du lanceur ; sinon le champ du dossier, « Enregistrer » (et « Effacer » quand un dossier est configuré), l'état dit (ton neutre).
 *  Grisée comme la coche pendant une marche (`busy`). Le chemin n'est jamais écrit : ni valeur, ni attribut, ni titre. */
export function xplaneRowHtml(busy) {
  const x = S?.xp;
  if (S?.certified !== true || !x?.data) return '';
  const d = x.data,
    off = busy || x.sending || x.build.state === 'running' ? ' disabled' : '',
    state = stateText(d);
  return `<div class="d-xplane" data-xplane><p class="d-xp-title"><b>${esc(tt(TX.xp.title))}</b></p>
    <label>${esc(tt(TX.xp.field))}<input type="text" data-xplane-path maxlength="${MAX}" autocomplete="off" autocapitalize="off" spellcheck="false"${off}></label>
    <p class="d-verbs"><button type="button" class="primary" data-act="xplane-save"${off}>${esc(tt(TX.xp.save))}</button>${d.configured ? `<button type="button" data-act="xplane-clear"${off}>${esc(tt(TX.xp.clear))}</button>` : ''}</p>
    ${state ? `<p class="f-muted" data-xplane-state role="status">${esc(state)}</p>` : ''}</div>`;
}
