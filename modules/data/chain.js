// V3 data — « Tout mettre à jour » (SPEC § 5.3, § 11) : le plan et sa question, la chaîne des jeux, sa fin. Lance ses opérations par follow.js et ne dessine que sa carte.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  busyNow,
  count,
  esc,
  kind,
  li,
  S,
  tt
} from './state.js';
import {
  journalWrite,
  load
} from './screen.js';
import {
  attnDot,
  itemName,
  renderBuild,
  selection
} from './panels.js';
import {
  launch,
  settle
} from './follow.js';
import {
  publishGate,
  publishLines,
  publishReason,
  readStatus,
  startPublish
} from './publish.js';

/** Le nom d'un jeu dans les phrases de la chaîne : le groupe pour la base, le nom du jeu pour les autres. */
export const chainName = set => tt(set === 'base' ? TX.groups.base : TX.setLabel[set]);
/** Le texte d'une raison pour laquelle un jeu est ignoré par la chaîne (clé de TX.greyReason ; les types OACI refusés : leur phrase). */
const skipWhy = (key, sel) => key === 'bad-codes' ? tt(TX.codesBad, {
  c: sel.bad.join(', ')
}) : tt(TX.greyReason[key]);
/** Ce que la chaîne ferait d'après les choix des panneaux : { runs: [{ set, sel, what }], skipped: [{ set, key, why }] } dans l'ordre publié. Un jeu sans
 *  éléments cochés, aux types OACI refusés ou dont l'un des deux verbes n'est pas connu du lanceur est ignoré, avec sa raison. */
function chainPlan() {
  const runs = [],
    skipped = [];
  if (!S.d) return {
    runs,
    skipped
  };
  for (const set of M.CHAIN_SETS) {
    const sel = selection(set),
      names = () => sel.ids.map(id => itemName(set, id)).join(', ');
    const key = !M.CHAIN_VERBS.every(v => M.verbKnown(S.known, set, v)) ? 'unknown-verb' : set === 'base' && !sel.ids.length ? 'no-zone' :
      set === 'proc' && !sel
      .ids.length ? 'no-state' : set === 'vfr' && !sel.cycle ? 'no-set' : sel.bad?.length ? 'bad-codes' : null;
    if (key) {
      skipped.push({
        set,
        key,
        why: skipWhy(key, sel)
      });
      continue;
    }
    runs.push({
      set,
      sel,
      what: set === 'vfr' ? itemName(set, sel.cycle) : set === 'aircraft' && !sel.ids.length ? tt(TX.chainFleet) : `${count(M.SETS[set].unit, sel.ids.length)} (${names()})`
    });
  }
  return {
    runs,
    skipped
  };
}
/** L'état du bouton « Tout mettre à jour » : { disabled, reason } ; reason : no-launcher | busy | offline | no-set (aucun jeu à lancer). */
function chainGate(plan) {
  const reason = !S.ctx.launcher ? 'no-launcher' : busyNow() ? 'busy' : navigator.onLine === false ? 'offline' : !plan.runs.length ?
    'no-set' : null;
  return {
    disabled: !!reason,
    reason
  };
}
/** Les lignes des jeux de la chaîne (en cours ou finie) : [{ set, result, why? }], result : done | nothing | failed | cancelled | skipped | notrun | running |
 *  waiting. */
function chainRows() {
  const ch = S.chain || S.chainEnd;
  if (!ch) return [];
  return ch.rows.map(r => ({
    ...r
  }));
}
/** La liste des jeux de la chaîne, une ligne chacun avec où il en est. */
function chainListHtml() {
  return `<ul class="d-sl" data-chain-sets>${chainRows().map(r => `<li data-chain-set="${esc(r.set)}" data-result="${esc(r.result)}"><b>${esc(chainName(r.set))}</b> : ${esc(tt(TX.chainWord[r.result]))}${r.why ? ` (${esc(r.why)})` : ''}</li>`).join('')}</ul>`;
}
/** La chaîne en cours (jeu, étape, « n / m jeux », « Arrêter » pour toute la chaîne) ou sa fin (le résumé et les jeux). */
function chainHtml() {
  const ch = S.chain;
  if (ch && ch.phase !== 'asking') {
    const run = ch.runs[ch.i],
      stopping = ch.phase === 'stopping';
    return `<div data-chain data-phase="${ch.phase}"><div class="d-runhead"><b data-chain-count>${esc(tt(TX.chainCount, { n: Math.min(ch.i + 1, ch.runs.length), m: ch.runs.length }))}</b>
      <span data-chain-step>${esc(stopping ? tt(TX.stopping) : ch.phase === 'publishing' ? tt(TX.pubRunning) : `${chainName(run.set)} : ${tt(ch.verb === 'fetch' ? TX.download : TX.build)}`)}</span></div>
      ${chainListHtml()}
      <p><button type="button" data-verb="stop-chain"${stopping ? ' disabled' : ''}>${esc(tt(TX.stop))}</button></p></div>`;
  }
  const end = S.chainEnd;
  if (!end) return S.chainNote ? `<p class="f-warn" data-chain-note>${esc(tt(TX.chainReload))}</p>` : '';
  return `<div data-chain-result data-result="${end.result}"><p class="${end.result === 'done' ? '' : 'f-warn'}"><b>${esc(end.text)}</b></p>${chainListHtml()}</div>`;
}
/** L'intérieur de la carte « Tout mettre à jour » : le bouton avec le nombre de jeux (et le point d'attention d'un cycle dépassé), sa raison grise, la
 *  chaîne ou sa fin. */
