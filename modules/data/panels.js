// V3 data — dessine les panneaux de jeux (SPEC § 11) : le choix, les boutons, la marche, la fin et ses résumés, le dessin d'un panneau seul (redrawPanel, renderBuild). Ne lance aucun travail
// (follow.js) et ne lit rien du lanceur.
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
  frozen,
  kind,
  lang,
  li,
  S,
  tt
} from './state.js';
import {
  attachMaps,
  zoneMapHtml
} from './zonemap.js';
import {
  publishHtml,
  renderPublish
} from './publish.js';
import {
  updateAllInner
} from './chain.js';

/** L'assistant de première installation (page V2 servie par le lanceur : SPEC § 6.5), adresse fixe du dépôt, jamais prise d'une réponse. */
const FIRST_INSTALL = new URL('../../apps/settings/premier_lancement.html', import.meta.url).pathname;
/** Les zones de la couverture dans l'ordre de zones() et, parmi elles, les cochées. */
export function buildZones() {
  const ids = M.orderZones(S.d.cov.ids, S.d.zones);
  return {
    ids,
    ticked: ids.filter(z => S.ticked?.has(z))
  };
}
/** L'état des boutons « Télécharger », « Construire » et « Purger » d'un panneau : { reason, verbs } (M.setGate). `set` : le jeu ; `items` : le
 *  nombre d'éléments cochés (absent : le jeu n'en coche pas) ; `verbs` : ceux du panneau (par défaut ceux du jeu). */
export function gateOf(set, items, verbs) {
  return M.setGate({
    set,
    verbs,
    launcher: !!S.ctx.launcher,
    known: S.known,
    busy: busyNow(),
    offline: navigator.onLine === false,
    items
  });
}
/** Le nom d'une source sous licence personnelle : celui du catalogue d'aerodb, à défaut un texte du module. */
function personalName(id) {
  return catSource(id)?.n?.[li()] || tt(TX.personalName[id]);
}
/** Les sources sous licence personnelle cochées ET proposées (celles d'une zone décochée ne partent pas). */
function personalPicked(ticked) {
  return M.personalSources(ticked).filter(p => S.personal.has(p.id)).map(p => p.id);
}
/** Une case à cocher avec son libellé (44 px de haut) ; attr : l'attribut data- qui la repère. */
function optHtml(attr, id, label, checked, disabled) {
  return `<label class="d-opt"><input type="checkbox" ${attr}="${esc(id)}"${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}><span>${esc(label)}</span></label>`;
}
/** Le nom d'une source téléchargée : celui du catalogue d'aerodb, à défaut son identifiant. */
function sourceName(id) {
  return catSource(id)?.n?.[li()] || id;
}
/** Le motif d'un échec de source : « HTTP 404 » (code et statut), « le réseau ne répond pas »… */
function fetchWhy(code, status) {
  if (code === 'http' && status !== null) return tt(TX.fetchError.httpN, {
    s: status
  });
  const known = M.own(TX.fetchError, code);
  return code && !known ? itemWhy(code) : tt(known || TX.fetchError.unknown); // un code court d'un autre jeu : sa phrase, sinon tel quel
}
/** Le motif d'un code d'erreur d'un élément propre aux jeux autres que la base (TX.itemError : « un terrain à la fois »…), sinon le code tel quel. */
const itemWhy = code => M.own(TX.itemError, code) ? tt(M.own(TX.itemError, code)) : code ?? '';
/** La ligne d'une source dans un téléchargement : son nom et son état en peu de mots (téléchargée : n fichiers, inchangée, échec :
 *  code et statut HTTP, ignorée : licence non déclarée, manuelle). */
function sourceLineHtml(s) {
  const size = s.bytes !== null ? M.fmtBytes(s.bytes, lang()) : '',
    word = s.state === 'downloaded' ? s.files !== null ? tt(TX.sourceState.downloaded, {
      n: count('file', s.files) + (size ? ` (${size})` : '')
    }) : tt(TX.sourceState.downloadedNo) : s.state === 'failed' ? tt(TX.sourceState.failed, {
      r: fetchWhy(s.code, s.status)
    }) : s.state === 'skipped' ? tt(s.code === 'personal' ? TX.sourceState.skippedPersonal : TX.sourceState.skipped) : tt(M.own(TX
      .sourceState, s.state)),
    k = M.own({
      downloaded: 'ok',
      unchanged: 'ok',
      failed: 'err'
    }, s.state);
  return `<li data-source="${esc(s.id)}" data-state="${s.state}"><i class="f-dot"${kind(k)} aria-hidden="true"></i><span><b>${esc(sourceName(s.id))}</b> : ${esc(word)}</span></li>`;
}
/** La phrase d'une zone dans la marche d'un verbe : en attente, en cours (n / m sources), terminée, échec (le motif écrit en toutes lettres). */
function zoneWord(r, verb) {
  const T = verb === 'fetch' ? TX.fetchState : verb === 'purge' ? TX.purgeState : TX.zoneState;
  if (r.key === 'failed') return tt(T.failed, {
    r: verb === 'fetch' ? fetchWhy(r.code, null) : verb !== 'purge' && M.own(TX.zoneError, r.code) ? tt(M.own(TX.zoneError, r.code)) :
      r.code ===
      'unknown' ? tt(TX
        .zoneError.unknown) : itemWhy(r
        .code) // un code que le module ne connaît pas (un jeu autre que la base) : sa phrase, sinon tel quel
  });
  if (/[NP]$/.test(r.key)) return tt(T[r.key], {
    n: r.n,
    m: r.m
  });
  if (verb === 'purge' && r.key === 'done') return tt(T.done, {
    n: count('file', r.files ?? 0),
    s: M.fmtBytes(r.bytes ?? 0, lang())
  });
  return tt(T[r.key]);
}
/** Le nom d'un élément d'un jeu dans la langue : la zone (base), l'État (procédures), « Cycle 2611 » (le cycle, désigné par sa date d'effet), le
 *  type OACI tel quel. */
