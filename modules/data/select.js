// V3 data — la sélection de plusieurs pays sur la carte (SOG-0262, lot D4 : un geste de l'utilisateur, perdu au lot A et rétabli). Maj + clic coche un pays ; Maj + glisser dessine un rectangle qui coche les pays qu'il touche ; au toucher, DEUX doigts posés une
// demi-seconde puis glissés dessinent le rectangle (un doigt fait défiler la page, deux doigts déplacent et pincent la carte : la règle du lot D2 reste, le rectangle n'existe que si les doigts ne bougent pas pendant la demi-seconde). Un bandeau sous la carte propose alors
// le geste du lot : « Ajouter à ma couverture (n) » pour les pays hors couverture, « Mettre à jour (n) » pour ceux de la couverture, « Annuler ». Un clic simple ouvre TOUJOURS la fiche. La sélection se vide après le geste, sur « Annuler » ou sur Échap. Rien ici n'écrit
// dans data/ : ajouter écrit la couverture du poste (addZones), mettre à jour est le verbe ordinaire (startUpdate).
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  count,
  esc,
  frozen,
  S,
  tt
} from './state.js';
import {
  renderBuild
} from './panels.js';
import {
  forgetReads,
  mainBoxOf,
  nameOf
} from './countries.js';
import {
  addZones
} from './screen.js';
import {
  startUpdate,
  updateGate
} from './update.js';
import {
  statusKnown
} from './status.js';

const ZONE = /^[a-z0-9_-]{2,12}$/;
/** Le temps de la pose des deux doigts avant le rectangle, et le glissement (pixels) au-delà duquel les doigts font un pincement. */
const HOLD_MS = 500;
const SLOP_PX = 14;
/** Un rectangle plus petit que ceci est un simple clic (le clic suit, il coche un pays). */
const MIN_PX = 6;
let timer = 0;

/** L'ensemble des pays choisis (créé avec l'état de la carte). */
const sel = () => S.cw.sel;
/** Coche ou décoche un pays (Maj + clic) ; le pays doit être connu de la carte. */
export function toggleSel(id) {
  if (!S?.cw || !ZONE.test(id || '') || frozen()) return;
  if (sel().has(id)) sel().delete(id);
  else sel().add(id);
  renderBuild();
}
/** Vide la sélection (Annuler, Échap, fin du geste). */
export function clearSel(redraw = true) {
  if (!S?.cw || !sel().size) return;
  sel().clear();
  if (redraw) renderBuild();
}
/** Y a-t-il des pays choisis ? */
export const hasSel = () => !!S?.cw && sel().size > 0;

