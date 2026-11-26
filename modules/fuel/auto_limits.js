// V3 fuel — les bornes des niveaux que « Auto » propose (SOG-0056, SOG-0562) : en bas FL030 et la plus haute contrainte d'une procédure
// choisie, en haut le plafond. Sorti de levelAuto de module.js (règle « on extrait ce qu'on touche », SOG-0653), sans changer le
// comportement. Ce fichier ne lit ni n'écrit rien.
//
// API : autoLimits(constraints, ceilFt) → { minFt, maxFt } ; constraints : route.constraints (les niveaux imposés des procédures,
//   une entrée du vol) ; ceilFt : le plafond de l'aéronef (ceilOf de module.js), FL200 sans lui.

/** Les bornes : en bas le plus haut de FL030 et des contraintes des procédures choisies ; en haut le plafond (SOG-0562 : le plus bas de
 *  celui de la fiche et de celui du modèle), FL200 sans plafond. */
export function autoLimits(constraints, ceilFt) {
  const cons = Object.values(constraints || {}).map(Number).filter(v => v > 0);
  return {
    minFt: Math.max(3000, ...cons),
    maxFt: ceilFt ?? 20000
  };
}
