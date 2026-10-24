// Feuille à trois positions, primitive du cadre (frame/INTEGRATION.md § 11, règles dans frame/design/primitives.css).
//
// Une feuille de hauteur fixe au bas d'une vue fixe (carte, coupe, …) : réduite (sa ligne d'en-tête seule), normale,
// agrandie. Son en-tête est la poignée : un glisser la tire, un coup de pouce la fait passer à la position suivante, un
// toucher la réduit ou la ramène à la normale (jamais à l'agrandie), le clavier la règle. La feuille ne sait pas ce
// qu'elle contient et n'écrit aucun texte : les libellés viennent de l'appelant (labels). Aucun état de module : la
// position gardée d'un montage à l'autre est l'affaire de l'appelant (il la repasse en `pos`, onChange la lui donne).
//
// Hauteurs : jetons --f-sheet-* lus sur la racine (feuille de style : primitives.css ; le module peut les poser sur sa
// racine). Chaque valeur est « <n>% » (part de la hauteur de la racine) ou « <n>px » ; rien d'autre n'est lu.

/** Les trois positions, de la plus basse à la plus haute. */
export const POSITIONS = ['collapsed', 'default', 'expanded'];

/** Au-delà de cette vitesse (px par ms) un glisser lâché est un coup de pouce : position suivante, pas la plus proche. */
const FLICK = .8;
/** Délai (ms) entre le dernier changement et onSettle. */
const SETTLE_MS = 120;
/** Distance (px) à partir de laquelle un toucher devient un glisser. */
const SLOP = 6;

/** Nom d'une position à partir d'un nom ou d'un rang (0, 1, 2) ; le rang est borné. */
const norm = p => typeof p === 'number' ? POSITIONS[Math.max(0, Math.min(2, Math.round(p)))] : POSITIONS.includes(p) ? p : 'default';

/**
 * createSheet({ root, panel, head, grip, pos, ignore, labels, locked, onChange, onSettle }) → { pos, set, settle, stop }
 *
 * - root : l'élément qui porte `data-sheet` (la position) et les jetons --f-sheet-* ; la hauteur des positions est une
 *   part de la sienne (hauteur de contenu), et panel en est un enfant direct (`.f-sheet > .f-sheet-panel`)
 * - panel : la feuille elle-même, dont la hauteur suit `data-sheet` (feuille de style) ou le doigt (style en ligne)
 * - head : la ligne d'en-tête, qui reçoit le glisser (événements du pointeur sur elle seule : la carte garde les siens)
 * - grip : le bouton de la poignée, dans head (un <button> ; sinon il reçoit role="button" et tabindex)
 * - pos : position de départ, 'collapsed' | 'default' | 'expanded' (par défaut 'default')
 * - ignore : sélecteur de ce qui, dans head, ne tire pas (la bascule, le ✕)
 * - labels : le libellé de la poignée selon la position, `(pos, rang) => texte` ou `{ collapsed, default, expanded }` ;
 *   il devient l'infobulle et l'aria-label de la poignée ; sans labels, elle garde les siens
 * - locked : () => vrai quand les gestes du pointeur sont refusés (glisser, toucher) ; le clavier reste
 * - onChange : (pos) à chaque changement de position, y compris au lâcher d'un glisser
 * - onSettle : (pos) 120 ms après le dernier changement de position ou de taille de la feuille (fin du glissement, fin de
 *   la transition) : la carte reprend sa taille et se recadre
 *
 * pos : la position courante. set(pos, instant) : met la feuille à une position (nom ou rang), instant coupe la
 * transition ; settle() : relance le délai de onSettle (à appeler quand la taille de la vue a changé autrement) ;
 * stop() : retire les écouteurs et le délai.
 */
