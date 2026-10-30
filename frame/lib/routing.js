// V3 frame/lib (code partagé ; créée dans modules/maps/lib par le lot « auto » de fuel le 25 oct. 2026, passée au cadre au
// recodage de la Carte, 28 oct. 2026) — routage sur les voies aériennes. Port de shared/mission_routing.js (V2 : airwayGraph, shortest, leg, expand) sur les segments de la base
// publiée (AeroDB.airways({ bbox }) : { route, a: { id, lat, lon }, b, lower, upper (ft), nm }) au lieu de window.SiaBase.
// Module ES, sans état propre (le graphe se refait à chaque appel, sur le couloir demandé), ni page, ni stockage, ni réseau :
// la base publiée est lue dans le cache du cadre par aerodb.
//
// Règles de la V2, gardées : un tronçon de voie est ouvert si plancher − 100 ft ≤ niveau ≤ plafond + 100 ft ; les deux sens
// sont ouverts ; entrée et sortie directes vers les 8 nœuds les plus proches à 60 NM au plus (nœuds portant au moins une voie
// ouverte à ce niveau) ; plus court chemin (Dijkstra) ; direct si le détour dépasse 40 % ou si le tronçon ne dépasse pas
// 40 NM. Limites écrites : ni SID / STAR, ni sens unique (la base ne porte pas encore la circulation), ni restriction fine de
// niveau (pairs / impairs, conditions de la voie) ; pas de passage de la ligne de changement de date.
// Changé par rapport à la V2 : le couloir. aerodb ne rend que les segments d'une emprise : celle des points du trajet,
// élargie de reachNm de chaque côté plus padPct % de la distance directe (le chemin peut s'écarter de la ligne) ;
// plusieurs zones de la base si la route les traverse (aerodb les assemble).
// Changé le 28 oct. 2026 (« … LAVRA OBLOC VELIN LMG … ne trouve pas LMG VELIN OBLOC par une voie ») : à longueur égale, la voie
// l'emporte sur une entrée ou une sortie directe (un point posé sur un nœud suivait sinon sa voie en direct, sans la nommer) ;
// un tronçon de 40 NM ou moins dont les deux bouts sont des nœuds que relient des voies ouvertes, sans détour, prend la voie
// (« OBLOC R10 VELIN ») quand la base est lue pour un tronçon long de la même chaîne.
//
// API :
//   DEFAULTS : { reachNm: 60, detourPct: 40, minNm: 40, padPct: 15, ifrMinFt: 6500 }.
//   nm(a, b) : distance orthodromique (NM) de deux points { lat, lon }.
//   airwayGraph(segments) → { nodes } ; shortest(graph, a, b, altFt, reachNm) → { pts, nm } | null (pts : nœuds
//     { id, lat, lon, via } — via : la voie qui y arrive, « DCT » pour le premier) ;
//   leg(segments, a, b, altFt, opts) → { points, routes, nm, why } : points = a, les nœuds, b (via de a : ''), vide si le
//     tronçon reste direct ; why : 'short' | 'far' | 'none' | 'detour' (sans voie qui serve).
//   tokensOf(points, { dct }) → jetons { pt } | { keep } de route_text.js : les points d'un même passage sur une voie sont
//     regroupés en « A VOIE B » (les points intermédiaires, awy: true, ne sont pas écrits) ; textOf(points, { dct }) : leur
//     texte normalisé (textFromTokens), « PT1 UN460 PT2 DCT PT3 » avec dct (défaut vrai), sans DCT sinon.
//   route(aerodb, a, b, opts) → { points, text, nm, dct, routes } | null ; expand(aerodb, chain, opts) → { points, legs,
//     nm, routes } : voir plus bas. Elles lèvent RoutingError (code 'base', state) si aerodb n'a rien à lire (état noaccess,
//     offline ou unpublished : la base manque, ce n'est pas « aucune voie »).

import {
  textFromTokens,
  icaoCoord
} from './route_text.js';

export const DEFAULTS = {
  reachNm: 60,
  detourPct: 40,
  minNm: 40,
  padPct: 15,
  ifrMinFt: 6500
};

/** La base aéronautique manque : code 'base', state : l'état d'aerodb (noaccess, offline, unpublished, idle…). */
export class RoutingError extends Error {
  constructor(state) {
    super(`aeronautical base unavailable (${state})`);
    this.name = 'RoutingError';
    this.code = 'base';
    this.state = state;
  }
}

