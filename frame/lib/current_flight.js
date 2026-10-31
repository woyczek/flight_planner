// V3 frame/lib (propriétaire : fuel ; report, maps et le cadre s'en servent) — écriture du vol courant
// (pilot/<trigramme>/current_flight.json) à plusieurs mains, en calcul pur : chaque module relit l'enregistrement et n'y
// remplace que ses propres champs ; progress est partagé, chacun n'y remplace que ses clés (progress.actual appartient
// au cadre). Ni page, ni stockage, ni réseau.
//
// Le temps (flight_time.js) et la route et ses procédures (flight_path.js) sont dans deux fichiers depuis le 29 octobre 2026
// (§ 10.29 b) ; ce fichier les ré-exporte pendant la transition : importer de préférence depuis eux.
// API :
//   FUEL_FIELDS : champs de premier niveau écrits par fuel ; FUEL_PROGRESS : clés de progress écrites par fuel.
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
  'started', 'planned_at', 'mission' // mission : l'id de la mission d'où vient le vol (modules/missions SPEC § 4)
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

// le vol dans le temps et la route et ses procédures : deux fichiers (§ 10.29 b), ré-exportés ici pendant la transition
export * from './flight_time.js';
export * from './flight_path.js';
