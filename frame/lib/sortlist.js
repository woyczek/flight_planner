// V3 frame/lib (propriétaire : cadre ; tout tableau ou liste triable de la suite s'en sert) — LE bloc commun des listes triables (SOG-0498 ; décisions de l'utilisateur du 18 nov., Q-0115 / Q-0116 ;
// maquette frame/help/maquette/tri_registre.html) : un vrai tableau triable à l'écran large (un bouton par colonne, aria-sort), la liste et un seul bouton « Trier » au téléphone, l'ordre gardé sur
// l'appareil avec « Remettre l'ordre ». Pur à l'import : ni page, ni stockage, ni réseau ; le bloc ne dessine JAMAIS les lignes (le module garde les siennes) et ne redessine rien de lui-même.
// Les états gardés sont des entrées non fiables (frame/lib/untrusted.js). Contrat : frame/INTEGRATION.md § 12d.
//
// API :
//   colonne : { key, label: [fr, en, de, es], type: 'text' | 'number' | 'date' | 'duration', get(row) → valeur, first?: 'asc' | 'desc', emptyLast?: true, align?: 'num' }
//     first : texte croissant, nombre / date / durée décroissants ; vide : null, undefined, '', NaN, un texte de blancs, une valeur illisible pour le type.
//   sortRows(rows, cols, state, lang)  → un NOUVEAU tableau trié (jamais modifié) ; le vide TOUJOURS en dernier ; égalité : la première colonne (son premier sens), puis l'ordre d'origine.
//   nextSort(state, key, cols)         → la même colonne inverse ; une autre commence dans son premier sens ; une clé inconnue garde l'état.
//   defaultState(cols, { key, dir })   → l'état par défaut d'une liste (clé inconnue : la première colonne ; sens inconnu : le premier de la colonne).
//   stateOf(stored, cols, dflt)        → { key, dir } lu d'un état gardé (non fiable), sinon dflt (defaultState(cols) sans dflt).
//   headHtml(cols, state, { lang, actions }) → la <tr> d'en-tête (une <th scope="col" aria-sort data-col> et un bouton .f-sortbtn data-sort par colonne ; actions : une <th> de plus pour les gestes d'une ligne).
//   barHtml(cols, state, { lang, id, dflt, open }) → la barre : « Trier : <colonne> ▲|▼ » (téléphone) et son panneau caché, « Remettre l'ordre » (montré hors de l'ordre par défaut, aux deux largeurs).
//   refresh(root, cols, state, { lang, dflt }) → l'en-tête et la barre de root suivent l'état EN PLACE (écrit seulement ce qui change) : le module ne redessine que ses lignes.
//   bind(root, { cols, getState, setState, onChange, dflt }) → les gestes délégués (en-têtes, panneau, sens, « Remettre l'ordre », ouverture) : setState(next) puis onChange(next, { open }) ; rend unbind().
//   loadState(ctx, id, cols, dflt) / saveState(ctx, id, state) → l'état gardé par ctx.data (politique 'cache', cache/sort/<id>.json, id ^[a-z][a-z0-9-]{0,40}$) ; écrit seulement s'il change.
//   TEXTS : les textes du bloc, quatre langues.
import {
  own,
  plain
} from './untrusted.js';

/** Les textes du bloc (fr, en, de, es) ; la langue vient de l'appel. */
export const TEXTS = Object.freeze({
  sort: ['Trier', 'Sort', 'Sortieren', 'Ordenar'],
  sortLine: ['Trier : ', 'Sort: ', 'Sortieren: ', 'Ordenar: '],
  sortBy: ['Trier par', 'Sort by', 'Sortieren nach', 'Ordenar por'],
  asc: ['Croissant', 'Ascending', 'Aufsteigend', 'Ascendente'],
  desc: ['Décroissant', 'Descending', 'Absteigend', 'Descendente'],
  reset: ['Remettre l’ordre', 'Reset the order', 'Reihenfolge zurücksetzen', 'Restablecer el orden'],
  actions: ['Actions', 'Actions', 'Aktionen', 'Acciones']
});
const LANGS = ['fr', 'en', 'de', 'es'];
const TYPES = ['text', 'number', 'date', 'duration'];
const ID = /^[a-z][a-z0-9-]{0,40}$/;
const ARROW = {
  asc: '▲',
  desc: '▼'
};
/** L'index de la langue (le français pour une langue inconnue). */
const li = lang => Math.max(0, LANGS.indexOf(String(lang || '').slice(0, 2).toLowerCase()));
/** Un texte du bloc dans la langue. */
const tt = (k, lang) => TEXTS[k][li(lang)];
/** Le libellé d'une colonne dans la langue (un texte seul vaut pour les quatre). */
const labelOf = (col, lang) => typeof col?.label === 'string' ? col.label : String(Array.isArray(col?.label) ? col.label[li(lang)] ?? col
  .label[
    0] ?? col.key : col?.key ?? '');
