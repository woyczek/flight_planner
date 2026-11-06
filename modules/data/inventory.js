// V3 data — la carte « Inventaire des données » (SOG-0010, lot E2 ; SPEC § 12) : ce que « data » recouvre sur ce poste, en sept lignes,
// lu du lanceur (GET data/inventory), en lecture seule. Dessine et lit à l'ouverture ; n'écrit rien, ne déplace rien, ne lance aucun
// travail, et ne reprend jamais un chemin de fichier : des noms d'emplacements, des tailles, un état de suivi.
import * as M from './model.js';
import * as I from './model_inventory.js';
import {
  TX
} from './texts.js';
import {
  keepScroll
} from '../../frame/lib/dom.js'; // un rendu ne bouge ni le défilement ni la frappe
import {
  busyNow,
  esc,
  lang,
  ROUTE,
  S,
  STATUS_ROUTE,
  tt
} from './state.js';

/** La route du lanceur (déclarée dans meta.launcher.routes de module.js) : l'inventaire des sept emplacements, ce poste seulement. */
const INVENTORY_ROUTE = 'data/inventory';

/** La phrase d'un état (suivi / local / hors dépôt / inconnu) dans la langue ; le code tel quel pour un état que le texte ne connaît pas. */
const stateWord = s => tt(M.own(TX.inventory.state, s) || TX.inventory.state.unknown);

/** La taille d'une ligne : « 479 Mo », « au moins 5 Go » quand le parcours a été borné, « — » pour un emplacement absent. */
function sizeWord(r) {
  if (!r.present) return tt(TX.inventory.absent);
  const n = M.fmtBytes(r.bytes, lang());
  return r.truncated ? tt(TX.inventory.atLeast, {
    n
  }) : n;
}

/** Les lignes de la carte, d'après la réponse du lanceur : sept <li>, chacune avec le nom de l'emplacement, sa taille, son état de
 *  suivi et son écrivain. Rien (null) sans réponse lisible : la carte le dit plus haut. Aucune valeur du lanceur n'entre sans esc(). */
function rowsHtml(rows) {
  return rows.map(r => `<li data-place="${esc(r.id)}" data-state="${esc(r.state)}" data-present="${r.present}">
    <b>${esc(tt(M.own(TX.inventory.place, r.id)))}</b>
    <span data-size>${esc(sizeWord(r))}</span>
    <span class="f-muted" data-track>${esc(stateWord(r.state))} · ${esc(tt(M.own(TX.inventory.writer, r.writer) || TX.inventory.writer.other))}${r.id === 'backup' && r.count > 1 ? ` (${r.count})` : ''}</span></li>`).join('');
}

/** Les lignes d'un résultat de rangement (compte, déjà là, gardés, refusés avec leur raison), chacune un texte passé par esc(). */
function moveLines(v) {
  const m = TX.inventory.move,
    n = x => String(x),
    lines = [];
  if (v.moved) lines.push(`<p data-move-line="${v.undo ? 'doneUndo' : 'done'}">${esc(tt(v.undo ? m.doneUndo : m.done, { n: n(v.moved), b: M.fmtBytes(v.bytes, lang()) }))}</p>`);
  if (v.already) lines.push(`<p class="f-muted" data-move-line="already">${esc(tt(m.already, { n: n(v.already) }))}</p>`);
  if (v.kept.length) lines.push(`<p class="f-muted" data-move-line="kept">${esc(tt(m.kept, { n: n(v.kept.length) }))}</p>`);
  if (v.refused.length) {
    lines.push(`<p class="f-warn" data-move-line="refused">${esc(tt(m.refused, { n: n(v.refused.length) }))}</p><ul class="f-queue" data-move-refused>${v.refused.map(x => `<li data-why="${esc(x.why)}"><code>${esc(x.name)}</code> — ${esc(tt(M.own(m.why, x.why) || m.why.other))}</li>`).join('')}</ul>`);
  }
  if (v.reason) lines.push(`<p class="f-warn" data-move-line="reason">${esc(tt(M.own(m.reason, v.reason)))}</p>`);
  return lines.join('');
}

/** Le plan montré à la question : les fichiers (nom, taille, cycle), huit au plus, « … et n autre(s) » ; jamais un chemin. */
function movePlanList(v) {
  const m = TX.inventory.move,
    shown = v.files.slice(0, 8),
    rest = v.moved - shown.length + v.more;
  return `<ul class="f-queue" data-move-files>${shown.map(f => `<li data-name="${esc(f.name)}"><code>${esc(f.name)}</code> — ${esc(M.fmtBytes(f.bytes, lang()))}${f.cycle ? ` · ${esc(f.cycle)}` : ''}</li>`).join('')}${rest > 0 ? `<li class="f-muted" data-more>${esc(tt(m.more, { n: String(rest) }))}</li>` : ''}</ul>`;
}

