// V3 maps — les espaces d'un point (modules/maps/SPEC.md § 10) : un toucher sur la carte ouvre dans la feuille le graphique des
// niveaux (une colonne par espace, du plancher au plafond, numérotée du plus haut au plus bas) et la liste en notation SIA,
// puis la ligne repliée « Aussi ici » des espaces de la surface au plafond.

import {
  S,
  esc,
  tt,
  onMission,
  level
} from './state.js';
import {
  TX
} from './texts.js';
import {
  openData,
  endData
} from './sheet_view.js';
import {
  releaseAd
} from './vfr.js';

/** Couleur d'un type d'espace (celles du profil vertical). */
const ZONE_COL = {
  R: '#d32f2f',
  P: '#b71c1c',
  D: '#ef6c00',
  TRA: '#ef6c00',
  TSA: '#ef6c00',
  CTR: '#1565c0',
  TMA: '#1565c0',
  CTA: '#3949ab',
  SIV: '#2e7d32',
  RMZ: '#555',
  TMZ: '#555'
};
/** Contenu « n espaces sur ce point » du bloc de données : un graphique comme le profil vertical (axe des altitudes, une
 *  colonne par espace entre son plancher et son plafond, numérotée), à gauche, puis la liste numérotée en notation SIA,
 *  du plus haut au plus bas (le numéro 1 est l'espace le plus haut, en haut de la liste et à gauche du graphique : `MapsRender.sortAirspacesTopDown`,
 *  appliqué par `airspacesAround`, la liste arrive triée). Le graphique est dessiné à l'échelle 1 pour la place du bloc (bw × bh px) : la
 *  largeur que demandent ses colonnes (14 px au moins, 22 px au plus sur un téléphone, moins de 600 px ; 400 px au plus sinon), 60 % du
 *  bloc au plus (les 14 px passent avant : la liste cède, elle passe sur deux lignes puis sous le graphique), et jamais plus haut que le bloc. Hauteurs ASFC comptées depuis le sol (le relief du point n'est pas sous la main ici, la
 *  lecture des terrains est asynchrone : la liste garde la notation SIA « ASFC ») ; plafond inconnu : colonne pointillée « ? ». */
