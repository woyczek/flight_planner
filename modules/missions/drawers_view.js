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
[data-drawers] .dw-text{margin:6px 0 0;overflow-wrap:anywhere}
[data-drawers] .dw-text p{margin:.4em 0;white-space:pre-wrap}
[data-drawers] .dw-msg{border-left:3px solid var(--sog-border);padding-left:8px}
[data-drawers] [data-dw-pos]{margin:0 0 8px}`;
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
function rowHtml(w, c, s) {
  const d = c.drawers.find(x => x.id === s.id) || {},
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
    ${canSeal ? `<div class="dw-acts"><button type="button" class="f-linkbtn" data-dw-seal="${esc(s.id)}">${esc(w.tt(TX.seal))}</button></div>` : ''}</div>`;
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
    p = w.host?.querySelector?.(':scope > [data-dw-pos]');
  if (c && p) p.textContent = posText(w, c);
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
  const opened = c.mine && Array.isArray(c.states) ? c.states.filter(s => s.open) : [],
    rows = opened.map(s => rowHtml(w, c, s)),
    asking = c.mine && c.asking,
    pos = c.mine && c.flying ? `<p class="f-muted" data-dw-pos>${esc(posText(w, c))}</p>` : '';
  w.host.hidden = !rows.length && !asking && !pos;
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
  w.host.innerHTML = pos + box + list + debrief;
  const rest = w.host.querySelector('[data-dw-rest]');
  if (rest) rest.ontoggle = () => {
    if (W === w) w.restOpen = rest.open; // gardé à travers les dessins
  };
  placeAsk(w, c);
  reader(w, c, c.mine); // l'enveloppe et la liseuse : MA mission, avec ou sans tiroir (le secret : rien ne dépend des tiroirs)
}

/** L'enveloppe et la liseuse de MA mission (lot T3, reader_view.js) : posées avec la section, retirées pour une mission qui n'est pas
 *  la mienne. La liseuse ne reçoit que la mission passée par pilotView — rien d'un tiroir fermé. `readerHost` : où elles s'accrochent (par
 *  défaut la fiche ; `null` : nulle part, le volet du pilote est déjà le Brief). */
function reader(w, c, full) {
  const sheet = full ? (w.readerHost === undefined ? w.host.closest('.ms-sheet') : w.readerHost) : null;
  if (!sheet || !c.mission) return RD.detach();
  const opened = c.mine && Array.isArray(c.states) ? c.states.filter(s => s.open).map(s => s.id) : [],
    view = pilotView(c.mission, opened, {
      mine: true
    });
  RD.attach(sheet, {
    ctx: w.ctx,
    id: w.id,
    view,
    states: c.states,
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
  w.host.querySelector('[data-dw-ask-yes]')?.focus?.();
}

/** Les gestes de la section : « Demander » et « Pas maintenant » du panneau, « Resceller » (niveau Complet). */
async function onClick(e) {
  const w = W,
    b = e.target.closest?.('[data-dw-ask-yes],[data-dw-ask-no],[data-dw-seal]');
  if (!w || !b || !w.host.contains(b)) return;
  e.stopPropagation();
  if (b.hasAttribute('data-dw-ask-no')) return RUN.cancelAsk(w.id); // « Pas maintenant » : le panneau se ferme, sans repos
  if (b.hasAttribute('data-dw-ask-yes')) return RUN.answer(w.id);
  return RUN.seal(w.id, b.dataset.dwSeal);
}
