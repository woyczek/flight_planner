// V3 data — « Mettre à jour ce pays » et le fil de la dernière opération d'UN pays (SOG-0262, lot D1, l'essai réel) : le geste de la fiche enchaîne, sans aucune question, la prise du fichier vu dans Téléchargements, le téléchargement et la construction de CE pays ; le bouton DEVIENT son avancement
// sur place (l'étape en mots, « 2 sur 3 », une barre, « Arrêter »), puis la fiche garde, sous l'état, le FIL de cette opération étape par étape (« pris à 14:20Z · téléchargé · construit ») jusqu'à l'opération suivante : une étape en échec y reste avec sa raison et « Réessayer ». Rien d'éphémère : ni notification
// seule, ni fenêtre « reconstruire » ; quand le pays reste « pas à jour » la fiche en dit la raison du lanceur. Le fil est aussi tenu pour les gestes d'un paquet, du bouton du haut ou d'une ligne du mois (threadRecord, appelé à chaque fin de travail de la base) : la fiche d'un pays ne montre que SON fil.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  busyNow,
  count,
  esc,
  refusedText,
  S,
  tt
} from './state.js';
import {
  fmtZ
} from '../../frame/lib/time.js';
import {
  renderBuild,
  selectionOf,
  sourcesWhy
} from './panels.js';
import {
  launch,
  settle
} from './follow.js';
import {
  fetchStatus,
  zoneReasons,
  zoneState
} from './status.js';
import {
  refuseBusy
} from './busy.js';
import {
  updateGate
} from './update.js';

const ZONE = /^[a-z0-9_-]{2,12}$/;
/** Le mot d'une étape dans une phrase d'échec. */
const WORD = {
  pick: () => TX.zx.thWPick,
  download: () => TX.zx.thWDl,
  build: () => TX.zx.thWBuild
};
/** L'heure d'une étape, en UTC (« 14:20Z »), comme celle de la carte de l'opération en cours. */
const timeOf = ms => fmtZ(new Date(ms));
/** Un fil neuf pour un pays : le numéro du geste (S.gid), l'état ('running' tant que le geste de la fiche tourne, 'done' sinon : l'état affiché se déduit des étapes), les étapes. */
function newThread(zone, state, keys = []) {
  const t = {
    zone,
    gid: S.gid || 0,
    state,
    t0: Date.now(),
    steps: keys.map(k => ({
      k,
      st: 'todo',
      at: 0,
      why: ''
    })),
    fixed: null
  };
  S.cw.thread.set(zone, t);
  return t;
}
/** L'étape `k` d'un fil (créée, dans l'ordre des étapes, si elle manque). */
function stepOf(t, k) {
  let s = t.steps.find(x => x.k === k);
  if (!s) {
    s = {
      k,
      st: 'todo',
      at: 0,
      why: ''
    };
    t.steps.push(s);
    t.steps.sort((a, b) => M.STEP_KEYS.indexOf(a.k) - M.STEP_KEYS.indexOf(b.k));
  }
  return s;
}
/** Pourquoi une étape a échoué, en mots : les sources qui ont refusé (téléchargement), le code de la construction, les fichiers attendus et pas là (prise). Tout vient du lanceur et a déjà été borné par le modèle des résultats ; le texte est échappé au dessin. */
function whyOf(key, v) {
  if (key === 'download') return v.failed?.length ? sourcesWhy(v.failed.map(f => ({
    source: f.source,
    code: f.error,
    status: f.status ?? null
  }))) : tt(TX.fetchError.unknown);
  if (key === 'build') return M.own(TX.zoneError, v.error) ? tt(M.own(TX.zoneError, v.error)) : tt(TX.zoneError.unknown);
  const names = [...new Set((v.missing || []).map(m => String(m.expected || '').slice(0, 120)).filter(Boolean))].slice(0, 4).join(', ');
  return names ? tt(TX.zx.thPickMissing, {
    f: names
  }) : tt(TX.zx.thPickNone);
}
/** Retient, pour chaque pays du travail (S.ids), ce que sa fin dit de CE pays (fait, rien de nouveau, en échec, arrêté) : appelée à la fin de chaque travail réel de la base (prise, téléchargement, construction). Un geste qui n'a pas commencé de fil (un paquet, le bouton du haut, une ligne du mois) en
 *  commence un, qui reste jusqu'au geste suivant. */
