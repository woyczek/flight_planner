// COPIE DE MAPS, À REMPLACER PAR frame/lib/sheet.js (décision du relais, 24 oct 2026 : la feuille à trois positions
// devient une primitive du cadre, règles dans frame/design/primitives.css). Recopié de modules/maps/module.js (setSheet,
// sheetGestures, sheetHeights) ; ne pas le faire évoluer ici : le jour où la primitive existe, ce fichier est supprimé.
//
// Feuille de hauteur fixe à trois positions (0 réduit : sa ligne d'en-tête seule ; 1 normal ; 2 agrandi), tirée par la
// poignée de son en-tête : un toucher réduit la feuille (ou la ramène à la position normale), un glisser la tire (événements
// du pointeur sur l'en-tête seulement : la carte garde ses gestes), au lâcher elle prend la position la plus proche (ou la
// suivante, si le geste était un coup de pouce) ; flèches du clavier. Les hauteurs viennent des jetons de la racine
// (--<p>-head, --<p>-p1 / --<p>-p2 : parts de la vue, --<p>-m1 / --<p>-m2 : planchers) ; la position est posée en
// data-sheet sur la racine, la feuille de style du module en tire la hauteur.

/** Position gardée d'un montage à l'autre dans la même page. */
let keep = 1;

/** createSheet({ root, data, head, grip, prefix, title(pos), skip (sélecteur des boutons de l'en-tête qui ne tirent pas),
 *  onSettle() (après chaque changement de taille) }) → { set(pos, instant), get pos }. */
export function createSheet({
  root,
  data,
  head,
  grip,
  prefix = 'at',
  title = () => '',
  skip = '',
  onSettle = () => {}
}) {
  let pos = keep;
  const nt = `${prefix}-nt`;
  /** Hauteurs en pixels des trois positions. */
  const heights = () => {
    const cs = getComputedStyle(root),
      n = k => parseFloat(cs.getPropertyValue(`--${prefix}-${k}`)) || 0,
      H = root.clientHeight;
    return [n('head') + 1, Math.max(n('p1') * H, n('m1')), Math.max(n('p2') * H, n('m2'))];
  };
  /** Met la feuille à une position. instant : sans glissement. */
  function set(p, instant = false) {
    p = Math.max(0, Math.min(2, p));
    pos = keep = p;
    if (instant) {
      data.classList.add(nt);
      requestAnimationFrame(() => data.classList.remove(nt));
    }
    data.style.removeProperty('height');
    if (root.dataset.sheet !== String(p)) root.dataset.sheet = String(p);
    const tip = title(p);
    if (grip.title !== tip) grip.title = tip;
    const ex = String(p > 0);
    if (grip.getAttribute('aria-expanded') !== ex) grip.setAttribute('aria-expanded', ex);
  }
  let d = null;
  head.addEventListener('pointerdown', e => {
    if (e.button > 0 || (skip && e.target.closest(skip))) return;
    d = {
      id: e.pointerId,
      y0: e.clientY,
      h0: data.offsetHeight,
      pos,
      y: e.clientY,
      t: performance.now(),
      v: 0,
      on: false,
      grip: !!e.target.closest(`.${grip.className.split(' ')[0]}`)
    };
    head.setPointerCapture(e.pointerId);
  });
  head.addEventListener('pointermove', e => {
    if (!d || e.pointerId !== d.id) return;
    if (!d.on) {
      if (Math.abs(e.clientY - d.y0) < 6) return;
      d.on = true;
      data.classList.add(nt);
    }
    const hs = heights(),
      now = performance.now();
    if (now > d.t) d.v = .6 * d.v + .4 * ((e.clientY - d.y) / (now - d.t));
    d.y = e.clientY;
    d.t = now;
    data.style.height = `${Math.round(Math.max(hs[0], Math.min(hs[2], d.h0 - (e.clientY - d.y0))))}px`;
  });
  const end = e => {
    if (!d || e.pointerId !== d.id) return;
    const was = d;
    d = null;
    if (!was.on) {
      // un toucher (ni glissé ni annulé) sur la poignée : réduit la feuille, ou la ramène à la position normale
      if (e.type === 'pointerup' && was.grip) {
        set(pos === 1 ? 0 : 1);
        onSettle();
      }
      return;
    }
    data.classList.remove(nt);
    const hs = heights(),
      h = data.offsetHeight;
    let p = hs.reduce((b, x, i) => Math.abs(x - h) < Math.abs(hs[b] - h) ? i : b, 0);
    if (Math.abs(was.v) > .8 && e.type === 'pointerup') p = was.v < 0 ? Math.min(2, was.pos + 1) : Math.max(0, was.pos - 1);
    set(p);
    onSettle();
  };
  head.addEventListener('pointerup', end);
  head.addEventListener('pointercancel', end);
  // clavier (Entrée, Espace : clic sans pointeur) ; le toucher et la souris sont traités au relâcher, plus haut
  grip.addEventListener('click', e => {
    if (e.detail) return;
    set(pos === 1 ? 0 : 1);
    onSettle();
  });
  grip.addEventListener('keydown', e => {
    const k = {
      ArrowUp: pos + 1,
      ArrowDown: pos - 1,
      Home: 0,
      End: 2
    } [e.key];
    if (k == null) return;
    e.preventDefault();
    set(k);
    onSettle();
  });
  data.addEventListener('transitionend', e => {
    if (e.target === data && e.propertyName === 'height') onSettle();
  });
  return {
    set,
    get pos() {
      return pos;
    }
  };
}
