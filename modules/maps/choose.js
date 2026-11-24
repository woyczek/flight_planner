// V3 maps — le mode « choisir sur la carte » (V3_SPECIFICATION § 10.23 et § 10.30 ; modules/maps/SPEC.md § 5.1). Carburant ouvre
// #maps?choose=dep|arr&icao=LFXX depuis le bouton « Sur la carte » d'un côté (ou la carte du terrain, « Choisir sur la carte ») :
// la Carte lit la demande (ctx.consume), cadre le terrain sur ses procédures, estompe le fond et ses propres couches, et le volet
// liste TOUTES les familles du côté à la fois, dans son ordre : piste, SID (départ) ou STAR (arrivée), approche (arrivée ; ses
// transitions en sous-lignes sous l'approche choisie). Seconde lecture (§ 10.30, 30 octobre) : trois tapes dans n'importe quel ordre,
// chaque choix réduit les deux autres familles à ce qui lui est compatible, le reste replié sous une ligne fine « N autres · Toutes »
// qui le déplie marqué ⚠ ; « Aucune » toujours première ; des lignes condensées ; la sélection résumée en tête du volet, une
// ligne par famille avec ✕ (la feuille est la seule surface qui défile). Un toucher sur une ligne ou un tracé pose le choix de sa famille dans le volet (état
// local du mode, rien d'écrit) ; la Carte dessine la sélection en cours (les pistes, la procédure choisie dans sa teinte, le reste de
// la famille touchée estompé). Piste et procédure se corrigent sans rien imposer : une ligne sous le groupe propose « Passer en 25 »
// ou « Choisir OKRIX5B ». Chaque piste porte le vent du METAR déjà connu (face ou arrière, travers). La fermeture (✕, Échap,
// « Terminer ») rend tout à Carburant en un seul retour : #fuel?focus=<côté>&rwy=…&star=…&app=…&apptrans=… (une clé par famille
// touchée, « none » pour « Aucune », clé absente = famille intouchée) ; Carburant est le seul à écrire. Les règles (ordre, ⚠,
// transitions, approches listées une fois, pistes, piste d'une procédure) sont celles de frame/lib/procedures.js, le vent celui de
// frame/lib/wind.js, sans copie.
//
// (a1, SOG-0569) COCHER pour comparer, puis CHOISIR (contrat : modules/maps/maquette/procedures.html, scènes #choisir0, #choisir5, #choisir8) :
// toutes les procédures de la famille touchée sont dessinées en CANDIDATES (trait fin, gris, sans nom) ; un toucher sur l'une, sur la carte
// ou dans la liste, la COCHE : elle prend la première teinte libre des huit (--sog-proc-1…8) et son numéro dans une pastille, son nom s'il a
// la place ; huit cochées au plus (la neuvième est refusée par une notification). « Choisir » n'est offert que sur une ligne cochée : la
// procédure prend la couleur et l'épaisseur de la route, n'est plus cochée (son numéro est libéré), celle qu'elle remplace redevient une
// candidate grise. Aucun geste « retirer le choix » : on en choisit une autre. Les cochées vivent dans S.choose.slot (id → numéro) ;
// le choix du volet (pane_model.js : sel) reste le seul état de ce qui est choisi, rendu à Carburant à « Terminer ».
const MAX_TICKS = 8;

import {
  S,
  tt,
  esc,
  setData,
  onMission
} from './state.js';
import {
  TX
} from './texts.js';
import * as PR from '../../frame/lib/procedures.js';
import {
  label as windLabel
} from '../../frame/lib/wind.js';
import {
  paneModel,
  paneState,
  panePick,
  paneFold,
  paneGoto,
  paneHl,
  paneReturn,
  FAMS,
  ptsOf,
  pointsOf
} from '../../frame/lib/pane_model.js';
import {
  proceduresOf
} from '../../frame/lib/flight_path.js';
import {
  place,
  arrowOf,
  drawRunways,
  reserveRunways,
  LINE_H,
  ROUTE_HALO,
  ROUTE_W
} from './procs.js';
import {
  radiusFor,
  pick as hitPick
} from '../../frame/lib/hit_target.js';
import {
  gcNm
} from '../../frame/lib/geo.js';
import {
  openData,
  endData
} from './sheet_view.js';
import {
  schedule
} from './draw.js';
import {
  syncButtons,
  frameFlight
} from './screen.js';
import {
  unpinAd
} from './vfr.js';
import {
  applyFlight
} from './data.js';

/** Part dont les couches de la Carte sont éteintes (render.js, option dim du dessin). */
export const DIM = .6;
const PAD = 3,
  // hauteur d'une ligne des petits cartouches de famille
  LINE_SM = 13;
/** Marge des cartouches au bord de la carte, et à droite la place de la colonne des boutons (px). */
const EDGE = 4,
  EDGE_R = 56;
/** Le code du terrain sous son symbole (la géométrie du libellé des terrains de la Carte : 1,9 symbole plus bas, gras). */
const AD_PX = 10,
  AD_FONT = `700 ${AD_PX}px Arial,sans-serif`,
  AD_DY = 6 * 1.9;
const num = v => v !== null && v !== undefined && v !== '' && Number.isFinite(+v);

// ---------------------------------------------------------------- l'entrée : l'adresse
/** La demande de l'adresse, lue et retirée d'elle (ctx.consume, une seule écriture) : { side, icao, … } ou null (rien demandé, une
 *  carte de mission, la page de réglage). L'état du mode vit dans S.choose tant qu'il dure. */
export function chooseAsk(ctx) {
  const got = ctx.consume ? ctx.consume('choose', 'icao') : {
      choose: ctx.query?.choose,
      icao: ctx.query?.icao
    },
    side = got.choose,
    icao = String(got.icao ?? '').trim().toUpperCase();
  if (ctx.query?.mission || ctx.query?.tune) return null;
  return askOf(side, icao);
}
/** La demande d'un côté et d'un terrain (vide : celui du vol), ou null si elle ne se lit pas : { side, icao, fromCard, ready, input,
 *  state, model, hits } — input : ce que le terrain et le vol disent, lu une fois (chooseLoad) ; state : le seul état du volet
 *  ({ sel, pend, open, hl }, paneState de frame/lib/pane_model.js) ; model : paneModel(input, state), refait quand la sélection,
 *  l'attente ou le dépliage changent (pas au survol) ; hits : les cadres touchables du dernier dessin. */
function askOf(side, icao, fromCard = false) {
  if (side !== 'dep' && side !== 'arr' || (icao && !/^[A-Z0-9]{4}$/.test(icao))) return null;
  return {
    side,
    icao,
    fromCard,
    ready: false,
    input: null,
    state: paneState(),
    model: null,
    slot: new Map(),
    hits: {
      lines: [],
      rows: []
    }
  };
}
/** Pose l'état s du volet ; le modèle n'est refait que si la sélection, l'attente ou le dépliage changent. Vrai s'il l'a été. */
function setState(C, s) {
  if (s === C.state) return false;
  const remodel = s.sel !== C.state.sel || s.pend !== C.state.pend || s.open !== C.state.open;
  C.state = s;
  if (remodel) C.model = paneModel(C.input, s);
  return remodel;
}

