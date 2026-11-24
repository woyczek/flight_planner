// V3 missions — la section « Suite de la mission » de la fiche d'une mission (SOG-0441, lot T2 ; SOG-0459) : l'écran et ses gestes. Le
// calcul est dans drawers.js (pur) ; ce fichier lit et écrit par le cadre (ctx.data), ne touche à aucun autre document que :
//   · le carnet de CE pilote, pilot/<TRI>/missions/<ID>.json (écrit : le geste « Demander la suite », un constat, le départ réel du vol, « lu »
//     à l'ouverture de l'enveloppe — lot T3, reader_view.js) ;
//   · les carnets des autres pilotes de la mission (LUS seulement, entrées non fiables) ;
//   · cache/missions/seen_<ID>.json (sur l'appareil seul : les ouvertures des autres déjà vues — un tiroir ouvert le reste) ;
//   · cache/missions/open_<ID>.json (sur l'appareil seul, SOG-0448 : les tiroirs ouverts de MA mission, publiés à chaque calcul — la
//     Carte et quiconque montre la mission par pilotView les lisent par D.readOpen, jamais une règle à eux).
//
// L'EXISTENCE des tiroirs est cachée (SOG-0459, mot de l'utilisateur du 18/11) : tant qu'aucun tiroir n'est ouvert, la section reste
// cachée et VIDE, pour toute mission — rien ne dit qu'une mission a une suite, ni combien, ni comment elle viendra. La section tourne
// pour TOUTE mission (avec ou sans tiroir) : l'écran d'une mission sans tiroir et celui d'une mission dont tout est fermé sont les
// mêmes, élément pour élément. Pour MA mission (elle m'est affectée, ou c'est la mission de mon vol courant) :
//   · « Suite de la mission » : une ligne par tiroir OUVERT (titre, comment et quand, message, briefing) — rien de ce qui reste à venir ;
//   · « Demander la suite » : UN geste neutre, posé dans la place [data-actslot] de la rangée des actions de la fiche (module.js la
//     pose après « Préparer ce vol ») ; « Demander » ouvre le premier tiroir fermé si sa clé est le geste, ou un objet suivi et à portée
//     (drawers.js asked) ; sinon « Rien de nouveau pour l'instant » — la même réponse pour toute mission ; puis une minute de repos ;
//   · le suivi en vol (heure, repli, zone, arrivée, objet sans déclaration, constat d'un équipier) continue en silence.
// Une mission qu'on feuillette : rien, ni section, ni geste.
//
// SOG-0617 : ce fichier est l'ÉCRAN seul. Le juge (lecture, position en direct, constats, publication, garde entre onglets) est dans
// drawers_run.js, qui tourne aussi SANS fiche (le veilleur de la page) : cette vue s'accroche au contrôleur de la mission et le peint.
// La ligne « Position » (SOG-0617, e), première ligne de la section pour MA mission pendant que son vol est démarré, avec ou sans tiroir :
// « Position : X-Plane, reçue il y a n s » ou « Pas de position : … » ; seule, elle montre la section SANS titre et sans `data-mine`.
//
// API : show(host, { ctx, id, mission, changed, askSlot, readerHost, pollMs, restMs }) — pose la section dans `host` (l'élément
//   [data-drawers] de la fiche, redessiné avec elle : rappeler show à chaque dessin) ; askSlot : l'élément où va « Demander la suite » (par
//   défaut [data-actslot] de la fiche) ; readerHost : où s'accrochent l'enveloppe et la liseuse (par défaut la fiche ; `null` : pas de liseuse,
//   le volet du pilote est déjà le Brief) ; restMs : le repos de « Demander la suite » (une minute ; un banc le raccourcit) ;
//   stop() — la fiche se ferme, le module se démonte (la vue se décroche ; le juge continue s'il est suivi par le veilleur).
//   describe(tt, state, drawer, { live, notJudged, inRange }) → { key, note, how, follow } : les phrases d'un tiroir (la clé d'un tiroir fermé, la note
//   « pas encore jugé en vol » ou « sans position en direct », comment et quand il s'est ouvert) — pur : l'aperçu de l'éditeur peut
//   s'en servir pour dire la même chose que l'écran du pilote. TX : les textes, quatre langues.
//   Un posé de PRÉCISION (SOG-0507) : son palier (excellent, parfait, réussi, partiel) et sa distance en NM, deux décimales, séparateur
//   de la langue (TX.decSep), ne sont dits qu'UNE fois, dans le Débrief ; la ligne d'ouverture du tiroir ne dit que comment et quand.
//   « Débrief » (SOG-0516, lot B) : SOUS « Suite de la mission », une ligne par posé de précision jugé (drawers.js debriefOf : les miens et ceux des
//   équipiers, le palier recalculé chez le lecteur), à tous les niveaux ; présent seulement s'il a une ligne ; ni score ni classement ni lieu.
//   debriefLine(tt, ligne) → le texte d'une ligne du débrief, dans la langue de tt (pur).
//   sees(id, mission) → ce que la fiche et son Détail montrent de cette mission (SOG-0448) : pilotView du lecteur, avec les tiroirs
//   que la section posée sait ouverts — rien d'ouvert tant qu'elle n'a pas lu, la partie visible seule pour une mission qui n'est pas
//   la mienne. show() reçoit `changed` : rappelé quand ce que sees() a rendu n'est plus à jour (un tiroir s'ouvre) — la fiche se redessine.

import * as D from './drawers.js';
import * as RUN from './drawers_run.js'; // le juge : MÊME texte d'import que le veilleur de la page (une seule instance, un seul juge)
import {
  TIER_TEXT
} from '../../frame/lib/precision.js';
import * as AV from './assign_view.js'; // SOG-0443 : « Affecter… » dans la rangée de la fiche, appelé à chaque dessin (show) et par stop()
import {
  fmtZ
} from '../../frame/lib/time.js';
import {
  pilotView,
  routeNm
} from '../../frame/lib/mission.js'; // ce que le pilote peut voir : la règle du lecteur, écrite une fois (SOG-0448)
import * as RD from './reader_view.js'; // l'enveloppe et la liseuse de MA mission (lot T3)
import {
  clean,
  plain
} from '../../frame/lib/untrusted.js';

