// V3 data — « Données » de l'appli Pilote, monté par le cadre (frame/SPEC.md § 3.2 ; modules/data/SPEC.md, INTEGRATION.md) : le point d'entrée du module (SPEC § 11). `meta`, le montage et
// le démontage, les gestionnaires d'événements (clic, changement, saisie, touche, aerodb) et l'opération qu'un clic désigne (opOf). Ne dessine rien et ne contient aucune règle : tout vient des
// autres fichiers du module (état, écran, panneaux, carte, suivi, publication, chaîne), le calcul pur de model.js et les textes de texts.js.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  keepScroll
} from '../../frame/lib/dom.js'; // un rendu ne bouge ni le défilement ni la frappe
import {
  ask,
  esc,
  frozen,
  JOURNAL,
  S,
  setState,
  tt
} from './state.js';
import {
  addZone,
  journalWrite,
  load,
  readVerbs,
  savePersonal,
  statesHtml,
  STYLE
} from './screen.js';
import {
  panelId,
  renderBuild
} from './panels.js';
import {
  toggleWhy
} from './status.js';
import {
  startWorld,
  worldInit
} from './world.js';
import {
  togglePack,
  togglePackZone,
  setPackTab
} from './packs.js';
import {
  highlightZones
} from './zonemap.js';
import {
  selectNone,
  selectStale,
  startUpdate
} from './update.js';
import {
  answerRoute,
  routeInit,
  startRoute
} from './route.js';
import {
  attachMaps,
  destroyMaps,
  recenterMap,
  resizeMaps
} from './zonemap.js';
import {
  follow,
  startOp,
  retryZone,
  startPickup,
  stopTimer
} from './follow.js';
import {
  setZoneFilter
} from './status.js';
import {
  startPublish
} from './publish.js';
import {
  stopChain,
  updateAll
} from './chain.js';
import {
  moveClick,
  openInventory
} from './inventory.js';
import {
  cancelUpload,
  chooseFile,
  startUpload
} from './upload.js';
import {
  closeCovTable,
  covClick,
  openCovTable
} from './covtable.js';