// ------------------------------------------------------------------------------------------------ le rectangle
/** Les pays que le rectangle de fenêtre {x0, y0, x1, y1} touche : le cadre (sans outre-mer) de chaque pays dessiné, passé en pixels par la matrice du SVG. */
function rectIds(svg, r) {
  const m = svg.getScreenCTM();
  if (!m) return [];
  const [x0, x1] = [Math.min(r.x0, r.x1), Math.max(r.x0, r.x1)],
  [y0, y1] = [Math.min(r.y0, r.y1), Math.max(r.y0, r.y1)],
  out = [];
  for (const p of svg.querySelectorAll('path[data-zone]')) {
    const id = p.dataset.zone,
      b = mainBoxOf(id);
    if (!b) continue;
    const pts = [
      [b[0], -M.mercY(b[3])],
      [b[2], -M.mercY(b[1])]
    ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(m));
    if (Math.min(pts[0].x, pts[1].x) <= x1 && Math.max(pts[0].x, pts[1].x) >= x0 && Math.min(pts[0].y, pts[1].y) <= y1 && Math.max(pts[0].y,
        pts[1].y) >= y0) out.push(id);
  }
  return out;
}
/** La boîte du rectangle et son nombre, dans le cadre de la carte (créés au besoin : un redessin de la carte en route les efface). */
function boxEl(svg) {
  const frame = svg.closest('.d-mapframe');
  if (!frame) return null;
  let box = frame.querySelector('[data-rect]');
  if (!box) {
    box = document.createElement('div');
    box.className = 'd-rect';
    box.dataset.rect = '';
    const label = document.createElement('span');
    label.className = 'd-rect-count';
    label.dataset.rectCount = '';
    box.append(label);
    frame.append(box);
  }
  return box;
}
/** Dessine le rectangle en cours et dit le nombre de pays touchés (avant le relâchement). */
function draw() {
  const r = S.cw.rect;
  if (r && !r.svg.isConnected) r.svg = S.body?.querySelector('[data-wmap]') || r
    .svg; // un redessin de la carte en plein geste remplace le SVG : le rectangle suit le nouveau
  const box = r && boxEl(r.svg);
  if (!box) return;
  const f = r.svg.closest('.d-mapframe').getBoundingClientRect();
  r.ids = rectIds(r.svg, r);
  box.style.left = `${Math.min(r.x0, r.x1) - f.left}px`;
  box.style.top = `${Math.min(r.y0, r.y1) - f.top}px`;
  box.style.width = `${Math.abs(r.x1 - r.x0)}px`;
  box.style.height = `${Math.abs(r.y1 - r.y0)}px`;
  box.querySelector('[data-rect-count]').textContent = count('country', r.ids.length);
  box.hidden = false;
}
/** Commence un rectangle (`mode` : 'mouse' | 'touch') entre deux points de la fenêtre. */
function begin(mode, svg, x0, y0, x1, y1) {
  S.cw.rect = {
    mode,
    svg,
    x0,
    y0,
    x1,
    y1,
    ids: []
  };
  draw();
}
/** Finit le rectangle : ajoute les pays touchés à la sélection (au relâchement seulement) ; un rectangle de la taille d'un clic ne coche rien. */
function finish(commit) {
  const r = S.cw.rect;
  S.cw.rect = null;
  clearTimeout(timer);
  if (!r) return;
  r.svg.closest('.d-mapframe')?.querySelector('[data-rect]')?.setAttribute('hidden', '');
  const big = Math.hypot(r.x1 - r.x0, r.y1 - r.y0) >= MIN_PX;
  if (!commit || !big || frozen()) return;
  S.cw.mapDragEnd = Date.now() + 350; // le clic qui suit le relâchement n'ouvre aucune fiche
  for (const id of r.ids) sel().add(id);
  renderBuild();
}
/** Maj + appui (souris) sur la carte : le rectangle commence ; rend vrai quand le geste est pris. */
export function rectMouseDown(e, svg) {
  if (e.pointerType !== 'mouse' || e.button !== 0 || !e.shiftKey || frozen()) return false;
  begin('mouse', svg, e.clientX, e.clientY, e.clientX, e
    .clientY); // le pointeur n'est capturé qu'au premier vrai déplacement : un simple Maj + clic garde son pays pour cible
  e.preventDefault();
  return true;
}
/** Un mouvement de la souris pendant le rectangle ; rend vrai quand il est pris. */
export function rectMouseMove(e) {
  const r = S?.cw?.rect;
  if (!r || r.mode !== 'mouse') return false;
  r.x1 = e.clientX;
  r.y1 = e.clientY;
  if (!r.held && Math.hypot(r.x1 - r.x0, r.y1 - r.y0) >= MIN_PX) {
    r.held = true;
    try {
      r.svg.setPointerCapture(e.pointerId);
    } catch {
      /* le pointeur n'est plus là */
    }
  }
  draw();
  e.preventDefault();
  return true;
}
/** Le relâchement (ou l'annulation) de la souris : le rectangle finit ; rend vrai quand il est pris. */
export function rectMouseUp(e) {
  const r = S?.cw?.rect;
  if (!r || r.mode !== 'mouse') return false;
  finish(e.type === 'pointerup');
  return true;
}
/** Deux doigts posés sur la carte : la demi-seconde commence ; si les doigts n'ont pas bougé (au-delà de la tolérance) quand elle finit, le rectangle va de l'un à l'autre. `g` : le geste de mapview.js (`pts`, `svg`). */
export function holdStart(g) {
  clearTimeout(timer);
  if (frozen()) return;
  timer = setTimeout(() => {
    const pts = [...g.pts.values()];
    if (!S?.cw || g.pts.size !== 2 || g.rect || S.cw.rect || pts.some(p => Math.hypot(p.x - p.x0, p.y - p.y0) > SLOP_PX)) return;
    g.rect = true;
    g.last = null; // plus de pincement : les deux doigts dessinent
    begin('touch', g.svg, pts[0].x, pts[0].y, pts[1].x, pts[1].y);
  }, HOLD_MS);
}
/** Un mouvement à deux doigts : le rectangle les suit ; des doigts qui bougent avant la fin de la demi-seconde sont un pincement (aucun rectangle). Rend vrai quand le rectangle est en route. */
export function holdMove(g) {
  const pts = [...g.pts.values()];
  if (g.rect && S.cw.rect) {
    if (pts.length >= 2) {
      const r = S.cw.rect;
      [r.x0, r.y0, r.x1, r.y1] = [pts[0].x, pts[0].y, pts[1].x, pts[1].y];
      draw();
    }
    return true;
  }
  if (pts.some(p => Math.hypot(p.x - p.x0, p.y - p.y0) > SLOP_PX)) clearTimeout(timer);
  return false;
}
/** Un doigt se lève : le rectangle à deux doigts finit (au relâchement, pas à l'annulation) ; la demi-seconde en attente est abandonnée. */
export function holdEnd(g, commit) {
  clearTimeout(timer);
  if (!g.rect) return;
  g.rect = false;
  finish(commit);
}