export const TX = {
  // SOG-0459 : l'écran du pilote — rien avant l'ouverture, puis « Suite de la mission » ; un seul geste neutre
  head: ['Suite de la mission', 'Rest of the mission', 'Fortsetzung der Mission', 'Continuación de la misión'],
  moreOpen: ['{n} autres', '{n} more', '{n} weitere', '{n} más'],
  ask: ['Demander la suite', 'Ask for what comes next', 'Fortsetzung anfragen', 'Pedir la continuación'],
  askText: ['Vous avez atteint ou trouvé ce que la mission demande ? Le centre vous donne la suite s\'il y en a une.',
    'Have you reached or found what the mission asks for? The centre gives you what comes next, if there is anything.',
    'Haben Sie erreicht oder gefunden, was die Mission verlangt? Die Zentrale gibt Ihnen die Fortsetzung, falls es eine gibt.',
    '¿Ha alcanzado o encontrado lo que pide la misión? El centro le da la continuación, si la hay.'
  ],
  askYes: ['Demander', 'Ask', 'Anfragen', 'Pedir'],
  askNo: ['Pas maintenant', 'Not now', 'Nicht jetzt', 'Ahora no'],
  // les phrases d'un tiroir (describe : l'atelier de l'auteur s'en sert, cas N79) — sa clé en clair
  keyTimeAt: ['s\'ouvre à {t}', 'opens at {t}', 'öffnet sich um {t}', 'se abre a las {t}'],
  keyTimeDep: ['s\'ouvre {n} min après le départ', 'opens {n} min after departure', 'öffnet sich {n} min nach dem Start',
    'se abre {n} min después de la salida'
  ],
  keyTimePoint: ['s\'ouvre {n} min après le passage de {p}', 'opens {n} min after passing {p}',
    'öffnet sich {n} min nach dem Überflug von {p}',
    'se abre {n} min después del paso por {p}'
  ],
  estimated: ['heure estimée', 'estimated time', 'geschätzte Zeit', 'hora estimada'],
  keyZone: ['s\'ouvre au passage de la zone montrée sur la Carte', 'opens when the aircraft enters the zone shown on the Map',
    'öffnet sich beim Einflug in die auf der Karte gezeigte Zone', 'se abre al entrar en la zona mostrada en el Mapa'
  ],
  keyHidden: ['s\'ouvre en vol', 'opens in flight', 'öffnet sich im Flug', 'se abre en vuelo'],
  keyObject: ['s\'ouvre quand l\'objet est trouvé', 'opens when the object is found', 'öffnet sich, wenn das Objekt gefunden ist',
    'se abre cuando se encuentra el objeto'
  ],
  keyHand: ['à ouvrir à la main', 'to be opened by hand', 'von Hand zu öffnen', 'se abre a mano'],
  keyArrival: ['s\'ouvre à l\'arrivée à {p}', 'opens on arrival at {p}', 'öffnet sich bei der Ankunft in {p}',
    'se abre a la llegada a {p}'
  ],
  // l'heure de repli : dite seulement quand elle concerne le pilote (décision de l'ergonome, 17/11 à 18 h 42) — son appareil n'a pas de
  // position en direct, ou la clé n'est pas encore jugée en vol
  hPlusMin: ['H\u00a0+\u00a0{n}\u00a0min', 'H\u00a0+\u00a0{n}\u00a0min', 'H\u00a0+\u00a0{n}\u00a0min',
    'H\u00a0+\u00a0{n}\u00a0min'
  ], // insécable : ne se coupe pas en fin de ligne
  hPlusH: ['H\u00a0+\u00a0{h}\u00a0h\u00a0{m}', 'H\u00a0+\u00a0{h}\u00a0h\u00a0{m}', 'H\u00a0+\u00a0{h}\u00a0h\u00a0{m}',
    'H\u00a0+\u00a0{h}\u00a0h\u00a0{m}'
  ],
  hPlusHours: ['H\u00a0+\u00a0{h}\u00a0h', 'H\u00a0+\u00a0{h}\u00a0h', 'H\u00a0+\u00a0{h}\u00a0h', 'H\u00a0+\u00a0{h}\u00a0h'],
  willOpen: ['le tiroir s\'ouvrira à {t}', 'the drawer will open at {t}', 'die Schublade öffnet sich um {t}',
    'el cajón se abrirá a las {t}'
  ],
  noLive: ['Sans position en direct sur cet appareil : {x}', 'No live position on this device: {x}',
    'Keine Live-Position auf diesem Gerät: {x}',
    'Sin posición en directo en este dispositivo: {x}'
  ],
  // la phrase du pilote (l'ergonome, 17/11 : « pas encore jugé en vol » est une phrase d'atelier) : l'heure d'abord, une seule fois
  notJudged: ['Cet appareil ne suit pas encore ce passage : {x}', 'This device does not follow this passage yet: {x}',
    'Dieses Gerät verfolgt diesen Durchflug noch nicht: {x}', 'Este dispositivo aún no sigue este paso: {x}'
  ],
  orByHand: ['{x}, ou à la main', '{x}, or by hand', '{x}, oder von Hand', '{x}, o a mano'],
  byHandOnly: ['le tiroir est à ouvrir à la main', 'the drawer is to be opened by hand', 'die Schublade ist von Hand zu öffnen',
    'el cajón se abre a mano'
  ],
  // la position en direct : ce que l'appareil suit, l'objet à portée (describe ; plus à l'écran du pilote depuis SOG-0459)
  followed: ['Cet appareil suit ce passage', 'This device follows this passage', 'Dieses Gerät verfolgt diesen Durchflug',
    'Este dispositivo sigue este paso'
  ],
  inRange: ['À portée de l\'objet : déclarez « Objet en vue »', 'In range of the object: declare “Object in sight”',
    'In Reichweite des Objekts: melden Sie „Objekt in Sicht“', 'Al alcance del objeto: declare «Objeto a la vista»'
  ],
  openArrivalMe: ['ouvert à l\'arrivée, à {t}', 'opened on arrival, at {t}', 'bei der Ankunft geöffnet um {t}',
    'abierto a la llegada, a las {t}'
  ],
  openArrivalBy: ['ouvert à l\'arrivée de {by}, à {t}', 'opened when {by} arrived, at {t}', 'bei der Ankunft von {by} geöffnet um {t}',
    'abierto a la llegada de {by}, a las {t}'
  ],
  // la condition « atterrissage » de l'atelier (SOG-0500) : jamais le lieu — le point peut être un lieu que la mission cache encore,
  // et son identifiant (« DESTINATION », un id de l'atelier) n'est pas un nom pour le pilote
  keyLanding: ['s\'ouvre à l\'atterrissage', 'opens on landing', 'öffnet sich bei der Landung', 'se abre al aterrizar'],
  openLandingMe: ['ouvert à votre atterrissage, à {t}', 'opened on your landing, at {t}', 'bei Ihrer Landung geöffnet um {t}',
    'abierto a su aterrizaje, a las {t}'
  ],
  openLandingBy: ['ouvert à l\'atterrissage de {by}, à {t}', 'opened when {by} landed, at {t}',
    'bei der Landung von {by} geöffnet um {t}',
    'abierto al aterrizaje de {by}, a las {t}'
  ],
  // le débrief de MA mission (SOG-0516, lot B) : une ligne par posé de précision jugé, le mien puis ceux des équipiers ; jamais un lieu
  debriefHead: ['Débrief', 'Debrief', 'Nachbesprechung', 'Informe'],
  debriefMe: ['{title} — atterrissage {tier} ({d} NM), à {t}', '{title} — landing: {tier} ({d} NM), at {t}',
    '{title} — Landung {tier} ({d} NM) um {t}', '{title} — aterrizaje {tier} ({d} NM), a las {t}'
  ],
  debriefBy: ['{title} — atterrissage {tier} ({d} NM), à {t} — {by}', '{title} — landing: {tier} ({d} NM), at {t} — {by}',
    '{title} — Landung {tier} ({d} NM) um {t} — {by}', '{title} — aterrizaje {tier} ({d} NM), a las {t} — {by}'
  ],
  // sans titre (un tiroir qui n'en a pas) : la phrase commence par la majuscule, sans « — » d'attaque
  debriefMeUntitled: ['Atterrissage {tier} ({d} NM), à {t}', 'Landing: {tier} ({d} NM), at {t}', 'Landung {tier} ({d} NM) um {t}',
    'Aterrizaje {tier} ({d} NM), a las {t}'
  ],
  debriefByUntitled: ['Atterrissage {tier} ({d} NM), à {t} — {by}', 'Landing: {tier} ({d} NM), at {t} — {by}',
    'Landung {tier} ({d} NM) um {t} — {by}',
    'Aterrizaje {tier} ({d} NM), a las {t} — {by}'
  ],
  tier: TIER_TEXT, // les quatre mots des paliers : ceux du cadre (frame/lib/precision.js, SOG-0516)
  decSep: [',', '.', ',', ','], // le séparateur décimal de la langue (une distance s'écrit avec deux décimales)
  // la condition « survol » de l'atelier (SOG-0500, lot 2) : jamais le lieu, comme l'atterrissage
  keyOverflight: ['s\'ouvre au survol', 'opens on overflight', 'öffnet sich beim Überflug', 'se abre al sobrevolar'],
  openOverflightMe: ['ouvert à votre survol, à {t}', 'opened on your overflight, at {t}', 'bei Ihrem Überflug geöffnet um {t}',
    'abierto a su sobrevuelo, a las {t}'
  ],
  openOverflightBy: ['ouvert au survol de {by}, à {t}', 'opened when {by} overflew, at {t}', 'beim Überflug von {by} geöffnet um {t}',
    'abierto al sobrevuelo de {by}, a las {t}'
  ],
  // la condition « stationnaire » de l'atelier (SOG-0500, lot 4) : jamais le lieu, comme l'atterrissage
  keyHover: ['s\'ouvre au stationnaire', 'opens on hover', 'öffnet sich beim Schwebeflug', 'se abre al estacionario'],
  openHoverMe: ['ouvert à votre stationnaire, à {t}', 'opened on your hover, at {t}', 'bei Ihrem Schwebeflug geöffnet um {t}',
    'abierto a su estacionario, a las {t}'
  ],
  openHoverBy: ['ouvert au stationnaire de {by}, à {t}', 'opened when {by} hovered, at {t}',
    'beim Schwebeflug von {by} geöffnet um {t}',
    'abierto al estacionario de {by}, a las {t}'
  ],
  // la condition « refill » de l'atelier (SOG-0521) : jamais le lieu, comme l'atterrissage
  keyRefill: ['s\'ouvre au ravitaillement', 'opens on the retardant refill', 'öffnet sich beim Löschmittel-Nachfüllen',
    'se abre a la recarga de retardante'
  ],
  openRefillMe: ['ouvert à votre ravitaillement en retardant, à {t}', 'opened on your retardant refill, at {t}',
    'bei Ihrem Löschmittel-Nachfüllen geöffnet um {t}', 'abierto a su recarga de retardante, a las {t}'
  ],
  openRefillBy: ['ouvert au ravitaillement en retardant de {by}, à {t}', 'opened on {by}\'s retardant refill, at {t}',
    'beim Löschmittel-Nachfüllen von {by} geöffnet um {t}', 'abierto a la recarga de retardante de {by}, a las {t}'
  ],
  // la condition « suite d'étapes » de l'atelier (SOG-0500, lot 5) : ni le nombre d'étapes ni un lieu, et pas de progression étape par étape
  keySequence: ['s\'ouvre à la fin de ses étapes', 'opens at the end of its steps', 'öffnet sich am Ende seiner Etappen',
    'se abre al final de sus etapas'
  ],
  openSequenceMe: ['ouvert à la fin de vos étapes, à {t}', 'opened at the end of your steps, at {t}',
    'am Ende Ihrer Etappen geöffnet um {t}', 'abierto al final de sus etapas, a las {t}'
  ],
  openSequenceBy: ['ouvert à la fin des étapes de {by}, à {t}', 'opened at the end of the steps of {by}, at {t}',
    'am Ende der Etappen von {by} geöffnet um {t}', 'abierto al final de las etapas de {by}, a las {t}'
  ],
  gotHere: ['reçu ici à {t}', 'received here at {t}', 'hier empfangen um {t}', 'recibido aquí a las {t}'],
  // un tiroir ouvert : comment et quand
  openTime: ['ouvert à l\'heure, à {t}', 'opened on time, at {t}', 'planmäßig geöffnet um {t}', 'abierto a su hora, a las {t}'],
  openFallback: ['ouvert à l\'heure de repli, à {t}', 'opened at the fallback time, at {t}', 'zur Ersatzzeit geöffnet, um {t}',
    'abierto a la hora de reserva, a las {t}'
  ],
  // SOG-0459 : mon ouverture dite sans le geste d'avant (« Demander la suite »)
  openHandMe: ['ouvert à votre demande, à {t}', 'opened at your request, at {t}', 'auf Ihre Anfrage geöffnet um {t}',
    'abierto a petición suya, a las {t}'
  ],
  openHandBy: ['ouvert à la main par {by}, à {t}', 'opened by hand by {by}, at {t}', 'von {by} von Hand geöffnet um {t}',
    'abierto a mano por {by}, a las {t}'
  ],
  openZoneMe: ['ouvert au passage de la zone, à {t}', 'opened on entering the zone, at {t}', 'beim Einflug in die Zone geöffnet um {t}',
    'abierto al entrar en la zona, a las {t}'
  ],
  openZoneBy: ['ouvert au passage de la zone par {by}, à {t}', 'opened when {by} entered the zone, at {t}',
    'beim Einflug von {by} in die Zone geöffnet um {t}', 'abierto al entrar {by} en la zona, a las {t}'
  ],
  openObjectMe: ['ouvert quand vous avez trouvé l\'objet, à {t}', 'opened when you found the object, at {t}',
    'geöffnet, als Sie das Objekt gefunden haben, um {t}', 'abierto cuando encontró el objeto, a las {t}'
  ],
  openObjectBy: ['ouvert quand {by} a trouvé l\'objet, à {t}', 'opened when {by} found the object, at {t}',
    'geöffnet, als {by} das Objekt gefunden hat, um {t}', 'abierto cuando {by} encontró el objeto, a las {t}'
  ],
  gone: ['{by} a retiré cette ouverture de son carnet : le tiroir reste ouvert',
    '{by} removed this opening from their record: the drawer stays open',
    '{by} hat diese Öffnung aus dem eigenen Heft entfernt: die Schublade bleibt offen',
    '{by} retiró esta apertura de su cuaderno: el cajón sigue abierto'
  ],
  more: ['Lire la suite', 'Read more', 'Weiterlesen', 'Leer más'],
  seal: ['Resceller', 'Reseal', 'Wieder versiegeln', 'Resellar'],
  // la ligne « Position » (SOG-0617, e) : première ligne de la section, pour MA mission pendant que son vol est démarré
  posLive: ['Position : {source}, reçue il y a {n} s', 'Position: {source}, received {n} s ago',
    'Position: {source}, vor {n} s empfangen',
    'Posición: {source}, recibida hace {n} s'
  ],
  posNone: ['Pas de position : la suite de la mission ne s\'ouvrira pas à l\'arrivée sur un lieu.',
    'No position: the rest of the mission will not open on arriving at a place.',
    'Keine Position: Die Fortsetzung der Mission öffnet sich nicht bei der Ankunft an einem Ort.',
    'Sin posición: la continuación de la misión no se abrirá al llegar a un lugar.'
  ],
  // SOG-0619 : le bloc unique de la mission en vol, dans l'ordre de lecture
  inFlight: ['En vol depuis {t}', 'In flight since {t}', 'Im Flug seit {t}', 'En vuelo desde {t}'],
  kArrived: ['Vient d\'arriver', 'Just arrived', 'Gerade eingetroffen', 'Acaba de llegar'],
  envMsg: ['Un message de la mission', 'A message of the mission', 'Eine Nachricht der Mission', 'Un mensaje de la misión'],
  envAt: ['arrivé à {t}', 'arrived at {t}', 'eingetroffen um {t}', 'llegado a las {t}'],
  kNow: ['Maintenant', 'Now', 'Jetzt', 'Ahora'],
  orderRead: ['lu à {t}', 'read at {t}', 'gelesen um {t}', 'leído a las {t}'],
  readOrder: ['Lire l\'ordre de mission', 'Read the mission order', 'Missionsauftrag lesen', 'Leer la orden de misión'],
  kDo: ['Ce que vous pouvez faire', 'What you can do', 'Was Sie tun können', 'Lo que puede hacer'],
  objSeen: ['Objet en vue', 'Object in sight', 'Objekt in Sicht', 'Objeto a la vista'],
  kPast: ['Avant', 'Before', 'Vorher', 'Antes'],
  newOne: ['1 nouvelle', '1 new', '1 neu', '1 nueva'],
  newMany: ['{n} nouvelles', '{n} new', '{n} neu', '{n} nuevas'],
  ...RUN.RTX // « Rien de nouveau… », une écriture refusée, « lu » refusé : les textes que le juge dit lui-même (drawers_run.js)
};

