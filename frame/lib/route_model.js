// V3 frame/lib (propriétaire : fuel) — le modèle d'une route depuis son texte, en calcul pur sur une base donnée (refonte § 10.33
// R-F4) : les jetons du texte (route_text.js) résolus en points (la base, puis les points connus du vol), les voies tapées suivies
// par leurs nœuds (routing.js along) ou dites fermées, les niveaux gardés là où ils changent. Ni page, ni stockage : la base est
// celle que l'appelant passe (ctx.aerodb dans Carburant), un objet inventé dans le banc frame/lib/test/route_model.html.
// API :
//   routeModel(text, { dep, arr, known, chain, base, procs, nat }) → { points, unresolved, tokens, badAirways, homonyms, jumps, natTracks,
//   natDirect, reading } (voir la fonction ; SOG-0679 : reading = { notUnderstood (les mots non compris dans l'ordre du texte, « C/… »
//   compris), unplaced (les points par relèvement et distance, pas placés), rules ([{ rule: 'VFR' | 'IFR', after: le point qui précède
//   ou null }]), speeds (les vitesses écrites), stays (les arrêts « STAY… » écrits), headLevel (le niveau du groupe de tête, 0 sans lui), steps (un niveau écrit à un point) } ; natTracks : les lettres des routes NAT gardées, « G » pour « NATG », SOG-0372 ; nat : les routes NAT du
//   jour lues et valides, [{ id, points: [{ id, lat, lon }] }] — aerodb.natTracks() —, null si elles ne le sont pas ; natDirect : les routes
//   NAT gardées NON dépliées, [{ l, why: 'unread' | 'gone' | 'ends' }]).
//   NAT_TRACK : le nom d'une route NAT dans un texte (« NATG »), gardé tel qu'écrit entre deux mots de la route (SOG-0372).
//   JUMP_NM : au-delà, un tronçon entre deux points consécutifs est dit (jumps) : un homonyme lointain, un point mal tapé (SOG-0142).
//   far : les noms dont le seul lieu connu (ou le plus proche) est plus loin de la route que 2 × la distance directe + FAR_EXTRA_NM —
//   non placés, jamais pris en silence (SOG-0142, « LFRS PAM LFBD » : la seule PAM du cycle était aux États-Unis).
//   AIRWAY_WORD : la forme d'un désignateur de voie, composé compris (UN460, G54-R66).
//   flightRules(rules, { dep, arr }) → { letter: 'I' | 'V' | 'Y' | 'Z', start, changes: [{ rule, at }] } | null : la règle de vol de
//   la route, déduite des « VFR » / « IFR » écrits (SOG-0679 : elle ne se saisit pas) ; null sans eux.

import {
  tokenize
} from './route_text.js';
import {
  gcNm,
  rhumbNm
} from './geo.js';
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
 *  sans base. Un nom porté par plusieurs lieux (homonymes : PAM aux Pays-Bas et aux États-Unis) se résout au plus proche du point
 *  précédent résolu (le premier : du milieu départ → arrivée), jamais au premier trouvé (SOG-0142) : base.coordsAll(id, { near }) quand la
 *  base l'a, base.coords(id, { near }) sinon. Sortie : { points, unresolved, tokens, badAirways, homonyms: [{ id, n }], jumps: [{ a, b, nm }] }
 *  — tokens : la suite lue ({ pt: point } | { keep: mot }) pour réécrire le texte normalisé (routeText) ; homonyms : les noms qui en avaient
 *  plusieurs (le plus proche gardé) ; jumps : les tronçons de plus de JUMP_NM. */
