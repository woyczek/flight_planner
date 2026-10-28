// V3 maps — état partagé des fichiers du module Carte (modules/maps/SPEC.md § 1) : l'état du montage (S, remis à null au
// démontage), ce qui vit le temps de la page (keep), les petites aides communes et le chargement des fichiers à la demande
// (meta.lazy). Les autres fichiers l'importent tous par ce même chemin ('./state.js', sans empreinte) : une seule instance.

import {
  formatLevel
} from '../../frame/lib/route_text.js';

/** État du montage courant (null hors montage). Lecture : import { S } (liaison vivante) ; écriture : setS(). */
export let S = null;
/** Pose l'état du montage (mount) ou l'efface (unmount). */
export const setS = v => {
  S = v;
};

/** Ce qui vit le temps de la page, d'un montage à l'autre (jamais sur l'appareil) : position de la feuille, dessin choisi
 *  (profil ou coupe), fenêtre de la route { sig, from, to }, aide du mode Édition déjà dite, dernier toucher. */
export const keep = {
  sheet: 'default',
  view: 'profile',
  win: null,
  editHinted: false,
  touchAt: -1e9
};

/** Mètres dans un mille nautique (distances de la coupe en mètres, affichées en NM). */
export const FT_NM = 1852;
/** Texte échappé pour du HTML. */
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
/** Texte traduit d'une ligne [fr, en, de, es] (ctx.t), avec ses valeurs. */
export const tt = (row, v) => S.ctx.t(row, v);
/** Chemin du vol courant du pilote. */
export const flightPath = () => `pilot/${S.ctx.identity?.trigram || 'ANON'}/current_flight.json`;
/** Niveau écrit selon l'altitude de transition de la compagnie (« FL060 », « 3 500 ft » dessous : SPEC § 4). */
export const level = ft => formatLevel(ft, S?.ctx.airline?.transitionFt);
/** Hauteur lisible (relief, MORA, obstacles) : toujours en pieds. */
export const altTxt = ft => `${Math.round(ft).toLocaleString(S.ctx.lang())} ft`;
/** Distance en NM à la façon de la langue : une décimale sous 10 NM (« 3,2 »), aucune au-delà. */
export const nmTxt = v => v.toLocaleString(S.ctx.lang(), {
  minimumFractionDigits: v < 10 ? 1 : 0,
  maximumFractionDigits: v < 10 ? 1 : 0
});
/** Lecture d'une tuile d'altitude Terrarium par la couche réseau du cadre (SPEC § 2.1) : load(url) → Blob, rejetée hors
 *  ligne ou sur une réponse en erreur ; donnée aux briques (relief du profil, courbes de niveau), qui n'appellent jamais fetch.
 *  Le ctx est pris à la création : une tuile qui arrive après le démontage ne lit pas S. */
export const tileLoader = ctx => async url => {
  const r = await ctx.net.fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.blob();
};
/** Points volés du vol courant, ceux de la route et de ses procédures choisies (frame/lib/current_flight.js flownPath, rangés dans
 *  S.route par data.js : longitudes continues, nm = distance cumulée) ; sans eux, les points de la route. La seule base des
 *  distances du profil, des marques NM, du curseur et des heures. */
export const flownPts = () => S?.route?.flown?.length > 1 ? S.route.flown : S?.route?.points || [];
/** Vrai si le montage est sur une carte de mission (#maps?mission=…). */
export const onMission = () => !!S?.ctx.query?.mission;

/** Longitude à envoyer à un service ou à lire dans un fichier d'aerodb : dans [-180, 180[ ; une longitude qui y est déjà est
 *  rendue telle quelle (pas de bruit d'arrondi sur un vol ordinaire). */
export const outLon = lon => lon >= -180 && lon < 180 ? lon : ((((lon + 180) % 360) + 360) % 360) - 180;
/** Écart de longitude a − b ramené à ]-180, 180] (deux positions de part et d'autre de la ligne de changement de date). */
export const dLon = (a, b) => {
  const d = a - b;
  return d - 360 * Math.round(d / 360);
};

/** Écrit un attribut data-* seulement s'il change. */
export function setData(el, k, v) {
  if (el.dataset[k] !== v) el.dataset[k] = v;
}
/** Nom d'un bouton (infobulle et nom accessible) ; écrit seulement s'il change. */
export function setLabel(b, label) {
  if (b.title !== label) b.title = label;
  if (b.getAttribute('aria-label') !== label) b.setAttribute('aria-label', label);
}
/** aria-pressed d'un bouton bascule ; écrit seulement s'il change. */
export function setPressed(b, on) {
  const v = String(!!on);
  if (b.getAttribute('aria-pressed') !== v) b.setAttribute('aria-pressed', v);
}
/** Élément montré ou caché (hidden) ; écrit seulement s'il change. */
export function show(el, on) {
  if (el.hidden === !!on) el.hidden = !on;
}
/** Puce ou bouton désactivé (disabled et aria-disabled) ou actif ; jamais retiré ; écrit seulement si l'état change. */
export function setOff(b, off) {
  if (b.disabled !== !!off) b.disabled = !!off;
  const v = String(!!off);
  if (b.getAttribute('aria-disabled') !== v) b.setAttribute('aria-disabled', v);
}

// ---------------------------------------------------------------- fichiers chargés à la demande (meta.lazy)
/** Fichiers du module chargés à leur premier usage : le mode Édition, la page de réglage des seuils. */
const LAZY = {
  edit: 'edit.js',
  tune: 'tune.js'
};
const loaded = {},
  loading = {};
/** Le fichier name s'il est déjà chargé, sinon null (un dessin ne l'attend jamais). */
export const got = name => loaded[name] || null;
/** Charge le fichier name (une fois par page) : promesse de son module. */
export function need(name) {
  return loading[name] ||= import(new URL(`${LAZY[name]}?v=0`, import.meta.url).href).then(m => loaded[name] = m, e => {
    delete loading[name]; // hors ligne sans copie : redemandé au geste suivant
    throw e;
  });
}
