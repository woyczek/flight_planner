// V3 fuel — SOG-0721 (l'ergonome, 28/11) : la valeur de la demande de route qui sort de ce que le moteur accepte, dite AVANT l'envoi. Une
// valeur de la fiche (croisière, montée, descente, vitesse terminale) : la page envoie la borne la plus proche (route_engine.js
// perfFields, les bornes de tools/route_engine/plan.py) et le dit, sous « Calculer » dès qu'elle est connue et dans les raisons de la route
// calculée ; un niveau du vol hors de FL010 à FL660 : « Calculer » grisé, sa cause dessous, rien ne part. Ce fichier ne lit ni n'écrit
// rien ; ses textes sont en français seul (dette SOG-0680).
//
// API : boundLines(bound, h) → les phrases, une par valeur, dans l'ordre de la liste fermée (croisière, montée, descente, terminale) ;
//   bound : perfFields(…).bound ([{ k, v, lo, hi, used }]) ; h = { tt, esc, lang() }.
//   boxHtml(bound, levelBad, href, h) → le contenu de la ligne sous « Calculer » : la cause d'un niveau hors bornes, sinon les phrases et
//   « Ouvrir la fiche » (href : la fiche dans Maintenance) ; '' sans rien à dire.

export const TX = {
  bound: ['{g} de la fiche ({v} {u}) hors de ce que le calcul de route accepte ({min} à {max} {u}) : il compte {b} {u}.'],
  // la liste fermée des grandeurs (l'ergonome)
  names: {
    speed_kt: ['Vitesse de croisière'],
    climb_fpm: ['Taux de montée'],
    descent_fpm: ['Taux de descente'],
    terminal_speed_kt: ['Vitesse terminale']
  },
  openSheet: ['Ouvrir la fiche'],
  levelBad: ['Niveau hors de FL010 à FL660.']
};

const ORDER = ['speed_kt', 'climb_fpm', 'descent_fpm', 'terminal_speed_kt'],
  UNIT = {
    speed_kt: 'kt',
    climb_fpm: 'ft/min',
    descent_fpm: 'ft/min',
    terminal_speed_kt: 'kt'
  };

/** Les phrases des valeurs de la fiche bornées (voir l'en-tête), les nombres dans la langue de l'écran ; '' sans valeur bornée. */
export function boundLines(bound, h) {
  const fmt = n => Number(n).toLocaleString(h.lang());
  return (Array.isArray(bound) ? bound : []).filter(x => ORDER.includes(x?.k)).sort((a, b) => ORDER.indexOf(a.k) - ORDER.indexOf(b.k))
    .map(x => `<p class="f-muted" data-rperfbound="${x.k}">${h.esc(h.tt(TX.bound, {
      g: h.tt(TX.names[x.k]),
      v: fmt(x.v),
      u: UNIT[x.k],
      min: fmt(x.lo),
      max: fmt(x.hi),
      b: fmt(x.used)
    }))}</p>`).join('');
}

/** La ligne sous « Calculer » (voir l'en-tête) : un niveau hors bornes d'abord (rien ne part : c'est lui qui compte), sinon les valeurs
 *  bornées de la fiche et le lien vers elle. */
export function boxHtml(bound, levelBad, href, h) {
  if (levelBad) return `<p class="f-warn" data-rlevelbad>${h.esc(h.tt(TX.levelBad))}</p>`;
  const lines = boundLines(bound, h);
  return lines ? `${lines}<p class="f-muted"><a data-rsheet href="${h.esc(href)}">${h.esc(h.tt(TX.openSheet))}</a></p>` : '';
}