export function updateAllInner() {
  const plan = chainPlan(),
    gate = chainGate(plan),
    n = S.chain ? S.chain.runs.length : plan.runs.length,
    stale = ['base', 'proc'].filter(g => S.attn?.[g]).map(g => `<p class="f-warn" data-stale="${g}">${esc(tt(TX.staleCycle, { x: S.attn[g], y: S.cycleId }))}</p>`).join('');
  return `<h2>${esc(tt(TX.updateAll))}</h2>${stale}
    <p class="d-verbs"><button type="button" class="primary" data-verb="all"${gate.disabled ? ' disabled' : ''}>${esc(tt(TX.updateAllN, { n: count('set', n) }))}${attnDot(S.attn?.base || S.attn?.proc)}</button></p>
    ${gate.reason ? `<p class="f-muted" data-reason="${gate.reason}">${esc(tt(TX.greyReason[gate.reason]))}</p>` : ''}
    ${chainHtml()}`;
}
/** La carte « Tout mettre à jour », sous la couverture et au-dessus des groupes. */
export function updateAllHtml() {
  return `<section class="f-card" data-update-all>${updateAllInner()}</section>`;
}
/** La question du plan de la chaîne : le cycle AIRAC, les jeux dans l'ordre avec ce qu'ils touchent, la taille inconnue des téléchargements, pas de purge, une seule
 *  publication ; puis les jeux ignorés avec leur raison. */
function chainAsk(plan) {
  return tt(TX.chainAsk, {
    c: S.cycleId,
    sets: plan.runs.map(r => `${chainName(r.set)} : ${r.what}`).join(' ; '),
    skipped: plan.skipped.length ? ` ${tt(TX.chainSkipped, { s: plan.skipped.map(s => `${chainName(s.set)} (${s.why})`).join(', ') })}` : ''
  });
}
/** Les lignes de départ de la chaîne : les jeux lancés « en attente », les ignorés « ignoré » avec leur raison, dans l'ordre publié. */
function chainStartRows(plan) {
  return M.CHAIN_SETS.map(set => {
    const sk = plan.skipped.find(s => s.set === set);
    return sk ? {
      set,
      result: 'skipped',
      why: sk.why
    } : {
      set,
      result: 'waiting'
    };
  });
}
/** Une opération de la chaîne : lance le verbe du jeu par le suiveur ordinaire (les fins se taisent : une seule notification, une seule entrée au journal) ;
 *  { verdict: 'ok' | 'nothing' | 'stop', kind, text } d'après sa fin, ou un refus de départ. */
async function chainOp(me, run, verb) {
  S.lastOp = null;
  const ids = run.set === 'aircraft' ? M.SETS.aircraft.steps : run.sel.ids;
  await settle(me, await launch(run.set, verb, M.setArgs(run.set, verb, run.sel), ids), true);
  if (S !== me) return null;
  const op = S.lastOp;
  if (op) return {
    verdict: M.chainVerdict(verb, op.out),
    kind: op.out.kind,
    text: op.text
  };
  const f = S.result?.refused;
  return {
    verdict: 'stop',
    kind: f ? 'refused' : 'failed',
    text: tt(TX.refused[f?.key || 'failed'], {
      n: f?.wait
    })
  };
}
/** Fin de la chaîne : le résumé dans la carte, une notification, l'entrée du journal (qui remplace le repère de départ), puis la relecture de ce qui est publié. */
async function endChain(me, ch, result, text, level) {
  S.chain = null;
  S.chainEnd = {
    result,
    text,
    rows: ch.rows
  };
  renderBuild();
  S.ctx.notify(text, level);
  journalWrite(M.chainEntry({
    at: Date.now(),
    items: ch.rows,
    seconds: (Date.now() - ch.t0) / 1e3,
    result,
    job: ch.job
  }), true);
  await load();
}
/** La chaîne : pour chaque jeu, Télécharger puis Construire par le suiveur ; au premier échec, arrêt (ce qui est construit reste commité sur le poste, rien n'est
 *  publié) ; si tout a réussi, UNE publication sans autre question que celle du plan. */
