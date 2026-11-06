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

// ---- « Ranger les sources brutes » (SOG-0030) : le verbe base/move-sources du lanceur, lu en comptes bornés
/** Le verbe du lanceur : le jeu « base », le verbe « move-sources » ({ dry?, undo? }, tools/regen/base_sources.py). */
export const MOVE = Object.freeze({
  set: 'base',
  verb: 'move-sources'
});
/** Le nom d'un fichier SIA rendu par le lanceur (jamais un chemin), et le cycle de son dossier : une liste de caractères sûrs, sinon le nom n'est pas repris. */
const FILE_NAME = /^[A-Za-z0-9_ .()+-]{1,120}$/;
const CYCLE_NAME = /^[0-9A-Za-z._-]{1,16}$/;
/** Les raisons que la carte sait dire, par liste fermée : toute autre valeur du lanceur devient « other » (ou n'est pas dite). */
export const MOVE_KEPT_WHY = Object.freeze(['tracked']);
export const MOVE_REFUSED_WHY = Object.freeze(['present', 'different', 'missing', 'unsafe-path', 'too-large', 'sha-mismatch',
  'write-failed'
]);
export const MOVE_REASONS = Object.freeze(['cancelled', 'failed', 'partial']);
/** Au plus ce nombre de fichiers dans une liste (le lanceur n'en rend jamais autant : des fichiers XML du SIA, quelques dizaines). */
export const MOVE_LIST_MAX = 40;

/** Une liste du résultat, bornée : un tableau (sinon vide), au plus MOVE_LIST_MAX éléments, objets seulement. */
const listOf = v => Array.isArray(v) ? v.slice(0, MOVE_LIST_MAX).filter(x => x && typeof x === 'object') : [];
/** Un nom de fichier lisible, sinon « ? ». */
const nameOf = v => typeof v === 'string' && FILE_NAME.test(v) ? v : '?';

/** Le résultat d'un travail base/move-sources (la fin que ctx.launcher.job rend : { ok, state, result }) en un résumé borné, ou null si le lanceur n'a rien
 *  répondu de lisible (refus, ancien lanceur, travail en échec sans résultat). { dry, undo, ok, reason, files: [{ name, cycle, bytes }] (déplacés ou à déplacer),
 *  moved, bytes (leur somme), already (déjà au bon endroit), kept: [{ name }] (l'ancien gardé : suivi par git), refused: [{ name, why }] (conflits et échecs,
 *  raison dans la liste fermée), more (fichiers au-delà de la borne, non listés) }. Rien d'un chemin : le lanceur donne des noms, la carte ne garde que le nom. */
export function moveView(final) {
  const r = final && typeof final === 'object' && final.result && typeof final.result === 'object' ? final.result : null;
  if (!r || typeof r.dry !== 'boolean') return null;
  const files = listOf(r.moved).map(m => ({
      name: nameOf(m.name),
      cycle: typeof m.cycle === 'string' && CYCLE_NAME.test(m.cycle) ? m.cycle : '',
      bytes: bounded(m.bytes, BYTES_MAX)
    })),
    refused = [
      ...listOf(r.conflicts).map(x => ({
        name: nameOf(x.name),
        why: MOVE_REFUSED_WHY.includes(x.why) ? x.why : 'other'
      })),
      ...listOf(r.failed).map(x => ({
        name: nameOf(x.name),
        why: MOVE_REFUSED_WHY.includes(x.error) ? x.error : 'other'
      }))
    ];
  return {
    dry: r.dry,
    undo: r.undo === true,
    ok: r.ok === true,
    reason: MOVE_REASONS.includes(r.reason) ? r.reason : null,
    files,
    moved: files.length,
    bytes: files.reduce((n, f) => n + f.bytes, 0),
    already: Array.isArray(r.already) ? Math.min(r.already.length, FILES_MAX) : 0,
    kept: listOf(r.kept).map(x => ({
      name: nameOf(x.name)
    })),
    refused,
    more: Math.max(0, (Array.isArray(r.moved) ? r.moved.length : 0) - MOVE_LIST_MAX)
  };
}

/** Pourquoi le lanceur n'a rien fait (le travail n'a pas démarré) : 'forbidden' (403 : un appareil apparié, le relais), 'busy' (409 : un autre travail), 'unknown'
 *  (400 / 404 / 501 : ce lanceur ne connaît pas le verbe), sinon 'failed'. Le texte du lanceur n'est jamais repris. */
export function moveRefusal(final) {
  const s = Number(final && typeof final === 'object' ? final.status : 0);
  return s === 403 ? 'forbidden' : s === 409 ? 'busy' : [400, 404, 501].includes(s) ? 'unknown' : 'failed';
}

/** Le total en octets de ce qui est mesuré (les emplacements présents, hors le cache de l'appareil qui n'a pas de taille ici). */
export function inventoryTotal(rows) {
  return (rows || []).reduce((n, r) => n + (r.present ? r.bytes : 0), 0);
}