// ---------------------------------------------------------------- les lignes du modèle, et leurs textes
/** Lignes d'une famille du modèle (la transition de l'approche : ses sous-lignes). */
const rowsOf = (C, f) => (f === 'appTrans' ? C.model.subs : C.model.groups[f]?.rows) || [];
/** Lignes montrées d'une famille, dans l'ordre du modèle. */
const shownOf = (C, f) => {
  const g = C.model.groups[f],
    rows = g ? g.shown.map(id => g.rows.find(r => r.id === id)).filter(Boolean) : [];
  return f === 'rwy' ? bestFirst(rows) : rows;
};
/** Les pistes dont le vent du METAR est connu : la mieux orientée en tête (SOG-0306 : « comment choisir ? ») — le plus de vent de face (un vent arrière
 *  est négatif, il passe après), à égalité le moins de travers, à égalité encore l'ordre du modèle. Sans vent sur une piste, l'ordre du modèle. */
function bestFirst(rows) {
  if (rows.length < 2 || !rows.every(it => it.wind?.k)) return rows;
  return rows.map((it, i) => [it, i]).sort((a, b) => b[0].wind.k.head - a[0].wind.k.head || a[0].wind.k.cross - b[0].wind.k.cross || a[1] -
    b[1]).map(x => x[0]);
}
/** Le texte d'un libellé du modèle : « Piste 25 », sinon le nom et l'état de la source. */
const labelText = l => l.kind === 'rwy' ? tt(TX.chRwy, {
  r: l.r
}) : [l.name, l.src === 'x' ? tt(TX.procX) : l.src === 'lnm' ? tt(TX.procLnm) : ''].filter(Boolean).join(' · ');
/** Le texte d'une raison du ⚠. */
const whyText = w => w.kind === 'rwy' ? tt(TX.chConflictRwy, {
  rwy: w.rwy
}) : w.kind === 'starApp' ? tt(TX.chConflictStarApp, {
  app: w.app
}) : w.kind === 'rwyNotServed' ? tt(TX.chRwyNotServed, {
  p: w.p
}) : tt(TX.chNotFit);
/** « sortie LACOU » / « entrée OKRIX ». */
const offText = o => o ? tt(o.kind === 'exit' ? TX.chExit : TX.chEntry, {
  p: o.p
}) : '';
/** Le texte du vent d'une piste, en mots (SOG-0306 : « face 12 kt · travers 1 kt », « arrière 12 kt » : on le lit sans infobulle) ; une composante nulle
 *  est omise, « 0 kt » quand les deux le sont. Le côté d'où vient le vent reste dans l'infobulle (les flèches de frame/lib/wind.js label). */
const windWords = k => [k.head ? tt(k.head > 0 ? TX.chHead : TX.chTail, {
  n: Math.abs(k.head)
}) : '', k.cross ? tt(TX.chCross, {
  n: k.cross
}) : ''].filter(Boolean).join(' · ') || '0 kt';
/** Le vent d'une piste : le texte en mots et l'infobulle. */
const windTexts = (C, w) => ({
  text: windWords(w.k),
  tip: tt(TX.chWindTip, {
    id: C.icao,
    d: String(Math.round(C.input.wind.dir)).padStart(3, '0'),
    kt: Math.round(C.input.wind.kt),
    h: w.k.head,
    x: w.k.cross
  }) + ` — ${windLabel(w.k)} — ${tt(TX.chSev[w.sev])}`
});
/** Nom de famille d'une procédure pour un cartouche : le radical, une espace, le chiffre (« NIMER9A » → « NIMER 9 », PR.familyOf) ;
 *  le nom tel quel s'il n'a pas cette forme. */
const familyText = name => {
  const f = PR.familyOf(name);
  return f ? f.family.replace(/(\d)$/, ' $1') : name;
};
/** Texte d'une ligne de cartouche : le nom de famille sur les petits (une ligne par famille au point), le nom complet de la procédure
 *  sur celui de la surlignée (g.full : g.text). */
const cartText = (it, g = null) => g?.full ? g.text : it.fam === 'app' || it.fam === 'appTrans' ? labelText(it.label) : familyText(it
  .family || PR.nameOf(it.rec, it.id) || labelText(it.label));
/** Teinte d'une ligne : la procédure choisie (et la transition de son approche) a la couleur de la route ; une cochée, la teinte de son numéro
 *  (la première libre des huit, jour ou nuit) ; une candidate, le gris neutre. */
const hueOf = it => {
  const P = MapsRender.palette(!!S.theme?.dark),
    n = S.choose?.slot.get(it.id);
  return it.chosen || it.fam === 'appTrans' ? P.route : n ? P.procHues[(n - 1) % P.procHues.length] : S.theme.muted;
};
/** L'encre du numéro dans une pastille de teinte hex (« #rrggbb » ou « rgb(r, g, b) ») : la première de INKS qui tient 4,5 : 1 de contraste (WCAG) sur elle. La teinte ne
 *  bouge pas, c'est l'encre qui s'adapte : blanche sur les teintes de jour, sombre sur celles de nuit, noire sur l'orange de jour (blanc : 4,44). */
const INKS = ['#ffffff', '#101820', '#000000'],
  inkCache = new Map();

function relLum(rgb) {
  const [r, g, b] = rgb.map(v => {
    v /= 255;
    return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  });
  return .2126 * r + .7152 * g + .0722 * b;
}

function rgbOf(col) {
  const h = /^#([0-9a-f]{6})$/i.exec(col);
  if (h) return [0, 2, 4].map(i => parseInt(h[1].slice(i, i + 2), 16));
  const m = /rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/.exec(col);
  return m ? [+m[1], +m[2], +m[3]] : [128, 128, 128];
}
export function inkOn(col) {
  if (inkCache.has(col)) return inkCache.get(col);
  const L = relLum(rgbOf(col)),
    ratio = ink => {
      const l = relLum(rgbOf(ink)),
        [a, b] = L > l ? [L, l] : [l, L];
      return (a + .05) / (b + .05);
    },
    ink = INKS.find(i => ratio(i) >= 4.5) || INKS.reduce((best, i) => ratio(i) > ratio(best) ? i : best);
  inkCache.set(col, ink);
  return ink;
}
/** Une procédure qu'on peut cocher : ni piste ni transition de l'approche (qui suit l'approche choisie). */
const tickable = it => !!it && it.fam !== 'rwy' && it.fam !== 'appTrans';
/** Transitions de la procédure it (SID, STAR : PR.transitionsOf ; approche : appChoices), tracées en tireté quand elle est surlignée. */
function transOf(C, it) {
  const of = kind => C.input.records.filter(r => r.kind === kind);
  return it.fam === 'sid' ? PR.transitionsOf(of('SID'), it.id) : it.fam === 'star' ? PR.transitionsOf(of('STAR'), it.id) : it.fam ===
    'app' ? PR.appChoices(of('APP')).transitionsOf(it.id) : [];
}

// ---------------------------------------------------------------- le chargement
/** Lit ce qu'aerodb sait du terrain (procédures publiées, jamais les lectures douteuses ; pistes ; terrain) et le METAR déjà connu
 *  (cache de la couche météo du cadre, rien n'est demandé au réseau) en entrée du modèle, puis cadre la vue sur ce que le modèle dit
 *  de cadrer. Sans rien à montrer, le mode se retire avec une notification. Appelé au montage, après le vol et avant le fond de carte
 *  (qui part de S.fit). */
