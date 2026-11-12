// V3 data — le zoom et le déplacement de la carte du monde (SOG-0262, lot D1) : la molette, le pincement à deux doigts, le glisser et les boutons « + » / « − » / « Voir le monde entier » / « Recentrer sur ma couverture » (le cadre de départ). La vue est un cadre
// [x, y, l, h] gardé dans S.cw.view : la carte est redessinée avec le panneau (innerHTML), elle reprend alors sa vue ; pendant un geste seul l'attribut viewBox du SVG bouge. Un glisser n'ouvre jamais la fiche d'un pays (le toucher qui suit est avalé).
// Au toucher, UN doigt fait défiler la PAGE (touch-action: pan-y sur la carte) et DEUX doigts déplacent et pincent la carte ; un appui bref sur un pays ouvre sa fiche. À la souris : Ctrl + molette zoome (la molette seule aussi quand la page n'a rien à défiler), glisser déplace.
// Le contour bleu du paquet ouvert et le plein du survol sont des attributs des chemins (trait non mis à l'échelle) : ils survivent au zoom.
import * as M from './model.js';
import {
  S
} from './state.js';
import {
  clampView,
  okBox,
  panBy,
  zoomAt
} from './model_mapview.js';
import {
  renderBuild
} from './panels.js';
import {
  holdEnd,
  holdMove,
  holdStart,
  rectMouseDown,
  rectMouseMove,
  rectMouseUp
} from './select.js';

