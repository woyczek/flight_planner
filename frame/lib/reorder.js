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
//   moveTo(list, from, to) / moveIdTo(items, id, to, idOf) → le même geste vers un indice d'arrivée (le glisser) : un NOUVEAU tableau / { items, from, to }, ou null (même place, indice illisible).
//   handleHtml({ lang, list, id, name }) → la poignée du glisser (<span class="f-reorder-handle" data-reorder-handle data-list data-id aria-hidden="true" title>) : au pointeur seulement, jamais au clavier.
//   bind(root, { onMove, onDrop, edges }) : avec onDrop, glisser la poignée (souris, toucher, stylet) : rien ne bouge sous 6 px ; la ligne (data-reorder-row du module) tenue porte data-reorder-dragging, le repère
//                                      d'insertion data-reorder-drop="before|after" sur la ligne voisine ; le geste ne sort JAMAIS de sa liste ; Échap, annulation, perte du focus de la fenêtre : rien ne change ; au lâcher :
//                                      onDrop({ list, id, from, to }) si to !== from. Près du bord haut ou bas de la zone qui défile, le défilement part tout seul, borné à la liste, jusqu'au lâcher ou à Échap.
//   dragPlan(rects, from, y), slotAt, scrollStep, limitStep, pastThreshold : les calculs purs du glisser et du défilement (banc).
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
  handle: ['Glisser pour changer la place : {n}', 'Drag to change the place: {n}', 'Ziehen, um die Position zu ändern: {n}',
    'Arrastrar para cambiar el lugar: {n}'
  ],
  handleBare: ['Glisser pour changer la place', 'Drag to change the place', 'Ziehen, um die Position zu ändern',
    'Arrastrar para cambiar el lugar'
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

/** Un NOUVEAU tableau, l'élément from rangé à l'indice d'arrivée to (le glisser) ; null : même place, indice illisible, pas une liste. */
export function moveTo(list, from, to) {
  if (!Array.isArray(list) || !isIndex(list.length, from) || !isIndex(list.length, to) || from === to) return null;
  const out = [...list];
  const [x] = out.splice(from, 1);
  out.splice(to, 0, x);
  return out;
}

/** Le même geste par identifiant : { items, from, to }, ou null (identifiant inconnu, même place). */
export function moveIdTo(items, id, to, idOf = x => x?.id) {
  if (!Array.isArray(items) || items.length > MAX_ITEMS) return null;
  const from = items.findIndex(x => String(idOf(x)) === String(id));
  const out = from < 0 ? null : moveTo(items, from, to);
  return out ? {
    items: out,
    from,
    to
  } : null;
}

/** La poignée du glisser d'un élément : au pointeur seulement (aria-hidden, hors de l'ordre de tabulation) ; au clavier et aux lecteurs d'écran, ce sont les flèches. */
export function handleHtml({
  lang = 'fr',
  list = '',
  id = '',
  name = ''
} = {}) {
  const who = text(name),
    title = who ? line('handle', lang).replace('{n}', who) : line('handleBare', lang);
  return `<span class="f-reorder-handle" data-reorder-handle data-list="${esc(text(list))}" data-id="${esc(text(id))}" aria-hidden="true" title="${esc(title)}"></span>`;
}

// ---- le glisser : les calculs purs (banc) --------------------------------------------------------------
/** Sous cette distance (px) le toucher n'est pas un glisser : un défilement ou un simple toucher. */
export const DRAG_MIN = 6;
/** Hauteur (px) de la bande du bord où le défilement part, et vitesse maximale (px par image). */
export const SCROLL_ZONE = 56;
export const SCROLL_MAX = 20;
/** Le doigt a-t-il assez bougé pour que ce soit un glisser ? */
export function pastThreshold(dx, dy) {
  return Number.isFinite(dx) && Number.isFinite(dy) && Math.hypot(dx, dy) >= DRAG_MIN;
}
/** La case d'insertion (0 à n) du pointeur à la hauteur y : le nombre de lignes dont le milieu est au-dessus. */
export function slotAt(rects, y) {
  if (!Array.isArray(rects) || !Number.isFinite(y)) return null;
  return rects.reduce((k, r) => k + ((r.top + r.bottom) / 2 < y ? 1 : 0), 0);
}
/** Le plan du glisser : { slot, to, mark } — to : l'indice d'arrivée de la ligne tenue (from : où elle est) ; mark : { index, side } la ligne voisine du repère (null : même place, rien à repérer). */
export function dragPlan(rects, from, y) {
  const n = Array.isArray(rects) ? rects.length : 0;
  const slot = slotAt(rects, y);
  if (slot === null || !isIndex(n, from)) return null;
  const to = slot > from ? slot - 1 : slot;
  return {
    slot,
    to,
    mark: to === from ? null : slot < n ? {
      index: slot,
      side: 'before'
    } : {
      index: n - 1,
      side: 'after'
    }
  };
}
/** Le pas de défilement (px par image, négatif : vers le haut) du pointeur à la hauteur y pour la zone visible [top, bottom] : proportionnel à l'approche du bord, plein au-delà. */
export function scrollStep(y, top, bottom, {
  zone = SCROLL_ZONE,
  max = SCROLL_MAX
} = {}) {
  if (![y, top, bottom].every(Number.isFinite) || bottom <= top) return 0;
  const z = Math.min(zone, (bottom - top) / 2);
  if (z <= 0) return 0;
  if (y < top + z) return -Math.round(max * Math.min(1, (top + z - y) / z));
  if (y > bottom - z) return Math.round(max * Math.min(1, (y - (bottom - z)) / z));
  return 0;
}
/** Le pas borné à la liste : jamais plus que ce qu'il reste de la liste hors de la zone visible (plus de défilement vers le haut quand la première ligne est entièrement visible, ni vers le bas quand la dernière l'est). */
export function limitStep(step, listTop, listBottom, top, bottom) {
  if (step < 0) {
    const room = top - listTop;
    return room > 1 ? Math.max(step, -Math.ceil(room)) : 0;
  }
  if (step > 0) {
    const room = listBottom - bottom;
    return room > 1 ? Math.min(step, Math.ceil(room)) : 0;
  }
  return 0;
}

// ---- le glisser : le geste (le pointeur, l'ancre, le défilement) ----------------------------------------
const SCROLLING = /(auto|scroll)/;
const scrollerOf = el => {
  const win = el.ownerDocument.defaultView;
  for (let p = el.parentElement; p && p !== el.ownerDocument.body && p !== el.ownerDocument.documentElement; p = p.parentElement)
    if (SCROLLING.test(win.getComputedStyle(p).overflowY) && p.scrollHeight > p.clientHeight + 1) return p;
  return el.ownerDocument.scrollingElement || el.ownerDocument.documentElement;
};
const isPage = (el, doc) => el === doc.scrollingElement || el === doc.documentElement || el === doc.body;
/** Ce que la rangée d'onglets, l'en-tête ou la barre collante recouvrent en haut et en bas de la fenêtre : le bord réel de la zone qui défile commence sous eux. */
function probeInsets(doc, row) {
  const win = doc.defaultView,
    r = row.getBoundingClientRect(),
    x = Math.min(Math.max(r.left + r.width / 2, 1), win.innerWidth - 1),
    out = {
      top: 0,
      bottom: 0
    },
    stuck = el => {
      for (let a = el; a && a !== doc.body && a !== doc.documentElement; a = a.parentElement) {
        const pos = win.getComputedStyle(a).position;
        if ((pos === 'fixed' || pos === 'sticky') && !a.contains(row)) return a;
      }
      return null;
    };
  for (const el of doc.elementsFromPoint(x, 1)) {
    const a = stuck(el);
    if (a) out.top = Math.max(out.top, Math.min(a.getBoundingClientRect().bottom, win.innerHeight / 2));
  }
  for (const el of doc.elementsFromPoint(x, win.innerHeight - 1)) {
    const a = stuck(el);
    if (a) out.bottom = Math.max(out.bottom, Math.min(win.innerHeight - a.getBoundingClientRect().top, win.innerHeight / 2));
  }
  return out;
}

/** Un glisser de poignée jusqu'à son terme : voir l'en-tête (bind). */
function dragGesture(root, e, {
  onDrop,
  edges
}, outer) {
  const h = e.target instanceof Element ? e.target.closest('[data-reorder-handle]') : null;
  if (!h || !root.contains(h) || e.button !== 0 || e.isPrimary === false) return;
  const doc = root.ownerDocument,
    win = doc.defaultView,
    list = h.dataset.list ?? '',
    id = h.dataset.id ?? '',
    pid = e.pointerId,
    ac = new AbortController(),
    sig = ac.signal,
    g = {
      y: e.clientY,
      active: false,
      rows: [],
      from: -1,
      to: -1,
      mark: null,
      raf: 0,
      scroller: null,
      insets: {
        top: 0,
        bottom: 0
      }
    };
  e.preventDefault();
  const setMark = m => {
    if (g.mark && m && g.mark.row === m.row && g.mark.side === m.side) return;
    if (g.mark) g.mark.row.removeAttribute('data-reorder-drop');
    if (m) m.row.setAttribute('data-reorder-drop', m.side);
    g.mark = m;
  };
  const end = () => {
    if (g.raf) win.cancelAnimationFrame(g.raf);
    g.raf = 0;
    setMark(null);
    if (g.rows[g.from]) g.rows[g.from].removeAttribute('data-reorder-dragging');
    if (g.active) root.removeAttribute('data-reorder-active');
    g.active = false;
    ac.abort();
  };
  const plan = () => {
    const p = dragPlan(g.rows.map(r => r.getBoundingClientRect()), g.from, g.y);
    g.to = p ? p.to : g.from;
    setMark(p && p.mark ? {
      row: g.rows[p.mark.index],
      side: p.mark.side
    } : null);
  };
  const visible = () => {
    const sc = g.scroller,
      r = isPage(sc, doc) ? {
        top: 0,
        bottom: win.innerHeight
      } : sc.getBoundingClientRect(),
      ins = typeof edges === 'function' ? edges() || {} : g.insets;
    return {
      top: Math.max(r.top, 0, Number(ins.top) || 0),
      bottom: Math.min(r.bottom, win.innerHeight - (Number(ins.bottom) || 0))
    };
  };
  const tick = () => {
    g.raf = 0;
    if (!g.active) return;
    const v = visible(),
      first = g.rows[0].getBoundingClientRect(),
      last = g.rows[g.rows.length - 1].getBoundingClientRect(),
      d = limitStep(scrollStep(g.y, v.top, v.bottom), first.top, last.bottom, v.top, v.bottom);
    if (d) {
      const before = g.scroller.scrollTop;
      g.scroller.scrollTop = before + d;
      if (g.scroller.scrollTop !== before) plan();
    }
    g.raf = win.requestAnimationFrame(tick);
  };
  const activate = () => {
    const handles = [...root.querySelectorAll('[data-reorder-handle]')].filter(x => x.dataset.list === list),
      rows = handles.map(x => x.closest('[data-reorder-row]'));
    g.from = handles.findIndex(x => (x.dataset.id ?? '') === id);
    if (g.from < 0 || rows.some(r => !r) || new Set(rows).size !== rows.length) return end();
    g.rows = rows;
    g.active = true;
    g.scroller = scrollerOf(rows[g.from]);
    g.insets = probeInsets(doc, rows[g.from]);
    rows[g.from].setAttribute('data-reorder-dragging', '');
    root.setAttribute('data-reorder-active', '');
    g.raf = win.requestAnimationFrame(tick);
  };
  win.addEventListener('pointermove', m => {
    if (m.pointerId !== pid) return;
    g.y = m.clientY;
    if (!g.active) {
      if (!pastThreshold(m.clientX - e.clientX, m.clientY - e.clientY)) return;
      activate();
      if (!g.active) return;
    }
    m.preventDefault();
    plan();
  }, {
    signal: sig,
    passive: false
  });
  win.addEventListener('pointerup', m => {
    if (m.pointerId !== pid) return;
    g.y = m.clientY;
    if (!g.active) return end();
    plan();
    const {
      from,
      to
    } = g;
    end();
    if (to !== from && to >= 0) onDrop({
      list,
      id,
      from,
      to
    });
  }, {
    signal: sig
  });
  win.addEventListener('pointercancel', m => {
    if (m.pointerId === pid) end();
  }, {
    signal: sig
  });
  win.addEventListener('blur', end, {
    signal: sig
  });
  win.addEventListener('contextmenu', m => m.preventDefault(), {
    signal: sig
  });
  doc.addEventListener('keydown', k => {
    if (k.key !== 'Escape') return;
    if (g.active) {
      k.preventDefault();
      k.stopPropagation();
    }
    end();
  }, {
    signal: sig,
    capture: true
  });
  outer.addEventListener('abort', end, {
    once: true,
    signal: sig
  });
}

/** Un écouteur délégué : onMove({ list, id, dir }) pour une flèche ouverte ; avec onDrop, le glisser de la poignée (voir l'en-tête) ; rend unbind(). */
export function bind(root, {
  onMove,
  onDrop,
  edges
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
  if (typeof onDrop === 'function') root.addEventListener('pointerdown', e => dragGesture(root, e, {
    onDrop,
    edges
  }, ac.signal), {
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
