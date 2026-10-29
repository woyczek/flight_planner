// V3 maps — modes de carte, seuils de zoom et contenu « Couches » (modules/maps/SPEC.md § 6.1, § 6.6, § 6.7) : le profil
// d'affichage de chaque mode, affiné par la compagnie (airline/map_profiles.json) et par l'appareil (cache/maps/ui.json),
// les couches cochées par mode, le curseur de Complexité, le panneau des modes dans la couche de superposition du cadre.

import {
  S,
  esc,
  tt,
  setLabel,
  setPressed,
  got
} from './state.js';
import {
  svg
} from '../../frame/lib/icons.js';
import {
  TX
} from './texts.js';
import {
  schedule,
  relief
} from './draw.js';
import {
  saveUi
} from './data.js';
import {
  buildProfile
} from './profile_view.js';
import {
  openData,
  endData
} from './sheet_view.js';
import {
  releaseAd
} from './vfr.js';
import {
  styleFor
} from './screen.js';
import {
  covAvail,
  covShown,
  covTouch
} from './coverage.js';

// ---------------------------------------------------------------- modes
/** Modes de carte : [clé, icône, classe du choix] (SPEC § 6.1). */
export const MODES = [
  ['auto', `<span class="mp-ic">${svg('wand-sparkles')}</span>`, ''],
  ['low', '<span class="mp-ifr mp-ceil" aria-hidden="true">IFR</span>', ''],
  ['high', '<span class="mp-ifr mp-floor" aria-hidden="true">IFR</span>', ''],
  ['vfr', `<span class="mp-ic">${svg('map')}</span>`, ''],
  ['topo', '<span class="mp-topo" aria-hidden="true"><span></span><span></span><span></span><span></span></span>', ''],
  ['cam', `<span class="mp-ic mp-ic-cam">${svg('plane')}</span>`, ' mp-mil']
];
/** Nom d'un mode (infobulle, aria-label) : son aide, précédée de son nom pour Auto. */
export const modeTitle = (ctx, k) => k === 'auto' ? ctx.t(TX.pair, {
  a: ctx.t(TX.presets[k]),
  b: ctx.t(TX.modeHelp[k])
}) : ctx.t(TX.modeHelp[k]);
/** Familles de modes pour les seuils de la compagnie (repoZoom). */
const IFR_MODES = ['auto', 'low', 'high', 'cam'],
  VFR_MODES = ['vfr', 'topo'];

/** Seuils de zoom que la compagnie a réglés pour un mode : { zoom, from } (from : le mode dont ils viennent) ; un mode jamais
 *  réglé reprend ceux d'un autre mode de sa famille, puis, pour un mode IFR, ceux de la famille VFR ; null : rien de réglé. */
export function repoZoom(mode) {
  const P = S.repoProfiles,
    own = m => P?.[m]?.elements?.zoom && typeof P[m].elements.zoom === 'object' ? P[m].elements.zoom : null,
    fam = VFR_MODES.includes(mode) ? VFR_MODES : IFR_MODES,
    order = [mode, ...fam.filter(m => m !== mode), ...(fam === IFR_MODES ? VFR_MODES : [])],
    from = order.find(own);
  return from ? {
    zoom: own(from),
    from
  } : null;
}
/** Profil d'un mode affiné par la compagnie (profiles[mode] au format profile_def du studio) posé sur le profil intégré :
 *  champs remplacés, éléments fusionnés, seuils propres au mode ou repris (repoZoom). */
