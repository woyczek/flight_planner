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
  components,
  label as windLabel,
  severity as windSeverity
} from '../../frame/lib/wind.js';
import {
  proceduresOf
} from '../../frame/lib/flight_path.js';
import {
  place,
  arrowOf,
  drawRunways,
  runwayBearing,
  LINE_H
} from './procs.js';
import {
  openData,
  endData
} from './sheet_view.js';
import {
  schedule
} from './draw.js';
import {
  syncButtons,
  fitMap
} from './screen.js';
import {
  unpinAd
} from './vfr.js';
import {
  applyFlight
} from './data.js';

/** Familles du volet, dans l'ordre du côté ; la transition de l'approche est repliée sous l'approche (appTrans). */
const FAMS = {
  dep: ['rwy', 'sid'],
  arr: ['rwy', 'star', 'app']
};
/** Clé du retour vers Carburant par famille (route.procedures v2, en minuscules dans l'adresse ; V3 § 10.30). */
const KEY = {
  rwy: 'rwy',
  sid: 'sid',
  star: 'star',
  app: 'app',
  appTrans: 'apptrans'
};
/** Au plus 7 lignes montrées par groupe (« Aucune » et six), le reste replié sous « N autres… » qui le déplie sur place : la feuille
 *  est la seule surface qui défile (V3 § 10.30 : jamais deux barres de défilement). */
const MAX_ROWS = 6;
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
/** Rayon du cadre autour du terrain (NM) : les points des procédures au-delà (entrées lointaines des STAR, sorties des SID) restent
 *  hors cadre, sauf ceux d'une procédure choisie. */
const FRAME_NM = 40;

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
/** La demande d'un côté et d'un terrain (vide : celui du vol), ou null si elle ne se lit pas. sel : le choix du volet par famille
 *  (absent : intouchée ; null : « Aucune » ; sinon l'identifiant, la piste sans « RW ») ; focus : la famille touchée en dernier
 *  (tracée entière sur la carte) ; last : celle dont le choix vient de changer (la ligne de correction en dépend). */
function askOf(side, icao, fromCard = false) {
  if (side !== 'dep' && side !== 'arr' || (icao && !/^[A-Z0-9]{4}$/.test(icao))) return null;
  return {
    side,
    icao,
    fromCard,
    ready: false,
    sel: {},
    pend: {},
    more: {},
    focus: null,
    last: null,
    hl: null,
    hits: {
      lines: [],
      rows: []
    }
  };
}

// ---------------------------------------------------------------- ce qui est à choisir
/** Points d'une fiche qui ont une position, hors approche interrompue : [{ id, lat, lon }]. */
const pointsOf = rec => (rec?.points || []).filter(p => p.phase !== 'missed' && num(p.lat) && num(p.lon)).map(p => ({
  id: String(p.id ?? ''),
  lat: +p.lat,
  lon: +p.lon
}));
/** Le choix en vigueur du côté : celui du vol, puis celui du volet par-dessus (clés de route.procedures v2). */
const eff = C => ({
  ...C.cur,
  ...C.sel
});
/** Fiches d'une famille dans l'ordre du groupe (PR.orderProcedures sur le choix en vigueur), sans doublon d'identifiant ; les
 *  transitions de l'approche choisie sans celles dont l'IAF n'est pas sur la STAR choisie (PR.compatible({ star }) : jamais proposées,
 *  parcours du 30/10, point 6). */
function recsOf(C, fam) {
  const o = eff(C),
    of = kind => C.recs.filter(r => r.kind === kind),
    raw = fam === 'rwy' ? C.rwys : fam === 'sid' ? of('SID').filter(r => !r.transition) : fam === 'star' ? of('STAR').filter(r => !r
      .transition) : fam === 'app' ? PR.appChoices(of('APP')).list : o.app ? PR.appChoices(of('APP')).transitionsOf(o.app) : [],
    list = fam === 'appTrans' && o.star ? PR.compatible(raw, {
      star: o.star
    }, C.byId) : raw;
  return PR.orderProcedures([...new Map(list.map(r => [r.id, r])).values()], fam, o, C.byId);
}
/** Nom d'une fiche pour une ligne ou un cartouche : la piste (« Piste 25 »), sinon le nom (les fiches sans nom ne sont pas listées),
 *  la piste quand elle n'en dessert qu'une et que le nom ne la dit pas, l'état de la source ; une transition porte le nom de sa
 *  transition. ⌛ et ⚠ viennent à part. */
function labelOf(fam, rec, finals = null) {
  if (fam === 'rwy') return tt(TX.chRwy, {
    r: rec.id
  });
  const name = fam === 'appTrans' ? PR.transitionLabelOf(rec) : fam === 'app' && finals ? PR.labelOf(rec, finals) : PR.nameOf(rec, rec
      .id) || rec.id,
    src = rec.status === 'xplane' || rec.local ? tt(TX.procX) : rec.status === 'lnm' ? tt(TX.procLnm) : '';
  return [name, src].filter(Boolean).join(' · ');
}
/** Les pistes d'une fiche, en petites étiquettes sur sa ligne ([] pour une fiche qui les dessert toutes, une piste, une transition) ;
 *  sans celle que le libellé dit déjà (« ILS 02 », pas « ILS 02 02 »). */
const tagsOf = (fam, rec, label = '') => fam === 'rwy' || fam === 'appTrans' || PR.servesAll(rec) ? [] : [...new Set(rec.runways.map(PR
  .rwNum))].filter(r => !String(label).split(/[\s·]+/).includes(r)).sort(PR.rwOrder);
/** Nom de famille d'une procédure pour un cartouche : le radical, une espace, le chiffre (« NIMER9A » → « NIMER 9 », PR.familyOf) ;
 *  le nom tel quel s'il n'a pas cette forme. */
