// V3 data — dessine la carte des zones à cocher (SPEC § 3, § 11) : contours d'aerodb, teintes, règle des 44 px, une zone cochée ou décochée dans la sélection du module. N'écrit rien
// d'autre que cette sélection et ne lit jamais la liste dessinée.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  ask,
  esc,
  frozen,
  kind,
  li,
  S,
  tt
} from './state.js';
import {
  buildZones,
  itemName,
  procList,
  renderBuild
} from './panels.js';

/** Les contours des zones, demandés à `ctx.aerodb.zoneOutlines()` seul (jamais par adresse) au premier dessin d'un panneau avec carte, une fois ; sans réponse ou en
 *  échec : la liste seule, sans ligne d'erreur. Redessine quand ils arrivent. */
function loadOutlines() {
  if (S.outlines !== null) return;
  S.outlines = 'loading';
  const me = S;
  ask('zoneOutlines').then(o => {
    if (S !== me) return;
    S.outlines = o && typeof o === 'object' && Object.keys(o).length ? o : false;
    renderBuild();
  });
}
/** La largeur, en pixels, que la carte peut prendre (celle de l'écran moins les marges de la carte du panneau). */
export const mapWidth = () => Math.max(0, (S.body?.clientWidth || 0) - 40);
/** Le contour d'un élément de la carte : ceux des zones d'aerodb qu'il dessine (la zone elle-même pour la base, la France pour « LF », les États-Unis pour « K »), réunis ;
 *  null sans contour connu. */
function outlineOf(kind, id) {
  const zs = (kind === 'base' ? [id] : M.PROC_ZONES[id] || []).map(z => M.own(S.outlines, z)).filter(Boolean);
  if (!zs.length) return null;
  return {
    id,
    rings: zs.flatMap(z => z.rings || []),
    box: zs.map(z => z.box).reduce((b, x) => [Math.min(b[0], x[0]), Math.min(b[1], x[1]), Math.max(b[2], x[2]), Math.max(b[3], x[3])]),
    approx: zs.every(M.isApproxOutline) // le contour de chaque zone n'est qu'un cadre : tireté, dit en mots
  };
}
/** Les éléments que la carte dessine : ceux que la liste du panneau propose (zones de la couverture, États en bloc), avec leur contour. */
function mapEntries(kind) {
  const ids = kind === 'base' ? buildZones().ids : procList().map(i => i.id);
  return ids.map(id => outlineOf(kind, id)).filter(Boolean);
}
/** Le nom d'un élément de la carte dans la langue (celui des contours pour une zone, à défaut celui de zones()). */
function mapName(kind, id) {
  return kind === 'base' ? S.outlines[id]?.name?.[li()] || M.zoneName(S.d.zones, id, li()) : itemName('proc', id);
}
/** La teinte d'un élément : hors couverture, en cours (une opération du panneau le traite), à reconstruire (rien de publié ou cycle dépassé), à jour. */
function mapToneOf(kind, id) {
  const zone = kind === 'base' ? id : M.PROC_ZONES[id]?.[0],
    pub = S.d.pub,
    cycle = kind === 'base' ? M.baseOf(pub?.base, [zone]).cycle : pub?.proc?.inForce || null;
  return M.mapTone({
    inCoverage: S.d.cov.ids.includes(zone),
    running: !!S.run && S.run.set === kind && S.ids.includes(id),
    published: !!cycle,
    stale: !!cycle && M.staleLevel(S.airac, cycle, S.now) !== null
  });
}
/** La carte d'un panneau (`kind` : base ou proc), vue de la MÊME sélection que la liste (S.ticked, S.picked) : un trait épais et une teinte pleine pour une zone cochée,
 *  la teinte du jeton du cadre pour son état, le nom ET l'état en toutes lettres dans `title` et `aria-label`, une légende d'une ligne. Rien (la liste seule) sans contours,
 *  ou si l'une des zones à cocher fait moins de 44 px à la largeur actuelle. */
export function zoneMapHtml(kind) {
  loadOutlines();
  if (!S.outlines || S.outlines === 'loading' || !S.airac) return '';
  S.mapW = mapWidth();
  const m = M.zoneMap(mapEntries(kind), S.mapW);
  if (!m || m.small) return '';
  const sel = kind === 'base' ? S.ticked : S.picked,
    off = frozen(),
    paths = m.shapes.map(sh => {
      const on = !!sel?.has(sh.id),
        tone = mapToneOf(kind, sh.id),
        label = `${mapName(kind, sh.id)} — ${tt(TX.mapTone[tone])}${on ? `, ${tt(TX.mapTicked)}` : ''}${sh.approx ? `, ${tt(TX.mapApprox)}` : ''}`;
      return `<path d="${sh.d}" fill-rule="evenodd" data-map-zone="${esc(sh.id)}" data-tone="${tone}"${sh.approx ? ' data-approx="true"' : ''} role="checkbox" aria-checked="${on}" tabindex="0"${off ? ' aria-disabled="true"' : ''} aria-label="${esc(label)}"><title>${esc(label)}</title></path>`;
    }).join('');
  return `<div class="d-map" data-zone-map="${kind}"><svg viewBox="${m.vb.join(' ')}" width="${m.w}" height="${m.h}" role="group" aria-label="${esc(tt(TX.zoneMap[kind]))}">${paths}</svg>
    <p class="f-muted" data-zone-legend>${esc(tt(TX.mapLegend))} :${['ok', 'warn', 'accent', 'muted'].map(t => `<span class="d-sw" data-tone="${t}"></span>${esc(tt(TX.mapTone[t]))}`).join(' · ')}${m.shapes.some(sh => sh.approx) ? ` · ${esc(tt(TX.mapLegendApprox))}` : ''}. ${esc(tt(TX.mapLegendNote))}</p></div>`;
}
/** Coche ou décoche, dans la sélection du module (S.ticked pour la base, S.picked pour les États), l'élément d'une zone de la carte, puis redessine les panneaux : la carte
 *  et la liste se lisent toutes deux de cette sélection, jamais l'une de l'autre. Sans effet pendant une marche, ou pour un élément que la liste ne propose pas. */
export function toggleMapZone(el) {
  const kind = el.closest('[data-zone-map]')?.dataset.zoneMap,
    id = el.dataset.mapZone;
  if (frozen() || !S.d) return;
  const set = kind === 'base' && buildZones().ids.includes(id) ? S.ticked : kind === 'proc' && procList().some(i => i.id === id) ? S
    .picked : null;
  if (!set) return;
  if (set.has(id)) set.delete(id);
  else set.add(id);
  renderBuild();
}
