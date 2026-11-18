// V3 maps — la vue retrouvée d'un montage à l'autre (SOG-0353, tranche a ; modules/maps/SPEC.md § 5 et DECISIONS.md) : la Carte à côté de
// Carburant et la Carte entière ne vivent jamais ensemble ; ce qui fait la VUE, pas le geste, est UN document de l'appareil,
// cache/maps/state.json, écrit au changement (jamais à chaque image), lu au montage, jamais envoyé au dépôt (cache/ : politique « cache »).
// Tranche a : (1) la carte fournie montrée à la place du fond (quelle carte de quelle mission : le sélecteur est rempli) ; (2) le cadrage
// (centre, zoom) quand le pilote a bougé la carte. Le cap n'existe pas ici : la rotation est désactivée (lib/map_base.js), il vaut toujours 0.
// Validité : le document porte le vol (départ > arrivée) et la mission ; un autre vol, une autre mission, ou plus de 12 heures : jeté EN ENTIER ;
// l'adresse (?view=, ?mission=) passe avant lui. Lu comme une entrée non sûre : un document illisible est « pas d'état », sans message.

import {
  S,
  keep,
  flightPath
} from './state.js';
import {
  has
} from '../../frame/lib/untrusted.js';
import {
  inRange
} from './lib/safe_text.js';
import {
  flightSig
} from './screen.js';

const PATH = 'cache/maps/state.json',
  /** Âge au-delà duquel l'état est jeté (comme les propositions de Carburant). */
  MAX_AGE = 12 * 3600e3,
  /** Attente avant l'écriture : les changements qui se suivent (un geste, puis un autre) ne font qu'une écriture. */
  DELAY = 400;

const own = has, // une clé PROPRE d'un objet simple (le socle : frame/lib/untrusted.js)
  str = (v, n) => typeof v === 'string' && v.length <= n,
  num = inRange;

/** Le vol, pour l'état : départ > arrivée (un vol re-planifié sur le même trajet reste le même vol). */
export const flightKey = f => `${f?.route?.dep || ''}>${f?.route?.arr || ''}`;
/** La mission que le vol nomme ('' sans). */
const missionOf = f => typeof f?.mission === 'string' ? f.mission.trim() : '';

/** Le document lu, vérifié champ par champ ; null s'il n'est pas à lui (autre vol, autre mission, vieux, illisible). Rien du document n'est
 *  gardé tel quel : des valeurs bornées, jamais un chemin. */
export function parseState(d, key, mission, now = Date.now()) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  if (!own(d, 'v') || d.v !== 1 || !own(d, 'flight') || d.flight !== key || !own(d, 'mission') || d.mission !== mission) return null;
  const at = own(d, 'at') && str(d.at, 40) ? Date.parse(d.at) : NaN;
  if (!Number.isFinite(at) || now - at > MAX_AGE || at - now > 5 * 60e3) return null;
  const file = own(d, 'file') && str(d.file, 200) ? d.file : '';
  let cam = null;
  const c = own(d, 'cam') ? d.cam : null;
  if (c && typeof c === 'object' && own(c, 'sig') && str(c.sig, 600) && own(c, 'center') && Array.isArray(c.center) && c.center.length ===
    2 &&
    num(c.center[0], -720, 720) && num(c.center[1], -86, 86) && own(c, 'zoom') && num(c.zoom, 0, 24)) cam = {
    sig: c.sig,
    center: [c.center[0], c.center[1]],
    zoom: c.zoom
  };
  return {
    file,
    cam
  };
}

/** Lecture au montage (après deriveMission : S.missionAside dit la mission que le vol nomme et que le dépôt a). Pose S.vs et rend
 *  l'état valable { file, cam } ou null. Une carte montée par l'adresse (?mission=, choix, réglage) n'a ni lecture ni écriture. */