const STYLE = `[data-drawers]{margin:0 0 12px}
[data-module="missions"] .ms-first:has([data-drawers][data-mine]) [data-zones]{display:none}
[data-drawers] .dw-rest>summary{margin:2px 0 8px}
[data-drawers] .dw-list{display:grid;gap:8px;margin:6px 0 0;max-width:64ch}
@container (min-width: 850px){[data-module="missions"] .ms-sheet:has([data-drawers][data-mine]){grid-template-columns:minmax(16em,40em) minmax(0,1fr)}}
[data-drawers] .dw-row{border:1px solid var(--sog-border);padding:8px 10px;background:var(--sog-bg)}
[data-drawers] .dw-row[data-open]{border-left:3px solid var(--sog-accent)}
[data-drawers] .dw-top b{overflow-wrap:anywhere}
[data-drawers] .dw-ask{border:1px solid var(--sog-border);padding:8px 10px;background:var(--sog-bg);max-width:64ch}
[data-drawers] .dw-ask p{margin:0 0 8px}
[data-dw-ask],[data-drawers] .dw-ask button{min-height:var(--sog-touch,44px);white-space:nowrap}
[data-drawers] .dw-key{display:block;margin-top:2px}
[data-drawers] .dw-acts{display:flex;flex-wrap:wrap;gap:8px;margin:2px 0 -4px}
[data-drawers] section[data-dw-acts]{display:block;margin:0}
[data-drawers] .dw-text{margin:6px 0 0;overflow-wrap:anywhere}
[data-drawers] .dw-text p{margin:.4em 0;white-space:pre-wrap}
[data-drawers] .dw-msg{border-left:3px solid var(--sog-border);padding-left:8px}
[data-drawers] [data-dw-pos]{margin:0 0 8px}
[data-drawers].dw-flight{display:flex;flex-direction:column;border:1px solid var(--sog-border);background:var(--sog-bg);margin:0 0 12px}
[data-drawers].dw-flight>section,[data-drawers].dw-flight>header{padding:12px 16px;border-bottom:1px solid var(--sog-border);margin:0}
[data-drawers].dw-flight .dw-head h3{margin:0;font-size:1.25em}
[data-drawers].dw-flight .dw-state{margin:2px 0 0;font-size:var(--sog-size-s);display:flex;align-items:center;gap:2px 14px;flex-wrap:wrap}
[data-drawers].dw-flight .dw-state i{width:8px;height:8px;border-radius:50%;background:var(--sog-ok,#1e7d32);display:inline-block;margin-right:-8px}
[data-drawers].dw-flight .dw-state [data-dw-nopos]{color:var(--sog-fg)}
[data-drawers].dw-flight .dw-kick,[data-dw-acts] .dw-kick{margin:0 0 8px;font-size:var(--sog-size-xs);font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--sog-muted)}
[data-drawers] .dw-env{display:flex;gap:14px;align-items:center}
[data-drawers] .dw-env+.dw-env{margin-top:12px;padding-top:12px;border-top:1px dashed var(--sog-border)}
[data-drawers] .dw-shape{position:relative;flex:none;width:96px;height:62px;border:1px solid var(--sog-border);background:var(--sog-soft,var(--sog-bg))}
[data-drawers] .dw-shape::before{content:"";position:absolute;inset:0;background:linear-gradient(to bottom right,transparent calc(50% - 1px),var(--sog-border) 50%,transparent calc(50% + 1px)) top left/50% 55% no-repeat,linear-gradient(to bottom left,transparent calc(50% - 1px),var(--sog-border) 50%,transparent calc(50% + 1px)) top right/50% 55% no-repeat}
[data-drawers] .dw-shape span{position:absolute;left:50%;top:55%;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:var(--sog-accent)}
[data-drawers] .dw-what{flex:1;min-width:0}
[data-drawers] .dw-what b{display:block}
[data-drawers] .dw-now .dw-row{border:0;padding:0;background:none}
[data-dw-acts] .dw-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}
[data-dw-acts] .dw-two button{width:100%;min-height:var(--sog-touch,44px)}
[data-dw-acts]{background:var(--sog-soft,var(--sog-bg))}
[data-dw-acts] .dw-answer{margin:8px 0 0;padding:8px 10px;border-left:3px solid var(--sog-muted);background:var(--sog-bg);font-size:var(--sog-size-s)}
[data-dw-acts] .dw-ask{border:1px solid var(--sog-border);padding:8px 10px;background:var(--sog-bg);margin:0 0 8px}
[data-dw-acts] .dw-ask p{margin:0 0 8px}
[data-dw-acts] .dw-ask .dw-acts{display:flex;flex-wrap:wrap;gap:8px;margin:0}
[data-drawers] .dw-fold>summary{cursor:pointer;display:flex;justify-content:space-between;gap:10px;min-height:var(--sog-touch,44px);align-items:center}
[data-drawers] .dw-fold>summary .t{flex:1;min-width:0}
[data-drawers] .dw-fold>summary .h{color:var(--sog-muted);font-size:var(--sog-size-s)}
[data-drawers] .dw-fold+.dw-fold{border-top:1px solid var(--sog-border)}
[data-drawers]{container:dw/inline-size}
@container dw (max-width: 519px){[data-drawers] .dw-env{flex-wrap:wrap;gap:10px 12px}
[data-drawers] .dw-shape{width:64px;height:42px}
[data-drawers] .dw-what{flex:1 1 0}
[data-drawers] .dw-what b{display:inline}
[data-drawers] .dw-what span::before{content:" · "}
[data-drawers] .dw-env button{flex:1 0 100%}}
[data-drawers][data-narrow] [data-dw-acts]{position:sticky;bottom:0;z-index:2;border-top:1px solid var(--sog-border);box-shadow:0 -4px 12px rgba(0,0,0,.10);display:flex;flex-direction:column}
[data-drawers][data-narrow] [data-dw-acts] .dw-kick{display:none}
[data-drawers][data-narrow] [data-dw-acts] .dw-answer{order:-1;margin:0 0 8px}
[data-actslot]>[data-dw-acts]{flex:1 1 100%;min-width:0;display:flex;flex-direction:column;padding:0;background:none}
[data-actslot]>[data-dw-acts] .dw-kick{display:none}
[data-actslot]>[data-dw-acts] .dw-answer{order:-1;margin:0 0 8px}`;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
export const POLL_MS = RUN.POLL_MS;
/** Ce que la fiche et son Détail montrent de cette mission (le juge le sait : drawers_run.js). */
export const sees = RUN.sees;
let W = null; // la vue accrochée : une fiche à la fois