/** Pourquoi les boutons du rangement sont gris : '' (actifs), ou la raison dite. Le verbe doit être connu du lanceur (regen/verbs) ; une opération en cours, la nôtre ou une autre, le grise. */
function moveGate() {
  if (!S?.ctx?.launcher) return 'none';
  if (!S.known?.includes(`${I.MOVE.set}/${I.MOVE.verb}`)) return 'none';
  return busyNow() ? 'gateBusy' : '';
}

/** Le bloc du rangement des sources brutes : les deux boutons (ranger, remettre), puis ce que dit l'état (plan en cours, question, rien à faire, résultat, refus).
 *  Absent (vide) quand le lanceur ne connaît pas le verbe : la carte reste alors en lecture seule. */
function moveHtml() {
  if (moveGate() === 'none') return '';
  const m = TX.inventory.move,
    mv = S.move,
    gate = moveGate(),
    off = gate ? ' disabled' : '',
    v = mv?.view,
    undo = !!mv?.undo;
  let state = '';
  if (mv?.phase === 'planning') state = `<p class="f-muted" data-move-state="planning">${esc(tt(m.planning))}</p>`;
  else if (mv?.phase === 'running') state = `<p class="f-muted" data-move-state="running">${esc(tt(m.running))}</p>`;
  else if (mv?.phase === 'asking' && v) state = `<div data-move-state="asking"><p>${esc(tt(undo ? m.askUndo : m.ask, { n: String(v.moved), b: M.fmtBytes(v.bytes, lang()) }))}</p>${movePlanList(v)}${moveLines({ ...v, moved: 0, reason: null })}
      <div class="f-row"><button type="button" class="primary" data-move="confirm">${esc(tt(undo ? m.confirmUndo : m.confirm))}</button><button type="button" data-move="cancel">${esc(tt(m.cancel))}</button></div></div>`;
  else if (mv?.kind === 'nothing') state = `<div data-move-state="nothing"><p>${esc(tt(undo ? m.nothingUndo : m.nothing))}</p>${v ? moveLines(v) : ''}</div>`;
  else if (mv?.kind === 'done' && v) state = `<div data-move-state="done">${moveLines(v) || ''}</div>`;
  else if (mv?.kind === 'refused') state = `<p class="f-warn" data-move-state="refused" data-why="${esc(mv.why)}">${esc(tt(M.own(m.refusal, mv.why) || m.refusal.failed))}</p>`;
  return `<div class="d-move" data-move-box><p class="f-muted">${esc(tt(m.hint))}</p>
    <div class="f-row"><button type="button" data-move="plan"${off}>${esc(tt(m.plan))}</button><button type="button" data-move="plan-undo"${off}>${esc(tt(m.planUndo))}</button></div>
    ${gate === 'gateBusy' ? `<p class="f-muted" data-move-reason>${esc(tt(m.refusal.gateBusy))}</p>` : ''}${state}</div>`;
}

/** Le bloc replié « Inventaire des données » : fermé au départ (aucune lecture tant qu'on ne l'ouvre pas), la liste des sept lignes dedans.
 *  Sans lanceur la carte n'existe pas : l'inventaire est celui de ce poste. */
export function inventoryHtml() {
  if (!S?.ctx?.launcher) return '';
  const inv = S.inventory;
  return `<details class="d-inventory" data-inventory${inv?.open ? ' open' : ''}><summary>${esc(tt(TX.inventory.title))}</summary>
    <p class="f-muted">${esc(tt(TX.inventory.intro))}</p>
    ${inv?.state === 'loading' ? `<p class="f-muted" data-inv-state="loading">${esc(tt(TX.inventory.loading))}</p>` : ''}
    ${inv?.state === 'unread' ? `<p class="f-warn" data-inv-state="unread">${esc(tt(TX.inventory.unread))}</p>` : ''}
    ${inv?.rows ? `<ul class="d-inv" data-inventory-list>${rowsHtml(inv.rows)}</ul>
      <p class="f-muted" data-inv-total>${esc(tt(TX.inventory.total, { n: M.fmtBytes(I.inventoryTotal(inv.rows), lang()) }))}</p>` : ''}${inv && inv.state !== 'unread' ? moveHtml() : ''}</details>`;
}

