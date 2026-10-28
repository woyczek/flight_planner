// V3 maps — la feuille sous la carte (modules/maps/SPEC.md § 7) : la primitive du cadre (frame/lib/sheet.js) et ce qu'elle
// porte — la ligne d'en-tête (nue ou titrée), les trois puces Profil · Météo · « i », la légende, un contenu à la fois
// (profil, coupe, Couches, espaces d'un point, terrain), sa fermeture, la touche Échap, la taille arrêtée (onSettle).

import {
  S,
  keep,
  tt,
  esc,
  show,
  setPressed,
  setOff,
  got
} from './state.js';
import {
  createSheet
} from '../../frame/lib/sheet.js';
import {
  TX
} from './texts.js';
import {
  schedule,
  mapSize
} from './draw.js';
import {
  fitMap
} from './screen.js';
import {
  drawProfile,
  winSync
} from './profile_view.js';
import {
  toggleModes
} from './layers.js';
import {
  hideTips
} from './tips.js';
import {
  showLv
} from './lv.js';
import {
  unpinAd
} from './vfr.js';
import {
  canWeather,
  showWeather,
  redrawWeather,
  legendRows as weatherRows
} from './weather.js';

/** Positions de la feuille, dans l'ordre de la primitive. */
const SHEET_POS = ['collapsed', 'default', 'expanded'];
/** Le dessin montré : 'weather', 'profile' ou null (un contenu). */
const drawingShown = () => S.dpanel === 'weather' ? 'weather' : !S.dpanel && S.prof ? 'profile' : null;

/** Libellé de la poignée (infobulle, lecteur d'écran) : sur une poignée nue, quel dessin c'est et le résumé du vol, puis la
 *  hauteur de la feuille et sa position. */
const gripLabel = p => `${S?.bare ? [S.bare, S.sum].filter(Boolean).join(' · ') + ' · ' : ''}${tt(TX.sheetSize)} (${tt(TX.sheetNames[Math.max(0, SHEET_POS.indexOf(p))])})`;

/** La feuille du cadre posée sur la racine (SPEC § 7.1) : position gardée le temps de la page, verrouillée sur la page de
 *  réglage, en-tête refait à chaque position atteinte, taille arrêtée (onSettle). */
export function makeSheet(el) {
  el.classList.add('f-sheet');
  return createSheet({
    root: el,
    panel: S.dataEl,
    head: S.dheadEl,
    grip: S.gripEl,
    pos: keep.sheet,
    ignore: '[data-dclose], .mp-chips',
    labels: p => gripLabel(p),
    locked: () => el.classList.contains('mp-tuning'),
    onChange: p => {
      keep.sheet = p;
      dataHead(); // nue sur un dessin à la position par défaut seulement
    },
    onSettle: onSheetSettled
  });
}
/** Taille arrêtée de la feuille et de la carte (fin d'un glissement, rotation, plein écran, volet) : le fond MapLibre reprend
 *  la taille du cadre, la route est recadrée tant que l'utilisateur n'a pas bougé la carte, tout est redessiné (SPEC § 7.5) ;
 *  rien si les tailles sont celles du dernier passage. */
function onSheetSettled() {
  if (!S) return;
  const key = [S.box, S.dbodyEl, S.profBox].map(e => `${e.clientWidth}x${e.clientHeight}`).join(' ') +
    ` ${S.sh.pos} ${document.documentElement.classList.contains('f-land')}`;
  if (key === S.settledKey) return;
  S.settledKey = key;
  mapSize();
  if (S.map && S.fit && !S.userMoved && S.route.points.length) fitMap(false);
  schedule();
  dataHead();
  drawProfile();
  if (S.dpanel === 'lv') showLv();
  else redrawSheet();
}

// ---------------------------------------------------------------- légende
/** Lignes de la légende du dessin montré : ce qui est réellement dessiné, avec son symbole (SPEC § 7.3) — pour le profil,
 *  geo.drawn de la coupe et ce que la feuille ajoute ; pour la coupe, la légende qu'Atmosphère rend. [[symbole, texte]]. */
