// V3 frame/lib (propriétaire : fuel ; report, maps et le cadre s'en servent) — écriture du vol courant
// (pilot/<trigramme>/current_flight.json) à plusieurs mains, en calcul pur : chaque module relit l'enregistrement et n'y
// remplace que ses propres champs ; progress est partagé, chacun n'y remplace que ses clés (progress.actual appartient
// au cadre). Ni page, ni stockage, ni réseau.
//
// Le temps (flight_time.js) et la route et ses procédures (flight_path.js) sont dans deux fichiers depuis le 29 octobre 2026
// (§ 10.29 b) ; ce fichier les ré-exporte pendant la transition : importer de préférence depuis eux.
// API :
//   FUEL_FIELDS : champs de premier niveau écrits par fuel ; FUEL_PROGRESS : clés de progress écrites par fuel.
//   routeBase(rec), changesOf(base, mine), applyChanges(stored, ch), setRoute(data, path, ch, { by }) : un seul écrivain de la route et
//     du niveau (R-F4, voir plus bas) ; Carburant ne passe plus route ni level par merge.
//   merge(stored, mine, { fields, progressKeys, by }) → l'enregistrement à écrire : stored (relu juste avant), avec les
//     champs fields de mine (un champ absent de mine n'est pas touché ; null efface) et, dans progress, les clés
//     progressKeys de mine.progress ; progress: null de mine n'efface que ces clés-là (la position réelle du cadre,
//     progress.actual, reste ; progress devient null s'il ne reste rien) ; schema, by et updated_at posés.
//   isStarted(f), refTime(f), legTimes(f, { path }), etaOf(f, now, { path }), plannedPositionAt(f, now, { path }), TAXI_MIN :
//     le vol dans le temps, dérivé de started.at / planned_at, quote et profile (voir plus bas ; modules/maps/SPEC.md § 13).
//   proceduresOf(f), loadProcedures(aerodb, f) (sans doublon : dedupProcs), expandedPath(f, procs), flownPath(path) : la route et ses procédures choisies
//     (SID, STAR, approche : V3_SPECIFICATION § 10.20), un seul chemin pour le profil, les marques, les heures et le devis.
//   altitudeAt(f, nm, { cruiseFt, flown, total }), routeNmToFlown(f, flown, points) : l'altitude prévue le long du chemin volé
//     (profile.path, sinon montée / croisière / descente), et les distances de la route ramenées sur ce chemin.

export const FUEL_FIELDS = ['aircraft', 'route', 'level', 'wind', 'windSource', 'isaDev', 'profile', 'quote', 'weather', 'ofp',
  'started', 'planned_at', 'mission', // mission : l'id de la mission d'où vient le vol (modules/missions SPEC § 4)
  'missionCategory', // sa catégorie (SOG-0041, § 10.38), lue par la migration de mission_themes.js (fromCategory)
  'theme',
  'series' // le thème et le sous-thème du vol (SOG-0202 T2, § 10.48) : choisis à l'étape Vol, remplis par la mission ; le compte rendu les reprend
];
export const FUEL_PROGRESS = ['at', 'plannedPos', 'eta', 'fuelRemainingKg', 'remainingNm', 'phase'];

/** Enregistrement à écrire (voir l'en-tête). */
export function merge(stored, mine, {
  fields = [],
  progressKeys = [],
  by = ''
} = {}) {
  const cur = stored && typeof stored === 'object' ? stored : {},
    out = {
      ...cur
    };
  for (const k of fields)
    if (mine && Object.prototype.hasOwnProperty.call(mine, k)) out[k] = mine[k];
  if (mine && Object.prototype.hasOwnProperty.call(mine, 'progress') && progressKeys.length) {
    const p = {
      ...(cur.progress && typeof cur.progress === 'object' ? cur.progress : {})
    };
    if (mine.progress === null) {
      for (const k of progressKeys) delete p[k];
      out.progress = Object.keys(p).length ? p : null;
    } else if (mine.progress && typeof mine.progress === 'object') {
      for (const k of progressKeys)
        if (Object.prototype.hasOwnProperty.call(mine.progress, k)) p[k] = mine.progress[k];
      out.progress = p;
    }
  }
  out.schema = 1;
  if (by) out.by = by;
  out.updated_at = new Date().toISOString();
  return out;
}

