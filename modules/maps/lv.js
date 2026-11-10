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
/** Vrai quand des espaces d'une même famille de nom (le nom sans son numéro ou sa lettre de secteur), de même type et de même
 *  classe se recouvrent ici avec des planchers différents : une note le dit sous la liste (Dublin : openAIP code les CTA 3 à 6
 *  sans leur trou intérieur ; donnée de la source, la Carte ne découpe rien). */
function sameFamilyOverlap(list, read) {
  const fam = a => [a.type, a.cls, String(a.name || '').toUpperCase().replace(/(\s+(\d+[A-Z]?|[A-Z]))+$/, '').trim()].join('|'),
    floors = new Map();
  for (const a of list) {
    const l = read(a.lower, false),
      k = fam(a);
    if (!floors.has(k)) floors.set(k, new Set());
    floors.get(k).add(l.ok && Number.isFinite(l.ft) ? Math.round(l.ft) : 'x');
  }
  return [...floors.values()].some(s => s.size > 1);
}
/** Sept lignes au plus dans la fiche, puis « n autres » (SOG-0163). */
const CARD_LINES = 7;
/** Une valeur de la base en lignes de texte : une chaîne, ou une liste de chaînes (bornées, sans balise) ; rien sinon. */
const linesOf = v => (Array.isArray(v) ? v : [v]).filter(x => typeof x === 'string' && x.trim()).slice(0, 12).map(x => x.replace(
  /[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400));
/** La fiche d'un espace (SOG-0163 ; un clic ou un appui sur sa ligne de la liste, ou sur son bloc du profil) : nom et type, limites, activité et
 *  horaires publiés, conditions et remarques de l'AIP telles quelles, organisme et fréquence, source et date, et une phrase franche sur
 *  l'activité réelle. Ne dit que ce que la base porte (AeroDB relève ce que chaque source donne) ; un P dit « interdit ». */
export function spaceCardHtml(a) {
  const type = String(a.type || ''),
    live = ['R', 'D', 'TSA', 'TRA'].includes(type), // les espaces dont l'activité varie
    lim = a.lower == null && a.upper == null ? '' : `${MapsRender.siaLimit(a.lower)} | ${MapsRender.siaLimit(a.upper)}`,
    act = String(a.act || '').toUpperCase(),
    hours = linesOf(a.hours ?? a.sched),
    rem = linesOf(a.rem ?? a.remarks),
    who = [a.admin, a.info].filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()).join(' · '),
    L = [];
  L.push(`<b>${esc([type, a.name].filter(Boolean).join(' '))}</b> · ${esc(tt(TX.spTypes[type] || TX.spTypes.other))}${type === 'P' ? ` — <b class="mp-sp-no">${esc(tt(TX.spProhibited))}</b>` : ''}`);
  if (lim || a.cls) L.push(`${esc(tt(TX.spLimits))} : ${esc([lim, a.cls ? tt(TX.spClass, {
    c: a.cls
  }) : ''].filter(Boolean).join(' · '))}`);
  if (act === 'AZBA' || a.azba) L.push(esc(tt(TX.spActAzba)));
  else if (act === 'NOTAM') L.push(esc(tt(TX.spActNotam)));
  else if (act) L.push(`${esc(tt(TX.spActivity))} : ${esc(act)}`);
  // la phrase franche reste dans les sept premières lignes, quel que soit le nombre de lignes d'horaires et de remarques (AeroDB en donne douze de chaque)
  if (live) L.push(`<span class="mp-sp-real">${esc(tt(TX.spActual))}</span>`);
  if (hours.length) L.push(...hours.map(h => `${esc(tt(TX.spHours))} : ${esc(h)}`));
  else if (live) L.push(esc(tt(TX.spNoHours)));
  if (rem.length) L.push(...rem.map(h => `${esc(tt(TX.spRemarks))} : ${esc(h)}`));
  if (who) L.push(`${esc(tt(TX.spWho))} : ${esc(who)}`);
  L.push(`<span class="mp-sp-src">${esc(tt(TX.spSource))} : ${esc(String(a.src || '?').toUpperCase())} <span class="mp-sp-cyc"></span></span>`);
  const shown = L.slice(0, CARD_LINES),
    more = L.slice(CARD_LINES);
  return `<div class="mp-sp-lines">${shown.map(x => `<p>${x}</p>`).join('')}</div>${more.length ? `<details><summary>${esc(tt(TX.spMore, {
    n: more.length
  }))}</summary>${more.map(x => `<p>${x}</p>`).join('')}</details>` : ''}`;
}
/** Une ligne de la liste ouvre la fiche de son espace sous elle (la fiche en place, l'autre se ferme) ; la date de la base se lit une fois. */
export function lvEvents() {
  const body = S.dbodyEl,
    click = e => {
      const col = e.target.closest?.('.mp-lv-col[data-i]'), // un bloc de la pile : il choisit son espace (la fiche change, jamais refermée)
        li = col ? body.querySelector(`.mp-lv-list li[data-i="${col.dataset.i}"]`) : e.target.closest?.('.mp-lv-list li[data-i]');
      if (!li || S?.dpanel !== 'lv') return;
      const a = (S.lvList || [])[+li.dataset.i],
        card = body.querySelector('.mp-sp-card');
      if (!a || !card) return;
      const open = li.dataset.open === '1' && !col;
      for (const x of body.querySelectorAll('.mp-lv-list li[data-open="1"]')) x.dataset.open = '0';
      card.hidden = open;
      S.lvOpen = open ? null : a;
      markSel(body);
      if (open) return;
      li.dataset.open = '1';
      fillCard(card, a);
    };
  body.addEventListener('click', click);
  body.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.mp-lv-list li[data-i]')) {
      e.preventDefault();
      click(e);
    }
  });
  return () => body.removeEventListener('click', click);
}
/** Le bloc de l'espace choisi est surligné dans la pile (écrit seulement s'il change). */
function markSel(body) {
  body.querySelectorAll('.mp-lv-col').forEach(r => {
    const on = (S.lvList || [])[+r.dataset.i] === S.lvOpen,
      has = r.classList.contains('mp-lv-sel');
    if (on !== has) {
      r.classList.toggle('mp-lv-sel', on);
      r.setAttribute('stroke-width', on ? '2.5' : '1');
      r.setAttribute('fill-opacity', on ? '.4' : r.getAttribute('stroke-dasharray') ? '.07' : '.18');
    }
  });
}
/** Fait défiler le corps de la feuille, et lui seul, pour montrer el : jamais `scrollIntoView`, qui fait défiler tous les ancêtres défilables (la page,
 *  le volet de la vue double) et pousse la feuille hors de l'écran — « sizing vertical non recalculé », refus de recette de SOG-0163. */
