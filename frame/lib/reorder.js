// V3 frame/lib (propriétaire : cadre ; toute liste de la suite dont l'utilisateur change l'ordre s'en sert) — LE bloc commun des flèches « ↑ Plus tôt » / « ↓ Plus tard » (SOG-0482, lot 3 de Création ;
// maquette modules/missions/maquette/atelier_itineraire_v2.html, point (a) : la route de départ, la suite de route de chaque tiroir, les tiroirs entre eux — TROIS listes simples, des flèches d'abord).
// Pur à l'import : ni page, ni stockage, ni réseau. Le bloc ne dessine JAMAIS les lignes (le module garde les siennes), ne garde rien et ne redessine rien de lui-même : le module range ses éléments avec move,
// dessine ses lignes avec arrowsHtml, écoute avec bind, puis redessine et rend le focus avec focusAfter. Contrat : frame/INTEGRATION.md § 12h.
//
// Les règles de la maquette :
//   · une flèche ne franchit JAMAIS la limite de sa liste : un lieu ne change pas de liste en bougeant (pour changer de liste : « Retirer de l'itinéraire », puis « ＋ » sous la ligne voulue — gestes du module) ;
//   · une flèche au bord de sa liste est GRISÉE, jamais cachée, avec un titre qui dit pourquoi (le texte du module : « La limite du tiroir 1… » ; sans lui, un texte général du bloc) ;
//   · un élément seul dans sa liste : les deux flèches sont grisées ;
//   · les lignes qui ne bougent pas (Départ, Arrivée) n'ont pas de flèches : le module n'appelle pas arrowsHtml pour elles ;
//   · un tiroir bouge AVEC sa suite : c'est l'affaire du module (la liste des tiroirs porte des éléments qui contiennent leur suite).
//
// API :
//   move(list, i, dir)               → un NOUVEAU tableau avec l'élément i d'un cran plus tôt (dir 'up') ou plus tard (dir 'down'), ou null quand le geste est refusé (bord, indice ou sens illisible) ; la liste n'est jamais modifiée.
//   moveId(items, id, dir, idOf)     → { items, from, to } : le même geste par identifiant (idOf(x) → identifiant, x => x.id par défaut) ; null : identifiant inconnu ou bord.
//   canMove(n, i)                    → { up, down } : les flèches ouvertes pour l'élément i d'une liste de n éléments (aucune si i n'est pas un indice de la liste).
//   arrowsHtml({ lang, list, id, n, i, name, why }) → <span class="f-reorder" role="group"> : deux <button type="button" class="f-reorder-btn" data-reorder="up|down" data-list data-id>, la flèche fermée `disabled` avec son `title`
//                                      (why.up / why.down, le texte du module ; sinon TEXTS.edgeUp / edgeDown) ; name : le nom de l'élément, dit aux lecteurs d'écran (aria-label du groupe et de chaque flèche).
//   bind(root, { onMove })           → UN écouteur délégué sur root : un toucher sur une flèche ouverte appelle onMove({ list, id, dir }) ; une flèche grisée n'appelle rien ; rend unbind().
//   focusAfter(root, { list, id, dir }) → après le redessin : le focus revient sur la flèche du même sens de l'élément déplacé, ou sur l'autre si celle-là s'est fermée (il est au bord) ; rend l'élément focalisé ou null.
//   TEXTS                            → les textes du bloc, quatre langues (flèches, groupe, titres des flèches fermées).
export const DIRS = Object.freeze(['up', 'down']);
/** Les textes du bloc (fr, en, de, es) ; la langue vient de l'appel. */
export const TEXTS = Object.freeze({
  up: ['↑ Plus tôt', '↑ Earlier', '↑ Früher', '↑ Antes'],
  down: ['↓ Plus tard', '↓ Later', '↓ Später', '↓ Después'],
  group: ['Changer la place : {n}', 'Change the place: {n}', 'Position ändern: {n}', 'Cambiar el lugar: {n}'],
  upFor: ['{n} : plus tôt', '{n}: earlier', '{n}: früher', '{n}: antes'],
  downFor: ['{n} : plus tard', '{n}: later', '{n}: später', '{n}: después'],
  edgeUp: ['Déjà en première place de sa liste', 'Already first in its list', 'Schon an erster Stelle seiner Liste',
    'Ya es el primero de su lista'
  ],
  edgeDown: ['Déjà en dernière place de sa liste', 'Already last in its list', 'Schon an letzter Stelle seiner Liste',
    'Ya es el último de su lista'
  ]
});
const LANGS = ['fr', 'en', 'de', 'es'];
const line = (k, lang) => TEXTS[k][Math.max(0, LANGS.indexOf(lang))];
const MAX_ITEMS = 2000;
const MAX_TEXT = 200;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[c]);
/** Un texte du module : sans caractère de commande, borné. */
const text = s => typeof s === 'string' || typeof s === 'number' ? String(s).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0,
  MAX_TEXT) : '';
