// V3 fuel — « Ce que le contrôle ne couvre pas » (V3 § 10.31, le contrat du contrôle : « aucune incompatibilité » ne vaut que pour ce
// qui est contrôlé) : la phrase du moteur, ses domaines hors contrôle et les règles du RAD qui citent un terrain du vol, repliés. Sorti de
// module.js (règle « on extrait ce qu'on touche », SOG-0669), sans changer le comportement. Ce fichier ne lit ni n'écrit rien.
//
// API : limitsHtml(n, h) → le HTML du pli (« » sans rien à dire, sauf la ligne des performances par défaut) ; n : la réponse normalisée
//   (route_engine.js normalize : limitation, gaps, rad) ; h = { tt(rangée, valeurs), esc, TX (les textes de module.js : rLimits), ROWS
//   (route_reasons.js : terrainRules, terrainRules1, more), perfDefault() (la ligne des performances par défaut de module.js) }. Tout ce
//   qui vient du moteur ou du RAD est échappé (esc).

/** Ce que le contrôle ne couvre pas (le contrat le demande : « aucune incompatibilité » ne vaut que pour ce qui est contrôlé) : la phrase
 *  du moteur et ses domaines hors contrôle, repliés. */
export const limitsHtml = (n, h) => h.perfDefault() + (n.limitation || n.gaps.length || n.rad ? `<details class="fu-rlimits" data-rlimits><summary class="f-muted">${h.esc(h.tt(h.TX.rLimits))}</summary>${n.limitation ? `<p class="f-muted">${h.esc(n.limitation)}</p>` : ''}${n.gaps.map(g => `<p class="f-muted"><b>${h.esc(g.name)}</b> ${h.esc(g.reason)}</p>`).join('')}${terrainHtml(n.rad?.terrain_rules, h)}${n.rad ? '<div data-radlist></div>' : ''}</details>` : '');
/** SOG-0539 (l'ergonome) : les règles du RAD qui citent un terrain du vol et un espace non lu — un fait du VOL, hors de tout verdict : une
 *  fois par écran, dans « Ce que le contrôle ne couvre pas » (liste et « Contrôler »), le départ d'abord, aucune ligne à 0 ; chaque ligne
 *  est un repli (le chevron seul) qui s'ouvre sur ses références à la suite (esc : elles viennent du RAD), 40 au plus, « et N autres » à
 *  la fin. */
function terrainHtml(list, h) {
  return (Array.isArray(list) ? list : []).filter(x => x.total > 0).map(x => `<details class="fu-faultmore fu-rterrain" data-terrainrules data-role="${h.esc(x.role)}"><summary>${h.esc(h.tt(x.total === 1 ? h.ROWS.terrainRules1 : h.ROWS.terrainRules, { ad: x.ad, n: x.total }))}</summary><p class="f-muted" data-terrainrefs>${h.esc(x.rules.slice(0, 40).join(', '))}${x.total > 40 ? ` <span data-terrainmore>${h.esc(h.tt(h.ROWS.more, { n: x.total - 40 }))}</span>` : ''}</p></details>`).join('');
}
