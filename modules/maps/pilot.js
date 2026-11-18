// V3 maps — ce que le pilote peut voir d'une mission à tiroirs (SOG-0448 ; docs/technique/FORMAT_MISSION.md § 4 bis). AUCUNE règle ici : la règle est
// celle du lecteur de missions (frame/lib/mission.js, pilotView) ; ce fichier ne fait que la porter à la mission que la Carte analyse
// elle-même (modules/maps/mission.js), pour que ce qui appartient à un tiroir fermé ne soit ni dessiné ni nommé — ni la cible, ni les
// zones, ni les points, ni le cadrage des cartes que ces lieux auraient fixé.
//   pilotRoot(root, opened, mine) → le YAML analysé SANS les lieux que pilotView cache ; `root` lui-même (le même objet) quand la mission n'a pas
//   de tiroir : une mission sans tiroir se dessine comme avant.
import {
  readMission,
  pilotView,
  visible
} from '../../frame/lib/mission.js';
import {
  openPath,
  readOpen
} from '../missions/drawers.js'; // le document des tiroirs ouverts que « Affectation » publie sur l'appareil, et sa lecture bornée (FORMAT_MISSION § 4 bis, AFFECTATION_MISSIONS § 11.4)

const word = v => typeof v === 'string' || typeof v === 'number' ? visible(v).replace(/\s+/g, ' ').trim().toUpperCase() : '';
const plain = v => v && typeof v === 'object' && !Array.isArray(v) ? v : null;
const idOf = (x, key = '') => word(plain(x) ? x.id ?? key : x ?? key);
/** Les clés de liste de lieux que MapsMission.parse lit (points d'itinéraire, rendez-vous) et celles de la cible. */
const PLACES = ['turning_points', 'turningPoints', 'points_tournants', 'waypoints', 'points', 'rendezvous', 'rdv'];
const TARGETS = ['target', 'cible'];

/** Une liste du fichier (tableau, ou dictionnaire identifiant → entrée) sans les entrées que `drop(id)` refuse. Une entrée seule (un objet
 *  qui porte lui-même sa position) est gardée ou rendue absente. */
function without(v, drop) {
  if (Array.isArray(v)) return v.filter(x => !drop(idOf(x)));
  const o = plain(v);
  if (!o) return v;
  if ('lat' in o || 'lon' in o || 'latitude' in o || 'longitude' in o || 'id' in o) return drop(idOf(o)) ? undefined : o;
  return Object.fromEntries(Object.entries(o).filter(([k, x]) => !drop(idOf(x, k))));
}
/** Les entrées d'une liste du fichier (tableau, dictionnaire identifiant → entrée, ou une entrée seule) comme des objets qui portent leur identifiant. */
const entries = v => Array.isArray(v) ? v.filter(plain) : plain(v) ? 'lat' in v || 'lon' in v || 'latitude' in v || 'longitude' in v ||
  'id' in v ? [v] : Object.entries(v)
  .filter(([, x]) => plain(x)).map(([id, x]) => ({
    id,
    ...x
  })) : [];
/** Le fichier tel que le LIT le lecteur, avec les lieux que la Carte accepte sous d'autres clés (alias de la V2 : waypoints, points, rdv, points_tournants, turningPoints,
 *  ou sous `mission:`) rangés avec ceux que le lecteur connaît (turning_points, rendezvous), et les zones écrites sous `mission:` : ainsi le lecteur — sa règle, sa
 *  résolution des routes et des clés des tiroirs — juge TOUS les lieux que la Carte dessinerait (Sécurisation, 18 nov. 2026 : un lieu sous `waypoints:` cité seulement
 *  par un tiroir fermé échappait à `hidden`). Le fichier lui-même n'est pas modifié. */