/** Un texte échappé pour le HTML (contenu et attributs). */
const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[ch]);
const typeOf = col => TYPES.includes(col?.type) ? col.type : 'text';
/** Le premier sens d'une colonne : le sien, sinon texte croissant, nombre / date / durée décroissants. */
const firstOf = col => col?.first === 'asc' || col?.first === 'desc' ? col.first : typeOf(col) === 'text' ? 'asc' : 'desc';
const colOf = (cols, key) => Array.isArray(cols) && typeof key === 'string' ? cols.find(c => c && c.key === key) : undefined;

/** Un collateur par langue, construit une fois (numérique, aveugle aux accents et à la casse). */
const COLLATORS = new Map();

function collator(lang) {
  const k = String(lang || 'fr');
  let c = COLLATORS.get(k);
  if (!c) {
    try {
      c = new Intl.Collator(k, {
        numeric: true,
        sensitivity: 'base'
      });
    } catch {
      c = new Intl.Collator(undefined, {
        numeric: true,
        sensitivity: 'base'
      });
    }
    COLLATORS.set(k, c);
  }
  return c;
}

/** La clé de tri d'une valeur selon le type de la colonne ; null pour le vide (toujours en dernier). */
function keyOf(type, v) {
  if (v === null || v === undefined) return null;
  if (type === 'text') {
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : null;
    if (typeof v !== 'string') return null;
    return v.trim() ? v : null;
  }
  if (type === 'date') {
    const ms = v instanceof Date ? v.getTime() : typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Date.parse(v) : NaN;
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string' || !v.trim()) return null;
  // nombre : la virgule décimale, les espaces de milliers (espace, insécable, fine insécable) et le moins U+2212 ; une durée se lit telle quelle
  const s = type === 'number' ? v.trim().replace(/[\s  ]/g, '').replace(/−/g, '-').replace(',', '.') : v.trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
/** La clé de tri d'une ligne pour une colonne ; un get qui lève donne le vide. */
function rowKey(col, row) {
  try {
    return keyOf(typeOf(col), col.get(row));
  } catch {
    return null;
  }
}
/** Compare deux clés non vides d'un même type. */
const cmpKeys = (type, a, b, coll) => type === 'text' ? coll.compare(a, b) : a < b ? -1 : a > b ? 1 : 0;

/** L'état par défaut d'une liste : { key, dir } ; une clé inconnue → la première colonne, un sens inconnu → le premier de la colonne. */
export function defaultState(cols, {
  key,
  dir
} = {}) {
  const col = colOf(cols, key) || (Array.isArray(cols) ? cols.find(c => c && typeof c.key === 'string') : undefined);
  if (!col) return {
    key: '',
    dir: 'asc'
  };
  return {
    key: col.key,
    dir: dir === 'asc' || dir === 'desc' ? dir : firstOf(col)
  };
}
/** Un état gardé lu comme une entrée non fiable : une clé PROPRE `key` qui nomme une colonne, `dir` 'asc' | 'desc' ; sinon dflt. */
export function stateOf(stored, cols, dflt) {
  const o = plain(stored),
    key = own(o, 'key'),
    dir = own(o, 'dir');
  if (typeof key === 'string' && colOf(cols, key) && (dir === 'asc' || dir === 'desc')) return {
    key,
    dir
  };
  return dflt ?? defaultState(cols);
}
/** L'état après un geste sur la colonne `key` : la même colonne inverse, une autre commence dans son premier sens. */
export function nextSort(state, key, cols) {
  const cur = stateOf(state, cols, defaultState(cols)),
    col = colOf(cols, key);
  if (!col) return cur;
  return col.key === cur.key ? {
    key: cur.key,
    dir: cur.dir === 'asc' ? 'desc' : 'asc'
  } : {
    key: col.key,
    dir: firstOf(col)
  };
}
/** Les lignes triées : un NOUVEAU tableau ; le vide toujours en dernier ; égalité : la première colonne dans son premier sens, puis l'ordre d'origine. */
export function sortRows(rows, cols, state, lang) {
  if (!Array.isArray(rows)) return [];
  const st = stateOf(state, cols, defaultState(cols)),
    col = colOf(cols, st.key);
  if (!col) return [...rows];
  const coll = collator(lang),
    type = typeOf(col),
    sign = st.dir === 'desc' ? -1 : 1,
    tie = Array.isArray(cols) && cols[0] && cols[0] !== col && typeof cols[0].get === 'function' ? cols[0] : null,
    tieType = tie && typeOf(tie),
    tieSign = tie && firstOf(tie) === 'desc' ? -1 : 1;
  const dec = rows.map((row, i) => ({
    row,
    i,
    k: typeof col.get === 'function' ? rowKey(col, row) : null,
    t: tie ? rowKey(tie, row) : null
  }));
  const empties = (a, b) => (a === null) - (b === null);
  dec.sort((A, B) => {
    const e = empties(A.k, B.k);
    if (e) return e;
    if (A.k !== null) {
      const c = cmpKeys(type, A.k, B.k, coll);
      if (c) return c * sign;
    }
    if (tie) {
      const et = empties(A.t, B.t);
      if (et) return et;
      if (A.t !== null) {
        const c = cmpKeys(tieType, A.t, B.t, coll);
        if (c) return c * tieSign;
      }
    }
    return A.i - B.i;
  });
  return dec.map(d => d.row);
}

/** Le nom d'aria-sort d'une colonne. */
const ariaOf = (col, st) => col.key === st.key ? st.dir === 'asc' ? 'ascending' : 'descending' : 'none';
/** La <tr> d'en-tête : une <th scope="col" aria-sort data-col> et son bouton par colonne ; actions : une <th> de plus pour les gestes (son nom pour les lecteurs d'écran). */
export function headHtml(cols, state, {
  lang = 'fr',
  actions = false
} = {}) {
  const st = stateOf(state, cols, defaultState(cols)),
    list = Array.isArray(cols) ? cols.filter(c => c && typeof c.key === 'string') : [];
  return `<tr>${list.map(c => `<th scope="col"${c.align === 'num' ? ' class="f-num"' : ''} aria-sort="${ariaOf(c, st)}" data-col="${esc(c.key)}"><button type="button" data-sort="${esc(c.key)}" class="f-sortbtn">${esc(labelOf(c, lang))}</button></th>`).join('')}${actions ? `<th scope="col" class="f-sortact"><span class="f-sr">${esc(tt('actions', lang))}</span></th>` : ''}</tr>`;
}
/** Le contenu du bouton « Trier » : « Trier : <colonne> ▲|▼ » et le sens en mots pour les lecteurs d'écran. */
const openInner = (col, st, lang) =>
  `${esc(tt('sortLine', lang))}<b data-sort-label>${esc(labelOf(col, lang))}</b> <span aria-hidden="true" data-sort-arrow>${ARROW[st.dir]}</span><span class="f-sr" data-sort-dirword>${esc(tt(st.dir, lang))}</span>`;
const same = (a, b) => !!a && !!b && a.key === b.key && a.dir === b.dir;
/** La barre : « Trier : <colonne> ▲|▼ » (aria-expanded, aria-controls) et son panneau caché (un bouton radio par colonne, « Croissant / Décroissant » avec aria-pressed) ; « Remettre l'ordre »
 *  dans la barre (pas dans le panneau : l'écran large l'a aussi), caché à l'ordre par défaut. id : l'identifiant de la liste (les id du panneau et le nom des boutons radio en dérivent). */
export function barHtml(cols, state, {
  lang = 'fr',
  id = 'list',
  dflt,
  open = false
} = {}) {
  const st = stateOf(state, cols, defaultState(cols)),
    d = stateOf(dflt, cols, defaultState(cols)),
    col = colOf(cols, st.key),
    pid = `${id}-sortpanel`,
    list = Array.isArray(cols) ? cols.filter(c => c && typeof c.key === 'string') : [];
  if (!col) return '';
  return `<div class="f-sortbar" data-sortbar><button type="button" class="f-sortopen" data-sort-open aria-expanded="${open}" aria-controls="${esc(pid)}">${openInner(col, st, lang)}</button><button type="button" class="f-sortreset" data-sort-reset${same(st, d) ? ' hidden' : ''}>${esc(tt('reset', lang))}</button>
<div class="f-sortpanel" id="${esc(pid)}" data-sort-panel role="group" aria-label="${esc(tt('sortBy', lang))}"${open ? '' : ' hidden'}>${list.map(c => `<label><input type="radio" name="${esc(id)}-sortcol" value="${esc(c.key)}" data-sort-col${c.key === st.key ? ' checked' : ''}> ${esc(labelOf(c, lang))}</label>`).join('')}<div class="f-sortdirs">${['asc', 'desc'].map(k => `<button type="button" data-sort-dir="${k}" aria-pressed="${st.dir === k}"><span aria-hidden="true">${ARROW[k]}</span> ${esc(tt(k, lang))}</button>`).join('')}</div></div></div>`;
}

/** Pose un attribut seulement s'il change (null : retiré). */
function setAttr(el, name, v) {
  if (v === null) {
    if (el.hasAttribute(name)) el.removeAttribute(name);
  } else if (el.getAttribute(name) !== v) el.setAttribute(name, v);
}
/** L'en-tête et la barre de root suivent l'état EN PLACE, sans rien redessiner et en n'écrivant que ce qui change ; le panneau garde son ouverture. */
export function refresh(root, cols, state, {
  lang = 'fr',
  dflt
} = {}) {
  if (!root?.querySelectorAll) return;
  const st = stateOf(state, cols, defaultState(cols)),
    d = stateOf(dflt, cols, defaultState(cols)),
    col = colOf(cols, st.key);
  for (const th of root.querySelectorAll('th[data-col]')) {
    const c = colOf(cols, th.dataset.col);
    if (c) setAttr(th, 'aria-sort', ariaOf(c, st));
  }
  const open = root.querySelector('[data-sort-open]');
  if (open && col) {
    const label = open.querySelector('[data-sort-label]'),
      arrow = open.querySelector('[data-sort-arrow]'),
      word = open.querySelector('[data-sort-dirword]'),
      l = labelOf(col, lang);
    if (label && label.textContent !== l) label.textContent = l;
    if (arrow && arrow.textContent !== ARROW[st.dir]) arrow.textContent = ARROW[st.dir];
    if (word && word.textContent !== tt(st.dir, lang)) word.textContent = tt(st.dir, lang);
  }
  for (const r of root.querySelectorAll('input[data-sort-col]'))
    if (r.checked !== (r.value === st.key)) r.checked = r.value === st.key;
  for (const b of root.querySelectorAll('[data-sort-dir]')) setAttr(b, 'aria-pressed', String(b.dataset.sortDir === st.dir));
  for (const b of root.querySelectorAll('[data-sort-reset]'))
    if (b.hidden !== same(st, d)) b.hidden = same(st, d);
}

/** Ouvre ou ferme le panneau d'une barre (le bouton « Trier » et le panneau qu'il commande). */
function setOpen(bar, on) {
  const btn = bar?.querySelector('[data-sort-open]'),
    panel = bar?.querySelector('[data-sort-panel]');
  if (!btn || !panel) return;
  setAttr(btn, 'aria-expanded', String(on));
  if (panel.hidden === on) panel.hidden = !on;
}
/** Les gestes délégués sur root : un en-tête [data-sort], le bouton « Trier » (ouvre / ferme), un bouton radio, un sens, « Remettre l'ordre », Échap dans le panneau.
 *  Un geste qui change l'état appelle setState(next) puis onChange(next, { open }) ; le bloc ne redessine rien. Rend unbind(). */
export function bind(root, {
  cols,
  getState,
  setState,
  onChange,
  dflt
} = {}) {
  const ac = new AbortController();
  if (!root?.addEventListener) return () => ac.abort();
  const cur = () => stateOf(typeof getState === 'function' ? getState() : null, cols, defaultState(cols));
  const go = (next, at) => {
    if (same(next, cur())) return;
    const bar = at?.closest?.('[data-sortbar]'),
      open = bar ? bar.querySelector('[data-sort-open]')?.getAttribute('aria-expanded') === 'true' : false;
    if (typeof setState === 'function') setState(next);
    if (typeof onChange === 'function') onChange(next, {
      open
    });
  };
  root.addEventListener('click', e => {
    const t = e.target;
    if (!t?.closest) return;
    const head = t.closest('[data-sort]');
    if (head && root.contains(head)) return go(nextSort(cur(), head.dataset.sort, cols), head);
    const opener = t.closest('[data-sort-open]');
    if (opener && root.contains(opener)) return setOpen(opener.closest('[data-sortbar]'), opener.getAttribute('aria-expanded') !==
      'true');
    const dir = t.closest('[data-sort-dir]');
    if (dir && root.contains(dir)) {
      const d = dir.dataset.sortDir;
      if (d === 'asc' || d === 'desc') go({
        key: cur().key,
        dir: d
      }, dir);
      return;
    }
    const reset = t.closest('[data-sort-reset]');
    if (reset && root.contains(reset)) go(stateOf(dflt, cols, defaultState(cols)), reset);
  }, {
    signal: ac.signal
  });
  root.addEventListener('change', e => {
    const r = e.target;
    if (!r?.matches?.('input[data-sort-col]') || !r.checked) return;
    const col = colOf(cols, r.value);
    if (col) go({
      key: col.key,
      dir: firstOf(col)
    }, r);
  }, {
    signal: ac.signal
  });
  root.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const panel = e.target?.closest?.('[data-sort-panel]');
    if (!panel || panel.hidden) return;
    const bar = panel.closest('[data-sortbar]');
    setOpen(bar, false);
    bar?.querySelector('[data-sort-open]')?.focus();
  }, {
    signal: ac.signal
  });
  return () => ac.abort();
}

