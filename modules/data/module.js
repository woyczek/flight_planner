// V3 data — « Données » de l'appli Pilote, monté par le cadre (frame/SPEC.md § 3.2 ; modules/data/SPEC.md, INTEGRATION.md).
// Premier lot : un écran en lecture seule, sans aucun bouton d'action. En tête, le cycle AIRAC en vigueur et le lanceur ; la
// couverture (les zones de ce poste, puis les États par couleur) ; quatre groupes de jeux de données (base aéronautique,
// procédures, appareils, météo), une ligne par jeu avec son cycle, son âge, sa taille et un état calculé, le détail sous un toucher.
// Tout vient des trois appels d'aerodb (publication, zones, sources) et de coverageByState : le module ne lit aucun fichier de
// données et n'appelle aucun réseau. Calcul pur dans model.js, textes dans texts.js.
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

export const meta = {
  id: 'data',
  title: TX.title, // en-tête du téléphone (règle 16)
  apps: ['pilot'],
  level: 3,
  // déclaration vide : aucune route, aucun préfixe ; seulement ctx.launcher.info(), pour dire si ce poste a un lanceur
  launcher: {
    routes: [],
    read: []
  },
  files: ['model.js', 'texts.js', '../../frame/lib/dom.js', '../../frame/lib/time.js'],
  reads: ['cache/data/'],
  writes: [{
    prefix: 'cache/data/',
    policy: 'cache'
  }]
};

const COVERAGE = 'cache/data/coverage.json'; // { zones: [id], updated_at } : la couverture de ce poste (SPEC § 3.2)
const LANGS = ['fr', 'en', 'de', 'es'];
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
const STYLE = `
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
`;

let S = null;

/** Échappe un texte pour le HTML. */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
/** Texte d'une ligne [fr, en, de, es] dans la langue de l'appli. */
const tt = (row, v) => S.ctx.t(row, v);
/** Langue de l'appli (« fr », « en », « de », « es »). */
const lang = () => S.ctx.lang?.() || 'fr';
/** Rang de la langue de l'appli dans une ligne [fr, en, de, es]. */
const li = () => Math.max(0, LANGS.indexOf(lang()));
/** « 3 zones » : le nombre et le nom de l'unité, au singulier ou au pluriel (TX.unit). */
const count = (unit, n) => `${n} ${tt(TX.unit[unit][n === 1 ? 0 : 1])}`;
/** Attribut data-kind d'un badge ou d'un point, absent quand il n'y a pas de couleur. */
const kind = k => k ? ` data-kind="${esc(k)}"` : '';

// ---------------------------------------------------------------- lecture
/** Un appel d'aerodb qui ne lève jamais : sa réponse, ou null s'il manque, échoue ou ne répond rien. */
async function ask(name) {
  const ab = S.ctx.aerodb;
  try {
    return typeof ab?.[name] === 'function' ? (await ab[name]()) ?? null : null;
  } catch {
    return null;
  }
}
/** Lit ce que l'écran montre : le catalogue, ce qui est publié, les zones, la couverture par État, la couverture du poste ; puis
 *  dessine, et à la première ouverture écrit la couverture. */
