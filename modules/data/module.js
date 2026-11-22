// V3 data — « Données » de l'appli Pilote, monté par le cadre (frame/SPEC.md § 3.2 ; modules/data/SPEC.md, INTEGRATION.md) : le point d'entrée du module (SPEC § 11). `meta`, le montage et
// le démontage, les gestionnaires d'événements (clic, changement, saisie, touche, aerodb) et l'opération qu'un clic désigne (opOf). Ne dessine rien et ne contient aucune règle : tout vient des
// autres fichiers du module (état, écran, panneaux, carte, suivi, publication, chaîne), le calcul pur de model.js et les textes de texts.js.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  wireFolds
} from '../../frame/lib/fold.js';
import {
  keepScroll
} from '../../frame/lib/dom.js'; // un rendu ne bouge ni le défilement ni la frappe
import {
  ask,
  esc,
  frozen,
  JOURNAL,
  PERSONAL_ROUTE,
  S,
  setState,
  tt
} from './state.js';
import {
  xpInit,
  xplaneGesture,
  xplaneRefresh
} from './xplane.js';
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
  focusStates,
  panelId,
  renderBuild
} from './panels.js';
import {
  focusCertify,
  refreshStatus,
  retryStatus,
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
  addCountry,
  closeSheet,
  CW_STYLE,
  cwInit,
  highlightZones,
  hoverZone,
  openCountry,
  removeCountry,
  toggleDone,
  toggleGroup,
  toggleLegend
} from './countries.js';
import {
  todoGesture,
  TODO_STYLE
} from './todo.js';
import {
  mapClickGuard,
  mapDown,
  mapHome,
  mapMove,
  mapUp,
  mapWheel,
  mapWorld,
  mapZoomButton
} from './mapview.js';
import {
  zoneUpdate,
  zopRetry,
  zopStop
} from './zoneop.js';
import {
  changeAct,
  LATER_STYLE,
  toggleLc
} from './later.js';
import {
  startUpdate
} from './update.js';
import {
  clearSel,
  hasSel,
  selAdd,
  selUpdate,
  toggleSel
} from './select.js';
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
  busyAct,
  startGesture
} from './busy.js';
import {
  setZoneFilter
} from './status.js';
import {
  startPublish
} from './publish.js';
import {
  retryChain,
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
  cancelRegistry,
  chooseRegistry,
  startRegistryUpload
} from './registry.js';
import {
  cancelTours,
  chooseTours,
  startToursUpload
} from './tours.js';
import {
  bindCovSort,
  closeCovTable,
  covClick,
  initCovSort,
  openCovTable,
  unbindCovSort
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
    routes: ['regen/job', 'regen/job/release', 'regen/verbs', 'sync-status', 'data/inventory', 'base/upload', 'personal', 'xplane'],
    read: []
  },
  files: ['model.js', 'model_screen.js', 'model_sets.js', 'model_results.js', 'model_chain.js', 'model_map.js', 'model_publish.js',
    'model_kit.js', 'model_inventory.js', 'texts.js', 'state.js', 'screen.js', 'panels.js', 'zonemap.js', 'follow.js', 'publish.js',
    'chain.js', 'inventory.js', 'model_route.js', 'model_update.js', 'model_status.js', 'model_packs.js', 'route.js', 'update.js',
    'status.js', 'packs.js', 'model_world.js', 'world.js', 'model_coverage.js', 'covtable.js', 'upload.js', 'model_busy.js', 'busy.js',
    'model_countries.js', 'countries.js', 'model_todo.js', 'todo.js', 'later.js', 'registry.js', 'tours.js', 'model_tours.js',
    'model_setstate.js', 'setstate.js', 'xplane.js',
    'zipmember.js', 'belgium.js', 'model_mapview.js',
    'mapview.js',
    'model_thread.js',
    'zoneop.js', 'select.js',
    '../../frame/lib/plural.js', '../../frame/lib/untrusted.js', // SOG-0468 (c) : importé par model_sets.js
    '../../frame/lib/sortlist.js', // SOG-0498 : le tri du tableau de couverture (covtable.js)
    '../../frame/lib/fold.js', // SOG-0468 (3) : le pli (fold) et son écouteur (wireFolds) : screen.js, packs.js, panels.js, later.js, todo.js, covtable.js, inventory.js, module.js
    '../maps/lib/map_base.js?v=0', '../maps/render.js?v=0', '../../frame/lib/dom.js', '../../frame/lib/time.js'
  ],
  // la carte des zones : MapLibre et les contours, chargés à la demande par le socle de carte (comme la Météo) ; les tuiles, appelées par MapLibre lui-même
  lazy: ['../maps/lib/maplibre-gl.js?v=0', '../maps/lib/maplibre-gl.css?v=0'],
  net: ['tiles.openfreemap.org'],
  reads: ['cache/data/',
    'cache/sort/'
  ], // cache/sort/ : l'ordre gardé du tableau de couverture est LU par loadState (SOG-0498), pas seulement écrit
  writes: [{
    prefix: 'cache/data/',
    policy: 'cache'
  }, {
    prefix: 'cache/sort/', // l'ordre choisi du tableau de couverture (frame/lib/sortlist.js, SOG-0498)
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
    if (me !== S || !S.d) return;
    const box = S.body?.querySelector(
      '[data-states-box]'
    ); // (la carte « Couverture » n'existe plus : la liste des États n'a plus de boîte, seuls les États du panneau des procédures se redessinent)
    const open = box?.querySelector('[data-more]')?.open;
    S.d.byState = byState;
    if (box) keepScroll(S.body, () => {
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
  const xp = e.target.closest?.(
    '[data-act="xplane-save"], [data-act="xplane-clear"]'); // « Enregistrer » et « Effacer » du dossier d'X-Plane (xplane.js)
  if (xp) return xp.disabled ? undefined : xplaneGesture(xp.dataset.act);
  const mv = e.target.closest?.('button[data-move]');
  if (mv) return mv.disabled ? undefined : moveClick(mv); // « Ranger les sources brutes » (carte Inventaire)
  const pt = e.target.closest?.('button[data-pack-tab]');
  if (pt) return setPackTab(pt.dataset.packTab); // les onglets Régions | Thèmes (SOG-0165)
  if (e.target.closest?.('[data-covtable]') && e.target.closest?.('[data-cov-row], [data-cov-reload]')) return covClick(
    e); // le tableau de couverture (SOG-0174)
  const rg = e.target.closest?.(
    '[data-act="reg-choose"], [data-act="reg-cancel"]'); // « Choisir le fichier… » et « Annuler » du registre français (registry.js)
  if (rg) {
    if (rg.disabled) return;
    if (rg.dataset.act === 'reg-cancel') return cancelRegistry();
    startGesture(rg);
    return chooseRegistry();
  }
  const tr = e.target.closest?.(
    '[data-act="trk-choose"], [data-act="trk-cancel"]'); // « Choisir le fichier… » et « Annuler » des tours de piste VFR (tours.js)
  if (tr) {
    if (tr.disabled) return;
    if (tr.dataset.act === 'trk-cancel') return cancelTours();
    startGesture(tr);
    return chooseTours();
  }
  const uc = e.target.closest?.(
    '[data-act="zone-upload"], [data-act="upload-cancel"]'); // « Choisir le fichier… » et « Annuler » de la ligne d'une zone (SOG-0199)
  if (uc) {
    if (uc.dataset.act !== 'upload-cancel') startGesture(
      uc); // où le geste a été fait : un refus « une autre opération est en cours » y dessine sa carte
    return uc.dataset.act === 'upload-cancel' ? cancelUpload() : chooseFile(uc.dataset.zone, uc.dataset.source);
  }
  const up = e.target.closest?.(
    '[data-act="update-pack"]'); // « Mettre à jour (n) » d'un paquet (SOG-0188) : ses seuls pays de la couverture
  if (up) {
    startGesture(up);
    const p = (S.d?.packs || []).find(x => x.id === up.dataset.pack);
    return up.disabled || !p ? undefined : startUpdate(M.packState(p, S.d.zones, S.d.cov.ids).inCoverage);
  }
  const sb = e.target.closest?.(
    '[data-act="sel-add"], [data-act="sel-update"], [data-act="sel-cancel"]'); // le bandeau de la sélection de pays (select.js)
  if (sb) {
    if (sb.disabled) return;
    startGesture(sb);
    return sb.dataset.act === 'sel-add' ? selAdd() : sb.dataset.act === 'sel-update' ? selUpdate() : clearSel();
  }
  const oc = e.target.closest?.(
    '[data-act="open-country"]'); // un pays de la carte, d'un paquet ou de la liste de la phrase d'état : sa fiche (SOG-0262)
  if (oc) return e.shiftKey && oc.closest('[data-wmap]') ? toggleSel(oc.dataset.zone) : openCountry(
    oc); // Maj + clic sur la carte : le pays est choisi (un clic simple ouvre toujours la fiche)
  const su = e.target.closest?.(
    '[data-act="sheet-update"]'
  ); // « Mettre à jour ce pays » : le même chemin que le bouton d'un paquet, pour ce pays seul (SOG-0262, lot B)
  if (su) {
    if (su.disabled || !/^[a-z0-9_-]{2,12}$/.test(su.dataset.zone || '')) return;
    startGesture(su);
    return zoneUpdate(su.dataset
      .zone, {
        retake: su.dataset.retake === '1'
      }); // un seul pays : prise du fichier vu, téléchargement, construction, enchaînés, l'avancement sur place (zoneop.js)
  }
  const zs = e.target.closest?.('[data-act="zop-stop"], [data-act="zop-retry"]');
  if (zs) return zs.disabled ? undefined : zs.dataset.act === 'zop-stop' ? zopStop() : zopRetry(zs.dataset.zone);
  const td = e.target.closest?.('[data-todo-act]');
  if (td) {
    startGesture(td);
    return td.disabled ? undefined : todoGesture(td);
  }
  const ac = e.target.closest?.(
    '[data-act="add-country"], [data-act="remove-country"], [data-act="sheet-publish"], [data-act="change-act"]'
  ); // lot C : ajouter ou retirer un pays, publier cette zone, le geste d'une ligne de « Quand ça change »
  if (ac) {
    if (ac.disabled) return;
    startGesture(ac);
    if (ac.dataset.act === 'add-country') return addCountry(ac.dataset.zone);
    if (ac.dataset.act === 'remove-country') return removeCountry(ac.dataset.zone);
    if (ac.dataset.act === 'change-act') return changeAct(ac.dataset.kind);
    return /^[a-z0-9_-]{2,12}$/.test(ac.dataset.zone || '') ? startPublish(false, ac.dataset.zone) : undefined;
  }
  if (e.target.closest?.('[data-act="focus-states"]'))
    return focusStates(); // « Cochez au moins un État » (un geste grisé) : le lien qui mène aux États des procédures
  if (e.target.closest?.('[data-act="legend-more"]')) return toggleLegend();
  if (e.target.closest?.('[data-act="todo-done"]'))
    return toggleDone(); // le pli « Déjà faits » : son état est retenu (le toggle natif suit)
  const gt = e.target.closest?.('[data-act="grp-toggle"]');
  if (gt) return toggleGroup(gt.dataset.gid);
  if (e.target.closest?.('[data-act="sheet-close"]')) return closeSheet();
  if (e.target.closest?.('[data-act="world-toggle"]')) return mapWorld();
  if (e.target.closest?.('[data-act="map-home"]')) return mapHome();
  const mz = e.target.closest?.('[data-act="map-zoom"]');
  if (mz) return mapZoomButton(mz.dataset.dir);
  const sr = e.target.closest?.('[data-act="status-retry"]');
  if (sr) return sr.disabled ? undefined : retryStatus(); // « Réessayer » de la ligne « état non lu » : relit l'état seul
  const zf = e.target.closest?.('[data-act="zone-filter"]');
  if (zf) return setZoneFilter(zf.dataset.filter); // un nombre de la phrase d'état : ses zones se déplient sur place
  const zw = e.target.closest?.('[data-act="zone-why"]');
  if (zw) return toggleWhy(zw.dataset.zone); // la pastille d'une zone : ses raisons (SOG-0071)
  if (e.target.closest?.('[data-act="zone-certify"]'))
    return focusCertify(); // la ligne d'une zone qui attend la coche d'usage personnel : le lien qui y mène
  const rc = e.target.closest?.('[data-act="map-recenter"]');
  if (rc) return recenterMap(rc.closest('[data-zone-map]')?.dataset.zoneMap);
  const g = e.target.closest?.('details.f-group > summary')?.parentElement;
  if (g) S.focus = g.dataset.group;
  const ba = e.target.closest?.('button[data-busy-act]');
  if (ba) return ba.disabled ? undefined : busyAct(ba.dataset
    .busyAct); // la carte de l'opération en cours : Voir, Arrêter, Libérer, Masquer (SOG-0245)
  const v = e.target.closest?.('button[data-verb]');
  if (!v || v.disabled) return;
  if (v.dataset.verb === 'stop') return S.run?.ctrl.abort();
  if (['all', 'update', 'retry-fetch', 'retry-zone', 'pickup', 'pickup-replan', 'chain-retry', 'publish', 'download', 'build', 'purge',
      'publish-sheets'
    ]
    .includes(v.dataset.verb)) startGesture(v); // où le geste a été fait : un refus « une autre opération est en cours » y dessine sa carte
  if (v.dataset.verb === 'all') return updateAll();
  if (v.dataset.verb === 'retry-fetch') return /^[a-z0-9]{2,8}$/.test(v.dataset.zone || '') ? startUpdate([v.dataset.zone]) :
    undefined; // « Réessayer » sur la ligne d'une zone dont le téléchargement a échoué (SOG-0180) : son téléchargement seul, puis sa construction
  if (v.dataset.verb === 'retry-zone') return retryZone(v.dataset.zone); // « Réessayer » sur la ligne d'une zone en échec (SOG-0180)
  if (v.dataset.verb === 'pickup' || v.dataset.verb === 'pickup-replan') {
    if (v.dataset.source && S.cw) S.cw.hand.set(v.dataset.zones, v.dataset
      .source); // la source du dernier geste de fichier garde son message sur la fiche
    return startPickup(v.dataset.zones);
  }
  if (v.dataset.verb === 'stop-chain') return stopChain();
  if (v.dataset.verb === 'chain-retry') return /^[a-z]{2,10}$/.test(v.dataset.set || '') ? retryChain(v.dataset.set) :
    undefined; // « Réessayer » sur un jeu en échec de la fin de la chaîne (SOG-0239)
  if (v.dataset.verb === 'update') return startUpdate();

  if (v.dataset.verb === 'world-build') return startWorld();
  if (v.dataset.verb === 'route-import') return startRoute();
  if (v.dataset.verb === 'route-yes' || v.dataset.verb === 'route-no') return answerRoute(v.dataset.verb === 'route-yes');
  const op = opOf(v);
  if (op) startOp(...op);
  else if (v.dataset.verb === 'publish') startPublish();
}
/** Le pays sous le pointeur (un chemin de la carte ou un pays d'un paquet), ou null. */
const zoneEl = e => e.target.closest?.('[data-hz]');
/** Le survol (souris) d'un pays, sur la carte ou dans la liste d'un paquet : il se remplit seul, les autres gardent leur bordure (SOG-0262). */
function onZoneOver(e) {
  if (e.pointerType === 'touch') return;
  const z = zoneEl(e);
  if (z) hoverZone(z.dataset.hz);
}

function onZoneOut(e) {
  if (e.pointerType === 'touch') return;
  const z = zoneEl(e);
  if (z && !z.contains(e.relatedTarget)) hoverZone('');
}
/** « Échap » vide la sélection de pays de la carte, puis referme la fiche d'un pays. */
function onKey(e) {
  if (e.key === 'Enter' && !e.isComposing && e.target?.matches?.(
      '[data-xplane-path]')) { // la touche Entrée dans le champ du dossier d'X-Plane : « Enregistrer »
    e.preventDefault();
    return xplaneGesture('xplane-save');
  }
  if (e.key === 'Escape' && hasSel() && !e.defaultPrevented) return clearSel(); // d'abord la sélection de pays, ensuite la fiche
  if (e.key === 'Escape' && S?.cw?.sheet && !e.defaultPrevented) closeSheet();
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
/** Le groupe de la grille sous le pointeur (avec ses pays), ou null. */
const groupRow = e => e.target.closest?.('.d-gp[data-zones]');
/** Le survol (souris) d'un groupe de la grille surligne son périmètre sur la carte, sans la cadrer (le cadrage reste au clic) ; au toucher il n'y a pas de survol, rien ne change (SOG-0285). */
function onGroupOver(e) {
  if (e.pointerType === 'touch') return;
  const g = groupRow(e);
  if (g) highlightZones(g.dataset.zones.split(',').filter(Boolean));
}

function onGroupOut(e) {
  if (e.pointerType === 'touch') return;
  const g = groupRow(e);
  if (g && !g.contains(e.relatedTarget)) highlightZones([]);
}
/** L'appui (tactile) d'une rangée surligne ses zones et les garde jusqu'au prochain appui ailleurs. */
function onPackDown(e) {
  if (e.pointerType !== 'touch') return;
  const r = packRow(e);
  highlightZones(r ? r.dataset.zones.split(',').filter(Boolean) : []);
}
/** Le clic sur la coche « usage personnel » : le lanceur la tient (POST personal { certified }, SOG-0238) et c'est SA réponse qui fait foi ; sans lui (ou un lanceur plus ancien, un appareil
 *  appairé), la coche reste le réglage de cette page (cache/data/personal.json). Un refus du lanceur : la coche revient comme elle était, dite. */
async function setCertified(want) {
  const me = S,
    before = S.certified;
  S.certified = want;
  if (S.tickLauncher) {
    const r = await S.ctx.launcher.call(PERSONAL_ROUTE, {
      certified: want
    }).catch(() => null);
    if (S !== me) return;
    if (!r || r.ok === false || typeof r.certified !== 'boolean') {
      S.certified = before;
      S.ctx.notify(tt(TX.tickRefused), 'warn');
      return renderBuild();
    }
    S.certified = r.certified;
  }
  if (S.certified)
    for (const [z, m] of [...S.zoneMsg]) {
      if (m.awaitsTick) S.zoneMsg.delete(z); // « cochez la case » : elle est cochée, la ligne ne le dit plus
    }
  xplaneRefresh(); // la ligne « X-Plane (personnel, local) » n'existe qu'avec la coche : elle se lit (ou disparaît) avec elle
  savePersonal();
  if (S.d?.cov?.ids) refreshStatus(S.d.cov
    .ids); // l'état par zone dépend de la coche (les sources personnelles comptent dans « fichiers changés ») : relu
  return renderBuild();
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
    if (S.uploadSource === 'registry_fr' && !S.uploadZone) return f ? startRegistryUpload(f) :
      undefined; // le fichier du registre français (registry.js)
    if (S.uploadSource === 'vfr_circuits' && !S.uploadZone) return f ? startToursUpload(f) :
      undefined; // le XML des tours de piste (tours.js)
    return f ? startUpload(S.uploadZone, f, S.uploadSource) : undefined;
  }
  if (!(t instanceof HTMLInputElement) || frozen()) return;
  if (t.dataset.certify !== undefined) return setCertified(t
    .checked); // la coche unique « usage personnel » (SOG-0162) : un réglage du poste, retenu
  const set = t.dataset.item ? S.picked : null,
    id = t.dataset.item;
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
/** Retient (ou oublie) un pli de paquet ouvert : `id` est l'identifiant du thème, ou « c:<paquet> » pour le pli « Pays » d'une région. */
function setPackOpen(id, open) {
  if (open) S.packOpen.add(id);
  else S.packOpen.delete(id);
}
/** Ce que fait chaque pli de l'écran quand il s'ouvre ou se ferme, par genre : la clé du pli (data-fold, posée par fold()) est « genre » ou « genre:id », `id` le reste. Les plis sans clé (lignes de jeux, « n autres », « Déjà faits ») n'ont pas d'état. */
const FOLD_EFFECT = {
  group: (id, open) => {
    S.manual[id] = open;
  }, // un groupe ouvert ou fermé à la main, d'un dessin à l'autre
  journal: (id, open) => {
    S.journalOpen = open;
  },
  bdetail: (id, open) => {
    S.baseDetailOpen = open;
  }, // le « Détail de la base » (SOG-0229)
  moreverbs: (id, open) => {
    S.verbsOpen = open;
  },
  packs: (id, open) => {
    S.packsOpen = open;
  }, // « Paquets de pays », replié d'origine (SOG-0228)
  mycov: (id, open) => {
    S.myCovOpen = open;
  }, // « Ma couverture » (paquets, case « Je certifie… »), repliée d'origine
  todo: (id, open) => {
    if (S.cw) S.cw.todoOpen = open;
  }, // « À faire ce mois-ci » : replié d'origine, l'ouverture à la main est gardée
  lc: (id, open) => toggleLc(id, open), // cycle suivant, quand ça change, vu pas encore lu
  pack: (id, open) => setPackOpen(id, open), // un thème (SOG-0065)
  packfold: (id, open) => setPackOpen(id, open), // le pli « Pays » d'une région (SOG-0186)
  covtable: (id, open) => {
    if (open) openCovTable(); // le tableau se lit à l'ouverture, une fois (SOG-0174)
    else closeCovTable(); // fermé : la prochaine ouverture relit
  },
  inventory: (id, open) => {
    if (open) openInventory(); // l'inventaire se lit à l'ouverture, une fois
    else S.inventory = null; // fermé : la prochaine ouverture relit (une lecture ratée peut être refaite)
  }
};
/** Un pli de l'écran s'ouvre ou se ferme (wireFolds) : son effet (FOLD_EFFECT), puis, ouvert, ses cartes : celle d'un groupe, jusque-là sans taille, démarre. Pas de `get` : chaque bascule rejoue son effet, comme avant. */
function onFold(key, open, el) {
  const i = key.indexOf(':'),
    kind = i < 0 ? key : key.slice(0, i);
  if (Object.hasOwn(FOLD_EFFECT, kind)) FOLD_EFFECT[kind](i < 0 ? '' : key.slice(i + 1), open);
  if (open) attachMaps(el);
}
/** Identifiant du groupe dont l'aide s'ouvre : le dernier touché s'il est encore ouvert, sinon le premier ouvert ; '' sans. */
function helpGroup() {
  const g = S?.body?.querySelector(`details.f-group[data-group="${CSS.escape(S.focus)}"][open]`) || S?.body?.querySelector('details.f-group[open]');
  const id = g?.dataset.group || '';
  return id === 'vfr' || id === 'sources' ? 'base' : id; // les points VFR et les sources sont des plis du chapitre de la base
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
    ticked: null, // « toute la couverture » (SOG-0262 : plus aucune sélection à la main ; les verbes de la base la lisent)
    cw: cwInit(), // la carte du monde, les paquets et la fiche d'un pays (countries.js) : survol, paquet ouvert, fiche ouverte, vue, lectures du lanceur
    xp: xpInit(), // la ligne « X-Plane (personnel, local) » : état lu du lanceur et dernier message (xplane.js ; le chemin n'est jamais gardé)
    certified: false, // sources sous licence personnelle cochées : celles mémorisées sur ce poste (cache/data/personal.json), aucune la première fois
    status: null, // l'état par zone que le lanceur a dit (base/status, M.statusOf) : { current, parserVersion, zones: { id: { state, reasons, buildable } } } ; null : jamais lu
    statusP: null, // la lecture en cours (une seule à la fois)
    statusAsked: false, // l'état a été demandé à l'ouverture
    statusOld: false, // l'état par zone MONTRÉ est le dernier connu, gardé sur l'appareil (status-last.json) : aucune action ne part tant que la lecture du lanceur n'a pas abouti (SOG-0511) ; seule une lecture complète le baisse
    statusAt: null, // l'instant (ms) où cet état a été gardé ; jamais écrit dans le DOM tel quel
    statusKept: '', // les zones de la dernière écriture de status-last.json : la même lecture ne la réécrit pas
    statusLastRead: false, // status-last.json est lu une fois par montage
    statusTried: false, // une lecture complète a déjà échoué dans cet épisode : la relance automatique est partie
    statusRetry: null, // le minuteur de cette relance (arrêté au démontage)
    statusGaveUp: false, // la relance a échoué aussi : la ligne « état non lu » porte le bouton « Réessayer »
    whyOpen: new Set(),
    zoneFilter: null, // le nombre de la phrase d'état déplié (upToDate, rebuild, failed, waiting, unknown) : ses zones sont listées sous la phrase ; null : rien de déplié
    world: worldInit(), // la ligne « Synoptique monde (GFS) » : phase, état lu, dernière fin (world.js)
    zoneAsked: false, // le lien #data?zone=<id> a été lu (update.js)
    zoneLink: null,
    myCovOpen: false, // le pli « Ma couverture » (les paquets de pays et la case « Je certifie… »)
    packsOpen: false, // le bloc « Paquets de pays » : replié à l'ouverture (SOG-0228), l'ouverture à la main est gardée
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
    zoneMsg: new Map(), // ce qu'une prise ou un envoi de fichier n'a pas pu faire pour une zone, écrit sur SA ligne tant qu'une autre tentative ne l'a pas remplacé : identifiant de zone → { level, lines }
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
    busy: null, // la carte de l'opération qui a refusé un départ ou un envoi : { running (M.runningOf), panel, msg? }, jusqu'à sa fin (SOG-0245)
    busyHidden: null, // l'identifiant de l'opération dont la carte a été masquée
    zop: null, // « Mettre à jour ce pays » en cours : { zone, phase, stopped } (zoneop.js)
    at: null, // l'endroit du dernier geste (busy.js : placeOf) et son numéro (gid) : où dessiner l'avancement, la fin et la carte d'un refus
    gid: 0,
    otherAt: null, // l'endroit de la phrase « une autre opération est en cours » d'un lanceur qui ne dit pas laquelle
    statusRefused: null, // le refus « une autre opération est en cours » de la dernière lecture de l'état (status.js)
    following: false, // un suivi de travail (follow) est en cours
    pub: {
      status: null,
      reading: false, // la lecture de sync-status est en cours (premier dessin sans l'attendre, SOG-0164)
      phase: null,
      result: null
    }, // « Publier » : sync-status lu, 'asking' | 'running' | null, la fin { out } ou { unread }
    journal: [],
    journalOpen: false,
    baseDetailOpen: false, // le pli « Détail de la base » (couverture par pays, inventaire, journal), fermé d'origine
    upload: null, // l'envoi d'un fichier choisi au lanceur (SOG-0199) : { zone, name, loaded, total, ctrl }
    cov: null, // le tableau de couverture par pays (SOG-0174) : lu à l'ouverture seulement, { open, state, rows, sort, openRows }
    inventory: null, // la carte « Inventaire des données » : lue à l'ouverture seulement, { open, state, rows }
    move: null, // « Ranger les sources brutes » (SOG-0030) : { undo, phase: 'planning' | 'asking' | 'running' | null, kind: 'asking' | 'nothing' | 'done' | 'refused', view, why }
    timer: 0
  });
  if (ctx.consume?.('registry')
    .registry
  ) { // « #data?registry=1 » (le lien de l'écran des aéronefs : « Le déposer dans Données ») : le pli du registre français s'ouvre et vient dans la vue
    S.cw.lc.reveal = 'registry';
  }
  el.innerHTML = `<style>${STYLE}${CW_STYLE}${TODO_STYLE}${LATER_STYLE}</style><h1>${esc(tt(TX.title))}</h1><div data-body></div>`;
  // titre : sur un téléphone l'en-tête du cadre porte celui du module (ctx.titled) ; le h1 reste alors pour les lecteurs
  // d'écran seulement (f-sr), et suit « frame-titled » (frame/INTEGRATION.md § 6)
  S.srTitle = () => el.querySelector(':scope > h1')?.classList.toggle('f-sr', !!ctx.titled);
  S.srTitle();
  window.addEventListener('frame-titled', S.srTitle);
  S.body = el.querySelector('[data-body]');
  // « ? » de l'en-tête : le chapitre au paragraphe du groupe ouvert, sinon à celui du cycle
  ctx.helpAnchor?.(() => helpGroup() ? `data-group-${helpGroup()}` : 'data-cycle');
  S.body.addEventListener('click', onClick);
  initCovSort(); // l'ordre gardé du tableau de couverture est lu à l'appareil (SOG-0498)
  bindCovSort(); // et ses gestes (en-têtes, « Trier », « Remettre l'ordre ») sont posés une fois sur le corps de l'écran
  S.body.addEventListener('pointerover', onPackOver);
  S.body.addEventListener('pointerout', onPackOut);
  S.body.addEventListener('pointerover', onGroupOver);
  S.body.addEventListener('pointerout', onGroupOut);
  S.body.addEventListener('pointerover', onZoneOver);
  S.body.addEventListener('pointerout', onZoneOut);
  S.body.addEventListener('keydown', onKey);
  S.body.addEventListener('pointerdown', onPackDown);
  S.body.addEventListener('pointerdown', mapDown); // le zoom et le déplacement de la carte du monde (mapview.js)
  S.body.addEventListener('pointermove', mapMove);
  S.body.addEventListener('pointerup', mapUp);
  S.body.addEventListener('pointercancel', mapUp);
  S.body.addEventListener('wheel', mapWheel, {
    passive: false
  });
  S.body.addEventListener('click', mapClickGuard, true); // le toucher qui suit un glisser n'ouvre pas de fiche
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
  S.stops.push(wireFolds(S.body, onFold)); // les plis à clé ; l'écouteur est retiré au démontage (S.stops)
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
  if (S !== me) return; // démonté pendant la lecture (le pilote est parti vers un autre module) : rien n'est suivi ni dit
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
  clearTimeout(S.statusRetry); // la relance de la lecture de l'état ne part plus
  unbindCovSort();
  destroyMaps();
  stopTimer(); // le suivi s'arrête de lui-même au démontage (le cadre) : le travail, lui, continue sur le lanceur
  for (const f of S.stops) f?.();
  S.body = null;
  setState(null);
}