const rad = d => d * Math.PI / 180;
/** Distance orthodromique (NM). */
export function nm(a, b) {
  const f1 = rad(a.lat),
    f2 = rad(b.lat),
    df = f2 - f1,
    dl = rad(b.lon - a.lon);
  const h = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  return 2 * 3440.065 * Math.asin(Math.min(1, Math.sqrt(h)));
}

const NAME = /^[A-Z0-9]{2,7}$/,
  isNum = v => Number.isFinite(+v) && v !== null && v !== '';
/** Identifiant écrivable dans une route : le nom du point, sinon ses coordonnées OACI (« 4530N00030E »). */
const safeId = p => {
  const id = String(p.id || '').toUpperCase();
  return NAME.test(id) ? id : icaoCoord(p.lat, p.lon);
};

/** Graphe des voies : nœuds = points (identifiant et position), arêtes = segments (les deux sens). */
export function airwayGraph(segments) {
  // un nœud par identifiant et par lieu : même identifiant à moins de 2 NM = même point (l'arrondi des coordonnées des deux
  // segments qui s'y rejoignent peut différer de quelques millièmes de degré : la V2, qui arrondissait à 0,001°, coupait
  // alors la voie en deux) ; le même identifiant loin de là (BNE en France et à Sainte-Lucie) reste un autre nœud
  const nodes = [],
    byId = new Map(),
    node = p => {
      const lat = +p.lat,
        lon = +p.lon,
        list = byId.get(p.id) || byId.set(p.id, []).get(p.id);
      let n = list.find(x => nm(x, {
        lat,
        lon
      }) < 2);
      if (!n) {
        n = {
          k: `${p.id}|${list.length}`,
          id: p.id,
          lat,
          lon,
          out: []
        };
        list.push(n);
        nodes.push(n);
      }
      return n;
    };
  for (const s of segments || []) {
    if (!isNum(s?.a?.lat) || !isNum(s?.a?.lon) || !isNum(s?.b?.lat) || !isNum(s?.b?.lon)) continue;
    const a = node(s.a),
      b = node(s.b),
      d = s.nm || nm(a, b),
      lo = s.lower ?? 0,
      hi = s.upper ?? 99999;
    a.out.push({
      to: b,
      d,
      route: s.route,
      lo,
      hi
    });
    b.out.push({
      to: a,
      d,
      route: s.route,
      lo,
      hi
    });
  }
  return {
    nodes
  };
}