const familyText = name => {
  const f = PR.familyOf(name);
  return f ? f.family.replace(/(\d)$/, ' $1') : name;
};
/** Texte d'une ligne de cartouche : le nom de famille sur les petits (une ligne par famille au point), le nom complet de la procédure
 *  sur celui de la surlignée (g.full : g.text). */
const cartText = (it, g = null) => g?.full ? g.text : it.fam === 'app' || it.fam === 'appTrans' ? it.label : familyText(it.family || PR
  .nameOf(it.rec, it.id) || it.label);
/** Le seuil de piste où une SID commence, ajouté devant ses points : la piste choisie si la SID la dessert, sinon la seule qu'elle
 *  dessert ; null si elle n'est pas connue. */
function thresholdOf(C, rec) {
  const o = eff(C),
    id = PR.rwNum(o.rwy) && PR.servesRwy(rec, o.rwy) ? o.rwy : PR.runwayOf(rec),
    rw = id && C.known.find(r => num(r.lat) && num(r.lon) && PR.sameRwy(r.id, id));
  return rw ? {
    id: `RW${PR.rwNum(rw.id)}`,
    lat: +rw.lat,
    lon: +rw.lon
  } : null;
}
/** Vent du METAR déjà connu sur la piste rec : { k (composantes), sev (wind.severity : ok, warn, alert), text, tip } ; null sans METAR, sans direction
 *  (VRB) ou sans relèvement de la piste — rien n'est inventé. */
function windOf(C, rec) {
  const w = C.wind;
  if (!w) return null;
  const brg = runwayBearing(rec, C.known, num(C.ad?.magVar) ? +C.ad.magVar : null),
    k = brg === null ? null : components(brg, w.dir, w.kt);
  if (!k) return null;
  // le texte de frame/lib/wind.js (label : les flèches disent d'où vient le vent), le même que Carburant
  const sev = windSeverity(k);
  return {
    k,
    sev,
    text: windLabel(k),
    tip: tt(TX.chWindTip, {
      id: C.icao,
      d: String(Math.round(w.dir)).padStart(3, '0'),
      kt: Math.round(w.kt),
      h: k.head,
      x: k.cross
    }) + ` — ${tt(TX.chSev[sev])}`
  };
}
/** Les lignes d'une famille, dans l'ordre du groupe : { id, fam, rec, hi (rang de teinte, stable), label, old, why (raisons du ⚠),
 *  pts, anchor (point de sortie d'une SID, d'entrée sinon), chosen, wind (piste) }. */
function itemsOf(C, fam) {
  const o = eff(C),
    exit = fam === 'sid',
    finals = fam === 'app' || fam === 'appTrans' ? recsOf(C, 'app') : null,
    // une transition d'approche prend la teinte de sa finale (V3 § 10.30, quatrième lecture)
    finalHi = fam === 'appTrans' ? Math.max(0, finals.findIndex(r => r.id === o.app)) : null;
  return recsOf(C, fam).map((rec, i) => {
    const hi = finalHi ?? i;
    const why = fam === 'rwy' ? rwyWhy(C, rec) : PR.conflictsOf(fam, rec, o, C.byId).map(c => c.kind === 'rwy' ? tt(TX.chConflictRwy, {
        rwy: c.rwy
      }) : tt(TX.chConflictStarApp, {
        app: c.app || PR.nameOf(C.byId.get(c.appId), c.appId) || ''
      })),
      pts = fam === 'rwy' ? [] : pointsOf(rec),
      th = fam === 'sid' && pts.length ? thresholdOf(C, rec) : null,
      label = labelOf(fam, rec, finals);
    if (th) pts.unshift(th);
    return {
      id: rec.id,
      fam,
      rec,
      hi,
      label,
      // le nom publié de l'approche ou de sa transition, en infobulle (le libellé court est sur la ligne)
      title: fam === 'app' || fam === 'appTrans' ? [rec.name, rec.transition].filter(Boolean).join(' · ') : '',
      old: !!rec.outdated,
      why,
      pts,
      anchor: pts.length ? exit ? pts.at(-1) : pts[0] : null,
      tags: tagsOf(fam, rec, label),
      chosen: fam === 'rwy' ? !!PR.rwNum(o.rwy) && PR.rwNum(rec.id) === PR.rwNum(o.rwy) : o[fam] === rec.id,
      wind: fam === 'rwy' ? windOf(C, rec) : null
    };
  });
}
/** Les lignes d'une famille de SID ou de STAR : les fiches qui ne diffèrent que par la piste (ABLI4L, ABLI4R) en UNE ligne « ABLI4 »
 *  avec ses pistes en étiquettes (PR.familiesOf, V3 § 10.30) ; members : les lignes de ses fiches ; chosen : l'une d'elles choisie, ou
 *  la famille posée avant sa piste (C.pend). Les autres lignes telles quelles. */
function familyRows(C, fam, items) {
  if (fam !== 'sid' && fam !== 'star') return items;
  const byId = new Map(items.map(i => [i.id, i])),
    rows = [];
  for (const row of PR.familiesOf(items.map(i => i.rec))) {
    const members = row.recs.map(r => byId.get(r.id)).filter(Boolean);
    if (members.length < 2) {
      rows.push(...members);
      continue;
    }
    const first = members[0];
    rows.push({
      ...first,
      id: `fam:${row.name}`,
      family: row.name,
      members,
      label: row.name,
      tags: row.runways,
      old: members.some(m => m.old),
      why: members.every(m => m.why.length) ? first.why : [],
      chosen: members.some(m => m.chosen) || C.pend[fam] === row.name
    });
  }
  return rows;
}
/** Une piste qui ne convient pas au choix en vigueur : les procédures choisies (SID ou STAR, approche) qui ne la desservent pas. */
function rwyWhy(C, rec) {
  const o = eff(C);
  return ['sid', 'star', 'app'].map(f => o[f] && C.byId.get(o[f])).filter(p => p && !PR.servesRwy(p, rec.id)).map(p => tt(TX
    .chRwyNotServed, {
      p: PR.nameOf(p, p.id) || p.id
    }));
}
/** Familles du volet (la transition de l'approche n'en est pas une : ses sous-lignes suivent l'approche choisie). */
const famsOf = C => FAMS[C.side];
/** Familles qu'un toucher peut poser : celles du côté, et la transition de l'approche à l'arrivée. */
const pickable = C => [...FAMS[C.side], ...(C.side === 'arr' ? ['appTrans'] : [])];
/** Ce que montre une famille (seconde lecture) : les lignes compatibles avec le choix en vigueur (sans ⚠ ; la choisie toujours), six
 *  au plus ; tout, marqué ⚠, quand « Toutes » est dépliée. hidden : le nombre de lignes repliées. */