export async function chooseLoad() {
  const C = S.choose,
    A = S.ctx.aerodb,
    r = S.route.flight?.route || {},
    ask = make => Promise.resolve().then(make).then(v => v || [], () => []);
  C.icao ||= String((C.side === 'dep' ? r.dep : r.arr) || '').trim().toUpperCase();
  const [recs, known, ad, at, wx] = await Promise.all([ask(() => A?.procedures?.(C.icao)), ask(() => A?.runways?.(C.icao)), ask(() => A
    ?.aerodromes?.({
      icao: C.icao
    })), Promise.resolve().then(() => A?.coords?.(C.icao)).catch(() => null), Promise.resolve().then(() => S.ctx.weather?.metar?.([C
    .icao
  ], {
    cacheOnly: true
  })).catch(() => null)]);
  if (!S) return;
  const m = wx?.items?.[C.icao];
  C.input = {
    side: C.side,
    icao: C.icao,
    // jamais une fiche douteuse (PR.isDoubt : statut doubt, sans nom, « NONAME » ; la règle de Carburant)
    records: recs.filter(p => p?.id && !PR.isDoubt(p)),
    runways: known,
    ad: ad[0] || null,
    // la position du terrain : le cadre et, sur une route directe, le cap des SID et des STAR
    at: num(at?.lat) && num(at?.lon) ? {
      lat: +at.lat,
      lon: +at.lon
    } : null,
    cur: proceduresOf(S.route.flight)[C.side] || {},
    route: {
      points: r.points || [],
      dep: r.dep,
      arr: r.arr
    },
    // vent du METAR (directions vraies) ; variable (VRB) ou absent : pas de ligne
    wind: m && num(m.wdir) && num(m.wspd) ? {
      dir: +m.wdir,
      kt: +m.wspd
    } : null
  };
  C.model = paneModel(C.input, C.state);
  if (C.model.empty) {
    S.ctx.notify?.(tt(TX.chNoData, {
      icao: C.icao
    }), 'warn');
    S.choose = null;
    syncButtons(); // les boutons de la carte reviennent
    return;
  }
  // le terrain au centre du cadre (sixième lecture, manque 6) : le cadre du modèle, refait symétrique autour de lui — les procédures
  // d'une arrivée viennent d'un côté, le terrain ne reste pas au bord
  const mid = C.input.at,
    box = MapsRender.bboxOf(mid ? C.model.frame.flatMap(p => [p, {
      lat: 2 * mid.lat - p.lat,
      lon: 2 * mid.lon - p.lon
    }]) : C.model.frame, 3);
  if (box) {
    C.fit = box;
    S.fit = box;
  }
  C.ready = true;
}
/** Après un choix : la procédure choisie qui sort de la vue l'élargit à elle seule (la vue ne rétrécit jamais d'elle-même). */
function widenTo(it) {
  const pts = it ? ptsOf(it) : [];
  if (!pts.length || !S.fit) return;
  const bb = S.map?.getBounds?.(),
    v = bb ? {
      s: bb.getSouth(),
      n: bb.getNorth(),
      w: bb.getWest(),
      e: bb.getEast()
    } : S.fit;
  if (pts.every(p => p.lat >= v.s && p.lat <= v.n && p.lon >= v.w && p.lon <= v.e)) return;
  const box = MapsRender.bboxOf([{
    lat: v.s,
    lon: v.w
  }, {
    lat: v.n,
    lon: v.e
  }, ...pts], 3);
  if (!box) return;
  S.fit = box;
  if (S.map) frameFlight(true);
}
/** Le mode est-il ouvert ? (la classe de la boîte suit : le fond MapLibre s'estompe). */
export function chooseView() {
  const on = !!S?.choose;
  if (S?.box && S.box.classList.contains('mp-choosing') !== on) S.box.classList.toggle('mp-choosing', on);
}
/** Le mode s'ouvre une fois les données lues : la feuille porte le volet, dépliée (les trois familles sous les yeux, la carte
 *  recadrée au-dessus ; parcours du 30/10, point 7), le fond s'estompe. */
export function chooseStart() {
  chooseView();
  syncButtons(); // Couches et les boutons du vol se retirent pendant le choix
  chooseRender();
  if (S.sh && S.sh.pos !== 'expanded') {
    S.choose.sheetFrom ??= S.sh.pos; // rendue à la sortie : le choix ne laisse pas la feuille haute (SPEC § 7.1)
    S.sh.set('expanded', true);
  }
  schedule();
}
/** Le mode s'ouvre depuis la carte du terrain (« Choisir sur la carte ») : le même chemin que #maps?choose=, sans rechargement ;
 *  la vue se recadre sur les procédures. */
export async function chooseOpen(side, icao) {
  const ask = askOf(side, String(icao ?? '').trim().toUpperCase(), true);
  if (!S || !ask || onMission()) return;
  unpinAd();
  S.choose = ask;
  syncButtons();
  chooseView();
  await chooseLoad();
  if (!S) return;
  if (S.choose !== ask) return chooseView(); // rien à montrer (notifié) ou une autre demande : la classe suit
  chooseStart();
  if (S.map) frameFlight(true);
}
/** La seule sortie du volet (« Terminer », ✕, Échap ; refonte R-M1) : tout ce qui a été choisi part vers Carburant en un seul retour
 *  (paneReturn : #fuel?focus=<côté>&rwy=…&star=…&app=…&apptrans=…, « none » pour « Aucune »), qui l'écrit ; la Carte n'écrit jamais.
 *  Rien de choisi : retour à Carburant sur ce côté, ou, ouvert depuis la carte du terrain, à la carte du vol sans rechargement (la
 *  carte reprend le vol entier et son cadre, la feuille son profil). */
export async function chooseClose() {
  const C = S?.choose;
  if (!C) return;
  const to = paneReturn(C.side, C.state);
  if (C.sheetFrom && S.sh && S.sh.pos !== C.sheetFrom) S.sh.set(C.sheetFrom, true); // la position d'avant le choix
  if (to || !C.fromCard) return location.replace(to || `#fuel?focus=${C.side}`);
  S.choose = null;
  chooseView();
  endData('choose');
  syncButtons();
  await applyFlight(false);
  if (S?.map && !S.choose) frameFlight(true);
}

// ---------------------------------------------------------------- choisir
/** Pose le choix de la famille fam (id, « none » pour « Aucune ») dans le volet (panePick : l'attente d'une famille, la piste posée
 *  par une procédure, la transition remise à « Aucune ») ; rien n'est écrit : la sélection reste dans le volet et sur la carte jusqu'à
 *  la fermeture. */
export function choosePick(fam, id) {
  const C = S?.choose;
  if (!C?.ready) return;
  const before = C.state;
  setState(C, panePick(C.input, C.state, fam, id));
  if (C.state === before) return;
  C.slot.delete(id); // la choisie prend la couleur de la route et libère son numéro
  chooseRender();
  if (C.state.sel[fam] && fam !== 'rwy' && C.state.sel !== before.sel) widenTo(rowsOf(C, fam).find(it => it.chosen));
  schedule();
}
/** Coche (ou décoche) la procédure id pour la comparer (ligne de la liste ou toucher de la carte) : elle prend le plus petit numéro libre ; la
 *  neuvième est refusée par la phrase décidée, en notification flottante, et rien ne change. Une choisie, une piste ou une transition ne se
 *  cochent pas. Vrai si l'état a changé. */