/** Tas binaire [coût, valeur] : le plus petit coût d'abord. */
class Heap {
  constructor() {
    this.a = [];
  }
  get size() {
    return this.a.length;
  }
  push(x) {
    const a = this.a;
    a.push(x);
    for (let i = a.length - 1; i > 0;) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a,
      top = a[0],
      last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let i = 0;;) {
        const l = 2 * i + 1,
          r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

/** Poids d'un morceau direct (entrée, sortie) dans le calcul du chemin : à longueur égale, la voie l'emporte. Sans lui, un point
 *  posé sur un nœud (VELIN) rejoignait en direct le nœud suivant de sa voie (NORON, même longueur que le segment R10) et le
 *  tronçon n'avait plus aucun segment de voie (« none »). La longueur rendue reste la vraie. */
const DCT_WEIGHT = 1.05,
  DCT_EXTRA = .2;
const dctCost = d => d < .5 ? d : d * DCT_WEIGHT + DCT_EXTRA;

/** Plus court chemin de a à b par le graphe : entrée et sortie directes vers les nœuds proches (un peu pénalisées, voir
 *  DCT_WEIGHT) ; { pts, nm (longueur réelle) } ou null. */
export function shortest(graph, a, b, alt, reach = DEFAULTS.reachNm) {
  // entrée / sortie : nœuds proches portant au moins une voie ouverte à ce niveau
  const usable = n => n.out.some(e => alt >= e.lo - 100 && alt <= e.hi + 100),
    near = p => graph.nodes.filter(usable).map(n => [n, nm(p, n)]).filter(([, d]) => d <= reach).sort((x, y) => x[1] - y[1]).slice(0, 8);
  const starts = near(a),
    ends = new Map(near(b).map(([n, d]) => [n.k, d])),
    real = new Map(); // longueur réelle jusqu'à chaque nœud (le coût du tas pénalise le direct)
  if (!starts.length || !ends.size) return null;
  const dist = new Map(),
    prev = new Map(),
    done = new Set(),
    queue = new Heap();
  const push = (n, d, from, route, len) => {
    if (d < (dist.get(n.k) ?? Infinity)) {
      dist.set(n.k, d);
      real.set(n.k, len);
      prev.set(n.k, {
        from,
        route,
        n
      });
      queue.push([d, n]);
    }
  };
  for (const [n, d] of starts) push(n, dctCost(d), null, 'DCT', d);
  let best = null,
    bestCost = Infinity;
  while (queue.size) {
    const [d, n] = queue.pop();
    if (done.has(n.k)) continue;
    if (d > bestCost) break; // le tas rend les coûts dans l'ordre : plus rien de meilleur
    done.add(n.k);
    if (ends.has(n.k) && d + dctCost(ends.get(n.k)) < bestCost) {
      bestCost = d + dctCost(ends.get(n.k));
      best = n;
    }
    for (const e of n.out)
      if (alt >= e.lo - 100 && alt <= e.hi + 100 && !done.has(e.to.k)) push(e.to, d + e.d, n, e.route, real.get(n.k) + e.d);
  }
  if (!best) return null;
  const path = [];
  for (let k = best.k; k;) {
    const p = prev.get(k);
    path.unshift({
      id: p.n.id,
      lat: p.n.lat,
      lon: p.n.lon,
      via: p.route
    });
    k = p.from?.k;
  }
  return {
    pts: path,
    nm: real.get(best.k) + ends.get(best.k)
  };
}

/** Voies des nœuds d'un chemin, composées comprises : un segment commun à deux voies porte les deux noms (« G54-R66 »).
 *  Chaque nœud ne garde qu'un nom, celui de la voie qu'on suivait si le segment en fait partie, sinon celui qui dure le
 *  plus longtemps : « R66 G54-R66 G54 » s'écrit « R66 … G54 », pas quatre voies. Modifie les via de pts. */
function unify(pts) {
  const sets = pts.map(p => (p.via && p.via !== 'DCT' ? String(p.via).split('-') : null));
  let cur = '';
  pts.forEach((p, i) => {
    if (!sets[i]) return void(cur = '');
    if (!sets[i].includes(cur)) {
      const run = name => {
        let n = 0;
        while (sets[i + n]?.includes(name)) n++;
        return n;
      };
      cur = sets[i].reduce((best, name) => (run(name) > run(best) ? name : best), sets[i][0]);
    }
    p.via = cur;
  });
}

/** Un tronçon a → b : { points, routes, nm, why }. points : a, les nœuds de la voie (via : la voie qui y arrive, « DCT » pour
 *  l'entrée et la sortie directes), b ; les nœuds au bout d'une entrée ou d'une sortie de moins de 0,5 NM ne sont pas
 *  répétés (a ou b est alors sur la voie). Vide si le tronçon reste direct (why dit pourquoi). nm : longueur du chemin. */
export function leg(segments, a, b, altFt, opts = {}) {
  const S = {
      ...DEFAULTS,
      ...opts
    },
    direct = nm(a, b),
    none = why => ({
      points: [],
      routes: [],
      nm: direct,
      why
    });
  const graph = airwayGraph(segments),
    onNode = p => graph.nodes.some(n => nm(p, n) < .5),
    // départ ou arrivée loin de tout point du réseau (hors de la couverture des données)
    far = p => !graph.nodes.some(n => nm(p, n) <= Math.max(S.reachNm, 150)),
    short = direct <= S.minNm;
  // tronçon court : direct, sauf quand ses deux bouts sont des nœuds que relient des voies ouvertes à ce niveau, sans entrée ni
  // sortie directe et sans détour (« OBLOC R10 VELIN ») : la voie est alors nommée
  if (short && (!onNode(a) || !onNode(b))) return none('short');
  if (!short && (far(a) || far(b))) return none('far');
  const r = shortest(graph, a, b, altFt, short ? .5 : S.reachNm);
  if (short && (!r || r.pts.some(p => p.via === 'DCT' && nm(p, a) >= .5) || r.nm > direct * (1 + S.detourPct / 100))) return none('short');
  if (r) unify(r.pts);
  const routes = r ? [...new Set(r.pts.map(p => p.via).filter(v => v && v !== 'DCT'))] : [];
  // pas de chemin, ou aucun segment du réseau (entrée et sortie par un même nœud)
  if (!r || !routes.length) return none('none');
  if (r.nm > direct * (1 + S.detourPct / 100)) return none('detour');
  const pts = r.pts.map(p => ({
    id: safeId(p),
    lat: p.lat,
    lon: p.lon,
    via: p.via
  }));
  // a ou b posé sur le nœud : pas de point en double ni de « DCT » de longueur nulle (b arrive alors par la voie du nœud)
  let exit = 'DCT';
  if (pts.length && nm(a, pts[0]) < .5) pts.shift();
  if (pts.length && nm(pts.at(-1), b) < .5) exit = pts.pop().via;
  return {
    points: [{
      ...pointOf(a),
      via: ''
    }, ...pts, {
      ...pointOf(b),
      via: exit
    }],
    routes,
    nm: r.nm,
    why: ''
  };
}
const pointOf = p => ({
  id: p.id,
  lat: +p.lat,
  lon: +p.lon
});

/** Points d'un trajet (points d'un tronçon ou d'une chaîne, voir leg) → jetons de route_text.js. Un passage sur une voie
 *  (points consécutifs de même via, hors « DCT ») s'écrit « A VOIE B » : ses points intermédiaires (awy: true, ou suivis
 *  d'un point de même via) ne sont pas écrits. dct : écrire « DCT » entre deux points reliés en direct. */
export function tokensOf(points, {
  dct = true
} = {}) {
  const pts = (points || []).filter(Boolean),
    via = i => (pts[i]?.via && pts[i].via !== 'DCT' ? pts[i].via : ''),
    out = [];
  pts.forEach((p, i) => {
    if (!i) return out.push({
      pt: p
    });
    const v = via(i);
    if (v) {
      if (via(i - 1) !== v) out.push({
        keep: v
      });
      if (i < pts.length - 1 && via(i + 1) === v) return; // le passage continue : point non écrit
    } else if (dct) out.push({
      keep: 'DCT'
    });
    out.push({
      pt: p
    });
  });
  return out;
}
/** Texte normalisé d'un trajet (voir tokensOf) ; dct : avec « DCT » entre deux points reliés en direct. */
export const textOf = (points, opts) => textFromTokens(tokensOf(points, opts));

/** Emprise d'une chaîne de points, élargie du couloir : [ouest, sud, est, nord]. S : reachNm et padPct (DEFAULTS par défaut). */
export function corridor(chain, S = DEFAULTS) {
  const lat = chain.map(p => +p.lat),
    lon = chain.map(p => +p.lon);
  let direct = 0;
  for (let i = 1; i < chain.length; i++) direct += nm(chain[i - 1], chain[i]);
  const pad = S.reachNm + direct * S.padPct / 100,
    dLat = pad / 60,
    s = Math.min(...lat) - dLat,
    n = Math.max(...lat) + dLat,
    cos = Math.max(.2, Math.cos(rad(Math.max(Math.abs(s), Math.abs(n), 0)))),
    dLon = pad / (60 * cos);
  return [Math.max(-180, Math.min(...lon) - dLon), Math.max(-90, s), Math.min(180, Math.max(...lon) + dLon), Math.min(90, n)];
}

/** Le passage le long d'une voie écrite par le pilote, « A VOIE B » (V3 § 10.31) : [a, nœuds…, b] — les nœuds { id, lat, lon, via,
 *  awy: true }, b avec via — quand a et b sont deux nœuds de la voie name (même identifiant à moins de 3 NM, ou même position à
 *  0,5 NM) reliés en contigu le long d'elle dans segments (ceux du couloir du tronçon : jamais le même nom pris dans une autre zone) ;
 *  null sinon. Les niveaux ne comptent pas : c'est la voie que le pilote a écrite, le devis la suit. */
export function along(segments, name, a, b) {
  const W = String(name || '').toUpperCase(),
    key = n => `${String(n.id || '').toUpperCase()}|${(+n.lat).toFixed(3)}|${(+n.lon).toFixed(3)}`,
    nodes = new Map(),
    adj = new Map();
  for (const s of segments || []) {
    if (String(s?.route || '').toUpperCase() !== W || !isNum(s.a?.lat) || !isNum(s.b?.lat)) continue;
    const [ka, kb] = [key(s.a), key(s.b)],
    d = nm(s.a, s.b);
    nodes.set(ka, s.a);
    nodes.set(kb, s.b);
    adj.set(ka, [...(adj.get(ka) || []), [kb, d]]);
    adj.set(kb, [...(adj.get(kb) || []), [ka, d]]);
  }
  const same = (n, p) => String(n.id || '').toUpperCase() === String(p.id || '').toUpperCase() && nm(n, p) < 3 || nm(n, p) < .5,
    find = p => [...nodes.keys()].find(k => same(nodes.get(k), p)),
    from = a && find(a),
    to = b && find(b);
  if (!from || !to || from === to) return null;
  // plus court passage le long de la voie (Dijkstra sur ses seuls segments)
  const dist = new Map([
      [from, 0]
    ]),
    prev = new Map(),
    open = new Set([from]);
  while (open.size) {
    const u = [...open].reduce((x, y) => dist.get(y) < dist.get(x) ? y : x);
    open.delete(u);
    if (u === to) break;
    for (const [v, d] of adj.get(u) || []) {
      const nd = dist.get(u) + d;
      if (!dist.has(v) || nd < dist.get(v)) {
        dist.set(v, nd);
        prev.set(v, u);
        open.add(v);
      }
    }
  }
  if (!dist.has(to)) return null;
  const path = [];
  for (let k = prev.get(to); k && k !== from; k = prev.get(k)) path.unshift(nodes.get(k));
  return [a, ...path.map(n => ({
    id: n.id,
    lat: +n.lat,
    lon: +n.lon,
    via: W,
    awy: true
  })), {
    ...b,
    via: W
  }];
}

/** La voie qui relie a à b le long de ses propres nœuds, niveaux ignorés (V3 § 10.31 : dire pourquoi un tronçon reste direct,
 *  « A34 relie LACOU à LMG, fermée au FL260 ») : { name, floor, ceiling, nm } — floor : le plus haut plancher, ceiling : le plus
 *  bas plafond des segments du passage (ft) ; la plus courte quand plusieurs relient a et b ; null sans voie. segments : ceux du
 *  couloir du tronçon. */
export function joiningAirway(segments, a, b) {
  const segs = (segments || []).filter(s => s && isNum(s.a?.lat) && isNum(s.b?.lat)),
    same = (n, p) => String(n.id || '').toUpperCase() === String(p.id || '').toUpperCase() && nm(n, p) < 3 || nm(n, p) < .5,
    names = [...new Set(segs.filter(s => same(s.a, a) || same(s.b, a)).map(s => String(s.route || '').toUpperCase()))];
  let best = null;
  for (const name of names) {
    const path = along(segs, name, a, b);
    if (!path) continue;
    let floor = 0,
      ceiling = Infinity,
      len = 0;
    for (let i = 1; i < path.length; i++) {
      const p = path[i - 1],
        q = path[i],
        s = segs.find(x => String(x.route || '').toUpperCase() === name && (same(x.a, p) && same(x.b, q) || same(x.a, q) && same(x.b, p)));
      if (s) {
        floor = Math.max(floor, +s.lower || 0);
        ceiling = Math.min(ceiling, isNum(s.upper) ? +s.upper : Infinity);
      }
      len += nm(p, q);
    }
    if (!best || len < best.nm) best = {
      name,
      floor,
      ceiling,
      nm: len
    };
  }
  return best;
}

/** Tronçons d'une chaîne de points { id, lat, lon[, altFt] } routés sur les voies ouvertes à leur niveau.
 *  opts : altFt (niveau, ft ; défaut DEFAULTS.ifrMinFt) ; altOf(i) → niveau du tronçon i (de chain[i] à chain[i + 1]) ;
 *  skip(i) → vrai pour garder le tronçon i direct (déjà sur une voie, procédure…) ; reachNm, detourPct, minNm, padPct.
 *  Résultat : { points, legs, nm, routes } — points : la chaîne avec les nœuds de voie insérés (via : la voie qui y arrive,
 *  « DCT » pour l'entrée, awy: true aux points que le texte n'écrit pas), les points de la chaîne gardés tels quels ;
 *  legs[i] : { status: 'routed' | 'short' | 'far' | 'none' | 'detour' | 'skipped', routes, nm, points } ; nm : longueur des
 *  tronçons routés ; routes : noms des voies utilisées, dans l'ordre. La base est lue une fois pour toute la chaîne. */
export async function expand(aerodb, chain, opts = {}) {
  const S = {
      ...DEFAULTS,
      ...opts
    },
    pts = (chain || []).filter(p => p && isNum(p.lat) && isNum(p.lon)),
    alt = i => Math.round(+(opts.altOf?.(i) ?? opts.altFt ?? S.ifrMinFt)) || S.ifrMinFt;
  // la base n'est lue que si un tronçon long (plus de minNm) en a besoin ; elle sert alors aussi aux courts, qui prennent la voie
  // reliant leurs deux bouts quand il y en a une (leg) ; une chaîne de tronçons courts seulement ne demande rien
  let wanted = [];
  for (let i = 0; i < pts.length - 1; i++)
    if (!opts.skip?.(i)) wanted.push(i);
  if (!wanted.some(i => nm(pts[i], pts[i + 1]) > S.minNm)) wanted = [];
  let segments = [];
  if (wanted.length && aerodb?.airways) {
    const sel = [...new Set(wanted.flatMap(i => [i, i + 1]))].map(i => pts[i]);
    segments = await aerodb.airways({
      bbox: corridor(sel, S)
    });
    // rien de lu : la base manque-t-elle (pas d'accès, hors ligne, rien de publié) ou n'a-t-elle simplement pas de voie ?
    const st = aerodb.state?.().state;
    if (!segments.length && st && st !== 'ready' && st !== 'loading') throw new RoutingError(st);
  } else if (wanted.length && !aerodb?.airways) throw new RoutingError('noaccess');
  const out = [],
    legs = [],
    routes = [];
  let total = 0;
  pts.forEach((p, i) => {
    if (!i) out.push(p);
    if (i >= pts.length - 1) return;
    const q = pts[i + 1],
      r = opts.skip?.(i) ? {
        points: [],
        routes: [],
        nm: nm(p, q),
        why: 'skipped'
      } : leg(wanted.includes(i) ? segments : [], p, q, alt(i), S);
    // un point que le texte n'écrit pas (awy) : le passage sur la voie continue au point suivant
    const mid = r.points.slice(1, -1).map((n, k, all) => (n.via && n.via !== 'DCT' && (all[k + 1] || r.points.at(-1)).via === n.via ?
      {
        ...n,
        awy: true
      } : n)),
      routed = r.points.length > 0;
    legs.push({
      status: routed ? 'routed' : r.why || 'short',
      routes: r.routes,
      nm: r.nm,
      points: routed ? [r.points[0], ...mid, r.points.at(-1)] : []
    });
    if (routed) {
      total += r.nm;
      routes.push(...r.routes);
      out.push(...mid);
      // q arrive par la voie du dernier nœud, ou en direct
      out.push({
        ...q,
        via: r.points.at(-1).via
      });
    } else out.push(q);
  });
  return {
    points: out,
    legs,
    nm: total,
    routes
  };
}

/** Un trajet de a à b sur les voies ouvertes au niveau opts.altFt : { points, text, nm, dct, routes } ou null si aucune voie
 *  ne sert (tronçon court, loin du réseau, pas de chemin, détour trop long). points : a, les nœuds, b (via, awy : voir
 *  expand) ; text : « PT1 UN460 PT2 DCT PT3 » (points d'une même voie regroupés) ; dct : le trajet contient une partie en
 *  direct (entrée ou sortie) ; routes : les voies, dans l'ordre. Lève RoutingError si la base manque. */
export async function route(aerodb, a, b, opts = {}) {
  const r = await expand(aerodb, [a, b], opts);
  if (r.legs[0]?.status !== 'routed') return null;
  const points = r.points,
    text = textOf(points, {
      dct: true
    });
  return {
    points,
    text,
    nm: Math.round(r.nm * 10) / 10,
    dct: /\bDCT\b/.test(text),
    routes: r.routes
  };
}
