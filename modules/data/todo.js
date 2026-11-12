// V3 data — « À faire ce mois-ci » (SOG-0262, lots B et D1) : un bloc ENCADRÉ, REPLIÉ d'origine sous son repère « À faire ce mois-ci · n », sous la carte et avant les paquets de pays ; c'est un raccourci vers les fiches, pas un tas de lignes nues. Ouvert : « Cycle AIRAC 2611 : 12 faits sur 15 », « Tout mettre à jour (n) » (le bouton du haut),
// puis une ligne par source pas faite (son nom, son régime, ses trois coches posées par l'outil seul — téléchargé · construit · publié —, avec la date ou la RAISON en mots) triée : celles qui attendent votre main, celles en retard, celles à construire, celles à publier. CHAQUE ligne porte LE geste qui la fait : une source que le lanceur prend seul ou
// calcule à partir de ses fichiers a « Mettre à jour (n pays) » / « Construire (n pays) » / « Publier… » ; une source prise à la main a « Prendre le fichier » (un fichier est vu dans Téléchargements) ou « Choisir le fichier… » ; chacune garde les boutons qui mènent à la fiche de ses pays. Les sources CALCULÉES sur ce poste (MORA, X-Plane…) ne sont jamais une ligne
// à faire : elles sont dites sous « Quand ça change » et sur la fiche d'un pays, comme un fait. Les sources faites sont repliées sous « Déjà faits (n) » ; celles que leur éditeur n'offre plus sont dites à part, ni « en retard » ni « à faire », hors du compte. Tout ce que dit le lanceur est une entrée non fiable : le modèle (model_countries.js) l'a borné, tout est échappé ici.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  busyNow,
  catSource,
  count,
  esc,
  li,
  S,
  tt
} from './state.js';
import {
  dateOf,
  downloadTick,
  nameOf,
  regimeOf,
  tickHtml,
  unavailableOf
} from './countries.js';
import {
  buildZones,
  opAreaHtml
} from './panels.js';
import {
  reasonText,
  statusKnown
} from './status.js';
import {
  startUpdate,
  updateGate,
  updateScope
} from './update.js';
import {
  startPickup
} from './follow.js';
import {
  publishGate,
  publishReason,
  startPublish
} from './publish.js';
import {
  chooseFile
} from './upload.js';
import {
  busyCardHtml
} from './busy.js';