const SEVEN = 7; // sept tiroirs ouverts à l'écran, les suivants repliés
const TITLE_CUT = 120; // un titre de tiroir à l'écran : 120 signes au plus (comme un message d'erreur ailleurs)
const BRIEF_CUT = 1200; // le briefing (jusqu'à 20 000 signes dans le fichier) : le début, puis « Lire la suite » (la liseuse : lot T3)

/** « H + 60 min », « H + 1 h 30 », « H + 2 h » (la maquette). */
function hPlus(tt, min) {
  const n = Math.round(min),
    h = Math.floor(n / 60),
    m = n % 60;
  return n <= 60 ? tt(TX.hPlusMin, {
    n
  }) : m ? tt(TX.hPlusH, {
    h,
    m: String(m).padStart(2, '0')
  }) : tt(TX.hPlusHours, {
    h
  });
}

/** Les phrases d'un tiroir (voir l'en-tête) : key — la clé d'un tiroir fermé ; note — pourquoi l'heure de repli ou le geste le concernent
 *  (« pas encore jugé en vol », « sans position en direct »), '' quand la clé joue sur cet appareil ; how — comment et quand il s'est
 *  ouvert ('' fermé) — pour un posé de précision, le PALIER et la distance au point visé (SOG-0507 : `state.tier` et `state.distNm`,
 *  recalculés par drawers.js chez le lecteur, jamais le palier écrit par l'autre ; sans palier, la phrase d'avant). live : l'appareil a
 *  une position en direct ; notJudged(key) : la règle du lecteur (frame/lib/mission.js). */
