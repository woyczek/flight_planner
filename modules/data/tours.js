// V3 data — « Tours de piste VFR » (SOG-0253) : le dépôt du XML `VfrCircuits` que produit l'extracteur de l'utilisateur, un pli sous « Vu par le poste ». Le lanceur le reconnaît à sa RACINE (POST base/upload → source `vfr_circuits`), le garde tel quel sur ce poste
// (jamais commité, jamais publié) et le lit par le verbe `vfr/circuits` (lecture seule) : l'écran dit ce qui est reconnu (n tours de piste sur m terrains, ceux dont la carte VAC a changé écartés, les éléments mal formés laissés de côté) ou refusé, avec ses mots à lui
// (le texte du lanceur n'est jamais montré). Même geste, même champ caché et même route que le registre français (registry.js) : aucune route nouvelle.
import {
  TX
} from './texts.js';
import {
  busyNow,
  esc,
  ROUTE,
  S,
  serial,
  tt
} from './state.js';
import {
  renderBuild
} from './panels.js';
import {
  forgetReads
} from './countries.js';
import {
  outcome,
  uploadOff
} from './upload.js';
import {
  showBusy
} from './busy.js';
import {
  circuitsOf
} from './model_tours.js';

const MAX_BYTES = 2 * 1024 ** 2; // le plafond du lanceur pour ce fichier : au-delà, rien n'est envoyé
/** L'état propre à ce pli : l'envoi en cours, le dernier message, ce que la lecture du lanceur a rendu. */
export const toursInit = () => ({
  up: null,
  msg: null,
  read: null
});
const word = (key, vars) => tt(TX.trk[key], vars);
/** La pastille du pli : ce que la dernière lecture a rendu (« 28 tours · 26 terrains »), '' sans lecture (l'écran ne lit rien tant qu'on n'y dépose rien). */
export function toursPill() {
  const r = S.cw?.lc?.tours?.read;
  return r && !r.refused ? word('pill', {
    c: r.circuits,
    a: r.aerodromes
  }) : '';
}
/** Pourquoi le bouton est gris (un mot du lanceur), '' quand il est libre. */
const greyWhy = () => !S.ctx.launcher ? 'no-launcher' : busyNow() || !!S.upload || !!S.cw?.lc?.tours?.up ? 'busy' : '';
/** Le contenu du pli : ce que c'est, le geste, la réponse. */
export function toursBody() {
  const st = S.cw.lc.tours,
    why = greyWhy(),
    up = st.up,
    pct = up && up.total > 0 ? Math.min(100, Math.floor(100 * up.loaded / up.total)) : 0,
    gesture = up ? `<p data-trk-uploading><progress max="100" value="${pct}" aria-label="${esc(tt(TX.up.running, { name: up.name, p: pct }))}"></progress> <span data-trk-up-text>${esc(tt(TX.up.running, { name: up.name, p: pct }))}</span> <button type="button" data-act="trk-cancel">${esc(tt(TX.up.cancel))}</button></p>` :
    `<p><button type="button" class="f-btn primary" data-act="trk-choose"${why ? ' disabled' : ''}>${esc(tt(TX.up.choose))}</button>${why ? ` <span class="f-muted" data-trk-why="${why}">${esc(tt(TX.greyReason[why]))}</span>` : ''}</p>`;
  return `<p class="f-muted">${esc(word('hint'))}</p>${gesture}${st.msg ? `<p data-trk-msg data-level="${esc(st.msg.level)}"${st.msg.level === 'err' ? ' role="alert"' : ''}>${esc(st.msg.text)}</p>` : ''}`;
}
/** « Choisir le fichier… » : le sélecteur du système s'ouvre (le champ caché de l'écran) ; la source `vfr_circuits` dit à onChange que le fichier est celui des tours de piste. */
export function chooseTours() {
  if (uploadOff() || S.cw.lc.tours.up) return;
  S.uploadZone = '';
  S.uploadSource = 'vfr_circuits';
  S.body?.querySelector('[data-upload-input]')?.click();
}
/** « Annuler » : le signal coupe l'envoi. */
export function cancelTours() {
  S.cw?.lc?.tours?.up?.ctrl.abort();
}

