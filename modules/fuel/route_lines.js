// V3 fuel — les lignes dites sous le champ de la route après chaque lecture du texte (V3 § 10.31) : une voie écrite que la base ne
// relie pas (tronçon direct, SOG-0354), les points non reconnus, les points lointains, les homonymes et les sauts (SOG-0142 : jamais
// corrigés en silence). Sorti de resolveRoute de module.js (règle « on extrait ce qu'on touche », SOG-0679), sans changer le comportement.
// Ce fichier ne lit ni n'écrit rien : il écrit ces lignes dans l'écran qu'on lui donne.
//
// API : awyPaint(body, badAirways, h) ; notesPaint(body, { unresolved, far, homonyms, jumps }, h) → le texte des points non reconnus
//   (« » sans eux) ; h = { tt(rangée, valeurs) (la traduction du module), TX (les textes de module.js : awyBad, unresolved, farPt,
//   homonyms, jump), esc (l'échappement de module.js), lang() (la langue du montage, pour les nombres) }. Les noms viennent du texte du pilote ou du vol : textContent, esc.

/** SOG-0354 (l'ergonome : « une notification passe, une ligne reste ») : une voie écrite que la base ne relie pas, tronçon direct, dite
 *  par une ligne fixe en sourdine sous la route, comme celle des routes NAT ; elle suit chaque lecture du texte (douze voies au plus). */
export function awyPaint(body, badAirways, h) {
  const bad = [...new Set((badAirways || []).map(x => x.w))].slice(0, 12).map(w => h.tt(h.TX.awyBad, {
      w
    })).join(' · '),
    awyLine = body?.querySelector('[data-awywarn]');
  if (awyLine) {
    awyLine.textContent = bad;
    awyLine.hidden = !bad;
  }
}

/** Les points non reconnus sur leur ligne, puis (SOG-0142) les points lointains, les homonymes et les sauts, dits sous la route ;
 *  rend le texte des points non reconnus (l'appelant le reprend pour la zone d'un point inconnu). */
export function notesPaint(body, {
  unresolved = [],
  far = [],
  homonyms = [],
  jumps = []
}, h) {
  const un = body?.querySelector('[data-unres]'),
    ut = unresolved.length ? h.tt(h.TX.unresolved, {
      l: unresolved.join(', ')
    }) : '';
  if (un && un.textContent !== ut) un.textContent = ut;
  const rw = body?.querySelector('[data-rwarn]');
  if (rw) rw.innerHTML = [...far.map(x => h.tt(h.TX.farPt, {
    ...x,
    nm: x.nm.toLocaleString(h.lang())
  })), ...homonyms.map(x => h.tt(h.TX.homonyms, x)), ...jumps.map(j => h.tt(h.TX.jump, {
    ...j,
    nm: j.nm.toLocaleString(h.lang())
  }))].map(x => `<span data-rw>${h.esc(x)}</span>`).join('<br>');
  return ut;
}
