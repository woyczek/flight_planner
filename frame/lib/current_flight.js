// V3 frame/lib (propriétaire : fuel ; report, maps et le cadre s'en servent) — écriture du vol courant
// (pilot/<trigramme>/current_flight.json) à plusieurs mains, en calcul pur : chaque module relit l'enregistrement et n'y
// remplace que ses propres champs ; progress est partagé, chacun n'y remplace que ses clés (progress.actual appartient
// au cadre). Ni page, ni stockage, ni réseau.
//
// API :
//   FUEL_FIELDS : champs de premier niveau écrits par fuel ; FUEL_PROGRESS : clés de progress écrites par fuel.
//   merge(stored, mine, { fields, progressKeys, by }) → l'enregistrement à écrire : stored (relu juste avant), avec les
//     champs fields de mine (un champ absent de mine n'est pas touché ; null efface) et, dans progress, les clés
//     progressKeys de mine.progress ; progress: null de mine n'efface que ces clés-là (la position réelle du cadre,
//     progress.actual, reste ; progress devient null s'il ne reste rien) ; schema, by et updated_at posés.

export const FUEL_FIELDS = ['aircraft', 'route', 'level', 'wind', 'windSource', 'isaDev', 'profile', 'quote', 'weather', 'ofp',
  'started', 'planned_at'
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
