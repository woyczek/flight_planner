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
  PERSONAL,
  PERSONAL_ROUTE,
  ROUTE_MEM,
  S,
  tt,
  VERBS_ROUTE
} from './state.js';
import {
  refreshStatus
} from './status.js';
import {
  showZone,
  wantZone
} from './update.js';
import {
  readWorld,
  worldRowHtml
} from './world.js';
import {
  covTableHtml
} from './covtable.js';
import {
  packsHtml,
  syncPackSwitches
} from './packs.js';
import {
  routeRowHtml,
  showRoute,
  wantRoute
} from './route.js';
import {
  itemName,
  panelsHtml,
  summary
} from './panels.js';
import {
  attachMaps
} from './zonemap.js';
import {
  readStatus,
  renderPublish
} from './publish.js';
import {
  chainName,
  updateAllHtml
} from './chain.js';
import {
  inventoryHtml
} from './inventory.js';

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
[data-module="data"] .d-choice{min-width:0}
[data-module="data"] .d-opts{display:grid;gap:0}
[data-module="data"] .d-packs{list-style:none;margin:0 0 8px;padding:0;display:grid;gap:6px}
[data-module="data"] .d-packs li{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;overflow-wrap:anywhere}
[data-module="data"] .d-packs button{min-height:var(--sog-touch)}
[data-module="data"] .d-packs[hidden],[data-module="data"] [data-pack-themes-box][hidden]{display:none}
[data-module="data"] details.d-pack{width:100%}
[data-module="data"] details.d-pack>.d-opts{margin:4px 0}
[data-module="data"] details.d-pack>.d-opts>.d-zrow:not(:first-child){padding-left:24px}
[data-module="data"] .d-choice [data-packs] details.d-pack-countries>.d-opts{max-height:min(40vh,260px);overflow-y:auto}
[data-module="data"] details.d-pack-countries>.d-opts>.d-zrow{padding-left:28px}
[data-module="data"] details.d-pack>summary.d-packline,[data-module="data"] details.d-pack>summary{min-height:var(--sog-touch);display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;cursor:pointer}
[data-module="data"] details.d-packs-fold>summary{min-height:var(--sog-touch);display:flex;align-items:center;cursor:pointer}
[data-module="data"] details.d-packs-fold>summary h3{margin:0}
[data-module="data"] [data-zones-title]{scroll-margin-top:72px}
[data-module="data"] .d-packname{flex:1 1 9em;min-width:0}
[data-module="data"] .d-switch{min-height:var(--sog-touch)}
[data-module="data"] .d-link{background:none;border:0;padding:0 4px;margin-left:auto;font-size:.875em;color:var(--sog-accent,currentColor);text-decoration:underline;cursor:pointer;min-height:var(--sog-touch)}
[data-module="data"] .d-link[disabled]{color:inherit;opacity:.5;cursor:default;text-decoration:none}
[data-module="data"] .d-choice>h4[data-zones-title]{margin:12px 0 4px;font-size:1rem}
[data-module="data"] .d-tabs{display:flex;gap:8px;margin:0 0 8px}
[data-module="data"] .d-tabs button{min-height:var(--sog-touch)}
[data-module="data"] .d-tabs button[aria-pressed="true"]{font-weight:600;outline:2px solid var(--sog-accent);outline-offset:-2px}
[data-module="data"] .d-zrow{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:8px;border-bottom:1px solid var(--sog-line,transparent)}
[data-module="data"] .d-st{display:inline-flex;align-items:center;justify-content:flex-end;gap:6px;min-height:var(--sog-touch);padding:0 4px;border:0;background:none;color:inherit;font:inherit;font-size:var(--sog-size-s);white-space:nowrap}
[data-module="data"] button.d-st{cursor:pointer;text-decoration:underline dotted}
[data-module="data"] .d-whyhint{display:inline-flex;align-items:center;gap:4px;color:var(--sog-muted);font-size:var(--sog-size-xs,var(--sog-size-s));text-decoration:none}
[data-module="data"] .d-chev{width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid currentColor;transition:transform .15s}
[data-module="data"] button.d-st[aria-expanded=true] .d-chev{transform:rotate(180deg)}
[data-module="data"] .d-zwhy{grid-column:1/-1;margin:0 0 4px 28px}
[data-module="data"] .d-zmsg{grid-column:1/-1;margin:0 0 4px 28px}
[data-module="data"] .d-zmsg p{margin:2px 0}
/* le bilan en une ligne et l'action sur la ligne d'une zone (SOG-0180) : chaque nombre est un bouton, « Prendre le fichier » et « Réessayer » sont sur la ligne de leur zone */
[data-module="data"] details.d-covtable{margin:12px 0}
[data-module="data"] details.d-covtable>summary{min-height:var(--sog-touch);display:flex;align-items:center;cursor:pointer;font-weight:600}
[data-module="data"] .d-covscroll{overflow-x:auto}
[data-module="data"] .d-covtab{width:100%;border-collapse:collapse;font-size:var(--sog-size-xs)}
[data-module="data"] .d-covtab th,[data-module="data"] .d-covtab td{padding:2px 2px;text-align:right;white-space:nowrap;border-bottom:1px solid var(--sog-line,transparent)}
[data-module="data"] .d-covtab th:first-child,[data-module="data"] .d-covtab thead th:first-child{text-align:left}
[data-module="data"] .d-covtab button{min-height:var(--sog-touch);padding:0 2px;border:0;background:none;color:inherit;font:inherit;cursor:pointer}
[data-module="data"] .d-covtab thead button{font-size:.9em}
[data-module="data"] .d-covtab thead [aria-sort="ascending"] button::after{content:" ▲"}
[data-module="data"] .d-covtab thead [aria-sort="descending"] button::after{content:" ▼"}
[data-module="data"] .d-covtab tbody th button{text-align:left;font-weight:600;text-decoration:underline dotted}
[data-module="data"] .d-covtab td[data-n="0"]{color:var(--sog-muted)}
[data-module="data"] .d-covdl{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;margin:4px 0 8px;text-align:left;white-space:normal}
[data-module="data"] .d-covdl dd{margin:0}
[data-module="data"] .d-covsrc{margin:0;padding-left:16px}
@media (max-width:480px){[data-module="data"] .d-covtab{font-size:.7rem}[data-module="data"] .d-covtab th,[data-module="data"] .d-covtab td{padding:2px 1px}[data-module="data"] .d-covtab button{padding:0 1px}}
@media (pointer:fine){[data-module="data"] .d-covtab button{min-height:32px}}
[data-module="data"] .d-zsteps{grid-column:1/-1;margin:0 0 6px 28px;padding-left:20px;font-size:var(--sog-size-s)}
[data-module="data"] .d-zsteps li{min-height:0;margin:2px 0}
[data-module="data"] .d-zup{grid-column:1/-1;margin:0 0 4px 28px;display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center}
[data-module="data"] .d-zup progress{width:min(100%,220px)}
[data-module="data"] .d-zup button{min-height:var(--sog-touch)}
[data-module="data"] .d-statehead{margin:4px 0 12px}
[data-module="data"] .d-statehead [data-state-sentence]{margin:0 0 4px;line-height:1.3}
[data-module="data"] .d-statehead [data-filter]{min-height:var(--sog-touch);padding:0 8px;margin:2px 0}
[data-module="data"] .d-statehead [data-filter][aria-expanded="true"]{font-weight:600;outline:2px solid var(--sog-accent);outline-offset:-2px}
[data-module="data"] .d-statezones{list-style:none;margin:4px 0 8px;padding:0}
[data-module="data"] .d-statehead p{margin:4px 0}
[data-module="data"] .d-zact{grid-column:1/-1;margin:0 0 4px 28px;display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center}
[data-module="data"] .d-zact button{min-height:var(--sog-touch)}
[data-module="data"] .d-zact .d-link{margin-left:0;padding:0 4px}
[data-module="data"] .d-zalt{margin-top:-6px}
@media (pointer:fine){[data-module="data"] .d-statehead [data-filter],[data-module="data"] .d-zact button{min-height:32px}}
[data-module="data"] .d-opt{display:flex;gap:8px;align-items:center;min-height:var(--sog-touch);overflow-wrap:anywhere}
/* au pointeur fin (souris) une ligne de liste est une ligne de texte, pas une cible de doigt : 32 px ; au doigt, 44 px (SOG-0168) */
@media (pointer:fine){[data-module="data"] .d-opt{min-height:32px}[data-module="data"] .d-zrow{min-height:32px}}
[data-module="data"] .d-opt input{flex:none;width:20px;height:20px;margin:0}
[data-module="data"] .d-pers p{margin:0 0 4px 28px}
[data-module="data"] [data-build] [data-verb],[data-module="data"] [data-set-panel] [data-verb]{min-height:var(--sog-touch);min-width:44px}
[data-module="data"] [data-build] [data-reason],[data-module="data"] [data-set-panel] [data-reason]{margin:6px 0 0}
[data-module="data"] [data-set-panel] h2,[data-module="data"] [data-set-panel] h3{margin:8px 0 4px}
[data-module="data"] .d-codes{display:grid;gap:4px;margin:4px 0}
[data-module="data"] .d-codes input{min-height:var(--sog-touch);max-width:100%;box-sizing:border-box;text-transform:uppercase}
[data-module="data"] .d-verbs{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 0}
[data-module="data"] details.d-moreverbs{flex:1 1 auto}
[data-module="data"] details.d-moreverbs>summary{cursor:pointer;min-height:44px;display:inline-flex;align-items:center;padding:0 12px}
[data-module="data"] details.d-moreverbs>.d-verbs{margin-top:4px}
[data-module="data"] .d-sl{list-style:none;margin:2px 0 4px;padding:0;display:grid;gap:2px}
[data-module="data"] .d-sl li{overflow-wrap:anywhere}
[data-module="data"] .d-zl>li>div{min-width:0}
[data-module="data"] .d-manual{margin:6px 0 0;padding-left:1.1em}
[data-module="data"] .d-manual li{overflow-wrap:anywhere}
[data-module="data"] .d-run{margin-top:10px;display:grid;gap:6px}
[data-module="data"] .d-runhead{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline}
[data-module="data"] .d-busy{margin-top:10px;display:grid;gap:6px;padding:8px 10px;border:1px solid var(--sog-border)}
[data-module="data"] .d-busy p{margin:0}
[data-module="data"] .d-busy[data-alive=stuck],[data-module="data"] .d-busy[data-alive=gone]{border-color:var(--sog-warn)}
[data-module="data"] .d-busy [data-busy-act]{min-height:var(--sog-touch);min-width:44px}
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
[data-module="data"] [data-move-box] button{min-height:var(--sog-touch);min-width:44px}
[data-module="data"] [data-move-box] .f-row{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
[data-module="data"] [data-move-box] [data-move-state]{margin-top:8px;display:grid;gap:4px;overflow-wrap:anywhere}
[data-module="data"] [data-update-all] h2{margin:8px 0 4px}
[data-module="data"] [data-update-all] [data-verb]{min-height:var(--sog-touch);min-width:44px}
[data-module="data"] [data-update-all] [data-reason]{margin:6px 0 0}
[data-module="data"] [data-update-all] [data-chain],[data-module="data"] [data-update-all] [data-chain-result]{margin-top:10px;display:grid;gap:6px}
[data-module="data"] .f-status-dot[data-attn]{display:inline-block;vertical-align:middle;margin-left:6px}
[data-module="data"] .d-map{margin:6px 0}
[data-module="data"] .d-map-host{position:relative;height:45vh;min-height:260px;border:1px solid var(--sog-line,var(--sog-muted));background:var(--sog-surface)}
[data-module="data"] .d-rect{position:absolute;box-sizing:border-box;border:2px dashed var(--sog-accent,currentColor);background:color-mix(in srgb,var(--sog-accent,#08c) 18%,transparent);pointer-events:none;z-index:6}
[data-module="data"] .d-rect-count{position:absolute;left:0;top:0;padding:2px 8px;background:var(--sog-surface);color:var(--sog-text,inherit);border:1px solid var(--sog-line,currentColor);font-weight:700;white-space:nowrap}
[data-module="data"] .d-map-row{margin:6px 0}
[data-module="data"] .d-map-row button{min-height:var(--sog-touch);min-width:44px}
[data-module="data"] .d-mapgrid{display:grid;gap:8px;min-width:0}
@media (min-width:1024px){[data-module="data"] .d-mapgrid{grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:16px;align-items:start}[data-module="data"] .d-choice .d-opts{max-height:50vh;overflow:auto}[data-module="data"] .d-choice [data-packs]{margin-bottom:8px}[data-module="data"] .d-choice [data-packs] .d-opts{max-height:none;overflow:visible}}
[data-module="data"] .d-sw{display:inline-block;width:12px;height:12px;vertical-align:middle;margin:0 4px 0 8px;background:currentColor;border:1px solid}
[data-module="data"] .d-sw[data-tone=ok]{background:var(--sog-ok);border-color:var(--sog-ok)}
[data-module="data"] .d-sw[data-tone=warn]{background:var(--sog-warn);border-color:var(--sog-warn)}
[data-module="data"] .d-sw[data-tone=err]{background:var(--sog-err);border-color:var(--sog-err)}
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
export async function load(fresh = false) {
  // après une construction ou une publication : la liste des zones publiées qu'aerodb garde en mémoire est périmée (les fichiers ont changé sous lui, le
  // lecteur ne le dit qu'à sa prochaine passe) : refresh() la fait relire à la question qui suit (SOG-0072 : « il faut ctrl-maj-F5 pour voir le pays vert »)
  if (fresh) S.ctx.aerodb?.refresh?.();
  const me = S,
    [cat, pub, zones, byState, stored, kept, routeMem, packsRaw] = await Promise.all([ask('sources'), ask('publication'), ask(
        'zones'), ask(
        'coverageByState'),
      S.ctx.data.get(COVERAGE).catch(() => null), S.personalRead ? null : S.ctx.data.get(PERSONAL).catch(() => null), S
      .route.read ? null : S.ctx.data.get(ROUTE_MEM).catch(() => null), ask('packs')
    ]);
  if (S !== me) return; // démonté, ou remplacé, pendant la lecture
  // les cycles RAD et points FRA importés sur ce poste (SOG-0125) : lus une fois par montage, puis la fin d'un import les tient à jour
  if (!S.route.read) {
    S.route.read = true;
    S.route.mem = routeMem !== null && typeof routeMem === 'object' && !Array.isArray(routeMem) ? routeMem : null;
  }
  // les sources sous licence personnelle cochées lors d'un passage d'avant (SOG-0079 : « garder cochées les cases cochées ») : lues une fois par montage, puis la case seule les change
  if (!S.personalRead) {
    S.personalRead = true;
    S.certified = M.keptPersonal(kept); // la coche unique (SOG-0162), migrée des anciennes cases par source
    await readLauncherTick(me);
    if (S !== me) return;
  }
  if (S.outlines === false) S.outlines = null; // un échec de lecture des contours : la lecture suivante réessaie
  const list = Array.isArray(zones) ? zones : null,
    cov = M.coverageIds(stored, list, pub);
  S.d = {
    cat,
    pub,
    zones: list,
    byState,
    cov,
    packs: M.packsOf(packsRaw) // les paquets de pays d'aerodb (packs()), [] sans lui : le bloc n'est alors pas dessiné (SOG-0065)
  };
  // les zones à construire : toutes celles de la couverture à la première lecture (choix de l'utilisateur gardés ensuite)
  S.ticked ||= new Set(cov.ids);
  if (fresh || !S
    .statusAsked
  ) { // l'état par zone du lanceur : à l'ouverture, puis après chaque opération réelle (le pays orange passe au vert sur sa réponse, SOG-0072)
    S.statusAsked = true;
    refreshStatus(S.d.cov.ids);
  }
  // l'état de data/ pour « Publier » (GET sync-status, relevé refait : plus d'une seconde sur un dépôt de 10 000 fichiers) ne retient plus le premier dessin (SOG-0164) : la ligne du panneau dit « lecture » (place réservée), puis la réponse
  // la remplace ; au rechargement d'après une opération, l'ancien état reste affiché jusqu'à la réponse
  if (S.ctx.launcher) {
    if (S.pub.status === null) S.pub.reading = true;
    readStatus().then(st => {
      if (S !== me) return;
      S.pub.status = st;
      S.pub.reading = false;
      renderPublish();
    });
  }
  wantZone(); // le lien « #data?zone=<id> » : la base s'ouvre, la zone est cochée
  wantRoute(); // le lien « ?source=eurocontrol_rad » : le groupe des procédures et la ligne Route s'ouvrent
  render();
  showRoute();
  showZone();
  if (!S.world.read) { // l'état du synoptique monde que le lanceur tient (sans réseau), lu une fois à l'ouverture (SOG-0138)
    S.world.read = true;
    readWorld();
  }
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
  syncPackSwitches(S
    .body); // « à moitié » ne s'écrit pas en HTML : posé après chaque dessin, aussi celui d'un pays coché dans un paquet (SOG-0186)
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
/** À l'ouverture, avec un lanceur sur ce poste : la coche reflète SON fichier (GET personal : { certified, at }), pas le cache de la page. Une seule fois, si le lanceur n'a pas de fichier
 *  (certified:false sans `at`) et que le cache de la page est déjà coché : POST { certified: true, migrated: true } (409 'exists' : on ne réessaie pas). Sans lanceur, d'un lanceur plus ancien
 *  (404) ou d'un appareil appairé (403) : la réponse n'a pas de `certified` booléen, la coche reste celle du cache (S.tickLauncher faux). */
async function readLauncherTick(me) {
  S.tickLauncher = false;
  const cached = S.certified === true,
    r = await S.ctx.launcher?.call?.(PERSONAL_ROUTE).catch(() => null);
  if (S !== me || !r || r.ok === false || typeof r.certified !== 'boolean') return;
  S.tickLauncher = true;
  S.certified = r.certified;
  if (!r.certified && !r.at && cached) {
    const m = await S.ctx.launcher.call(PERSONAL_ROUTE, {
      certified: true,
      migrated: true
    }).catch(() => null);
    if (S !== me) return;
    if (m && m.ok !== false && m.certified === true) S.certified = true;
    else return; // la migration a échoué : le cache de la page garde sa coche (rien n'est écrasé), la prochaine ouverture réessaie
  }
  if (S.certified !== cached) savePersonal(); // le cache de la page suit le fichier du lanceur
}
/** Mémorise la coche « je certifie utiliser les données pour mon usage personnel » (cache/data/personal.json, ce poste) : écrite à chaque changement, pour que la prochaine ouverture la retrouve cochée et que « Construire » envoie les
 *  sources à usage personnel sans qu'on y pense (SOG-0079, SOG-0162). `sources` est gardé (les sources que la coche débloquait) pour qu'un poste plus ancien relise la même chose. */
export function savePersonal() {
  S.ctx.data.put(PERSONAL, {
    certified: S.certified === true,
    sources: S.certified === true ? Object.keys(M.PERSONAL) : [],
    updated_at: new Date().toISOString()
  }).catch(() => {});
}
/** Ajoute une zone connue à la couverture de ce poste : écrite aussitôt (cache/data/coverage.json), cochée pour « Construire » ; une
 *  zone que personne ne publie est construite et publiée par ce poste (SPEC § 3.2). */
export function addZone(id) {
  addZones([id]);
}
/** Ajoute des zones connues à la couverture de ce poste d'un seul coup (celles qui n'y sont pas déjà, jamais un doublon) : cochées pour « Construire », écrites une fois ; rend le nombre de zones ajoutées. Sans effet pendant une marche. */
export function addZones(list) {
  if (frozen() || !S.d) return 0;
  const known = new Set((S.d.zones || []).map(z => z.id)),
    have = new Set(S.d.cov.ids),
    add = [...new Set(list)].filter(id => known.has(id) && !have.has(id));
  if (!add.length) return 0;
  S.d.cov = {
    ...S.d.cov,
    ids: [...S.d.cov.ids, ...add],
    stored: true
  };
  S.ticked ||= new Set();
  for (const id of add) S.ticked.add(id);
  S.ctx.data.put(COVERAGE, {
    zones: S.d.cov.ids,
    updated_at: new Date().toISOString()
  }).catch(() => {});
  render();
  return add.length;
}
/** Retire des zones de la couverture de CE poste : décochées de la sélection, retirées de la liste, la couverture écrite une fois. **Jamais purgées** : leurs fichiers, publiés ou construits, restent où ils sont (une purge est un verbe du lanceur, avec sa propre question) ; une zone qu'un autre poste publie reste publiée. Rend le nombre de zones retirées ; sans effet pendant une marche. */
export function removeZones(list) {
  if (frozen() || !S.d) return 0;
  const gone = new Set(list),
    had = S.d.cov.ids.filter(id => gone.has(id));
  if (!had.length) return 0;
  S.d.cov = {
    ...S.d.cov,
    ids: S.d.cov.ids.filter(id => !gone.has(id)),
    stored: true
  };
  for (const id of had) S.ticked?.delete(id);
  S.ctx.data.put(COVERAGE, {
    zones: S.d.cov.ids,
    updated_at: new Date().toISOString()
  }).catch(() => {});
  render();
  return had.length;
}
/** Le nom d'une source datée (SIA France, NATS, ENAIRE) : celui du catalogue dans la langue, à défaut son identifiant. */
const sourceLabel = id => (catSource(id)?.n?.[li()] || id).replace(/\s*\(.*\)\s*$/, '');
/** « Cycle 2610 · publié il y a 3 jours · 12 zones » : ce que la ligne d'un jeu dit de lui-même, sans taille en octets
 *  (publication() n'en donne pas : seulement des nombres de zones, de terrains, de fichiers, de types). */
function metaText(r) {
  const parts = [];
  if (r.state === 'partial' && r.parts) parts.push(tt(TX.partial.line, { // SOG-0191 : jamais « à jour » : n en 2611, m en 2610
    parts: [...r.parts.list.map(x => tt(TX.partial.part, {
      n: x.n,
      c: x.cycle
    })), ...(r.parts.unknown ? [tt(TX.partial.unknown, {
      n: r.parts.unknown
    })] : [])].join(', ')
  }));
  else if (r.cycle) parts.push(tt(TX.cycle, {
    c: r.cycle
  }) + (r.state === 'stale-cycle' && r.oldestSource ? tt(TX.staleBy, {
    s: sourceLabel(r.oldestSource)
  }) : '')); // dépassé : la source datée qui le dit, une fois (SOG-0026)
  else if (r.kind === 'aircraft' && r.at) parts.push(tt(TX.edition, {
    d: M.dateText(r.at, lang())
  }));
  else if (r.kind === 'base' && r.at && !r.dated) parts.push(tt(TX.datedOn, {
    d: M.dateText(r.at, lang())
  })); // aucune zone nourrie n'a de source datée : « datée du … », jamais « dépassée » (SOG-0026)
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
export function linkHtml(src) {
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
      ${g.rows.map(rowHtml).join('') || (g.more.length || g.id === 'proc' || g.id === 'weather' ? '' : `<p class="f-muted">${esc(tt(TX.groupEmpty))}</p>`)}${g.id === 'proc' ? routeRowHtml() : g.id === 'weather' ? worldRowHtml() : ''}
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
  S.body.innerHTML = `<input type="file" data-upload-input hidden tabindex="-1" aria-hidden="true">${headHtml()}${coverageHtml()}${updateAllHtml()}${groupsHtml()}${covTableHtml()}${inventoryHtml()}${journalHtml()}`;
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