/** Redessine le seul bloc d'inventaire (comme le journal), sans toucher aux autres ni au défilement. */
function redraw() {
  const el = S?.body?.querySelector('[data-inventory]');
  if (el && S.d) keepScroll(S.body, () => el.outerHTML = inventoryHtml());
}
/** Un geste du rangement (un bouton data-move) : 'plan' / 'plan-undo' (le plan à blanc), 'confirm' (la suite du plan montré), 'cancel' (rien n'est fait). */
export function moveClick(btn) {
  const act = btn.dataset.move;
  if (act === 'cancel') {
    S.move = null;
    return redraw();
  }
  if (act === 'plan' || act === 'plan-undo') return planMove(act === 'plan-undo');
  if (act === 'confirm') return runMove();
}
/** Une fusion est-elle en attente dans data/ (GET sync-status) ? Une réponse illisible n'arrête pas le geste : le lanceur seul décide de ce qu'il déplace, et ne touche jamais un fichier suivi. */
async function mergePending() {
  try {
    const st = await S.ctx.launcher.call(STATUS_ROUTE);
    return !!st && st.ok !== false && st.merging === true;
  } catch {
    return false;
  }
}
/** Lance le verbe du lanceur (à blanc ou pour de bon) et rend sa fin. */
const moveJob = (undo, dry) => S.ctx.launcher.job(ROUTE, {
  set: I.MOVE.set,
  verb: I.MOVE.verb,
  args: {
    dry,
    undo
  }
});
/** Le plan à blanc (base/move-sources { dry: true }) : rien n'est déplacé ; la fin pose UNE question (les fichiers, leur taille), ou dit qu'il n'y a rien, ou le refus du lanceur. */
async function planMove(undo) {
  const me = S;
  if (moveGate() || S.move?.phase) return; // grise : une opération tourne, ou le verbe n'est pas connu
  S.move = {
    undo,
    phase: 'planning'
  };
  redraw();
  if (await mergePending()) {
    if (S === me) S.move = {
      undo,
      phase: null,
      kind: 'refused',
      why: 'sync'
    };
    return S === me ? redraw() : undefined;
  }
  const final = await moveJob(undo, true);
  if (S !== me || !S.move) return;
  const v = I.moveView(final);
  S.move = !v ? {
    undo,
    phase: null,
    kind: 'refused',
    why: I.moveRefusal(final)
  } : v.moved ? {
    undo,
    phase: 'asking',
    view: v
  } : {
    undo,
    phase: null,
    kind: 'nothing',
    view: v
  };
  redraw();
}
/** L'exécution, après la question : le même verbe sans dry, sur le seul plan montré (le lanceur refait son propre plan : un fichier de plus ne partirait pas sans être dit, la fin le dit) ; puis l'inventaire est relu (la ligne des sources brutes change). */
async function runMove() {
  const me = S;
  if (S.move?.phase !== 'asking') return;
  const undo = S.move.undo;
  S.move = {
    undo,
    phase: 'running'
  };
  redraw();
  if (await mergePending()) {
    if (S === me) S.move = {
      undo,
      phase: null,
      kind: 'refused',
      why: 'sync'
    };
    return S === me ? redraw() : undefined;
  }
  const final = await moveJob(undo, false);
  if (S !== me) return;
  const v = I.moveView(final);
  S.move = !v ? {
    undo,
    phase: null,
    kind: 'refused',
    why: I.moveRefusal(final)
  } : {
    undo,
    phase: null,
    kind: 'done',
    view: v
  };
  S.inventory = null; // relu : la ligne « sources brutes » change d'emplacement
  redraw();
  await openInventory();
}
/** Lit l'inventaire une fois, à l'ouverture du bloc (GET data/inventory), et le garde jusqu'à sa fermeture ; une réponse refusée ou
 *  illisible : « unread », rien n'est inventé. Le redessin du bloc fait redéclencher « toggle » (le nouvel élément naît ouvert) : une
 *  lecture déjà faite (réussie ou non) ou en cours ne se refait donc jamais d'elle-même, seulement après une fermeture. */
export async function openInventory() {
  const L = S?.ctx?.launcher;
  if (!L || S.inventory) return;
  const me = S;
  S.inventory = {
    open: true,
    state: 'loading'
  };
  redraw();
  let rows = null;
  try {
    const r = await L.call(INVENTORY_ROUTE);
    rows = I.inventoryRows(r && r.ok !== false ? r : null);
  } catch {
    rows = null;
  }
  if (S !== me || !S.inventory) return; // l'écran a changé, ou le bloc a été fermé pendant la lecture
  S.inventory = {
    open: true,
    state: rows ? 'ready' : 'unread',
    rows
  };
  redraw();
}
