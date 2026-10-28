// V3 maps — couche « Procédures » (V3_SPECIFICATION § 10.22 ; modules/maps/SPEC.md § 6.7 et § 10) : ce que l'appareil sait donner
// des procédures de chaque terrain, vert (détenues), orange (lisibles à la demande) ou rouge (rien), lu par aerodb.coverage(icao).
// Ce fichier : les demandes (seuls les terrains visibles, regroupées par image, gardées dans l'état de la Carte), l'allumage
// automatique de la couche, la ligne de la légende et la ligne de la carte du terrain. Le dessin de la couleur est dans render.js
// (coverPins) ; sans aerodb.coverage la couche n'est pas proposée et rien d'autre ne change.

import {
  S,
  esc,
  tt,
  onMission
} from './state.js';
import {
  TX
} from './texts.js';
import {
  proceduresOf
} from '../../frame/lib/current_flight.js';
import {
  schedule
} from './draw.js';
import {
  layersNow,
  fillLayers
} from './layers.js';
import {
  legendSync
} from './sheet_view.js';
import {
  refreshAdCard
} from './vfr.js';

/** Niveaux, du meilleur au pire, et le jeton du design qui porte leur couleur (vert, orange, rouge de la charte). */
const LEVELS = ['green', 'orange', 'red'],
  TOKEN = {
    green: 'ok',
    orange: 'warn',
    red: 'err'
  },
  AD_CODE = /^[A-Z0-9]{4}$/,
  up = s => String(s ?? '').trim().toUpperCase();
/** Couleur d'un niveau pour une feuille de style (pastille de la légende, de la carte du terrain). */
export const covColor = level => `var(--sog-${TOKEN[level]})`;

/** État de la couche pour ce montage : cache par OACI (undefined : demandé, réponse attendue), demandes de l'image en cours,
 *  génération (une réponse d'avant un « change » est jetée), case touchée par l'utilisateur, dernier état montré, textes des
 *  raisons (AeroCatalogue.COVERAGE : undefined en lecture, null absents). */
const C = () => S.cov ||= {
  cache: new Map(),
  want: new Set(),
  gen: 0,
  touched: false,
  shown: false,
  texts: undefined,
  textsP: null
};

/** Vrai si aerodb sait dire la couverture : sinon la couche n'est pas proposée. */
export const covAvail = () => !!S && typeof S.ctx.aerodb?.coverage === 'function';

/** Réponse d'aerodb pour un terrain : l'objet gardé, null (code mal formé ou lecture en échec), undefined tant qu'elle n'est
 *  pas là ; un terrain inconnu est demandé (au prochain covFlush) une seule fois. */
function entry(icao) {
  const c = C(),
    k = up(icao);
  if (!AD_CODE.test(k)) return null;
  if (!c.cache.has(k)) {
    c.cache.set(k, undefined);
    c.want.add(k);
  }
  return c.cache.get(k);
}
/** Niveau d'un terrain ('green' | 'orange' | 'red'), ou rien tant que la réponse n'est pas là. */
export function covLevel(icao) {
  const e = entry(icao);
  return LEVELS.includes(e?.level) ? e.level : undefined;
}
/** Les demandes de l'image en cours partent ensemble ; la carte, la case et la carte du terrain sont refaites une fois, à
 *  l'arrivée du lot. */
export function covFlush() {
  const c = S?.cov;
  if (!c?.want.size || !covAvail()) return;
  const list = [...c.want],
    gen = c.gen,
    A = S.ctx.aerodb;
  c.want.clear();
  Promise.all(list.map(k => Promise.resolve().then(() => A.coverage(k)).catch(() => null))).then(rows => {
    if (!S || S.cov !== c || c.gen !== gen) return;
    list.forEach((k, i) => c.cache.set(k, rows[i] || null));
    schedule();
    refreshAdCard();
  });
}
/** Base d'aerodb changée (what.coverage ou what.refreshed) : tout ce qui était connu est redemandé au prochain dessin, en un lot ;
 *  les anciennes réponses restent en place jusqu'à l'arrivée des nouvelles (la couche ne clignote pas), celles d'un lot parti
 *  avant le changement sont jetées. */
export function covClear() {
  const c = S?.cov;
  if (!c) return;
  c.gen++;
  for (const k of c.cache.keys()) c.want.add(k);
}

