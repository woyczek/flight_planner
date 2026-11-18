// V3 missions — la section « Suite de la mission » de la fiche d'une mission (SOG-0441, lot T2 ; SOG-0459) : l'écran et ses gestes. Le
// calcul est dans drawers.js (pur) ; ce fichier lit et écrit par le cadre (ctx.data), ne touche à aucun autre document que :
//   · le carnet de CE pilote, pilot/<TRI>/missions/<ID>.json (écrit : le geste « Demander la suite », un constat, le départ réel du vol) ;
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
// API : show(host, { ctx, id, mission, passage, notJudged, changed, pollMs, restMs }) — pose la section dans `host` (l'élément
//   [data-drawers] de la fiche, redessiné avec elle : rappeler show à chaque dessin) ; passage(pointId) et notJudged(key) viennent de
//   frame/lib/mission.js (passageMin, notJudgedYet) ; restMs : le repos de « Demander la suite » (une minute ; un banc le raccourcit) ;
//   stop() — la fiche se ferme, le module se démonte.
//   describe(tt, state, drawer, { live, notJudged, inRange }) → { key, note, how, follow } : les phrases d'un tiroir (la clé d'un tiroir fermé, la note
//   « pas encore jugé en vol » ou « sans position en direct », comment et quand il s'est ouvert) — pur : l'aperçu de l'éditeur peut
//   s'en servir pour dire la même chose que l'écran du pilote. TX : les textes, quatre langues.
//   sees(id, mission) → ce que la fiche et son Détail montrent de cette mission (SOG-0448) : pilotView du lecteur, avec les tiroirs
//   que la section posée sait ouverts — rien d'ouvert tant qu'elle n'a pas lu, la partie visible seule pour une mission qui n'est pas
//   la mienne. show() reçoit `changed` : rappelé quand ce que sees() a rendu n'est plus à jour (un tiroir s'ouvre) — la fiche se redessine.