export function threadRecord(set, verb, out) {
  const key = verb === 'fetch' ? 'download' : verb === 'build' ? 'build' : verb === M.PICKUP.verb ? 'pick' : null;
  if (set !== 'base' || !key || !out || !S?.cw) return;
  for (const zone of S.ids || []) {
    if (!ZONE.test(zone)) continue;
    let t = S.cw.thread.get(zone);
    if (!t || t.gid !== (S.gid || 0)) t = newThread(zone, 'done');
    const v = M.stepVerdict(key, out, zone),
      s = stepOf(t, key);
    s.st = v.st;
    s.at = Date.now();
    s.why = v.st === 'fail' ? whyOf(key, v) : '';
  }
}
/** L'état d'un fil : 'running' (le geste de la fiche tourne), 'failed' (une étape en échec), 'stopped' (arrêté), 'done'. */
function stateOf(t) {
  return t.state === 'running' ? 'running' : t.steps.some(s => s.st === 'fail') || t.fixed?.level === 'err' ? 'failed' : t.steps.some(s => s
    .st === 'stop') ? 'stopped' : 'done';
}
/** Le signe d'une étape : fait ou rien de nouveau (✓), en échec (✗), pas encore fait ou arrêté (○). */
const okOf = s => s.st === 'done' || s.st === 'same' ? 'yes' : s.st === 'fail' ? 'no' : 'todo';
/** Le texte d'une étape dans le fil : « pris à 14:20Z », « téléchargé à 14:21Z : rien de nouveau », « construit à 14:23Z », « téléchargé : HTTP 404 », « construit : pas fait ». */
function stepText(s, t) {
  const T = TX.zx,
    at = s.at ? timeOf(s.at) : '';
  if (s.st === 'fail') return tt(T.thFail, {
    w: tt(WORD[s.k]()),
    r: s.why
  });
  if (s.st === 'done') return tt({
    pick: T.thPick,
    download: T.thDl,
    build: T.thBuild
  } [s.k], {
    t: at
  });
  if (s.st === 'same') return s.k === 'download' ? tt(T.thDlSame, {
    t: at
  }) : s.k === 'build' ? tt(T.thBuildSame, {
    t: at
  }) : tt(T.thPick, {
    t: at
  });
  return s.nobuild ? tt(T.thNoBuild) : tt(T.thNotYet, {
    w: tt(WORD[s.k]())
  });
}
/** Le signe d'une étape, avec le mot qui le dit pour qui ne voit pas la forme. */
const signHtml = ok => `<span class="d-tk" role="img" aria-label="${esc(tt(TX.zx[{ yes: 'twYes', todo: 'twTodo', no: 'twNo', na: 'twNa' }[ok]]))}">${M.SIGN[ok]}</span>`;
/** La liste des étapes d'un fil (celle de la marche comme celle du fil fini). `current` : l'étape en cours (elle porte data-current). */
function stepsHtml(t, current = '', retry = true) {
  const failed = t.steps.filter(s => s.st === 'fail').pop();
  return `<ol class="d-thr" data-thread-steps>${t.steps.map(s => `<li data-thread-step="${esc(s.k)}" data-ok="${okOf(s)}" data-st="${esc(s.st)}"${s.k === current ? ' data-current' : ''}>${signHtml(okOf(s))} <span data-thread-text>${esc(stepText(s, t))}</span>${retry && s === failed ? ` <button type="button" class="d-link" data-act="zop-retry" data-zone="${esc(t.zone)}"${busyNow() ? ' disabled' : ''}>${esc(tt(TX.upd.retry))}</button>${busyNow() ? ` <span class="f-muted" data-grey="busy">${esc(tt(TX.zx.greyBusy))}</span>` : ''}` : ''}</li>`).join('')}</ol>`;
}
/** La phrase du bilan d'un fil fini, d'après l'état du pays tel que le lanceur le dit maintenant : { level, text, why } ; why : la raison dite, pour ne pas la redire sous l'état. */
function bilanOf(t) {
  const T = TX.zx;
  if (t.fixed) return t.fixed;
  const bad = t.steps.find(s => s.st === 'fail');
  if (bad) return {
    level: 'err',
    text: tt(T.thFailed, {
      w: tt(WORD[bad.k]()),
      r: bad.why
    })
  };
  if (t.steps.some(s => s.st === 'stop')) return {
    level: 'warn',
    text: tt(T.thStopped)
  };
  const st = S.status?.zones && Object.hasOwn(S.status.zones, t.zone) ? zoneState(t.zone) : null;
  if (!st) return {
    level: 'warn',
    text: tt(T.thUnread)
  };
  if (st === 'up-to-date') return {
    level: 'ok',
    text: tt(T.thOk)
  };
  const why = zoneReasons(t.zone).join(' ; ');
  return {
    level: 'warn',
    text: why ? tt(T.thStale, {
      r: why
    }) : tt(T.thStaleBare, {
      s: tt(TX.zst[st])
    })
  };
}
/** Le fil de la dernière opération de CE pays : le titre, les étapes (avec « Réessayer » sur la dernière en échec), le bilan en une ligne ; '' sans fil ou pendant le geste de la fiche (l'avancement est alors à la place du bouton). */
export function threadHtml(zone) {
  const t = S.cw?.thread.get(zone);
  if (!t || (S.zop?.zone === zone)) return '';
  const b = bilanOf(t);
  return `<div class="d-thread" data-sheet-thread data-thread-state="${stateOf(t)}"><p class="d-thr-h"><b>${esc(tt(TX.zx.thTitle))}</b></p>${t.steps.length ? stepsHtml(t) : ''}
    <p class="${b.level === 'ok' ? 'f-ok' : b.level === 'err' ? 'f-warn' : 'f-muted'}" data-thread-bilan data-level="${b.level}">${esc(b.text)}</p></div>`;
}
/** Le geste de la fiche (ou un travail de la base qui compte ce pays) est-il en cours ? */
export const progressOn = zone => S.zop?.zone === zone || (!!S.run && S.run.set === 'base' && S.run.verb !== 'purge' && !!S.ids?.includes(
  zone));
