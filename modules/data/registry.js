// V3 data — « Registre français des aéronefs » (SOG-0315, point 4) : le dépôt du fichier d'immatriculations de la DGAC (export.csv), un pli sous « Vu par le poste, pas encore lu » (later.js). Le lanceur le reconnaît à son en-tête (POST base/upload → source
// registry_fr), ne garde que cinq colonnes sur ce poste (jamais un propriétaire, jamais le fichier d'origine) et le dit dans base/cycle.local ; l'écran des aéronefs y renvoie par « #data?registry=1 » (le pli s'ouvre et vient dans la vue). Tout ce que dit le lanceur est une
// entrée non fiable : les nombres sont bornés, le texte du lanceur n'est jamais montré (les refus se disent avec les mots de l'écran).
import {
  TX
} from './texts.js';
import {
  busyNow,
  esc,
  lang,
  S,
  tt
} from './state.js';
import {
  renderBuild
} from './panels.js';
import {
  dateOf,
  forgetReads
} from './countries.js';
import {
  outcome,
  uploadOff
} from './upload.js';
import {
  showBusy
} from './busy.js';

/** La page de la DGAC où le fichier se télécharge (fixée par le code : jamais une adresse du lanceur). */
const DGAC_URL = 'https://immat.aviation-civile.gouv.fr/immat/servlet/aeronef_liste.html';
const MAX_BYTES = 200 * 1024 ** 2; // bien au-dessus de l'export réel (une trentaine de Mo) ; le lanceur a son propre plafond
/** L'état propre à ce pli, créé avec celui des blocs repliés : l'envoi en cours, le dernier message, le fichier que l'envoi vient de déposer. */
export const regInit = () => ({
  up: null,
  msg: null,
  done: null
});
/** Le fichier que le lanceur dit garder (base/cycle.local `registry_fr`), ou celui que l'écran vient de déposer : { at } ; null sans. */
function deposited() {
  const local = S.cw?.todo?.state === 'ready' ? S.cw.todo.data?.local?.find(x => x.id === 'registry_fr') : null,
    done = S.cw?.lc?.reg?.done;
  return done || (local ? {
    at: local.at
  } : null);
}
/** Le texte (avec ses {noms}) d'un mot du pli dans la langue. */
const word = (key, vars) => tt(TX.regs[key], vars);
/** La pastille du pli : « déposé le … » ou « pas déposé » ; '' tant que la liste du cycle n'est pas lue (on ne sait pas). */
export function registryPill() {
  const dep = deposited();
  if (dep) return word('pillOn', {
    d: dateOf(dep.at) || '?'
  });
  return S.cw?.todo?.state === 'ready' ? word('pillOff') : '';
}
/** Pourquoi le bouton est gris, en un mot du lanceur (jamais gris sans raison écrite) ; '' quand il est libre. */
const greyWhy = () => !S.ctx.launcher ? 'no-launcher' : busyNow() || !!S.upload || !!S.cw?.lc?.reg?.up ? 'busy' : '';
/** Le contenu du pli : ce que c'est, l'état, où prendre le fichier, le geste, la réponse. */
export function registryBody() {
  const reg = S.cw.lc.reg,
    dep = deposited(),
    why = greyWhy(),
    up = reg.up,
    pct = up && up.total > 0 ? Math.min(100, Math.floor(100 * up.loaded / up.total)) : 0,
    gesture = up ? `<p data-reg-uploading><progress max="100" value="${pct}" aria-label="${esc(tt(TX.up.running, { name: up.name, p: pct }))}"></progress> <span data-reg-up-text>${esc(tt(TX.up.running, { name: up.name, p: pct }))}</span> <button type="button" data-act="reg-cancel">${esc(tt(TX.up.cancel))}</button></p>` :
    `<p><button type="button" class="f-btn primary" data-act="reg-choose"${why ? ' disabled' : ''}>${esc(tt(TX.up.choose))}</button>${why ? ` <span class="f-muted" data-reg-why="${why}">${esc(tt(TX.greyReason[why]))}</span>` : ''}</p>`;
  return `<p class="f-muted">${esc(word('hint'))}</p>
    <p data-reg-state>${esc(dep ? word('stateOn', { d: dateOf(dep.at) || '?' }) : word('stateOff'))}</p>
    <p>${esc(word('get'))} <a href="${DGAC_URL}" target="_blank" rel="noopener noreferrer">${esc(word('site'))}</a></p>
    ${gesture}${reg.msg ? `<p data-reg-msg data-level="${esc(reg.msg.level)}"${reg.msg.level === 'err' ? ' role="alert"' : ''}>${esc(reg.msg.text)}</p>` : ''}`;
}
/** « Choisir le fichier… » : le sélecteur du système s'ouvre (le champ caché de l'écran) ; la zone vide et la source `registry_fr` disent à onChange que le fichier est celui du registre. */
export function chooseRegistry() {
  if (uploadOff() || S.cw.lc.reg.up) return;
  S.uploadZone = '';
  S.uploadSource = 'registry_fr';
  S.body?.querySelector('[data-upload-input]')?.click();
}
/** « Annuler » : le signal coupe l'envoi. */
export function cancelRegistry() {
  S.cw?.lc?.reg?.up?.ctrl.abort();
}
/** Redessine le seul pli (l'avancement de l'envoi ne touche pas le reste de l'écran). */
function paint() {
  const reg = S.cw?.lc?.reg,
    el = S.body?.querySelector('[data-lc-fold=registry] [data-reg-uploading]');
  if (!reg?.up || !el) return;
  const pct = reg.up.total > 0 ? Math.min(100, Math.floor(100 * reg.up.loaded / reg.up.total)) : 0;
  el.querySelector('progress').value = pct;
  el.querySelector('[data-reg-up-text]').textContent = tt(TX.up.running, {
    name: reg.up.name,
    p: pct
  });
}
/** Dit une fin : le message du pli (vert ou rouge) et une notification. */
function say(level, text) {
  S.cw.lc.reg.msg = {
    level,
    text
  };
  S.ctx.notify(text, level === 'err' ? 'err' : 'ok');
}
/** Envoie le fichier choisi au lanceur (un seul envoi à la fois) et dit ce qu'il en a fait : le nombre d'immatriculations lues et la date des données, ou le refus en mots. Rien n'est construit ; la liste du cycle est relue à la fin (le lanceur dit alors le fichier gardé). */
export async function startRegistryUpload(file) {
  const me = S;
  if (!file || uploadOff() || S.cw.lc.reg.up) return;
  const name = String(file.name || '').replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ').trim().slice(0, 120) || '?';
  S.cw.lc.reg.msg = null;
  if (file.size === 0 || file.size > MAX_BYTES) {
    say('err', tt(file.size === 0 ? TX.up.why.empty : TX.up.why['too-large']));
    return renderBuild();
  }
  const ctrl = new AbortController();
  S.cw.lc.reg.up = {
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
      if (S !== me || !S.cw?.lc?.reg?.up) return;
      S.cw.lc.reg.up.loaded = loaded;
      if (total > 0) S.cw.lc.reg.up.total = total;
      paint();
    }
  });
  if (S !== me) return;
  S.cw.lc.reg.up = null;
  const body = r?.body && typeof r.body === 'object' ? r.body : {},
    reason = String(r?.reason || body.reason || '');
  if (r?.ok && body.ok !== false && body.source === 'registry_fr') {
    const rows = Number.isInteger(body.rows) && body.rows >= 0 && body.rows <= 5e6 ? body.rows : 0,
      at = /^\d{4}-\d{2}-\d{2}/.test(String(body.date ?? '')) ? String(body.date).slice(0, 10) : new Date().toISOString().slice(0, 10);
    S.cw.lc.reg.done = {
      at
    };
    say('ok', word('done', {
      n: new Intl.NumberFormat(lang()).format(rows),
      d: dateOf(at)
    }));
  } else if (r?.ok && body.ok !== false) {
    say('err', word('refused')); // le lanceur a rangé le fichier sous une autre source : ce n'est pas le registre
  } else if (reason === 'unrecognised') {
    say('err', word('refused'));
  } else {
    const out = outcome(r);
    say('err', out.text);
    if (out.running) showBusy(out.running, 'base');
  }
  forgetReads(false, false); // la liste du cycle est relue dès que l'écran est libre : le lanceur y dit le fichier qu'il garde
  renderBuild();
}