function viewOf(C, fam) {
  const list = C.items[fam] || [],
    o = eff(C),
    pend = f => C.pend[f] && (C.items[f] || []).find(i => i.family === C.pend[f])?.members.map(m => m.rec),
    choice = {
      rwy: o.rwy,
      sid: pend('sid') || o.sid,
      star: pend('star') || o.star,
      app: o.app
    },
    recs = fam === 'rwy' ? list.map(i => i.rec.id) : list.flatMap(i => i.members ? i.members.map(m => m.rec) : [i.rec]),
    idOf = r => typeof r === 'string' ? r : r.id,
    ok = new Set(PR.compatible(recs, choice, C.byId).map(idOf)),
    has = (it, set) => it.members ? it.members.some(m => set.has(m.id)) : set.has(it.rec.id),
    // second axe (V3 § 10.31) : une SID dont la sortie, une STAR dont l'entrée est sur la route tapée vient d'abord (« vers votre
    // route ») ; les autres, compatibles par ailleurs, après, marquées « sortie LACOU » / « entrée OKRIX ». Une route sans point ni
    // voie entre les deux terrains n'a rien à dire : l'axe se tait, le cap vers l'autre terrain classe à sa place (towards)
    rpts = S.route?.flight?.route?.points || [],
    route = (fam === 'sid' || fam === 'star') && rpts.length > 2 ? rpts.map(p => p?.id).filter(Boolean) : [],
    onRoute = route.length ? new Set(PR.compatible(recs, {
      ...choice,
      route
    }, C.byId).map(idOf)) : ok,
    fits = list.filter(it => it.chosen || has(it, onRoute)),
    near = list.filter(it => !fits.includes(it) && has(it, ok));
  for (const it of near) {
    const r = it.members ? it.members[0].rec : it.rec,
      pt = fam === 'sid' ? PR.exitOf(r) : PR.entryOf(r);
    it.off = pt ? tt(fam === 'sid' ? TX.chExit : TX.chEntry, {
      p: pt
    }) : ''; // exitOf / entryOf : l'identifiant du point
  }
  for (const it of fits) it.off = '';
  // ce qui ne va pas avec le choix dit pourquoi (⚠) quand il est déplié, même sans conflit de piste
  for (const it of list)
    if (!fits.includes(it) && !near.includes(it) && !it.why.length) it.why = [tt(TX.chNotFit)];
  const dir = route.length || (fam !== 'sid' && fam !== 'star') ? null : towards(C, fam, rpts);
  if (dir) fits.sort((a, b) => a.dir.off - b.dir.off);
  const order = [...fits, ...near],
    shown = C.more[fam] ? [...order, ...list.filter(it => !order.includes(it))] : order.slice(0, MAX_ROWS);
  for (const it of fits)
    if (it.chosen && !shown.includes(it)) shown.push(it);
  return {
    shown,
    // les lignes compatibles avec le choix en vigueur (sur la route d'abord), pour le cadre
    ok: order,
    hidden: list.length - shown.length,
    // l'étiquette « vers votre route » n'a de sens que si des lignes hors de la route suivent ; « vers LFPO » de même, au-dessus des
    // lignes à moins de TOWARD_DEG du cap quand d'autres suivent
    head: route.length && near.some(it => shown.includes(it)) ? tt(TX.chToRoute) : dir && shown.some(it => it.dir?.off <= TOWARD_DEG) &&
      shown.some(it => it.dir?.off > TOWARD_DEG) ? tt(TX.chToward, {
        icao: dir.icao
      }) : ''
  };
}
/** Écart (°) en deçà duquel une SID sort, une STAR entre « vers » l'autre terrain. */
const TOWARD_DEG = 60;
/** Route initiale (°) de a vers b, orthodromie. */
function bearing(a, b) {
  const r = Math.PI / 180,
    y = Math.sin((b.lon - a.lon) * r) * Math.cos(b.lat * r),
    x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}
/** Route sans point : chaque SID (STAR) de la famille reçoit it.dir = { deg : le cap du terrain vers sa sortie (depuis son entrée,
 *  vers le terrain), off : l'écart (°) entre la direction de sa sortie (son entrée) et l'orthodromie vers l'autre terrain } ; rend
 *  { icao } (l'autre terrain), ou null sans positions. */
function towards(C, fam, rpts) {
  const sid = fam === 'sid',
    other = sid ? rpts.at(-1) : rpts[0];
  if (!C.at || !num(other?.lat) || !num(other?.lon)) return null;
  const goal = bearing(C.at, {
    lat: +other.lat,
    lon: +other.lon
  });
  for (const it of C.items[fam] || []) {
    const pts = ptsOf(it),
      end = sid ? pts.at(-1) : pts[0],
      b = end ? bearing(C.at, end) : null;
    it.dir = b === null ? {
      deg: null,
      off: 360
    } : {
      deg: sid ? b : (b + 180) % 360,
      off: Math.abs((b - goal + 540) % 360 - 180)
    };
  }
  return {
    icao: String((sid ? S.route?.flight?.route?.arr : S.route?.flight?.route?.dep) || other.id || '').toUpperCase()
  };
}
/** Refait les lignes de chaque famille (après un choix) : C.items = { famille: lignes } (la transition de l'approche avec), C.view =
 *  { famille: ce qui est montré }. */
