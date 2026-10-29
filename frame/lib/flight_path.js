// V3 frame/lib (propriétaire : maps ; fuel et Atmosphère s'en servent) — la route et ses procédures choisies, un seul chemin
// « route + procédures » pour le profil, les marques, les heures et le devis (V3_SPECIFICATION § 10.20), l'altitude prévue le
// long de ce chemin, et les conflits et l'ordre des listes de procédures. Sorti de current_flight.js le 29 octobre 2026
// (V3_SPECIFICATION § 10.29 b), qui le ré-exporte pendant la transition. Calcul pur.
// API : proceduresOf, loadProcedures, dedupProcs, expandedPath, flownPath, routingChain, routeNmToFlown, altitudeAt,
//   conflictsOf, orderProcedures, routeMidpoint (le point qui choisit le modèle météo).

import {
  wrapLon
} from './geo.js';
import {
  gcNm,
  num
} from './flight_time.js';

// ---------------------------------------------------------------- la route et ses procédures choisies (§ 10.20)
// route.procedures v2 = { dep: { rwy, sid, trans }, arr: { rwy, star, trans, app, appTrans }, by, at } : identifiants du schéma
// commun d'aerodb (§ 5 quinquies) ; null = « aucune » (choix du pilote), absent = pas encore choisi. Écrit par fuel seul ; les
// lecteurs vérifient l'aérodrome de chaque côté. Un seul chemin « route + procédures » sert au profil, aux marques, au
// curseur, aux heures et au devis : expandedPath, et flownPath (avec nm) pour les distances.

/** Aérodrome d'un identifiant de procédure (« LFBD.SID.ROYAN6P.RW23.NONE » → « LFBD »). */
const icaoOfId = id => typeof id === 'string' ? id.split('.')[0].trim().toUpperCase() : '';
/** Identifiant d'une entrée de l'ancien schéma { sid, star } (objet OFP ou texte) ; null gardé, sinon undefined. */
const idOf = x => x === null ? null : typeof x === 'string' ? x : x && typeof x === 'object' && typeof x.id === 'string' ? x.id :
  undefined;

/** Vue v2 des procédures du vol : { dep, arr, by, at } ; dep / arr valent null pour « aucune », sinon un objet dont les champs
 *  absents ne sont pas choisis. Un côté dont un identifiant nomme un autre aérodrome que route.dep / route.arr (la route a
 *  changé depuis) est rendu vide, {} : pas choisi, l'OFP peut le reproposer (fuel le retire à sa prochaine écriture). Un
 *  ancien { sid, star } (OFP) donne les identifiants de ses enregistrements, et la piste seulement quand l'enregistrement
 *  n'en a qu'une. */
export function proceduresOf(f) {
  const r = f?.route || {},
    pr = r.procedures && typeof r.procedures === 'object' ? r.procedures : null,
    depIcao = String(r.dep || r.points?.[0]?.id || '').trim().toUpperCase(),
    arrIcao = String(r.arr || r.points?.at?.(-1)?.id || '').trim().toUpperCase();
  if (!pr) return {
    dep: {},
    arr: {},
    by: null,
    at: null
  };
  let dep, arr;
  if ('dep' in pr || 'arr' in pr) {
    dep = pr.dep === null ? null : {
      ...(pr.dep || {})
    };
    arr = pr.arr === null ? null : {
      ...(pr.arr || {})
    };
  } else {
    dep = {};
    arr = {};
    const v1 = (o, k, rec) => {
      const id = idOf(rec);
      if (id === undefined) return;
      o[k] = id;
      if (Array.isArray(rec?.runways) && rec.runways.length === 1) o.rwy = String(rec.runways[0]);
    };
    if ('sid' in pr) v1(dep, 'sid', pr.sid);
    if ('star' in pr) v1(arr, 'star', pr.star);
  }
  const check = (o, icao, keys) => !o || !icao || keys.every(k => typeof o[k] !== 'string' || icaoOfId(o[k]) === icao) ? o : {};
  return {
    dep: check(dep, depIcao, ['sid', 'trans']),
    arr: check(arr, arrIcao, ['star', 'trans', 'app', 'appTrans']),
    by: pr.by ?? null,
    at: pr.at ?? null
  };
}

/** Procédures du vol résolues par aerodb : { sid, sidTrans, star, starTrans, app, appTrans, depRwy, arrRwy } — chaque
 *  identifiant par aerodb.procedure(id) (null s'il est introuvable ou pas choisi), les pistes choisies par
 *  aerodb.runways(icao) (seuil, élévation, QFU ; approx quand elles sont déduites). Un seul code pour fuel et la Carte. */
