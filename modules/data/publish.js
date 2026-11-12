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
  li,
  ROUTE,
  S,
  serial,
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
    gesture: canGesture() || !!
      livePlan(), // le lanceur qui établit le plan envoie lui-même (base/publish) : le cadre n'a pas à savoir publier
    nothing: livePlan() ? livePlan().nothing : M.publishCounts(S.pub.status).nothing,
    offline: navigator.onLine === false
  });
}
/** Le lanceur de ce poste sait-il établir le plan d'un envoi (base/publish) ? */
export const planKnown = () => !!S.ctx.launcher && !!S.known?.includes('base/publish');
/** Le plan lu et utilisable (la zone construite existe, le dépôt est là) ; null sinon. */
function livePlan() {
  const p = S.pub.plan;
  return p?.state === 'ready' && p.data?.ok ? p.data : null;
}
/** Un travail base/publish du lanceur (à blanc ou réel), passé à la file de l'écran ; `guard` : refusé sans appel (`{ status: 409 }`) quand une opération tourne à l'instant du départ (la lecture passive du plan). Rend la fin du travail, `{ status: 409 }` pour un refus, null sans réponse. Ne lève jamais. */
async function planJob(args, guard = false) {
  const L = S?.ctx?.launcher;
  try {
    return await serial(() => guard && busyNowGuard() ? {
      status: 409
    } : L.job(ROUTE, {
      set: 'base',
      verb: 'publish',
      args
    }, {
      onProgress: () => {},
      signal: new AbortController().signal
    }));
  } catch {
    return null;
  }
}
/** Une opération tourne-t-elle (la lecture passive du plan attend qu'elle finisse) ? */
const busyNowGuard = () => !!S.run || !!S.other || !!S.asking || !!S.pub.phase || !!S.chain || !!S.upload || !!S.updating;
/** Lit, sans écrire, ce que l'envoi emporterait (base/publish à blanc) : la zone du plan est la première construite et pas encore envoyée de la couverture ; une fois à l'ouverture, puis après chaque opération (le plan est « à relire » : l'ancien reste affiché). Sans le verbe, sans état de zone ou pendant une opération, rien n'est lu. Ne lève jamais. */
export async function wantPlan() {
  const p = S?.pub?.plan;
  if (!S?.d || !planKnown() || S.pub.phase || (p && (p.reading || (!p.dirty && p.state !== 'busy')))) return;
  if (!S.status?.zones) return; // l'état des zones n'est pas lu : le plan se lira après
  const zone = M.planZone(S.status, S.d.cov.ids);
  if (!zone) {
    S.pub.plan = {
      state: 'none'
    };
    return;
  }
  const me = S,
    keep = p?.state === 'ready' ? p : null,
    mine = S.pub.plan = {
      state: keep ? 'ready' : 'loading',
      zone,
      data: keep?.data || null,
      reading: true
    };
  renderPublish();
  if (S.statusP) await S.statusP.catch(() => null);
  if (S !== me) return;
  const final = await planJob({
      zone,
      dry: true
    }, true),
    data = M.publishPlanOf(final);
  if (S !== me || S.pub.plan !== mine) return;
  S.pub.plan = final?.status === 409 ? keep ? {
    ...keep,
    dirty: true
  } : {
    state: 'busy',
    zone
  } : data ? {
    state: 'ready',
    zone,
    data
  } : {
    state: 'unread',
    zone
  };
  renderPublish();
}
/** Les fichiers ont bougé : le plan est « à relire » (il reste affiché jusqu'à la réponse). */
export function forgetPlan() {
  if (S?.pub?.plan) S.pub.plan.dirty = true;
}
/** Les noms (dans la langue) des zones que l'envoi emporte, douze au plus. */
function zoneNames(ids) {
  const names = ids.map(z => M.zoneName(S.d.zones, z, li()));
  return names.slice(0, 12).join(', ') + (names.length > 12 ? ` … (+${names.length - 12})` : '');
}
/** La phrase de ce qui part avec l'envoi : « Un envoi emporte TOUS les commits non envoyés : … » — pour un envoi demandé depuis la fiche d'une zone, « les autres zones construites (n) », sinon « les zones construites pas encore publiées (n) » — suivie des commits. */
function planSentence(p, forZone) {
  const n = M.planCounts(p);
  return `${tt(forZone ? TX.lc.planOthers : TX.lc.planAll, {
    z: count('zone', forZone ? n.others : n.zones),
    f: count('file', n.files)
  })} ${tt(TX.lc.planCommits, { c: count('commit', n.commits) })}`;
}
/** Ce que l'envoi emporte, dit AVANT le bouton : la phrase, puis les zones qui partent (leurs noms : jamais un nom de fichier de l'utilisateur) ; « rien à publier » quand tout est parti ; la raison en mots quand le plan n'est pas possible (pas de dépôt, pas de dépôt distant, zone non construite). */
function planHtml() {
  if (!planKnown()) return '';
  const p = S.pub.plan;
  if (!p || p.state === 'none' || p.state === 'unread') return '';
  if (p.state === 'loading' || p.state === 'busy') return `<p class="f-muted" data-publish-plan="${p.state}">${esc(tt(TX.lc.planReading))}</p>`;
  const d = p.data;
  if (!d.ok) return `<p class="f-warn" data-publish-plan="refused" data-plan-reason="${esc(d.reason)}">${esc(tt(M.own(TX.lc.planReason, d.reason) || TX.lc.planReason.other))}</p>`;
  if (d.nothing) return `<p data-publish-plan="nothing">${esc(tt(TX.lc.planNothing))}</p>`;
  const ids = [...(d.state === 'unpublished' ? [d.zone] : []), ...d.ahead];
  return `<div data-publish-plan="ready"${p.reading || p.dirty ? ' aria-busy="true"' : ''}><p data-plan-sentence>${esc(planSentence(d, false))}</p>${ids.length ? `<p data-plan-zones>${esc(tt(TX.lc.planZones, { z: zoneNames(ids) }))}</p>` : ''}</div>`;
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
  if (S.pub.reading) return `<p class="f-muted" data-publish-state="reading">${esc(tt(TX.pubReading))}</p>`; // la lecture de data/ est en cours : la place est tenue (SOG-0164)
  const c = M.publishCounts(S.pub.status);
  if (!c.known) return `<p class="f-warn" data-publish-state="unread">${esc(tt(TX.pubUnread))}</p>`;
  const last = c.last ? tt(c.last.pushed ? TX.pubLastSent : TX.pubLastKept, {
    d: fmtDateZ(c.last.at, lang())
  }) : '';
  // rien à envoyer ET un dernier passage qui a poussé : « tout est déjà publié » (la construction range ses commits sur le poste, le passage de fond du cadre les envoie : « Publier » n'a alors plus rien à faire, et le dit)
  const clean = c.nothing && c.last?.pushed;
  return `${c.nothing || livePlan() ? '' : `<p data-publish-state="changes">${esc(publishCountsText(c.changes, c.ahead))}</p>`}
    ${clean ? `<p data-publish-state="clean">${esc(tt(TX.pubClean, { d: fmtDateZ(c.last.at, lang()) }))}</p>` : ''}
    ${c.merging ? `<p class="f-warn" data-publish-merge>${esc(tt(TX.pubMerge))}</p>` : ''}
    ${last && !clean ? `<p class="f-muted" data-publish-last>${esc(last)}</p>` : ''}`;
}
/** La fin de la dernière publication : les lignes du résumé (la première dit ce qui est parti), puis ce qui est resté sur le poste,
 *  les conflits, les refus ; pour un échec, la phrase et ce que dit le lanceur (texte, jamais du HTML). [{ key, text }]. */
