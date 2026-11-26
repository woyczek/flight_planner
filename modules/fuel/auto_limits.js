// V3 fuel — les bornes des niveaux que « Auto » propose (SOG-0056, SOG-0562) : en bas FL030 et la plus haute contrainte d'une procédure
// choisie, en haut le plafond. Sorti de levelAuto de module.js (règle « on extrait ce qu'on touche », SOG-0653), sans changer le
// comportement. Ce fichier ne lit ni n'écrit rien.
//
// API : autoLimits(constraints, ceilFt, terrainFt) → { minFt, maxFt } ; constraints : route.constraints (les niveaux imposés des
//   procédures, une entrée du vol) ; ceilFt : le plafond de l'aéronef (ceilOf de module.js), FL200 sans lui ; terrainFt (SOG-0653) : la
//   plus haute MORA des cases traversées, 0 tant qu'elle n'est pas lue.
//   routeMoraFt(points, mora) → { ft, cells, unknown } : la plus haute MORA des cases d'un degré que la route traverse (chaque case
//   demandée une fois ; mora(lat, lon) : aerodb.mora) ; create(state, refresh) → { floorFt() } : la même, lue une fois par route
//   (state() : l'état du montage de module.js, S — ses points, son aerodb ; refresh() quand elle arrive et qu'« Auto » est en marche).

/** Les bornes : en bas le plus haut de FL030 et des contraintes des procédures choisies ; en haut le plafond (SOG-0562 : le plus bas de
 *  celui de la fiche et de celui du modèle), FL200 sans plafond. */
export function autoLimits(constraints, ceilFt, terrainFt = 0) {
  const cons = Object.values(constraints || {}).map(Number).filter(v => v > 0);
  return {
    // SOG-0653 (l'ergonome, 26/11) : jamais sous le relief de la route — la plus haute MORA des cases traversées ; les candidats d'« Auto »
    // sont des niveaux entiers (en milliers de pieds) au moins égaux : le plancher est relevé au niveau de la parité par eux
    minFt: Math.max(3000, ...cons, +terrainFt > 0 ? +terrainFt : 0),
    maxFt: ceilFt ?? 20000
  };
}

export const TX = {
  // SOG-0653 : le relief de la route au-dessus du plafond — aucun niveau n'est proposé, et c'est dit (français seul, SOG-0680)
  overCeil: ['Relief de la route (MORA {m} ft) au-dessus du plafond (FL{c}) : aucun niveau proposé.']
};

/** SOG-0653 : la phrase d'un plancher du relief au-dessus du plafond (« Auto » n'a alors aucun candidat), { main } pour la ligne sous le
 *  champ Niveau, ou null. */
export function overCeilWhy(lim, terrainFt, tt) {
  return +terrainFt > 0 && lim.minFt === +terrainFt && lim.minFt > lim.maxFt ? {
    main: tt(TX.overCeil, {
      m: String(Math.round(+terrainFt)),
      c: String(Math.floor(lim.maxFt / 100)).padStart(3, '0')
    })
  } : null;
}

/** SOG-0653 : le pas d'échantillonnage d'un tronçon (degrés) — moins d'un quart de case : aucune case traversée n'est sautée en coin ; et
 *  le nombre de cases lues au plus (une route transatlantique en traverse une centaine). */
const STEP_DEG = 0.2,
  MAX_CELLS = 400;

/** SOG-0653 : les cases d'un degré qu'une route traverse (le tracé point à point, échantillonné), chacune une fois, dans l'ordre. */
export function cellsOf(points) {
  const pts = (Array.isArray(points) ? points : []).filter(p => Number.isFinite(+p?.lat) && Number.isFinite(+p?.lon)),
    seen = new Map();
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1],
      b = pts[i],
      n = Math.max(1, Math.ceil(Math.max(Math.abs(+b.lat - +a.lat), Math.abs(+b.lon - +a.lon)) / STEP_DEG));
    for (let k = 0; k <= n && seen.size < MAX_CELLS; k++) {
      const lat = +a.lat + (+b.lat - +a.lat) * k / n,
        lon = +a.lon + (+b.lon - +a.lon) * k / n,
        key = `${Math.floor(lat)}|${Math.floor(lon)}`;
      if (!seen.has(key)) seen.set(key, {
        lat: Math.floor(lat) + .5,
        lon: Math.floor(lon) + .5
      });
    }
  }
  return [...seen.values()];
}

/** SOG-0653 : la plus haute MORA (ft) des cases que la route traverse ; une case sans MORA connue est comptée (unknown), jamais un 0. */
export async function routeMoraFt(points, mora) {
  const cells = cellsOf(points),
    vals = await Promise.all(cells.map(c => Promise.resolve().then(() => mora(c.lat, c.lon)).catch(() => null)));
  let ft = 0,
    unknown = 0;
  for (const v of vals)
    if (Number.isFinite(+v) && +v > 0 && v !== null) ft = Math.max(ft, Math.min(+v, 60000));
    else unknown++;
  return {
    ft,
    cells: cells.length,
    unknown
  };
}

/** SOG-0653 : le plancher du relief d'une route, lu une fois par route (ses points, à 1/1000 de degré) ; 0 tant qu'il n'est pas lu, puis
 *  host.changed() quand il arrive (le dessin suivant le prend). */
export function create(state, refresh) {
  const host = {
    points: () => state()?.flight?.route?.points,
    mora: (lat, lon) => state()?.ctx?.aerodb?.mora?.(lat, lon) ?? null,
    // arrivé, « Auto » choisit à nouveau (ses essais remis à zéro) ; rien hors d'« Auto »
    changed: () => {
      const S = state();
      if (!S?.flight?.level?.auto) return;
      S.autoTries = 0;
      refresh();
    }
  };
  let key = null,
    ft = 0;
  return {
    floorFt() {
      const pts = host.points() || [],
        k = pts.map(p => `${(+p.lat).toFixed(3)},${(+p.lon).toFixed(3)}`).join(';');
      if (k !== key) {
        key = k;
        ft = 0;
        routeMoraFt(pts, host.mora).then(r => {
          if (key !== k || !(r.ft > 0)) return;
          ft = r.ft;
          host.changed();
        }, () => {});
      }
      return ft;
    }
  };
}