export function describe(tt, s, d, {
  live = false,
  notJudged,
  inRange = false
} = {}) {
  const k = s.key || {},
    due = s.dueAt != null ? fmtZ(new Date(s.dueAt)) : '',
    est = s.estimated ? ` (${tt(TX.estimated)})` : '';
  let key;
  if (k.kind === 'time') {
    const n = Number.isFinite(k.delayMin) ? k.delayMin : 0;
    key = due ? tt(TX.keyTimeAt, {
      t: due
    }) + est : !k.point || k.point === 'ORIGIN' ? tt(TX.keyTimeDep, {
      n
    }) : `${tt(TX.keyTimePoint, { n, p: k.point })} (${tt(TX.estimated)})`;
  } else if (k.kind === 'zone') key = tt(k.shown === false ? TX.keyHidden : TX.keyZone);
  else if (k.kind === 'object') key = tt(TX.keyObject);
  else if (k.kind === 'arrival' && typeof k.point === 'string' && k.point) key = tt(TX.keyArrival, {
    p: k.point
  });
  else if (D.howOf(k) === 'landing') key = tt(TX.keyLanding); // jamais le lieu (voir TX.keyLanding)
  else if (D.howOf(k) === 'overflight') key = tt(TX.keyOverflight); // jamais le lieu (voir TX.keyOverflight)
  else if (D.howOf(k) === 'hover') key = tt(TX.keyHover); // jamais le lieu (voir TX.keyHover)
  else if (D.howOf(k) === 'refill' && D.follows(k)) key = tt(TX.keyRefill); // jamais le lieu (voir TX.keyRefill)
  else if (D.howOf(k) === 'sequence' && D.follows(k)) key = tt(TX.keySequence); // ni le nombre d'étapes ni un lieu (voir TX.keySequence)
  else if (k.kind && k.kind !== 'hand') key = tt(TX.keyHidden); // une condition de l'auteur, une clé que cet écran ne connaît pas
  else key = tt(TX.keyHand);
  // l'heure de repli n'est dite que si elle concerne le pilote : la clé n'est pas suivie sur cet appareil
  let note = '',
    follow = ''; // 'followed' : l'appareil suit ce passage ; 'range' : à portée de l'objet
  if (k.kind !== 'time') {
    const inFlight = !!k.kind && k.kind !== 'hand',
      // ce que l'appareil sait juger avec une position (drawers.js), hors de ce que le lecteur dit « pas encore jugé en vol »
      judged = inFlight && RUN.judgedKey(k, notJudged) && d?.keyWhy !== 'condition',
      // l'heure d'abord, une seule fois ; « H + 1 h 30 » seulement quand l'heure n'est pas connue (pas encore de départ)
      at = Number.isFinite(k.fallbackMin) ? tt(TX.willOpen, {
        t: due ? `${due}${est}` : hPlus(tt, k.fallbackMin)
      }) : '';
    if ((inFlight && !judged) || d?.keyWhy === 'condition') note = tt(TX.notJudged, {
      x: at ? tt(TX.orByHand, {
        x: at
      }) : tt(TX.byHandOnly)
    });
    else if (judged && !live) note = tt(TX.noLive, {
      x: at || tt(TX.byHandOnly)
    });
    else if (judged) {
      follow = inRange ? 'range' : 'followed';
      note = tt(inRange ? TX.inRange : TX.followed);
    } else if (at) note = at; // le geste seul avec une heure de repli (une condition que le lecteur n'a pas lue)
  }
  let how = '';
  if (s.open) {
    const other = !!s.by && !s.mine; // ouvert par un autre : l'heure du fait (son constat), pas celle où il a joué ici
    const row = s.how === 'time' ? TX.openTime : s.how === 'fallback' ? TX.openFallback : s.how === 'zone' ? (s.mine ? TX.openZoneMe : TX
        .openZoneBy) :
      s.how === 'object' ? (s.mine ? TX.openObjectMe : TX.openObjectBy) : s.how === 'arrival' ? (s.mine ? TX.openArrivalMe : TX
        .openArrivalBy) : s.how === 'landing' ? (s.mine ? TX.openLandingMe : TX.openLandingBy) : s.how === 'overflight' ? (s.mine ? TX
        .openOverflightMe : TX.openOverflightBy) : s.how === 'hover' ? (s.mine ? TX.openHoverMe : TX.openHoverBy) : s.how === 'refill' ? (s
        .mine ? TX.openRefillMe : TX.openRefillBy) : s.how === 'sequence' ? (
        s.mine ? TX.openSequenceMe : TX
        .openSequenceBy) :
      s.mine ? TX.openHandMe : TX.openHandBy;
    // la ligne d'ouverture ne dit que COMMENT et QUAND : le palier et la distance d'un posé de précision ne sont dits qu'une fois, au Débrief
    how = tt(row, {
      t: fmtZ(new Date(other && Number.isFinite(s.srcAt) ? s.srcAt : s.at)),
      by: s.by || ''
    });
  }
  return {
    key,
    note,
    how,
    follow
  };
}

/** Le texte d'une ligne du débrief (pur : le banc le dit dans les quatre langues) : tt(ligne, valeurs) traduit ; l, une ligne de debriefOf. */
export function debriefLine(tt, l) {
  const title = typeof l.title === 'string' ? l.title.slice(0, TITLE_CUT) :
    ''; // le titre du tiroir, jamais son numéro (§ 7.4) ; l'échappement est à debriefRow
  return tt(title ? (l.mine ? TX.debriefMe : TX.debriefBy) : (l.mine ? TX.debriefMeUntitled : TX.debriefByUntitled), {
    title,
    tier: tt(TX.tier[l.tier]),
    d: l.distNm.toFixed(2).replace('.', tt(TX.decSep)), // deux décimales, le séparateur de la langue
    t: fmtZ(new Date(l.at)),
    by: l.by
  });
}

/** La fiche se ferme ou le module se démonte : la vue se décroche (minuteur du repos, bouton retiré, liseuse) ; le juge s'arrête avec elle
 *  sauf si le veilleur de la page suit la mission. */
export function stop() {
  AV.stop(); // SOG-0443 : « Affecter… » et son formulaire retirés avec la section
  if (!W) return;
  const w = W;
  W = null;
  clearTimeout(w.restTimer);
  clearTimeout(w.ansTimer);
  w.actsEl?.remove(); // les gestes posés dans la place de la rangée de la fiche partent avec la section
  w.askBtn?.remove();
  w.host?.querySelectorAll?.('[data-dw-debrief-head],[data-dw-debrief]').forEach(e => e.remove()); // le débrief part avec la fiche
  RD.detach();
  RUN.detach(w.id, w);
}

/** Pose la section « Suite de la mission » dans host (voir l'en-tête), puis « Affecter… » dans la rangée de la fiche (SOG-0443,
 *  assign_view.js : pour toute mission lue, au niveau Courant et au-delà). */
export function show(host, o = {}) {
  showDrawers(host, o);
  AV.show(host, o); // SOG-0443 : après la section (qui peut s'arrêter, et arrêter avec elle le formulaire d'une autre mission)
}

/** La section « Suite de la mission » — pour TOUTE mission, avec ou sans tiroir (SOG-0459 : l'écran ne doit pas dire qu'une mission a
 *  une suite). La vue s'accroche au contrôleur de la mission (drawers_run.js attach) et le peint. */
function showDrawers(host, {
  ctx,
  id,
  mission,
  changed,
  pollMs,
  restMs,
  askSlot,
  readerHost
} = {}) {
  if (!host || !ctx || !id) {
    if (host) {
      host.hidden = true;
      host.innerHTML = '';
    }
    return stop();
  }
  if (W && W.id === id && W.ctx === ctx) { // la fiche redessinée : la même vue, un nouvel élément
    Object.assign(W, {
      host,
      onChanged: changed,
      askSlot,
      readerHost
    });
    RUN.attach(id, {
      ctx,
      mission,
      view: W,
      pollMs,
      restMs
    });
    bind(host);
    return paint(W);
  }
  stop();
  const w = W = {
    id,
    ctx,
    host,
    onChanged: changed, // la fiche à redessiner quand un tiroir s'ouvre (SOG-0448 : ses lieux apparaissent)
    askSlot, // où va « Demander la suite » (undefined : la place de la rangée des actions de la fiche ; null : nulle part)
    readerHost, // où s'accrochent l'enveloppe et la liseuse (undefined : la fiche ; null : pas de liseuse)
    tt: (row, vars) => ctx.t(row, vars),
    askBtn: null, // le bouton « Demander la suite » posé dans la place de la rangée des actions de la fiche
    restTimer: 0,
    restOpen: false,
    pastOpen: new Set(), // les messages d'« Avant » dépliés par le pilote (leurs clés) : gardés d'un dessin à l'autre
    // ce que le juge appelle : se repeindre, prévenir la fiche, remonter la section, rafraîchir la ligne « Position »
    paint: () => paint(w),
    changed: () => W === w && w.onChanged?.(),
    reveal: () => w.host?.scrollIntoView?.({
      block: 'start'
    }),
    tick: () => paintPos(w)
  };
  RUN.attach(id, {
    ctx,
    mission,
    view: w,
    pollMs,
    restMs
  });
  bind(host);
  paint(w);
}

/** Le téléphone (la fenêtre sous 760 px, matchMedia) : les gestes du bloc sont alors un pied collant. Décidé par la LARGEUR DE LA FENÊTRE, jamais par celle de
 *  l'hôte (dans la fiche à 1280 px le bloc est dans une colonne de moins de 760 px, et c'est un écran : les gestes restent dans le flux). Le changement de
 *  largeur de la fenêtre redessine le bloc (l'ordre des sections et le pied). */
const PHONE = typeof matchMedia === 'function' ? matchMedia('(max-width: 759px)') : null;
PHONE?.addEventListener?.('change', () => {
  if (W && W.narrow !== undefined && PHONE.matches !== W.narrow) paint(W);
});

/** L'écoute des gestes sur cet élément (une fois par élément : la fiche est redessinée avec lui). */
function bind(host) {
  if (host.dataset.dwBound) return;
  host.dataset.dwBound = '1';
  host.addEventListener('click', onClick);
  if (!document.getElementById('dwStyle')) {
    const st = document.createElement('style');
    st.id = 'dwStyle';
    st.textContent = STYLE;
    document.head.append(st);
  }
}

