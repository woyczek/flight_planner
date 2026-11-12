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
  pickSource,
  S,
  tt
} from './state.js';
import {
  handMsgOf,
  renderBuild,
  selectionOf
} from './panels.js';
import {
  startRoute
} from './route.js';
import {
  fetchThenBuild,
  startPickup
} from './follow.js';
import {
  showBusy
} from './busy.js';

const ROUTE_UPLOAD = 'base/upload';
const MAX_BYTES = 1.5 * 1024 ** 3; // le plafond du lanceur : au-delà, rien n'est envoyé
/** Les raisons de refus que le lanceur sait dire (liste fermée du contrat) : leur clé de TX.up.why. */
const REASONS = ['too-large', 'empty', 'type', 'unrecognised', 'busy', 'merge-pending', 'disk', 'refused'];
/** Un identifiant de source tel que le lanceur le dit dans `expected` : minuscules, chiffres et tiret bas, 2 à 25 signes (il peut nommer une source que le catalogue n'a pas : son identifiant en majuscules). */
const SOURCE_ID = /^[a-z][a-z0-9_]{1,24}$/;
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
    const src = typeof body.source === 'string' && (M.COV_SOURCES.includes(body.source) || /^eurocontrol(_rad)?$/.test(body.source)) ?
      nameOfSource(body.source) : '',
      route = typeof body.source === 'string' && /^eurocontrol(_rad)?$/.test(body
        .source), // un classeur EUROCONTROL : pas de zone, l'import de la ligne Route suit
      zone = typeof body.zone === 'string' && /^[a-z0-9_-]{2,12}$/.test(body.zone) ? body.zone : '',
      name = String(body.name ?? '').replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ').trim().slice(0, 120);
    return {
      kind: body.replaced === false ? 'same' : 'ok',
      zone,
      source: typeof body.source === 'string' ? body.source : '',
      cycle: /^\d{4}-\d{2}-\d{2}$/.test(String(body.cycle ?? '')) ? body.cycle : '',
      file: name,
      // le lanceur dit lui-même les jeux déjà posés pour CE cycle et ceux à envoyer (AeroDB 42aab1ae8) : listes fermées, jamais autre chose que FIX, AWY, NAV
      deposited: Array.isArray(body.deposited) ? body.deposited.filter(k => NASR_SETS.includes(k)) : null,
      missing: Array.isArray(body.missing) ? body.missing.filter(k => NASR_SETS.includes(k)) : null,
      text: tt(body.replaced === false ? TX.up.same : route ? TX.up.doneRoute : TX.up.done, {
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
    // les sources que l'envoi prend : celles que le lanceur dit (`expected`, dix au plus), jamais une liste de la page ; sans elles la phrase n'en nomme aucune
    const said0 = r?.message ?? body
      .message, // le motif en clair du lanceur (la bibliothèque le rend dans `message`, « HTTP 422 » à défaut : ce n'est pas un motif)
      given = [r?.expected, body.expected].find(Array.isArray) || [],
      expected = [...new Set(given.filter(x => typeof x === 'string' && SOURCE_ID.test(x)))].slice(0, 10).map(nameOfSource).join(', '),
      row = !expected && Object.hasOwn(TX.up.whyNone, reason) ? TX.up.whyNone[reason] : TX.up.why[reason],
      said = reason === 'unrecognised' && typeof said0 === 'string' && !/^HTTP \d+$/.test(said0) ? said0.replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu,
        ' ').trim().slice(0, 240) : '';
    return {
      kind: 'fail',
      running: reason === 'busy' ? M.runningOf(r?.running ?? body.running) : null, // l'opération qui tourne, dite par le lanceur (SOG-0245)
      detail: said, // « unrecognised » : la raison que le lanceur donne en clair (un eAIP qui n'est pas celui du Portugal, une image illisible…)
      text: tt(row, {
        s: expected
      })
    };
  }
  return {
    kind: 'fail',
    text: tt(TX.up.failed)
  };
}
/** Les trois jeux du NASR de la FAA que le lanceur lit ensemble (le nom d'origine de la FAA dit lequel : « 29_Oct_2026_FIX_CSV.zip »). */
const NASR_SETS = ['FIX', 'AWY', 'NAV'];
/** Un jeu NASR de la FAA vient d'être reconnu : l'écran compte les envois du cycle (le lanceur ne le dit pas dans la vue) ; au troisième, le téléchargement de la zone lit les trois puis la construction part ; avant, il dit ce qui manque. */
async function faaSet(out, zone) {
  let have, miss;
  if (out.deposited && out.missing) { // le lanceur le dit : on le lit
    have = out.deposited;
    miss = out.missing;
  } else { // un lanceur plus ancien : l'écran compte lui-même les envois du cycle d'après le nom d'origine de la FAA
    const got = S.nasr ||= {},
      key = out.cycle || '-',
      names = got[key] ||= new Set();
    if (names.size < 12) names.add(out.file.toUpperCase());
    have = NASR_SETS.filter(k => [...names].some(n => n.includes(k)));
    miss = NASR_SETS.filter(k => !have.includes(k));
    if (!miss.length || names.size >= NASR_SETS.length) {
      miss = [];
      delete got[key];
    }
  }
  if (miss.length) return S.ctx.notify(tt(TX.up.nasrWait, {
    h: have.join(', ') || '0',
    m: miss.join(', ')
  }), 'warn');
  await fetchThenBuild(out.zone || zone);
}
/** Ce que l'envoi n'a pas pu faire est écrit sur la ligne de la zone (le fichier choisi, puis le motif du lanceur) : la notification s'efface, la ligne reste jusqu'à la tentative suivante. */
function sayOnLine(zone, name, text, detail = '') {
  S.zoneMsg.set(zone, {
    level: 'err',
    lines: [tt(TX.zm.chosen, {
      name
    }), text, ...(detail ? [detail] : [])]
  });
  renderBuild();
}
/** Un fichier reçu pour une source qu'on choisit à la main d'emblée (`fetch.pick`, le Portugal : SOG-0244) : la ligne de la zone dit le fichier choisi et l'ÉDITION qu'il porte (la réponse de l'envoi), puis le téléchargement de la zone le lit (le lanceur prend le fichier avant le site) et
 *  la construction suit ; sans la coche d'usage personnel (la source est à licence personnelle) rien ne le lirait : la ligne le dit et rien ne part. */
