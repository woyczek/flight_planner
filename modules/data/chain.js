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
  refusedText,
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
  missingList,
  renderBuild,
  selection,
  staleBy
} from './panels.js';
import {
  launch,
  runChunks,
  settle
} from './follow.js';
import {
  busyCardHtml
} from './busy.js';
import {
  updateGate,
  updateScope
} from './update.js';
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
}) : key === 'up-to-date' ? tt(TX.d4.setOk) : tt(TX.greyReason[key]);
/** L'état d'un jeu d'après ce que la page lit de sa publication (lignes des groupes du catalogue) : { k: 'ok' | 'todo' | 'unknown' | 'none', n (lignes à regarder) } ; 'none' : le jeu n'a aucune ligne suivie. Sert au pli de l'écran (« Procédures · à jour ») et à ce que « Tout mettre à jour » lance. */
export function setStateOf(set) {
  return rowsState((S.groups || []).flatMap(g => [...g.rows, ...g.more]).filter(r => r.kind === set));
}
/** L'état d'une liste de lignes de jeux (les lignes utilisées dont la publication est suivie) : { k: 'ok' | 'todo' | 'unknown' | 'none', n }. */
export function rowsState(all) {
  const rows = all.filter(r => r.status === 'used' && r.kind !== 'none');
  if (!rows.length) return {
    k: 'none',
    n: 0
  };
  if (rows.some(r => r.unknown)) return {
    k: 'unknown',
    n: 0
  };
  const n = rows.filter(r => r.attention).length;
  return {
    k: n ? 'todo' : 'ok',
    n
  };
}
/** Ce que la chaîne ferait d'après les choix des panneaux : { runs: [{ set, sel, what }], skipped: [{ set, key, why }] } dans l'ordre publié. Un jeu sans
 *  éléments cochés, aux types OACI refusés ou dont l'un des deux verbes n'est pas connu du lanceur est ignoré, avec sa raison. */