/** La ligne d'un tiroir OUVERT (SOG-0459 : un tiroir fermé n'a pas de ligne) : son titre, comment et quand, son message, son briefing,
 *  « Resceller » au niveau Complet. Ni rang ni numéro : rien ne dit ce qui reste à venir. Tout texte du fichier passe par esc. */
function rowHtml(w, c, s, withOnward = false) {
  const d = c.drawers.find(x => x.id === s.id) || {},
    onward = withOnward ? onwardOf(d) : '',
    t = describe(w.tt, s, d, {
      live: RUN.liveNow(c),
      notJudged: c.notJudged
    }),
    name = s.title ? `<b>${esc(s.title)}</b>` : '',
    brief = typeof d.brief === 'string' ? d.brief : '',
    cut = brief.length > BRIEF_CUT ? brief.slice(0, brief.lastIndexOf(' ', BRIEF_CUT) > BRIEF_CUT / 2 ? brief.lastIndexOf(' ', BRIEF_CUT) :
      BRIEF_CUT) : brief,
    canSeal = (w.ctx.level || 1) >= 3 && (s.mine || !s.by), // outil d'auteur (Complet) : ma propre ouverture, ou l'heure
    // l'ouverture d'un autre arrivée plus d'une minute après le fait : « reçu ici à … » (aucun délai n'est promis, il est dit)
    gotAt = s.by && !s.mine ? (Number.isFinite(s.gotAt) ? s.gotAt : c.gotNow?.[s.id]) : null,
    got = Number.isFinite(gotAt) && Number.isFinite(s.srcAt) && gotAt - s.srcAt > 60e3 ? ` — ${w.tt(TX.gotHere, { t: fmtZ(new Date(gotAt)) })}` : '';
  return `<div class="dw-row" data-dw="${esc(s.id)}" data-open="${esc(s.how)}"><div class="dw-top">${name}</div>
    <small class="f-muted dw-key" data-dw-how>${esc(t.how)}${esc(got)}${s.gone ? ` — ${esc(w.tt(TX.gone, { by: s.by }))}` : ''}</small>
    ${d.message || brief ? `<div class="dw-text" data-dw-text>${d.message ? `<p class="dw-msg" data-dw-msg>${esc(d.message)}</p>` : ''}${cut ? `<p data-dw-brief>${esc(cut)}${cut.length < brief.length ? '…' : ''}</p>` : ''}${cut.length < brief.length ? `<details class="ms-more" data-dw-more><summary class="f-muted">${esc(w.tt(TX.more))}</summary><p>${esc(brief.slice(cut.length))}</p></details>` : ''}</div>` : ''}
    ${onward ? `<p class="f-muted" data-dw-onward>${esc(w.tt(RD.TX.onward, { r: onward }))}</p>` : ''}
    ${canSeal ? `<div class="dw-acts"><button type="button" class="f-linkbtn" data-dw-seal="${esc(s.id)}">${esc(w.tt(TX.seal))}</button></div>` : ''}</div>`;
}

/** La suite de route d'un tiroir, en une ligne de noms (« PT2 → PT3 »), '' sans route. Les noms du fichier sont nettoyés (jamais un objet entier). */
function onwardOf(d) {
  const list = Array.isArray(d?.route) ? d.route.slice(0, 60) : [];
  return list.map(p => plain(p) ? clean(p.name) || clean(p.id) : clean(p)).filter(Boolean).join(' → ');
}

/** La ligne du débrief d'un posé de précision : « Tiroir 2 — atterrissage réussi (0,15 NM), à 19:20Z », suivie de « — BBB » pour un équipier. Les mots
 *  des paliers sont ceux du cadre (TIER_TEXT), la distance a deux décimales et le séparateur de la langue, l'heure est celle du fait. Tout texte
 *  du fichier (le trigramme) passe par esc. */
function debriefRow(w, l) {
  return `<div class="dw-row" data-dwd data-dwd-mine="${l.mine ? 1 : 0}"><small class="f-muted">${esc(debriefLine(w.tt, l))}</small></div>`;
}

/** La phrase de la ligne « Position » (SOG-0617, e) : la source et l'âge du dernier relevé quand la position en direct est reçue, sinon ce que
 *  l'absence de position change pour la suite de la mission. Rien d'autre : « Position perdue » est la phrase du cadre (SOG-0622). */
function posText(w, c) {
  const live = RUN.liveInfo(c);
  if (!live.tracking) return w.tt(TX.posNone);
  const age = Math.floor((Date.now() - Date.parse(live.at)) / 1000);
  return w.tt(TX.posLive, {
    source: live.source,
    n: Number.isFinite(age) ? Math.min(Math.max(age, 0), 9999) : 0
  });
}

/** La ligne « Position » se rafraîchit à chaque relevé, sans repeindre la section. */
function paintPos(w) {
  if (W !== w) return;
  const c = RUN.stateOf(w.id),
    p = w.host?.querySelector?.('[data-dw-pos]');
  if (c && p) {
    p.textContent = posText(w, c);
    p.toggleAttribute('data-dw-nopos', !RUN.liveInfo(c).tracking);
  }
}

/** « Demander la suite » dans la place que la fiche lui donne ([data-actslot] de sa rangée des actions, après « Préparer ce vol »), ou
 *  dans `askSlot` quand l'appelant la donne — pour MA mission seulement, avec ou sans tiroir ; retiré sinon. Hors d'une fiche (pas de
 *  place), pas de bouton. Seul NOTRE bouton est touché : la place peut en porter d'autres (le lot T3). Au repos : désactivé, réarmé par
 *  le minuteur du repos. */
function placeAsk(w, c) {
  const slot = (w.askSlot === undefined ? w.host.closest?.('.ms-sheet')?.querySelector('[data-actslot]') : w.askSlot) || null;
  if (!c.mine || !slot) {
    w.askBtn?.remove();
    w.askBtn = null;
    return;
  }
  let b = slot.querySelector(':scope > [data-dw-ask]');
  if (!b) {
    b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('data-dw-ask', '');
    slot.prepend(b);
  }
  if (w.askBtn && w.askBtn !== b) w.askBtn.remove();
  w.askBtn = b;
  b.onclick = onAsk;
  b.textContent = w.tt(TX.ask);
  const left = RUN.restLeft(w.id);
  b.disabled = left > 0;
  b.toggleAttribute('data-dw-rest', left > 0);
  b.setAttribute('aria-expanded', c.asking ? 'true' : 'false');
  clearTimeout(w.restTimer);
  // le seul minuteur de ce geste : il réarme la commande à la fin du repos (sans geste, jamais { gesture: true })
  if (left > 0) w.restTimer = setTimeout(() => W === w && paint(w), Math.min(left + 50, 2 ** 31 - 1));
}

/** Redessine la section (SOG-0459) : cachée et VIDE tant qu'aucun tiroir de MA mission n'est ouvert, que le panneau « Demander la
 *  suite » est fermé et que la ligne « Position » n'a rien à dire — pour toute mission, avec ou sans tiroir ; sinon la ligne « Position »
 *  (MA mission, vol démarré), le panneau, puis « Suite de la mission » et une ligne par tiroir ouvert. « data-mine » n'est posé que lorsqu'un
 *  tiroir ouvert est montré. */
function paint(w) {
  const c = RUN.stateOf(w.id);
  if (W !== w || !w.host || !c) return;
  clearTimeout(w.ansTimer);
  if (c.mine && c.flying) paintFlight(w, c);
  else paintLegacy(w, c);
}

/** La section hors vol, comme avant SOG-0619 : cachée et vide tant qu'aucun tiroir de MA mission n'est ouvert (SOG-0459), puis « Suite de la
 *  mission » et une ligne par tiroir ouvert ; « Demander la suite » dans la place de la rangée des actions de la fiche. */