function legendRows(view) {
  if (view === 'weather') return weatherRows();
  const sw = (k, c = '') => `<i class="mp-lg-sw mp-lg-${k}" style="--c:${c}"></i>`,
    d = S.geo?.drawn;
  if (!d) return [];
  const rows = [];
  if (d.plan) rows.push([sw('line', '#6a1b9a'), esc(tt(TX.lgPlan))]);
  if (d.tocTod) rows.push([sw('diamond', '#6a1b9a'), esc(tt(TX.lgToc))]);
  if (d.terrain) rows.push([sw('relief', '#b08a5a'), esc(tt(TX.lgTerrain))]);
  if (d.mora) rows.push([sw('dash', '#8b2d18'), esc(tt(TX.lgMora))]);
  for (const [type, col] of d.zones) rows.push([sw('band', col), `<b>${esc(type)}</b> ${esc(tt(TX.lgZone))}`]);
  if (d.marks) rows.push([sw('vdash', '#17202a'), esc(tt(TX.lgPoints))]);
  if ((S.marks || []).length) rows.push([sw('tick', '#8e24aa'), esc(tt(TX.lgNm))]);
  if (S.lgFixes) rows.push([sw('tri', S.theme?.fg || '#17202a'), esc(tt(TX.lgFixes))]);
  return rows;
}
/** Puce « i » et panneau de légende : la puce est toujours là, désactivée tant que le dessin n'a pas de légende ; le panneau
 *  couvre le dessin ; écrits seulement s'ils changent. */
export function legendSync() {
  if (!S?.legendBtn) return;
  const view = drawingShown(),
    rows = view ? legendRows(view) : [],
    can = rows.length > 0,
    on = !!S.legend && can,
    html = on ? `<ul>${rows.map(([k, t]) => `<li>${k}<span>${t}</span></li>`).join('')}</ul>` : '';
  setOff(S.legendBtn, !can);
  setPressed(S.legendBtn, on);
  show(S.legendEl, on);
  if (S.legendEl.innerHTML !== html) S.legendEl.innerHTML = html;
}

// ---------------------------------------------------------------- en-tête et contenus
/** En-tête de la feuille (SPEC § 7.2) : nu (poignée et puces) devant un dessin à la position par défaut hors colonne paysage,
 *  titré sinon ; les trois puces devant un dessin, la croix devant un contenu ; la feuille absente sans profil ni contenu.
 *  Écrit seulement ce qui change. */
export function dataHead() {
  if (!S?.dataEl) return;
  const view = drawingShown(),
    wx = view === 'weather',
    has = !!S.dpanel || !!S.prof,
    bare = view && keep.sheet === 'default' && !document.documentElement.classList.contains('f-land') ? tt(wx ? TX.wxTitle : TX
      .dataProfile) : '',
    own = !!S.dpanel && !wx, // contenu ouvert par openData : son titre
    lay = S.dpanel === 'layers', // « Couches · <vol> » : le contexte comme le profil
    title = own && !lay ? S.dtitle : [lay ? S.dtitle : tt(wx ? TX.ttlWeather : TX.ttlProfile), S.sum].filter(Boolean).join(' · '),
    tip = own && !lay ? S.dlabel : [lay ? S.dlabel : wx ? S.dlabel : tt(TX.dataProfile), S.sumTip].filter(Boolean).join(' · ');
  show(S.dataEl, has);
  setPressed(S.layersBtn, lay);
  if (S.bare !== bare) {
    S.bare = bare;
    S.dheadEl.classList.toggle('f-sheet-head-bare', !!bare);
  }
  const label = gripLabel(keep.sheet);
  if (S.gripEl.title !== label) S.gripEl.title = label;
  if (S.gripEl.getAttribute('aria-label') !== label) S.gripEl.setAttribute('aria-label', label);
  if (S.dtitleEl.textContent !== (bare ? '' : title)) S.dtitleEl.textContent = bare ? '' : title;
  if (S.dtitleEl.title !== (bare ? '' : tip)) S.dtitleEl.title = bare ? '' : tip;
  show(S.dcloseEl, own);
  show(S.segEl, !own);
  for (const b of S.segBtns) {
    setPressed(b, (b.dataset.view === 'weather') === wx);
    setOff(b, b.dataset.view === 'weather' ? !canWeather() : !S.prof); // jamais retirée : désactivée sans objet
  }
  legendSync();
  winSync();
}
/** Ouvre ou remplace le contenu de la feuille (SPEC § 7.4) : une autre clé ouvre un contenu neuf (en haut), la même le
 *  redessine (défilement gardé) ; build(w, h, el) rend le HTML (écrit seulement s'il change) ou dessine dans el. Un contenu
 *  neuf ouvre une feuille repliée à sa position par défaut, sans glissement. */
