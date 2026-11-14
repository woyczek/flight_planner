// V3 maps — module Carte de l'appli Pilote, monté par le cadre (frame/SPEC.md § 3.2 ; modules/maps/SPEC.md, INTEGRATION.md,
// READING.md). La carte de route du vol prévu ou démarré (pilot/<tri>/current_flight.json), son profil vertical et la route
// modifiée sur la carte ; les cartes d'une mission redessinées d'après son YAML (#maps?mission=<ID>&map=<fichier>) ; la page
// de réglage des seuils (#maps?tune=1).
// Ce fichier : la déclaration au cadre (meta), le montage (le squelette de l'écran, les écouteurs) et le démontage. Le reste
// est rangé par sujet (SPEC § 1) :
//   · state.js : l'état partagé, les aides communes, le chargement à la demande ; texts.js : les textes ×4 ; style.js ;
//   · screen.js : boutons de la carte, état vide, notes, fond MapLibre, thème ; draw.js : le dessin de la carte ;
//   · data.js : le vol, les données d'aerodb, la vue vivante ; layers.js : modes, seuils, contenu Couches ;
//   · sheet_view.js : la feuille ; profile_view.js : le profil vertical ; procs.js : SID, STAR et approche choisies ;
//     tips.js : infobulles, vents, toucher sur la carte ;
//   · lv.js : les espaces d'un point ; vfr.js : les points de report d'un terrain ; flight_time.js : heures et vol démarré ;
//   · mission_view.js : cartes de mission ; weather.js : la coupe météo ; à la demande : edit.js (mode Édition), tune.js
//     (réglage des seuils).

import {
  S,
  setS,
  keep,
  esc,
  got,
  need
} from './state.js';
import {
  svg
} from '../../frame/lib/icons.js';
import {
  TX
} from './texts.js';
import {
  STYLE
} from './style.js';
import {
  schedule,
  cancelDraw,
  mapSize
} from './draw.js';
import {
  applyFlight,
  watchFlight,
  readSettings,
  loadProcs,
  invalidate
} from './data.js';
import {
  effectiveProfile,
  fillLayers,
  fillModes,
  layersHtml,
  layersEvents,
  modesHtml,
  setPreset,
  toggleModes
} from './layers.js';
import {
  buildOverlay,
  helpAnchor,
  loadLibs,
  startTiles,
  status,
  watchTheme
} from './screen.js';
import {
  atcStart
} from './atc.js';
import {
  makeSheet,
  sheetEvents,
  escapeKey,
  dataHead,
  sheetFit
} from './sheet_view.js';
import {
  profileEvents,
  cancelProfile
} from './profile_view.js';
import {
  hoverMap,
  linger,
  tapAt,
  llAt
} from './tips.js';
import {
  applyMission,
  loadAside,
  deriveMission,
  retryMission,
  missionEvents
} from './mission_view.js';
import {
  weatherEvents
} from './weather.js';
import {
  covClear
} from './coverage.js';
import {
  chooseAsk,
  chooseLoad,
  chooseStart,
  chooseEvents
} from './choose.js';
import {
  groundEvents,
  groundChanged
} from './ground.js';
import {
  lvEvents
} from './lv.js';
import {
  directEvents
} from './tips.js';
import {
  altsStart,
  altsHover
} from './alts.js';
import {
  followStart
} from './follow.js';

