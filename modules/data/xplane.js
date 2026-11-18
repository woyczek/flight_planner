// V3 data — la ligne « X-Plane (personnel, local) » du bloc des sources personnelles (Q-0108, repli local d'AeroDB) : le dossier d'X-Plane se donne UNE fois, le lanceur (`__setup/xplane`) le vérifie et le garde sur ce poste. La page ne contrôle
// rien d'autre que la longueur (260 signes) : le chemin n'est écrit NULLE PART côté page (ni message, ni DOM après l'envoi, ni attribut, ni stockage, ni console) ; le champ est vidé AVANT la réponse, la ligne ne dit que l'état (« Enregistré — X-Plane, cycle 2610 », neutre) ; un ÉCHEC de geste n'est jamais écrit dans la page : une notification flottante (S.ctx.notify, 'err') avec une phrase FIXE.
// L'état est gardé dans S.xp : { state: 'loading' | 'ready' | 'none', data (xplaneOf), dirty, reading, sending }.
import {
  xplaneOf,
  xplaneReason
} from './model_setstate.js';
import {
  busyNow,
  esc,
  frozen,
  S,
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
  sending: false
});
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
 *  puis le GET est relu. Un 261e signe ou plus : « Chemin trop long », le lanceur n'est pas appelé. */
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
  x.dirty = true;
  renderBuild(); // les boutons se rouvrent
  wantXplane(); // le GET relu dit l'état d'après (cycle, dossier introuvable, non configuré…)
}
/** La ligne d'état d'après ce que le lanceur dit : « Non configuré » (rien d'enregistré), « Enregistré — X-Plane, cycle 2610 », « Dossier introuvable », « Ce n'est pas un dossier X-Plane », « Dossier illisible » ; '' sans état. Jamais le chemin, jamais le nombre de zones. */
function stateText(d) {
  if (!d.configured) return tt(TX.xp.notConfigured);
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
    off = busy || x.sending ? ' disabled' : '',
    state = stateText(d);
  return `<div class="d-xplane" data-xplane><p class="d-xp-title"><b>${esc(tt(TX.xp.title))}</b></p>
    <label>${esc(tt(TX.xp.field))}<input type="text" data-xplane-path maxlength="${MAX}" autocomplete="off" autocapitalize="off" spellcheck="false"${off}></label>
    <p class="d-verbs"><button type="button" class="primary" data-act="xplane-save"${off}>${esc(tt(TX.xp.save))}</button>${d.configured ? `<button type="button" data-act="xplane-clear"${off}>${esc(tt(TX.xp.clear))}</button>` : ''}</p>
    ${state ? `<p class="f-muted" data-xplane-state role="status">${esc(state)}</p>` : ''}</div>`;
}
