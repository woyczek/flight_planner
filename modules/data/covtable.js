// V3 data — le tableau de couverture par pays (SOG-0174, V3_SPECIFICATION § 10.44) : un bloc replié, lu à l'ouverture seulement du lanceur (base/coverage : une ligne par zone, ce que sa base PORTE, jamais deviné). Sept colonnes au plus à l'écran (le pays,
// points, voies, espaces, FIR, procédures, sol : un nombre, ou « non »), triable ; le reste (source et licence, cycle, analyseur, comptes de terrains et de balises) est au détail de la ligne. Lecture seule : rien n'est écrit, aucun travail d'écriture n'est lancé.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  keepScroll
} from '../../frame/lib/dom.js';
import {
  busyNow,
  catSource,
  esc,
  lang,
  li,
  ROUTE,
  S,
  tt
} from './state.js';

/** Le nom d'une zone dans la langue (celui de la liste de la couverture, à défaut l'identifiant). */
const zoneName = z => (S.d?.zones ? M.zoneName(S.d.zones, z, li()) : '') || z;
/** Le nombre d'une cellule dans la langue, « non » pour 0. */
const cell = n => n > 0 ? n.toLocaleString(lang()) : tt(TX.cov.no);
/** Pourquoi le bloc ne peut pas lire : '' (il peut), ou la raison dite. */
function gate() {
  if (!S?.ctx?.launcher) return 'noLauncher';
  if (!S.known?.includes('base/coverage')) return 'unknownVerb';
  return '';
}
/** Le nom d'une source (celui du catalogue dans la langue, à défaut l'identifiant en majuscules) et ce que le catalogue dit de sa licence : « Licence · Éditeur · Crédit » ; textes seulement. */
function sourceLine(id) {
  const c = catSource(id),
    name = c?.n?.[li()] || id.toUpperCase(),
    lic = c?.lic?.[li()] || c?.lic?.[0] || '',
    pub = c?.pub?.[li()] || c?.pub?.[0] || '',
    credit = typeof c?.credit === 'string' ? c.credit : '';
  return `<li data-cov-source="${esc(id)}"><b>${esc(name)}</b>${[lic, pub, credit].filter(Boolean).length ? ` <span class="f-muted">${esc([lic, pub, credit].filter(Boolean).join(' · '))}</span>` : ''}</li>`;
}
/** Le détail d'une ligne dépliée : le cycle et l'analyseur, ce que la zone compte en plus (terrains, balises, points VFR), les sources lues avec leur licence, celles déclarées pas encore lues. */
function detailHtml(r) {
  const T = TX.cov,
    notYet = r.declared.filter(id => !r.present.includes(id) && id !== 'xplane' && id !== 'mora');
  return `<tr data-cov-detail="${esc(r.zone)}"><td colspan="7"><dl class="d-covdl">
    <dt>${esc(tt(T.cycle))}</dt><dd>${esc(r.cycle || '—')}${r.parser !== null ? ` · ${esc(tt(T.parser, { n: String(r.parser) }))}` : ''}</dd>
    <dt>${esc(tt(T.also))}</dt><dd>${esc(tt(T.alsoLine, { a: r.counts.aerodromes.toLocaleString(lang()), n: r.counts.navaids.toLocaleString(lang()), v: r.counts.vrp.toLocaleString(lang()) }))}</dd>
    <dt>${esc(tt(T.sources))}</dt><dd>${r.present.length ? `<ul class="d-covsrc">${r.present.map(sourceLine).join('')}</ul>` : `<span class="f-muted">${esc(tt(T.noSource))}</span>`}</dd>
    ${notYet.length ? `<dt>${esc(tt(T.notYet))}</dt><dd class="f-muted" data-cov-notyet>${esc(notYet.map(id => catSource(id)?.n?.[li()] || id.toUpperCase()).join(', '))}</dd>` : ''}</dl></td></tr>`;
}
/** Le tableau : l'en-tête (le pays et six colonnes, chacune un bouton de tri avec aria-sort) puis une ligne par pays ; un pays se déplie à son nom. */
function tableHtml(c) {
  const T = TX.cov,
    sort = c.sort,
    rows = M.sortCoverage(c.rows, sort.key, sort.dir, zoneName),
    head = (key, label) => `<th scope="col" aria-sort="${sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}"><button type="button" data-cov-sort="${key}">${esc(tt(label))}</button></th>`;
  return `<div class="d-covscroll"><table class="d-covtab" data-cov-table><thead><tr>${head('zone', T.country)}${M.COV_COLS.map(k => head(k, T.col[k])).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr data-cov-zone="${esc(r.zone)}"><th scope="row"><button type="button" data-cov-row="${esc(r.zone)}" aria-expanded="${c.openRows.has(r.zone)}">${esc(zoneName(r.zone))}</button></th>${M.COV_COLS.map(k => `<td data-col="${k}" data-n="${M.covValue(r, k)}">${esc(cell(M.covValue(r, k)))}</td>`).join('')}</tr>${c.openRows.has(r.zone) ? detailHtml(r) : ''}`).join('')}</tbody></table></div>`;
}
/** Le bloc replié « Couverture par pays » : fermé au départ (aucune lecture tant qu'on ne l'ouvre pas). Sans lanceur, ou avec un lanceur qui ne connaît pas le verbe, il le dit ; il n'existe pas sans écran de la base. */
export function covTableHtml() {
  const c = S.cov,
    why = gate();
  return `<details class="d-covtable" data-covtable${c?.open ? ' open' : ''}><summary>${esc(tt(TX.cov.title))}</summary>
    <p class="f-muted">${esc(tt(TX.cov.intro))}</p>
    ${why ? `<p class="f-muted" data-cov-state="${why}">${esc(tt(TX.cov[why]))}</p>` : ''}
    ${!why && c?.state === 'loading' ? `<p class="f-muted" data-cov-state="loading">${esc(tt(TX.cov.loading))}</p>` : ''}
    ${!why && (c?.state === 'busy' || c?.state === 'unread') ? `<p class="f-warn" data-cov-state="${c.state}">${esc(tt(TX.cov[c.state]))}</p><p><button type="button" data-cov-reload>${esc(tt(TX.cov.reload))}</button></p>` : ''}
    ${!why && c?.rows ? tableHtml(c) : ''}</details>`;
}
/** Redessine le seul bloc, sans toucher aux autres ni au défilement. */
function redraw() {
  const el = S?.body?.querySelector('[data-covtable]');
  if (el && S.d) keepScroll(S.body, () => el.outerHTML = covTableHtml());
}
/** Lit le tableau (base/coverage) : une seule fois à l'ouverture, redemandé par « Relire » ; refusé tant qu'un autre travail tourne (le lanceur n'en tient qu'un) : « occupé », jamais d'attente cachée ; une réponse illisible : « unread », rien n'est inventé. */
export async function openCovTable(again = false) {
  const L = S?.ctx?.launcher;
  if (!L || gate() || (S.cov && !again)) return;
  const me = S;
  S.cov = {
    open: true,
    state: 'loading',
    rows: null,
    sort: S.cov?.sort || {
      key: 'zone',
      dir: 'asc'
    },
    openRows: S.cov?.openRows || new Set()
  };
  redraw();
  if (busyNow()) {
    S.cov.state = 'busy';
    return redraw();
  }
  let final = null;
  try {
    final = await L.job(ROUTE, {
      set: 'base',
      verb: 'coverage',
      args: {}
    }, {
      onProgress: () => {},
      signal: new AbortController().signal
    });
  } catch {
    final = null;
  }
  if (S !== me || !S.cov) return;
  const rows = M.coverageOf(final);
  S.cov.rows = rows;
  S.cov.state = rows ? 'ready' : final?.status === 409 ? 'busy' : 'unread';
  redraw();
}
/** Un geste du tableau : le tri d'une colonne (le même bouton inverse le sens ; le pays monte, les nombres descendent d'abord), le dépli d'un pays, « Relire ». */
export function covClick(e) {
  const sortBtn = e.target.closest?.('[data-cov-sort]'),
    rowBtn = e.target.closest?.('[data-cov-row]');
  if (e.target.closest?.('[data-cov-reload]')) return openCovTable(true);
  if (!S.cov) return;
  if (sortBtn) {
    const key = sortBtn.dataset.covSort,
      cur = S.cov.sort;
    S.cov.sort = key === cur.key ? {
      key,
      dir: cur.dir === 'asc' ? 'desc' : 'asc'
    } : {
      key,
      dir: key === 'zone' ? 'asc' : 'desc'
    };
    return redraw();
  }
  if (rowBtn) {
    const z = rowBtn.dataset.covRow;
    if (S.cov.openRows.has(z)) S.cov.openRows.delete(z);
    else S.cov.openRows.add(z);
    redraw();
  }
}
/** Le bloc se ferme : la prochaine ouverture relit. */
export function closeCovTable() {
  if (S) S.cov = null;
}