export function chainPlan() {
  const runs = [],
    skipped = [];
  if (!S.d) return {
    runs,
    skipped
  };
  const sc = updateScope();
  for (const set of M.CHAIN_SETS) {
    let sel = selection(set),
      fetchIds = null;
    const names = () => sel.ids.map(id => itemName(set, id)).join(', ');
    // la base ne retient que ce que le lanceur dit à faire (télécharger ce qui manque, reconstruire ce qui n'est pas à jour) ; les autres jeux, seulement quand leur publication n'est pas à jour
    const idle = set === 'base' ? sc.known && sc.n === 0 && sel.ids.length > 0 : !(set === 'proc' && sel.ids.length) && setStateOf(set)
      .k === 'ok'; // les États des procédures cochés à la main sont demandés : ils partent même à jour
    if (set === 'base' && sc.known && sc.n > 0) {
      sel = {
        ...sel,
        ids: sc.todo
      };
      fetchIds = sc.plan.fetch;
    }
    const key = !M.CHAIN_VERBS.every(v => M.verbKnown(S.known, set, v)) ? 'unknown-verb' : set === 'base' && !sel.ids.length ? 'no-zone' :
      set === 'proc' && !sel
      .ids.length ? 'no-state' : set === 'vfr' && !sel.cycle ? 'no-set' : sel.bad?.length ? 'bad-codes' : idle ? 'up-to-date' : null;
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
      fetchIds,
      what: set === 'vfr' ? itemName(set, sel.cycle) : set === 'aircraft' && !sel.ids.length ? tt(TX.chainFleet) : `${count(M.SETS[set].unit, sel.ids.length)} (${names()})`
    });
  }
  return {
    runs,
    skipped
  };
}
/** L'état du bouton « Tout mettre à jour » : { disabled, reason } ; reason : no-launcher | busy | offline | no-set (aucun jeu à lancer). */
export function chainGate(plan) {
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
function chainListHtml(ended = false) {
  return `<ul class="d-sl" data-chain-sets>${chainRows().map(r => `<li data-chain-set="${esc(r.set)}" data-result="${esc(r.result)}"><b>${esc(chainName(r.set))}</b> : ${esc(tt(TX.chainWord[r.result]))}${r.why ? ` (${esc(r.why)})` : ''}${ended && r.result === 'failed' ? ` <button type="button" data-verb="chain-retry" data-set="${esc(r.set)}"${busyNow() || !S.ctx.launcher ? ' disabled' : ''}>${esc(tt(TX.upd.retry))}</button>` : ''}</li>`).join('')}</ul>`;
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
  return `<div data-chain-result data-result="${end.result}"><p class="${end.result === 'done' ? '' : 'f-warn'}"><b>${esc(end.text)}</b></p>${chainListHtml(true)}</div>`;
}
/** Ce que le bouton du haut va faire, en une phrase : ce que la base télécharge et reconstruit (le plan du lanceur), les autres jeux à mettre à jour, puis l'unique publication de la fin ; '' sans rien à lancer. */
function doesText(plan) {
  const sc = updateScope(),
    others = plan.runs.filter(r => r.set !== 'base').map(r => chainName(r.set)),
    dl = sc.plan?.fetch.length || 0,
    bd = sc.plan?.build.length || 0,
    z = n => count('zone', n),
    parts = [dl ? tt(TX.upd.doDl, {
      z: z(dl)
    }) : '', bd ? tt(TX.upd.doBuild, {
      z: z(bd)
    }) : '', others.length ? tt(TX.d4.doSets, {
      s: others.join(', ')
    }) : '', others.length ? tt(TX.d4.doPublish) : ''].filter(Boolean); // une seule publication, à la fin de la chaîne seulement
  return parts.length ? tt(TX.upd.doLine, {
    l: parts.join(', ')
  }) : '';
}
/** Le nombre du bouton : les zones de la base que le lanceur dit à traiter, plus un par autre jeu à mettre à jour ; sans état lu, seulement le nombre de jeux. */
export function chainCount(plan = chainPlan()) {
  const sc = updateScope(),
    others = plan.runs.filter(r => r.set !== 'base').length;
  return sc.known ? sc.n + others : null;
}
/** Le bouton « Tout mettre à jour (n) » de l'en-tête : la chaîne de tous les jeux (base, procédures, points VFR, appareils : une seule question, une seule publication) ; quand seule la base a quelque chose à faire, le même bouton lance la mise à jour de la base. Rend { plan, gate, html (le bouton, son point d'attention), what (la phrase qui dit ce qu'il fait) }. */
export function chainButton() {
  const plan = chainPlan(),
    only = !plan.runs.some(r => r.set !==
      'base'
    ), // seule la base a quelque chose à faire : « tout » est la mise à jour de la base (son plan, sa question), sinon la chaîne de tous les jeux
    gate = only ? updateGate() : chainGate(plan),
    n = chainCount(plan);
  return {
    plan,
    gate,
    only,
    html: `<button type="button"${missingList().length ? '' : ' class="primary"'} data-verb="${only ? 'update' : 'all'}"${gate.disabled ? ' disabled' : ''}>${esc(n === null ? tt(TX.upd.update) : tt(TX.upd.updateN, { n }))}${attnDot(S.attn?.base || S.attn?.proc, S.attn?.base ? staleBy() : '')}</button>`,
    what: doesText(plan)
  };
}
/** Sous le bouton de l'en-tête : le cycle dépassé, la carte de l'opération qui a refusé le départ, la marche de la chaîne ou sa fin. */
export function chainBelowHtml() {
  const stale = ['base', 'proc'].filter(g => S.attn?.[g]).map(g => `<p class="f-warn" data-stale="${g}">${esc(tt(TX.staleCycle, { x: S.attn[g], y: S.cycleId }) + (g === 'base' ? staleBy() : ''))}</p>`).join('');
  return `${stale}${busyCardHtml('base', 'chain')}${chainHtml()}`;
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
  const only = verb === 'fetch' && run.fetchIds ? run.fetchIds : null; // la base : le téléchargement ne prend que ce qui manque
  if (only && !only.length) return {
    verdict: 'nothing',
    kind: 'nothing',
    text: ''
  };
  const sel = only ? {
      ...run.sel,
      ids: only
    } : run.sel,
    ids = run.set === 'aircraft' ? M.SETS.aircraft.steps : sel.ids;
  if (run.set === 'base' && ids.length > M.MAX_ZONES) await runChunks(me, run.set, verb, sel);
  else await settle(me, await launch(run.set, verb, M.setArgs(run.set, verb, sel), ids), true);
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
    text: refusedText(f)
  };
}
/** Fin de la chaîne : le résumé dans la carte, une notification, l'entrée du journal (qui remplace le repère de départ), puis la relecture de ce qui est publié. */
async function endChain(me, ch, result, text, level) {
  S.chain = null;
  S.chainEnd = {
    result,
    text,
    rows: ch.rows,
    runs: ch.allRuns || ch.runs // pour « Réessayer » d'un jeu en échec
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
  await load(true);
}
/** La chaîne : pour chaque jeu, Télécharger puis Construire par le suiveur ; au premier échec, arrêt (ce qui est construit reste commité sur le poste, rien n'est
 *  publié) ; si tout a réussi, UNE publication sans autre question que celle du plan. */
async function runChain(me, plan, prevRows = null) {
  const ch = S.chain = {
    phase: 'running',
    runs: plan.runs,
    i: 0,
    verb: 'fetch',
    stopped: false,
    rows: prevRows ? prevRows.map(r => r.set === plan.runs[0]?.set && plan.runs.length === 1 ? {
      set: r.set,
      result: 'waiting'
    } : {
      ...r
    }) : chainStartRows(plan), // une reprise (« Réessayer ») garde ce que les autres jeux ont fait
    allRuns: prevRows ? S.chainEnd?.runs || plan.runs : plan.runs,
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
  let cancelled = null;
  // les jeux sont indépendants (SOG-0239 : « on continue ») : un échec arrête les étapes de CE jeu (pas de construction sans téléchargement), jamais les autres ; seul « Arrêter » arrête tout
  for (let i = 0; i < ch.runs.length && !cancelled; i++) {
    const run = ch.runs[i];
    ch.i = i;
    row(run.set).result = 'running';
    let failed = null;
    for (const verb of M.CHAIN_VERBS) {
      ch.verb = verb;
      if (ch.stopped) {
        cancelled = {
          set: run.set
        };
        break;
      }
      renderBuild();
      const res = await chainOp(me, run, verb);
      if (S !== me || !res) return;
      if (res.verdict === 'stop') {
        if (ch.stopped || res.kind === 'cancelled') cancelled = {
          set: run.set
        };
        else failed = res.text;
        break;
      }
    }
    row(run.set).result = cancelled ? 'cancelled' : failed !== null ? 'failed' : 'done';
    if (failed !== null) row(run.set).why = failed;
  }
  if (cancelled) {
    for (const r of ch.rows)
      if (r.result === 'waiting') r.result = 'notrun';
    return endChain(me, ch, 'cancelled', tt(TX.chainStopped, {
      s: chainName(cancelled.set)
    }), 'warn');
  }
  const failures = ch.rows.filter(r => r.result === 'failed'),
    list = failures.map(r => `${chainName(r.set)} : ${r.why || tt(TX.chainWord.failed)}`).join(' ; '),
    made = ch.rows.filter(r => r.result === 'done').length;
  if (failures.length && !made) return endChain(me, ch, 'failed', tt(TX.chainFailedAll, {
    list
  }), 'err');
  // au moins un jeu a réussi : une seule publication, sans autre question que celle du plan (ce qui a échoué n'a rien commité de plus : il n'est pas publié)
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
    if (out && (out.kind === 'failed' || out.kind === 'no-exchange' || out.kind === 'no-author'))[result, level] = ['failed', 'err'];
    else if (out && out.kind !== 'done') level = 'warn';
  }
  if (failures.length) {
    if (result === 'done') result = 'partial';
    level = level === 'err' ? 'err' : 'warn';
    return endChain(me, ch, result, tt(TX.chainPartial, {
      n: made,
      f: failures.length,
      list,
      p
    }), level);
  }
  return endChain(me, ch, result, tt(TX.chainDone, {
    n: count('set', ch.runs.length),
    p
  }), level);
}
/** « Réessayer » sur un jeu en échec de la fin de la chaîne : ce jeu seul est relancé (télécharger puis construire), puis la publication ; les autres jeux gardent leur résultat. */
export async function retryChain(set) {
  const me = S,
    end = S.chainEnd,
    run = (end?.runs || []).find(r => r.set === set);
  if (!run || !end.rows.some(r => r.set === set && r.result === 'failed') || chainGate({
      runs: [run]
    }).disabled) return;
  await runChain(me, {
    runs: [run],
    skipped: []
  }, end.rows);
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
