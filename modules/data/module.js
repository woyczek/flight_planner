// V3 data — « Données » de l'appli Pilote, monté par le cadre (frame/SPEC.md § 3.2 ; modules/data/SPEC.md, INTEGRATION.md).
// Un écran de lecture, et des actions sur la base aéronautique : « Télécharger » les sources, « Construire » la base, « Purger » les
// sources (un seul panneau, les mêmes zones cochées, trois verbes du lanceur base/fetch, base/build, base/purge), puis « Publier » ce
// qui a été construit vers le dépôt des données (second panneau, en tête du groupe Base aéronautique, journal au pied de l'écran). En tête,
// le cycle AIRAC en vigueur et le lanceur ; la couverture (les zones de ce poste, puis les États par couleur) ; quatre groupes de
// jeux de données (base aéronautique,
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
  // la construction de la base est un travail du lanceur (regen/job) ; aucune lecture de data/ par le lanceur
  launcher: {
    // regen/job couvre aussi son annulation regen/job/cancel (cadre, f70eba426) ; sync-status : l'état de data/ avant la
    // question de « Publier » (GET, jamais de POST /__setup/sync : la publication passe par ctx.data.sync)
    routes: ['regen/job', 'sync-status'],
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
const JOURNAL = 'cache/data/journal.json'; // { ops: [opération], updated_at } : les 50 dernières opérations de ce poste (SPEC § 7)
const ROUTE = 'regen/job'; // le travail du lanceur : construction de la base (verbe D5 d'aerodb)
const STATUS_ROUTE = 'sync-status?fresh=1'; // l'état de data/ (fichiers modifiés, commits à envoyer, fusion) ; relevé refait
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
[data-module="data"] [data-build] h2,[data-module="data"] [data-build] h3{margin:8px 0 4px}
[data-module="data"] .d-opts{display:flex;flex-wrap:wrap;gap:0 16px}
[data-module="data"] .d-opt{display:flex;gap:8px;align-items:center;min-height:var(--sog-touch);overflow-wrap:anywhere}
[data-module="data"] .d-opt input{flex:none;width:20px;height:20px;margin:0}
[data-module="data"] .d-pers p{margin:0 0 4px 28px}
[data-module="data"] [data-build] [data-verb]{min-height:var(--sog-touch);min-width:44px}
[data-module="data"] [data-build] [data-reason]{margin:6px 0 0}
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
[data-module="data"] .d-journal{margin-top:var(--sog-gap-s)}
[data-module="data"] .d-journal summary{min-height:var(--sog-touch);display:flex;align-items:center}
[data-module="data"] .d-ops{list-style:none;margin:0;padding:0;display:grid;gap:4px}
[data-module="data"] .d-ops li{overflow-wrap:anywhere}
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
/** L'état de data/ pour « Publier » (GET sync-status, relevé refait) : la réponse du lanceur, ou null sans lanceur, sans réponse
 *  ou sur un refus. Ne lève jamais. */
async function readStatus() {
  const L = S?.ctx.launcher;
  if (!L) return null;
  try {
    const r = await L.call(STATUS_ROUTE);
    return r && typeof r === 'object' && r.ok !== false ? r : null;
  } catch {
    return null;
  }
}
/** Lit ce que l'écran montre : le catalogue, ce qui est publié, les zones, la couverture par État, la couverture du poste ; puis
 *  dessine, et à la première ouverture écrit la couverture. */
async function load() {
  const me = S,
    [cat, pub, zones, byState, stored, status] = await Promise.all([ask('sources'), ask('publication'), ask('zones'), ask(
        'coverageByState'),
      S.ctx.data.get(COVERAGE).catch(() => null), readStatus()
    ]);
  if (S !== me) return; // démonté, ou remplacé, pendant la lecture
  S.pub.status = status;
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
  return `<p><label>${esc(tt(TX.addZone))} <select data-add-zone${S.run ? ' disabled' : ''}><option value="">${esc(tt(TX.addZonePick))}</option>
    ${rest.map(z => `<option value="${esc(z.id)}">${esc(M.zoneName(zones, z.id, li()))}</option>`).join('')}</select></label></p>`;
}
/** Ajoute une zone connue à la couverture de ce poste : écrite aussitôt (cache/data/coverage.json), cochée pour « Construire » ; une
 *  zone que personne ne publie est construite et publiée par ce poste (SPEC § 3.2). */
function addZone(id) {
  const known = (S.d.zones || []).some(z => z.id === id);
  if (!known || S.d.cov.ids.includes(id) || S.run) return;
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
      ${g.id === 'base' ? buildHtml() + publishHtml() : ''}
      ${g.rows.map(rowHtml).join('') || (g.more.length ? '' : `<p class="f-muted">${esc(tt(TX.groupEmpty))}</p>`)}
      ${g.more.length ? `<details class="d-more" data-more><summary>${esc(tt(TX.moreSets, { n: g.more.length }))}</summary>${g.more.map(rowHtml).join('')}</details>` : ''}</details>`;
  }).join('')}`;
}
/** L'écran : l'en-tête, la couverture, les groupes. */
function renderBody() {
  S.now = Date.now();
  S.airac = S.d.cat?.airac || null;
  S.cycleId = S.airac ? S.airac.cycleOf(S.now).id : undefined;
  S.body.innerHTML = `${headHtml()}${coverageHtml()}${groupsHtml()}${journalHtml()}`;
}

// ---------------------------------------------------------------- construire la base
/** Les zones de la couverture dans l'ordre de zones() et, parmi elles, les cochées. */
function buildZones() {
  const ids = M.orderZones(S.d.cov.ids, S.d.zones);
  return {
    ids,
    ticked: ids.filter(z => S.ticked?.has(z))
  };
}
/** L'état des boutons « Télécharger », « Construire » et « Purger » (une seule raison pour les trois) : sans lanceur, travail en cours
 *  (le nôtre, la question d'une purge, un autre, une publication), hors ligne, aucune zone cochée. */
function buildGate(ticked) {
  return M.buildState({
    launcher: !!S.ctx.launcher,
    busy: !!S.run || !!S.other || !!S.asking || !!S.pub.phase, // une publication tourne : une autre opération à la fois
    zones: ticked.length,
    offline: navigator.onLine === false
  });
}
/** Le nom d'une source sous licence personnelle : celui du catalogue d'aerodb, à défaut un texte du module. */
function personalName(id) {
  const src = S.d.cat?.byId ? S.d.cat.byId(id) : S.d.cat?.SOURCES?.find(s => s.id === id);
  return src?.n?.[li()] || tt(TX.personalName[id]);
}
/** Les sources sous licence personnelle cochées ET proposées (celles d'une zone décochée ne partent pas). */
function personalPicked(ticked) {
  return M.personalSources(ticked).filter(p => S.personal.has(p.id)).map(p => p.id);
}
/** Une case à cocher avec son libellé (44 px de haut) ; attr : l'attribut data- qui la repère. */
function optHtml(attr, id, label, checked, disabled) {
  return `<label class="d-opt"><input type="checkbox" ${attr}="${esc(id)}"${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}><span>${esc(label)}</span></label>`;
}
/** Le nom d'une source téléchargée : celui du catalogue d'aerodb, à défaut son identifiant. */
function sourceName(id) {
  const src = S.d.cat?.byId ? S.d.cat.byId(id) : S.d.cat?.SOURCES?.find(s => s.id === id);
  return src?.n?.[li()] || id;
}
/** Le motif d'un échec de source : « HTTP 404 » (code et statut), « le réseau ne répond pas »… */
function fetchWhy(code, status) {
  return code === 'http' && status !== null ? tt(TX.fetchError.httpN, {
    s: status
  }) : tt(TX.fetchError[code] || TX.fetchError.unknown);
}
/** La ligne d'une source dans un téléchargement : son nom et son état en peu de mots (téléchargée : n fichiers, inchangée, échec :
 *  code et statut HTTP, ignorée : licence non déclarée, manuelle). */
function sourceLineHtml(s) {
  const size = s.bytes !== null ? M.fmtBytes(s.bytes, lang()) : '',
    word = s.state === 'downloaded' ? s.files !== null ? tt(TX.sourceState.downloaded, {
      n: count('file', s.files) + (size ? ` (${size})` : '')
    }) : tt(TX.sourceState.downloadedNo) : s.state === 'failed' ? tt(TX.sourceState.failed, {
      r: fetchWhy(s.code, s.status)
    }) : s.state === 'skipped' ? tt(s.code === 'personal' ? TX.sourceState.skippedPersonal : TX.sourceState.skipped) : tt(TX.sourceState[s
      .state]),
    k = {
      downloaded: 'ok',
      unchanged: 'ok',
      failed: 'err'
    } [s.state];
  return `<li data-source="${esc(s.id)}" data-state="${s.state}"><i class="f-dot"${kind(k)} aria-hidden="true"></i><span><b>${esc(sourceName(s.id))}</b> : ${esc(word)}</span></li>`;
}
/** La phrase d'une zone dans la marche d'un verbe : en attente, en cours (n / m sources), terminée, échec (le motif écrit en toutes lettres). */
function zoneWord(r, verb) {
  const T = verb === 'fetch' ? TX.fetchState : verb === 'purge' ? TX.purgeState : TX.zoneState;
  if (r.key === 'failed') return tt(T.failed, {
    r: verb === 'fetch' ? fetchWhy(r.code, null) : verb === 'purge' ? r.code === 'unknown' ? tt(TX.zoneError.unknown) : r.code : tt(TX
      .zoneError[r.code])
  });
  if (r.key.endsWith('N')) return tt(T[r.key], {
    n: r.n,
    m: r.m
  });
  if (verb === 'purge' && r.key === 'done') return tt(T.done, {
    n: count('file', r.files ?? 0),
    s: M.fmtBytes(r.bytes ?? 0, lang())
  });
  return tt(T[r.key]);
}
/** La ligne d'une zone dans la marche : point de couleur, nom, phrase ; pour un téléchargement, dessous une ligne par source. */
function zoneLineHtml(r, verb = 'build') {
  const word = zoneWord(r, verb),
    k = {
      built: 'ok',
      done: 'ok',
      failed: 'err',
      building: 'accent',
      fetching: 'accent',
      purging: 'accent',
      cancelled: 'warn'
    } [r.state],
    head = `<b>${esc(M.zoneName(S.d.zones, r.zone, li()))}</b> : ${esc(word)}`;
  if (verb === 'fetch') {
    const src = M.sourceRows(S.view?.zones?.[r.zone]);
    return `<li data-zone-state="${esc(r.zone)}" data-state="${r.state}"><i class="f-dot"${kind(k)} aria-hidden="true"></i><div>${head}${src.length ? `<ul class="d-sl" data-sources>${src.map(sourceLineHtml).join('')}</ul>` : ''}</div></li>`;
  }
  return `<li data-zone-state="${esc(r.zone)}" data-state="${r.state}"><i class="f-dot"${kind(k)} aria-hidden="true"></i><span>${head}</span></li>`;
}
/** La marche : barre, « n zones sur m », étape, temps écoulé, « Arrêter », une ligne par zone (par source pour un téléchargement). */
function runningHtml() {
  const run = S.run,
    p = M.progress(S.view, S.ids),
    stopping = run.phase === 'stopping';
  return `<div class="d-run" data-running data-op="${run.verb}"${run.dry ? ' data-dry' : ''} data-phase="${run.phase}">
    <div class="d-runhead"><b data-count>${esc(tt(TX.runCount, { n: count('zone', p.done), m: p.total }))}</b>
      <span data-step>${esc(stopping ? tt(TX.stopping) : S.view?.step || '')}</span>
      <span class="f-muted" data-elapsed>${esc(tt(TX.elapsed, { t: M.clock((Date.now() - run.t0) / 1e3) }))}</span></div>
    <div class="d-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.done}"${S.view && p.pct !== null ? '' : ' data-indeterminate'}><i style="width:${p.pct ?? 0}%"></i></div>
    <ul class="d-zl">${M.zoneRows(S.view, S.ids, run.verb).map(r => zoneLineHtml(r, run.verb)).join('')}</ul>
    <p><button type="button" data-verb="stop"${stopping ? ' disabled' : ''}>${esc(tt(TX.stop))}</button></p></div>`;
}
/** Le résumé de fin (aussi le texte de la notification) : { text, advice, level } d'après la fin calculée par M.outcome. */
function summary(out) {
  const z = out.failed.map(f => f.zone).join(', '),
    v = {
      built: count('zone', out.built.length),
      failed: out.failed.length,
      zones: z,
      n: out.built.length
    };
  return {
    done: {
      text: tt(TX.sumDone, v),
      level: 'ok'
    },
    partial: {
      text: tt(TX.sumPartial, v),
      advice: TX.advice.partial,
      level: 'warn'
    },
    failed: {
      text: tt(TX.sumFailed, v),
      advice: TX.advice.failed,
      level: 'err'
    },
    cancelled: {
      text: tt(TX.sumCancelled, v),
      advice: TX.advice.cancelled,
      level: 'warn'
    },
    interrupted: {
      text: tt(TX.sumInterrupted),
      advice: TX.advice.interrupted,
      level: 'warn'
    },
    'no-browser': {
      text: tt(TX.sumNoBrowser),
      level: 'err'
    },
    'xplane-in-page': {
      text: tt(TX.sumXplane),
      level: 'err'
    }
  } [out.kind];
}
/** Une part de phrase au singulier ou au pluriel : TX[key] = [[singulier], [pluriel]]. */
const plural = (key, n) => tt(TX[key][n === 1 ? 0 : 1], {
  n
});
/** Le résumé d'un téléchargement : { text, outside (la phrase des fichiers hors synchronisation, vide sans), level }. */
function fetchSummary(out) {
  const v = {
      c: plural('fetchChanged', out.fetched.length),
      u: plural('fetchSame', out.unchanged.length),
      f: plural('fetchFails', out.failed.length)
    },
    text = out.kind === 'nothing' ? tt(TX.fetchNothing) : out.kind === 'interrupted' ? tt(TX.fetchSumInterrupted) : out.kind ===
    'cancelled' ? tt(
      TX.fetchSumStopped, v) : tt(TX.fetchSum, v);
  return {
    text,
    outside: out.outside > 0 ? plural('fetchOutside', out.outside) : '',
    level: out.level
  };
}
/** Le résumé de la fin d'une purge : { text, notes (les phrases des avertissements), level } ; `none` : le plan n'avait rien à retirer. */
function purgeSummary(out, none = false) {
  if (none) return {
    text: tt(TX.purgeNothing),
    notes: [],
    level: 'ok'
  };
  const text = {
    done: TX.purgeDone,
    partial: TX.purgePartial,
    failed: TX.purgeFailed,
    cancelled: TX.purgeStopped,
    interrupted: TX.purgeInterrupted
  } [out.kind];
  return {
    text: tt(text, {
      n: count('file', out.files),
      s: M.fmtBytes(out.bytes, lang())
    }),
    notes: purgeNotes(out),
    level: out.level
  };
}
/** Les phrases des avertissements d'une purge : les fichiers du SIA partagés (purger la France), les fichiers suivis par git gardés,
 *  les chemins refusés. */
function purgeNotes(out) {
  return [out.shared ? tt(TX.purgeShared) : '', out.kept > 0 ? plural('purgeKept', out.kept) : '', out.unsafe > 0 ? plural('purgeUnsafe',
    out.unsafe) : ''].filter(Boolean);
}
/** La question de la purge, faite du plan (le résultat à blanc) : « Purger 12 fichiers (13,8 Mo) des sources de France, Espagne ? » puis,
 *  s'il y a lieu, la phrase des fichiers du SIA partagés et celle des fichiers suivis par git gardés. */
function purgeAsk(out) {
  const names = M.orderZones(out.zones, S.d.zones).map(z => M.zoneName(S.d.zones, z, li())).join(', ');
  return [tt(TX.purgeAsk, {
    n: count('file', out.files),
    s: M.fmtBytes(out.bytes, lang()),
    z: names
  }), out.shared ? tt(TX.purgeShared) : '', out.kept > 0 ? plural('purgeKept', out.kept) : ''].filter(Boolean).join(' ');
}
/** Les sources à déposer à la main : leur nom (×4) en lien seulement si l'adresse est en https://, sinon le nom seul. */
function manualHtml(list) {
  if (!list.length) return '';
  const item = m => {
    const name = esc(m.name?.[li()] || m.name?.[0] || sourceName(m.source)),
      label = M.isHttps(m.url) ? `<a href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">${name}</a>` : `<span>${name}</span>`;
    return `<li data-manual="${esc(m.zone)}:${esc(m.source)}">${esc(M.zoneName(S.d.zones, m.zone, li()))} : ${label}</li>`;
  };
  return `<p data-manual-hint>${esc(tt(TX.fetchManual))}</p><ul class="d-manual" data-manual-list>${list.map(item).join('')}</ul>`;
}
/** La fin d'un téléchargement : le résumé, les fichiers hors synchronisation, les sources manuelles, les lignes des zones et de leurs sources. */
function fetchResultHtml(out) {
  const sm = fetchSummary(out),
    rows = out.kind === 'nothing' ? [] : M.zoneRows(S.view, S.ids, 'fetch'); // rien n'a tourné : pas de lignes « en attente »
  return `<div data-build-result data-op="fetch" data-result="${out.kind}"><p class="${sm.level === 'ok' ? '' : 'f-warn'}"><b>${esc(sm.text)}</b></p>
    ${sm.outside ? `<p class="f-warn" data-outside>${esc(sm.outside)}</p>` : ''}
    ${manualHtml(out.manual)}
    ${rows.length ? `<ul class="d-zl">${rows.map(r => zoneLineHtml(r, 'fetch')).join('')}</ul>` : ''}</div>`;
}
/** La fin d'une purge (ou « Rien à purger » quand le plan est vide) : le résumé, les phrases des avertissements, les lignes des zones. */
function purgeResultHtml(r) {
  const sm = purgeSummary(r.out, !!r.nothing),
    rows = !r.nothing && S.view?.zones ? M.zoneRows(S.view, S.ids, 'purge') : [];
  return `<div data-build-result data-op="purge" data-result="${r.nothing ? 'nothing' : r.out.kind}"><p class="${sm.level === 'ok' ? '' : 'f-warn'}"><b>${esc(sm.text)}</b></p>
    ${sm.notes.map(n => `<p class="f-muted" data-line>${esc(n)}</p>`).join('')}
    ${rows.length ? `<ul class="d-zl">${rows.map(z => zoneLineHtml(z, 'purge')).join('')}</ul>` : ''}</div>`;
}
/** La fin de la dernière opération du panneau : la phrase de résumé, ce qu'il y a à faire, puis les lignes des zones (leurs derniers
 *  états, avec le motif des échecs) ; ou la phrase d'un départ refusé. */
function resultHtml() {
  const r = S.result;
  if (!r) return '';
  if (r.refused) return `<div data-build-result data-result="refused" data-refusal="${r.refused.key}"><p class="f-warn">${esc(tt(TX.refused[r.refused.key], { n: r.refused.wait }))}</p></div>`;
  if (r.verb === 'fetch') return fetchResultHtml(r.out);
  if (r.verb === 'purge') return purgeResultHtml(r);
  const sm = summary(r.out),
    rows = S.view?.zones && !['no-browser', 'xplane-in-page'].includes(r.out.kind) ? M.zoneRows(S.view, S.ids) :
  []; // rien n'a tourné : pas de lignes « en attente »
  return `<div data-build-result data-result="${r.out.kind}"><p class="${sm.level === 'ok' ? '' : 'f-warn'}"><b>${esc(sm.text)}</b></p>
    ${sm.advice ? `<p class="f-muted" data-advice>${esc(tt(sm.advice))}</p>` : ''}
    ${rows.length ? `<ul class="d-zl">${rows.map(z => zoneLineHtml(z)).join('')}</ul>` : ''}</div>`;
}
/** L'intérieur du panneau : les zones, les sources sous licence personnelle, les boutons Télécharger · Construire · Purger et leur
 *  raison (une seule), la marche ou la fin. */
function buildInner() {
  const {
    ids,
    ticked
  } = buildZones(),
    gate = buildGate(ticked),
    busy = !!S.run,
    pers = M.personalSources(ticked),
    xplaneOn = pers.some(p => p.id === 'xplane' && S.personal.has('xplane')),
    why = gate.reason ? tt(TX.greyReason[gate.reason]) : '',
    off = gate.disabled ? ' disabled' : '';
  return `<h2>${esc(tt(TX.buildTitle))}</h2>
    <h3>${esc(tt(TX.buildZones))}</h3>
    <div class="d-opts" data-build-zones>${ids.map(z => optHtml('data-build-zone', z, M.zoneName(S.d.zones, z, li()), S.ticked?.has(z), busy)).join('')}</div>
    ${pers.length ? `<h3>${esc(tt(TX.personalTitle))}</h3><div data-personal-box>${pers.map(p => `<div class="d-pers" data-personal-row="${p.id}">
      ${optHtml('data-personal', p.id, personalName(p.id), S.personal.has(p.id), busy)}
      <p class="f-muted" data-personal-line>${esc(tt(TX.personalLine[p.kind]))}</p>
      ${p.id === 'xplane' && xplaneOn ? `<p class="f-warn" data-xplane-hint>${esc(tt(TX.xplaneHint))}</p>` : ''}</div>`).join('')}</div>` : ''}
    <p class="d-verbs"><button type="button" data-verb="download"${off}>${esc(tt(TX.download))}</button>
      <button type="button" class="primary" data-verb="build"${off}>${esc(tt(TX.build))}</button>
      <button type="button" data-verb="purge"${off}>${esc(tt(TX.purge))}</button></p>
    ${why ? `<p class="f-muted" data-reason="${gate.reason}">${esc(why)}</p>` : ''}
    ${S.other && !S.run ? `<p class="f-muted" data-other>${esc(tt(TX.otherRunning, { s: S.other.step || '…' }))}</p>` : ''}
    ${S.run ? runningHtml() : resultHtml()}`;
}
/** Le panneau « Télécharger, construire, purger » (en tête du groupe Base aéronautique). */
function buildHtml() {
  return `<section class="f-card" data-build>${buildInner()}</section>`;
}
/** Redessine le panneau seul (une marche s'y met à jour chaque seconde) ; la case ou le bouton qui avait le focus le garde. */
function renderBuild() {
  renderPublish(); // le bouton « Publier » suit la construction (et l'inverse) : un seul point de redessin pour les deux panneaux
  const box = S?.body?.querySelector('[data-build]');
  if (!box || !S.d) return;
  const a = box.contains(document.activeElement) ? document.activeElement : null,
    sel = a ? a.dataset.buildZone ? `[data-build-zone="${CSS.escape(a.dataset.buildZone)}"]` : a.dataset.personal ? `[data-personal="${CSS.escape(a.dataset.personal)}"]` : a
    .dataset.verb ? `[data-verb="${CSS.escape(a.dataset.verb)}"]` : '' : '';
  keepScroll(S.body, () => {
    box.innerHTML = buildInner();
    const el = sel && box.querySelector(sel);
    if (el && !el.disabled) el.focus({
      preventScroll: true
    });
  });
}
/** Ouvre le groupe Base aéronautique (une marche ou un résultat s'y montre) sans attendre un toucher. */
function openBase() {
  S.manual.base = true;
  const g = S.body?.querySelector('details.f-group[data-group="base"]');
  if (g) g.open = true;
}
/** La ligne d'une opération du journal : heure UTC, verbe, zones, résultat. */
function opHtml(e) {
  const zs = e.verb === 'publish' ? count('file', M.num(e.committed) ?? 0) : (e.zones || []).map(z => M.zoneName(S.d?.zones, z, li())).join(
    ', ');
  return `<li data-op data-result="${esc(e.result)}" data-op-verb="${esc(e.verb)}"><time datetime="${esc(e.at)}">${esc(fmtDateZ(e.at, lang()))}</time> · ${esc(tt(TX.opVerb[e.verb] || [e.verb, e.verb, e.verb, e.verb]))} · ${esc(zs)} · ${esc(tt(TX.opResult[e.result] || [e.result, e.result, e.result, e.result]))}</li>`;
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

// ---------------------------------------------------------------- publier la base
/** Le cadre sait-il publier ? Seul `ctx.data.sync.gesture === true` le dit : sans lui, jamais de passage sans geste. */
function canGesture() {
  return typeof S.ctx.data?.sync === 'function' && S.ctx.data.sync.gesture === true;
}
/** L'état du bouton « Publier » : { disabled, reason } d'après le lanceur, la construction, le cadre, l'état de data/ et le réseau. */
function publishGate() {
  return M.publishState({
    launcher: !!S.ctx.launcher,
    publishing: !!S.pub.phase,
    building: !!S.run,
    other: !!S.other || !!S.asking, // la question d'une purge est posée : une opération à la fois
    gesture: canGesture(),
    nothing: M.publishCounts(S.pub.status).nothing,
    offline: navigator.onLine === false
  });
}
/** Le texte d'une raison de bouton gris de « Publier » : les siennes (TX.pubReason), à défaut celles de « Construire ». */
function publishReason(key) {
  return tt(TX.pubReason[key] || TX.greyReason[key]);
}
/** « 3 fichiers modifiés · 2 commits à envoyer » : ce que data/ porte à envoyer. */
function publishCountsText(n, m) {
  return `${tt(TX.pubFiles[n === 1 ? 0 : 1], { n })} · ${tt(TX.pubCommits[m === 1 ? 0 : 1], { n: m })}`;
}
/** Les lignes d'état du panneau : fichiers et commits (ou « rien à publier » par la raison du bouton, une fois), la fusion en
 *  attente, le dernier passage ; une ligne d'erreur si sync-status n'a pas répondu. */
function publishStateHtml() {
  if (!S.ctx.launcher) return '';
  const c = M.publishCounts(S.pub.status);
  if (!c.known) return `<p class="f-warn" data-publish-state="unread">${esc(tt(TX.pubUnread))}</p>`;
  const last = c.last ? tt(c.last.pushed ? TX.pubLastSent : TX.pubLastKept, {
    d: fmtDateZ(c.last.at, lang())
  }) : '';
  return `${c.nothing ? '' : `<p data-publish-state="changes">${esc(publishCountsText(c.changes, c.ahead))}</p>`}
    ${c.merging ? `<p class="f-warn" data-publish-merge>${esc(tt(TX.pubMerge))}</p>` : ''}
    ${last ? `<p class="f-muted" data-publish-last>${esc(last)}</p>` : ''}`;
}
/** La fin de la dernière publication : les lignes du résumé (la première dit ce qui est parti), puis ce qui est resté sur le poste,
 *  les conflits, les refus ; pour un échec, la phrase et ce que dit le lanceur (texte, jamais du HTML). [{ key, text }]. */
function publishLines(o) {
  const lines = [];
  if (o.kind === 'failed') lines.push({
    key: 'failed',
    text: tt(TX.pubFailed)
  });
  else if (o.kind === 'no-exchange') lines.push({
    key: 'no-exchange',
    text: tt(TX.pubNoExchange)
  });
  else lines.push({
    key: o.kind,
    text: tt(o.kind === 'done' ? TX.pubDone : TX.pubLocal, {
      c: o.committed,
      r: o.received
    })
  });
  if (o.held > 0) lines.push({
    key: 'held',
    text: tt(TX.pubHeld[o.held === 1 ? 0 : 1], {
      n: o.held
    })
  });
  if (o.conflicts > 0) lines.push({
    key: 'conflicts',
    text: tt(TX.pubConflicts[o.conflicts === 1 ? 0 : 1], {
      n: o.conflicts
    })
  });
  if (o.refused > 0) lines.push({
    key: 'refused',
    text: tt(TX.pubRefused[o.refused === 1 ? 0 : 1], {
      n: o.refused
    })
  });
  return lines;
}
/** La fin de la dernière publication dans le panneau, ou la phrase d'un état illisible. */
function publishResultHtml() {
  const r = S.pub.result;
  if (!r) return '';
  if (r.unread) return `<div data-publish-result data-result="unread"><p class="f-warn">${esc(tt(TX.pubUnread))}</p></div>`;
  const o = r.out;
  return `<div data-publish-result data-result="${o.kind}">${publishLines(o).map((l, i) => `<p data-line="${l.key}"${i === 0 && o.kind !== 'done' ? ' class="f-warn"' : ''}>${i === 0 ? `<b>${esc(l.text)}</b>` : esc(l.text)}</p>`).join('')}
    ${o.kind === 'failed' && o.message ? `<p class="f-muted" data-publish-message>${esc(tt(TX.pubLauncherSays, { m: o.message }))}</p>` : ''}</div>`;
}
/** La marche : la barre indéterminée et son texte, tant que le lanceur publie. */
function publishingHtml() {
  return `<div data-publishing><span>${esc(tt(TX.pubRunning))}</span><div class="d-bar" role="progressbar" data-indeterminate><i></i></div></div>`;
}
/** L'intérieur du panneau : l'état de data/, le bouton et sa raison (une fois), la marche ou la fin. */
function publishInner() {
  const gate = publishGate(),
    why = gate.reason ? publishReason(gate.reason) : '';
  return `<h2>${esc(tt(TX.publishTitle))}</h2>
    ${publishStateHtml()}
    <p><button type="button" data-verb="publish"${gate.disabled ? ' disabled' : ''}>${esc(tt(TX.publish))}</button></p>
    ${why ? `<p class="f-muted" data-reason="${gate.reason}">${esc(why)}</p>` : ''}
    ${S.pub.phase === 'running' ? publishingHtml() : publishResultHtml()}`;
}
/** Le panneau « Publier la base » (après « Construire », dans le groupe Base aéronautique). */
function publishHtml() {
  return `<section class="f-card" data-publish>${publishInner()}</section>`;
}
/** Redessine le panneau seul ; le bouton qui avait le focus le garde (s'il est encore actif). */
function renderPublish() {
  const box = S?.body?.querySelector('[data-publish]');
  if (!box || !S.d) return;
  const focus = box.contains(document.activeElement) && document.activeElement.dataset.verb === 'publish';
  keepScroll(S.body, () => {
    box.innerHTML = publishInner();
    const b = focus && box.querySelector('[data-verb="publish"]');
    if (b && !b.disabled) b.focus({
      preventScroll: true
    });
  });
}
/** Fin d'une publication : le résultat dans le panneau, une notification avec les comptes, le journal, puis la relecture de l'état
 *  de data/ et de ce qui est publié (le chemin de lecture de l'ouverture). */
async function endPublish(me, out) {
  const lines = publishLines(out),
    level = out.kind === 'failed' ? 'err' : out.kind === 'done' && !out.held && !out.conflicts && !out.refused ? 'ok' : 'warn';
  S.pub.phase = null;
  S.pub.result = {
    out
  };
  renderBuild();
  S.ctx.notify(lines.map(l => l.text).join(' · '), level);
  journalWrite(M.publishEntry(Date.now(), out));
  await load();
}
/** « Publier » : l'état de data/ est relu, une seule question (les fichiers et les commits), puis le passage du cadre avec le geste
 *  (ctx.data.sync({ gesture: true })) — jamais sans la question, jamais pendant une construction. Rien ne part si le bouton est gris. */
async function startPublish() {
  const me = S;
  if (publishGate().disabled) return;
  S.pub.phase = 'asking'; // les deux boutons sont gris dès le toucher : une opération à la fois
  S.pub.result = null;
  renderBuild();
  const status = await readStatus();
  if (S !== me) return;
  S.pub.status = status;
  const c = M.publishCounts(status);
  if (!c.known) { // le lanceur ne répond pas : on le dit, on ne pose pas de question
    S.pub.phase = null;
    S.pub.result = {
      unread: true
    };
    renderBuild();
    S.ctx.notify(tt(TX.pubUnread), 'err');
    return;
  }
  const yes = c.nothing ? false : await S.ctx.ask(c.changes && c.ahead ? tt(TX.pubAsk, {
    f: count('file', c.changes),
    c: count('commit', c.ahead)
  }) : tt(TX.pubAskOne, {
    x: c.changes ? count('file', c.changes) : count('commit', c.ahead)
  }), {
    ok: tt(TX.publish)
  });
  if (S !== me) return;
  if (!yes) { // refus (ou plus rien à envoyer entre-temps) : rien n'est fait
    S.pub.phase = null;
    renderBuild();
    return;
  }
  S.pub.phase = 'running';
  renderBuild();
  let r;
  try {
    r = await S.ctx.data.sync({
      gesture: true
    });
  } catch (e) {
    r = {
      ok: false,
      error: e?.message || ''
    };
  }
  if (S !== me) return;
  await endPublish(me, M.publishOutcome(r));
}

// ---------------------------------------------------------------- la marche
/** Une seconde de plus : met à jour le seul temps écoulé de la marche. */
function tick() {
  const run = S?.run,
    el = S?.body?.querySelector('[data-build] [data-elapsed]');
  if (run && el) el.textContent = tt(TX.elapsed, {
    t: M.clock((Date.now() - run.t0) / 1e3)
  });
}
/** Arrête le minuteur du temps écoulé. */
function stopTimer() {
  clearInterval(S?.timer);
  if (S) S.timer = 0;
}
/** Commence une marche (la nôtre ou un travail trouvé en route) : verbe, zones, minuteur, groupe ouvert. `dry` : le plan d'une purge. */
function beginRun(ids, ctrl, verb = 'build', dry = false) {
  S.run = {
    phase: 'running',
    t0: Date.now(),
    ctrl,
    verb,
    dry
  };
  S.ids = ids;
  S.view = null;
  S.result = null;
  stopTimer();
  S.timer = setInterval(tick, 1000);
  openBase();
}
/** Une vue du travail arrive : elle remplace la précédente et le panneau se redessine. Un travail de la base (construction,
 *  téléchargement ou purge) trouvé en route (resume) est adopté à sa première vue, avec son verbe ; le travail d'une autre opération
 *  n'est que signalé. */
function onView(me, v, ctrl) {
  if (S !== me || !v) return;
  const verb = M.viewVerb(v);
  if (!verb) {
    S.other = v;
    return renderBuild();
  }
  if (!S.run) beginRun(Object.keys(v.zones || {}), ctrl, verb, M.isDry(v));
  S.view = v;
  if (S.ids.length === 0) S.ids = Object.keys(v.zones || {});
  renderBuild();
}
/** Écrit l'opération au journal (cache/data/journal.json, les 50 dernières) et redessine le journal. */
function journalWrite(entry) {
  const list = M.journalAdd(S.journal, entry);
  if (list === S.journal) return;
  S.journal = list;
  S.ctx.data.put(JOURNAL, {
    ops: list,
    updated_at: new Date().toISOString()
  }).catch(() => {});
  renderJournal();
}
/** Fin d'un travail de la base, quel que soit son verbe : l'état de la marche est rendu, puis la fin propre au verbe (construction,
 *  téléchargement, plan de purge, purge). `live` : la fin s'est produite sous nos yeux (sinon c'est celle d'un travail déjà fini). */
async function endRun(me, final, live) {
  const run = S.run,
    verb = run?.verb || M.viewVerb(final) || 'build',
    dry = verb === 'purge' && (run ? run.dry : M.isDry(final)),
    seconds = run ? (Date.now() - run.t0) / 1e3 : null;
  if (!S.ids.length) S.ids = Object.keys(final.zones || {});
  stopTimer();
  S.run = null;
  S.other = null;
  S.view = final;
  if (dry && !live) return renderBuild(); // le plan d'une purge terminé avant l'ouverture : il n'est plus à poser
  if (verb === 'fetch') return endFetch(me, final, live, seconds);
  if (verb === 'purge') return dry ? endPlan(me, final, live) : endPurge(me, final, live, seconds);
  return endBuild(me, final, live, seconds);
}
/** Fin d'une construction : le résumé dans le panneau, une notification (si on l'a suivie jusqu'au bout), le journal, puis la
 *  relecture de ce qui est publié. */
async function endBuild(me, final, live, seconds) {
  const out = M.outcome(final);
  S.result = {
    verb: 'build',
    out
  };
  renderBuild();
  if (live) {
    const sm = summary(out);
    S.ctx.notify(sm.text, sm.level);
  }
  journalWrite(M.journalEntry({
    at: Date.now(),
    zones: S.ids,
    seconds,
    out,
    job: final.job || final.id
  }));
  if (live) await load(); // les états des lignes ont changé : même chemin de lecture que l'ouverture
}
/** Fin d'un téléchargement : le résumé, les sources manuelles et les lignes dans le panneau, une notification (le résumé, et les fichiers
 *  hors synchronisation s'il y en a), le journal (verbe « download »), puis la relecture de ce qui est publié. */
async function endFetch(me, final, live, seconds) {
  const out = M.fetchOutcome(final),
    sm = fetchSummary(out);
  S.result = {
    verb: 'fetch',
    out
  };
  renderBuild();
  if (live) S.ctx.notify([sm.text, sm.outside].filter(Boolean).join(' · '), sm.level);
  journalWrite(M.fetchEntry({
    at: Date.now(),
    zones: S.ids,
    seconds,
    out,
    job: final.job || final.id
  }));
  if (live) await load();
}
/** Fin d'une purge réelle : le résumé et les phrases des avertissements dans le panneau, une notification, le journal, puis la relecture. */
async function endPurge(me, final, live, seconds) {
  const out = M.purgeOutcome(final),
    sm = purgeSummary(out);
  S.result = {
    verb: 'purge',
    out
  };
  renderBuild();
  if (live) S.ctx.notify([sm.text, ...sm.notes].join(' · '), sm.level);
  journalWrite(M.purgeEntry({
    at: Date.now(),
    zones: S.ids,
    seconds,
    out,
    job: final.job || final.id
  }));
  if (live) await load();
}
/** Fin du plan d'une purge (le travail à blanc, jamais journalisé) : rien à retirer, on le dit sans question ; sinon UNE question (les
 *  fichiers, la taille, les zones, les phrases des avertissements) et, si oui, la purge réelle sur les mêmes zones. Un plan arrêté,
 *  échoué ou interrompu ne pose aucune question. */
async function endPlan(me, final, live) {
  const out = M.purgeOutcome(final);
  if (out.kind === 'cancelled') { // « Arrêter » pendant le plan : rien à dire, rien n'a été retiré
    S.result = null;
    return renderBuild();
  }
  if (out.kind !== 'done' || out.nothing) {
    S.result = out.kind === 'done' ? {
      verb: 'purge',
      out,
      nothing: true
    } : {
      verb: 'purge',
      out
    };
    renderBuild();
    const sm = purgeSummary(out, out.kind === 'done');
    S.ctx.notify([sm.text, ...sm.notes].join(' · '), sm.level);
    return;
  }
  S.result = null;
  S.asking = true; // les boutons restent gris pendant la question : une opération à la fois
  renderBuild();
  const yes = await S.ctx.ask(purgeAsk(out), {
    ok: tt(TX.purge)
  });
  if (S !== me) return;
  S.asking = false;
  if (!yes) { // non : rien n'est retiré, rien n'est dit
    renderBuild();
    return;
  }
  await settle(me, await launch('purge', {
    zones: S.ids
  }, S.ids), true);
}
/** Un départ refusé (409 : une autre opération ; 429 : trop tôt ; 404 : lanceur ancien…) : la phrase, une notification. Après un
 *  409 on suit l'opération qui tourne, pour que le bouton redevienne actif à sa fin. */
function refused(me, r) {
  const f = M.refusal(r);
  stopTimer();
  S.run = null;
  S.result = {
    refused: f
  };
  if (f.key === 'busy') S.other = S.other || {}; // une opération tourne : le bouton reste gris pendant qu'on la rejoint
  renderBuild();
  S.ctx.notify(tt(TX.refused[f.key], {
    n: f.wait
  }), 'err');
  if (f.key === 'busy') follow();
}
/** Termine d'après ce que rend ctx.launcher.job ou .resume : une fin (état connu), un arrêt demandé (on attend la vraie fin du
 *  travail), un suivi détaché (démontage : rien), ou un refus. */
async function settle(me, r, live = true) {
  if (S !== me || !r || r.detached) return;
  if (r.cancelled && !r.state) {
    // « Arrêter » : le cadre a envoyé l'annulation et rend la main ; la construction finit sa zone en cours, on suit sa vraie fin
    if (S.run) {
      S.run.phase = 'stopping';
      renderBuild();
    }
    const e = await S.ctx.launcher.resume(ROUTE, {
      onProgress: v => onView(me, v)
    });
    if (S !== me) return;
    return endRun(me, e?.state && e.state !== 'running' ? e : {
      state: 'cancelled',
      zones: S.view?.zones,
      job: r.job
    }, live);
  }
  if (r.state && r.state !== 'running') {
    if (M.viewVerb(r) || S.run) return endRun(me, r, live);
    S.other = null; // la fin d'une autre opération : le bouton redevient actif
    return renderBuild();
  }
  if (r.aborted) return;
  return refused(me, r);
}
/** Suit le travail de la base (construction, téléchargement ou purge) que le lanceur fait tourner (page rechargée, ou départ refusé
 *  pour cause d'opération en cours) ; si le dernier s'est terminé, en dit la fin. Ne bloque pas le montage. */
async function follow() {
  const me = S,
    L = S.ctx.launcher;
  if (!L) return;
  const ctrl = new AbortController();
  const r = await L.resume(ROUTE, {
    onProgress: v => onView(me, v, ctrl),
    signal: ctrl.signal
  });
  if (S !== me || !r) return;
  if (r.ok === false && !r.state && !r.cancelled) return; // pas de réponse : l'écran reste tel quel
  S.other = null;
  return settle(me, r, !!S.run);
}
/** Lance un travail de la base sur le lanceur (regen/job) et le suit par ses vues : la marche commence aussitôt ; rend la fin que
 *  ctx.launcher.job donne (à passer à settle). */
async function launch(verb, args, ids, dry = false) {
  const me = S,
    ctrl = new AbortController();
  beginRun(ids, ctrl, verb, dry);
  renderBuild();
  return S.ctx.launcher.job(ROUTE, {
    set: 'base',
    verb,
    args
  }, {
    onProgress: v => onView(me, v, ctrl),
    signal: ctrl.signal
  });
}
/** « Construire » : les zones cochées et les sources personnelles cochées vont au lanceur (regen/job) ; la marche se suit par
 *  ses vues. Rien ne part si le bouton est gris. */
async function startBuild() {
  const me = S,
    {
      ticked
    } = buildZones();
  if (buildGate(ticked).disabled) return;
  await settle(me, await launch('build', {
    zones: ticked,
    personal: personalPicked(ticked)
  }, ticked), true);
}
/** « Télécharger » : les zones cochées et les sources personnelles cochées (ENAIRE n'est téléchargée que cochée) vont au lanceur,
 *  verbe « fetch » ; la marche se suit par ses vues. Rien ne part si le bouton est gris. */
async function startFetch() {
  const me = S,
    {
      ticked
    } = buildZones();
  if (buildGate(ticked).disabled) return;
  await settle(me, await launch('fetch', {
    zones: ticked,
    personal: personalPicked(ticked)
  }, ticked), true);
}
/** « Purger » : d'abord le plan (le même travail, à blanc : dry), suivi comme un travail ; sa fin (endPlan) pose la question, puis la
 *  purge réelle. Rien ne part si le bouton est gris. */
async function startPurge() {
  const me = S,
    {
      ticked
    } = buildZones();
  if (buildGate(ticked).disabled) return;
  await settle(me, await launch('purge', {
    zones: ticked,
    dry: true
  }, ticked, true), true);
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
  const v = e.target.closest?.('button[data-verb]');
  if (!v || v.disabled) return;
  if (v.dataset.verb === 'build') startBuild();
  else if (v.dataset.verb === 'download') startFetch();
  else if (v.dataset.verb === 'purge') startPurge();
  else if (v.dataset.verb === 'publish') startPublish();
  else if (v.dataset.verb === 'stop') S.run?.ctrl.abort();
}
/** Une case du panneau « Construire » (zone ou source sous licence personnelle) change : le choix est retenu, le panneau redessiné
 *  (les sources proposées suivent les zones cochées). */
function onChange(e) {
  const t = e.target;
  if (t instanceof HTMLSelectElement && t.matches('[data-add-zone]')) return t.value && addZone(t.value);
  if (!(t instanceof HTMLInputElement) || S.run) return;
  const set = t.dataset.buildZone ? S.ticked : t.dataset.personal ? S.personal : null,
    id = t.dataset.buildZone || t.dataset.personal;
  if (!set) return;
  if (t.checked) set.add(id);
  else set.delete(id);
  renderBuild();
}
/** Retient les groupes ouverts ou fermés à la main, d'un dessin à l'autre. */
function onToggle(e) {
  const g = e.target;
  if (g instanceof HTMLDetailsElement && g.matches('details.f-group') && g.isConnected) S.manual[g.dataset.group] = g.open;
  else if (g instanceof HTMLDetailsElement && g.matches('details.d-journal') && g.isConnected) S.journalOpen = g.open;
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
    again: 0,
    ticked: null, // zones cochées pour la construction (toutes à la première lecture)
    personal: new Set(), // sources sous licence personnelle cochées (aucune par défaut)
    run: null, // le travail de la base suivi : { phase: 'running' | 'stopping', t0, ctrl, verb ('build' | 'fetch' | 'purge'), dry }
    asking: false, // la question d'une purge est posée : les boutons restent gris
    view: null, // la dernière vue du travail du lanceur
    ids: [], // les zones du travail en cours ou du dernier
    result: null, // la fin du dernier : { verb, out } (purge à plan vide : nothing) ou { refused }
    other: null, // la vue d'une autre opération du lanceur, tant qu'elle tourne
    pub: {
      status: null,
      phase: null,
      result: null
    }, // « Publier » : sync-status lu, 'asking' | 'running' | null, la fin { out } ou { unread }
    journal: [],
    journalOpen: false,
    timer: 0
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
  S.body.addEventListener('change', onChange);
  S.onNet = () => renderBuild(); // « hors ligne » : la raison du bouton suit le réseau
  window.addEventListener('online', S.onNet);
  window.addEventListener('offline', S.onNet);
  S.body.addEventListener('toggle', onToggle, true);
  // la couverture par État dépend de la table de couverture d'aerodb : redemandée quand il annonce { coverage: true }
  if (ctx.aerodb?.on) S.stops.push(ctx.aerodb.on('change', onAerodbChange));
  S.journal = M.journalList(await ctx.data.get(JOURNAL).catch(() => null));
  await load();
  follow(); // un travail de la base en cours sur le lanceur (page rechargée) se suit ; le dernier terminé dit sa fin
}

/** Démonte : retire les écouteurs et l'abonnement à aerodb, arrête le minuteur ; une lecture encore en cours ne dessine plus rien.
 *  Le suivi du travail est arrêté par le cadre, sans l'annuler (il continue sur le lanceur). */
export function unmount() {
  if (!S) return;
  window.removeEventListener('frame-titled', S.srTitle);
  window.removeEventListener('online', S.onNet);
  window.removeEventListener('offline', S.onNet);
  clearTimeout(S.again);
  stopTimer(); // le suivi s'arrête de lui-même au démontage (le cadre) : le travail, lui, continue sur le lanceur
  for (const f of S.stops) f?.();
  S.body = null;
  S = null;
}
