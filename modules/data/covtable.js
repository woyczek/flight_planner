// V3 data — le tableau de couverture par pays (SOG-0174, V3_SPECIFICATION § 10.44) : un bloc replié, lu à l'ouverture seulement du lanceur (base/coverage : une ligne par zone, ce que sa base PORTE, jamais deviné). Sept colonnes au plus à l'écran (le pays,
// points, voies, espaces, FIR, procédures, sol : un nombre, ou « non »), triable par le bloc commun des listes triables (frame/lib/sortlist.js, SOG-0498 : en-têtes de 44 px, « Trier » au téléphone, ordre gardé sur l'appareil dans cache/sort/coverage.json,
// « Remettre l'ordre ») ; le reste (source et licence, cycle, analyseur, comptes de terrains et de balises) est au détail de la ligne. Lecture seule : rien n'est écrit (sauf l'ordre choisi), aucun travail d'écriture n'est lancé.
// Le bloc ne dessine pas les lignes : le tableau garde les siennes (une <tr> par pays à l'écran large, un <li> par pays au téléphone, le même détail dans les deux).
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  keepScroll
} from '../../frame/lib/dom.js';
import {
  barHtml,
  bind,
  defaultState,
  headHtml,
  loadState,
  refresh,
  saveState,
  sortRows
} from '../../frame/lib/sortlist.js';
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
/** Les colonnes triables : le pays (texte : son nom dans la langue) puis les six nombres de COV_COLS ; un compte de 0 (« non ») est une valeur connue : il se trie comme le nombre 0 (le vide « toujours en dernier » du bloc vaut pour l'inconnu, qu'un compte n'a pas). */
const COLS = [{
  key: 'zone',
  label: TX.cov.country,
  type: 'text',
  get: r => zoneName(r.zone)
}, ...M.COV_COLS.map(k => ({
  key: k,
  label: TX.cov.col[k],
  type: 'number',
  align: 'num',
  emptyLast: true,
  get: r => M.covValue(r, k)
}))];
/** L'ordre par défaut : le pays, croissant. */
const DFLT = defaultState(COLS, {
  key: 'zone',
  dir: 'asc'
});
/** Le tri en cours : celui de l'écran (lu de l'appareil, puis changé par un geste), à défaut l'ordre par défaut. */
const sortNow = () => S?.covSort || DFLT;
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
/** Le contenu du détail d'un pays déplié (le même dans le tableau et dans la liste) : le cycle et l'analyseur, ce que la zone compte en plus (terrains, balises, points VFR), les sources lues avec leur licence, celles déclarées pas encore lues. */
function detailBody(r) {
  const T = TX.cov,
    notYet = r.declared.filter(id => !r.present.includes(id) && id !== 'xplane' && id !== 'mora');
  return `<dl class="d-covdl">
    <dt>${esc(tt(T.cycle))}</dt><dd>${esc(r.cycle || '—')}${r.parser !== null ? ` · ${esc(tt(T.parser, { n: String(r.parser) }))}` : ''}</dd>
    <dt>${esc(tt(T.also))}</dt><dd>${esc(tt(T.alsoLine, { a: r.counts.aerodromes.toLocaleString(lang()), n: r.counts.navaids.toLocaleString(lang()), v: r.counts.vrp.toLocaleString(lang()) }))}</dd>
    <dt>${esc(tt(T.sources))}</dt><dd>${r.present.length ? `<ul class="d-covsrc">${r.present.map(sourceLine).join('')}</ul>` : `<span class="f-muted">${esc(tt(T.noSource))}</span>`}</dd>
    ${notYet.length ? `<dt>${esc(tt(T.notYet))}</dt><dd class="f-muted" data-cov-notyet>${esc(notYet.map(id => catSource(id)?.n?.[li()] || id.toUpperCase()).join(', '))}</dd>` : ''}</dl>`;
}
/** Les lignes du tableau et de la liste, dans l'ordre trié : { table } les <tr> des pays (le détail d'un pays déplié en <tr> dessous), { list } les <li> du téléphone (le nom, les six nombres, le même détail dessous). */
function rowsHtml(c) {
  const T = TX.cov,
    rows = sortRows(c.rows, COLS, sortNow(), lang()),
    isOpen = z => c.openRows.has(z);
  return {
    table: rows.map(r => `<tr data-cov-zone="${esc(r.zone)}"><th scope="row"><button type="button" data-cov-row="${esc(r.zone)}" aria-expanded="${isOpen(r.zone)}">${esc(zoneName(r.zone))}</button></th>${M.COV_COLS.map(k => `<td data-col="${k}" data-n="${M.covValue(r, k)}">${esc(cell(M.covValue(r, k)))}</td>`).join('')}</tr>${isOpen(r.zone) ? `<tr data-cov-detail="${esc(r.zone)}"><td colspan="7">${detailBody(r)}</td></tr>` : ''}`).join(''),
    list: rows.map(r => `<li data-cov-item="${esc(r.zone)}"><button type="button" data-cov-row="${esc(r.zone)}" aria-expanded="${isOpen(r.zone)}">${esc(zoneName(r.zone))}</button><dl class="d-covnums">${M.COV_COLS.map(k => `<div><dt>${esc(tt(T.col[k]))}</dt><dd data-col="${k}" data-n="${M.covValue(r, k)}">${esc(cell(M.covValue(r, k)))}</dd></div>`).join('')}</dl>${isOpen(r.zone) ? `<div data-cov-detail="${esc(r.zone)}">${detailBody(r)}</div>` : ''}</li>`).join('')
  };
}
/** Le tableau : la barre du bloc commun (« Trier », « Remettre l'ordre »), le tableau large (l'en-tête du bloc, une ligne par pays ; un pays se déplie à son nom) et la liste du téléphone (le bloc cache l'un ou l'autre selon la largeur du conteneur). */
function tableHtml(c) {
  const r = rowsHtml(c),
    s = sortNow(),
    opts = {
      lang: lang(),
      id: 'coverage',
      dflt: DFLT
    };
  return `${barHtml(COLS, s, opts)}<div class="d-covscroll f-sortwide"><table class="d-covtab" data-cov-table><thead>${headHtml(COLS, s, { lang: lang() })}</thead>
    <tbody data-cov-tbody>${r.table}</tbody></table></div><ul class="d-covlist f-sortnarrow" data-cov-list>${r.list}</ul>`;
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
/** Redessine les seules lignes (le tableau et la liste) : après un changement de tri ou le dépli d'un pays ; l'en-tête, la barre et son panneau restent en place. */
function redrawRows() {
  const c = S?.cov,
    root = S?.body?.querySelector('[data-covtable]'),
    tb = root?.querySelector('[data-cov-tbody]'),
    ls = root?.querySelector('[data-cov-list]');
  if (!c?.rows || !tb || !ls) return;
  const r = rowsHtml(c);
  keepScroll(S.body, () => {
    if (tb.innerHTML !== r.table) tb.innerHTML = r.table;
    if (ls.innerHTML !== r.list) ls.innerHTML = r.list;
  });
}
/** Lit l'ordre gardé sur l'appareil (cache/sort/coverage.json, lu comme une entrée non fiable par le bloc) : une fois par écran, au montage ; un geste déjà fait avant la fin de la lecture l'emporte. */
export function initCovSort() {
  const me = S;
  S.covSortP = loadState(S.ctx, 'coverage', COLS, DFLT).then(s => {
    if (S === me && !S.covSort) S.covSort = s;
  });
}
/** Les gestes du tri (en-têtes, « Trier » et son panneau, « Remettre l'ordre ») : le bloc commun, posé une fois sur le corps de l'écran (les redessins du bloc de couverture, ou de tout l'écran, ne le défont pas) ; un changement est gardé et seules les lignes sont redessinées. */
export function bindCovSort() {
  S.covUnbind = bind(S.body, {
    cols: COLS,
    dflt: DFLT,
    getState: sortNow,
    setState: s => {
      S.covSort = s;
      saveState(S.ctx, 'coverage', s);
    },
    onChange: s => {
      const el = S?.body?.querySelector('[data-covtable]');
      if (!el) return;
      refresh(el, COLS, s, {
        lang: lang(),
        dflt: DFLT
      });
      redrawRows();
    }
  });
}
/** Retire les gestes du tri (au démontage de l'écran). */
export function unbindCovSort() {
  if (S?.covUnbind) S.covUnbind();
  if (S) S.covUnbind = null;
}
/** Lit le tableau (base/coverage) : une seule fois à l'ouverture, redemandé par « Relire » ; refusé tant qu'un autre travail tourne (le lanceur n'en tient qu'un) : « occupé », jamais d'attente cachée ; une réponse illisible : « unread », rien n'est inventé. */
export async function openCovTable(again = false) {
  const L = S?.ctx?.launcher,
    me = S;
  if (S?.covSortP) await S
    .covSortP; // l'ordre gardé est lu avant le premier dessin (déjà lu en pratique : le bloc ne s'ouvre qu'après le montage)
  if (S !== me || !L || gate() || (S.cov && !again)) return;
  if (!again && S.cw?.procP) {
    S.cov = { // la carte du monde lit base/coverage à cet instant (la hachure des procédures) : le tableau attend sa lecture au lieu d'en lancer une seconde
      open: true,
      state: 'loading',
      rows: null,
      openRows: new Set()
    };
    redraw();
    await S.cw.procP;
    if (S !== me || !S.cov) return;
  }
  const pre = !again && S.cw?.procRows;
  if (pre) {
    S.cw.procRows = null;
    S.cov = {
      open: true,
      state: 'ready',
      rows: pre,
      openRows: new Set()
    };
    return redraw();
  }
  S.cov = {
    open: true,
    state: 'loading',
    rows: null,
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
/** Un geste du tableau : le dépli d'un pays (dans le tableau comme dans la liste), « Relire ». Le tri est le bloc commun (bindCovSort). */
export function covClick(e) {
  const rowBtn = e.target.closest?.('[data-cov-row]');
  if (e.target.closest?.('[data-cov-reload]')) return openCovTable(true);
  if (!S.cov) return;
  if (rowBtn) {
    const z = rowBtn.dataset.covRow;
    if (S.cov.openRows.has(z)) S.cov.openRows.delete(z);
    else S.cov.openRows.add(z);
    redrawRows();
  }
}
/** Le bloc se ferme : la prochaine ouverture relit (l'ordre choisi, lui, reste à l'écran). */
export function closeCovTable() {
  if (S) S.cov = null;
}
