// V3 fuel — les lignes dites sous le champ de la route après chaque lecture du texte (V3 § 10.31) : une voie écrite que la base ne
// relie pas (tronçon direct, SOG-0354), les points non reconnus, les points lointains, les homonymes et les sauts (SOG-0142 : jamais
// corrigés en silence). Sorti de resolveRoute de module.js (règle « on extrait ce qu'on touche », SOG-0679), sans changer le comportement.
// Ce fichier ne lit ni n'écrit rien : il écrit ces lignes dans l'écran qu'on lui donne.
//
// API : awyPaint(body, badAirways, h) ; notesPaint(body, { unresolved, far, homonyms, jumps }, h) → le texte des points non reconnus
//   (« » sans eux) ; h = { tt(rangée, valeurs) (la traduction du module), TX (les textes de module.js : awyBad, unresolved, farPt,
//   homonyms, jump), esc (l'échappement de module.js), lang() (la langue du montage, pour les nombres) }.
//   readingPaint(body, reading, flightFt, h) : SOG-0679, la lecture en clair de la route sous son champ (reading de
//   frame/lib/route_model.js, flightFt : le niveau du devis) — règles de vol, paliers, vitesses et montées en croisière, niveau de tête,
//   « Non compris », points non situés ; TX : ses textes, quatre langues (les lignes ajoutées depuis le 26/11 : français seul). Les noms viennent du texte du pilote ou du vol : textContent, esc.

import {
  formatLevel
} from '../../frame/lib/route_text.js';
import {
  flightRules
} from '../../frame/lib/route_model.js';

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

export const TX = {
  // SOG-0679 (l'ergonome, 26/11) : la lecture en clair de la route, sous son champ ; chaque ligne quand elle a lieu d'être
  rules: ['Règles de vol : {l} — {s}.', 'Flight rules: {l} — {s}.', 'Flugregeln: {l} — {s}.', 'Reglas de vuelo: {l} — {s}.'],
  ruleUntil: ['{r} jusqu’à {p}', '{r} up to {p}', '{r} bis {p}', '{r} hasta {p}'],
  ruleFromTo: ['{r} de {a} à {b}', '{r} from {a} to {b}', '{r} von {a} bis {b}', '{r} de {a} a {b}'],
  ruleThen: ['puis {r}', 'then {r}', 'danach {r}', 'después {r}'],
  steps: ['Niveaux écrits aux points : appliqués comme paliers.', 'Levels written at points: applied as steps.',
    'An Punkten geschriebene Flughöhen: als Stufen angewendet.', 'Niveles escritos en los puntos: aplicados como escalones.'
  ],
  speeds: ['Non appliqué au devis : les vitesses écrites dans la route.', 'Not applied to the quote: the speeds written in the route.',
    'Nicht in die Berechnung übernommen: die in der Route geschriebenen Geschwindigkeiten.',
    'No aplicado al presupuesto: las velocidades escritas en la ruta.'
  ],
  head: ['Niveau en tête de la route ({a}) non appliqué : le devis garde le niveau du vol ({b}).',
    'Level at the head of the route ({a}) not applied: the quote keeps the flight level ({b}).',
    'Flughöhe am Anfang der Route ({a}) nicht übernommen: die Berechnung behält die Flughöhe des Flugs ({b}).',
    'Nivel al inicio de la ruta ({a}) no aplicado: el presupuesto mantiene el nivel del vuelo ({b}).'
  ],
  // SOG-0679 (l'ergonome, 27/11) : la ligne des vitesses se compose avec les montées en croisière « C/… » (une forme valide, non
  // appliquée) ; le pluriel écrit en clair ; français seul (SOG-0680)
  climbOne: ['Non appliqué au devis : la montée en croisière écrite dans la route.'],
  climbMany: ['Non appliqué au devis : les montées en croisière écrites dans la route.'],
  speedsClimbOne: ['Non appliqué au devis : les vitesses et la montée en croisière écrites dans la route.'],
  speedsClimbMany: ['Non appliqué au devis : les vitesses et les montées en croisière écrites dans la route.'],
  // SOG-0679 (addendum, le relais) : un arrêt écrit dans la route n'est pas compté dans le temps du devis ; français seul (SOG-0680)
  stays: ['Non appliqué au devis : la durée des arrêts écrits dans la route (STAY).'],
  notUnderstood: ['Non compris : {l}.', 'Not understood: {l}.', 'Nicht verstanden: {l}.', 'No comprendido: {l}.'],
  unplaced: ['Point non situé : {w} (relèvement et distance) : il n’est pas dans le tracé ni dans le devis.',
    'Point not located: {w} (bearing and distance): it is neither in the track nor in the quote.',
    'Punkt nicht verortet: {w} (Peilung und Entfernung): er ist weder im Streckenverlauf noch in der Berechnung.',
    'Punto no situado: {w} (marcación y distancia): no está en el trazado ni en el presupuesto.'
  ]
};