// ---------------------------------------------------------------- allumage automatique
/** L'utilisateur a touché la case : son choix l'emporte, l'allumage automatique ne s'applique plus jusqu'au rechargement. */
export function covTouch() {
  C().touched = true;
}
/** Allumage automatique (décision de la session ergonomie, 28 octobre) : le vol a un côté sans procédure choisie (départ sans
 *  SID ni piste, arrivée sans STAR, approche ni piste ; « aucune » = null est un choix) dont le terrain n'est pas vert. */
function covAuto() {
  const f = S.route?.flight;
  if (!f) return false;
  const v = proceduresOf(f),
    r = f.route || {},
    sides = [];
  if (v.dep && !v.dep.sid && !v.dep.rwy) sides.push(up(r.dep || r.points?.[0]?.id));
  if (v.arr && !v.arr.star && !v.arr.app && !v.arr.rwy) sides.push(up(r.arr || r.points?.at?.(-1)?.id));
  return sides.some(k => {
    const l = entry(k)?.level;
    return LEVELS.includes(l) && l !== 'green';
  });
}
/** La couche est-elle montrée : sa case (ou le choix de la compagnie), et tant que l'utilisateur ne l'a pas touchée, l'allumage
 *  automatique en plus. Jamais sans aerodb.coverage, ni sur une carte de mission. */
export function covShown() {
  if (!covAvail() || onMission()) return false;
  return !!layersNow().cov || (!C().touched && covAuto());
}
/** Avant un dessin : la couche est-elle montrée ? Si son état a changé (allumage ou extinction automatique), la case des Couches
 *  et la légende le disent. Rend la fonction qui donne le niveau d'un terrain (render.js : cov), ou null. */
export function covSync() {
  const on = covShown(),
    c = C();
  if (c.shown !== on) {
    c.shown = on;
    fillLayers();
    legendSync();
  }
  return on ? covLevel : null;
}

// ---------------------------------------------------------------- légende et carte du terrain
/** Lignes de la légende de la couche, une par niveau, seulement quand elle est montrée ; sw(forme, couleur) : le symbole. */
export const covRows = sw => covShown() ? LEVELS.map(l => [sw('pin', covColor(l)), esc(tt(TX.lgCov[l]))]) : [];

/** Textes des raisons du catalogue du cadre (AeroCatalogue.COVERAGE[raison] = [fr, en, de, es]) : undefined tant qu'il se charge
 *  (la carte du terrain est refaite à son arrivée), null s'il ne les donne pas. */
function covTexts() {
  const c = C();
  if (c.texts !== undefined) return c.texts;
  const A = S.ctx.aerodb;
  if (typeof A?.sources !== 'function') return c.texts = null;
  c.textsP ||= Promise.resolve().then(() => A.sources()).then(src => {
    if (!S || S.cov !== c) return;
    c.texts = src?.COVERAGE || null;
    refreshAdCard();
  }, () => {
    if (S?.cov === c) c.texts = null;
  });
  return undefined;
}
/** Ligne de la carte du terrain épinglé : une pastille de la couleur du niveau, le niveau, la raison (catalogue du cadre), « périmé »
 *  et, pour un terrain dont on détient les procédures, SID · STAR · APP. '' sans aerodb.coverage ou tant que la réponse n'est pas
 *  là (la carte est refaite à son arrivée). */
export function covCard(icao) {
  if (!covAvail()) return '';
  const e = entry(icao);
  covFlush();
  if (!e || !LEVELS.includes(e.level)) return '';
  const T = covTexts(),
    parts = [];
  if (T?.[e.reason]) parts.push(tt(T[e.reason]));
  if (e.outdated) parts.push(tt(TX.procOutdated));
  if (e.level === 'green' && e.counts) parts.push(tt(TX.covCounts, {
    s: +e.counts.SID || 0,
    t: +e.counts.STAR || 0,
    a: +e.counts.APP || 0
  }));
  return `<p class="mp-ad-cov" data-level="${e.level}"><i class="mp-cov-dot" style="background:${covColor(e.level)}"></i><span class="mp-cov-lv">${esc(tt(TX.covLevel[e.level]))}</span>${parts.map(p => ` · ${esc(p)}`).join('')}</p>`;
}
