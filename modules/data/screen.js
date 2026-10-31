// V3 data — l'écran en lecture seule (SPEC § 11) : l'en-tête, la couverture et ses États, les lignes des groupes, le journal, la lecture de ce qu'aerodb publie (load) et le dessin d'ensemble (render).
// Ne lance aucune opération et ne dessine pas les panneaux de jeux (panels.js).
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  keepScroll
} from '../../frame/lib/dom.js'; // un rendu ne bouge ni le défilement ni la frappe
import {
  fmtDateZ
} from '../../frame/lib/time.js'; // heures en UTC (« 16:30Z »)
import {
  ask,
  catSource,
  count,
  COVERAGE,
  esc,
  frozen,
  JOURNAL,
  kind,
  lang,
  li,
  S,
  tt,
  VERBS_ROUTE
} from './state.js';
import {
  itemName,
  panelsHtml,
  summary
} from './panels.js';
import {
  attachMaps
} from './zonemap.js';
import {
  readStatus
} from './publish.js';
import {
  chainName,
  updateAllHtml
} from './chain.js';

// couleur d'un État → data-kind du point du cadre (.f-dot) ; statut d'une source du catalogue → data-kind du badge (.f-badge)
const LEVEL_KIND = {
  green: 'ok',
  orange: 'warn',
  red: 'err'
};
const STATUS_KIND = {
  used: 'ok',
  candidate: 'accent',
  abandoned: ''
};
// mise en page propre au module, aux jetons du cadre
export const STYLE = `
[data-module="data"] .d-sum{flex:1;min-width:0;display:grid;gap:2px}
[data-module="data"] .d-sum>b{overflow-wrap:anywhere}
[data-module="data"] .d-states{list-style:none;margin:0 0 8px;padding:0;display:grid;gap:6px}
[data-module="data"] .d-states li{display:flex;gap:8px;align-items:baseline;overflow-wrap:anywhere}
[data-module="data"] .d-states .f-dot{flex:none}
[data-module="data"] .d-zones{margin:0;padding-left:1.1em}
[data-module="data"] .d-url{overflow-wrap:anywhere}
[data-module="data"] details.d-more{margin-top:8px}
[data-module="data"] .f-group>.f-card{margin-top:var(--sog-gap-s)}
[data-module="data"] [data-data-head] p{margin:2px 0}
[data-module="data"] [data-build] h2,[data-module="data"] [data-build] h3{margin:8px 0 4px}
[data-module="data"] .d-opts{display:flex;flex-wrap:wrap;gap:0 16px}
[data-module="data"] .d-opt{display:flex;gap:8px;align-items:center;min-height:var(--sog-touch);overflow-wrap:anywhere}
[data-module="data"] .d-opt input{flex:none;width:20px;height:20px;margin:0}
[data-module="data"] .d-pers p{margin:0 0 4px 28px}
[data-module="data"] [data-build] [data-verb],[data-module="data"] [data-set-panel] [data-verb]{min-height:var(--sog-touch);min-width:44px}
[data-module="data"] [data-build] [data-reason],[data-module="data"] [data-set-panel] [data-reason]{margin:6px 0 0}
[data-module="data"] [data-set-panel] h2,[data-module="data"] [data-set-panel] h3{margin:8px 0 4px}
[data-module="data"] .d-codes{display:grid;gap:4px;margin:4px 0}
[data-module="data"] .d-codes input{min-height:var(--sog-touch);max-width:100%;box-sizing:border-box;text-transform:uppercase}
[data-module="data"] .d-verbs{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 0}
[data-module="data"] .d-sl{list-style:none;margin:2px 0 4px;padding:0;display:grid;gap:2px}
[data-module="data"] .d-sl li{overflow-wrap:anywhere}
[data-module="data"] .d-zl>li>div{min-width:0}
[data-module="data"] .d-manual{margin:6px 0 0;padding-left:1.1em}
[data-module="data"] .d-manual li{overflow-wrap:anywhere}
[data-module="data"] .d-run{margin-top:10px;display:grid;gap:6px}
[data-module="data"] .d-runhead{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline}
[data-module="data"] .d-bar{height:10px;border:1px solid var(--sog-border);background:var(--sog-surface);overflow:hidden}
[data-module="data"] .d-bar>i{display:block;height:100%;background:var(--sog-accent);transition:width .3s}
[data-module="data"] .d-bar[data-indeterminate]>i{width:30%;animation:d-slide 1.2s linear infinite}
@keyframes d-slide{from{margin-left:-30%}to{margin-left:100%}}
[data-module="data"] .d-zl{list-style:none;margin:0;padding:0;display:grid;gap:4px}
[data-module="data"] .d-zl li{display:flex;gap:8px;align-items:baseline;overflow-wrap:anywhere}
[data-module="data"] .d-zl .f-dot{flex:none}
[data-module="data"] [data-publish] h2{margin:8px 0 4px}
[data-module="data"] [data-publish] p{margin:2px 0}
[data-module="data"] [data-publish] [data-verb]{min-height:var(--sog-touch);min-width:44px;margin-top:6px}
[data-module="data"] [data-publish] [data-reason]{margin:6px 0 0}
[data-module="data"] [data-publish] [data-publishing]{margin-top:10px;display:grid;gap:6px}
[data-module="data"] [data-publish] [data-publish-result]{margin-top:10px;display:grid;gap:4px}
[data-module="data"] [data-publish] [data-publish-message]{overflow-wrap:anywhere}
[data-module="data"] [data-update-all] h2{margin:8px 0 4px}
[data-module="data"] [data-update-all] [data-verb]{min-height:var(--sog-touch);min-width:44px}
[data-module="data"] [data-update-all] [data-reason]{margin:6px 0 0}
[data-module="data"] [data-update-all] [data-chain],[data-module="data"] [data-update-all] [data-chain-result]{margin-top:10px;display:grid;gap:6px}
[data-module="data"] .f-status-dot[data-attn]{display:inline-block;vertical-align:middle;margin-left:6px}
[data-module="data"] .d-map{margin:6px 0}
[data-module="data"] .d-map-host{position:relative;height:45vh;min-height:260px;border:1px solid var(--sog-line,var(--sog-muted));background:var(--sog-surface)}
[data-module="data"] .d-map-row{margin:6px 0}
[data-module="data"] .d-map-row button{min-height:var(--sog-touch);min-width:44px}
[data-module="data"] .d-mapgrid{display:grid;gap:8px;min-width:0}
@media (min-width:1024px){[data-module="data"] .d-mapgrid{grid-template-columns:minmax(0,3fr) minmax(0,2fr);align-items:start}}
[data-module="data"] .d-sw{display:inline-block;width:12px;height:12px;vertical-align:middle;margin:0 4px 0 8px;background:currentColor;border:1px solid}
[data-module="data"] .d-sw[data-tone=ok]{background:var(--sog-ok);border-color:var(--sog-ok)}
[data-module="data"] .d-sw[data-tone=warn]{background:var(--sog-warn);border-color:var(--sog-warn)}
[data-module="data"] .d-sw[data-tone=accent]{background:var(--sog-accent);border-color:var(--sog-accent)}
[data-module="data"] .d-sw[data-tone=muted]{background:var(--sog-muted);border-color:var(--sog-muted)}
[data-module="data"] .d-journal{margin-top:var(--sog-gap-s)}
[data-module="data"] .d-journal summary{min-height:var(--sog-touch);display:flex;align-items:center}
[data-module="data"] .d-ops{list-style:none;margin:0;padding:0;display:grid;gap:4px}
[data-module="data"] .d-ops li{overflow-wrap:anywhere}
`;
/** Les opérations que le lanceur connaît (GET regen/verbs), lues une fois au montage : M.knownVerbs de sa réponse ; sans lanceur, sans réponse, sur
 *  un 404 ou un refus : celles d'un lanceur ancien (base/fetch, base/build, base/purge). Ne lève jamais. */