export function tick(id) {
  const C = S?.choose;
  if (!C?.ready) return false;
  const it = C.model.rows.find(i => i.id === id);
  if (!tickable(it) || it.chosen) return false;
  if (C.slot.has(id)) C.slot.delete(id);
  else {
    if (C.slot.size >= MAX_TICKS) {
      S.ctx.notify?.(tt(TX.chMax), 'warn', {
        key: 'maps-choose-max'
      });
      return false;
    }
    const used = new Set(C.slot.values());
    let n = 1;
    while (used.has(n)) n++;
    C.slot.set(id, n);
  }
  chooseRender();
  schedule();
  return true;
}
/** Le groupe d'une famille sous les yeux (une tape sur son libellé dans la sélection) : déplié s'il était replié, la feuille
 *  défile jusqu'à lui. */
function gotoFamily(f) {
  const C = S?.choose;
  if (!C?.ready || !FAMS[C.side].includes(f)) return;
  if (setState(C, paneGoto(C.input, C.state, f))) chooseRender();
  S.dbodyEl.querySelector(`.mp-ch-grp[data-fam="${f}"]`)?.scrollIntoView({
    block: 'start'
  });
}
/** La ligne de correction du modèle en textes : { text, fam, val, act } ou null. */
function fixText(fix) {
  if (!fix) return null;
  return fix.kind === 'serves' ? {
    text: tt(TX.chServes, {
      p: fix.p,
      r: fix.r
    }),
    fam: fix.fam,
    val: fix.val,
    act: tt(TX.chUseRwy, {
      r: fix.r
    })
  } : {
    text: tt(TX.chNotServes, {
      p: fix.p,
      r: fix.r
    }),
    fam: fix.fam,
    val: fix.val,
    act: fix.alt ? tt(TX.chUseProc, {
      p: fix.alt
    }) : ''
  };
}

// ---------------------------------------------------------------- la feuille : titre, groupes, Terminer
/** Ligne d'un groupe : l'échantillon de teinte (pas pour les pistes), le nom, le vent (pistes), ⌛ (gris) et ⚠ (orange) en fin de
 *  ligne ; la ligne choisie pressée. */
function rowHtml(C, it) {
  const why = it.why.map(whyText),
    wind = it.wind ? windTexts(C, it.wind) : null,
    off = offText(it.off),
    proc = tickable(it),
    n = proc ? C.slot.get(it.id) || 0 : 0,
    tip = [it.title || '', it.old ? tt(TX.procOutdated) : '', ...why, wind?.tip || '', proc && !it.chosen ? tt(n ? TX.chUntick : TX
      .chTick) : ''].filter(Boolean).join(' · '),
    // une procédure : cochable (rôle case à cocher) ou, choisie, un état (la couleur de la route, « choisie pour le vol », ni case ni bouton)
    mark = !proc ? (it.fam === 'rwy' ? '' : '<i class="mp-ch-sw" aria-hidden="true"></i>') : it.chosen ?
    '<i class="mp-ch-sw" aria-hidden="true"></i>' : `<i class="mp-ch-n" data-n="${n}" aria-hidden="true">${n || ''}</i>`,
    kind = !proc ? ` aria-pressed="${it.chosen}"` : it.chosen ? ` aria-pressed="true" data-state="chosen"` : ` role="checkbox" aria-checked="${!!n}" data-state="${n ? 'tick' : 'cand'}"`,
    row = `<button type="button" class="mp-ch-row" data-fam="${it.fam}" data-id="${esc(it.id)}" data-hl="${C.state.hl === it.id ? 1 : 0}"${kind}${it.fam === 'rwy' ? '' : ` style="--c:${hueOf(it)};--ink:${inkOn(hueOf(it))}"`}${tip ? ` title="${esc(tip)}"` : ''}>${mark}<span class="mp-ch-name">${esc(labelText(it.label))}${proc && it.chosen ? `<small>${esc(tt(TX.chChosen))}</small>` : ''}</span>${(it.tags || []).map(t => `<span class="mp-ch-tag">${esc(t)}</span>`).join('')}${off ? `<span class="mp-ch-off">${esc(off)}</span>` : ''}${it.dir?.deg != null ? `<span class="mp-ch-dir" style="--r:${Math.round(it.dir.deg)}deg" role="img" aria-label="${esc(tt(TX.chDir, { c: String(Math.round(it.dir.deg) % 360).padStart(3, '0') }))}">↑</span>` : ''}${wind ? `<span class="mp-ch-wind" data-sev="${esc(it.wind.sev)}" data-tail="${it.wind.k.head < 0 ? 1 : 0}">${esc(wind.text)}</span>` : ''}${it.old ? `<span class="mp-ch-old" role="img" aria-label="${esc(tt(TX.procOutdated))}">⌛</span>` : ''}${why.length ? `<span class="mp-ch-warn" role="img" aria-label="${esc(why.join(' · '))}">⚠</span>` : ''}</button>`;
  // « Choisir » seulement sur une ligne cochée (huit boutons au plus, aucun quand rien n'est coché)
  return n ? `<div class="mp-ch-item" style="--c:${hueOf(it)};--ink:${inkOn(hueOf(it))}">${row}<button type="button" class="f-btn mp-ch-pick" data-pick="${esc(it.id)}" data-fam="${it.fam}">${esc(tt(TX.chPick))}</button></div>` : row;
}
/** La liaison manquante entre l'arrivée choisie et l'approche choisie (SOG-0569, décision 4 : la liste de la scène « Sans raccord » de la maquette EST celle de ce mode) : la
 *  phrase procNoLink, MOT POUR MOT celle de la note sous le profil (procs.js gapNote), sous la ligne d'état de l'approche ; rien quand l'approche reprend la fin de la STAR (même
 *  règle que procGap : même nom à moins de 3 NM, sinon à moins de 0,3 NM) ou quand l'une des deux n'est pas choisie. */
function gapHtml(C) {
  const star = C.model.rows.find(i => i.fam === 'star' && i.chosen),
    app = C.model.rows.find(i => i.fam === 'app' && i.chosen);
  if (!star || !app) return '';
  const e = ptsOf(star).at(-1),
    b = ptsOf(app)[0];
  if (!e?.id || !b?.id) return '';
  const same = gcNm(e, b) < (e.id.toUpperCase() === b.id.toUpperCase() ? 3 : .3);
  if (same) return '';
  const m = star.members ? star.members.find(x => x.chosen) || star.members[0] : star;
  return `<p class="mp-ch-gap" data-proc-gap>${esc(tt(TX.procNoLink, {
    fin: e.id,
    arrivee: m.label.name || labelText(m.label),
    debut: b.id
  }))}</p>`;
}
/** Sous-lignes de l'approche choisie : « Sans transition », puis ses transitions (V3 § 10.30 : la transition sous l'approche). */
function subsHtml(C) {
  const subs = C.model.subs;
  if (!subs.length) return '';
  const none = C.model.choice.appTrans === null;
  return `<div class="mp-ch-subs" role="group" aria-label="${esc(tt(TX.chTrans))}"><button type="button" class="mp-ch-row mp-ch-sub mp-ch-none" data-fam="appTrans" data-id="none" data-hl="0" aria-pressed="${none}"><span class="mp-ch-name">${esc(tt(TX.chNoTrans))}</span></button>${subs.map(it => rowHtml(C, it).replace('class="mp-ch-row"', 'class="mp-ch-row mp-ch-sub"')).join('')}</div>`;
}
/** Un groupe : son titre (une étiquette fine), « Aucune » (pressée quand elle est le choix), les lignes montrées (six au plus ; sous
 *  l'approche choisie ses transitions), la ligne fine « N autres · Toutes » qui déplie le reste marqué ⚠ (et le replie), la ligne de
 *  correction. */