function paint() {
  const st = S.cw?.lc?.tours,
    el = S.body?.querySelector('[data-lc-fold=tours] [data-trk-uploading]');
  if (!st?.up || !el) return;
  const pct = st.up.total > 0 ? Math.min(100, Math.floor(100 * st.up.loaded / st.up.total)) : 0;
  el.querySelector('progress').value = pct;
  el.querySelector('[data-trk-up-text]').textContent = tt(TX.up.running, {
    name: st.up.name,
    p: pct
  });
}

function say(level, text) {
  S.cw.lc.tours.msg = {
    level,
    text
  };
  S.ctx.notify(text, level === 'err' ? 'err' : 'ok');
}
/** Lit ce que le lanceur a retenu du fichier (vfr/circuits, lecture seule, par la file de l'écran) ; null sans réponse. Ne lève jamais. */
async function readCircuits() {
  const L = S?.ctx?.launcher;
  if (!L || !S.known?.includes('vfr/circuits')) return null;
  try {
    return circuitsOf(await serial(() => L.job(ROUTE, {
      set: 'vfr',
      verb: 'circuits',
      args: {}
    }, {
      onProgress: () => {},
      signal: new AbortController().signal
    })));
  } catch {
    return null;
  }
}
/** Envoie le fichier choisi au lanceur (un seul envoi à la fois), puis lit ce qu'il en a retenu et le dit : n tours de piste sur m terrains, les périmés écartés, les éléments laissés de côté ; ou le refus en mots. */
export async function startToursUpload(file) {
  const me = S;
  if (!file || uploadOff() || S.cw.lc.tours.up) return;
  const name = String(file.name || '').replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ').trim().slice(0, 120) || '?';
  S.cw.lc.tours.msg = null;
  if (file.size === 0 || file.size > MAX_BYTES) {
    say('err', tt(file.size === 0 ? TX.up.why.empty : TX.up.why['too-large']));
    return renderBuild();
  }
  const ctrl = new AbortController();
  S.cw.lc.tours.up = {
    name,
    loaded: 0,
    total: file.size,
    ctrl
  };
  renderBuild();
  const r = await S.ctx.launcher.upload('base/upload', file, {
    name,
    signal: ctrl.signal,
    onProgress: (loaded, total) => {
      if (S !== me || !S.cw?.lc?.tours?.up) return;
      S.cw.lc.tours.up.loaded = loaded;
      if (total > 0) S.cw.lc.tours.up.total = total;
      paint();
    }
  });
  if (S !== me) return;
  S.cw.lc.tours.up = null;
  const body = r?.body && typeof r.body === 'object' ? r.body : {},
    reason = String(r?.reason || body.reason || '');
  if (r?.ok && body.ok !== false && body.source === 'vfr_circuits') {
    const got = await readCircuits();
    if (S !== me) return;
    S.cw.lc.tours.read = got;
    if (got?.refused) say('err', word('unreadable'));
    else if (got) say('ok', [word('done', {
      c: got.circuits,
      a: got.aerodromes
    }), got.obsolete ? word('obsolete', {
      o: got.obsolete
    }) : '', got.warnings ? word('left', {
      w: got.warnings
    }) : ''].filter(Boolean).join(' '));
    else say('ok', word('received'));
  } else if ((r?.ok && body.ok !== false) || reason === 'unrecognised') {
    say('err', word(
      'refused')); // le lanceur a rangé le fichier sous une autre source, ou ne le reconnaît pas : ce n'est pas le XML des tours de piste
  } else {
    const out = outcome(r);
    say('err', out.text);
    if (out.running) showBusy(out.running, 'base');
  }
  forgetReads(false, false);
  renderBuild();
}