function withRepo(B) {
  const own = S.repoProfiles?.[S.preset],
    zoom = repoZoom(S.preset)?.zoom;
  if ((!own || typeof own !== 'object') && !zoom) return B;
  const O = own && typeof own === 'object' ? own : {};
  return {
    ...B,
    ...O,
    id: B.id,
    elements: {
      ...(B.elements || {}),
      ...(O.elements || {}),
      zoom: {
        ...(B.elements?.zoom || {}),
        ...(zoom || {})
      }
    }
  };
}
/** Seuils de zoom MapLibre de départ [visible à partir de, jusqu'à] de chaque élément, par famille de modes (SPEC § 6.6). */
const ZOOM_IFR = {
    asFir: [0, 24],
    asTma: [0, 24],
    asCta: [0, 24],
    asCtr: [4.75, 24],
    asR: [0, 24],
    asD: [4.75, 24],
    asP: [5.25, 24],
    asTsa: [0, 24],
    asOther: [5.5, 24],
    zoneLabels: [4.75, 24],
    awLow: [5, 24],
    awHigh: [5, 24],
    awLabels: [7.75, 24],
    navaids: [5.75, 24],
    fixes: [5.75, 24],
    vrp: [9.25, 24],
    obstacles: [8.5, 24],
    mora: [5.5, 24],
    citiesBig: [0, 24],
    citiesMid: [6.5, 24],
    citiesSmall: [8.5, 24],
    graticule: [0, 24],
    aar: [0, 24],
    nat: [0, 24],
    wind: [0, 24],
    contours: [9, 24],
    // procédures choisies (utilisateur, 29 octobre : « ils disparaissent trop tôt en zoom arrière, c'est une info hyper
    // importante ») : leurs noms à toutes les échelles, leurs points et contraintes dès la vue régionale (≈ 110 px par degré)
    procNames: [0, 24],
    procCons: [6.25, 24]
  },
  ZOOM_VFR = {
    ...ZOOM_IFR,
    asFir: [0, 7],
    asTma: [6, 24],
    asCta: [6, 24],
    asCtr: [7, 24],
    asR: [6.5, 24],
    asD: [6.5, 24],
    asP: [7.5, 24],
    asTsa: [6.5, 24],
    asOther: [8, 24],
    zoneLabels: [6, 24]
  };
/** Clés des seuils, dans l'ordre de la page de réglage. */
export const ZOOM_KEYS = Object.keys(ZOOM_IFR);
/** Seuils de départ d'un mode (copie). */
export const zoomDefaults = mode => structuredClone(VFR_MODES.includes(mode) ? ZOOM_VFR : ZOOM_IFR);
/** Profil du mode courant, sans ses seuils (SPEC § 6.1). */
function modeProfile() {
  if (S.preset === 'vfr') {
    // VFR détaillé du studio sur fond topographique, plus les balises, la densité VFR et les FIR (vues de loin)
    const p = structuredClone(window.MAPS_PROFILES.find(x => x.id === 'vfr-detail') || MapsRender.routeProfile(0));
    return {
      ...p,
      zones: [...new Set([...(p.zones || []), 'FIR'])],
      base: 'ofm-liberty',
      elements: {
        ...p.elements,
        navaids: true,
        vfrDensity: true,
        zoneCeil: p.elements?.zoneCeil || '19500'
      }
    };
  }
  if (S.preset === 'topo') {
    // relief ombré sur fond topographique, surcouche minimale : terrains, villes, obstacles de près
    const p = MapsRender.routeProfile(0);
    return {
      ...p,
      id: 'v3-topo',
      base: 'ofm-liberty',
      hillshade: true,
      cities: true,
      zones: [],
      corridorNm: 0,
      elements: {
        ...p.elements,
        airwaysLow: false,
        airwaysHigh: false,
        navaids: false,
        mora: false,
        graticule: false,
        obstacles: true,
        agglos: true,
        vfrDensity: true
      }
    };
  }
  if (S.preset === 'cam') {
    // vol militaire : l'IFR du niveau du vol, plus R / D / P, TSA / TRA / CBA, le réseau très basse altitude à tous les
    // niveaux et les terrains d'État
    const p = MapsRender.routeProfile(S.route.levelFt);
    return {
      ...p,
      id: 'v3-cam',
      zones: [...new Set([...p.zones, 'TSA', 'CBA', 'PJE'])],
      elements: {
        ...p.elements,
        zoneFloor: '',
        zoneCeil: '',
        adState: true
      }
    };
  }
  return MapsRender.routeProfile(S.preset === 'low' ? 5000 : S.preset === 'high' ? 30000 : S.route.levelFt);
}
/** Profil intégré du mode courant, seuils de départ compris. */
export function builtinProfile() {
  const p = modeProfile();
  return {
    ...p,
    elements: {
      ...(p.elements || {}),
      zoom: zoomDefaults(S.preset)
    }
  };
}
/** Profil d'affichage du vol : le mode courant affiné par la compagnie. */
const flightProfile = () => withRepo(builtinProfile());