function refresh(C) {
  C.items = Object.fromEntries(pickable(C).map(f => [f, familyRows(C, f, itemsOf(C, f))]));
  C.view = Object.fromEntries(famsOf(C).map(f => [f, viewOf(C, f)]));
}
/** Toutes les lignes, toutes familles. */
const allItems = C => Object.values(C.items || {}).flat();
/** Teinte d'une ligne : l'une des huit de la palette, en cycle (jour ou nuit). */
const hueOf = it => {
  const h = MapsRender.palette(!!S.theme?.dark).procHues;
  return h[it.hi % h.length];
};
/** Transitions de la procédure it (SID, STAR : PR.transitionsOf ; approche : appChoices), tracées en tireté quand elle est surlignée. */
function transOf(C, it) {
  const of = kind => C.recs.filter(r => r.kind === kind);
  return it.fam === 'sid' ? PR.transitionsOf(of('SID'), it.id) : it.fam === 'star' ? PR.transitionsOf(of('STAR'), it.id) : it.fam ===
    'app' ? PR.appChoices(of('APP')).transitionsOf(it.id) : [];
}

// ---------------------------------------------------------------- le chargement
/** Lit ce qu'aerodb sait du terrain (procédures publiées, jamais les lectures douteuses ; pistes ; terrain) et le METAR déjà connu
 *  (cache de la couche météo du cadre, rien n'est demandé au réseau), puis cadre la vue sur les procédures du côté. Sans rien à
 *  montrer, le mode se retire avec une notification. Appelé au montage, après le vol et avant le fond de carte (qui part de S.fit). */
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
  // jamais une fiche douteuse (PR.isDoubt : statut doubt, sans nom, « NONAME » ; la règle de Carburant)
  C.recs = recs.filter(p => p?.id && !PR.isDoubt(p));
  C.byId = new Map(C.recs.map(p => [p.id, p]));
  C.known = known;
  C.ad = ad[0] || null;
  C.rwys = PR.runwayChoices(known, C.recs, C.ad);
  const m = wx?.items?.[C.icao];
  // vent du METAR (directions vraies) ; variable (VRB) ou absent : pas de ligne
  C.wind = m && num(m.wdir) && num(m.wspd) ? {
    dir: +m.wdir,
    kt: +m.wspd
  } : null;
  C.cur = proceduresOf(S.route.flight)[C.side] || {};
  // la position du terrain : le cadre et, sur une route directe, le cap des SID et des STAR (towards)
  C.at = num(at?.lat) && num(at?.lon) ? {
    lat: +at.lat,
    lon: +at.lon
  } : null;
  refresh(C);
  if (!allItems(C).length) {
    S.ctx.notify?.(tt(TX.chNoData, {
      icao: C.icao
    }), 'warn');
    S.choose = null;
    syncButtons(); // les boutons de la carte reviennent
    return;
  }
  // la famille touchée d'abord : la première du côté que le vol n'a pas choisie, sinon la première qui a quelque chose
  C.focus = FAMS[C.side].find(f => C.cur[f] === undefined && C.items[f]?.length) || FAMS[C.side].find(f => C.items[f]?.length);
  const box = frameOf(C);
  if (box) {
    C.fit = box;
    S.fit = box;
  }
  C.ready = true;
}
/** Points d'une ligne (une famille : ceux de sa fiche choisie, sinon de la première). */
const ptsOf = it => it.members ? (it.members.find(m => m.chosen) || it.members[0]).pts : it.pts;
/** Le cadre du mode : le terrain, ses pistes et les points des procédures COMPATIBLES avec le choix à moins de FRAME_NM du terrain
 *  (les entrées lointaines hors cadre) ; les procédures choisies entières. Sans position du terrain, tous les points compatibles. */
function frameOf(C) {
  const c = C.at,
    k = c ? Math.cos(c.lat * Math.PI / 180) : 1,
    near = p => !c || Math.hypot((p.lat - c.lat) * 60, (p.lon - c.lon) * 60 * k) <= FRAME_NM,
    ok = [...famsOf(C).filter(f => f !== 'rwy').flatMap(f => C.view[f]?.ok || []), ...(C.items.appTrans || [])],
    pts = [...(c ? [c] : []), ...(C.items.rwy || []).map(i => i.rec), ...ok.flatMap(ptsOf).filter(near), ...allItems(C).filter(it => it
      .chosen).flatMap(ptsOf)];
  return MapsRender.bboxOf(pts.filter(p => num(p.lat) && num(p.lon)).map(p => ({
    lat: +p.lat,
    lon: +p.lon
  })), 3);
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
  if (S.map) fitMap(true);
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
  if (S.sh && S.sh.pos !== 'expanded') S.sh.set('expanded', true);
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
  if (S.map) fitMap(true);
}
/** Le mode se retire sans retour vers Carburant (ouvert depuis la carte du terrain, rien choisi) : la carte reprend le vol entier et
 *  son cadre, la feuille son profil. */
export async function chooseExit() {
  if (!S?.choose) return;
  S.choose = null;
  chooseView();
  endData('choose');
  syncButtons();
  await applyFlight(false);
  if (S?.map && !S.choose) fitMap(true);
}
/** L'adresse du retour : #fuel?focus=<côté> et une clé par famille touchée (« none » pour « Aucune ») ; '' rien de touché. */
export function chooseReturn(C = S?.choose) {
  if (!C) return '';
  const keys = Object.entries(C.sel).filter(([f]) => KEY[f]).map(([f, v]) => `&${KEY[f]}=${encodeURIComponent(v === null ? 'none' : f ===
    'rwy' ? PR.rwNum(v) : v)}`);
  return keys.length ? `#fuel?focus=${C.side}${keys.join('')}` : '';
}
/** Fermeture du volet (✕, Échap, « Terminer ») : tout ce qui a été choisi part vers Carburant en un seul retour, qui l'écrit ; la
 *  Carte n'écrit jamais. Rien de choisi : retour à Carburant sur ce côté, ou, ouvert depuis la carte du terrain, à la carte du vol. */
