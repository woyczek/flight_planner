// V3 data — la ligne « Synoptique monde (GFS) » du groupe Météo (SPEC § 5.11, SOG-0138) : l'état de la publication que le lanceur tient (weather/world { action: 'status' } : le run, l'âge, le poids, sans réseau) et « Construire » (le même travail, `build` : environ 2 minutes la première fois, 13 s
// quand le run est déjà là). La publication est LOCALE au poste (data/weather/world/) : jamais synchronisée ni commitée, la ligne le dit. Même gabarit que les autres jeux (résumé, pastille, détail replié) ; ne calcule aucune prévision : le lanceur l'a faite.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  keepScroll
} from '../../frame/lib/dom.js'; // un rendu ne bouge ni le défilement ni la frappe
import {
  busyNow,
  esc,
  kind,
  lang,
  ROUTE,
  S,
  tt
} from './state.js';
import {
  renderBuild
} from './panels.js';

/** L'état de la ligne au montage : aucune phase, ni état lu, ni fin. */
export const worldInit = () => ({
  phase: null, // null | 'reading' | 'running'
  step: '',
  status: null, // la dernière publication lue : M.worldOf
  result: null, // la dernière fin d'une construction : { kind: 'done' | 'kept' | 'failed' | 'refused', ... }
  read: false // l'état a été demandé à l'ouverture
});
/** L'état du bouton : le lanceur du poste, rien d'autre en cours (la nôtre comprise), le lanceur qui connaît weather/world. */
export function worldGate() {
  const reason = !S.ctx.launcher ? 'no-launcher' : S.world.phase || busyNow() ? 'busy' : !S.known.includes(M.WORLD_JOB.key) ?
    'unknown-verb' : '';
  return {
    disabled: !!reason,
    reason
  };
}
/** Lance le travail du lanceur (regen/job) pour une action et le suit ; rend la vue finale ou la réponse d'un refus. */
function runJob(action, ctrl) {
  return S.ctx.launcher.job(ROUTE, {
    set: M.WORLD_JOB.set,
    verb: M.WORLD_JOB.verb,
    args: {
      action
    }
  }, {
    onProgress: v => {
      S.world.step = typeof v?.step === 'string' ? v.step.replace(/[\p{Cc}]/gu, ' ').slice(0, 120) : '';
      renderWorld();
    },
    signal: ctrl.signal
  });
}
/** Lit l'état de la publication (action « status », sans réseau) à l'ouverture et quand on le demande ; silencieux si le lanceur ne répond pas ou est occupé. */
export async function readWorld() {
  const me = S;
  if (!S.ctx.launcher || !S.known.includes(M.WORLD_JOB.key) || S.world.phase || busyNow()) return;
  S.world.phase = 'reading';
  renderWorld(); // le bouton est gris pendant la lecture
  const final = await runJob('status', new AbortController());
  if (S !== me) return;
  S.world.phase = null;
  const w = M.worldOf(final);
  if (w) S.world.status = w;
  renderWorld();
}
/** « 2026-11-10T06:00 » en « 10 nov. 2026 06:00Z » (UTC, comme les autres heures de l'écran) ; la valeur telle quelle si illisible. */
const runText = iso => !iso ? '' : M.dateText(iso.slice(0, 10), lang()) + ` ${iso.slice(11, 16)}Z`;
/** Ce que dit le résumé de la ligne : « run 10 nov. 06:00Z · 25 étapes · 17,1 Mo · construit il y a 3 h ». */
function metaText() {
  const w = S.world.status;
  if (!w || !w.exists) return tt(TX.world.none);
  const parts = [tt(TX.world.run, {
    r: runText(w.run) || '?'
  })];
  if (w.steps !== null) parts.push(tt(TX.world.steps, {
    n: w.steps
  }));
  if (w.bytes !== null) parts.push(M.fmtBytes(w.bytes, lang()));
  const h = M.worldAgeHours(w, S.now ?? Date.now());
  if (h !== null) parts.push(tt(h === 0 ? TX.world.ageNow : TX.world.age, {
    n: h
  }));
  return parts.join(' · ');
}
/** La fin d'une construction en phrases : ce qu'elle a publié, ou la raison de l'échec. */
function resultHtml() {
  const r = S.world.result;
  if (!r) return '';
  const head = r.kind === 'done' ? tt(TX.world.done, {
    r: runText(r.run) || '?',
    n: r.steps ?? '?',
    s: r.bytes !== null ? M.fmtBytes(r.bytes, lang()) : '?',
    t: r.seconds ?? '?'
  }) + (r.kept ? ` ${tt(TX.world.kept)}` : '') : r.kind === 'refused' ? tt(TX.refused[r.key] || TX.refused.failed, {
    n: r.wait
  }) : tt(M.own(TX.world.why, r.reason) || TX.world.why.failed);
  return `<div data-world-result data-result="${esc(r.kind)}"><p${r.kind === 'done' ? '' : ' class="f-warn"'}><b>${esc(head)}</b></p></div>`;
}
/** Le détail replié : où la publication vit (locale au poste), d'où viennent les données, le bouton et sa raison, la marche ou la fin. */
function bodyHtml() {
  const gate = worldGate(),
    r = S.world;
  return `<p class="f-muted" data-world-hint>${esc(tt(TX.world.hint))}</p><p class="f-muted" data-world-local>${esc(tt(TX.world.local))}</p>
    <p><button type="button" data-verb="world-build"${gate.disabled ? ' disabled' : ''}>${esc(tt(TX.world.build))}</button></p>
    ${gate.reason && !r.phase ? `<p class="f-muted" data-reason="${gate.reason}">${esc(tt(TX.greyReason[gate.reason]))}</p>` : ''}
    ${r.phase === 'running' ? `<div data-world-running><span>${esc(r.step || tt(TX.world.running))}</span><div class="d-bar" role="progressbar" data-indeterminate><i></i></div></div>` : resultHtml()}`;
}
/** La ligne : le même gabarit que les autres jeux. */
export function worldRowHtml() {
  if (!S.world) return '';
  const st = M.worldState(S.world.status, S.now ?? Date.now()),
    pill = `<span class="f-badge"${kind(st.level)} data-pill>${esc(tt(TX.world.state[st.state]))}</span>`,
    open = S.world.phase === 'running' || !!S.world.result;
  return `<details class="f-card" data-set="world" data-status="used" data-phase="${esc(S.world.phase || '')}" data-state="${esc(st.state)}"${open ? ' open' : ''}>
    <summary><span class="d-sum"><b>${esc(tt(TX.world.name))}</b><span class="f-muted" data-world-meta>${esc(metaText())}</span></span>${pill}</summary>${bodyHtml()}</details>`;
}
/** Redessine la ligne seule ; l'état ouvert ou replié laissé à la main est gardé hors d'une marche ou d'une fin. */
export function renderWorld() {
  const el = S?.body?.querySelector('[data-set="world"]');
  if (!el) return;
  const was = el.open;
  keepScroll(S.body, () => {
    const t = document.createElement('template');
    t.innerHTML = worldRowHtml();
    const fresh = t.content.firstElementChild;
    if (!fresh) return;
    if (!S.world.phase && !S.world.result) fresh.open = was;
    el.replaceWith(fresh);
  });
}
/** « Construire » : le travail du lanceur (action build), suivi par ses vues ; la fin dit ce qui est publié ou pourquoi rien ne l'est ; l'état est celui de la fin (la publication qu'elle rend). */
export async function startWorld() {
  const me = S;
  if (worldGate().disabled) return;
  S.world = {
    ...S.world,
    phase: 'running',
    step: '',
    result: null
  };
  renderBuild();
  renderWorld();
  const final = await runJob('build', new AbortController());
  if (S !== me) return;
  S.world.step = '';
  S.world.phase = null;
  const w = M.worldOf(final);
  if (!final?.state) {
    const f = M.refusal(final);
    S.world.result = {
      kind: 'refused',
      key: f.key,
      wait: f.wait
    };
    S.ctx.notify(tt(TX.refused[f.key] || TX.refused.failed, {
      n: f.wait
    }), 'err');
  } else if (w?.ok) {
    S.world.status = w;
    S.world.result = {
      kind: 'done',
      ...w
    };
    S.ctx.notify(tt(TX.world.done, {
      r: runText(w.run) || '?',
      n: w.steps ?? '?',
      s: w.bytes !== null ? M.fmtBytes(w.bytes, lang()) : '?',
      t: w.seconds ?? '?'
    }), 'ok');
  } else {
    S.world.result = {
      kind: 'failed',
      reason: w?.reason || 'failed'
    };
    S.ctx.notify(tt(M.own(TX.world.why, w?.reason) || TX.world.why.failed), 'err');
  }
  renderBuild();
  renderWorld();
}
