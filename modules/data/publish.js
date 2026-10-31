// V3 data — le panneau « Publier » partagé (SPEC § 5.1, § 11) : l'état de data/, la question, le passage du cadre avec le geste. Ne construit rien et ne suit aucun travail du lanceur.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  keepScroll
} from '../../frame/lib/dom.js'; // un rendu ne bouge ni le défilement ni la frappe
import {
  fmtDateZ
} from '../../frame/lib/time.js'; // heures en UTC (« 16:30Z »)
import {
  count,
  esc,
  lang,
  S,
  STATUS_ROUTE,
  tt
} from './state.js';
import {
  journalWrite,
  load
} from './screen.js';
import {
  renderBuild
} from './panels.js';

/** L'état de data/ pour « Publier » (GET sync-status, relevé refait) : la réponse du lanceur, ou null sans lanceur, sans réponse
 *  ou sur un refus. Ne lève jamais. */
export async function readStatus() {
  const L = S?.ctx.launcher;
  if (!L) return null;
  try {
    const r = await L.call(STATUS_ROUTE);
    return r && typeof r === 'object' && r.ok !== false ? r : null;
  } catch {
    return null;
  }
}
/** Le cadre sait-il publier ? Seul `ctx.data.sync.gesture === true` le dit : sans lui, jamais de passage sans geste. */
function canGesture() {
  return typeof S.ctx.data?.sync === 'function' && S.ctx.data.sync.gesture === true;
}
/** L'état du bouton « Publier » : { disabled, reason } d'après le lanceur, la construction, le cadre, l'état de data/ et le réseau. */
export function publishGate() {
  return M.publishState({
    launcher: !!S.ctx.launcher,
    publishing: !!S.pub.phase,
    building: !!S.run,
    other: !!S.other || !!S.asking || !!S.chain && S.chain.phase !==
      'publishing', // la question d'une purge est posée, ou la chaîne tourne (sauf à sa publication finale)
    gesture: canGesture(),
    nothing: M.publishCounts(S.pub.status).nothing,
    offline: navigator.onLine === false
  });
}
/** Le texte d'une raison de bouton gris de « Publier » : les siennes (TX.pubReason), à défaut celles de « Construire ». */
export function publishReason(key) {
  return tt(TX.pubReason[key] || TX.greyReason[key]);
}
/** « 3 fichiers modifiés · 2 commits à envoyer » : ce que data/ porte à envoyer. */
function publishCountsText(n, m) {
  return `${tt(TX.pubFiles[n === 1 ? 0 : 1], { n })} · ${tt(TX.pubCommits[m === 1 ? 0 : 1], { n: m })}`;
}
/** Les lignes d'état du panneau : fichiers et commits (ou « rien à publier » par la raison du bouton, une fois), la fusion en
 *  attente, le dernier passage ; une ligne d'erreur si sync-status n'a pas répondu. */
function publishStateHtml() {
  if (!S.ctx.launcher) return '';
  const c = M.publishCounts(S.pub.status);
  if (!c.known) return `<p class="f-warn" data-publish-state="unread">${esc(tt(TX.pubUnread))}</p>`;
  const last = c.last ? tt(c.last.pushed ? TX.pubLastSent : TX.pubLastKept, {
    d: fmtDateZ(c.last.at, lang())
  }) : '';
  return `${c.nothing ? '' : `<p data-publish-state="changes">${esc(publishCountsText(c.changes, c.ahead))}</p>`}
    ${c.merging ? `<p class="f-warn" data-publish-merge>${esc(tt(TX.pubMerge))}</p>` : ''}
    ${last ? `<p class="f-muted" data-publish-last>${esc(last)}</p>` : ''}`;
}
/** La fin de la dernière publication : les lignes du résumé (la première dit ce qui est parti), puis ce qui est resté sur le poste,
 *  les conflits, les refus ; pour un échec, la phrase et ce que dit le lanceur (texte, jamais du HTML). [{ key, text }]. */