export const meta = {
  id: 'maps',
  apps: ['pilot'],
  level: 1,
  // vue fixe (frame/INTEGRATION.md § 9.2) : la racine est une colonne pleine hauteur, carte puis feuille ; les boutons de la
  // carte sont dans la couche de superposition du cadre
  fixed: true,
  // missions/ : lu à la demande seulement (dossiers lourds), jamais tiré d'avance ; airline/ : profils des modes de la
  // compagnie (map_profiles.json) ; pilot/ : vol courant et unités du pilote
  reads: ['pilot/', {
    prefix: 'missions/',
    policy: 'reference'
  }, 'cache/maps/', 'cache/fuel/display.json', 'airline/'],
  // les tours de piste VFR de l'extracteur de l'utilisateur (SOG-0253) : le verbe `vfr/circuits` du lanceur, LECTURE SEULE (circuits.js ; sans lanceur, rien n'est dessiné)
  launcher: {
    routes: ['regen/job'],
    read: []
  },
  // SPEC § 2.2 : réglages de l'appareil, vol courant modifié sur la carte, seuils de la compagnie (page de réglage)
  writes: [{
    prefix: 'cache/maps/',
    policy: 'cache'
  }, {
    prefix: 'pilot/',
    merge: 'record'
  }, {
    prefix: 'airline/map_profiles.json',
    merge: 'record'
  }],
  // gardés à l'installation (hors ligne dès la première visite)
  files: ['atc.js?v=0', 'state.js?v=0', 'texts.js?v=0', 'style.js?v=0', 'screen.js?v=0', 'draw.js?v=0', 'alts.js?v=0',
    'canvas_scale.js?v=0',
    'data.js?v=0',
    'layers.js?v=0',
    'sheet_view.js?v=0', 'profile_view.js?v=0', 'procs.js?v=0', 'choose.js?v=0', 'ground.js?v=0', 'coverage.js?v=0', 'tips.js?v=0',
    'lv.js?v=0',
    'vfr.js?v=0', 'circuits.js?v=0', 'follow.js?v=0', 'light.js?v=0',
    'flight_time.js?v=0',
    'mission_view.js?v=0',
    'weather.js?v=0',
    'render.js?v=0', 'render_airspace.js?v=0', 'render_route.js?v=0', 'profile.js?v=0', 'mission.js?v=0', 'contours.js?v=0',
    'lib/aero_symbols.js?v=0', 'lib/vertical_profile.js?v=0',
    'lib/profiles.js?v=0', 'lib/map_base.js?v=0', 'lib/axis_window.js?v=0', '../../frame/lib/js-yaml.min.js?v=0',
    '../../frame/lib/route_text.js?v=0', '../../frame/lib/current_flight.js?v=0',
    '../../frame/lib/route_legend.js?v=0', '../../frame/lib/route_alts.js?v=0', '../../frame/lib/fms.js?v=0',
    '../../frame/lib/flight_time.js?v=0', '../../frame/lib/flight_path.js?v=0',
    '../../frame/lib/procedures.js?v=0',
    '../../frame/lib/trail.js?v=0',
    '../../frame/lib/adnames.js?v=0',
    '../../frame/lib/time.js?v=0',
    '../../frame/lib/sheet.js?v=0', '../../frame/lib/geo.js?v=0', '../../frame/lib/icons.js?v=0',
    '../../frame/lib/wind.js?v=0', '../../frame/lib/metar.js?v=0', '../../frame/lib/weather_store.js?v=0',
    '../../frame/lib/pane_model.js?v=0'
  ],
  // gardés au premier usage : le mode Édition et la page de réglage ; MapLibre (1 Mo, inutile sans tuiles) ; le rendu de la coupe
  // météo d'Atmosphère (au premier « Météo ») ; les contours des pays du fond uni viennent d'aerodb (zoneOutlines, le cadre), la
  // copie lib/outlines.js reste le repli de map_base.loadOutlines sans aerodb (Atmosphère)
  lazy: ['edit.js?v=0', 'tune.js?v=0', 'lib/maplibre-gl.js?v=0', 'lib/maplibre-gl.css?v=0', 'lib/outlines.js?v=0',
    '../atmosphere/section.js?v=0', '../atmosphere/atmo.js?v=0', '../atmosphere/texts.js?v=0', '../fuel/winds.js?v=0'
  ],
  // hôtes publics appelés directement par MapLibre (tuiles) et par le relief ombré ; CSP connect-src du cadre
  net: ['tiles.openfreemap.org', 'tiles.versatiles.org', 's3.amazonaws.com/elevation-tiles-prod', 'a.tile.opentopomap.org',
    'b.tile.opentopomap.org', 'c.tile.opentopomap.org'
  ] // OpenTopoMap (SOG-0300) : les trois hôtes que tools/csp_policy.py CONNECT permet déjà, la politique effective ne change pas
};