async function load() {
  const me = S,
    [cat, pub, zones, byState, stored] = await Promise.all([ask('sources'), ask('publication'), ask('zones'), ask('coverageByState'),
      S.ctx.data.get(COVERAGE).catch(() => null)
    ]);
  if (S !== me) return; // démonté, ou remplacé, pendant la lecture
  const list = Array.isArray(zones) ? zones : null,
    cov = M.coverageIds(stored, list, pub);
  S.d = {
    cat,
    pub,
    zones: list,
    byState,
    cov
  };
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

// ---------------------------------------------------------------- dessin
/** Dessine l'écran sans bouger le défilement. */
function render() {
  if (!S?.body || !S.d) return;
  keepScroll(S.body, renderBody);
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
  return `<li data-level="${esc(l.level)}" data-reason="${esc(l.reason)}"><i class="f-dot"${kind(LEVEL_KIND[l.level])} role="img" aria-label="${esc(tt(TX.levels[l.level]))}"></i>
    <span>${esc(tt(TX.stateLine, { l: l.label, n: names }))}</span></li>`;
}
/** La liste des États : sept lignes au plus par couleur et motif, le reste sous « n autres », puis la légende ; une ligne d'erreur
 *  si coverageByState() n'a pas répondu. */
function statesHtml() {
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
    <h3>${esc(tt(TX.states))}</h3><div data-states-box>${statesHtml()}</div></section>`;
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
  if (!/^https:\/\/[^\s"'<>]+$/i.test(url)) return url ? `<span class="d-url f-muted">${esc(url)}</span>` : '';
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
  const src = S.d.cat.byId ? S.d.cat.byId(r.id) : S.d.cat.SOURCES.find(s => s.id === r.id),
    name = esc(src.n[li()]);
  if (r.status !== 'used') return `<div class="f-card" data-set="${esc(r.id)}" data-status="${esc(r.status)}"><p><b>${name}</b>
      <span class="f-badge"${kind(STATUS_KIND[r.status])}>${esc(tt(TX.statuses[r.status]))}</span></p>
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
  const groups = M.buildGroups(cat, {
    airac: S.airac,
    pub,
    ids: cov.ids,
    now: S.now,
    parserVersion: cat.PARSER_VERSION
  });
  return `${pub ? '' : `<p class="f-warn" data-error="publication">${esc(tt(TX.pubError))}</p>`}${groups.map(g => {
    const open = g.id in S.manual ? S.manual[g.id] : g.attention;
    return `<details class="f-group" data-group="${g.id}"${open ? ' open' : ''}><summary><span>${esc(tt(TX.groups[g.id]))}</span><i class="f-status-dot" data-attn${g.attention ? '' : ' hidden'} title="${esc(tt(TX.attention))}"></i></summary>
      ${g.rows.map(rowHtml).join('') || (g.more.length ? '' : `<p class="f-muted">${esc(tt(TX.groupEmpty))}</p>`)}
      ${g.more.length ? `<details class="d-more" data-more><summary>${esc(tt(TX.moreSets, { n: g.more.length }))}</summary>${g.more.map(rowHtml).join('')}</details>` : ''}</details>`;
  }).join('')}`;
}
/** L'écran : l'en-tête, la couverture, les groupes. */
function renderBody() {
  S.now = Date.now();
  S.airac = S.d.cat?.airac || null;
  S.cycleId = S.airac ? S.airac.cycleOf(S.now).id : undefined;
  S.body.innerHTML = `${headHtml()}${coverageHtml()}${groupsHtml()}`;
}

// ---------------------------------------------------------------- gestes
/** aerodb annonce un changement avec { coverage: true } (la table de couverture a bougé) : la liste des États est redemandée, et
 *  elle seule est redessinée (un changement en rafale est regroupé en un seul rappel). */
function onAerodbChange(e) {
  if (!e?.coverage || !S) return;
  clearTimeout(S.again);
  S.again = setTimeout(async () => {
    const me = S;
    const byState = await ask('coverageByState');
    const box = me === S && S.body?.querySelector('[data-states-box]');
    if (!box || !S.d) return;
    const open = box.querySelector('[data-more]')?.open;
    S.d.byState = byState;
    keepScroll(S.body, () => {
      box.innerHTML = statesHtml();
      if (open) box.querySelector('[data-more]')?.setAttribute('open', '');
    });
  }, 150);
}
/** Retient le groupe touché en dernier (le « ? » du cadre ouvre l'aide au paragraphe du groupe ouvert). */
function onClick(e) {
  const g = e.target.closest?.('details.f-group > summary')?.parentElement;
  if (g) S.focus = g.dataset.group;
}
/** Retient les groupes ouverts ou fermés à la main, d'un dessin à l'autre. */
function onToggle(e) {
  const g = e.target;
  if (g instanceof HTMLDetailsElement && g.matches('details.f-group') && g.isConnected) S.manual[g.dataset.group] = g.open;
}
/** Identifiant du groupe dont l'aide s'ouvre : le dernier touché s'il est encore ouvert, sinon le premier ouvert ; '' sans. */
function helpGroup() {
  const g = S?.body?.querySelector(`details.f-group[data-group="${S.focus}"][open]`) || S?.body?.querySelector('details.f-group[open]');
  return g?.dataset.group || '';
}

/** Monte l'écran dans el : le titre, les écouteurs, le « ? » de l'aide, puis la lecture et le dessin. */
export async function mount(el, ctx) {
  S = {
    el,
    ctx,
    d: null,
    manual: {},
    focus: null,
    stops: [],
    again: 0
  };
  el.innerHTML = `<style>${STYLE}</style><h1>${esc(tt(TX.title))}</h1><div data-body></div>`;
  // titre : sur un téléphone l'en-tête du cadre porte celui du module (ctx.titled) ; le h1 reste alors pour les lecteurs
  // d'écran seulement (f-sr), et suit « frame-titled » (frame/INTEGRATION.md § 6)
  S.srTitle = () => el.querySelector(':scope > h1')?.classList.toggle('f-sr', !!ctx.titled);
  S.srTitle();
  window.addEventListener('frame-titled', S.srTitle);
  S.body = el.querySelector('[data-body]');
  // « ? » de l'en-tête : le chapitre au paragraphe du groupe ouvert, sinon à celui du cycle
  ctx.helpAnchor?.(() => helpGroup() ? `data-group-${helpGroup()}` : 'data-cycle');
  S.body.addEventListener('click', onClick);
  S.body.addEventListener('toggle', onToggle, true);
  // la couverture par État dépend de la table de couverture d'aerodb : redemandée quand il annonce { coverage: true }
  if (ctx.aerodb?.on) S.stops.push(ctx.aerodb.on('change', onAerodbChange));
  await load();
}

/** Démonte : retire l'écouteur du titre et l'abonnement à aerodb ; une lecture encore en cours ne dessine plus rien. */
export function unmount() {
  if (!S) return;
  window.removeEventListener('frame-titled', S.srTitle);
  clearTimeout(S.again);
  for (const f of S.stops) f?.();
  S.body = null;
  S = null;
}
