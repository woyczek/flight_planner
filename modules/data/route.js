// V3 data — la ligne « Route (RAD, points FRA) » (SPEC § 5.7, SOG-0125) : une ligne de plus dans la rangée des sources des procédures, avec « Importer de Téléchargements ». Le geste est celui des
// prises de fichiers : le plan à blanc du travail route/import-rad d'abord (les classeurs trouvés par motif, leurs cycles et leur taille), une question qui les nomme, l'import des seuls classeurs montrés, puis les cycles
// présents et leur date. L'état de la ligne est celui des autres jeux (model_route.routeState). Ne calcule aucune route et ne lit aucun classeur : le travail du lanceur le fait.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  keepScroll
} from '../../frame/lib/dom.js'; // un rendu ne bouge ni le défilement ni la frappe
import {
  busyNow,
  catSource,
  count,
  esc,
  kind,
  lang,
  li,
  ROUTE,
  ROUTE_MEM,
  S,
  tt
} from './state.js';
import {
  linkHtml,
  load
} from './screen.js';
import {
  renderBuild
} from './panels.js';

/** L'état de la ligne au montage : aucune phase, aucun plan ni résultat, la mémoire du poste lue par load(). */
export const routeInit = () => ({
  phase: null, // null | 'planning' | 'asking' | 'running'
  step: '',
  plan: null, // le plan montré dans la question : { files, failed } (l'import réel n'envoie que ces classeurs, nom et taille)
  result: null, // la dernière fin : { kind: 'none' | 'failed' | 'cancelled' | 'refused' | 'done' | 'partial' | 'not-shown', ... }
  mem: null, // cache/data/route.json : { rad: [dates], fra: [dates], at, commit }
  focus: false // l'adresse demandait cette ligne (?source=eurocontrol_rad) : groupe et ligne ouverts, la ligne amenée à l'écran une fois
});
/** L'état du bouton : { disabled, reason } — le lanceur du poste, une opération déjà en cours (la nôtre comprise), le lanceur qui connaît le verbe. */
export function routeGate() {
  const reason = !S.ctx.launcher ? 'no-launcher' : S.route.phase || busyNow() ? 'busy' : !S.known.includes(M.ROUTE_JOB.key) ?
    'unknown-verb' : '';
  return {
    disabled: !!reason,
    reason
  };
}
/** Les cycles présents : la mémoire du poste et, si le lecteur d'AeroDB le dit, la publication. */
const known = () => M.knownCycles(S.route.mem, S.d?.pub?.route);
/** « 2026-10-08 » en date dans la langue ; le texte tel quel si la date est illisible. */
const dateOf = iso => M.dateText(iso, lang()) || iso;
/** « RAD du 8 oct. 2026 · points FRA du … » : le dernier cycle de chaque classeur, ou « aucun import ». */
function metaText() {
  const k = known(),
    parts = [];
  if (k.rad.length) parts.push(tt(TX.route.radCycle, {
    d: dateOf(k.rad[k.rad.length - 1])
  }));
  if (k.fra.length) parts.push(tt(TX.route.fraCycle, {
    d: dateOf(k.fra[k.fra.length - 1])
  }));
  if (!parts.length) return tt(TX.route.noImport);
  const age = M.ageDays(k.at, S.now ?? Date.now());
  if (age !== null) parts.push(tt(age === 0 ? TX.route.importedToday : age === 1 ? TX.route.importedOne : TX.route.importedMany, {
    n: age
  }));
  return parts.join(' · ');
}
/** Un classeur du plan en une ligne : « RAD_2610_v1.xlsx — RAD « titre », cycle du 8 oct. 2026, 1,2 Mo ». */
function bookLine(f) {
  const what = tt(TX.route.kind[f.kind]) + (f.title ? ` « ${f.title} »` : ''),
    d = f.cycle ? tt(TX.route.cycleOf, {
      d: dateOf(f.cycle)
    }) : '';
  return `<li data-route-book="${esc(f.name)}" data-kind="${esc(f.kind)}"><b>${esc(f.name)}</b> — ${esc([what, d, M.fmtBytes(f.size, lang())].filter(Boolean).join(', '))}</li>`;
}
/** Le motif d'un classeur refusé : la phrase du code court du lanceur, ou le code. */
const whyOf = code => M.own(TX.route.why, code) ? tt(M.own(TX.route.why, code)) : code || tt(TX.route.why.unknown);
/** Les classeurs refusés ou illisibles : « name : motif ». */
const failedHtml = list => list.length ? `<ul data-route-failed>${list.map(f => `<li>${esc(tt(TX.route.failedBook, { n: f.name, w: whyOf(f.error) }))}</li>`).join('')}</ul>` : '';
/** « RAD du cycle du 8 oct., points FRA du cycle du … » : ce qu'un import a pris. */
function takenText(o) {
  const bits = [];
  if (o.rad.length) bits.push(tt(TX.route.takenRad, {
    d: o.rad.map(dateOf).join(', ')
  }));
  if (o.fra.length) bits.push(tt(TX.route.takenFra, {
    d: o.fra.map(dateOf).join(', ')
  }));
  return bits.join(' · ');
}
/** La fin de la dernière demande : les phrases du résultat (une première en gras, les classeurs refusés dessous). */
function resultHtml() {
  const r = S.route.result;
  if (!r) return '';
  const warn = !['done'].includes(r.kind),
    head = r.kind === 'done' ? tt(TX.route.done, {
      w: takenText(r)
    }) : r.kind === 'partial' ? tt(TX.route.partial, {
      w: takenText(r),
      n: count('book', r.failed.length)
    }) : r.kind === 'none' ? tt(TX.route.none) : r.kind === 'cancelled' ? tt(TX.route.cancelled) : r.kind === 'not-shown' ? tt(TX.route
      .notShown) : r.kind === 'refused' ? tt(TX.refused[r.key] || TX.refused.failed, {
      n: r.wait
    }) : tt(TX.route.failed);
  return `<div data-route-result data-result="${esc(r.kind)}"><p${warn ? ' class="f-warn"' : ''}><b>${esc(head)}</b></p>
    ${r.kind === 'done' || r.kind === 'partial' ? `<p class="f-muted" data-route-cycles>${esc(tt(TX.route.present, { w: presentText() }))}${r.commit ? ` · ${esc(tt(TX.route.commit, { c: r.commit }))}` : ''}</p>` : ''}
    ${r.message ? `<p class="f-muted" data-route-message>${esc(tt(TX.route.launcherSays, { m: r.message }))}</p>` : ''}${failedHtml(r.failed || [])}</div>`;
}
/** Les cycles présents après un import : « RAD : …, … · points FRA : … ». */
function presentText() {
  const k = known(),
    bits = [];
  if (k.rad.length) bits.push(tt(TX.route.presentRad, {
    d: k.rad.map(dateOf).join(', ')
  }));
  if (k.fra.length) bits.push(tt(TX.route.presentFra, {
    d: k.fra.map(dateOf).join(', ')
  }));
  return bits.join(' · ');
}
/** La question qui nomme les classeurs montrés par le plan, la licence, et « Importer » / « Annuler ». */
function askHtml() {
  const p = S.route.plan,
    lic = catSource('eurocontrol_rad')?.lic?.[li()] || '';
  return `<div data-route-ask><p><b>${esc(tt(TX.route.ask, { n: count('book', p.files.length) }))}</b></p>
    <ul data-route-books>${p.files.map(bookLine).join('')}</ul>${failedHtml(p.failed)}
    ${lic ? `<p class="f-muted" data-route-licence>${esc(tt(TX.licenceLine, { l: lic }))}</p>` : ''}
    <p><button type="button" class="primary" data-verb="route-yes">${esc(tt(TX.route.go))}</button> <button type="button" data-verb="route-no">${esc(tt(TX.route.cancel))}</button></p></div>`;
}
/** La marche : le texte du pas du lanceur (le classeur lu) et la barre indéterminée. */
const runningHtml = () => `<div data-route-running><span>${esc(S.route.step || tt(S.route.phase === 'planning' ? TX.route.planning : TX.route.running))}</span><div class="d-bar" role="progressbar" data-indeterminate><i></i></div></div>`;
/** Le détail replié de la ligne : le lien et la licence, ce que fait l'import, le bouton et sa raison, puis la question, la marche ou la fin. */
function bodyHtml() {
  const src = catSource('eurocontrol_rad'),
    gate = routeGate(),
    r = S.route;
  return `<dl class="f-dl"><dt>${esc(tt(TX.link))}</dt><dd>${src ? linkHtml(src) : ''}</dd>
    ${src ? `<dt>${esc(tt(TX.licence))}</dt><dd>${esc(src.lic[li()])}</dd>` : ''}</dl>
    <p class="f-muted" data-route-hint>${esc(tt(TX.route.hint))}</p>
    ${r.phase === 'asking' ? askHtml() : `<p><button type="button" data-verb="route-import"${gate.disabled ? ' disabled' : ''}>${esc(tt(TX.route.import))}</button></p>
      ${gate.reason && !r.phase ? `<p class="f-muted" data-reason="${gate.reason}">${esc(tt(TX.greyReason[gate.reason]))}</p>` : ''}`}
    ${r.phase === 'planning' || r.phase === 'running' ? runningHtml() : resultHtml()}`;
}
/** La ligne : le même gabarit que les autres jeux (résumé avec le nom, le texte de méta et la pastille d'état ; détail replié). */
export function routeRowHtml() {
  if (!S.route) return '';
  const st = M.routeState(known(), S.airac, S.now ?? Date.now()),
    pill = `<span class="f-badge"${kind(st.level)} data-pill>${esc(tt(TX.state[st.state]))}</span>`,
    open = !!S.route.phase || !!S.route.result || S.route.focus;
  return `<details class="f-card" data-set="route" data-status="used" data-state="${esc(st.state)}" data-cycle="${esc(st.cycleDate || '')}"${open ? ' open' : ''}>
    <summary><span class="d-sum"><b>${esc(tt(TX.route.name))}</b><span class="f-muted" data-route-meta>${esc(metaText())}</span></span>${pill}</summary>${bodyHtml()}</details>`;
}
/** L'adresse `#data?source=eurocontrol_rad` (le lien du pas Route de Carburant, Features SOG) : à demander avant le premier dessin, elle ouvre le groupe des procédures et la ligne. Une seule fois par montage. */
export function wantRoute() {
  const q = S.ctx.query?.source;
  if (S.route.asked || (q !== 'eurocontrol_rad' && q !== 'route')) return;
  S.route.asked = true;
  S.route.focus = true;
  S.manual.proc = true;
}
/** Après ce dessin : amène la ligne demandée à l'écran, une fois. */
export function showRoute() {
  if (!S.route.focus) return;
  S.route.focus = false;
  S.body?.querySelector('[data-set="route"]')?.scrollIntoView({
    block: 'center'
  });
}
/** Redessine la ligne seule (sans toucher le reste de l'écran) ; l'état ouvert ou replié que la main a laissé est gardé hors des phases. */
export function renderRoute() {
  const el = S?.body?.querySelector('[data-set="route"]');
  if (!el) return;
  const was = el.open;
  keepScroll(S.body, () => {
    const t = document.createElement('template');
    t.innerHTML = routeRowHtml();
    const fresh = t.content.firstElementChild;
    if (!fresh) return;
    if (!S.route.phase && !S.route.result) fresh.open = was;
    el.replaceWith(fresh);
  });
}
/** Lance le travail du lanceur (regen/job) et le suit ; rend la vue finale, ou la réponse d'un refus. `args` : le corps (dry, books). */
async function runJob(args, ctrl) {
  return S.ctx.launcher.job(ROUTE, {
    set: M.ROUTE_JOB.set,
    verb: M.ROUTE_JOB.verb,
    args
  }, {
    onProgress: v => {
      S.route.step = typeof v?.step === 'string' ? v.step.replace(/[\p{Cc}]/gu, ' ').slice(0, 120) : '';
      renderRoute();
    },
    signal: ctrl.signal
  });
}
/** Un départ refusé (la réponse n'a pas d'état de travail) : la clé du refus et, s'il y a lieu, l'attente. */
function refusedResult(final) {
  const f = M.refusal(final);
  return {
    kind: 'refused',
    key: f.key,
    wait: f.wait,
    failed: []
  };
}
/** « Importer de Téléchargements » : le plan à blanc (dry envoyé explicitement), dont la fin pose la question ou dit pourquoi il n'y en a pas. */
export async function startRoute() {
  const me = S;
  if (routeGate().disabled) return;
  S.route = {
    ...S.route,
    phase: 'planning',
    step: '',
    plan: null,
    result: null
  };
  renderBuild();
  renderRoute();
  const final = await runJob({
    dry: true
  }, new AbortController());
  if (S !== me) return;
  S.route.step = '';
  if (!final?.state) {
    S.route.phase = null;
    S.route.result = refusedResult(final);
    S.ctx.notify(tt(TX.refused[S.route.result.key] || TX.refused.failed, {
      n: S.route.result.wait
    }), 'err');
  } else {
    const plan = M.planOf(final);
    S.route.phase = plan.kind === 'plan' ? 'asking' : null;
    S.route.plan = plan.kind === 'plan' ? plan : null;
    S.route.result = plan.kind === 'plan' ? null : {
      kind: plan.kind,
      failed: plan.failed
    };
  }
  renderBuild();
  renderRoute();
}
/** La réponse à la question : non, rien ne part ; oui, l'import réel des classeurs montrés (leurs noms et leurs tailles, jamais un plan relu), la mémoire du poste mise à jour, une notification. */
export async function answerRoute(yes) {
  const me = S,
    plan = S.route.plan;
  if (!plan || S.route.phase !== 'asking') return;
  if (!yes) {
    S.route = {
      ...S.route,
      phase: null,
      plan: null
    };
    renderBuild();
    return renderRoute();
  }
  S.route = {
    ...S.route,
    phase: 'running',
    step: '',
    plan: null
  };
  renderBuild();
  renderRoute();
  const final = await runJob({
    dry: false,
    books: plan.files.map(f => ({
      name: f.name,
      size: f.size
    }))
  }, new AbortController());
  if (S !== me) return;
  S.route.step = '';
  S.route.phase = null;
  if (!final?.state) {
    S.route.result = refusedResult(final);
    S.ctx.notify(tt(TX.refused[S.route.result.key] || TX.refused.failed, {
      n: S.route.result.wait
    }), 'err');
  } else {
    const out = M.importOutcome(final, plan.files);
    if (out.rad.length || out.fra.length) {
      S.route.mem = M.memoryAfter(known(), out, new Date().toISOString()); // les cycles présents : ceux d'avant et ceux de cet import
      S.ctx.data.put(ROUTE_MEM, S.route.mem).catch(() => {});
    }
    S.route.result = out;
    S.ctx.notify(out.kind === 'done' || out.kind === 'partial' ? tt(TX.route.done, {
      w: takenText(out)
    }) : tt(TX.route.failed), out.kind === 'done' ? 'ok' : 'err');
    load(true);
  }
  renderBuild();
  renderRoute();
}