export async function readVerbs() {
  const L = S?.ctx.launcher;
  let r = null;
  try {
    r = L ? await L.call(VERBS_ROUTE) : null;
  } catch {
    r = null;
  }
  return M.knownVerbs(r);
}
/** Lit ce que l'écran montre : le catalogue, ce qui est publié, les zones, la couverture par État, la couverture du poste ; puis
 *  dessine, et à la première ouverture écrit la couverture. */
export async function load() {
  const me = S,
    [cat, pub, zones, byState, stored, status] = await Promise.all([ask('sources'), ask('publication'), ask('zones'), ask(
        'coverageByState'),
      S.ctx.data.get(COVERAGE).catch(() => null), readStatus()
    ]);
  if (S !== me) return; // démonté, ou remplacé, pendant la lecture
  S.pub.status = status;
  if (S.outlines === false) S.outlines = null; // un échec de lecture des contours : la lecture suivante réessaie
  const list = Array.isArray(zones) ? zones : null,
    cov = M.coverageIds(stored, list, pub);
  S.d = {
    cat,
    pub,
    zones: list,
    byState,
    cov
  };
  // les zones à construire : toutes celles de la couverture à la première lecture (choix de l'utilisateur gardés ensuite)
  S.ticked ||= new Set(cov.ids);
  render();
  // première ouverture : toutes les zones publiées sont cochées et la couverture est écrite une fois (SPEC § 3.2) ; rien n'est
  // écrit d'une lecture dégradée (zones() en panne) ni d'un dépôt qui ne publie encore aucune zone
  if (!cov.stored && list && cov.ids.length) {
    S.ctx.data.put(COVERAGE, {
      zones: cov.ids,
      updated_at: new Date().toISOString()
    }).catch(() => {});
  }
}
/** Dessine l'écran sans bouger le défilement. */
function render() {
  if (!S?.body || !S.d) return;
  keepScroll(S.body, renderBody);
  attachMaps(); // les panneaux sont neufs : les cartes MapLibre reprennent la place de leur emplacement
}
/** En-tête : le cycle AIRAC en vigueur avec ses dates et le prochain, puis le lanceur du poste. */
function headHtml() {
  const info = S.ctx.launcher?.info?.() || null,
    runner = `<p class="f-muted" data-runner="${info ? 'launcher' : 'none'}">${esc(tt(info ? TX.runnerLauncher : TX.runnerNone))}</p>`;
  if (!S.airac) return `<section class="f-card" data-data-head><p class="f-warn" data-error="catalogue">${esc(tt(TX.headError))}</p>${runner}</section>`;
  const h = M.cycleHead(S.airac, S.now),
    next = tt(h.daysToNext === 1 ? TX.nextOne : TX.nextMany, {
      c: h.next.id,
      n: h.daysToNext
    });
  return `<section class="f-card" data-data-head>
    <p><span class="f-muted">${esc(tt(TX.cycleNow))}</span> <b data-cycle-now>${esc(h.id)}</b></p>
    <p class="f-muted" data-cycle-dates>${esc(tt(TX.cycleDates, { a: M.dateText(h.date, lang()), b: M.dateText(h.end, lang()) }))} · ${esc(next)}</p>
    ${runner}</section>`;
}
/** Une ligne de la liste des États : le point de couleur (jamais la couleur seule : le libellé suit), le motif et les États. */
function stateLineHtml(l) {
  const names = l.items.map(i => i.held ? `${i.name} (${count('aerodrome', i.held)})` : i.name).join(', ');
  return `<li data-level="${esc(l.level)}" data-reason="${esc(l.reason)}"><i class="f-dot"${kind(M.own(LEVEL_KIND, l.level))} role="img" aria-label="${esc(tt(TX.levels[l.level]))}"></i>
    <span>${esc(tt(TX.stateLine, { l: l.label, n: names }))}</span></li>`;
}
/** La liste des États : sept lignes au plus par couleur et motif, le reste sous « n autres », puis la légende ; une ligne d'erreur
 *  si coverageByState() n'a pas répondu. */
