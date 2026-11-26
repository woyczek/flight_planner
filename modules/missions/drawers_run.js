// V3 missions — le JUGE des tiroirs de « Suite de la mission » (SOG-0441, SOG-0459, SOG-0617) : lit les carnets, juge la position en direct,
// écrit les constats, publie les tiroirs ouverts. Aucun élément, aucun style : l'écran est drawers_view.js (une vue s'accroche à un contrôleur
// d'ici), et le veilleur de la page (frame, `meta.watch`, watch.js de la session « Fonctionnalités ») suit une mission SANS fiche ouverte.
// Les règles, les tolérances et le carnet sont ceux d'avant : seul l'endroit où le juge tourne change (SOG-0617, le mot de l'utilisateur :
// « en vol, la mission vit hors de sa fiche »). Un seul module chargé par la page (même texte d'import partout : un seul juge par mission).
//
// UN contrôleur par mission et par page (une Map par identifiant). Il lit (ctx.data), surveille `pilot/` (ctx.data.watch) et la position en
// direct (ctx.live.watch) ; il vit tant que la mission est SUIVIE (`follow`) ou qu'une vue y est accrochée (`attach`).
//
// API :
//   follow({ ctx, id, mission, onArrive, onState }) → le contrôleur de `id` avec ce ctx de PAGE (créé, ou le contrôleur existant qui prend ce ctx et
//     ces rappels) ; sans hôte. Rappelé avec le même identifiant : met à jour la mission et les rappels, jamais un second juge.
//     onArrive(lettre) : un tiroir vient de s'ouvrir (une fois par tiroir, jamais au premier calcul) ET aucune vue du bloc n'est à l'écran ;
//     un rejet est avalé. Ce module ne lève AUCUNE note : le veilleur dit l'arrivée, avec son texte.
//     onState({ id, mine, flying, opened: [{ id, title }], live: { status, source, at } }) : après chaque calcul et quand la position change
//     d'état ; les titres des tiroirs OUVERTS seulement ; ne lève jamais dans le cadre (try/catch).
//   unfollow(id) → la mission n'est plus suivie ; arrêtée, sauf si une vue y est accrochée.
//   attach(id, { ctx, mission, view, pollMs, restMs }) → le contrôleur de `id` (voir stateOf). Suivi : la vue s'y accroche, le ctx de page
//     continue de juger (le ctx du module ne sert qu'aux textes de la vue) ; sinon un contrôleur est créé avec le ctx du module et vit tant
//     qu'une vue y est accrochée. view = { paint(), changed(), reveal?(), tick?(), host } (host : l'élément de la section, pour savoir si elle est à l'écran).
//   detach(id, view) → la vue se décroche ; un contrôleur ni suivi ni regardé s'arrête (minuteurs, ctx.data.watch, ctx.live.watch).
//     La vue d'une AUTRE mission n'arrête jamais celle qui est suivie.
//   stateOf(id) → LE CONTRÔLEUR lui-même (lecture seule pour la vue) : id, ctx, mission, drawers, mine, states, flying, startIso, asking, inRange,
//     seance, line, doc, me, gotNow, passage(p), notJudged(k), tt(row, vars) ; ou null.
//   « Prévu » (SOG-0620 lot 3) : eventsOf(c), ownLetter(c), isOwnEvent(ev, lettre), constatsOf(c) → { held, passed, eta } (Map : id → ISO / minutes), EVENT_NM :
//     les constats des événements, jugés ici depuis les relevés reçus (planned.js les affiche) ; c.callsign : l'indicatif de mon affectation.
//   markDrawerRead(id, lettre) : « Ouvrir l'enveloppe » d'un message arrivé (`drawer_<L>.read_at`) ; objectSeen(id) : « Objet en vue » (SOG-0619) ;
//     isUnread(c, s), unreadOf(c) : les messages arrivés et non lus, le plus ancien d'abord.
//   ask(id) → le panneau « Demander la suite » s'ouvre (faux au repos ou hors de ma mission) ; cancelAsk(id) ; answer(id) ; markRead(id) ;
//     seal(id, lettre) : les gestes de la vue. restLeft(id) : ce qui reste du repos de « Demander ». liveNow(c), liveInfo(c).
//   sees(id, mission) → ce que la fiche et son Détail montrent de cette mission (SOG-0448 : pilotView, avec les tiroirs que le contrôleur sait ouverts).
//
// LE GARDE ENTRE ONGLETS (SOG-0617) : chaque onglet juge, mais chaque ÉCRITURE d'un constat (un constat, le geste « Demander », le départ du vol,
// « lu ») passe par `navigator.locks` ('sog-mission-' + id) : dans le verrou le carnet est RELU ; si le tiroir y est déjà ouvert (ou le départ,
// « lu » déjà écrits), rien n'est écrit et la section est relue. Sans navigator.locks (contexte non sécurisé), l'écriture est celle d'avant.

import * as D from './drawers.js';
import {
  fixOf as readFix
} from '../../frame/lib/crossing.js'; // un relevé lu borné : lat, lon, gsKt, t
import {
  gcNm
} from '../../frame/lib/geo.js';
import {
  own
} from '../../frame/lib/untrusted.js';
import * as MS from '../../frame/lib/mission.js'; // passageMin, notJudgedYet : les règles du lecteur, une seule fois (SOG-0617)
import {
  mine as myLines
} from './assigned.js'; // ma ligne d'affectation, relue bornée

/** Les textes que le juge dit lui-même (la vue les reprend dans son TX : un seul endroit). */
export const RTX = {
  // un geste sans réponse : la même phrase pour toute mission (SOG-0459)
  nothing: ['Rien de nouveau pour l\'instant', 'Nothing new for now', 'Vorerst nichts Neues', 'Nada nuevo por ahora'],
  // une écriture refusée par le cadre : dite sans nommer de tiroir
  noWrite: ['La demande n\'a pas pu être enregistrée : {e}', 'The request could not be saved: {e}',
    'Die Anfrage konnte nicht gespeichert werden: {e}',
    'No se pudo guardar la solicitud: {e}'
  ],
  noRead: ['La mission n\'a pas pu être notée comme lue : {e}', 'The mission could not be marked as read: {e}',
    'Die Mission konnte nicht als gelesen vermerkt werden: {e}', 'No se pudo marcar la misión como leída: {e}'
  ],
  // « Resceller » (SOG-0627) : la question du cadre, avec ou sans tiroir suivant que j'ai ouvert (ses boutons sont dits ici, le cadre n'ayant que « OK » et « Annuler »)
  sealAskMany: ['Resceller ce tiroir et les suivants ?', 'Reseal this drawer and the following ones?',
    'Diese Schublade und die folgenden wieder versiegeln?',
    '¿Volver a sellar este cajón y los siguientes?'
  ],
  sealAskOne: ['Resceller ce tiroir ?', 'Reseal this drawer?', 'Diese Schublade wieder versiegeln?', '¿Volver a sellar este cajón?'],
  sealOk: ['Resceller', 'Reseal', 'Versiegeln', 'Sellar'],
  sealCancel: ['Annuler', 'Cancel', 'Abbrechen', 'Cancelar'],
  noTrigram: ['aucun trigramme sur cet appareil', 'no trigram on this device', 'kein Trigramm auf diesem Gerät',
    'ningún trigrama en este dispositivo'
  ]
};