async function runChain(me, plan) {
  const ch = S.chain = {
    phase: 'running',
    runs: plan.runs,
    i: 0,
    verb: 'fetch',
    stopped: false,
    rows: chainStartRows(plan),
    t0: Date.now(),
    job: `chain-${Date.now()}`
  };
  S.chainEnd = null;
  S.chainNote = false;
  journalWrite(M.chainEntry({
    at: Date.now(),
    items: ch.rows,
    seconds: null,
    result: 'running',
    job: ch.job
  }), true);
  const row = set => ch.rows.find(r => r.set === set);
  let failure = null;
  for (let i = 0; i < ch.runs.length && !failure; i++) {
    const run = ch.runs[i];
    ch.i = i;
    row(run.set).result = 'running';
    for (const verb of M.CHAIN_VERBS) {
      ch.verb = verb;
      if (ch.stopped) {
        failure = {
          set: run.set,
          kind: 'cancelled',
          text: ''
        };
        break;
      }
      renderBuild();
      const res = await chainOp(me, run, verb);
      if (S !== me || !res) return;
      if (res.verdict === 'stop') {
        failure = {
          set: run.set,
          kind: ch.stopped || res.kind === 'cancelled' ? 'cancelled' : 'failed',
          text: res.text
        };
        break;
      }
    }
    row(run.set).result = failure ? failure.kind : 'done';
  }
  if (failure) {
    for (const r of ch.rows)
      if (r.result === 'waiting') r.result = 'notrun';
    const s = chainName(failure.set);
    return endChain(me, ch, failure.kind, failure.kind === 'cancelled' ? tt(TX.chainStopped, {
      s
    }) : tt(TX.chainFailed, {
      s,
      r: failure.text
    }), failure.kind === 'cancelled' ? 'warn' : 'err');
  }
  // tout a réussi : une seule publication, sans autre question que celle du plan
  ch.phase = 'publishing';
  renderBuild();
  S.pub.status = await readStatus();
  if (S !== me) return;
  const gate = publishGate();
  let p, level = 'ok',
    result = 'done';
  if (gate.disabled) {
    p = gate.reason === 'nothing' ? publishReason('nothing') : tt(TX.chainNotPublished, {
      r: publishReason(gate.reason)
    });
    level = gate.reason === 'nothing' ? 'ok' : 'warn';
  } else {
    await startPublish(true);
    if (S !== me) return;
    const out = S.pub.result?.out;
    p = out ? publishLines(out)[0].text : S.pub.result?.unread ? tt(TX.pubUnread) : publishReason('nothing');
    if (out && (out.kind === 'failed' || out.kind === 'no-exchange'))[result, level] = ['failed', 'err'];
    else if (out && out.kind !== 'done') level = 'warn';
  }
  return endChain(me, ch, result, tt(TX.chainDone, {
    n: count('set', ch.runs.length),
    p
  }), level);
}
/** « Tout mettre à jour » : le plan, UNE question ; sur Non rien n'est appelé ; sur Oui la chaîne (runChain). */
export async function updateAll() {
  const me = S,
    plan = chainPlan();
  if (chainGate(plan).disabled) return;
  S.chain = {
    phase: 'asking',
    runs: plan.runs,
    rows: []
  }; // tous les boutons sont gris pendant la question
  renderBuild();
  const yes = await S.ctx.ask(chainAsk(plan), {
    ok: tt(TX.updateAll)
  });
  if (S !== me) return;
  if (!yes) {
    S.chain = null;
    renderBuild();
    return;
  }
  await runChain(me, plan);
}
/** « Arrêter » de la chaîne : l'opération en cours est arrêtée (la zone ou l'étape en cours se termine), puis la chaîne s'arrête ; ce qui est construit est gardé. */
export function stopChain() {
  const ch = S.chain;
  if (!ch || ch.phase === 'asking') return;
  ch.stopped = true;
  if (ch.phase === 'running') ch.phase = 'stopping';
  S.run?.ctrl.abort();
  renderBuild();
}
