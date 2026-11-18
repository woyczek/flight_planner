// V3 missions — la section « Tiroirs » de la fiche d'une mission (SOG-0441, lot T2) : l'écran et ses gestes. Le calcul est dans
// drawers.js (pur) ; ce fichier lit et écrit par le cadre (ctx.data), ne touche à aucun autre document que :
//   · le carnet de CE pilote, pilot/<TRI>/missions/<ID>.json (écrit : le geste « Ouvrir le tiroir », le départ réel du vol) ;
//   · les carnets des autres pilotes de la mission (LUS seulement, entrées non fiables) ;
//   · cache/missions/seen_<ID>.json (sur l'appareil seul : les ouvertures des autres déjà vues — un tiroir ouvert le reste).
//
// La section n'est COMPLÈTE que pour MA mission (elle m'est affectée, ou c'est la mission de mon vol courant) ; une mission qu'on
// feuillette ne dit que « n tiroirs » : ni titre, ni clé, ni geste (on n'ouvre pas le tiroir d'une mission qu'on ne joue pas).
//
// L'écran suit la maquette acceptée par l'ergonome le 17/11 (modules/missions/maquette/tiroirs.html, « Ce que le pilote voit ») : fermé,
// une enveloppe, « B · Titre », la clé en clair, « Ouvrir le tiroir » ; ouvert, comment et quand, le message, le briefing.
//
// API : show(host, { ctx, id, mission, passage, notJudged }) — pose la section dans `host` (l'élément [data-drawers] de la fiche,
//   redessiné avec elle : rappeler show à chaque dessin) ; passage(pointId) et notJudged(key) viennent de frame/lib/mission.js
//   (passageMin, notJudgedYet) ; stop() — la fiche se ferme, le module se démonte.
//   describe(tt, state, drawer, { live, notJudged, inRange }) → { key, note, how, follow } : les phrases d'un tiroir (la clé d'un tiroir fermé, la note
//   « pas encore jugé en vol » ou « sans position en direct », comment et quand il s'est ouvert) — pur : l'aperçu de l'éditeur peut
//   s'en servir pour dire la même chose que l'écran du pilote. TX : les textes, quatre langues.

import * as D from './drawers.js';
import {
  fmtZ
} from '../../frame/lib/time.js';