export const POLL_MS =
  10e3; // un passage de synchronisation toutes les dix secondes pendant qu'un tiroir est attendu, page visible (SOG-0463 : 60 s auparavant ; 10 s et non 5 pour le plafond de 80 requêtes par minute sans lanceur)
export const REST_MS = 60e3; // « Demander la suite » se repose une minute après chaque réponse
export const RANGE_MS = 60e3; // un objet est « à portée » pour « Demander » une minute après le dernier relevé à portée
const REPUB_MS = 15 *
  60e3; // le document « ouverts » est récrit au moins tous les quarts d'heure tant que le contrôleur calcule (son heure)
const CTL = new Map(); // les contrôleurs, par identifiant de mission
// le repos de « Demander la suite », par mission : l'instant où la commande se réarme (rouvrir la fiche ne le remet pas à zéro)
const REST = new Map();
let SHOWN = null; // { id, key } : ce que sees() a rendu à la fiche au dernier dessin (à qui est la mission, quels tiroirs sont ouverts)

/** À qui est la mission et quels tiroirs sont ouverts, en un mot comparable. */
const pubKey = (mine, opened) => `${mine ? 1 : 0}:${opened.join('')}`;
/** Ce que le contrôleur sait : la mission est-elle la mienne (et lue), quelles lettres sont ouvertes. */
const known = v => {
  const mine = !!v && v.mine === true && Array.isArray(v.states);
  return {
    mine,
    opened: mine ? readIds(v) : []
  };
};

/** LA règle de lecture (SOG-0619) : un tiroir est « ouvert pour l'écran » quand il est LU par CE pilote — avant, il n'y a que son enveloppe, et rien
 *  d'autre nulle part (ni texte, ni lieux au Détail, sur la Carte, dans la liseuse ou le plan de vol). Le constat, lui, est écrit au carnet dès qu'il a
 *  lieu et compte tout de suite pour le juge (`states.open` reste la vérité du juge : une enveloppe non lue ne retient pas le tiroir suivant). Les lettres
 *  ouvertes ET lues : la seule source de sees() (la fiche, le Détail, pilotView), du document publié (cache/missions/open_<ID>.json : la Carte,
 *  Carburant) et de la liseuse. */
export const readIds = c => (Array.isArray(c.states) ? c.states : []).filter(s => s.open && !isUnread(c, s)).map(s => s.id);

/** Les états des tiroirs tels que l'ÉCRAN les voit : un tiroir ouvert et pas lu y est fermé. */
export const shownStates = c => (Array.isArray(c.states) ? c.states : []).map(s => isUnread(c, s) ? {
  ...s,
  open: false
} : s);

/** Ce que le juge sait ouvert à un instant (toutes lectures confondues) : le contexte d'une écriture, pour la migration d'un carnet d'avant (drawers.js). */
const openedOf = c => (Array.isArray(c.states) ? c.states : []).filter(s => s.open).map(s => s.id);

/** Les tiroirs lus de la mission (les lettres connues, douze au plus). */
const drawersOf = mission => (Array.isArray(mission?.drawers) ? mission.drawers : []).filter(d => D.LETTERS.includes(d?.id)).slice(0, D
  .LETTERS
  .length);

/** Ce que la fiche et son Détail montrent de cette mission : la mission lue passée par pilotView. Pur à l'état du contrôleur près ; null
 *  pour une mission illisible. */
export function sees(id, mission) {
  const k = known(CTL.get(id) || null);
  SHOWN = {
    id,
    key: pubKey(k.mine, k.opened)
  };
  return MS.pilotView(mission, k.opened, {
    mine: k.mine
  });
}

/** Un contrôleur neuf (rien n'est lu ni surveillé encore : start). */
function make(id, ctx, mission) {
  const c = {
    id,
    ctx,
    mission, // la mission lue, entière : le suivi des clés la lit ; la liseuse n'en reçoit que ce que pilotView montre
    drawers: drawersOf(mission),
    passage: p => MS.passageMin?.(c.mission, p), // le temps estimé jusqu'à un lieu : la règle du lecteur
    notJudged: k => !!MS.notJudgedYet?.(k), // une clé que le vol ne sait pas encore juger : la règle du lecteur
    pub: null, // { key, at } : le dernier document « ouverts » écrit
    pollMs: POLL_MS, // la période du passage (un banc la raccourcit)
    restMs: REST_MS, // le repos de « Demander la suite » (un banc le raccourcit)
    tt: (row, vars) => c.ctx.t(row, vars),
    mine: false,
    states: null, // null : pas encore lu (la section reste cachée et vide en attendant)
    asking: false, // le panneau « Demander la suite » est ouvert
    said: new Set(), // les ouvertures déjà annoncées
    first: true, // le premier calcul : rien n'est annoncé pour ce qui était déjà ouvert
    flying: false, // le vol démarré de CETTE mission est en cours : une position en direct est la sienne
    prevFix: null, // le relevé d'avant : le trajet jugé va de lui au relevé reçu
    inRange: null, // { id, f, seen, source } : le dernier trajet à portée de l'objet du premier tiroir fermé (« Demander » s'en sert)
    caught: new Set(), // les tiroirs dont la trace gardée a déjà été relue (une fois par tiroir)
    wasLive: false, // la position en direct au dernier relevé : son arrivée fait relire la section
    busy: false, // un constat est en cours d'écriture
    views: new Set(), // les vues accrochées (drawers_view.js)
    followed: null, // { onArrive, onState } quand le veilleur de la page suit cette mission
    watching: false, // les écoutes (ctx.data.watch, ctx.live.watch) sont posées
    dead: false // arrêté : plus rien ne se fait
  };
  return c;
}

/** Démarre un contrôleur : la première lecture, puis les écoutes ; l'écouteur de visibilité est posé avec le premier. */
function start(c) {
  if (!HOOKED) hook();
  load(c).then(() => {
    if (c.dead) return;
    watch(c);
  });
}

let HOOKED = false;
/** Pose l'écouteur de la page redevenue visible (un seul pour tous les contrôleurs). */
function hook() {
  HOOKED = true;
  document.addEventListener('visibilitychange', onVisible);
}

/** Les écoutes du cadre : un carnet (le mien sur un autre appareil, celui d'un autre) ou le vol changé par une synchronisation : relu ; la
 *  position en direct : UN abonnement du cadre (ctx.live.watch, un relevé toutes les cinq secondes), jamais un minuteur ici. */
