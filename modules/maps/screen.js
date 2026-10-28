// V3 maps — l'écran (modules/maps/SPEC.md § 4, § 5, § 17) : les boutons posés sur la carte (couche de superposition du
// cadre), l'état vide, les notes de la feuille et les notifications, le résumé du vol, la caméra, le fond MapLibre (ou le
// fond uni), les jetons de dessin du design et de la nuit, l'ancre de l'aide en ligne.

import {
  S,
  esc,
  tt,
  show,
  got,
  need,
  onMission,
  level
} from './state.js';
import {
  svg
} from '../../frame/lib/icons.js';
import {
  TX
} from './texts.js';
import {
  startTiles as baseTiles,
  styleFor as baseStyle,
  isOwnResize
} from './lib/map_base.js';
import {
  schedule,
  mapSize,
  mapBase,
  relief,
  baseNames
} from './draw.js';
import {
  toggleModes,
  closePanels,
  toggleLayers
} from './layers.js';
import {
  dataHead,
  redrawSheet
} from './sheet_view.js';
import {
  drawProfile
} from './profile_view.js';
import {
  isStarted,
  isArrived,
  setFollow
} from './flight_time.js';
import {
  hideTips,
  hoverMap,
  linger,
  tapAt,
  fromTouch
} from './tips.js';
import {
  previewAd
} from './vfr.js';

/** Bibliothèques du dossier du module (scripts classiques, une fois par page) : [variable globale, fichier]. */
const LIBS = [
  ['SiaAero', 'lib/aero_symbols.js'],
  ['SiaProfile', 'lib/vertical_profile.js'],
  ['MapsRender', 'render.js'],
  ['MapsProfile', 'profile.js'],
  ['MapsMission', 'mission.js'],
  ['MapsContours', 'contours.js'],
  ['MAPS_PROFILES', 'lib/profiles.js'],
  ['jsyaml', '../../frame/lib/js-yaml.min.js']
];
/** Charge les bibliothèques (une fois par page). Le service worker les garde : elles sont dans meta.files, que le cadre
 *  conserve dès l'installation. */
export async function loadLibs() {
  for (const [glob, file] of LIBS)
    if (!window[glob]) await import(new URL(`${file}?v=0`, import.meta.url).href);
}
/** Style du fond : celui du profil d'affichage, de jour ; la nuit, le style sombre. */
export const styleFor = () => baseStyle({
  dark: S.theme?.dark,
  base: S.profile?.base
});

// ---------------------------------------------------------------- boutons sur la carte
/** Couche de superposition hors du cadre (page d'essai, sans ctx.overlay) : les deux colonnes construites dans la boîte de la
 *  carte avec les classes du cadre. */
function ownOverlay() {
  const layer = document.createElement('div');
  layer.className = 'f-overlay';
  layer.style.inset = '0';
  layer.innerHTML = '<div class="f-ov-col f-ov-left"></div><div class="f-ov-col f-ov-right"></div>';
  S.box.append(layer);
  const [left, right] = layer.children;
  return {
    left,
    right,
    button({
      icon,
      label = '',
      onClick,
      pressed,
      side = 'right'
    } = {}) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'f-ov-btn';
      b.innerHTML = svg(icon, {
        size: 22
      });
      b.title = label;
      b.setAttribute('aria-label', label);
      if (pressed !== undefined) b.setAttribute('aria-pressed', String(!!pressed));
      if (onClick) b.addEventListener('click', onClick);
      (side === 'left' ? left : right).append(b);
      return b;
    },
    over() {}
  };
}
/** Boutons de la carte (SPEC § 4) : à droite Modifier la route, Recentrer, le mode, Édition, Suivre, puis « + » et Annuler du
 *  mode Édition (le plein écran du cadre est le dernier) ; à gauche Couches. Le panneau des modes est posé dans la couche
 *  elle-même (rien sur la carte hors de la couche du cadre). */
