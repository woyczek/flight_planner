// modules/aircraft/registry_read.js — SOG-0341 : le registre français PUBLIÉ dans le dépôt des données (registry/fr_immat.json, écrit
// par le lanceur d'un poste à la reprise de l'export, AeroDB), lu par la page quand le lanceur du poste n'est pas là (le téléphone, le
// site publié). Le fichier vient d'un dépôt où tout pilote écrit : une ENTRÉE NON SÛRE (frame/aerodb/INTEGRATION.md) — la même
// reconstruction que le lanceur (tools/registry_fr.py rebuild) et la même recherche (lookup). Pur : ni page, ni stockage, ni réseau.
//
// API :
//   REG_PATH, REG_COLUMNS, REG_CREDIT
//   rebuildRegistry(doc) → { rows: [[reg, maker, model, serial, base]], date } | null (un fichier d'une autre forme)
//   lookupRegistry(reb, { reg, type }, limit) → { rows: [{ reg, maker, model, serial, base }], truncated }
//   normReg(s) : l'immatriculation sans tiret ni espace, en majuscules

/** Le fichier publié, sous le dépôt des données. */
export const REG_PATH = 'registry/fr_immat.json';
/** Les cinq colonnes, dans cet ordre (la liste blanche de SOG-0270 : aucun nom de personne). */
export const REG_COLUMNS = ['IMMATRICULATION', 'CONSTRUCTEUR', 'MODELE', 'NUMERO_SERIE', 'AERODROME_ATTACHE'];
/** La source citée : un texte de la page, jamais celui du fichier. */
export const REG_CREDIT = 'Registre français des immatriculations, DGAC';
const MAX_ROWS = 300000,
  MAX_FIELD = 80,
  // k-anonymat (Sécurisation, 12/11) : un constructeur porté par moins de dix aéronefs est laissé vide (un constructeur amateur est une
  // personne) — recompté ici, on ne se fie pas à l'écrivain du fichier
  MIN_MAKER = 10,
  REG = /^(?:[A-Z0-9]{1,2}-[A-Z0-9]{2,6}|[A-Z0-9]{4,8})$/;

/** Une cellule nettoyée : sans caractère de commande ni marque de format (U+202E…), bornée à 80 signes. */
const clean = v => String(v).replace(/[\u0000-\u001f\u007f]|\p{Cf}/gu, '').trim().slice(0, MAX_FIELD);
/** L'immatriculation sans tiret ni espace, en majuscules. */
export const normReg = s => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Le document publié reconstruit comme une entrée non sûre : ses propres champs `columns` (exactement les cinq noms) et `rows` (une
 *  liste de 300 000 lignes au plus) ; chaque ligne gardée a exactement cinq textes, nettoyés, une immatriculation de la forme attendue
 *  et un modèle ; le constructeur de moins de dix aéronefs vidé ; la date AAAA-MM-JJ ou ''. Toute autre clé est ignorée. null sinon. */
export function rebuildRegistry(doc) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc) || !Object.hasOwn(doc, 'columns') || !Object.hasOwn(doc, 'rows')) return null;
  const cols = doc.columns,
    list = doc.rows;
  if (!Array.isArray(cols) || cols.length !== REG_COLUMNS.length || cols.some((x, i) => x !== REG_COLUMNS[i])) return null;
  if (!Array.isArray(list) || list.length > MAX_ROWS) return null;
  const rows = [];
  for (const r of list) {
    if (!Array.isArray(r) || r.length !== REG_COLUMNS.length || !r.every(x => typeof x === 'string')) continue;
    const cells = r.map(clean);
    if (!REG.test(cells[0]) || !cells[2]) continue;
    rows.push(cells);
  }
  if (!rows.length) return null;
  const makers = new Map();
  for (const r of rows) {
    if (!makers.has(r[1])) makers.set(r[1], new Set());
    makers.get(r[1]).add(r[0]);
  }
  for (const r of rows)
    if (r[1] && makers.get(r[1]).size < MIN_MAKER) r[1] = '';
  const date = Object.hasOwn(doc, 'date') && typeof doc.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(doc.date) ? doc.date : '';
  return {
    rows,
    date
  };
}

/** Les lignes d'une immatriculation (avec ou sans tiret), ou d'un type (tous les mots dans constructeur + modèle : « cessna 172 »),
 *  `limit` au plus ; truncated : il y en avait davantage. La même recherche que le verbe aircraft/registry du lanceur. */
export function lookupRegistry(reb, {
  reg = '',
  type = ''
} = {}, limit = 50) {
  const out = [],
    want = reg ? normReg(reg) : '',
    words = String(type || '').toLowerCase().trim().split(/\s+/).filter(Boolean),
    n = Math.max(1, Math.min(200, Math.floor(+limit) || 50));
  if (!reb?.rows || (!want && !words.length)) return {
    rows: out,
    truncated: false
  };
  for (const r of reb.rows) {
    if (want && normReg(r[0]) !== want) continue;
    if (words.length) {
      const hay = `${r[1]} ${r[2]}`.toLowerCase();
      if (!words.every(w => hay.includes(w))) continue;
    }
    if (out.length === n) return {
      rows: out,
      truncated: true
    };
    out.push({
      reg: r[0],
      maker: r[1],
      model: r[2],
      serial: r[3],
      base: r[4]
    });
  }
  return {
    rows: out,
    truncated: false
  };
}
