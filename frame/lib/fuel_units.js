// V3 frame/lib (propriétaire : frame ; lu par Réglages, Appareils, Carburant et aerodb) — unités du carburant, en calcul pur
// (V3_SPECIFICATION.md § 10.35, coût carburant ; frame/INTEGRATION.md § 16). Ni état, ni appel, ni texte : les écrans
// disent les unités dans leurs propres mots.
//   · densité en kg/L : celle de la fiche du type (fuelDensityKgPerL), sinon celle de la compagnie (airline/settings.json,
//     fuel.density[sorte]), sinon la valeur type FUEL_DENSITY — la règle de repli écrite ici seulement ;
//   · conversions entre les quatre unités du compte rendu : kg, lb, L, USG (masse ↔ volume par la densité) ;
//   · prix ramené au kg, quelle que soit l'unité saisie.
// Une entrée illisible (nombre absent, négatif, densité hors de 0,5 à 1,0 kg/L) rend null, jamais un nombre inventé.

/** Densités types (kg/L) : kérosène (Jet A-1) et essence avion (100LL). */
export const FUEL_DENSITY = Object.freeze({
  jet: 0.80,
  avgas: 0.72
});
/** Livres par kilogramme, litres par gallon US (définitions exactes). */
export const LB_PER_KG = 2.20462262185;
export const L_PER_USG = 3.785411784;
/** Unités du compte rendu. */
export const UNITS = Object.freeze(['kg', 'lb', 'L', 'USG']);

const num = v => v !== null && v !== '' && v !== undefined && Number.isFinite(+v) ? +v : null;
/** Densité plausible (kg/L) : un carburant d'aviation, 0,5 à 1,0 ; sinon null. */
const plausible = v => {
  const d = num(v);
  return d !== null && d >= 0.5 && d <= 1.0 ? d : null;
};

/** Densité (kg/L) d'une sorte de carburant ('jet' | 'avgas') : celle de la fiche du type (sheet.fuelDensityKgPerL), sinon
 *  celle de la compagnie (airline.fuel.density[kind]), sinon la valeur type ; null pour une sorte inconnue sans fiche ni
 *  compagnie qui la donne. */
export function density(kind, {
  sheet = null,
  airline = null
} = {}) {
  return plausible(sheet?.fuelDensityKgPerL) ?? plausible(airline?.fuel?.density?.[kind]) ?? FUEL_DENSITY[kind] ?? null;
}

/** Masse et volume. d : densité (kg/L). */
export const lbFromKg = kg => num(kg) === null ? null : num(kg) * LB_PER_KG;
export const kgFromLb = lb => num(lb) === null ? null : num(lb) / LB_PER_KG;
export const kgFromL = (l, d) => num(l) === null || plausible(d) === null ? null : num(l) * plausible(d);
export const lFromKg = (kg, d) => num(kg) === null || plausible(d) === null ? null : num(kg) / plausible(d);
export const lFromUsg = usg => num(usg) === null ? null : num(usg) * L_PER_USG;
export const usgFromL = l => num(l) === null ? null : num(l) / L_PER_USG;

/** Quantité d'une unité du compte rendu en kg (d : densité, pour L et USG) ; null si illisible. */
export function toKg(value, unit, d) {
  if (unit === 'kg') return num(value);
  if (unit === 'lb') return kgFromLb(value);
  if (unit === 'L') return kgFromL(value, d);
  if (unit === 'USG') return kgFromL(lFromUsg(value), d);
  return null;
}
/** Quantité en kg dans une unité du compte rendu ; null si illisible. */
export function fromKg(kg, unit, d) {
  if (unit === 'kg') return num(kg);
  if (unit === 'lb') return lbFromKg(kg);
  if (unit === 'L') return lFromKg(kg, d);
  if (unit === 'USG') return usgFromL(lFromKg(kg, d));
  return null;
}

/** Prix ramené au kg ({ value : le prix d'une unité, per : 'kg' | 'lb' | 'L' | 'USG' }, d : densité pour L et USG) ; null si
 *  illisible. Un prix au litre divisé par la densité, au gallon par la densité et les litres du gallon, à la livre multiplié
 *  par les livres du kilogramme. */
export function pricePerKg({
  value,
  per
} = {}, d) {
  const p = num(value);
  if (p === null || p < 0) return null;
  const kgPerUnit = toKg(1, per, d);
  return kgPerUnit ? p / kgPerUnit : null;
}
