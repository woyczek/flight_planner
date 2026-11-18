// V3 missions — l'essai des clés de l'atelier (SOG-0444, lot P4 ; modules/missions/EDITOR.md § 4), le calcul pur. Ni page, ni
// stockage, ni réseau, ni horloge : la mission LUE par le lecteur (frame/lib/mission.js readMission), un temps, une vitesse, une
// altitude → où est l'avion de l'essai, quels tiroirs sont ouverts, par quoi, et un journal de faits. Rien n'est écrit dans la mission.
//
// LE MÊME JUGEMENT QUE LE VOL : une zone franchie, un objet à portée, une arrivée posée sont jugés par le service du cadre
// (frame/lib/crossing.js : crossed, reach, arrived) sur le TRAJET entre deux relevés ; l'heure d'un tiroir par passageMin du lecteur
// (l'estimation que le vol emploie) ; l'ORDRE est celui du vol (modules/missions/drawers.js) : seul le PREMIER tiroir encore fermé peut
// s'ouvrir, et ce qui est dû joue dès que celui d'avant s'ouvre. Une donnée qui manque ne satisfait JAMAIS une clé : le journal dit
// « inconnu » et pourquoi. Ce que le service ne juge pas est dit par l'essai : les arrêts demandés avant une arrivée (jugés ici, sur
// la trace de l'essai), « à portée ET déclaré » (la case de l'essai), et ce que le vol ne juge pas encore (une condition de vol, une
// cible mobile, un suivi : notJudgedYet du lecteur) — ces tiroirs-là ne s'ouvrent qu'à l'heure de repli ou à la main, comme en vol.
//
// L'avion de l'essai : il part du terrain de départ, suit la route du départ à vitesse constante et se pose à l'arrivée ; quand un
// tiroir qui porte une suite de route s'ouvre, il la prend (« Prendre la suite de route »), puis rejoint l'arrivée. Son altitude est
// celle que l'auteur donne (null : inconnue) ; sa hauteur au-dessus du sol n'est pas connue de l'essai (pas de relief ici).
//
// API :
//   TRIAL : les bornes (pas de calcul en minutes, durée, vitesse, altitude).
//   trialRun(mission, { untilMin, speedKt, altFt, declares, hands, puts }) → { ok, why?, min, fix, trail, landedMin, drawers, log } :
//     ok faux quand la mission n'a pas de route à suivre (why : 'route') ou n'est pas lisible (why : 'data') ; ne lève jamais ; fix : le relevé de l'avion à `untilMin` ({ lat, lon, altFt,
//     onGround, gsKt }) ; trail : sa trace ([[lat, lon]…], 240 points au plus) ; landedMin : la minute où il se pose (null : en vol) ;
//     drawers : [{ id, rank, open, how ('time' | 'zone' | 'object' | 'arrival' | 'fallback' | 'hand' | null), min }] ;
//     log : [{ min, ev, rank?, how?, why? }] dans l'ordre — ev : 'start', 'open' (how), 'route' (l'avion prend la suite de route du
//     tiroir), 'near' (objet à portée : le pilote doit le déclarer), 'ceiling' (dans la zone, au-dessus de son plafond), 'unknown' (why :
//     'alt' — il manque l'altitude ; 'height' — il manque la hauteur ; 'ground' — « au sol » inconnu ; 'time' — le point de l'heure n'est
//     pas sur la route, ou la mission n'a pas de vitesse ; 'data'), 'stops' (arrivé sans avoir fait les arrêts demandés), 'unjudged'
//     (une clé que le vol ne juge pas encore), 'unread' (une clé que le lecteur ne lit pas), 'hand' (à ouvrir à la main), 'landed'.
//     declares : le pilote déclare « Objet en vue » dès qu'il est à portée (vrai par défaut) ; hands : { B: 12 } — le pilote ouvre ce
//     tiroir à la main à cette minute ; puts : [{ min, lat, lon }] — « Poser l'avion ici » (lot P2) : à cette minute l'auteur pose
//     l'avion à cette position (vingt poses au plus, bornées ; une pose illisible est ignorée). POSER N'EST PAS VOLER : il est jugé
//     là sur sa position seule, sans trajet depuis là où il était (une zone où on le pose s'ouvre, un objet à portée se trouve ; une
//     zone qu'un trait droit aurait traversée ne s'ouvre pas) ; puis il repart de là vers ce qu'il lui restait à suivre ; posé après
//     son atterrissage, il reste au sol, là. Le journal dit 'put'.
import * as CR from '../../frame/lib/crossing.js';
import * as MS from '../../frame/lib/mission.js';