export async function loadProcedures(aerodb, f) {
  const v = proceduresOf(f),
    d = v.dep || {},
    a = v.arr || {},
    r = f?.route || {},
    get = id => typeof id === 'string' && id && aerodb?.procedure ? Promise.resolve().then(() => aerodb.procedure(id)).catch(() =>
      null) : null,
    rwKey = x => String(x ?? '').trim().toUpperCase().replace(/^RW/, ''),
    rw = async (icao, id) => {
      if (!id || !icao || !aerodb?.runways) return null;
      const list = await Promise.resolve().then(() => aerodb.runways(String(icao).toUpperCase())).catch(() => []);
      return (list || []).find(x => rwKey(x?.id) === rwKey(id)) || null;
    };
  const [sid, sidTrans, star, starTrans, app, appTrans, depRwy, arrRwy] = await Promise.all([get(d.sid), get(d.trans), get(a.star), get(
    a.trans), get(a.app), get(a.appTrans), rw(r.dep || r.points?.[0]?.id, d.rwy), rw(r.arr || r.points?.at?.(-1)?.id, a.rwy)]);
  return dedupProcs({
    sid: sid || null,
    sidTrans: sidTrans || null,
    star: star || null,
    starTrans: starTrans || null,
    app: app || null,
    appTrans: appTrans || null,
    depRwy,
    arrRwy
  });
}
/** Procédures lues sans doublon : une transition identique à sa procédure (un ancien choix, ou venu d'ailleurs) est ignorée, la
 *  chaîne de ses points serait volée deux fois. Reprise de Carburant (§ 10.29 a) : Carburant et la Carte voient les mêmes
 *  enregistrements ; elle ira dans frame/lib/procedures.js avec la sortie du bloc procédures de Carburant. */
export function dedupProcs(p) {
  const out = {
    ...p
  };
  for (const [main, tr] of [
      ['sid', 'sidTrans'],
      ['star', 'starTrans'],
      ['app', 'appTrans']
    ])
    if (out[main] && out[tr] && out[main].id === out[tr].id) out[tr] = null;
  return out;
}

/** Champs d'un point de procédure repris dans le chemin, tels qu'aerodb les donne (alt { type: 'at' | 'min' | 'max' |
 *  'between', ft, ft2? }, kt = vitesse indiquée maximale, forme du tronçon ; nm devient legNm). */
const LEG_KEYS = ['alt', 'kt', 'leg', 'crs', 'nm', 'arc', 'turn', 'over', 'vpa', 'rnp', 'gap'];
/** Coordonnée lue, ou null (un tronçon sans point : VA, CA, VM, FM). */
const coord = v => v === null || v === undefined || v === '' || !Number.isFinite(+v) ? null : +v;
/** Point du chemin d'après un point de procédure (sa phase, sinon celle de l'enregistrement ; missed → origin 'missed'). */
function procPoint(p, origin, phase) {
  const o = {
    id: String(p?.id ?? ''),
    lat: coord(p?.lat),
    lon: coord(p?.lon),
    origin,
    phase: p?.phase || phase
  };
  for (const k of LEG_KEYS)
    if (p?.[k] !== undefined && p[k] !== null) o[`p_${k}`] = p[k];
  if (o.phase === 'missed') o.origin = 'missed';
  return o;
}
/** Même point : même nom et positions proches (moins de 3 NM), ou sans nom à moins de 0,3 NM. */
const samePoint = (a, b) => {
  if (!a || !b || a.lat === null || b.lat === null || a.lon === null || b.lon === null) return false;
  const d = gcNm(a, b);
  return a.id && b.id && a.id.toUpperCase() === b.id.toUpperCase() ? d < 3 : d < .3;
};
/** Points de plusieurs procédures bout à bout ; le point partagé par deux d'entre elles (fin de transition, début de
 *  procédure) une seule fois, avec les contraintes de la seconde ; au-delà de ce point, la fin du premier est écartée. */