export function chooseFinish() {
  const C = S?.choose;
  if (!C) return;
  const to = chooseReturn(C);
  if (!to && C.fromCard) return chooseExit();
  location.replace(to || `#fuel?focus=${C.side}`);
}

// ---------------------------------------------------------------- choisir
/** Pose le choix de la famille fam (id, « none » pour « Aucune ») dans le volet : une procédure qui ne dessert qu'une piste la pose
 *  quand aucune n'est choisie (PR.runwayOf) ; une autre approche remet sa transition à « Aucune » quand l'ancienne ne la suit pas.
 *  Rien n'est écrit : la sélection reste dans le volet et sur la carte jusqu'à la fermeture. */
export function choosePick(fam, id) {
  const C = S?.choose;
  if (!C?.ready || !pickable(C).includes(fam) || !id) return;
  let v = id === 'none' ? null : fam === 'rwy' ? PR.rwNum(id) : id;
  if (String(v).startsWith('fam:')) {
    const row = (C.items[fam] || []).find(i => i.id === v),
      rwy = PR.rwNum(eff(C).rwy),
      rec = row && rwy ? PR.firstServing(row.members.map(m => m.rec), rwy) : null;
    if (!row) return;
    if (!rec) { // pas encore de piste (ou aucune fiche ne la dessert) : la famille réduit les pistes, taper l'une d'elles résout la fiche
      C.pend[fam] = row.family;
      delete C.sel[fam];
      C.last = fam;
      C.focus = fam;
      refresh(C);
      chooseRender();
      return schedule();
    }
    v = rec.id;
  }
  if (fam !== 'rwy') delete C.pend[fam];
  C.sel[fam] = v;
  C.hl = v && fam !== 'rwy' ? id : C.hl; // la tape laisse la ligne surlignée
  // une piste posée résout la famille posée avant elle
  if (fam === 'rwy' && v)
    for (const f of ['sid', 'star']) {
      const row = C.pend[f] && (C.items[f] || []).find(i => i.family === C.pend[f]),
        rec = row ? PR.firstServing(row.members.map(m => m.rec), v) : null;
      if (rec) {
        C.sel[f] = rec.id;
        delete C.pend[f];
      }
    }
  C.last = fam;
  if (fam !== 'appTrans') C.focus = fam;
  const rec = v && fam !== 'rwy' ? C.byId.get(v) : null,
    one = rec ? PR.runwayOf(rec) : null;
  if (one && !PR.rwNum(eff(C).rwy)) C.sel.rwy = one;
  // une autre approche, ou une STAR dont la transition choisie ne part pas : la transition revient à « Aucune »
  if (fam === 'app' || fam === 'star') {
    const keep = eff(C).appTrans;
    if (keep && !recsOf(C, 'appTrans').some(r => r.id === keep)) C.sel.appTrans = null;
  }
  refresh(C);
  chooseRender();
  if (v && fam !== 'rwy') widenTo(allItems(C).find(it => it.fam === fam && it.chosen));
  schedule();
}
/** Le groupe d'une famille sous les yeux (une tape sur son libellé dans la sélection) : déplié s'il était replié, la feuille
 *  défile jusqu'à lui. */
function gotoFamily(f) {
  const C = S?.choose;
  if (!C?.ready || !famsOf(C).includes(f)) return;
  if (C.view[f]?.hidden) {
    C.more[f] = true;
    C.view = Object.fromEntries(famsOf(C).map(x => [x, viewOf(C, x)]));
    chooseRender();
  }
  S.dbodyEl.querySelector(`.mp-ch-grp[data-fam="${f}"]`)?.scrollIntoView({
    block: 'start'
  });
}
/** Ligne de correction sous un groupe de procédures (V3 § 10.30), en données : { text, fam, val, act } ou null. La procédure vient
 *  d'être choisie et ne dessert qu'une autre piste : « OPAL2E sert la 25 — Passer en 25 » ; sinon (la piste a changé, ou elle en
 *  dessert plusieurs) : « OKRIX5A ne sert pas la 07 — Choisir OKRIX5B », la première du groupe qui la dessert (PR.firstServing). */
function fixOf(C, fam) {
  const o = eff(C),
    rec = o[fam] ? C.byId.get(o[fam]) : null,
    rwy = PR.rwNum(o.rwy);
  if (!rec || !rwy || PR.servesRwy(rec, rwy)) return null;
  const p = PR.nameOf(rec, rec.id) || rec.id,
    one = PR.runwayOf(rec);
  if (one && C.last === fam) return {
    text: tt(TX.chServes, {
      p,
      r: one
    }),
    fam: 'rwy',
    val: one,
    act: tt(TX.chUseRwy, {
      r: one
    })
  };
  const alt = PR.firstServing((C.items[fam] || []).map(i => i.rec), rwy);
  return {
    text: tt(TX.chNotServes, {
      p,
      r: rwy
    }),
    fam,
    val: alt?.id || null,
    act: alt ? tt(TX.chUseProc, {
      p: PR.nameOf(alt, alt.id) || alt.id
    }) : ''
  };
}

// ---------------------------------------------------------------- la feuille : titre, groupes, Terminer
/** Ligne d'un groupe : l'échantillon de teinte (pas pour les pistes), le nom, le vent (pistes), ⌛ (gris) et ⚠ (orange) en fin de
 *  ligne ; la ligne choisie pressée. */