function showIn(body, el) {
  if (!body || !el) return;
  const b = body.getBoundingClientRect(),
    r = el.getBoundingClientRect(),
    st = body.querySelector(
      '.mp-lv-wrap[data-wide="0"] .mp-lv-stack'), // au téléphone la pile reste collée en haut : la fiche se lit dessous
    top = b.top + (st ? st.getBoundingClientRect().height + 6 : 0);
  if (r.height > b.bottom - top || r.top < top) body.scrollTop += r.top - top; // le haut de la fiche sous la pile
  else if (r.bottom > b.bottom) body.scrollTop += r.bottom - b.bottom;
}
/** La fiche écrite (et la date de la base, quand AeroDB la donne). */
function fillCard(card, a) {
  card.innerHTML = spaceCardHtml(a);
  card.hidden = false;
  showIn(S.dbodyEl, card); // la fiche sous le graphique : le corps de la feuille la montre
  Promise.resolve(S.ctx?.aerodb?.status?.()).catch(() => null).then(st => {
    const el = card.querySelector('.mp-sp-cyc');
    if (el && st?.cycle) el.textContent = `(${String(st.cycle).slice(0, 10)})`;
  });
}
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
    unl = rows.some(r => r.unl),
    nice = v => {
      for (const s of [1000, 2000, 2500, 5000, 10000, 20000])
        if (v / s <= 5) return s;
      return 50000;
    },
    // l'échelle est cadrée sur les limites de la pile (SOG-0163 : « jamais vide ») : du sol si la pile y touche (plancher sous 3 000 ft), sinon
    // depuis le plus bas des planchers (une TRA FL195 | UNL n'est pas tracée au bout de 19 500 ft d'échelle vide) ; au moins 2 000 ft de haut
    lo0 = Math.min(...rows.map(r => r.lo)),
    hi0 = Math.max(...rows.map(r => r.up ?? r.lo)),
    from = lo0 <= 3000 ? 0 : lo0,
    raw = from + Math.max(2000, (hi0 - from) * 1.08),
    step = nice(raw - from),
    top = Math.ceil(raw / step) * step,
    bot = from ? Math.max(0, Math.floor((lo0 - (raw - lo0) * .12) / step) * step) : 0,
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
    // au téléphone la pile reste en haut de la feuille quand la fiche est ouverte (elle ne défile pas avec elle) : elle ne prend alors que le
    // tiers de la hauteur, la fiche garde le reste
    H = Math.round(narrow && S.lvOpen ? Math.min(150, Math.max(96, bh * .4)) : Math.max(also?.length ? 90 : 110, Math.min(300, bh - 16))),
    T = unl ? 16 : 6,
    B = H - 6,
    y = ft => B - ((Math.min(Math.max(ft, bot), top) - bot) / (top - bot)) * (B - T),
    colW = Math.min(narrow ? 22 : 34, (W - L - 6) / Math.max(1, rows.length)),
    gap = Math.min(4, colW * .2);
  let svg = '';
  for (let v = bot; v <= top; v += step) svg +=
    `<line x1="${L}" x2="${W - 2}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="currentColor" stroke-opacity=".15"/><text x="${L - 4}" y="${y(v).toFixed(1)}" text-anchor="end" dominant-baseline="middle">${esc(v ? level(v) : 'SFC')}</text>`;
  if (unl) svg += `<text x="${L - 4}" y="${T - 8}" text-anchor="end" dominant-baseline="middle">UNL</text>`;
  rows.forEach((r, i) => {
    const x = L + 4 + i * colW,
      y0 = r.unl ? T - 12 : r.unk ? T : y(r.up),
      y1 = y(r.lo),
      ft = r.unl ? 'UNL' : r.unk ? '?' : Math.round(r.up);
    svg +=
      `<rect class="mp-lv-col${S.lvOpen === r.a ? ' mp-lv-sel' : ''}" data-i="${i}" data-lo="${Math.round(r.lo)}" data-up="${ft}" x="${(x + gap / 2).toFixed(1)}" y="${y0.toFixed(1)}" width="${(colW - gap).toFixed(1)}" height="${Math.max(2, y1 - y0).toFixed(1)}" fill="${r.col}" fill-opacity="${S.lvOpen === r.a ? '.4' : r.unk ? '.07' : '.18'}" stroke="${r.col}"${S.lvOpen === r.a ? ' stroke-width="2.5"' : ''}${r.unk ? ' stroke-dasharray="3 2"' : ''}><title>${esc([r.a.type, r.a.name].filter(Boolean).join(' '))} ${esc(MapsRender.siaLimit(r.a.lower))}|${esc(MapsRender.siaLimit(r.a.upper))}</title></rect>`;
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
      // « plafond déduit » : dit dans la fiche (un toucher), jamais sur la coupe (la valeur vient d'aerodb, qui plafonne la classe E sous la A)
      deduced = x.capped === 'classA' ? tt(TX.ceilingDeduced) : '',
      tail = [lim, x.cls, deduced].filter(Boolean).join(' · '),
      note = [x.act, x.info, deduced].filter(Boolean).join(' · ');
    return `<li data-i="${i}" data-open="${S.lvOpen && S.lvOpen === x ? 1 : 0}" tabindex="0" role="button" aria-label="${esc(`${name} — ${tt(TX.spOpen)}`)}"${note ? ` title="${esc(note)}"` : ''}><span class="mp-lv-n" style="color:${r.col}">${i + 1}</span><span class="mp-lv-txt"><b class="mp-lv-name">${esc(name)}</b>${tail ? `<span class="mp-lv-lim f-muted">${esc(tail)}</span>` : ''}</span></li>`;
  }).join('');
  const fam = sameFamilyOverlap(list, read) ? `<p class="f-muted mp-lv-fam">${esc(tt(TX.levelsFamily))}</p>` : '';
  // la pile (colonnes plancher → plafond sur l'échelle) reste en vue pendant que la fiche défile (SOG-0163) : à côté de la liste et de la fiche en vue large,
  // au-dessus au téléphone ; seul le corps de la feuille défile, rien ne sort de l'écran
  return `<div class="mp-lv-wrap" data-wide="${narrow ? 0 : 1}"><div class="mp-lv-stack"><svg class="mp-lv" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(tt(TX.levelsAxis))}">${svg}</svg></div><div class="mp-lv-side"><ol class="mp-lv-list">${items}</ol>${fam}${alsoHtml(also)}<div class="mp-sp-card f-card"${S.lvOpen ? '' : ' hidden'} aria-live="polite">${S.lvOpen ? spaceCardHtml(S.lvOpen) : ''}</div></div></div>`;
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
  openData('lv', `lv:${list.map(a => a.id || a.name || '').join('|')}#${also.join('|')}@${S.lvOpen ? S.lvOpen.key || S.lvOpen.name || '' : ''}`, list.length === 1 ? tt(TX.levelsTitle1) : tt(
    TX.levelsTitle, {
      n: list.length
    }), (w, h, el) => levelsHtml(list, w, h, also, el));
  const card = S.lvOpen && S.dbodyEl?.querySelector('.mp-sp-card');
  if (card) fillCard(card, S.lvOpen); // la date de la base s'ajoute à la fiche ouverte d'emblée
}
/** La fiche d'un espace du profil (un appui sur son bloc, SOG-0163) : la liste des espaces traversés à cette distance, la fiche de celui-ci ouverte. */
export function openSpace(a, list) {
  S.lvList = list;
  S.lvAlso = [];
  S.lvOpen = a;
  showLv();
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
  S.lvOpen = null; // les fiches s'ouvrent par un appui sur une ligne
  showLv();
  return true;
}