/** L'avancement EN PLACE du bouton : l'étape en mots, « n sur m », la barre, les étapes, « Arrêter ». Pour le geste de la fiche : ses étapes ; pour un travail de la base qui compte ce pays (un paquet, le bouton du haut) : l'étape du travail et son compte. */
export function progressHtml(zone) {
  const z = S.zop?.zone === zone ? S.zop : null,
    t = z ? S.cw.thread.get(zone) : null,
    stopping = z ? z.stopped : S.run?.phase === 'stopping',
    T = TX.zx;
  let step, n, m, pct, cur = '';
  if (z && t) {
    const phase = z.phase;
    cur = M.STEP_KEYS.includes(phase) ? phase : '';
    const view = S.run && S.view?.step ? ` ${S.view.step}` : '',
      p = S.run && S.view ? M.progress(S.view, S.ids) : {
        done: 0,
        total: 0,
        pct: 0
      },
      part = p.total > 0 ? p.done / p.total : 0,
      sp = M.stepProgress(t.steps, part);
    step = (phase === 'status' ? tt(T.pgStatus) : phase === 'again' ? tt(T.pgAgain) : tt({
      pick: T.pgPick,
      download: T.pgDl,
      build: T.pgBuild
    } [phase] || T.pgStatus)) + view;
    m = t.steps.length;
    n = m ? Math.min(sp.done + 1, m) : 0;
    pct = sp.pct;
  } else {
    const p = S.view ? M.progress(S.view, S.ids) : {
      done: 0,
      total: 0,
      pct: 0
    };
    step = (S.view?.step ? String(S.view.step) : tt({
      fetch: T.pgDl,
      build: T.pgBuild,
      pickup: T.pgPick
    } [S.run?.verb] || T.pgBuild));
    n = p.done;
    m = p.total;
    pct = p.pct ?? 0;
  }
  return `<div class="d-prog" data-sheet-progress data-zone="${esc(zone)}" data-phase="${esc(z ? z.phase : S.run?.verb || '')}" role="status" aria-live="polite">
    <p><b data-prog-step>${esc(stopping ? tt(TX.stopping) : step)}</b>${m > 0 ? ` <span class="f-muted" data-prog-count>${esc(tt(TX.runCount, { n, m }))}</span>` : ''}</p>
    <div class="d-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${m || 0}" aria-valuenow="${n || 0}"${m > 0 ? '' : ' data-indeterminate'}><i style="width:${pct || 0}%"></i></div>
    ${t ? stepsHtml(t, cur, false) : ''}
    <p class="d-verbs"><button type="button" ${z ? 'data-act="zop-stop"' : 'data-verb="stop"'}${stopping ? ' disabled' : ''}>${esc(tt(TX.stop))}</button>${stopping ? ` <span class="f-muted" data-grey="stopping">${esc(tt(TX.stopping))}</span>` : ''}</p></div>`;
}
/** « Arrêter » pendant le geste de la fiche : le travail en cours reçoit l'arrêt, les étapes qui suivent ne partent pas. */
export function zopStop() {
  if (!S.zop) return;
  S.zop.stopped = true;
  S.run?.ctrl.abort();
  renderBuild();
}
/** « Réessayer » sur l'étape en échec du fil : le geste de la fiche recommence (l'état est relu : seul ce qui manque est refait). */
export function zopRetry(zone) {
  if (!ZONE.test(zone || '') || S.zop) return;
  S.gid = (S.gid || 0) + 1;
  S.at = 'sheet';
  return zoneUpdate(zone);
}
/** Lance le travail d'une étape par le suiveur ordinaire (la fin se dit dans le fil par threadRecord) ; la prise passe par son plan à blanc, sans question (finishPlan). */
async function runStep(me, key, zone, personal) {
  S.lastOp = null;
  if (key === 'pick') return settle(me, await launch('base', M.PICKUP.verb, {
    zones: [zone],
    personal,
    dry: true
  }, [zone], true, {
    zones: [zone],
    personal
  }), true);
  const verb = key === 'download' ? 'fetch' : 'build';
  return settle(me, await launch('base', verb, M.setArgs('base', verb, {
    ids: [zone],
    personal
  }), [zone]), true);
}
/** Ferme le geste de la fiche : le fil devient celui d'une opération finie, l'écran est libre (les lectures « à relire » repartent au dessin). */
function end(me) {
  if (S !== me) return;
  const t = S.cw.thread.get(S.zop?.zone);
  if (t) t.state = 'done';
  S.zop = null;
  renderBuild();
}
/** « Mettre à jour ce pays » : lit l'état du pays, puis enchaîne, sans question, la prise du fichier vu dans Téléchargements, le téléchargement de ce qui manque et la construction (relue : rien à construire se dit) ; au premier échec la chaîne s'arrête, le fil le garde avec sa raison. Un départ
 *  refusé (« une autre opération est en cours ») dessine la carte de cette opération à la place du bouton ; l'avancement et le fil sont sur la fiche. */