export function itemName(set, id) {
  if (set === 'base') return M.zoneName(S.d?.zones, id, li());
  if (set === 'proc') return M.bulkName(S.d?.byState, id, li());
  if (set === 'vfr') return S.airac && /^\d{4}-\d{2}-\d{2}$/.test(id) ? tt(TX.cycle, {
    c: M.cycleName(S.airac, id)
  }) : id;
  return M.own(TX.stepName, id) ? tt(M.own(TX.stepName, id)) : id; // les appareils : les trois étapes
}
/** La vue du dernier travail du jeu, ramenée à la forme de la base (M.normView) pour les lignes d'éléments. */
const opView = set => M.normView(set, S.view);
/** La ligne d'un élément dans la marche : point de couleur, nom, phrase ; pour un téléchargement, dessous une ligne par source. `set` : le jeu
 *  (la base garde data-zone-state, les autres data-item-state). */
function zoneLineHtml(r, verb = 'build', set = 'base') {
  const word = zoneWord(r, verb),
    attr = set === 'base' ? 'data-zone-state' : 'data-item-state',
    k = {
      built: 'ok',
      done: 'ok',
      failed: 'err',
      building: 'accent',
      fetching: 'accent',
      purging: 'accent',
      cancelled: 'warn'
    } [r.state],
    head = `<b>${esc(itemName(set, r.zone))}</b> : ${esc(word)}`;
  if (verb === 'fetch') {
    const src = M.sourceRows(opView(set)?.zones?.[r.zone]);
    return `<li ${attr}="${esc(r.zone)}" data-state="${r.state}"><i class="f-dot"${kind(k)} aria-hidden="true"></i><div>${head}${src.length ? `<ul class="d-sl" data-sources>${src.map(sourceLineHtml).join('')}</ul>` : ''}</div></li>`;
  }
  return `<li ${attr}="${esc(r.zone)}" data-state="${r.state}"><i class="f-dot"${kind(k)} aria-hidden="true"></i><span>${head}</span></li>`;
}
/** « 12 terrains » : le nombre fait, avec le nom de ce que le travail compte (la vue dit son unité : aerodromes, steps…) ; la base compte des zones ; un
 *  jeu dont l'unité est inconnue donne le nombre seul. */
function runUnit(set, view, n) {
  if (set === 'base') return count('zone', n);
  const u = M.own({
    steps: 'step',
    aerodromes: 'aerodrome',
    files: 'file',
    types: 'type',
    states: 'state',
    zones: 'zone',
    cycles: 'cycle',
    sheets: 'sheet',
    charts: 'chart'
  }, view?.unit);
  return u ? count(u, n) : String(n);
}
/** La marche : barre, « n zones sur m », étape, temps écoulé, « Arrêter », une ligne par zone (par source pour un téléchargement). */
function runningHtml() {
  const run = S.run,
    set = run.set,
    p = M.progress(S.view, S.ids),
    stopping = run.phase === 'stopping',
    shown = run.verb !== M.PICKUP.verb && (p.total > 0 || set === 'base' && !M.SETS[set]
      .free
    ); // un jeu dont on ne connaît pas encore les éléments ne compte pas « 0 sur 0 » ; la prise de fichiers compte des fichiers à la fin
  return `<div class="d-run" data-running data-op="${run.verb}" data-run-set="${esc(set)}"${run.dry ? ' data-dry' : ''} data-phase="${run.phase}">
    <div class="d-runhead">${shown ? `<b data-count>${esc(tt(TX.runCount, { n: runUnit(set, S.view, p.done), m: p.total }))}</b>` : ''}
      <span data-step>${esc(stopping ? tt(TX.stopping) : S.view?.step || '')}</span>
      <span class="f-muted" data-elapsed>${esc(tt(TX.elapsed, { t: M.clock((Date.now() - run.t0) / 1e3) }))}</span></div>
    <div class="d-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.done}"${S.view && p.pct !== null ? '' : ' data-indeterminate'}><i style="width:${p.pct ?? 0}%"></i></div>
    ${run.verb === M.PICKUP.verb ? '' : `<ul class="d-zl">${M.zoneRows(opView(set), S.ids, run.verb, set !== 'base').map(r => zoneLineHtml(r, run.verb, set)).join('')}</ul>`}
    <p><button type="button" data-verb="stop"${stopping ? ' disabled' : ''}>${esc(tt(TX.stop))}</button></p></div>`;
}
/** Les fins possibles d'une construction (les genres de M.outcome), une ligne par genre : le niveau, le conseil (clé de TX.advice pour la base, de TX.setAdvice pour les autres) et la phrase
 *  de la base [0] et des autres jeux [1] (absente : ce genre n'existe pas pour ce jeu). */