export async function viewRead() {
  const me = S,
    q = S.ctx.query || {},
    vs = S.vs = {
      on: !q.mission && !q.choose && !q.tune && !q
        .flight, // une adresse qui choisit la vue (carte de mission, vol, choix, réglage) n'a ni lecture ni écriture
      key: '',
      last: '',
      timer: 0
    };
  if (!vs.on) return null;
  const f = await S.ctx.data.get(flightPath()).catch(() => null),
    d = await S.ctx.data.get(PATH).catch(() => null);
  if (S !== me) return null;
  vs.key = flightKey(f);
  const st = parseState(d, vs.key, S.missionAside || S.missionWanted || '');
  vs.pend = st && !S.missionAside && S.missionWanted ? st :
    null; // la mission du vol n'est pas encore dans la liste (premier chargement) : la carte fournie est reprise quand elle y arrive (retryMission)
  vs.last = JSON.stringify(stateDoc(st || { // sans état valable : l'état vide est « rien à écrire » (un montage sans geste n'écrit rien)
    file: '',
    cam: null
  }));
  return st;
}
/** Le document de la vue montrée : le vol, la mission, la carte fournie, le cadrage de l'utilisateur s'il vaut pour ce qui est montré. */
function doc() {
  const c = keep.cam,
    f = S.missionAside && S.missionId ? S.mapDef?.file || '' : '';
  // le nom d'une carte vient du YAML de la mission (écrit par n'importe quel pilote) : au-delà des bornes de la lecture il n'est pas écrit (il serait refusé)
  return stateDoc({
    file: f.length <= 200 ? f : '',
    cam: c && !S.choose && c.sig === flightSig() && c.sig.length <= 600 ? c : null
  });
}
const r = (v, k) => Math.round(v * k) / k,
  stateDoc = ({
    file,
    cam
  }) => ({
    v: 1,
    flight: S.vs.key,
    mission: S.missionAside || S.missionWanted || '',
    file,
    cam: cam ? {
      sig: cam.sig,
      center: [r(cam.center[0], 1e6), r(cam.center[1], 1e6)],
      zoom: r(cam.zoom, 1e3)
    } : null
  });
/** L'état en attente de la mission (S.vs.pend, posé par viewRead), rendu une seule fois. */
export const viewPending = () => {
  const p = S?.vs?.pend || null;
  if (p) S.vs.pend = null;
  return p;
};
/** Le cadrage de l'état devient celui de la page, s'il vaut pour la carte montrée (même signature que flightSig) et que la page n'en a pas
 *  de plus récent : à appeler après le vol ou la carte fournie posés, avant le fond. */
export function viewAdopt(st) {
  if (!st?.cam || (keep.cam && keep.cam.sig === st.cam.sig)) return;
  if (st.cam.sig === flightSig()) keep.cam = st.cam;
}
/** Écrit l'état s'il a changé (jamais une écriture pour la même valeur) ; now : tout de suite (le démontage), sinon après DELAY. */
export function viewSave(now = false) {
  const vs = S?.vs;
  if (!vs?.on) return;
  clearTimeout(vs.timer);
  vs.timer = 0;
  const ctx = S.ctx,
    go = () => {
      vs.timer = 0;
      const d = doc(),
        j = JSON.stringify(d);
      if (j === vs.last) return;
      vs.last = j;
      ctx.data.put(PATH, {
        ...d,
        at: new Date().toISOString()
      }).catch(() => {});
    };
  if (now) go();
  else vs.timer = setTimeout(go, DELAY);
}
/** Le vol relu (Carburant a écrit) : un autre trajet change le vol de l'état ; l'écriture suit si la valeur a changé. */
export function viewFlight(f) {
  const vs = S?.vs;
  if (!vs?.on) return;
  const k = flightKey(f);
  if (k === vs.key) return;
  vs.key = k;
  viewSave();
}
/** Arrêt au démontage : l'état en attente est écrit tout de suite (un geste suivi d'un changement de page n'est pas perdu). */
export const viewStop = () => () => viewSave(true);