export async function routeModel(text, {
  dep = '',
  arr = '',
  known = new Map(),
  chain = [],
  base = null,
  procs = [],
  nat = null
} = {}) {
  // SOG-0372 (c), décision de l'ergonome du 16/11 à 9 h 00 : les noms de la SID et de la STAR CHOISIES (procs) sont ces procédures,
  // gardées sans alerte — par égalité avec le choix, jamais par un motif général (un mot de la forme américaine reste un point)
  const procSet = new Set((Array.isArray(procs) ? procs : []).map(x => String(x ?? '').toUpperCase()).filter(Boolean)),
    natTracks = [], // SOG-0372 : les lettres des routes NAT gardées (« G »), que l'appelant compare aux routes du jour lues
    natAt = []; // SOG-0372 : chaque route NAT gardée et le point qui la précède (son entrée), dépliée après la lecture
  const points = [],
    unresolved = [],
    tokens = [],
    // SOG-0679 : les mots que la suite ne comprend pas (dits sous la route, jamais un silence), et chaque changement de règle de vol
    // avec le point qu'il suit (null en tête)
    notUnderstood = [],
    rules = [],
    // SOG-0679 : les points par relèvement et distance (lus, pas placés), les vitesses écrites, le niveau du groupe de tête
    unplaced = [],
    speeds = [],
    stays = []; // SOG-0679 (addendum, le relais) : les arrêts écrits (« STAY1/0045 »), leur durée jamais appliquée au devis
  let headLevel = 0;
  let via = ''; // voie aérienne lue depuis le dernier point : le point suivant y arrive par elle
  const ads = new Set(); // les points du texte qu'aerodb connaît comme aérodromes
  const homonyms = [];
  // SOG-0142 (refus du 10 nov., « LFRS PAM LFBD passe toujours pas les USA ») : un lieu plus loin de la route que FAR (2 × la distance
  // directe + FAR_EXTRA_NM, la règle du moteur de route d'AeroDB, 1aa2ceb62) n'est pas celui du vol — sur le poste, la seule PAM du cycle en
  // vigueur était à Tyndall (la base néerlandaise du 29/10 n'a pas de points) : non placé, dit (far), jamais repris des points du vol
  let farNm = Infinity;
  const far = [],
    farIds = new Set();
  /** Le lieu `c` d'un nom, s'il n'est pas trop loin de `near` ; sinon null, et dit. */
  const notFar = (id, near, c) => {
    if (!c || !near || !Number.isFinite(farNm) || !Number.isFinite(+c.lat) || !Number.isFinite(+c.lon)) return c;
    const nm = nmOf(near, c);
    if (nm <= farNm) return c;
    if (!farIds.has(id)) far.push({
      id,
      nm: Math.round(nm)
    });
    farIds.add(id);
    return null;
  };
  /** Le lieu d'un nom le plus proche de `near` parmi ceux que la base rend (coordsAll), sinon sa réponse unique (coords) ; les deux
   *  reçoivent { near } (la recherche de l'homonyme proche toutes zones confondues est celle d'aerodb). */
  const nearest = async (id, near) => {
    if (!base) return null;
    // la forme du contrat d'aerodb : near = [lat, lon] (frame/aerodb/INTEGRATION.md « Homonyms »)
    const at = near ? [+near.lat, +near.lon] : null,
      all = at && typeof base.coordsAll === 'function' ? await Promise.resolve(base.coordsAll(id, {
        near: at
      })).catch(() => []) : [],
      ok = all.filter(x => Number.isFinite(+x?.item?.lat) && Number.isFinite(+x?.item?.lon)),
      // un code OACI de terrain (quatre lettres) que la base connaît comme aérodrome se résout à ce terrain, sans homonymes : une balise
      // ou un repère du même nom n'en est pas un (SOG-0154, « LFLL : 2 homonymes ») ; le plus proche si plusieurs terrains le portent
      ads = /^[A-Z]{4}$/.test(id) ? ok.filter(x => x.kind === 'aerodrome') : [];
    if (ads.length) {
      const best = ads.sort((x, y) => nmOf(near, x.item) - nmOf(near, y.item))[0];
      return notFar(id, near, {
        lat: +best.item.lat,
        lon: +best.item.lon,
        kind: best.kind
      });
    }
    if (ok.length > 1) {
      homonyms.push({
        id,
        n: ok.length
      });
      const best = ok.sort((x, y) => nmOf(near, x.item) - nmOf(near, y.item))[0];
      return notFar(id, near, {
        lat: +best.item.lat,
        lon: +best.item.lon,
        kind: best.kind
      });
    }
    if (ok.length === 1) return notFar(id, near, {
      lat: +ok[0].item.lat,
      lon: +ok[0].item.lon,
      kind: ok[0].kind
    });
    return notFar(id, near, await Promise.resolve(base.coords(id, at ? {
      near: at
    } : undefined)).catch(() => null));
  };
  /** Position d'un identifiant : un point arrivé par une voie garde la position de son segment (aerodb ne connaît pas
   *  toujours les extrémités des voies, ni le bon point si le nom existe ailleurs) ; sinon aerodb (l'homonyme le plus proche de
   *  `near`), puis un point déjà connu du vol ; null sinon. */
  const find = async (id, near = null) => {
    const kv = known.get(id);
    if (kv?.via && Number.isFinite(+kv.lat) && Number.isFinite(+kv.lon)) return {
      lat: +kv.lat,
      lon: +kv.lon
    };
    const c = await nearest(id, near);
    if (c && Number.isFinite(+c.lat)) return {
      lat: +c.lat,
      lon: +c.lon,
      ad: c.kind === 'aerodrome' && /^[A-Z]{4}$/.test(
        id) // un code OACI : jamais un repère ou une balise qu'une base nomme comme un terrain
    };
    const k = farIds.has(id) ? null : known.get(id);
    // un point du vol lui-même (route écrite avant) passe la même borne : un lieu lointain gardé d'une lecture d'avant n'est pas repris
    return k ? notFar(id, near, {
      lat: k.lat,
      lon: k.lon
    }) : null;
  };
  /** Ajoute un point (et son jeton) ; son niveau s'il en a un, et la vitesse écrite avec lui (SOG-0679, jamais appliquée). */
  const add = (id, c, alt, speed = '', altA = false) => {
    if (speed) speeds.push(speed);
    const p = {
      id,
      lat: c.lat,
      lon: c.lon,
      ...(alt ? {
        alt_ft: alt
      } : {}),
      ...(alt && speed ? {
        speed
      } : {}),
      ...(alt && altA ? {
        alt_a: true
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
    if (c.ad) ads.add(p);
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
      words = tokenize(text),
      // le repère du premier nom : le milieu du départ et de l'arrivée (le grand cercle du vol), le départ seul, ou rien
      [depC, arrC] = await Promise.all([dep, arr].map(x => x && base ? Promise.resolve(base.coords(x)).catch(() => null) : null)),
      okC = c => c && Number.isFinite(+c.lat) && Number.isFinite(+c.lon),
      mid = okC(depC) && okC(arrC) ? {
        lat: (+depC.lat + +arrC.lat) / 2,
        lon: (+depC.lon + +arrC.lon) / 2
      } : okC(depC) ? depC : okC(arrC) ? arrC : null;
  if (okC(depC) && okC(arrC)) farNm = 2 * nmOf(depC, arrC) + FAR_EXTRA_NM;
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
    // SOG-0372 (c) : « NAT » et une lettre, entre deux mots de la route, est le nom d'une route NAT ; le nom de la SID ou de la STAR
    // choisie est cette procédure : gardés tels qu'écrits, jamais « inconnus »
    if (t.kind === 'name' && (procSet.has(t.id) || NAT_TRACK.test(t.id) && ti > 0 && (nx?.kind === 'name' || nx?.kind === 'coord'))) {
      if (!procSet.has(t.id) && !natTracks.includes(t.id.slice(3))) natTracks.push(t.id.slice(3));
      if (!procSet.has(t.id) && points.length) natAt.push({
        l: t.id.slice(3),
        entry: points.at(-1)
      });
      tokens.push({
        keep: t.id
      });
      continue;
    }
    if (t.kind === 'group') { // groupe vitesse-niveau seul : niveau du dernier point
      if (t.speed) speeds.push(t.speed);
      if (t.vfr) rules.push({ // SOG-0679 (addendum) : « K0210VFR », la règle de vol écrite dans le groupe
        rule: 'VFR',
        after: points.at(-1)?.id || null
      });
      // SOG-0679 : en tête (avant le départ ou contre lui), le groupe reste écrit et son niveau est dit non appliqué ; au milieu, sa
      // vitesse suit le niveau du point qui le précède (« TOU N0450F370 » s'écrit « TOU/N0450F370 »)
      if (points.length <= 1) {
        if (t.alt_ft && !headLevel) headLevel = t.alt_ft;
        if (t.word) tokens.push({
          keep: t.word
        });
      } else if (t.alt_ft && t.speed) points.at(-1).speed = t.speed;
      if (t.alt_ft && points.length) {
        points.at(-1).alt_ft = t.alt_ft;
        if (t.alt_a) points.at(-1).alt_a = true; // SOG-0679 (addendum) : une altitude (A045) reste une altitude
        else delete points.at(-1).alt_a;
      }
    } else if (t.kind === 'coord') add(t.id, t, t.alt_ft, t.speed, t.alt_a);
    else if (t.kind === 'name') {
      // le départ et l'arrivée du vol écrits dans le texte sont ces terrains : jamais jugés « trop loin » du point qui les précède (une
      // arrivée écrite après un point de l'Atlantique était écartée, gardée en mot, puis l'arrivée ajoutée : « … LFML LFML », garde F216)
      const own = t.id === dep || t.id === arr,
        c = await find(t.id, own ? null : points.at(-1) || mid);
      if (c) add(t.id, c, t.alt_ft, t.speed, t.alt_a);
      else {
        if (!t.airway) unresolved.push(t.id); // voie aérienne ou procédure : gardée dans le texte, sans alerte
        if (AIRWAY_WORD.test(t.id)) via = t.id;
        tokens.push({
          keep: t.id
        });
      }
    } else if (t.form === 'remark') { // SOG-0679 (addendum) : OAT, GAT, STAY : compris, gardés ; un arrêt est dit non appliqué
      if (/^STAY/.test(t.id)) stays.push(t.id);
      tokens.push({
        keep: t.id
      });
    } else if (t.form === 'rule') { // SOG-0679 : la règle de vol, gardée dans le texte
      rules.push({
        rule: t.id,
        after: points.at(-1)?.id || null
      });
      tokens.push({
        keep: t.id
      });
    } else if (t.form ===
      'cruise') { // SOG-0679 : la montée en croisière ; son point est un point de la route, ses niveaux ne s'appliquent pas
      const inner = tokenize(t.point)[0],
        c = inner?.kind === 'coord' ? inner : inner?.kind === 'name' ? await find(inner.id, points.at(-1) || mid) : null;
      notUnderstood.push(t.id); // SOG-0679 (l'ergonome) : « Non compris : C/… », son point reste un point de la route
      if (t.speed) speeds.push(t.speed);
      if (c) {
        add(t.point, c, 0);
        points.at(-1).cruise = t.id;
      } else if (inner?.form ===
        'brgdist') { // SOG-0679 (addendum) : « C/NTR270010/… » : son point n'est pas situé, dit, jamais « inconnu »
        unplaced.push(inner.id);
        tokens.push({
          keep: t.id
        });
      } else {
        unresolved.push(t.point);
        tokens.push({
          keep: t.id
        });
      }
    } else {
      if (AIRWAY_WORD.test(t.id)) via = t.id; // voie composée (G54-R66)
      else if (t.form === 'brgdist') unplaced.push(t.id); // SOG-0679 : lu, pas placé (relèvement magnétique), dit en avertissement
      else notUnderstood.push(t.id); // SOG-0679 : tout mot sans forme
      tokens.push({
        keep: t.id
      });
    }
  }
  // un terrain n'est jamais un point de route (SOG-0033, SOG-0034) : un aérodrome en tête du texte qui n'est pas le départ du vol (l'ancien
  // départ resté dans le texte après un changement de terrain), en fin qui n'est pas l'arrivée, ou le départ ou l'arrivée du vol répété
  // au milieu, est retiré des points et du texte normalisé ; le départ et l'arrivée du vol sont posés ensuite. Un autre aérodrome au
  // milieu reste (une route VFR peut passer par un terrain)
  const drop = new Set(points.filter((p, i) => ads.has(p) && (i === 0 ? dep && p.id !== dep : i === points.length - 1 ? arr && p.id !==
    arr : p.id === dep || p.id === arr)));
  if (drop.size) {
    for (let i = 1; i < points.length; i++)
      if (drop.has(points[i - 1]) && !drop.has(points[i])) delete points[i].via; // sa voie partait du terrain retiré
    points.splice(0, points.length, ...points.filter(p => !drop.has(p)));
    tokens.splice(0, tokens.length, ...tokens.filter(t => !(t.pt && drop.has(t.pt))));
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
  const natDirect = unfoldNat(points, natAt, nat);
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
    if (!i || i === points.length - 1 || a === prev) {
      delete p.alt_ft;
      delete p.speed; // SOG-0679 : la vitesse suit le niveau écrit
      delete p.alt_a;
    }
    if (a) prev = a;
  });
  // les homonymes ne se disent que pour les points de route, jamais pour le départ et l'arrivée du vol (SOG-0154)
  homonyms.splice(0, homonyms.length, ...homonyms.filter(h => h.id !== dep && h.id !== arr));
  // les tronçons de plus de JUMP_NM entre deux points consécutifs (un homonyme lointain, un nom mal tapé) : dits, jamais corrigés en silence
  const jumps = [];
  for (let i = 1; i < points.length; i++) {
    const nm = rhumbNm(points[i - 1], points[i]); // la longueur du tronçon au compas, celle du devis (Q-0019)
    if (nm > JUMP_NM) jumps.push({
      a: points[i - 1].id,
      b: points[i].id,
      nm: Math.round(nm)
    });
  }
  return {
    points,
    unresolved,
    // SOG-0679 : la lecture en clair de la route (route_lines.js de Carburant) ; steps : un niveau écrit à un point, tenu en palier
    reading: {
      notUnderstood,
      unplaced,
      rules,
      speeds,
      headLevel,
      steps: points.slice(1, -1).some(p => p.alt_ft > 0),
      stays
    },
    tokens,
    badAirways,
    homonyms,
    jumps,
    far,
    natTracks,
    natDirect
  };
}
/** Au-delà de 2 × la distance directe + cette marge, un lieu n'est pas celui de la route (SOG-0142 ; la règle du moteur d'AeroDB). */
export const FAR_EXTRA_NM = 400;
/** Au-delà de cette distance entre deux points consécutifs, le tronçon est dit (SOG-0142). */
export const JUMP_NM = 1000;
/** Distance orthodromique en NM entre deux { lat, lon } : gcNm de geo.js (SOG-0468). */
const nmOf = gcNm;
/** Désignateur de voie aérienne, composé compris (UN460, G54-R66) : le mot qui précède un point y arrivant par cette voie. */
export const AIRWAY_WORD = /^[A-Z]{1,2}\d{1,4}[A-Z]?(-[A-Z]{1,2}\d{1,4}[A-Z]?)*$/;
/** SOG-0372 (refus du 16/11 à 14 h 53, « on a toujours des tracés directs entre Dublin et JFK ») : chaque route NAT gardée (natAt :
 *  { l, entry }) est dépliée dans `points` — les points de la route du jour entre son entrée (le point qui précède le mot) et sa sortie
 *  (le point qui le suit), quand les deux sont sur elle, dans cet ordre (même nom, ou même position à 0,1° près). Les routes du jour sont
 *  une entrée non sûre : une lettre, 40 points au plus, nombres finis et bornés, identifiant de 12 signes au plus. Rend les routes NON
 *  dépliées : [{ l, why }] — 'unread' (aucune route du jour lue et valide), 'gone' (pas de route de cette lettre), 'ends' (entrée ou sortie
 *  hors de la route). La traversée reste alors un direct, et l'appelant le dit. */
function unfoldNat(points, natAt, nat) {
  const out = [];
  if (!natAt.length) return out;
  const tracks = new Map();
  for (const t of Array.isArray(nat) ? nat.slice(0, 60) : []) {
    const id = String(t?.id ?? '').toUpperCase();
    if (!/^[A-Z]$/.test(id) || !Array.isArray(t.points) || tracks.has(id)) continue;
    tracks.set(id, t.points.slice(0, 40).filter(q => q && Number.isFinite(+q.lat) && Number.isFinite(+q.lon) && Math.abs(+q.lat) <= 90 &&
      Math.abs(+q.lon) <= 180).map(q => ({
      id: String(q.id ?? '').trim().toUpperCase().slice(0, 12),
      lat: +q.lat,
      lon: +q.lon
    })));
  }
  const same = (a, b) => !!a && !!b && (a.id && a.id === String(b.id ?? '').toUpperCase() || Math.abs(a.lat - +b.lat) <= 0.1 && Math.abs(a
    .lon - +b.lon) <= 0.1);
  for (const n of natAt.slice().reverse()) {
    const i = points.indexOf(n.entry),
      exit = i >= 0 ? points[i + 1] : null,
      tr = tracks.get(n.l);
    if (!Array.isArray(nat) || !nat.length) {
      out.unshift({
        l: n.l,
        why: 'unread'
      });
      continue;
    }
    if (!tr) {
      out.unshift({
        l: n.l,
        why: 'gone'
      });
      continue;
    }
    const a = tr.findIndex(q => same(q, n.entry)),
      b = exit ? tr.findIndex((q, k) => k > a && same(q, exit)) : -1;
    if (a < 0 || b < 0) {
      out.unshift({
        l: n.l,
        why: 'ends'
      });
      continue;
    }
    points.splice(i + 1, 0, ...tr.slice(a + 1, b).map(q => ({
      id: q.id,
      lat: q.lat,
      lon: q.lon,
      nat: n.l
    })));
  }
  return out;
}
/** SOG-0372 : le nom d'une route NAT tel que le moteur l'écrit dans une route prise (« NATG ») : « NAT » et une lettre. */
export const NAT_TRACK = /^NAT[A-Z]$/;
/** SOG-0372 : un texte qui porte un nom de route NAT (« NATG ») : les routes du jour sont alors lues pour le déplier. */
export const NAT_IN_TEXT = /(^|\s)NAT[A-Z](\s|$)/i;

/** SOG-0679 : la règle de vol déduite des « VFR » / « IFR » du texte (reading.rules) — la règle au départ (écrite en tête ou contre le
 *  départ ; sinon le contraire du premier changement, qui ne se dit que si la règle change), les changements le long de la route (un
 *  changement qui répète la règle en cours ne compte pas ; deux au même point : le dernier ; à l'arrivée : aucun), et la lettre de
 *  l'item 8 : I ou V sans changement, Y d'IFR vers VFR, Z de VFR vers IFR. null sans règle écrite. */
export function flightRules(rules, {
  dep = '',
  arr = ''
} = {}) {
  const list = (Array.isArray(rules) ? rules : []).filter(r => r && (r.rule === 'VFR' || r.rule === 'IFR'));
  if (!list.length) return null;
  const D = String(dep || '').toUpperCase(),
    A = String(arr || '').toUpperCase(),
    raw = [];
  let start = null;
  for (const r of list) {
    const at = typeof r.after === 'string' && r.after ? r.after.toUpperCase() : null;
    if ((!at || at === D) && !raw.length) start = r.rule;
    else if (at && at !== A) {
      if (raw.length && raw.at(-1).at === at) raw.at(-1).rule = r.rule;
      else raw.push({
        rule: r.rule,
        at
      });
    }
  }
  if (!start) start = raw.length ? raw[0].rule === 'VFR' ? 'IFR' : 'VFR' : null;
  const changes = [];
  let cur = start;
  for (const c of raw)
    if (c.rule !== cur) {
      changes.push(c);
      cur = c.rule;
    }
  return {
    letter: changes.length ? start === 'IFR' ? 'Y' : 'Z' : start === 'IFR' ? 'I' : 'V',
    start,
    changes
  };
}
