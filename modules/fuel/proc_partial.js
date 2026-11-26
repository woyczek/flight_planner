// V3 fuel — « départs lus en partie » (SOG-0613, décision de l'ergonome du 26/11) : un terrain dont les SID de la base sont TOUTES lues en
// partie (le point de sortie et les niveaux, jamais le tracé) ne fournit aucun raccord à une route : quand le calcul répond que le départ
// est au-delà de la limite de raccord (connector_limit), la route part en direct, hors limite. La phrase se dit près de la demande de route,
// à la place et dans la forme de SOG-0638 (« catalogue vide »), avec le bouton de lecture de l'État s'il y en a un, sinon seule.
// Ce fichier ne lit ni n'écrit rien : module.js lui donne la liste d'aerodb et les itinéraires affichés.
//
// API : haveOf(list, isDoubt) → { SID, STAR, any, part } : ce que Carburant tient des procédures d'un terrain (SID, STAR : au moins une
//   non douteuse ; any : le catalogue n'est pas vide ; part : des SID non douteuses existent et AUCUNE n'est complète — toutes portent
//   `partial`, l'objet d'aerodb qui dit ce qui est lu et ce qui ne l'est pas) ; farDep(list, ad) → vrai si un des itinéraires affichés
//   porte, pour le DÉPART de `ad`, la règle « raccord au-delà de sa limite » ; TX.dep : la phrase, quatre langues ({ad}).
// Langues : le français est la phrase arrêtée par l'ergonome (26/11) ; l'anglais, l'allemand et l'espagnol sont écrits ici, calqués sur
// les phrases voisines (lim0Dep, limitTail), À RELIRE (SOG-0680, dette de traduction).

export const TX = {
  dep: ['Départs de {ad} lus en partie : aucun ne rejoint une route. La route part en direct, au-delà de la limite.',
    'Departures of {ad} read in part: none of them joins a route. The route leaves direct, beyond the limit.',
    'Abflüge von {ad} nur teilweise gelesen: keiner führt zu einer Route. Die Route startet direkt, jenseits der Grenze.',
    'Salidas de {ad} leídas en parte: ninguna enlaza con una ruta. La ruta sale en directo, más allá del límite.'
  ]
};

export function haveOf(list, isDoubt) {
  const all = Array.isArray(list) ? list : [],
    ok = all.filter(p => p && !isDoubt(p)),
    sid = ok.filter(p => p.kind === 'SID');
  return {
    SID: sid.length > 0,
    STAR: ok.some(p => p.kind === 'STAR'),
    any: all.length > 0,
    part: sid.length > 0 && sid.every(p => !!p.partial && typeof p.partial === 'object')
  };
}

export function farDep(list, ad) {
  return (Array.isArray(list) ? list : []).some(a => (a?.reasons?.violates || []).some(r => r.code === 'connector_limit' && r.values
    ?.end === 'dep' &&
    String(r.values?.ad || '').toUpperCase() === ad));
}