function chainOf(parts) {
  const out = [];
  for (const [rec, origin, phase] of parts) {
    // jonction : le premier point de cet enregistrement déjà dans la chaîne (une transition qui reprend le début de
    // l'approche, une STAR qui va au-delà de son point de sortie) : la chaîne est coupée à ce point, la fin propre du
    // précédent n'est jamais volée et aucun tronçon ne l'est deux fois
    const first = rec?.points?.length ? procPoint(rec.points[0], origin, phase) : null;
    if (first && first.origin !== 'missed') {
      let k = -1;
      for (let i = out.length - 1; i >= 0; i--)
        if (out[i].origin !== 'missed' && samePoint(out[i], first)) {
          k = i;
          break;
        }
      if (k >= 0) out.length = k + 1;
    }
    for (const p of rec?.points || []) {
      const q = procPoint(p, origin, phase),
        last = out.at(-1);
      if (last && last.origin !== 'missed' && q.origin !== 'missed' && samePoint(last, q)) {
        out[out.length - 1] = {
          ...last,
          ...q
        };
        continue;
      }
      out.push(q);
    }
  }
  return out;
}
/** Seuil d'une piste choisie en point de chemin (« RW23 », rwy: true), ou null. */
const thresholdPoint = (rw, origin) => rw && coord(rw.lat) !== null && coord(rw.lon) !== null ? {
  id: `RW${String(rw.id).replace(/^RW/i, '')}`,
  lat: +rw.lat,
  lon: +rw.lon,
  origin,
  phase: 'main',
  rwy: true,
  ...(coord(rw.elev) !== null ? {
    elev: +rw.elev
  } : {}),
  ...(rw.approx ? {
    approx: true
  } : {})
} : null;
/** Les champs p_* d'un point de procédure, rendus sous leur nom (le point de la route garde les siens : alt_ft, wind, via…). */
// la longueur publiée du tronçon devient legNm : nm est la distance cumulée de flownPath
const legFields = p => Object.fromEntries(Object.entries(p).filter(([k]) => k.startsWith('p_')).map(([k, v]) => [k === 'p_nm' ? 'legNm' :
  k.slice(2), v
]));
const bare = p => Object.fromEntries(Object.entries(p).filter(([k]) => !k.startsWith('p_')));
const finish = p => ({
  ...bare(p),
  ...legFields(p)
});

/** Chemin « route + procédures » dans l'ordre de vol (V3_SPECIFICATION § 10.20) : [{ id, lat, lon, origin ('route' | 'sid' |
 *  'star' | 'app' | 'missed'), phase ('main' | 'trans' | 'missed'), alt?, kt?, leg?, crs?, legNm?, arc?, turn?, over?, rwy?,
 *  elev? }] ; les points de la route gardent tous leurs champs (alt_ft, wind, via, awy…). Départ : le terrain, le seuil de la
 *  piste choisie s'il est connu, la SID puis sa transition ; la route reprend au PREMIER point de cette chaîne qui est aussi
 *  un de ses points (une route d'OFP porte déjà ses points de SID : ils ne sont pas doublés, et le point commun prend les
 *  contraintes de la procédure), sinon après la chaîne entière, à route[1]. Arrivée, symétrique : transition de STAR, STAR,
 *  transition d'approche, approche jusqu'au seuil ; la route s'arrête au premier point de cette chaîne qu'elle contient,
 *  sinon à son avant-dernier point ; le terrain ferme le chemin. Un tronçon sans point (lat / lon null) reste dans le tableau
 *  pour le dessin ; l'approche interrompue vient à la fin (origin 'missed'), jamais volée. Longitudes dans [-180, 180[.
 *  procs : loadProcedures ; un enregistrement d'un autre aérodrome est ignoré. */