export function buildOverlay(ctx, modesHtml) {
  const ov = ctx.overlay || ownOverlay(),
    btn = (key, o) => {
      const b = ov.button(o);
      b.dataset.mp = key; // crochet des règles du module et des essais
      return b;
    };
  ov.over(S.box);
  S.routeBtn = btn('route', {
    icon: 'edit',
    label: ctx.t(TX.edit),
    onClick: () => {
      closePanels();
      location.hash = '#fuel?from=maps&focus=route';
    }
  });
  S.fitBtn = btn('fit', {
    icon: 'target',
    label: ctx.t(TX.fit),
    onClick: () => {
      closePanels();
      S.userMoved = false; // « Recentrer » : la carte suit de nouveau le vol
      if (S.map) fitMap(true);
      else schedule();
    }
  });
  S.modeBtn = btn('mode', {
    icon: 'map',
    label: ctx.t(TX.preset),
    onClick: () => toggleModes()
  });
  S.modeBtn.setAttribute('aria-expanded', 'false');
  S.modeBtn.setAttribute('aria-controls', 'mp-mode-opts');
  S.editBtn = btn('edit', {
    icon: 'move4',
    label: ctx.t(TX.editHelp),
    pressed: false,
    onClick: () => need('edit').then(m => m.setEdit(!S.edit.on), () => ctx.notify?.(ctx.t(TX.saveFailed, {
      m: 'edit.js'
    }), 'err'))
  });
  S.followBtn = btn('follow', {
    icon: 'plane',
    label: ctx.t(TX.followHelp),
    pressed: false,
    onClick: () => {
      closePanels();
      setFollow(!S.follow);
    }
  });
  S.addBtn = btn('add', {
    icon: 'plus',
    label: ctx.t(TX.addPoint),
    pressed: false,
    onClick: () => got('edit')?.setAdding(!S.edit.adding)
  });
  S.undoBtn = btn('undo', {
    icon: 'undo',
    label: ctx.t(TX.undoHelp),
    onClick: () => got('edit')?.undoEdit()
  });
  S.layersBtn = btn('layers', {
    icon: 'layers',
    side: 'left',
    label: ctx.t(ctx.query?.mission ? TX.pick : TX.layers),
    pressed: false,
    onClick: () => toggleLayers()
  });
  S.undoBtn.disabled = true;
  // panneau des modes, dans la couche (elle a la taille de la carte et suit la feuille)
  const layer = ov.right.parentNode,
    tmp = document.createElement('div');
  tmp.innerHTML = modesHtml;
  S.modeOpts = tmp.firstElementChild;
  layer.append(S.modeOpts);
  syncButtons();
}
/** Boutons montrés selon l'état (SPEC § 4) : sans carte (pas de vol, mission vide) seul Couches reste ; une carte de mission
 *  n'a ni la route, ni le mode, ni l'Édition ; en mode Édition seuls Édition, « + », Annuler et Recentrer restent (avec le
 *  plein écran du cadre) ; Suivre seulement pendant un vol démarré et pas arrivé. Écrit seulement ce qui change. */
export function syncButtons() {
  if (!S?.routeBtn) return;
  const on = !!S.boxOn,
    flight = on && !onMission(),
    edit = flight && S.edit.on;
  show(S.fitBtn, on);
  show(S.routeBtn, flight && !edit);
  show(S.modeBtn, flight && !edit);
  show(S.editBtn, flight);
  show(S.followBtn, flight && !edit && isStarted(S.route.flight) && !isArrived(S.route.flight));
  show(S.addBtn, edit);
  show(S.undoBtn, edit);
  if (!flight) closePanels();
}
/** Carte montrée ou état vide (pas de vol, mission sans carte) : les boutons suivent ; sans vol le mode Édition se ferme. */
export function showBox(on) {
  S.boxOn = on;
  if (!(on && !onMission()) && S.edit.on) got('edit')?.setEdit(false);
  syncButtons();
}

// ---------------------------------------------------------------- notes, notifications, état vide
/** Notification flottante dite une fois par montage ; la ligne reste lisible dans les notes de la feuille. */
export function noteOnce(k, text, kind = 'warn') {
  if (S.noted[k]) return;
  S.noted[k] = true;
  S.ctx.notify?.(text, kind);
}
/** Notes de la feuille (SPEC § 7.6) : la progression du vol, puis les manques, puis l'information ; écrites seulement si elles
 *  changent. */
export function writeNotes() {
  const html = [S.progHtml, S.warnHtml, S.softHtml].filter(Boolean).join('');
  if (S.notesEl.innerHTML !== html) S.notesEl.innerHTML = html;
}
/** Ligne de l'état de la base aéronautique « en lecture » (les zones lues entre parenthèses). */
const loadingLine = st => `<p class="f-muted">${esc(tt(TX.loading, { z: st.loading?.length ? ` (${st.loading.join(', ')})` : '' }))}</p>`;
/** État du vol, de la base, de la mission et du fond : l'état vide est une carte posée au milieu de la zone de la carte ; les
 *  manques sont dits une fois par notification et restent dans les notes ; écrits seulement s'ils changent. */
