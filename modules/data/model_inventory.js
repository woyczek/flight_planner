// V3 data — le calcul pur de la carte « Inventaire des données » (SOG-0010, lot E2) : lire la réponse de GET data/inventory du lanceur en sept
// lignes bornées. Ni état, ni page, ni appel : ne dessine rien (inventory.js). La réponse est du texte et des nombres : chaque champ est
// borné et lu par une liste fermée, jamais repris tel quel (règle de l'audit 157).

/** Les sept emplacements de « data », dans l'ordre de frame/settings/DATA_MAP.md § 1 (le lanceur, tools/data_inventory.py, les rend dans le même). */
export const PLACES = Object.freeze(['repo', 'local', 'raw', 'cache', 'suite', 'downloads', 'backup']);
/** Les états de suivi par git, et les écrivains, que la carte sait dire ; toute autre valeur devient « unknown » / « other ». */
export const STATES = Object.freeze(['tracked', 'local', 'outside', 'unknown']);
export const WRITERS = Object.freeze(['launcher+pilots', 'launcher', 'user', 'app', 'suite', 'restoration', 'other']);
/** Au plus ce nombre d'octets ou de fichiers : au-delà, une valeur du lanceur est une erreur, pas un total. */
const BYTES_MAX = 1e13;
const FILES_MAX = 1e8;

/** Un nombre entier fini entre 0 et max, sinon 0. */
const bounded = (v, max) => Number.isFinite(v) ? Math.min(max, Math.max(0, Math.trunc(v))) : 0;

/** Les sept lignes à montrer d'après la réponse du lanceur ({ places: [{ id, present, bytes, files, truncated, state, writer, count? }] }) :
 *  toujours sept, dans l'ordre de PLACES, un emplacement que le lanceur ne rend pas vaut « absent » ; null si la réponse n'est pas un
 *  objet avec une liste (le lanceur est ancien ou refuse : la carte le dit, elle ne devine rien). */
export function inventoryRows(answer) {
  const list = answer && typeof answer === 'object' && Array.isArray(answer.places) ? answer.places : null;
  if (!list) return null;
  const by = new Map();
  for (const p of list) {
    if (p && typeof p === 'object' && typeof p.id === 'string' && PLACES.includes(p.id) && !by.has(p.id)) by.set(p.id, p);
  }
  return PLACES.map(id => {
    const p = by.get(id) || {};
    return {
      id,
      present: p.present === true,
      bytes: bounded(p.bytes, BYTES_MAX),
      files: bounded(p.files, FILES_MAX),
      truncated: p.truncated === true,
      state: STATES.includes(p.state) ? p.state : 'unknown',
      writer: WRITERS.includes(p.writer) ? p.writer : 'other',
      count: bounded(p.count, 1e6)
    };
  });
}

/** Le total en octets de ce qui est mesuré (les emplacements présents, hors le cache de l'appareil qui n'a pas de taille ici). */
export function inventoryTotal(rows) {
  return (rows || []).reduce((n, r) => n + (r.present ? r.bytes : 0), 0);
}
