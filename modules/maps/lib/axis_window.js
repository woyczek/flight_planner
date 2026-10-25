// V3 maps — fenêtre sur l'axe des distances d'un dessin vertical (V3_SPECIFICATION § 7.1, règle 20 : « zoomer le profil pour être précis »).
// Une aide, écrite une fois, pour le profil de la Carte et, plus tard, la coupe météo d'Atmosphère : le même geste sur les deux dessins.
// Sans état de module : chaque appel crée sa fenêtre ; elle ne dessine rien, n'écrit rien dans la page, n'arme aucun minuteur et ne garde
// rien (la fenêtre est une commodité de lecture que l'appelant garde pour la vie de la page, jamais sur l'appareil).
//   import { createAxisWindow } from '../maps/lib/axis_window.js';
//   const win = createAxisWindow(el, { total: () => totalNm, onChange: (from, to) => redraw(), min: 5, plot: () => ({ x0, x1 }) });
//   win.from, win.to        la fenêtre en NM (0 et total tant qu'elle est entière) ; win.zoomed : faux tant qu'elle est entière
//   win.set(from, to)       pose la fenêtre (bornée) ; win.reset() : le vol entier ; onChange n'est appelée que si la fenêtre change
//   win.active              vrai tant qu'un geste de la fenêtre est en cours : l'appelant ne traite alors pas ses propres pointeurs
//   win.stop()              retire les écouteurs
// Les gestes (écouteurs de `el`, en capture) :
//   · deux pointeurs (deux doigts) : pincement = zoom autour du centre des doigts, qui suivent aussi la fenêtre (deux doigts qui glissent
//     la déplacent) ; au moins `min` NM visibles, jamais hors [0, total] ;
//   · double toucher (deux appuis courts proches, 350 ms) ou double clic : le vol entier ;
//   · molette avec Ctrl (le pincement d'un pavé tactile aussi) : zoom autour du pointeur ; sans Ctrl, la molette reste à la page ;
//   · souris : glisser (au-delà de 4 px) déplace la fenêtre quand elle est resserrée ; entière, il n'y a rien à déplacer et le glisser reste
//     à l'appelant ;
//   · UN SEUL doigt (toucher, stylet) n'est jamais pris : c'est le curseur de lecture de l'appelant.
// Un doigt resté posé après un pincement ne rend pas la main à l'appelant avant que tous les doigts soient levés (pas de saut du curseur).
// `plot` rend { x0, x1 } : les abscisses (pixels, par rapport au bord gauche de `el`) du cadre de tracé, qui porte la fenêtre ; sans lui, la
// largeur de `el`. `enabled` : faux désarme tout (le mode Modifier de la Carte donne le glisser à ses propres gestes).

const EPS = 1e-6;
const TAP_MS = 350,
  TAP_PX = 12,
  DOUBLE_PX = 40,
  DRAG_PX = 4;