const SUM_KINDS = {
  done: {
    level: 'ok',
    text: [TX.sumDone, TX.setSum.buildDone]
  },
  partial: {
    level: 'warn',
    advice: 'partial',
    text: [TX.sumPartial, TX.setSum.buildPartial]
  },
  failed: {
    level: 'err',
    advice: 'failed',
    text: [TX.sumFailed, TX.setSum.buildFailed]
  },
  cancelled: {
    level: 'warn',
    advice: 'cancelled',
    text: [TX.sumCancelled, TX.setSum.buildStopped]
  },
  interrupted: {
    level: 'warn',
    advice: 'interrupted',
    text: [TX.sumInterrupted, TX.setSum.buildInterrupted]
  },
  'no-browser': {
    level: 'err',
    text: [TX.sumNoBrowser]
  },
  'xplane-in-page': {
    level: 'err',
    text: [TX.sumXplane]
  },
  'no-codes': {
    level: 'err',
    text: [null, TX.setSum.noCodes]
  },
  'no-script': {
    level: 'err',
    text: [null, TX.setSum.noScript]
  },
  'no-pypdf': {
    level: 'err',
    text: [null, TX.vfrSum.noPypdf]
  },
  'no-cache': {
    level: 'err',
    text: [null, TX.vfrSum.noCache]
  },
  invalid: {
    level: 'err',
    text: [null, TX.vfrSum.invalid]
  },
  'merge-pending': {
    level: 'err',
    text: [TX.mergePending, TX.mergePending]
  }
};
/** Le résumé de fin d'une construction (aussi le texte de la notification) : { text, advice, level, notes? } d'après la fin calculée par M.outcome. Un seul tableau de genres (SUM_KINDS) pour
 *  tous les jeux ; le nom des éléments et le libellé viennent du jeu (la base compte des zones, les autres leur propre unité). Un genre que ce jeu ne connaît pas est un échec. Sans trigramme le
 *  lanceur ne commite pas (points VFR) : une note le dit. */
export function summary(out, set = 'base') {
  const base = set === 'base',
    i = base ? 0 : 1,
    n = out.built.length,
    unit = base ? 'zone' : M.SETS[set].unit,
    v = {
      s: base ? '' : tt(TX.setLabel[set]),
      built: count(unit, n),
      failed: out.failed.length,
      zones: out.failed.map(f => f.zone).join(', '),
      items: out.failed.map(f => itemName(set, f.zone)).join(', '),
      n: base ? n : count(unit, n)
    },
    known = M.own(SUM_KINDS, out.kind),
    row = known?.text[i] ? known : SUM_KINDS.failed,
    sm = {
      text: tt(row.text[i], v),
      level: row.level,
      ...(row.advice ? {
        advice: (base ? TX.advice : TX.setAdvice)[row.advice]
      } : {})
    };
  return !base && out.noCommit ? {
    ...sm,
    level: sm.level === 'ok' ? 'warn' : sm.level,
    notes: [tt(TX.vfrNoCommit)]
  } : sm;
}
/** Une part de phrase au singulier ou au pluriel : TX[key] = [[singulier], [pluriel]]. */
const plural = (key, n) => tt(TX[key][n === 1 ? 0 : 1], {
  n
});
/** Le résumé d'un téléchargement : { text, outside (la phrase des fichiers hors synchronisation, vide sans), level }. */
export function fetchSummary(out, set = 'base') {
  if (set === 'vfr') {
    const v = {
      s: tt(TX.setLabel.vfr),
      c: out.counts.fetched,
      u: out.counts.unchanged,
      p: plural('vfrNotPublished', out.counts.notPublished),
      f: plural('fetchFails', out.failed.length)
    };
    return {
      text: tt(out.kind === 'no-base' ? TX.vfrSum.noBase : out.kind === 'not-published' ? TX.vfrSum.notPublished : out.kind ===
        'interrupted' ? TX.setSum
        .fetchInterrupted : out.kind === 'cancelled' ? TX.vfrSum.fetchStopped : TX.vfrSum.fetchDone, v),
      outside: '',
      level: out.level
    };
  }
  if (set !== 'base') {
    const T = TX.setSum,
      unit = M.SETS[set].unit,
      v = {
        s: tt(TX.setLabel[set]),
        c: out.counts ? count('aerodrome', out.counts.fetched) : count(unit, out.fetched.length), // proc/fetch compte des terrains
        u: out.counts ? count('aerodrome', out.counts.unchanged) : count(unit, out.unchanged.length),
        f: plural('fetchFails', out.failed.length)
      };
    return {
      text: tt(out.kind === 'nothing' ? T.fetchNothing : out.kind === 'interrupted' ? T.fetchInterrupted : out.kind === 'cancelled' ? T
        .fetchStopped : out.kind === 'no-codes' ? T.noCodes : out.kind === 'no-script' ? T.noScript : T.fetchDone, v),
      outside: out.outside > 0 ? plural('fetchOutside', out.outside) : '',
      level: out.level
    };
  }
  const v = {
      c: plural('fetchChanged', out.fetched.length),
      u: plural('fetchSame', out.unchanged.length),
      f: plural('fetchFails', out.failed.length)
    },
    text = out.kind === 'nothing' ? tt(TX.fetchNothing) : out.kind === 'interrupted' ? tt(TX.fetchSumInterrupted) : out.kind ===
    'cancelled' ? tt(
      TX.fetchSumStopped, v) : tt(TX.fetchSum, v);
  return {
    text,
    outside: out.outside > 0 ? plural('fetchOutside', out.outside) : '',
    level: out.level
  };
}
/** Le résumé de la fin d'une purge : { text, notes (les phrases des avertissements), level } ; `none` : le plan n'avait rien à retirer. */
export function purgeSummary(out, none = false) {
  if (none) return {
    text: tt(TX.purgeNothing),
    notes: [],
    level: 'ok'
  };
  const text = {
    done: TX.purgeDone,
    partial: TX.purgePartial,
    failed: TX.purgeFailed,
    cancelled: TX.purgeStopped,
    interrupted: TX.purgeInterrupted
  } [out.kind];
  return {
    text: tt(text, {
      n: count('file', out.files),
      s: M.fmtBytes(out.bytes, lang())
    }),
    notes: purgeNotes(out),
    level: out.level
  };
}
/** Les phrases des avertissements d'une purge : les fichiers du SIA partagés (purger la France), les fichiers suivis par git gardés,
 *  les chemins refusés. */