export async function status() {
  if (!S) return;
  const empty = [],
    warn = [];
  if (S.missionError) empty.push(`<p>${esc(S.missionError)}</p>`);
  else if (onMission() && S.mission) {
    if (!S.mission.maps.length) empty.push(`<p class="f-muted">${esc(tt(TX.noMaps))}</p>`);
    if (S.profileSource && S.profileSource !== 'copy') warn.push(`<p class="f-muted">${esc(tt(TX.builtin, {
      p: S.profile?.name || S.profile?.id || ''
    }))}</p>`);
    const cyc = S.mapDef?.cycle,
      now = cyc ? (await S.ctx.aerodb?.status().catch(() => null))?.cycle : null;
    if (!S) return;
    if (cyc && now && cyc !== now) warn.push(`<p class="f-muted">${esc(tt(TX.cycleDiff, {
      a: cyc,
      b: now
    }))}</p>`);
  } else if (!onMission() && !S.route.points.length) empty.push(
    `<p>${esc(tt(TX.noFlight))} <button type="button" class="f-btn" data-go="fuel">${esc(tt(TX.toFuel))}</button></p>`);
  if (!S.missionError && S.route.points.length && S.ctx.aerodb) {
    const a = S.ctx.aerodb,
      read = a.status().catch(() => null), // lance la lecture de la liste publiée (attendue plus bas)
      was = await a.state?.().catch(() => null);
    if (!S) return;
    if (was?.state === 'loading') { // lecture en cours : dite tout de suite, la note change à la fin
      S.warnHtml = [...warn, loadingLine(was)].join('');
      writeNotes();
    }
    const st = await read,
      now = await a.state?.().catch(() => null);
    if (!S) return;
    if (now?.state === 'loading') warn.push(loadingLine(now));
    else if (!st?.published || !Object.keys(st.published).length) {
      // la cause d'abord : accès non réglé ici, hors ligne, sinon la base n'est pas publiée
      const noAccess = now?.state === 'noaccess',
        offline = now?.state === 'offline',
        tx = noAccess ? TX.noAccess : offline ? TX.noZone : TX.noBase,
        go = noAccess ? TX.toAccess : TX.toSettings;
      warn.push(`<p>${esc(tt(tx))} <button type="button" class="f-btn" data-go="settings">${esc(tt(go))}</button></p>`);
      noteOnce(noAccess ? 'noAccess' : offline ? 'offline' : 'noBase', tt(tx));
    } else if (S.data?.empty && navigator.onLine === false) {
      warn.push(`<p>${esc(tt(TX.noZone))} <button type="button" class="f-btn" data-go="settings">${esc(tt(TX.toSettings))}</button></p>`);
      noteOnce('offline', tt(TX.noZone));
    }
  }
  // pour information : fond uni, relief absent (l'état normal hors ligne)
  const soft = [];
  if (S.plain && S.route.points.length) soft.push(`<p>${esc(tt(TX.plain))}</p>`);
  if (S.prof && !S.prof.terrainOk) soft.push(`<p>${esc(tt(TX.noTerrain))}</p>`);
  const html = empty.join('');
  S.warnHtml = warn.join('');
  S.softHtml = soft.join('');
  if (S.stEl.innerHTML !== html) S.stEl.innerHTML = html;
  show(S.stEl, !!html);
  writeNotes();
}
/** Résumé du vol (ou de la carte de mission) : titre de la poignée devant un dessin, la ligne entière en infobulle (SPEC
 *  § 7.2) ; écrit seulement s'il change. */
export function header() {
  let text, tip;
  if (onMission()) {
    const m = S.mapDef;
    text = tip = [S.mission?.id, S.mission?.title, m ? m.description || m.file : ''].filter(Boolean).join(' · ');
  } else {
    const f = S.route.flight,
      r = f?.route || {},
      lvl = S.route.levelFt ? level(S.route.levelFt) : '',
      // la distance du chemin volé (route et procédures choisies), la même que celle du profil
      d = S.route.flown?.length > 1 ? S.route.flown.at(-1).nm : S.route.points.length >= 2 ? MapsRender.distances(S.route.points).pop() : 0,
      state = S.route.points.length ? tt(isStarted(f) ? TX.stFlying : TX.stPlanned) : '',
      ends = r.dep || r.arr ? tt(TX.summary, {
        dep: r.dep || '?',
        arr: r.arr || '?'
      }) : '',
      dist = d ? tt(TX.dist, {
        d: Math.round(d)
      }) : '';
    // une ligne de téléphone : niveau, distance, état ; départ → arrivée, dégagement et appareil en infobulle
    text = [lvl, dist, state].filter(Boolean).join(' · ');
    tip = [ends, r.altn ? tt(TX.altn, {
      a: r.altn
    }) : '', lvl, dist, f?.aircraft?.type || '', state].filter(Boolean).join(' · ');
  }
  if (S.sum === text && S.sumTip === tip) return;
  S.sum = text;
  S.sumTip = tip;
  dataHead();
}
/** Ancre de l'aide en ligne pour ce qui est montré (SPEC § 4), lue par le « ? » de l'en-tête du cadre. */
export function helpAnchor() {
  if (!S) return null;
  if (S.edit.on) return 'maps-edit';
  const k = S.dpanel;
  if (k === 'layers') return 'maps-layers';
  if (k === 'weather') return 'maps-weather';
  if (k === 'lv') return 'maps-airspaces';
  if (k === 'ad') return 'maps-vfr';
  if (!k && S.prof && S.axw?.zoomed) return 'maps-profile-zoom';
  if (isStarted(S.route.flight)) return 'maps-started';
  return null;
}

