// V3 frame/lib (propriétaire : fuel) — le modèle d'une route depuis son texte, en calcul pur sur une base donnée (refonte § 10.33
// R-F4) : les jetons du texte (route_text.js) résolus en points (la base, puis les points connus du vol), les voies tapées suivies
// par leurs nœuds (routing.js along) ou dites fermées, les niveaux gardés là où ils changent. Ni page, ni stockage : la base est
// celle que l'appelant passe (ctx.aerodb dans Carburant), un objet inventé dans le banc frame/lib/test/route_model.html.
// API :
//   routeModel(text, { dep, arr, known, chain, base }) → { points, unresolved, tokens, badAirways } (voir la fonction).
//   AIRWAY_WORD : la forme d'un désignateur de voie, composé compris (UN460, G54-R66).

import {
  tokenize
} from './route_text.js';
import {
  along,
  corridor
} from './routing.js';

/** Points d'une route. Deux formes : la liste « ID lat lon[/N0450F370] » d'un OFP (une entrée par ligne ou virgule),
 *  ou un texte libre façon item 15 (« LFBO N0450F350 DCT TOU UN460 NTS/F280 LFRN »). Dans le texte libre : groupes
 *  vitesse-niveau et DCT écartés (le niveau d'un groupe, ou un « /Fnnn » collé à un point, devient l'alt_ft de ce
 *  point) ; voies aériennes et procédures gardées telles quelles dans le texte (pas de points) ; coordonnées OACI
 *  (4436N00612E, 44N006E) et « NOM lat lon » lus comme points ; un identifiant cherché dans aerodb, sinon dans known
 *  (known : points déjà connus du vol ; un point posé à la main garde sa position), sinon signalé inconnu. Départ et arrivée
 *  ajoutés aux extrémités s'ils manquent (dep, arr). Les niveaux ne restent que là où ils changent, jamais au départ ni à
 *  l'arrivée. Un point écrit après une voie aérienne (« NEPIX UN460 LUGEN ») porte via: « UN460 » ; les points de la
 *  voie entre les deux, que le texte n'écrit pas, sont repris de chain (les points déjà gardés du vol : awy: true, via:
 *  la voie) quand ils y reliaient les mêmes deux points — c'est ce que le bouton « Auto » laisse dans route.points.
 *  base : la face d'aerodb lue (coords(id), airways({ bbox }), state()), null
 *  sans base. Sortie : { points, unresolved, tokens, badAirways } — tokens : la suite lue ({ pt: point } | { keep: mot }) pour réécrire le texte
 *  normalisé (routeText). */