function groupHtml(C, fam) {
  const g = C.model.groups[fam],
    list = g.rows,
    o = C.model.choice,
    noneOn = fam in o && o[fam] === null,
    fold = g.folded > 0 ? tt(TX.chFold, {
      n: g.folded
    }) : C.state.open.more[fam] && list.some(it => it.why.length) ? tt(TX.chFoldLess) : '',
    fix = fixText(g.fix),
    head = g.head?.kind === 'toRoute' ? tt(TX.chToRoute) : g.head?.kind === 'toward' ? tt(TX.chToward, {
      icao: g.head.icao
    }) : '',
    rows = (head ? `<div class="mp-ch-subh">${esc(head)}</div>` : '') + shownOf(C, fam).map(it => rowHtml(C, it) + (fam === 'app' && it
      .chosen ? gapHtml(C) + subsHtml(C) : '')).join('');
  const title = tt((TX.chGrp[fam] || TX.chFam[fam]));
  return `<section class="mp-ch-grp" data-fam="${fam}"><h4 class="mp-ch-head">${esc(title)}</h4><div class="mp-ch-list" role="group" aria-label="${esc(title)}">${noneOn ? `<div class="mp-ch-row mp-ch-none" data-state="chosen" data-fam="${fam}" data-id="none" data-hl="0"><span class="mp-ch-name">${esc(tt(TX.chNone))} · ${esc(tt(TX.chChosen))}</span></div>` : `<button type="button" class="mp-ch-row mp-ch-none" data-fam="${fam}" data-id="none" data-hl="0" aria-pressed="false"><span class="mp-ch-name">${esc(tt(TX.chNone))}</span></button>`}${rows}${fold ? `<button type="button" class="mp-ch-fold" data-more="${fam}" aria-expanded="${!!C.state.open.more[fam]}">${esc(fold)}</button>` : ''}</div>${fix ? `<p class="mp-ch-fix">${esc(fix.text)}${fix.val ? ` <button type="button" class="f-btn" data-fix="${fix.fam}" data-val="${esc(fix.val)}">${esc(fix.act)}</button>` : ''}</p>` : ''}${list.length ? '' : `<p class="f-muted mp-ch-empty">${esc(tt(TX.chEmpty, { icao: C.icao }))}</p>`}</section>`;
}
/** La sélection en tête du volet (le résumé du modèle) : une ligne par famille (« Piste 28L · ↑ 12 kt · ← 6 kt », « ABLI4L », « I28L
 *  via PIZSA ») ; une famille posée avant sa piste dit son nom et ses pistes. */
function summaryHtml(C) {
  const sum = C.model.summary,
    proc = C.side === 'dep' ? 'sid' : 'star',
    lines = [],
    line = (f, text) => {
      const it = rowsOf(C, f).find(i => i.chosen),
        k = tt(TX.chFam[f]),
        v = text === undefined ? '—' : text === null ? tt(TX.chNone) : text;
      // le libellé mène au groupe de la famille (table des matières du volet)
      lines.push(`<div class="mp-ch-sum" data-fam="${f}"${f === 'rwy' || !it ? '' : ` style="--c:${hueOf(it)}"`}><button type="button" class="mp-ch-sum-k" data-goto="${f}" title="${esc(tt(TX.chGoto, { f: k }))}">${esc(k)}</button><span class="mp-ch-sum-v">${esc(v)}</span></div>`);
    };
  line('rwy', sum.rwy);
  line(proc, sum.proc && typeof sum.proc === 'object' ? [sum.proc.family, sum.proc.runways.join('/')].filter(Boolean).join(' · ') : sum
    .proc);
  if (C.side === 'arr') line('app', sum.app);
  return `<div class="mp-ch-sums">${lines.join('')}</div>`;
}
/** Le corps de la feuille : la consigne, la sélection, les groupes du côté, « Terminer ». */
function bodyHtml(C) {
  const lnm = C.model.rows.some(it => it.label?.src === 'lnm'); // une procédure lue de Little Navmap le dit là où on la choisit (SOG-0210)
  return `<div class="mp-ch"><p class="f-muted mp-ch-hint">${esc(tt(TX.chHint))} <b class="mp-ch-cnt" role="status">${C.slot.size} / ${MAX_TICKS}</b></p>${lnm ? `<p class="mp-ch-lnm" role="note">${esc(tt(TX.procLnmWarn))}</p>` : ''}${summaryHtml(C)}${FAMS[C.side].map(f => groupHtml(C, f)).join('')}<button type="button" class="f-btn primary mp-ch-done" data-done="1">${esc(tt(TX.chDone))}</button></div>`;
}
/** (Re)dessine le contenu de la feuille ; écrit seulement si le HTML change (openData). */
export function chooseRender() {
  const C = S?.choose;
  if (!C?.ready) return;
  const title = tt(TX.chSide[C.side], {
    icao: C.icao
  });
  openData('choose', `choose:${C.side}:${C.icao}`, title, () => bodyHtml(C), title);
}
/** Surligne la ligne id (ligne, cartouche, tracé) ou plus rien (paneHl) ; fromMap : sa famille au premier plan, son groupe déplié si
 *  elle y est repliée, et elle vient sous les yeux. Sans dépliage, les lignes ne sont pas refaites : seul leur data-hl change. */
export function setHl(id, fromMap = false) {
  const C = S?.choose;
  if (!C?.ready) return;
  const it = id ? C.model.rows.find(i => i.id === id) : null,
    hl = it ? id : null;
  if (C.state.hl === hl) return;
  const reopened = setState(C, paneHl(C.input, C.state, id, fromMap));
  for (const b of S.dbodyEl.querySelectorAll('.mp-ch-row')) setData(b, 'hl', b.dataset.id === hl ? '1' : '0');
  if (reopened) chooseRender();
  if (it && fromMap) S.dbodyEl.querySelector(`.mp-ch-row[data-id="${CSS.escape(hl)}"]`)?.scrollIntoView({
    block: 'nearest'
  });
  schedule();
}
/** Gestes de la feuille (délégués : le HTML est refait) : un toucher sur une ligne pose le choix de sa famille, sur « N autres… »
 *  déplie le groupe, sur la ligne de correction l'applique, sur « Terminer » rend le tout à Carburant ; le survol et le focus d'une
 *  ligne la surlignent sur la carte. Rend la fonction d'arrêt. */
