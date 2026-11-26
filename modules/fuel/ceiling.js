// V3 fuel — le plafond de l'aéronef (SOG-0562) : la valeur que « Auto » ne dépasse pas, la ligne sous le champ Niveau et le motif sur la
// carte d'une route au-dessus de lui. Sorti de module.js (règle « on extrait ce qu'on touche », SOG-0674), sans changer le comportement.
// Ce fichier ne lit ni n'écrit rien.
//
// API : ceilOf(C) → le plafond en pieds, ou null ; ceilLine(C, levelFt, type, tt) → « Au-dessus du plafond du {type} (FL…). » ou « » ;
//   ceilMotif(C, fl, tt) → « au-dessus du plafond (FL…) » ou « » ; C : le devis de module.js (sheet, perf) ; tt(rangée, valeurs) : la
//   traduction du module. TX : les textes.

export const TX = {
  lvlCeil: ['Au-dessus du plafond du {type} (FL{c}).', 'Above the ceiling of the {type} (FL{c}).',
    'Über der Dienstgipfelhöhe der {type} (FL{c}).',
    'Por encima del techo del {type} (FL{c}).'
  ],
  rAboveCeil: ['au-dessus du plafond (FL{c})', 'above the ceiling (FL{c})', 'über der Dienstgipfelhöhe (FL{c})',
    'por encima del techo (FL{c})'
  ]
};

/** Un niveau de vol sur trois chiffres (« FL055 » s'écrit « 055 »). */
const fl3 = ft => String(Math.floor(ft / 100)).padStart(3, '0');

/** SOG-0562 : le plafond de l'aéronef, en pieds — le plus bas de celui de la fiche (cruise.ceilingFt) et de celui du modèle de
 *  performance (perf.ceiling : il lit le plafond EUROCONTROL du type) ; null sans l'un ni l'autre. */
export function ceilOf(C) {
  const v = [+C?.sheet?.cruise?.ceilingFt, +C?.perf?.ceiling].filter(x => x > 0);
  return v.length ? Math.min(...v) : null;
}

/** SOG-0562 (l'ergonome) : sous le champ Niveau, toujours visible quand le niveau du vol (tapé, d'un OFP, de la fiche) dépasse le
 *  plafond de l'aéronef : « Au-dessus du plafond du {type} (FL{plafond}). » — dit, jamais refusé ; « » sinon. */
export function ceilLine(C, levelFt, type, tt) {
  const ceil = ceilOf(C);
  return ceil && +levelFt > ceil ? tt(TX.lvlCeil, {
    type: String(type || '').toUpperCase().slice(0, 12),
    c: fl3(ceil)
  }) : '';
}

/** SOG-0562 : sur la carte d'une route à un niveau (fl, en centaines de pieds) au-dessus du plafond : « au-dessus du plafond (FL…) ». */
export function ceilMotif(C, fl, tt) {
  const ceil = ceilOf(C);
  return ceil && Number.isInteger(fl) && fl * 100 > ceil ? tt(TX.rAboveCeil, {
    c: fl3(ceil)
  }) : '';
}
