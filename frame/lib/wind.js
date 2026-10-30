// V3 cadre — le vent sur une piste, en calcul pur (V3_SPECIFICATION § 10.30) : composantes de face (ou arrière) et de travers, pour
// la ligne de chaque piste du volet de la Carte et le suffixe de la liste des pistes de Carburant. Ni page, ni état, ni réseau.
//
// API :
//   components(runwayTrueHeading, windDirTrue, windKt) → { head, cross, side } | null
//     head  : composante de face, en nœuds arrondis (négative = vent arrière) ;
//     cross : composante de travers, en nœuds arrondis, toujours positive ;
//     side  : 'L' | 'R', le côté d'où vient le vent vu de la piste (null sans travers) ;
//   null quand une donnée manque ou n'est pas un nombre (un vent variable, VRB, n'a pas de direction : rien n'est inventé).
//   Directions vraies en degrés, celle du vent est celle d'où il vient (convention METAR, ramenée au vrai par l'appelant).
//   label(c) → « ↓ 12 kt · ← 6 kt » : le même texte dans le volet de la Carte et la liste des pistes de Carburant ; '' pour null.
//   severity(c, { tail, crossWarn, cross }) → 'ok' | 'warn' | 'alert' (null pour null) : la couleur du libellé (vert, orange, rouge).

/** Composantes du vent sur une piste (voir l'en-tête). */
export function components(runwayTrueHeading, windDirTrue, windKt) {
  const rh = num(runwayTrueHeading),
    wd = num(windDirTrue),
    kt = num(windKt);
  if (rh === null || wd === null || kt === null || kt < 0) return null;
  const a = ((wd - rh) % 360 + 540) % 360 - 180, // angle du vent par rapport à l'axe de la piste, dans [-180, 180[
    r = a * Math.PI / 180,
    head = Math.round(kt * Math.cos(r)) || 0, // pas de « -0 »
    x = kt * Math.sin(r),
    cross = Math.round(Math.abs(x));
  return {
    head,
    cross,
    side: cross === 0 ? null : x > 0 ? 'R' : 'L'
  };
}

/** Le texte des composantes (voir l'en-tête) : les flèches disent où le vent souffle dans le repère de la piste, la piste dessinée
 *  vers le haut comme le pilote la voit en finale (§ 10.30, troisième lecture : « on atterrit toujours à contre-vent, la flèche vers
 *  le bas ») : ↓ de face, ↑ arrière, ← vent de droite, → vent de gauche ; le chiffre suit la flèche ; une composante nulle est omise,
 *  « 0 kt » quand les deux le sont ; '' sans composantes. */
export function label(c) {
  if (!c) return '';
  const parts = [];
  if (c.head) parts.push(`${c.head > 0 ? '↓' : '↑'} ${Math.abs(c.head)} kt`);
  if (c.cross) parts.push(`${c.side === 'R' ? '←' : '→'} ${c.cross} kt`);
  return parts.join(' · ') || '0 kt';
}

/** Seuils par défaut de severity (nœuds) : vent arrière toléré jusqu'à 5, travers sans remarque jusqu'à 10, limite de travers 20. */
export const LIMITS = Object.freeze({
  tail: 5,
  crossWarn: 10,
  cross: 20
});

/** La gravité du vent sur une piste, une règle pour la Carte et Carburant (§ 10.30, troisième lecture) : vent de face 'ok' ;
 *  vent arrière 'warn' jusqu'à limits.tail, 'alert' au-delà ; travers 'ok' jusqu'à limits.crossWarn, 'warn' jusqu'à limits.cross
 *  (la limite de la fiche de l'appareil, maxCrosswindKt, quand elle existe), 'alert' au-delà ; la pire des deux composantes. Un
 *  seuil absent ou non numérique prend sa valeur de LIMITS. null sans composantes. */
export function severity(c, limits = {}) {
  if (!c) return null;
  const lim = k => num(limits?.[k]) ?? LIMITS[k],
    tail = c.head < 0 ? -c.head : 0,
    t = tail === 0 ? 0 : tail <= lim('tail') ? 1 : 2,
    x = c.cross <= lim('crossWarn') ? 0 : c.cross <= lim('cross') ? 1 : 2;
  return ['ok', 'warn', 'alert'][Math.max(t, x)];
}

/** Nombre fini, ou null (chaîne vide, null, texte). */
function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = +v;
  return Number.isFinite(n) ? n : null;
}
