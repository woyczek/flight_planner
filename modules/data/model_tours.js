// V3 data — la lecture du XML des tours de piste VFR de l'extracteur de l'utilisateur (SOG-0253 ; AeroDB 34c24550e) : le verbe `vfr/circuits` (lecture seule) rend { ok, airac, extractor, aerodromes: { <OACI>: { state, circuits: [...] } },
// counts: { aerodromes, circuits, obsolete: [OACI] }, warnings: { aerodromes, circuits, points, altitude } } ou { ok: false, reason: 'no-file' | 'refused', message }. Pur : tout ce que dit le lanceur est une entrée non fiable, borné ici ; le texte du
// lanceur n'est jamais montré, ni les tracés (la Carte les lit elle-même).
const int = v => Number.isInteger(v) && v >= 0 && v <= 1e6 ? v : 0;
const ICAO = /^[A-Z0-9]{3,5}$/;
/** Ce que le lanceur a lu : { circuits, aerodromes, obsolete (le nombre de terrains dont la carte VAC a changé), warnings (le nombre d'éléments laissés de côté) } ; { refused: true } quand il refuse le fichier ; null sans réponse lisible. */
export function circuitsOf(final) {
  const r = final?.state === 'done' && final.result !== null && typeof final.result === 'object' ? final.result : null;
  if (!r) return null;
  if (r.ok === false) return {
    refused: true
  };
  const c = r.counts !== null && typeof r.counts === 'object' ? r.counts : null;
  if (!c) return null;
  const w = r.warnings !== null && typeof r.warnings === 'object' ? Object.values(r.warnings).slice(0, 8).reduce((n, v) => n + int(v), 0) :
    0;
  return {
    circuits: int(c.circuits),
    aerodromes: int(c.aerodromes),
    obsolete: Array.isArray(c.obsolete) ? c.obsolete.filter(x => typeof x === 'string' && ICAO.test(x)).slice(0, 200).length : 0,
    warnings: w
  };
}