export const TRIAL = Object.freeze({
  puts: 20, // « Poser l'avion ici » : vingt poses au plus
  stepMin: 0.25,
  maxMin: 600,
  speedKt: Object.freeze([20, 600]),
  altFt: Object.freeze([-1500, 60000]),
  trail: 240
});
const T0 = Date.UTC(2026, 0, 1), // une origine de temps fixe : l'essai n'a pas d'horloge
  rad = Math.PI / 180;

/** Un nombre fini dans [lo, hi], sinon `dflt` (jamais ramené dans les bornes : hors bornes, c'est la valeur par défaut). */
const within = (v, lo, hi, dflt) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : dflt;
/** Une position lue ({ lat, lon } finis), ou null. */
const at = p => p && Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180 ? {
  lat: p.lat,
  lon: p.lon
} : null;
/** La distance entre deux positions, en milles marins. */
const nm = (a, b) => {
  const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lon - a.lon) * rad /
    2) ** 2;
  return 2 * 3440.065 * Math.asin(Math.min(1, Math.sqrt(h)));
};

/** Les positions que l'avion de l'essai suit : le départ, les points situés de la route du départ, l'arrivée (la carte de l'atelier
 *  dessine la même route : editor_map.js). */
export function pathOf(mission) {
  let f = null;
  try {
    f = MS.missionFlight(mission);
  } catch {
    return []; // une mission qui n'est pas celle du lecteur : pas de route à suivre, jamais une exception
  }
  if (!f) return [];
  const out = [];
  for (const p of [f.route.depAt, ...f.route.points, f.route.arrAt].map(at).filter(Boolean))
    if (!out.length || nm(out[out.length - 1], p) > 0.01) out.push(p);
  return out;
}

/** L'essai (voir l'en-tête). Ne lève jamais : une « mission » qui n'est pas celle du lecteur (un arrêt nul, une clé piégée) rend « pas
 *  d'essai » (ok faux, why 'data') — Sécurisation, relecture du 18 nov. 2026. */
export function trialRun(mission, opts = {}) {
  try {
    return run(mission, opts);
  } catch {
    return {
      ok: false,
      why: 'data',
      min: 0,
      fix: null,
      trail: [],
      landedMin: null,
      drawers: [],
      log: []
    };
  }
}