const isIndex = (n, i) => Number.isInteger(n) && n >= 0 && n <= MAX_ITEMS && Number.isInteger(i) && i >= 0 && i < n;

/** Les flèches ouvertes de l'élément i d'une liste de n éléments. */
export function canMove(n, i) {
  if (!isIndex(n, i)) return {
    up: false,
    down: false
  };
  return {
    up: i > 0,
    down: i < n - 1
  };
}

/** Un NOUVEAU tableau, l'élément i d'un cran plus tôt ou plus tard ; null quand le geste est refusé. */
export function move(list, i, dir) {
  if (!Array.isArray(list) || !DIRS.includes(dir) || !isIndex(list.length, i)) return null;
  const j = dir === 'up' ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return null;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/** Le même geste par identifiant : { items, from, to }, ou null (identifiant inconnu, bord). */
export function moveId(items, id, dir, idOf = x => x?.id) {
  if (!Array.isArray(items) || items.length > MAX_ITEMS) return null;
  const from = items.findIndex(x => String(idOf(x)) === String(id));
  const out = from < 0 ? null : move(items, from, dir);
  return out ? {
    items: out,
    from,
    to: dir === 'up' ? from - 1 : from + 1
  } : null;
}

/** Les deux flèches d'un élément (voir l'en-tête). `why` : { up?, down? } le texte du module pour une flèche fermée. */
export function arrowsHtml({
  lang = 'fr',
  list = '',
  id = '',
  n = 0,
  i = -1,
  name = '',
  why = {}
} = {}) {
  const open = canMove(n, i),
    who = text(name),
    arrow = (dir, k, forK, edgeK) => {
      const label = who ? line(forK, lang).replace('{n}', who) : '',
        reason = open[dir] ? '' : text(why?.[dir]) || line(edgeK, lang);
      return `<button type="button" class="f-reorder-btn" data-reorder="${dir}" data-list="${esc(text(list))}" data-id="${esc(text(id))}"${open[dir] ? '' : ' disabled'}${reason ? ` title="${esc(reason)}"` : ''}${label ? ` aria-label="${esc(label)}"` : ''}>${esc(line(k, lang))}</button>`;
    };
  return `<span class="f-reorder" role="group"${who ? ` aria-label="${esc(line('group', lang).replace('{n}', who))}"` : ''}>${arrow('up', 'up', 'upFor', 'edgeUp')}${arrow('down', 'down', 'downFor', 'edgeDown')}</span>`;
}

/** Un écouteur délégué : onMove({ list, id, dir }) pour une flèche ouverte ; rend unbind(). */
export function bind(root, {
  onMove
} = {}) {
  const ac = new AbortController();
  root.addEventListener('click', e => {
    const b = e.target instanceof Element ? e.target.closest('button[data-reorder]') : null;
    if (!b || !root.contains(b) || b.disabled || b.getAttribute('aria-disabled') === 'true') return;
    const dir = b.dataset.reorder;
    if (!DIRS.includes(dir) || typeof onMove !== 'function') return;
    onMove({
      list: b.dataset.list ?? '',
      id: b.dataset.id ?? '',
      dir
    });
  }, {
    signal: ac.signal
  });
  return () => ac.abort();
}

/** Après le redessin : le focus sur la flèche du même sens de l'élément déplacé, sinon sur l'autre ; rend l'élément focalisé ou null. */
export function focusAfter(root, {
  list = '',
  id = '',
  dir = 'up'
} = {}) {
  const mine = [...root.querySelectorAll('button[data-reorder]')].filter(b => b.dataset.list === list && b.dataset.id === id);
  const pick = d => mine.find(b => b.dataset.reorder === d && !b.disabled);
  const b = pick(dir) || pick(dir === 'up' ? 'down' : 'up') || null;
  if (b && b !== root.ownerDocument.activeElement) b.focus({
    preventScroll: false
  });
  return b;
}
