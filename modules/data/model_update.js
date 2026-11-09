// V3 data — le calcul pur des gestes de sélection et de « Mettre à jour » (SPEC § 5.8, V3_SPECIFICATION § 10.44, SOG-0071) : les zones qu'un
// rectangle de la carte touche, la taille d'une sélection. Aucun accès à la page, au lanceur ni au dépôt.
/** Deux cadres [ouest, sud, est, nord] se touchent-ils ? La longitude est essayée à ±360° (une carte qui répète le monde donne des longitudes hors de ±180). */
export function boxesTouch(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length < 4 || b.length < 4 || ![...a.slice(0, 4), ...b.slice(0, 4)].every(Number
      .isFinite)) return false;
  if (a[1] > b[3] || a[3] < b[1]) return false;
  return [-360, 0, 360].some(k => a[0] + k <= b[2] && a[2] + k >= b[0]);
}
/** Les zones de `boxes` ({ id: cadre }) que le rectangle touche, dans l'ordre des identifiants donnés ; `allowed` (Set facultatif) restreint aux zones que la liste propose. */
export function zonesTouching(boxes, rect, ids, allowed = null) {
  return (ids || []).filter(id => (!allowed || allowed.has(id)) && Object.hasOwn(boxes || {}, id) && boxesTouch(boxes[id], rect));
}
/** La taille publiée d'une sélection : { kb (somme des publishedKb connus), known (combien de zones ont une taille), total }. */
export function sizeKb(ids, zones) {
  let kb = 0,
    known = 0;
  for (const id of ids || []) {
    const z = (Array.isArray(zones) ? zones : []).find(x => x?.id === id);
    if (Number.isFinite(z?.publishedKb) && z.publishedKb >= 0) {
      kb += z.publishedKb;
      known++;
    }
  }
  return {
    kb,
    known,
    total: (ids || []).length
  };
}