export function levelsHtml(list, bw = 360, bh = 200, also = [], el = null) {
  bh -= also?.length ? 56 : 0; // la ligne repliée « Aussi ici » (44 px + son espacement) reste dans la vue, sous le graphique
  // la même lecture des limites que la coupe verticale (SiaAero.limitRead) : « 800 ASFC » est 800 ft au-dessus du sol, pas le sol
  const read = window.SiaAero?.limitRead || (() => ({
      ft: 0,
      rel: false,
      unl: false,
      ok: false
    })),
    rows = list.map(a => {
      const l = read(a.lower, false),
        u = read(a.upper, true),
        lo = l.ok && Number.isFinite(l.ft) ? Math.max(0, l.ft) : 0,
        // UNL seulement pour UNL (ou 66 000 ft et plus, comme les voies) ; un plafond vide, illisible ou sous le plancher est
        // inconnu : colonne pointillée marquée « ? », jamais pleine hauteur « UNL » ; un plancher illisible : idem, depuis le sol
        unl = u.ok && u.unl,
        unkUp = !unl && !(u.ok && Number.isFinite(u.ft) && u.ft > lo);
      return {
        a,
        lo,
        up: unl || unkUp ? null : u.ft,
        unl,
        unk: unkUp || !l.ok,
        col: ZONE_COL[String(a.type || '').toUpperCase()] || '#6d4c41'
      };
    }),
    finite = rows.map(r => r.up ?? r.lo).filter(Number.isFinite),
    unl = rows.some(r => r.unl),
    nice = v => {
      for (const s of [1000, 2000, 2500, 5000, 10000, 20000])
        if (v / s <= 5) return s;
      return 50000;
    },
    raw = Math.max(5000, ...finite) * 1.08,
    step = nice(raw),
    top = Math.ceil(raw / step) * step,
    narrow = bw < 600,
    L = narrow ? 40 : 46,
    // le graphique garde la largeur que ses colonnes demandent (22 px au plus sur un téléphone, 14 au moins : le numéro reste lisible),
    // l'axe et ses libellés, la marge ; il n'est borné que par 60 % du bloc. Il ne cède jamais à la liste : c'est la liste qui passe sur
    // deux lignes par espace (le nom, puis les niveaux), et, si même un nom de 8 caractères n'y tient plus à côté du graphique, qui
    // passe dessous (retour à la ligne du corps, `flex-wrap` et la base de la liste en CSS). Les 14 px l'emportent sur les 60 % quand
    // beaucoup d'espaces sont lus sur un corps étroit (13 espaces sur 300 px : 60 % ne laissent que 10 px à chaque colonne).
    floorW = L + 6 + rows.length * 14,
    // entre 14 et 22 px par colonne, la colonne la plus large qui laisse à la liste la place des niveaux de l'espace le plus long sur la
    // ligne sous son nom (sinon « 800 ASFC|1800 ASFC » serait rogné) ; jamais sous 14 px
    fs = (el && parseFloat(getComputedStyle(el).fontSize)) || 14,
    tailPx = Math.max(0, ...list.map(a => a.lower == null && a.upper == null ? 0 : `${MapsRender.siaLimit(a.lower)}|${MapsRender.siaLimit(a.upper)}`.length + (a.cls ? 4 : 0))) * fs * .95 * .92 *
    .6,
    pitch = Math.max(14, Math.min(22, (bw - 12 - (fs * .95 * 2.4 + tailPx + 4) - L - 6) / Math.max(1, rows.length))),
    W = Math.min(bw, Math.round(Math.max(floorW, narrow ? Math.min(bw * .6, L + 6 + rows.length * pitch) : Math.min(400, bw * .6, Math.max(
      240, L + 12 + rows.length * 36))))),
    // avec la ligne « Aussi ici », le plancher de la hauteur laisse la place de la ligne
    H = Math.round(Math.max(also?.length ? 90 : 110, Math.min(300, bh - 16))),
    T = unl ? 16 : 6,
    B = H - 6,
    y = ft => B - (Math.min(ft, top) / top) * (B - T),
    colW = Math.min(narrow ? 22 : 34, (W - L - 6) / Math.max(1, rows.length)),
    gap = Math.min(4, colW * .2);
  let svg = '';
  for (let v = 0; v <= top; v += step) svg +=
    `<line x1="${L}" x2="${W - 2}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="currentColor" stroke-opacity=".15"/><text x="${L - 4}" y="${y(v).toFixed(1)}" text-anchor="end" dominant-baseline="middle">${esc(v ? level(v) : 'SFC')}</text>`;
  if (unl) svg += `<text x="${L - 4}" y="${T - 8}" text-anchor="end" dominant-baseline="middle">UNL</text>`;
  rows.forEach((r, i) => {
    const x = L + 4 + i * colW,
      y0 = r.unl ? T - 12 : r.unk ? T : y(r.up),
      y1 = y(r.lo),
      ft = r.unl ? 'UNL' : r.unk ? '?' : Math.round(r.up);
    svg +=
      `<rect class="mp-lv-col" data-lo="${Math.round(r.lo)}" data-up="${ft}" x="${(x + gap / 2).toFixed(1)}" y="${y0.toFixed(1)}" width="${(colW - gap).toFixed(1)}" height="${Math.max(2, y1 - y0).toFixed(1)}" fill="${r.col}" fill-opacity="${r.unk ? '.07' : '.18'}" stroke="${r.col}"${r.unk ? ' stroke-dasharray="3 2"' : ''}><title>${esc([r.a.type, r.a.name].filter(Boolean).join(' '))} ${esc(MapsRender.siaLimit(r.a.lower))}|${esc(MapsRender.siaLimit(r.a.upper))}</title></rect>`;
    if (colW >= 10) svg +=
      `<text x="${(x + colW / 2).toFixed(1)}" y="${Math.min(B - 4, Math.max(T, y0 + 9)).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" fill="${r.col}" font-weight="700">${i + 1}</text>`;
    if (r.unk && colW >= 10 && y1 - y0 > 24) svg +=
      `<text class="mp-lv-unk" x="${(x + colW / 2).toFixed(1)}" y="${(y0 + 20).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" fill="${r.col}" font-weight="700">?</text>`;
  });
  const items = rows.map((r, i) => {
    // une ligne par espace : « 1 · TMA NANTES 4 · FL055|FL065 · D » ; faute de place, la ligne passe sur deux (le nom, puis les niveaux
    // et la classe sous lui) : le nom ne cède à l'ellipse qu'au-delà d'une ligne pleine, jamais à moins de 8 caractères ;
    // l'activation et les informations, quand il y en a, vont dans l'infobulle
    const x = r.a,
      name = [x.type, x.name].filter(Boolean).join(' '),
      lim = x.lower == null && x.upper == null ? '' : `${MapsRender.siaLimit(x.lower)}|${MapsRender.siaLimit(x.upper)}`,
      tail = [lim, x.cls].filter(Boolean).join(' · '),
      note = [x.act, x.info].filter(Boolean).join(' · ');
    return `<li${note ? ` title="${esc(note)}"` : ''}><span class="mp-lv-n" style="color:${r.col}">${i + 1}</span><span class="mp-lv-txt"><b class="mp-lv-name">${esc(name)}</b>${tail ? `<span class="mp-lv-lim f-muted">${esc(tail)}</span>` : ''}</span></li>`;
  }).join('');
  return `<div class="mp-lv-body"><svg class="mp-lv" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(tt(TX.levelsAxis))}">${svg}</svg><ol class="mp-lv-list">${items}</ol></div>${alsoHtml(also)}`;
}
/** Ligne repliée sous la liste : les espaces écartés du point (FIR, UIR, SIV, secteurs, surface au plafond), par leur nom, sans
 *  colonne ni compte dans le titre (règle 21 amendée). Rien quand il n'y en a pas ; repliée à chaque écriture. */
