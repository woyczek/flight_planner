// V3 missions — la liseuse de MA mission (SOG-0441, lot T3) : le calcul pur de ses pages. Ni page, ni stockage, ni réseau.
//
// La liseuse se lit page à page : l'ordre de mission, la description et les objectifs, la route fournie, puis UNE page par tiroir
// OUVERT, dans l'ordre des tiroirs. Elle ne répète pas le Détail de la fiche (ni zones, ni rendez-vous, ni cartes : la Carte les
// montre). Un tiroir fermé n'a NI page NI titre : seul leur nombre est dit (`closed`).
//
// Ce fichier ne lit que la mission passée par `pilotView` du lecteur (frame/lib/mission.js, par drawers_view.js `sees`) : rien de ce
// qu'un tiroir fermé cache n'y est. Tout texte vient d'un fichier de mission ou de l'index des affectations — des entrées NON FIABLES :
// il est rendu tel quel, borné, et c'est l'écran (reader_view.js) qui l'échappe.
//
// API :
//   pagesOf(view, { id, states, line, routeNm }) → { pages, closed }
//     view : la mission vue par le pilote ; id : l'identifiant de la mission (celui du registre) ; states : les états des tiroirs
//     (drawers.js stateOf), ou rien ; line : ma ligne d'affectation ({ callsign, takeoff, departure, registration, type }), ou null
//     pour une mission jouée seul ; routeNm : la longueur du trajet en NM (frame/lib/mission.js routeNm), ou null.
//     pages : [{ kind: 'order', title, mission, pilot, takeoff, departure, arrival, aircraft, summary }
//             | { kind: 'brief', details: [texte], notes: [texte], primary, secondary: [texte] }
//             | { kind: 'route', departure, arrival, levelFt, speedKt, nm, turns: [{ id, name }] }
//             | { kind: 'drawer', id, rank, title, state, message, brief, onward: [nom] }] ;
//     closed : le nombre de tiroirs encore fermés.
//   spreadOf(index, count, two) → { from, to, prev, next } : les pages montrées (une, ou deux côte à côte : la page de gauche a un
//     rang pair à partir de zéro), et les rangs de la page d'avant et d'après (null au bout).

const MAX_PAGES = 16; // quatre pages de la mission et douze tiroirs au plus

/** Un texte borné, sans blancs autour ; '' pour ce qui n'est pas un texte. */
const text = (v, n = 20000) => typeof v === 'string' ? v.trim().slice(0, n) : '';
/** Une liste de textes non vides, bornée. */
const texts = (v, max, n) => (Array.isArray(v) ? v : []).slice(0, max).map(x => text(x, n)).filter(Boolean);
/** Un nombre fini positif, sinon null. */
const pos = v => typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
/** Un objet simple (ni liste, ni null). */
const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);

/** Les pages de la liseuse (voir l'en-tête). Ne lève jamais : une mission illisible n'a aucune page. */
export function pagesOf(view, {
  id,
  states,
  line,
  routeNm
} = {}) {
  if (!plain(view)) return {
    pages: [],
    closed: 0
  };
  const pages = [],
    name = p => plain(p) ? text(p.name, 120) : '',
    l = plain(line) ? line : null,
    departure = name(view.origin) || text(l?.departure, 60),
    arrival = name(view.destination);
  // 1 l'ordre de mission
  pages.push({
    kind: 'order',
    title: text(view.title, 200),
    mission: [text(id, 12), text(view.type, 60), text(view.subtype, 60)].filter(Boolean),
    pilot: l ? [text(l.pilot, 3), text(l.callsign, 20)].filter(Boolean) : [],
    takeoff: l ? text(l.takeoff, 40) : '',
    departure,
    arrival,
    aircraft: [...new Set([...(Array.isArray(view.aircraft) ? view.aircraft : []).slice(0, 12).map(a => text(a?.type, 20)), text(l
      ?.type, 20)].filter(Boolean))],
    summary: text(view.summary, 2000)
  });
  // 2 la description et les objectifs (pas de page sans l'un ni l'autre)
  const o = plain(view.objectives) ? view.objectives : {},
    brief = {
      kind: 'brief',
      details: texts(view.details, 40, 4000),
      notes: texts(view.notes, 40, 600),
      primary: text(o.primary, 600),
      secondary: texts(o.secondary, 20, 600)
    };
  if (brief.details.length || brief.notes.length || brief.primary || brief.secondary.length) pages.push(brief);
  // 3 la route fournie : ses points (ceux que le pilote peut voir), le niveau, la vitesse, la longueur
  const turns = (Array.isArray(view.turns) ? view.turns : []).slice(0, 60).filter(plain).map(p => ({
    id: text(p.id, 40),
    name: text(p.name, 120)
  })).filter(p => p.id || p.name);
  if (departure || arrival || turns.length) pages.push({
    kind: 'route',
    departure,
    arrival,
    levelFt: pos(view.cruiseLevelFt),
    speedKt: pos(view.cruiseSpeedKt),
    nm: pos(routeNm),
    turns
  });
  // 4… un tiroir OUVERT par page, dans l'ordre des tiroirs ; un tiroir fermé n'a ni page ni titre
  const st = Array.isArray(states) ? states : [],
    drawers = (Array.isArray(view.drawers) ? view.drawers : []).filter(plain).slice(0, 12);
  let closed = 0;
  drawers.forEach((d, i) => {
    const s = st.find(x => x && x.id === d.id);
    if (!s || s.open !== true || d.sealed === true) {
      closed += 1;
      return;
    }
    pages.push({
      kind: 'drawer',
      id: d.id,
      rank: Number.isInteger(d.rank) && d.rank >= 1 && d.rank <= 12 ? d.rank : i + 1,
      title: text(d.title, 200),
      state: s,
      message: text(d.message),
      brief: text(d.brief),
      onward: (Array.isArray(d.route) ? d.route : []).slice(0, 60).map(p => plain(p) ? text(p.name, 120) || text(p.id, 40) : text(p,
        40)).filter(Boolean)
    });
  });
  return {
    pages: pages.slice(0, MAX_PAGES),
    closed
  };
}

/** Les pages montrées et les pages voisines (voir l'en-tête) ; un rang hors bornes est ramené dans les bornes. */
export function spreadOf(index, count, two = false) {
  const n = Number.isInteger(count) && count > 0 ? count : 0;
  if (!n) return {
    from: 0,
    to: -1,
    prev: null,
    next: null
  };
  const i = Math.min(Math.max(Number.isInteger(index) ? index : 0, 0), n - 1),
    from = two ? i - i % 2 : i,
    to = two ? Math.min(from + 1, n - 1) : from;
  return {
    from,
    to,
    prev: from > 0 ? Math.max(from - (two ? 2 : 1), 0) : null,
    next: to < n - 1 ? to + 1 : null
  };
}