export const meta = {
  id: 'data',
  title: TX.title, // en-tête du téléphone (règle 16)
  apps: ['pilot'],
  level: 3,
  // la construction de la base est un travail du lanceur (regen/job) ; regen/verbs : les opérations que ce lanceur connaît ; aucune lecture de data/ par le lanceur
  launcher: {
    // regen/job couvre aussi son annulation regen/job/cancel (cadre, f70eba426) ; sync-status : l'état de data/ avant la
    // question de « Publier » (GET, jamais de POST /__setup/sync : la publication passe par ctx.data.sync)
    routes: ['regen/job', 'regen/verbs', 'sync-status', 'data/inventory', 'base/upload'],
    read: []
  },
  files: ['model.js', 'model_screen.js', 'model_sets.js', 'model_results.js', 'model_chain.js', 'model_map.js', 'model_publish.js',
    'model_kit.js', 'model_inventory.js', 'texts.js', 'state.js', 'screen.js', 'panels.js', 'zonemap.js', 'follow.js', 'publish.js',
    'chain.js', 'inventory.js', 'model_route.js', 'model_update.js', 'model_status.js', 'model_packs.js', 'route.js', 'update.js',
    'status.js', 'packs.js', 'model_world.js', 'world.js', 'model_coverage.js', 'covtable.js', 'upload.js', '../../frame/lib/plural.js',
    '../maps/lib/map_base.js?v=0', '../maps/render.js?v=0', '../../frame/lib/dom.js', '../../frame/lib/time.js'
  ],
  // la carte des zones : MapLibre et les contours, chargés à la demande par le socle de carte (comme la Météo) ; les tuiles, appelées par MapLibre lui-même
  lazy: ['../maps/lib/maplibre-gl.js?v=0', '../maps/lib/maplibre-gl.css?v=0', '../maps/lib/outlines.js?v=0'],
  net: ['tiles.openfreemap.org'],
  reads: ['cache/data/'],
  writes: [{
    prefix: 'cache/data/',
    policy: 'cache'
  }]
};
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
/** Le verbe du lanceur d'un bouton de l'écran, par son panneau (celui de la base compris) : [jeu, verbe] ou null (« Arrêter », « Publier » la base : traités à part). */
function opOf(v) {
  const box = v.closest('[data-build], [data-set-panel]'),
    panel = box && panelId(box),
    verb = {
      download: 'fetch',
      build: 'build',
      purge: 'purge'
    } [v.dataset.verb];
  if (panel === 'sheets') return v.dataset.verb === 'publish-sheets' ? [M.SHEETS.set, M.SHEETS.verb] : null;
  return panel && verb ? [panel, verb] : null;
}
/** Retient le groupe touché en dernier (le « ? » du cadre ouvre l'aide au paragraphe du groupe ouvert), puis le geste d'un bouton. */
function onClick(e) {
  const mv = e.target.closest?.('button[data-move]');
  if (mv) return mv.disabled ? undefined : moveClick(mv); // « Ranger les sources brutes » (carte Inventaire)
  const pt = e.target.closest?.('button[data-pack-tab]');
  if (pt) return setPackTab(pt.dataset.packTab); // les onglets Régions | Thèmes (SOG-0165)
  if (e.target.closest?.('[data-covtable]') && e.target.closest?.('[data-cov-sort], [data-cov-row], [data-cov-reload]')) return covClick(
    e); // le tableau de couverture (SOG-0174)
  const uc = e.target.closest?.(
    '[data-act="zone-upload"], [data-act="upload-cancel"]'); // « Choisir le fichier… » et « Annuler » de la ligne d'une zone (SOG-0199)
  if (uc) return uc.dataset.act === 'upload-cancel' ? cancelUpload() : chooseFile(uc.dataset.zone);
  const up = e.target.closest?.(
    '[data-act="update-pack"]'); // « Mettre à jour (n) » d'un paquet (SOG-0188) : ses seuls pays de la couverture
  if (up) {
    const p = (S.d?.packs || []).find(x => x.id === up.dataset.pack);
    return up.disabled || !p ? undefined : startUpdate(M.packState(p, S.d.zones, S.d.cov.ids).inCoverage);
  }
  const zf = e.target.closest?.('[data-act="zone-filter"]');
  if (zf) return setZoneFilter(zf.dataset.filter); // un nombre du bilan : ses zones seules (SOG-0180)
  const zw = e.target.closest?.('[data-act="zone-why"]');
  if (zw) return toggleWhy(zw.dataset.zone); // la pastille d'une zone : ses raisons (SOG-0071)
  const rc = e.target.closest?.('[data-act="map-recenter"]');
  if (rc) return recenterMap(rc.closest('[data-zone-map]')?.dataset.zoneMap);
  const g = e.target.closest?.('details.f-group > summary')?.parentElement;
  if (g) S.focus = g.dataset.group;
  const v = e.target.closest?.('button[data-verb]');
  if (!v || v.disabled) return;
  if (v.dataset.verb === 'stop') return S.run?.ctrl.abort();
  if (v.dataset.verb === 'all') return updateAll();
  if (v.dataset.verb === 'retry-zone') return retryZone(v.dataset.zone); // « Réessayer » sur la ligne d'une zone en échec (SOG-0180)
  if (v.dataset.verb === 'pickup' || v.dataset.verb === 'pickup-replan') return startPickup(v.dataset.zones);
  if (v.dataset.verb === 'stop-chain') return stopChain();
  if (v.dataset.verb === 'update') return startUpdate();

  if (v.dataset.verb === 'world-build') return startWorld();
  if (v.dataset.verb === 'select-stale') return selectStale();
  if (v.dataset.verb === 'select-none') return selectNone();
  if (v.dataset.verb === 'route-import') return startRoute();
  if (v.dataset.verb === 'route-yes' || v.dataset.verb === 'route-no') return answerRoute(v.dataset.verb === 'route-yes');
  const op = opOf(v);
  if (op) startOp(...op);
  else if (v.dataset.verb === 'publish') startPublish();
}
/** La rangée de paquet sous le pointeur (avec ses zones), ou null. */
const packRow = e => e.target.closest?.('[data-pack][data-zones]');
/** Le survol (souris) d'une rangée de paquet surligne ses zones sur la carte, le départ de la rangée l'éteint (SOG-0147). */
function onPackOver(e) {
  if (e.pointerType === 'touch') return;
  const r = packRow(e);
  if (r) highlightZones(r.dataset.zones.split(',').filter(Boolean));
}

function onPackOut(e) {
  if (e.pointerType === 'touch') return;
  const r = packRow(e);
  if (r && !r.contains(e.relatedTarget)) highlightZones([]);
}
/** L'appui (tactile) d'une rangée surligne ses zones et les garde jusqu'au prochain appui ailleurs. */
function onPackDown(e) {
  if (e.pointerType !== 'touch') return;
  const r = packRow(e);
  highlightZones(r ? r.dataset.zones.split(',').filter(Boolean) : []);
}
/** Une case des panneaux (zone, source sous licence personnelle, État des procédures) change : le choix est retenu, le panneau redessiné
 *  (les sources proposées suivent les zones cochées). */
