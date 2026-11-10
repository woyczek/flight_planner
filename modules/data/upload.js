// V3 data — « Choisir le fichier… » (SOG-0199) : quand le fichier téléchargé n'a pas été trouvé tout seul, l'utilisateur le choisit (sélecteur du système) et l'envoie au lanceur du poste (POST base/upload, ctx.launcher.upload : octets bruts, avancement, annulation) ; le lanceur le reconnaît
// PAR SON CONTENU et le range comme « Prendre le fichier téléchargé », ou dit pourquoi (liste fermée). Rien n'est construit par l'envoi : après un envoi réussi la page enchaîne la construction de la zone reconnue, comme après une prise. Un envoi à la fois ; tout ce que le lanceur répond est une entrée non fiable.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  busyNow,
  catSource,
  esc,
  li,
  S,
  tt
} from './state.js';
import {
  renderBuild
} from './panels.js';
import {
  startPickup
} from './follow.js';

const ROUTE_UPLOAD = 'base/upload';
const MAX_BYTES = 1.5 * 1024 ** 3; // le plafond du lanceur : au-delà, rien n'est envoyé
/** Les raisons de refus que le lanceur sait dire (liste fermée du contrat) : leur clé de TX.up.why. */
const REASONS = ['too-large', 'empty', 'type', 'unrecognised', 'busy', 'merge-pending', 'disk', 'refused'];
/** Les sources que le contrat connaît : un identifiant hors de cette liste est ignoré. */
/** Les sources que l'envoi prend (premier lot d'AeroDB) quand le lanceur ne les redit pas : un PDF, un XML seul ou un tableau n'est pas pris. */
const TAKEN = ['sia', 'nats', 'lfv', 'openaip'];
const nameOfSource = id => (catSource(id)?.n?.[li()] || String(id).toUpperCase()).replace(/\s*\(.*\)\s*$/, '');

/** Le bouton « Choisir le fichier… » de la ligne d'une zone peut-il partir ? Un lanceur, aucune autre opération, aucun envoi en cours. */
export const uploadOff = () => !S.ctx.launcher || busyNow() || !!S.upload;
/** Le geste du bouton : le sélecteur du système s'ouvre (le champ caché de l'écran), la zone est retenue. */
export function chooseFile(zone) {
  if (uploadOff() || !/^[a-z0-9_-]{2,12}$/.test(zone || '')) return;
  S.uploadZone = zone;
  S.body?.querySelector('[data-upload-input]')?.click();
}
/** La ligne d'un envoi en cours sur la ligne de sa zone : le nom, le pourcentage, une barre et « Annuler » ; '' pour une autre zone. */
export function uploadHtml(zone) {
  const u = S.upload;
  if (!u || u.zone !== zone) return '';
  const pct = u.total > 0 ? Math.min(100, Math.floor(100 * u.loaded / u.total)) : 0;
  return `<p class="d-zup" data-uploading="${esc(zone)}"><progress max="100" value="${pct}" aria-label="${esc(tt(TX.up.running, { name: u.name, p: pct }))}"></progress> <span data-up-text>${esc(tt(TX.up.running, { name: u.name, p: pct }))}</span> <button type="button" data-act="upload-cancel">${esc(tt(TX.up.cancel))}</button></p>`;
}
/** Met à jour le seul avancement (sans redessiner les panneaux). */
function paint(zone) {
  const u = S.upload,
    el = S.body?.querySelector(`[data-uploading="${CSS.escape(zone)}"]`);
  if (!u || !el) return;
  const pct = u.total > 0 ? Math.min(100, Math.floor(100 * u.loaded / u.total)) : 0;
  el.querySelector('progress').value = pct;
  el.querySelector('[data-up-text]').textContent = tt(TX.up.running, {
    name: u.name,
    p: pct
  });
}
/** « Annuler » : le signal coupe l'envoi (le lanceur retire son fichier temporaire). */
export function cancelUpload() {
  S.upload?.ctrl.abort();
}
/** Dit ce que le lanceur a répondu : { kind: 'ok' | 'same' | 'fail', text } — jamais un texte du lanceur tel quel, sauf son `message` borné quand la raison est hors de la liste. */
function outcome(r) {
  const body = r?.body && typeof r.body === 'object' ? r.body : {},
    reason = typeof(r?.reason || body.reason) === 'string' ? String(r.reason || body.reason) : '';
  if (r?.aborted) return {
    kind: 'fail',
    text: tt(TX.up.aborted)
  };
  if (r?.offline) return {
    kind: 'fail',
    text: tt(TX.up.offline)
  };
  if (r?.ok && body.ok !== false) {
    const src = typeof body.source === 'string' && M.COV_SOURCES.includes(body.source) ? nameOfSource(body.source) : '',
      zone = typeof body.zone === 'string' && /^[a-z0-9_-]{2,12}$/.test(body.zone) ? body.zone : '',
      name = String(body.name ?? '').replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ').trim().slice(0, 120);
    return {
      kind: body.replaced === false ? 'same' : 'ok',
      zone,
      text: tt(body.replaced === false ? TX.up.same : TX.up.done, {
        name,
        s: src,
        z: zone ? M.zoneName(S.d.zones, zone, li()) : ''
      })
    };
  }
  if (r?.status === 404) return {
    kind: 'fail',
    text: tt(TX.up.unknownRoute)
  };
  if (REASONS.includes(reason)) {
    const given = [r?.expected, body.expected].find(Array.isArray) || [],
      expected = (given.length ? given : TAKEN).filter(x => M.COV_SOURCES.includes(x)).slice(0, 10).map(nameOfSource).join(', ');
    return {
      kind: 'fail',
      text: tt(TX.up.why[reason], {
        s: expected
      })
    };
  }
  return {
    kind: 'fail',
    text: tt(TX.up.failed)
  };
}
/** Envoie le fichier choisi : un seul à la fois, l'avancement sur la ligne de la zone, la fin en une notification ; un envoi réussi enchaîne la construction de la zone reconnue (celle de la ligne à défaut). */
export async function startUpload(zone, file) {
  const me = S;
  if (!file || uploadOff() || !/^[a-z0-9_-]{2,12}$/.test(zone || '')) return;
  const name = String(file.name || '').replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ').trim().slice(0, 120) || '?';
  if (file.size > MAX_BYTES) return S.ctx.notify(tt(TX.up.why['too-large']), 'err');
  if (file.size === 0) return S.ctx.notify(tt(TX.up.why.empty), 'err');
  const ctrl = new AbortController();
  S.upload = {
    zone,
    name,
    loaded: 0,
    total: file.size,
    ctrl
  };
  renderBuild();
  const r = await S.ctx.launcher.upload(ROUTE_UPLOAD, file, {
    name,
    signal: ctrl.signal,
    onProgress: (loaded, total) => {
      if (S !== me || !S.upload) return;
      S.upload.loaded = loaded;
      if (total > 0) S.upload.total = total;
      paint(zone);
    }
  });
  if (S !== me) return;
  S.upload = null;
  const out = outcome(r);
  renderBuild();
  S.ctx.notify(out.text, out.kind === 'fail' ? 'err' : 'ok');
  // le fichier est rangé là où « Prendre le fichier téléchargé » lit (data/local/upload/) : le parcours normal suit — le plan, la prise, puis la construction de la zone reconnue
  if (out.kind !== 'fail') await startPickup(out.zone || zone);
}