function purgeNotes(out) {
  return [out.shared ? tt(TX.purgeShared) : '', out.kept > 0 ? plural('purgeKept', out.kept) : '', out.unsafe > 0 ? plural('purgeUnsafe',
    out.unsafe) : ''].filter(Boolean);
}
/** La question de la purge, faite du plan (le résultat à blanc) : « Purger 12 fichiers (13,8 Mo) des sources de France, Espagne ? » puis,
 *  s'il y a lieu, la phrase des fichiers du SIA partagés et celle des fichiers suivis par git gardés. */
export function purgeAsk(out, set = 'base') {
  const names = set === 'base' ? M.orderZones(out.zones, S.d.zones).map(z => M.zoneName(S.d.zones, z, li())).join(', ') : out.zones.filter(
    z => z !== '*').map(z =>
    itemName(set, z)).join(', ') || tt(TX.setLabel[set]);
  return [tt(set === 'base' ? TX.purgeAsk : TX.purgeAskSet, {
    n: count('file', out.files),
    s: M.fmtBytes(out.bytes, lang()),
    z: names
  }), out.shared ? tt(TX.purgeShared) : '', out.kept > 0 ? plural('purgeKept', out.kept) : ''].filter(Boolean).join(' ');
}
/** Les sources à déposer à la main : leur nom (×4) en lien seulement si l'adresse est en https://, sinon le nom seul. */
function manualHtml(list, set = 'base') {
  if (!list.length) return '';
  const item = m => {
    const name = esc(m.name?.[li()] || m.name?.[0] || sourceName(m.source)),
      label = M.isHttps(m.url) ? `<a href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">${name}</a>` : `<span>${name}</span>`;
    return `<li data-manual="${esc(m.zone)}:${esc(m.source)}">${esc(itemName(set, m.zone))} : ${label}${m.pickup && m.expected ? ` <span class="f-muted">(${esc(m.expected)})</span>` : ''}</li>`;
  };
  const zones = [...new Set(list.filter(m => m.pickup).map(m => m.zone))],
    off = !zones.length || gateOf('base', zones.length, [M.PICKUP.verb]).verbs[M.PICKUP.verb].disabled ? ' disabled' : '';
  return `<p data-manual-hint>${esc(tt(TX.fetchManual))}</p><ul class="d-manual" data-manual-list>${list.map(item).join('')}</ul>
    ${set === 'base' && zones.length ? `<p><button type="button" data-verb="pickup" data-zones="${esc(zones.join(','))}"${off}>${esc(tt(TX.pickup))}</button></p>` : ''}`;
}
/** La fin d'un téléchargement : le résumé, les fichiers hors synchronisation, les sources manuelles, les lignes des zones et de leurs sources. */
function fetchResultHtml(out, set = 'base') {
  const sm = fetchSummary(out, set),
    rows = ['nothing', 'no-codes', 'no-script', 'no-base', 'not-published'].includes(out.kind) ? [] : M.zoneRows(opView(set), S.ids,
      'fetch', set !==
      'base'); // rien n'a tourné : pas de lignes « en attente »
  return `<div data-build-result data-op="fetch" data-result="${out.kind}"><p class="${sm.level === 'ok' ? '' : 'f-warn'}"><b>${esc(sm.text)}</b></p>
    ${sm.outside ? `<p class="f-warn" data-outside>${esc(sm.outside)}</p>` : ''}
    ${manualHtml(out.manual, set)}
    ${failedHtml(out, set)}
    ${rows.length ? `<ul class="d-zl">${rows.map(r => zoneLineHtml(r, 'fetch', set)).join('')}</ul>` : ''}</div>`;
}
/** Les échecs d'un téléchargement ou d'une construction des points VFR : une ligne par carte ou par problème du plan (l'OACI ou « plan », puis le motif),
 *  sept au plus, le reste sous « n autres ». */