function paintLegacy(w, c) {
  w.host.classList.remove('dw-flight');
  w.host.removeAttribute('data-narrow');
  w.actsEl?.remove(); // hors vol, les gestes du bloc ne sont nulle part : « Demander la suite » reprend sa place de la rangée (placeAsk)
  w.actsEl = null;
  const opened = c.mine && Array.isArray(c.states) ? c.states.filter(s => s.open) : [],
    rows = opened.map(s => rowHtml(w, c, s)),
    asking = c.mine && c.asking;
  w.host.hidden = !rows.length && !asking;
  // pour MA mission, un tiroir ouvert : la section prend la place de la ligne des zones de la première page (STYLE)
  w.host.toggleAttribute('data-mine', rows.length > 0);
  // le panneau : les mêmes mots et les mêmes éléments pour toute mission (aucun mot ne dépend des tiroirs)
  const box = asking ? `<div class="dw-ask" data-dw-askbox><p>${esc(w.tt(TX.askText))}</p><div class="dw-acts"><button type="button" class="primary" data-dw-ask-yes>${esc(w.tt(TX.askYes))}</button><button type="button" data-dw-ask-no>${esc(w.tt(TX.askNo))}</button></div></div>` : '';
  // sept lignes au plus, puis les suivantes repliées sous « {n} autres » (les ouverts seulement)
  const list = rows.length ? `<h3>${esc(w.tt(TX.head))}</h3><div class="dw-list" data-dw-list>${rows.slice(0, SEVEN).join('')}${rows.length > SEVEN ?
    `<details class="ms-more dw-rest" data-dw-rest${w.restOpen ? ' open' : ''}><summary class="f-muted">${esc(w.tt(TX.moreOpen, { n: rows.length - SEVEN }))}</summary><div class="dw-list">${rows.slice(SEVEN).join('')}</div></details>` : ''}</div>` : '';
  // le débrief : sous la suite, seulement s'il a au moins une ligne (donc après l'ouverture d'un tiroir) ; visible à tous les niveaux
  const lines = rows.length ? D.debriefOf(c.states) : [],
    debrief = lines.length ? `<h3 data-dw-debrief-head>${esc(w.tt(TX.debriefHead))}</h3><div class="dw-list" data-dw-debrief>${lines.map(l => debriefRow(w, l)).join('')}</div>` : '';
  w.host.innerHTML = box + list + debrief;
  const rest = w.host.querySelector('[data-dw-rest]');
  if (rest) rest.ontoggle = () => {
    if (W === w) w.restOpen = rest.open; // gardé à travers les dessins
  };
  placeAsk(w, c);
  reader(w, c, c.mine); // l'enveloppe et la liseuse : MA mission, avec ou sans tiroir (le secret : rien ne dépend des tiroirs)
}

/** Le bloc d'une mission EN VOL (SOG-0619), dans l'ordre de lecture : l'état en une ligne (en vol depuis, position) ; « Vient d'arriver » (une
 *  enveloppe par message ouvert et pas encore lu, le plus ancien d'abord : rien ne s'ouvre seul) ; « Maintenant » (le dernier message lu, entier,
 *  sa suite de route en une ligne ; sans message lu, l'ordre de mission) ; les deux gestes, toujours là, la réponse juste au-dessus ; « Avant » (les
 *  messages précédents repliés, le plus récent d'abord, le débrief comme un message, l'ordre de mission en dernier). Sur un TÉLÉPHONE (la fenêtre sous
 *  760 px, matchMedia : jamais la largeur du bloc, qui est dans une colonne étroite d'une fiche d'écran) : les gestes sont le PIED COLLANT du bloc, déclaré au cadre
 *  comme une barre fixe (data-f-foot : aucune note ne naît dessus) ; sur un écran ils restent dans le flux, sous « Maintenant ». */
function paintFlight(w, c) {
  const states = Array.isArray(c.states) ? c.states : [],
    unread = RUN.unreadOf(c),
    unreadIds = new Set(unread.map(s => s.id)),
    read = states.filter(s => s.open && !unreadIds.has(s.id)).sort((a, b) => a.at - b.at),
    last = read.at(-1) || null,
    narrow = w.narrow = !!PHONE?.matches,
    started = Date.parse(c.startIso || ''),
    hhmm = ms => fmtZ(new Date(ms));
  w.host.hidden = false;
  // l'accroche du style du bloc d'une mission en vol (le module sait « à moi et en vol » par son propre état : aucun signal à lui donner)
  w.host.classList.add('dw-flight');
  w.host.toggleAttribute('data-narrow', narrow);
  w.host.toggleAttribute('data-mine', read.length > 0 || unread.length > 0);
  // (1) l'état, une ligne
  // la ligne d'état : deux éléments côte à côte (flex-wrap, jamais un point médian qui reste seul au bout d'une ligne) ; « Pas de position » est un avertissement :
  // la couleur du texte, pas le gris d'aide
  const tracking = RUN.liveInfo(c).tracking,
    head = `<header class="dw-head" data-dw-head><h3>${esc(w.tt(TX.head))}</h3><p class="f-muted dw-state" data-dw-state><i></i>${Number.isFinite(started) ? `<span data-dw-since>${esc(w.tt(TX.inFlight, { t: hhmm(started) }))}</span>` : ''}<span data-dw-pos${tracking ? '' : ' data-dw-nopos'}>${esc(posText(w, c))}</span></p></header>`;
  // (2) ce qui vient d'arriver : une enveloppe par message pas encore lu ; rien de son texte avant le geste
  const arrived = unread.length ? `<section data-dw-arrived><p class="dw-kick">${esc(w.tt(TX.kArrived))}</p>${unread.map(s => `<div class="dw-env" data-dw-env="${esc(s.id)}"><div class="dw-shape" role="img" aria-label="${esc(w.tt(RD.TX.envelope))}"><span></span></div><div class="dw-what"><b>${esc(w.tt(TX.envMsg))}</b><span class="f-muted">${esc(w.tt(TX.envAt, { t: hhmm(s.at) }))}</span></div><button type="button" class="primary" data-dw-open="${esc(s.id)}">${esc(w.tt(RD.TX.envOpen))}</button></div>`).join('')}</section>` : '';
  // (3) maintenant : le dernier message lu, entier ; sans message lu, l'ordre de mission
  const view = pilotView(c.mission, read.map(s => s.id), {
      mine: true
    }),
    book = D.bookFor(D.readBook(c.doc, w.id), c.seance),
    orderHow = book?.readAt != null ? w.tt(TX.orderRead, {
      t: hhmm(book.readAt)
    }) : '',
    order = view?.summary ? `<h4 data-dw-order>${esc(w.tt(RD.TX.kOrder))}</h4>${orderHow ? `<div class="f-muted" data-dw-orderhow>${esc(orderHow)}</div>` : ''}<p>${esc(view.summary)}</p>` : '',
    now = `<section class="dw-now" data-dw-now><p class="dw-kick">${esc(w.tt(TX.kNow))}</p>${last ? rowHtml(w, c, last, true) : `${order}${w.readerHost === null || !order ? '' : `<button type="button" class="f-linkbtn" data-dw-readorder>${esc(w.tt(TX.readOrder))}</button>`}`}</section>`;
  // (4) ce que vous pouvez faire : les deux gestes côte à côte, la réponse contre eux
  const left = RUN.restLeft(w.id),
    ans = c.answer && Date.now() - c.answer.at < ANSWER_MS ? w.tt(TX[c.answer.key]) : '',
    box = c.asking ? `<div class="dw-ask" data-dw-askbox><p>${esc(w.tt(TX.askText))}</p><div class="dw-acts"><button type="button" class="primary" data-dw-ask-yes>${esc(w.tt(TX.askYes))}</button><button type="button" data-dw-ask-no>${esc(w.tt(TX.askNo))}</button></div></div>` : '',
    inner = `<p class="dw-kick">${esc(w.tt(TX.kDo))}</p>${box}<div class="dw-two"><button type="button" data-dw-seen>${esc(w.tt(TX.objSeen))}</button><button type="button" data-dw-ask${left > 0 ? ' disabled data-dw-rest' : ''} aria-expanded="${c.asking ? 'true' : 'false'}">${esc(w.tt(TX.ask))}</button></div>${ans ? `<p class="dw-answer" data-dw-answer role="status">${esc(ans.endsWith('.') ? ans : `${ans}.`)}</p>` : ''}`,
    // UN SEUL pied collant à la fois (SOG-0619, l'ergonome) : dans la FICHE d'un téléphone, la place [data-actslot] de la rangée des actions (askSlot) porte les gestes — le
    // pied de la fiche est alors le seul pied, le bloc n'a pas le sien ; dans le volet (askSlot null) ou sans place, le bloc garde son pied collant, déclaré au cadre
    // (data-f-foot) ; sur un écran, les gestes restent dans le flux du bloc, sous « Maintenant ». Jamais à deux endroits.
    slot = narrow ? gestureSlot(w) : null,
    acts = slot ? '' : `<section class="dw-acts" data-dw-acts${narrow ? ' data-f-foot' : ''}>${inner}</section>`;
  if (slot) {
    if (!w.actsEl || w.actsEl.parentElement !== slot) {
      w.actsEl?.remove();
      w.actsEl = document.createElement('div');
      w.actsEl.setAttribute('data-dw-acts', '');
      w.actsEl.addEventListener('click', onClick);
      slot.append(w.actsEl);
    }
    w.actsEl.innerHTML = inner;
  } else {
    w.actsEl?.remove();
    w.actsEl = null;
  }
  // (5) avant : les messages lus précédents, repliés, le plus récent d'abord ; le débrief y prend sa place comme un message ; l'ordre de mission en dernier
  const before = read.slice(0, -1).map(s => ({
      key: `d:${s.id}`,
      at: s.at,
      title: s.title || w.tt(TX.envMsg),
      body: rowHtml(w, c, s, true)
    })),
    lines = D.debriefOf(c.states).map(l => ({
      key: `b:${l.at}`,
      at: l.at,
      title: w.tt(TX.debriefHead),
      body: debriefRow(w, l)
    })),
    rows = [...before, ...lines].sort((a, b) => b.at - a.at);
  if (last && view?.summary) rows.push({
    key: 'order',
    at: book?.readAt ?? null,
    title: w.tt(RD.TX.kOrder),
    body: `<p>${esc(view.summary)}</p>`
  });
  const past = rows.length ? `<section class="dw-past" data-dw-past><p class="dw-kick">${esc(w.tt(TX.kPast))}</p>${rows.map(r => `<details class="dw-fold" data-dw-before="${esc(r.key)}"${w.pastOpen?.has(r.key) ? ' open' : ''}><summary><span class="t">${esc(r.title)}</span><span class="h">${r.at != null ? esc(hhmm(r.at)) : ''}</span></summary>${r.body}</details>`).join('')}</section>` : '';
  w.host.innerHTML = head + arrived + now + (narrow ? past + acts : acts + past);
  // un message d'« Avant » déplié le reste à travers les dessins (un passage, un relevé, la fiche redessinée) : sinon son « Resceller » se cachait
  for (const d of w.host.querySelectorAll('[data-dw-before]')) d.ontoggle = () => {
    if (W !== w) return;
    w.pastOpen ??= new Set();
    if (d.open) w.pastOpen.add(d.dataset.dwBefore);
    else w.pastOpen.delete(d.dataset.dwBefore);
  };
  w.askBtn?.remove(); // la rangée des actions de la fiche n'a plus « Demander la suite » : les gestes sont dans le bloc
  w.askBtn = null;
  clearTimeout(w.restTimer);
  // les deux seuls minuteurs de ce bloc : la fin du repos (la commande se réarme) et la fin de la réponse affichée (sans geste, jamais { gesture: true })
  if (left > 0) w.restTimer = setTimeout(() => W === w && paint(w), Math.min(left + 50, 2 ** 31 - 1));
  if (ans) w.ansTimer = setTimeout(() => W === w && paint(w), Math.max(50, ANSWER_MS - (Date.now() - c.answer.at) + 50));
  reader(w, c, true);
}