async function pickTaken(out, zone, name, src) {
  const m = handMsgOf({
    edition: out.cycle
  }, name) || {
    level: 'ok',
    kind: 'hand',
    lines: [tt(TX.zm.chosen, {
      name
    })]
  };
  if (M.PERSONAL[src.id] && !selectionOf([zone]).personal.includes(src.id)) {
    S.zoneMsg.set(zone, {
      ...m,
      level: 'warn',
      lines: [...m.lines, tt(TX.up.tick)]
    });
    return renderBuild();
  }
  S.zoneMsg.set(zone, m);
  renderBuild();
  await fetchThenBuild(zone, true);
}
/** Envoie le fichier choisi : un seul à la fois, l'avancement sur la ligne de la zone, la fin en une notification ; un envoi réussi enchaîne la construction de la zone reconnue (celle de la ligne à défaut). */
export async function startUpload(zone, file) {
  const me = S;
  if (!file || uploadOff() || !/^[a-z0-9_-]{2,12}$/.test(zone || '')) return;
  const name = String(file.name || '').replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ').trim().slice(0, 120) || '?';
  if (file.size > MAX_BYTES) {
    sayOnLine(zone, name, tt(TX.up.why['too-large']));
    return S.ctx.notify(tt(TX.up.why['too-large']), 'err');
  }
  if (file.size === 0) {
    sayOnLine(zone, name, tt(TX.up.why.empty));
    return S.ctx.notify(tt(TX.up.why.empty), 'err');
  }
  S.zoneMsg.delete(zone); // une nouvelle tentative remplace ce que la ligne disait
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
  if (out.kind === 'fail') sayOnLine(zone, name, out.text, out.detail);
  else renderBuild();
  if (out.running) showBusy(out.running,
    'base'); // la carte de l'opération en cours, dans le panneau de la base, avec Voir / Arrêter / Libérer
  S.ctx.notify(out.text, out.kind === 'fail' ? 'err' : 'ok');
  // le fichier est rangé là où « Prendre le fichier téléchargé » lit (data/local/upload/) : le parcours normal suit — le plan, la prise, puis la construction de la zone reconnue
  if (out.kind === 'fail') return;
  const own = pickSource(out.zone || zone);
  if (own && out.source === own.id) return pickTaken(out, out.zone || zone, name,
    own); // une source choisie à la main d'emblée (Portugal) : c'est le téléchargement de la zone qui lit le fichier
  if (/^eurocontrol(_rad)?$/.test(out.source))
    return startRoute(); // le classeur est rangé là où l'import de la ligne Route lit : son plan à blanc, sa question, la prise (SOG-0237)
  if (out.source === 'faa') return faaSet(out,
    zone); // la FAA : trois jeux à déposer, lus par le téléchargement de la zone (AeroDB), pas par la prise
  await startPickup(out.zone || zone);
}