function failedHtml(out, set) {
  if (set !== 'vfr' || !out.failed.length) return '';
  const {
    visible,
    more
  } = M.split(out.failed);
  return `<ul class="d-sl" data-failed>${visible.map(f => `<li data-failed-item="${esc(f.zone)}"><b>${esc(f.zone)}</b> : ${esc(itemWhy(f.error ?? ''))}</li>`).join('')}${more.length ? `<li>${esc(tt(TX.moreStates, { n: more.length }))}</li>` : ''}</ul>`;
}
/** La fin d'une purge (ou « Rien à purger » quand le plan est vide) : le résumé, les phrases des avertissements, les lignes des zones. */
function purgeResultHtml(r) {
  const set = r.set || 'base',
    v = opView(set),
    sm = purgeSummary(r.out, !!r.nothing),
    rows = !r.nothing && v?.zones ? M.zoneRows(v, S.ids, 'purge', set !== 'base') : [];
  return `<div data-build-result data-op="purge" data-result="${r.nothing ? 'nothing' : r.out.kind}"><p class="${sm.level === 'ok' ? '' : 'f-warn'}"><b>${esc(sm.text)}</b></p>
    ${sm.notes.map(n => `<p class="f-muted" data-line>${esc(n)}</p>`).join('')}
    ${rows.length ? `<ul class="d-zl">${rows.map(z => zoneLineHtml(z, 'purge', set)).join('')}</ul>` : ''}</div>`;
}
/** Le résumé de la fin d'une publication de fiches : { text, level } (aussi le texte de la notification) ; `none` : le plan n'avait rien à faire. */
export function sheetsSummary(out, none = false) {
  const v = {
    c: count('sheet', out.copied),
    r: count('sheet', out.removed)
  };
  if (none) return {
    text: tt(TX.sheetsNothing),
    level: 'ok'
  };
  return {
    text: tt({
      done: TX.sheetsDone,
      failed: TX.sheetsFailed,
      'no-author': TX.sheetsNoAuthor,
      'merge-pending': TX.mergePending,
      cancelled: TX.sheetsStopped,
      interrupted: TX.sheetsInterrupted
    } [out.kind], v),
    level: out.level
  };
}
/** La fin d'une publication de fiches (ou « Rien à publier » quand le plan est vide) : une phrase. */
function sheetsResultHtml(r) {
  const sm = sheetsSummary(r.out, !!r.nothing);
  return `<div data-build-result data-op="publish" data-result="${r.nothing ? 'nothing' : r.out.kind}"><p class="${sm.level === 'ok' ? '' : 'f-warn'}"><b>${esc(sm.text)}</b></p></div>`;
}
/** La fin de la dernière opération du panneau `panel` (M.panelOf) : la phrase de résumé, ce qu'il y a à faire, puis les lignes des éléments (leurs
 *  derniers états, avec le motif des échecs) ; ou la phrase d'un départ refusé. Vide si la dernière opération est celle d'un autre panneau. */
function resultHtml(panel = 'base') {
  const r = S.result;
  if (!r || M.panelOf(r.set || 'base', r.verb) !== panel) return '';
  if (r.verb === M.PICKUP.verb && !r.refused) return pickupResultHtml(r);
  if (r.refused) return `<div data-build-result data-result="refused" data-refusal="${r.refused.key}"><p class="f-warn">${esc(tt(TX.refused[r.refused.key], { n: r.refused.wait }))}</p></div>`;
  const set = r.set || 'base';
  if (panel === 'sheets') return sheetsResultHtml(r);
  if (r.verb === 'fetch') return fetchResultHtml(r.out, set);
  if (r.verb === 'purge') return purgeResultHtml(r);
  const sm = summary(r.out, set),
    v = opView(set),
    rows = v?.zones && !['no-browser', 'xplane-in-page', 'no-codes', 'no-script', 'no-pypdf', 'no-cache', 'merge-pending'].includes(r.out
      .kind) ? M.zoneRows(
      v, S.ids,
      'build', set !== 'base') : []; // rien n'a tourné : pas de lignes « en attente »
  return `<div data-build-result data-result="${r.out.kind}"><p class="${sm.level === 'ok' ? '' : 'f-warn'}"><b>${esc(sm.text)}</b></p>
    ${(sm.notes || []).map(n => `<p class="f-warn" data-line>${esc(n)}</p>`).join('')}
    ${r.out.kind === 'no-pypdf' ? `<p data-line><a href="${esc(FIRST_INSTALL)}">${esc(tt(TX.firstInstall))}</a></p>` : ''}
    ${sm.advice ? `<p class="f-muted" data-advice>${esc(tt(sm.advice))}</p>` : ''}
    ${failedHtml(r.out, set)}
    ${rows.length ? `<ul class="d-zl">${rows.map(z => zoneLineHtml(z, 'build', set)).join('')}</ul>` : ''}</div>`;
}
/** Ce que dit un panneau sous ses boutons : une autre opération du lanceur, puis la marche (si c'est son jeu qui tourne) ou la dernière fin. */
function opAreaHtml(panel) {
  const here = S.run && M.panelOf(S.run.set, S.run.verb) === panel;
  return `${S.other && !S.run ? `<p class="f-muted" data-other>${esc(tt(TX.otherRunning, { s: S.other.step || '…' }))}</p>` : ''}
    ${here ? runningHtml() : S.run ? '' : resultHtml(panel)}`;
}
/** Les États proposés aux procédures : verts et oranges de coverageByState(), dans l'ordre de leurs noms. */
export function procList() {
  return M.procItems(S.d?.byState, li());
}
/** Ce qu'un panneau a choisi : { ids (les éléments, dans l'ordre), personal (base), cycle (date d'effet, points VFR), codes et bad (appareils : les
 *  types valides et les refusés) }. Les États cochés qui ne sont plus proposés ne comptent pas. */