export function openData(kind, key, title, build, label = title) {
  const fresh = S.dkey !== key;
  if (fresh && S.sh.pos === 'collapsed') S.sh.set('default', true);
  S.dpanel = kind;
  S.dkey = key;
  S.dtitle = title;
  S.dlabel = label;
  show(S.dprofEl, false);
  show(S.dbodyEl, true);
  if (S.dbodyEl.dataset.kind !== kind) S.dbodyEl.dataset.kind = kind;
  if (S.dbodyEl.getAttribute('aria-label') !== label) S.dbodyEl.setAttribute('aria-label', label);
  if (fresh) {
    S.dhtml = '';
    S.dbodyEl.textContent = '';
  }
  dataHead(); // d'abord : la ligne nue ou titrée fixe la hauteur que le contenu va prendre
  const html = build(S.dbodyEl.clientWidth || 360, S.dbodyEl.clientHeight || 200, S.dbodyEl);
  if (typeof html !== 'string') S.dhtml = null; // le constructeur a dessiné lui-même dans la zone
  else if (S.dhtml !== html) {
    S.dhtml = html;
    S.dbodyEl.innerHTML = html;
  }
  if (fresh) S.dbodyEl.scrollTop = 0;
  legendSync();
  winSync();
}
/** Contenu fermé (kind : seulement s'il est de ce genre) ; le profil revient, redessiné à sa taille — ou la coupe, si c'est
 *  elle que l'utilisateur avait choisie avant d'ouvrir ce contenu. */
export function endData(kind = null) {
  if (!S?.dpanel || (kind && S.dpanel !== kind)) return;
  const back = S.dpanel !== 'weather' && keep.view === 'weather' && canWeather();
  S.dpanel = null;
  S.dkey = null;
  S.dhtml = '';
  if (back) return showWeather();
  show(S.dbodyEl, false);
  S.dbodyEl.textContent = '';
  show(S.dprofEl, true);
  drawProfile();
  dataHead();
}
/** Fermeture voulue (✕, Échap) : le contenu quel qu'il soit ; la coupe ferme sur le profil (et le choix suit). */
export function closeData() {
  if (S.dpanel === 'ad' || S.vfrPin) return unpinAd();
  if (S.dpanel === 'weather') keep.view = 'profile';
  endData();
}
/** Dessin de la feuille redessiné sans relecture (taille, curseur, design) : la coupe si elle est montrée. */
export function redrawSheet() {
  if (S?.dpanel === 'weather') redrawWeather();
}
/** Le vol a changé ou la feuille revient : la coupe suit le choix « Profil · Météo » (jamais rejoué sur une feuille repliée). */
export function syncView() {
  if (!canWeather()) {
    if (S.dpanel === 'weather') endData('weather');
    return dataHead();
  }
  if (S.dpanel === 'weather') showWeather();
  else if (!S.dpanel && keep.view === 'weather' && S.sh.pos !== 'collapsed') showWeather();
  else {
    if (!S.dpanel && keep.view === 'weather') keep.view = 'profile';
    dataHead();
  }
}
/** Échap (SPEC § 4) : ferme une chose par appui, la plus proche d'abord — la légende, le panneau des modes, le contenu de la
 *  feuille, la carte d'un point, le « + » armé, le mode Édition ; vrai si quelque chose l'a été. */
export function escapeKey() {
  const E = got('edit');
  if (!S.legendEl.hidden) {
    S.legend = false;
    legendSync();
    S.legendBtn.focus();
  } else if (!S.modeOpts.hidden) {
    toggleModes(false);
    S.modeBtn.focus();
  } else if (S.dpanel || S.vfrPin) {
    const layers = S.dpanel === 'layers';
    closeData();
    if (layers) S.layersBtn.focus();
  } else if (!S.cardEl.hidden) hideTips();
  else if (S.edit.adding) E?.setAdding(false);
  else if (S.edit.on) E?.setEdit(false);
  else return false;
  return true;
}
/** Gestes de l'en-tête : ✕ ; les puces Profil · Météo (une feuille repliée s'ouvre à sa position par défaut ; le choix est
 *  gardé le temps de la page) ; « i » et un toucher sur la légende. */
export function sheetEvents() {
  S.dheadEl.addEventListener('click', e => {
    if (e.target.closest('[data-dclose]')) closeData();
  });
  S.segEl.addEventListener('click', e => {
    if (e.target.closest('[data-legend]')) {
      if (S.legendBtn.disabled) return;
      if (!S.legend && S.sh.pos === 'collapsed') S.sh.set('default', true); // la légende se lit sur le dessin
      S.legend = !S.legend;
      return legendSync();
    }
    const b = e.target.closest('[data-view]'),
      v = b?.dataset.view;
    if (!v || b.disabled || (v === 'weather') === (S.dpanel === 'weather')) return;
    if (S.sh.pos === 'collapsed') S.sh.set('default', true);
    keep.view = v;
    if (v === 'weather') showWeather(true);
    else endData('weather');
  });
  S.legendEl.addEventListener('click', () => {
    S.legend = false;
    legendSync();
  });
}