export function expandedPath(f, procs = {}) {
  const R = (f?.route?.points || []).filter(p => coord(p?.lat) !== null && coord(p?.lon) !== null).map(p => ({
      ...p,
      id: String(p.id ?? ''),
      lat: +p.lat,
      lon: wrapLon(+p.lon),
      origin: 'route',
      phase: 'main'
    })),
    n = R.length;
  if (n < 2) return R;
  const P = procs || {},
    ofIcao = (rec, icao) => rec && (!rec.icao || String(rec.icao).toUpperCase() === icao) ? rec : null,
    depIcao = String(f.route?.dep || R[0].id).toUpperCase(),
    arrIcao = String(f.route?.arr || R[n - 1].id).toUpperCase(),
    depChain = chainOf([
      [ofIcao(P.sid, depIcao), 'sid', 'main'],
      [ofIcao(P.sidTrans, depIcao), 'sid', 'trans']
    ]).filter(p => p.origin !== 'missed'),
    arrAll = chainOf([
      [ofIcao(P.starTrans, arrIcao), 'star', 'trans'],
      [ofIcao(P.star, arrIcao), 'star', 'main'],
      [ofIcao(P.appTrans, arrIcao), 'app', 'trans'],
      [ofIcao(P.app, arrIcao), 'app', 'main']
    ]),
    missed = arrAll.filter(p => p.origin === 'missed'),
    arrChain = arrAll.filter(p => p.origin !== 'missed'),
    th0 = depChain.length ? thresholdPoint(P.depRwy, 'sid') : null,
    th1 = arrChain.length ? thresholdPoint(P.arrRwy, arrChain.at(-1).origin) : null;
  if (th0 && !samePoint(th0, depChain[0])) depChain.unshift(th0);
  if (th1 && !samePoint(th1, arrChain.at(-1))) arrChain.push(th1);
  // raccords : où la route reprend après la SID, où elle s'arrête avant la STAR ; jamais un tronçon deux fois
  const routeIndex = (p, from, to) => {
    for (let j = from; j <= to; j++)
      if (samePoint(R[j], p)) return j;
    return -1;
  };
  let start = 1,
    head = depChain;
  // jonctions marquées sur le point qui suit (§ 10.29 c) : join 'common' (raccord sur un point commun ; joinPhase, la phase du
  // tronçon de procédure qui y mène), 'direct' (pas de point commun : un direct entre procédure et route), 'gap' (tronçon dont le
  // prédécesseur n'est pas codé) ; le dessin les lit tels quels
  let joined = false;
  for (let i = 0; i < depChain.length; i++) {
    const j = routeIndex(depChain[i], 1, n - 2);
    if (j > 0) {
      start = j;
      head = depChain.slice(0, i);
      R[j] = {
        ...R[j],
        ...legFields(depChain[i]),
        join: 'common',
        joinPhase: depChain[i].phase
      };
      joined = true;
      break;
    }
  }
  // jamais aux extrémités : la procédure part du terrain ou y arrive
  if (depChain.length && !joined && start <= n - 2) R[start] = {
    ...R[start],
    join: 'direct'
  };
  let end = n - 2,
    tail = arrChain;
  let arrJoin = null;
  for (let i = 0; i < arrChain.length; i++) {
    const j = routeIndex(arrChain[i], start, n - 2);
    if (j > 0) {
      end = j;
      tail = arrChain.slice(i + 1);
      R[j] = {
        ...R[j],
        ...legFields(arrChain[i])
      };
      arrJoin = 'common';
      break;
    }
  }
  if (!arrJoin && arrChain.length && end >= 1) arrJoin = 'direct';
  const tailOut = tail.map(finish);
  if (tailOut.length && arrJoin) tailOut[0] = {
    ...tailOut[0],
    join: tailOut[0].gap ? 'gap' : arrJoin,
    ...(arrJoin === 'common' ? {
      joinPhase: tailOut[0].phase
    } : {})
  };
  const out = [R[0], ...head.map(finish), ...R.slice(start, end + 1), ...tailOut, R[n - 1], ...missed.map(finish)].map(p => {
    const q = p.gap && !p.join ? {
      ...p,
      join: 'gap'
    } : p;
    return q.lon === null ? q : {
      ...q,
      lon: wrapLon(q.lon)
    };
  });
  // un même point deux fois de suite (le terrain et un seuil confondus…) : une fois
  return out.filter((p, i) => !i || p.origin === 'missed' || !samePoint(p, out[i - 1]) || p.id !== out[i - 1].id);
}

/** Points volés du chemin, avec leur position, et nm : distance cumulée depuis le départ (grand cercle point à point ; un arc
 *  RF compté par sa corde) — la seule mesure des distances, pour le profil (profile.path), les marques, les heures
 *  (legTimes / etaOf / plannedPositionAt { path }) et quote.legs. Ni l'approche interrompue ni les tronçons sans point. */
export function flownPath(path) {
  const pts = (path || []).filter(p => p && p.origin !== 'missed' && coord(p.lat) !== null && coord(p.lon) !== null),
    out = [];
  for (const p of pts) out.push({
    ...p,
    nm: out.length ? out.at(-1).nm + gcNm(out.at(-1), p) : 0
  });
  return out;
}