// ---------------------------------------------------------------- caméra et fond MapLibre
/** Cadre la carte sur le vol : le seul mouvement de caméra du module avec « Suivre », marqué pour ne pas passer pour celui de
 *  l'utilisateur. */
export function fitMap(animate) {
  S.selfMove = true;
  S.map.once('moveend', () => {
    if (S) S.selfMove = false;
  });
  S.map.fitBounds([
    [S.fit.w, S.fit.s],
    [S.fit.e, S.fit.n]
  ], {
    padding: 12,
    animate
  });
  if (!animate) S.selfMove = false;
}
/** Fond MapLibre sur l'emprise du vol (lib/map_base.js) ; false s'il ne vient pas (pas de réseau, pas de WebGL, hôte
 *  refusé, délai dépassé) : le fond uni le remplace. */
export async function startTiles() {
  const map = await baseTiles(S.mapEl, {
    style: styleFor(),
    bounds: [
      [S.fit.w, S.fit.s],
      [S.fit.e, S.fit.n]
    ],
    padding: 12,
    worldCopies: true, // une route de 177° à 195° : la vue passe la ligne de changement de date
    // la mention des sources de MapLibre, repliée (« i ») : celle du SIA s'y ajoute, un seul texte de crédit
    attributionControl: {
      compact: true,
      customAttribution: tt(TX.credit)
    },
    alive: () => !!S,
    onCreate: m => S.mapNew = m,
    onStyleLoad: map => {
      if (S?.map !== map) return;
      mapBase(map);
      mapSize();
      relief();
      // nouveau style : ses couches de noms de lieux sont à relever et à régler de nouveau
      S.placeIds = null;
      S.placeOff = null;
      baseNames(S.placeWant);
    },
    onLoad: map => {
      S.map = map;
      S.mapNew = null;
      mapBase(map);
      mapSize(); // le cadre a pu changer de taille pendant le chargement des tuiles
      relief();
      map.on('move', schedule);
      map.on('moveend', schedule);
      map.on('click', e => S && tapAt(e.point.x, e.point.y, e.lngLat.lat, e.lngLat.lng));
      // survol à la souris seulement (les événements souris qui suivent un toucher sont ignorés)
      map.on('mousemove', e => {
        if (S && !fromTouch(e.originalEvent)) hoverMap(e.point.x, e.point.y);
      });
      map.on('mouseout', e => {
        if (!S || fromTouch(e.originalEvent)) return;
        linger('map');
        previewAd(null);
      });
      map.on('movestart', () => {
        hideTips();
        // un mouvement qui n'est ni un cadrage du module ni la remise à taille : celui de l'utilisateur, sa caméra est gardée
        if (S && !S.selfMove && !isOwnResize(map)) {
          S.userMoved = true;
          if (S.follow) setFollow(false);
        }
      });
    }
  });
  if (S) S.mapNew = null;
  return !!map;
}

// ---------------------------------------------------------------- design, ton, nuit
/** Design, ton ou thème du système changés : jetons relus, fond de nuit ou de jour, tout redessiné. L'observateur des
 *  attributs de <html> réagit à l'événement et n'écrit rien dans la page. Rend la fonction d'arrêt. */
export function watchTheme() {
  const onTheme = () => {
    if (!S) return;
    const t = MapsRender.tokens();
    if (JSON.stringify(t) === JSON.stringify(S.theme)) return;
    const night = t.dark !== S.theme.dark;
    S.theme = t;
    if (night && S.map) S.map.setStyle(styleFor());
    drawProfile();
    redrawSheet();
    schedule();
  };
  const mq = matchMedia('(prefers-color-scheme: dark)'),
    mo = new MutationObserver(onTheme);
  mq.addEventListener('change', onTheme);
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-design', 'data-tone']
  });
  return () => {
    mq.removeEventListener('change', onTheme);
    mo.disconnect();
  };
}