// ---------------------------------------------------------------- couches
/** Familles d'espaces des couches ; « autres » : tout type hors de ces trois listes (SPEC § 6.7). */
const AS_GROUPS = {
  asTma: ['TMA', 'CTR', 'CTA', 'TMZ', 'RMZ', 'RMZ-TMZ'],
  asDrp: ['R', 'D', 'P', 'TRA', 'TSA', 'CBA', 'PJE', 'TRVL', 'TRPVL', 'ZIT'],
  asFir: ['FIR', 'UIR', 'UTA', 'LTA', 'OCA', 'FRA']
};
/** Cases du contenu Couches, dans l'ordre de la SPEC § 6.7 (« Autour de la route seulement » en dernier). */
const LAYER_KEYS = ['asTma', 'asDrp', 'asFir', 'asOther', 'zoneLabels', 'awLow', 'awHigh', 'awLabels', 'navaids', 'fixes', 'vrp',
  'obstacles', 'mora', 'cities', 'graticule', 'altn', 'aar', 'nat', 'wind', 'contours', 'cov', 'corridor'
];
/** Couche du contenu Couches qui commande chaque ligne de la page de réglage (une famille d'espaces : une seule case). */
export const LAYER_OF = {
  asFir: 'asFir',
  asTma: 'asTma',
  asCta: 'asTma',
  asCtr: 'asTma',
  asR: 'asDrp',
  asD: 'asDrp',
  asP: 'asDrp',
  asTsa: 'asDrp',
  asOther: 'asOther',
  zoneLabels: 'zoneLabels',
  awLow: 'awLow',
  awHigh: 'awHigh',
  awLabels: 'awLabels',
  navaids: 'navaids',
  fixes: 'fixes',
  vrp: 'vrp',
  obstacles: 'obstacles',
  mora: 'mora',
  citiesBig: 'cities',
  citiesMid: 'cities',
  citiesSmall: 'cities',
  graticule: 'graticule',
  aar: 'aar',
  nat: 'nat',
  wind: 'wind',
  contours: 'contours'
};
/** Famille de couches d'un type d'espace. */
export const groupOf = t => Object.keys(AS_GROUPS).find(g => AS_GROUPS[g].includes(String(t || '').toUpperCase())) || 'asOther';
/** Couches de départ d'un profil d'affichage (une famille est cochée quand le profil nomme un de ses types). */
export function layerDefaults(B) {
  const E = k => !!MapsRender.elementOf(B, k),
    zones = new Set((B.zones || []).map(z => String(z).toUpperCase()));
  return {
    corridor: +B.corridorNm > 0,
    asTma: AS_GROUPS.asTma.some(t => zones.has(t)),
    asDrp: AS_GROUPS.asDrp.some(t => zones.has(t)),
    asFir: AS_GROUPS.asFir.some(t => zones.has(t)),
    asOther: false,
    awLow: E('airwaysLow'),
    awHigh: E('airwaysHigh'),
    navaids: E('navaids'),
    fixes: E('airwaysLow') || E('airwaysHigh'),
    vrp: E('vrpPoints'),
    obstacles: E('obstacles'),
    mora: E('mora'),
    cities: !!B.cities || E('agglos'),
    graticule: E('graticule'),
    altn: true,
    // axes AAR et tracks NAT : d'origine en CAM seulement
    aar: B.id === 'v3-cam',
    nat: B.id === 'v3-cam',
    wind: true,
    // couche « Procédures » (couverture des terrains) : éteinte d'origine, allumée d'elle-même par la Carte (coverage.js)
    cov: false,
    // courbes de niveau : modes à densité VFR (VFR, Topo), de près
    contours: !!MapsRender.elementOf(B, 'vfrDensity'),
    zoneLabels: E('zoneLabelsShow'),
    awLabels: MapsRender.elementOf(B, 'awLabels') !== false,
    detail: 0
  };
}
/** Couches de départ du mode : celles du profil, puis celles que la compagnie a enregistrées (profiles[mode].layers). */
export const baseLayers = () => ({
  ...layerDefaults(flightProfile()),
  ...(S.repoProfiles?.[S.preset]?.layers || {})
});
/** Couches du mode courant : celles de départ, puis les choix gardés sur cet appareil. */
export const layersNow = () => ({
  ...baseLayers(),
  ...(S.layers?.[S.preset] || {})
});
/** Cran du curseur de Complexité du mode (−4 à +4 ; une valeur plus ancienne est ramenée dans les bornes). */
export const detailShift = () => Math.max(-4, Math.min(4, Math.round(+layersNow().detail || 0)));
/** Profil effectif du vol : celui du mode, couches appliquées (éléments, familles d'espaces, autres types, couloir) et seuils
 *  dans l'ordre : intégrés, compagnie, appareil, réglage en cours (SPEC § 6.6). */