function watch(c) {
  unwatch(c);
  const ctx = c.ctx;
  c.watching = true;
  c.unwatch = ctx.data.watch?.('pilot/', paths => !c.dead && [].concat(paths || []).some(p => c.paths?.has(p)) && load(c));
  c.lastStatus = ctx.live?.status;
  ensureLive(c);
}

/** L'abonnement à la position en direct (ctx.live.watch) : posé quand il sert — une mission à tiroirs (le jugement), ou MA mission dont le vol
 *  est démarré (la ligne « Position » de la vue se repeint à chaque relevé) ; une mission sans tiroir et sans vol n'a rien à suivre : aucun
 *  abonnement. Rappelé après chaque calcul (le vol peut démarrer après). Le démontage du module désabonne de lui-même, arrêter aussi. */
function ensureLive(c) {
  if (c.dead || !c.watching || c.unlive || !(c.drawers.length || (c.mine && c.flying))) return;
  c.prevFix = c.ctx.live?.last || null; // le dernier relevé du cadre : le premier relevé reçu est jugé depuis lui
  c.unlive = c.ctx.live?.watch?.(fix => onFix(c, fix)) || null;
}

/** Retire les écoutes du cadre. */
function unwatch(c) {
  c.watching = false;
  c.unwatch?.();
  c.unlive?.();
  c.unwatch = c.unlive = null;
}

/** Arrête un contrôleur : minuteurs et écoutes retirés, plus rien ne s'y fait ; l'écouteur de visibilité part avec le dernier. */
function stopCtl(c) {
  if (c.dead) return;
  c.dead = true;
  clearTimeout(c.dueTimer);
  clearInterval(c.poll);
  unwatch(c);
  if (CTL.get(c.id) === c) CTL.delete(c.id);
  if (!CTL.size && HOOKED) {
    HOOKED = false;
    document.removeEventListener('visibilitychange', onVisible);
  }
}

/** Change la mission d'un contrôleur (la fiche redessinée, ou le veilleur) : ses tiroirs sont relus du fichier. */
function setMission(c, mission) {
  if (!mission) return;
  c.mission = mission;
  c.drawers = drawersOf(mission);
}

/** Le contrôleur de cette mission avec ce ctx de PAGE (voir l'en-tête). */
export function follow({
  ctx,
  id,
  mission,
  onArrive,
  onState
} = {}) {
  if (!ctx || !id) return null;
  let c = CTL.get(id);
  if (!c) {
    c = make(id, ctx, mission);
    CTL.set(id, c);
    c.followed = {
      onArrive,
      onState
    };
    start(c);
    return c;
  }
  c.followed = {
    onArrive,
    onState
  };
  setMission(c, mission);
  if (c.ctx !== ctx) { // le contrôleur d'une fiche (ctx du module) prend le ctx de la page : il juge désormais avec lui
    const was = c.watching;
    unwatch(c);
    c.ctx = ctx;
    if (was) watch(c);
  }
  return c;
}

/** La mission n'est plus suivie : arrêtée, sauf si une vue y est accrochée. */
export function unfollow(id) {
  const c = CTL.get(id);
  if (!c) return;
  c.followed = null;
  if (!c.views.size) stopCtl(c);
}

/** Accroche une vue au contrôleur de `id` (voir l'en-tête). Rappelé à chaque dessin de la fiche : la mission est mise à jour, rien n'est relu. */
export function attach(id, {
  ctx,
  mission,
  view,
  pollMs,
  restMs
} = {}) {
  let c = CTL.get(id);
  if (c && !c.followed && c.ctx !== ctx) { // le module a été remonté : son ancien contrôleur n'a plus d'hôte
    stopCtl(c);
    c = null;
  }
  const fresh = !c;
  if (fresh) {
    c = make(id, ctx, mission);
    CTL.set(id, c);
  } else setMission(c, mission);
  if (Number.isFinite(pollMs) && pollMs >= 100) c.pollMs = pollMs;
  if (Number.isFinite(restMs) && restMs >= 100) c.restMs = restMs;
  if (view) c.views.add(view);
  if (fresh) start(c);
  return c;
}

/** La vue se décroche ; un contrôleur ni suivi ni regardé s'arrête. */
export function detach(id, view) {
  const c = CTL.get(id);
  if (!c) return;
  c.views.delete(view);
  if (!c.followed && !c.views.size) stopCtl(c);
}

/** Le contrôleur de cette mission (voir l'en-tête), ou null. */
export const stateOf = id => CTL.get(id) || null;

/** Une vue du bloc est-elle à l'écran ? Son élément est dans la page et aucun de ses parents n'est caché. */
const onScreen = c => [...c.views].some(w => !!w.host?.isConnected && !w.host.parentElement?.closest?.('[hidden]'));

/** Redessine les vues accrochées. */
const paintViews = c => c.views.forEach(w => {
  try {
    w.paint?.();
  } catch {
    /* une vue qui échoue ne casse pas le juge */
  }
});

/** Dit l'état au veilleur (onState) : ce qui est ouvert (le titre des tiroirs OUVERTS seulement, déjà visibles), la position. Ne lève jamais. */
function emit(c) {
  const cb = c.followed?.onState;
  if (!cb || c.dead) return;
  try {
    const live = c.ctx.live || {};
    cb({
      id: c.id,
      mine: !!c.mine,
      flying: !!c.flying,
      opened: c.mine && Array.isArray(c.states) ? c.states.filter(s => s.open && !isUnread(c, s)).map(s => ({
        id: s.id,
        title: s.title || ''
      })) : [],
      live: {
        status: live.status,
        source: live.sourceName || '',
        at: live.last?.at || null
      }
    });
  } catch {
    /* le veilleur ne reçoit jamais une exception du juge, ni le juge celle du veilleur */
  }
}

/** Ce que sees() a rendu à la fiche n'est plus à jour : la fiche est prévenue UNE fois par état. */
function tell(c, shown) {
  if (SHOWN?.id !== c.id || SHOWN.key === shown) c.told = null;
  else if (c.told !== shown) {
    c.told = shown;
    c.views.forEach(w => {
      try {
        w.changed?.();
      } catch {
        /* la fiche ne casse pas le juge */
      }
    });
  }
}

/** Après un calcul : le document « ouverts » de l'appareil (écrit quand il change, ou que son heure a un quart d'heure), puis la fiche
 *  prévenue si ce que sees() lui a rendu n'est plus à jour. Une mission qui n'est pas la mienne n'écrit que pour défaire un document
 *  qui la disait mienne (`old` : le document relu, quand il vient d'être lu). */
function publish(c, old = null) {
  const k = known(c),
    key = `${pubKey(k.mine, k.opened)}:${k.mine ? c.seance?.key ?? '' : ''}`,
    path = D.openPath(c.id),
    now = Date.now(),
    due = k.mine ? c.pub?.key !== key || now - c.pub.at > REPUB_MS : D.readOpen(old, c.id).mine,
    doc = due && path ? D.openAfter(shownStates(c), {
      mission: c.id,
      mine: k.mine,
      seance: c.seance
    }, now) : null;
  if (doc) {
    c.pub = {
      key,
      at: now
    };
    Promise.resolve().then(() => c.ctx.data.put(path, doc)).catch(() => {});
  }
  tell(c, pubKey(k.mine, k.opened));
}

