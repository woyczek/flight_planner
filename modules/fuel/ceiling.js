// V3 fuel — le plafond de l'aéronef (SOG-0562) : la valeur que « Auto » ne dépasse pas, la ligne sous le champ Niveau et le motif sur la
// carte d'une route au-dessus de lui. Sorti de module.js (règle « on extrait ce qu'on touche », SOG-0674), sans changer le comportement.
// Ce fichier ne lit ni n'écrit rien.
//
// API : ceilOf(C) → le plafond en pieds, ou null ; ceilLine(C, levelFt, type, tt) → « Au-dessus du plafond du {type} (FL…). » ou « » ;
//   ceilMotif(C, fl, tt) → « au-dessus du plafond (FL…) » ou « » ; C : le devis de module.js (sheet, perf) ; tt(rangée, valeurs) : la
//   traduction du module. ceilingsOf(C) → { declared, calc } (SOG-0674 : le plafond déclaré et la limite que le modèle calcule). TX : les
//   textes.

export const TX = {
  lvlCeil: ['Au-dessus du plafond du {type} (FL{c}).', 'Above the ceiling of the {type} (FL{c}).',
    'Über der Dienstgipfelhöhe der {type} (FL{c}).',
    'Por encima del techo del {type} (FL{c}).'
  ],
  rAboveCeil: ['au-dessus du plafond (FL{c})', 'above the ceiling (FL{c})', 'über der Dienstgipfelhöhe (FL{c})',
    'por encima del techo (FL{c})'
  ],
  // SOG-0674 (l'ergonome, 26/11) : la limite que le modèle de performance calcule (le vario y tombe au vario résiduel) n'est jamais dite
  // « plafond » ; français seul (SOG-0680, dette de traduction)
  lvlCalc: ['Au-dessus de la limite de montée calculée du {type} (FL{c}).'],
  lvlCalcD: ['Au-dessus de la limite de montée calculée du {type} (FL{c}) ; plafond déclaré : FL{d}.'],
  rAboveCalc: ['au-dessus de la limite de montée calculée (FL{c})']
};

/** Un niveau de vol sur trois chiffres (« FL055 » s'écrit « 055 »). */
const fl3 = ft => String(Math.floor(ft / 100)).padStart(3, '0');

/** SOG-0562 : le plafond de l'aéronef, en pieds — le plus bas de celui de la fiche (cruise.ceilingFt) et de celui du modèle de
 *  performance (perf.ceiling : il lit le plafond EUROCONTROL du type) ; null sans l'un ni l'autre. */
export function ceilOf(C) {
  const v = [+C?.sheet?.cruise?.ceilingFt, +C?.perf?.ceiling].filter(x => x > 0);
  return v.length ? Math.min(...v) : null;
}

/** SOG-0694 : le plafond de l'aéronef au cent pied (ce que Carburant écrit dans le vol, profile.ceilingFt : la Carte monte l'échelle de son profil vertical jusqu'à lui) ; null sans plafond. */
export const ceilHundred = C => {
  const v = ceilOf(C);
  return v ? Math.round(v / 100) * 100 : null;
};

/** SOG-0674 (l'ergonome) : les deux limites d'un niveau, en pieds — declared, le plafond que la fiche DÉCLARE (cruise.ceilingFt), sinon
 *  le plafond EUROCONTROL du type (perf.ceilingGiven) ; calc, la limite de montée que le modèle de performance calcule (perf.modelCeiling),
 *  seulement quand elle est plus basse que le plafond déclaré ; null pour une limite absente. */
export function ceilingsOf(C) {
  const sheet = +C?.sheet?.cruise?.ceilingFt,
    given = +C?.perf?.ceilingGiven,
    model = +C?.perf?.modelCeiling,
    declared = sheet > 0 ? sheet : given > 0 ? given : null;
  return {
    declared,
    calc: model > 0 && (!declared || model < declared) ? model : null
  };
}

/** SOG-0562 (l'ergonome) : sous le champ Niveau, toujours visible quand le niveau du vol (tapé, d'un OFP, de la fiche) dépasse une
 *  limite : au-dessus du plafond déclaré, « Au-dessus du plafond du {type} (FL{plafond}). » ; SOG-0674 : au-dessus de la seule limite que
 *  le modèle calcule, « Au-dessus de la limite de montée calculée du {type} (FL{c}) ; plafond déclaré : FL{d}. » — dit, jamais refusé ;
 *  « » sinon. */
export function ceilLine(C, levelFt, type, tt) {
  const {
    declared,
    calc
  } = ceilingsOf(C),
    lv = +levelFt || 0,
    t = String(type || '').toUpperCase().slice(0, 12);
  if (declared && lv > declared) return tt(TX.lvlCeil, {
    type: t,
    c: fl3(declared)
  });
  if (calc && lv > calc) return tt(declared ? TX.lvlCalcD : TX.lvlCalc, {
    type: t,
    c: fl3(calc),
    d: declared ? fl3(declared) : ''
  });
  return '';
}

/** SOG-0562 : sur la carte d'une route à un niveau (fl, en centaines de pieds) au-dessus du plafond déclaré : « au-dessus du plafond
 *  (FL…) » ; SOG-0674 : au-dessus de la seule limite calculée : « au-dessus de la limite de montée calculée (FL…) » ; « » sinon. */
export function ceilMotif(C, fl, tt) {
  const {
    declared,
    calc
  } = ceilingsOf(C);
  if (!Number.isInteger(fl)) return '';
  if (declared && fl * 100 > declared) return tt(TX.rAboveCeil, {
    c: fl3(declared)
  });
  return calc && fl * 100 > calc ? tt(TX.rAboveCalc, {
    c: fl3(calc)
  }) : '';
}