/** SOG-0679 : les mots d'une liste lue du texte, chacun une fois, tels qu'écrits, douze au plus. */
const wordsOf = list => [...new Set((Array.isArray(list) ? list : []).map(w => String(w ?? '')).filter(Boolean))].slice(0, 12);

/** SOG-0679 (l'ergonome, 26/11) : la lecture en clair de la route sous son champ ([data-rread]), dans l'ordre de l'ergonome — la règle
 *  de vol déduite et sa lettre, les niveaux tenus en paliers, les vitesses non appliquées, le niveau de tête quand il diffère de celui
 *  du devis (flightFt), puis en avertissement « Non compris » et chaque point par relèvement et distance ; une ligne n'est écrite que
 *  quand elle a lieu d'être, le bloc caché sans aucune. reading : celui de frame/lib/route_model.js ; les mots y sont écrits en texte. */
export function readingPaint(body, reading, flightFt, h) {
  const box = body?.querySelector('[data-rread]');
  if (!box) return;
  const R = reading && typeof reading === 'object' ? reading : {},
    out = [],
    line = (k, warn, text) => out.push(`<p class="${warn ? 'f-warn' : 'f-muted'}" data-rl="${k}">${h.esc(text)}</p>`),
    fr = flightRules(R.rules, {
      dep: R.dep,
      arr: R.arr
    });
  if (fr) {
    const c = fr.changes,
      segs = !c.length ? [fr.start] : [h.tt(TX.ruleUntil, {
        r: fr.start,
        p: c[0].at
      }), ...c.slice(1).map((x, i) => h.tt(TX.ruleFromTo, {
        r: c[i].rule,
        a: c[i].at,
        b: x.at
      })), h.tt(TX.ruleThen, {
        r: c.at(-1).rule
      })];
    line('rules', false, h.tt(TX.rules, {
      l: fr.letter,
      s: segs.join(', ')
    }));
  }
  if (R.steps) line('steps', false, h.tt(TX.steps));
  // SOG-0679 (l'ergonome, 27/11) : UNE ligne pour ce qui n'est pas appliqué de la route — les vitesses, les montées en croisière, ou les deux
  const sp = Array.isArray(R.speeds) && R.speeds.length > 0,
    nc = Array.isArray(R.climbs) ? R.climbs.length : 0,
    spRow = nc ? sp ? nc > 1 ? TX.speedsClimbMany : TX.speedsClimbOne : nc > 1 ? TX.climbMany : TX.climbOne : sp ? TX.speeds : null;
  if (spRow) line('speeds', false, h.tt(spRow));
  if (Array.isArray(R.stays) && R.stays.length) line('stays', false, h.tt(TX.stays));
  if (+R.headLevel > 0 && +flightFt > 0 && Math.round(+R.headLevel / 100) !== Math.round(+flightFt / 100)) line('head', true, h.tt(TX
    .head, {
      a: formatLevel(+R.headLevel),
      b: formatLevel(+flightFt)
    }));
  const nu = wordsOf(R.notUnderstood);
  if (nu.length) line('notund', true, h.tt(TX.notUnderstood, {
    l: nu.join(', ')
  }));
  for (const w of wordsOf(R.unplaced)) line('unplaced', true, h.tt(TX.unplaced, {
    w
  }));
  const html = out.join('');
  if (box.innerHTML !== html) box.innerHTML = html;
  box.hidden = !html;
}