/** La place des gestes de la fiche d'un téléphone : `askSlot` (par défaut [data-actslot] de la fiche) ; null sans place (le volet, ou une section hors fiche). */
function gestureSlot(w) {
  return (w.askSlot === undefined ? w.host.closest?.('.ms-sheet')?.querySelector('[data-actslot]') : w.askSlot) || null;
}

const ANSWER_MS = 60e3; // la réponse d'un geste reste affichée une minute (celle du repos de « Demander la suite »)

/** L'enveloppe et la liseuse de MA mission (lot T3, reader_view.js) : posées avec la section, retirées pour une mission qui n'est pas
 *  la mienne. La liseuse ne reçoit que la mission passée par pilotView — rien d'un tiroir fermé. `readerHost` : où elles s'accrochent (par
 *  défaut la fiche ; `null` : nulle part, le volet du pilote est déjà le Brief). */
function reader(w, c, full) {
  const sheet = full ? (w.readerHost === undefined ? w.host.closest('.ms-sheet') : w.readerHost) : null;
  if (!sheet || !c.mission) return RD.detach();
  // SOG-0619 : un message arrivé et pas encore lu n'a PAS de page (rien de son texte avant « Ouvrir l'enveloppe ») : la liseuse le voit fermé
  const unread = new Set(RUN.unreadOf(c).map(s => s.id)),
    states = Array.isArray(c.states) ? c.states.map(s => unread.has(s.id) ? {
      ...s,
      open: false
    } : s) : c.states,
    opened = states?.filter?.(s => s.open).map(s => s.id) || [],
    view = pilotView(c.mission, opened, {
      mine: true
    }),
    flight = !!c.flying,
    ans = c.answer && Date.now() - c.answer.at < ANSWER_MS ? w.tt(TX[c.answer.key]) : '';
  RD.attach(sheet, {
    ctx: w.ctx,
    id: w.id,
    view,
    states,
    // les deux gestes et le compte des nouveaux messages, dans le pied fixe de la liseuse (en vol seulement)
    foot: flight ? {
      seen: w.tt(TX.objSeen),
      ask: w.tt(TX.ask),
      askText: w.tt(TX.askText),
      yes: w.tt(TX.askYes),
      no: w.tt(TX.askNo),
      asking: !!c.asking,
      rest: RUN.restLeft(w.id) > 0,
      answer: ans ? (ans.endsWith('.') ? ans : `${ans}.`) : '',
      news: unread.size ? (unread.size === 1 ? w.tt(TX.newOne) : w.tt(TX.newMany, {
        n: unread.size
      })) : '',
      onSeen: () => RUN.objectSeen(w.id),
      onAsk: () => RUN.ask(w.id),
      onYes: () => RUN.answer(w.id),
      onNo: () => RUN.cancelAsk(w.id)
    } : null,
    line: c.line ? {
      ...c.line,
      pilot: c.me
    } : null,
    // l'enveloppe : seulement pour une mission AFFECTÉE que ce pilote n'a pas encore lue dans cette séance
    unread: !!c.seance?.assigned && D.bookFor(D.readBook(c.doc, w.id), c.seance)?.readAt == null,
    how: s => describe(w.tt, s, c.drawers.find(d => d.id === s.id), {
      live: RUN.liveNow(c),
      notJudged: c.notJudged
    }).how,
    routeNm: lengthOf(view),
    onRead: () => RUN.markRead(w.id)
  });
}

/** La longueur du trajet que le pilote peut voir, en NM ; null si elle ne se calcule pas (le dessin de la section ne lève jamais). */
function lengthOf(view) {
  try {
    return routeNm(view);
  } catch {
    return null;
  }
}

/** « Demander la suite » touché : le panneau s'ouvre (rien n'est écrit). Au repos, ou pour une mission qui n'est pas la mienne : rien. */
function onAsk(e) {
  const w = W;
  e?.stopPropagation?.();
  if (!w || !RUN.ask(w.id)) return;
  (w.actsEl?.querySelector('[data-dw-ask-yes]') || w.host.querySelector('[data-dw-ask-yes]'))?.focus?.();
}

/** Les gestes de la section : « Demander » et « Pas maintenant » du panneau, « Resceller » (niveau Complet). */
async function onClick(e) {
  const w = W,
    b = e.target.closest?.(
      '[data-dw-ask-yes],[data-dw-ask-no],[data-dw-seal],[data-dw-ask],[data-dw-seen],[data-dw-open],[data-dw-readorder]');
  if (!w || !b || !(w.host.contains(b) || w.actsEl?.contains(b))) return;
  e.stopPropagation();
  if (b.hasAttribute('data-dw-open')) return RUN.markDrawerRead(w.id, b.dataset.dwOpen); // « Ouvrir l'enveloppe » d'un message arrivé
  if (b.hasAttribute('data-dw-seen')) return RUN.objectSeen(w.id); // « Objet en vue »
  if (b.hasAttribute('data-dw-readorder')) return RD.openReader(); // « Lire l'ordre de mission »
  if (b.hasAttribute('data-dw-ask')) return onAsk(e); // « Demander la suite » du bloc : le panneau s'ouvre dans la zone des gestes
  if (b.hasAttribute('data-dw-ask-no')) return RUN.cancelAsk(w.id); // « Pas maintenant » : le panneau se ferme, sans repos
  if (b.hasAttribute('data-dw-ask-yes')) return RUN.answer(w.id);
  return RUN.seal(w.id, b.dataset.dwSeal);
}
