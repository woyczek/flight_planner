// V3 data — « Données » de l'appli Pilote, monté par le cadre (frame/SPEC.md § 3.2 ; modules/data/SPEC.md, INTEGRATION.md).
// Un écran de lecture, et pour chaque groupe le même panneau de trois verbes du lanceur : « Télécharger » les sources, « Construire », « Purger »
// (base : zones, base/fetch · base/build · base/purge ; procédures : États, proc/… ; points VFR : le cycle, vfr/… ; appareils : types OACI,
// aircraft/…), puis « Publier » ce qui a été construit vers le dépôt des données (panneau partagé, groupe Base aéronautique) et « Publier » les
// fiches de la compagnie (aircraft/publish) ; journal au pied de l'écran. Une seule opération à la fois, tous panneaux confondus, retrouvée à
// l'ouverture. Les verbes que le lanceur connaît se lisent une fois au montage (regen/verbs) : un verbe inconnu grise son bouton. En tête, le
// cycle AIRAC en vigueur et le lanceur ; la couverture (les zones de ce poste, puis les États par couleur) ; quatre groupes de jeux de données
// (base aéronautique, procédures, appareils, météo), une ligne par jeu avec son cycle, son âge, sa taille et un état calculé, le détail sous un toucher.
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
  // la construction de la base est un travail du lanceur (regen/job) ; regen/verbs : les opérations que ce lanceur connaît ; aucune lecture de data/ par le lanceur
  launcher: {
    // regen/job couvre aussi son annulation regen/job/cancel (cadre, f70eba426) ; sync-status : l'état de data/ avant la
    // question de « Publier » (GET, jamais de POST /__setup/sync : la publication passe par ctx.data.sync)
    routes: ['regen/job', 'regen/verbs', 'sync-status'],
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
/** L'assistant de première installation (page V2 servie par le lanceur : SPEC § 6.5), adresse fixe du dépôt, jamais prise d'une réponse. */
const FIRST_INSTALL = new URL('../../apps/settings/premier_lancement.html', import.meta.url).pathname;
const ROUTE = 'regen/job'; // le travail du lanceur : construction de la base (verbe D5 d'aerodb)
const VERBS_ROUTE = 'regen/verbs'; // { verbs: ['base/build', …] } : les opérations que ce lanceur connaît (lue une fois au montage)
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
[data-module="data"] .d-map svg{display:block;max-width:100%;height:auto;margin:0 auto}
[data-module="data"] .d-map path{cursor:pointer;fill-opacity:.25;stroke-width:1;vector-effect:non-scaling-stroke;fill:var(--sog-muted);stroke:var(--sog-muted)}
[data-module="data"] .d-map path[data-tone=ok],[data-module="data"] .d-sw[data-tone=ok]{fill:var(--sog-ok);stroke:var(--sog-ok)}
[data-module="data"] .d-map path[data-tone=warn],[data-module="data"] .d-sw[data-tone=warn]{fill:var(--sog-warn);stroke:var(--sog-warn)}
[data-module="data"] .d-map path[data-tone=accent],[data-module="data"] .d-sw[data-tone=accent]{fill:var(--sog-accent);stroke:var(--sog-accent)}
[data-module="data"] .d-map path[data-tone=muted],[data-module="data"] .d-sw[data-tone=muted]{fill:var(--sog-muted);stroke:var(--sog-muted)}
[data-module="data"] .d-map path[aria-checked=true]{fill-opacity:.65;stroke-width:3}
[data-module="data"] .d-map path[data-approx]{stroke-dasharray:6 3}
[data-module="data"] .d-map path[aria-disabled=true]{cursor:default}
[data-module="data"] .d-map path:focus-visible{outline:2px solid var(--sog-accent);outline-offset:1px}
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
/** Les opérations que le lanceur connaît (GET regen/verbs), lues une fois au montage : M.knownVerbs de sa réponse ; sans lanceur, sans réponse, sur
 *  un 404 ou un refus : celles d'un lanceur ancien (base/fetch, base/build, base/purge). Ne lève jamais. */
async function readVerbs() {
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
async function load() {
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
  return `<p><label>${esc(tt(TX.addZone))} <select data-add-zone${frozen() ? ' disabled' : ''}><option value="">${esc(tt(TX.addZonePick))}</option>
    ${rest.map(z => `<option value="${esc(z.id)}">${esc(M.zoneName(zones, z.id, li()))}</option>`).join('')}</select></label></p>`;
}
/** Ajoute une zone connue à la couverture de ce poste : écrite aussitôt (cache/data/coverage.json), cochée pour « Construire » ; une
 *  zone que personne ne publie est construite et publiée par ce poste (SPEC § 3.2). */
function addZone(id) {
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

// ---------------------------------------------------------------- construire la base
/** Les zones de la couverture dans l'ordre de zones() et, parmi elles, les cochées. */
function buildZones() {
  const ids = M.orderZones(S.d.cov.ids, S.d.zones);
  return {
    ids,
    ticked: ids.filter(z => S.ticked?.has(z))
  };
}
/** Une opération tourne-t-elle sur ce poste, de n'importe quel jeu ? Le nôtre, un autre travail du lanceur, la question d'une purge ou d'une
 *  publication de fiches, une publication : une opération à la fois, tous panneaux confondus. */
function busyNow() {
  return !!S.run || !!S.other || !!S.asking || !!S.pub.phase || !!S.chain;
}
/** Les choix des panneaux sont-ils figés ? Pendant une marche et pendant toute la chaîne (y compris entre deux de ses opérations). */
const frozen = () => !!S.run || !!S.chain;
/** L'état des boutons « Télécharger », « Construire » et « Purger » d'un panneau : { reason, verbs } (M.setGate). `set` : le jeu ; `items` : le
 *  nombre d'éléments cochés (absent : le jeu n'en coche pas) ; `verbs` : ceux du panneau (par défaut ceux du jeu). */
function gateOf(set, items, verbs) {
  return M.setGate({
    set,
    verbs,
    launcher: !!S.ctx.launcher,
    known: S.known,
    busy: busyNow(),
    offline: navigator.onLine === false,
    items
  });
}
/** L'état des boutons du panneau de la base (une seule raison pour les trois) : sans lanceur, travail en cours (le nôtre, la question d'une
 *  purge, un autre, une publication), hors ligne, aucune zone cochée, verbe inconnu du lanceur. */
function buildGate(ticked) {
  return gateOf('base', ticked.length);
}
/** Une source du catalogue d'aerodb par son identifiant (byId, à défaut une recherche dans SOURCES) ; undefined si elle n'y est pas. */
function catSource(id) {
  const cat = S.d.cat;
  return cat?.byId ? cat.byId(id) : cat?.SOURCES?.find(s => s.id === id);
}
/** Le nom d'une source sous licence personnelle : celui du catalogue d'aerodb, à défaut un texte du module. */
function personalName(id) {
  return catSource(id)?.n?.[li()] || tt(TX.personalName[id]);
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
  return catSource(id)?.n?.[li()] || id;
}
/** Le motif d'un échec de source : « HTTP 404 » (code et statut), « le réseau ne répond pas »… */
function fetchWhy(code, status) {
  if (code === 'http' && status !== null) return tt(TX.fetchError.httpN, {
    s: status
  });
  return code && !TX.fetchError[code] ? itemWhy(code) : tt(TX.fetchError[code] || TX.fetchError
    .unknown); // un code court d'un autre jeu : sa phrase, sinon tel quel
}
/** Le motif d'un code d'erreur d'un élément propre aux jeux autres que la base (TX.itemError : « un terrain à la fois »…), sinon le code tel quel. */
const itemWhy = code => TX.itemError[code] ? tt(TX.itemError[code]) : code ?? '';
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
    r: verb === 'fetch' ? fetchWhy(r.code, null) : verb !== 'purge' && TX.zoneError[r.code] ? tt(TX.zoneError[r.code]) : r.code ===
      'unknown' ? tt(TX
        .zoneError.unknown) : itemWhy(r
        .code) // un code que le module ne connaît pas (un jeu autre que la base) : sa phrase, sinon tel quel
  });
  if (/[NP]$/.test(r.key)) return tt(T[r.key], {
    n: r.n,
    m: r.m
  });
  if (verb === 'purge' && r.key === 'done') return tt(T.done, {
    n: count('file', r.files ?? 0),
    s: M.fmtBytes(r.bytes ?? 0, lang())
  });
  return tt(T[r.key]);
}
/** Le nom d'un élément d'un jeu dans la langue : la zone (base), l'État (procédures), « Cycle 2611 » (le cycle, désigné par sa date d'effet), le
 *  type OACI tel quel. */
function itemName(set, id) {
  if (set === 'base') return M.zoneName(S.d?.zones, id, li());
  if (set === 'proc') return M.bulkName(S.d?.byState, id, li());
  if (set === 'vfr') return S.airac && /^\d{4}-\d{2}-\d{2}$/.test(id) ? tt(TX.cycle, {
    c: M.cycleName(S.airac, id)
  }) : id;
  return TX.stepName[id] ? tt(TX.stepName[id]) : id; // les appareils : les trois étapes
}
/** La vue du dernier travail du jeu, ramenée à la forme de la base (M.normView) pour les lignes d'éléments. */
const opView = set => M.normView(set, S.view);
/** La ligne d'un élément dans la marche : point de couleur, nom, phrase ; pour un téléchargement, dessous une ligne par source. `set` : le jeu
 *  (la base garde data-zone-state, les autres data-item-state). */
function zoneLineHtml(r, verb = 'build', set = 'base') {
  const word = zoneWord(r, verb),
    attr = set === 'base' ? 'data-zone-state' : 'data-item-state',
    k = {
      built: 'ok',
      done: 'ok',
      failed: 'err',
      building: 'accent',
      fetching: 'accent',
      purging: 'accent',
      cancelled: 'warn'
    } [r.state],
    head = `<b>${esc(itemName(set, r.zone))}</b> : ${esc(word)}`;
  if (verb === 'fetch') {
    const src = M.sourceRows(opView(set)?.zones?.[r.zone]);
    return `<li ${attr}="${esc(r.zone)}" data-state="${r.state}"><i class="f-dot"${kind(k)} aria-hidden="true"></i><div>${head}${src.length ? `<ul class="d-sl" data-sources>${src.map(sourceLineHtml).join('')}</ul>` : ''}</div></li>`;
  }
  return `<li ${attr}="${esc(r.zone)}" data-state="${r.state}"><i class="f-dot"${kind(k)} aria-hidden="true"></i><span>${head}</span></li>`;
}
/** « 12 terrains » : le nombre fait, avec le nom de ce que le travail compte (la vue dit son unité : aerodromes, steps…) ; la base compte des zones ; un
 *  jeu dont l'unité est inconnue donne le nombre seul. */