/** Points entre lesquels le routage (« Auto » de Carburant, frame/lib/routing.js) cherche les voies, procédures comprises : ceux de
 *  la route (points, par défaut route.points), avec la fin de la SID choisie (sa transition comprise) juste après le départ et le
 *  début de l'arrivée choisie (transition de STAR, sinon STAR, sinon transition d'approche, sinon approche) juste avant
 *  l'arrivée, quand la route ne les a pas déjà ; un point inséré porte inserted: true et son origin ('sid' | 'star' | 'app').
 *  Sans procédure : les points tels quels. Calcul pur ; procs : loadProcedures. Un départ FINOT de LFBO et une route qui
 *  commence à GOSAD donnent LFBO FINOT GOSAD… : le routage trouve G36 de FINOT à GOSAD, qu'il ne voyait pas depuis le terrain. */
export function routingChain(f, procs = {}, points = f?.route?.points) {
  const pts = (points || []).slice();
  if (pts.length < 2) return pts;
  const P = procs || {},
    n = pts.length,
    depIcao = String(f?.route?.dep || pts[0]?.id || '').toUpperCase(),
    arrIcao = String(f?.route?.arr || pts[n - 1]?.id || '').toUpperCase(),
    ofIcao = (rec, icao) => rec && (!rec.icao || String(rec.icao).toUpperCase() === icao) ? rec : null,
    fixes = chain => chain.filter(p => p.origin !== 'missed' && p.lat !== null && p.lon !== null && p.id && !/^RW\d{2}[LRC]?$/i.test(p.id)),
    sid = fixes(chainOf([
      [ofIcao(P.sid, depIcao), 'sid', 'main'],
      [ofIcao(P.sidTrans, depIcao), 'sid', 'trans']
    ])),
    arr = fixes(chainOf([
      [ofIcao(P.starTrans, arrIcao), 'star', 'trans'],
      [ofIcao(P.star, arrIcao), 'star', 'main'],
      [ofIcao(P.appTrans, arrIcao), 'app', 'trans'],
      [ofIcao(P.app, arrIcao), 'app', 'main']
    ])),
    inRoute = q => pts.slice(1, -1).some(p => coord(p?.lat) !== null && coord(p?.lon) !== null && samePoint({
      id: String(p.id ?? ''),
      lat: +p.lat,
      lon: +p.lon
    }, q)),
    mk = q => ({
      id: q.id,
      lat: q.lat,
      lon: q.lon,
      origin: q.origin,
      inserted: true
    });
  const out = [pts[0]],
    end = sid.at(-1),
    start = arr[0];
  if (end && !inRoute(end)) out.push(mk(end));
  out.push(...pts.slice(1, -1));
  if (start && !inRoute(start) && !(end && samePoint(end, start))) out.push(mk(start));
  out.push(pts[n - 1]);
  return out;
}

// ---------------------------------------------------------------- l'altitude du vol le long du chemin
/** Distances de la route (grand cercle point à point sur points, par défaut route.points) ramenées sur le chemin volé
 *  (flownPath) : une fonction nm de la route → nm du chemin. Les points de la route que le chemin garde font les repères ;
 *  entre deux repères, au prorata ; au-delà, décalé du dernier repère. Sans chemin (ou sans repère) : l'identité. */
export function routeNmToFlown(f, flown, points = f?.route?.points) {
  const pts = (points || []).filter(p => coord(p?.lat) !== null && coord(p?.lon) !== null),
    fp = (flown || []).filter(p => coord(p?.lat) !== null && coord(p?.lon) !== null && Number.isFinite(+p.nm));
  if (pts.length < 2 || fp.length < 2) return nm => nm;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + gcNm({
    lat: +pts[i - 1].lat,
    lon: +pts[i - 1].lon
  }, {
    lat: +pts[i].lat,
    lon: +pts[i].lon
  }));
  // repères : un point de la route retrouvé (même nom, à moins de 3 NM) sur le chemin, dans l'ordre
  const marks = [];
  let j0 = 0;
  pts.forEach((p, i) => {
    const q = {
        id: String(p.id ?? ''),
        lat: +p.lat,
        lon: +p.lon
      },
      j = fp.findIndex((x, k) => k >= j0 && x.origin === 'route' && samePoint(x, q));
    if (j < 0) return;
    marks.push([cum[i], +fp[j].nm]);
    j0 = j;
  });
  if (!marks.length) return nm => nm;
  return nm => {
    if (nm <= marks[0][0]) return marks[0][1] - (marks[0][0] - nm);
    for (let k = 1; k < marks.length; k++) {
      const [r0, f0] = marks[k - 1], [r1, f1] = marks[k];
      if (nm <= r1) return r1 > r0 ? f0 + (nm - r0) / (r1 - r0) * (f1 - f0) : f1;
    }
    const [r, fl] = marks.at(-1);
    return fl + (nm - r);
  };
}
/** Altitude prévue (ft) à nm du départ sur le chemin volé : le chemin vertical de fuel (profile.path [{ nm, ft }], interpolé) ;
 *  sans lui, la croisière (opts.cruiseFt, sinon level.ft, sinon le niveau du devis) avec la montée jusqu'à profile.tocNm et la
 *  descente sur les derniers profile.todNm du chemin (opts.total, sinon le dernier nm de opts.flown, sinon la route) ; null
 *  sans niveau. Utilisateur, 29 octobre : les vents de la route et la coupe d'Atmosphère sont pris à cette altitude, pas au
 *  niveau de croisière partout ; le routage des voies l'emploie pour les tronçons de montée et de descente. */