export const TX = {
  head: ['Tiroirs', 'Drawers', 'Schubladen', 'Cajones'],
  count: ['Tiroirs : {n}', 'Drawers: {n}', 'Schubladen: {n}', 'Cajones: {n}'],
  countNote: ['la suite de la mission, ouverte en vol', 'the rest of the mission, opened in flight',
    'der weitere Verlauf, im Flug geöffnet',
    'la continuación de la misión, abierta en vuelo'
  ],
  envelope: ['Tiroir fermé', 'Closed drawer', 'Geschlossene Schublade', 'Cajón cerrado'],
  // un tiroir fermé : sa clé en clair
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
  // l'ordre : seul le premier tiroir encore fermé peut s'ouvrir
  // la position en direct : ce que l'appareil suit, l'objet à portée, le geste « Objet en vue »
  followed: ['Cet appareil suit ce passage', 'This device follows this passage', 'Dieses Gerät verfolgt diesen Durchflug',
    'Este dispositivo sigue este paso'
  ],
  inRange: ['À portée de l\'objet : déclarez « Objet en vue »', 'In range of the object: declare “Object in sight”',
    'In Reichweite des Objekts: melden Sie „Objekt in Sicht“', 'Al alcance del objeto: declare «Objeto a la vista»'
  ],
  seen: ['Objet en vue', 'Object in sight', 'Objekt in Sicht', 'Objeto a la vista'],
  notInRange: ['L\'objet n\'est pas à portée de cet appareil : approchez-vous, puis déclarez « Objet en vue »',
    'The object is not in range of this device: get closer, then declare “Object in sight”',
    'Das Objekt ist nicht in Reichweite dieses Geräts: nähern Sie sich, dann melden Sie „Objekt in Sicht“',
    'El objeto no está al alcance de este dispositivo: acérquese y declare «Objeto a la vista»'
  ],
  openArrivalMe: ['ouvert à l\'arrivée, à {t}', 'opened on arrival, at {t}', 'bei der Ankunft geöffnet um {t}',
    'abierto a la llegada, a las {t}'
  ],
  openArrivalBy: ['ouvert à l\'arrivée de {by}, à {t}', 'opened when {by} arrived, at {t}', 'bei der Ankunft von {by} geöffnet um {t}',
    'abierto a la llegada de {by}, a las {t}'
  ],
  afterDrawer: ['après le tiroir {n}', 'after drawer {n}', 'nach Schublade {n}', 'después del cajón {n}'],
  gotHere: ['reçu ici à {t}', 'received here at {t}', 'hier empfangen um {t}', 'recibido aquí a las {t}'],
  sealedNote: ['rescellé', 'resealed', 'wieder versiegelt', 'resellado'],
  // le geste d'un autre pilote de la mission n'ouvre que pour lui (Q-0094 en attente) : dit sur le tiroir resté fermé
  handBy: ['{by} l\'a ouvert à la main à {t}, pour lui seul', '{by} opened it by hand at {t}, for themselves only',
    '{by} hat sie um {t} von Hand geöffnet, nur für sich', '{by} lo abrió a mano a las {t}, solo para sí'
  ],
  // un tiroir ouvert : comment et quand
  openTime: ['ouvert à l\'heure, à {t}', 'opened on time, at {t}', 'planmäßig geöffnet um {t}', 'abierto a su hora, a las {t}'],
  openFallback: ['ouvert à l\'heure de repli, à {t}', 'opened at the fallback time, at {t}', 'zur Ersatzzeit geöffnet, um {t}',
    'abierto a la hora de reserva, a las {t}'
  ],
  openHandMe: ['ouvert à la main, à {t}', 'opened by hand, at {t}', 'von Hand geöffnet um {t}', 'abierto a mano, a las {t}'],
  openHandBy: ['ouvert à la main par {by}, à {t}', 'opened by hand by {by}, at {t}', 'von {by} von Hand geöffnet um {t}',
    'abierto a mano por {by}, a las {t}'
  ],
  openZoneMe: ['ouvert au passage de la zone, à {t}', 'opened on entering the zone, at {t}', 'beim Einflug in die Zone geöffnet um {t}',
    'abierto al entrar en la zona, a las {t}'
  ],
  openZoneBy: ['ouvert au passage de la zone par {by}, à {t}', 'opened when {by} entered the zone, at {t}',
    'beim Einflug von {by} in die Zone geöffnet um {t}', 'abierto al entrar {by} en la zona, a las {t}'
  ],
  openObjectMe: ['ouvert sur « Objet en vue », à {t}', 'opened on « Object in sight », at {t}', 'bei « Objekt in Sicht » geöffnet um {t}',
    'abierto con « Objeto a la vista », a las {t}'
  ],
  openObjectBy: ['ouvert sur « Objet en vue » de {by}, à {t}', 'opened on « Object in sight » by {by}, at {t}',
    'bei « Objekt in Sicht » von {by} geöffnet um {t}', 'abierto con « Objeto a la vista » de {by}, a las {t}'
  ],
  gone: ['{by} a retiré cette ouverture de son carnet : le tiroir reste ouvert',
    '{by} removed this opening from their record: the drawer stays open',
    '{by} hat diese Öffnung aus dem eigenen Heft entfernt: die Schublade bleibt offen',
    '{by} retiró esta apertura de su cuaderno: el cajón sigue abierto'
  ],
  more: ['Lire la suite', 'Read more', 'Weiterlesen', 'Leer más'],
  // à l'écran un tiroir est dit par son rang (« Tiroir 1, 2, 3… ») : les lettres désignent les équipages d'une opération
  drawerN: ['Tiroir {n}', 'Drawer {n}', 'Schublade {n}', 'Cajón {n}'],
  moreDrawers: ['Tiroirs suivants : {n}', 'Next drawers: {n}', 'Weitere Schubladen: {n}', 'Cajones siguientes: {n}'],
  // les gestes
  open: ['Ouvrir le tiroir', 'Open the drawer', 'Schublade öffnen', 'Abrir el cajón'],
  confirm: ['Confirmer : ouvrir maintenant', 'Confirm: open now', 'Bestätigen: jetzt öffnen', 'Confirmar: abrir ahora'],
  seal: ['Resceller', 'Reseal', 'Wieder versiegeln', 'Resellar'],
  // les notifications
  nowOpen: ['Tiroir {n} ouvert : {title}', 'Drawer {n} opened: {title}', 'Schublade {n} geöffnet: {title}',
    'Cajón {n} abierto: {title}'
  ],
  refused: ['Tiroir {n} : l\'ouverture annoncée par {by} n\'est pas retenue ({why})',
    'Drawer {n}: the opening announced by {by} is not kept ({why})',
    'Schublade {n}: die von {by} gemeldete Öffnung wird nicht übernommen ({why})',
    'Cajón {n}: la apertura anunciada por {by} no se acepta ({why})'
  ],
  why_stranger: ['ce pilote n\'est pas de la mission', 'this pilot is not on the mission', 'dieser Pilot gehört nicht zur Mission',
    'este piloto no es de la misión'
  ],
  why_seance: ['elle date d\'une autre séance de la mission', 'it belongs to another play of the mission',
    'sie stammt aus einem anderen Durchgang der Mission', 'es de otra sesión de la misión'
  ],
  why_future: ['son heure est dans le futur', 'its time is in the future', 'ihre Zeit liegt in der Zukunft', 'su hora está en el futuro'],
  why_before: ['son heure est bien avant la mission', 'its time is long before the mission', 'ihre Zeit liegt weit vor der Mission',
    'su hora es muy anterior a la misión'
  ],
  why_key: ['ce tiroir ne s\'ouvre pas ainsi', 'this drawer does not open that way', 'diese Schublade öffnet sich nicht so',
    'este cajón no se abre así'
  ],
  why_shape: ['le trajet annoncé ne passe pas par la zone', 'the announced leg does not cross the zone',
    'der gemeldete Flugweg führt nicht durch die Zone', 'el trayecto anunciado no pasa por la zona'
  ],
  noWrite: ['Le tiroir n\'a pas pu être ouvert : {e}', 'The drawer could not be opened: {e}',
    'Die Schublade konnte nicht geöffnet werden: {e}',
    'No se pudo abrir el cajón: {e}'
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
[data-drawers] .dw-row[data-locked]{opacity:.75}
[data-drawers] [data-dw-follow]{color:var(--sog-accent)}
[data-drawers] .dw-row{border:1px solid var(--sog-border);padding:8px 10px;background:var(--sog-bg)}
[data-drawers] .dw-row[data-open]{border-left:3px solid var(--sog-accent)}
[data-drawers] .dw-env{display:flex;gap:10px;align-items:flex-start}
[data-drawers] .dw-env>div{flex:1;min-width:0}
[data-drawers] .dw-ico{flex:none;width:36px;height:26px;margin-top:2px;border:1.5px solid currentColor;opacity:.75;background:linear-gradient(to bottom right,transparent calc(50% - 1px),currentColor calc(50% - 1px),currentColor calc(50% + 1px),transparent calc(50% + 1px)) top left/50% 60% no-repeat,linear-gradient(to bottom left,transparent calc(50% - 1px),currentColor calc(50% - 1px),currentColor calc(50% + 1px),transparent calc(50% + 1px)) top right/50% 60% no-repeat}
[data-drawers] .dw-top b{overflow-wrap:anywhere}
[data-drawers] .dw-key{display:block;margin-top:2px}
[data-drawers] .dw-acts{display:flex;flex-wrap:wrap;gap:8px;margin:2px 0 -4px}
[data-drawers] .dw-text{margin:6px 0 0;overflow-wrap:anywhere}
[data-drawers] .dw-text p{margin:.4em 0;white-space:pre-wrap}
[data-drawers] .dw-msg{border-left:3px solid var(--sog-border);padding-left:8px}`;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`),
  ARM_MS = 5000, // « Confirmer » reste armé cinq secondes (la V2)
  POLL_MS = 60e3; // un passage de synchronisation par minute pendant qu'un tiroir est attendu (les carnets des autres arrivent par lui)
let V = null; // la section posée : une fiche à la fois

/** La fiche se ferme ou le module se démonte : minuteurs et écoute arrêtés. */
export function stop() {
  if (!V) return;
  clearTimeout(V.dueTimer);
  clearTimeout(V.armTimer);
  clearInterval(V.poll);
  V.unwatch?.();
  V.unlive?.();
  document.removeEventListener('visibilitychange', onVisible);
  V = null;
}

/** Pose la section « Tiroirs » dans host (voir l'en-tête). passage(pointId) : le temps estimé jusqu'à un lieu (frame/lib/mission.js). */
export function show(host, {
  ctx,
  id,
  mission,
  passage,
  notJudged,
  pollMs
} = {}) {
  const drawers = (Array.isArray(mission?.drawers) ? mission.drawers : []).filter(d => D.LETTERS.includes(d?.id)).slice(0, D.LETTERS
    .length);
  if (!host || !ctx || !id || !drawers.length) {
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
      notJudged
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
    pollMs: Number.isFinite(pollMs) && pollMs >= 100 ? pollMs : POLL_MS, // la période du passage à la minute (un banc la raccourcit)
    tt: (row, vars) => ctx.t(row, vars),
    mine: false,
    states: null, // null : pas encore lu (la ligne « n tiroirs » en attendant)
    armed: '', // le tiroir dont « Ouvrir » attend sa confirmation
    said: new Set(), // ce qui est déjà notifié (ouvertures, refus)
    first: true, // le premier calcul : aucune notification pour ce qui était déjà ouvert
    flying: false, // le vol démarré de CETTE mission est en cours : une position en direct est la sienne
    prevFix: null, // le relevé d'avant : le trajet jugé va de lui au relevé reçu
    inRange: null, // { id, f, seen, source } : le dernier trajet à portée de l'objet du premier tiroir fermé
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
    v.prevFix = ctx.live?.last || null; // le dernier relevé du cadre : le premier relevé reçu est jugé depuis lui
    v.unlive = ctx.live?.watch?.(fix => onFix(v, fix));
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
    return paint();
  }
  const peers = seance.crew.filter(p => p !== me),
    seenPath = `cache/missions/seen_${v.id}.json`;
  let [doc, seenDoc, ...theirs] = await Promise.all([get(myPath), get(seenPath), ...peers.map(p => get(D.bookPath(p, v.id)))]);
  if (V !== v) return;
  v.paths = new Set([myPath, flightPath, ...peers.map(p => D.bookPath(p, v.id))]);
  // le départ réel du vol de cette mission : la référence d'heure de la séance, écrite une fois au carnet
  const startAt = playing ? Date.parse(flight.started?.at || '') : NaN;
  if (Number.isFinite(startAt) && D.bookFor(D.readBook(doc, v.id), seance)?.startAt !== startAt) {
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
  return liveNow(v) && !st.sealed && D.follows(st.key) && !v.notJudged?.(st.key) && d?.keyWhy !== 'condition';
}

/** Un relevé de la position en direct (toutes les cinq secondes) : le trajet depuis le relevé d'avant est jugé pour le premier
 *  tiroir fermé. Ne lève jamais (un abonné qui rejette n'est pas attrapé par le cadre). */
function onFix(v, fix) {
  if (V !== v) return;
  const live = liveNow(v),
    turned = live !== v.wasLive,
    // deux relevés à plus d'une minute l'un de l'autre (ou sans heure) ne font pas un trajet : le relevé est jugé seul, et ce qui
    // s'est passé entre les deux est l'affaire du rattrapage sur la trace
    gap = Date.parse(fix?.at) - Date.parse(v.prevFix?.at),
    prev = gap >= 0 && gap <= LEG_MS ? v.prevFix : null;
  v.prevFix = fix;
  v.wasLive = live;
  // la position en direct vient d'arriver (ou de se taire) : la section est relue — sa note le dit, la trace gardée est rattrapée
  (turned && v.mine ? load(v) : Promise.resolve()).then(() => judge(v, prev, fix)).catch(() => {});
}

/** Juge un trajet : un constat de zone ou d'arrivée s'écrit tout de suite au carnet ; un objet à portée attend « Objet en vue ». */
async function judge(v, prev, fix) {
  if (!v.mine || !v.states || v.busy) return;
  const first = v.states.find(x => !x.open && !x.locked),
    f = first && followsHere(v, first) ? D.finding(first.key, prev, fix, {
      trail: v.ctx.live?.trail?.()
    }) : null;
  if (!f) { // plus à portée depuis une minute : le geste « Objet en vue » redevient refusé
    if (v.inRange && (!first || v.inRange.id !== first.id || Date.now() - v.inRange.seen > RANGE_MS)) {
      v.inRange = null;
      paint();
    }
    return;
  }
  if (f.confirm) {
    const was = v.inRange?.id === first.id;
    v.inRange = {
      id: first.id,
      f,
      seen: Date.now(),
      source: fix?.source
    };
    if (!was) paint();
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

/** Le rang d'un tiroir à l'écran (« Tiroir 1, 2, 3… ») : sa place dans la mission. */
const rank = (v, id) => {
  const i = v.drawers.findIndex(d => d.id === id),
    r = v.drawers[i]?.rank;
  return Number.isInteger(r) && r >= 1 && r <= D.LETTERS.length ? r : i + 1; // le rang rendu par le lecteur, sinon la place dans la liste
};

/** Les notifications flottantes : un tiroir qui vient de s'ouvrir, une ouverture d'un autre carnet qui n'est pas retenue (une fois chacune). */
function announce(v, before, states) {
  for (const s of states) {
    const was = (before || []).find(x => x.id === s.id);
    if (s.open && !v.first && was && !was.open && !v.said.has(`open:${s.id}`)) {
      v.said.add(`open:${s.id}`);
      v.ctx.notify?.(v.tt(TX.nowOpen, {
        n: rank(v, s.id),
        title: s.title
      }), 'ok');
    }
    for (const r of s.refused) {
      const k = `no:${s.id}:${r.by}:${r.why}`;
      if (v.said.has(k) || !TX[`why_${r.why}`]) continue;
      v.said.add(k);
      v.ctx.notify?.(v.tt(TX.refused, {
        n: rank(v, s.id),
        by: r.by,
        why: v.tt(TX[`why_${r.why}`])
      }), 'warn');
    }
  }
  v.first = false;
}

/** Le minuteur de la prochaine échéance (celle du premier tiroir fermé), et le passage de synchronisation BORNÉ qui apporte les carnets
 *  des autres (décision de l'ergonome, 17/11) : chaque minute, seulement pendant que le premier tiroir fermé est ATTENDU (une clé jugée
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
  // (dix minutes) ; avec un passage, elle arrive à la minute (le passage lui-même : une demi-seconde sur un dépôt local).
  // Sans geste (jamais { gesture: true } sur un minuteur) : le passage de fond du module.
  await Promise.resolve().then(() => v.ctx.data.sync?.()).catch(() => {});
  if (V === v) load(v);
}

/** La page redevient visible : un passage tout de suite, sans attendre la minute (la relecture était en pause). */
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

const RANGE_MS = 60e3; // « Objet en vue » est accepté une minute après le dernier relevé à portée
const LEG_MS = 60e3; // deux relevés font un trajet s'ils sont à une minute au plus l'un de l'autre
const SEVEN = 7; // sept tiroirs à l'écran, les suivants repliés
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
  else if (k.kind && k.kind !== 'hand') key = tt(TX.keyHidden); // une condition de l'auteur, une clé que cet écran ne connaît pas
  else key = tt(TX.keyHand);
  // l'heure de repli n'est dite que si elle concerne le pilote : la clé n'est pas suivie sur cet appareil
  let note = '',
    follow = ''; // 'followed' : l'appareil suit ce passage ; 'range' : à portée de l'objet
  if (k.kind !== 'time') {
    const inFlight = !!k.kind && k.kind !== 'hand',
      // ce que l'appareil sait juger avec une position (drawers.js), hors de ce que le lecteur dit « pas encore jugé en vol »
      judged = inFlight && D.follows(k) && !notJudged?.(k) && d?.keyWhy !== 'condition',
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
        .openArrivalBy) :
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

/** La ligne d'un tiroir (la maquette) : fermé — l'enveloppe, « B · Titre », sa clé, « Ouvrir le tiroir » ; ouvert — comment et quand,
 *  son message, son briefing. Tout texte du fichier passe par esc. */
function rowHtml(v, s) {
  const d = v.drawers.find(x => x.id === s.id) || {},
    range = !!v.inRange && v.inRange.id === s.id && Date.now() - v.inRange.seen <= RANGE_MS,
    t = describe(v.tt, s, d, {
      live: liveNow(v),
      notJudged: v.notJudged,
      inRange: range
    }),
    // « Objet en vue » : sur un objet que l'appareil suit et que l'auteur veut déclaré (refusé hors de portée, au clic)
    seen = !!t.follow && s.key?.kind === 'object' && s.key.object?.confirm !== false,
    name = `<b><span data-dw-n>${esc(v.tt(TX.drawerN, { n: rank(v, s.id) }))}</span>${s.title ? ` · ${esc(s.title)}` : ''}</b>`;
  // l'ordre : un tiroir dont un précédent est encore fermé ne dit que « après le tiroir n », sans geste
  if (s.locked) return `<div class="dw-row" data-dw="${s.id}" data-locked><div class="dw-env"><span class="dw-ico" role="img" aria-label="${esc(v.tt(TX.envelope))}"></span><div>
    <div class="dw-top">${name}</div>
    <small class="f-muted dw-key" data-dw-after>${esc(v.tt(TX.afterDrawer, { n: rank(v, s.after) }))}</small></div></div></div>`;
  if (!s.open) return `<div class="dw-row" data-dw="${s.id}"><div class="dw-env"><span class="dw-ico" role="img" aria-label="${esc(v.tt(TX.envelope))}"></span><div>
    <div class="dw-top">${name}</div>
    <small class="f-muted dw-key" data-dw-key>${esc(t.key)}${s.sealed ? ` · ${esc(v.tt(TX.sealedNote))}` : ''}</small>
    ${t.note ? `<small class="f-muted dw-key" data-dw-note${t.follow ? ` data-dw-follow="${t.follow}"` : ''}>${esc(t.note)}</small>` : ''}
    ${(s.hands || []).slice(0, 3).map(h => `<small class="f-muted dw-key" data-dw-hand="${esc(h.by)}">${esc(v.tt(TX.handBy, { by: h.by, t: fmtZ(new Date(h.at)) }))}</small>`).join('')}
    <div class="dw-acts">${seen ? `<button type="button" class="${range ? 'primary' : 'f-linkbtn'}" data-dw-seen="${s.id}">${esc(v.tt(TX.seen))}</button>` : ''}<button type="button" class="f-linkbtn" data-dw-open="${s.id}"${v.armed === s.id ? ' data-armed' : ''}>${esc(v.tt(v.armed === s.id ? TX.confirm : TX.open))}</button></div></div></div></div>`;
  const brief = typeof d.brief === 'string' ? d.brief : '',
    cut = brief.length > BRIEF_CUT ? brief.slice(0, brief.lastIndexOf(' ', BRIEF_CUT) > BRIEF_CUT / 2 ? brief.lastIndexOf(' ', BRIEF_CUT) :
      BRIEF_CUT) : brief,
    canSeal = (v.ctx.level || 1) >= 3 && (s.mine || !s.by), // outil d'auteur (Complet) : ma propre ouverture, ou l'heure
    // l'ouverture d'un autre arrivée plus d'une minute après le fait : « reçu ici à … » (aucun délai n'est promis, il est dit)
    gotAt = s.by && !s.mine ? (Number.isFinite(s.gotAt) ? s.gotAt : v.gotNow?.[s.id]) : null,
    got = Number.isFinite(gotAt) && Number.isFinite(s.srcAt) && gotAt - s.srcAt > 60e3 ? ` — ${v.tt(TX.gotHere, { t: fmtZ(new Date(gotAt)) })}` : '';
  return `<div class="dw-row" data-dw="${s.id}" data-open="${esc(s.how)}"><div class="dw-top">${name}</div>
    <small class="f-muted dw-key" data-dw-how>${esc(t.how)}${esc(got)}${s.gone ? ` — ${esc(v.tt(TX.gone, { by: s.by }))}` : ''}</small>
    ${d.message || brief ? `<div class="dw-text" data-dw-text>${d.message ? `<p class="dw-msg" data-dw-msg>${esc(d.message)}</p>` : ''}${cut ? `<p data-dw-brief>${esc(cut)}${cut.length < brief.length ? '…' : ''}</p>` : ''}${cut.length < brief.length ? `<details class="ms-more" data-dw-more><summary class="f-muted">${esc(v.tt(TX.more))}</summary><p>${esc(brief.slice(cut.length))}</p></details>` : ''}</div>` : ''}
    ${canSeal ? `<div class="dw-acts"><button type="button" class="f-linkbtn" data-dw-seal="${s.id}">${esc(v.tt(TX.seal))}</button></div>` : ''}</div>`;
}

/** Redessine la section : « n tiroirs » pour une mission qu'on feuillette (ou pas encore lue), la liste pour MA mission. */
function paint() {
  const v = V;
  if (!v?.host) return;
  const n = v.drawers.length;
  const full = v.mine && !!v.states?.length,
    rows = full ? v.states.map(s => rowHtml(v, s)) : [];
  v.host.hidden = false;
  // pour MA mission la section prend la place de la ligne des zones de la première page (STYLE ; décision de l'ergonome, 17/11)
  v.host.toggleAttribute('data-mine', full);
  // sept lignes au plus, puis les tiroirs suivants repliés (la règle des sept éléments) ; un tiroir armé ou ouvert plus loin déplie
  v.host.innerHTML = full ? `<h3>${esc(v.tt(TX.head))}</h3><div class="dw-list" data-dw-list>${rows.slice(0, SEVEN).join('')}${rows.length > SEVEN ?
    `<details class="ms-more dw-rest" data-dw-rest${v.restOpen ? ' open' : ''}><summary class="f-muted">${esc(v.tt(TX.moreDrawers, { n: rows.length - SEVEN }))}</summary><div class="dw-list">${rows.slice(SEVEN).join('')}</div></details>` : ''}</div>` :
    `<p data-dw-count>${esc(v.tt(TX.count, { n }))} <span class="f-muted">— ${esc(v.tt(TX.countNote))}</span></p>`;
  const rest = v.host.querySelector('[data-dw-rest]');
  if (rest) rest.ontoggle = () => {
    if (V === v) v.restOpen = rest.open; // gardé à travers les dessins
  };
}

/** Les gestes : « Ouvrir le tiroir » en deux temps (le second dans les cinq secondes), « Resceller ». */
async function onClick(e) {
  const v = V,
    b = e.target.closest?.('[data-dw-open],[data-dw-seal],[data-dw-seen]');
  if (!v || !b || !v.host.contains(b)) return;
  e.stopPropagation();
  if (b.dataset.dwSeen) { // « Objet en vue » : refusé hors de portée (le dernier relevé à portée a plus d'une minute, ou aucun)
    const r = v.inRange;
    if (!r || r.id !== b.dataset.dwSeen || Date.now() - r.seen > RANGE_MS) return void v.ctx.notify?.(v.tt(TX.notInRange), 'warn');
    v.said.add(`open:${r.id}`); // mon propre geste n'est pas annoncé
    return void record(v, r.id, {
      ...r.f,
      at: Date.now()
    }, r.source).catch(() => {});
  }
  const id = b.dataset.dwOpen || b.dataset.dwSeal;
  if (b.dataset.dwOpen && v.states?.find(x => x.id === id)?.locked) return; // l'ordre : seul le premier tiroir fermé s'ouvre
  const ctx = {
    mission: v.id,
    me: v.me,
    seance: v.seance,
    now: Date.now()
  };
  if (b.dataset.dwOpen && v.armed !== id) { // premier temps : armé, sans rien écrire
    v.armed = id;
    clearTimeout(v.armTimer);
    v.armTimer = setTimeout(() => {
      if (V !== v || v.armed !== id) return;
      v.armed = '';
      paint();
    }, ARM_MS);
    return paint();
  }
  clearTimeout(v.armTimer);
  v.armed = '';
  const next = b.dataset.dwOpen ? D.withOpen(v.doc, ctx, id, 'hand') : D.withSeal(v.doc, ctx, id);
  if (!next) {
    v.ctx.notify?.(v.tt(TX.noWrite, {
      e: v.tt(TX.noTrigram)
    }), 'err');
    return paint();
  }
  if (!await put(v, v.myPath, next) || V !== v) return;
  v.said.add(`open:${id}`); // mon propre geste n'est pas annoncé
  await load(v);
  // les autres appareils de la mission le liront à leur synchronisation : un passage demandé tout de suite, sans attendre celui de fond
  Promise.resolve().then(() => v.ctx.data.sync?.()).catch(() => {});
}