export function statesHtml() {
  const {
    cat,
    byState
  } = S.d;
  if (!byState) return `<p class="f-warn" data-error="states">${esc(tt(TX.statesError))}</p>`;
  const {
    visible,
    more
  } = M.split(M.stateLines(byState, li(), Object.keys(cat?.COVERAGE || {})));
  return `<ul class="d-states" data-states>${visible.map(stateLineHtml).join('')}</ul>
      ${more.length ? `<details class="d-more" data-more><summary>${esc(tt(TX.moreStates, { n: more.length }))}</summary><ul class="d-states">${more.map(stateLineHtml).join('')}</ul></details>` : ''}
      <p class="f-muted" data-legend>${esc(tt(TX.legend))}</p>`;
}
/** Couverture : la ligne des zones, puis les États par couleur et motif. */
function coverageHtml() {
  const {
    zones,
    cov
  } = S.d,
    names = M.orderZones(cov.ids, zones).map(id => M.zoneName(zones, id, li())),
    err = zones ? '' : `<p class="f-warn" data-error="zones">${esc(tt(TX.zonesError))}</p>`;
  return `<section class="f-card" data-coverage><h2>${esc(tt(TX.coverage))}</h2>${err}
    <p data-zones>${esc(cov.ids.length ? tt(TX.coverageZones, { z: names.join(', ') }) : tt(TX.coverageNone))}</p>
    ${addZoneHtml()}
    <h3>${esc(tt(TX.states))}</h3><div data-states-box>${statesHtml()}</div></section>`;
}
/** « Ajouter un pays » : les zones que la suite connaît (zones() d'aerodb, dans l'ordre de leur nom français) hors de la couverture ;
 *  rien sans la liste des zones ou pendant une construction. Choisir une zone l'ajoute aussitôt (addZone). */