/** Squelette de l'écran (SPEC § 4, § 18) : le h1 invisible, la boîte de la carte (MapLibre, la surcouche, l'état vide,
 *  l'infobulle, la carte d'un point), la feuille (en-tête : Couches, poignée, titre, « Vol entier », les trois puces, ✕ ; légende ;
 *  profil et sa ligne ; corps des contenus ; notes). */
function skeleton(ctx) {
  const T = row => esc(ctx.t(row)),
    chip = (attr, icon, label, on) => `<button type="button" class="mp-chip" ${attr} aria-pressed="${on}" title="${T(label)}" aria-label="${T(label)}">${svg(icon, { size: 20 })}</button>`;
  return `<style>${STYLE}</style>
<h1 class="mp-sr">${T(TX.title)}</h1>
${ctx.query?.tune ? '<section class="mp-tune f-card" aria-live="off"></section>' : ''}
<div class="mp-main"><div class="mp-box"><div class="mp-map"></div><canvas class="mp-over" aria-hidden="true"></canvas>
<div class="mp-empty f-card" hidden aria-live="polite"></div>
<div class="mp-tip f-card" hidden role="tooltip"></div>
<div class="mp-tip mp-pcard f-card" hidden role="dialog"></div>
<div class="mp-mbar f-card" hidden></div>
<div class="mp-alts f-card" hidden></div>
</div>
<div class="mp-follow" hidden></div></div>
<div class="mp-data f-sheet-panel" hidden><div class="mp-dhead f-sheet-head"><div class="mp-chips mp-chips-l">${chip('data-mp="layers"', 'layers', TX.layers, false).replace('class="mp-chip"', 'class="mp-lchip"')}</div><button type="button" class="mp-grip f-sheet-grip" aria-expanded="true" aria-label="${T(TX.sheetSize)}"><b class="mp-dtitle f-sheet-title"></b></button><div class="mp-chips" role="group" aria-label="${T(TX.segLabel)}"><button type="button" class="mp-whole" hidden title="${T(TX.winWholeHelp)}" aria-label="${T(TX.winWholeHelp)}">${T(TX.winWhole)}</button>${chip('data-view="profile"', 'chart', TX.dataProfile, true)}${chip('data-view="weather" disabled aria-disabled="true"', 'cloud', TX.wxTitle, false)}${chip('data-legend disabled aria-disabled="true"', 'info', TX.legend, false)}</div><button type="button" class="mp-dclose f-sheet-close" data-dclose hidden aria-label="${T(TX.close)}" title="${T(TX.close)}">✕</button></div><div class="mp-legend" role="region" hidden aria-label="${T(TX.legend)}"></div>
<div class="mp-dprof"><div class="mp-prof" hidden role="img" aria-label="${T(TX.profileLabel)}"><canvas class="mp-pc"></canvas><canvas class="mp-pcur"></canvas>
<div class="mp-tip f-card" hidden role="tooltip"></div><div class="mp-spsel f-card" hidden></div></div>
<div class="mp-strip" aria-live="polite"></div></div>
<div class="mp-dbody f-sheet-body" hidden role="region" tabindex="-1"></div>
<div class="mp-notes f-muted" aria-live="polite"></div></div>`;
}

