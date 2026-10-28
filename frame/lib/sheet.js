// Feuille à trois positions, primitive du cadre (frame/INTEGRATION.md § 11, règles dans frame/design/primitives.css).
//
// Une feuille de hauteur fixe au bas d'une vue fixe (carte, coupe, …) : réduite (sa ligne d'en-tête seule), normale,
// agrandie. Son en-tête est la poignée : un glisser la tire, un coup de pouce la fait passer à la position suivante, un
// toucher la réduit ou la ramène à la normale (jamais à l'agrandie), le clavier la règle. La feuille ne sait pas ce qu'elle
// contient et n'écrit aucun texte : les libellés viennent de l'appelant (labels). Aucun état de module : la position gardée
// d'un montage à l'autre est l'affaire de l'appelant (il la repasse en `pos`, onChange la lui donne).
//
// Un seul état, la position (`cur`) ; au repos, la hauteur de la feuille est celle de la feuille de style (`data-sheet` sur la
// racine, jetons --f-sheet-*) et rien d'autre : aucune hauteur écrite par ce script. Hauteurs : jetons lus sur la racine
// (« <n>% » : part de la hauteur de la racine, ou « <n>px » ; rien d'autre n'est lu).
//
// Le mouvement (un glisser, ou le glissement d'une position à l'autre) passe par UNE variable : --f-sheet-live, la taille de la
// feuille en pixels, posée en ligne tant que la feuille bouge (hauteur, ou largeur d'une colonne : « height: var(--f-sheet-live) »)
// et retirée à la fin. Sous le doigt : une écriture par mouvement, seulement si la taille change, aucune lecture. Au lâcher, la
// feuille glisse (animation de 200 ms) jusqu'à la taille de sa position, la variable est retirée (la hauteur est alors celle de la
// feuille de style, posée une fois) et onSettle est appelé tout de suite : la taille est arrêtée. Pendant tout le mouvement, onSettle
// n'est jamais appelé : le module ne redessine rien (la carte garde son bitmap, le dessin son canvas), il reprend à la fin. Aucune
// écriture dans le DOM si la valeur ne change pas ; aucun minuteur de rattrapage (le délai de 120 ms ne sert qu'à un changement de
// taille venu d'ailleurs : settle()).
//
// Poignée nue : quand le contenu est un dessin, le module pose la classe `f-sheet-head-bare` sur `head` (une ligne de 28 px, pas de
// titre, les boutons à droite ; frame/INTEGRATION.md § 11). La primitive n'a rien à savoir de plus : la hauteur de la position
// réduite et le plancher du glisser sont la hauteur mesurée de l'en-tête, pas une constante.
//
// Paysage sur un téléphone (<html class="f-land">, posé par le cadre : frame/INTEGRATION.md § 11) : la feuille est une colonne à
// droite de la carte, à deux positions (normale, agrandie) ; la largeur remplace la hauteur (jetons --f-sheet-side, -side-min,
// -side-max, parts de la largeur de la racine), le toucher de la poignée bascule entre les deux, un glisser horizontal aussi, et
// la position « réduite » n'existe pas (elle devient « normale »). Les positions rendues à onChange et onSettle sont les mêmes
// noms : le module n'a rien à changer.

/** Les trois positions, de la plus basse à la plus haute. */
export const POSITIONS = ['collapsed', 'default', 'expanded'];

/** Au-delà de cette vitesse (px par ms) un glisser lâché est un coup de pouce : position suivante, pas la plus proche. */
const FLICK = .8;
/** Délai (ms) entre le dernier changement de taille venu d'ailleurs (settle()) ou un changement sans glissement et onSettle. */
const SETTLE_MS = 120;
/** Distance (px) à partir de laquelle un toucher devient un glisser. */
const SLOP = 6;
/** Durée (ms) du glissement jusqu'à la position. */
const GLIDE_MS = 200;

/** Paysage sur un téléphone : la feuille est une colonne (classe posée par le cadre sur <html>). */
const sideways = () => document.documentElement.classList.contains('f-land');

/** Nom d'une position à partir d'un nom ou d'un rang (0, 1, 2) ; le rang est borné. En colonne (paysage), pas de position réduite. */
const norm = p => {
  const n = typeof p === 'number' ? POSITIONS[Math.max(0, Math.min(2, Math.round(p)))] : POSITIONS.includes(p) ? p : 'default';
  return n === 'collapsed' && sideways() ? 'default' : n;
};