export function effectiveProfile() {
  const B = flightProfile(),
    L = layersNow(),
    P = structuredClone(B),
    E = P.elements ||= {};
  Object.assign(E, {
    airwaysLow: L.awLow,
    airwaysHigh: L.awHigh,
    navaids: L.navaids,
    fixes: L.fixes,
    vrpPoints: L.vrp,
    obstacles: L.obstacles,
    mora: L.mora,
    graticule: L.graticule,
    agglos: L.cities && !!MapsRender.elementOf(B, 'agglos'),
    aarTracks: L.aar,
    natTracks: L.nat,
    zoneLabelsShow: L.zoneLabels,
    awLabels: L.awLabels
  });
  if (L.vrp) E.vrpLabels = true;
  P.cities = L.cities;
  P.zones = Object.keys(AS_GROUPS).filter(g => L[g]).flatMap(g => AS_GROUPS[g]);
  P.otherZones = L.asOther; // types hors familles : ajoutés à la lecture (data.js)
  P.corridorNm = L.corridor ? +B.corridorNm || 10 : 0;
  E.zoom = {
    ...(E.zoom || {}),
    ...(S.layers?.[S.preset]?.zoom || {}),
    ...(S.tuneZoom?.[S.preset] || {})
  };
  return P;
}
/** Profil refait après un changement de couche, de mode ou de réglage : données relues, carte et profil vertical redessinés. */
export function reprofile() {
  S.profile = effectiveProfile();
  S.data = null;
  if (S.dpanel === 'layers') fillLayers();
  schedule();
  buildProfile();
}
/** Une couche changée (key null : toutes remises) : gardée par mode sur cet appareil, seulement si elle diffère de la valeur
 *  de départ ; keep : les choix sont déjà posés (page de réglage). */
export function setLayer(key, value, keep = false) {
  const all = S.layers ||= {};
  if (keep);
  else if (key == null) delete all[S.preset];
  else {
    const own = all[S.preset] ||= {};
    if (baseLayers()[key] === value) delete own[key];
    else own[key] = value;
    if (!Object.keys(own).length) delete all[S.preset];
  }
  saveUi();
  if (key === 'cov') { // la couche n'entre pas dans le profil d'affichage : ni données relues ni profil refait
    schedule();
    return got('tune')?.tuneVis();
  }
  reprofile();
  got('tune')?.tuneVis();
}
/** Mode choisi : gardé sur l'appareil, profil, données, fond (style du mode, relief), profil vertical refaits. */
export async function setPreset(v) {
  S.preset = v;
  saveUi();
  const before = styleFor();
  reprofile();
  if (S.map && styleFor() !== before) S.map.setStyle(styleFor()); // relief posé au chargement du style
  else relief();
  fillModes();
}

// ---------------------------------------------------------------- le contenu « Couches » de la feuille
/** HTML du contenu Couches (SPEC § 6.7) : Complexité d'abord, puis les cases et « Tout remettre », le choix du vol en dernier ;
 *  sur une carte de mission, le choix seul. Construit une fois au montage, gardé (les cases gardent leur focus). */
export function layersHtml(ctx) {
  const mission = !!ctx.query?.mission,
    name = ctx.t(mission ? TX.pick : TX.layers);
  return `<div class="mp-layers" role="group" aria-label="${esc(name)}">
<div class="mp-layer-set"${mission ? ' hidden' : ''}>
<label class="mp-l-detail" title="${esc(ctx.t(TX.detailHelp))}">${esc(ctx.t(TX.detail))} <span data-detail-v></span><input type="range" min="-4" max="4" step="1" data-layer="detail" aria-describedby="mp-detail-help"></label>
<span id="mp-detail-help" class="f-muted mp-l-help">${esc(ctx.t(TX.detailHelp))}</span>
${LAYER_KEYS.filter(k => k !== 'cov' || covAvail()).map(k => `<label${k === 'corridor' ? ' class="mp-l-main"' : ''}><input type="checkbox" data-layer="${k}"> ${esc(ctx.t(TX.layerNames[k]))}</label>`).join('')}
<button type="button" class="f-btn" data-layers-reset>${esc(ctx.t(TX.layersReset))}</button></div>
<div class="mp-picks"><select class="mp-pick" aria-label="${esc(ctx.t(TX.pick))}"></select>
<select class="mp-mappick" hidden aria-label="${esc(ctx.t(TX.mapOf))}"></select></div></div>`;
}
/** Cases et curseur du contenu selon les couches du mode ; écrits seulement s'ils changent. */
export function fillLayers() {
  const L = layersNow();
  for (const c of S.layersEl.querySelectorAll('input[data-layer]')) {
    if (c.type === 'range') {
      const max = String(MapsRender.DETAIL_MAX),
        v = String(detailShift());
      if (c.max !== max) {
        c.max = max;
        c.min = `-${max}`;
      }
      if (c.value !== v) c.value = v;
      const out = S.layersEl.querySelector('[data-detail-v]'),
        t = +v > 0 ? `+${v}` : v;
      if (out && out.textContent !== t) out.textContent = t;
      continue;
    }
    const v = c.dataset.layer === 'cov' ? covShown() : !!L[c.dataset.layer]; // la case de la couche dit ce qui est montré
    if (c.checked !== v) c.checked = v;
  }
}
/** Contenu Couches ouvert dans la feuille (ou fermé) : titre « Couches · <vol> », la croix ramène le profil ; le bouton de la
 *  colonne de gauche est pressé tant qu'il est ouvert. Un seul contenu à la fois : un terrain épinglé est relâché. */
