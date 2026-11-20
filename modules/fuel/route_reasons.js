// SOG-0532 (3), SOG-0531 — les raisons du moteur de route composées dans la langue de l'écran, depuis { code, values } (contrat :
// frame/aerodb/INTEGRATION.md « three verdicts », « what the check could NOT verify » ; mots de l'ergonome du 20/11). Pur : ni page,
// ni réseau, ni stockage.
//
// Règles de l'ergonome : chaque ligne commence par l'ENDROIT de la route (tronçon, point, terrain), la référence à la fin entre
// parenthèses ; ni feuille ni ligne du classeur ; le mot du verdict n'est pas répété dans les lignes (le titre du groupe le dit) ; les
// nombres au format de la langue ; hors du français, un `text` du moteur montré faute de code est précédé de « texte du moteur, en
// français : ».
//
// API :
//   ROWS : les textes, en quatre langues [fr, en, de, es] (les marques « (s) » accordées par le cadre, frame/lib/plural.js).
//   compose(reason, t, lang, ctx) → la phrase ; `reason` = { code, values, text } borné par route_engine.js (reasonsOf) ; `t(row, vars)`
//     traduit et accorde (ctx.t) ; ctx = { fl } (le niveau de l'itinéraire, pour no_conforming_route). Une valeur requise absente, un
//     code inconnu ou `other` : le `text` du moteur (avec la mention de langue hors du français) ; '' sans rien.
// Les valeurs sont posées telles quelles : l'appelant écrit la phrase par textContent ou esc, jamais en HTML.