/** Longueur d'un jeton : « 38% » est une part de la longueur h (hauteur de la racine ; sa largeur en paysage), « 170px » (ou un
 *  nombre) des pixels. */
const len = (v, h) => {
  const n = parseFloat(v) || 0;
  return String(v).includes('%') ? n * h / 100 : n;
};

/**
 * createSheet({ root, panel, head, grip, pos, ignore, labels, locked, onChange, onSettle }) → { pos, set, settle, stop }
 *
 * - root : l'élément qui porte `data-sheet` (la position) et les jetons --f-sheet-* ; la hauteur des positions est une
 *   part de la sienne (hauteur de contenu), et panel en est un enfant direct (`.f-sheet > .f-sheet-panel`)
 * - panel : la feuille elle-même, dont la hauteur suit `data-sheet` (feuille de style) ; en mouvement, sa taille est portée par la
 *   variable --f-sheet-live (en ligne) et elle porte la classe `f-sheet-nt` sous le doigt
 * - head : la ligne d'en-tête, qui reçoit le glisser (événements du pointeur sur elle seule : la carte garde les siens)
 * - grip : le bouton de la poignée, dans head (un <button> ; sinon il reçoit role="button" et tabindex)
 * - pos : position de départ, 'collapsed' | 'default' | 'expanded' (par défaut 'default')
 * - ignore : sélecteur de ce qui, dans head, ne tire pas (la bascule, le ✕)
 * - labels : le libellé de la poignée selon la position, `(pos, rang) => texte` ou `{ collapsed, default, expanded }` ;
 *   il devient l'infobulle et l'aria-label de la poignée ; sans labels, elle garde les siens
 * - locked : () => vrai quand les gestes du pointeur sont refusés (glisser, toucher) ; le clavier reste
 * - onChange : (pos) à chaque changement de position, y compris au lâcher d'un glisser
 * - onSettle : (pos) une fois que la taille de la feuille (et donc celle de la carte) s'est arrêtée : tout de suite à la fin du
 *   glissement, 120 ms après un changement sans glissement ou un settle() ; jamais pendant un glisser ni un glissement : la
 *   carte reprend sa taille et se recadre
 *
 * pos : la position courante. set(pos, instant) : met la feuille à une position (nom ou rang), instant la place sans glissement ;
 * settle() : relance le délai de onSettle (à appeler quand la taille de la vue a changé autrement ; sans effet pendant un
 * mouvement, la fin du mouvement appelle onSettle) ; stop() : retire les écouteurs, le mouvement en cours et le délai.
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
    timer = 0,
    /** Le mouvement, tant que la feuille bouge : { side, h, anim } (h : la taille actuelle en pixels, anim : le glissement en
     *  cours), sinon null. */
    moving = null;

  /** La taille de la feuille (hauteur, largeur en colonne), lue telle qu'elle est à l'écran. */
  const size = side => panel.getBoundingClientRect()[side ? 'width' : 'height'];
  /** La hauteur de la feuille réduite : la ligne d'en-tête telle qu'elle est (44 px, ou la poignée nue de 28 px : classe
   *  `f-sheet-head-bare` posée par le module, frame/INTEGRATION.md § 11) et le filet du haut, mesurés ; le jeton --f-sheet-head
   *  ne sert que si l'en-tête n'a pas de boîte (feuille cachée). */
  const headBox = () => {
    const hh = head.getBoundingClientRect().height;
    return hh ? hh + (parseFloat(getComputedStyle(panel).borderTopWidth) || 0) : len(getComputedStyle(root).getPropertyValue(
      '--f-sheet-head').trim(), 0);
  };
  /** Tailles en pixels des trois positions, lues dans les jetons de la racine : l'en-tête seul, le milieu (part de la
   *  racine, avec son plancher), l'agrandie (idem). En colonne : les largeurs ; réduite = normale. */
  function heights(side) {
    const cs = getComputedStyle(root),
      t = k => cs.getPropertyValue(`--f-sheet-${k}`).trim();
    if (side) {
      const w = root.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0),
        d = Math.max(len(t('side'), w), len(t('side-min'), w));
      return [d, d, Math.max(len(t('side-max'), w), len(t('side-min'), w))];
    }
    const h = root.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
    return [headBox(), Math.max(len(t('default'), h), len(t('default-min'), h)), Math.max(len(t('expanded'), h), len(t(
      'expanded-min'), h))];
  }
  /** Le libellé de la poignée pour une position. */
  const tip = p => typeof labels === 'function' ? labels(p, POSITIONS.indexOf(p)) : labels?.[p];
  /** Écrit un attribut seulement s'il change. */
  const attr = (el, k, v) => {
    if (el.getAttribute(k) !== v) el.setAttribute(k, v);
  };
  /** Écrit une propriété de style seulement si elle change. */
  const css = (k, v) => {
    if (panel.style.getPropertyValue(k) !== v) panel.style.setProperty(k, v);
  };

  // ---- le mouvement : une variable, la taille de la feuille
  /** Commence : la feuille a la taille `h`, portée par --f-sheet-live (hauteur, ou largeur d'une colonne). */
  function pin(side, h) {
    clearTimeout(timer); // un onSettle en attente tomberait au milieu du mouvement : la fin du mouvement l'appelle
    timer = 0;
    moving = {
      side,
      h,
      anim: null
    };
    css('--f-sheet-live', `${h}px`);
    css(side ? 'width' : 'height', 'var(--f-sheet-live)');
  }
  /** Change la taille de la feuille (une seule écriture). */
  function live(h) {
    if (moving.h === h) return;
    moving.h = h;
    css('--f-sheet-live', `${h}px`);
  }
  /** Interrompt le glissement en cours : la feuille reste à la taille où il l'a laissée. */
  function halt() {
    const a = moving.anim;
    if (!a) return;
    moving.anim = null;
    live(size(moving.side)); // lue avant le retrait de l'animation : l'écriture et le retrait tombent dans la même image
    a.cancel();
  }
  /** Fin du mouvement : la hauteur redevient celle de la feuille de style (une écriture, la dernière). */
  function unpin() {
    if (!moving) return;
    moving.anim?.cancel();
    moving = null;
    panel.classList.remove('f-sheet-nt');
    for (const k of ['height', 'width', '--f-sheet-live']) panel.style.removeProperty(k);
  }
  /** Fin du mouvement : la taille est arrêtée, onSettle tout de suite. */
  function done() {
    unpin();
    flush();
  }
  /** Glisse de la taille actuelle à `to` (la taille de la position visée), puis termine le mouvement. `was` : la taille de la feuille
   *  mesurée avant tout changement (hors mouvement). Faux si la feuille y est déjà (rien ne bouge). */
  function glide(to, was) {
    const side = sideways();
    if (moving) halt(); // lâchée en route (ou saisie puis lâchée) : la taille actuelle est celle où elle est
    else {
      if (Math.abs(was - to) < .5) return false;
      pin(side, was);
    }
    panel.classList.remove('f-sheet-nt');
    const from = moving.h;
    if (Math.abs(from - to) < .5 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      done();
      return true;
    }
    const a = moving.anim = panel.animate({
      [side ? 'width' : 'height']: [`${from}px`, `${to}px`]
    }, {
      duration: GLIDE_MS,
      easing: 'ease'
    });
    live(to); // sous l'animation : la valeur qui reste quand elle finit
    a.onfinish = () => {
      if (moving?.anim === a) done();
    };
    return true;
  }

  /** Met la feuille à une position (nom ou rang). instant : sans glissement (le contenu va être mesuré). */
  function set(p, instant = false) {
    p = norm(p);
    const side = sideways(),
      glides = !instant && panel.getClientRects().length > 0, // une feuille cachée n'a rien à faire glisser
      was = glides && !moving ? size(side) : 0; // où elle est, avant que onChange ne change l'en-tête et data-sheet la hauteur
    cur = p;
    onChange(p);
    const text = tip(p);
    if (text != null) {
      if (grip.title !== text) grip.title = text;
      attr(grip, 'aria-label', text);
    }
    attr(grip, 'aria-expanded', String(p !== 'collapsed'));
    const to = glides ? heights(side)[POSITIONS.indexOf(p)] : 0; // la cible du glissement, lue dans les jetons
    if (root.dataset.sheet !== p) root.dataset.sheet = p;
    if (glides) {
      if (glide(to, was)) return; // onSettle viendra de la fin du glissement
    } else {
      unpin();
      if (instant) {
        // pas de glissement : la classe dit « sous le doigt » aux modules qui ne dessinent pas pendant un mouvement, une image
        panel.classList.add('f-sheet-nt');
        requestAnimationFrame(() => panel.classList.remove('f-sheet-nt'));
        void panel.offsetHeight; // mesure possible tout de suite (hauteur à jour)
      }
    }
    settle();
  }
  /** onSettle, tout de suite. */
  function flush() {
    clearTimeout(timer);
    timer = 0;
    onSettle(cur);
  }
  /** Après un changement de taille venu d'ailleurs : onSettle, en une fois, 120 ms plus tard ; pendant un mouvement, rien (la fin
   *  du mouvement appelle onSettle). */
  function settle() {
    clearTimeout(timer);
    timer = moving ? 0 : setTimeout(flush, SETTLE_MS);
  }
  /** Toucher ou touche d'activation : réduit la feuille, ou la ramène à la position normale (jamais à l'agrandie) ; en colonne
   *  (paysage), bascule entre la normale et l'agrandie. */
  const toggle = () => set(sideways() ? cur === 'default' ? 'expanded' : 'default' : cur === 'default' ? 'collapsed' : 'default');

  // la poignée est un bouton ; sinon elle en prend le rôle et la prise au clavier
  if (grip.tagName !== 'BUTTON') {
    attr(grip, 'role', 'button');
    attr(grip, 'tabindex', '0');
  }

  // ---- le glisser : événements du pointeur sur l'en-tête, capturés dès l'appui (une souris qui sort de l'en-tête dans un
  // glisser rapide continue de lui parler). Sous le doigt, une seule écriture par mouvement (la variable), et
  // seulement si la taille change ; rien n'est lu pendant le glisser.
  let d = null;
  on(head, 'pointerdown', e => {
    if (e.button > 0 || (ignore && e.target.closest(ignore)) || locked()) return;
    const side = sideways(),
      at = side ? e.clientX : e.clientY;
    d = {
      id: e.pointerId,
      side,
      at0: at,
      at,
      t: performance.now(),
      v: 0,
      on: false,
      size0: 0,
      hs: null,
      pos: cur,
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
    const at = d.side ? e.clientX : e.clientY;
    if (!d.on) {
      if (Math.abs(at - d.at0) < SLOP) return;
      // le doigt prend la feuille : mesures (une fois), variable, marque « sous le doigt »
      d.on = true;
      d.hs = heights(d.side);
      if (moving) {
        halt(); // saisie pendant un glissement : il s'arrête là où elle est
        d.size0 = moving.h;
      } else {
        d.size0 = size(d.side);
        pin(d.side, d.size0);
      }
      panel.classList.add('f-sheet-nt');
    }
    const now = performance.now();
    if (now > d.t) d.v = .6 * d.v + .4 * ((at - d.at) / (now - d.t));
    d.at = at;
    d.t = now;
    // la taille suit le doigt vers le haut ; la largeur d'une colonne (à droite de la carte), vers la gauche
    live(Math.round(Math.max(d.hs[0], Math.min(d.hs[2], d.size0 - (at - d.at0)))));
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
    const hs = was.hs,
      h = moving ? moving.h : size(was.side);
    let i = hs.reduce((b, x, k) => Math.abs(x - h) < Math.abs(hs[b] - h) ? k : b, 0);
    if (was.side && i === 0) i = 1; // la colonne n'a que deux positions : normale (rang 1) et agrandie (rang 2)
    if (Math.abs(was.v) > FLICK && e.type === 'pointerup') {
      const from = POSITIONS.indexOf(was.pos);
      i = was.v < 0 ? Math.min(2, from + 1) : Math.max(was.side ? 1 : 0, from - 1);
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
      // une colonne à droite de la carte s'agrandit vers la gauche
      ArrowLeft: sideways() ? 2 : null,
      ArrowRight: sideways() ? 1 : null,
      Home: 0,
      End: 2
    } [e.key];
    if (k == null) return;
    e.preventDefault();
    set(k);
  });
  // le téléphone tourne : le cadre pose ou retire f-land puis le dit ; la feuille reprend sa position dans sa nouvelle forme
  // (l'onglet réduit du portrait devient la colonne normale), sans glissement
  on(window, 'frame-orientation', () => {
    d = null;
    set(cur, true);
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
      unpin();
    }
  };
}
