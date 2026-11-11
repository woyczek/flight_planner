// V3 data — le tableau de couverture par pays (SOG-0174, V3_SPECIFICATION § 10.44) : la lecture de base/coverage (aerodb, contrat écrit dans frame/aerodb/INTEGRATION.md) mise en lignes bornées, les valeurs des colonnes et le tri. Pur : ni page, ni lanceur, ni stockage ;
// tout ce que le lanceur répond est une entrée non fiable (identifiants de zone et de source en liste, nombres entiers bornés, booléens stricts).

/** Les colonnes du tableau après le pays (sept colonnes au plus à l'écran : le pays et ces six). */
export const COV_COLS = ['points', 'airways', 'airspaces', 'fir', 'procedures', 'ground'];
/** Les sources que le contrat connaît (liste fermée des clés de SOURCES, base_sources.py) : un identifiant hors liste est ignoré. */
export const COV_SOURCES = ['airnav', 'dfs', 'dircam', 'enaire', 'faa', 'faaclass', 'lfv', 'mora', 'nat', 'nats', 'navcan', 'navpt',
  'openaip',
  'sia', 'ukmil', 'xplane'
];
const ZONE = /^[a-z0-9_-]{2,12}$/;
const CYCLE = /^\d{4}-\d{2}-\d{2}$/;
const KINDS = ['aerodromes', 'navaids', 'points', 'airways', 'airspaces', 'vrp', 'fir'];
const HAS = ['points', 'navaids', 'airways', 'airspaces', 'fir', 'procedures', 'ground'];
/** Un entier ≥ 0 borné à un milliard, 0 sinon (« 0 » veut dire « non » : le contrat n'a pas d'inconnu dans un compte). */
const int = v => Number.isInteger(v) && v >= 0 ? Math.min(v, 1e9) : 0;
/** Les identifiants de source d'un tableau du contrat : de la liste fermée, sans doublon, dix au plus. */
const sources = a => [...new Set(Array.isArray(a) ? a.filter(x => COV_SOURCES.includes(x)) : [])].slice(0, 10);
/** La fin d'un travail base/coverage en lignes [{ zone, cycle, parser, counts, procedures, ground, declared, present, has }], dans l'ordre reçu, quatre-vingt-dix au plus ; null si ce n'est pas une réponse lisible (échec, refus, forme inattendue). */
export function coverageOf(final) {
  const r = final?.state === 'done' && final.result !== null && typeof final.result === 'object' ? final.result : null;
  if (!r || r.ok === false || r.zones === null || typeof r.zones !== 'object' || Array.isArray(r.zones)) return null;
  const rows = [];
  for (const [zone, z] of Object.entries(r.zones).slice(0, 90)) {
    if (!ZONE.test(zone) || z === null || typeof z !== 'object') continue;
    const counts = Object.fromEntries(KINDS.map(k => [k, int(z.counts?.[k])]));
    rows.push({
      zone,
      cycle: typeof z.cycle === 'string' && CYCLE.test(z.cycle) ? z.cycle : null,
      parser: Number.isInteger(z.parserVersion) && z.parserVersion >= 0 ? Math.min(z.parserVersion, 1e6) : null,
      counts,
      procedures: int(z.procedures),
      ground: int(z.ground),
      declared: sources(z.sources?.declared),
      present: sources(z.sources?.present),
      has: Object.fromEntries(HAS.map(k => [k, z.has?.[k] === true]))
    });
  }
  return rows;
}
/** La valeur d'une colonne pour une ligne : le nombre d'enregistrements (0 : « non »). */
export function covValue(row, col) {
  return col === 'procedures' ? row.procedures : col === 'ground' ? row.ground : row.counts[col] ?? 0;
}
/** Les lignes triées (une copie) : par nom de pays (`key` 'zone', `name(zone)` donne le nom) ou par une colonne, `dir` 'asc' | 'desc' ; à égalité, le nom. */
export function sortCoverage(rows, key, dir, name) {
  const by = (a, b) => String(name(a.zone)).localeCompare(String(name(b.zone)), 'fr');
  const s = dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => key === 'zone' ? s * by(a, b) : s * (covValue(a, key) - covValue(b, key)) || by(a, b));
}