export function chooseEvents() {
  const el = S.dbodyEl,
    on = () => S?.dpanel === 'choose',
    click = e => {
      const pick = e.target.closest('[data-choose]');
      if (pick) return chooseOpen(pick.dataset.choose, pick.dataset.icao); // la carte du terrain
      if (!on()) return;
      const C = S.choose,
        more = e.target.closest('[data-more]'),
        fix = e.target.closest('[data-fix]'),
        row = e.target.closest('.mp-ch-row[data-fam]');
      if (e.target.closest('[data-done]')) return chooseClose();
      if (more) {
        setState(C, paneFold(C.input, C.state, more.dataset.more));
        return chooseRender();
      }
      const keep = e.target.closest('[data-pick]');
      if (keep) return choosePick(keep.dataset.fam, keep.dataset.pick);
      const go = e.target.closest('[data-goto]');
      if (go) return gotoFamily(go.dataset.goto);
      if (fix) return choosePick(fix.dataset.fix, fix.dataset.val);
      if (!row) return;
      // une procédure se coche ; la choisie est un état (rien à toucher) ; « Aucune », une piste et une transition se posent
      if (row.dataset.state === 'chosen') return;
      if (row.dataset.state) return tick(row.dataset.id);
      choosePick(row.dataset.fam, row.dataset.id);
    },
    over = e => {
      if (on()) setHl(e.target.closest('.mp-ch-row')?.dataset.id ?? null);
    },
    out = e => {
      if (on() && !e.relatedTarget?.closest?.('.mp-ch-row')) setHl(null);
    },
    ev = [
      ['click', click],
      ['pointerover', over],
      ['focusin', over],
      ['pointerout', out],
      ['focusout', out]
    ];
  for (const [k, f] of ev) el.addEventListener(k, f);
  return () => {
    for (const [k, f] of ev) el.removeEventListener(k, f);
  };
}

// ---------------------------------------------------------------- sur la carte : mise en page, dessin, toucher
/** Distance de (x, y) au segment ab. */
function distSeg(x, y, a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    l = dx * dx + dy * dy,
    t = l ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l)) : 0;
  return Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
}
/** La pastille d'une cochée (rayon), les endroits essayés le long du tracé (part de sa longueur) pour la pastille puis pour le nom, la police du nom. */
const DISC_R = 9,
  DISC_AT = [.15, .25, .35, .45, .08, .55, .65],
  // SOG-0569 : le nom glisse le long du tracé jusqu'à une place qui tient dans la carte ; la fin du tracé (.8, .9, près de l'aérodrome) et son début (.1) s'ajoutent aux six places d'origine, car un long tracé (une STAR de plus de 100 NM) peut n'avoir ses places d'origine que hors de la carte
  NAME_AT = [.2, .3, .4, .5, .6, .7, .8, .9, .1],
  NAME_FONT = '600 11px Arial,sans-serif';
/** Le point à la part f (0 à 1) de la longueur d'une ligne en px. */
function along(pts, f) {
  const seg = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    seg.push(l);
    total += l;
  }
  let d = f * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) {
      const t = seg[i] ? Math.min(1, d / seg[i]) : 0;
      return {
        x: pts[i].x + t * (pts[i + 1].x - pts[i].x),
        y: pts[i].y + t * (pts[i + 1].y - pts[i].y)
      };
    }
    d -= seg[i];
  }
  return pts[0];
}
/** Les noms à écrire le long d'un tracé : la choisie d'abord, puis les cochées dans l'ordre de leur numéro ({ it, text, pts, disc }). */
function namesOf(C, L) {
  if (L.nameList) return L.nameList;
  const own = it => L.traces.find(t => t.it.id === it.id && !t.dash && !t.join),
    out = [];
  for (const it of C.model.rows.filter(i => i.chosen && tickable(i))) {
    const t = own(it);
    if (t && t.pts.length > 1) out.push({
      it,
      text: cartText(it),
      pts: t.pts,
      disc: null
    });
  }
  for (const d of L.discs) {
    const t = own(d.it);
    if (t) out.push({
      it: d.it,
      text: cartText(d.it),
      pts: t.pts,
      disc: d
    });
  }
  return L.nameList = out;
}
/** Largeur d'une ligne de cartouche : l'échantillon, le nom, ⌛ et ⚠ (la police étant posée). */
const rowWidth = (ctx, it, g = null) => 12 + ctx.measureText(cartText(it, g)).width + (it.old ? 4 + ctx.measureText('⌛').width : 0) + (it
  .why.length ?
  4 +
  ctx.measureText('⚠').width : 0);
/** Mise en page du mode à l'écran (projection toC) : { traces, arrows, groups, reserve(pl), paint(ctx), top(ctx) } ; null hors du
 *  mode. La sélection en cours reste dessinée : toutes les pistes (la choisie en gras), toutes les procédures de la famille touchée
 *  (estompées sauf la choisie quand il y en a une), la procédure choisie des autres familles et la transition choisie de l'approche.
 *  Les cadres touchables (tracés, lignes des cartouches) sont rangés dans S.choose.hits pour le toucher et le survol. Tant que les
 *  données ne sont pas lues, rien n'est tracé (les couches de la Carte sont déjà estompées). */