/** Relit le carnet de ce pilote (dans le verrou d'une écriture) : le document du cadre, sinon celui que le contrôleur a lu. */
const reread = async (c, path = c.myPath, fallback = c.doc) => (await Promise.resolve().then(() => c.ctx.data.get(path)).catch(() =>
  null)) ?? fallback;

/** Le garde entre onglets : l'écriture `fn` passe par navigator.locks ('sog-mission-' + id) ; sans lui (contexte non sécurisé), elle est faite
 *  telle qu'avant. `fn(guarded)` : `guarded` vrai quand le verrou est tenu (le carnet doit alors être RELU avant d'écrire). */
function locked(c, fn) {
  const locks = globalThis.navigator?.locks;
  if (!locks?.request) return fn(false);
  return locks.request(`sog-mission-${c.id}`, () => fn(true));
}

/** Lit ce qu'il faut (affectations, vol, carnets, « vu »), calcule l'état, écrit ce qui doit l'être, redessine et arme les minuteurs. */
async function load(c) {
  const data = c.ctx.data,
    get = p => Promise.resolve().then(() => data.get(p)).catch(() => null),
    myPath = D.bookPath(c.ctx.identity?.trigram, c.id),
    // le trigramme VALIDÉ par bookPath (rogné, trois lettres), jamais celui de l'identité tel quel : tous les chemins partent de lui
    // (relecture de Sécurisation, 17/11 : « ABC » suivi d'un blanc donnait un chemin de vol « pilot/ABC /… »)
    me = myPath ? myPath.split('/')[1] : '',
    flightPath = myPath ? `pilot/${me}/current_flight.json` : null,
    [idx, flight] = await Promise.all([get('missions/affectations.json'), flightPath ? get(flightPath) : null]);
  if (c.dead) return;
  const seance = D.seanceOf({
      mission: c.id,
      me,
      lines: idx?.assignments,
      flight
    }),
    playing = !!flight && typeof flight === 'object' && String(flight.mission || '').toUpperCase() === c.id;
  c.mine = !!myPath && (seance.assigned || playing);
  // SOG-0620 lot 3 : mon indicatif d'équipage (la ligne d'affectation de ce trigramme pour cette mission) : MON équipe se lit dessus (ownLetter)
  c.callsign = String((Array.isArray(idx?.assignments) ? idx.assignments : []).slice(0, 5000).map(a => a && typeof a === 'object' && MS
      .midOf(own(a, 'mission')) === c.id &&
      MS.triOf(own(a, 'pilot')) === me ? own(a, 'callsign') : null).find(x => typeof x === 'string' && x) ?? '').slice(0, 12)
    .toUpperCase();
  if (!c.mine) {
    c.states = [];
    c.flying = false;
    paintViews(c);
    emit(c);
    // un document « ouverts » qui disait cette mission mienne (une affectation retirée) est défait
    const path = D.openPath(c.id),
      old = path ? await get(path) : null;
    if (!c.dead) publish(c, old);
    return;
  }
  const peers = seance.crew.filter(p => p !== me),
    seenPath = `cache/missions/seen_${c.id}.json`;
  let [doc, seenDoc, ...theirs] = await Promise.all([get(myPath), get(seenPath), ...peers.map(p => get(D.bookPath(p, c.id)))]);
  if (c.dead) return;
  c.paths = new Set([myPath, flightPath, ...peers.map(p => D.bookPath(p, c.id))]);
  // le départ réel du vol de cette mission : la référence d'heure de la séance, écrite une fois au carnet — pour une mission À TIROIRS
  // seulement (SOG-0459, relecture : le secret est un secret d'écran ; pas un fichier de plus au dépôt pour chaque vol)
  const startAt = playing ? Date.parse(flight.started?.at || '') : NaN;
  if (c.drawers.length && Number.isFinite(startAt) && D.bookFor(D.readBook(doc, c.id), seance)?.startAt !== startAt) {
    // le garde entre onglets : relu dans le verrou, rien n'est écrit si le départ y est déjà (un autre onglet l'a écrit)
    const wrote = await locked(c, async guarded => {
      const cur = guarded ? await reread(c, myPath, doc) : doc;
      if (guarded && D.bookFor(D.readBook(cur, c.id), seance)?.startAt === startAt) return cur;
      const next = D.withStart(cur, {
        mission: c.id,
        me,
        seance,
        opened: openedOf(c)
      }, startAt);
      return next && await put(c, myPath, next) ? next : null;
    });
    if (wrote) doc = wrote;
    if (c.dead) return;
  }
  Object.assign(c, {
    me,
    seance,
    myPath,
    doc,
    // ma ligne d'affectation pour cette mission (pas un convoyage), ou null pour une mission jouée seul
    line: seance.assigned ? myLines(idx, me).find(a => a.mission === c.id && !a.ferry) || {} : null,
    flying: Number.isFinite(startAt),
    startIso: Number.isFinite(startAt) ? flight.started.at : ''
  });
  const seen = D.readSeen(seenDoc, seance),
    before = c.states,
    states = D.stateOf(c.drawers, {
      me,
      seance,
      book: D.readBook(doc, c.id),
      others: peers.map((pilot, i) => ({
        pilot,
        book: D.readBook(theirs[i], c.id)
      })),
      seen,
      now: Date.now(),
      passage: c.passage
    });
  c.states = states;
  // un carnet d'avant les enveloppes : ce qui est ouvert à ce premier calcul est lu (voir isUnread) ; un carnet marqué ou absent : la règle des enveloppes
  const bk = D.bookFor(D.readBook(doc, c.id), seance);
  c.legacyRead = bk && !bk.marked ? c.legacyRead || new Set(states.filter(x => x.open).map(x => x.id)) : null;
  // ce que l'appareil garde : les ouvertures des autres déjà vues (une écriture qui ne change rien n'est pas faite par le cadre)
  const at = Date.now(),
    keep = D.seenAfter(seen, states, seance, at);
  // la première fois qu'une ouverture d'un autre est vue : son heure de réception est celle de ce calcul (gardée dans « vu »)
  c.gotNow = Object.fromEntries(states.filter(x => x.open && x.by && !x.mine && !Number.isFinite(x.gotAt)).map(x => [x.id, c.gotNow?.[x
    .id
  ] ?? at]));
  if (keep && Object.keys(keep.drawers).length) Promise.resolve().then(() => data.put(seenPath, keep)).catch(() => {});
  announce(c, before, states);
  ensureLive(c);
  paintViews(c);
  arm(c, peers.length);
  publish(c); // SOG-0448 : les tiroirs ouverts publiés sur l'appareil, la fiche prévenue
  emit(c);
  catchUp(c);
}