export const ROWS = {
  // les titres des groupes et du verdict (le plus grave : enfreint > non vérifiable > conforme)
  conform: ['conforme à ce que nous savons lire', 'conforms to what we can read', 'entspricht dem, was wir lesen können',
    'conforme a lo que sabemos leer'
  ],
  groupViolates: ['Règles connues enfreintes', 'Known rules broken', 'Verletzte bekannte Regeln', 'Reglas conocidas infringidas'],
  groupUnverifiable: ['Non vérifiable : {n} point(s)', 'Cannot be verified: {n} point(s)', 'Nicht prüfbar: {n} Punkt(e)',
    'No verificable: {n} punto(s)'
  ],
  // rad_unread (lot 2 d'AeroDB ; mots décidés par l'ergonome le 20/11) : une ligne par État dont des règles portent sur la route ; la
  // ligne EST le bouton qui ouvre sa liste
  rad_unread: ['{zone} : {n} règle(s) du RAD portent sur cette route', '{zone}: {n} RAD rule(s) apply to this route',
    '{zone}: {n} RAD-Regel(n) betreffen diese Route', '{zone}: {n} regla(s) del RAD se aplican a esta ruta'
  ],
  // les règles qui ne portent que sur des espaces : UNE note sous le groupe, hors compte, sous tout verdict
  spacesOnly: ['Les règles du RAD qui ne portent que sur des espaces ne sont pas vérifiées ({n} dans les États traversés).',
    'The RAD rules that only apply to airspaces are not verified ({n} in the States crossed).',
    'Die RAD-Regeln, die nur Lufträume betreffen, werden nicht geprüft ({n} in den überflogenen Staaten).',
    'Las reglas del RAD que solo se aplican a espacios no se verifican ({n} en los Estados sobrevolados).'
  ],
  // une règle de la liste : l'endroit d'abord, la référence à la fin ; sans endroit : la référence d'abord
  ruleLine: ['{target} — {why} ({id})', '{target} — {why} ({id})', '{target} — {why} ({id})', '{target} — {why} ({id})'],
  ruleLine0: ['{id} — {why}', '{id} — {why}', '{id} — {why}', '{id} — {why}'],
  unread_zone_state: ['dépend de l’activité d’une zone — à vérifier le jour du vol',
    'depends on the activity of an area — to check on the day of the flight',
    'hängt von der Aktivität eines Gebiets ab — am Flugtag zu prüfen',
    'depende de la actividad de una zona — a comprobar el día del vuelo'
  ],
  unread_schedule: ['horaire que nous ne savons pas lire', 'schedule we cannot read', 'Zeitplan, den wir nicht lesen können',
    'horario que no sabemos leer'
  ],
  unread_level_along_points: ['niveau imposé sur plusieurs points de suite', 'level imposed over several points in a row',
    'vorgeschriebene Flugfläche über mehrere aufeinanderfolgende Punkte', 'nivel impuesto en varios puntos seguidos'
  ],
  unread_aircraft: ['dépend du type d’aéronef ou de son équipement', 'depends on the aircraft type or its equipment',
    'hängt vom Luftfahrzeugmuster oder seiner Ausrüstung ab', 'depende del tipo de aeronave o de su equipo'
  ],
  unread_space_unread: ['passage dans un espace absent de la base', 'passage in an airspace missing from the base',
    'Durchflug eines Luftraums, der in der Basis fehlt', 'paso por un espacio ausente de la base'
  ],
  unread_unread: ['règle que nous ne savons pas lire', 'rule we cannot read', 'Regel, die wir nicht lesen können',
    'regla que no sabemos leer'
  ],
  more: ['et {n} autre(s)', 'and {n} other(s)', 'und {n} weitere', 'y {n} otro(s)'],
  engineFr: ['', 'engine text, in French:', 'Text der Routenberechnung, auf Französisch:', 'texto del motor, en francés:'],
  // 1, 2 : le RAD ; {target} = l'élément de la route qui a déclenché la règle (sans lui : la phrase sans endroit)
  rad_block: ['{target} : route interdite par le RAD ({id})', '{target}: route prohibited by the RAD ({id})',
    '{target}: Route durch das RAD verboten ({id})', '{target}: ruta prohibida por el RAD ({id})'
  ],
  rad_block0: ['Route interdite par le RAD ({id})', 'Route prohibited by the RAD ({id})', 'Route durch das RAD verboten ({id})',
    'Ruta prohibida por el RAD ({id})'
  ],
  rad_rule: ['{target} : règle du RAD non respectée ({id})', '{target}: RAD rule not met ({id})',
    '{target}: RAD-Regel nicht eingehalten ({id})',
    '{target}: regla del RAD no respetada ({id})'
  ],
  rad_rule0: ['Règle du RAD non respectée ({id})', 'RAD rule not met ({id})', 'RAD-Regel nicht eingehalten ({id})',
    'Regla del RAD no respetada ({id})'
  ],
  // 3, 7 : le raccord direct d'un terrain (la tête commune), puis la limite ou la raison
  connDep: ['Départ de {ad} : direct de {nm} NM jusqu’à {point}', 'Departure from {ad}: direct of {nm} NM to {point}',
    'Abflug von {ad}: Direktstrecke von {nm} NM bis {point}', 'Salida de {ad}: directo de {nm} NM hasta {point}'
  ],
  connDep0: ['Départ de {ad} : direct de {nm} NM', 'Departure from {ad}: direct of {nm} NM', 'Abflug von {ad}: Direktstrecke von {nm} NM',
    'Salida de {ad}: directo de {nm} NM'
  ],
  connArr: ['Arrivée à {ad} : direct de {nm} NM depuis {point}', 'Arrival at {ad}: direct of {nm} NM from {point}',
    'Ankunft in {ad}: Direktstrecke von {nm} NM ab {point}', 'Llegada a {ad}: directo de {nm} NM desde {point}'
  ],
  connArr0: ['Arrivée à {ad} : direct de {nm} NM', 'Arrival at {ad}: direct of {nm} NM', 'Ankunft in {ad}: Direktstrecke von {nm} NM',
    'Llegada a {ad}: directo de {nm} NM'
  ],
  limitTail: [', limite {lim} NM (RAD {rule})', ', limit {lim} NM (RAD {rule})', ', Grenze {lim} NM (RAD {rule})',
    ', límite {lim} NM (RAD {rule})'
  ],
  lim0Dep: ['Départ de {ad} : la route doit commencer au dernier point d’une SID (RAD {rule})',
    'Departure from {ad}: the route must start at the last point of a SID (RAD {rule})',
    'Abflug von {ad}: die Route muss am letzten Punkt einer SID beginnen (RAD {rule})',
    'Salida de {ad}: la ruta debe empezar en el último punto de una SID (RAD {rule})'
  ],
  lim0Arr: ['Arrivée à {ad} : la route doit finir au premier point d’une STAR (RAD {rule})',
    'Arrival at {ad}: the route must end at the first point of a STAR (RAD {rule})',
    'Ankunft in {ad}: die Route muss am ersten Punkt einer STAR enden (RAD {rule})',
    'Llegada a {ad}: la ruta debe terminar en el primer punto de una STAR (RAD {rule})'
  ],
  lim0Tail: [' ; {point} est à {nm} NM en direct', '; {point} is {nm} NM direct', '; {point} liegt {nm} NM direkt entfernt',
    '; {point} está a {nm} NM en directo'
  ],
  noNetwork: [' — aucun réseau de cet État dans la base', ' — no network of this State in the base',
    ' — kein Netz dieses Staates in der Basis',
    ' — ninguna red de este Estado en la base'
  ],
  why_no_limit: ['limite du RAD non lue pour ce terrain', 'RAD limit not read for this aerodrome',
    'RAD-Grenze für diesen Flugplatz nicht gelesen',
    'límite del RAD no leído para este aeródromo'
  ],
  why_conditional: ['la limite du RAD dépend du niveau ou de l’heure ({rule})', 'the RAD limit depends on the level or the time ({rule})',
    'die RAD-Grenze hängt von der Flugfläche oder der Uhrzeit ab ({rule})', 'el límite del RAD depende del nivel o de la hora ({rule})'
  ],
  why_no_procedure_read: ['le RAD impose une {proc} ({rule}), et aucune n’est dans la base pour ce terrain',
    'the RAD requires a {proc} ({rule}), and none is in the base for this aerodrome',
    'das RAD verlangt eine {proc} ({rule}), und keine ist für diesen Flugplatz in der Basis',
    'el RAD exige una {proc} ({rule}), y ninguna está en la base para este aeródromo'
  ],
  why_no_network_no_limit: ['aucun réseau de cet État dans la base', 'no network of this State in the base',
    'kein Netz dieses Staates in der Basis',
    'ninguna red de este Estado en la base'
  ],
  // 4 : un direct trop long dans un espace (les valeurs demandées à AeroDB ; sans elles, le texte du moteur)
  space_dct_limit: ['{from}–{to} : direct de {nm} NM, limite {lim} NM dans {space}',
    '{from}–{to}: direct of {nm} NM, limit {lim} NM in {space}',
    '{from}–{to}: Direktstrecke von {nm} NM, Grenze {lim} NM in {space}', '{from}–{to}: directo de {nm} NM, límite {lim} NM en {space}'
  ],
  // 5 : deux points (les valeurs demandées à AeroDB ; sans elles, le texte du moteur)
  level_yoyo: ['Descente au FL{down} à {downAt}, puis remontée au FL{up} à {upAt} (« yoyo »)',
    'Descent to FL{down} at {downAt}, then climb back to FL{up} at {upAt} (“yoyo”)',
    'Sinkflug auf FL{down} bei {downAt}, dann Steigflug zurück auf FL{up} bei {upAt} („Jo-Jo“)',
    'Descenso al FL{down} en {downAt}, y luego subida al FL{up} en {upAt} («yoyó»)'
  ],
  // 6
  no_conforming_route: ['Aucune route conforme trouvée au FL{fl}. La route montrée enfreint {n} règle(s) connue(s).',
    'No conforming route found at FL{fl}. The route shown breaks {n} known rule(s).',
    'Keine konforme Route auf FL{fl} gefunden. Die gezeigte Route verletzt {n} bekannte Regel(n).',
    'Ninguna ruta conforme encontrada en el FL{fl}. La ruta mostrada infringe {n} regla(s) conocida(s).'
  ],
  no_conforming_route0: ['Aucune route conforme trouvée. La route montrée enfreint {n} règle(s) connue(s).',
    'No conforming route found. The route shown breaks {n} known rule(s).',
    'Keine konforme Route gefunden. Die gezeigte Route verletzt {n} bekannte Regel(n).',
    'Ninguna ruta conforme encontrada. La ruta mostrada infringe {n} regla(s) conocida(s).'
  ],
  // 8
  stale_cycle: ['{zone} : données du {cycle}, périmées à la date du vol — voies concernées : {routes}',
    '{zone}: data of {cycle}, out of date on the date of the flight — airways concerned: {routes}',
    '{zone}: Daten vom {cycle}, am Flugdatum veraltet — betroffene Luftstraßen: {routes}',
    '{zone}: datos del {cycle}, caducados en la fecha del vuelo — aerovías afectadas: {routes}'
  ],
  stale_cycle0: ['{zone} : données du {cycle}, périmées à la date du vol',
    '{zone}: data of {cycle}, out of date on the date of the flight',
    '{zone}: Daten vom {cycle}, am Flugdatum veraltet', '{zone}: datos del {cycle}, caducados en la fecha del vuelo'
  ],
  // 9
  network_gap: ['Aucune voie dans la base entre {from} et {to} : direct de {nm} NM',
    'No airway in the base between {from} and {to}: direct of {nm} NM',
    'Keine Luftstraße in der Basis zwischen {from} und {to}: Direktstrecke von {nm} NM',
    'Ninguna aerovía en la base entre {from} y {to}: directo de {nm} NM'
  ]
};