/** Un cadre lu dans un attribut « x y l h » du SVG ; null sans cadre lisible. */
function boxAttr(svg, name) {
  const b = String(svg?.getAttribute(name) || '').trim().split(/\s+/).map(Number);
  return okBox(b) ? b : null;
}
/** Le SVG de la carte du monde et ses trois cadres : la vue courante, le cadre de départ (data-base) et le monde (data-world) ; null sans carte. */
function mapOf(el) {
  const svg = (el?.closest ? el.closest('[data-wmap]') : null) || S?.body?.querySelector('[data-wmap]'),
    view = boxAttr(svg, 'viewBox'),
    base = boxAttr(svg, 'data-base'),
    world = boxAttr(svg, 'data-world');
  return svg && view && base && world ? {
    svg,
    view,
    base,
    world
  } : null;
}
/** Le point (en unités du chemin) sous des coordonnées de la fenêtre. */
function toUnits(svg, x, y) {
  const m = svg.getScreenCTM();
  if (!m) return null;
  const p = new DOMPoint(x, y).matrixTransform(m.inverse());
  return [p.x, p.y];
}
/** Pose la vue : l'attribut du SVG, et le cadre gardé pour les redessins (avec le cadre de départ qu'il suppose : un autre cadre de départ l'annule). */
function setView(m, box) {
  m.svg.setAttribute('viewBox', box.join(' '));
  S.cw.view = {
    box,
    key: m.base.join(' ')
  };
  const home = m.svg.closest('[data-world-map]')?.querySelector('[data-act="map-home"]');
  if (home) home.dataset.zoomed = Math.abs(box[2] - m.base[2]) > 1e-6 || Math.abs(box[0] - m.base[0]) > 1e-6 || Math.abs(box[1] - m.base[
    1]) > 1e-6 ? '1' : '';
}
/** La vue que le dessin de la carte donne au SVG : celle d'un geste de zoom tant que le cadre de départ est le même, sinon le cadre de départ. */
export function viewFor(base) {
  const v = S?.cw?.view;
  return v && v.key === base.join(' ') && okBox(v.box) ? v.box : base;
}
/** La page a-t-elle quelque chose à faire défiler sous la carte ? Le premier ancêtre qui défile (ou le document) a plus de hauteur que sa fenêtre. */
function pageScrolls(el) {
  for (let n = el?.parentElement; n && n !== document.documentElement; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight - n.clientHeight > 2) return true;
  }
  const d = document.scrollingElement;
  return !!d && d.scrollHeight - d.clientHeight > 2;
}
/** Un cran de molette : zoom autour du pointeur, borné ; avec Ctrl (aussi le pincement d'un pavé tactile) toujours, sans Ctrl seulement quand la page n'a rien à défiler — sinon la molette fait défiler la page. */
export function mapWheel(e) {
  const m = mapOf(e.target);
  if (!m || !S.cw) return;
  if (!e.ctrlKey && pageScrolls(m.svg)) return;
  e.preventDefault();
  const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 100 : e.deltaY,
    f = Math.exp(Math.max(-300, Math.min(300, dy)) * .0016),
    at = toUnits(m.svg, e.clientX, e.clientY);
  if (at) setView(m, zoomAt(m.view, at[0], at[1], f, m.base, m.world));
}
/** Un bouton « + » ou « − » : zoom autour du centre de la vue. */
export function mapZoomButton(dir) {
  const m = mapOf(null);
  if (!m || !S.cw) return;
  setView(m, zoomAt(m.view, m.view[0] + m.view[2] / 2, m.view[1] + m.view[3] / 2, dir === 'in' ? .6 : 1 / .6, m.base, m.world));
}
/** « Voir le monde entier » : le cadre du monde (sans zoom gardé). */
export function mapWorld() {
  S.cw.world = true;
  S.cw.home = false;
  S.cw.view = null;
  renderBuild();
}
/** « Recentrer sur ma couverture » : le cadre de départ de la couverture. */
export function mapHome() {
  S.cw.world = false;
  S.cw.home = true;
  S.cw.view = null;
  renderBuild();
}
/** Le toucher qui suit un glisser est avalé : il n'ouvre aucune fiche. */
export function mapClickGuard(e) {
  if (!S?.cw?.mapDragEnd || Date.now() > S.cw.mapDragEnd || !e.target.closest?.('[data-wmap]')) return;
  e.stopPropagation();
  e.preventDefault();
  S.cw.mapDragEnd = 0;
}
const DRAG = 5; // pixels de la fenêtre au-delà desquels un appui devient un glisser
/** Un appui sur la carte : la souris peut glisser, un doigt fait défiler la page, deux doigts déplacent et pincent ; ne capture le pointeur qu'au premier mouvement (un simple toucher garde sa cible et ouvre la fiche). */
export function mapDown(e) {
  const m = mapOf(e.target);
  if (!m || !S.cw || (e.pointerType === 'mouse' && e.button !== 0)) return;
  if (rectMouseDown(e, m.svg)) return; // Maj + glisser : le rectangle de sélection (select.js), pas le déplacement de la carte
  const g = S.cw.mapG ||= {
    pts: new Map(),
    moved: false
  };
  g.pts.set(e.pointerId, {
    x: e.clientX,
    y: e.clientY,
    x0: e.clientX,
    y0: e.clientY
  });
  g.svg = m.svg;
  if (g.pts.size === 2) {
    g.moved = true;
    g.last = pinchOf(g);
    if (e.pointerType === 'touch') holdStart(g); // deux doigts immobiles une demi-seconde : le rectangle de sélection (select.js)
  }
}
/** Le centre et l'écart des deux premiers doigts. */
function pinchOf(g) {
  const [a, b] = [...g.pts.values()];
  return {
    cx: (a.x + b.x) / 2,
    cy: (a.y + b.y) / 2,
    d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y))
  };
}
/** Un mouvement : un doigt déplace la vue (au-delà du seuil), deux doigts zooment autour de leur centre et la déplacent avec lui. */
export function mapMove(e) {
  if (rectMouseMove(e)) return;
  const g = S?.cw?.mapG;
  if (!g || !g.pts.has(e.pointerId) || !g.svg?.isConnected) return;
  const p = g.pts.get(e.pointerId),
    m = mapOf(g.svg);
  if (!m) return;
  const dx = e.clientX - p.x,
    dy = e.clientY - p.y;
  p.x = e.clientX;
  p.y = e.clientY;
  if (g.pts.size >= 2) {
    if (holdMove(g)) {
      e.preventDefault(); // le rectangle suit les deux doigts : ni déplacement ni pincement
      return;
    }
    const now = pinchOf(g),
      last = g.last || now,
      at = toUnits(m.svg, now.cx, now.cy);
    if (at) {
      let box = zoomAt(m.view, at[0], at[1], last.d / now.d, m.base, m.world);
      const a = toUnits(m.svg, last.cx, last.cy);
      if (a) box = panBy(box, a[0] - at[0], a[1] - at[1], m.base, m.world);
      setView(m, box);
    }
    g.last = now;
    e.preventDefault();
    return;
  }
  if (e.pointerType === 'touch') return; // un seul doigt : la page défile, la carte ne bouge pas (deux doigts la déplacent)
  if (!g.moved && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < DRAG) return;
  if (!g.moved) {
    g.moved = true;
    try {
      m.svg.setPointerCapture(e.pointerId);
    } catch {
      /* le pointeur n'est plus là */
    }
  }
  const k = m.svg.getScreenCTM()?.a || 1;
  setView(m, panBy(m.view, -dx / k, -dy / k, m.base, m.world));
  e.preventDefault();
}
/** Un relâchement ou une annulation : le geste finit ; après un glisser, le toucher qui suit est avalé un instant. */
export function mapUp(e) {
  if (rectMouseUp(e)) return;
  const g = S?.cw?.mapG;
  if (!g || !g.pts.has(e.pointerId)) return;
  holdEnd(g, e.type === 'pointerup');
  g.pts.delete(e.pointerId);
  g.last = null;
  if (g.pts.size === 0) {
    if (g.moved) S.cw.mapDragEnd = Date.now() + 350;
    S.cw.mapG = null;
  }
}
/** Le cadre de départ d'un dessin : celui de la couverture, ou le monde entier ; borné par M.frameOf. Rend { base, world, view }. */
export function framesOf(base) {
  const world = M.worldFrame(),
    v = viewFor(base);
  return {
    base,
    world,
    view: v === base ? base : clampView(v, base, world)
  };
}