/** Le rattrapage (SOG-0617, c) : le premier tiroir fermé que l'appareil suit est relu UNE fois sur la trace gardée du vol de cette
 *  mission (depuis l'instant où il est devenu le premier fermé) — la trace d'un autre vol n'est jamais lue. Pendant l'écriture d'un
 *  constat (busy), rien n'est marqué : record() le rappelle à sa fin, si bien que le tiroir suivant est rattrapé à son tour, tiroir
 *  après tiroir sur toute la trace (avant : marqué « relu » pendant l'écriture du précédent, il ne l'était jamais). */
function catchUp(c) {
  if (c.dead || c.busy || !c.mine || !Array.isArray(c.states)) return;
  const first = c.states.find(x => !x.open && !x.locked);
  if (!first || !followsHere(c, first) || c.caught.has(first.id)) return;
  c.caught.add(first.id);
  const trail = c.ctx.live?.trail?.(),
    f = trail && trail.from === c.startIso ? D.catchUp(first.key, trail, first.since) : null;
  if (f) record(c, first.id, f, 'trail').catch(() => {});
}

/** « Prévu » (SOG-0620 lot 3) — les constats des ÉVÉNEMENTS, jugés ici depuis les relevés déjà reçus (aucune autre source de position) :
 *  `held` (id d'événement → l'heure ISO du relevé où le pilote était sur son lieu : à EVENT_NM d'un lieu de la mission, l'événement
 *  étant de MON équipe ou de toutes), `passed` (id d'un point cité en repère → l'heure du premier relevé à EVENT_NM) et `eta` (id →
 *  minutes avant d'être sur le lieu, d'après la vitesse sol du dernier relevé ; absent sans vitesse). Gardés en mémoire pour le vol en cours
 *  (le départ du vol les remet à zéro) ; ne lève jamais ; sans le lecteur d'événements (MS.readEvents), rien n'est jugé. */
export const EVENT_NM = 1;

/** Les événements de la mission lus par le lecteur (MS.readEvents), bornés ; [] sans lecteur. */
export function eventsOf(c) {
  try {
    const list = typeof MS.readEvents === 'function' ? MS.readEvents(c.mission) : null;
    return Array.isArray(list) ? list.slice(0, 60) : [];
  } catch {
    return [];
  }
}

/** La lettre (A à Y) de MON équipe : celle dont le nom est l'indicatif de mon affectation (c.callsign) ; '' quand elle ne se dit pas. */
export function ownLetter(c) {
  const cs = String(c.callsign || '').toUpperCase(),
    teams = Array.isArray(c.mission?.teams) ? c.mission.teams : [],
    k = cs ? teams.findIndex(t => String(t?.name ?? '').toUpperCase() === cs) : -1;
  return k >= 0 && k < 25 ? 'ABCDEFGHIJKLMNOPQRSTUVWXY' [k] : '';
}

/** Un événement est-il suivi par MON équipe : sans équipe (toutes), ou ma lettre y est. */
export const isOwnEvent = (ev, letter) => !Array.isArray(ev?.teams) || !ev.teams.length || !!letter && ev.teams.includes(letter);

/** La position d'un lieu de la mission (les points lus, une clé PROPRE), ou null. */
function placeAt(mission, id) {
  const pts = mission?.points,
    k = String(id ?? '').toUpperCase(),
    p = pts && typeof pts === 'object' && k && Object.hasOwn(pts, k) ? pts[k] : null,
    lat = Number(p?.lat),
    lon = Number(p?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) ? {
    lat,
    lon
  } : null;
}

/** Les constats de « Prévu » : { held: Map, passed: Map, eta: Map } (voir plus haut), remis à zéro au départ d'un autre vol. */
export function constatsOf(c) {
  if (!c.ev || c.ev.start !== c.startIso) c.ev = {
    start: c.startIso,
    held: new Map(),
    passed: new Map(),
    eta: new Map()
  };
  return c.ev;
}

/** Un relevé reçu : les événements sur site, les points passés, le temps restant. */
function eventsJudge(c, raw) {
  if (!c.mine || !c.flying) return;
  const f = readFix(raw),
    evs = eventsOf(c);
  if (!f || !evs.length) return;
  const ev = constatsOf(c),
    at = Number.isFinite(f.t) ? new Date(f.t).toISOString() : '',
    letter = ownLetter(c);
  let changed = false;
  for (const e of evs) {
    const place = e.place ? placeAt(c.mission, e.place) : null;
    if (place && isOwnEvent(e, letter) && !ev.held.has(e.id)) {
      const nm = gcNm(f, place);
      if (nm <= EVENT_NM && at) {
        ev.held.set(e.id, at);
        changed = true;
      } else if (Number.isFinite(f.gsKt) && f.gsKt > 30) {
        const m = Math.round(nm / f.gsKt * 60);
        changed ||= ev.eta.get(e.id) !== m;
        ev.eta.set(e.id, m);
      }
    }
    if (e.ref?.kind === 'point' && at && !ev.passed.has(e.ref.id)) {
      const pt = placeAt(c.mission, e.ref.id);
      if (pt && gcNm(f, pt) <= EVENT_NM) {
        ev.passed.set(e.ref.id, at);
        changed = true;
      }
    }
  }
  if (ev.held.size)
    for (const id of ev.held.keys()) ev.eta.delete(id);
  if (changed) paintViews(c); // « Prévu » se repeint : un constat, ou le temps restant qui change
}

/** L'appareil a-t-il une position en direct qui est celle du vol de cette mission ? */
export const liveNow = c => c.flying && c.ctx.live?.status === 'tracking';

/** La position en direct telle que la vue la dit : { tracking, source, at } (at : l'heure ISO du dernier relevé, ou ''). */
export const liveInfo = c => ({
  tracking: c.ctx.live?.status === 'tracking',
  source: c.ctx.live?.sourceName || '',
  at: c.ctx.live?.last?.at || ''
});

/** Ce tiroir (le premier fermé) est-il suivi par cet appareil, maintenant ? Une clé que drawers.js sait juger, que le lecteur ne dit
 *  pas « pas encore jugée en vol », un tiroir que je n'ai pas rescellé, et une position en direct. */
function followsHere(c, st) {
  const d = c.drawers.find(x => x.id === st.id);
  return liveNow(c) && !st.sealed && judgedKey(st.key, c.notJudged) && d?.keyWhy !== 'condition';
}

/** Cette clé se juge-t-elle avec une position en direct ? drawers.js fait foi pour une condition de l'atelier (SOG-0500 : le lecteur,
 *  `notJudgedYet`, les dit encore toutes « pas encore jugées ») ; le lecteur garde le dernier mot pour les autres clés. */
export const judgedKey = (key, notJudged) => D.follows(key) && (key.kind === 'condition' || !notJudged?.(key));