export function publishLines(o) {
  const lines = [];
  if (o.kind === 'failed') lines.push({
    key: 'failed',
    text: tt(TX.pubFailed)
  });
  else if (o.kind === 'no-exchange') lines.push({
    key: 'no-exchange',
    text: tt(TX.pubNoExchange)
  });
  else lines.push({
    key: o.kind,
    text: tt(o.kind === 'done' ? TX.pubDone : TX.pubLocal, {
      c: o.committed,
      r: o.received
    })
  });
  if (o.held > 0) lines.push({
    key: 'held',
    text: tt(TX.pubHeld[o.held === 1 ? 0 : 1], {
      n: o.held
    })
  });
  if (o.conflicts > 0) lines.push({
    key: 'conflicts',
    text: tt(TX.pubConflicts[o.conflicts === 1 ? 0 : 1], {
      n: o.conflicts
    })
  });
  if (o.refused > 0) lines.push({
    key: 'refused',
    text: tt(TX.pubRefused[o.refused === 1 ? 0 : 1], {
      n: o.refused
    })
  });
  return lines;
}
/** La fin de la dernière publication dans le panneau, ou la phrase d'un état illisible. */
function publishResultHtml() {
  const r = S.pub.result;
  if (!r) return '';
  if (r.unread) return `<div data-publish-result data-result="unread"><p class="f-warn">${esc(tt(TX.pubUnread))}</p></div>`;
  const o = r.out;
  return `<div data-publish-result data-result="${o.kind}">${publishLines(o).map((l, i) => `<p data-line="${l.key}"${i === 0 && o.kind !== 'done' ? ' class="f-warn"' : ''}>${i === 0 ? `<b>${esc(l.text)}</b>` : esc(l.text)}</p>`).join('')}
    ${o.kind === 'failed' && o.message ? `<p class="f-muted" data-publish-message>${esc(tt(TX.pubLauncherSays, { m: o.message }))}</p>` : ''}</div>`;
}
/** La marche : la barre indéterminée et son texte, tant que le lanceur publie. */
function publishingHtml() {
  return `<div data-publishing><span>${esc(tt(TX.pubRunning))}</span><div class="d-bar" role="progressbar" data-indeterminate><i></i></div></div>`;
}
/** L'intérieur du panneau : l'état de data/, le bouton et sa raison (une fois), la marche ou la fin. */
function publishInner() {
  const gate = publishGate(),
    why = gate.reason ? publishReason(gate.reason) : '';
  return `<h2>${esc(tt(TX.publishTitle))}</h2>
    ${publishStateHtml()}
    <p><button type="button" data-verb="publish"${gate.disabled ? ' disabled' : ''}>${esc(tt(TX.publish))}</button></p>
    ${why ? `<p class="f-muted" data-reason="${gate.reason}">${esc(why)}</p>` : ''}
    ${S.pub.phase === 'running' ? publishingHtml() : publishResultHtml()}`;
}
/** Le panneau « Publier la base » (après « Construire », dans le groupe Base aéronautique). */
export function publishHtml() {
  return `<section class="f-card" data-publish>${publishInner()}</section>`;
}
/** Redessine le panneau seul ; le bouton qui avait le focus le garde (s'il est encore actif). */
export function renderPublish() {
  const box = S?.body?.querySelector('[data-publish]');
  if (!box || !S.d) return;
  const focus = box.contains(document.activeElement) && document.activeElement.dataset.verb === 'publish';
  keepScroll(S.body, () => {
    box.innerHTML = publishInner();
    const b = focus && box.querySelector('[data-verb="publish"]');
    if (b && !b.disabled) b.focus({
      preventScroll: true
    });
  });
}
/** Fin d'une publication : le résultat dans le panneau, une notification avec les comptes, le journal, puis la relecture de l'état
 *  de data/ et de ce qui est publié (le chemin de lecture de l'ouverture). */
async function endPublish(me, out) {
  const lines = publishLines(out),
    level = out.kind === 'failed' ? 'err' : out.kind === 'done' && !out.held && !out.conflicts && !out.refused ? 'ok' : 'warn';
  S.pub.phase = null;
  S.pub.result = {
    out
  };
  renderBuild();
  if (!S.chain) S.ctx.notify(lines.map(l => l.text).join(' · '), level); // dans la chaîne : la notification de la fin de la chaîne
  journalWrite(M.publishEntry(Date.now(), out));
  await load();
}
/** « Publier » : l'état de data/ est relu, une seule question (les fichiers et les commits), puis le passage du cadre avec le geste
 *  (ctx.data.sync({ gesture: true })) — jamais sans la question, jamais pendant une construction. Rien ne part si le bouton est gris. */
export async function startPublish(skipAsk = false) {
  const me = S;
  if (publishGate().disabled) return;
  S.pub.phase = 'asking'; // les deux boutons sont gris dès le toucher : une opération à la fois
  S.pub.result = null;
  renderBuild();
  const status = await readStatus();
  if (S !== me) return;
  S.pub.status = status;
  const c = M.publishCounts(status);
  if (!c.known) { // le lanceur ne répond pas : on le dit, on ne pose pas de question
    S.pub.phase = null;
    S.pub.result = {
      unread: true
    };
    renderBuild();
    S.ctx.notify(tt(TX.pubUnread), 'err');
    return;
  }
  const yes = c.nothing ? false : skipAsk ? true : await S.ctx.ask(c.changes && c.ahead ? tt(TX.pubAsk, {
    f: count('file', c.changes),
    c: count('commit', c.ahead)
  }) : tt(TX.pubAskOne, {
    x: c.changes ? count('file', c.changes) : count('commit', c.ahead)
  }), {
    ok: tt(TX.publish)
  });
  if (S !== me) return;
  if (!yes) { // refus (ou plus rien à envoyer entre-temps) : rien n'est fait
    S.pub.phase = null;
    renderBuild();
    return;
  }
  S.pub.phase = 'running';
  renderBuild();
  let r;
  try {
    r = await S.ctx.data.sync({
      gesture: true
    });
  } catch (e) {
    r = {
      ok: false,
      error: e?.message || ''
    };
  }
  if (S !== me) return;
  await endPublish(me, M.publishOutcome(r));
}