/** Une valeur présente : une chaîne non vide ou un nombre fini. */
const has = v => (typeof v === 'string' && v !== '') || (typeof v === 'number' && Number.isFinite(v));
/** Une distance en milles nautiques au format de la langue (une décimale au plus : « 48,5 » en français). */
function nmOf(v, lang) {
  try {
    return (+v).toLocaleString(lang, {
      maximumFractionDigits: 1
    });
  } catch {
    return String(Math.round(+v * 10) / 10);
  }
}
/** Un niveau en centaines de pieds, sur trois chiffres. */
const flOf = v => String(Math.round(+v)).padStart(3, '0');
/** Le nom d'un État dans la langue de l'écran (« be » → « Belgique ») ; un préfixe qui n'en est pas un : son code en capitales. */
function zoneName(z, lang) {
  const code = String(z).toUpperCase();
  try {
    return /^[A-Z]{2}$/.test(code) ? new Intl.DisplayNames([lang], {
      type: 'region'
    }).of(code) || code : code;
  } catch {
    return code;
  }
}
/** Une date ISO (AAAA-MM-JJ) en date courte de l'écran ; la chaîne telle quelle sinon. */
function dayOf(d, lang) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d));
  if (!m) return String(d);
  try {
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString(lang, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC'
    });
  } catch {
    return String(d);
  }
}
/** La tête commune d'un raccord direct (3, 7) : « Départ de {ad} : direct de {nm} NM jusqu'à {point} » ; null sans terrain, extrémité
 *  ni distance. */