export function createSheet({
  root,
  panel,
  head,
  grip,
  pos = 'default',
  ignore = '',
  labels = null,
  locked = () => false,
  onChange = () => {},
  onSettle = () => {}
}) {
  const ac = new AbortController(),
    on = (el, type, fn) => el.addEventListener(type, fn, {
      signal: ac.signal
    });
  let cur = norm(pos),
    timer = 0;

  /** Longueur d'un jeton : « 38% » est une part de la hauteur h, « 170px » (ou un nombre) des pixels. */
  const len = (v, h) => {
    const n = parseFloat(v) || 0;
    return String(v).includes('%') ? n * h / 100 : n;
  };
  /** Hauteurs en pixels des trois positions, lues dans les jetons de la racine : l'en-tête seul, le milieu (part de la
   *  racine, avec son plancher), l'agrandie (idem). */
  function heights() {
    const cs = getComputedStyle(root),
      t = k => cs.getPropertyValue(`--f-sheet-${k}`).trim(),
      h = root.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
    return [len(t('head'), h), Math.max(len(t('default'), h), len(t('default-min'), h)), Math.max(len(t('expanded'), h), len(t(
      'expanded-min'), h))];
  }
  /** Le libellé de la poignée pour une position. */
  const tip = p => typeof labels === 'function' ? labels(p, POSITIONS.indexOf(p)) : labels?.[p];
  /** Écrit un attribut seulement s'il change. */
  const attr = (el, k, v) => {
    if (el.getAttribute(k) !== v) el.setAttribute(k, v);
  };

  /** Met la feuille à une position (nom ou rang). instant : sans glissement (le contenu va être mesuré). */
  function set(p, instant = false) {
    p = norm(p);
    cur = p;
    onChange(p);
    if (instant) {
      panel.classList.add('f-sheet-nt');
      requestAnimationFrame(() => panel.classList.remove('f-sheet-nt'));
    }
    panel.style.removeProperty('height');
    if (root.dataset.sheet !== p) root.dataset.sheet = p;
    const text = tip(p);
    if (text != null) {
      if (grip.title !== text) grip.title = text;
      attr(grip, 'aria-label', text);
    }
    attr(grip, 'aria-expanded', String(p !== 'collapsed'));
    if (instant) void panel.offsetHeight; // mesure possible tout de suite (hauteur à jour)
    settle();
  }
  /** Après un changement de position ou de taille : onSettle, en une fois, quand la taille s'est arrêtée. */
  function settle() {
    clearTimeout(timer);
    timer = setTimeout(() => onSettle(cur), SETTLE_MS);
  }
  /** Toucher ou touche d'activation : réduit la feuille, ou la ramène à la position normale (jamais à l'agrandie). */
  const toggle = () => set(cur === 'default' ? 'collapsed' : 'default');

  // la poignée est un bouton ; sinon elle en prend le rôle et la prise au clavier
  if (grip.tagName !== 'BUTTON') {
    attr(grip, 'role', 'button');
    attr(grip, 'tabindex', '0');
  }

  // ---- le glisser : événements du pointeur sur l'en-tête, capturés dès l'appui (une souris qui sort de l'en-tête dans un
  // glisser rapide continue de lui parler)
  let d = null;
  on(head, 'pointerdown', e => {
    if (e.button > 0 || (ignore && e.target.closest(ignore)) || locked()) return;
    d = {
      id: e.pointerId,
      y0: e.clientY,
      h0: panel.offsetHeight,
      pos: cur,
      y: e.clientY,
      t: performance.now(),
      v: 0,
      on: false,
      grip: grip.contains(e.target)
    };
    try {
      head.setPointerCapture(e.pointerId);
    } catch {
      /* pointeur déjà fini ou événement synthétique (banc) : le glisser suit alors les événements de l'en-tête seuls */
    }
  });
  on(head, 'pointermove', e => {
    if (!d || e.pointerId !== d.id) return;
    if (!d.on) {
      if (Math.abs(e.clientY - d.y0) < SLOP) return;
      d.on = true;
      panel.classList.add('f-sheet-nt');
    }
    const hs = heights(),
      now = performance.now();
    if (now > d.t) d.v = .6 * d.v + .4 * ((e.clientY - d.y) / (now - d.t));
    d.y = e.clientY;
    d.t = now;
    panel.style.height = `${Math.round(Math.max(hs[0], Math.min(hs[2], d.h0 - (e.clientY - d.y0))))}px`;
  });
  const end = e => {
    if (!d || e.pointerId !== d.id) return;
    const was = d;
    d = null;
    if (!was.on) {
      // un toucher (ni glissé ni annulé) sur la poignée : réduit la feuille, ou la ramène à la position normale
      if (e.type === 'pointerup' && was.grip) toggle();
      return;
    }
    panel.classList.remove('f-sheet-nt');
    const hs = heights(),
      h = panel.offsetHeight;
    let i = hs.reduce((b, x, k) => Math.abs(x - h) < Math.abs(hs[b] - h) ? k : b, 0);
    if (Math.abs(was.v) > FLICK && e.type === 'pointerup') {
      const from = POSITIONS.indexOf(was.pos);
      i = was.v < 0 ? Math.min(2, from + 1) : Math.max(0, from - 1);
    }
    set(i);
  };
  on(head, 'pointerup', end);
  on(head, 'pointercancel', end);

  // ---- le clavier : Entrée, Espace (un bouton les rend en clic sans pointeur : le toucher et la souris sont traités
  // plus haut, au relâcher), flèches, début, fin
  on(grip, 'click', e => {
    if (e.detail) return;
    toggle();
  });
  on(grip, 'keydown', e => {
    const i = POSITIONS.indexOf(cur);
    if ((e.key === 'Enter' || e.key === ' ') && grip.tagName !== 'BUTTON') {
      e.preventDefault();
      return toggle();
    }
    const k = {
      ArrowUp: Math.min(2, i + 1),
      ArrowDown: Math.max(0, i - 1),
      Home: 0,
      End: 2
    } [e.key];
    if (k == null) return;
    e.preventDefault();
    set(k);
  });
  // la transition de hauteur finie : la taille s'est arrêtée
  on(panel, 'transitionend', e => {
    if (e.target === panel && e.propertyName === 'height') settle();
  });

  // placement de départ : sans glissement et sans onSettle (rien n'a changé pour la vue)
  set(cur, true);
  clearTimeout(timer);

  return {
    get pos() {
      return cur;
    },
    set,
    settle,
    stop() {
      ac.abort();
      clearTimeout(timer);
    }
  };
}
