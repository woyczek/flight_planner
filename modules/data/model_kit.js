// V3 data — les petits assistants que partagent les fichiers du calcul pur (SPEC § 11) : `obj` et l'en-tête commun des entrées du journal (`entryHead`, `jobOf`). Le fichier model.js ne le réexporte pas : ce ne sont pas des fonctions du modèle.
// Ni état, ni page, ni appel : ne lit aucun fichier d'écran et n'importe aucun autre fichier du modèle.

/** L'en-tête commun des entrées du journal : { at (UTC ISO), set, verb, <key>: ids, seconds, result, reason? }. `key` : le nom de la liste d'éléments (`zones` pour la base, `items`
 *  pour les autres) ; `ids` et `seconds` ne sont écrits que s'ils sont donnés (une publication n'a ni l'un ni l'autre) ; `seconds` est arrondi (null sans valeur). */
export function entryHead(o) {
  return {
    at: new Date(o.at).toISOString(),
    set: o.set,
    verb: o.verb,
    ...('ids' in o ? {
      [o.key || 'zones']: [...o.ids]
    } : {}),
    ...('seconds' in o ? {
      seconds: o.seconds === null || o.seconds === undefined ? null : Math.max(0, Math.round(o.seconds))
    } : {}),
    result: o.result,
    ...(o.reason ? {
      reason: o.reason
    } : {})
  };
}
/** Le numéro du travail d'une entrée du journal, s'il y en a un : { job } ou rien. */
export const jobOf = job => job ? {
  job: String(job)
} : {};
/** Un objet, sinon {}. */
export const obj = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