export function altitudeAt(f, nm, opts = {}) {
  const path = Array.isArray(f?.profile?.path) ? f.profile.path.filter(p => Number.isFinite(+p?.nm) && Number.isFinite(+p?.ft)) : [];
  if (path.length >= 2) {
    if (nm <= +path[0].nm) return +path[0].ft;
    for (let i = 1; i < path.length; i++)
      if (nm <= +path[i].nm) {
        const a = path[i - 1],
          b = path[i],
          d = +b.nm - +a.nm;
        return d > 0 ? +a.ft + (nm - +a.nm) / d * (+b.ft - +a.ft) : +b.ft;
      }
    return +path.at(-1).ft;
  }
  const L = num(opts.cruiseFt) ?? num(f?.level?.ft) ?? num(f?.quote?.levelFt);
  if (!(L > 0)) return null;
  const P = f?.profile || {},
    fl = (opts.flown || []).filter(p => Number.isFinite(+p?.nm)),
    D = num(opts.total) ?? (fl.length ? +fl.at(-1).nm : (() => {
      const pts = (f?.route?.points || []).filter(p => coord(p?.lat) !== null && coord(p?.lon) !== null);
      let s = 0;
      for (let i = 1; i < pts.length; i++) s += gcNm({
        lat: +pts[i - 1].lat,
        lon: +pts[i - 1].lon
      }, {
        lat: +pts[i].lat,
        lon: +pts[i].lon
      });
      return s;
    })()),
    toc = Math.max(0, +P.tocNm || 0),
    tod = Math.max(0, +P.todNm || 0);
  let ft = L;
  if (toc > 0 && nm < toc) ft = Math.min(ft, L * Math.max(0, nm) / toc);
  if (tod > 0 && D > 0 && nm > D - tod) ft = Math.min(ft, L * Math.max(0, D - nm) / tod);
  return ft;
}

// ---------------------------------------------------------------- conflits et ordre des listes de procédures (V3_SPECIFICATION § 10.23)
// Déplacés dans frame/lib/procedures.js (règles pures partagées par Carburant et la Carte, § 10.29 c). Ré-exportés ici pendant la
// transition (current_flight.js ré-exporte ce fichier), pour que les imports de la Carte continuent de marcher ; à retirer quand
// elle importera procedures.js.
export {
  conflictsOf,
  orderProcedures
}
from './procedures.js';

// ---------------------------------------------------------------- le point qui choisit le modèle météo
/** Point à mi-longueur d'une route (grand cercle point à point ; interpolé dans son tronçon, longitude dans [-180, 180[) : le
 *  seul point où la Carte et Atmosphère demandent au cadre son modèle (ctx.weather.modelFor), pour qu'ils prennent le même au
 *  bord des boîtes des modèles ; null sans deux points placés. */
export function routeMidpoint(points) {
  const pts = (points || []).filter(p => coord(p?.lat) !== null && coord(p?.lon) !== null).map(p => ({
    lat: +p.lat,
    lon: +p.lon
  }));
  if (pts.length < 2) return pts.length ? {
    lat: pts[0].lat,
    lon: wrapLon(pts[0].lon)
  } : null;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + gcNm(pts[i - 1], pts[i]));
  const half = cum.at(-1) / 2;
  let i = 1;
  while (i < pts.length - 1 && cum[i] < half) i++;
  const a = pts[i - 1],
    b = pts[i],
    k = cum[i] > cum[i - 1] ? (half - cum[i - 1]) / (cum[i] - cum[i - 1]) : 0,
    dl = ((b.lon - a.lon + 540) % 360) - 180; // le plus court autour de la ligne de changement de date
  return {
    lat: a.lat + (b.lat - a.lat) * k,
    lon: wrapLon(a.lon + dl * k)
  };
}