/** Le chemin de l'état gardé d'une liste ; '' pour un identifiant invalide. */
const pathOf = id => typeof id === 'string' && ID.test(id) ? `cache/sort/${id}.json` : '';
/** L'état gardé d'une liste (ctx.data, politique 'cache'), lu comme une entrée non fiable ; dflt sinon (jamais d'exception). */
export async function loadState(ctx, id, cols, dflt) {
  const d = dflt ?? defaultState(cols),
    p = pathOf(id);
  if (!p || typeof ctx?.data?.get !== 'function') return d;
  try {
    return stateOf(await ctx.data.get(p), cols, d);
  } catch {
    return d;
  }
}
/** Garde l'état d'une liste (ctx.data, politique 'cache') s'il change ; true quand il a été écrit (jamais d'exception). */
export async function saveState(ctx, id, state) {
  const p = pathOf(id),
    key = own(plain(state), 'key'),
    dir = own(plain(state), 'dir');
  if (!p || typeof key !== 'string' || !key || (dir !== 'asc' && dir !== 'desc') || typeof ctx?.data?.put !== 'function') return false;
  try {
    const was = typeof ctx.data.get === 'function' ? await ctx.data.get(p) : null;
    if (own(plain(was), 'key') === key && own(plain(was), 'dir') === dir) return false;
    await ctx.data.put(p, {
      key,
      dir
    }, {
      policy: 'cache'
    });
    return true;
  } catch {
    return false;
  }
}