export function publishLines(o) {
  const lines = [];
  if (o.kind === 'no-author') lines.push({
    key: 'no-author',
    text: tt(TX.lc.pubNoAuthor)
  });
  else if (o.kind === 'failed' && o.reason) lines.push({
    key: 'failed',
    text: tt(TX.lc.pubRefusedPlan, {
      r: tt(M.own(TX.lc.planReason, o.reason) || TX.lc.planReason.other)
    })
  });
  else if (o.kind === 'failed') lines.push({
    key: 'failed',
    // la cause et l'étape que le lanceur a données (SOG-0155) ; sans cause (lanceur plus ancien) la phrase le dit, jamais « corrigez la cause » sans la cause
    text: o.cause ? tt(TX.pubFailedCause, {
      c: tt(TX.pubCause[o.cause]),
      s: o.step ? tt(TX.pubStepAt, {
        s: tt(TX.pubStep[o.step])
      }) : ''
    }) : tt(TX.pubFailed)
  });
  else if (o.kind === 'no-exchange') lines.push({
    key: 'no-exchange',
    text: tt(TX.pubNoExchange)
  });
  else if (o.kind === 'done' && o.committed === 0 && o.sent?.commits > 0) lines
    .push({ // les commits étaient déjà faits (la construction) : ce qui est parti, pas « 0 fichier commité »
      key: o.kind,
      text: tt(TX.pubDoneCommits, {
        n: o.sent.commits,
        r: o.received
      })
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
    ${planHtml()}${publishStateHtml()}
    <p><button type="button" data-verb="publish"${gate.disabled ? ' disabled' : ''}>${esc(tt(planKnown() ? TX.lc.publishDots : TX.publish))}</button></p>
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
    level = out.kind === 'failed' || out.kind === 'no-author' ? 'err' : out.kind === 'done' && !out.held && !out.conflicts && !out
    .refused ? 'ok' : 'warn';
  S.pub.phase = null;
  S.pub.result = {
    out
  };
  renderBuild();
  if (!S.chain) S.ctx.notify(lines.map(l => l.text).join(' · '), level); // dans la chaîne : la notification de la fin de la chaîne
  journalWrite(M.publishEntry(Date.now(), out));
  await load(true);
}
/** « Publier » : l'état de data/ est relu, une seule question (les fichiers et les commits), puis le passage du cadre avec le geste
 *  (ctx.data.sync({ gesture: true })) — jamais sans la question, jamais pendant une construction. Rien ne part si le bouton est gris. */
export async function startPublish(skipAsk = false, forZone = '') {
  const me = S;
  if (publishGate().disabled) return;
  S.pub.phase = 'asking'; // les deux boutons sont gris dès le toucher : une opération à la fois
  S.pub.result = null;
  renderBuild();
  const status = await readStatus();
  if (S !== me) return;
  S.pub.status = status;
  const c = M.publishCounts(status);
  let plan = null; // ce que l'envoi emporte (base/publish à blanc) : lu à neuf, jamais celui d'avant
  if (planKnown()) {
    const zone = /^[a-z0-9_-]{2,12}$/.test(forZone) ? forZone : M.planZone(S.status, S.d.cov.ids),
      final = zone ? await planJob({
        zone,
        dry: true
      }) : null;
    if (S !== me) return;
    plan = final?.status === 409 ? null : M.publishPlanOf(final);
    if (plan) S.pub.plan = {
      state: 'ready',
      zone: plan.zone || zone,
      data: plan
    };
  }
  const live = plan?.ok ? plan : null;
  if (!c.known && !live) { // le lanceur ne répond pas : on le dit, on ne pose pas de question
    S.pub.phase = null;
    S.pub.result = {
      unread: true
    };
    renderBuild();
    S.ctx.notify(tt(TX.pubUnread), 'err');
    return;
  }
  const nothing = live ? live.nothing : c.nothing,
    yes = nothing ? false : skipAsk ? true : await S.ctx.ask(live ? `${planSentence(live, !!forZone)} ${tt(TX.lc.planTail)}` : c.changes && c.ahead ? tt(TX.pubAsk, {
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
  if (live) { // le lanceur sait envoyer : l'envoi réel est SON verbe (base/publish { dry: false }), au trigramme de la page
    const final = await planJob({
      zone: live.zone,
      dry: false
    });
    if (S !== me) return;
    return void await endPublish(me, {
      ...M.verbOutcome(final),
      sent: {
        files: M.planCounts(live).files,
        commits: live.commits
      }
    });
  }
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
  await endPublish(me, {
    ...M.publishOutcome(r),
    sent: {
      files: c.changes,
      commits: c.ahead
    }
  }); // ce qui était à envoyer avant le passage : les commits de la construction sont déjà faits
}
