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
//   runwayAxis(rw, { list, magVar }) → relèvement vrai d'une piste (une règle pour Carburant et la Carte, refonte § 10.33 R-F1) :
//     `true` de la fiche, sinon seuil → seuil opposé (list : les pistes du terrain), sinon QFU + déclinaison, sinon numéro × 10 +
//     déclinaison ; null sans rien.
//   oppositeRunway(id) : « 24 » → « 06 », « 27L » → « 09R » ; '' pour un autre identifiant.
//   bestRunwayEnd(bearing, magVar, windDir, windKt) → { trueDeg, ident, head, cross, side } : le bout de l'axe principal le plus face
//     au vent (la carte météo de Carburant, sans fiches de pistes) ; null sans axe ou sans vent dirigé.

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

/** Numéro de la piste opposée (« 24 » → « 06 », « 27L » → « 09R ») ; '' pour un identifiant qui n'est pas une piste. */
export function oppositeRunway(id) {
  const m = /^(?:RW)?(\d{2})([LRC]?)$/i.exec(String(id || '').trim());
  if (!m) return '';
  const n = ((+m[1] + 17) % 36) + 1,
    s = {
      L: 'R',
      R: 'L',
      C: 'C'
    } [m[2].toUpperCase()] || '';
  return `${String(n).padStart(2, '0')}${s}`;
}

/** Relèvement vrai d'une piste, une règle pour Carburant et la Carte (refonte § 10.33 R-F1 ; l'ordre est celui que la session
 *  ergonomie a décidé le 29 octobre pour la Carte) : `true` de la fiche (eAIP AD 2.12), sinon la direction seuil → seuil opposé quand
 *  les deux sont dans list, sinon QFU (magnétique) + la déclinaison (Est positive), sinon le numéro × 10 + la déclinaison (une piste
 *  nommée par ses seules procédures) ; null sans rien. rw : { id, true?, qfu?, lat?, lon? }. */
export function runwayAxis(rw, {
  list = [],
  magVar = null
} = {}) {
  if (!rw) return null;
  const t = num(rw.true);
  if (t !== null) return (t % 360 + 360) % 360;
  const id = String(rw.id ?? '').trim().toUpperCase().replace(/^RW/, ''),
    opp = oppositeRunway(id),
    o = opp ? (list || []).find(x => String(x?.id ?? '').trim().toUpperCase().replace(/^RW/, '') === opp) : null,
    [la, lo, ola, olo] = [rw.lat, rw.lon, o?.lat, o?.lon].map(num);
  if (o && la !== null && lo !== null && ola !== null && olo !== null) {
    const r = Math.PI / 180,
      dx = (((olo - lo) + 540) % 360 - 180) * Math.cos(la * r);
    return ((Math.atan2(dx, ola - la) / r) + 360) % 360;
  }
  const mv = num(magVar) ?? 0,
    q = num(rw.qfu),
    n = /^\d{2}/.test(id) ? parseInt(id, 10) * 10 : null;
  if (q !== null) return (q + mv + 360) % 360;
  return n !== null ? (n + mv + 360) % 360 : null;
}

/** Le bout de l'axe principal d'un terrain le plus face au vent (la carte météo de Carburant, qui n'a que l'axe du terrain) :
 *  { trueDeg (le sens retenu), ident (son numéro magnétique « 32 »), head, cross, side } (components) ; null sans axe ou sans vent
 *  dirigé. bearing : route vraie de l'axe ; magVar : déclinaison Est positive. */
export function bestRunwayEnd(bearing, magVar, windDir, windKt) {
  const b = num(bearing),
    wd = num(windDir);
  if (b === null || wd === null) return null;
  const ends = [(b + 360) % 360, (b + 180) % 360],
    diff = a => Math.abs(((wd - a + 540) % 360) - 180),
    end = diff(ends[1]) < diff(ends[0]) ? ends[1] : ends[0],
    c = components(end, wd, windKt);
  if (!c) return null;
  const mag = (end - (num(magVar) ?? 0) + 360) % 360;
  return {
    trueDeg: end,
    ident: String(Math.round(mag / 10) % 36 || 36).padStart(2, '0'),
    ...c
  };
}

/** Nombre fini, ou null (chaîne vide, null, texte). */
function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = +v;
  return Number.isFinite(n) ? n : null;
}