export async function zoneUpdate(zone) {
  const me = S;
  if (!ZONE.test(zone || '') || !S.d?.cov?.ids?.includes(zone) || updateGate([zone]).disabled) return;
  const personal = selectionOf([zone]).personal,
    prev = S.cw.thread.get(zone), // le fil d'avant : gardé si ce geste est refusé avant de rien faire
    t = newThread(zone, 'running');
  S.zop = {
    zone,
    phase: 'status',
    stopped: false
  };
  S.lastOp = null;
  S.busy = null;
  renderBuild();
  const st0 = await fetchStatus([zone]);
  if (S !== me) return;
  if (!st0) { // l'état n'a pas pu être lu : rien n'est parti ; une opération en cours dit laquelle
    const f = S.statusRefused;
    if (f && refuseStatus(f)) {
      if (prev) S.cw.thread.set(zone, prev);
      else S.cw.thread.delete(zone);
    } else t.fixed = {
      level: 'err',
      text: tt(TX.zx.thNoState)
    };
    return end(me);
  }
  const dp = M.downloadPlan(st0, [zone]),
    seen = (st0.zones?.[zone]?.reasons || []).some(r => r.code === 'pickup-waiting' && r.zip),
    keys = M.stepsFor({
      seen,
      fetch: dp.fetch.includes(zone)
    });
  if (!seen && !dp.fetch.includes(zone) && !dp.build.includes(zone)) { // rien que le lanceur puisse faire seul pour ce pays
    t.fixed = {
      level: 'warn',
      text: tt(TX.zx.thNothing)
    };
    return end(me);
  }
  t.steps = keys.map(k => ({
    k,
    st: 'todo',
    at: 0,
    why: ''
  }));
  renderBuild();
  for (let i = 0; i < keys.length; i++) {
    const s = stepOf(t, keys[i]);
    if (S.zop.stopped) {
      s.st = 'stop';
      break;
    }
    if (keys[i] === 'build' && i > 0) { // après la prise ou le téléchargement : l'état est relu, rien à construire se dit
      S.zop.phase = 'again';
      renderBuild();
      const st1 = await fetchStatus([zone]);
      if (S !== me) return;
      const plan = st1 ? M.updatePlan(st1, [zone]) : null;
      if (plan && !plan.build.some(b => b.zone === zone)) {
        s.st = 'same';
        s.nobuild = true;
        break;
      }
    }
    S.zop.phase = keys[i];
    renderBuild();
    await runStep(me, keys[i], zone, personal);
    if (S !== me) return;
    const op = S.lastOp;
    if (!op) { // refusé au départ (la carte de l'opération en cours est dessinée) ou rien de pris : l'étape est en échec, dite
      s.st = 'fail';
      s.at = Date.now();
      s.why = S.result?.refused ? S.result.refused.key === 'busy' ? tt(TX.zx.thRefused) : refusedText(S.result.refused) : whyOf(keys[i], {
        missing: []
      });
      break;
    }
    const v = M.stepVerdict(keys[i], op.out, zone);
    if (v.st === 'fail' || v.st === 'stop') break;
  }
  S.zop.phase = 'again';
  renderBuild();
  await fetchStatus([zone]); // l'état du pays tel que le lanceur le dit maintenant : le bilan le lit
  if (S !== me) return;
  end(me);
}
/** Un refus « une autre opération est en cours » de la lecture de l'état : la carte à l'endroit du geste ; faux si ce n'en était pas un. */
function refuseStatus(f) {
  return refuseBusy(f, S.at);
}
/** Le nombre de pays dit en mots (« 9 pays »), pour les boutons de la liste du mois. */
export const countryWord = n => count('country', n);