/** Un relevé de la position en direct (toutes les cinq secondes) : le trajet depuis le relevé d'avant est jugé pour le premier
 *  tiroir fermé. Ne lève jamais (un abonné qui rejette n'est pas attrapé par le cadre). */
function onFix(c, fix) {
  if (c.dead) return;
  const live = liveNow(c),
    turned = live !== c.wasLive,
    // deux relevés à plus d'une minute l'un de l'autre (ou sans heure) ne font pas un trajet : le relevé est jugé seul, et ce qui
    // s'est passé entre les deux est l'affaire du rattrapage sur la trace
    gap = Date.parse(fix?.at) - Date.parse(c.prevFix?.at),
    prev = gap >= 0 && gap <= D.LEG_MS ? c.prevFix : null;
  c.prevFix = fix;
  c.wasLive = live;
  try {
    c.views.forEach(w => w.tick?.()); // la ligne « Position » : « reçue il y a n s », repeinte à chaque relevé
    if (c.ctx.live?.status !== c.lastStatus) { // la position change d'état : le veilleur le sait
      c.lastStatus = c.ctx.live?.status;
      emit(c);
    }
  } catch {
    /* rien ne casse le jugement */
  }
  try {
    eventsJudge(c, fix); // SOG-0620 lot 3 : « Prévu » — les événements sur site, les points passés
  } catch {
    /* rien ne casse le jugement */
  }
  if (!c.drawers.length) return; // une mission sans tiroir n'a rien à juger
  // la position en direct vient d'arriver (ou de se taire) : la section est relue — sa note le dit, la trace gardée est rattrapée
  (turned && c.mine ? load(c) : Promise.resolve()).then(() => judge(c, prev, fix)).catch(() => {});
}

/** Juge un trajet : un constat de zone, d'arrivée, d'atterrissage ou de stationnaire (tenu par holding, c.hold), d'une suite d'étapes (tenue par stepping, c.steps) ou de survol sans confirmation s'écrit tout de suite au carnet ; un objet à portée, ou un survol à confirmer
 *  (confirm : vrai), attend « Demander » (tenu dans c.inRange, rien n'est peint : l'écran ne dit pas qu'un objet est attendu). */
async function judge(c, prev, fix) {
  if (!c.mine || !c.states || c.busy) return;
  const first = c.states.find(x => !x.open && !x.locked),
    here = !!first && followsHere(c, first);
  let f = null;
  const kind = here ? D.judgeKind(first.key) : 'leg';
  if (kind === 'hold') { // une tenue (atterrissage, stationnaire) : son état est gardé par tiroir
    const r = D.holding(first.key, c.hold?.id === first.id ? c.hold.hold : null, fix);
    c.hold = {
      id: first.id,
      hold: r.hold
    };
    c.steps = null;
    f = r.f;
  } else if (kind === 'steps') { // une suite d'étapes : son état (l'étape en cours, la tenue, les constats faits) est gardé par tiroir
    const r = D.stepping(first.key, c.steps?.id === first.id ? c.steps.state : null, prev, fix);
    c.steps = {
      id: first.id,
      state: r.state
    };
    c.hold = null;
    f = r.f;
  } else {
    c.hold = null;
    c.steps = null;
    if (here) f = D.finding(first.key, prev, fix, {
      trail: c.ctx.live?.trail?.()
    });
  }
  if (!f) { // plus à portée depuis une minute : « Demander » ne l'ouvre plus
    if (c.inRange && (!first || c.inRange.id !== first.id || Date.now() - c.inRange.seen > RANGE_MS)) c.inRange = null;
    return;
  }
  if (f.confirm) {
    c.inRange = {
      id: first.id,
      f,
      seen: Date.now(),
      source: fix?.source
    };
    return;
  }
  await record(c, first.id, f, fix?.source);
}

/** Écrit un constat (ses deux relevés, l'heure du fait) dans le carnet de ce pilote, redessine et demande un passage. Le garde entre
 *  onglets : le carnet est relu dans le verrou, un tiroir déjà ouvert par un autre onglet n'est pas réécrit (jamais deux constats pour un fait). */
async function record(c, id, f, source) {
  if (c.dead || c.busy) return;
  c.busy = true;
  try {
    const done = await locked(c, async guarded => {
      const cur = guarded ? await reread(c) : c.doc;
      if (guarded && D.bookFor(D.readBook(cur, c.id), c.seance)?.drawers?.[id]?.state === 'open')
        return 'seen'; // l'autre onglet l'a déjà écrit : rien à écrire, la section est relue
      const next = D.withOpen(cur, {
        mission: c.id,
        me: c.me,
        seance: c.seance,
        opened: openedOf(c),
        now: Date.now()
      }, id, f.how, {
        from: f.from,
        to: f.to,
        last: f.last, // un ravitaillement : le dernier relevé tenu et le relevé de départ (SOG-0521)
        off: f.off,
        at: f.at,
        steps: f.steps,
        tier: f.tier, // le palier et la distance d'un posé de précision (SOG-0507) : relus bornés par withOpen
        distNm: f.distNm,
        source: f.source || source
      });
      return next && await put(c, c.myPath, next) ? 'wrote' : 'failed';
    });
    if (done === 'failed' || c.dead) return;
    c.inRange = null;
    await load(c);
    Promise.resolve().then(() => c.ctx.data.sync?.()).catch(() => {});
  } finally {
    c.busy = false;
    // le rattrapage qu'un calcul pendant cette écriture n'a pas pu lancer (SOG-0617, c) ; un écrit refusé ne boucle pas : son tiroir,
    // toujours le premier fermé, est déjà marqué relu
    catchUp(c);
  }
}

/** Un tiroir vient de s'ouvrir, une fois : le veilleur de la page en est prévenu (onArrive(lettre)) — seulement quand le contrôleur est suivi
 *  avec onArrive ET qu'aucune vue du bloc n'est à l'écran (rien ne mène alors au bloc : le veilleur lève sa note). Jamais au premier calcul
 *  ni pour un tiroir déjà annoncé. Ce module ne lève AUCUNE note (SOG-0459 : rien n'est dit d'une suite que l'écran ne montre pas). */
function announce(c, before, states) {
  for (const s of states) {
    const was = (before || []).find(x => x.id === s.id);
    if (s.open && !c.first && was && !was.open && !c.said.has(`open:${s.id}`)) {
      c.said.add(`open:${s.id}`);
      c.answer = null; // la réponse d'un geste ne survit pas à ce qui arrive
      const cb = c.followed?.onArrive;
      if (cb && !onScreen(c)) {
        try {
          Promise.resolve(cb(s.id)).catch(() => {});
        } catch {
          /* le veilleur ne casse pas le calcul */
        }
      }
    }
  }
  c.first = false;
}