export function selection(set) {
  if (set === 'base') {
    const {
      ticked
    } = buildZones();
    return {
      ids: ticked,
      personal: personalPicked(ticked)
    };
  }
  if (set === 'proc') return {
    ids: procList().map(i => i.id).filter(id => S.picked.has(id))
  };
  if (set === 'vfr') {
    const cycle = S.airac ? S.airac.cycleOf(S.now).date : null;
    return {
      ids: cycle ? [cycle] : [],
      cycle
    };
  }
  const p = M.parseCodes(S.codes);
  return {
    ids: p.codes,
    codes: p.codes,
    bad: p.bad
  };
}
/** Les boutons Télécharger · Construire · Purger d'un panneau (gris pour la raison de M.setGate) ; pour la base, entre Télécharger et Construire, « Prendre le fichier téléchargé » (`pk` : l'état de
 *  son verbe base/pickup, grisé pour sa propre raison). */
function verbsHtml(gate, panel, pk) {
  const off = verb => gate.verbs[verb].disabled ? ' disabled' : '';
  return `<p class="d-verbs"><button type="button" data-verb="download"${off('fetch')}>${esc(tt(TX.download))}</button>
      ${pk ? `<button type="button" data-verb="pickup"${pk.disabled ? ' disabled' : ''}>${esc(tt(TX.pickup))}</button>
      ` : ''}<button type="button" class="primary" data-verb="build"${off('build')}>${esc(tt(TX.build))}${attnDot(S.attn?.[panel])}</button>
      <button type="button" data-verb="purge"${off('purge')}>${esc(tt(TX.purge))}</button></p>`;
}
/** Le choix d'éléments d'un panneau : les zones de la couverture à cocher puis les sources sous licence personnelle qu'elles proposent (base), les États à cocher (procédures), le cycle en
 *  vigueur (points VFR), le champ des types OACI (appareils). */
function choiceHtml(set, busy) {
  if (set === 'base') {
    const {
      ids,
      ticked
    } = buildZones(),
      pers = M.personalSources(ticked),
      xplaneOn = pers.some(p => p.id === 'xplane' && S.personal.has('xplane'));
    return `<div class="d-opts" data-build-zones>${ids.map(z => optHtml('data-build-zone', z, M.zoneName(S.d.zones, z, li()), S.ticked?.has(z), busy)).join('')}</div>
    ${pers.length ? `<h3>${esc(tt(TX.personalTitle))}</h3><div data-personal-box>${pers.map(p => `<div class="d-pers" data-personal-row="${p.id}">
      ${optHtml('data-personal', p.id, personalName(p.id), S.personal.has(p.id), busy)}
      <p class="f-muted" data-personal-line>${esc(tt(TX.personalLine[p.kind]))}</p>
      ${p.id === 'xplane' && xplaneOn ? `<p class="f-warn" data-xplane-hint>${esc(tt(TX.xplaneHint))}</p>` : ''}</div>`).join('')}</div>` : ''}`;
  }
  if (set === 'proc') {
    const list = procList();
    return list.length ? `<div class="d-opts" data-items>${list.map(i => optHtml('data-item', i.id, i.name, S.picked.has(i.id), busy)).join('')}</div>` :
      `<p class="f-muted" data-no-items>${esc(tt(TX.noStates))}</p>`;
  }
  if (set === 'vfr') return S.cycleId ? `<p data-item-cycle><b>${esc(tt(TX.cycle, { c: S.cycleId }))}</b></p>` : '';
  return `<div class="d-codes"><label>${esc(tt(TX.codesLabel))}<input type="text" data-f="codes" value="${esc(S.codes)}" autocomplete="off" autocapitalize="characters" spellcheck="false"${busy ? ' disabled' : ''}></label>
    <p class="f-muted">${esc(tt(TX.codesHint))}</p>
    ${S.codesBad.length ? `<p class="f-warn" data-codes-error>${esc(tt(TX.codesBad, { c: S.codesBad.join(', ') }))}</p>` : ''}</div>`;
}
/** Ce qui est propre à l'habillage du panneau de chaque jeu : l'attribut qui le repère (la base garde `data-build`, les autres `data-set-panel`), son titre, celui de ses éléments (la base garde ses textes
 *  d'origine : TX.buildTitle, TX.buildZones) et la ligne d'aide sous ses boutons ([attribut, texte]). */