const alsoHtml = also => also?.length ? `<details class="f-card mp-lv-also"><summary>${esc(tt(TX.levelsAlso, {
  n: also.length
}))}</summary><p class="f-muted">${esc(also.join(' · '))}</p></details>` : '';
/** Liste des espaces fermée (écrit seulement si elle est ouverte) : un toucher sur un endroit vide de la carte, ✕ et Échap
 *  la ferment, le profil vertical revient ; un glisser ou la molette jamais (`hideTips` ne la touche pas). */
export function closeLv() {
  if (S?.dpanel) endData('lv');
}
/** Liste des espaces sous le point touché, dans la feuille (titre « n espaces sur ce point »). Un terrain épinglé est relâché :
 *  un seul contenu à la fois. */
export function showLv() {
  const list = S.lvList,
    also = S.lvAlso || [];
  if (!list?.length) return;
  releaseAd();
  openData('lv', `lv:${list.map(a => a.id || a.name || '').join('|')}#${also.join('|')}`, list.length === 1 ? tt(TX.levelsTitle1) : tt(
    TX.levelsTitle, {
      n: list.length
    }), (w, h, el) => levelsHtml(list, w, h, also, el));
}
/** Espaces au point (lat, lon), sans ceux de la surface au plafond (nommés dans « Aussi ici », pas sur une carte de mission) :
 *  leur liste ouverte dans la feuille ; faux s'il n'y en a aucun (SPEC § 10). */
export function showLvAt(lat, lon) {
  const {
    shown,
    also
  } = MapsRender.airspacesAround(S.data?.data?.airspaces || [], lat, lon, onMission() ? null : S.data?.data?.flat);
  if (!shown.length) return false;
  S.lvList = shown;
  S.lvAlso = onMission() ? [] : also;
  showLv();
  return true;
}