export function chooseLayout(ctx, toC, W = 0, H = 0) {
  const C = S.choose;
  if (!C) return null;
  const L = {
    traces: [],
    arrows: [],
    groups: [],
    reserve() {},
    paint() {},
    top() {}
  };
  C.hits = {
    lines: [],
    rows: []
  };
  if (!C.ready) return L;
  const hl = C.state.hl,
    o = C.model.choice,
    // la choisie n'est pas touchable sur la carte (elle ne se coche pas) : une candidate sous elle reste atteignable
    trace = (it, pts, extra = {}) => {
      if (!pts.length) return;
      L.traces.push({
        it,
        pts,
        dim: !it.chosen && !C.slot.has(it.id) && it.id !== hl, // une candidate : trait fin gris
        ...extra
      });
      if (!it.chosen) C.hits.lines.push({
        id: it.id,
        pts
      });
    };
  // les pistes : toutes, la choisie en gras
  for (const it of rowsOf(C, 'rwy')) {
    const a = arrowOf(toC, it.rec, C.input.runways, C.input.ad?.magVar, it.chosen ? S.theme.fg : S.theme.muted);
    if (!a) continue;
    a.lw = it.chosen ? 3.5 : it.id === hl ? 2.8 : 2;
    L.arrows.push(a);
    C.hits.lines.push({
      id: it.id,
      pts: [a.a, a.b]
    });
  }
  // les procédures : la famille touchée entière en CANDIDATES (trait fin gris, sans nom) ; à l'entrée (rien de touché que les pistes), celles de la
  // première famille de procédures (sixième lecture, manque 6) ; la choisie de chaque famille (couleur de la route) et les cochées (leur teinte)
  // quelle que soit leur famille
  const drawn = new Set(),
    add = (it, extra = {}) => {
      if (drawn.has(it.id)) return;
      drawn.add(it.id);
      for (const m of it.members || [it]) trace(it, m.pts.map(p => toC(p.lat, p.lon)), extra);
    },
    first = C.model.focus === 'rwy' || !C.model.focus ? FAMS[C.side].find(f => f !== 'rwy' && shownOf(C, f).length) : null;
  for (const f of FAMS[C.side].filter(f => f !== 'rwy')) {
    const list = rowsOf(C, f);
    if (f === C.model.focus || (f === first && !list.some(i => i.chosen)))
      for (const it of shownOf(C, f)) add(it);
    for (const it of list)
      if (it.chosen || C.slot.has(it.id)) add(it);
  }
  // la ligne survolée, de quelque famille qu'elle soit (V3 § 10.30) : sa trace aussi, même hors de la famille touchée
  const over = hl && !drawn.has(hl) && C.model.rows.find(i => i.id === hl && i.fam !== 'rwy');
  if (over) {
    if (over.fam === 'appTrans')
      for (const m of over.members || [over]) trace(over, m.pts.map(p => toC(p.lat, p.lon)), {
        dash: true
      });
    else add(over);
  }
  // transitions : celles de la procédure surlignée, et la transition choisie de l'approche
  const on = hl && C.model.rows.find(i => i.id === hl && drawn.has(i.id));
  if (on)
    for (const t of transOf(C, on)) trace(on, pointsOf(t).map(p => toC(p.lat, p.lon)), {
      dash: true
    });
  const at = C.model.subs.find(i => i.chosen);
  if (at) {
    const tp = pointsOf(at.rec),
      fin = o.app && C.input.records.find(r => r.id === o.app),
      fp = fin ? pointsOf(fin) : [],
      shared = tp.some(p => p.id && fp.some(q => q.id === p.id));
    trace(at, tp.map(p => toC(p.lat, p.lon)), {
      dash: true
    });
    // sans point commun, la jonction de la fin de la transition au premier point de la finale est un tireté (§ 10.20)
    if (!shared && tp.length && fp.length) trace(at, [tp.at(-1), fp[0]].map(p => toC(p.lat, p.lon)), {
      dash: true,
      join: true
    });
  }
  // ordre de dessin : du dessous au dessus, les candidates, les cochées, la choisie, la surlignée en dernier
  const rank = it => it.id === hl ? 4 : it.chosen ? 3 : C.slot.has(it.id) ? 2 : 0;
  L.traces.sort((a, b) => rank(a.it) - rank(b.it));
  // plus de cartouche par point de sortie ou d'entrée : les candidates n'ont pas de nom ; la surlignée a le sien (nom complet), les cochées
  // et la choisie leur nom le long de leur tracé (reserve), les cochées leur numéro dans une pastille posée là où le tracé est seul
  L.groups = [];
  const hit = on || (hl && C.model.rows.find(i => i.id === hl && i.fam !== 'rwy')),
    hm = hit && ((hit.members || []).find(m => m.chosen) || (hit.members || [hit])[0]);
  L.hl = hm?.anchor ? {
    q: toC(hm.anchor.lat, hm.anchor.lon),
    rows: [hit],
    full: true,
    text: labelText(hit.members ? hm.label : hit.label)
  } : null;
  // le code du terrain, sous son symbole comme le pose la Carte : sa place est prise avant toute cartouche de procédure (terrains >
  // procédures, parcours du 30/10, point 8) et il est écrit par-dessus le voile ; celui que la Carte aurait posé ne trouve plus sa place
  const ap = C.input.at ? toC(C.input.at.lat, C.input.at.lon) : null;
  L.ad = ap ? {
    x: ap.x,
    y: ap.y + AD_DY,
    text: C.icao,
    col: C.input.ad?.state ? '#d6173f' : '#1d4a9e'
  } : null;
  // la pastille de chaque cochée (numéro dans sa teinte) : posée sur la partie de son tracé qui est la plus seule (loin des autres tracés, des autres
  // pastilles et du terrain), au premier des endroits essayés qui est assez libre, sinon au meilleur
  const lone = L.traces.filter(t => !t.dash && !t.join),
    away = (p, lines) => Math.min(Infinity, ...lines.map(l => l.reduce((m, q, i) => i ? Math.min(m, distSeg(p.x, p.y, l[i - 1], q)) : m,
      Infinity)));
  L.discs = [];
  for (const [id, n] of [...C.slot].sort((a, b) => a[1] - b[1])) {
    const t = lone.find(x => x.it.id === id);
    if (!t || t.pts.length < 2) continue;
    const others = lone.filter(x => x.it.id !== id).map(x => x.pts);
    let best = null;
    for (const f of DISC_AT) {
      const p = along(t.pts, f),
        score = Math.min(away(p, others) / 14, Math.min(Infinity, ...L.discs.map(d => Math.hypot(p.x - d.x, p.y - d.y))) / 24, ap ? Math
          .hypot(p.x - ap.x, p.y - ap.y) / 20 : Infinity);
      if (!best || score > best.score) best = {
        x: p.x,
        y: p.y,
        score
      };
      if (score >= 1) break;
    }
    if (best) L.discs.push({
      x: best.x,
      y: best.y,
      n,
      it: t.it,
      col: hueOf(t.it)
    });
  }
  // rejouée par chaque tour de la passe unique : les lignes touchables et les places repartent de zéro
  L.reserve = pl => {
    C.hits.rows.length = 0;
    ctx.save();
    if (L.ad) {
      ctx.font = AD_FONT;
      const w = ctx.measureText(L.ad.text).width;
      L.ad.r = {
        x0: L.ad.x - w / 2 - 2,
        y0: L.ad.y,
        x1: L.ad.x + w / 2 + 2,
        y1: L.ad.y + AD_PX + 2
      };
      MapsRender.kit.ask(pl, {
        layer: 'screenLabels',
        rank: 'aerodrome',
        key: C.icao,
        anchor: ap,
        force: 'reserve',
        boxes: [L.ad.r]
      });
    }
    // les numéros de piste ensuite, avant les cartouches et les balises de la Carte
    reserveRunways(ctx, L.arrows, pl);
    // les pastilles d'abord (une place qu'on ne perd pas), puis les noms le long de leur tracé : la choisie, puis les cochées dans l'ordre de leur numéro ;
    // un nom qui n'a pas de place n'est pas écrit (la pastille dit déjà le numéro)
    for (const d of L.discs) MapsRender.kit.ask(pl, {
      layer: 'screenLabels',
      rank: 'procedure',
      key: `disc:${d.it.id}`,
      anchor: d,
      force: 'reserve',
      boxes: [{
        x0: d.x - DISC_R,
        y0: d.y - DISC_R,
        x1: d.x + DISC_R,
        y1: d.y + DISC_R
      }]
    });
    ctx.font = NAME_FONT;
    for (const t of namesOf(C, L)) {
      const w = ctx.measureText(t.text).width + 4,
        qs = [...(t.disc ? [t.disc] : []), ...NAME_AT.map(f => along(t.pts, f))];
      // SOG-0569 : un nom ne passe pas le bord de la carte (à 390 le nom de la quatrième cochée était coupé par le bord haut) ni ne se met sous la colonne des boutons de droite : seules les places
      // dont la boîte tient dans la carte sont proposées, le nom glisse le long de sa trace jusqu'à l'une d'elles, sinon il n'est pas écrit (la pastille dit déjà le numéro)
      t.r = place(pl, qs, w, 14, false, `name:${t.it.id}`, W && H ? {
        x0: EDGE,
        y0: EDGE,
        x1: W - EDGE_R,
        y1: H - EDGE
      } : null);
    }
    L.names = namesOf(C, L).filter(t => t.r);
    // la surlignée d'abord : sa place est la meilleure, les autres l'évitent ; elle est toujours posée
    const put = (g, force) => {
      ctx.font = g.full ? '700 11px Arial,sans-serif' : '600 10px Arial,sans-serif';
      const w = Math.max(...g.rows.map(it => rowWidth(ctx, it, g))) + 2 * PAD + 2;
      const h = g.rows.length * (g.full ? LINE_H : LINE_SM) + 2 * PAD,
        r = place(pl, g.q, w, h, force);
      g.hidden = false;
      g.r = null;
      // sous le zoom où deux cartouches se recouvrent, celle d'une famille non surlignée est cachée (sa trace reste)
      if (!r) return g.hidden = true;
      // le cartouche reste dans la carte, hors de la colonne des boutons de droite
      const dx = W ? Math.min(0, W - EDGE_R - r.x1) || Math.max(0, EDGE - r.x0) : 0,
        dy = H ? Math.min(0, H - EDGE - r.y1) || Math.max(0, EDGE - r.y0) : 0,
        lh = g.full ? LINE_H : LINE_SM;
      g.r = {
        x0: r.x0 + dx,
        x1: r.x1 + dx,
        y0: r.y0 + dy,
        y1: r.y1 + dy
      };
      g.rows.forEach((it, i) => C.hits.rows.push({
        id: it.id,
        x0: g.r.x0,
        x1: g.r.x1,
        y0: g.r.y0 + PAD + i * lh,
        y1: g.r.y0 + PAD + (i + 1) * lh
      }));
    };
    if (L.hl) put(L.hl, true);
    for (const g of L.groups) put(g, false);
    ctx.restore();
  };
  L.paint = (c, pl = null) => {
    c.save();
    c.lineJoin = 'round';
    c.lineCap = 'round';
    for (const t of L.traces) {
      const chosen = !!t.it.chosen,
        ticked = C.slot.has(t.it.id),
        lit = t.it.id === hl,
        strong = chosen || ticked,
        path = () => {
          c.beginPath();
          t.pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
          c.stroke();
        },
        halo = chosen ? ROUTE_HALO : ticked ? (lit ? 7.5 : 6) : lit ? 6 : 0;
      c.setLineDash(t.dash ? [7, 5] : []);
      // la choisie : la couleur et l'épaisseur de la route ; une cochée : sa teinte ; une candidate : fine, grise, et la surlignée en trait plein
      if (halo) {
        c.globalAlpha = .8;
        c.strokeStyle = S.theme.bg;
        c.lineWidth = halo;
        path();
      }
      c.globalAlpha = strong || lit ? 1 : .55;
      c.strokeStyle = strong ? hueOf(t.it) : lit ? S.theme.fg : S.theme.muted;
      c.lineWidth = chosen ? ROUTE_W : ticked ? (lit ? 5 : 3.5) : lit ? 3 : 1.5;
      path();
    }
    c.setLineDash([]);
    c.globalAlpha = 1;
    // les pastilles des cochées : un disque de leur teinte, le numéro dedans
    c.font = '700 11px Arial,sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (const d of L.discs) {
      c.beginPath();
      c.arc(d.x, d.y, DISC_R, 0, Math.PI * 2);
      c.fillStyle = d.col;
      c.fill();
      c.lineWidth = 1.5;
      c.strokeStyle = S.theme.bg;
      c.stroke();
      c.fillStyle = inkOn(d.col);
      c.fillText(String(d.n), d.x, d.y + .5);
    }
    // le point de sortie ou d'entrée de chaque cartouche
    for (const g of [...L.groups, ...(L.hl ? [L.hl] : [])]) {
      const lit = g.rows.find(i => i.id === hl) || g.rows.find(i => i.chosen);
      c.beginPath();
      c.arc(g.q.x, g.q.y, 4, 0, Math.PI * 2);
      c.fillStyle = S.theme.bg;
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = lit ? hueOf(lit) : S.theme.fg;
      c.stroke();
    }
    c.restore();
    drawRunways(c, L.arrows, pl); // dans la passe de collision : un numéro sans place (une balise, un cartouche) n'est pas écrit
  };
  L.top = c => {
    c.save();
    if (L.ad?.r) {
      c.font = AD_FONT;
      c.textAlign = 'center';
      c.textBaseline = 'top';
      c.lineJoin = 'round';
      c.lineWidth = 3;
      c.strokeStyle = S.theme.bg;
      c.strokeText(L.ad.text, L.ad.x, L.ad.y);
      c.fillStyle = L.ad.col;
      c.fillText(L.ad.text, L.ad.x, L.ad.y);
    }
    // les noms des cochées et de la choisie, le long de leur tracé, dans leur couleur, sur un liseré du fond
    c.font = NAME_FONT;
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    for (const t of L.names || []) {
      c.lineWidth = 3;
      c.strokeStyle = S.theme.bg;
      c.strokeText(t.text, t.r.x0 + 2, (t.r.y0 + t.r.y1) / 2);
      c.fillStyle = hueOf(t.it);
      c.fillText(t.text, t.r.x0 + 2, (t.r.y0 + t.r.y1) / 2);
    }
    // la surlignée en dernier, au-dessus de tout, son nom complet (la primitive du noyau, R-M5)
    for (const g of [...L.groups, ...(L.hl ? [L.hl] : [])]) {
      if (g.hidden || !g.r) continue;
      const font = g.full ? '700 11px Arial,sans-serif' : '600 10px Arial,sans-serif';
      MapsRender.cartouche(c, g.r, {
        fill: S.theme.bg,
        fillAlpha: g.full ? .96 : .8,
        alpha: g.full ? 1 : .85,
        frame: g.full ? hueOf(g.rows[0]) : S.theme.grid,
        pad: PAD,
        inset: 1,
        lineH: g.full ? LINE_H : LINE_SM,
        rows: g.rows.map(it => ({
          band: it.chosen ? MapsRender.withAlpha(hueOf(it), .16) : null,
          swatch: hueOf(it),
          runs: [{
            t: cartText(it, g),
            color: hueOf(it),
            font,
            gap: 4
          }, ...(it.old ? [{
            t: '⌛',
            color: S.theme.muted,
            font,
            gap: 4
          }] : []), ...(it.why.length ? [{
            t: '⚠',
            color: S.theme.warn,
            font
          }] : [])]
        }))
      });
    }
    c.restore();
  };
  return L;
}
/** Le point d'un tracé le plus proche de (x, y) : { x, y } (le repère de l'appui, en px). */
function nearestOn(pts, x, y) {
  let best = null;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1],
      b = pts[i],
      dx = b.x - a.x,
      dy = b.y - a.y,
      l = dx * dx + dy * dy,
      t = l ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l)) : 0,
      q = {
        x: a.x + t * dx,
        y: a.y + t * dy
      };
    if (!best || Math.hypot(x - q.x, y - q.y) < Math.hypot(x - best.x, y - best.y)) best = q;
  }
  return best;
}
/** L'élément sous (x, y) : la ligne d'un cartouche d'abord, sinon le tracé le PLUS PROCHE dans la cible commune du pointeur (frame/lib/hit_target.js :
 *  22 px au doigt, 8 px à la souris), même là où plusieurs tracés convergent : aucun traitement de l'ambiguïté, cocher est gratuit et se défait d'un
 *  geste ; null sinon. */
export function chooseAt(x, y, radius = radiusFor()) {
  const h = S?.choose?.hits;
  if (!h) return null;
  // le dernier cartouche peint est au-dessus : c'est lui que le doigt touche
  const r = [...h.rows].reverse().find(q => x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1);
  if (r) return r.id;
  return hitPick(h.lines, x, y, radius, l => nearestOn(l.pts, x, y))?.item.id ?? null;
}
/** Toucher sur la carte en mode choix : une procédure dessous se coche (ou se décoche), une piste ou une transition se pose ; rien dessous : rien. */
export function chooseTap(x, y) {
  const C = S?.choose,
    id = chooseAt(x, y),
    it = id && C.model.rows.find(i => i.id === id);
  if (!it) return;
  if (tickable(it)) tick(it.id);
  else choosePick(it.fam, it.id);
}
/** Survol de la carte à la souris : l'élément dessous est surligné (sa ligne, son cartouche, ses transitions). */
export function chooseHover(x, y) {
  setHl(chooseAt(x, y, radiusFor('mouse')), true);
}