export function toggleLayers(open = S.dpanel !== 'layers') {
  if (!open) return endData('layers');
  if (S.dpanel === 'layers') return;
  releaseAd();
  fillLayers();
  const name = tt(S.mission || S.ctx.query?.mission ? TX.pick : TX.layers);
  openData('layers', 'layers', name, (w, h, el) => {
    if (S.layersEl.parentNode !== el) el.replaceChildren(S.layersEl);
  }, name);
}
/** Gestes du contenu Couches : une case au changement, la Complexité à chaque cran (la carte suit le doigt), « Tout
 *  remettre ». */
export function layersEvents() {
  S.layersEl.addEventListener('change', e => {
    const c = e.target.closest('input[data-layer]');
    if (c && c.type !== 'range') {
      if (c.dataset.layer === 'cov') covTouch(); // son choix l'emporte sur l'allumage automatique, pour la vie de la page
      setLayer(c.dataset.layer, c.checked);
    }
  });
  S.layersEl.addEventListener('input', e => {
    const c = e.target.closest('input[type="range"][data-layer]');
    if (c) setLayer(c.dataset.layer, Math.round(+c.value));
  });
  S.layersEl.addEventListener('click', e => {
    if (e.target.closest('[data-layers-reset]')) setLayer(null);
  });
}

// ---------------------------------------------------------------- le panneau des modes (couche de superposition)
/** HTML du panneau des modes : six boutons icône, le mode courant pressé. */
export const modesHtml = ctx => `<div id="mp-mode-opts" class="mp-mode-opts" role="group" aria-label="${esc(ctx.t(TX.modes))}" hidden>${MODES.map(([k, icon, cls]) => `<button type="button" class="mp-choice${cls}" data-mode="${k}" aria-pressed="false" aria-label="${esc(modeTitle(ctx, k))}" title="${esc(modeTitle(ctx, k))}">${icon}</button>`).join('')}</div>`;
/** Bouton du mode (icône du mode courant, son nom) et choix pressé ; écrit seulement ce qui change. */
export function fillModes() {
  const icon = (MODES.find(m => m[0] === S.preset) || MODES[0])[1];
  if (S.modeBtn.innerHTML !== icon) S.modeBtn.innerHTML = icon;
  setLabel(S.modeBtn, tt(TX.pair, {
    a: tt(TX.preset),
    b: tt(TX.modeHelp[S.preset] || TX.modeHelp.auto)
  }));
  if (S.modeBtn.classList.contains('mp-mil') !== (S.preset === 'cam')) S.modeBtn.classList.toggle('mp-mil');
  for (const b of S.modeOpts.querySelectorAll('[data-mode]')) setPressed(b, b.dataset.mode === S.preset);
}
/** Panneau des modes ouvert ou fermé : à gauche du bouton du mode, à sa hauteur, placé à l'ouverture (la colonne a pu passer
 *  sur deux, la carte être basse) dans la couche de superposition, qui a la taille de la carte. */
export function toggleModes(open = S.modeOpts.hidden) {
  if (S.modeOpts.hidden === !open) return;
  S.modeOpts.hidden = !open;
  S.modeBtn.setAttribute('aria-expanded', String(open));
  if (!open) return;
  const b = S.modeBtn.getBoundingClientRect(),
    r = (S.modeOpts.offsetParent || S.box).getBoundingClientRect(),
    h = S.modeOpts.offsetHeight,
    right = Math.round(r.right - b.left + 8);
  S.modeOpts.style.right = `${right}px`;
  S.modeOpts.style.maxWidth = `${Math.max(120, Math.round(r.width - right - 8))}px`;
  S.modeOpts.style.top = `${Math.round(Math.max(8, Math.min(b.top - r.top, r.height - h - 8)))}px`;
}
/** Panneau des modes fermé (un autre geste de la carte ou de la feuille). */
export function closePanels() {
  if (S.modeOpts && !S.modeOpts.hidden) toggleModes(false);
}