function addZoneHtml() {
  const {
    zones,
    cov
  } = S.d;
  if (!zones) return '';
  const have = new Set(cov.ids),
    rest = zones.filter(z => !have.has(z.id));
  if (!rest.length) return '';
  return `<p><label>${esc(tt(TX.addZone))} <select data-add-zone${frozen() ? ' disabled' : ''}><option value="">${esc(tt(TX.addZonePick))}</option>
    ${rest.map(z => `<option value="${esc(z.id)}">${esc(M.zoneName(zones, z.id, li()))}</option>`).join('')}</select></label></p>`;
}
/** Ajoute une zone connue à la couverture de ce poste : écrite aussitôt (cache/data/coverage.json), cochée pour « Construire » ; une
 *  zone que personne ne publie est construite et publiée par ce poste (SPEC § 3.2). */
export function addZone(id) {
  const known = (S.d.zones || []).some(z => z.id === id);
  if (!known || S.d.cov.ids.includes(id) || frozen()) return;
  S.d.cov = {
    ...S.d.cov,
    ids: [...S.d.cov.ids, id],
    stored: true
  };
  S.ticked ||= new Set();
  S.ticked.add(id);
  S.ctx.data.put(COVERAGE, {
    zones: S.d.cov.ids,
    updated_at: new Date().toISOString()
  }).catch(() => {});
  render();
}
/** « Cycle 2610 · publié il y a 3 jours · 12 zones » : ce que la ligne d'un jeu dit de lui-même, sans taille en octets
 *  (publication() n'en donne pas : seulement des nombres de zones, de terrains, de fichiers, de types). */
function metaText(r) {
  const parts = [];
  if (r.cycle) parts.push(tt(TX.cycle, {
    c: r.cycle
  }));
  else if (r.kind === 'aircraft' && r.at) parts.push(tt(TX.edition, {
    d: M.dateText(r.at, lang())
  }));
  if (r.ageDays !== null) parts.push(tt(r.ageDays === 0 ? TX.ageToday : r.ageDays === 1 ? TX.ageOne : TX.ageMany, {
    n: r.ageDays
  }));
  for (const [key, unit] of [
      ['zones', 'zone'],
      ['aerodromes', 'aerodrome'],
      ['types', 'type'],
      ['files', 'file']
    ])
    if (Number.isFinite(r.counts[key])) parts.push(count(unit, r.counts[key]));
  if (r.kind === 'none' && r.status === 'used') parts.push(tt(TX.withSite));
  return parts.join(' · ');
}
/** Adresse d'une source pour le cycle en vigueur (urlOf du catalogue). */
function urlOf(src) {
  return S.d.cat.urlOf ? S.d.cat.urlOf(src, S.cycleId) : typeof src.url === 'function' ? src.url(S.cycleId) : src.url;
}
/** Le lien « Ouvrir » (nouvel onglet, sans référent) avec son adresse écrite à côté ; une adresse qui n'est pas en https:
 *  (javascript:, data:, http:…) n'est jamais un lien, seulement écrite. */