/** La coche « téléchargé » d'une source dans la liste : celle de la fiche d'un pays (l'état du fichier, sa date, son édition), mais un fichier plus ancien que le cycle dit sa raison en dates (« en retard : fichier du 1 oct., le cycle est du 29 oct. »). */
function downloadStep(it, data) {
  const d = it.download;
  if (d.state !== 'late') return downloadTick(it.id, it, null);
  const cycle = data.inForceDate || (S.airac ? S.airac.cycleOf(S.now).date : ''),
    file = d.cycle || (d.at ? d.at.slice(0, 10) : '');
  return tickHtml('download', 'todo', file && cycle ? tt(TX.cwb.dlLateDates, {
    f: dateOf(file),
    c: dateOf(cycle)
  }) : tt(TX.cw.why['older-than-cycle']));
}
/** Les pays qu'une source nourrit, dans la couverture (tous, sans la coupe de cinq) ; une source commune à tous les pays (aucun pays en propre) : toute la couverture. */
function feedsOf(it) {
  const own = M.zonesOfItem(it, S.d.cov.ids, catSource(it.id)?.zones, 200);
  return own.length || (Array.isArray(it.zones) && it.zones.length) || (catSource(it.id)?.zones || []).length ? own : buildZones().ids;
}
/** Pourquoi les pays d'une source ne sont pas tous à jour, en mots (la raison du lanceur, jamais « non construit ») : « 3 pays : le SIA 2026-11-26 est plus récent que la construction ; Italie : jamais construite » ; l'état en mot quand le lanceur n'en donne pas la raison ; '' quand tout est à jour. */
function whyNot(zones) {
  if (!S.status || !statusKnown()) return tt(TX.zx.tdWhyUnread);
  const bad = zones.filter(z => Object.hasOwn(S.status.zones || {}, z) && S.status.zones[z].state !== 'up-to-date'),
    name = zs => zs.length > 3 ? count('zone', zs.length) : zs.map(nameOf).join(', ');
  return M.groupReasons(bad.map(z => ({
    zone: z,
    reasons: S.status.zones[z].reasons
  }))).map(g => S.status.zones[g.zones[0]].reasons.length ? tt(TX.zx.tdWhyZones, {
    z: name(g.zones),
    r: reasonText(g.reason)
  }) : tt(TX.zx.tdWhyBare, {
    z: name(g.zones),
    s: tt(TX.zst[S.status.zones[g.zones[0]].state] || TX.zst['never-built'])
  })).join(' ; ');
}
/** La coche « construit » d'une source : combien de ses pays (de la couverture) sont à jour ET, quand ils ne le sont pas tous, POURQUOI les autres ne le sont pas ; rien à dire quand aucun pays n'est construit d'après elle. */
function buildStep(it) {
  const b = it.build;
  if (b.zones <= 0) return tickHtml('build', 'na', tt(TX.cwb.buildNone));
  const all = b.upToDate >= b.zones,
    why = all ? '' : whyNot(feedsOf(it));
  return tickHtml('build', all ? 'yes' : 'todo', tt(TX.cwb.buildCount, {
    u: b.upToDate,
    n: b.zones
  }) + (why ? ` : ${why}` : ''));
}
/** La coche « publié » d'une source : combien de ses pays sont partis au dépôt des données, combien n'y sont pas ; « pas encore possible » tant qu'aucun n'est construit ; « pas lu » quand le lanceur ne sait pas (jamais « à publier » à l'aveugle). */
function publishStep(it) {
  const p = it.publish;
  return p.unpublished > 0 ? it.build.upToDate <= 0 ? tickHtml('publish', 'na', tt(TX.zx.pubWaitBuild)) : tickHtml('publish', 'todo', tt(TX
    .cwb.pubTodo, {
      u: p.unpublished
    })) : p.published > 0 ? tickHtml('publish', 'yes', tt(TX.cwb.pubSent, {
    p: p.published
  })) : p.unknown > 0 ? tickHtml('publish', 'na', tt(TX.cwb.pubUnknown)) : tickHtml('publish', 'na', tt(TX.cwb.pubNone));
}
/** Une raison de bouton gris écrite à côté de lui (jamais un bouton gris seul) ; '' quand la carte de l'opération en cours, dans ce bloc, la dit déjà. */
function greyNote(reason) {
  if (!reason || reason === 'busy' && busyCardHtml('base', 'todo')) return '';
  return ` <span class="f-muted" data-grey="${esc(reason)}">${esc(reason === 'busy' ? tt(TX.zx.greyBusy) : M.own(TX.greyReason, reason) ? tt(TX.greyReason[reason]) : M.own(TX.pubReason, reason) ? publishReason(reason) : tt(TX.greyReason.busy))}</span>`;
}
/** Le geste d'une ligne : celui qui fait CE travail. { html, n } — une source prise à la main : « Prendre le fichier » quand un fichier est vu dans Téléchargements, sinon « Choisir le fichier… » (pour son premier pays de la couverture) ; une source que le lanceur prend ou calcule : « Mettre à jour (n pays) »
 *  (en retard), « Construire (n pays) » (à construire) sur les seuls pays qui en ont besoin ; « Publier… » (à publier). Un bouton gris dit pourquoi à côté de lui ; rien à faire seul : la ligne le dit. */