/** Le minuteur de la prochaine échéance (celle du premier tiroir fermé), et le passage de synchronisation BORNÉ qui apporte les carnets
 *  des autres (décision de l'ergonome, 17/11) : toutes les dix secondes, seulement pendant que le premier tiroir fermé est ATTENDU (une clé jugée
 *  en vol : le constat d'un autre peut l'ouvrir à tous — ni l'heure ni le geste) ET que la section est à l'écran (page visible) ET que
 *  la mission a d'autres pilotes (douze au plus, seanceOf) ; il s'arrête à l'ouverture (arm est rappelé à chaque calcul). */
function arm(c, peers) {
  clearTimeout(c.dueTimer);
  clearInterval(c.poll);
  c.poll = 0;
  // l'ordre : seul le PREMIER tiroir fermé peut s'ouvrir — son échéance arme le minuteur, sa clé dit s'il est attendu
  const first = c.states.find(s => !s.open && !s.locked),
    next = first && first.dueAt != null && !first.sealed ? first.dueAt : NaN;
  if (Number.isFinite(next)) c.dueTimer = setTimeout(() => !c.dead && load(c), Math.min(Math.max(next - Date.now(), 0) + 500, 2 ** 31 - 1));
  const awaited = !!first && !!first.key?.kind && first.key.kind !== 'time' && first.key.kind !== 'hand';
  if (awaited && peers) c.poll = setInterval(() => pass(c), c.pollMs);
}

/** Un passage de synchronisation puis la relecture des carnets ; rien quand la page est cachée (onglet caché, appareil en veille : la
 *  relecture est en PAUSE — décision de l'ergonome, 17/11 à 19 h 32) ou que les vues accrochées ne sont plus à l'écran (le veilleur, sans
 *  vue, continue : la page visible suffit). */
async function pass(c) {
  if (c.dead || !c.poll || document.visibilityState === 'hidden') return;
  if (c.views.size && !onScreen(c) && !c.followed) return;
  // un PASSAGE de synchronisation, pas une simple relecture : sur un poste avec lanceur, relire (revalidate) ne déclenche pas
  // l'échange avec le dépôt — mesuré au banc à deux appareils le 17/11 : l'ouverture d'un autre n'arrivait qu'au passage de fond
  // (dix minutes) ; avec un passage, elle arrive à la période du passage (le passage lui-même : une demi-seconde sur un dépôt local).
  // Sans geste (jamais { gesture: true } sur un minuteur) : le passage de fond du module.
  await Promise.resolve().then(() => c.ctx.data.sync?.()).catch(() => {});
  if (!c.dead) load(c);
}

/** La page redevient visible : un passage tout de suite pour chaque contrôleur, sans attendre la période (la relecture était en pause). */
function onVisible() {
  if (document.visibilityState !== 'visible') return;
  for (const c of [...CTL.values()]) pass(c);
}

/** Écrit un document par le cadre ; faux (et une notification) si l'écriture est refusée. */
async function put(c, path, value, row = RTX.noWrite) {
  try {
    await c.ctx.data.put(path, value);
    return true;
  } catch (e) {
    c.ctx.notify?.(c.tt(row, {
      e: String(e?.message || e).slice(0, 120)
    }), 'err');
    return false;
  }
}

/** Le temps de repos qui reste à « Demander la suite » pour cette mission (0 : la commande est prête). */
export function restLeft(id) {
  const until = REST.get(id);
  return Number.isFinite(until) ? Math.max(0, until - Date.now()) : 0;
}

/** « Demander la suite » touché : le panneau s'ouvre (rien n'est écrit). Au repos, ou pour une mission qui n'est pas la mienne : rien (faux). */
export function ask(id) {
  const c = CTL.get(id);
  if (!c || !c.mine || restLeft(id) > 0) return false;
  c.asking = true;
  c.answer = null;
  paintViews(c);
  return true;
}

/** « Pas maintenant » : le panneau se ferme, sans repos. */
export function cancelAsk(id) {
  const c = CTL.get(id);
  if (!c) return;
  c.asking = false;
  paintViews(c);
}

/** « Ouvrir l'enveloppe » : « lu » écrit une fois dans MON carnet (read_at), puis la section relue ; faux si rien n'a pu s'écrire. Le garde entre
 *  onglets : relu dans le verrou, rien n'est réécrit si « lu » y est déjà. */
export async function markRead(id) {
  const c = CTL.get(id);
  if (!c || c.dead || !c.mine) return false;
  const ctx = {
    mission: c.id,
    me: c.me,
    seance: c.seance,
    opened: openedOf(c),
    now: Date.now()
  };
  if (!D.withRead(c.doc, ctx)) {
    c.ctx.notify?.(c.tt(RTX.noRead, {
      e: c.tt(RTX.noTrigram)
    }), 'err');
    return false;
  }
  const ok = await locked(c, async guarded => {
    const cur = guarded ? await reread(c) : c.doc;
    if (guarded && D.bookFor(D.readBook(cur, c.id), c.seance)?.readAt != null) return true; // déjà lu (un autre onglet)
    const next = D.withRead(cur, ctx);
    return !!next && await put(c, c.myPath, next, RTX.noRead);
  });
  if (!ok || c.dead) return false;
  await load(c);
  // l'organisateur le lira à sa synchronisation : un passage demandé tout de suite
  Promise.resolve().then(() => c.ctx.data.sync?.()).catch(() => {});
  return true;
}

/** « Demander » (SOG-0459) : ouvre le premier tiroir fermé si sa clé est le geste, ou si c'est un objet que l'appareil suit et a à
 *  portée maintenant (drawers.js asked) ; sinon la même réponse pour toute mission, « Rien de nouveau pour l'instant ». Après toute
 *  réponse, la commande se repose (REST, par mission). Le garde entre onglets : relu dans le verrou, un tiroir déjà ouvert n'est pas réécrit. */
export async function answer(id) {
  const c = CTL.get(id);
  if (!c) return;
  c.asking = false;
  c.answer = null;
  REST.set(id, Date.now() + c.restMs);
  const states = Array.isArray(c.states) ? c.states : [],
    first = states.find(x => !x.open && !x.locked),
    r = c.inRange,
    // à portée MAINTENANT : un relevé à portée de moins d'une minute, sur le premier fermé, que l'appareil suit (position connue)
    near = !!first && !!r && r.id === first.id && Date.now() - r.seen <= RANGE_MS && followsHere(c, first) ? first.id : null,
    a = c.mine ? D.asked(states, {
      inRange: near
    }) : null;
  if (!a) return nothing(c);
  paintViews(c);
  if (a.how !== 'hand') return void record(c, a.id, { // un objet, ou un survol à confirmer : le constat tenu dans c.inRange
    ...r.f,
    at: Date.now()
  }, r.source).catch(() => {});
  if (!D.withOpen(c.doc, {
      mission: c.id,
      me: c.me,
      seance: c.seance,
      opened: openedOf(c),
      now: Date.now()
    }, a.id, 'hand')) return void c.ctx.notify?.(c.tt(RTX.noWrite, {
    e: c.tt(RTX.noTrigram)
  }), 'err');
  const ok = await locked(c, async guarded => {
    const cur = guarded ? await reread(c) : c.doc;
    if (guarded && D.bookFor(D.readBook(cur, c.id), c.seance)?.drawers?.[a.id]?.state === 'open')
      return true; // déjà ouvert (un autre onglet)
    const next = D.withOpen(cur, {
      mission: c.id,
      me: c.me,
      seance: c.seance,
      opened: openedOf(c),
      now: Date.now()
    }, a.id, 'hand');
    return !!next && await put(c, c.myPath, next);
  });
  if (!ok || c.dead) return;
  await load(c); // l'annonce vient du calcul (announce)
  // les autres appareils de la mission le liront à leur synchronisation : un passage demandé tout de suite, sans attendre celui de fond
  Promise.resolve().then(() => c.ctx.data.sync?.()).catch(() => {});
}