function linkHtml(src) {
  const url = String(urlOf(src) ?? '');
  if (!M.isHttps(url)) return url ? `<span class="d-url f-muted">${esc(url)}</span>` : '';
  return `<a class="f-btn" href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="${esc(tt(TX.openTitle, { s: src.n[li()] }))}">${esc(tt(TX.open))}</a>
    <span class="d-url f-muted">${esc(url)}</span>`;
}
/** Ce qu'une zone publiée dit d'elle dans le détail d'une ligne : cycle, date, auteur, version de l'analyseur, format ancien. */
function zoneLine(z) {
  const bits = z.published ? [tt(TX.zoneCycle, {
    c: M.cycleName(S.airac, z.cycle)
  }), z.at ? tt(TX.zoneAt, {
    d: fmtDateZ(z.at, lang())
  }) : '', z.by ? tt(TX.zoneBy, {
    b: z.by
  }) : '', z.parserVersion !== null ? tt(TX.zoneParser, {
    p: z.parserVersion
  }) : '', z.format === 'whole' ? tt(TX.zoneWhole) : ''].filter(Boolean) : [tt(TX.zoneMissing)];
  return `<li data-zone-pub="${esc(z.zone)}">${esc(tt(TX.zoneLine, { z: M.zoneName(S.d.zones, z.zone, li()), d: bits.join(', ') }))}</li>`;
}
/** Détail d'une ligne, replié : le lien avec son adresse, la licence, le statut, les zones nourries et, pour la base, ce que
 *  chaque zone a publié. */
function detailHtml(r, src) {
  const fed = src.zones === '*' ? tt(TX.fedAll) : r.fed.length ? r.fed.map(id => M.zoneName(S.d.zones, id, li())).join(', ') : tt(TX
    .fedNone);
  return `<dl class="f-dl">
    <dt>${esc(tt(TX.link))}</dt><dd>${linkHtml(src)}</dd>
    <dt>${esc(tt(TX.licence))}</dt><dd>${esc(src.lic[li()])}</dd>
    <dt>${esc(tt(TX.status))}</dt><dd>${esc(tt(TX.statuses[src.status]))}</dd>
    ${['base', 'proc'].includes(src.group) ? `<dt>${esc(tt(TX.fed))}</dt><dd>${esc(fed)}</dd>` : ''}
    ${r.zones.length ? `<dt>${esc(tt(TX.published))}</dt><dd><ul class="d-zones">${r.zones.map(zoneLine).join('')}</ul></dd>` : ''}
    ${r.byStatus ? `<dt>${esc(tt(TX.procByStatus))}</dt><dd>${esc(Object.entries(r.byStatus).map(([k, n]) => `${k} ${n}`).join(', '))}</dd>` : ''}
  </dl>`;
}
/** Une ligne de jeu de données. Un jeu utilisé : une carte repliable (nom, cycle ou édition, âge, taille, pastille d'état ; le détail
 *  sous le toucher). Un jeu envisagé ou écarté : une carte à plat, sans état, avec son lien, sa licence et son statut. */
function rowHtml(r) {
  const src = catSource(r.id),
    name = esc(src.n[li()]);
  if (r.status !== 'used') return `<div class="f-card" data-set="${esc(r.id)}" data-status="${esc(r.status)}"><p><b>${name}</b>
      <span class="f-badge"${kind(M.own(STATUS_KIND, r.status))}>${esc(tt(TX.statuses[r.status]))}</span></p>
      <p>${linkHtml(src)}</p><p class="f-muted">${esc(tt(TX.licenceLine, { l: src.lic[li()] }))}</p></div>`;
  const pill = r.state ? `<span class="f-badge"${kind(r.level)} data-pill>${esc(tt(TX.state[r.state]))}</span>` : '';
  return `<details class="f-card" data-set="${esc(r.id)}" data-status="used"${r.state ? ` data-state="${esc(r.state)}"` : ''} data-cycle="${esc(r.cycle)}">
    <summary><span class="d-sum"><b>${name}</b><span class="f-muted">${esc(metaText(r))}</span></span>${pill}</summary>${detailHtml(r, src)}</details>`;
}
/** Les quatre groupes : repliés sauf ceux qui portent une ligne à regarder ; sept lignes visibles au plus, le reste (et les jeux
 *  envisagés ou écartés) sous « n autres jeux ». */