// ---------------------------------------------------------------- un seul écrivain de la route et du niveau (refonte R-F4, 5 nov. 2026)
// Deux modules écrivent la route et le niveau du vol courant (Carburant, la Carte). Chacun en garde une copie ; écrire la copie entière
// ramenait l'état d'avant un geste de l'autre (SOG-0013 : un vieux plan revient entre les écrans). La règle : un module n'écrit que ce
// qu'il a changé depuis sa dernière lecture de l'enregistrement (sa base), clé par clé de route, et le niveau ; ce qu'un autre a écrit
// entre-temps reste. Pur sauf setRoute, qui lit et écrit par la couche de données qu'on lui donne (aucun DOM).

/** Copie profonde de données JSON (undefined → null pour les valeurs isolées). */
const jclone = v => v === undefined ? null : JSON.parse(JSON.stringify(v));
/** La base d'une copie : la route et le niveau de l'enregistrement tels qu'ils ont été lus ou écrits. */
export const routeBase = rec => ({
  route: jclone(rec?.route ?? null),
  level: jclone(rec?.level ?? null)
});
/** Ce qu'une copie a changé depuis sa base : { route: { clé: valeur }, removed: [clés retirées], level? } ; null sans changement. */
export function changesOf(base, mine) {
  const b = base?.route && typeof base.route === 'object' ? base.route : {},
    m = mine?.route && typeof mine.route === 'object' ? mine.route : {},
    route = {},
    removed = [];
  for (const k of Object.keys(m))
    if (JSON.stringify(m[k]) !== JSON.stringify(b[k])) route[k] = jclone(m[k]);
  for (const k of Object.keys(b))
    if (!Object.prototype.hasOwnProperty.call(m, k)) removed.push(k);
  const out = {
    route,
    removed
  };
  if (JSON.stringify(mine?.level ?? null) !== JSON.stringify(base?.level ?? null)) out.level = jclone(mine?.level ?? null);
  return Object.keys(route).length || removed.length || 'level' in out ? out : null;
}
/** L'enregistrement stored avec ces changements : les clés de route changées remplacées, les retirées ôtées, le niveau s'il a changé ;
 *  le reste tel qu'il est. Pur. */
export function applyChanges(stored, ch) {
  const out = {
    ...(stored && typeof stored === 'object' ? stored : {})
  };
  if (!ch) return out;
  const route = {
    ...(out.route && typeof out.route === 'object' ? out.route : {}),
    ...jclone(ch.route || {})
  };
  for (const k of ch.removed || []) delete route[k];
  out.route = route;
  if ('level' in ch) out.level = jclone(ch.level);
  return out;
}
/** Le seul écrivain de la route et du niveau : relit l'enregistrement (data.get), applique les changements (changesOf ou
 *  { route, removed, level }), pose by et updated_at, écrit (data.put) ; rend l'enregistrement écrit. La Carte s'en sert pour ses
 *  gestes, Carburant pour sa sauvegarde. */
export async function setRoute(data, path, ch, {
  by = ''
} = {}) {
  const cur = (await data.get(path)) || {},
    next = applyChanges(cur, ch);
  next.schema = 1;
  if (by) next.by = by;
  next.updated_at = new Date().toISOString();
  await data.put(path, next);
  return next;
}

// le vol dans le temps et la route et ses procédures : deux fichiers (§ 10.29 b), ré-exportés ici pendant la transition
export * from './flight_time.js';
export * from './flight_path.js';