export function createAxisWindow(el, {
  total,
  onChange = () => {},
  min = 5,
  plot,
  enabled = () => true
} = {}) {
  const tot = () => Math.max(0, +(typeof total === 'function' ? total() : total) || 0);
  let w = null; // null : le vol entier ; sinon { from, to } en NM
  const pointers = new Map(); // pointerId → { x, y, type, x0, y0, t0, moved }
  let pinch = null, // { f, t, nm, d, mx } au moment où le second doigt se pose
    drag = null, // { x, f, t } glisser à la souris
    latched = false, // un pincement a eu lieu : la main n'est rendue qu'à la levée de tous les doigts
    lastTap = null;

  /** Fenêtre bornée : au moins `min` NM (jamais plus que le vol), dans [0, total], autour du centre demandé ; null si entière. */
  const bound = (from, to) => {
    const T = tot();
    if (!(T > 0) || !Number.isFinite(from) || !Number.isFinite(to)) return null;
    const least = Math.min(min, T);
    let span = Math.min(T, Math.max(least, to - from));
    const c = (from + to) / 2;
    let f = c - span / 2;
    f = Math.min(T - span, Math.max(0, f));
    const t = f + span;
    return f <= EPS && t >= T - EPS ? null : {
      from: f,
      to: t
    };
  };
  const same = (a, b) => (!a && !b) || (a && b && Math.abs(a.from - b.from) < EPS && Math.abs(a.to - b.to) < EPS);
  const api = {
    get from() {
      return w ? w.from : 0;
    },
    get to() {
      return w ? w.to : tot();
    },
    get zoomed() {
      return !!w;
    },
    get active() {
      return !!pinch || !!drag?.on || latched;
    },
    /** Pose la fenêtre ; vrai si elle a changé. quiet : sans appeler onChange (l'appelant redessine lui-même). */
    set(from, to, {
      quiet = false
    } = {}) {
      const n = bound(from, to);
      if (same(w, n)) return false;
      w = n;
      if (!quiet) onChange(api.from, api.to);
      return true;
    },
    reset(opts) {
      return api.set(0, tot(), opts);
    },
    stop() {
      for (const [ev, fn, o] of listeners) el.removeEventListener(ev, fn, o);
      pointers.clear();
      pinch = drag = lastTap = null;
      latched = false;
    }
  };

  const plotOf = () => {
    const r = el.getBoundingClientRect(),
      p = plot?.();
    return {
      left: r.left,
      x0: p ? p.x0 : 0,
      x1: p ? p.x1 : r.width
    };
  };
  /** Zoom d'un facteur autour de la distance nm, qui reste sous l'abscisse x (pixels du cadre de tracé : frac = fraction de sa largeur). */
  const zoomAround = (nm, frac, span) => {
    const s = Math.min(tot(), Math.max(Math.min(min, tot()), span));
    return api.set(nm - frac * s, nm - frac * s + s);
  };

  function down(e) {
    if (!enabled() || !(tot() > 0)) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      type: e.pointerType,
      x0: e.clientX,
      y0: e.clientY,
      t0: e.timeStamp,
      moved: false
    });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()],
      p = plotOf(),
        pw = Math.max(1, p.x1 - p.x0),
        mx = (a.x + b.x) / 2 - p.left,
        from = api.from,
        span = api.to - api.from;
      pinch = {
        f: from,
        span,
        nm: from + (mx - p.x0) / pw * span, // la distance sous le centre des doigts : elle y reste
        d: Math.max(8, Math.hypot(a.x - b.x, a.y - b.y))
      };
      latched = true;
      drag = null;
      lastTap = null;
      e.stopImmediatePropagation(); // le second doigt ne place pas le curseur de l'appelant
    } else if (e.pointerType === 'mouse' && w) drag = {
      x: e.clientX,
      f: w.from,
      t: w.to,
      on: false
    };
  }

  function move(e) {
    const q = pointers.get(e.pointerId);
    if (!q) return;
    q.x = e.clientX;
    q.y = e.clientY;
    if (Math.abs(q.x - q.x0) > TAP_PX || Math.abs(q.y - q.y0) > TAP_PX) q.moved = true;
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()],
      p = plotOf(),
        pw = Math.max(1, p.x1 - p.x0),
        mx = (a.x + b.x) / 2 - p.left,
        d = Math.max(8, Math.hypot(a.x - b.x, a.y - b.y)),
        T = tot(),
        span = Math.min(T, Math.max(Math.min(min, T), pinch.span * pinch.d / d)),
        frac = (mx - p.x0) / pw;
      api.set(pinch.nm - frac * span, pinch.nm - frac * span + span);
      e.stopImmediatePropagation();
    } else if (drag && e.pointerId === [...pointers.keys()][0]) {
      if (!drag.on && Math.abs(e.clientX - drag.x) > DRAG_PX) drag.on = true;
      if (drag.on) {
        const p = plotOf(),
          span = drag.t - drag.f,
          shift = (e.clientX - drag.x) / Math.max(1, p.x1 - p.x0) * span;
        api.set(drag.f - shift, drag.t - shift);
        e.stopImmediatePropagation();
      }
    } else if (latched) e.stopImmediatePropagation();
  }

  function up(e) {
    const q = pointers.get(e.pointerId);
    if (!q) return;
    pointers.delete(e.pointerId);
    const was = !!pinch || latched || drag?.on;
    if (pointers.size < 2) pinch = null;
    if (!pointers.size) latched = false;
    if (drag && e.pointerId) drag = null;
    if (was) return e.stopImmediatePropagation();
    // double toucher : deux appuis courts et proches (doigt ou stylet) ; la souris a son double clic
    if (e.type === 'pointerup' && q.type !== 'mouse' && !q.moved && e.timeStamp - q.t0 < TAP_MS) {
      const t = lastTap;
      if (t && e.timeStamp - t.at < TAP_MS && Math.hypot(e.clientX - t.x, e.clientY - t.y) < DOUBLE_PX) {
        lastTap = null;
        api.reset();
      } else lastTap = {
        at: e.timeStamp,
        x: e.clientX,
        y: e.clientY
      };
    } else lastTap = null;
  }

  function wheel(e) {
    if (!e.ctrlKey || !enabled() || !(tot() > 0)) return; // sans Ctrl, la molette reste à la page
    e.preventDefault();
    const p = plotOf(),
      pw = Math.max(1, p.x1 - p.x0),
      frac = Math.min(1, Math.max(0, (e.clientX - p.left - p.x0) / pw)),
      span = api.to - api.from,
      k = Math.exp(Math.max(-200, Math.min(200, e.deltaY * (e.deltaMode === 1 ? 16 : 1))) * .003);
    zoomAround(api.from + frac * span, frac, span * k);
  }

  function dbl(e) {
    if (!enabled() || e.pointerType === 'touch') return;
    api.reset();
  }

  const listeners = [
    ['pointerdown', down, true],
    ['pointermove', move, true],
    ['pointerup', up, true],
    ['pointercancel', up, true],
    ['wheel', wheel, {
      capture: true,
      passive: false
    }],
    ['dblclick', dbl, true]
  ];
  for (const [ev, fn, o] of listeners) el.addEventListener(ev, fn, o);
  return api;
}