/** La même réponse pour toute demande sans suite : « Rien de nouveau pour l'instant ». En vol (SOG-0619), elle s'affiche DANS le bloc, juste au-dessus
 *  des gestes (c.answer, jamais une note éloignée) ; hors vol, la notification d'avant. */
function nothing(c) {
  if (!c.flying) {
    c.ctx.notify?.(c.tt(RTX.nothing), 'info');
    return paintViews(c);
  }
  c.answer = {
    key: 'nothing',
    at: Date.now()
  };
  paintViews(c);
}

/** Ce message est-il NON LU par moi ? (SOG-0619) Seulement pour MA mission en vol : un tiroir ouvert dont MON carnet n'a pas la marque `read_at` (par pilote :
 *  le constat d'un équipier ouvre le tiroir pour tous, chacun lit SA enveloppe). Un carnet d'AVANT les enveloppes (il existe, sans la marque `reads: 1`)
 *  tient pour lus tous ses tiroirs alors ouverts — ceux qu'un équipier avait ouverts aussi : `c.legacyRead`, les lettres ouvertes au premier calcul
 *  de ce carnet ; la migration écrite (drawers.js baseOf) les rend lus pour de bon à la première écriture. Un carnet absent est neuf. */
export function isUnread(c, s) {
  return !!c.mine && !!c.flying && !!s?.open && s.readAt == null && !c.legacyRead?.has(s.id);
}

/** Les messages arrivés et non lus, le plus ANCIEN d'abord (le rattrapage en apporte deux). */
export const unreadOf = c => (Array.isArray(c.states) ? c.states : []).filter(s => isUnread(c, s)).sort((a, b) => a.at - b.at);

/** « Ouvrir l'enveloppe » d'un message arrivé : `drawer_<L>.read_at` écrit dans MON carnet (une fois), puis la section relue. Le garde entre
 *  onglets : relu dans le verrou, rien n'est réécrit si la lecture y est déjà. */
export async function markDrawerRead(id, letter) {
  const c = CTL.get(id);
  if (!c || c.dead || !c.mine || !D.LETTERS.includes(letter)) return false;
  const ctx = {
    mission: c.id,
    me: c.me,
    seance: c.seance,
    opened: openedOf(c)
  };
  if (!D.withDrawerRead(c.doc, ctx, letter, Date.now())) {
    c.ctx.notify?.(c.tt(RTX.noRead, {
      e: c.tt(RTX.noTrigram)
    }), 'err');
    return false;
  }
  const ok = await locked(c, async guarded => {
    const cur = guarded ? await reread(c) : c.doc;
    if (guarded && D.bookFor(D.readBook(cur, c.id), c.seance)?.reads?.[letter] != null) return true; // déjà lu (un autre onglet)
    const next = D.withDrawerRead(cur, ctx, letter, Date.now());
    return !!next && await put(c, c.myPath, next, RTX.noRead);
  });
  if (!ok || c.dead) return false;
  await load(c);
  Promise.resolve().then(() => c.ctx.data.sync?.()).catch(() => {});
  return true;
}

/** « Objet en vue » (SOG-0619) : le geste LIMITÉ À L'OBJET — il ne joue que si la clé du premier tiroir fermé est un objet (ou un survol à
 *  confirmer) que l'appareil a à portée maintenant, le même test que « Demander » ; sinon la MÊME réponse, « Rien de nouveau pour l'instant ».
 *  Aucune règle du juge ne change : c'est le constat tenu dans c.inRange qui s'écrit, par record. */
export async function objectSeen(id) {
  const c = CTL.get(id);
  if (!c || c.dead) return;
  c.asking = false;
  c.answer = null;
  const states = Array.isArray(c.states) ? c.states : [],
    first = states.find(x => !x.open && !x.locked),
    r = c.inRange,
    near = !!first && !!r && r.id === first.id && Date.now() - r.seen <= RANGE_MS && followsHere(c, first) ? first.id : null,
    a = c.mine && near ? D.asked(states, {
      inRange: near
    }) : null;
  if (!a || a.how === 'hand') return nothing(c);
  paintViews(c);
  return void record(c, a.id, {
    ...r.f,
    at: Date.now()
  }, r.source).catch(() => {});
}

/** « Resceller » (niveau Complet) : le cadre DEMANDE d'abord (« Resceller ce tiroir et les suivants ? » quand mon carnet en a ouvert après lui, sinon « Resceller ce
 *  tiroir ? »), puis le tiroir et ses suivants que j'ai ouverts sont rescellés d'un seul écrit dans MON carnet (sous le verrou, comme les autres écritures), puis la
 *  section relue. « Annuler » ne change rien. */
export async function seal(id, letter) {
  const c = CTL.get(id);
  if (!c || c.dead) return;
  const ctx = {
    mission: c.id,
    me: c.me,
    seance: c.seance,
    opened: openedOf(c)
  };
  if (!D.withSeal(c.doc, {
      ...ctx,
      now: Date.now()
    }, letter)) {
    c.ctx.notify?.(c.tt(RTX.noWrite, {
      e: c.tt(RTX.noTrigram)
    }), 'err');
    return paintViews(c);
  }
  const many = D.sealFollowers(c.doc, {
    ...ctx,
    letter
  }).length > 0;
  const agreed = typeof c.ctx.ask === 'function' ? await Promise.resolve().then(() => c.ctx.ask(c.tt(many ? RTX.sealAskMany : RTX
    .sealAskOne), {
    ok: c.tt(RTX.sealOk),
    cancel: c.tt(RTX.sealCancel)
  })).catch(() => false) : true;
  if (!agreed || c.dead) return;
  const ok = await locked(c, async guarded => {
    const cur = guarded ? await reread(c) : c.doc,
      next = D.withSeal(cur, {
        ...ctx,
        now: Date.now()
      }, letter);
    return !!next && await put(c, c.myPath, next);
  });
  if (!ok || c.dead) return;
  await load(c);
  Promise.resolve().then(() => c.ctx.data.sync?.()).catch(() => {});
}