export async function mount(el, ctx) {
  performance.mark('maps:mount');
  setS({
    el,
    ctx,
    missionId: ctx.query?.mission || '', // l'adresse d'abord ; sinon la mission du vol (deriveMission, plus bas)
    stops: [],
    edit: {
      on: false,
      undo: [],
      drag: null
    },
    route: {
      points: []
    },
    map: null,
    plain: false,
    noted: {},
    // le mode « choisir sur la carte » (#maps?choose=dep|arr&icao=LFXX, V3 § 10.23) : la demande est lue et retirée de l'adresse
    // tout de suite ; null hors du mode
    choose: chooseAsk(ctx)
  });
  el.innerHTML = skeleton(ctx);
  const q = s => el.querySelector(s),
    lay = document.createElement('div');
  lay.innerHTML = layersHtml(ctx);
  Object.assign(S, {
    box: q('.mp-box'),
    mapEl: q('.mp-map'),
    canvas: q('canvas.mp-over'),
    stEl: q('.mp-empty'),
    mbarEl: q('.mp-mbar'),
    altsEl: q('.mp-alts'),
    followEl: q('.mp-follow'),
    profBox: q('.mp-prof'),
    pc: q('canvas.mp-pc'),
    pcur: q('canvas.mp-pcur'),
    stripEl: q('.mp-strip'),
    selEl: q('.mp-spsel'),
    layersEl: lay.firstElementChild, // le contenu Couches, gardé : posé dans la feuille à son ouverture
    cardEl: q('.mp-pcard'),
    dataEl: q('.mp-data'),
    dheadEl: q('.mp-dhead'),
    gripEl: q('.mp-grip'),
    notesEl: q('.mp-notes'),
    dtitleEl: q('.mp-dtitle'),
    dcloseEl: q('.mp-dclose'),
    segEl: q('.mp-chips:not(.mp-chips-l)'),
    segBtns: [...el.querySelectorAll('.mp-chip[data-view]')],
    legendBtn: q('.mp-chip[data-legend]'),
    wholeBtn: q('.mp-whole'),
    legendEl: q('.mp-legend'),
    dprofEl: q('.mp-dprof'),
    dbodyEl: q('.mp-dbody'),
    tipEl: q('.mp-box .mp-tip:not(.mp-pcard)'),
    ptipEl: q('.mp-prof .mp-tip')
  });
  buildOverlay(ctx, modesHtml(ctx));
  ctx.helpAnchor?.(helpAnchor);
  if (ctx.query?.tune) el.classList.add('mp-tuning'); // la racine défile d'elle-même, la feuille est verrouillée
  S.sh = makeSheet(el);
  S.stops.push(() => S.sh?.stop());
  // le panneau des modes se ferme d'un toucher sur la feuille (la carte le ferme elle-même) ; ses choix
  el.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') keep.touchAt = performance.now();
    if (!S.modeOpts.hidden && !e.target.closest('.mp-box')) toggleModes(false);
  }, true);
  S.modeOpts.addEventListener('click', e => {
    const m = e.target.closest('[data-mode]')?.dataset.mode;
    if (!m) return;
    toggleModes(false);
    if (m !== S.preset) setPreset(m);
  });
  S.stops.push(missionEvents(), ...profileEvents(), ...weatherEvents(), chooseEvents(), groundEvents());
  layersEvents();
  sheetEvents();
  // fond uni (sans MapLibre) : la boîte reçoit le survol et le toucher
  // (rien avant que le rendu soit chargé : le survol d'une carte qui n'a pas ses bibliothèques lisait MapsRender, « MapsRender is not defined » à chaque mouvement)
  const plainUi = e => S.map || !window.MapsRender || e.target.closest('.mp-tip, .f-overlay');
  S.box.addEventListener('pointermove', e => {
    if (plainUi(e) || e.pointerType !== 'mouse') return;
    const r = S.box.getBoundingClientRect();
    hoverMap(e.clientX - r.left, e.clientY - r.top);
  });
  S.box.addEventListener('pointerleave', e => {
    if (e.pointerType !== 'mouse') return;
    if (S.tipEl && !S.tipEl.hidden) S.tipEl.hidden =
      true; // le pointeur quitte la carte : son infobulle ne le suit pas ailleurs (SOG-0192)
    linger('map');
    if (S.altHoverMap != null) altsHover(-1e5, -1e5); // le tracé survolé est lâché avec la carte
  });
  S.box.addEventListener('click', e => {
    if (plainUi(e)) return;
    const r = S.box.getBoundingClientRect(),
      x = e.clientX - r.left,
      y = e.clientY - r.top,
      ll = llAt(x, y);
    if (ll) tapAt(x, y, ll.lat, ll.lon);
  });
  // Échap, une chose par appui, en phase de capture (avant l'écouteur du cadre, qui quitterait le plein écran) ; retenue
  // seulement quand le module a fermé quelque chose
  const onKey = e => {
    if (e.key !== 'Escape' || !S || e.defaultPrevented || document.querySelector('.f-modal') || !S.el.getClientRects().length) return;
    if (escapeKey()) e.preventDefault();
  };
  document.addEventListener('keydown', onKey, true);
  S.stops.push(() => document.removeEventListener('keydown', onKey, true));
  // « Aussi ici » dépliée : sa ligne vient sous le doigt (le contenu défile dans la feuille)
  S.dbodyEl.addEventListener('toggle', e => {
    if (e.target.open) e.target.scrollIntoView({
      block: 'nearest'
    });
  }, true);
  // liens des notes et de l'état vide ; le bouton qui active la position (le geste est nécessaire à la permission)
  el.addEventListener('click', e => {
    if (e.target.closest('[data-live]')) return ctx.live?.enable?.();
    const go = e.target.closest('[data-go]')?.dataset.go;
    if (go) location.hash = `#${go}`;
  });
  try {
    await loadLibs();
  } catch (
    e) { // une bibliothèque qui ne vient pas (fichier absent ou d'une autre version) : la Carte le dit, elle n'est pas à demi montée
    if (S) ctx.notify?.(tt(TX.libsFailed, {
      m: e?.message || String(e)
    }), 'err');
    return;
  }
  if (!S) return;
  S.theme = MapsRender.tokens();
  S.stops.push(watchTheme());
  const ui = (await ctx.data.get('cache/maps/ui.json').catch(() => null)) || {};
  if (!S) return; // la Carte a été quittée pendant la lecture (chaque reprise après une attente vérifie S d'abord)
  await readSettings();
  if (!S) return;
  S.stops.push(ctx.data.watch('airline/map_profiles.json', async () => {
    if (!S) return;
    await readSettings();
    if (!S) return;
    if (!S.missionId) S.profile = effectiveProfile();
    invalidate();
    if (S.dpanel === 'layers') fillLayers();
    got('tune')?.tuneSrc();
    schedule();
  }));
  S.preset = TX.presets[ui.preset] ? ui.preset : 'auto';
  S.layers = ui.layers && typeof ui.layers === 'object' ? ui.layers : {};
  S.mthemes = Object.fromEntries(Object.entries(ui.mission && typeof ui.mission === 'object' ? ui.mission : {}).filter(([k, v]) => k
    .length < 200 && ['vfr', 'ifr', 'base', 'yaml'].includes(v)).slice(-60));
  fillModes();
  await deriveMission();
  if (!S) return;
  // le vol nomme une mission que la liste du dépôt ne donne pas encore (premier chargement : l'arbre arrive après le montage) : la Carte la reprend dès que la liste
  // change, le bandeau apparaît sans rechargement (SOG-0196)
  if (!S.missionId && S.missionWanted) {
    S.missionWatch = true; // (dit pour les essais)
    S.stops.push(S.ctx.data.watch('missions/', () => retryMission()));
  }
  if (S.missionId) await applyMission();
  else {
    await applyFlight();
    if (S?.missionAside) loadAside(); // la surimpression arrive quand elle arrive : la carte du vol n'attend pas la mission
  }
  if (!S) return;
  // mode « choisir sur la carte » : les procédures du terrain sont lues avant le fond, qui part de la vue qu'elles donnent (S.fit)
  if (S.choose) {
    await chooseLoad();
    if (!S) return;
  }
  // fond à tuiles si possible, sinon fond uni ; la feuille posée d'abord à sa hauteur (la carte a sa taille finale avant sa caméra),
  // rien dessiné pendant le chargement du fond : la première image est la bonne (SPEC § 5, une ouverture, une image)
  dataHead();
  sheetFit();
  S.tilesWait = true;
  const tiles = S.route.points.length || S.missionId && S.mission ? await startTiles() : false;
  if (!S) return;
  S.tilesWait = false;
  if (!tiles) S.plain = true;
  if (ctx.query?.tune) {
    const T = await need('tune').catch(() => null);
    if (!S) return;
    T?.tuneSetup(el.querySelector('.mp-tune'));
  }
  status();
  if (S.choose) chooseStart();
  schedule();
  if (!S.missionId || S.missionAside) S.stops.push(...
    watchFlight()
  ); // la fenêtre d'un vol suit le vol même quand une carte fournie y est déjà montrée (le choix peut venir avant la fin du montage, SOG-0251)
  S.stops.push(altsStart()); // les itinéraires que Carburant propose (SOG-0134 a)
  S.stops.push(atcStart()); // les contrôleurs en ligne IVAO / VATSIM, lus tant que leur couche est allumée (SOG-0094)
  S.stops.push(lvEvents()); // la fiche d'un espace de la liste (SOG-0163)
  S.stops.push(followStart()); // le suivi du vol (SOG-0304) : sous la carte au téléphone, une colonne de 340 px dès 1 000 px
  S.stops.push(directEvents()); // « Direct vers ce point » des fiches : l'adresse de Carburant, jamais le vol (SOG-0088)
  if (ctx.aerodb?.on) S.stops.push(ctx.aerodb.on('change', e => {
    if (!S || (e?.aircraft && !e.zone && !e.changed)) return; // la base appareils ne touche pas la carte
    if (e?.ground) groundChanged(e.ground, !!e
      .groundFailed); // le sol d'un terrain lu à la suite de ses procédures : le panneau Sol le relit
    if (e?.coverage || e?.refreshed) covClear(); // couverture des procédures : redemandée au prochain dessin
    // procédures d'un terrain relues (« Lire » / « Relire » de Carburant : { procedures: OACI }) : celles du vol aussi, quand
    // c'est son départ ou son arrivée
    const r = S.route?.flight?.route,
      k = String(e?.procedures || '').toUpperCase();
    if (k && r && [r.dep, r.arr].some(x => String(x || '').toUpperCase() === k)) {
      S.procsKey = null;
      loadProcs();
    }
    if (e?.coverage && !e.refreshed && !e.zone && !e.changed) return schedule(); // ni zone ni fichier d'espaces : rien à relire
    invalidate(); // relue au prochain dessin, montrée telle quelle jusque-là
    if (e?.refreshed) { // la base a été relue (Paramètres) : les procédures du vol aussi
      S.procsKey = null;
      loadProcs();
    }
    schedule();
  }), ctx.aerodb.on('state', () => S && status()));
  // un seul observateur de taille : il ne dessine rien, il demande à la feuille sa taille arrêtée (onSettle, SPEC § 7.5)
  const ro = new ResizeObserver(() => S?.sh.settle());
  for (const e of [el, S.box, S.dbodyEl, S.profBox]) ro.observe(e);
  // retour d'un onglet caché ou d'une page gelée : taille reprise, surcouche redessinée
  const back = () => {
    if (document.hidden || !S) return;
    mapSize();
    schedule();
  };
  // un point de la route survolé ailleurs (la liste de la route de Carburant, le profil) : surligné sur la carte avec ses tronçons, sans recadrer (SOG-0321) ; contrat : window event
  // « route-point-hover » { detail: { id } } (id de la route, majuscules ou non ; null ou absent : plus de surlignage)
  const hl = e => {
    const id = String(e?.detail?.id ?? '').trim().toUpperCase().slice(0, 40) || null;
    if (!S || S.hlPoint === id) return;
    S.hlPoint = id;
    schedule();
  };
  window.addEventListener('route-point-hover', hl);
  document.addEventListener('visibilitychange', back);
  window.addEventListener('pageshow', back);
  document.addEventListener('resume', back);
  S.stops.push(() => {
    window.removeEventListener('route-point-hover', hl);
    document.removeEventListener('visibilitychange', back);
    window.removeEventListener('pageshow', back);
    document.removeEventListener('resume', back);
    ro.disconnect();
  });
}

export function unmount() {
  if (!S) return;
  for (const f of S.stops) try {
    f?.();
  } catch {
    /* déjà arrêté */
  }
  if (S.edit.saveT) {
    clearTimeout(S.edit.saveT);
    S.edit.flush?.(); // le dernier geste du mode Édition est écrit tout de suite
  }
  cancelDraw();
  cancelProfile();
  for (const c of [S.canvas, S.frame?.bmp, S.pc, S.pcur])
    if (c) c.width = c.height = 0; // les pixels rendus tout de suite, sans attendre le ramasse-miettes (SOG-0067)
  try {
    S.map?.remove();
  } catch {
    /* déjà retirée */
  }
  S.modeOpts?.remove();
  setS(null);
}