function onChange(e) {
  const t = e.target;
  if (t instanceof HTMLSelectElement && t.matches('[data-add-zone]')) return t.value && addZone(t.value);
  if (t instanceof HTMLInputElement && t.dataset.packCov) return togglePackZone(t.dataset.packCov, t.checked, t.closest('[data-pack]')
    ?.dataset.pack); // un pays d'un thème : sa case (SOG-0165)
  if (t instanceof HTMLInputElement && t.dataset.packSwitch) return togglePack(t.dataset.packSwitch, t
    .checked); // l'interrupteur d'un paquet (SOG-0147)
  if (t instanceof HTMLInputElement && t.matches(
      '[data-upload-input]')) { // le fichier choisi (SOG-0199) : envoyé au lanceur, le champ est vidé pour pouvoir choisir le même
    const f = t.files?.[0];
    t.value = '';
    return f ? startUpload(S.uploadZone, f) : undefined;
  }
  if (!(t instanceof HTMLInputElement) || frozen()) return;
  if (t.dataset.certify !== undefined) { // la coche unique « usage personnel » (SOG-0162) : un réglage du poste, retenu
    S.certified = t.checked;
    savePersonal();
    return renderBuild();
  }
  const set = t.dataset.buildZone ? S.ticked : t.dataset.item ? S.picked : null,
    id = t.dataset.buildZone || t.dataset.item;
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
  else if (g instanceof HTMLDetailsElement && g.matches('details.d-moreverbs') && g.isConnected) S.verbsOpen = g.open;
  else if (g instanceof HTMLDetailsElement && g.matches('details.d-pack') && g.isConnected) {
    const key = g.dataset.packTheme || g.dataset.packFold; // un thème, ou le pli « Pays » d'une région (SOG-0186)
    g.open ? S.packOpen.add(key) : S.packOpen.delete(key);
  }
  if (g instanceof HTMLDetailsElement && g.matches('details.d-covtable') && g.isConnected) {
    if (g.open) openCovTable(); // le tableau se lit à l'ouverture, une fois (SOG-0174)
    else closeCovTable(); // fermé : la prochaine ouverture relit
  }
  if (g instanceof HTMLDetailsElement && g.matches('details.d-inventory') && g.isConnected) {
    if (g.open) openInventory(); // l'inventaire se lit à l'ouverture, une fois
    else S.inventory = null; // fermé : la prochaine ouverture relit (une lecture ratée peut être refaite)
  }
  if (g instanceof HTMLDetailsElement && g.open) attachMaps(g); // un groupe qui s'ouvre : sa carte, jusque-là sans taille, démarre
}
/** Identifiant du groupe dont l'aide s'ouvre : le dernier touché s'il est encore ouvert, sinon le premier ouvert ; '' sans. */
function helpGroup() {
  const g = S?.body?.querySelector(`details.f-group[data-group="${S.focus}"][open]`) || S?.body?.querySelector('details.f-group[open]');
  return g?.dataset.group || '';
}
/** Monte l'écran dans el : le titre, les écouteurs, le « ? » de l'aide, puis la lecture et le dessin. */
export async function mount(el, ctx) {
  setState({
    el,
    ctx,
    addZone, // la carte de la base ajoute une zone connue hors couverture d'un toucher (zonemap.js ne peut pas importer screen.js)
    d: null,
    manual: {},
    focus: null,
    stops: [],
    again: 0,
    ticked: null, // zones cochées pour la construction (toutes à la première lecture)
    certified: false, // sources sous licence personnelle cochées : celles mémorisées sur ce poste (cache/data/personal.json), aucune la première fois
    status: null, // l'état par zone que le lanceur a dit (base/status, M.statusOf) : { current, parserVersion, zones: { id: { state, reasons, buildable } } } ; null : jamais lu
    statusP: null, // la lecture en cours (une seule à la fois)
    statusAsked: false, // l'état a été demandé à l'ouverture
    whyOpen: new Set(),
    zoneFilter: null, // le nombre du bilan touché (upToDate, rebuild, failed, waiting) : la liste des zones n'affiche que les siennes
    world: worldInit(), // la ligne « Synoptique monde (GFS) » : phase, état lu, dernière fin (world.js)
    zoneAsked: false, // le lien #data?zone=<id> a été lu (update.js)
    zoneLink: null,
    packTab: 'regions', // l'onglet des paquets de pays : regions | themes (SOG-0165)
    packOpen: new Set(), // les filtres thématiques dont le pli est ouvert (SOG-0065) // les zones dont la pastille montre ses raisons
    verbsOpen: false, // le pli « Plus » des verbes de la base (SOG-0071 temps 3)
    planSink: null, // les plans de purge des tranches d'une purge de plus de 60 zones (follow.js purgeChunks)
    chunk: null, // une sélection de plus de 60 zones : { i, n } la tranche en cours (follow.js runChunks)
    updating: false, // « Mettre à jour » est entre son téléchargement et sa construction (update.js)
    route: routeInit(), // la ligne « Route (RAD, points FRA) » : phase, plan montré, dernière fin, cycles présents (route.js)
    personalRead: false, // la mémoire des sources personnelles a été lue (une fois par montage)
    chain: null, // « Tout mettre à jour » en cours : { phase: 'asking' | 'running' | 'stopping' | 'publishing', runs, i, verb, stopped, rows, t0, job }
    chainEnd: null, // la fin de la dernière chaîne : { result, text, rows }
    chainNote: false, // un repère de chaîne sans fin a été trouvé à l'ouverture
    lastOp: null, // la fin de la dernière opération suivie : { set, verb, out, text } (la chaîne la lit)
    groups: null, // les groupes de l'écran (buildGroups), calculés à chaque dessin
    srcKept: null, // le cycle tenu par source datée à la dernière fin de la base qui le disait : [{ id, cycle, current, stale }] (null : jamais lu, le journal sert)
    attn: {}, // les groupes dont le cycle publié est dépassé : { base, proc } (le cycle « AANN » ou null)
    outlines: null, // les contours des zones (ctx.aerodb.zoneOutlines) : null (pas demandés), 'loading', l'objet, ou false (sans réponse : la liste seule)
    pickupBlocked: null, // les zips du plan montré que la prise réelle n'a pas lancés (nom hors de la règle) : dits à la fin
    pickupPlan: null, // le plan d'une prise montré dans la question : { zones, zips } (la prise réelle est construite de lui seul)
    maps: {}, // les cartes MapLibre des panneaux, par panneau (base, proc) : { host (persistant), map, layer, starting, sig, dark }
    mapFail: {}, // les panneaux dont le socle de carte n'a pas pu démarrer : la liste seule
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
      reading: false, // la lecture de sync-status est en cours (premier dessin sans l'attendre, SOG-0164)
      phase: null,
      result: null
    }, // « Publier » : sync-status lu, 'asking' | 'running' | null, la fin { out } ou { unread }
    journal: [],
    journalOpen: false,
    upload: null, // l'envoi d'un fichier choisi au lanceur (SOG-0199) : { zone, name, loaded, total, ctrl }
    cov: null, // le tableau de couverture par pays (SOG-0174) : lu à l'ouverture seulement, { open, state, rows, sort, openRows }
    inventory: null, // la carte « Inventaire des données » : lue à l'ouverture seulement, { open, state, rows }
    move: null, // « Ranger les sources brutes » (SOG-0030) : { undo, phase: 'planning' | 'asking' | 'running' | null, kind: 'asking' | 'nothing' | 'done' | 'refused', view, why }
    timer: 0
  });
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
  S.body.addEventListener('pointerover', onPackOver);
  S.body.addEventListener('pointerout', onPackOut);
  S.body.addEventListener('pointerdown', onPackDown);
  S.body.addEventListener('change', onChange);
  S.body.addEventListener('input', onInput);
  S.onResize = () => { // les cartes reprennent la taille de leur hôte quand la fenêtre change (une seule écoute, retirée au démontage)
    cancelAnimationFrame(S.rz);
    S.rz = requestAnimationFrame(() => S && resizeMaps());
  };
  window.addEventListener('resize', S.onResize);
  S.onNet = () => { // « hors ligne » : la raison du bouton suit le réseau ; une carte qui n'avait pas pu démarrer est retentée
    S.mapFail = {};
    renderBuild();
  };
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
  destroyMaps();
  stopTimer(); // le suivi s'arrête de lui-même au démontage (le cadre) : le travail, lui, continue sur le lanceur
  for (const f of S.stops) f?.();
  S.body = null;
  setState(null);
}