const PANEL_UI = {
  base: {
    attr: 'data-build',
    title: TX.buildTitle,
    items: TX.buildZones
  },
  proc: {
    title: TX.setTitle.proc,
    items: TX.setItems.proc,
    hint: ['data-ead-note', TX.eadNote]
  },
  vfr: {
    title: TX.setTitle.vfr,
    items: TX.setItems.vfr
  },
  aircraft: {
    title: TX.setTitle.aircraft,
    items: TX.setItems.aircraft,
    hint: ['data-hint', TX.aircraftHint]
  }
};
/** Le jeu (ou « sheets ») d'un panneau dessiné : celui de `data-set-panel`, sinon la base (son panneau porte `data-build`). */
export const panelId = box => box.dataset.setPanel || 'base';
/** L'intérieur du panneau d'un jeu, base comprise, ou des fiches publiées : le titre, le choix (avec la carte des zones pour les jeux qui en ont une), les boutons et leur raison (une seule), la ligne d'aide,
 *  la marche ou la fin. */
function setInner(panel) {
  if (panel === 'sheets') {
    const gate = gateOf(M.SHEETS.set, undefined, [M.SHEETS.verb]),
      why = gate.reason ? tt(TX.greyReason[gate.reason]) : '';
    return `<h2>${esc(tt(TX.setTitle.sheets))}</h2>
      <p class="d-verbs"><button type="button" class="primary" data-verb="publish-sheets"${gate.verbs[M.SHEETS.verb].disabled ? ' disabled' : ''}>${esc(tt(TX.publish))}</button></p>
      ${why ? `<p class="f-muted" data-reason="${gate.reason}">${esc(why)}</p>` : ''}
      ${opAreaHtml('sheets')}`;
  }
  const spec = M.SETS[panel],
    ui = PANEL_UI[panel],
    sel = selection(panel),
    gate = gateOf(panel, spec.free ? undefined : sel.ids.length),
    why = gate.reason ? tt(TX.greyReason[gate.reason]) : '',
    pk = panel === M.PICKUP.set ? gateOf(panel, sel.ids.length, [M.PICKUP.verb]).verbs[M.PICKUP.verb] :
    null; // « Prendre le fichier téléchargé » : le verbe base/pickup, grisé pour sa propre raison
  return `<h2>${esc(tt(ui.title))}</h2>
    <h3>${esc(tt(ui.items))}</h3>
    ${spec.map ? `<div class="d-mapgrid">${zoneMapHtml(panel)}${choiceHtml(panel, frozen())}</div>` : choiceHtml(panel, frozen())}
    ${verbsHtml(gate, panel, pk)}
    ${why ? `<p class="f-muted" data-reason="${gate.reason}">${esc(why)}</p>` : ''}
    ${pk?.reason === 'unknown-verb' && gate.reason !== 'unknown-verb' ? `<p class="f-muted" data-pickup-reason>${esc(tt(TX.greyReason['unknown-verb']))}</p>` : ''}
    ${ui.hint ? `<p class="f-muted" ${ui.hint[0]}>${esc(tt(ui.hint[1]))}</p>` : ''}
    ${opAreaHtml(panel)}`;
}
/** Le panneau d'un jeu (base comprise, repérée par `data-build`) ou celui des fiches publiées (`data-set-panel`). */
function setPanelHtml(panel) {
  return `<section class="f-card" ${M.own(PANEL_UI, panel)?.attr || `data-set-panel="${panel}"`}>${setInner(panel)}</section>`;
}
/** Les panneaux d'un groupe : base (Télécharger · Construire · Purger de la base, « Publier » partagé, puis les points VFR), procédures, appareils (puis
 *  les fiches publiées) ; aucun pour la météo, publiée avec le site. */
export function panelsHtml(group) {
  if (group === 'base') return setPanelHtml('base') + publishHtml() + setPanelHtml('vfr');
  if (group === 'proc') return setPanelHtml('proc');
  if (group === 'aircraft') return setPanelHtml('aircraft') + setPanelHtml('sheets');
  return '';
}
/** Redessine un panneau seul ; ce qui avait le focus (case, champ, bouton) le garde, avec sa sélection de texte. */
function redrawPanel(box) {
  const a = box.contains(document.activeElement) ? document.activeElement : null,
    q = (attr, v) => `[${attr}="${CSS.escape(v)}"]`,
    sel = a ? a.dataset.buildZone ? q('data-build-zone', a.dataset.buildZone) :
    a.dataset.personal ? q('data-personal', a.dataset
      .personal) : a.dataset
    .item ? q('data-item', a.dataset.item) : a.dataset.f ? q('data-f', a.dataset.f) : a.dataset.verb ? q('data-verb', a.dataset.verb) : '' :
    '',
    from = a?.selectionStart ?? null,
    to = a?.selectionEnd ?? null;
  keepScroll(S.body, () => {
    box.innerHTML = box.matches('[data-update-all]') ? updateAllInner() : setInner(panelId(box));
    attachMaps(box); // la carte MapLibre survit au redessin : son hôte reprend la place de l'emplacement
    const el = sel && box.querySelector(sel);
    if (el && !el.disabled) {
      el.focus({
        preventScroll: true
      });
      if (from !== null && el.setSelectionRange) el.setSelectionRange(from, to);
    }
  });
}
/** Redessine les panneaux (une marche s'y met à jour chaque seconde) ; la case ou le bouton qui avait le focus le garde. */
export function renderBuild() {
  renderPublish(); // le bouton « Publier » suit la construction (et l'inverse) : un seul point de redessin pour tous les panneaux
  if (!S?.body || !S.d) return;
  for (const box of S.body.querySelectorAll('[data-build], [data-set-panel], [data-update-all]')) redrawPanel(box);
}
/** Ouvre le groupe d'un panneau (une marche ou un résultat s'y montre) sans attendre un toucher. */
export function openGroup(set, verb) {
  const id = M.groupOf(set, verb);
  S.manual[id] = true;
  const g = S.body?.querySelector(`details.f-group[data-group="${id}"]`);
  if (g) g.open = true;
}
/** Le motif d'un échec de prise : sa phrase pour les codes connus (rien d'utile dans le zip, zip illisible, chemin refusé), « zip de plus de 500 Mo » pour le
 *  message de taille du lanceur, sinon le texte tel que le lanceur le donne. */