function rowHtml(C, it) {
  const tip = [it.title || '', it.old ? tt(TX.procOutdated) : '', ...it.why, it.wind?.tip || ''].filter(Boolean).join(' · ');
  return `<button type="button" class="mp-ch-row" data-fam="${it.fam}" data-id="${esc(it.id)}" data-hl="${C.hl === it.id ? 1 : 0}" aria-pressed="${it.chosen}"${it.fam === 'rwy' ? '' : ` style="--c:${hueOf(it)}"`}${tip ? ` title="${esc(tip)}"` : ''}>${it.fam === 'rwy' ? '' : '<i class="mp-ch-sw" aria-hidden="true"></i>'}<span class="mp-ch-name">${esc(it.label)}</span>${(it.tags || []).map(t => `<span class="mp-ch-tag">${esc(t)}</span>`).join('')}${it.off ? `<span class="mp-ch-off">${esc(it.off)}</span>` : ''}${it.dir?.deg != null ? `<span class="mp-ch-dir" style="--r:${Math.round(it.dir.deg)}deg" role="img" aria-label="${esc(tt(TX.chDir, { c: String(Math.round(it.dir.deg) % 360).padStart(3, '0') }))}">↑</span>` : ''}${it.wind ? `<span class="mp-ch-wind" data-sev="${esc(it.wind.sev)}">${esc(it.wind.text)}</span>` : ''}${it.old ? `<span class="mp-ch-old" role="img" aria-label="${esc(tt(TX.procOutdated))}">⌛</span>` : ''}${it.why.length ? `<span class="mp-ch-warn" role="img" aria-label="${esc(it.why.join(' · '))}">⚠</span>` : ''}</button>`;
}
/** Sous-lignes de l'approche choisie : « Sans transition », puis ses transitions (V3 § 10.30 : la transition sous l'approche). */
function subsHtml(C) {
  const subs = C.items.appTrans || [];
  if (!subs.length) return '';
  const none = eff(C).appTrans === null;
  return `<div class="mp-ch-subs" role="group" aria-label="${esc(tt(TX.chTrans))}"><button type="button" class="mp-ch-row mp-ch-sub mp-ch-none" data-fam="appTrans" data-id="none" data-hl="0" aria-pressed="${none}"><span class="mp-ch-name">${esc(tt(TX.chNoTrans))}</span></button>${subs.map(it => rowHtml(C, it).replace('class="mp-ch-row"', 'class="mp-ch-row mp-ch-sub"')).join('')}</div>`;
}
/** Un groupe : son titre (une étiquette fine), « Aucune » (pressée quand elle est le choix), les lignes compatibles (six au plus ;
 *  sous l'approche choisie ses transitions), la ligne fine « N autres · Toutes » qui déplie le reste marqué ⚠ (et le replie), la
 *  ligne de correction. */
function groupHtml(C, fam) {
  const list = C.items[fam] || [],
    v = C.view[fam] || {
      shown: [],
      hidden: 0
    },
    o = eff(C),
    noneOn = fam in o && o[fam] === null,
    fold = v.hidden > 0 ? tt(TX.chFold, {
      n: v.hidden
    }) : C.more[fam] && list.some(it => it.why.length) ? tt(TX.chFoldLess) : '',
    fix = fam === 'rwy' ? null : fixOf(C, fam),
    rows = (v.head ? `<div class="mp-ch-subh">${esc(v.head)}</div>` : '') + v.shown.map(it => rowHtml(C, it) + (fam === 'app' && it.chosen ?
      subsHtml(C) : '')).join('');
  return `<section class="mp-ch-grp" data-fam="${fam}"><h4 class="mp-ch-head">${esc(tt(TX.chFam[fam]))}</h4><div class="mp-ch-list" role="group" aria-label="${esc(tt(TX.chFam[fam]))}"><button type="button" class="mp-ch-row mp-ch-none" data-fam="${fam}" data-id="none" data-hl="0" aria-pressed="${noneOn}"><span class="mp-ch-name">${esc(tt(TX.chNone))}</span></button>${rows}${fold ? `<button type="button" class="mp-ch-fold" data-more="${fam}" aria-expanded="${!!C.more[fam]}">${esc(fold)}</button>` : ''}</div>${fix ? `<p class="mp-ch-fix">${esc(fix.text)}${fix.val ? ` <button type="button" class="f-btn" data-fix="${fix.fam}" data-val="${esc(fix.val)}">${esc(fix.act)}</button>` : ''}</p>` : ''}${list.length ? '' : `<p class="f-muted mp-ch-empty">${esc(tt(TX.chEmpty, { icao: C.icao }))}</p>`}</section>`;
}
/** La sélection en tête du volet : une ligne par famille choisie (« Piste 28L · ↑ 12 kt · ← 6 kt », « ABLI4L », « I28L via
 *  PIZSA »), chacune avec ✕ qui remet la famille à « Aucune ». */