/** L'essai, sans sa garde. */
function run(mission, opts) {
  const m = mission && typeof mission === 'object' ? mission : {},
    o = opts && typeof opts === 'object' ? opts : {},
    drawers = (Array.isArray(m.drawers) ? m.drawers : []).filter(d => d && typeof d === 'object').slice(0, MS.DRAWER_IDS
      .length), // jamais plus que le lecteur n'en rend
    until = within(o.untilMin, 0, TRIAL.maxMin, 0),
    speed = within(o.speedKt, ...TRIAL.speedKt, within(m.cruiseSpeedKt, ...TRIAL.speedKt, 120)),
    alt = within(o.altFt, ...TRIAL.altFt, null),
    declares = o.declares !== false,
    hands = o.hands && typeof o.hands === 'object' ? o.hands : {},
    // « Poser l'avion ici » : les poses lisibles (une minute et une position dans leurs bornes), dans l'ordre du temps
    puts = (Array.isArray(o.puts) ? o.puts : []).slice(0, TRIAL.puts).map(p => {
      const a = p && typeof p === 'object' ? at(p) : null,
        min = a ? within(p.min, 0, TRIAL.maxMin, null) : null;
      return min === null ? null : {
        min,
        lat: a.lat,
        lon: a.lon
      };
    }).filter(Boolean).sort((a, b) => a.min - b.min),
    path = pathOf(m),
    none = {
      ok: false,
      why: 'route',
      min: until,
      fix: null,
      trail: [],
      landedMin: null,
      drawers: drawers.map(d => ({
        id: d.id,
        rank: d.rank,
        open: false,
        how: null,
        min: null
      })),
      log: []
    };
  if (path.length < 2) return none;
  const end = path[path.length - 1],
    open = new Map(),
    said = new Set(),
    visited = new Set(), // les arrêts demandés par une arrivée, déjà faits (par leur identifiant)
    log = [{
      min: 0,
      ev: 'start'
    }],
    trail = [
      [path[0].lat, path[0].lon]
    ],
    once = (d, ev, more = {}) => {
      if (said.has(`${d.id}:${ev}:${more.why || ''}`)) return;
      said.add(`${d.id}:${ev}:${more.why || ''}`);
      log.push({
        min: t,
        ev,
        rank: d.rank,
        ...more
      });
    };
  let pos = path[0],
    todo = path.slice(1),
    landed = null,
    t = 0,
    fix = null,
    prev = null;
  /** Le relevé de l'avion à cet instant : au sol au départ et une fois posé, à l'altitude donnée ; la hauteur sol n'est pas connue. */
  const fixNow = () => ({
    t: T0 + Math.round(t * 60000),
    lat: pos.lat,
    lon: pos.lon,
    altFt: alt,
    onGround: t === 0 || landed !== null,
    gsKt: t === 0 || landed !== null ? 0 : speed,
    source: 'trial'
  });
  /** L'avion avance de `d` milles marins sur ce qu'il lui reste à suivre ; arrivé au bout, il est posé. */
  const advance = d => {
    while (d > 0 && todo.length) {
      const leg = nm(pos, todo[0]);
      if (leg <= d) {
        d -= leg;
        pos = todo.shift();
      } else {
        const k = d / leg;
        pos = {
          lat: pos.lat + (todo[0].lat - pos.lat) * k,
          lon: pos.lon + (todo[0].lon - pos.lon) * k
        };
        d = 0;
      }
    }
    if (!todo.length && landed === null) {
      landed = t;
      log.push({
        min: t,
        ev: 'landed'
      });
    }
  };
  /** Ce qui ouvre ce tiroir à cet instant : { how }, ou null (il reste fermé ; le journal dit pourquoi, une fois). */
  const judge = d => {
    const key = d.key && typeof d.key === 'object' ? d.key : {
        kind: 'hand'
      },
      hand = hands[d.id],
      fallback = () => Number.isFinite(key.fallbackMin) && t >= key.fallbackMin ? {
        how: 'fallback'
      } : null;
    if (typeof hand === 'number' && Number.isFinite(hand) && t >= hand) return {
      how: 'hand'
    };
    if (d.keyWhy && d.keyWhy !== 'several') {
      once(d, 'unread');
      return fallback();
    }
    if (key.kind === 'time') {
      const p = MS.passageMin(m, key.point),
        due = p && p.min !== null ? p.min + (Number.isFinite(key.delayMin) ? key.delayMin : 0) : null;
      if (due === null) {
        once(d, 'unknown', {
          why: 'time'
        });
        return null;
      }
      return t >= due ? {
        how: 'time'
      } : null;
    }
    if (MS.notJudgedYet(key)) {
      once(d, 'unjudged');
      return fallback();
    }
    if (key.kind === 'zone') {
      const c = CR.crossed(prev, fix, key);
      if (c.touched === true) return {
        how: 'zone'
      };
      // dans la zone, mais son plafond ne se juge pas (altitude inconnue) ou n'est pas tenu : dit seulement quand l'avion y est
      const flat = () => CR.crossed(prev, fix, {
        ...key,
        ceilingFt: null
      }).touched === true;
      if (c.state === 'unknown' && c.reason === 'altitude') {
        if (flat()) once(d, 'unknown', {
          why: 'alt'
        });
      } else if (c.state === 'unknown') once(d, 'unknown', {
        why: 'data'
      });
      else if (c.reason === 'ceiling' && flat()) once(d, 'ceiling');
      return fallback();
    }
    if (key.kind === 'object') {
      const r = CR.reach(prev, fix, key.object);
      if (r.ok === true) {
        if (key.object?.confirm !== false && !declares) once(d, 'near');
        else return {
          how: 'object'
        };
      } else if (r.ok === null && r.distNm !== null && r.distNm <= (key.object?.rangeNm ?? 0)) once(d, 'unknown', {
        why: 'height'
      });
      return fallback();
    }
    if (key.kind === 'arrival') {
      const stops = (Array.isArray(key.required) ? key.required : []).filter(s => s && typeof s === 'object').slice(0, 20);
      for (const s of stops)
        if (!visited.has(s.id) && CR.reach(prev, fix, {
            lat: s.lat,
            lon: s.lon,
            rangeNm: key.radiusNm
          }).ok === true) visited.add(s.id);
      const a = CR.arrived(fix, key);
      if (a.ok === true) {
        if (stops.every(s => visited.has(s.id))) return {
          how: 'arrival'
        };
        once(d, 'stops');
      } else if (a.ok === null && a.distNm !== null && a.distNm <= key.radiusNm) once(d, 'unknown', {
        why: 'ground'
      });
      return fallback();
    }
    const f = fallback();
    if (!f) once(d, 'hand');
    return f;
  };
  /** Les poses dues à cet instant : l'avion est posé là (la dernière l'emporte) ; il garde ce qu'il lui restait à suivre. Le relevé
   *  d'avant est oublié : le pas suivant le juge sur sa position seule (poser n'est pas voler). */
  const put = () => {
    while (puts.length && puts[0].min <= t + 1e-9) {
      const p = puts.shift();
      pos = {
        lat: p.lat,
        lon: p.lon
      };
      trail.push([pos.lat, pos.lon]);
      fix = null;
      log.push({
        min: t,
        ev: 'put'
      });
    }
  };
  put(); // une pose à la minute zéro : l'avion part de là
  for (;;) {
    prev = fix;
    fix = fixNow();
    // l'ordre du vol : seul le premier tiroir encore fermé peut s'ouvrir ; ce qui est dû joue dès que celui d'avant s'ouvre
    for (;;) {
      const d = drawers.find(x => x && !open.has(x.id));
      if (!d) break;
      const r = judge(d);
      if (!r) break;
      open.set(d.id, {
        how: r.how,
        min: t
      });
      log.push({
        min: t,
        ev: 'open',
        rank: d.rank,
        how: r.how
      });
      // « Prendre la suite de route » : l'avion suit la suite de route du tiroir, puis rejoint l'arrivée
      const route = (Array.isArray(d.route) ? d.route : []).map(at).filter(Boolean);
      if (route.length && landed === null) {
        todo = [...route, end];
        log.push({
          min: t,
          ev: 'route',
          rank: d.rank
        });
      }
    }
    if (t >= until - 1e-9) break;
    const step = Math.min(TRIAL.stepMin, until - t);
    t = Math.round((t + step) * 1e6) / 1e6;
    advance(speed * step / 60);
    trail.push([pos.lat, pos.lon]);
    put();
  }
  const every = Math.max(1, Math.ceil(trail.length / TRIAL.trail));
  return {
    ok: true,
    min: until,
    fix,
    trail: trail.filter((_, i) => i % every === 0 || i === trail.length - 1),
    landedMin: landed,
    drawers: drawers.map(d => ({
      id: d.id,
      rank: d.rank,
      open: open.has(d.id),
      how: open.get(d.id)?.how ?? null,
      min: open.get(d.id)?.min ?? null
    })),
    log
  };
}