function pickupWhy(error) {
  const big = /^zip over (\d+) MB$/.exec(String(error ?? ''));
  return big ? tt(TX.pickupTooLarge, {
    n: big[1]
  }) : M.own(TX.pickupError, error) ? tt(M.own(TX.pickupError, error)) : String(error ?? '');
}
/** Les phrases de ce que la prise n'a pas pu faire : un fichier au nom attendu introuvable dans Téléchargements (le motif est dit), un échec avec son motif. */
function pickupProblems(out) {
  const who = x => ({
    z: itemName('base', x.zone),
    s: sourceName(x.source)
  });
  return [...(out.blocked || []).map(t => tt(TX
    .pickupRename, { // un zip dont le nom sort de la règle du lanceur n'est pas pris : à renommer
      ...who(t),
      zip: t.zip
    })), ...out.missing.map(m => tt(TX.pickupMissing, {
    ...who(m),
    e: m.expected
  })), ...out.failed.map(f => M.REPLAN_ERRORS.includes(f.error) ? tt(TX[f.error === 'changed' ? 'pickupChanged' :
    'pickupNotShown'
  ], { // le zip pris ne serait pas celui que le plan a montré (changé, ou absent du plan) : rien n'a été pris pour cette source
    ...who(f),
    zip: f.zip || '?'
  }) : tt(TX.pickupFailedLine, {
    ...who(f),
    r: pickupWhy(f.error)
  }))];
}
/** La question du plan : pour chaque zone le zip trouvé (nom, nombre de fichiers, taille), ce qui manque ou a échoué, où vont les fichiers (sources brutes du poste,
 *  jamais commitées). */
export function pickupAsk(out) {
  const problems = pickupProblems(out),
    dest = [...new Set(out.taken.map(t => M.own(M.PICKUP_DEST, t.source)).filter(Boolean))].join(', ');
  return tt(TX.pickupAsk, {
    taken: out.taken.map(t => tt(TX.pickupTaken, {
      z: itemName('base', t.zone),
      s: sourceName(t.source),
      zip: t.zip,
      n: count('file', t.files.length),
      b: M.fmtBytes(t.bytes, lang())
    })).join(' ; '),
    missing: problems.length ? ` ${problems.join(' ; ')}.` : '',
    to: dest
  });
}
/** Le résumé de la fin d'une prise : { text, hint (« Lancez maintenant Construire » quand des fichiers ont été pris), level }. */
export function pickupSummary(out) {
  const text = tt(TX.pickupSum[out.kind], {
    n: count('file', out.files),
    s: M.fmtBytes(out.bytes, lang()),
    f: plural('fetchFails', out.failed.length)
  });
  return {
    text,
    hint: out.files > 0 ? tt(TX.pickupHint) : '',
    level: out.level
  };
}
/** La fin d'une prise (ou « Rien à prendre » quand le plan ne trouve rien) : le résumé, le conseil, puis ce qui manque ou a échoué. */
function pickupResultHtml(r) {
  const sm = pickupSummary(r.out);
  return `<div data-build-result data-op="pickup" data-result="${r.out.kind}"><p class="${sm.level === 'ok' ? '' : 'f-warn'}"><b>${esc(sm.text)}</b></p>
    ${sm.hint ? `<p class="f-muted" data-pickup-hint>${esc(sm.hint)}</p>` : ''}
    ${pickupProblems(r.out).map(t => `<p class="f-muted" data-line>${esc(t)}</p>`).join('')}
    ${replanHtml(r.out)}</div>`;
}
/** Le bouton « Relancer le plan » quand une source a été refusée parce que son zip a changé depuis le plan : il relance le plan à blanc sur les zones concernées. */
function replanHtml(out) {
  const zones = [...new Set(out.failed.filter(f => M.REPLAN_ERRORS.includes(f.error)).map(f => f.zone))];
  if (!zones.length) return '';
  const off = gateOf('base', zones.length, [M.PICKUP.verb]).verbs[M.PICKUP.verb].disabled ? ' disabled' : '';
  return `<p><button type="button" data-verb="pickup-replan" data-zones="${esc(zones.join(','))}"${off}>${esc(tt(TX.pickupReplan))}</button></p>`;
}
/** Le point d'attention du cadre (le même que celui d'un groupe) : le cycle publié est dépassé ; `title` dit pour quel cycle reconstruire. */
export function attnDot(oldCycle) {
  return oldCycle ? ` <i class="f-status-dot" data-attn title="${esc(tt(TX.staleCycle, { x: oldCycle, y: S.cycleId }))}"></i>` : '';
}