function readerDoc(root) {
  const box = plain(root.mission) || {},
    turns = [...entries(root.turning_points)],
    rdvs = [...entries(root.rendezvous)];
  for (const k of PLACES) {
    const own = k === 'turning_points' || k === 'rendezvous';
    if (own && root[k] !== undefined) continue; // déjà lu par le lecteur
    const list = entries(root[k] ?? box[k]).map(p => ({
      ...p,
      lat: p.lat ?? p.latitude,
      lon: p.lon ?? p.lng ?? p.longitude
    }));
    (k === 'rendezvous' || k === 'rdv' ? rdvs : turns).push(...list);
  }
  return {
    ...root,
    turning_points: turns,
    rendezvous: rdvs,
    zones: root.zones ?? box.zones
  };
}
/** Le YAML analysé que la Carte dessine : celui du fichier, moins ce que le pilote ne voit pas.
 *  `opened` : les lettres des tiroirs ouverts de MA mission ; `mine` : faux pour une mission qu'on feuillette (aucun tiroir ouvert). Une
 *  lecture qui échoue, ou une mission sans tiroir, rend le YAML tel quel quand il n'a rien à cacher — jamais un lieu de plus. */
export function pilotRoot(root, opened = [], mine = false) {
  const rm = plain(root) ? readMission(readerDoc(root)) : null;
  if (!rm || !Array.isArray(rm.drawers) || !rm.drawers.length) return root; // pas de tiroir, pas de secret
  const pv = pilotView(rm, opened, {
      mine: mine === true
    }),
    seen = new Set(Object.keys(pv.points).map(word)),
    hidden = new Set(Object.keys(rm.points).map(word).filter(id => !seen.has(id))),
    zonesSeen = new Set(pv.zones.map(z => word(z.id))),
    cut = box => {
      const o = {
        ...box
      };
      for (const k of PLACES)
        if (k in o) {
          const v = without(o[k], id => hidden.has(id));
          if (v === undefined) delete o[k];
          else o[k] = v;
        }
      // les zones : gardées seulement si le lecteur les garde (sans identifiant, elles ne sont pas citées : cachées)
      if ('zones' in o) {
        const v = without(o.zones, id => !zonesSeen.has(id));
        if (v === undefined) delete o.zones;
        else o.zones = v;
      }
      if (pv.target === null)
        for (const k of TARGETS) delete o[k];
      return o;
    },
    out = cut(root);
  if (plain(root.mission)) out.mission = cut(root.mission);
  // le cheminement du profil vertical (SOG-0459) : le texte `vertical_profile.route` (dont la Carte tire ses jetons de route) et les `route_points` que le studio a résolus nomment des lieux ;
  // la vue du lecteur (`profileRoute`, `profilePoints`) en a retiré ceux qu'elle ne garde pas — la Carte les prend de la VUE, jamais du fichier (le reste de `vertical_profile` est gardé)
  if (plain(root.vertical_profile)) out.vertical_profile = {
    ...root.vertical_profile,
    route: typeof pv.profileRoute === 'string' ? pv.profileRoute : '',
    route_points: (Array.isArray(pv.profilePoints) ? pv.profilePoints : []).map(q => ({
      id: q.id,
      ...(q.name ? {
        name: q.name
      } : {}),
      lat: q.lat,
      lon: q.lon,
      ...(Number.isFinite(q.alt_ft) ? {
        alt_ft: q.alt_ft
      } : {})
    }))
  };
  return out;
}

/** Les tiroirs ouverts de la mission `missionId`, tels que « Affectation des missions » les publie sur l'appareil (cache/missions/open_<ID>.json, lu par
 *  readOpen, jamais tel quel) : `{ opened, mine }`. Rien n'est publié, le document est d'une autre mission ou trop vieux, ou la lecture échoue : aucun tiroir
 *  ouvert et la mission n'est pas tenue pour la mienne — l'échec est fermé. */
export async function drawersState(ctx, missionId) {
  const closed = {
      opened: [],
      mine: false
    },
    path = openPath(missionId);
  if (!path || typeof ctx?.data?.get !== 'function') return closed;
  try {
    const r = readOpen(await ctx.data.get(path), missionId);
    return {
      opened: r.opened,
      mine: r.mine === true
    };
  } catch {
    return closed;
  }
}
/** Une clé de l'état (pour ne redessiner que s'il change). */
export const stateKey = st => `${st.mine ? 1 : 0}:${(st.opened || []).join('')}`;
/** Le chemin du document des tiroirs ouverts d'une mission (celui d'Affectation), ou null. */
export const openDocPath = openPath;