function gestureHtml(it, k) {
  const reg = regimeOf(it.id, it),
    zones = feedsOf(it),
    gate = updateGate(zones),
    plan = S.status && statusKnown() ? M.downloadPlan(S.status, zones) : null,
    work = plan ? [...new Set([...plan.fetch, ...plan.build])] : zones,
    btn = (act, label, extra = '', off = false, reason = '') => `<button type="button" data-todo-act="${act}" data-source="${esc(it.id)}"${extra}${off ? ' disabled' : ''}>${esc(label)}</button>${off ? greyNote(reason) : ''}`;
  if (k === 'hand') {
    const seen = (it.hand?.inDownloads?.length || 0) > 0 || it.download.state === 'waiting';
    if (!zones.length) return '';
    const pk = gateOf1();
    return seen ? btn('pick', tt(TX.zx.tdPick), ` data-zones="${esc(zones.join(','))}"`, pk.off, pk.reason) : btn('choose', tt(TX.up.choose), ` data-zone="${esc(zones[0])}"`, busyNow() || !S.ctx
      .launcher, busyNow() ? 'busy' : 'no-launcher');
  }
  if (k === 'publish') {
    const g = publishGate();
    return btn('publish', tt(TX.zx.tdPublish), '', g.disabled, g.disabled ? g.reason : '');
  }
  if (!work.length) return '';
  return btn(k === 'build' ? 'build' : 'update', tt(k === 'build' ? TX.zx.tdBuild : TX.zx.tdUpdate, {
    z: count('country', work.length)
  }), ` data-zones="${esc(work.join(','))}"`, gate.disabled, gate.reason);
}
/** L'état du bouton de prise du fichier (le verbe base/pickup) : { off, reason }. */
function gateOf1() {
  const busy = busyNow();
  return {
    off: busy || !S.ctx.launcher || !S.known?.includes('base/pickup'),
    reason: busy ? 'busy' : !S.ctx.launcher ? 'no-launcher' : 'unknown-verb'
  };
}
/** Une ligne de la liste : le nom de la source (les quatre langues viennent du lanceur), son régime en badge, ce qu'elle est (le genre en mot), ses trois coches, LE geste qui la fait, puis les boutons qui mènent à la fiche de ses pays (cinq au plus ; à défaut un pays hors couverture : la fiche propose de l'ajouter). */
function lineHtml(it, k, data) {
  const reg = regimeOf(it.id, it),
    label = it.label[li()] || catSource(it.id)?.n?.[li()] || it.id,
    zones = M.zonesOfItem(it, S.d.cov.ids, catSource(it.id)?.zones),
    sheets = zones.length ? zones : (Array.isArray(it.zones) ? it.zones : []).filter(z => /^[a-z0-9_-]{2,12}$/.test(z)).slice(0, 2),
    act = k ? gestureHtml(it, k) : '';
  const seen = k === 'hand' && it.hand?.inDownloads?.length ? ` · ${tt(TX.d2.tdSeen, { f: String(it.hand.inDownloads[0]).slice(0, 120) })}` :
    '', // « AIP ISO.zip » trouvé dans Téléchargements : le nom vient du lanceur, borné et échappé
    sign = k ? (it.download?.state === 'failed' ? '✗' : '!') : '✓';
  return `<li class="d-todo-i" data-todo-item="${esc(it.id)}" data-todo-kind="${k || 'done'}"${sign === '✗' ? ' data-todo-fail' : ''}${reg ? ` data-regime="${reg}"` : ''}>
    <p class="d-todo-h"><b data-todo-label>${esc(label)}</b>${reg ? ` <span class="d-badge" data-regime-badge="${reg}">${esc(tt(TX.cwb.badge[reg]))}</span>` : ''}${sheets.length ? ` <span class="d-badge" data-country-badge>${esc(nameOf(sheets[0]))}</span>` : ''}</p>
    <p class="d-todo-one"><b class="d-wsign" aria-hidden="true">${sign}</b> <span class="d-kind" data-kind-word>${esc(tt(TX.cwb.kind[k || 'done']))}</span>${esc(seen)}</p>
    <ul class="d-ticks d-todo-t">${downloadStep(it, data)}${buildStep(it)}${publishStep(it)}</ul>
    ${k ? `<p class="d-todo-go" data-todo-gesture>${act}${sheets.map((z, n) => `<button type="button" class="d-link${n ? '' : ' d-stretch'}" data-act="open-country" data-zone="${esc(z)}" data-hz="${esc(z)}">${esc(tt(TX.cw.openSheet, { c: nameOf(z) }))}</button>`).join(' ')}${!act && !sheets.length ? `<span class="f-muted" data-todo-nogesture>${esc(tt(TX.zx.tdNoGesture))}</span>` : ''}</p>` : zones.length ? `<p class="d-todo-go">${zones.map((z, n) => `<button type="button" class="d-link${n ? '' : ' d-stretch'}" data-act="open-country" data-zone="${esc(z)}" data-hz="${esc(z)}">${esc(tt(TX.cw.openSheet, { c: nameOf(z) }))}</button>`).join(' ')}</p>` : ''}</li>`;
}
/** Une source que son éditeur n'offre plus : son nom, depuis quand, la note du catalogue ; ni coche, ni « en retard », hors du compte. */
function goneHtml(it) {
  const un = unavailableOf(it.id, it) || {
      since: '',
      note: ''
    },
    label = it.label[li()] || catSource(it.id)?.n?.[li()] || it.id;
  return `<li class="d-todo-i" data-todo-unavailable="${esc(it.id)}"><b>${esc(label)}</b> <span class="f-muted">${esc(tt(TX.cw.unavailable, { d: un.since || '?' }))}${un.note ? ` ${esc(un.note)}` : ''}</span></li>`;
}
/** Le geste d'une ligne du bloc : « Tout mettre à jour (n) » (le bouton du haut), « Mettre à jour » / « Construire » sur les pays de la source, « Publier… », « Prendre le fichier », « Choisir le fichier… ». */
export function todoGesture(btn) {
  const act = btn.dataset.todoAct,
    cov = new Set(S.d?.cov?.ids || []),
    zones = String(btn.dataset.zones || '').split(',').filter(z => cov.has(z)),
    zone = btn.dataset.zone;
  if (act === 'all') return startUpdate();
  if ((act === 'update' || act === 'build') && zones.length) return startUpdate(zones);
  if (act === 'publish') return startPublish();
  if (act === 'pick' && zones.length) {
    if (S.cw && btn.dataset.source)
      for (const z of zones) S.cw.hand.set(z, btn.dataset.source);
    return startPickup(zones.join(','));
  }
  if (act === 'choose' && /^[a-z0-9_-]{2,12}$/.test(zone || '') && cov.has(zone)) return chooseFile(zone, btn.dataset.source);
}
/** Le titre du cycle et sa barre d'avancement, en tête de l'écran (la maquette validée, lot D2) : « Cycle AIRAC 2611 · 10 faits sur 15 » et la barre des sources faites ; la liste du cycle n'étant pas lue (pas de lanceur, lecture en cours), le titre dit seulement le cycle en vigueur. */
export function cycleBarHtml() {
  const t = S.cw?.todo,
    r = t?.state === 'ready' ? M.todoOf(t.data, it => M.isComputed(regimeOf(it.id, it))) : null;
  if (!r || !r.total) return S.cycleId ? `<p class="d-title" data-cycle-title>${esc(tt(TX.cycle, { c: S.cycleId }))}</p>` : '';
  const title = tt(TX.cwb.todoHead, {
      c: r.cycle || '?',
      n: r.done.length,
      m: r.total
    }),
    pct = Math.max(0, Math.min(100, Math.round(r.done.length * 100 / r.total)));
  return `<p class="d-title${r.done.length === r.total ? ' d-title-ok' : ''}" data-cycle-title data-todo-head>${esc(title)}</p>
    <div class="d-cbar" role="progressbar" aria-valuemin="0" aria-valuemax="${r.total}" aria-valuenow="${r.done.length}" aria-label="${esc(title)}" data-cycle-bar><i style="width:${pct}%"></i></div>`;
}
/** Le bloc « À faire ce mois-ci » ; '' sans lanceur (ou sans le verbe base/cycle), ou quand la liste ne compte aucune source. Replié d'origine sous son repère « À faire ce mois-ci · n » ; pendant la première lecture, une ligne le dit ; une lecture qui a échoué ou refusée (opération en cours) aussi. */
export function todoHtml() {
  const t = S.cw?.todo;
  if (!t || t.state === 'none') return '';
  const open = S.cw.todoOpen ? ' open' : '',
    marker = n => `<summary data-todo-marker><span>${esc(tt(TX.zx.tdMarker, { n }))}</span><i class="d-chev" aria-hidden="true"></i></summary>`;
  if (t.state !== 'ready') return `<details class="d-todo" data-todo data-todo-state="${esc(t.state)}"${open}>${marker('…')}<h3>${esc(tt(TX.cwb.todoTitle))}</h3><p class="f-muted">${esc(tt({
    loading: TX.cwb.todoLoading,
    busy: TX.cwb.todoBusy
  }[t.state] || TX.cwb.todoUnread))}</p></details>`;
  const r = M.todoOf(t.data, it => M.isComputed(regimeOf(it.id, it)));
  if (!r.total && !r.gone.length) return '';
  const sc = updateScope(),
    gate = updateGate(),
    all = r.todo.length && (!sc.known || sc.n > 0) ? `<p class="d-verbs" data-todo-all><button type="button" class="primary" data-todo-act="all"${gate.disabled ? ' disabled' : ''}>${esc(tt(TX.zx.tdAll, { n: sc.known ? sc.n : r.todo.length }))}</button>${gate.disabled ? greyNote(gate.reason) : ''}</p>` : '';
  return `<details class="d-todo" data-todo data-todo-state="ready"${open}${t.dirty || t.reading ? ' aria-busy="true"' : ''}>${marker(r.todo.length)}<h3 class="d-sh">${esc(tt(TX.cwb.todoTitle))} (${r.todo.length}) <small>${esc(tt(TX.d2.tdHelp))}</small></h3>
    ${all}
    ${r.todo.length ? `<ul class="d-todo-l" data-todo-list>${r.todo.map(x => lineHtml(x.item, x.kind, t.data)).join('')}</ul>` : `<p class="f-ok" data-todo-all>${esc(tt(TX.cwb.todoAll))}</p>`}
    ${opAreaHtml('base', 'todo')}
    ${r.done.length ? `<details class="d-todo-done" data-todo-done${S.cw.doneOpen ? ' open' : ''}><summary data-act="todo-done">${esc(tt(TX.cwb.todoDone, { n: r.done.length }))}</summary><ul class="d-todo-l">${r.done.map(it => lineHtml(it, null, t.data)).join('')}</ul></details>` : ''}
    ${r.gone.length ? `<h4 class="f-muted" data-todo-unavailable-title>${esc(tt(TX.cw.unavailableTitle))}</h4><ul class="d-todo-l d-todo-gone" data-todo-gone>${r.gone.map(goneHtml).join('')}</ul>` : ''}</details>`;
}
/** La mise en page de « À faire ce mois-ci » (à côté de CW_STYLE) : un bloc encadré, replié sous son repère de la hauteur d'un doigt ; une ligne par source, les coches l'une sous l'autre au téléphone et côte à côte en large ; chaque bouton a la taille d'un doigt. */
export const TODO_STYLE = `
[data-module="data"] details.d-todo{border:1px solid var(--sog-border);background:var(--sog-surface);padding:0 12px;min-width:0;margin:10px 0 0}
[data-module="data"] details.d-todo>summary{min-height:var(--sog-touch);display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;font-weight:600;text-align:left}
[data-module="data"] details.d-todo>summary>span{flex:1;min-width:0}
[data-module="data"] details.d-todo[open]>summary{border-bottom:1px solid var(--sog-border);margin-bottom:4px}
[data-module="data"] details.d-todo[open]>summary .d-chev{transform:rotate(180deg)}
[data-module="data"] .d-todo h3{margin:8px 0 4px}
[data-module="data"] .d-todo .d-sh{margin:8px 0 8px}
[data-module="data"] .d-todo p{margin:4px 0}
[data-module="data"] [data-todo-all]{display:none}
[data-module="data"] .d-todo-l{list-style:none;margin:0 0 10px;padding:0;display:grid;gap:6px;border:0}
[data-module="data"] .d-todo-i{position:relative;min-width:0;padding:8px 36px 8px 12px;border:1px solid var(--sog-border);border-left:5px solid var(--sog-warn);background:var(--sog-surface);overflow-wrap:anywhere}
[data-module="data"] .d-todo-i[data-todo-kind=done]{border-left-color:var(--sog-ok)}
[data-module="data"] .d-todo-i[data-todo-fail]{border-left-color:var(--sog-err)}
[data-module="data"] .d-todo-i[data-todo-unavailable]{border-left-color:var(--sog-muted)}
[data-module="data"] .d-todo-i::after{content:"\\203A";position:absolute;right:14px;top:50%;margin-top:-14px;font-size:1.4rem;line-height:1;color:var(--sog-muted);pointer-events:none}
[data-module="data"] .d-todo-h{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;margin:0}
[data-module="data"] .d-badge{padding:3px 6px;border:1px solid var(--sog-border);border-radius:var(--sog-radius-s);background:var(--d-soft);color:var(--sog-muted);font-size:.78em;line-height:1;white-space:nowrap}
[data-module="data"] .d-todo-one{margin:2px 0;font-size:.93em}
[data-module="data"] .d-wsign{color:var(--sog-warn)}
[data-module="data"] .d-todo-i[data-todo-fail] .d-wsign{color:var(--sog-err)}
[data-module="data"] .d-todo-i[data-todo-kind=done] .d-wsign{color:var(--sog-ok)}
[data-module="data"] .d-kind{font-size:1em;color:var(--sog-warn);font-weight:600}
[data-module="data"] .d-todo-i[data-todo-kind=done] .d-kind{color:var(--sog-ok)}
[data-module="data"] .d-todo-t{display:flex;flex-wrap:wrap;gap:0 14px;margin:2px 0;font-size:.8em;color:var(--sog-muted)}
[data-module="data"] .d-todo-t li{font-size:0}
[data-module="data"] .d-todo-t li>*{font-size:.8rem}
[data-module="data"] .d-todo-t li{display:inline-flex;align-items:baseline;gap:3px}
[data-module="data"] .d-todo-t .d-tkw,[data-module="data"] .d-todo-t [data-tick-text]{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
[data-module="data"] .d-todo-t b{font-weight:400}
[data-module="data"] .d-todo-go{display:flex;flex-wrap:wrap;align-items:center;gap:0 8px;margin:2px 0 0}
[data-module="data"] .d-todo-go button,[data-module="data"] [data-todo-all] button{min-height:var(--sog-touch);position:relative;z-index:1}
[data-module="data"] .d-todo-go .d-link{margin-left:0;font-size:.85em}
[data-module="data"] .d-todo-go .d-stretch{position:static;z-index:auto}
[data-module="data"] .d-todo-go .d-stretch::after{content:"";position:absolute;inset:0;z-index:0}
[data-module="data"] .d-todo-done summary{min-height:var(--sog-touch);display:flex;align-items:center;cursor:pointer;font-weight:600}
`;