function connHead(v, t, lang) {
  if (!has(v.ad) || !has(v.nm) || !['dep', 'arr'].includes(v.end)) return null;
  const dep = v.end === 'dep',
    row = has(v.point) ? dep ? ROWS.connDep : ROWS.connArr : dep ? ROWS.connDep0 : ROWS.connArr0;
  return t(row, {
    ad: v.ad,
    nm: nmOf(v.nm, lang),
    point: has(v.point) ? v.point : ''
  });
}

/** SOG-0532 lot 2 : une ligne de la liste ouvrable d'un État — « {target} — {raison} ({id}) », sans endroit « {id} — {raison} » ; les
 *  cinq codes d'horaire (schedule_*) disent une seule phrase ; une raison inconnue : « règle que nous ne savons pas lire ». */
export function ruleLine(item, t) {
  const r = String(item?.reason || ''),
    why = t(r.startsWith('schedule_') ? ROWS.unread_schedule : ROWS[`unread_${r}`] || ROWS.unread_unread);
  return item?.target ? t(ROWS.ruleLine, {
    target: item.target,
    why,
    id: String(item?.id || '—')
  }) : t(ROWS.ruleLine0, {
    id: String(item?.id || '—'),
    why
  });
}
/** La phrase d'une raison (voir l'en-tête). */
export function compose(reason, t, lang = 'fr', ctx = {}) {
  const c = reason?.code,
    v = reason?.values || {},
    raw = String(reason?.text || ''),
    // le texte du moteur, faute de mieux : jamais une phrase française nue dans un écran d'une autre langue
    fallback = raw && lang !== 'fr' ? `${t(ROWS.engineFr)} ${raw}` : raw;
  switch (c) {
    case 'rad_block':
    case 'rad_rule':
      if (!has(v.id)) return fallback;
      return has(v.target) ? t(ROWS[c], {
        target: v.target,
        id: v.id
      }) : t(ROWS[`${c}0`], {
        id: v.id
      });
    case 'connector_limit': {
      if (!has(v.rule) || !has(v.limit_nm) || !has(v.ad) || !['dep', 'arr'].includes(v.end) || !has(v.nm)) return fallback;
      const tail = v.no_network === true ? t(ROWS.noNetwork) : '';
      if (+v.limit_nm === 0) return t(v.end === 'dep' ? ROWS.lim0Dep : ROWS.lim0Arr, {
        ad: v.ad,
        rule: v.rule
      }) + (has(v.point) ? t(ROWS.lim0Tail, {
        point: v.point,
        nm: nmOf(v.nm, lang)
      }) : '') + tail;
      return connHead(v, t, lang) + t(ROWS.limitTail, {
        lim: nmOf(v.limit_nm, lang),
        rule: v.rule
      }) + tail;
    }
    case 'connector_unknown': {
      const head = connHead(v, t, lang),
        why = ROWS[`why_${v.reason}`];
      if (!head || !why) return fallback;
      return `${head} — ${t(why, { rule: has(v.rule) ? v.rule : '—', proc: v.end === 'dep' ? 'SID' : 'STAR' })}`;
    }
    case 'space_dct_limit':
      return has(v.from_point) && has(v.to_point) && has(v.nm) && has(v.limit_nm) && has(v.space) ? t(ROWS.space_dct_limit, {
        from: v.from_point,
        to: v.to_point,
        nm: nmOf(v.nm, lang),
        lim: nmOf(v.limit_nm, lang),
        space: v.space
      }) : fallback;
    case 'level_yoyo':
      return has(v.down_point) && has(v.down_fl) && has(v.up_point) && has(v.up_fl) ? t(ROWS.level_yoyo, {
        down: flOf(v.down_fl),
        downAt: v.down_point,
        up: flOf(v.up_fl),
        upAt: v.up_point
      }) : fallback;
    case 'no_conforming_route': {
      if (!has(v.violations)) return fallback;
      const fl = Number.isInteger(ctx?.fl) && ctx.fl >= 10 && ctx.fl <= 660 ? flOf(ctx.fl) : null;
      return t(fl ? ROWS.no_conforming_route : ROWS.no_conforming_route0, {
        fl,
        n: Math.round(+v.violations)
      });
    }
    case 'stale_cycle': {
      if (!has(v.zone) || !has(v.cycle)) return fallback;
      const routes = Array.isArray(v.routes) ? v.routes.filter(has) : [];
      return t(routes.length ? ROWS.stale_cycle : ROWS.stale_cycle0, {
        zone: zoneName(v.zone, lang),
        cycle: dayOf(v.cycle, lang),
        routes: routes.join(', ')
      });
    }
    case 'rad_unread':
      // une seule moitié : les règles qui portent sur la route (flown) ; flown = 0 : pas de ligne (route_engine.js l'écarte)
      return has(v.state) && Number.isInteger(v.flown) && v.flown > 0 ? t(ROWS.rad_unread, {
        zone: zoneName(v.state, lang),
        n: v.flown
      }) : fallback;
    case 'network_gap':
      return has(v.from_point) && has(v.to_point) && has(v.nm) ? t(ROWS.network_gap, {
        from: v.from_point,
        to: v.to_point,
        nm: nmOf(v.nm, lang)
      }) : fallback;
    default:
      return fallback; // other, et tout code inconnu : le texte du moteur, avec la mention de langue
  }
}