export async function routeModel(text, {
  dep = '',
  arr = '',
  known = new Map(),
  chain = [],
  base = null
} = {}) {
  const points = [],
    unresolved = [],
    tokens = [];
  let via = ''; // voie aérienne lue depuis le dernier point : le point suivant y arrive par elle
  /** Position d'un identifiant : un point arrivé par une voie garde la position de son segment (aerodb ne connaît pas
   *  toujours les extrémités des voies, ni le bon point si le nom existe ailleurs) ; sinon aerodb, puis un point déjà
   *  connu du vol ; null sinon. */
  const find = async id => {
    const kv = known.get(id);
    if (kv?.via && Number.isFinite(+kv.lat) && Number.isFinite(+kv.lon)) return {
      lat: +kv.lat,
      lon: +kv.lon
    };
    const c = base ? await base.coords(id).catch(() => null) : null;
    if (c && Number.isFinite(+c.lat)) return {
      lat: +c.lat,
      lon: +c.lon
    };
    const k = known.get(id);
    return k ? {
      lat: k.lat,
      lon: k.lon
    } : null;
  };
  /** Ajoute un point (et son jeton) ; son niveau s'il en a un. */
  const add = (id, c, alt) => {
    const p = {
      id,
      lat: c.lat,
      lon: c.lon,
      ...(alt ? {
        alt_ft: alt
      } : {})
    };
    if (via && points.length) {
      p.via = via;
      // points de la voie entre le précédent et celui-ci, s'ils étaient déjà gardés
      const prev = points.at(-1),
        i = chain.findIndex(q => q && q.id === prev.id && !q.awy);
      let j = i + 1;
      while (i >= 0 && chain[j]?.awy && chain[j].via === via) j++;
      if (i >= 0 && j > i + 1 && chain[j]?.id === id && chain[j].via === via)
        for (const q of chain.slice(i + 1, j)) points.push({
          ...q
        });
    }
    via = '';
    points.push(p);
    tokens.push({
      pt: p
    });
  };
  // « A VOIE B » (V3 § 10.31) : un mot en forme de voie entre deux points nommés est une voie quand la base a une voie de ce nom à
  // proximité ; un point de la base du même nom ne gagne jamais contre elle (utilisateur, 30 octobre : « A3 » lu comme un point près
  // de Gibraltar, 1 871 NM). Sans voie de ce nom à proximité, l'identifiant reste un point (PO421…)
  const near = new Map(),
    airwayNear = async (name, p) => {
        const k = `${name}|${Math.round(+p.lat)}|${Math.round(+p.lon)}`;
        if (!near.has(k)) near.set(k, Promise.resolve().then(() => base?.airways?.({
          bbox: [+p.lon - 3, +p.lat - 2, +p.lon + 3, +p.lat + 2]
        })).then(s => (s || []).some(x => String(x?.route || '').toUpperCase() === name), () => false));
        return near.get(k);
      },
      words = tokenize(text);
  // jetons du texte (frame/lib/route_text.js) ; un nom est cherché dans aerodb, puis parmi les points connus
  for (const [ti, t] of words.entries()) {
    const nx = words[ti + 1];
    if (t.kind === 'name' && AIRWAY_WORD.test(t.id) && points.length && (nx?.kind === 'name' || nx?.kind === 'coord') && await airwayNear(
        t
        .id, points.at(-1))) {
      via = t.id;
      tokens.push({
        keep: t.id
      });
      continue;
    }
    if (t.kind === 'group') { // groupe vitesse-niveau seul : niveau du dernier point
      if (t.alt_ft && points.length) points.at(-1).alt_ft = t.alt_ft;
    } else if (t.kind === 'coord') add(t.id, t, t.alt_ft);
    else if (t.kind === 'name') {
      const c = await find(t.id);
      if (c) add(t.id, c, t.alt_ft);
      else {
        if (!t.airway) unresolved.push(t.id); // voie aérienne ou procédure : gardée dans le texte, sans alerte
        if (AIRWAY_WORD.test(t.id)) via = t.id;
        tokens.push({
          keep: t.id
        });
      }
    } else {
      if (AIRWAY_WORD.test(t.id)) via = t.id; // voie composée (G54-R66)
      tokens.push({
        keep: t.id
      });
    }
  }
  if (dep && points[0]?.id !== dep) {
    const c = await find(dep);
    if (c) {
      const p = {
        id: dep,
        lat: c.lat,
        lon: c.lon
      };
      points.unshift(p);
      tokens.unshift({
        pt: p
      });
    } else if (!unresolved.includes(dep)) unresolved.unshift(dep);
  }
  if (arr && points.at(-1)?.id !== arr) {
    const c = await find(arr);
    if (c) add(arr, c);
    else if (!unresolved.includes(arr)) unresolved.push(arr);
  }
  // une voie écrite n'est suivie que si ses deux bouts en sont des nœuds reliés le long d'elle dans le couloir du tronçon : ses nœuds
  // sont alors insérés (la distance et la carte la suivent) ; sinon le tronçon reste direct et la ligne le dit (badAirways). Les
  // nœuds déjà gardés du vol (awy) sont repris tels quels ; sans base lisible, rien n'est jugé
  const badAirways = [];
  for (let i = 1; i < points.length; i++) {
    const p = points[i],
      a = points[i - 1];
    if (!p.via || !AIRWAY_WORD.test(p.via) || a.awy || p.awy || !base?.airways) continue;
    const segs = await base.airways({
        bbox: corridor([a, p])
      }).catch(() => null),
      st = base.state?.().state;
    if (!segs || !segs.length && st && st !== 'ready') continue;
    const path = along(segs, p.via, a, p);
    if (path) {
      const mid = path.slice(1, -1);
      points.splice(i, 0, ...mid);
      i += mid.length;
    } else {
      badAirways.push({
        w: p.via,
        a: a.id,
        b: p.id
      });
      delete p.via;
    }
  }
  // niveaux : seuls les changements restent (une route d'OFP répète son niveau à chaque point), jamais au départ ni à
  // l'arrivée — le vol part au niveau du plan
  let prev = points[0]?.alt_ft;
  points.forEach((p, i) => {
    const a = p.alt_ft;
    if (!i || i === points.length - 1 || a === prev) delete p.alt_ft;
    if (a) prev = a;
  });
  return {
    points,
    unresolved,
    tokens,
    badAirways
  };
}
/** Désignateur de voie aérienne, composé compris (UN460, G54-R66) : le mot qui précède un point y arrivant par cette voie. */
export const AIRWAY_WORD = /^[A-Z]{1,2}\d{1,4}[A-Z]?(-[A-Z]{1,2}\d{1,4}[A-Z]?)*$/;