function groupsHtml() {
  const {
    cat,
    pub,
    cov
  } = S.d;
  if (!cat || !S.airac) return `<p class="f-warn" data-error="catalogue">${esc(tt(TX.catError))}</p>`;
  const groups = S.groups;
  return `${pub ? '' : `<p class="f-warn" data-error="publication">${esc(tt(TX.pubError))}</p>`}${groups.map(g => {
    const open = g.id in S.manual ? S.manual[g.id] : g.attention;
    return `<details class="f-group" data-group="${g.id}"${open ? ' open' : ''}><summary><span>${esc(tt(TX.groups[g.id]))}</span><i class="f-status-dot" data-attn${g.attention ? '' : ' hidden'} title="${esc(tt(TX.attention))}"></i></summary>
      ${panelsHtml(g.id)}
      ${g.rows.map(rowHtml).join('') || (g.more.length ? '' : `<p class="f-muted">${esc(tt(TX.groupEmpty))}</p>`)}
      ${g.more.length ? `<details class="d-more" data-more><summary>${esc(tt(TX.moreSets, { n: g.more.length }))}</summary>${g.more.map(rowHtml).join('')}</details>` : ''}</details>`;
  }).join('')}`;
}
/** L'écran : l'en-tête, la couverture, « Tout mettre à jour », les groupes, le journal. */
function renderBody() {
  S.now = Date.now();
  S.airac = S.d.cat?.airac || null;
  S.cycleId = S.airac ? S.airac.cycleOf(S.now).id : undefined;
  const d = S.d;
  S.groups = d.cat && S.airac ? M.buildGroups(d.cat, {
    airac: S.airac,
    pub: d.pub,
    ids: d.cov.ids,
    now: S.now,
    parserVersion: d.cat.PARSER_VERSION
  }) : null;
  S.attn = M.staleGroups(S
    .groups); // les groupes dont le cycle publié est dépassé : le point d'attention de « Construire » et de « Tout mettre à jour »
  S.body.innerHTML = `${headHtml()}${coverageHtml()}${updateAllHtml()}${groupsHtml()}${journalHtml()}`;
}
/** Le texte d'un mot du journal (verbe, résultat, jeu) dans la langue : celui de la table `map`, à défaut le mot tel que le journal le porte. */
const wordOf = (map, key) => tt(M.own(map, key) || [key, key, key, key]);
/** La ligne d'une opération du journal : heure UTC, jeu (hors base), verbe, éléments, résultat. */
function opHtml(e) {
  const set = e.set || 'base',
    items = e.set === 'all' ? (e.items || []).map(i => `${chainName(i.set)} : ${wordOf(TX.chainWord, i.result)}`).join(', ') :
    (e.items || e.zones || []).map(z => itemName(set, z)).join(', '),
    zs = e.verb === 'publish' ? count('file', M.num(e.committed) ?? 0) : items,
    label = set === 'base' || set === 'all' ? '' : `${wordOf(TX.setLabel, set)} · `;
  return `<li data-op data-result="${esc(e.result)}" data-op-verb="${esc(e.verb)}" data-op-set="${esc(set)}"><time datetime="${esc(e.at)}">${esc(fmtDateZ(e.at, lang()))}</time> · ${esc(label)}${esc(wordOf(TX.opVerb, e.verb))} · ${esc(e.set === 'aircraft' && e.verb === 'publish' ? count('sheet', M.num(e.copied) ?? 0) : zs)} · ${esc(wordOf(TX.opResult, e.result))}</li>`;
}
/** Le journal, replié, au pied de l'écran : les opérations les plus récentes d'abord. */
function journalHtml() {
  return `<details class="f-card d-journal" data-journal${S.journalOpen ? ' open' : ''}><summary>${esc(tt(TX.journal))}</summary>
    ${S.journal.length ? `<ul class="d-ops">${[...S.journal].reverse().map(opHtml).join('')}</ul>` : `<p class="f-muted">${esc(tt(TX.journalEmpty))}</p>`}</details>`;
}
/** Redessine le journal seul. */
function renderJournal() {
  const el = S?.body?.querySelector('[data-journal]');
  if (el && S.d) keepScroll(S.body, () => el.outerHTML = journalHtml());
}
/** Écrit l'opération au journal (cache/data/journal.json, les 50 dernières) et redessine le journal. */
export function journalWrite(entry, replace = false) {
  const list = replace ? M.journalSet(S.journal, entry) : M.journalAdd(S.journal, entry);
  if (list === S.journal) return;
  S.journal = list;
  S.ctx.data.put(JOURNAL, {
    ops: list,
    updated_at: new Date().toISOString()
  }).catch(() => {});
  renderJournal();
}
