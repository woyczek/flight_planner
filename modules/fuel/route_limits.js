// V3 fuel — « Ce que le contrôle ne couvre pas » (V3 § 10.31, le contrat du contrôle : « aucune incompatibilité » ne vaut que pour ce
// qui est contrôlé) : la phrase du moteur, ses domaines hors contrôle et les règles du RAD qui citent un terrain du vol, repliés. Sorti de
// module.js (règle « on extrait ce qu'on touche », SOG-0669), sans changer le comportement. Ce fichier ne lit ni n'écrit rien.
//
// API : limitsHtml(n, h) → le HTML du pli (« » sans rien à dire, sauf la ligne des performances par défaut) ; n : la réponse normalisée
//   (route_engine.js normalize : limitation, gaps, rad) ; h = { tt(rangée, valeurs), esc, TX (les textes de module.js : rLimits), ROWS
//   (route_reasons.js : terrainRules, terrainRules1, more), perfDefault() (la ligne des performances par défaut de module.js) }. Tout ce
//   qui vient du moteur ou du RAD est échappé (esc). SOG-0669 : h.states() (la table des préfixes OACI d'aerodb, null tant qu'elle n'est pas
//   lue) nomme les États du sens des voies ; TX : ses textes, quatre langues.

import {
  stateName
} from './route_reasons.js';

export const TX = {
  // SOG-0669 (l'ergonome, 26/11) : le sens des voies, par État — vérifié où la base l'a, inconnu ailleurs ; la partie « Inconnu » ne
  // s'écrit que s'il y en a ; les limites de vitesse ont leur propre ligne (celle du moteur)
  // les phrases arrêtées par l'ergonome (26/11) : sans préposition (les États en liste), un point-virgule avant la conséquence
  dirAll: ['Sens des voies vérifié sur toute la route.', 'Airway direction checked along the whole route.',
    'Richtung der Luftstraßen auf der ganzen Route geprüft.', 'Sentido de las aerovías verificado en toda la ruta.'
  ],
  dirBoth: ['Sens des voies vérifié : {k}. Inconnu : {u} ; une voie peut y être prise à contresens.',
    'Airway direction checked: {k}. Unknown: {u}; an airway may be flown the wrong way there.',
    'Richtung der Luftstraßen geprüft: {k}. Unbekannt: {u}; eine Luftstraße kann dort in Gegenrichtung beflogen werden.',
    'Sentido de las aerovías verificado: {k}. Desconocido: {u}; una aerovía puede tomarse allí en sentido contrario.'
  ],
  dirNone: ['Sens des voies inconnu : {u} ; une voie peut y être prise à contresens.',
    'Airway direction unknown: {u}; an airway may be flown the wrong way there.',
    'Richtung der Luftstraßen unbekannt: {u}; eine Luftstraße kann dort in Gegenrichtung beflogen werden.',
    'Sentido de las aerovías desconocido: {u}; una aerovía puede tomarse allí en sentido contrario.'
  ]
};

/** SOG-0669 : des États (préfixes OACI) relus — deux à quatre signes, chacun une fois, quarante au plus (la copie gardée sur l'appareil
 *  passe aussi par ici). */
const statesOf = list => [...new Set((Array.isArray(list) ? list : []).filter(x => typeof x === 'string' && /^[A-Z0-9]{2,4}$/.test(x)))]
  .slice(0, 40);

/** Une ligne des domaines hors contrôle : le nom et la phrase du moteur ; SOG-0669 : le sens des voies, écrit ici dans la langue de
 *  l'écran, les États nommés d'après la table d'aerodb (un préfixe hors d'elle : son code). */
function gapHtml(g, h) {
  if (g?.code === 'direction') {
    const k = statesOf(g.known),
      u = statesOf(g.unknown),
      names = typeof h.states === 'function' ? h.states() : null,
      say = l => l.map(p => stateName(p, h.tt, names)).join(', ');
    if (!k.length && !u.length) return '';
    return `<p class="f-muted" data-gapdir>${h.esc(h.tt(!u.length ? TX.dirAll : k.length ? TX.dirBoth : TX.dirNone, {
      k: say(k),
      u: say(u)
    }))}</p>`;
  }
  return g?.name ? `<p class="f-muted"><b>${h.esc(g.name)}</b> ${h.esc(g.reason)}</p>` : '';
}

/** Ce que le contrôle ne couvre pas (le contrat le demande : « aucune incompatibilité » ne vaut que pour ce qui est contrôlé) : la phrase
 *  du moteur et ses domaines hors contrôle, repliés. */
export const limitsHtml = (n, h) => h.perfDefault() + (n.limitation || n.gaps.length || n.rad ? `<details class="fu-rlimits" data-rlimits><summary class="f-muted">${h.esc(h.tt(h.TX.rLimits))}</summary>${n.limitation ? `<p class="f-muted">${h.esc(n.limitation)}</p>` : ''}${n.gaps.map(g => gapHtml(g, h)).join('')}${terrainHtml(n.rad?.terrain_rules, h)}${n.rad ? '<div data-radlist></div>' : ''}</details>` : '');
/** SOG-0539 (l'ergonome) : les règles du RAD qui citent un terrain du vol et un espace non lu — un fait du VOL, hors de tout verdict : une
 *  fois par écran, dans « Ce que le contrôle ne couvre pas » (liste et « Contrôler »), le départ d'abord, aucune ligne à 0 ; chaque ligne
 *  est un repli (le chevron seul) qui s'ouvre sur ses références à la suite (esc : elles viennent du RAD), 40 au plus, « et N autres » à
 *  la fin. */
function terrainHtml(list, h) {
  return (Array.isArray(list) ? list : []).filter(x => x.total > 0).map(x => `<details class="fu-faultmore fu-rterrain" data-terrainrules data-role="${h.esc(x.role)}"><summary>${h.esc(h.tt(x.total === 1 ? h.ROWS.terrainRules1 : h.ROWS.terrainRules, { ad: x.ad, n: x.total }))}</summary><p class="f-muted" data-terrainrefs>${h.esc(x.rules.slice(0, 40).join(', '))}${x.total > 40 ? ` <span data-terrainmore>${h.esc(h.tt(h.ROWS.more, { n: x.total - 40 }))}</span>` : ''}</p></details>`).join('');
}