function summaryHtml(C) {
  const o = eff(C),
    rw = (C.items.rwy || []).find(i => i.chosen),
    sum = PR.summaryOf(o, {
      byId: C.byId,
      wind: rw?.wind?.k
    }),
    proc = C.side === 'dep' ? 'sid' : 'star',
    pendRow = C.pend[proc] && (C.items[proc] || []).find(i => i.family === C.pend[proc]),
    lines = [],
    line = (f, text) => {
      const it = (C.items[f] || []).find(i => i.chosen),
        k = tt(TX.chFam[f]),
        v = text === undefined ? '—' : text === null ? tt(TX.chNone) : text,
        x = text === undefined ? '' : `<button type="button" class="mp-ch-x" data-clear="${f}" aria-label="${esc(tt(TX.chClear, { f: k }))}" title="${esc(tt(TX.chClear, { f: k }))}">✕</button>`;
      // le libellé mène au groupe de la famille (table des matières du volet) ; ✕, à part, efface
      lines.push(`<div class="mp-ch-sum" data-fam="${f}"${f === 'rwy' || !it ? '' : ` style="--c:${hueOf(it)}"`}><button type="button" class="mp-ch-sum-k" data-goto="${f}" title="${esc(tt(TX.chGoto, { f: k }))}">${esc(k)}</button><span class="mp-ch-sum-v">${esc(v)}</span>${x}</div>`);
    };
  line('rwy', o.rwy === null ? null : sum.rwy);
  // une famille posée avant sa piste : son nom et ses pistes, en attendant la piste
  line(proc, pendRow ? [pendRow.family, pendRow.tags.join('/')].filter(Boolean).join(' · ') : sum.proc);
  if (C.side === 'arr') line('app', sum.app);
  return `<div class="mp-ch-sums">${lines.join('')}</div>`;
}
/** Le corps de la feuille : la consigne, la sélection, les groupes du côté, « Terminer ». */
function bodyHtml(C) {
  return `<div class="mp-ch"><p class="f-muted mp-ch-hint">${esc(tt(TX.chHint))}</p>${summaryHtml(C)}${famsOf(C).map(f => groupHtml(C, f)).join('')}<button type="button" class="f-btn primary mp-ch-done" data-done="1">${esc(tt(TX.chDone))}</button></div>`;
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
/** Surligne la ligne id (ligne, cartouche, tracé) ou plus rien ; fromMap : son groupe se déplie si elle y est repliée, et elle
 *  vient sous les yeux. Les lignes ne sont pas refaites, seul leur attribut data-hl change. */
export function setHl(id, fromMap = false) {
  const C = S?.choose;
  if (!C?.ready) return;
  const it = id ? allItems(C).find(i => i.id === id) : null,
    hl = it ? id : null;
  if (C.hl === hl) return;
  C.hl = hl;
  if (it && it.fam !== 'appTrans' && it.fam !== 'rwy' && fromMap) C.focus = it.fam;
  for (const b of S.dbodyEl.querySelectorAll('.mp-ch-row')) setData(b, 'hl', b.dataset.id === hl ? '1' : '0');
  if (it && fromMap && it.fam !== 'appTrans' && !C.more[it.fam] && !S.dbodyEl.querySelector(`.mp-ch-row[data-id="${CSS.escape(hl)}"]`)) {
    C.more[it.fam] = true; // la ligne surlignée sur la carte est repliée : son groupe se déplie
    C.view = Object.fromEntries(famsOf(C).map(x => [x, viewOf(C, x)]));
    chooseRender();
  }
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
      if (e.target.closest('[data-done]')) return chooseFinish();
      if (more) {
        const f = more.dataset.more;
        C.more[f] = !C.more[f];
        C.view = Object.fromEntries(famsOf(C).map(x => [x, viewOf(C, x)]));
        return chooseRender();
      }
      const clear = e.target.closest('[data-clear]');
      if (clear) return choosePick(clear.dataset.clear, 'none');
      const go = e.target.closest('[data-goto]');
      if (go) return gotoFamily(go.dataset.goto);
      if (fix) return choosePick(fix.dataset.fix, fix.dataset.val);
      if (row) choosePick(row.dataset.fam, row.dataset.id);
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
  const hl = C.hl,
    o = eff(C),
    trace = (it, pts, extra = {}) => {
      if (!pts.length) return;
      L.traces.push({
        it,
        pts,
        ...extra
      });
      C.hits.lines.push({
        id: it.id,
        pts
      });
    };
  // les pistes : toutes, la choisie en gras
  for (const it of C.items.rwy || []) {
    const a = arrowOf(toC, C.side, it.rec, C.known, C.ad?.magVar, it.chosen ? S.theme.fg : S.theme.muted);
    if (!a) continue;
    a.lw = it.chosen ? 3.5 : it.id === hl ? 2.8 : 2;
    L.arrows.push(a);
    C.hits.lines.push({
      id: it.id,
      pts: [a.a, a.b]
    });
  }
  // les procédures : la famille touchée entière (le reste estompé dès qu'une est choisie), le choix des autres familles
  const shown = [];
  for (const f of famsOf(C).filter(f => f !== 'rwy' && f !== 'appTrans')) {
    const list = C.items[f] || [];
    for (const it of f === C.focus ? C.view[f]?.shown || list : list.filter(i => i.chosen)) {
      for (const m of it.members || [it]) trace(it, m.pts.map(p => toC(p.lat, p.lon)), {
        dim: f === C.focus && !!(o[f] || C.pend[f]) && !it.chosen && it.id !== hl
      });
      shown.push(it);
    }
  }
  // la ligne survolée, de quelque famille qu'elle soit (V3 § 10.30) : sa trace aussi, même hors de la famille touchée
  const over = hl && !shown.some(i => i.id === hl) && allItems(C).find(i => i.id === hl && i.fam !== 'rwy');
  if (over) {
    for (const m of over.members || [over]) trace(over, m.pts.map(p => toC(p.lat, p.lon)), {
      dash: over.fam === 'appTrans'
    });
    if (over.fam !== 'appTrans') shown.push(over);
  }
  // transitions : celles de la procédure surlignée, et la transition choisie de l'approche
  const on = hl && shown.find(i => i.id === hl);
  if (on)
    for (const t of transOf(C, on)) trace(on, pointsOf(t).map(p => toC(p.lat, p.lon)), {
      dash: true
    });
  const at = (C.items.appTrans || []).find(i => i.chosen);
  if (at) {
    const tp = pointsOf(at.rec),
      fin = o.app && C.byId.get(o.app),
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
  // ordre de dessin (V3 § 10.30, troisième lecture) : du dessous au dessus, ⌛, ⚠, compatibles, choisies, la surlignée en dernier
  const rank = it => it.id === hl ? 4 : it.chosen ? 3 : it.why.length ? 1 : it.old ? 0 : 2;
  L.traces.sort((a, b) => rank(a.it) - rank(b.it));
  // un cartouche par point de sortie ou d'entrée : les FAMILLES qui s'y rejoignent, une ligne chacune, sous leur nom de famille
  // (« NIMER 9 ») — jamais une ligne par procédure d'une famille ; la surlignée a le sien, au-dessus, avec son nom complet
  const keyOf = a => a.id ? a.id.toUpperCase() : `${a.lat.toFixed(3)},${a.lon.toFixed(3)}`,
    groups = new Map();
  for (const it of shown) {
    if (it.id === hl) continue;
    for (const m of it.members || [it]) {
      if (!m.anchor) continue;
      const k = keyOf(m.anchor);
      if (!groups.has(k)) groups.set(k, {
        q: toC(m.anchor.lat, m.anchor.lon),
        rows: []
      });
      const g = groups.get(k);
      if (!g.rows.includes(it)) g.rows.push(it);
    }
  }
  L.groups = [...groups.values()];
  const hit = on || (hl && allItems(C).find(i => i.id === hl && i.fam !== 'rwy')),
    hm = hit && ((hit.members || []).find(m => m.chosen) || (hit.members || [hit])[0]);
  L.hl = hm?.anchor ? {
    q: toC(hm.anchor.lat, hm.anchor.lon),
    rows: [hit],
    full: true,
    text: hit.members ? hm.label : hit.label
  } : null;
  // le code du terrain, sous son symbole comme le pose la Carte : sa place est prise avant toute cartouche de procédure (terrains >
  // procédures, parcours du 30/10, point 8) et il est écrit par-dessus le voile ; celui que la Carte aurait posé ne trouve plus sa place
  const ap = C.at ? toC(C.at.lat, C.at.lon) : null;
  L.ad = ap ? {
    x: ap.x,
    y: ap.y + AD_DY,
    text: C.icao,
    col: C.ad?.state ? '#d6173f' : '#1d4a9e'
  } : null;
  L.reserve = pl => {
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
      pl.add(L.ad.r);
    }
    // la surlignée d'abord : sa place est la meilleure, les autres l'évitent ; elle est toujours posée
    const put = (g, force) => {
      ctx.font = g.full ? '700 11px Arial,sans-serif' : '600 10px Arial,sans-serif';
      const w = Math.max(...g.rows.map(it => rowWidth(ctx, it, g))) + 2 * PAD + 2;
      const h = g.rows.length * (g.full ? LINE_H : LINE_SM) + 2 * PAD,
        r = place(pl, g.q, w, h, force);
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
      const lit = t.it.id === hl || t.it.chosen,
        faded = t.dim || (!!hl && t.it.id !== hl && !t.it.chosen),
        path = () => {
          c.beginPath();
          t.pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
          c.stroke();
        };
      c.setLineDash(t.dash ? [7, 5] : []);
      c.globalAlpha = faded ? .25 : .8;
      c.strokeStyle = S.theme.bg;
      c.lineWidth = lit ? 8 : 6;
      path();
      c.globalAlpha = faded ? .3 : 1;
      c.strokeStyle = hueOf(t.it);
      c.lineWidth = lit ? 5 : 3;
      path();
    }
    c.setLineDash([]);
    c.globalAlpha = 1;
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
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    // les cartouches des familles, petites et estompées ; la surlignée en dernier, au-dessus de tout, son nom complet
    for (const g of [...L.groups, ...(L.hl ? [L.hl] : [])]) {
      if (g.hidden || !g.r) continue;
      const lh = g.full ? LINE_H : LINE_SM;
      c.font = g.full ? '700 11px Arial,sans-serif' : '600 10px Arial,sans-serif';
      c.globalAlpha = g.full ? .96 : .8;
      c.fillStyle = S.theme.bg;
      c.fillRect(g.r.x0, g.r.y0, g.r.x1 - g.r.x0, g.r.y1 - g.r.y0);
      c.globalAlpha = g.full ? 1 : .85;
      c.lineWidth = 1;
      c.strokeStyle = g.full ? hueOf(g.rows[0]) : S.theme.grid;
      c.strokeRect(g.r.x0 + .5, g.r.y0 + .5, g.r.x1 - g.r.x0 - 1, g.r.y1 - g.r.y0 - 1);
      g.rows.forEach((it, i) => {
        const y0 = g.r.y0 + PAD + i * lh,
          y = y0 + lh / 2,
          text = cartText(it, g);
        let x = g.r.x0 + PAD + 1;
        if (it.chosen) {
          c.fillStyle = MapsRender.withAlpha(hueOf(it), .16);
          c.fillRect(g.r.x0 + 1, y0, g.r.x1 - g.r.x0 - 2, lh);
        }
        c.fillStyle = hueOf(it);
        c.fillRect(x, y - 3.5, 7, 7);
        x += 12;
        c.fillText(text, x, y);
        x += c.measureText(text).width + 4;
        if (it.old) {
          c.fillStyle = S.theme.muted;
          c.fillText('⌛', x, y);
          x += c.measureText('⌛').width + 4;
        }
        if (it.why.length) {
          c.fillStyle = S.theme.warn;
          c.fillText('⚠', x, y);
        }
      });
    }
    c.restore();
  };
  return L;
}
/** L'élément sous (x, y) : la ligne d'un cartouche d'abord, sinon le tracé le plus proche à moins de 14 px ; null sinon. */
export function chooseAt(x, y) {
  const h = S?.choose?.hits;
  if (!h) return null;
  // le dernier cartouche peint est au-dessus : c'est lui que le doigt touche
  const r = [...h.rows].reverse().find(q => x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1);
  if (r) return r.id;
  let best = null,
    min = 14;
  for (const l of h.lines)
    for (let i = 1; i < l.pts.length; i++) {
      const d = distSeg(x, y, l.pts[i - 1], l.pts[i]);
      if (d < min) {
        min = d;
        best = l.id;
      }
    }
  return best;
}
/** Toucher sur la carte en mode choix : ce qui est dessous est choisi dans sa famille (le volet le garde) ; rien dessous : rien. */
export function chooseTap(x, y) {
  const C = S?.choose,
    id = chooseAt(x, y),
    it = id && allItems(C).find(i => i.id === id);
  if (it) choosePick(it.fam, it.id);
}
/** Survol de la carte à la souris : l'élément dessous est surligné (sa ligne, son cartouche, ses transitions). */
export function chooseHover(x, y) {
  setHl(chooseAt(x, y), true);
}