function runUnit(set, view, n) {
  if (set === 'base') return count('zone', n);
  const u = {
    steps: 'step',
    aerodromes: 'aerodrome',
    files: 'file',
    types: 'type',
    states: 'state',
    zones: 'zone',
    cycles: 'cycle',
    sheets: 'sheet',
    charts: 'chart'
  } [view?.unit];
  return u ? count(u, n) : String(n);
}
/** La marche : barre, « n zones sur m », étape, temps écoulé, « Arrêter », une ligne par zone (par source pour un téléchargement). */
function runningHtml() {
  const run = S.run,
    set = run.set,
    p = M.progress(S.view, S.ids),
    stopping = run.phase === 'stopping',
    shown = run.verb !== M.PICKUP.verb && (p.total > 0 || set === 'base' && !M.SETS[set]
      .free
    ); // un jeu dont on ne connaît pas encore les éléments ne compte pas « 0 sur 0 » ; la prise de fichiers compte des fichiers à la fin
  return `<div class="d-run" data-running data-op="${run.verb}" data-run-set="${esc(set)}"${run.dry ? ' data-dry' : ''} data-phase="${run.phase}">
    <div class="d-runhead">${shown ? `<b data-count>${esc(tt(TX.runCount, { n: runUnit(set, S.view, p.done), m: p.total }))}</b>` : ''}
      <span data-step>${esc(stopping ? tt(TX.stopping) : S.view?.step || '')}</span>
      <span class="f-muted" data-elapsed>${esc(tt(TX.elapsed, { t: M.clock((Date.now() - run.t0) / 1e3) }))}</span></div>
    <div class="d-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.done}"${S.view && p.pct !== null ? '' : ' data-indeterminate'}><i style="width:${p.pct ?? 0}%"></i></div>
    ${run.verb === M.PICKUP.verb ? '' : `<ul class="d-zl">${M.zoneRows(opView(set), S.ids, run.verb, set !== 'base').map(r => zoneLineHtml(r, run.verb, set)).join('')}</ul>`}
    <p><button type="button" data-verb="stop"${stopping ? ' disabled' : ''}>${esc(tt(TX.stop))}</button></p></div>`;
}
/** Le résumé de fin d'une construction d'un jeu autre que la base : { text, advice, level } d'après la fin calculée par M.outcome. */
function setSummary(out, set) {
  const T = TX.setSum,
    v = {
      s: tt(TX.setLabel[set]),
      built: count(M.SETS[set].unit, out.built.length),
      failed: out.failed.length,
      items: out.failed.map(f => itemName(set, f.zone)).join(', '),
      n: count(M.SETS[set].unit, out.built.length)
    };
  return {
    done: {
      text: tt(T.buildDone, v),
      level: 'ok'
    },
    partial: {
      text: tt(T.buildPartial, v),
      advice: TX.setAdvice.partial,
      level: 'warn'
    },
    failed: {
      text: tt(T.buildFailed, v),
      advice: TX.setAdvice.failed,
      level: 'err'
    },
    cancelled: {
      text: tt(T.buildStopped, v),
      advice: TX.setAdvice.cancelled,
      level: 'warn'
    },
    interrupted: {
      text: tt(T.buildInterrupted, v),
      advice: TX.setAdvice.interrupted,
      level: 'warn'
    },
    'no-codes': {
      text: tt(T.noCodes, v),
      level: 'err'
    },
    'no-script': {
      text: tt(T.noScript, v),
      level: 'err'
    },
    'merge-pending': {
      text: tt(TX.mergePending),
      level: 'err'
    },
    'no-pypdf': {
      text: tt(TX.vfrSum.noPypdf, v),
      level: 'err'
    },
    'no-cache': {
      text: tt(TX.vfrSum.noCache, v),
      level: 'err'
    },
    invalid: {
      text: tt(TX.vfrSum.invalid, v),
      level: 'err'
    }
  } [out.kind] || {
    text: tt(T.buildFailed, v),
    advice: TX.setAdvice.failed,
    level: 'err'
  };
}
/** Le résumé de fin d'une construction d'un jeu autre que la base, avec ses notes : sans trigramme le lanceur ne commite pas, on le dit. */
function setSummaryNotes(out, set) {
  const sm = setSummary(out, set);
  return out.noCommit ? {
    ...sm,
    level: sm.level === 'ok' ? 'warn' : sm.level,
    notes: [tt(TX.vfrNoCommit)]
  } : sm;
}
/** Le résumé de fin (aussi le texte de la notification) : { text, advice, level } d'après la fin calculée par M.outcome. */
function summary(out, set = 'base') {
  if (set !== 'base') return setSummaryNotes(out, set);
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
    },
    'merge-pending': {
      text: tt(TX.mergePending),
      level: 'err'
    }
  } [out.kind];
}
/** Une part de phrase au singulier ou au pluriel : TX[key] = [[singulier], [pluriel]]. */
const plural = (key, n) => tt(TX[key][n === 1 ? 0 : 1], {
  n
});
/** Le résumé d'un téléchargement : { text, outside (la phrase des fichiers hors synchronisation, vide sans), level }. */
function fetchSummary(out, set = 'base') {
  if (set === 'vfr') {
    const v = {
      s: tt(TX.setLabel.vfr),
      c: out.counts.fetched,
      u: out.counts.unchanged,
      p: plural('vfrNotPublished', out.counts.notPublished),
      f: plural('fetchFails', out.failed.length)
    };
    return {
      text: tt(out.kind === 'no-base' ? TX.vfrSum.noBase : out.kind === 'not-published' ? TX.vfrSum.notPublished : out.kind ===
        'interrupted' ? TX.setSum
        .fetchInterrupted : out.kind === 'cancelled' ? TX.vfrSum.fetchStopped : TX.vfrSum.fetchDone, v),
      outside: '',
      level: out.level
    };
  }
  if (set !== 'base') {
    const T = TX.setSum,
      unit = M.SETS[set].unit,
      v = {
        s: tt(TX.setLabel[set]),
        c: out.counts ? count('aerodrome', out.counts.fetched) : count(unit, out.fetched.length), // proc/fetch compte des terrains
        u: out.counts ? count('aerodrome', out.counts.unchanged) : count(unit, out.unchanged.length),
        f: plural('fetchFails', out.failed.length)
      };
    return {
      text: tt(out.kind === 'nothing' ? T.fetchNothing : out.kind === 'interrupted' ? T.fetchInterrupted : out.kind === 'cancelled' ? T
        .fetchStopped : out.kind === 'no-codes' ? T.noCodes : out.kind === 'no-script' ? T.noScript : T.fetchDone, v),
      outside: out.outside > 0 ? plural('fetchOutside', out.outside) : '',
      level: out.level
    };
  }
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
function purgeAsk(out, set = 'base') {
  const names = set === 'base' ? M.orderZones(out.zones, S.d.zones).map(z => M.zoneName(S.d.zones, z, li())).join(', ') : out.zones.filter(
    z => z !== '*').map(z =>
    itemName(set, z)).join(', ') || tt(TX.setLabel[set]);
  return [tt(set === 'base' ? TX.purgeAsk : TX.purgeAskSet, {
    n: count('file', out.files),
    s: M.fmtBytes(out.bytes, lang()),
    z: names
  }), out.shared ? tt(TX.purgeShared) : '', out.kept > 0 ? plural('purgeKept', out.kept) : ''].filter(Boolean).join(' ');
}
/** Les sources à déposer à la main : leur nom (×4) en lien seulement si l'adresse est en https://, sinon le nom seul. */
function manualHtml(list, set = 'base') {
  if (!list.length) return '';
  const item = m => {
    const name = esc(m.name?.[li()] || m.name?.[0] || sourceName(m.source)),
      label = M.isHttps(m.url) ? `<a href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">${name}</a>` : `<span>${name}</span>`;
    return `<li data-manual="${esc(m.zone)}:${esc(m.source)}">${esc(itemName(set, m.zone))} : ${label}${m.pickup && m.expected ? ` <span class="f-muted">(${esc(m.expected)})</span>` : ''}</li>`;
  };
  const zones = [...new Set(list.filter(m => m.pickup).map(m => m.zone))],
    off = !zones.length || gateOf('base', zones.length, [M.PICKUP.verb]).verbs[M.PICKUP.verb].disabled ? ' disabled' : '';
  return `<p data-manual-hint>${esc(tt(TX.fetchManual))}</p><ul class="d-manual" data-manual-list>${list.map(item).join('')}</ul>
    ${set === 'base' && zones.length ? `<p><button type="button" data-verb="pickup" data-zones="${esc(zones.join(','))}"${off}>${esc(tt(TX.pickup))}</button></p>` : ''}`;
}
/** La fin d'un téléchargement : le résumé, les fichiers hors synchronisation, les sources manuelles, les lignes des zones et de leurs sources. */
function fetchResultHtml(out, set = 'base') {
  const sm = fetchSummary(out, set),
    rows = ['nothing', 'no-codes', 'no-script', 'no-base', 'not-published'].includes(out.kind) ? [] : M.zoneRows(opView(set), S.ids,
      'fetch', set !==
      'base'); // rien n'a tourné : pas de lignes « en attente »
  return `<div data-build-result data-op="fetch" data-result="${out.kind}"><p class="${sm.level === 'ok' ? '' : 'f-warn'}"><b>${esc(sm.text)}</b></p>
    ${sm.outside ? `<p class="f-warn" data-outside>${esc(sm.outside)}</p>` : ''}
    ${manualHtml(out.manual, set)}
    ${failedHtml(out, set)}
    ${rows.length ? `<ul class="d-zl">${rows.map(r => zoneLineHtml(r, 'fetch', set)).join('')}</ul>` : ''}</div>`;
}
/** Les échecs d'un téléchargement ou d'une construction des points VFR : une ligne par carte ou par problème du plan (l'OACI ou « plan », puis le motif),
 *  sept au plus, le reste sous « n autres ». */
function failedHtml(out, set) {
  if (set !== 'vfr' || !out.failed.length) return '';
  const {
    visible,
    more
  } = M.split(out.failed);
  return `<ul class="d-sl" data-failed>${visible.map(f => `<li data-failed-item="${esc(f.zone)}"><b>${esc(f.zone)}</b> : ${esc(itemWhy(f.error ?? ''))}</li>`).join('')}${more.length ? `<li>${esc(tt(TX.moreStates, { n: more.length }))}</li>` : ''}</ul>`;
}
/** La fin d'une purge (ou « Rien à purger » quand le plan est vide) : le résumé, les phrases des avertissements, les lignes des zones. */
function purgeResultHtml(r) {
  const set = r.set || 'base',
    v = opView(set),
    sm = purgeSummary(r.out, !!r.nothing),
    rows = !r.nothing && v?.zones ? M.zoneRows(v, S.ids, 'purge', set !== 'base') : [];
  return `<div data-build-result data-op="purge" data-result="${r.nothing ? 'nothing' : r.out.kind}"><p class="${sm.level === 'ok' ? '' : 'f-warn'}"><b>${esc(sm.text)}</b></p>
    ${sm.notes.map(n => `<p class="f-muted" data-line>${esc(n)}</p>`).join('')}
    ${rows.length ? `<ul class="d-zl">${rows.map(z => zoneLineHtml(z, 'purge', set)).join('')}</ul>` : ''}</div>`;
}
/** Le résumé de la fin d'une publication de fiches : { text, level } (aussi le texte de la notification) ; `none` : le plan n'avait rien à faire. */
function sheetsSummary(out, none = false) {
  const v = {
    c: count('sheet', out.copied),
    r: count('sheet', out.removed)
  };
  if (none) return {
    text: tt(TX.sheetsNothing),
    level: 'ok'
  };
  return {
    text: tt({
      done: TX.sheetsDone,
      failed: TX.sheetsFailed,
      'no-author': TX.sheetsNoAuthor,
      'merge-pending': TX.mergePending,
      cancelled: TX.sheetsStopped,
      interrupted: TX.sheetsInterrupted
    } [out.kind], v),
    level: out.level
  };
}
/** La fin d'une publication de fiches (ou « Rien à publier » quand le plan est vide) : une phrase. */
function sheetsResultHtml(r) {
  const sm = sheetsSummary(r.out, !!r.nothing);
  return `<div data-build-result data-op="publish" data-result="${r.nothing ? 'nothing' : r.out.kind}"><p class="${sm.level === 'ok' ? '' : 'f-warn'}"><b>${esc(sm.text)}</b></p></div>`;
}
/** La fin de la dernière opération du panneau `panel` (M.panelOf) : la phrase de résumé, ce qu'il y a à faire, puis les lignes des éléments (leurs
 *  derniers états, avec le motif des échecs) ; ou la phrase d'un départ refusé. Vide si la dernière opération est celle d'un autre panneau. */
function resultHtml(panel = 'base') {
  const r = S.result;
  if (!r || M.panelOf(r.set || 'base', r.verb) !== panel) return '';
  if (r.verb === M.PICKUP.verb && !r.refused) return pickupResultHtml(r);
  if (r.refused) return `<div data-build-result data-result="refused" data-refusal="${r.refused.key}"><p class="f-warn">${esc(tt(TX.refused[r.refused.key], { n: r.refused.wait }))}</p></div>`;
  const set = r.set || 'base';
  if (panel === 'sheets') return sheetsResultHtml(r);
  if (r.verb === 'fetch') return fetchResultHtml(r.out, set);
  if (r.verb === 'purge') return purgeResultHtml(r);
  const sm = summary(r.out, set),
    v = opView(set),
    rows = v?.zones && !['no-browser', 'xplane-in-page', 'no-codes', 'no-script', 'no-pypdf', 'no-cache', 'merge-pending'].includes(r.out
      .kind) ? M.zoneRows(
      v, S.ids,
      'build', set !== 'base') : []; // rien n'a tourné : pas de lignes « en attente »
  return `<div data-build-result data-result="${r.out.kind}"><p class="${sm.level === 'ok' ? '' : 'f-warn'}"><b>${esc(sm.text)}</b></p>
    ${(sm.notes || []).map(n => `<p class="f-warn" data-line>${esc(n)}</p>`).join('')}
    ${r.out.kind === 'no-pypdf' ? `<p data-line><a href="${esc(FIRST_INSTALL)}">${esc(tt(TX.firstInstall))}</a></p>` : ''}
    ${sm.advice ? `<p class="f-muted" data-advice>${esc(tt(sm.advice))}</p>` : ''}
    ${failedHtml(r.out, set)}
    ${rows.length ? `<ul class="d-zl">${rows.map(z => zoneLineHtml(z, 'build', set)).join('')}</ul>` : ''}</div>`;
}
/** Ce que dit un panneau sous ses boutons : une autre opération du lanceur, puis la marche (si c'est son jeu qui tourne) ou la dernière fin. */
function opAreaHtml(panel) {
  const here = S.run && M.panelOf(S.run.set, S.run.verb) === panel;
  return `${S.other && !S.run ? `<p class="f-muted" data-other>${esc(tt(TX.otherRunning, { s: S.other.step || '…' }))}</p>` : ''}
    ${here ? runningHtml() : S.run ? '' : resultHtml(panel)}`;
}
/** L'intérieur du panneau : les zones, les sources sous licence personnelle, les boutons Télécharger · Construire · Purger et leur
 *  raison (une seule), la marche ou la fin. */
function buildInner() {
  const {
    ids,
    ticked
  } = buildZones(),
    gate = buildGate(ticked),
    busy = frozen(),
    pers = M.personalSources(ticked),
    xplaneOn = pers.some(p => p.id === 'xplane' && S.personal.has('xplane')),
    why = gate.reason ? tt(TX.greyReason[gate.reason]) : '',
    off = verb => gate.verbs[verb].disabled ? ' disabled' : '',
    pk = gateOf('base', ticked.length, [M.PICKUP.verb]).verbs[M.PICKUP
      .verb]; // « Prendre le fichier téléchargé » : le verbe base/pickup, grisé pour sa propre raison
  return `<h2>${esc(tt(TX.buildTitle))}</h2>
    <h3>${esc(tt(TX.buildZones))}</h3>
    ${zoneMapHtml('base')}
    <div class="d-opts" data-build-zones>${ids.map(z => optHtml('data-build-zone', z, M.zoneName(S.d.zones, z, li()), S.ticked?.has(z), busy)).join('')}</div>
    ${pers.length ? `<h3>${esc(tt(TX.personalTitle))}</h3><div data-personal-box>${pers.map(p => `<div class="d-pers" data-personal-row="${p.id}">
      ${optHtml('data-personal', p.id, personalName(p.id), S.personal.has(p.id), busy)}
      <p class="f-muted" data-personal-line>${esc(tt(TX.personalLine[p.kind]))}</p>
      ${p.id === 'xplane' && xplaneOn ? `<p class="f-warn" data-xplane-hint>${esc(tt(TX.xplaneHint))}</p>` : ''}</div>`).join('')}</div>` : ''}
    <p class="d-verbs"><button type="button" data-verb="download"${off('fetch')}>${esc(tt(TX.download))}</button>
      <button type="button" data-verb="pickup"${pk.disabled ? ' disabled' : ''}>${esc(tt(TX.pickup))}</button>
      <button type="button" class="primary" data-verb="build"${off('build')}>${esc(tt(TX.build))}${attnDot(S.attn?.base)}</button>
      <button type="button" data-verb="purge"${off('purge')}>${esc(tt(TX.purge))}</button></p>
    ${why ? `<p class="f-muted" data-reason="${gate.reason}">${esc(why)}</p>` : ''}
    ${pk.reason === 'unknown-verb' && gate.reason !== 'unknown-verb' ? `<p class="f-muted" data-pickup-reason>${esc(tt(TX.greyReason['unknown-verb']))}</p>` : ''}
    ${opAreaHtml('base')}`;
}
/** Le panneau « Télécharger, construire, purger » (en tête du groupe Base aéronautique). */
function buildHtml() {
  return `<section class="f-card" data-build>${buildInner()}</section>`;
}

// ---------------------------------------------------------------- les panneaux des autres groupes (V3 § 10.34, lot A1)
/** Les États proposés aux procédures : verts et oranges de coverageByState(), dans l'ordre de leurs noms. */
function procList() {
  return M.procItems(S.d?.byState, li());
}
/** Ce qu'un panneau a choisi : { ids (les éléments, dans l'ordre), personal (base), cycle (date d'effet, points VFR), codes et bad (appareils : les
 *  types valides et les refusés) }. Les États cochés qui ne sont plus proposés ne comptent pas. */
function selection(set) {
  if (set === 'base') {
    const {
      ticked
    } = buildZones();
    return {
      ids: ticked,
      personal: personalPicked(ticked)
    };
  }
  if (set === 'proc') return {
    ids: procList().map(i => i.id).filter(id => S.picked.has(id))
  };
  if (set === 'vfr') {
    const cycle = S.airac ? S.airac.cycleOf(S.now).date : null;
    return {
      ids: cycle ? [cycle] : [],
      cycle
    };
  }
  const p = M.parseCodes(S.codes);
  return {
    ids: p.codes,
    codes: p.codes,
    bad: p.bad
  };
}
/** Les boutons Télécharger · Construire · Purger d'un panneau (gris pour la raison de M.setGate). */
function verbsHtml(gate, panel) {
  const off = verb => gate.verbs[verb].disabled ? ' disabled' : '';
  return `<p class="d-verbs"><button type="button" data-verb="download"${off('fetch')}>${esc(tt(TX.download))}</button>
      <button type="button" class="primary" data-verb="build"${off('build')}>${esc(tt(TX.build))}${attnDot(S.attn?.[panel])}</button>
      <button type="button" data-verb="purge"${off('purge')}>${esc(tt(TX.purge))}</button></p>`;
}
/** Le choix d'éléments d'un panneau : les États à cocher (procédures), le cycle en vigueur (points VFR), le champ des types OACI (appareils). */
function choiceHtml(set, busy) {
  if (set === 'proc') {
    const list = procList();
    return list.length ? `<div class="d-opts" data-items>${list.map(i => optHtml('data-item', i.id, i.name, S.picked.has(i.id), busy)).join('')}</div>` :
      `<p class="f-muted" data-no-items>${esc(tt(TX.noStates))}</p>`;
  }
  if (set === 'vfr') return S.cycleId ? `<p data-item-cycle><b>${esc(tt(TX.cycle, { c: S.cycleId }))}</b></p>` : '';
  return `<div class="d-codes"><label>${esc(tt(TX.codesLabel))}<input type="text" data-f="codes" value="${esc(S.codes)}" autocomplete="off" autocapitalize="characters" spellcheck="false"${busy ? ' disabled' : ''}></label>
    <p class="f-muted">${esc(tt(TX.codesHint))}</p>
    ${S.codesBad.length ? `<p class="f-warn" data-codes-error>${esc(tt(TX.codesBad, { c: S.codesBad.join(', ') }))}</p>` : ''}</div>`;
}
/** L'intérieur du panneau d'un jeu autre que la base, ou des fiches publiées : le titre, le choix, les boutons et leur raison (une seule), la
 *  marche ou la fin. */
function setInner(panel) {
  if (panel === 'sheets') {
    const gate = gateOf(M.SHEETS.set, undefined, [M.SHEETS.verb]),
      why = gate.reason ? tt(TX.greyReason[gate.reason]) : '';
    return `<h2>${esc(tt(TX.setTitle.sheets))}</h2>
      <p class="d-verbs"><button type="button" class="primary" data-verb="publish-sheets"${gate.verbs[M.SHEETS.verb].disabled ? ' disabled' : ''}>${esc(tt(TX.publish))}</button></p>
      ${why ? `<p class="f-muted" data-reason="${gate.reason}">${esc(why)}</p>` : ''}
      ${opAreaHtml('sheets')}`;
  }
  const sel = selection(panel),
    gate = gateOf(panel, M.SETS[panel].free ? undefined : sel.ids.length),
    why = gate.reason ? tt(TX.greyReason[gate.reason]) : '';
  return `<h2>${esc(tt(TX.setTitle[panel]))}</h2>
    <h3>${esc(tt(TX.setItems[panel]))}</h3>
    ${panel === 'proc' ? zoneMapHtml('proc') : ''}
    ${choiceHtml(panel, frozen())}
    ${verbsHtml(gate, panel)}
    ${why ? `<p class="f-muted" data-reason="${gate.reason}">${esc(why)}</p>` : ''}
    ${panel === 'aircraft' ? `<p class="f-muted" data-hint>${esc(tt(TX.aircraftHint))}</p>` : ''}
    ${panel === 'proc' ? `<p class="f-muted" data-ead-note>${esc(tt(TX.eadNote))}</p>` : ''}
    ${opAreaHtml(panel)}`;
}
/** Le panneau d'un jeu autre que la base (ou celui des fiches publiées). */
function setPanelHtml(panel) {
  return `<section class="f-card" data-set-panel="${panel}">${setInner(panel)}</section>`;
}
/** Les panneaux d'un groupe : base (Télécharger · Construire · Purger de la base, « Publier » partagé, puis les points VFR), procédures, appareils (puis
 *  les fiches publiées) ; aucun pour la météo, publiée avec le site. */
function panelsHtml(group) {
  if (group === 'base') return buildHtml() + publishHtml() + setPanelHtml('vfr');
  if (group === 'proc') return setPanelHtml('proc');
  if (group === 'aircraft') return setPanelHtml('aircraft') + setPanelHtml('sheets');
  return '';
}
/** Redessine un panneau seul ; ce qui avait le focus (case, champ, bouton) le garde, avec sa sélection de texte. */
function redrawPanel(box) {
  const a = box.contains(document.activeElement) ? document.activeElement : null,
    q = (attr, v) => `[${attr}="${CSS.escape(v)}"]`,
    sel = a ? a.dataset.mapZone ? q('data-map-zone', a.dataset.mapZone) : a.dataset.buildZone ? q('data-build-zone', a.dataset.buildZone) :
    a.dataset.personal ? q('data-personal', a.dataset
      .personal) : a.dataset
    .item ? q('data-item', a.dataset.item) : a.dataset.f ? q('data-f', a.dataset.f) : a.dataset.verb ? q('data-verb', a.dataset.verb) : '' :
    '',
    from = a?.selectionStart ?? null,
    to = a?.selectionEnd ?? null;
  keepScroll(S.body, () => {
    box.innerHTML = box.matches('[data-build]') ? buildInner() : box.matches('[data-update-all]') ? updateAllInner() : setInner(box
      .dataset.setPanel);
    const el = sel && box.querySelector(sel);
    if (el && !el.disabled) {
      el.focus({
        preventScroll: true
      });
      if (from !== null && el.setSelectionRange) el.setSelectionRange(from, to);
    }
  });
}
/** Redessine les panneaux (une marche s'y met à jour chaque seconde) ; la case ou le bouton qui avait le focus le garde. */
function renderBuild() {
  renderPublish(); // le bouton « Publier » suit la construction (et l'inverse) : un seul point de redessin pour tous les panneaux
  if (!S?.body || !S.d) return;
  for (const box of S.body.querySelectorAll('[data-build], [data-set-panel], [data-update-all]')) redrawPanel(box);
}
/** Ouvre le groupe d'un panneau (une marche ou un résultat s'y montre) sans attendre un toucher. */
function openGroup(set, verb) {
  const id = M.groupOf(set, verb);
  S.manual[id] = true;
  const g = S.body?.querySelector(`details.f-group[data-group="${id}"]`);
  if (g) g.open = true;
}
/** Le texte d'un mot du journal (verbe, résultat, jeu) dans la langue : celui de la table `map`, à défaut le mot tel que le journal le porte. */
const wordOf = (map, key) => tt(map[key] || [key, key, key, key]);
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
    other: !!S.other || !!S.asking || !!S.chain && S.chain.phase !==
      'publishing', // la question d'une purge est posée, ou la chaîne tourne (sauf à sa publication finale)
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
  if (!S.chain) S.ctx.notify(lines.map(l => l.text).join(' · '), level); // dans la chaîne : la notification de la fin de la chaîne
  journalWrite(M.publishEntry(Date.now(), out));
  await load();
}
/** « Publier » : l'état de data/ est relu, une seule question (les fichiers et les commits), puis le passage du cadre avec le geste
 *  (ctx.data.sync({ gesture: true })) — jamais sans la question, jamais pendant une construction. Rien ne part si le bouton est gris. */