// ------------------------------------------------------------------------------------------------ le bandeau
/** Les pays choisis, séparés : [ceux de la couverture, ceux hors couverture]. */
function split() {
  const cov = new Set(S.d?.cov?.ids || []),
    ids = [...sel()];
  return [ids.filter(id => cov.has(id)), ids.filter(id => !cov.has(id) && (S.d?.zones || []).some(z => z.id === id))];
}
/** Le bandeau sous la carte quand des pays sont choisis : leur nombre et leurs noms, « Ajouter à ma couverture (n) » pour ceux qui n'y sont pas, « Mettre à jour (n) » pour ceux qui y sont, « Annuler » ; sous chaque geste, ce qu'il fait. '' sans sélection. */
export function selBarHtml() {
  if (!S?.cw || !sel().size) return '';
  const [inCov, out] = split(),
    T = TX.d4,
    names = [...sel()].slice(0, 4).map(nameOf).join(', ') + (sel().size > 4 ? '…' : ''),
    gate = inCov.length ? updateGate(inCov) : null,
    plan = inCov.length && S.status && statusKnown() ? M.downloadPlan(S.status, inCov) : null,
    z = n => count('zone', n),
    doing = plan ? [plan.fetch.length ? tt(TX.upd.doDl, {
      z: z(plan.fetch.length)
    }) : '', plan.build.length ? tt(TX.upd.doBuild, {
      z: z(plan.build.length)
    }) : ''].filter(Boolean) : [],
    off = frozen();
  return `<div class="d-selbar" data-sel-bar role="group" aria-label="${esc(tt(T.selLabel))}"><p class="d-sellines" data-sel-line><b>${esc(count('country', sel().size))}</b> <span class="f-muted">${esc(names)}</span></p>
    <p class="d-verbs">${out.length ? `<button type="button" class="primary" data-act="sel-add"${off ? ' disabled' : ''}>${esc(tt(T.selAdd, { n: out.length }))}</button>` : ''}${inCov.length ? `<button type="button"${out.length ? '' : ' class="primary"'} data-act="sel-update"${gate.disabled || off ? ' disabled' : ''}>${esc(tt(T.selUpdate, { n: inCov.length }))}</button>` : ''}<button type="button" data-act="sel-cancel">${esc(tt(T.selCancel))}</button></p>
    ${out.length ? `<p class="f-muted" data-sel-plan="add">${esc(tt(T.selAddNote, { n: out.length }))}</p>` : ''}${inCov.length ? `<p class="f-muted" data-sel-plan="update">${esc(doing.length ? tt(T.selUpdateNote, { l: doing.join(', ') }) : tt(T.selUpdateNone))}</p>` : ''}${gate?.disabled && !off ? `<p class="f-muted" data-sel-reason="${esc(gate.reason)}">${esc(tt(M.own(TX.greyReason, gate.reason) || TX.greyReason.busy))}</p>` : ''}</div>`;
}
/** « Ajouter à ma couverture (n) » : les pays choisis hors couverture y entrent (la couverture du poste est écrite, rien n'est téléchargé) ; la sélection se vide. */
export function selAdd() {
  if (!S?.d || frozen()) return;
  const [, out] = split(),
    n = addZones(out);
  sel().clear();
  if (n) {
    S.ctx.notify(tt(TX.d4.selAdded, {
      n: count('country', n)
    }), 'ok');
    forgetReads(false, true);
  }
  renderBuild();
}
/** « Mettre à jour (n) » : le verbe ordinaire sur les pays choisis qui sont dans la couverture ; la sélection se vide d'abord (le geste est pris). */
export function selUpdate() {
  if (!S?.d) return;
  const [inCov] = split();
  if (!inCov.length || updateGate(inCov).disabled) return;
  sel().clear();
  startUpdate(inCov);
}