import * as D from './drawers.js';
import * as AV from './assign_view.js'; // SOG-0443 : « Affecter… » dans la rangée de la fiche, appelé à chaque dessin (show) et par stop()
import {
  fmtZ
} from '../../frame/lib/time.js';
import {
  pilotView
} from '../../frame/lib/mission.js'; // ce que le pilote peut voir : la règle du lecteur, écrite une fois (SOG-0448)

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
  nothing: ['Rien de nouveau pour l\'instant', 'Nothing new for now', 'Vorerst nichts Neues', 'Nada nuevo por ahora'],
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
  // les notifications (SOG-0459 : ni numéro ni rang ; un refus d'un autre carnet n'est plus dit — il dirait qu'une suite existe)
  nowOpen: ['Suite de la mission : {title}', 'Rest of the mission: {title}', 'Fortsetzung der Mission: {title}',
    'Continuación de la misión: {title}'
  ],
  // une écriture refusée par le cadre : dite sans nommer de tiroir
  noWrite: ['La demande n\'a pas pu être enregistrée : {e}', 'The request could not be saved: {e}',
    'Die Anfrage konnte nicht gespeichert werden: {e}',
    'No se pudo guardar la solicitud: {e}'
  ],
  noTrigram: ['aucun trigramme sur cet appareil', 'no trigram on this device', 'kein Trigramm auf diesem Gerät',
    'ningún trigrama en este dispositivo'
  ]
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
[data-drawers] .dw-msg{border-left:3px solid var(--sog-border);padding-left:8px}`;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
export const POLL_MS =
  10e3; // un passage de synchronisation toutes les dix secondes pendant qu'un tiroir est attendu, page visible (SOG-0463 : 60 s auparavant ; 10 s et non 5 pour le plafond de 80 requêtes par minute sans lanceur)
const REST_MS = 60e3; // « Demander la suite » se repose une minute après chaque réponse
// le repos de « Demander la suite », par mission : l'instant où la commande se réarme (rouvrir la fiche ne le remet pas à zéro)
const REST = new Map();
let V = null; // la section posée : une fiche à la fois
let SHOWN = null; // { id, key } : ce que sees() a rendu à la fiche au dernier dessin (à qui est la mission, quels tiroirs sont ouverts)
const REPUB_MS = 15 * 60e3; // le document « ouverts » est récrit au moins tous les quarts d'heure tant que la section calcule (son heure)

/** À qui est la mission et quels tiroirs sont ouverts, en un mot comparable. */
const pubKey = (mine, opened) => `${mine ? 1 : 0}:${opened.join('')}`;
/** Ce que la section posée sait : la mission est-elle la mienne (et lue), quelles lettres sont ouvertes. */
const known = v => {
  const mine = !!v && v.mine === true && Array.isArray(v.states);
  return {
    mine,
    opened: mine ? v.states.filter(s => s.open).map(s => s.id) : []
  };
};

/** Ce que la fiche et son Détail montrent de cette mission (voir l'en-tête) : la mission lue passée par pilotView. Pur à l'état de la
 *  section près ; null pour une mission illisible. */
export function sees(id, mission) {
  const k = known(V && V.id === id ? V : null);
  SHOWN = {
    id,
    key: pubKey(k.mine, k.opened)
  };
  return pilotView(mission, k.opened, {
    mine: k.mine
  });
}

/** Après un calcul : le document « ouverts » de l'appareil (écrit quand il change, ou que son heure a un quart d'heure), puis la fiche
 *  prévenue si ce que sees() lui a rendu n'est plus à jour. Une mission qui n'est pas la mienne n'écrit que pour défaire un document
 *  qui la disait mienne (`old` : le document relu, quand il vient d'être lu). */
function publish(v, old = null) {
  const k = known(v),
    key = `${pubKey(k.mine, k.opened)}:${k.mine ? v.seance?.key ?? '' : ''}`,
    path = D.openPath(v.id),
    now = Date.now(),
    due = k.mine ? v.pub?.key !== key || now - v.pub.at > REPUB_MS : D.readOpen(old, v.id).mine,
    doc = due && path ? D.openAfter(v.states, {
      mission: v.id,
      mine: k.mine,
      seance: v.seance
    }, now) : null;
  if (doc) {
    v.pub = {
      key,
      at: now
    };
    Promise.resolve().then(() => v.ctx.data.put(path, doc)).catch(() => {});
  }
  // la fiche est prévenue UNE fois par état (une fiche qui ne se redessine pas n'est pas rappelée à chaque calcul)
  const shown = pubKey(k.mine, k.opened);
  if (SHOWN?.id !== v.id || SHOWN.key === shown) v.told = null;
  else if (v.told !== shown) {
    v.told = shown;
    v.changed?.();
  }
}

/** La fiche se ferme ou le module se démonte : minuteurs et écoute arrêtés, « Demander la suite » retiré de la rangée de la fiche. */
export function stop() {
  AV.stop(); // SOG-0443 : « Affecter… » et son formulaire retirés avec la section
  if (!V) return;
  clearTimeout(V.dueTimer);
  clearTimeout(V.restTimer);
  clearInterval(V.poll);
  V.askBtn?.remove();
  V.unwatch?.();
  V.unlive?.();
  document.removeEventListener('visibilitychange', onVisible);
  V = null;
}

/** Pose la section « Suite de la mission » dans host (voir l'en-tête), puis « Affecter… » dans la rangée de la fiche (SOG-0443,
 *  assign_view.js : pour toute mission lue, au niveau Courant et au-delà). */
export function show(host, o = {}) {
  showDrawers(host, o);
  AV.show(host, o); // SOG-0443 : après la section (qui peut s'arrêter, et arrêter avec elle le formulaire d'une autre mission)
}

/** La section « Suite de la mission » — pour TOUTE mission, avec ou sans tiroir (SOG-0459 : l'écran ne doit pas dire qu'une mission a
 *  une suite). passage(pointId) : le temps estimé jusqu'à un lieu (frame/lib/mission.js). */
function showDrawers(host, {
  ctx,
  id,
  mission,
  passage,
  notJudged,
  changed,
  pollMs,
  restMs
} = {}) {
  const drawers = (Array.isArray(mission?.drawers) ? mission.drawers : []).filter(d => D.LETTERS.includes(d?.id)).slice(0, D.LETTERS
    .length);
  if (!host || !ctx || !id) {
    if (host) {
      host.hidden = true;
      host.innerHTML = '';
    }
    return stop();
  }
  if (V && V.id === id && V.ctx === ctx) { // la fiche redessinée : le même état, un nouvel élément
    Object.assign(V, {
      host,
      drawers,
      passage,
      notJudged,
      changed
    });
    bind(host);
    return paint();
  }
  stop();
  const v = V = {
    id,
    ctx,
    host,
    drawers,
    passage,
    notJudged,
    changed, // la fiche à redessiner quand un tiroir s'ouvre (SOG-0448 : ses lieux apparaissent)
    pub: null, // { key, at } : le dernier document « ouverts » écrit
    pollMs: Number.isFinite(pollMs) && pollMs >= 100 ? pollMs : POLL_MS, // la période du passage (un banc la raccourcit)
    restMs: Number.isFinite(restMs) && restMs >= 100 ? restMs : REST_MS, // le repos de « Demander la suite » (un banc le raccourcit)
    tt: (row, vars) => ctx.t(row, vars),
    mine: false,
    states: null, // null : pas encore lu (la section reste cachée et vide en attendant)
    asking: false, // le panneau « Demander la suite » est ouvert
    askBtn: null, // le bouton « Demander la suite » posé dans la place de la rangée des actions de la fiche
    said: new Set(), // les ouvertures déjà notifiées
    first: true, // le premier calcul : aucune notification pour ce qui était déjà ouvert
    flying: false, // le vol démarré de CETTE mission est en cours : une position en direct est la sienne
    prevFix: null, // le relevé d'avant : le trajet jugé va de lui au relevé reçu
    inRange: null, // { id, f, seen, source } : le dernier trajet à portée de l'objet du premier tiroir fermé (« Demander » s'en sert)
    caught: new Set(), // les tiroirs dont la trace gardée a déjà été relue (une fois par tiroir)
    wasLive: false, // la position en direct au dernier relevé : son arrivée fait relire la section
    busy: false // un constat est en cours d'écriture
  };
  bind(host);
  paint();
  document.addEventListener('visibilitychange', onVisible);
  load(v).then(() => {
    if (V !== v) return;
    // un carnet (le mien sur un autre appareil, celui d'un autre) ou le vol changé par une synchronisation : relu
    v.unwatch = ctx.data.watch?.('pilot/', paths => V === v && [].concat(paths || []).some(p => v.paths?.has(p)) && load(v));
    // la position en direct : UN abonnement du cadre (ctx.live.watch, un relevé toutes les cinq secondes), jamais un minuteur ici ;
    // le démontage du module désabonne de lui-même, stop() aussi
    // (une mission sans tiroir n'a rien à suivre : pas d'abonnement — sans effet à l'écran)
    v.prevFix = ctx.live?.last || null; // le dernier relevé du cadre : le premier relevé reçu est jugé depuis lui
    v.unlive = v.drawers.length ? ctx.live?.watch?.(fix => onFix(v, fix)) : null;
  });
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

/** Lit ce qu'il faut (affectations, vol, carnets, « vu »), calcule l'état, écrit ce qui doit l'être, redessine et arme les minuteurs. */
async function load(v) {
  const data = v.ctx.data,
    get = p => Promise.resolve().then(() => data.get(p)).catch(() => null),
    myPath = D.bookPath(v.ctx.identity?.trigram, v.id),
    // le trigramme VALIDÉ par bookPath (rogné, trois lettres), jamais celui de l'identité tel quel : tous les chemins partent de lui
    // (relecture de Sécurisation, 17/11 : « ABC » suivi d'un blanc donnait un chemin de vol « pilot/ABC /… »)
    me = myPath ? myPath.split('/')[1] : '',
    flightPath = myPath ? `pilot/${me}/current_flight.json` : null,
    [idx, flight] = await Promise.all([get('missions/affectations.json'), flightPath ? get(flightPath) : null]);
  if (V !== v) return;
  const seance = D.seanceOf({
      mission: v.id,
      me,
      lines: idx?.assignments,
      flight
    }),
    playing = !!flight && typeof flight === 'object' && String(flight.mission || '').toUpperCase() === v.id;
  v.mine = !!myPath && (seance.assigned || playing);
  if (!v.mine) {
    v.states = [];
    paint();
    // un document « ouverts » qui disait cette mission mienne (une affectation retirée) est défait
    const path = D.openPath(v.id),
      old = path ? await get(path) : null;
    if (V === v) publish(v, old);
    return;
  }
  const peers = seance.crew.filter(p => p !== me),
    seenPath = `cache/missions/seen_${v.id}.json`;
  let [doc, seenDoc, ...theirs] = await Promise.all([get(myPath), get(seenPath), ...peers.map(p => get(D.bookPath(p, v.id)))]);
  if (V !== v) return;
  v.paths = new Set([myPath, flightPath, ...peers.map(p => D.bookPath(p, v.id))]);
  // le départ réel du vol de cette mission : la référence d'heure de la séance, écrite une fois au carnet — pour une mission À TIROIRS
  // seulement (SOG-0459, relecture : le secret est un secret d'écran ; pas un fichier de plus au dépôt pour chaque vol)
  const startAt = playing ? Date.parse(flight.started?.at || '') : NaN;
  if (v.drawers.length && Number.isFinite(startAt) && D.bookFor(D.readBook(doc, v.id), seance)?.startAt !== startAt) {
    const next = D.withStart(doc, {
      mission: v.id,
      me,
      seance
    }, startAt);
    if (next && await put(v, myPath, next)) doc = next;
    if (V !== v) return;
  }
  Object.assign(v, {
    me,
    seance,
    myPath,
    doc,
    flying: Number.isFinite(startAt),
    startIso: Number.isFinite(startAt) ? flight.started.at : ''
  });
  const seen = D.readSeen(seenDoc, seance),
    before = v.states,
    states = D.stateOf(v.drawers, {
      me,
      seance,
      book: D.readBook(doc, v.id),
      others: peers.map((pilot, i) => ({
        pilot,
        book: D.readBook(theirs[i], v.id)
      })),
      seen,
      now: Date.now(),
      passage: v.passage
    });
  v.states = states;
  // ce que l'appareil garde : les ouvertures des autres déjà vues (une écriture qui ne change rien n'est pas faite par le cadre)
  const at = Date.now(),
    keep = D.seenAfter(seen, states, seance, at);
  // la première fois qu'une ouverture d'un autre est vue : son heure de réception est celle de ce calcul (gardée dans « vu »)
  v.gotNow = Object.fromEntries(states.filter(x => x.open && x.by && !x.mine && !Number.isFinite(x.gotAt)).map(x => [x.id, v.gotNow?.[x
    .id
  ] ?? at]));
  if (keep && Object.keys(keep.drawers).length) Promise.resolve().then(() => data.put(seenPath, keep)).catch(() => {});
  announce(v, before, states);
  paint();
  arm(v, peers.length);
  publish(v); // SOG-0448 : les tiroirs ouverts publiés sur l'appareil, la fiche prévenue
  // le rattrapage au retour de la page : le premier tiroir fermé que l'appareil suit est relu UNE fois sur la trace gardée du vol de
  // cette mission (depuis l'instant où il est devenu le premier fermé) — la trace d'un autre vol n'est jamais lue
  const first = states.find(x => !x.open && !x.locked);
  if (first && followsHere(v, first) && !v.caught.has(first.id)) {
    v.caught.add(first.id);
    const trail = v.ctx.live?.trail?.(),
      f = trail && trail.from === v.startIso ? D.catchUp(first.key, trail, first.since) : null;
    if (f) record(v, first.id, f, 'trail').catch(() => {});
  }
}

/** L'appareil a-t-il une position en direct qui est celle du vol de cette mission ? */
const liveNow = v => v.flying && v.ctx.live?.status === 'tracking';

/** Ce tiroir (le premier fermé) est-il suivi par cet appareil, maintenant ? Une clé que drawers.js sait juger, que le lecteur ne dit
 *  pas « pas encore jugée en vol », un tiroir que je n'ai pas rescellé, et une position en direct. */
function followsHere(v, st) {
  const d = v.drawers.find(x => x.id === st.id);
  return liveNow(v) && !st.sealed && judgedKey(st.key, v.notJudged) && d?.keyWhy !== 'condition';
}

/** Cette clé se juge-t-elle avec une position en direct ? drawers.js fait foi pour une condition de l'atelier (SOG-0500 : le lecteur,
 *  `notJudgedYet`, les dit encore toutes « pas encore jugées ») ; le lecteur garde le dernier mot pour les autres clés. */
const judgedKey = (key, notJudged) => D.follows(key) && (key.kind === 'condition' || !notJudged?.(key));

/** Un relevé de la position en direct (toutes les cinq secondes) : le trajet depuis le relevé d'avant est jugé pour le premier
 *  tiroir fermé. Ne lève jamais (un abonné qui rejette n'est pas attrapé par le cadre). */
function onFix(v, fix) {
  if (V !== v) return;
  const live = liveNow(v),
    turned = live !== v.wasLive,
    // deux relevés à plus d'une minute l'un de l'autre (ou sans heure) ne font pas un trajet : le relevé est jugé seul, et ce qui
    // s'est passé entre les deux est l'affaire du rattrapage sur la trace
    gap = Date.parse(fix?.at) - Date.parse(v.prevFix?.at),
    prev = gap >= 0 && gap <= D.LEG_MS ? v.prevFix : null;
  v.prevFix = fix;
  v.wasLive = live;
  // la position en direct vient d'arriver (ou de se taire) : la section est relue — sa note le dit, la trace gardée est rattrapée
  (turned && v.mine ? load(v) : Promise.resolve()).then(() => judge(v, prev, fix)).catch(() => {});
}

/** Juge un trajet : un constat de zone, d'arrivée ou d'atterrissage (tenu par holding, v.hold) s'écrit tout de suite au carnet ; un objet à portée attend « Demander » (tenu dans
 *  v.inRange, rien n'est peint : l'écran ne dit pas qu'un objet est attendu). */
async function judge(v, prev, fix) {
  if (!v.mine || !v.states || v.busy) return;
  const first = v.states.find(x => !x.open && !x.locked),
    here = !!first && followsHere(v, first);
  let f = null;
  if (here && D.howOf(first.key) === 'landing') { // un atterrissage se tient : l'état de la tenue est gardé par tiroir
    const r = D.holding(first.key, v.hold?.id === first.id ? v.hold.hold : null, fix);
    v.hold = {
      id: first.id,
      hold: r.hold
    };
    f = r.f;
  } else {
    v.hold = null;
    if (here) f = D.finding(first.key, prev, fix, {
      trail: v.ctx.live?.trail?.()
    });
  }
  if (!f) { // plus à portée depuis une minute : « Demander » ne l'ouvre plus
    if (v.inRange && (!first || v.inRange.id !== first.id || Date.now() - v.inRange.seen > RANGE_MS)) v.inRange = null;
    return;
  }
  if (f.confirm) {
    v.inRange = {
      id: first.id,
      f,
      seen: Date.now(),
      source: fix?.source
    };
    return;
  }
  await record(v, first.id, f, fix?.source);
}

/** Écrit un constat (ses deux relevés, l'heure du fait) dans le carnet de ce pilote, redessine et demande un passage. */
async function record(v, id, f, source) {
  if (V !== v || v.busy) return;
  v.busy = true;
  try {
    const next = D.withOpen(v.doc, {
      mission: v.id,
      me: v.me,
      seance: v.seance,
      now: Date.now()
    }, id, f.how, {
      from: f.from,
      to: f.to,
      at: f.at,
      source: f.source || source
    });
    if (!next || !await put(v, v.myPath, next) || V !== v) return;
    v.inRange = null;
    await load(v);
    Promise.resolve().then(() => v.ctx.data.sync?.()).catch(() => {});
  } finally {
    v.busy = false;
  }
}

/** La notification flottante d'un tiroir qui vient de s'ouvrir, une fois : « Suite de la mission : {title} » (SOG-0459 : sans numéro,
 *  et rien pour une ouverture d'un autre carnet qui n'est pas retenue — la dire, ce serait dire qu'une suite existe). */
function announce(v, before, states) {
  for (const s of states) {
    const was = (before || []).find(x => x.id === s.id);
    if (s.open && !v.first && was && !was.open && !v.said.has(`open:${s.id}`)) {
      v.said.add(`open:${s.id}`);
      v.ctx.notify?.(v.tt(TX.nowOpen, {
        title: s.title
      }), 'ok');
    }
  }
  v.first = false;
}

/** Le minuteur de la prochaine échéance (celle du premier tiroir fermé), et le passage de synchronisation BORNÉ qui apporte les carnets
 *  des autres (décision de l'ergonome, 17/11) : toutes les dix secondes, seulement pendant que le premier tiroir fermé est ATTENDU (une clé jugée
 *  en vol : le constat d'un autre peut l'ouvrir à tous — ni l'heure ni le geste) ET que la section est à l'écran (page visible) ET que
 *  la mission a d'autres pilotes (douze au plus, seanceOf) ; il s'arrête à l'ouverture (arm est rappelé à chaque calcul). */
function arm(v, peers) {
  clearTimeout(v.dueTimer);
  clearInterval(v.poll);
  v.poll = 0;
  // l'ordre : seul le PREMIER tiroir fermé peut s'ouvrir — son échéance arme le minuteur, sa clé dit s'il est attendu
  const first = v.states.find(s => !s.open && !s.locked),
    next = first && first.dueAt != null && !first.sealed ? first.dueAt : NaN;
  if (Number.isFinite(next)) v.dueTimer = setTimeout(() => V === v && load(v), Math.min(Math.max(next - Date.now(), 0) + 500, 2 ** 31 - 1));
  const awaited = !!first && !!first.key?.kind && first.key.kind !== 'time' && first.key.kind !== 'hand';
  if (awaited && peers) v.poll = setInterval(() => pass(v), v.pollMs);
}

/** Un passage de synchronisation puis la relecture des carnets ; rien quand la page est cachée (onglet caché, appareil en veille : la
 *  relecture est en PAUSE — décision de l'ergonome, 17/11 à 19 h 32) ou que la section n'est plus à l'écran. */
async function pass(v) {
  if (V !== v || !v.poll || document.visibilityState === 'hidden' || !v.host?.isConnected) return;
  // un PASSAGE de synchronisation, pas une simple relecture : sur un poste avec lanceur, relire (revalidate) ne déclenche pas
  // l'échange avec le dépôt — mesuré au banc à deux appareils le 17/11 : l'ouverture d'un autre n'arrivait qu'au passage de fond
  // (dix minutes) ; avec un passage, elle arrive à la période du passage (le passage lui-même : une demi-seconde sur un dépôt local).
  // Sans geste (jamais { gesture: true } sur un minuteur) : le passage de fond du module.
  await Promise.resolve().then(() => v.ctx.data.sync?.()).catch(() => {});
  if (V === v) load(v);
}

/** La page redevient visible : un passage tout de suite, sans attendre la période (la relecture était en pause). */
function onVisible() {
  if (V && document.visibilityState === 'visible') pass(V);
}

/** Écrit un document par le cadre ; faux (et une notification) si l'écriture est refusée. */
async function put(v, path, value) {
  try {
    await v.ctx.data.put(path, value);
    return true;
  } catch (e) {
    v.ctx.notify?.(v.tt(TX.noWrite, {
      e: String(e?.message || e).slice(0, 120)
    }), 'err');
    return false;
  }
}

const RANGE_MS = 60e3; // un objet est « à portée » pour « Demander » une minute après le dernier relevé à portée
const SEVEN = 7; // sept tiroirs ouverts à l'écran, les suivants repliés
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
 *  ouvert ('' fermé). live : l'appareil a une position en direct ; notJudged(key) : la règle du lecteur (frame/lib/mission.js). */
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
  else if (k.kind && k.kind !== 'hand') key = tt(TX.keyHidden); // une condition de l'auteur, une clé que cet écran ne connaît pas
  else key = tt(TX.keyHand);
  // l'heure de repli n'est dite que si elle concerne le pilote : la clé n'est pas suivie sur cet appareil
  let note = '',
    follow = ''; // 'followed' : l'appareil suit ce passage ; 'range' : à portée de l'objet
  if (k.kind !== 'time') {
    const inFlight = !!k.kind && k.kind !== 'hand',
      // ce que l'appareil sait juger avec une position (drawers.js), hors de ce que le lecteur dit « pas encore jugé en vol »
      judged = inFlight && judgedKey(k, notJudged) && d?.keyWhy !== 'condition',
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
        .openArrivalBy) : s.how === 'landing' ? (s.mine ? TX.openLandingMe : TX.openLandingBy) :
      s.mine ? TX.openHandMe : TX.openHandBy;
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

/** La ligne d'un tiroir OUVERT (SOG-0459 : un tiroir fermé n'a pas de ligne) : son titre, comment et quand, son message, son briefing,
 *  « Resceller » au niveau Complet. Ni rang ni numéro : rien ne dit ce qui reste à venir. Tout texte du fichier passe par esc. */
function rowHtml(v, s) {
  const d = v.drawers.find(x => x.id === s.id) || {},
    t = describe(v.tt, s, d, {
      live: liveNow(v),
      notJudged: v.notJudged
    }),
    name = s.title ? `<b>${esc(s.title)}</b>` : '',
    brief = typeof d.brief === 'string' ? d.brief : '',
    cut = brief.length > BRIEF_CUT ? brief.slice(0, brief.lastIndexOf(' ', BRIEF_CUT) > BRIEF_CUT / 2 ? brief.lastIndexOf(' ', BRIEF_CUT) :
      BRIEF_CUT) : brief,
    canSeal = (v.ctx.level || 1) >= 3 && (s.mine || !s.by), // outil d'auteur (Complet) : ma propre ouverture, ou l'heure
    // l'ouverture d'un autre arrivée plus d'une minute après le fait : « reçu ici à … » (aucun délai n'est promis, il est dit)
    gotAt = s.by && !s.mine ? (Number.isFinite(s.gotAt) ? s.gotAt : v.gotNow?.[s.id]) : null,
    got = Number.isFinite(gotAt) && Number.isFinite(s.srcAt) && gotAt - s.srcAt > 60e3 ? ` — ${v.tt(TX.gotHere, { t: fmtZ(new Date(gotAt)) })}` : '';
  return `<div class="dw-row" data-dw="${esc(s.id)}" data-open="${esc(s.how)}"><div class="dw-top">${name}</div>
    <small class="f-muted dw-key" data-dw-how>${esc(t.how)}${esc(got)}${s.gone ? ` — ${esc(v.tt(TX.gone, { by: s.by }))}` : ''}</small>
    ${d.message || brief ? `<div class="dw-text" data-dw-text>${d.message ? `<p class="dw-msg" data-dw-msg>${esc(d.message)}</p>` : ''}${cut ? `<p data-dw-brief>${esc(cut)}${cut.length < brief.length ? '…' : ''}</p>` : ''}${cut.length < brief.length ? `<details class="ms-more" data-dw-more><summary class="f-muted">${esc(v.tt(TX.more))}</summary><p>${esc(brief.slice(cut.length))}</p></details>` : ''}</div>` : ''}
    ${canSeal ? `<div class="dw-acts"><button type="button" class="f-linkbtn" data-dw-seal="${esc(s.id)}">${esc(v.tt(TX.seal))}</button></div>` : ''}</div>`;
}

/** Le temps de repos qui reste à « Demander la suite » pour cette mission (0 : la commande est prête). */
function restLeft(v) {
  const until = REST.get(v.id);
  return Number.isFinite(until) ? Math.max(0, until - Date.now()) : 0;
}

/** « Demander la suite » dans la place que la fiche lui donne ([data-actslot] de sa rangée des actions, après « Préparer ce vol ») —
 *  pour MA mission seulement, avec ou sans tiroir ; retiré sinon. Hors d'une fiche (pas de place), pas de bouton. Seul NOTRE bouton est
 *  touché : la place peut en porter d'autres (le lot T3). Au repos : désactivé, réarmé par le minuteur du repos. */
function placeAsk(v) {
  const slot = v.host.closest?.('.ms-sheet')?.querySelector('[data-actslot]') || null;
  if (!v.mine || !slot) {
    v.askBtn?.remove();
    v.askBtn = null;
    return;
  }
  let b = slot.querySelector(':scope > [data-dw-ask]');
  if (!b) {
    b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('data-dw-ask', '');
    slot.prepend(b);
  }
  if (v.askBtn && v.askBtn !== b) v.askBtn.remove();
  v.askBtn = b;
  b.onclick = onAsk;
  b.textContent = v.tt(TX.ask);
  const left = restLeft(v);
  b.disabled = left > 0;
  b.toggleAttribute('data-dw-rest', left > 0);
  b.setAttribute('aria-expanded', v.asking ? 'true' : 'false');
  clearTimeout(v.restTimer);
  // le seul minuteur de ce geste : il réarme la commande à la fin du repos (sans geste, jamais { gesture: true })
  if (left > 0) v.restTimer = setTimeout(() => V === v && paint(), Math.min(left + 50, 2 ** 31 - 1));
}

/** Redessine la section (SOG-0459) : cachée et VIDE tant qu'aucun tiroir de MA mission n'est ouvert et que le panneau « Demander la
 *  suite » est fermé — pour toute mission, avec ou sans tiroir ; sinon le panneau, puis « Suite de la mission » et une ligne par
 *  tiroir ouvert. « data-mine » n'est posé que lorsqu'un tiroir ouvert est montré. */
function paint() {
  const v = V;
  if (!v?.host) return;
  const opened = v.mine && Array.isArray(v.states) ? v.states.filter(s => s.open) : [],
    rows = opened.map(s => rowHtml(v, s)),
    asking = v.mine && v.asking;
  v.host.hidden = !rows.length && !asking;
  // pour MA mission, un tiroir ouvert : la section prend la place de la ligne des zones de la première page (STYLE)
  v.host.toggleAttribute('data-mine', rows.length > 0);
  // le panneau : les mêmes mots et les mêmes éléments pour toute mission (aucun mot ne dépend des tiroirs)
  const box = asking ? `<div class="dw-ask" data-dw-askbox><p>${esc(v.tt(TX.askText))}</p><div class="dw-acts"><button type="button" class="primary" data-dw-ask-yes>${esc(v.tt(TX.askYes))}</button><button type="button" data-dw-ask-no>${esc(v.tt(TX.askNo))}</button></div></div>` : '';
  // sept lignes au plus, puis les suivantes repliées sous « {n} autres » (les ouverts seulement)
  const list = rows.length ? `<h3>${esc(v.tt(TX.head))}</h3><div class="dw-list" data-dw-list>${rows.slice(0, SEVEN).join('')}${rows.length > SEVEN ?
    `<details class="ms-more dw-rest" data-dw-rest${v.restOpen ? ' open' : ''}><summary class="f-muted">${esc(v.tt(TX.moreOpen, { n: rows.length - SEVEN }))}</summary><div class="dw-list">${rows.slice(SEVEN).join('')}</div></details>` : ''}</div>` : '';
  v.host.innerHTML = box + list;
  const rest = v.host.querySelector('[data-dw-rest]');
  if (rest) rest.ontoggle = () => {
    if (V === v) v.restOpen = rest.open; // gardé à travers les dessins
  };
  placeAsk(v);
}

/** « Demander la suite » touché : le panneau s'ouvre (rien n'est écrit). Au repos, ou pour une mission qui n'est pas la mienne : rien. */
function onAsk(e) {
  const v = V;
  e?.stopPropagation?.();
  if (!v || !v.mine || restLeft(v) > 0) return;
  v.asking = true;
  paint();
  v.host.querySelector('[data-dw-ask-yes]')?.focus?.();
}

/** « Demander » (SOG-0459) : ouvre le premier tiroir fermé si sa clé est le geste, ou si c'est un objet que l'appareil suit et a à
 *  portée maintenant (drawers.js asked) ; sinon la même réponse pour toute mission, « Rien de nouveau pour l'instant ». Après toute
 *  réponse, la commande se repose (REST, par mission). */
async function answer(v) {
  v.asking = false;
  REST.set(v.id, Date.now() + v.restMs);
  const states = Array.isArray(v.states) ? v.states : [],
    first = states.find(x => !x.open && !x.locked),
    r = v.inRange,
    // à portée MAINTENANT : un relevé à portée de moins d'une minute, sur le premier fermé, que l'appareil suit (position connue)
    near = !!first && !!r && r.id === first.id && Date.now() - r.seen <= RANGE_MS && followsHere(v, first) ? first.id : null,
    a = v.mine ? D.asked(states, {
      inRange: near
    }) : null;
  if (!a) {
    v.ctx.notify?.(v.tt(TX.nothing), 'info');
    return paint();
  }
  paint();
  if (a.how === 'object') return void record(v, a.id, {
    ...r.f,
    at: Date.now()
  }, r.source).catch(() => {});
  const next = D.withOpen(v.doc, {
    mission: v.id,
    me: v.me,
    seance: v.seance,
    now: Date.now()
  }, a.id, 'hand');
  if (!next) return void v.ctx.notify?.(v.tt(TX.noWrite, {
    e: v.tt(TX.noTrigram)
  }), 'err');
  if (!await put(v, v.myPath, next) || V !== v) return;
  await load(v); // la notification « Suite de la mission : … » vient du calcul (announce)
  // les autres appareils de la mission le liront à leur synchronisation : un passage demandé tout de suite, sans attendre celui de fond
  Promise.resolve().then(() => v.ctx.data.sync?.()).catch(() => {});
}

/** Les gestes de la section : « Demander » et « Pas maintenant » du panneau, « Resceller » (niveau Complet). */
async function onClick(e) {
  const v = V,
    b = e.target.closest?.('[data-dw-ask-yes],[data-dw-ask-no],[data-dw-seal]');
  if (!v || !b || !v.host.contains(b)) return;
  e.stopPropagation();
  if (b.hasAttribute('data-dw-ask-no')) { // « Pas maintenant » : le panneau se ferme, sans repos
    v.asking = false;
    return paint();
  }
  if (b.hasAttribute('data-dw-ask-yes')) return answer(v);
  const id = b.dataset.dwSeal,
    next = D.withSeal(v.doc, {
      mission: v.id,
      me: v.me,
      seance: v.seance,
      now: Date.now()
    }, id);
  if (!next) {
    v.ctx.notify?.(v.tt(TX.noWrite, {
      e: v.tt(TX.noTrigram)
    }), 'err');
    return paint();
  }
  if (!await put(v, v.myPath, next) || V !== v) return;
  await load(v);
  Promise.resolve().then(() => v.ctx.data.sync?.()).catch(() => {});
}