async function startPublish(skipAsk = false) {
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
  const yes = c.nothing ? false : skipAsk ? true : await S.ctx.ask(c.changes && c.ahead ? tt(TX.pubAsk, {
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
/** Une seconde de plus : met à jour le seul temps écoulé de la marche (dans le panneau de son jeu). */
function tick() {
  const run = S?.run,
    el = S?.body?.querySelector('[data-running] [data-elapsed]');
  if (run && el) el.textContent = tt(TX.elapsed, {
    t: M.clock((Date.now() - run.t0) / 1e3)
  });
}
/** Arrête le minuteur du temps écoulé. */
function stopTimer() {
  clearInterval(S?.timer);
  if (S) S.timer = 0;
}
/** Commence une marche (la nôtre ou un travail trouvé en route) : jeu, verbe, éléments, minuteur, groupe ouvert. `dry` : le plan d'une purge ou
 *  d'une publication de fiches ; `args` : les arguments du travail réel (sans dry), que la question d'un plan renvoie une fois confirmée. */
function beginRun(ids, ctrl, set = 'base', verb = 'build', dry = false, args = null) {
  S.run = {
    phase: 'running',
    t0: Date.now(),
    ctrl,
    set,
    verb,
    dry,
    args
  };
  S.ids = ids;
  S.view = null;
  S.result = null;
  stopTimer();
  S.timer = setInterval(tick, 1000);
  openGroup(set, verb);
}
/** Les éléments d'une vue de travail d'un jeu (les zones, les États, les types, le cycle), dans l'ordre de la vue. */
const viewIds = (set, v) => Object.keys(M.normView(set, v)?.zones || {});
/** Une vue du travail arrive : elle remplace la précédente et le panneau se redessine. Un travail connu (n'importe quel jeu et verbe : construction,
 *  téléchargement, purge, fiches) trouvé en route (resume) est adopté à sa première vue, avec son jeu et son verbe ; le travail d'une autre
 *  opération n'est que signalé. */
function onView(me, v, ctrl) {
  if (S !== me || !v) return;
  const op = M.viewOp(v);
  if (!op) {
    S.other = v;
    return renderBuild();
  }
  if (!S.run) beginRun(viewIds(op.set, v), ctrl, op.set, op.verb, M.opDry(v));
  S.view = v;
  if (S.ids.length === 0) S.ids = viewIds(S.run.set, v);
  renderBuild();
}
/** Écrit l'opération au journal (cache/data/journal.json, les 50 dernières) et redessine le journal. */
function journalWrite(entry, replace = false) {
  const list = replace ? M.journalSet(S.journal, entry) : M.journalAdd(S.journal, entry);
  if (list === S.journal) return;
  S.journal = list;
  S.ctx.data.put(JOURNAL, {
    ops: list,
    updated_at: new Date().toISOString()
  }).catch(() => {});
  renderJournal();
}
/** Fin d'un travail, quel que soit son jeu et son verbe : l'état de la marche est rendu, puis la fin propre au verbe (construction,
 *  téléchargement, plan de purge, purge, plan et publication de fiches). `live` : la fin s'est produite sous nos yeux (sinon c'est celle d'un
 *  travail déjà fini). */
async function endRun(me, final, live) {
  const run = S.run,
    op = M.viewOp(final),
    set = run?.set || op?.set || 'base',
    verb = run?.verb || op?.verb || 'build',
    dry = (verb === 'purge' || verb === 'publish' || verb === 'pickup') && (run ? run.dry : M.opDry(final)),
    seconds = run ? (Date.now() - run.t0) / 1e3 : null;
  if (!S.ids.length) S.ids = viewIds(set, final);
  stopTimer();
  S.run = null;
  S.other = null;
  S.view = final;
  if (dry && !live) return renderBuild(); // le plan terminé avant l'ouverture : il n'est plus à poser
  if (verb === 'publish') return dry ? endSheetsPlan(me, final, run) : endSheets(final, live, seconds);
  if (verb === 'pickup') return dry ? endPickupPlan(me, final, run) : endPickup(final, live, seconds);
  if (verb === 'fetch') return endFetch(final, live, seconds, set);
  if (verb === 'purge') return dry ? endPlan(me, final, live, run) : endPurge(final, live, seconds, set);
  return endBuild(final, live, seconds, set);
}
/** Fin d'une construction : le résumé dans le panneau, une notification (si on l'a suivie jusqu'au bout), le journal, puis la
 *  relecture de ce qui est publié. */
async function endBuild(final, live, seconds, set = 'base') {
  const out = M.setOutcome(set, 'build', final).out;
  S.result = {
    set,
    verb: 'build',
    out
  };
  renderBuild();
  const sm = summary(out, set),
    quiet = !!S
    .chain; // dans la chaîne : ni notification, ni entrée, ni relecture à chaque opération (la chaîne le fait une fois à sa fin)
  S.lastOp = {
    set,
    verb: 'build',
    out,
    text: sm.text
  };
  if (live && !quiet) S.ctx.notify([sm.text, ...(sm.notes || [])].join(' · '), sm.level);
  if (!quiet) journalWrite(M.setEntry(set, 'build', {
    at: Date.now(),
    ids: S.ids,
    seconds,
    out,
    job: final.job || final.id
  }));
  if (live && !quiet) await load(); // les états des lignes ont changé : même chemin de lecture que l'ouverture
}
/** Fin d'un téléchargement : le résumé, les sources manuelles et les lignes dans le panneau, une notification (le résumé, et les fichiers
 *  hors synchronisation s'il y en a), le journal (verbe « download »), puis la relecture de ce qui est publié. */
async function endFetch(final, live, seconds, set = 'base') {
  const out = M.setOutcome(set, 'fetch', final).out,
    sm = fetchSummary(out, set);
  S.result = {
    set,
    verb: 'fetch',
    out
  };
  renderBuild();
  const quiet = !!S.chain; // voir endBuild
  S.lastOp = {
    set,
    verb: 'fetch',
    out,
    text: sm.text
  };
  if (live && !quiet) S.ctx.notify([sm.text, sm.outside].filter(Boolean).join(' · '), sm.level);
  if (!quiet) journalWrite(M.setEntry(set, 'fetch', {
    at: Date.now(),
    ids: S.ids,
    seconds,
    out,
    job: final.job || final.id
  }));
  if (live && !quiet) await load();
}
/** Fin d'une purge réelle : le résumé et les phrases des avertissements dans le panneau, une notification, le journal, puis la relecture. */
async function endPurge(final, live, seconds, set = 'base') {
  const out = M.setOutcome(set, 'purge', final).out,
    sm = purgeSummary(out);
  S.result = {
    set,
    verb: 'purge',
    out
  };
  renderBuild();
  if (live) S.ctx.notify([sm.text, ...sm.notes].join(' · '), sm.level);
  journalWrite(M.setEntry(set, 'purge', {
    at: Date.now(),
    ids: S.ids,
    seconds,
    out,
    job: final.job || final.id
  }));
  if (live) await load();
}
/** Fin du plan d'une purge (le travail à blanc, jamais journalisé) : rien à retirer, on le dit sans question ; sinon UNE question (les
 *  fichiers, la taille, les éléments, les phrases des avertissements) et, si oui, la purge réelle sur les mêmes éléments. Un plan arrêté,
 *  échoué ou interrompu ne pose aucune question. `run` : la marche du plan (son jeu et les arguments du travail réel). */
async function endPlan(me, final, live, run) {
  const set = run?.set || 'base',
    out = M.setOutcome(set, 'purge', final).out;
  if (out.kind === 'cancelled') { // « Arrêter » pendant le plan : rien à dire, rien n'a été retiré
    S.result = null;
    return renderBuild();
  }
  if (out.kind !== 'done' || out.nothing) {
    S.result = out.kind === 'done' ? {
      set,
      verb: 'purge',
      out,
      nothing: true
    } : {
      set,
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
  const yes = await S.ctx.ask(purgeAsk(out, set), {
    ok: tt(TX.purge)
  });
  if (S !== me) return;
  S.asking = false;
  if (!yes) { // non : rien n'est retiré, rien n'est dit
    renderBuild();
    return;
  }
  const real = run?.args || M.setArgs(set, 'purge', {
    ids: S.ids
  });
  await settle(me, await launch(set, 'purge', set === 'base' ? real : {
    ...real,
    dry: false
  }, S.ids), true);
}
/** Fin du plan d'une publication de fiches (aircraft/publish à blanc, jamais journalisé) : rien à copier ni à retirer, on le dit sans question ;
 *  sinon UNE question (les fiches à copier et à retirer) et, si oui, la publication réelle, sans dry. Un plan arrêté, échoué ou interrompu ne
 *  pose aucune question. */
async function endSheetsPlan(me, final, run) {
  const out = M.sheetsOutcome(final),
    plan = M.sheetsPlan(final);
  if (out.kind === 'cancelled') { // « Arrêter » pendant le plan : rien n'a été copié
    S.result = null;
    return renderBuild();
  }
  if (out.kind !== 'done' || !(plan.copied || plan.removed)) {
    S.result = {
      set: M.SHEETS.set,
      verb: M.SHEETS.verb,
      out: out.kind === 'done' ? {
        ...out,
        copied: 0,
        removed: 0
      } : out,
      nothing: out.kind === 'done'
    };
    renderBuild();
    const sm = sheetsSummary(S.result.out, S.result.nothing);
    S.ctx.notify(sm.text, sm.level);
    return;
  }
  S.result = null;
  S.asking = true; // les boutons restent gris pendant la question : une opération à la fois
  renderBuild();
  const yes = await S.ctx.ask(tt(TX.sheetsAsk, {
    c: count('sheet', plan.copied),
    r: count('sheet', plan.removed),
    s: M.fmtBytes(plan.bytes, lang())
  }), {
    ok: tt(TX.publish)
  });
  if (S !== me) return;
  S.asking = false;
  if (!yes) { // non : rien n'est copié, rien n'est dit
    renderBuild();
    return;
  }
  await settle(me, await launch(M.SHEETS.set, M.SHEETS.verb, {
    dry: false
  }, []), true);
}
/** Fin d'une publication de fiches réelle : le résumé dans le panneau, une notification, le journal, puis la relecture. */
async function endSheets(final, live, seconds) {
  const out = M.sheetsOutcome(final),
    sm = sheetsSummary(out);
  S.result = {
    set: M.SHEETS.set,
    verb: M.SHEETS.verb,
    out
  };
  renderBuild();
  if (live) S.ctx.notify(sm.text, sm.level);
  journalWrite(M.sheetsEntry({
    at: Date.now(),
    seconds,
    out,
    job: final.job || final.id
  }));
  if (live) await load();
}
/** Un départ refusé (409 : une autre opération ; 429 : trop tôt ; 404 : lanceur ancien…) : la phrase, une notification. Après un
 *  409 on suit l'opération qui tourne, pour que le bouton redevienne actif à sa fin. */
function refused(me, r) {
  const f = M.refusal(r),
    set = S.run?.set || 'base',
    verb = S.run?.verb || 'build';
  stopTimer();
  S.run = null;
  S.result = {
    set,
    verb,
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
      ...S.view,
      state: 'cancelled',
      job: r.job
    }, live);
  }
  if (r.state && r.state !== 'running') {
    if (M.viewOp(r) || S.run) return endRun(me, r, live);
    S.other = null; // la fin d'une autre opération : le bouton redevient actif
    return renderBuild();
  }
  if (r.aborted) return;
  return refused(me, r);
}
/** Suit le travail connu (n'importe quel jeu et verbe) que le lanceur fait tourner (page rechargée, ou départ refusé pour cause d'opération
 *  en cours) ; si le dernier s'est terminé, en dit la fin. Ne bloque pas le montage. */
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
/** Lance un travail d'un jeu sur le lanceur (regen/job) et le suit par ses vues : la marche commence aussitôt ; rend la fin que
 *  ctx.launcher.job donne (à passer à settle). `args` : le corps du travail (avec dry pour un plan) ; `plain` : les arguments du travail réel
 *  (sans dry) que la fin d'un plan réutilise. */
async function launch(set, verb, args, ids, dry = false, plain = null) {
  const me = S,
    ctrl = new AbortController();
  beginRun(ids, ctrl, set, verb, dry, plain);
  renderBuild();
  return S.ctx.launcher.job(ROUTE, {
    set,
    verb,
    args
  }, {
    onProgress: v => onView(me, v, ctrl),
    signal: ctrl.signal
  });
}
/** Un geste sur un panneau : « Télécharger » (fetch), « Construire » (build) ou « Purger » (purge, d'abord le plan à blanc dont la fin pose la
 *  question) d'un jeu, ou « Publier » les fiches (aircraft/publish, plan à blanc puis la copie). Rien ne part si le bouton est gris ; des types
 *  OACI refusés sont dits dans le panneau, sans appel au lanceur. */
async function startOp(set, verb) {
  const me = S,
    sheets = set === M.SHEETS.set && verb === M.SHEETS.verb,
    sel = sheets ? {
      ids: []
    } : selection(set);
  if (sheets) {
    if (gateOf(set, undefined, [verb]).verbs[verb].disabled) return;
  } else {
    const gate = gateOf(set, M.SETS[set].free ? undefined : sel.ids.length);
    if (gate.verbs[verb].disabled) return;
  }
  if (sel.bad?.length && verb !==
    'purge') { // un type OACI refusé (la purge ne prend pas de types) : on le dit, on n'appelle pas le lanceur
    S.codesBad = sel.bad;
    renderBuild();
    S.ctx.notify(tt(TX.codesBad, {
      c: sel.bad.join(', ')
    }), 'err');
    return;
  }
  if (set === 'vfr' && !sel.cycle) return; // le cycle en vigueur est inconnu : rien à demander
  const args = sheets ? {} : M.setArgs(set, verb, sel),
    dry = verb === 'purge' || sheets,
    // les appareils : les lignes d'une construction ou d'un téléchargement sont les trois étapes ; la purge ne compte rien par élément
    ids = set === 'aircraft' ? verb === 'purge' || sheets ? [] : M.SETS.aircraft.steps : sel.ids;
  await settle(me, await launch(set, verb, dry ? {
    ...args,
    dry: true
  } : args, ids, dry, args), true);
}

// ---------------------------------------------------------------- la carte des zones à cocher
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
const mapWidth = () => Math.max(0, (S.body?.clientWidth || 0) - 40);
/** Le contour d'un élément de la carte : ceux des zones d'aerodb qu'il dessine (la zone elle-même pour la base, la France pour « LF », les États-Unis pour « K »), réunis ;
 *  null sans contour connu. */
function outlineOf(kind, id) {
  const zs = (kind === 'base' ? [id] : M.PROC_ZONES[id] || []).map(z => S.outlines[z]).filter(Boolean);
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
function zoneMapHtml(kind) {
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
function toggleMapZone(el) {
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
/** Espace ou Entrée sur une zone de la carte la coche ou la décoche, comme un toucher. */
function onKey(e) {
  const mz = e.target.closest?.('[data-map-zone]');
  if (!mz || (e.key !== ' ' && e.key !== 'Enter')) return;
  e.preventDefault();
  toggleMapZone(mz);
}

// ---------------------------------------------------------------- prendre le fichier téléchargé (base/pickup)
/** Le motif d'un échec de prise : sa phrase pour les codes connus (rien d'utile dans le zip, zip illisible, chemin refusé), « zip de plus de 500 Mo » pour le
 *  message de taille du lanceur, sinon le texte tel que le lanceur le donne. */
function pickupWhy(error) {
  const big = /^zip over (\d+) MB$/.exec(String(error ?? ''));
  return big ? tt(TX.pickupTooLarge, {
    n: big[1]
  }) : TX.pickupError[error] ? tt(TX.pickupError[error]) : String(error ?? '');
}
/** Les phrases de ce que la prise n'a pas pu faire : un fichier au nom attendu introuvable dans Téléchargements (le motif est dit), un échec avec son motif. */
function pickupProblems(out) {
  const who = x => ({
    z: itemName('base', x.zone),
    s: sourceName(x.source)
  });
  return [...(out.blocked || []).map(t => tt(TX
    .pickupRename, { // un zip dont le nom sort de la règle du lanceur n'est pas pris : à renommer
      ...who(t),
      zip: t.zip
    })), ...out.missing.map(m => tt(TX.pickupMissing, {
    ...who(m),
    e: m.expected
  })), ...out.failed.map(f => M.REPLAN_ERRORS.includes(f.error) ? tt(TX[f.error === 'changed' ? 'pickupChanged' :
    'pickupNotShown'
  ], { // le zip pris ne serait pas celui que le plan a montré (changé, ou absent du plan) : rien n'a été pris pour cette source
    ...who(f),
    zip: f.zip || '?'
  }) : tt(TX.pickupFailedLine, {
    ...who(f),
    r: pickupWhy(f.error)
  }))];
}
/** La question du plan : pour chaque zone le zip trouvé (nom, nombre de fichiers, taille), ce qui manque ou a échoué, où vont les fichiers (sources brutes du poste,
 *  jamais commitées). */
function pickupAsk(out) {
  const problems = pickupProblems(out),
    dest = [...new Set(out.taken.map(t => M.PICKUP_DEST[t.source]).filter(Boolean))].join(', ');
  return tt(TX.pickupAsk, {
    taken: out.taken.map(t => tt(TX.pickupTaken, {
      z: itemName('base', t.zone),
      s: sourceName(t.source),
      zip: t.zip,
      n: count('file', t.files.length),
      b: M.fmtBytes(t.bytes, lang())
    })).join(' ; '),
    missing: problems.length ? ` ${problems.join(' ; ')}.` : '',
    to: dest
  });
}
/** Le résumé de la fin d'une prise : { text, hint (« Lancez maintenant Construire » quand des fichiers ont été pris), level }. */
function pickupSummary(out) {
  const text = tt(TX.pickupSum[out.kind], {
    n: count('file', out.files),
    s: M.fmtBytes(out.bytes, lang()),
    f: plural('fetchFails', out.failed.length)
  });
  return {
    text,
    hint: out.files > 0 ? tt(TX.pickupHint) : '',
    level: out.level
  };
}
/** La fin d'une prise (ou « Rien à prendre » quand le plan ne trouve rien) : le résumé, le conseil, puis ce qui manque ou a échoué. */
function pickupResultHtml(r) {
  const sm = pickupSummary(r.out);
  return `<div data-build-result data-op="pickup" data-result="${r.out.kind}"><p class="${sm.level === 'ok' ? '' : 'f-warn'}"><b>${esc(sm.text)}</b></p>
    ${sm.hint ? `<p class="f-muted" data-pickup-hint>${esc(sm.hint)}</p>` : ''}
    ${pickupProblems(r.out).map(t => `<p class="f-muted" data-line>${esc(t)}</p>`).join('')}
    ${replanHtml(r.out)}</div>`;
}
/** Le bouton « Relancer le plan » quand une source a été refusée parce que son zip a changé depuis le plan : il relance le plan à blanc sur les zones concernées. */
function replanHtml(out) {
  const zones = [...new Set(out.failed.filter(f => M.REPLAN_ERRORS.includes(f.error)).map(f => f.zone))];
  if (!zones.length) return '';
  const off = gateOf('base', zones.length, [M.PICKUP.verb]).verbs[M.PICKUP.verb].disabled ? ' disabled' : '';
  return `<p><button type="button" data-verb="pickup-replan" data-zones="${esc(zones.join(','))}"${off}>${esc(tt(TX.pickupReplan))}</button></p>`;
}
/** « Prendre le fichier téléchargé » : le plan d'abord (base/pickup à blanc, dry envoyé explicitement), dont la fin pose la question puis la prise réelle. `zonesAttr` :
 *  les zones des sources du résultat d'un téléchargement (séparées par des virgules), sinon les zones cochées. Rien ne part si le bouton est gris. */
async function startPickup(zonesAttr) {
  const me = S,
    known = new Set(S.d?.cov?.ids || []),
    zones = zonesAttr ? zonesAttr.split(',').filter(z => known.has(z)) : buildZones().ticked;
  if (!zones.length || gateOf('base', zones.length, [M.PICKUP.verb]).verbs[M.PICKUP.verb].disabled) return;
  await settle(me, await launch('base', M.PICKUP.verb, {
    zones,
    dry: true
  }, zones, true, {
    zones
  }), true);
}
/** Fin du plan d'une prise (jamais journalisé) : rien à prendre, on le dit sans question ; sinon UNE question (les zips trouvés, ce qui manque, où vont les fichiers) et,
 *  si oui, la prise réelle (dry false) sur les mêmes zones. Un plan arrêté ne pose aucune question. */
async function endPickupPlan(me, final, run) {
  const out = M.setOutcome('base', M.PICKUP.verb, final).out;
  if (out.kind === 'cancelled') { // « Arrêter » pendant le plan : rien n'a été pris
    S.result = null;
    return renderBuild();
  }
  if (!out.taken.length) {
    S.result = {
      set: 'base',
      verb: M.PICKUP.verb,
      out
    };
    renderBuild();
    const sm = pickupSummary(out);
    S.ctx.notify(sm.text, sm.level);
    return;
  }
  const split = M.pickupSplit(out.taken),
    shown = {
      ...out,
      taken: split.ready,
      blocked: split.blocked
    }; // un zip hors de la règle des noms est dit mais jamais lancé : le lanceur prendrait « le plus récent » sans contrôle
  if (!split.ready.length) { // rien à lancer : pas de question, la ligne dit quoi renommer
    S.result = {
      set: 'base',
      verb: M.PICKUP.verb,
      out: {
        ...shown,
        kind: 'blocked'
      }
    };
    renderBuild();
    const sm = pickupSummary(S.result.out);
    S.ctx.notify(sm.text, sm.level);
    return;
  }
  S.result = null;
  S.pickupBlocked = split.blocked;
  S.pickupPlan = {
    zones: split.zones,
    zips: split.zips
  }; // le plan montré : la prise réelle n'envoie que ces zips (nom et taille), jamais un plan relu ; le lanceur refuse la source dont le zip a changé entre-temps
  S.asking = true; // les boutons restent gris pendant la question : une opération à la fois
  renderBuild();
  const yes = await S.ctx.ask(pickupAsk(shown), {
    ok: tt(TX.pickup)
  });
  if (S !== me) return;
  S.asking = false;
  const plan = S.pickupPlan;
  S.pickupPlan = null;
  if (!yes) { // non : rien n'est pris, rien n'est dit
    renderBuild();
    return;
  }
  await settle(me, await launch('base', M.PICKUP.verb, {
    zones: plan.zones,
    dry: false,
    zips: plan.zips
  }, plan.zones), true);
}
/** Fin d'une prise réelle : le résumé et le conseil dans le panneau, une notification, le journal. */
async function endPickup(final, live, seconds) {
  const out = {
      ...M.setOutcome('base', M.PICKUP.verb, final).out,
      blocked: S.pickupBlocked || []
    },
    sm = pickupSummary(out);
  S.pickupBlocked = null;
  S.result = {
    set: 'base',
    verb: M.PICKUP.verb,
    out
  };
  renderBuild();
  if (live) S.ctx.notify([sm.text, sm.hint].filter(Boolean).join(' · '), sm.level);
  journalWrite(M.setEntry('base', M.PICKUP.verb, {
    at: Date.now(),
    ids: S.ids,
    seconds,
    out,
    job: final.job || final.id
  }));
}

// ---------------------------------------------------------------- « Tout mettre à jour » (SPEC § 5.3)
/** Le nom d'un jeu dans les phrases de la chaîne : le groupe pour la base, le nom du jeu pour les autres. */
const chainName = set => tt(set === 'base' ? TX.groups.base : TX.setLabel[set]);
/** Le texte d'une raison pour laquelle un jeu est ignoré par la chaîne (clé de TX.greyReason ; les types OACI refusés : leur phrase). */
const skipWhy = (key, sel) => key === 'bad-codes' ? tt(TX.codesBad, {
  c: sel.bad.join(', ')
}) : tt(TX.greyReason[key]);
/** Ce que la chaîne ferait d'après les choix des panneaux : { runs: [{ set, sel, what }], skipped: [{ set, key, why }] } dans l'ordre publié. Un jeu sans
 *  éléments cochés, aux types OACI refusés ou dont l'un des deux verbes n'est pas connu du lanceur est ignoré, avec sa raison. */
function chainPlan() {
  const runs = [],
    skipped = [];
  if (!S.d) return {
    runs,
    skipped
  };
  for (const set of M.CHAIN_SETS) {
    const sel = selection(set),
      names = () => sel.ids.map(id => itemName(set, id)).join(', ');
    const key = !M.CHAIN_VERBS.every(v => M.verbKnown(S.known, set, v)) ? 'unknown-verb' : set === 'base' && !sel.ids.length ? 'no-zone' :
      set === 'proc' && !sel
      .ids.length ? 'no-state' : set === 'vfr' && !sel.cycle ? 'no-set' : sel.bad?.length ? 'bad-codes' : null;
    if (key) {
      skipped.push({
        set,
        key,
        why: skipWhy(key, sel)
      });
      continue;
    }
    runs.push({
      set,
      sel,
      what: set === 'vfr' ? itemName(set, sel.cycle) : set === 'aircraft' && !sel.ids.length ? tt(TX.chainFleet) : `${count(M.SETS[set].unit, sel.ids.length)} (${names()})`
    });
  }
  return {
    runs,
    skipped
  };
}
/** L'état du bouton « Tout mettre à jour » : { disabled, reason } ; reason : no-launcher | busy | offline | no-set (aucun jeu à lancer). */
function chainGate(plan) {
  const reason = !S.ctx.launcher ? 'no-launcher' : busyNow() ? 'busy' : navigator.onLine === false ? 'offline' : !plan.runs.length ?
    'no-set' : null;
  return {
    disabled: !!reason,
    reason
  };
}
/** Le point d'attention du cadre (le même que celui d'un groupe) : le cycle publié est dépassé ; `title` dit pour quel cycle reconstruire. */
function attnDot(oldCycle) {
  return oldCycle ? ` <i class="f-status-dot" data-attn title="${esc(tt(TX.staleCycle, { x: oldCycle, y: S.cycleId }))}"></i>` : '';
}
/** Les lignes des jeux de la chaîne (en cours ou finie) : [{ set, result, why? }], result : done | nothing | failed | cancelled | skipped | notrun | running |
 *  waiting. */
function chainRows() {
  const ch = S.chain || S.chainEnd;
  if (!ch) return [];
  return ch.rows.map(r => ({
    ...r
  }));
}
/** La liste des jeux de la chaîne, une ligne chacun avec où il en est. */
function chainListHtml() {
  return `<ul class="d-sl" data-chain-sets>${chainRows().map(r => `<li data-chain-set="${esc(r.set)}" data-result="${esc(r.result)}"><b>${esc(chainName(r.set))}</b> : ${esc(tt(TX.chainWord[r.result]))}${r.why ? ` (${esc(r.why)})` : ''}</li>`).join('')}</ul>`;
}
/** La chaîne en cours (jeu, étape, « n / m jeux », « Arrêter » pour toute la chaîne) ou sa fin (le résumé et les jeux). */
function chainHtml() {
  const ch = S.chain;
  if (ch && ch.phase !== 'asking') {
    const run = ch.runs[ch.i],
      stopping = ch.phase === 'stopping';
    return `<div data-chain data-phase="${ch.phase}"><div class="d-runhead"><b data-chain-count>${esc(tt(TX.chainCount, { n: Math.min(ch.i + 1, ch.runs.length), m: ch.runs.length }))}</b>
      <span data-chain-step>${esc(stopping ? tt(TX.stopping) : ch.phase === 'publishing' ? tt(TX.pubRunning) : `${chainName(run.set)} : ${tt(ch.verb === 'fetch' ? TX.download : TX.build)}`)}</span></div>
      ${chainListHtml()}
      <p><button type="button" data-verb="stop-chain"${stopping ? ' disabled' : ''}>${esc(tt(TX.stop))}</button></p></div>`;
  }
  const end = S.chainEnd;
  if (!end) return S.chainNote ? `<p class="f-warn" data-chain-note>${esc(tt(TX.chainReload))}</p>` : '';
  return `<div data-chain-result data-result="${end.result}"><p class="${end.result === 'done' ? '' : 'f-warn'}"><b>${esc(end.text)}</b></p>${chainListHtml()}</div>`;
}
/** L'intérieur de la carte « Tout mettre à jour » : le bouton avec le nombre de jeux (et le point d'attention d'un cycle dépassé), sa raison grise, la
 *  chaîne ou sa fin. */
function updateAllInner() {
  const plan = chainPlan(),
    gate = chainGate(plan),
    n = S.chain ? S.chain.runs.length : plan.runs.length,
    stale = ['base', 'proc'].filter(g => S.attn?.[g]).map(g => `<p class="f-warn" data-stale="${g}">${esc(tt(TX.staleCycle, { x: S.attn[g], y: S.cycleId }))}</p>`).join('');
  return `<h2>${esc(tt(TX.updateAll))}</h2>${stale}
    <p class="d-verbs"><button type="button" class="primary" data-verb="all"${gate.disabled ? ' disabled' : ''}>${esc(tt(TX.updateAllN, { n: count('set', n) }))}${attnDot(S.attn?.base || S.attn?.proc)}</button></p>
    ${gate.reason ? `<p class="f-muted" data-reason="${gate.reason}">${esc(tt(TX.greyReason[gate.reason]))}</p>` : ''}
    ${chainHtml()}`;
}
/** La carte « Tout mettre à jour », sous la couverture et au-dessus des groupes. */
function updateAllHtml() {
  return `<section class="f-card" data-update-all>${updateAllInner()}</section>`;
}
/** La question du plan de la chaîne : le cycle AIRAC, les jeux dans l'ordre avec ce qu'ils touchent, la taille inconnue des téléchargements, pas de purge, une seule
 *  publication ; puis les jeux ignorés avec leur raison. */
function chainAsk(plan) {
  return tt(TX.chainAsk, {
    c: S.cycleId,
    sets: plan.runs.map(r => `${chainName(r.set)} : ${r.what}`).join(' ; '),
    skipped: plan.skipped.length ? ` ${tt(TX.chainSkipped, { s: plan.skipped.map(s => `${chainName(s.set)} (${s.why})`).join(', ') })}` : ''
  });
}
/** Les lignes de départ de la chaîne : les jeux lancés « en attente », les ignorés « ignoré » avec leur raison, dans l'ordre publié. */
function chainStartRows(plan) {
  return M.CHAIN_SETS.map(set => {
    const sk = plan.skipped.find(s => s.set === set);
    return sk ? {
      set,
      result: 'skipped',
      why: sk.why
    } : {
      set,
      result: 'waiting'
    };
  });
}
/** Une opération de la chaîne : lance le verbe du jeu par le suiveur ordinaire (les fins se taisent : une seule notification, une seule entrée au journal) ;
 *  { verdict: 'ok' | 'nothing' | 'stop', kind, text } d'après sa fin, ou un refus de départ. */
async function chainOp(me, run, verb) {
  S.lastOp = null;
  const ids = run.set === 'aircraft' ? M.SETS.aircraft.steps : run.sel.ids;
  await settle(me, await launch(run.set, verb, M.setArgs(run.set, verb, run.sel), ids), true);
  if (S !== me) return null;
  const op = S.lastOp;
  if (op) return {
    verdict: M.chainVerdict(verb, op.out),
    kind: op.out.kind,
    text: op.text
  };
  const f = S.result?.refused;
  return {
    verdict: 'stop',
    kind: f ? 'refused' : 'failed',
    text: tt(TX.refused[f?.key || 'failed'], {
      n: f?.wait
    })
  };
}
/** Fin de la chaîne : le résumé dans la carte, une notification, l'entrée du journal (qui remplace le repère de départ), puis la relecture de ce qui est publié. */
async function endChain(me, ch, result, text, level) {
  S.chain = null;
  S.chainEnd = {
    result,
    text,
    rows: ch.rows
  };
  renderBuild();
  S.ctx.notify(text, level);
  journalWrite(M.chainEntry({
    at: Date.now(),
    items: ch.rows,
    seconds: (Date.now() - ch.t0) / 1e3,
    result,
    job: ch.job
  }), true);
  await load();
}
/** La chaîne : pour chaque jeu, Télécharger puis Construire par le suiveur ; au premier échec, arrêt (ce qui est construit reste commité sur le poste, rien n'est
 *  publié) ; si tout a réussi, UNE publication sans autre question que celle du plan. */
async function runChain(me, plan) {
  const ch = S.chain = {
    phase: 'running',
    runs: plan.runs,
    i: 0,
    verb: 'fetch',
    stopped: false,
    rows: chainStartRows(plan),
    t0: Date.now(),
    job: `chain-${Date.now()}`
  };
  S.chainEnd = null;
  S.chainNote = false;
  journalWrite(M.chainEntry({
    at: Date.now(),
    items: ch.rows,
    seconds: null,
    result: 'running',
    job: ch.job
  }), true);
  const row = set => ch.rows.find(r => r.set === set);
  let failure = null;
  for (let i = 0; i < ch.runs.length && !failure; i++) {
    const run = ch.runs[i];
    ch.i = i;
    row(run.set).result = 'running';
    for (const verb of M.CHAIN_VERBS) {
      ch.verb = verb;
      if (ch.stopped) {
        failure = {
          set: run.set,
          kind: 'cancelled',
          text: ''
        };
        break;
      }
      renderBuild();
      const res = await chainOp(me, run, verb);
      if (S !== me || !res) return;
      if (res.verdict === 'stop') {
        failure = {
          set: run.set,
          kind: ch.stopped || res.kind === 'cancelled' ? 'cancelled' : 'failed',
          text: res.text
        };
        break;
      }
    }
    row(run.set).result = failure ? failure.kind : 'done';
  }
  if (failure) {
    for (const r of ch.rows)
      if (r.result === 'waiting') r.result = 'notrun';
    const s = chainName(failure.set);
    return endChain(me, ch, failure.kind, failure.kind === 'cancelled' ? tt(TX.chainStopped, {
      s
    }) : tt(TX.chainFailed, {
      s,
      r: failure.text
    }), failure.kind === 'cancelled' ? 'warn' : 'err');
  }
  // tout a réussi : une seule publication, sans autre question que celle du plan
  ch.phase = 'publishing';
  renderBuild();
  S.pub.status = await readStatus();
  if (S !== me) return;
  const gate = publishGate();
  let p, level = 'ok',
    result = 'done';
  if (gate.disabled) {
    p = gate.reason === 'nothing' ? publishReason('nothing') : tt(TX.chainNotPublished, {
      r: publishReason(gate.reason)
    });
    level = gate.reason === 'nothing' ? 'ok' : 'warn';
  } else {
    await startPublish(true);
    if (S !== me) return;
    const out = S.pub.result?.out;
    p = out ? publishLines(out)[0].text : S.pub.result?.unread ? tt(TX.pubUnread) : publishReason('nothing');
    if (out && (out.kind === 'failed' || out.kind === 'no-exchange'))[result, level] = ['failed', 'err'];
    else if (out && out.kind !== 'done') level = 'warn';
  }
  return endChain(me, ch, result, tt(TX.chainDone, {
    n: count('set', ch.runs.length),
    p
  }), level);
}
/** « Tout mettre à jour » : le plan, UNE question ; sur Non rien n'est appelé ; sur Oui la chaîne (runChain). */
async function updateAll() {
  const me = S,
    plan = chainPlan();
  if (chainGate(plan).disabled) return;
  S.chain = {
    phase: 'asking',
    runs: plan.runs,
    rows: []
  }; // tous les boutons sont gris pendant la question
  renderBuild();
  const yes = await S.ctx.ask(chainAsk(plan), {
    ok: tt(TX.updateAll)
  });
  if (S !== me) return;
  if (!yes) {
    S.chain = null;
    renderBuild();
    return;
  }
  await runChain(me, plan);
}
/** « Arrêter » de la chaîne : l'opération en cours est arrêtée (la zone ou l'étape en cours se termine), puis la chaîne s'arrête ; ce qui est construit est gardé. */
function stopChain() {
  const ch = S.chain;
  if (!ch || ch.phase === 'asking') return;
  ch.stopped = true;
  if (ch.phase === 'running') ch.phase = 'stopping';
  S.run?.ctrl.abort();
  renderBuild();
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
    renderBuild(); // les États que le panneau des procédures propose suivent la table de couverture
  }, 150);
}
/** Le verbe du lanceur d'un bouton de l'écran, par son panneau : [jeu, verbe] ou null (« Arrêter », « Publier » la base : traités à part). Les
 *  boutons du panneau de la base n'ont pas de panneau nommé ; ceux des autres jeux sont sous `data-set-panel`. */
function opOf(v) {
  const panel = v.closest('[data-set-panel]')?.dataset.setPanel,
    verb = {
      download: 'fetch',
      build: 'build',
      purge: 'purge'
    } [v.dataset.verb];
  if (panel === 'sheets') return v.dataset.verb === 'publish-sheets' ? [M.SHEETS.set, M.SHEETS.verb] : null;
  if (panel) return verb ? [panel, verb] : null;
  return v.closest('[data-build]') && verb ? ['base', verb] : null;
}
/** Retient le groupe touché en dernier (le « ? » du cadre ouvre l'aide au paragraphe du groupe ouvert), puis le geste d'un bouton. */
function onClick(e) {
  const mz = e.target.closest?.('[data-map-zone]');
  if (mz) return toggleMapZone(mz);
  const g = e.target.closest?.('details.f-group > summary')?.parentElement;
  if (g) S.focus = g.dataset.group;
  const v = e.target.closest?.('button[data-verb]');
  if (!v || v.disabled) return;
  if (v.dataset.verb === 'stop') return S.run?.ctrl.abort();
  if (v.dataset.verb === 'all') return updateAll();
  if (v.dataset.verb === 'pickup' || v.dataset.verb === 'pickup-replan') return startPickup(v.dataset.zones);
  if (v.dataset.verb === 'stop-chain') return stopChain();
  const op = opOf(v);
  if (op) startOp(...op);
  else if (v.dataset.verb === 'publish') startPublish();
}
/** Une case des panneaux (zone, source sous licence personnelle, État des procédures) change : le choix est retenu, le panneau redessiné
 *  (les sources proposées suivent les zones cochées). */
function onChange(e) {
  const t = e.target;
  if (t instanceof HTMLSelectElement && t.matches('[data-add-zone]')) return t.value && addZone(t.value);
  if (!(t instanceof HTMLInputElement) || frozen()) return;
  const set = t.dataset.buildZone ? S.ticked : t.dataset.personal ? S.personal : t.dataset.item ? S.picked : null,
    id = t.dataset.buildZone || t.dataset.personal || t.dataset.item;
  if (!set) return;
  if (t.checked) set.add(id);
  else set.delete(id);
  renderBuild();
}
/** Le champ des types OACI est tapé : le texte est retenu (sans redessin : la frappe n'est pas dérangée) et l'avertissement des codes refusés
 *  disparaît ; le bouton reste actif, le refus se fait au geste. */
function onInput(e) {
  const t = e.target;
  if (!(t instanceof HTMLInputElement) || t.dataset.f !== 'codes') return;
  S.codes = t.value;
  if (S.codesBad.length) {
    S.codesBad = [];
    t.closest('.d-codes')?.querySelector('[data-codes-error]')?.remove();
  }
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
    chain: null, // « Tout mettre à jour » en cours : { phase: 'asking' | 'running' | 'stopping' | 'publishing', runs, i, verb, stopped, rows, t0, job }
    chainEnd: null, // la fin de la dernière chaîne : { result, text, rows }
    chainNote: false, // un repère de chaîne sans fin a été trouvé à l'ouverture
    lastOp: null, // la fin de la dernière opération suivie : { set, verb, out, text } (la chaîne la lit)
    groups: null, // les groupes de l'écran (buildGroups), calculés à chaque dessin
    attn: {}, // les groupes dont le cycle publié est dépassé : { base, proc } (le cycle « AANN » ou null)
    outlines: null, // les contours des zones (ctx.aerodb.zoneOutlines) : null (pas demandés), 'loading', l'objet, ou false (sans réponse : la liste seule)
    pickupBlocked: null, // les zips du plan montré que la prise réelle n'a pas lancés (nom hors de la règle) : dits à la fin
    pickupPlan: null, // le plan d'une prise montré dans la question : { zones, zips } (la prise réelle est construite de lui seul)
    mapW: 0, // la largeur pour laquelle la carte a été calculée
    rz: 0, // l'image d'animation en attente du recalcul à la taille de la fenêtre
    picked: new Set(), // États des procédures cochés (aucun par défaut)
    codes: '', // le champ des types OACI des appareils (vide : les types de la flotte)
    codesBad: [], // les types refusés au dernier geste (dits dans le panneau, aucun appel)
    known: M.knownVerbs(null), // les verbes du lanceur (regen/verbs), lus au montage
    run: null, // le travail suivi, de n'importe quel jeu : { phase: 'running' | 'stopping', t0, ctrl, set, verb ('build' | 'fetch' | 'purge' | 'publish'), dry, args }
    asking: false, // la question d'une purge ou d'une publication de fiches est posée : les boutons restent gris
    view: null, // la dernière vue du travail du lanceur
    ids: [], // les éléments du travail en cours ou du dernier (zones, États, cycle, types)
    result: null, // la fin du dernier : { set, verb, out } (plan vide : nothing) ou { set, verb, refused }
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
  S.body.addEventListener('input', onInput);
  S.body.addEventListener('keydown', onKey);
  S.onResize = () => { // la carte des zones se recalcule quand la largeur change (une seule écoute, retirée au démontage)
    cancelAnimationFrame(S.rz);
    S.rz = requestAnimationFrame(() => {
      if (S?.body && S.outlines && S.outlines !== 'loading' && mapWidth() !== S.mapW) renderBuild();
    });
  };
  window.addEventListener('resize', S.onResize);
  S.onNet = () => renderBuild(); // « hors ligne » : la raison du bouton suit le réseau
  window.addEventListener('online', S.onNet);
  window.addEventListener('offline', S.onNet);
  S.body.addEventListener('toggle', onToggle, true);
  // la couverture par État dépend de la table de couverture d'aerodb : redemandée quand il annonce { coverage: true }
  if (ctx.aerodb?.on) S.stops.push(ctx.aerodb.on('change', onAerodbChange));
  const me = S;
  const [journal, known] = await Promise.all([ctx.data.get(JOURNAL).catch(() => null), readVerbs()]);
  if (S !== me) return; // démonté pendant la lecture
  S.journal = M.journalList(journal);
  S.known = known;
  const open = M.openChain(S.journal); // un repère de chaîne sans fin : la page a été rechargée en route, la chaîne ne survit pas
  if (open) {
    journalWrite({
      ...open,
      result: 'interrupted'
    }, true);
    S.chainNote = true;
  }
  await load();
  if (open) S.ctx.notify(tt(TX.chainReload), 'warn');
  follow(); // un travail de la base en cours sur le lanceur (page rechargée) se suit ; le dernier terminé dit sa fin
}

/** Démonte : retire les écouteurs et l'abonnement à aerodb, arrête le minuteur ; une lecture encore en cours ne dessine plus rien.
 *  Le suivi du travail est arrêté par le cadre, sans l'annuler (il continue sur le lanceur). */
export function unmount() {
  if (!S) return;
  window.removeEventListener('frame-titled', S.srTitle);
  window.removeEventListener('online', S.onNet);
  window.removeEventListener('offline', S.onNet);
  window.removeEventListener('resize', S.onResize);
  cancelAnimationFrame(S.rz);
  clearTimeout(S.again);
  stopTimer(); // le suivi s'arrête de lui-même au démontage (le cadre) : le travail, lui, continue sur le lanceur
  for (const f of S.stops) f?.();
  S.body = null;
  S = null;
}
