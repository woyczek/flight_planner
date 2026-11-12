// V3 data — « Ce qui reste à faire ce mois-ci » (SOG-0262, lot B) : sous la carte, avant les paquets de pays, la liste du cycle en vigueur (base/cycle, lue par countries.js : une fois à l'ouverture de l'écran, puis après chaque opération). L'en-tête compte « Cycle AIRAC 2611 : 12 faits sur 15 » ;
// chaque source pas faite a UNE ligne (son nom, son régime, ses trois coches posées par l'outil seul — téléchargé · construit · publié —, avec la date ou la raison en mots) triée : celles qui attendent votre main, celles en retard, celles à construire, celles à publier ; une ligne mène à la fiche de son pays (un bouton).
// Les sources faites sont repliées sous « Déjà faits (n) » ; celles que leur éditeur n'offre plus sont dites à part, ni « en retard » ni « à faire », hors du compte. Tout ce que dit le lanceur est une entrée non fiable : le modèle (model_countries.js) l'a borné, tout est échappé ici.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  catSource,
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

/** La coche « téléchargé » d'une source dans la liste : celle de la fiche d'un pays (l'état du fichier, sa date, son édition), mais un fichier plus ancien que le cycle dit sa raison en dates (« en retard : fichier du 1 oct., le cycle est du 29 oct. »). */
function downloadStep(it, data) {
  const d = it.download;
  if (d.state !== 'late') return downloadTick(it.id, it, null);
  const cycle = data.inForceDate || (S.airac ? S.airac.cycleOf(S.now).date : ''),
    file = d.cycle || (d.at ? d.at.slice(0, 10) : '');
  return tickHtml('download', 'no', file && cycle ? tt(TX.cwb.dlLateDates, {
    f: dateOf(file),
    c: dateOf(cycle)
  }) : tt(TX.cw.why['older-than-cycle']));
}
/** La coche « construit » d'une source : combien de ses pays (de la couverture) sont à jour ; rien à dire quand aucun pays n'est construit d'après elle. */
function buildStep(it) {
  const b = it.build;
  return b.zones <= 0 ? tickHtml('build', 'na', tt(TX.cwb.buildNone)) : tickHtml('build', b.upToDate >= b.zones ? 'yes' : 'no', tt(TX.cwb
    .buildCount, {
      u: b.upToDate,
      n: b.zones
    }));
}
/** La coche « publié » d'une source : combien de ses pays sont partis au dépôt des données, combien n'y sont pas ; « pas lu » quand le lanceur ne sait pas (jamais « à publier » à l'aveugle). */
function publishStep(it) {
  const p = it.publish;
  return p.unpublished > 0 ? tickHtml('publish', 'no', tt(TX.cwb.pubTodo, {
    u: p.unpublished
  })) : p.published > 0 ? tickHtml('publish', 'yes', tt(TX.cwb.pubSent, {
    p: p.published
  })) : p.unknown > 0 ? tickHtml('publish', 'na', tt(TX.cwb.pubUnknown)) : tickHtml('publish', 'na', tt(TX.cwb.pubNone));
}
/** Une ligne de la liste : le nom de la source (les quatre langues viennent du lanceur), son régime en badge, ce qu'elle est (le genre en mot), ses trois coches, puis les boutons qui mènent à la fiche de ses pays (cinq au plus, dans la couverture). */
function lineHtml(it, k, data) {
  const reg = regimeOf(it.id, it),
    label = it.label[li()] || catSource(it.id)?.n?.[li()] || it.id,
    zones = M.zonesOfItem(it, S.d.cov.ids, catSource(it.id)?.zones);
  return `<li class="d-todo-i" data-todo-item="${esc(it.id)}" data-todo-kind="${k || 'done'}"${reg ? ` data-regime="${reg}"` : ''}>
    <p class="d-todo-h"><b data-todo-label>${esc(label)}</b>${reg ? ` <span class="d-badge" data-regime-badge="${reg}">${esc(tt(TX.cwb.badge[reg]))}</span>` : ''} <span class="d-kind" data-kind-word>${esc(tt(TX.cwb.kind[k || 'done']))}</span></p>
    <ul class="d-ticks d-todo-t">${downloadStep(it, data)}${buildStep(it)}${publishStep(it)}</ul>
    ${zones.length ? `<p class="d-todo-go">${zones.map(z => `<button type="button" class="d-link" data-act="open-country" data-zone="${esc(z)}" data-hz="${esc(z)}">${esc(tt(TX.cw.openSheet, { c: nameOf(z) }))}</button>`).join(' ')}</p>` : ''}</li>`;
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
/** Le bloc « Ce qui reste à faire ce mois-ci » ; '' sans lanceur (ou sans le verbe base/cycle), ou quand la liste ne compte aucune source. Pendant la première lecture, une ligne le dit ; une lecture qui a échoué ou refusée (opération en cours) aussi. */
export function todoHtml() {
  const t = S.cw?.todo;
  if (!t || t.state === 'none') return '';
  const head = `<h3>${esc(tt(TX.cwb.todoTitle))}</h3>`;
  if (t.state !== 'ready') return `<section class="d-todo" data-todo data-todo-state="${esc(t.state)}">${head}<p class="f-muted">${esc(tt({
    loading: TX.cwb.todoLoading,
    busy: TX.cwb.todoBusy
  }[t.state] || TX.cwb.todoUnread))}</p></section>`;
  const r = M.todoOf(t.data);
  if (!r.total && !r.gone.length) return '';
  return `<section class="d-todo" data-todo data-todo-state="ready"${t.dirty || t.reading ? ' aria-busy="true"' : ''}>${head}
    <p data-todo-head>${esc(tt(TX.cwb.todoHead, { c: r.cycle || '?', n: r.done.length, m: r.total }))}</p>
    ${r.todo.length ? `<ul class="d-todo-l" data-todo-list>${r.todo.map(x => lineHtml(x.item, x.kind, t.data)).join('')}</ul>` : `<p class="f-ok" data-todo-all>${esc(tt(TX.cwb.todoAll))}</p>`}
    ${r.done.length ? `<details class="d-todo-done" data-todo-done${S.cw.doneOpen ? ' open' : ''}><summary data-act="todo-done">${esc(tt(TX.cwb.todoDone, { n: r.done.length }))}</summary><ul class="d-todo-l">${r.done.map(it => lineHtml(it, null, t.data)).join('')}</ul></details>` : ''}
    ${r.gone.length ? `<h4 class="f-muted" data-todo-unavailable-title>${esc(tt(TX.cw.unavailableTitle))}</h4><ul class="d-todo-l d-todo-gone" data-todo-gone>${r.gone.map(goneHtml).join('')}</ul>` : ''}</section>`;
}
/** La mise en page de « ce qui reste à faire » (à côté de CW_STYLE) : une ligne par source, les coches l'une sous l'autre au téléphone et côte à côte en large ; chaque bouton de fiche a la taille d'un doigt. */
export const TODO_STYLE = `
[data-module="data"] .d-todo h3{margin:8px 0 4px}
[data-module="data"] .d-todo p{margin:4px 0}
[data-module="data"] .d-todo-l{list-style:none;margin:0;padding:0;display:grid;gap:0;border-top:1px solid var(--sog-line,var(--sog-border))}
[data-module="data"] .d-todo-i{padding:6px 4px;border-bottom:1px solid var(--sog-line,var(--sog-border));min-width:0;overflow-wrap:anywhere}
[data-module="data"] .d-todo-h{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px}
[data-module="data"] .d-badge{font-size:var(--sog-size-s);padding:0 6px;border:1px solid var(--sog-border);white-space:nowrap}
[data-module="data"] .d-kind{font-size:var(--sog-size-s);color:var(--sog-muted)}
[data-module="data"] .d-todo-i[data-todo-kind=hand] .d-kind,[data-module="data"] .d-todo-i[data-todo-kind=late] .d-kind{color:var(--sog-warn)}
[data-module="data"] .d-todo-go{display:flex;flex-wrap:wrap;gap:0 8px}
[data-module="data"] .d-todo-go button{min-height:var(--sog-touch)}
[data-module="data"] .d-todo-done summary{min-height:var(--sog-touch);display:flex;align-items:center;cursor:pointer}
@media (min-width:900px){
[data-module="data"] .d-todo-t{grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 12px}
}
`;
